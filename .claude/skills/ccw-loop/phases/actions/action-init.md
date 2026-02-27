# Action: Initialize

初始化 CCW Loop 会话，创建目录结构和初始状态。

## Purpose

- 创建会话目录结构
- 初始化状态文件
- 分析任务描述生成初始任务列表
- 准备执行环境

## Preconditions

- [ ] state.status === 'pending'
- [ ] state.initialized === false

## Execution

### Step 1: 创建目录结构

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

const taskSlug = state.task_description.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30)
const dateStr = getUtc8ISOString().substring(0, 10)
const sessionId = `LOOP-${taskSlug}-${dateStr}`
const sessionFolder = `.workflow/.loop/${sessionId}`

Bash(`mkdir -p "${sessionFolder}/develop"`)
Bash(`mkdir -p "${sessionFolder}/debug"`)
Bash(`mkdir -p "${sessionFolder}/validate"`)

console.log(`Session created: ${sessionId}`)
console.log(`Location: ${sessionFolder}`)
```

### Step 2: 创建元数据文件

```javascript
const meta = {
  session_id: sessionId,
  task_description: state.task_description,
  created_at: getUtc8ISOString(),
  mode: state.mode || 'interactive'
}

Write(`${sessionFolder}/meta.json`, JSON.stringify(meta, null, 2))
```

### Step 3: 分析任务生成开发任务列表

```javascript
// 使用 Gemini 分析任务描述
console.log('\n分析任务描述...')

const analysisPrompt = `
PURPOSE: 分析开发任务并分解为可执行步骤
Success: 生成 3-7 个具体、可验证的子任务

TASK:
• 分析任务描述: ${state.task_description}
• 识别关键功能点
• 分解为独立子任务
• 为每个子任务指定工具和模式

MODE: analysis

CONTEXT: @package.json @src/**/*.ts (如存在)

EXPECTED:
JSON 格式:
{
  "tasks": [
    {
      "id": "task-001",
      "description": "任务描述",
      "tool": "gemini",
      "mode": "write",
      "priority": 1
    }
  ],
  "estimated_complexity": "low|medium|high",
  "key_files": ["file1.ts", "file2.ts"]
}

CONSTRAINTS: 生成实际可执行的任务
`

const result = await Bash({
  command: `ccw cli -p "${analysisPrompt}" --tool gemini --mode analysis --rule planning-breakdown-task-steps`,
  run_in_background: false
})

const analysis = JSON.parse(result.stdout)
const tasks = analysis.tasks.map((t, i) => ({
  ...t,
  id: t.id || `task-${String(i + 1).padStart(3, '0')}`,
  status: 'pending',
  created_at: getUtc8ISOString(),
  completed_at: null,
  files_changed: []
}))

// 保存任务列表
Write(`${sessionFolder}/develop/tasks.json`, JSON.stringify(tasks, null, 2))
```

### Step 4: 初始化进度文档

```javascript
const progressInitial = `# Development Progress

**Session ID**: ${sessionId}
**Task**: ${state.task_description}
**Started**: ${getUtc8ISOString()}
**Estimated Complexity**: ${analysis.estimated_complexity}

---

## Task List

${tasks.map((t, i) => `${i + 1}. [ ] ${t.description}`).join('\n')}

## Key Files

${analysis.key_files?.map(f => `- \`${f}\``).join('\n') || '- To be determined'}

---

## Progress Timeline

`

Write(`${sessionFolder}/develop/progress.md`, progressInitial)
```

### Step 5: 显示初始化结果

```javascript
console.log(`\n✅ 会话初始化完成`)
console.log(`\n任务列表 (${tasks.length} 项):`)
tasks.forEach((t, i) => {
  console.log(`  ${i + 1}. ${t.description} [${t.tool}/${t.mode}]`)
})
console.log(`\n预估复杂度: ${analysis.estimated_complexity}`)
console.log(`\n执行 'develop' 开始开发，或 'menu' 查看更多选项`)
```

## State Updates

```javascript
return {
  stateUpdates: {
    session_id: sessionId,
    status: 'running',
    initialized: true,
    develop: {
      tasks: tasks,
      current_task_id: null,
      completed_count: 0,
      total_count: tasks.length,
      last_progress_at: null
    },
    debug: {
      current_bug: null,
      hypotheses: [],
      confirmed_hypothesis: null,
      iteration: 0,
      last_analysis_at: null,
      understanding_updated: false
    },
    validate: {
      test_results: [],
      coverage: null,
      passed: false,
      failed_tests: [],
      last_run_at: null
    },
    context: {
      estimated_complexity: analysis.estimated_complexity,
      key_files: analysis.key_files
    }
  },
  continue: true,
  message: `会话 ${sessionId} 已初始化\n${tasks.length} 个开发任务待执行`
}
```

## Error Handling

| Error Type | Recovery |
|------------|----------|
| 目录创建失败 | 检查权限，重试 |
| Gemini 分析失败 | 提示用户手动输入任务 |
| 任务解析失败 | 使用默认任务列表 |

## Next Actions

- 成功: `action-menu` (显示操作菜单) 或 `action-develop-with-file` (直接开始开发)
- 失败: 报错退出
