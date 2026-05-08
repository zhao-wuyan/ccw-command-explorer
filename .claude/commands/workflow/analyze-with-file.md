---
name: analyze-with-file
description: Interactive collaborative analysis with documented discussions, CLI-assisted exploration, and evolving understanding
argument-hint: "[-y|--yes] [-c|--continue] \"topic or question\""
allowed-tools: TodoWrite(*), Agent(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*)
---

<purpose>
Interactive collaborative analysis combining codebase exploration (cli-explore-agent), external research (workflow-research-agent), and CLI-assisted analysis (Gemini/Codex). Produces a documented discussion timeline with evolving understanding, decision trails, and actionable conclusions.

Use when: architecture review, implementation analysis, concept exploration, decision evaluation, or any multi-perspective codebase question.

Auto mode (`-y`): Auto-confirm decisions, use recommended angles, skip interactive scoping.
</purpose>

## Artifacts

```
{projectRoot}/.workflow/.analysis/ANL-{date}-{slug}/
├── discussion.md                 # Single source of truth: rounds, decisions, synthesis, conclusions, recommendations
├── state.json                    # Session state: config, confidence, quality tracking
├── exploration-codebase.json     # Layer 1 shared discovery: files, patterns, module map
├── explorations/{perspective}.json  # Layer 2-3 per-perspective deep-dives (multi-perspective only)
├── research.json                 # External research: best practices, pitfalls, sources
└── handoff.json                  # Structured handoff (only on "执行任务")
```

| File | When | Schema |
|------|------|--------|
| `discussion.md` | Phase 1+ | All analysis content: metadata, rounds, multi-perspective synthesis, conclusions, recommendations, intent/findings coverage matrices |
| `state.json` | Phase 0+ | `session_id`, `topic`, `depth`, `dimensions[]`, `perspectives[]`, `focus_areas[]`, `current_round`, `current_phase`, `confidence{dimensions{}, overall, weakest, history[]}`, `quality{pressure_pass_done, challenge_modes_used[], stall_counter, last_findings_count, readiness_gate_passed, residual_risks[]}` |
| `exploration-codebase.json` | Phase 2 | `session_id`, `timestamp`, `topic`, `dimensions[]`, `relevant_files[{path, annotation, dimensions[]}]`, `patterns[]`, `module_map{}`, `questions_for_user[]`, `_metadata` |
| `explorations/{name}.json` | Phase 2 | `perspective`, `relevant_files[]`, `key_findings[]`, `code_anchors[{file, lines, snippet, significance}]`, `call_chains[{entry, chain, files}]`, `questions_for_user[]`, `_metadata` |
| `research.json` | Phase 2 | `topic`, `mode`, `timestamp`, `findings[{finding, detail, confidence, source_url}]`, `best_practices[{practice, rationale, source}]`, `alternatives[{option, pros, cons, verdict}]`, `pitfalls[{issue, mitigation, source}]`, `codebase_gaps[{gap, current_approach, recommended_approach}]`, `sources[{title, url, key_takeaway}]` |
| `handoff.json` | Phase 4 | `source`, `session_id`, `session_folder`, `summary`, `implementation_scope[{objective, rationale, priority, target_files[], acceptance_criteria[], change_summary}]`, `code_anchors[]`, `key_files[]`, `key_findings[]`, `decision_context[]`, `exploration_artifacts{exploration_codebase, explorations, perspectives, research, deep_dives[]}` — keys align with workflow-lite-plan artifactMapping |

Removed from separate files (now in discussion.md): `explorations.json`, `perspectives.json`, `conclusions.json`. Synthesis, conclusions, and recommendations are written directly to discussion.md sections.

---

## Conventions

### AskUserQuestion Constraints

All calls MUST comply:
- **questions**: 1-4 per call
- **options**: 2-4 per question (system auto-adds "Other" for free-text)
- **header**: max 12 characters
- **label**: 1-5 words per option

### Recording Protocol

Record to discussion.md **immediately** on occurrence:

| Trigger | Target Section |
|---------|----------------|
| Direction choice / scope adjustment | `#### Decision Log` |
| Key finding discovered | `#### Key Findings` |
| Assumption corrected | `#### Corrected Assumptions` |
| User feedback received | `#### User Input` |
| Disagreement or trade-off | `#### Decision Log` |
| Technical solution proposed/validated/rejected | `#### Technical Solutions` |
| Pressure pass executed | `#### Pressure Pass` |
| Challenge mode fired | `#### Challenge` |

**Technical Solution Triggers** — record when ANY of: implementation approach with specific files/patterns, 2+ alternatives compared with trade-offs, user confirms/modifies/rejects approach, concrete code change strategy emerges.

#### Record Formats

**Decision**:
```markdown
> **Decision**: [description]
> - **Context**: [trigger] | **Options**: [alternatives]
> - **Chosen**: [approach] — **Reason**: [rationale]
> - **Rejected**: [why] | **Impact**: [effect on direction]
```

**Finding**:
```markdown
> **Finding**: [content]
> - **Confidence**: [High/Medium/Low] — **Why**: [evidence basis]
> - **Hypothesis Impact**: [Confirms/Refutes/Modifies] "[hypothesis]"
> - **Scope**: [affected areas]
```

**Technical Solution**:
```markdown
> **Solution**: [approach/pattern/implementation]
> - **Status**: [Proposed / Validated / Rejected]
> - **Problem**: [what it solves] | **Rationale**: [why]
> - **Alternatives**: [others, why not] | **Evidence**: [file:line refs]
> - **Next Action**: [follow-up or none]
```

**Narrative Synthesis** (append after each round):
```markdown
### Round N: Narrative Synthesis
**起点**: 基于上一轮的 [conclusions/questions]，本轮从 [starting point] 切入。
**关键进展**: [findings] [confirmed/refuted/modified] 了关于 [hypothesis] 的理解。
**决策影响**: 用户选择 [feedback type]，分析方向 [adjusted/deepened/maintained]。
**当前理解**: 核心认知更新为 [updated understanding]。
**遗留问题**: [remaining questions]
```

**Principles**: Immediacy (as-it-happens), Completeness (context+options+chosen+reason+rejected), Traceability (later phases trace back), Depth (reasoning, not just outcomes).

---

## Phase 0: Session Setup

1. Extract topic from `$ARGUMENTS`, parse flags (`-y`/`--yes`, `-c`/`--continue`)
2. Generate session ID: `ANL-{date}-{slug}` (date: YYYY-MM-DD UTC+8; slug: lowercase alphanumeric+CJK, max 40 chars)
3. Session folder: `.workflow/.analysis/{session-id}`
4. Auto-detect continue: session folder + discussion.md exist → continue mode (load state.json, resume)
5. Create directory structure: `mkdir -p {sessionFolder}/explorations`
6. Initialize state.json (see Artifacts schema)
7. TodoWrite (MANDATORY):

```
TodoWrite([
  { id: "phase-1", title: "Phase 1: Topic Understanding", status: "in_progress" },
  { id: "phase-2", title: "Phase 2: CLI Exploration", status: "pending" },
  { id: "phase-3", title: "Phase 3: Interactive Discussion", status: "pending" },
  { id: "phase-4", title: "Phase 4: Synthesis & Conclusion", status: "pending" },
  { id: "next-step", title: "GATE: Post-Completion Next Step", status: "pending" }
])
```

Update status to `"in_progress"` entering each phase, `"completed"` when done. **`next-step` is a terminal gate** — workflow NOT complete until `"completed"`.

---

## Phase 1: Topic Understanding

### 1.1 Identify Dimensions

Match topic keywords against [Analysis Dimensions](#analysis-dimensions). If multiple match, include all. If none, default to "architecture" + "implementation".

### 1.2 Initial Scoping (new session, not auto mode)

Single AskUserQuestion call, up to 3 questions:

**Q1 — Focus** (multiSelect: true, header: "分析方向"): Top 3-4 directions from [Dimension-Direction Mapping](#dimension-direction-mapping), max 4 options.

**Q2 — Perspectives** (multiSelect: true, header: "分析视角"): Up to 4 from [Analysis Perspectives](#analysis-perspectives). Default: if dimensions >= 2 pre-select Technical + Architectural; if 1, single comprehensive.

**Q3 — Depth** (multiSelect: false, header: "分析深度"): Quick Overview / Standard(Recommended) / Deep Dive.

### 1.3 Initialize discussion.md

Write full template (see [discussion.md Structure](#discussionmd-structure)):
- Header: session ID, topic, timestamp (UTC+8), dimensions, depth
- Dynamic TOC (updated each round)
- Current Understanding: "To be populated after exploration" (OVERWRITE block, not append)
- Analysis Context: focus areas, perspectives, depth
- Initial Questions: generated from topic + dimensions
- Initial Decisions: WHY these dimensions/focus selected, what excluded
- Discussion Timeline: empty (rounds appended later)
- Decision Trail: empty (populated Phase 4)

Update state.json. TodoWrite: phase-1 → completed, phase-2 → in_progress.

---

## Phase 2: CLI Exploration

### 2.1 Phase A — Shared Layer 1 Discovery (always runs)

One `cli-explore-agent` performs breadth discovery for ALL perspectives:

```
Agent({
  subagent_type: "cli-explore-agent",
  description: "Discover codebase: {topicSlug}",
  prompt: "
## Analysis Context
Topic: {topic}
Dimensions: {dimensions}
Session: {sessionFolder}

## MANDATORY FIRST STEPS
1. Run: ccw tool exec get_modules_by_depth '{}'
2. Read: .workflow/project-tech.json (if exists)

## Layer 1 — Module Discovery (Breadth ONLY)
- Search by topic keywords across ALL dimensions
- Identify ALL relevant files, map module boundaries and entry points
- Categorize files by dimension/perspective relevance

## Output
Write to: {sessionFolder}/exploration-codebase.json
Schema: {relevant_files[{path, annotation, dimensions[]}], patterns[], module_map{}, questions_for_user[], _metadata}
"
})
```

### 2.2 Phase A2 — External Research (PARALLEL with Phase A)

**Trigger**: dimensions include `architecture|comparison|decision|performance|security`, OR topic matches `best practice|pattern|vs|compare|approach|standard|library|framework`. Skip for purely internal codebase questions.

```
Agent({
  subagent_type: "workflow-research-agent",
  description: "Research: {topicSlug}",
  prompt: "
## Research Objective
Topic: {topic}
Mode: detail-verification
Dimensions: {dimensions}

## Focus
- Architecture patterns and best practices (if architecture dimension)
- Performance benchmarks and optimization (if performance)
- Security best practices and vulnerabilities (if security)
- Technology comparison and trade-offs (if comparison/decision)
- Known issues and pitfalls
- Recommended approaches with evidence

## Codebase Context (from Phase A if available)
Tech stack: {from project files}
Key patterns: {from shared discovery if ready}

## Output
Return structured markdown. Do NOT write files.
"
})
// Parse output → save to {sessionFolder}/research.json
```

### 2.3 Phase B — Perspective Deep-Dives (PARALLEL, multi-perspective only)

Only for multi-perspective mode (skip if single). Each perspective agent receives shared Layer 1 results, performs Layer 2-3 on its relevant file subset.

**CRITICAL**: Launch ALL perspective Agent() calls in the SAME response block for concurrent execution. Do NOT loop sequentially.

Per perspective:
```
Agent({
  subagent_type: "cli-explore-agent",
  description: "Deep-dive: {perspective.name}",
  prompt: "
## Analysis Context
Topic: {topic}
Perspective: {perspective.name} - {perspective.focus}
Session: {sessionFolder}

## SHARED DISCOVERY (Layer 1 done — DO NOT re-scan)
Relevant files for this perspective:
{filtered relevant_files where dimensions includes this perspective}
Patterns found: {shared patterns}

## Layer 2 — Structure Tracing (Depth)
- Pick top 3-5 key files for this perspective
- Trace call chains 2-3 levels deep
- Identify data flow paths and dependencies

## Layer 3 — Code Anchor Extraction (Detail)
- Each key finding: extract code snippet (20-50 lines) with file:line
- Annotate WHY this matters for {perspective.name}

## Output
Write to: {sessionFolder}/explorations/{perspective.name}.json
Schema: {perspective, relevant_files[], key_findings[], code_anchors[{file, lines, snippet, significance}], call_chains[{entry, chain, files}], questions_for_user[], _metadata}
"
})
```

### 2.4 CLI Deep Analysis (single-perspective ONLY)

Multi-perspective SKIP — Phase B agents already did Layer 2-3.

For single-perspective: `Bash` with `run_in_background: true`, using Gemini CLI to trace call chains, extract code anchors, identify patterns/anti-patterns from Layer 1 files. Include `PRIOR EXPLORATION` context from exploration-codebase.json. **STOP and wait for callback**.

### 2.5 Aggregate & Write to discussion.md

Consolidate all exploration + CLI + research results. Write directly to discussion.md Round 1:

**Single perspective**: Sources, key findings with evidence (file:line), code anchors, call chains, discussion points, open questions. If research.json exists, merge best_practices/pitfalls into discussion points; cross-reference and flag codebase_gaps.

**Multi-perspective**: Per-perspective summary (brief from explorations/*.json), then synthesis section:
- Convergent themes (all agree)
- Conflicting views (differ)
- Unique contributions (per-perspective)
- External research integration + codebase_gaps

### 2.6 Context Budget Gate

If exploration found > 30 relevant files: rank by relevance per dimension, keep top 30 for Phase 3 cumulative context. Note in discussion.md.

### 2.7 Initial Intent Coverage Check

Check each user intent against Round 1 findings: ✅ covered / 🔄 in-progress / ❌ not yet. Append to discussion.md. Present to user: "初始探索完成后的意图覆盖情况。接下来重点关注未覆盖部分。"

### 2.8 Baseline Confidence Scoring

Score each dimension on 5 weighted factors (each [0.0, 1.0]):

| Factor | Weight | Measures |
|--------|--------|----------|
| findings_depth | 0.30 | Depth of findings (Layer 2-3 vs Layer 1 only) |
| evidence_strength | 0.25 | Code anchors + call chains vs inference |
| coverage_breadth | 0.20 | How much of dimension covered |
| user_validation | 0.15 | User confirmed (starts 0, increases Phase 3) |
| consistency | 0.10 | Findings don't contradict |

Overall = weighted average. Identify weakest dimension. Update state.json, append confidence table to discussion.md.

```
> < 60%: 建议继续深入 | 60-80%: 可选深入或收敛 | > 80%: 建议收敛
```

TodoWrite: phase-2 → completed, phase-3 → in_progress.

---

## Phase 3: Interactive Discussion

Max 5 rounds. Delegate complex tasks to agents (cli-explore-agent) or CLI calls.

### Cumulative Context Rule

Every agent/CLI call MUST include prior findings summary to avoid re-discovery:
```
## KNOWN FINDINGS (DO NOT re-discover)
- Established files: {from exploration-codebase.json}
- Key findings: {from discussion.md rounds}
- Code anchors: {top 5 file:line refs}
- Call chains: {top 3 entry points}
- Open questions: {remaining}
## NEW TASK: Focus ONLY on unexplored areas below.
```

### 3.1 Present Findings & Gather Direction

**Round ≥ 2 preamble**: Recap (1-2 sentences) + confidence delta: "到目前为止确认 [facts]。上一轮 [direction]。Confidence: 52% → 67%，security 仍需深入。"

AskUserQuestion (single-select, header: "分析反馈"):
- **继续深入: {weakest_dim}** (Recommended) — deepen lowest-confidence dimension
- **外部研究** — web research on specific tech/pattern
- **调整方向** — different focus or questions
- **分析完成** — proceed to synthesis (triggers readiness gate)

Question text shows: `Round {N} | Confidence: {N}% | 最弱: {dim} ({N}%)`

### 3.2 Process Response

**Record-Before-Continue Rule**: Write findings to discussion.md BEFORE state update or next round.

**Recording Checkpoint** (all paths): Record user choice + impact. Decision Record if direction changed.

**Technical Solution Triggers**: If triggered → record. **Ambiguity Check**: Proposed solutions with 2+ unresolved alternatives → flag `⚠️ Ambiguity` and surface next round.

#### 继续深入

AskUserQuestion (single-select, header: "深入方向", max 4 total):
- Up to 3 **context-driven** from: unresolved questions, low-confidence findings, unexplored dimensions
- 1 **heuristic**: "换角度审视" (best practices / different perspective / simpler alternatives)
- "Other" auto-provided for custom direction

Execute via cli-explore-agent (code-level) or Gemini CLI (pattern-level) with cumulative context. Merge new code_anchors/call_chains. Write results to discussion.md, THEN update state.

#### 外部研究

AskUserQuestion (header: "研究主题"): suggestions from unresolved tech questions + "自定义" via Other.

Spawn `workflow-research-agent` with topic + codebase context. Merge into research.json (append). Record as Key Findings in discussion.md. Cross-reference: flag new codebase_gaps.

#### 调整方向

AskUserQuestion (header: "新方向", custom via Other). New CLI exploration. Record Decision: old → new direction, reason, impact.

#### 分析完成

Trigger [Pre-Synthesis Readiness Gate](#35-pre-synthesis-readiness-gate). Pass → Phase 4. Blocked → user addresses gaps or accepts risk.

### 3.3 Document Round

Append to Discussion Timeline: User Input, Decision Log, Key Findings, Pressure Pass, Challenge, Technical Solutions, Analysis Results, Corrected Assumptions, Open Items, Confidence Score, Narrative Synthesis.

**Overwrite** `## Current Understanding` with consolidated state (see [Consolidation Rules](#consolidation-rules)). **Update** TOC.

### 3.4 Quality Mechanisms

#### Pressure Pass (mandatory ≥ 1 before Phase 4)

When `pressure_pass_done` is false and round has key findings: select highest-confidence finding, apply pressure ladder:
1. Evidence demand — concrete evidence or counter-example?
2. Assumption probe — hidden assumption? dependency?
3. Boundary/tradeoff — what excluded if accepted?
4. Root cause check — cause or symptom?

Stay on same finding until validated/corrected. Record in discussion.md. Set `pressure_pass_done = true`.

#### Challenge Mode Injection (auto, round ≥ 2, each fires once)

| Mode | Trigger | Challenge |
|------|---------|-----------|
| Devil's Advocate | Any dimension confidence > 0.7 | "如果 [finding] 不成立？" |
| Scope Minimizer | Findings > 5 AND scope expanding | "最小可行结论集？" |
| Root Cause Probe | Causal language in feedback | "根因还是症状？" |

Track in `challenge_modes_used[]`. Record in discussion.md.

#### Stall Detection

No new findings + no corrected assumptions + confidence delta < 5% for 2 consecutive rounds:
- Auto-inject Root Cause Probe (if unused)
- AskUserQuestion (header: "分析停滞"): 换维度 / 外部研究 / 收敛结论
- Reset counter

#### Re-score Confidence

Re-compute all dimensions (user_validation increases as user confirms). Update state.json confidence section. Append score to discussion.md.

### 3.5 Pre-Synthesis Readiness Gate

On "分析完成". Block if ANY:
1. ❌ intents in coverage check
2. Dimension below 40% confidence without deferral
3. Pressure pass never executed
4. Unresolved Technical Solution ambiguities

AskUserQuestion (header: "就绪检查"):
- **补充后完成** (Recommended): continue targeting gaps
- **忽略风险并继续**: record residual risks in state.json + discussion.md

### 3.6 Intent Drift Check (round ≥ 2)

Check each intent: ✅ addressed / 🔄 in-progress / ⚠️ absorbed (needs confirmation) / ❌ not discussed. If ⚠️/❌ → proactively surface: "以下意图尚未充分覆盖：[list]。是否调整？"

TodoWrite: phase-3 → completed, phase-4 → in_progress.

---

## Phase 4: Synthesis & Terminal Gate

### 4.1 Intent Coverage Verification (mandatory gate)

Write to discussion.md:
```markdown
### Intent Coverage Matrix
| # | Original Intent | Status | Where Addressed | Notes |
|---|----------------|--------|-----------------|-------|
| 1 | [text] | ✅ Addressed | Round N, Rec #M | |
| 2 | [text] | 🔀 Transformed | Round N → M | Original → Final |
| 3 | [text] | ❌ Missed | — | Reason |
```
**Gate**: ❌ must be addressed or user-confirmed deferred.

### 4.2 Findings-to-Recommendations Traceability (mandatory gate)

Collect ALL actionable findings. Sources: key findings, technical solutions, identified gaps, corrected assumptions implying fixes.

Map each to disposition:

| Disposition | Meaning |
|-------------|---------|
| recommendation | Converted to numbered recommendation |
| absorbed | Covered by another (specify which) |
| deferred | Out-of-scope with reason |
| informational | No action needed |

**Gate**: No null disposition. Write Findings Coverage Matrix to discussion.md.

**Solution Readiness Gate**: Check each recommendation for unresolved alternatives. Flag `ambiguity_resolved: false` and present to user before Step 4.3.

### 4.3 Write Synthesis to discussion.md

**Synthesis & Conclusions**: Executive summary, key conclusions (ranked by confidence, with code_anchor_refs), recommendations (prioritized: action, rationale, priority, evidence_refs, steps[{description, target, verification}]). Merge validated technical_solutions as high-priority recommendations. Ensure all `disposition = recommendation` findings represented. Open questions, follow-up suggestions.

**Current Understanding (Final)**: What Established / What Clarified / Key Insights.

**Decision Trail**: Critical decisions, direction changes, trade-offs.

**Session Statistics**: rounds, key findings count, dimensions, decision count, final confidence, quality signals.

Update state.json with final confidence and quality signals.

### 4.4 Recommendation Review (skip in auto mode)

Display all recommendations numbered. Batch AskUserQuestion (max 4 per call, priority high→low):

Per recommendation (single-select, header: "建议#N"):
- **确认**: Accept → "accepted"
- **修改**: Adjust → follow up for details → "modified"
- **删除**: Not needed → "rejected"

If > 4 recommendations: batch in groups of 4. Record all to discussion.md. Append Review Summary table.

After review: display summary (Accepted: N | Modified: N | Rejected: N).

### 4.5 Terminal Gate (MANDATORY)

> Workflow INCOMPLETE without this step.

TodoWrite: phase-4 → completed, next-step → in_progress.

AskUserQuestion (single-select, header: "Next Step"):
- **执行任务** (Recommended): "基于分析结论启动 workflow-lite-plan"
- **产出Issue**: "将建议转化为 issue 进行跟踪"
- **完成**: "无需进一步操作"

#### 执行任务

**Step A — Build scope**: Filter accepted/modified recommendations, sort by priority. For each: `{objective, rationale, priority, target_files[], acceptance_criteria[], change_summary}`. Map code_anchors to target_files where relevant.

**Step B — User scope confirmation** (skip in auto mode): Present scope summary. AskUserQuestion (header: "Scope确认"):
- **确认执行**: Proceed
- **调整范围**: Narrow/expand → re-confirm
- **补充标准**: Add/refine acceptance criteria → re-confirm

**Step C — Write handoff.json** (schema aligned with workflow-lite-plan artifact bridge):
```json
{
  "source": "analyze-with-file",
  "session_id": "...",
  "session_folder": "...",
  "summary": "...",
  "implementation_scope": [],
  "code_anchors": [],
  "key_files": [],
  "key_findings": [],
  "decision_context": [],
  "exploration_artifacts": {
    "exploration_codebase": "{sessionFolder}/exploration-codebase.json",
    "explorations": "{sessionFolder}/explorations.json or null",
    "perspectives": "{sessionFolder}/perspectives.json or null",
    "research": "{sessionFolder}/research.json",
    "deep_dives": ["{sessionFolder}/explorations/*.json"]
  }
}
```
> **Field alignment**: `exploration_artifacts` keys MUST match workflow-lite-plan's `artifactMapping` — `exploration_codebase`, `explorations`, `perspectives`, `research` are the 4 mapped keys. `deep_dives[]` is the 5th (iterated separately). If single-perspective mode produced no `explorations.json`/`perspectives.json`, set those to `null`.

**Step D — Append plan checklist** to discussion.md (plan only, no code modified).

**Step E — Invoke Skill**:
```
Skill({ skill: "workflow-lite-plan", args: handoffBlock })
```
Build `handoffBlock` as markdown: `## Prior Analysis ({sessionId})` + JSON handoff spec + summary + implementation scope. If Skill invocation omitted, workflow is BROKEN. After invocation, analyze-with-file is complete.

#### 产出Issue

For each accepted recommendation (priority high/medium): `echo '{issue-json}' | ccw issue create` with `{title, context: action + rationale + evidence, priority: high→2 / else→3, source: "discovery", labels: dimensions}`. Display created issue IDs + hint: `/issue:plan <id>`.

#### 完成

Display artifact paths, end.

TodoWrite: next-step → completed.

---

## discussion.md Structure

```markdown
# Analysis Discussion

**Session**: {id} | **Topic**: {topic} | **Started**: {timestamp}
**Dimensions**: {list} | **Depth**: {level}

## Table of Contents
<!-- Auto-updated each round -->

## Current Understanding
<!-- OVERWRITE (not append) each round. Follow Consolidation Rules. -->
### What We Established
### What Was Clarified
### Key Insights

## Analysis Context
## Initial Questions
## Initial Decisions

---
## Discussion Timeline

### Round 1 - Exploration ({timestamp})
#### Key Findings / Decision Log / Technical Solutions
#### Analysis Results / External Research / Multi-Perspective Synthesis
#### Intent Coverage Check / Confidence Score (Baseline) / Narrative Synthesis

### Round N - [Deepen|Research|Adjust] ({timestamp})
#### User Input / Decision Log / Key Findings
#### Pressure Pass / Challenge
#### Technical Solutions / Analysis Results / Corrected Assumptions / Open Items
#### Confidence Score (Round N) / Intent Coverage Check / Narrative Synthesis

---
## Synthesis & Conclusions
### Intent Coverage Matrix / Findings Coverage Matrix
### Executive Summary / Key Conclusions / Recommendations / Review Summary / Open Questions

## Decision Trail
## Plan Checklist (if 执行任务)
## Session Statistics
```

---

## Reference

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

### Analysis Perspectives

| Perspective | Tool | Focus |
|------------|------|-------|
| Technical | Gemini | Implementation, code patterns, feasibility |
| Architectural | Claude | System design, scalability, interactions |
| Business | Codex | Value, ROI, stakeholder impact |
| Domain Expert | Gemini | Domain patterns, best practices, standards |

Default: dimensions ≥ 2 → Technical + Architectural; dimensions == 1 → single comprehensive.

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

### Consolidation Rules

| Rule | Description |
|------|-------------|
| Promote confirmed insights | Validated findings → "What We Established" |
| Track corrections | Important ~~wrong → right~~ transformations |
| Focus on current state | What we know NOW, not the journey |
| No timeline repetition | Don't copy discussion details |
| Preserve key learnings | Insights valuable for future reference |

### Confidence Scoring

| Factor | Weight |
|--------|--------|
| findings_depth | 0.30 |
| evidence_strength | 0.25 |
| coverage_breadth | 0.20 |
| user_validation | 0.15 |
| consistency | 0.10 |

| Range | Guidance |
|-------|----------|
| < 60% | Recommend continue |
| 60-80% | Optional |
| > 80% | Recommend converge |

---

## Error Handling

| Code | Severity | Situation | Action |
|------|----------|-----------|--------|
| E001 | error | cli-explore-agent fails | Continue with available context, note limitation |
| E002 | error | CLI timeout | Retry shorter prompt, or skip perspective |
| E003 | error | User timeout | Save state, show resume `--continue` |
| E004 | warning | Max rounds (5) reached | Force synthesis, highlight remaining questions |
| E005 | error | No relevant findings | Broaden search, ask user for clarification |
| E006 | warning | Session folder conflict | Append timestamp suffix |
| E007 | error | Gemini unavailable | Fallback to Codex or manual analysis |
| E008 | warning | Research WebSearch failed | Codebase-only, note limitation |
| E009 | warning | Research conflicts with codebase | Flag as codebase_gaps for user review |
| E010 | warning | Analysis stalls (2+ rounds) | Auto-inject challenge, surface to user |
| E011 | warning | Readiness gate blocks | Show gaps, user addresses or accepts risk |

---

**Now execute analyze-with-file for**: $ARGUMENTS
