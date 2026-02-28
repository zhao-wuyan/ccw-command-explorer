# Command: monitor

> 阶段驱动的协调循环。按 pipeline 阶段顺序等待 worker 完成，路由消息，触发 GC 循环，执行质量门控。

**NOTE**: `teamName` variable must be **session ID** (e.g., `TQA-project-2026-02-27`), NOT team name. Extract from `Session:` field in task description.

## When to Use

- Phase 4 of Coordinator
- 任务链已创建并分发
- 需要持续监控直到所有任务完成

**Trigger conditions**:
- dispatch 完成后立即启动
- GC 循环创建新任务后重新进入

## Strategy

### Delegation Mode

**Mode**: Stage-driven（按阶段顺序等待，非轮询）

### 设计原则

> **模型执行没有时间概念，禁止任何形式的轮询等待。**
>
> - ❌ 禁止: `while` 循环 + `sleep` + 检查状态（空转浪费 API 轮次）
> - ❌ 禁止: `Bash(sleep N)` / `Bash(timeout /t N)` 作为等待手段
> - ✅ 采用: 同步 `Task()` 调用（`run_in_background: false`），call 本身即等待
> - ✅ 采用: Worker 返回 = 阶段完成信号（天然回调）
>
> **原理**: `Task(run_in_background: false)` 是阻塞调用，coordinator 自动挂起直到 worker 返回。
> 无需 sleep，无需轮询，无需消息总线监控。Worker 的返回就是回调。

### Decision Logic

```javascript
// 消息路由表
const routingTable = {
  // Scout 完成
  'scan_ready':      { action: 'Mark SCOUT complete, unblock QASTRAT' },
  'issues_found':    { action: 'Mark SCOUT complete with issues, unblock QASTRAT' },
  // Strategist 完成
  'strategy_ready':  { action: 'Mark QASTRAT complete, unblock QAGEN' },
  // Generator 完成
  'tests_generated': { action: 'Mark QAGEN complete, unblock QARUN' },
  'tests_revised':   { action: 'Mark QAGEN-fix complete, unblock QARUN-gc' },
  // Executor 完成
  'tests_passed':    { action: 'Mark QARUN complete, check coverage, unblock next', special: 'check_coverage' },
  'tests_failed':    { action: 'Evaluate failures, decide GC loop or continue', special: 'gc_decision' },
  // Analyst 完成
  'analysis_ready':  { action: 'Mark QAANA complete, evaluate quality gate', special: 'quality_gate' },
  'quality_report':  { action: 'Quality report received, prepare final report', special: 'finalize' },
  // 错误
  'error':           { action: 'Assess severity, retry or escalate', special: 'error_handler' }
}
```

### Stage-Worker 映射表

```javascript
const STAGE_WORKER_MAP = {
  'SCOUT':   { role: 'scout',      skillArgs: '--role=scout' },
  'QASTRAT': { role: 'strategist', skillArgs: '--role=strategist' },
  'QAGEN':   { role: 'generator',  skillArgs: '--role=generator' },
  'QARUN':   { role: 'executor',   skillArgs: '--role=executor' },
  'QAANA':   { role: 'analyst',    skillArgs: '--role=analyst' }
}

// ★ 统一 auto mode 检测：-y/--yes 从 $ARGUMENTS 或 ccw 传播
const autoYes = /\b(-y|--yes)\b/.test(args)
```

## Execution Steps

### Step 1: Context Preparation

```javascript
// 从 shared memory 获取覆盖率目标
const sharedMemory = JSON.parse(Read(`${sessionFolder}/shared-memory.json`))
const strategy = sharedMemory.test_strategy || {}
const coverageTargets = {}
for (const layer of (strategy.layers || [])) {
  coverageTargets[layer.level] = layer.target_coverage
}

let gcIteration = 0
const MAX_GC_ITERATIONS = 3

// 获取 pipeline 阶段列表（来自 dispatch 创建的任务链）
const allTasks = TaskList()
const pipelineTasks = allTasks
  .filter(t => t.owner && t.owner !== 'coordinator')
  .sort((a, b) => Number(a.id) - Number(b.id))
```

### Step 2: Sequential Stage Execution (Stop-Wait)

> **核心**: 逐阶段 spawn worker，同步阻塞等待返回。
> Worker 返回 = 阶段完成。无 sleep、无轮询、无消息总线监控。

```javascript
// 按依赖顺序处理每个阶段
for (const stageTask of pipelineTasks) {
  // 1. 提取阶段前缀 → 确定 worker 角色
  const stagePrefix = stageTask.subject.match(/^([\w-]+)-\d/)?.[1]?.replace(/-L\d$/, '')
  const workerConfig = STAGE_WORKER_MAP[stagePrefix]

  if (!workerConfig) {
    mcp__ccw-tools__team_msg({
      operation: "log", team: teamName, from: "coordinator",
      to: "user", type: "error",
      summary: `[coordinator] 未知阶段前缀: ${stagePrefix}，跳过`
    })
    continue
  }

  // 2. 标记任务为执行中
  TaskUpdate({ taskId: stageTask.id, status: 'in_progress' })

  mcp__ccw-tools__team_msg({
    operation: "log", team: teamName, from: "coordinator",
    to: workerConfig.role, type: "task_unblocked",
    summary: `[coordinator] 启动阶段: ${stageTask.subject} → ${workerConfig.role}`
  })

  // 3. 同步 spawn worker — 阻塞直到 worker 返回（Stop-Wait 核心）
  const workerResult = Task({
    subagent_type: "general-purpose",
    description: `Spawn ${workerConfig.role} worker for ${stageTask.subject}`,
    team_name: teamName,
    name: workerConfig.role,
    prompt: `你是 team "${teamName}" 的 ${workerConfig.role.toUpperCase()}。

## ⚠️ 首要指令（MUST）
Skill(skill="team-quality-assurance", args="${workerConfig.skillArgs}")

## 当前任务
- 任务 ID: ${stageTask.id}
- 任务: ${stageTask.subject}
- 描述: ${stageTask.description || taskDescription}
- Session: ${sessionFolder}

## 角色准则（强制）
- 所有输出必须带 [${workerConfig.role}] 标识前缀
- 仅与 coordinator 通信

## 工作流程
1. Skill(skill="team-quality-assurance", args="${workerConfig.skillArgs}") 获取角色定义
2. 执行任务 → 汇报结果
3. TaskUpdate({ taskId: "${stageTask.id}", status: "completed" })`,
    run_in_background: false
  })

  // 4. Worker 已返回 — 直接处理结果
  const taskState = TaskGet({ taskId: stageTask.id })

  if (taskState.status !== 'completed') {
    // Worker 返回但未标记 completed → 异常处理
    if (autoYes) {
      mcp__ccw-tools__team_msg({
        operation: "log", team: teamName, from: "coordinator",
        to: "user", type: "error",
        summary: `[coordinator] [auto] 阶段 ${stageTask.subject} 未完成，自动跳过`
      })
      TaskUpdate({ taskId: stageTask.id, status: 'deleted' })
      continue
    }

    const decision = AskUserQuestion({
      questions: [{
        question: `阶段 "${stageTask.subject}" worker 返回但未完成。如何处理？`,
        header: "Stage Fail",
        multiSelect: false,
        options: [
          { label: "重试", description: "重新 spawn worker 执行此阶段" },
          { label: "跳过", description: "标记为跳过，继续后续流水线" },
          { label: "终止", description: "停止整个 QA 流程，汇报当前结果" }
        ]
      }]
    })

    const answer = decision["Stage Fail"]
    if (answer === "跳过") {
      TaskUpdate({ taskId: stageTask.id, status: 'deleted' })
      continue
    } else if (answer === "终止") {
      mcp__ccw-tools__team_msg({
        operation: "log", team: teamName, from: "coordinator",
        to: "user", type: "shutdown",
        summary: `[coordinator] 用户终止流水线，当前阶段: ${stageTask.subject}`
      })
      break
    }
    // 重试: continue to next iteration will re-process if logic wraps
  } else {
    mcp__ccw-tools__team_msg({
      operation: "log", team: teamName, from: "coordinator",
      to: "user", type: "quality_gate",
      summary: `[coordinator] 阶段完成: ${stageTask.subject}`
    })
  }

  // 5. 阶段间检查（QARUN 阶段检查覆盖率，决定 GC 循环）
  if (stagePrefix === 'QARUN') {
    const latestMemory = JSON.parse(Read(`${sessionFolder}/shared-memory.json`))
    const coverage = latestMemory.execution_results?.coverage || 0
    const targetLayer = stageTask.metadata?.layer || 'L1'
    const target = coverageTargets[targetLayer] || 80

    if (coverage < target && gcIteration < MAX_GC_ITERATIONS) {
      gcIteration++
      mcp__ccw-tools__team_msg({
        operation: "log", team: teamName, from: "coordinator",
        to: "generator", type: "gc_loop_trigger",
        summary: `[coordinator] GC循环 #${gcIteration}: 覆盖率 ${coverage}% < ${target}%，请修复`
      })
      // 创建 GC 修复任务追加到 pipeline
    }
  }
}
```

### Step 2.1: Message Processing (processMessage)

```javascript
function processMessage(msg, handler) {
  switch (handler.special) {
    case 'check_coverage': {
      const coverage = msg.data?.coverage || 0
      const targetLayer = msg.data?.layer || 'L1'
      const target = coverageTargets[targetLayer] || 80

      if (coverage < target) {
        handleGCDecision(coverage, targetLayer)
      }
      // 覆盖率达标则不做额外处理，流水线自然流转
      break
    }

    case 'gc_decision': {
      const coverage = msg.data?.coverage || 0
      const targetLayer = msg.data?.layer || 'L1'
      handleGCDecision(coverage, targetLayer)
      break
    }

    case 'quality_gate': {
      // 重新读取最新 shared memory
      const latestMemory = JSON.parse(Read(`${sessionFolder}/shared-memory.json`))
      const qualityScore = latestMemory.quality_score || 0
      let status = 'PASS'
      if (qualityScore < 60) status = 'FAIL'
      else if (qualityScore < 80) status = 'CONDITIONAL'

      mcp__ccw-tools__team_msg({
        operation: "log", team: teamName, from: "coordinator",
        to: "user", type: "quality_gate",
        summary: `[coordinator] 质量门控: ${status} (score: ${qualityScore})`
      })
      break
    }

    case 'error_handler': {
      const severity = msg.data?.severity || 'medium'
      if (severity === 'critical') {
        SendMessage({
          content: `## [coordinator] Critical Error from ${msg.from}\n\n${msg.summary}`,
          summary: `[coordinator] Critical error: ${msg.summary}`
        })
      }
      break
    }
  }
}

function handleGCDecision(coverage, targetLayer) {
  if (gcIteration < MAX_GC_ITERATIONS) {
    gcIteration++
    mcp__ccw-tools__team_msg({
      operation: "log", team: teamName, from: "coordinator",
      to: "generator", type: "gc_loop_trigger",
      summary: `[coordinator] GC循环 #${gcIteration}: 覆盖率 ${coverage}% 未达标，请修复`,
      data: { iteration: gcIteration, layer: targetLayer, coverage }
    })
    // 创建 GC 修复任务（参见 dispatch.md createGCLoopTasks）
  } else {
    mcp__ccw-tools__team_msg({
      operation: "log", team: teamName, from: "coordinator",
      to: "user", type: "quality_gate",
      summary: `[coordinator] GC循环已达上限(${MAX_GC_ITERATIONS})，接受当前覆盖率 ${coverage}%`
    })
  }
}
```

### Step 3: Result Processing

```javascript
// 汇总所有结果
const finalSharedMemory = JSON.parse(Read(`${sessionFolder}/shared-memory.json`))
const allFinalTasks = TaskList()
const workerTasks = allFinalTasks.filter(t => t.owner && t.owner !== 'coordinator')
const summary = {
  total_tasks: workerTasks.length,
  completed_tasks: workerTasks.filter(t => t.status === 'completed').length,
  gc_iterations: gcIteration,
  quality_score: finalSharedMemory.quality_score,
  coverage: finalSharedMemory.execution_results?.coverage
}
```

## Output Format

```
## Coordination Summary

### Pipeline Status: COMPLETE
### Tasks: [completed]/[total]
### GC Iterations: [count]
### Quality Score: [score]/100
### Coverage: [percent]%

### Message Log (last 10)
- [timestamp] [from] → [to]: [type] - [summary]
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Worker 返回但未 completed (交互模式) | AskUserQuestion: 重试 / 跳过 / 终止 |
| Worker 返回但未 completed (自动模式) | 自动跳过，记录日志 |
| Worker spawn 失败 | 重试一次，仍失败则上报用户 |
| Quality gate FAIL | Report to user, suggest targeted re-run |
| GC loop stuck >3 iterations | Accept current coverage, continue pipeline |
