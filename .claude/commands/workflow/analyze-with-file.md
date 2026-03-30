---
name: analyze-with-file
description: Interactive collaborative analysis with documented discussions, CLI-assisted exploration, and evolving understanding
argument-hint: "[-y|--yes] [-c|--continue] \"topic or question\""
allowed-tools: TodoWrite(*), Agent(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-confirm exploration decisions, use recommended analysis angles.

<purpose>
Interactive collaborative analysis workflow combining codebase exploration (cli-explore-agent), external research (workflow-research-agent), and CLI-assisted analysis (Gemini/Codex). Produces a documented discussion timeline with evolving understanding, decision trails, and actionable conclusions.

Invoked when user needs deep, multi-perspective analysis of a topic or codebase question — e.g., architecture review, implementation analysis, concept exploration, or decision evaluation.

Produces: `discussion.md` (evolving analysis document with TOC, rounds, narrative synthesis), `explorations.json`/`perspectives.json` (structured findings), `research.json` (external research findings), `conclusions.json` (final synthesis with recommendations). All artifacts stored in `.workflow/.analysis/{session-id}/`.
</purpose>

<conventions>

### AskUserQuestion Constraints

All `AskUserQuestion` calls MUST comply:
- **questions**: 1-4 questions per call
- **options**: 2-4 per question (system auto-adds "Other" for free-text input)
- **header**: max 12 characters
- **label**: 1-5 words per option

### Decision Recording Protocol

**CRITICAL**: Record immediately when any of these occur:

| Trigger | What to Record | Target Section |
|---------|---------------|----------------|
| **Direction choice** | What chosen, why, alternatives discarded | `#### Decision Log` |
| **Key finding** | Content, impact scope, confidence level, hypothesis impact | `#### Key Findings` |
| **Assumption change** | Old -> new understanding, reason, impact | `#### Corrected Assumptions` |
| **User feedback** | Input, rationale for adoption/adjustment | `#### User Input` |
| **Disagreement & trade-off** | Conflicting views, trade-off basis, final choice | `#### Decision Log` |
| **Scope adjustment** | Before/after scope, trigger reason | `#### Decision Log` |
| **Technical solution proposed/validated/rejected** | Solution description, rationale, alternatives considered, status | `#### Technical Solutions` |

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

**Technical Solution Record Format**:
```markdown
> **Solution**: [Description — what approach, pattern, or implementation]
> - **Status**: [Proposed / Validated / Rejected]
> - **Problem**: [What problem this solves]
> - **Rationale**: [Why this approach]
> - **Alternatives**: [Other options considered and why not chosen]
> - **Evidence**: [file:line or code anchor references]
> - **Next Action**: [Follow-up required or none]
```

**Principles**: Immediacy (record as-it-happens), Completeness (context+options+chosen+reason+rejected), Traceability (later phases trace back), Depth (capture reasoning, not just outcomes)

**Technical Solution Triggers** — record using Technical Solution Record Format when ANY of:
- An implementation approach is described with specific files/patterns/code changes
- Two or more alternatives are compared with trade-offs
- User confirms, modifies, or rejects a proposed approach
- A concrete code change strategy emerges (what to modify, how, why)

### Output Artifacts

| Phase | Artifact | Description |
|-------|----------|-------------|
| 1 | `discussion.md` | Initialized with TOC, Current Understanding block, timeline, metadata |
| 1 | Session variables | Dimensions, focus areas, analysis depth |
| 2 | `exploration-codebase.json` | Shared Layer 1 discovery (files, modules, patterns) — always created |
| 2 | `explorations/*.json` | Per-perspective Layer 2-3 deep-dives (multi-perspective only, max 4) |
| 2 | `research.json` | External research findings (best practices, API details, known issues) — from workflow-research-agent |
| 2 | `explorations.json` | Single perspective aggregated findings (Layer 1 + CLI analysis + research) |
| 2 | `perspectives.json` | Multi-perspective findings (Layer 1 shared + per-perspective deep-dives + research) with synthesis |
| 2 | Updated `discussion.md` | Round 1 + Initial Intent Coverage Check + Current Understanding replaced |
| 3 | Updated `discussion.md` | Round 2-N: feedback, insights, narrative synthesis; TOC + Current Understanding updated each round |
| 4 | `conclusions.json` | Final synthesis with recommendations (incl. steps[] + review_status) |
| 4 | Final `discussion.md` | Complete analysis with conclusions, recommendation review summary, intent coverage matrix |

</conventions>

<process>

<step name="session_init" priority="first">
**Initialize session and create progress tracking.**

1. Extract topic/question from `$ARGUMENTS`
2. Generate session ID: `ANL-{slug}-{date}` (slug: lowercase alphanumeric+Chinese, max 40 chars; date: YYYY-MM-DD UTC+8)
3. Define session folder: `.workflow/.analysis/{session-id}`
4. Parse options: `-c`/`--continue` for continuation, `-y`/`--yes` for auto-approval
5. Auto-detect: If session folder + discussion.md exist -> continue mode
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
</step>

<step name="topic_understanding">
**Phase 1: Parse topic, identify dimensions, and capture user preferences.**

1. **Parse Topic & Identify Dimensions** — Match keywords against Analysis Dimensions table (see Configuration)
2. **Initial Scoping** (if new session + not auto mode) — use **single AskUserQuestion call with up to 3 questions**:
   - Q1 **Focus** (multiSelect: true, header: "分析方向"): Top 3-4 directions from Dimension-Direction Mapping (options max 4)
   - Q2 **Perspectives** (multiSelect: true, header: "分析视角"): Up to 4 from Analysis Perspectives table (options max 4), default: single comprehensive
   - Q3 **Depth** (multiSelect: false, header: "分析深度"): Quick Overview / Standard / Deep Dive (3 options)
3. **Initialize discussion.md** — Structure includes:
   - **Dynamic TOC** (top of file, updated after each round/phase): `## Table of Contents` with links to major sections
   - **Current Understanding** (replaceable block, overwritten each round — NOT appended): `## Current Understanding` initialized as "To be populated after exploration"
   - Session metadata, user context, initial questions, empty discussion timeline, initial dimension selection rationale
4. **Record Phase 1 Decisions** — Dimension selection reasoning, depth rationale, any user adjustments

| Condition | Action |
|-----------|--------|
| Session folder + discussion.md created | Continue to Phase 2 |
| User provides no input (timeout) | Save state, show resume command `# (see code: E003)` |

**TodoWrite**: Update `phase-1` -> `"completed"`, `phase-2` -> `"in_progress"`
</step>

<step name="cli_exploration">
**Phase 2: Codebase exploration FIRST, then CLI analysis.**

**Step 1: Codebase Exploration** (cli-explore-agent, 1 shared + N perspective-specific)

Two-phase approach to avoid redundant file discovery:

**Phase A — Shared Discovery** (1 agent, always runs):
One cli-explore-agent performs Layer 1 (breadth) for ALL perspectives -> `{sessionFolder}/exploration-codebase.json`

```javascript
// Shared Layer 1 discovery — runs ONCE regardless of perspective count
Agent({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: `Discover codebase: ${topicSlug}`,
  prompt: `
## Analysis Context
Topic: ${topic_or_question}
Dimensions: ${dimensions.join(', ')}
Session: ${sessionFolder}

## MANDATORY FIRST STEPS
1. Run: ccw tool exec get_modules_by_depth '{}'
2. Read: .workflow/project-tech.json (if exists)

## Layer 1 — Module Discovery (Breadth ONLY)
- Search by topic keywords across ALL dimensions: ${dimensions.join(', ')}
- Identify ALL relevant files, map module boundaries and entry points
- Categorize files by dimension/perspective relevance
- Output: relevant_files[] with annotations + dimension tags, initial patterns[]

## Output
Write to: ${sessionFolder}/exploration-codebase.json
Schema: {relevant_files: [{path, annotation, dimensions[]}], patterns[], module_map: {}, questions_for_user, _metadata}
`
})
```

**Phase A2 — External Research** (parallel with Phase A, runs when topic involves technologies/patterns/APIs):

Determine if external research would add value — skip for purely internal codebase questions (e.g., "how does module X work"), run for topics involving technology choices, best practices, architecture patterns, API usage, or comparison with industry standards.

```javascript
// External research — runs in PARALLEL with Phase A codebase exploration
// Skip if topic is purely internal codebase navigation
const needsResearch = dimensions.some(d =>
  ['architecture', 'comparison', 'decision', 'performance', 'security'].includes(d)
) || topic_or_question.match(/best practice|pattern|vs|compare|approach|standard|library|framework/i)

if (needsResearch) {
  Agent({
    subagent_type: "workflow-research-agent",
    run_in_background: false,
    description: `Research: ${topicSlug}`,
    prompt: `
## Research Objective
Topic: ${topic_or_question}
Mode: detail-verification
Dimensions: ${dimensions.join(', ')}

## Focus
${dimensions.includes('architecture') ? '- Architecture patterns and best practices for this domain' : ''}
${dimensions.includes('performance') ? '- Performance benchmarks and optimization patterns' : ''}
${dimensions.includes('security') ? '- Security best practices and known vulnerabilities' : ''}
${dimensions.includes('comparison') ? '- Technology comparison and trade-off analysis' : ''}
${dimensions.includes('decision') ? '- Decision frameworks and industry recommendations' : ''}
- Verify assumptions about technologies/patterns involved
- Known issues and pitfalls in this area
- Recommended approaches with evidence

## Codebase Context (from Phase A if available)
Tech stack: ${techStack || 'detect from project files'}
Key patterns observed: ${sharedDiscovery?.patterns?.join(', ') || 'pending Phase A results'}

## Output
Return structured markdown per your output format.
Do NOT write files.
`
  })
  // Parse research agent output → save to ${sessionFolder}/research.json
  // Schema: {topic, mode, findings[], best_practices[], alternatives[], pitfalls[], sources[], _metadata}
}
```

**Phase B — Perspective Deep-Dive** (PARALLEL, only for multi-perspective, max 4):
Each perspective agent receives shared Layer 1 results, performs only Layer 2-3 on its relevant subset.
Skip if single-perspective (single mode proceeds directly to Step 2 CLI analysis with Layer 1 results).

**CRITICAL — Parallel Execution**: Launch ALL perspective Agent() calls in the SAME response block so Claude Code executes them concurrently. Do NOT use a loop that waits for each agent before starting the next.

```javascript
// Per-perspective Layer 2-3 — receives shared discovery, avoids re-scanning
// Only runs in multi-perspective mode
// PARALLEL: All Agent() calls MUST appear in ONE response — Claude Code runs them concurrently
const sharedDiscovery = readJSON(`${sessionFolder}/exploration-codebase.json`)

// Prepare per-perspective file lists
const perspectiveFileLists = Object.fromEntries(
  selectedPerspectives.map(p => [
    p.name,
    sharedDiscovery.relevant_files.filter(f => f.dimensions.includes(p.dimension))
  ])
)

// Launch ALL agents in a SINGLE response block (not sequentially):
// Agent({ ..perspective1.. })  ← call 1
// Agent({ ..perspective2.. })  ← call 2 (same response)
// Agent({ ..perspective3.. })  ← call 3 (same response)

// Each agent call follows this template:
Agent({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: `Deep-dive: ${perspective.name}`,
  prompt: `
## Analysis Context
Topic: ${topic_or_question}
Perspective: ${perspective.name} - ${perspective.focus}
Session: ${sessionFolder}

## SHARED DISCOVERY (Layer 1 already completed — DO NOT re-scan)
Relevant files for this perspective:
${perspectiveFileLists[perspective.name].map(f => `- ${f.path}: ${f.annotation}`).join('\n')}
Patterns found: ${sharedDiscovery.patterns.join(', ')}

## Layer 2 — Structure Tracing (Depth)
- From the relevant files above, pick top 3-5 key files for this perspective
- Trace call chains 2-3 levels deep
- Identify data flow paths and dependencies -> call_chains[], data_flows[]

## Layer 3 — Code Anchor Extraction (Detail)
- Each key finding: extract code snippet (20-50 lines) with file:line
- Annotate WHY this matters for ${perspective.name} -> code_anchors[]

## Output
Write to: ${sessionFolder}/explorations/${perspective.name}.json
Schema: {perspective, relevant_files, key_findings, code_anchors: [{file, lines, snippet, significance}], call_chains: [{entry, chain, files}], questions_for_user, _metadata}
`
})
```

**Step 2: CLI Deep Analysis** (AFTER exploration, single-perspective ONLY)

- **Single-perspective**: CLI does Layer 2-3 depth analysis (explore agent only did Layer 1)
- **Multi-perspective**: SKIP this step — perspective agents in Step 1 Phase B already did Layer 2-3
- Execution: `Bash` with `run_in_background: true`

```javascript
// ONLY for single-perspective mode — multi-perspective already has deep-dive agents
if (selectedPerspectives.length <= 1) {
  const sharedDiscovery = readJSON(`${sessionFolder}/exploration-codebase.json`)
  const explorationContext = `
PRIOR EXPLORATION (Layer 1 discovery):
- Key files: ${sharedDiscovery.relevant_files.slice(0,8).map(f => `${f.path} (${f.annotation})`).join(', ')}
- Patterns: ${sharedDiscovery.patterns.slice(0,5).join(', ')}
- Module map: ${JSON.stringify(sharedDiscovery.module_map || {})}`

  Bash({
    command: `ccw cli -p "
PURPOSE: Deep analysis of '${topic_or_question}' — build on prior file discovery
Success: Actionable insights with code evidence (anchors + call chains)

${explorationContext}

TASK:
- From discovered files, trace call chains 2-3 levels deep for top 3-5 key files
- Extract code snippets (20-50 lines) for each key finding with file:line
- Identify patterns, anti-patterns, and potential issues with evidence
- Generate discussion points for user clarification

MODE: analysis
CONTEXT: @**/* | Topic: ${topic_or_question}
EXPECTED: Structured analysis with: key_findings[], code_anchors[{file,lines,snippet,significance}], call_chains[{entry,chain,files}], discussion_points[]
CONSTRAINTS: Focus on ${dimensions.join(', ')} | Do NOT re-discover files — use provided file list
" --tool gemini --mode analysis`,
    run_in_background: true
  })
  // STOP: Wait for hook callback before continuing
}
```

**Step 3: Aggregate Findings**
- Consolidate explorations + CLI results + research findings (if research.json exists)
- Merge research best_practices[] and pitfalls[] into discussion points
- Cross-reference: flag gaps where codebase patterns diverge from research best practices
- Multi: Extract synthesis (convergent themes, conflicting views, unique contributions)
- Write to `explorations.json` (single) or `perspectives.json` (multi)
- If research.json exists, add `external_research` section to explorations/perspectives with: key findings, best practices, codebase gaps

**Step 4: Update discussion.md** — Append Round 1 with sources, key findings, discussion points, open questions

**Step 5: Initial Intent Coverage Check** (FIRST check, before entering Phase 3):
- Re-read original "User Intent" / "Analysis Context" from discussion.md header
- Check each intent item against Round 1 findings: ✅ addressed / 🔄 in-progress / ❌ not yet touched
- Append initial Intent Coverage Check to discussion.md
- Present to user at beginning of Phase 3: "初始探索完成后，以下意图的覆盖情况：[list]。接下来的讨论将重点关注未覆盖的部分。"
- Purpose: Early course correction — catch drift before spending multiple interactive rounds

> All JSON schemas consolidated in `<schemas>` section below.

| Condition | Action |
|-----------|--------|
| Exploration + CLI artifacts created | Continue to Phase 3 |
| cli-explore-agent fails | Continue with available context, note limitation `# (see code: E001)` |
| CLI timeout | Retry with shorter prompt, or skip perspective `# (see code: E002)` |

**TodoWrite**: Update `phase-2` -> `"completed"`, `phase-3` -> `"in_progress"`
</step>

<step name="interactive_discussion">
**Phase 3: Interactive discussion loop with evolving understanding.**

**Guideline**: Delegate complex tasks to agents (cli-explore-agent) or CLI calls. Avoid direct analysis in main process.

**Cumulative Context Rule**: Every agent/CLI call in Phase 3 MUST include a summary of ALL prior exploration results to avoid re-discovering known information. Build `priorContext` before each call:
```javascript
// Build cumulative context from all prior explorations (Phase 2 + previous rounds)
const allFindings = readJSON(`${sessionFolder}/explorations.json`) // or perspectives.json
const priorContext = `
## KNOWN FINDINGS (DO NOT re-discover)
- Established files: ${allFindings.sources.map(s => s.file).join(', ')}
- Key findings: ${allFindings.key_findings.join('; ')}
- Code anchors: ${allFindings.code_anchors.slice(0,5).map(a => `${a.file}:${a.lines}`).join(', ')}
- Call chains: ${allFindings.call_chains.slice(0,3).map(c => c.entry).join(', ')}
- Open questions: ${allFindings.open_questions.join('; ')}

## NEW TASK: Focus ONLY on unexplored areas below.
`
```

**Loop** (max 5 rounds):

1. **Current Understanding Summary** (Round >= 2, BEFORE presenting new findings):
   - Generate 1-2 sentence recap: "到目前为止，我们已确认 [established facts]。上一轮 [key action/direction]。现在，这是新一轮的发现："
   - Purpose: Reset context, prevent cognitive overload, make incremental progress visible

2. **Present Findings** from explorations.json

3. **Gather Feedback** (AskUserQuestion, single-select, header: "分析反馈"):
   - **继续深入**: Direction correct — deepen automatically or user specifies direction (combines agree+deepen and agree+suggest)
   - **外部研究**: Need external research on specific technology/pattern/best practice (spawns workflow-research-agent)
   - **调整方向**: Different focus or specific questions to address
   - **分析完成**: Sufficient -> exit to Phase 4

4. **Process Response** (always record user choice + impact to discussion.md):

   **Record-Before-Continue Rule**: Each path below MUST write findings and discussion synthesis to `discussion.md` BEFORE proceeding to Step 5. Specifically, after agent/CLI returns results:
   - Append the exploration results, reasoning, and any technical approaches discussed to the current round section
   - Apply **Technical Solution Triggers** (see Decision Recording Protocol) — if triggered, record using Technical Solution Record Format
   - **Ambiguity Check**: For each Technical Solution with Status `Proposed`, verify no unresolved alternatives remain. If a solution lists 2+ options without a chosen one (e.g., "A or B"), record as:
     ```markdown
     > **⚠️ Ambiguity**: [Solution] has [N] unresolved alternatives: [list]
     > - **Needs**: [Decision criteria or exploration to resolve]
     ```
     Surface unresolved ambiguities to user in the next feedback round.
   - Only THEN proceed to Step 5 for Current Understanding replacement and TOC update

   **继续深入** -> Sub-question to choose direction (AskUserQuestion, single-select, header: "深入方向"):
   - Dynamically generate **max 3** context-driven options from: unresolved questions, low-confidence findings, unexplored dimensions, user-highlighted areas
   - Add **1** heuristic option that breaks current frame (e.g., "compare with best practices", "review from security perspective", "explore simpler alternatives")
   - Total: **max 4 options**. Each specifies: label, description, tool (cli-explore-agent for code-level / Gemini CLI for pattern-level), scope
   - **"Other" is auto-provided** by AskUserQuestion — covers user-specified custom direction (no need for separate "suggest next step" option)
   - Execute selected direction -> merge new code_anchors/call_chains into explorations.json -> **write exploration results, analysis reasoning, and any proposed approaches to discussion.md** -> record confirmed assumptions + deepen angle

   **外部研究** -> Spawn workflow-research-agent for targeted research:
   - AskUserQuestion (header: "研究主题", freetext via "Other"): What specific technology/pattern/approach needs external research?
   - Spawn research agent with topic + current codebase context (from explorations.json)
   - Merge research findings into explorations.json `external_research` section
   - Update research.json with new findings (append, don't overwrite)
   - Record research findings as Key Findings in discussion.md

   **调整方向** -> AskUserQuestion (header: "新方向", user selects or provides custom via "Other") -> new CLI exploration -> Record Decision (old vs new direction, reason, impact)

   **分析完成** -> Exit loop -> Record why concluding

5. **Update discussion.md** (after Record-Before-Continue writes are done):
   - **Replace** `## Current Understanding` block with latest consolidated understanding (follow Consolidation Rules)
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
   - If ❌ or ⚠️ items exist -> **proactively surface** to user at start of next round: "以下原始意图尚未充分覆盖：[list]。是否需要调整优先级？"

| Condition | Action |
|-----------|--------|
| User selects "分析完成" | Exit loop, proceed to Phase 4 |
| Max rounds (5) reached | Force synthesis, offer continuation `# (see code: E004)` |
| User timeout | Save state, show resume command `# (see code: E003)` |

**TodoWrite**: Update `phase-3` -> `"completed"`, `phase-4` -> `"in_progress"`
</step>

<step name="synthesis_conclusion">
**Phase 4: Synthesize findings, verify intent coverage, and determine next steps.**

1. **Intent Coverage Verification** (MANDATORY before synthesis):
   - Check each original intent: ✅ Addressed / 🔀 Transformed / ⚠️ Absorbed / ❌ Missed
   ```markdown
   ### Intent Coverage Matrix
   | # | Original Intent | Status | Where Addressed | Notes |
   |---|----------------|--------|-----------------|-------|
   | 1 | [intent] | ✅ Addressed | Round N, Conclusion #M | |
   | 2 | [intent] | 🔀 Transformed | Round N -> M | Original: X -> Final: Y |
   | 3 | [intent] | ❌ Missed | — | Reason |
   ```
   - **Gate**: ❌ Missed items must be either (a) addressed in additional round or (b) confirmed deferred by user
   - Add `intent_coverage[]` to conclusions.json

2. **Findings-to-Recommendations Traceability** (MANDATORY before consolidation):
   - **Collect ALL actionable findings** from every round: key findings with actionable implications, technical solutions (proposed/validated), identified gaps (API-frontend gaps, missing features, design issues), corrected assumptions that imply fixes
   - **Map each finding → disposition**:
     | Disposition | Meaning |
     |-------------|---------|
     | `recommendation` | Converted to a numbered recommendation |
     | `absorbed` | Covered by another recommendation (specify which) |
     | `deferred` | Explicitly out-of-scope with reason |
     | `informational` | Pure insight, no action needed |
   - **Findings Coverage Matrix** (append to discussion.md):
     ```markdown
     ### Findings Coverage Matrix
     | # | Finding (Round) | Disposition | Target |
     |---|----------------|-------------|--------|
     | 1 | [finding summary] (R1) | recommendation | Rec #1 |
     | 2 | [finding summary] (R2) | absorbed | → Rec #1 |
     | 3 | [finding summary] (R2) | deferred | Reason: [why] |
     | 4 | [finding summary] (R1) | informational | — |
     ```
   - **Gate**: Findings with `disposition = null` (unmapped) MUST be either assigned a disposition or added as new recommendations. Do NOT proceed to step 3 with unmapped findings.
   - Add `findings_coverage[]` to conclusions.json

3. **Consolidate Insights**:
   - Compile Decision Trail from all phases
   - Key conclusions with evidence + confidence (high/medium/low)
   - Recommendations with rationale + priority (high/medium/low) — **merge validated `technical_solutions[]` from explorations.json as high-priority recommendations** — **ensure all `disposition = recommendation` findings from step 2 are represented**
   - **Solution Readiness Gate**: For each recommendation, check if all key choices are resolved. Flag `ambiguity_resolved: false` on any recommendation that still contains unresolved alternatives. Present unresolved items to user before proceeding to Step 4.
   - Open questions, follow-up suggestions
   - Decision summary linking conclusions back to decisions
   - Write to conclusions.json

4. **Final discussion.md Update**:
   - **Conclusions**: Summary, ranked key conclusions, prioritized recommendations, remaining questions
   - **Current Understanding (Final)**: What established, what clarified/corrected, key insights
   - **Decision Trail**: Critical decisions, direction changes timeline, trade-offs
   - **Findings Coverage Matrix**: From step 2 (already appended)
   - Session statistics: rounds, duration, sources, artifacts, decision count

5. **Display Conclusions Summary** — Present to user:
   - **Analysis Report**: summary, key conclusions (numbered, with confidence), recommendations (numbered, with priority + rationale + steps)
   - Open questions if any
   - Link to full report: `{sessionFolder}/discussion.md`

6. **Interactive Recommendation Review** (skip in auto mode):

   Present all recommendations, then batch-confirm via **single AskUserQuestion call** (up to 4 questions):

   ```
   1. Display all recommendations with numbering (action, rationale, priority, steps[])
   2. Single AskUserQuestion call — one question per recommendation (max 4, ordered by priority high->medium->low):
      Each question (single-select, header: "建议#N"):
        - **确认** (label: "确认", desc: "Accept as-is") -> review_status = "accepted"
        - **修改** (label: "修改", desc: "Adjust scope/steps") -> review_status = "modified"
        - **删除** (label: "删除", desc: "Not needed") -> review_status = "rejected"
   3. If >4 recommendations: batch in groups of 4 with additional AskUserQuestion calls
   4. For "修改" selections: follow up to capture modification details
   5. Record all review decisions to discussion.md Decision Log
   6. Update conclusions.json recommendation.review_status for each
   ```

   **After review**: Display summary of reviewed recommendations:
   - Accepted: N items | Modified: N items | Rejected: N items
   - Only accepted/modified recommendations proceed to next step

7. **MANDATORY GATE: Next Step Selection** — workflow MUST NOT end without executing this step.

   **TodoWrite**: Update `phase-4` -> `"completed"`, `next-step` -> `"in_progress"`

   > **CRITICAL**: This AskUserQuestion is a **terminal gate**. The workflow is INCOMPLETE if this question is not asked. After displaying conclusions (step 4) and recommendation review (step 5), you MUST immediately proceed here.

   Call AskUserQuestion (single-select, header: "Next Step"):
   - **执行任务** (Recommended if high/medium priority recs exist): "基于分析结论启动 workflow-lite-plan 制定执行计划"
   - **产出Issue**: "将建议转化为 issue 进行跟踪管理"
   - **完成**: "分析已足够，无需进一步操作"

   **Handle user selection**:

   **"执行任务"** -> Implementation Scoping + Skill invocation (MUST NOT just display summary and stop):

   **Step A: Build Implementation Scope** — Transform recommendations into actionable specs:
   ```javascript
   // Filter to accepted/modified recommendations only
   const actionableRecs = conclusions.recommendations
     .filter(r => r.review_status === 'accepted' || r.review_status === 'modified')
     .sort((a, b) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1))

   // Map each recommendation to implementation scope using code_anchors
   const implScope = actionableRecs.map(rec => ({
     objective: rec.action,                    // WHAT to do
     rationale: rec.rationale,                 // WHY
     priority: rec.priority,
     target_files: rec.steps.flatMap(s => s.target ? [s.target] : [])
       .concat((conclusions.code_anchors || [])
         .filter(a => rec.action.includes(a.significance) || rec.steps.some(s => s.description.includes(a.file)))
         .map(a => ({ path: a.file, lines: a.lines, context: a.significance }))),
     acceptance_criteria: rec.steps.map(s => s.verification || s.description),
     change_summary: rec.steps.map(s => `${s.target || 'TBD'}: ${s.description}`).join('; ')
   }))
   ```

   **Step B: User Scope Confirmation** (skip in auto mode):
   ```javascript
   // Present implementation scope for confirmation
   console.log(`## Implementation Scope (${implScope.length} items)`)
   implScope.forEach((item, i) => {
     console.log(`${i+1}. **${item.objective}** [${item.priority}]`)
     console.log(`   Files: ${item.target_files.map(f => typeof f === 'string' ? f : f.path).join(', ') || 'TBD by lite-plan'}`)
     console.log(`   Done when: ${item.acceptance_criteria.join(' + ')}`)
   })

   if (!autoMode) {
     AskUserQuestion({
       questions: [{
         question: "Implementation scope correct? lite-plan will break these into concrete tasks.",
         header: "Scope确认",
         multiSelect: false,
         options: [
           { label: "确认执行", description: "Scope is clear, proceed to planning" },
           { label: "调整范围", description: "Narrow or expand scope before planning" },
           { label: "补充标准", description: "Add/refine acceptance criteria" }
         ]
       }]
     })
     // Handle "调整范围" / "补充标准" -> update implScope, re-confirm
   }
   ```

   **Step C: Build Structured Handoff & Invoke Skill**:
   ```javascript
   // Structured handoff — lite-plan parses this as JSON block, not free text
   const handoff = {
     source: 'analyze-with-file',
     session_id: sessionId,
     session_folder: sessionFolder,
     summary: conclusions.summary,
     implementation_scope: implScope,     // WHAT + acceptance criteria
     code_anchors: (conclusions.code_anchors || []).slice(0, 10),  // WHERE
     key_files: explorationResults.relevant_files?.slice(0, 8) || [],
     key_findings: conclusions.key_conclusions?.slice(0, 5) || [],
     decision_context: conclusions.decision_trail?.slice(-3) || []  // recent decisions for context
   }

   const handoffBlock = `## Prior Analysis (${sessionId})

\`\`\`json:handoff-spec
${JSON.stringify(handoff, null, 2)}
\`\`\`

### Summary
${conclusions.summary}

### Implementation Scope
${implScope.map((item, i) => `${i+1}. **${item.objective}** [${item.priority}]
   - Files: ${item.target_files.map(f => typeof f === 'string' ? f : f.path).join(', ') || 'TBD'}
   - Done when: ${item.acceptance_criteria.join('; ')}
   - Changes: ${item.change_summary}`).join('\n')}`

   Skill({ skill: "workflow-lite-plan", args: handoffBlock })
   ```
   If Skill invocation is omitted, the workflow is BROKEN.
   4. After Skill invocation, analyze-with-file is complete — do not output any additional content

   **"产出Issue"** -> Convert recommendations to issues:
   1. For each recommendation in conclusions.recommendations (priority high/medium):
      - Build issue JSON: `{title, context: rec.action + rec.rationale, priority: rec.priority == 'high' ? 2 : 3, source: 'discovery', labels: dimensions}`
      - Create via pipe: `echo '<issue-json>' | ccw issue create`
   2. Display created issue IDs with next step hint: `/issue:plan <id>`

   **"完成"** -> No further action needed.

   **TodoWrite**: Update `next-step` -> `"completed"` after user selection is handled

> conclusions.json schema: see `<schemas>` section below.
</step>

</process>

<schemas>

**exploration-codebase.json** (shared Layer 1):
- `session_id`, `timestamp`, `topic`, `dimensions[]`
- `relevant_files[]`: {path, annotation, dimensions[]}
- `patterns[]`, `module_map`: {}
- `questions_for_user[]`, `_metadata`

**research.json** (external research findings):
- `topic`, `mode` (detail-verification|api-research|design-research), `timestamp`
- `findings[]`: {finding, detail, confidence, source_url}
- `best_practices[]`: {practice, rationale, source}
- `alternatives[]`: {option, pros, cons, verdict}
- `pitfalls[]`: {issue, mitigation, source}
- `codebase_gaps[]`: {gap, current_approach, recommended_approach}
- `sources[]`: {title, url, key_takeaway}
- `_metadata`: {queries_executed, results_found}

**explorations.json** (single — Layer 1 + CLI analysis + research merged):
- `session_id`, `timestamp`, `topic`, `dimensions[]`
- `sources[]`: {type, file/summary}
- `key_findings[]`, `code_anchors[]`: {file, lines, snippet, significance}
- `call_chains[]`: {entry, chain, files}
- `discussion_points[]`, `open_questions[]`
- `technical_solutions[]`: {round, solution, problem, rationale, alternatives, status: proposed|validated|rejected, evidence_refs[], next_action}
- `external_research`: {findings[], best_practices[], codebase_gaps[], sources[]} — merged from research.json if available

**perspectives.json** (multi — Layer 1 shared + per-perspective Layer 2-3 + research):
- `shared_discovery`: {relevant_files[], patterns[], module_map}
- `perspectives[]`: [{name, tool, findings, insights, questions, code_anchors[], call_chains[]}]
- `external_research`: {findings[], best_practices[], codebase_gaps[], sources[]} — merged from research.json if available
- `synthesis`: {convergent_themes, conflicting_views, unique_contributions}

**conclusions.json**:
- `session_id`, `topic`, `completed`, `total_rounds`, `summary`
- `key_conclusions[]`: {point, evidence, confidence, code_anchor_refs[]}
- `code_anchors[]`: {file, lines, snippet, significance}
- `recommendations[]`: {action, rationale, priority, steps[]: {description, target, verification}, review_status: accepted|modified|rejected|pending}
- `implementation_scope[]`: {objective, rationale, priority, target_files[], acceptance_criteria[], change_summary} — built in Phase 4 "执行任务" Step A, only for accepted/modified recommendations
- `open_questions[]`, `follow_up_suggestions[]`: {type, summary}
- `decision_trail[]`: {round, decision, context, options_considered, chosen, rejected_reasons, reason, impact}
- `narrative_trail[]`: {round, starting_point, key_progress, hypothesis_impact, updated_understanding, remaining_questions}
- `intent_coverage[]`: {intent, status, where_addressed, notes}
- `findings_coverage[]`: {finding, round, disposition: recommendation|absorbed|deferred|informational, target, reason}

</schemas>

<error_codes>

| Code | Severity | Description | Stage |
|------|----------|-------------|-------|
| E001 | error | cli-explore-agent fails — continue with available context, note limitation | cli_exploration |
| E002 | error | CLI timeout — retry with shorter prompt, or skip perspective | cli_exploration |
| E003 | error | User timeout — save state, show resume command | topic_understanding, interactive_discussion |
| E004 | warning | Max discussion rounds (5) reached — force synthesis, offer continuation | interactive_discussion |
| E005 | error | No relevant findings from exploration — broaden search, ask user for clarification | cli_exploration |
| E006 | warning | Session folder conflict — append timestamp suffix | session_init |
| E007 | error | Gemini unavailable — fallback to Codex or manual analysis | cli_exploration |
| E008 | warning | Research agent WebSearch failed — continue with codebase-only analysis, note limitation | cli_exploration |
| E009 | warning | Research findings conflict with codebase patterns — flag as codebase_gaps for user review | cli_exploration |

</error_codes>

<success_criteria>
- [ ] Session folder created with valid session ID
- [ ] Progress tracking (TodoWrite) initialized with all 5 items
- [ ] Dimensions identified and user preferences captured (Phase 1)
- [ ] discussion.md initialized with TOC, Current Understanding, metadata
- [ ] Codebase exploration completed with code_anchors and call_chains (Phase 2)
- [ ] External research executed if topic warrants it (architecture/comparison/decision/performance/security dimensions)
- [ ] Research findings merged into explorations/perspectives with codebase_gaps flagged
- [ ] CLI analysis executed and findings aggregated
- [ ] Initial Intent Coverage Check appended to discussion.md
- [ ] Interactive discussion rounds documented with narrative synthesis (Phase 3)
- [ ] Intent Drift Check performed each round >= 2
- [ ] All decisions recorded per Decision Recording Protocol
- [ ] Intent Coverage Matrix verified in Phase 4
- [ ] Findings Coverage Matrix completed — all actionable findings mapped to disposition (recommendation/absorbed/deferred/informational)
- [ ] conclusions.json created with key_conclusions, recommendations, decision_trail, findings_coverage
- [ ] discussion.md finalized with conclusions, Decision Trail, session statistics
- [ ] Recommendation review completed (non-auto mode)
- [ ] Next Step terminal gate executed — `next-step` todo is `"completed"`
</success_criteria>

<configuration>

### Analysis Perspectives

| Perspective | Tool | Focus | Best For |
|------------|------|-------|----------|
| **Technical** | Gemini | Implementation, code patterns, feasibility | How + technical details |
| **Architectural** | Claude | System design, scalability, interactions | Structure + organization |
| **Business** | Codex | Value, ROI, stakeholder impact | Business implications |
| **Domain Expert** | Gemini | Domain patterns, best practices, standards | Industry knowledge |

User multi-selects up to 4 in Phase 1. Default: if dimensions >= 2, pre-select Technical + Architectural; if dimensions == 1, single comprehensive view.

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
| Track corrections | Keep important wrong->right transformations |
| Focus on current state | What do we know NOW |
| Avoid timeline repetition | Don't copy discussion details |
| Preserve key learnings | Keep insights valuable for future reference |

</configuration>
---

**Now execute analyze-with-file for**: $ARGUMENTS
