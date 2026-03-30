# Team Lifecycle v4 — Codex 迁移计划

## 目标

将 Claude Code 版 `.claude/skills/team-lifecycle-v4` 迁移到 Codex 版 `.codex/skills/team-lifecycle-v4`，采用 **通用 worker + role 文档注入** 模式（与 Claude Code 设计对齐），去掉 `spawn_agents_on_csv`，用 `spawn_agent` + `wait_agent` + `send_input` + `close_agent` 实现同构编排。

## 设计原则

1. **通用 agent，role 文档区分角色** — 只定义 2 个 TOML（worker + supervisor），角色差异由 `roles/<role>/role.md` 决定
2. **role 文档直接复用** — `.claude/skills/` 中的 roles/specs/templates 原样迁移
3. **items 结构化传参** — 取代 message 字符串，分段传递角色分配、任务描述、上游上下文
4. **JSON 取代 CSV** — `tasks.json` 管理状态，`discoveries/{id}.json` 分文件写入
5. **两版同构** — Codex 调用原语与 Claude Code 形成 1:1 映射

## 平台调用映射

| 编排概念 | Claude Code | Codex |
|---------|------------|-------|
| Worker spawn | `Agent({ subagent_type: "team-worker", prompt })` | `spawn_agent({ agent_type: "tlv4_worker", items })` |
| Supervisor spawn | `Agent({ subagent_type: "team-supervisor", prompt })` | `spawn_agent({ agent_type: "tlv4_supervisor", items })` |
| Supervisor wake | `SendMessage({ recipient: "supervisor", content })` | `send_input({ id: supervisorId, items })` |
| Supervisor shutdown | `SendMessage({ type: "shutdown_request" })` | `close_agent({ target: supervisorId })` |
| 等待完成 | 后台回调 -> monitor.md | `wait_agent({ ids, timeout_ms })` |
| 任务状态 | `TaskCreate` / `TaskUpdate` | `tasks.json` 文件读写 |
| 团队管理 | `TeamCreate` / `TeamDelete` | session folder init / cleanup |
| 消息总线 | `mcp__ccw-tools__team_msg` | `discoveries/{id}.json` + `session-state.json` |
| 用户交互 | `AskUserQuestion` | `request_user_input` |
| 角色加载 | prompt 中 `@roles/<role>/role.md` | items text 中指示 `Read roles/<role>/role.md` |

## 目录结构 (迁移后)

```
.codex/
├── agents/
│   ├── tlv4-worker.toml                 # 通用 worker (NEW)
│   └── tlv4-supervisor.toml             # 驻留 supervisor (NEW)
└── skills/
    └── team-lifecycle-v4/
        ├── SKILL.md                     # 主编排 (REWRITE)
        ├── MIGRATION-PLAN.md            # 本文档
        ├── roles/                       # 从 .claude/ 复制
        │   ├── coordinator/
        │   │   ├── role.md
        │   │   └── commands/
        │   │       ├── analyze.md
        │   │       ├── dispatch.md
        │   │       └── monitor.md
        │   ├── analyst/role.md
        │   ├── writer/role.md
        │   ├── planner/role.md
        │   ├── executor/
        │   │   ├── role.md
        │   │   └── commands/
        │   │       ├── implement.md
        │   │       └── fix.md
        │   ├── tester/role.md
        │   ├── reviewer/
        │   │   ├── role.md
        │   │   └── commands/
        │   │       ├── review-code.md
        │   │       └── review-spec.md
        │   └── supervisor/role.md
        ├── specs/                       # 从 .claude/ 复制
        │   ├── pipelines.md
        │   ├── quality-gates.md
        │   └── knowledge-transfer.md
        ├── templates/                   # 从 .claude/ 复制
        │   ├── product-brief.md
        │   ├── requirements.md
        │   ├── architecture.md
        │   └── epics.md
        └── schemas/
            └── tasks-schema.md          # REWRITE: CSV -> JSON
```

---

## 步骤 1: Agent TOML 定义

### `.codex/agents/tlv4-worker.toml`

```toml
name = "tlv4_worker"
description = "Generic team-lifecycle-v4 worker. Role-specific behavior loaded from role.md at spawn time."
model = "gpt-5.4"
model_reasoning_effort = "high"
sandbox_mode = "workspace-write"

developer_instructions = """
You are a team-lifecycle-v4 worker agent.

## Boot Protocol
1. Read role_spec file path from your task assignment (MUST read first)
2. Read session state from session path
3. Execute role-specific Phase 2-4 defined in role.md
4. Write deliverables to session artifacts directory
5. Write findings to discoveries/{task_id}.json
6. Report via report_agent_job_result

## Output Schema
{
  "id": "<task_id>",
  "status": "completed | failed",
  "findings": "<max 500 chars>",
  "quality_score": "<0-100, reviewer only>",
  "supervision_verdict": "",
  "error": ""
}
"""
```

### `.codex/agents/tlv4-supervisor.toml`

```toml
name = "tlv4_supervisor"
description = "Resident supervisor for team-lifecycle-v4. Woken via send_input for checkpoint verification."
model = "gpt-5.4"
model_reasoning_effort = "high"
sandbox_mode = "read-only"

developer_instructions = """
You are a team-lifecycle-v4 supervisor agent (resident pattern).

## Boot Protocol
1. Read role_spec file path from your task assignment (MUST read first)
2. Load baseline context from session
3. Report ready, wait for checkpoint requests via send_input

## Per Checkpoint
1. Read artifacts specified in checkpoint request
2. Verify cross-artifact consistency per role.md definitions
3. Issue verdict: pass (>= 0.8), warn (0.5-0.79), block (< 0.5)
4. Write report to artifacts/CHECKPOINT-{id}-report.md
5. Report findings

## Constraints
- Read-only: never modify artifacts
- Never issue pass when critical inconsistencies exist
- Never block for minor style issues
"""
```

---

## 步骤 2: SKILL.md 改写

### 核心变更

| 区域 | 现状 | 改写后 |
|------|------|--------|
| allowed-tools | `spawn_agents_on_csv, spawn_agent, wait, send_input, close_agent, ...` | `spawn_agent, wait_agent, send_input, close_agent, report_agent_job_result, Read, Write, Edit, Bash, Glob, Grep, request_user_input` |
| 执行模型 | hybrid: CSV wave (primary) + spawn_agent (secondary) | 统一: spawn_agent + wait_agent (all tasks) |
| 状态管理 | tasks.csv (CSV) | tasks.json (JSON) |
| 发现板 | discoveries.ndjson (共享追加) | discoveries/{task_id}.json (分文件) |
| exec_mode 分类 | csv-wave / interactive | 移除 — 所有任务统一用 spawn_agent |
| wave CSV 构建 | 生成 wave-{N}.csv, spawn_agents_on_csv | 循环 spawn_agent + 批量 wait_agent |

### Worker Spawn Template

```javascript
// 对齐 Claude Code 的 Agent({ subagent_type: "team-worker", prompt }) 模式
spawn_agent({
  agent_type: "tlv4_worker",
  items: [
    // 段 1: 角色分配 (对齐 Claude Code prompt 的 Role Assignment 块)
    { type: "text", text: `## Role Assignment
role: ${task.role}
role_spec: ${skillRoot}/roles/${task.role}/role.md
session: ${sessionFolder}
session_id: ${sessionId}
requirement: ${requirement}
inner_loop: ${hasInnerLoop(task.role)}` },

    // 段 2: 读取指示 (核心 — 保持 role 文档引用模式)
    { type: "text", text: `Read role_spec file (${skillRoot}/roles/${task.role}/role.md) to load Phase 2-4 domain instructions.
Execute built-in Phase 1 (task discovery) -> role Phase 2-4 -> built-in Phase 5 (report).` },

    // 段 3: 任务上下文
    { type: "text", text: `## Task Context
task_id: ${task.id}
title: ${task.title}
description: ${task.description}
pipeline_phase: ${task.pipeline_phase}` },

    // 段 4: 上游发现
    { type: "text", text: `## Upstream Context\n${task.prev_context}` }
  ]
})
```

### Supervisor Spawn Template

```javascript
// Spawn — 一次 (Phase 2 init, 对齐 Claude Code Agent({ subagent_type: "team-supervisor" }))
const supervisorId = spawn_agent({
  agent_type: "tlv4_supervisor",
  items: [
    { type: "text", text: `## Role Assignment
role: supervisor
role_spec: ${skillRoot}/roles/supervisor/role.md
session: ${sessionFolder}
session_id: ${sessionId}
requirement: ${requirement}

Read role_spec file (${skillRoot}/roles/supervisor/role.md) to load checkpoint definitions.
Init: load baseline context, report ready, go idle.
Wake cycle: orchestrator sends checkpoint requests via send_input.` }
  ]
})
```

### Supervisor Wake Template

```javascript
// 对齐 Claude Code SendMessage({ recipient: "supervisor", content })
send_input({
  id: supervisorId,
  items: [
    { type: "text", text: `## Checkpoint Request
task_id: ${task.id}
scope: [${task.deps}]
pipeline_progress: ${done}/${total} tasks completed` }
  ]
})
wait_agent({ targets: [supervisorId], timeout_ms: 300000 })
```

### Supervisor Shutdown

```javascript
// 对齐 Claude Code SendMessage({ type: "shutdown_request" })
close_agent({ target: supervisorId })
```

### Wave 执行引擎

```javascript
for (let wave = 1; wave <= maxWave; wave++) {
  const state = JSON.parse(Read(`${sessionFolder}/tasks.json`))
  const waveTasks = Object.values(state.tasks).filter(t => t.wave === wave && t.status === 'pending')

  // 跳过依赖失败的任务
  const executableTasks = []
  for (const task of waveTasks) {
    if (task.deps.some(d => ['failed', 'skipped'].includes(state.tasks[d]?.status))) {
      state.tasks[task.id].status = 'skipped'
      state.tasks[task.id].error = 'Dependency failed or skipped'
      continue
    }
    executableTasks.push(task)
  }

  // 构建 prev_context
  for (const task of executableTasks) {
    const contextParts = task.context_from
      .map(id => {
        const prev = state.tasks[id]
        if (prev?.status === 'completed' && prev.findings) {
          return `[Task ${id}: ${prev.title}] ${prev.findings}`
        }
        try {
          const disc = JSON.parse(Read(`${sessionFolder}/discoveries/${id}.json`))
          return `[Task ${id}] ${disc.findings || JSON.stringify(disc.key_findings || '')}`
        } catch { return null }
      })
      .filter(Boolean)
    task.prev_context = contextParts.join('\n') || 'No previous context available'
  }

  // 分离普通任务和 CHECKPOINT 任务
  const regularTasks = executableTasks.filter(t => !t.id.startsWith('CHECKPOINT-'))
  const checkpointTasks = executableTasks.filter(t => t.id.startsWith('CHECKPOINT-'))

  // 1) 并发 spawn 普通任务
  const agentMap = [] // [{ agentId, taskId }]
  for (const task of regularTasks) {
    state.tasks[task.id].status = 'in_progress'
    const agentId = spawn_agent({
      agent_type: "tlv4_worker",
      items: [
        { type: "text", text: `## Role Assignment
role: ${task.role}
role_spec: ${skillRoot}/roles/${task.role}/role.md
session: ${sessionFolder}
session_id: ${sessionId}
requirement: ${requirement}
inner_loop: ${hasInnerLoop(task.role)}` },
        { type: "text", text: `Read role_spec file (${skillRoot}/roles/${task.role}/role.md) to load Phase 2-4 domain instructions.
Execute built-in Phase 1 (task discovery) -> role Phase 2-4 -> built-in Phase 5 (report).` },
        { type: "text", text: `## Task Context
task_id: ${task.id}
title: ${task.title}
description: ${task.description}
pipeline_phase: ${task.pipeline_phase}` },
        { type: "text", text: `## Upstream Context\n${task.prev_context}` }
      ]
    })
    agentMap.push({ agentId, taskId: task.id })
  }

  // 2) 批量等待
  if (agentMap.length > 0) {
    wait_agent({ targets: agentMap.map(a => a.agentId), timeout_ms: 900000 })
  }

  // 3) 收集结果，合并到 tasks.json
  for (const { agentId, taskId } of agentMap) {
    try {
      const disc = JSON.parse(Read(`${sessionFolder}/discoveries/${taskId}.json`))
      state.tasks[taskId].status = disc.status || 'completed'
      state.tasks[taskId].findings = disc.findings || ''
      state.tasks[taskId].quality_score = disc.quality_score || null
      state.tasks[taskId].error = disc.error || null
    } catch {
      state.tasks[taskId].status = 'failed'
      state.tasks[taskId].error = 'No discovery file produced'
    }
    close_agent({ target: agentId })
  }

  // 4) 执行 CHECKPOINT 任务 (send_input 唤醒 supervisor)
  for (const task of checkpointTasks) {
    send_input({
      id: supervisorId,
      items: [
        { type: "text", text: `## Checkpoint Request
task_id: ${task.id}
scope: [${task.deps.join(', ')}]
pipeline_progress: ${completedCount}/${totalCount} tasks completed` }
      ]
    })
    wait_agent({ targets: [supervisorId], timeout_ms: 300000 })

    // 读取 checkpoint 报告
    try {
      const report = Read(`${sessionFolder}/artifacts/${task.id}-report.md`)
      const verdict = parseVerdict(report) // pass | warn | block
      state.tasks[task.id].status = 'completed'
      state.tasks[task.id].findings = `Verdict: ${verdict.decision} (score: ${verdict.score})`
      state.tasks[task.id].supervision_verdict = verdict.decision

      if (verdict.decision === 'block') {
        const action = request_user_input({
          questions: [{
            question: `Checkpoint ${task.id} BLOCKED (score: ${verdict.score}). Choose action.`,
            header: "Blocked",
            id: "blocked_action",
            options: [
              { label: "Override", description: "Proceed despite block" },
              { label: "Revise upstream", description: "Go back and fix issues" },
              { label: "Abort", description: "Stop pipeline" }
            ]
          }]
        })
        // Handle user choice...
      }
    } catch {
      state.tasks[task.id].status = 'failed'
      state.tasks[task.id].error = 'Supervisor report not produced'
    }
  }

  // 5) 持久化 tasks.json
  Write(`${sessionFolder}/tasks.json`, JSON.stringify(state, null, 2))
}
```

---

## 步骤 3: 复制 Role 文档

从 `.claude/skills/team-lifecycle-v4/` 复制以下目录到 `.codex/skills/team-lifecycle-v4/`：

| 源 | 目标 | 说明 |
|----|------|------|
| `roles/` (全部) | `roles/` | 原样复制，coordinator 中平台相关调用需适配 |
| `specs/pipelines.md` | `specs/pipelines.md` | 原样复制 |
| `specs/quality-gates.md` | `specs/quality-gates.md` | 原样复制 |
| `specs/knowledge-transfer.md` | `specs/knowledge-transfer.md` | 需适配: team_msg -> discoveries/ 文件 |
| `templates/` (全部) | `templates/` | 原样复制 |

### Role 文档适配点

**`roles/coordinator/role.md`** — 需改写：
- Phase 2: `TeamCreate` -> session folder init
- Phase 3: `TaskCreate` -> tasks.json 写入
- Phase 4: `Agent(team-worker)` -> `spawn_agent(tlv4_worker)`
- monitor.md 中 callback 处理 -> `wait_agent` 结果处理

**`roles/coordinator/commands/monitor.md`** — 需改写：
- handleCallback -> wait_agent 结果解析
- handleSpawnNext -> spawn_agent 循环
- SendMessage(supervisor) -> send_input(supervisorId)

**`specs/knowledge-transfer.md`** — 需适配：
- `team_msg(operation="get_state")` -> 读 tasks.json
- `team_msg(type="state_update")` -> 写 discoveries/{id}.json
- 探索缓存协议保持不变

**其余 role 文档** (analyst, writer, planner, executor, tester, reviewer, supervisor):
- 核心执行逻辑不变
- `ccw cli` 调用保持不变 (CLI 工具两侧通用)
- 发现产出改为写 `discoveries/{task_id}.json` (替代 team_msg)
- `report_agent_job_result` 替代 team_msg state_update

---

## 步骤 4: Tasks Schema 改写

### 现状: tasks.csv

```csv
id,title,description,role,pipeline_phase,deps,context_from,exec_mode,wave,status,findings,quality_score,supervision_verdict,error
```

### 改写后: tasks.json

```json
{
  "session_id": "tlv4-auth-system-20260324",
  "pipeline": "full-lifecycle",
  "requirement": "Design and implement user authentication system",
  "created_at": "2026-03-24T10:00:00+08:00",
  "supervision": true,
  "completed_waves": [],
  "active_agents": {},
  "tasks": {
    "RESEARCH-001": {
      "title": "Domain research",
      "description": "Explore domain, extract structured context...",
      "role": "analyst",
      "pipeline_phase": "research",
      "deps": [],
      "context_from": [],
      "wave": 1,
      "status": "pending",
      "findings": null,
      "quality_score": null,
      "supervision_verdict": null,
      "error": null
    },
    "DRAFT-001": {
      "title": "Product brief",
      "description": "Generate product brief from research context...",
      "role": "writer",
      "pipeline_phase": "product-brief",
      "deps": ["RESEARCH-001"],
      "context_from": ["RESEARCH-001"],
      "wave": 2,
      "status": "pending",
      "findings": null,
      "quality_score": null,
      "supervision_verdict": null,
      "error": null
    }
  }
}
```

### 发现文件: discoveries/{task_id}.json

```json
{
  "task_id": "RESEARCH-001",
  "worker": "RESEARCH-001",
  "timestamp": "2026-03-24T10:15:00+08:00",
  "type": "research",
  "status": "completed",
  "findings": "Explored domain: identified OAuth2+RBAC pattern, 5 integration points.",
  "quality_score": null,
  "supervision_verdict": null,
  "error": null,
  "data": {
    "dimension": "domain",
    "findings": ["Auth system needs OAuth2 + RBAC"],
    "constraints": ["Must support SSO"],
    "integration_points": ["User service API"]
  },
  "artifacts_produced": ["spec/discovery-context.json"]
}
```

---

## 步骤 5: 删除旧文件

迁移完成后，删除 Codex 版中不再需要的文件：

| 文件 | 原因 |
|------|------|
| `agents/agent-instruction.md` | 角色逻辑在 roles/ 中，通用协议在 TOML developer_instructions 中 |
| `agents/requirement-clarifier.md` | 需求澄清逻辑合并到 coordinator/role.md Phase 1 |
| `agents/supervisor.md` | 迁移到 roles/supervisor/role.md |
| `agents/quality-gate.md` | 迁移到 roles/reviewer/role.md (QUALITY-* 任务处理) |
| `schemas/tasks-schema.md` (旧版) | 被 JSON schema 版本替代 |

---

## 实施顺序

| 步骤 | 内容 | 依赖 | 复杂度 |
|------|------|------|--------|
| **1** | 创建 2 个 TOML agent 定义 | 无 | 低 |
| **2** | 复制 roles/specs/templates 从 .claude/ | 无 | 低 (纯复制) |
| **3** | 改写 tasks-schema.md (CSV -> JSON) | 无 | 低 |
| **4** | 改写 SKILL.md 主编排 | 1, 2, 3 | 高 (核心工作) |
| **5** | 适配 coordinator role.md + commands/ | 4 | 中 |
| **6** | 适配 knowledge-transfer.md | 3 | 低 |
| **7** | 适配 worker role 文档 (发现产出方式) | 3 | 低 |
| **8** | 删除旧文件，清理 | 全部 | 低 |

步骤 1-3 可并行，步骤 4 是关键路径，步骤 5-7 依赖步骤 4 但可并行。
