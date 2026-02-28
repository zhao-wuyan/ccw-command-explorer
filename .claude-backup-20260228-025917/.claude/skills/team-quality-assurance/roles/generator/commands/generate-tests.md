# Command: generate-tests

> 按层级生成测试代码。根据 strategist 策略和项目现有测试模式，生成 L1/L2/L3 测试用例。

## When to Use

- Phase 3 of Generator
- 策略已制定，需要生成对应层级的测试代码
- GC 循环中修订失败的测试

**Trigger conditions**:
- QAGEN-* 任务进入执行阶段
- 测试策略中包含当前层级
- GC 循环触发修复任务（QAGEN-fix-*）

## Strategy

### Delegation Mode

**Mode**: Sequential Delegation（复杂时）/ Direct（简单时）
**Agent Type**: `code-developer`
**Delegation Scope**: Per-layer

### Decision Logic

```javascript
const focusFiles = layerConfig.focus_files || []
const isGCFix = task.subject.includes('fix')

if (isGCFix) {
  // GC 修复模式：读取失败信息，针对性修复
  mode = 'gc-fix'
} else if (focusFiles.length <= 3) {
  // 直接生成：内联 Read → 分析 → Write
  mode = 'direct'
} else {
  // 委派给 code-developer
  mode = 'delegate'
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
// 从 shared memory 获取策略
const strategy = sharedMemory.test_strategy || {}
const targetLayer = task.description.match(/layer:\s*(L[123])/)?.[1] || 'L1'

// 确定层级配置
const layerConfig = strategy.layers?.find(l => l.level === targetLayer) || {
  level: targetLayer,
  name: targetLayer === 'L1' ? 'Unit Tests' : targetLayer === 'L2' ? 'Integration Tests' : 'E2E Tests',
  target_coverage: targetLayer === 'L1' ? 80 : targetLayer === 'L2' ? 60 : 40,
  focus_files: []
}

// 学习现有测试模式（必须找 3 个相似测试文件）
const existingTests = Glob(`**/*.{test,spec}.{ts,tsx,js,jsx}`)
const testPatterns = existingTests.slice(0, 3).map(f => ({
  path: f,
  content: Read(f)
}))

// 检测测试约定
const testConventions = detectTestConventions(testPatterns)
```

### Step 2: Execute Strategy

```javascript
if (mode === 'gc-fix') {
  // GC 修复模式
  // 读取失败信息
  const failedTests = sharedMemory.execution_results?.[targetLayer]
  const failureOutput = Read(`${sessionFolder}/results/run-${targetLayer}.json`)

  Task({
    subagent_type: "code-developer",
    run_in_background: false,
    description: `Fix failing ${targetLayer} tests (GC iteration)`,
    prompt: `## Goal
Fix the failing tests based on execution results. Do NOT modify source code.

## Test Execution Results
${JSON.stringify(failedTests, null, 2)}

## Test Conventions
${JSON.stringify(testConventions, null, 2)}

## Instructions
- Read each failing test file
- Fix assertions, imports, mocks, or test setup
- Ensure tests match actual source behavior
- Do NOT skip or ignore tests
- Do NOT modify source files`
  })

} else if (mode === 'direct') {
  // 直接生成模式
  const focusFiles = layerConfig.focus_files || []

  for (const sourceFile of focusFiles) {
    const sourceContent = Read(sourceFile)

    // 确定测试文件路径（遵循项目约定）
    const testPath = determineTestPath(sourceFile, testConventions)

    // 检查是否已有测试
    let existingTest = null
    try { existingTest = Read(testPath) } catch {}

    if (existingTest) {
      // 补充现有测试：分析缺失的测试用例
      const missingCases = analyzeMissingCases(sourceContent, existingTest)
      if (missingCases.length > 0) {
        // 追加测试用例
        Edit({
          file_path: testPath,
          old_string: findLastTestBlock(existingTest),
          new_string: `${findLastTestBlock(existingTest)}\n\n${generateCases(missingCases, testConventions)}`
        })
      }
    } else {
      // 创建新测试文件
      const testContent = generateFullTestFile(sourceFile, sourceContent, testConventions, targetLayer)
      Write(testPath, testContent)
    }
  }

} else {
  // 委派模式
  const focusFiles = layerConfig.focus_files || []

  Task({
    subagent_type: "code-developer",
    run_in_background: false,
    description: `Generate ${targetLayer} tests for ${focusFiles.length} files`,
    prompt: `## Goal
Generate ${layerConfig.name} for the following source files.

## Test Framework
${strategy.test_framework || 'vitest'}

## Existing Test Patterns (MUST follow these exactly)
${testPatterns.map(t => `### ${t.path}\n\`\`\`\n${t.content.substring(0, 800)}\n\`\`\``).join('\n\n')}

## Test Conventions
- Test file location: ${testConventions.location}
- Import style: ${testConventions.importStyle}
- Describe/it nesting: ${testConventions.nesting}

## Source Files to Test
${focusFiles.map(f => `- ${f}`).join('\n')}

## Requirements
- Follow existing test patterns exactly (import style, naming, structure)
- Cover: happy path + edge cases + error cases
- Target coverage: ${layerConfig.target_coverage}%
- Do NOT modify source files, only create/modify test files
- Do NOT use \`any\` type assertions
- Do NOT skip or mark tests as TODO without implementation`
  })
}

// 辅助函数
function determineTestPath(sourceFile, conventions) {
  if (conventions.location === 'colocated') {
    return sourceFile.replace(/\.(ts|tsx|js|jsx)$/, `.test.$1`)
  } else if (conventions.location === '__tests__') {
    const dir = sourceFile.substring(0, sourceFile.lastIndexOf('/'))
    const name = sourceFile.substring(sourceFile.lastIndexOf('/') + 1)
    return `${dir}/__tests__/${name.replace(/\.(ts|tsx|js|jsx)$/, `.test.$1`)}`
  }
  return sourceFile.replace(/\.(ts|tsx|js|jsx)$/, `.test.$1`)
}

function detectTestConventions(patterns) {
  const conventions = {
    location: 'colocated',  // or '__tests__'
    importStyle: 'named',   // or 'default'
    nesting: 'describe-it', // or 'test-only'
    framework: 'vitest'
  }

  for (const p of patterns) {
    if (p.path.includes('__tests__')) conventions.location = '__tests__'
    if (p.content.includes("import { describe")) conventions.nesting = 'describe-it'
    if (p.content.includes("from 'vitest'")) conventions.framework = 'vitest'
    if (p.content.includes("from '@jest'") || p.content.includes("from 'jest'")) conventions.framework = 'jest'
  }

  return conventions
}
```

### Step 3: Result Processing

```javascript
// 收集生成/修改的测试文件
const generatedTests = Bash(`git diff --name-only`).split('\n')
  .filter(f => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f))

// TypeScript 语法检查
const syntaxResult = Bash(`npx tsc --noEmit ${generatedTests.join(' ')} 2>&1 || true`)
const hasSyntaxErrors = syntaxResult.includes('error TS')

// 自动修复语法错误（最多 3 次）
if (hasSyntaxErrors) {
  let fixAttempt = 0
  while (fixAttempt < 3 && syntaxResult.includes('error TS')) {
    const errors = syntaxResult.split('\n').filter(l => l.includes('error TS')).slice(0, 5)
    // 尝试修复每个错误...
    fixAttempt++
  }
}

// 更新 shared memory
const testInfo = {
  layer: targetLayer,
  files: generatedTests,
  count: generatedTests.length,
  syntax_clean: !hasSyntaxErrors,
  mode: mode,
  gc_fix: mode === 'gc-fix'
}

sharedMemory.generated_tests = sharedMemory.generated_tests || {}
sharedMemory.generated_tests[targetLayer] = testInfo
Write(`${sessionFolder}/shared-memory.json`, JSON.stringify(sharedMemory, null, 2))
```

## Output Format

```
## Test Generation Results

### Layer: [L1|L2|L3]
### Mode: [direct|delegate|gc-fix]
### Files Generated: [count]
- [test file path]

### Syntax Check: PASS/FAIL
### Conventions Applied: [framework], [location], [nesting]
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No focus files in strategy | Generate L1 tests for all source files in scope |
| No existing test patterns | Use framework defaults (vitest/jest/pytest) |
| Sub-agent failure | Retry once, fallback to direct generation |
| Syntax errors persist after 3 fixes | Report errors, proceed with available tests |
| Source file not found | Skip file, log warning |
| Agent/CLI failure | Retry once, then fallback to inline execution |
| Timeout (>5 min) | Report partial results, notify coordinator |
