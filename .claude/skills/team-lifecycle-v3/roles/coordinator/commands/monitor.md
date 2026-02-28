# Command: monitor

## Purpose

Event-driven pipeline coordination with Spawn-and-Stop pattern. Three wake-up sources drive pipeline advancement: worker callbacks (auto-advance), user `check` (status report), user `resume` (manual advance).

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| SPAWN_MODE | background | All workers spawned via `Task(run_in_background: true)` |
| ONE_STEP_PER_INVOCATION | true | Coordinator does one operation then STOPS |

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Session file | `<session-folder>/team-session.json` | Yes |
| Task list | `TaskList()` | Yes |
| Active workers | session.active_workers[] | Yes |
| Pipeline mode | session.mode | Yes |

## Phase 3: Handler Routing

### Wake-up Source Detection

Parse `$ARGUMENTS` to determine handler:

| Priority | Condition | Handler |
|----------|-----------|---------|
| 1 | Message contains `[<role-name>]` from known worker role | handleCallback |
| 2 | Contains "check" or "status" | handleCheck |
| 3 | Contains "resume", "continue", or "next" | handleResume |
| 4 | None of the above (initial spawn after dispatch) | handleSpawnNext |

Known worker roles: analyst, writer, discussant, planner, executor, tester, reviewer, explorer, architect, fe-developer, fe-qa.

---

### Handler: handleCallback

Worker completed a task. Verify completion, update state, auto-advance.

```
Receive callback from [<role>]
  ├─ Find matching active worker by role
  ├─ Task status = completed?
  │   ├─ YES → remove from active_workers → update session
  │   │   ├─ Handle checkpoints (see below)
  │   │   └─ → handleSpawnNext
  │   └─ NO → progress message, do not advance → STOP
  └─ No matching worker found
      ├─ Scan all active workers for completed tasks
      ├─ Found completed → process each → handleSpawnNext
      └─ None completed → STOP
```

---

### Handler: handleCheck

Read-only status report. No pipeline advancement.

**Output format**:

```
[coordinator] Pipeline Status
[coordinator] Mode: <mode> | Progress: <completed>/<total> (<percent>%)

[coordinator] Execution Graph:
  Spec Phase:  (if applicable)
    [<icon> RESEARCH-001] → [<icon> DISCUSS-001] → ...
  Impl Phase:  (if applicable)
    [<icon> PLAN-001]
      ├─ BE: [<icon> IMPL-001] → [<icon> TEST-001] → [<icon> REVIEW-001]
      └─ FE: [<icon> DEV-FE-001] → [<icon> QA-FE-001]

  done=completed  >>>=running  o=pending  .=not created

[coordinator] Active Workers:
  > <subject> (<role>) - running <elapsed>

[coordinator] Ready to spawn: <subjects>
[coordinator] Commands: 'resume' to advance | 'check' to refresh
```

**Icon mapping**: completed=done, in_progress=>>>, pending=o, not created=.

Then STOP.

---

### Handler: handleResume

Check active worker completion, process results, advance pipeline.

```
Load active_workers from session
  ├─ No active workers → handleSpawnNext
  └─ Has active workers → check each:
      ├─ status = completed → mark done, log
      ├─ status = in_progress → still running, log
      └─ other status → worker failure → reset to pending
      After processing:
        ├─ Some completed → handleSpawnNext
        ├─ All still running → report status → STOP
        └─ All failed → handleSpawnNext (retry)
```

---

### Handler: handleSpawnNext

Find all ready tasks, spawn workers in background, update session, STOP.

```
Collect task states from TaskList()
  ├─ completedSubjects: status = completed
  ├─ inProgressSubjects: status = in_progress
  └─ readySubjects: pending + all blockedBy in completedSubjects

Ready tasks found?
  ├─ NONE + work in progress → report waiting → STOP
  ├─ NONE + nothing in progress → PIPELINE_COMPLETE → Phase 5
  └─ HAS ready tasks → for each:
      ├─ TaskUpdate → in_progress
      ├─ team_msg log → task_unblocked
      ├─ Spawn worker (see tool call below)
      └─ Add to session.active_workers
      Update session file → output summary → STOP
```

**Spawn worker tool call** (one per ready task):

```bash
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

### Checkpoints

| Completed Task | Mode Condition | Action |
|---------------|----------------|--------|
| DISCUSS-006 | full-lifecycle or full-lifecycle-fe | Output "SPEC PHASE COMPLETE" checkpoint, pause for user review before impl |

---

### Worker Failure Handling

When a worker has unexpected status (not completed, not in_progress):

1. Reset task → pending via TaskUpdate
2. Log via team_msg (type: error)
3. Report to user: task reset, will retry on next resume

## Phase 4: Validation

| Check | Criteria |
|-------|----------|
| Session state consistent | active_workers matches TaskList in_progress tasks |
| No orphaned tasks | Every in_progress task has an active_worker entry |
| Pipeline completeness | All expected tasks exist per mode |
| Completion detection | readySubjects=0 + inProgressSubjects=0 → PIPELINE_COMPLETE |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Session file not found | Error, suggest re-initialization |
| Worker callback from unknown role | Log info, scan for other completions |
| All workers still running on resume | Report status, suggest check later |
| Pipeline stall (no ready, no running) | Check for missing tasks, report to user |
