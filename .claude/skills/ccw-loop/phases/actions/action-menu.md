# Action: Menu

显示交互式操作菜单，让用户选择下一步操作。

## Purpose

- 显示当前状态摘要
- 提供操作选项
- 接收用户选择
- 返回下一个动作

## Preconditions

- [ ] state.initialized === true
- [ ] state.status === 'running'

## Execution

### Step 1: 生成状态摘要

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

// 开发进度
const developProgress = state.develop.total_count > 0
  ? `${state.develop.completed_count}/${state.develop.total_count} (${(state.develop.completed_count / state.develop.total_count * 100).toFixed(0)}%)`
  : '未开始'

// 调试状态
const debugStatus = state.debug.confirmed_hypothesis
  ? `✅ 已确认根因`
  : state.debug.iteration > 0
    ? `🔍 迭代 ${state.debug.iteration}`
    : '未开始'

// 验证状态
const validateStatus = state.validate.passed
  ? `✅ 通过`
  : state.validate.test_results.length > 0
    ? `❌ ${state.validate.failed_tests.length} 个失败`
    : '未运行'

const statusSummary = `
═══════════════════════════════════════════════════════════
  CCW Loop - ${state.session_id}
═══════════════════════════════════════════════════════════

  任务: ${state.task_description}
  迭代: ${state.iteration_count}

  ┌─────────────────────────────────────────────────────┐
  │  开发 (Develop)  │  ${developProgress.padEnd(20)}      │
  │  调试 (Debug)    │  ${debugStatus.padEnd(20)}      │
  │  验证 (Validate) │  ${validateStatus.padEnd(20)}      │
  └─────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════
`

console.log(statusSummary)
```

### Step 2: 显示操作选项

```javascript
const options = [
  {
    label: "📝 继续开发 (Develop)",
    description: state.develop.completed_count < state.develop.total_count
      ? `执行下一个开发任务`
      : "所有任务已完成，可添加新任务",
    action: "action-develop-with-file"
  },
  {
    label: "🔍 开始调试 (Debug)",
    description: state.debug.iteration > 0
      ? "继续假设驱动调试"
      : "开始新的调试会话",
    action: "action-debug-with-file"
  },
  {
    label: "✅ 运行验证 (Validate)",
    description: "运行测试并检查覆盖率",
    action: "action-validate-with-file"
  },
  {
    label: "📊 查看详情 (Status)",
    description: "查看详细进度和文件",
    action: "action-status"
  },
  {
    label: "🏁 完成循环 (Complete)",
    description: "结束当前循环",
    action: "action-complete"
  },
  {
    label: "🚪 退出 (Exit)",
    description: "保存状态并退出",
    action: "exit"
  }
]

const response = await AskUserQuestion({
  questions: [{
    question: "选择下一步操作：",
    header: "操作",
    multiSelect: false,
    options: options.map(o => ({
      label: o.label,
      description: o.description
    }))
  }]
})

const selectedLabel = response["操作"]
const selectedOption = options.find(o => o.label === selectedLabel)
const nextAction = selectedOption?.action || 'action-menu'
```

### Step 3: 处理特殊选项

```javascript
if (nextAction === 'exit') {
  console.log('\n保存状态并退出...')
  return {
    stateUpdates: {
      status: 'user_exit'
    },
    continue: false,
    message: '会话已保存，使用 --resume 可继续'
  }
}

if (nextAction === 'action-status') {
  // 显示详细状态
  const sessionFolder = `.workflow/.loop/${state.session_id}`

  console.log('\n=== 开发进度 ===')
  const progress = Read(`${sessionFolder}/develop/progress.md`)
  console.log(progress?.substring(0, 500) + '...')

  console.log('\n=== 调试状态 ===')
  if (state.debug.hypotheses.length > 0) {
    state.debug.hypotheses.forEach(h => {
      console.log(`  ${h.id}: ${h.status} - ${h.description.substring(0, 50)}...`)
    })
  } else {
    console.log('  尚未开始调试')
  }

  console.log('\n=== 验证结果 ===')
  if (state.validate.test_results.length > 0) {
    const latest = state.validate.test_results[state.validate.test_results.length - 1]
    console.log(`  最近运行: ${latest.timestamp}`)
    console.log(`  通过率: ${latest.summary.pass_rate}%`)
  } else {
    console.log('  尚未运行验证')
  }

  // 返回菜单
  return {
    stateUpdates: {},
    continue: true,
    nextAction: 'action-menu',
    message: ''
  }
}
```

## State Updates

```javascript
return {
  stateUpdates: {
    // 不更新状态，仅返回下一个动作
  },
  continue: true,
  nextAction: nextAction,
  message: `执行: ${selectedOption?.label || nextAction}`
}
```

## Error Handling

| Error Type | Recovery |
|------------|----------|
| 用户取消 | 返回菜单 |
| 无效选择 | 重新显示菜单 |

## Next Actions

根据用户选择动态决定下一个动作。
