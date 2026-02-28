# Command: analyze-scope

> 变更范围分析 + 测试策略制定。分析代码变更、scout 发现和项目结构，确定测试层级和覆盖率目标。

## When to Use

- Phase 2-3 of Strategist
- 需要分析代码变更范围
- 需要将 scout 发现转化为测试策略

**Trigger conditions**:
- QASTRAT-* 任务进入执行阶段
- 变更文件数 > 5 需要 CLI 辅助分析
- 存在 scout 发现的高优先级问题

## Strategy

### Delegation Mode

**Mode**: CLI Fan-out（复杂项目）/ Direct（简单项目）
**CLI Tool**: `gemini` (primary)
**CLI Mode**: `analysis`

### Decision Logic

```javascript
const totalScope = changedFiles.length + discoveredIssues.length
if (totalScope <= 5) {
  // 直接内联分析
  mode = 'direct'
} else if (totalScope <= 15) {
  // 单次 CLI 分析
  mode = 'single-cli'
} else {
  // 多维度 CLI 分析
  mode = 'multi-cli'
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
// 从 shared memory 获取 scout 发现
const discoveredIssues = sharedMemory.discovered_issues || []

// 分析 git diff 获取变更范围
const changedFiles = Bash(`git diff --name-only HEAD~5 2>/dev/null || git diff --name-only --cached 2>/dev/null || echo ""`)
  .split('\n').filter(Boolean)

// 分类变更文件
const fileCategories = {
  source: changedFiles.filter(f => /\.(ts|tsx|js|jsx|py|java|go|rs)$/.test(f)),
  test: changedFiles.filter(f => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f) || /test_/.test(f)),
  config: changedFiles.filter(f => /\.(json|yaml|yml|toml|env)$/.test(f)),
  style: changedFiles.filter(f => /\.(css|scss|less)$/.test(f)),
  docs: changedFiles.filter(f => /\.(md|txt|rst)$/.test(f))
}

// 检测项目测试框架
const packageJson = Read('package.json')
const testFramework = detectFramework(packageJson)

// 获取已有测试覆盖率基线
let baselineCoverage = null
try {
  const coverageSummary = JSON.parse(Read('coverage/coverage-summary.json'))
  baselineCoverage = coverageSummary.total?.lines?.pct || null
} catch {}
```

### Step 2: Execute Strategy

```javascript
if (mode === 'direct') {
  // 内联分析：直接构建策略
  buildStrategyDirect(fileCategories, discoveredIssues, testFramework)
} else if (mode === 'single-cli') {
  // 单次 CLI 综合分析
  Bash(`ccw cli -p "PURPOSE: Analyze code changes and scout findings to determine optimal test strategy
TASK: • Classify ${changedFiles.length} changed files by risk level • Map ${discoveredIssues.length} scout issues to test requirements • Identify integration points between changed modules • Recommend test layers (L1/L2/L3) with coverage targets
MODE: analysis
CONTEXT: @${changedFiles.slice(0, 20).join(' @')} | Memory: Scout found ${discoveredIssues.length} issues, baseline coverage ${baselineCoverage || 'unknown'}%
EXPECTED: JSON with layers array, each containing level, name, target_coverage, focus_files, rationale
CONSTRAINTS: Be conservative with L3 E2E tests | Focus L1 on changed source files" --tool gemini --mode analysis --rule analysis-analyze-code-patterns`, {
    run_in_background: true
  })
  // 等待 CLI 完成
} else {
  // 多维度分析
  // Dimension 1: 变更风险分析
  Bash(`ccw cli -p "PURPOSE: Assess risk level of code changes
TASK: • Classify each file by change risk (high/medium/low) • Identify files touching critical paths • Map dependency chains
MODE: analysis
CONTEXT: @${fileCategories.source.join(' @')}
EXPECTED: Risk matrix with file:risk_level mapping
CONSTRAINTS: Focus on source files only" --tool gemini --mode analysis`, {
    run_in_background: true
  })

  // Dimension 2: 测试覆盖差距分析
  Bash(`ccw cli -p "PURPOSE: Identify test coverage gaps for changed code
TASK: • Find changed functions without tests • Map test files to source files • Identify missing integration test scenarios
MODE: analysis
CONTEXT: @${[...fileCategories.source, ...fileCategories.test].join(' @')}
EXPECTED: Coverage gap report with untested functions and modules
CONSTRAINTS: Compare existing tests to changed code" --tool gemini --mode analysis`, {
    run_in_background: true
  })
  // 等待所有 CLI 完成
}
```

### Step 3: Result Processing

```javascript
// 构建测试策略
const strategy = {
  scope: {
    total_changed: changedFiles.length,
    source_files: fileCategories.source.length,
    test_files: fileCategories.test.length,
    issue_count: discoveredIssues.length,
    baseline_coverage: baselineCoverage
  },
  test_framework: testFramework,
  layers: [],
  coverage_targets: {}
}

// 层级选择算法
// L1: Unit Tests - 所有有源码变更的文件
if (fileCategories.source.length > 0 || discoveredIssues.length > 0) {
  const l1Files = fileCategories.source.length > 0
    ? fileCategories.source
    : [...new Set(discoveredIssues.map(i => i.file))]

  strategy.layers.push({
    level: 'L1',
    name: 'Unit Tests',
    target_coverage: 80,
    focus_files: l1Files,
    rationale: fileCategories.source.length > 0
      ? '所有变更的源文件需要单元测试覆盖'
      : 'Scout 发现的问题需要测试覆盖'
  })
}

// L2: Integration Tests - 多模块变更或关键问题
if (fileCategories.source.length >= 3 || discoveredIssues.some(i => i.severity === 'critical')) {
  const integrationPoints = fileCategories.source
    .filter(f => /service|controller|handler|middleware|route|api/.test(f))

  if (integrationPoints.length > 0) {
    strategy.layers.push({
      level: 'L2',
      name: 'Integration Tests',
      target_coverage: 60,
      focus_areas: integrationPoints,
      rationale: '多文件变更涉及模块间交互，需要集成测试'
    })
  }
}

// L3: E2E Tests - 大量高优先级问题
const criticalHighCount = discoveredIssues
  .filter(i => i.severity === 'critical' || i.severity === 'high').length
if (criticalHighCount >= 3) {
  strategy.layers.push({
    level: 'L3',
    name: 'E2E Tests',
    target_coverage: 40,
    focus_flows: [...new Set(discoveredIssues
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .map(i => i.file.split('/')[1] || 'main'))],
    rationale: `${criticalHighCount} 个高优先级问题需要端到端验证`
  })
}

// 设置覆盖率目标
for (const layer of strategy.layers) {
  strategy.coverage_targets[layer.level] = layer.target_coverage
}
```

## Output Format

```
## Test Strategy

### Scope Analysis
- Changed files: [count]
- Source files: [count]
- Scout issues: [count]
- Baseline coverage: [percent]%

### Test Layers
#### L1: Unit Tests
- Coverage target: 80%
- Focus files: [list]

#### L2: Integration Tests (if applicable)
- Coverage target: 60%
- Focus areas: [list]

#### L3: E2E Tests (if applicable)
- Coverage target: 40%
- Focus flows: [list]
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No changed files | Use scout issues as scope |
| No scout issues | Generate L1 tests for all source files |
| Test framework unknown | Default to Jest/Vitest (JS/TS) or pytest (Python) |
| CLI analysis returns unusable results | Fall back to heuristic-based strategy |
| Agent/CLI failure | Retry once, then fallback to inline execution |
| Timeout (>5 min) | Report partial results, notify coordinator |
