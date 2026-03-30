# Monitor Pipeline

Synchronous pipeline coordination using spawn_agent + wait_agent.

## Constants

- WORKER_AGENT: team_worker
- ONE_STEP_PER_INVOCATION: false (synchronous wait loop)
- FAST_ADVANCE_AWARE: true

## Handler Router

| Source | Handler |
|--------|---------|
| Message contains branch tag [refactorer-B01], etc. | handleSpawnNext (branch-aware) |
| Message contains pipeline tag [analyzer-A], etc. | handleSpawnNext (pipeline-aware) |
| "consensus_blocked" | handleConsensus |
| "capability_gap" | handleAdapt |
| "check" or "status" | handleCheck |
| "resume" or "continue" | handleResume |
| All tasks completed | handleComplete |
| Default | handleSpawnNext |

## handleCheck

Read-only status report from tasks.json, then STOP.

1. Read tasks.json
2. Count tasks by status (pending, in_progress, completed, failed)

Output (single mode):
```
[coordinator] Pipeline Status
[coordinator] Progress: <done>/<total> (<pct>%)
[coordinator] Active agents: <list from active_agents>
[coordinator] Ready: <pending tasks with resolved deps>
[coordinator] Commands: 'resume' to advance | 'check' to refresh
```

Fan-out mode adds per-branch grouping. Independent mode adds per-pipeline grouping.

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
2. No active agents -> handleSpawnNext
3. Has active agents -> check each status
4. Proceed to handleSpawnNext

## handleSpawnNext

Find ready tasks, spawn workers, wait for completion, process results.

1. Read tasks.json
2. Collect: completedTasks, inProgressTasks, readyTasks (pending + all deps completed)
3. No ready + nothing in progress -> handleComplete
4. No ready + work in progress -> report waiting, STOP
5. Has ready -> for each:
   a. Check if inner loop role with active worker -> skip (worker picks up)
   b. Update task status in tasks.json -> in_progress
   c. team_msg log -> task_unblocked
   d. **CP-2.5 check** (auto/fan-out mode only):
      - If completed task is DESIGN-001 AND parallel_mode is `auto` or `fan-out`:
      - Execute CP-2.5 Branch Creation from dispatch.md
      - After branch creation, re-collect readyTasks (spawns all REFACTOR-B* in parallel)

### Spawn Workers

For each ready task:

```javascript
// 1) Update status in tasks.json
state.tasks[taskId].status = 'in_progress'

// 2) Spawn worker
const agentId = spawn_agent({
  agent_type: "team_worker",
  task_name: taskId,  // e.g., "DESIGN-001" — enables named targeting
  items: [
    { type: "text", text: `## Role Assignment
role: ${task.role}
role_spec: ${skillRoot}/roles/${task.role}/role.md
session: ${sessionFolder}
session_id: ${sessionId}
team_name: arch-opt
requirement: ${task.description}
inner_loop: ${task.role === 'refactorer'}` },

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

6. Parallel spawn rules by mode:

| Mode | Scenario | Spawn Behavior |
|------|----------|---------------|
| Single | Stage 4 ready | Spawn VALIDATE-001 + REVIEW-001 in parallel |
| Fan-out (CP-2.5 done) | All REFACTOR-B* unblocked | Spawn ALL REFACTOR-B* in parallel |
| Fan-out (REFACTOR-B{NN} done) | VALIDATE + REVIEW ready | Spawn both for that branch in parallel |
| Independent | Any unblocked task | Spawn all ready tasks across all pipelines in parallel |

**Cross-Agent Supplementary Context** (v4):

When spawning workers in a later pipeline phase, send upstream results as supplementary context to already-running workers:

```
// Example: Send design analysis results to running refactorers
send_message({
  target: "<running-agent-task-name>",
  items: [{ type: "text", text: `## Supplementary Context\n${upstreamFindings}` }]
})
// Note: send_message queues info without interrupting the agent's current work
```

Use `send_message` (not `assign_task`) for supplementary info that enriches but doesn't redirect the agent's current task.

### Wait and Process Results

After spawning all ready tasks:

```javascript
// 4) Batch wait — use task_name for stable targeting (v4)
const taskNames = Object.keys(state.active_agents)
const waitResult = wait_agent({ targets: taskNames, timeout_ms: 900000 })
if (waitResult.timed_out) {
  // Mark timed-out agents, close them, report to user
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

### Persist and Loop

After processing all results:
1. Write updated tasks.json
2. Check stage checkpoints (CP-1, CP-2, CP-2.5, CP-3)
3. Check if more tasks are now ready (deps newly resolved)
4. If yes -> loop back to step 1 of handleSpawnNext
5. If no more ready and all done -> handleComplete
6. If no more ready but some still blocked -> report status, STOP

## Review-Fix Cycle (CP-3)

**Per-branch/pipeline scoping**: Each branch/pipeline has its own independent fix cycle.

When both VALIDATE-* and REVIEW-* are completed for a branch/pipeline:

1. Read validation verdict from scoped meta.json namespace
2. Read review verdict from scoped meta.json namespace

| Validate Verdict | Review Verdict | Action |
|-----------------|----------------|--------|
| PASS | APPROVE | -> handleComplete check |
| PASS | REVISE | Create FIX task in tasks.json with review feedback |
| FAIL | APPROVE | Create FIX task in tasks.json with validation feedback |
| FAIL | REVISE/REJECT | Create FIX task in tasks.json with combined feedback |
| Any | REJECT | Create FIX task in tasks.json + flag for designer re-evaluation |

Fix cycle tracking per branch in tasks.json `fix_cycles`:
- < 3: Add FIX task to tasks.json, increment cycle count
- >= 3: Escalate THIS branch to user. Other branches continue

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
| Single | All 5 tasks (+ any FIX/retry tasks) completed |
| Fan-out | ALL branches have VALIDATE + REVIEW completed (or escalated), shared stages done |
| Independent | ALL pipelines have VALIDATE + REVIEW completed (or escalated) |

1. For fan-out/independent: aggregate per-branch/pipeline results to `<session>/artifacts/aggregate-results.json`
2. If any tasks not completed, return to handleSpawnNext
3. If all completed -> transition to coordinator Phase 5
4. Execute completion action per tasks.json completion_action:
   - interactive -> request_user_input (Archive/Keep/Export)
   - auto_archive -> Archive & Clean (rm -rf session folder)
   - auto_keep -> Keep Active (status=paused)

## handleConsensus

Handle consensus_blocked signals from discuss rounds.

| Severity | Action |
|----------|--------|
| HIGH | Pause pipeline (or branch), notify user with findings summary |
| MEDIUM | Add revision task to tasks.json for the blocked role (scoped to branch if applicable) |
| LOW | Log finding, continue pipeline |

## handleAdapt

Capability gap reported mid-pipeline.

1. Parse gap description
2. Check if existing role covers it -> redirect
3. Role count < 5 -> generate dynamic role-spec in <session>/role-specs/
4. Add new task to tasks.json, spawn worker via spawn_agent + wait_agent
5. Role count >= 5 -> merge or pause

## Fast-Advance Reconciliation

On every coordinator wake:
1. Read team_msg entries with type="fast_advance"
2. Sync active_agents with spawned successors
3. No duplicate spawns
