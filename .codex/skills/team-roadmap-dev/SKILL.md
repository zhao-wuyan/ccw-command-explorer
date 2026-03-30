---
name: team-roadmap-dev
description: Unified team skill for roadmap-driven development workflow. Coordinator discusses roadmap with user, then dispatches phased execution pipeline (plan -> execute -> verify). All roles invoke this skill with --role arg. Triggers on "team roadmap-dev".
allowed-tools: spawn_agent(*), wait_agent(*), send_message(*), assign_task(*), close_agent(*), list_agents(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team Roadmap Dev

Roadmap-driven development with phased execution pipeline. Coordinator discusses roadmap with the user and manages phase transitions. Workers are spawned as team-worker agents.

## Architecture

```
Skill(skill="team-roadmap-dev", args="<task-description>")
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
     +-- roadmap-discuss -> dispatch -> spawn workers -> STOP
                                    |
                    +-------+-------+-------+
                    v       v       v
                 [planner] [executor] [verifier]
                 (team-worker agents)

Pipeline (per phase):
  PLAN-N01 -> EXEC-N01 -> VERIFY-N01 (gap closure loop if needed)

Multi-phase:
  Phase 1 -> Phase 2 -> ... -> Phase N -> Complete
```

## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | — | — |
| planner | [roles/planner/role.md](roles/planner/role.md) | PLAN-* | true |
| executor | [roles/executor/role.md](roles/executor/role.md) | EXEC-* | true |
| verifier | [roles/verifier/role.md](roles/verifier/role.md) | VERIFY-* | true |

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

- **Session prefix**: `RD`
- **Session path**: `.workflow/.team/RD-<slug>-<date>/`
- **Team name**: `roadmap-dev`
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
inner_loop: true

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

**All worker roles** (planner, executor, verifier): Set `inner_loop: true`.


### Model Selection Guide

Roadmap development is context-heavy with multi-phase execution. All roles use inner_loop and need high reasoning for complex planning/execution.

| Role | reasoning_effort | Rationale |
|------|-------------------|-----------|
| planner | high | Phase planning requires understanding full roadmap context |
| executor | high | Implementation must align with phase plan precisely |
| verifier | high | Gap detection requires thorough verification against plan |

All roles are inner_loop=true, enabling coordinator to send additional context via `assign_task` as phases progress.

## User Commands

| Command | Action |
|---------|--------|
| `check` / `status` | Output execution status graph (phase-grouped), no advancement |
| `resume` / `continue` | Check worker states, advance next step |

## Session Directory

```
.workflow/.team/RD-<slug>-<date>/
+-- roadmap.md                 # Phase plan with requirements and success criteria
+-- state.md                   # Living memory (<100 lines)
+-- config.json                # Session settings (mode, depth, gates)
+-- wisdom/                    # Cross-task knowledge accumulation
|   +-- learnings.md
|   +-- decisions.md
|   +-- conventions.md
|   +-- issues.md
+-- phase-1/                   # Per-phase artifacts
|   +-- context.md
|   +-- IMPL_PLAN.md
|   +-- TODO_LIST.md
|   +-- .task/IMPL-*.json
|   +-- summary-*.md
|   +-- verification.md
+-- phase-N/
|   +-- ...
+-- .msg/
    +-- messages.jsonl          # Team message bus log
    +-- meta.json               # Session metadata + shared state
```

## v4 Agent Coordination

### Message Semantics

| Intent | API | Example |
|--------|-----|---------|
| Queue supplementary info (don't interrupt) | `send_message` | Send phase context to running executor |
| Assign phase work / gap closure | `assign_task` | Assign gap closure iteration to executor after verify |
| Check running agents | `list_agents` | Verify agent health during resume |

### Agent Health Check

Use `list_agents({})` in handleResume and handleComplete:

```
// Reconcile session state with actual running agents
const running = list_agents({})
// Compare with state.md and config.json active tasks
// Reset orphaned tasks (in_progress but agent gone) to pending
```

### Named Agent Targeting

Workers are spawned with `task_name: "<task-id>"` enabling direct addressing:
- `send_message({ target: "EXEC-N01", items: [...] })` -- send supplementary context to executor
- `assign_task({ target: "PLAN-N01", items: [...] })` -- assign next phase planning
- `close_agent({ target: "VERIFY-N01" })` -- cleanup after verification

### Multi-Phase Context Accumulation

Each phase builds on previous phase results. Coordinator accumulates context across phases:
- Phase N planner receives: roadmap.md + state.md + all previous phase summaries
- Phase N executor receives: phase plan + previous phase implementation context
- Phase N verifier receives: phase plan + executor results + success criteria from roadmap
- On gap closure: verifier findings are sent back to executor via `assign_task` (max 3 iterations)

## Completion Action

When the pipeline completes:

```
request_user_input({
  questions: [{
    question: "Roadmap Dev pipeline complete. What would you like to do?",
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

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown --role value | Error with role registry list |
| Role file not found | Error with expected path (roles/{name}/role.md) |
| project-tech.json missing | Coordinator invokes /workflow:spec:setup  |
| Phase verification fails with gaps | Coordinator triggers gap closure loop (max 3 iterations) |
| Max gap closure iterations (3) | Report to user, ask for guidance |
| Worker crash | Respawn worker, reassign task |
| Session corruption | Attempt recovery, fallback to manual reconciliation |
