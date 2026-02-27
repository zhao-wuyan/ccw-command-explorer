# Action: INIT

Initialize CCW Loop session, create directory structure and initial state.

## Purpose

- Create session directory structure
- Initialize state file with skill_state
- Analyze task description to generate development tasks
- Prepare execution environment

## Preconditions

- [ ] state.status === 'running'
- [ ] state.skill_state === null

## Execution Steps

### Step 1: Verify Control Signals

```javascript
const state = JSON.parse(Read(`.workflow/.loop/${loopId}.json`))

if (state.status !== 'running') {
  return {
    action: 'INIT',
    status: 'failed',
    message: `Cannot init: status is ${state.status}`,
    next_action: state.status === 'paused' ? 'PAUSED' : 'STOPPED'
  }
}
```

### Step 2: Create Directory Structure

```javascript
const progressDir = `.workflow/.loop/${loopId}.progress`

// Directories created by orchestrator, verify they exist
// mkdir -p ${progressDir}
```

### Step 3: Analyze Task and Generate Tasks

```javascript
// Analyze task description
const taskDescription = state.description

// Generate 3-7 development tasks based on analysis
// Use ACE search or smart_search to find relevant patterns

const tasks = [
  {
    id: 'task-001',
    description: 'Task description based on analysis',
    tool: 'gemini',
    mode: 'write',
    status: 'pending',
    priority: 1,
    files: [],
    created_at: getUtc8ISOString(),
    completed_at: null
  }
  // ... more tasks
]
```

### Step 4: Initialize Progress Document

```javascript
const progressPath = `${progressDir}/develop.md`

const progressInitial = `# Development Progress

**Loop ID**: ${loopId}
**Task**: ${taskDescription}
**Started**: ${getUtc8ISOString()}

---

## Task List

${tasks.map((t, i) => `${i + 1}. [ ] ${t.description}`).join('\n')}

---

## Progress Timeline

`

Write(progressPath, progressInitial)
```

### Step 5: Update State

```javascript
const skillState = {
  current_action: 'init',
  last_action: null,
  completed_actions: [],
  mode: mode,

  develop: {
    total: tasks.length,
    completed: 0,
    current_task: null,
    tasks: tasks,
    last_progress_at: null
  },

  debug: {
    active_bug: null,
    hypotheses_count: 0,
    hypotheses: [],
    confirmed_hypothesis: null,
    iteration: 0,
    last_analysis_at: null
  },

  validate: {
    pass_rate: 0,
    coverage: 0,
    test_results: [],
    passed: false,
    failed_tests: [],
    last_run_at: null
  },

  errors: []
}

state.skill_state = skillState
state.updated_at = getUtc8ISOString()
Write(`.workflow/.loop/${loopId}.json`, JSON.stringify(state, null, 2))
```

## Output Format

```
ACTION_RESULT:
- action: INIT
- status: success
- message: Session initialized with {N} development tasks

FILES_UPDATED:
- .workflow/.loop/{loopId}.json: skill_state initialized
- .workflow/.loop/{loopId}.progress/develop.md: Progress document created

NEXT_ACTION_NEEDED: {DEVELOP (auto) | MENU (interactive)}
```

## Error Handling

| Error Type | Recovery |
|------------|----------|
| Directory creation failed | Report error, stop |
| Task analysis failed | Create single generic task |
| State write failed | Retry once, then stop |

## Next Actions

- Success (auto mode): `DEVELOP`
- Success (interactive): `MENU`
- Failed: Report error
