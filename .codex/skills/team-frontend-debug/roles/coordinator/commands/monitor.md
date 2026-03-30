# Monitor Pipeline

Event-driven pipeline coordination. Beat model: coordinator wake -> process -> spawn -> STOP.

## Constants

- SPAWN_MODE: background
- ONE_STEP_PER_INVOCATION: true
- FAST_ADVANCE_AWARE: true
- WORKER_AGENT: team-worker

## Handler Router

| Source | Handler |
|--------|---------|
| Message contains [role-name] | handleCallback |
| "need_more_evidence" | handleIteration |
| "check" or "status" | handleCheck |
| "resume" or "continue" | handleResume |
| All tasks completed | handleComplete |
| Default | handleSpawnNext |

## handleCallback

Worker completed. Process and advance.

1. Find matching worker by role in message
2. Check if progress update (inner loop) or final completion
3. Progress -> update session state, STOP
4. Completion -> mark task done (read `<session>/tasks.json`, set status to "completed", write back), remove from active_workers
5. Check for special conditions:
   - **TEST-001 with 0 issues** -> skip ANALYZE/FIX/VERIFY (mark as completed in tasks.json), handleComplete
   - **TEST-001 with only warnings** -> request_user_input: fix warnings or complete
   - **TEST-001 with high/medium issues** -> proceed to ANALYZE-001
   - ANALYZE-001 with `need_more_evidence: true` -> handleIteration
   - VERIFY-001 with `verdict: fail` -> re-dispatch FIX (add FIX-002 entry to tasks.json blocked by VERIFY-001)
   - VERIFY-001 with `verdict: pass` -> handleComplete
6. -> handleSpawnNext

## handleIteration

Analyzer needs more evidence. Create supplemental reproduction task.

1. Parse Analyzer's evidence request (dimensions, specific actions)
2. Add REPRODUCE-002 entry to `<session>/tasks.json`:
   - Set owner to "reproducer" (no blockedBy -- can start immediately)
3. Add ANALYZE-002 entry to `<session>/tasks.json`:
   - Set blockedBy: ["REPRODUCE-002"]
   - Update FIX-001 entry to add ANALYZE-002 to its blockedBy
4. Write updated tasks.json
5. -> handleSpawnNext

## handleCheck

Read-only status report, then STOP.

Output:
```
[coordinator] Debug Pipeline Status
[coordinator] Bug: <bug-description-summary>
[coordinator] Progress: <done>/<total> (<pct>%)
[coordinator] Active: <workers with elapsed time>
[coordinator] Ready: <pending tasks with resolved deps>
[coordinator] Evidence: <list of collected evidence types>
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

1. No active workers -> handleSpawnNext
2. Has active -> check each status
   - completed -> mark done
   - in_progress -> still running
3. Some completed -> handleSpawnNext
4. All running -> report status, STOP

## handleSpawnNext

Find ready tasks, spawn workers, STOP.

1. Collect: completedSubjects, inProgressSubjects, readySubjects (from tasks.json)
2. No ready + work in progress -> report waiting, STOP
3. No ready + nothing in progress -> handleComplete
4. Has ready -> for each:
   a. Check if inner loop role with active worker -> skip (worker picks up)
   b. Standard spawn:
      - Update task status to "in_progress" in tasks.json
      - team_msg log -> task_unblocked
      - Spawn team-worker:
        ```
        spawn_agent({
          agent_type: "team_worker",
          task_name: taskId,  // e.g., "TEST-001" — enables named targeting
          items: [{
            description: "Spawn <role> worker for <task-id>",
            team_name: "frontend-debug",
            name: "<role>",
            prompt: `## Role Assignment
        role: <role>
        role_spec: ~  or <project>/.codex/skills/team-frontend-debug/roles/<role>/role.md
        session: <session-folder>
        session_id: <session-id>
        team_name: frontend-debug
        requirement: <task-description>
        inner_loop: <true|false>

        Read role_spec file to load Phase 2-4 domain instructions.
        Execute built-in Phase 1 -> role-spec Phase 2-4 -> built-in Phase 5.`
          }]
        })
        ```
      - Add to active_workers
5. Update session, output summary, STOP
6. Use `wait_agent({ targets: [<spawned-task-names>], timeout_ms: 900000 })` to wait for callbacks. If `result.timed_out`, mark tasks as `timed_out` and close agents. Use `close_agent({ target: taskId })` with task_name for cleanup. Workers use `report_agent_job_result()` to send results back.

**Cross-Agent Supplementary Context** (v4):

When spawning workers in a later pipeline phase, send upstream results as supplementary context to already-running workers:

```
// Example: Send analysis results to running fixer
send_message({
  target: "<running-agent-task-name>",
  items: [{ type: "text", text: `## Supplementary Context\n${upstreamFindings}` }]
})
// Note: send_message queues info without interrupting the agent's current work
```

Use `send_message` (not `assign_task`) for supplementary info that enriches but doesn't redirect the agent's current task.

## handleComplete

**Cleanup Verification** (v4):
```
// Verify all agents are properly closed
const remaining = list_agents({})
// If any team agents still running -> close_agent each
// Ensures clean session shutdown
```

Pipeline done. Generate debug report and completion action.

1. Generate debug summary:
   - Bug description and reproduction results
   - Root cause analysis (from ANALYZE artifacts)
   - Code changes applied (from FIX artifacts)
   - Verification verdict (from VERIFY artifacts)
   - Evidence inventory (screenshots, logs, traces)
2. Read session.completion_action:
   - interactive -> request_user_input (Archive/Keep/Export)
   - auto_archive -> Archive & Clean (status=completed, remove/archive session folder)
   - auto_keep -> Keep Active (status=paused)

## handleAdapt

Not typically needed for debug pipeline. If Analyzer identifies a dimension not covered:

1. Parse gap description
2. Check if reproducer can cover it -> add to evidence plan
3. Create supplemental REPRODUCE task entry in tasks.json

## Fast-Advance Reconciliation

On every coordinator wake:
1. Read team_msg entries with type="fast_advance"
2. Sync active_workers with spawned successors
3. No duplicate spawns
