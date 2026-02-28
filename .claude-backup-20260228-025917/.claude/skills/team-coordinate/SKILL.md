---
name: team-coordinate
description: Universal team coordination skill with dynamic role generation. Only coordinator is built-in -- all worker roles are generated at runtime based on task analysis. Beat/cadence model for orchestration. Triggers on "team coordinate".
allowed-tools: TeamCreate(*), TeamDelete(*), SendMessage(*), TaskCreate(*), TaskUpdate(*), TaskList(*), TaskGet(*), Task(*), AskUserQuestion(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team Coordinate

Universal team coordination skill: analyze task -> generate roles -> dispatch -> execute -> deliver. Only the **coordinator** is built-in. All worker roles are **dynamically generated** based on task analysis.

## Architecture

```
+---------------------------------------------------+
|  Skill(skill="team-coordinate")                    |
|  args="task description"                           |
|  args="--role=coordinator"                         |
|  args="--role=<dynamic> --session=<path>"          |
+-------------------+-------------------------------+
                    | Role Router
         +---- --role present? ----+
         | NO                      | YES
         v                         v
  Orchestration Mode         Role Dispatch
  (auto -> coordinator)      (route to role file)
         |                         |
    coordinator            +-------+-------+
    (built-in)             | --role=coordinator?
                           |       |
                      YES  |       | NO
                      v    |       v
              built-in     | Dynamic Role
              role.md      | <session>/roles/<role>.md

  Subagents (callable by any role, not team members):
    [discuss-subagent]  - multi-perspective critique (dynamic perspectives)
    [explore-subagent]  - codebase exploration with cache
```

## Role Router

### Input Parsing

Parse `$ARGUMENTS` to extract `--role` and `--session`. If no `--role` -> Orchestration Mode (auto route to coordinator).

### Role Registry

Only coordinator is statically registered. All other roles are dynamic, stored in `team-session.json#roles`.

| Role | File | Type |
|------|------|------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | built-in orchestrator |
| (dynamic) | `<session>/roles/<role-name>.md` | runtime-generated worker |

> **COMPACT PROTECTION**: Role files are execution documents. After context compression, role instructions become summaries only -- **MUST immediately `Read` the role.md to reload before continuing**. Never execute any Phase based on summaries.

### Subagent Registry

| Subagent | Spec | Callable By | Purpose |
|----------|------|-------------|---------|
| discuss | [subagents/discuss-subagent.md](subagents/discuss-subagent.md) | any role | Multi-perspective critique (dynamic perspectives) |
| explore | [subagents/explore-subagent.md](subagents/explore-subagent.md) | any role | Codebase exploration with cache |

### Dispatch

1. Extract `--role` and `--session` from arguments
2. If no `--role` -> route to coordinator (Orchestration Mode)
3. If `--role=coordinator` -> Read built-in `roles/coordinator/role.md` -> Execute its phases
4. If `--role=<other>`:
   - **`--session` is REQUIRED** for dynamic roles. Error if not provided.
   - Read `<session>/roles/<role>.md` -> Execute its phases
   - If role file not found at path -> Error with expected path

### Orchestration Mode

When invoked without `--role`, coordinator auto-starts. User just provides task description.

**Invocation**: `Skill(skill="team-coordinate", args="task description")`

**Lifecycle**:
```
User provides task description
  -> coordinator Phase 1: task analysis (detect capabilities, build dependency graph)
  -> coordinator Phase 2: generate roles + initialize session
  -> coordinator Phase 3: create task chain from dependency graph
  -> coordinator Phase 4: spawn first batch workers (background) -> STOP
  -> Worker executes -> SendMessage callback -> coordinator advances next step
  -> Loop until pipeline complete -> Phase 5 report
```

**User Commands** (wake paused coordinator):

| Command | Action |
|---------|--------|
| `check` / `status` | Output execution status graph, no advancement |
| `resume` / `continue` | Check worker states, advance next step |

---

## Shared Infrastructure

The following templates apply to all worker roles. Each generated role.md only needs to define **Phase 2-4** role-specific logic.

### Worker Phase 1: Task Discovery (all workers shared)

Each worker on startup executes the same task discovery flow:

1. Call `TaskList()` to get all tasks
2. Filter: subject matches this role's prefix + owner is this role + status is pending + blockedBy is empty
3. No tasks -> idle wait
4. Has tasks -> `TaskGet` for details -> `TaskUpdate` mark in_progress

**Resume Artifact Check** (prevent duplicate output after resume):
- Check if this task's output artifacts already exist
- Artifacts complete -> skip to Phase 5 report completion
- Artifacts incomplete or missing -> normal Phase 2-4 execution

### Worker Phase 5: Report + Fast-Advance (all workers shared)

Task completion with optional fast-advance to skip coordinator round-trip:

1. **Message Bus**: Call `mcp__ccw-tools__team_msg` to log message
   - Params: operation="log", team=**<session-id>**, from=<role>, to="coordinator", type=<message-type>, summary="[<role>] <summary>", ref=<artifact-path>
   - **`team` must be session ID** (e.g., `TC-my-project-2026-02-27`), NOT team name. Extract from task description `Session:` field -> take folder name.
   - **CLI fallback**: `ccw team log --team <session-id> --from <role> --to coordinator --type <type> --summary "[<role>] ..." --json`
2. **TaskUpdate**: Mark task completed
3. **Fast-Advance Check**:
   - Call `TaskList()`, find pending tasks whose blockedBy are ALL completed
   - If exactly 1 ready task AND its owner matches a simple successor pattern -> **spawn it directly** (skip coordinator)
   - Otherwise -> **SendMessage** to coordinator for orchestration
4. **Loop**: Back to Phase 1 to check for next task

**Fast-Advance Rules**:

| Condition | Action |
|-----------|--------|
| Same-prefix successor (Inner Loop role) | Do not spawn, main agent inner loop (Phase 5-L) |
| 1 ready task, simple linear successor, different prefix | Spawn directly via Task(run_in_background: true) |
| Multiple ready tasks (parallel window) | SendMessage to coordinator (needs orchestration) |
| No ready tasks + others running | SendMessage to coordinator (status update) |
| No ready tasks + nothing running | SendMessage to coordinator (pipeline may be complete) |

**Fast-advance failure recovery**: If a fast-advanced task fails, the coordinator detects it as an orphaned in_progress task on next `resume`/`check` and resets it to pending for re-spawn. Self-healing. See [monitor.md](roles/coordinator/commands/monitor.md).

### Worker Inner Loop (roles with multiple same-prefix serial tasks)

When a role has **2+ serial same-prefix tasks**, it loops internally instead of spawning new agents:

**Inner Loop flow**:

```
Phase 1: Discover task (first time)
  |
  +- Found task -> Phase 2-3: Load context + Execute work
  |                |
  |                v
  |          Phase 4: Validation (+ optional Inline Discuss)
  |                |
  |                v
  |          Phase 5-L: Loop Completion
  |                |
  |                +- TaskUpdate completed
  |                +- team_msg log
  |                +- Accumulate summary to context_accumulator
  |                |
  |                +- More same-prefix tasks?
  |                |   +- YES -> back to Phase 1 (inner loop)
  |                |   +- NO -> Phase 5-F: Final Report
  |                |
  |                +- Interrupt conditions?
  |                    +- consensus_blocked HIGH -> SendMessage -> STOP
  |                    +- Errors >= 3 -> SendMessage -> STOP
  |
  +- Phase 5-F: Final Report
       +- SendMessage (all task summaries)
       +- STOP
```

**Phase 5-L vs Phase 5-F**:

| Step | Phase 5-L (looping) | Phase 5-F (final) |
|------|---------------------|-------------------|
| TaskUpdate completed | YES | YES |
| team_msg log | YES | YES |
| Accumulate summary | YES | - |
| SendMessage to coordinator | NO | YES (all tasks summary) |
| Fast-Advance to next prefix | - | YES (check cross-prefix successors) |

### Inline Discuss Protocol (optional for any role)

After completing primary output, roles may call the discuss subagent inline. Unlike v4's fixed perspective definitions, team-coordinate uses **dynamic perspectives** specified by the coordinator when generating each role.

```
Task({
  subagent_type: "cli-discuss-agent",
  run_in_background: false,
  description: "Discuss <round-id>",
  prompt: <see subagents/discuss-subagent.md for prompt template>
})
```

**Consensus handling**:

| Verdict | Severity | Role Action |
|---------|----------|-------------|
| consensus_reached | - | Include action items in report, proceed to Phase 5 |
| consensus_blocked | HIGH | SendMessage with structured format. Do NOT self-revise. |
| consensus_blocked | MEDIUM | SendMessage with warning. Proceed normally. |
| consensus_blocked | LOW | Treat as consensus_reached with notes. |

### Shared Explore Utility

Any role needing codebase context calls the explore subagent:

```
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: "Explore <angle>",
  prompt: <see subagents/explore-subagent.md for prompt template>
})
```

**Cache**: Results stored in `explorations/` with `cache-index.json`. Before exploring, always check cache first.

### Wisdom Accumulation (all roles)

Cross-task knowledge accumulation. Coordinator creates `wisdom/` directory at session init.

**Directory**:
```
<session-folder>/wisdom/
+-- learnings.md      # Patterns and insights
+-- decisions.md      # Design and strategy decisions
+-- issues.md         # Known risks and issues
```

**Worker load** (Phase 2): Extract `Session: <path>` from task description, read wisdom files.
**Worker contribute** (Phase 4/5): Write discoveries to corresponding wisdom files.

### Role Isolation Rules

| Allowed | Prohibited |
|---------|-----------|
| Process own prefix tasks | Process other role's prefix tasks |
| SendMessage to coordinator | Directly communicate with other workers |
| Use tools appropriate to responsibility | Create tasks for other roles |
| Call discuss/explore subagents | Modify resources outside own scope |
| Fast-advance simple successors | Spawn parallel worker batches |
| Report capability_gap to coordinator | Attempt work outside scope |

Coordinator additionally prohibited: directly write/modify deliverable artifacts, call implementation subagents directly, directly execute analysis/test/review.

---

## Cadence Control

**Beat model**: Event-driven, each beat = coordinator wake -> process -> spawn -> STOP.

```
Beat Cycle (single beat)
======================================================================
  Event                   Coordinator              Workers
----------------------------------------------------------------------
  callback/resume --> +- handleCallback -+
                      |  mark completed   |
                      |  check pipeline   |
                      +- handleSpawnNext -+
                      |  find ready tasks |
                      |  spawn workers ---+--> [Worker A] Phase 1-5
                      |  (parallel OK)  --+--> [Worker B] Phase 1-5
                      +- STOP (idle) -----+         |
                                                     |
  callback <-----------------------------------------+
  (next beat)              SendMessage + TaskUpdate(completed)
======================================================================

  Fast-Advance (skips coordinator for simple linear successors)
======================================================================
  [Worker A] Phase 5 complete
    +- 1 ready task? simple successor? --> spawn Worker B directly
    +- complex case? --> SendMessage to coordinator
======================================================================
```

**Pipelines are dynamic**: Unlike v4's predefined pipeline beat views (spec-only, impl-only, etc.), team-coordinate pipelines are generated per-task from the dependency graph. The beat model is the same -- only the pipeline shape varies.

---

## Coordinator Spawn Template

### Standard Worker (single-task role)

```
Task({
  subagent_type: "general-purpose",
  description: "Spawn <role> worker",
  team_name: <team-name>,
  name: "<role>",
  run_in_background: true,
  prompt: `You are team "<team-name>" <ROLE>.

## Primary Instruction
All your work MUST be executed by calling Skill to get role definition:
Skill(skill="team-coordinate", args="--role=<role> --session=<session-folder>")

Current requirement: <task-description>
Session: <session-folder>

## Role Guidelines
- Only process <PREFIX>-* tasks, do not execute other role work
- All output prefixed with [<role>] tag
- Only communicate with coordinator
- Do not use TaskCreate to create tasks for other roles
- Before each SendMessage, call mcp__ccw-tools__team_msg to log (team=<session-id> from Session field, NOT team name)
- After task completion, check for fast-advance opportunity (see SKILL.md Phase 5)

## Workflow
1. Call Skill -> get role definition and execution logic
2. Follow role.md 5-Phase flow
3. team_msg(team=<session-id>) + SendMessage results to coordinator
4. TaskUpdate completed -> check next task or fast-advance`
})
```

### Inner Loop Worker (multi-task role)

```
Task({
  subagent_type: "general-purpose",
  description: "Spawn <role> worker (inner loop)",
  team_name: <team-name>,
  name: "<role>",
  run_in_background: true,
  prompt: `You are team "<team-name>" <ROLE>.

## Primary Instruction
All your work MUST be executed by calling Skill to get role definition:
Skill(skill="team-coordinate", args="--role=<role> --session=<session-folder>")

Current requirement: <task-description>
Session: <session-folder>

## Inner Loop Mode
You will handle ALL <PREFIX>-* tasks in this session, not just the first one.
After completing each task, loop back to find the next <PREFIX>-* task.
Only SendMessage to coordinator when:
- All <PREFIX>-* tasks are done
- A consensus_blocked HIGH occurs
- Errors accumulate (>= 3)

## Role Guidelines
- Only process <PREFIX>-* tasks, do not execute other role work
- All output prefixed with [<role>] tag
- Only communicate with coordinator
- Do not use TaskCreate to create tasks for other roles
- Before each SendMessage, call mcp__ccw-tools__team_msg to log (team=<session-id> from Session field, NOT team name)
- Use subagent calls for heavy work, retain summaries in context`
})
```

---

## Session Directory

```
.workflow/.team/TC-<slug>-<date>/
+-- team-session.json           # Session state + dynamic role registry
+-- task-analysis.json          # Phase 1 output: capabilities, dependency graph
+-- roles/                      # Dynamic role definitions (generated Phase 2)
|   +-- <role-1>.md
|   +-- <role-2>.md
+-- artifacts/                  # All MD deliverables from workers
|   +-- <artifact>.md
+-- shared-memory.json          # Cross-role state store
+-- wisdom/                     # Cross-task knowledge
|   +-- learnings.md
|   +-- decisions.md
|   +-- issues.md
+-- explorations/               # Shared explore cache
|   +-- cache-index.json
|   +-- explore-<angle>.json
+-- discussions/                # Inline discuss records
|   +-- <round>.md
+-- .msg/                       # Team message bus logs
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
      "role_file": "roles/<role-name>.md"
    }
  ],
  "pipeline": {
    "dependency_graph": {},
    "tasks_total": 0,
    "tasks_completed": 0
  },
  "active_workers": [],
  "completed_tasks": [],
  "created_at": "<timestamp>"
}
```

---

## Session Resume

Coordinator supports `--resume` / `--continue` for interrupted sessions:

1. Scan `.workflow/.team/TC-*/team-session.json` for active/paused sessions
2. Multiple matches -> AskUserQuestion for selection
3. Audit TaskList -> reconcile session state <-> task status
4. Reset in_progress -> pending (interrupted tasks)
5. Rebuild team and spawn needed workers only
6. Create missing tasks with correct blockedBy
7. Kick first executable task -> Phase 4 coordination loop

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown --role value | Check if `<session>/roles/<role>.md` exists; error with message if not |
| Missing --role arg | Orchestration Mode -> coordinator |
| Dynamic role file not found | Error with expected path, coordinator may need to regenerate |
| Built-in role file not found | Error with expected path |
| Command file not found | Fallback to inline execution |
| Discuss subagent fails | Role proceeds without discuss, logs warning |
| Explore cache corrupt | Clear cache, re-explore |
| Fast-advance spawns wrong task | Coordinator reconciles on next callback |
| Session path not provided (dynamic role) | Error: `--session` is required for dynamic roles. Coordinator must always pass `--session=<session-folder>` when spawning workers. |
| capability_gap reported | Coordinator generates new role via handleAdapt |
