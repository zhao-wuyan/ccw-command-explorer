---
name: team-issue
description: Unified team skill for issue resolution. Uses team-worker agent architecture with role directories for domain logic. Coordinator orchestrates pipeline, workers are team-worker agents. Triggers on "team issue".
allowed-tools: spawn_agent(*), wait_agent(*), send_message(*), followup_task(*), close_agent(*), list_agents(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*), mcp__ace-tool__search_context(*), mcp__ccw-tools__team_msg(*)
---

# Team Issue Resolution

Orchestrate issue resolution pipeline: explore context -> plan solution -> review (optional) -> marshal queue -> implement. Supports Quick, Full, and Batch pipelines with review-fix cycle.

## Architecture

```
Skill(skill="team-issue", args="<issue-ids> [--mode=<mode>]")
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
     +-- clarify -> dispatch -> spawn workers -> STOP
                                    |
             +-------+-------+-------+-------+
             v       v       v       v       v
          [explor] [plann] [review] [integ] [imple]
```

## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | — | — |
| explorer | [roles/explorer/role.md](roles/explorer/role.md) | EXPLORE-* | false |
| planner | [roles/planner/role.md](roles/planner/role.md) | SOLVE-* | false |
| reviewer | [roles/reviewer/role.md](roles/reviewer/role.md) | AUDIT-* | false |
| integrator | [roles/integrator/role.md](roles/integrator/role.md) | MARSHAL-* | false |
| implementer | [roles/implementer/role.md](roles/implementer/role.md) | BUILD-* | false |

## Role Router

Parse `$ARGUMENTS`:
- Has `--role <name>` -> Read `roles/<name>/role.md`, execute Phase 2-4
- No `--role` -> `roles/coordinator/role.md`, execute entry router

## Delegation Lock

**Coordinator is a PURE ORCHESTRATOR. It coordinates, it does NOT do.**

Before calling ANY tool, apply this check:

| Tool Call | Verdict | Reason |
|-----------|---------|--------|
| `spawn_agent`, `wait_agent`, `close_agent`, `send_message`, `followup_task` | ALLOWED | Orchestration |
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

- **Session prefix**: `TISL`
- **Session path**: `.workflow/.team/TISL-<date>-<slug>/`
- **Team name**: `issue`
- **CLI tools**: `ccw cli --mode analysis` (read-only), `ccw cli --mode write` (modifications)
- **Message bus**: `mcp__ccw-tools__team_msg(session_id=<session-id>, ...)`

## Worker Spawn Template

Coordinator spawns workers using this template:

```
spawn_agent({
  agent_type: "team_worker",
  task_name: "<task-id>",
  fork_turns: "none",
  message: `## Role Assignment
role: <role>
role_spec: <skill_root>/roles/<role>/role.md
session: <session-folder>
session_id: <session-id>
requirement: <task-description>
inner_loop: false

Read role_spec file (<skill_root>/roles/<role>/role.md) to load Phase 2-4 domain instructions.

## Task Context
task_id: <task-id>
title: <task-title>
description: <task-description>
pipeline_phase: <pipeline-phase>

## Upstream Context
<prev_context>`
})
```

After spawning, use `wait_agent({ timeout_ms: 1800000 })` to collect results. If `result.timed_out`, send STATUS_CHECK via followup_task (wait 3 min), then FINALIZE with interrupt (wait 3 min), then mark timed_out and close agents. Use `close_agent({ target })` each worker.

**Parallel spawn** (Batch mode, N explorer or M implementer instances):

```
spawn_agent({
  agent_type: "team_worker",
  task_name: "<task-id>",
  fork_turns: "none",
  message: `## Role Assignment
role: <role>
role_spec: <skill_root>/roles/<role>/role.md
session: <session-folder>
session_id: <session-id>
requirement: <task-description>
agent_name: <role>-<N>
inner_loop: false

Read role_spec file (<skill_root>/roles/<role>/role.md) to load Phase 2-4 domain instructions.

## Task Context
task_id: <task-id>
title: <task-title>
description: <task-description>
pipeline_phase: <pipeline-phase>

## Upstream Context
<prev_context>`
})
```

After spawning, use `wait_agent({ timeout_ms: 1800000 })` to collect results. If `result.timed_out`, send STATUS_CHECK via followup_task (wait 3 min), then FINALIZE with interrupt (wait 3 min), then mark timed_out and close agents. Use `close_agent({ target })` each worker.


### Model Selection Guide

| Role | model | reasoning_effort | Rationale |
|------|-------|-------------------|-----------|
| Explorer (EXPLORE-*) | (default) | medium | Context gathering, file reading, less reasoning |
| Planner (SOLVE-*) | (default) | high | Solution design requires deep analysis |
| Reviewer (AUDIT-*) | (default) | high | Code review and plan validation need full reasoning |
| Integrator (MARSHAL-*) | (default) | medium | Queue ordering and dependency resolution |
| Implementer (BUILD-*) | (default) | high | Code generation needs precision |

Override model/reasoning_effort in spawn_agent when cost optimization is needed:
```
spawn_agent({
  agent_type: "team_worker",
  task_name: "<task-id>",
  fork_turns: "none",
  model: "<model-override>",
  reasoning_effort: "<effort-level>",
  message: "..."
})
```

## User Commands

| Command | Action |
|---------|--------|
| `check` / `status` | View execution status graph, no advancement |
| `resume` / `continue` | Check worker states, advance next step |

## Session Directory

```
.workflow/.team/TISL-<date>-<slug>/
├── session.json                    # Session metadata + pipeline + fix_cycles
├── task-analysis.json              # Coordinator analyze output
├── .msg/
│   ├── messages.jsonl              # Message bus log
│   └── meta.json                   # Session state + cross-role state
├── wisdom/                         # Cross-task knowledge
│   ├── learnings.md
│   ├── decisions.md
│   ├── conventions.md
│   └── issues.md
├── explorations/                   # Explorer output
│   └── context-<issueId>.json
├── solutions/                      # Planner output
│   └── solution-<issueId>.json
├── audits/                         # Reviewer output
│   └── audit-report.json
├── queue/                          # Integrator output (also .workflow/issues/queue/)
└── builds/                         # Implementer output
```

## Specs Reference

- [specs/pipelines.md](specs/pipelines.md) — Pipeline definitions and task registry

## v4 Agent Coordination

### Message Semantics

| Intent | API | Example |
|--------|-----|---------|
| Send exploration context to running planner | `send_message` | Queue EXPLORE-* findings to SOLVE-* worker |
| Not used in this skill | `followup_task` | No resident agents -- all workers are one-shot |
| Check running agents | `list_agents` | Verify parallel explorer/implementer health |

### Pipeline Pattern

Pipeline with context passing: explore -> plan -> review (optional) -> marshal -> implement. In **Batch mode**, N explorers and M implementers run in parallel:

```
// Batch mode: spawn N explorers in parallel (max 5)
const explorerNames = ["EXPLORE-001", "EXPLORE-002", ..., "EXPLORE-00N"]
for (const name of explorerNames) {
  spawn_agent({ agent_type: "team_worker", task_name: name, ... })
}
wait_agent({ timeout_ms: 1800000 })  // 30 min — apply timeout cascade if timed_out

// After MARSHAL completes: spawn M implementers in parallel (max 3)
const buildNames = ["BUILD-001", "BUILD-002", ..., "BUILD-00M"]
for (const name of buildNames) {
  spawn_agent({ agent_type: "team_worker", task_name: name, ... })
}
wait_agent({ timeout_ms: 1800000 })  // 30 min — apply timeout cascade if timed_out
```

### Review-Fix Cycle

Reviewer (AUDIT-*) may reject plans, triggering fix cycles (max 2). Dynamic SOLVE-fix and AUDIT re-review tasks are created in tasks.json.

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
- `send_message({ target: "SOLVE-001", message: "..." })` -- queue exploration context to running planner
- `close_agent({ target: "BUILD-001" })` -- cleanup by name after completion

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown command | Error with available command list |
| Role not found | Error with role registry |
| CLI tool fails | Worker fallback to direct implementation |
| Fast-advance conflict | Coordinator reconciles on next callback |
| Completion action fails | Default to Keep Active |
| Review rejection exceeds 2 rounds | Force convergence to integrator |
| No issues found for given IDs | Coordinator reports error to user |
| Deferred BUILD count unknown | Defer to MARSHAL callback |
