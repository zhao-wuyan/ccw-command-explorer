# Action: Debug With File

假设驱动调试，记录理解演变到 understanding.md，支持 Gemini 辅助分析和假设生成。

## Purpose

执行假设驱动的调试流程，包括：
- 定位错误源
- 生成可测试假设
- 添加 NDJSON 日志
- 分析日志证据
- 纠正错误理解
- 应用修复

## Preconditions

- [ ] state.initialized === true
- [ ] state.status === 'running'

## Session Setup

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

const sessionFolder = `.workflow/.loop/${state.session_id}`
const debugFolder = `${sessionFolder}/debug`
const understandingPath = `${debugFolder}/understanding.md`
const hypothesesPath = `${debugFolder}/hypotheses.json`
const debugLogPath = `${debugFolder}/debug.log`
```

---

## Mode Detection

```javascript
// 自动检测模式
const understandingExists = fs.existsSync(understandingPath)
const logHasContent = fs.existsSync(debugLogPath) && fs.statSync(debugLogPath).size > 0

const debugMode = logHasContent ? 'analyze' : (understandingExists ? 'continue' : 'explore')

console.log(`Debug mode: ${debugMode}`)
```

---

## Explore Mode (首次调试)

### Step 1.1: 定位错误源

```javascript
if (debugMode === 'explore') {
  // 询问用户 bug 描述
  const bugInput = await AskUserQuestion({
    questions: [{
      question: "请描述遇到的 bug 或错误信息：",
      header: "Bug 描述",
      multiSelect: false,
      options: [
        { label: "手动输入", description: "输入错误描述或堆栈" },
        { label: "从测试失败", description: "从验证阶段的失败测试中获取" }
      ]
    }]
  })

  const bugDescription = bugInput["Bug 描述"]

  // 提取关键词并搜索
  const searchResults = await Task({
    subagent_type: 'Explore',
    run_in_background: false,
    prompt: `Search codebase for error patterns related to: ${bugDescription}`
  })

  // 分析搜索结果，识别受影响的位置
  const affectedLocations = analyzeSearchResults(searchResults)
}
```

### Step 1.2: 记录初始理解

```javascript
// 创建 understanding.md
const initialUnderstanding = `# Understanding Document

**Session ID**: ${state.session_id}
**Bug Description**: ${bugDescription}
**Started**: ${getUtc8ISOString()}

---

## Exploration Timeline

### Iteration 1 - Initial Exploration (${getUtc8ISOString()})

#### Current Understanding

Based on bug description and initial code search:

- Error pattern: ${errorPattern}
- Affected areas: ${affectedLocations.map(l => l.file).join(', ')}
- Initial hypothesis: ${initialThoughts}

#### Evidence from Code Search

${searchResults.map(r => `
**Keyword: "${r.keyword}"**
- Found in: ${r.files.join(', ')}
- Key findings: ${r.insights}
`).join('\n')}

#### Next Steps

- Generate testable hypotheses
- Add instrumentation
- Await reproduction

---

## Current Consolidated Understanding

${initialConsolidatedUnderstanding}
`

Write(understandingPath, initialUnderstanding)
```

### Step 1.3: Gemini 辅助假设生成

```bash
ccw cli -p "
PURPOSE: Generate debugging hypotheses for: ${bugDescription}
Success criteria: Testable hypotheses with clear evidence criteria

TASK:
• Analyze error pattern and code search results
• Identify 3-5 most likely root causes
• For each hypothesis, specify:
  - What might be wrong
  - What evidence would confirm/reject it
  - Where to add instrumentation
• Rank by likelihood

MODE: analysis

CONTEXT: @${understandingPath} | Search results in understanding.md

EXPECTED:
- Structured hypothesis list (JSON format)
- Each hypothesis with: id, description, testable_condition, logging_point, evidence_criteria
- Likelihood ranking (1=most likely)

CONSTRAINTS: Focus on testable conditions
" --tool gemini --mode analysis --rule analysis-diagnose-bug-root-cause
```

### Step 1.4: 保存假设

```javascript
const hypotheses = {
  iteration: 1,
  timestamp: getUtc8ISOString(),
  bug_description: bugDescription,
  hypotheses: [
    {
      id: "H1",
      description: "...",
      testable_condition: "...",
      logging_point: "file.ts:func:42",
      evidence_criteria: {
        confirm: "...",
        reject: "..."
      },
      likelihood: 1,
      status: "pending"
    }
    // ...
  ],
  gemini_insights: "...",
  corrected_assumptions: []
}

Write(hypothesesPath, JSON.stringify(hypotheses, null, 2))
```

### Step 1.5: 添加 NDJSON 日志

```javascript
// 为每个假设添加日志点
for (const hypothesis of hypotheses.hypotheses) {
  const [file, func, line] = hypothesis.logging_point.split(':')

  const logStatement = `console.log(JSON.stringify({
    hid: "${hypothesis.id}",
    ts: Date.now(),
    func: "${func}",
    data: { /* 相关数据 */ }
  }))`

  // 使用 Edit 工具添加日志
  // ...
}
```

---

## Analyze Mode (有日志后)

### Step 2.1: 解析调试日志

```javascript
if (debugMode === 'analyze') {
  // 读取 NDJSON 日志
  const logContent = Read(debugLogPath)
  const entries = logContent.split('\n')
    .filter(l => l.trim())
    .map(l => JSON.parse(l))

  // 按假设分组
  const byHypothesis = groupBy(entries, 'hid')
}
```

### Step 2.2: Gemini 辅助证据分析

```bash
ccw cli -p "
PURPOSE: Analyze debug log evidence to validate/correct hypotheses for: ${bugDescription}
Success criteria: Clear verdict per hypothesis + corrected understanding

TASK:
• Parse log entries by hypothesis
• Evaluate evidence against expected criteria
• Determine verdict: confirmed | rejected | inconclusive
• Identify incorrect assumptions from previous understanding
• Suggest corrections to understanding

MODE: analysis

CONTEXT:
@${debugLogPath}
@${understandingPath}
@${hypothesesPath}

EXPECTED:
- Per-hypothesis verdict with reasoning
- Evidence summary
- List of incorrect assumptions with corrections
- Updated consolidated understanding
- Root cause if confirmed, or next investigation steps

CONSTRAINTS: Evidence-based reasoning only, no speculation
" --tool gemini --mode analysis --rule analysis-diagnose-bug-root-cause
```

### Step 2.3: 更新理解文档

```javascript
// 追加新迭代到 understanding.md
const iteration = state.debug.iteration + 1

const analysisEntry = `
### Iteration ${iteration} - Evidence Analysis (${getUtc8ISOString()})

#### Log Analysis Results

${results.map(r => `
**${r.id}**: ${r.verdict.toUpperCase()}
- Evidence: ${JSON.stringify(r.evidence)}
- Reasoning: ${r.reason}
`).join('\n')}

#### Corrected Understanding

Previous misunderstandings identified and corrected:

${corrections.map(c => `
- ~~${c.wrong}~~ → ${c.corrected}
  - Why wrong: ${c.reason}
  - Evidence: ${c.evidence}
`).join('\n')}

#### New Insights

${newInsights.join('\n- ')}

#### Gemini Analysis

${geminiAnalysis}

${confirmedHypothesis ? `
#### Root Cause Identified

**${confirmedHypothesis.id}**: ${confirmedHypothesis.description}

Evidence supporting this conclusion:
${confirmedHypothesis.supportingEvidence}
` : `
#### Next Steps

${nextSteps}
`}

---

## Current Consolidated Understanding (Updated)

### What We Know

- ${validUnderstanding1}
- ${validUnderstanding2}

### What Was Disproven

- ~~${wrongAssumption}~~ (Evidence: ${disproofEvidence})

### Current Investigation Focus

${currentFocus}

### Remaining Questions

- ${openQuestion1}
- ${openQuestion2}
`

const existingContent = Read(understandingPath)
Write(understandingPath, existingContent + analysisEntry)
```

### Step 2.4: 更新假设状态

```javascript
const hypothesesData = JSON.parse(Read(hypothesesPath))

// 更新假设状态
hypothesesData.hypotheses = hypothesesData.hypotheses.map(h => ({
  ...h,
  status: results.find(r => r.id === h.id)?.verdict || h.status,
  evidence: results.find(r => r.id === h.id)?.evidence || h.evidence,
  verdict_reason: results.find(r => r.id === h.id)?.reason || h.verdict_reason
}))

hypothesesData.iteration++
hypothesesData.timestamp = getUtc8ISOString()

Write(hypothesesPath, JSON.stringify(hypothesesData, null, 2))
```

---

## Fix & Verification

### Step 3.1: 应用修复

```javascript
if (confirmedHypothesis) {
  console.log(`\n根因确认: ${confirmedHypothesis.description}`)
  console.log('准备应用修复...')

  // 使用 Gemini 生成修复代码
  const fixPrompt = `
PURPOSE: Fix the identified root cause
Root Cause: ${confirmedHypothesis.description}
Evidence: ${confirmedHypothesis.supportingEvidence}

TASK:
• Generate fix code
• Ensure backward compatibility
• Add tests if needed

MODE: write

CONTEXT: @${confirmedHypothesis.logging_point.split(':')[0]}

EXPECTED: Fixed code + verification steps
`

  await Bash({
    command: `ccw cli -p "${fixPrompt}" --tool gemini --mode write --rule development-debug-runtime-issues`,
    run_in_background: false
  })
}
```

### Step 3.2: 记录解决方案

```javascript
const resolutionEntry = `
### Resolution (${getUtc8ISOString()})

#### Fix Applied

- Modified files: ${modifiedFiles.join(', ')}
- Fix description: ${fixDescription}
- Root cause addressed: ${rootCause}

#### Verification Results

${verificationResults}

#### Lessons Learned

1. ${lesson1}
2. ${lesson2}

#### Key Insights for Future

- ${insight1}
- ${insight2}
`

const existingContent = Read(understandingPath)
Write(understandingPath, existingContent + resolutionEntry)
```

### Step 3.3: 清理日志

```javascript
// 移除调试日志
// (可选，根据用户选择)
```

---

## State Updates

```javascript
return {
  stateUpdates: {
    debug: {
      current_bug: bugDescription,
      hypotheses: hypothesesData.hypotheses,
      confirmed_hypothesis: confirmedHypothesis?.id || null,
      iteration: hypothesesData.iteration,
      last_analysis_at: getUtc8ISOString(),
      understanding_updated: true
    },
    last_action: 'action-debug-with-file'
  },
  continue: true,
  message: confirmedHypothesis
    ? `根因确认: ${confirmedHypothesis.description}\n修复已应用，请验证`
    : `分析完成，需要更多证据\n请复现 bug 后再次执行`
}
```

## Error Handling

| Error Type | Recovery |
|------------|----------|
| 空 debug.log | 提示用户复现 bug |
| 所有假设被否定 | 使用 Gemini 生成新假设 |
| 修复无效 | 记录失败尝试，迭代 |
| >5 迭代 | 建议升级到 /workflow:lite-fix |
| Gemini 不可用 | 回退到手动分析 |

## Understanding Document Template

参考 [templates/understanding-template.md](../../templates/understanding-template.md)

## CLI Integration

### 假设生成
```bash
ccw cli -p "PURPOSE: Generate debugging hypotheses..." --tool gemini --mode analysis --rule analysis-diagnose-bug-root-cause
```

### 证据分析
```bash
ccw cli -p "PURPOSE: Analyze debug log evidence..." --tool gemini --mode analysis --rule analysis-diagnose-bug-root-cause
```

### 生成修复
```bash
ccw cli -p "PURPOSE: Fix the identified root cause..." --tool gemini --mode write --rule development-debug-runtime-issues
```

## Next Actions (Hints)

- 根因确认: `action-validate-with-file` (验证修复)
- 需要更多证据: 等待用户复现，再次执行此动作
- 所有假设否定: 重新执行此动作生成新假设
- 用户选择: `action-menu` (返回菜单)
