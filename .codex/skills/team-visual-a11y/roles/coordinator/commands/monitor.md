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
| `COLOR-*` | color-auditor |
| `TYPO-*` | typo-auditor |
| `FOCUS-*` | focus-auditor |
| `REMED-*` | remediation-planner |
| `FIX-*` | fix-implementer |

2. Mark task completed in tasks.json: `state.tasks[taskId].status = 'completed'`
3. Record completion in session state

4. Check checkpoint for completed task:

| Completed Task | Checkpoint | Action |
|---------------|------------|--------|
| COLOR-001 | Parallel fan-in | Check if all 3 audits complete -> unblock REMED-001 |
| TYPO-001 | Parallel fan-in | Check if all 3 audits complete -> unblock REMED-001 |
| FOCUS-001 | Parallel fan-in | Check if all 3 audits complete -> unblock REMED-001 |
| REMED-001 | -- | Unblock FIX-001 (full mode only) |
| FIX-001 | GC check | Spawn COLOR-002 + FOCUS-002 in parallel (full mode) |
| COLOR-002 | Re-audit fan-in | Check if both re-audits complete -> handleComplete |
| FOCUS-002 | Re-audit fan-in | Check if both re-audits complete -> handleComplete |

5. **Parallel fan-in handling** (audit task completed):

   **CRITICAL**: REMED-001 must wait for ALL 3 auditors (COLOR-001 + TYPO-001 + FOCUS-001) to complete.

   Since all 3 are spawned together and waited on together:
   ```javascript
   // Spawn all 3 auditors
   spawn_agent({ agent_type: "team_worker", task_name: "COLOR-001", ... })
   spawn_agent({ agent_type: "team_worker", task_name: "TYPO-001", ... })
   spawn_agent({ agent_type: "team_worker", task_name: "FOCUS-001", ... })

   // Wait for ALL 3 to complete
   wait_agent({ targets: ["COLOR-001", "TYPO-001", "FOCUS-001"], timeout_ms: 900000 })

   // Close all 3
   close_agent({ target: "COLOR-001" })
   close_agent({ target: "TYPO-001" })
   close_agent({ target: "FOCUS-001" })

   // Mark all 3 completed in tasks.json
   // Then spawn REMED-001
   ```

6. **GC loop handling** (full mode, after FIX-001 completes):

   Spawn COLOR-002 + FOCUS-002 in parallel, wait for both:
   ```javascript
   spawn_agent({ agent_type: "team_worker", task_name: "COLOR-002", ... })
   spawn_agent({ agent_type: "team_worker", task_name: "FOCUS-002", ... })
   wait_agent({ targets: ["COLOR-002", "FOCUS-002"], timeout_ms: 900000 })
   close_agent({ target: "COLOR-002" })
   close_agent({ target: "FOCUS-002" })
   ```

   Read re-audit results:

   | Signal | Condition | Action |
   |--------|-----------|--------|
   | All pass | No critical/high issues remaining | GC converged -> handleComplete |
   | Issues remain | Critical/high issues found | gc_rounds < max -> create FIX-002 + re-audit tasks |
   | Any | gc_rounds >= max | Escalate to user |

   **GC Fix Task Creation** (when re-audit finds issues):
   ```json
   {
     "FIX-002": {
       "title": "Address remaining issues from re-audit",
       "description": "PURPOSE: Address remaining issues from re-audit | Success: All critical/high issues resolved\nTASK:\n  - Parse re-audit reports for remaining issues\n  - Apply targeted fixes for color and focus issues\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream artifacts: re-audit/color-audit-002.md, re-audit/focus-audit-002.md",
       "role": "fix-implementer",
       "prefix": "FIX",
       "deps": ["COLOR-002", "FOCUS-002"],
       "status": "pending",
       "findings": "",
       "error": ""
     }
   }
   ```
   Then create new re-audit tasks with deps on FIX-002. Increment gc_rounds.

   **GC Escalation Options** (when max rounds exceeded):
   1. Accept current state - acknowledge remaining issues
   2. Try one more round
   3. Terminate

7. -> handleSpawnNext

## handleCheck

Read-only status report from tasks.json, then STOP.

```
Pipeline Status (<pipeline-mode>):
  [DONE]  COLOR-001 (color-auditor)        -> audits/color/color-audit-001.md
  [DONE]  TYPO-001  (typo-auditor)         -> audits/typography/typo-audit-001.md
  [RUN]   FOCUS-001 (focus-auditor)        -> auditing focus...
  [WAIT]  REMED-001 (remediation-planner)  -> blocked by COLOR-001, TYPO-001, FOCUS-001
  [WAIT]  FIX-001   (fix-implementer)      -> blocked by REMED-001
  [WAIT]  COLOR-002 (color-auditor)        -> blocked by FIX-001
  [WAIT]  FOCUS-002 (focus-auditor)        -> blocked by FIX-001

Fan-in: 2/3 audits complete
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
  task_name: taskId,  // e.g., "COLOR-001" -- enables named targeting
  fork_context: false,
  items: [
    { type: "text", text: `## Role Assignment
role: ${role}
role_spec: ${skillRoot}/roles/${role}/role.md
session: ${sessionFolder}
session_id: ${sessionId}
requirement: ${taskDescription}
inner_loop: ${innerLoop}

Read role_spec file to load Phase 2-4 domain instructions.` },

    { type: "text", text: `## Task Context
task_id: ${taskId}
title: ${taskTitle}
description: ${taskDescription}
pipeline_phase: ${pipelinePhase}` },

    { type: "text", text: `## Upstream Context
${upstreamContext}` }
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
| audit-only | Initial | Spawn COLOR-001 + TYPO-001 + FOCUS-001 in parallel, wait_agent for all 3 |
| audit-only | After 3 audits complete | Spawn REMED-001 |
| full | Initial | Spawn COLOR-001 + TYPO-001 + FOCUS-001 in parallel, wait_agent for all 3 |
| full | After 3 audits complete | Spawn REMED-001 |
| full | After REMED-001 | Spawn FIX-001 |
| full | After FIX-001 | Spawn COLOR-002 + FOCUS-002 in parallel, wait_agent for both |
| full (GC) | After re-audit fan-in | If issues: spawn FIX-002, then new re-audits |

**Cross-Agent Supplementary Context** (v4):

When spawning workers in a later pipeline phase, send upstream results as supplementary context to already-running workers:

```
// Example: Send audit results to running remediation-planner
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
| audit-only | All 4 tasks (+ any fix tasks) completed |
| full | All 7 tasks (+ any GC fix tasks) completed |

1. If any tasks not completed -> handleSpawnNext
2. If all completed -> transition to coordinator Phase 5

## handleAdapt

Capability gap reported mid-pipeline.

1. Parse gap description
2. Check if existing role covers it -> redirect
3. Role count < 6 -> generate dynamic role spec
4. Create new task in tasks.json, spawn worker
5. Role count >= 6 -> merge or pause

## Fast-Advance Reconciliation

On every coordinator wake:
1. Read tasks.json for completed tasks
2. Sync active_agents with actual state
3. No duplicate spawns
