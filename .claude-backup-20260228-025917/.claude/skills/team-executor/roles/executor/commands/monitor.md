# Command: monitor

## Purpose

Event-driven pipeline coordination with Spawn-and-Stop pattern for team-executor. Adapted from team-coordinate monitor.md -- role names are read from `team-session.json#roles` instead of hardcoded. **handleAdapt is LIMITED**: only warns, cannot generate new roles.

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| SPAWN_MODE | background | All workers spawned via `Task(run_in_background: true)` |
| ONE_STEP_PER_INVOCATION | true | Executor does one operation then STOPS |
| FAST_ADVANCE_AWARE | true | Workers may skip executor for simple linear successors |
| ROLE_GENERATION | disabled | handleAdapt cannot generate new roles |

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Session file | `<session-folder>/team-session.json` | Yes |
| Task list | `TaskList()` | Yes |
| Active workers | session.active_workers[] | Yes |
| Role registry | session.roles[] | Yes |

**Dynamic role resolution**: Known worker roles are loaded from `session.roles[].name`. This is the same pattern as team-coordinate.

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
[executor] Pipeline Status
[executor] Progress: <completed>/<total> (<percent>%)

[executor] Execution Graph:
  <visual representation of dependency graph with status icons>

  done=completed  >>>=running  o=pending  .=not created

[executor] Active Workers:
  > <subject> (<role>) - running <elapsed> [inner-loop: N/M tasks done]

[executor] Ready to spawn: <subjects>
[executor] Commands: 'resume' to advance | 'check' to refresh
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
  +- NONE + nothing in progress -> PIPELINE_COMPLETE -> Phase 2
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
  prompt: "<worker prompt from SKILL.md Executor Spawn Template>"
})
```

---

### Handler: handleAdapt (LIMITED)

Handle mid-pipeline capability gap discovery. **UNLIKE team-coordinate, executor CANNOT generate new roles.**

```
Receive capability_gap from [<role>]
  +- Log via team_msg (type: warning)
  +- Report to user:
     "Capability gap detected: <gap_description>

      team-executor cannot generate new roles.
      Options:
        1. Continue with existing roles (worker will skip gap work)
        2. Re-run team-coordinate with --resume=<session> to extend session
        3. Manually add role to <session>/roles/ and retry"
  +- Extract: gap_description, requesting_role, suggested_capability
  +- Validate gap is genuine:
      +- Check existing roles in session.roles -> does any role cover this?
      |   +- YES -> redirect: SendMessage to that role's owner -> STOP
      |   +- NO -> genuine gap, report to user (cannot fix)
  +- Do NOT generate new role
  +- Continue execution with existing roles
```

**Key difference from team-coordinate**:
| Aspect | team-coordinate | team-executor |
|--------|-----------------|---------------|
| handleAdapt | Generates new role, creates tasks, spawns worker | Only warns, cannot fix |
| Recovery | Automatic | Manual (re-run team-coordinate) |

---

### Worker Failure Handling

When a worker has unexpected status (not completed, not in_progress):

1. Reset task -> pending via TaskUpdate
2. Log via team_msg (type: error)
3. Report to user: task reset, will retry on next resume

### Fast-Advance Failure Recovery

When executor detects a fast-advanced task has failed (task in_progress but no callback and worker gone):

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

**Prevention**: Fast-advance failures are self-healing. The executor reconciles orphaned tasks on every `resume`/`check` cycle.

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
| Session file not found | Error, suggest re-run team-coordinate |
| Worker callback from unknown role | Log info, scan for other completions |
| All workers still running on resume | Report status, suggest check later |
| Pipeline stall (no ready, no running) | Check for missing tasks, report to user |
| Fast-advance conflict | Executor reconciles, no duplicate spawns |
| Fast-advance task orphaned | Reset to pending, re-spawn via handleSpawnNext |
| Dynamic role file not found | Error, cannot proceed without role definition |
| capability_gap from role | WARN only, cannot generate new roles |
| consensus_blocked HIGH | Create revision task (max 1) or pause for user |
| consensus_blocked MEDIUM | Proceed with warning, log to wisdom/issues.md |
