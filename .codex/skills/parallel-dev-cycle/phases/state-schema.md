# State Schema - Parallel Dev Cycle

Unified cycle state structure for multi-agent coordination and iteration support.

## State File Location

**Location**: `.workflow/.cycle/{cycleId}.json` (unified state, all agents access)

**Format**: JSON

## Cycle State Interface

```typescript
interface CycleState {
  // =====================================================
  // CORE METADATA
  // =====================================================

  cycle_id: string                    // Unique cycle identifier
  title: string                       // Task title (first 100 chars)
  description: string                 // Full task description
  task_history: string[]              // All task descriptions across iterations

  // =====================================================
  // STATUS & TIMING
  // =====================================================

  status: 'created' | 'running' | 'paused' | 'completed' | 'failed'
  created_at: string                  // ISO8601 format
  updated_at: string                  // ISO8601 format
  completed_at?: string               // ISO8601 format

  max_iterations: number              // Maximum iteration limit
  current_iteration: number           // Current iteration count
  failure_reason?: string             // If failed, why

  // =====================================================
  // MULTI-AGENT TRACKING
  // =====================================================

  agents: {
    ra: AgentState                    // Requirements Analyst
    ep: AgentState                    // Exploration Planner
    cd: AgentState                    // Code Developer
    vas: AgentState                   // Validation Archivist
  }

  // =====================================================
  // PHASE TRACKING
  // =====================================================

  current_phase: 'init' | 'ra' | 'ep' | 'cd' | 'vas' | 'aggregation' | 'complete'
  completed_phases: string[]
  phase_errors: Array<{
    phase: string
    error: string
    timestamp: string
  }>

  // =====================================================
  // SHARED CONTEXT (Populated by agents)
  // =====================================================

  requirements?: {
    version: string                   // e.g., "1.0.0", "1.1.0"
    specification: string             // Full spec from requirements.md
    edge_cases: string[]
    last_updated: string
  }

  exploration?: {
    version: string
    architecture_summary: string
    integration_points: string[]
    identified_risks: string[]
    last_updated: string
  }

  plan?: {
    version: string
    tasks: PlanTask[]
    total_estimated_effort: string
    critical_path: string[]
    last_updated: string
  }

  changes?: {
    total_files: number
    changes: ChangeLog[]
    iteration_markers: Record<number, string>  // Iteration timestamps
  }

  test_results?: {
    version: string
    pass_rate: number                 // 0-100
    coverage: number                  // 0-100
    failed_tests: string[]
    total_tests: number
    last_run: string
  }

  // =====================================================
  // ITERATION TRACKING
  // =====================================================

  iterations: IterationRecord[]

  // =====================================================
  // COORDINATION DATA
  // =====================================================

  coordination: {
    feedback_log: FeedbackEntry[]
    pending_decisions: Decision[]
    blockers: Blocker[]
  }
}

// =====================================================
// SUPPORTING TYPES
// =====================================================

interface AgentState {
  status: 'idle' | 'running' | 'waiting' | 'completed' | 'failed'
  started_at?: string
  completed_at?: string
  output_files: string[]
  last_message?: string
  error?: string
  iterations_completed: number
}

interface PlanTask {
  id: string                          // e.g., "TASK-001"
  description: string
  effort: 'small' | 'medium' | 'large'
  depends_on: string[]
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  assigned_to?: string                // Agent name
  files: string[]
}

interface ChangeLog {
  timestamp: string
  file: string
  action: 'create' | 'modify' | 'delete'
  iteration: number
  agent: string                       // which agent made change
  description: string
}

interface IterationRecord {
  number: number
  extension?: string                  // User feedback/extension for this iteration
  started_at: string
  completed_at: string
  agent_results: Record<string, {
    status: string
    files_modified: number
  }>
  issues_found: string[]
  resolved: boolean
}

interface FeedbackEntry {
  timestamp: string
  source: string                      // Agent or 'user'
  target: string                      // Recipient agent
  content: string
  type: 'requirement_update' | 'bug_report' | 'issue_fix' | 'clarification'
}

interface Decision {
  id: string
  description: string
  options: string[]
  made_by?: string
  chosen_option?: string
  status: 'pending' | 'made' | 'implemented'
}

interface Blocker {
  id: string
  description: string
  reported_by: string
  status: 'open' | 'resolved' | 'workaround'
  resolution?: string
}
```

## Initial State (New Cycle)

When creating a new cycle:

```json
{
  "cycle_id": "cycle-v1-20260122T100000-abc123",
  "title": "Implement OAuth authentication",
  "description": "Add OAuth2 login support with Google and GitHub providers",
  "task_history": [
    "Implement OAuth authentication"
  ],
  "status": "created",
  "created_at": "2026-01-22T10:00:00+08:00",
  "updated_at": "2026-01-22T10:00:00+08:00",
  "max_iterations": 5,
  "current_iteration": 0,
  "agents": {
    "ra": { "status": "idle", "output_files": [], "iterations_completed": 0 },
    "ep": { "status": "idle", "output_files": [], "iterations_completed": 0 },
    "cd": { "status": "idle", "output_files": [], "iterations_completed": 0 },
    "vas": { "status": "idle", "output_files": [], "iterations_completed": 0 }
  },
  "current_phase": "init",
  "completed_phases": [],
  "phase_errors": [],
  "iterations": [],
  "coordination": {
    "feedback_log": [],
    "pending_decisions": [],
    "blockers": []
  }
}
```

## State Transitions

### Iteration 1: Initial Execution

```json
{
  "status": "running",
  "current_iteration": 1,
  "current_phase": "ra",
  "agents": {
    "ra": { "status": "running", "started_at": "2026-01-22T10:05:00+08:00" },
    "ep": { "status": "idle" },
    "cd": { "status": "idle" },
    "vas": { "status": "idle" }
  },
  "requirements": {
    "version": "1.0.0",
    "specification": "...",
    "edge_cases": ["OAuth timeout handling", "PKCE validation"],
    "last_updated": "2026-01-22T10:15:00+08:00"
  },
  "iterations": [{
    "number": 1,
    "started_at": "2026-01-22T10:00:00+08:00",
    "agent_results": {
      "ra": { "status": "completed", "files_modified": 3 },
      "ep": { "status": "completed", "files_modified": 2 },
      "cd": { "status": "partial", "files_modified": 5 },
      "vas": { "status": "pending", "files_modified": 0 }
    }
  }]
}
```

### After Phase Completion

```json
{
  "current_phase": "aggregation",
  "completed_phases": ["ra", "ep", "cd", "vas"],
  "plan": {
    "version": "1.0.0",
    "tasks": [
      {
        "id": "TASK-001",
        "description": "Setup OAuth application credentials",
        "effort": "small",
        "status": "completed",
        "files": ["src/config/oauth.ts"]
      }
    ]
  },
  "changes": {
    "total_files": 12,
    "iteration_markers": {
      "1": "2026-01-22T10:30:00+08:00"
    }
  },
  "test_results": {
    "version": "1.0.0",
    "pass_rate": 85,
    "coverage": 78,
    "failed_tests": ["test: OAuth timeout retry"],
    "total_tests": 20
  }
}
```

### Iteration 2: User Extension

User provides feedback: "Also add multi-factor authentication"

```json
{
  "status": "running",
  "current_iteration": 2,
  "task_history": [
    "Implement OAuth authentication",
    "Also add multi-factor authentication"
  ],
  "description": "Add OAuth2 login support with Google and GitHub providers\n\n--- ITERATION 2 ---\nAlso add multi-factor authentication",
  "agents": {
    "ra": { "status": "running", "iterations_completed": 1 },
    "ep": { "status": "idle", "iterations_completed": 1 },
    "cd": { "status": "idle", "iterations_completed": 1 },
    "vas": { "status": "idle", "iterations_completed": 1 }
  },
  "requirements": {
    "version": "1.1.0",
    "specification": "...",
    "last_updated": "2026-01-22T11:00:00+08:00"
  },
  "iterations": [
    { "number": 1, "completed_at": "..." },
    {
      "number": 2,
      "extension": "Also add multi-factor authentication",
      "started_at": "2026-01-22T10:45:00+08:00",
      "agent_results": {}
    }
  ],
  "coordination": {
    "feedback_log": [{
      "timestamp": "2026-01-22T10:45:00+08:00",
      "source": "user",
      "target": "ra",
      "content": "Add multi-factor authentication to requirements",
      "type": "requirement_update"
    }]
  }
}
```

## Version Tracking

Each component tracks its version:

- **Requirements**: `1.0.0` → `1.1.0` → `1.2.0` (each iteration)
- **Plan**: `1.0.0` → `1.1.0` (updated based on requirements)
- **Code**: Changes appended with iteration markers
- **Tests**: Results tracked per iteration

## File Sync Protocol

State changes trigger file writes:

| State Change | File Sync |
|--------------|-----------|
| `requirements` updated | `.progress/ra/requirements.md` + version bump |
| `plan` updated | `.progress/ep/plan.json` + version bump |
| `changes` appended | `.progress/cd/changes.log` + iteration marker |
| `test_results` updated | `.progress/vas/test-results.json` + version bump |
| Full iteration done | `.progress/coordination/timeline.md` appended |

## Control Signal Checking

Agents check status before each action:

```javascript
function checkControlSignals(cycleId) {
  const state = JSON.parse(Read(`.workflow/.cycle/${cycleId}.json`))

  if (state.status === 'paused') {
    return { continue: false, action: 'pause' }
  }
  if (state.status === 'failed') {
    return { continue: false, action: 'stop' }
  }
  if (state.status === 'running') {
    return { continue: true, action: 'continue' }
  }

  return { continue: false, action: 'unknown' }
}
```

## State Persistence

### Write Operations

After each agent completes or phase transitions:

```javascript
Write(
  `.workflow/.cycle/${cycleId}.json`,
  JSON.stringify(state, null, 2)
)
```

### Read Operations

Agents always read fresh state before executing:

```javascript
const currentState = JSON.parse(
  Read(`.workflow/.cycle/${cycleId}.json`)
)
```

## State Rebuild (Recovery)

If master state corrupted, rebuild from markdown files:

```javascript
function rebuildState(cycleId) {
  const progressDir = `.workflow/.cycle/${cycleId}.progress`

  // Read markdown files
  const raMarkdown = Read(`${progressDir}/ra/requirements.md`)
  const epMarkdown = Read(`${progressDir}/ep/plan.json`)
  const cdChanges = Read(`${progressDir}/cd/changes.log`)
  const vasResults = Read(`${progressDir}/vas/test-results.json`)

  // Reconstruct state from files
  return {
    requirements: parseMarkdown(raMarkdown),
    plan: JSON.parse(epMarkdown),
    changes: parseNDJSON(cdChanges),
    test_results: JSON.parse(vasResults)
  }
}
```

## Best Practices

1. **Immutable Reads**: Never modify state during read
2. **Version Bumps**: Increment version on each iteration
3. **Timestamp Accuracy**: Use UTC+8 consistently
4. **Append-Only Logs**: Never delete history
5. **Atomic Writes**: Write complete state, not partial updates
6. **Coordination Tracking**: Log all inter-agent communication
