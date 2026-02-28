---
name: analyze-with-file
description: Interactive collaborative analysis with documented discussions, inline exploration, and evolving understanding. Serial execution with no agent delegation.
argument-hint: "TOPIC=\"<question or topic>\" [--depth=quick|standard|deep] [--continue]"
---

# Codex Analyze-With-File Prompt

## Overview

Interactive collaborative analysis workflow with **documented discussion process**. Records understanding evolution, facilitates multi-round Q&A, and uses inline search tools for deep exploration.

**Core workflow**: Topic → Explore → Discuss → Document → Refine → Conclude → (Optional) Quick Execute

**Key features**:
- **Documented discussion timeline**: Captures understanding evolution across all phases
- **Decision recording at every critical point**: Mandatory recording of key findings, direction changes, and trade-offs
- **Multi-perspective analysis**: Supports up to 4 analysis perspectives (serial, inline)
- **Interactive discussion**: Multi-round Q&A with user feedback and direction adjustments
- **Quick execute**: Convert conclusions directly to executable tasks

### Decision Recording Protocol

**CRITICAL**: During analysis, the following situations **MUST** trigger immediate recording to discussion.md:

| Trigger | What to Record | Target Section |
|---------|---------------|----------------|
| **Direction choice** | What was chosen, why, what alternatives were discarded | `#### Decision Log` |
| **Key finding** | Finding content, impact scope, confidence level | `#### Key Findings` |
| **Assumption change** | Old assumption → new understanding, reason, impact | `#### Corrected Assumptions` |
| **User feedback** | User's original input, rationale for adoption/adjustment | `#### User Input` |
| **Disagreement & trade-off** | Conflicting viewpoints, trade-off basis, final choice | `#### Decision Log` |
| **Scope adjustment** | Before/after scope, trigger reason | `#### Decision Log` |

**Decision Record Format**:
```markdown
> **Decision**: [Description of the decision]
> - **Context**: [What triggered this decision]
> - **Options considered**: [Alternatives evaluated]
> - **Chosen**: [Selected approach] — **Reason**: [Rationale]
> - **Impact**: [Effect on analysis direction/conclusions]
```

**Recording Principles**:
- **Immediacy**: Record decisions as they happen, not at the end of a phase
- **Completeness**: Capture context, options, chosen approach, and reason
- **Traceability**: Later phases must be able to trace back why a decision was made

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

## Analysis Flow

```
Step 0: Session Setup
   ├─ Parse topic, flags (--depth, --continue, -y)
   ├─ Generate session ID: ANL-{slug}-{date}
   └─ Create session folder (or detect existing → continue mode)

Step 1: Topic Understanding
   ├─ Parse topic, identify analysis dimensions
   ├─ Initial scoping with user (focus areas, perspectives, depth)
   └─ Initialize discussion.md

Step 2: Exploration (Inline, No Agents)
   ├─ Detect codebase → search relevant modules, patterns
   │   ├─ Run `ccw spec load --category exploration` (if spec system available)
   │   └─ Use Grep, Glob, Read, mcp__ace-tool__search_context
   ├─ Multi-perspective analysis (if selected, serial)
   │   ├─ Single: Comprehensive analysis
   │   └─ Multi (≤4): Serial per-perspective analysis with synthesis
   ├─ Aggregate findings → explorations.json / perspectives.json
   └─ Update discussion.md with Round 1

Step 3: Interactive Discussion (Multi-Round, max 5)
   ├─ Present exploration findings
   ├─ Gather user feedback
   ├─ Process response:
   │   ├─ Deepen → deeper inline analysis in current direction
   │   ├─ Adjust → new inline analysis with adjusted focus
   │   ├─ Questions → direct answers with evidence
   │   └─ Complete → exit loop for synthesis
   ├─ Update discussion.md with each round
   └─ Repeat until user selects complete or max rounds

Step 4: Synthesis & Conclusion
   ├─ Consolidate all insights → conclusions.json
   ├─ Update discussion.md with final synthesis
   └─ Offer options: quick execute / create issue / generate task / export / done

Step 5: Execute (Optional - user selects, routes by complexity)
   ├─ Simple (≤2 recs): Direct inline execution → summary in discussion.md
   └─ Complex (≥3 recs): EXECUTE.md pipeline
      ├─ Enrich recommendations → generate .task/TASK-*.json
      ├─ Pre-execution analysis (dependencies, file conflicts, execution order)
      ├─ User confirmation
      ├─ Direct inline execution (Read/Edit/Write/Grep/Glob/Bash)
      ├─ Record events → execution-events.md, update execution.md
      └─ Report completion summary
```

## Configuration

| Flag | Default | Description |
|------|---------|-------------|
| `-y, --yes` | false | Auto-confirm all decisions |
| `--continue` | false | Continue existing session |
| `--depth` | standard | Analysis depth: quick / standard / deep |

**Session ID format**: `ANL-{slug}-{YYYY-MM-DD}`
- slug: lowercase, alphanumeric + CJK characters, max 40 chars
- date: YYYY-MM-DD (UTC+8)
- Auto-detect continue: session folder + discussion.md exists → continue mode

## Implementation Details

### Session Initialization

##### Step 0: Initialize Session

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
const projectRoot = Bash('git rev-parse --show-toplevel 2>/dev/null || pwd').trim()

const slug = topic.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').substring(0, 40)
const dateStr = getUtc8ISOString().substring(0, 10)
const sessionId = `ANL-${slug}-${dateStr}`
const sessionFolder = `${projectRoot}/.workflow/.analysis/${sessionId}`

// Auto-detect continue: session folder + discussion.md exists → continue mode
// If continue → load discussion.md + explorations, resume from last round
Bash(`mkdir -p ${sessionFolder}`)
```

### Phase 1: Topic Understanding

**Objective**: Parse the topic, identify relevant analysis dimensions, scope the analysis with user input, and initialize the discussion document.

##### Step 1.1: Parse Topic & Identify Dimensions

Match topic keywords against analysis dimensions:

```javascript
const ANALYSIS_DIMENSIONS = {
  architecture:    ['架构', 'architecture', 'design', 'structure', '设计', 'pattern'],
  implementation:  ['实现', 'implement', 'code', 'coding', '代码', 'logic'],
  performance:     ['性能', 'performance', 'optimize', 'bottleneck', '优化', 'speed'],
  security:        ['安全', 'security', 'auth', 'permission', '权限', 'vulnerability'],
  concept:         ['概念', 'concept', 'theory', 'principle', '原理', 'understand'],
  comparison:      ['比较', 'compare', 'vs', 'difference', '区别', 'versus'],
  decision:        ['决策', 'decision', 'choice', 'tradeoff', '选择', 'trade-off']
}

// Match topic text against keyword lists
// If multiple dimensions match, include all
// If none match, default to "architecture" and "implementation"
const dimensions = identifyDimensions(topic, ANALYSIS_DIMENSIONS)
```

##### Step 1.2: Initial Scoping (New Session Only)

For new sessions, gather user preferences (skipped in auto mode or continue mode):

```javascript
if (!autoYes && !continueMode) {
  // 1. Focus areas (multi-select)
  // Generate directions dynamically from detected dimensions (see Dimension-Direction Mapping)
  const focusAreas = AskUserQuestion({
    questions: [{
      question: "Select analysis focus areas:",
      header: "Focus",
      multiSelect: true,
      options: generateFocusOptions(dimensions) // Dynamic based on dimensions
    }]
  })

  // 2. Analysis perspectives (multi-select, max 4)
  const perspectives = AskUserQuestion({
    questions: [{
      question: "Select analysis perspectives (single = focused, multi = broader coverage):",
      header: "Perspectives",
      multiSelect: true,
      options: [
        { label: "Technical", description: "Implementation patterns, code structure, technical feasibility" },
        { label: "Architectural", description: "System design, scalability, component interactions" },
        { label: "Security", description: "Vulnerabilities, authentication, access control" },
        { label: "Performance", description: "Bottlenecks, optimization, resource utilization" }
      ]
    }]
  })

  // 3. Analysis depth (single-select, unless --depth already set)
  // Quick: surface level | Standard: moderate depth | Deep: comprehensive
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

---

## Current Understanding

> To be populated after exploration.
`
Write(`${sessionFolder}/discussion.md`, discussionMd)
```

**Success Criteria**:
- Session folder created with discussion.md initialized
- Analysis dimensions identified
- User preferences captured (focus, perspectives, depth)
- **Initial decisions recorded**: Dimension selection rationale, excluded dimensions with reasons, user preference intent

### Phase 2: Exploration

**Objective**: Gather codebase context and execute analysis to build understanding. All exploration done inline — no agent delegation.

##### Step 2.1: Detect Codebase & Explore

Search the codebase directly using available tools:

```javascript
const hasCodebase = Bash(`
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
  //    - Run `ccw spec load --category exploration` (load project specs)
  //    - .workflow/specs/*.md (project conventions)

  // 2. Search codebase for relevant content
  //    Use: Grep, Glob, Read, or mcp__ace-tool__search_context
  //    Search based on topic keywords and identified dimensions
  //    Focus on:
  //      - Modules/components related to the topic
  //      - Existing patterns and code structure
  //      - Integration points and constraints
  //      - Relevant configuration and dependencies

  // 3. Write findings
  Write(`${sessionFolder}/exploration-codebase.json`, JSON.stringify({
    project_type: hasCodebase,
    relevant_files: [...],    // [{path, relevance, summary}]
    patterns: [...],          // [{pattern, files, description}]
    constraints: [...],       // Architectural constraints found
    integration_points: [...], // [{location, description}]
    key_findings: [...],      // Main insights from code search
    _metadata: { timestamp: getUtc8ISOString(), exploration_scope: '...' }
  }, null, 2))
}
```

##### Step 2.2: Multi-Perspective Analysis (if selected)

Analyze the topic from each selected perspective. All analysis done inline by the AI.

**Single perspective** (default):

```javascript
// Analyze comprehensively across all identified dimensions
// Use exploration-codebase.json as context
// Focus on: patterns, anti-patterns, potential issues, opportunities

const findings = {
  session_id: sessionId,
  timestamp: getUtc8ISOString(),
  topic: topic,
  dimensions: dimensions,
  sources: [...],            // [{type, file, summary}]
  key_findings: [...],       // Main insights
  discussion_points: [...],  // Questions for user engagement
  open_questions: [...]      // Unresolved questions
}
Write(`${sessionFolder}/explorations.json`, JSON.stringify(findings, null, 2))
```

**Multi-perspective** (2-4 perspectives, serial):

```javascript
// Analyze each perspective sequentially
// For each perspective:
//   1. Focus search/analysis on that perspective's concern area
//   2. Generate perspective-specific insights
//   3. Write individual findings

selectedPerspectives.forEach(perspective => {
  // Analyze from this perspective's angle
  // Use exploration-codebase.json + dimension focus
  // Write to explorations/{perspective.name}.json
  Write(`${sessionFolder}/explorations/${perspective.name}.json`, JSON.stringify({
    perspective: perspective.name,
    relevant_files: [...],
    patterns: [...],
    key_findings: [...],
    perspective_insights: [...],
    open_questions: [...],
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
    session_id: sessionId,
    timestamp: getUtc8ISOString(),
    topic: topic,
    dimensions: dimensions,

    // Individual perspective findings
    perspectives: selectedPerspectives.map(p => ({
      name: p.name,
      findings: readJson(`${sessionFolder}/explorations/${p.name}.json`).key_findings,
      insights: readJson(`${sessionFolder}/explorations/${p.name}.json`).perspective_insights,
      questions: readJson(`${sessionFolder}/explorations/${p.name}.json`).open_questions
    })),

    // Cross-perspective synthesis
    synthesis: {
      convergent_themes: [...],   // What all perspectives agree on
      conflicting_views: [...],   // Where perspectives differ
      unique_contributions: [...]  // Insights unique to specific perspectives
    },

    aggregated_findings: [...],   // Main insights across all perspectives
    discussion_points: [...],     // Questions for user engagement
    open_questions: [...]         // Unresolved questions
  }
  Write(`${sessionFolder}/perspectives.json`, JSON.stringify(synthesis, null, 2))
}
```

##### Step 2.4: Update discussion.md

Append Round 1 with exploration results:

**Single perspective round 1**:
- Sources analyzed (files, patterns)
- Key findings with evidence
- Discussion points for user
- Open questions

**Multi-perspective round 1**:
- Per-perspective summary (brief)
- Synthesis section:
  - Convergent themes (what all perspectives agree on)
  - Conflicting views (where perspectives differ)
  - Unique contributions (insights from specific perspectives)
- Discussion points
- Open questions

**Success Criteria**:
- exploration-codebase.json created with codebase context (if codebase exists)
- explorations.json (single) or perspectives.json (multi) created with findings
- discussion.md updated with Round 1 results
- Ready for interactive discussion
- **Key findings recorded** with evidence references and confidence levels
- **Exploration decisions recorded** (why certain perspectives/search strategies were chosen)

### Phase 3: Interactive Discussion

**Objective**: Iteratively refine understanding through multi-round user-guided discussion cycles.

**Max Rounds**: 5 discussion rounds (can exit earlier if user indicates analysis is complete)

##### Step 3.1: Present Findings & Gather Feedback

Display current understanding and gather user direction:

```javascript
// Display current findings summary from explorations.json or perspectives.json
// Show key points, discussion points, open questions

if (!autoYes) {
  const feedback = AskUserQuestion({
    questions: [{
      question: `Analysis round ${round}: Feedback on current findings?`,
      header: "Direction",
      multiSelect: false,
      options: [
        { label: "Deepen", description: "Analysis direction is correct, investigate deeper" },
        { label: "Adjust Direction", description: "Different understanding or focus needed" },
        { label: "Specific Questions", description: "Have specific questions to ask" },
        { label: "Analysis Complete", description: "Sufficient information obtained, proceed to synthesis" }
      ]
    }]
  })
}
```

##### Step 3.2: Process User Response

**Recording Checkpoint**: Regardless of which option the user selects, the following MUST be recorded to discussion.md:
- User's original choice and expression
- Impact of this choice on analysis direction
- If direction changed, record a full Decision Record

**Deepen** — continue analysis in current direction:
```javascript
// Deeper inline analysis using search tools
// Investigate edge cases, special scenarios
// Identify patterns not yet discussed
// Suggest improvement approaches
// Provide risk/impact assessments
// Update explorations.json with deepening findings
// Record: Which assumptions were confirmed, specific angles for deeper exploration
```

**Adjust Direction** — new focus area:
```javascript
// Ask user for adjusted focus
const adjustedFocus = AskUserQuestion({
  questions: [{
    question: "What should the new analysis focus be?",
    header: "New Focus",
    multiSelect: false,
    options: [
      { label: "Code Details", description: "Deeper into implementation specifics" },
      { label: "Architecture", description: "Broader structural analysis" },
      { label: "Best Practices", description: "Industry standards and recommendations" }
    ]
  }]
})

// Analyze from adjusted perspective using inline search
// Compare new insights with prior analysis
// Identify what was missed and why
// Update explorations.json with adjusted findings
// Record Decision: Trigger reason for direction adjustment, old vs new direction, expected impact
```

**Specific Questions** — answer directly:
```javascript
// Capture user questions via AskUserQuestion (text input)
// Answer each question based on codebase search and analysis
// Provide evidence and file references
// Rate confidence for each answer (high/medium/low)
// Document Q&A in discussion.md
// Record: Knowledge gaps revealed by the question, new understanding from the answer
```

**Analysis Complete** — exit loop, proceed to Phase 4.
```javascript
// Record: Why concluding at this round (sufficient information / scope fully focused / user satisfied)
```

##### Step 3.3: Document Each Round

Update discussion.md with results from each discussion round:

| Section | Content |
|---------|---------|
| User Direction | Action taken (deepen/adjust/questions) and focus area |
| Decision Log | Decisions made this round using Decision Record format |
| Analysis Results | Key findings, insights, evidence with file references |
| Insights | New learnings or clarifications from this round |
| Corrected Assumptions | Important wrong→right transformations with explanation |
| Open Items | Remaining questions or areas for future investigation |

**Documentation Standards**:
- Clear timestamps for each round
- Evidence-based findings with file references
- Explicit tracking of assumption corrections
- Organized by analysis dimension
- Links between rounds showing understanding evolution

##### Step 3.4: Intent Drift Check (every round ≥ 2)

Re-read "User Intent" / "Analysis Context" from discussion.md header. For each original intent item, check coverage status:

```markdown
#### Intent Coverage Check
- ✅ Intent 1: [addressed in Round N]
- 🔄 Intent 2: [in-progress, current focus]
- ⚠️ Intent 3: [implicitly absorbed by X — needs explicit confirmation]
- ❌ Intent 4: [not yet discussed]
```

- If any item is "implicitly absorbed" (⚠️), note it explicitly in discussion.md — absorbed ≠ addressed
- If any item is ❌ after 3+ rounds, surface it to the user in the next round's presentation

**Success Criteria**:
- User feedback processed for each round
- discussion.md updated with all discussion rounds
- Assumptions documented and corrected
- Exit condition reached (user selects complete or max rounds)
- **All decision points recorded** with Decision Record format
- **Direction changes documented** with before/after comparison and rationale

### Phase 4: Synthesis & Conclusion

**Objective**: Consolidate insights from all discussion rounds, generate conclusions and recommendations.

##### Step 4.0: Intent Coverage Verification (MANDATORY before synthesis)

Re-read all original user intent / analysis context items from discussion.md header. For EACH item, determine coverage status:

- **✅ Addressed**: Explicitly discussed and concluded with clear design/recommendation
- **🔀 Transformed**: Original intent evolved into a different solution — document the transformation chain
- **⚠️ Absorbed**: Implicitly covered by a broader solution — flag for explicit confirmation
- **❌ Missed**: Not discussed — MUST be either addressed now or explicitly listed as out-of-scope with reason

Write "Intent Coverage Matrix" to discussion.md:

```markdown
### Intent Coverage Matrix
| # | Original Intent | Status | Where Addressed | Notes |
|---|----------------|--------|-----------------|-------|
| 1 | [intent text] | ✅ Addressed | Round N, Conclusion #M | |
| 2 | [intent text] | 🔀 Transformed | Round N → Round M | Original: X → Final: Y |
| 3 | [intent text] | ❌ Missed | — | Reason for omission |
```

**Gate**: If any item is ❌ Missed, MUST either:
- (a) Add a dedicated discussion round to address it before continuing, OR
- (b) Explicitly confirm with user that it is intentionally deferred

##### Step 4.1: Consolidate Insights

```javascript
const conclusions = {
  session_id: sessionId,
  topic: topic,
  completed: getUtc8ISOString(),
  total_rounds: roundCount,
  summary: '...',                    // Executive summary
  key_conclusions: [                 // Main conclusions
    { point: '...', evidence: '...', confidence: 'high|medium|low' }
  ],
  recommendations: [                 // Actionable recommendations
    {
      action: '...',                    // What to do (imperative verb + target)
      rationale: '...',                 // Why this matters
      priority: 'high|medium|low',
      evidence_refs: ['file:line', ...] // Supporting evidence locations
    }
  ],
  open_questions: [...],             // Unresolved questions
  follow_up_suggestions: [           // Next steps
    { type: 'issue|task|research', summary: '...' }
  ],
  decision_trail: [                  // Consolidated decisions from all phases
    { round: 1, decision: '...', context: '...', options_considered: [...], chosen: '...', reason: '...', impact: '...' }
  ],
  intent_coverage: [                 // From Step 4.0
    { intent: '...', status: 'addressed|transformed|absorbed|missed', where_addressed: '...', notes: '...' }
  ]
}
Write(`${sessionFolder}/conclusions.json`, JSON.stringify(conclusions, null, 2))
```

##### Step 4.2: Final discussion.md Update

Append conclusions section and finalize:

**Synthesis & Conclusions Section**:
- **Executive Summary**: Overview of analysis findings
- **Key Conclusions**: Ranked by confidence level with supporting evidence
- **Recommendations**: Prioritized action items with rationale
- **Remaining Open Questions**: Unresolved items for future work

**Current Understanding (Final) Section**:

| Subsection | Content |
|------------|---------|
| What We Established | Confirmed points and validated findings |
| What Was Clarified | Important corrections (~~wrong→right~~) |
| Key Insights | Valuable learnings for future reference |

**Decision Trail Section**:

| Subsection | Content |
|------------|---------|
| Critical Decisions | Pivotal decisions that shaped the analysis outcome |
| Direction Changes | Timeline of scope/focus adjustments with rationale |
| Trade-offs Made | Key trade-offs and why certain paths were chosen |

**Session Statistics**: Total discussion rounds, key findings count, dimensions covered, artifacts generated, **decision count**.

##### Step 4.3: Post-Completion Options

**Complexity Assessment** — determine whether .task/*.json generation is warranted:

```javascript
// Assess recommendation complexity to decide available options
const recs = conclusions.recommendations || []
const complexity = assessComplexity(recs)

function assessComplexity(recs) {
  if (recs.length === 0) return 'none'
  if (recs.length <= 2 && recs.every(r => r.priority === 'low')) return 'simple'
  if (recs.length >= 3 || recs.some(r => r.priority === 'high')) return 'complex'
  return 'moderate'  // 1-2 medium-priority recommendations
}

// Complexity → available options mapping:
//   none:    Done | Create Issue | Export Report
//   simple:  Done | Create Issue | Export Report (no task generation — overkill)
//   moderate: Done | Generate Task | Create Issue | Export Report
//   complex:  Quick Execute | Generate Task | Create Issue | Export Report | Done
```

```javascript
if (!autoYes) {
  const options = buildOptionsForComplexity(complexity)
  AskUserQuestion({
    questions: [{
      question: `Analysis complete (${recs.length} recommendations, complexity: ${complexity}). Next step:`,
      header: "Next Step",
      multiSelect: false,
      options: options
    }]
  })
} else {
  // Auto mode: generate .task/*.json only for moderate/complex, skip for simple/none
  if (complexity === 'complex' || complexity === 'moderate') {
    // → Phase 5 Step 5.1-5.2 (task generation only, no execution)
  } else {
    // → Done (conclusions.json is sufficient output)
  }
}
```

**Options by Complexity**:

| Complexity | Available Options | Rationale |
|------------|-------------------|-----------|
| `none` | Done, Create Issue, Export Report | No actionable recommendations |
| `simple` | Done, Create Issue, Export Report | 1-2 low-priority items don't warrant formal task JSON |
| `moderate` | Generate Task, Create Issue, Export Report, Done | Task structure helpful but execution not urgent |
| `complex` | Quick Execute, Generate Task, Create Issue, Export Report, Done | Full pipeline justified |

| Selection | Action |
|-----------|--------|
| Quick Execute | Jump to Phase 5 (routes by complexity) |
| Create Issue | `Skill(skill="issue:new", args="...")` |
| Generate Task | Jump to Phase 5 Step 5.1-5.2 only (generate .task/*.json, no execution) |
| Export Report | Copy discussion.md + conclusions.json to user-specified location |
| Done | Display artifact paths, end |

**Success Criteria**:
- conclusions.json created with complete synthesis
- discussion.md finalized with conclusions and decision trail
- **Intent Coverage Matrix** verified — all original intents accounted for (no ❌ Missed without explicit user deferral)
- User offered meaningful next step options
- **Complete decision trail** documented and traceable from initial scoping to final conclusions

### Phase 5: Execute (Optional)

**Objective**: Execute analysis recommendations — route by complexity.

**Trigger**: User selects "Quick Execute" in Phase 4. In auto mode, triggered only for `moderate`/`complex` recommendations.

**Routing Logic**:

```
complexity assessment (from Phase 4.3)
  ├─ simple/moderate (≤2 recommendations, clear changes)
  │   └─ Direct inline execution — no .task/*.json overhead
  └─ complex (≥3 recommendations, or high-priority with dependencies)
      └─ Route to EXECUTE.md — full pipeline (task generation → execution)
```

##### Step 5.1: Route by Complexity

```javascript
const recs = conclusions.recommendations || []

if (recs.length >= 3 || recs.some(r => r.priority === 'high')) {
  // COMPLEX PATH → EXECUTE.md pipeline
  // Full specification: EXECUTE.md
  // Flow: load all context → generate .task/*.json → pre-execution analysis → serial execution → finalize
} else {
  // SIMPLE PATH → direct inline execution (below)
}
```

##### Step 5.2: Simple Path — Direct Inline Execution

For simple/moderate recommendations, execute directly without .task/*.json ceremony:

```javascript
// For each recommendation:
recs.forEach((rec, index) => {
  // 1. Locate relevant files from evidence_refs or codebase search
  const files = rec.evidence_refs
    ?.filter(ref => ref.includes(':'))
    .map(ref => ref.split(':')[0]) || []

  // 2. Read each target file
  files.forEach(filePath => Read(filePath))

  // 3. Apply changes based on rec.action + rec.rationale
  //    Use Edit (preferred) for modifications, Write for new files

  // 4. Log to discussion.md — append execution summary
})

// Append execution summary to discussion.md
appendToDiscussion(`
## Quick Execution Summary

- **Recommendations executed**: ${recs.length}
- **Completed**: ${getUtc8ISOString()}

${recs.map((rec, i) => `### ${i+1}. ${rec.action}
- **Status**: completed/failed
- **Rationale**: ${rec.rationale}
- **Evidence**: ${rec.evidence_refs?.join(', ') || 'N/A'}
`).join('\n')}
`)
```

**Simple path characteristics**:
- No `.task/*.json` generation
- No `execution.md` / `execution-events.md`
- Execution summary appended directly to `discussion.md`
- Suitable for 1-2 clear, low-risk recommendations

##### Step 5.3: Complex Path — EXECUTE.md Pipeline

For complex recommendations, follow the full specification in `EXECUTE.md`:

1. **Load context sources**: Reuse in-memory artifacts or read from disk
2. **Enrich recommendations**: Resolve target files, generate implementation steps, build convergence criteria
3. **Generate `.task/*.json`**: Individual task files with full execution context
4. **Pre-execution analysis**: Dependency validation, file conflicts, topological sort
5. **User confirmation**: Present task list, allow adjustment
6. **Serial execution**: Execute each task following generated implementation steps
7. **Finalize**: Update task states, write execution artifacts

**Full specification**: `EXECUTE.md`

**Success Criteria**:
- Simple path: recommendations executed, summary in discussion.md
- Complex path: `.task/*.json` generated with quality validation, execution tracked via execution.md + execution-events.md
- Execution route chosen correctly based on complexity assessment

## Output Structure

```
{projectRoot}/.workflow/.analysis/ANL-{slug}-{date}/
├── discussion.md              # Evolution of understanding & discussions
├── exploration-codebase.json  # Phase 2: Codebase context
├── explorations/              # Phase 2: Multi-perspective explorations (if selected)
│   ├── technical.json
│   ├── architectural.json
│   └── ...
├── explorations.json          # Phase 2: Single perspective aggregated findings
├── perspectives.json          # Phase 2: Multi-perspective findings with synthesis
└── conclusions.json           # Phase 4: Final synthesis with recommendations
```

> **Phase 5 complex path** adds `.task/`, `execution.md`, `execution-events.md` — see `EXECUTE.md` for structure.

| File | Phase | Description |
|------|-------|-------------|
| `discussion.md` | 1-4 | Session metadata → discussion timeline → conclusions. Simple execution summary appended here. |
| `exploration-codebase.json` | 2 | Codebase context: relevant files, patterns, constraints |
| `explorations/*.json` | 2 | Per-perspective exploration results (multi only) |
| `explorations.json` | 2 | Single perspective aggregated findings |
| `perspectives.json` | 2 | Multi-perspective findings with cross-perspective synthesis |
| `conclusions.json` | 4 | Final synthesis: conclusions, recommendations, open questions |

## Analysis Dimensions Reference

Dimensions guide the scope and focus of analysis:

| Dimension | Keywords | Description |
|-----------|----------|-------------|
| architecture | 架构, architecture, design, structure, 设计, pattern | System design, component interactions, design patterns |
| implementation | 实现, implement, code, coding, 代码, logic | Code patterns, implementation details, algorithms |
| performance | 性能, performance, optimize, bottleneck, 优化, speed | Bottlenecks, optimization opportunities, resource usage |
| security | 安全, security, auth, permission, 权限, vulnerability | Vulnerabilities, authentication, access control |
| concept | 概念, concept, theory, principle, 原理, understand | Foundational ideas, principles, theory |
| comparison | 比较, compare, vs, difference, 区别, versus | Comparing solutions, evaluating alternatives |
| decision | 决策, decision, choice, tradeoff, 选择, trade-off | Trade-offs, impact analysis, decision rationale |

## Analysis Perspectives

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

## Dimension-Direction Mapping

When user selects focus areas, generate directions dynamically from detected dimensions:

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

## Consolidation Rules

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

## Templates

### discussion.md Structure

The discussion.md file evolves through the analysis:

- **Header**: Session ID, topic, start time, identified dimensions
- **Analysis Context**: Focus areas, perspectives, depth level
- **Initial Questions**: Key questions to guide the analysis
- **Initial Decisions**: Why these dimensions and focus areas were selected
- **Discussion Timeline**: Round-by-round findings
  - Round 1: Initial Understanding + Exploration Results + **Initial Decision Log**
  - Round 2-N: User feedback + direction adjustments + new insights + **Decision Log per round**
- **Decision Trail**: Consolidated critical decisions across all rounds
- **Synthesis & Conclusions**: Summary, key conclusions, recommendations
- **Current Understanding (Final)**: Consolidated insights
- **Session Statistics**: Rounds completed, findings count, artifacts generated, decision count

### Round Documentation Pattern

Each discussion round follows a consistent structure:

```markdown
### Round N - [Deepen|Adjust|Q&A] (timestamp)

#### User Input
What the user indicated they wanted to focus on

#### Decision Log
> **Decision**: [Description of direction/scope/approach decision made this round]
> - **Context**: [What triggered this decision]
> - **Options considered**: [Alternatives evaluated]
> - **Chosen**: [Selected approach] — **Reason**: [Rationale]
> - **Impact**: [Effect on analysis direction/conclusions]

#### Analysis Results
New findings from this round's analysis
- Finding 1 (evidence: file:line)
- Finding 2 (evidence: file:line)

#### Insights
Key learnings and clarifications

#### Corrected Assumptions
- ~~Previous assumption~~ → Corrected understanding
  - Reason: Why the assumption was wrong

#### Open Items
Remaining questions or areas for investigation
```

## Error Handling

| Situation | Action | Recovery |
|-----------|--------|----------|
| No codebase detected | Normal flow, pure topic analysis | Proceed without exploration-codebase.json |
| Codebase search fails | Continue with available context | Note limitation in discussion.md |
| No relevant findings | Broaden search keywords | Ask user for clarification |
| User timeout in discussion | Save state, show resume command | Use `--continue` to resume |
| Max rounds reached (5) | Force synthesis phase | Highlight remaining questions in conclusions |
| Session folder conflict | Append timestamp suffix | Create unique folder and continue |
| Quick execute: task fails | Record failure, ask user | Retry, skip, or abort (see EXECUTE.md) |
| Quick execute: verification fails | Mark as unverified | Note in events, manual check |
| Quick execute: no recommendations | Cannot generate .task/*.json | Inform user, suggest lite-plan |
| Quick execute: simple recommendations | Complexity too low for .task/*.json | Direct inline execution (no task generation) |

## Best Practices

### Core Principles

1. **Explicit user confirmation required before code modifications**: The analysis phase is strictly read-only. Any code changes (Phase 5 quick execute) require user approval.

### Before Starting Analysis

1. **Clear Topic Definition**: Detailed topics lead to better dimension identification
2. **User Context**: Understanding focus preferences helps scope the analysis
3. **Perspective Selection**: Choose 2-4 perspectives for complex topics, single for focused queries
4. **Scope Understanding**: Being clear about depth expectations sets correct analysis intensity

### During Analysis

1. **Review Findings**: Check exploration results before proceeding to discussion
2. **Document Assumptions**: Track what you think is true for correction later
3. **Use Continue Mode**: Resume sessions to build on previous findings rather than starting over
4. **Embrace Corrections**: Track wrong→right transformations as valuable learnings
5. **Iterate Thoughtfully**: Each discussion round should meaningfully refine understanding
6. **Record Decisions Immediately**: Never defer recording — capture decisions as they happen using the Decision Record format. A decision not recorded in-the-moment is a decision lost

### Documentation Practices

1. **Evidence-Based**: Every conclusion should reference specific code or patterns
2. **Confidence Levels**: Indicate confidence (high/medium/low) for conclusions
3. **Timeline Clarity**: Use clear timestamps for traceability
4. **Evolution Tracking**: Document how understanding changed across rounds
5. **Action Items**: Generate specific, actionable recommendations
6. **Multi-Perspective Synthesis**: When using multiple perspectives, document convergent/conflicting themes
7. **Link Decisions to Outcomes**: When writing conclusions, explicitly reference which decisions led to which outcomes — this creates an auditable trail from initial scoping to final recommendations

## When to Use

**Use analyze-with-file when:**
- Exploring complex topics collaboratively with documented trail
- Need multi-round iterative refinement of understanding
- Decision-making requires exploring multiple perspectives
- Building shared understanding before implementation
- Want to document how understanding evolved

**Use Quick Execute (Phase 5) when:**
- Analysis conclusions contain clear, actionable recommendations
- Simple: 1-2 clear changes → direct inline execution (no .task/ overhead)
- Complex: 3+ recommendations with dependencies → EXECUTE.md pipeline (.task/*.json → serial execution)

**Consider alternatives when:**
- Specific bug diagnosis needed → use `debug-with-file`
- Generating new ideas/solutions → use `brainstorm-with-file`
- Complex planning with parallel perspectives → use `collaborative-plan-with-file`
- Ready to implement → use `lite-plan`
- Requirement decomposition needed → use `req-plan-with-file`

---

**Now execute the analyze-with-file workflow for topic**: $TOPIC
