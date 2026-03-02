---
name: team-planex
description: Unified team skill for plan-and-execute pipeline. Uses team-worker agent architecture with role-spec files for domain logic. Coordinator orchestrates pipeline, workers are team-worker agents. Triggers on "team planex".
allowed-tools: TeamCreate(*), TeamDelete(*), SendMessage(*), TaskCreate(*), TaskUpdate(*), TaskList(*), TaskGet(*), Task(*), AskUserQuestion(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team PlanEx

Unified team skill: plan-and-execute pipeline for issue-based development. Built on **team-worker agent architecture** — all worker roles share a single agent definition with role-specific Phase 2-4 loaded from markdown specs.

> **Note**: This skill has its own coordinator implementation (`roles/coordinator/role.md`), independent of `team-lifecycle-v5`. It follows the same v5 architectural patterns (team-worker agents, role-specs, Spawn-and-Stop) but with a simplified 2-role pipeline (planner + executor) tailored for plan-and-execute workflows.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Skill(skill="team-planex", args="需求描述")  │
└──────────────────┬──────────────────────────┘
                   │ Always → coordinator
                   ↓
          ┌──────────────┐
          │  coordinator  │  Phase 1-5 + dispatch/monitor commands
          └───┬──────┬───┘
              │      │
              ↓      ↓
     ┌──────────┐  ┌──────────┐
     │ planner   │  │ executor  │   team-worker agents
     │ PLAN-*    │  │ EXEC-*    │   with role-spec injection
     └──────────┘  └──────────┘
```

## Role Router

This skill is **coordinator-only**. Workers do NOT invoke this skill — they are spawned as `team-worker` agents directly.

### Input Parsing

Parse `$ARGUMENTS`. No `--role` needed — always routes to coordinator.

Optional flags: `--exec` (execution method), `-y`/`--yes` (auto mode).

### Role Registry

| Role | Spec | Task Prefix | Type | Inner Loop |
|------|------|-------------|------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | (none) | orchestrator | - |
| planner | [role-specs/planner.md](role-specs/planner.md) | PLAN-* | pipeline | true |
| executor | [role-specs/executor.md](role-specs/executor.md) | EXEC-* | pipeline | true |

### Dispatch

Always route to coordinator. Coordinator reads `roles/coordinator/role.md` and executes its phases.

### Orchestration Mode

User provides task description.

**Invocation**: `Skill(skill="team-planex", args="<task-description>")`

**Lifecycle**:
```
User provides task description
  -> coordinator Phase 1-3: Parse input -> TeamCreate -> Create task chain (dispatch)
  -> coordinator Phase 4: spawn planner worker (background) -> STOP
  -> Worker (team-worker agent) executes -> SendMessage callback -> coordinator advances
  -> Loop until pipeline complete -> Phase 5 report + completion action
```

**User Commands** (wake paused coordinator):

| Command | Action |
|---------|--------|
| `check` / `status` | Output execution status graph, no advancement |
| `resume` / `continue` | Check worker states, advance next step |
| `add <issue-ids or --text '...' or --plan path>` | Append new tasks to planner queue |

---

## Command Execution Protocol

When coordinator needs to execute a command (dispatch, monitor):

1. **Read the command file**: `roles/coordinator/commands/<command-name>.md`
2. **Follow the workflow** defined in the command file (Phase 2-4 structure)
3. **Commands are inline execution guides** - NOT separate agents or subprocesses
4. **Execute synchronously** - complete the command workflow before proceeding

---

## Input Types

支持 3 种输入方式:

| 输入类型 | 格式 | 示例 |
|----------|------|------|
| Issue IDs | 直接传入 ID | `ISS-20260215-001 ISS-20260215-002` |
| 需求文本 | `--text '...'` | `--text '实现用户认证模块'` |
| Plan 文件 | `--plan path` | `--plan plan/2026-02-15-auth.md` |

## Execution Method Selection

支持 3 种执行后端：

| Executor | 后端 | 适用场景 |
|----------|------|----------|
| `agent` | code-developer subagent | 简单任务、同步执行 |
| `codex` | `ccw cli --tool codex --mode write` | 复杂任务、后台执行 |
| `gemini` | `ccw cli --tool gemini --mode write` | 分析类任务、后台执行 |

### Selection Decision Table

| Condition | Execution Method |
|-----------|-----------------|
| `--exec=agent` specified | Agent |
| `--exec=codex` specified | Codex |
| `--exec=gemini` specified | Gemini |
| `-y` or `--yes` flag present | Auto (default Agent) |
| No flags (interactive) | AskUserQuestion -> user choice |
| Auto + task_count <= 3 | Agent |
| Auto + task_count > 3 | Codex |

---

## Coordinator Spawn Template

### v5 Worker Spawn (all roles)

When coordinator spawns workers, use `team-worker` agent with role-spec path:

```
Task({
  subagent_type: "team-worker",
  description: "Spawn <role> worker",
  team_name: <team-name>,
  name: "<role>",
  run_in_background: true,
  prompt: `## Role Assignment
role: <role>
role_spec: .claude/skills/team-planex/role-specs/<role>.md
session: <session-folder>
session_id: <session-id>
team_name: <team-name>
requirement: <task-description>
inner_loop: <true|false>
execution_method: <agent|codex|gemini>

Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 (task discovery) -> role-spec Phase 2-4 -> built-in Phase 5 (report).`
})
```

**Inner Loop roles** (planner, executor): Set `inner_loop: true`. The team-worker agent handles the loop internally.

---

## Pipeline Definitions

### Pipeline Diagram

```
Issue-based beat pipeline (逐 Issue 节拍)
═══════════════════════════════════════════════════
  PLAN-001 ──> [planner] issue-1 solution → EXEC-001
                         issue-2 solution → EXEC-002
                         ...
                         issue-N solution → EXEC-00N
                         all_planned signal

  EXEC-001 ──> [executor] implement issue-1
  EXEC-002 ──> [executor] implement issue-2
  ...
  EXEC-00N ──> [executor] implement issue-N
═══════════════════════════════════════════════════
```

### Cadence Control

**Beat model**: Event-driven Spawn-and-Stop. Each beat = coordinator wake -> process callback -> spawn next -> STOP.

```
Beat Cycle (Coordinator Spawn-and-Stop)
======================================================================
  Event                   Coordinator              Workers
----------------------------------------------------------------------
  用户调用 ----------> ┌─ Phase 1-3 ──────────┐
                       │  解析输入              │
                       │  TeamCreate            │
                       │  创建 PLAN-001         │
                       ├─ Phase 4 ─────────────┤
                       │  spawn planner ────────┼──> [planner] Phase 1-5
                       └─ STOP (idle) ──────────┘         │
                                                          │
  callback <─ planner issue_ready ────────────────────────┘
         ┌─ monitor.handleCallback ─┐
         │  检查新 EXEC-* 任务       │
         │  spawn executor ─────────┼──> [executor] Phase 1-5
         └─ STOP (idle) ───────────┘         │
                                              │
  callback <─ executor impl_complete ────────┘
         ┌─ monitor.handleCallback ─┐
         │  标记完成                  │
         │  检查下一个 ready task     │
         └─ spawn/STOP ────────────┘
======================================================================
```

**Checkpoints**:

| 触发条件 | 位置 | 行为 |
|----------|------|------|
| Planner 全部完成 | all_planned 信号 | Executor 完成剩余 EXEC-* 后结束 |
| Pipeline 停滞 | 无 ready + 无 running | Coordinator escalate to user |
| Executor 阻塞 | blocked > 2 tasks | Coordinator escalate to user |

### Task Metadata Registry

| Task ID | Role | Phase | Dependencies | Description |
|---------|------|-------|-------------|-------------|
| PLAN-001 | planner | planning | (none) | 初始规划：需求拆解、issue 创建、方案设计 |
| EXEC-001 | executor | execution | (created by planner at runtime) | 第一个 issue 的代码实现 |
| EXEC-N | executor | execution | (created by planner at runtime) | 第 N 个 issue 的代码实现 |

> 注: EXEC-* 任务由 planner 在运行时逐个创建（逐 Issue 节拍），不预先定义完整任务链。

---

## Completion Action

When the pipeline completes (all tasks done, coordinator Phase 5):

```javascript
if (autoYes) {
  // Auto mode: Archive & Clean without prompting
  completionAction = "Archive & Clean";
} else {
  AskUserQuestion({
    questions: [{
      question: "Team pipeline complete. What would you like to do?",
      header: "Completion",
      multiSelect: false,
      options: [
        { label: "Archive & Clean (Recommended)", description: "Archive session, clean up tasks and team resources" },
        { label: "Keep Active", description: "Keep session active for follow-up work or inspection" },
        { label: "Export Results", description: "Export deliverables to a specified location, then clean" }
      ]
    }]
  })
}
```

| Choice | Action |
|--------|--------|
| Archive & Clean | Update session status="completed" -> TeamDelete -> output final summary |
| Keep Active | Update session status="paused" -> output resume instructions |
| Export Results | AskUserQuestion for target path -> copy deliverables -> Archive & Clean |

---

## Session Directory

```
.workflow/.team/PEX-{slug}-{date}/
├── team-session.json           # Session state
├── artifacts/
│   └── solutions/              # Planner solution output per issue
│       ├── {issueId-1}.json
│       └── {issueId-N}.json
├── wisdom/                     # Cross-task knowledge
│   ├── learnings.md
│   ├── decisions.md
│   ├── conventions.md
│   └── issues.md
└── shared-memory.json          # Cross-role state
```

---

## Message Bus

每次 SendMessage 前，先调用 `mcp__ccw-tools__team_msg` 记录：

- 参数: operation="log", team=`<session-id>`, from=`<role>`, to=`<target-role>`, type=`<type>`, summary="[`<role>`] `<summary>`"
- **注意**: `team` 必须是 **session ID** (如 `PEX-project-2026-02-27`), 不是 team name.

**Message types by role**:

| Role | Types |
|------|-------|
| planner | `issue_ready`, `all_planned`, `error` |
| executor | `impl_complete`, `impl_failed`, `error` |

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Role spec file not found | Error with expected path (role-specs/<name>.md) |
| Command file not found | Fallback to inline execution in coordinator role.md |
| team-worker agent unavailable | Error: requires .claude/agents/team-worker.md |
| Planner issue planning failure | Retry once, then skip to next issue |
| Executor impl failure | Report to coordinator, continue with next EXEC-* task |
| Pipeline stall | Coordinator monitors, escalate to user |
| Completion action timeout | Default to Keep Active |
