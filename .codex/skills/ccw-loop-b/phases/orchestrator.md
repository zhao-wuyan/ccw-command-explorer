# Orchestrator (Hybrid Pattern)

协调器负责状态管理、worker 调度、结果汇聚。

## Role

```
Read state -> Select mode -> Spawn workers -> Wait results -> Merge -> Update state -> Loop/Exit
```

## State Management

### Read State

```javascript
function readState(loopId) {
  const stateFile = `.workflow/.loop/${loopId}.json`
  return fs.existsSync(stateFile)
    ? JSON.parse(Read(stateFile))
    : null
}
```

### Create State

```javascript
function createState(loopId, taskDescription, mode) {
  const now = new Date().toISOString()

  return {
    loop_id: loopId,
    title: taskDescription.substring(0, 100),
    description: taskDescription,
    mode: mode,
    status: 'running',
    current_iteration: 0,
    max_iterations: 10,
    created_at: now,
    updated_at: now,
    skill_state: {
      phase: 'init',
      action_index: 0,
      workers_completed: [],
      parallel_results: null
    }
  }
}
```

## Mode Handlers

### Interactive Mode

```javascript
async function runInteractiveMode(loopId, state) {
  while (state.status === 'running') {
    // 1. Show menu
    const action = await showMenu(state)
    if (action === 'exit') break

    // 2. Spawn worker
    const worker = spawn_agent({
      message: buildWorkerPrompt(action, loopId, state)
    })

    // 3. Wait for result
    const result = wait({ ids: [worker], timeout_ms: 600000 })

    // 4. Handle timeout
    if (result.timed_out) {
      send_input({ id: worker, message: 'Please converge and output WORKER_RESULT' })
      const retryResult = wait({ ids: [worker], timeout_ms: 300000 })
      if (retryResult.timed_out) {
        console.log('Worker timeout, skipping')
        close_agent({ id: worker })
        continue
      }
    }

    // 5. Process output
    const output = result.status[worker].completed
    state = processWorkerOutput(loopId, action, output, state)

    // 6. Cleanup
    close_agent({ id: worker })

    // 7. Display result
    displayResult(output)
  }
}
```

### Auto Mode

```javascript
async function runAutoMode(loopId, state) {
  const sequence = ['init', 'develop', 'debug', 'validate', 'complete']
  let idx = state.skill_state?.action_index || 0

  while (idx < sequence.length && state.status === 'running') {
    const action = sequence[idx]

    // Spawn and wait
    const worker = spawn_agent({ message: buildWorkerPrompt(action, loopId, state) })
    const result = wait({ ids: [worker], timeout_ms: 600000 })
    const output = result.status[worker].completed
    close_agent({ id: worker })

    // Parse result
    const workerResult = parseWorkerResult(output)
    state = processWorkerOutput(loopId, action, output, state)

    // Determine next
    if (workerResult.loop_back_to) {
      idx = sequence.indexOf(workerResult.loop_back_to)
    } else if (workerResult.status === 'failed') {
      break
    } else {
      idx++
    }

    // Update action index
    state.skill_state.action_index = idx
    saveState(loopId, state)
  }
}
```

### Parallel Mode

```javascript
async function runParallelMode(loopId, state) {
  // Spawn all workers
  const workers = {
    develop: spawn_agent({ message: buildWorkerPrompt('develop', loopId, state) }),
    debug: spawn_agent({ message: buildWorkerPrompt('debug', loopId, state) }),
    validate: spawn_agent({ message: buildWorkerPrompt('validate', loopId, state) })
  }

  // Batch wait
  const results = wait({
    ids: Object.values(workers),
    timeout_ms: 900000
  })

  // Collect outputs
  const outputs = {}
  for (const [role, id] of Object.entries(workers)) {
    if (results.status[id].completed) {
      outputs[role] = results.status[id].completed
    }
    close_agent({ id })
  }

  // Merge analysis
  state.skill_state.parallel_results = outputs
  saveState(loopId, state)

  // Coordinator analyzes merged results
  return analyzeAndDecide(outputs)
}
```

## Worker Prompt Template

```javascript
function buildWorkerPrompt(action, loopId, state) {
  const roleFiles = {
    init: '~/.codex/agents/ccw-loop-b-init.md',
    develop: '~/.codex/agents/ccw-loop-b-develop.md',
    debug: '~/.codex/agents/ccw-loop-b-debug.md',
    validate: '~/.codex/agents/ccw-loop-b-validate.md',
    complete: '~/.codex/agents/ccw-loop-b-complete.md'
  }

  return `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS
1. **Read role definition**: ${roleFiles[action]}
2. Read: .workflow/project-tech.json
3. Read: .workflow/project-guidelines.json

---

## CONTEXT
- Loop ID: ${loopId}
- Action: ${action}
- State: ${JSON.stringify(state, null, 2)}

## TASK
${state.description}

## OUTPUT FORMAT
\`\`\`
WORKER_RESULT:
- action: ${action}
- status: success | failed | needs_input
- summary: <brief>
- files_changed: []
- next_suggestion: <action>
- loop_back_to: <action or null>

DETAILED_OUTPUT:
<action-specific output>
\`\`\`
`
}
```

## Result Processing

```javascript
function parseWorkerResult(output) {
  const result = {
    action: 'unknown',
    status: 'unknown',
    summary: '',
    files_changed: [],
    next_suggestion: null,
    loop_back_to: null
  }

  const match = output.match(/WORKER_RESULT:\s*([\s\S]*?)(?:DETAILED_OUTPUT:|$)/)
  if (match) {
    const lines = match[1].split('\n')
    for (const line of lines) {
      const m = line.match(/^-\s*(\w+):\s*(.+)$/)
      if (m) {
        const [, key, value] = m
        if (key === 'files_changed') {
          try { result.files_changed = JSON.parse(value) } catch {}
        } else {
          result[key] = value.trim()
        }
      }
    }
  }

  return result
}
```

## Termination Conditions

1. User exits (interactive)
2. Sequence complete (auto)
3. Worker failed with no recovery
4. Max iterations reached
5. API paused/stopped

## Best Practices

1. **Worker 生命周期**: spawn → wait → close，不保留 worker
2. **结果持久化**: Worker 输出写入 `.workflow/.loop/{loopId}.workers/`
3. **状态同步**: 每次 worker 完成后更新 state
4. **超时处理**: send_input 请求收敛，再超时则跳过
