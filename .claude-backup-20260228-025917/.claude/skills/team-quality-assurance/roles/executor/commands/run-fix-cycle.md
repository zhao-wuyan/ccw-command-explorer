# Command: run-fix-cycle

> 迭代测试执行与自动修复。运行测试套件，解析结果，失败时委派 code-developer 修复，最多迭代 5 次。

## When to Use

- Phase 3 of Executor
- 测试代码已生成，需要执行并验证
- GC 循环中重新执行修复后的测试

**Trigger conditions**:
- QARUN-* 任务进入执行阶段
- Generator 报告测试生成完成
- GC 循环中 coordinator 创建的重新执行任务

## Strategy

### Delegation Mode

**Mode**: Sequential Delegation（修复时）/ Direct（执行时）
**Agent Type**: `code-developer`（仅用于修复）
**Max Iterations**: 5

### Decision Logic

```javascript
// 每次迭代的决策
function shouldContinue(iteration, passRate, testsFailed) {
  if (iteration >= MAX_ITERATIONS) return false
  if (testsFailed === 0) return false  // 全部通过
  if (passRate >= 95 && iteration >= 2) return false  // 足够好
  return true
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
// 检测测试框架和命令
const strategy = sharedMemory.test_strategy || {}
const framework = strategy.test_framework || 'vitest'
const targetLayer = task.description.match(/layer:\s*(L[123])/)?.[1] || 'L1'

// 构建测试命令
function buildTestCommand(framework, layer) {
  const layerFilter = {
    'L1': 'unit',
    'L2': 'integration',
    'L3': 'e2e'
  }

  const commands = {
    'vitest': `npx vitest run --coverage --reporter=json --outputFile=test-results.json`,
    'jest': `npx jest --coverage --json --outputFile=test-results.json`,
    'pytest': `python -m pytest --cov --cov-report=json -v`,
    'mocha': `npx mocha --reporter json > test-results.json`
  }

  let cmd = commands[framework] || 'npm test -- --coverage'

  // 添加层级过滤（如果测试文件按目录组织）
  const filter = layerFilter[layer]
  if (filter && framework === 'vitest') {
    cmd += ` --testPathPattern="${filter}"`
  }

  return cmd
}

const testCommand = buildTestCommand(framework, targetLayer)

// 获取关联的测试文件
const generatedTests = sharedMemory.generated_tests?.[targetLayer]?.files || []
```

### Step 2: Execute Strategy

```javascript
let iteration = 0
const MAX_ITERATIONS = 5
let lastOutput = ''
let passRate = 0
let coverage = 0
let testsPassed = 0
let testsFailed = 0

while (iteration < MAX_ITERATIONS) {
  // ===== EXECUTE TESTS =====
  lastOutput = Bash(`${testCommand} 2>&1 || true`)

  // ===== PARSE RESULTS =====
  // 解析通过/失败数
  const passedMatch = lastOutput.match(/(\d+)\s*(?:passed|passing)/)
  const failedMatch = lastOutput.match(/(\d+)\s*(?:failed|failing)/)
  testsPassed = passedMatch ? parseInt(passedMatch[1]) : 0
  testsFailed = failedMatch ? parseInt(failedMatch[1]) : 0
  const testsTotal = testsPassed + testsFailed

  passRate = testsTotal > 0 ? Math.round(testsPassed / testsTotal * 100) : 0

  // 解析覆盖率
  try {
    const coverageJson = JSON.parse(Read('coverage/coverage-summary.json'))
    coverage = coverageJson.total?.lines?.pct || 0
  } catch {
    // 尝试从输出解析
    const covMatch = lastOutput.match(/(?:Lines|Stmts|All files)\s*[:|]\s*(\d+\.?\d*)%/)
    coverage = covMatch ? parseFloat(covMatch[1]) : 0
  }

  // ===== CHECK PASS =====
  if (testsFailed === 0) {
    break  // 全部通过
  }

  // ===== SHOULD CONTINUE? =====
  if (!shouldContinue(iteration + 1, passRate, testsFailed)) {
    break
  }

  // ===== AUTO-FIX =====
  iteration++

  // 提取失败详情
  const failureLines = lastOutput.split('\n')
    .filter(l => /FAIL|Error|AssertionError|Expected|Received|TypeError|ReferenceError/.test(l))
    .slice(0, 30)
    .join('\n')

  // 委派修复给 code-developer
  Task({
    subagent_type: "code-developer",
    run_in_background: false,
    description: `Fix ${testsFailed} test failures (iteration ${iteration}/${MAX_ITERATIONS})`,
    prompt: `## Goal
Fix failing tests. ONLY modify test files, NEVER modify source code.

## Test Output
\`\`\`
${failureLines}
\`\`\`

## Test Files to Fix
${generatedTests.map(f => `- ${f}`).join('\n')}

## Rules
- Read each failing test file before modifying
- Fix: incorrect assertions, missing imports, wrong mocks, setup issues
- Do NOT: skip tests, add \`@ts-ignore\`, use \`as any\`, modify source code
- Keep existing test structure and naming
- If a test is fundamentally wrong about expected behavior, fix the assertion to match actual source behavior`
  })
}
```

### Step 3: Result Processing

```javascript
const resultData = {
  layer: targetLayer,
  framework: framework,
  iterations: iteration,
  pass_rate: passRate,
  coverage: coverage,
  tests_passed: testsPassed,
  tests_failed: testsFailed,
  all_passed: testsFailed === 0,
  max_iterations_reached: iteration >= MAX_ITERATIONS
}

// 保存执行结果
Bash(`mkdir -p "${sessionFolder}/results"`)
Write(`${sessionFolder}/results/run-${targetLayer}.json`, JSON.stringify(resultData, null, 2))

// 保存最后一次测试输出（截取关键部分）
const outputSummary = lastOutput.split('\n').slice(-30).join('\n')
Write(`${sessionFolder}/results/output-${targetLayer}.txt`, outputSummary)

// 更新 shared memory
sharedMemory.execution_results = sharedMemory.execution_results || {}
sharedMemory.execution_results[targetLayer] = resultData
sharedMemory.execution_results.pass_rate = passRate
sharedMemory.execution_results.coverage = coverage
Write(`${sessionFolder}/shared-memory.json`, JSON.stringify(sharedMemory, null, 2))
```

## Output Format

```
## Test Execution Results

### Layer: [L1|L2|L3]
### Framework: [vitest|jest|pytest]
### Status: [PASS|FAIL]

### Results
- Tests passed: [count]
- Tests failed: [count]
- Pass rate: [percent]%
- Coverage: [percent]%
- Fix iterations: [count]/[max]

### Failure Details (if any)
- [test name]: [error description]
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Test command not found | Try fallback: npm test → npx vitest → npx jest → pytest |
| Test environment broken | Report error to coordinator, suggest manual fix |
| Max iterations reached with failures | Report current state, let coordinator decide (GC loop or accept) |
| Coverage data unavailable | Report 0%, note coverage collection failure |
| Sub-agent fix introduces new failures | Revert last fix, try different approach |
| No test files to run | Report empty, notify coordinator |
| Agent/CLI failure | Retry once, then fallback to inline execution |
| Timeout (>5 min) | Report partial results, notify coordinator |
