# Command: monitor

## Purpose

Event-driven pipeline coordination with Spawn-and-Stop pattern. Three wake-up sources: worker results, user `check`, user `resume`.

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| SPAWN_MODE | spawn_agent | All workers spawned via `spawn_agent` |
| ONE_STEP_PER_INVOCATION | true | Coordinator does one operation then STOPS |
| WORKER_AGENT | team_worker | All workers are team_worker agents |

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Session file | `<session-folder>/.msg/meta.json` | Yes |
| Task list | Read tasks.json | Yes |
| Active workers | session.active_workers[] | Yes |

## Phase 3: Handler Routing

### Wake-up Source Detection

| Priority | Condition | Handler |
|----------|-----------|---------|
| 1 | Message contains `[planner]` or `[executor]` tag | handleCallback |
| 2 | Contains "check" or "status" | handleCheck |
| 3 | Contains "resume", "continue", or "next" | handleResume |
| 4 | None of the above (initial spawn) | handleSpawnNext |

---

### Handler: handleCallback

```
Receive result from wait_agent for [<role>]
  +- Match role: planner or executor
  +- Progress update (not final)?
  |   +- YES -> Update session -> STOP
  +- Task status = completed?
  |   +- YES -> remove from active_workers -> update session
  |   |   +- Close agent: close_agent({ target: <agentId> })
  |   |   +- role = planner?
  |   |   |   +- Check for new EXEC-* tasks in tasks.json (planner creates them)
  |   |   |   +- -> handleSpawnNext (spawn executor for new EXEC-* tasks)
  |   |   +- role = executor?
  |   |       +- Mark issue done
  |   |       +- -> handleSpawnNext (check for more EXEC-* tasks)
  |   +- NO -> progress message -> STOP
  +- No matching worker found
      +- Scan all active workers for completed tasks
      +- Found completed -> process -> handleSpawnNext
      +- None completed -> STOP
```

---

### Handler: handleCheck

Read-only status report. No advancement.

```
[coordinator] PlanEx Pipeline Status
[coordinator] Progress: <completed>/<total> (<percent>%)

[coordinator] Task Graph:
  PLAN-001: <status-icon> <summary>
  EXEC-001: <status-icon> <issue-title>
  EXEC-002: <status-icon> <issue-title>
  ...

  done=completed  >>>=running  o=pending

[coordinator] Active Workers:
  > <subject> (<role>) - running <elapsed>

[coordinator] Ready to spawn: <subjects>
[coordinator] Commands: 'resume' to advance | 'check' to refresh
```

Then STOP.

---

### Handler: handleResume

**Agent Health Check** (v4):
```
// Verify actual running agents match session state
const runningAgents = list_agents({})
// For each active_agent in tasks.json:
//   - If agent NOT in runningAgents -> agent crashed
//   - Reset that task to pending, remove from active_agents
// This prevents stale agent references from blocking the pipeline
```

```
Load active_workers
  +- No active workers -> handleSpawnNext
  +- Has active workers -> check each:
      +- completed -> mark done, log
      +- in_progress -> still running
      +- other -> worker failure -> reset to pending
      After:
        +- Some completed -> handleSpawnNext
        +- All running -> report status -> STOP
        +- All failed -> handleSpawnNext (retry)
```

---

### Handler: handleSpawnNext

```
Collect task states from tasks.json
  +- Filter tasks: PLAN-* and EXEC-* prefixes
  +- readySubjects: pending + not blocked (no deps or all deps completed)
  +- NONE ready + work in progress -> report waiting -> STOP
  +- NONE ready + nothing running -> PIPELINE_COMPLETE -> Phase 5
  +- HAS ready tasks -> for each:
      +- Inner Loop role AND already has active_worker for that role?
      |   +- YES -> SKIP spawn (existing worker picks up via inner loop)
      |   +- NO -> spawn below
      +- Determine role from task prefix:
      |   +- PLAN-* -> planner
      |   +- EXEC-* -> executor
      +- Spawn team_worker:
         const agentId = spawn_agent({
           agent_type: "team_worker",
           task_name: taskId,  // e.g., "PLAN-001" — enables named targeting
           items: [{ type: "text", text: `## Role Assignment
role: <role>
role_spec: ~  or <project>/.codex/skills/team-planex/roles/<role>/role.md
session: <session-folder>
session_id: <session-id>
team_name: <team-name>
requirement: <task-description>
inner_loop: true
execution_method: <method>` }]
         })
         // Collect results — use task_name for stable targeting (v4):
         const result = wait_agent({ targets: [taskId], timeout_ms: 900000 })
         if (result.timed_out) {
           state.tasks[taskId].status = 'timed_out'
           close_agent({ target: taskId })
           // Report timeout, STOP
         } else {
           // Process result, update tasks.json
           close_agent({ target: taskId })  // Use task_name, not agentId
         }
      +- Add to session.active_workers
      Update session -> output summary -> STOP
```

**Cross-Agent Supplementary Context** (v4):

When spawning workers in a later pipeline phase, send upstream results as supplementary context to already-running workers:

```
// Example: Send planning results to running executors
send_message({
  target: "<running-agent-task-name>",
  items: [{ type: "text", text: `## Supplementary Context\n${upstreamFindings}` }]
})
// Note: send_message queues info without interrupting the agent's current work
```

Use `send_message` (not `assign_task`) for supplementary info that enriches but doesn't redirect the agent's current task.

---

### Pipeline Complete (PIPELINE_COMPLETE -> Phase 5)

**Cleanup Verification** (v4):
```
// Verify all agents are properly closed
const remaining = list_agents({})
// If any team agents still running -> close_agent each
// Ensures clean session shutdown
```

When all tasks are completed (no pending, no in_progress), transition to coordinator Phase 5.

---

## Phase 4: Validation

| Check | Criteria |
|-------|----------|
| Session state consistent | active_workers matches in_progress tasks |
| No orphaned tasks | Every in_progress has active_worker |
| Pipeline completeness | All expected EXEC-* tasks accounted for |

## Worker Failure Handling

1. Reset task -> pending in tasks.json
2. Log via team_msg (type: error)
3. Report to user

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Session file not found | Error, suggest re-initialization |
| Unknown role callback | Log, scan for other completions |
| All workers running on resume | Report status, suggest check later |
| Pipeline stall (no ready + no running + has pending) | Check deps chains, report |
