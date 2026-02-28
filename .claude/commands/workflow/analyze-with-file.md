---
name: analyze-with-file
description: Interactive collaborative analysis with documented discussions, CLI-assisted exploration, and evolving understanding
argument-hint: "[-y|--yes] [-c|--continue] \"topic or question\""
allowed-tools: TodoWrite(*), Task(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-confirm exploration decisions, use recommended analysis angles.

# Workflow Analyze Command

## Quick Start

```bash
# Basic usage
/workflow:analyze-with-file "如何优化这个项目的认证架构"

# With options
/workflow:analyze-with-file --continue "认证架构"    # Continue existing session
/workflow:analyze-with-file -y "性能瓶颈分析"        # Auto mode
```

**Context Source**: cli-explore-agent + Gemini/Codex analysis
**Output Directory**: `.workflow/.analysis/{session-id}/`
**Core Innovation**: Documented discussion timeline with evolving understanding

## Output Artifacts

### Phase 1: Topic Understanding

| Artifact | Description |
|----------|-------------|
| `discussion.md` | Evolution of understanding & discussions (initialized) |
| Session variables | Dimensions, focus areas, analysis depth |

### Phase 2: CLI Exploration

| Artifact | Description |
|----------|-------------|
| `exploration-codebase.json` | Single codebase context from cli-explore-agent |
| `explorations/*.json` | Multi-perspective codebase explorations (parallel, up to 4) |
| `explorations.json` | Single perspective aggregated findings |
| `perspectives.json` | Multi-perspective findings (up to 4 perspectives) with synthesis |
| Updated `discussion.md` | Round 1 with exploration results |

### Phase 3: Interactive Discussion

| Artifact | Description |
|----------|-------------|
| Updated `discussion.md` | Round 2-N with user feedback and insights |
| Corrected assumptions | Tracked in discussion timeline |

### Phase 4: Synthesis & Conclusion

| Artifact | Description |
|----------|-------------|
| `conclusions.json` | Final synthesis with recommendations |
| Final `discussion.md` | ⭐ Complete analysis with conclusions |

## Overview

Interactive collaborative analysis workflow with **documented discussion process**. Records understanding evolution, facilitates multi-round Q&A, and uses CLI tools for deep exploration.

**Core workflow**: Topic → Explore → Discuss → Document → Refine → Conclude

### Decision Recording Protocol

**⚠️ CRITICAL**: During analysis, the following situations **MUST** trigger immediate recording to discussion.md:

| Trigger | What to Record | Target Section |
|---------|---------------|----------------|
| **Direction choice** | What was chosen, why, what alternatives were discarded | `#### Decision Log` |
| **Key finding** | Finding content, impact scope, confidence level | `#### Key Findings` |
| **Assumption change** | Old assumption → new understanding, reason for change, impact | `#### Corrected Assumptions` |
| **User feedback** | User's original input, rationale for adoption/adjustment | `#### User Input` |
| **Disagreement & trade-off** | Conflicting viewpoints, trade-off basis, final choice | `#### Decision Log` |
| **Scope adjustment** | Before/after scope, trigger reason for adjustment | `#### Decision Log` |

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

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INTERACTIVE ANALYSIS WORKFLOW                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Phase 1: Topic Understanding                                            │
│     ├─ Parse topic/question                                              │
│     ├─ Identify analysis dimensions (architecture, performance, etc.)    │
│     ├─ Initial scoping with user                                         │
│     └─ Initialize discussion.md                                          │
│                                                                          │
│  Phase 2: CLI Exploration                                                │
│     ├─ Codebase Exploration (cli-explore-agent, supports parallel ≤4)    │
│     ├─ Multi-Perspective Analysis (AFTER exploration)                    │
│     │   ├─ Single: Comprehensive analysis                                │
│     │   └─ Multi (≤4): Parallel perspectives with synthesis              │
│     ├─ Aggregate findings                                                │
│     └─ Update discussion.md with Round 1                                 │
│                                                                          │
│  Phase 3: Interactive Discussion (Multi-Round)                           │
│     ├─ Present exploration findings                                      │
│     ├─ Facilitate Q&A with user                                          │
│     ├─ Capture user insights and corrections                             │
│     ├─ Actions: Deepen | Adjust direction | Answer questions             │
│     ├─ Update discussion.md with each round                              │
│     └─ Repeat until clarity achieved (max 5 rounds)                      │
│                                                                          │
│  Phase 4: Synthesis & Conclusion                                         │
│     ├─ Consolidate all insights                                          │
│     ├─ Generate conclusions with recommendations                         │
│     ├─ Update discussion.md with final synthesis                         │
│     └─ Offer follow-up options (issue/task/report)                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Output Structure

```
.workflow/.analysis/ANL-{slug}-{date}/
├── discussion.md              # ⭐ Evolution of understanding & discussions
├── exploration-codebase.json  # Phase 2: Single codebase context
├── explorations/              # Phase 2: Multi-perspective codebase explorations (if selected)
│   ├── technical.json
│   └── architectural.json
├── explorations.json          # Phase 2: Single perspective findings
├── perspectives.json          # Phase 2: Multi-perspective findings (if selected)
└── conclusions.json           # Phase 4: Final synthesis
```

## Implementation

### Session Initialization

**Objective**: Create session context and directory structure for analysis.

**Required Actions**:
1. Extract topic/question from `$ARGUMENTS`
2. Generate session ID: `ANL-{slug}-{date}`
   - slug: lowercase, alphanumeric + Chinese, max 40 chars
   - date: YYYY-MM-DD (UTC+8)
3. Define session folder: `.workflow/.analysis/{session-id}`
4. Parse command options:
   - `-c` or `--continue` for session continuation
   - `-y` or `--yes` for auto-approval mode
5. Auto-detect mode: If session folder + discussion.md exist → continue mode
6. Create directory structure: `{session-folder}/`

**Session Variables**:
- `sessionId`: Unique session identifier
- `sessionFolder`: Base directory for all artifacts
- `autoMode`: Boolean for auto-confirmation
- `mode`: new | continue

### Phase 1: Topic Understanding

**Objective**: Analyze topic, identify dimensions, gather user input, initialize discussion.md.

**Prerequisites**:
- Session initialized with valid sessionId and sessionFolder
- Topic/question available from $ARGUMENTS

**Workflow Steps**:

1. **Parse Topic & Identify Dimensions**
   - Match topic keywords against ANALYSIS_DIMENSIONS
   - Identify relevant dimensions: architecture, implementation, performance, security, concept, comparison, decision
   - Default to "general" if no match

2. **Initial Scoping** (if new session + not auto mode)
   - **Focus**: Multi-select from directions generated by detected dimensions (see Dimension-Direction Mapping)
   - **Perspectives**: Multi-select up to 4 analysis perspectives (see Analysis Perspectives), default: single comprehensive view
   - **Depth**: Single-select from Quick Overview (10-15min) / Standard Analysis (30-60min) / Deep Dive (1-2hr)

3. **Initialize discussion.md**
   - Create discussion.md with session metadata
   - Add user context: focus areas, analysis depth
   - Add initial understanding: dimensions, scope, key questions
   - Create empty sections for discussion timeline
   - **📌 Record initial decisions**: Document dimension selection rationale, excluded dimensions with reasons, intent behind user preferences

4. **📌 Record Phase 1 Decisions**
   - Record why these dimensions were selected (keyword match + user confirmation)
   - Record the rationale behind analysis depth selection
   - If user adjusted recommended focus, record the adjustment reason

**Success Criteria**:
- Session folder created with discussion.md initialized
- Analysis dimensions identified
- User preferences captured (focus, depth)
- **Phase 1 decisions recorded** with context and rationale

### Phase 2: CLI Exploration

**Objective**: Gather codebase context, then execute deep analysis via CLI tools.

**Prerequisites**:
- Phase 1 completed successfully
- discussion.md initialized
- Dimensions identified

**Workflow Steps** (⚠️ Codebase exploration FIRST):

1. **Codebase Exploration via cli-explore-agent** (supports parallel up to 4)
   - Agent type: `cli-explore-agent`
   - Execution mode: parallel if multi-perspective selected, otherwise single (run_in_background: false for sequential, true for parallel)
   - **Single exploration**: General codebase analysis
   - **Multi-perspective**: Parallel explorations per perspective focus (max 4, each with specific angle)
   - **Common tasks**: Run `ccw tool exec get_modules_by_depth '{}'`, execute searches based on topic keywords, read `.workflow/project-tech.json`
   - **Output**: `{sessionFolder}/exploration-codebase.json` (single) or `{sessionFolder}/explorations/{perspective}.json` (multi)
   - **Purpose**: Enrich CLI prompts with codebase context for each perspective

**Single Exploration Example**:
```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: `Explore codebase: ${topicSlug}`,
  prompt: `
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

Schema: {relevant_files, patterns, key_findings, questions_for_user, _metadata}
`
})
```

**Multi-Perspective Parallel Example** (up to 4 agents):
```javascript
// Launch parallel explorations for each selected perspective
selectedPerspectives.forEach(perspective => {
  Task({
    subagent_type: "cli-explore-agent",
    run_in_background: false,  // Sequential execution, wait for each
    description: `Explore ${perspective.name}: ${topicSlug}`,
    prompt: `
## Analysis Context
Topic: ${topic_or_question}
Perspective: ${perspective.name} - ${perspective.focus}
Session: ${sessionFolder}

## MANDATORY FIRST STEPS
1. Run: ccw tool exec get_modules_by_depth '{}'
2. Execute searches focused on ${perspective.focus}
3. Read: .workflow/project-tech.json (if exists)

## Exploration Focus (${perspective.name} angle)
${perspective.exploration_tasks.map(t => `- ${t}`).join('\n')}

## Output
Write findings to: ${sessionFolder}/explorations/${perspective.name}.json

Schema: {relevant_files, patterns, key_findings, perspective_insights, _metadata}
`
  })
})
```

2. **Multi-Perspective CLI Analysis** (⚠️ AFTER exploration)
   - If user selected multiple perspectives (≤4): Launch CLI calls in parallel
   - If single/default perspective: Launch single comprehensive CLI analysis
   - **Shared context**: Include exploration-codebase.json findings in all prompts
   - **Execution**: Bash with run_in_background: true, wait for all results
   - **Output**: perspectives.json with analysis from each perspective

**Single Perspective Example**:
```javascript
Bash({
  command: `ccw cli -p "
PURPOSE: Analyze topic '${topic_or_question}' from ${dimensions.join(', ')} perspectives
Success: Actionable insights with clear reasoning

PRIOR EXPLORATION CONTEXT:
- Key files: ${explorationResults.relevant_files.slice(0,5).map(f => f.path).join(', ')}
- Patterns found: ${explorationResults.patterns.slice(0,3).join(', ')}
- Key findings: ${explorationResults.key_findings.slice(0,3).join(', ')}

TASK:
• Build on exploration findings above
• Analyze common patterns and anti-patterns
• Highlight potential issues or opportunities
• Generate discussion points for user clarification

MODE: analysis
CONTEXT: @**/* | Topic: ${topic_or_question}
EXPECTED: Structured analysis with clear sections, specific insights tied to evidence, questions to deepen understanding, recommendations with rationale
CONSTRAINTS: Focus on ${dimensions.join(', ')}
" --tool gemini --mode analysis`,
  run_in_background: true
})
```

**Multi-Perspective Example** (parallel, up to 4):
```javascript
// Build shared context once
const explorationContext = `
PRIOR EXPLORATION CONTEXT:
- Key files: ${explorationResults.relevant_files.slice(0,5).map(f => f.path).join(', ')}
- Patterns found: ${explorationResults.patterns.slice(0,3).join(', ')}
- Key findings: ${explorationResults.key_findings.slice(0,3).join(', ')}`

// Launch parallel CLI calls based on selected perspectives (max 4)
selectedPerspectives.forEach(perspective => {
  Bash({
    command: `ccw cli -p "
PURPOSE: ${perspective.purpose} for '${topic_or_question}'
Success: ${perspective.success_criteria}

${explorationContext}

TASK:
${perspective.tasks.map(t => `• ${t}`).join('\n')}

MODE: analysis
CONTEXT: @**/* | Topic: ${topic_or_question}
EXPECTED: ${perspective.expected_output}
CONSTRAINTS: ${perspective.constraints}
" --tool ${perspective.tool} --mode analysis`,
    run_in_background: true
  })
})

// ⚠️ STOP POINT: Wait for hook callback to receive all results before continuing
```

3. **Aggregate Findings**
   - Consolidate all codebase explorations (exploration-codebase.json or explorations/*.json) and CLI perspective findings
   - If multi-perspective: Extract synthesis from both explorations and analyses (convergent themes, conflicting views, unique contributions)
   - Extract aggregated findings, discussion points, open questions across all sources
   - Write to explorations.json (single) or perspectives.json (multi)

4. **Update discussion.md**
   - Append Round 1 section with exploration results
   - Single perspective: Include sources analyzed, key findings, discussion points, open questions
   - Multi-perspective: Include per-perspective findings + synthesis section

**explorations.json Schema** (single perspective):
- `session_id`: Session identifier
- `timestamp`: Exploration completion time
- `topic`: Original topic/question
- `dimensions[]`: Analysis dimensions
- `sources[]`: {type, file/summary}
- `key_findings[]`: Main insights
- `discussion_points[]`: Questions for user
- `open_questions[]`: Unresolved questions

**perspectives.json Schema** (multi-perspective):
- `session_id`: Session identifier
- `timestamp`: Exploration completion time
- `topic`: Original topic/question
- `dimensions[]`: Analysis dimensions
- `perspectives[]`: [{name, tool, findings, insights, questions}]
- `synthesis`: {convergent_themes, conflicting_views, unique_contributions}
- `aggregated_findings[]`: Main insights across perspectives
- `discussion_points[]`: Questions for user
- `open_questions[]`: Unresolved questions

**Success Criteria**:
- exploration-codebase.json (single) or explorations/*.json (multi) created with codebase context
- explorations.json (single) or perspectives.json (multi) created with findings
- discussion.md updated with Round 1 results
- All agents and CLI calls completed successfully
- **📌 Key findings recorded** with evidence references and confidence levels
- **📌 Exploration decisions recorded** (why chose certain perspectives, tool selection rationale)

### Phase 3: Interactive Discussion

**Objective**: Iteratively refine understanding through user-guided discussion cycles.

**Prerequisites**:
- Phase 2 completed successfully
- explorations.json contains initial findings
- discussion.md has Round 1 results

**Guideline**: For complex tasks (code analysis, implementation, refactoring), delegate to agents via Task tool (cli-explore-agent, code-developer, universal-executor) or CLI calls (ccw cli). Avoid direct analysis/execution in main process.

**Workflow Steps**:

1. **Present Findings**
   - Display current findings from explorations.json
   - Show key points for user input

2. **Gather User Feedback** (AskUserQuestion)
   - **Question**: Feedback on current analysis
   - **Options** (single-select):
     - **同意，继续深入**: Analysis direction correct, deepen exploration
     - **需要调整方向**: Different understanding or focus
     - **分析完成**: Sufficient information obtained
     - **有具体问题**: Specific questions to ask

3. **Process User Response**

   **📌 Recording Checkpoint**: Regardless of which option the user selects, the following MUST be recorded to discussion.md:
   - User's original choice and expression
   - Impact of this choice on analysis direction
   - If direction changed, record a full Decision Record

   **Agree, Deepen**:
   - Continue analysis in current direction
   - Use CLI for deeper exploration
   - **📌 Record**: Which assumptions were confirmed, specific angles for deeper exploration

   **Adjust Direction**:
   - AskUserQuestion for adjusted focus (code details / architecture / best practices)
   - Launch new CLI exploration with adjusted scope
   - **📌 Record Decision**: Trigger reason for direction adjustment, old vs new direction comparison, expected impact

   **Specific Questions**:
   - Capture user questions
   - Use CLI or direct analysis to answer
   - Document Q&A in discussion.md
   - **📌 Record**: Knowledge gaps revealed by the question, new understanding gained from the answer

   **Complete**:
   - Exit discussion loop, proceed to Phase 4
   - **📌 Record**: Why concluding at this round (sufficient information / scope fully focused / user satisfied)

4. **Update discussion.md**
   - Append Round N section with:
     - User input summary
     - Direction adjustment (if any)
     - User questions & answers (if any)
     - Updated understanding
     - Corrected assumptions
     - New insights

5. **📌 Intent Drift Check** (every round ≥ 2)
   - Re-read "User Intent" from discussion.md header
   - For each original intent item, check: addressed / in-progress / not yet discussed / implicitly absorbed
   - If any item is "implicitly absorbed" (addressed by a different solution than originally envisioned), explicitly note this in discussion.md:
     ```markdown
     #### Intent Coverage Check
     - ✅ Intent 1: [addressed in Round N]
     - 🔄 Intent 2: [in-progress, current focus]
     - ⚠️ Intent 3: [implicitly absorbed by X — needs explicit confirmation]
     - ❌ Intent 4: [not yet discussed]
     ```
   - If any item is ❌ or ⚠️ after 3+ rounds, surface it to the user in the next round's presentation

6. **Repeat or Converge**
   - Continue loop (max 5 rounds) or exit to Phase 4

**Discussion Actions**:

| User Choice | Action | Tool | Description |
|-------------|--------|------|-------------|
| Deepen | Continue current direction | Gemini CLI | Deeper analysis in same focus |
| Adjust | Change analysis angle | Selected CLI | New exploration with adjusted scope |
| Questions | Answer specific questions | CLI or analysis | Address user inquiries |
| Complete | Exit discussion loop | - | Proceed to synthesis |

**Success Criteria**:
- User feedback processed for each round
- discussion.md updated with all discussion rounds
- Assumptions corrected and documented
- Exit condition reached (user selects "完成" or max rounds)
- **📌 All decision points recorded** with Decision Record format
- **📌 Direction changes documented** with before/after comparison and rationale

### Phase 4: Synthesis & Conclusion

**Objective**: Consolidate insights, generate conclusions, offer next steps.

**Prerequisites**:
- Phase 3 completed successfully
- Multiple rounds of discussion documented
- User ready to conclude

**Workflow Steps**:

1. **📌 Intent Coverage Verification** (MANDATORY before synthesis)
   - Re-read all original "User Intent" items from discussion.md header
   - For EACH intent item, determine coverage status:
     - **✅ Addressed**: Explicitly discussed and concluded with clear design/recommendation
     - **🔀 Transformed**: Original intent evolved into a different solution — document the transformation chain
     - **⚠️ Absorbed**: Implicitly covered by a broader solution — flag for explicit confirmation
     - **❌ Missed**: Not discussed — MUST be either addressed now or explicitly listed as out-of-scope with reason
   - Write "Intent Coverage Matrix" to discussion.md:
     ```markdown
     ### Intent Coverage Matrix
     | # | Original Intent | Status | Where Addressed | Notes |
     |---|----------------|--------|-----------------|-------|
     | 1 | [intent text] | ✅ Addressed | Round N, Conclusion #M | |
     | 2 | [intent text] | 🔀 Transformed | Round N → Round M | Original: X → Final: Y |
     | 3 | [intent text] | ❌ Missed | — | Reason for omission |
     ```
   - **Gate**: If any item is ❌ Missed, MUST either:
     - (a) Add a dedicated discussion round to address it before continuing, OR
     - (b) Explicitly confirm with user that it is intentionally deferred
   - Add `intent_coverage[]` to conclusions.json

2. **Consolidate Insights**
   - Extract all findings from discussion timeline
   - **📌 Compile Decision Trail**: Aggregate all Decision Records from Phases 1-3 into a consolidated decision log
   - **Key conclusions**: Main points with evidence and confidence levels (high/medium/low)
   - **Recommendations**: Action items with rationale and priority (high/medium/low)
   - **Open questions**: Remaining unresolved questions
   - **Follow-up suggestions**: Issue/task creation suggestions
   - **📌 Decision summary**: How key decisions shaped the final conclusions (link conclusions back to decisions)
   - Write to conclusions.json

2. **Final discussion.md Update**
   - Append conclusions section:
     - **Summary**: High-level overview
     - **Key Conclusions**: Ranked with evidence and confidence
     - **Recommendations**: Prioritized action items
     - **Remaining Questions**: Unresolved items
   - Update "Current Understanding (Final)":
     - **What We Established**: Confirmed points
     - **What Was Clarified/Corrected**: Important corrections
     - **Key Insights**: Valuable learnings
   - **📌 Add "Decision Trail" section**:
     - **Critical Decisions**: List of pivotal decisions that shaped the analysis outcome
     - **Direction Changes**: Timeline of scope/focus adjustments with rationale
     - **Trade-offs Made**: Key trade-offs and why certain paths were chosen over others
   - Add session statistics: rounds, duration, sources, artifacts, **decision count**

3. **Post-Completion Options**

   ```javascript
   const hasActionableRecs = conclusions.recommendations?.some(r => r.priority === 'high' || r.priority === 'medium')

   const nextStep = AskUserQuestion({
     questions: [{
       question: "Analysis complete. What's next?",
       header: "Next Step",
       multiSelect: false,
       options: [
         { label: hasActionableRecs ? "生成任务 (Recommended)" : "生成任务", description: "Launch workflow-lite-plan with analysis context" },
         { label: "创建Issue", description: "Launch issue-discover with conclusions" },
         { label: "导出报告", description: "Generate standalone analysis report" },
         { label: "完成", description: "No further action" }
       ]
     }]
   })
   ```

   **Handle "生成任务"**:
   ```javascript
   if (nextStep.includes("生成任务")) {
     // 1. Build task description from high/medium priority recommendations
     const taskDescription = conclusions.recommendations
       .filter(r => r.priority === 'high' || r.priority === 'medium')
       .map(r => r.action)
       .join('\n') || conclusions.summary

     // 2. Assemble compact analysis context as inline memory block
     const contextLines = [
       `## Prior Analysis (${sessionId})`,
       `**Summary**: ${conclusions.summary}`
     ]
     const codebasePath = `${sessionFolder}/exploration-codebase.json`
     if (file_exists(codebasePath)) {
       const data = JSON.parse(Read(codebasePath))
       const files = (data.relevant_files || []).slice(0, 8).map(f => f.path || f.file || f).filter(Boolean)
       const findings = (data.key_findings || []).slice(0, 5)
       if (files.length) contextLines.push(`**Key Files**: ${files.join(', ')}`)
       if (findings.length) contextLines.push(`**Key Findings**:\n${findings.map(f => `- ${f}`).join('\n')}`)
     }

     // 3. Call lite-plan with enriched task description (no special flags)
     Skill(skill="workflow-lite-plan", args=`"${taskDescription}\n\n${contextLines.join('\n')}"`)
   }
   ```

**conclusions.json Schema**:
- `session_id`: Session identifier
- `topic`: Original topic/question
- `completed`: Completion timestamp
- `total_rounds`: Number of discussion rounds
- `summary`: Executive summary
- `key_conclusions[]`: {point, evidence, confidence}
- `recommendations[]`: {action, rationale, priority}
- `open_questions[]`: Unresolved questions
- `follow_up_suggestions[]`: {type, summary}
- `decision_trail[]`: {round, decision, context, options_considered, chosen, reason, impact}
- `intent_coverage[]`: {intent, status, where_addressed, notes}

**Success Criteria**:
- conclusions.json created with final synthesis
- discussion.md finalized with conclusions and decision trail
- **📌 Intent Coverage Matrix** verified — all original intents accounted for (no ❌ Missed without explicit user deferral)
- User offered next step options
- Session complete
- **📌 Complete decision trail** documented and traceable from initial scoping to final conclusions

## Configuration

### Analysis Perspectives

Optional multi-perspective parallel exploration (single perspective is default, max 4):

| Perspective | Tool | Focus | Best For |
|------------|------|-------|----------|
| **Technical** | Gemini | Implementation, code patterns, technical feasibility | Understanding how and technical details |
| **Architectural** | Claude | System design, scalability, component interactions | Understanding structure and organization |
| **Business** | Codex | Value, ROI, stakeholder impact, strategy | Understanding business implications |
| **Domain Expert** | Gemini | Domain-specific patterns, best practices, standards | Industry-specific knowledge and practices |

**Selection**: User can multi-select up to 4 perspectives in Phase 1, or default to single comprehensive view

### Dimension-Direction Mapping

When user selects focus areas, generate directions dynamically from detected dimensions (don't use static options):

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

### Analysis Dimensions

Dimensions matched against topic keywords to identify focus areas:

| Dimension | Keywords |
|-----------|----------|
| architecture | 架构, architecture, design, structure, 设计 |
| implementation | 实现, implement, code, coding, 代码 |
| performance | 性能, performance, optimize, bottleneck, 优化 |
| security | 安全, security, auth, permission, 权限 |
| concept | 概念, concept, theory, principle, 原理 |
| comparison | 比较, compare, vs, difference, 区别 |
| decision | 决策, decision, choice, tradeoff, 选择 |

### Consolidation Rules

When updating "Current Understanding":

| Rule | Description |
|------|-------------|
| Promote confirmed insights | Move validated findings to "What We Established" |
| Track corrections | Keep important wrong→right transformations |
| Focus on current state | What do we know NOW |
| Avoid timeline repetition | Don't copy discussion details |
| Preserve key learnings | Keep insights valuable for future reference |

**Example**:

❌ **Bad (cluttered)**:
```markdown
## Current Understanding
In round 1 we discussed X, then in round 2 user said Y...
```

✅ **Good (consolidated)**:
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

## Error Handling

| Error | Resolution |
|-------|------------|
| cli-explore-agent fails | Continue with available context, note limitation |
| CLI timeout | Retry with shorter prompt, or skip perspective |
| User timeout in discussion | Save state, show resume command |
| Max rounds reached | Force synthesis, offer continuation option |
| No relevant findings | Broaden search, ask user for clarification |
| Session folder conflict | Append timestamp suffix |
| Gemini unavailable | Fallback to Codex or manual analysis |

## Best Practices

1. **Clear Topic Definition**: Detailed topics lead to better dimension identification
2. **Agent-First for Complex Tasks**: For code analysis, implementation, or refactoring tasks during discussion, delegate to agents via Task tool (cli-explore-agent, code-developer, universal-executor) or CLI calls (ccw cli). Avoid direct analysis/execution in main process
3. **Review discussion.md**: Check understanding evolution before conclusions
4. **Embrace Corrections**: Track wrong-to-right transformations as learnings
5. **Document Evolution**: discussion.md captures full thinking process
6. **Use Continue Mode**: Resume sessions to build on previous analysis
7. **Record Decisions Immediately**: Never defer recording - capture decisions as they happen using the Decision Record format. A decision not recorded in-the-moment is a decision lost
8. **Link Decisions to Outcomes**: When writing conclusions, explicitly reference which decisions led to which outcomes. This creates an auditable trail from initial scoping to final recommendations

## Templates

### Discussion Document Structure

**discussion.md** contains:
- **Header**: Session metadata (ID, topic, started, dimensions)
- **User Context**: Focus areas, analysis depth
- **Discussion Timeline**: Round-by-round findings
  - Round 1: Initial Understanding + Exploration Results + **Initial Decision Log**
  - Round 2-N: User feedback, adjusted understanding, corrections, new insights, **Decision Log per round**
- **Decision Trail**: Consolidated critical decisions across all rounds
- **Conclusions**: Summary, key conclusions, recommendations
- **Current Understanding (Final)**: Consolidated insights
- **Session Statistics**: Rounds, duration, sources, artifacts, decision count

Example sections:

```markdown
### Round 2 - Discussion (timestamp)

#### User Input
User agrees with current direction, wants deeper code analysis

#### Decision Log
> **Decision**: Shift focus from high-level architecture to implementation-level code analysis
> - **Context**: User confirmed architectural understanding is sufficient
> - **Options considered**: Continue architecture analysis / Deep-dive into code patterns / Focus on testing gaps
> - **Chosen**: Deep-dive into code patterns — **Reason**: User explicitly requested code-level analysis
> - **Impact**: Subsequent exploration will target specific modules rather than system overview

#### Updated Understanding
- Identified session management uses database-backed approach
- Rate limiting applied at gateway, not application level

#### Corrected Assumptions
- ~~Assumed Redis for sessions~~ → Database-backed sessions
  - Reason: User clarified architecture decision

#### New Insights
- Current design allows horizontal scaling without session affinity
```

## Usage Recommendations(Requires User Confirmation) 

**When to Execute Directly :**
- Short, focused analysis tasks (single module/component)
- Clear, well-defined topics with limited scope
- Quick information gathering without multi-round iteration
- Follow-up analysis building on existing session

**Use `Skill(skill="workflow-lite-plan", args="\"task description\"")` when:**
- Ready to implement (past analysis phase)
- Need simple task breakdown
- Focus on quick execution planning

> **Note**: Phase 4「生成任务」assembles analysis context as inline `## Prior Analysis` block in task description, allowing lite-plan to skip redundant exploration automatically.

---

**Now execute analyze-with-file for**: $ARGUMENTS
