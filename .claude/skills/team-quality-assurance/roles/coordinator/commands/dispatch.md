# Command: dispatch

> 任务链创建与依赖管理。根据 QA 模式创建 pipeline 任务链并分配给 worker 角色。

**NOTE**: `teamName` variable must be **session ID** (e.g., `TQA-project-2026-02-27`), NOT team name. Extract from `Session:` field in task description.

## When to Use

- Phase 3 of Coordinator
- QA 模式已确定，需要创建任务链
- 团队已创建，worker 已 spawn

**Trigger conditions**:
- Coordinator Phase 2 完成后
- 模式切换需要重建任务链
- GC 循环需要创建修复任务

## Strategy

### Delegation Mode

**Mode**: Direct（coordinator 直接操作 TaskCreate/TaskUpdate）

### Decision Logic

```javascript
// 根据 qaMode 选择 pipeline
function buildPipeline(qaMode, sessionFolder, taskDescription) {
  const pipelines = {
    'discovery': [
      { prefix: 'SCOUT', owner: 'scout', desc: '多视角问题扫描', blockedBy: [] },
      { prefix: 'QASTRAT', owner: 'strategist', desc: '测试策略制定', blockedBy: ['SCOUT'] },
      { prefix: 'QAGEN', owner: 'generator', desc: '测试代码生成 (L1)', meta: 'layer: L1', blockedBy: ['QASTRAT'] },
      { prefix: 'QARUN', owner: 'executor', desc: '测试执行 (L1)', meta: 'layer: L1', blockedBy: ['QAGEN'] },
      { prefix: 'QAANA', owner: 'analyst', desc: '质量分析报告', blockedBy: ['QARUN'] }
    ],
    'testing': [
      { prefix: 'QASTRAT', owner: 'strategist', desc: '测试策略制定', blockedBy: [] },
      { prefix: 'QAGEN-L1', owner: 'generator', desc: '测试代码生成 (L1)', meta: 'layer: L1', blockedBy: ['QASTRAT'] },
      { prefix: 'QARUN-L1', owner: 'executor', desc: '测试执行 (L1)', meta: 'layer: L1', blockedBy: ['QAGEN-L1'] },
      { prefix: 'QAGEN-L2', owner: 'generator', desc: '测试代码生成 (L2)', meta: 'layer: L2', blockedBy: ['QARUN-L1'] },
      { prefix: 'QARUN-L2', owner: 'executor', desc: '测试执行 (L2)', meta: 'layer: L2', blockedBy: ['QAGEN-L2'] },
      { prefix: 'QAANA', owner: 'analyst', desc: '质量分析报告', blockedBy: ['QARUN-L2'] }
    ],
    'full': [
      { prefix: 'SCOUT', owner: 'scout', desc: '多视角问题扫描', blockedBy: [] },
      { prefix: 'QASTRAT', owner: 'strategist', desc: '测试策略制定', blockedBy: ['SCOUT'] },
      { prefix: 'QAGEN-L1', owner: 'generator-1', desc: '测试代码生成 (L1)', meta: 'layer: L1', blockedBy: ['QASTRAT'] },
      { prefix: 'QAGEN-L2', owner: 'generator-2', desc: '测试代码生成 (L2)', meta: 'layer: L2', blockedBy: ['QASTRAT'] },
      { prefix: 'QARUN-L1', owner: 'executor-1', desc: '测试执行 (L1)', meta: 'layer: L1', blockedBy: ['QAGEN-L1'] },
      { prefix: 'QARUN-L2', owner: 'executor-2', desc: '测试执行 (L2)', meta: 'layer: L2', blockedBy: ['QAGEN-L2'] },
      { prefix: 'QAANA', owner: 'analyst', desc: '质量分析报告', blockedBy: ['QARUN-L1', 'QARUN-L2'] },
      { prefix: 'SCOUT-REG', owner: 'scout', desc: '回归扫描', blockedBy: ['QAANA'] }
    ]
  }
  return pipelines[qaMode] || pipelines['discovery']
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
const pipeline = buildPipeline(qaMode, sessionFolder, taskDescription)
```

### Step 2: Execute Strategy

```javascript
const taskIds = {}

for (const stage of pipeline) {
  // 构建任务描述（包含 session 和层级信息）
  const fullDesc = [
    stage.desc,
    `\nsession: ${sessionFolder}`,
    stage.meta ? `\n${stage.meta}` : '',
    `\n\n目标: ${taskDescription}`
  ].join('')

  // 创建任务
  TaskCreate({
    subject: `${stage.prefix}-001: ${stage.desc}`,
    description: fullDesc,
    activeForm: `${stage.desc}进行中`
  })

  // 记录任务 ID（假设 TaskCreate 返回 ID）
  const allTasks = TaskList()
  const newTask = allTasks.find(t => t.subject.startsWith(`${stage.prefix}-001`))
  taskIds[stage.prefix] = newTask.id

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
const chainTasks = pipeline.map(s => taskIds[s.prefix]).filter(Boolean)
const chainValid = chainTasks.length === pipeline.length

if (!chainValid) {
  mcp__ccw-tools__team_msg({
    operation: "log", team: teamName, from: "coordinator",
    to: "user", type: "error",
    summary: `[coordinator] 任务链创建不完整: ${chainTasks.length}/${pipeline.length}`
  })
}
```

## GC Loop Task Creation

当 executor 报告覆盖率不达标时，coordinator 调用此逻辑追加任务：

```javascript
function createGCLoopTasks(gcIteration, targetLayer, sessionFolder) {
  // 创建修复任务
  TaskCreate({
    subject: `QAGEN-fix-${gcIteration}: 修复 ${targetLayer} 测试 (GC #${gcIteration})`,
    description: `修复未通过测试并补充覆盖\nsession: ${sessionFolder}\nlayer: ${targetLayer}\ntype: gc-fix`,
    activeForm: `GC循环 #${gcIteration} 修复中`
  })

  // 创建重新执行任务
  TaskCreate({
    subject: `QARUN-gc-${gcIteration}: 重新执行 ${targetLayer} (GC #${gcIteration})`,
    description: `重新执行测试验证修复\nsession: ${sessionFolder}\nlayer: ${targetLayer}`,
    activeForm: `GC循环 #${gcIteration} 执行中`
  })

  // 设置依赖: QARUN-gc 依赖 QAGEN-fix
  // ... TaskUpdate addBlockedBy
}
```

## Output Format

```
## Task Chain Created

### Mode: [discovery|testing|full]
### Pipeline Stages: [count]
- [prefix]-001: [description] (owner: [role], blocked by: [deps])

### Verification: PASS/FAIL
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Task creation fails | Retry once, then report to user |
| Dependency cycle detected | Flatten dependencies, warn coordinator |
| Invalid qaMode | Default to 'discovery' mode |
| Agent/CLI failure | Retry once, then fallback to inline execution |
| Timeout (>5 min) | Report partial results, notify coordinator |
