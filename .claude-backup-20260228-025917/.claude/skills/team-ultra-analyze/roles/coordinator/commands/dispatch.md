# Command: dispatch

> 任务链创建与依赖管理。根据管道模式创建 pipeline 任务链并分配给 worker 角色。

## When to Use

- Phase 3 of Coordinator
- 管道模式已确定，需要创建任务链
- 团队已创建，worker 已 spawn

**Trigger conditions**:
- Coordinator Phase 2 完成后
- 讨论循环中需要创建补充分析任务
- 方向调整需要创建新探索/分析任务

## Strategy

### Delegation Mode

**Mode**: Direct（coordinator 直接操作 TaskCreate/TaskUpdate）

### Decision Logic

```javascript
// 根据 pipelineMode 和 perspectives 选择 pipeline
function buildPipeline(pipelineMode, perspectives, sessionFolder, taskDescription, dimensions) {
  const pipelines = {
    'quick': [
      { prefix: 'EXPLORE', suffix: '001', owner: 'explorer', desc: '代码库探索', meta: `perspective: general\ndimensions: ${dimensions.join(', ')}`, blockedBy: [] },
      { prefix: 'ANALYZE', suffix: '001', owner: 'analyst', desc: '综合分析', meta: `perspective: technical\ndimensions: ${dimensions.join(', ')}`, blockedBy: ['EXPLORE-001'] },
      { prefix: 'SYNTH', suffix: '001', owner: 'synthesizer', desc: '结论综合', blockedBy: ['ANALYZE-001'] }
    ],
    'standard': buildStandardPipeline(perspectives, dimensions),
    'deep': buildDeepPipeline(perspectives, dimensions)
  }
  return pipelines[pipelineMode] || pipelines['standard']
}

function buildStandardPipeline(perspectives, dimensions) {
  const stages = []
  const perspectiveList = perspectives.length > 0 ? perspectives : ['technical']
  const isParallel = perspectiveList.length > 1

  // Parallel explorations — each gets a distinct agent name for true parallelism
  perspectiveList.forEach((p, i) => {
    const num = String(i + 1).padStart(3, '0')
    const explorerName = isParallel ? `explorer-${i + 1}` : 'explorer'
    stages.push({
      prefix: 'EXPLORE', suffix: num, owner: explorerName,
      desc: `代码库探索 (${p})`,
      meta: `perspective: ${p}\ndimensions: ${dimensions.join(', ')}`,
      blockedBy: []
    })
  })

  // Parallel analyses — each gets a distinct agent name for true parallelism
  perspectiveList.forEach((p, i) => {
    const num = String(i + 1).padStart(3, '0')
    const analystName = isParallel ? `analyst-${i + 1}` : 'analyst'
    stages.push({
      prefix: 'ANALYZE', suffix: num, owner: analystName,
      desc: `深度分析 (${p})`,
      meta: `perspective: ${p}\ndimensions: ${dimensions.join(', ')}`,
      blockedBy: [`EXPLORE-${num}`]
    })
  })

  // Discussion (blocked by all analyses)
  const analyzeIds = perspectiveList.map((_, i) => `ANALYZE-${String(i + 1).padStart(3, '0')}`)
  stages.push({
    prefix: 'DISCUSS', suffix: '001', owner: 'discussant',
    desc: '讨论处理 (Round 1)',
    meta: `round: 1\ntype: initial`,
    blockedBy: analyzeIds
  })

  // Synthesis (blocked by discussion)
  stages.push({
    prefix: 'SYNTH', suffix: '001', owner: 'synthesizer',
    desc: '结论综合',
    blockedBy: ['DISCUSS-001']
  })

  return stages
}

function buildDeepPipeline(perspectives, dimensions) {
  // Same as standard but SYNTH is not created initially
  // It will be created after discussion loop completes
  const stages = buildStandardPipeline(perspectives, dimensions)
  // Remove SYNTH — will be created dynamically after discussion loop
  return stages.filter(s => s.prefix !== 'SYNTH')
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
const pipeline = buildPipeline(pipelineMode, selectedPerspectives, sessionFolder, taskDescription, dimensions)
```

### Step 2: Execute Strategy

```javascript
const taskIds = {}

for (const stage of pipeline) {
  const taskSubject = `${stage.prefix}-${stage.suffix}: ${stage.desc}`

  // 构建任务描述（包含 session 和上下文信息）
  const fullDesc = [
    stage.desc,
    `\nsession: ${sessionFolder}`,
    `\ntopic: ${taskDescription}`,
    stage.meta ? `\n${stage.meta}` : '',
    `\n\n目标: ${taskDescription}`
  ].join('')

  // 创建任务
  TaskCreate({
    subject: taskSubject,
    description: fullDesc,
    activeForm: `${stage.desc}进行中`
  })

  // 记录任务 ID
  const allTasks = TaskList()
  const newTask = allTasks.find(t => t.subject.startsWith(`${stage.prefix}-${stage.suffix}`))
  taskIds[`${stage.prefix}-${stage.suffix}`] = newTask.id

  // 设置 owner 和依赖
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

### Step 3: Result Processing

```javascript
// 验证任务链
const allTasks = TaskList()
const chainTasks = pipeline.map(s => taskIds[`${s.prefix}-${s.suffix}`]).filter(Boolean)
const chainValid = chainTasks.length === pipeline.length

if (!chainValid) {
  mcp__ccw-tools__team_msg({
    operation: "log", team: sessionId, from: "coordinator",
    to: "user", type: "error",
    summary: `[coordinator] 任务链创建不完整: ${chainTasks.length}/${pipeline.length}`
  })
}
```

## Discussion Loop Task Creation

讨论循环中动态创建任务：

```javascript
// 创建新一轮讨论任务
function createDiscussionTask(round, type, userFeedback, sessionFolder) {
  const suffix = String(round).padStart(3, '0')
  TaskCreate({
    subject: `DISCUSS-${suffix}: 讨论处理 (Round ${round})`,
    description: `讨论处理\nsession: ${sessionFolder}\nround: ${round}\ntype: ${type}\nuser_feedback: ${userFeedback}`,
    activeForm: `讨论 Round ${round} 进行中`
  })

  const allTasks = TaskList()
  const newTask = allTasks.find(t => t.subject.startsWith(`DISCUSS-${suffix}`))
  TaskUpdate({ taskId: newTask.id, owner: 'discussant' })
  return newTask.id
}

// 创建补充分析任务（方向调整时）
function createAnalysisFix(round, adjustedFocus, sessionFolder) {
  const suffix = `fix-${round}`
  TaskCreate({
    subject: `ANALYZE-${suffix}: 补充分析 (方向调整 Round ${round})`,
    description: `补充分析\nsession: ${sessionFolder}\nadjusted_focus: ${adjustedFocus}\ntype: direction-fix`,
    activeForm: `补充分析 Round ${round} 进行中`
  })

  const allTasks = TaskList()
  const newTask = allTasks.find(t => t.subject.startsWith(`ANALYZE-${suffix}`))
  TaskUpdate({ taskId: newTask.id, owner: 'analyst' })
  return newTask.id
}

// 创建最终综合任务
function createSynthesisTask(sessionFolder, blockedByIds) {
  TaskCreate({
    subject: `SYNTH-001: 结论综合`,
    description: `跨视角整合\nsession: ${sessionFolder}\ntype: final`,
    activeForm: `结论综合进行中`
  })

  const allTasks = TaskList()
  const newTask = allTasks.find(t => t.subject.startsWith('SYNTH-001'))
  TaskUpdate({
    taskId: newTask.id,
    owner: 'synthesizer',
    addBlockedBy: blockedByIds
  })
  return newTask.id
}
```

## Output Format

```
## Task Chain Created

### Mode: [quick|standard|deep]
### Pipeline Stages: [count]
- [prefix]-[suffix]: [description] (owner: [role], blocked by: [deps])

### Verification: PASS/FAIL
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Task creation fails | Retry once, then report to user |
| Dependency cycle detected | Flatten dependencies, warn coordinator |
| Invalid pipelineMode | Default to 'standard' mode |
| Too many perspectives (>4) | Truncate to first 4, warn user |
| Timeout (>5 min) | Report partial results, notify coordinator |
