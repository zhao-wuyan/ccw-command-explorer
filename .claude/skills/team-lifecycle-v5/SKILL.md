---
name: team-lifecycle-v5
description: Unified team skill for full lifecycle - spec/impl/test. Uses team-worker agent architecture with role-spec files for domain logic. Coordinator orchestrates pipeline, workers are team-worker agents loaded with role-specific Phase 2-4 specs. Triggers on "team lifecycle".
allowed-tools: TeamCreate(*), TeamDelete(*), SendMessage(*), TaskCreate(*), TaskUpdate(*), TaskList(*), TaskGet(*), Task(*), AskUserQuestion(*), TodoWrite(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team Lifecycle v5

Unified team skill: specification -> implementation -> testing -> review. Built on **team-worker agent architecture** — all worker roles share a single agent definition with role-specific Phase 2-4 loaded from markdown specs.

## Architecture

```
+---------------------------------------------------+
|  Skill(skill="team-lifecycle-v5")                  |
|  args="task description"                           |
+-------------------+-------------------------------+
                    |
         Orchestration Mode (auto -> coordinator)
                    |
              Coordinator (inline)
              Phase 0-5 orchestration
                    |
    +----+-----+-------+-------+-------+-------+
    v    v     v       v       v       v       v
 [team-worker agents, each loaded with a role-spec]
  analyst writer planner executor tester reviewer
                                    ^        ^
                              on-demand by coordinator
                            +---------+ +--------+
                            |architect| |fe-dev  |
                            +---------+ +--------+
                                        +--------+
                                        | fe-qa  |
                                        +--------+

  Subagents (callable by any worker, not team members):
    [discuss-subagent]  - multi-perspective critique
    [explore-subagent]  - codebase exploration with cache
    [doc-generation]    - document generation (CLI execution)
```

## Role Router

This skill is **coordinator-only**. Workers do NOT invoke this skill — they are spawned as `team-worker` agents directly.

### Input Parsing

Parse `$ARGUMENTS`. No `--role` needed — always routes to coordinator.

### Role Registry

| Role | Spec | Task Prefix | Type | Inner Loop |
|------|------|-------------|------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | (none) | orchestrator | - |
| analyst | [role-specs/analyst.md](role-specs/analyst.md) | RESEARCH-* | pipeline | false |
| writer | [role-specs/writer.md](role-specs/writer.md) | DRAFT-* | pipeline | true |
| planner | [role-specs/planner.md](role-specs/planner.md) | PLAN-* | pipeline | true |
| executor | [role-specs/executor.md](role-specs/executor.md) | IMPL-* | pipeline | true |
| tester | [role-specs/tester.md](role-specs/tester.md) | TEST-* | pipeline | false |
| reviewer | [role-specs/reviewer.md](role-specs/reviewer.md) | REVIEW-* + QUALITY-* + IMPROVE-* | pipeline | false |
| architect | [role-specs/architect.md](role-specs/architect.md) | ARCH-* | consulting | false |
| fe-developer | [role-specs/fe-developer.md](role-specs/fe-developer.md) | DEV-FE-* | frontend | false |
| fe-qa | [role-specs/fe-qa.md](role-specs/fe-qa.md) | QA-FE-* | frontend | false |

### Subagent Registry

| Subagent | Spec | Callable By | Purpose |
|----------|------|-------------|---------|
| discuss | [subagents/discuss-subagent.md](subagents/discuss-subagent.md) | analyst, writer, reviewer | Multi-perspective critique |
| explore | [subagents/explore-subagent.md](subagents/explore-subagent.md) | analyst, planner, any role | Codebase exploration with cache |
| doc-generation | [subagents/doc-generation-subagent.md](subagents/doc-generation-subagent.md) | writer | Document generation (CLI execution) |

### Dispatch

Always route to coordinator. Coordinator reads `roles/coordinator/role.md` and executes its phases.

### Orchestration Mode

User just provides task description.

**Invocation**: `Skill(skill="team-lifecycle-v5", args="task description")`

**Lifecycle**:
```
User provides task description
  -> coordinator Phase 1-3: requirement clarification -> TeamCreate -> create task chain
  -> coordinator Phase 4: spawn first batch workers (background) -> STOP
  -> Worker executes -> SendMessage callback -> coordinator advances next step
  -> Loop until pipeline complete -> Phase 5 report
```

**User Commands** (wake paused coordinator):

| Command | Action |
|---------|--------|
| `check` / `status` | Output execution status graph, no advancement |
| `resume` / `continue` | Check worker states, advance next step |
| `revise <TASK-ID> [feedback]` | Create revision task + cascade downstream |
| `feedback <text>` | Analyze feedback impact, create targeted revision chain |
| `recheck` | Re-run QUALITY-001 quality check |
| `improve [dimension]` | Auto-improve weakest dimension from readiness-report |

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
role_spec: .claude/skills/team-lifecycle-v5/role-specs/<role>.md
session: <session-folder>
session_id: <session-id>
team_name: <team-name>
requirement: <task-description>
inner_loop: <true|false>

Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 (task discovery) -> role-spec Phase 2-4 -> built-in Phase 5 (report).`
})
```

**Inner Loop roles** (writer, planner, executor): Set `inner_loop: true`. The team-worker agent handles the loop internally.

**Single-task roles** (analyst, tester, reviewer, architect, fe-developer, fe-qa): Set `inner_loop: false`.

---

## Pipeline Definitions

### Spec-only (6 tasks)

```
RESEARCH-001(+D1) -> DRAFT-001(+D2) -> DRAFT-002(+D3) -> DRAFT-003(+D4) -> DRAFT-004(+D5) -> QUALITY-001(+D6)
```

### Impl-only (4 tasks)

```
PLAN-001 -> IMPL-001 -> TEST-001 + REVIEW-001
```

### Full-lifecycle (10 tasks)

```
[Spec pipeline] -> PLAN-001(blockedBy: QUALITY-001) -> IMPL-001 -> TEST-001 + REVIEW-001
```

### Frontend Pipelines

```
FE-only:       PLAN-001 -> DEV-FE-001 -> QA-FE-001
               (GC loop: QA-FE verdict=NEEDS_FIX -> DEV-FE-002 -> QA-FE-002, max 2 rounds)

Fullstack:     PLAN-001 -> IMPL-001 || DEV-FE-001 -> TEST-001 || QA-FE-001 -> REVIEW-001

Full + FE:     [Spec pipeline] -> PLAN-001 -> IMPL-001 || DEV-FE-001 -> TEST-001 || QA-FE-001 -> REVIEW-001
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

### Checkpoints

| Trigger | Position | Behavior |
|---------|----------|----------|
| Spec->Impl transition | QUALITY-001 completed | Read readiness-report.md, display checkpoint, pause for user action |
| GC loop max | QA-FE max 2 rounds | Stop iteration, report current state |
| Pipeline stall | No ready + no running | Check missing tasks, report to user |

**Checkpoint Output Template** (QUALITY-001 completion):

```
[coordinator] ══════════════════════════════════════════
[coordinator] SPEC PHASE COMPLETE
[coordinator] Quality Gate: <PASS|REVIEW|FAIL> (<score>%)
[coordinator]
[coordinator] Dimension Scores:
[coordinator]   Completeness:  <bar> <n>%
[coordinator]   Consistency:   <bar> <n>%
[coordinator]   Traceability:  <bar> <n>%
[coordinator]   Depth:         <bar> <n>%
[coordinator]   Coverage:      <bar> <n>%
[coordinator]
[coordinator] Available Actions:
[coordinator]   resume              -> Proceed to implementation
[coordinator]   improve             -> Auto-improve weakest dimension
[coordinator]   improve <dimension> -> Improve specific dimension
[coordinator]   revise <TASK-ID>    -> Revise specific document
[coordinator]   recheck             -> Re-run quality check
[coordinator]   feedback <text>     -> Inject feedback, create revision
[coordinator] ══════════════════════════════════════════
```

### Task Metadata Registry

| Task ID | Role | Phase | Dependencies | Inline Discuss |
|---------|------|-------|-------------|---------------|
| RESEARCH-001 | analyst | spec | (none) | DISCUSS-001 |
| DRAFT-001 | writer | spec | RESEARCH-001 | DISCUSS-002 |
| DRAFT-002 | writer | spec | DRAFT-001 | DISCUSS-003 |
| DRAFT-003 | writer | spec | DRAFT-002 | DISCUSS-004 |
| DRAFT-004 | writer | spec | DRAFT-003 | DISCUSS-005 |
| QUALITY-001 | reviewer | spec | DRAFT-004 | DISCUSS-006 |
| PLAN-001 | planner | impl | (none or QUALITY-001) | - |
| IMPL-001 | executor | impl | PLAN-001 | - |
| TEST-001 | tester | impl | IMPL-001 | - |
| REVIEW-001 | reviewer | impl | IMPL-001 | - |
| DEV-FE-001 | fe-developer | impl | PLAN-001 | - |
| QA-FE-001 | fe-qa | impl | DEV-FE-001 | - |

---

## Session Directory

```
.workflow/.team/TLS-<slug>-<date>/
+-- team-session.json
+-- spec/
|   +-- spec-config.json
|   +-- discovery-context.json
|   +-- product-brief.md
|   +-- requirements/
|   +-- architecture/
|   +-- epics/
|   +-- readiness-report.md
|   +-- spec-summary.md
+-- discussions/
+-- plan/
|   +-- plan.json
|   +-- .task/TASK-*.json
+-- explorations/
|   +-- cache-index.json
|   +-- explore-<angle>.json
+-- architecture/
+-- analysis/
+-- qa/
+-- wisdom/
|   +-- learnings.md
|   +-- decisions.md
|   +-- conventions.md
|   +-- issues.md
+-- .msg/
+-- shared-memory.json
```

## Session Resume

Coordinator supports `--resume` / `--continue` for interrupted sessions:

1. Scan `.workflow/.team/TLS-*/team-session.json` for active/paused sessions
2. Multiple matches -> AskUserQuestion for selection
3. Audit TaskList -> reconcile session state <-> task status
4. Reset in_progress -> pending (interrupted tasks)
5. Rebuild team and spawn needed workers only
6. Create missing tasks with correct blockedBy
7. Kick first executable task -> Phase 4 coordination loop

## Shared Resources

| Resource | Path | Usage |
|----------|------|-------|
| Document Standards | [specs/document-standards.md](specs/document-standards.md) | YAML frontmatter, naming, structure |
| Quality Gates | [specs/quality-gates.md](specs/quality-gates.md) | Per-phase quality gates |
| Team Config | [specs/team-config.json](specs/team-config.json) | Role registry, pipeline definitions |
| Product Brief Template | [templates/product-brief.md](templates/product-brief.md) | DRAFT-001 |
| Requirements Template | [templates/requirements-prd.md](templates/requirements-prd.md) | DRAFT-002 |
| Architecture Template | [templates/architecture-doc.md](templates/architecture-doc.md) | DRAFT-003 |
| Epics Template | [templates/epics-template.md](templates/epics-template.md) | DRAFT-004 |
| Discuss Subagent | [subagents/discuss-subagent.md](subagents/discuss-subagent.md) | Inline discuss protocol |
| Explore Subagent | [subagents/explore-subagent.md](subagents/explore-subagent.md) | Shared exploration utility |
| Doc-Gen Subagent | [subagents/doc-generation-subagent.md](subagents/doc-generation-subagent.md) | Document generation engine |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown command | Error with available command list |
| Role spec file not found | Error with expected path |
| Command file not found | Fallback to inline execution |
| Discuss subagent fails | Worker proceeds without discuss, logs warning |
| Explore cache corrupt | Clear cache, re-explore |
| Fast-advance spawns wrong task | Coordinator reconciles on next callback |
