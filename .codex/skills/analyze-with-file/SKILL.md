---
name: analyze-with-file
description: Interactive collaborative analysis with documented discussions, inline exploration, and evolving understanding.
argument-hint: "TOPIC=\"<question or topic>\" [--depth=quick|standard|deep] [--continue]"
---

# Codex Analyze-With-File Prompt

## Overview

Interactive collaborative analysis workflow with **documented discussion process**. Records understanding evolution, facilitates multi-round Q&A, and uses inline search tools for deep exploration.

**Core workflow**: Topic → Explore → Discuss → Document → Refine → Conclude → Plan Checklist

**Key features**:
- **Documented discussion timeline**: Captures understanding evolution across all phases
- **Decision recording at every critical point**: Mandatory recording of key findings, direction changes, and trade-offs
- **Multi-perspective analysis**: Supports up to 4 analysis perspectives (serial, inline)
- **Interactive discussion**: Multi-round Q&A with user feedback and direction adjustments
- **Plan output**: Generate structured plan checklist for downstream execution (e.g., `$csv-wave-pipeline`)

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

**Session ID format**: `ANL-{slug}-{YYYY-MM-DD}`
- slug: lowercase, alphanumeric + CJK characters, max 40 chars
- date: YYYY-MM-DD (UTC+8)
- Auto-detect continue: session folder + discussion.md exists → continue mode

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
   │   ├─ Run `ccw spec load --category debug` (known issues and root-cause notes)
   │   └─ Use Grep, Glob, Read, mcp__ace-tool__search_context
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
   ├─ Gather user feedback
   ├─ Process response:
   │   ├─ Deepen → context-driven + heuristic options → deeper inline analysis
   │   ├─ Agree & Suggest → user-directed exploration
   │   ├─ Adjust → new inline analysis with adjusted focus
   │   ├─ Questions → direct answers with evidence
   │   └─ Complete → exit loop for synthesis
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
   ├─ Interactive Recommendation Review (per-recommendation confirm/modify/reject)
   └─ Offer options: generate plan / create issue / export / done

Step 5: Plan Generation (Optional - produces plan only, NO code modifications)
   ├─ Generate inline plan checklist → appended to discussion.md
   └─ Remind user to execute via $csv-wave-pipeline
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
  // 1. Focus areas (multi-select)
  // Generate directions dynamically from detected dimensions (see Dimension-Direction Mapping)
  const focusAreas = request_user_input({
    questions: [{
      header: "聚焦领域",
      id: "focus",
      question: "Select analysis focus areas:",
      options: generateFocusOptions(dimensions) // Dynamic based on dimensions
    }]
  })

  // 2. Analysis perspectives (multi-select, max 4)
  // Options from Perspectives Reference table
  const perspectives = request_user_input({
    questions: [{
      header: "分析视角",
      id: "perspectives",
      question: "Select analysis perspectives (single = focused, multi = broader coverage):",
      options: perspectiveOptions // See Perspectives Reference
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

### Phase 2: Exploration

**Objective**: Gather codebase context and execute analysis to build understanding. All exploration done inline — no agent delegation.

##### Step 2.1: Detect Codebase & Explore

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
  //    - Run `ccw spec load --category debug` (known issues and root-cause notes)
  //    - .workflow/specs/*.md (project conventions)

  // 2. Search codebase for relevant content
  //    Use: Grep, Glob, Read, or mcp__ace-tool__search_context
  //    Focus on: modules/components, patterns/structure, integration points, config/dependencies

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
    aggregated_findings: [...], discussion_points: [...], open_questions: [...]
  }
  Write(`${sessionFolder}/perspectives.json`, JSON.stringify(synthesis, null, 2))
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
- explorations.json (single) or perspectives.json (multi) created with findings
- discussion.md updated with Round 1 results
- **Initial Intent Coverage Check** completed — early drift detection
- **Key findings recorded** with evidence references and confidence levels
- **Exploration decisions recorded** (why certain perspectives/search strategies were chosen)

### Phase 3: Interactive Discussion

**Objective**: Iteratively refine understanding through multi-round user-guided discussion cycles. **Max Rounds**: 5.

##### Step 3.1: Present Findings & Gather Direction

**Current Understanding Summary** (Round >= 2, BEFORE presenting new findings):
- Generate 1-2 sentence recap of established consensus and last round's direction
- Example: "到目前为止，我们已确认 [established facts]。上一轮 [key action/direction]。现在，这是新一轮的发现："

```javascript
if (!autoYes) {
  const feedback = request_user_input({
    questions: [{
      header: "分析方向",
      id: "direction",
      question: `Analysis round ${round}: Feedback on current findings?`,
      options: [
        { label: "Deepen(Recommended)", description: "Analysis direction is correct, investigate deeper" },
        { label: "Adjust Direction", description: "Different understanding or focus needed" },
        { label: "Analysis Complete", description: "Sufficient information obtained, proceed to synthesis" }
      ]
    }]
  })
}
```

##### Step 3.2: Process User Response

**Recording Checkpoint**: Regardless of option selected, MUST record to discussion.md:
- User's original choice and expression
- Impact on analysis direction
- If direction changed, record a full Decision Record (see [Recording Protocol](#recording-protocol))

| Response | Action |
|----------|--------|
| **Deepen** | Generate 2-3 context-driven options (unresolved questions, low-confidence findings, unexplored dimensions) + 1-2 heuristic options that break current frame (e.g., "compare with best practices in [related domain]", "analyze under extreme load scenarios", "review from security audit perspective", "explore simpler architectural alternatives"). Execute selected direction via inline search. Merge new findings. Record confirmed assumptions and exploration angles. |
| **Agree & Suggest** | Ask user for specific direction (free text). Execute user's direction via inline search. Record user-driven rationale and findings. |
| **Adjust Direction** | Ask user for new focus. Analyze from adjusted perspective. Compare new insights with prior analysis. Identify what was missed. Record trigger reason, old vs new direction, expected impact. |
| **Specific Questions** | Capture questions. Answer with codebase search evidence. Rate confidence per answer. Document Q&A. Record knowledge gaps revealed. |
| **Analysis Complete** | Record why concluding at this round. Exit loop → Phase 4. |

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
- **Direction changes documented** with before/after comparison

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

Walk through each recommendation one-by-one (ordered by priority: high → medium → low):

```javascript
for (const [index, rec] of sortedRecs.entries()) {
  const review = request_user_input({
    questions: [{
      header: `建议#${index + 1}`,
      id: `rec_${index + 1}`,
      question: `Recommendation #${index + 1}: "${rec.action}" (${rec.priority} priority, ${rec.steps.length} steps). Your decision:`,
      options: [
        { label: "Accept(Recommended)", description: "Accept this recommendation as-is" },
        { label: "Modify", description: "Adjust scope, steps, or priority" },
        { label: "Reject", description: "Remove this recommendation" }
      ]
    }]
  })
  // Accept → "accepted" | Modify → gather text → "modified" | Reject → gather reason → "rejected"
  // Accept All Remaining → mark all remaining as "accepted", break loop
  // Record review decision to discussion.md Decision Log + update conclusions.json
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

##### Step 4.5: Post-Completion Options

Assess recommendation complexity, then offer appropriate next steps:

| Complexity | Condition | Available Options |
|------------|-----------|-------------------|
| `none` | No recommendations | Done, Create Issue, Export Report |
| `simple` | ≤2 low-priority items | Done, Create Issue, Export Report |
| `moderate` | 1-2 medium-priority | Generate Plan, Create Issue, Export Report, Done |
| `complex` | ≥3 or any high-priority | Generate Plan, Create Issue, Export Report, Done |

| Selection | Action |
|-----------|--------|
| Generate Plan | → Phase 5 (plan only, NO code modifications) |
| Create Issue | `Skill(skill="issue:new", args="...")` (only reviewed recs) |
| Export Report | Copy discussion.md + conclusions.json to user-specified location |
| Done | Display artifact paths, end |

Auto mode: generate plan only for moderate/complex, skip for simple/none.

**Success Criteria**:
- conclusions.json created with complete synthesis including findings_coverage[]
- **Findings Coverage Matrix** — all actionable findings mapped to disposition
- **Intent Coverage Matrix** — all original intents accounted for
- **Complete decision trail** documented and traceable

### Phase 5: Plan Generation (Optional — NO code modifications)

**Trigger**: User selects "Generate Plan" in Phase 4. In auto mode, triggered only for `moderate`/`complex`.

```javascript
const planChecklist = recs
  .filter(r => r.review_status !== 'rejected')
  .map((rec, index) => {
    const files = rec.evidence_refs
      ?.filter(ref => ref.includes(':'))
      .map(ref => ref.split(':')[0]) || []

    return `### ${index + 1}. ${rec.action}
- **Priority**: ${rec.priority}
- **Rationale**: ${rec.rationale}
- **Target files**: ${files.join(', ') || 'TBD'}
- **Evidence**: ${rec.evidence_refs?.join(', ') || 'N/A'}
- [ ] Ready for execution`
  }).join('\n\n')

appendToDiscussion(`
## Plan Checklist

> **This is a plan only — no code was modified.**
> To execute, use: \`$csv-wave-pipeline "<requirement summary>"\`

- **Recommendations**: ${recs.length}
- **Generated**: ${getUtc8ISOString()}

${planChecklist}

---

### Next Step: Execute

Run \`$csv-wave-pipeline\` to execute these recommendations as wave-based batch tasks:

\`\`\`bash
$csv-wave-pipeline "${topic}"
\`\`\`
`)
```

**Success Criteria**:
- Plan checklist in discussion.md with all accepted recommendations
- User reminded about `$csv-wave-pipeline` for execution
- **No source code modified**

## Templates

### Round Documentation Pattern

Each discussion round follows this structure in discussion.md:

```markdown
### Round N - [Deepen|Adjust|Suggest|Q&A] (timestamp)

#### User Input
What the user indicated they wanted to focus on

#### Decision Log
<!-- Use Decision Record Format from Recording Protocol -->

#### Key Findings
<!-- Use Key Finding Record Format from Recording Protocol -->

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

> **Phase 5** appends a plan checklist to `discussion.md`. No additional files are generated.

| File | Phase | Description |
|------|-------|-------------|
| `discussion.md` | 1-5 | Session metadata → discussion timeline → conclusions. Plan checklist appended here. |
| `exploration-codebase.json` | 2 | Codebase context: relevant files, patterns, constraints |
| `explorations/*.json` | 2 | Per-perspective exploration results (multi only) |
| `explorations.json` | 2 | Single perspective aggregated findings |
| `perspectives.json` | 2 | Multi-perspective findings with cross-perspective synthesis |
| `conclusions.json` | 4 | Final synthesis: conclusions, recommendations, findings_coverage, open questions |

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
| Plan generation: no recommendations | No plan to generate | Inform user, suggest lite-plan |

## Best Practices

### Core Principles

1. **No code modifications**: This skill is strictly read-only and plan-only. Phase 5 generates plan checklists but does NOT modify source code. Use `$csv-wave-pipeline` for execution.
2. **Record Decisions Immediately**: Never defer recording — capture decisions as they happen using the Decision Record format
3. **Evidence-Based**: Every conclusion should reference specific code or patterns with confidence levels
4. **Embrace Corrections**: Track wrong→right transformations as valuable learnings

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

**Use Plan Generation (Phase 5) when:**
- Analysis conclusions contain clear, actionable recommendations
- Simple: 1-2 items → inline plan checklist in discussion.md
- Complex: 3+ recommendations → detailed plan checklist
- **Then execute via**: `$csv-wave-pipeline` for wave-based batch execution

**Consider alternatives when:**
- Specific bug diagnosis needed → use `debug-with-file`
- Generating new ideas/solutions → use `brainstorm-with-file`
- Complex planning with parallel perspectives → use `collaborative-plan-with-file`
- Ready to implement → use `lite-plan`
- Requirement decomposition needed → use `req-plan-with-file`

---

**Now execute the analyze-with-file workflow for topic**: $TOPIC
