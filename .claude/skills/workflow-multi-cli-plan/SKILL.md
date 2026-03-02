---
name: workflow-multi-cli-plan
description: Multi-CLI collaborative planning and execution skill - route to multi-cli-plan or lite-execute with prompt enhancement. Triggers on "workflow-multi-cli-plan", "workflow:lite-execute".
allowed-tools: Skill, Task, AskUserQuestion, TodoWrite, Read, Write, Edit, Bash, Glob, Grep, mcp__ace-tool__search_context
---

# Workflow Multi-CLI Plan

Unified multi-CLI collaborative planning and execution skill. Routes to multi-cli-plan (ACE context + multi-CLI discussion + plan generation) or lite-execute (execution engine) based on trigger, with prompt enhancement for both modes.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  SKILL.md (Router + Prompt Enhancement)                  │
│  → Detect mode → Enhance prompt → Dispatch to phase     │
└──────────────────────┬──────────────────────────────────┘
                       │
           ┌───────────┼───────────┐
           ↓                       ↓
     ┌──────────────┐        ┌───────────┐
     │multi-cli-plan│        │lite-execute│
     │   Phase 1    │        │  Phase 2   │
     │  Plan+Exec   │─handoff→│ Standalone │
     └──────────────┘        └───────────┘
```

## Mode Detection & Routing

```javascript
const args = $ARGUMENTS
const mode = detectMode()

function detectMode() {
  if (skillName === 'workflow:lite-execute') return 'execute'
  return 'plan'  // default: workflow-multi-cli-plan
}
```

**Routing Table**:

| Trigger | Mode | Phase Document | Description |
|---------|------|----------------|-------------|
| `workflow-multi-cli-plan` | plan | [phases/01-multi-cli-plan.md](phases/01-multi-cli-plan.md) | Multi-CLI collaborative planning (ACE context → discussion → plan → execute) |
| `workflow:lite-execute` | execute | [phases/02-lite-execute.md](phases/02-lite-execute.md) | Standalone execution (in-memory / prompt / file) |

## Interactive Preference Collection

Before dispatching, collect workflow preferences via AskUserQuestion:

```javascript
// ★ 统一 auto mode 检测：-y/--yes 从 $ARGUMENTS 或 ccw 传播
const autoYes = /\b(-y|--yes)\b/.test($ARGUMENTS)

if (autoYes) {
  // 自动模式：跳过所有询问，使用默认值
  workflowPreferences = { autoYes: true }
} else if (mode === 'plan') {
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
} else {
  // Execute mode
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
}
```

**workflowPreferences** is passed to phase execution as context variable, referenced as `workflowPreferences.autoYes` within phases.

## Prompt Enhancement

After collecting preferences, enhance context and dispatch:

```javascript
// Step 1: Load project context via ccw spec
Bash('ccw spec load --category planning')

// Step 2: Log available context
console.log('Project context loaded via: ccw spec load --category planning')

// Step 3: Dispatch to phase (workflowPreferences available as context)
if (mode === 'plan') {
  // Read phases/01-multi-cli-plan.md and execute
} else {
  // Read phases/02-lite-execute.md and execute
}
```

## Compact Recovery (Phase Persistence)

Multi-phase execution (multi-cli-plan → lite-execute) spans long conversations. Uses **双重保险**: TodoWrite 跟踪 active phase 保护其不被压缩，sentinel 作为兜底。

> **⚠️ COMPACT DIRECTIVE**: Context compression MUST check TodoWrite phase status.
> The phase currently marked `in_progress` is the active execution phase — preserve its FULL content.
> Only compress phases marked `completed` or `pending`.

## Execution Flow

### Plan Mode (workflow-multi-cli-plan)

```
1. Collect preferences via AskUserQuestion (autoYes)
2. Enhance prompt with project context availability
3. Read phases/01-multi-cli-plan.md
4. Execute multi-cli-plan pipeline (Phase 1-5 within the phase doc)
5. Phase 5 directly reads and executes Phase 2 (lite-execute) with executionContext
```

### Execute Mode (workflow:lite-execute)

```
1. Collect preferences via AskUserQuestion (autoYes)
2. Enhance prompt with project context availability
3. Read phases/02-lite-execute.md
4. Execute lite-execute pipeline (input detection → execution → review)
```

## Usage

Plan mode and execute mode are triggered by skill name routing (see Mode Detection). Workflow preferences (auto mode) are collected interactively via AskUserQuestion before dispatching to phases.

**Plan mode**: Task description provided as arguments → interactive preference collection → multi-CLI planning pipeline
**Execute mode**: Task description, file path, or in-memory context → interactive preference collection → execution pipeline

## Phase Reference Documents

| Phase | Document | Purpose | Compact |
|-------|----------|---------|---------|
| 1 | [phases/01-multi-cli-plan.md](phases/01-multi-cli-plan.md) | Complete multi-CLI planning pipeline: ACE context, iterative discussion, options, user decision, plan generation, handoff | TodoWrite 驱动 |
| 2 | [phases/02-lite-execute.md](phases/02-lite-execute.md) | Complete execution engine: input modes, task grouping, batch execution, code review | TodoWrite 驱动 + 🔄 sentinel |

**Compact Rules**:
1. **TodoWrite `in_progress`** → 保留完整内容，禁止压缩
2. **TodoWrite `completed`** → 可压缩为摘要
3. **🔄 sentinel fallback** → Phase 2 包含 compact sentinel；若 compact 后仅存 sentinel 而无完整 Step 协议，必须立即 `Read("phases/02-lite-execute.md")` 恢复
