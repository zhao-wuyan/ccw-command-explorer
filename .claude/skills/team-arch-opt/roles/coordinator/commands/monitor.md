# Command: Monitor

Handle all coordinator monitoring events: worker callbacks, status checks, pipeline advancement, and completion. Supports single, fan-out, and independent parallel modes with per-branch/pipeline tracking.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Session state | <session>/session.json | Yes |
| Task list | TaskList() | Yes |
| Trigger event | From Entry Router detection | Yes |
| Pipeline definition | From SKILL.md | Yes |

1. Load session.json for current state, `parallel_mode`, `branches`, `fix_cycles`
2. Run TaskList() to get current task statuses
3. Identify trigger event type from Entry Router

## Phase 3: Event Handlers

### handleCallback

Triggered when a worker sends completion message.

1. Parse message to identify role, task ID, and **branch/pipeline label**:

| Message Pattern | Branch Detection |
|----------------|-----------------|
| `[refactorer-B01]` or task ID `REFACTOR-B01` | Branch `B01` (fan-out) |
| `[analyzer-A]` or task ID `ANALYZE-A01` | Pipeline `A` (independent) |
| `[analyzer]` or task ID `ANALYZE-001` | No branch (single) |

2. Mark task as completed:

```
TaskUpdate({ taskId: "<task-id>", status: "completed" })
```

3. Record completion in session state

4. **CP-2.5 check** (auto/fan-out mode only):
   - If completed task is DESIGN-001 AND `parallel_mode` is `auto` or `fan-out`:
   - Execute **CP-2.5 Branch Creation** subroutine from dispatch.md
   - After branch creation, proceed to handleSpawnNext (spawns all REFACTOR-B* in parallel)
   - STOP after spawning

5. Check if checkpoint feedback is configured for this stage:

| Completed Task | Checkpoint | Action |
|---------------|------------|--------|
| ANALYZE-001 / ANALYZE-{P}01 | CP-1 | Notify user: architecture report ready for review |
| DESIGN-001 / DESIGN-{P}01 | CP-2 | Notify user: refactoring plan ready for review |
| DESIGN-001 (auto/fan-out) | CP-2.5 | Execute branch creation, then notify user with branch count |
| VALIDATE-* or REVIEW-* | CP-3 | Check verdicts per branch (see Review-Fix Cycle below) |

6. Proceed to handleSpawnNext

### handleSpawnNext

Find and spawn the next ready tasks.

1. Scan task list for tasks where:
   - Status is "pending"
   - All blockedBy tasks have status "completed"

2. For each ready task, spawn team-worker:

```
Task({
  subagent_type: "team-worker",
  description: "Spawn <role> worker for <task-id>",
  team_name: "arch-opt",
  name: "<role>",
  run_in_background: true,
  prompt: `## Role Assignment
role: <role>
role_spec: .claude/skills/team-arch-opt/role-specs/<role>.md
session: <session-folder>
session_id: <session-id>
team_name: arch-opt
requirement: <task-description>
inner_loop: <true|false>

Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 -> role-spec Phase 2-4 -> built-in Phase 5.`
})
```

3. **Parallel spawn rules by mode**:

| Mode | Scenario | Spawn Behavior |
|------|----------|---------------|
| Single | Stage 4 ready | Spawn VALIDATE-001 + REVIEW-001 in parallel |
| Fan-out (CP-2.5 done) | All REFACTOR-B* unblocked | Spawn ALL REFACTOR-B* in parallel |
| Fan-out (REFACTOR-B{NN} done) | VALIDATE-B{NN} + REVIEW-B{NN} ready | Spawn both for that branch in parallel |
| Independent | Any unblocked task | Spawn all ready tasks across all pipelines in parallel |

4. STOP after spawning -- wait for next callback

### Review-Fix Cycle (CP-3)

**Per-branch/pipeline scoping**: Each branch/pipeline has its own independent fix cycle.

#### Single Mode (unchanged)

When both VALIDATE-001 and REVIEW-001 are completed:

1. Read validation verdict from shared-memory (validator namespace)
2. Read review verdict from shared-memory (reviewer namespace)

| Validate Verdict | Review Verdict | Action |
|-----------------|----------------|--------|
| PASS | APPROVE | -> handleComplete |
| PASS | REVISE | Create FIX task with review feedback |
| FAIL | APPROVE | Create FIX task with validation feedback |
| FAIL | REVISE/REJECT | Create FIX task with combined feedback |
| Any | REJECT | Create FIX task + flag for designer re-evaluation |

#### Fan-out Mode (per-branch)

When both VALIDATE-B{NN} and REVIEW-B{NN} are completed for a specific branch:

1. Read validation verdict from `validator.B{NN}` namespace
2. Read review verdict from `reviewer.B{NN}` namespace
3. Apply same verdict matrix as single mode, but scoped to this branch only
4. **Other branches are unaffected** -- they continue independently

#### Independent Mode (per-pipeline)

When both VALIDATE-{P}01 and REVIEW-{P}01 are completed for a specific pipeline:

1. Read verdicts from `validator.{P}` and `reviewer.{P}` namespaces
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
| < 3 | Create FIX task, increment cycle count for this branch/pipeline |
| >= 3 | Escalate THIS branch/pipeline to user. Other branches continue |

#### FIX Task Creation (branched)

**Fan-out mode**:
```
TaskCreate({
  subject: "FIX-B{NN}-{cycle}",
  description: "PURPOSE: Fix issues in branch B{NN} from review/validation | Success: All flagged issues resolved
TASK:
  - Address review findings: <specific-findings>
  - Fix validation failures: <specific-failures>
  - Re-validate after fixes
CONTEXT:
  - Session: <session-folder>
  - Branch: B{NN}
  - Upstream artifacts: branches/B{NN}/review-report.md, branches/B{NN}/validation-results.json
  - Shared memory: <session>/wisdom/shared-memory.json (namespace: refactorer.B{NN})
EXPECTED: Fixed source files for B{NN} only
CONSTRAINTS: Targeted fixes only | Do not touch other branches
---
InnerLoop: false
BranchId: B{NN}",
  blockedBy: [],
  status: "pending"
})
```

Create new VALIDATE and REVIEW with retry suffix:
- `VALIDATE-B{NN}-R{cycle}` blocked on `FIX-B{NN}-{cycle}`
- `REVIEW-B{NN}-R{cycle}` blocked on `FIX-B{NN}-{cycle}`

**Independent mode**:
```
TaskCreate({
  subject: "FIX-{P}01-{cycle}",
  ...same pattern with pipeline prefix...
  blockedBy: [],
  status: "pending"
})
```

Create `VALIDATE-{P}01-R{cycle}` and `REVIEW-{P}01-R{cycle}`.

### handleCheck

Output current pipeline status grouped by branch/pipeline.

**Single mode** (unchanged):
```
Pipeline Status:
  [DONE]  ANALYZE-001  (analyzer)     -> architecture-report.md
  [DONE]  DESIGN-001   (designer)     -> refactoring-plan.md
  [RUN]   REFACTOR-001 (refactorer)   -> refactoring...
  [WAIT]  VALIDATE-001 (validator)    -> blocked by REFACTOR-001
  [WAIT]  REVIEW-001   (reviewer)     -> blocked by REFACTOR-001

Fix Cycles: 0/3
Session: <session-id>
```

**Fan-out mode**:
```
Pipeline Status (fan-out, 3 branches):
  Shared Stages:
    [DONE]  ANALYZE-001  (analyzer)   -> architecture-report.md
    [DONE]  DESIGN-001   (designer)   -> refactoring-plan.md (4 REFACTOR-IDs)

  Branch B01 (REFACTOR-001: <title>):
    [RUN]   REFACTOR-B01 (refactorer) -> refactoring...
    [WAIT]  VALIDATE-B01 (validator)  -> blocked by REFACTOR-B01
    [WAIT]  REVIEW-B01   (reviewer)   -> blocked by REFACTOR-B01
    Fix Cycles: 0/3

  Branch B02 (REFACTOR-002: <title>):
    [DONE]  REFACTOR-B02 (refactorer) -> done
    [RUN]   VALIDATE-B02 (validator)  -> validating...
    [RUN]   REVIEW-B02   (reviewer)   -> reviewing...
    Fix Cycles: 0/3

  Branch B03 (REFACTOR-003: <title>):
    [FAIL]  REFACTOR-B03 (refactorer) -> failed
    Fix Cycles: 0/3 [BRANCH FAILED]

Session: <session-id>
```

**Independent mode**:
```
Pipeline Status (independent, 2 pipelines):
  Pipeline A (target: refactor auth module):
    [DONE]  ANALYZE-A01  -> [DONE]  DESIGN-A01 -> [RUN] REFACTOR-A01 -> ...
    Fix Cycles: 0/3

  Pipeline B (target: refactor API layer):
    [DONE]  ANALYZE-B01  -> [DONE]  DESIGN-B01 -> [DONE] REFACTOR-B01 -> ...
    Fix Cycles: 1/3

Session: <session-id>
```

Output status -- do NOT advance pipeline.

### handleResume

Resume pipeline after user pause or interruption.

1. Audit task list for inconsistencies:
   - Tasks stuck in "in_progress" -> reset to "pending"
   - Tasks with completed blockers but still "pending" -> include in spawn list
2. For fan-out/independent: check each branch/pipeline independently
3. Proceed to handleSpawnNext

### handleConsensus

Handle consensus_blocked signals from discuss rounds.

| Severity | Action |
|----------|--------|
| HIGH | Pause pipeline (or branch), notify user with findings summary |
| MEDIUM | Create revision task for the blocked role (scoped to branch if applicable) |
| LOW | Log finding, continue pipeline |

### handleComplete

Triggered when all pipeline tasks are completed and no fix cycles remain.

**Completion check varies by mode**:

| Mode | Completion Condition |
|------|---------------------|
| Single | All 5 tasks (+ any FIX/retry tasks) have status "completed" |
| Fan-out | ALL branches have VALIDATE + REVIEW completed with PASS/APPROVE (or escalated), shared stages done |
| Independent | ALL pipelines have VALIDATE + REVIEW completed with PASS/APPROVE (or escalated) |

**Aggregate results** before transitioning to Phase 5:

1. For fan-out mode: collect per-branch validation results into `<session>/artifacts/aggregate-results.json`:
   ```json
   {
     "branches": {
       "B01": { "refactor_id": "REFACTOR-001", "validate_verdict": "PASS", "review_verdict": "APPROVE", "improvement": "..." },
       "B02": { "refactor_id": "REFACTOR-002", "validate_verdict": "PASS", "review_verdict": "APPROVE", "improvement": "..." },
       "B03": { "status": "failed", "reason": "REFACTOR failed" }
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
3. Create revision task with same role but updated requirements, scoped to branch
4. Set blockedBy to empty (immediate execution)
5. Cascade: create new downstream tasks within same branch only
6. Proceed to handleSpawnNext

### handleFeedback

Triggered by user "feedback <text>" command.

1. Analyze feedback text to determine impact scope
2. Identify which pipeline stage, role, and branch/pipeline should handle the feedback
3. Create targeted revision task (scoped to branch if applicable)
4. Proceed to handleSpawnNext

## Phase 4: State Persistence

After every handler execution:

1. Update session.json with current state (active tasks, fix cycle counts per branch, last event, resolved parallel_mode)
2. Verify task list consistency
3. STOP and wait for next event
