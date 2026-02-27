---
description: Execute tasks based on in-memory plan, prompt description, or file content with optimized Codex subagent orchestration. Supports multiple input modes and execution control.
argument-hint: "[--plan=in-memory|<file-path>] [--parallel] [--skip-tests] [--dry-run]"
---

# Workflow Lite-Execute Command (Codex Subagent Version)

## Overview

Flexible task execution command with **optimized Codex subagent orchestration**. Supports three input modes: in-memory plan (from lite-plan), direct prompt description, or file content.

**Core Optimizations:**
- **Batch Parallel Execution**: `spawn_agent × N → wait({ ids: [...] })` for independent tasks
- **Context Preservation**: Primary executor retained for follow-ups via `send_input()`
- **Unified Prompt Builder**: Same template for both Agent and CLI executors
- **Explicit Lifecycle**: `spawn_agent → wait → [send_input] → close_agent`

**Core capabilities:**
- Multi-mode input (in-memory plan, prompt description, or file path)
- Execution orchestration via Codex subagents with full context
- Live progress tracking via TodoWrite at batch level
- Optional code review with selected tool (Gemini, Codex, or custom)
- Context continuity across multiple executions
- Intelligent format detection (Enhanced Task JSON vs plain text)

## Usage

### Command Syntax
```bash
/workflow:lite-execute [FLAGS] <INPUT>
```

### Flags

- `--plan=in-memory|<file-path>`: Input mode (in-memory plan or file path)
- `--parallel`: Execute tasks in parallel (default: sequential)
- `--skip-tests`: Skip test execution
- `--dry-run`: Preview execution without making changes

## Input Modes

### Mode 1: In-Memory Plan

**Trigger**: Called by lite-plan after Phase 4 approval with `--in-memory` flag

**Input Source**: `executionContext` global variable set by lite-plan

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
- AskUserQuestion: Select code review tool (Skip/Gemini/Codex/Other)
- Proceed to execution with `originalUserInput` included

### Mode 3: File Content

**Trigger**: User calls with file path

**Input**: Path to file containing task description or plan.json

**Behavior**:
- Read file and detect format (plan.json vs plain text)
- If plan.json: Use `planObject` directly
- If plain text: Treat as prompt (same as Mode 2)

## Execution Process

```
Input Parsing:
   └─ Decision (mode detection):
      ├─ --in-memory flag → Mode 1: Load executionContext → Skip user selection
      ├─ Ends with .md/.json/.txt → Mode 3: Read file → Detect format
      │   ├─ Valid plan.json → Use planObject → User selects method + review
      │   └─ Not plan.json → Treat as prompt → User selects method + review
      └─ Other → Mode 2: Prompt description → User selects method + review

Execution (Codex Subagent Pattern):
   ├─ Step 1: Initialize result tracking (previousExecutionResults = [])
   ├─ Step 2: Task grouping & batch creation
   │   ├─ Extract explicit depends_on (no inference)
   │   ├─ Group: independent tasks → single parallel batch
   │   └─ Group: dependent tasks → sequential phases
   ├─ Step 3: Launch execution (spawn_agent × N → wait → close)
   │   ├─ Phase 1: All independent tasks (spawn_agent × N → batch wait)
   │   └─ Phase 2+: Dependent tasks (sequential spawn_agent → wait → close)
   ├─ Step 4: Track progress (TodoWrite updates per batch)
   └─ Step 5: Code review (if codeReviewTool ≠ "Skip")

Output:
   └─ Execution complete with results in previousExecutionResults[]
```

## Implementation

### Step 1: Initialize Execution Tracking

```javascript
// Initialize result tracking
previousExecutionResults = []

// In-Memory Mode: Echo execution strategy
if (executionContext) {
  console.log(`
## Execution Strategy (from lite-plan)

- **Method**: ${executionContext.executionMethod}
- **Review**: ${executionContext.codeReviewTool}
- **Tasks**: ${executionContext.planObject.tasks.length}
- **Complexity**: ${executionContext.planObject.complexity}
${executionContext.executorAssignments ? `- **Assignments**: ${JSON.stringify(executionContext.executorAssignments)}` : ''}
  `)
}
```

### Step 2: Task Grouping & Batch Creation

```javascript
// Use explicit depends_on from plan.json (no inference)
function extractDependencies(tasks) {
  const taskIdToIndex = {}
  tasks.forEach((t, i) => { taskIdToIndex[t.id] = i })

  return tasks.map((task, i) => {
    const deps = (task.depends_on || [])
      .map(depId => taskIdToIndex[depId])
      .filter(idx => idx !== undefined && idx < i)
    return { ...task, taskIndex: i, dependencies: deps }
  })
}

// Group into batches: maximize parallel execution
function createExecutionBatches(tasks, executionMethod) {
  const tasksWithDeps = extractDependencies(tasks)
  const processed = new Set()
  const batches = []

  // Phase 1: All independent tasks → single parallel batch
  const independentTasks = tasksWithDeps.filter(t => t.dependencies.length === 0)
  if (independentTasks.length > 0) {
    independentTasks.forEach(t => processed.add(t.taskIndex))
    batches.push({
      method: executionMethod,
      executionType: "parallel",
      groupId: "P1",
      taskSummary: independentTasks.map(t => t.title).join(' | '),
      tasks: independentTasks
    })
  }

  // Phase 2+: Dependent tasks → sequential batches
  let remaining = tasksWithDeps.filter(t => !processed.has(t.taskIndex))

  while (remaining.length > 0) {
    const ready = remaining.filter(t =>
      t.dependencies.every(d => processed.has(d))
    )

    if (ready.length === 0) {
      console.warn('Circular dependency detected, forcing remaining tasks')
      ready.push(...remaining)
    }

    ready.forEach(t => processed.add(t.taskIndex))
    batches.push({
      method: executionMethod,
      executionType: ready.length > 1 ? "parallel" : "sequential",
      groupId: `P${batches.length + 1}`,
      taskSummary: ready.map(t => t.title).join(' | '),
      tasks: ready
    })

    remaining = remaining.filter(t => !processed.has(t.taskIndex))
  }

  return batches
}

const executionBatches = createExecutionBatches(planObject.tasks, executionMethod)

TodoWrite({
  todos: executionBatches.map(b => ({
    content: `${b.executionType === "parallel" ? "⚡" : "→"} [${b.groupId}] (${b.tasks.length} tasks)`,
    status: "pending",
    activeForm: `Executing ${b.groupId}`
  }))
})
```

### Step 3: Launch Execution (Codex Subagent Pattern)

#### Executor Resolution

```javascript
// Get executor for task (task-level > global)
function getTaskExecutor(task) {
  const assignments = executionContext?.executorAssignments || {}
  if (assignments[task.id]) {
    return assignments[task.id].executor  // 'gemini' | 'codex' | 'agent'
  }
  // Fallback: global executionMethod mapping
  const method = executionContext?.executionMethod || 'Auto'
  if (method === 'Agent') return 'agent'
  if (method === 'Codex') return 'codex'
  // Auto: based on complexity
  return planObject.complexity === 'Low' ? 'agent' : 'codex'
}
```

#### Unified Task Prompt Builder

```javascript
function buildExecutionPrompt(batch) {
  const formatTask = (t) => `
## ${t.title}

**Scope**: \`${t.scope}\`  |  **Action**: ${t.action}

### Modification Points
${t.modification_points.map(p => `- **${p.file}** → \`${p.target}\`: ${p.change}`).join('\n')}

${t.rationale ? `
### Why this approach
${t.rationale.chosen_approach}
${t.rationale.decision_factors?.length > 0 ? `\nKey factors: ${t.rationale.decision_factors.join(', ')}` : ''}
` : ''}

### How to do it
${t.description}

${t.implementation.map(step => `- ${step}`).join('\n')}

### Reference
- Pattern: ${t.reference?.pattern || 'N/A'}
- Files: ${t.reference?.files?.join(', ') || 'N/A'}

### Done when
${t.acceptance.map(c => `- [ ] ${c}`).join('\n')}`

  const sections = []

  if (originalUserInput) sections.push(`## Goal\n${originalUserInput}`)

  sections.push(`## Tasks\n${batch.tasks.map(formatTask).join('\n\n---\n')}`)

  // Context
  const context = []
  if (previousExecutionResults.length > 0) {
    context.push(`### Previous Work\n${previousExecutionResults.map(r => `- ${r.tasksSummary}: ${r.status}`).join('\n')}`)
  }
  if (clarificationContext) {
    context.push(`### Clarifications\n${Object.entries(clarificationContext).map(([q, a]) => `- ${q}: ${a}`).join('\n')}`)
  }
  context.push(`### Project Guidelines\n@.workflow/project-guidelines.json`)
  if (context.length > 0) sections.push(`## Context\n${context.join('\n\n')}`)

  sections.push(`Complete each task according to its "Done when" checklist.`)

  return sections.join('\n\n')
}
```

#### Parallel Batch Execution (Codex Pattern)

```javascript
// ==================== CODEX SUBAGENT PATTERN ====================

async function executeBatch(batch) {
  const executor = getTaskExecutor(batch.tasks[0])
  
  if (executor === 'agent') {
    return executeWithAgent(batch)
  } else {
    return executeWithCLI(batch, executor)
  }
}

// Option A: Agent Execution (spawn_agent pattern)
async function executeWithAgent(batch) {
  // Step 1: Spawn agents for parallel execution (role file read by agent itself)
  const executionAgents = batch.tasks.map((task, index) => {
    return spawn_agent({
      message: `
## TASK ASSIGNMENT

### Execution Context
- **Batch ID**: ${batch.groupId}
- **Task Index**: ${index + 1} of ${batch.tasks.length}
- **Execution Type**: ${batch.executionType}

### Task Content
${buildExecutionPrompt({ ...batch, tasks: [task] })}

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/code-developer.md (MUST read first)
2. Read: .workflow/project-tech.json (technology context)
3. Read: .workflow/project-guidelines.json (constraints)
4. Understand existing patterns before modifying

### Quality Standards
- Follow existing code patterns
- Maintain backward compatibility
- No unnecessary changes beyond scope

### Deliverables
- Implement task according to "Done when" checklist
- Return: Brief completion summary with files modified
`
    })
  })
  
  // Step 3: Batch wait for all agents
  const results = wait({
    ids: executionAgents,
    timeout_ms: 900000  // 15 minutes per batch
  })
  
  // Step 4: Collect results
  const batchResult = {
    executionId: `[${batch.groupId}]`,
    status: results.timed_out ? 'partial' : 'completed',
    tasksSummary: batch.taskSummary,
    completionSummary: '',
    keyOutputs: '',
    notes: ''
  }
  
  executionAgents.forEach((agentId, index) => {
    if (results.status[agentId].completed) {
      batchResult.completionSummary += `Task ${index + 1}: ${results.status[agentId].completed}\n`
    }
  })
  
  // Step 5: Cleanup all agents
  executionAgents.forEach(id => close_agent({ id }))
  
  return batchResult
}

// Option B: CLI Execution (ccw cli)
async function executeWithCLI(batch, executor) {
  const sessionId = executionContext?.session?.id || 'standalone'
  const fixedExecutionId = `${sessionId}-${batch.groupId}`
  
  const cli_command = `ccw cli -p "${buildExecutionPrompt(batch)}" --tool ${executor} --mode write --id ${fixedExecutionId}`
  
  // Execute in background
  Bash({
    command: cli_command,
    run_in_background: true
  })
  
  // STOP HERE - CLI executes in background, task hook will notify on completion
  return {
    executionId: `[${batch.groupId}]`,
    status: 'in_progress',
    tasksSummary: batch.taskSummary,
    fixedCliId: fixedExecutionId
  }
}
```

#### Execution Flow

```javascript
// ==================== MAIN EXECUTION FLOW ====================

const parallelBatches = executionBatches.filter(b => b.executionType === "parallel")
const sequentialBatches = executionBatches.filter(b => b.executionType === "sequential")

// Phase 1: Launch all parallel batches (Codex batch wait advantage)
if (parallelBatches.length > 0) {
  TodoWrite({
    todos: executionBatches.map(b => ({
      status: b.executionType === "parallel" ? "in_progress" : "pending"
    }))
  })
  
  // Spawn all parallel batch agents at once (role file read by agent itself)
  const allParallelAgents = []
  const batchToAgents = new Map()
  
  for (const batch of parallelBatches) {
    const executor = getTaskExecutor(batch.tasks[0])
    
    if (executor === 'agent') {
      const agents = batch.tasks.map((task, index) => spawn_agent({
        message: `
## TASK: ${task.title}
${buildExecutionPrompt({ ...batch, tasks: [task] })}

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/code-developer.md (MUST read first)
2. Read: .workflow/project-tech.json
3. Read: .workflow/project-guidelines.json
`
      }))
      
      allParallelAgents.push(...agents)
      batchToAgents.set(batch.groupId, agents)
    }
  }
  
  // Single batch wait for ALL parallel agents (KEY CODEX ADVANTAGE)
  if (allParallelAgents.length > 0) {
    const parallelResults = wait({
      ids: allParallelAgents,
      timeout_ms: 900000
    })
    
    // Collect results per batch
    for (const batch of parallelBatches) {
      const agents = batchToAgents.get(batch.groupId) || []
      const batchResult = {
        executionId: `[${batch.groupId}]`,
        status: 'completed',
        tasksSummary: batch.taskSummary,
        completionSummary: agents.map((id, i) => 
          parallelResults.status[id]?.completed || 'incomplete'
        ).join('\n')
      }
      previousExecutionResults.push(batchResult)
    }
    
    // Cleanup all parallel agents
    allParallelAgents.forEach(id => close_agent({ id }))
  }
  
  TodoWrite({
    todos: executionBatches.map(b => ({
      status: parallelBatches.includes(b) ? "completed" : "pending"
    }))
  })
}

// Phase 2: Execute sequential batches one by one
for (const batch of sequentialBatches) {
  TodoWrite({
    todos: executionBatches.map(b => ({
      status: b === batch ? "in_progress" : (processed.has(b) ? "completed" : "pending")
    }))
  })
  
  const result = await executeBatch(batch)
  previousExecutionResults.push(result)
  
  TodoWrite({
    todos: executionBatches.map(b => ({
      status: "completed" /* or "pending" for remaining */
    }))
  })
}
```

### Step 4: Progress Tracking

Progress tracked at batch level. Icons: ⚡ (parallel), → (sequential)

### Step 5: Code Review (Optional)

**Skip Condition**: Only run if `codeReviewTool ≠ "Skip"`

```javascript
// ==================== CODE REVIEW (CODEX PATTERN) ====================

if (codeReviewTool !== 'Skip') {
  console.log(`
## Code Review

Starting ${codeReviewTool} review...
`)

  const reviewPrompt = `
PURPOSE: Code review for implemented changes against plan acceptance criteria
TASK: • Verify plan acceptance criteria • Check verification requirements • Analyze code quality • Identify issues
MODE: analysis
CONTEXT: @**/* @${executionContext.session.artifacts.plan} | Memory: Review lite-execute changes
EXPECTED: Quality assessment with: acceptance verification, issue identification, recommendations
CONSTRAINTS: Focus on plan acceptance criteria | analysis=READ-ONLY
`

  if (codeReviewTool === 'Agent Review') {
    // Spawn review agent (role file read by agent itself)
    const reviewAgent = spawn_agent({
      message: `
## TASK: Code Review

${reviewPrompt}

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/code-developer.md (MUST read first)
2. Read plan artifact: ${executionContext.session.artifacts.plan}
${executionContext.session.artifacts.explorations?.map(e => `3. Read exploration: ${e.path}`).join('\n') || ''}

### Review Focus
1. Verify each acceptance criterion from plan.tasks[].acceptance
2. Check verification requirements (unit_tests, success_metrics)
3. Validate plan adherence and risk mitigations
4. Identify any issues or improvements needed

### Output Format
Summary: [overall assessment]
Acceptance: [criterion 1: ✓/✗, criterion 2: ✓/✗, ...]
Issues: [list of issues if any]
Recommendations: [suggestions]
`
    })
    
    const reviewResult = wait({
      ids: [reviewAgent],
      timeout_ms: 600000
    })
    
    console.log(`
### Review Complete

${reviewResult.status[reviewAgent].completed}
`)
    
    close_agent({ id: reviewAgent })
    
  } else if (codeReviewTool === 'Gemini Review') {
    // CLI-based review
    Bash({
      command: `ccw cli -p "${reviewPrompt}" --tool gemini --mode analysis`,
      run_in_background: true
    })
    // Wait for hook callback
    
  } else if (codeReviewTool === 'Codex Review') {
    // Git-aware review
    Bash({
      command: `ccw cli --tool codex --mode review --uncommitted`,
      run_in_background: true
    })
    // Wait for hook callback
  }
}
```

### Step 6: Update Development Index

```javascript
// After all executions complete
const projectJsonPath = '.workflow/project-tech.json'
if (fileExists(projectJsonPath)) {
  const projectJson = JSON.parse(Read(projectJsonPath))
  
  if (!projectJson.development_index) {
    projectJson.development_index = { feature: [], enhancement: [], bugfix: [], refactor: [], docs: [] }
  }
  
  function detectCategory(text) {
    text = text.toLowerCase()
    if (/\b(fix|bug|error|issue|crash)\b/.test(text)) return 'bugfix'
    if (/\b(refactor|cleanup|reorganize)\b/.test(text)) return 'refactor'
    if (/\b(doc|readme|comment)\b/.test(text)) return 'docs'
    if (/\b(add|new|create|implement)\b/.test(text)) return 'feature'
    return 'enhancement'
  }
  
  const category = detectCategory(`${planObject.summary} ${planObject.approach}`)
  const entry = {
    title: planObject.summary.slice(0, 60),
    date: new Date().toISOString().split('T')[0],
    description: planObject.approach.slice(0, 100),
    status: previousExecutionResults.every(r => r.status === 'completed') ? 'completed' : 'partial',
    session_id: executionContext?.session?.id || null
  }
  
  projectJson.development_index[category].push(entry)
  Write(projectJsonPath, JSON.stringify(projectJson, null, 2))
  
  console.log(`✓ Development index: [${category}] ${entry.title}`)
}
```

---

## Codex vs Claude Comparison (for this workflow)

| Aspect | Claude Code Task | Codex Subagent |
|--------|------------------|----------------|
| **Creation** | `Task({ subagent_type, prompt })` | `spawn_agent({ message: task })` |
| **Role Loading** | Auto via `subagent_type` | Agent reads `~/.codex/agents/*.md` in MANDATORY FIRST STEPS |
| **Parallel Wait** | Multiple `Task()` calls | **Batch `wait({ ids: [...] })`** |
| **Result Retrieval** | Sync return or `TaskOutput` | `wait({ ids }).status[id].completed` |
| **Follow-up** | `resume` parameter | `send_input({ id, message })` |
| **Cleanup** | Automatic | **Explicit `close_agent({ id })`** |

**Codex Advantages for lite-execute**:
- True parallel execution with batch `wait` for all independent tasks
- Single wait call for multiple agents (reduced orchestration overhead)
- Fine-grained lifecycle control for complex task graphs

---

## Data Structures

### executionContext (Input - Mode 1)

```javascript
{
  planObject: {
    summary: string,
    approach: string,
    tasks: [...],
    estimated_time: string,
    recommended_execution: string,
    complexity: string
  },
  clarificationContext: {...} | null,
  executionMethod: "Agent" | "Codex" | "Auto",
  codeReviewTool: "Skip" | "Gemini Review" | "Codex Review" | string,
  originalUserInput: string,
  executorAssignments: {
    [taskId]: { executor: "gemini" | "codex" | "agent", reason: string }
  },
  session: {
    id: string,
    folder: string,
    artifacts: {
      explorations: [{angle, path}],
      plan: string
    }
  }
}
```

### executionResult (Output)

```javascript
{
  executionId: string,                 // e.g., "[P1]", "[S1]"
  status: "completed" | "partial" | "failed",
  tasksSummary: string,
  completionSummary: string,
  keyOutputs: string,
  notes: string,
  fixedCliId: string | null            // For CLI resume capability
}
```

---

## Error Handling

| Error | Resolution |
|-------|------------|
| spawn_agent failure | Fallback to CLI execution |
| wait() timeout | Use completed results, log partial status |
| Agent crash | Collect partial output, offer retry |
| CLI execution failure | Use fixed ID for resume |
| Circular dependency | Force remaining tasks with warning |
| Missing executionContext | Error: "No execution context found" |

---

## Best Practices

**Codex-Specific**:
- Pass role file path in MANDATORY FIRST STEPS (agent reads itself)
- Use batch `wait({ ids: [...] })` for parallel tasks
- Delay `close_agent` until all interactions complete
- Track `fixedCliId` for resume capability

**General**:
- Task Grouping: Based on explicit depends_on only
- Execution: All independent tasks launch via single batch wait
- Progress: TodoWrite at batch level (⚡ parallel, → sequential)

---

**Now execute the lite-execute workflow**
