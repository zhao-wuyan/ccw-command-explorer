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
| `SCAN-*` | scanner |
| `DIAG-*` | diagnostician |
| `OPT-*` | optimizer |
| `VERIFY-*` | verifier |

2. Mark task completed in tasks.json: `state.tasks[taskId].status = 'completed'`
3. Record completion in session state

4. Check checkpoint for completed task:

| Completed Task | Checkpoint | Action |
|---------------|------------|--------|
| SCAN-001 | - | Notify user: scan complete, proceed to diagnosis |
| DIAG-001 | - | Check pipeline mode: scan-only -> handleComplete, else proceed to OPT |
| OPT-001 / OPT-fix-* | - | Proceed to VERIFY |
| VERIFY-001 / VERIFY-* | GC Checkpoint | Check verify signal -> GC loop or handleComplete |

5. **GC Checkpoint handling** (VERIFY task completed):
   Read verify signal from result: `verify_passed`, `verify_failed`, or `fix_required`

   | Signal | Condition | Action |
   |--------|-----------|--------|
   | `verify_passed` | No regressions, score_delta >= 0 | GC converged -> handleComplete |
   | `verify_failed` | Regressions found but non-critical | gc_rounds < max -> create OPT-fix task |
   | `fix_required` | Score dropped or critical regressions | gc_rounds < max -> create OPT-fix task (CRITICAL) |
   | Any | gc_rounds >= max | Escalate to user |

   **GC Fix Task Creation** (add to tasks.json):
   ```json
   {
     "OPT-fix-<round>": {
       "title": "Address verification regressions",
       "description": "PURPOSE: Address verification regressions | Success: All regressions resolved\nTASK:\n  - Parse verification feedback for specific regressions\n  - Apply targeted fixes for regression issues only\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream artifacts: verification/verify-report.md",
       "role": "optimizer",
       "prefix": "OPT",
       "deps": [],
       "status": "pending",
       "findings": "",
       "error": ""
     }
   }
   ```
   Then create new VERIFY task in tasks.json with deps on fix. Increment gc_state.round.

   **GC Escalation Options** (when max rounds exceeded):
   1. Accept current state - skip further fixes, complete pipeline
   2. Try one more round
   3. Terminate

6. -> handleSpawnNext

## handleCheck

Read-only status report from tasks.json, then STOP.

```
Pipeline Status (<pipeline-mode>):
  [DONE]  SCAN-001     (scanner)        -> scan-report.md
  [DONE]  DIAG-001     (diagnostician)  -> diagnosis-report.md
  [RUN]   OPT-001      (optimizer)      -> applying fixes...
  [WAIT]  VERIFY-001   (verifier)       -> blocked by OPT-001

GC Rounds: 0/2
Score: <before-score>/32 -> pending
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
  task_name: taskId,  // e.g., "SCAN-001" -- enables named targeting
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

**Spawn rules by mode**:

| Mode | Behavior |
|------|----------|
| scan-only | Sequential: SCAN-001 then DIAG-001 |
| targeted | Sequential: SCAN -> DIAG -> OPT -> VERIFY |
| full | Sequential: SCAN -> DIAG -> OPT -> VERIFY, then GC loop if verify triggers |

**Cross-Agent Supplementary Context** (v4):

When spawning workers in a later pipeline phase, send upstream results as supplementary context to already-running workers:

```
// Example: Send scan results to running diagnostician
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
| scan-only | SCAN-001 + DIAG-001 completed |
| targeted | All 4 tasks (+ any fix tasks) completed |
| full | All 4 tasks (+ any fix tasks) completed |

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
