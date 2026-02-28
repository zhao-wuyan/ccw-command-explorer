---
name: integration-test-cycle
description: Self-iterating integration test workflow with codebase exploration, test development, autonomous test-fix cycles, and reflection-driven strategy adjustment
argument-hint: "[-y|--yes] [-c|--continue] [--max-iterations=N] \"module or feature description\""
allowed-tools: TodoWrite(*), Task(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*), Skill(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-confirm exploration decisions, use recommended test strategies, skip interactive checkpoints.

# Workflow Integration-Test-Cycle Command

## Quick Start

```bash
# Basic - explore and test a module
/workflow:integration-test-cycle "用户认证模块的集成测试"

# Auto mode - fully autonomous
/workflow:integration-test-cycle -y "支付流程端到端集成测试"

# Continue interrupted session
/workflow:integration-test-cycle --continue "认证模块"

# Custom iteration limit
/workflow:integration-test-cycle --max-iterations=15 "API网关集成测试"
```

**Context Source**: cli-explore-agent + Gemini/Codex analysis
**Output Directory**: `.workflow/.integration-test/{session-id}/`
**Core Innovation**: Reflection-driven self-iterating test cycle with documented learning evolution

## What & Why

### Core Concept

Unified integration test workflow: **Explore → Design → Develop → Test → Reflect → Adjust → Re-test** — a closed-loop that autonomously improves test quality through text-based reflection.

**vs Existing Commands**:
- **test-fix-gen**: Only generates test tasks, requires manual `workflow-test-fix` skill
- **test-cycle-execute**: Only executes pre-existing tasks, no exploration or test design
- **This command**: Full lifecycle — from zero knowledge to passing integration tests, with self-reflection

### Value Proposition
1. **Zero-to-Tests**: No prior session needed — starts from exploration
2. **Self-Improving**: Reflection log drives strategy adjustment between iterations
3. **Integration Focus**: Specifically targets cross-module boundaries and API contracts
4. **Documented Learning**: Every decision, failure, and adjustment recorded in reflection-log.md

## Output Artifacts

**2 核心文件 + 1 追踪目录**，全流程产物最小化：

| Artifact | Type | Description |
|----------|------|-------------|
| `reflection-log.md` | 人类可读 | ⭐ 唯一文本文档：探索发现、设计决策、迭代反思、累积认知、最终结论 |
| `state.json` | 机器可读 | 唯一状态文件：探索上下文、测试设计、测试清单、迭代状态、测试结果、修复历史、最终摘要 |
| `.trace/` | 原始日志 | CLI 输出和测试日志，仅调试用：`cli-{N}.txt`、`test-output.log` |

```
.workflow/.integration-test/ITG-{slug}-{date}/
├── reflection-log.md    # ⭐ 唯一人类可读文档 (exploration + design + iterations + conclusions)
├── state.json           # 唯一机器状态 (exploration + design + inventory + iterations + results + summary)
└── .trace/              # 原始日志 (仅调试参考)
    ├── cli-1.txt
    ├── cli-2.txt
    └── test-output.log
```

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│              SELF-ITERATING INTEGRATION TEST WORKFLOW                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Phase 1: Session Initialization                                         │
│     ├─ Parse input (module description)                                  │
│     ├─ Create session directory                                          │
│     └─ Initialize reflection-log.md + state.json                         │
│                                                                          │
│  Phase 2: Codebase Exploration                                           │
│     ├─ cli-explore-agent: Module structure & dependencies                │
│     ├─ Identify integration points & boundaries                         │
│     ├─ Map cross-module data flows                                       │
│     ├─ Write state.json.exploration                                      │
│     └─ Append exploration findings to reflection-log.md                  │
│                                                                          │
│  Phase 3: Integration Test Design                                        │
│     ├─ CLI analysis: Design test strategy                                │
│     ├─ Define integration scenarios                                      │
│     ├─ [Interactive] User confirms/adjusts strategy                     │
│     ├─ Write state.json.test_design                                      │
│     └─ Append design decisions to reflection-log.md                      │
│                                                                          │
│  Phase 4: Test Development                                               │
│     ├─ @code-developer: Generate integration tests                      │
│     ├─ Code validation (imports, types, mocks)                          │
│     ├─ Write state.json.test_inventory                                   │
│     └─ Append development notes to reflection-log.md                     │
│                                                                          │
│  Phase 5: Self-Iterating Test Cycle ◄─── CORE LOOP ──┐                 │
│     ├─ Execute tests                                   │                 │
│     ├─ Calculate pass rate                             │                 │
│     ├─ Decision:                                       │                 │
│     │  ├─ >= 95% → Phase 6 (Complete)                  │                 │
│     │  └─ < 95% → Reflect & Adjust ──────────────────→ │                 │
│     │     ├─ Inline reflection to reflection-log.md    │                 │
│     │     ├─ Update state.json.iterations              │                 │
│     │     ├─ Select strategy based on cumulative learnings               │
│     │     ├─ @cli-planning-agent: Analyze failures     │                 │
│     │     ├─ @test-fix-agent: Apply fixes              │                 │
│     │     └─ Loop                                      │                 │
│     └─ Max iterations check (default: 10)                                │
│                                                                          │
│  Phase 6: Completion                                                     │
│     ├─ Write state.json.summary                                          │
│     ├─ Finalize reflection-log.md with conclusions                       │
│     └─ Offer next steps                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Implementation

### Session Initialization

**Objective**: Create session context and initialize 2 core files.

**Required Actions**:
1. Extract module/feature description from `$ARGUMENTS`
2. Generate session ID: `ITG-{slug}-{date}`
   - slug: lowercase, alphanumeric + Chinese, max 40 chars
   - date: YYYY-MM-DD (UTC+8)
3. Define session folder: `.workflow/.integration-test/{session-id}`
4. Parse command options:
   - `-c` or `--continue` for session continuation
   - `-y` or `--yes` for auto-approval mode
   - `--max-iterations=N` (default: 10)
5. Auto-detect mode: If session folder + reflection-log.md exist → continue mode
6. Create directory structure: `{sessionFolder}/`, `{sessionFolder}/.trace/`

**Initialize reflection-log.md**:

```markdown
# Integration Test Reflection Log

## Session: {sessionId}
- **Topic**: {module_or_feature_description}
- **Started**: {timestamp}
- **Mode**: {new|continue}
- **Max Iterations**: {maxIterations}

---

## Phase 2: Exploration
> Pending...

## Phase 3: Test Design
> Pending...

## Phase 4: Test Development
> Pending...

## Iteration Timeline
> Iterations will be appended here...

## Cumulative Learnings
> Updated after each iteration...

## Conclusions
> Final synthesis after completion...
```

**Initialize state.json**:

```json
{
  "session_id": "{sessionId}",
  "module": "{module_description}",
  "started": "{timestamp}",
  "max_iterations": 10,
  "phase": "init",
  "exploration": null,
  "test_design": null,
  "test_inventory": null,
  "iterations": {
    "current": 0,
    "strategy": null,
    "next_action": "explore",
    "history": [],
    "stuck_tests": [],
    "latest_results": null
  },
  "fix_history": [],
  "summary": null
}
```

---

### Phase 2: Codebase Exploration

**Objective**: Deep-dive into the target module, identify integration points, dependencies, and data flows.

**Workflow Steps**:

1. **Codebase Exploration via cli-explore-agent**

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: `Explore integration points: ${topicSlug}`,
  prompt: `
## Analysis Context
Topic: ${module_description}
Session: ${sessionFolder}

## MANDATORY FIRST STEPS
1. Run: ccw tool exec get_modules_by_depth '{}'
2. Execute relevant searches: module boundaries, exported APIs, shared types
3. Read: .workflow/project-tech.json (if exists)

## Exploration Focus
- **Module Boundaries**: Entry points, public APIs, exported interfaces
- **Dependencies**: What this module depends on, what depends on it
- **Integration Points**: Cross-module calls, shared state, event flows
- **Data Contracts**: Types, schemas, validation at boundaries
- **Existing Tests**: Current test patterns, test utilities, mocking conventions
- **Configuration**: Environment dependencies, feature flags, external services

## Output
Update state.json field "exploration" with:
{
  "module_structure": { "entry_points": [], "public_apis": [], "internal_modules": [] },
  "dependencies": { "upstream": [], "downstream": [], "external_services": [] },
  "integration_points": [{ "from": "", "to": "", "type": "api|event|shared_state", "contract": "" }],
  "data_flows": [{ "name": "", "path": [], "transforms": [] }],
  "existing_tests": { "test_files": [], "patterns": [], "utilities": [], "mocking_conventions": "" },
  "test_framework": { "runner": "", "assertion_lib": "", "mock_lib": "" },
  "risk_areas": [{ "area": "", "reason": "", "priority": "high|medium|low" }],
  "_metadata": { "files_analyzed": 0, "timestamp": "" }
}

Also set state.json "phase" to "explored".
`
})
```

2. **Append to reflection-log.md** (replace `## Phase 2: Exploration` placeholder):

```markdown
## Phase 2: Exploration - {timestamp}

### What We Found
- **Module Boundaries**: {summary of entry points and APIs}
- **Integration Points**: {N} cross-module connections identified
- **Data Flows**: {key data flow paths}
- **Existing Test Patterns**: {test framework, conventions}

### Initial Assumptions
- {assumption_1}: {basis}
- {assumption_2}: {basis}

### Risk Areas
- {risk_1}: {why risky for integration testing}

### Decision Log
> **Decision**: Focus integration testing on {specific boundaries}
> - **Context**: Exploration revealed {N} integration points
> - **Chosen**: {approach} — **Reason**: {rationale}
```

---

### Phase 3: Integration Test Design

**Objective**: Design integration test strategy based on exploration findings.

**Workflow Steps**:

1. **CLI Analysis for Test Strategy Design**

```javascript
Bash({
  command: `ccw cli -p "
PURPOSE: Design integration test strategy for '${module_description}' based on exploration findings
Success: Comprehensive test design covering all critical integration points

EXPLORATION CONTEXT:
${JSON.stringify(state.exploration, null, 2)}

TASK:
• Analyze integration points and prioritize by risk
• Design test scenarios for each critical integration boundary
• Define mocking strategy: what to mock vs what to test end-to-end
• Specify test data setup and teardown patterns
• Define success criteria per scenario

MODE: analysis
CONTEXT: @**/* | Module: ${module_description}
EXPECTED: Structured test design with: integration scenarios (grouped by boundary), mocking strategy, test data patterns, execution order, success criteria per scenario
CONSTRAINTS: Focus on integration boundaries | Follow existing test patterns | Avoid duplicating unit tests
" --tool gemini --mode analysis --rule analysis-analyze-code-patterns`,
  run_in_background: true
})
```

2. **Interactive Strategy Confirmation** (skip in auto mode)

```javascript
AskUserQuestion({
  questions: [{
    question: "集成测试策略如何调整？",
    header: "Test Strategy",
    options: [
      { label: "确认策略，开始开发", description: "当前测试设计方案合理，直接开始生成测试" },
      { label: "调整测试范围", description: "需要扩大或缩小集成测试覆盖范围" },
      { label: "修改Mock策略", description: "对哪些模块需要Mock有不同意见" },
      { label: "补充测试场景", description: "有额外的集成测试场景需要覆盖" }
    ],
    multiSelect: false
  }]
})
```

3. **Update state.json** — write `test_design` field:

```json
{
  "test_design": {
    "integration_scenarios": [
      {
        "id": "IS-001",
        "name": "scenario name",
        "boundary": "moduleA → moduleB",
        "type": "api_contract|event_flow|shared_state|data_pipeline",
        "priority": "critical|high|medium",
        "test_cases": [
          { "name": "happy path", "input": "", "expected": "", "assertion_type": "" },
          { "name": "error propagation", "input": "", "expected": "" },
          { "name": "boundary condition", "input": "", "expected": "" }
        ],
        "mocking": { "mock_targets": [], "real_targets": [], "reason": "" },
        "setup": "description",
        "teardown": "description"
      }
    ],
    "mocking_strategy": {
      "approach": "minimal|moderate|heavy",
      "mock_boundaries": [],
      "real_boundaries": [],
      "rationale": ""
    },
    "execution_order": ["IS-001", "IS-002"],
    "success_criteria": { "pass_rate": 95, "coverage_target": 80 }
  }
}
```

Also set `state.json.phase` to `"designed"`.

4. **Append to reflection-log.md** (replace `## Phase 3: Test Design` placeholder):

```markdown
## Phase 3: Test Design - {timestamp}

### Strategy Summary
- **Total Scenarios**: {N} integration scenarios
- **Priority Distribution**: {N} critical, {N} high, {N} medium
- **Mocking Approach**: {minimal|moderate|heavy}

### Design Decisions
> **Decision**: {mocking strategy choice}
> - **Chosen**: {approach} — **Reason**: {rationale}

### User Feedback
- {user_adjustment_if_any}
```

---

### Phase 4: Test Development

**Objective**: Generate integration test code based on the test design.

**Workflow Steps**:

1. **Generate Integration Tests via @code-developer**

```javascript
Task({
  subagent_type: "code-developer",
  run_in_background: false,
  description: `Generate integration tests: ${topicSlug}`,
  prompt: `
## Task Objective
Generate integration tests based on test design specification.

## MANDATORY FIRST STEPS
1. Read state.json: ${sessionFolder}/state.json — use "exploration" and "test_design" fields
2. Identify existing test patterns in the codebase
3. Read relevant source files for each integration boundary

## Test Development Requirements
- Follow existing test framework and conventions (from state.json.exploration.test_framework)
- One test file per integration boundary (or logical grouping)
- Include: test data setup, scenario execution, assertions, cleanup
- Use mocking strategy from state.json.test_design.mocking_strategy
- Cover all test cases defined in integration_scenarios
- Add descriptive test names: "should {behavior} when {condition}"

## Code Quality
- No hallucinated imports - verify every import exists
- No placeholder/TODO code - all tests must be executable
- Proper async/await handling
- Proper error assertion (expect specific error types/messages)

## Output
1. Write test files to appropriate directories following project conventions
2. Update state.json field "test_inventory" with:
{
  "test_files": [{ "path": "", "scenario_ids": [], "test_count": 0, "boundary": "" }],
  "total_tests": 0,
  "total_files": 0,
  "timestamp": ""
}
Also set state.json "phase" to "developed".
`
})
```

2. **Code Validation Gate via @test-fix-agent**

```javascript
Task({
  subagent_type: "test-fix-agent",
  run_in_background: false,
  description: `Validate generated tests: ${topicSlug}`,
  prompt: `
## Task Objective
Validate generated integration test code for common AI-generated issues.

## MANDATORY FIRST STEPS
1. Read state.json: ${sessionFolder}/state.json — use "test_inventory" field for file list
2. Read each test file listed in test_inventory.test_files

## Validation Checklist
- [ ] All imports resolve to existing modules
- [ ] No placeholder or TODO code blocks
- [ ] Mock setup matches actual module interfaces
- [ ] Async operations properly awaited
- [ ] Test assertions are specific (not just "toBeTruthy")
- [ ] Cleanup/teardown properly implemented
- [ ] TypeScript types correct (run tsc --noEmit if applicable)

## On Validation Failure
- Fix issues directly in test files
- Log fixes to: ${sessionFolder}/.trace/validation-fixes.log
`
})
```

3. **Append to reflection-log.md** (replace `## Phase 4: Test Development` placeholder):

```markdown
## Phase 4: Test Development - {timestamp}

### Generated Tests
- **Files**: {N} test files
- **Total Tests**: {N} test cases
- **Scenarios Covered**: {list}

### Validation Results
- Issues Found: {N}, Fixed: {N}

### Development Notes
- {notable patterns used}
```

---

### Phase 5: Self-Iterating Test Cycle

**Objective**: Execute tests, analyze failures, reflect, adjust strategy, fix, and re-test until pass rate >= 95% or max iterations.

**Quality Gate**: Pass rate >= 95% (criticality-aware) or 100%
**Max Iterations**: From session config (default: 10)

#### Iteration Loop

```
for iteration = 1 to maxIterations:
  1. Execute Tests → update state.json.iterations.latest_results
  2. Evaluate: 100% → SUCCESS | >= 95% low-crit → PARTIAL | < 95% → step 3
  3. Reflect → append inline to reflection-log.md
  4. Select Strategy (reflection-informed)
  5. Analyze & Fix → save CLI output to .trace/cli-{N}.txt
  6. Loop back to step 1
```

#### Strategy Engine (Reflection-Enhanced)

| Strategy | Trigger | Behavior |
|----------|---------|----------|
| **Conservative** | Iteration 1-2 (default) | Single targeted fix, full validation |
| **Aggressive** | Pass rate >80% + similar failures | Batch fix related issues |
| **Surgical** | Regression detected (pass rate drops >10%) | Minimal changes, rollback focus |
| **Reflective** | Same tests stuck 3+ iterations | Re-examine assumptions, redesign test |

```javascript
function selectStrategy(iteration, passRate, stuckTests) {
  if (regressionDetected) return "surgical";
  if (stuckTests.length > 0 && stuckTestIterations >= 3) return "reflective";
  if (iteration <= 2) return "conservative";
  if (passRate > 80 && failurePattern.similarity > 0.7) return "aggressive";
  return "conservative";
}
```

#### Inline Reflection Format (appended to reflection-log.md `## Iteration Timeline`)

Each iteration appends one section directly into reflection-log.md (no separate files):

```markdown
### Iteration {N} - {timestamp}

**Results**: {pass_rate}% ({passed}/{total}) | Strategy: {strategy}
**Failed**: {test_list}

**Why It Failed**: {root cause analysis}
**Assumed vs Reality**: {gap description}
**Learned**: {key takeaway}
**Next Action**: {strategy adjustment or specific fix plan}
```

#### state.json Iteration Update

After each iteration, update `state.json.iterations`:

```json
{
  "iterations": {
    "current": 3,
    "strategy": "aggressive",
    "next_action": "execute_fix",
    "history": [
      {
        "iteration": 1,
        "pass_rate": 70,
        "strategy": "conservative",
        "failed_tests": ["test_auth_integration", "test_payment_flow"],
        "reflection_summary": "Auth token not propagated to payment service",
        "strategy_adjustment": "none"
      },
      {
        "iteration": 2,
        "pass_rate": 82,
        "strategy": "conservative",
        "failed_tests": ["test_payment_flow"],
        "reflection_summary": "Payment timeout too short for integration",
        "strategy_adjustment": "aggressive - similar timeout failures"
      }
    ],
    "stuck_tests": [],
    "latest_results": {
      "pass_rate": 82,
      "passed": 9,
      "failed": 2,
      "total": 11,
      "failures": [
        { "test": "", "file": "", "error": "", "criticality": "high|medium|low" }
      ]
    }
  }
}
```

#### Cumulative Learnings Update

After each iteration, update the `## Cumulative Learnings` section in reflection-log.md (replace, not append):

```markdown
## Cumulative Learnings (Updated: Iteration {N})

### Confirmed Understanding
- {verified facts}

### Corrected Assumptions
- ~~{old}~~ → {new} (Iteration {N})

### Effective Strategies
- {what worked}: {context}

### Ineffective Strategies
- {what didn't work}: {why}

### Recurring Patterns
- {pattern}: root cause {cause}
```

#### Agent Invocations

**@test-fix-agent** (test execution):
```javascript
Task({
  subagent_type: "test-fix-agent",
  run_in_background: false,
  description: `Execute integration tests: iteration ${N}`,
  prompt: `
## Task Objective
Execute integration test suite and report results with criticality assessment.

## MANDATORY FIRST STEPS
1. Read state.json: ${sessionFolder}/state.json — use "test_inventory" for test files
${isFixIteration ? `2. Read fix strategy from state.json.fix_history (latest entry)` : ''}

## Test Execution
${progressiveMode
  ? `- Run affected tests only: ${affectedTests.join(' ')}`
  : '- Run full integration test suite'}

## Criticality Assessment
For each failure, assign:
- **high**: Core integration broken, data corruption risk
- **medium**: Feature degradation, partial failure
- **low**: Edge case, flaky, environment-specific

## Output
- Update state.json field "iterations.latest_results" with test results
- Overwrite ${sessionFolder}/.trace/test-output.log with full output
`
})
```

**@cli-planning-agent** (failure analysis with reflection):
```javascript
Task({
  subagent_type: "cli-planning-agent",
  run_in_background: false,
  description: `Analyze failures: iteration ${N} - ${strategy}`,
  prompt: `
## Task Objective
Analyze test failures using reflection context and generate fix strategy.

## MANDATORY FIRST STEPS
1. Read state.json: ${sessionFolder}/state.json — use "iterations" for history
2. Read test output: ${sessionFolder}/.trace/test-output.log
3. Read reflection-log.md: ${sessionFolder}/reflection-log.md — "Cumulative Learnings" section

## Reflection Context (CRITICAL)
- **Iteration History**: ${state.iterations.history}
- **Stuck Tests**: ${state.iterations.stuck_tests}
- **What hasn't worked**: Read from "Ineffective Strategies" in reflection-log.md

## Strategy: ${selectedStrategy}
- Conservative: Single targeted fix, verify no regression
- Aggressive: Batch fix similar failures
- Surgical: Minimal changes, rollback-safe
- Reflective: Challenge assumptions, propose alternative test approach

## Expected Deliverables
1. Append fix entry to state.json "fix_history" array:
   { "iteration": ${N}, "strategy": "", "modification_points": [], "affected_tests": [], "confidence": 0.0 }
2. Save CLI output to: ${sessionFolder}/.trace/cli-${N}.txt

## Success Criteria
- Root cause identified (not symptoms)
- Fix strategy with specific modification points
- Affected tests listed for progressive testing
`
})
```

**@test-fix-agent** (apply fixes):
```javascript
Task({
  subagent_type: "test-fix-agent",
  run_in_background: false,
  description: `Apply fixes: iteration ${N} - ${strategy}`,
  prompt: `
## Task Objective
Apply fixes from analysis and validate with targeted tests.

## MANDATORY FIRST STEPS
1. Read state.json: ${sessionFolder}/state.json — use latest "fix_history" entry
2. Run project syntax checker before any code modification

## Fix Application
- Apply modifications from fix_history[latest].modification_points
- Test execution: ${progressiveMode ? 'affected tests only' : 'full suite'}
${progressiveMode ? `- Affected tests: ${affectedTests.join(' ')}` : ''}

## Output
- Update state.json "iterations.latest_results" with new test results
- Overwrite ${sessionFolder}/.trace/test-output.log
`
})
```

#### Commit Strategy

1. **After Test Development** (Phase 4):
   ```bash
   git add <test_files>
   git commit -m "test(integration): generate integration tests for ${module}"
   ```

2. **After Successful Iteration** (pass rate increased):
   ```bash
   git add .
   git commit -m "test(integration): iteration ${N} - ${strategy} (pass: ${oldRate}% → ${newRate}%)"
   ```

3. **Before Rollback** (regression detected):
   ```bash
   git revert HEAD
   git commit -m "test(integration): rollback iteration ${N} - regression detected"
   ```

---

### Phase 6: Completion

**Objective**: Finalize reflection log, update state summary, offer next steps.

**Workflow Steps**:

1. **Update state.json** — write `summary` field:

```json
{
  "summary": {
    "result": "success|partial_success|failure",
    "final_pass_rate": 0,
    "total_iterations": 0,
    "strategies_used": [],
    "test_metrics": {
      "total_tests": 0,
      "passed": 0,
      "failed": 0,
      "test_files": 0,
      "integration_points_covered": 0
    },
    "key_learnings": [],
    "corrected_assumptions": [],
    "recommendations": [],
    "completed": "{timestamp}"
  }
}
```

Also set `state.json.phase` to `"completed"`.

2. **Finalize reflection-log.md** — replace `## Conclusions` placeholder:

```markdown
## Conclusions - {timestamp}

### Result: {SUCCESS|PARTIAL SUCCESS|NEEDS ATTENTION}

### Metrics
- **Final Pass Rate**: {X}%
- **Total Iterations**: {N}
- **Strategies Used**: {list}
- **Tests**: {passed}/{total} across {N} files

### What We Established
- {verified integration behavior}

### What Was Corrected
- ~~{old assumption}~~ → {corrected understanding}

### Key Insights
- {insight with impact on future testing}

### Decision Trail
| Phase/Iteration | Decision | Outcome |
|-----------------|----------|---------|
| Exploration | Focus on {boundaries} | Found {N} integration points |
| Iteration 1 | Conservative single fix | Pass rate: {X}% |
| ... | ... | ... |

### Recommendations
- {codebase improvement}
- {test maintenance}
```

3. **Post-Completion Options** (AskUserQuestion)

```javascript
AskUserQuestion({
  questions: [{
    question: "集成测试完成，下一步？",
    header: "Next Steps",
    options: [
      { label: "创建Issue", description: "将发现的问题创建为Issue跟踪" },
      { label: "扩展测试", description: "基于当前测试继续扩展覆盖范围" },
      { label: "生成报告", description: "导出详细测试报告" },
      { label: "完成", description: "无需进一步操作" }
    ],
    multiSelect: false
  }]
})
```

---

## Completion Conditions

| Condition | Criteria | Action |
|-----------|----------|--------|
| **Full Success** | Pass rate === 100% | Finalize with success summary |
| **Partial Success** | Pass rate >= 95%, all failures low criticality | Finalize with review notes |
| **Failure** | Max iterations reached, pass rate < 95% | Generate failure report with full reflection history |

---

## Error Handling

| Scenario | Action |
|----------|--------|
| cli-explore-agent fails | Fallback to manual exploration via Grep/Glob |
| CLI analysis timeout | Fallback: Gemini → Qwen → Codex → manual |
| Test execution crash | Log error, retry with simplified test subset |
| Max iterations reached | Generate failure report with full reflection history |
| Regression detected | Rollback via git revert, switch to surgical strategy |
| Stuck tests (3+ iterations) | Switch to reflective strategy, challenge assumptions |
| All CLI tools fail | Pattern match from state.json.fix_history, notify user |

**CLI Fallback Chain**: Gemini → Qwen → Codex

Triggers: Invalid JSON output, confidence < 0.4, HTTP 429/timeout, analysis < 100 words, same root cause 3+ times.

---

## state.json Full Schema

Single evolving state file — each phase writes its section:

```json
{
  "session_id": "ITG-xxx",
  "module": "description",
  "started": "timestamp",
  "max_iterations": 10,
  "phase": "init|explored|designed|developed|iterating|completed",

  "exploration": {
    "module_structure": { "entry_points": [], "public_apis": [], "internal_modules": [] },
    "dependencies": { "upstream": [], "downstream": [], "external_services": [] },
    "integration_points": [{ "from": "", "to": "", "type": "", "contract": "" }],
    "data_flows": [{ "name": "", "path": [], "transforms": [] }],
    "existing_tests": { "test_files": [], "patterns": [], "utilities": [], "mocking_conventions": "" },
    "test_framework": { "runner": "", "assertion_lib": "", "mock_lib": "" },
    "risk_areas": [{ "area": "", "reason": "", "priority": "" }],
    "_metadata": { "files_analyzed": 0, "timestamp": "" }
  },

  "test_design": {
    "integration_scenarios": [{ "id": "", "name": "", "boundary": "", "type": "", "priority": "", "test_cases": [], "mocking": {}, "setup": "", "teardown": "" }],
    "mocking_strategy": { "approach": "", "mock_boundaries": [], "real_boundaries": [], "rationale": "" },
    "execution_order": [],
    "success_criteria": { "pass_rate": 95, "coverage_target": 80 }
  },

  "test_inventory": {
    "test_files": [{ "path": "", "scenario_ids": [], "test_count": 0, "boundary": "" }],
    "total_tests": 0,
    "total_files": 0,
    "timestamp": ""
  },

  "iterations": {
    "current": 0,
    "strategy": null,
    "next_action": "execute_tests|execute_fix|complete",
    "history": [{ "iteration": 0, "pass_rate": 0, "strategy": "", "failed_tests": [], "reflection_summary": "", "strategy_adjustment": "" }],
    "stuck_tests": [],
    "latest_results": { "pass_rate": 0, "passed": 0, "failed": 0, "total": 0, "failures": [] }
  },

  "fix_history": [{ "iteration": 0, "strategy": "", "modification_points": [], "affected_tests": [], "confidence": 0.0 }],

  "summary": {
    "result": "success|partial_success|failure",
    "final_pass_rate": 0,
    "total_iterations": 0,
    "strategies_used": [],
    "test_metrics": {},
    "key_learnings": [],
    "corrected_assumptions": [],
    "recommendations": [],
    "completed": ""
  }
}
```

---

## Best Practices

1. **Clear Module Description**: Specific module names improve exploration quality
2. **Trust the Reflection**: Cumulative learnings inform better strategy choices over time
3. **Monitor reflection-log.md**: The single document captures the full journey
4. **Auto Mode for CI**: Use `-y` for automated pipelines
5. **Start Conservative**: Let the strategy engine escalate naturally
6. **Review Stuck Tests**: 3+ iterations means test design may need revisiting
7. **Incremental Commits**: Each iteration is a safe rollback point

---

## Usage Recommendations

**Use this command when:**
- Starting integration tests from scratch for a module
- Need comprehensive exploration before test development
- Want self-healing test cycles with documented reasoning

**Use `workflow-test-fix` skill + `workflow-test-fix` skill when:**
- Already have a completed implementation session (WFS-*)
- Only need unit/component level tests

**Use `workflow-tdd` skill when:**
- Building new features with test-first approach
- Red-Green-Refactor cycle

---

**Now execute integration-test-cycle for**: $ARGUMENTS
