# Command: dispatch

> 任务链创建与依赖管理。根据 pipeline 模式创建技术债务治理任务链并写入 tasks.json。

## When to Use

- Phase 3 of Coordinator
- Pipeline 模式已确定，需要创建任务链
- 团队已创建，worker 待 spawn

**Trigger conditions**:
- Coordinator Phase 2 完成后
- 模式切换需要重建任务链
- Fix-Verify 循环需要创建修复任务

## Strategy

### Delegation Mode

**Mode**: Direct（coordinator 直接操作 tasks.json）

### Decision Logic

```javascript
// 根据 pipelineMode 选择 pipeline
function buildPipeline(pipelineMode, sessionFolder, taskDescription) {
  const pipelines = {
    'scan': [
      { prefix: 'TDSCAN', owner: 'scanner', desc: '多维度技术债务扫描', deps: [] },
      { prefix: 'TDEVAL', owner: 'assessor', desc: '量化评估与优先级排序', deps: ['TDSCAN'] }
    ],
    'remediate': [
      { prefix: 'TDSCAN', owner: 'scanner', desc: '多维度技术债务扫描', deps: [] },
      { prefix: 'TDEVAL', owner: 'assessor', desc: '量化评估与优先级排序', deps: ['TDSCAN'] },
      { prefix: 'TDPLAN', owner: 'planner', desc: '分阶段治理方案规划', deps: ['TDEVAL'] },
      { prefix: 'TDFIX', owner: 'executor', desc: '债务清理执行', deps: ['TDPLAN'] },
      { prefix: 'TDVAL', owner: 'validator', desc: '清理结果验证', deps: ['TDFIX'] }
    ],
    'targeted': [
      { prefix: 'TDPLAN', owner: 'planner', desc: '定向修复方案规划', deps: [] },
      { prefix: 'TDFIX', owner: 'executor', desc: '债务清理执行', deps: ['TDPLAN'] },
      { prefix: 'TDVAL', owner: 'validator', desc: '清理结果验证', deps: ['TDFIX'] }
    ]
  }
  return pipelines[pipelineMode] || pipelines['scan']
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
const pipeline = buildPipeline(pipelineMode, sessionFolder, taskDescription)
```

### Step 2: Build Tasks JSON

```javascript
const tasks = {}

for (const stage of pipeline) {
  const taskId = `${stage.prefix}-001`

  // 构建任务描述（包含 session 和上下文信息）
  const fullDesc = [
    stage.desc,
    `\nsession: ${sessionFolder}`,
    `\n\n目标: ${taskDescription}`
  ].join('')

  // 构建依赖 ID 列表
  const depIds = stage.deps.map(dep => `${dep}-001`)

  // 添加任务到 tasks 对象
  tasks[taskId] = {
    title: stage.desc,
    description: fullDesc,
    role: stage.owner,
    prefix: stage.prefix,
    deps: depIds,
    status: "pending",
    findings: null,
    error: null
  }
}

// 写入 tasks.json
state.tasks = { ...state.tasks, ...tasks }
// Write updated tasks.json
```

### Step 3: Result Processing

```javascript
// 验证任务链
const chainValid = Object.keys(tasks).length === pipeline.length

if (!chainValid) {
  mcp__ccw-tools__team_msg({
    operation: "log", session_id: sessionId, from: "coordinator",
    type: "error",
  })
}
```

## Fix-Verify Loop Task Creation

当 validator 报告回归问题时，coordinator 调用此逻辑追加任务到 tasks.json：

```javascript
function createFixVerifyTasks(fixVerifyIteration, sessionFolder) {
  const fixId = `TDFIX-fix-${fixVerifyIteration}`
  const valId = `TDVAL-recheck-${fixVerifyIteration}`

  // 添加修复任务到 tasks.json
  state.tasks[fixId] = {
    title: `修复回归问题 (Fix-Verify #${fixVerifyIteration})`,
    description: `修复验证发现的回归问题\nsession: ${sessionFolder}\ntype: fix-verify`,
    role: "executor",
    prefix: "TDFIX",
    deps: [],
    status: "pending",
    findings: null,
    error: null
  }

  // 添加重新验证任务到 tasks.json
  state.tasks[valId] = {
    title: `重新验证 (Fix-Verify #${fixVerifyIteration})`,
    description: `重新验证修复结果\nsession: ${sessionFolder}`,
    role: "validator",
    prefix: "TDVAL",
    deps: [fixId],
    status: "pending",
    findings: null,
    error: null
  }

  // Write updated tasks.json
}
```

## Output Format

```
## Task Chain Created

### Mode: [scan|remediate|targeted]
### Pipeline Stages: [count]
- [prefix]-001: [description] (owner: [role], deps: [deps])

### Verification: PASS/FAIL
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Task creation fails | Retry once, then report to user |
| Dependency cycle detected | Flatten dependencies, warn coordinator |
| Invalid pipelineMode | Default to 'scan' mode |
| Timeout (>5 min) | Report partial results, notify coordinator |
