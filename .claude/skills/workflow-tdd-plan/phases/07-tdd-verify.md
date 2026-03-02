# Phase 7: TDD Verification

Full TDD compliance verification with quality gate reporting. Generates comprehensive TDD_COMPLIANCE_REPORT.md.

## Objective

- Verify TDD task chain structure (TEST → IMPL → REFACTOR or internal Red-Green-Refactor)
- Analyze test coverage metrics
- Validate TDD cycle execution quality
- Generate compliance report with quality gate recommendation

## Operating Constraints

**ORCHESTRATOR MODE**:
- This phase coordinates sub-steps and inline TDD coverage analysis
- MAY write output files: TDD_COMPLIANCE_REPORT.md (primary report), .process/*.json (intermediate artifacts)
- MUST NOT modify source task files or implementation code
- MUST NOT create or delete tasks in the workflow

**Quality Gate Authority**: The compliance report provides a binding recommendation (BLOCK_MERGE / REQUIRE_FIXES / PROCEED_WITH_CAVEATS / APPROVED) based on objective compliance criteria.

## 4-Step Execution

### Step 7.1: Session Discovery & Validation

```bash
IF --session parameter provided:
    session_id = provided session
ELSE:
    # Auto-detect active session
    active_sessions = bash(find .workflow/active/ -name "WFS-*" -type d 2>/dev/null)
    IF active_sessions is empty:
        ERROR: "No active workflow session found. Use --session <session-id>"
        EXIT
    ELSE IF active_sessions has multiple entries:
        # Use most recently modified session
        session_id = bash(ls -td .workflow/active/WFS-*/ 2>/dev/null | head -1 | xargs basename)
    ELSE:
        session_id = basename(active_sessions[0])

# Derive paths
session_dir = .workflow/active/WFS-{session_id}
task_dir = session_dir/.task
summaries_dir = session_dir/.summaries
process_dir = session_dir/.process
```

**Validate Required Artifacts**:
```bash
# Check task files exist
task_files = Glob(task_dir/*.json)
IF task_files.count == 0:
    ERROR: "No task JSON files found. Run /workflow-tdd-plan first"
    EXIT

# Check summaries exist (optional but recommended for full analysis)
summaries_exist = EXISTS(summaries_dir)
IF NOT summaries_exist:
    WARNING: "No .summaries/ directory found. Some analysis may be limited."
```

**Output**: session_id, session_dir, task_files list

---

### Step 7.2: Task Chain Structure Validation

**Load and Parse Task JSONs**:
```bash
# Single-pass JSON extraction using jq
cd '{session_dir}/.task'

# Extract all task IDs
task_ids=$(jq -r '.id' *.json 2>/dev/null | sort)

# Extract dependencies for IMPL tasks
impl_deps=$(jq -r 'select(.id | startswith("IMPL")) | .id + ":" + (.context.depends_on[]? // "none")' *.json 2>/dev/null)

# Extract dependencies for REFACTOR tasks
refactor_deps=$(jq -r 'select(.id | startswith("REFACTOR")) | .id + ":" + (.context.depends_on[]? // "none")' *.json 2>/dev/null)

# Extract meta fields
meta_tdd=$(jq -r '.id + ":" + (.meta.tdd_phase // "missing")' *.json 2>/dev/null)
meta_agent=$(jq -r '.id + ":" + (.meta.agent // "missing")' *.json 2>/dev/null)

# Output as JSON
jq -n --arg ids "$task_ids" \
       --arg impl "$impl_deps" \
       --arg refactor "$refactor_deps" \
       --arg tdd "$meta_tdd" \
       --arg agent "$meta_agent" \
       '{ids: $ids, impl_deps: $impl, refactor_deps: $refactor, tdd: $tdd, agent: $agent}'
```

**Validate TDD Chain Structure**:
```
Parse validation_data JSON and validate:

For each feature N (extracted from task IDs):
   1. TEST-N.M exists?
   2. IMPL-N.M exists?
   3. REFACTOR-N.M exists? (optional but recommended)
   4. IMPL-N.M.context.depends_on contains TEST-N.M?
   5. REFACTOR-N.M.context.depends_on contains IMPL-N.M?
   6. TEST-N.M.meta.tdd_phase == "red"?
   7. TEST-N.M.meta.agent == "@code-review-test-agent"?
   8. IMPL-N.M.meta.tdd_phase == "green"?
   9. IMPL-N.M.meta.agent == "@code-developer"?
   10. REFACTOR-N.M.meta.tdd_phase == "refactor"?

Calculate:
- chain_completeness_score = (complete_chains / total_chains) * 100
- dependency_accuracy = (correct_deps / total_deps) * 100
- meta_field_accuracy = (correct_meta / total_meta) * 100
```

**Output**: chain_validation_report (JSON structure with validation results)

---

### Step 7.3: Coverage & Cycle Analysis

**Execute TDD Coverage Analysis**:

#### Phase 3a: Extract Test Tasks

```bash
# Find TEST task files and extract focus_paths
find .workflow/active/{session_id}/.task/ -name 'TEST-*.json' -exec jq -r '.context.focus_paths[]' {} \;
```

**Output**: List of test directories/files from all TEST tasks

#### Phase 3b: Run Test Suite

```bash
# Auto-detect test framework from project
if [ -f "package.json" ] && grep -q "jest\|mocha\|vitest" package.json; then
    TEST_CMD="npm test -- --coverage --json"
elif [ -f "pytest.ini" ] || [ -f "setup.py" ]; then
    TEST_CMD="pytest --cov --json-report"
elif [ -f "Cargo.toml" ]; then
    TEST_CMD="cargo test -- --test-threads=1 --nocapture"
elif [ -f "go.mod" ]; then
    TEST_CMD="go test -coverprofile=coverage.out -json ./..."
else
    TEST_CMD="echo 'No supported test framework found'"
fi

# Execute test suite with coverage
$TEST_CMD > .workflow/active/{session_id}/.process/test-results.json
```

**Output**: test-results.json with coverage data

#### Phase 3c: Parse Coverage Data

```bash
jq '.coverage' .workflow/active/{session_id}/.process/test-results.json > .workflow/active/{session_id}/.process/coverage-report.json
```

**Extract**:
- Line coverage percentage
- Branch coverage percentage
- Function coverage percentage
- Uncovered lines/branches

#### Phase 3d: Verify TDD Cycle

For each TDD chain (TEST-N.M -> IMPL-N.M -> REFACTOR-N.M):

**1. Red Phase Verification**
```bash
cat .workflow/active/{session_id}/.summaries/TEST-N.M-summary.md
```

Verify:
- Tests were created
- Tests failed initially
- Failure messages were clear

**2. Green Phase Verification**
```bash
cat .workflow/active/{session_id}/.summaries/IMPL-N.M-summary.md
```

Verify:
- Implementation was completed
- Tests now pass
- Implementation was minimal

**3. Refactor Phase Verification**
```bash
cat .workflow/active/{session_id}/.summaries/REFACTOR-N.M-summary.md
```

Verify:
- Refactoring was completed
- Tests still pass
- Code quality improved

#### TDD Cycle Verification Algorithm

```
For each feature N:
  1. Load TEST-N.M-summary.md
     IF summary missing:
       Mark: "Red phase incomplete"
       SKIP to next feature

     CHECK: Contains "test" AND "fail"
     IF NOT found:
       Mark: "Red phase verification failed"
     ELSE:
       Mark: "Red phase [PASS]"

  2. Load IMPL-N.M-summary.md
     IF summary missing:
       Mark: "Green phase incomplete"
       SKIP to next feature

     CHECK: Contains "pass" OR "green"
     IF NOT found:
       Mark: "Green phase verification failed"
     ELSE:
       Mark: "Green phase [PASS]"

  3. Load REFACTOR-N.M-summary.md
     IF summary missing:
       Mark: "Refactor phase incomplete"
       CONTINUE (refactor is optional)

     CHECK: Contains "refactor" AND "pass"
     IF NOT found:
       Mark: "Refactor phase verification failed"
     ELSE:
       Mark: "Refactor phase [PASS]"

  4. Calculate chain score:
     - Red + Green + Refactor all [PASS] = 100%
     - Red + Green [PASS], Refactor missing = 80%
     - Red [PASS], Green missing = 40%
     - All missing = 0%
```

#### Phase 3e: Generate Analysis Report

Create `.workflow/active/{session_id}/.process/tdd-cycle-report.md`:

```markdown
# TDD Cycle Analysis - {Session ID}

## Coverage Metrics
- **Line Coverage**: {percentage}%
- **Branch Coverage**: {percentage}%
- **Function Coverage**: {percentage}%

## Coverage Details
### Covered
- {covered_lines} lines
- {covered_branches} branches
- {covered_functions} functions

### Uncovered
- Lines: {uncovered_line_numbers}
- Branches: {uncovered_branch_locations}

## TDD Cycle Verification

### Feature 1: {Feature Name}
**Chain**: TEST-1.1 -> IMPL-1.1 -> REFACTOR-1.1

- [PASS] **Red Phase**: Tests created and failed initially
- [PASS] **Green Phase**: Implementation made tests pass
- [PASS] **Refactor Phase**: Refactoring maintained green tests

[Repeat for all features]

## TDD Compliance Summary
- **Total Chains**: {N}
- **Complete Cycles**: {N}
- **Incomplete Cycles**: {0}
- **Compliance Score**: {score}/100

## Gaps Identified
- {gap descriptions}

## Recommendations
- {improvement suggestions}
```

#### Coverage Metrics Calculation

```bash
line_coverage=$(jq '.coverage.lineCoverage' test-results.json)
branch_coverage=$(jq '.coverage.branchCoverage' test-results.json)
function_coverage=$(jq '.coverage.functionCoverage' test-results.json)

overall_score=$(echo "($line_coverage + $branch_coverage + $function_coverage) / 3" | bc)
```

**Parse Output Files**:
```bash
# Check required outputs exist
IF NOT EXISTS(process_dir/test-results.json):
    WARNING: "test-results.json not found. Coverage analysis incomplete."
    coverage_data = null
ELSE:
    coverage_data = Read(process_dir/test-results.json)

IF NOT EXISTS(process_dir/coverage-report.json):
    WARNING: "coverage-report.json not found. Coverage metrics incomplete."
    metrics = null
ELSE:
    metrics = Read(process_dir/coverage-report.json)

IF NOT EXISTS(process_dir/tdd-cycle-report.md):
    WARNING: "tdd-cycle-report.md not found. Cycle validation incomplete."
    cycle_data = null
ELSE:
    cycle_data = Read(process_dir/tdd-cycle-report.md)
```

**Extract Coverage Metrics**:
```
If coverage_data exists:
   - line_coverage_percent
   - branch_coverage_percent
   - function_coverage_percent
   - uncovered_files (list)
   - uncovered_lines (map: file -> line ranges)

If cycle_data exists:
   - red_phase_compliance (tests failed initially?)
   - green_phase_compliance (tests pass after impl?)
   - refactor_phase_compliance (tests stay green during refactor?)
   - minimal_implementation_score (was impl minimal?)
```

**Output**: coverage_analysis, cycle_analysis

---

### Step 7.4: Compliance Report Generation

**Calculate Compliance Score**:
```
Base Score: 100 points

Deductions:
Chain Structure:
   - Missing TEST task: -30 points per feature
   - Missing IMPL task: -30 points per feature
   - Missing REFACTOR task: -10 points per feature
   - Wrong dependency: -15 points per error
   - Wrong agent: -5 points per error
   - Wrong tdd_phase: -5 points per error

TDD Cycle Compliance:
   - Test didn't fail initially: -10 points per feature
   - Tests didn't pass after IMPL: -20 points per feature
   - Tests broke during REFACTOR: -15 points per feature
   - Over-engineered IMPL: -10 points per feature

Coverage Quality:
   - Line coverage < 80%: -5 points
   - Branch coverage < 70%: -5 points
   - Function coverage < 80%: -5 points
   - Critical paths uncovered: -10 points

Final Score: Max(0, Base Score - Total Deductions)
```

**Determine Quality Gate**:
```
IF score >= 90 AND no_critical_violations:
    recommendation = "APPROVED"
ELSE IF score >= 70 AND critical_violations == 0:
    recommendation = "PROCEED_WITH_CAVEATS"
ELSE IF score >= 50:
    recommendation = "REQUIRE_FIXES"
ELSE:
    recommendation = "BLOCK_MERGE"
```

**Quality Gate Criteria**:

| Recommendation | Score Range | Critical Violations | Action |
|----------------|-------------|---------------------|--------|
| **APPROVED** | ≥90 | 0 | Safe to merge |
| **PROCEED_WITH_CAVEATS** | ≥70 | 0 | Can proceed, address minor issues |
| **REQUIRE_FIXES** | ≥50 | Any | Must fix before merge |
| **BLOCK_MERGE** | <50 | Any | Block merge until resolved |

**Critical Violations**:
- Missing TEST or IMPL task for any feature
- Tests didn't fail initially (Red phase violation)
- Tests didn't pass after IMPL (Green phase violation)
- Tests broke during REFACTOR (Refactor phase violation)

**Generate Report**:
```javascript
const report_content = generateComplianceReport(/* see template below */)
const report_path = `${session_dir}/TDD_COMPLIANCE_REPORT.md`
Write(report_path, report_content)
```

**Display Summary to User**:
```
=== TDD Verification Complete ===
Session: {session_id}
Report: {report_path}

Quality Gate: {recommendation}
Compliance Score: {score}/100

Chain Validation: {chain_completeness_score}%
Line Coverage: {line_coverage}%
Branch Coverage: {branch_coverage}%

Next: Review full report for detailed findings
```

## TDD Compliance Report Template

```markdown
# TDD Compliance Report - {Session ID}

**Generated**: {timestamp}
**Session**: WFS-{sessionId}
**Workflow Type**: TDD

---

## Executive Summary

### Quality Gate Decision

| Metric | Value | Status |
|--------|-------|--------|
| Compliance Score | {score}/100 | {status_emoji} |
| Chain Completeness | {percentage}% | {status} |
| Line Coverage | {percentage}% | {status} |
| Branch Coverage | {percentage}% | {status} |
| Function Coverage | {percentage}% | {status} |

### Recommendation

**{RECOMMENDATION}**

**Decision Rationale**:
{brief explanation based on score and violations}

**Quality Gate Criteria**:
- **APPROVED**: Score ≥90, no critical violations
- **PROCEED_WITH_CAVEATS**: Score ≥70, no critical violations
- **REQUIRE_FIXES**: Score ≥50 or critical violations exist
- **BLOCK_MERGE**: Score <50

---

## Chain Analysis

### Feature 1: {Feature Name}
**Status**: ✅ Complete
**Chain**: TEST-1.1 → IMPL-1.1 → REFACTOR-1.1

| Phase | Task | Status | Details |
|-------|------|--------|---------|
| Red | TEST-1.1 | ✅ Pass | Test created and failed with clear message |
| Green | IMPL-1.1 | ✅ Pass | Minimal implementation made test pass |
| Refactor | REFACTOR-1.1 | ✅ Pass | Code improved, tests remained green |

### Chain Validation Summary

| Metric | Value |
|--------|-------|
| Total Features | {count} |
| Complete Chains | {count} ({percent}%) |
| Incomplete Chains | {count} |
| Missing TEST | {count} |
| Missing IMPL | {count} |
| Missing REFACTOR | {count} |
| Dependency Errors | {count} |
| Meta Field Errors | {count} |

---

## Test Coverage Analysis

### Coverage Metrics

| Metric | Coverage | Target | Status |
|--------|----------|--------|--------|
| Line Coverage | {percentage}% | ≥80% | {status} |
| Branch Coverage | {percentage}% | ≥70% | {status} |
| Function Coverage | {percentage}% | ≥80% | {status} |

### Coverage Gaps

| File | Lines | Issue | Priority |
|------|-------|-------|----------|
| {file} | {lines} | {issue} | {priority} |

---

## TDD Cycle Validation

### Red Phase (Write Failing Test)
- {N}/{total} features had failing tests initially ({percent}%)
- ✅ Compliant features: {list}
- ❌ Non-compliant features: {list}

### Green Phase (Make Test Pass)
- {N}/{total} implementations made tests pass ({percent}%)
- ✅ Compliant features: {list}
- ❌ Non-compliant features: {list}

### Refactor Phase (Improve Quality)
- {N}/{total} features completed refactoring ({percent}%)
- ✅ Compliant features: {list}
- ❌ Non-compliant features: {list}

---

## Best Practices Assessment

### Strengths
- {strengths}

### Areas for Improvement
- {improvements}

---

## Detailed Findings by Severity

### Critical Issues ({count})
{List of critical issues with impact and remediation}

### High Priority Issues ({count})
{List of high priority issues}

### Medium Priority Issues ({count})
{List of medium priority issues}

### Low Priority Issues ({count})
{List of low priority issues}

---

## Recommendations

### Required Fixes (Before Merge)
1. {required fixes}

### Recommended Improvements
1. {recommended improvements}

### Optional Enhancements
1. {optional enhancements}

---

## Metrics Summary

| Metric | Value |
|--------|-------|
| Total Features | {count} |
| Complete Chains | {count} ({percent}%) |
| Compliance Score | {score}/100 |
| Critical Issues | {count} |
| High Issues | {count} |
| Medium Issues | {count} |
| Low Issues | {count} |
| Line Coverage | {percent}% |
| Branch Coverage | {percent}% |
| Function Coverage | {percent}% |

---

**Report End**
```

## Error Handling

### Session Discovery Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| No active session | No WFS-* directories | Provide --session explicitly |
| Multiple active sessions | Multiple WFS-* directories | Provide --session explicitly |
| Session not found | Invalid session-id | Check available sessions |

### Validation Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| Task files missing | Incomplete planning | Run /workflow-tdd-plan first |
| Invalid JSON | Corrupted task files | Regenerate tasks |
| Missing summaries | Tasks not executed | Execute tasks before verify |

### Analysis Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| Coverage tool missing | No test framework | Configure testing first |
| Tests fail to run | Code errors | Fix errors before verify |
| Coverage analysis fails | Test framework or coverage tool error | Check test framework configuration |

## Output

- **File**: `TDD_COMPLIANCE_REPORT.md` (comprehensive compliance report)
- **Files**: `.process/test-results.json`, `.process/coverage-report.json`, `.process/tdd-cycle-report.md`

## Output Files Structure

```
.workflow/active/WFS-{session-id}/
├── TDD_COMPLIANCE_REPORT.md     # Comprehensive compliance report ⭐
└── .process/
    ├── test-results.json         # From coverage analysis (Step 7.3)
    ├── coverage-report.json      # From coverage analysis (Step 7.3)
    └── tdd-cycle-report.md       # From coverage analysis (Step 7.3)
```

## Next Steps Decision Table

| Situation | Recommended Command | Purpose |
|-----------|---------------------|---------|
| APPROVED | `workflow-execute` skill | Start TDD implementation |
| PROCEED_WITH_CAVEATS | `workflow-execute` skill | Start with noted caveats |
| REQUIRE_FIXES | Review report, refine tasks | Address issues before proceed |
| BLOCK_MERGE | `workflow-plan` skill (replan phase) | Significant restructuring needed |
| After implementation | Re-run `workflow-tdd-plan` skill (tdd-verify phase) | Verify post-execution compliance |
