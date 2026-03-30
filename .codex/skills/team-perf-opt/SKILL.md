---
name: team-perf-opt
description: Unified team skill for performance optimization. Coordinator orchestrates pipeline, workers are team-worker agents. Supports single/fan-out/independent parallel modes. Triggers on "team perf-opt".
allowed-tools: spawn_agent(*), wait_agent(*), send_message(*), assign_task(*), close_agent(*), list_agents(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*), mcp__ace-tool__search_context(*)
---

# Team Performance Optimization

Profile application performance, identify bottlenecks, design optimization strategies, implement changes, benchmark improvements, and review code quality.

## Architecture

```
Skill(skill="team-perf-opt", args="<task-description>")
                    |
         SKILL.md (this file) = Router
                    |
     +--------------+--------------+
     |                             |
  no --role flag              --role <name>
     |                             |
  Coordinator                  Worker
  roles/coordinator/role.md    roles/<name>/role.md
     |
     +-- analyze -> dispatch -> spawn workers -> STOP
                                    |
                    +-------+-------+-------+-------+-------+
                    v       v       v       v       v
                 [profiler] [strategist] [optimizer] [benchmarker] [reviewer]
                 (team-worker agents)

Pipeline (Single mode):
  PROFILE-001 -> STRATEGY-001 -> IMPL-001 -> BENCH-001 + REVIEW-001 (fix cycle)

Pipeline (Fan-out mode):
  PROFILE-001 -> STRATEGY-001 -> [IMPL-B01..N](parallel) -> BENCH+REVIEW per branch

Pipeline (Independent mode):
  [Pipeline A: PROFILE-A->STRATEGY-A->IMPL-A->BENCH-A+REVIEW-A]
  [Pipeline B: PROFILE-B->STRATEGY-B->IMPL-B->BENCH-B+REVIEW-B] (parallel)
```

## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | — | — |
| profiler | [roles/profiler/role.md](roles/profiler/role.md) | PROFILE-* | false |
| strategist | [roles/strategist/role.md](roles/strategist/role.md) | STRATEGY-* | false |
| optimizer | [roles/optimizer/role.md](roles/optimizer/role.md) | IMPL-*, FIX-* | true |
| benchmarker | [roles/benchmarker/role.md](roles/benchmarker/role.md) | BENCH-* | false |
| reviewer | [roles/reviewer/role.md](roles/reviewer/role.md) | REVIEW-*, QUALITY-* | false |

## Role Router

Parse `$ARGUMENTS`:
- Has `--role <name>` → Read `roles/<name>/role.md`, execute Phase 2-4
- No `--role` → `roles/coordinator/role.md`, execute entry router

## Delegation Lock

**Coordinator is a PURE ORCHESTRATOR. It coordinates, it does NOT do.**

Before calling ANY tool, apply this check:

| Tool Call | Verdict | Reason |
|-----------|---------|--------|
| `spawn_agent`, `wait_agent`, `close_agent`, `send_message`, `assign_task` | ALLOWED | Orchestration |
| `list_agents` | ALLOWED | Agent health check |
| `request_user_input` | ALLOWED | User interaction |
| `mcp__ccw-tools__team_msg` | ALLOWED | Message bus |
| `Read/Write` on `.workflow/.team/` files | ALLOWED | Session state |
| `Read` on `roles/`, `commands/`, `specs/` | ALLOWED | Loading own instructions |
| `Read/Grep/Glob` on project source code | BLOCKED | Delegate to worker |
| `Edit` on any file outside `.workflow/` | BLOCKED | Delegate to worker |
| `Bash("ccw cli ...")` | BLOCKED | Only workers call CLI |
| `Bash` running build/test/lint commands | BLOCKED | Delegate to worker |

**If a tool call is BLOCKED**: STOP. Create a task, spawn a worker.

**No exceptions for "simple" tasks.** Even a single-file read-and-report MUST go through spawn_agent.

---

## Shared Constants

- **Session prefix**: `PERF-OPT`
- **Session path**: `.workflow/.team/PERF-OPT-<slug>-<date>/`
- **Team name**: `perf-opt`
- **CLI tools**: `ccw cli --mode analysis` (read-only), `ccw cli --mode write` (modifications)
- **Message bus**: `mcp__ccw-tools__team_msg(session_id=<session-id>, ...)`

## Worker Spawn Template

Coordinator spawns workers using this template:

```
spawn_agent({
  agent_type: "team_worker",
  task_name: "<task-id>",
  fork_context: false,
  items: [
    { type: "text", text: `## Role Assignment
role: <role>
role_spec: <skill_root>/roles/<role>/role.md
session: <session-folder>
session_id: <session-id>
requirement: <task-description>
inner_loop: <true|false>

Read role_spec file (<skill_root>/roles/<role>/role.md) to load Phase 2-4 domain instructions.` },

    { type: "text", text: `## Task Context
task_id: <task-id>
title: <task-title>
description: <task-description>
pipeline_phase: <pipeline-phase>` },

    { type: "text", text: `## Upstream Context
<prev_context>` }
  ]
})
```

After spawning, use `wait_agent({ targets: [...], timeout_ms: 900000 })` to collect results, then `close_agent({ target })` each worker.

**Inner Loop roles** (optimizer): Set `inner_loop: true`.
**Single-task roles** (profiler, strategist, benchmarker, reviewer): Set `inner_loop: false`.


### Model Selection Guide

Performance optimization is measurement-driven. Profiler and benchmarker need consistent context for before/after comparison.

| Role | reasoning_effort | Rationale |
|------|-------------------|-----------|
| profiler | high | Must identify subtle bottlenecks from profiling data |
| strategist | high | Optimization strategy requires understanding tradeoffs |
| optimizer | high | Performance-critical code changes need precision |
| benchmarker | medium | Benchmark execution follows defined measurement plan |
| reviewer | high | Must verify optimizations don't introduce regressions |

### Benchmark Context Sharing with fork_context

For before/after comparison, benchmarker should share context with profiler's baseline:
```
spawn_agent({
  agent_type: "team_worker",
  task_name: "BENCH-001",
  fork_context: true,   // Share context so benchmarker sees profiler's baseline metrics
  reasoning_effort: "medium",
  items: [...]
})
```

## User Commands

| Command | Action |
|---------|--------|
| `check` / `status` | Output execution status graph (branch-grouped), no advancement |
| `resume` / `continue` | Check worker states, advance next step |
| `revise <TASK-ID> [feedback]` | Create revision task + cascade downstream (scoped to branch) |
| `feedback <text>` | Analyze feedback impact, create targeted revision chain |
| `recheck` | Re-run quality check |
| `improve [dimension]` | Auto-improve weakest dimension |

## Session Directory

```
.workflow/.team/PERF-OPT-<slug>-<date>/
+-- session.json                    # Session metadata + status + parallel_mode
+-- artifacts/
|   +-- baseline-metrics.json       # Profiler: before-optimization metrics
|   +-- bottleneck-report.md        # Profiler: ranked bottleneck findings
|   +-- optimization-plan.md        # Strategist: prioritized optimization plan
|   +-- benchmark-results.json      # Benchmarker: after-optimization metrics
|   +-- review-report.md            # Reviewer: code review findings
|   +-- branches/B01/...            # Fan-out branch artifacts
|   +-- pipelines/A/...             # Independent pipeline artifacts
+-- explorations/                   # Shared explore cache
+-- wisdom/patterns.md              # Discovered patterns and conventions
+-- discussions/                    # Discussion records
+-- .msg/messages.jsonl             # Team message bus
+-- .msg/meta.json                  # Session metadata
```

## v4 Agent Coordination

### Message Semantics

| Intent | API | Example |
|--------|-----|---------|
| Queue supplementary info (don't interrupt) | `send_message` | Send baseline metrics to running optimizer |
| Assign fix after benchmark regression | `assign_task` | Assign FIX task when benchmark shows regression |
| Check running agents | `list_agents` | Verify agent health during resume |

### Agent Health Check

Use `list_agents({})` in handleResume and handleComplete:

```
// Reconcile session state with actual running agents
const running = list_agents({})
// Compare with session.json active tasks
// Reset orphaned tasks (in_progress but agent gone) to pending
```

### Named Agent Targeting

Workers are spawned with `task_name: "<task-id>"` enabling direct addressing:
- `send_message({ target: "IMPL-001", items: [...] })` -- send strategy details to optimizer
- `assign_task({ target: "IMPL-001", items: [...] })` -- assign fix after benchmark regression
- `close_agent({ target: "BENCH-001" })` -- cleanup after benchmarking completes

### Baseline-to-Result Pipeline

Profiler baseline metrics flow through the pipeline and must reach benchmarker for comparison:
1. PROFILE-001 produces `baseline-metrics.json` in artifacts/
2. Coordinator includes baseline reference in upstream context for all downstream workers
3. BENCH-001 reads baseline and compares against post-optimization measurements
4. If regression detected, coordinator auto-creates FIX task with regression details

## Completion Action

When the pipeline completes:

```
request_user_input({
  questions: [{
    question: "Team pipeline complete. What would you like to do?",
    header: "Completion",
    multiSelect: false,
    options: [
      { label: "Archive & Clean (Recommended)", description: "Archive session, clean up tasks and team resources" },
      { label: "Keep Active", description: "Keep session active for follow-up work or inspection" },
      { label: "Export Results", description: "Export deliverables to a specified location, then clean" }
    ]
  }]
})
```

## Specs Reference

- [specs/pipelines.md](specs/pipelines.md) — Pipeline definitions and task registry
- [specs/team-config.json](specs/team-config.json) — Team configuration

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown --role value | Error with role registry list |
| Role file not found | Error with expected path (roles/{name}/role.md) |
| Profiling tool not available | Fallback to static analysis methods |
| Benchmark regression detected | Auto-create FIX task with regression details |
| Review-fix cycle exceeds 3 iterations | Escalate to user |
| One branch IMPL fails | Mark that branch failed, other branches continue |
| Fast-advance conflict | Coordinator reconciles on next callback |
| Completion action fails | Default to Keep Active |
