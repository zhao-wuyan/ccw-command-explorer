# Command: Monitor

Event-driven pipeline coordination. Beat model: coordinator wake -> process -> spawn -> STOP.

## Constants

- SPAWN_MODE: background
- ONE_STEP_PER_INVOCATION: true
- FAST_ADVANCE_AWARE: true
- WORKER_AGENT: team-worker
- MAX_GC_ROUNDS: 3

## Handler Router

| Source | Handler |
|--------|---------|
| Message contains [architect], [developer], [tester], [reviewer] | handleCallback |
| "capability_gap" | handleAdapt |
| "check" or "status" | handleCheck |
| "resume" or "continue" | handleResume |
| All tasks completed | handleComplete |
| Default | handleSpawnNext |

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Session state | <session>/session.json | Yes |
| Task list | TaskList() | Yes |
| Trigger event | From Entry Router detection | Yes |
| Meta state | <session>/.msg/meta.json | Yes |
| Task ledger | <session>/task-ledger.json | No |

1. Load session.json for current state, pipeline mode, gc_round, max_gc_rounds
2. Run TaskList() to get current task statuses
3. Identify trigger event type from Entry Router

## Phase 3: Event Handlers

### handleCallback

Triggered when a worker sends completion message.

1. Parse message to identify role and task ID:

| Message Pattern | Role Detection |
|----------------|---------------|
| `[architect]` or task ID `DESIGN-*` | architect |
| `[developer]` or task ID `DEV-*` | developer |
| `[tester]` or task ID `VERIFY-*` | tester |
| `[reviewer]` or task ID `REVIEW-*` | reviewer |

2. Mark task as completed:

```
TaskUpdate({ taskId: "<task-id>", status: "completed" })
```

3. Record completion in session state and update task-ledger.json metrics

4. **Generator-Critic check** (when reviewer completes):
   - If completed task is REVIEW-* AND pipeline is sprint or multi-sprint:
   - Read review report for GC signal (critical_count, score)
   - Read session.json for gc_round

   | GC Signal | gc_round < max | Action |
   |-----------|----------------|--------|
   | review.critical_count > 0 OR review.score < 7 | Yes | Increment gc_round, create DEV-fix task blocked by this REVIEW, log `gc_loop_trigger` |
   | review.critical_count > 0 OR review.score < 7 | No (>= max) | Force convergence, accept with warning, log to wisdom/issues.md |
   | review.critical_count == 0 AND review.score >= 7 | - | Review passed, proceed to handleComplete check |

   - Log team_msg with type "gc_loop_trigger" or "task_unblocked"

5. Proceed to handleSpawnNext

### handleSpawnNext

Find and spawn the next ready tasks.

1. Scan task list for tasks where:
   - Status is "pending"
   - All blockedBy tasks have status "completed"

2. For each ready task, determine role from task prefix:

| Task Prefix | Role | Inner Loop |
|-------------|------|------------|
| DESIGN-* | architect | false |
| DEV-* | developer | true |
| VERIFY-* | tester | false |
| REVIEW-* | reviewer | false |

3. Spawn team-worker:

```
Agent({
  subagent_type: "team-worker",
  description: "Spawn <role> worker for <task-id>",
  team_name: "iterdev",
  name: "<role>",
  run_in_background: true,
  prompt: `## Role Assignment
role: <role>
role_spec: ~  or <project>/.claude/skills/team-iterdev/roles/<role>/role.md
session: <session-folder>
session_id: <session-id>
team_name: iterdev
requirement: <task-description>
inner_loop: <true|false>

Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 -> role-spec Phase 2-4 -> built-in Phase 5.`
})
```

4. **Parallel spawn rules**:

| Pipeline | Scenario | Spawn Behavior |
|----------|----------|---------------|
| Patch | DEV -> VERIFY | One worker at a time |
| Sprint | VERIFY + REVIEW both unblocked | Spawn BOTH in parallel |
| Sprint | Other stages | One worker at a time |
| Multi-Sprint | VERIFY + DEV-fix both unblocked | Spawn BOTH in parallel |
| Multi-Sprint | Other stages | One worker at a time |

5. STOP after spawning -- wait for next callback

### handleCheck

Output current pipeline status. Do NOT advance pipeline.

```
Pipeline Status (<pipeline-mode>):
  [DONE]  DESIGN-001  (architect)   -> design/design-001.md
  [DONE]  DEV-001     (developer)   -> code/dev-log.md
  [RUN]   VERIFY-001  (tester)      -> verifying...
  [RUN]   REVIEW-001  (reviewer)    -> reviewing...
  [WAIT]  DEV-fix     (developer)   -> blocked by REVIEW-001

GC Rounds: <gc_round>/<max_gc_rounds>
Sprint: <sprint_id>
Session: <session-id>
```

### handleResume

Resume pipeline after user pause or interruption.

1. Audit task list for inconsistencies:
   - Tasks stuck in "in_progress" -> reset to "pending"
   - Tasks with completed blockers but still "pending" -> include in spawn list
2. Proceed to handleSpawnNext

### handleComplete

Triggered when all pipeline tasks are completed.

**Completion check by mode**:

| Mode | Completion Condition |
|------|---------------------|
| patch | DEV-001 + VERIFY-001 completed |
| sprint | DESIGN-001 + DEV-001 + VERIFY-001 + REVIEW-001 (+ any GC tasks) completed |
| multi-sprint | All sprint tasks (+ any GC tasks) completed |

1. Verify all tasks completed via TaskList()
2. If any tasks not completed, return to handleSpawnNext
3. **Multi-sprint check**: If multi-sprint AND more sprints planned:
   - Record sprint metrics to .msg/meta.json sprint_history
   - Evaluate downgrade eligibility (velocity >= expected, review avg >= 8)
   - Pause for user confirmation before Sprint N+1
4. If all completed, transition to coordinator Phase 5 (Report + Completion Action)

## Phase 4: State Persistence

After every handler execution:

1. Update session.json with current state (gc_round, last event, active tasks)
2. Update task-ledger.json metrics (completed count, in_progress count, velocity)
3. Update .msg/meta.json gc_round if changed
4. Verify task list consistency
5. STOP and wait for next event
