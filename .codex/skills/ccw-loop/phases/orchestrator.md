# Orchestrator (Codex Pattern)

Orchestrate CCW Loop using Codex subagent pattern: `spawn_agent -> wait -> send_input -> close_agent`.

## Role

Check control signals -> Read file state -> Select action -> Execute via agent -> Update files -> Loop until complete or paused/stopped.

## Codex Pattern Overview

```
+-- spawn_agent (ccw-loop-executor role) --+
|                                          |
|  Phase 1: INIT or first action           |
|          |                               |
|          v                               |
|  wait() -> get result                    |
|          |                               |
|          v                               |
|  [If needs input] Collect user input     |
|          |                               |
|          v                               |
|  send_input(user choice + next action)   |
|          |                               |
|          v                               |
|  wait() -> get result                    |
|          |                               |
|          v                               |
|  [Loop until COMPLETED/PAUSED/STOPPED]   |
|          |                               |
+----------v-------------------------------+
           |
     close_agent()
```

## State Management (Unified Location)

### Read State

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

/**
 * Read loop state (unified location)
 * @param loopId - Loop ID (e.g., "loop-v2-20260122-abc123")
 */
function readLoopState(loopId) {
  const stateFile = `.workflow/.loop/${loopId}.json`

  if (!fs.existsSync(stateFile)) {
    return null
  }

  const state = JSON.parse(Read(stateFile))
  return state
}
```

### Create New Loop State (Direct Call)

```javascript
/**
 * Create new loop state (only for direct calls, API triggers have existing state)
 */
function createLoopState(loopId, taskDescription) {
  const stateFile = `.workflow/.loop/${loopId}.json`
  const now = getUtc8ISOString()

  const state = {
    // API compatible fields
    loop_id: loopId,
    title: taskDescription.substring(0, 100),
    description: taskDescription,
    max_iterations: 10,
    status: 'running',  // Direct call sets to running
    current_iteration: 0,
    created_at: now,
    updated_at: now,

    // Skill extension fields
    skill_state: null  // Initialized by INIT action
  }

  // Ensure directories exist
  mkdir -p ".loop"
  mkdir -p ".workflow/.loop/${loopId}.progress"

  Write(stateFile, JSON.stringify(state, null, 2))
  return state
}
```

## Main Execution Flow (Codex Subagent)

```javascript
/**
 * Run CCW Loop orchestrator using Codex subagent pattern
 * @param options.loopId - Existing Loop ID (API trigger)
 * @param options.task - Task description (direct call)
 * @param options.mode - 'interactive' | 'auto'
 */
async function runOrchestrator(options = {}) {
  const { loopId: existingLoopId, task, mode = 'interactive' } = options

  console.log('=== CCW Loop Orchestrator (Codex) Started ===')

  // 1. Determine loopId and initial state
  let loopId
  let state

  if (existingLoopId) {
    // API trigger: use existing loopId
    loopId = existingLoopId
    state = readLoopState(loopId)

    if (!state) {
      console.error(`Loop not found: ${loopId}`)
      return { status: 'error', message: 'Loop not found' }
    }

    console.log(`Resuming loop: ${loopId}`)
    console.log(`Status: ${state.status}`)

  } else if (task) {
    // Direct call: create new loopId
    const timestamp = getUtc8ISOString().replace(/[-:]/g, '').split('.')[0]
    const random = Math.random().toString(36).substring(2, 10)
    loopId = `loop-v2-${timestamp}-${random}`

    console.log(`Creating new loop: ${loopId}`)
    console.log(`Task: ${task}`)

    state = createLoopState(loopId, task)

  } else {
    console.error('Either --loop-id or task description is required')
    return { status: 'error', message: 'Missing loopId or task' }
  }

  const progressDir = `.workflow/.loop/${loopId}.progress`

  // 2. Create executor agent (single agent for entire loop)
  const agent = spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/ccw-loop-executor.md (MUST read first)
2. Read: .workflow/project-tech.json (if exists)
3. Read: .workflow/project-guidelines.json (if exists)

---

## LOOP CONTEXT

- **Loop ID**: ${loopId}
- **State File**: .workflow/.loop/${loopId}.json
- **Progress Dir**: ${progressDir}
- **Mode**: ${mode}

## CURRENT STATE

${JSON.stringify(state, null, 2)}

## TASK DESCRIPTION

${state.description || task}

## FIRST ACTION

${!state.skill_state ? 'Execute: INIT' : mode === 'auto' ? 'Auto-select next action' : 'Show MENU'}

Read the role definition first, then execute the appropriate action.
`
  })

  // 3. Main orchestration loop
  let iteration = state.current_iteration || 0
  const maxIterations = state.max_iterations || 10
  let continueLoop = true

  while (continueLoop && iteration < maxIterations) {
    iteration++

    // Wait for agent output
    const result = wait({ ids: [agent], timeout_ms: 600000 })

    // Check for timeout
    if (result.timed_out) {
      console.log('Agent timeout, requesting convergence...')
      send_input({
        id: agent,
        message: `
## TIMEOUT NOTIFICATION

Execution timeout reached. Please:
1. Output current progress
2. Save any pending state updates
3. Return ACTION_RESULT with current status
`
      })
      continue
    }

    const output = result.status[agent].completed

    // Parse action result
    const actionResult = parseActionResult(output)

    console.log(`\n[Iteration ${iteration}] Action: ${actionResult.action}, Status: ${actionResult.status}`)

    // Update iteration in state
    state = readLoopState(loopId)
    state.current_iteration = iteration
    state.updated_at = getUtc8ISOString()
    Write(`.workflow/.loop/${loopId}.json`, JSON.stringify(state, null, 2))

    // Handle different outcomes
    switch (actionResult.next_action) {
      case 'COMPLETED':
        console.log('Loop completed successfully')
        continueLoop = false
        break

      case 'PAUSED':
        console.log('Loop paused by API, exiting gracefully')
        continueLoop = false
        break

      case 'STOPPED':
        console.log('Loop stopped by API')
        continueLoop = false
        break

      case 'WAITING_INPUT':
        // Interactive mode: display menu, get user choice
        if (mode === 'interactive') {
          const userChoice = await displayMenuAndGetChoice(actionResult)

          // Send user choice back to agent
          send_input({
            id: agent,
            message: `
## USER INPUT RECEIVED

Action selected: ${userChoice.action}
${userChoice.data ? `Additional data: ${JSON.stringify(userChoice.data)}` : ''}

## EXECUTE SELECTED ACTION

Read action instructions and execute: ${userChoice.action}
Update state and progress files accordingly.
Output ACTION_RESULT when complete.
`
          })
        }
        break

      default:
        // Continue with next action
        if (actionResult.next_action && actionResult.next_action !== 'NONE') {
          send_input({
            id: agent,
            message: `
## CONTINUE EXECUTION

Previous action completed: ${actionResult.action}
Result: ${actionResult.status}
${actionResult.message ? `Message: ${actionResult.message}` : ''}

## EXECUTE NEXT ACTION

Continue with: ${actionResult.next_action}
Read action instructions and execute.
Output ACTION_RESULT when complete.
`
          })
        } else {
          // No next action specified, check if should continue
          if (actionResult.status === 'failed') {
            console.log(`Action failed: ${actionResult.message}`)
          }
          continueLoop = false
        }
    }
  }

  // 4. Check iteration limit
  if (iteration >= maxIterations) {
    console.log(`\nReached maximum iterations (${maxIterations})`)
    console.log('Consider breaking down the task or taking a break.')
  }

  // 5. Cleanup
  close_agent({ id: agent })

  console.log('\n=== CCW Loop Orchestrator (Codex) Finished ===')

  // Return final state
  const finalState = readLoopState(loopId)
  return {
    status: finalState.status,
    loop_id: loopId,
    iterations: iteration,
    final_state: finalState
  }
}

/**
 * Parse action result from agent output
 */
function parseActionResult(output) {
  const result = {
    action: 'unknown',
    status: 'unknown',
    message: '',
    state_updates: {},
    next_action: 'NONE'
  }

  // Parse ACTION_RESULT block
  const actionMatch = output.match(/ACTION_RESULT:\s*([\s\S]*?)(?:FILES_UPDATED:|NEXT_ACTION_NEEDED:|$)/)
  if (actionMatch) {
    const lines = actionMatch[1].split('\n')
    for (const line of lines) {
      const match = line.match(/^-\s*(\w+):\s*(.+)$/)
      if (match) {
        const [, key, value] = match
        if (key === 'state_updates') {
          try {
            result.state_updates = JSON.parse(value)
          } catch (e) {
            // Try parsing multi-line JSON
          }
        } else {
          result[key] = value.trim()
        }
      }
    }
  }

  // Parse NEXT_ACTION_NEEDED
  const nextMatch = output.match(/NEXT_ACTION_NEEDED:\s*(\S+)/)
  if (nextMatch) {
    result.next_action = nextMatch[1]
  }

  return result
}

/**
 * Display menu and get user choice (interactive mode)
 */
async function displayMenuAndGetChoice(actionResult) {
  // Parse MENU_OPTIONS from output
  const menuMatch = actionResult.message.match(/MENU_OPTIONS:\s*([\s\S]*?)(?:WAITING_INPUT:|$)/)

  if (menuMatch) {
    console.log('\n' + menuMatch[1])
  }

  // Use AskUserQuestion to get choice
  const response = await AskUserQuestion({
    questions: [{
      question: "Select next action:",
      header: "Action",
      multiSelect: false,
      options: [
        { label: "develop", description: "Continue development" },
        { label: "debug", description: "Start debugging" },
        { label: "validate", description: "Run validation" },
        { label: "complete", description: "Complete loop" },
        { label: "exit", description: "Exit and save" }
      ]
    }]
  })

  return { action: response["Action"] }
}
```

## Action Catalog

| Action | Purpose | Preconditions | Effects |
|--------|---------|---------------|---------|
| INIT | Initialize session | status=running, skill_state=null | skill_state initialized |
| MENU | Display menu | skill_state != null, mode=interactive | Wait for user input |
| DEVELOP | Execute dev task | pending tasks > 0 | Update progress.md |
| DEBUG | Hypothesis debug | needs debugging | Update understanding.md |
| VALIDATE | Run tests | needs validation | Update validation.md |
| COMPLETE | Finish loop | all done | status=completed |

## Termination Conditions

1. **API Paused**: `state.status === 'paused'` (Skill exits, wait for resume)
2. **API Stopped**: `state.status === 'failed'` (Skill terminates)
3. **Task Complete**: `NEXT_ACTION_NEEDED === 'COMPLETED'`
4. **Iteration Limit**: `current_iteration >= max_iterations`
5. **User Exit**: User selects 'exit' in interactive mode

## Error Recovery

| Error Type | Recovery Strategy |
|------------|-------------------|
| Agent timeout | send_input requesting convergence |
| Action failed | Log error, continue or prompt user |
| State corrupted | Rebuild from progress files |
| Agent closed unexpectedly | Re-spawn with previous output in message |

## Codex Best Practices Applied

1. **Single Agent Pattern**: One agent handles entire loop lifecycle
2. **Deep Interaction via send_input**: Multi-phase without context loss
3. **Delayed close_agent**: Only after confirming no more interaction
4. **Explicit wait()**: Always get results before proceeding
5. **Role Path Passing**: Agent reads role file, no content embedding
