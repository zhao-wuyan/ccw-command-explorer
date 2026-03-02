# 案例审计报告

## 执行摘要

| 指标 | 数量 |
|------|------|
| 审计案例总数 | 39 |
| 建议保留（无变更） | 26 |
| 建议修改（小修） | 7 |
| 建议删除/替换 | 6 (MCLI 全替换) |
| 新增案例 | 6 |
| **最终案例总数** | **41** |

---

## 现有案例审计结果

### Level 1 - 超简单任务

| ID | 标题 | 评级 | 问题说明 |
|----|------|------|---------|
| L1-001 | 快速添加代码注释 | ✅ 保留 | 命令正确，步骤合理 |
| L1-002 | 简单的 Bug 修复 | ⚠️ 修改 | tips 中 `--hotfix` 模式不存在，删除该 tip |

### Level 2 - 轻量规划与执行

| ID | 标题 | 评级 | 问题说明 |
|----|------|------|---------|
| L2-001 | 开发一个小功能（规划+执行） | ✅ 保留 | 正确 |
| L2-002 | 生成规范的 Git 提交 | ✅ 保留 | 正确 |

### Skill - 专项技能

| ID | 标题 | 评级 | 问题说明 |
|----|------|------|---------|
| SKILL-001 | 命令帮助系统 | ✅ 保留 | 正确 |
| SKILL-002 | Issue 管理交互式操作 | ✅ 保留 | 正确 |
| SKILL-003 | 创建自定义技能 | ✅ 保留 | 正确 |

### Level 3 - 标准工作流

| ID | 标题 | 评级 | 问题说明 |
|----|------|------|---------|
| L3-001 | TDD 开发流程 | ⚠️ 修改 | 用旧 `/workflow-tdd` 替换为 v7.0 的 `/workflow-tdd-plan`；commands 数组同一命令出现两次 |
| L3-002 | 复杂功能开发 | ⚠️ 修改 | `/workflow-plan --verify` 参数不存在，改为正确步骤描述 |
| L3-003 | 代码审查 + 自动修复 | ✅ 保留 | 正确 |
| L3-004 | 深度调试复杂 Bug | ✅ 保留 | 正确 |
| L3-005 | 测试生成与修复循环 | ✅ 保留 | 正确 |

### Level 4 - 探索性任务

| ID | 标题 | 评级 | 问题说明 |
|----|------|------|---------|
| L4-001 | 头脑风暴：架构设计 | ✅ 保留 | 正确 |
| L4-002 | 头脑风暴转 Issue 执行 | ⚠️ 修改 | `SESSION="..."` 参数语法为虚构，删去该参数 |
| L4-003 | 多 CLI 协作规划 | ✅ 保留 | 此处"多 CLI"指调用 Gemini/Codex CLI 工具进行并行分析，是真实功能 |
| L4-004 | 并行头脑风暴 | ✅ 保留 | 正确 |

### Issue 工作流案例

| ID | 标题 | 评级 | 问题说明 |
|----|------|------|---------|
| ISSUE-001 | Issue 发现与批量处理 | ✅ 保留 | 正确 |
| ISSUE-002 | 创建结构化 Issue | ✅ 保留 | 正确 |

### Team 协作案例（全部保留）

| ID | 标题 | 评级 |
|----|------|------|
| TEAM-001 | 团队头脑风暴协作 | ✅ |
| TEAM-002 | 团队 Issue 协作解决 | ✅ |
| TEAM-003 | 团队全生命周期开发 | ✅ |
| TEAM-004 | 团队技术债务清理 | ✅ |
| TEAM-005 | 团队全生命周期 v5 并行开发 | ✅ |
| TEAM-006 | 通用团队协调 v2 动态角色 | ✅ |
| TEAM-007 | 团队超深度代码分析 | ✅ |
| TEAM-008 | 团队质量保证 QA 验证 | ✅ |

### UI / Memory / Session 案例（全部保留）

所有 UI、Memory、Session 案例命令准确，内容合理，全部保留。

### Multi-CLI 案例（全部替换）

| ID | 标题 | 评级 | 问题说明 |
|----|------|------|---------|
| MCLI-001 | 完整项目拆分开发流程 | ❌ 替换 | 仅有 Claude Code，未体现 Codex 参与 |
| MCLI-002 | Plan 产物转 Issue Pipeline | ❌ 替换 | 同上 |
| MCLI-003 | 需求文档直接转开发 | ❌ 替换 | 同上 |
| MCLI-004 | Claude Code 规划 + 执行 | ❌ 替换 | 仅有 Claude Code 内部命令，无 Codex 协作 |

---

## 新案例设计规格

### 新增 Level 3 案例

#### L3-006: workflow-tdd-plan — 6 阶段 TDD 规划

```typescript
{
  id: 'L3-006',
  title: 'workflow-tdd-plan TDD 完整流程',
  level: 3,
  category: 'TDD开发',
  scenario: '用 v7.0 TDD 规划技能实现购物车服务',
  commands: [
    { cmd: '/workflow-tdd-plan', desc: 'TDD 规划技能 - 6阶段规划+Red-Green-Refactor任务链' },
  ],
}
```

#### L3-007: workflow-wave-plan — 先勘探后施工

```typescript
{
  id: 'L3-007',
  title: 'workflow-wave-plan 先勘探后施工',
  level: 3,
  category: '波浪规划',
  scenario: '用 Wave Plan 对大型重构做渐进式探索与执行',
  commands: [
    { cmd: '/workflow-wave-plan', desc: 'CSV Wave 规划执行 - 分批探索和执行' },
  ],
}
```

### 替换 Multi-CLI 案例

#### MCLI-001: Claude Code 规划 → Codex 执行

```typescript
{
  id: 'MCLI-001',
  title: 'Claude Code 规划 + Codex 执行标准流水线',
  level: 'multi-cli',
  category: '双 CLI 协作',
  scenario: 'Claude Code 生成协作规划文档，Codex 消费执行',
  commands: [
    { cmd: '/workflow:collaborative-plan-with-file', desc: '协作式规划 (Claude Code)' },
    { cmd: '/unified-execute-with-file', desc: '统一执行引擎 (Codex)' },
  ],
}
```

#### MCLI-002: IDAW 任务驱动开发

```typescript
{
  id: 'MCLI-002',
  title: 'IDAW 任务驱动开发全流程',
  level: 'multi-cli',
  category: 'IDAW工作流',
  scenario: '用 IDAW 管理多任务串行执行，支持中断恢复',
  commands: [
    { cmd: '/idaw:add', desc: '添加 IDAW 任务' },
    { cmd: '/idaw:run', desc: 'IDAW 执行器' },
    { cmd: '/idaw:status', desc: '查看进度' },
    { cmd: '/idaw:resume', desc: '恢复中断会话' },
  ],
}
```

#### MCLI-003: Claude Code 分析 + Codex Wave 实现

```typescript
{
  id: 'MCLI-003',
  title: 'Claude Code 深度分析 + Codex Wave 实现',
  level: 'multi-cli',
  category: '双 CLI 协作',
  scenario: 'Claude Code 分析架构问题，Codex 波浪式 TDD 实现',
  commands: [
    { cmd: '/workflow:analyze-with-file', desc: '交互式协作分析 (Claude Code)' },
    { cmd: '/wave-plan-pipeline', desc: '先勘探再施工 (Codex)' },
  ],
}
```

#### MCLI-004: 头脑风暴 → Issue → Codex 并行执行

```typescript
{
  id: 'MCLI-004',
  title: '头脑风暴 → Issue → Codex 并行执行',
  level: 'multi-cli',
  category: '双 CLI 协作',
  scenario: 'Claude Code 创意规划，Codex 并行开发循环',
  commands: [
    { cmd: '/workflow:brainstorm-with-file', desc: '交互式头脑风暴 (Claude Code)' },
    { cmd: '/issue:from-brainstorm', desc: '创建 Issue 队列 (Claude Code)' },
    { cmd: '/parallel-dev-cycle', desc: '多 Agent 并行开发 (Codex)' },
  ],
}
```
