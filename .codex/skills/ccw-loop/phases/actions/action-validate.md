# Action: VALIDATE

Run tests and verify implementation, record results to validate.md.

## Purpose

- Run unit tests
- Run integration tests
- Check code coverage
- Generate validation report
- Determine pass/fail status

## Preconditions

- [ ] state.status === 'running'
- [ ] state.skill_state !== null
- [ ] (develop.completed > 0) OR (debug.confirmed_hypothesis !== null)

## Execution Steps

### Step 1: Verify Control Signals

```javascript
const state = JSON.parse(Read(`.workflow/.loop/${loopId}.json`))

if (state.status !== 'running') {
  return {
    action: 'VALIDATE',
    status: 'failed',
    message: `Cannot validate: status is ${state.status}`,
    next_action: state.status === 'paused' ? 'PAUSED' : 'STOPPED'
  }
}
```

### Step 2: Detect Test Framework

```javascript
const packageJson = JSON.parse(Read('package.json') || '{}')
const testScript = packageJson.scripts?.test || 'npm test'
const coverageScript = packageJson.scripts?.['test:coverage']
```

### Step 3: Run Tests

```javascript
const testResult = await Bash({
  command: testScript,
  timeout: 300000  // 5 minutes
})

// Parse test output based on framework
const testResults = parseTestOutput(testResult.stdout, testResult.stderr)
```

### Step 4: Run Coverage (if available)

```javascript
let coverageData = null

if (coverageScript) {
  const coverageResult = await Bash({
    command: coverageScript,
    timeout: 300000
  })

  coverageData = parseCoverageReport(coverageResult.stdout)
  Write(`${progressDir}/coverage.json`, JSON.stringify(coverageData, null, 2))
}
```

### Step 5: Generate Validation Report

```javascript
const timestamp = getUtc8ISOString()
const iteration = (state.skill_state.validate.test_results?.length || 0) + 1

const validationReport = `# Validation Report

**Loop ID**: ${loopId}
**Task**: ${state.description}
**Validated**: ${timestamp}

---

## Iteration ${iteration} - Validation Run

### Test Execution Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${testResults.total} |
| Passed | ${testResults.passed} |
| Failed | ${testResults.failed} |
| Skipped | ${testResults.skipped} |
| Duration | ${testResults.duration_ms}ms |
| **Pass Rate** | **${((testResults.passed / testResults.total) * 100).toFixed(1)}%** |

### Coverage Report

${coverageData ? `
| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
${coverageData.files.map(f => `| ${f.path} | ${f.statements}% | ${f.branches}% | ${f.functions}% | ${f.lines}% |`).join('\n')}

**Overall Coverage**: ${coverageData.overall.statements}%
` : '_No coverage data available_'}

### Failed Tests

${testResults.failed > 0 ? testResults.failures.map(f => `
#### ${f.test_name}

- **Suite**: ${f.suite}
- **Error**: ${f.error_message}
`).join('\n') : '_All tests passed_'}

---

## Validation Decision

**Result**: ${testResults.failed === 0 ? 'PASS' : 'FAIL'}

${testResults.failed > 0 ? `
### Next Actions

1. Review failed tests
2. Debug failures using DEBUG action
3. Fix issues and re-run validation
` : `
### Next Actions

1. Consider code review
2. Complete loop
`}
`

Write(`${progressDir}/validate.md`, validationReport)
```

### Step 6: Save Test Results

```javascript
const testResultsData = {
  iteration,
  timestamp,
  summary: {
    total: testResults.total,
    passed: testResults.passed,
    failed: testResults.failed,
    skipped: testResults.skipped,
    pass_rate: ((testResults.passed / testResults.total) * 100).toFixed(1),
    duration_ms: testResults.duration_ms
  },
  tests: testResults.tests,
  failures: testResults.failures,
  coverage: coverageData?.overall || null
}

Write(`${progressDir}/test-results.json`, JSON.stringify(testResultsData, null, 2))
```

### Step 7: Update State

```javascript
const validationPassed = testResults.failed === 0 && testResults.passed > 0

state.skill_state.validate.test_results.push(testResultsData)
state.skill_state.validate.pass_rate = parseFloat(testResultsData.summary.pass_rate)
state.skill_state.validate.coverage = coverageData?.overall?.statements || 0
state.skill_state.validate.passed = validationPassed
state.skill_state.validate.failed_tests = testResults.failures.map(f => f.test_name)
state.skill_state.validate.last_run_at = timestamp

state.skill_state.last_action = 'VALIDATE'
state.updated_at = timestamp
Write(`.workflow/.loop/${loopId}.json`, JSON.stringify(state, null, 2))
```

## Output Format

```
ACTION_RESULT:
- action: VALIDATE
- status: success
- message: Validation {PASSED | FAILED} - {pass_count}/{total_count} tests passed
- state_updates: {
    "validate.passed": {true | false},
    "validate.pass_rate": {N},
    "validate.failed_tests": [{list}]
  }

FILES_UPDATED:
- .workflow/.loop/{loopId}.progress/validate.md: Validation report created
- .workflow/.loop/{loopId}.progress/test-results.json: Test results saved
- .workflow/.loop/{loopId}.progress/coverage.json: Coverage data saved (if available)

NEXT_ACTION_NEEDED: {COMPLETE | DEBUG | DEVELOP | MENU}
```

## Next Action Selection

```javascript
if (validationPassed) {
  const pendingTasks = state.skill_state.develop.tasks.filter(t => t.status === 'pending')
  if (pendingTasks.length === 0) {
    return 'COMPLETE'
  } else {
    return 'DEVELOP'
  }
} else {
  // Tests failed - need debugging
  return 'DEBUG'
}
```

## Test Output Parsers

### Jest/Vitest Parser

```javascript
function parseJestOutput(stdout) {
  const summaryMatch = stdout.match(/Tests:\s+(\d+)\s+passed.*?(\d+)\s+failed.*?(\d+)\s+total/)
  // ... implementation
}
```

### Pytest Parser

```javascript
function parsePytestOutput(stdout) {
  const summaryMatch = stdout.match(/(\d+)\s+passed.*?(\d+)\s+failed/)
  // ... implementation
}
```

## Error Handling

| Error Type | Recovery |
|------------|----------|
| Tests don't run | Check test script config, report error |
| All tests fail | Suggest DEBUG action |
| Coverage tool missing | Skip coverage, run tests only |
| Timeout | Increase timeout or split tests |

## Next Actions

- Validation passed, no pending: `COMPLETE`
- Validation passed, has pending: `DEVELOP`
- Validation failed: `DEBUG`
