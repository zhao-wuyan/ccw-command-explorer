# Orchestrator - Multi-Agent Coordination (Codex Pattern)

Orchestrate parallel dev cycle using Codex subagent pattern with continuous iteration support.

## Role

Coordinate four specialized agents → Manage state → Support continuous iteration → Generate unified documentation.

## Codex Pattern Overview

```
Main Orchestrator Flow:

┌─── spawn_agent (orchestrator role) ────────────────────────────┐
│                                                                 │
│  Phase 1: INIT (Check control signals)                          │
│       ↓                                                         │
│  wait() → Parse cycle state                                    │
│       ↓                                                         │
│  Phase 2: AGENT ORCHESTRATION                                  │
│       ↓                                                         │
│  spawn_agent(RA) | spawn_agent(EP)                             │
│  spawn_agent(CD) | spawn_agent(VAS)                            │
│       ↓                                                         │
│  wait({ ids: [RA, EP, CD, VAS] }) → Collect all results       │
│       ↓                                                         │
│  Phase 3: ITERATION HANDLING                                   │
│       ↓                                                         │
│  [If extension needed]                                          │
│  send_input to affected agents                                 │
│  wait() for updated results                                    │
│       ↓                                                         │
│  Phase 4: AGGREGATION                                          │
│       ↓                                                         │
│  Merge all outputs → Generate unified documentation            │
│       ↓                                                         │
│  Update cycle state                                            │
│       ↓                                                         │
│  [Loop if more iterations]                                     │
│       ↓                                                         │
│  close_agent() when complete                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## State Management

### Read Cycle State

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

function readCycleState(cycleId) {
  const stateFile = `.workflow/.cycle/${cycleId}.json`
  if (!fs.existsSync(stateFile)) {
    return null
  }
  return JSON.parse(Read(stateFile))
}
```

### Create New Cycle State

```javascript
function createCycleState(cycleId, taskDescription) {
  const stateFile = `.workflow/.cycle/${cycleId}.json`
  const now = getUtc8ISOString()

  const state = {
    // Metadata
    cycle_id: cycleId,
    title: taskDescription.substring(0, 100),
    description: taskDescription,
    max_iterations: 5,
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
    test_results: null
  }

  // Create directories
  mkdir -p `.workflow/.cycle/${cycleId}.progress/{ra,ep,cd,vas,coordination}`

  Write(stateFile, JSON.stringify(state, null, 2))
  return state
}
```

## Main Execution Flow (Codex Subagent)

```javascript
async function runOrchestrator(options = {}) {
  const { cycleId: existingCycleId, task, mode = 'interactive', extension } = options

  console.log('=== Parallel Dev Cycle Orchestrator Started ===')

  // 1. Determine cycleId and initial state
  let cycleId
  let state

  if (existingCycleId) {
    // Continue existing cycle
    cycleId = existingCycleId
    state = readCycleState(cycleId)

    if (!state) {
      console.error(`Cycle not found: ${cycleId}`)
      return { status: 'error', message: 'Cycle not found' }
    }

    console.log(`Resuming cycle: ${cycleId}`)
    if (extension) {
      console.log(`Extension: ${extension}`)
      state.description += `\n\n--- ITERATION ${state.current_iteration + 1} ---\n${extension}`
    }

  } else if (task) {
    // Create new cycle
    const timestamp = getUtc8ISOString().replace(/[-:]/g, '').split('.')[0]
    const random = Math.random().toString(36).substring(2, 10)
    cycleId = `cycle-v1-${timestamp}-${random}`

    console.log(`Creating new cycle: ${cycleId}`)
    state = createCycleState(cycleId, task)

  } else {
    console.error('Either --cycle-id or task description is required')
    return { status: 'error', message: 'Missing cycleId or task' }
  }

  const progressDir = `.workflow/.cycle/${cycleId}.progress`

  // 2. Main orchestration loop
  let iteration = state.current_iteration || 0
  const maxIterations = state.max_iterations || 5
  let continueLoop = true

  while (continueLoop && iteration < maxIterations) {
    iteration++
    state.current_iteration = iteration

    console.log(`\n========== ITERATION ${iteration} ==========`)

    // 3. Spawn four agents in parallel
    console.log('Spawning agents...')

    const agents = {
      ra: spawnRAAgent(cycleId, state, progressDir),
      ep: spawnEPAgent(cycleId, state, progressDir),
      cd: spawnCDAgent(cycleId, state, progressDir),
      vas: spawnVASAgent(cycleId, state, progressDir)
    }

    // 4. Wait for all agents to complete
    console.log('Waiting for all agents...')
    const results = wait({
      ids: [agents.ra, agents.ep, agents.cd, agents.vas],
      timeout_ms: 1800000  // 30 minutes
    })

    if (results.timed_out) {
      console.log('Some agents timed out, sending convergence request...')
      Object.entries(agents).forEach(([name, id]) => {
        if (!results.status[id].completed) {
          send_input({
            id: id,
            message: `
## TIMEOUT NOTIFICATION

Execution timeout reached. Please:
1. Output current progress to markdown file
2. Save all state updates
3. Return completion status
`
          })
        }
      })
      continue
    }

    // 5. Collect all agent outputs
    const agentOutputs = {
      ra: results.status[agents.ra].completed,
      ep: results.status[agents.ep].completed,
      cd: results.status[agents.cd].completed,
      vas: results.status[agents.vas].completed
    }

    // 6. Parse and aggregate results
    const parsedResults = parseAgentOutputs(agentOutputs)

    // Update state with agent results
    state.agents.ra.status = 'completed'
    state.agents.ep.status = 'completed'
    state.agents.cd.status = 'completed'
    state.agents.vas.status = 'completed'

    state.requirements = parsedResults.ra.requirements
    state.exploration = parsedResults.ep.exploration
    state.plan = parsedResults.ep.plan
    state.changes = parsedResults.cd.changes
    state.test_results = parsedResults.vas.test_results

    state.completed_phases.push(...['ra', 'ep', 'cd', 'vas'])
    state.updated_at = getUtc8ISOString()

    // Save state
    Write(`.workflow/.cycle/${cycleId}.json`, JSON.stringify(state, null, 2))

    // 7. Check for issues and determine next iteration
    const hasIssues = parsedResults.vas.test_results?.passed === false ||
                     parsedResults.cd.issues?.length > 0

    if (hasIssues && iteration < maxIterations) {
      console.log('Issues detected, preparing for next iteration...')

      // Generate feedback for agents
      const feedback = generateFeedback(parsedResults)

      // Send feedback to relevant agents
      if (feedback.ra) {
        send_input({
          id: agents.ra,
          message: feedback.ra
        })
      }

      if (feedback.cd) {
        send_input({
          id: agents.cd,
          message: feedback.cd
        })
      }

      // Wait for updates
      const updatedResults = wait({
        ids: [agents.ra, agents.cd].filter(Boolean),
        timeout_ms: 900000
      })

      console.log('Agents updated, continuing...')

    } else if (!hasIssues) {
      console.log('All phases completed successfully')
      continueLoop = false

    } else if (iteration >= maxIterations) {
      console.log(`Reached maximum iterations (${maxIterations})`)
      continueLoop = false
    }
  }

  // 8. Generate unified summary
  console.log('Generating final summary...')
  generateFinalSummary(cycleId, state)

  // 9. Update final state
  state.status = 'completed'
  state.completed_at = getUtc8ISOString()
  Write(`.workflow/.cycle/${cycleId}.json`, JSON.stringify(state, null, 2))

  // 10. Cleanup
  Object.values(agents).forEach(id => {
    try {
      close_agent({ id })
    } catch (e) {
      console.warn(`Failed to close agent ${id}`)
    }
  })

  console.log('\n=== Parallel Dev Cycle Orchestrator Finished ===')

  return {
    status: 'completed',
    cycle_id: cycleId,
    iterations: iteration,
    final_state: state
  }
}
```

## Agent Spawning Functions

### Spawn RA Agent

```javascript
function spawnRAAgent(cycleId, state, progressDir) {
  return spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/requirements-analyst.md
2. Read: .workflow/project-tech.json (if exists)
3. Read: .workflow/project-guidelines.json (if exists)
4. Read: .workflow/.cycle/${cycleId}.progress/coordination/feedback.md (if exists)

---

## CYCLE CONTEXT

- **Cycle ID**: ${cycleId}
- **Progress Dir**: ${progressDir}/ra/
- **Current Iteration**: ${state.current_iteration}
- **Task Description**: ${state.description}

## CURRENT REQUIREMENTS STATE

${state.requirements ? JSON.stringify(state.requirements, null, 2) : 'No previous requirements'}

## YOUR ROLE

Requirements Analyst - Analyze and refine requirements throughout the cycle.

## RESPONSIBILITIES

1. Analyze initial task description
2. Generate comprehensive requirements specification
3. Identify edge cases and implicit requirements
4. Track requirement changes across iterations
5. Maintain requirements.md and changes.log

## DELIVERABLES

Write files to ${progressDir}/ra/:
- requirements.md: Full requirements specification
- edge-cases.md: Edge case analysis
- changes.log: NDJSON format change tracking

## OUTPUT FORMAT

\`\`\`
PHASE_RESULT:
- phase: ra
- status: success | failed
- files_written: [list]
- summary: one-line summary
- issues: []
\`\`\`
`
  })
}
```

### Spawn EP Agent

```javascript
function spawnEPAgent(cycleId, state, progressDir) {
  return spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/exploration-planner.md
2. Read: .workflow/project-tech.json
3. Read: .workflow/project-guidelines.json
4. Read: ${progressDir}/ra/requirements.md

---

## CYCLE CONTEXT

- **Cycle ID**: ${cycleId}
- **Progress Dir**: ${progressDir}/ep/
- **Requirements**: See requirements.md
- **Current Plan**: ${state.plan ? 'Existing' : 'None - first iteration'}

## YOUR ROLE

Exploration & Planning Agent - Explore architecture and generate implementation plan.

## RESPONSIBILITIES

1. Explore codebase architecture
2. Map integration points
3. Design implementation approach
4. Generate plan.json with task breakdown
5. Update or iterate on existing plan

## DELIVERABLES

Write files to ${progressDir}/ep/:
- exploration.md: Codebase exploration findings
- architecture.md: Architecture design
- plan.json: Implementation plan (structured)

## OUTPUT FORMAT

\`\`\`
PHASE_RESULT:
- phase: ep
- status: success | failed
- files_written: [list]
- summary: one-line summary
- plan_version: X.Y.Z
\`\`\`
`
  })
}
```

### Spawn CD Agent

```javascript
function spawnCDAgent(cycleId, state, progressDir) {
  return spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/code-developer.md
2. Read: ${progressDir}/ep/plan.json
3. Read: ${progressDir}/ra/requirements.md

---

## CYCLE CONTEXT

- **Cycle ID**: ${cycleId}
- **Progress Dir**: ${progressDir}/cd/
- **Plan Version**: ${state.plan?.version || 'N/A'}
- **Previous Changes**: ${state.changes?.length || 0} files

## YOUR ROLE

Code Developer - Implement features based on plan and requirements.

## RESPONSIBILITIES

1. Implement features from plan
2. Track code changes
3. Handle integration issues
4. Maintain code quality
5. Report implementation progress and issues

## DELIVERABLES

Write files to ${progressDir}/cd/:
- implementation.md: Implementation progress and decisions
- changes.log: NDJSON format, each line: {file, action, timestamp}
- issues.md: Development issues and blockers

## OUTPUT FORMAT

\`\`\`
PHASE_RESULT:
- phase: cd
- status: success | failed | partial
- files_changed: [count]
- summary: one-line summary
- blockers: []
\`\`\`
`
  })
}
```

### Spawn VAS Agent

```javascript
function spawnVASAgent(cycleId, state, progressDir) {
  return spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/validation-archivist.md
2. Read: ${progressDir}/cd/changes.log

---

## CYCLE CONTEXT

- **Cycle ID**: ${cycleId}
- **Progress Dir**: ${progressDir}/vas/
- **Changes Count**: ${state.changes?.length || 0}
- **Iteration**: ${state.current_iteration}

## YOUR ROLE

Validation & Archival Specialist - Validate quality and create documentation.

## RESPONSIBILITIES

1. Run tests on implemented features
2. Generate coverage reports
3. Create archival documentation
4. Summarize cycle results
5. Generate version history

## DELIVERABLES

Write files to ${progressDir}/vas/:
- validation.md: Test validation results
- test-results.json: Detailed test results
- coverage.md: Coverage report
- summary.md: Cycle summary and recommendations

## OUTPUT FORMAT

\`\`\`
PHASE_RESULT:
- phase: vas
- status: success | failed
- test_pass_rate: X%
- coverage: X%
- issues: []
\`\`\`
`
  })
}
```

## Result Parsing

```javascript
function parseAgentOutputs(agentOutputs) {
  const results = {
    ra: parseOutput(agentOutputs.ra, 'ra'),
    ep: parseOutput(agentOutputs.ep, 'ep'),
    cd: parseOutput(agentOutputs.cd, 'cd'),
    vas: parseOutput(agentOutputs.vas, 'vas')
  }
  return results
}

function parseOutput(output, agent) {
  const result = {
    agent: agent,
    status: 'unknown',
    data: {}
  }

  // Parse PHASE_RESULT block
  const match = output.match(/PHASE_RESULT:\s*([\s\S]*?)(?:\n\n|$)/)
  if (match) {
    const lines = match[1].split('\n')
    for (const line of lines) {
      const m = line.match(/^-\s*(\w+):\s*(.+)$/)
      if (m) {
        result[m[1]] = m[2].trim()
      }
    }
  }

  return result
}
```

## Feedback Generation

```javascript
function generateFeedback(parsedResults) {
  const feedback = {}

  // Check VAS results
  if (parsedResults.vas.test_pass_rate < 100) {
    feedback.cd = `
## FEEDBACK FROM VALIDATION

Test pass rate: ${parsedResults.vas.test_pass_rate}%

## ISSUES TO FIX

${parsedResults.vas.data.issues || 'See test-results.json for details'}

## NEXT STEP

Fix failing tests and update implementation.md with resolution.
`
  }

  // Check CD blockers
  if (parsedResults.cd.blockers?.length > 0) {
    feedback.ra = `
## FEEDBACK FROM DEVELOPMENT

Blockers encountered:
${parsedResults.cd.blockers.map(b => `- ${b}`).join('\n')}

## NEXT STEP

Clarify requirements or identify alternative approaches.
Update requirements.md if needed.
`
  }

  return feedback
}
```

## Summary Generation

```javascript
function generateFinalSummary(cycleId, state) {
  const summaryFile = `.workflow/.cycle/${cycleId}.progress/coordination/summary.md`

  const summary = `# Cycle Summary - ${cycleId}

## Metadata
- Cycle ID: ${cycleId}
- Started: ${state.created_at}
- Completed: ${state.completed_at}
- Iterations: ${state.current_iteration}
- Status: ${state.status}

## Phase Results
- Requirements Analysis: ✓ Completed
- Exploration & Planning: ✓ Completed
- Code Development: ✓ Completed
- Validation & Archival: ✓ Completed

## Key Deliverables
- Requirements: ${state.requirements ? '✓' : '✗'}
- Architecture Plan: ${state.plan ? '✓' : '✗'}
- Code Changes: ${state.changes?.length || 0} files
- Test Results: ${state.test_results?.pass_rate || '0'}% passing

## Generated Files
- .workflow/.cycle/${cycleId}.progress/ra/requirements.md
- .workflow/.cycle/${cycleId}.progress/ep/plan.json
- .workflow/.cycle/${cycleId}.progress/cd/changes.log
- .workflow/.cycle/${cycleId}.progress/vas/summary.md

## Continuation Instructions

To extend this cycle:

\`\`\`bash
/parallel-dev-cycle --cycle-id=${cycleId} --extend="New requirement or feedback"
\`\`\`

This will spawn agents for iteration ${state.current_iteration + 1}.
`

  Write(summaryFile, summary)
}
```

## Control Signal Checking

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

## Error Recovery Strategies

| Error Type | Recovery |
|------------|----------|
| Agent timeout | send_input requesting convergence |
| State corrupted | Rebuild from progress markdown files |
| Agent failed | Re-spawn agent with previous context |
| Conflicting results | Orchestrator sends reconciliation request |
| Missing files | RA/EP agents identify and request clarification |

## Codex Best Practices Applied

1. **Single Orchestrator**: One main agent manages all phases
2. **Parallel Workers**: Four specialized agents execute simultaneously
3. **Batch wait()**: Wait for all agents with `wait({ ids: [...] })`
4. **Deep Interaction**: Use send_input for iteration and refinement
5. **Delayed close_agent**: Only after all phases and iterations complete
6. **Role Path Passing**: Each agent reads its own role definition
7. **Persistent Context**: Cycle state shared across all agents
