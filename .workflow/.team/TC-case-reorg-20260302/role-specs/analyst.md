---
role: analyst
prefix: ANALYSIS
inner_loop: false
subagents: [explore]
message_types:
  success: analysis_complete
  error: error
---

# Analyst — Phase 2-4

## Phase 2: Context Loading

1. 提取 session 路径：`.workflow/.team/TC-case-reorg-20260302`
2. 读取分析目标文件：
   - `src/data/cases.ts` — 完整读取所有现有案例
   - `src/data/commands.ts` — 读取所有命令（重点关注 v7.0、v6.4 新命令）
3. 读取 `shared-memory.json` 获取跨角色决策
4. 加载 `wisdom/` 文件获取已积累的知识

## Phase 3: 案例全面审计与规格定义

**目标**：识别所有问题案例，梳理最新命令特性，定义新案例需求规格

### 步骤 1：现有案例问题审计

对所有 39 个案例进行逐一审查，评估维度：

| 检查维度 | 说明 |
|---------|------|
| 命令准确性 | 案例中使用的命令是否在 commands.ts 中存在 |
| 步骤真实性 | 演示步骤是否真实反映命令行为 |
| 内容时效性 | 是否基于过时的命令版本 |
| 示例质量 | 输出/响应是否合理、具有代表性 |

为每个案例给出评级：
- ✅ **保留**：准确无误
- ⚠️ **修改**：核心正确但需要调整部分细节
- ❌ **删除**：错误演示或已废弃命令

### 步骤 2：最新命令特性梳理

重点分析以下最新命令的实际使用场景：
- **v7.0 IDAW 系列**：`/idaw:add`, `/idaw:run`, `/idaw:run-coordinate`, `/idaw:resume`, `/idaw:status`
- **v7.0 新命令**：`/wave-plan-pipeline` (Codex), `/workflow-tdd-plan` (Claude)
- **v6.4 重要命令**：`/team-coordinate-v2`, `/workflow-wave-plan`, `/workflow:session:sync`

### 步骤 3：新案例规格设计

定义需要新增的案例，重点包括：
1. **IDAW 完整工作流**（claude + codex 协作）
2. **Claude Code 规划 + Codex 执行**（多 CLI 协作场景，至少 3 个）
3. **team-coordinate-v2 动态角色生成**场景
4. **workflow-tdd-plan TDD 流程**案例
5. **wave-plan-pipeline 先勘探再施工**案例

对每个新案例输出完整规格：
```
- id: <新案例ID>
- title: <标题>
- level: <级别>
- category: <分类>
- scenario: <场景描述>
- commands: <涉及命令列表>
- steps: <完整步骤设计>
- tips: <实用提示>
```

### 步骤 4：输出审计报告

将完整分析结果写入 `.workflow/.team/TC-case-reorg-20260302/artifacts/case-audit-report.md`，包含：
1. 问题案例清单（带评级和问题说明）
2. 保留/修改/删除决策表
3. 新案例完整规格（每个案例的完整 TypeScript 对象设计）
4. 案例分布建议（各级别案例数量）

## Phase 4: 验证与反馈

### Accuracy 验证
- 确认 `artifacts/case-audit-report.md` 文件存在且有实质内容
- 报告中每个新案例规格中的命令名称必须在 commands.ts 中存在

### Feedback Contract

| Field | Content |
|-------|---------|
| `files_produced` | artifacts/case-audit-report.md |
| `artifacts_written` | .workflow/.team/TC-case-reorg-20260302/artifacts/case-audit-report.md |
| `verification_method` | Read confirm — 确认文件存在并包含所有案例评级和新案例规格 |

### Quality Gate
- 报告必须覆盖全部 39 个现有案例的评级
- 新案例规格至少包含 5 个新案例（含 3 个 multi-cli 场景）
- 所有新案例中的命令名称必须在 commands.ts 中准确存在

验证通过后，更新 `shared-memory.json`：
```json
{
  "analyst": {
    "problems_found": <问题案例数>,
    "cases_to_keep": <保留数>,
    "cases_to_modify": <修改数>,
    "cases_to_delete": <删除数>,
    "new_cases_designed": <新案例数>,
    "audit_report_path": "artifacts/case-audit-report.md"
  }
}
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| cases.ts 读取失败 | 尝试 Bash cat 命令读取，仍失败则报告 error |
| 命令在 commands.ts 中找不到 | 标注为"命令不存在"问题，不要猜测 |
| 报告写入失败 | 尝试 MCP write_file 工具 |
