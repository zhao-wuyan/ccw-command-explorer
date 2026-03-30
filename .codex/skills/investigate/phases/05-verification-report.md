# Phase 5: Verification & Report

> **COMPACT PROTECTION**: This is a core execution phase. If context compression has occurred and this file is only a summary, **MUST `Read` this file again before executing any Step**. Do not execute from memory.

Run full test suite, check for regressions, and generate the structured debug report.

## Objective

- Run the full test suite to verify no regressions were introduced
- Generate a structured debug report for future reference
- Output the report to `.workflow/.debug/` directory

## Input

| Source | Required | Description |
|--------|----------|-------------|
| investigation-report (phases 1-4) | Yes | All phases populated: evidence, root cause, fix_applied |
| assign_task message | Yes | Phase 5 instruction |

## Execution Steps

### Step 1: Detect and Run Full Test Suite

Detect the project's test framework by checking for project files, then run the full suite:

| Detection file | Test command |
|---------------|-------------|
| `package.json` with `test` script | `npm test` |
| `pytest.ini` or `pyproject.toml` | `pytest` |
| `go.mod` | `go test ./...` |
| `Cargo.toml` | `cargo test` |
| `Makefile` with `test` target | `make test` |
| None detected | Try `npm test`, `pytest`, `go test ./...` sequentially |

```
Bash: mkdir -p .workflow/.debug
Bash: <detected test command>
```

Record test results:

```
test_results = {
  total: <count>,
  passed: <count>,
  failed: <count>,
  skipped: <count>,
  regression_test_passed: true|false,
  new_failures: []
}
```

---

### Step 2: Regression Check

Verify specifically:

1. The new regression test passes (check by test name from fix_applied.regression_test.test_name).
2. All tests that were passing before the fix still pass.
3. No new warnings or errors appeared in test output.

**Decision table for new failures**:

| New failure | Assessment | Action |
|-------------|-----------|--------|
| Related to fix (same module, same code path) | Fix introduced regression | Return to Phase 4 to adjust fix |
| Unrelated to fix (different module, pre-existing) | Pre-existing failure | Document in pre_existing_failures, proceed |
| Regression test itself fails | Fix is not working correctly | Return to Phase 4 |

Classify failures:

```
regression_check_result = {
  passed: true|false,
  total_tests: <count>,
  new_failures: ["<test names that newly fail>"],
  pre_existing_failures: ["<tests that were already failing>"]
}
```

---

### Step 3: Generate Structured Debug Report

Compile all investigation data into the final debug report JSON following the schema from `~/.codex/skills/investigate/specs/debug-report-format.md`:

```
debug_report = {
  "bug_description": "<concise one-sentence description of the bug>",
  "reproduction_steps": [
    "<step 1>",
    "<step 2>",
    "<step 3: observe error>"
  ],
  "root_cause": "<confirmed root cause description with technical detail and file:line reference>",
  "evidence_chain": [
    "Phase 1: <error message X observed in module Y>",
    "Phase 2: <pattern analysis found N similar occurrences>",
    "Phase 3: hypothesis H<N> confirmed — <specific condition at file:line>"
  ],
  "fix_description": "<what was changed and why>",
  "files_changed": [
    {
      "path": "<src/module/file.ts>",
      "change_type": "add|modify|remove",
      "description": "<brief description of changes to this file>"
    }
  ],
  "tests_added": [
    {
      "file": "<src/module/__tests__/file.test.ts>",
      "test_name": "<should handle null return from X>",
      "type": "regression|unit|integration"
    }
  ],
  "regression_check_result": {
    "passed": true|false,
    "total_tests": <count>,
    "new_failures": [],
    "pre_existing_failures": []
  },
  "completion_status": "DONE|DONE_WITH_CONCERNS|BLOCKED",
  "concerns": [],
  "timestamp": "<ISO-8601 timestamp>",
  "investigation_duration_phases": 5
}
```

**Field sources**:

| Field | Source Phase | Description |
|-------|-------------|-------------|
| `bug_description` | Phase 1 | User-reported symptom, one sentence |
| `reproduction_steps` | Phase 1 | Ordered steps to trigger the bug |
| `root_cause` | Phase 3 | Confirmed cause with file:line reference |
| `evidence_chain` | Phase 1-3 | Each item prefixed with "Phase N:" |
| `fix_description` | Phase 4 | What code was changed and why |
| `files_changed` | Phase 4 | Each file with change type and description |
| `tests_added` | Phase 4 | Regression tests covering the bug |
| `regression_check_result` | Phase 5 | Full test suite results |
| `completion_status` | Phase 5 | Final status per protocol |
| `concerns` | Phase 5 | Non-blocking issues (if any) |
| `timestamp` | Phase 5 | When report was generated |
| `investigation_duration_phases` | Phase 5 | Always 5 for complete investigation |

---

### Step 4: Write Report File

Compute the filename:
- `<slug>` = bug_description lowercased, non-alphanumeric characters replaced with `-`, truncated to 40 chars
- `<date>` = current date as YYYY-MM-DD

```
Bash: mkdir -p .workflow/.debug
Write: .workflow/.debug/debug-report-<date>-<slug>.json
Content: <debug_report JSON with 2-space indent>
```

---

### Step 5: Output Completion Status

Determine status and output completion block:

**Status determination**:

| Condition | Status |
|-----------|--------|
| Regression test passes, no new failures, all quality checks met | DONE |
| Fix applied but partial test coverage, minor warnings, or non-critical concerns | DONE_WITH_CONCERNS |
| New test failures introduced by fix (unresolvable), or critical concern | BLOCKED |

**DONE output**:

```
## STATUS: DONE

**Summary**: Fixed <bug_description> — root cause was <root_cause_summary>

### Details
- Phases completed: 5/5
- Root cause: <confirmed_root_cause.description>
- Fix: <fix_description>
- Regression test: <test_name> in <test_file>

### Outputs
- Debug report: .workflow/.debug/debug-report-<date>-<slug>.json
- Files changed: <list>
- Tests added: <list>
```

**DONE_WITH_CONCERNS output**:

```
## STATUS: DONE_WITH_CONCERNS

**Summary**: Fixed <bug_description> with concerns

### Details
- Phases completed: 5/5
- Concerns:
  1. <concern> — Impact: low|medium — Suggested fix: <action>

### Outputs
- Debug report: .workflow/.debug/debug-report-<date>-<slug>.json
- Files changed: <list>
- Tests added: <list>
```

---

## Output

| Artifact | Format | Description |
|----------|--------|-------------|
| `.workflow/.debug/debug-report-<date>-<slug>.json` | JSON file | Full structured investigation report |
| Completion status block | Structured text output | Final status per Completion Status Protocol |

## Success Criteria

| Criterion | Validation Method |
|-----------|-------------------|
| Full test suite executed | Test command ran and produced output |
| Regression test passes | test_results.regression_test_passed: true |
| No new failures introduced | regression_check_result.new_failures is empty (or documented as pre-existing) |
| Debug report written | File exists at `.workflow/.debug/debug-report-<date>-<slug>.json` |
| Completion status output | Status block follows protocol format |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Test framework not detected | Try common commands in order; document uncertainty in concerns |
| New failures related to fix | Return to Phase 4 to adjust; do not write report until resolved |
| New failures unrelated | Document as pre_existing_failures, set DONE_WITH_CONCERNS if impactful |
| Report directory not writable | Try alternate path `.workflow/debug/`; document in output |
| Test suite takes >5 minutes | Run regression test only; note full suite skipped in concerns |
| Regression test was not added in Phase 4 | Document as DONE_WITH_CONCERNS concern |
