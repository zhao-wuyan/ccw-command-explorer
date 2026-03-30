# Phase 5: Verification & Report

Run full test suite, check for regressions, and generate the structured debug report.

## Objective

- Run the full test suite to verify no regressions were introduced
- Generate a structured debug report for future reference
- Output the report to `.workflow/.debug/` directory

## Execution Steps

### Step 1: Run Full Test Suite

```bash
# Detect and run the project's test framework
# npm test / pytest / go test / cargo test / etc.
```

Record results:

```json
{
  "test_results": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "regression_test_passed": true,
    "new_failures": []
  }
}
```

**If new failures are found**:
- Check if the failures are related to the fix
- If related: the fix introduced a regression — return to Phase 4 to adjust
- If unrelated: document as pre-existing failures, proceed with report

### Step 2: Regression Check

Verify specifically:
1. The new regression test passes
2. All tests that passed before the fix still pass
3. No new warnings or errors in test output

### Step 3: Generate Structured Debug Report

Create the report following the schema in [specs/debug-report-format.md](../specs/debug-report-format.md):

```bash
mkdir -p .workflow/.debug
```

```json
{
  "bug_description": "concise description of the bug",
  "reproduction_steps": [
    "step 1",
    "step 2",
    "step 3: observe error"
  ],
  "root_cause": "confirmed root cause description with technical detail",
  "evidence_chain": [
    "Phase 1: error message X observed in module Y",
    "Phase 2: pattern analysis found N similar occurrences",
    "Phase 3: hypothesis H1 confirmed — specific condition at file:line"
  ],
  "fix_description": "what was changed and why",
  "files_changed": [
    {
      "path": "src/module/file.ts",
      "change_type": "modify",
      "description": "added null check before property access"
    }
  ],
  "tests_added": [
    {
      "file": "src/module/__tests__/file.test.ts",
      "test_name": "should handle null return from X",
      "type": "regression"
    }
  ],
  "regression_check_result": {
    "passed": true,
    "total_tests": 0,
    "new_failures": [],
    "pre_existing_failures": []
  },
  "completion_status": "DONE|DONE_WITH_CONCERNS|BLOCKED",
  "concerns": [],
  "timestamp": "ISO-8601",
  "investigation_duration_phases": 5
}
```

### Step 4: Write Report File

```javascript
const slug = bugDescription.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40)
const dateStr = new Date().toISOString().substring(0, 10)
const reportPath = `.workflow/.debug/debug-report-${dateStr}-${slug}.json`

Write({ file_path: reportPath, content: JSON.stringify(report, null, 2) })
```

### Step 5: Output Completion Status

Follow the Completion Status Protocol from `_shared/SKILL-DESIGN-SPEC.md` section 13:

**DONE**:
```
## STATUS: DONE

**Summary**: Fixed {bug_description} — root cause was {root_cause_summary}

### Details
- Phases completed: 5/5
- Root cause: {confirmed_root_cause}
- Fix: {fix_description}
- Regression test: {test_name} in {test_file}

### Outputs
- Debug report: {reportPath}
- Files changed: {list}
- Tests added: {list}
```

**DONE_WITH_CONCERNS**:
```
## STATUS: DONE_WITH_CONCERNS

**Summary**: Fixed {bug_description} with concerns

### Details
- Phases completed: 5/5
- Concerns:
  1. {concern} — Impact: {low|medium} — Suggested fix: {action}
```

## Output

- **File**: `debug-report-{YYYY-MM-DD}-{slug}.json`
- **Location**: `.workflow/.debug/`
- **Format**: JSON (see [specs/debug-report-format.md](../specs/debug-report-format.md))

## Quality Checks

- [ ] Full test suite executed
- [ ] Regression test specifically verified
- [ ] No new test failures introduced (or documented if pre-existing)
- [ ] Debug report written to `.workflow/.debug/`
- [ ] Completion status output follows protocol
