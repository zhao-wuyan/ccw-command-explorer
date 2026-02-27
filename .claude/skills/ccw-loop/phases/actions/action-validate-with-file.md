# Action: Validate With File

运行测试并验证实现，记录结果到 validation.md，支持 Gemini 辅助分析测试覆盖率和质量。

## Purpose

执行测试验证流程，包括:
- 运行单元测试
- 运行集成测试
- 检查代码覆盖率
- 生成验证报告
- 分析失败原因

## Preconditions

- [ ] state.initialized === true
- [ ] state.status === 'running'
- [ ] state.develop.completed_count > 0 || state.debug.confirmed_hypothesis !== null

## Session Setup

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

const sessionFolder = `.workflow/.loop/${state.session_id}`
const validateFolder = `${sessionFolder}/validate`
const validationPath = `${validateFolder}/validation.md`
const testResultsPath = `${validateFolder}/test-results.json`
const coveragePath = `${validateFolder}/coverage.json`
```

---

## Execution

### Step 1: 运行测试

```javascript
console.log('\n运行测试...')

// 检测测试框架
const packageJson = JSON.parse(Read('package.json'))
const testScript = packageJson.scripts?.test || 'npm test'

// 运行测试并捕获输出
const testResult = await Bash({
  command: testScript,
  timeout: 300000  // 5分钟
})

// 解析测试输出
const testResults = parseTestOutput(testResult.stdout)
```

### Step 2: 检查覆盖率

```javascript
// 运行覆盖率检查
let coverageData = null

if (packageJson.scripts?.['test:coverage']) {
  const coverageResult = await Bash({
    command: 'npm run test:coverage',
    timeout: 300000
  })

  // 解析覆盖率报告
  coverageData = parseCoverageReport(coverageResult.stdout)

  Write(coveragePath, JSON.stringify(coverageData, null, 2))
}
```

### Step 3: Gemini 辅助分析

```bash
ccw cli -p "
PURPOSE: Analyze test results and coverage
Success criteria: Identify quality issues and suggest improvements

TASK:
• Analyze test execution results
• Review code coverage metrics
• Identify missing test cases
• Suggest quality improvements
• Verify requirements coverage

MODE: analysis

CONTEXT:
@${testResultsPath}
@${coveragePath}
@${sessionFolder}/develop/progress.md

EXPECTED:
- Quality assessment report
- Failed tests analysis
- Coverage gaps identification
- Improvement recommendations
- Pass/Fail decision with rationale

CONSTRAINTS: Evidence-based quality assessment
" --tool gemini --mode analysis --rule analysis-review-code-quality
```

### Step 4: 生成验证报告

```javascript
const timestamp = getUtc8ISOString()
const iteration = (state.validate.test_results?.length || 0) + 1

const validationReport = `# Validation Report

**Session ID**: ${state.session_id}
**Task**: ${state.task_description}
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
| **Pass Rate** | **${(testResults.passed / testResults.total * 100).toFixed(1)}%** |

### Coverage Report

${coverageData ? `
| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
${coverageData.files.map(f => `| ${f.path} | ${f.statements}% | ${f.branches}% | ${f.functions}% | ${f.lines}% |`).join('\n')}

**Overall Coverage**: ${coverageData.overall.statements}%
` : '_No coverage data available_'}

### Failed Tests

${testResults.failed > 0 ? `
${testResults.failures.map(f => `
#### ${f.test_name}

- **Suite**: ${f.suite}
- **Error**: ${f.error_message}
- **Stack**:
\`\`\`
${f.stack_trace}
\`\`\`
`).join('\n')}
` : '_All tests passed_'}

### Gemini Quality Analysis

${geminiAnalysis}

### Recommendations

${recommendations.map(r => `- ${r}`).join('\n')}

---

## Validation Decision

**Result**: ${testResults.passed === testResults.total ? '✅ PASS' : '❌ FAIL'}

**Rationale**: ${validationDecision}

${testResults.passed !== testResults.total ? `
### Next Actions

1. Review failed tests
2. Debug failures using action-debug-with-file
3. Fix issues and re-run validation
` : `
### Next Actions

1. Consider code review
2. Prepare for deployment
3. Update documentation
`}
`

// 写入验证报告
Write(validationPath, validationReport)
```

### Step 5: 保存测试结果

```javascript
const testResultsData = {
  iteration,
  timestamp,
  summary: {
    total: testResults.total,
    passed: testResults.passed,
    failed: testResults.failed,
    skipped: testResults.skipped,
    pass_rate: (testResults.passed / testResults.total * 100).toFixed(1),
    duration_ms: testResults.duration_ms
  },
  tests: testResults.tests,
  failures: testResults.failures,
  coverage: coverageData?.overall || null
}

Write(testResultsPath, JSON.stringify(testResultsData, null, 2))
```

---

## State Updates

```javascript
const validationPassed = testResults.failed === 0 && testResults.passed > 0

return {
  stateUpdates: {
    validate: {
      test_results: [...(state.validate.test_results || []), testResultsData],
      coverage: coverageData?.overall.statements || null,
      passed: validationPassed,
      failed_tests: testResults.failures.map(f => f.test_name),
      last_run_at: getUtc8ISOString()
    },
    last_action: 'action-validate-with-file'
  },
  continue: true,
  message: validationPassed
    ? `验证通过 ✅\n测试: ${testResults.passed}/${testResults.total}\n覆盖率: ${coverageData?.overall.statements || 'N/A'}%`
    : `验证失败 ❌\n失败: ${testResults.failed}/${testResults.total}\n建议进入调试模式`
}
```

## Test Output Parsers

### Jest/Vitest Parser

```javascript
function parseJestOutput(stdout) {
  const testPattern = /Tests:\s+(\d+) passed.*?(\d+) failed.*?(\d+) total/
  const match = stdout.match(testPattern)

  return {
    total: parseInt(match[3]),
    passed: parseInt(match[1]),
    failed: parseInt(match[2]),
    // ... parse individual test results
  }
}
```

### Pytest Parser

```javascript
function parsePytestOutput(stdout) {
  const summaryPattern = /(\d+) passed.*?(\d+) failed.*?(\d+) error/
  // ... implementation
}
```

## Error Handling

| Error Type | Recovery |
|------------|----------|
| Tests don't run | 检查测试脚本配置，提示用户 |
| All tests fail | 建议进入 debug 模式 |
| Coverage tool missing | 跳过覆盖率检查，仅运行测试 |
| Timeout | 增加超时时间或拆分测试 |

## Validation Report Template

参考 [templates/validation-template.md](../../templates/validation-template.md)

## CLI Integration

### 质量分析
```bash
ccw cli -p "PURPOSE: Analyze test results and coverage...
TASK: • Review results • Identify gaps • Suggest improvements
MODE: analysis
CONTEXT: @test-results.json @coverage.json
EXPECTED: Quality assessment
" --tool gemini --mode analysis --rule analysis-review-code-quality
```

### 测试生成 (如覆盖率低)
```bash
ccw cli -p "PURPOSE: Generate missing test cases...
TASK: • Analyze uncovered code • Write tests
MODE: write
CONTEXT: @coverage.json @src/**/*
EXPECTED: Test code
" --tool gemini --mode write --rule development-generate-tests
```

## Next Actions (Hints)

- 验证通过: `action-complete` (完成循环)
- 验证失败: `action-debug-with-file` (调试失败测试)
- 覆盖率低: `action-develop-with-file` (添加测试)
- 用户选择: `action-menu` (返回菜单)
