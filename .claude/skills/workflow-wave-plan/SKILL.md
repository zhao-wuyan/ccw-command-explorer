---
name: workflow-wave-plan
description: CSV Wave planning and execution - explore via wave, resolve conflicts, execute from CSV with linked exploration context. Triggers on "workflow:wave-plan".
argument-hint: "<task description> [--yes|-y] [--concurrency|-c N]"
allowed-tools: Task, AskUserQuestion, Read, Write, Edit, Bash, Glob, Grep
---

# Workflow Wave Plan

CSV Wave-based planning and execution. Uses structured CSV state for both exploration and execution, with cross-phase context propagation via `context_from` linking.

## Architecture

```
Requirement
    ↓
┌─ Phase 1: Decompose ─────────────────────┐
│  Analyze requirement → explore.csv         │
│  (1 row per exploration angle)             │
└────────────────────┬──────────────────────┘
                     ↓
┌─ Phase 2: Wave Explore ──────────────────┐
│  Wave loop: spawn Explore agents          │
│  → findings/key_files → explore.csv       │
└────────────────────┬──────────────────────┘
                     ↓
┌─ Phase 3: Synthesize & Plan ─────────────┐
│  Read explore findings → cross-reference  │
│  → resolve conflicts → tasks.csv          │
│  (context_from links to E* explore rows)  │
└────────────────────┬──────────────────────┘
                     ↓
┌─ Phase 4: Wave Execute ──────────────────┐
│  Wave loop: build prev_context from CSV   │
│  → spawn code-developer agents per wave   │
│  → results → tasks.csv                    │
└────────────────────┬──────────────────────┘
                     ↓
┌─ Phase 5: Aggregate ─────────────────────┐
│  results.csv + context.md + summary       │
└───────────────────────────────────────────┘
```

## Context Flow

```
explore.csv             tasks.csv
┌──────────┐           ┌──────────┐
│ E1: arch │──────────→│ T1: setup│ context_from: E1;E2
│ findings │           │ prev_ctx │← E1+E2 findings
├──────────┤           ├──────────┤
│ E2: deps │──────────→│ T2: impl │ context_from: E1;T1
│ findings │           │ prev_ctx │← E1+T1 findings
├──────────┤           ├──────────┤
│ E3: test │──┐   ┌───→│ T3: test │ context_from: E3;T2
│ findings │  └───┘    │ prev_ctx │← E3+T2 findings
└──────────┘           └──────────┘

Two context channels:
1. Directed: context_from → prev_context (from CSV findings)
2. Broadcast: discoveries.ndjson (append-only shared board)
```

---

## CSV Schemas

### explore.csv

| Column | Type | Set By | Description |
|--------|------|--------|-------------|
| `id` | string | Decomposer | E1, E2, ... |
| `angle` | string | Decomposer | Exploration angle name |
| `description` | string | Decomposer | What to explore from this angle |
| `focus` | string | Decomposer | Keywords and focus areas |
| `deps` | string | Decomposer | Semicolon-separated dep IDs (usually empty) |
| `wave` | integer | Wave Engine | Wave number (usually 1) |
| `status` | enum | Agent | pending / completed / failed |
| `findings` | string | Agent | Discoveries (max 800 chars) |
| `key_files` | string | Agent | Relevant files (semicolon-separated) |
| `error` | string | Agent | Error message if failed |

### tasks.csv

| Column | Type | Set By | Description |
|--------|------|--------|-------------|
| `id` | string | Planner | T1, T2, ... |
| `title` | string | Planner | Task title |
| `description` | string | Planner | Self-contained task description |
| `deps` | string | Planner | Dependency task IDs: T1;T2 |
| `context_from` | string | Planner | Context source IDs: **E1;E2;T1** |
| `wave` | integer | Wave Engine | Wave number (computed from deps) |
| `status` | enum | Agent | pending / completed / failed / skipped |
| `findings` | string | Agent | Execution findings (max 500 chars) |
| `files_modified` | string | Agent | Files modified (semicolon-separated) |
| `error` | string | Agent | Error if failed |

**context_from prefix convention**: `E*` → explore.csv lookup, `T*` → tasks.csv lookup.

---

## Session Structure

```
.workflow/.wave-plan/{session-id}/
├── explore.csv              # Exploration state
├── tasks.csv                # Execution state
├── discoveries.ndjson       # Shared discovery board
├── explore-results/         # Detailed per-angle results
│   ├── E1.json
│   └── E2.json
├── task-results/            # Detailed per-task results
│   ├── T1.json
│   └── T2.json
├── results.csv              # Final results export
└── context.md               # Full context summary
```

---

## Session Initialization

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

// Parse flags
const AUTO_YES = $ARGUMENTS.includes('--yes') || $ARGUMENTS.includes('-y')
const concurrencyMatch = $ARGUMENTS.match(/(?:--concurrency|-c)\s+(\d+)/)
const maxConcurrency = concurrencyMatch ? parseInt(concurrencyMatch[1]) : 4

const requirement = $ARGUMENTS
  .replace(/--yes|-y|--concurrency\s+\d+|-c\s+\d+/g, '')
  .trim()

const slug = requirement.toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
  .substring(0, 40)
const dateStr = getUtc8ISOString().substring(0, 10).replace(/-/g, '')
const sessionId = `wp-${slug}-${dateStr}`
const sessionFolder = `.workflow/.wave-plan/${sessionId}`

Bash(`mkdir -p ${sessionFolder}/explore-results ${sessionFolder}/task-results`)
```

---

## Phase 1: Decompose → explore.csv

### 1.1 Analyze Requirement

```javascript
const complexity = analyzeComplexity(requirement)
// Low: 1 angle | Medium: 2-3 angles | High: 3-4 angles

const ANGLE_PRESETS = {
  architecture: ['architecture', 'dependencies', 'integration-points', 'modularity'],
  security:     ['security', 'auth-patterns', 'dataflow', 'validation'],
  performance:  ['performance', 'bottlenecks', 'caching', 'data-access'],
  bugfix:       ['error-handling', 'dataflow', 'state-management', 'edge-cases'],
  feature:      ['patterns', 'integration-points', 'testing', 'dependencies']
}

function selectAngles(text, count) {
  let preset = 'feature'
  if (/refactor|architect|restructure|modular/.test(text)) preset = 'architecture'
  else if (/security|auth|permission|access/.test(text)) preset = 'security'
  else if (/performance|slow|optimi|cache/.test(text)) preset = 'performance'
  else if (/fix|bug|error|broken/.test(text)) preset = 'bugfix'
  return ANGLE_PRESETS[preset].slice(0, count)
}

const angleCount = complexity === 'High' ? 4 : complexity === 'Medium' ? 3 : 1
const angles = selectAngles(requirement, angleCount)
```

### 1.2 Generate explore.csv

```javascript
const header = 'id,angle,description,focus,deps,wave,status,findings,key_files,error'
const rows = angles.map((angle, i) => {
  const id = `E${i + 1}`
  const desc = `Explore codebase from ${angle} perspective for: ${requirement}`
  return `"${id}","${angle}","${escCSV(desc)}","${angle}","",1,"pending","","",""`
})

Write(`${sessionFolder}/explore.csv`, [header, ...rows].join('\n'))
```

All exploration rows default to wave 1 (independent parallel). If angle dependencies exist, compute waves.

---

## Phase 2: Wave Explore

Execute exploration waves using `Task(Explore)` agents.

### 2.1 Wave Loop

```javascript
const exploreCSV = parseCSV(Read(`${sessionFolder}/explore.csv`))
const maxExploreWave = Math.max(...exploreCSV.map(r => parseInt(r.wave)))

for (let wave = 1; wave <= maxExploreWave; wave++) {
  const waveRows = exploreCSV.filter(r =>
    parseInt(r.wave) === wave && r.status === 'pending'
  )
  if (waveRows.length === 0) continue

  // Skip rows with failed dependencies
  const validRows = waveRows.filter(r => {
    if (!r.deps) return true
    return r.deps.split(';').filter(Boolean).every(depId => {
      const dep = exploreCSV.find(d => d.id === depId)
      return dep && dep.status === 'completed'
    })
  })

  waveRows.filter(r => !validRows.includes(r)).forEach(r => {
    r.status = 'skipped'
    r.error = 'Dependency failed/skipped'
  })

  // ★ Spawn ALL explore agents in SINGLE message → parallel execution
  const results = validRows.map(row =>
    Task({
      subagent_type: "Explore",
      run_in_background: false,
      description: `Explore: ${row.angle}`,
      prompt: buildExplorePrompt(row, requirement, sessionFolder)
    })
  )

  // Collect results from JSON files → update explore.csv
  validRows.forEach((row, i) => {
    const resultPath = `${sessionFolder}/explore-results/${row.id}.json`
    if (fileExists(resultPath)) {
      const result = JSON.parse(Read(resultPath))
      row.status = result.status || 'completed'
      row.findings = truncate(result.findings, 800)
      row.key_files = Array.isArray(result.key_files)
        ? result.key_files.join(';')
        : (result.key_files || '')
      row.error = result.error || ''
    } else {
      // Fallback: parse from agent output text
      row.status = 'completed'
      row.findings = truncate(results[i], 800)
    }
  })

  writeCSV(`${sessionFolder}/explore.csv`, exploreCSV)
}
```

### 2.2 Explore Agent Prompt

```javascript
function buildExplorePrompt(row, requirement, sessionFolder) {
  return `## Exploration: ${row.angle}

**Requirement**: ${requirement}
**Focus**: ${row.focus}

## Instructions
Explore the codebase from the **${row.angle}** perspective:
1. Discover relevant files, modules, and patterns
2. Identify integration points and dependencies
3. Note constraints, risks, and conventions
4. Find existing patterns to follow

## Output
Write findings to: ${sessionFolder}/explore-results/${row.id}.json

JSON format:
{
  "status": "completed",
  "findings": "Concise summary of ${row.angle} discoveries (max 800 chars)",
  "key_files": ["relevant/file1.ts", "relevant/file2.ts"],
  "details": {
    "patterns": ["pattern descriptions"],
    "integration_points": [{"file": "path", "description": "..."}],
    "constraints": ["constraint descriptions"],
    "recommendations": ["recommendation descriptions"]
  }
}

Also provide a 2-3 sentence summary.`
}
```

---

## Phase 3: Synthesize & Plan → tasks.csv

Read exploration findings, cross-reference, resolve conflicts, generate execution tasks.

### 3.1 Load Explore Results

```javascript
const exploreCSV = parseCSV(Read(`${sessionFolder}/explore.csv`))
const completed = exploreCSV.filter(r => r.status === 'completed')

// Load detailed result JSONs where available
const detailedResults = {}
completed.forEach(r => {
  const path = `${sessionFolder}/explore-results/${r.id}.json`
  if (fileExists(path)) detailedResults[r.id] = JSON.parse(Read(path))
})
```

### 3.2 Conflict Resolution Protocol

Cross-reference findings across all exploration angles:

```javascript
// 1. Identify common files referenced by multiple angles
const fileRefs = {}
completed.forEach(r => {
  r.key_files.split(';').filter(Boolean).forEach(f => {
    if (!fileRefs[f]) fileRefs[f] = []
    fileRefs[f].push({ angle: r.angle, id: r.id })
  })
})
const sharedFiles = Object.entries(fileRefs).filter(([_, refs]) => refs.length > 1)

// 2. Detect conflicting recommendations
//    Compare recommendations from different angles for same file/module
//    Flag contradictions (angle A says "refactor X" vs angle B says "extend X")

// 3. Resolution rules:
//    a. Safety first — when approaches conflict, choose safer option
//    b. Consistency — prefer approaches aligned with existing patterns
//    c. Scope — prefer minimal-change approaches
//    d. Document — note all resolved conflicts for transparency

const synthesis = {
  sharedFiles,
  conflicts: detectConflicts(completed, detailedResults),
  resolutions: [],
  allKeyFiles: [...new Set(completed.flatMap(r => r.key_files.split(';').filter(Boolean)))]
}
```

### 3.3 Generate tasks.csv

Decompose into execution tasks based on synthesized exploration:

```javascript
// Task decomposition rules:
// 1. Group by feature/module (not per-file)
// 2. Each description is self-contained (agent sees only its row + prev_context)
// 3. deps only when task B requires task A's output
// 4. context_from links relevant explore rows (E*) and predecessor tasks (T*)
// 5. Prefer parallel (minimize deps)
// 6. Use exploration findings: key_files → target files, patterns → references,
//    integration_points → dependency relationships, constraints → included in description

const tasks = []
// Claude decomposes requirement using exploration synthesis
// Example:
// tasks.push({ id: 'T1', title: 'Setup types', description: '...', deps: '', context_from: 'E1;E2' })
// tasks.push({ id: 'T2', title: 'Implement core', description: '...', deps: 'T1', context_from: 'E1;E2;T1' })
// tasks.push({ id: 'T3', title: 'Add tests', description: '...', deps: 'T2', context_from: 'E3;T2' })

// Compute waves
const waves = computeWaves(tasks)
tasks.forEach(t => { t.wave = waves[t.id] })

// Write tasks.csv
const header = 'id,title,description,deps,context_from,wave,status,findings,files_modified,error'
const rows = tasks.map(t =>
  `"${t.id}","${escCSV(t.title)}","${escCSV(t.description)}","${t.deps}","${t.context_from}",${t.wave},"pending","","",""`
)

Write(`${sessionFolder}/tasks.csv`, [header, ...rows].join('\n'))
```

### 3.4 User Confirmation

```javascript
if (!AUTO_YES) {
  const maxWave = Math.max(...tasks.map(t => t.wave))

  console.log(`
## Execution Plan

Explore: ${completed.length} angles completed
Conflicts resolved: ${synthesis.conflicts.length}
Tasks: ${tasks.length} across ${maxWave} waves

${Array.from({length: maxWave}, (_, i) => i + 1).map(w => {
  const wt = tasks.filter(t => t.wave === w)
  return `### Wave ${w} (${wt.length} tasks, concurrent)
${wt.map(t => `  - [${t.id}] ${t.title} (from: ${t.context_from})`).join('\n')}`
}).join('\n')}
  `)

  AskUserQuestion({
    questions: [{
      question: `Proceed with ${tasks.length} tasks across ${maxWave} waves?`,
      header: "Confirm",
      multiSelect: false,
      options: [
        { label: "Execute", description: "Proceed with wave execution" },
        { label: "Modify", description: `Edit ${sessionFolder}/tasks.csv then re-run` },
        { label: "Cancel", description: "Abort" }
      ]
    }]
  })
}
```

---

## Phase 4: Wave Execute

Execute tasks from tasks.csv in wave order, with prev_context built from both explore.csv and tasks.csv.

### 4.1 Wave Loop

```javascript
const exploreCSV = parseCSV(Read(`${sessionFolder}/explore.csv`))
const failedIds = new Set()
const skippedIds = new Set()

let tasksCSV = parseCSV(Read(`${sessionFolder}/tasks.csv`))
const maxWave = Math.max(...tasksCSV.map(r => parseInt(r.wave)))

for (let wave = 1; wave <= maxWave; wave++) {
  // Re-read master CSV (updated by previous wave)
  tasksCSV = parseCSV(Read(`${sessionFolder}/tasks.csv`))

  const waveRows = tasksCSV.filter(r =>
    parseInt(r.wave) === wave && r.status === 'pending'
  )
  if (waveRows.length === 0) continue

  // Skip on failed dependencies (cascade)
  const validRows = []
  for (const row of waveRows) {
    const deps = (row.deps || '').split(';').filter(Boolean)
    if (deps.some(d => failedIds.has(d) || skippedIds.has(d))) {
      skippedIds.add(row.id)
      row.status = 'skipped'
      row.error = 'Dependency failed/skipped'
      continue
    }
    validRows.push(row)
  }

  if (validRows.length === 0) {
    writeCSV(`${sessionFolder}/tasks.csv`, tasksCSV)
    continue
  }

  // Build prev_context for each row from explore.csv + tasks.csv
  validRows.forEach(row => {
    row._prev_context = buildPrevContext(row.context_from, exploreCSV, tasksCSV)
  })

  // ★ Spawn ALL task agents in SINGLE message → parallel execution
  const results = validRows.map(row =>
    Task({
      subagent_type: "code-developer",
      run_in_background: false,
      description: row.title,
      prompt: buildExecutePrompt(row, requirement, sessionFolder)
    })
  )

  // Collect results → update tasks.csv
  validRows.forEach((row, i) => {
    const resultPath = `${sessionFolder}/task-results/${row.id}.json`
    if (fileExists(resultPath)) {
      const result = JSON.parse(Read(resultPath))
      row.status = result.status || 'completed'
      row.findings = truncate(result.findings, 500)
      row.files_modified = Array.isArray(result.files_modified)
        ? result.files_modified.join(';')
        : (result.files_modified || '')
      row.error = result.error || ''
    } else {
      row.status = 'completed'
      row.findings = truncate(results[i], 500)
    }

    if (row.status === 'failed') failedIds.add(row.id)
    delete row._prev_context  // runtime-only, don't persist
  })

  writeCSV(`${sessionFolder}/tasks.csv`, tasksCSV)
}
```

### 4.2 prev_context Builder

The key function linking exploration context to execution:

```javascript
function buildPrevContext(contextFrom, exploreCSV, tasksCSV) {
  if (!contextFrom) return 'No previous context available'

  const ids = contextFrom.split(';').filter(Boolean)
  const entries = []

  ids.forEach(id => {
    if (id.startsWith('E')) {
      // ← Look up in explore.csv (cross-phase link)
      const row = exploreCSV.find(r => r.id === id)
      if (row && row.status === 'completed' && row.findings) {
        entries.push(`[Explore ${row.angle}] ${row.findings}`)
        if (row.key_files) entries.push(`  Key files: ${row.key_files}`)
      }
    } else if (id.startsWith('T')) {
      // ← Look up in tasks.csv (same-phase link)
      const row = tasksCSV.find(r => r.id === id)
      if (row && row.status === 'completed' && row.findings) {
        entries.push(`[Task ${row.id}: ${row.title}] ${row.findings}`)
        if (row.files_modified) entries.push(`  Modified: ${row.files_modified}`)
      }
    }
  })

  return entries.length > 0 ? entries.join('\n') : 'No previous context available'
}
```

### 4.3 Execute Agent Prompt

```javascript
function buildExecutePrompt(row, requirement, sessionFolder) {
  return `## Task: ${row.title}

**ID**: ${row.id}
**Goal**: ${requirement}

## Description
${row.description}

## Previous Context (from exploration and predecessor tasks)
${row._prev_context}

## Discovery Board
Read shared discoveries first: ${sessionFolder}/discoveries.ndjson (if exists)
After execution, append any discoveries:
echo '{"ts":"<ISO>","worker":"${row.id}","type":"<type>","data":{...}}' >> ${sessionFolder}/discoveries.ndjson

## Instructions
1. Read the relevant files identified in the context above
2. Implement changes described in the task description
3. Ensure changes are consistent with exploration findings
4. Test changes if applicable

## Output
Write results to: ${sessionFolder}/task-results/${row.id}.json

{
  "status": "completed",
  "findings": "What was done (max 500 chars)",
  "files_modified": ["file1.ts", "file2.ts"],
  "error": ""
}`
}
```

---

## Phase 5: Aggregate

### 5.1 Generate Results

```javascript
const finalTasks = parseCSV(Read(`${sessionFolder}/tasks.csv`))
const exploreCSV = parseCSV(Read(`${sessionFolder}/explore.csv`))

Bash(`cp "${sessionFolder}/tasks.csv" "${sessionFolder}/results.csv"`)

const completed = finalTasks.filter(r => r.status === 'completed')
const failed = finalTasks.filter(r => r.status === 'failed')
const skipped = finalTasks.filter(r => r.status === 'skipped')
const maxWave = Math.max(...finalTasks.map(r => parseInt(r.wave)))
```

### 5.2 Generate context.md

```javascript
const contextMd = `# Wave Plan Results

**Requirement**: ${requirement}
**Session**: ${sessionId}
**Timestamp**: ${getUtc8ISOString()}

## Summary

| Metric | Count |
|--------|-------|
| Explore Angles | ${exploreCSV.length} |
| Total Tasks | ${finalTasks.length} |
| Completed | ${completed.length} |
| Failed | ${failed.length} |
| Skipped | ${skipped.length} |
| Waves | ${maxWave} |

## Exploration Results

${exploreCSV.map(e => `### ${e.id}: ${e.angle} (${e.status})
${e.findings || 'N/A'}
Key files: ${e.key_files || 'none'}`).join('\n\n')}

## Task Results

${finalTasks.map(t => `### ${t.id}: ${t.title} (${t.status})
- Context from: ${t.context_from || 'none'}
- Wave: ${t.wave}
- Findings: ${t.findings || 'N/A'}
- Files: ${t.files_modified || 'none'}
${t.error ? `- Error: ${t.error}` : ''}`).join('\n\n')}

## All Modified Files

${[...new Set(finalTasks.flatMap(t =>
  (t.files_modified || '').split(';')).filter(Boolean)
)].map(f => '- ' + f).join('\n') || 'None'}
`

Write(`${sessionFolder}/context.md`, contextMd)
```

### 5.3 Summary & Next Steps

```javascript
console.log(`
## Wave Plan Complete

Session: ${sessionFolder}
Explore: ${exploreCSV.filter(r => r.status === 'completed').length}/${exploreCSV.length} angles
Tasks: ${completed.length}/${finalTasks.length} completed, ${failed.length} failed, ${skipped.length} skipped
Waves: ${maxWave}

Files:
- explore.csv — exploration state
- tasks.csv — execution state
- results.csv — final results
- context.md — full report
- discoveries.ndjson — shared discoveries
`)

if (!AUTO_YES && failed.length > 0) {
  AskUserQuestion({
    questions: [{
      question: `${failed.length} tasks failed. Next action?`,
      header: "Next Step",
      multiSelect: false,
      options: [
        { label: "Retry Failed", description: "Reset failed + skipped, re-execute Phase 4" },
        { label: "View Report", description: "Display context.md" },
        { label: "Done", description: "Complete session" }
      ]
    }]
  })
  // If Retry: reset failed/skipped status to pending, re-run Phase 4
}
```

---

## Utilities

### Wave Computation (Kahn's BFS)

```javascript
function computeWaves(tasks) {
  const inDegree = {}, adj = {}, depth = {}
  tasks.forEach(t => { inDegree[t.id] = 0; adj[t.id] = []; depth[t.id] = 1 })

  tasks.forEach(t => {
    const deps = (t.deps || '').split(';').filter(Boolean)
    deps.forEach(dep => {
      if (adj[dep]) { adj[dep].push(t.id); inDegree[t.id]++ }
    })
  })

  const queue = Object.keys(inDegree).filter(id => inDegree[id] === 0)
  queue.forEach(id => { depth[id] = 1 })

  while (queue.length > 0) {
    const current = queue.shift()
    adj[current].forEach(next => {
      depth[next] = Math.max(depth[next], depth[current] + 1)
      inDegree[next]--
      if (inDegree[next] === 0) queue.push(next)
    })
  }

  if (Object.values(inDegree).some(d => d > 0)) {
    throw new Error('Circular dependency detected')
  }

  return depth // { taskId: waveNumber }
}
```

### CSV Helpers

```javascript
function escCSV(s) { return String(s || '').replace(/"/g, '""') }

function parseCSV(content) {
  const lines = content.trim().split('\n')
  const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = parseCSVLine(line)
    const row = {}
    header.forEach((col, i) => { row[col] = (values[i] || '').replace(/^"|"$/g, '') })
    return row
  })
}

function writeCSV(path, rows) {
  if (rows.length === 0) return
  // Exclude runtime-only columns (prefixed with _)
  const cols = Object.keys(rows[0]).filter(k => !k.startsWith('_'))
  const header = cols.join(',')
  const lines = rows.map(r =>
    cols.map(c => `"${escCSV(r[c])}"`).join(',')
  )
  Write(path, [header, ...lines].join('\n'))
}

function truncate(s, max) {
  s = String(s || '')
  return s.length > max ? s.substring(0, max - 3) + '...' : s
}
```

---

## Discovery Board Protocol

Shared `discoveries.ndjson` — append-only NDJSON accessible to all agents across all phases.

```jsonl
{"ts":"...","worker":"E1","type":"code_pattern","data":{"name":"repo-pattern","file":"src/repos/Base.ts"}}
{"ts":"...","worker":"T2","type":"integration_point","data":{"file":"src/auth/index.ts","exports":["auth"]}}
```

**Types**: `code_pattern`, `integration_point`, `convention`, `blocker`, `tech_stack`
**Rules**: Read first → write immediately → deduplicate → append-only

---

## Error Handling

| Error | Resolution |
|-------|------------|
| Explore agent failure | Mark as failed in explore.csv, exclude from planning |
| Execute agent failure | Mark as failed, skip dependents (cascade) |
| Circular dependency | Abort wave computation, report cycle |
| All explores failed | Fallback: plan directly from requirement |
| CSV parse error | Re-validate format |
| discoveries.ndjson corrupt | Ignore malformed lines |

---

## Core Rules

1. **Wave Order is Sacred**: Never execute wave N before wave N-1 completes
2. **CSV is Source of Truth**: Read master CSV before each wave, write after
3. **Context via CSV**: prev_context built from CSV findings, not from memory
4. **E* ↔ T* Linking**: tasks.csv `context_from` references explore.csv rows for cross-phase context
5. **Skip on Failure**: Failed dep → skip dependent (cascade)
6. **Discovery Board Append-Only**: Never clear or modify discoveries.ndjson
7. **Explore Before Execute**: Phase 2 completes before Phase 4 starts
8. **DO NOT STOP**: Continuous execution until all waves complete or remaining skipped
