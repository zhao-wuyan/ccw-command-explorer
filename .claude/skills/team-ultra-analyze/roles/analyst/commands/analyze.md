# Command: analyze

> CLI 多视角深度分析。基于探索结果，通过 CLI 工具执行深度分析并生成结构化洞察。

## When to Use

- Phase 3 of Analyst
- 探索结果已就绪，需要深度分析
- 每个 ANALYZE-* 任务触发一次

**Trigger conditions**:
- Analyst Phase 2 完成后（上下文已加载）
- 方向调整时创建的 ANALYZE-fix 任务

## Strategy

### Delegation Mode

**Mode**: CLI（通过 ccw cli 执行分析，Bash run_in_background: true）

### Decision Logic

```javascript
// 根据 perspective 选择 CLI 工具和分析模板
function buildAnalysisConfig(perspective, isDirectionFix) {
  const configs = {
    'technical': {
      tool: 'gemini',
      rule: 'analysis-analyze-code-patterns',
      focus: 'Implementation patterns, code quality, technical debt, feasibility',
      tasks: [
        'Analyze code structure and organization patterns',
        'Identify technical debt and anti-patterns',
        'Evaluate error handling and edge cases',
        'Assess testing coverage and quality'
      ]
    },
    'architectural': {
      tool: 'claude',
      rule: 'analysis-review-architecture',
      focus: 'System design, scalability, component coupling, boundaries',
      tasks: [
        'Evaluate module boundaries and coupling',
        'Analyze data flow and component interactions',
        'Assess scalability and extensibility',
        'Review design pattern usage and consistency'
      ]
    },
    'business': {
      tool: 'codex',
      rule: 'analysis-analyze-code-patterns',
      focus: 'Business logic, domain models, value delivery, stakeholder impact',
      tasks: [
        'Map business logic to code implementation',
        'Identify domain model completeness',
        'Evaluate business rule enforcement',
        'Assess impact on stakeholders and users'
      ]
    },
    'domain_expert': {
      tool: 'gemini',
      rule: 'analysis-analyze-code-patterns',
      focus: 'Domain-specific patterns, standards compliance, best practices',
      tasks: [
        'Compare against domain best practices',
        'Check standards and convention compliance',
        'Identify domain-specific anti-patterns',
        'Evaluate domain model accuracy'
      ]
    }
  }

  const config = configs[perspective] || configs['technical']

  if (isDirectionFix) {
    config.rule = 'analysis-diagnose-bug-root-cause'
    config.tasks = [
      'Re-analyze from adjusted perspective',
      'Identify previously missed patterns',
      'Generate new insights from fresh angle',
      'Update discussion points based on direction change'
    ]
  }

  return config
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
const config = buildAnalysisConfig(perspective, isDirectionFix)

// 构建探索上下文摘要
const explorationSummary = `
PRIOR EXPLORATION CONTEXT:
- Key files: ${(explorationContext.relevant_files || []).slice(0, 8).map(f => f.path || f).join(', ')}
- Patterns found: ${(explorationContext.patterns || []).slice(0, 5).join('; ')}
- Key findings: ${(explorationContext.key_findings || []).slice(0, 5).join('; ')}
- Questions from exploration: ${(explorationContext.questions_for_analysis || []).slice(0, 3).join('; ')}`
```

### Step 2: Execute CLI Analysis

```javascript
const cliPrompt = `PURPOSE: ${isDirectionFix
  ? `Supplementary analysis with adjusted focus on "${adjustedFocus}" for topic "${topic}"`
  : `Deep analysis of "${topic}" from ${perspective} perspective`}
Success: ${isDirectionFix
  ? 'New insights from adjusted direction with clear evidence'
  : 'Actionable insights with confidence levels and evidence references'}

${explorationSummary}

TASK:
${config.tasks.map(t => `• ${t}`).join('\n')}
• Generate structured findings with confidence levels (high/medium/low)
• Identify discussion points requiring user input
• List open questions needing further exploration

MODE: analysis
CONTEXT: @**/* | Topic: ${topic}
EXPECTED: JSON-structured analysis with sections: key_insights (with confidence), key_findings (with evidence), discussion_points, open_questions, recommendations (with priority)
CONSTRAINTS: Focus on ${perspective} perspective | ${dimensions.join(', ')} dimensions${isDirectionFix ? ` | Adjusted focus: ${adjustedFocus}` : ''}`

Bash({
  command: `ccw cli -p "${cliPrompt}" --tool ${config.tool} --mode analysis --rule ${config.rule}`,
  run_in_background: true
})

// ⚠️ STOP POINT: Wait for CLI callback before continuing
```

### Step 3: Result Processing

```javascript
// CLI 结果返回后，解析并结构化
const outputPath = `${sessionFolder}/analyses/analysis-${analyzeNum}.json`

// 从 CLI 输出中提取结构化数据
// CLI 输出通常是 markdown，需要解析为 JSON
const analysisResult = {
  perspective,
  dimensions,
  is_direction_fix: isDirectionFix,
  adjusted_focus: adjustedFocus || null,
  key_insights: [
    // 从 CLI 输出提取，每个包含 {insight, confidence, evidence}
  ],
  key_findings: [
    // 具体发现 {finding, file_ref, impact}
  ],
  discussion_points: [
    // 需要用户输入的讨论要点
  ],
  open_questions: [
    // 未解决的问题
  ],
  recommendations: [
    // {action, rationale, priority}
  ],
  _metadata: {
    cli_tool: config.tool,
    cli_rule: config.rule,
    perspective,
    is_direction_fix: isDirectionFix,
    timestamp: new Date().toISOString()
  }
}

Write(outputPath, JSON.stringify(analysisResult, null, 2))
```

## Output Format

```json
{
  "perspective": "technical",
  "dimensions": ["architecture", "implementation"],
  "is_direction_fix": false,
  "key_insights": [
    {"insight": "Authentication uses stateless JWT", "confidence": "high", "evidence": "src/auth/jwt.ts:L42"}
  ],
  "key_findings": [
    {"finding": "No rate limiting on login endpoint", "file_ref": "src/routes/auth.ts:L15", "impact": "Security risk"}
  ],
  "discussion_points": [
    "Should we implement token rotation for refresh tokens?"
  ],
  "open_questions": [
    "What is the expected concurrent user load?"
  ],
  "recommendations": [
    {"action": "Add rate limiting to auth endpoints", "rationale": "Prevent brute force attacks", "priority": "high"}
  ],
  "_metadata": {"cli_tool": "gemini", "cli_rule": "analysis-analyze-code-patterns", "timestamp": "..."}
}
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| CLI tool unavailable | Try fallback: gemini → codex → claude |
| CLI timeout | Retry with shorter prompt, or use exploration results directly |
| CLI returns empty | Use exploration findings as-is, note analysis gap |
| Invalid CLI output | Extract what's parseable, fill gaps with defaults |
| Exploration context missing | Analyze with topic keywords only |
