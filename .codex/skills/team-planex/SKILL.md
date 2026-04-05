---
name: team-planex
description: Unified team skill for plan-and-execute pipeline. Pure router — coordinator always. Beat model is coordinator-only in monitor.md. Triggers on "team planex".
allowed-tools: spawn_agent(*), wait_agent(*), send_message(*), assign_task(*), close_agent(*), list_agents(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*), mcp__ccw-tools__team_msg(*)
---

# Team PlanEx

Unified team skill: plan-and-execute pipeline for issue-based development. Built on **team-worker agent architecture** — coordinator orchestrates, workers are team-worker agents loading role-specific instructions from `roles/<role>/role.md`.

## Architecture

```
Skill(skill="team-planex", args="task description")
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
                    +---------------+---------------+
                    v                               v
               [planner]                       [executor]
         (team-worker agent,            (team-worker agent,
          loads roles/planner/role.md)   loads roles/executor/role.md)
```

## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | — | — |
| planner | [roles/planner/role.md](roles/planner/role.md) | PLAN-* | true |
| executor | [roles/executor/role.md](roles/executor/role.md) | EXEC-* | true |

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

- **Session prefix**: `PEX`
- **Session path**: `.workflow/.team/PEX-<slug>-<date>/`
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
execution_method: <codex|gemini>

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

| Role | model | reasoning_effort | Rationale |
|------|-------|-------------------|-----------|
| Planner (PLAN-*) | (default) | high | Solution planning requires deep code analysis |
| Executor (EXEC-*) | (default) | high | Code implementation needs precision |

Override model/reasoning_effort in spawn_agent when cost optimization is needed:
```
spawn_agent({
  agent_type: "team_worker",
  task_name: "<task-id>",
  fork_context: false,
  model: "<model-override>",
  reasoning_effort: "<effort-level>",
  items: [...]
})
```

## User Commands

| Command | Action |
|---------|--------|
| `check` / `status` | View execution status graph |
| `resume` / `continue` | Advance to next step |
| `add <issue-ids or --text '...' or --plan path>` | Append new tasks to planner queue |

## Session Directory

```
.workflow/.team/PEX-<slug>-<YYYY-MM-DD>/
├── .msg/
│   ├── messages.jsonl          # Message bus log
│   └── meta.json               # Session state
├── task-analysis.json          # Coordinator analyze output
├── artifacts/
│   └── solutions/              # Planner solution output per issue
│       ├── <issueId-1>.json
│       └── <issueId-N>.json
└── wisdom/                     # Cross-task knowledge
    ├── learnings.md
    ├── decisions.md
    ├── conventions.md
    └── issues.md
```

## Specs Reference

- [specs/pipelines.md](specs/pipelines.md) — Pipeline definitions, task metadata registry, execution method selection

## v4 Agent Coordination

### Message Semantics

| Intent | API | Example |
|--------|-----|---------|
| Send plan updates to running executor | `send_message` | Queue planner solution details to EXEC-* workers |
| Not used in this skill | `assign_task` | No resident agents -- planner and executor are one-shot |
| Check running agents | `list_agents` | Verify planner/executor health during resume |

### Two-Phase Pipeline Pattern

Plan-and-execute is a **Two-Phase pattern**: planner creates solution plans (PLAN-*), then coordinator spawns executors (EXEC-*) for each planned issue. The planner may dynamically create EXEC-* task entries in tasks.json.

```
// Phase 1: Planner runs, creates EXEC-* tasks in tasks.json
spawn_agent({ agent_type: "team_worker", task_name: "PLAN-001", ... })
wait_agent({ targets: ["PLAN-001"], timeout_ms: 900000 })
// Phase 2: Executors run per-issue, may run in sequence or parallel
// Inner loop: planner/executor handle multiple tasks internally
```

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
- `send_message({ target: "EXEC-001", items: [...] })` -- queue plan solution to running executor
- `close_agent({ target: "PLAN-001" })` -- cleanup by name after completion

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown command | Error with available command list |
| Role not found | Error with role registry |
| Role spec file not found | Error with expected path (roles/<name>/role.md) |
| team-worker agent unavailable | Error: requires .claude/agents/team-worker.md |
| Planner issue planning failure | Retry once, then skip to next issue |
| Executor impl failure | Report to coordinator, continue with next EXEC-* task |
| Pipeline stall | Coordinator monitors, escalate to user |
| Worker no response | Report waiting task, suggest user `resume` |
