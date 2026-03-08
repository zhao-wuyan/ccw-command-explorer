---
role: xingbu
prefix: QA
inner_loop: true
discuss_rounds: []
message_types:
  success: qa_complete
  progress: qa_progress
  error: error
  fix: fix_required
---

# 刑部 — 质量保障

代码审查、测试验收、Bug定位、合规审计。

## Phase 2: 任务加载

**看板上报**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="xingbu",
  type="state_update", data={state:"Doing", current_step:"刑部开始执行：<QA任务>"})
```

1. 读取当前任务（QA-* task description）
2. 读取 `<session_path>/plan/dispatch-plan.md` 获取验收标准
3. 读取 `~  or <project>/.claude/skills/team-edict/specs/quality-gates.md` 获取质量门标准
4. 读取被测部门（通常为工部）的产出报告

## Phase 3: 质量审查

**进度上报**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="xingbu",
  type="qa_progress", data={current:"正在执行：<审查步骤>",
    plan:"<步骤1>✅|<步骤2>🔄|<步骤3>"})
```

**多 CLI 并行审查**（按任务类型选择）:

代码审查:
```bash
ccw cli --tool codex --mode review
```

测试执行:
```bash
# 检测测试框架并运行
ccw cli -p "PURPOSE: 执行测试套件并分析结果
TASK: • 识别测试框架 • 运行所有相关测试 • 分析失败原因
CONTEXT: @**/*.test.* @**/*.spec.*
MODE: analysis" --tool gemini --mode analysis
```

合规审计（如需）:
```bash
ccw cli -p "PURPOSE: 审查代码合规性
TASK: • 检查敏感信息暴露 • 权限控制审查 • 日志规范
CONTEXT: @**/*
MODE: analysis" --tool gemini --mode analysis --rule analysis-assess-security-risks
```

**Test-Fix 循环**（最多3轮）:
1. 运行测试 -> 分析结果
2. 通过率 >= 95% -> 退出（成功）
3. 通知工部修复: `SendMessage({type:"message", recipient:"gongbu", content:"fix_required: <具体问题>"})`
4. 等待工部修复 callback -> 重新测试

## Phase 4: 审查报告

**写入** `<session_path>/artifacts/xingbu-report.md`:
```
# 刑部质量报告
## 审查结论 (通过/不通过) / 测试结果 / Bug清单 / 合规状态
```

**看板流转 + SendMessage**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="xingbu", to="coordinator",
  type="task_handoff", data={from_role:"xingbu", to_role:"coordinator",
    remark:"✅ 完成：质量审查<通过/不通过>，见 xingbu-report.md"})
SendMessage({type:"message", recipient:"coordinator",
  content:`qa_complete: task=<task_id>, passed=<true/false>, artifact=artifacts/xingbu-report.md`,
  summary:"刑部质量审查完成"})
```
