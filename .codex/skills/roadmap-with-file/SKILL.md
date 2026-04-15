---
name: roadmap-with-file
description: Strategic requirement roadmap with iterative decomposition and issue creation. Outputs roadmap.md (human-readable, single source) + issues.jsonl (machine-executable).
argument-hint: "[-y|--yes] [-c|--continue] [-m progressive|direct|auto] \"requirement description\""
---

## Auto Mode

When `--yes` or `-y`: Auto-confirm strategy selection, use recommended mode, skip interactive refinement rounds. **This skill is planning-only — it NEVER executes code or modifies source files. Output is the roadmap + issues for user review.**

# Roadmap-with-file Skill

## Usage

```bash
$roadmap-with-file "Implement user authentication system with OAuth and 2FA"
$roadmap-with-file -m progressive "Build real-time notification system"
$roadmap-with-file -m direct "Refactor payment module"
$roadmap-with-file -m auto "Add data export feature"
$roadmap-with-file --continue "auth system"
$roadmap-with-file -y "Implement caching layer"
```

**Flags**:
- `-y, --yes`: Skip all confirmations (auto mode)
- `-c, --continue`: Continue existing session
- `-m, --mode`: Strategy selection (progressive / direct / auto)

**Context Source**: cli-explore-agent (optional) + requirement analysis
**Output Directory**: `.workflow/.roadmap/{session-id}/`
**Core Output**: `roadmap.md` (single source, human-readable) + `issues.jsonl` (global, machine-executable)

---

## Subagent API Reference

### spawn_agent
Create a new subagent with task assignment.

```javascript
const agentId = spawn_agent({
  agent_type: "{agent_type}",
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. Read: .workflow/project-tech.json
2. Read: .workflow/project-guidelines.json

## TASK CONTEXT
${taskContext}

## DELIVERABLES
${deliverables}
`
})
```

### wait_agent
Get results from subagent (only way to retrieve results).

```javascript
const result = wait_agent({
  timeout_ms: 600000  // 10 minutes
})

if (result.timed_out) {
  // Handle timeout - can use followup_task to prompt completion
}
```

### followup_task
Assign new work to active subagent (for clarification or follow-up).

```javascript
followup_task({
  target: agentId,
  message: `
## CLARIFICATION ANSWERS
${answers}

## NEXT STEP
Continue with plan generation.
`
})
```

### close_agent
Clean up subagent resources (irreversible).

```javascript
close_agent({ target: agentId })
```

---

## Output Artifacts

### Single Source of Truth

| Artifact | Purpose | Consumer |
|----------|---------|----------|
| `roadmap.md` | ⭐ Human-readable strategic roadmap with all context | Human review, csv-wave-pipeline handoff |
| `.workflow/issues/issues.jsonl` | Global issue store (appended) | csv-wave-pipeline, issue commands |

### Why No Separate JSON Files?

| Original File | Why Removed | Where Content Goes |
|---------------|-------------|-------------------|
| `strategy-assessment.json` | Duplicates roadmap.md content | Embedded in `roadmap.md` Strategy Assessment section |
| `exploration-codebase.json` | Single-use intermediate | Embedded in `roadmap.md` Codebase Context appendix |

---

## Overview

Strategic requirement roadmap with **iterative decomposition**. Creates a single `roadmap.md` that evolves through discussion, with issues persisted to global `issues.jsonl` for execution.

**Core workflow**: Understand → Decompose → Iterate → Validate → Handoff

**Key features**:
- **roadmap.md**: Single source of truth — strategy, roadmap, convergence, iteration history
- **Dual decomposition**: Progressive (MVP→Optimized) or Direct (topological tasks)
- **External research**: Web search for architecture patterns and best practices via `web.run`
- **Issue creation**: Issues persisted to global `issues.jsonl` for execution pipeline
- **Progress tracking**: `functions.update_plan` for real-time phase progress visibility
- **Decision recording**: Structured decision trail with context and rationale
- **Structured handoff**: Terminal gate with execution planning, issue viewing, or completion

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ROADMAP ITERATIVE WORKFLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Session Init                                                            │
│     ├─ Parse flags, generate session ID                                  │
│     ├─ functions.exec_command (mkdir session folder)                      │
│     └─ functions.update_plan (5 phases: Understand → Decompose →         │
│        Refine → Handoff → GATE)                                          │
│                                                                          │
│  Phase 1: Requirement Understanding & Strategy                           │
│     ├─ Parse requirement: goal / constraints / stakeholders              │
│     ├─ Assess uncertainty level → recommend mode                         │
│     ├─ User confirms strategy via functions.request_user_input           │
│     └─ Initialize roadmap.md with Strategy Assessment                    │
│                                                                          │
│  Phase 2: Decomposition & Issue Creation                                 │
│     ├─ Optional codebase exploration (functions.exec_command detection)   │
│     ├─ cli-roadmap-plan-agent executes decomposition                     │
│     ├─ Progressive: 2-4 layers (MVP→Optimized) with convergence          │
│     ├─ Direct: Topological task sequence with convergence                │
│     ├─ Create issues via ccw issue create → issues.jsonl                 │
│     └─ Update roadmap.md with Roadmap table + Issue references           │
│                                                                          │
│  Phase 3: Iterative Refinement (Multi-Round, Decision Recording)         │
│     ├─ Present roadmap to user (Cumulative Context)                      │
│     ├─ Feedback via functions.request_user_input:                        │
│     │   Approve | Adjust Scope | Refine Criteria | Research/Re-decompose │
│     ├─ External research via web.run (optional — patterns, practices)    │
│     ├─ Record decisions in Iteration History (Record-Before-Continue)     │
│     └─ Repeat until approved (max 5 rounds)                              │
│                                                                          │
│  Phase 4: Handoff (PLANNING ENDS HERE)                                   │
│     ├─ Final roadmap.md with Issue ID references                         │
│     └─ MANDATORY Terminal Gate: 执行计划 / 查看Issue / 完成              │
│         ├─ Execute Plan → display csv-wave-pipeline command               │
│         ├─ View Issues → ccw issue list                                  │
│         └─ Done → end workflow                                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Dual Modes

| Mode | Strategy | Best For | Decomposition |
|------|----------|----------|---------------|
| **Progressive** | MVP → Usable → Refined → Optimized | High uncertainty, need validation | 2-4 layers, each with full convergence |
| **Direct** | Topological task sequence | Clear requirements, confirmed tech | Tasks with explicit inputs/outputs |

**Auto-selection logic**:
- ≥3 high uncertainty factors → Progressive
- ≥3 low uncertainty factors → Direct
- Otherwise → Ask user preference

---

## Output Structure

```
.workflow/.roadmap/RMAP-{slug}-{date}/
└── roadmap.md                  # ⭐ Single source of truth
                                #   - Strategy Assessment (embedded)
                                #   - Roadmap Table
                                #   - Convergence Criteria per Issue
                                #   - Codebase Context (appendix, if applicable)
                                #   - Iteration History

.workflow/issues/issues.jsonl   # Global issue store (appended)
                                #   - One JSON object per line
                                #   - Consumed by csv-wave-pipeline, issue commands
```

---

## roadmap.md Template

```markdown
# Requirement Roadmap

**Session**: RMAP-{slug}-{date}
**Requirement**: {requirement}
**Strategy**: {progressive|direct}
**Status**: {Planning|Refining|Ready}
**Created**: {timestamp}

---

## Strategy Assessment

- **Uncertainty Level**: {high|medium|low}
- **Decomposition Mode**: {progressive|direct}
- **Assessment Basis**: {factors summary}
- **Goal**: {extracted goal}
- **Constraints**: {extracted constraints}
- **Stakeholders**: {extracted stakeholders}

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

## Iteration History

### Round 1 - {timestamp}
**User Feedback**: {feedback summary}
**Changes Made**: {adjustments}
**Status**: {approved|continue iteration}

---

## Codebase Context (Optional)

*Included when codebase exploration was performed*

- **Relevant Modules**: [...]
- **Existing Patterns**: [...]
- **Integration Points**: [...]
```

---

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
      "session": "RMAP-{slug}-{date}",
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

---

## Implementation

### Session Initialization

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

// Parse flags
const AUTO_YES = $ARGUMENTS.includes('--yes') || $ARGUMENTS.includes('-y')
const continueMode = $ARGUMENTS.includes('--continue') || $ARGUMENTS.includes('-c')
const modeMatch = $ARGUMENTS.match(/(?:--mode|-m)\s+(progressive|direct|auto)/)
const requestedMode = modeMatch ? modeMatch[1] : 'auto'

// Clean requirement text (remove flags)
const requirement = $ARGUMENTS
  .replace(/--yes|-y|--continue|-c|--mode\s+\w+|-m\s+\w+/g, '')
  .trim()

const slug = requirement.toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
  .substring(0, 40)
const dateStr = getUtc8ISOString().substring(0, 10)
const sessionId = `RMAP-${slug}-${dateStr}`
const sessionFolder = `.workflow/.roadmap/${sessionId}`

// Auto-detect continue mode
if (continueMode || file_exists(`${sessionFolder}/roadmap.md`)) {
  // Resume existing session
  const existingRoadmap = Read(`${sessionFolder}/roadmap.md`)
  // Extract current phase and continue from there
}

functions.exec_command(`mkdir -p ${sessionFolder}`)

// Initialize progress tracking (MANDATORY)
functions.update_plan([
  { id: "phase-1", title: "Phase 1: Requirement Understanding & Strategy", status: "in_progress" },
  { id: "phase-2", title: "Phase 2: Decomposition & Issue Creation", status: "pending" },
  { id: "phase-3", title: "Phase 3: Iterative Refinement", status: "pending" },
  { id: "phase-4", title: "Phase 4: Handoff", status: "pending" },
  { id: "next-step", title: "GATE: Post-Completion Next Step", status: "pending" }
])
```

---

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

   // Calculate recommendation
   const highCount = Object.values(uncertaintyFactors).filter(v => v === 'high').length
   const lowCount = Object.values(uncertaintyFactors).filter(v => v === 'low').length

   let recommendedMode
   if (highCount >= 3) recommendedMode = 'progressive'
   else if (lowCount >= 3) recommendedMode = 'direct'
   else recommendedMode = 'progressive'  // default safer choice
   ```

3. **Strategy Selection** (skip if `-m` specified or AUTO_YES)
   ```javascript
   let selectedMode

   if (requestedMode !== 'auto') {
     selectedMode = requestedMode
   } else if (AUTO_YES) {
     selectedMode = recommendedMode
   } else {
     const answer = functions.request_user_input({
       questions: [{
         header: "Strategy",   // max 12 chars
         question: `Decomposition strategy: Uncertainty=${uncertaintyLevel}, Recommended=${recommendedMode}`,
         multiSelect: false,
         options: [
           { label: recommendedMode === 'progressive' ? "Progressive (Recommended)" : "Progressive", description: "MVP → Usable → Refined → Optimized layers" },
           { label: recommendedMode === 'direct' ? "Direct (Recommended)" : "Direct", description: "Topological task sequence" }
         ]
       }]
     })

     selectedMode = answer // parsed from user selection
   }
   ```

4. **Initialize roadmap.md**
   ```javascript
   const roadmapContent = `# Requirement Roadmap

**Session**: ${sessionId}
**Requirement**: ${requirement}
**Strategy**: ${selectedMode}
**Status**: Planning
**Created**: ${getUtc8ISOString()}

---

## Strategy Assessment

- **Uncertainty Level**: ${uncertaintyLevel}
- **Decomposition Mode**: ${selectedMode}
- **Assessment Basis**: ${factorsSummary}
- **Goal**: ${extractedGoal}
- **Constraints**: ${extractedConstraints}
- **Stakeholders**: ${extractedStakeholders}

---

## Roadmap

> To be populated after Phase 2 decomposition

---

## Convergence Criteria Details

> To be populated after Phase 2 decomposition

---

## Risks

> To be populated after Phase 2 decomposition

---

## Iteration History

> To be populated during Phase 3 refinement

---

## Codebase Context (Optional)

> To be populated if codebase exploration was performed
`

   Write(`${sessionFolder}/roadmap.md`, roadmapContent)
   ```

**Success Criteria**:
- roadmap.md created with Strategy Assessment
- Strategy selected (progressive or direct)
- Uncertainty factors documented

---

### Phase 2: Decomposition & Issue Creation

**Objective**: Execute decomposition via `cli-roadmap-plan-agent`, create issues, update roadmap.md.

**Steps**:

1. **Optional Codebase Exploration** (if codebase detected)
   ```javascript
   // Update progress
   functions.update_plan([{ id: "phase-2", title: "Phase 2: Decomposition & Issue Creation", status: "in_progress" }])

   const hasCodebase = functions.exec_command(`
     test -f package.json && echo "nodejs" ||
     test -f go.mod && echo "golang" ||
     test -f Cargo.toml && echo "rust" ||
     test -f pyproject.toml && echo "python" ||
     test -d src && echo "generic" ||
     echo "none"
   `).trim()

   let codebaseContext = null

   if (hasCodebase !== 'none') {
     const exploreAgentId = spawn_agent({
       agent_type: "cli_explore_agent",
       message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. Read: .workflow/project-tech.json
2. Read: .workflow/project-guidelines.json

---

## Exploration Context
- **Requirement**: ${requirement}
- **Strategy**: ${selectedMode}
- **Project Type**: ${hasCodebase}
- **Session**: ${sessionFolder}

## Exploration Focus
- Identify modules/components related to the requirement
- Find existing patterns that should be followed
- Locate integration points for new functionality
- Assess current architecture constraints

## Output
Return findings as JSON with schema:
{
  "project_type": "${hasCodebase}",
  "relevant_modules": [{name, path, relevance}],
  "existing_patterns": [{pattern, files, description}],
  "integration_points": [{location, description, risk}],
  "architecture_constraints": [string],
  "tech_stack": {languages, frameworks, tools}
}
`
     })

     const exploreResult = wait_agent({
       timeout_ms: 600000
     })

     close_agent({ target: exploreAgentId })

     if (exploreResult.status[exploreAgentId].completed) {
       codebaseContext = exploreResult.status[exploreAgentId].completed
     }
   }
   ```

2. **Execute Decomposition Agent**
   ```javascript
   const decompositionAgentId = spawn_agent({
     agent_type: "cli_roadmap_plan_agent",
     message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. Read: .workflow/project-tech.json
2. Read: .workflow/project-guidelines.json

---

## Roadmap Decomposition Task

### Input Context
- **Requirement**: ${requirement}
- **Selected Mode**: ${selectedMode}
- **Session ID**: ${sessionId}
- **Session Folder**: ${sessionFolder}

### Strategy Assessment
${JSON.stringify(strategyAssessment, null, 2)}

### Codebase Context
${codebaseContext
  ? JSON.stringify(codebaseContext, null, 2)
  : 'No codebase detected - pure requirement decomposition'}

---

### Mode-Specific Requirements

${selectedMode === 'progressive' ? `**Progressive Mode**:
- 2-4 layers from MVP to full implementation
- Each layer: id (L0-L3), name, goal, scope, excludes, convergence, risks, effort, depends_on
- L0 (MVP) must be a self-contained closed loop with no dependencies
- Scope: each feature belongs to exactly ONE layer (no overlap)
- Layer names: MVP / Usable / Refined / Optimized` :

`**Direct Mode**:
- Topologically-sorted task sequence
- Each task: id (T1-Tn), title, type, scope, inputs, outputs, convergence, depends_on, parallel_group
- Inputs must come from preceding task outputs or existing resources
- Tasks in same parallel_group must be truly independent`}

---

### Convergence Quality Requirements
- criteria[]: MUST be testable (can write assertions or manual verification steps)
- verification: MUST be executable (command, script, or explicit steps)
- definition_of_done: MUST use business language (non-technical person can judge)

---

### Expected Output
1. **Update ${sessionFolder}/roadmap.md** with Roadmap table + Convergence sections
2. **Create issues via ccw issue create** - append to .workflow/issues/issues.jsonl

### Issue Format (for ccw issue create)
- id: ISS-YYYYMMDD-NNN (auto-generated)
- title: [LayerName] goal or [TaskType] title
- context: Markdown with goal, scope, convergence criteria, verification, DoD
- priority: small→4, medium→3, large→2
- tags: ["roadmap", mode, wave-N, layer-name]
- extended_context.notes: {session, strategy, wave, depends_on_issues}

### Execution Steps
1. Analyze requirement and build decomposition context
2. Execute decomposition (internal reasoning)
3. Validate records, check convergence quality
4. For each decomposed item:
   - Run: ccw issue create --title "..." --context "..." --tags "..." --priority N
   - Record returned Issue ID
5. Update roadmap.md with Issue ID references
6. Return brief completion summary with Issue IDs
`
   })

   const decompositionResult = wait_agent({
     timeout_ms: 600000  // 10 minutes for complex decomposition
   })

   close_agent({ target: decompositionAgentId })

   if (!decompositionResult.status[decompositionAgentId].completed) {
     throw new Error('Decomposition agent failed to complete')
   }

   const issueIds = decompositionResult.status[decompositionAgentId].completed.issueIds || []
   ```

**Success Criteria**:
- Issues created in `.workflow/issues/issues.jsonl`
- roadmap.md updated with Issue references
- No circular dependencies
- Convergence criteria testable

---

### Phase 3: Iterative Refinement

**Objective**: Multi-round user feedback to refine roadmap.

**Cumulative Context Rule**: Each round's presentation MUST include ALL prior feedback and changes. Never present in isolation — always show cumulative state.

**Decision Recording**: Every user feedback choice and resulting change MUST be recorded in Iteration History with Decision Record format:
```markdown
> **Decision**: [Description]
> - **Context**: [What triggered this]
> - **Options**: [What was considered]
> - **Chosen**: [Selected] — **Reason**: [Why]
> - **Impact**: [What changed in roadmap]
```

**Steps**:

1. **Display Current Roadmap**
   - Read and display Roadmap table + key Convergence criteria
   - Show issue count and wave breakdown

2. **Feedback Loop** (skip if AUTO_YES)
   ```javascript
   // Update progress
   functions.update_plan([{ id: "phase-3", title: "Phase 3: Iterative Refinement", status: "in_progress" }])

   let round = 0
   let approved = false

   while (!approved && round < 5) {
     round++

     // Dynamic options — include research if not yet done
     const baseOptions = [
       { label: "Approve", description: "Proceed to handoff" },
       { label: "Adjust Scope", description: "Modify issue scopes" },
       { label: "Refine Criteria", description: "Improve convergence criteria/verification" }
     ]

     // Add research option if architecture decisions need external validation
     if (!researchDone) {
       baseOptions.push({ label: "Research", description: "Search for architecture patterns and best practices" })
     } else {
       baseOptions.push({ label: "Re-decompose", description: "Change strategy/layering" })
     }

     const feedback = functions.request_user_input({
       questions: [{
         header: "Validate",    // max 12 chars
         question: `Roadmap round ${round}: ${issueIds.length} issues across ${waveCount} waves. Your decision:`,
         multiSelect: false,
         options: baseOptions
       }]
     })

     if (feedback === 'Approve') {
       approved = true
     } else if (feedback === 'Research') {
       // Execute web.run for architecture patterns and best practices
       const researchQueries = generateResearchQueries(requirement, selectedMode)
       researchQueries.forEach(query => {
         const results = web.run({ search_query: query })
         // Extract: architecture patterns, best practices, risk mitigations
       })
       researchDone = true
       // Record research findings in roadmap.md Iteration History
     } else {
       // For Adjust Scope, Refine Criteria, Re-decompose:
       // Collect details via functions.request_user_input or free text
       // CONSTRAINT: All modifications ONLY touch roadmap.md and issues.jsonl
       // NEVER modify source code or project files during interactive rounds

       // Record decision in Iteration History using Decision Record format
     }

     // Update Iteration History in roadmap.md (Record-Before-Continue)
     const iterationEntry = `
### Round ${round} - ${getUtc8ISOString()}
**User Feedback**: ${feedback}
**Changes Made**: ${changesMade}
**Decision**: ${decisionRecord}
**Status**: ${approved ? 'approved' : 'continue iteration'}
`
     // Append to Iteration History section in roadmap.md
   }
   ```

3. **Finalize Iteration History**
   ```javascript
   // Update final status in roadmap.md
   Edit({
     path: `${sessionFolder}/roadmap.md`,
     old_string: "**Status**: Planning",
     new_string: "**Status**: Ready"
   })
   ```

**Success Criteria**:
- User approved OR max rounds reached
- All changes recorded in Iteration History
- roadmap.md reflects final state

---

### Phase 4: Handoff

**Objective**: Present final roadmap, execute MANDATORY terminal gate for next step selection.

**Steps**:

1. **Display Summary**
   ```markdown
   ## Roadmap Complete

   - **Session**: RMAP-{slug}-{date}
   - **Strategy**: {progressive|direct}
   - **Issues Created**: {count} across {waves} waves
   - **Roadmap**: .workflow/.roadmap/RMAP-{slug}-{date}/roadmap.md

   | Wave | Issue Count | Layer/Type |
   |------|-------------|------------|
   | 1 | 2 | MVP / infrastructure |
   | 2 | 3 | Usable / feature |
   ```

2. **MANDATORY Terminal Gate** (CRITICAL — MUST execute, workflow MUST NOT end without this)
   ```javascript
   // Update progress
   functions.update_plan([
     { id: "phase-4", title: "Phase 4: Handoff", status: "completed" },
     { id: "next-step", title: "GATE: Post-Completion Next Step", status: "in_progress" }
   ])

   const nextStep = functions.request_user_input({
     questions: [{
       header: "Next Step",    // max 12 chars
       question: `${issueIds.length} issues ready in roadmap. What would you like to do next?`,
       multiSelect: false,
       options: [
         { label: "Execute Plan", description: "Hand off to execution pipeline (csv-wave-pipeline)" },
         { label: "View Issues", description: "Display issue details before deciding" },
         { label: "Done", description: "Planning complete, all artifacts saved" }
       ]
     }]
   })

   // Handle next step
   if (nextStep === "Execute Plan") {
     // Display execution command for user to run manually
     // "Run: $csv-wave-pipeline '${requirement}'" or "/issue:execute"
     // This skill is planning-only — NEVER auto-launch execution
   } else if (nextStep === "View Issues") {
     functions.exec_command(`ccw issue list --session ${sessionId}`)
     // After viewing, show execution commands
   }
   // "Done" → end workflow

   // Mark terminal gate complete
   functions.update_plan([
     { id: "next-step", title: "GATE: Post-Completion Next Step", status: "completed" }
   ])
   ```

**Success Criteria**:
- User selection executed
- Session complete
- All artifacts accessible

---

## Error Handling

| Error | Resolution |
|-------|------------|
| cli-explore-agent fails | Skip code exploration, proceed with pure requirement decomposition |
| cli-roadmap-plan-agent fails | Retry once, fallback to manual decomposition prompt |
| No codebase | Normal flow, skip exploration step |
| Web research fails | Continue without external findings, rely on inline analysis |
| Research conflicts with plan | Present as competing evidence, let user decide direction |
| Circular dependency detected | Prompt user, re-decompose |
| User timeout in feedback loop | Save roadmap.md, show `--continue` command |
| Max rounds reached | Force proceed with current roadmap |
| Session folder conflict | Append timestamp suffix |

---

## Core Rules

1. **Start Immediately**: First action is session initialization, then Phase 1 execution
2. **Single Source**: All context embedded in roadmap.md, no separate JSON files
3. **Iterate on Roadmap**: Use feedback rounds to refine, not recreate
4. **Testable Convergence**: criteria = assertions, DoD = business language
5. **Explicit Lifecycle**: Always close_agent after wait completes to free resources
6. **Planning-Only Skill**: This skill ONLY produces roadmap and issues. It NEVER executes code, creates source files, or runs implementation. All code changes happen via separate execution skills after user manually triggers them
7. **Plan-Only Modifications**: Interactive feedback (Phase 3) MUST only update `roadmap.md` and `issues.jsonl`. NEVER modify source code, configuration files, or any project files during any phase. Code changes happen only after handoff when user manually runs `$csv-wave-pipeline` or other execution skills
8. **MANDATORY CONFIRMATION GATE**: After Phase 2 decomposition completes, you MUST present the roadmap to the user and wait for confirmation (Phase 3) before proceeding to handoff. NEVER skip Phase 3 user validation

---

## Best Practices

1. **Clear Requirements**: Detailed description → better decomposition
2. **Iterate on Roadmap**: Use feedback rounds to refine convergence criteria
3. **Testable Convergence**: criteria = assertions, DoD = business language
4. **Use Continue Mode**: Resume to iterate on existing roadmap
5. **Wave Execution**: Start with wave-1 (MVP) to validate before full execution

---

## Usage Recommendations

**When to Use Roadmap vs Other Skills:**

| Scenario | Recommended Skill |
|----------|------------------|
| Strategic planning, need issue tracking | `$roadmap-with-file` |
| Quick task breakdown, immediate execution | `$lite-plan` |
| Collaborative multi-agent planning | `$collaborative-plan-with-file` |
| Full specification documents | `$spec-generator` |
| Code implementation from existing plan | `$workflow-lite-plan` |

---

**Now plan roadmap for**: $ARGUMENTS
