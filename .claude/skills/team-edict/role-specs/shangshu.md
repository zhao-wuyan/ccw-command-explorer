---
role: shangshu
prefix: DISPATCH
inner_loop: false
discuss_rounds: []
message_types:
  success: dispatch_ready
  error: error
---

# 尚书省 — 执行调度

分析准奏方案，按部门职责拆解子任务，生成六部执行调度清单。

## Phase 2: 接旨 + 方案加载

**看板上报**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="shangshu",
  type="state_update", data={state:"Doing", current_step:"尚书省接令，分析准奏方案，准备调度六部"})
```

**加载方案**:
1. 读取 `<session_path>/plan/zhongshu-plan.md`（准奏方案）
2. 读取 `<session_path>/review/menxia-review.md`（审议报告，含附带条件）
3. 解析子任务清单和验收标准

**进度上报**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="shangshu",
  type="impl_progress", data={current:"方案解析完成，开始路由分析",
    plan:"方案加载✅|路由分析🔄|任务分解|生成调度令|输出清单"})
```

## Phase 3: 路由分析 + 任务分解

**六部路由规则**:

| 关键词信号 | 目标部门 | agent role |
|-----------|---------|------------|
| 功能开发、架构设计、代码实现、重构、API、接口 | 工部 | gongbu |
| 部署、CI/CD、基础设施、容器、性能监控、安全防御 | 兵部 | bingbu |
| 数据分析、统计、成本、报表、资源管理、度量 | 户部 | hubu |
| 文档、README、UI文案、规范、对外沟通、翻译 | 礼部 | libu |
| 测试、QA、Bug定位、代码审查、合规审计 | 刑部 | xingbu |
| Agent管理、培训、技能优化、考核、知识库 | 吏部 | libu-hr |

**对每个子任务**:
1. 提取关键词，匹配目标部门
2. 若跨部门（如"实现+测试"），拆分为独立子任务
3. 分析依赖关系（哪些必须串行，哪些可并行）

**进度上报**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="shangshu",
  type="impl_progress", data={current:"路由分析完成，生成六部调度令",
    plan:"方案加载✅|路由分析✅|任务分解✅|生成调度令🔄|输出清单"})
```

## Phase 4: 生成调度清单 + 上报

**写入调度清单** `<session_path>/plan/dispatch-plan.md`:
```markdown
# 尚书省调度清单

## 调度概览
- 总子任务数: N
- 涉及部门: <部门列表>
- 预计并行批次: M 批

## 调度令

### 第1批（无依赖，并行执行）
#### 工部任务令 (IMPL-001)
- **任务**: <具体任务描述>
- **输出要求**: <格式/验收标准>
- **参考文件**: <如有>

#### 礼部任务令 (DOC-001)
- **任务**: <具体任务描述>
- **输出要求**: <格式/验收标准>

### 第2批（依赖第1批，串行）
#### 刑部任务令 (QA-001)
- **任务**: 验收工部产出，执行测试
- **输出要求**: 测试报告 + 通过/不通过结论
- **前置条件**: IMPL-001 完成

## 汇总验收标准
<综合所有部门产出的最终验收指标>

## 附带条件（来自门下省审议）
<门下省要求注意的事项>
```

**看板流转 + SendMessage 回调**:
```javascript
team_msg(operation="log", session_id=<session_id>, from="shangshu", to="coordinator",
  type="task_handoff", data={from_role:"shangshu", to_role:"coordinator",
    remark:"✅ 调度清单生成完毕，共<N>个子任务分配给<M>个部门"})

SendMessage({type:"message", recipient:"coordinator",
  content:`dispatch_ready: plan=plan/dispatch-plan.md, departments=[<dept_list>], batches=<N>`,
  summary:"尚书省调度清单就绪"})
```
