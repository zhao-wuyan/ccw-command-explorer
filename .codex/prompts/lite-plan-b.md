---
description: Lightweight interactive planning workflow with hybrid mode - multi-agent parallel exploration + primary agent merge/clarify/plan. Supports agent count and iteration control.
argument-hint: "TASK=\"<task description or file.md path>\" [--num-agents=<n>] [--max-iterations=<n>] [--angles=role1,role2,...]"
---

# Workflow Lite-Plan-B (Hybrid Mode)

## Overview

Hybrid mode for complex planning tasks. Multiple agents explore in parallel from different angles, then the primary agent merges findings, handles clarification, and generates the implementation plan while retaining its exploration context.

**Core capabilities:**
- **Parallel multi-angle exploration** via multiple subagents
- **Primary agent reuse** for merge, clarification, and planning (context preserved)
- Intelligent deduplication and conflict resolution during merge
- Best for High complexity tasks requiring cross-module analysis

## Applicable Scenarios

- **High complexity tasks**
- Multi-angle parallel exploration required
- Cross-module or architecture-level changes
- Complex dependencies requiring multiple perspectives

## Core Advantages

| Metric | Traditional Separated Mode | Plan-B Hybrid Mode |
|--------|---------------------------|-------------------|
| Agent creation count | N + 1 (fully independent) | **N → 1** (reuse primary agent) |
| Context transfer | Full serialization | **Primary agent retained + incremental merge** |
| Merge quality | Simple concatenation | **Intelligent agent merge** |
| Planning coherence | Low (new agent) | **High (reuses exploration agent)** |

## Task Description

**Target task**: $TASK

- `--num-agents`: Number of parallel agents (default: 4)
- `--max-iterations`: Max iteration rounds
- `--angles`: Exploration angles (role1,role2,...)

## Execution Process

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: Parallel Exploration                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │Agent 0  │ │Agent 1  │ │Agent 2  │ │Agent 3  │               │
│  │(primary)│ │(explore)│ │(explore)│ │(explore)│               │
│  │angle-0  │ │angle-1  │ │angle-2  │ │angle-3  │               │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘               │
│       │           │           │           │                     │
│       └───────────┴───────────┴───────────┘                     │
│                       ↓                                         │
│              wait({ ids: all })                                 │
│                       ↓                                         │
├─────────────────────────────────────────────────────────────────┤
│  Phase 2: Merge + Clarify                                       │
│       ↓                                                         │
│  close(Agent 1, 2, 3) ← close non-primary agents                │
│       ↓                                                         │
│  send_input(Agent 0, {                                          │
│    other_explorations: [Agent 1,2,3 results],                   │
│    task: "MERGE + CLARIFY"                                      │
│  })                                                             │
│       ↓                                                         │
│  wait() → get merged results + clarification questions          │
│       ↓                                                         │
│  [Collect user answers]                                         │
│       ↓                                                         │
├─────────────────────────────────────────────────────────────────┤
│  Phase 3: Planning                                              │
│       ↓                                                         │
│  send_input(Agent 0, {                                          │
│    clarification_answers: [...],                                │
│    task: "GENERATE PLAN"                                        │
│  })                                                             │
│       ↓                                                         │
│  wait() → get plan.json                                         │
│       ↓                                                         │
│  close(Agent 0)                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation

### Session Setup

**Session Setup** (MANDATORY - follow exactly):
```javascript
// Helper: Get UTC+8 (China Standard Time) ISO string
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

const taskSlug = "$TASK".toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40)
const dateStr = getUtc8ISOString().substring(0, 10)  // Format: 2025-11-29

const sessionId = `${taskSlug}-${dateStr}`  // e.g., "implement-jwt-refresh-2025-11-29"
const sessionFolder = `.workflow/.lite-plan/${sessionId}`

// Create session folder
mkdir -p ${sessionFolder}
```

### Complexity Assessment & Multi-Angle Selection

```javascript
const complexity = analyzeTaskComplexity("$TASK")
// Plan-B is suitable for High complexity

const ANGLE_PRESETS = {
  architecture: ['architecture', 'dependencies', 'modularity', 'integration-points'],
  security: ['security', 'auth-patterns', 'dataflow', 'validation'],
  performance: ['performance', 'bottlenecks', 'caching', 'data-access'],
  bugfix: ['error-handling', 'dataflow', 'state-management', 'edge-cases'],
  feature: ['patterns', 'integration-points', 'testing', 'dependencies']
}

// Plan-B selects 3-4 angles for parallel exploration
const selectedAngles = selectAngles("$TASK", 4)  // e.g., ['architecture', 'patterns', 'testing', 'dependencies']
```

---

### Phase 1: Parallel Exploration (Primary Agent Has Planning Capability)

```javascript
// ==================== PLAN-B: HYBRID MODE ====================

// Step 1: Create parallel exploration agents (role files read by agents themselves)
// First agent is primary, has merge + planning capability
const explorationAgents = selectedAngles.map((angle, index) => {
  const isPrimary = index === 0

  return spawn_agent({
    message: `
## TASK ASSIGNMENT (Phase 1: Exploration)

### Task Description
${task_description}

### Your Exploration Angle
**Angle**: ${angle}
**Index**: ${index + 1} of ${selectedAngles.length}
**Output File**: ${sessionFolder}/exploration-${angle}.json
${isPrimary ? '\n**Note**: You are the PRIMARY agent. After Phase 1, you will receive other agents\' results for merging and planning.' : ''}

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read explorer role**: ~/.codex/agents/cli-explore-agent.md (MUST read first)
${isPrimary ? '2. **Read planner role**: ~/.codex/agents/cli-lite-planning-agent.md (for Phase 2 & 3)\n3.' : '2.'} Run: ccw tool exec get_modules_by_depth '{}'
${isPrimary ? '4.' : '3.'} Run: rg -l "{keyword}" --type ts
${isPrimary ? '5.' : '4.'} Read: .workflow/project-tech.json
${isPrimary ? '6.' : '5.'} Read: .workflow/project-guidelines.json

### Exploration Focus: ${angle}

**Structural Analysis**:
- Identify modules and files related to ${angle}
- Map imports/exports and dependencies
- Locate entry points and integration surfaces

**Semantic Analysis**:
- How does existing code handle ${angle} concerns?
- What patterns are established for ${angle}?
- Where would new code integrate from ${angle} viewpoint?

### Output Format

Write to ${sessionFolder}/exploration-${angle}.json:
\`\`\`json
{
  "angle": "${angle}",
  "project_structure": [...],
  "relevant_files": [
    {"path": "src/file.ts", "relevance": 0.9, "rationale": "..."}
  ],
  "patterns": [...],
  "dependencies": [...],
  "integration_points": [
    {"location": "file:line", "description": "..."}
  ],
  "constraints": [...],
  "clarification_needs": [
    {"question": "...", "options": ["A", "B"], "recommended": 0, "context": "..."}
  ],
  "_metadata": {
    "exploration_angle": "${angle}",
    "exploration_index": ${index + 1},
    "timestamp": "..."
  }
}
\`\`\`

### Return
2-3 sentence summary of ${angle} findings
`
  })
})

// Step 2: Batch wait for ALL explorations to complete (KEY ADVANTAGE of Codex)
const exploreResults = wait({
  ids: explorationAgents,
  timeout_ms: 600000  // 10 minutes
})

// Step 3: Collect all exploration results
const allExplorations = selectedAngles.map((angle, index) => ({
  angle: angle,
  agentId: explorationAgents[index],
  result: exploreResults.status[explorationAgents[index]].completed,
  file: `${sessionFolder}/exploration-${angle}.json`
}))

console.log(`
## Phase 1 Complete

Explorations completed:
${allExplorations.map(e => `- ${e.angle}: ${e.result.substring(0, 100)}...`).join('\n')}
`)
```

---

### Phase 2: Merge + Clarify (Reuse Primary Agent)

```javascript
// Step 4: Close non-primary agents, keep primary agent (index=0)
const primaryAgent = explorationAgents[0]
const primaryAngle = selectedAngles[0]

explorationAgents.slice(1).forEach(id => close_agent({ id }))

// Step 5: Send merge task to primary agent
send_input({
  id: primaryAgent,
  message: `
## PHASE 2: MERGE + CLARIFY

You are now in **Merger** role. Combine your ${primaryAngle} findings with other explorations below.

### Other Explorations to Merge

${allExplorations.slice(1).map(e => `
#### ${e.angle} Exploration
**File**: ${e.file}
**Summary**: ${e.result}

Read the full exploration: Read("${e.file}")
`).join('\n')}

### Merge Instructions

1. **Read All Exploration Files**
   ${allExplorations.map(e => `- Read("${e.file}")`).join('\n   ')}

2. **Consolidate Findings**
   - **relevant_files**: Deduplicate, keep highest relevance score for each file
   - **patterns**: Merge unique patterns, note which angle discovered each
   - **integration_points**: Combine all, group by module
   - **constraints**: Merge and categorize (hard vs soft constraints)
   - **clarification_needs**: Deduplicate similar questions

3. **Write Merged Exploration**
   Write to: ${sessionFolder}/exploration-merged.json

4. **Output Clarification Questions**

Format:
\`\`\`
MERGED_EXPLORATION_COMPLETE

Files consolidated: [count]
Patterns identified: [count]
Integration points: [count]

CLARIFICATION_NEEDED:
Q1: [merged question] | Options: [A, B, C] | Recommended: [X] | Source: [angles]
Q2: [merged question] | Options: [A, B] | Recommended: [Y] | Source: [angles]
\`\`\`

If no clarification needed:
\`\`\`
CLARIFICATION_NEEDED: NONE

Ready for Phase 3 (Planning). Send clarification answers or "PROCEED_TO_PLANNING".
\`\`\`
`
})

// Step 6: Wait for merge result
const mergeResult = wait({ ids: [primaryAgent], timeout_ms: 300000 })
const mergeOutput = mergeResult.status[primaryAgent].completed

// Step 7: Handle clarification
let clarificationAnswers = null

if (mergeOutput.includes('CLARIFICATION_NEEDED:') && !mergeOutput.includes('CLARIFICATION_NEEDED: NONE')) {
  const questions = parseClarificationQuestions(mergeOutput)

  console.log(`
## Clarification Needed (Merged from ${selectedAngles.length} angles)

${questions.map((q, i) => `
### Q${i+1}: ${q.question}
Options: ${q.options.join(', ')}
Recommended: ${q.recommended}
Source angles: ${q.source}
`).join('\n')}

**Please provide your answers...**
`)

  clarificationAnswers = collectUserAnswers(questions)
}
```

---

### Phase 3: Planning (Continue Reusing Primary Agent)

```javascript
// Step 8: Send planning task
send_input({
  id: primaryAgent,
  message: `
## PHASE 3: GENERATE PLAN

You are now in **Planner** role. Generate implementation plan based on merged explorations.

${clarificationAnswers ? `
### Clarification Answers
${clarificationAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}
` : '### No clarification needed'}

### Planning Instructions

1. **Read Schema**
   Execute: cat ~/.claude/workflows/cli-templates/schemas/plan-json-schema.json

2. **Read Merged Exploration**
   Read: ${sessionFolder}/exploration-merged.json

3. **Generate Plan**
   Based on consolidated findings from ${selectedAngles.length} exploration angles:
   - ${selectedAngles.join('\n   - ')}

4. **Plan Requirements**
   - Summary: 2-3 sentence overview
   - Approach: High-level strategy referencing multiple angles
   - Tasks: 2-7 tasks grouped by feature (NOT by file)
   - Each task: id, title, scope, action, description, modification_points, implementation, acceptance, depends_on
   - Reference exploration angles in task descriptions

5. **Task Grouping Rules**
   - Group by feature: All changes for one feature = one task (even if spanning angles)
   - Substantial tasks: 15-60 minutes each
   - True dependencies only
   - Prefer parallel execution

6. **Write Output**
   Write: ${sessionFolder}/plan.json

### Metadata
Include in _metadata:
- exploration_angles: ${JSON.stringify(selectedAngles)}
- planning_mode: "merged-multi-angle"
- source_explorations: ${allExplorations.length}

### Return
Brief completion summary
`
})

// Step 9: Wait for planning to complete
const planResult = wait({ ids: [primaryAgent], timeout_ms: 600000 })

// Step 10: Final cleanup
close_agent({ id: primaryAgent })
```

---

### Phase 4: Confirmation

```javascript
const plan = JSON.parse(Read(`${sessionFolder}/plan.json`))

console.log(`
## Implementation Plan (Multi-Angle: ${selectedAngles.join(', ')})

**Summary**: ${plan.summary}
**Approach**: ${plan.approach}
**Complexity**: ${plan.complexity}

**Tasks** (${plan.tasks.length}):
${plan.tasks.map((t, i) => `${i+1}. ${t.title} (${t.scope})`).join('\n')}

**Estimated Time**: ${plan.estimated_time}
**Exploration Angles**: ${plan._metadata.exploration_angles.join(', ')}

---

## Confirmation Required

Please review the plan above and reply with one of the following:

- **"Allow"** - Confirm and finalize plan.json
- **"Modify"** - Describe what changes you want to make
- **"Cancel"** - Abort the planning workflow

**WAITING FOR USER CONFIRMATION...**
`)
```

---

## Codex vs Claude Comparison (for hybrid mode)

| Aspect | Claude Code Task | Codex Subagent (Plan-B) |
|--------|------------------|------------------------|
| **Creation** | `Task({ subagent_type, prompt })` | `spawn_agent({ message: role + task })` |
| **Role Loading** | Auto via `subagent_type` | Manual: Agent reads `~/.codex/agents/*.md` |
| **Parallel Wait** | Multiple `Task()` calls | **Batch `wait({ ids: [...] })`** |
| **Result Retrieval** | Sync return or `TaskOutput` | `wait({ ids }).status[id].completed` |
| **Agent Reuse** | `resume` parameter | **`send_input` to continue** |
| **Cleanup** | Automatic | **Explicit `close_agent({ id })`** |

**Plan-B Advantages**:
- True parallel exploration with batch `wait`
- Primary agent retains context across all phases
- Fine-grained lifecycle control

---

## Agent Lifecycle Comparison

```
Traditional Mode:
  Agent 1 ──────● close
  Agent 2 ──────● close
  Agent 3 ──────● close
  Agent 4 ──────● close
  Planning Agent ────────────● close

Plan-B Hybrid Mode:
  Agent 0 ─────────────────────────────────● close (reused until end)
  Agent 1 ──────● close
  Agent 2 ──────● close
  Agent 3 ──────● close
            ↑        ↑                    ↑
         Phase1   Phase2              Phase3
        (parallel) (merge+clarify)    (planning)
```

---

## Session Folder Structure

```
.workflow/.lite-plan/{task-slug}-{YYYY-MM-DD}/
├── exploration-architecture.json    # Angle 1 (primary agent)
├── exploration-patterns.json        # Angle 2
├── exploration-testing.json         # Angle 3
├── exploration-dependencies.json    # Angle 4
├── exploration-merged.json          # Merged by primary agent
└── plan.json                        # Final plan
```

## Workflow States

| State | Action | Next |
|-------|--------|------|
| Phase 1 Complete | All explorations done | → Phase 2 (Merge) |
| Phase 2 Output | Merged + questions | → Wait for user reply |
| User Replied | Answers received | → send_input to Phase 3 |
| Phase 3 Output | Plan generated | → Phase 4 (Confirmation) |
| User: "Allow" | Confirmed | → Output complete |
| User: "Modify" | Changes requested | → send_input with revisions |
| User: "Cancel" | Aborted | → close all agents, end workflow |

## Error Handling

| Error | Resolution |
|-------|------------|
| Partial exploration timeout | Use completed results, note missing angles in merge |
| Primary agent unexpectedly closed | Re-spawn, paste existing exploration results in message |
| Merge phase timeout | send_input to request current merge progress |
| Planning phase timeout | send_input requesting partial plan output |

**Execute task**: $TASK
