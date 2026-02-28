# Command: monitor

> 阶段驱动的协调循环 + 讨论循环。按 pipeline 阶段顺序等待 worker 完成，驱动讨论循环，执行最终综合触发。

## When to Use

- Phase 4 of Coordinator
- 任务链已创建并分发
- 需要持续监控直到所有任务完成

**Trigger conditions**:
- dispatch 完成后立即启动
- 讨论循环创建新任务后重新进入

## Strategy

### Delegation Mode

**Mode**: Stage-driven（按阶段顺序等待，非轮询）+ Discussion-loop（讨论循环由 coordinator 驱动）

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
  // Explorer 完成
  'exploration_ready': { action: 'Mark EXPLORE complete, unblock ANALYZE' },
  // Analyst 完成
  'analysis_ready':    { action: 'Mark ANALYZE complete, unblock DISCUSS or SYNTH' },
  // Discussant 完成
  'discussion_processed': { action: 'Mark DISCUSS complete, trigger user feedback collection', special: 'discussion_feedback' },
  // Synthesizer 完成
  'synthesis_ready':   { action: 'Mark SYNTH complete, prepare final report', special: 'finalize' },
  // 错误
  'error':             { action: 'Assess severity, retry or escalate', special: 'error_handler' }
}
```

### Stage-Worker 映射表

```javascript
const STAGE_WORKER_MAP = {
  'EXPLORE': { role: 'explorer',    skillArgs: '--role=explorer' },
  'ANALYZE': { role: 'analyst',     skillArgs: '--role=analyst' },
  'DISCUSS': { role: 'discussant',  skillArgs: '--role=discussant' },
  'SYNTH':   { role: 'synthesizer', skillArgs: '--role=synthesizer' }
}

// ★ 统一 auto mode 检测
const autoYes = /\b(-y|--yes)\b/.test(args)
```

## Execution Steps

### Step 1: Context Preparation

```javascript
// 从 shared memory 获取当前状态
const sharedMemory = JSON.parse(Read(`${sessionFolder}/shared-memory.json`))

let discussionRound = 0
const MAX_DISCUSSION_ROUNDS = pipelineMode === 'deep' ? 5 : (pipelineMode === 'standard' ? 1 : 0)

// 获取 pipeline 阶段列表（来自 dispatch 创建的任务链）
const allTasks = TaskList()
const pipelineTasks = allTasks
  .filter(t => t.owner && t.owner !== 'coordinator')
  .sort((a, b) => Number(a.id) - Number(b.id))
```

### Step 2: Sequential Stage Execution (Stop-Wait) — Exploration + Analysis

> **核心**: 逐阶段 spawn worker，同步阻塞等待返回。
> Worker 返回 = 阶段完成。无 sleep、无轮询、无消息总线监控。

```javascript
// 处理 EXPLORE 和 ANALYZE 阶段
const preDiscussionTasks = pipelineTasks.filter(t =>
  t.subject.startsWith('EXPLORE-') || t.subject.startsWith('ANALYZE-')
)

for (const stageTask of preDiscussionTasks) {
  // 1. 提取阶段前缀 → 确定 worker 角色
  const stagePrefix = stageTask.subject.match(/^(\w+)-/)?.[1]
  const workerConfig = STAGE_WORKER_MAP[stagePrefix]

  if (!workerConfig) continue

  // 2. 标记任务为执行中
  TaskUpdate({ taskId: stageTask.id, status: 'in_progress' })

  mcp__ccw-tools__team_msg({
    operation: "log", team: sessionId, from: "coordinator",
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
Skill(skill="team-ultra-analyze", args="${workerConfig.skillArgs}")

## 当前任务
- 任务 ID: ${stageTask.id}
- 任务: ${stageTask.subject}
- 描述: ${stageTask.description || taskDescription}
- Session: ${sessionFolder}

## 角色准则（强制）
- 所有输出必须带 [${workerConfig.role}] 标识前缀
- 仅与 coordinator 通信

## 工作流程
1. Skill(skill="team-ultra-analyze", args="${workerConfig.skillArgs}") 获取角色定义
2. 执行任务 → 汇报结果
3. TaskUpdate({ taskId: "${stageTask.id}", status: "completed" })`,
    run_in_background: false
  })

  // 4. Worker 已返回 — 检查结果
  const taskState = TaskGet({ taskId: stageTask.id })

  if (taskState.status !== 'completed') {
    handleStageTimeout(stageTask, 0, autoYes)
  } else {
    mcp__ccw-tools__team_msg({
      operation: "log", team: sessionId, from: "coordinator",
      to: "user", type: "quality_gate",
      summary: `[coordinator] 阶段完成: ${stageTask.subject}`
    })
  }
}
```

### Step 2.1: Update discussion.md with Round 1

```javascript
// 读取所有探索和分析结果
const explorationFiles = Glob({ pattern: `${sessionFolder}/explorations/*.json` })
const analysisFiles = Glob({ pattern: `${sessionFolder}/analyses/*.json` })

const explorations = explorationFiles.map(f => JSON.parse(Read(f)))
const analyses = analysisFiles.map(f => JSON.parse(Read(f)))

// 更新 discussion.md — Round 1
const round1Content = `
### Round 1 - Initial Exploration & Analysis (${new Date().toISOString()})

#### Exploration Results
${explorations.map(e => `- **${e.perspective || 'general'}**: ${e.key_findings?.slice(0, 3).join('; ') || 'No findings'}`).join('\n')}

#### Analysis Results
${analyses.map(a => `- **${a.perspective || 'general'}**: ${a.key_insights?.slice(0, 3).join('; ') || 'No insights'}`).join('\n')}

#### Key Findings
${analyses.flatMap(a => a.key_findings || []).slice(0, 5).map(f => `- ${f}`).join('\n')}

#### Discussion Points
${analyses.flatMap(a => a.discussion_points || []).slice(0, 5).map(p => `- ${p}`).join('\n')}

#### Decision Log
> **Decision**: Selected ${pipelineMode} pipeline with ${explorations.length} exploration(s) and ${analyses.length} analysis perspective(s)
> - **Context**: Topic analysis and user preference
> - **Chosen**: ${pipelineMode} mode — **Reason**: ${pipelineMode === 'quick' ? 'Fast overview requested' : pipelineMode === 'deep' ? 'Thorough analysis needed' : 'Balanced depth and breadth'}
`

Edit({
  file_path: `${sessionFolder}/discussion.md`,
  old_string: '## Discussion Timeline\n',
  new_string: `## Discussion Timeline\n${round1Content}\n`
})
```

### Step 3: Discussion Loop (Standard/Deep mode)

```javascript
if (MAX_DISCUSSION_ROUNDS === 0) {
  // Quick mode: skip discussion, go to synthesis
  createSynthesisTask(sessionFolder, [lastAnalyzeTaskId])
} else {
  // Wait for initial DISCUSS-001 to complete
  // Then enter discussion loop

  while (discussionRound < MAX_DISCUSSION_ROUNDS) {
    // 等待当前 DISCUSS 任务完成（Stop-Wait: spawn discussant worker）
    const currentDiscussId = `DISCUSS-${String(discussionRound + 1).padStart(3, '0')}`
    const discussTask = pipelineTasks.find(t => t.subject.startsWith(currentDiscussId))
    if (discussTask) {
      TaskUpdate({ taskId: discussTask.id, status: 'in_progress' })
      const discussResult = Task({
        subagent_type: "general-purpose",
        description: `Spawn discussant worker for ${discussTask.subject}`,
        team_name: teamName,
        name: "discussant",
        prompt: `你是 team "${teamName}" 的 DISCUSSANT。

## Primary Directive
Skill(skill="team-ultra-analyze", args="--role=discussant")

## Assignment
- Task ID: ${discussTask.id}
- Task: ${discussTask.subject}
- Session: ${sessionFolder}

## Workflow
1. Skill(skill="team-ultra-analyze", args="--role=discussant") to load role definition
2. Execute task per role.md
3. TaskUpdate({ taskId: "${discussTask.id}", status: "completed" })

All outputs carry [discussant] tag.`,
        run_in_background: false
      })
    }

    // 收集用户反馈
    const feedbackResult = AskUserQuestion({
      questions: [{
        question: `Round ${discussionRound + 1} 分析结果已就绪。请选择下一步：`,
        header: "Discussion Feedback",
        multiSelect: false,
        options: [
          { label: "同意，继续深入", description: "分析方向正确，继续深入探索" },
          { label: "需要调整方向", description: "有不同理解或关注点" },
          { label: "分析完成", description: "已获得足够信息" },
          { label: "有具体问题", description: "有特定问题需要解答" }
        ]
      }]
    })

    const feedback = feedbackResult["Discussion Feedback"]

    // 📌 记录用户反馈到 decision_trail
    const latestMemory = JSON.parse(Read(`${sessionFolder}/shared-memory.json`))
    latestMemory.decision_trail.push({
      round: discussionRound + 1,
      decision: feedback,
      context: `User feedback at discussion round ${discussionRound + 1}`,
      timestamp: new Date().toISOString()
    })
    Write(`${sessionFolder}/shared-memory.json`, JSON.stringify(latestMemory, null, 2))

    if (feedback === "分析完成") {
      // 📌 Record completion decision
      appendToDiscussion(sessionFolder, discussionRound + 1, {
        user_input: "分析完成",
        decision: "Exit discussion loop, proceed to synthesis",
        reason: "User satisfied with current analysis depth"
      })
      break
    }

    if (feedback === "需要调整方向") {
      // 收集调整方向
      const directionResult = AskUserQuestion({
        questions: [{
          question: "请选择新的关注方向：",
          header: "Direction Adjustment",
          multiSelect: false,
          options: [
            { label: "代码细节", description: "深入具体代码实现" },
            { label: "架构层面", description: "关注系统架构设计" },
            { label: "最佳实践", description: "对比行业最佳实践" },
            { label: "自定义", description: "输入自定义方向" }
          ]
        }]
      })

      const newDirection = directionResult["Direction Adjustment"]

      // 📌 Record direction change
      appendToDiscussion(sessionFolder, discussionRound + 1, {
        user_input: `调整方向: ${newDirection}`,
        decision: `Direction adjusted to: ${newDirection}`,
        reason: "User requested focus change"
      })

      // 创建补充分析 + 新讨论任务
      const fixId = createAnalysisFix(discussionRound + 1, newDirection, sessionFolder)
      discussionRound++
      createDiscussionTask(discussionRound + 1, 'direction-adjusted', newDirection, sessionFolder)
      continue
    }

    if (feedback === "有具体问题") {
      // 📌 Record question
      appendToDiscussion(sessionFolder, discussionRound + 1, {
        user_input: "有具体问题（由 discussant 处理）",
        decision: "Create discussion task for specific questions"
      })

      discussionRound++
      createDiscussionTask(discussionRound + 1, 'specific-questions', 'User has specific questions', sessionFolder)
      continue
    }

    // 同意，继续深入
    appendToDiscussion(sessionFolder, discussionRound + 1, {
      user_input: "同意，继续深入",
      decision: "Continue deepening in current direction"
    })

    discussionRound++
    if (discussionRound < MAX_DISCUSSION_ROUNDS) {
      createDiscussionTask(discussionRound + 1, 'deepen', 'Continue current direction', sessionFolder)
    }
  }

  // 创建最终综合任务
  const lastDiscussTaskId = getLastCompletedTaskId('DISCUSS')
  createSynthesisTask(sessionFolder, [lastDiscussTaskId])
}
```

### Step 3.1: Discussion Helper Functions

```javascript
function appendToDiscussion(sessionFolder, round, data) {
  const roundContent = `
### Round ${round + 1} - Discussion (${new Date().toISOString()})

#### User Input
${data.user_input}

#### Decision Log
> **Decision**: ${data.decision}
> - **Context**: Discussion round ${round + 1}
> - **Reason**: ${data.reason || 'User-directed'}

#### Updated Understanding
${data.updated_understanding || '(Updated by discussant)'}

`
  // Append to discussion.md
  const currentContent = Read(`${sessionFolder}/discussion.md`)
  Write(`${sessionFolder}/discussion.md`, currentContent + roundContent)
}

function handleStageTimeout(stageTask, _unused, autoYes) {
  if (autoYes) {
    mcp__ccw-tools__team_msg({
      operation: "log", team: sessionId, from: "coordinator",
      to: "user", type: "error",
      summary: `[coordinator] [auto] 阶段 ${stageTask.subject} worker 返回但未完成，自动跳过`
    })
    TaskUpdate({ taskId: stageTask.id, status: 'deleted' })
    return
  }

  const decision = AskUserQuestion({
    questions: [{
      question: `阶段 "${stageTask.subject}" worker 返回但未完成。如何处理？`,
      header: "Stage Fail",
      multiSelect: false,
      options: [
        { label: "重试", description: "重新 spawn worker 执行此阶段" },
        { label: "跳过此阶段", description: "标记为跳过，继续后续流水线" },
        { label: "终止流水线", description: "停止整个分析流程" }
      ]
    }]
  })

  const answer = decision["Stage Fail"]
  if (answer === "跳过此阶段") {
    TaskUpdate({ taskId: stageTask.id, status: 'deleted' })
  } else if (answer === "终止流水线") {
    mcp__ccw-tools__team_msg({
      operation: "log", team: sessionId, from: "coordinator",
      to: "user", type: "shutdown",
      summary: `[coordinator] 用户终止流水线，当前阶段: ${stageTask.subject}`
    })
  }
}
```

### Step 4: Wait for Synthesis + Result Processing

```javascript
// 等待 SYNTH-001 完成（Stop-Wait: spawn synthesizer worker）
const synthTask = pipelineTasks.find(t => t.subject.startsWith('SYNTH-'))
if (synthTask) {
  TaskUpdate({ taskId: synthTask.id, status: 'in_progress' })
  const synthResult = Task({
    subagent_type: "general-purpose",
    description: `Spawn synthesizer worker for ${synthTask.subject}`,
    team_name: teamName,
    name: "synthesizer",
    prompt: `你是 team "${teamName}" 的 SYNTHESIZER。

## Primary Directive
Skill(skill="team-ultra-analyze", args="--role=synthesizer")

## Assignment
- Task ID: ${synthTask.id}
- Task: ${synthTask.subject}
- Session: ${sessionFolder}

## Workflow
1. Skill(skill="team-ultra-analyze", args="--role=synthesizer") to load role definition
2. Execute task per role.md
3. TaskUpdate({ taskId: "${synthTask.id}", status: "completed" })

All outputs carry [synthesizer] tag.`,
    run_in_background: false
  })
}

// 汇总所有结果
const finalMemory = JSON.parse(Read(`${sessionFolder}/shared-memory.json`))
const allFinalTasks = TaskList()
const workerTasks = allFinalTasks.filter(t => t.owner && t.owner !== 'coordinator')
const summary = {
  total_tasks: workerTasks.length,
  completed_tasks: workerTasks.filter(t => t.status === 'completed').length,
  discussion_rounds: discussionRound,
  has_synthesis: !!finalMemory.synthesis,
  decisions_made: finalMemory.decision_trail?.length || 0
}
```

## Output Format

```
## Coordination Summary

### Pipeline Status: COMPLETE
### Mode: [quick|standard|deep]
### Tasks: [completed]/[total]
### Discussion Rounds: [count]
### Decisions Made: [count]

### Message Log (last 10)
- [timestamp] [from] → [to]: [type] - [summary]
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Worker 返回但未 completed (交互模式) | AskUserQuestion: 重试 / 跳过 / 终止 |
| Worker 返回但未 completed (自动模式) | 自动跳过，记录日志 |
| Worker spawn 失败 | 重试一次，仍失败则上报用户 |
| Discussion loop stuck >5 rounds | Force synthesis, offer continuation |
| Synthesis fails | Report partial results from analyses |
