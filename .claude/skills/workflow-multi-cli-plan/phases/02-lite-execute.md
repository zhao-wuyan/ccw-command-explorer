# Phase 2: Lite Execute

> **📌 COMPACT SENTINEL [Phase 2: Lite-Execute]**
> This phase contains 6 execution steps (Step 1 — 6).
> If you can read this sentinel but cannot find the full Step protocol below, context has been compressed.
> Recovery: `Read("phases/02-lite-execute.md")`

Complete execution engine supporting multiple input modes: in-memory plan, prompt description, or file content.

## Objective

- Execute implementation tasks from in-memory plan, prompt description, or file content
- Support batch execution with grouped tasks and code review

## Overview

Flexible task execution command supporting three input modes: in-memory plan (from lite-plan), direct prompt description, or file content. Handles execution orchestration, progress tracking, and optional code review.

**Core capabilities:**
- Multi-mode input (in-memory plan, prompt description, or file path)
- Execution orchestration (Agent or Codex) with full context
- Live progress tracking via TodoWrite at execution call level
- Optional code review with selected tool (Gemini, Agent, or custom)
- Context continuity across multiple executions
- Intelligent format detection (Enhanced Task JSON vs plain text)

## Usage

> **Note**: This is an internal phase, not a standalone command. It is called by Phase 1 (multi-cli-plan) after plan approval, or by lite-plan after Phase 4 approval.

## Input Modes

### Mode 1: In-Memory Plan

**Trigger**: Called by multi-cli-plan Phase 5 after plan approval, or by lite-plan after Phase 4 approval

**Input Source**: `executionContext` global variable set by lite-plan

**Content**: Complete execution context (see Data Structures section)

**Behavior**:
- Skip execution method selection (already set by lite-plan)
- Directly proceed to execution with full context
- All planning artifacts available (exploration, clarifications, plan)

### Mode 2: Prompt Description

**Trigger**: User calls with task description string

**Input**: Simple task description (e.g., "Add unit tests for auth module")

**Behavior**:
- Store prompt as `originalUserInput`
- Create simple execution plan from prompt
- AskUserQuestion: Select execution method (Agent/Codex/Auto)
- AskUserQuestion: Select code review tool (Skip/Gemini/Agent/Other)
- Proceed to execution with `originalUserInput` included

**User Interaction**:
```javascript
// Reference workflowPreferences (set by SKILL.md via AskUserQuestion)
const autoYes = workflowPreferences.autoYes

let userSelection

if (autoYes) {
  // Auto mode: Use defaults
  console.log(`[Auto] Auto-confirming execution:`)
  console.log(`  - Execution method: Auto`)
  console.log(`  - Code review: Skip`)

  userSelection = {
    execution_method: "Auto",
    code_review_tool: "Skip"
  }
} else {
  // Interactive mode: Ask user
  userSelection = AskUserQuestion({
    questions: [
      {
        question: "Select execution method:",
        header: "Execution",
        multiSelect: false,
        options: [
          { label: "Agent", description: "@code-developer agent" },
          { label: "Codex", description: "codex CLI tool" },
          { label: "Auto", description: "Auto-select based on complexity" }
        ]
      },
      {
        question: "Enable code review after execution?",
        header: "Code Review",
        multiSelect: false,
        options: [
          { label: "Skip", description: "No review" },
          { label: "Gemini Review", description: "Gemini CLI tool" },
          { label: "Codex Review", description: "Git-aware review (prompt OR --uncommitted)" },
          { label: "Agent Review", description: "Current agent review" }
        ]
      }
    ]
  })
}
```

### Mode 3: File Content

**Trigger**: User calls with file path

**Input**: Path to file containing task description or plan.json

**Step 1: Read and Detect Format**

```javascript
fileContent = Read(filePath)

// Attempt JSON parsing
try {
  jsonData = JSON.parse(fileContent)

  // Check if plan.json from lite-plan session (two-layer format: task_ids[])
  if (jsonData.summary && jsonData.approach && jsonData.task_ids) {
    planObject = jsonData
    originalUserInput = jsonData.summary
    isPlanJson = true

    // Load tasks from .task/*.json files
    const planDir = filePath.replace(/[/\\][^/\\]+$/, '')  // parent directory
    planObject._loadedTasks = loadTaskFiles(planDir, jsonData.task_ids)
  } else {
    // Valid JSON but not plan.json - treat as plain text
    originalUserInput = fileContent
    isPlanJson = false
  }
} catch {
  // Not valid JSON - treat as plain text prompt
  originalUserInput = fileContent
  isPlanJson = false
}
```

**Step 2: Create Execution Plan**

If `isPlanJson === true`:
- Use `planObject` directly
- User selects execution method and code review

If `isPlanJson === false`:
- Treat file content as prompt (same behavior as Mode 2)
- Create simple execution plan from content

**Step 3: User Interaction**

- AskUserQuestion: Select execution method (Agent/Codex/Auto)
- AskUserQuestion: Select code review tool
- Proceed to execution with full context

## Helper Functions

```javascript
// Load task files from .task/ directory (two-layer format)
function loadTaskFiles(planDir, taskIds) {
  return taskIds.map(id => {
    const taskPath = `${planDir}/.task/${id}.json`
    return JSON.parse(Read(taskPath))
  })
}

// Get tasks array from loaded .task/*.json files
function getTasks(planObject) {
  return planObject._loadedTasks || []
}
```

## Execution Process

```
Input Parsing:
   └─ Decision (mode detection):
      ├─ --in-memory flag → Mode 1: Load executionContext → Skip user selection
      ├─ Ends with .md/.json/.txt → Mode 3: Read file → Detect format
      │   ├─ Valid plan.json → Use planObject → User selects method + review
      │   └─ Not plan.json → Treat as prompt → User selects method + review
      └─ Other → Mode 2: Prompt description → User selects method + review

Execution:
   ├─ Step 1: Initialize result tracking (previousExecutionResults = [])
   ├─ Step 2: Task grouping & batch creation
   │   ├─ Extract explicit depends_on (no file/keyword inference)
   │   ├─ Group: independent tasks → per-executor parallel batches (one CLI per batch)
   │   ├─ Group: dependent tasks → sequential phases (respect dependencies)
   │   └─ Create TodoWrite list for batches
   ├─ Step 3: Launch execution
   │   ├─ Phase 1: Independent tasks (⚡ per-executor batches, multi-CLI concurrent)
   │   └─ Phase 2+: Dependent tasks by dependency order
   ├─ Step 4: Track progress (TodoWrite updates per batch)
   └─ Step 5: Code review (if codeReviewTool ≠ "Skip")

Output:
   └─ Execution complete with results in previousExecutionResults[]
```

## Detailed Execution Steps

### Step 1: Initialize Execution Tracking

**Operations**:
- Initialize result tracking for multi-execution scenarios
- Set up `previousExecutionResults` array for context continuity
- **In-Memory Mode**: Echo execution strategy from lite-plan for transparency

```javascript
// Initialize result tracking
previousExecutionResults = []

// In-Memory Mode: Echo execution strategy (transparency before execution)
if (executionContext) {
  console.log(`
📋 Execution Strategy (from lite-plan):
   Method: ${executionContext.executionMethod}
   Review: ${executionContext.codeReviewTool}
   Tasks: ${getTasks(executionContext.planObject).length}
   Complexity: ${executionContext.planObject.complexity}
${executionContext.executorAssignments ? `   Assignments: ${JSON.stringify(executionContext.executorAssignments)}` : ''}
  `)
}
```

### Step 2: Task Grouping & Batch Creation

**Dependency Analysis & Grouping Algorithm**:
```javascript
// Use explicit depends_on from plan.json (no inference from file/keywords)
function extractDependencies(tasks) {
  const taskIdToIndex = {}
  tasks.forEach((t, i) => { taskIdToIndex[t.id] = i })

  return tasks.map((task, i) => {
    // Only use explicit depends_on from plan.json
    const deps = (task.depends_on || [])
      .map(depId => taskIdToIndex[depId])
      .filter(idx => idx !== undefined && idx < i)
    return { ...task, taskIndex: i, dependencies: deps }
  })
}

// Executor Resolution (used by task grouping below)
// 获取任务的 executor（优先使用 executorAssignments，fallback 到全局 executionMethod）
function getTaskExecutor(task) {
  const assignments = executionContext?.executorAssignments || {}
  if (assignments[task.id]) {
    return assignments[task.id].executor  // 'gemini' | 'codex' | 'agent'
  }
  // Fallback: 全局 executionMethod 映射
  const method = executionContext?.executionMethod || 'Auto'
  if (method === 'Agent') return 'agent'
  if (method === 'Codex') return 'codex'
  // Auto: 根据复杂度
  return planObject.complexity === 'Low' ? 'agent' : 'codex'
}

// 按 executor 分组任务（核心分组组件）
function groupTasksByExecutor(tasks) {
  const groups = { gemini: [], codex: [], agent: [] }
  tasks.forEach(task => {
    const executor = getTaskExecutor(task)
    groups[executor].push(task)
  })
  return groups
}

// Group into batches: per-executor parallel batches (one CLI per batch)
function createExecutionCalls(tasks, executionMethod) {
  const tasksWithDeps = extractDependencies(tasks)
  const processed = new Set()
  const calls = []

  // Phase 1: Independent tasks → per-executor batches (multi-CLI concurrent)
  const independentTasks = tasksWithDeps.filter(t => t.dependencies.length === 0)
  if (independentTasks.length > 0) {
    const executorGroups = groupTasksByExecutor(independentTasks)
    let parallelIndex = 1

    for (const [executor, tasks] of Object.entries(executorGroups)) {
      if (tasks.length === 0) continue
      tasks.forEach(t => processed.add(t.taskIndex))
      calls.push({
        method: executionMethod,
        executor: executor,          // 明确指定 executor
        executionType: "parallel",
        groupId: `P${parallelIndex++}`,
        taskSummary: tasks.map(t => t.title).join(' | '),
        tasks: tasks
      })
    }
  }

  // Phase 2: Dependent tasks → sequential/parallel batches (respect dependencies)
  let sequentialIndex = 1
  let remaining = tasksWithDeps.filter(t => !processed.has(t.taskIndex))

  while (remaining.length > 0) {
    // Find tasks whose dependencies are all satisfied
    const ready = remaining.filter(t =>
      t.dependencies.every(d => processed.has(d))
    )

    if (ready.length === 0) {
      console.warn('Circular dependency detected, forcing remaining tasks')
      ready.push(...remaining)
    }

    if (ready.length > 1) {
      // Multiple ready tasks → per-executor batches (parallel within this phase)
      const executorGroups = groupTasksByExecutor(ready)
      for (const [executor, tasks] of Object.entries(executorGroups)) {
        if (tasks.length === 0) continue
        tasks.forEach(t => processed.add(t.taskIndex))
        calls.push({
          method: executionMethod,
          executor: executor,
          executionType: "parallel",
          groupId: `P${calls.length + 1}`,
          taskSummary: tasks.map(t => t.title).join(' | '),
          tasks: tasks
        })
      }
    } else {
      // Single ready task → sequential batch
      ready.forEach(t => processed.add(t.taskIndex))
      calls.push({
        method: executionMethod,
        executor: getTaskExecutor(ready[0]),
        executionType: "sequential",
        groupId: `S${sequentialIndex++}`,
        taskSummary: ready[0].title,
        tasks: ready
      })
    }

    remaining = remaining.filter(t => !processed.has(t.taskIndex))
  }

  return calls
}

executionCalls = createExecutionCalls(getTasks(planObject), executionMethod).map(c => ({ ...c, id: `[${c.groupId}]` }))

TodoWrite({
  todos: executionCalls.map(c => ({
    content: `${c.executionType === "parallel" ? "⚡" : "→"} ${c.id} [${c.executor}] (${c.tasks.length} tasks)`,
    status: "pending",
    activeForm: `Executing ${c.id} [${c.executor}]`
  }))
})
```

### Step 3: Launch Execution

**Executor Resolution**: `getTaskExecutor()` and `groupTasksByExecutor()` defined in Step 2 (Task Grouping).

**Batch Execution Routing** (根据 batch.executor 字段路由):
```javascript
// executeBatch 根据 batch 自身的 executor 字段决定调用哪个 CLI
function executeBatch(batch) {
  const executor = batch.executor || getTaskExecutor(batch.tasks[0])
  const sessionId = executionContext?.session?.id || 'standalone'
  const fixedId = `${sessionId}-${batch.groupId}`

  if (executor === 'agent') {
    // Agent execution (synchronous)
    return Task({
      subagent_type: "code-developer",
      run_in_background: false,
      description: batch.taskSummary,
      prompt: buildExecutionPrompt(batch)
    })
  } else if (executor === 'codex') {
    // Codex CLI (background)
    return Bash(`ccw cli -p "${buildExecutionPrompt(batch)}" --tool codex --mode write --id ${fixedId}`, { run_in_background: true })
  } else if (executor === 'gemini') {
    // Gemini CLI (background)
    return Bash(`ccw cli -p "${buildExecutionPrompt(batch)}" --tool gemini --mode write --id ${fixedId}`, { run_in_background: true })
  }
}
```

**并行执行原则**:
- 每个 batch 对应一个独立的 CLI 实例或 Agent 调用
- 并行 = 多个 Bash(run_in_background=true) 或多个 Task() 同时发出
- 绝不将多个独立任务合并到同一个 CLI prompt 中
- Agent 任务不可后台执行（run_in_background=false），但多个 Agent 任务可通过单条消息中的多个 Task() 调用并发

**Execution Flow**: Parallel batches concurrently → Sequential batches in order
```javascript
const parallel = executionCalls.filter(c => c.executionType === "parallel")
const sequential = executionCalls.filter(c => c.executionType === "sequential")

// Phase 1: Launch all parallel batches (single message with multiple tool calls)
if (parallel.length > 0) {
  TodoWrite({ todos: executionCalls.map(c => ({ status: c.executionType === "parallel" ? "in_progress" : "pending" })) })
  parallelResults = await Promise.all(parallel.map(c => executeBatch(c)))
  previousExecutionResults.push(...parallelResults)
  TodoWrite({ todos: executionCalls.map(c => ({ status: parallel.includes(c) ? "completed" : "pending" })) })
}

// Phase 2: Execute sequential batches one by one
for (const call of sequential) {
  TodoWrite({ todos: executionCalls.map(c => ({ status: c === call ? "in_progress" : "..." })) })
  result = await executeBatch(call)
  previousExecutionResults.push(result)
  TodoWrite({ todos: executionCalls.map(c => ({ status: "completed" or "pending" })) })
}
```

### Unified Task Prompt Builder

**Task Formatting Principle**: Each task is a self-contained checklist. The executor only needs to know what THIS task requires. Same template for Agent and CLI.

```javascript
function buildExecutionPrompt(batch) {
  // Task template (6 parts: Files → Why → How → Reference → Risks → Done)
  const formatTask = (t) => `
## ${t.title}

**Scope**: \`${t.scope}\`  |  **Action**: ${t.action}

### Files
${(t.files || []).map(f => `- **${f.path}** → \`${f.target || ''}\`: ${f.change || (f.changes || []).join(', ') || ''}`).join('\n')}

${t.rationale ? `
### Why this approach (Medium/High)
${t.rationale.chosen_approach}
${t.rationale.decision_factors?.length > 0 ? `\nKey factors: ${t.rationale.decision_factors.join(', ')}` : ''}
${t.rationale.tradeoffs ? `\nTradeoffs: ${t.rationale.tradeoffs}` : ''}
` : ''}

### How to do it
${t.description}

${t.implementation.map(step => `- ${step}`).join('\n')}

${t.code_skeleton ? `
### Code skeleton (High)
${t.code_skeleton.interfaces?.length > 0 ? `**Interfaces**: ${t.code_skeleton.interfaces.map(i => `\`${i.name}\` - ${i.purpose}`).join(', ')}` : ''}
${t.code_skeleton.key_functions?.length > 0 ? `\n**Functions**: ${t.code_skeleton.key_functions.map(f => `\`${f.signature}\` - ${f.purpose}`).join(', ')}` : ''}
${t.code_skeleton.classes?.length > 0 ? `\n**Classes**: ${t.code_skeleton.classes.map(c => `\`${c.name}\` - ${c.purpose}`).join(', ')}` : ''}
` : ''}

### Reference
- Pattern: ${t.reference?.pattern || 'N/A'}
- Files: ${t.reference?.files?.join(', ') || 'N/A'}
${t.reference?.examples ? `- Notes: ${t.reference.examples}` : ''}

${t.risks?.length > 0 ? `
### Risk mitigations (High)
${t.risks.map(r => `- ${r.description} → **${r.mitigation}**`).join('\n')}
` : ''}

### Done when
${(t.convergence?.criteria || []).map(c => `- [ ] ${c}`).join('\n')}
${(t.test?.success_metrics || []).length > 0 ? `\n**Success metrics**: ${t.test.success_metrics.join(', ')}` : ''}`

  // Build prompt
  const sections = []

  if (originalUserInput) sections.push(`## Goal\n${originalUserInput}`)

  sections.push(`## Tasks\n${batch.tasks.map(formatTask).join('\n\n---\n')}`)

  // Context (reference only)
  const context = []
  if (previousExecutionResults.length > 0) {
    context.push(`### Previous Work\n${previousExecutionResults.map(r => `- ${r.tasksSummary}: ${r.status}`).join('\n')}`)
  }
  if (clarificationContext) {
    context.push(`### Clarifications\n${Object.entries(clarificationContext).map(([q, a]) => `- ${q}: ${a}`).join('\n')}`)
  }
  if (executionContext?.planObject?.data_flow?.diagram) {
    context.push(`### Data Flow\n${executionContext.planObject.data_flow.diagram}`)
  }
  if (executionContext?.session?.artifacts?.plan) {
    context.push(`### Artifacts\nPlan: ${executionContext.session.artifacts.plan}`)
  }
  // Project guidelines (user-defined constraints from /workflow:session:solidify)
  context.push(`### Project Guidelines\n@.workflow/specs/*.md`)
  if (context.length > 0) sections.push(`## Context\n${context.join('\n\n')}`)

  sections.push(`Complete each task according to its "Done when" checklist.`)

  return sections.join('\n\n')
}
```

**Option A: Agent Execution**

When to use:
- `getTaskExecutor(task) === "agent"`
- 或 `executionMethod = "Agent"` (全局 fallback)
- 或 `executionMethod = "Auto" AND complexity = "Low"` (全局 fallback)

```javascript
Task(
  subagent_type="code-developer",
  run_in_background=false,
  description=batch.taskSummary,
  prompt=buildExecutionPrompt(batch)
)
```

**Result Collection**: After completion, collect result following `executionResult` structure (see Data Structures section)

**Option B: CLI Execution (Codex)**

When to use:
- `getTaskExecutor(task) === "codex"`
- 或 `executionMethod = "Codex"` (全局 fallback)
- 或 `executionMethod = "Auto" AND complexity = "Medium/High"` (全局 fallback)

```bash
ccw cli -p "${buildExecutionPrompt(batch)}" --tool codex --mode write
```

**Execution with fixed IDs** (predictable ID pattern):
```javascript
// Launch CLI in background, wait for task hook callback
// Generate fixed execution ID: ${sessionId}-${groupId}
const sessionId = executionContext?.session?.id || 'standalone'
const fixedExecutionId = `${sessionId}-${batch.groupId}`  // e.g., "implement-auth-2025-12-13-P1"

// Check if resuming from previous failed execution
const previousCliId = batch.resumeFromCliId || null

// Build command with fixed ID (and optional resume for continuation)
const cli_command = previousCliId
  ? `ccw cli -p "${buildExecutionPrompt(batch)}" --tool codex --mode write --id ${fixedExecutionId} --resume ${previousCliId}`
  : `ccw cli -p "${buildExecutionPrompt(batch)}" --tool codex --mode write --id ${fixedExecutionId}`

// Execute in background, stop output and wait for task hook callback
Bash(
  command=cli_command,
  run_in_background=true
)
// STOP HERE - CLI executes in background, task hook will notify on completion
```

**Resume on Failure** (with fixed ID):
```javascript
// If execution failed or timed out, offer resume option
if (bash_result.status === 'failed' || bash_result.status === 'timeout') {
  console.log(`
⚠️ Execution incomplete. Resume available:
   Fixed ID: ${fixedExecutionId}
   Lookup: ccw cli detail ${fixedExecutionId}
   Resume: ccw cli -p "Continue tasks" --resume ${fixedExecutionId} --tool codex --mode write --id ${fixedExecutionId}-retry
`)

  // Store for potential retry in same session
  batch.resumeFromCliId = fixedExecutionId
}
```

**Result Collection**: After completion, analyze output and collect result following `executionResult` structure (include `cliExecutionId` for resume capability)

**Option C: CLI Execution (Gemini)**

When to use: `getTaskExecutor(task) === "gemini"` (分析类任务)

```bash
# 使用统一的 buildExecutionPrompt，切换 tool 和 mode
ccw cli -p "${buildExecutionPrompt(batch)}" --tool gemini --mode analysis --id ${sessionId}-${batch.groupId}
```

### Step 4: Progress Tracking

Progress tracked at batch level (not individual task level). Icons: ⚡ (parallel, concurrent), → (sequential, one-by-one)

### Step 5: Code Review (Optional)

**Skip Condition**: Only run if `codeReviewTool ≠ "Skip"`

**Review Focus**: Verify implementation against plan convergence criteria and test requirements
- Read plan.json + .task/*.json for task convergence criteria and test checklist
- Check each convergence criterion is fulfilled
- Verify success metrics from test field (Medium/High complexity)
- Run unit/integration tests specified in test field
- Validate code quality and identify issues
- Ensure alignment with planned approach and risk mitigations

**Operations**:
- Agent Review: Current agent performs direct review
- Gemini Review: Execute gemini CLI with review prompt
- Codex Review: Two options - (A) with prompt for complex reviews, (B) `--uncommitted` flag only for quick reviews
- Custom tool: Execute specified CLI tool (qwen, etc.)

**Unified Review Template** (All tools use same standard):

**Review Criteria**:
- **Convergence Criteria**: Verify each criterion from task convergence.criteria
- **Test Checklist** (Medium/High): Check unit, integration, success_metrics from task test
- **Code Quality**: Analyze quality, identify issues, suggest improvements
- **Plan Alignment**: Validate implementation matches planned approach and risk mitigations

**Shared Prompt Template** (used by all CLI tools):
```
PURPOSE: Code review for implemented changes against plan convergence criteria and test requirements
TASK: • Verify plan convergence criteria fulfillment • Check test requirements (unit, integration, success_metrics) • Analyze code quality • Identify issues • Suggest improvements • Validate plan adherence and risk mitigations
MODE: analysis
CONTEXT: @**/* @{plan.json} @{.task/*.json} [@{exploration.json}] | Memory: Review lite-execute changes against plan requirements including test checklist
EXPECTED: Quality assessment with:
  - Convergence criteria verification (all tasks from .task/*.json)
  - Test checklist validation (Medium/High: unit, integration, success_metrics)
  - Issue identification
  - Recommendations
  Explicitly check each convergence criterion and test item from .task/*.json files.
CONSTRAINTS: Focus on plan convergence criteria, test requirements, and plan adherence | analysis=READ-ONLY
```

**Tool-Specific Execution** (Apply shared prompt template above):

```bash
# Method 1: Agent Review (current agent)
# - Read plan.json: ${executionContext.session.artifacts.plan}
# - Apply unified review criteria (see Shared Prompt Template)
# - Report findings directly

# Method 2: Gemini Review (recommended)
ccw cli -p "[Shared Prompt Template with artifacts]" --tool gemini --mode analysis
# CONTEXT includes: @**/* @${plan.json} [@${exploration.json}]

# Method 3: Qwen Review (alternative)
ccw cli -p "[Shared Prompt Template with artifacts]" --tool qwen --mode analysis
# Same prompt as Gemini, different execution engine

# Method 4: Codex Review (git-aware) - Two mutually exclusive options:

# Option A: With custom prompt (reviews uncommitted by default)
ccw cli -p "[Shared Prompt Template with artifacts]" --tool codex --mode review
# Use for complex reviews with specific focus areas

# Option B: Target flag only (no prompt allowed)
ccw cli --tool codex --mode review --uncommitted
# Quick review of uncommitted changes without custom instructions

# ⚠️ IMPORTANT: -p prompt and target flags (--uncommitted/--base/--commit) are MUTUALLY EXCLUSIVE
```

**Multi-Round Review with Fixed IDs**:
```javascript
// Generate fixed review ID
const reviewId = `${sessionId}-review`

// First review pass with fixed ID
const reviewResult = Bash(`ccw cli -p "[Review prompt]" --tool gemini --mode analysis --id ${reviewId}`)

// If issues found, continue review dialog with fixed ID chain
if (hasUnresolvedIssues(reviewResult)) {
  // Resume with follow-up questions
  Bash(`ccw cli -p "Clarify the security concerns you mentioned" --resume ${reviewId} --tool gemini --mode analysis --id ${reviewId}-followup`)
}
```

**Implementation Note**: Replace `[Shared Prompt Template with artifacts]` placeholder with actual template content, substituting:
- `@{plan.json}` → `@${executionContext.session.artifacts.plan}`
- `[@{exploration.json}]` → exploration files from artifacts (if exists)

### Step 6: Auto-Sync Project State

**Trigger**: After all executions complete (regardless of code review)

**Operation**: Execute `/workflow:session:sync -y "{summary}"` to update both `specs/*.md` and `project-tech.json` in one shot.

Summary 取值优先级：`originalUserInput` → `planObject.summary` → git log 自动推断。

## Best Practices

**Input Modes**: In-memory (lite-plan), prompt (standalone), file (JSON/text)
**Task Grouping**: Based on explicit depends_on only; independent tasks split by executor, each batch runs as separate CLI instance
**Execution**: Independent task batches launch concurrently via single Claude message with multiple tool calls (one tool call per batch)

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| Missing executionContext | --in-memory without context | Error: "No execution context found. Only available when called by lite-plan." |
| File not found | File path doesn't exist | Error: "File not found: {path}. Check file path." |
| Empty file | File exists but no content | Error: "File is empty: {path}. Provide task description." |
| Invalid Enhanced Task JSON | JSON missing required fields | Warning: "Missing required fields. Treating as plain text." |
| Malformed JSON | JSON parsing fails | Treat as plain text (expected for non-JSON files) |
| Execution failure | Agent/Codex crashes | Display error, use fixed ID `${sessionId}-${groupId}` for resume: `ccw cli -p "Continue" --resume <fixed-id> --id <fixed-id>-retry` |
| Execution timeout | CLI exceeded timeout | Use fixed ID for resume with extended timeout |
| Codex unavailable | Codex not installed | Show installation instructions, offer Agent execution |
| Fixed ID not found | Custom ID lookup failed | Check `ccw cli history`, verify date directories |

## Data Structures

### executionContext (Input - Mode 1)

Passed from lite-plan via global variable:

```javascript
{
  planObject: {
    summary: string,
    approach: string,
    task_ids: string[],                          // Task IDs referencing .task/*.json files
    task_count: number,                          // Number of tasks
    _loadedTasks: [...],                         // Populated at runtime from .task/*.json files
    estimated_time: string,
    recommended_execution: string,
    complexity: string
  },
  // Task file paths (populated for two-layer format)
  taskFiles: [{id: string, path: string}] | null,
  explorationsContext: {...} | null,       // Multi-angle explorations
  explorationAngles: string[],             // List of exploration angles
  explorationManifest: {...} | null,       // Exploration manifest
  clarificationContext: {...} | null,
  executionMethod: "Agent" | "Codex" | "Auto",  // 全局默认
  codeReviewTool: "Skip" | "Gemini Review" | "Agent Review" | string,
  originalUserInput: string,

  // 任务级 executor 分配（优先于 executionMethod）
  executorAssignments: {
    [taskId]: { executor: "gemini" | "codex" | "agent", reason: string }
  },

  // Session artifacts location (saved by lite-plan)
  session: {
    id: string,                        // Session identifier: {taskSlug}-{shortTimestamp}
    folder: string,                    // Session folder path: .workflow/.lite-plan/{session-id}
    artifacts: {
      explorations: [{angle, path}],   // exploration-{angle}.json paths
      explorations_manifest: string,   // explorations-manifest.json path
      plan: string                     // plan.json path (always present)
    }
  }
}
```

**Artifact Usage**:
- Artifact files contain detailed planning context
- Pass artifact paths to CLI tools and agents for enhanced context
- See execution options below for usage examples

### executionResult (Output)

Collected after each execution call completes:

```javascript
{
  executionId: string,                 // e.g., "[Agent-1]", "[Codex-1]"
  status: "completed" | "partial" | "failed",
  tasksSummary: string,                // Brief description of tasks handled
  completionSummary: string,           // What was completed
  keyOutputs: string,                  // Files created/modified, key changes
  notes: string,                       // Important context for next execution
  fixedCliId: string | null            // Fixed CLI execution ID (e.g., "implement-auth-2025-12-13-P1")
}
```

Appended to `previousExecutionResults` array for context continuity in multi-execution scenarios.

## Post-Completion Expansion

**Auto-sync**: 执行 `/workflow:session:sync -y "{summary}"` 更新 specs/*.md + project-tech（Step 6 已触发，此处不重复）。

完成后询问用户是否扩展为issue(test/enhance/refactor/doc)，选中项调用 `/issue:new "{summary} - {dimension}"`

**Fixed ID Pattern**: `${sessionId}-${groupId}` enables predictable lookup without auto-generated timestamps.

**Resume Usage**: If `status` is "partial" or "failed", use `fixedCliId` to resume:
```bash
# Lookup previous execution
ccw cli detail ${fixedCliId}

# Resume with new fixed ID for retry
ccw cli -p "Continue from where we left off" --resume ${fixedCliId} --tool codex --mode write --id ${fixedCliId}-retry
```
