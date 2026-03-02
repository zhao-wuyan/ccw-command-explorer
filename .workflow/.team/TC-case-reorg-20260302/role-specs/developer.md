---
role: developer
prefix: IMPL
inner_loop: false
subagents: []
message_types:
  success: impl_complete
  error: error
---

# Developer — Phase 2-4

## Phase 2: Context Loading

1. 提取 session 路径：`.workflow/.team/TC-case-reorg-20260302`
2. 读取上游产出物：
   - `artifacts/case-audit-report.md` — analyst 的审计报告（包含问题清单和新案例规格）
3. 读取目标文件：
   - `src/data/cases.ts` — 当前完整内容（用于了解现有结构和类型定义）
   - `src/data/commands.ts` — 命令列表（用于验证命令名称准确性）
4. 读取 `shared-memory.json` 获取 analyst 的统计数据

## Phase 3: 重写 cases.ts

**目标**：根据审计报告，重写 src/data/cases.ts，生成高质量、准确的案例集

### 步骤 1：处理现有案例
- 按审计报告的评级处理：
  - ❌ **删除**的案例：直接移除
  - ⚠️ **修改**的案例：按报告指导修正问题
  - ✅ **保留**的案例：原样保留

### 步骤 2：新增 IDAW 工作流案例
新增完整的 IDAW 任务管理流程演示，包含：
- `/idaw:add` 添加任务
- `/idaw:run` 或 `/idaw:run-coordinate` 执行
- `/idaw:status` 查看进度

### 步骤 3：新增 Claude Code + Codex 协作案例
新增至少 3 个 `multi-cli` 级别案例，展示两个 CLI 的协作：
- **场景 A**：Claude Code 规划 (`/workflow-plan`) + Codex 执行 (`/unified-execute-with-file`)
- **场景 B**：Claude Code 分析 (`/workflow:analyze-with-file`) + Codex TDD (`/wave-plan-pipeline`)
- **场景 C**：Claude Code 头脑风暴 (`/brainstorm`) → Issue 创建 → Codex 并行执行

### 步骤 4：新增最新命令案例
- `team-coordinate-v2` 动态角色生成场景
- `workflow-tdd-plan` TDD 开发流程
- `workflow-wave-plan` 先勘探后施工场景

### 步骤 5：验证并写入文件
- 验证所有案例中引用的命令在 commands.ts 中存在（cmd 字段精确匹配）
- 保持现有 TypeScript 类型定义不变（CaseLevel、CaseStep、CaseCommand、Case 接口）
- 写入 `src/data/cases.ts`

### 关键约束
- **命令名称必须精确**：`/ccw-help` 不能写成 `/ccw help`
- **CaseLevel 类型**：只能使用 `1 | 2 | 3 | 4 | 'skill' | 'issue' | 'team' | 'ui' | 'memory' | 'session' | 'multi-cli'`
- **步骤真实性**：每个步骤的输出内容要真实反映命令的实际行为
- **不引入新导出**：不修改文件末尾的 `ALL_CASES` 汇总逻辑

## Phase 4: 验证与反馈

### Accuracy 验证
- 读取修改后的 `src/data/cases.ts` 确认内容已更新
- 检查文件无 TypeScript 语法错误（可通过 Bash 运行 `npx tsc --noEmit`）
- 确认所有案例的 `commands[].cmd` 字段与 commands.ts 中的 `cmd` 字段匹配

### Feedback Contract

| Field | Content |
|-------|---------|
| `files_modified` | src/data/cases.ts — 行数变化 |
| `artifacts_written` | .workflow/.team/TC-case-reorg-20260302/artifacts/implementation-summary.md |
| `verification_method` | TypeScript 编译检查 + Read confirm |

### Quality Gate
- 文件可以通过 `npx tsc --noEmit` 无错误
- 案例总数合理（预期 35-50 个）
- 必须包含至少 3 个 `multi-cli` 级别的 claude+codex 协作案例
- 必须包含至少 1 个 IDAW 工作流案例

验证通过后：
1. 将实现摘要写入 `artifacts/implementation-summary.md`
2. 更新 `shared-memory.json`：
```json
{
  "developer": {
    "cases_total": <总案例数>,
    "new_cases_added": <新增数>,
    "cases_modified": <修改数>,
    "cases_deleted": <删除数>,
    "multi_cli_cases": <协作案例数>,
    "files_changed": ["src/data/cases.ts"]
  }
}
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| 审计报告未找到 | 停止并发送 error 消息给 coordinator：audit report missing |
| TypeScript 编译失败 | 修复语法错误，重新编译验证，最多 2 次重试 |
| 命令名称不匹配 | 重新查阅 commands.ts，使用精确的 cmd 字段值 |
| 文件写入失败 | 尝试 MCP write_file 工具；仍失败则报告 partial_completion |
