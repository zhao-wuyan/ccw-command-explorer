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
| `DESIGN-*` | designer |
| `AUDIT-*` | reviewer |
| `BUILD-*` | implementer |

2. Mark task completed in tasks.json: `state.tasks[taskId].status = 'completed'`
3. Record completion in session state

4. Check checkpoint for completed task:

| Completed Task | Checkpoint | Action |
|---------------|------------|--------|
| RESEARCH-001 | - | Notify user: research complete |
| DESIGN-001 (tokens) | - | Proceed to AUDIT-001 |
| AUDIT-* | QUALITY-001: Sync Point | Check audit signal -> GC loop or unblock parallel |
| BUILD-001 (tokens) | - | Check if BUILD-002 ready |
| BUILD-002 (components) | - | Check if AUDIT-003 exists (full-system) or handleComplete |

5. **Sync Point handling** (AUDIT task completed):
   Read audit signal from result: `audit_passed`, `audit_result`, or `fix_required`

   | Signal | Condition | Action |
   |--------|-----------|--------|
   | `audit_passed` | Score >= 8, critical === 0 | GC converged -> record sync_point -> unblock downstream |
   | `audit_result` | Score 6-7, no critical | gc_rounds < max -> create DESIGN-fix task in tasks.json |
   | `fix_required` | Score < 6 or critical > 0 | gc_rounds < max -> create DESIGN-fix task (CRITICAL) in tasks.json |
   | Any | gc_rounds >= max | Escalate to user |

   **GC Fix Task Creation** (add to tasks.json):
   ```json
   {
     "DESIGN-fix-<round>": {
       "title": "Address audit feedback",
       "description": "PURPOSE: Address audit feedback | Success: All critical/high issues resolved\nTASK:\n  - Parse audit feedback for specific issues\n  - Apply targeted fixes\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream artifacts: audit/audit-<NNN>.md",
       "role": "designer",
       "prefix": "DESIGN",
       "deps": [],
       "status": "pending",
       "findings": "",
       "error": ""
     }
   }
   ```
   Then create new AUDIT task in tasks.json with deps on fix. Increment gc_state.round.

   **GC Escalation Options** (when max rounds exceeded):
   1. Accept current design - skip review, continue implementation
   2. Try one more round
   3. Terminate

6. -> handleSpawnNext

## handleCheck

Read-only status report from tasks.json, then STOP.

```
Pipeline Status (<pipeline-mode>):
  [DONE]  RESEARCH-001 (researcher)  -> research/*.json
  [DONE]  DESIGN-001   (designer)    -> design-tokens.json
  [RUN]   AUDIT-001    (reviewer)    -> auditing tokens...
  [WAIT]  BUILD-001    (implementer) -> blocked by AUDIT-001
  [WAIT]  DESIGN-002   (designer)    -> blocked by AUDIT-001

GC Rounds: 0/2
Sync Points: 0/<expected>
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
  task_name: taskId,  // e.g., "DESIGN-001" — enables named targeting
  items: [
    { type: "text", text: `## Role Assignment
role: ${role}
role_spec: ${skillRoot}/roles/${role}/role.md
session: ${sessionFolder}
session_id: ${sessionId}
requirement: ${taskDescription}
inner_loop: false` },

    { type: "text", text: `Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 (task discovery) -> role Phase 2-4 -> built-in Phase 5 (report).` }
  ]
})

// 3) Track agent
state.active_agents[taskId] = { agentId, role, started_at: now }

// 4) Wait for completion — use task_name for stable targeting (v4)
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
| component | Sequential | One task at a time |
| system | After Sync Point 1 | Spawn DESIGN-002 + BUILD-001 in parallel, wait_agent for both |
| system | After Sync Point 2 | Spawn BUILD-002 |
| full-system | After Sync Point 1 | Spawn DESIGN-002 + BUILD-001 in parallel, wait_agent for both |
| full-system | After BUILD-002 | Spawn AUDIT-003 |

**Cross-Agent Supplementary Context** (v4):

When spawning workers in a later pipeline phase, send upstream results as supplementary context to already-running workers:

```
// Example: Send design results to running implementer
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
| component | All 4 tasks (+ fix tasks) completed |
| system | All 7 tasks (+ fix tasks) completed |
| full-system | All 8 tasks (+ fix tasks) completed |

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
