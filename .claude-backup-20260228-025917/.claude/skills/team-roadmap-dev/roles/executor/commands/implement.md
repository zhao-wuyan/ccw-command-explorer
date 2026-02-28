# Command: implement

Wave-based task execution using code-developer subagent. Reads IMPL-*.json task files, computes execution waves from dependency graph, and executes sequentially by wave with parallel tasks within each wave.

## Purpose

Read IMPL-*.json task files for the current phase, compute wave groups from depends_on graph, and execute each task by delegating to a code-developer subagent. Produce summary-NN.md per task with structured YAML frontmatter for verifier and cross-task context.

## When to Use

- Phase 3 of executor execution (after loading tasks, before self-validation)
- Called once per EXEC-* task

## Strategy

Compute waves from dependency graph (topological sort). Sequential waves, parallel tasks within each wave. Each task is delegated to a code-developer subagent with the full task JSON plus prior summary context. After each task completes, a summary is written. After each wave completes, wave progress is reported.

## Parameters

| Parameter | Source | Description |
|-----------|--------|-------------|
| `sessionFolder` | From EXEC-* task description | Session artifact directory |
| `phaseNumber` | From EXEC-* task description | Phase number (1-based) |
| `tasks` | From executor Phase 2 | Parsed task JSON objects |
| `waves` | From executor Phase 2 | Wave-grouped task map |
| `waveNumbers` | From executor Phase 2 | Sorted wave number array |
| `priorSummaries` | From executor Phase 2 | Summaries from earlier phases |

## Execution Steps

### Step 1: Compute Waves from Dependency Graph

```javascript
// Tasks loaded in executor Phase 2 from .task/IMPL-*.json
// Compute wave assignment from depends_on graph

function computeWaves(tasks) {
  const waveMap = {}  // taskId → waveNumber
  const assigned = new Set()
  let currentWave = 1

  while (assigned.size < tasks.length) {
    const ready = tasks.filter(t =>
      !assigned.has(t.id) &&
      (t.depends_on || []).every(d => assigned.has(d))
    )

    if (ready.length === 0 && assigned.size < tasks.length) {
      // Cycle detected — force lowest unassigned
      const unassigned = tasks.find(t => !assigned.has(t.id))
      ready.push(unassigned)
    }

    for (const task of ready) {
      waveMap[task.id] = currentWave
      assigned.add(task.id)
    }
    currentWave++
  }

  // Group by wave
  const waves = {}
  for (const task of tasks) {
    const w = waveMap[task.id]
    if (!waves[w]) waves[w] = []
    waves[w].push(task)
  }

  return {
    waves,
    waveNumbers: Object.keys(waves).map(Number).sort((a, b) => a - b),
    totalWaves: currentWave - 1
  }
}

const { waves, waveNumbers, totalWaves } = computeWaves(tasks)
const totalTasks = tasks.length
let completedTasks = 0
```

### Step 2: Sequential Wave Execution

```javascript
for (const waveNum of waveNumbers) {
  const waveTasks = waves[waveNum]

  for (const task of waveTasks) {
    const startTime = Date.now()

    // 2a. Build context from prior summaries
    const contextSummaries = []

    // From earlier phases
    for (const ps of priorSummaries) {
      contextSummaries.push(ps.content)
    }

    // From earlier waves in this phase
    for (const earlierWave of waveNumbers.filter(w => w < waveNum)) {
      for (const earlierTask of waves[earlierWave]) {
        try {
          const summaryFile = `${sessionFolder}/phase-${phaseNumber}/summary-${earlierTask.id}.md`
          contextSummaries.push(Read(summaryFile))
        } catch {}
      }
    }

    const contextSection = contextSummaries.length > 0
      ? `## Prior Context\n\n${contextSummaries.join('\n\n---\n\n')}`
      : "## Prior Context\n\nNone (first task in first wave)."

    // 2b. Build implementation prompt from task JSON
    const filesSection = (task.files || [])
      .map(f => `- \`${f.path}\` (${f.action}): ${f.change}`)
      .join('\n')

    const stepsSection = (task.implementation || [])
      .map((step, i) => typeof step === 'string' ? `${i + 1}. ${step}` : `${i + 1}. ${step.step}: ${step.description}`)
      .join('\n')

    const convergenceSection = task.convergence
      ? `## Success Criteria\n${(task.convergence.criteria || []).map(c => `- ${c}`).join('\n')}\n\n**Verification**: ${task.convergence.verification || 'N/A'}`
      : ''

    // 2c. Delegate to code-developer subagent
    const implResult = Task({
      subagent_type: "code-developer",
      run_in_background: false,
      prompt: `Implement the following task. Write production-quality code following existing patterns.

## Task: ${task.id} - ${task.title}

${task.description}

## Files
${filesSection}

## Implementation Steps
${stepsSection}

${convergenceSection}

${contextSection}

## Implementation Rules
- Follow existing code patterns and conventions in the project
- Write clean, minimal code that satisfies the task requirements
- Create all files listed with action "create"
- Modify files listed with action "modify" as described
- Handle errors appropriately
- Do NOT add unnecessary features beyond what the task specifies
- Do NOT modify files outside the task scope unless absolutely necessary

## Output
After implementation, report:
1. Files created or modified (with brief description of changes)
2. Key decisions made during implementation
3. Any deviations from the task (and why)
4. Capabilities provided (exports, APIs, components)
5. Technologies/patterns used`
    })

    const duration = Math.round((Date.now() - startTime) / 60000)

    // 2d. Write summary
    const summaryPath = `${sessionFolder}/phase-${phaseNumber}/summary-${task.id}.md`
    const affectedPaths = (task.files || []).map(f => f.path)

    Write(summaryPath, `---
phase: ${phaseNumber}
task: "${task.id}"
title: "${task.title}"
requires: [${(task.depends_on || []).map(d => `"${d}"`).join(', ')}]
provides: ["${task.id}"]
affects:
${affectedPaths.map(p => `  - "${p}"`).join('\n')}
tech-stack: []
key-files:
${affectedPaths.map(p => `  - "${p}"`).join('\n')}
key-decisions: []
patterns-established: []
convergence-met: pending
duration: ${duration}m
completed: ${new Date().toISOString().slice(0, 19)}
---

# Summary: ${task.id} - ${task.title}

## Implementation Result

${implResult || "Implementation delegated to code-developer subagent."}

## Files Affected

${affectedPaths.map(p => `- \`${p}\``).join('\n')}

## Convergence Criteria
${(task.convergence?.criteria || []).map(c => `- [ ] ${c}`).join('\n')}
`)

    completedTasks++
  }

  // 2e. Report wave progress
  mcp__ccw-tools__team_msg({
    operation: "log", team: "roadmap-dev",
    from: "executor", to: "coordinator",
    type: "exec_progress",
    summary: `[executor] Wave ${waveNum}/${totalWaves} complete (${completedTasks}/${totalTasks} tasks done)`,
    ref: `${sessionFolder}/phase-${phaseNumber}/`
  })
}
```

### Step 3: Report Execution Complete

```javascript
mcp__ccw-tools__team_msg({
  operation: "log", team: "roadmap-dev",
  from: "executor", to: "coordinator",
  type: "exec_complete",
  summary: `[executor] All ${totalTasks} tasks executed across ${totalWaves} waves for phase ${phaseNumber}`,
  ref: `${sessionFolder}/phase-${phaseNumber}/`
})
```

## Summary File Format

Each summary-{IMPL-ID}.md uses YAML frontmatter:

```yaml
---
phase: N
task: "IMPL-N"
title: "Task title"
requires: ["IMPL-N"]
provides: ["IMPL-N"]
affects: [paths]
tech-stack: [technologies]
key-files: [paths]
key-decisions: [decisions]
patterns-established: [patterns]
convergence-met: pending|pass|fail
duration: Xm
completed: timestamp
---
```

### Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `phase` | number | Phase this summary belongs to |
| `task` | string | Task ID that was executed |
| `title` | string | Task title |
| `requires` | string[] | Dependency task IDs consumed |
| `provides` | string[] | Task ID provided to downstream |
| `affects` | string[] | File paths created or modified |
| `tech-stack` | string[] | Technologies/frameworks used |
| `key-files` | string[] | Primary files (subset of affects) |
| `key-decisions` | string[] | Decisions made during implementation |
| `patterns-established` | string[] | Patterns introduced |
| `convergence-met` | string | Whether convergence criteria passed |
| `duration` | string | Execution time |
| `completed` | string | ISO timestamp |

## Deviation Rules

| Deviation | Action | Report |
|-----------|--------|--------|
| **Bug found** in existing code | Auto-fix, continue | Log in summary key-decisions |
| **Missing critical** dependency | Add to scope, implement | Log in summary key-decisions |
| **Blocking dependency** (unresolvable) | Stop task execution | Report error to coordinator |
| **Architectural concern** | Do NOT auto-fix | Report error to coordinator, await guidance |

## Wave Execution Example

```
Phase 2, 4 tasks, 3 waves (computed from depends_on):

Wave 1: [IMPL-201 (types)]      — no dependencies
  -> delegate IMPL-201 to code-developer
  -> write summary-IMPL-201.md
  -> report: Wave 1/3 complete (1/4 tasks)

Wave 2: [IMPL-202 (API), IMPL-203 (UI)]   — depend on IMPL-201
  -> delegate IMPL-202 (loads summary-IMPL-201 as context)
  -> write summary-IMPL-202.md
  -> delegate IMPL-203 (loads summary-IMPL-201 as context)
  -> write summary-IMPL-203.md
  -> report: Wave 2/3 complete (3/4 tasks)

Wave 3: [IMPL-204 (tests)]      — depends on IMPL-202, IMPL-203
  -> delegate IMPL-204 (loads summaries 201-203 as context)
  -> write summary-IMPL-204.md
  -> report: Wave 3/3 complete (4/4 tasks)

-> report: exec_complete
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| code-developer subagent fails | Retry once. If still fails, write error summary, continue with next task |
| File write conflict | Last write wins. Log in summary. Verifier will validate |
| Task references non-existent file | Check if dependency task creates it. If yes, load summary. If no, log error |
| All tasks in a wave fail | Report wave failure to coordinator, attempt next wave |
| Summary write fails | Retry with Bash fallback. Critical — verifier needs summaries |
