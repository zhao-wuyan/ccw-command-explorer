# CCW Loop Skill (Codex Version)

Stateless iterative development loop workflow using Codex subagent pattern.

## Overview

CCW Loop is an autonomous development workflow that supports:
- **Develop**: Task decomposition -> Code implementation -> Progress tracking
- **Debug**: Hypothesis generation -> Evidence collection -> Root cause analysis
- **Validate**: Test execution -> Coverage check -> Quality assessment

## Subagent 机制

核心 API: `spawn_agent` / `wait` / `send_input` / `close_agent`

可用模式: 单 agent 深度交互 / 多 agent 并行 / 混合模式

## Installation

Files are in `.codex/skills/ccw-loop/`:

```
.codex/skills/ccw-loop/
+-- SKILL.md                    # Main skill definition
+-- README.md                   # This file
+-- phases/
|   +-- orchestrator.md         # Orchestration logic
|   +-- state-schema.md         # State structure
|   +-- actions/
|       +-- action-init.md      # Initialize session
|       +-- action-develop.md   # Development task
|       +-- action-debug.md     # Hypothesis debugging
|       +-- action-validate.md  # Test validation
|       +-- action-complete.md  # Complete loop
|       +-- action-menu.md      # Interactive menu
+-- specs/
|   +-- action-catalog.md       # Action catalog
+-- templates/
    +-- (templates)

.codex/agents/
+-- ccw-loop-executor.md        # Executor agent role
```

## Usage

### Start New Loop

```bash
# Direct call with task description
/ccw-loop TASK="Implement user authentication"

# Auto-cycle mode
/ccw-loop --auto TASK="Fix login bug and add tests"
```

### Continue Existing Loop

```bash
# Resume from loop ID
/ccw-loop --loop-id=loop-v2-20260122-abc123

# API triggered (from Dashboard)
/ccw-loop --loop-id=loop-v2-20260122-abc123 --auto
```

## Execution Flow

```
1. Parse arguments (task or --loop-id)
2. Create/read state from .workflow/.loop/{loopId}.json
3. spawn_agent with ccw-loop-executor role
4. Main loop:
   a. wait() for agent output
   b. Parse ACTION_RESULT
   c. Handle outcome:
      - COMPLETED/PAUSED/STOPPED: exit loop
      - WAITING_INPUT: collect user input, send_input
      - Next action: send_input to continue
   d. Update state file
5. close_agent when done
```

## Session Files

```
.workflow/.loop/
+-- {loopId}.json              # Master state (API + Skill)
+-- {loopId}.progress/
    +-- develop.md             # Development timeline
    +-- debug.md               # Understanding evolution
    +-- validate.md            # Validation report
    +-- changes.log            # Code changes (NDJSON)
    +-- debug.log              # Debug log (NDJSON)
    +-- summary.md             # Completion summary
```

## Codex Pattern Highlights

### Single Agent Deep Interaction

Instead of creating multiple agents, use `send_input` for multi-phase:

```javascript
const agent = spawn_agent({ message: role + task })

// Phase 1: INIT
const initResult = wait({ ids: [agent] })

// Phase 2: DEVELOP (via send_input, same agent)
send_input({ id: agent, message: 'Execute DEVELOP' })
const devResult = wait({ ids: [agent] })

// Phase 3: VALIDATE (via send_input, same agent)
send_input({ id: agent, message: 'Execute VALIDATE' })
const valResult = wait({ ids: [agent] })

// Only close when all done
close_agent({ id: agent })
```

### Role Path Passing

Agent reads role file itself (no content embedding):

```javascript
spawn_agent({
  message: `
### MANDATORY FIRST STEPS
1. **Read role definition**: ~/.codex/agents/ccw-loop-executor.md
2. Read: .workflow/project-tech.json
...
`
})
```

### Explicit Lifecycle Management

- Always use `wait({ ids })` to get results
- Never assume `close_agent` returns results
- Only `close_agent` when confirming no more interaction needed

## Error Handling

| Situation | Action |
|-----------|--------|
| Agent timeout | `send_input` requesting convergence |
| Session not found | Create new session |
| State corrupted | Rebuild from progress files |
| Tests fail | Loop back to DEBUG |
| >10 iterations | Warn and suggest break |

## Integration

### Dashboard Integration

Works with CCW Dashboard Loop Monitor:
- Dashboard creates loop via API
- API triggers this skill with `--loop-id`
- Skill reads/writes `.workflow/.loop/{loopId}.json`
- Dashboard polls state for real-time updates

### Control Signals

- `paused`: Skill exits gracefully, waits for resume
- `failed`: Skill terminates
- `running`: Skill continues execution

## License

MIT
