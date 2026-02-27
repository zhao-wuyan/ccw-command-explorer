---
description: Interactive collaborative analysis with documented discussions, CLI-assisted exploration, and evolving understanding. Supports depth control and iteration limits.
argument-hint: "TOPIC=\"<topic or question>\" [--depth=standard|deep|full] [--max-iterations=<n>] [--verbose]"
---

# Codex Analyze-With-File Prompt

## Overview

Interactive collaborative analysis workflow with **documented discussion process**. Records understanding evolution, facilitates multi-round Q&A, and uses deep analysis for codebase and concept exploration.

**Core workflow**: Topic → Explore → Discuss → Document → Refine → Conclude

**Key features**:
- **discussion.md**: Timeline of discussions and understanding evolution
- **Multi-round Q&A**: Iterative clarification with user
- **Analysis-assisted exploration**: Deep codebase and concept analysis
- **Consolidated insights**: Synthesizes discussions into actionable conclusions
- **Flexible continuation**: Resume analysis sessions to build on previous work

## Target Topic

**$TOPIC**

- `--depth`: Analysis depth (standard|deep|full)
- `--max-iterations`: Max discussion rounds

## Execution Process

```
Session Detection:
   ├─ Check if analysis session exists for topic
   ├─ EXISTS + discussion.md exists → Continue mode
   └─ NOT_FOUND → New session mode

Phase 1: Topic Understanding
   ├─ Parse topic/question
   ├─ Identify analysis dimensions (architecture, implementation, concept, etc.)
   ├─ Initial scoping with user
   └─ Document initial understanding in discussion.md

Phase 2: Exploration (Parallel)
   ├─ Search codebase for relevant patterns
   ├─ Analyze code structure and dependencies
   └─ Aggregate findings into exploration summary

Phase 3: Interactive Discussion (Multi-Round)
   ├─ Present exploration findings
   ├─ Facilitate Q&A with user
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
   ├─ .workflow/.analysis/{slug}-{date}/explorations.json (findings)
   └─ .workflow/.analysis/{slug}-{date}/conclusions.json (final synthesis)
```

## Implementation Details

### Session Setup & Mode Detection

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

const topicSlug = "$TOPIC".toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40)
const dateStr = getUtc8ISOString().substring(0, 10)

const sessionId = `ANL-${topicSlug}-${dateStr}`
const sessionFolder = `.workflow/.analysis/${sessionId}`
const discussionPath = `${sessionFolder}/discussion.md`
const explorationsPath = `${sessionFolder}/explorations.json`
const conclusionsPath = `${sessionFolder}/conclusions.json`

// Auto-detect mode
const sessionExists = fs.existsSync(sessionFolder)
const hasDiscussion = sessionExists && fs.existsSync(discussionPath)

const mode = hasDiscussion ? 'continue' : 'new'

if (!sessionExists) {
  bash(`mkdir -p ${sessionFolder}`)
}
```

---

### Phase 1: Topic Understanding

#### Step 1.1: Parse Topic & Identify Dimensions

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

const dimensions = identifyDimensions("$TOPIC")
```

#### Step 1.2: Initial Scoping (New Session Only)

Ask user to scope the analysis:

- Focus areas: 代码实现 / 架构设计 / 最佳实践 / 问题诊断
- Analysis depth: Quick Overview / Standard Analysis / Deep Dive

#### Step 1.3: Create/Update discussion.md

For new session:

```markdown
# Analysis Discussion

**Session ID**: ${sessionId}
**Topic**: $TOPIC
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

Based on topic "$TOPIC":

- **Primary dimensions**: ${dimensions.join(', ')}
- **Initial scope**: ${initialScope}
- **Key questions to explore**:
  - ${question1}
  - ${question2}
  - ${question3}

#### Next Steps

- Search codebase for relevant patterns
- Gather insights via analysis
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

### Phase 2: Exploration

#### Step 2.1: Codebase Search

```javascript
// Extract keywords from topic
const keywords = extractTopicKeywords("$TOPIC")

// Search codebase for relevant code
const searchResults = []
for (const keyword of keywords) {
  const results = Grep({ pattern: keyword, path: ".", output_mode: "content", "-C": 3 })
  searchResults.push({ keyword, results })
}

// Identify affected files and patterns
const relevantLocations = analyzeSearchResults(searchResults)
```

#### Step 2.2: Pattern Analysis

Analyze the codebase from identified dimensions:

1. Architecture patterns and structure
2. Implementation conventions
3. Dependency relationships
4. Potential issues or improvements

#### Step 2.3: Aggregate Findings

```javascript
// Aggregate into explorations.json
const explorations = {
  session_id: sessionId,
  timestamp: getUtc8ISOString(),
  topic: "$TOPIC",
  dimensions: dimensions,
  sources: [
    { type: "codebase", summary: codebaseSummary },
    { type: "analysis", summary: analysisSummary }
  ],
  key_findings: [...],
  discussion_points: [...],
  open_questions: [...]
}

Write(explorationsPath, JSON.stringify(explorations, null, 2))
```

#### Step 2.4: Update discussion.md

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

#### Step 3.1: Present Findings & Gather Feedback

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
  // Options:
  // - 同意，继续深入: Deepen analysis in current direction
  // - 需要调整方向: Get user's adjusted focus
  // - 分析完成: Exit loop
  // - 有具体问题: Answer specific questions

  // Process user response and update understanding
  updateDiscussionDocument(roundNumber, userResponse, findings)
  roundNumber++
}
```

#### Step 3.2: Document Each Round

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

#### Step 4.1: Consolidate Insights

```javascript
const conclusions = {
  session_id: sessionId,
  topic: "$TOPIC",
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

#### Step 4.2: Final discussion.md Update

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

#### Step 4.3: Post-Completion Options

Offer follow-up options:
- Create Issue: Convert conclusions to actionable issues
- Generate Task: Create implementation tasks
- Export Report: Generate standalone analysis report
- Complete: No further action needed

---

## Session Folder Structure

```
.workflow/.analysis/ANL-{slug}-{date}/
├── discussion.md       # Evolution of understanding & discussions
├── explorations.json   # Exploration findings
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
- **Sources Used**: codebase exploration, analysis
- **Artifacts Generated**: discussion.md, explorations.json, conclusions.json
```

## Iteration Flow

```
First Call (TOPIC="topic"):
   ├─ No session exists → New mode
   ├─ Identify analysis dimensions
   ├─ Scope with user
   ├─ Create discussion.md with initial understanding
   ├─ Launch explorations
   └─ Enter discussion loop

Continue Call (TOPIC="topic"):
   ├─ Session exists → Continue mode
   ├─ Load discussion.md
   ├─ Resume from last round
   └─ Continue discussion loop

Discussion Loop:
   ├─ Present current findings
   ├─ Gather user feedback
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
   └─ Offer follow-up options
```

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
| Exploration fails | Continue with available context, note limitation |
| User timeout in discussion | Save state, show resume instructions |
| Max rounds reached | Force synthesis, offer continuation option |
| No relevant findings | Broaden search, ask user for clarification |
| Session folder conflict | Append timestamp suffix |

---

**Now execute the analyze-with-file workflow for topic**: $TOPIC
