---
name: refactor-cycle
description: Tech debt discovery and self-iterating refactoring with multi-dimensional analysis, prioritized execution, regression validation, and reflection-driven adjustment
argument-hint: "[-y|--yes] [-c|--continue] [--scope=module|project] \"module or refactoring goal\""
allowed-tools: TodoWrite(*), Task(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-confirm prioritization, use recommended refactoring strategy, skip interactive checkpoints.

# Workflow Refactor-Cycle Command

## Quick Start

```bash
# Discover and fix tech debt in a module
/workflow:refactor-cycle "src/auth 模块的技术债务清理"

# Auto mode - fully autonomous
/workflow:refactor-cycle -y "支付服务重构优化"

# Project-wide scan
/workflow:refactor-cycle --scope=project "全项目技术债务扫描与重构"

# Continue interrupted session
/workflow:refactor-cycle --continue "认证模块"
```

**Context Source**: cli-explore-agent + Gemini/Codex multi-dimensional analysis
**Output Directory**: `.workflow/.refactor/{session-id}/`
**Core Innovation**: Debt-driven refactoring with regression-safe iterative execution and reflection

## What & Why

### Core Concept

Closed-loop tech debt lifecycle: **Discover → Assess → Plan → Refactor → Validate → Reflect → Next** — each refactoring item is executed, validated against regression, and reflected upon before proceeding.

**vs Existing Commands**:
- **workflow:lite-fix**: Single bug fix, no systematic debt analysis
- **workflow:plan + execute**: Generic implementation, no debt-aware prioritization or regression validation
- **This command**: Full debt lifecycle — discovery through multi-dimensional scan, prioritized execution with per-item regression validation

### Value Proposition
1. **Systematic Discovery**: Multi-dimensional scan (code quality, architecture, dependencies, test gaps, performance)
2. **Risk-Aware Prioritization**: Impact × effort matrix with dependency-aware ordering
3. **Regression-Safe**: Each refactoring item validated before proceeding to next
4. **Documented Reasoning**: Every debt item, prioritization decision, and refactoring outcome recorded

## Output Artifacts

**2 core files + 1 trace directory**:

| Artifact | Type | Description |
|----------|------|-------------|
| `reflection-log.md` | Human-readable | ⭐ Debt inventory, prioritization rationale, per-item refactoring reflections, conclusions |
| `state.json` | Machine-readable | Debt items, priority queue, refactoring plans, validation results, iteration state |
| `.trace/` | Raw logs | CLI analysis outputs, test outputs, diagnostics snapshots |

```
.workflow/.refactor/RFT-{slug}-{date}/
├── reflection-log.md    # ⭐ Debt discovery + prioritization + per-item reflections + conclusions
├── state.json           # Debt inventory + queue + plans + validation + iteration state
└── .trace/              # Raw logs (CLI outputs, test results, diagnostics)
    ├── discovery-cli.txt
    ├── item-{N}-cli.txt
    └── test-output.log
```

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│              TECH DEBT REFACTORING CYCLE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Phase 1: Session Initialization                                         │
│     ├─ Parse input (module/goal)                                         │
│     ├─ Create session directory                                          │
│     └─ Initialize reflection-log.md + state.json                         │
│                                                                          │
│  Phase 2: Debt Discovery                                                 │
│     ├─ cli-explore-agent: Codebase structure & patterns                 │
│     ├─ CLI multi-dimensional scan:                                       │
│     │   ├─ Code quality (complexity, duplication, dead code)            │
│     │   ├─ Architecture (coupling, cohesion, layering violations)       │
│     │   ├─ Dependencies (outdated, circular, unused)                    │
│     │   ├─ Test gaps (untested paths, fragile tests)                    │
│     │   └─ Maintainability (naming, documentation, type safety)        │
│     ├─ Build debt inventory → state.json.debt_items                     │
│     └─ Append findings to reflection-log.md                              │
│                                                                          │
│  Phase 3: Assessment & Prioritization                                    │
│     ├─ Score each item: impact (1-5) × effort (1-5)                    │
│     ├─ Analyze dependency ordering (what must refactor first)           │
│     ├─ [Interactive] User confirms/adjusts priorities                   │
│     ├─ Build execution queue → state.json.queue                         │
│     └─ Append prioritization rationale to reflection-log.md              │
│                                                                          │
│  Phase 4: Iterative Refactoring Cycle ◄─── CORE LOOP ──┐              │
│     │  For each item in queue:                           │              │
│     ├─ Snapshot: Capture baseline (diagnostics + tests)  │              │
│     ├─ Refactor: @code-developer applies changes         │              │
│     ├─ Validate:                                         │              │
│     │   ├─ Tests pass? (no regression)                   │              │
│     │   ├─ Diagnostics clean? (no new errors)            │              │
│     │   └─ Quality improved? (metrics comparison)        │              │
│     ├─ Decision:                                         │              │
│     │   ├─ PASS → Commit, reflect, next item             │              │
│     │   ├─ PARTIAL → Fix issues, re-validate ───────────→│              │
│     │   └─ FAIL → Rollback, reflect, skip/retry          │              │
│     ├─ Reflect: Record what changed, what broke, why     │              │
│     └─ Commit: git add + commit per completed item       │              │
│                                                                          │
│  Phase 5: Completion                                                     │
│     ├─ Final metrics comparison (before vs after)                       │
│     ├─ Finalize reflection-log.md with conclusions                       │
│     └─ Offer next steps                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Implementation

### Session Initialization

**Objective**: Create session context and initialize 2 core files.

**Required Actions**:
1. Extract module/goal from `$ARGUMENTS`
2. Generate session ID: `RFT-{slug}-{date}`
   - slug: lowercase, alphanumeric + Chinese, max 40 chars
   - date: YYYY-MM-DD (UTC+8)
3. Session folder: `.workflow/.refactor/{session-id}`
4. Parse options:
   - `-c` / `--continue`: Resume existing session
   - `-y` / `--yes`: Auto-approval mode
   - `--scope=module|project` (default: module)
5. Auto-detect: If session folder + reflection-log.md exist → continue mode
6. Create: `{sessionFolder}/`, `{sessionFolder}/.trace/`

**Initialize reflection-log.md**:

```markdown
# Tech Debt Refactoring Log

## Session: {sessionId}
- **Target**: {module_or_goal}
- **Scope**: {module|project}
- **Started**: {timestamp}

---

## Phase 2: Debt Discovery
> Pending...

## Phase 3: Prioritization
> Pending...

## Refactoring Timeline
> Per-item reflections will be appended here...

## Cumulative Learnings
> (Replaced and updated after each refactoring item — not appended)

## Conclusions
> Final synthesis after completion...
```

**Initialize state.json**:

```json
{
  "session_id": "RFT-xxx",
  "target": "module or goal",
  "scope": "module|project",
  "started": "timestamp",
  "phase": "init",

  "exploration": null,
  "debt_items": [],
  "queue": [],
  "current_item": null,
  "completed_items": [],
  "skipped_items": [],
  "baseline": null,
  "summary": null
}
```

---

### Phase 2: Debt Discovery

**Objective**: Systematically scan the codebase and build a debt inventory across multiple dimensions.

**Workflow Steps**:

1. **Codebase Exploration via cli-explore-agent**

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: `Explore codebase for debt: ${topicSlug}`,
  prompt: `
## Analysis Context
Target: ${module_or_goal}
Scope: ${scope}
Session: ${sessionFolder}

## MANDATORY FIRST STEPS
1. Run: ccw tool exec get_modules_by_depth '{}'
2. Read: .workflow/project-tech.json (if exists)
3. Search for: complex functions, long files, TODO/FIXME/HACK comments, suppression patterns (@ts-ignore, eslint-disable)

## Exploration Focus
- **Module Structure**: File organization, module boundaries, public APIs
- **Code Metrics**: Longest files, deepest nesting, most complex functions
- **Dependency Graph**: Import chains, circular dependencies, external deps
- **Test Coverage**: Test file mapping, untested modules
- **Pattern Violations**: Inconsistent naming, mixed paradigms, dead exports

## Output
Update state.json field "exploration" with:
{
  "structure": { "files": [], "modules": [], "total_loc": 0 },
  "metrics": { "largest_files": [], "most_complex": [], "deepest_nesting": [] },
  "dependency_issues": { "circular": [], "unused_imports": [], "outdated_deps": [] },
  "test_mapping": { "tested": [], "untested": [], "coverage_estimate": "" },
  "pattern_violations": { "suppressions": [], "todos": [], "inconsistencies": [] },
  "_metadata": { "files_analyzed": 0, "timestamp": "" }
}
Also set state.json "phase" to "explored".
`
})
```

2. **Multi-Dimensional CLI Debt Scan**

```javascript
Bash({
  command: `ccw cli -p "
PURPOSE: Comprehensive tech debt analysis for '${module_or_goal}'
Success: Actionable debt inventory with concrete file:line references

EXPLORATION CONTEXT:
${JSON.stringify(state.exploration, null, 2)}

TASK:
• **Code Quality**: Identify high-complexity functions (cyclomatic >10), duplicated logic (>20 lines), dead code (unreachable/unused exports), overly long files (>500 lines)
• **Architecture**: Detect tight coupling (>5 imports from one module), layering violations (UI→DB direct), god classes/modules, missing abstractions
• **Dependencies**: Flag circular imports, unused dependencies, outdated packages with known vulnerabilities
• **Test Gaps**: Untested critical paths, fragile tests (mock-heavy, timing-dependent), missing edge case coverage
• **Maintainability**: Inconsistent naming conventions, missing types (any/unknown abuse), misleading comments, magic numbers/strings

For each debt item provide:
- id: D-{NNN}
- dimension: code_quality|architecture|dependencies|test_gaps|maintainability
- title: Short description
- location: file:line or module path
- severity: critical|high|medium|low
- description: What's wrong and why it matters
- suggested_fix: How to address it

MODE: analysis
CONTEXT: @**/*
EXPECTED: JSON array of debt items with all fields populated, severity distribution, dimension summary
CONSTRAINTS: Focus on ${scope === 'project' ? 'project-wide patterns' : 'target module and direct dependencies'}
" --tool gemini --mode analysis --rule analysis-review-code-quality`,
  run_in_background: true
})
```

3. **Build debt inventory** — parse CLI output, write `state.json.debt_items`:

```json
[
  {
    "id": "D-001",
    "dimension": "architecture",
    "title": "Circular dependency between auth and user modules",
    "location": "src/auth/index.ts ↔ src/user/index.ts",
    "severity": "high",
    "description": "Bidirectional import creates tight coupling",
    "suggested_fix": "Extract shared types to common module",
    "impact": 0,
    "effort": 0,
    "priority_score": 0,
    "status": "discovered",
    "refactor_plan": null,
    "validation_result": null
  }
]
```

Save CLI output to `.trace/discovery-cli.txt`.

4. **Append to reflection-log.md** (replace `## Phase 2: Debt Discovery` placeholder):

```markdown
## Phase 2: Debt Discovery - {timestamp}

### Scan Summary
- **Total Items Found**: {N}
- **By Dimension**: Code Quality ({N}), Architecture ({N}), Dependencies ({N}), Test Gaps ({N}), Maintainability ({N})
- **By Severity**: Critical ({N}), High ({N}), Medium ({N}), Low ({N})

### Key Findings
- {top finding 1 with location}
- {top finding 2 with location}
- {top finding 3 with location}

### Initial Assessment
> **Observation**: {overall health assessment}
> **Biggest Risk**: {highest severity pattern}
> **Quick Wins**: {low-effort high-impact items}
```

---

### Phase 3: Assessment & Prioritization

**Objective**: Score, prioritize, and build an execution queue.

**Workflow Steps**:

1. **Score Each Debt Item**

For each item, assign via CLI analysis or heuristics:
- **Impact** (1-5): How much does this hurt? (5 = blocks development, causes bugs)
- **Effort** (1-5): How hard to fix? (1 = trivial, 5 = major rewrite)
- **Priority Score** = impact × (6 - effort) — favors high-impact low-effort items (e.g., impact=5 effort=1 → score=25; impact=2 effort=5 → score=2)

2. **Dependency-Aware Ordering**

Some items must be refactored before others:
- Extract shared types → then break circular dependency
- Fix base class → then fix subclasses

Build `state.json.queue` as an ordered array of item IDs.

3. **Interactive Prioritization** (skip in auto mode)

```javascript
AskUserQuestion({
  questions: [{
    question: "技术债务优先级如何调整？",
    header: "Priorities",
    options: [
      { label: "确认优先级，开始重构", description: "按当前评分排序执行" },
      { label: "只处理 Critical/High", description: "跳过 Medium/Low 项，聚焦高优先级" },
      { label: "自定义选择", description: "手动选择要处理的债务项" },
      { label: "调整评分", description: "对某些项的 impact/effort 评分有不同意见" }
    ],
    multiSelect: false
  }]
})
```

4. **Update state.json** — write `queue` and update items with scores:

```json
{
  "queue": ["D-003", "D-001", "D-007", "D-002"],
  "phase": "prioritized"
}
```

5. **Capture baseline metrics** — run tests + diagnostics before any changes:

```javascript
// Run tests to get baseline pass count
// Run mcp__ide__getDiagnostics for baseline error count
// Save as state.json.baseline
{
  "baseline": {
    "test_pass_rate": 100,
    "test_count": 42,
    "diagnostic_errors": 3,
    "diagnostic_warnings": 15,
    "timestamp": ""
  }
}
```

6. **Append to reflection-log.md** (replace `## Phase 3: Prioritization` placeholder):

```markdown
## Phase 3: Prioritization - {timestamp}

### Priority Queue ({N} items)
| Rank | ID | Title | Severity | Impact | Effort | Score |
|------|----|-------|----------|--------|--------|-------|
| 1 | D-003 | ... | critical | 5 | 2 | 20 |
| 2 | D-001 | ... | high | 4 | 3 | 12 |
| ... | ... | ... | ... | ... | ... | ... |

### Prioritization Decisions
> **Decision**: {ordering rationale}
> - **Dependency constraint**: {D-X must precede D-Y because...}
> - **User adjustment**: {what was changed and why}

### Baseline Metrics
- Tests: {pass_rate}% ({count} tests)
- Diagnostics: {errors} errors, {warnings} warnings
```

---

### Phase 4: Iterative Refactoring Cycle

**Objective**: Execute refactoring items one-by-one with per-item validation, reflection, and commit.

**For each item in queue**:

```
1. Plan     → Design specific refactoring approach
2. Refactor → @code-developer applies changes
3. Validate → Tests + diagnostics + quality check
4. Decision → PASS (commit + next) | PARTIAL (fix + retry) | FAIL (rollback + skip)
5. Reflect  → Record outcome in reflection-log.md
6. Commit   → Safe checkpoint
```

**Max retries per item**: 3 (then skip with note)

#### Step 4.1: Plan Refactoring

For each item, generate a focused refactoring plan:

```javascript
Bash({
  command: `ccw cli -p "
PURPOSE: Design refactoring approach for debt item ${item.id}: ${item.title}
Success: Specific, minimal changes that resolve the debt without regression

DEBT ITEM:
${JSON.stringify(item, null, 2)}

CODEBASE CONTEXT:
${JSON.stringify(state.exploration, null, 2)}

TASK:
• Analyze the specific code at ${item.location}
• Design minimal refactoring approach (smallest change that fixes the debt)
• List exact files and functions to modify
• Identify regression risks and how to mitigate
• Define validation criteria (how to know it worked)

MODE: analysis
CONTEXT: @**/*
EXPECTED: Refactoring plan with: approach, modification_points [{file, function, change_description}], regression_risks, validation_criteria
CONSTRAINTS: Minimal changes | No behavior change | Preserve backward compatibility
" --tool gemini --mode analysis --rule development-refactor-codebase`,
  run_in_background: true
})
```

Save CLI output to `.trace/item-${N}-cli.txt`.
Update `state.json.debt_items[item].refactor_plan` with parsed plan.
Set `state.json.current_item` to item ID.

#### Step 4.2: Execute Refactoring

```javascript
Task({
  subagent_type: "code-developer",
  run_in_background: false,
  description: `Refactor ${item.id}: ${item.title}`,
  prompt: `
## Task Objective
Apply refactoring for debt item ${item.id}: ${item.title}

## MANDATORY FIRST STEPS
1. Read state.json: ${sessionFolder}/state.json — use current_item and its refactor_plan
2. Read the source files at the modification points
3. Understand the existing behavior before changing anything

## Refactoring Plan
${JSON.stringify(item.refactor_plan, null, 2)}

## Critical Rules
- **No behavior change**: Refactoring must preserve existing functionality
- **Minimal diff**: Only change what's necessary to resolve the debt
- **Follow existing patterns**: Match naming, formatting, import style
- **No new dependencies**: Don't introduce new libraries
- **Backward compatible**: Preserve all public APIs and exports

## After Changes
- Verify syntax: Run tsc --noEmit or equivalent
- Check imports: Ensure no broken references
`
})
```

#### Step 4.3: Validate

```javascript
// 1. Run tests
Task({
  subagent_type: "test-fix-agent",
  run_in_background: false,
  description: `Validate refactoring: ${item.id}`,
  prompt: `
## Task Objective
Validate that refactoring ${item.id} causes no regression.

## Validation Steps
1. Run full test suite — compare against baseline: ${state.baseline.test_pass_rate}% (${state.baseline.test_count} tests)
2. Check for new test failures (any failure not in baseline = regression)
3. Run syntax check (tsc --noEmit or equivalent)

## Output
Update state.json field "debt_items[${item.id}].validation_result" with:
{
  "tests_passed": true|false,
  "test_pass_rate": 0,
  "new_failures": [],
  "diagnostics_delta": { "errors": 0, "warnings": 0 },
  "regression_detected": false,
  "validation_criteria_met": true|false,
  "timestamp": ""
}
Save test output to: ${sessionFolder}/.trace/test-output.log
`
})

// 2. Check diagnostics
// mcp__ide__getDiagnostics — compare against baseline
```

#### Step 4.4: Decision & Retry

```javascript
const result = item.validation_result;

if (result.tests_passed && !result.regression_detected && result.validation_criteria_met) {
  // PASS → commit, reflect, next item
  item.status = "completed";
} else if (retryCount < 3) {
  // PARTIAL → analyze failure, fix, retry
  // Use @test-fix-agent to fix regression
  retryCount++;
  // Loop back to 4.2 with fix context
} else {
  // FAIL → rollback, skip
  // git revert to last checkpoint
  item.status = "skipped";
  item.skip_reason = "Max retries reached, regression not resolved";
}
```

#### Step 4.5: Reflect

Append to reflection-log.md `## Refactoring Timeline`:

```markdown
### Item {item.id}: {item.title} — {COMPLETED|SKIPPED} ({timestamp})

**Changes**: {files modified}
**Validation**: Tests {pass_rate}% | Diagnostics delta: {errors_delta} errors, {warnings_delta} warnings
**Regression**: {none detected | description of regression}

**What Changed**: {concrete description of refactoring}
**What Broke** (if any): {regression details}
**What We Learned**: {insight about this debt pattern}
**Impact on Remaining Items**: {does this affect other queue items?}
```

Update `## Cumulative Learnings` (replace, not append):

```markdown
## Cumulative Learnings (Updated: Item {item.id})

### Safe Patterns
- {refactoring pattern that worked without regression}

### Risky Patterns
- {pattern that caused regression — avoid or handle carefully}

### Dependency Insights
- {discovered hidden dependencies during refactoring}

### Code Health Trend
- Items completed: {N}/{total}
- Regressions encountered: {N}
- Test health: {baseline → current}
```

#### Step 4.6: Commit

```bash
git add <modified_files>
git commit -m "refactor(${item.dimension}): ${item.title} [${item.id}]"
```

Move to next item in queue.

---

### Phase 5: Completion

**Objective**: Compare final metrics against baseline, finalize reflection log.

**Workflow Steps**:

1. **Final Metrics Capture** — run tests + diagnostics again

2. **Update state.json** — write `summary`:

```json
{
  "summary": {
    "result": "success|partial|incomplete",
    "items_completed": 0,
    "items_skipped": 0,
    "items_total": 0,
    "metrics_before": { "test_pass_rate": 0, "diagnostic_errors": 0, "diagnostic_warnings": 0 },
    "metrics_after": { "test_pass_rate": 0, "diagnostic_errors": 0, "diagnostic_warnings": 0 },
    "dimensions_addressed": { "code_quality": 0, "architecture": 0, "dependencies": 0, "test_gaps": 0, "maintainability": 0 },
    "regressions_encountered": 0,
    "key_learnings": [],
    "remaining_debt": [],
    "completed": "timestamp"
  },
  "phase": "completed"
}
```

3. **Finalize reflection-log.md** — replace `## Conclusions` placeholder:

```markdown
## Conclusions - {timestamp}

### Result: {SUCCESS|PARTIAL|INCOMPLETE}

### Metrics Comparison
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Test Pass Rate | {X}% | {Y}% | {+/-Z}% |
| Diagnostic Errors | {X} | {Y} | {+/-Z} |
| Diagnostic Warnings | {X} | {Y} | {+/-Z} |

### Completed ({N}/{total})
| ID | Title | Dimension |
|----|-------|-----------|
| D-001 | ... | architecture |
| ... | ... | ... |

### Skipped ({N})
| ID | Title | Reason |
|----|-------|--------|
| D-005 | ... | Regression not resolvable in 3 retries |

### Remaining Debt
- {items not in queue or deferred}

### Key Insights
- {insight about codebase health}
- {pattern for future refactoring}

### Recommendations
- {what to address next}
- {process improvement}
```

4. **Post-Completion Options** (AskUserQuestion)

```javascript
AskUserQuestion({
  questions: [{
    question: "重构完成，下一步？",
    header: "Next Steps",
    options: [
      { label: "创建Issue", description: "将剩余债务/跳过项创建为Issue跟踪" },
      { label: "继续处理", description: "处理跳过项或剩余低优先级债务" },
      { label: "生成报告", description: "导出完整的技术债务报告" },
      { label: "完成", description: "无需进一步操作" }
    ],
    multiSelect: false
  }]
})
```

---

## Debt Dimensions Reference

| Dimension | What to Scan | Severity Signals |
|-----------|-------------|------------------|
| **Code Quality** | Cyclomatic complexity >10, duplication >20 lines, dead code, long files >500 lines, deep nesting >4 | Critical: dead code in critical path; High: >15 complexity |
| **Architecture** | Coupling >5 imports from one module, layering violations, god classes >300 lines, missing abstractions | Critical: circular dependency in core; High: layering violation |
| **Dependencies** | Circular imports, unused deps, outdated with CVEs, version conflicts | Critical: known CVE; High: circular in core modules |
| **Test Gaps** | Untested critical paths, fragile tests, missing edge cases, mock leakage | Critical: no tests for auth/payment; High: flaky CI tests |
| **Maintainability** | `any`/`@ts-ignore` abuse, magic numbers, misleading names, missing types | High: >10 suppressions in one file; Medium: inconsistent naming |

---

## state.json Full Schema

```json
{
  "session_id": "RFT-xxx",
  "target": "description",
  "scope": "module|project",
  "started": "timestamp",
  "phase": "init|explored|prioritized|refactoring|completed",

  "exploration": {
    "structure": { "files": [], "modules": [], "total_loc": 0 },
    "metrics": { "largest_files": [], "most_complex": [], "deepest_nesting": [] },
    "dependency_issues": { "circular": [], "unused_imports": [], "outdated_deps": [] },
    "test_mapping": { "tested": [], "untested": [], "coverage_estimate": "" },
    "pattern_violations": { "suppressions": [], "todos": [], "inconsistencies": [] },
    "_metadata": { "files_analyzed": 0, "timestamp": "" }
  },

  "debt_items": [{
    "id": "D-001",
    "dimension": "architecture",
    "title": "",
    "location": "",
    "severity": "critical|high|medium|low",
    "description": "",
    "suggested_fix": "",
    "impact": 0,
    "effort": 0,
    "priority_score": 0,
    "status": "discovered|queued|in_progress|completed|skipped",
    "refactor_plan": { "approach": "", "modification_points": [], "regression_risks": [], "validation_criteria": [] },
    "validation_result": { "tests_passed": false, "regression_detected": false, "diagnostics_delta": {} },
    "skip_reason": null
  }],

  "queue": [],
  "current_item": null,
  "completed_items": [],
  "skipped_items": [],

  "baseline": {
    "test_pass_rate": 0,
    "test_count": 0,
    "diagnostic_errors": 0,
    "diagnostic_warnings": 0,
    "timestamp": ""
  },

  "summary": {
    "result": "success|partial|incomplete",
    "items_completed": 0,
    "items_skipped": 0,
    "items_total": 0,
    "metrics_before": {},
    "metrics_after": {},
    "dimensions_addressed": {},
    "regressions_encountered": 0,
    "key_learnings": [],
    "remaining_debt": [],
    "completed": ""
  }
}
```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| cli-explore-agent fails | Fallback to Grep/Glob manual scan |
| CLI analysis timeout | Fallback: Gemini → Qwen → Codex |
| Test suite crashes | Log error, retry with minimal test subset |
| Regression in refactoring | Retry up to 3 times, then rollback + skip |
| All items skipped | Generate failure report, recommend manual review |
| Circular dependency in queue | Detect in Phase 3, break cycle with extraction item |
| Diagnostics unavailable | Skip diagnostics check, rely on tests only |

**CLI Fallback Chain**: Gemini → Qwen → Codex

---

## Commit Strategy

1. **Before refactoring starts** (Phase 3 baseline):
   ```bash
   git stash  # Save any uncommitted work
   ```

2. **After each completed item**:
   ```bash
   git add <modified_files>
   git commit -m "refactor(${dimension}): ${title} [${id}]"
   ```

3. **On regression (rollback)**:
   ```bash
   git checkout -- <modified_files>  # Discard changes for this item
   ```

4. **Final completion commit**:
   ```bash
   git add ${sessionFolder}/reflection-log.md ${sessionFolder}/state.json
   git commit -m "refactor: complete tech debt cycle ${sessionId} (${completed}/${total} items)"
   ```

---

## Best Practices

1. **Start with module scope**: Project-wide scans produce too many items; focus on one module first
2. **Trust prioritization**: Impact × effort scoring avoids analysis paralysis
3. **One item at a time**: Each refactoring is isolated, validated, and committed
4. **Rollback is not failure**: Skipping a risky item is better than introducing regression
5. **Review reflection-log.md**: Cumulative learnings help future refactoring sessions
6. **Auto mode for cleanup**: Use `-y` for straightforward tech debt (naming, dead code)
7. **Interactive for architecture**: Complex architectural refactoring benefits from user input at prioritization

---

## Usage Recommendations

**Use this command when:**
- Systematic tech debt cleanup needed for a module
- Pre-refactoring analysis and prioritization required
- Need regression-safe iterative refactoring with rollback
- Want documented reasoning for each refactoring decision

**Use `workflow-lite-plan` skill when:**
- Single specific bug or issue to fix
- No systematic debt analysis needed

**Use `workflow-plan` skill + `workflow-execute` skill when:**
- New feature implementation (not refactoring)
- Already know exactly what to change

**Use `/workflow:integration-test-cycle` when:**
- Need integration tests before/after refactoring
- Want to verify cross-module behavior post-refactoring

---

## Post-Completion Expansion

**Auto-sync**: 执行 `/workflow:session:sync -y "{summary}"` 更新 specs/*.md + project-tech。

完成后询问用户是否扩展为issue(test/enhance/refactor/doc)，选中项调用 `/issue:new "{summary} - {dimension}"`

---

**Now execute refactor-cycle for**: $ARGUMENTS
