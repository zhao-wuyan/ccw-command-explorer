# Issue Handling Specification

Issue 处理的核心规范和约定。

## When to Use

| Phase | Usage | Section |
|-------|-------|---------|
| Phase: action-list | Issue 列表展示 | Issue Status & Display |
| Phase: action-plan | Issue 规划 | Solution Planning |
| Phase: action-execute | Issue 执行 | Solution Execution |

---

## Issue Structure

### 基本字段

```json
{
  "id": "ISS-20250129-001",
  "title": "Fix authentication token expiration bug",
  "description": "Tokens expire too quickly in production",
  "status": "registered",
  "priority": "high",
  "tags": ["auth", "bugfix"],
  "created_at": "2025-01-29T10:00:00Z",
  "updated_at": "2025-01-29T10:00:00Z"
}
```

### 工作流状态

| Status | Phase | 说明 |
|--------|-------|------|
| `registered` | Initial | Issue 已创建，待规划 |
| `planning` | List → Plan | 正在规划中 |
| `planned` | Plan → Execute | 规划完成，解决方案已绑定 |
| `executing` | Execute | 正在执行 |
| `completed` | Execute → Complete | 执行完成 |
| `failed` | Any | 执行失败 |

### 工作流字段

```json
{
  "id": "ISS-xxx",
  "status": "registered|planning|planned|executing|completed|failed",
  "solution_id": "SOL-xxx-1",
  "planned_at": "2025-01-29T11:00:00Z",
  "executed_at": "2025-01-29T12:00:00Z",
  "error": null
}
```

## Issue 列表显示

### 格式规范

```
Status Matrix:
Total: 5 | Registered: 2 | Planned: 2 | Completed: 1

Issue Details:
○ [1] ISS-001: Fix login bug (registered)
→ [2] ISS-002: Add MFA support (planning)
✓ [3] ISS-003: Refactor auth (completed)
✗ [4] ISS-004: Update password policy (failed)
```

### 显示字段

- ID: 唯一标识
- Title: 简短描述
- Status: 当前状态
- Solution ID: 绑定的解决方案（如有）

## Solution Planning

### 规划输入

- Issue ID 和 Title
- Issue 描述和上下文
- 项目技术栈和指南

### 规划输出

- Solution ID：`SOL-{issue-id}-{sequence}`
- Tasks 数组：可执行的任务列表
- Acceptance Criteria：验收标准
- 估计时间

### Planning Subagent 职责

1. 分析 issue 描述
2. 探索相关代码路径
3. 设计解决方案
4. 分解为可执行任务
5. 定义验收条件

### 多解决方案处理

- 如果生成多个方案，需要用户选择
- 选择后绑定主方案到 issue
- 备选方案保存但不自动执行

## Solution Execution

### 执行顺序

1. 加载已规划的解决方案
2. 逐个执行每个 solution 中的所有 tasks
3. 每个 task：implement → test → verify
4. 完成后提交一次

### Execution Subagent 职责

1. 加载 solution JSON
2. 实现所有任务
3. 运行测试
4. 验收条件检查
5. 提交代码并返回结果

### 错误恢复

- Task 失败：不提交，标记 solution 为失败
- 提交失败：创建快照便于恢复
- Subagent 超时：记录并继续下一个

## 批量处理约定

### 输入格式

```bash
# 单个 issue
codex issue:plan-execute ISS-001

# 多个 issues
codex issue:plan-execute ISS-001,ISS-002,ISS-003

# 交互式
codex issue:plan-execute
```

### 处理策略

- 规划：可并行，但为保持一致性这里采用串行
- 执行：必须串行（避免冲突提交）
- 队列：FIFO，无优先级排序

## 状态持久化

### 保存位置

```
.workflow/.scratchpad/codex-issue-{timestamp}/
├── state.json           # 当前状态快照
├── state-history.json   # 状态变更历史
├── queue.json          # 执行队列
├── solutions/          # 解决方案文件
├── snapshots/          # 流程快照
└── final-report.md     # 最终报告
```

### 快照用途

- 流程恢复：允许从中断点恢复
- 调试：记录每个阶段的状态变化
- 审计：跟踪完整的执行过程

## 质量保证

### 验收清单

- [ ] Issue 规范明确
- [ ] Solution 遵循 schema
- [ ] All tasks 有 acceptance criteria
- [ ] 执行成功率 >= 80%
- [ ] 报告生成完整

### 错误分类

| 级别 | 类型 | 处理 |
|------|------|------|
| Critical | 规划失败、提交失败 | 中止该 issue |
| Warning | 测试失败、条件未满足 | 记录但继续 |
| Info | 超时、网络延迟 | 日志记录 |
