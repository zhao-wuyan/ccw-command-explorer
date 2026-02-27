# Action: DEVELOP

Execute development task and record progress to develop.md.

## Purpose

- Execute next pending development task
- Implement code changes
- Record progress to Markdown file
- Update task status in state

## Preconditions

- [ ] state.status === 'running'
- [ ] state.skill_state !== null
- [ ] state.skill_state.develop.tasks.some(t => t.status === 'pending')

## Execution Steps

### Step 1: Verify Control Signals

```javascript
const state = JSON.parse(Read(`.workflow/.loop/${loopId}.json`))

if (state.status !== 'running') {
  return {
    action: 'DEVELOP',
    status: 'failed',
    message: `Cannot develop: status is ${state.status}`,
    next_action: state.status === 'paused' ? 'PAUSED' : 'STOPPED'
  }
}
```

### Step 2: Find Next Pending Task

```javascript
const tasks = state.skill_state.develop.tasks
const currentTask = tasks.find(t => t.status === 'pending')

if (!currentTask) {
  return {
    action: 'DEVELOP',
    status: 'success',
    message: 'All development tasks completed',
    next_action: mode === 'auto' ? 'VALIDATE' : 'MENU'
  }
}

// Mark as in_progress
currentTask.status = 'in_progress'
```

### Step 3: Execute Development Task

```javascript
console.log(`Executing task: ${currentTask.description}`)

// Use appropriate tools based on task type
// - ACE search_context for finding patterns
// - Read for loading files
// - Edit/Write for making changes

// Record files changed
const filesChanged = []

// Implementation logic...
```

### Step 4: Record Changes to Log (NDJSON)

```javascript
const changesLogPath = `${progressDir}/changes.log`
const timestamp = getUtc8ISOString()

const changeEntry = {
  timestamp: timestamp,
  task_id: currentTask.id,
  description: currentTask.description,
  files_changed: filesChanged,
  result: 'success'
}

// Append to NDJSON log
const existingLog = Read(changesLogPath) || ''
Write(changesLogPath, existingLog + JSON.stringify(changeEntry) + '\n')
```

### Step 5: Update Progress Document

```javascript
const progressPath = `${progressDir}/develop.md`
const iteration = state.skill_state.develop.completed + 1

const progressEntry = `
### Iteration ${iteration} - ${currentTask.description} (${timestamp})

#### Task Details

- **ID**: ${currentTask.id}
- **Tool**: ${currentTask.tool}
- **Mode**: ${currentTask.mode}

#### Implementation Summary

[Implementation description]

#### Files Changed

${filesChanged.map(f => `- \`${f}\``).join('\n') || '- No files changed'}

#### Status: COMPLETED

---

`

const existingProgress = Read(progressPath)
Write(progressPath, existingProgress + progressEntry)
```

### Step 6: Update State

```javascript
currentTask.status = 'completed'
currentTask.completed_at = timestamp
currentTask.files_changed = filesChanged

state.skill_state.develop.completed += 1
state.skill_state.develop.current_task = null
state.skill_state.develop.last_progress_at = timestamp
state.skill_state.last_action = 'DEVELOP'
state.skill_state.completed_actions.push('DEVELOP')
state.updated_at = timestamp

Write(`.workflow/.loop/${loopId}.json`, JSON.stringify(state, null, 2))
```

## Output Format

```
ACTION_RESULT:
- action: DEVELOP
- status: success
- message: Task completed: {task_description}
- state_updates: {
    "develop.completed": {N},
    "develop.last_progress_at": "{timestamp}"
  }

FILES_UPDATED:
- .workflow/.loop/{loopId}.json: Task status updated
- .workflow/.loop/{loopId}.progress/develop.md: Progress entry added
- .workflow/.loop/{loopId}.progress/changes.log: Change entry added

NEXT_ACTION_NEEDED: {DEVELOP | DEBUG | VALIDATE | MENU}
```

## Auto Mode Next Action Selection

```javascript
const pendingTasks = tasks.filter(t => t.status === 'pending')

if (pendingTasks.length > 0) {
  return 'DEVELOP'  // More tasks to do
} else {
  return 'DEBUG'    // All done, check for issues
}
```

## Error Handling

| Error Type | Recovery |
|------------|----------|
| Task execution failed | Mark task as failed, continue to next |
| File write failed | Retry once, then report error |
| All tasks done | Move to DEBUG or VALIDATE |

## Next Actions

- More pending tasks: `DEVELOP`
- All tasks complete: `DEBUG` (auto) or `MENU` (interactive)
- Task failed: `DEVELOP` (retry) or `DEBUG` (investigate)
