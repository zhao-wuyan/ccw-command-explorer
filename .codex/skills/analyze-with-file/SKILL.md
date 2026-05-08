---
name: analyze-with-file
description: Interactive collaborative analysis with documented discussions, inline exploration, and evolving understanding.
argument-hint: "TOPIC=\"<question or topic>\" [--depth=quick|standard|deep] [--continue]"
---

# Analyze-With-File

Interactive collaborative analysis with documented discussion process. Records understanding evolution, facilitates multi-round Q&A, and uses inline search + external research for deep exploration.

**Core flow**: Topic → Explore → Discuss → Refine → Conclude → Next Step

**Auto mode** (`-y`): Auto-confirm exploration decisions, use recommended angles, skip interactive scoping.

## Configuration

| Flag | Default | Description |
|------|---------|-------------|
| `-y, --yes` | false | Auto-confirm all decisions |
| `--continue` | false | Continue existing session |
| `--depth` | standard | quick / standard / deep |

**Session ID**: `ANL-{YYYY-MM-DD}-{slug}`
- slug: `topic.toLowerCase()` → keep `[a-z0-9\u4e00-\u9fa5]`, replace rest with `-`, max 40 chars
- date: YYYY-MM-DD in UTC+8
- Auto-detect continue: session folder + discussion.md exists → continue mode

## Artifacts

```
{projectRoot}/.workflow/.analysis/ANL-{date}-{slug}/
├── discussion.md              # Single source of truth: rounds, decisions, conclusions, synthesis
├── state.json                 # Session state: config, confidence, quality tracking
├── exploration-codebase.json  # Codebase exploration: files, patterns, constraints
├── research.json              # External research: best practices, pitfalls, sources
└── handoff.json               # Structured handoff (only on "执行任务")
```

| File | When Created | Purpose |
|------|-------------|---------|
| `discussion.md` | Phase 1 | All analysis content: session metadata, round-by-round findings, multi-perspective synthesis, decisions, intent coverage, conclusions, recommendations. **Overwritten** sections: `## Current Understanding`. **Appended** sections: `## Discussion Timeline`. |
| `state.json` | Phase 0 | Machine-readable: current round, dimension scores, confidence history, quality tracking (pressure pass, challenge modes, stall counter), exploration metadata. Updated every round. |
| `exploration-codebase.json` | Phase 2 | Codebase context: `project_type`, `relevant_files[{path, relevance, summary, dimensions[]}]`, `patterns[{pattern, files, description}]`, `constraints[]`, `integration_points[{location, description}]`, `key_findings[]`, `_metadata{timestamp, exploration_scope}` |
| `research.json` | Phase 2 | External research: `findings[{finding, detail, confidence, source_url}]`, `best_practices[{practice, rationale, source}]`, `alternatives[{option, pros, cons, verdict}]`, `pitfalls[{issue, mitigation, source}]`, `codebase_gaps[{gap, current_approach, recommended_approach}]`, `sources[{title, url, key_takeaway}]` |
| `handoff.json` | Phase 4 | Only on "执行任务": `source`, `session_id`, `session_folder`, `summary`, `implementation_scope[{objective, rationale, priority, target_files[], acceptance_criteria[], change_summary}]`, `code_anchors[]`, `key_files[]`, `key_findings[]`, `decision_context[]`, `exploration_artifacts{exploration_codebase, research}` — keys align with workflow-lite-plan artifactMapping |

---

## Analysis Flow

```
Phase 0: Session Setup
   ├─ Parse topic, flags, generate session ID
   ├─ Detect project root (git rev-parse --show-toplevel || pwd)
   ├─ Create session folder (or detect existing → continue)
   ├─ Initialize state.json + discussion.md
   └─ functions.update_plan([phase-1..phase-4, next-step])

Phase 1: Topic Understanding
   ├─ Identify analysis dimensions from topic keywords
   ├─ Scope with user: focus, perspectives (1-4), depth
   ├─ Generate initial questions from dimensions
   └─ Write initial sections to discussion.md

Phase 2: Exploration
   ├─ Load project specs (ccw spec load)
   ├─ Codebase search → exploration-codebase.json
   ├─ External research via web.run → research.json
   ├─ Multi-perspective analysis → write to discussion.md
   ├─ Context budget gate (>30 files → rank + trim)
   ├─ Initial intent coverage check
   └─ Baseline confidence scoring → state.json

Phase 3: Interactive Discussion (max 5 rounds)
   ├─ Present findings + confidence + weakest dimension
   ├─ User direction: Deepen / Research / Adjust / Complete
   ├─ Cumulative context: always include prior findings
   ├─ Record-before-continue: write to discussion.md BEFORE state update
   ├─ Quality mechanisms:
   │   ├─ Pressure pass (mandatory ≥1 before Phase 4)
   │   ├─ Challenge injection (auto, round ≥2)
   │   ├─ Stall detection (2 consecutive no-progress rounds)
   │   └─ Re-score confidence → state.json
   ├─ Pre-synthesis readiness gate (on "Complete")
   ├─ Intent drift check (round ≥2)
   └─ Update discussion.md: append round + overwrite Current Understanding

Phase 4: Synthesis & Terminal Gate
   ├─ Intent Coverage Verification (mandatory gate)
   ├─ Findings → Recommendations Traceability (mandatory gate)
   ├─ Write synthesis + conclusions to discussion.md
   ├─ Recommendation review with user
   └─ Terminal gate: 执行任务 → handoff.json | 产出Issue | 完成
```

---

## Phase 0: Session Setup

1. Parse `{{ARGUMENTS}}` for topic, flags (`--depth`, `--continue`, `-y`)
2. Detect project root: `git rev-parse --show-toplevel 2>/dev/null || pwd`
3. Generate session ID: `ANL-{date}-{slug}`, session folder: `{projectRoot}/.workflow/.analysis/{sessionId}`
4. If session folder + discussion.md exists → auto-enter continue mode (load state.json, resume from last round)
5. Create session folder: `mkdir -p {sessionFolder}`
6. Initialize `state.json`:

```json
{
  "session_id": "ANL-{date}-{slug}",
  "topic": "...",
  "depth": "standard",
  "dimensions": [],
  "perspectives": [],
  "focus_areas": [],
  "current_round": 0,
  "current_phase": "setup",
  "confidence": {
    "dimensions": {},
    "overall": 0,
    "weakest": null,
    "history": []
  },
  "quality": {
    "pressure_pass_done": false,
    "challenge_modes_used": [],
    "stall_counter": 0,
    "last_findings_count": 0,
    "readiness_gate_passed": false,
    "residual_risks": []
  }
}
```

7. Initialize progress tracking:

```
functions.update_plan([
  { id: "phase-1", title: "Phase 1: Topic Understanding", status: "in_progress" },
  { id: "phase-2", title: "Phase 2: Exploration & Research", status: "pending" },
  { id: "phase-3", title: "Phase 3: Interactive Discussion", status: "pending" },
  { id: "phase-4", title: "Phase 4: Synthesis & Conclusion", status: "pending" },
  { id: "next-step", title: "GATE: Post-Completion Next Step", status: "pending" }
])
```

---

## Phase 1: Topic Understanding

### 1.1 Identify Dimensions

Match topic keywords against [Analysis Dimensions](#analysis-dimensions). If multiple match, include all. If none match, default to "architecture" + "implementation".

### 1.2 Initial Scoping (new session, not auto mode)

Single `functions.request_user_input` call with up to 3 questions (constraint: 1-4 questions, 2-4 options each):

**Question 1 — Focus areas** (multiSelect: true):
- Generate options dynamically from matched dimensions using [Dimension-Direction Mapping](#dimension-direction-mapping), max 4 options

**Question 2 — Perspectives** (multiSelect: true):
- Technical: Implementation patterns, code structure, feasibility
- Architectural: System design, scalability, interactions
- Security: Security patterns, vulnerabilities, access control
- Performance: Bottlenecks, optimization, resource utilization

Max 4 perspectives. Single perspective is default.

**Question 3 — Depth** (multiSelect: false):
- Standard (Recommended): Balanced analysis with good coverage
- Quick Overview: Fast surface-level understanding
- Deep Dive: Comprehensive multi-round investigation

### 1.3 Initialize discussion.md

Write the full initial template (see [discussion.md Structure](#discussionmd-structure)):
- Header: session ID, topic, timestamp (UTC+8), dimensions, depth
- Table of Contents (auto-updated each round)
- Current Understanding: "To be populated after exploration"
- Analysis Context: focus areas, perspectives, depth
- Initial Questions: generated from topic + dimensions (key questions that the analysis should answer)
- Initial Decisions: record WHY these dimensions/focus areas were selected, what was excluded and why
- Discussion Timeline: empty, rounds appended later
- Decision Trail: empty, populated in Phase 4

Update state.json with dimensions, perspectives, focus_areas, depth. Mark phase-1 completed, phase-2 in_progress.

---

## Phase 2: Exploration

All exploration done inline — no agent delegation.

### 2.1 Codebase Detection & Spec Loading

Detect project type:
- `package.json` → nodejs | `go.mod` → golang | `Cargo.toml` → rust | `pyproject.toml` → python | `pom.xml` → java | `src/` exists → generic | else → none

If codebase detected, load project metadata:
- `functions.exec_command('ccw spec load --category exploration')`
- `functions.exec_command('ccw spec load --category debug')`
- Read `.workflow/specs/*.md` for project conventions

### 2.2 Codebase Search

Search using: **Grep**, **Glob**, **Read**, **mcp__ace-tool__search_context**

Focus on: modules/components relevant to topic, code patterns/structure, integration points, config/dependencies.

Write findings to `exploration-codebase.json` with full schema:
- `project_type`: detected type
- `relevant_files[]`: `{path, relevance, summary, dimensions[]}`
- `patterns[]`: `{pattern, files, description}`
- `constraints[]`: architectural constraints found
- `integration_points[]`: `{location, description}`
- `key_findings[]`: main insights from code search
- `_metadata`: `{timestamp, exploration_scope}`

### 2.3 External Research

**Trigger condition**: dimensions include `architecture|comparison|decision|performance|security`, OR topic matches `best practice|pattern|vs|compare|approach|standard|library|framework`.

Skip for purely internal codebase questions (e.g., "how does module X work").

Execute up to 3 `web.run` queries:
- `{topic} best practices {year}`
- `{topic} common pitfalls and known issues`
- Per matching dimension: `{topic} {dimension} patterns and recommendations`

Write findings to `research.json` with full schema:
- `findings[]`: `{finding, detail, confidence, source_url}`
- `best_practices[]`: `{practice, rationale, source}`
- `alternatives[]`: `{option, pros, cons, verdict}`
- `pitfalls[]`: `{issue, mitigation, source}`
- `codebase_gaps[]`: `{gap, current_approach, recommended_approach}`
- `sources[]`: `{title, url, key_takeaway}`
- `_metadata`: `{queries_executed, timestamp}`

Cross-reference: flag where codebase patterns diverge from research best practices as `codebase_gaps`.

### 2.4 Multi-Perspective Analysis

**Single perspective** (default): Comprehensive analysis across all dimensions using exploration + research context. Write findings directly to discussion.md Round 1.

**Multi-perspective** (2-4 perspectives, serial): Analyze each perspective sequentially. For each perspective, write a summary subsection in discussion.md Round 1. Then append a synthesis subsection:
- **Convergent themes**: what all perspectives agree on
- **Conflicting views**: where perspectives differ
- **Unique contributions**: insights unique to specific perspectives

### 2.5 Context Budget Gate

If exploration found > 30 relevant files in `exploration-codebase.json`:
- Rank by relevance score, keep top 30 per dimension
- Update `exploration-codebase.json` with trimmed list + `_budget{original_count, summarized_count}`
- Note in discussion.md: "探索发现 N 个相关文件，已精简至 30 个高相关文件"

### 2.6 Write Round 1 to discussion.md

Append to Discussion Timeline using [Round Template](#round-template):
- Sources analyzed, key findings with evidence refs (file:line)
- External research findings, best practices, codebase gaps
- Multi-perspective synthesis (if applicable)
- Discussion points and open questions
- Decision Log: why certain search strategies/perspectives were chosen

### 2.7 Initial Intent Coverage Check

Extract original user intents from discussion.md header. Check each against Round 1 findings:
- ✅ covered
- 🔄 in-progress
- ❌ not yet discussed

Append to discussion.md: "接下来的讨论将重点关注未覆盖 (❌) 和进行中 (🔄) 的意图。"

### 2.8 Baseline Confidence Scoring

Score each dimension on 5 weighted factors (each [0.0, 1.0]):

| Factor | Weight | Measures |
|--------|--------|----------|
| findings_depth | 0.30 | How deep the findings go |
| evidence_strength | 0.25 | Hard evidence vs inference |
| coverage_breadth | 0.20 | How much of the dimension is covered |
| user_validation | 0.15 | User confirmed findings (starts at 0, increases in Phase 3) |
| consistency | 0.10 | Findings don't contradict |

Overall confidence = weighted average across dimensions. Identify weakest dimension.

Update state.json `confidence` section. Append confidence table to discussion.md:

```markdown
#### Confidence Score (Baseline)
| Dimension | Depth | Evidence | Coverage | Validation | Consistency | **Score** |
|-----------|-------|----------|----------|------------|-------------|-----------|
| {dim}     | {x}   | {x}     | {x}      | 0.00       | {x}         | **{x}**   |

Overall: {N}% | Weakest: {dim} ({N}%)
> < 60%: 建议继续深入 | 60-80%: 可选深入或收敛 | > 80%: 建议收敛到结论
```

**Phase 2 exit criteria**: exploration-codebase.json created (if codebase), research.json created (if topic warrants), discussion.md updated with Round 1, initial intent coverage check done, baseline confidence computed.

Mark phase-2 completed, phase-3 in_progress.

---

## Phase 3: Interactive Discussion

Max 5 rounds. Each round follows this sequence.

### Cumulative Context Rule

Every analysis action in Phase 3 MUST include a summary of ALL prior findings to avoid re-discovering known information:

```
## KNOWN FINDINGS (DO NOT re-discover)
- Established files: {list from exploration-codebase.json}
- Key findings: {from discussion.md rounds}
- Open questions: {remaining}
## NEW TASK: Focus ONLY on unexplored areas below.
```

### 3.1 Present Findings & Gather Direction

**Round ≥ 2 preamble**: 1-2 sentence recap of established consensus + last round's direction + confidence delta. Example: "到目前为止，我们已确认 [facts]。上一轮 [direction]。Confidence 从 52% 提升到 67%，security 维度仍需深入。"

Read latest confidence from state.json. Identify weakest dimension.

Present via `functions.request_user_input` (single question, multiSelect: false, 4 options):
- **继续深入: {weakest_dimension} (Recommended)** — deepen the lowest-confidence dimension
- **外部研究** — web.run for specific technology/pattern
- **调整方向** — different focus or specific questions
- **分析完成** — proceed to synthesis (triggers readiness gate)

Question header shows: `Round {N} | Confidence: {N}% | 最弱: {dim} ({N}%)`

### 3.2 Process Response

**Record-Before-Continue Rule**: Each path below MUST write findings and discussion synthesis to discussion.md BEFORE proceeding to state update or next round.

**Recording Checkpoint** (all paths): Record user's original choice, impact on direction, and full Decision Record if direction changed.

**Technical Solution Triggers**: When an implementation approach is described with specific files/patterns, 2+ alternatives compared, or user confirms/rejects an approach → record using [Technical Solution format](#record-formats).

**Ambiguity Check**: For each Technical Solution with Status "Proposed", verify no unresolved alternatives remain. If 2+ options without a chosen one → flag:
```markdown
> **⚠️ Ambiguity**: [Solution] has [N] unresolved alternatives: [list]
> - **Needs**: [Decision criteria or exploration to resolve]
```
Surface to user in next feedback round.

#### 继续深入

Ask sub-question via `functions.request_user_input` (multiSelect: false, max 4 total):
- Up to 3 **context-driven** options generated from: unresolved questions, low-confidence findings, unexplored dimensions
- 1 **heuristic** option: "换角度审视" — compare with best practices / different perspective / simpler alternatives
- "Other" auto-provided for user-specified custom direction

Execute inline search using Grep/Glob/Read/mcp__ace-tool__search_context. Merge new findings with prior context. Record confirmed assumptions and exploration angles.

#### 外部研究

Ask research topic via `functions.request_user_input` (max 4 options):
- Up to 3 suggestions from: unresolved tech questions, unvalidated patterns
- 1 custom option: "自定义" (via Other)

Execute `web.run({search_query: "{topic} best practices {year}"})`. Merge findings into research.json (append, don't overwrite). Record as Key Findings in discussion.md. Cross-reference with codebase; flag new `codebase_gaps`.

#### 调整方向

Ask new focus. Analyze from adjusted perspective. Compare new insights with prior analysis. Record as Decision: trigger, old→new direction, expected impact.

#### 分析完成

Trigger [Pre-Synthesis Readiness Gate](#35-pre-synthesis-readiness-gate). If passed → exit to Phase 4. If blocked → user chooses to address gaps or accept risk (residual risks recorded in state.json + discussion.md).

Record why concluding at this round.

### 3.3 Document Round

Append to Discussion Timeline using [Round Template](#round-template): User Input, Decision Log, Key Findings, Technical Solutions, Analysis Results, Corrected Assumptions, Open Items, Confidence Score, Narrative Synthesis.

**Overwrite** (not append) `## Current Understanding` with latest consolidated state following [Consolidation Rules](#consolidation-rules).

**Update** `## Table of Contents` with new Round N links.

### 3.4 Quality Mechanisms

Execute after documenting each round.

#### Pressure Pass (mandatory, at least once before Phase 4)

When `quality.pressure_pass_done` is false and current round has key findings:

Select the highest-confidence finding and apply the **pressure ladder** in sequence:
1. **Evidence demand**: "What concrete evidence supports this? Is there a counter-example?"
2. **Assumption probe**: "What hidden assumption makes this true? What dependency does this rest on?"
3. **Boundary/tradeoff**: "If we accept this, what must we give up or explicitly exclude?"
4. **Root cause check**: "Is this the root cause, or a symptom of something deeper?"

Stay on the same finding until validated or corrected — don't rotate for coverage. A finding that survives is promoted to high-confidence; one that doesn't is flagged.

Record in discussion.md:
```markdown
#### Pressure Pass (Round N)
> **Target**: [finding]
> - **Confidence claimed**: [level] | **Evidence**: [assessment]
> - **Hidden assumption**: [identified]
> - **Boundary impact**: [tradeoff or scope consequence]
> - **Verdict**: [Confirmed with evidence / Weakened — needs more data / Corrected]
```

Set `quality.pressure_pass_done = true` in state.json.

#### Challenge Mode Injection (automatic, round ≥ 2)

Each mode fires at most once per session. Track in `quality.challenge_modes_used[]`.

| Mode | Trigger | Challenge |
|------|---------|-----------|
| **Devil's Advocate** | Round 2+ AND any dimension confidence > 0.7 | "如果 [finding] 不成立，分析结论会如何改变？有什么证据可能推翻它？" |
| **Scope Minimizer** | Key findings count > 5 AND scope expanding (new dimensions added) | "哪些发现可以合并？最小可行结论集是什么？是否在分析不必要的方面？" |
| **Root Cause Probe** | User feedback contains causal language ("因为", "导致", "由于") | "这是根因还是症状？上游还有什么因素在起作用？" |

Record in discussion.md:
```markdown
#### Challenge: {Mode}
> **Target**: [finding or observation]
> **Counter-scenario / Question**: [challenge content]
> **Result**: [survived / weakened / corrected]
```

#### Stall Detection

After each round, assess: new findings? corrected assumptions? confidence delta > 5%?

If NONE of these for 2 consecutive rounds (`quality.stall_counter >= 2`):
- Auto-inject Root Cause Probe (if unused)
- Surface to user via `functions.request_user_input` (3 options):
  - **换维度 (Recommended)**: switch to weakest or unexplored dimension
  - **外部研究**: break deadlock with external best practices
  - **收敛结论**: current findings sufficient, proceed to synthesis
- Reset stall counter

#### Re-score Confidence

Re-compute all dimension scores. `user_validation` factor increases as user confirms findings across rounds.

Update state.json: `confidence.dimensions`, `confidence.overall`, `confidence.weakest`, append to `confidence.history[{round, overall, dimensions}]`.

Append to discussion.md:
```markdown
#### Confidence Score (Round N)
Overall: {N}% ({+/-N}%) | Weakest: {dim} ({N}%)
```

### 3.5 Pre-Synthesis Readiness Gate

Triggered when user selects "分析完成". Block exit if ANY:
1. ❌ intents exist in latest coverage check
2. Any dimension below 40% confidence without explicit deferral
3. `quality.pressure_pass_done` is false
4. Unresolved Technical Solution ambiguities (Proposed status with 2+ alternatives)

If gaps found → present via `functions.request_user_input` (2 options):
- **补充后完成 (Recommended)**: Continue Phase 3 targeting gaps
- **忽略风险并继续**: Record residual risks in state.json `quality.residual_risks[]` + discussion.md, proceed to Phase 4

### 3.6 Intent Drift Check (round ≥ 2)

Re-read original intents from discussion.md header. Compare with Phase 2 baseline:
- ✅ addressed in Round N
- 🔄 in-progress, current focus
- ⚠️ implicitly absorbed by X — needs explicit confirmation (absorbed ≠ addressed)
- ❌ not yet discussed

If ⚠️ or ❌ exist → proactively surface: "以下原始意图尚未充分覆盖：[list]。是否需要调整优先级？"

**Phase 3 exit criteria**: Pressure pass completed ≥1, confidence scored each round, readiness gate passed (or risk accepted), challenge modes fired when triggers met, stall detection intervened if needed, discussion.md fully updated.

Mark phase-3 completed, phase-4 in_progress.

---

## Phase 4: Synthesis & Terminal Gate

### 4.1 Intent Coverage Verification (mandatory gate)

Write Intent Coverage Matrix to discussion.md:

```markdown
### Intent Coverage Matrix
| # | Original Intent | Status | Where Addressed | Notes |
|---|----------------|--------|-----------------|-------|
| 1 | [text] | ✅ Addressed | Round N, Rec #M | |
| 2 | [text] | 🔀 Transformed | Round N → M | Original: X → Final: Y |
| 3 | [text] | ⚠️ Absorbed | Round N | Covered by Rec #M |
| 4 | [text] | ❌ Missed | — | Reason |
```

**Gate**: ❌ items MUST be (a) addressed in an additional round, or (b) explicitly deferred by user confirmation.

### 4.2 Findings-to-Recommendations Traceability (mandatory gate)

Collect ALL actionable findings from every round. Sources: key findings with actionable implications, technical solutions (proposed/validated), identified gaps, corrected assumptions that imply fixes.

Map each to a disposition:

| Disposition | Meaning |
|-------------|---------|
| recommendation | Converted to numbered recommendation |
| absorbed | Covered by another recommendation (specify which) |
| deferred | Out-of-scope with reason |
| informational | Pure insight, no action needed |

**Gate**: ALL findings must have a disposition. No null allowed.

Write to discussion.md:
```markdown
### Findings Coverage Matrix
| # | Finding (Round) | Disposition | Target |
|---|----------------|-------------|--------|
| 1 | [finding] (R1) | recommendation | Rec #1 |
| 2 | [finding] (R2) | absorbed | → Rec #1 |
| 3 | [finding] (R3) | deferred | Low priority, future work |
| 4 | [finding] (R1) | informational | — |
```

### 4.3 Write Synthesis to discussion.md

Append the following sections:

**Synthesis & Conclusions**:
- Executive summary
- Key conclusions: `{point, evidence, confidence: high|medium|low}`
- Recommendations (prioritized, high→low): each with `action` (imperative verb + target), `rationale`, `priority`, `evidence_refs` (file:line), `steps[{description, target, verification}]`
- Open questions
- Follow-up suggestions: `{type: issue|task|research, summary}`

**Current Understanding (Final)** — overwrite with:
- What We Established: confirmed points, validated findings
- What Was Clarified: important ~~wrong → right~~ corrections
- Key Insights: valuable learnings for future reference

**Decision Trail**:
- Critical decisions that shaped the outcome
- Direction changes with rationale timeline
- Trade-offs made and why

**Session Statistics**: total rounds, key findings count, dimensions covered, artifacts generated, decision count, final confidence score, quality signals summary (pressure pass, challenge modes used, stall events).

Update state.json with final confidence and quality signals.

### 4.4 Recommendation Review (skip in auto mode)

Batch via `functions.request_user_input` — max 4 questions per call, ordered by priority high→medium→low:

Per recommendation, 3 options:
- **确认 (Recommended)**: Accept as-is → status "accepted"
- **修改**: Adjust scope/steps → follow up for details → status "modified"
- **删除**: Not needed → status "rejected"

Record all review decisions to discussion.md + state.json.

Append Review Summary:
```markdown
### Recommendation Review Summary
| # | Action | Priority | Steps | Status | Notes |
|---|--------|----------|-------|--------|-------|
| 1 | [action] | high | 3 | ✅ Accepted | |
| 2 | [action] | medium | 2 | ✏️ Modified | [notes] |
| 3 | [action] | low | 1 | ❌ Rejected | [reason] |
```

### 4.5 Terminal Gate (MANDATORY)

> Workflow is INCOMPLETE without this step.

Mark phase-4 completed, next-step in_progress.

`functions.request_user_input` (3 options):
- **执行任务 (Recommended)**: Build implementation scope, hand off to planning
- **产出Issue**: Convert recommendations to tracked issues
- **完成**: Display artifact paths, end

#### 执行任务

**Step A — Build scope**: Filter recommendations where status is "accepted" or "modified". Sort by priority. For each: `{objective, rationale, priority, target_files[], acceptance_criteria[], change_summary}`.

**Step B — User scope confirmation** (skip in auto mode): Present scope summary, then `functions.request_user_input` (3 options):
- **确认执行 (Recommended)**: Proceed to handoff
- **调整范围**: Narrow or expand scope → re-confirm
- **补充标准**: Add/refine acceptance criteria → re-confirm

**Step C — Write handoff.json** (schema aligned with workflow-lite-plan artifact bridge):
```json
{
  "source": "analyze-with-file",
  "session_id": "...",
  "session_folder": "...",
  "summary": "...",
  "implementation_scope": [
    { "objective": "...", "rationale": "...", "priority": "high|medium|low",
      "target_files": [], "acceptance_criteria": [], "change_summary": "..." }
  ],
  "code_anchors": [],
  "key_files": [],
  "key_findings": [],
  "decision_context": [],
  "exploration_artifacts": {
    "exploration_codebase": "{sessionFolder}/exploration-codebase.json",
    "research": "{sessionFolder}/research.json"
  }
}
```
> Codex version has no separate explorations.json/perspectives.json (all in discussion.md). Only `exploration_codebase` and `research` are file-backed artifacts.

**Step D — Append plan checklist** to discussion.md:
```markdown
## Plan Checklist
> **This is a plan only — no code was modified.**
- **Recommendations**: {count}
- **Generated**: {timestamp}

### 1. {objective}
- **Priority**: {level}
- **Rationale**: {reason}
- **Target files**: {list or TBD}
- **Acceptance criteria**: {list}
- [ ] Ready for execution
```

#### 产出Issue

For each accepted recommendation, `ccw issue create` with:
- `title`: recommendation action
- `context`: action + rationale + evidence refs
- `priority`: high→2, medium/low→3
- `source`: "discovery"
- `labels`: analysis dimensions

Display created issue IDs with next step hint.

#### 完成

Display artifact paths, end.

Mark next-step completed. **No source code modified throughout.**

---

## Recording Protocol

### Trigger Rules

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

### Record Formats

**Decision**:
```markdown
> **Decision**: [description]
> - **Context**: [trigger]
> - **Options considered**: [alternatives]
> - **Chosen**: [approach] — **Reason**: [rationale]
> - **Rejected**: [why others discarded]
> - **Impact**: [effect on direction/conclusions]
```

**Finding**:
```markdown
> **Finding**: [content]
> - **Confidence**: [High/Medium/Low] — **Why**: [evidence basis]
> - **Hypothesis Impact**: [Confirms/Refutes/Modifies] hypothesis "[name]"
> - **Scope**: [affected areas]
```

**Technical Solution** (record when: implementation approach with specific files/patterns, 2+ alternatives compared, user confirms/modifies/rejects, concrete code change strategy emerges):
```markdown
> **Solution**: [approach/pattern/implementation]
> - **Status**: [Proposed / Validated / Rejected]
> - **Problem**: [what it solves]
> - **Rationale**: [why this approach]
> - **Alternatives**: [other options, why not chosen]
> - **Evidence**: [file:line refs]
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

### Principles

- **Immediacy**: Record as decisions happen, not at end of phase
- **Completeness**: Context, options, chosen, reason, rejected, impact
- **Traceability**: Later phases can trace back any decision
- **Depth**: Capture reasoning and hypothesis impact, not just outcomes

---

## discussion.md Structure

```markdown
# Analysis Discussion

**Session**: {id} | **Topic**: {topic} | **Started**: {timestamp}
**Dimensions**: {list} | **Depth**: {level}

## Table of Contents
<!-- Auto-updated after each round/phase -->

## Current Understanding
<!-- OVERWRITE (not append) after each round. Follow Consolidation Rules. -->
### What We Established
### What Was Clarified
### Key Insights

## Analysis Context
- Focus areas: {list}
- Perspectives: {list}
- Depth: {level}

## Initial Questions
- {generated from topic + dimensions}

## Initial Decisions
> Record WHY these dimensions/focus areas were selected, what was excluded and why.

---
## Discussion Timeline

### Round 1 - Exploration ({timestamp})
#### Key Findings
#### Decision Log
#### Technical Solutions
#### Analysis Results
#### External Research
#### Multi-Perspective Synthesis
#### Intent Coverage Check
#### Confidence Score (Baseline)
#### Narrative Synthesis

### Round N - [Deepen|Research|Adjust] ({timestamp})
#### User Input
#### Decision Log
#### Key Findings
#### Pressure Pass
#### Challenge
#### Technical Solutions
#### Analysis Results
#### Corrected Assumptions
#### Open Items
#### Confidence Score (Round N)
#### Intent Coverage Check
#### Narrative Synthesis

---
## Synthesis & Conclusions
### Intent Coverage Matrix
### Findings Coverage Matrix
### Executive Summary
### Key Conclusions
### Recommendations
### Recommendation Review Summary
### Open Questions

## Decision Trail

## Plan Checklist (if 执行任务)

## Session Statistics
```

### Consolidation Rules

When overwriting `## Current Understanding`:

| Rule | Description |
|------|-------------|
| Promote confirmed insights | Move validated findings to "What We Established" |
| Track corrections | Keep important ~~wrong → right~~ transformations |
| Focus on current state | What we know NOW, not the journey |
| No timeline repetition | Don't copy discussion details into consolidated section |
| Preserve key learnings | Keep insights valuable for future reference |

Bad: "In round 1 we discussed X, then in round 2 user said Y..."
Good: Structured subsections (Established / Clarified / Key Insights) with current-state facts only.

---

## Reference

### Analysis Dimensions

| Dimension | Keywords |
|-----------|----------|
| architecture | 架构, architecture, design, structure, 设计, pattern |
| implementation | 实现, implement, code, coding, 代码, logic |
| performance | 性能, performance, optimize, bottleneck, 优化, speed |
| security | 安全, security, auth, permission, 权限, vulnerability |
| concept | 概念, concept, theory, principle, 原理, understand |
| comparison | 比较, compare, vs, difference, 区别, versus |
| decision | 决策, decision, choice, tradeoff, 选择, trade-off |

### Analysis Perspectives

| Perspective | Focus | Best For |
|------------|-------|----------|
| Technical | Implementation patterns, code structure, feasibility | How and technical details |
| Architectural | System design, scalability, component interactions | Structure and organization |
| Security | Security patterns, vulnerabilities, access control | Security risks |
| Performance | Bottlenecks, optimization, resource utilization | Performance issues |

### Depth Levels

| Depth | Scope |
|-------|-------|
| Quick | Surface level, minimal exploration |
| Standard | Balanced analysis with good coverage (default) |
| Deep | Comprehensive multi-round investigation |

### Dimension-Direction Mapping

Dynamic focus options generated from matched dimensions:

| Dimension | Possible Directions |
|-----------|-------------------|
| architecture | System Design, Component Interactions, Technology Choices, Integration Points, Design Patterns, Scalability Strategy |
| implementation | Code Structure, Implementation Details, Code Patterns, Error Handling, Testing Approach, Algorithm Analysis |
| performance | Performance Bottlenecks, Optimization Opportunities, Resource Utilization, Caching Strategy, Concurrency Issues |
| security | Security Vulnerabilities, Authentication/Authorization, Access Control, Data Protection, Input Validation |
| concept | Conceptual Foundation, Core Mechanisms, Fundamental Patterns, Theory & Principles, Trade-offs & Reasoning |
| comparison | Solution Comparison, Pros & Cons Analysis, Technology Evaluation, Approach Differences |
| decision | Decision Criteria, Trade-off Analysis, Risk Assessment, Impact Analysis, Implementation Implications |

Present 2-3 top directions per matched dimension, allow multi-select and custom directions.

---

## Error Handling

| Situation | Action | Recovery |
|-----------|--------|----------|
| No codebase detected | Pure topic analysis | Skip codebase search |
| Codebase search fails | Continue with available context | Note limitation in discussion.md |
| No relevant findings | Broaden keywords | Ask user for clarification |
| User timeout | Save state | Resume with `--continue` |
| Max rounds reached (5) | Force synthesis | Highlight remaining questions |
| Session folder conflict | Append timestamp suffix | Create unique folder |
| No recommendations generated | No plan to generate | Inform user, suggest alternative |
| Web research fails | Codebase-only analysis | Note limitation, flag as codebase_gaps |
| Research conflicts with codebase | Flag as codebase_gaps | Surface divergence for user review |
| Analysis stalls (2+ rounds) | Auto-inject challenge | User: switch dimension / research / converge |
| Readiness gate blocks exit | Show gap summary | User addresses gaps or accepts risk |
| Context budget exceeded | Rank + trim to top 30 | Note in discussion.md |

---

## When to Use

**Use this skill when**: complex topic exploration, multi-round understanding refinement, decision-making with multiple perspectives, building shared understanding before implementation, need documented analysis trail with external research.

**Consider alternatives**:
- Bug diagnosis → `debug-with-file`
- Idea generation → `brainstorm-with-file`
- Ready to implement → `lite-plan`

---

**Now execute the analyze-with-file workflow for topic**: $TOPIC
