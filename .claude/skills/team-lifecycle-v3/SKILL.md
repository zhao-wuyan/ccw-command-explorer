---
name: team-lifecycle-v3
description: Unified team skill for full lifecycle - spec/impl/test. All roles invoke this skill with --role arg for role-specific execution. Triggers on "team lifecycle".
allowed-tools: TeamCreate(*), TeamDelete(*), SendMessage(*), TaskCreate(*), TaskUpdate(*), TaskList(*), TaskGet(*), Task(*), AskUserQuestion(*), TodoWrite(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team Lifecycle v3

Unified team skill: specification → implementation → testing → review. All team members invoke with `--role=xxx` to route to role-specific execution.

## Architecture

```
┌───────────────────────────────────────────────────┐
│  Skill(skill="team-lifecycle-v3")                 │
│  args="任务描述" 或 args="--role=xxx"             │
└───────────────────┬───────────────────────────────┘
                    │ Role Router
         ┌──── --role present? ────┐
         │ NO                      │ YES
         ↓                         ↓
  Orchestration Mode         Role Dispatch
  (auto → coordinator)      (route to role.md)
         │
    ┌────┴────┬───────┬───────┬───────┬───────┬───────┬───────┐
    ↓         ↓       ↓       ↓       ↓       ↓       ↓       ↓
 coordinator analyst writer discussant planner executor tester reviewer
                                                  ↑           ↑
                                         on-demand by coordinator
                                       ┌──────────┐ ┌─────────┐
                                       │ explorer │ │architect│
                                       └──────────┘ └─────────┘
                                       ┌──────────────┐ ┌──────┐
                                       │ fe-developer │ │fe-qa │
                                       └──────────────┘ └──────┘
```

## Role Router

### Input Parsing

Parse `$ARGUMENTS` to extract `--role`. If absent → Orchestration Mode (auto route to coordinator).

### Role Registry

| Role | File | Task Prefix | Type | Compact |
|------|------|-------------|------|---------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | (none) | orchestrator | **⚠️ 压缩后必须重读** |
| analyst | [roles/analyst/role.md](roles/analyst/role.md) | RESEARCH-* | pipeline | 压缩后必须重读 |
| writer | [roles/writer/role.md](roles/writer/role.md) | DRAFT-* | pipeline | 压缩后必须重读 |
| discussant | [roles/discussant/role.md](roles/discussant/role.md) | DISCUSS-* | pipeline | 压缩后必须重读 |
| planner | [roles/planner/role.md](roles/planner/role.md) | PLAN-* | pipeline | 压缩后必须重读 |
| executor | [roles/executor/role.md](roles/executor/role.md) | IMPL-* | pipeline | 压缩后必须重读 |
| tester | [roles/tester/role.md](roles/tester/role.md) | TEST-* | pipeline | 压缩后必须重读 |
| reviewer | [roles/reviewer/role.md](roles/reviewer/role.md) | REVIEW-* + QUALITY-* | pipeline | 压缩后必须重读 |
| explorer | [roles/explorer/role.md](roles/explorer/role.md) | EXPLORE-* | service (on-demand) | 压缩后必须重读 |
| architect | [roles/architect/role.md](roles/architect/role.md) | ARCH-* | consulting (on-demand) | 压缩后必须重读 |
| fe-developer | [roles/fe-developer/role.md](roles/fe-developer/role.md) | DEV-FE-* | frontend pipeline | 压缩后必须重读 |
| fe-qa | [roles/fe-qa/role.md](roles/fe-qa/role.md) | QA-FE-* | frontend pipeline | 压缩后必须重读 |

> **⚠️ COMPACT PROTECTION**: 角色文件是执行文档，不是参考资料。当 context compression 发生后，角色指令仅剩摘要时，**必须立即 `Read` 对应 role.md 重新加载后再继续执行**。不得基于摘要执行任何 Phase。

### Dispatch

1. Extract `--role` from arguments
2. If no `--role` → route to coordinator (Orchestration Mode)
3. Look up role in registry → Read the role file → Execute its phases

### Orchestration Mode

When invoked without `--role`, coordinator auto-starts. User just provides task description.

**Invocation**: `Skill(skill="team-lifecycle-v3", args="任务描述")`

**Lifecycle**:
```
用户提供任务描述
  → coordinator Phase 1-3: 需求澄清 → TeamCreate → 创建任务链
  → coordinator Phase 4: spawn 首批 worker (后台) → STOP
  → Worker 执行 → SendMessage 回调 → coordinator 推进下一步
  → 循环直到 pipeline 完成 → Phase 5 汇报
```

**User Commands** (唤醒已暂停的 coordinator):

| Command | Action |
|---------|--------|
| `check` / `status` | 输出执行状态图，不推进 |
| `resume` / `continue` | 检查 worker 状态，推进下一步 |

---

## Shared Infrastructure

以下模板适用于所有 worker 角色。每个 role.md 只需写 **Phase 2-4** 的角色特有逻辑。

### Worker Phase 1: Task Discovery (所有 worker 共享)

每个 worker 启动后执行相同的任务发现流程：

1. 调用 `TaskList()` 获取所有任务
2. 筛选: subject 匹配本角色前缀 + owner 是本角色 + status 为 pending + blockedBy 为空
3. 无任务 → idle 等待
4. 有任务 → `TaskGet` 获取详情 → `TaskUpdate` 标记 in_progress

**Resume Artifact Check** (防止恢复后重复产出):
- 检查本任务的输出产物是否已存在
- 产物完整 → 跳到 Phase 5 报告完成
- 产物不完整或不存在 → 正常执行 Phase 2-4

### Worker Phase 5: Report (所有 worker 共享)

任务完成后的标准报告流程:

1. **Message Bus**: 调用 `mcp__ccw-tools__team_msg` 记录消息
   - 参数: operation="log", team=<session-id>, from=<role>, to="coordinator", type=<消息类型>, summary="[<role>] <摘要>", ref=<产物路径>
   - **注意**: `team` 必须是 **session ID** (如 `TLS-project-2026-02-27`), 不是 team name. 从任务描述的 `Session:` 字段提取.
   - **CLI fallback**: 当 MCP 不可用时 → `ccw team log --team <session-id> --from <role> --to coordinator --type <type> --summary "[<role>] ..." --json`
2. **SendMessage**: 发送结果给 coordinator (content 和 summary 都带 `[<role>]` 前缀)
3. **TaskUpdate**: 标记任务 completed
4. **Loop**: 回到 Phase 1 检查下一个任务

### Wisdom Accumulation (所有角色)

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

### Role Isolation Rules

| 允许 | 禁止 |
|------|------|
| 处理自己前缀的任务 | 处理其他角色前缀的任务 |
| SendMessage 给 coordinator | 直接与其他 worker 通信 |
| 使用 Toolbox 中声明的工具 | 为其他角色创建任务 |
| 委派给 commands/ 中的命令 | 修改不属于本职责的资源 |

Coordinator 额外禁止: 直接编写/修改代码、调用实现类 subagent、直接执行分析/测试/审查。

---

## Pipeline Definitions

### Spec-only (12 tasks)

```
RESEARCH-001 → DISCUSS-001 → DRAFT-001 → DISCUSS-002
→ DRAFT-002 → DISCUSS-003 → DRAFT-003 → DISCUSS-004
→ DRAFT-004 → DISCUSS-005 → QUALITY-001 → DISCUSS-006
```

### Impl-only / Backend (4 tasks)

```
PLAN-001 → IMPL-001 → TEST-001 + REVIEW-001
```

### Full-lifecycle (16 tasks)

```
[Spec pipeline] → PLAN-001(blockedBy: DISCUSS-006) → IMPL-001 → TEST-001 + REVIEW-001
```

### Frontend Pipelines

```
FE-only:       PLAN-001 → DEV-FE-001 → QA-FE-001
               (GC loop: QA-FE verdict=NEEDS_FIX → DEV-FE-002 → QA-FE-002, max 2 rounds)

Fullstack:     PLAN-001 → IMPL-001 ∥ DEV-FE-001 → TEST-001 ∥ QA-FE-001 → REVIEW-001

Full + FE:     [Spec pipeline] → PLAN-001 → IMPL-001 ∥ DEV-FE-001 → TEST-001 ∥ QA-FE-001 → REVIEW-001
```

### Cadence Control

**节拍模型**: 事件驱动，每个 beat = coordinator 唤醒 → 处理 → spawn → STOP。

```
Beat Cycle (单次节拍)
═══════════════════════════════════════════════════════════
  Event                   Coordinator              Workers
───────────────────────────────────────────────────────────
  callback/resume ──→ ┌─ handleCallback ─┐
                      │  mark completed   │
                      │  check pipeline   │
                      ├─ handleSpawnNext ─┤
                      │  find ready tasks │
                      │  spawn workers ───┼──→ [Worker A] Phase 1-5
                      │  (parallel OK)  ──┼──→ [Worker B] Phase 1-5
                      └─ STOP (idle) ─────┘         │
                                                     │
  callback ←─────────────────────────────────────────┘
  (next beat)              SendMessage + TaskUpdate(completed)
═══════════════════════════════════════════════════════════
```

**Pipeline 节拍视图**:

```
Spec-only (12 beats, 严格串行)
──────────────────────────────────────────────────────────
Beat  1    2    3    4    5    6    7    8    9   10   11   12
      │    │    │    │    │    │    │    │    │    │    │    │
      R1 → D1 → W1 → D2 → W2 → D3 → W3 → D4 → W4 → D5 → Q1 → D6
      ▲                                                          ▲
   pipeline                                                  sign-off
    start                                                     pause

R=RESEARCH  D=DISCUSS  W=DRAFT(writer)  Q=QUALITY

Impl-only (3 beats, 含并行窗口)
──────────────────────────────────────────────────────────
Beat  1         2              3
      │         │         ┌────┴────┐
      PLAN → IMPL ──→ TEST ∥ REVIEW    ← 并行窗口
                         └────┬────┘
                           pipeline
                            done

Full-lifecycle (15 beats, spec→impl 过渡含检查点)
──────────────────────────────────────────────────────────
Beat 1-12: [Spec pipeline 同上]
                                    │
Beat 12 (D6 完成):          ⏸ CHECKPOINT ── 用户确认后 resume
                                    │
Beat 13     14           15
 PLAN  →  IMPL  →  TEST ∥ REVIEW

Fullstack (含双并行窗口)
──────────────────────────────────────────────────────────
Beat  1              2                    3                4
      │         ┌────┴────┐         ┌────┴────┐           │
      PLAN → IMPL ∥ DEV-FE → TEST ∥ QA-FE  →  REVIEW
              ▲                ▲                   ▲
         并行窗口 1       并行窗口 2          同步屏障
```

**检查点 (Checkpoint)**:

| 触发条件 | 位置 | 行为 |
|----------|------|------|
| Spec→Impl 过渡 | DISCUSS-006 完成后 | ⏸ 暂停，等待用户 `resume` 确认 |
| GC 循环上限 | QA-FE max 2 rounds | 超出轮次 → 停止迭代，报告当前状态 |
| Pipeline 停滞 | 无 ready + 无 running | 检查缺失任务，报告用户 |

**Stall 检测** (coordinator `handleCheck` 时执行):

| 检查项 | 条件 | 处理 |
|--------|------|------|
| Worker 无响应 | in_progress 任务无回调 | 报告等待中的任务列表，建议用户 `resume` |
| Pipeline 死锁 | 无 ready + 无 running + 有 pending | 检查 blockedBy 依赖链，报告卡点 |
| GC 循环超限 | DEV-FE / QA-FE 迭代 > max_rounds | 终止循环，输出最新 QA 报告 |

### Task Metadata Registry

| Task ID | Role | Phase | Dependencies | Description |
|---------|------|-------|-------------|-------------|
| RESEARCH-001 | analyst | spec | (none) | Seed analysis and context gathering |
| DISCUSS-001 | discussant | spec | RESEARCH-001 | Critique research findings |
| DRAFT-001 | writer | spec | DISCUSS-001 | Generate Product Brief |
| DISCUSS-002 | discussant | spec | DRAFT-001 | Critique Product Brief |
| DRAFT-002 | writer | spec | DISCUSS-002 | Generate Requirements/PRD |
| DISCUSS-003 | discussant | spec | DRAFT-002 | Critique Requirements/PRD |
| DRAFT-003 | writer | spec | DISCUSS-003 | Generate Architecture Document |
| DISCUSS-004 | discussant | spec | DRAFT-003 | Critique Architecture Document |
| DRAFT-004 | writer | spec | DISCUSS-004 | Generate Epics & Stories |
| DISCUSS-005 | discussant | spec | DRAFT-004 | Critique Epics |
| QUALITY-001 | reviewer | spec | DISCUSS-005 | 5-dimension spec quality validation |
| DISCUSS-006 | discussant | spec | QUALITY-001 | Final review discussion and sign-off |
| PLAN-001 | planner | impl | (none or DISCUSS-006) | Multi-angle exploration and planning |
| IMPL-001 | executor | impl | PLAN-001 | Code implementation |
| TEST-001 | tester | impl | IMPL-001 | Test-fix cycles |
| REVIEW-001 | reviewer | impl | IMPL-001 | 4-dimension code review |
| DEV-FE-001 | fe-developer | impl | PLAN-001 | Frontend implementation |
| QA-FE-001 | fe-qa | impl | DEV-FE-001 | 5-dimension frontend QA |

## Coordinator Spawn Template

When coordinator spawns workers, use background mode (Spawn-and-Stop):

```
Task({
  subagent_type: "general-purpose",
  description: "Spawn <role> worker",
  team_name: <team-name>,
  name: "<role>",
  run_in_background: true,
  prompt: `你是 team "<team-name>" 的 <ROLE>.

## 首要指令
你的所有工作必须通过调用 Skill 获取角色定义后执行：
Skill(skill="team-lifecycle-v3", args="--role=<role>")

当前需求: <task-description>
Session: <session-folder>

## 角色准则
- 只处理 <PREFIX>-* 任务，不执行其他角色工作
- 所有输出带 [<role>] 标识前缀
- 仅与 coordinator 通信
- 不使用 TaskCreate 为其他角色创建任务
- 每次 SendMessage 前先调用 mcp__ccw-tools__team_msg 记录

## 工作流程
1. 调用 Skill → 获取角色定义和执行逻辑
2. 按 role.md 5-Phase 流程执行
3. team_msg + SendMessage 结果给 coordinator
4. TaskUpdate completed → 检查下一个任务`
})
```

## Session Directory

```
.workflow/.team/TLS-<slug>-<date>/
├── team-session.json           # Session state
├── spec/                       # Spec artifacts
│   ├── spec-config.json
│   ├── discovery-context.json
│   ├── product-brief.md
│   ├── requirements/
│   ├── architecture/
│   ├── epics/
│   ├── readiness-report.md
│   └── spec-summary.md
├── discussions/                # Discussion records
├── plan/                       # Plan artifacts
│   ├── plan.json
│   └── .task/TASK-*.json
├── explorations/               # Explorer output (cached)
├── architecture/               # Architect assessments + design-tokens.json
├── analysis/                   # analyst design-intelligence.json (UI mode)
├── qa/                         # QA audit reports
├── wisdom/                     # Cross-task knowledge
│   ├── learnings.md
│   ├── decisions.md
│   ├── conventions.md
│   └── issues.md
├── .msg/                       # Team message bus logs (messages.jsonl)
└── shared-memory.json          # Cross-role state
```

## Session Resume

Coordinator supports `--resume` / `--continue` for interrupted sessions:

1. Scan `.workflow/.team/TLS-*/team-session.json` for active/paused sessions
2. Multiple matches → AskUserQuestion for selection
3. Audit TaskList → reconcile session state ↔ task status
4. Reset in_progress → pending (interrupted tasks)
5. Rebuild team and spawn needed workers only
6. Create missing tasks with correct blockedBy
7. Kick first executable task → Phase 4 coordination loop

## Shared Spec Resources

| Resource | Path | Usage |
|----------|------|-------|
| Document Standards | [specs/document-standards.md](specs/document-standards.md) | YAML frontmatter, naming, structure |
| Quality Gates | [specs/quality-gates.md](specs/quality-gates.md) | Per-phase quality gates |
| Product Brief Template | [templates/product-brief.md](templates/product-brief.md) | DRAFT-001 |
| Requirements Template | [templates/requirements-prd.md](templates/requirements-prd.md) | DRAFT-002 |
| Architecture Template | [templates/architecture-doc.md](templates/architecture-doc.md) | DRAFT-003 |
| Epics Template | [templates/epics-template.md](templates/epics-template.md) | DRAFT-004 |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown --role value | Error with available role list |
| Missing --role arg | Orchestration Mode → coordinator |
| Role file not found | Error with expected path |
| Command file not found | Fallback to inline execution |
