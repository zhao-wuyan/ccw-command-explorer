# Command: monitor

## Purpose

Event-driven pipeline coordination with Spawn-and-Stop pattern. Adapted from v4 for dynamic roles -- role names are read from `team-session.json#roles` instead of hardcoded. Includes `handleAdapt` for mid-pipeline capability gap handling.

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| SPAWN_MODE | background | All workers spawned via `Task(run_in_background: true)` |
| ONE_STEP_PER_INVOCATION | true | Coordinator does one operation then STOPS |
| FAST_ADVANCE_AWARE | true | Workers may skip coordinator for simple linear successors |

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Session file | `<session-folder>/team-session.json` | Yes |
| Task list | `TaskList()` | Yes |
| Active workers | session.active_workers[] | Yes |
| Role registry | session.roles[] | Yes |

**Dynamic role resolution**: Known worker roles are loaded from `session.roles[].name` rather than a static list. This is the key difference from v4.

## Phase 3: Handler Routing

### Wake-up Source Detection

Parse `$ARGUMENTS` to determine handler:

| Priority | Condition | Handler |
|----------|-----------|---------|
| 1 | Message contains `[<role-name>]` from session roles | handleCallback |
| 2 | Contains "capability_gap" | handleAdapt |
| 3 | Contains "check" or "status" | handleCheck |
| 4 | Contains "resume", "continue", or "next" | handleResume |
| 5 | None of the above (initial spawn after dispatch) | handleSpawnNext |

---

### Handler: handleCallback

Worker completed a task. Verify completion, update state, auto-advance.

```
Receive callback from [<role>]
  +- Find matching active worker by role (from session.roles)
  +- Is this a progress update (not final)? (Inner Loop intermediate task completion)
  |   +- YES -> Update session state, do NOT remove from active_workers -> STOP
  +- Task status = completed?
  |   +- YES -> remove from active_workers -> update session
  |   |   +- -> handleSpawnNext
  |   +- NO -> progress message, do not advance -> STOP
  +- No matching worker found
      +- Scan all active workers for completed tasks
      +- Found completed -> process each -> handleSpawnNext
      +- None completed -> STOP
```

**Fast-advance note**: A worker may have already spawned its successor via fast-advance. When processing a callback:
1. Check if the expected next task is already `in_progress` (fast-advanced)
2. If yes -> skip spawning that task, update active_workers to include the fast-advanced worker
3. If no -> normal handleSpawnNext

---

### Handler: handleCheck

Read-only status report. No pipeline advancement.

**Output format**:

```
[coordinator] Pipeline Status
[coordinator] Progress: <completed>/<total> (<percent>%)

[coordinator] Execution Graph:
  <visual representation of dependency graph with status icons>

  done=completed  >>>=running  o=pending  .=not created

[coordinator] Active Workers:
  > <subject> (<role>) - running <elapsed> [inner-loop: N/M tasks done]

[coordinator] Ready to spawn: <subjects>
[coordinator] Commands: 'resume' to advance | 'check' to refresh
```

**Icon mapping**: completed=done, in_progress=>>>, pending=o, not created=.

**Graph rendering**: Read dependency_graph from task-analysis.json, render each node with status icon. Show parallel branches side-by-side.

Then STOP.

---

### Handler: handleResume

Check active worker completion, process results, advance pipeline.

```
Load active_workers from session
  +- No active workers -> handleSpawnNext
  +- Has active workers -> check each:
      +- status = completed -> mark done, log
      +- status = in_progress -> still running, log
      +- other status -> worker failure -> reset to pending
      After processing:
        +- Some completed -> handleSpawnNext
        +- All still running -> report status -> STOP
        +- All failed -> handleSpawnNext (retry)
```

---

### Handler: handleSpawnNext

Find all ready tasks, spawn workers in background, update session, STOP.

```
Collect task states from TaskList()
  +- completedSubjects: status = completed
  +- inProgressSubjects: status = in_progress
  +- readySubjects: pending + all blockedBy in completedSubjects

Ready tasks found?
  +- NONE + work in progress -> report waiting -> STOP
  +- NONE + nothing in progress -> PIPELINE_COMPLETE -> Phase 5
  +- HAS ready tasks -> for each:
      +- Is task owner an Inner Loop role AND that role already has an active_worker?
      |   +- YES -> SKIP spawn (existing worker will pick it up via inner loop)
      |   +- NO -> normal spawn below
      +- TaskUpdate -> in_progress
      +- team_msg log -> task_unblocked (team=<session-id>, NOT team name)
      +- Spawn worker (see spawn tool call below)
      +- Add to session.active_workers
      Update session file -> output summary -> STOP
```

**Spawn worker tool call** (one per ready task):

```
Task({
  subagent_type: "general-purpose",
  description: "Spawn <role> worker for <subject>",
  team_name: <team-name>,
  name: "<role>",
  run_in_background: true,
  prompt: "<worker prompt from SKILL.md Coordinator Spawn Template>"
})
```

---

### Handler: handleAdapt

Handle mid-pipeline capability gap discovery. A worker reports `capability_gap` when it encounters work outside its scope.

**CONSTRAINT**: Maximum 5 worker roles per session (per coordinator/role.md). handleAdapt MUST enforce this limit.

```
Parse capability_gap message:
  +- Extract: gap_description, requesting_role, suggested_capability
  +- Validate gap is genuine:
      +- Check existing roles in session.roles -> does any role cover this?
      |   +- YES -> redirect: SendMessage to that role's owner -> STOP
      |   +- NO -> genuine gap, proceed to role generation
  +- CHECK ROLE COUNT LIMIT (MAX 5 ROLES):
      +- Count current roles in session.roles
      +- If count >= 5:
          +- Attempt to merge new capability into existing role:
              +- Find best-fit role by responsibility_type
              +- If merge possible:
                  +- Update existing role file with new capability
                  +- Create task assigned to existing role
                  +- Log via team_msg (type: warning, summary: "Capability merged into existing role")
                  +- STOP
              +- If merge NOT possible:
                  +- PAUSE session
                  +- Report to user:
                     "Role limit (5) reached. Cannot generate new role for: <gap_description>
                      Options:
                      1. Manually extend an existing role
                      2. Re-run team-coordinate with refined task to consolidate roles
                      3. Accept limitation and continue without this capability"
                  +- STOP
  +- Generate new role:
      1. Read specs/role-template.md
      2. Fill template with capability details from gap description
      3. Write new role file to <session-folder>/roles/<new-role>.md
      4. Add to session.roles[]
  +- Create new task(s):
      TaskCreate({
        subject: "<NEW-PREFIX>-001",
        owner: "<new-role>",
        description: "<gap_description>\nSession: <session-folder>\nInnerLoop: false",
        blockedBy: [<requesting task if sequential>],
        status: "pending"
      })
  +- Update team-session.json: add role, increment tasks_total
  +- Spawn new worker -> STOP
```

---

### Worker Failure Handling

When a worker has unexpected status (not completed, not in_progress):

1. Reset task -> pending via TaskUpdate
2. Log via team_msg (type: error)
3. Report to user: task reset, will retry on next resume

### Fast-Advance Failure Recovery

When coordinator detects a fast-advanced task has failed (task in_progress but no callback and worker gone):

```
handleCallback / handleResume detects:
  +- Task is in_progress (was fast-advanced by predecessor)
  +- No active_worker entry for this task
  +- Original fast-advancing worker has already completed and exited
  +- Resolution:
      1. TaskUpdate -> reset task to pending
      2. Remove stale active_worker entry (if any)
      3. Log via team_msg (type: error, summary: "Fast-advanced task <ID> failed, resetting for retry")
      4. -> handleSpawnNext (will re-spawn the task normally)
```

**Detection in handleResume**:

```
For each in_progress task in TaskList():
  +- Has matching active_worker? -> normal, skip
  +- No matching active_worker? -> orphaned (likely fast-advance failure)
      +- Check creation time: if > 5 minutes with no progress callback
      +- Reset to pending -> handleSpawnNext
```

**Prevention**: Fast-advance failures are self-healing. The coordinator reconciles orphaned tasks on every `resume`/`check` cycle.

### Consensus-Blocked Handling

When a worker reports `consensus_blocked` in its callback:

```
handleCallback receives message with consensus_blocked flag
  +- Extract: divergence_severity, blocked_round, action_recommendation
  +- Route by severity:
      |
      +- severity = HIGH
      |   +- Create REVISION task:
      |       +- Same role, same doc type, incremented suffix (e.g., DRAFT-001-R1)
      |       +- Description includes: divergence details + action items from discuss
      |       +- blockedBy: none (immediate execution)
      |       +- Max 1 revision per task (DRAFT-001 -> DRAFT-001-R1, no R2)
      |       +- If already revised once -> PAUSE, escalate to user
      |   +- Update session: mark task as "revised", log revision chain
      |
      +- severity = MEDIUM
      |   +- Proceed with warning: include divergence in next task's context
      |   +- Log action items to wisdom/issues.md
      |   +- Normal handleSpawnNext
      |
      +- severity = LOW
          +- Proceed normally: treat as consensus_reached with notes
          +- Normal handleSpawnNext
```

## Phase 4: Validation

| Check | Criteria |
|-------|----------|
| Session state consistent | active_workers matches TaskList in_progress tasks |
| No orphaned tasks | Every in_progress task has an active_worker entry |
| Dynamic roles valid | All task owners exist in session.roles |
| Completion detection | readySubjects=0 + inProgressSubjects=0 -> PIPELINE_COMPLETE |
| Fast-advance tracking | Detect tasks already in_progress via fast-advance, sync to active_workers |
| Fast-advance orphan check | in_progress tasks without active_worker entry -> reset to pending |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Session file not found | Error, suggest re-initialization |
| Worker callback from unknown role | Log info, scan for other completions |
| All workers still running on resume | Report status, suggest check later |
| Pipeline stall (no ready, no running) | Check for missing tasks, report to user |
| Fast-advance conflict | Coordinator reconciles, no duplicate spawns |
| Fast-advance task orphaned | Reset to pending, re-spawn via handleSpawnNext |
| Dynamic role file not found | Error, coordinator must regenerate from task-analysis |
| capability_gap from completed role | Validate gap, generate role if genuine |
| capability_gap when role limit (5) reached | Attempt merge into existing role, else pause for user |
| consensus_blocked HIGH | Create revision task (max 1) or pause for user |
| consensus_blocked MEDIUM | Proceed with warning, log to wisdom/issues.md |
