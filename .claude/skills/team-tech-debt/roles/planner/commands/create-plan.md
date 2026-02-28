# Command: create-plan

> 使用 gemini CLI 创建结构化治理方案。将 quick-wins 归为立即执行，systematic 归为中期治理，识别预防机制用于长期改善。输出 remediation-plan.md。

## When to Use

- Phase 3 of Planner
- 评估矩阵已就绪，需要创建治理方案
- 债务项已按优先级象限分组

**Trigger conditions**:
- TDPLAN-* 任务进入 Phase 3
- 评估数据可用（priority-matrix.json）
- 需要 CLI 辅助生成详细修复建议

## Strategy

### Delegation Mode

**Mode**: CLI Analysis + Template Generation
**CLI Tool**: `gemini` (primary)
**CLI Mode**: `analysis`

### Decision Logic

```javascript
// 方案生成策略
if (quickWins.length + strategic.length <= 5) {
  // 少量项目：内联生成方案
  mode = 'inline'
} else {
  // 较多项目：CLI 辅助生成详细修复步骤
  mode = 'cli-assisted'
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
// 准备债务摘要供 CLI 分析
const debtSummary = debtInventory
  .filter(i => i.priority_quadrant === 'quick-win' || i.priority_quadrant === 'strategic')
  .map(i => `[${i.id}] [${i.priority_quadrant}] [${i.dimension}] ${i.file}:${i.line} - ${i.description} (impact: ${i.impact_score}, cost: ${i.cost_score})`)
  .join('\n')

// 读取相关源文件获取上下文
const affectedFiles = [...new Set(debtInventory.map(i => i.file).filter(Boolean))]
const fileContext = affectedFiles.slice(0, 20).map(f => `@${f}`).join(' ')
```

### Step 2: Execute Strategy

```javascript
if (mode === 'inline') {
  // 内联生成方案
  for (const item of quickWins) {
    item.remediation_steps = [
      `Read ${item.file}`,
      `Apply fix: ${item.suggestion || 'Resolve ' + item.description}`,
      `Verify fix with relevant tests`
    ]
  }
  for (const item of strategic) {
    item.remediation_steps = [
      `Analyze impact scope of ${item.file}`,
      `Plan refactoring: ${item.suggestion || 'Address ' + item.description}`,
      `Implement changes incrementally`,
      `Run full test suite to verify`
    ]
  }
} else {
  // CLI 辅助生成修复方案
  const prompt = `PURPOSE: Create detailed remediation steps for each technical debt item, grouped into actionable phases
TASK: • For each quick-win item, generate specific fix steps (1-3 steps) • For each strategic item, generate a refactoring plan (3-5 steps) • Identify prevention mechanisms based on recurring patterns • Group related items that should be fixed together
MODE: analysis
CONTEXT: ${fileContext}
EXPECTED: Structured remediation plan with: phase name, items, steps per item, dependencies between fixes, estimated time per phase
CONSTRAINTS: Focus on backward-compatible changes, prefer incremental fixes over big-bang refactoring

## Debt Items to Plan
${debtSummary}

## Recurring Patterns
${[...new Set(debtInventory.map(i => i.dimension))].map(d => {
  const count = debtInventory.filter(i => i.dimension === d).length
  return `- ${d}: ${count} items`
}).join('\n')}`

  Bash(`ccw cli -p "${prompt}" --tool gemini --mode analysis --rule planning-breakdown-task-steps`, {
    run_in_background: true
  })

  // 等待 CLI 完成，解析结果
}
```

### Step 3: Result Processing

```javascript
// 生成 Markdown 治理方案
function generatePlanMarkdown(plan, validation) {
  return `# Tech Debt Remediation Plan

## Overview
- **Total Actions**: ${validation.total_actions}
- **Files Affected**: ${validation.files_affected.length}
- **Total Estimated Effort**: ${validation.total_effort} points

## Phase 1: Quick Wins (Immediate)
> High impact, low cost items for immediate action.

${plan.phases[0].actions.map((a, i) => `### ${i + 1}. ${a.debt_id}: ${a.action}
- **File**: ${a.file || 'N/A'}
- **Type**: ${a.type}
${a.steps ? a.steps.map(s => `- [ ] ${s}`).join('\n') : ''}`).join('\n\n')}

## Phase 2: Systematic (Medium-term)
> High impact items requiring structured refactoring.

${plan.phases[1].actions.map((a, i) => `### ${i + 1}. ${a.debt_id}: ${a.action}
- **File**: ${a.file || 'N/A'}
- **Type**: ${a.type}
${a.steps ? a.steps.map(s => `- [ ] ${s}`).join('\n') : ''}`).join('\n\n')}

## Phase 3: Prevention (Long-term)
> Mechanisms to prevent future debt accumulation.

${plan.phases[2].actions.map((a, i) => `### ${i + 1}. ${a.action}
- **Dimension**: ${a.dimension || 'general'}
- **Type**: ${a.type}`).join('\n\n')}

## Execution Notes
- Execute Phase 1 first for maximum ROI
- Phase 2 items may require feature branches
- Phase 3 should be integrated into CI/CD pipeline
`
}
```

## Output Format

```
## Remediation Plan Created

### Phases: 3
### Quick Wins: [count] actions
### Systematic: [count] actions
### Prevention: [count] actions
### Files Affected: [count]

### Output: [sessionFolder]/plan/remediation-plan.md
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| CLI returns unstructured text | Parse manually, extract action items |
| No quick-wins available | Focus plan on systematic and prevention |
| File references invalid | Verify with Glob, skip non-existent files |
| CLI timeout | Generate plan from heuristic data only |
| Agent/CLI failure | Retry once, then inline generation |
| Timeout (>5 min) | Report partial plan, notify planner |
