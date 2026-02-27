---
name: unified-execute-with-file
description: Universal execution engine for consuming any planning/brainstorm/analysis output with minimal progress tracking, multi-agent coordination, and incremental execution
argument-hint: "[-y|--yes] [-p|--plan <path>] [-m|--mode sequential|parallel] [\"execution context or task name\"]"
allowed-tools: TodoWrite(*), Task(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-confirm execution decisions, use default parallel strategy where possible.

# Workflow Unified-Execute-With-File Command (/workflow:unified-execute-with-file)

## Overview

Universal execution engine that consumes **any** planning/brainstorm/analysis output and executes it with minimal progress tracking. Coordinates multiple agents (subagents or CLI tools), handles dependencies, and maintains execution timeline in a single minimal document.

**Core workflow**: Load Plan → Parse Tasks → Coordinate Agents → Execute → Track Progress → Verify

**Key features**:
- **Plan Format Agnostic**: Consumes IMPL_PLAN.md, brainstorm.md, analysis conclusions, debug resolutions
- **execution.md**: Single source of truth for progress, execution timeline, and results
- **Multi-Agent Orchestration**: Parallel execution where possible, sequential where needed
- **Incremental Execution**: Resume from failure point, no re-execution of completed tasks
- **Dependency Management**: Automatic topological sort and wait strategy
- **Real-Time Progress**: TodoWrite integration for live task status

## Usage

```bash
/workflow:unified-execute-with-file [FLAGS] [EXECUTION_CONTEXT]

# Flags
-y, --yes              Auto-confirm execution decisions, use defaults
-p, --plan <path>      Explicitly specify plan file (auto-detected if omitted)
-m, --mode <mode>      Execution strategy: sequential (strict order) | parallel (smart dependencies)

# Arguments
[execution-context]    Optional: Task category, module name, or execution focus (for filtering/priority)

# Examples
/workflow:unified-execute-with-file                                    # Auto-detect and execute latest plan
/workflow:unified-execute-with-file -p .workflow/plans/auth-plan.md   # Execute specific plan
/workflow:unified-execute-with-file -y "auth module"                  # Auto-execute with context focus
/workflow:unified-execute-with-file -m sequential "payment feature"   # Sequential execution
```

## Execution Process

```
Plan Detection:
   ├─ Check for IMPL_PLAN.md or task JSON files in .workflow/
   ├─ Or use explicit --plan path
   ├─ Or auto-detect from git branch/issue context
   └─ Load plan metadata and task definitions

Session Initialization:
   ├─ Create .workflow/.execution/{sessionId}/
   ├─ Initialize execution.md with plan summary
   ├─ Parse all tasks, identify dependencies
   ├─ Determine execution strategy (parallel/sequential)
   └─ Initialize progress tracking

Pre-Execution Validation:
   ├─ Check task feasibility (required files exist, tools available)
   ├─ Validate dependency graph (detect cycles)
   ├─ Ask user to confirm execution (unless --yes)
   └─ Display execution plan and timeline estimate

Task Execution Loop (Parallel/Sequential):
   ├─ Select next executable tasks (dependencies satisfied)
   ├─ Launch agents in parallel (if strategy=parallel)
   ├─ Monitor execution, wait for completion
   ├─ Capture outputs, log results
   ├─ Update execution.md with progress
   ├─ Mark tasks complete/failed
   └─ Repeat until all done or max failures reached

Error Handling:
   ├─ Task failure → Ask user: retry|skip|abort
   ├─ Dependency failure → Auto-skip dependent tasks
   ├─ Output conflict → Ask for resolution
   └─ Timeout → Mark as timeout, continue or escalate

Completion:
   ├─ Mark session complete
   ├─ Summarize execution results in execution.md
   ├─ Generate completion report (statistics, failures, recommendations)
   └─ Offer follow-up: review|debug|enhance

Output:
   ├─ .workflow/.execution/{sessionId}/execution.md (plan and overall status)
   ├─ .workflow/.execution/{sessionId}/execution-events.md (SINGLE SOURCE OF TRUTH - all task executions)
   └─ Generated files in project directories (src/*, tests/*, docs/*, etc.)
```

## Implementation

### Session Setup & Plan Detection

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

// Plan detection strategy
let planPath = $ARGUMENTS.match(/--plan\s+(\S+)/)?.[1]

if (!planPath) {
  // Auto-detect: check recent workflow artifacts
  const candidates = [
    '.workflow/.plan/IMPL_PLAN.md',
    '.workflow/plans/IMPL_PLAN.md',
    '.workflow/IMPL_PLAN.md',
  ]

  // Find most recent plan
  planPath = findMostRecentPlan(candidates)

  if (!planPath) {
    // Check for task JSONs
    const taskJsons = glob('.workflow/**/*.json').filter(f => f.includes('IMPL-') || f.includes('task'))
    if (taskJsons.length > 0) {
      planPath = taskJsons[0] // Primary task
    }
  }
}

if (!planPath) {
  AskUserQuestion({
    questions: [{
      question: "未找到执行规划。请选择方式:",
      header: "Plan Source",
      multiSelect: false,
      options: [
        { label: "浏览文件", description: "从 .workflow 目录选择" },
        { label: "使用最近规划", description: "从git提交消息推断" },
        { label: "手动输入路径", description: "直接指定规划文件路径" }
      ]
    }]
  })
}

// Parse plan and extract tasks
const planContent = Read(planPath)
const plan = parsePlan(planContent, planPath) // Format-agnostic parser

const executionId = `EXEC-${plan.slug}-${getUtc8ISOString().substring(0, 10)}-${randomId(4)}`
const executionFolder = `.workflow/.execution/${executionId}`
const executionPath = `${executionFolder}/execution.md`
const eventLogPath = `${executionFolder}/execution-events.md`

bash(`mkdir -p ${executionFolder}`)
```

---

## Plan Format Parsers

Support multiple plan sources (all JSON plans follow plan-json-schema.json):

```javascript
function parsePlan(content, filePath) {
  const ext = filePath.split('.').pop()

  if (filePath.includes('IMPL_PLAN')) {
    return parseImplPlan(content) // From /workflow:plan (markdown)
  } else if (filePath.includes('brainstorm')) {
    return parseBrainstormPlan(content) // From /workflow:brainstorm-with-file
  } else if (filePath.includes('synthesis')) {
    return parseSynthesisPlan(content) // From /workflow:brainstorm-with-file synthesis.json
  } else if (filePath.includes('conclusions')) {
    return parseConclusionsPlan(content) // From /workflow:analyze-with-file conclusions.json
  } else if (filePath.endsWith('.json') && content.includes('"tasks"')) {
    return parsePlanJson(content) // Standard plan-json-schema (lite-plan, collaborative-plan, sub-plans)
  }

  throw new Error(`Unsupported plan format: ${filePath}`)
}

// Standard plan-json-schema parser
// Handles: lite-plan, collaborative-plan, sub-plans (all follow same schema)
function parsePlanJson(content) {
  const plan = JSON.parse(content)

  return {
    type: plan.merge_metadata ? 'collaborative-plan' : 'lite-plan',
    title: plan.summary?.split('.')[0] || 'Untitled Plan',
    slug: plan._metadata?.session_id || generateSlug(plan.summary),
    summary: plan.summary,
    approach: plan.approach,
    tasks: plan.tasks.map(task => ({
      id: task.id,
      type: inferTaskTypeFromAction(task.action),
      title: task.title,
      description: task.description,
      dependencies: task.depends_on || [],
      agent_type: selectAgentFromTask(task),
      prompt: buildPromptFromTask(task),
      files_to_modify: task.modification_points?.map(mp => mp.file) || [],
      expected_output: task.acceptance || [],
      priority: task.effort?.complexity === 'high' ? 'high' : 'normal',
      estimated_duration: task.effort?.estimated_hours ? `${task.effort.estimated_hours}h` : null,
      verification: task.verification,
      risks: task.risks,
      source_agent: task.source_agent // From collaborative-plan sub-agents
    })),
    flow_control: plan.flow_control,
    data_flow: plan.data_flow,
    design_decisions: plan.design_decisions,
    estimatedDuration: plan.estimated_time,
    recommended_execution: plan.recommended_execution,
    complexity: plan.complexity,
    merge_metadata: plan.merge_metadata, // Present if from collaborative-plan
    _metadata: plan._metadata
  }
}

// IMPL_PLAN.md parser
function parseImplPlan(content) {
  // Extract:
  // - Overview/summary
  // - Phase sections
  // - Task list with dependencies
  // - Critical files
  // - Execution order

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
      agent_type: 'cli-execution-agent',
      prompt: `Implement: ${idea.title}\n${idea.description}`,
      expected_output: idea.next_steps
    })),
    recommendations: synthesis.recommendations
  }
}

// Helper: Infer task type from action field
function inferTaskTypeFromAction(action) {
  const actionMap = {
    'Create': 'code',
    'Update': 'code',
    'Implement': 'code',
    'Refactor': 'code',
    'Add': 'code',
    'Delete': 'code',
    'Configure': 'config',
    'Test': 'test',
    'Fix': 'debug'
  }
  return actionMap[action] || 'code'
}

// Helper: Select agent based on task properties
function selectAgentFromTask(task) {
  if (task.verification?.unit_tests?.length > 0) {
    return 'tdd-developer'
  } else if (task.action === 'Test') {
    return 'test-fix-agent'
  } else if (task.action === 'Fix') {
    return 'debug-explore-agent'
  } else {
    return 'code-developer'
  }
}

// Helper: Build prompt from task details
function buildPromptFromTask(task) {
  let prompt = `## Task: ${task.title}\n\n${task.description}\n\n`

  if (task.modification_points?.length > 0) {
    prompt += `### Modification Points\n`
    task.modification_points.forEach(mp => {
      prompt += `- **${mp.file}**: ${mp.target} → ${mp.change}\n`
    })
    prompt += '\n'
  }

  if (task.implementation?.length > 0) {
    prompt += `### Implementation Steps\n`
    task.implementation.forEach((step, i) => {
      prompt += `${i + 1}. ${step}\n`
    })
    prompt += '\n'
  }

  if (task.acceptance?.length > 0) {
    prompt += `### Acceptance Criteria\n`
    task.acceptance.forEach(ac => {
      prompt += `- ${ac}\n`
    })
  }

  return prompt
}
```

---

### Phase 1: Plan Loading & Validation

**Step 1.1: Parse Plan and Extract Tasks**

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
  estimated_duration: task.estimated_duration || null,

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

**Step 1.2: Create execution.md**

```markdown
# Execution Progress

**Execution ID**: ${executionId}
**Plan Source**: ${planPath}
**Started**: ${getUtc8ISOString()}
**Mode**: ${executionMode}

**Plan Summary**:
- Title: ${plan.title}
- Total Tasks: ${tasks.length}
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
```

**Step 1.3: Pre-Execution Confirmation**

```javascript
const autoYes = $ARGUMENTS.includes('--yes') || $ARGUMENTS.includes('-y')

if (!autoYes) {
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

**Step 2.1: Determine Execution Order**

```javascript
// Topological sort
const executionOrder = topologicalSort(normalizedTasks)

// For parallel mode, group tasks into waves
let executionWaves = []
if (executionMode === 'parallel') {
  executionWaves = groupIntoWaves(executionOrder, parallelLimit = 3)
} else {
  executionWaves = executionOrder.map(task => [task])
}

// Log execution plan to execution.md
// execution-events.md will track actual progress as tasks execute
```

**Step 2.2: Execute Task Waves**

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

    // Progress is tracked in execution-events.md (appended by executeTask)
  }

  // Update execution.md summary
  appendExecutionTimeline(executionPath, waveIndex + 1, wave, waveResults)
}
```

**Step 2.3: Execute Individual Task with Unified Event Logging**

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
- Previous Artifacts: [list any artifacts from previous tasks]

### Requirements
${task.requirements || 'Follow the plan'}

### Constraints
${task.constraints || 'No breaking changes'}
`

    // Execute based on agent type
    let result

    if (agent === 'code-developer' || agent === 'tdd-developer') {
      // Code implementation
      result = await Task({
        subagent_type: agent,
        description: `Execute: ${task.title}`,
        prompt: executionContext,
        run_in_background: false
      })
    } else if (agent === 'cli-execution-agent' || agent === 'universal-executor') {
      // CLI-based execution
      result = await Bash({
        command: `ccw cli -p "${escapeQuotes(executionContext)}" --tool gemini --mode analysis`,
        run_in_background: false
      })
    } else if (agent === 'test-fix-agent') {
      // Test execution and fixing
      result = await Task({
        subagent_type: 'test-fix-agent',
        description: `Execute Tests: ${task.title}`,
        prompt: executionContext,
        run_in_background: false
      })
    } else {
      // Generic task execution
      result = await Task({
        subagent_type: 'universal-executor',
        description: task.title,
        prompt: executionContext,
        run_in_background: false
      })
    }

    // Capture artifacts (code, tests, docs generated by this task)
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
    if (task.attempts < task.max_retries && autoYes) {
      console.log(`⚠️ ${task.id}: Failed, retrying (${task.attempts}/${task.max_retries})`)
      return { success: false, task_id: task.id, error: error.message, retry: true, duration: calculateDuration(startTime) }
    } else if (task.attempts >= task.max_retries && !autoYes) {
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

// Helper function to append to unified event log
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

The `execution-events.md` file is the **single source of truth** for all agent executions:
- Each agent **reads** previous execution events for context
- **Executes** its task (with full knowledge of what was done before)
- **Writes** its execution event (success or failure) in markdown format
- Next agent **reads** all previous events, creating a "knowledge chain"

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

1. **Collect results**: Count completed/failed/skipped tasks
2. **Update execution.md**: Add "Execution Completed" section with statistics
3. **execution-events.md**: Already contains all detailed execution records

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

**Post-Completion Options** (unless --yes):

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
.workflow/.execution/{sessionId}/
├── execution.md              # Execution plan and overall status
└── execution-events.md       # 📋 Unified execution log (all agents) - SINGLE SOURCE OF TRUTH
                               # This is both human-readable AND machine-parseable

# Generated files go directly to project directories (not into execution folder)
# E.g. TASK-001 generates: src/types/auth.ts (not artifacts/src/types/auth.ts)
# execution-events.md records the actual project paths
```

**Key Concept**:
- **execution-events.md** is the **single source of truth** for execution state
- Human-readable: Clear markdown format with task summaries
- Machine-parseable: Status indicators (✅/❌/⏳) and structured sections
- Progress tracking: Read task count by parsing status indicators
- No redundancy: One unified log for all purposes

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
      } else if (!conflicts && noConflict.length < 3) {
        waves.push([task])
        completed.add(task.id)
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

## Error Handling & Recovery

| Situation | Action |
|-----------|--------|
| Task timeout | Mark as timeout, ask user: retry/skip/abort |
| Missing dependency | Auto-skip dependent tasks, log warning |
| File conflict | Detect before execution, ask for resolution |
| Output mismatch | Validate against expected_output, flag for review |
| Agent unavailable | Fallback to universal-executor |
| Execution interrupted | Support resume with `/workflow:unified-execute-with-file --continue` |


## Session Resume

```bash
/workflow:unified-execute-with-file --continue     # Resume last execution
/workflow:unified-execute-with-file --continue EXEC-xxx-2025-01-27-abcd  # Resume specific
```

When resuming:
1. Load execution.md and execution-events.md
2. Parse execution-events.md to identify completed/failed/skipped tasks
3. Recalculate remaining dependencies
4. Resume from first incomplete task
5. Append to execution-events.md with "Resumed from [sessionId]" note
