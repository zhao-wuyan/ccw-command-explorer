# Command: monitor

## Purpose

Event-driven pipeline coordination with Spawn-and-Stop pattern. v5: spawns team-worker agents instead of general-purpose. Three wake-up sources: worker callbacks, user `check`, user `resume`.

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| SPAWN_MODE | background | All workers spawned via `Task(run_in_background: true)` |
| ONE_STEP_PER_INVOCATION | true | Coordinator does one operation then STOPS |
| FAST_ADVANCE_AWARE | true | Workers may skip coordinator for simple linear successors |
| WORKER_AGENT | team-worker | All workers are team-worker agents |

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Session file | `<session-folder>/team-session.json` | Yes |
| Task list | `TaskList()` | Yes |
| Active workers | session.active_workers[] | Yes |
| Pipeline mode | session.mode | Yes |

## Phase 3: Handler Routing

### Wake-up Source Detection

| Priority | Condition | Handler |
|----------|-----------|---------|
| 1 | Message contains `[<role-name>]` from known worker role | handleCallback |
| 2 | Contains "check" or "status" | handleCheck |
| 3 | Contains "resume", "continue", or "next" | handleResume |
| 4 | None of the above (initial spawn) | handleSpawnNext |
| 5 | Contains "revise" + task ID | handleRevise |
| 6 | Contains "feedback" + text | handleFeedback |
| 7 | Contains "recheck" | handleRecheck |
| 8 | Contains "improve" | handleImprove |

Known worker roles: analyst, writer, planner, executor, tester, reviewer, architect, fe-developer, fe-qa.

---

### Handler: handleCallback

```
Receive callback from [<role>]
  +- Find matching active worker by role
  +- Progress update (not final)?
  |   +- YES -> Update session, do NOT remove from active_workers -> STOP
  +- Task status = completed?
  |   +- YES -> remove from active_workers -> update session
  |   |   +- Handle checkpoints
  |   |   +- -> handleSpawnNext
  |   +- NO -> progress message -> STOP
  +- No matching worker found
      +- Scan all active workers for completed tasks
      +- Found completed -> process -> handleSpawnNext
      +- None completed -> STOP
```

**Fast-advance reconciliation**: When processing any callback or resume:
1. Read recent `fast_advance` messages from team_msg (type="fast_advance")
2. For each: add spawned successor to `active_workers` if not already present
3. Check if expected next task is already `in_progress` (fast-advanced)
4. If yes -> skip spawning (already running)
5. If no -> normal handleSpawnNext

---

### Handler: handleCheck

Read-only status report. No advancement.

```
[coordinator] Pipeline Status (v5)
[coordinator] Mode: <mode> | Progress: <completed>/<total> (<percent>%)

[coordinator] Execution Graph:
  Spec Phase:
    [<icon> RESEARCH-001(+D1)] -> [<icon> DRAFT-001(+D2)] -> ...
  Impl Phase:
    [<icon> PLAN-001]
      +- BE: [<icon> IMPL-001] -> [<icon> TEST-001] -> [<icon> REVIEW-001]
      +- FE: [<icon> DEV-FE-001] -> [<icon> QA-FE-001]

  done=completed  >>>=running  o=pending  .=not created

[coordinator] Active Workers:
  > <subject> (<role>) - running <elapsed>

[coordinator] Ready to spawn: <subjects>
[coordinator] Commands: 'resume' to advance | 'check' to refresh
```

Then STOP.

---

### Handler: handleResume

```
Load active_workers
  +- No active workers -> handleSpawnNext
  +- Has active workers -> check each:
      +- completed -> mark done, log
      +- in_progress -> still running
      +- other -> worker failure -> reset to pending
      After:
        +- Some completed -> handleSpawnNext
        +- All running -> report status -> STOP
        +- All failed -> handleSpawnNext (retry)
```

---

### Handler: handleSpawnNext

```
Collect task states from TaskList()
  +- readySubjects: pending + all blockedBy completed
  +- NONE + work in progress -> report waiting -> STOP
  +- NONE + nothing running -> PIPELINE_COMPLETE -> Phase 5
  +- HAS ready tasks -> for each:
      +- Inner Loop role AND already has active_worker?
      |   +- YES -> SKIP spawn (existing worker picks up via inner loop)
      |   +- NO -> spawn below
      +- TaskUpdate -> in_progress
      +- team_msg log -> task_unblocked
      +- Spawn team-worker:
         Task({
           subagent_type: "team-worker",
           description: "Spawn <role> worker for <subject>",
           team_name: <team-name>,
           name: "<role>",
           run_in_background: true,
           prompt: `## Role Assignment
role: <role>
role_spec: .claude/skills/team-lifecycle-v5/role-specs/<role>.md
session: <session-folder>
session_id: <session-id>
team_name: <team-name>
requirement: <task-description>
inner_loop: <true|false>`
         })
      +- Add to session.active_workers
      Update session -> output summary -> STOP
```

---

### Handler: handleRevise

```
Parse: revise <TASK-ID> [feedback-text]
  +- Validate TASK-ID exists and is completed
  +- Create revision task (see dispatch.md Revision Task Template)
  +- Cascade downstream completed tasks
  +- Spawn worker for first revision task -> STOP
```

### Handler: handleFeedback

```
Parse: feedback <text>
  +- Determine pipeline state -> find affected task
  +- Write feedback to wisdom/decisions.md
  +- Create revision chain
  +- Spawn worker -> STOP
```

### Handler: handleRecheck

```
Parse: recheck
  +- Create QUALITY-001-R1 task
  +- Spawn reviewer -> STOP
```

### Handler: handleImprove

```
Parse: improve [dimension]
  +- Read readiness-report.md -> extract dimension scores
  +- Select target dimension (specified or lowest)
  +- Create IMPROVE-<dimension>-001 task
  +- Create QUALITY-001-R1 (blockedBy: IMPROVE task)
  +- Spawn writer -> STOP
```

---

### Checkpoints

| Completed Task | Mode Condition | Action |
|---------------|----------------|--------|
| QUALITY-001 | full-lifecycle or full-lifecycle-fe | Read readiness-report.md -> checkpoint template -> pause |

### Worker Failure Handling

1. Reset task -> pending via TaskUpdate
2. Log via team_msg (type: error)
3. Report to user

### Fast-Advance Failure Recovery

```
Detect orphaned in_progress task (no active_worker):
  +- Check creation time: if > 5 min with no progress
  +- Reset to pending -> handleSpawnNext
```

### Fast-Advance State Sync

On every coordinator wake (handleCallback, handleResume, handleCheck):
1. Read team_msg entries with `type="fast_advance"` since last coordinator wake
2. For each entry: sync `active_workers` with the spawned successor
3. This ensures coordinator's state reflects fast-advance decisions even before the successor's callback arrives

### Consensus-Blocked Handling

```
handleCallback receives consensus_blocked:
  +- severity = HIGH
  |   +- DISCUSS-006? -> PAUSE for user
  |   +- Other -> Create REVISION task (max 1 per task)
  +- severity = MEDIUM -> proceed with warning, log to wisdom/issues.md
  +- severity = LOW -> proceed normally
```

## Phase 4: Validation

| Check | Criteria |
|-------|----------|
| Session state consistent | active_workers matches in_progress tasks |
| No orphaned tasks | Every in_progress has active_worker |
| Pipeline completeness | All expected tasks exist |
| Fast-advance tracking | Detect already-running tasks, sync active_workers |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Session file not found | Error, suggest re-initialization |
| Unknown role callback | Log, scan for other completions |
| All workers running on resume | Report status, suggest check later |
| Pipeline stall | Check missing tasks, report |
| Fast-advance orphan | Reset to pending, re-spawn |
| consensus_blocked HIGH | Revision or pause |
