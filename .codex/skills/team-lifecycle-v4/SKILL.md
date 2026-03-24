---
name: team-lifecycle-v4
description: Full lifecycle team skill with clean architecture. SKILL.md is a universal router — all roles read it. Beat model is coordinator-only. Structure is roles/ + specs/ + templates/. Triggers on "team lifecycle v4".
allowed-tools: spawn_agent(*), wait_agent(*), send_input(*), close_agent(*), report_agent_job_result(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*), request_user_input(*)
---

# Team Lifecycle v4

Orchestrate multi-agent software development: specification -> planning -> implementation -> testing -> review.

## Architecture

```
Skill(skill="team-lifecycle-v4", args="task description")
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
     +-- analyze -> dispatch -> spawn -> wait -> collect
                                 |
                    +--------+---+--------+
                    v        v            v
            spawn_agent    ...     spawn_agent
          (team_worker)         (team_supervisor)
              per-task             resident agent
              lifecycle            send_input-driven
                    |                     |
                    +-- wait_agent --------+
                              |
                         collect results
```

## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | -- | -- |
| analyst | [roles/analyst/role.md](roles/analyst/role.md) | RESEARCH-* | false |
| writer | [roles/writer/role.md](roles/writer/role.md) | DRAFT-* | true |
| planner | [roles/planner/role.md](roles/planner/role.md) | PLAN-* | true |
| executor | [roles/executor/role.md](roles/executor/role.md) | IMPL-* | true |
| tester | [roles/tester/role.md](roles/tester/role.md) | TEST-* | false |
| reviewer | [roles/reviewer/role.md](roles/reviewer/role.md) | REVIEW-*, QUALITY-*, IMPROVE-* | false |
| supervisor | [roles/supervisor/role.md](roles/supervisor/role.md) | CHECKPOINT-* | false |

## Role Router

Parse `$ARGUMENTS`:
- Has `--role <name>` -> Read `roles/<name>/role.md`, execute Phase 2-4
- No `--role` -> `roles/coordinator/role.md`, execute entry router

## Shared Constants

- **Session prefix**: `TLV4`
- **Session path**: `.workflow/.team/TLV4-<slug>-<date>/`
- **State file**: `<session>/tasks.json`
- **Discovery files**: `<session>/discoveries/{task_id}.json`
- **CLI tools**: `ccw cli --mode analysis` (read-only), `ccw cli --mode write` (modifications)

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
inner_loop: <true|false>

Read role_spec file (<skill_root>/roles/<role>/role.md) to load Phase 2-4 domain instructions.
Execute built-in Phase 1 (task discovery) -> role Phase 2-4 -> built-in Phase 5 (report).` },

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

## Supervisor Spawn Template

Supervisor is a **resident agent** (independent from team_worker). Spawned once during session init, woken via send_input for each CHECKPOINT task.

### Spawn (Phase 2 -- once per session)

```
supervisorId = spawn_agent({
  agent_type: "team_supervisor",
  items: [
    { type: "text", text: `## Role Assignment
role: supervisor
role_spec: <skill_root>/roles/supervisor/role.md
session: <session-folder>
session_id: <session-id>
requirement: <task-description>

Read role_spec file (<skill_root>/roles/supervisor/role.md) to load checkpoint definitions.
Init: load baseline context, report ready, go idle.
Wake cycle: orchestrator sends checkpoint requests via send_input.` }
  ]
})
```

### Wake (per CHECKPOINT task)

```
send_input({
  id: supervisorId,
  items: [
    { type: "text", text: `## Checkpoint Request
task_id: <CHECKPOINT-NNN>
scope: [<upstream-task-ids>]
pipeline_progress: <done>/<total> tasks completed` }
  ]
})
wait_agent({ ids: [supervisorId], timeout_ms: 300000 })
```

### Shutdown (pipeline complete)

```
close_agent({ id: supervisorId })
```

## Wave Execution Engine

For each wave in the pipeline:

1. **Load state** -- Read `<session>/tasks.json`, filter tasks for current wave
2. **Skip failed deps** -- Mark tasks whose dependencies failed/skipped as `skipped`
3. **Build upstream context** -- For each task, gather findings from `context_from` tasks via tasks.json and `discoveries/{id}.json`
4. **Separate task types** -- Split into regular tasks and CHECKPOINT tasks
5. **Spawn regular tasks** -- For each regular task, call `spawn_agent({ agent_type: "team_worker", items: [...] })`, collect agent IDs
6. **Wait** -- `wait_agent({ ids: [...], timeout_ms: 900000 })`
7. **Collect results** -- Read `discoveries/{task_id}.json` for each agent, update tasks.json status/findings/error, then `close_agent({ id })` each worker
8. **Execute checkpoints** -- For each CHECKPOINT task, `send_input` to supervisor, `wait_agent`, read checkpoint report from `artifacts/`, parse verdict
9. **Handle block** -- If verdict is `block`, prompt user via `request_user_input` with options: Override / Revise upstream / Abort
10. **Persist** -- Write updated state to `<session>/tasks.json`

## User Commands

| Command | Action |
|---------|--------|
| `check` / `status` | View execution status graph |
| `resume` / `continue` | Advance to next step |
| `revise <TASK-ID> [feedback]` | Revise specific task |
| `feedback <text>` | Inject feedback for revision |
| `recheck` | Re-run quality check |
| `improve [dimension]` | Auto-improve weakest dimension |

## Completion Action

When pipeline completes, coordinator presents:

```
request_user_input({
  questions: [{
    question: "Pipeline complete. What would you like to do?",
    header: "Completion",
    multiSelect: false,
    options: [
      { label: "Archive & Clean (Recommended)", description: "Archive session, clean up resources" },
      { label: "Keep Active", description: "Keep session for follow-up work" },
      { label: "Export Results", description: "Export deliverables to target directory" }
    ]
  }]
})
```

## Specs Reference

- [specs/pipelines.md](specs/pipelines.md) -- Pipeline definitions and task registry
- [specs/quality-gates.md](specs/quality-gates.md) -- Quality gate criteria and scoring
- [specs/knowledge-transfer.md](specs/knowledge-transfer.md) -- Artifact and state transfer protocols

## Session Directory

```
.workflow/.team/TLV4-<slug>-<date>/
├── tasks.json                  # Task state (JSON)
├── discoveries/                # Per-task findings ({task_id}.json)
├── spec/                       # Spec phase outputs
├── plan/                       # Implementation plan
├── artifacts/                  # All deliverables
├── wisdom/                     # Cross-task knowledge
├── explorations/               # Shared explore cache
└── discussions/                # Discuss round records
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown command | Error with available command list |
| Role not found | Error with role registry |
| CLI tool fails | Worker fallback to direct implementation |
| Supervisor crash | Respawn with `recovery: true`, auto-rebuilds from existing reports |
| Supervisor not ready for CHECKPOINT | Spawn/respawn supervisor, wait for ready, then wake |
| Completion action fails | Default to Keep Active |
| Worker timeout | Mark task as failed, continue wave |
| Discovery file missing | Mark task as failed with "No discovery file produced" |
