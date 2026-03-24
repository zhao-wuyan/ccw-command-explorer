---
name: team-issue
description: Unified team skill for issue resolution. Uses team-worker agent architecture with role directories for domain logic. Coordinator orchestrates pipeline, workers are team-worker agents. Triggers on "team issue".
allowed-tools: spawn_agent(*), wait_agent(*), send_input(*), close_agent(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*), mcp__ace-tool__search_context(*), mcp__ccw-tools__team_msg(*)
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

## Shared Constants

- **Session prefix**: `TISL`
- **Session path**: `.workflow/.team/TISL-<slug>-<date>/`
- **Team name**: `issue`
- **CLI tools**: `ccw cli --mode analysis` (read-only), `ccw cli --mode write` (modifications)
- **Message bus**: `mcp__ccw-tools__team_msg(session_id=<session-id>, ...)`

## Worker Spawn Template

Coordinator spawns workers using this template:

```
spawn_agent({
  agent_type: "team_worker",
  items: [
    { type: "text", text: `## Role Assignment
role: <role>
role_spec: <skill_root>/roles/<role>/role.md
session: <session-folder>
session_id: <session-id>
requirement: <task-description>
inner_loop: false

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

After spawning, use `wait_agent({ ids: [...], timeout_ms: 900000 })` to collect results, then `close_agent({ id })` each worker.

**Parallel spawn** (Batch mode, N explorer or M implementer instances):

```
spawn_agent({
  agent_type: "team_worker",
  items: [
    { type: "text", text: `## Role Assignment
role: <role>
role_spec: <skill_root>/roles/<role>/role.md
session: <session-folder>
session_id: <session-id>
requirement: <task-description>
agent_name: <role>-<N>
inner_loop: false

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

After spawning, use `wait_agent({ ids: [...], timeout_ms: 900000 })` to collect results, then `close_agent({ id })` each worker.

## User Commands

| Command | Action |
|---------|--------|
| `check` / `status` | View execution status graph, no advancement |
| `resume` / `continue` | Check worker states, advance next step |

## Session Directory

```
.workflow/.team/TISL-<slug>-<date>/
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
