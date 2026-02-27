# Worker: Validate (CCW Loop-B)

Execute validation: tests, coverage analysis, quality gates.

## Responsibilities

1. **Test execution**
   - Run unit tests
   - Run integration tests
   - Check test results

2. **Coverage analysis**
   - Measure coverage
   - Identify gaps
   - Suggest improvements

3. **Quality checks**
   - Lint/format check
   - Type checking
   - Security scanning

4. **Results reporting**
   - Document test results
   - Flag failures
   - Suggest improvements

## Input

```
LOOP CONTEXT:
- Files to validate
- Test configuration
- Coverage requirements

PROJECT CONTEXT:
- Tech stack
- Test framework
- CI/CD config
```

## Execution Steps

1. **Prepare environment**
   - Identify test framework
   - Check test configuration
   - Build if needed

2. **Run tests**
   - Execute unit tests
   - Execute integration tests
   - Capture results

3. **Analyze results**
   - Count passed/failed
   - Measure coverage
   - Identify failure patterns

4. **Quality assessment**
   - Check lint results
   - Verify type safety
   - Review security checks

5. **Generate report**
   - Document findings
   - Suggest fixes for failures
   - Output recommendations

## Output Format

```
WORKER_RESULT:
- action: validate
- status: success | failed | needs_fix
- summary: "98 tests passed, 2 failed; coverage 85%"
- files_changed: []
- next_suggestion: develop (fix failures) | complete (all pass) | debug (investigate)
- loop_back_to: null

TEST_RESULTS:
  unit_tests:
    passed: 98
    failed: 2
    skipped: 0
    duration: "12.5s"
  
  integration_tests:
    passed: 15
    failed: 0
    duration: "8.2s"
  
  coverage:
    overall: "85%"
    lines: "88%"
    branches: "82%"
    functions: "90%"
    statements: "87%"

FAILURES:
  1. Test: "auth.login should reject invalid password"
     Error: "Assertion failed: expected false to equal true"
     Location: "tests/auth.test.ts:45"
     Suggested fix: "Check password validation logic in src/auth.ts"
  
  2. Test: "utils.formatDate should handle timezones"
     Error: "Expected 2026-01-22T10:00 but got 2026-01-22T09:00"
     Location: "tests/utils.test.ts:120"
     Suggested fix: "Timezone conversion in formatDate needs UTC adjustment"

COVERAGE_GAPS:
  - src/auth.ts (line 45-52): Error handling not covered
  - src/utils.ts (line 100-105): Edge case handling missing

QUALITY_CHECKS:
  lint: ✓ Passed (0 errors)
  types: ✓ Passed (no type errors)
  security: ✓ Passed (0 vulnerabilities)
```

## Progress File Template

```markdown
# Validate Progress - {timestamp}

## Test Execution Summary

### Unit Tests ✓
- **98 passed**, 2 failed, 0 skipped
- **Duration**: 12.5s
- **Status**: Needs fix

### Integration Tests ✓
- **15 passed**, 0 failed
- **Duration**: 8.2s
- **Status**: All pass

## Coverage Report

```
Statements   : 87% ( 130/150 )
Branches     : 82% ( 41/50 )
Functions    : 90% ( 45/50 )
Lines        : 88% ( 132/150 )
```

**Coverage Gaps**:
- `src/auth.ts` (lines 45-52): Error handling
- `src/utils.ts` (lines 100-105): Edge cases

## Test Failures

### Failure 1: auth.login should reject invalid password
- **Error**: Assertion failed
- **File**: `tests/auth.test.ts:45`
- **Root cause**: Password validation not working
- **Fix**: Check SHA256 hashing in `src/auth.ts:102`

### Failure 2: utils.formatDate should handle timezones
- **Error**: Expected 2026-01-22T10:00 but got 2026-01-22T09:00
- **File**: `tests/utils.test.ts:120`
- **Root cause**: UTC offset not applied correctly
- **Fix**: Update timezone calculation in `formatDate()`

## Quality Checks

| Check | Result | Status |
|-------|--------|--------|
| ESLint | 0 errors | ✓ Pass |
| TypeScript | No errors | ✓ Pass |
| Security Audit | 0 vulnerabilities | ✓ Pass |

## Recommendations

1. **Fix test failures** (2 tests failing)
2. **Improve coverage** for error handling paths
3. **Add integration tests** for critical flows
```

## Rules

- **Run all tests**: Don't skip or filter
- **Be thorough**: Check coverage and quality metrics
- **Document failures**: Provide actionable suggestions
- **Test environment**: Use consistent configuration
- **No workarounds**: Fix real issues, don't skip tests
- **Verify fixes**: Re-run after changes
- **Clean reports**: Output clear, actionable results

## Error Handling

| Situation | Action |
|-----------|--------|
| Test framework not found | Identify from package.json, install if needed |
| Tests fail | Document failures, suggest fixes |
| Coverage below threshold | Flag coverage gaps, suggest tests |
| Build failure | Trace to source, suggest debugging |

## Best Practices

1. Run complete test suite
2. Measure coverage thoroughly
3. Document all failures clearly
4. Provide specific fix suggestions
5. Check quality metrics
6. Suggest follow-up validation steps
