---
name: team-tech-debt
description: Unified team skill for tech debt identification and cleanup. All roles invoke this skill with --role arg for role-specific execution. Triggers on "team tech-debt", "tech debt cleanup", "技术债务".
allowed-tools: TeamCreate(*), TeamDelete(*), SendMessage(*), TaskCreate(*), TaskUpdate(*), TaskList(*), TaskGet(*), Task(*), AskUserQuestion(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team Tech Debt

技术债务识别与清理团队。融合"债务扫描"、"量化评估"、"治理规划"、"清理执行"、"验证回归"五大能力域，形成"扫描->评估->规划->清理->验证"闭环。通过 Scanner 多维度扫描、Executor-Validator 修复验证循环、共享债务清单数据库，实现渐进式技术债务治理。所有成员通过 `--role=xxx` 路由到角色执行逻辑。

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  Skill(skill="team-tech-debt", args="--role=xxx")         │
└────────────────────────┬─────────────────────────────────┘
                         │ Role Router
    ┌────────┬───────────┼───────────┬──────────┬──────────┐
    ↓        ↓           ↓           ↓          ↓          ↓
┌────────┐┌────────┐┌──────────┐┌─────────┐┌────────┐┌─────────┐
│coordi- ││scanner ││assessor  ││planner  ││executor││validator│
│nator   ││TDSCAN-*││TDEVAL-*  ││TDPLAN-* ││TDFIX-* ││TDVAL-*  │
│ roles/ ││ roles/ ││ roles/   ││ roles/  ││ roles/ ││ roles/  │
└────────┘└────────┘└──────────┘└─────────┘└────────┘└─────────┘
```

## Command Architecture

```
roles/
├── coordinator/
│   ├── role.md              # Pipeline 编排（模式选择、任务分发、监控）
│   └── commands/
│       ├── dispatch.md      # 任务链创建
│       └── monitor.md       # 进度监控
├── scanner/
│   ├── role.md              # 多维度技术债务扫描
│   └── commands/
│       └── scan-debt.md     # 多维度 CLI Fan-out 扫描
├── assessor/
│   ├── role.md              # 量化评估与优先级排序
│   └── commands/
│       └── evaluate.md      # 影响/成本矩阵评估
├── planner/
│   ├── role.md              # 治理方案规划
│   └── commands/
│       └── create-plan.md   # 分阶段治理方案生成
├── executor/
│   ├── role.md              # 债务清理执行
│   └── commands/
│       └── remediate.md     # 重构/清理/更新执行
└── validator/
    ├── role.md              # 清理结果验证
    └── commands/
        └── verify.md        # 回归测试与质量验证
```

**设计原则**: role.md 保留 Phase 1（Task Discovery）和 Phase 5（Report）内联。Phase 2-4 根据复杂度决定内联或委派到 `commands/*.md`。

## Role Router

### Input Parsing

Parse `$ARGUMENTS` to extract `--role` and optional `--agent-name`, `--team` (default: "tech-debt"), `--mode` (scan/remediate/targeted).

If no `--role` -> Orchestration Mode (auto route to coordinator).

### Role Registry

| Role | File | Task Prefix | Type | Compact |
|------|------|-------------|------|---------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | (none) | orchestrator | **压缩后必须重读** |
| scanner | [roles/scanner/role.md](roles/scanner/role.md) | TDSCAN-* | pipeline | 压缩后必须重读 |
| assessor | [roles/assessor/role.md](roles/assessor/role.md) | TDEVAL-* | pipeline | 压缩后必须重读 |
| planner | [roles/planner/role.md](roles/planner/role.md) | TDPLAN-* | pipeline | 压缩后必须重读 |
| executor | [roles/executor/role.md](roles/executor/role.md) | TDFIX-* | pipeline | 压缩后必须重读 |
| validator | [roles/validator/role.md](roles/validator/role.md) | TDVAL-* | pipeline | 压缩后必须重读 |

> **COMPACT PROTECTION**: 角色文件是执行文档，不是参考资料。当 context compression 发生后，角色指令仅剩摘要时，**必须立即 `Read` 对应 role.md 重新加载后再继续执行**。不得基于摘要执行任何 Phase。

### Dispatch

1. Extract `--role` from arguments
2. If no `--role` -> route to coordinator (Orchestration Mode)
3. Look up role in registry -> Read the role file -> Execute its phases
4. Unknown role -> Error with available role list: coordinator, scanner, assessor, planner, executor, validator

### Orchestration Mode

当不带 `--role` 调用时，自动进入 coordinator 编排模式。

**触发方式**:

- 用户调用（无 --role）: `Skill(skill="team-tech-debt", args="扫描并清理项目中的技术债务")`
- 等价于: `Skill(skill="team-tech-debt", args="--role=coordinator 扫描并清理项目中的技术债务")`

**完整调用链**:

```
用户: Skill(args="任务描述")
  │
  ├─ SKILL.md: 无 --role -> Orchestration Mode -> 读取 coordinator role.md
  │
  ├─ coordinator Phase 2: TeamCreate + 模式选择
  │   按 pipeline 阶段逐个 spawn worker（同步阻塞）
  │
  ├─ coordinator Phase 3: dispatch 任务链
  │
  ├─ worker 收到任务 -> Skill(args="--role=xxx") -> SKILL.md Role Router -> role.md
  │   每个 worker 自动获取:
  │   ├─ 角色定义 (role.md: identity, boundaries, message types)
  │   ├─ 可用命令 (commands/*.md)
  │   └─ 执行逻辑 (5-phase process)
  │
  └─ coordinator Phase 4-5: 监控 -> 结果汇报
```

**User Commands** (唤醒已暂停的 coordinator):

| Command | Action |
|---------|--------|
| `check` / `status` | 输出执行状态图，不推进 |
| `resume` / `continue` | 检查 worker 状态，推进下一步 |

---

## Shared Infrastructure

> 以下为编排级概览。具体实现代码（Message Bus、Task Lifecycle、工具方法）在各 role.md 中自包含。

### Team Configuration

| Key | Value |
|-----|-------|
| name | tech-debt |
| sessionDir | `.workflow/.team/TD-{slug}-{date}/` |
| sharedMemory | shared-memory.json |
| worktree.basePath | `.worktrees` |
| worktree.branchPrefix | `tech-debt/TD-` |
| worktree.autoCleanup | true (remove worktree after PR creation) |
| debtDimensions | code, architecture, testing, dependency, documentation |
| priorityMatrix.highImpact_lowCost | 立即修复 (Quick Win) |
| priorityMatrix.highImpact_highCost | 战略规划 (Strategic) |
| priorityMatrix.lowImpact_lowCost | 待办处理 (Backlog) |
| priorityMatrix.lowImpact_highCost | 暂缓接受 (Defer) |

### Role Isolation Rules

**核心原则**: 每个角色仅能执行自己职责范围内的工作。

#### Output Tagging（强制）

所有角色的输出必须带 `[role_name]` 标识前缀。

#### Coordinator 隔离

| 允许 | 禁止 |
|------|------|
| 需求澄清 (AskUserQuestion) | 直接扫描代码 |
| 创建任务链 (TaskCreate) | 直接执行重构或清理 |
| 模式选择 + 质量门控 | 直接评估或规划 |
| 监控进度 (消息总线) | 绕过 worker 自行完成 |

#### Worker 隔离

| 允许 | 禁止 |
|------|------|
| 处理自己前缀的任务 | 处理其他角色前缀的任务 |
| 读写 shared-memory.json (自己的字段) | 为其他角色创建任务 |
| SendMessage 给 coordinator | 直接与其他 worker 通信 |

### Worker Phase 1: Task Discovery (所有 worker 共享)

每个 worker 启动后执行相同的任务发现流程：

1. 调用 `TaskList()` 获取所有任务
2. 筛选: subject 匹配本角色前缀 + owner 是本角色 + status 为 pending + blockedBy 为空
3. 无任务 -> idle 等待
4. 有任务 -> `TaskGet` 获取详情 -> `TaskUpdate` 标记 in_progress

**Resume Artifact Check** (防止恢复后重复产出):
- 检查本任务的输出产物是否已存在
- 产物完整 -> 跳到 Phase 5 报告完成
- 产物不完整或不存在 -> 正常执行 Phase 2-4

### Worker Phase 5: Report (所有 worker 共享)

任务完成后的标准报告流程:

1. **Message Bus**: 调用 `mcp__ccw-tools__team_msg` 记录消息
   - 参数: operation="log", team=`<team-name>`, from=`<role>`, to="coordinator", type=`<消息类型>`, summary="[`<role>`] `<摘要>`", ref=`<产物路径>`
   - **CLI fallback**: 当 MCP 不可用时 -> `ccw team log --team <team> --from <role> --to coordinator --type <type> --summary "[<role>] ..." --json`
2. **SendMessage**: 发送结果给 coordinator (content 和 summary 都带 `[<role>]` 前缀)
3. **TaskUpdate**: 标记任务 completed
4. **Loop**: 回到 Phase 1 检查下一个任务

---

## Three-Mode Pipeline Architecture

```
Scan Mode (仅扫描评估):
  TDSCAN-001(并行多维度扫描+多视角Gemini分析) -> TDEVAL-001(量化评估) -> 报告

Remediate Mode (完整闭环):
  TDSCAN-001(并行扫描) -> TDEVAL-001(评估) -> TDPLAN-001(规划) -> [Plan Approval] -> [Create Worktree] -> TDFIX-001(修复,worktree) -> TDVAL-001(验证,worktree) -> [Commit+PR] -> 报告

Targeted Mode (定向修复):
  TDPLAN-001(规划) -> [Plan Approval] -> [Create Worktree] -> TDFIX-001(修复,worktree) -> TDVAL-001(验证,worktree) -> [Commit+PR] -> 报告
```

### TDSCAN Parallel Fan-out Architecture

```
TDSCAN-001 内部并行架构:

         ┌────────────────────────────────────────────────────┐
         │                  Scanner Worker                     │
         │                                                     │
         │  Fan-out A: Subagent Exploration (并行 cli-explore) │
         │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
         │  │structure  │ │patterns  │ │deps      │            │
         │  │角度       │ │角度      │ │角度      │             │
         │  └─────┬────┘ └─────┬────┘ └─────┬────┘            │
         │        └────────────┼────────────┘                  │
         │                     ↓ merge                         │
         │  Fan-out B: CLI Dimension Analysis (并行 gemini)    │
         │  ┌──────┐┌────────┐┌───────┐┌──────┐┌─────┐        │
         │  │code  ││arch    ││testing││deps  ││docs │         │
         │  └──┬───┘└───┬────┘└──┬────┘└──┬───┘└──┬──┘        │
         │     └────────┼────────┼────────┘       │            │
         │              ↓ merge                   │            │
         │  Fan-out C: Multi-Perspective Gemini (并行)         │
         │  ┌────────┐┌──────────┐┌───────┐┌─────────┐        │
         │  │security││perform.  ││quality││architect│         │
         │  └───┬────┘└────┬─────┘└──┬────┘└────┬────┘        │
         │      └──────────┼─────────┘          │              │
         │                 ↓ Fan-in aggregate                  │
         │            debt-inventory.json                      │
         └────────────────────────────────────────────────────┘
```

### Mode Auto-Detection

| Condition | Detected Mode |
|-----------|--------------|
| `--mode=scan` explicitly specified | scan |
| `--mode=remediate` explicitly specified | remediate |
| `--mode=targeted` explicitly specified | targeted |
| Task description contains: 扫描, scan, 审计, audit, 评估, assess | scan |
| Task description contains: 定向, targeted, 指定, specific, 修复已知 | targeted |
| Default (no match) | remediate |

### Fix-Verify Loop

```
TDFIX -> TDVAL -> (if regression or quality drop) -> TDFIX-fix -> TDVAL-2
                  (if all pass) -> report
```

---

## Coordinator Spawn Template

> **Note**: This skill uses Stop-Wait coordination (`run_in_background: false`). Each role completes before next spawns. This is intentionally different from the v3 default of `run_in_background: true` (Spawn-and-Stop). The Stop-Wait strategy ensures sequential pipeline execution where each phase's output is fully available before the next phase begins -- critical for the scan->assess->plan->execute->validate dependency chain.

> 以下模板作为 worker prompt 参考。在 Stop-Wait 策略下，coordinator 不在 Phase 2 预先 spawn 所有 worker。而是在 Phase 4 (monitor) 中，按 pipeline 阶段逐个 spawn worker（同步阻塞 `Task(run_in_background: false)`），worker 返回即阶段完成。详见 `roles/coordinator/commands/monitor.md`。

**通用 Worker Spawn 格式**:

```
Task({
  subagent_type: "general-purpose",
  description: "Spawn <role> worker",
  prompt: `你是 team "<team-name>" 的 <ROLE>.

## 首要指令（MUST）
你的所有工作必须通过调用 Skill 获取角色定义后执行，禁止自行发挥：
Skill(skill="team-tech-debt", args="--role=<role>")
此调用会加载你的角色定义（role.md）、可用命令（commands/*.md）和完整执行逻辑。

当前需求: <task-description>
约束: <constraints>

## 角色准则（强制）
- 你只能处理 <PREFIX>-* 前缀的任务，不得执行其他角色的工作
- 所有输出（SendMessage、team_msg）必须带 [<role>] 标识前缀
- 仅与 coordinator 通信，不得直接联系其他 worker
- 不得使用 TaskCreate 为其他角色创建任务

## 消息总线（必须）
每次 SendMessage 前，先调用 mcp__ccw-tools__team_msg 记录。

## 工作流程（严格按顺序）
1. 调用 Skill(skill="team-tech-debt", args="--role=<role>") 获取角色定义和执行逻辑
2. 按 role.md 中的 5-Phase 流程执行（TaskList -> 找到 <PREFIX>-* 任务 -> 执行 -> 汇报）
3. team_msg log + SendMessage 结果给 coordinator（带 [<role>] 标识）
4. TaskUpdate completed -> 检查下一个任务 -> 回到步骤 1`,
  run_in_background: false  // Stop-Wait: 同步阻塞，等待 worker 完成
})
```

**各角色 Spawn 参数**:

| Role | Prefix | Skill Args |
|------|--------|------------|
| scanner | TDSCAN-* | `--role=scanner` |
| assessor | TDEVAL-* | `--role=assessor` |
| planner | TDPLAN-* | `--role=planner` |
| executor | TDFIX-* | `--role=executor` |
| validator | TDVAL-* | `--role=validator` |

---

## Cadence Control

**节拍模型**: Sequential 5-beat -- 扫描->评估->规划->执行->验证，严格串行（Stop-Wait 策略）。

```
Sequential 5-Beat Cycle (Remediate Mode)
===================================================================
  Beat               Coordinator              Worker
-------------------------------------------------------------------
  Beat 1: SCAN    ┌─ spawn scanner ──────┐
                  │  run_in_background:   │
                  │  false (阻塞等待) ────┼──> [Scanner] Phase 1-5
                  │  scanner 返回 ────────┤        │
                  └─ 收到结果 ───────────┘  <──────┘
                       │
  Beat 2: ASSESS  ┌─ spawn assessor ─────┐
                  │  阻塞等待 ────────────┼──> [Assessor] Phase 1-5
                  └─ 收到结果 ───────────┘  <──────┘
                       │
  Beat 3: PLAN    ┌─ spawn planner ──────┐
                  │  阻塞等待 ────────────┼──> [Planner] Phase 1-5
                  └─ 收到结果 ───────────┘  <──────┘
                       │
                  ⏸ CHECKPOINT ── Plan Approval (用户确认)
                       │
  Beat 4: FIX     ┌─ Create Worktree ────┐
                  │  spawn executor ──────┼──> [Executor] Phase 1-5
                  │  阻塞等待 ────────────┤        │
                  └─ 收到结果 ───────────┘  <──────┘
                       │
  Beat 5: VALIDATE┌─ spawn validator ────┐
                  │  阻塞等待 ────────────┼──> [Validator] Phase 1-5
                  └─ 收到结果 ───────────┘  <──────┘
                       │
                  ┌─ Commit + PR ────────┐
                  └─ Final Report ───────┘
===================================================================
```

**Pipeline 节拍视图 (按模式)**:

```
Scan Mode (2 beats)
──────────────────────────────────────────────────────────
Beat  1          2
      │          │
      TDSCAN -> TDEVAL -> 报告

Remediate Mode (5 beats, 严格串行 + 检查点)
──────────────────────────────────────────────────────────
Beat  1       2        3       ⏸      4       5
      │       │        │       │       │       │
      SCAN -> EVAL -> PLAN -> [OK?] -> FIX -> VAL -> Report
                                ▲
                          Plan Approval

Targeted Mode (3 beats, 跳过扫描评估)
──────────────────────────────────────────────────────────
Beat  1       ⏸      2       3
      │       │       │       │
      PLAN -> [OK?] -> FIX -> VAL -> Report
```

**检查点 (Checkpoint)**:

| 触发条件 | 位置 | 行为 |
|----------|------|------|
| Plan Approval | TDPLAN 完成后 | 暂停，等待用户确认治理方案 |
| Fix-Verify Loop 上限 | TDVAL max 3 iterations | 超出轮次 -> 停止迭代，escalate to user |
| Pipeline 停滞 | Worker 无响应 | 报告等待中的任务列表 |

**Stall 检测** (coordinator monitor 时执行):

| 检查项 | 条件 | 处理 |
|--------|------|------|
| Worker 无响应 | in_progress 任务长时间无返回 | Stop-Wait 下不适用（同步阻塞） |
| Fix-Verify 循环超限 | TDFIX/TDVAL 迭代 > 3 rounds | 终止循环，输出最新验证报告 |
| Scanner 无债务 | debt-inventory 为空 | 报告 clean codebase，跳过后续阶段 |

---

## Task Metadata Registry

| Task ID | Role | Phase | Dependencies | Description |
|---------|------|-------|-------------|-------------|
| TDSCAN-001 | scanner | scan | (none) | 多维度技术债务扫描（并行 Fan-out） |
| TDEVAL-001 | assessor | assess | TDSCAN-001 | 量化评估与优先级排序 |
| TDPLAN-001 | planner | plan | TDEVAL-001 (or none in targeted) | 分阶段治理方案规划 |
| TDFIX-001 | executor | fix | TDPLAN-001 + Plan Approval | 债务清理执行（worktree） |
| TDVAL-001 | validator | validate | TDFIX-001 | 回归测试与质量验证 |
| TDFIX-002 | executor | fix (loop) | TDVAL-001 (if regression) | Fix-Verify 循环修复 |
| TDVAL-002 | validator | validate (loop) | TDFIX-002 | Fix-Verify 循环验证 |

---

## Wisdom Accumulation (所有角色)

跨任务知识积累。Coordinator 在 session 初始化时创建 `wisdom/` 目录。

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

## Unified Session Directory

```
.workflow/.team/TD-{slug}-{YYYY-MM-DD}/
├── team-session.json
├── shared-memory.json          # 债务清单 / 评估矩阵 / 治理方案 / 修复结果 / 验证结果 / worktree 信息
├── scan/                       # Scanner output
│   └── debt-inventory.json
├── assessment/                 # Assessor output
│   └── priority-matrix.json
├── plan/                       # Planner output
│   └── remediation-plan.md
├── fixes/                      # Executor output
│   └── fix-log.json
├── validation/                 # Validator output
│   └── validation-report.json
└── wisdom/                     # Cross-task knowledge
    ├── learnings.md
    ├── decisions.md
    ├── conventions.md
    └── issues.md

# shared-memory.json worktree 字段（TDFIX 前由 coordinator 写入）:
# {
#   ...
#   "worktree": {
#     "path": ".worktrees/TD-{slug}-{date}",
#     "branch": "tech-debt/TD-{slug}-{date}"
#   }
# }
```

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown --role value | Error with available role list: coordinator, scanner, assessor, planner, executor, validator |
| Missing --role arg | Orchestration Mode -> auto route to coordinator |
| Role file not found | Error with expected path (roles/{name}/role.md) |
| Command file not found | Fall back to inline execution in role.md |
| Task prefix conflict | Log warning, proceed |
| Scanner finds no debt | Report clean codebase, skip to summary |
| Fix introduces regression | Trigger Fix-Verify loop (max 3 iterations) |
| Validation repeatedly fails | Escalate to user with diagnosis |
