# Command: synthesize

> 跨视角整合。从所有探索、分析、讨论结果中提取主题、解决冲突、生成最终结论和建议。

## When to Use

- Phase 3 of Synthesizer
- 所有探索、分析、讨论已完成
- 每个 SYNTH-* 任务触发一次

**Trigger conditions**:
- 讨论循环结束后（用户选择"分析完成"或达到最大轮次）
- Quick 模式下分析完成后直接触发

## Strategy

### Delegation Mode

**Mode**: Inline（纯整合，不调用外部工具）

### Decision Logic

```javascript
function buildSynthesisStrategy(explorationCount, analysisCount, discussionCount) {
  if (analysisCount <= 1 && discussionCount === 0) {
    return 'simple'  // Quick mode: 单视角直接总结
  }
  if (discussionCount > 2) {
    return 'deep'    // Deep mode: 多轮讨论需要追踪演进
  }
  return 'standard'  // Standard: 多视角交叉整合
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
const strategy = buildSynthesisStrategy(
  allExplorations.length, allAnalyses.length, allDiscussions.length
)

// 提取所有洞察
const allInsights = allAnalyses.flatMap(a =>
  (a.key_insights || []).map(i => ({
    ...(typeof i === 'string' ? { insight: i } : i),
    perspective: a.perspective
  }))
)

// 提取所有发现
const allFindings = allAnalyses.flatMap(a =>
  (a.key_findings || []).map(f => ({
    ...(typeof f === 'string' ? { finding: f } : f),
    perspective: a.perspective
  }))
)

// 提取所有建议
const allRecommendations = allAnalyses.flatMap(a =>
  (a.recommendations || []).map(r => ({
    ...(typeof r === 'string' ? { action: r } : r),
    perspective: a.perspective
  }))
)

// 提取讨论演进
const discussionEvolution = allDiscussions.map(d => ({
  round: d.round,
  type: d.type,
  confirmed: d.updated_understanding?.confirmed || [],
  corrected: d.updated_understanding?.corrected || [],
  new_insights: d.updated_understanding?.new_insights || []
}))
```

### Step 2: Cross-Perspective Synthesis

```javascript
// 1. Theme Extraction — 跨视角共同主题
const themes = extractThemes(allInsights)

// 2. Conflict Resolution — 视角间矛盾
const conflicts = identifyConflicts(allAnalyses)

// 3. Evidence Consolidation — 证据汇总
const consolidatedEvidence = consolidateEvidence(allFindings)

// 4. Recommendation Prioritization — 建议优先级排序
const prioritizedRecommendations = prioritizeRecommendations(allRecommendations)

// 5. Decision Trail Integration — 决策追踪整合
const decisionSummary = summarizeDecisions(decisionTrail)

function extractThemes(insights) {
  // 按关键词聚类，识别跨视角共同主题
  const themeMap = {}
  for (const insight of insights) {
    const text = insight.insight || insight
    // 简单聚类：相似洞察归为同一主题
    const key = text.slice(0, 30)
    if (!themeMap[key]) {
      themeMap[key] = { theme: text, perspectives: [], count: 0 }
    }
    themeMap[key].perspectives.push(insight.perspective)
    themeMap[key].count++
  }
  return Object.values(themeMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function identifyConflicts(analyses) {
  // 识别不同视角间的矛盾发现
  const conflicts = []
  for (let i = 0; i < analyses.length; i++) {
    for (let j = i + 1; j < analyses.length; j++) {
      // 比较两个视角的发现是否矛盾
      // 实际实现中需要语义比较
    }
  }
  return conflicts
}

function consolidateEvidence(findings) {
  // 去重并按文件引用聚合
  const byFile = {}
  for (const f of findings) {
    const ref = f.file_ref || f.finding
    if (!byFile[ref]) byFile[ref] = []
    byFile[ref].push(f)
  }
  return byFile
}

function prioritizeRecommendations(recommendations) {
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  return recommendations
    .sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2))
    .slice(0, 10)
}

function summarizeDecisions(trail) {
  return trail.map(d => ({
    round: d.round,
    decision: d.decision,
    context: d.context,
    impact: d.impact || 'Shaped analysis direction'
  }))
}
```

### Step 3: Build Conclusions

```javascript
const conclusions = {
  session_id: sessionFolder.split('/').pop(),
  topic,
  completed: new Date().toISOString(),
  total_rounds: allDiscussions.length,
  strategy_used: strategy,

  summary: generateSummary(themes, allFindings, allDiscussions),

  key_conclusions: themes.slice(0, 7).map(t => ({
    point: t.theme,
    evidence: t.perspectives.join(', ') + ' perspectives',
    confidence: t.count >= 3 ? 'high' : t.count >= 2 ? 'medium' : 'low'
  })),

  recommendations: prioritizedRecommendations.map(r => ({
    action: r.action,
    rationale: r.rationale || 'Based on analysis findings',
    priority: r.priority || 'medium',
    source_perspective: r.perspective
  })),

  open_questions: allAnalyses
    .flatMap(a => a.open_questions || [])
    .filter((q, i, arr) => arr.indexOf(q) === i)
    .slice(0, 5),

  follow_up_suggestions: generateFollowUps(conclusions),

  decision_trail: decisionSummary,

  cross_perspective_synthesis: {
    convergent_themes: themes.filter(t => t.perspectives.length > 1),
    conflicts_resolved: conflicts,
    unique_contributions: allAnalyses.map(a => ({
      perspective: a.perspective,
      unique_insights: (a.key_insights || []).slice(0, 2)
    }))
  },

  _metadata: {
    explorations: allExplorations.length,
    analyses: allAnalyses.length,
    discussions: allDiscussions.length,
    decisions: decisionTrail.length,
    synthesis_strategy: strategy
  }
}

function generateSummary(themes, findings, discussions) {
  const topThemes = themes.slice(0, 3).map(t => t.theme).join('; ')
  const roundCount = discussions.length
  return `Analysis of "${topic}" identified ${themes.length} key themes across ${allAnalyses.length} perspective(s) and ${roundCount} discussion round(s). Top themes: ${topThemes}`
}

function generateFollowUps(conclusions) {
  const suggestions = []
  if ((conclusions.open_questions || []).length > 2) {
    suggestions.push({ type: 'deeper-analysis', summary: 'Further analysis needed for open questions' })
  }
  if ((conclusions.recommendations || []).some(r => r.priority === 'high')) {
    suggestions.push({ type: 'issue-creation', summary: 'Create issues for high-priority recommendations' })
  }
  suggestions.push({ type: 'implementation-plan', summary: 'Generate implementation plan from recommendations' })
  return suggestions
}
```

## Output Format

```json
{
  "session_id": "UAN-auth-analysis-2026-02-18",
  "topic": "认证架构优化",
  "completed": "2026-02-18T...",
  "total_rounds": 2,
  "summary": "Analysis identified 5 key themes...",
  "key_conclusions": [
    {"point": "JWT stateless approach is sound", "evidence": "technical, architectural", "confidence": "high"}
  ],
  "recommendations": [
    {"action": "Add rate limiting", "rationale": "Prevent brute force", "priority": "high"}
  ],
  "open_questions": ["Token rotation strategy?"],
  "decision_trail": [
    {"round": 1, "decision": "Focus on security", "context": "User preference"}
  ]
}
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No analyses available | Synthesize from explorations only |
| Single perspective only | Generate focused synthesis without cross-perspective |
| Irreconcilable conflicts | Present both sides with trade-off analysis |
| Empty discussion rounds | Skip discussion evolution, focus on analysis results |
| Shared memory corrupted | Rebuild from individual JSON files |
