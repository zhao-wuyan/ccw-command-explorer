---
name: plan
description: 5-phase planning workflow with action-planning-agent task generation, outputs IMPL_PLAN.md and task JSONs
argument-hint: "[-y|--yes] \"text description\"|file.md"
allowed-tools: SlashCommand(*), TodoWrite(*), Read(*), Bash(*)
group: workflow
---

## Auto Mode

When `--yes` or `-y`: Auto-continue all phases (skip confirmations), use recommended conflict resolutions.

# Workflow Plan Command (/workflow:plan)

## Coordinator Role

**This command is a pure orchestrator**: Execute 5 slash commands in sequence (including a quality gate), parse their outputs, pass context between them, and ensure complete execution through **automatic continuation**.

**Execution Model - Auto-Continue Workflow with Quality Gate**:

This workflow runs **fully autonomously** once triggered. Phase 3 (conflict resolution) and Phase 4 (task generation) are delegated to specialized agents.


1. **User triggers**: `/workflow:plan "task"`
2. **Phase 1 executes** → Session discovery → Auto-continues
3. **Phase 2 executes** → Context gathering → Auto-continues
4. **Phase 3 executes** (optional, if conflict_risk ≥ medium) → Conflict resolution → Auto-continues
5. **Phase 4 executes** → Task generation (task-generate-agent) → Reports final summary

**Task Attachment Model**:
- SlashCommand execute **expands workflow** by attaching sub-tasks to current TodoWrite
- When a sub-command is executed (e.g., `/workflow:tools:context-gather`), its internal tasks are attached to the orchestrator's TodoWrite
- Orchestrator **executes these attached tasks** sequentially
- After completion, attached tasks are **collapsed** back to high-level phase summary
- This is **task expansion**, not external delegation

**Auto-Continue Mechanism**:
- TodoList tracks current phase status and dynamically manages task attachment/collapse
- When each phase finishes executing, automatically execute next pending phase
- All phases run autonomously without user interaction (clarification handled in brainstorm phase)
- Progress updates shown at each phase for visibility
- **⚠️ CONTINUOUS EXECUTION** - Do not stop until all phases complete

## Core Rules

1. **Start Immediately**: First action is TodoWrite initialization, second action is Phase 1 command execution
2. **No Preliminary Analysis**: Do not read files, analyze structure, or gather context before Phase 1
3. **Parse Every Output**: Extract required data from each command/agent output for next phase
4. **Auto-Continue via TodoList**: Check TodoList status to execute next pending phase automatically
5. **Track Progress**: Update TodoWrite dynamically with task attachment/collapse pattern
6. **Task Attachment Model**: SlashCommand execute **attaches** sub-tasks to current workflow. Orchestrator **executes** these attached tasks itself, then **collapses** them after completion
7. **⚠️ CRITICAL: DO NOT STOP**: Continuous multi-phase workflow. After executing all attached tasks, immediately collapse them and execute next phase

## Execution Process

```
Input Parsing:
   └─ Convert user input to structured format (GOAL/SCOPE/CONTEXT)

Phase 1: Session Discovery
   └─ /workflow:session:start --auto "structured-description"
      └─ Output: sessionId (WFS-xxx)

Phase 2: Context Gathering
   └─ /workflow:tools:context-gather --session sessionId "structured-description"
      ├─ Tasks attached: Analyze structure → Identify integration → Generate package
      └─ Output: contextPath + conflict_risk

Phase 3: Conflict Resolution 
   └─ Decision (conflict_risk check):
      ├─ conflict_risk ≥ medium → Execute /workflow:tools:conflict-resolution
      │   ├─ Tasks attached: Detect conflicts → Present to user → Apply strategies
      │   └─ Output: Modified brainstorm artifacts
      └─ conflict_risk < medium → Skip to Phase 4

Phase 4: Task Generation
   └─ /workflow:tools:task-generate-agent --session sessionId
      └─ Output: IMPL_PLAN.md, task JSONs, TODO_LIST.md

Return:
   └─ Summary with recommended next steps
```

## 5-Phase Execution

### Phase 1: Session Discovery

**Step 1.1: Execute** - Create or discover workflow session

```javascript
SlashCommand(command="/workflow:session:start --auto \"[structured-task-description]\"")
```

**Task Description Structure**:
```
GOAL: [Clear, concise objective]
SCOPE: [What's included/excluded]
CONTEXT: [Relevant background or constraints]
```

**Example**:
```
GOAL: Build JWT-based authentication system
SCOPE: User registration, login, token validation
CONTEXT: Existing user database schema, REST API endpoints
```

**Parse Output**:
- Extract: `SESSION_ID: WFS-[id]` (store as `sessionId`)

**Validation**:
- Session ID successfully extracted
- Session directory `.workflow/active/[sessionId]/` exists

**Note**: Session directory contains `workflow-session.json` (metadata). Do NOT look for `manifest.json` here - it only exists in `.workflow/archives/` for archived sessions.

**TodoWrite**: Mark phase 1 completed, phase 2 in_progress

**After Phase 1**: Initialize planning-notes.md with user intent

```javascript
// Create planning notes document with N+1 context support
const planningNotesPath = `.workflow/active/${sessionId}/planning-notes.md`
const userGoal = structuredDescription.goal
const userConstraints = structuredDescription.context || "None specified"

Write(planningNotesPath, `# Planning Notes

**Session**: ${sessionId}
**Created**: ${new Date().toISOString()}

## User Intent (Phase 1)

- **GOAL**: ${userGoal}
- **KEY_CONSTRAINTS**: ${userConstraints}

---

## Context Findings (Phase 2)
(To be filled by context-gather)

## Conflict Decisions (Phase 3)
(To be filled if conflicts detected)

## Consolidated Constraints (Phase 4 Input)
1. ${userConstraints}

---

## Task Generation (Phase 4)
(To be filled by action-planning-agent)

## N+1 Context
### Decisions
| Decision | Rationale | Revisit? |
|----------|-----------|----------|

### Deferred
- [ ] (For N+1)
`)
```

Return to user showing Phase 1 results, then auto-continue to Phase 2

---

### Phase 2: Context Gathering

**Step 2.1: Execute** - Gather project context and analyze codebase

```javascript
SlashCommand(command="/workflow:tools:context-gather --session [sessionId] \"[structured-task-description]\"")
```

**Use Same Structured Description**: Pass the same structured format from Phase 1

**Input**: `sessionId` from Phase 1

**Parse Output**:
- Extract: context-package.json path (store as `contextPath`)
- Typical pattern: `.workflow/active/[sessionId]/.process/context-package.json`

**Validation**:
- Context package path extracted
- File exists and is valid JSON
- `prioritized_context` field exists

<!-- TodoWrite: When context-gather executed, INSERT 3 context-gather tasks, mark first as in_progress -->

**TodoWrite Update (Phase 2 SlashCommand executed - tasks attached)**:
```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "in_progress", "activeForm": "Executing context gathering"},
  {"content": "  → Analyze codebase structure", "status": "in_progress", "activeForm": "Analyzing codebase structure"},
  {"content": "  → Identify integration points", "status": "pending", "activeForm": "Identifying integration points"},
  {"content": "  → Generate context package", "status": "pending", "activeForm": "Generating context package"},
  {"content": "Phase 4: Task Generation", "status": "pending", "activeForm": "Executing task generation"}
]
```

**Note**: SlashCommand execute **attaches** context-gather's 3 tasks. Orchestrator **executes** these tasks sequentially.

<!-- TodoWrite: After Phase 2 tasks complete, REMOVE Phase 2.1-2.3, restore to orchestrator view -->

**TodoWrite Update (Phase 2 completed - tasks collapsed)**:
```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "completed", "activeForm": "Executing context gathering"},
  {"content": "Phase 4: Task Generation", "status": "pending", "activeForm": "Executing task generation"}
]
```

**Note**: Phase 2 tasks completed and collapsed to summary.

**After Phase 2**: Update planning-notes.md with context findings, then auto-continue

```javascript
// Read context-package to extract key findings
const contextPackage = JSON.parse(Read(contextPath))
const conflictRisk = contextPackage.conflict_detection?.risk_level || 'low'
const criticalFiles = (contextPackage.exploration_results?.aggregated_insights?.critical_files || [])
  .slice(0, 5).map(f => f.path)
const archPatterns = contextPackage.project_context?.architecture_patterns || []
const constraints = contextPackage.exploration_results?.aggregated_insights?.constraints || []

// Append Phase 2 findings to planning-notes.md
Edit(planningNotesPath, {
  old: '## Context Findings (Phase 2)\n(To be filled by context-gather)',
  new: `## Context Findings (Phase 2)

- **CRITICAL_FILES**: ${criticalFiles.join(', ') || 'None identified'}
- **ARCHITECTURE**: ${archPatterns.join(', ') || 'Not detected'}
- **CONFLICT_RISK**: ${conflictRisk}
- **CONSTRAINTS**: ${constraints.length > 0 ? constraints.join('; ') : 'None'}`
})

// Append Phase 2 constraints to consolidated list
Edit(planningNotesPath, {
  old: '## Consolidated Constraints (Phase 4 Input)',
  new: `## Consolidated Constraints (Phase 4 Input)
${constraints.map((c, i) => `${i + 2}. [Context] ${c}`).join('\n')}`
})
```

Return to user showing Phase 2 results, then auto-continue to Phase 3/4 (depending on conflict_risk)

---

### Phase 3: Conflict Resolution

**Trigger**: Only execute when context-package.json indicates conflict_risk is "medium" or "high"

**Step 3.1: Execute** - Detect and resolve conflicts with CLI analysis

```javascript
SlashCommand(command="/workflow:tools:conflict-resolution --session [sessionId] --context [contextPath]")
```

**Input**:
- sessionId from Phase 1
- contextPath from Phase 2
- conflict_risk from context-package.json

**Parse Output**:
- Extract: Execution status (success/skipped/failed)
- Verify: conflict-resolution.json file path (if executed)

**Validation**:
- File `.workflow/active/[sessionId]/.process/conflict-resolution.json` exists (if executed)

**Skip Behavior**:
- If conflict_risk is "none" or "low", skip directly to Phase 3.5
- Display: "No significant conflicts detected, proceeding to clarification"

<!-- TodoWrite: If conflict_risk ≥ medium, INSERT 3 conflict-resolution tasks -->

**TodoWrite Update (Phase 3 SlashCommand executed - tasks attached, if conflict_risk ≥ medium)**:
```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "completed", "activeForm": "Executing context gathering"},
  {"content": "Phase 3: Conflict Resolution", "status": "in_progress", "activeForm": "Resolving conflicts"},
  {"content": "  → Detect conflicts with CLI analysis", "status": "in_progress", "activeForm": "Detecting conflicts"},
  {"content": "  → Present conflicts to user", "status": "pending", "activeForm": "Presenting conflicts"},
  {"content": "  → Apply resolution strategies", "status": "pending", "activeForm": "Applying resolution strategies"},
  {"content": "Phase 4: Task Generation", "status": "pending", "activeForm": "Executing task generation"}
]
```

**Note**: SlashCommand execute **attaches** conflict-resolution's 3 tasks. Orchestrator **executes** these tasks sequentially.

<!-- TodoWrite: After Phase 3 tasks complete, REMOVE Phase 3.1-3.3, restore to orchestrator view -->

**TodoWrite Update (Phase 3 completed - tasks collapsed)**:
```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "completed", "activeForm": "Executing context gathering"},
  {"content": "Phase 3: Conflict Resolution", "status": "completed", "activeForm": "Resolving conflicts"},
  {"content": "Phase 4: Task Generation", "status": "pending", "activeForm": "Executing task generation"}
]
```

**Note**: Phase 3 tasks completed and collapsed to summary.

**After Phase 3**: Update planning-notes.md with conflict decisions (if executed), then auto-continue

```javascript
// If Phase 3 was executed, update planning-notes.md
if (conflictRisk >= 'medium') {
  const conflictResPath = `.workflow/active/${sessionId}/.process/conflict-resolution.json`

  if (fs.existsSync(conflictResPath)) {
    const conflictRes = JSON.parse(Read(conflictResPath))
    const resolved = conflictRes.resolved_conflicts || []
    const modifiedArtifacts = conflictRes.modified_artifacts || []
    const planningConstraints = conflictRes.planning_constraints || []

    // Update Phase 3 section
    Edit(planningNotesPath, {
      old: '## Conflict Decisions (Phase 3)\n(To be filled if conflicts detected)',
      new: `## Conflict Decisions (Phase 3)

- **RESOLVED**: ${resolved.map(r => `${r.type} → ${r.strategy}`).join('; ') || 'None'}
- **MODIFIED_ARTIFACTS**: ${modifiedArtifacts.join(', ') || 'None'}
- **CONSTRAINTS**: ${planningConstraints.join('; ') || 'None'}`
    })

    // Append Phase 3 constraints to consolidated list
    if (planningConstraints.length > 0) {
      const currentNotes = Read(planningNotesPath)
      const constraintCount = (currentNotes.match(/^\d+\./gm) || []).length

      Edit(planningNotesPath, {
        old: '## Consolidated Constraints (Phase 4 Input)',
        new: `## Consolidated Constraints (Phase 4 Input)
${planningConstraints.map((c, i) => `${constraintCount + i + 1}. [Conflict] ${c}`).join('\n')}`
      })
    }
  }
}
```

Return to user showing conflict resolution results (if executed) and selected strategies, then auto-continue to Phase 3.5

**Memory State Check**:
- Evaluate current context window usage and memory state
- If memory usage is high (>120K tokens or approaching context limits):

  **Step 3.2: Execute** - Optimize memory before proceeding

  ```javascript
  SlashCommand(command="/compact")
  ```

- Memory compaction is particularly important after analysis phase which may generate extensive documentation
- Ensures optimal performance and prevents context overflow

---

### Phase 3.5: Pre-Task Generation Validation (Optional Quality Gate)

**Purpose**: Optional quality gate before task generation - primarily handled by brainstorm synthesis phase


**Current Behavior**: Auto-skip to Phase 4 (Task Generation)

**Future Enhancement**: Could add additional validation steps like:
- Cross-reference checks between conflict resolution and brainstorm analyses
- Final sanity checks before task generation
- User confirmation prompt for proceeding

**TodoWrite**: Mark phase 3.5 completed (auto-skip), phase 4 in_progress

**After Phase 3.5**: Auto-continue to Phase 4 immediately

---

### Phase 4: Task Generation

**Relationship with Brainstorm Phase**:
- If brainstorm role analyses exist ([role]/analysis.md files), Phase 3 analysis incorporates them as input
- **User's original intent is ALWAYS primary**: New or refined user goals override brainstorm recommendations
- **Role analysis.md files define "WHAT"**: Requirements, design specs, role-specific insights
- **IMPL_PLAN.md defines "HOW"**: Executable task breakdown, dependencies, implementation sequence
- Task generation translates high-level role analyses into concrete, actionable work items
- **Intent priority**: Current user prompt > role analysis.md files > guidance-specification.md

**Step 4.1: Execute** - Generate implementation plan and task JSONs

```javascript
SlashCommand(command="/workflow:tools:task-generate-agent --session [sessionId]")
```

**CLI Execution Note**: CLI tool usage is now determined semantically by action-planning-agent based on user's task description. If user specifies "use Codex/Gemini/Qwen for X", the agent embeds `command` fields in relevant `implementation_approach` steps.

**Input**:
- `sessionId` from Phase 1
- **planning-notes.md**: Consolidated constraints from all phases (Phase 1-3)
  - Path: `.workflow/active/[sessionId]/planning-notes.md`
  - Contains: User intent, context findings, conflict decisions, consolidated constraints
  - **Purpose**: Provides structured, minimal context summary to action-planning-agent

**Validation**:
- `.workflow/active/[sessionId]/IMPL_PLAN.md` exists
- `.workflow/active/[sessionId]/.task/IMPL-*.json` exists (at least one)
- `.workflow/active/[sessionId]/TODO_LIST.md` exists

<!-- TodoWrite: When task-generate-agent executed, ATTACH 1 agent task -->

**TodoWrite Update (Phase 4 SlashCommand executed - agent task attached)**:
```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "completed", "activeForm": "Executing context gathering"},
  {"content": "Phase 4: Task Generation", "status": "in_progress", "activeForm": "Executing task generation"}
]
```

**Note**: Single agent task attached. Agent autonomously completes discovery, planning, and output generation internally.

<!-- TodoWrite: After agent completes, mark task as completed -->

**TodoWrite Update (Phase 4 completed)**:
```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "completed", "activeForm": "Executing context gathering"},
  {"content": "Phase 4: Task Generation", "status": "completed", "activeForm": "Executing task generation"}
]
```

**Note**: Agent task completed. No collapse needed (single task).

**Step 4.2: User Decision** - Choose next action

After Phase 4 completes, present user with action choices:

```javascript
console.log(`
✅ Planning complete for session: ${sessionId}
📊 Tasks generated: ${taskCount}
📋 Plan: .workflow/active/${sessionId}/IMPL_PLAN.md
`);

// Ask user for next action
const userChoice = AskUserQuestion({
  questions: [{
    question: "Planning complete. What would you like to do next?",
    header: "Next Action",
    multiSelect: false,
    options: [
      {
        label: "Verify Plan Quality (Recommended)",
        description: "Run quality verification to catch issues before execution. Checks plan structure, task dependencies, and completeness."
      },
      {
        label: "Start Execution",
        description: "Begin implementing tasks immediately. Use this if you've already reviewed the plan or want to start quickly."
      },
      {
        label: "Review Status Only",
        description: "View task breakdown and session status without taking further action. You can decide what to do next manually."
      }
    ]
  }]
});

// Execute based on user choice
if (userChoice.answers["Next Action"] === "Verify Plan Quality (Recommended)") {
  console.log("\n🔍 Starting plan verification...\n");
  SlashCommand(command="/workflow:plan-verify --session " + sessionId);
} else if (userChoice.answers["Next Action"] === "Start Execution") {
  console.log("\n🚀 Starting task execution...\n");
  SlashCommand(command="/workflow:execute --session " + sessionId);
} else if (userChoice.answers["Next Action"] === "Review Status Only") {
  console.log("\n📊 Displaying session status...\n");
  SlashCommand(command="/workflow:status --session " + sessionId);
}
```

**Return to User**: Based on user's choice, execute the corresponding workflow command.

## TodoWrite Pattern

**Core Concept**: Dynamic task attachment and collapse for real-time visibility into workflow execution.

### Key Principles

1. **Task Attachment** (when SlashCommand executed):
   - Sub-command's internal tasks are **attached** to orchestrator's TodoWrite
   - **Phase 2, 3**: Multiple sub-tasks attached (e.g., Phase 2.1, 2.2, 2.3)
   - **Phase 4**: Single agent task attached (e.g., "Execute task-generate-agent")
   - First attached task marked as `in_progress`, others as `pending`
   - Orchestrator **executes** these attached tasks sequentially

2. **Task Collapse** (after sub-tasks complete):
   - **Applies to Phase 2, 3**: Remove detailed sub-tasks from TodoWrite
   - **Collapse** to high-level phase summary
   - Example: Phase 2.1-2.3 collapse to "Execute context gathering: completed"
   - **Phase 4**: No collapse needed (single task, just mark completed)
   - Maintains clean orchestrator-level view

3. **Continuous Execution**:
   - After completion, automatically proceed to next pending phase
   - No user intervention required between phases
   - TodoWrite dynamically reflects current execution state

**Lifecycle Summary**: Initial pending tasks → Phase executed (tasks ATTACHED) → Sub-tasks executed sequentially → Phase completed (tasks COLLAPSED to summary for Phase 2/3, or marked completed for Phase 4) → Next phase begins → Repeat until all phases complete.



**Note**: See individual Phase descriptions for detailed TodoWrite Update examples:
- **Phase 2, 3**: Multiple sub-tasks with attach/collapse pattern
- **Phase 4**: Single agent task (no collapse needed)

## Input Processing

**Convert User Input to Structured Format**:

1. **Simple Text** → Structure it:
   ```
   User: "Build authentication system"

   Structured:
   GOAL: Build authentication system
   SCOPE: Core authentication features
   CONTEXT: New implementation
   ```

2. **Detailed Text** → Extract components:
   ```
   User: "Add JWT authentication with email/password login and token refresh"

   Structured:
   GOAL: Implement JWT-based authentication
   SCOPE: Email/password login, token generation, token refresh endpoints
   CONTEXT: JWT token-based security, refresh token rotation
   ```

3. **File Reference** (e.g., `requirements.md`) → Read and structure:
   - Read file content
   - Extract goal, scope, requirements
   - Format into structured description

## Data Flow

```
User Input (task description)
    ↓
[Convert to Structured Format]
    ↓ Structured Description:
    ↓   GOAL: [objective]
    ↓   SCOPE: [boundaries]
    ↓   CONTEXT: [background]
    ↓
Phase 1: session:start --auto "structured-description"
    ↓ Output: sessionId
    ↓ Write: planning-notes.md (User Intent section)
    ↓
Phase 2: context-gather --session sessionId "structured-description"
    ↓ Input: sessionId + structured description
    ↓ Output: contextPath (context-package.json with prioritized_context) + conflict_risk
    ↓ Update: planning-notes.md (Context Findings + Consolidated Constraints)
    ↓
Phase 3: conflict-resolution [AUTO-TRIGGERED if conflict_risk ≥ medium]
    ↓ Input: sessionId + contextPath + conflict_risk
    ↓ Output: Modified brainstorm artifacts
    ↓ Update: planning-notes.md (Conflict Decisions + Consolidated Constraints)
    ↓ Skip if conflict_risk is none/low → proceed directly to Phase 4
    ↓
Phase 4: task-generate-agent --session sessionId
    ↓ Input: sessionId + planning-notes.md + context-package.json + brainstorm artifacts
    ↓ Output: IMPL_PLAN.md, task JSONs, TODO_LIST.md
    ↓
Return summary to user
```

**Session Memory Flow**: Each phase receives session ID, which provides access to:
- Previous task summaries
- Existing context and analysis
- Brainstorming artifacts (potentially modified by Phase 3)
- Session-specific configuration


## Execution Flow Diagram

```
User triggers: /workflow:plan "Build authentication system"
  ↓
[TodoWrite Init] 3 orchestrator-level tasks
  ↓
Phase 1: Session Discovery
  → sessionId extracted
  ↓
Phase 2: Context Gathering (SlashCommand executed)
  → ATTACH 3 sub-tasks: ← ATTACHED
    - → Analyze codebase structure
    - → Identify integration points
    - → Generate context package
  → Execute sub-tasks sequentially
  → COLLAPSE tasks ← COLLAPSED
  → contextPath + conflict_risk extracted
  ↓
Conditional Branch: Check conflict_risk
  ├─ IF conflict_risk ≥ medium:
  │   Phase 3: Conflict Resolution (SlashCommand executed)
  │     → ATTACH 3 sub-tasks: ← ATTACHED
  │       - → Detect conflicts with CLI analysis
  │       - → Present conflicts to user
  │       - → Apply resolution strategies
  │     → Execute sub-tasks sequentially
  │     → COLLAPSE tasks ← COLLAPSED
  │
  └─ ELSE: Skip Phase 3, proceed to Phase 4
  ↓
Phase 4: Task Generation (SlashCommand executed)
  → Single agent task (no sub-tasks)
  → Agent autonomously completes internally:
    (discovery → planning → output)
  → Outputs: IMPL_PLAN.md, IMPL-*.json, TODO_LIST.md
  ↓
Return summary to user
```

**Key Points**:
- **← ATTACHED**: Tasks attached to TodoWrite when SlashCommand executed
  - Phase 2, 3: Multiple sub-tasks
  - Phase 4: Single agent task
- **← COLLAPSED**: Sub-tasks collapsed to summary after completion (Phase 2, 3 only)
- **Phase 4**: Single agent task, no collapse (just mark completed)
- **Conditional Branch**: Phase 3 only executes if conflict_risk ≥ medium
- **Continuous Flow**: No user intervention between phases

## Error Handling

- **Parsing Failure**: If output parsing fails, retry command once, then report error
- **Validation Failure**: If validation fails, report which file/data is missing
- **Command Failure**: Keep phase `in_progress`, report error to user, do not proceed to next phase

## Coordinator Checklist

- **Pre-Phase**: Convert user input to structured format (GOAL/SCOPE/CONTEXT)
- Initialize TodoWrite before any command (Phase 3 added dynamically after Phase 2)
- Execute Phase 1 immediately with structured description
- Parse session ID from Phase 1 output, store in memory
- Pass session ID and structured description to Phase 2 command
- Parse context path from Phase 2 output, store in memory
- **Extract conflict_risk from context-package.json**: Determine Phase 3 execution
- **If conflict_risk ≥ medium**: Launch Phase 3 conflict-resolution with sessionId and contextPath
- Wait for Phase 3 to finish executing (if executed), verify conflict-resolution.json created
- **If conflict_risk is none/low**: Skip Phase 3, proceed directly to Phase 4
- **Build Phase 4 command**: `/workflow:tools:task-generate-agent --session [sessionId]`
- Pass session ID to Phase 4 command
- Verify all Phase 4 outputs
- Update TodoWrite after each phase (dynamically adjust for Phase 3 presence)
- After each phase, automatically continue to next phase based on TodoList status

## Structure Template Reference

**Minimal Structure**:
```
GOAL: [What to achieve]
SCOPE: [What's included]
CONTEXT: [Relevant info]
```

**Detailed Structure** (optional, when more context available):
```
GOAL: [Primary objective]
SCOPE: [Included features/components]
CONTEXT: [Existing system, constraints, dependencies]
REQUIREMENTS: [Specific technical requirements]
CONSTRAINTS: [Limitations or boundaries]
```

**Usage in Commands**:
```bash
# Phase 1
/workflow:session:start --auto "GOAL: Build authentication\nSCOPE: JWT, login, registration\nCONTEXT: REST API"

# Phase 2
/workflow:tools:context-gather --session WFS-123 "GOAL: Build authentication\nSCOPE: JWT, login, registration\nCONTEXT: REST API"
```

## Related Commands

**Prerequisite Commands**:
- `/workflow:brainstorm:artifacts` - Optional: Generate role-based analyses before planning (if complex requirements need multiple perspectives)
- `/workflow:brainstorm:synthesis` - Optional: Refine brainstorm analyses with clarifications

**Called by This Command** (5 phases):
- `/workflow:session:start` - Phase 1: Create or discover workflow session
- `/workflow:tools:context-gather` - Phase 2: Gather project context and analyze codebase
- `/workflow:tools:conflict-resolution` - Phase 3: Detect and resolve conflicts (auto-triggered if conflict_risk ≥ medium)
- `/compact` - Phase 3: Memory optimization (if context approaching limits)
- `/workflow:tools:task-generate-agent` - Phase 4: Generate task JSON files with agent-driven approach

**Follow-up Commands**:
- `/workflow:plan-verify` - Recommended: Verify plan quality and catch issues before execution
- `/workflow:status` - Review task breakdown and current progress
- `/workflow:execute` - Begin implementation of generated tasks
