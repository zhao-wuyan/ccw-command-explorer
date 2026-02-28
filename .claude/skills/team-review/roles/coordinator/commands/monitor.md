# Command: monitor

> Stop-Wait stage execution. Spawns each worker via Skill(), blocks until return, drives transitions.

## When to Use

- Phase 4 of Coordinator, after dispatch complete

## Strategy

**Mode**: Stop-Wait (synchronous Skill call, not polling)

> **No polling. Synchronous Skill() call IS the wait mechanism.**
>
> - FORBIDDEN: `while` + `sleep` + check status
> - REQUIRED: `Skill()` blocking call = worker return = stage done

### Stage-Worker Map

```javascript
const STAGE_WORKER_MAP = {
  'SCAN': { role: 'scanner',  skillArgs: '--role=scanner' },
  'REV':  { role: 'reviewer', skillArgs: '--role=reviewer' },
  'FIX':  { role: 'fixer',    skillArgs: '--role=fixer' }
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
const sharedMemory = JSON.parse(Read(`${sessionFolder}/shared-memory.json`))

// Get pipeline tasks in creation order (= dependency order)
const allTasks = TaskList()
const pipelineTasks = allTasks
  .filter(t => t.owner && t.owner !== 'coordinator')
  .sort((a, b) => Number(a.id) - Number(b.id))

// Auto mode detection
const autoYes = /\b(-y|--yes)\b/.test(args)
```

### Step 2: Sequential Stage Execution (Stop-Wait)

> **Core**: Spawn one worker per stage, block until return.
> Worker return = stage complete. No sleep, no polling.

```javascript
for (const stageTask of pipelineTasks) {
  // 1. Extract stage prefix -> determine worker role
  const stagePrefix = stageTask.subject.match(/^(\w+)-/)?.[1]
  const workerConfig = STAGE_WORKER_MAP[stagePrefix]

  if (!workerConfig) {
    mcp__ccw-tools__team_msg({
      operation: "log", team: sessionId  // MUST be session ID (e.g., RC-xxx-date), NOT team name, from: "coordinator",
      to: "user", type: "error",
      summary: `[coordinator] Unknown stage prefix: ${stagePrefix}, skipping`
    })
    continue
  }

  // 2. Mark task in progress
  TaskUpdate({ taskId: stageTask.id, status: 'in_progress' })

  mcp__ccw-tools__team_msg({
    operation: "log", team: sessionId  // MUST be session ID (e.g., RC-xxx-date), NOT team name, from: "coordinator",
    to: workerConfig.role, type: "stage_transition",
    summary: `[coordinator] Starting stage: ${stageTask.subject} -> ${workerConfig.role}`
  })

  // 3. Build worker arguments
  const workerArgs = buildWorkerArgs(stageTask, workerConfig)

  // 4. Spawn worker via Skill — blocks until return (Stop-Wait core)
  Skill(skill="team-review", args=workerArgs)

  // 5. Worker returned — check result
  const taskState = TaskGet({ taskId: stageTask.id })

  if (taskState.status !== 'completed') {
    const action = handleStageFailure(stageTask, taskState, workerConfig, autoYes)
    if (action === 'abort') break
    if (action === 'skip') continue
  } else {
    mcp__ccw-tools__team_msg({
      operation: "log", team: sessionId  // MUST be session ID (e.g., RC-xxx-date), NOT team name, from: "coordinator",
      to: "user", type: "stage_transition",
      summary: `[coordinator] Stage complete: ${stageTask.subject}`
    })
  }

  // 6. Post-stage: After SCAN check findings
  if (stagePrefix === 'SCAN') {
    const mem = JSON.parse(Read(`${sessionFolder}/shared-memory.json`))
    if ((mem.findings_count || 0) === 0) {
      mcp__ccw-tools__team_msg({ operation: "log", team: sessionId  // MUST be session ID (e.g., RC-xxx-date), NOT team name, from: "coordinator",
        to: "user", type: "pipeline_complete",
        summary: `[coordinator] 0 findings. Code is clean. Skipping review/fix.` })
      for (const r of pipelineTasks.slice(pipelineTasks.indexOf(stageTask) + 1))
        TaskUpdate({ taskId: r.id, status: 'deleted' })
      break
    }
  }

  // 7. Post-stage: After REV confirm fix scope
  if (stagePrefix === 'REV' && pipelineMode === 'full') {
    const mem = JSON.parse(Read(`${sessionFolder}/shared-memory.json`))

    if (!autoYes) {
      const conf = AskUserQuestion({ questions: [{
        question: `${mem.findings_count || 0} findings reviewed. Proceed with fix?`,
        header: "Fix Confirmation", multiSelect: false,
        options: [
          { label: "Fix all", description: "All actionable findings" },
          { label: "Fix critical/high only", description: "Severity filter" },
          { label: "Skip fix", description: "No code changes" }
        ]
      }] })

      if (conf["Fix Confirmation"] === "Skip fix") {
        pipelineTasks.filter(t => t.subject.startsWith('FIX-'))
          .forEach(ft => TaskUpdate({ taskId: ft.id, status: 'deleted' }))
        break
      }
      mem.fix_scope = conf["Fix Confirmation"] === "Fix critical/high only" ? 'critical,high' : 'all'
      Write(`${sessionFolder}/shared-memory.json`, JSON.stringify(mem, null, 2))
    }

    Write(`${sessionFolder}/fix/fix-manifest.json`, JSON.stringify({
      source: `${sessionFolder}/review/review-report.json`,
      scope: mem.fix_scope || 'all', session: sessionFolder
    }, null, 2))
  }
}
```

### Step 2.1: Worker Argument Builder

```javascript
function buildWorkerArgs(stageTask, workerConfig) {
  const stagePrefix = stageTask.subject.match(/^(\w+)-/)?.[1]
  let workerArgs = `${workerConfig.skillArgs} --session ${sessionFolder}`

  if (stagePrefix === 'SCAN') {
    workerArgs += ` ${target} --dimensions ${dimensions.join(',')}`
    if (stageTask.description?.includes('quick: true')) workerArgs += ' -q'
  } else if (stagePrefix === 'REV') {
    workerArgs += ` --input ${sessionFolder}/scan/scan-results.json --dimensions ${dimensions.join(',')}`
  } else if (stagePrefix === 'FIX') {
    workerArgs += ` --input ${sessionFolder}/fix/fix-manifest.json`
  }

  if (autoYes) workerArgs += ' -y'
  return workerArgs
}
```

### Step 2.2: Stage Failure Handler

```javascript
function handleStageFailure(stageTask, taskState, workerConfig, autoYes) {
  if (autoYes) {
    mcp__ccw-tools__team_msg({ operation: "log", team: sessionId  // MUST be session ID (e.g., RC-xxx-date), NOT team name, from: "coordinator",
      to: "user", type: "error",
      summary: `[coordinator] [auto] ${stageTask.subject} incomplete, skipping` })
    TaskUpdate({ taskId: stageTask.id, status: 'deleted' })
    return 'skip'
  }

  const decision = AskUserQuestion({ questions: [{
    question: `Stage "${stageTask.subject}" incomplete (${taskState.status}). Action?`,
    header: "Stage Failure", multiSelect: false,
    options: [
      { label: "Retry", description: "Re-spawn worker" },
      { label: "Skip", description: "Continue pipeline" },
      { label: "Abort", description: "Stop pipeline" }
    ]
  }] })

  const answer = decision["Stage Failure"]
  if (answer === "Retry") {
    TaskUpdate({ taskId: stageTask.id, status: 'in_progress' })
    Skill(skill="team-review", args=buildWorkerArgs(stageTask, workerConfig))
    if (TaskGet({ taskId: stageTask.id }).status !== 'completed')
      TaskUpdate({ taskId: stageTask.id, status: 'deleted' })
    return 'retried'
  } else if (answer === "Skip") {
    TaskUpdate({ taskId: stageTask.id, status: 'deleted' })
    return 'skip'
  } else {
    mcp__ccw-tools__team_msg({ operation: "log", team: sessionId  // MUST be session ID (e.g., RC-xxx-date), NOT team name, from: "coordinator",
      to: "user", type: "error",
      summary: `[coordinator] User aborted at: ${stageTask.subject}` })
    return 'abort'
  }
}
```

### Step 3: Finalize

```javascript
const finalMemory = JSON.parse(Read(`${sessionFolder}/shared-memory.json`))
finalMemory.pipeline_status = 'complete'
finalMemory.completed_at = new Date().toISOString()
Write(`${sessionFolder}/shared-memory.json`, JSON.stringify(finalMemory, null, 2))
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Worker incomplete (interactive) | AskUser: Retry / Skip / Abort |
| Worker incomplete (auto) | Auto-skip, log warning |
| 0 findings after scan | Skip remaining stages |
| User declines fix | Delete FIX tasks, report review-only |
