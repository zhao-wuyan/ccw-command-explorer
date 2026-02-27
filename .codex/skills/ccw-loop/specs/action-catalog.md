# Action Catalog (Codex Version)

CCW Loop available actions and their specifications.

## Available Actions

| Action | Purpose | Preconditions | Effects | Output |
|--------|---------|---------------|---------|--------|
| INIT | Initialize session | status=running, skill_state=null | skill_state initialized | progress/*.md created |
| MENU | Display action menu | skill_state!=null, mode=interactive | Wait for user input | WAITING_INPUT |
| DEVELOP | Execute dev task | pending tasks > 0 | Update progress.md | develop.md updated |
| DEBUG | Hypothesis debug | needs debugging | Update understanding.md | debug.md updated |
| VALIDATE | Run tests | needs validation | Update validation.md | validate.md updated |
| COMPLETE | Finish loop | all done | status=completed | summary.md created |

## Action Flow (Codex Pattern)

```
spawn_agent (ccw-loop-executor)
       |
       v
   +-------+
   |  INIT |  (if skill_state is null)
   +-------+
       |
       v
   +-------+    send_input
   |  MENU | <------------- (user selection in interactive mode)
   +-------+
       |
   +---+---+---+---+
   |   |   |   |   |
   v   v   v   v   v
 DEV DBG VAL CMP EXIT
       |
       v
   wait() -> get result
       |
       v
   [Loop continues via send_input]
       |
       v
  close_agent()
```

## Action Execution Pattern

### Single Agent Deep Interaction

All actions executed within same agent via `send_input`:

```javascript
// Initial spawn
const agent = spawn_agent({ message: role + initial_task })

// Execute INIT
const initResult = wait({ ids: [agent] })

// Continue with DEVELOP via send_input
send_input({ id: agent, message: 'Execute DEVELOP' })
const devResult = wait({ ids: [agent] })

// Continue with VALIDATE via send_input
send_input({ id: agent, message: 'Execute VALIDATE' })
const valResult = wait({ ids: [agent] })

// Only close when done
close_agent({ id: agent })
```

### Action Output Format (Standardized)

Every action MUST output:

```
ACTION_RESULT:
- action: {ACTION_NAME}
- status: success | failed | needs_input
- message: {user-facing message}
- state_updates: { ... }

FILES_UPDATED:
- {file_path}: {description}

NEXT_ACTION_NEEDED: {NEXT_ACTION} | WAITING_INPUT | COMPLETED | PAUSED
```

## Action Selection Logic

### Auto Mode

```javascript
function selectNextAction(state) {
  const skillState = state.skill_state

  // 1. Terminal conditions
  if (state.status === 'completed') return null
  if (state.status === 'failed') return null
  if (state.current_iteration >= state.max_iterations) return 'COMPLETE'

  // 2. Initialization check
  if (!skillState) return 'INIT'

  // 3. Auto selection based on state
  const hasPendingDevelop = skillState.develop.tasks.some(t => t.status === 'pending')

  if (hasPendingDevelop) {
    return 'DEVELOP'
  }

  if (skillState.last_action === 'DEVELOP') {
    const needsDebug = skillState.develop.completed < skillState.develop.total
    if (needsDebug) return 'DEBUG'
  }

  if (skillState.last_action === 'DEBUG' || skillState.debug.confirmed_hypothesis) {
    return 'VALIDATE'
  }

  if (skillState.last_action === 'VALIDATE') {
    if (!skillState.validate.passed) return 'DEVELOP'
  }

  if (skillState.validate.passed && !hasPendingDevelop) {
    return 'COMPLETE'
  }

  return 'DEVELOP'
}
```

### Interactive Mode

Returns `MENU` action, which displays options and waits for user input.

## Action Dependencies

| Action | Depends On | Leads To |
|--------|------------|----------|
| INIT | - | MENU or DEVELOP |
| MENU | INIT | User selection |
| DEVELOP | INIT | DEVELOP, DEBUG, VALIDATE |
| DEBUG | INIT | DEVELOP, VALIDATE |
| VALIDATE | DEVELOP or DEBUG | COMPLETE, DEBUG, DEVELOP |
| COMPLETE | - | Terminal |

## Action Sequences

### Happy Path (Auto Mode)

```
INIT -> DEVELOP -> DEVELOP -> DEVELOP -> VALIDATE (pass) -> COMPLETE
```

### Debug Iteration Path

```
INIT -> DEVELOP -> VALIDATE (fail) -> DEBUG -> DEBUG -> VALIDATE (pass) -> COMPLETE
```

### Interactive Path

```
INIT -> MENU -> (user: develop) -> DEVELOP -> MENU -> (user: validate) -> VALIDATE -> MENU -> (user: complete) -> COMPLETE
```

## Error Recovery

| Error | Recovery |
|-------|----------|
| Action timeout | send_input requesting convergence |
| Action failed | Log error, continue or retry |
| Agent closed unexpectedly | Re-spawn with previous output |
| State corrupted | Rebuild from progress files |

## Codex Best Practices

1. **Single agent for all actions**: No need to spawn new agent for each action
2. **Deep interaction via send_input**: Continue conversation in same context
3. **Delayed close_agent**: Only close after all actions complete
4. **Structured output**: Always use ACTION_RESULT format for parsing
5. **Control signal checking**: Check state.status before every action
