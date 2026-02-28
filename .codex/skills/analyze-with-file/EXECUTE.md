# Analyze Task Generation & Execution Spec

> **Purpose**: Quality standards for task generation + execution specification for Phase 5 of `analyze-with-file`.
> **Consumer**: Phase 5 of `analyze-with-file` workflow.
> **Scope**: Task generation quality + direct inline execution.

---

## Task Generation Flow

> **Entry point**: Routed here from SKILL.md Phase 5 when complexity is `complex` (≥3 recommendations or high-priority with dependencies).

```
Step 1: Load context → Step 2: Generate .task/*.json → Step 3: Pre-execution analysis
    → Step 4: User confirmation → Step 5: Serial execution → Step 6: Finalize
```

**Input artifacts** (all from session folder):

| Artifact | Required | Provides |
|----------|----------|----------|
| `conclusions.json` | Yes | `recommendations[]` with action, rationale, priority, evidence_refs |
| `exploration-codebase.json` | No | `relevant_files[]`, `patterns[]`, `constraints[]`, `integration_points[]` — primary source for file resolution |
| `explorations.json` | No | `sources[]`, `key_findings[]` — fallback for file resolution |
| `perspectives.json` | No | Multi-perspective findings — alternative to explorations.json |

---

## File Resolution Algorithm

Target files are resolved with a 3-priority fallback chain. Recommendations carry only `evidence_refs` — file resolution is EXECUTE.md's responsibility:

```javascript
function resolveTargetFiles(rec, codebaseContext, explorations) {
  // Priority 1: Extract file paths from evidence_refs (e.g., "src/auth/token.ts:89")
  if (rec.evidence_refs?.length) {
    const filePaths = [...new Set(
      rec.evidence_refs
        .filter(ref => ref.includes('/') || ref.includes('.'))
        .map(ref => ref.split(':')[0])
    )]
    if (filePaths.length) {
      return filePaths.map(path => ({
        path,
        action: 'modify',
        target: null,
        changes: []
      }))
    }
  }

  // Priority 2: Match from exploration-codebase.json relevant_files
  if (codebaseContext?.relevant_files?.length) {
    const keywords = extractKeywords(rec.action + ' ' + rec.rationale)
    const matched = codebaseContext.relevant_files.filter(f =>
      keywords.some(kw =>
        f.path.toLowerCase().includes(kw) ||
        f.summary?.toLowerCase().includes(kw) ||
        f.relevance?.toLowerCase().includes(kw)
      )
    )
    if (matched.length) {
      return matched.map(f => ({
        path: f.path,
        action: 'modify',
        target: null,
        changes: rec.changes || []
      }))
    }
  }

  // Priority 3: Match from explorations.json sources
  if (explorations?.sources?.length) {
    const actionVerb = rec.action.split(' ')[0].toLowerCase()
    const matched = explorations.sources.filter(s =>
      s.summary?.toLowerCase().includes(actionVerb) ||
      s.file?.includes(actionVerb)
    )
    if (matched.length) {
      return matched.map(s => ({
        path: s.file,
        action: 'modify',
        target: null,
        changes: []
      }))
    }
  }

  // Fallback: empty array — task relies on description + implementation for guidance
  return []
}

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !['the', 'and', 'for', 'with', 'from', 'that', 'this'].includes(w))
}
```

---

## Task Type Inference

| Recommendation Pattern | Inferred Type |
|------------------------|---------------|
| fix, resolve, repair, patch, correct | `fix` |
| refactor, restructure, extract, reorganize, decouple | `refactor` |
| add, implement, create, build, introduce | `feature` |
| improve, optimize, enhance, upgrade, streamline | `enhancement` |
| test, coverage, validate, verify, assert | `testing` |

```javascript
function inferTaskType(rec) {
  const text = (rec.action + ' ' + rec.rationale).toLowerCase()
  const patterns = [
    { type: 'fix',         keywords: ['fix', 'resolve', 'repair', 'patch', 'correct', 'bug'] },
    { type: 'refactor',    keywords: ['refactor', 'restructure', 'extract', 'reorganize', 'decouple'] },
    { type: 'feature',     keywords: ['add', 'implement', 'create', 'build', 'introduce'] },
    { type: 'enhancement', keywords: ['improve', 'optimize', 'enhance', 'upgrade', 'streamline'] },
    { type: 'testing',     keywords: ['test', 'coverage', 'validate', 'verify', 'assert'] }
  ]
  for (const p of patterns) {
    if (p.keywords.some(kw => text.includes(kw))) return p.type
  }
  return 'enhancement'  // safe default
}
```

## Effort Inference

| Signal | Effort |
|--------|--------|
| priority=high AND files >= 3 | `large` |
| priority=high OR files=2 | `medium` |
| priority=medium AND files <= 1 | `medium` |
| priority=low OR single file | `small` |

```javascript
function inferEffort(rec, targetFiles) {
  const fileCount = targetFiles?.length || 0
  if (rec.priority === 'high' && fileCount >= 3) return 'large'
  if (rec.priority === 'high' || fileCount >= 2) return 'medium'
  if (rec.priority === 'low' || fileCount <= 1) return 'small'
  return 'medium'
}
```

---

## Convergence Quality Validation

Every task's `convergence` MUST pass quality gates before writing to disk.

### Quality Rules

| Field | Requirement | Validation |
|-------|-------------|------------|
| `criteria[]` | **Testable** — assertions or concrete manual steps | Reject vague patterns; each criterion must reference observable behavior |
| `verification` | **Executable** — shell command or explicit step sequence | Must contain a runnable command or step-by-step verification procedure |
| `definition_of_done` | **Business language** — non-technical stakeholder can judge | Must NOT contain technical commands (jest, tsc, npm, build) |

### Vague Pattern Detection

```javascript
const VAGUE_PATTERNS = /正常|正确|好|可以|没问题|works|fine|good|correct|properly|as expected/i
const TECHNICAL_IN_DOD = /compile|build|lint|npm|npx|jest|tsc|eslint|cargo|pytest|go test/i

function validateConvergenceQuality(tasks) {
  const issues = []
  tasks.forEach(task => {
    // Rule 1: No vague criteria
    task.convergence.criteria.forEach((c, i) => {
      if (VAGUE_PATTERNS.test(c) && c.length < 20) {
        issues.push({
          task: task.id, field: `criteria[${i}]`,
          problem: 'Vague criterion', value: c,
          fix: 'Replace with specific observable condition from evidence'
        })
      }
    })

    // Rule 2: Verification should be executable
    if (task.convergence.verification && task.convergence.verification.length < 5) {
      issues.push({
        task: task.id, field: 'verification',
        problem: 'Too short to be executable', value: task.convergence.verification,
        fix: 'Provide shell command or numbered step sequence'
      })
    }

    // Rule 3: DoD should be business language
    if (TECHNICAL_IN_DOD.test(task.convergence.definition_of_done)) {
      issues.push({
        task: task.id, field: 'definition_of_done',
        problem: 'Contains technical commands', value: task.convergence.definition_of_done,
        fix: 'Rewrite in business language describing user/system outcome'
      })
    }

    // Rule 4: files[].changes should not be empty when files exist
    task.files?.forEach((f, i) => {
      if (f.action === 'modify' && (!f.changes || f.changes.length === 0) && !f.change) {
        issues.push({
          task: task.id, field: `files[${i}].changes`,
          problem: 'No change description for modify action', value: f.path,
          fix: 'Describe what specifically changes in this file'
        })
      }
    })

    // Rule 5: implementation steps should exist
    if (!task.implementation || task.implementation.length === 0) {
      issues.push({
        task: task.id, field: 'implementation',
        problem: 'No implementation steps',
        fix: 'Add at least one step describing how to realize this task'
      })
    }
  })

  // Auto-fix where possible, log remaining issues
  issues.forEach(issue => {
    // Attempt auto-fix based on available evidence
    // If unfixable, log warning — task still generated but flagged
  })
  return issues
}
```

### Good vs Bad Examples

**Criteria**:

| Bad | Good |
|-----|------|
| `"Code works correctly"` | `"refreshToken() returns a new JWT with >0 expiry when called with expired token"` |
| `"No errors"` | `"Error handler at auth.ts:45 returns 401 status with { error: 'token_expired' } body"` |
| `"Performance is good"` | `"API response time < 200ms at p95 for /api/users endpoint under 100 concurrent requests"` |

**Verification**:

| Bad | Good |
|-----|------|
| `"Check it"` | `"jest --testPathPattern=auth.test.ts && npx tsc --noEmit"` |
| `"Run tests"` | `"1. Run npm test -- --grep 'token refresh' 2. Verify no TypeScript errors with npx tsc --noEmit"` |

**Definition of Done**:

| Bad | Good |
|-----|------|
| `"jest passes"` | `"Users remain logged in across token expiration without manual re-login"` |
| `"No TypeScript errors"` | `"Authentication flow handles all user-facing error scenarios with clear error messages"` |

---

## Required Task Fields (analyze-with-file producer)

SKILL.md produces minimal recommendations `{action, rationale, priority, evidence_refs}`. EXECUTE.md enriches these into full task JSON. The final `.task/*.json` MUST populate:

| Block | Fields | Required |
|-------|--------|----------|
| IDENTITY | `id`, `title`, `description` | Yes |
| CLASSIFICATION | `type`, `priority`, `effort` | Yes |
| DEPENDENCIES | `depends_on` | Yes (empty array if none) |
| CONVERGENCE | `convergence.criteria[]`, `convergence.verification`, `convergence.definition_of_done` | Yes |
| FILES | `files[].path`, `files[].action`, `files[].changes`/`files[].change` | Yes (if files identified) |
| IMPLEMENTATION | `implementation[]` with step + description | Yes |
| CONTEXT | `evidence`, `source.tool`, `source.session_id`, `source.original_id` | Yes |

### Task JSON Example

```json
{
  "id": "TASK-001",
  "title": "Fix authentication token refresh",
  "description": "Token refresh fails silently when JWT expires, causing users to be logged out unexpectedly",
  "type": "fix",
  "priority": "high",
  "effort": "medium",
  "files": [
    {
      "path": "src/auth/token.ts",
      "action": "modify",
      "target": "refreshToken",
      "changes": [
        "Add await to refreshToken() call at line 89",
        "Add error propagation for refresh failure"
      ],
      "change": "Add await to refreshToken() call and propagate errors"
    },
    {
      "path": "src/middleware/auth.ts",
      "action": "modify",
      "target": "authMiddleware",
      "changes": [
        "Update error handler at line 45 to distinguish refresh failures from auth failures"
      ],
      "change": "Update error handler to propagate refresh failures"
    }
  ],
  "depends_on": [],
  "convergence": {
    "criteria": [
      "refreshToken() returns new valid JWT when called with expired token",
      "Expired token triggers automatic refresh without user action",
      "Failed refresh returns 401 with { error: 'token_expired' } body"
    ],
    "verification": "jest --testPathPattern=token.test.ts && npx tsc --noEmit",
    "definition_of_done": "Users remain logged in across token expiration without manual re-login"
  },
  "implementation": [
    {
      "step": "1",
      "description": "Add await to refreshToken() call in token.ts",
      "actions": ["Read token.ts", "Add await keyword at line 89", "Verify async chain"]
    },
    {
      "step": "2",
      "description": "Update error handler in auth middleware",
      "actions": ["Read auth.ts", "Modify error handler at line 45", "Add refresh-specific error type"]
    }
  ],
  "evidence": ["src/auth/token.ts:89", "src/middleware/auth.ts:45"],
  "source": {
    "tool": "analyze-with-file",
    "session_id": "ANL-auth-token-refresh-2025-01-21",
    "original_id": "TASK-001"
  }
}
```

---

## Step 1: Load All Context Sources

Phase 2-4 already loaded and processed these artifacts. If data is still in conversation memory, skip disk reads.

```javascript
// Skip loading if already in memory from Phase 2-4
// Only read from disk when entering EXECUTE.md from a fresh/resumed session

if (!conclusions) {
  conclusions = JSON.parse(Read(`${sessionFolder}/conclusions.json`))
}

if (!codebaseContext) {
  codebaseContext = file_exists(`${sessionFolder}/exploration-codebase.json`)
    ? JSON.parse(Read(`${sessionFolder}/exploration-codebase.json`))
    : null
}

if (!explorations) {
  explorations = file_exists(`${sessionFolder}/explorations.json`)
    ? JSON.parse(Read(`${sessionFolder}/explorations.json`))
    : file_exists(`${sessionFolder}/perspectives.json`)
      ? JSON.parse(Read(`${sessionFolder}/perspectives.json`))
      : null
}
```

## Step 2: Enrich Recommendations & Generate .task/*.json

SKILL.md Phase 4 produces minimal recommendations: `{action, rationale, priority, evidence_refs}`.
This step enriches each recommendation with execution-specific details using codebase context, then generates individual task JSON files.

**Enrichment pipeline**: `rec (minimal) + codebaseContext + explorations → task JSON (full)`

```javascript
const tasks = conclusions.recommendations.map((rec, index) => {
  const taskId = `TASK-${String(index + 1).padStart(3, '0')}`

  // 1. ENRICH: Resolve target files from codebase context (not from rec)
  const targetFiles = resolveTargetFiles(rec, codebaseContext, explorations)

  // 2. ENRICH: Generate implementation steps from action + context
  const implSteps = generateImplementationSteps(rec, targetFiles, codebaseContext)

  // 3. ENRICH: Derive change descriptions per file
  const enrichedFiles = targetFiles.map(f => ({
    path: f.path,
    action: f.action || 'modify',
    target: f.target || null,
    changes: deriveChanges(rec, f, codebaseContext) || [],
    change: rec.action
  }))

  return {
    id: taskId,
    title: rec.action,
    description: rec.rationale,
    type: inferTaskType(rec),
    priority: rec.priority,
    effort: inferEffort(rec, targetFiles),

    files: enrichedFiles,
    depends_on: [],

    // CONVERGENCE (must pass quality validation)
    convergence: {
      criteria: generateCriteria(rec),
      verification: generateVerification(rec),
      definition_of_done: generateDoD(rec)
    },

    // IMPLEMENTATION steps (generated here, not from SKILL.md)
    implementation: implSteps,

    // CONTEXT
    evidence: rec.evidence_refs || [],
    source: {
      tool: 'analyze-with-file',
      session_id: sessionId,
      original_id: taskId
    }
  }
})

// Quality validation
validateConvergenceQuality(tasks)

// Write each task as individual JSON file
Bash(`mkdir -p ${sessionFolder}/.task`)
tasks.forEach(task => {
  Write(`${sessionFolder}/.task/${task.id}.json`, JSON.stringify(task, null, 2))
})
```

**Enrichment Functions**:

```javascript
// Generate implementation steps from action + resolved files
function generateImplementationSteps(rec, targetFiles, codebaseContext) {
  // 1. Parse rec.action into atomic steps
  // 2. Map steps to target files
  // 3. Add context from codebaseContext.patterns if applicable
  // Return: [{step: '1', description: '...', actions: [...]}]
  return [{
    step: '1',
    description: rec.action,
    actions: targetFiles.map(f => `Modify ${f.path}`)
  }]
}

// Derive specific change descriptions for a file
function deriveChanges(rec, file, codebaseContext) {
  // 1. Match rec.action keywords to file content patterns
  // 2. Use codebaseContext.patterns for context-aware change descriptions
  // 3. Use rec.evidence_refs to locate specific modification points
  // Return: ['specific change 1', 'specific change 2']
  return [rec.action]
}
```

## Step 3-6: Execution Steps

After `.task/*.json` generation, validate and execute tasks directly inline.

### Step 3: Pre-Execution Analysis

```javascript
const taskFiles = Glob(`${sessionFolder}/.task/*.json`)
const tasks = taskFiles.map(f => JSON.parse(Read(f)))

// 1. Dependency validation
const taskIds = new Set(tasks.map(t => t.id))
const errors = []
tasks.forEach(task => {
  task.depends_on.forEach(dep => {
    if (!taskIds.has(dep)) errors.push(`${task.id}: depends on unknown task ${dep}`)
  })
})

// 2. Circular dependency detection (DFS)
function detectCycles(tasks) {
  const graph = new Map(tasks.map(t => [t.id, t.depends_on]))
  const visited = new Set(), inStack = new Set(), cycles = []
  function dfs(node, path) {
    if (inStack.has(node)) { cycles.push([...path, node].join(' → ')); return }
    if (visited.has(node)) return
    visited.add(node); inStack.add(node)
    ;(graph.get(node) || []).forEach(dep => dfs(dep, [...path, node]))
    inStack.delete(node)
  }
  tasks.forEach(t => { if (!visited.has(t.id)) dfs(t.id, []) })
  return cycles
}

// 3. Topological sort for execution order
function topoSort(tasks) {
  const inDegree = new Map(tasks.map(t => [t.id, 0]))
  tasks.forEach(t => t.depends_on.forEach(dep => {
    inDegree.set(t.id, inDegree.get(t.id) + 1)
  }))
  const queue = tasks.filter(t => inDegree.get(t.id) === 0).map(t => t.id)
  const order = []
  while (queue.length) {
    const id = queue.shift()
    order.push(id)
    tasks.forEach(t => {
      if (t.depends_on.includes(id)) {
        inDegree.set(t.id, inDegree.get(t.id) - 1)
        if (inDegree.get(t.id) === 0) queue.push(t.id)
      }
    })
  }
  return order
}

// 4. File conflict detection
const fileTaskMap = new Map()
tasks.forEach(task => {
  (task.files || []).forEach(f => {
    if (!fileTaskMap.has(f.path)) fileTaskMap.set(f.path, [])
    fileTaskMap.get(f.path).push(task.id)
  })
})
const conflicts = []
fileTaskMap.forEach((taskIds, file) => {
  if (taskIds.length > 1) conflicts.push({ file, tasks: taskIds })
})
```

### Step 4: Initialize Execution Artifacts

```javascript
// execution.md — overview with task table
const executionMd = `# Execution Overview

## Session Info
- **Session ID**: ${sessionId}
- **Plan Source**: .task/*.json (from analysis conclusions)
- **Started**: ${getUtc8ISOString()}
- **Total Tasks**: ${tasks.length}

## Task Overview

| # | ID | Title | Type | Priority | Status |
|---|-----|-------|------|----------|--------|
${tasks.map((t, i) => `| ${i+1} | ${t.id} | ${t.title} | ${t.type} | ${t.priority} | pending |`).join('\n')}

## Pre-Execution Analysis
${conflicts.length
  ? `### File Conflicts\n${conflicts.map(c => `- **${c.file}**: ${c.tasks.join(', ')}`).join('\n')}`
  : 'No file conflicts detected.'}

## Execution Timeline
> Updated as tasks complete
`
Write(`${sessionFolder}/execution.md`, executionMd)

// execution-events.md — chronological event log
Write(`${sessionFolder}/execution-events.md`,
  `# Execution Events\n\n**Session**: ${sessionId}\n**Started**: ${getUtc8ISOString()}\n\n---\n\n`)
```

### Step 5: Task Execution Loop

**User Confirmation** before execution:

```javascript
if (!autoYes) {
  const action = AskUserQuestion({
    questions: [{
      question: `Execute ${tasks.length} tasks?\n${tasks.map(t => `  ${t.id}: ${t.title} (${t.priority})`).join('\n')}`,
      header: "Confirm",
      multiSelect: false,
      options: [
        { label: "Start", description: "Execute all tasks serially" },
        { label: "Adjust", description: "Modify .task/*.json before execution" },
        { label: "Skip", description: "Keep .task/*.json, skip execution" }
      ]
    }]
  })
  // "Adjust": user edits task files, then resumes
  // "Skip": end — user can execute later separately
}
```

Execute tasks serially using `task.implementation` steps and `task.files[].changes` as guidance.

```
For each taskId in executionOrder:
  ├─ Load task from .task/{taskId}.json
  ├─ Check dependencies satisfied
  ├─ Record START event → execution-events.md
  ├─ Execute using task.implementation + task.files[].changes:
  │   ├─ Read target files listed in task.files[]
  │   ├─ Apply modifications described in files[].changes / files[].change
  │   ├─ Follow implementation[].actions sequence
  │   └─ Use Edit (preferred), Write (new files), Bash (build/test)
  ├─ Verify convergence:
  │   ├─ Check each convergence.criteria[] item
  │   ├─ Run convergence.verification (if executable command)
  │   └─ Record verification results
  ├─ Record COMPLETE/FAIL event → execution-events.md
  ├─ Update execution.md task status
  └─ Continue to next task
```

**Execution Guidance Priority** — what the AI follows when executing each task:

| Priority | Source | Example |
|----------|--------|---------|
| 1 | `files[].changes` / `files[].change` | "Add await to refreshToken() call at line 89" |
| 2 | `implementation[].actions` | ["Read token.ts", "Add await keyword at line 89"] |
| 3 | `implementation[].description` | "Add await to refreshToken() call in token.ts" |
| 4 | `task.description` | "Token refresh fails silently..." |

When `files[].changes` is populated, the AI has concrete instructions. When empty, it falls back to `implementation` steps, then to `description`.

### Step 5.1: Failure Handling

```javascript
// On task failure, ask user how to proceed
if (!autoYes) {
  AskUserQuestion({
    questions: [{
      question: `Task ${task.id} failed: ${errorMessage}\nHow to proceed?`,
      header: "Failure",
      multiSelect: false,
      options: [
        { label: "Skip & Continue", description: "Skip this task, continue with next" },
        { label: "Retry", description: "Retry this task" },
        { label: "Abort", description: "Stop execution, keep progress" }
      ]
    }]
  })
}
```

### Step 6: Finalize

After all tasks complete:

1. Append execution summary to `execution.md` (statistics, task results table)
2. Append session footer to `execution-events.md`
3. Write back `_execution` state to each `.task/*.json`:

```javascript
tasks.forEach(task => {
  const updated = {
    ...task,
    status: task._status,           // "completed" | "failed" | "skipped"
    executed_at: task._executed_at,
    result: {
      success: task._status === 'completed',
      files_modified: task._result?.files_modified || [],
      summary: task._result?.summary || '',
      error: task._result?.error || null,
      convergence_verified: task._result?.convergence_verified || []
    }
  }
  Write(`${sessionFolder}/.task/${task.id}.json`, JSON.stringify(updated, null, 2))
})
```

### Step 6.1: Post-Execution Options

```javascript
if (!autoYes) {
  AskUserQuestion({
    questions: [{
      question: `Execution complete: ${completedTasks.size}/${tasks.length} succeeded. Next:`,
      header: "Post-Execute",
      multiSelect: false,
      options: [
        { label: "Retry Failed", description: `Re-execute ${failedTasks.size} failed tasks` },
        { label: "View Events", description: "Display execution-events.md" },
        { label: "Create Issue", description: "Create issue from failed tasks" },
        { label: "Done", description: "End workflow" }
      ]
    }]
  })
}
```

---

## Output Structure

```
{sessionFolder}/
├── .task/                     # Individual task JSON files (with _execution state after completion)
│   ├── TASK-001.json
│   └── ...
├── execution.md               # Execution overview + task table + summary
└── execution-events.md        # Chronological event log
```

## execution-events.md Event Format

```markdown
## {timestamp} — {task.id}: {task.title}

**Type**: {task.type} | **Priority**: {task.priority}
**Status**: IN PROGRESS
**Files**: {task.files[].path}

### Execution Log
- Read {file} ({lines} lines)
- Applied: {change description}
- ...

**Status**: COMPLETED / FAILED
**Files Modified**: {list}

#### Convergence Verification
- [x/] {criterion 1}
- [x/] {criterion 2}
- **Verification**: {command} → PASS/FAIL

---
```
