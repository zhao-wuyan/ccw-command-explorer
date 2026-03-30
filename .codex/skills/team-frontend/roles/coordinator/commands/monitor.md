# Command: Monitor

Event-driven pipeline coordination. Beat model: coordinator wake -> process -> spawn -> STOP.

## Constants

- SPAWN_MODE: background
- ONE_STEP_PER_INVOCATION: true
- FAST_ADVANCE_AWARE: true
- WORKER_AGENT: team-worker
- MAX_GC_ROUNDS: 2

## Handler Router

| Source | Handler |
|--------|---------|
| Message contains [analyst], [architect], [developer], [qa] | handleCallback |
| "check" or "status" | handleCheck |
| "resume" or "continue" | handleResume |
| All tasks completed | handleComplete |
| Default | handleSpawnNext |

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Session state | <session>/session.json | Yes |
| Task list | Read `<session>/tasks.json` | Yes |
| Trigger event | From Entry Router detection | Yes |
| Pipeline definition | From SKILL.md | Yes |

1. Load session.json for current state, `pipeline_mode`, `gc_rounds`
2. Read `<session>/tasks.json` to get current task statuses
3. Identify trigger event type from Entry Router

## Phase 3: Event Handlers

### handleCallback

Triggered when a worker sends completion message.

1. Parse message to identify role and task ID:

| Message Pattern | Role Detection |
|----------------|---------------|
| `[analyst]` or task ID `ANALYZE-*` | analyst |
| `[architect]` or task ID `ARCH-*` | architect |
| `[developer]` or task ID `DEV-*` | developer |
| `[qa]` or task ID `QA-*` | qa |

2. Mark task as completed:

Read `<session>/tasks.json`, find entry by id `<task-id>`, set `"status": "completed"`, write back.

3. Record completion in session state

4. Check if checkpoint applies:

| Completed Task | Pipeline Mode | Checkpoint Action |
|---------------|---------------|-------------------|
| ANALYZE-001 | all | Log: analysis ready |
| ARCH-001 | feature/system | Log: architecture ready for review |
| QA-001 (arch review) | feature/system | Gate: pause if critical issues, wait for architect revision |
| QA-* (code review) | all | Check verdict for GC loop (see below) |

5. **GC Loop Check** (when QA completes with fix_required):

| Condition | Action |
|-----------|--------|
| QA verdict = PASSED or PASSED_WITH_WARNINGS | Proceed to handleSpawnNext |
| QA verdict = FIX_REQUIRED AND gc_round < 2 | Create DEV-fix + QA-recheck tasks, increment gc_round |
| QA verdict = FIX_REQUIRED AND gc_round >= 2 | Escalate to user: accept current state or manual intervention |

**GC Fix Task Creation** -- add new entries to `<session>/tasks.json`:
```json
{
  "id": "DEV-fix-<round>",
  "subject": "DEV-fix-<round>",
  "description": "PURPOSE: Fix issues identified in QA audit | Success: All critical/high issues resolved\nTASK:\n  - Load QA audit report with findings\n  - Address critical and high severity issues\n  - Re-validate fixes against coding standards\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream artifacts: <session>/qa/audit-<NNN>.md\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: Fixed source files | QA issues resolved\nCONSTRAINTS: Targeted fixes only | Do not introduce regressions",
  "status": "pending",
  "owner": "developer",
  "blockedBy": []
}
```

```json
{
  "id": "QA-recheck-<round>",
  "subject": "QA-recheck-<round>",
  "description": "PURPOSE: Re-audit after developer fixes | Success: Score >= 8, critical == 0\nTASK:\n  - Execute 5-dimension audit on fixed code\n  - Focus on previously flagged issues\n  - Calculate new score\nCONTEXT:\n  - Session: <session-folder>\n  - Review type: code-review\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/qa/audit-<NNN>.md | Improved score\nCONSTRAINTS: Read-only review",
  "status": "pending",
  "owner": "qa",
  "blockedBy": ["DEV-fix-<round>"]
}
```

6. Proceed to handleSpawnNext

### handleSpawnNext

Find and spawn the next ready tasks.

1. Scan tasks.json for tasks where:
   - Status is "pending"
   - All blockedBy tasks have status "completed"

2. For each ready task, spawn team-worker:

```
spawn_agent({
  agent_type: "team_worker",
  task_name: taskId,  // e.g., "DEV-001" — enables named targeting
  items: [{
    description: "Spawn <role> worker for <task-id>",
    team_name: "frontend",
    name: "<role>",
    prompt: `## Role Assignment
role: <role>
role_spec: ~  or <project>/.codex/skills/team-frontend/roles/<role>/role.md
session: <session-folder>
session_id: <session-id>
team_name: frontend
requirement: <task-description>
inner_loop: <true|false>

Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 -> role-spec Phase 2-4 -> built-in Phase 5.`
  }]
})
```

3. **Parallel spawn rules**:

| Mode | Scenario | Spawn Behavior |
|------|----------|---------------|
| page | Each stage sequential | One worker at a time |
| feature | After QA-001 arch review | Spawn DEV-001 |
| system | After QA-001 arch review | Spawn ARCH-002 + DEV-001 in parallel |

4. STOP after spawning -- use `wait_agent({ targets: [<spawned-task-names>], timeout_ms: 900000 })` to wait for next callback. If `result.timed_out`, mark tasks as `timed_out` and close agents. Use `close_agent({ target: taskId })` with task_name for cleanup.

**Cross-Agent Supplementary Context** (v4):

When spawning workers in a later pipeline phase, send upstream results as supplementary context to already-running workers:

```
// Example: Send analysis results to running developer
send_message({
  target: "<running-agent-task-name>",
  items: [{ type: "text", text: `## Supplementary Context\n${upstreamFindings}` }]
})
// Note: send_message queues info without interrupting the agent's current work
```

Use `send_message` (not `assign_task`) for supplementary info that enriches but doesn't redirect the agent's current task.

### handleCheck

Output current pipeline status.

```
Pipeline Status (<mode> mode):
  [DONE]  ANALYZE-001  (analyst)    -> design-intelligence.json
  [DONE]  ARCH-001     (architect)  -> design-tokens.json
  [RUN]   DEV-001      (developer)  -> implementing...
  [WAIT]  QA-001       (qa)         -> blocked by DEV-001

GC Rounds: 0/2
Session: <session-id>
```

Output status -- do NOT advance pipeline.

### handleResume

**Agent Health Check** (v4):
```
// Verify actual running agents match session state
const runningAgents = list_agents({})
// For each active_agent in tasks.json:
//   - If agent NOT in runningAgents -> agent crashed
//   - Reset that task to pending, remove from active_agents
// This prevents stale agent references from blocking the pipeline
```

Resume pipeline after user pause or interruption.

1. Audit tasks.json for inconsistencies:
   - Tasks stuck in "in_progress" -> reset to "pending"
   - Tasks with completed blockers but still "pending" -> include in spawn list
2. Proceed to handleSpawnNext

### handleComplete

**Cleanup Verification** (v4):
```
// Verify all agents are properly closed
const remaining = list_agents({})
// If any team agents still running -> close_agent each
// Ensures clean session shutdown
```

Triggered when all pipeline tasks are completed.

**Completion check**:

| Mode | Completion Condition |
|------|---------------------|
| page | All 4 tasks (+ any GC fix/recheck tasks) completed |
| feature | All 5 tasks (+ any GC fix/recheck tasks) completed |
| system | All 7 tasks (+ any GC fix/recheck tasks) completed |

1. If any tasks not completed, return to handleSpawnNext
2. If all completed, transition to coordinator Phase 5

## Phase 4: State Persistence

After every handler execution:

1. Update session.json with current state (active tasks, gc_rounds, last event)
2. Verify tasks.json consistency
3. STOP and wait for next event
