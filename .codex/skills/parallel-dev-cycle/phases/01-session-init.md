# Phase 1: Session Initialization

Create or resume a development cycle, initialize state file and directory structure.

## Objective

- Parse user arguments (TASK, --cycle-id, --extend, --auto, --parallel)
- Create new cycle with unique ID OR resume existing cycle
- Initialize directory structure for all agents
- Create master state file
- Output: cycleId, state, progressDir

## Execution

### Step 1.1: Parse Arguments & Load Prep Package

```javascript
const { cycleId: existingCycleId, task, mode = 'interactive', extension } = options

// Validate mutual exclusivity
if (!existingCycleId && !task) {
  console.error('Either --cycle-id or task description is required')
  return { status: 'error', message: 'Missing cycleId or task' }
}

// ── Prep Package: Detect → Validate → Consume ──
let prepPackage = null
const prepPath = `${projectRoot}/.workflow/.cycle/prep-package.json`

if (fs.existsSync(prepPath)) {
  const raw = JSON.parse(Read(prepPath))
  const checks = validatePrepPackage(raw, projectRoot)

  if (checks.valid) {
    prepPackage = raw
    task = prepPackage.task.refined
    console.log(`✓ Prep package loaded: score=${prepPackage.task.quality_score}/10, auto=${prepPackage.auto_iteration.enabled}`)
    console.log(`  Checks passed: ${checks.passed.join(', ')}`)
  } else {
    console.warn(`⚠ Prep package found but failed validation:`)
    checks.failures.forEach(f => console.warn(`  ✗ ${f}`))
    console.warn(`  → Falling back to default behavior (prep-package ignored)`)
    prepPackage = null
  }
}

/**
 * Validate prep-package.json integrity before consumption.
 * Returns { valid: bool, passed: string[], failures: string[] }
 */
function validatePrepPackage(prep, projectRoot) {
  const passed = []
  const failures = []

  // Check 1: prep_status must be "ready"
  if (prep.prep_status === 'ready') {
    passed.push('status=ready')
  } else {
    failures.push(`prep_status is "${prep.prep_status}", expected "ready"`)
  }

  // Check 2: project_root must match current project
  if (prep.environment?.project_root === projectRoot) {
    passed.push('project_root match')
  } else {
    failures.push(`project_root mismatch: prep="${prep.environment?.project_root}", current="${projectRoot}"`)
  }

  // Check 3: quality_score must be >= 6
  if ((prep.task?.quality_score || 0) >= 6) {
    passed.push(`quality=${prep.task.quality_score}/10`)
  } else {
    failures.push(`quality_score ${prep.task?.quality_score || 0} < 6 minimum`)
  }

  // Check 4: generated_at must be within 24 hours
  const generatedAt = new Date(prep.generated_at)
  const hoursSince = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60)
  if (hoursSince <= 24) {
    passed.push(`age=${Math.round(hoursSince)}h`)
  } else {
    failures.push(`prep-package is ${Math.round(hoursSince)}h old (max 24h), may be stale`)
  }

  // Check 5: required fields exist
  const requiredFields = [
    'task.refined',
    'auto_iteration.convergence.test_pass_rate',
    'auto_iteration.convergence.coverage',
    'auto_iteration.phase_gates.zero_to_one',
    'auto_iteration.phase_gates.one_to_hundred',
    'auto_iteration.agent_focus.zero_to_one',
    'auto_iteration.agent_focus.one_to_hundred'
  ]
  const missing = requiredFields.filter(path => {
    const val = path.split('.').reduce((obj, key) => obj?.[key], prep)
    return val === undefined || val === null
  })
  if (missing.length === 0) {
    passed.push('fields complete')
  } else {
    failures.push(`missing fields: ${missing.join(', ')}`)
  }

  // Check 6: convergence values are valid numbers
  const conv = prep.auto_iteration?.convergence
  if (conv && typeof conv.test_pass_rate === 'number' && typeof conv.coverage === 'number'
      && conv.test_pass_rate > 0 && conv.test_pass_rate <= 100
      && conv.coverage > 0 && conv.coverage <= 100) {
    passed.push(`convergence valid (test≥${conv.test_pass_rate}%, cov≥${conv.coverage}%)`)
  } else {
    failures.push(`convergence values invalid: test_pass_rate=${conv?.test_pass_rate}, coverage=${conv?.coverage}`)
  }

  return {
    valid: failures.length === 0,
    passed,
    failures
  }
}
```

### Step 1.2: Utility Functions

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

function readCycleState(cycleId) {
  const stateFile = `${projectRoot}/.workflow/.cycle/${cycleId}.json`
  if (!fs.existsSync(stateFile)) {
    return null
  }
  return JSON.parse(Read(stateFile))
}
```

### Step 1.3: New Cycle Creation

When `TASK` is provided (no `--cycle-id`):

```javascript
// Generate unique cycle ID
const timestamp = getUtc8ISOString().replace(/[-:]/g, '').split('.')[0]
const random = Math.random().toString(36).substring(2, 10)
const cycleId = `cycle-v1-${timestamp}-${random}`

console.log(`Creating new cycle: ${cycleId}`)
```

#### Create Directory Structure

```bash
mkdir -p ${projectRoot}/.workflow/.cycle/${cycleId}.progress/{ra,ep,cd,vas,coordination}
mkdir -p ${projectRoot}/.workflow/.cycle/${cycleId}.progress/ra/history
mkdir -p ${projectRoot}/.workflow/.cycle/${cycleId}.progress/ep/history
mkdir -p ${projectRoot}/.workflow/.cycle/${cycleId}.progress/cd/history
mkdir -p ${projectRoot}/.workflow/.cycle/${cycleId}.progress/vas/history
```

#### Initialize State File

```javascript
function createCycleState(cycleId, taskDescription) {
  const stateFile = `${projectRoot}/.workflow/.cycle/${cycleId}.json`
  const now = getUtc8ISOString()

  const state = {
    // Metadata
    cycle_id: cycleId,
    title: taskDescription.substring(0, 100),
    description: taskDescription,
    max_iterations: prepPackage?.auto_iteration?.max_iterations || 5,
    status: 'running',
    created_at: now,
    updated_at: now,

    // Agent tracking
    agents: {
      ra: { status: 'idle', output_files: [] },
      ep: { status: 'idle', output_files: [] },
      cd: { status: 'idle', output_files: [] },
      vas: { status: 'idle', output_files: [] }
    },

    // Phase tracking
    current_phase: 'init',
    completed_phases: [],
    current_iteration: 0,

    // Shared context (populated by agents)
    requirements: null,
    exploration: null,
    plan: null,
    changes: [],
    test_results: null,

    // Prep package integration (from /prompts:prep-cycle)
    convergence: prepPackage?.auto_iteration?.convergence || null,
    phase_gates: prepPackage?.auto_iteration?.phase_gates || null,
    agent_focus: prepPackage?.auto_iteration?.agent_focus || null,
    source_refs: prepPackage?.task?.source_refs || null
  }

  Write(stateFile, JSON.stringify(state, null, 2))
  return state
}
```

### Step 1.4: Resume Existing Cycle

When `--cycle-id` is provided:

```javascript
const cycleId = existingCycleId
const state = readCycleState(cycleId)

if (!state) {
  console.error(`Cycle not found: ${cycleId}`)
  return { status: 'error', message: 'Cycle not found' }
}

console.log(`Resuming cycle: ${cycleId}`)

// Apply extension if provided
if (extension) {
  console.log(`Extension: ${extension}`)
  state.description += `\n\n--- ITERATION ${state.current_iteration + 1} ---\n${extension}`
}
```

### Step 1.5: Control Signal Check

Before proceeding, verify cycle status allows continuation:

```javascript
function checkControlSignals(cycleId) {
  const state = readCycleState(cycleId)

  switch (state?.status) {
    case 'paused':
      return { continue: false, action: 'pause_exit' }
    case 'failed':
      return { continue: false, action: 'stop_exit' }
    case 'running':
      return { continue: true, action: 'continue' }
    default:
      return { continue: false, action: 'stop_exit' }
  }
}
```

## Output

- **Variable**: `cycleId` - Unique cycle identifier
- **Variable**: `state` - Initialized or resumed cycle state object
- **Variable**: `progressDir` - `${projectRoot}/.workflow/.cycle/${cycleId}.progress`
- **TodoWrite**: Mark Phase 1 completed, Phase 2 in_progress

## Next Phase

Return to main flow, then auto-continue to [Phase 2: Agent Execution](02-agent-execution.md).
