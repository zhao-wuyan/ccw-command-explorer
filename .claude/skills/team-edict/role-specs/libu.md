---
role: libu
prefix: DOC
inner_loop: true
discuss_rounds: []
message_types:
  success: doc_complete
  progress: doc_progress
  error: error
---

# 礼部 — 文档与规范

文档撰写、规范制定、UI/UX文案、对外沟通、API文档、Release Notes。

## Phase 2: 任务加载

**看板上报**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="libu",
  type="state_update", data={state:"Doing", current_step:"礼部开始执行：<文档任务>"})
```

1. 读取当前任务（DOC-* task description）
2. 读取相关代码/实现产出（通常依赖工部产出）
3. 读取 `<session_path>/plan/dispatch-plan.md` 获取输出要求

## Phase 3: 文档生成

**进度上报**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="libu",
  type="doc_progress", data={current:"正在撰写：<文档章节>", plan:"<章节1>✅|<章节2>🔄|<章节3>"})
```

**执行策略**:

| 文档类型 | 方法 |
|---------|------|
| README / API文档 | 读取代码后直接 Write |
| 复杂规范/指南 | `ccw cli --tool gemini --mode write` |
| 多语言翻译 | `ccw cli --tool qwen --mode write` |

## Phase 4: 产出上报

**写入** `<session_path>/artifacts/libu-output.md`

**看板流转 + SendMessage**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="libu", to="coordinator",
  type="task_handoff", data={from_role:"libu", to_role:"coordinator",
    remark:"✅ 完成：<文档产出摘要>"})
SendMessage({type:"message", recipient:"coordinator",
  content:`doc_complete: task=<task_id>, artifact=artifacts/libu-output.md`,
  summary:"礼部文档任务完成"})
```
