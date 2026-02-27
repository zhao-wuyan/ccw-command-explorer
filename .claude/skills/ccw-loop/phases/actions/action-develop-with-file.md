# Action: Develop With File

增量开发任务执行，记录进度到 progress.md，支持 Gemini 辅助实现。

## Purpose

执行开发任务并记录进度，包括：
- 分析任务需求
- 使用 Gemini/CLI 实现代码
- 记录代码变更
- 更新进度文档

## Preconditions

- [ ] state.status === 'running'
- [ ] state.skill_state !== null
- [ ] state.skill_state.develop.tasks.some(t => t.status === 'pending')

## Session Setup (Unified Location)

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

// 统一位置: .loop/{loopId}
const loopId = state.loop_id
const loopFile = `.loop/${loopId}.json`
const progressDir = `.loop/${loopId}.progress`
const progressPath = `${progressDir}/develop.md`
const changesLogPath = `${progressDir}/changes.log`
```

---

## Execution

### Step 0: Check Control Signals (CRITICAL)

```javascript
/**
 * CRITICAL: 每个 Action 必须在开始时检查控制信号
 * 如果 API 设置了 paused/stopped，Skill 应立即退出
 */
function checkControlSignals(loopId) {
  const state = JSON.parse(Read(`.loop/${loopId}.json`))

  switch (state.status) {
    case 'paused':
      console.log('⏸️ Loop paused by API. Exiting action.')
      return { continue: false, reason: 'paused' }

    case 'failed':
      console.log('⏹️ Loop stopped by API. Exiting action.')
      return { continue: false, reason: 'stopped' }

    case 'running':
      return { continue: true, reason: 'running' }

    default:
      return { continue: false, reason: 'unknown_status' }
  }
}

// Execute check
const control = checkControlSignals(loopId)
if (!control.continue) {
  return {
    skillStateUpdates: { current_action: null },
    continue: false,
    message: `Action terminated: ${control.reason}`
  }
}
```

### Step 1: 加载任务列表

```javascript
// 读取任务列表 (从 skill_state)
let tasks = state.skill_state?.develop?.tasks || []

// 如果任务列表为空，询问用户创建
if (tasks.length === 0) {
  // 使用 Gemini 分析任务描述，生成任务列表
  const analysisPrompt = `
PURPOSE: 分析开发任务并分解为可执行步骤
Success: 生成 3-7 个具体、可验证的子任务

TASK:
• 分析任务描述: ${state.task_description}
• 识别关键功能点
• 分解为独立子任务
• 为每个子任务指定工具和模式

MODE: analysis

CONTEXT: @package.json @src/**/*.ts | Memory: 项目结构

EXPECTED:
JSON 格式:
{
  "tasks": [
    {
      "id": "task-001",
      "description": "任务描述",
      "tool": "gemini",
      "mode": "write",
      "files": ["src/xxx.ts"]
    }
  ]
}
`

  const result = await Task({
    subagent_type: 'cli-execution-agent',
    run_in_background: false,
    prompt: `Execute Gemini CLI with prompt: ${analysisPrompt}`
  })

  tasks = JSON.parse(result).tasks
}

// 找到第一个待处理任务
const currentTask = tasks.find(t => t.status === 'pending')

if (!currentTask) {
  return {
    skillStateUpdates: {
      develop: { ...state.skill_state.develop, current_task: null }
    },
    continue: true,
    message: '所有开发任务已完成'
  }
}
```

### Step 2: 执行开发任务

```javascript
console.log(`\n执行任务: ${currentTask.description}`)

// 更新任务状态
currentTask.status = 'in_progress'

// 使用 Gemini 实现
const implementPrompt = `
PURPOSE: 实现开发任务
Task: ${currentTask.description}
Success criteria: 代码实现完成，测试通过

TASK:
• 分析现有代码结构
• 实现功能代码
• 添加必要的类型定义
• 确保代码风格一致

MODE: write

CONTEXT: @${currentTask.files?.join(' @') || 'src/**/*.ts'}

EXPECTED:
- 完整的代码实现
- 代码变更列表
- 简要实现说明

CONSTRAINTS: 遵循现有代码风格 | 不破坏现有功能
`

const implementResult = await Bash({
  command: `ccw cli -p "${implementPrompt}" --tool gemini --mode write --rule development-implement-feature`,
  run_in_background: false
})

// 记录代码变更
const timestamp = getUtc8ISOString()
const changeEntry = {
  timestamp,
  task_id: currentTask.id,
  description: currentTask.description,
  files_changed: currentTask.files || [],
  result: 'success'
}

// 追加到 changes.log (NDJSON 格式)
const changesContent = Read(changesLogPath) || ''
Write(changesLogPath, changesContent + JSON.stringify(changeEntry) + '\n')
```

### Step 3: 更新进度文档

```javascript
const timestamp = getUtc8ISOString()
const iteration = state.develop.completed_count + 1

// 读取现有进度文档
let progressContent = Read(progressPath) || ''

// 如果是新文档，添加头部
if (!progressContent) {
  progressContent = `# Development Progress

**Session ID**: ${state.session_id}
**Task**: ${state.task_description}
**Started**: ${timestamp}

---

## Progress Timeline

`
}

// 追加本次进度
const progressEntry = `
### Iteration ${iteration} - ${currentTask.description} (${timestamp})

#### Task Details

- **ID**: ${currentTask.id}
- **Tool**: ${currentTask.tool}
- **Mode**: ${currentTask.mode}

#### Implementation Summary

${implementResult.summary || '实现完成'}

#### Files Changed

${currentTask.files?.map(f => `- \`${f}\``).join('\n') || '- No files specified'}

#### Status: COMPLETED

---

`

Write(progressPath, progressContent + progressEntry)

// 更新任务状态
currentTask.status = 'completed'
currentTask.completed_at = timestamp
```

### Step 4: 更新任务列表文件

```javascript
// 更新 tasks.json
const updatedTasks = tasks.map(t =>
  t.id === currentTask.id ? currentTask : t
)

Write(tasksPath, JSON.stringify(updatedTasks, null, 2))
```

## State Updates

```javascript
return {
  stateUpdates: {
    develop: {
      tasks: updatedTasks,
      current_task_id: null,
      completed_count: state.develop.completed_count + 1,
      total_count: updatedTasks.length,
      last_progress_at: getUtc8ISOString()
    },
    last_action: 'action-develop-with-file'
  },
  continue: true,
  message: `任务完成: ${currentTask.description}\n进度: ${state.develop.completed_count + 1}/${updatedTasks.length}`
}
```

## Error Handling

| Error Type | Recovery |
|------------|----------|
| Gemini CLI 失败 | 提示用户手动实现，记录到 progress.md |
| 文件写入失败 | 重试一次，失败则记录错误 |
| 任务解析失败 | 询问用户手动输入任务 |

## Progress Document Template

```markdown
# Development Progress

**Session ID**: LOOP-xxx-2026-01-22
**Task**: 实现用户认证功能
**Started**: 2026-01-22T10:00:00+08:00

---

## Progress Timeline

### Iteration 1 - 分析登录组件 (2026-01-22T10:05:00+08:00)

#### Task Details

- **ID**: task-001
- **Tool**: gemini
- **Mode**: analysis

#### Implementation Summary

分析了现有登录组件结构，识别了需要修改的文件和依赖关系。

#### Files Changed

- `src/components/Login.tsx`
- `src/hooks/useAuth.ts`

#### Status: COMPLETED

---

### Iteration 2 - 实现登录 API (2026-01-22T10:15:00+08:00)

...

---

## Current Statistics

| Metric | Value |
|--------|-------|
| Total Tasks | 5 |
| Completed | 2 |
| In Progress | 1 |
| Pending | 2 |
| Progress | 40% |

---

## Next Steps

- [ ] 完成剩余任务
- [ ] 运行测试
- [ ] 代码审查
```

## CLI Integration

### 任务分析
```bash
ccw cli -p "PURPOSE: 分解开发任务为子任务
TASK: • 分析任务描述 • 识别功能点 • 生成任务列表
MODE: analysis
CONTEXT: @package.json @src/**/*
EXPECTED: JSON 任务列表
" --tool gemini --mode analysis --rule planning-breakdown-task-steps
```

### 代码实现
```bash
ccw cli -p "PURPOSE: 实现功能代码
TASK: • 分析需求 • 编写代码 • 添加类型
MODE: write
CONTEXT: @src/xxx.ts
EXPECTED: 完整实现
" --tool gemini --mode write --rule development-implement-feature
```

## Next Actions (Hints)

- 所有任务完成: `action-debug-with-file` (开始调试)
- 任务失败: `action-develop-with-file` (重试或下一个任务)
- 用户选择: `action-menu` (返回菜单)
