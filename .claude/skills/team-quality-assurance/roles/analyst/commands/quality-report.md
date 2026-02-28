# Command: quality-report

> 缺陷模式分析 + 覆盖率分析 + 综合质量报告。多维度分析 QA 数据，生成质量评分和改进建议。

## When to Use

- Phase 3 of Analyst
- 测试执行完成，需要分析结果
- 需要识别缺陷模式和覆盖率趋势

**Trigger conditions**:
- QAANA-* 任务进入执行阶段
- 所有 QARUN 任务已完成
- Coordinator 请求质量报告

## Strategy

### Delegation Mode

**Mode**: CLI Fan-out（深度分析）/ Direct（基础分析）
**CLI Tool**: `gemini` (primary)
**CLI Mode**: `analysis`

### Decision Logic

```javascript
const dataPoints = discoveredIssues.length + Object.keys(executionResults).length
if (dataPoints <= 5) {
  // 基础内联分析
  mode = 'direct'
} else {
  // CLI 辅助深度分析
  mode = 'cli-assisted'
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
// 从 shared memory 加载所有 QA 数据
const discoveredIssues = sharedMemory.discovered_issues || []
const strategy = sharedMemory.test_strategy || {}
const generatedTests = sharedMemory.generated_tests || {}
const executionResults = sharedMemory.execution_results || {}
const historicalPatterns = sharedMemory.defect_patterns || []
const coverageHistory = sharedMemory.coverage_history || []

// 读取覆盖率详细数据
let coverageData = null
try {
  coverageData = JSON.parse(Read('coverage/coverage-summary.json'))
} catch {}

// 读取各层级执行结果
const layerResults = {}
try {
  const resultFiles = Glob(`${sessionFolder}/results/run-*.json`)
  for (const f of resultFiles) {
    const data = JSON.parse(Read(f))
    layerResults[data.layer] = data
  }
} catch {}
```

### Step 2: Execute Strategy

```javascript
if (mode === 'direct') {
  // 基础内联分析
  analysis = performDirectAnalysis()
} else {
  // CLI 辅助深度分析
  const analysisContext = JSON.stringify({
    issues: discoveredIssues.slice(0, 20),
    execution: layerResults,
    coverage: coverageData?.total || {},
    strategy: { layers: strategy.layers?.map(l => ({ level: l.level, target: l.target_coverage })) }
  }, null, 2)

  Bash(`ccw cli -p "PURPOSE: Perform deep quality analysis on QA results to identify defect patterns, coverage trends, and improvement opportunities
TASK: • Classify defects by root cause pattern (logic errors, integration issues, missing validation, etc.) • Identify files with highest defect density • Analyze coverage gaps vs risk levels • Compare actual coverage to targets • Generate actionable improvement recommendations
MODE: analysis
CONTEXT: @${sessionFolder}/shared-memory.json @${sessionFolder}/results/**/*
EXPECTED: Structured analysis with: defect pattern taxonomy, risk-coverage matrix, quality score rationale, top 5 improvement recommendations with expected impact
CONSTRAINTS: Be data-driven, avoid speculation without evidence" --tool gemini --mode analysis --rule analysis-analyze-code-patterns`, {
    run_in_background: true
  })
  // 等待 CLI 完成
}

// ===== 分析维度 =====

// 1. 缺陷模式分析
function analyzeDefectPatterns(issues, results) {
  const byType = {}
  for (const issue of issues) {
    const type = issue.perspective || 'unknown'
    if (!byType[type]) byType[type] = []
    byType[type].push(issue)
  }

  // 识别重复模式
  const patterns = []
  for (const [type, typeIssues] of Object.entries(byType)) {
    if (typeIssues.length >= 2) {
      // 分析共同特征
      const commonFiles = findCommonPatterns(typeIssues.map(i => i.file))
      patterns.push({
        type,
        count: typeIssues.length,
        files: [...new Set(typeIssues.map(i => i.file))],
        common_pattern: commonFiles,
        description: `${type} 类问题在 ${typeIssues.length} 处重复出现`,
        recommendation: generateRecommendation(type, typeIssues)
      })
    }
  }

  return { by_type: byType, patterns, total: issues.length }
}

// 2. 覆盖率差距分析
function analyzeCoverageGaps(coverage, strategy) {
  if (!coverage) return { status: 'no_data', gaps: [] }

  const totalCoverage = coverage.total?.lines?.pct || 0
  const gaps = []

  for (const layer of (strategy.layers || [])) {
    if (totalCoverage < layer.target_coverage) {
      gaps.push({
        layer: layer.level,
        target: layer.target_coverage,
        actual: totalCoverage,
        gap: Math.round(layer.target_coverage - totalCoverage),
        severity: (layer.target_coverage - totalCoverage) > 20 ? 'high' : 'medium'
      })
    }
  }

  // 按文件分析覆盖率
  const fileGaps = []
  if (coverage && typeof coverage === 'object') {
    for (const [file, data] of Object.entries(coverage)) {
      if (file === 'total') continue
      const linePct = data?.lines?.pct || 0
      if (linePct < 50) {
        fileGaps.push({ file, coverage: linePct, severity: linePct < 20 ? 'critical' : 'high' })
      }
    }
  }

  return { total_coverage: totalCoverage, gaps, file_gaps: fileGaps.slice(0, 10) }
}

// 3. 测试有效性分析
function analyzeTestEffectiveness(generated, results) {
  const effectiveness = {}
  for (const [layer, data] of Object.entries(generated)) {
    const result = results[layer] || {}
    effectiveness[layer] = {
      files_generated: data.files?.length || 0,
      pass_rate: result.pass_rate || 0,
      iterations_needed: result.iterations || 0,
      coverage_achieved: result.coverage || 0,
      effective: (result.pass_rate || 0) >= 95 && (result.iterations || 0) <= 2
    }
  }
  return effectiveness
}

// 4. 质量趋势分析
function analyzeQualityTrend(history) {
  if (history.length < 2) return { trend: 'insufficient_data', confidence: 'low' }

  const latest = history[history.length - 1]
  const previous = history[history.length - 2]
  const delta = (latest?.coverage || 0) - (previous?.coverage || 0)

  return {
    trend: delta > 5 ? 'improving' : delta < -5 ? 'declining' : 'stable',
    delta: Math.round(delta * 10) / 10,
    data_points: history.length,
    confidence: history.length >= 5 ? 'high' : history.length >= 3 ? 'medium' : 'low'
  }
}

// 5. 综合质量评分
function calculateQualityScore(analysis) {
  let score = 100

  // 扣分: 安全问题
  const securityIssues = (analysis.defect_patterns.by_type?.security || []).length
  score -= securityIssues * 10

  // 扣分: Bug
  const bugIssues = (analysis.defect_patterns.by_type?.bug || []).length
  score -= bugIssues * 5

  // 扣分: 覆盖率差距
  for (const gap of (analysis.coverage_gaps.gaps || [])) {
    score -= gap.gap * 0.5
  }

  // 扣分: 测试失败
  for (const [layer, eff] of Object.entries(analysis.test_effectiveness)) {
    if (eff.pass_rate < 100) score -= (100 - eff.pass_rate) * 0.3
  }

  // 加分: 有效测试层
  const effectiveLayers = Object.values(analysis.test_effectiveness)
    .filter(e => e.effective).length
  score += effectiveLayers * 5

  // 加分: 改善趋势
  if (analysis.quality_trend.trend === 'improving') score += 3

  return Math.max(0, Math.min(100, Math.round(score)))
}

// 辅助函数
function findCommonPatterns(files) {
  const dirs = files.map(f => f.split('/').slice(0, -1).join('/'))
  const commonDir = dirs.reduce((a, b) => {
    const partsA = a.split('/')
    const partsB = b.split('/')
    const common = []
    for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
      if (partsA[i] === partsB[i]) common.push(partsA[i])
      else break
    }
    return common.join('/')
  })
  return commonDir || 'scattered'
}

function generateRecommendation(type, issues) {
  const recommendations = {
    'security': '加强输入验证和安全审计，考虑引入 SAST 工具',
    'bug': '改进错误处理和边界检查，增加防御性编程',
    'test-coverage': '补充缺失的测试用例，聚焦未覆盖的分支',
    'code-quality': '重构复杂函数，消除代码重复',
    'ux': '统一错误提示和加载状态处理'
  }
  return recommendations[type] || '进一步分析并制定改进计划'
}
```

### Step 3: Result Processing

```javascript
// 组装分析结果
const analysis = {
  defect_patterns: analyzeDefectPatterns(discoveredIssues, layerResults),
  coverage_gaps: analyzeCoverageGaps(coverageData, strategy),
  test_effectiveness: analyzeTestEffectiveness(generatedTests, layerResults),
  quality_trend: analyzeQualityTrend(coverageHistory),
  quality_score: 0
}

analysis.quality_score = calculateQualityScore(analysis)

// 生成报告文件
const reportContent = generateReportMarkdown(analysis)
Bash(`mkdir -p "${sessionFolder}/analysis"`)
Write(`${sessionFolder}/analysis/quality-report.md`, reportContent)

// 更新 shared memory
sharedMemory.defect_patterns = analysis.defect_patterns.patterns
sharedMemory.quality_score = analysis.quality_score
sharedMemory.coverage_history = sharedMemory.coverage_history || []
sharedMemory.coverage_history.push({
  date: new Date().toISOString(),
  coverage: analysis.coverage_gaps.total_coverage || 0,
  quality_score: analysis.quality_score,
  issues: analysis.defect_patterns.total
})
Write(`${sessionFolder}/shared-memory.json`, JSON.stringify(sharedMemory, null, 2))

function generateReportMarkdown(analysis) {
  return `# Quality Assurance Report

## Quality Score: ${analysis.quality_score}/100

---

## 1. Defect Pattern Analysis
- Total issues found: ${analysis.defect_patterns.total}
- Recurring patterns: ${analysis.defect_patterns.patterns.length}

${analysis.defect_patterns.patterns.map(p =>
  `### Pattern: ${p.type} (${p.count} occurrences)
- Files: ${p.files.join(', ')}
- Common location: ${p.common_pattern}
- Recommendation: ${p.recommendation}`
).join('\n\n')}

## 2. Coverage Analysis
- Overall coverage: ${analysis.coverage_gaps.total_coverage || 'N/A'}%
- Coverage gaps: ${(analysis.coverage_gaps.gaps || []).length}

${(analysis.coverage_gaps.gaps || []).map(g =>
  `- **${g.layer}**: target ${g.target}% vs actual ${g.actual}% (gap: ${g.gap}%, severity: ${g.severity})`
).join('\n')}

### Low Coverage Files
${(analysis.coverage_gaps.file_gaps || []).map(f =>
  `- ${f.file}: ${f.coverage}% [${f.severity}]`
).join('\n')}

## 3. Test Effectiveness
${Object.entries(analysis.test_effectiveness).map(([layer, data]) =>
  `- **${layer}**: ${data.files_generated} files, pass rate ${data.pass_rate}%, ${data.iterations_needed} fix iterations, ${data.effective ? 'EFFECTIVE' : 'NEEDS IMPROVEMENT'}`
).join('\n')}

## 4. Quality Trend
- Trend: ${analysis.quality_trend.trend}
${analysis.quality_trend.delta !== undefined ? `- Coverage delta: ${analysis.quality_trend.delta > 0 ? '+' : ''}${analysis.quality_trend.delta}%` : ''}
- Confidence: ${analysis.quality_trend.confidence}

## 5. Recommendations
${analysis.quality_score >= 80 ? '- Quality is **GOOD**. Maintain current testing practices.' : ''}
${analysis.quality_score >= 60 && analysis.quality_score < 80 ? '- Quality needs **IMPROVEMENT**. Focus on coverage gaps and recurring patterns.' : ''}
${analysis.quality_score < 60 ? '- Quality is **CONCERNING**. Recommend comprehensive review and testing effort.' : ''}
${analysis.defect_patterns.patterns.map(p => `- [${p.type}] ${p.recommendation}`).join('\n')}
${(analysis.coverage_gaps.gaps || []).map(g => `- Close ${g.layer} coverage gap: +${g.gap}% needed`).join('\n')}
`
}
```

## Output Format

```
## Quality Analysis Results

### Quality Score: [score]/100

### Dimensions
1. Defect Patterns: [count] recurring
2. Coverage Gaps: [count] layers below target
3. Test Effectiveness: [effective_count]/[total_layers] effective
4. Quality Trend: [improving|stable|declining]

### Report Location
[session]/analysis/quality-report.md
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No coverage data available | Score based on other dimensions only |
| No execution results | Analyze only scout findings and strategy |
| Shared memory empty/corrupt | Generate minimal report with available data |
| CLI analysis fails | Fall back to direct inline analysis |
| Insufficient history for trend | Report 'insufficient_data', skip trend scoring |
| Agent/CLI failure | Retry once, then fallback to inline execution |
| Timeout (>5 min) | Report partial results, notify coordinator |
