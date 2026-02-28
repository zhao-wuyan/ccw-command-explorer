---
name: team-executor
description: Lightweight session execution skill. Resumes existing team-coordinate sessions for pure execution. No analysis, no role generation -- only loads and executes. Session path required. Triggers on "team executor".
allowed-tools: TeamCreate(*), TeamDelete(*), SendMessage(*), TaskCreate(*), TaskUpdate(*), TaskList(*), TaskGet(*), Task(*), AskUserQuestion(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team Executor

Lightweight session execution skill: load session -> reconcile state -> spawn workers -> execute -> deliver. **No analysis, no role generation** -- only executes existing team-coordinate sessions.

## Architecture

```
+---------------------------------------------------+
|  Skill(skill="team-executor")                      |
|  args="--session=<path>" [REQUIRED]                |
|  args="--role=<name>" (for worker dispatch)        |
+-------------------+-------------------------------+
                    | Session Validation
         +---- --session valid? ----+
         | NO                       | YES
         v                          v
    Error immediately         Role Router
    (no session)                  |
                          +-------+-------+
                          | --role present?
                          |       |
                     YES  |       | NO
                     v    |       v
              Route to    |   Orchestration Mode
              session     |   -> executor
              role.md     |
```

---

## Session Validation (BEFORE routing)

**CRITICAL**: Session validation MUST occur before any role routing.

### Parse Arguments

Extract from `$ARGUMENTS`:
- `--session=<path>`: Path to team-coordinate session folder (REQUIRED)
- `--role=<name>`: Role to dispatch (optional, defaults to orchestration mode)

### Validation Steps

1. **Check `--session` provided**:
   - If missing -> **ERROR**: "Session required. Usage: --session=<path-to-TC-folder>"
   - Do NOT proceed

2. **Validate session structure** (see specs/session-schema.md):
   - Directory exists at path
   - `team-session.json` exists and valid JSON
   - `task-analysis.json` exists and valid JSON
   - `roles/` directory has at least one `.md` file
   - Each role in `team-session.json#roles` has corresponding `.md` file in `roles/`

3. **Validation failure**:
   - Report specific missing component
   - Suggest re-running team-coordinate or checking path
   - Do NOT proceed

### Validation Checklist

```
Session Validation Checklist:
[ ] --session argument provided
[ ] Directory exists at path
[ ] team-session.json exists and parses
[ ] task-analysis.json exists and parses
[ ] roles/ directory has >= 1 .md files
[ ] All session.roles[] have corresponding roles/<role>.md
```

---

## Role Router

### Dispatch Logic

| Scenario | Action |
|----------|--------|
| No `--session` | **ERROR** immediately |
| `--session` invalid | **ERROR** with specific reason |
| No `--role` | Orchestration Mode -> executor |
| `--role=executor` | Read built-in `roles/executor/role.md` |
| `--role=<other>` | Read `<session>/roles/<role>.md` |

### Orchestration Mode

When invoked without `--role`, executor auto-starts.

**Invocation**: `Skill(skill="team-executor", args="--session=<session-folder>")`

**Lifecycle**:
```
Validate session
  -> executor Phase 0: Reconcile state (reset interrupted, detect orphans)
  -> executor Phase 1: Spawn first batch workers (background) -> STOP
  -> Worker executes -> SendMessage callback -> executor advances next step
  -> Loop until pipeline complete -> Phase 2 report
```

**User Commands** (wake paused executor):

| Command | Action |
|---------|--------|
| `check` / `status` | Output execution status graph, no advancement |
| `resume` / `continue` | Check worker states, advance next step |

---

## Role Registry

| Role | File | Type |
|------|------|------|
| executor | [roles/executor/role.md](roles/executor/role.md) | built-in orchestrator |
| (dynamic) | `<session>/roles/<role-name>.md` | loaded from session |

> **COMPACT PROTECTION**: Role files are execution documents. After context compression, role instructions become summaries only -- **MUST immediately `Read` the role.md to reload before continuing**. Never execute any Phase based on summaries.

---

## Shared Infrastructure

The following templates apply to all worker roles. Each loaded role.md follows the same structure.

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

Task completion with optional fast-advance to skip executor round-trip:

1. **Message Bus**: Call `mcp__ccw-tools__team_msg` to log message
   - Params: operation="log", team=**<session-id>**, from=<role>, to="executor", type=<message-type>, summary="[<role>] <summary>", ref=<artifact-path>
   - **`team` must be session ID** (e.g., `TC-my-project-2026-02-27`), NOT team name. Extract from task description `Session:` field -> take folder name.
   - **CLI fallback**: `ccw team log --team <session-id> --from <role> --to executor --type <type> --summary "[<role>] ..." --json`
2. **TaskUpdate**: Mark task completed
3. **Fast-Advance Check**:
   - Call `TaskList()`, find pending tasks whose blockedBy are ALL completed
   - If exactly 1 ready task AND its owner matches a simple successor pattern -> **spawn it directly** (skip executor)
   - Otherwise -> **SendMessage** to executor for orchestration
4. **Loop**: Back to Phase 1 to check for next task

**Fast-Advance Rules**:

| Condition | Action |
|-----------|--------|
| Same-prefix successor (Inner Loop role) | Do not spawn, main agent inner loop (Phase 5-L) |
| 1 ready task, simple linear successor, different prefix | Spawn directly via Task(run_in_background: true) |
| Multiple ready tasks (parallel window) | SendMessage to executor (needs orchestration) |
| No ready tasks + others running | SendMessage to executor (status update) |
| No ready tasks + nothing running | SendMessage to executor (pipeline may be complete) |

**Fast-advance failure recovery**: If a fast-advanced task fails, the executor detects it as an orphaned in_progress task on next `resume`/`check` and resets it to pending for re-spawn. Self-healing. See [monitor.md](roles/executor/commands/monitor.md).

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
| SendMessage to executor | NO | YES (all tasks summary) |
| Fast-Advance to next prefix | - | YES (check cross-prefix successors) |

### Wisdom Accumulation (all roles)

Cross-task knowledge accumulation. Loaded from session at startup.

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
| SendMessage to executor | Directly communicate with other workers |
| Use tools appropriate to responsibility | Create tasks for other roles |
| Fast-advance simple successors | Spawn parallel worker batches |
| Report capability_gap to executor | Attempt work outside scope |

Executor additionally prohibited: directly write/modify deliverable artifacts, call implementation subagents directly, directly execute analysis/test/review, generate new roles.

---

## Cadence Control

**Beat model**: Event-driven, each beat = executor wake -> process -> spawn -> STOP.

```
Beat Cycle (single beat)
======================================================================
  Event                   Executor                 Workers
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

  Fast-Advance (skips executor for simple linear successors)
======================================================================
  [Worker A] Phase 5 complete
    +- 1 ready task? simple successor? --> spawn Worker B directly
    +- complex case? --> SendMessage to executor
======================================================================
```

---

## Executor Spawn Template

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
Skill(skill="team-executor", args="--role=<role> --session=<session-folder>")

Current requirement: <task-description>
Session: <session-folder>

## Role Guidelines
- Only process <PREFIX>-* tasks, do not execute other role work
- All output prefixed with [<role>] tag
- Only communicate with executor
- Do not use TaskCreate to create tasks for other roles
- Before each SendMessage, call mcp__ccw-tools__team_msg to log (team=<session-id> from Session field, NOT team name)
- After task completion, check for fast-advance opportunity (see SKILL.md Phase 5)

## Workflow
1. Call Skill -> get role definition and execution logic
2. Follow role.md 5-Phase flow
3. team_msg(team=<session-id>) + SendMessage results to executor
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
Skill(skill="team-executor", args="--role=<role> --session=<session-folder>")

Current requirement: <task-description>
Session: <session-folder>

## Inner Loop Mode
You will handle ALL <PREFIX>-* tasks in this session, not just the first one.
After completing each task, loop back to find the next <PREFIX>-* task.
Only SendMessage to executor when:
- All <PREFIX>-* tasks are done
- A consensus_blocked HIGH occurs
- Errors accumulate (>= 3)

## Role Guidelines
- Only process <PREFIX>-* tasks, do not execute other role work
- All output prefixed with [<role>] tag
- Only communicate with executor
- Do not use TaskCreate to create tasks for other roles
- Before each SendMessage, call mcp__ccw-tools__team_msg to log (team=<session-id> from Session field, NOT team name)
- Use subagent calls for heavy work, retain summaries in context`
})
```

---

## Integration with team-coordinate

| Scenario | Skill |
|----------|-------|
| New task, no session | team-coordinate |
| Existing session, resume execution | **team-executor** |
| Session needs new roles | team-coordinate (with --resume) |
| Pure execution, no analysis | **team-executor** |

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No --session provided | ERROR immediately with usage message |
| Session directory not found | ERROR with path, suggest checking path |
| team-session.json missing | ERROR, session incomplete, suggest re-run team-coordinate |
| task-analysis.json missing | ERROR, session incomplete, suggest re-run team-coordinate |
| No roles in session | ERROR, session incomplete, suggest re-run team-coordinate |
| Role file not found | ERROR with expected path |
| capability_gap reported | Warn only, cannot generate new roles (see monitor.md handleAdapt) |
| Fast-advance spawns wrong task | Executor reconciles on next callback |
