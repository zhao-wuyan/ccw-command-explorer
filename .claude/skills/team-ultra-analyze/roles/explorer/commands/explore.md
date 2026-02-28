# Command: explore

> cli-explore-agent 并行代码库探索。根据话题和视角，通过 subagent 收集代码库上下文。

## When to Use

- Phase 3 of Explorer
- 需要收集代码库上下文供后续分析
- 每个 EXPLORE-* 任务触发一次

**Trigger conditions**:
- Explorer Phase 2 完成后
- 任务包含明确的 perspective 和 dimensions

## Strategy

### Delegation Mode

**Mode**: Subagent（cli-explore-agent 执行实际探索）

### Decision Logic

```javascript
// 根据 perspective 确定探索策略
function buildExplorationStrategy(perspective, dimensions, topic) {
  const strategies = {
    'general': {
      focus: 'Overall codebase structure and patterns',
      searches: [topic, ...dimensions],
      depth: 'broad'
    },
    'technical': {
      focus: 'Implementation details, code patterns, technical feasibility',
      searches: [`${topic} implementation`, `${topic} pattern`, `${topic} handler`],
      depth: 'medium'
    },
    'architectural': {
      focus: 'System design, module boundaries, component interactions',
      searches: [`${topic} module`, `${topic} service`, `${topic} interface`],
      depth: 'broad'
    },
    'business': {
      focus: 'Business logic, domain models, value flows',
      searches: [`${topic} model`, `${topic} domain`, `${topic} workflow`],
      depth: 'medium'
    },
    'domain_expert': {
      focus: 'Domain-specific patterns, standards compliance, best practices',
      searches: [`${topic} standard`, `${topic} convention`, `${topic} best practice`],
      depth: 'deep'
    }
  }
  return strategies[perspective] || strategies['general']
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
const strategy = buildExplorationStrategy(perspective, dimensions, topic)
const exploreNum = task.subject.match(/EXPLORE-(\d+)/)?.[1] || '001'
const outputPath = `${sessionFolder}/explorations/exploration-${exploreNum}.json`
```

### Step 2: Execute Exploration

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: `Explore codebase: ${topic} (${perspective})`,
  prompt: `
## Analysis Context
Topic: ${topic}
Perspective: ${perspective} — ${strategy.focus}
Dimensions: ${dimensions.join(', ')}
Session: ${sessionFolder}

## MANDATORY FIRST STEPS
1. Run: ccw tool exec get_modules_by_depth '{}'
2. Execute searches: ${strategy.searches.map(s => `"${s}"`).join(', ')}
3. Run: ccw spec load --category exploration

## Exploration Focus (${perspective} angle)
- **Depth**: ${strategy.depth}
- **Focus**: ${strategy.focus}
${dimensions.map(d => `- ${d}: Identify relevant code patterns, structures, and relationships`).join('\n')}

## Search Strategy
${strategy.searches.map((s, i) => `${i + 1}. Search for: "${s}" — find related files, functions, types`).join('\n')}

## Additional Exploration
- Identify entry points related to the topic
- Map dependencies between relevant modules
- Note any configuration or environment dependencies
- Look for test files that reveal expected behavior

## Output
Write findings to: ${outputPath}

Schema:
{
  "perspective": "${perspective}",
  "relevant_files": [
    {"path": "string", "relevance": "high|medium|low", "summary": "what this file does"}
  ],
  "patterns": ["pattern descriptions found in codebase"],
  "key_findings": ["important discoveries"],
  "module_map": {"module_name": ["related_files"]},
  "questions_for_analysis": ["questions that need deeper analysis"],
  "_metadata": {
    "agent": "cli-explore-agent",
    "perspective": "${perspective}",
    "search_queries": ${JSON.stringify(strategy.searches)},
    "timestamp": "ISO string"
  }
}
`
})
```

### Step 3: Result Processing

```javascript
// 验证输出文件
let result = {}
try {
  result = JSON.parse(Read(outputPath))
} catch {
  // Fallback: ACE search
  const aceResults = mcp__ace-tool__search_context({
    project_root_path: ".",
    query: `${topic} ${perspective}`
  })

  result = {
    perspective,
    relevant_files: [],
    patterns: [],
    key_findings: [`ACE fallback: ${aceResults?.summary || 'No results'}`],
    questions_for_analysis: [`What is the ${perspective} perspective on ${topic}?`],
    _metadata: {
      agent: 'ace-fallback',
      perspective,
      timestamp: new Date().toISOString()
    }
  }
  Write(outputPath, JSON.stringify(result, null, 2))
}

// 质量验证
const quality = {
  has_files: (result.relevant_files?.length || 0) > 0,
  has_findings: (result.key_findings?.length || 0) > 0,
  has_patterns: (result.patterns?.length || 0) > 0
}

if (!quality.has_files && !quality.has_findings) {
  // 补充搜索
  const supplementary = mcp__ace-tool__search_context({
    project_root_path: ".",
    query: topic
  })
  // Merge supplementary results
}
```

## Output Format

```json
{
  "perspective": "technical",
  "relevant_files": [
    {"path": "src/auth/handler.ts", "relevance": "high", "summary": "Authentication request handler"}
  ],
  "patterns": ["Repository pattern used for data access", "Middleware chain for auth"],
  "key_findings": ["JWT tokens stored in HTTP-only cookies", "Rate limiting at gateway level"],
  "module_map": {"auth": ["src/auth/handler.ts", "src/auth/middleware.ts"]},
  "questions_for_analysis": ["Is the token refresh mechanism secure?"],
  "_metadata": {"agent": "cli-explore-agent", "perspective": "technical", "timestamp": "..."}
}
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| cli-explore-agent unavailable | Fall back to ACE search + Grep |
| Agent produces no output file | Create minimal result with ACE fallback |
| Agent timeout | Use partial results if available |
| Invalid JSON output | Attempt repair, fall back to raw text extraction |
| Session folder missing | Create directory, continue |
