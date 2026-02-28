# Command: deepen

> 深入探索与补充分析。根据讨论类型执行针对性的代码探索或 CLI 分析。

## When to Use

- Phase 3 of Discussant
- 用户反馈已收集，需要深入处理
- 每个 DISCUSS-* 任务触发一次

**Trigger conditions**:
- initial: 首轮讨论，汇总分析结果
- deepen: 继续深入当前方向
- direction-adjusted: 方向调整后重新分析
- specific-questions: 回答用户具体问题

## Strategy

### Delegation Mode

**Mode**: Mixed（简单汇总内联，深入探索用 subagent/CLI）

### Decision Logic

```javascript
function selectDeepenStrategy(discussType, complexity) {
  const strategies = {
    'initial': {
      mode: 'inline',
      description: 'Summarize all analysis results into discussion format'
    },
    'deepen': {
      mode: complexity === 'High' ? 'cli' : 'subagent',
      description: 'Further exploration in current direction'
    },
    'direction-adjusted': {
      mode: 'cli',
      description: 'Re-analyze from new perspective'
    },
    'specific-questions': {
      mode: 'subagent',
      description: 'Targeted exploration to answer questions'
    }
  }
  return strategies[discussType] || strategies['initial']
}
```

## Execution Steps

### Step 1: Strategy Selection

```javascript
const strategy = selectDeepenStrategy(discussType, assessComplexity(userFeedback))
```

### Step 2: Execute by Type

#### Initial Discussion

```javascript
function processInitialDiscussion() {
  // 汇总所有分析结果
  const summary = {
    perspectives_analyzed: allAnalyses.map(a => a.perspective),
    total_insights: currentInsights.length,
    total_findings: currentFindings.length,
    convergent_themes: identifyConvergentThemes(allAnalyses),
    conflicting_views: identifyConflicts(allAnalyses),
    top_discussion_points: discussionPoints.slice(0, 5),
    open_questions: openQuestions.slice(0, 5)
  }

  roundContent.updated_understanding.new_insights = summary.convergent_themes
  roundContent.new_findings = currentFindings.slice(0, 10)
  roundContent.new_questions = openQuestions.slice(0, 5)
}

function identifyConvergentThemes(analyses) {
  // 跨视角找共同主题
  const allInsights = analyses.flatMap(a =>
    (a.key_insights || []).map(i => typeof i === 'string' ? i : i.insight)
  )
  // 简单去重 + 聚合
  return [...new Set(allInsights)].slice(0, 5)
}

function identifyConflicts(analyses) {
  // 识别视角间的矛盾
  return [] // 由实际分析结果决定
}
```

#### Deepen Discussion

```javascript
function processDeepenDiscussion() {
  // 在当前方向上进一步探索
  Task({
    subagent_type: "cli-explore-agent",
    run_in_background: false,
    description: `Deepen exploration: ${topic} (round ${round})`,
    prompt: `
## Context
Topic: ${topic}
Round: ${round}
Previous findings: ${currentFindings.slice(0, 5).join('; ')}
Open questions: ${openQuestions.slice(0, 3).join('; ')}

## MANDATORY FIRST STEPS
1. Focus on open questions from previous analysis
2. Search for specific patterns mentioned in findings
3. Look for edge cases and exceptions

## Exploration Focus
- Deepen understanding of confirmed patterns
- Investigate open questions
- Find additional evidence for uncertain insights

## Output
Write to: ${sessionFolder}/discussions/deepen-${discussNum}.json
Schema: {new_findings, answered_questions, remaining_questions, evidence}
`
  })

  // 读取深入探索结果
  let deepenResult = {}
  try {
    deepenResult = JSON.parse(Read(`${sessionFolder}/discussions/deepen-${discussNum}.json`))
  } catch {}

  roundContent.updated_understanding.new_insights = deepenResult.new_findings || []
  roundContent.new_findings = deepenResult.new_findings || []
  roundContent.new_questions = deepenResult.remaining_questions || []
}
```

#### Direction Adjusted

```javascript
function processDirectionAdjusted() {
  // 方向调整后，通过 CLI 重新分析
  Bash({
    command: `ccw cli -p "PURPOSE: Re-analyze '${topic}' with adjusted focus on '${userFeedback}'
Success: New insights from adjusted direction

PREVIOUS ANALYSIS CONTEXT:
- Previous insights: ${currentInsights.slice(0, 5).map(i => typeof i === 'string' ? i : i.insight).join('; ')}
- Direction change reason: User requested focus on '${userFeedback}'

TASK:
• Re-evaluate findings from new perspective
• Identify what changes with adjusted focus
• Find new patterns relevant to adjusted direction
• Note what previous findings remain valid

MODE: analysis
CONTEXT: @**/* | Topic: ${topic}
EXPECTED: Updated analysis with: validated findings, new insights, invalidated assumptions
CONSTRAINTS: Focus on ${userFeedback}
" --tool gemini --mode analysis`,
    run_in_background: true
  })

  // ⚠️ STOP: Wait for CLI callback

  roundContent.updated_understanding.corrected = ['Direction adjusted per user request']
  roundContent.updated_understanding.new_insights = [] // From CLI result
}
```

#### Specific Questions

```javascript
function processSpecificQuestions() {
  // 针对用户问题进行探索
  Task({
    subagent_type: "cli-explore-agent",
    run_in_background: false,
    description: `Answer questions: ${topic}`,
    prompt: `
## Context
Topic: ${topic}
User questions: ${userFeedback}
Known findings: ${currentFindings.slice(0, 5).join('; ')}

## MANDATORY FIRST STEPS
1. Search for code related to user's questions
2. Trace execution paths relevant to questions
3. Check configuration and environment factors

## Output
Write to: ${sessionFolder}/discussions/questions-${discussNum}.json
Schema: {answers: [{question, answer, evidence, confidence}], follow_up_questions}
`
  })

  let questionResult = {}
  try {
    questionResult = JSON.parse(Read(`${sessionFolder}/discussions/questions-${discussNum}.json`))
  } catch {}

  roundContent.updated_understanding.new_insights =
    (questionResult.answers || []).map(a => `Q: ${a.question} → A: ${a.answer}`)
  roundContent.new_questions = questionResult.follow_up_questions || []
}
```

### Step 3: Result Processing

```javascript
// 结果已写入 roundContent，由 role.md Phase 4 处理
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| cli-explore-agent fails | Use existing analysis results, note limitation |
| CLI timeout | Report partial results |
| No previous analyses | Process as initial with empty context |
| User feedback unparseable | Treat as 'deepen' type |
