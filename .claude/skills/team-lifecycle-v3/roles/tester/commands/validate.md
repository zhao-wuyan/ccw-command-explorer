# Command: validate

## Purpose

Test-fix cycle with strategy engine: detect framework, run tests, classify failures, select fix strategy, iterate until pass rate target is met or max iterations exhausted.

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| MAX_ITERATIONS | 10 | Maximum test-fix cycle attempts |
| PASS_RATE_TARGET | 95% | Minimum pass rate to succeed |
| AFFECTED_TESTS_FIRST | true | Run affected tests before full suite |

## Phase 2: Context Loading

Load from task description and executor output:

| Input | Source | Required |
|-------|--------|----------|
| Framework | Auto-detected (see below) | Yes |
| Modified files | Executor task output / git diff | Yes |
| Affected tests | Derived from modified files | No |
| Session folder | Task description `Session:` field | Yes |
| Wisdom | `<session_folder>/wisdom/` | No |

**Framework detection** (priority order):

| Priority | Method | Check |
|----------|--------|-------|
| 1 | package.json devDependencies | vitest, jest, mocha, pytest |
| 2 | package.json scripts.test | Command contains framework name |
| 3 | Config file existence | vitest.config.*, jest.config.*, pytest.ini |

**Affected test discovery** from modified files:
- For each modified file `<name>.<ext>`, search:
  `<name>.test.ts`, `<name>.spec.ts`, `tests/<name>.test.ts`, `__tests__/<name>.test.ts`

## Phase 3: Test-Fix Cycle

### Test Command Table

| Framework | Affected Tests | Full Suite |
|-----------|---------------|------------|
| vitest | `vitest run <files> --reporter=verbose` | `vitest run --reporter=verbose` |
| jest | `jest <files> --no-coverage --verbose` | `jest --no-coverage --verbose` |
| mocha | `mocha <files> --reporter spec` | `mocha --reporter spec` |
| pytest | `pytest <files> -v --tb=short` | `pytest -v --tb=short` |

### Iteration Flow

```
Iteration 1
  ├─ Run affected tests (or full suite if none)
  ├─ Parse results → pass rate
  ├─ Pass rate >= 95%?
  │   ├─ YES + affected-only → run full suite to confirm
  │   │   ├─ Full suite passes → SUCCESS
  │   │   └─ Full suite fails → continue with full results
  │   └─ YES + full suite → SUCCESS
  └─ NO → classify failures → select strategy → apply fixes

Iteration 2..10
  ├─ Re-run tests
  ├─ Track best pass rate across iterations
  ├─ Pass rate >= 95% → SUCCESS
  ├─ No failures to fix → STOP (anomaly)
  └─ Failures remain → classify → select strategy → apply fixes

After iteration 10
  └─ FAIL: max iterations reached, report best pass rate
```

**Progress update**: When iteration > 5, send progress to coordinator with current pass rate and iteration count.

### Strategy Selection Matrix

| Condition | Strategy | Behavior |
|-----------|----------|----------|
| Iteration <= 3 OR pass rate >= 80% | Conservative | Fix one failure at a time, highest severity first |
| Critical failures exist AND count < 5 | Surgical | Identify common error pattern, fix all matching occurrences |
| Pass rate < 50% OR iteration > 7 | Aggressive | Fix all critical + high failures in batch |
| Default (no other match) | Conservative | Safe fallback |

### Failure Classification Table

| Severity | Error Patterns |
|----------|---------------|
| Critical | SyntaxError, cannot find module, is not defined |
| High | Assertion mismatch (expected/received), toBe/toEqual failures |
| Medium | Timeout, async errors |
| Low | Warnings, deprecation notices |

### Fix Approach by Error Type

| Error Type | Pattern | Fix Approach |
|------------|---------|-------------|
| missing_import | "Cannot find module '<module>'" | Add import statement, resolve relative path from modified files |
| undefined_variable | "<name> is not defined" | Check source for renamed/moved exports, update reference |
| assertion_mismatch | "Expected: X, Received: Y" | Read test file at failure line, update expected value if behavior change is intentional |
| timeout | "Timeout" | Increase timeout or add async/await |
| syntax_error | "SyntaxError" | Read source at error line, fix syntax |

### Tool Call Example

Run tests with framework-appropriate command:

```bash
Bash(command="vitest run src/utils/__tests__/parser.test.ts --reporter=verbose", timeout=120000)
```

Read test file to analyze failure:

```bash
Read(file_path="<test_file_path>")
```

Apply fix via Edit:

```bash
Edit(file_path="<file>", old_string="<old>", new_string="<new>")
```

## Phase 4: Validation

### Success Criteria

| Check | Criteria | Required |
|-------|----------|----------|
| Pass rate | >= 95% | Yes |
| Full suite run | At least one full suite pass | Yes |
| No critical failures | Zero critical-severity failures remaining | Yes |
| Best pass rate tracked | Reported in final result | Yes |

### Result Routing

| Outcome | Message Type | Content |
|---------|-------------|---------|
| Pass rate >= target | test_result | Success, iterations count, full suite confirmed |
| Max iterations, pass rate < target | fix_required | Best pass rate, remaining failures, iteration count |
| No tests found | error | Framework detected but no test files |
| Framework not detected | error | Detection methods exhausted |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Framework not detected | Report error to coordinator, list detection attempts |
| No test files found | Report to coordinator, suggest manual test path |
| Test command fails (exit code != 0/1) | Check stderr for environment issues, retry once |
| Fix application fails | Skip fix, try next iteration with different strategy |
| Infinite loop (same failures repeat) | Abort after 3 identical result sets |
