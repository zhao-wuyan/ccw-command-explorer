# Command: Monitor

Handle all coordinator monitoring events: worker callbacks, status checks, pipeline advancement, and completion. Supports single, fan-out, and independent parallel modes with per-branch/pipeline tracking.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Session state | <session>/session.json | Yes |
| Task list | Read `<session>/tasks.json` | Yes |
| Trigger event | From Entry Router detection | Yes |
| Pipeline definition | From SKILL.md | Yes |

1. Load session.json for current state, `parallel_mode`, `branches`, `fix_cycles`
2. Read `<session>/tasks.json` to get current task statuses
3. Identify trigger event type from Entry Router

## Phase 3: Event Handlers

### handleCallback

Triggered when a worker sends completion message.

1. Parse message to identify role, task ID, and **branch/pipeline label**:

| Message Pattern | Branch Detection |
|----------------|-----------------|
| `[optimizer-B01]` or task ID `IMPL-B01` | Branch `B01` (fan-out) |
| `[profiler-A]` or task ID `PROFILE-A01` | Pipeline `A` (independent) |
| `[profiler]` or task ID `PROFILE-001` | No branch (single) |

2. Mark task as completed:

Read `<session>/tasks.json`, find entry by id `<task-id>`, set `"status": "completed"`, write back.

3. Record completion in session state

4. **CP-2.5 check** (auto/fan-out mode only):
   - If completed task is STRATEGY-001 AND `parallel_mode` is `auto` or `fan-out`:
   - Execute **CP-2.5 Branch Creation** subroutine from dispatch.md
   - After branch creation, proceed to handleSpawnNext (spawns all IMPL-B* in parallel)
   - STOP after spawning

5. Check if checkpoint feedback is configured for this stage:

| Completed Task | Checkpoint | Action |
|---------------|------------|--------|
| PROFILE-001 / PROFILE-{P}01 | CP-1 | Notify user: bottleneck report ready for review |
| STRATEGY-001 / STRATEGY-{P}01 | CP-2 | Notify user: optimization plan ready for review |
| STRATEGY-001 (auto/fan-out) | CP-2.5 | Execute branch creation, then notify user with branch count |
| BENCH-* or REVIEW-* | CP-3 | Check verdicts per branch (see Review-Fix Cycle below) |

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
  task_name: taskId,  // e.g., "IMPL-001" — enables named targeting
  items: [{
    description: "Spawn <role> worker for <task-id>",
    team_name: "perf-opt",
    name: "<role>",
    prompt: `## Role Assignment
role: <role>
role_spec: ~  or <project>/.codex/skills/team-perf-opt/roles/<role>/role.md
session: <session-folder>
session_id: <session-id>
team_name: perf-opt
requirement: <task-description>
inner_loop: <true|false>

Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 -> role-spec Phase 2-4 -> built-in Phase 5.`
  }]
})
```

3. **Parallel spawn rules by mode**:

| Mode | Scenario | Spawn Behavior |
|------|----------|---------------|
| Single | Stage 4 ready | Spawn BENCH-001 + REVIEW-001 in parallel |
| Fan-out (CP-2.5 done) | All IMPL-B* unblocked | Spawn ALL IMPL-B* in parallel |
| Fan-out (IMPL-B{NN} done) | BENCH-B{NN} + REVIEW-B{NN} ready | Spawn both for that branch in parallel |
| Independent | Any unblocked task | Spawn all ready tasks across all pipelines in parallel |

4. STOP after spawning -- use `wait_agent({ targets: [<spawned-task-names>], timeout_ms: 900000 })` to wait for next callback. If `result.timed_out`, mark tasks as `timed_out` and close agents. Use `close_agent({ target: taskId })` with task_name for cleanup.

**Cross-Agent Supplementary Context** (v4):

When spawning workers in a later pipeline phase, send upstream results as supplementary context to already-running workers:

```
// Example: Send profiling results to running optimizers
send_message({
  target: "<running-agent-task-name>",
  items: [{ type: "text", text: `## Supplementary Context\n${upstreamFindings}` }]
})
// Note: send_message queues info without interrupting the agent's current work
```

Use `send_message` (not `assign_task`) for supplementary info that enriches but doesn't redirect the agent's current task.

### Review-Fix Cycle (CP-3)

**Per-branch/pipeline scoping**: Each branch/pipeline has its own independent fix cycle.

#### Single Mode (unchanged)

When both BENCH-001 and REVIEW-001 are completed:

1. Read benchmark verdict from shared-memory (benchmarker namespace)
2. Read review verdict from shared-memory (reviewer namespace)

| Bench Verdict | Review Verdict | Action |
|--------------|----------------|--------|
| PASS | APPROVE | -> handleComplete |
| PASS | REVISE | Create FIX task entry with review feedback |
| FAIL | APPROVE | Create FIX task entry with benchmark feedback |
| FAIL | REVISE/REJECT | Create FIX task entry with combined feedback |
| Any | REJECT | Create FIX task entry + flag for strategist re-evaluation |

#### Fan-out Mode (per-branch)

When both BENCH-B{NN} and REVIEW-B{NN} are completed for a specific branch:

1. Read benchmark verdict from `benchmarker.B{NN}` namespace
2. Read review verdict from `reviewer.B{NN}` namespace
3. Apply same verdict matrix as single mode, but scoped to this branch only
4. **Other branches are unaffected** -- they continue independently

#### Independent Mode (per-pipeline)

When both BENCH-{P}01 and REVIEW-{P}01 are completed for a specific pipeline:

1. Read verdicts from `benchmarker.{P}` and `reviewer.{P}` namespaces
2. Apply same verdict matrix, scoped to this pipeline only

#### Fix Cycle Count Tracking

Fix cycles are tracked per branch/pipeline in `session.json`:

```json
// Single mode
{ "fix_cycles": { "main": 0 } }

// Fan-out mode
{ "fix_cycles": { "B01": 0, "B02": 1, "B03": 0 } }

// Independent mode
{ "fix_cycles": { "A": 0, "B": 2 } }
```

| Cycle Count | Action |
|-------------|--------|
| < 3 | Add FIX task entry to tasks.json, increment cycle count for this branch/pipeline |
| >= 3 | Escalate THIS branch/pipeline to user. Other branches continue |

#### FIX Task Creation (branched)

**Fan-out mode** -- add new entry to `<session>/tasks.json`:
```json
{
  "id": "FIX-B{NN}-{cycle}",
  "subject": "FIX-B{NN}-{cycle}",
  "description": "PURPOSE: Fix issues in branch B{NN} from review/benchmark | Success: All flagged issues resolved\nTASK:\n  - Address review findings: <specific-findings>\n  - Fix benchmark regressions: <specific-regressions>\n  - Re-validate after fixes\nCONTEXT:\n  - Session: <session-folder>\n  - Branch: B{NN}\n  - Upstream artifacts: branches/B{NN}/review-report.md, branches/B{NN}/benchmark-results.json\n  - Shared memory: <session>/.msg/meta.json (namespace: optimizer.B{NN})\nEXPECTED: Fixed source files for B{NN} only\nCONSTRAINTS: Targeted fixes only | Do not touch other branches\n---\nInnerLoop: false\nBranchId: B{NN}",
  "status": "pending",
  "owner": "optimizer",
  "blockedBy": []
}
```

Create new BENCH and REVIEW entries with retry suffix:
- `BENCH-B{NN}-R{cycle}` blocked on `FIX-B{NN}-{cycle}`
- `REVIEW-B{NN}-R{cycle}` blocked on `FIX-B{NN}-{cycle}`

**Independent mode** -- add new entry to `<session>/tasks.json`:
```json
{
  "id": "FIX-{P}01-{cycle}",
  "...same pattern with pipeline prefix...",
  "status": "pending",
  "owner": "optimizer",
  "blockedBy": []
}
```

Create `BENCH-{P}01-R{cycle}` and `REVIEW-{P}01-R{cycle}` entries.

### handleCheck

Output current pipeline status grouped by branch/pipeline.

**Single mode** (unchanged):
```
Pipeline Status:
  [DONE]  PROFILE-001  (profiler)    -> bottleneck-report.md
  [DONE]  STRATEGY-001 (strategist)  -> optimization-plan.md
  [RUN]   IMPL-001     (optimizer)   -> implementing...
  [WAIT]  BENCH-001    (benchmarker) -> blocked by IMPL-001
  [WAIT]  REVIEW-001   (reviewer)    -> blocked by IMPL-001

Fix Cycles: 0/3
Session: <session-id>
```

**Fan-out mode**:
```
Pipeline Status (fan-out, 3 branches):
  Shared Stages:
    [DONE]  PROFILE-001  (profiler)    -> bottleneck-report.md
    [DONE]  STRATEGY-001 (strategist)  -> optimization-plan.md (4 OPT-IDs)

  Branch B01 (OPT-001: <title>):
    [RUN]   IMPL-B01     (optimizer)   -> implementing...
    [WAIT]  BENCH-B01    (benchmarker) -> blocked by IMPL-B01
    [WAIT]  REVIEW-B01   (reviewer)    -> blocked by IMPL-B01
    Fix Cycles: 0/3

  Branch B02 (OPT-002: <title>):
    [DONE]  IMPL-B02     (optimizer)   -> done
    [RUN]   BENCH-B02    (benchmarker) -> benchmarking...
    [RUN]   REVIEW-B02   (reviewer)    -> reviewing...
    Fix Cycles: 0/3

  Branch B03 (OPT-003: <title>):
    [FAIL]  IMPL-B03     (optimizer)   -> failed
    Fix Cycles: 0/3 [BRANCH FAILED]

Session: <session-id>
```

**Independent mode**:
```
Pipeline Status (independent, 2 pipelines):
  Pipeline A (target: optimize rendering):
    [DONE]  PROFILE-A01  -> [DONE]  STRATEGY-A01 -> [RUN] IMPL-A01 -> ...
    Fix Cycles: 0/3

  Pipeline B (target: optimize API):
    [DONE]  PROFILE-B01  -> [DONE]  STRATEGY-B01 -> [DONE] IMPL-B01 -> ...
    Fix Cycles: 1/3

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
2. For fan-out/independent: check each branch/pipeline independently
3. Proceed to handleSpawnNext

### handleConsensus

Handle consensus_blocked signals from discuss rounds.

| Severity | Action |
|----------|--------|
| HIGH | Pause pipeline (or branch), notify user with findings summary |
| MEDIUM | Create revision task entry for the blocked role (scoped to branch if applicable) |
| LOW | Log finding, continue pipeline |

### handleComplete

**Cleanup Verification** (v4):
```
// Verify all agents are properly closed
const remaining = list_agents({})
// If any team agents still running -> close_agent each
// Ensures clean session shutdown
```

Triggered when all pipeline tasks are completed and no fix cycles remain.

**Completion check varies by mode**:

| Mode | Completion Condition |
|------|---------------------|
| Single | All 5 tasks (+ any FIX/retry tasks) have status "completed" |
| Fan-out | ALL branches have BENCH + REVIEW completed with PASS/APPROVE (or escalated), shared stages done |
| Independent | ALL pipelines have BENCH + REVIEW completed with PASS/APPROVE (or escalated) |

**Aggregate results** before transitioning to Phase 5:

1. For fan-out mode: collect per-branch benchmark results into `<session>/artifacts/aggregate-results.json`:
   ```json
   {
     "branches": {
       "B01": { "opt_id": "OPT-001", "bench_verdict": "PASS", "review_verdict": "APPROVE", "improvement": "..." },
       "B02": { "opt_id": "OPT-002", "bench_verdict": "PASS", "review_verdict": "APPROVE", "improvement": "..." },
       "B03": { "status": "failed", "reason": "IMPL failed" }
     },
     "overall": { "total_branches": 3, "passed": 2, "failed": 1 }
   }
   ```

2. For independent mode: collect per-pipeline results similarly

3. If any tasks not completed, return to handleSpawnNext
4. If all completed (allowing for failed branches marked as such), transition to coordinator Phase 5

### handleRevise

Triggered by user "revise <TASK-ID> [feedback]" command.

1. Parse target task ID and optional feedback
2. Detect branch/pipeline from task ID pattern
3. Add revision task entry to tasks.json with same role but updated requirements, scoped to branch
4. Skip blockedBy (no dependencies, immediate execution)
5. Cascade: create new downstream task entries within same branch only
6. Proceed to handleSpawnNext

### handleFeedback

Triggered by user "feedback <text>" command.

1. Analyze feedback text to determine impact scope
2. Identify which pipeline stage, role, and branch/pipeline should handle the feedback
3. Add targeted revision task entry to tasks.json (scoped to branch if applicable)
4. Proceed to handleSpawnNext

## Phase 4: State Persistence

After every handler execution:

1. Update session.json with current state (active tasks, fix cycle counts per branch, last event, resolved parallel_mode)
2. Verify tasks.json consistency
3. STOP and wait for next event
