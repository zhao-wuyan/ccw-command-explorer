# Phase 4: Quick Plan & Execute

> 来源: 分析会话 `ANL-issue-discover规划执行能力-2026-02-11`

## Overview

直接将高置信度 discovery findings 转换为 `.task/*.json` 并内联执行。
跳过 issue 注册和完整规划流程，适用于明确可修复的问题。

**Core workflow**: Load Findings → Filter → Convert to Tasks → Pre-Execution → User Confirmation → Execute → Finalize
**Trigger**: Phase 2/3 完成后，用户选择 "Quick Plan & Execute"
**Output Directory**: 继承 discovery session 的 `{outputDir}`
**Filter**: `confidence ≥ 0.7 AND priority ∈ {critical, high}`

## Prerequisites

- Phase 2 (Discover) 或 Phase 3 (Discover by Prompt) 已完成
- `{outputDir}` 下存在 discovery 输出 (perspectives/*.json 或 discovery-issues.jsonl)

## Auto Mode

When `--yes` or `-y`: 自动过滤 → 自动生成任务 → 自动确认执行 → 失败自动跳过 → 自动 Done。

## Execution Steps

### Step 4.1: Load & Filter Findings

**加载优先级** (按顺序尝试):

```
1. perspectives/*.json  — Phase 2 多视角发现 (每个文件含 findings[])
2. discovery-issues.jsonl — Phase 2/3 聚合输出 (每行一个 JSON finding)
3. iterations/*.json — Phase 3 迭代输出 (每个文件含 findings[])
→ 如果全部为空: 报错 "No discoveries found. Run discover first." 并退出
```

**过滤规则**:

```
executableFindings = allFindings.filter(f =>
  (f.confidence || 0) >= 0.7 &&
  ['critical', 'high'].includes(f.priority)
)
```

- 如果 0 个可执行 findings → 提示 "No executable findings (all below threshold)"，建议用户走 "Export to Issues" 路径
- 如果超过 10 个 findings → ASK_USER 确认是否全部执行或选择子集 (Auto mode: 全部执行)

**同文件聚合**:

```
按 finding.file 聚合:
- 同文件 1 个 finding → 生成 1 个独立 task
- 同文件 2+ findings → 合并为 1 个 task (mergeFindingsToTask)
```

### Step 4.2: Generate .task/*.json

对每个 filtered finding (或 file group)，生成 task-schema.json 格式的任务文件。

#### 单 Finding 转换 (convertFindingToTask)

```
Finding 字段           → Task-Schema 字段        → 转换逻辑
─────────────────────────────────────────────────────────────
id (dsc-bug-001-...)   → id (TASK-001)           → 重新编号: TASK-{sequential:3}
title                  → title                   → 直接使用
description+impact+rec → description             → 拼接: "{description}\n\nImpact: {impact}\nRecommendation: {recommendation}"
(无)                   → depends_on              → 默认 []
(推导)                 → convergence             → 按 perspective/category 模板推导 (见下表)
suggested_issue.type   → type                    → 映射: bug→fix, feature→feature, enhancement→enhancement, refactor→refactor, test→testing
priority               → priority                → 直接使用 (已匹配 enum)
file + line            → files[]                 → [{path: file, action: "modify", changes: [recommendation], target: "line:{line}"}]
snippet + file:line    → evidence[]              → ["{file}:{line}", snippet]
recommendation         → implementation[]        → [recommendation]
(固定)                 → source                  → {tool: "issue-discover", session_id: discoveryId, original_id: finding.id}
```

**Type 映射**:

```
suggested_issue.type → task type:
  bug → fix, feature → feature, enhancement → enhancement,
  refactor → refactor, test → testing, docs → enhancement

perspective fallback (无 suggested_issue.type 时):
  bug/security → fix, test → testing, quality/maintainability/best-practices → refactor,
  performance/ux → enhancement
```

**Effort 推导**:

```
critical priority → large
high priority → medium
其他 → small
```

#### 合并 Finding 转换 (mergeFindingsToTask)

同文件 2+ findings 合并为一个 task:

```
1. 按 priority 排序: critical > high > medium > low
2. 取最高优先级 finding 的 priority 作为 task priority
3. 取最高优先级 finding 的 type 作为 task type
4. title: "Fix {findings.length} issues in {basename(file)}"
5. description: 按 finding 编号逐条列出 (### Finding N: title + description + impact + recommendation + line)
6. convergence.criteria: 每个 finding 独立生成 criterion
7. verification: 选择最严格的验证命令 (jest > eslint > tsc > Manual)
8. definition_of_done: "修复 {file} 中的 {N} 个问题: {categories.join(', ')}"
9. effort: 1个=原始, 2个=medium, 3+=large
10. source.original_id: findings.map(f => f.id).join(',')
```

#### Convergence 模板 (按 perspective/category 推导)

| Perspective | criteria 模板 | verification | definition_of_done |
|-------------|--------------|-------------|-------------------|
| **bug** | "修复 {file}:{line} 的 {category} 问题", "相关模块测试通过" | `npx tsc --noEmit` | "消除 {impact} 风险" |
| **security** | "修复 {file} 的 {category} 漏洞", "安全检查通过" | `npx eslint {file} --rule 'security/*'` | "消除 {impact} 安全风险" |
| **test** | "新增测试覆盖 {file}:{line} 场景", "新增测试通过" | `npx jest --testPathPattern={testFile}` | "提升 {file} 模块的测试覆盖" |
| **quality** | "重构 {file}:{line} 降低 {category}", "lint 检查通过" | `npx eslint {file}` | "改善代码 {category}" |
| **performance** | "优化 {file}:{line} 的 {category} 问题", "无性能回退" | `npx tsc --noEmit` | "改善 {impact} 的性能表现" |
| **maintainability** | "重构 {file}:{line} 改善 {category}", "构建通过" | `npx tsc --noEmit` | "降低模块间的 {category}" |
| **ux** | "改善 {file}:{line} 的 {category}", "界面测试验证" | `Manual: 检查 UI 行为` | "改善用户感知的 {category}" |
| **best-practices** | "修正 {file}:{line} 的 {category}", "lint 通过" | `npx eslint {file}` | "符合 {category} 最佳实践" |

**低置信度处理**: confidence < 0.8 的 findings，verification 前缀 `Manual: `

**输出**: 写入 `{outputDir}/.task/TASK-{seq}.json`，验证 convergence 非空且非 vague。

### Step 4.3: Pre-Execution Analysis

> Reference: analyze-with-file/EXECUTE.md Step 2-3

复用 EXECUTE.md 的 Pre-Execution 逻辑:

1. **依赖检测**: 检查 `depends_on` 引用是否存在
2. **循环检测**: 无环 → 拓扑排序确定执行顺序
3. **文件冲突分析**: 检查多个 tasks 是否修改同一文件 (同文件已聚合，此处检测跨 task 冲突)
4. **生成 execution.md**: 任务列表、执行顺序、冲突报告
5. **生成 execution-events.md**: 空事件日志，后续记录执行过程

### Step 4.4: User Confirmation

展示任务概要:

```
Quick Execute Summary:
- Total findings: {allFindings.length}
- Executable (filtered): {executableFindings.length}
- Tasks generated: {tasks.length}
- File conflicts: {conflicts.length}
```

ASK_USER:

```javascript
ASK_USER([{
  id: "confirm_execute",
  type: "select",
  prompt: `${tasks.length} tasks ready. Start execution?`,
  options: [
    { label: "Start Execution", description: "Execute all tasks" },
    { label: "Adjust Filter", description: "Change confidence/priority threshold" },
    { label: "Cancel", description: "Skip execution, return to post-phase options" }
  ]
}]);
// Auto mode: Start Execution
```

- "Adjust Filter" → 重新 ASK_USER 输入 confidence 和 priority 阈值，返回 Step 4.1
- "Cancel" → 退出 Phase 4

### Step 4.5: Direct Inline Execution

> Reference: analyze-with-file/EXECUTE.md Step 5

逐任务执行 (按拓扑排序):

```
for each task in sortedTasks:
  1. Read target file(s)
  2. Analyze current state vs task.description
  3. Apply changes (Edit/Write)
  4. Verify convergence:
     - Execute task.convergence.verification command
     - Check criteria fulfillment
  5. Record event to execution-events.md:
     - TASK_START → TASK_COMPLETE / TASK_FAILED
  6. Update .task/TASK-{id}.json _execution status
  7. If failed:
     - Auto mode: Skip & Continue
     - Interactive: ASK_USER → Retry / Skip / Abort
```

**可选 auto-commit**: 每个成功 task 后 `git add {files} && git commit -m "fix: {task.title}"`

### Step 4.6: Finalize

> Reference: analyze-with-file/EXECUTE.md Step 6-7

1. **更新 execution.md**: 执行统计 (成功/失败/跳过)
2. **更新 .task/*.json**: `_execution.status` = completed/failed/skipped
3. **Post-Execute 选项**:

```javascript
// 计算未执行 findings
const remainingFindings = allFindings.filter(f => !executedFindingIds.has(f.id))

ASK_USER([{
  id: "post_quick_execute",
  type: "select",
  prompt: `Quick Execute: ${completedCount}/${tasks.length} succeeded. ${remainingFindings.length} findings not executed.`,
  options: [
    { label: "Retry Failed", description: `Re-execute ${failedCount} failed tasks` },
    { label: "Export Remaining", description: `Export ${remainingFindings.length} remaining findings to issues` },
    { label: "View Events", description: "Display execution-events.md" },
    { label: "Done", description: "End workflow" }
  ]
}]);
// Auto mode: Done
```

**"Export Remaining" 逻辑**: 将未执行的 findings 通过现有 Phase 2/3 的 "Export to Issues" 流程注册为 issues，进入 issue-resolve 完整管道。

## Edge Cases

| 边界情况 | 处理策略 |
|---------|---------|
| 0 个可执行 findings | 提示 "No executable findings"，建议 Export to Issues |
| 只有 1 个 finding | 正常生成 1 个 TASK-001.json，简化确认对话 |
| 超过 10 个 findings | ASK_USER 确认全部执行或选择子集 |
| finding 缺少 recommendation | criteria 退化为 "Review and fix {category} in {file}:{line}" |
| finding 缺少 confidence | 默认 confidence=0.5，不满足过滤阈值 → 排除 |
| discovery 输出不存在 | 报错 "No discoveries found. Run discover first." |
| .task/ 目录已存在 | ASK_USER 追加 (TASK-{max+1}) 或覆盖 |
| 执行中文件被外部修改 | convergence verification 检测到差异，标记为 FAIL |
| 所有 tasks 执行失败 | 建议 "Export to Issues → issue-resolve" 完整路径 |
| finding 来自不同 perspective 但同文件 | 仍合并为一个 task，convergence.criteria 保留各自标准 |
