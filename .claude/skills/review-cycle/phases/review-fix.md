# Workflow Review-Cycle-Fix Command

## Quick Start

```bash
# Fix from exported findings file (session-based path)
/workflow:review-cycle-fix .workflow/active/WFS-123/.review/fix-export-1706184622000.json

# Fix from review directory (auto-discovers latest export)
/workflow:review-cycle-fix .workflow/active/WFS-123/.review/

# Resume interrupted fix session
/workflow:review-cycle-fix --resume

# Custom max retry attempts per finding
/workflow:review-cycle-fix .workflow/active/WFS-123/.review/ --max-iterations=5

# Custom batch size for parallel planning (default: 5 findings per batch)
/workflow:review-cycle-fix .workflow/active/WFS-123/.review/ --batch-size=3
```

**Fix Source**: Exported findings from review cycle dashboard
**Output Directory**: `{review-dir}/fixes/{fix-session-id}/` (within session .review/)
**Default Max Iterations**: 3 (per finding, adjustable)
**Default Batch Size**: 5 (findings per planning batch, adjustable)
**Max Parallel Agents**: 10 (concurrent planning agents)
**CLI Tools**: @cli-planning-agent (planning), @cli-execute-agent (fixing)

## What & Why

### Core Concept
Automated fix orchestrator with **parallel planning architecture**: Multiple AI agents analyze findings concurrently in batches, then coordinate parallel/serial execution. Generates fix timeline with intelligent grouping and dependency analysis, executes fixes with conservative test verification.

**Fix Process**:
- **Batching Phase (1.5)**: Orchestrator groups findings by file+dimension similarity, creates batches
- **Planning Phase (2)**: Up to 10 agents plan batches in parallel, generate partial plans, orchestrator aggregates
- **Execution Phase (3)**: Main orchestrator coordinates agents per aggregated timeline stages
- **Parallel Efficiency**: Customizable batch size (default: 5), MAX_PARALLEL=10 agents
- **No rigid structure**: Adapts to task requirements, not bound to fixed JSON format

**vs Manual Fixing**:
- **Manual**: Developer reviews findings one-by-one, fixes sequentially
- **Automated**: AI groups related issues, multiple agents plan in parallel, executes in optimal parallel/serial order with automatic test verification

### Value Proposition
1. **Parallel Planning**: Multiple agents analyze findings concurrently, reducing planning time for large batches (10+ findings)
2. **Intelligent Batching**: Semantic similarity grouping ensures related findings are analyzed together
3. **Multi-stage Coordination**: Supports complex parallel + serial execution with cross-batch dependency management
4. **Conservative Safety**: Mandatory test verification with automatic rollback on failure
5. **Resume Support**: Checkpoint-based recovery for interrupted sessions

### Orchestrator Boundary (CRITICAL)
- **ONLY command** for automated review finding fixes
- Manages: Intelligent batching (Phase 1.5), parallel planning coordination (launch N agents), plan aggregation, stage-based execution, agent scheduling, progress tracking
- Delegates: Batch planning to @cli-planning-agent, fix execution to @cli-execute-agent


### Execution Flow

```
Phase 1: Discovery & Initialization
   └─ Validate export file, create fix session structure, initialize state files

Phase 1.5: Intelligent Grouping & Batching
   ├─ Analyze findings metadata (file, dimension, severity)
   ├─ Group by semantic similarity (file proximity + dimension affinity)
   ├─ Create batches respecting --batch-size (default: 5)
   └─ Output: Finding batches for parallel planning

Phase 2: Parallel Planning Coordination (@cli-planning-agent × N)
   ├─ Launch MAX_PARALLEL planning agents concurrently (default: 10)
   ├─ Each agent processes one batch:
   │  ├─ Analyze findings for patterns and dependencies
   │  ├─ Group by file + dimension + root cause similarity
   │  ├─ Determine execution strategy (parallel/serial/hybrid)
   │  ├─ Generate fix timeline with stages
   │  └─ Output: partial-plan-{batch-id}.json
   ├─ Collect results from all agents
   └─ Aggregate: Merge partial plans → fix-plan.json (resolve cross-batch dependencies)

Phase 3: Execution Orchestration (Stage-based)
   For each timeline stage:
   ├─ Load groups for this stage
   ├─ If parallel: Launch all group agents simultaneously
   ├─ If serial: Execute groups sequentially
   ├─ Each agent:
   │  ├─ Analyze code context
   │  ├─ Apply fix per strategy
   │  ├─ Run affected tests
   │  ├─ On test failure: Rollback, retry up to max_iterations
   │  └─ On success: Commit, update fix-progress-{N}.json
   └─ Advance to next stage

Phase 4: Completion & Aggregation
   └─ Aggregate results → Generate fix-summary.md → Update history → Output summary

Phase 5: Session Completion (Optional)
   └─ If all fixes successful → Prompt to complete workflow session
```

### Agent Roles

| Agent | Responsibility |
|-------|---------------|
| **Orchestrator** | Input validation, session management, intelligent batching (Phase 1.5), parallel planning coordination (launch N agents), plan aggregation (merge partial plans, resolve cross-batch dependencies), stage-based execution scheduling, progress tracking, result aggregation |
| **@cli-planning-agent** | Batch findings analysis, intelligent grouping (file+dimension+root cause), execution strategy determination (parallel/serial/hybrid), timeline generation with dependency mapping, partial plan output |
| **@cli-execute-agent** | Fix execution per group, code context analysis, Edit tool operations, test verification, git rollback on failure, completion JSON generation |

## Enhanced Features

### 1. Parallel Planning Architecture

**Batch Processing Strategy**:

| Phase | Agent Count | Input | Output | Purpose |
|-------|-------------|-------|--------|---------|  
| **Batching (1.5)** | Orchestrator | All findings | Finding batches | Semantic grouping by file+dimension, respecting --batch-size |
| **Planning (2)** | N agents (≤10) | 1 batch each | partial-plan-{batch-id}.json | Analyze batch in parallel, generate execution groups and timeline |
| **Aggregation (2)** | Orchestrator | All partial plans | fix-plan.json | Merge timelines, resolve cross-batch dependencies |
| **Execution (3)** | M agents (dynamic) | 1 group each | fix-progress-{N}.json | Execute fixes per aggregated plan with test verification |

**Benefits**:
- **Speed**: N agents plan concurrently, reducing planning time for large batches
- **Scalability**: MAX_PARALLEL=10 prevents resource exhaustion
- **Flexibility**: Batch size customizable via --batch-size (default: 5)
- **Isolation**: Each planning agent focuses on related findings (semantic grouping)
- **Reusable**: Aggregated plan can be re-executed without re-planning

### 2. Intelligent Grouping Strategy

**Three-Level Grouping**:

```javascript
// Level 1: Primary grouping by file + dimension
{file: "auth.ts", dimension: "security"} → Group A
{file: "auth.ts", dimension: "quality"} → Group B
{file: "query-builder.ts", dimension: "security"} → Group C

// Level 2: Secondary grouping by root cause similarity
Group A findings → Semantic similarity analysis (threshold 0.7)
  → Sub-group A1: "missing-input-validation" (findings 1, 2)
  → Sub-group A2: "insecure-crypto" (finding 3)

// Level 3: Dependency analysis
Sub-group A1 creates validation utilities
Sub-group C4 depends on those utilities
→ A1 must execute before C4 (serial stage dependency)
```

**Similarity Computation**:
- Combine: `description + recommendation + category`
- Vectorize: TF-IDF or LLM embedding
- Cluster: Greedy algorithm with cosine similarity > 0.7

### 3. Execution Strategy Determination

**Strategy Types**:

| Strategy | When to Use | Stage Structure |
|----------|-------------|-----------------|
| **Parallel** | All groups independent, different files | Single stage, all groups in parallel |
| **Serial** | Strong dependencies, shared resources | Multiple stages, one group per stage |
| **Hybrid** | Mixed dependencies | Multiple stages, parallel within stages |

**Dependency Detection**:
- Shared file modifications
- Utility creation + usage patterns
- Test dependency chains
- Risk level clustering (high-risk groups isolated)

### 4. Conservative Test Verification

**Test Strategy** (per fix):

```javascript
// 1. Identify affected tests
const testPattern = identifyTestPattern(finding.file);
// e.g., "tests/auth/**/*.test.*" for src/auth/service.ts

// 2. Run tests
const result = await runTests(testPattern);

// 3. Evaluate
if (result.passRate < 100%) {
  // Rollback
  await gitCheckout(finding.file);

  // Retry with failure context
  if (attempts < maxIterations) {
    const fixContext = analyzeFailure(result.stderr);
    regenerateFix(finding, fixContext);
    retry();
  } else {
    markFailed(finding.id);
  }
} else {
  // Commit
  await gitCommit(`Fix: ${finding.title} [${finding.id}]`);
  markFixed(finding.id);
}
```

**Pass Criteria**: 100% test pass rate (no partial fixes)

## Core Responsibilities

### Orchestrator

**Phase 1: Discovery & Initialization**
- Input validation: Check export file exists and is valid JSON
- Auto-discovery: If review-dir provided, find latest `*-fix-export.json`
- Session creation: Generate fix-session-id (`fix-{timestamp}`)
- Directory structure: Create `{review-dir}/fixes/{fix-session-id}/` with subdirectories
- State files: Initialize active-fix-session.json (session marker)
- TodoWrite initialization: Set up 5-phase tracking (including Phase 1.5)

**Phase 1.5: Intelligent Grouping & Batching**
- Load all findings metadata (id, file, dimension, severity, title)
- Semantic similarity analysis:
  - Primary: Group by file proximity (same file or related modules)
  - Secondary: Group by dimension affinity (same review dimension)
  - Tertiary: Analyze title/description similarity (root cause clustering)
- Create batches respecting --batch-size (default: 5 findings per batch)
- Balance workload: Distribute high-severity findings across batches
- Output: Array of finding batches for parallel planning

**Phase 2: Parallel Planning Coordination**
- Determine concurrency: MIN(batch_count, MAX_PARALLEL=10)
- For each batch chunk (≤10 batches):
  - Launch all agents in parallel with run_in_background=true
  - Pass batch findings + project context + batch_id to each agent
  - Each agent outputs: partial-plan-{batch-id}.json
- Collect results via TaskOutput (blocking until all complete)
- Aggregate partial plans:
  - Merge execution groups (renumber group_ids sequentially: G1, G2, ...)
  - Merge timelines (detect cross-batch dependencies, adjust stages)
  - Resolve conflicts (same file in multiple batches → serialize)
- Generate final fix-plan.json with aggregated metadata
- TodoWrite update: Mark planning complete, start execution

**Phase 3: Execution Orchestration**
- Load fix-plan.json timeline stages
- For each stage:
  - If parallel mode: Launch all group agents via `Promise.all()`
  - If serial mode: Execute groups sequentially with `await`
  - Assign agent IDs (agents update their fix-progress-{N}.json)
- Handle agent failures gracefully (mark group as failed, continue)
- Advance to next stage only when current stage complete

**Phase 4: Completion & Aggregation**
- Collect final status from all fix-progress-{N}.json files
- Generate fix-summary.md with timeline and results
- Update fix-history.json with new session entry
- Remove active-fix-session.json
- TodoWrite completion: Mark all phases done
- Output summary to user

**Phase 5: Session Completion (Optional)**
- If all findings fixed successfully (no failures):
  - Prompt user: "All fixes complete. Complete workflow session? [Y/n]"
  - If confirmed: Execute `/workflow:session:complete` to archive session with lessons learned
- If partial success (some failures):
  - Output: "Some findings failed. Review fix-summary.md before completing session."
  - Do NOT auto-complete session

### Output File Structure

```
.workflow/active/WFS-{session-id}/.review/
├── fix-export-{timestamp}.json     # Exported findings (input)
└── fixes/{fix-session-id}/
    ├── partial-plan-1.json         # Batch 1 partial plan (planning agent 1 output)
    ├── partial-plan-2.json         # Batch 2 partial plan (planning agent 2 output)
    ├── partial-plan-N.json         # Batch N partial plan (planning agent N output)
    ├── fix-plan.json               # Aggregated execution plan (orchestrator merges partials)
    ├── fix-progress-1.json         # Group 1 progress (planning agent init → agent updates)
    ├── fix-progress-2.json         # Group 2 progress (planning agent init → agent updates)
    ├── fix-progress-3.json         # Group 3 progress (planning agent init → agent updates)
    ├── fix-summary.md              # Final report (orchestrator generates)
    ├── active-fix-session.json     # Active session marker
    └── fix-history.json            # All sessions history
```

**File Producers**:
- **Orchestrator**: Batches findings (Phase 1.5), aggregates partial plans → `fix-plan.json` (Phase 2), launches parallel planning agents
- **Planning Agents (N)**: Each outputs `partial-plan-{batch-id}.json` + initializes `fix-progress-*.json` for assigned groups
- **Execution Agents (M)**: Update assigned `fix-progress-{N}.json` in real-time


### Agent Invocation Template

**Phase 1.5: Intelligent Batching** (Orchestrator):
```javascript
// Load findings
const findings = JSON.parse(Read(exportFile));
const batchSize = flags.batchSize || 5;

// Semantic similarity analysis: group by file+dimension
const batches = [];
const grouped = new Map(); // key: "${file}:${dimension}"

for (const finding of findings) {
  const key = `${finding.file || 'unknown'}:${finding.dimension || 'general'}`;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(finding);
}

// Create batches respecting batchSize
for (const [key, group] of grouped) {
  while (group.length > 0) {
    const batch = group.splice(0, batchSize);
    batches.push({
      batch_id: batches.length + 1,
      findings: batch,
      metadata: { primary_file: batch[0].file, primary_dimension: batch[0].dimension }
    });
  }
}

console.log(`Created ${batches.length} batches (${batchSize} findings per batch)`);
```

**Phase 2: Parallel Planning** (Orchestrator launches N agents):
```javascript
const MAX_PARALLEL = 10;
const partialPlans = [];

// Process batches in chunks of MAX_PARALLEL
for (let i = 0; i < batches.length; i += MAX_PARALLEL) {
  const chunk = batches.slice(i, i + MAX_PARALLEL);
  const taskIds = [];

  // Launch agents in parallel (run_in_background=true)
  for (const batch of chunk) {
    const taskId = Task({
      subagent_type: "cli-planning-agent",
      run_in_background: true,
      description: `Plan batch ${batch.batch_id}: ${batch.findings.length} findings`,
      prompt: planningPrompt(batch)  // See Planning Agent template below
    });
    taskIds.push({ taskId, batch });
  }

  console.log(`Launched ${taskIds.length} planning agents...`);

  // Collect results from this chunk (blocking)
  for (const { taskId, batch } of taskIds) {
    const result = TaskOutput({ task_id: taskId, block: true });
    const partialPlan = JSON.parse(Read(`${sessionDir}/partial-plan-${batch.batch_id}.json`));
    partialPlans.push(partialPlan);
    updateTodo(`Batch ${batch.batch_id}`, 'completed');
  }
}

// Aggregate partial plans → fix-plan.json
let groupCounter = 1;
const groupIdMap = new Map();

for (const partial of partialPlans) {
  for (const group of partial.groups) {
    const newGroupId = `G${groupCounter}`;
    groupIdMap.set(`${partial.batch_id}:${group.group_id}`, newGroupId);
    aggregatedPlan.groups.push({ ...group, group_id: newGroupId, progress_file: `fix-progress-${groupCounter}.json` });
    groupCounter++;
  }
}

// Merge timelines, resolve cross-batch conflicts (shared files → serialize)
let stageCounter = 1;
for (const partial of partialPlans) {
  for (const stage of partial.timeline) {
    aggregatedPlan.timeline.push({
      ...stage, stage_id: stageCounter,
      groups: stage.groups.map(gid => groupIdMap.get(`${partial.batch_id}:${gid}`))
    });
    stageCounter++;
  }
}

// Write aggregated plan + initialize progress files
Write(`${sessionDir}/fix-plan.json`, JSON.stringify(aggregatedPlan, null, 2));
for (let i = 1; i <= aggregatedPlan.groups.length; i++) {
  Write(`${sessionDir}/fix-progress-${i}.json`, JSON.stringify(initProgressFile(aggregatedPlan.groups[i-1]), null, 2));
}
```

**Planning Agent (Batch Mode - Partial Plan Only)**:
```javascript
Task({
  subagent_type: "cli-planning-agent",
  run_in_background: true,
  description: `Plan batch ${batch.batch_id}: ${batch.findings.length} findings`,
  prompt: `
## Task Objective
Analyze code review findings in batch ${batch.batch_id} and generate **partial** execution plan.

## Input Data
Review Session: ${reviewId}
Fix Session ID: ${fixSessionId}
Batch ID: ${batch.batch_id}
Batch Findings: ${batch.findings.length}

Findings:
${JSON.stringify(batch.findings, null, 2)}

Project Context:
- Structure: ${projectStructure}
- Test Framework: ${testFramework}
- Git Status: ${gitStatus}

## Output Requirements

### 1. partial-plan-${batch.batch_id}.json
Generate partial execution plan with structure:
{
  "batch_id": ${batch.batch_id},
  "groups": [...],  // Groups created from batch findings (use local IDs: G1, G2, ...)
  "timeline": [...],  // Local timeline for this batch only
  "metadata": {
    "findings_count": ${batch.findings.length},
    "groups_count": N,
    "created_at": "ISO-8601-timestamp"
  }
}

**Key Generation Rules**:
- **Groups**: Create groups with local IDs (G1, G2, ...) using intelligent grouping (file+dimension+root cause)
- **Timeline**: Define stages for this batch only (local dependencies within batch)
- **Progress Files**: DO NOT generate fix-progress-*.json here (orchestrator handles after aggregation)

## Analysis Requirements

### Intelligent Grouping Strategy
Group findings using these criteria (in priority order):

1. **File Proximity**: Findings in same file or related files
2. **Dimension Affinity**: Same dimension (security, performance, etc.)
3. **Root Cause Similarity**: Similar underlying issues
4. **Fix Approach Commonality**: Can be fixed with similar approach

**Grouping Guidelines**:
- Optimal group size: 2-5 findings per group
- Avoid cross-cutting concerns in same group
- Consider test isolation (different test suites → different groups)
- Balance workload across groups for parallel execution

### Execution Strategy Determination (Local Only)

**Parallel Mode**: Use when groups are independent, no shared files
**Serial Mode**: Use when groups have dependencies or shared resources
**Hybrid Mode**: Use for mixed dependency graphs (recommended for most cases)

**Dependency Analysis**:
- Identify shared files between groups
- Detect test dependency chains
- Evaluate risk of concurrent modifications

### Risk Assessment

For each group, evaluate:
- **Complexity**: Based on code structure, file size, existing tests
- **Impact Scope**: Number of files affected, API surface changes
- **Rollback Feasibility**: Ease of reverting changes if tests fail

### Test Strategy

For each group, determine:
- **Test Pattern**: Glob pattern matching affected tests
- **Pass Criteria**: All tests must pass (100% pass rate)
- **Test Command**: Infer from project (package.json, pytest.ini, etc.)

## Output Files

Write to ${sessionDir}:
- ./partial-plan-${batch.batch_id}.json

## Quality Checklist

Before finalizing outputs:
- ✅ All batch findings assigned to exactly one group
- ✅ Group dependencies (within batch) correctly identified
- ✅ Timeline stages respect local dependencies
- ✅ Test patterns are valid and specific
- ✅ Risk assessments are realistic
  `
})
```

**Execution Agent** (per group):
```javascript
Task({
  subagent_type: "cli-execute-agent",
  description: `Fix ${group.findings.length} issues: ${group.group_name}`,
  prompt: `
## Task Objective
Execute fixes for code review findings in group ${group.group_id}. Update progress file in real-time with flow control tracking.

## Assignment
- Group ID: ${group.group_id}
- Group Name: ${group.group_name}
- Progress File: ${sessionDir}/${group.progress_file}
- Findings Count: ${group.findings.length}
- Max Iterations: ${maxIterations} (per finding)

## Fix Strategy
${JSON.stringify(group.fix_strategy, null, 2)}

## Risk Assessment
${JSON.stringify(group.risk_assessment, null, 2)}

## Execution Flow

### Initialization (Before Starting)

1. Read ${group.progress_file} to load initial state
2. Update progress file:
   - assigned_agent: "${agentId}"
   - status: "in-progress"
   - started_at: Current ISO 8601 timestamp
   - last_update: Current ISO 8601 timestamp
3. Write updated state back to ${group.progress_file}

### Main Execution Loop

For EACH finding in ${group.progress_file}.findings:

#### Step 1: Analyze Context

**Before Step**:
- Update finding: status→"in-progress", started_at→now()
- Update current_finding: Populate with finding details, status→"analyzing", action→"Reading file and understanding code structure"
- Update phase→"analyzing"
- Update flow_control: Add "analyze_context" step to implementation_approach (status→"in-progress"), set current_step→"analyze_context"
- Update last_update→now(), write to ${group.progress_file}

**Action**:
- Read file: finding.file
- Understand code structure around line: finding.line
- Analyze surrounding context (imports, dependencies, related functions)
- Review recommendations: finding.recommendations

**After Step**:
- Update flow_control: Mark "analyze_context" step as "completed" with completed_at→now()
- Update last_update→now(), write to ${group.progress_file}

#### Step 2: Apply Fix

**Before Step**:
- Update current_finding: status→"fixing", action→"Applying code changes per recommendations"
- Update phase→"fixing"
- Update flow_control: Add "apply_fix" step to implementation_approach (status→"in-progress"), set current_step→"apply_fix"
- Update last_update→now(), write to ${group.progress_file}

**Action**:
- Use Edit tool to implement code changes per finding.recommendations
- Follow fix_strategy.approach
- Maintain code style and existing patterns

**After Step**:
- Update flow_control: Mark "apply_fix" step as "completed" with completed_at→now()
- Update last_update→now(), write to ${group.progress_file}

#### Step 3: Test Verification

**Before Step**:
- Update current_finding: status→"testing", action→"Running test suite to verify fix"
- Update phase→"testing"
- Update flow_control: Add "run_tests" step to implementation_approach (status→"in-progress"), set current_step→"run_tests"
- Update last_update→now(), write to ${group.progress_file}

**Action**:
- Run tests using fix_strategy.test_pattern
- Require 100% pass rate
- Capture test output

**On Test Failure**:
- Git rollback: \`git checkout -- \${finding.file}\`
- Increment finding.attempts
- Update flow_control: Mark "run_tests" step as "failed" with completed_at→now()
- Update errors: Add entry (finding_id, error_type→"test_failure", message, timestamp)
- If finding.attempts < ${maxIterations}:
  - Reset flow_control: implementation_approach→[], current_step→null
  - Retry from Step 1
- Else:
  - Update finding: status→"completed", result→"failed", error_message→"Max iterations reached", completed_at→now()
  - Update summary counts, move to next finding

**On Test Success**:
- Update flow_control: Mark "run_tests" step as "completed" with completed_at→now()
- Update last_update→now(), write to ${group.progress_file}
- Proceed to Step 4

#### Step 4: Commit Changes

**Before Step**:
- Update current_finding: status→"committing", action→"Creating git commit for successful fix"
- Update phase→"committing"
- Update flow_control: Add "commit_changes" step to implementation_approach (status→"in-progress"), set current_step→"commit_changes"
- Update last_update→now(), write to ${group.progress_file}

**Action**:
- Git commit: \`git commit -m "fix(${finding.dimension}): ${finding.title} [${finding.id}]"\`
- Capture commit hash

**After Step**:
- Update finding: status→"completed", result→"fixed", commit_hash→<captured>, test_passed→true, completed_at→now()
- Update flow_control: Mark "commit_changes" step as "completed" with completed_at→now()
- Update last_update→now(), write to ${group.progress_file}

#### After Each Finding

- Update summary: Recalculate counts (pending/in_progress/fixed/failed) and percent_complete
- If all findings completed: Clear current_finding, reset flow_control
- Update last_update→now(), write to ${group.progress_file}

### Final Completion

When all findings processed:
- Update status→"completed", phase→"done", summary.percent_complete→100.0
- Update last_update→now(), write final state to ${group.progress_file}

## Critical Requirements

### Progress File Updates
- **MUST update after every significant action** (before/after each step)
- **Always maintain complete structure** - never write partial updates
- **Use ISO 8601 timestamps** - e.g., "2025-01-25T14:36:00Z"

### Flow Control Format
Follow action-planning-agent flow_control.implementation_approach format:
- step: Identifier (e.g., "analyze_context", "apply_fix")
- action: Human-readable description
- status: "pending" | "in-progress" | "completed" | "failed"
- started_at: ISO 8601 timestamp or null
- completed_at: ISO 8601 timestamp or null

### Error Handling
- Capture all errors in errors[] array
- Never leave progress file in invalid state
- Always write complete updates, never partial
- On unrecoverable error: Mark group as failed, preserve state

## Test Patterns
Use fix_strategy.test_pattern to run affected tests:
- Pattern: ${group.fix_strategy.test_pattern}
- Command: Infer from project (npm test, pytest, etc.)
- Pass Criteria: 100% pass rate required
  `
})
```



### Error Handling

**Batching Failures (Phase 1.5)**:
- Invalid findings data → Abort with error message
- Empty batches after grouping → Warn and skip empty batches

**Planning Failures (Phase 2)**:
- Planning agent timeout → Mark batch as failed, continue with other batches
- Partial plan missing → Skip batch, warn user
- Agent crash → Collect available partial plans, proceed with aggregation
- All agents fail → Abort entire fix session with error
- Aggregation conflicts → Apply conflict resolution (serialize conflicting groups)

**Execution Failures (Phase 3)**:
- Agent crash → Mark group as failed, continue with other groups
- Test command not found → Skip test verification, warn user
- Git operations fail → Abort with error, preserve state

**Rollback Scenarios**:
- Test failure after fix → Automatic `git checkout` rollback
- Max iterations reached → Leave file unchanged, mark as failed
- Unrecoverable error → Rollback entire group, save checkpoint

### TodoWrite Structure

**Initialization (after Phase 1.5 batching)**:
```javascript
TodoWrite({
  todos: [
    {content: "Phase 1: Discovery & Initialization", status: "completed", activeForm: "Discovering"},
    {content: "Phase 1.5: Intelligent Batching", status: "completed", activeForm: "Batching"},
    {content: "Phase 2: Parallel Planning", status: "in_progress", activeForm: "Planning"},
    {content: "  → Batch 1: 4 findings (auth.ts:security)", status: "pending", activeForm: "Planning batch 1"},
    {content: "  → Batch 2: 3 findings (query.ts:security)", status: "pending", activeForm: "Planning batch 2"},
    {content: "  → Batch 3: 2 findings (config.ts:quality)", status: "pending", activeForm: "Planning batch 3"},
    {content: "Phase 3: Execution", status: "pending", activeForm: "Executing"},
    {content: "Phase 4: Completion", status: "pending", activeForm: "Completing"}
  ]
});
```

**During Planning (parallel agents running)**:
```javascript
TodoWrite({
  todos: [
    {content: "Phase 1: Discovery & Initialization", status: "completed", activeForm: "Discovering"},
    {content: "Phase 1.5: Intelligent Batching", status: "completed", activeForm: "Batching"},
    {content: "Phase 2: Parallel Planning", status: "in_progress", activeForm: "Planning"},
    {content: "  → Batch 1: 4 findings (auth.ts:security)", status: "completed", activeForm: "Planning batch 1"},
    {content: "  → Batch 2: 3 findings (query.ts:security)", status: "in_progress", activeForm: "Planning batch 2"},
    {content: "  → Batch 3: 2 findings (config.ts:quality)", status: "in_progress", activeForm: "Planning batch 3"},
    {content: "Phase 3: Execution", status: "pending", activeForm: "Executing"},
    {content: "Phase 4: Completion", status: "pending", activeForm: "Completing"}
  ]
});
```

**During Execution**:
```javascript
TodoWrite({
  todos: [
    {content: "Phase 1: Discovery & Initialization", status: "completed", activeForm: "Discovering"},
    {content: "Phase 1.5: Intelligent Batching", status: "completed", activeForm: "Batching"},
    {content: "Phase 2: Parallel Planning (3 batches → 5 groups)", status: "completed", activeForm: "Planning"},
    {content: "Phase 3: Execution", status: "in_progress", activeForm: "Executing"},
    {content: "  → Stage 1: Parallel execution (3 groups)", status: "completed", activeForm: "Executing stage 1"},
    {content: "    • Group G1: Auth validation (2 findings)", status: "completed", activeForm: "Fixing G1"},
    {content: "    • Group G2: Query security (3 findings)", status: "completed", activeForm: "Fixing G2"},
    {content: "    • Group G3: Config quality (1 finding)", status: "completed", activeForm: "Fixing G3"},
    {content: "  → Stage 2: Serial execution (1 group)", status: "in_progress", activeForm: "Executing stage 2"},
    {content: "    • Group G4: Dependent fixes (2 findings)", status: "in_progress", activeForm: "Fixing G4"},
    {content: "Phase 4: Completion", status: "pending", activeForm: "Completing"}
  ]
});
```

**Update Rules**:
- Add batch items dynamically during Phase 1.5
- Mark batch items completed as parallel agents return results
- Add stage/group items dynamically after Phase 2 plan aggregation
- Mark completed immediately after each group finishes
- Update parent phase status when all child items complete

## Post-Completion Expansion

**Auto-sync**: 执行 `/workflow:session:sync -y "{summary}"` 更新 specs/*.md + project-tech。

完成后询问用户是否扩展为issue(test/enhance/refactor/doc)，选中项调用 `/issue:new "{summary} - {dimension}"`

## Best Practices

1. **Leverage Parallel Planning**: For 10+ findings, parallel batching significantly reduces planning time
2. **Tune Batch Size**: Use `--batch-size` to control granularity (smaller batches = more parallelism, larger = better grouping context)
3. **Conservative Approach**: Test verification is mandatory - no fixes kept without passing tests
4. **Parallel Efficiency**: MAX_PARALLEL=10 for planning agents, 3 concurrent execution agents per stage
5. **Resume Support**: Fix sessions can resume from checkpoints after interruption
6. **Manual Review**: Always review failed fixes manually - may require architectural changes
7. **Incremental Fixing**: Start with small batches (5-10 findings) before large-scale fixes

## Related Commands

### View Fix Progress
Use `ccw view` to open the workflow dashboard in browser:

```bash
ccw view
```