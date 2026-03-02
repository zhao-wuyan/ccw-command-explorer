# Phase 2: Test Cycle Execution (test-cycle-execute)

> **📌 COMPACT SENTINEL [Phase 5: Test-Cycle-Execute]**
> This phase contains 4 execution steps (Step 2.1 — 2.4).
> If you can read this sentinel but cannot find the full Step protocol below, context has been compressed.
> Recovery: `Read("phases/05-test-cycle-execute.md")`

Execute test-fix workflow with dynamic task generation and iterative fix cycles until test pass rate >= 95% or max iterations reached. Uses @cli-planning-agent for failure analysis and task generation.

## Objective

- Discover and load test session with generated tasks
- Execute initial task pipeline (IMPL-001 → 001.3 → 001.5 → 002)
- Run iterative fix loop with adaptive strategy engine
- Achieve pass rate >= 95% or exhaust max iterations
- Complete session with summary and post-expansion options

## Quick Start

```bash
# Execute test-fix workflow (auto-discovers active session)
/workflow-test-fix

# Resume interrupted session
/workflow-test-fix --resume-session="WFS-test-user-auth"

# Custom iteration limit (default: 10)
/workflow-test-fix --max-iterations=15
```

**Quality Gate**: Test pass rate >= 95% (criticality-aware) or 100%
**Max Iterations**: 10 (default, adjustable)
**CLI Tools**: Gemini → Qwen → Codex (fallback chain)

## Core Concept

Dynamic test-fix orchestrator with **adaptive task generation** based on runtime analysis.

**Orchestrator Boundary**: The orchestrator (this phase) is responsible ONLY for:
- Loop control and iteration tracking
- Strategy selection and threshold decisions
- Delegating analysis to @cli-planning-agent and execution to @test-fix-agent
- Reading results and making pass/fail decisions
- The orchestrator does NOT directly modify source code, run tests, or perform root cause analysis

**vs Standard Execute**:
- **Standard**: Pre-defined tasks → Execute sequentially → Done
- **Test-Cycle**: Initial tasks → **Test → Analyze failures → Generate fix tasks → Fix → Re-test** → Repeat until pass

## Execution

### Step 2.1: Discovery

Load session, tasks, and iteration state.

```
1. Discovery
   └─ Load session, tasks, iteration state
```

**For full-pipeline entry (from Phase 1-4)**: Use `testSessionId` passed from Phase 4.

**For direct entry (/workflow-test-fix)**:
- `--resume-session="WFS-xxx"` → Use specified session
- No args → Auto-discover active test session (find `.workflow/active/WFS-test-*`)

### Step 2.2: Execute Initial Tasks

Execute the generated task pipeline sequentially:

```
IMPL-001 (test-gen, @code-developer) →
IMPL-001.3 (code-validation, @test-fix-agent) →
IMPL-001.5 (test-quality-review, @test-fix-agent) →
IMPL-002 (test-fix, @test-fix-agent) →
Calculate pass_rate from test-results.json
```

**Agent Invocation - @test-fix-agent** (execution):
```javascript
Task(
  subagent_type="test-fix-agent",
  run_in_background=false,
  description=`Execute ${task.meta.type}: ${task.title}`,
  prompt=`
    ## Task Objective
    ${taskTypeObjective[task.meta.type]}

    ## MANDATORY FIRST STEPS
    1. Read task JSON: ${session.task_json_path}
    2. Read iteration state: ${session.iteration_state_path}
    3. ${taskTypeSpecificReads[task.meta.type]}

    ## CRITICAL: Syntax Check Priority
    **Before any code modification or test execution:**
    - Run project syntax checker (TypeScript: tsc --noEmit, ESLint, etc.)
    - Verify zero syntax errors before proceeding
    - If syntax errors found: Fix immediately before other work
    - Syntax validation is MANDATORY gate - no exceptions

    ## Session Paths
    - Workflow Dir: ${session.workflow_dir}
    - Task JSON: ${session.task_json_path}
    - Test Results Output: ${session.test_results_path}
    - Test Output Log: ${session.test_output_path}
    - Iteration State: ${session.iteration_state_path}

    ## Task Type: ${task.meta.type}
    ${taskTypeGuidance[task.meta.type]}

    ## Expected Deliverables
    ${taskTypeDeliverables[task.meta.type]}

    ## Success Criteria
    - ${taskTypeSuccessCriteria[task.meta.type]}
    - Update task status in task JSON
    - Save all outputs to specified paths
    - Report completion to orchestrator
  `
)

// Task Type Configurations
const taskTypeObjective = {
  "test-gen": "Generate comprehensive tests based on requirements",
  "test-fix": "Execute test suite and report results with criticality assessment",
  "test-fix-iteration": "Apply fixes from strategy and validate with tests"
};

const taskTypeSpecificReads = {
  "test-gen": "Read test context: ${session.test_context_path}",
  "test-fix": "Read previous results (if exists): ${session.test_results_path}",
  "test-fix-iteration": "Read fix strategy: ${session.analysis_path}, fix history: ${session.fix_history_path}"
};

const taskTypeGuidance = {
  "test-gen": `
    - Read task.context.requirements for test scenarios
    - Generate tests following existing patterns and framework conventions
  `,
  "test-fix": `
    - Execute multi-layer test suite (follow your Layer-Aware Diagnosis spec)
    - Save structured results to ${session.test_results_path}
    - Apply criticality assessment per your spec (high/medium/low)
  `,
  "test-fix-iteration": `
    - Load fix_strategy from task.context.fix_strategy
    - Identify modification_points: ${task.context.fix_strategy.modification_points}
    - Apply surgical fixes (minimal changes)
    - Test execution mode: ${task.context.fix_strategy.test_execution.mode}
      * affected_only: Run ${task.context.fix_strategy.test_execution.affected_tests}
      * full_suite: Run complete test suite
    - If failures persist: Document in test-results.json, DO NOT analyze (orchestrator handles)
  `
};

const taskTypeDeliverables = {
  "test-gen": "- Test files in target directories\n    - Test coverage report\n    - Summary in .summaries/",
  "test-fix": "- test-results.json (pass_rate, criticality, failures)\n    - test-output.log (full test output)\n    - Summary in .summaries/",
  "test-fix-iteration": "- Modified source files\n    - test-results.json (updated pass_rate)\n    - test-output.log\n    - Summary in .summaries/"
};

const taskTypeSuccessCriteria = {
  "test-gen": "All test files created, executable without errors, coverage documented",
  "test-fix": "Test results saved with accurate pass_rate and criticality, all failures documented",
  "test-fix-iteration": "Fixes applied per strategy, tests executed, results reported (pass/fail to orchestrator)"
};
```

**Decision after IMPL-002 execution**:
```
pass_rate = Read(test-results.json).pass_rate
├─ 100% → SUCCESS: Proceed to Step 2.4 (Completion)
├─ 95-99% + all failures low criticality → PARTIAL SUCCESS: Proceed to Step 2.4
└─ <95% or critical failures → Enter Step 2.3 (Fix Loop)
```

### Step 2.3: Iterative Fix Loop

**Conditional**: Only enters when pass_rate < 95% or critical failures exist.

#### Intelligent Strategy Engine

**Auto-selects optimal strategy based on iteration context:**

| Strategy | Trigger | Behavior |
|----------|---------|----------|
| **Conservative** | Iteration 1-2 (default) | Single targeted fix, full validation |
| **Aggressive** | Pass rate >80% + similar failures | Batch fix related issues |
| **Surgical** | Regression detected (pass rate drops >10%) | Minimal changes, rollback focus |

**Selection Logic** (in orchestrator):
```javascript
if (iteration <= 2) return "conservative";
if (passRate > 80 && failurePattern.similarity > 0.7) return "aggressive";
if (regressionDetected) return "surgical";
return "conservative";
```

**Integration**: Strategy passed to @cli-planning-agent in prompt for tailored analysis.

#### Progressive Testing

**Runs affected tests during iterations, full suite only for final validation.**

**How It Works**:
1. @cli-planning-agent analyzes fix_strategy.modification_points
2. Maps modified files to test files (via imports + integration patterns)
3. Returns `affected_tests[]` in task JSON
4. @test-fix-agent runs: `npm test -- ${affected_tests.join(' ')}`
5. Final validation: `npm test` (full suite)

**Benefits**: 70-90% iteration speed improvement, instant feedback on fix effectiveness.

#### Orchestrator Runtime Calculations

**From iteration-state.json**:
- Current iteration: `iterations.length + 1`
- Stuck tests: Tests appearing in `failed_tests` for 3+ consecutive iterations
- Regression: Compare consecutive `pass_rate` values (>10% drop)
- Max iterations: Read from `task.meta.max_iterations`

#### Fix Loop Flow

```
for each iteration (N = 1 to maxIterations):
  1. Detect: stuck tests, regression, progress trend
  2. Select strategy: conservative/aggressive/surgical
  3. Generate fix task via @cli-planning-agent
  4. Execute fix via @test-fix-agent
  5. Re-test → Calculate pass_rate
  6. Decision:
     ├─ pass_rate >= 95% → EXIT loop → Step 2.4
     ├─ regression detected → Rollback, switch to surgical
     └─ continue → Next iteration
```

#### Agent Invocation - @cli-planning-agent (failure analysis)

```javascript
Task(
  subagent_type="cli-planning-agent",
  run_in_background=false,
  description=`Analyze test failures (iteration ${N}) - ${strategy} strategy`,
  prompt=`
    ## Task Objective
    Analyze test failures and generate fix task JSON for iteration ${N}

    ## Strategy
    ${selectedStrategy} - ${strategyDescription}

    ## PROJECT CONTEXT (MANDATORY)
    1. Run: \`ccw spec load --category execution\` (tech stack, test framework, build system, constraints)

    ## MANDATORY FIRST STEPS
    1. Read test results: ${session.test_results_path}
    2. Read test output: ${session.test_output_path}
    3. Read iteration state: ${session.iteration_state_path}

    ## Context Metadata (Orchestrator-Calculated)
    - Session ID: ${sessionId} (from file path)
    - Current Iteration: ${N} (= iterations.length + 1)
    - Max Iterations: ${maxIterations} (from task.meta.max_iterations)
    - Current Pass Rate: ${passRate}%
    - Selected Strategy: ${selectedStrategy} (from iteration-state.json)
    - Stuck Tests: ${stuckTests} (calculated from iterations[].failed_tests history)

    ## CLI Configuration
    - Tool Priority: gemini & codex
    - Template: 01-diagnose-bug-root-cause.txt
    - Timeout: 2400000ms

    ## Expected Deliverables
    1. Task JSON: ${session.task_dir}/IMPL-fix-${N}.json
       - Must include: fix_strategy.test_execution.affected_tests[]
       - Must include: fix_strategy.confidence_score
    2. Analysis report: ${session.process_dir}/iteration-${N}-analysis.md
    3. CLI output: ${session.process_dir}/iteration-${N}-cli-output.txt

    ## Strategy-Specific Requirements
    - Conservative: Single targeted fix, high confidence required
    - Aggressive: Batch fix similar failures, pattern-based approach
    - Surgical: Minimal changes, focus on rollback safety

    ## Success Criteria
    - Concrete fix strategy with modification points (file:function:lines)
    - Affected tests list for progressive testing
    - Root cause analysis (not just symptoms)
  `
)
```

#### CLI Tool Configuration

**Fallback Chain**: Gemini → Qwen → Codex
**Template**: `~/.ccw/workflows/cli-templates/prompts/analysis/01-diagnose-bug-root-cause.txt`
**Timeout**: 40min (2400000ms)

**Tool Details**:
1. **Gemini** (primary): `gemini-2.5-pro`
2. **Qwen** (fallback): `coder-model`
3. **Codex** (fallback): `gpt-5.1-codex`

**When to Fallback**: HTTP 429, timeout, analysis quality degraded

**CLI Fallback Triggers** (Gemini → Qwen → Codex → manual):

Fallback is triggered when any of these conditions occur:

1. **Invalid Output**:
   - CLI tool fails to generate valid `IMPL-fix-N.json` (JSON parse error)
   - Missing required fields: `fix_strategy.modification_points` or `fix_strategy.affected_tests`

2. **Low Confidence**:
   - `fix_strategy.confidence_score < 0.4` (indicates uncertain analysis)

3. **Technical Failures**:
   - HTTP 429 (rate limit) or 5xx errors
   - Timeout (exceeds 2400000ms / 40min)
   - Connection errors

4. **Quality Degradation**:
   - Analysis report < 100 words (too brief, likely incomplete)
   - No concrete modification points provided (only general suggestions)
   - Same root cause identified 3+ consecutive times (stuck analysis)

**Fallback Sequence**:
- Try primary tool (Gemini)
- If trigger detected → Try fallback (Qwen)
- If trigger detected again → Try final fallback (Codex)
- If all fail → Mark as degraded, use basic pattern matching from fix-history.json, notify user

#### Iteration State JSON

**Purpose**: Persisted state machine for iteration loop - enables Resume and historical analysis.

```json
{
  "current_task": "IMPL-002",
  "selected_strategy": "aggressive",
  "next_action": "execute_fix_task",
  "iterations": [
    {
      "iteration": 1,
      "pass_rate": 70,
      "strategy": "conservative",
      "failed_tests": ["test_auth_flow", "test_user_permissions"]
    },
    {
      "iteration": 2,
      "pass_rate": 82,
      "strategy": "conservative",
      "failed_tests": ["test_user_permissions", "test_token_expiry"]
    },
    {
      "iteration": 3,
      "pass_rate": 89,
      "strategy": "aggressive",
      "failed_tests": ["test_auth_edge_case"]
    }
  ]
}
```

**Field Descriptions**:
- `current_task`: Pointer to active task (essential for Resume)
- `selected_strategy`: Current iteration strategy (runtime state)
- `next_action`: State machine next step (`execute_fix_task` | `retest` | `complete`)
- `iterations[]`: Historical log of all iterations (source of truth for trends)

#### TodoWrite Update (Fix Loop)

```javascript
TodoWrite({
  todos: [
    {
      content: "Execute IMPL-001: Generate tests [code-developer]",
      status: "completed",
      activeForm: "Executing test generation"
    },
    {
      content: "Execute IMPL-002: Test & Fix Cycle [ITERATION]",
      status: "in_progress",
      activeForm: "Running test-fix iteration cycle"
    },
    {
      content: "  → Iteration 1: Initial test (pass: 70%, conservative)",
      status: "completed",
      activeForm: "Running initial tests"
    },
    {
      content: "  → Iteration 2: Fix validation (pass: 82%, conservative)",
      status: "completed",
      activeForm: "Fixing validation issues"
    },
    {
      content: "  → Iteration 3: Batch fix auth (pass: 89%, aggressive)",
      status: "in_progress",
      activeForm: "Fixing authentication issues"
    }
  ]
});
```

**Update Rules**:
- Add iteration item with: strategy, pass rate
- Mark completed after each iteration
- Update parent task when all complete

### Step 2.4: Completion

#### Completion Conditions

**Full Success**:
- All tasks completed
- Pass rate === 100%
- Action: Auto-complete session

**Partial Success**:
- All tasks completed
- Pass rate >= 95% and < 100%
- All failures are "low" criticality
- Action: Auto-approve with review note

**Failure**:
- Max iterations (10) reached without 95% pass rate
- Pass rate < 95% after max iterations
- Action: Generate failure report, mark blocked, return to user

#### Commit Strategy

**Automatic Commits** (orchestrator-managed):

The orchestrator automatically creates git commits at key checkpoints to enable safe rollback:

1. **After Successful Iteration** (pass rate increased):
   ```bash
   git add .
   git commit -m "test-cycle: iteration ${N} - ${strategy} strategy (pass: ${oldRate}% → ${newRate}%)"
   ```

2. **Before Rollback** (regression detected):
   ```bash
   # Current state preserved, then:
   git revert HEAD
   git commit -m "test-cycle: rollback iteration ${N} - regression detected (pass: ${newRate}% < ${oldRate}%)"
   ```

**Commit Content**:
- Modified source files from fix application
- Updated test-results.json, iteration-state.json
- Excludes: temporary files, logs

**Benefits**:
- Each successful iteration is a safe rollback point
- Regression detection can instantly revert to last known-good state
- Full iteration history visible in git log for post-mortem analysis
- No manual intervention needed for rollback — orchestrator handles automatically

#### Post-Completion Expansion

**Auto-sync**: 执行 `/workflow:session:sync -y "{summary}"` 更新 specs/*.md + project-tech。

完成后询问用户是否扩展为issue(test/enhance/refactor/doc)，选中项调用 `/issue:new "{summary} - {dimension}"`

## Agent Roles Summary

| Agent | Responsibility |
|-------|---------------|
| **Orchestrator** | Loop control, strategy selection, pass rate calculation, threshold decisions |
| **@cli-planning-agent** | CLI analysis (Gemini/Qwen/Codex), root cause extraction, task generation, affected test detection |
| **@test-fix-agent** | Test execution, code fixes, criticality assignment, result reporting |

**Core Responsibilities (Detailed)**:

- **Orchestrator** (this skill):
  - Loop control: iteration count, max iterations enforcement, exit conditions
  - Strategy selection based on iteration context (conservative → aggressive → surgical)
  - Pass rate calculation from test-results.json after each iteration
  - Threshold decisions: 95% gate, criticality-aware partial success
  - Commit management: auto-commit on improvement, rollback on regression
  - Regression detection: compare consecutive pass_rate values (>10% drop triggers surgical)
  - Stuck test tracking: tests failing 3+ consecutive iterations flagged for alternative strategy

- **@cli-planning-agent** (failure analysis):
  - Execute CLI tools (Gemini/Qwen/Codex) with fallback chain for root cause analysis
  - Extract concrete modification points (file:function:lines) from analysis
  - Generate fix task JSON (IMPL-fix-N.json) with fix_strategy and confidence_score
  - Detect affected tests for progressive testing (map modified files → test files)
  - Apply strategy-specific analysis (conservative: single fix, aggressive: batch, surgical: minimal)

- **@test-fix-agent** (execution):
  - Execute test suite and capture pass/fail counts, error messages, stack traces
  - Apply code fixes per fix_strategy.modification_points (surgical, minimal changes)
  - Assess criticality for each failure (high/medium/low based on impact)
  - Report structured results to test-results.json with pass_rate and failure details
  - Validate syntax before any code modification (TypeScript: tsc --noEmit, ESLint)

## Error Handling

| Scenario | Action |
|----------|--------|
| Test execution error | Log, retry with error context |
| CLI analysis failure | Fallback: Gemini → Qwen → Codex → manual |
| Agent execution error | Save state, retry with simplified context |
| Max iterations reached | Generate failure report, mark blocked |
| Regression detected | Rollback last fix, switch to surgical strategy |
| Stuck tests detected | Continue with alternative strategy, document in failure report |

## Session File Structure

```
.workflow/active/WFS-test-{session}/
├── workflow-session.json           # Session metadata
├── IMPL_PLAN.md, TODO_LIST.md
├── .task/
│   ├── IMPL-{001,002}.json         # Initial tasks
│   └── IMPL-fix-{N}.json           # Generated fix tasks
├── .process/
│   ├── iteration-state.json        # Current iteration + strategy + stuck tests
│   ├── test-results.json           # Latest results (pass_rate, criticality)
│   ├── test-output.log             # Full test output
│   ├── fix-history.json            # All fix attempts
│   ├── iteration-{N}-analysis.md   # CLI analysis report
│   └── iteration-{N}-cli-output.txt
└── .summaries/iteration-summaries/
```

## Output

- **Variable**: `finalPassRate` (percentage)
- **File**: `test-results.json` (final results)
- **File**: `iteration-state.json` (full iteration history)
- **TodoWrite**: Mark Phase 5 completed

## Next Phase

Return to orchestrator. Workflow complete. Offer post-completion expansion options.
