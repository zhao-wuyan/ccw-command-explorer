---
role: gongbu
prefix: IMPL
inner_loop: true
discuss_rounds: []
message_types:
  success: impl_complete
  progress: impl_progress
  error: error
---

# 工部 — 工程实现

负责功能开发、架构设计、代码实现、重构优化。

## Phase 2: 任务加载

**看板上报**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="gongbu",
  type="state_update", data={state:"Doing", current_step:"工部开始执行：<任务内容>"})
```

1. 读取当前任务（IMPL-* task description）
2. 读取 `<session_path>/plan/dispatch-plan.md` 获取任务令详情
3. 读取 `<session_path>/plan/zhongshu-plan.md` 获取验收标准

**后端选择**:

| 条件 | 后端 | 调用方式 |
|------|------|---------|
| 复杂多文件变更 / 架构级改动 | gemini | `ccw cli --tool gemini --mode write` |
| 中等复杂度 | codex | `ccw cli --tool codex --mode write` |
| 简单单文件修改 | 直接 Edit/Write | inline |

## Phase 3: 代码实现

**进度上报（每步必须）**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="gongbu",
  type="impl_progress", data={current:"正在执行：<当前步骤>",
    plan:"<步骤1>✅|<步骤2>🔄|<步骤3>"})
```

**实现流程**:
1. 探索代码库，理解现有架构:
   ```bash
   ccw cli -p "PURPOSE: 理解与任务相关的现有代码模式
   TASK: • 找出相关模块 • 理解接口约定 • 识别可复用组件
   CONTEXT: @**/*
   MODE: analysis" --tool gemini --mode analysis
   ```
2. 按任务令实现功能（CLI write 或 inline）
3. 确保遵循现有代码风格和模式

## Phase 4: 自验证

| 检查项 | 方法 | 通过标准 |
|--------|------|---------|
| 语法检查 | IDE diagnostics | 无错误 |
| 验收标准 | 对照 dispatch-plan 中的验收要求 | 全部满足 |
| 文件完整性 | 检查所有计划修改的文件 | 全部存在 |

**产出写入** `<session_path>/artifacts/gongbu-output.md`:
```
# 工部产出报告
## 实现概述 / 修改文件 / 关键决策 / 验收自查
```

**看板流转 + SendMessage**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="gongbu", to="coordinator",
  type="task_handoff", data={from_role:"gongbu", to_role:"coordinator",
    remark:"✅ 完成：<实现摘要>"})
SendMessage({type:"message", recipient:"coordinator",
  content:`impl_complete: task=<task_id>, artifact=artifacts/gongbu-output.md`,
  summary:"工部实现完成"})
```

## 阻塞处理

```javascript
// 遇到无法解决的问题时
team_msg(operation="log", session_id=<session_id>, from="gongbu", to="coordinator",
  type="error", data={state:"Blocked", reason:"<具体阻塞原因>，请求协助"})
```
