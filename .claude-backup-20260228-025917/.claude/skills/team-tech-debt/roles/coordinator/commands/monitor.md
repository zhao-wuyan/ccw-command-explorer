# Command: monitor

> 停止等待（Stop-Wait）协调。按 pipeline 阶段顺序，逐阶段 spawn worker 同步执行，worker 返回即阶段完成，无需轮询。

## When to Use

- Phase 4 of Coordinator
- 任务链已创建（dispatch 完成）
- 需要逐阶段驱动 worker 执行直到所有任务完成

**Trigger conditions**:
- dispatch 完成后立即启动
- Fix-Verify 循环创建新任务后重新进入

## Strategy

### Delegation Mode

**Mode**: Stop-Wait（同步阻塞 Task call，非轮询）

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

### Stage-Worker 映射表

```javascript
const STAGE_WORKER_MAP = {
  'TDSCAN': { role: 'scanner',   skillArgs: '--role=scanner' },
  'TDEVAL': { role: 'assessor',  skillArgs: '--role=assessor' },
  'TDPLAN': { role: 'planner',   skillArgs: '--role=planner' },
  'TDFIX':  { role: 'executor',  skillArgs: '--role=executor' },
  'TDVAL':  { role: 'validator', skillArgs: '--role=validator' }
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
const sharedMemory = JSON.parse(Read(`${sessionFolder}/shared-memory.json`))

let fixVerifyIteration = 0
const MAX_FIX_VERIFY_ITERATIONS = 3
let worktreeCreated = false

// 获取 pipeline 阶段列表（按创建顺序 = 依赖顺序）
const allTasks = TaskList()
const pipelineTasks = allTasks
  .filter(t => t.owner && t.owner !== 'coordinator')
  .sort((a, b) => Number(a.id) - Number(b.id))

// 统一 auto mode 检测
const autoYes = /\b(-y|--yes)\b/.test(args)
```

### Step 2: Sequential Stage Execution (Stop-Wait)

> **核心**: 逐阶段 spawn worker，同步阻塞等待返回。
> Worker 返回 = 阶段完成。无 sleep、无轮询、无消息总线监控。

```javascript
for (const stageTask of pipelineTasks) {
  // 1. 提取阶段前缀 → 确定 worker 角色
  const stagePrefix = stageTask.subject.match(/^(TD\w+)-/)?.[1]
  const workerConfig = STAGE_WORKER_MAP[stagePrefix]

  if (!workerConfig) {
    mcp__ccw-tools__team_msg({
      operation: "log", team: sessionId  // MUST be session ID (e.g., TD-xxx-date), NOT team name, from: "coordinator",
      to: "user", type: "error",
      summary: `[coordinator] 未知阶段前缀: ${stagePrefix}，跳过`
    })
    continue
  }

  // 2. 标记任务为执行中
  TaskUpdate({ taskId: stageTask.id, status: 'in_progress' })

  mcp__ccw-tools__team_msg({
    operation: "log", team: sessionId  // MUST be session ID (e.g., TD-xxx-date), NOT team name, from: "coordinator",
    to: workerConfig.role, type: "task_unblocked",
    summary: `[coordinator] 启动阶段: ${stageTask.subject} → ${workerConfig.role}`
  })

  // 3. 同步 spawn worker — 阻塞直到 worker 返回（Stop-Wait 核心）
  //    Task() 本身就是等待机制，无需 sleep/poll
  const workerResult = Task({
    subagent_type: "general-purpose",
    description: `Spawn ${workerConfig.role} worker for ${stageTask.subject}`,
    team_name: teamName,
    name: workerConfig.role,
    prompt: buildWorkerPrompt(stageTask, workerConfig, sessionFolder, taskDescription),
    run_in_background: false  // ← 同步阻塞 = 天然回调
  })

  // 4. Worker 已返回 — 直接处理结果（无需检查状态）
  const taskState = TaskGet({ taskId: stageTask.id })

  if (taskState.status !== 'completed') {
    // Worker 返回但未标记 completed → 异常处理
    handleStageFailure(stageTask, taskState, workerConfig, autoYes)
  } else {
    mcp__ccw-tools__team_msg({
      operation: "log", team: sessionId  // MUST be session ID (e.g., TD-xxx-date), NOT team name, from: "coordinator",
      to: "user", type: "quality_gate",
      summary: `[coordinator] 阶段完成: ${stageTask.subject}`
    })
  }

  // 5. Plan Approval Gate（TDPLAN 完成后，进入 TDFIX 前）
  if (stagePrefix === 'TDPLAN' && taskState.status === 'completed') {
    // 读取治理方案
    let planContent = ''
    try { planContent = Read(`${sessionFolder}/plan/remediation-plan.md`) } catch {}
    if (!planContent) {
      try { planContent = JSON.stringify(JSON.parse(Read(`${sessionFolder}/plan/remediation-plan.json`)), null, 2) } catch {}
    }

    mcp__ccw-tools__team_msg({
      operation: "log", team: sessionId  // MUST be session ID (e.g., TD-xxx-date), NOT team name, from: "coordinator",
      to: "user", type: "plan_approval",
      summary: `[coordinator] 治理方案已生成，等待审批`
    })

    if (!autoYes) {
      // 输出方案摘要供用户审阅
      // 注意: 方案内容通过 AskUserQuestion 的描述呈现
      const approval = AskUserQuestion({
        questions: [{
          question: `治理方案已生成，请审阅后决定:\n\n${planContent ? planContent.slice(0, 2000) : '(方案文件未找到，请查看 ' + sessionFolder + '/plan/)'}${planContent && planContent.length > 2000 ? '\n\n... (已截断，完整方案见 ' + sessionFolder + '/plan/)' : ''}`,
          header: "Plan Review",
          multiSelect: false,
          options: [
            { label: "批准执行", description: "按此方案创建 worktree 并执行修复" },
            { label: "修订方案", description: "重新规划（重新 spawn planner）" },
            { label: "终止", description: "停止流水线，不执行修复" }
          ]
        }]
      })

      const planDecision = approval["Plan Review"]
      if (planDecision === "修订方案") {
        // 重新创建 TDPLAN 任务并 spawn planner
        const revisedTask = TaskCreate({
          subject: `TDPLAN-revised: 修订治理方案`,
          description: `session: ${sessionFolder}\n需求: ${taskDescription}\n用户要求修订方案`,
          activeForm: "Revising remediation plan"
        })
        TaskUpdate({ taskId: revisedTask.id, owner: 'planner', status: 'pending' })
        // 将修订任务插入到当前位置之后重新执行
        pipelineTasks.splice(pipelineTasks.indexOf(stageTask) + 1, 0, {
          id: revisedTask.id,
          subject: `TDPLAN-revised`,
          description: revisedTask.description
        })
        continue  // 跳到下一阶段（即刚插入的修订任务）
      } else if (planDecision === "终止") {
        mcp__ccw-tools__team_msg({
          operation: "log", team: sessionId  // MUST be session ID (e.g., TD-xxx-date), NOT team name, from: "coordinator",
          to: "user", type: "shutdown",
          summary: `[coordinator] 用户终止流水线（方案审批阶段）`
        })
        break  // 退出 pipeline 循环
      }
      // "批准执行" → 继续
    }
  }

  // 6. Worktree Creation（TDFIX 之前，方案已批准）
  if (stagePrefix === 'TDFIX' && !worktreeCreated) {
    const branchName = `tech-debt/TD-${sessionSlug}-${sessionDate}`
    const worktreePath = `.worktrees/TD-${sessionSlug}-${sessionDate}`

    // 创建 worktree 和新分支
    Bash(`git worktree add -b "${branchName}" "${worktreePath}"`)

    // 安装依赖（如有 package.json）
    Bash(`cd "${worktreePath}" && npm install --ignore-scripts 2>/dev/null || true`)

    // 存入 shared memory
    sharedMemory.worktree = { path: worktreePath, branch: branchName }
    Write(`${sessionFolder}/shared-memory.json`, JSON.stringify(sharedMemory, null, 2))

    worktreeCreated = true

    mcp__ccw-tools__team_msg({
      operation: "log", team: sessionId  // MUST be session ID (e.g., TD-xxx-date), NOT team name, from: "coordinator",
      to: "user", type: "worktree_created",
      summary: `[coordinator] Worktree 已创建: ${worktreePath} (branch: ${branchName})`
    })
  }

  // 7. 阶段间质量检查（仅 TDVAL 阶段）
  if (stagePrefix === 'TDVAL') {
    const needsFixVerify = evaluateValidationResult(sessionFolder)
    if (needsFixVerify && fixVerifyIteration < MAX_FIX_VERIFY_ITERATIONS) {
      fixVerifyIteration++
      const fixVerifyTasks = createFixVerifyTasks(fixVerifyIteration, sessionFolder)
      // 将 Fix-Verify 任务追加到 pipeline 末尾继续执行
      pipelineTasks.push(...fixVerifyTasks)
    }
  }
}
```

### Step 2.1: Worker Prompt Builder

```javascript
function buildWorkerPrompt(stageTask, workerConfig, sessionFolder, taskDescription) {
  const stagePrefix = stageTask.subject.match(/^(TD\w+)-/)?.[1] || 'TD'

  // Worktree 注入（TDFIX 和 TDVAL 阶段）
  let worktreeSection = ''
  if (sharedMemory.worktree && (stagePrefix === 'TDFIX' || stagePrefix === 'TDVAL')) {
    worktreeSection = `
## Worktree（强制）
- Worktree 路径: ${sharedMemory.worktree.path}
- 分支: ${sharedMemory.worktree.branch}
- **所有文件读取、修改、命令执行必须在 worktree 路径下进行**
- 使用 \`cd "${sharedMemory.worktree.path}" && ...\` 前缀执行所有 Bash 命令
- 禁止在主工作树中修改任何文件`
  }

  return `你是 team "${teamName}" 的 ${workerConfig.role.toUpperCase()}。

## ⚠️ 首要指令（MUST）
你的所有工作必须通过调用 Skill 获取角色定义后执行，禁止自行发挥：
Skill(skill="team-tech-debt", args="${workerConfig.skillArgs}")
此调用会加载你的角色定义（role.md）、可用命令（commands/*.md）和完整执行逻辑。

## 当前任务
- 任务 ID: ${stageTask.id}
- 任务: ${stageTask.subject}
- 描述: ${stageTask.description || taskDescription}
- Session: ${sessionFolder}
${worktreeSection}
## 角色准则（强制）
- 你只能处理 ${stagePrefix}-* 前缀的任务
- 所有输出必须带 [${workerConfig.role}] 标识前缀
- 仅与 coordinator 通信，不得直接联系其他 worker

## 消息总线（必须）
每次 SendMessage 前，先调用 mcp__ccw-tools__team_msg 记录。

## 工作流程（严格按顺序）
1. 调用 Skill(skill="team-tech-debt", args="${workerConfig.skillArgs}") 获取角色定义和执行逻辑
2. 按 role.md 中的 5-Phase 流程执行
3. team_msg log + SendMessage 结果给 coordinator
4. TaskUpdate({ taskId: "${stageTask.id}", status: "completed" })`
}
```

### Step 2.2: Stage Failure Handler

```javascript
function handleStageFailure(stageTask, taskState, workerConfig, autoYes) {
  if (autoYes) {
    mcp__ccw-tools__team_msg({
      operation: "log", team: sessionId  // MUST be session ID (e.g., TD-xxx-date), NOT team name, from: "coordinator",
      to: "user", type: "error",
      summary: `[coordinator] [auto] 阶段 ${stageTask.subject} 未完成 (status=${taskState.status})，自动跳过`
    })
    TaskUpdate({ taskId: stageTask.id, status: 'deleted' })
    return 'skip'
  }

  const decision = AskUserQuestion({
    questions: [{
      question: `阶段 "${stageTask.subject}" worker 返回但未完成 (status=${taskState.status})。如何处理？`,
      header: "Stage Fail",
      multiSelect: false,
      options: [
        { label: "重试", description: "重新 spawn worker 执行此阶段" },
        { label: "跳过", description: "标记为跳过，继续后续流水线" },
        { label: "终止", description: "停止整个流程，汇报当前结果" }
      ]
    }]
  })

  const answer = decision["Stage Fail"]
  if (answer === "重试") {
    // 重新 spawn worker（递归单次）
    TaskUpdate({ taskId: stageTask.id, status: 'in_progress' })
    const retryResult = Task({
      subagent_type: "general-purpose",
      description: `Retry ${workerConfig.role} worker for ${stageTask.subject}`,
      team_name: teamName,
      name: workerConfig.role,
      prompt: buildWorkerPrompt(stageTask, workerConfig, sessionFolder, taskDescription),
      run_in_background: false
    })
    const retryState = TaskGet({ taskId: stageTask.id })
    if (retryState.status !== 'completed') {
      TaskUpdate({ taskId: stageTask.id, status: 'deleted' })
    }
    return 'retried'
  } else if (answer === "跳过") {
    TaskUpdate({ taskId: stageTask.id, status: 'deleted' })
    return 'skip'
  } else {
    mcp__ccw-tools__team_msg({
      operation: "log", team: sessionId  // MUST be session ID (e.g., TD-xxx-date), NOT team name, from: "coordinator",
      to: "user", type: "shutdown",
      summary: `[coordinator] 用户终止流水线，当前阶段: ${stageTask.subject}`
    })
    return 'abort'
  }
}
```

### Step 2.3: Validation Evaluation

```javascript
function evaluateValidationResult(sessionFolder) {
  const latestMemory = JSON.parse(Read(`${sessionFolder}/shared-memory.json`))
  const debtBefore = latestMemory.debt_score_before || 0
  const debtAfter = latestMemory.debt_score_after || 0
  const regressions = latestMemory.validation_results?.regressions || 0
  const improved = debtAfter < debtBefore

  let status = 'PASS'
  if (!improved && regressions > 0) status = 'FAIL'
  else if (!improved) status = 'CONDITIONAL'

  mcp__ccw-tools__team_msg({
    operation: "log", team: sessionId  // MUST be session ID (e.g., TD-xxx-date), NOT team name, from: "coordinator",
    to: "user", type: "quality_gate",
    summary: `[coordinator] 质量门控: ${status} (债务分 ${debtBefore} → ${debtAfter}, 回归 ${regressions})`
  })

  return regressions > 0
}
```

### Step 3: Result Processing + PR Creation

```javascript
// 汇总所有结果
const finalSharedMemory = JSON.parse(Read(`${sessionFolder}/shared-memory.json`))
const allFinalTasks = TaskList()
const workerTasks = allFinalTasks.filter(t => t.owner && t.owner !== 'coordinator')

// PR 创建（worktree 执行模式下，验证通过后）
if (finalSharedMemory.worktree && finalSharedMemory.validation_results?.passed) {
  const { path: wtPath, branch } = finalSharedMemory.worktree

  // Commit all changes in worktree
  Bash(`cd "${wtPath}" && git add -A && git commit -m "$(cat <<'EOF'
tech-debt: ${taskDescription}

Automated tech debt cleanup via team-tech-debt pipeline.
Mode: ${pipelineMode}
Items fixed: ${finalSharedMemory.fix_results?.items_fixed || 0}
Debt score: ${finalSharedMemory.debt_score_before} → ${finalSharedMemory.debt_score_after}
EOF
)"`)

  // Push + Create PR
  Bash(`cd "${wtPath}" && git push -u origin "${branch}"`)

  const prTitle = `Tech Debt: ${taskDescription.slice(0, 50)}`
  Bash(`cd "${wtPath}" && gh pr create --title "${prTitle}" --body "$(cat <<'EOF'
## Tech Debt Cleanup

**Mode**: ${pipelineMode}
**Items fixed**: ${finalSharedMemory.fix_results?.items_fixed || 0}
**Debt score**: ${finalSharedMemory.debt_score_before} → ${finalSharedMemory.debt_score_after}

### Validation
- Tests: ${finalSharedMemory.validation_results?.checks?.test_suite?.status || 'N/A'}
- Types: ${finalSharedMemory.validation_results?.checks?.type_check?.status || 'N/A'}
- Lint: ${finalSharedMemory.validation_results?.checks?.lint_check?.status || 'N/A'}

### Session
${sessionFolder}
EOF
)"`)

  mcp__ccw-tools__team_msg({
    operation: "log", team: sessionId  // MUST be session ID (e.g., TD-xxx-date), NOT team name, from: "coordinator",
    to: "user", type: "pr_created",
    summary: `[coordinator] PR 已创建: branch ${branch}`
  })

  // Cleanup worktree
  Bash(`git worktree remove "${wtPath}" 2>/dev/null || true`)
} else if (finalSharedMemory.worktree && !finalSharedMemory.validation_results?.passed) {
  mcp__ccw-tools__team_msg({
    operation: "log", team: sessionId  // MUST be session ID (e.g., TD-xxx-date), NOT team name, from: "coordinator",
    to: "user", type: "quality_gate",
    summary: `[coordinator] 验证未通过，worktree 保留于 ${finalSharedMemory.worktree.path}，请手动检查`
  })
}

const summary = {
  total_tasks: workerTasks.length,
  completed_tasks: workerTasks.filter(t => t.status === 'completed').length,
  fix_verify_iterations: fixVerifyIteration,
  debt_score_before: finalSharedMemory.debt_score_before,
  debt_score_after: finalSharedMemory.debt_score_after
}
```

## Output Format

```
## Coordination Summary

### Pipeline Status: COMPLETE
### Tasks: [completed]/[total]
### Fix-Verify Iterations: [count]
### Debt Score: [before] → [after]
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Worker 返回但未 completed (交互模式) | AskUserQuestion: 重试 / 跳过 / 终止 |
| Worker 返回但未 completed (自动模式) | 自动跳过，记录日志 |
| Worker spawn 失败 | 重试一次，仍失败则上报用户 |
| Quality gate FAIL | Report to user, suggest targeted re-run |
| Fix-Verify loop stuck >3 iterations | Accept current state, continue pipeline |
| Shared memory 读取失败 | 降级为 TaskList 状态判断 |
