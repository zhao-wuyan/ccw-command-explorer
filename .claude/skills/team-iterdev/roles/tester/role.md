---
role: tester
prefix: VERIFY
inner_loop: false
message_types:
  success: verify_passed
  failure: verify_failed
  fix: fix_required
  error: error
---

# Tester

Test validator. Test execution, fix cycles, and regression detection.

## Phase 2: Environment Detection

| Input | Source | Required |
|-------|--------|----------|
| Task description | From task subject/description | Yes |
| Session path | Extracted from task description | Yes |
| .msg/meta.json | <session>/.msg/meta.json | Yes |
| Changed files | Git diff | Yes |

1. Extract session path from task description
2. Read .msg/meta.json for shared context
3. Get changed files via git diff
4. Detect test framework and command:

| Detection | Method |
|-----------|--------|
| Test command | Check package.json scripts, pytest.ini, Makefile |
| Coverage tool | Check for nyc, coverage.py, jest --coverage config |

Common commands: npm test, pytest, go test ./..., cargo test

## Phase 3: Execution + Fix Cycle

**Iterative test-fix cycle** (max 5 iterations):

| Step | Action |
|------|--------|
| 1 | Run test command |
| 2 | Parse results, check pass rate |
| 3 | Pass rate >= 95% -> exit loop (success) |
| 4 | Extract failing test details |
| 5 | Apply fix using CLI tool |
| 6 | Increment iteration counter |
| 7 | iteration >= MAX (5) -> exit loop (report failures) |
| 8 | Go to Step 1 |

**Fix delegation**: Use CLI tool to fix failing tests:

```bash
ccw cli -p "PURPOSE: Fix failing tests; success = all listed tests pass
TASK: • Analyze test failure output • Identify root cause in changed files • Apply minimal fix
MODE: write
CONTEXT: @<changed-files> | Memory: Test output from current iteration
EXPECTED: Code fixes that make failing tests pass without breaking other tests
CONSTRAINTS: Only modify files in changed list | Minimal changes
Test output: <test-failure-details>
Changed files: <file-list>" --tool gemini --mode write --rule development-debug-runtime-issues
```

Wait for CLI completion before re-running tests.

## Phase 4: Regression Check + Report

1. Run full test suite for regression: `<test-command> --all`

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Regression | Run full test suite | No FAIL in output |
| Coverage | Run coverage tool | >= 80% (if configured) |

2. Write verification results to `<session>/verify/verify-<num>.json`:
   - verify_id, pass_rate, iterations, passed, timestamp, regression_passed

3. Determine message type:

| Condition | Message Type |
|-----------|--------------|
| passRate >= 0.95 | verify_passed |
| passRate < 0.95 && iterations >= MAX | fix_required |
| passRate < 0.95 | verify_failed |

4. Update .msg/meta.json with test_patterns entry
5. Write discoveries to wisdom/issues.md
