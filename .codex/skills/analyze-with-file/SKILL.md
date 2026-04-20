---
name: analyze-with-file
description: Interactive collaborative analysis with documented discussions, inline exploration, and evolving understanding.
argument-hint: "TOPIC=\"<question or topic>\" [--depth=quick|standard|deep] [--continue]"
---

# Codex Analyze-With-File Prompt

## Overview

Interactive collaborative analysis workflow with **documented discussion process**. Records understanding evolution, facilitates multi-round Q&A, and uses inline search + external research for deep exploration.

**Core workflow**: Topic → Explore → Research → Discuss → Document → Refine → Conclude → Next Step

**Key features**:
- **Documented discussion timeline**: Captures understanding evolution across all phases
- **Decision recording at every critical point**: Mandatory recording of key findings, direction changes, and trade-offs
- **Technical solution tracking**: Records proposed/validated/rejected solutions with evidence and alternatives
- **Multi-perspective analysis**: Supports up to 4 analysis perspectives (serial, inline)
- **External research**: Web search for best practices, patterns, and industry standards via `web.run`
- **Interactive discussion**: Multi-round Q&A with user feedback, direction adjustments, and research requests
- **Progress tracking**: `functions.update_plan` for real-time phase progress visibility
- **Structured handoff**: Terminal gate with execution planning, issue creation, or completion

## Auto Mode

When `--yes` or `-y`: Auto-confirm exploration decisions, use recommended analysis angles, skip interactive scoping.

## Quick Start

```bash
# Basic usage
/codex:analyze-with-file TOPIC="How to optimize this project's authentication architecture"

# With depth selection
/codex:analyze-with-file TOPIC="Performance bottleneck analysis" --depth=deep

# Continue existing session
/codex:analyze-with-file TOPIC="authentication architecture" --continue

# Auto mode (skip confirmations)
/codex:analyze-with-file -y TOPIC="Caching strategy analysis"
```

## Target Topic

**$TOPIC**

## Configuration

| Flag | Default | Description |
|------|---------|-------------|
| `-y, --yes` | false | Auto-confirm all decisions |
| `--continue` | false | Continue existing session |
| `--depth` | standard | Analysis depth: quick / standard / deep |

**Session ID format**: `ANL-{YYYY-MM-DD}-{slug}`
- slug: lowercase, alphanumeric + CJK characters, max 40 chars
- date: YYYY-MM-DD (UTC+8)
- Auto-detect continue: session folder + discussion.md exists → continue mode

## Analysis Flow

```
Step 0: Session Setup
   ├─ Parse topic, flags (--depth, --continue, -y)
   ├─ Generate session ID: ANL-{date}-{slug}
   ├─ Create session folder (or detect existing → continue mode)
   └─ Initialize progress tracking: functions.update_plan([...phases])

Step 1: Topic Understanding
   ├─ Parse topic, identify analysis dimensions
   ├─ Initial scoping with user: functions.request_user_input (focus, perspectives, depth)
   └─ Initialize discussion.md

Step 2: Exploration (Inline + External Research)
   ├─ Detect codebase → search relevant modules, patterns
   │   ├─ functions.exec_command('ccw spec load --category exploration')
   │   ├─ functions.exec_command('ccw spec load --category debug')
   │   └─ Use Grep, Glob, Read, mcp__ace-tool__search_context
   ├─ External research (if topic warrants): web.run for best practices, patterns
   ├─ Multi-perspective analysis (if selected, serial)
   │   ├─ Single: Comprehensive analysis
   │   └─ Multi (≤4): Serial per-perspective analysis with synthesis
   ├─ Aggregate findings → explorations.json / perspectives.json
   ├─ Update discussion.md with Round 1
   │   ├─ Replace ## Current Understanding with initial findings
   │   └─ Update ## Table of Contents
   └─ Initial Intent Coverage Check (early drift detection)

Step 3: Interactive Discussion (Multi-Round, max 5)
   ├─ Current Understanding Summary (round ≥ 2, before findings)
   ├─ Present exploration findings
   ├─ Gather user feedback: functions.request_user_input
   ├─ Process response:
   │   ├─ Deepen → context-driven + heuristic options → deeper inline analysis
   │   ├─ External Research → web.run for specific tech/pattern investigation
   │   ├─ Adjust → new inline analysis with adjusted focus
   │   ├─ Questions → direct answers with evidence
   │   └─ Complete → exit loop for synthesis
   ├─ Record-Before-Continue: write findings to discussion.md BEFORE updating
   ├─ Technical Solution Triggers: detect and record proposed solutions
   ├─ Update discussion.md:
   │   ├─ Append round details + Narrative Synthesis
   │   ├─ Replace ## Current Understanding with latest state
   │   └─ Update ## Table of Contents
   ├─ Intent Drift Check (round ≥ 2, building on Phase 2 initial check)
   └─ Repeat until user selects complete or max rounds

Step 4: Synthesis & Conclusion
   ├─ Intent Coverage Verification (mandatory gate)
   ├─ Findings-to-Recommendations Traceability (mandatory gate)
   ├─ Consolidate all insights → conclusions.json (with steps[] per recommendation)
   ├─ Update discussion.md with final synthesis
   ├─ Interactive Recommendation Review: functions.request_user_input (batch confirm)
   └─ MANDATORY Terminal Gate: functions.request_user_input (next step selection)
       ├─ 执行任务 → Build implementation scope → handoff to downstream planning
       ├─ 产出Issue → functions.exec_command('ccw issue create')
       └─ 完成 → Display artifact paths, end
```

## Recording Protocol

**CRITICAL**: During analysis, the following situations **MUST** trigger immediate recording to discussion.md:

| Trigger | What to Record | Target Section |
|---------|---------------|----------------|
| **Direction choice** | What was chosen, why, what alternatives were discarded | `#### Decision Log` |
| **Key finding** | Finding content, impact scope, confidence level, hypothesis impact | `#### Key Findings` |
| **Assumption change** | Old assumption → new understanding, reason, impact | `#### Corrected Assumptions` |
| **User feedback** | User's original input, rationale for adoption/adjustment | `#### User Input` |
| **Disagreement & trade-off** | Conflicting viewpoints, trade-off basis, final choice | `#### Decision Log` |
| **Scope adjustment** | Before/after scope, trigger reason | `#### Decision Log` |
| **Technical solution proposed/validated/rejected** | Solution, rationale, alternatives, status, evidence | `#### Technical Solutions` |

### Decision Record Format

```markdown
> **Decision**: [Description of the decision]
> - **Context**: [What triggered this decision]
> - **Options considered**: [Alternatives evaluated]
> - **Chosen**: [Selected approach] — **Reason**: [Rationale]
> - **Rejected**: [Why other options were discarded]
> - **Impact**: [Effect on analysis direction/conclusions]
```

### Key Finding Record Format

```markdown
> **Finding**: [Content]
> - **Confidence**: [High/Medium/Low] — **Why**: [Evidence basis]
> - **Hypothesis Impact**: [Confirms/Refutes/Modifies] hypothesis "[name]"
> - **Scope**: [What areas this affects]
```

### Technical Solution Record Format

Record when: an implementation approach is described with specific files/patterns, 2+ alternatives are compared, user confirms/modifies/rejects an approach, or a concrete code change strategy emerges.

```markdown
> **Solution**: [Description — what approach, pattern, or implementation]
> - **Status**: [Proposed / Validated / Rejected]
> - **Problem**: [What problem this solves]
> - **Rationale**: [Why this approach]
> - **Alternatives**: [Other options considered and why not chosen]
> - **Evidence**: [file:line or code anchor references]
> - **Next Action**: [Follow-up required or none]
```

### Narrative Synthesis Format

Append after each round update:

```markdown
### Round N: Narrative Synthesis
**起点**: 基于上一轮的 [conclusions/questions]，本轮从 [starting point] 切入。
**关键进展**: [New findings] [confirmed/refuted/modified] 了之前关于 [hypothesis] 的理解。
**决策影响**: 用户选择 [feedback type]，导致分析方向 [adjusted/deepened/maintained]。
**当前理解**: 经过本轮，核心认知更新为 [updated understanding]。
**遗留问题**: [remaining questions driving next round]
```

### Recording Principles

- **Immediacy**: Record decisions as they happen, not at the end of a phase
- **Completeness**: Capture context, options, chosen approach, reason, and rejected alternatives
- **Traceability**: Later phases must be able to trace back why a decision was made
- **Depth**: Capture reasoning and hypothesis impact, not just outcomes

## Implementation Details

### Phase 0: Session Initialization

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

// Parse flags
const autoYes = $ARGUMENTS.includes('--yes') || $ARGUMENTS.includes('-y')
const continueMode = $ARGUMENTS.includes('--continue')
const depthMatch = $ARGUMENTS.match(/--depth[=\s](quick|standard|deep)/)
const analysisDepth = depthMatch ? depthMatch[1] : 'standard'

// Extract topic
const topic = $ARGUMENTS.replace(/--yes|-y|--continue|--depth[=\s]\w+|TOPIC=/g, '').replace(/^["']|["']$/g, '').trim()

// Determine project root
const projectRoot = functions.exec_command('git rev-parse --show-toplevel 2>/dev/null || pwd').trim()

const slug = topic.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').substring(0, 40)
const dateStr = getUtc8ISOString().substring(0, 10)
const sessionId = `ANL-${dateStr}-${slug}`
const sessionFolder = `${projectRoot}/.workflow/.analysis/${sessionId}`

// Auto-detect continue: session folder + discussion.md exists → continue mode
// If continue → load discussion.md + explorations, resume from last round
functions.exec_command(`mkdir -p ${sessionFolder}`)

// Initialize progress tracking (MANDATORY)
functions.update_plan([
  { id: "phase-1", title: "Phase 1: Topic Understanding", status: "in_progress" },
  { id: "phase-2", title: "Phase 2: Exploration & Research", status: "pending" },
  { id: "phase-3", title: "Phase 3: Interactive Discussion", status: "pending" },
  { id: "phase-4", title: "Phase 4: Synthesis & Conclusion", status: "pending" },
  { id: "next-step", title: "GATE: Post-Completion Next Step", status: "pending" }
])
```

### Phase 1: Topic Understanding

**Objective**: Parse the topic, identify relevant analysis dimensions, scope the analysis with user input, and initialize the discussion document.

##### Step 1.1: Parse Topic & Identify Dimensions

Match topic keywords against analysis dimensions (see [Dimensions Reference](#analysis-dimensions)):

```javascript
// Match topic text against keyword lists from Dimensions Reference
// If multiple dimensions match, include all
// If none match, default to "architecture" and "implementation"
const dimensions = identifyDimensions(topic, ANALYSIS_DIMENSIONS)
```

##### Step 1.2: Initial Scoping (New Session Only)

For new sessions, gather user preferences (skipped in auto mode or continue mode):

```javascript
if (!autoYes && !continueMode) {
  // Single call with up to 3 questions (functions.request_user_input constraint: 1-4 questions, 2-4 options each)
  const scoping = functions.request_user_input({
    questions: [
      {
        id: "focus",
        header: "聚焦领域",
        question: "Select analysis focus areas:",
        multiSelect: true,
        options: generateFocusOptions(dimensions) // Dynamic from Dimension-Direction Mapping, max 4
      },
      {
        id: "perspectives",
        header: "分析视角",
        question: "Select analysis perspectives (single = focused, multi = broader):",
        multiSelect: true,
        options: [
          { label: "Technical", description: "Implementation patterns, code structure, feasibility" },
          { label: "Architectural", description: "System design, scalability, interactions" },
          { label: "Security", description: "Security patterns, vulnerabilities, access control" },
          { label: "Performance", description: "Bottlenecks, optimization, resource utilization" }
        ]  // max 4 perspectives
      },
      {
        id: "depth",
        header: "分析深度",
        question: "Analysis depth level:",
        multiSelect: false,
        options: [
          { label: "Standard(Recommended)", description: "Balanced analysis with good coverage" },
          { label: "Quick Overview", description: "Fast surface-level understanding" },
          { label: "Deep Dive", description: "Comprehensive multi-round investigation" }
        ]
      }
    ]
  })
}
```

##### Step 1.3: Initialize discussion.md

```javascript
const discussionMd = `# Analysis Discussion

**Session ID**: ${sessionId}
**Topic**: ${topic}
**Started**: ${getUtc8ISOString()}
**Dimensions**: ${dimensions.join(', ')}
**Depth**: ${analysisDepth}

## Table of Contents
<!-- TOC: Auto-updated after each round/phase. Links to major sections. -->
- [Analysis Context](#analysis-context)
- [Current Understanding](#current-understanding)
- [Discussion Timeline](#discussion-timeline)
- [Decision Trail](#decision-trail)

## Current Understanding
<!-- REPLACEABLE BLOCK: Overwrite (not append) after each round with latest consolidated understanding.
     Follow Consolidation Rules: promote confirmed insights, track corrections, focus on current state. -->

> To be populated after exploration.

## Analysis Context
- Focus areas: ${focusAreas.join(', ')}
- Perspectives: ${selectedPerspectives.map(p => p.name).join(', ')}
- Depth: ${analysisDepth}

## Initial Questions
${generateInitialQuestions(topic, dimensions).map(q => `- ${q}`).join('\n')}

## Initial Decisions
> Record why these dimensions and focus areas were selected.

---

## Discussion Timeline

> Rounds will be appended below as analysis progresses.
> Each round MUST include a Decision Log section for any decisions made.

---

## Decision Trail

> Consolidated critical decisions across all rounds (populated in Phase 4).
`
Write(`${sessionFolder}/discussion.md`, discussionMd)
```

**Success Criteria**:
- Session folder created with discussion.md initialized
- Analysis dimensions identified and user preferences captured
- **Initial decisions recorded**: Dimension selection rationale, excluded dimensions with reasons

**Progress**: `functions.update_plan([{id: "phase-1", status: "completed"}, {id: "phase-2", status: "in_progress"}])`

### Phase 2: Exploration

**Objective**: Gather codebase context, execute external research, and build understanding. All exploration done inline — no agent delegation.

##### Step 2.1: Detect Codebase & Explore

```javascript
const hasCodebase = functions.exec_command(`
  test -f package.json && echo "nodejs" ||
  test -f go.mod && echo "golang" ||
  test -f Cargo.toml && echo "rust" ||
  test -f pyproject.toml && echo "python" ||
  test -f pom.xml && echo "java" ||
  test -d src && echo "generic" ||
  echo "none"
`).trim()

if (hasCodebase !== 'none') {
  // 1. Read project metadata (if exists)
  //    - functions.exec_command('ccw spec load --category exploration')
  //    - functions.exec_command('ccw spec load --category debug')
  //    - .workflow/specs/*.md (project conventions)

  // 2. Search codebase for relevant content
  //    Use: Grep, Glob, Read, or mcp__ace-tool__search_context
  //    Focus on: modules/components, patterns/structure, integration points, config/dependencies

  // 3. Write findings
  Write(`${sessionFolder}/exploration-codebase.json`, JSON.stringify({
    project_type: hasCodebase,
    relevant_files: [...],    // [{path, relevance, summary, dimensions[]}]
    patterns: [...],          // [{pattern, files, description}]
    constraints: [...],       // Architectural constraints found
    integration_points: [...], // [{location, description}]
    key_findings: [...],      // Main insights from code search
    _metadata: { timestamp: getUtc8ISOString(), exploration_scope: '...' }
  }, null, 2))
}
```

##### Step 2.1b: External Research (Parallel with Exploration)

Determine if external research adds value — skip for purely internal codebase questions (e.g., "how does module X work"), run for topics involving technology choices, best practices, architecture patterns, or comparison.

```javascript
const needsResearch = dimensions.some(d =>
  ['architecture', 'comparison', 'decision', 'performance', 'security'].includes(d)
) || topic.match(/best practice|pattern|vs|compare|approach|standard|library|framework/i)

if (needsResearch) {
  // Use web.run for external research
  const researchQueries = [
    `${topic} best practices ${getUtc8ISOString().substring(0,4)}`,
    `${topic} common pitfalls and known issues`,
    ...dimensions.filter(d => ['architecture','security','performance'].includes(d))
      .map(d => `${topic} ${d} patterns and recommendations`)
  ]

  const researchFindings = []
  for (const query of researchQueries.slice(0, 3)) {
    const result = web.run({ search_query: query })
    researchFindings.push({ query, result })
  }

  // Write research findings
  Write(`${sessionFolder}/research.json`, JSON.stringify({
    topic, timestamp: getUtc8ISOString(),
    findings: [...],          // [{finding, detail, confidence, source_url}]
    best_practices: [...],    // [{practice, rationale, source}]
    alternatives: [...],      // [{option, pros, cons, verdict}]
    pitfalls: [...],          // [{issue, mitigation, source}]
    codebase_gaps: [...],     // [{gap, current_approach, recommended_approach}]
    sources: [...],           // [{title, url, key_takeaway}]
    _metadata: { queries_executed: researchQueries.length }
  }, null, 2))
}
```

##### Step 2.2: Multi-Perspective Analysis

Analyze from each selected perspective. All analysis done inline by the AI.

**Single perspective** (default):
```javascript
// Analyze comprehensively across all identified dimensions
// Use exploration-codebase.json as context
const findings = {
  session_id: sessionId, timestamp: getUtc8ISOString(),
  topic, dimensions,
  sources: [...],            // [{type, file, summary}]
  key_findings: [...],       // Main insights
  discussion_points: [...],  // Questions for user engagement
  open_questions: [...]      // Unresolved questions
}
Write(`${sessionFolder}/explorations.json`, JSON.stringify(findings, null, 2))
```

**Multi-perspective** (2-4 perspectives, serial):
```javascript
// Analyze each perspective sequentially, write individual findings
selectedPerspectives.forEach(perspective => {
  Write(`${sessionFolder}/explorations/${perspective.name}.json`, JSON.stringify({
    perspective: perspective.name,
    relevant_files: [...], patterns: [...],
    key_findings: [...], perspective_insights: [...], open_questions: [...],
    _metadata: { timestamp: getUtc8ISOString() }
  }, null, 2))
})
```

##### Step 2.3: Aggregate Findings

```javascript
// Single perspective → explorations.json already written
// Multi-perspective → synthesize into perspectives.json
if (selectedPerspectives.length > 1) {
  const synthesis = {
    session_id: sessionId, timestamp: getUtc8ISOString(), topic, dimensions,
    perspectives: selectedPerspectives.map(p => ({
      name: p.name,
      findings: readJson(`${sessionFolder}/explorations/${p.name}.json`).key_findings,
      insights: readJson(`${sessionFolder}/explorations/${p.name}.json`).perspective_insights,
      questions: readJson(`${sessionFolder}/explorations/${p.name}.json`).open_questions
    })),
    synthesis: {
      convergent_themes: [...],   // What all perspectives agree on
      conflicting_views: [...],   // Where perspectives differ
      unique_contributions: [...]  // Insights unique to specific perspectives
    },
    // Merge research findings if available
    external_research: fileExists(`${sessionFolder}/research.json`)
      ? { findings: research.findings, best_practices: research.best_practices, codebase_gaps: research.codebase_gaps }
      : null,
    aggregated_findings: [...], discussion_points: [...], open_questions: [...]
  }
  Write(`${sessionFolder}/perspectives.json`, JSON.stringify(synthesis, null, 2))
}

// For single perspective, merge research into explorations.json
if (selectedPerspectives.length <= 1 && fileExists(`${sessionFolder}/research.json`)) {
  const research = readJson(`${sessionFolder}/research.json`)
  // Merge research best_practices[] and pitfalls[] into discussion points
  // Cross-reference: flag gaps where codebase patterns diverge from research best practices
  explorations.external_research = {
    findings: research.findings, best_practices: research.best_practices,
    codebase_gaps: research.codebase_gaps, sources: research.sources
  }
  Write(`${sessionFolder}/explorations.json`, JSON.stringify(explorations, null, 2))
}
```

##### Step 2.4: Update discussion.md

Append Round 1 with exploration results using the [Round Documentation Pattern](#round-documentation-pattern).

**Single perspective**: Sources analyzed, key findings with evidence, discussion points, open questions.

**Multi-perspective**: Per-perspective summary (brief), then synthesis (convergent themes, conflicting views, unique contributions), discussion points, open questions.

##### Step 2.5: Initial Intent Coverage Check

Perform the FIRST intent coverage check before entering Phase 3:

```javascript
// Re-read original user intent from discussion.md header
// Check each intent item against Round 1 findings
appendToDiscussion(`
#### Initial Intent Coverage Check (Post-Exploration)
${originalIntents.map((intent, i) => {
  const status = assessCoverage(intent, explorationFindings)
  return `- ${status.icon} Intent ${i+1}: ${intent} — ${status.detail}`
}).join('\n')}

> 接下来的讨论将重点关注未覆盖 (❌) 和进行中 (🔄) 的意图。
`)
```

**Success Criteria**:
- exploration-codebase.json created with codebase context (if codebase exists)
- research.json created with external findings (if topic warrants research)
- explorations.json (single) or perspectives.json (multi) created with findings
- Research best practices merged; codebase gaps flagged
- discussion.md updated with Round 1 results
- **Initial Intent Coverage Check** completed — early drift detection
- **Key findings recorded** with evidence references and confidence levels
- **Exploration decisions recorded** (why certain perspectives/search strategies were chosen)

**Progress**: `functions.update_plan([{id: "phase-2", status: "completed"}, {id: "phase-3", status: "in_progress"}])`

### Phase 3: Interactive Discussion

**Objective**: Iteratively refine understanding through multi-round user-guided discussion cycles. **Max Rounds**: 5.

**Cumulative Context Rule**: Every analysis action in Phase 3 MUST include a summary of ALL prior findings to avoid re-discovering known information:

```javascript
const allFindings = readJson(`${sessionFolder}/explorations.json`) // or perspectives.json
const priorContext = `
## KNOWN FINDINGS (DO NOT re-discover)
- Established files: ${allFindings.sources?.map(s => s.file).join(', ')}
- Key findings: ${allFindings.key_findings?.join('; ')}
- Open questions: ${allFindings.open_questions?.join('; ')}
## NEW TASK: Focus ONLY on unexplored areas below.
`
```

##### Step 3.1: Present Findings & Gather Direction

**Current Understanding Summary** (Round >= 2, BEFORE presenting new findings):
- Generate 1-2 sentence recap of established consensus and last round's direction
- Example: "到目前为止，我们已确认 [established facts]。上一轮 [key action/direction]。现在，这是新一轮的发现："

```javascript
if (!autoYes) {
  const feedback = functions.request_user_input({
    questions: [{
      header: "分析反馈",
      id: "direction",
      question: `Analysis round ${round}: Feedback on current findings?`,
      multiSelect: false,
      options: [
        { label: "继续深入(Recommended)", description: "Direction correct — deepen or specify direction" },
        { label: "外部研究", description: "Need external research on specific technology/pattern" },
        { label: "调整方向", description: "Different focus or specific questions to address" },
        { label: "分析完成", description: "Sufficient information, proceed to synthesis" }
      ]
    }]
  })
}
```

##### Step 3.2: Process User Response

**Record-Before-Continue Rule**: Each path below MUST write findings and discussion synthesis to `discussion.md` BEFORE proceeding to Step 3.3. After analysis returns results:
- Append exploration results, reasoning, and any technical approaches to current round section
- Apply **Technical Solution Triggers** — if an implementation approach is described, 2+ alternatives compared, or user confirms/rejects an approach → record using Technical Solution Record Format
- **Ambiguity Check**: For each Technical Solution with Status `Proposed`, verify no unresolved alternatives remain. If solution lists 2+ options without a chosen one:
  ```markdown
  > **⚠️ Ambiguity**: [Solution] has [N] unresolved alternatives: [list]
  > - **Needs**: [Decision criteria or exploration to resolve]
  ```
  Surface unresolved ambiguities to user in the next feedback round.
- Only THEN proceed to Step 3.3 for Current Understanding replacement and TOC update

**Recording Checkpoint**: Regardless of option selected, MUST record to discussion.md:
- User's original choice and expression
- Impact on analysis direction
- If direction changed, record a full Decision Record (see [Recording Protocol](#recording-protocol))

| Response | Action |
|----------|--------|
| **继续深入** | Sub-question to choose direction (see below). Execute via inline search. Merge new findings. Record confirmed assumptions and exploration angles. |
| **外部研究** | Ask user for research topic → `web.run({search_query: ...})` → merge findings into explorations.json `external_research` section → record as Key Findings in discussion.md |
| **调整方向** | Ask user for new focus. Analyze from adjusted perspective. Compare new insights with prior analysis. Record trigger, old vs new direction, expected impact. |
| **分析完成** | Record why concluding at this round. Exit loop → Phase 4. |

**继续深入** sub-options (dynamically generated, max 4 total):

```javascript
const deepenOptions = functions.request_user_input({
  questions: [{
    header: "深入方向",
    id: "deepen_dir",
    question: `Where to focus next?`,
    multiSelect: false,
    options: [
      // Max 3 context-driven from: unresolved questions, low-confidence findings, unexplored dimensions
      ...generateContextDrivenOptions(allFindings.open_questions, lowConfidenceFindings).slice(0, 3),
      // 1 heuristic option that breaks current frame
      { label: "换角度审视", description: "Compare with best practices / review from different perspective / explore simpler alternatives" }
    ] // Total max 4. "Other" auto-provided for user-specified custom direction
  }]
})
```

**外部研究** flow:

```javascript
const researchTopic = functions.request_user_input({
  questions: [{
    header: "研究主题",
    id: "research",
    question: "What specific technology/pattern/approach needs external research?",
    multiSelect: false,
    options: [
      // Dynamic from context: unresolved tech questions, unvalidated patterns
      ...generateResearchSuggestions(allFindings).slice(0, 3),
      { label: "自定义", description: "Enter custom research topic (via Other)" }
    ]
  }]
})

// Execute research
const researchResult = web.run({ search_query: `${researchTopic} best practices ${currentYear}` })

// Merge into explorations.json external_research section
// Update research.json (append, don't overwrite)
// Record findings as Key Findings in discussion.md
```

##### Step 3.3: Document Each Round

Update discussion.md using the [Round Documentation Pattern](#round-documentation-pattern).

**Append** to Discussion Timeline: User Direction, Decision Log, Key Findings, Analysis Results, Corrected Assumptions, Open Items, Narrative Synthesis.

**Replace** (not append):

| Section | Update Rule |
|---------|-------------|
| `## Current Understanding` | Overwrite with latest consolidated understanding. Follow [Consolidation Rules](#consolidation-rules). |
| `## Table of Contents` | Update links to include new Round N sections |

##### Step 3.4: Intent Drift Check (every round >= 2)

Re-read original intent from discussion.md header. Compare against the Initial Intent Coverage Check from Phase 2:

```markdown
#### Intent Coverage Check
- ✅ Intent 1: [addressed in Round N]
- 🔄 Intent 2: [in-progress, current focus]
- ⚠️ Intent 3: [implicitly absorbed by X — needs explicit confirmation]
- ❌ Intent 4: [not yet discussed]
```

- If any item is "implicitly absorbed" (⚠️), note explicitly — absorbed ≠ addressed
- If ❌ or ⚠️ items exist → **proactively surface** to user: "以下原始意图尚未充分覆盖：[list]。是否需要调整优先级？"

**Success Criteria**:
- User feedback processed for each round
- discussion.md updated with all rounds, assumptions documented and corrected
- **All decision points recorded** with Decision Record format
- **Technical solutions tracked** with Solution Record format where applicable
- **Direction changes documented** with before/after comparison

**Progress**: `functions.update_plan([{id: "phase-3", status: "completed"}, {id: "phase-4", status: "in_progress"}])`

### Phase 4: Synthesis & Conclusion

**Objective**: Consolidate insights, generate conclusions and recommendations.

##### Step 4.0: Intent Coverage Verification (MANDATORY gate)

For EACH original intent item, determine coverage status:

- **✅ Addressed**: Explicitly discussed and concluded
- **🔀 Transformed**: Original intent evolved — document transformation chain
- **⚠️ Absorbed**: Implicitly covered — flag for confirmation
- **❌ Missed**: Not discussed — MUST address or explicitly defer

Write "Intent Coverage Matrix" to discussion.md:

```markdown
### Intent Coverage Matrix
| # | Original Intent | Status | Where Addressed | Notes |
|---|----------------|--------|-----------------|-------|
| 1 | [intent text] | ✅ Addressed | Round N, Conclusion #M | |
| 2 | [intent text] | 🔀 Transformed | Round N → Round M | Original: X → Final: Y |
| 3 | [intent text] | ❌ Missed | — | Reason for omission |
```

**Gate**: If any item is ❌ Missed, MUST either (a) add a discussion round to address it, or (b) explicitly confirm with user that it is intentionally deferred.

##### Step 4.1: Findings-to-Recommendations Traceability (MANDATORY gate)

Collect ALL actionable findings from every round and map each to a disposition.

**Actionable finding sources**: key findings with actionable implications, technical solutions (proposed/validated), identified gaps (API-frontend gaps, missing features, design issues), corrected assumptions that imply fixes.

| Disposition | Meaning |
|-------------|---------|
| recommendation | Converted to a numbered recommendation |
| absorbed | Covered by another recommendation (specify which) |
| deferred | Explicitly out-of-scope with reason |
| informational | Pure insight, no action needed |

```javascript
const findingsCoverage = allFindings.map(f => ({
  finding: f.summary, round: f.round,
  disposition: null,  // MUST be assigned before proceeding
  target: null,       // e.g., "Rec #1" or "→ Rec #3" or "Reason: ..."
  reason: null
}))

// Gate: ALL findings MUST have a disposition. Do NOT proceed with any disposition = null.
```

Append Findings Coverage Matrix to discussion.md:

```markdown
### Findings Coverage Matrix
| # | Finding (Round) | Disposition | Target |
|---|----------------|-------------|--------|
| 1 | [finding] (R1) | recommendation | Rec #1 |
| 2 | [finding] (R2) | absorbed | → Rec #1 |
```

##### Step 4.2: Consolidate Insights

```javascript
const conclusions = {
  session_id: sessionId, topic,
  completed: getUtc8ISOString(),
  total_rounds: roundCount,
  summary: '...',                    // Executive summary
  key_conclusions: [                 // Main conclusions
    { point: '...', evidence: '...', confidence: 'high|medium|low' }
  ],
  recommendations: [                 // MUST include all findings with disposition = 'recommendation'
    {
      action: '...',                    // What to do (imperative verb + target)
      rationale: '...',                 // Why this matters
      priority: 'high|medium|low',
      evidence_refs: ['file:line', ...],
      steps: [                          // Granular sub-steps for execution
        { description: '...', target: 'file/module', verification: 'how to verify done' }
      ],
      review_status: 'accepted|modified|rejected|pending'
    }
  ],
  open_questions: [...],
  follow_up_suggestions: [
    { type: 'issue|task|research', summary: '...' }
  ],
  decision_trail: [                  // Consolidated decisions from all phases
    { round: 1, decision: '...', context: '...', options_considered: [...], chosen: '...', rejected_reasons: '...', reason: '...', impact: '...' }
  ],
  narrative_trail: [                 // From Narrative Synthesis per round
    { round: 1, starting_point: '...', key_progress: '...', hypothesis_impact: '...', updated_understanding: '...', remaining_questions: '...' }
  ],
  intent_coverage: [                 // From Step 4.0
    { intent: '...', status: 'addressed|transformed|absorbed|missed', where_addressed: '...', notes: '...' }
  ],
  findings_coverage: findingsCoverage // From Step 4.1
}
Write(`${sessionFolder}/conclusions.json`, JSON.stringify(conclusions, null, 2))
```

##### Step 4.3: Final discussion.md Update

**Synthesis & Conclusions**: Executive Summary, Key Conclusions (ranked by confidence), Recommendations (prioritized), Remaining Open Questions.

**Current Understanding (Final)**:

| Subsection | Content |
|------------|---------|
| What We Established | Confirmed points and validated findings |
| What Was Clarified | Important corrections (~~wrong→right~~) |
| Key Insights | Valuable learnings for future reference |

**Decision Trail**:

| Subsection | Content |
|------------|---------|
| Critical Decisions | Pivotal decisions that shaped the outcome |
| Direction Changes | Timeline of scope/focus adjustments with rationale |
| Trade-offs Made | Key trade-offs and why certain paths were chosen |

**Session Statistics**: Total discussion rounds, key findings count, dimensions covered, artifacts generated, **decision count**.

##### Step 4.4: Interactive Recommendation Review (skip in auto mode)

Batch-confirm via **single `functions.request_user_input` call** (up to 4 questions, ordered by priority high→medium→low):

```javascript
// 1. Display all recommendations with numbering
console.log(sortedRecs.map((rec, i) =>
  `${i+1}. **${rec.action}** [${rec.priority}] — ${rec.rationale} (${rec.steps.length} steps)`
).join('\n'))

// 2. Batch review (max 4 per call, one question per recommendation)
const batchSize = 4
for (let batch = 0; batch < sortedRecs.length; batch += batchSize) {
  const batchRecs = sortedRecs.slice(batch, batch + batchSize)
  const review = functions.request_user_input({
    questions: batchRecs.map((rec, i) => ({
      header: `建议#${batch + i + 1}`,
      id: `rec_${batch + i + 1}`,
      question: `"${rec.action}" (${rec.priority}, ${rec.steps.length} steps):`,
      multiSelect: false,
      options: [
        { label: "确认(Recommended)", description: "Accept as-is" },
        { label: "修改", description: "Adjust scope/steps" },
        { label: "删除", description: "Not needed" }
      ]
    }))
  })
  // 确认 → "accepted" | 修改 → follow up for details → "modified" | 删除 → "rejected"
  // Record all review decisions to discussion.md + update conclusions.json
}
```

**Review Summary** (append to discussion.md):
```markdown
### Recommendation Review Summary
| # | Action | Priority | Steps | Review Status | Notes |
|---|--------|----------|-------|---------------|-------|
| 1 | [action] | high | 3 | ✅ Accepted | |
| 2 | [action] | medium | 2 | ✏️ Modified | [modification notes] |
| 3 | [action] | low | 1 | ❌ Rejected | [reason] |
```

##### Step 4.5: MANDATORY Terminal Gate — Next Step Selection

> **CRITICAL**: This is a **terminal gate**. The workflow is INCOMPLETE if this step is not executed. After recommendation review, you MUST immediately proceed here.

**Progress**: `functions.update_plan([{id: "phase-4", status: "completed"}, {id: "next-step", status: "in_progress"}])`

```javascript
const nextStep = functions.request_user_input({
  questions: [{
    header: "Next Step",
    id: "next_step",
    question: "What would you like to do with the analysis results?",
    multiSelect: false,
    options: [
      { label: "执行任务(Recommended)", description: "Build implementation scope and hand off to planning" },
      { label: "产出Issue", description: "Convert recommendations to tracked issues" },
      { label: "完成", description: "Analysis sufficient, no further action needed" }
    ]
  }]
})
```

**Handle user selection**:

**"执行任务"** → Implementation Scoping + Handoff:

**Step A: Build Implementation Scope** — Transform recommendations into actionable specs:
```javascript
const actionableRecs = conclusions.recommendations
  .filter(r => r.review_status === 'accepted' || r.review_status === 'modified')
  .sort((a, b) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1))

const implScope = actionableRecs.map(rec => ({
  objective: rec.action,
  rationale: rec.rationale,
  priority: rec.priority,
  target_files: rec.steps.flatMap(s => s.target ? [s.target] : []),
  acceptance_criteria: rec.steps.map(s => s.verification || s.description),
  change_summary: rec.steps.map(s => `${s.target || 'TBD'}: ${s.description}`).join('; ')
}))
```

**Step B: User Scope Confirmation** (skip in auto mode):
```javascript
if (!autoYes) {
  // Present implementation scope summary
  console.log(`## Implementation Scope (${implScope.length} items)`)
  implScope.forEach((item, i) => {
    console.log(`${i+1}. **${item.objective}** [${item.priority}]`)
    console.log(`   Files: ${item.target_files.join(', ') || 'TBD by planning'}`)
    console.log(`   Done when: ${item.acceptance_criteria.join(' + ')}`)
  })

  const scopeConfirm = functions.request_user_input({
    questions: [{
      header: "Scope确认",
      id: "scope",
      question: "Implementation scope correct?",
      multiSelect: false,
      options: [
        { label: "确认执行(Recommended)", description: "Scope is clear, proceed to planning" },
        { label: "调整范围", description: "Narrow or expand scope before planning" },
        { label: "补充标准", description: "Add/refine acceptance criteria" }
      ]
    }]
  })
  // Handle 调整范围 / 补充标准 → update implScope, re-confirm
}
```

**Step C: Build Structured Handoff**:
```javascript
const handoff = {
  source: 'analyze-with-file',
  session_id: sessionId,
  session_folder: sessionFolder,
  summary: conclusions.summary,
  implementation_scope: implScope,
  key_findings: conclusions.key_conclusions?.slice(0, 5) || [],
  decision_context: conclusions.decision_trail?.slice(-3) || []
}

// Append plan checklist to discussion.md
appendToDiscussion(`
## Plan Checklist

> **This is a plan only — no code was modified.**

- **Recommendations**: ${actionableRecs.length}
- **Generated**: ${getUtc8ISOString()}

${implScope.map((item, i) => `### ${i+1}. ${item.objective}
- **Priority**: ${item.priority}
- **Rationale**: ${item.rationale}
- **Target files**: ${item.target_files.join(', ') || 'TBD'}
- **Acceptance criteria**: ${item.acceptance_criteria.join('; ')}
- [ ] Ready for execution`).join('\n\n')}
`)

// Hand off to downstream planning tool
functions.exec_command(`echo '${JSON.stringify(handoff)}' > ${sessionFolder}/handoff-spec.json`)
```

**"产出Issue"** → Convert recommendations to issues:
```javascript
for (const rec of actionableRecs) {
  const issueJson = JSON.stringify({
    title: rec.action,
    context: `${rec.action}\n\nRationale: ${rec.rationale}\nEvidence: ${rec.evidence_refs?.join(', ')}`,
    priority: rec.priority === 'high' ? 2 : 3,
    source: 'discovery',
    labels: dimensions
  })
  functions.exec_command(`echo '${issueJson}' | ccw issue create`)
}
// Display created issue IDs with next step hint
```

**"完成"** → Display artifact paths, end.

**Progress**: `functions.update_plan([{id: "next-step", status: "completed"}])`

**Success Criteria**:
- conclusions.json created with complete synthesis including findings_coverage[]
- **Findings Coverage Matrix** — all actionable findings mapped to disposition
- **Intent Coverage Matrix** — all original intents accounted for
- **Complete decision trail** documented and traceable
- **Terminal gate executed** — `next-step` is completed
- **No source code modified** — analysis is read-only throughout

## Templates

### Round Documentation Pattern

Each discussion round follows this structure in discussion.md:

```markdown
### Round N - [Deepen|Research|Adjust|Q&A] (timestamp)

#### User Input
What the user indicated they wanted to focus on

#### Decision Log
<!-- Use Decision Record Format from Recording Protocol -->

#### Key Findings
<!-- Use Key Finding Record Format from Recording Protocol -->

#### Technical Solutions
<!-- Use Technical Solution Record Format from Recording Protocol -->
<!-- Only if implementation approaches were discussed this round -->

#### Analysis Results
Detailed findings from this round's analysis
- Finding 1 (evidence: file:line)
- Finding 2 (evidence: file:line)

#### Corrected Assumptions
- ~~Previous assumption~~ → Corrected understanding
  - Reason: Why the assumption was wrong

#### Open Items
Remaining questions or areas for investigation

#### Narrative Synthesis
<!-- Use Narrative Synthesis Format from Recording Protocol -->
```

### discussion.md Evolution Summary

- **Header**: Session ID, topic, start time, dimensions
- **Analysis Context**: Focus areas, perspectives, depth level
- **Initial Questions**: Key questions to guide the analysis
- **Initial Decisions**: Why these dimensions and focus areas were selected
- **Discussion Timeline**: Round-by-round findings
  - Round 1: Exploration Results + Decision Log + Narrative Synthesis
  - Round 2-N: Current Understanding Summary + User feedback + direction adjustments + new insights + Decision Log + Key Findings + Narrative Synthesis
- **Decision Trail**: Consolidated critical decisions across all rounds
- **Synthesis & Conclusions**: Summary, key conclusions, recommendations
- **Current Understanding (Final)**: Consolidated insights
- **Session Statistics**: Rounds completed, findings count, artifacts generated, decision count

## Reference

### Output Structure

```
{projectRoot}/.workflow/.analysis/ANL-{date}-{slug}/
├── discussion.md              # Evolution of understanding & discussions
├── exploration-codebase.json  # Phase 2: Codebase context
├── research.json              # Phase 2: External research findings (if topic warrants)
├── explorations/              # Phase 2: Multi-perspective explorations (if selected)
│   ├── technical.json
│   ├── architectural.json
│   └── ...
├── explorations.json          # Phase 2: Single perspective aggregated findings
├── perspectives.json          # Phase 2: Multi-perspective findings with synthesis
├── conclusions.json           # Phase 4: Final synthesis with recommendations
└── handoff-spec.json          # Phase 4: Structured handoff (if "执行任务" selected)
```

> **Phase 4 Terminal Gate** determines which additional artifacts are generated (plan checklist in discussion.md, handoff-spec.json, or issues).

| File | Phase | Description |
|------|-------|-------------|
| `discussion.md` | 1-4 | Session metadata → discussion timeline → conclusions. Plan checklist appended if "执行任务". |
| `exploration-codebase.json` | 2 | Codebase context: relevant files, patterns, constraints |
| `research.json` | 2-3 | External research: best practices, pitfalls, codebase gaps (web.run results) |
| `explorations/*.json` | 2 | Per-perspective exploration results (multi only) |
| `explorations.json` | 2 | Single perspective aggregated findings |
| `perspectives.json` | 2 | Multi-perspective findings with cross-perspective synthesis |
| `conclusions.json` | 4 | Final synthesis: conclusions, recommendations, findings_coverage, open questions |
| `handoff-spec.json` | 4 | Structured handoff for downstream planning (if "执行任务" selected) |

### Analysis Dimensions

| Dimension | Keywords | Description |
|-----------|----------|-------------|
| architecture | 架构, architecture, design, structure, 设计, pattern | System design, component interactions, design patterns |
| implementation | 实现, implement, code, coding, 代码, logic | Code patterns, implementation details, algorithms |
| performance | 性能, performance, optimize, bottleneck, 优化, speed | Bottlenecks, optimization opportunities, resource usage |
| security | 安全, security, auth, permission, 权限, vulnerability | Vulnerabilities, authentication, access control |
| concept | 概念, concept, theory, principle, 原理, understand | Foundational ideas, principles, theory |
| comparison | 比较, compare, vs, difference, 区别, versus | Comparing solutions, evaluating alternatives |
| decision | 决策, decision, choice, tradeoff, 选择, trade-off | Trade-offs, impact analysis, decision rationale |

### Analysis Perspectives

Optional multi-perspective analysis (single perspective is default, max 4):

| Perspective | Focus | Best For |
|------------|-------|----------|
| **Technical** | Implementation patterns, code structure, technical feasibility | Understanding how and technical details |
| **Architectural** | System design, scalability, component interactions | Understanding structure and organization |
| **Security** | Security patterns, vulnerabilities, access control | Identifying security risks |
| **Performance** | Bottlenecks, optimization, resource utilization | Finding performance issues |

**Selection**: User can multi-select up to 4 perspectives in Phase 1, or default to single comprehensive view.

### Analysis Depth Levels

| Depth | Scope | Description |
|-------|-------|-------------|
| Quick | Surface level understanding | Fast overview, minimal exploration |
| Standard | Moderate depth with good coverage | Balanced analysis (default) |
| Deep | Comprehensive detailed analysis | Thorough multi-round investigation |

### Dimension-Direction Mapping

When user selects focus areas, generate directions dynamically:

| Dimension | Possible Directions |
|-----------|-------------------|
| architecture | System Design, Component Interactions, Technology Choices, Integration Points, Design Patterns, Scalability Strategy |
| implementation | Code Structure, Implementation Details, Code Patterns, Error Handling, Testing Approach, Algorithm Analysis |
| performance | Performance Bottlenecks, Optimization Opportunities, Resource Utilization, Caching Strategy, Concurrency Issues |
| security | Security Vulnerabilities, Authentication/Authorization, Access Control, Data Protection, Input Validation |
| concept | Conceptual Foundation, Core Mechanisms, Fundamental Patterns, Theory & Principles, Trade-offs & Reasoning |
| comparison | Solution Comparison, Pros & Cons Analysis, Technology Evaluation, Approach Differences |
| decision | Decision Criteria, Trade-off Analysis, Risk Assessment, Impact Analysis, Implementation Implications |

**Implementation**: Present 2-3 top dimension-related directions, allow user to multi-select and add custom directions.

### Consolidation Rules

When updating "Current Understanding" in discussion.md:

| Rule | Description |
|------|-------------|
| Promote confirmed insights | Move validated findings to "What We Established" |
| Track corrections | Keep important wrong→right transformations |
| Focus on current state | What do we know NOW, not the journey |
| Avoid timeline repetition | Don't copy discussion details into consolidated section |
| Preserve key learnings | Keep insights valuable for future reference |

**Example**:

Bad (cluttered):
```markdown
## Current Understanding
In round 1 we discussed X, then in round 2 user said Y...
```

Good (consolidated):
```markdown
## Current Understanding

### What We Established
- The authentication flow uses JWT with refresh tokens
- Rate limiting is implemented at API gateway level

### What Was Clarified
- ~~Assumed Redis for sessions~~ → Actually uses database-backed sessions

### Key Insights
- Current architecture supports horizontal scaling
```

### Error Handling

| Situation | Action | Recovery |
|-----------|--------|----------|
| No codebase detected | Normal flow, pure topic analysis | Proceed without exploration-codebase.json |
| Codebase search fails | Continue with available context | Note limitation in discussion.md |
| No relevant findings | Broaden search keywords | Ask user for clarification |
| User timeout in discussion | Save state, show resume command | Use `--continue` to resume |
| Max rounds reached (5) | Force synthesis phase | Highlight remaining questions in conclusions |
| Session folder conflict | Append timestamp suffix | Create unique folder and continue |
| Plan generation: no recommendations | No plan to generate | Inform user, suggest alternative |
| Web research fails | Continue with codebase-only analysis | Note limitation, flag as codebase_gaps |
| Research conflicts with codebase | Flag as codebase_gaps | Surface divergence for user review |

## Best Practices

### Core Principles

1. **No code modifications**: This skill is strictly read-only and plan-only. Phase 4 generates plan checklists and handoff specs but does NOT modify source code.
2. **Record Decisions Immediately**: Never defer recording — capture decisions as they happen using the Decision Record format
3. **Track Technical Solutions**: Record proposed/validated/rejected solutions with Technical Solution Record format
4. **Evidence-Based**: Every conclusion should reference specific code or patterns with confidence levels
5. **Embrace Corrections**: Track wrong→right transformations as valuable learnings
6. **Cumulative Context**: Always include prior findings in follow-up analysis to avoid re-discovery

### Before Starting

1. **Clear Topic Definition**: Detailed topics lead to better dimension identification
2. **User Context**: Understanding focus preferences helps scope the analysis
3. **Perspective Selection**: Choose 2-4 perspectives for complex topics, single for focused queries
4. **Scope Understanding**: Being clear about depth expectations sets correct analysis intensity

### During Analysis

1. **Review Findings**: Check exploration results before proceeding to discussion
2. **Document Assumptions**: Track what you think is true for correction later
3. **Use Continue Mode**: Resume sessions to build on previous findings
4. **Iterate Thoughtfully**: Each discussion round should meaningfully refine understanding
5. **Link Decisions to Outcomes**: Explicitly reference which decisions led to which outcomes

### Documentation Practices

1. **Timeline Clarity**: Use clear timestamps for traceability
2. **Evolution Tracking**: Document how understanding changed across rounds
3. **Multi-Perspective Synthesis**: When using multiple perspectives, document convergent/conflicting themes

## When to Use

**Use analyze-with-file when:**
- Exploring complex topics collaboratively with documented trail
- Need multi-round iterative refinement of understanding
- Decision-making requires exploring multiple perspectives
- Building shared understanding before implementation
- Want to document how understanding evolved
- Need external research integrated with codebase analysis

**Use Terminal Gate (Phase 4) when:**
- Analysis conclusions contain clear, actionable recommendations
- **执行任务**: Build implementation scope → handoff to downstream planning
- **产出Issue**: Convert recommendations to tracked issues via `ccw issue create`
- **完成**: Analysis is sufficient, no further action needed

**Consider alternatives when:**
- Specific bug diagnosis needed → use `debug-with-file`
- Generating new ideas/solutions → use `brainstorm-with-file`
- Complex planning with parallel perspectives → use `collaborative-plan-with-file`
- Ready to implement → use `lite-plan`

---

**Now execute the analyze-with-file workflow for topic**: $TOPIC
