# Monitor Pipeline

Synchronous pipeline coordination using spawn_agent + wait_agent.

## Constants

- WORKER_AGENT: team_worker
- ONE_STEP_PER_INVOCATION: false (synchronous wait loop)
- FAST_ADVANCE_AWARE: true
- MAX_GC_ROUNDS: 3

## Handler Router

| Source | Handler |
|--------|---------|
| "capability_gap" | handleAdapt |
| "check" or "status" | handleCheck |
| "resume" or "continue" | handleResume |
| All tasks completed | handleComplete |
| Default | handleSpawnNext |

## handleCheck

Read-only status report from tasks.json, then STOP.

1. Read tasks.json
2. Count tasks by status (pending, in_progress, completed, failed)

```
Pipeline Status (<mode>):
  [DONE]  TDSCAN-001  (scanner)   -> scan complete
  [DONE]  TDEVAL-001  (assessor)  -> assessment ready
  [RUN]   TDPLAN-001  (planner)   -> planning...
  [WAIT]  TDFIX-001   (executor)  -> blocked by TDPLAN-001
  [WAIT]  TDVAL-001   (validator) -> blocked by TDFIX-001

GC Rounds: 0/3
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

1. Read tasks.json, check active_agents
2. Tasks stuck in "in_progress" -> reset to "pending"
3. Tasks with completed deps but still "pending" -> include in spawn list
4. -> handleSpawnNext

## handleSpawnNext

Find ready tasks, spawn workers, wait for completion, process results.

1. Read tasks.json
2. Collect: completedTasks, inProgressTasks, readyTasks (pending + all deps completed)
3. No ready + work in progress -> report waiting, STOP
4. No ready + nothing in progress -> handleComplete
5. Has ready -> for each:
   a. Check inner loop role with active worker -> skip (worker picks up)
   b. Update task status in tasks.json -> in_progress
   c. team_msg log -> task_unblocked

### Spawn Workers

For each ready task:

```javascript
// 1) Update status in tasks.json
state.tasks[taskId].status = 'in_progress'

// 2) Spawn worker
const agentId = spawn_agent({
  agent_type: "team_worker",
  task_name: taskId,  // e.g., "TDSCAN-001" — enables named targeting
  items: [
    { type: "text", text: `## Role Assignment
role: ${task.role}
role_spec: ${skillRoot}/roles/${task.role}/role.md
session: ${sessionFolder}
session_id: ${sessionId}
team_name: tech-debt
requirement: ${task.description}
inner_loop: ${task.role === 'executor'}` },

    { type: "text", text: `Read role_spec file (${skillRoot}/roles/${task.role}/role.md) to load Phase 2-4 domain instructions.
Execute built-in Phase 1 (task discovery) -> role Phase 2-4 -> built-in Phase 5 (report).` },

    { type: "text", text: `## Task Context
task_id: ${taskId}
title: ${task.title}
description: ${task.description}` },

    { type: "text", text: `## Upstream Context\n${prevContext}` }
  ]
})

// 3) Track agent
state.active_agents[taskId] = { agentId, role: task.role, started_at: now }
```

Stage-to-role mapping:
| Task Prefix | Role |
|-------------|------|
| TDSCAN | scanner |
| TDEVAL | assessor |
| TDPLAN | planner |
| TDFIX | executor |
| TDVAL | validator |

### Wait and Process Results

After spawning all ready tasks:

```javascript
// 4) Batch wait — use task_name for stable targeting (v4)
const taskNames = Object.keys(state.active_agents)
const waitResult = wait_agent({ targets: taskNames, timeout_ms: 900000 })
if (waitResult.timed_out) {
  for (const taskId of taskNames) {
    state.tasks[taskId].status = 'timed_out'
    close_agent({ target: taskId })
    delete state.active_agents[taskId]
  }
} else {
  // 5) Collect results
  for (const [taskId, agent] of Object.entries(state.active_agents)) {
    state.tasks[taskId].status = 'completed'
    close_agent({ target: taskId })  // Use task_name, not agentId
    delete state.active_agents[taskId]
  }
}
```

### Checkpoint Processing

After task completion, check for checkpoints:

- **TDPLAN-001 completes** -> Plan Approval Gate:
  ```javascript
  request_user_input({
    questions: [{
      question: "Remediation plan generated. Review and decide:",
      header: "Plan Review",
      multiSelect: false,
      options: [
        { label: "Approve", description: "Proceed with fix execution" },
        { label: "Revise", description: "Re-run planner with feedback" },
        { label: "Abort", description: "Stop pipeline" }
      ]
    }]
  })
  ```
  - Approve -> Worktree Creation -> continue handleSpawnNext loop
  - Revise -> Add TDPLAN-revised task to tasks.json -> continue
  - Abort -> Log shutdown -> handleComplete

- **Worktree Creation** (before TDFIX):
  ```
  Bash("git worktree add .worktrees/TD-<slug>-<date> -b tech-debt/TD-<slug>-<date>")
  ```
  Update .msg/meta.json with worktree info.

- **TDVAL-* completes** -> GC Loop Check:
  Read validation results from .msg/meta.json

  | Condition | Action |
  |-----------|--------|
  | No regressions | -> continue (pipeline complete) |
  | Regressions AND gc_rounds < 3 | Add fix-verify tasks to tasks.json, increment gc_rounds |
  | Regressions AND gc_rounds >= 3 | Accept current state -> handleComplete |

  Fix-Verify Task Creation (add to tasks.json):
  ```json
  {
    "TDFIX-fix-<round>": {
      "title": "Fix regressions (Fix-Verify #<round>)",
      "description": "PURPOSE: Fix regressions | Session: <session>",
      "role": "executor",
      "prefix": "TDFIX",
      "deps": [],
      "status": "pending",
      "findings": null,
      "error": null
    },
    "TDVAL-recheck-<round>": {
      "title": "Recheck after fix (Fix-Verify #<round>)",
      "description": "Re-validate after fix",
      "role": "validator",
      "prefix": "TDVAL",
      "deps": ["TDFIX-fix-<round>"],
      "status": "pending",
      "findings": null,
      "error": null
    }
  }
  ```

**Cross-Agent Supplementary Context** (v4):

When spawning workers in a later pipeline phase, send upstream results as supplementary context to already-running workers:

```
// Example: Send scan results to running assessor
send_message({
  target: "<running-agent-task-name>",
  items: [{ type: "text", text: `## Supplementary Context\n${upstreamFindings}` }]
})
// Note: send_message queues info without interrupting the agent's current work
```

Use `send_message` (not `assign_task`) for supplementary info that enriches but doesn't redirect the agent's current task.

### Persist and Loop

After processing all results:
1. Write updated tasks.json
2. Check if more tasks are now ready (deps newly resolved)
3. If yes -> loop back to step 1 of handleSpawnNext
4. If no more ready and all done -> handleComplete
5. If no more ready but some still blocked -> report status, STOP

## handleComplete

**Cleanup Verification** (v4):
```
// Verify all agents are properly closed
const remaining = list_agents({})
// If any team agents still running -> close_agent each
// Ensures clean session shutdown
```

Pipeline done. Generate report and completion action.

1. Verify all tasks (including fix-verify tasks) have status "completed"
2. If any not completed -> handleSpawnNext
3. If all completed:
   - Read final state from .msg/meta.json
   - If worktree exists and validation passed: commit, push, gh pr create, cleanup worktree
   - Compile summary: total tasks, completed, gc_rounds, debt_score_before, debt_score_after
   - Transition to coordinator Phase 5
4. Execute completion action per tasks.json completion_action:
   - interactive -> request_user_input (Archive/Keep/Export)
   - auto_archive -> Archive & Clean (rm -rf session folder)
   - auto_keep -> Keep Active (status=paused)

## handleAdapt

Capability gap reported mid-pipeline.

1. Parse gap description
2. Check if existing role covers it -> redirect
3. Role count < 5 -> generate dynamic role spec in <session>/role-specs/
4. Add new task to tasks.json, spawn worker via spawn_agent + wait_agent
5. Role count >= 5 -> merge or pause

## Fast-Advance Reconciliation

On every coordinator wake:
1. Read team_msg entries with type="fast_advance"
2. Sync active_agents with spawned successors
3. No duplicate spawns
