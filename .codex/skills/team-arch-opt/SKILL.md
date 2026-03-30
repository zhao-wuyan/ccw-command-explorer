---
name: team-arch-opt
description: Unified team skill for architecture optimization. Uses team-worker agent architecture with role directories for domain logic. Coordinator orchestrates pipeline, workers are team-worker agents. Triggers on "team arch-opt".
allowed-tools: spawn_agent(*), wait_agent(*), send_message(*), assign_task(*), close_agent(*), list_agents(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*), mcp__ace-tool__search_context(*)
---

# Team Architecture Optimization

Orchestrate multi-agent architecture optimization: analyze codebase -> design refactoring plan -> implement changes -> validate improvements -> review code quality.

## Architecture

```
Skill(skill="team-arch-opt", args="task description")
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
                    +-------+-------+-------+-------+
                    v       v       v       v       v
                 [analyzer][designer][refactorer][validator][reviewer]
```

## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | — | — |
| analyzer | [roles/analyzer/role.md](roles/analyzer/role.md) | ANALYZE-* | false |
| designer | [roles/designer/role.md](roles/designer/role.md) | DESIGN-* | false |
| refactorer | [roles/refactorer/role.md](roles/refactorer/role.md) | REFACTOR-*, FIX-* | true |
| validator | [roles/validator/role.md](roles/validator/role.md) | VALIDATE-* | false |
| reviewer | [roles/reviewer/role.md](roles/reviewer/role.md) | REVIEW-*, QUALITY-* | false |

## Role Router

Parse `$ARGUMENTS`:
- Has `--role <name>` -> Read `roles/<name>/role.md`, execute Phase 2-4
- No `--role` -> `roles/coordinator/role.md`, execute entry router

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

- **Session prefix**: `TAO`
- **Session path**: `.workflow/.team/TAO-<slug>-<date>/`
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

After spawning, use `wait_agent({ targets: [...], timeout_ms: 900000 })` to collect results, then `close_agent({ target: <name> })` each worker.

**Inner Loop roles** (refactorer): Set `inner_loop: true`.
**Single-task roles** (analyzer, designer, validator, reviewer): Set `inner_loop: false`.

### Model Selection Guide

Architecture optimization is reasoning-intensive. All analysis and design roles need high reasoning effort.

| Role | reasoning_effort | Rationale |
|------|-------------------|-----------|
| analyzer | high | Deep structural analysis of codebase architecture |
| designer | high | Architecture redesign requires careful reasoning about tradeoffs |
| refactorer | high | Code transformations must preserve correctness |
| validator | high | Validation must thoroughly check refactoring correctness |
| reviewer | high | Code quality review demands deep understanding |

Override in spawn_agent when needed:
```
spawn_agent({
  agent_type: "team_worker",
  task_name: "<task-id>",
  fork_context: false,
  reasoning_effort: "high",
  items: [...]
})
```

## User Commands

| Command | Action |
|---------|--------|
| `check` / `status` | View execution status graph (branch-grouped), no advancement |
| `resume` / `continue` | Check worker states, advance next step |
| `revise <TASK-ID> [feedback]` | Revise specific task + cascade downstream |
| `feedback <text>` | Analyze feedback impact, create targeted revision chain |
| `recheck` | Re-run quality check |
| `improve [dimension]` | Auto-improve weakest dimension |

## Session Directory

```
.workflow/.team/TAO-<slug>-<date>/
├── session.json                    # Session metadata + status + parallel_mode
├── task-analysis.json              # Coordinator analyze output
├── artifacts/
│   ├── architecture-baseline.json  # Analyzer: pre-refactoring metrics
│   ├── architecture-report.md      # Analyzer: ranked structural issue findings
│   ├── refactoring-plan.md         # Designer: prioritized refactoring plan
│   ├── validation-results.json     # Validator: post-refactoring validation
│   ├── review-report.md            # Reviewer: code review findings
│   ├── aggregate-results.json      # Fan-out/independent: aggregated results
│   ├── branches/                   # Fan-out mode branch artifacts
│   │   └── B{NN}/
│   │       ├── refactoring-detail.md
│   │       ├── validation-results.json
│   │       └── review-report.md
│   └── pipelines/                  # Independent mode pipeline artifacts
│       └── {P}/
│           └── ...
├── explorations/
│   ├── cache-index.json            # Shared explore cache
│   └── <hash>.md
├── wisdom/
│   └── patterns.md                 # Discovered patterns and conventions
├── discussions/
│   ├── DISCUSS-REFACTOR.md
│   └── DISCUSS-REVIEW.md
└── .msg/
    ├── messages.jsonl              # Message bus log
    └── meta.json                   # Session state + cross-role state
```

## Specs Reference

- [specs/pipelines.md](specs/pipelines.md) — Pipeline definitions, task registry, parallel modes

## v4 Agent Coordination

### Message Semantics

| Intent | API | Example |
|--------|-----|---------|
| Queue supplementary info (don't interrupt) | `send_message` | Send codebase patterns to running analyzer |
| Assign new work / trigger processing | `assign_task` | Assign fix task to refactorer after review feedback |
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
- `send_message({ target: "ANALYZE-001", items: [...] })` -- queue analysis context without interrupting
- `assign_task({ target: "REFACTOR-001", items: [...] })` -- assign fix task after review feedback
- `close_agent({ target: "VALIDATE-001" })` -- cleanup by name

### Merged Exploration Pattern

For architecture analysis, analyzer may need broad codebase exploration. Consider spawning analyzer with `fork_context: true` when deep structural analysis of interconnected modules is needed:
```
spawn_agent({
  agent_type: "team_worker",
  task_name: "ANALYZE-001",
  fork_context: true,   // Share coordinator's codebase context
  reasoning_effort: "high",
  items: [...]
})
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown command | Error with available command list |
| Role not found | Error with role registry |
| CLI tool fails | Worker fallback to direct implementation |
| Fast-advance conflict | Coordinator reconciles on next callback |
| Completion action fails | Default to Keep Active |
| consensus_blocked HIGH | Coordinator creates revision task or pauses pipeline |
| Branch fix cycle >= 3 | Escalate only that branch to user, others continue |
| max_branches exceeded | Coordinator truncates to top N at CP-2.5 |
