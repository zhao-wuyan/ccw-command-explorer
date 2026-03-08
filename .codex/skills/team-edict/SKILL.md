---
name: team-edict
description: |
  三省六部 multi-agent collaboration framework. Imperial edict workflow:
  Crown Prince receives edict -> Zhongshu (Planning) -> Menxia (Multi-dimensional Review) ->
  Shangshu (Dispatch) -> Six Ministries parallel execution.
  Mandatory kanban state reporting, Blocked as first-class state, full observability.
argument-hint: "[-y|--yes] [-c|--concurrency N] [--continue] \"task description / edict\""
allowed-tools: spawn_agents_on_csv, spawn_agent, wait, send_input, close_agent, Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

## Auto Mode

When `--yes` or `-y`: Auto-confirm task decomposition, skip interactive validation, use defaults.

# Team Edict -- Three Departments Six Ministries

## Usage

```bash
$team-edict "Implement user authentication module with JWT tokens"
$team-edict -c 4 "Refactor the data pipeline for better performance"
$team-edict -y "Add comprehensive test coverage for auth module"
$team-edict --continue "EDT-20260308-143022"
```

**Flags**:
- `-y, --yes`: Skip all confirmations (auto mode)
- `-c, --concurrency N`: Max concurrent agents within each wave (default: 4)
- `--continue`: Resume existing session

**Output Directory**: `.workflow/.csv-wave/{session-id}/`
**Core Output**: `tasks.csv` (master state) + `results.csv` (final) + `discoveries.ndjson` (shared exploration) + `context.md` (human-readable report)

---

## Overview

Imperial edict-inspired multi-agent collaboration framework with **strict cascading approval pipeline** and **parallel ministry execution**. The Three Departments (zhongshu/menxia/shangshu) perform serial planning, review, and dispatch. The Six Ministries (gongbu/bingbu/hubu/libu/libu-hr/xingbu) execute tasks in dependency-ordered waves.

**Execution Model**: Hybrid -- CSV wave pipeline (primary) + individual agent spawn (secondary)

```
+-------------------------------------------------------------------------+
|                    TEAM EDICT WORKFLOW                                    |
+-------------------------------------------------------------------------+
|                                                                          |
|  Phase 0: Pre-Wave Interactive (Three Departments Serial Pipeline)       |
|     +-- Stage 1: Zhongshu (Planning) -- drafts execution plan            |
|     +-- Stage 2: Menxia (Review) -- multi-dimensional review             |
|     |      +-- Reject -> loop back to Zhongshu (max 3 rounds)            |
|     +-- Stage 3: Shangshu (Dispatch) -- routes to Six Ministries         |
|     +-- Output: tasks.csv with ministry assignments + dependency waves   |
|                                                                          |
|  Phase 1: Requirement -> CSV + Classification                            |
|     +-- Parse Shangshu dispatch plan into tasks.csv                      |
|     +-- Classify tasks: csv-wave (ministry work) | interactive (QA loop) |
|     +-- Compute dependency waves (topological sort)                      |
|     +-- Generate tasks.csv with wave + exec_mode columns                 |
|     +-- User validates task breakdown (skip if -y)                       |
|                                                                          |
|  Phase 2: Wave Execution Engine (Extended)                               |
|     +-- For each wave (1..N):                                            |
|     |   +-- Build wave CSV (filter csv-wave tasks for this wave)         |
|     |   +-- Inject previous findings into prev_context column            |
|     |   +-- spawn_agents_on_csv(wave CSV)                                |
|     |   +-- Execute post-wave interactive tasks (if any)                 |
|     |   +-- Merge all results into master tasks.csv                      |
|     |   +-- Check: any failed? -> skip dependents                        |
|     +-- discoveries.ndjson shared across all modes (append-only)         |
|                                                                          |
|  Phase 3: Post-Wave Interactive (Quality Aggregation)                    |
|     +-- Aggregation Agent: collects all ministry outputs                 |
|     +-- Generates final edict completion report                          |
|     +-- Quality gate validation against specs/quality-gates.md           |
|                                                                          |
|  Phase 4: Results Aggregation                                            |
|     +-- Export final results.csv                                         |
|     +-- Generate context.md with all findings                            |
|     +-- Display summary: completed/failed/skipped per wave               |
|     +-- Offer: view results | retry failed | done                       |
|                                                                          |
+-------------------------------------------------------------------------+
```

---

## Task Classification Rules

Each task is classified by `exec_mode`:

| exec_mode | Mechanism | Criteria |
|-----------|-----------|----------|
| `csv-wave` | `spawn_agents_on_csv` | One-shot, structured I/O, no multi-round interaction |
| `interactive` | `spawn_agent`/`wait`/`send_input`/`close_agent` | Multi-round, clarification, inline utility |

**Classification Decision**:

| Task Property | Classification |
|---------------|---------------|
| Ministry implementation (IMPL/OPS/DATA/DOC/HR) | `csv-wave` |
| Quality assurance with test-fix loop (QA) | `interactive` |
| Single-department self-contained work | `csv-wave` |
| Cross-department coordination needed | `interactive` |
| Requires iterative feedback (test -> fix -> retest) | `interactive` |
| Standalone analysis or generation | `csv-wave` |

---

## CSV Schema

### tasks.csv (Master State)

```csv
id,title,description,deps,context_from,exec_mode,department,task_prefix,priority,dispatch_batch,acceptance_criteria,wave,status,findings,artifact_path,error
IMPL-001,"Implement JWT auth","Create JWT authentication middleware with token validation","","","csv-wave","gongbu","IMPL","P0","1","All auth endpoints return valid JWT tokens","1","pending","","",""
DOC-001,"Write API docs","Generate OpenAPI documentation for auth endpoints","IMPL-001","IMPL-001","csv-wave","libu","DOC","P1","2","API docs cover all auth endpoints","2","pending","","",""
QA-001,"Test auth module","Execute test suite and validate coverage >= 95%","IMPL-001","IMPL-001","interactive","xingbu","QA","P1","2","Test pass rate >= 95%, no Critical bugs","2","pending","","",""
```

**Columns**:

| Column | Phase | Description |
|--------|-------|-------------|
| `id` | Input | Unique task identifier (DEPT-NNN format) |
| `title` | Input | Short task title |
| `description` | Input | Detailed task description (self-contained for agent execution) |
| `deps` | Input | Semicolon-separated dependency task IDs |
| `context_from` | Input | Semicolon-separated task IDs whose findings this task needs |
| `exec_mode` | Input | `csv-wave` or `interactive` |
| `department` | Input | Target ministry: gongbu/bingbu/hubu/libu/libu-hr/xingbu |
| `task_prefix` | Input | Task type prefix: IMPL/OPS/DATA/DOC/HR/QA |
| `priority` | Input | Priority level: P0 (highest) to P3 (lowest) |
| `dispatch_batch` | Input | Batch number from Shangshu dispatch plan (1-based) |
| `acceptance_criteria` | Input | Specific, measurable acceptance criteria from dispatch plan |
| `wave` | Computed | Wave number (computed by topological sort, 1-based) |
| `status` | Output | `pending` -> `completed` / `failed` / `skipped` |
| `findings` | Output | Key discoveries or implementation notes (max 500 chars) |
| `artifact_path` | Output | Path to output artifact file relative to session dir |
| `error` | Output | Error message if failed (empty if success) |

### Per-Wave CSV (Temporary)

Each wave generates a temporary `wave-{N}.csv` with extra `prev_context` column (csv-wave tasks only).

---

## Agent Registry (Interactive Agents)

| Agent | Role File | Pattern | Responsibility | Position |
|-------|-----------|---------|----------------|----------|
| zhongshu-planner | agents/zhongshu-planner.md | 2.3 (sequential pipeline) | Draft structured execution plan from edict requirements | standalone (Phase 0, Stage 1) |
| menxia-reviewer | agents/menxia-reviewer.md | 2.4 (multi-perspective analysis) | Multi-dimensional review with 4 CLI analyses | standalone (Phase 0, Stage 2) |
| shangshu-dispatcher | agents/shangshu-dispatcher.md | 2.3 (sequential pipeline) | Parse approved plan and generate ministry task assignments | standalone (Phase 0, Stage 3) |
| qa-verifier | agents/qa-verifier.md | 2.5 (iterative refinement) | Quality assurance with test-fix loop (max 3 rounds) | post-wave |
| aggregator | agents/aggregator.md | 2.3 (sequential pipeline) | Collect all ministry outputs and generate final report | standalone (Phase 3) |

> **COMPACT PROTECTION**: Agent files are execution documents. When context compression occurs, **you MUST immediately `Read` the corresponding agent.md** to reload.

---

## Output Artifacts

| File | Purpose | Lifecycle |
|------|---------|-----------|
| `tasks.csv` | Master state -- all tasks with status/findings | Updated after each wave |
| `wave-{N}.csv` | Per-wave input (temporary, csv-wave tasks only) | Created before wave, deleted after |
| `results.csv` | Final export of all task results | Created in Phase 4 |
| `discoveries.ndjson` | Shared exploration board (all agents, both modes) | Append-only, carries across waves |
| `context.md` | Human-readable execution report | Created in Phase 4 |
| `plan/zhongshu-plan.md` | Zhongshu execution plan | Created in Phase 0 Stage 1 |
| `review/menxia-review.md` | Menxia review report with 4-dimensional analysis | Created in Phase 0 Stage 2 |
| `plan/dispatch-plan.md` | Shangshu dispatch plan with ministry assignments | Created in Phase 0 Stage 3 |
| `artifacts/{dept}-output.md` | Per-ministry output artifact | Created during wave execution |
| `interactive/{id}-result.json` | Results from interactive tasks (QA loops) | Created per interactive task |
| `agents/registry.json` | Active interactive agent tracking | Updated on spawn/close |

---

## Session Structure

```
.workflow/.csv-wave/{session-id}/
+-- tasks.csv                  # Master state (all tasks, both modes)
+-- results.csv                # Final results export
+-- discoveries.ndjson         # Shared discovery board (all agents)
+-- context.md                 # Human-readable report
+-- wave-{N}.csv               # Temporary per-wave input (csv-wave only)
+-- plan/
|   +-- zhongshu-plan.md       # Zhongshu execution plan
|   +-- dispatch-plan.md       # Shangshu dispatch plan
+-- review/
|   +-- menxia-review.md       # Menxia review report
+-- artifacts/
|   +-- gongbu-output.md       # Ministry outputs
|   +-- bingbu-output.md
|   +-- hubu-output.md
|   +-- libu-output.md
|   +-- libu-hr-output.md
|   +-- xingbu-report.md
+-- interactive/               # Interactive task artifacts
|   +-- {id}-result.json       # Per-task results
+-- agents/
    +-- registry.json          # Active interactive agent tracking
```

---

## Implementation

### Session Initialization

```
1. Parse $ARGUMENTS for task description (the "edict")
2. Generate session ID: EDT-{slug}-{YYYYMMDD-HHmmss}
3. Create session directory: .workflow/.csv-wave/{session-id}/
4. Create subdirectories: plan/, review/, artifacts/, interactive/, agents/
5. Initialize registry.json: { "active": [], "closed": [] }
6. Initialize discoveries.ndjson (empty file)
7. Read specs: .codex/skills/team-edict/specs/team-config.json
8. Read quality gates: .codex/skills/team-edict/specs/quality-gates.md
9. Log session start to context.md
```

---

### Phase 0: Pre-Wave Interactive (Three Departments Serial Pipeline)

**Objective**: Execute the serial approval pipeline (zhongshu -> menxia -> shangshu) to produce a validated, reviewed dispatch plan that decomposes the edict into ministry-level tasks.

#### Stage 1: Zhongshu Planning

```javascript
const zhongshu = spawn_agent({
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: .codex/skills/team-edict/agents/zhongshu-planner.md (MUST read first)
2. Read: ${sessionDir}/discoveries.ndjson (shared discoveries, skip if not exists)
3. Read: .codex/skills/team-edict/specs/team-config.json (routing rules)

---

Goal: Draft a structured execution plan for the following edict
Scope: Analyze codebase, decompose into ministry-level subtasks, define acceptance criteria
Deliverables: ${sessionDir}/plan/zhongshu-plan.md

### Edict (Original Requirement)
${edictText}
`
})

const zhongshuResult = wait({ ids: [zhongshu], timeout_ms: 600000 })

if (zhongshuResult.timed_out) {
  send_input({ id: zhongshu, message: "Please finalize your execution plan immediately and output current findings." })
  const retry = wait({ ids: [zhongshu], timeout_ms: 120000 })
}

// Store result
Write(`${sessionDir}/interactive/zhongshu-result.json`, JSON.stringify({
  task_id: "PLAN-001",
  status: "completed",
  findings: parseFindings(zhongshuResult),
  timestamp: new Date().toISOString()
}))

close_agent({ id: zhongshu })
```

#### Stage 2: Menxia Multi-Dimensional Review

**Rejection Loop**: If menxia rejects (approved=false), respawn zhongshu with feedback. Max 3 rounds.

```javascript
let reviewRound = 0
let approved = false

while (!approved && reviewRound < 3) {
  reviewRound++

  const menxia = spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: .codex/skills/team-edict/agents/menxia-reviewer.md (MUST read first)
2. Read: ${sessionDir}/plan/zhongshu-plan.md (plan to review)
3. Read: ${sessionDir}/discoveries.ndjson (shared discoveries)

---

Goal: Multi-dimensional review of Zhongshu plan (Round ${reviewRound}/3)
Scope: Feasibility, completeness, risk, resource allocation
Deliverables: ${sessionDir}/review/menxia-review.md

### Original Edict
${edictText}

### Previous Review (if rejection round > 1)
${reviewRound > 1 ? readPreviousReview() : "First review round"}
`
  })

  const menxiaResult = wait({ ids: [menxia], timeout_ms: 600000 })

  if (menxiaResult.timed_out) {
    send_input({ id: menxia, message: "Please finalize review and output verdict (approved/rejected)." })
    const retry = wait({ ids: [menxia], timeout_ms: 120000 })
  }

  close_agent({ id: menxia })

  // Parse verdict from review report
  const reviewReport = Read(`${sessionDir}/review/menxia-review.md`)
  approved = reviewReport.includes("approved") || reviewReport.includes("approved: true")

  if (!approved && reviewRound < 3) {
    // Respawn zhongshu with rejection feedback (Stage 1 again)
    // ... spawn zhongshu with rejection_feedback = reviewReport ...
  }
}

if (!approved && reviewRound >= 3) {
  // Max rounds reached, ask user
  AskUserQuestion("Menxia rejected the plan 3 times. Please review and decide: approve, reject, or provide guidance.")
}
```

#### Stage 3: Shangshu Dispatch

```javascript
const shangshu = spawn_agent({
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: .codex/skills/team-edict/agents/shangshu-dispatcher.md (MUST read first)
2. Read: ${sessionDir}/plan/zhongshu-plan.md (approved plan)
3. Read: ${sessionDir}/review/menxia-review.md (review conditions)
4. Read: .codex/skills/team-edict/specs/team-config.json (routing rules)

---

Goal: Parse approved plan and generate Six Ministries dispatch plan
Scope: Route subtasks to departments, define execution batches, set dependencies
Deliverables: ${sessionDir}/plan/dispatch-plan.md
`
})

const shangshuResult = wait({ ids: [shangshu], timeout_ms: 300000 })
close_agent({ id: shangshu })

// Parse dispatch-plan.md to generate tasks.csv (Phase 1 input)
```

**Success Criteria**:
- zhongshu-plan.md written with structured subtask list
- menxia-review.md written with 4-dimensional analysis verdict
- dispatch-plan.md written with ministry assignments and batch ordering
- Interactive agents closed, results stored

---

### Phase 1: Requirement -> CSV + Classification

**Objective**: Parse the Shangshu dispatch plan into a tasks.csv with proper wave computation and exec_mode classification.

**Decomposition Rules**:

1. Read `${sessionDir}/plan/dispatch-plan.md`
2. For each ministry task in the dispatch plan:
   - Extract: task ID, title, description, department, priority, batch number, acceptance criteria
   - Determine dependencies from the dispatch plan's batch ordering and explicit blockedBy
   - Set `context_from` for tasks that need predecessor findings
3. Apply classification rules (see Task Classification Rules above)
4. Compute waves via topological sort (Kahn's BFS with depth tracking)
5. Generate `tasks.csv` with all columns

**Classification Rules**:

| Department | Default exec_mode | Override Condition |
|------------|-------------------|-------------------|
| gongbu (IMPL) | csv-wave | Interactive if requires iterative codebase exploration |
| bingbu (OPS) | csv-wave | - |
| hubu (DATA) | csv-wave | - |
| libu (DOC) | csv-wave | - |
| libu-hr (HR) | csv-wave | - |
| xingbu (QA) | interactive | Always interactive (test-fix loop) |

**Wave Computation**: Kahn's BFS topological sort with depth tracking (csv-wave tasks only).

**User Validation**: Display task breakdown with wave + exec_mode assignment (skip if AUTO_YES).

**Success Criteria**:
- tasks.csv created with valid schema, wave, and exec_mode assignments
- No circular dependencies
- User approved (or AUTO_YES)

---

### Phase 2: Wave Execution Engine (Extended)

**Objective**: Execute tasks wave-by-wave with hybrid mechanism support and cross-wave context propagation.

```
For each wave W in 1..max_wave:

  1. FILTER csv-wave tasks where wave == W and status == "pending"
  2. CHECK dependencies: if any dep has status == "failed", mark task as "skipped"
  3. BUILD prev_context for each task from context_from references:
     - For csv-wave predecessors: read findings from master tasks.csv
     - For interactive predecessors: read from interactive/{id}-result.json
  4. GENERATE wave-{W}.csv with prev_context column added
  5. EXECUTE csv-wave tasks:
     spawn_agents_on_csv({
       task_csv_path: "${sessionDir}/wave-{W}.csv",
       instruction_path: ".codex/skills/team-edict/instructions/agent-instruction.md",
       schema_path: ".codex/skills/team-edict/schemas/tasks-schema.md",
       additional_instructions: "Session directory: ${sessionDir}. Department: {department}. Priority: {priority}.",
       concurrency: CONCURRENCY
     })
  6. MERGE results back into master tasks.csv (update status, findings, artifact_path, error)
  7. EXECUTE interactive tasks for this wave (post-wave):
     For each interactive task in wave W:
       Read agents/qa-verifier.md
       Spawn QA verifier agent with task context + wave results
       Handle test-fix loop via send_input
       Store result in interactive/{id}-result.json
       Close agent, update registry.json
  8. CLEANUP: delete wave-{W}.csv
  9. LOG wave completion to context.md and discoveries.ndjson

  Wave completion check:
    - All tasks completed or skipped -> proceed to next wave
    - Any failed non-skippable task -> log error, continue (dependents will be skipped)
```

**Success Criteria**:
- All waves executed in order
- Both csv-wave and interactive tasks handled per wave
- Each wave's results merged into master CSV before next wave starts
- Dependent tasks skipped when predecessor failed
- discoveries.ndjson accumulated across all waves and mechanisms
- Interactive agent lifecycle tracked in registry.json

---

### Phase 3: Post-Wave Interactive (Quality Aggregation)

**Objective**: Collect all ministry outputs, validate against quality gates, and generate the final edict completion report.

```javascript
const aggregator = spawn_agent({
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: .codex/skills/team-edict/agents/aggregator.md (MUST read first)
2. Read: ${sessionDir}/tasks.csv (master state)
3. Read: ${sessionDir}/discoveries.ndjson (all discoveries)
4. Read: .codex/skills/team-edict/specs/quality-gates.md (quality standards)

---

Goal: Aggregate all ministry outputs into final edict completion report
Scope: All artifacts in ${sessionDir}/artifacts/, all interactive results
Deliverables: ${sessionDir}/context.md (final report)

### Ministry Artifacts to Collect
${listAllArtifacts()}

### Quality Gate Standards
Read from: .codex/skills/team-edict/specs/quality-gates.md
`
})

const aggResult = wait({ ids: [aggregator], timeout_ms: 300000 })
close_agent({ id: aggregator })
```

**Success Criteria**:
- Post-wave interactive processing complete
- Interactive agents closed, results stored

---

### Phase 4: Results Aggregation

**Objective**: Generate final results and human-readable report.

```
1. READ master tasks.csv
2. EXPORT results.csv with final status for all tasks
3. GENERATE context.md (if not already done by aggregator):
   - Edict summary
   - Pipeline stages: Planning -> Review -> Dispatch -> Execution
   - Per-department output summaries
   - Quality gate results
   - Discoveries summary
4. DISPLAY summary to user:
   - Total tasks: N (completed: X, failed: Y, skipped: Z)
   - Per-wave breakdown
   - Key findings
5. CLEANUP:
   - Close any remaining interactive agents (registry.json)
   - Remove temporary wave CSV files
6. OFFER: view full report | retry failed tasks | done
```

**Success Criteria**:
- results.csv exported (all tasks, both modes)
- context.md generated
- All interactive agents closed (registry.json cleanup)
- Summary displayed to user

---

## Shared Discovery Board Protocol

All agents (both csv-wave and interactive) share a single `discoveries.ndjson` file for cross-agent knowledge propagation.

### Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `codebase_pattern` | `pattern_name` | `{pattern_name, files, description}` | Identified codebase patterns and conventions |
| `dependency_found` | `dep_name` | `{dep_name, version, used_by}` | External dependency discoveries |
| `risk_identified` | `risk_id` | `{risk_id, severity, description, mitigation}` | Risk findings from any agent |
| `implementation_note` | `file_path` | `{file_path, note, line_range}` | Implementation decisions and notes |
| `test_result` | `test_suite` | `{test_suite, pass_rate, failures}` | Test execution results |
| `quality_issue` | `issue_id` | `{issue_id, severity, file, description}` | Quality issues found during review |
| `routing_note` | `task_id` | `{task_id, department, reason}` | Dispatch routing decisions |

### Protocol

```bash
# Append discovery (any agent, any mode)
echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> ${sessionDir}/discoveries.ndjson

# Read discoveries (any agent, any mode)
# Read ${sessionDir}/discoveries.ndjson, parse each line as JSON
# Deduplicate by type + dedup_key
```

### Rules
- **Append-only**: Never modify or delete existing entries
- **Deduplicate on read**: When reading, use type + dedup_key to skip duplicates
- **Both mechanisms share**: csv-wave agents and interactive agents use the same file
- **Carry across waves**: Discoveries persist across all waves

---

## Six Ministries Routing Rules

Shangshu dispatcher uses these rules to assign tasks to ministries:

| Keyword Signals | Target Ministry | Role ID | Task Prefix |
|----------------|-----------------|---------|-------------|
| Feature dev, architecture, code, refactor, implement, API | Engineering | gongbu | IMPL |
| Deploy, CI/CD, infrastructure, container, monitoring, security ops | Operations | bingbu | OPS |
| Data analysis, statistics, cost, reports, resource mgmt | Data & Resources | hubu | DATA |
| Documentation, README, UI copy, specs, API docs, comms | Documentation | libu | DOC |
| Testing, QA, bug, code review, compliance audit | Quality Assurance | xingbu | QA |
| Agent management, training, skill optimization, evaluation | Personnel | libu-hr | HR |

---

## Kanban State Protocol

All agents must report state transitions. In Codex context, agents write state to discoveries.ndjson:

### State Machine

```
Pending -> Doing -> Done
              |
           Blocked (can enter at any time, must report reason)
```

### State Reporting via Discoveries

```bash
# Task start
echo '{"ts":"<ISO8601>","worker":"{id}","type":"state_update","data":{"state":"Doing","task_id":"{id}","department":"{department}","step":"Starting execution"}}' >> ${sessionDir}/discoveries.ndjson

# Progress update
echo '{"ts":"<ISO8601>","worker":"{id}","type":"progress","data":{"task_id":"{id}","current":"Step 2: Implementing API","plan":"Step1 done|Step2 in progress|Step3 pending"}}' >> ${sessionDir}/discoveries.ndjson

# Completion
echo '{"ts":"<ISO8601>","worker":"{id}","type":"state_update","data":{"state":"Done","task_id":"{id}","remark":"Completed: implementation summary"}}' >> ${sessionDir}/discoveries.ndjson

# Blocked
echo '{"ts":"<ISO8601>","worker":"{id}","type":"state_update","data":{"state":"Blocked","task_id":"{id}","reason":"Cannot proceed: missing dependency"}}' >> ${sessionDir}/discoveries.ndjson
```

---

## Interactive Task Execution

For interactive tasks within a wave (primarily QA test-fix loops):

**Spawn Protocol**:

```javascript
const agent = spawn_agent({
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: .codex/skills/team-edict/agents/qa-verifier.md (MUST read first)
2. Read: ${sessionDir}/discoveries.ndjson (shared discoveries)
3. Read: .codex/skills/team-edict/specs/quality-gates.md (quality standards)

---

Goal: Execute QA verification for task ${taskId}
Scope: ${taskDescription}
Deliverables: Test report + pass/fail verdict

### Previous Context
${prevContextFromCompletedTasks}

### Acceptance Criteria
${acceptanceCriteria}
`
})
```

**Wait + Process**:

```javascript
const result = wait({ ids: [agent], timeout_ms: 600000 })

if (result.timed_out) {
  send_input({ id: agent, message: "Please finalize and output current findings." })
  const retry = wait({ ids: [agent], timeout_ms: 120000 })
}

// Store result
Write(`${sessionDir}/interactive/${taskId}-result.json`, JSON.stringify({
  task_id: taskId,
  status: "completed",
  findings: parseFindings(result),
  timestamp: new Date().toISOString()
}))
```

**Lifecycle Tracking**:

```javascript
// On spawn: register
registry.active.push({ id: agent, task_id: taskId, pattern: "qa-verifier", spawned_at: now })

// On close: move to closed
close_agent({ id: agent })
registry.active = registry.active.filter(a => a.id !== agent)
registry.closed.push({ id: agent, task_id: taskId, closed_at: now })
```

---

## Cross-Mechanism Context Bridging

### Interactive Result -> CSV Task

When a pre-wave interactive task produces results needed by csv-wave tasks:

```javascript
// 1. Interactive result stored in file
const resultFile = `${sessionDir}/interactive/${taskId}-result.json`

// 2. Wave engine reads when building prev_context for csv-wave tasks
// If a csv-wave task has context_from referencing an interactive task:
//   Read the interactive result file and include in prev_context
```

### CSV Result -> Interactive Task

When a post-wave interactive task needs CSV wave results:

```javascript
// Include in spawn message
const csvFindings = readMasterCSV().filter(t => t.wave === currentWave && t.exec_mode === 'csv-wave')
const context = csvFindings.map(t => `## Task ${t.id}: ${t.title}\n${t.findings}`).join('\n\n')

spawn_agent({
  message: `...\n### Wave ${currentWave} Results\n${context}\n...`
})
```

---

## Error Handling

| Error | Resolution |
|-------|------------|
| Circular dependency | Detect in wave computation, abort with error message |
| CSV agent timeout | Mark as failed in results, continue with wave |
| CSV agent failed | Mark as failed, skip dependent tasks in later waves |
| Interactive agent timeout | Urge convergence via send_input, then close if still timed out |
| Interactive agent failed | Mark as failed, skip dependents |
| Pre-wave interactive failed | Skip dependent csv-wave tasks in same wave |
| All agents in wave failed | Log error, offer retry or abort |
| CSV parse error | Validate CSV format before execution, show line number |
| discoveries.ndjson corrupt | Ignore malformed lines, continue with valid entries |
| Lifecycle leak | Cleanup all active agents via registry.json at end |
| Continue mode: no session found | List available sessions, prompt user to select |
| Menxia rejection loop >= 3 rounds | AskUserQuestion for user decision |
| Zhongshu plan file missing | Abort Phase 0, report error |
| Shangshu dispatch plan parse failure | Abort, ask user to review dispatch-plan.md |
| Ministry artifact not written | Mark task as failed, include in QA report |
| Test-fix loop exceeds 3 rounds | Mark QA as failed, report to aggregator |

---

## Specs Reference

| File | Content | Used By |
|------|---------|---------|
| [specs/team-config.json](specs/team-config.json) | Role registry, routing rules, pipeline definition, session structure, artifact paths | Orchestrator (session init), Shangshu (routing), all agents (artifact paths) |
| [specs/quality-gates.md](specs/quality-gates.md) | Per-phase quality gate standards, cross-phase consistency checks | Aggregator (Phase 3), QA verifier (test validation) |

---

## Core Rules

1. **Start Immediately**: First action is session initialization, then Phase 0
2. **Wave Order is Sacred**: Never execute wave N before wave N-1 completes and results are merged
3. **CSV is Source of Truth**: Master tasks.csv holds all state (both csv-wave and interactive)
4. **CSV First**: Default to csv-wave for tasks; only use interactive when interaction pattern requires it
5. **Context Propagation**: prev_context built from master CSV, not from memory
6. **Discovery Board is Append-Only**: Never clear, modify, or recreate discoveries.ndjson -- both mechanisms share it
7. **Skip on Failure**: If a dependency failed, skip the dependent task (regardless of mechanism)
8. **Lifecycle Balance**: Every spawn_agent MUST have a matching close_agent (tracked in registry.json)
9. **Cleanup Temp Files**: Remove wave-{N}.csv after results are merged
10. **DO NOT STOP**: Continuous execution until all waves complete or all remaining tasks are skipped
11. **Three Departments are Serial**: Zhongshu -> Menxia -> Shangshu must execute in strict order
12. **Rejection Loop Max 3**: Menxia can reject max 3 times before escalating to user
13. **Kanban is Mandatory**: All agents must report state transitions via discoveries.ndjson
14. **Quality Gates Apply**: Phase 3 aggregator validates all outputs against specs/quality-gates.md
