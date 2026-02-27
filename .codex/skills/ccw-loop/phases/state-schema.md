# State Schema (Codex Version)

CCW Loop state structure definition for Codex subagent pattern.

## State File

**Location**: `.workflow/.loop/{loopId}.json` (unified location, API + Skill shared)

## Structure Definition

### Unified Loop State Interface

```typescript
/**
 * Unified Loop State - API and Skill shared state structure
 * API (loop-v2-routes.ts) owns state control
 * Skill (ccw-loop) reads and updates this state via subagent
 */
interface LoopState {
  // =====================================================
  // API FIELDS (from loop-v2-routes.ts)
  // These fields are managed by API, Skill read-only
  // =====================================================

  loop_id: string                // Loop ID, e.g., "loop-v2-20260122-abc123"
  title: string                  // Loop title
  description: string            // Loop description
  max_iterations: number         // Maximum iteration count
  status: 'created' | 'running' | 'paused' | 'completed' | 'failed' | 'user_exit'
  current_iteration: number      // Current iteration count
  created_at: string             // Creation time (ISO8601)
  updated_at: string             // Last update time (ISO8601)
  completed_at?: string          // Completion time (ISO8601)
  failure_reason?: string        // Failure reason

  // =====================================================
  // SKILL EXTENSION FIELDS
  // These fields are managed by Skill executor agent
  // =====================================================

  skill_state?: {
    // Current execution action
    current_action: 'init' | 'develop' | 'debug' | 'validate' | 'complete' | null
    last_action: string | null
    completed_actions: string[]
    mode: 'interactive' | 'auto'

    // === Development Phase ===
    develop: {
      total: number
      completed: number
      current_task?: string
      tasks: DevelopTask[]
      last_progress_at: string | null
    }

    // === Debug Phase ===
    debug: {
      active_bug?: string
      hypotheses_count: number
      hypotheses: Hypothesis[]
      confirmed_hypothesis: string | null
      iteration: number
      last_analysis_at: string | null
    }

    // === Validation Phase ===
    validate: {
      pass_rate: number           // Test pass rate (0-100)
      coverage: number            // Coverage (0-100)
      test_results: TestResult[]
      passed: boolean
      failed_tests: string[]
      last_run_at: string | null
    }

    // === Error Tracking ===
    errors: Array<{
      action: string
      message: string
      timestamp: string
    }>

    // === Summary (after completion) ===
    summary?: {
      duration: number
      iterations: number
      develop: object
      debug: object
      validate: object
    }
  }
}

interface DevelopTask {
  id: string
  description: string
  tool: 'gemini' | 'qwen' | 'codex' | 'bash'
  mode: 'analysis' | 'write'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  files_changed: string[]
  created_at: string
  completed_at: string | null
}

interface Hypothesis {
  id: string                    // H1, H2, ...
  description: string
  testable_condition: string
  logging_point: string
  evidence_criteria: {
    confirm: string
    reject: string
  }
  likelihood: number            // 1 = most likely
  status: 'pending' | 'confirmed' | 'rejected' | 'inconclusive'
  evidence: Record<string, any> | null
  verdict_reason: string | null
}

interface TestResult {
  test_name: string
  suite: string
  status: 'passed' | 'failed' | 'skipped'
  duration_ms: number
  error_message: string | null
  stack_trace: string | null
}
```

## Initial State

### Created by API (Dashboard Trigger)

```json
{
  "loop_id": "loop-v2-20260122-abc123",
  "title": "Implement user authentication",
  "description": "Add login/logout functionality",
  "max_iterations": 10,
  "status": "created",
  "current_iteration": 0,
  "created_at": "2026-01-22T10:00:00+08:00",
  "updated_at": "2026-01-22T10:00:00+08:00"
}
```

### After Skill Initialization (INIT action)

```json
{
  "loop_id": "loop-v2-20260122-abc123",
  "title": "Implement user authentication",
  "description": "Add login/logout functionality",
  "max_iterations": 10,
  "status": "running",
  "current_iteration": 0,
  "created_at": "2026-01-22T10:00:00+08:00",
  "updated_at": "2026-01-22T10:00:05+08:00",

  "skill_state": {
    "current_action": "init",
    "last_action": null,
    "completed_actions": [],
    "mode": "auto",

    "develop": {
      "total": 3,
      "completed": 0,
      "current_task": null,
      "tasks": [
        { "id": "task-001", "description": "Create auth component", "status": "pending" }
      ],
      "last_progress_at": null
    },

    "debug": {
      "active_bug": null,
      "hypotheses_count": 0,
      "hypotheses": [],
      "confirmed_hypothesis": null,
      "iteration": 0,
      "last_analysis_at": null
    },

    "validate": {
      "pass_rate": 0,
      "coverage": 0,
      "test_results": [],
      "passed": false,
      "failed_tests": [],
      "last_run_at": null
    },

    "errors": []
  }
}
```

## Control Signal Checking (Codex Pattern)

Agent checks control signals at start of every action:

```javascript
/**
 * Check API control signals
 * MUST be called at start of every action
 * @returns { continue: boolean, action: 'pause_exit' | 'stop_exit' | 'continue' }
 */
function checkControlSignals(loopId) {
  const state = JSON.parse(Read(`.workflow/.loop/${loopId}.json`))

  switch (state.status) {
    case 'paused':
      // API paused the loop, Skill should exit and wait for resume
      return { continue: false, action: 'pause_exit' }

    case 'failed':
      // API stopped the loop (user manual stop)
      return { continue: false, action: 'stop_exit' }

    case 'running':
      // Normal continue
      return { continue: true, action: 'continue' }

    default:
      // Abnormal status
      return { continue: false, action: 'stop_exit' }
  }
}
```

## State Transitions

### 1. Initialization (INIT action)

```javascript
{
  status: 'created' -> 'running',  // Or keep 'running' if API already set
  updated_at: timestamp,

  skill_state: {
    current_action: 'init',
    mode: 'auto',
    develop: {
      tasks: [...parsed_tasks],
      total: N,
      completed: 0
    }
  }
}
```

### 2. Development (DEVELOP action)

```javascript
{
  updated_at: timestamp,
  current_iteration: state.current_iteration + 1,

  skill_state: {
    current_action: 'develop',
    last_action: 'DEVELOP',
    completed_actions: [..., 'DEVELOP'],
    develop: {
      current_task: 'task-xxx',
      completed: N+1,
      last_progress_at: timestamp
    }
  }
}
```

### 3. Debugging (DEBUG action)

```javascript
{
  updated_at: timestamp,
  current_iteration: state.current_iteration + 1,

  skill_state: {
    current_action: 'debug',
    last_action: 'DEBUG',
    debug: {
      active_bug: '...',
      hypotheses_count: N,
      hypotheses: [...new_hypotheses],
      iteration: N+1,
      last_analysis_at: timestamp
    }
  }
}
```

### 4. Validation (VALIDATE action)

```javascript
{
  updated_at: timestamp,
  current_iteration: state.current_iteration + 1,

  skill_state: {
    current_action: 'validate',
    last_action: 'VALIDATE',
    validate: {
      test_results: [...results],
      pass_rate: 95.5,
      coverage: 85.0,
      passed: true | false,
      failed_tests: ['test1', 'test2'],
      last_run_at: timestamp
    }
  }
}
```

### 5. Completion (COMPLETE action)

```javascript
{
  status: 'running' -> 'completed',
  completed_at: timestamp,
  updated_at: timestamp,

  skill_state: {
    current_action: 'complete',
    last_action: 'COMPLETE',
    summary: { ... }
  }
}
```

## File Sync

### Unified Location

State-to-file mapping:

| State Field | Sync File | Sync Timing |
|-------------|-----------|-------------|
| Entire LoopState | `.workflow/.loop/{loopId}.json` | Every state change (master) |
| `skill_state.develop` | `.workflow/.loop/{loopId}.progress/develop.md` | After each dev operation |
| `skill_state.debug` | `.workflow/.loop/{loopId}.progress/debug.md` | After each debug operation |
| `skill_state.validate` | `.workflow/.loop/{loopId}.progress/validate.md` | After each validation |
| Code changes log | `.workflow/.loop/{loopId}.progress/changes.log` | Each file modification (NDJSON) |
| Debug log | `.workflow/.loop/{loopId}.progress/debug.log` | Each debug log (NDJSON) |

### File Structure

```
.workflow/.loop/
+-- loop-v2-20260122-abc123.json         # Master state file (API + Skill)
+-- loop-v2-20260122-abc123.tasks.jsonl  # Task list (API managed)
+-- loop-v2-20260122-abc123.progress/    # Skill progress files
    +-- develop.md                       # Development progress
    +-- debug.md                         # Debug understanding
    +-- validate.md                      # Validation report
    +-- changes.log                      # Code changes (NDJSON)
    +-- debug.log                        # Debug log (NDJSON)
    +-- summary.md                       # Completion summary
```

## State Recovery

If master state file corrupted, rebuild skill_state from progress files:

```javascript
function rebuildSkillStateFromProgress(loopId) {
  const progressDir = `.workflow/.loop/${loopId}.progress`

  // Parse progress files to rebuild state
  const skill_state = {
    develop: parseProgressFile(`${progressDir}/develop.md`),
    debug: parseProgressFile(`${progressDir}/debug.md`),
    validate: parseProgressFile(`${progressDir}/validate.md`)
  }

  return skill_state
}
```

## Codex Pattern Notes

1. **Agent reads state**: Agent reads `.workflow/.loop/{loopId}.json` at action start
2. **Agent writes state**: Agent updates state after action completion
3. **Orchestrator tracks iterations**: Main loop tracks `current_iteration`
4. **Single agent context**: All state updates in same agent conversation via send_input
5. **No context serialization loss**: State transitions happen in-memory within agent
