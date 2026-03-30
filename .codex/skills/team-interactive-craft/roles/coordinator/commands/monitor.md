# Monitor Pipeline

Synchronous pipeline coordination using spawn_agent + wait_agent.

## Constants

- WORKER_AGENT: team_worker
- MAX_GC_ROUNDS: 2

## Handler Router

| Source | Handler |
|--------|---------|
| "capability_gap" | handleAdapt |
| "check" or "status" | handleCheck |
| "resume" or "continue" | handleResume |
| All tasks completed | handleComplete |
| Default | handleSpawnNext |

## handleCallback

Worker completed (wait_agent returns). Process and advance.

1. Determine role from completed task prefix:

| Task Prefix | Role |
|-------------|------|
| `RESEARCH-*` | researcher |
| `INTERACT-*` | interaction-designer |
| `BUILD-*` | builder |
| `A11Y-*` | a11y-tester |

2. Mark task completed in tasks.json: `state.tasks[taskId].status = 'completed'`
3. Record completion in session state

4. Check checkpoint for completed task:

| Completed Task | Checkpoint | Action |
|---------------|------------|--------|
| RESEARCH-001 | - | Notify user: research complete |
| INTERACT-001 | - | Proceed to BUILD-001 (single/gallery) or BUILD-001..N (page parallel) |
| INTERACT-002 | - | Proceed to BUILD-002 (gallery) |
| BUILD-001 | - | Check mode: single -> A11Y-001; gallery -> INTERACT-002; page -> check if all BUILD done |
| BUILD-001..N | - | Page mode: check if all BUILD tasks done -> A11Y-001 |
| BUILD-002 | - | Gallery: proceed to A11Y-001 |
| A11Y-001 | QUALITY: A11y Gate | Check a11y signal -> GC loop or complete |

5. **A11y Gate handling** (A11Y task completed):
   Read a11y signal from result: `a11y_passed`, `a11y_result`, or `fix_required`

   | Signal | Condition | Action |
   |--------|-----------|--------|
   | `a11y_passed` | 0 critical issues | GC converged -> record gate -> handleComplete |
   | `a11y_result` | Minor issues only | gc_rounds < max -> create BUILD-fix task in tasks.json |
   | `fix_required` | Critical issues found | gc_rounds < max -> create BUILD-fix task (CRITICAL) in tasks.json |
   | Any | gc_rounds >= max | Escalate to user |

   **GC Fix Task Creation** (add to tasks.json):
   ```json
   {
     "BUILD-fix-<round>": {
       "title": "Address a11y audit feedback",
       "description": "PURPOSE: Address a11y audit feedback | Success: All critical/high issues resolved\nTASK:\n  - Parse a11y audit feedback for specific issues\n  - Apply targeted fixes to component JS/CSS\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream artifacts: a11y/a11y-audit-<NNN>.md",
       "role": "builder",
       "prefix": "BUILD",
       "deps": [],
       "status": "pending",
       "findings": "",
       "error": ""
     }
   }
   ```
   Then create new A11Y task in tasks.json with deps on fix. Increment gc_state.round.

   **GC Escalation Options** (when max rounds exceeded):
   1. Accept current implementation - skip remaining a11y fixes
   2. Try one more round
   3. Terminate

6. -> handleSpawnNext

## handleCheck

Read-only status report from tasks.json, then STOP.

```
Pipeline Status (<pipeline-mode>):
  [DONE]  RESEARCH-001      (researcher)            -> research/*.json
  [DONE]  INTERACT-001      (interaction-designer)  -> blueprints/*.md
  [RUN]   BUILD-001         (builder)               -> building component...
  [WAIT]  A11Y-001          (a11y-tester)            -> blocked by BUILD-001

GC Rounds: 0/2
Session: <session-id>
Commands: 'resume' to advance | 'check' to refresh
```

Output status -- do NOT advance pipeline.

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

1. Audit tasks.json for inconsistencies:
   - Tasks stuck in "in_progress" -> reset to "pending"
   - Tasks with completed deps but still "pending" -> include in spawn list
2. -> handleSpawnNext

## handleSpawnNext

Find ready tasks, spawn workers, wait for results.

1. Read tasks.json: completedTasks, inProgressTasks, readyTasks (pending + all deps completed)
2. No ready + work in progress -> report waiting, STOP
3. No ready + nothing in progress -> handleComplete
4. Has ready -> for each:
   a. Check inner loop role with active worker -> skip (worker picks up)
   b. Update task status to in_progress in tasks.json
   c. team_msg log -> task_unblocked
   d. Spawn team_worker:

```javascript
// 1) Update status in tasks.json
state.tasks[taskId].status = 'in_progress'

// 2) Spawn worker
const agentId = spawn_agent({
  agent_type: "team_worker",
  task_name: taskId,  // e.g., "BUILD-001" -- enables named targeting
  items: [
    { type: "text", text: `## Role Assignment
role: ${role}
role_spec: ${skillRoot}/roles/${role}/role.md
session: ${sessionFolder}
session_id: ${sessionId}
requirement: ${taskDescription}
inner_loop: ${innerLoop}` },

    { type: "text", text: `Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 (task discovery) -> role Phase 2-4 -> built-in Phase 5 (report).` }
  ]
})

// 3) Track agent
state.active_agents[taskId] = { agentId, role, started_at: now }

// 4) Wait for completion -- use task_name for stable targeting (v4)
const waitResult = wait_agent({ targets: [taskId], timeout_ms: 900000 })
if (waitResult.timed_out) {
  state.tasks[taskId].status = 'timed_out'
  close_agent({ target: taskId })
  delete state.active_agents[taskId]
} else {
  // 5) Collect results and update tasks.json
  state.tasks[taskId].status = 'completed'
  close_agent({ target: taskId })  // Use task_name, not agentId
  delete state.active_agents[taskId]
}
```

**Parallel spawn rules by mode**:

| Mode | Scenario | Spawn Behavior |
|------|----------|---------------|
| single | Sequential | One task at a time |
| gallery | Sequential | One task at a time |
| page | After INTERACT-001 | Spawn BUILD-001..N in parallel, wait_agent for all |
| page | After all BUILD done | Spawn A11Y-001 |

**Cross-Agent Supplementary Context** (v4):

When spawning workers in a later pipeline phase, send upstream results as supplementary context to already-running workers:

```
// Example: Send research results to running interaction-designer
send_message({
  target: "<running-agent-task-name>",
  items: [{ type: "text", text: `## Supplementary Context\n${upstreamFindings}` }]
})
// Note: send_message queues info without interrupting the agent's current work
```

Use `send_message` (not `assign_task`) for supplementary info that enriches but doesn't redirect the agent's current task.

5. Update tasks.json, output summary, STOP

## handleComplete

**Cleanup Verification** (v4):
```
// Verify all agents are properly closed
const remaining = list_agents({})
// If any team agents still running -> close_agent each
// Ensures clean session shutdown
```

Pipeline done. Generate report and completion action.

**Completion check by mode**:

| Mode | Completion Condition |
|------|---------------------|
| single | All 4 tasks (+ fix tasks) completed |
| gallery | All 6 tasks (+ fix tasks) completed |
| page | All 3+N tasks (+ fix tasks) completed |

1. If any tasks not completed -> handleSpawnNext
2. If all completed -> transition to coordinator Phase 5

## handleAdapt

Capability gap reported mid-pipeline.

1. Parse gap description
2. Check if existing role covers it -> redirect
3. Role count < 5 -> generate dynamic role spec
4. Create new task in tasks.json, spawn worker
5. Role count >= 5 -> merge or pause

## Fast-Advance Reconciliation

On every coordinator wake:
1. Read tasks.json for completed tasks
2. Sync active_agents with actual state
3. No duplicate spawns
