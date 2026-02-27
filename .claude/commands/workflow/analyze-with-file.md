---
name: analyze-with-file
description: Interactive collaborative analysis with documented discussions, CLI-assisted exploration, and evolving understanding
argument-hint: "[-y|--yes] [-c|--continue] \"topic or question\""
allowed-tools: TodoWrite(*), Task(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-confirm exploration decisions, use recommended analysis angles.

# Workflow Analyze-With-File Command (/workflow:analyze-with-file)

## Overview

Interactive collaborative analysis workflow with **documented discussion process**. Records understanding evolution, facilitates multi-round Q&A, and uses CLI tools (Gemini/Codex) for deep exploration.

**Core workflow**: Topic → Explore → Discuss → Document → Refine → Conclude

**Key features**:
- **discussion.md**: Timeline of discussions and understanding evolution
- **Multi-round Q&A**: Iterative clarification with user
- **CLI-assisted exploration**: Gemini/Codex for codebase and concept analysis
- **Consolidated insights**: Synthesizes discussions into actionable conclusions
- **Flexible continuation**: Resume analysis sessions to build on previous work

## Usage

```bash
/workflow:analyze-with-file [FLAGS] <TOPIC_OR_QUESTION>

# Flags
-y, --yes              Skip confirmations, use recommended settings
-c, --continue         Continue existing session (auto-detected if exists)

# Arguments
<topic-or-question>    Analysis topic, question, or concept to explore (required)

# Examples
/workflow:analyze-with-file "如何优化这个项目的认证架构"
/workflow:analyze-with-file --continue "认证架构"              # Continue existing session
/workflow:analyze-with-file -y "性能瓶颈分析"                  # Auto mode
```

## Execution Process

```
Session Detection:
   ├─ Check if analysis session exists for topic
   ├─ EXISTS + discussion.md exists → Continue mode
   └─ NOT_FOUND → New session mode

Phase 1: Topic Understanding
   ├─ Parse topic/question
   ├─ Identify analysis dimensions (architecture, implementation, concept, etc.)
   ├─ Initial scoping with user (AskUserQuestion)
   └─ Document initial understanding in discussion.md

Phase 2: CLI Exploration (Parallel)
   ├─ Launch cli-explore-agent for codebase context
   ├─ Use Gemini/Codex for deep analysis
   └─ Aggregate findings into exploration summary

Phase 3: Interactive Discussion (Multi-Round)
   ├─ Present exploration findings
   ├─ Facilitate Q&A with user (AskUserQuestion)
   ├─ Capture user insights and requirements
   ├─ Update discussion.md with each round
   └─ Repeat until user is satisfied or clarity achieved

Phase 4: Synthesis & Conclusion
   ├─ Consolidate all insights
   ├─ Update discussion.md with conclusions
   ├─ Generate actionable recommendations
   └─ Optional: Create follow-up tasks or issues

Output:
   ├─ .workflow/.analysis/{slug}-{date}/discussion.md (evolving document)
   ├─ .workflow/.analysis/{slug}-{date}/explorations.json (CLI findings)
   └─ .workflow/.analysis/{slug}-{date}/conclusions.json (final synthesis)
```

## Implementation

### Session Setup & Mode Detection

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

const topicSlug = topic_or_question.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').substring(0, 40)
const dateStr = getUtc8ISOString().substring(0, 10)

const sessionId = `ANL-${topicSlug}-${dateStr}`
const sessionFolder = `.workflow/.analysis/${sessionId}`
const discussionPath = `${sessionFolder}/discussion.md`
const explorationsPath = `${sessionFolder}/explorations.json`
const conclusionsPath = `${sessionFolder}/conclusions.json`

// Auto-detect mode
const sessionExists = fs.existsSync(sessionFolder)
const hasDiscussion = sessionExists && fs.existsSync(discussionPath)
const forcesContinue = $ARGUMENTS.includes('--continue') || $ARGUMENTS.includes('-c')

const mode = (hasDiscussion || forcesContinue) ? 'continue' : 'new'

if (!sessionExists) {
  bash(`mkdir -p ${sessionFolder}`)
}
```

---

### Phase 1: Topic Understanding

**Step 1.1: Parse Topic & Identify Dimensions**

```javascript
// Analyze topic to determine analysis dimensions
const ANALYSIS_DIMENSIONS = {
  architecture: ['架构', 'architecture', 'design', 'structure', '设计'],
  implementation: ['实现', 'implement', 'code', 'coding', '代码'],
  performance: ['性能', 'performance', 'optimize', 'bottleneck', '优化'],
  security: ['安全', 'security', 'auth', 'permission', '权限'],
  concept: ['概念', 'concept', 'theory', 'principle', '原理'],
  comparison: ['比较', 'compare', 'vs', 'difference', '区别'],
  decision: ['决策', 'decision', 'choice', 'tradeoff', '选择']
}

function identifyDimensions(topic) {
  const text = topic.toLowerCase()
  const matched = []

  for (const [dimension, keywords] of Object.entries(ANALYSIS_DIMENSIONS)) {
    if (keywords.some(k => text.includes(k))) {
      matched.push(dimension)
    }
  }

  return matched.length > 0 ? matched : ['general']
}

const dimensions = identifyDimensions(topic_or_question)
```

**Step 1.2: Initial Scoping (New Session Only)**

```javascript
const autoYes = $ARGUMENTS.includes('--yes') || $ARGUMENTS.includes('-y')

if (mode === 'new' && !autoYes) {
  // Ask user to scope the analysis
  AskUserQuestion({
    questions: [
      {
        question: `分析范围: "${topic_or_question}"\n\n您想重点关注哪些方面?`,
        header: "Focus",
        multiSelect: true,
        options: [
          { label: "代码实现", description: "分析现有代码实现" },
          { label: "架构设计", description: "架构层面的分析" },
          { label: "最佳实践", description: "行业最佳实践对比" },
          { label: "问题诊断", description: "识别潜在问题" }
        ]
      },
      {
        question: "分析深度?",
        header: "Depth",
        multiSelect: false,
        options: [
          { label: "Quick Overview", description: "快速概览 (10-15分钟)" },
          { label: "Standard Analysis", description: "标准分析 (30-60分钟)" },
          { label: "Deep Dive", description: "深度分析 (1-2小时)" }
        ]
      }
    ]
  })
}
```

**Step 1.3: Create/Update discussion.md**

For new session:
```markdown
# Analysis Discussion

**Session ID**: ${sessionId}
**Topic**: ${topic_or_question}
**Started**: ${getUtc8ISOString()}
**Dimensions**: ${dimensions.join(', ')}

---

## User Context

**Focus Areas**: ${userFocusAreas.join(', ')}
**Analysis Depth**: ${analysisDepth}

---

## Discussion Timeline

### Round 1 - Initial Understanding (${timestamp})

#### Topic Analysis

Based on the topic "${topic_or_question}":

- **Primary dimensions**: ${dimensions.join(', ')}
- **Initial scope**: ${initialScope}
- **Key questions to explore**:
  - ${question1}
  - ${question2}
  - ${question3}

#### Next Steps

- Launch CLI exploration for codebase context
- Gather external insights via Gemini
- Prepare discussion points for user

---

## Current Understanding

${initialUnderstanding}
```

For continue session, append:
```markdown
### Round ${n} - Continuation (${timestamp})

#### Previous Context

Resuming analysis based on prior discussion.

#### New Focus

${newFocusFromUser}
```

---

### Phase 2: CLI Exploration

**Step 2.1: Launch Parallel Explorations**

```javascript
const explorationPromises = []

// CLI Explore Agent for codebase
if (dimensions.includes('implementation') || dimensions.includes('architecture')) {
  explorationPromises.push(
    Task(
      subagent_type="cli-explore-agent",
      run_in_background=false,
      description=`Explore codebase: ${topicSlug}`,
      prompt=`
## Analysis Context
Topic: ${topic_or_question}
Dimensions: ${dimensions.join(', ')}
Session: ${sessionFolder}

## MANDATORY FIRST STEPS
1. Run: ccw tool exec get_modules_by_depth '{}'
2. Execute relevant searches based on topic keywords
3. Read: .workflow/project-tech.json (if exists)

## Exploration Focus
${dimensions.map(d => `- ${d}: Identify relevant code patterns and structures`).join('\n')}

## Output
Write findings to: ${sessionFolder}/exploration-codebase.json

Schema:
{
  "relevant_files": [{path, relevance, rationale}],
  "patterns": [],
  "key_findings": [],
  "questions_for_user": [],
  "_metadata": { "exploration_type": "codebase", "timestamp": "..." }
}
`
    )
  )
}

// Gemini CLI for deep analysis
explorationPromises.push(
  Bash({
    command: `ccw cli -p "
PURPOSE: Analyze topic '${topic_or_question}' from ${dimensions.join(', ')} perspectives
Success criteria: Actionable insights with clear reasoning

TASK:
• Identify key considerations for this topic
• Analyze common patterns and anti-patterns
• Highlight potential issues or opportunities
• Generate discussion points for user clarification

MODE: analysis

CONTEXT: @**/* | Topic: ${topic_or_question}

EXPECTED:
- Structured analysis with clear sections
- Specific insights tied to evidence
- Questions to deepen understanding
- Recommendations with rationale

CONSTRAINTS: Focus on ${dimensions.join(', ')}
" --tool gemini --mode analysis`,
    run_in_background: true
  })
)
```

**Step 2.2: Aggregate Findings**

```javascript
// After explorations complete, aggregate into explorations.json
const explorations = {
  session_id: sessionId,
  timestamp: getUtc8ISOString(),
  topic: topic_or_question,
  dimensions: dimensions,
  sources: [
    { type: "codebase", file: "exploration-codebase.json" },
    { type: "gemini", summary: geminiOutput }
  ],
  key_findings: [...],
  discussion_points: [...],
  open_questions: [...]
}

Write(explorationsPath, JSON.stringify(explorations, null, 2))
```

**Step 2.3: Update discussion.md**

```markdown
#### Exploration Results (${timestamp})

**Sources Analyzed**:
${sources.map(s => `- ${s.type}: ${s.summary}`).join('\n')}

**Key Findings**:
${keyFindings.map((f, i) => `${i+1}. ${f}`).join('\n')}

**Points for Discussion**:
${discussionPoints.map((p, i) => `${i+1}. ${p}`).join('\n')}

**Open Questions**:
${openQuestions.map((q, i) => `- ${q}`).join('\n')}
```

---

### Phase 3: Interactive Discussion (Multi-Round)

**Step 3.1: Present Findings & Gather Feedback**

```javascript
// Maximum discussion rounds
const MAX_ROUNDS = 5
let roundNumber = 1
let discussionComplete = false

while (!discussionComplete && roundNumber <= MAX_ROUNDS) {
  // Display current findings
  console.log(`
## Discussion Round ${roundNumber}

${currentFindings}

### Key Points for Your Input
${discussionPoints.map((p, i) => `${i+1}. ${p}`).join('\n')}
`)

  // Gather user input
  const userResponse = AskUserQuestion({
    questions: [
      {
        question: "对以上分析有什么看法或补充?",
        header: "Feedback",
        multiSelect: false,
        options: [
          { label: "同意，继续深入", description: "分析方向正确，继续探索" },
          { label: "需要调整方向", description: "我有不同的理解或重点" },
          { label: "分析完成", description: "已获得足够信息" },
          { label: "有具体问题", description: "我想问一些具体问题" }
        ]
      }
    ]
  })

  // Process user response
  switch (userResponse.feedback) {
    case "同意，继续深入":
      // Deepen analysis in current direction
      await deepenAnalysis()
      break
    case "需要调整方向":
      // Get user's adjusted focus
      const adjustment = AskUserQuestion({
        questions: [{
          question: "请说明您希望调整的方向或重点:",
          header: "Direction",
          multiSelect: false,
          options: [
            { label: "更多代码细节", description: "深入代码实现" },
            { label: "更多架构视角", description: "关注整体设计" },
            { label: "更多实践对比", description: "对比最佳实践" }
          ]
        }]
      })
      await adjustAnalysisDirection(adjustment)
      break
    case "分析完成":
      discussionComplete = true
      break
    case "有具体问题":
      // Let user ask specific questions, then answer
      await handleUserQuestions()
      break
  }

  // Update discussion.md with this round
  updateDiscussionDocument(roundNumber, userResponse, findings)
  roundNumber++
}
```

**Step 3.2: Document Each Round**

Append to discussion.md:
```markdown
### Round ${n} - Discussion (${timestamp})

#### User Input

${userInputSummary}

${userResponse === 'adjustment' ? `
**Direction Adjustment**: ${adjustmentDetails}
` : ''}

${userResponse === 'questions' ? `
**User Questions**:
${userQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}

**Answers**:
${answers.map((a, i) => `${i+1}. ${a}`).join('\n')}
` : ''}

#### Updated Understanding

Based on user feedback:
- ${insight1}
- ${insight2}

#### Corrected Assumptions

${corrections.length > 0 ? corrections.map(c => `
- ~~${c.wrong}~~ → ${c.corrected}
  - Reason: ${c.reason}
`).join('\n') : 'None'}

#### New Insights

${newInsights.map(i => `- ${i}`).join('\n')}
```

---

### Phase 4: Synthesis & Conclusion

**Step 4.1: Consolidate Insights**

```javascript
const conclusions = {
  session_id: sessionId,
  topic: topic_or_question,
  completed: getUtc8ISOString(),
  total_rounds: roundNumber,

  summary: "...",

  key_conclusions: [
    { point: "...", evidence: "...", confidence: "high|medium|low" }
  ],

  recommendations: [
    { action: "...", rationale: "...", priority: "high|medium|low" }
  ],

  open_questions: [...],

  follow_up_suggestions: [
    { type: "issue", summary: "..." },
    { type: "task", summary: "..." }
  ]
}

Write(conclusionsPath, JSON.stringify(conclusions, null, 2))
```

**Step 4.2: Final discussion.md Update**

```markdown
---

## Conclusions (${timestamp})

### Summary

${summaryParagraph}

### Key Conclusions

${conclusions.key_conclusions.map((c, i) => `
${i+1}. **${c.point}** (Confidence: ${c.confidence})
   - Evidence: ${c.evidence}
`).join('\n')}

### Recommendations

${conclusions.recommendations.map((r, i) => `
${i+1}. **${r.action}** (Priority: ${r.priority})
   - Rationale: ${r.rationale}
`).join('\n')}

### Remaining Questions

${conclusions.open_questions.map(q => `- ${q}`).join('\n')}

---

## Current Understanding (Final)

### What We Established

${establishedPoints.map(p => `- ${p}`).join('\n')}

### What Was Clarified/Corrected

${corrections.map(c => `- ~~${c.original}~~ → ${c.corrected}`).join('\n')}

### Key Insights

${keyInsights.map(i => `- ${i}`).join('\n')}

---

## Session Statistics

- **Total Rounds**: ${totalRounds}
- **Duration**: ${duration}
- **Sources Used**: ${sources.join(', ')}
- **Artifacts Generated**: discussion.md, explorations.json, conclusions.json
```

**Step 4.3: Post-Completion Options**

```javascript
AskUserQuestion({
  questions: [{
    question: "分析完成。是否需要后续操作?",
    header: "Next Steps",
    multiSelect: true,
    options: [
      { label: "创建Issue", description: "将结论转为可执行的Issue" },
      { label: "生成任务", description: "创建实施任务" },
      { label: "导出报告", description: "生成独立的分析报告" },
      { label: "完成", description: "不需要后续操作" }
    ]
  }]
})

// Handle selections
if (selection.includes("创建Issue")) {
  SlashCommand("/issue:new", `${topic_or_question} - 分析结论实施`)
}
if (selection.includes("生成任务")) {
  SlashCommand("/workflow:lite-plan", `实施分析结论: ${summary}`)
}
if (selection.includes("导出报告")) {
  exportAnalysisReport(sessionFolder)
}
```

---

## Session Folder Structure

```
.workflow/.analysis/ANL-{slug}-{date}/
├── discussion.md       # Evolution of understanding & discussions
├── explorations.json   # CLI exploration findings
├── conclusions.json    # Final synthesis
└── exploration-*.json  # Individual exploration results (optional)
```

## Discussion Document Template

```markdown
# Analysis Discussion

**Session ID**: ANL-xxx-2025-01-25
**Topic**: [topic or question]
**Started**: 2025-01-25T10:00:00+08:00
**Dimensions**: [architecture, implementation, ...]

---

## User Context

**Focus Areas**: [user-selected focus]
**Analysis Depth**: [quick|standard|deep]

---

## Discussion Timeline

### Round 1 - Initial Understanding (2025-01-25 10:00)

#### Topic Analysis
...

#### Exploration Results
...

### Round 2 - Discussion (2025-01-25 10:15)

#### User Input
...

#### Updated Understanding
...

#### Corrected Assumptions
- ~~[wrong]~~ → [corrected]

### Round 3 - Deep Dive (2025-01-25 10:30)
...

---

## Conclusions (2025-01-25 11:00)

### Summary
...

### Key Conclusions
...

### Recommendations
...

---

## Current Understanding (Final)

### What We Established
- [confirmed points]

### What Was Clarified/Corrected
- ~~[original assumption]~~ → [corrected understanding]

### Key Insights
- [insights gained]

---

## Session Statistics

- **Total Rounds**: 3
- **Duration**: 1 hour
- **Sources Used**: codebase exploration, Gemini analysis
- **Artifacts Generated**: discussion.md, explorations.json, conclusions.json
```

## Iteration Flow

```
First Call (/workflow:analyze-with-file "topic"):
   ├─ No session exists → New mode
   ├─ Identify analysis dimensions
   ├─ Scope with user (unless --yes)
   ├─ Create discussion.md with initial understanding
   ├─ Launch CLI explorations
   └─ Enter discussion loop

Continue Call (/workflow:analyze-with-file --continue "topic"):
   ├─ Session exists → Continue mode
   ├─ Load discussion.md
   ├─ Resume from last round
   └─ Continue discussion loop

Discussion Loop:
   ├─ Present current findings
   ├─ Gather user feedback (AskUserQuestion)
   ├─ Process response:
   │   ├─ Agree → Deepen analysis
   │   ├─ Adjust → Change direction
   │   ├─ Question → Answer then continue
   │   └─ Complete → Exit loop
   ├─ Update discussion.md
   └─ Repeat until complete or max rounds

Completion:
   ├─ Generate conclusions.json
   ├─ Update discussion.md with final synthesis
   └─ Offer follow-up options (issue, task, report)
```

## CLI Integration Points

### 1. Codebase Exploration (cli-explore-agent)

**Purpose**: Gather relevant code context

**When**: Topic involves implementation or architecture analysis

### 2. Gemini Deep Analysis

**Purpose**: Conceptual analysis, pattern identification, best practices

**Prompt Pattern**:
```
PURPOSE: Analyze topic + identify insights
TASK: Explore dimensions + generate discussion points
CONTEXT: Codebase + topic
EXPECTED: Structured analysis + questions
```

### 3. Follow-up CLI Calls

**Purpose**: Deepen specific areas based on user feedback

**Dynamic invocation** based on discussion direction

## Consolidation Rules

When updating "Current Understanding":

1. **Promote confirmed insights**: Move validated findings to "What We Established"
2. **Track corrections**: Keep important wrong→right transformations
3. **Focus on current state**: What do we know NOW
4. **Avoid timeline repetition**: Don't copy discussion details
5. **Preserve key learnings**: Keep insights valuable for future reference

**Bad (cluttered)**:
```markdown
## Current Understanding

In round 1 we discussed X, then in round 2 user said Y, and we explored Z...
```

**Good (consolidated)**:
```markdown
## Current Understanding

### What We Established
- The authentication flow uses JWT with refresh tokens
- Rate limiting is implemented at API gateway level

### What Was Clarified
- ~~Assumed Redis for sessions~~ → Actually uses database-backed sessions

### Key Insights
- Current architecture supports horizontal scaling
- Security audit recommended before production
```

## Error Handling

| Situation | Action |
|-----------|--------|
| CLI exploration fails | Continue with available context, note limitation |
| User timeout in discussion | Save state, show resume command |
| Max rounds reached | Force synthesis, offer continuation option |
| No relevant findings | Broaden search, ask user for clarification |
| Session folder conflict | Append timestamp suffix |
| Gemini unavailable | Fallback to Codex or manual analysis |


## Usage Recommendations

Use `/workflow:analyze-with-file` when:
- Exploring a complex topic collaboratively
- Need documented discussion trail
- Decision-making requires multiple perspectives
- Want to iterate on understanding with user input
- Building shared understanding before implementation

Use `/workflow:debug-with-file` when:
- Diagnosing specific bugs
- Need hypothesis-driven investigation
- Focus on evidence and verification

Use `/workflow:lite-plan` when:
- Ready to implement (past analysis phase)
- Need structured task breakdown
- Focus on execution planning
