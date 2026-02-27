# Action: MENU

Display interactive action menu for user selection.

## Purpose

- Show current state summary
- Display available actions
- Wait for user selection
- Return selected action

## Preconditions

- [ ] state.status === 'running'
- [ ] state.skill_state !== null
- [ ] mode === 'interactive'

## Execution Steps

### Step 1: Verify Control Signals

```javascript
const state = JSON.parse(Read(`.workflow/.loop/${loopId}.json`))

if (state.status !== 'running') {
  return {
    action: 'MENU',
    status: 'failed',
    message: `Cannot show menu: status is ${state.status}`,
    next_action: state.status === 'paused' ? 'PAUSED' : 'STOPPED'
  }
}
```

### Step 2: Generate Status Summary

```javascript
// Development progress
const developProgress = state.skill_state.develop.total > 0
  ? `${state.skill_state.develop.completed}/${state.skill_state.develop.total} (${((state.skill_state.develop.completed / state.skill_state.develop.total) * 100).toFixed(0)}%)`
  : 'Not started'

// Debug status
const debugStatus = state.skill_state.debug.confirmed_hypothesis
  ? 'Root cause found'
  : state.skill_state.debug.iteration > 0
    ? `Iteration ${state.skill_state.debug.iteration}`
    : 'Not started'

// Validation status
const validateStatus = state.skill_state.validate.passed
  ? 'PASSED'
  : state.skill_state.validate.test_results.length > 0
    ? `FAILED (${state.skill_state.validate.failed_tests.length} failures)`
    : 'Not run'
```

### Step 3: Display Menu

```javascript
const menuDisplay = `
================================================================
  CCW Loop - ${loopId}
================================================================

  Task: ${state.description}
  Iteration: ${state.current_iteration}

  +-----------------------------------------------------+
  |  Phase          |  Status                           |
  +-----------------------------------------------------+
  |  Develop        |  ${developProgress.padEnd(35)}|
  |  Debug          |  ${debugStatus.padEnd(35)}|
  |  Validate       |  ${validateStatus.padEnd(35)}|
  +-----------------------------------------------------+

================================================================

MENU_OPTIONS:
1. [develop] Continue Development - ${state.skill_state.develop.total - state.skill_state.develop.completed} tasks pending
2. [debug] Start Debugging - ${debugStatus}
3. [validate] Run Validation - ${validateStatus}
4. [status] View Detailed Status
5. [complete] Complete Loop
6. [exit] Exit (save and quit)
`

console.log(menuDisplay)
```

## Output Format

```
ACTION_RESULT:
- action: MENU
- status: success
- message: ${menuDisplay}

MENU_OPTIONS:
1. [develop] Continue Development - {N} tasks pending
2. [debug] Start Debugging - {status}
3. [validate] Run Validation - {status}
4. [status] View Detailed Status
5. [complete] Complete Loop
6. [exit] Exit (save and quit)

NEXT_ACTION_NEEDED: WAITING_INPUT
```

## User Input Handling

When user provides input, orchestrator sends it back via `send_input`:

```javascript
// User selects "develop"
send_input({
  id: agent,
  message: `
## USER INPUT RECEIVED

Action selected: develop

## EXECUTE SELECTED ACTION

Execute DEVELOP action.
`
})
```

## Status Detail View

If user selects "status":

```javascript
const detailView = `
## Detailed Status

### Development Progress

${Read(`${progressDir}/develop.md`)?.substring(0, 1000) || 'No progress recorded'}

### Debug Status

${state.skill_state.debug.hypotheses.length > 0
  ? state.skill_state.debug.hypotheses.map(h => `  ${h.id}: ${h.status} - ${h.description.substring(0, 50)}...`).join('\n')
  : '  No debugging started'}

### Validation Results

${state.skill_state.validate.test_results.length > 0
  ? `  Last run: ${state.skill_state.validate.last_run_at}
  Pass rate: ${state.skill_state.validate.pass_rate}%`
  : '  No validation run yet'}
`

console.log(detailView)

// Return to menu
return {
  action: 'MENU',
  status: 'success',
  message: detailView,
  next_action: 'MENU'  // Show menu again
}
```

## Exit Handling

If user selects "exit":

```javascript
// Save current state
state.status = 'user_exit'
state.updated_at = getUtc8ISOString()
Write(`.workflow/.loop/${loopId}.json`, JSON.stringify(state, null, 2))

return {
  action: 'MENU',
  status: 'success',
  message: 'Session saved. Use --loop-id to resume.',
  next_action: 'COMPLETED'
}
```

## Action Mapping

| User Selection | Next Action |
|----------------|-------------|
| develop | DEVELOP |
| debug | DEBUG |
| validate | VALIDATE |
| status | MENU (after showing details) |
| complete | COMPLETE |
| exit | COMPLETED (save and exit) |

## Error Handling

| Error Type | Recovery |
|------------|----------|
| Invalid selection | Show menu again |
| User cancels | Return to menu |

## Next Actions

Based on user selection - forwarded via `send_input` by orchestrator.
