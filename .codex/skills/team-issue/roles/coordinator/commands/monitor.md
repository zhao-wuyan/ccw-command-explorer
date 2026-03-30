# Monitor Pipeline

Event-driven pipeline coordination. Beat model: coordinator wake -> process -> spawn -> STOP.

## Constants

- SPAWN_MODE: spawn_agent
- ONE_STEP_PER_INVOCATION: true
- FAST_ADVANCE_AWARE: true
- WORKER_AGENT: team_worker
- MAX_FIX_CYCLES: 2

## Handler Router

| Source | Handler |
|--------|---------|
| Message contains [explorer], [planner], [reviewer], [integrator], [implementer] | handleCallback |
| "consensus_blocked" | handleConsensus |
| "capability_gap" | handleAdapt |
| "check" or "status" | handleCheck |
| "resume" or "continue" | handleResume |
| All tasks completed | handleComplete |
| Default | handleSpawnNext |

## handleCallback

Worker completed. Process and advance.

1. Parse message to identify role and task ID:

| Message Pattern | Role Detection |
|----------------|---------------|
| `[explorer]` or task ID `EXPLORE-*` | explorer |
| `[planner]` or task ID `SOLVE-*` | planner |
| `[reviewer]` or task ID `AUDIT-*` | reviewer |
| `[integrator]` or task ID `MARSHAL-*` | integrator |
| `[implementer]` or task ID `BUILD-*` | implementer |

2. Mark task as completed: Read tasks.json, update matching entry status to "completed", write back
3. Record completion in session state

4. **Review gate check** (when reviewer completes):
   - If completed task is AUDIT-* AND pipeline is full or batch:
   - Read audit report from `<session>/audits/audit-report.json`
   - Read .msg/meta.json for fix_cycles

   | Verdict | fix_cycles < max | Action |
   |---------|-----------------|--------|
   | rejected | Yes | Increment fix_cycles, create SOLVE-fix + AUDIT re-review tasks (add to tasks.json per dispatch.md Review-Fix Cycle), proceed to handleSpawnNext |
   | rejected | No (>= max) | Force proceed -- log warning, unblock MARSHAL |
   | concerns | - | Log concerns, proceed to MARSHAL (non-blocking) |
   | approved | - | Proceed to MARSHAL via handleSpawnNext |

   - Log team_msg with type "review_result" or "fix_required"
   - If force proceeding past rejection, mark skipped fix tasks as completed (skip)

5. **Deferred BUILD task creation** (when integrator completes):
   - If completed task is MARSHAL-* AND pipeline is batch:
   - Read execution queue from `.workflow/issues/queue/execution-queue.json`
   - Parse parallel_groups to determine BUILD task count M
   - Create BUILD-001..M tasks dynamically (add to tasks.json per dispatch.md Batch Pipeline BUILD section)
   - Proceed to handleSpawnNext

6. Close completed agent: `close_agent({ target: <agentId> })`
7. Proceed to handleSpawnNext

## handleCheck

Read-only status report, then STOP.

```
[coordinator] Pipeline Status (<pipeline-mode>)
[coordinator] Progress: <done>/<total> (<pct>%)
[coordinator] Active: <workers with elapsed time>
[coordinator] Ready: <pending tasks with resolved deps>
[coordinator] Fix Cycles: <fix_cycles>/<max_fix_cycles>
[coordinator] Commands: 'resume' to advance | 'check' to refresh
```

## handleResume

**Agent Health Check** (v4):
```
// Verify actual running agents match session state
const runningAgents = list_agents({})
// For each active_agent in tasks.json:
//   - If agent NOT in runningAgents -> agent crashed
//   - Reset that task to pending, remove from active_agents
// This prevents stale agent references from blocking the pipeline
```

1. Audit task list: Tasks stuck in "in_progress" -> reset to "pending"
2. Proceed to handleSpawnNext

## handleSpawnNext

Find ready tasks, spawn workers, STOP.

1. Collect: completedSubjects, inProgressSubjects, readySubjects
2. No ready + work in progress -> report waiting, STOP
3. No ready + nothing in progress -> handleComplete
4. Has ready -> for each:
   a. Update tasks.json entry status -> "in_progress"
   b. team_msg log -> task_unblocked
   c. Spawn team_worker:
      ```
      const agentId = spawn_agent({
        agent_type: "team_worker",
        task_name: taskId,  // e.g., "EXPLORE-001" — enables named targeting
        items: [{ type: "text", text: `## Role Assignment
      role: <role>
      role_spec: ~  or <project>/.codex/skills/team-issue/roles/<role>/role.md
      session: <session-folder>
      session_id: <session-id>
      team_name: issue
      requirement: <task-description>
      inner_loop: false

      Read role_spec file to load Phase 2-4 domain instructions.
      Execute built-in Phase 1 (task discovery) -> role Phase 2-4 -> built-in Phase 5 (report).` }]
      })
      ```
   d. Collect results: `wait_agent({ targets: [taskId], timeout_ms: 900000 })`
   e. Read discoveries from output files
   f. Update tasks.json with results
   g. Close agent: `close_agent({ target: taskId })`  // Use task_name, not agentId

5. Parallel spawn rules:

| Pipeline | Scenario | Spawn Behavior |
|----------|----------|---------------|
| Quick | All stages | One worker at a time |
| Full | All stages | One worker at a time |
| Batch | EXPLORE-001..N unblocked | Spawn ALL N explorer workers in parallel (max 5) |
| Batch | BUILD-001..M unblocked | Spawn ALL M implementer workers in parallel (max 3) |
| Batch | Other stages | One worker at a time |

**Parallel spawn** (Batch mode with multiple ready tasks for same role):
```
const agentIds = []
for (const task of readyTasks) {
  agentIds.push(spawn_agent({
    agent_type: "team_worker",
    task_name: task.id,  // e.g., "EXPLORE-001" — enables named targeting
    items: [{ type: "text", text: `## Role Assignment
role: <role>
role_spec: ~  or <project>/.codex/skills/team-issue/roles/<role>/role.md
session: <session-folder>
session_id: <session-id>
team_name: issue
requirement: <task-description>
agent_name: <role>-<N>
inner_loop: false

Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 (task discovery, owner=<role>-<N>) -> role Phase 2-4 -> built-in Phase 5 (report).` }]
  }))
}
// Use task_name for stable targeting (v4)
const taskNames = readyTasks.map(t => t.id)
const results = wait_agent({ targets: taskNames, timeout_ms: 900000 })
if (results.timed_out) {
  for (const taskId of taskNames) { state.tasks[taskId].status = 'timed_out'; close_agent({ target: taskId }) }
} else {
  // Process results, close agents
  for (const taskId of taskNames) { close_agent({ target: taskId }) }
}
```

**Cross-Agent Supplementary Context** (v4):

When spawning workers in a later pipeline phase, send upstream results as supplementary context to already-running workers:

```
// Example: Send exploration results to running planner
send_message({
  target: "<running-agent-task-name>",
  items: [{ type: "text", text: `## Supplementary Context\n${upstreamFindings}` }]
})
// Note: send_message queues info without interrupting the agent's current work
```

Use `send_message` (not `assign_task`) for supplementary info that enriches but doesn't redirect the agent's current task.

6. Update session, output summary, STOP

## handleComplete

**Cleanup Verification** (v4):
```
// Verify all agents are properly closed
const remaining = list_agents({})
// If any team agents still running -> close_agent each
// Ensures clean session shutdown
```

Pipeline done. Generate report and completion action.

Completion check by mode:
| Mode | Completion Condition |
|------|---------------------|
| quick | All 4 tasks completed |
| full | All 5 tasks (+ any fix cycle tasks) completed |
| batch | All N EXPLORE + N SOLVE + 1 AUDIT + 1 MARSHAL + M BUILD (+ any fix cycle tasks) completed |

1. Verify all tasks completed via reading tasks.json
2. If any tasks not completed, return to handleSpawnNext
3. If all completed -> transition to coordinator Phase 5

## handleConsensus

Handle consensus_blocked signals.

| Severity | Action |
|----------|--------|
| HIGH | Pause pipeline, notify user with findings summary |
| MEDIUM | Log finding, attempt to continue |
| LOW | Log finding, continue pipeline |

## handleAdapt

Capability gap reported mid-pipeline.

1. Parse gap description
2. Check if existing role covers it -> redirect
3. Role count < 6 -> generate dynamic role-spec in <session>/role-specs/
4. Create new task (add to tasks.json), spawn worker
5. Role count >= 6 -> merge or pause

## Fast-Advance Reconciliation

On every coordinator wake:
1. Read team_msg entries with type="fast_advance"
2. Sync active_workers with spawned successors
3. No duplicate spawns
