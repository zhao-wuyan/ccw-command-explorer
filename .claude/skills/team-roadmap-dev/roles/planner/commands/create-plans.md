# Command: create-plans

Generate execution plans via action-planning-agent. Produces IMPL_PLAN.md, .task/IMPL-*.json, and TODO_LIST.md — the same artifact format as workflow-plan skill.

## Purpose

Transform phase context into structured task JSONs and implementation plan. Delegates to action-planning-agent for document generation. Produces artifacts compatible with workflow-plan's output format, enabling reuse of executor and verifier logic.

## When to Use

- Phase 3 of planner execution (after research, before self-validation)
- Called once per PLAN-* task

## Strategy

Delegate to action-planning-agent with phase context (context.md + roadmap phase section). The agent produces task JSONs with convergence criteria (replacing the old must_haves concept), dependency graph (replacing wave numbering), and implementation steps.

## Parameters

| Parameter | Source | Description |
|-----------|--------|-------------|
| `sessionFolder` | From PLAN-* task description | Session artifact directory |
| `phaseNumber` | From PLAN-* task description | Phase number (1-based) |

## Output Artifact Mapping (vs old plan-NN.md)

| Old (plan-NN.md) | New (IMPL-*.json) | Notes |
|-------------------|--------------------|-------|
| `plan: NN` | `id: "IMPL-N"` | Task identifier |
| `wave: N` | `depends_on: [...]` | Dependency graph replaces explicit waves |
| `files_modified: [...]` | `files: [{path, action, change}]` | Structured file list |
| `requirements: [REQ-IDs]` | `description` + `scope` | Requirements embedded in description |
| `must_haves.truths` | `convergence.criteria` | Observable behaviors → measurable criteria |
| `must_haves.artifacts` | `files` + `convergence.verification` | File checks in verification command |
| `must_haves.key_links` | `convergence.verification` | Import wiring in verification command |
| Plan body (implementation steps) | `implementation: [...]` | Step-by-step actions |

## Execution Steps

### Step 1: Load Phase Context

```javascript
const context = Read(`${sessionFolder}/phase-${phaseNumber}/context.md`)
const roadmap = Read(`${sessionFolder}/roadmap.md`)
const config = JSON.parse(Read(`${sessionFolder}/config.json`))

// Extract phase section from roadmap
const phaseGoal = extractPhaseGoal(roadmap, phaseNumber)
const requirements = extractRequirements(roadmap, phaseNumber)
const successCriteria = extractSuccessCriteria(roadmap, phaseNumber)

// Check for gap closure context
const isGapClosure = context.includes("Gap Closure Context")

// Load prior phase summaries for cross-phase context
const priorSummaries = []
for (let p = 1; p < phaseNumber; p++) {
  try {
    const summaryFiles = Glob(`${sessionFolder}/phase-${p}/summary-*.md`)
    for (const sf of summaryFiles) {
      priorSummaries.push(Read(sf))
    }
  } catch {}
}
```

### Step 2: Prepare Output Directories

```javascript
Bash(`mkdir -p "${sessionFolder}/phase-${phaseNumber}/.task"`)
```

### Step 3: Delegate to action-planning-agent

```javascript
const taskDir = `${sessionFolder}/phase-${phaseNumber}/.task`
const implPlanPath = `${sessionFolder}/phase-${phaseNumber}/IMPL_PLAN.md`
const todoListPath = `${sessionFolder}/phase-${phaseNumber}/TODO_LIST.md`

Task({
  subagent_type: "action-planning-agent",
  run_in_background: false,
  description: `Generate phase ${phaseNumber} planning documents`,
  prompt: `
## TASK OBJECTIVE
Generate implementation planning documents (IMPL_PLAN.md, task JSONs, TODO_LIST.md) for roadmap-dev session phase ${phaseNumber}.

IMPORTANT: This is PLANNING ONLY - generate planning documents, NOT implementing code.

## PHASE CONTEXT
${context}

## ROADMAP PHASE ${phaseNumber}
Goal: ${phaseGoal}

Requirements:
${requirements.map(r => `- ${r.id}: ${r.desc}`).join('\n')}

Success Criteria:
${successCriteria.map(c => `- ${c}`).join('\n')}

${isGapClosure ? `## GAP CLOSURE
This is a gap closure iteration. Only address gaps listed in context — do NOT re-plan completed work.
Existing task JSONs in ${taskDir} represent prior work. Create gap-specific tasks starting from next available ID.` : ''}

${priorSummaries.length > 0 ? `## PRIOR PHASE CONTEXT
${priorSummaries.join('\n\n---\n\n')}` : ''}

## SESSION PATHS
Output:
  - Task Dir: ${taskDir}
  - IMPL_PLAN: ${implPlanPath}
  - TODO_LIST: ${todoListPath}

## CONTEXT METADATA
Session: ${sessionFolder}
Phase: ${phaseNumber}
Depth: ${config.depth || 'standard'}

## USER CONFIGURATION
Execution Method: agent
Preferred CLI Tool: gemini

## EXPECTED DELIVERABLES
1. Task JSON Files (${taskDir}/IMPL-*.json)
   - Unified flat schema (task-schema.json)
   - Quantified requirements with explicit counts
   - focus_paths from context.md relevant files
   - convergence criteria derived from success criteria (goal-backward)

2. Implementation Plan (${implPlanPath})
   - Phase goal and context
   - Task breakdown and execution strategy
   - Dependency graph

3. TODO List (${todoListPath})
   - Flat structure with [ ] for pending
   - Links to task JSONs

## TASK ID FORMAT
Use: IMPL-{phaseNumber}{seq} (e.g., IMPL-101, IMPL-102 for phase 1)

## CONVERGENCE CRITERIA RULES (replacing old must_haves)
Each task MUST include convergence:
- criteria: Measurable conditions derived from success criteria (goal-backward, not task-forward)
  - Include file existence checks
  - Include export/symbol presence checks
  - Include test passage checks where applicable
- verification: Executable command to verify criteria
- definition_of_done: Business-language completion definition

## CLI EXECUTION ID FORMAT
Each task: cli_execution.id = "RD-${sessionFolder.split('/').pop()}-{task_id}"

## QUALITY STANDARDS
- Task count <= 10 per phase (hard limit)
- All requirements quantified
- Acceptance criteria measurable
- Dependencies form a valid DAG (no cycles)
`
})
```

### Step 4: Validate Generated Artifacts

```javascript
// 4a. Verify task JSONs were created
const taskFiles = Glob(`${taskDir}/IMPL-*.json`)
if (!taskFiles || taskFiles.length === 0) {
  mcp__ccw-tools__team_msg({
    operation: "log", team: "roadmap-dev",
    from: "planner", to: "coordinator",
    type: "error",
    summary: `[planner] action-planning-agent produced no task JSONs for phase ${phaseNumber}`
  })
  return
}

// 4b. Validate each task JSON
for (const taskFile of taskFiles) {
  const taskJson = JSON.parse(Read(taskFile))

  // Required fields check
  const requiredFields = ['id', 'title', 'description', 'files', 'implementation', 'convergence']
  for (const field of requiredFields) {
    if (!taskJson[field]) {
      mcp__ccw-tools__team_msg({
        operation: "log", team: "roadmap-dev",
        from: "planner", to: "coordinator",
        type: "plan_progress",
        summary: `[planner] Warning: ${taskFile} missing field: ${field}`
      })
    }
  }

  // Convergence criteria check
  if (!taskJson.convergence?.criteria || taskJson.convergence.criteria.length === 0) {
    mcp__ccw-tools__team_msg({
      operation: "log", team: "roadmap-dev",
      from: "planner", to: "coordinator",
      type: "plan_progress",
      summary: `[planner] Warning: ${taskFile} has no convergence criteria`
    })
  }

  // Dependency cycle check (simple: task cannot depend on itself)
  if (taskJson.depends_on?.includes(taskJson.id)) {
    mcp__ccw-tools__team_msg({
      operation: "log", team: "roadmap-dev",
      from: "planner", to: "coordinator",
      type: "error",
      summary: `[planner] Self-dependency detected in ${taskJson.id}`
    })
  }
}

// 4c. Validate dependency DAG (no cycles)
const allTasks = taskFiles.map(f => JSON.parse(Read(f)))
const taskIds = new Set(allTasks.map(t => t.id))

// Check all depends_on references are valid
for (const task of allTasks) {
  for (const dep of (task.depends_on || [])) {
    if (!taskIds.has(dep)) {
      mcp__ccw-tools__team_msg({
        operation: "log", team: "roadmap-dev",
        from: "planner", to: "coordinator",
        type: "plan_progress",
        summary: `[planner] Warning: ${task.id} depends on unknown task ${dep}`
      })
    }
  }
}

// 4d. Verify IMPL_PLAN.md exists
const implPlanExists = Bash(`test -f "${implPlanPath}" && echo "EXISTS" || echo "NOT_FOUND"`).trim()
if (implPlanExists === "NOT_FOUND") {
  mcp__ccw-tools__team_msg({
    operation: "log", team: "roadmap-dev",
    from: "planner", to: "coordinator",
    type: "plan_progress",
    summary: `[planner] Warning: IMPL_PLAN.md not generated, creating minimal version`
  })
  // Create minimal IMPL_PLAN.md from task JSONs
  generateMinimalImplPlan(allTasks, implPlanPath, phaseGoal, phaseNumber)
}
```

### Step 5: Compute Wave Structure (for reporting)

```javascript
// Derive wave structure from dependency graph (for reporting only — executor uses depends_on directly)
function computeWaves(tasks) {
  const waves = {}
  const assigned = new Set()
  let currentWave = 1

  while (assigned.size < tasks.length) {
    const waveMembers = tasks.filter(t =>
      !assigned.has(t.id) &&
      (t.depends_on || []).every(d => assigned.has(d))
    )

    if (waveMembers.length === 0 && assigned.size < tasks.length) {
      const unassigned = tasks.find(t => !assigned.has(t.id))
      waveMembers.push(unassigned)
    }

    for (const task of waveMembers) {
      waves[task.id] = currentWave
      assigned.add(task.id)
    }
    currentWave++
  }
  return { waves, totalWaves: currentWave - 1 }
}

const { waves, totalWaves } = computeWaves(allTasks)
```

### Step 6: Report Plan Structure

```javascript
const taskCount = allTasks.length

mcp__ccw-tools__team_msg({
  operation: "log", team: "roadmap-dev",
  from: "planner", to: "coordinator",
  type: "plan_progress",
  summary: `[planner] Created ${taskCount} tasks across ${totalWaves} waves for phase ${phaseNumber}`,
  ref: `${sessionFolder}/phase-${phaseNumber}/`
})

return {
  taskCount,
  totalWaves,
  waves,
  taskFiles,
  implPlanPath,
  todoListPath
}
```

## Gap Closure Plans

When creating plans for gap closure (re-planning after verification found gaps):

```javascript
if (isGapClosure) {
  // 1. Existing IMPL-*.json files represent completed work
  // 2. action-planning-agent receives gap context and creates gap-specific tasks
  // 3. New task IDs start from next available (e.g., IMPL-103 if 101,102 exist)
  // 4. convergence criteria should directly address gap descriptions from verification.md
  // 5. Gap tasks may depend on existing completed tasks
}
```

## Helper: Minimal IMPL_PLAN.md Generation

```javascript
function generateMinimalImplPlan(tasks, outputPath, phaseGoal, phaseNumber) {
  const content = `# Implementation Plan: Phase ${phaseNumber}

## Goal

${phaseGoal}

## Tasks

${tasks.map(t => `### ${t.id}: ${t.title}

${t.description}

**Files**: ${(t.files || []).map(f => f.path).join(', ')}
**Depends on**: ${(t.depends_on || []).join(', ') || 'None'}

**Convergence Criteria**:
${(t.convergence?.criteria || []).map(c => `- ${c}`).join('\n')}
`).join('\n---\n\n')}

## Dependency Graph

${'```'}
${tasks.map(t => `${t.id} → [${(t.depends_on || []).join(', ')}]`).join('\n')}
${'```'}
`

  Write(outputPath, content)
}
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| context.md not found | Error — research phase was skipped or failed |
| action-planning-agent fails | Retry once. If still fails, error to coordinator |
| No task JSONs generated | Error to coordinator — agent may have misunderstood input |
| Dependency cycle detected | Log warning, break cycle at lowest-numbered task |
| Too many tasks (>10) | Log warning — agent should self-limit but validate |
| Missing convergence criteria | Log warning — every task should have at least one criterion |
| IMPL_PLAN.md not generated | Create minimal version from task JSONs |
