---
name: team-motion-design
description: Unified team skill for motion design. Animation token systems, scroll choreography, GPU-accelerated transforms, reduced-motion fallback. Uses team-worker agent architecture. Triggers on "team motion design", "animation system".
allowed-tools: spawn_agent(*), wait_agent(*), send_message(*), assign_task(*), close_agent(*), list_agents(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*), mcp__ccw-tools__read_file(*), mcp__ccw-tools__write_file(*), mcp__ccw-tools__edit_file(*), mcp__ccw-tools__team_msg(*), mcp__chrome-devtools__evaluate_script(*), mcp__chrome-devtools__take_screenshot(*), mcp__chrome-devtools__performance_start_trace(*), mcp__chrome-devtools__performance_stop_trace(*), mcp__chrome-devtools__performance_analyze_insight(*)
---

# Team Motion Design

Systematic motion design pipeline: research -> choreography -> animation -> performance testing. Built on **team-worker agent architecture** -- all worker roles share a single agent definition with role-specific Phase 2-4 loaded from `roles/<role>/role.md`.

## Architecture

```
Skill(skill="team-motion-design", args="task description")
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
                    v       v       v       v
           [team-worker agents, each loads roles/<role>/role.md]
      motion-researcher  choreographer  animator  motion-tester
```

## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | -- | -- |
| motion-researcher | [roles/motion-researcher/role.md](roles/motion-researcher/role.md) | MRESEARCH-* | false |
| choreographer | [roles/choreographer/role.md](roles/choreographer/role.md) | CHOREO-* | false |
| animator | [roles/animator/role.md](roles/animator/role.md) | ANIM-* | true |
| motion-tester | [roles/motion-tester/role.md](roles/motion-tester/role.md) | MTEST-* | false |

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

- **Session prefix**: `MD`
- **Session path**: `.workflow/.team/MD-<slug>-<date>/`
- **CLI tools**: `ccw cli --mode analysis` (read-only), `ccw cli --mode write` (modifications)
- **Message bus**: `mcp__ccw-tools__team_msg(session_id=<session-id>, ...)`
- **Max GC rounds**: 2

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


### Model Selection Guide

Motion design is a performance-critical pipeline where research informs choreography decisions and animations must pass strict GPU performance gates. Researcher needs thorough profiling, animator needs creative implementation with inner loop capability.

| Role | reasoning_effort | Rationale |
|------|-------------------|-----------|
| motion-researcher | high | Deep performance profiling and animation audit across codebase |
| choreographer | high | Creative token system design and scroll choreography sequencing |
| animator | high | Complex CSS/JS animation implementation with compositor constraints |
| motion-tester | medium | Performance validation follows defined test criteria and scoring |

### Research-to-Choreography Context Flow

Researcher findings must reach choreographer via coordinator's upstream context:
```
// After MRESEARCH-001 completes, coordinator sends findings to choreographer
spawn_agent({
  agent_type: "team_worker",
  task_name: "CHOREO-001",
  fork_context: false,
  items: [
    ...,
    { type: "text", text: `## Upstream Context
Research findings: <session>/research/animation-inventory.json
Performance baseline: <session>/research/performance-baseline.json
Easing catalog: <session>/research/easing-catalog.json` }
  ]
})
```

## User Commands

| Command | Action |
|---------|--------|
| `check` / `status` | View execution status graph |
| `resume` / `continue` | Advance to next step |

## Specs Reference

- [specs/pipelines.md](specs/pipelines.md) -- Pipeline definitions and task registry
- [specs/motion-tokens.md](specs/motion-tokens.md) -- Animation token schema
- [specs/gpu-constraints.md](specs/gpu-constraints.md) -- Compositor-only animation rules
- [specs/reduced-motion.md](specs/reduced-motion.md) -- Accessibility motion preferences

## Session Directory

```
.workflow/.team/MD-<slug>-<date>/
+-- .msg/
|   +-- messages.jsonl         # Team message bus
|   +-- meta.json              # Pipeline config + GC state
+-- research/                  # Motion researcher output
|   +-- perf-traces/           # Chrome DevTools performance traces
|   +-- animation-inventory.json
|   +-- performance-baseline.json
|   +-- easing-catalog.json
+-- choreography/              # Choreographer output
|   +-- motion-tokens.json
|   +-- sequences/             # Scroll choreography sequences
+-- animations/                # Animator output
|   +-- keyframes/             # CSS @keyframes files
|   +-- orchestrators/         # JS animation orchestrators
+-- testing/                   # Motion tester output
|   +-- traces/                # Performance trace data
|   +-- reports/               # Performance reports
+-- wisdom/                    # Cross-task knowledge
```

## v4 Agent Coordination

### Message Semantics

| Intent | API | Example |
|--------|-----|---------|
| Queue supplementary info (don't interrupt) | `send_message` | Send research findings to running choreographer |
| Assign implementation from reviewed specs | `assign_task` | Assign ANIM task after choreography passes |
| Check running agents | `list_agents` | Verify agent health during resume |

### Agent Health Check

Use `list_agents({})` in handleResume and handleComplete:

```
// Reconcile session state with actual running agents
const running = list_agents({})
// Compare with tasks.json active_agents
// Reset orphaned tasks (in_progress but agent gone) to pending
```

### Named Agent Targeting

Workers are spawned with `task_name: "<task-id>"` enabling direct addressing:
- `send_message({ target: "CHOREO-001", items: [...] })` -- send additional research findings to choreographer
- `assign_task({ target: "ANIM-001", items: [...] })` -- assign animation from reviewed choreography specs
- `close_agent({ target: "MTEST-001" })` -- cleanup after performance test

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown command | Error with available command list |
| Role not found | Error with role registry |
| Session corruption | Attempt recovery, fallback to manual |
| Fast-advance conflict | Coordinator reconciles on next callback |
| Completion action fails | Default to Keep Active |
| GC loop stuck > 2 rounds | Escalate to user: accept / retry / terminate |
