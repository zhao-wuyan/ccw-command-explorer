# Command: evaluate

> CLI 分析评估债务项。对每项债务评估业务影响(1-5)、修复成本(1-5)、未修复风险，产出优先级象限分配。

## When to Use

- Phase 3 of Assessor
- 需要对债务清单中的项目进行量化评估
- 债务项数量较多需要 CLI 辅助分析

**Trigger conditions**:
- TDEVAL-* 任务进入 Phase 3
- 债务清单包含 >10 项需要评估的条目
- 需要上下文理解来评估影响和成本

## Strategy

### Delegation Mode

**Mode**: CLI Batch Analysis
**CLI Tool**: `gemini` (primary)
**CLI Mode**: `analysis`

### Decision Logic

```javascript
// 评估策略选择
if (debtInventory.length <= 10) {
  // 少量项目：内联评估（基于严重性和工作量启发式）
  mode = 'heuristic'
} else if (debtInventory.length <= 50) {
  // 中等规模：单次 CLI 批量评估
  mode = 'cli-batch'
} else {
  // 大规模：分批 CLI 评估
  mode = 'cli-chunked'
  chunkSize = 25
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
// 准备评估上下文
const debtSummary = debtInventory.map(item =>
  `[${item.id}] [${item.dimension}] [${item.severity}] ${item.file}:${item.line} - ${item.description}`
).join('\n')

// 读取项目元信息用于上下文
const projectContext = []
try {
  const pkg = JSON.parse(Read('package.json'))
  projectContext.push(`Project: ${pkg.name}, Dependencies: ${Object.keys(pkg.dependencies || {}).length}`)
} catch {}
```

### Step 2: Execute Strategy

```javascript
if (mode === 'heuristic') {
  // 内联启发式评估
  for (const item of debtInventory) {
    const severityImpact = { critical: 5, high: 4, medium: 3, low: 1 }
    const effortCost = { small: 1, medium: 3, large: 5 }
    item.impact_score = severityImpact[item.severity] || 3
    item.cost_score = effortCost[item.estimated_effort] || 3
    item.risk_if_unfixed = getRiskDescription(item)
    item.priority_quadrant = assignQuadrant(item.impact_score, item.cost_score)
  }
} else {
  // CLI 批量评估
  const prompt = `PURPOSE: Evaluate technical debt items for business impact and fix cost to create a priority matrix
TASK: • For each debt item, assess business impact (1-5 scale: 1=negligible, 5=critical) • Assess fix complexity/cost (1-5 scale: 1=trivial, 5=major refactor) • Describe risk if unfixed • Assign priority quadrant: quick-win (high impact + low cost), strategic (high impact + high cost), backlog (low impact + low cost), defer (low impact + high cost)
MODE: analysis
CONTEXT: ${projectContext.join(' | ')}
EXPECTED: JSON array with: [{id, impact_score, cost_score, risk_if_unfixed, priority_quadrant}] for each item
CONSTRAINTS: Be realistic about costs, consider dependencies between items

## Debt Items to Evaluate
${debtSummary}`

  Bash(`ccw cli -p "${prompt}" --tool gemini --mode analysis --rule analysis-analyze-code-patterns`, {
    run_in_background: true
  })

  // 等待 CLI 完成，解析结果，合并回 debtInventory
}

function assignQuadrant(impact, cost) {
  if (impact >= 4 && cost <= 2) return 'quick-win'
  if (impact >= 4 && cost >= 3) return 'strategic'
  if (impact <= 3 && cost <= 2) return 'backlog'
  return 'defer'
}

function getRiskDescription(item) {
  const risks = {
    'code': 'Increased maintenance cost and bug probability',
    'architecture': 'Growing coupling makes changes harder and riskier',
    'testing': 'Reduced confidence in changes, higher regression risk',
    'dependency': 'Security vulnerabilities and compatibility issues',
    'documentation': 'Onboarding friction and knowledge loss'
  }
  return risks[item.dimension] || 'Technical quality degradation over time'
}
```

### Step 3: Result Processing

```javascript
// 验证评估结果完整性
const evaluated = debtInventory.filter(i => i.priority_quadrant)
const unevaluated = debtInventory.filter(i => !i.priority_quadrant)

if (unevaluated.length > 0) {
  // 未评估的项目使用启发式兜底
  for (const item of unevaluated) {
    item.impact_score = item.impact_score || 3
    item.cost_score = item.cost_score || 3
    item.priority_quadrant = assignQuadrant(item.impact_score, item.cost_score)
    item.risk_if_unfixed = item.risk_if_unfixed || getRiskDescription(item)
  }
}

// 生成统计
const stats = {
  total: debtInventory.length,
  evaluated_by_cli: evaluated.length,
  evaluated_by_heuristic: unevaluated.length,
  avg_impact: (debtInventory.reduce((s, i) => s + i.impact_score, 0) / debtInventory.length).toFixed(1),
  avg_cost: (debtInventory.reduce((s, i) => s + i.cost_score, 0) / debtInventory.length).toFixed(1)
}
```

## Output Format

```
## Evaluation Results

### Method: [heuristic|cli-batch|cli-chunked]
### Total Items: [count]
### Average Impact: [score]/5
### Average Cost: [score]/5

### Priority Distribution
| Quadrant | Count | % |
|----------|-------|---|
| Quick-Win | [n] | [%] |
| Strategic | [n] | [%] |
| Backlog | [n] | [%] |
| Defer | [n] | [%] |
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| CLI returns invalid JSON | Fall back to heuristic scoring |
| CLI timeout | Evaluate processed items, heuristic for rest |
| Debt inventory too large (>200) | Chunk into batches of 25 |
| Missing severity/effort data | Use dimension-based defaults |
| All items same quadrant | Re-evaluate with adjusted thresholds |
