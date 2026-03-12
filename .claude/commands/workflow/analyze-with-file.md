---
name: analyze-with-file
description: Interactive collaborative analysis with documented discussions, CLI-assisted exploration, and evolving understanding
argument-hint: "[-y|--yes] [-c|--continue] \"topic or question\""
allowed-tools: TodoWrite(*), Agent(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-confirm exploration decisions, use recommended analysis angles.

# Workflow Analyze Command

**Context Source**: cli-explore-agent + Gemini/Codex analysis
**Output Directory**: `.workflow/.analysis/{session-id}/`
**Core Innovation**: Documented discussion timeline with evolving understanding

## Output Artifacts

| Phase | Artifact | Description |
|-------|----------|-------------|
| 1 | `discussion.md` | Initialized with TOC, Current Understanding block, timeline, metadata |
| 1 | Session variables | Dimensions, focus areas, analysis depth |
| 2 | `exploration-codebase.json` | Single codebase context from cli-explore-agent |
| 2 | `explorations/*.json` | Multi-perspective codebase explorations (parallel, up to 4) |
| 2 | `explorations.json` | Single perspective aggregated findings |
| 2 | `perspectives.json` | Multi-perspective findings (up to 4) with synthesis |
| 2 | Updated `discussion.md` | Round 1 + Initial Intent Coverage Check + Current Understanding replaced |
| 3 | Updated `discussion.md` | Round 2-N: feedback, insights, narrative synthesis; TOC + Current Understanding updated each round |
| 4 | `conclusions.json` | Final synthesis with recommendations (incl. steps[] + review_status) |
| 4 | Final `discussion.md` | Complete analysis with conclusions, recommendation review summary, intent coverage matrix |

### Decision Recording Protocol

**CRITICAL**: Record immediately when any of these occur:

| Trigger | What to Record | Target Section |
|---------|---------------|----------------|
| **Direction choice** | What chosen, why, alternatives discarded | `#### Decision Log` |
| **Key finding** | Content, impact scope, confidence level, hypothesis impact | `#### Key Findings` |
| **Assumption change** | Old → new understanding, reason, impact | `#### Corrected Assumptions` |
| **User feedback** | Input, rationale for adoption/adjustment | `#### User Input` |
| **Disagreement & trade-off** | Conflicting views, trade-off basis, final choice | `#### Decision Log` |
| **Scope adjustment** | Before/after scope, trigger reason | `#### Decision Log` |

**Decision Record Format**:
```markdown
> **Decision**: [Description]
> - **Context**: [Trigger]
> - **Options considered**: [Alternatives]
> - **Chosen**: [Approach] — **Reason**: [Rationale]
> - **Rejected**: [Why other options were discarded]
> - **Impact**: [Effect on analysis]
```

**Key Finding Record Format**:
```markdown
> **Finding**: [Content]
> - **Confidence**: [High/Medium/Low] — **Why**: [Evidence basis]
> - **Hypothesis Impact**: [Confirms/Refutes/Modifies] hypothesis "[name]"
> - **Scope**: [What areas this affects]
```

**Principles**: Immediacy (record as-it-happens), Completeness (context+options+chosen+reason+rejected), Traceability (later phases trace back), Depth (capture reasoning, not just outcomes)

## Implementation

### AskUserQuestion Constraints

All `AskUserQuestion` calls MUST comply:
- **questions**: 1-4 questions per call
- **options**: 2-4 per question (system auto-adds "Other" for free-text input)
- **header**: max 12 characters
- **label**: 1-5 words per option

### Session Initialization

1. Extract topic/question from `$ARGUMENTS`
2. Generate session ID: `ANL-{slug}-{date}` (slug: lowercase alphanumeric+Chinese, max 40 chars; date: YYYY-MM-DD UTC+8)
3. Define session folder: `.workflow/.analysis/{session-id}`
4. Parse options: `-c`/`--continue` for continuation, `-y`/`--yes` for auto-approval
5. Auto-detect: If session folder + discussion.md exist → continue mode
6. Create directory structure
7. **Create Progress Tracking** (TodoWrite — MANDATORY):
   ```
   TodoWrite([
     { id: "phase-1", title: "Phase 1: Topic Understanding", status: "in_progress" },
     { id: "phase-2", title: "Phase 2: CLI Exploration", status: "pending" },
     { id: "phase-3", title: "Phase 3: Interactive Discussion", status: "pending" },
     { id: "phase-4", title: "Phase 4: Synthesis & Conclusion", status: "pending" },
     { id: "next-step", title: "GATE: Post-Completion Next Step", status: "pending" }
   ])
   ```
   - Update status to `"in_progress"` when entering each phase, `"completed"` when done
   - **`next-step` is a terminal gate** — workflow is NOT complete until this todo is `"completed"`

**Session Variables**: `sessionId`, `sessionFolder`, `autoMode` (boolean), `mode` (new|continue)

### Phase 1: Topic Understanding

1. **Parse Topic & Identify Dimensions** — Match keywords against Analysis Dimensions table
2. **Initial Scoping** (if new session + not auto mode) — use **single AskUserQuestion call with up to 3 questions**:
   - Q1 **Focus** (multiSelect: true, header: "分析方向"): Top 3-4 directions from Dimension-Direction Mapping (options max 4)
   - Q2 **Perspectives** (multiSelect: true, header: "分析视角"): Up to 4 from Analysis Perspectives table (options max 4), default: single comprehensive
   - Q3 **Depth** (multiSelect: false, header: "分析深度"): Quick Overview / Standard / Deep Dive (3 options)
3. **Initialize discussion.md** — Structure includes:
   - **Dynamic TOC** (top of file, updated after each round/phase): `## Table of Contents` with links to major sections
   - **Current Understanding** (replaceable block, overwritten each round — NOT appended): `## Current Understanding` initialized as "To be populated after exploration"
   - Session metadata, user context, initial questions, empty discussion timeline, initial dimension selection rationale
4. **Record Phase 1 Decisions** — Dimension selection reasoning, depth rationale, any user adjustments

**Success**: Session folder + discussion.md created, dimensions identified, preferences captured, decisions recorded
**TodoWrite**: Update `phase-1` → `"completed"`, `phase-2` → `"in_progress"`

### Phase 2: CLI Exploration

Codebase exploration FIRST, then CLI analysis.

**Step 1: Codebase Exploration** (cli-explore-agent, parallel up to 6)

- **Single**: General codebase analysis → `{sessionFolder}/exploration-codebase.json`
- **Multi-perspective**: Parallel per-perspective → `{sessionFolder}/explorations/{perspective}.json`
- **Common tasks**: `ccw tool exec get_modules_by_depth '{}'`, keyword searches, read `.workflow/project-tech.json`

```javascript
// Template for cli-explore-agent (single or per-perspective)
Agent({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: `Explore codebase: ${topicSlug}`,
  prompt: `
## Analysis Context
Topic: ${topic_or_question}
Dimensions: ${dimensions.join(', ')}
// For multi-perspective, add: Perspective: ${perspective.name} - ${perspective.focus}
Session: ${sessionFolder}

## MANDATORY FIRST STEPS
1. Run: ccw tool exec get_modules_by_depth '{}'
2. Read: .workflow/project-tech.json (if exists)

## Layered Exploration (MUST follow all 3 layers)

### Layer 1 — Module Discovery (Breadth)
- Search by topic keywords, identify ALL relevant files
- Map module boundaries and entry points → relevant_files[] with annotations

### Layer 2 — Structure Tracing (Depth)
- Top 3-5 key files: trace call chains 2-3 levels deep
- Identify data flow paths and dependencies → call_chains[], data_flows[]

### Layer 3 — Code Anchor Extraction (Detail)
- Each key finding: extract code snippet (20-50 lines) with file:line
- Annotate WHY this matters → code_anchors[]

## Output
Write to: ${sessionFolder}/exploration-codebase.json
// Multi-perspective: ${sessionFolder}/explorations/${perspective.name}.json

Schema: {relevant_files, patterns, key_findings, code_anchors: [{file, lines, snippet, significance}], call_chains: [{entry, chain, files}], questions_for_user, _metadata}
`
})
```

**Step 2: CLI Analysis** (AFTER exploration)

- **Single**: Comprehensive CLI analysis with exploration context
- **Multi (up to 4)**: Parallel CLI calls per perspective
- Execution: `Bash` with `run_in_background: true`

```javascript
// Build shared exploration context for CLI prompts
const explorationContext = `
PRIOR EXPLORATION CONTEXT:
- Key files: ${explorationResults.relevant_files.slice(0,5).map(f => f.path).join(', ')}
- Patterns: ${explorationResults.patterns.slice(0,3).join(', ')}
- Findings: ${explorationResults.key_findings.slice(0,3).join(', ')}
- Code anchors:
${(explorationResults.code_anchors || []).slice(0,5).map(a => `  [${a.file}:${a.lines}] ${a.significance}\n  \`\`\`\n  ${a.snippet}\n  \`\`\``).join('\n')}
- Call chains: ${(explorationResults.call_chains || []).slice(0,3).map(c => `${c.entry} → ${c.chain.join(' → ')}`).join('; ')}`

// Single perspective (for multi: loop selectedPerspectives with perspective.purpose/tasks/constraints)
Bash({
  command: `ccw cli -p "
PURPOSE: Analyze '${topic_or_question}' from ${dimensions.join(', ')} perspectives
Success: Actionable insights with clear reasoning

${explorationContext}

TASK:
• Build on exploration findings — reference specific code anchors
• Analyze common patterns and anti-patterns with code evidence
• Highlight potential issues/opportunities with file:line references
• Generate discussion points for user clarification

MODE: analysis
CONTEXT: @**/* | Topic: ${topic_or_question}
EXPECTED: Structured analysis with sections, insights tied to evidence, questions, recommendations
CONSTRAINTS: Focus on ${dimensions.join(', ')}
" --tool gemini --mode analysis`,
  run_in_background: true
})
// STOP: Wait for hook callback before continuing
// Multi-perspective: Same pattern per perspective with perspective.purpose/tasks/constraints/tool
```

**Step 3: Aggregate Findings**
- Consolidate explorations + CLI results
- Multi: Extract synthesis (convergent themes, conflicting views, unique contributions)
- Write to `explorations.json` (single) or `perspectives.json` (multi)

**Step 4: Update discussion.md** — Append Round 1 with sources, key findings, discussion points, open questions

**Step 5: Initial Intent Coverage Check** (FIRST check, before entering Phase 3):
- Re-read original "User Intent" / "Analysis Context" from discussion.md header
- Check each intent item against Round 1 findings: ✅ addressed / 🔄 in-progress / ❌ not yet touched
- Append initial Intent Coverage Check to discussion.md
- Present to user at beginning of Phase 3: "初始探索完成后，以下意图的覆盖情况：[list]。接下来的讨论将重点关注未覆盖的部分。"
- Purpose: Early course correction — catch drift before spending multiple interactive rounds

**explorations.json Schema** (single):
- `session_id`, `timestamp`, `topic`, `dimensions[]`
- `sources[]`: {type, file/summary}
- `key_findings[]`, `code_anchors[]`: {file, lines, snippet, significance}
- `call_chains[]`: {entry, chain, files}
- `discussion_points[]`, `open_questions[]`

**perspectives.json Schema** (multi — extends explorations.json):
- `perspectives[]`: [{name, tool, findings, insights, questions}]
- `synthesis`: {convergent_themes, conflicting_views, unique_contributions}
- code_anchors/call_chains include `perspective` field

**Success**: Exploration + CLI artifacts created, discussion.md Round 1, key findings and exploration decisions recorded
**TodoWrite**: Update `phase-2` → `"completed"`, `phase-3` → `"in_progress"`

### Phase 3: Interactive Discussion

**Guideline**: Delegate complex tasks to agents (cli-explore-agent) or CLI calls. Avoid direct analysis in main process.

**Loop** (max 5 rounds):

1. **Current Understanding Summary** (Round >= 2, BEFORE presenting new findings):
   - Generate 1-2 sentence recap: "到目前为止，我们已确认 [established facts]。上一轮 [key action/direction]。现在，这是新一轮的发现："
   - Purpose: Reset context, prevent cognitive overload, make incremental progress visible

2. **Present Findings** from explorations.json

3. **Gather Feedback** (AskUserQuestion, single-select, header: "分析反馈"):
   - **继续深入**: Direction correct — deepen automatically or user specifies direction (combines agree+deepen and agree+suggest)
   - **调整方向**: Different focus or specific questions to address
   - **补充信息**: User has additional context, constraints, or corrections to provide
   - **分析完成**: Sufficient → exit to Phase 4

4. **Process Response** (always record user choice + impact to discussion.md):

   **继续深入** → Sub-question to choose direction (AskUserQuestion, single-select, header: "深入方向"):
   - Dynamically generate **max 3** context-driven options from: unresolved questions, low-confidence findings, unexplored dimensions, user-highlighted areas
   - Add **1** heuristic option that breaks current frame (e.g., "compare with best practices", "review from security perspective", "explore simpler alternatives")
   - Total: **max 4 options**. Each specifies: label, description, tool (cli-explore-agent for code-level / Gemini CLI for pattern-level), scope
   - **"Other" is auto-provided** by AskUserQuestion — covers user-specified custom direction (no need for separate "suggest next step" option)
   - Execute selected direction → merge new code_anchors/call_chains → record confirmed assumptions + deepen angle

   **调整方向** → AskUserQuestion (header: "新方向", user selects or provides custom via "Other") → new CLI exploration → Record Decision (old vs new direction, reason, impact)

   **补充信息** → Capture user input, integrate into context, answer questions via CLI/analysis if needed → Record corrections/additions + updated understanding

   **分析完成** → Exit loop → Record why concluding

5. **Update discussion.md**:
   - **Append** Round N: user input, direction adjustment, Q&A, corrections, new insights
   - **Replace** `## Current Understanding` block with latest consolidated understanding (follow Consolidation Rules: promote confirmed, track corrections, focus on NOW)
   - **Update** `## Table of Contents` with links to new Round N sections

6. **Round Narrative Synthesis** (append to discussion.md after each round update):
   ```markdown
   ### Round N: Narrative Synthesis
   **起点**: 基于上一轮的 [conclusions/questions]，本轮从 [starting point] 切入。
   **关键进展**: [New findings] [confirmed/refuted/modified] 了之前关于 [hypothesis] 的理解。
   **决策影响**: 用户选择 [feedback type]，导致分析方向 [adjusted/deepened/maintained]。
   **当前理解**: 经过本轮，核心认知更新为 [updated understanding]。
   **遗留问题**: [remaining questions driving next round]
   ```

7. **Intent Drift Check** (every round >= 2):
   - Re-read original "User Intent" from discussion.md header
   - Check each item: addressed / in-progress / implicitly absorbed / not yet discussed
   ```markdown
   #### Intent Coverage Check
   - ✅ Intent 1: [addressed in Round N]
   - 🔄 Intent 2: [in-progress]
   - ⚠️ Intent 3: [implicitly absorbed by X — needs confirmation]
   - ❌ Intent 4: [not yet discussed]
   ```
   - If ❌ or ⚠️ items exist → **proactively surface** to user at start of next round: "以下原始意图尚未充分覆盖：[list]。是否需要调整优先级？"

**Success**: All rounds documented with narrative synthesis, assumptions corrected, all decisions recorded with rejection reasoning, direction changes with before/after
**TodoWrite**: Update `phase-3` → `"completed"`, `phase-4` → `"in_progress"`

### Phase 4: Synthesis & Conclusion

1. **Intent Coverage Verification** (MANDATORY before synthesis):
   - Check each original intent: ✅ Addressed / 🔀 Transformed / ⚠️ Absorbed / ❌ Missed
   ```markdown
   ### Intent Coverage Matrix
   | # | Original Intent | Status | Where Addressed | Notes |
   |---|----------------|--------|-----------------|-------|
   | 1 | [intent] | ✅ Addressed | Round N, Conclusion #M | |
   | 2 | [intent] | 🔀 Transformed | Round N → M | Original: X → Final: Y |
   | 3 | [intent] | ❌ Missed | — | Reason |
   ```
   - **Gate**: ❌ Missed items must be either (a) addressed in additional round or (b) confirmed deferred by user
   - Add `intent_coverage[]` to conclusions.json

2. **Consolidate Insights**:
   - Compile Decision Trail from all phases
   - Key conclusions with evidence + confidence (high/medium/low)
   - Recommendations with rationale + priority (high/medium/low)
   - Open questions, follow-up suggestions
   - Decision summary linking conclusions back to decisions
   - Write to conclusions.json

3. **Final discussion.md Update**:
   - **Conclusions**: Summary, ranked key conclusions, prioritized recommendations, remaining questions
   - **Current Understanding (Final)**: What established, what clarified/corrected, key insights
   - **Decision Trail**: Critical decisions, direction changes timeline, trade-offs
   - Session statistics: rounds, duration, sources, artifacts, decision count

4. **Display Conclusions Summary** — Present to user:
   - **Analysis Report**: summary, key conclusions (numbered, with confidence), recommendations (numbered, with priority + rationale + steps)
   - Open questions if any
   - Link to full report: `{sessionFolder}/discussion.md`

5. **Interactive Recommendation Review** (skip in auto mode):

   Present all recommendations, then batch-confirm via **single AskUserQuestion call** (up to 4 questions):

   ```
   1. Display all recommendations with numbering (action, rationale, priority, steps[])
   2. Single AskUserQuestion call — one question per recommendation (max 4, ordered by priority high→medium→low):
      Each question (single-select, header: "建议#N"):
        - **确认** (label: "确认", desc: "Accept as-is") → review_status = "accepted"
        - **修改** (label: "修改", desc: "Adjust scope/steps") → review_status = "modified"
        - **删除** (label: "删除", desc: "Not needed") → review_status = "rejected"
   3. If >4 recommendations: batch in groups of 4 with additional AskUserQuestion calls
   4. For "修改" selections: follow up to capture modification details
   5. Record all review decisions to discussion.md Decision Log
   6. Update conclusions.json recommendation.review_status for each
   ```

   **After review**: Display summary of reviewed recommendations:
   - Accepted: N items | Modified: N items | Rejected: N items
   - Only accepted/modified recommendations proceed to next step

6. **MANDATORY GATE: Next Step Selection** — workflow MUST NOT end without executing this step.

   **TodoWrite**: Update `phase-4` → `"completed"`, `next-step` → `"in_progress"`

   > **CRITICAL**: This AskUserQuestion is a **terminal gate**. The workflow is INCOMPLETE if this question is not asked. After displaying conclusions (step 4) and recommendation review (step 5), you MUST immediately proceed here.

   Call AskUserQuestion (single-select, header: "Next Step"):
   - **执行任务** (Recommended if high/medium priority recs exist): "基于分析结论启动 workflow-lite-plan 制定执行计划"
   - **产出Issue**: "将建议转化为 issue 进行跟踪管理"
   - **完成**: "分析已足够，无需进一步操作"

   **Handle user selection**:

   **"执行任务"** → MUST invoke Skill tool (do NOT just display a summary and stop):
   1. Build `taskDescription` from high/medium priority recommendations (fallback: summary)
   2. Assemble context: `## Prior Analysis ({sessionId})` + summary + key files (up to 8) + key findings (up to 5) from exploration-codebase.json
   3. **Invoke Skill tool immediately**:
      ```javascript
      Skill({ skill: "workflow-lite-plan", args: `${taskDescription}\n\n${contextLines}` })
      ```
      If Skill invocation is omitted, the workflow is BROKEN.
   4. After Skill invocation, analyze-with-file is complete — do not output any additional content

   **"产出Issue"** → Convert recommendations to issues:
   1. For each recommendation in conclusions.recommendations (priority high/medium):
      - Build issue JSON: `{title, context: rec.action + rec.rationale, priority: rec.priority == 'high' ? 2 : 3, source: 'discovery', labels: dimensions}`
      - Create via pipe: `echo '<issue-json>' | ccw issue create`
   2. Display created issue IDs with next step hint: `/issue:plan <id>`

   **"完成"** → No further action needed.

   **TodoWrite**: Update `next-step` → `"completed"` after user selection is handled

**conclusions.json Schema**:
- `session_id`, `topic`, `completed`, `total_rounds`, `summary`
- `key_conclusions[]`: {point, evidence, confidence, code_anchor_refs[]}
- `code_anchors[]`: {file, lines, snippet, significance}
- `recommendations[]`: {action, rationale, priority, steps[]: {description, target, verification}, review_status: accepted|modified|rejected|pending}
- `open_questions[]`, `follow_up_suggestions[]`: {type, summary}
- `decision_trail[]`: {round, decision, context, options_considered, chosen, rejected_reasons, reason, impact}
- `narrative_trail[]`: {round, starting_point, key_progress, hypothesis_impact, updated_understanding, remaining_questions}
- `intent_coverage[]`: {intent, status, where_addressed, notes}

**Success**: conclusions.json created, discussion.md finalized, Intent Coverage Matrix verified, complete decision trail documented, `next-step` gate completed

## Configuration

### Analysis Perspectives

| Perspective | Tool | Focus | Best For |
|------------|------|-------|----------|
| **Technical** | Gemini | Implementation, code patterns, feasibility | How + technical details |
| **Architectural** | Claude | System design, scalability, interactions | Structure + organization |
| **Business** | Codex | Value, ROI, stakeholder impact | Business implications |
| **Domain Expert** | Gemini | Domain patterns, best practices, standards | Industry knowledge |

User multi-selects up to 4 in Phase 1, default: single comprehensive view.

### Dimension-Direction Mapping

| Dimension | Possible Directions |
|-----------|-------------------|
| architecture | System Design, Component Interactions, Technology Choices, Integration Points, Design Patterns, Scalability |
| implementation | Code Structure, Details, Patterns, Error Handling, Testing, Algorithm Analysis |
| performance | Bottlenecks, Optimization, Resource Utilization, Caching, Concurrency |
| security | Vulnerabilities, Auth, Access Control, Data Protection, Input Validation |
| concept | Foundation, Core Mechanisms, Patterns, Theory, Trade-offs |
| comparison | Solution Comparison, Pros/Cons, Technology Evaluation, Approach Differences |
| decision | Criteria, Trade-off Analysis, Risk Assessment, Impact, Implementation Implications |

Present 2-3 top directions per dimension, allow multi-select + custom.

### Analysis Dimensions

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

| Rule | Description |
|------|-------------|
| Promote confirmed insights | Move validated findings to "What We Established" |
| Track corrections | Keep important wrong→right transformations |
| Focus on current state | What do we know NOW |
| Avoid timeline repetition | Don't copy discussion details |
| Preserve key learnings | Keep insights valuable for future reference |

## Error Handling

| Error | Resolution |
|-------|------------|
| cli-explore-agent fails | Continue with available context, note limitation |
| CLI timeout | Retry with shorter prompt, or skip perspective |
| User timeout | Save state, show resume command |
| Max rounds reached | Force synthesis, offer continuation |
| No relevant findings | Broaden search, ask user for clarification |
| Session folder conflict | Append timestamp suffix |
| Gemini unavailable | Fallback to Codex or manual analysis |

> **Lite-plan handoff**: Phase 4「执行任务」assembles analysis context as inline `## Prior Analysis` block, allowing lite-plan to skip redundant exploration.

---

**Now execute analyze-with-file for**: $ARGUMENTS
