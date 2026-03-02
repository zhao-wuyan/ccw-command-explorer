---
name: workflow-plan
description: Unified planning skill - 4-phase planning workflow, plan verification, and interactive replanning. Triggers on "workflow-plan", "workflow-plan-verify", "workflow:replan".
allowed-tools: Skill, Task, AskUserQuestion, TodoWrite, Read, Write, Edit, Bash, Glob, Grep
---

# Workflow Plan

Unified planning skill combining 4-phase planning workflow, plan quality verification, and interactive replanning. Produces IMPL_PLAN.md, task JSONs, verification reports, and manages plan lifecycle through session-level artifact updates.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Workflow Plan Orchestrator (SKILL.md)                            │
│  → Route by mode: plan | verify | replan                         │
│  → Pure coordinator: Execute phases, parse outputs, pass context │
└──────────────────────────────┬───────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ↓                       ↓                       ↓
  ┌───────────┐          ┌───────────┐           ┌───────────┐
  │ Plan Mode │          │  Verify   │           │  Replan   │
  │ (default) │          │   Mode    │           │   Mode    │
  │ Phase 1-4 │          │  Phase 5  │           │  Phase 6  │
  └─────┬─────┘          └───────────┘           └───────────┘
        │
    ┌───┼───┬───┐
    ↓   ↓   ↓   ↓
  ┌───┐┌───┐┌───┐┌───┐
  │ 1 ││ 2 ││ 3 ││ 4 │
  │Ses││Ctx││Con││Gen│
  └───┘└───┘└───┘└─┬─┘
                    ↓
              ┌───────────┐
              │ Confirm   │─── Verify ──→ Phase 5
              │ (choice)  │─── Execute ─→ Skill("workflow-execute")
              └───────────┘─── Review ──→ Display session status inline
```

## Key Design Principles

1. **Pure Orchestrator**: SKILL.md routes and coordinates only; execution detail lives in phase files
2. **Progressive Phase Loading**: Read phase docs ONLY when that phase is about to execute
3. **Multi-Mode Routing**: Single skill handles plan/verify/replan via mode detection
4. **Task Attachment Model**: Sub-command tasks are ATTACHED, executed sequentially, then COLLAPSED
5. **Auto-Continue**: After each phase completes, automatically execute next pending phase
6. **Accumulated State**: planning-notes.md carries context across phases for N+1 decisions

## Interactive Preference Collection

Before dispatching to phase execution, collect workflow preferences via AskUserQuestion:

```javascript
// ★ 统一 auto mode 检测：-y/--yes 从 $ARGUMENTS 或 ccw 传播
const autoYes = /\b(-y|--yes)\b/.test($ARGUMENTS)

if (autoYes) {
  // 自动模式：跳过所有询问，使用默认值
  workflowPreferences = { autoYes: true, interactive: false }
} else {
  const prefResponse = AskUserQuestion({
    questions: [
      {
        question: "是否跳过所有确认步骤（自动模式）？",
        header: "Auto Mode",
        multiSelect: false,
        options: [
          { label: "Interactive (Recommended)", description: "交互模式，包含确认步骤" },
          { label: "Auto", description: "跳过所有确认，自动执行" }
        ]
      }
    ]
  })

  workflowPreferences = {
    autoYes: prefResponse.autoMode === 'Auto'
  }

  // For replan mode, also collect interactive preference
  if (mode === 'replan') {
    const replanPref = AskUserQuestion({
      questions: [
        {
          question: "是否使用交互式澄清模式？",
          header: "Replan Mode",
          multiSelect: false,
          options: [
            { label: "Standard (Recommended)", description: "使用安全默认值" },
            { label: "Interactive", description: "通过提问交互式澄清修改范围" }
          ]
        }
      ]
    })
    workflowPreferences.interactive = replanPref.replanMode === 'Interactive'
  }
}
```

**workflowPreferences** is passed to phase execution as context variable, referenced as `workflowPreferences.autoYes`, `workflowPreferences.interactive` within phases.

## Mode Detection

```javascript
const args = $ARGUMENTS
const mode = detectMode(args)

function detectMode(args) {
  // Skill trigger determines mode
  if (skillName === 'workflow-plan-verify') return 'verify'
  if (skillName === 'workflow:replan') return 'replan'
  return 'plan'  // default: workflow-plan
}
```

## Compact Recovery (Phase Persistence)

Multi-phase planning (Phase 1-4/5/6) spans long conversations. Uses **双重保险**: TodoWrite 跟踪 active phase 保护其不被压缩，sentinel 作为兜底。

> **⚠️ COMPACT DIRECTIVE**: Context compression MUST check TodoWrite phase status.
> The phase currently marked `in_progress` is the active execution phase — preserve its FULL content.
> Only compress phases marked `completed` or `pending`.

## Execution Flow

### Plan Mode (default)

```
Input Parsing:
   └─ Convert user input to structured format (GOAL/SCOPE/CONTEXT)

Phase 1: Session Discovery
   └─ Ref: phases/01-session-discovery.md
      └─ Output: sessionId (WFS-xxx), planning-notes.md

Phase 2: Context Gathering
   └─ Ref: phases/02-context-gathering.md
      ├─ Tasks attached: Analyze structure → Identify integration → Generate package
      └─ Output: contextPath + conflictRisk

Phase 3: Conflict Resolution (conditional: conflictRisk ≥ medium)
   └─ Decision (conflictRisk check):
      ├─ conflictRisk ≥ medium → Ref: phases/03-conflict-resolution.md
      │   ├─ Tasks attached: Detect conflicts → Present to user → Apply strategies
      │   └─ Output: Modified brainstorm artifacts
      └─ conflictRisk < medium → Skip to Phase 4

Phase 4: Task Generation
   └─ Ref: phases/04-task-generation.md
      └─ Output: IMPL_PLAN.md, task JSONs, TODO_LIST.md

Plan Confirmation (User Decision Gate):
   └─ Decision (user choice):
      ├─ "Verify Plan Quality" (Recommended) → Route to Phase 5 (plan-verify)
      ├─ "Start Execution" → Skill(skill="workflow-execute")
      └─ "Review Status Only" → Display session status inline
```

### Verify Mode

```
Phase 5: Plan Verification
   └─ Ref: phases/05-plan-verify.md
      └─ Output: PLAN_VERIFICATION.md with quality gate recommendation
```

### Replan Mode

```
Phase 6: Interactive Replan
   └─ Ref: phases/06-replan.md
      └─ Output: Updated IMPL_PLAN.md, task JSONs, TODO_LIST.md
```

**Phase Reference Documents** (read on-demand when phase executes):

| Phase | Document | Purpose | Mode | Compact |
|-------|----------|---------|------|---------|
| 1 | [phases/01-session-discovery.md](phases/01-session-discovery.md) | Create or discover workflow session | plan | TodoWrite 驱动 |
| 2 | [phases/02-context-gathering.md](phases/02-context-gathering.md) | Gather project context and analyze codebase | plan | TodoWrite 驱动 |
| 3 | [phases/03-conflict-resolution.md](phases/03-conflict-resolution.md) | Detect and resolve conflicts (conditional) | plan | TodoWrite 驱动 |
| 4 | [phases/04-task-generation.md](phases/04-task-generation.md) | Generate implementation plan and task JSONs | plan | TodoWrite 驱动 + 🔄 sentinel |
| 5 | [phases/05-plan-verify.md](phases/05-plan-verify.md) | Read-only verification with quality gate | verify | TodoWrite 驱动 |
| 6 | [phases/06-replan.md](phases/06-replan.md) | Interactive replanning with boundary clarification | replan | TodoWrite 驱动 |

**Compact Rules**:
1. **TodoWrite `in_progress`** → 保留完整内容，禁止压缩
2. **TodoWrite `completed`** → 可压缩为摘要
3. **🔄 sentinel fallback** → Phase 4 包含 compact sentinel；若 compact 后仅存 sentinel 而无完整 Step 协议，必须立即 `Read("phases/04-task-generation.md")` 恢复

## Core Rules

1. **Start Immediately**: First action is mode detection + TodoWrite initialization, second action is phase execution
2. **No Preliminary Analysis**: Do not read files, analyze structure, or gather context before Phase 1
3. **Parse Every Output**: Extract required data from each phase output for next phase
4. **Auto-Continue via TodoList**: Check TodoList status to execute next pending phase automatically
5. **Track Progress**: Update TodoWrite dynamically with task attachment/collapse pattern
6. **Task Attachment Model**: Skill execute **attaches** sub-tasks to current workflow. Orchestrator **executes** these attached tasks itself, then **collapses** them after completion
7. **Progressive Phase Loading**: Read phase docs ONLY when that phase is about to execute
8. **DO NOT STOP**: Continuous multi-phase workflow. After executing all attached tasks, immediately collapse them and execute next phase

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

### Plan Mode

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
    ↓ Output: contextPath (context-package.json) + conflictRisk
    ↓ Update: planning-notes.md (Context Findings + Consolidated Constraints)
    ↓
Phase 3: conflict-resolution [conditional: conflictRisk ≥ medium]
    ↓ Input: sessionId + contextPath + conflictRisk
    ↓ Output: Modified brainstorm artifacts
    ↓ Update: planning-notes.md (Conflict Decisions + Consolidated Constraints)
    ↓ Skip if conflictRisk is none/low → proceed directly to Phase 4
    ↓
Phase 4: task-generate-agent --session sessionId
    ↓ Input: sessionId + planning-notes.md + context-package.json + brainstorm artifacts
    ↓ Output: IMPL_PLAN.md, task JSONs, TODO_LIST.md
    ↓
Plan Confirmation (User Decision Gate):
    ├─ "Verify Plan Quality" (Recommended) → Route to Phase 5
    ├─ "Start Execution" → Skill(skill="workflow-execute")
    └─ "Review Status Only" → Display session status inline
```

**Session Memory Flow**: Each phase receives session ID, which provides access to:
- Previous task summaries
- Existing context and analysis
- Brainstorming artifacts (potentially modified by Phase 3)
- Session-specific configuration

### Verify Mode

```
Input: --session sessionId (or auto-detect)
    ↓
Phase 5: Load artifacts → Agent-driven verification → Generate report
    ↓ Output: PLAN_VERIFICATION.md with quality gate
```

### Replan Mode

```
Input: [--session sessionId] [task-id] "requirements"
    ↓
Phase 6: Mode detection → Clarification → Impact analysis → Backup → Apply → Verify
    ↓ Output: Updated artifacts + change summary
```

## TodoWrite Pattern

**Core Concept**: Dynamic task attachment and collapse for real-time visibility into workflow execution.

### Key Principles

1. **Task Attachment** (when phase executed):
   - Sub-tasks are **attached** to orchestrator's TodoWrite
   - **Phase 2, 3**: Multiple sub-tasks attached
   - **Phase 1, 4**: Single task (atomic)
   - First attached task marked as `in_progress`, others as `pending`
   - Orchestrator **executes** these attached tasks sequentially

2. **Task Collapse** (after sub-tasks complete):
   - **Applies to Phase 2, 3**: Remove detailed sub-tasks from TodoWrite
   - **Collapse** to high-level phase summary
   - **Phase 1, 4**: No collapse needed (single task, just mark completed)
   - Maintains clean orchestrator-level view

3. **Continuous Execution**: After completion, automatically proceed to next pending phase

**Lifecycle**: Initial pending → Phase executed (tasks ATTACHED) → Sub-tasks executed → Phase completed (tasks COLLAPSED for 2/3, marked completed for 1/4) → Next phase → Repeat

### Phase 2 (Tasks Attached):
```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed"},
  {"content": "Phase 2: Context Gathering", "status": "in_progress"},
  {"content": "  → Analyze codebase structure", "status": "in_progress"},
  {"content": "  → Identify integration points", "status": "pending"},
  {"content": "  → Generate context package", "status": "pending"},
  {"content": "Phase 4: Task Generation", "status": "pending"}
]
```

### Phase 2 (Collapsed):
```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed"},
  {"content": "Phase 2: Context Gathering", "status": "completed"},
  {"content": "Phase 4: Task Generation", "status": "pending"}
]
```

### Phase 3 (Tasks Attached, conditional):
```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed"},
  {"content": "Phase 2: Context Gathering", "status": "completed"},
  {"content": "Phase 3: Conflict Resolution", "status": "in_progress"},
  {"content": "  → Detect conflicts with CLI analysis", "status": "in_progress"},
  {"content": "  → Present conflicts to user", "status": "pending"},
  {"content": "  → Apply resolution strategies", "status": "pending"},
  {"content": "Phase 4: Task Generation", "status": "pending"}
]
```

**Note**: See individual Phase descriptions for detailed TodoWrite Update examples.

## Post-Phase Updates

After each phase completes, update planning-notes.md:

- **After Phase 1**: Initialize with user intent (GOAL, KEY_CONSTRAINTS)
- **After Phase 2**: Add context findings (CRITICAL_FILES, ARCHITECTURE, CONFLICT_RISK, CONSTRAINTS)
- **After Phase 3**: Add conflict decisions (RESOLVED, MODIFIED_ARTIFACTS, CONSTRAINTS) if executed
- **Memory State Check**: After heavy phases (Phase 2-3), evaluate context window usage; if high (>120K tokens), trigger `compact`

See phase files for detailed update code.

## Error Handling

- **Parsing Failure**: If output parsing fails, retry command once, then report error
- **Validation Failure**: If validation fails, report which file/data is missing
- **Command Failure**: Keep phase `in_progress`, report error to user, do not proceed to next phase
- **Session Not Found** (verify/replan): Report error with available sessions list
- **Task Not Found** (replan): Report error with available tasks list

## Coordinator Checklist

### Plan Mode
- **Pre-Phase**: Convert user input to structured format (GOAL/SCOPE/CONTEXT)
- Initialize TodoWrite before any command (Phase 3 added dynamically after Phase 2)
- Execute Phase 1 immediately with structured description
- Parse session ID from Phase 1 output, store in memory
- Pass session ID and structured description to Phase 2 command
- Parse context path from Phase 2 output, store in memory
- **Extract conflictRisk from context-package.json**: Determine Phase 3 execution
- **If conflictRisk ≥ medium**: Launch Phase 3 conflict-resolution with sessionId and contextPath
- Wait for Phase 3 to finish executing (if executed), verify conflict-resolution.json created
- **If conflictRisk is none/low**: Skip Phase 3, proceed directly to Phase 4
- Pass session ID to Phase 4 command
- Verify all Phase 4 outputs
- **Plan Confirmation Gate**: Present user with choice (Verify → Phase 5 / Execute / Review Status)
- **If user selects Verify**: Read phases/05-plan-verify.md, execute Phase 5 in-process
- **If user selects Execute**: Skill(skill="workflow-execute")
- **If user selects Review**: Display session status inline
- **Auto mode (workflowPreferences.autoYes)**: Auto-select "Verify Plan Quality", then auto-continue to execute if PROCEED
- Update TodoWrite after each phase
- After each phase, automatically continue to next phase based on TodoList status

### Verify Mode
- Detect/validate session (auto-detect from active sessions)
- Initialize TodoWrite with single verification task
- Execute Phase 5 verification agent
- Present quality gate result and next step options

### Replan Mode
- Parse task ID from $ARGUMENTS (IMPL-N format, if present)
- Detect operation mode (task vs session)
- Initialize TodoWrite with replan-specific tasks
- Execute Phase 6 through all sub-phases (clarification → impact → backup → apply → verify)

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

## Related Skills

**Prerequisite Skills**:
- `brainstorm` skill - Optional: Generate role-based analyses before planning
- `brainstorm` skill - Optional: Refine brainstorm analyses with clarifications

**Called by Plan Mode** (4 phases):
- `/workflow:session:start` - Phase 1: Create or discover workflow session
- `phases/02-context-gathering.md` - Phase 2: Gather project context and analyze codebase (inline)
- `phases/03-conflict-resolution.md` - Phase 3: Detect and resolve conflicts (inline, conditional)
- `memory-capture` skill - Phase 3: Memory optimization (if context approaching limits)
- `phases/04-task-generation.md` - Phase 4: Generate task JSON files (inline)

**Follow-up Skills**:
- `workflow-plan` skill (plan-verify phase) - Verify plan quality (can also invoke via verify mode)
- Display session status inline - Review task breakdown and current progress
- `Skill(skill="workflow-execute")` - Begin implementation of generated tasks (skill: workflow-execute)
- `workflow-plan` skill (replan phase) - Modify plan (can also invoke via replan mode)
