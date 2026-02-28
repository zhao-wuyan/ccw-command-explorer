# Command: verify

> 回归测试与质量验证。运行测试套件、类型检查、lint、可选 CLI 质量分析。对比 debt_score_before vs debt_score_after 评估改善程度。

## When to Use

- Phase 3 of Validator
- 修复操作已完成，需要验证结果
- Fix-Verify 循环中的验证阶段

**Trigger conditions**:
- TDVAL-* 任务进入 Phase 3
- 修复日志可用（fix-log.json）
- 需要对比 before/after 指标

## Strategy

### Delegation Mode

**Mode**: Sequential Checks + Optional CLI Analysis
**CLI Tool**: `gemini` (for quality comparison)
**CLI Mode**: `analysis`

### Decision Logic

```javascript
// 验证策略选择
const checks = ['test_suite', 'type_check', 'lint_check']

// 可选：CLI 质量分析（仅当修改文件较多时）
if (modifiedFiles.length > 5) {
  checks.push('cli_quality_analysis')
}

// Fix-Verify 循环中的验证：聚焦于回归文件
const isFixVerify = task.description.includes('fix-verify')
if (isFixVerify) {
  // 仅验证上次回归的文件
  targetScope = 'regression_files_only'
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
// 获取修改文件列表
const modifiedFiles = fixLog.files_modified || []

// 获取原始债务分数
const debtScoreBefore = sharedMemory.debt_score_before || 0

// Worktree 路径（从 shared memory 加载）
const worktreePath = sharedMemory.worktree?.path || null
const cmdPrefix = worktreePath ? `cd "${worktreePath}" && ` : ''

// 检测可用的验证工具（在 worktree 中检测）
const hasNpm = Bash(`${cmdPrefix}which npm 2>/dev/null && echo "yes" || echo "no"`).trim() === 'yes'
const hasTsc = Bash(`${cmdPrefix}which npx 2>/dev/null && npx tsc --version 2>/dev/null && echo "yes" || echo "no"`).includes('yes')
const hasEslint = Bash(`${cmdPrefix}npx eslint --version 2>/dev/null && echo "yes" || echo "no"`).includes('yes')
const hasPytest = Bash(`${cmdPrefix}which pytest 2>/dev/null && echo "yes" || echo "no"`).trim() === 'yes'
```

### Step 2: Execute Strategy

```javascript
// === Check 1: Test Suite（worktree 中执行） ===
let testOutput = ''
let testsPassed = true
let testRegressions = 0

if (hasNpm) {
  testOutput = Bash(`${cmdPrefix}npm test 2>&1 || true`)
} else if (hasPytest) {
  testOutput = Bash(`${cmdPrefix}python -m pytest 2>&1 || true`)
} else {
  testOutput = 'no-test-runner'
}

if (testOutput !== 'no-test-runner') {
  testsPassed = !/FAIL|error|failed/i.test(testOutput)
  testRegressions = testsPassed ? 0 : (testOutput.match(/(\d+) failed/)?.[1] || 1) * 1
}

// === Check 2: Type Checking（worktree 中执行） ===
let typeErrors = 0
if (hasTsc) {
  const tscOutput = Bash(`${cmdPrefix}npx tsc --noEmit 2>&1 || true`)
  typeErrors = (tscOutput.match(/error TS/g) || []).length
}

// === Check 3: Linting（worktree 中执行） ===
let lintErrors = 0
if (hasEslint && modifiedFiles.length > 0) {
  const lintOutput = Bash(`${cmdPrefix}npx eslint --no-error-on-unmatched-pattern ${modifiedFiles.join(' ')} 2>&1 || true`)
  lintErrors = (lintOutput.match(/(\d+) error/)?.[0]?.match(/\d+/)?.[0] || 0) * 1
}

// === Check 4: Optional CLI Quality Analysis ===
let qualityImprovement = 0
if (checks.includes('cli_quality_analysis')) {
  const prompt = `PURPOSE: Compare code quality before and after tech debt cleanup to measure improvement
TASK: • Analyze the modified files for quality metrics • Compare complexity, duplication, naming quality • Assess if the changes actually reduced debt • Identify any new issues introduced
MODE: analysis
CONTEXT: ${modifiedFiles.map(f => `@${f}`).join(' ')}
EXPECTED: Quality comparison with: metrics_before, metrics_after, improvement_score (0-100), new_issues_found
CONSTRAINTS: Focus on the specific changes, not overall project quality`

  Bash(`ccw cli -p "${prompt}" --tool gemini --mode analysis --rule analysis-review-code-quality${worktreePath ? ' --cd "' + worktreePath + '"' : ''}`, {
    run_in_background: true
  })
  // 等待 CLI 完成，解析质量改善分数
}

// === 计算债务分数 ===
// 已修复的项不计入 after 分数
const fixedDebtIds = new Set(
  (sharedMemory.fix_results?.files_modified || [])
    .flatMap(f => debtInventory.filter(i => i.file === f).map(i => i.id))
)
const debtScoreAfter = debtInventory.filter(i => !fixedDebtIds.has(i.id)).length
```

### Step 3: Result Processing

```javascript
const totalRegressions = testRegressions + typeErrors + lintErrors
const passed = totalRegressions === 0

// 如果有少量回归，尝试通过 code-developer 修复
if (totalRegressions > 0 && totalRegressions <= 3) {
  const regressionDetails = []
  if (testRegressions > 0) regressionDetails.push(`${testRegressions} test failures`)
  if (typeErrors > 0) regressionDetails.push(`${typeErrors} type errors`)
  if (lintErrors > 0) regressionDetails.push(`${lintErrors} lint errors`)

  Task({
    subagent_type: "code-developer",
    run_in_background: false,
    description: `Fix ${totalRegressions} regressions from debt cleanup`,
    prompt: `## Goal
Fix regressions introduced by tech debt cleanup.
${worktreePath ? `\n## Worktree（强制）\n- 工作目录: ${worktreePath}\n- **所有文件操作必须在 ${worktreePath} 下进行**\n- Bash 命令使用 cd "${worktreePath}" && ... 前缀\n` : ''}
## Regressions
${regressionDetails.join('\n')}

## Modified Files
${modifiedFiles.map(f => `- ${f}`).join('\n')}

## Test Output (if failed)
${testOutput.split('\n').filter(l => /FAIL|Error|error/i.test(l)).slice(0, 20).join('\n')}

## Constraints
- Fix ONLY the regressions, do not undo the debt fixes
- Preserve the debt cleanup changes
- Do NOT skip tests or add suppressions`
  })

  // Re-run checks after fix attempt
  // ... (simplified: re-check test suite)
}

// 生成最终验证结果
const validationReport = {
  passed,
  regressions: totalRegressions,
  debt_score_before: debtScoreBefore,
  debt_score_after: debtScoreAfter,
  improvement_percentage: debtScoreBefore > 0
    ? Math.round(((debtScoreBefore - debtScoreAfter) / debtScoreBefore) * 100)
    : 0
}
```

## Output Format

```
## Validation Results

### Status: [PASS|FAIL]
### Regressions: [count]
- Test Suite: [PASS|FAIL] ([n] regressions)
- Type Check: [PASS|FAIL] ([n] errors)
- Lint: [PASS|FAIL] ([n] errors)
- Quality: [IMPROVED|NO_CHANGE]

### Debt Score
- Before: [score]
- After: [score]
- Improvement: [%]%
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No test runner available | Skip test check, rely on type+lint |
| tsc not available | Skip type check, rely on test+lint |
| eslint not available | Skip lint check, rely on test+type |
| All checks unavailable | Report minimal validation, warn coordinator |
| Fix attempt introduces new regressions | Revert fix, report original regressions |
| CLI quality analysis times out | Skip quality analysis, use debt score comparison only |
