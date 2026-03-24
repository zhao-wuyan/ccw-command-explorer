# Command: Monitor

Synchronous pipeline coordination using spawn_agent + wait_agent.

## Constants

- WORKER_AGENT: team_worker
- MAX_GC_ROUNDS: 3

## Handler Router

| Source | Handler |
|--------|---------|
| "capability_gap" | handleAdapt |
| "check" or "status" | handleCheck |
| "resume" or "continue" | handleResume |
| All tasks completed | handleComplete |
| Default | handleSpawnNext |

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Session state | tasks.json | Yes |
| Trigger event | From Entry Router detection | Yes |
| Meta state | <session>/.msg/meta.json | Yes |

1. Load tasks.json for current state, pipeline_mode, gc_round, max_gc_rounds
2. Read tasks from tasks.json to get current task statuses
3. Identify trigger event type from Entry Router

## Phase 3: Event Handlers

### handleCallback

Triggered when a worker completes (wait_agent returns).

1. Determine role from completed task prefix:

| Task Prefix | Role Detection |
|-------------|---------------|
| `DESIGN-*` | architect |
| `DEV-*` | developer |
| `VERIFY-*` | tester |
| `REVIEW-*` | reviewer |

2. Mark task as completed in tasks.json:

```
state.tasks[taskId].status = 'completed'
```

3. Record completion in session state and update metrics

4. **Generator-Critic check** (when reviewer completes):
   - If completed task is REVIEW-* AND pipeline is sprint or multi-sprint:
   - Read review report for GC signal (critical_count, score)
   - Read tasks.json for gc_round

   | GC Signal | gc_round < max | Action |
   |-----------|----------------|--------|
   | review.critical_count > 0 OR review.score < 7 | Yes | Increment gc_round, create DEV-fix task in tasks.json with deps on this REVIEW, log `gc_loop_trigger` |
   | review.critical_count > 0 OR review.score < 7 | No (>= max) | Force convergence, accept with warning, log to wisdom/issues.md |
   | review.critical_count == 0 AND review.score >= 7 | - | Review passed, proceed to handleComplete check |

   - Log team_msg with type "gc_loop_trigger" or "task_unblocked"

5. Proceed to handleSpawnNext

### handleSpawnNext

Find and spawn the next ready tasks.

1. Read tasks.json, find tasks where:
   - Status is "pending"
   - All deps tasks have status "completed"

2. For each ready task, determine role from task prefix:

| Task Prefix | Role | Inner Loop |
|-------------|------|------------|
| DESIGN-* | architect | false |
| DEV-* | developer | true |
| VERIFY-* | tester | false |
| REVIEW-* | reviewer | false |

3. Spawn team_worker:

```javascript
// 1) Update status in tasks.json
state.tasks[taskId].status = 'in_progress'

// 2) Spawn worker
const agentId = spawn_agent({
  agent_type: "team_worker",
  items: [
    { type: "text", text: `## Role Assignment
role: ${role}
role_spec: ${skillRoot}/roles/${role}/role.md
session: ${sessionFolder}
session_id: ${sessionId}
requirement: ${taskDescription}
inner_loop: ${innerLoop}` },

    { type: "text", text: `Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 -> role-spec Phase 2-4 -> built-in Phase 5.` }
  ]
})

// 3) Track agent
state.active_agents[taskId] = { agentId, role, started_at: now }

// 4) Wait for completion
wait_agent({ ids: [agentId] })

// 5) Collect results and update tasks.json
state.tasks[taskId].status = 'completed'
delete state.active_agents[taskId]
```

4. **Parallel spawn rules**:

| Pipeline | Scenario | Spawn Behavior |
|----------|----------|---------------|
| Patch | DEV -> VERIFY | One worker at a time |
| Sprint | VERIFY + REVIEW both unblocked | Spawn BOTH in parallel, wait_agent for both |
| Sprint | Other stages | One worker at a time |
| Multi-Sprint | VERIFY + DEV-fix both unblocked | Spawn BOTH in parallel, wait_agent for both |
| Multi-Sprint | Other stages | One worker at a time |

5. STOP after processing -- wait for next event

### handleCheck

Output current pipeline status from tasks.json. Do NOT advance pipeline.

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

1. Audit tasks.json for inconsistencies:
   - Tasks stuck in "in_progress" -> reset to "pending"
   - Tasks with completed deps but still "pending" -> include in spawn list
2. Proceed to handleSpawnNext

### handleComplete

Triggered when all pipeline tasks are completed.

**Completion check by mode**:

| Mode | Completion Condition |
|------|---------------------|
| patch | DEV-001 + VERIFY-001 completed |
| sprint | DESIGN-001 + DEV-001 + VERIFY-001 + REVIEW-001 (+ any GC tasks) completed |
| multi-sprint | All sprint tasks (+ any GC tasks) completed |

1. Verify all tasks completed in tasks.json
2. If any tasks not completed, return to handleSpawnNext
3. **Multi-sprint check**: If multi-sprint AND more sprints planned:
   - Record sprint metrics to .msg/meta.json sprint_history
   - Evaluate downgrade eligibility (velocity >= expected, review avg >= 8)
   - Pause for user confirmation before Sprint N+1
4. If all completed, transition to coordinator Phase 5 (Report + Completion Action)

## Phase 4: State Persistence

After every handler execution:

1. Update tasks.json with current state (gc_round, last event, active tasks)
2. Update .msg/meta.json gc_round if changed
3. Verify task list consistency
4. STOP and wait for next event
