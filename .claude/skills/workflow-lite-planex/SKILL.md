---
name: workflow-lite-planex
description: Lightweight planning and execution skill (Phase 1: plan, Phase 2: execute). Triggers on "workflow-lite-planex".
allowed-tools: Skill, Task, AskUserQuestion, TodoWrite, Read, Write, Edit, Bash, Glob, Grep
---

# Workflow Lite-Planex

Unified lightweight planning and execution skill (planex = plan + execute). Phase 1 handles planning pipeline, Phase 2 handles execution.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  SKILL.md (Prompt Enhancement + Dispatch)             │
│  → Enhance prompt → Dispatch to Phase 1 (lite-plan)  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ↓
     ┌───────────┐           ┌───────────┐
     │ lite-plan │           │lite-execute│
     │ Phase 1   │──handoff─→│ Phase 2    │
     │ Plan      │           │ Execute    │
     └───────────┘           └───────────┘
```

## Compact Recovery (Phase Persistence)

Multi-phase execution (lite-plan → lite-execute) spans long conversations that trigger context compression. Uses **双重保险**: TodoWrite 跟踪 active phase 保护其不被压缩，sentinel 作为兜底。

> **⚠️ COMPACT DIRECTIVE**: Context compression MUST check TodoWrite phase status.
> The phase currently marked `in_progress` is the active execution phase — preserve its FULL content.
> Only compress phases marked `completed` or `pending`.

## Routing

Trigger `workflow-lite-planex` → dispatches to Phase 1 (lite-plan). Phase 1 internally hands off to Phase 2 (lite-execute) after plan confirmation.

| Phase | Document | Description |
|-------|----------|-------------|
| Phase 1 | [phases/01-lite-plan.md](phases/01-lite-plan.md) | Planning pipeline (explore → plan → confirm → handoff to Phase 2) |
| Phase 2 | [phases/02-lite-execute.md](phases/02-lite-execute.md) | Execution engine (internal, called by Phase 1 LP-Phase 5) |

## Interactive Preference Collection

Before dispatching, collect workflow preferences via AskUserQuestion:

```javascript
// ★ 统一 auto mode 检测：-y/--yes 从 $ARGUMENTS 或 ccw 传播
const autoYes = /\b(-y|--yes)\b/.test($ARGUMENTS)

if (autoYes) {
  // 自动模式：跳过所有询问，使用默认值
  workflowPreferences = { autoYes: true, forceExplore: false }
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
      },
      {
        question: "是否强制执行代码探索阶段？",
        header: "Exploration",
        multiSelect: false,
        options: [
          { label: "Auto-detect (Recommended)", description: "智能判断是否需要探索" },
          { label: "Force explore", description: "强制执行代码探索" }
        ]
      }
    ]
  })
  workflowPreferences = {
    autoYes: prefResponse.autoMode === 'Auto',
    forceExplore: prefResponse.exploration === 'Force explore'
  }
}
```

**workflowPreferences** is passed to phase execution as context variable, referenced as `workflowPreferences.autoYes` and `workflowPreferences.forceExplore` within phases.

## Prompt Enhancement

After collecting preferences, enhance context and dispatch:

```javascript
// Step 1: Load project context via ccw spec
Bash('ccw spec load --category planning')

// Step 2: Log available context
console.log('Project context loaded via: ccw spec load --category planning')

// Step 3: Dispatch to Phase 1 (workflowPreferences available as context)
// Read phases/01-lite-plan.md and execute
// Phase 1 internally hands off to Phase 2 (lite-execute) after plan confirmation
```

## Execution Flow

### Plan Mode

```
1. Collect preferences via AskUserQuestion (autoYes, forceExplore)
2. Enhance prompt with project context availability
3. Read phases/01-lite-plan.md
4. Execute lite-plan pipeline (LP-Phase 1-5 within the phase doc)
5. lite-plan LP-Phase 5 directly reads and executes Phase 2 (lite-execute) with executionContext
```

## Usage

Task description provided as arguments → interactive preference collection → planning pipeline → execution.

**Plan mode only**: lite-plan handles planning (Phase 1) and automatically hands off to lite-execute (Phase 2) for execution. There is no standalone execute mode.

## Phase Reference Documents

| Phase | Document | Purpose | Compact |
|-------|----------|---------|---------|
| 1 | [phases/01-lite-plan.md](phases/01-lite-plan.md) | Complete planning pipeline: exploration, clarification, planning, confirmation, handoff | TodoWrite 驱动 |
| 2 | [phases/02-lite-execute.md](phases/02-lite-execute.md) | Complete execution engine: input modes, task grouping, batch execution, code review | TodoWrite 驱动 + 🔄 sentinel |

**Compact Rules**:
1. **TodoWrite `in_progress`** → 保留完整内容，禁止压缩
2. **TodoWrite `completed`** → 可压缩为摘要
3. **🔄 sentinel fallback** → Phase 2 包含 compact sentinel；若 compact 后仅存 sentinel 而无完整 Step 协议，必须立即 `Read("phases/02-lite-execute.md")` 恢复
