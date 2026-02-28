---
name: team-quality-assurance
description: Unified team skill for quality assurance team. All roles invoke this skill with --role arg for role-specific execution. Triggers on "team quality-assurance", "team qa".
allowed-tools: TeamCreate(*), TeamDelete(*), SendMessage(*), TaskCreate(*), TaskUpdate(*), TaskList(*), TaskGet(*), Task(*), AskUserQuestion(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team Quality Assurance

Unified team skill: quality assurance combining issue discovery and software testing into a closed loop of scout -> strategy -> generate -> execute -> analyze. Uses multi-perspective scanning, Generator-Executor pipeline, and shared defect pattern database for progressive quality assurance. All team members invoke with `--role=xxx` to route to role-specific execution.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Skill(skill="team-quality-assurance")                    │
│  args="<task-description>" or args="--role=xxx"           │
└────────────────────────────┬─────────────────────────────┘
                             │ Role Router
                  ┌──── --role present? ────┐
                  │ NO                      │ YES
                  ↓                         ↓
           Orchestration Mode         Role Dispatch
           (auto -> coordinator)     (route to role.md)
                  │
    ┌─────┬──────┴──────┬───────────┬──────────┬──────────┐
    ↓     ↓             ↓           ↓          ↓          ↓
┌────────┐┌───────┐┌──────────┐┌─────────┐┌────────┐┌────────┐
│ coord  ││scout  ││strategist││generator││executor││analyst │
│        ││SCOUT-*││QASTRAT-* ││QAGEN-*  ││QARUN-* ││QAANA-* │
└────────┘└───────┘└──────────┘└─────────┘└────────┘└────────┘
```

## Command Architecture

```
roles/
├── coordinator/
│   ├── role.md              # Pipeline orchestration (mode selection, task dispatch, monitoring)
│   └── commands/
│       ├── dispatch.md      # Task chain creation
│       └── monitor.md       # Progress monitoring
├── scout/
│   ├── role.md              # Multi-perspective issue scanning
│   └── commands/
│       └── scan.md          # Multi-perspective CLI fan-out scanning
├── strategist/
│   ├── role.md              # Test strategy formulation
│   └── commands/
│       └── analyze-scope.md # Change scope analysis
├── generator/
│   ├── role.md              # Test case generation
│   └── commands/
│       └── generate-tests.md # Layer-based test code generation
├── executor/
│   ├── role.md              # Test execution and fix cycles
│   └── commands/
│       └── run-fix-cycle.md # Iterative test-fix loop
└── analyst/
    ├── role.md              # Quality analysis reporting
    └── commands/
        └── quality-report.md # Defect pattern + coverage analysis
```

**Design principle**: role.md retains Phase 1 (Task Discovery) and Phase 5 (Report) inline. Phase 2-4 delegate to `commands/*.md` based on complexity.

## Role Router

### Input Parsing

Parse `$ARGUMENTS` to extract `--role`. If absent -> Orchestration Mode (auto route to coordinator).

### Role Registry

| Role | File | Task Prefix | Type | Compact |
|------|------|-------------|------|---------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | (none) | orchestrator | **compressed -> must re-read** |
| scout | [roles/scout/role.md](roles/scout/role.md) | SCOUT-* | pipeline | compressed -> must re-read |
| strategist | [roles/strategist/role.md](roles/strategist/role.md) | QASTRAT-* | pipeline | compressed -> must re-read |
| generator | [roles/generator/role.md](roles/generator/role.md) | QAGEN-* | pipeline | compressed -> must re-read |
| executor | [roles/executor/role.md](roles/executor/role.md) | QARUN-* | pipeline | compressed -> must re-read |
| analyst | [roles/analyst/role.md](roles/analyst/role.md) | QAANA-* | pipeline | compressed -> must re-read |

> **COMPACT PROTECTION**: Role files are execution documents, not reference material. When context compression occurs and role instructions are reduced to summaries, **you MUST immediately `Read` the corresponding role.md to reload before continuing execution**. Do not execute any Phase based on summaries.

### Dispatch

1. Extract `--role` from arguments
2. If no `--role` -> route to coordinator (Orchestration Mode)
3. Look up role in registry -> Read the role file -> Execute its phases

### Orchestration Mode

When invoked without `--role`, coordinator auto-starts. User just provides task description.

**Invocation**: `Skill(skill="team-quality-assurance", args="<task-description>")`

**Lifecycle**:
```
User provides task description
  -> coordinator Phase 1-3: Mode detection + requirement clarification -> TeamCreate -> Create task chain
  -> coordinator Phase 4: spawn first batch workers (background) -> STOP
  -> Worker executes -> SendMessage callback -> coordinator advances next step
  -> Loop until pipeline complete -> Phase 5 report
```

**User Commands** (wake paused coordinator):

| Command | Action |
|---------|--------|
| `check` / `status` | Output execution status graph, no advancement |
| `resume` / `continue` | Check worker states, advance next step |

---

## Shared Infrastructure

The following templates apply to all worker roles. Each role.md only needs to write **Phase 2-4** role-specific logic.

### Worker Phase 1: Task Discovery (shared by all workers)

Every worker executes the same task discovery flow on startup:

1. Call `TaskList()` to get all tasks
2. Filter: subject matches this role's prefix + owner is this role + status is pending + blockedBy is empty
3. No tasks -> idle wait
4. Has tasks -> `TaskGet` for details -> `TaskUpdate` mark in_progress

**Resume Artifact Check** (prevent duplicate output after resume):
- Check whether this task's output artifact already exists
- Artifact complete -> skip to Phase 5 report completion
- Artifact incomplete or missing -> normal Phase 2-4 execution

### Worker Phase 5: Report (shared by all workers)

Standard reporting flow after task completion:

1. **Message Bus**: Call `mcp__ccw-tools__team_msg` to log message
   - Parameters: operation="log", team=<session-id>, from=<role>, to="coordinator", type=<message-type>, summary="[<role>] <summary>", ref=<artifact-path>
   - **NOTE**: `team` must be **session ID** (e.g., `TQA-project-2026-02-27`), NOT team name. Extract from `Session:` field in task description.
   - **CLI fallback**: When MCP unavailable -> `ccw team log --team <session-id> --from <role> --to coordinator --type <type> --summary "[<role>] ..." --json`
2. **SendMessage**: Send result to coordinator (content and summary both prefixed with `[<role>]`)
3. **TaskUpdate**: Mark task completed
4. **Loop**: Return to Phase 1 to check next task

### Wisdom Accumulation (all roles)

Cross-task knowledge accumulation. Coordinator creates `wisdom/` directory at session initialization.

**Directory**:
```
<session-folder>/wisdom/
├── learnings.md      # Patterns and insights
├── decisions.md      # Architecture and design decisions
├── conventions.md    # Codebase conventions
└── issues.md         # Known risks and issues
```

**Worker Load** (Phase 2): Extract `Session: <path>` from task description, read wisdom directory files.
**Worker Contribute** (Phase 4/5): Write this task's discoveries to corresponding wisdom files.

### Role Isolation Rules

#### Output Tagging

All outputs must carry `[role_name]` prefix.

#### Coordinator Isolation

| Allowed | Forbidden |
|---------|-----------|
| Requirement clarification (AskUserQuestion) | Direct test writing |
| Create task chain (TaskCreate) | Direct test execution or scanning |
| Mode selection + quality gating | Direct coverage analysis |
| Monitor progress (message bus) | Bypassing workers |

#### Worker Isolation

| Allowed | Forbidden |
|---------|-----------|
| Process tasks with own prefix | Process tasks with other role prefixes |
| Read/write shared-memory.json (own fields) | Create tasks for other roles |
| SendMessage to coordinator | Communicate directly with other workers |
| Delegate to commands/ files | Modify resources outside own responsibility |

### Team Configuration

| Setting | Value |
|---------|-------|
| Team name | quality-assurance |
| Session directory | `.workflow/.team/QA-<slug>-<date>/` |
| Test layers | L1: Unit (80%), L2: Integration (60%), L3: E2E (40%) |
| Scan perspectives | bug, security, ux, test-coverage, code-quality |

### Shared Memory

Cross-role accumulated knowledge stored in `shared-memory.json`:

| Field | Owner | Content |
|-------|-------|---------|
| `discovered_issues` | scout | Multi-perspective scan findings |
| `test_strategy` | strategist | Layer selection, coverage targets, scope |
| `generated_tests` | generator | Test file paths and metadata |
| `execution_results` | executor | Test run results and coverage data |
| `defect_patterns` | analyst | Recurring defect pattern database |
| `quality_score` | analyst | Overall quality assessment |
| `coverage_history` | analyst | Coverage trend over time |

Each role reads in Phase 2, writes own fields in Phase 5.

### Message Bus (All Roles)

Every SendMessage **before**, must call `mcp__ccw-tools__team_msg` to log.

**Message types by role**:

| Role | Types |
|------|-------|
| coordinator | `mode_selected`, `gc_loop_trigger`, `quality_gate`, `task_unblocked`, `error`, `shutdown` |
| scout | `scan_ready`, `issues_found`, `error` |
| strategist | `strategy_ready`, `error` |
| generator | `tests_generated`, `tests_revised`, `error` |
| executor | `tests_passed`, `tests_failed`, `coverage_report`, `error` |
| analyst | `analysis_ready`, `quality_report`, `error` |

---

## Three-Mode Pipeline Architecture

### Mode Auto-Detection

| Condition | Mode |
|-----------|------|
| Explicit `--mode=discovery` flag | discovery |
| Explicit `--mode=testing` flag | testing |
| Explicit `--mode=full` flag | full |
| Task description contains: discovery/scan/issue keywords | discovery |
| Task description contains: test/coverage/TDD keywords | testing |
| No explicit flag and no keyword match | full (default) |

### Pipeline Diagrams

```
Discovery Mode (issue discovery first):
  SCOUT-001(multi-perspective scan) -> QASTRAT-001 -> QAGEN-001 -> QARUN-001 -> QAANA-001

Testing Mode (skip scout, test first):
  QASTRAT-001(change analysis) -> QAGEN-001(L1) -> QARUN-001(L1) -> QAGEN-002(L2) -> QARUN-002(L2) -> QAANA-001

Full QA Mode (complete closed loop):
  SCOUT-001(scan) -> QASTRAT-001(strategy)
  -> [QAGEN-001(L1) || QAGEN-002(L2)](parallel) -> [QARUN-001 || QARUN-002](parallel)
  -> QAANA-001(analysis) -> SCOUT-002(regression scan)
```

### Generator-Executor Pipeline (GC Loop)

Generator and executor iterate per test layer until coverage targets are met:

```
QAGEN -> QARUN -> (if coverage < target) -> QAGEN-fix -> QARUN-2
                  (if coverage >= target) -> next layer or QAANA
```

Coordinator monitors GC loop progress. After 3 GC iterations without convergence, accept current coverage with warning.

In Full QA mode, spawn N generator agents in parallel (one per test layer). Each receives a QAGEN-N task with layer assignment. Use `run_in_background: true` for all spawns, then coordinator stops and waits for callbacks. Similarly spawn N executor agents in parallel for QARUN-N tasks.

### Cadence Control

**Beat model**: Event-driven, each beat = coordinator wake -> process -> spawn -> STOP.

```
Beat Cycle (single beat)
═══════════════════════════════════════════════════════════
  Event                   Coordinator              Workers
───────────────────────────────────────────────────────────
  callback/resume ──> ┌─ handleCallback ─┐
                      │  mark completed   │
                      │  check pipeline   │
                      ├─ handleSpawnNext ─┤
                      │  find ready tasks │
                      │  spawn workers ───┼──> [Worker A] Phase 1-5
                      │  (parallel OK)  ──┼──> [Worker B] Phase 1-5
                      └─ STOP (idle) ─────┘         │
                                                     │
  callback <─────────────────────────────────────────┘
  (next beat)              SendMessage + TaskUpdate(completed)
═══════════════════════════════════════════════════════════
```

**Pipeline beat view**:

```
Discovery mode (5 beats, strictly serial)
──────────────────────────────────────────────────────────
Beat  1         2         3         4         5
      │         │         │         │         │
      SCOUT -> STRAT -> GEN -> RUN -> ANA
      ▲                                      ▲
   pipeline                               pipeline
    start                                  done

S=SCOUT  STRAT=QASTRAT  GEN=QAGEN  RUN=QARUN  ANA=QAANA

Testing mode (6 beats, layer progression)
──────────────────────────────────────────────────────────
Beat  1         2         3         4         5         6
      │         │         │         │         │         │
      STRAT -> GEN-L1 -> RUN-L1 -> GEN-L2 -> RUN-L2 -> ANA
      ▲                                                  ▲
   no scout                                           analysis
   (test only)

Full QA mode (6 beats, with parallel windows + regression)
──────────────────────────────────────────────────────────
Beat  1       2       3              4              5       6
      │       │  ┌────┴────┐   ┌────┴────┐         │       │
      SCOUT -> STRAT -> GEN-L1||GEN-L2 -> RUN-1||RUN-2 -> ANA -> SCOUT-2
                        ▲                                          ▲
                   parallel gen                              regression
                                                               scan
```

**Checkpoints**:

| Trigger | Location | Behavior |
|---------|----------|----------|
| GC loop limit | QARUN coverage < target | After 3 iterations, accept current coverage with warning |
| Pipeline stall | No ready + no running | Check missing tasks, report to user |
| Regression scan (full mode) | QAANA-001 complete | Trigger SCOUT-002 for regression verification |

**Stall Detection** (coordinator `handleCheck` executes):

| Check | Condition | Resolution |
|-------|-----------|------------|
| Worker no response | in_progress task no callback | Report waiting task list, suggest user `resume` |
| Pipeline deadlock | no ready + no running + has pending | Check blockedBy dependency chain, report blocking point |
| GC loop exceeded | generator/executor iteration > 3 | Terminate loop, output latest coverage report |

### Task Metadata Registry

| Task ID | Role | Phase | Dependencies | Description |
|---------|------|-------|-------------|-------------|
| SCOUT-001 | scout | discovery | (none) | Multi-perspective issue scanning |
| QASTRAT-001 | strategist | strategy | SCOUT-001 or (none) | Change scope analysis + test strategy |
| QAGEN-001 | generator | generation | QASTRAT-001 | L1 unit test generation |
| QAGEN-002 | generator | generation | QASTRAT-001 (full mode) | L2 integration test generation |
| QARUN-001 | executor | execution | QAGEN-001 | L1 test execution + fix cycles |
| QARUN-002 | executor | execution | QAGEN-002 (full mode) | L2 test execution + fix cycles |
| QAANA-001 | analyst | analysis | QARUN-001 (+ QARUN-002) | Defect pattern analysis + quality report |
| SCOUT-002 | scout | regression | QAANA-001 (full mode) | Regression scan after fixes |

---

## Coordinator Spawn Template

When coordinator spawns workers, use background mode (Spawn-and-Stop):

```
Task({
  subagent_type: "general-purpose",
  description: "Spawn <role> worker",
  team_name: <team-name>,
  name: "<role>",
  run_in_background: true,
  prompt: `You are team "<team-name>" <ROLE>.

## Primary Directive
All your work must be executed through Skill to load role definition:
Skill(skill="team-quality-assurance", args="--role=<role>")

Current requirement: <task-description>
Session: <session-folder>

## Role Guidelines
- Only process <PREFIX>-* tasks, do not execute other role work
- All output prefixed with [<role>] identifier
- Only communicate with coordinator
- Do not use TaskCreate for other roles
- Call mcp__ccw-tools__team_msg before every SendMessage

## Workflow
1. Call Skill -> load role definition and execution logic
2. Follow role.md 5-Phase flow
3. team_msg + SendMessage results to coordinator
4. TaskUpdate completed -> check next task`
})
```

### Parallel Spawn (N agents for same role)

> When pipeline has parallel tasks assigned to the same role, spawn N distinct agents with unique names. A single agent can only process tasks serially.

**Parallel detection**:

| Condition | Action |
|-----------|--------|
| N parallel tasks for same role prefix | Spawn N agents named `<role>-1`, `<role>-2` ... |
| Single task for role | Standard spawn (single agent) |

**Parallel spawn template**:

```
Task({
  subagent_type: "general-purpose",
  description: "Spawn <role>-<N> worker",
  team_name: <team-name>,
  name: "<role>-<N>",
  run_in_background: true,
  prompt: `You are team "<team-name>" <ROLE> (<role>-<N>).
Your agent name is "<role>-<N>", use this name for task discovery owner matching.

## Primary Directive
Skill(skill="team-quality-assurance", args="--role=<role> --agent-name=<role>-<N>")

## Role Guidelines
- Only process tasks where owner === "<role>-<N>" with <PREFIX>-* prefix
- All output prefixed with [<role>] identifier

## Workflow
1. TaskList -> find tasks where owner === "<role>-<N>" with <PREFIX>-* prefix
2. Skill -> execute role definition
3. team_msg + SendMessage results to coordinator
4. TaskUpdate completed -> check next task`
})
```

**Dispatch must match agent names**: In dispatch, parallel tasks use instance-specific owner: `<role>-<N>`. In role.md, task discovery uses --agent-name for owner matching.

## Unified Session Directory

```
.workflow/.team/QA-<slug>-<YYYY-MM-DD>/
├── team-session.json           # Session state
├── shared-memory.json          # Discovered issues / test strategy / defect patterns / coverage history
├── wisdom/                     # Cross-task knowledge
│   ├── learnings.md
│   ├── decisions.md
│   ├── conventions.md
│   └── issues.md
├── scan/                       # Scout output
│   └── scan-results.json
├── strategy/                   # Strategist output
│   └── test-strategy.md
├── tests/                      # Generator output
│   ├── L1-unit/
│   ├── L2-integration/
│   └── L3-e2e/
├── results/                    # Executor output
│   ├── run-001.json
│   └── coverage-001.json
└── analysis/                   # Analyst output
    └── quality-report.md
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown --role value | Error with available role list |
| Missing --role arg | Orchestration Mode -> auto route to coordinator |
| Role file not found | Error with expected path (roles/<name>/role.md) |
| Task prefix conflict | Log warning, proceed |
| Coverage never reaches target | After 3 GC loops, accept current with warning |
| Scout finds no issues | Report clean scan, skip to testing mode |
| Test environment broken | Notify user, suggest manual fix |
