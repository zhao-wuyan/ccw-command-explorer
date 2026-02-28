# Command: remediate

> 分批委派 code-developer 执行债务清理。按修复类型分组（重构、死代码移除、依赖更新、文档补充），每批委派给 code-developer。

## When to Use

- Phase 3 of Executor
- 治理方案已加载，修复 actions 已分批
- 需要通过 code-developer 执行代码修改

**Trigger conditions**:
- TDFIX-* 任务进入 Phase 3
- 修复 actions 列表非空
- 目标文件可访问

## Strategy

### Delegation Mode

**Mode**: Sequential Batch Delegation
**Subagent**: `code-developer`
**Batch Strategy**: 按修复类型分组，每组一个委派

### Decision Logic

```javascript
// 分批策略
const batchOrder = ['refactor', 'update-deps', 'add-tests', 'add-docs', 'restructure']

// 按优先级排序批次
function sortBatches(batches) {
  const sorted = {}
  for (const type of batchOrder) {
    if (batches[type]) sorted[type] = batches[type]
  }
  // 追加未知类型
  for (const [type, actions] of Object.entries(batches)) {
    if (!sorted[type]) sorted[type] = actions
  }
  return sorted
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
// 按类型分组并排序
const sortedBatches = sortBatches(batches)

// Worktree 路径（从 shared memory 加载）
const worktreePath = sharedMemory.worktree?.path || null
const cmdPrefix = worktreePath ? `cd "${worktreePath}" && ` : ''

// 每批最大 items 数
const MAX_ITEMS_PER_BATCH = 10

// 如果单批过大，进一步拆分
function splitLargeBatches(batches) {
  const result = {}
  for (const [type, actions] of Object.entries(batches)) {
    if (actions.length <= MAX_ITEMS_PER_BATCH) {
      result[type] = actions
    } else {
      for (let i = 0; i < actions.length; i += MAX_ITEMS_PER_BATCH) {
        const chunk = actions.slice(i, i + MAX_ITEMS_PER_BATCH)
        result[`${type}-${Math.floor(i / MAX_ITEMS_PER_BATCH) + 1}`] = chunk
      }
    }
  }
  return result
}

const finalBatches = splitLargeBatches(sortedBatches)
```

### Step 2: Execute Strategy

```javascript
for (const [batchName, actions] of Object.entries(finalBatches)) {
  // 构建修复上下文
  const batchType = batchName.replace(/-\d+$/, '')
  const fileList = actions.map(a => a.file).filter(Boolean)

  // 根据类型选择修复提示
  const typePrompts = {
    'refactor': `Refactor the following code to reduce complexity and improve readability. Preserve all existing behavior.`,
    'update-deps': `Update the specified dependencies. Check for breaking changes in changelogs.`,
    'add-tests': `Add missing test coverage for the specified modules. Follow existing test patterns.`,
    'add-docs': `Add documentation (JSDoc/docstrings) for the specified public APIs. Follow existing doc style.`,
    'restructure': `Restructure module boundaries to reduce coupling. Move code to appropriate locations.`
  }

  const prompt = typePrompts[batchType] || 'Apply the specified fix to resolve technical debt.'

  // 委派给 code-developer
  Task({
    subagent_type: "code-developer",
    run_in_background: false,
    description: `Tech debt cleanup: ${batchName} (${actions.length} items)`,
    prompt: `## Goal
${prompt}
${worktreePath ? `\n## Worktree（强制）\n- 工作目录: ${worktreePath}\n- **所有文件操作必须在 ${worktreePath} 下进行**\n- 读文件: Read("${worktreePath}/path/to/file")\n- Bash 命令: cd "${worktreePath}" && ...\n- 禁止修改主工作树\n` : ''}
## Items to Fix
${actions.map(a => `### ${a.debt_id}: ${a.action}
- File: ${a.file || 'N/A'}
- Type: ${a.type}
${a.steps ? '- Steps:\n' + a.steps.map(s => `  1. ${s}`).join('\n') : ''}`).join('\n\n')}

## Constraints
- Read each file BEFORE modifying
- Make minimal changes - fix only the specified debt item
- Preserve backward compatibility
- Do NOT skip tests or add @ts-ignore
- Do NOT introduce new dependencies unless explicitly required
- Run syntax check after modifications

## Files to Read First
${fileList.map(f => `- ${f}`).join('\n')}`
  })

  // 验证批次结果
  const batchResult = {
    batch: batchName,
    items: actions.length,
    status: 'completed'
  }

  // 检查文件是否被修改（在 worktree 中执行）
  for (const file of fileList) {
    const modified = Bash(`${cmdPrefix}git diff --name-only -- "${file}" 2>/dev/null`).trim()
    if (modified) {
      fixResults.files_modified.push(file)
    }
  }
}
```

### Step 3: Result Processing

```javascript
// 统计修复结果
const totalActions = Object.values(finalBatches).flat().length
fixResults.items_fixed = fixResults.files_modified.length
fixResults.items_failed = totalActions - fixResults.items_fixed
fixResults.items_remaining = fixResults.items_failed

// 生成修复摘要
const batchSummaries = Object.entries(finalBatches).map(([name, actions]) =>
  `- ${name}: ${actions.length} items`
).join('\n')
```

## Output Format

```
## Remediation Results

### Batches Executed: [count]
### Items Fixed: [count]/[total]
### Files Modified: [count]

### Batch Details
- [batch-name]: [count] items - [status]

### Modified Files
- [file-path]
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| code-developer fails on a batch | Retry once, mark failed items |
| File locked or read-only | Skip file, log error |
| Syntax error after fix | Revert with git checkout, mark as failed |
| New import/dependency needed | Add minimally, document in fix log |
| Batch too large (>10 items) | Auto-split into sub-batches |
| Agent timeout | Use partial results, continue next batch |
