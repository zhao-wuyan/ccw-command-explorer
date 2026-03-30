# Monitor Pipeline

Event-driven pipeline coordination. Beat model: coordinator wake -> process -> spawn -> STOP.

## Constants

- SPAWN_MODE: spawn_agent
- ONE_STEP_PER_INVOCATION: true
- FAST_ADVANCE_AWARE: true
- WORKER_AGENT: team_worker
- MAX_GC_ROUNDS: 2

## Handler Router

| Source | Handler |
|--------|---------|
| Message contains [ideator], [challenger], [synthesizer], [evaluator] | handleCallback |
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
| `[ideator]` or task ID `IDEA-*` | ideator |
| `[challenger]` or task ID `CHALLENGE-*` | challenger |
| `[synthesizer]` or task ID `SYNTH-*` | synthesizer |
| `[evaluator]` or task ID `EVAL-*` | evaluator |

2. Mark task as completed: Read tasks.json, update matching entry status to "completed", write back
3. Record completion in session state
4. **Generator-Critic check** (when challenger completes):
   - If completed task is CHALLENGE-* AND pipeline is deep or full:
   - Read critique file for GC signal
   - Read .msg/meta.json for gc_round

   | GC Signal | gc_round < max | Action |
   |-----------|----------------|--------|
   | REVISION_NEEDED | Yes | Increment gc_round, unblock IDEA-fix task |
   | REVISION_NEEDED | No (>= max) | Force convergence, unblock SYNTH |
   | CONVERGED | - | Unblock SYNTH (skip remaining GC tasks) |

   - Log team_msg with type "gc_loop_trigger" or "task_unblocked"
   - If skipping GC tasks, mark them as completed (skip)

5. Close completed agent: `close_agent({ target: <agentId> })`
6. Proceed to handleSpawnNext

## handleCheck

Read-only status report, then STOP.

```
[coordinator] Pipeline Status (<pipeline-mode>)
[coordinator] Progress: <done>/<total> (<pct>%)
[coordinator] Active: <workers with elapsed time>
[coordinator] Ready: <pending tasks with resolved deps>
[coordinator] GC Rounds: <gc_round>/<max_gc_rounds>
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
        task_name: taskId,  // e.g., "IDEA-001" — enables named targeting
        items: [{ type: "text", text: `## Role Assignment
      role: <role>
      role_spec: ~  or <project>/.codex/skills/team-brainstorm/roles/<role>/role.md
      session: <session-folder>
      session_id: <session-id>
      team_name: brainstorm
      requirement: <task-description>
      inner_loop: false

      Read role_spec file to load Phase 2-4 domain instructions.
      Execute built-in Phase 1 (task discovery) -> role Phase 2-4 -> built-in Phase 5 (report).` }]
      })
      ```
   d. Collect agent results: `wait_agent({ targets: [taskId], timeout_ms: 900000 })`
   e. Read discoveries from output files
   f. Update tasks.json with results
   g. Close agent: `close_agent({ target: taskId })`  // Use task_name, not agentId
5. Parallel spawn rules:

| Pipeline | Scenario | Spawn Behavior |
|----------|----------|---------------|
| Quick | Single sequential | One worker at a time |
| Deep | Sequential with GC | One worker at a time |
| Full | IDEA-001/002/003 unblocked | Spawn ALL 3 ideator workers in parallel |
| Full | Other stages | One worker at a time |

**Parallel ideator spawn** (Full pipeline):
```
const agentIds = []
for (const task of readyIdeatorTasks) {
  agentIds.push(spawn_agent({
    agent_type: "team_worker",
    task_name: task.id,  // e.g., "IDEA-001" — enables named targeting
    items: [{ type: "text", text: `...role: ideator-<N>...` }]
  }))
}
// Use task_name for stable targeting (v4)
const taskNames = readyIdeatorTasks.map(t => t.id)
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
// Example: Send ideation results to running challenger
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
| quick | All 3 tasks completed |
| deep | All 6 tasks (+ any skipped GC tasks) completed |
| full | All 7 tasks (+ any skipped GC tasks) completed |

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
3. Role count < 5 -> generate dynamic role-spec in <session>/role-specs/
4. Create new task (add to tasks.json), spawn worker
5. Role count >= 5 -> merge or pause

## Fast-Advance Reconciliation

On every coordinator wake:
1. Read team_msg entries with type="fast_advance"
2. Sync active_workers with spawned successors
3. No duplicate spawns
