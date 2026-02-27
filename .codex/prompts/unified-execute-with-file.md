---
description: Universal execution engine consuming planning/brainstorm/analysis output. Coordinates multi-agents, manages dependencies, and tracks execution with unified progress logging.
argument-hint: "PLAN_PATH=\"<path>\" [EXECUTION_MODE=\"sequential|parallel\"] [AUTO_CONFIRM=\"yes|no\"] [EXECUTION_CONTEXT=\"<focus area>\"]"
---

# Codex Unified-Execute-With-File Prompt

## Overview

Universal execution engine that consumes **any** planning/brainstorm/analysis output and executes it with minimal progress tracking. Coordinates multiple agents (code-developer, test-fix-agent, doc-generator, cli-execution-agent), handles dependencies intelligently, and maintains unified execution timeline.

**Core workflow**: Load Plan → Parse Tasks → Validate Dependencies → Execute Waves → Track Progress → Report Results

**Key features**:
- **Plan Format Agnostic**: Consumes IMPL_PLAN.md, brainstorm synthesis.json, analysis conclusions.json, debug resolutions
- **execution-events.md**: Single source of truth - unified execution log with full agent history
- **Multi-Agent Orchestration**: Parallel execution where possible, sequential where needed
- **Incremental Execution**: Resume from failure point, no re-execution of completed tasks
- **Dependency Management**: Automatic topological sort and execution wave grouping
- **Knowledge Chain**: Each agent reads all previous execution history in context

## Target Execution Plan

**Plan Source**: $PLAN_PATH

- `EXECUTION_MODE`: Strategy (sequential|parallel)
- `AUTO_CONFIRM`: Skip confirmations (yes|no)
- `EXECUTION_CONTEXT`: Focus area/module (optional)

## Execution Process

```
Session Detection:
   ├─ Check if execution session exists
   ├─ If exists → Resume mode
   └─ If not → New session mode

Phase 1: Plan Loading & Validation
   ├─ Detect and parse plan file (multiple formats supported)
   ├─ Extract and normalize tasks
   ├─ Validate dependencies (detect cycles)
   ├─ Create execution session folder
   ├─ Initialize execution.md and execution-events.md
   └─ Pre-execution validation

Phase 2: Execution Orchestration
   ├─ Topological sort for execution order
   ├─ Group tasks into execution waves (parallel-safe groups)
   ├─ Execute waves sequentially (tasks within wave execute in parallel)
   ├─ Monitor completion and capture artifacts
   ├─ Update progress in execution.md and execution-events.md
   └─ Handle failures with retry/skip/abort logic

Phase 3: Progress Tracking & Unified Event Logging
   ├─ execution-events.md: Append-only unified log (SINGLE SOURCE OF TRUTH)
   ├─ Each agent reads all previous events at start
   ├─ Agent executes task with full context from previous agents
   ├─ Agent appends execution event (success/failure) with artifacts and notes
   └─ Next agent reads complete history → knowledge chain

Phase 4: Completion & Summary
   ├─ Collect execution statistics
   ├─ Update execution.md with final status
   ├─ execution-events.md contains complete execution record
   └─ Report results and offer follow-up options
```

## Implementation Details

### Session Setup & Plan Detection

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

// Plan detection from $PLAN_PATH
let planPath = "$PLAN_PATH"

// If not provided, auto-detect
if (!planPath || planPath === "") {
  const candidates = [
    '.workflow/.plan/IMPL_PLAN.md',
    '.workflow/plans/IMPL_PLAN.md',
    '.workflow/IMPL_PLAN.md',
    '.workflow/brainstorm/*/synthesis.json',
    '.workflow/analyze/*/conclusions.json'
  ]

  // Find most recent plan
  planPath = findMostRecentFile(candidates)

  if (!planPath) {
    throw new Error("No execution plan found. Provide PLAN_PATH or ensure .workflow/IMPL_PLAN.md exists")
  }
}

// Session setup
const executionMode = "$EXECUTION_MODE" || "parallel"
const autoConfirm = "$AUTO_CONFIRM" === "yes"
const executionContext = "$EXECUTION_CONTEXT" || ""

const planContent = Read(planPath)
const plan = parsePlan(planContent, planPath)

const executionId = `EXEC-${plan.slug}-${getUtc8ISOString().substring(0, 10)}-${randomId(4)}`
const executionFolder = `.workflow/.execution/${executionId}`
const executionPath = `${executionFolder}/execution.md`
const eventLogPath = `${executionFolder}/execution-events.md`

bash(`mkdir -p "${executionFolder}"`)
```

---

### Plan Format Parsers

Support multiple plan sources:

```javascript
function parsePlan(content, filePath) {
  const ext = filePath.split('.').pop()

  if (filePath.includes('IMPL_PLAN')) {
    return parseImplPlan(content)
  } else if (filePath.includes('brainstorm') && filePath.includes('synthesis')) {
    return parseSynthesisPlan(content)
  } else if (filePath.includes('analyze') && filePath.includes('conclusions')) {
    return parseConclusionsPlan(content)
  } else if (filePath.includes('debug') && filePath.includes('recommendations')) {
    return parseDebugResolutionPlan(content)
  } else if (ext === 'json' && content.includes('tasks')) {
    return parseTaskJson(content)
  }

  throw new Error(`Unsupported plan format: ${filePath}`)
}

// IMPL_PLAN.md parser
function parseImplPlan(content) {
  return {
    type: 'impl-plan',
    title: extractSection(content, 'Overview'),
    phases: extractPhases(content),
    tasks: extractTasks(content),
    criticalFiles: extractCriticalFiles(content),
    estimatedDuration: extractEstimate(content)
  }
}

// Brainstorm synthesis.json parser
function parseSynthesisPlan(content) {
  const synthesis = JSON.parse(content)
  return {
    type: 'brainstorm-synthesis',
    title: synthesis.topic,
    ideas: synthesis.top_ideas,
    tasks: synthesis.top_ideas.map(idea => ({
      id: `IDEA-${slugify(idea.title)}`,
      type: 'investigation',
      title: idea.title,
      description: idea.description,
      dependencies: [],
      agent_type: 'universal-executor',
      prompt: `Implement: ${idea.title}\n${idea.description}`,
      expected_output: idea.next_steps
    }))
  }
}
```

---

## Phase 1: Plan Loading & Validation

### Step 1.1: Parse Plan and Extract Tasks

```javascript
const tasks = plan.tasks || parseTasksFromContent(plan)

// Normalize task structure
const normalizedTasks = tasks.map(task => ({
  id: task.id || `TASK-${generateId()}`,
  title: task.title || task.content,
  description: task.description || task.activeForm,
  type: task.type || inferTaskType(task), // 'code', 'test', 'doc', 'analysis', 'integration'
  agent_type: task.agent_type || selectBestAgent(task),
  dependencies: task.dependencies || [],

  // Execution parameters
  prompt: task.prompt || task.description,
  files_to_modify: task.files_to_modify || [],
  expected_output: task.expected_output || [],

  // Metadata
  priority: task.priority || 'normal',
  parallel_safe: task.parallel_safe !== false,

  // Status tracking
  status: 'pending',
  attempts: 0,
  max_retries: 2
}))

// Validate and detect issues
const validation = {
  cycles: detectDependencyCycles(normalizedTasks),
  missing_dependencies: findMissingDependencies(normalizedTasks),
  file_conflicts: detectOutputConflicts(normalizedTasks),
  warnings: []
}

if (validation.cycles.length > 0) {
  throw new Error(`Circular dependencies detected: ${validation.cycles.join(', ')}`)
}
```

### Step 1.2: Create execution.md

```javascript
const executionMarkdown = `# Execution Progress

**Execution ID**: ${executionId}
**Plan Source**: ${planPath}
**Started**: ${getUtc8ISOString()}
**Mode**: ${executionMode}

**Plan Summary**:
- Title: ${plan.title}
- Total Tasks: ${normalizedTasks.length}
- Phases: ${plan.phases?.length || 'N/A'}

---

## Execution Plan

### Task Overview

| Task ID | Title | Type | Agent | Dependencies | Status |
|---------|-------|------|-------|--------------|--------|
${normalizedTasks.map(t => `| ${t.id} | ${t.title} | ${t.type} | ${t.agent_type} | ${t.dependencies.join(',')} | ${t.status} |`).join('\n')}

### Dependency Graph

\`\`\`
${generateDependencyGraph(normalizedTasks)}
\`\`\`

### Execution Strategy

- **Mode**: ${executionMode}
- **Parallelization**: ${calculateParallel(normalizedTasks)}
- **Estimated Duration**: ${estimateTotalDuration(normalizedTasks)}

---

## Execution Timeline

*Updates as execution progresses*

---

## Current Status

${executionStatus()}
`

Write(executionPath, executionMarkdown)
```

### Step 1.3: Pre-Execution Confirmation

```javascript
if (!autoConfirm) {
  AskUserQuestion({
    questions: [{
      question: `准备执行 ${normalizedTasks.length} 个任务，模式: ${executionMode}\n\n关键任务:\n${normalizedTasks.slice(0, 3).map(t => `• ${t.id}: ${t.title}`).join('\n')}\n\n继续?`,
      header: "Confirmation",
      multiSelect: false,
      options: [
        { label: "开始执行", description: "按计划执行" },
        { label: "调整参数", description: "修改执行参数" },
        { label: "查看详情", description: "查看完整任务列表" },
        { label: "取消", description: "退出不执行" }
      ]
    }]
  })
}
```

---

## Phase 2: Execution Orchestration

### Step 2.1: Determine Execution Order

```javascript
// Topological sort for execution order
const executionOrder = topologicalSort(normalizedTasks)

// For parallel mode, group tasks into waves
let executionWaves = []
if (executionMode === 'parallel') {
  executionWaves = groupIntoWaves(executionOrder, parallelLimit = 3)
} else {
  executionWaves = executionOrder.map(task => [task])
}
```

### Step 2.2: Execute Task Waves

```javascript
let completedCount = 0
let failedCount = 0
const results = {}

for (let waveIndex = 0; waveIndex < executionWaves.length; waveIndex++) {
  const wave = executionWaves[waveIndex]

  console.log(`\n=== Wave ${waveIndex + 1}/${executionWaves.length} ===`)
  console.log(`Tasks: ${wave.map(t => t.id).join(', ')}`)

  // Launch tasks in parallel
  const taskPromises = wave.map(task => executeTask(task, executionFolder))

  // Wait for wave completion
  const waveResults = await Promise.allSettled(taskPromises)

  // Process results
  for (let i = 0; i < waveResults.length; i++) {
    const result = waveResults[i]
    const task = wave[i]

    if (result.status === 'fulfilled') {
      results[task.id] = result.value
      if (result.value.success) {
        completedCount++
        task.status = 'completed'
        console.log(`✅ ${task.id}: Completed`)
      } else if (result.value.retry) {
        console.log(`⚠️ ${task.id}: Will retry`)
        task.status = 'pending'
      } else {
        console.log(`❌ ${task.id}: Failed`)
      }
    } else {
      console.log(`❌ ${task.id}: Execution error`)
    }
  }

  // Update execution.md summary
  appendExecutionTimeline(executionPath, waveIndex + 1, wave, waveResults)
}
```

### Step 2.3: Execute Individual Task with Unified Event Logging

```javascript
async function executeTask(task, executionFolder) {
  const eventLogPath = `${executionFolder}/execution-events.md`
  const startTime = Date.now()

  try {
    // Read previous execution events for context
    let previousEvents = ''
    if (fs.existsSync(eventLogPath)) {
      previousEvents = Read(eventLogPath)
    }

    // Select agent based on task type
    const agent = selectAgent(task.agent_type)

    // Build execution context including previous agent outputs
    const executionContext = `
## Previous Agent Executions (for reference)

${previousEvents}

---

## Current Task: ${task.id}

**Title**: ${task.title}
**Agent**: ${agent}
**Time**: ${getUtc8ISOString()}

### Description
${task.description}

### Context
- Modified Files: ${task.files_to_modify.join(', ')}
- Expected Output: ${task.expected_output.join(', ')}

### Requirements
${task.requirements || 'Follow the plan'}

### Constraints
${task.constraints || 'No breaking changes'}
`

    // Execute based on agent type
    let result

    if (agent === 'code-developer' || agent === 'tdd-developer') {
      result = await Task({
        subagent_type: agent,
        description: `Execute: ${task.title}`,
        prompt: executionContext,
        run_in_background: false
      })
    } else if (agent === 'test-fix-agent') {
      result = await Task({
        subagent_type: 'test-fix-agent',
        description: `Execute Tests: ${task.title}`,
        prompt: executionContext,
        run_in_background: false
      })
    } else {
      result = await Task({
        subagent_type: 'universal-executor',
        description: task.title,
        prompt: executionContext,
        run_in_background: false
      })
    }

    // Capture artifacts
    const artifacts = captureArtifacts(task, executionFolder)

    // Append to unified execution events log
    const eventEntry = `
## Task ${task.id} - COMPLETED ✅

**Timestamp**: ${getUtc8ISOString()}
**Duration**: ${calculateDuration(startTime)}ms
**Agent**: ${agent}

### Execution Summary

${generateSummary(result)}

### Key Outputs

${formatOutputs(result)}

### Generated Artifacts

${artifacts.map(a => `- **${a.type}**: \`${a.path}\` (${a.size})`).join('\n')}

### Notes for Next Agent

${generateNotesForNextAgent(result, task)}

---
`

    appendToEventLog(eventLogPath, eventEntry)

    return {
      success: true,
      task_id: task.id,
      output: result,
      artifacts: artifacts,
      duration: calculateDuration(startTime)
    }
  } catch (error) {
    // Append failure event to unified log
    const failureEntry = `
## Task ${task.id} - FAILED ❌

**Timestamp**: ${getUtc8ISOString()}
**Duration**: ${calculateDuration(startTime)}ms
**Agent**: ${agent}
**Error**: ${error.message}

### Error Details

\`\`\`
${error.stack}
\`\`\`

### Recovery Notes for Next Attempt

${generateRecoveryNotes(error, task)}

---
`

    appendToEventLog(eventLogPath, failureEntry)

    // Handle failure: retry, skip, or abort
    task.attempts++
    if (task.attempts < task.max_retries && autoConfirm) {
      console.log(`⚠️ ${task.id}: Failed, retrying (${task.attempts}/${task.max_retries})`)
      return { success: false, task_id: task.id, error: error.message, retry: true, duration: calculateDuration(startTime) }
    } else if (task.attempts >= task.max_retries && !autoConfirm) {
      const decision = AskUserQuestion({
        questions: [{
          question: `任务失败: ${task.id}\n错误: ${error.message}`,
          header: "Decision",
          multiSelect: false,
          options: [
            { label: "重试", description: "重新执行该任务" },
            { label: "跳过", description: "跳过此任务，继续下一个" },
            { label: "终止", description: "停止整个执行" }
          ]
        }]
      })
      if (decision === 'retry') {
        task.attempts = 0
        return { success: false, task_id: task.id, error: error.message, retry: true, duration: calculateDuration(startTime) }
      } else if (decision === 'skip') {
        task.status = 'skipped'
        skipDependentTasks(task.id, normalizedTasks)
      } else {
        throw new Error('Execution aborted by user')
      }
    } else {
      task.status = 'failed'
      skipDependentTasks(task.id, normalizedTasks)
    }

    return {
      success: false,
      task_id: task.id,
      error: error.message,
      duration: calculateDuration(startTime)
    }
  }
}

function appendToEventLog(logPath, eventEntry) {
  if (fs.existsSync(logPath)) {
    const currentContent = Read(logPath)
    Write(logPath, currentContent + eventEntry)
  } else {
    Write(logPath, eventEntry)
  }
}
```

---

## Phase 3: Progress Tracking & Event Logging

**execution-events.md** is the **SINGLE SOURCE OF TRUTH**:
- Append-only, chronological execution log
- Each task records: timestamp, duration, agent type, execution summary, artifacts, notes for next agent
- Failures include error details and recovery notes
- Format: Human-readable markdown with machine-parseable status indicators (✅/❌/⏳)

**Event log format** (appended entry):
```markdown
## Task {id} - {STATUS} {emoji}

**Timestamp**: {time}
**Duration**: {ms}
**Agent**: {type}

### Execution Summary
{What was done}

### Generated Artifacts
- `src/types/auth.ts` (2.3KB)

### Notes for Next Agent
- Key decisions made
- Potential issues
- Ready for: TASK-003
```

---

## Phase 4: Completion & Summary

After all tasks complete or max failures reached:

```javascript
const statistics = {
  total_tasks: normalizedTasks.length,
  completed: normalizedTasks.filter(t => t.status === 'completed').length,
  failed: normalizedTasks.filter(t => t.status === 'failed').length,
  skipped: normalizedTasks.filter(t => t.status === 'skipped').length,
  success_rate: (completedCount / normalizedTasks.length * 100).toFixed(1)
}

// Update execution.md with final status
appendExecutionSummary(executionPath, statistics)
```

**Post-Completion Options** (unless auto-confirm):

```javascript
AskUserQuestion({
  questions: [{
    question: "执行完成。是否需要后续操作?",
    header: "Next Steps",
    multiSelect: true,
    options: [
      { label: "查看详情", description: "查看完整执行日志" },
      { label: "调试失败项", description: "对失败任务进行调试" },
      { label: "优化执行", description: "分析执行改进建议" },
      { label: "完成", description: "不需要后续操作" }
    ]
  }]
})
```

---

## Session Folder Structure

```
.workflow/.execution/{executionId}/
├── execution.md              # Execution plan and overall status
└── execution-events.md       # SINGLE SOURCE OF TRUTH - all agent executions
                              # Both human-readable AND machine-parseable

# Generated files go directly to project directories (not into execution folder)
# E.g., TASK-001 generates: src/types/auth.ts (not artifacts/src/types/auth.ts)
# execution-events.md records the actual project paths
```

---

## Agent Selection Strategy

```javascript
function selectBestAgent(task) {
  if (task.type === 'code' || task.type === 'implementation') {
    return task.includes_tests ? 'tdd-developer' : 'code-developer'
  } else if (task.type === 'test' || task.type === 'test-fix') {
    return 'test-fix-agent'
  } else if (task.type === 'doc' || task.type === 'documentation') {
    return 'doc-generator'
  } else if (task.type === 'analysis' || task.type === 'investigation') {
    return 'cli-execution-agent'
  } else if (task.type === 'debug') {
    return 'debug-explore-agent'
  } else {
    return 'universal-executor'
  }
}
```

---

## Parallelization Rules

```javascript
function calculateParallel(tasks) {
  // Group tasks into execution waves
  // Constraints:
  // - Tasks with same file modifications must be sequential
  // - Tasks with dependencies must wait
  // - Max 3 parallel tasks per wave (resource constraint)

  const waves = []
  const completed = new Set()

  while (completed.size < tasks.length) {
    const available = tasks.filter(t =>
      !completed.has(t.id) &&
      t.dependencies.every(d => completed.has(d))
    )

    if (available.length === 0) break

    // Check for file conflicts
    const noConflict = []
    const modifiedFiles = new Set()

    for (const task of available) {
      const conflicts = task.files_to_modify.some(f => modifiedFiles.has(f))
      if (!conflicts && noConflict.length < 3) {
        noConflict.push(task)
        task.files_to_modify.forEach(f => modifiedFiles.add(f))
      }
    }

    if (noConflict.length > 0) {
      waves.push(noConflict)
      noConflict.forEach(t => completed.add(t.id))
    }
  }

  return waves
}
```

---

## Error Handling & Recovery

| Situation | Action |
|-----------|--------|
| Task timeout | Mark as timeout, ask user: retry/skip/abort |
| Missing dependency | Auto-skip dependent tasks, log warning |
| File conflict | Detect before execution, ask for resolution |
| Output mismatch | Validate against expected_output, flag for review |
| Agent unavailable | Fallback to universal-executor |

---

## Usage Recommendations

Use this execution engine when:
- Executing any planning document (IMPL_PLAN.md, brainstorm conclusions, analysis recommendations)
- Multiple tasks with dependencies need orchestration
- Want minimal progress tracking without clutter
- Need to handle failures gracefully and resume
- Want to parallelize where possible but ensure correctness

Consumes output from:
- `/workflow:plan` → IMPL_PLAN.md
- `/workflow:brainstorm-with-file` → synthesis.json → execution
- `/workflow:analyze-with-file` → conclusions.json → execution
- `/workflow:debug-with-file` → recommendations → execution
- `/workflow:lite-plan` → task JSONs → execution

---

**Now execute the unified execution workflow for plan**: $PLAN_PATH

