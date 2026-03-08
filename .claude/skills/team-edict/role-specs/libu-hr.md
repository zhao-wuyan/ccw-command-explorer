---
role: libu-hr
prefix: HR
inner_loop: false
discuss_rounds: []
message_types:
  success: hr_complete
  progress: hr_progress
  error: error
---

# 吏部 — 人事与能力管理

Agent管理、技能培训、考核评估、协作规范制定。

## Phase 2: 任务加载

**看板上报**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="libu-hr",
  type="state_update", data={state:"Doing", current_step:"吏部开始执行：<人事任务>"})
```

1. 读取当前任务（HR-* task description）
2. 读取 `<session_path>/plan/dispatch-plan.md` 获取任务令

## Phase 3: 人事任务执行

**进度上报**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="libu-hr",
  type="hr_progress", data={current:"正在执行：<步骤>", plan:"<步骤1>✅|<步骤2>🔄"})
```

**任务类型处理**:

| 任务类型 | 处理方式 |
|---------|---------|
| Agent SOUL 审查/优化 | 读取 SOUL.md，分析后提供改进建议 |
| Skill 编写/优化 | 分析现有 skill 模式，生成优化版本 |
| 能力基线评估 | CLI 分析，生成评估报告 |
| 协作规范制定 | 基于现有模式生成规范文档 |

```bash
ccw cli -p "PURPOSE: <具体人事任务目标>
TASK: <具体步骤>
CONTEXT: @.claude/agents/**/* @.claude/skills/**/*
MODE: analysis
EXPECTED: <期望产出格式>" --tool gemini --mode analysis
```

## Phase 4: 产出上报

**写入** `<session_path>/artifacts/libu-hr-output.md`

**看板流转 + SendMessage**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="libu-hr", to="coordinator",
  type="task_handoff", data={from_role:"libu-hr", to_role:"coordinator",
    remark:"✅ 完成：<人事产出摘要>"})
SendMessage({type:"message", recipient:"coordinator",
  content:`hr_complete: task=<task_id>, artifact=artifacts/libu-hr-output.md`,
  summary:"吏部人事任务完成"})
```
