---
name: tdd-verify
description: Verify TDD workflow compliance against Red-Green-Refactor cycles. Generates quality report with coverage analysis and quality gate recommendation. Orchestrates sub-commands for comprehensive validation.
argument-hint: "[optional: --session WFS-session-id]"
allowed-tools: SlashCommand(*), TodoWrite(*), Read(*), Write(*), Bash(*), Glob(*)
---

# TDD Verification Command (/workflow:tdd-verify)

## Goal

Verify TDD workflow execution quality by validating Red-Green-Refactor cycle compliance, test coverage completeness, and task chain structure integrity. This command orchestrates multiple analysis phases and generates a comprehensive compliance report with quality gate recommendation.

**Output**: A structured Markdown report saved to `.workflow/active/WFS-{session}/TDD_COMPLIANCE_REPORT.md` containing:
- Executive summary with compliance score and quality gate recommendation
- Task chain validation (TEST → IMPL → REFACTOR structure)
- Test coverage metrics (line, branch, function)
- Red-Green-Refactor cycle verification
- Best practices adherence assessment
- Actionable improvement recommendations

## Operating Constraints

**ORCHESTRATOR MODE**:
- This command coordinates multiple sub-commands (`/workflow:tools:tdd-coverage-analysis`, `ccw cli`)
- MAY write output files: TDD_COMPLIANCE_REPORT.md (primary report), .process/*.json (intermediate artifacts)
- MUST NOT modify source task files or implementation code
- MUST NOT create or delete tasks in the workflow

**Quality Gate Authority**: The compliance report provides a binding recommendation (BLOCK_MERGE / REQUIRE_FIXES / PROCEED_WITH_CAVEATS / APPROVED) based on objective compliance criteria.

## Coordinator Role

**This command is a pure orchestrator**: Execute 4 phases to verify TDD workflow compliance, test coverage, and Red-Green-Refactor cycle execution.

## Core Responsibilities
- Verify TDD task chain structure (TEST → IMPL → REFACTOR)
- Analyze test coverage metrics
- Validate TDD cycle execution quality
- Generate compliance report with quality gate recommendation

## Execution Process

```
Input Parsing:
   └─ Decision (session argument):
      ├─ --session provided → Use provided session
      └─ No session → Auto-detect active session

Phase 1: Session Discovery & Validation
   ├─ Detect or validate session directory
   ├─ Check required artifacts exist (.task/*.json, .summaries/*)
   └─ ERROR if invalid or incomplete

Phase 2: Task Chain Structure Validation
   ├─ Load all task JSONs from .task/
   ├─ Validate TDD structure: TEST-N.M → IMPL-N.M → REFACTOR-N.M
   ├─ Verify dependencies (depends_on)
   ├─ Validate meta fields (tdd_phase, agent)
   └─ Extract chain validation data

Phase 3: Coverage & Cycle Analysis
   ├─ Call: /workflow:tools:tdd-coverage-analysis
   ├─ Parse: test-results.json, coverage-report.json, tdd-cycle-report.md
   └─ Extract coverage metrics and TDD cycle verification

Phase 4: Compliance Report Generation
   ├─ Aggregate findings from Phases 1-3
   ├─ Calculate compliance score (0-100)
   ├─ Determine quality gate recommendation
   ├─ Generate TDD_COMPLIANCE_REPORT.md
   └─ Display summary to user
```

## 4-Phase Execution

### Phase 1: Session Discovery & Validation

**Step 1.1: Detect Session**
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

**Step 1.2: Validate Required Artifacts**
```bash
# Check task files exist
task_files = Glob(task_dir/*.json)
IF task_files.count == 0:
    ERROR: "No task JSON files found. Run /workflow:tdd-plan first"
    EXIT

# Check summaries exist (optional but recommended for full analysis)
summaries_exist = EXISTS(summaries_dir)
IF NOT summaries_exist:
    WARNING: "No .summaries/ directory found. Some analysis may be limited."
```

**Output**: session_id, session_dir, task_files list

---

### Phase 2: Task Chain Structure Validation

**Step 2.1: Load and Parse Task JSONs**
```bash
# Single-pass JSON extraction using jq
validation_data = bash("""
# Load all tasks and extract structured data
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
jq -n --arg ids "$task_ids" \\
       --arg impl "$impl_deps" \\
       --arg refactor "$refactor_deps" \\
       --arg tdd "$meta_tdd" \\
       --arg agent "$meta_agent" \\
       '{ids: $ids, impl_deps: $impl, refactor_deps: $refactor, tdd: $tdd, agent: $agent}'
""")
```

**Step 2.2: Validate TDD Chain Structure**
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

### Phase 3: Coverage & Cycle Analysis

**Step 3.1: Call Coverage Analysis Sub-command**
```bash
SlashCommand(command="/workflow:tools:tdd-coverage-analysis --session {session_id}")
```

**Step 3.2: Parse Output Files**
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

**Step 3.3: Extract Coverage Metrics**
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

### Phase 4: Compliance Report Generation

**Step 4.1: Calculate Compliance Score**
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

**Step 4.2: Determine Quality Gate**
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

**Step 4.3: Generate Report**
```bash
report_content = Generate markdown report (see structure below)
report_path = "{session_dir}/TDD_COMPLIANCE_REPORT.md"
Write(report_path, report_content)
```

**Step 4.4: Display Summary to User**
```bash
echo "=== TDD Verification Complete ==="
echo "Session: {session_id}"
echo "Report: {report_path}"
echo ""
echo "Quality Gate: {recommendation}"
echo "Compliance Score: {score}/100"
echo ""
echo "Chain Validation: {chain_completeness_score}%"
echo "Line Coverage: {line_coverage}%"
echo "Branch Coverage: {branch_coverage}%"
echo ""
echo "Next: Review full report for detailed findings"
```

## TodoWrite Pattern (Optional)

**Note**: As an orchestrator command, TodoWrite tracking is optional and primarily useful for long-running verification processes. For most cases, the 4-phase execution is fast enough that progress tracking adds noise without value.

```javascript
// Only use TodoWrite for complex multi-session verification
// Skip for single-session verification
```

## Validation Logic

### Chain Validation Algorithm
```
1. Load all task JSONs from .workflow/active/{sessionId}/.task/
2. Extract task IDs and group by feature number
3. For each feature:
   - Check TEST-N.M exists
   - Check IMPL-N.M exists
   - Check REFACTOR-N.M exists (optional but recommended)
   - Verify IMPL-N.M depends_on TEST-N.M
   - Verify REFACTOR-N.M depends_on IMPL-N.M
   - Verify meta.tdd_phase values
   - Verify meta.agent assignments
4. Calculate chain completeness score
5. Report incomplete or invalid chains
```

### Quality Gate Criteria

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

## Output Files
```
.workflow/active/WFS-{session-id}/
├── TDD_COMPLIANCE_REPORT.md     # Comprehensive compliance report ⭐
└── .process/
    ├── test-results.json         # From tdd-coverage-analysis
    ├── coverage-report.json      # From tdd-coverage-analysis
    └── tdd-cycle-report.md       # From tdd-coverage-analysis
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
| Task files missing | Incomplete planning | Run /workflow:tdd-plan first |
| Invalid JSON | Corrupted task files | Regenerate tasks |
| Missing summaries | Tasks not executed | Execute tasks before verify |

### Analysis Errors
| Error | Cause | Resolution |
|-------|-------|------------|
| Coverage tool missing | No test framework | Configure testing first |
| Tests fail to run | Code errors | Fix errors before verify |
| Sub-command fails | tdd-coverage-analysis error | Check sub-command logs |

## Integration & Usage

### Command Chain
- **Called After**: `/workflow:execute` (when TDD tasks completed)
- **Calls**: `/workflow:tools:tdd-coverage-analysis`
- **Related**: `/workflow:tdd-plan`, `/workflow:status`

### Basic Usage
```bash
# Auto-detect active session
/workflow:tdd-verify

# Specify session
/workflow:tdd-verify --session WFS-auth
```

### When to Use
- After completing all TDD tasks in a workflow
- Before merging TDD workflow branch
- For TDD process quality assessment
- To identify missing TDD steps

## TDD Compliance Report Structure

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

### Feature 2: {Feature Name}
**Status**: ⚠️ Incomplete
**Chain**: TEST-2.1 → IMPL-2.1 (Missing REFACTOR-2.1)

| Phase | Task | Status | Details |
|-------|------|--------|---------|
| Red | TEST-2.1 | ✅ Pass | Test created and failed |
| Green | IMPL-2.1 | ⚠️ Warning | Implementation seems over-engineered |
| Refactor | REFACTOR-2.1 | ❌ Missing | Task not completed |

**Issues**:
- REFACTOR-2.1 task not completed (-10 points)
- IMPL-2.1 implementation exceeded minimal scope (-10 points)

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
| src/auth/service.ts | 45-52 | Uncovered error handling | HIGH |
| src/utils/parser.ts | 78-85 | Uncovered edge case | MEDIUM |

---

## TDD Cycle Validation

### Red Phase (Write Failing Test)
- {N}/{total} features had failing tests initially ({percent}%)
- ✅ Compliant features: {list}
- ❌ Non-compliant features: {list}

**Violations**:
- Feature 3: No evidence of initial test failure (-10 points)

### Green Phase (Make Test Pass)
- {N}/{total} implementations made tests pass ({percent}%)
- ✅ Compliant features: {list}
- ❌ Non-compliant features: {list}

**Violations**:
- Feature 2: Implementation over-engineered (-10 points)

### Refactor Phase (Improve Quality)
- {N}/{total} features completed refactoring ({percent}%)
- ✅ Compliant features: {list}
- ❌ Non-compliant features: {list}

**Violations**:
- Feature 2, 4: Refactoring step skipped (-20 points total)

---

## Best Practices Assessment

### Strengths
- Clear test descriptions
- Good test coverage
- Consistent naming conventions
- Well-structured code

### Areas for Improvement
- Some implementations over-engineered in Green phase
- Missing refactoring steps
- Test failure messages could be more descriptive

---

## Detailed Findings by Severity

### Critical Issues ({count})
{List of critical issues with impact and remediation}

### High Priority Issues ({count})
{List of high priority issues with impact and remediation}

### Medium Priority Issues ({count})
{List of medium priority issues with impact and remediation}

### Low Priority Issues ({count})
{List of low priority issues with impact and remediation}

---

## Recommendations

### Required Fixes (Before Merge)
1. Complete missing REFACTOR tasks (Features 2, 4)
2. Verify initial test failures for Feature 3
3. Fix tests that broke during refactoring

### Recommended Improvements
1. Simplify over-engineered implementations
2. Add edge case tests for Features 1, 3
3. Improve test failure message clarity
4. Increase branch coverage to >85%

### Optional Enhancements
1. Add more descriptive test names
2. Consider parameterized tests for similar scenarios
3. Document TDD process learnings

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

