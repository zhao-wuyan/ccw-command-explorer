---
name: team-arch-opt
description: Unified team skill for architecture optimization. Uses team-worker agent architecture with role-spec files for domain logic. Coordinator orchestrates pipeline, workers are team-worker agents. Triggers on "team arch-opt".
allowed-tools: Task, TaskCreate, TaskList, TaskGet, TaskUpdate, TeamCreate, TeamDelete, SendMessage, AskUserQuestion, Read, Write, Edit, Bash, Glob, Grep, mcp__ace-tool__search_context
---

# Team Architecture Optimization

Unified team skill: Analyze codebase architecture, identify structural issues (dependency cycles, coupling/cohesion, layering violations, God Classes, dead code), design refactoring strategies, implement changes, validate improvements, and review code quality. Built on **team-worker agent architecture** -- all worker roles share a single agent definition with role-specific Phase 2-4 loaded from markdown specs.

## Architecture

```
+---------------------------------------------------+
|  Skill(skill="team-arch-opt")                      |
|  args="<task-description>"                         |
+-------------------+-------------------------------+
                    |
         Orchestration Mode (auto -> coordinator)
                    |
              Coordinator (inline)
              Phase 0-5 orchestration
                    |
    +-------+-------+-------+-------+-------+
    v       v       v       v       v
 [tw]    [tw]    [tw]    [tw]    [tw]
analyzer desig-  refact- valid-  review-
         ner     orer    ator    er

  Subagents (callable by workers, not team members):
    [explore]  [discuss]

(tw) = team-worker agent
```

## Role Router

This skill is **coordinator-only**. Workers do NOT invoke this skill -- they are spawned as `team-worker` agents directly.

### Input Parsing

Parse `$ARGUMENTS`. No `--role` needed -- always routes to coordinator.

### Role Registry

| Role | Spec | Task Prefix | Type | Inner Loop |
|------|------|-------------|------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | (none) | orchestrator | - |
| analyzer | [role-specs/analyzer.md](role-specs/analyzer.md) | ANALYZE-* | orchestration | false |
| designer | [role-specs/designer.md](role-specs/designer.md) | DESIGN-* | orchestration | false |
| refactorer | [role-specs/refactorer.md](role-specs/refactorer.md) | REFACTOR-* / FIX-* | code_generation | true |
| validator | [role-specs/validator.md](role-specs/validator.md) | VALIDATE-* | validation | false |
| reviewer | [role-specs/reviewer.md](role-specs/reviewer.md) | REVIEW-* / QUALITY-* | read_only_analysis | false |

### Subagent Registry

| Subagent | Spec | Callable By | Purpose |
|----------|------|-------------|---------|
| explore | [subagents/explore-subagent.md](subagents/explore-subagent.md) | analyzer, refactorer | Shared codebase exploration for architecture-critical structures and dependency graphs |
| discuss | [subagents/discuss-subagent.md](subagents/discuss-subagent.md) | designer, reviewer | Multi-perspective discussion for refactoring approaches and review findings |

### Dispatch

Always route to coordinator. Coordinator reads `roles/coordinator/role.md` and executes its phases.

### Orchestration Mode

User just provides task description.

**Invocation**:
```bash
Skill(skill="team-arch-opt", args="<task-description>")                           # auto mode
Skill(skill="team-arch-opt", args="--parallel-mode=fan-out <task-description>")    # force fan-out
Skill(skill="team-arch-opt", args='--parallel-mode=independent "target1" "target2"')  # independent
Skill(skill="team-arch-opt", args="--max-branches=3 <task-description>")           # limit branches
```

**Parallel Modes**:

| Mode | Description | When to Use |
|------|-------------|------------|
| `auto` (default) | count <= 2 -> single, count >= 3 -> fan-out | General refactoring requests |
| `single` | Linear pipeline, no branching | Simple or tightly coupled refactorings |
| `fan-out` | Shared ANALYZE+DESIGN, then N parallel REFACTOR->VALIDATE+REVIEW branches | Multiple independent architecture issues |
| `independent` | M fully independent pipelines from analysis to review | Separate refactoring targets |

**Lifecycle**:
```
User provides task description + optional --parallel-mode / --max-branches
  -> coordinator Phase 1-3: Parse flags -> TeamCreate -> Create task chain (mode-aware)
  -> coordinator Phase 4: spawn first batch workers (background) -> STOP
  -> Worker (team-worker agent) executes -> SendMessage callback -> coordinator advances
  -> [auto/fan-out] CP-2.5: Design complete -> create N branch tasks -> spawn all REFACTOR-B* in parallel
  -> [independent] All pipelines run in parallel from the start
  -> Per-branch/pipeline fix cycles run independently
  -> All branches/pipelines complete -> AGGREGATE -> Phase 5 report + completion action
```

**User Commands** (wake paused coordinator):

| Command | Action |
|---------|--------|
| `check` / `status` | Output execution status graph (branch-grouped), no advancement |
| `resume` / `continue` | Check worker states, advance next step |
| `revise <TASK-ID> [feedback]` | Create revision task + cascade downstream (scoped to branch) |
| `feedback <text>` | Analyze feedback impact, create targeted revision chain |
| `recheck` | Re-run quality check |
| `improve [dimension]` | Auto-improve weakest dimension |

---

## Command Execution Protocol

When coordinator needs to execute a command (dispatch, monitor):

1. **Read the command file**: `roles/coordinator/commands/<command-name>.md`
2. **Follow the workflow** defined in the command file (Phase 2-4 structure)
3. **Commands are inline execution guides** -- NOT separate agents or subprocesses
4. **Execute synchronously** -- complete the command workflow before proceeding

Example:
```
Phase 3 needs task dispatch
  -> Read roles/coordinator/commands/dispatch.md
  -> Execute Phase 2 (Context Loading)
  -> Execute Phase 3 (Task Chain Creation)
  -> Execute Phase 4 (Validation)
  -> Continue to Phase 4
```

---

## Coordinator Spawn Template

### v5 Worker Spawn (all roles)

When coordinator spawns workers, use `team-worker` agent with role-spec path:

```
Task({
  subagent_type: "team-worker",
  description: "Spawn <role> worker",
  team_name: <team-name>,
  name: "<role>",
  run_in_background: true,
  prompt: `## Role Assignment
role: <role>
role_spec: .claude/skills/team-arch-opt/role-specs/<role>.md
session: <session-folder>
session_id: <session-id>
team_name: <team-name>
requirement: <task-description>
inner_loop: <true|false>

Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 (task discovery) -> role-spec Phase 2-4 -> built-in Phase 5 (report).`
})
```

**Inner Loop roles** (refactorer): Set `inner_loop: true`. The team-worker agent handles the loop internally.

**Single-task roles** (analyzer, designer, validator, reviewer): Set `inner_loop: false`.

---

## Pipeline Definitions

### Pipeline Diagrams

**Single Mode** (linear, backward compatible):
```
Pipeline: Single (Linear with Review-Fix Cycle)
=====================================================================
Stage 1           Stage 2           Stage 3           Stage 4
ANALYZE-001  -->  DESIGN-001   -->  REFACTOR-001 --> VALIDATE-001
[analyzer]        [designer]        [refactorer]     [validator]
                                        ^               |
                                        +<--FIX-001---->+
                                        |          REVIEW-001
                                        +<-------->  [reviewer]
                                  (max 3 iterations)    |
                                                   COMPLETE
=====================================================================
```

**Fan-out Mode** (shared stages 1-2, parallel branches 3-4):
```
Pipeline: Fan-out (N parallel refactoring branches)
=====================================================================
Stage 1           Stage 2         CP-2.5          Stage 3+4 (per branch)
                                (branch creation)
ANALYZE-001 --> DESIGN-001   --+-> REFACTOR-B01 --> VALIDATE-B01 + REVIEW-B01 (fix cycle)
[analyzer]      [designer]     |   [refactorer]     [validator]    [reviewer]
                               +-> REFACTOR-B02 --> VALIDATE-B02 + REVIEW-B02 (fix cycle)
                               |   [refactorer]     [validator]    [reviewer]
                               +-> REFACTOR-B0N --> VALIDATE-B0N + REVIEW-B0N (fix cycle)
                                                                |
                                                           AGGREGATE -> Phase 5
=====================================================================
```

**Independent Mode** (M fully independent pipelines):
```
Pipeline: Independent (M complete pipelines)
=====================================================================
Pipeline A: ANALYZE-A01 --> DESIGN-A01 --> REFACTOR-A01 --> VALIDATE-A01 + REVIEW-A01
Pipeline B: ANALYZE-B01 --> DESIGN-B01 --> REFACTOR-B01 --> VALIDATE-B01 + REVIEW-B01
Pipeline C: ANALYZE-C01 --> DESIGN-C01 --> REFACTOR-C01 --> VALIDATE-C01 + REVIEW-C01
                                                            |
                                                       AGGREGATE -> Phase 5
=====================================================================
```

### Cadence Control

**Beat model**: Event-driven, each beat = coordinator wake -> process -> spawn -> STOP.

```
Beat Cycle (single beat)
======================================================================
  Event                   Coordinator              Workers
----------------------------------------------------------------------
  callback/resume --> +- handleCallback -+
                      |  mark completed   |
                      |  check pipeline   |
                      +- handleSpawnNext -+
                      |  find ready tasks |
                      |  spawn workers ---+--> [team-worker A] Phase 1-5
                      |  (parallel OK)  --+--> [team-worker B] Phase 1-5
                      +- STOP (idle) -----+         |
                                                     |
  callback <-----------------------------------------+
  (next beat)              SendMessage + TaskUpdate(completed)
======================================================================

  Fast-Advance (skips coordinator for simple linear successors)
======================================================================
  [Worker A] Phase 5 complete
    +- 1 ready task? simple successor?
    |   --> spawn team-worker B directly
    |   --> log fast_advance to message bus (coordinator syncs on next wake)
    +- complex case? --> SendMessage to coordinator
======================================================================
```

```
Beat View: Architecture Optimization Pipeline
======================================================================
  Event                   Coordinator              Workers
----------------------------------------------------------------------
  new task         --> +- Phase 1-3: clarify -+
                       |  TeamCreate           |
                       |  create ANALYZE-001   |
                       +- Phase 4: spawn ------+--> [analyzer] Phase 1-5
                       +- STOP (idle) ---------+         |
                                                          |
  callback <----------------------------------------------+
  (analyzer done)  --> +- handleCallback ------+    analyze_complete
                       |  mark ANALYZE done    |
                       |  spawn designer ------+--> [designer] Phase 1-5
                       +- STOP ----------------+         |
                                                          |
  callback <----------------------------------------------+
  (designer done)  --> +- handleCallback ------+    design_complete
                       |  mark DESIGN done     |
                       |  spawn refactorer ----+--> [refactorer] Phase 1-5
                       +- STOP ----------------+         |
                                                          |
  callback <----------------------------------------------+
  (refactorer done)--> +- handleCallback ------+    refactor_complete
                       |  mark REFACTOR done   |
                       |  spawn valid+reviewer-+--> [validator] Phase 1-5
                       |  (parallel)    -------+--> [reviewer] Phase 1-5
                       +- STOP ----------------+    |           |
                                                     |           |
  callback x2 <--------------------------------------+-----------+
                  --> +- handleCallback ------+
                       |  both done?           |
                       |  YES + pass -> Phase 5|
                       |  NO / fail -> FIX task|
                       |  spawn refactorer ----+--> [refactorer] FIX-001
                       +- STOP or Phase 5 -----+
======================================================================
```

**Checkpoints**:

| Checkpoint | Trigger | Location | Behavior |
|------------|---------|----------|----------|
| CP-1 | ANALYZE-001 complete | After Stage 1 | User reviews architecture report, can refine scope |
| CP-2 | DESIGN-001 complete | After Stage 2 | User reviews refactoring plan, can adjust priorities |
| CP-2.5 | DESIGN-001 complete (auto/fan-out) | After Stage 2 | Auto-create N branch tasks from refactoring plan, spawn all REFACTOR-B* in parallel |
| CP-3 | REVIEW/VALIDATE fail | Stage 4 (per-branch) | Auto-create FIX task for that branch only (max 3x per branch) |
| CP-4 | All tasks/branches complete | Phase 5 | Aggregate results, interactive completion action |

### Task Metadata Registry

**Single mode** (backward compatible):

| Task ID | Role | Phase | Dependencies | Description |
|---------|------|-------|-------------|-------------|
| ANALYZE-001 | analyzer | Stage 1 | (none) | Analyze architecture, identify structural issues |
| DESIGN-001 | designer | Stage 2 | ANALYZE-001 | Design refactoring plan from architecture report |
| REFACTOR-001 | refactorer | Stage 3 | DESIGN-001 | Implement highest-priority refactorings |
| VALIDATE-001 | validator | Stage 4 | REFACTOR-001 | Validate build, tests, metrics, API compatibility |
| REVIEW-001 | reviewer | Stage 4 | REFACTOR-001 | Review refactoring code for correctness |
| FIX-001 | refactorer | Stage 3 (cycle) | REVIEW-001 or VALIDATE-001 | Fix issues found in review/validation |

**Fan-out mode** (branch tasks created at CP-2.5):

| Task ID | Role | Phase | Dependencies | Description |
|---------|------|-------|-------------|-------------|
| ANALYZE-001 | analyzer | Stage 1 (shared) | (none) | Analyze architecture |
| DESIGN-001 | designer | Stage 2 (shared) | ANALYZE-001 | Design plan with discrete REFACTOR-IDs |
| REFACTOR-B{NN} | refactorer | Stage 3 (branch) | DESIGN-001 | Implement REFACTOR-{NNN} only |
| VALIDATE-B{NN} | validator | Stage 4 (branch) | REFACTOR-B{NN} | Validate branch B{NN} |
| REVIEW-B{NN} | reviewer | Stage 4 (branch) | REFACTOR-B{NN} | Review branch B{NN} |
| FIX-B{NN}-{cycle} | refactorer | Fix (branch) | (none) | Fix issues in branch B{NN} |
| VALIDATE-B{NN}-R{cycle} | validator | Retry (branch) | FIX-B{NN}-{cycle} | Re-validate after fix |
| REVIEW-B{NN}-R{cycle} | reviewer | Retry (branch) | FIX-B{NN}-{cycle} | Re-review after fix |

**Independent mode**:

| Task ID | Role | Phase | Dependencies | Description |
|---------|------|-------|-------------|-------------|
| ANALYZE-{P}01 | analyzer | Stage 1 | (none) | Analyze for pipeline {P} target |
| DESIGN-{P}01 | designer | Stage 2 | ANALYZE-{P}01 | Design for pipeline {P} |
| REFACTOR-{P}01 | refactorer | Stage 3 | DESIGN-{P}01 | Implement pipeline {P} refactorings |
| VALIDATE-{P}01 | validator | Stage 4 | REFACTOR-{P}01 | Validate pipeline {P} |
| REVIEW-{P}01 | reviewer | Stage 4 | REFACTOR-{P}01 | Review pipeline {P} |
| FIX-{P}01-{cycle} | refactorer | Fix | (none) | Fix issues in pipeline {P} |

### Task Naming Rules

| Mode | Stage 3 | Stage 4 | Fix | Retry |
|------|---------|---------|-----|-------|
| Single | REFACTOR-001 | VALIDATE-001, REVIEW-001 | FIX-001 | VALIDATE-001-R1, REVIEW-001-R1 |
| Fan-out | REFACTOR-B01 | VALIDATE-B01, REVIEW-B01 | FIX-B01-1 | VALIDATE-B01-R1, REVIEW-B01-R1 |
| Independent | REFACTOR-A01 | VALIDATE-A01, REVIEW-A01 | FIX-A01-1 | VALIDATE-A01-R1, REVIEW-A01-R1 |

---

## Completion Action

When the pipeline completes (all tasks done, coordinator Phase 5):

```
AskUserQuestion({
  questions: [{
    question: "Team pipeline complete. What would you like to do?",
    header: "Completion",
    multiSelect: false,
    options: [
      { label: "Archive & Clean (Recommended)", description: "Archive session, clean up tasks and team resources" },
      { label: "Keep Active", description: "Keep session active for follow-up work or inspection" },
      { label: "Export Results", description: "Export deliverables to a specified location, then clean" }
    ]
  }]
})
```

| Choice | Action |
|--------|--------|
| Archive & Clean | Update session status="completed" -> TeamDelete(arch-opt) -> output final summary |
| Keep Active | Update session status="paused" -> output resume instructions: `Skill(skill="team-arch-opt", args="resume")` |
| Export Results | AskUserQuestion for target path -> copy deliverables -> Archive & Clean |

---

## Session Directory

**Single mode**:
```
.workflow/<session-id>/
+-- session.json                    # Session metadata + status + parallel_mode
+-- artifacts/
|   +-- architecture-baseline.json  # Analyzer: pre-refactoring metrics
|   +-- architecture-report.md      # Analyzer: ranked structural issue findings
|   +-- refactoring-plan.md         # Designer: prioritized refactoring plan
|   +-- validation-results.json     # Validator: post-refactoring validation
|   +-- review-report.md            # Reviewer: code review findings
+-- explorations/
|   +-- cache-index.json            # Shared explore cache
|   +-- <hash>.md                   # Cached exploration results
+-- wisdom/
|   +-- patterns.md                 # Discovered patterns and conventions
|   +-- shared-memory.json          # Cross-role structured data
+-- discussions/
|   +-- DISCUSS-REFACTOR.md         # Refactoring design discussion record
|   +-- DISCUSS-REVIEW.md           # Review discussion record
```

**Fan-out mode** (adds branches/ directory):
```
.workflow/<session-id>/
+-- session.json                    # + parallel_mode, branches, fix_cycles
+-- artifacts/
|   +-- architecture-baseline.json  # Shared baseline (all branches use this)
|   +-- architecture-report.md      # Shared architecture report
|   +-- refactoring-plan.md         # Shared plan with discrete REFACTOR-IDs
|   +-- aggregate-results.json      # Aggregated results from all branches
|   +-- branches/
|       +-- B01/
|       |   +-- refactoring-detail.md    # Extracted REFACTOR-001 detail
|       |   +-- validation-results.json  # Branch B01 validation
|       |   +-- review-report.md         # Branch B01 review
|       +-- B02/
|       |   +-- refactoring-detail.md
|       |   +-- validation-results.json
|       |   +-- review-report.md
|       +-- B0N/
+-- explorations/ wisdom/ discussions/  # Same as single
```

**Independent mode** (adds pipelines/ directory):
```
.workflow/<session-id>/
+-- session.json                    # + parallel_mode, independent_targets, fix_cycles
+-- artifacts/
|   +-- aggregate-results.json      # Aggregated results from all pipelines
|   +-- pipelines/
|       +-- A/
|       |   +-- architecture-baseline.json
|       |   +-- architecture-report.md
|       |   +-- refactoring-plan.md
|       |   +-- validation-results.json
|       |   +-- review-report.md
|       +-- B/
|           +-- architecture-baseline.json
|           +-- ...
+-- explorations/ wisdom/ discussions/  # Same as single
```

## Session Resume

Coordinator supports `--resume` / `--continue` for interrupted sessions:

1. Scan session directory for sessions with status "active" or "paused"
2. Multiple matches -> AskUserQuestion for selection
3. Audit TaskList -> reconcile session state <-> task status
4. Reset in_progress -> pending (interrupted tasks)
5. Rebuild team and spawn needed workers only
6. Create missing tasks with correct blockedBy
7. Kick first executable task -> Phase 4 coordination loop

## Shared Resources

| Resource | Path | Usage |
|----------|------|-------|
| Architecture Baseline | [<session>/artifacts/architecture-baseline.json](<session>/artifacts/architecture-baseline.json) | Pre-refactoring metrics for comparison |
| Architecture Report | [<session>/artifacts/architecture-report.md](<session>/artifacts/architecture-report.md) | Analyzer output consumed by designer |
| Refactoring Plan | [<session>/artifacts/refactoring-plan.md](<session>/artifacts/refactoring-plan.md) | Designer output consumed by refactorer |
| Validation Results | [<session>/artifacts/validation-results.json](<session>/artifacts/validation-results.json) | Validator output consumed by reviewer |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Role spec file not found | Error with expected path (role-specs/<name>.md) |
| Command file not found | Fallback to inline execution in coordinator role.md |
| Subagent spec not found | Error with expected path (subagents/<name>-subagent.md) |
| Fast-advance orphan detected | Coordinator resets task to pending on next check |
| consensus_blocked HIGH | Coordinator creates revision task or pauses pipeline |
| team-worker agent unavailable | Error: requires .claude/agents/team-worker.md |
| Completion action timeout | Default to Keep Active |
| Analysis tool not available | Fallback to static analysis methods |
| Validation regression detected | Auto-create FIX task with regression details (scoped to branch/pipeline) |
| Review-fix cycle exceeds 3 iterations | Escalate to user with summary of remaining issues (per-branch/pipeline scope) |
| One branch REFACTOR fails | Mark that branch failed, other branches continue to completion |
| Branch scope overlap detected | Designer constrains non-overlapping target files; REFACTOR logs warning on detection |
| Shared-memory concurrent writes | Each worker writes only its own namespace key (e.g., `refactorer.B01`) |
| Branch fix cycle >= 3 | Escalate only that branch to user, other branches continue independently |
| max_branches exceeded | Coordinator truncates to top N refactorings by priority at CP-2.5 |
| Independent pipeline partial failure | Failed pipeline marked, others continue; aggregate reports partial results |
