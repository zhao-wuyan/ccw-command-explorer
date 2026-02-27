---
description: Lightweight interactive planning workflow with single-agent merged mode for explore → clarify → plan full flow. Supports depth control and auto-clarification.
argument-hint: "TASK=\"<task description or file.md path>\" [--depth=standard|deep] [--auto-clarify] [--max-rounds=<n>] [--verbose]"
---

# Workflow Lite-Plan-A (Merged Mode)

## Overview

Single-agent merged mode for lightweight planning. One agent handles exploration, clarification, and planning in a continuous conversation, maximizing context retention and minimizing agent creation overhead.

**Core capabilities:**
- **Single agent dual-role execution** (explorer + planner in one conversation)
- Context automatically preserved across phases (no serialization loss)
- Reduced user interaction rounds (1-2 vs 3-4)
- Best for Low/Medium complexity tasks with single exploration angle

## Applicable Scenarios

- **Low/Medium complexity tasks**
- Single exploration angle sufficient
- Prioritize minimal agent creation and coherent context
- Clear, well-defined tasks within single module

## Core Advantages

| Metric | Traditional Separated Mode | Plan-A Merged Mode |
|--------|---------------------------|-------------------|
| Agent creation count | 2-5 | **1** |
| Context transfer | Serialized, lossy | **Automatic retention** |
| User interaction rounds | 3-4 | **1-2** |
| Execution time | Multiple spawn/close | **30-50%↓** |

## Task Description

**Target task**: $TASK

- `--depth`: Exploration depth (standard|deep)
- `--auto-clarify`: Auto clarify, skip confirmation
- `--max-rounds`: Max interaction rounds

## Execution Process

```
┌─────────────────────────────────────────────────────────────┐
│  spawn_agent (dual role: explorer + planner)                │
│       ↓                                                     │
│  Phase 1: Exploration → output findings + clarification_needs│
│       ↓                                                     │
│  wait() → get exploration results                           │
│       ↓                                                     │
│  [If clarification needed] Main process collects user answers│
│       ↓                                                     │
│  send_input(clarification_answers + "generate plan")        │
│       ↓                                                     │
│  Phase 2: Planning → output plan.json                       │
│       ↓                                                     │
│  wait() → get planning results                              │
│       ↓                                                     │
│  close_agent()                                              │
└─────────────────────────────────────────────────────────────┘
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

### Complexity Assessment & Angle Selection

```javascript
const complexity = analyzeTaskComplexity("$TASK")
// Plan-A is suitable for Low/Medium; High complexity should use Plan-B

const ANGLE_PRESETS = {
  architecture: ['architecture', 'dependencies'],
  security: ['security', 'auth-patterns'],
  performance: ['performance', 'bottlenecks'],
  bugfix: ['error-handling', 'dataflow'],
  feature: ['patterns', 'integration-points']
}

// Plan-A selects only 1-2 most relevant angles
const primaryAngle = selectPrimaryAngle("$TASK")
```

---

### Phase 1 & 2: Single Agent Dual-Role Execution (Codex Pattern)

```javascript
// ==================== PLAN-A: SINGLE AGENT MERGED MODE ====================

// Step 1: Create dual-role agent (role files read by agent itself)
const agent = spawn_agent({
  message: `
## TASK ASSIGNMENT

### Overview
You will complete this task in TWO phases using a SINGLE conversation:
1. **Phase 1**: Explore codebase, output findings and clarification questions
2. **Phase 2**: After receiving clarification answers, generate implementation plan

### Task Description
${task_description}

### Session Info
- Session ID: ${sessionId}
- Session Folder: ${sessionFolder}
- Primary Angle: ${primaryAngle}

---

## PHASE 1: EXPLORATION

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read explorer role**: ~/.codex/agents/cli-explore-agent.md (MUST read first)
2. **Read planner role**: ~/.codex/agents/cli-lite-planning-agent.md (for Phase 2)
3. Run: ccw tool exec get_modules_by_depth '{}'
4. Run: rg -l "{keyword_from_task}" --type ts
5. Read: .workflow/project-tech.json
6. Read: .workflow/project-guidelines.json

### Exploration Focus: ${primaryAngle}
- Identify relevant files and modules
- Discover existing patterns and conventions
- Map dependencies and integration points
- Note constraints and limitations

### Phase 1 Output Format

\`\`\`
## EXPLORATION COMPLETE

### Findings Summary
- [Key finding 1]
- [Key finding 2]
- [Key finding 3]

### Relevant Files
| File | Relevance | Rationale |
|------|-----------|-----------|
| path/to/file1.ts | 0.9 | [reason] |
| path/to/file2.ts | 0.8 | [reason] |

### Patterns to Follow
- [Pattern 1 with code example]
- [Pattern 2 with code example]

### Integration Points
- [file:line] - [description]

### Constraints
- [Constraint 1]
- [Constraint 2]

CLARIFICATION_NEEDED:
Q1: [question] | Options: [A, B, C] | Recommended: [B]
Q2: [question] | Options: [A, B] | Recommended: [A]
\`\`\`

**If no clarification needed**, output:
\`\`\`
CLARIFICATION_NEEDED: NONE

Ready for Phase 2. Send "PROCEED_TO_PLANNING" to continue.
\`\`\`

### Write Exploration File
Write findings to: ${sessionFolder}/exploration.json
`
})

// Step 2: Wait for Phase 1 to complete
const phase1Result = wait({ ids: [agent], timeout_ms: 600000 })
const phase1Output = phase1Result.status[agent].completed

// Step 3: Handle clarification (if needed)
let clarificationAnswers = null

if (phase1Output.includes('CLARIFICATION_NEEDED:') && !phase1Output.includes('CLARIFICATION_NEEDED: NONE')) {
  // Parse questions, collect user answers
  const questions = parseClarificationQuestions(phase1Output)

  // Display questions to user, collect answers
  console.log(`
## Clarification Needed

${questions.map((q, i) => `
### Q${i+1}: ${q.question}
Options: ${q.options.join(', ')}
Recommended: ${q.recommended}
`).join('\n')}

**Please provide your answers...**
`)

  // Wait for user input...
  clarificationAnswers = collectUserAnswers(questions)
}

// Step 4: Send Phase 2 instruction (continue with same agent)
send_input({
  id: agent,
  message: `
## PHASE 2: GENERATE PLAN

${clarificationAnswers ? `
### Clarification Answers
${clarificationAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}
` : '### No clarification needed - proceeding with exploration findings'}

### Planning Instructions

1. **Read Schema**
   Execute: cat ~/.claude/workflows/cli-templates/schemas/plan-json-schema.json

2. **Generate Plan** based on your exploration findings
   - Summary: 2-3 sentence overview
   - Approach: High-level strategy
   - Tasks: 2-7 tasks grouped by feature (NOT by file)
   - Each task needs: id, title, scope, action, description, modification_points, implementation, acceptance, depends_on

3. **Task Grouping Rules**
   - Group by feature: All changes for one feature = one task
   - Substantial tasks: 15-60 minutes of work each
   - True dependencies only: Use depends_on sparingly
   - Prefer parallel: Most tasks should be independent

4. **Write Output**
   Write: ${sessionFolder}/plan.json

### Output Format
Return brief completion summary after writing plan.json
`
})

// Step 5: Wait for Phase 2 to complete
const phase2Result = wait({ ids: [agent], timeout_ms: 600000 })

// Step 6: Cleanup
close_agent({ id: agent })
```

---

### Phase 3: Confirmation

```javascript
const plan = JSON.parse(Read(`${sessionFolder}/plan.json`))

console.log(`
## Implementation Plan

**Summary**: ${plan.summary}
**Approach**: ${plan.approach}
**Complexity**: ${plan.complexity}

**Tasks** (${plan.tasks.length}):
${plan.tasks.map((t, i) => `${i+1}. ${t.title} (${t.scope})`).join('\n')}

**Estimated Time**: ${plan.estimated_time}

---

## Confirmation Required

Please review the plan above and reply with one of the following:

- **"Allow"** - Proceed with this plan, output plan.json
- **"Modify"** - Describe what changes you want to make
- **"Cancel"** - Abort the planning workflow

**WAITING FOR USER CONFIRMATION...**
`)
```

---

## Codex vs Claude Comparison (for merged mode)

| Aspect | Claude Code Task | Codex Subagent (Plan-A) |
|--------|------------------|------------------------|
| **Creation** | `Task({ subagent_type, prompt })` | `spawn_agent({ message: role + task })` |
| **Role Loading** | Auto via `subagent_type` | Manual: Agent reads `~/.codex/agents/*.md` |
| **Multi-phase** | Separate agents or resume | **Single agent + send_input** |
| **Context Retention** | Lossy (serialization) | **Automatic (same conversation)** |
| **Follow-up** | `resume` parameter | `send_input({ id, message })` |
| **Cleanup** | Automatic | **Explicit `close_agent({ id })`** |

**Plan-A Advantages**:
- Zero context loss between phases
- Single agent lifecycle to manage
- Minimal overhead for simple tasks

---

## Session Folder Structure

```
.workflow/.lite-plan/{task-slug}-{YYYY-MM-DD}/
├── exploration.json     # Phase 1 output
└── plan.json           # Phase 2 output (after confirmation)
```

## Workflow States

| State | Action | Next |
|-------|--------|------|
| Phase 1 Output | Exploration complete | → Wait for clarification or Phase 2 |
| Clarification Output | Questions displayed | → Wait for user reply |
| User Replied | Answers received | → send_input to Phase 2 |
| Phase 2 Output | Plan generated | → Phase 3 (Confirmation) |
| User: "Allow" | Confirmed | → Output complete |
| User: "Modify" | Changes requested | → send_input with revisions |
| User: "Cancel" | Aborted | → close_agent, end workflow |

## Error Handling

| Error | Resolution |
|-------|------------|
| Phase 1 timeout | Continue wait or send_input to request convergence |
| Phase 2 timeout | send_input requesting current progress output |
| Agent unexpectedly closed | Re-spawn, paste previous output in message |
| User cancels | close_agent, preserve generated files |

**Execute task**: $TASK
