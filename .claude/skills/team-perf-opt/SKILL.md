---
name: team-perf-opt
description: Unified team skill for performance optimization. Uses team-worker agent architecture with role-spec files for domain logic. Coordinator orchestrates pipeline, workers are team-worker agents. Triggers on "team perf-opt".
allowed-tools: Task, TaskCreate, TaskList, TaskGet, TaskUpdate, TeamCreate, TeamDelete, SendMessage, AskUserQuestion, Read, Write, Edit, Bash, Glob, Grep, mcp__ace-tool__search_context
---

# Team Performance Optimization

Unified team skill: Profile application performance, identify bottlenecks, design optimization strategies, implement changes, benchmark improvements, and review code quality. Built on **team-worker agent architecture** -- all worker roles share a single agent definition with role-specific Phase 2-4 loaded from markdown specs.

## Architecture

```
+---------------------------------------------------+
|  Skill(skill="team-perf-opt")                      |
|  args="<task-description>"                         |
+-------------------+-------------------------------+
                    |
         Orchestration Mode (auto -> coordinator)
                    |
              Coordinator (inline)
              Phase 0-5 orchestration
                    |
    +-------+-------+-------+-------+
    v       v       v       v       v
 [tw]    [tw]    [tw]    [tw]    [tw]
profiler strate- optim-  bench-  review-
         gist    izer    marker  er

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
| profiler | [role-specs/profiler.md](role-specs/profiler.md) | PROFILE-* | orchestration | false |
| strategist | [role-specs/strategist.md](role-specs/strategist.md) | STRATEGY-* | orchestration | false |
| optimizer | [role-specs/optimizer.md](role-specs/optimizer.md) | IMPL-* / FIX-* | code_generation | true |
| benchmarker | [role-specs/benchmarker.md](role-specs/benchmarker.md) | BENCH-* | validation | false |
| reviewer | [role-specs/reviewer.md](role-specs/reviewer.md) | REVIEW-* / QUALITY-* | read_only_analysis | false |

### Subagent Registry

| Subagent | Spec | Callable By | Purpose |
|----------|------|-------------|---------|
| explore | [subagents/explore-subagent.md](subagents/explore-subagent.md) | profiler, optimizer | Shared codebase exploration for performance-critical code paths |
| discuss | [subagents/discuss-subagent.md](subagents/discuss-subagent.md) | strategist, reviewer | Multi-perspective discussion for optimization approaches and review findings |

### Dispatch

Always route to coordinator. Coordinator reads `roles/coordinator/role.md` and executes its phases.

### Orchestration Mode

User just provides task description.

**Invocation**:
```bash
Skill(skill="team-perf-opt", args="<task-description>")                           # auto mode
Skill(skill="team-perf-opt", args="--parallel-mode=fan-out <task-description>")    # force fan-out
Skill(skill="team-perf-opt", args='--parallel-mode=independent "target1" "target2"')  # independent
Skill(skill="team-perf-opt", args="--max-branches=3 <task-description>")           # limit branches
```

**Parallel Modes**:

| Mode | Description | When to Use |
|------|-------------|------------|
| `auto` (default) | count <= 2 -> single, count >= 3 -> fan-out | General optimization requests |
| `single` | Linear pipeline, no branching | Simple or tightly coupled optimizations |
| `fan-out` | Shared PROFILE+STRATEGY, then N parallel IMPL->BENCH+REVIEW branches | Multiple independent bottlenecks |
| `independent` | M fully independent pipelines from profiling to review | Separate optimization targets |

**Lifecycle**:
```
User provides task description + optional --parallel-mode / --max-branches
  -> coordinator Phase 1-3: Parse flags -> TeamCreate -> Create task chain (mode-aware)
  -> coordinator Phase 4: spawn first batch workers (background) -> STOP
  -> Worker (team-worker agent) executes -> SendMessage callback -> coordinator advances
  -> [auto/fan-out] CP-2.5: Strategy complete -> create N branch tasks -> spawn all IMPL-B* in parallel
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
role_spec: .claude/skills/team-perf-opt/role-specs/<role>.md
session: <session-folder>
session_id: <session-id>
team_name: <team-name>
requirement: <task-description>
inner_loop: <true|false>

Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 (task discovery) -> role-spec Phase 2-4 -> built-in Phase 5 (report).`
})
```

**Inner Loop roles** (optimizer): Set `inner_loop: true`. The team-worker agent handles the loop internally.

**Single-task roles** (profiler, strategist, benchmarker, reviewer): Set `inner_loop: false`.

---

## Pipeline Definitions

### Pipeline Diagrams

**Single Mode** (linear, backward compatible):
```
Pipeline: Single (Linear with Review-Fix Cycle)
=====================================================================
Stage 1           Stage 2           Stage 3           Stage 4
PROFILE-001  -->  STRATEGY-001 -->  IMPL-001   --> BENCH-001
[profiler]        [strategist]      [optimizer]    [benchmarker]
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
Pipeline: Fan-out (N parallel optimization branches)
=====================================================================
Stage 1           Stage 2         CP-2.5          Stage 3+4 (per branch)
                                (branch creation)
PROFILE-001 --> STRATEGY-001 --+-> IMPL-B01 --> BENCH-B01 + REVIEW-B01 (fix cycle)
[profiler]      [strategist]   |   [optimizer]   [bench]     [reviewer]
                               +-> IMPL-B02 --> BENCH-B02 + REVIEW-B02 (fix cycle)
                               |   [optimizer]   [bench]     [reviewer]
                               +-> IMPL-B0N --> BENCH-B0N + REVIEW-B0N (fix cycle)
                                                          |
                                                     AGGREGATE -> Phase 5
=====================================================================
```

**Independent Mode** (M fully independent pipelines):
```
Pipeline: Independent (M complete pipelines)
=====================================================================
Pipeline A: PROFILE-A01 --> STRATEGY-A01 --> IMPL-A01 --> BENCH-A01 + REVIEW-A01
Pipeline B: PROFILE-B01 --> STRATEGY-B01 --> IMPL-B01 --> BENCH-B01 + REVIEW-B01
Pipeline C: PROFILE-C01 --> STRATEGY-C01 --> IMPL-C01 --> BENCH-C01 + REVIEW-C01
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
Beat View: Performance Optimization Pipeline
======================================================================
  Event                   Coordinator              Workers
----------------------------------------------------------------------
  new task         --> +- Phase 1-3: clarify -+
                       |  TeamCreate           |
                       |  create PROFILE-001   |
                       +- Phase 4: spawn ------+--> [profiler] Phase 1-5
                       +- STOP (idle) ---------+         |
                                                          |
  callback <----------------------------------------------+
  (profiler done)  --> +- handleCallback ------+    profile_complete
                       |  mark PROFILE done    |
                       |  spawn strategist ----+--> [strategist] Phase 1-5
                       +- STOP ----------------+         |
                                                          |
  callback <----------------------------------------------+
  (strategist done)--> +- handleCallback ------+    strategy_complete
                       |  mark STRATEGY done   |
                       |  spawn optimizer -----+--> [optimizer] Phase 1-5
                       +- STOP ----------------+         |
                                                          |
  callback <----------------------------------------------+
  (optimizer done) --> +- handleCallback ------+    impl_complete
                       |  mark IMPL done       |
                       |  spawn bench+reviewer-+--> [benchmarker] Phase 1-5
                       |  (parallel)    -------+--> [reviewer] Phase 1-5
                       +- STOP ----------------+    |           |
                                                     |           |
  callback x2 <--------------------------------------+-----------+
                  --> +- handleCallback ------+
                       |  both done?           |
                       |  YES + pass -> Phase 5|
                       |  NO / fail -> FIX task|
                       |  spawn optimizer -----+--> [optimizer] FIX-001
                       +- STOP or Phase 5 -----+
======================================================================
```

**Checkpoints**:

| Checkpoint | Trigger | Location | Behavior |
|------------|---------|----------|----------|
| CP-1 | PROFILE-001 complete | After Stage 1 | User reviews bottleneck report, can refine scope |
| CP-2 | STRATEGY-001 complete | After Stage 2 | User reviews optimization plan, can adjust priorities |
| CP-2.5 | STRATEGY-001 complete (auto/fan-out) | After Stage 2 | Auto-create N branch tasks from optimization plan, spawn all IMPL-B* in parallel |
| CP-3 | REVIEW/BENCH fail | Stage 4 (per-branch) | Auto-create FIX task for that branch only (max 3x per branch) |
| CP-4 | All tasks/branches complete | Phase 5 | Aggregate results, interactive completion action |

### Task Metadata Registry

**Single mode** (backward compatible):

| Task ID | Role | Phase | Dependencies | Description |
|---------|------|-------|-------------|-------------|
| PROFILE-001 | profiler | Stage 1 | (none) | Profile application, identify bottlenecks |
| STRATEGY-001 | strategist | Stage 2 | PROFILE-001 | Design optimization plan from bottleneck report |
| IMPL-001 | optimizer | Stage 3 | STRATEGY-001 | Implement highest-priority optimizations |
| BENCH-001 | benchmarker | Stage 4 | IMPL-001 | Run benchmarks, compare vs baseline |
| REVIEW-001 | reviewer | Stage 4 | IMPL-001 | Review optimization code for correctness |
| FIX-001 | optimizer | Stage 3 (cycle) | REVIEW-001 or BENCH-001 | Fix issues found in review/benchmark |

**Fan-out mode** (branch tasks created at CP-2.5):

| Task ID | Role | Phase | Dependencies | Description |
|---------|------|-------|-------------|-------------|
| PROFILE-001 | profiler | Stage 1 (shared) | (none) | Profile application |
| STRATEGY-001 | strategist | Stage 2 (shared) | PROFILE-001 | Design plan with discrete OPT-IDs |
| IMPL-B{NN} | optimizer | Stage 3 (branch) | STRATEGY-001 | Implement OPT-{NNN} only |
| BENCH-B{NN} | benchmarker | Stage 4 (branch) | IMPL-B{NN} | Benchmark branch B{NN} |
| REVIEW-B{NN} | reviewer | Stage 4 (branch) | IMPL-B{NN} | Review branch B{NN} |
| FIX-B{NN}-{cycle} | optimizer | Fix (branch) | (none) | Fix issues in branch B{NN} |
| BENCH-B{NN}-R{cycle} | benchmarker | Retry (branch) | FIX-B{NN}-{cycle} | Re-benchmark after fix |
| REVIEW-B{NN}-R{cycle} | reviewer | Retry (branch) | FIX-B{NN}-{cycle} | Re-review after fix |

**Independent mode**:

| Task ID | Role | Phase | Dependencies | Description |
|---------|------|-------|-------------|-------------|
| PROFILE-{P}01 | profiler | Stage 1 | (none) | Profile for pipeline {P} target |
| STRATEGY-{P}01 | strategist | Stage 2 | PROFILE-{P}01 | Strategy for pipeline {P} |
| IMPL-{P}01 | optimizer | Stage 3 | STRATEGY-{P}01 | Implement pipeline {P} optimizations |
| BENCH-{P}01 | benchmarker | Stage 4 | IMPL-{P}01 | Benchmark pipeline {P} |
| REVIEW-{P}01 | reviewer | Stage 4 | IMPL-{P}01 | Review pipeline {P} |
| FIX-{P}01-{cycle} | optimizer | Fix | (none) | Fix issues in pipeline {P} |

### Task Naming Rules

| Mode | Stage 3 | Stage 4 | Fix | Retry |
|------|---------|---------|-----|-------|
| Single | IMPL-001 | BENCH-001, REVIEW-001 | FIX-001 | BENCH-001-R1, REVIEW-001-R1 |
| Fan-out | IMPL-B01 | BENCH-B01, REVIEW-B01 | FIX-B01-1 | BENCH-B01-R1, REVIEW-B01-R1 |
| Independent | IMPL-A01 | BENCH-A01, REVIEW-A01 | FIX-A01-1 | BENCH-A01-R1, REVIEW-A01-R1 |

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
| Archive & Clean | Update session status="completed" -> TeamDelete(perf-opt) -> output final summary |
| Keep Active | Update session status="paused" -> output resume instructions: `Skill(skill="team-perf-opt", args="resume")` |
| Export Results | AskUserQuestion for target path -> copy deliverables -> Archive & Clean |

---

## Session Directory

**Single mode**:
```
.workflow/<session-id>/
+-- session.json                    # Session metadata + status + parallel_mode
+-- artifacts/
|   +-- baseline-metrics.json       # Profiler: before-optimization metrics
|   +-- bottleneck-report.md        # Profiler: ranked bottleneck findings
|   +-- optimization-plan.md        # Strategist: prioritized optimization plan
|   +-- benchmark-results.json      # Benchmarker: after-optimization metrics
|   +-- review-report.md            # Reviewer: code review findings
+-- explorations/
|   +-- cache-index.json            # Shared explore cache
|   +-- <hash>.md                   # Cached exploration results
+-- wisdom/
|   +-- patterns.md                 # Discovered patterns and conventions
|   +-- shared-memory.json          # Cross-role structured data
+-- discussions/
|   +-- DISCUSS-OPT.md              # Strategy discussion record
|   +-- DISCUSS-REVIEW.md           # Review discussion record
```

**Fan-out mode** (adds branches/ directory):
```
.workflow/<session-id>/
+-- session.json                    # + parallel_mode, branches, fix_cycles
+-- artifacts/
|   +-- baseline-metrics.json       # Shared baseline (all branches use this)
|   +-- bottleneck-report.md        # Shared bottleneck report
|   +-- optimization-plan.md        # Shared plan with discrete OPT-IDs
|   +-- aggregate-results.json      # Aggregated results from all branches
|   +-- branches/
|       +-- B01/
|       |   +-- optimization-detail.md   # Extracted OPT-001 detail
|       |   +-- benchmark-results.json   # Branch B01 benchmark
|       |   +-- review-report.md         # Branch B01 review
|       +-- B02/
|       |   +-- optimization-detail.md
|       |   +-- benchmark-results.json
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
|       |   +-- baseline-metrics.json
|       |   +-- bottleneck-report.md
|       |   +-- optimization-plan.md
|       |   +-- benchmark-results.json
|       |   +-- review-report.md
|       +-- B/
|           +-- baseline-metrics.json
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
| Performance Baseline | [<session>/artifacts/baseline-metrics.json](<session>/artifacts/baseline-metrics.json) | Before-optimization metrics for comparison |
| Bottleneck Report | [<session>/artifacts/bottleneck-report.md](<session>/artifacts/bottleneck-report.md) | Profiler output consumed by strategist |
| Optimization Plan | [<session>/artifacts/optimization-plan.md](<session>/artifacts/optimization-plan.md) | Strategist output consumed by optimizer |
| Benchmark Results | [<session>/artifacts/benchmark-results.json](<session>/artifacts/benchmark-results.json) | Benchmarker output consumed by reviewer |

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
| Profiling tool not available | Fallback to static analysis methods |
| Benchmark regression detected | Auto-create FIX task with regression details (scoped to branch/pipeline) |
| Review-fix cycle exceeds 3 iterations | Escalate to user with summary of remaining issues (per-branch/pipeline scope) |
| One branch IMPL fails | Mark that branch failed, other branches continue to completion |
| Branch scope overlap detected | Strategist constrains non-overlapping target files; IMPL logs warning on detection |
| Shared-memory concurrent writes | Each worker writes only its own namespace key (e.g., `optimizer.B01`) |
| Branch fix cycle >= 3 | Escalate only that branch to user, other branches continue independently |
| max_branches exceeded | Coordinator truncates to top N optimizations by priority at CP-2.5 |
| Independent pipeline partial failure | Failed pipeline marked, others continue; aggregate reports partial results |
