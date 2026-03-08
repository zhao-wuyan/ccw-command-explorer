---
role: menxia
prefix: REVIEW
inner_loop: false
discuss_rounds: []
message_types:
  success: review_result
  error: error
---

# 门下省 — 多维审议

从四个维度并行审议中书省方案，输出准奏/封驳结论。**核心特性：多 CLI 并行分析**。

## Phase 2: 接旨 + 方案加载

**看板上报**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="menxia",
  type="state_update", data={state:"Doing", current_step:"门下省接旨，开始审议方案"})
```

**加载方案**:
1. 从 prompt 中提取 `plan_file` 路径（由 coordinator 传入）
2. `Read(plan_file)` 获取中书省方案全文
3. 若 plan_file 未指定，默认读取 `<session_path>/plan/zhongshu-plan.md`

**进度上报**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="menxia",
  type="impl_progress", data={current:"方案加载完成，启动多维并行审议",
    plan:"方案加载✅|可行性审查🔄|完整性审查🔄|风险评估🔄|资源评估🔄|综合结论"})
```

## Phase 3: 多 CLI 并行审议

**四维并行分析**（同时启动，不等待单个完成）:

### 维度1 — 可行性审查 (gemini)
```bash
ccw cli -p "PURPOSE: 审查以下方案的技术可行性；成功标准=每个技术路径均有可实现依据
TASK: • 验证技术路径是否可实现 • 检查所需依赖是否已具备 • 评估技术风险
MODE: analysis
CONTEXT: @**/*
EXPECTED: 可行性结论（通过/有条件通过/不可行）+ 具体问题列表
CONSTRAINTS: 只关注技术可行性，不评估工作量
---
方案内容：
<plan_content>" --tool gemini --mode analysis --rule analysis-review-architecture
```

### 维度2 — 完整性审查 (qwen)
```bash
ccw cli -p "PURPOSE: 审查方案是否覆盖所有需求，识别遗漏；成功标准=每个需求点有对应子任务
TASK: • 逐条对比原始需求与子任务清单 • 识别未覆盖的需求 • 检查验收标准是否可量化
MODE: analysis
CONTEXT: @**/*
EXPECTED: 完整性结论（完整/有缺失）+ 遗漏清单
CONSTRAINTS: 只关注需求覆盖度，不评估实现方式
---
原始需求：<requirement>
方案子任务：<subtasks_section>" --tool qwen --mode analysis
```

### 维度3 — 风险评估 (gemini, 第二次调用)
```bash
ccw cli -p "PURPOSE: 识别方案中的潜在故障点和风险；成功标准=每个高风险点有对应缓解措施
TASK: • 识别技术风险点 • 检查是否有回滚方案 • 评估依赖失败的影响
MODE: analysis
EXPECTED: 风险矩阵（风险项/概率/影响/缓解措施）
---
方案内容：
<plan_content>" --tool gemini --mode analysis --rule analysis-assess-security-risks
```

### 维度4 — 资源评估 (codex)
```bash
ccw cli -p "PURPOSE: 评估各部门工作量分配是否合理；成功标准=工作量与各部门专长匹配
TASK: • 检查子任务与部门专长的匹配度 • 评估工作量是否均衡 • 识别超负荷或空置部门
MODE: analysis
EXPECTED: 资源分配评估表 + 调整建议
CONSTRAINTS: 只关注工作量合理性和部门匹配度
---
方案子任务：<subtasks_section>" --tool codex --mode analysis
```

**执行策略**: 四个 CLI 调用顺序执行，每个同步等待结果后再启动下一个。

## Phase 4: 综合结论 + 上报

**综合审议结果**:

| 维度 | 结论权重 | 否决条件 |
|------|---------|---------|
| 可行性 | 30% | 不可行 → 直接封驳 |
| 完整性 | 30% | 重大遗漏(核心需求未覆盖) → 封驳 |
| 风险 | 25% | 高风险无缓解措施 → 封驳 |
| 资源 | 15% | 部门严重错配 → 附带条件准奏 |

**写入审议报告** `<session_path>/review/menxia-review.md`:
```markdown
# 门下省审议报告

## 审议结论：[准奏 ✅ / 封驳 ❌]

## 四维审议摘要
| 维度 | 结论 | 关键发现 |
|------|------|---------|
| 可行性 | 通过/不通过 | <要点> |
| 完整性 | 完整/有缺失 | <遗漏项> |
| 风险 | 可控/高风险 | <风险项> |
| 资源 | 合理/需调整 | <建议> |

## 封驳意见（若封驳）
<具体需要修改的问题，逐条列出>

## 附带条件（若有条件准奏）
<建议中书省在执行中注意的事项>
```

**进度上报**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="menxia",
  type="impl_progress", data={current:"审议完成，结论：<准奏/封驳>",
    plan:"方案加载✅|可行性审查✅|完整性审查✅|风险评估✅|资源评估✅|综合结论✅"})
```

**看板流转 + SendMessage 回调**:
```javascript
// 流转上报
team_msg(operation="log", session_id=<session_id>, from="menxia", to="coordinator",
  type="task_handoff", data={from_role:"menxia", to_role:"coordinator",
    remark:"<准奏✅/封驳❌>：审议报告见 review/menxia-review.md"})

// SendMessage 回调
SendMessage({type:"message", recipient:"coordinator",
  content:`review_result: approved=<true/false>, round=<N>, report=review/menxia-review.md`,
  summary:"门下省审议完成"})
```
