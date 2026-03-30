# Monitor Pipeline

Event-driven pipeline coordination. Beat model: coordinator wake -> process -> spawn -> STOP.

## Constants

- SPAWN_MODE: background
- ONE_STEP_PER_INVOCATION: true
- FAST_ADVANCE_AWARE: true
- WORKER_AGENT: team_worker
- MAX_TEST_ITERATIONS: 5

## Handler Router

| Source | Handler |
|--------|---------|
| Message contains [scanner], [diagnoser], [designer], [implementer], [tester] | handleCallback |
| "capability_gap" | handleAdapt |
| "check" or "status" | handleCheck |
| "resume" or "continue" | handleResume |
| All tasks completed | handleComplete |
| Default | handleSpawnNext |

## handleCallback

Worker completed. Process and advance.

1. Parse message to identify role and task ID:

| Message Pattern | Role |
|----------------|------|
| `[scanner]` or `SCAN-*` | scanner |
| `[diagnoser]` or `DIAG-*` | diagnoser |
| `[designer]` or `DESIGN-*` | designer |
| `[implementer]` or `IMPL-*` | implementer |
| `[tester]` or `TEST-*` | tester |

2. Check if progress update (inner loop) or final completion
3. Progress update -> update session state, STOP
4. Completion -> mark task done:
   ```
   // Read tasks.json, find task by id, update status
   tasks = JSON.parse(Read("<session>/tasks.json"))
   task = tasks.find(t => t.id === "<task-id>")
   task.status = "completed"
   Write("<session>/tasks.json", JSON.stringify(tasks, null, 2))
   ```
5. Remove from active_workers, record completion in session

6. Check for checkpoints:
   - **TEST-001 completes** -> Validation Gate:
     Read test results from `.msg/meta.json`

     | Condition | Action |
     |-----------|--------|
     | pass_rate >= 95% | -> handleSpawnNext (pipeline likely complete) |
     | pass_rate < 95% AND iterations < max | Log warning, still -> handleSpawnNext |
     | pass_rate < 95% AND iterations >= max | Accept current state -> handleComplete |

7. -> handleSpawnNext

## handleCheck

Read-only status report, then STOP.

```
Pipeline Status (standard):
  [DONE]  SCAN-001    (scanner)     -> artifacts/scan-report.md
  [DONE]  DIAG-001    (diagnoser)   -> artifacts/diagnosis.md
  [RUN]   DESIGN-001  (designer)    -> designing solutions...
  [WAIT]  IMPL-001    (implementer) -> blocked by DESIGN-001
  [WAIT]  TEST-001    (tester)      -> blocked by IMPL-001

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

1. Audit task list for inconsistencies:
   - Tasks stuck in "in_progress" -> reset to "pending"
   - Tasks with completed blockers but still "pending" -> include in spawn list
2. -> handleSpawnNext

## handleSpawnNext

Find ready tasks, spawn workers, STOP.

1. Read tasks from `<session>/tasks.json`
2. Collect: completedSubjects, inProgressSubjects, readySubjects (pending + all blockedBy completed)
3. No ready + work in progress -> report waiting, STOP
4. No ready + nothing in progress -> handleComplete
5. Has ready -> for each:
   a. Check inner loop role with active worker -> skip (worker picks up)
   b. Update task status to "in_progress" in tasks.json
   c. team_msg log -> task_unblocked
   d. Spawn team_worker:

```
spawn_agent({
  agent_type: "team_worker",
  task_name: taskId,  // e.g., "SCAN-001" — enables named targeting
  items: [{
    description: "Spawn <role> worker for <task-id>",
    team_name: "ux-improve",
    name: "<role>",
    prompt: `## Role Assignment
role: <role>
role_spec: ~  or <project>/.codex/skills/team-ux-improve/roles/<role>/role.md
session: <session-folder>
session_id: <session-id>
team_name: ux-improve
requirement: <task-description>
inner_loop: <true|false>

Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 (task discovery) -> role Phase 2-4 -> built-in Phase 5 (report).`
  }]
})
```

Stage-to-role mapping:
| Task Prefix | Role |
|-------------|------|
| SCAN | scanner |
| DIAG | diagnoser |
| DESIGN | designer |
| IMPL | implementer |
| TEST | tester |

Inner loop roles: implementer (inner_loop: true)
Single-task roles: scanner, diagnoser, designer, tester (inner_loop: false)

5. Add to active_workers, update session, output summary, STOP
6. Use `wait_agent({ targets: [<spawned-task-names>], timeout_ms: 900000 })` to wait for callbacks. If `result.timed_out`, mark tasks as `timed_out` and close agents. Use `close_agent({ target: taskId })` with task_name for cleanup.

**Cross-Agent Supplementary Context** (v4):

When spawning workers in a later pipeline phase, send upstream results as supplementary context to already-running workers:

```
// Example: Send scan results to running diagnoser
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

Pipeline done. Generate report and completion action.

1. Verify all tasks (including any fix-verify iterations) have status "completed"
2. If any tasks not completed -> handleSpawnNext
3. If all completed -> transition to coordinator Phase 5

## handleAdapt

Capability gap reported mid-pipeline.

1. Parse gap description
2. Check if existing role covers it -> redirect
3. Role count < 5 -> generate dynamic role spec
4. Create new task, spawn worker
5. Role count >= 5 -> merge or pause

## Fast-Advance Reconciliation

On every coordinator wake:
1. Read team_msg entries with type="fast_advance"
2. Sync active_workers with spawned successors
3. No duplicate spawns
