---
name: roadmap-with-file
description: Strategic requirement roadmap with iterative decomposition and issue creation. Outputs roadmap.md (human-readable, single source) + issues.jsonl (machine-executable). Handoff to team-planex.
argument-hint: "[-y|--yes] [-c|--continue] [-m progressive|direct|auto] \"requirement description\""
allowed-tools: TodoWrite(*), Agent(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-confirm strategy selection, use recommended mode, skip interactive rounds.

# Workflow Roadmap Command (/workflow:roadmap-with-file)

## Quick Start

```bash
# Basic usage
/workflow:roadmap-with-file "Implement user authentication system with OAuth and 2FA"

# With mode selection
/workflow:roadmap-with-file -m progressive "Build real-time notification system"   # MVP→iterations
/workflow:roadmap-with-file -m direct "Refactor payment module"                   # Topological sequence
/workflow:roadmap-with-file -m auto "Add data export feature"                     # Auto-select

# Continue existing session
/workflow:roadmap-with-file --continue "auth system"

# Auto mode
/workflow:roadmap-with-file -y "Implement caching layer"
```

**Context Source**: cli-explore-agent (optional) + requirement analysis
**Output Directory**: `.workflow/.roadmap/{session-id}/`
**Core Output**: `roadmap.md` (single source, human-readable) + `issues.jsonl` (global, machine-executable)

## Output Artifacts

### Single Source of Truth

| Artifact | Purpose | Consumer |
|----------|---------|----------|
| `roadmap.md` | ⭐ Human-readable strategic roadmap with all context | Human review, team-planex handoff |
| `.workflow/issues/issues.jsonl` | Global issue store (appended) | team-planex, issue commands |

### Why No Separate JSON Files?

| Original File | Why Removed | Where Content Goes |
|---------------|-------------|-------------------|
| `strategy-assessment.json` | Duplicates roadmap.md content | Embedded in `roadmap.md` Strategy Assessment section |
| `exploration-codebase.json` | Single-use intermediate | Embedded in `roadmap.md` Codebase Context appendix |

## Overview

Strategic requirement roadmap with **iterative decomposition**. Creates a single `roadmap.md` that evolves through discussion, with issues persisted to global `issues.jsonl` for execution.

**Core workflow**: Understand → Decompose → Iterate → Validate → Handoff

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ROADMAP ITERATIVE WORKFLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Phase 1: Requirement Understanding & Strategy                           │
│     ├─ Parse requirement: goal / constraints / stakeholders              │
│     ├─ Assess uncertainty level → recommend mode                         │
│     ├─ User confirms strategy (-m skips, -y auto-selects)                │
│     └─ Initialize roadmap.md with Strategy Assessment                    │
│                                                                          │
│  Phase 2: Decomposition & Issue Creation                                 │
│     ├─ cli-roadmap-plan-agent executes decomposition                     │
│     ├─ Progressive: 2-4 layers (MVP→Optimized) with convergence          │
│     ├─ Direct: Topological task sequence with convergence                │
│     ├─ Create issues via ccw issue create → issues.jsonl                 │
│     └─ Update roadmap.md with Roadmap table + Issue references           │
│                                                                          │
│  Phase 3: Iterative Refinement (Multi-Round)                             │
│     ├─ Present roadmap to user                                           │
│     ├─ Feedback: Approve | Adjust Scope | Modify Convergence | Replan    │
│     ├─ Update roadmap.md with each round                                 │
│     └─ Repeat until approved (max 5 rounds)                              │
│                                                                          │
│  Phase 4: Handoff                                                        │
│     ├─ Final roadmap.md with Issue ID references                         │
│     ├─ Options: team-planex | first wave | view issues | done            │
│     └─ Issues ready in .workflow/issues/issues.jsonl                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Dual Modes

| Mode | Strategy | Best For | Decomposition |
|------|----------|----------|---------------|
| **Progressive** | MVP → Usable → Refined → Optimized | High uncertainty, need validation | 2-4 layers, each with full convergence |
| **Direct** | Topological task sequence | Clear requirements, confirmed tech | Tasks with explicit inputs/outputs |

**Auto-selection logic**:
- ≥3 high uncertainty factors → Progressive
- ≥3 low uncertainty factors → Direct
- Otherwise → Ask user preference

## Output Structure

```
.workflow/.roadmap/RMAP-{date}-{slug}/
└── roadmap.md                  # ⭐ Single source of truth
                                #   - Strategy Assessment (embedded)
                                #   - Roadmap Table
                                #   - Convergence Criteria per Issue
                                #   - Codebase Context (appendix, if applicable)
                                #   - Iteration History

.workflow/issues/issues.jsonl   # Global issue store (appended)
                                #   - One JSON object per line
                                #   - Consumed by team-planex, issue commands
```

## roadmap.md Template

```markdown
# Requirement Roadmap

**Session**: RMAP-{date}-{slug}
**Requirement**: {requirement}
**Strategy**: {progressive|direct}
**Status**: {Planning|Refining|Ready}
**Created**: {timestamp}

---

## Original Goal
- {parsed goal from requirement — e.g., "implement OAuth + 2FA auth system"}
- {key constraints — e.g., "must support existing user base", "deadline: Q3"}
- {success criteria — e.g., "all auth flows pass E2E tests, <200ms latency"}

---

## Strategy Assessment

- **Uncertainty Level**: {high|medium|low}
- **Decomposition Mode**: {progressive|direct}
- **Assessment Basis**: {factors summary}
- **Goal**: {extracted goal}
- **Constraints**: {extracted constraints}
- **Stakeholders**: {extracted stakeholders}

---

## Current Understanding
> To be populated after decomposition. (Replaced each round — NOT appended)

---

## Roadmap

### Progressive Mode
| Wave | Issue ID | Layer | Goal | Priority | Dependencies |
|------|----------|-------|------|----------|--------------|
| 1 | ISS-xxx | MVP | ... | 2 | - |
| 2 | ISS-yyy | Usable | ... | 3 | ISS-xxx |

### Direct Mode
| Wave | Issue ID | Title | Type | Dependencies |
|------|----------|-------|------|--------------|
| 1 | ISS-xxx | ... | infrastructure | - |
| 2 | ISS-yyy | ... | feature | ISS-xxx |

---

## Convergence Criteria

### ISS-xxx: {Issue Title}
- **Criteria**: [testable conditions]
- **Verification**: [executable steps/commands]
- **Definition of Done**: [business language, non-technical]

### ISS-yyy: {Issue Title}
...

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| ... | ... | ... |

---

## Goal Coverage
> Tracks which original goal aspects are addressed by issues. Updated after decomposition + each round.

| # | Original Goal Aspect | Status | Addressed By | Notes |
|---|---------------------|--------|--------------|-------|
| 1 | {goal aspect} | ✅ Covered | ISS-xxx | |
| 2 | {constraint} | 🔄 Partially | ISS-yyy | Depends on execution |
| 3 | {success criteria} | ❌ Not addressed | — | Needs additional issue |

---

## Iteration History

### Round 1 - {timestamp}

**User Feedback**: {feedback summary}
**Changes Made**: {adjustments}
**Status**: {approved|continue iteration}

> **Decision**: {scope/convergence/strategy change}
> - **Context**: User feedback: {trigger}
> - **Options considered**: {alternatives}
> - **Chosen**: {approach} — **Reason**: {rationale}
> - **Impact**: {effect on roadmap}

**Narrative Synthesis**:
**起点**: 基于 {initial decomposition / prior round outcome}，本轮从 {user feedback point} 切入。
**关键进展**: {changes made} {confirmed/refuted/modified} 了关于 {assumption} 的理解。
**决策影响**: {scope adjustment / convergence refinement / re-decomposition} 导致 {impact on issue set}。
**当前理解**: 经过本轮，路线图 {更清晰/需继续迭代/基本稳定}，核心认知更新为 {updated understanding}。

---

## Codebase Context (Optional)

*Included when codebase exploration was performed*

- **Relevant Modules**: [...]
- **Existing Patterns**: [...]
- **Integration Points**: [...]
```

## Issues JSONL Specification

### Location & Format

```
Path: .workflow/issues/issues.jsonl
Format: JSONL (one complete JSON object per line)
Encoding: UTF-8
Mode: Append-only (new issues appended to end)
```

### Record Schema

```json
{
  "id": "ISS-YYYYMMDD-NNN",
  "title": "[LayerName] goal or [TaskType] title",
  "status": "pending",
  "priority": 2,
  "context": "Markdown with goal, scope, convergence, verification, DoD",
  "source": "text",
  "tags": ["roadmap", "progressive|direct", "wave-N", "layer-name"],
  "extended_context": {
    "notes": {
      "session": "RMAP-{date}-{slug}",
      "strategy": "progressive|direct",
      "wave": 1,
      "depends_on_issues": []
    }
  },
  "lifecycle_requirements": {
    "test_strategy": "unit",
    "regression_scope": "affected",
    "acceptance_type": "automated",
    "commit_strategy": "per-issue"
  }
}
```

### Query Interface

```bash
# By ID (detail view)
ccw issue list ISS-20260227-001

# List all with status filter
ccw issue list --status planned,queued
ccw issue list --brief  # JSON minimal output

# Queue operations (wave-based execution)
ccw issue queue list              # List all queues
ccw issue queue dag               # Get dependency graph (JSON)
ccw issue next --queue <queue-id> # Get next task

# Execute
ccw issue queue add <issue-id>    # Add to active queue
ccw issue done <item-id>          # Mark completed
```

> **Note**: Issues are tagged with `wave-N` in `tags[]` field for filtering. Use `--brief` for programmatic parsing.

### Consumers

| Consumer | Usage |
|----------|-------|
| `team-planex` | Load by ID or tag, execute in wave order |
| `issue-manage` | CRUD operations on issues |
| `issue:execute` | DAG-based parallel execution |
| `issue:queue` | Form execution queue from solutions |

## Implementation

### Session Initialization

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

// Parse flags
const autoYes = $ARGUMENTS.includes('--yes') || $ARGUMENTS.includes('-y')
const continueMode = $ARGUMENTS.includes('--continue') || $ARGUMENTS.includes('-c')
const modeMatch = $ARGUMENTS.match(/(?:--mode|-m)\s+(progressive|direct|auto)/)
const requestedMode = modeMatch ? modeMatch[1] : 'auto'

// Clean requirement text
const requirement = $ARGUMENTS
  .replace(/--yes|-y|--continue|-c|--mode\s+\w+|-m\s+\w+/g, '')
  .trim()

const slug = requirement.toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
  .substring(0, 40)
const dateStr = getUtc8ISOString().substring(0, 10)
const sessionId = `RMAP-${dateStr}-${slug}`
const sessionFolder = `.workflow/.roadmap/${sessionId}`

// Auto-detect continue
if (continueMode || file_exists(`${sessionFolder}/roadmap.md`)) {
  // Resume existing session
}
Bash(`mkdir -p ${sessionFolder}`)
```

### Decision Recording Protocol

**CRITICAL**: Record immediately when any of these occur:

| Trigger | What to Record | Format |
|---------|---------------|--------|
| **Strategy selection** | Progressive vs direct, uncertainty basis | Decision Record |
| **Scope adjustment** | Old → new scope, user feedback trigger | Decision Record |
| **Convergence refinement** | Criteria change, verification update | Decision Record |
| **Re-decomposition** | Old → new strategy/layering, trigger | Decision Record |
| **Assumption correction** | Old assumption → new understanding | Assumption Record |

**Decision Record Format**:
```markdown
> **Decision**: [Description]
> - **Context**: [Trigger]
> - **Options considered**: [Alternatives]
> - **Chosen**: [Approach] — **Reason**: [Rationale]
> - **Impact**: [Effect on roadmap]
```

**Assumption Record Format**:
```markdown
> **Corrected Assumption**: ~~[old]~~ → [new]
> - **Discovered**: Round {N}
> - **Evidence**: [user feedback, codebase finding]
> - **Impact**: [what changed in roadmap]
```

### Phase 1: Requirement Understanding & Strategy

**Objective**: Parse requirement, assess uncertainty, select decomposition strategy, initialize roadmap.md.

**Steps**:

1. **Parse Requirement**
   - Extract: goal, constraints, stakeholders, keywords

2. **Assess Uncertainty**
   ```javascript
   const uncertaintyFactors = {
     scope_clarity: 'low|medium|high',
     technical_risk: 'low|medium|high',
     dependency_unknown: 'low|medium|high',
     domain_familiarity: 'low|medium|high',
     requirement_stability: 'low|medium|high'
   }
   // ≥3 high → progressive, ≥3 low → direct, else → ask
   ```

3. **Strategy Selection** (skip if `-m` specified or autoYes)
   ```javascript
   AskUserQuestion({
     questions: [{
       question: `Decomposition strategy:\nUncertainty: ${uncertaintyLevel}\nRecommended: ${recommendedMode}`,
       header: "Strategy",
       multiSelect: false,
       options: [
         { label: recommendedMode === 'progressive' ? "Progressive (Recommended)" : "Progressive",
           description: "MVP→iterations, validate core first" },
         { label: recommendedMode === 'direct' ? "Direct (Recommended)" : "Direct",
           description: "Topological task sequence, clear dependencies" }
       ]
     }]
   })
   ```

4. **Initialize roadmap.md** with Strategy Assessment section + Original Goal

5. **Record Strategy Decision** (append to roadmap.md Strategy Assessment):
   ```markdown
   > **Decision**: Decomposition strategy — {progressive|direct}
   > - **Context**: Uncertainty assessment: {N} high factors, {N} low factors
   > - **Options considered**: progressive (MVP→iterations) / direct (topological)
   > - **Chosen**: {strategy} — **Reason**: {rationale}
   > - **Impact**: {decomposition approach, expected wave count}
   ```

**Success Criteria**:
- roadmap.md created with Strategy Assessment + Original Goal
- Strategy selected and Decision Recorded
- Uncertainty factors documented

### Phase 2: Decomposition & Issue Creation

**Objective**: Execute decomposition via `cli-roadmap-plan-agent`, create issues, update roadmap.md.

**Agent**: `cli-roadmap-plan-agent`

**Agent Tasks**:
1. Analyze requirement with strategy context
2. Execute CLI-assisted decomposition (Gemini → Claude fallback)
3. Create issues via `ccw issue create`
4. Generate roadmap table with Issue ID references
5. Update roadmap.md

**Agent Prompt Template**:
```javascript
Agent({
  subagent_type: "cli-roadmap-plan-agent",
  run_in_background: false,
  description: `Roadmap decomposition: ${slug}`,
  prompt: `
## Roadmap Decomposition Agent

### Input Context
- **Requirement**: ${requirement}
- **Strategy**: ${selectedMode}
- **Session**: ${sessionId}
- **Folder**: ${sessionFolder}

### Mode-Specific Requirements

${selectedMode === 'progressive' ? `**Progressive Mode**:
- 2-4 layers: MVP / Usable / Refined / Optimized
- Each layer: goal, scope, excludes, convergence, risks, effort
- L0 (MVP) must be self-contained, no dependencies
- Scope: each feature in exactly ONE layer (no overlap)` :

`**Direct Mode**:
- Topologically-sorted task sequence
- Each task: title, type, scope, inputs, outputs, convergence, depends_on
- Inputs from preceding outputs or existing resources
- parallel_group for truly independent tasks`}

### Convergence Quality Requirements
- criteria[]: MUST be testable
- verification: MUST be executable
- definition_of_done: MUST use business language

### Output
1. **${sessionFolder}/roadmap.md** - Update with Roadmap table + Convergence sections
2. **Append to .workflow/issues/issues.jsonl** via ccw issue create

### CLI Configuration
- Primary: gemini, Fallback: claude, Timeout: 60000ms
`
})
```

**Post-Decomposition Updates**:

1. **Initial Goal Coverage Check** — populate `## Goal Coverage` in roadmap.md:
   ```markdown
   ## Goal Coverage (Post-Decomposition)
   | # | Original Goal Aspect | Status | Addressed By | Notes |
   |---|---------------------|--------|--------------|-------|
   | 1 | {goal aspect} | ✅ Covered | ISS-xxx, ISS-yyy | |
   | 2 | {constraint} | 🔄 Partially | ISS-zzz | Depends on execution |
   | 3 | {success criteria} | ❌ Not addressed | — | Needs additional issue |
   ```
   If ❌ items exist → surface to user before Phase 3.

2. **Update Current Understanding** — replace `## Current Understanding` block:
   ```markdown
   ## Current Understanding (Post-Decomposition)

   ### Roadmap Shape
   - **Issues**: {N} across {waves} waves
   - **Strategy**: {progressive|direct} — {rationale}
   - **Critical Path**: {wave 1 issues that gate everything}

   ### Key Assumptions
   - {assumption_1}: {basis}
   - {assumption_2}: {basis}

   ### Risk Assessment
   - **Primary Risk**: {risk and mitigation}
   ```

**Success Criteria**:
- Issues created in `.workflow/issues/issues.jsonl`
- roadmap.md updated with Issue references
- Goal Coverage check completed
- No circular dependencies
- Convergence criteria testable

### Phase 3: Iterative Refinement

**Objective**: Multi-round user feedback to refine roadmap.

**Workflow Steps**:

1. **Present Roadmap**
   - Display Roadmap table + key Convergence criteria
   - Show issue count and wave breakdown

2. **Gather Feedback** (skip if autoYes)
   ```javascript
   const feedback = AskUserQuestion({
     questions: [{
       question: `Roadmap validation (round ${round}):\n${issueCount} issues across ${waveCount} waves. Feedback?`,
       header: "Feedback",
       multiSelect: false,
       options: [
         { label: "Approve", description: "Proceed to handoff" },
         { label: "Adjust Scope", description: "Modify issue scopes" },
         { label: "Modify Convergence", description: "Refine criteria/verification" },
         { label: "Re-decompose", description: "Change strategy/layering" }
       ]
     }]
   })
   ```

3. **Process Feedback**
   - **Approve**: Exit loop, proceed to Phase 4
   - **Adjust Scope**: Modify issue context, update roadmap.md
   - **Modify Convergence**: Refine criteria/verification, update roadmap.md
   - **Re-decompose**: Return to Phase 2 with new strategy

4. **Update roadmap.md**
   - Append to Iteration History section (with Decision Record + Narrative Synthesis)
   - Update Roadmap table if changed
   - Increment round counter

5. **Update Current Understanding** (replace block each round):
   ```markdown
   ## Current Understanding (Updated: Round {N})

   ### Roadmap Shape
   - **Issues**: {N} across {waves} waves ({delta from last round})
   - **Stability**: {stable/evolving/volatile} — {N} rounds of changes
   - **Critical Path**: {updated critical path}

   ### Validated Assumptions
   - {assumption confirmed by user feedback}

   ### Corrected Assumptions
   - ~~{old}~~ → {new} (Round {N})

   ### Remaining Uncertainty
   - {what still needs validation}
   ```

6. **Goal Drift Check** (round ≥ 2):
   ```markdown
   #### Goal Drift Check (Round {N})
   - ✅ {goal aspect 1}: Still addressed by ISS-xxx
   - 🔀 {goal aspect 2}: Transformed — original scope changed from {X} to {Y}
   - ⚠️ {goal aspect 3}: Drifted — refinement focused on {tangent}, original goal underserved
   - ❌ {goal aspect 4}: Lost coverage after scope adjustment
   ```
   If ⚠️ or ❌ items → log Assumption Record and surface to user.

7. **Loop** (max 5 rounds, then force proceed)

**Success Criteria**:
- User approved OR max rounds reached
- All changes recorded in Iteration History with Decision Records
- Goal Coverage updated each round
- roadmap.md reflects final state

### Phase 4: Handoff

**Objective**: Present final roadmap, offer execution options.

**Steps**:

1. **Finalize roadmap.md** — append to end of roadmap.md:

   ```markdown
   ## Final Goal Coverage Matrix
   | # | Original Goal Aspect | Status | Addressed By | Notes |
   |---|---------------------|--------|--------------|-------|
   | 1 | {goal} | ✅ Covered | ISS-xxx, ISS-yyy | |
   | 2 | {constraint} | 🔀 Transformed | ISS-zzz | Original: X → Final: Y |
   | 3 | {success criteria} | ❌ Missed | — | Reason |

   ## Decision Trail
   | Phase/Round | Decision | Outcome |
   |-------------|----------|---------|
   | Phase 1 | {strategy selection} | {progressive/direct}, {N} waves |
   | Phase 2 | {decomposition approach} | {N} issues created |
   | Round 1 | {user feedback response} | {scope/convergence adjustment} |
   | Round N | {final adjustment} | Approved |
   ```

2. **Update Current Understanding (Final)** — replace `## Current Understanding` block:
   ```markdown
   ## Current Understanding (Final)

   ### What We Established
   - {confirmed roadmap structure and wave dependencies}

   ### What Was Corrected
   - ~~{old assumption}~~ → {corrected understanding} (Round {N})

   ### Roadmap Health
   - **Issues**: {N} across {waves} waves
   - **Refinement Rounds**: {N}
   - **Confidence**: {high/medium/low} — {rationale}
   ```

3. **Display Summary**
   ```markdown
   ## Roadmap Complete

   - **Session**: RMAP-{date}-{slug}
   - **Strategy**: {progressive|direct}
   - **Issues Created**: {count} across {waves} waves
   - **Refinement Rounds**: {N}
   - **Roadmap**: .workflow/.roadmap/RMAP-{date}-{slug}/roadmap.md

   | Wave | Issue Count | Layer/Type |
   |------|-------------|------------|
   | 1 | 2 | MVP / infrastructure |
   | 2 | 3 | Usable / feature |
   ```

2. **Offer Options** (skip if autoYes)
   ```javascript
   AskUserQuestion({
     questions: [{
       question: `${issueIds.length} issues ready. Next step:`,
       header: "Next Step",
       multiSelect: false,
       options: [
         { label: "Execute with team-planex (Recommended)",
           description: `Run all ${issueIds.length} issues via team-planex` },
         { label: "Execute first wave",
           description: "Run wave-1 issues only" },
         { label: "View issues",
           description: "Display issue details from issues.jsonl" },
         { label: "Done",
           description: "Save and exit, execute later" }
       ]
     }]
   })
   ```

3. **Execute Selection**
   | Selection | Action |
   |-----------|--------|
   | Execute with team-planex | `Skill(skill="team-planex", args="${issueIds.join(' ')}")` |
   | Execute first wave | Filter by `wave-1` tag, pass to team-planex |
   | View issues | Display from `.workflow/issues/issues.jsonl` |
   | Done | Output paths, end |

## Configuration

| Flag | Default | Description |
|------|---------|-------------|
| `-y, --yes` | false | Auto-confirm all decisions |
| `-c, --continue` | false | Continue existing session |
| `-m, --mode` | auto | Strategy: progressive / direct / auto |

**Session ID format**: `RMAP-{YYYY-MM-DD}-{slug}`

## Error Handling

| Error | Resolution |
|-------|------------|
| cli-roadmap-plan-agent fails | Retry once, fallback to manual decomposition |
| No codebase | Skip exploration, pure requirement decomposition |
| Circular dependency detected | Prompt user, re-decompose |
| User feedback timeout | Save roadmap.md, show `--continue` command |
| Max rounds reached | Force proceed with current roadmap |
| Session folder conflict | Append timestamp suffix |

## Best Practices

1. **Clear Requirements**: Detailed description → better decomposition
2. **Iterate on Roadmap**: Use feedback rounds to refine convergence criteria
3. **Testable Convergence**: criteria = assertions, DoD = business language
4. **Use Continue Mode**: Resume to iterate on existing roadmap
5. **Wave Execution**: Start with wave-1 (MVP) to validate before full execution

## Usage Recommendations

**When to Use Roadmap vs Other Commands:**

| Scenario | Recommended Command |
|----------|-------------------|
| Strategic planning, need issue tracking | `/workflow:roadmap-with-file` |
| Quick task breakdown, immediate execution | `/workflow-lite-plan` |
| Collaborative multi-agent planning | `/workflow:collaborative-plan-with-file` |
| Full specification documents | `spec-generator` skill |
| Code implementation from existing plan | `/workflow-lite-plan` (Phase 1: plan → Phase 2: execute) |

---

**Now execute roadmap-with-file for**: $ARGUMENTS
