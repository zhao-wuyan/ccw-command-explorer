---
name: team-coordinate
description: Universal team coordination skill with dynamic role generation. Uses team-worker agent architecture with role-spec files. Only coordinator is built-in -- all worker roles are generated at runtime as role-specs and spawned via team-worker agent. Beat/cadence model for orchestration. Triggers on "Team Coordinate ".
allowed-tools: spawn_agent(*), wait_agent(*), send_input(*), close_agent(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team Coordinate

Universal team coordination skill: analyze task -> generate role-specs -> dispatch -> execute -> deliver. Only the **coordinator** is built-in. All worker roles are **dynamically generated** as lightweight role-spec files and spawned via the `team-worker` agent.


## Architecture

```
+---------------------------------------------------+
|  Skill(skill="team-coordinate")                 |
|  args="task description"                           |
+-------------------+-------------------------------+
                    |
         Orchestration Mode (auto -> coordinator)
                    |
              Coordinator (built-in)
              Phase 0-5 orchestration
                    |
    +-------+-------+-------+-------+
    v       v       v       v       v
 [team-worker agents, each loaded with a dynamic role-spec]
  (roles generated at runtime from task analysis)

  CLI Tools (callable by any worker):
    ccw cli --mode analysis  - analysis and exploration
    ccw cli --mode write     - code generation and modification
```

## Shared Constants

| Constant | Value |
|----------|-------|
| Session prefix | `TC` |
| Session path | `.workflow/.team/TC-<slug>-<date>/` |
| Worker agent | `team-worker` |
| Message bus | `mcp__ccw-tools__team_msg(session_id=<session-id>, ...)` |
| CLI analysis | `ccw cli --mode analysis` |
| CLI write | `ccw cli --mode write` |
| Max roles | 5 |

## Role Router

This skill is **coordinator-only**. Workers do NOT invoke this skill -- they are spawned as `team-worker` agents directly.

### Input Parsing

Parse `$ARGUMENTS`. No `--role` needed -- always routes to coordinator.

### Role Registry

Only coordinator is statically registered. All other roles are dynamic, stored as role-specs in session.

| Role | File | Type |
|------|------|------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | built-in orchestrator |
| (dynamic) | `<session>/role-specs/<role-name>.md` | runtime-generated role-spec |

### CLI Tool Usage

Workers can use CLI tools for analysis and code operations:

| Tool | Purpose |
|------|---------|
| ccw cli --mode analysis | Analysis, exploration, pattern discovery |
| ccw cli --mode write | Code generation, modification, refactoring |

### Dispatch

Always route to coordinator. Coordinator reads `roles/coordinator/role.md` and executes its phases.

### Orchestration Mode

User just provides task description.

**Invocation**: `Skill(skill="team-coordinate", args="task description")`

**Lifecycle**:
```
User provides task description
  -> coordinator Phase 1: task analysis (detect capabilities, build dependency graph)
  -> coordinator Phase 2: generate role-specs + initialize session
  -> coordinator Phase 3: create task chain from dependency graph
  -> coordinator Phase 4: spawn first batch workers (background) -> STOP
  -> Worker executes -> callback -> coordinator advances next step
  -> Loop until pipeline complete -> Phase 5 report + completion action
```

**User Commands** (wake paused coordinator):

| Command | Action |
|---------|--------|
| `check` / `status` | Output execution status graph, no advancement |
| `resume` / `continue` | Check worker states, advance next step |
| `revise <TASK-ID> [feedback]` | Revise specific task with optional feedback |
| `feedback <text>` | Inject feedback into active pipeline |
| `improve [dimension]` | Auto-improve weakest quality dimension |

---

## Coordinator Spawn Template

### v2 Worker Spawn (all roles)

When coordinator spawns workers, use `team-worker` agent with role-spec path:

```
spawn_agent({
  agent_type: "team_worker",
  items: [
    { type: "text", text: `## Role Assignment
role: <role>
role_spec: <session-folder>/role-specs/<role>.md
session: <session-folder>
session_id: <session-id>
requirement: <task-description>
inner_loop: <true|false>

Read role_spec file to load Phase 2-4 domain instructions.` },

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

**Inner Loop roles** (role has 2+ serial same-prefix tasks): Set `inner_loop: true`. The team-worker agent handles the loop internally.

**Single-task roles**: Set `inner_loop: false`.

---

## Completion Action

When pipeline completes (all tasks done), coordinator presents an interactive choice:

```
request_user_input({
  questions: [{
    question: "Team pipeline complete. What would you like to do?",
    header: "Completion",
    multiSelect: false,
    options: [
      { label: "Archive & Clean (Recommended)", description: "Archive session, clean up team" },
      { label: "Keep Active", description: "Keep session for follow-up work" },
      { label: "Export Results", description: "Export deliverables to target directory, then clean" }
    ]
  }]
})
```

### Action Handlers

| Choice | Steps |
|--------|-------|
| Archive & Clean | Update session status="completed" -> output final summary with artifact paths |
| Keep Active | Update session status="paused" -> output: "Resume with: Skill(skill='team-coordinate', args='resume')" |
| Export Results | request_user_input(target path) -> copy artifacts to target -> Archive & Clean |

---

## Specs Reference

| Spec | Purpose |
|------|---------|
| [specs/pipelines.md](specs/pipelines.md) | Dynamic pipeline model, task naming, dependency graph |
| [specs/role-spec-template.md](specs/role-spec-template.md) | Template for dynamic role-spec generation |
| [specs/quality-gates.md](specs/quality-gates.md) | Quality thresholds and scoring dimensions |
| [specs/knowledge-transfer.md](specs/knowledge-transfer.md) | Context transfer protocols between roles |

---

## Session Directory

```
.workflow/.team/TC-<slug>-<date>/
+-- team-session.json           # Session state + dynamic role registry
+-- task-analysis.json          # Phase 1 output: capabilities, dependency graph
+-- role-specs/                 # Dynamic role-spec definitions (generated Phase 2)
|   +-- <role-1>.md             # Lightweight: frontmatter + Phase 2-4 only
|   +-- <role-2>.md
+-- artifacts/                  # All MD deliverables from workers
|   +-- <artifact>.md
+-- .msg/                       # Team message bus + state
|   +-- messages.jsonl          # Message log
|   +-- meta.json               # Session metadata + cross-role state
+-- wisdom/                     # Cross-task knowledge
|   +-- learnings.md
|   +-- decisions.md
|   +-- issues.md
+-- explorations/               # Shared explore cache
|   +-- cache-index.json
|   +-- explore-<angle>.json
+-- discussions/                # Inline discuss records
|   +-- <round>.md
```

### team-session.json Schema

```json
{
  "session_id": "TC-<slug>-<date>",
  "task_description": "<original user input>",
  "status": "active | paused | completed",
  "team_name": "<team-name>",
  "roles": [
    {
      "name": "<role-name>",
      "prefix": "<PREFIX>",
      "responsibility_type": "<type>",
      "inner_loop": false,
      "role_spec": "role-specs/<role-name>.md"
    }
  ],
  "pipeline": {
    "dependency_graph": {},
    "tasks_total": 0,
    "tasks_completed": 0
  },
  "active_workers": [],
  "completed_tasks": [],
  "completion_action": "interactive",
  "created_at": "<timestamp>"
}
```

---

## Session Resume

Coordinator supports `resume` / `continue` for interrupted sessions:

1. Scan `.workflow/.team/TC-*/team-session.json` for active/paused sessions
2. Multiple matches -> request_user_input for selection
3. Audit task states -> reconcile session state <-> task status
4. Reset in_progress -> pending (interrupted tasks)
5. Rebuild team and spawn needed workers only
6. Create missing tasks, set dependencies
7. Kick first executable task -> Phase 4 coordination loop

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown command | Error with available command list |
| Dynamic role-spec not found | Error, coordinator may need to regenerate |
| Command file not found | Fallback to inline execution |
| CLI tool fails | Worker proceeds with direct implementation, logs warning |
| Explore cache corrupt | Clear cache, re-explore |
| Fast-advance spawns wrong task | Coordinator reconciles on next callback |
| capability_gap reported | Coordinator generates new role-spec via handleAdapt |
| Completion action fails | Default to Keep Active, log warning |
