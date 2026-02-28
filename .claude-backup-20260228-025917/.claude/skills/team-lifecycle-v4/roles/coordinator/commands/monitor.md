# Command: monitor

## Purpose

Event-driven pipeline coordination with Spawn-and-Stop pattern. v4 enhanced with worker fast-advance awareness. Three wake-up sources: worker callbacks (auto-advance), user `check` (status report), user `resume` (manual advance).

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
| 5 | Contains "revise" + task ID pattern | handleRevise |
| 6 | Contains "feedback" + quoted/unquoted text | handleFeedback |
| 7 | Contains "recheck" | handleRecheck |
| 8 | Contains "improve" (optionally + dimension name) | handleImprove |

Known worker roles: analyst, writer, planner, executor, tester, reviewer, architect, fe-developer, fe-qa.

> **Note**: `discussant` and `explorer` are no longer worker roles in v4. They are subagents called inline by produce roles.

---

### Handler: handleCallback

Worker completed a task. Verify completion, update state, auto-advance.

```
Receive callback from [<role>]
  +- Find matching active worker by role
  +- Is this a progress update (not final)? (Inner Loop intermediate task completion)
  |   +- YES -> Update session state, do NOT remove from active_workers -> STOP
  +- Task status = completed?
  |   +- YES -> remove from active_workers -> update session
  |   |   +- Handle checkpoints (see below)
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
[coordinator] Pipeline Status (v4)
[coordinator] Mode: <mode> | Progress: <completed>/<total> (<percent>%)

[coordinator] Execution Graph:
  Spec Phase: (if applicable)
    [<icon> RESEARCH-001(+D1)] -> [<icon> DRAFT-001(+D2)] -> [<icon> DRAFT-002(+D3)]
    -> [<icon> DRAFT-003(+D4)] -> [<icon> DRAFT-004(+D5)] -> [<icon> QUALITY-001(+D6)]
  Impl Phase: (if applicable)
    [<icon> PLAN-001]
      +- BE: [<icon> IMPL-001] -> [<icon> TEST-001] -> [<icon> REVIEW-001]
      +- FE: [<icon> DEV-FE-001] -> [<icon> QA-FE-001]

  done=completed  >>>=running  o=pending  .=not created

[coordinator] Active Workers:
  > <subject> (<role>) - running <elapsed> [inner-loop: N/M tasks done]

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
      +- team_msg log -> task_unblocked
      +- Spawn worker (see tool call below)
      +- Add to session.active_workers
      Update session file -> output summary -> STOP
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

### Handler: handleRevise

User requests targeted revision of a completed task.

```
Parse: revise <TASK-ID> [feedback-text]
  +- Validate TASK-ID exists and is completed
  |   +- NOT completed -> error: "Task <ID> is not completed, cannot revise"
  +- Determine role and doc type from TASK-ID prefix
  +- Create revision task:
  |   TaskCreate({
  |     subject: "<TASK-ID>-R1",
  |     owner: "<same-role>",
  |     description: "User-requested revision of <TASK-ID>.\n
  |       Session: <session-folder>\n
  |       Original artifact: <artifact-path>\n
  |       User feedback: <feedback-text or 'general revision requested'>\n
  |       Revision scope: targeted\n
  |       InlineDiscuss: <same-discuss-round>\n
  |       InnerLoop: true",
  |     status: "pending"
  |   })
  +- Cascade check (auto):
  |   +- Find all completed tasks downstream of TASK-ID
  |   +- For each downstream completed task -> create <ID>-R1
  |   +- Chain blockedBy: each R1 blockedBy its predecessor R1
  |   +- Always end with QUALITY-001-R1 (recheck)
  +- Spawn worker for first revision task -> STOP
```

**Cascade Rules**:

| Revised Task | Downstream (auto-cascade) |
|-------------|--------------------------|
| RESEARCH-001 | DRAFT-001~004-R1, QUALITY-001-R1 |
| DRAFT-001 | DRAFT-002~004-R1, QUALITY-001-R1 |
| DRAFT-002 | DRAFT-003~004-R1, QUALITY-001-R1 |
| DRAFT-003 | DRAFT-004-R1, QUALITY-001-R1 |
| DRAFT-004 | QUALITY-001-R1 |
| QUALITY-001 | (no cascade, just recheck) |

**Cascade depth control**: Only cascade tasks that are already completed. Pending/in_progress tasks will naturally pick up changes.

---

### Handler: handleFeedback

User injects feedback into pipeline context.

```
Parse: feedback <text>
  +- Determine pipeline state:
  |   +- Spec phase in progress -> find earliest affected DRAFT task
  |   +- Spec phase complete (at checkpoint) -> analyze full impact
  |   +- Impl phase in progress -> log to wisdom/decisions.md, no revision
  +- Analyze feedback impact:
  |   +- Keyword match against doc types:
  |       "vision/market/MVP/scope" -> DRAFT-001 (product-brief)
  |       "requirement/feature/NFR/user story" -> DRAFT-002 (requirements)
  |       "architecture/ADR/component/tech stack" -> DRAFT-003 (architecture)
  |       "epic/story/sprint/priority" -> DRAFT-004 (epics)
  |   +- If unclear -> default to earliest incomplete or most recent completed
  +- Write feedback to wisdom/decisions.md
  +- Create revision chain (same as handleRevise from determined start point)
  +- Spawn worker -> STOP
```

---

### Handler: handleRecheck

Re-run quality check after manual edits or revisions.

```
Parse: recheck
  +- Validate QUALITY-001 exists and is completed
  |   +- NOT completed -> error: "Quality check hasn't run yet"
  +- Create recheck task:
  |   TaskCreate({
  |     subject: "QUALITY-001-R1",
  |     owner: "reviewer",
  |     description: "Re-run spec quality check.\n
  |       Session: <session-folder>\n
  |       Scope: full recheck\n
  |       InlineDiscuss: DISCUSS-006",
  |     status: "pending"
  |   })
  +- Spawn reviewer -> STOP
```

---

### Handler: handleImprove

Quality-driven improvement based on readiness report dimensions.

```
Parse: improve [dimension]
  +- Read <session>/spec/readiness-report.md
  |   +- NOT found -> error: "No readiness report. Run quality check first."
  +- Extract dimension scores
  +- Select target:
  |   +- dimension specified -> use it
  |   +- not specified -> pick lowest scoring dimension
  +- Map dimension to improvement strategy:
  |
  |   | Dimension | Strategy | Target Tasks |
  |   |-----------|----------|-------------|
  |   | completeness | Fill missing sections | DRAFT with missing sections |
  |   | consistency | Unify terminology/format | All DRAFT (batch) |
  |   | traceability | Strengthen Goals->Reqs->Arch->Stories chain | DRAFT-002, DRAFT-003, DRAFT-004 |
  |   | depth | Enhance AC/ADR detail | Weakest sub-dimension's DRAFT |
  |   | coverage | Add uncovered requirements | DRAFT-002 |
  |
  +- Create improvement task:
  |   TaskCreate({
  |     subject: "IMPROVE-<dimension>-001",
  |     owner: "writer",
  |     description: "Quality improvement: <dimension>.\n
  |       Session: <session-folder>\n
  |       Current score: <X>%\n
  |       Target: 80%\n
  |       Weak areas: <from readiness-report>\n
  |       Strategy: <from table>\n
  |       InnerLoop: true",
  |     status: "pending"
  |   })
  +- Create QUALITY-001-R1 (blockedBy: IMPROVE task)
  +- Spawn writer -> STOP
```

---

### Checkpoints

| Completed Task | Mode Condition | Action |
|---------------|----------------|--------|
| QUALITY-001 | full-lifecycle or full-lifecycle-fe | Read readiness-report.md -> extract gate + scores -> output Checkpoint Output Template (see SKILL.md) -> pause for user action |

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

**Prevention**: Fast-advance failures are self-healing. The coordinator reconciles orphaned tasks on every `resume`/`check` cycle. No manual intervention required unless the same task fails repeatedly (3+ resets -> escalate to user).

### Consensus-Blocked Handling

When a produce role reports `consensus_blocked` in its callback:

```
handleCallback receives message with consensus_blocked flag
  +- Extract: divergence_severity, blocked_round, action_recommendation
  +- Route by severity:
      |
      +- severity = HIGH (rating <= 2 or critical risk)
      |   +- Is this DISCUSS-006 (final sign-off)?
      |   |   +- YES -> PAUSE: output warning, wait for user `resume` with decision
      |   |   +- NO -> Create REVISION task:
      |   |       +- Same role, same doc type, incremented suffix (e.g., DRAFT-001-R1)
      |   |       +- Description includes: divergence details + action items from discuss
      |   |       +- blockedBy: none (immediate execution)
      |   |       +- Max 1 revision per task (DRAFT-001 -> DRAFT-001-R1, no R2)
      |   |       +- If already revised once -> PAUSE, escalate to user
      |   +- Update session: mark task as "revised", log revision chain
      |
      +- severity = MEDIUM (rating spread or single low rating)
      |   +- Proceed with warning: include divergence in next task's context
      |   +- Log action items to wisdom/issues.md for downstream awareness
      |   +- Normal handleSpawnNext
      |
      +- severity = LOW (minor suggestions only)
          +- Proceed normally: treat as consensus_reached with notes
          +- Normal handleSpawnNext
```

**Revision task template** (for HIGH severity):

```
TaskCreate({
  subject: "<ORIGINAL-ID>-R1",
  description: "Revision of <ORIGINAL-ID>: address consensus-blocked divergences.\n
    Session: <session-folder>\n
    Original artifact: <artifact-path>\n
    Divergences:\n<divergence-details>\n
    Action items:\n<action-items-from-discuss>\n
    InlineDiscuss: <same-round-id>",
  owner: "<same-role>",
  status: "pending"
})
```

## Phase 4: Validation

| Check | Criteria |
|-------|----------|
| Session state consistent | active_workers matches TaskList in_progress tasks |
| No orphaned tasks | Every in_progress task has an active_worker entry |
| Pipeline completeness | All expected tasks exist per mode |
| Completion detection | readySubjects=0 + inProgressSubjects=0 -> PIPELINE_COMPLETE |
| Fast-advance tracking | Detect tasks already in_progress via fast-advance, sync to active_workers |
| Fast-advance orphan check | in_progress tasks without active_worker entry -> reset to pending |
| Consensus-blocked routing | HIGH -> revision/pause, MEDIUM -> warn+proceed, LOW -> proceed |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Session file not found | Error, suggest re-initialization |
| Worker callback from unknown role | Log info, scan for other completions |
| All workers still running on resume | Report status, suggest check later |
| Pipeline stall (no ready, no running) | Check for missing tasks, report to user |
| Fast-advance conflict | Coordinator reconciles, no duplicate spawns |
| Fast-advance task orphaned | Reset to pending, re-spawn via handleSpawnNext |
| consensus_blocked HIGH | Create revision task (max 1) or pause for user |
| consensus_blocked MEDIUM | Proceed with warning, log to wisdom/issues.md |
| Revision task also blocked | Escalate to user, pause pipeline |
