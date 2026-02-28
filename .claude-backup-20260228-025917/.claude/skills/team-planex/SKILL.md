---
name: team-planex
description: Unified team skill for plan-and-execute pipeline. 2-member team (planner + executor) with wave pipeline for concurrent planning and execution. All roles invoke this skill with --role arg. Triggers on "team planex".
allowed-tools: TeamCreate(*), TeamDelete(*), SendMessage(*), TaskCreate(*), TaskUpdate(*), TaskList(*), TaskGet(*), Task(*), AskUserQuestion(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team PlanEx

2 成员边规划边执行团队。通过逐 Issue 节拍流水线实现 planner 和 executor 并行工作：planner 每完成一个 issue 的 solution 后立即创建 EXEC-* 任务（含中间产物文件路径），executor 从文件加载 solution 开始实现。所有成员通过 `--role=xxx` 路由。

## Architecture Overview

```
┌──────────────────────────────────────────────┐
│  Skill(skill="team-planex", args="--role=xxx") │
└────────────────┬─────────────────────────────┘
                 │ Role Router
         ┌───────┴───────┐
         ↓               ↓
    ┌─────────┐    ┌──────────┐
    │ planner │    │ executor │
    │ PLAN-*  │    │ EXEC-*   │
    └─────────┘    └──────────┘
```

**设计原则**: 只有 2 个角色，没有独立 coordinator。SKILL.md 入口承担轻量编排（创建团队、派发初始任务链），然后 planner 担任 lead 角色持续推进。

## Role Router

### Input Parsing

Parse `$ARGUMENTS` to extract `--role`. If absent -> Orchestration Mode (SKILL.md as lightweight coordinator).

Optional flags: `--team` (default: "planex"), `--exec` (execution method), `-y`/`--yes` (auto mode).

### Role Registry

| Role | File | Task Prefix | Type | Compact |
|------|------|-------------|------|---------|
| planner | [roles/planner.md](roles/planner.md) | PLAN-* | pipeline (lead) | **压缩后必须重读** |
| executor | [roles/executor.md](roles/executor.md) | EXEC-* | pipeline | 压缩后必须重读 |

> **COMPACT PROTECTION**: 角色文件是执行文档，不是参考资料。当 context compression 发生后，角色指令仅剩摘要时，**必须立即 `Read` 对应 role.md 重新加载后再继续执行**。不得基于摘要执行任何 Phase。

### Dispatch

1. Extract `--role` from arguments
2. If no `--role` -> Orchestration Mode (SKILL.md as lightweight coordinator)
3. Look up role in registry -> Read the role file -> Execute its phases
4. Unknown role -> Error with available role list: planner, executor

## Input Types

支持 3 种输入方式（通过 args 传入 planner）：

| 输入类型 | 格式 | 示例 |
|----------|------|------|
| Issue IDs | 直接传入 ID | `--role=planner ISS-20260215-001 ISS-20260215-002` |
| 需求文本 | `--text '...'` | `--role=planner --text '实现用户认证模块'` |
| Plan 文件 | `--plan path` | `--role=planner --plan plan/2026-02-15-auth.md` |

## Shared Infrastructure

### Role Isolation Rules

#### Output Tagging（强制）

所有角色的输出（SendMessage、team_msg）必须带 `[role_name]` 标识前缀。

#### Planner 边界

| 允许 | 禁止 |
|------|------|
| 需求拆解 (issue 创建) | 直接编写/修改代码 |
| 方案设计 (issue-plan-agent) | 调用 code-developer |
| 冲突检查 (inline files_touched) | 运行测试 |
| 创建 EXEC-* 任务 | git commit |
| 监控进度 (消息总线) | |

#### Executor 边界

| 允许 | 禁止 |
|------|------|
| 处理 EXEC-* 前缀的任务 | 创建 issue |
| 调用 code-developer 实现 | 修改 solution/queue |
| 运行测试验证 | 为 planner 创建 PLAN-* 任务 |
| git commit 提交 | 直接与用户交互 (AskUserQuestion) |
| SendMessage 给 planner | |

### Team Configuration

| Key | Value |
|-----|-------|
| name | planex |
| sessionDir | `.workflow/.team/PEX-{slug}-{date}/` |
| artifactsDir | `.workflow/.team/PEX-{slug}-{date}/artifacts/` |
| issueDataDir | `.workflow/issues/` |

### Message Bus

每次 SendMessage 前，先调用 `mcp__ccw-tools__team_msg` 记录：

- 参数: operation="log", team=`<session-id>`, from=`<role>`, to=`<target-role>`, type=`<type>`, summary="[`<role>`] `<summary>`", ref=`<file_path>`
- **注意**: `team` 必须是 **session ID** (如 `PEX-project-2026-02-27`), 不是 team name. 从任务描述的 `Session:` 字段提取.
- **CLI fallback**: 当 MCP 不可用时 -> `ccw team log --team <session-id> --from <role> --to <target> --type <type> --summary "[<role>] ..." --json`

**Message types by role**:

| Role | Types |
|------|-------|
| planner | `wave_ready`, `issue_ready`, `all_planned`, `error` |
| executor | `impl_complete`, `impl_failed`, `wave_done`, `error` |

### Task Lifecycle (Both Roles)

每个 worker 启动后执行相同的任务发现流程：

1. 调用 `TaskList()` 获取所有任务
2. 筛选: subject 匹配本角色前缀 + owner 是本角色 + status 为 pending + blockedBy 为空
3. 无任务 -> idle 等待
4. 有任务 -> `TaskGet` 获取详情 -> `TaskUpdate` 标记 in_progress
5. Phase 2-4: Role-specific (see roles/{role}.md)
6. Phase 5: Report + Loop

**Resume Artifact Check** (防止恢复后重复产出):
- 检查本任务的输出产物是否已存在
- 产物完整 -> 跳到 Phase 5 报告完成
- 产物不完整或不存在 -> 正常执行 Phase 2-4

---

## Wave Pipeline (逐 Issue 节拍)

```
Issue 1:  planner 规划 solution -> 写中间产物 -> 冲突检查 -> 创建 EXEC-* -> issue_ready
                ↓ (executor 立即开始)
Issue 2:  planner 规划 solution -> 写中间产物 -> 冲突检查 -> 创建 EXEC-* -> issue_ready
                ↓ (executor 并行消费)
Issue N:  ...
Final:    planner 发送 all_planned -> executor 完成剩余 EXEC-* -> 结束
```

**节拍规则**:
- planner 每完成一个 issue 的 solution 后，**立即**创建 EXEC-* 任务并发送 `issue_ready` 信号
- solution 写入中间产物文件（`artifacts/solutions/{issueId}.json`），EXEC-* 任务包含 `solution_file` 路径
- executor 从文件加载 solution（无需再调 `ccw issue solution`），fallback 兼容旧模式
- planner 不等待 executor，持续推进下一个 issue
- 当 planner 发送 `all_planned` 消息后，executor 完成所有剩余任务即可结束

## Execution Method Selection

在编排模式或直接调用 executor 前，**必须先确定执行方式**。支持 3 种执行后端：

| Executor | 后端 | 适用场景 |
|----------|------|----------|
| `agent` | code-developer subagent | 简单任务、同步执行 |
| `codex` | `ccw cli --tool codex --mode write` | 复杂任务、后台执行 |
| `gemini` | `ccw cli --tool gemini --mode write` | 分析类任务、后台执行 |

### Selection Decision Table

| Condition | Execution Method | Code Review |
|-----------|-----------------|-------------|
| `--exec=agent` specified | Agent | Skip |
| `--exec=codex` specified | Codex | Skip |
| `--exec=gemini` specified | Gemini | Skip |
| `-y` or `--yes` flag present | Auto (default Agent) | Skip |
| No flags (interactive) | AskUserQuestion -> user choice | AskUserQuestion -> user choice |
| Auto + task_count <= 3 | Agent | Skip |
| Auto + task_count > 3 | Codex | Skip |

### Interactive Prompt (no flags)

当无 `-y`/`--yes` 且无 `--exec` 时，通过 AskUserQuestion 交互选择：

- **执行方式选项**: Agent / Codex / Gemini / Auto
- **代码审查选项**: Skip / Gemini Review / Codex Review / Agent Review

### 通过 args 指定

```bash
# 显式指定
Skill(skill="team-planex", args="--exec=codex ISS-xxx")
Skill(skill="team-planex", args="--exec=agent --text '简单功能'")

# Auto 模式（跳过交互，-y 或 --yes）
Skill(skill="team-planex", args="-y --text '添加日志'")
```

---

## Orchestration Mode

当不带 `--role` 调用时，SKILL.md 进入轻量编排模式（无独立 coordinator 角色，SKILL.md 自身承担编排）。

**Invocation**: `Skill(skill="team-planex", args="任务描述")`

**Lifecycle**:

```
用户提供任务描述
  -> SKILL.md 解析输入（Issue IDs / 需求文本 / Plan 文件）
  -> 初始化 sessionDir + artifacts 目录
  -> 执行方式选择（见 Execution Method Selection）
  -> 创建 PLAN-001 任务（owner: planner）
  -> Spawn planner agent (后台)
  -> Spawn executor agent (后台)
  -> 返回（planner lead 后续推进）
```

**User Commands** (唤醒 / 检查状态):

| Command | Action |
|---------|--------|
| `check` / `status` | 输出执行状态图，不推进 |
| `resume` / `continue` | 检查 worker 状态，推进下一步 |
| `add <issue-ids or --text '...' or --plan path>` | 追加新任务到 planner 队列，不影响已有任务 |

**`add` 命令处理逻辑**:

1. 解析输入（Issue IDs / `--text` / `--plan`）
2. 获取当前最大 PLAN-* 序号（`TaskList` 筛选 `PLAN-*` prefix），计算下一个序号 N
3. `TaskCreate({ subject: "PLAN-00N: ...", owner: "planner", status: "pending" })`，description 写入新 issue IDs 或需求文本
4. 若 planner 已发送 `all_planned`（检查 team_msg 日志），额外 `SendMessage` 通知 planner 有新任务，使其重新进入 Loop Check
5. 若 executor 已退出等待，同样发送消息唤醒 executor 继续轮询 `EXEC-*` 任务

### Coordinator Spawn Template

SKILL.md 编排模式 spawn workers 时使用后台模式 (Spawn-and-Go):

**Planner Spawn**:

```
Task({
  subagent_type: "general-purpose",
  description: "Spawn planner worker",
  team_name: <team-name>,
  name: "planner",
  run_in_background: true,
  prompt: `你是 team "<team-name>" 的 PLANNER。

## 首要指令
你的所有工作必须通过调用 Skill 获取角色定义后执行：
Skill(skill="team-planex", args="--role=planner")

当前输入: <planner-input>
Session: <session-dir>

## 执行配置
executor 的执行方式: <execution-method>
创建 EXEC-* 任务时，description 中包含:
  execution_method: <method>
  code_review: <review-tool>

## 中间产物（必须）
每个 issue 的 solution 写入: <session-dir>/artifacts/solutions/{issueId}.json
EXEC-* 任务 description 必须包含 solution_file 字段指向该文件
每完成一个 issue 立即发送 issue_ready 消息并创建 EXEC-* 任务

## 角色准则
- 只处理 PLAN-* 任务，不执行其他角色工作
- 所有输出带 [planner] 标识前缀
- 仅与 coordinator 通信
- 不使用 TaskCreate 为其他角色创建任务（EXEC-* 除外）
- 每次 SendMessage 前先调用 mcp__ccw-tools__team_msg 记录

## 工作流程
1. 调用 Skill -> 获取角色定义和执行逻辑
2. 按 role.md 5-Phase 流程执行
3. team_msg + SendMessage 结果给 coordinator
4. TaskUpdate completed -> 检查下一个任务`
})
```

**Executor Spawn**:

```
Task({
  subagent_type: "general-purpose",
  description: "Spawn executor worker",
  team_name: <team-name>,
  name: "executor",
  run_in_background: true,
  prompt: `你是 team "<team-name>" 的 EXECUTOR。

## 首要指令
你的所有工作必须通过调用 Skill 获取角色定义后执行：
Skill(skill="team-planex", args="--role=executor")

## 执行配置
默认执行方式: <execution-method>
代码审查: <review-tool>
（每个 EXEC-* 任务 description 中可能包含 execution_method 覆盖）

## Solution 加载
优先从 EXEC-* 任务 description 中的 solution_file 路径读取 solution JSON 文件
无 solution_file 时 fallback 到 ccw issue solution 命令

## 角色准则
- 只处理 EXEC-* 任务，不执行其他角色工作
- 所有输出带 [executor] 标识前缀
- 根据 execution_method 选择执行后端（Agent/Codex/Gemini）
- 仅与 coordinator 通信
- 每次 SendMessage 前先调用 mcp__ccw-tools__team_msg 记录

## 工作流程
1. 调用 Skill -> 获取角色定义和执行逻辑
2. 按 role.md 5-Phase 流程执行
3. team_msg + SendMessage 结果给 coordinator
4. TaskUpdate completed -> 检查下一个任务`
})
```

---

## Cadence Control

**节拍模型**: Wave beat -- planner 持续推进，executor 并行消费。每个 wave = planner 完成一个 issue -> executor 开始实现。

```
Wave Beat Cycle (逐 Issue 节拍)
===================================================================
  Event                    SKILL.md (编排)         Workers
-------------------------------------------------------------------
  用户调用 ---------> ┌─ 解析输入 ─────────┐
                      │  初始化 session      │
                      │  选择执行方式         │
                      ├─ 创建 PLAN-001 ─────┤
                      │  spawn planner ──────┼──> [Planner] Phase 1-5
                      │  spawn executor ─────┼──> [Executor] Phase 1 (idle)
                      └─ 返回 (编排结束) ───┘         │
                                                       │
  Wave 1:                                    Planner: issue-1 solution
                                             -> 写产物 -> 创建 EXEC-001
                                             -> issue_ready ---------> Executor 开始 EXEC-001
  Wave 2:                                    Planner: issue-2 solution
                                             -> 写产物 -> 创建 EXEC-002
                                             -> issue_ready ---------> Executor 并行消费
  ...
  Wave N:                                    Planner: all_planned
                                             Executor: 完成剩余 EXEC-*
===================================================================
```

**Pipeline 节拍视图**:

```
Wave pipeline (planner lead, executor follows)
──────────────────────────────────────────────────────────
Wave   1        2        3       ...      N       Final
       │        │        │                │         │
       P:iss-1  P:iss-2  P:iss-3         P:iss-N   P:all_planned
       ↓        ↓        ↓               ↓         ↓
       E:exec1  E:exec2  E:exec3         E:execN   E:finish
                │        │
         (并行消费，executor 不等 planner 全部完成)

P=planner  E=executor
```

**检查点 (Checkpoint)**:

| 触发条件 | 位置 | 行为 |
|----------|------|------|
| Planner 全部完成 | all_planned 信号 | Executor 完成剩余 EXEC-* 后结束 |
| Pipeline 停滞 | 无 ready + 无 running | Planner 检查并 escalate to user |
| Executor 阻塞 | Executor blocked > 2 tasks | Planner escalate to user |

**Stall 检测**:

| 检查项 | 条件 | 处理 |
|--------|------|------|
| Executor 无响应 | in_progress EXEC-* 无回调 | 报告等待中的任务列表 |
| Pipeline 死锁 | 无 ready + 无 running + 有 pending | 检查 blockedBy 依赖链 |
| Planner 规划失败 | issue planning error | Retry once, then skip to next issue |

---

## Task Metadata Registry

| Task ID | Role | Phase | Dependencies | Description |
|---------|------|-------|-------------|-------------|
| PLAN-001 | planner | planning | (none) | 初始规划：需求拆解、issue 创建、方案设计 |
| EXEC-001 | executor | execution | PLAN-001 (implicit via issue_ready) | 第一个 issue 的代码实现 |
| EXEC-002 | executor | execution | (planner issue_ready) | 第二个 issue 的代码实现 |
| EXEC-N | executor | execution | (planner issue_ready) | 第 N 个 issue 的代码实现 |

> 注: EXEC-* 任务由 planner 在运行时逐个创建（逐 Issue 节拍），不预先定义完整任务链。

---

## Wisdom Accumulation (所有角色)

跨任务知识积累。SKILL.md 编排模式在 session 初始化时创建 `wisdom/` 目录。

**目录**:
```
<session-folder>/wisdom/
├── learnings.md      # 模式和洞察
├── decisions.md      # 架构和设计决策
├── conventions.md    # 代码库约定
└── issues.md         # 已知风险和问题
```

**Worker 加载** (Phase 2): 从 task description 提取 `Session: <path>`, 读取 wisdom 目录下各文件。
**Worker 贡献** (Phase 4/5): 将本任务发现写入对应 wisdom 文件。

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

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown --role value | Error with available role list: planner, executor |
| Missing --role arg | Enter orchestration mode (SKILL.md as lightweight coordinator) |
| Role file not found | Error with expected path (roles/{name}.md) |
| Planner issue planning failure | Retry once, then report error and skip to next issue |
| Executor impl failure | Report to planner, continue with next EXEC-* task |
| No EXEC-* tasks yet | Executor idles, polls for new tasks |
| Pipeline stall | Planner monitors -- if executor blocked > 2 tasks, escalate to user |
