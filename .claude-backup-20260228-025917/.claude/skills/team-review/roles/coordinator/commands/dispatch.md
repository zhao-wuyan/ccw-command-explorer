# Command: dispatch

> Task chain creation based on pipeline mode. Creates SCAN/REV/FIX tasks with dependencies.

## When to Use

- Phase 3 of Coordinator
- Pipeline mode detected, need to create task chain
- Session initialized

**Trigger conditions**:
- Coordinator Phase 2 complete
- Mode switch requires chain rebuild

## Strategy

### Delegation Mode

**Mode**: Direct (coordinator operates TaskCreate/TaskUpdate directly)

### Decision Logic

```javascript
// Build pipeline based on mode
function buildPipeline(pipelineMode) {
  const pipelines = {
    'default': [
      { prefix: 'SCAN', suffix: '001', owner: 'scanner', desc: 'Multi-dimension code scan', blockedBy: [], meta: {} },
      { prefix: 'REV',  suffix: '001', owner: 'reviewer', desc: 'Deep finding analysis and review', blockedBy: ['SCAN-001'], meta: {} }
    ],
    'full': [
      { prefix: 'SCAN', suffix: '001', owner: 'scanner', desc: 'Multi-dimension code scan', blockedBy: [], meta: {} },
      { prefix: 'REV',  suffix: '001', owner: 'reviewer', desc: 'Deep finding analysis and review', blockedBy: ['SCAN-001'], meta: {} },
      { prefix: 'FIX',  suffix: '001', owner: 'fixer', desc: 'Plan and execute fixes', blockedBy: ['REV-001'], meta: {} }
    ],
    'fix-only': [
      { prefix: 'FIX', suffix: '001', owner: 'fixer', desc: 'Execute fixes from manifest', blockedBy: [], meta: {} }
    ],
    'quick': [
      { prefix: 'SCAN', suffix: '001', owner: 'scanner', desc: 'Quick scan (fast mode)', blockedBy: [], meta: { quick: true } }
    ]
  }
  return pipelines[pipelineMode] || pipelines['default']
}
```

## Execution Steps

### Step 1: Session Initialization

```javascript
// Session directory already created in Phase 2
// Write pipeline config to shared memory
const sharedMemory = JSON.parse(Read(`${sessionFolder}/shared-memory.json`))
sharedMemory.pipeline_mode = pipelineMode
sharedMemory.pipeline_stages = buildPipeline(pipelineMode).map(s => `${s.prefix}-${s.suffix}`)
Write(`${sessionFolder}/shared-memory.json`, JSON.stringify(sharedMemory, null, 2))
```

### Step 2: Create Task Chain

```javascript
const pipeline = buildPipeline(pipelineMode)
const taskIds = {}

for (const stage of pipeline) {
  const taskSubject = `${stage.prefix}-${stage.suffix}: ${stage.desc}`

  // Build task description with session context
  const fullDesc = [
    stage.desc,
    `\nsession: ${sessionFolder}`,
    `\ntarget: ${target}`,
    `\ndimensions: ${dimensions.join(',')}`,
    stage.meta?.quick ? `\nquick: true` : '',
    `\n\nGoal: ${taskDescription || target}`
  ].join('')

  // Create task
  TaskCreate({
    subject: taskSubject,
    description: fullDesc,
    activeForm: `${stage.desc} in progress`
  })

  // Record task ID
  const allTasks = TaskList()
  const newTask = allTasks.find(t => t.subject.startsWith(`${stage.prefix}-${stage.suffix}`))
  taskIds[`${stage.prefix}-${stage.suffix}`] = newTask.id

  // Set owner and dependencies
  const blockedByIds = stage.blockedBy
    .map(dep => taskIds[dep])
    .filter(Boolean)

  TaskUpdate({
    taskId: newTask.id,
    owner: stage.owner,
    addBlockedBy: blockedByIds
  })
}
```

### Step 3: Verify Chain

```javascript
const allTasks = TaskList()
const chainTasks = pipeline.map(s => taskIds[`${s.prefix}-${s.suffix}`]).filter(Boolean)
const chainValid = chainTasks.length === pipeline.length

if (!chainValid) {
  mcp__ccw-tools__team_msg({
    operation: "log", team: teamName, from: "coordinator",
    to: "user", type: "error",
    summary: `[coordinator] Task chain incomplete: ${chainTasks.length}/${pipeline.length}`
  })
}

mcp__ccw-tools__team_msg({
  operation: "log", team: teamName, from: "coordinator",
  to: "all", type: "dispatch_ready",
  summary: `[coordinator] Task chain created: ${pipeline.map(s => `${s.prefix}-${s.suffix}`).join(' -> ')} (mode: ${pipelineMode})`
})
```

## Output Format

```
## Task Chain Created

### Mode: [default|full|fix-only|quick]
### Pipeline Stages: [count]
- [prefix]-[suffix]: [description] (owner: [role], blocked by: [deps])

### Verification: PASS/FAIL
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Task creation fails | Retry once, then report to user |
| Dependency cycle | Flatten dependencies, warn coordinator |
| Invalid pipelineMode | Default to 'default' mode |
| Missing session folder | Re-create, log warning |
