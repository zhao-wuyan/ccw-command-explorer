# Quality Gates — team-edict

看板强制上报、审议质量、执行验收的分级质量门控标准。

## 质量阈值

| 门控 | 分数 | 动作 |
|------|------|------|
| **通过** | >= 80% | 继续下一阶段 |
| **警告** | 60-79% | 记录警告，谨慎推进 |
| **失败** | < 60% | 必须解决后才能继续 |

---

## 各阶段质量门

### Phase 1: 接旨分拣 (coordinator)

| 检查项 | 标准 | 严重性 |
|--------|------|--------|
| 任务分类正确 | 正式旨意/简单问答判断符合规则 | Error |
| 任务标题合规 | 10-30字中文概括，无路径/URL/系统元数据 | Error |
| Session 创建 | EDT-{slug}-{date} 格式，目录结构完整 | Error |
| 初始任务链 | PLAN/REVIEW/DISPATCH 任务创建，依赖正确 | Error |

### Phase 2: 中书省规划 (zhongshu)

| 检查项 | 标准 | 严重性 |
|--------|------|--------|
| 看板上报 | 接任务/进度/完成 三个时机均已上报 | Error |
| 方案文件存在 | `plan/zhongshu-plan.md` 已写入 | Error |
| 子任务清单完整 | 覆盖所有旨意要点，含部门分配 | Error |
| 验收标准可量化 | >= 2 条可验证的成功指标 | Warning |
| 风险点识别 | >= 1 条风险及回滚方案 | Warning |

### Phase 3: 门下省审议 (menxia)

| 检查项 | 标准 | 严重性 |
|--------|------|--------|
| 四维分析均完成 | 可行性/完整性/风险/资源均有结论 | Error |
| 多CLI全部执行 | gemini×2 + qwen + codex 均调用 | Error |
| 审议报告存在 | `review/menxia-review.md` 已写入 | Error |
| 结论明确 | 准奏✅ 或 封驳❌ + 具体理由 | Error |
| 封驳意见具体 | 逐条列出需修改问题（封驳时必须）| Error（封驳时）|
| 看板上报 | 接任务/进度/完成 三个时机均已上报 | Error |

### Phase 4: 尚书省调度 (shangshu)

| 检查项 | 标准 | 严重性 |
|--------|------|--------|
| 调度清单存在 | `plan/dispatch-plan.md` 已写入 | Error |
| 每个子任务有部门归属 | 100% 覆盖，无遗漏子任务 | Error |
| 依赖关系正确 | 串行依赖标注清晰，并行任务识别正确 | Error |
| 看板上报 | 接任务/进度/完成 三个时机均已上报 | Error |

### Phase 5: 六部执行 (gongbu/bingbu/hubu/libu/libu-hr/xingbu)

| 检查项 | 标准 | 严重性 |
|--------|------|--------|
| 看板上报完整 | 接任务/每步进度/完成/阻塞 均正确上报 | Error |
| 产出文件存在 | `artifacts/<dept>-output.md` 已写入 | Error |
| 验收标准满足 | 对照 dispatch-plan 中的要求逐条验证 | Error |
| 阻塞主动上报 | 无法继续时 state=Blocked + reason | Error（阻塞时）|

### 刑部专项: 质量验收

| 检查项 | 标准 | 严重性 |
|--------|------|--------|
| 测试通过率 | >= 95% | Error |
| code review | codex review 无 Critical 问题 | Error |
| test-fix 循环 | <= 3 轮 | Warning |
| QA 报告完整 | 通过/不通过结论 + 问题清单 | Error |

---

## 跨阶段一致性检查

### 封驳循环约束

| 检查 | 规则 |
|------|------|
| 封驳轮数 | coordinator 跟踪，超过3轮必须 AskUserQuestion |
| 修改覆盖度 | 每轮中书省修改必须回应门下省的所有封驳意见 |
| 方案版本 | zhongshu-plan.md 每轮包含"本轮修改点"摘要 |

### 消息类型一致性

| Sender | message_type | Coordinator 处理 |
|--------|-------------|-----------------|
| zhongshu | plan_ready | -> spawn menxia |
| menxia | review_result (approved=true) | -> spawn shangshu |
| menxia | review_result (approved=false) | -> respawn zhongshu (round++) |
| shangshu | dispatch_ready | -> spawn 六部 workers |
| 六部 | *_complete | -> 标记完成，检查全部完成 |
| 任意 | error (Blocked) | -> 记录，AskUserQuestion 或协调 |

### Task Prefix 唯一性

| Role | Prefix | 冲突检查 |
|------|--------|---------|
| zhongshu | PLAN | ✅ 唯一 |
| menxia | REVIEW | ✅ 唯一 |
| shangshu | DISPATCH | ✅ 唯一 |
| gongbu | IMPL | ✅ 唯一 |
| bingbu | OPS | ✅ 唯一 |
| hubu | DATA | ✅ 唯一 |
| libu | DOC | ✅ 唯一 |
| libu-hr | HR | ✅ 唯一 |
| xingbu | QA | ✅ 唯一 |

---

## 问题分级

### Error（必须修复）

- 看板上报缺失（任一强制时机未上报）
- 产出文件未写入
- 封驳超过3轮未询问用户
- 阻塞状态未上报
- task prefix 冲突

### Warning（应当修复）

- 进度上报粒度不足（步骤描述过于笼统）
- 验收标准不可量化
- 风险点无回滚方案

### Info（建议改进）

- 产出报告缺乏详细摘要
- wisdom contributions 未记录
- 调度批次可进一步优化并行度
