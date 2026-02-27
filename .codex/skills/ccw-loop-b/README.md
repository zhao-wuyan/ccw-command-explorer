# CCW Loop-B: Hybrid Orchestrator Pattern

Iterative development workflow using coordinator + specialized workers architecture.

## Overview

CCW Loop-B implements a flexible orchestration pattern:
- **Coordinator**: Main agent managing state, user interaction, worker scheduling
- **Workers**: Specialized agents (init, develop, debug, validate, complete)
- **Modes**: Interactive / Auto / Parallel execution

## Architecture

```
Coordinator (Main Agent)
    |
    +-- Spawns Workers
    |   - ccw-loop-b-init.md
    |   - ccw-loop-b-develop.md
    |   - ccw-loop-b-debug.md
    |   - ccw-loop-b-validate.md
    |   - ccw-loop-b-complete.md
    |
    +-- Batch Wait (parallel mode)
    +-- Sequential Wait (auto/interactive)
    +-- State Management
    +-- User Interaction
```

## Subagent API

Core APIs for worker orchestration:

| API | 作用 |
|-----|------|
| `spawn_agent({ message })` | 创建 worker，返回 `agent_id` |
| `wait({ ids, timeout_ms })` | 等待结果（唯一取结果入口） |
| `send_input({ id, message })` | 继续交互 |
| `close_agent({ id })` | 关闭回收 |

**可用模式**: 单 agent 深度交互 / 多 agent 并行 / 混合模式

## Execution Modes

### Interactive Mode (default)

Coordinator displays menu, user selects action, spawns corresponding worker.

```bash
/ccw-loop-b TASK="Implement feature X"
```

**Flow**:
1. Init: Parse task, create breakdown
2. Menu: Show options to user
3. User selects action (develop/debug/validate)
4. Spawn worker for selected action
5. Wait for result
6. Display result, back to menu
7. Repeat until complete

### Auto Mode

Automated sequential execution following predefined workflow.

```bash
/ccw-loop-b --mode=auto TASK="Fix bug Y"
```

**Flow**:
1. Init → 2. Develop → 3. Validate → 4. Complete

If issues found: loop back to Debug → Develop → Validate

### Parallel Mode

Spawn multiple workers simultaneously, batch wait for results.

```bash
/ccw-loop-b --mode=parallel TASK="Analyze module Z"
```

**Flow**:
1. Init: Create analysis plan
2. Spawn workers in parallel: [develop, debug, validate]
3. Batch wait: `wait({ ids: [w1, w2, w3] })`
4. Merge results
5. Coordinator decides next action
6. Complete

## Session Structure

```
.workflow/.loop/
+-- {loopId}.json                    # Master state
+-- {loopId}.workers/                # Worker outputs
|   +-- init.output.json
|   +-- develop.output.json
|   +-- debug.output.json
|   +-- validate.output.json
|   +-- complete.output.json
+-- {loopId}.progress/               # Human-readable logs
    +-- develop.md
    +-- debug.md
    +-- validate.md
    +-- summary.md
```

## Worker Responsibilities

| Worker | Role | Specialization |
|--------|------|----------------|
| **init** | Session initialization | Task parsing, breakdown, planning |
| **develop** | Code implementation | File operations, pattern matching, incremental development |
| **debug** | Problem diagnosis | Root cause analysis, hypothesis testing, fix recommendations |
| **validate** | Testing & verification | Test execution, coverage analysis, quality gates |
| **complete** | Session finalization | Summary generation, commit preparation, cleanup |

## Usage Examples

### Example 1: Simple Feature Implementation

```bash
/ccw-loop-b TASK="Add user logout function"
```

**Auto flow**:
- Init: Parse requirements
- Develop: Implement logout in `src/auth.ts`
- Validate: Run tests
- Complete: Generate commit message

### Example 2: Bug Investigation

```bash
/ccw-loop-b TASK="Fix memory leak in WebSocket handler"
```

**Interactive flow**:
1. Init: Parse issue
2. User selects "debug" → Spawn debug worker
3. Debug: Root cause analysis → recommends fix
4. User selects "develop" → Apply fix
5. User selects "validate" → Verify fix works
6. User selects "complete" → Generate summary

### Example 3: Comprehensive Analysis

```bash
/ccw-loop-b --mode=parallel TASK="Analyze payment module for improvements"
```

**Parallel flow**:
- Spawn [develop, debug, validate] workers simultaneously
- Develop: Analyze code quality and patterns
- Debug: Identify potential issues
- Validate: Check test coverage
- Wait for all three to complete
- Merge findings into comprehensive report

### Example 4: Resume Existing Loop

```bash
/ccw-loop-b --loop-id=loop-b-20260122-abc123
```

Continues from previous state, respects status (running/paused).

## Key Features

### 1. Worker Specialization

Each worker focuses on one domain:
- **No overlap**: Clear boundaries between workers
- **Reusable**: Same worker for different tasks
- **Composable**: Combine workers for complex workflows

### 2. Flexible Coordination

Coordinator adapts to mode:
- **Interactive**: Menu-driven, user controls flow
- **Auto**: Predetermined sequence
- **Parallel**: Concurrent execution with batch wait

### 3. State Management

Unified state at `.workflow/.loop/{loopId}.json`:
- **API compatible**: Works with CCW API
- **Extension fields**: Skill-specific data in `skill_state`
- **Worker outputs**: Structured JSON for each action

### 4. Progress Tracking

Human-readable logs:
- **Per-worker progress**: `{action}.md` files
- **Summary**: Consolidated achievements
- **Commit-ready**: Formatted commit messages

## Best Practices

1. **Start with Init**: Always initialize before execution
2. **Use appropriate mode**:
   - Interactive: Complex tasks needing user decisions
   - Auto: Well-defined workflows
   - Parallel: Independent analysis tasks
3. **Clean up workers**: `close_agent()` after each worker completes
4. **Batch wait wisely**: Use in parallel mode for efficiency
5. **Track progress**: Document in progress files
6. **Validate often**: After each develop phase

## Implementation Patterns

### Pattern 1: Single Worker Deep Interaction

```javascript
const workerId = spawn_agent({ message: workerPrompt })
const result1 = wait({ ids: [workerId] })

// Continue with same worker
send_input({ id: workerId, message: "Continue with next task" })
const result2 = wait({ ids: [workerId] })

close_agent({ id: workerId })
```

### Pattern 2: Multi-Worker Parallel

```javascript
const workers = {
  develop: spawn_agent({ message: developPrompt }),
  debug: spawn_agent({ message: debugPrompt }),
  validate: spawn_agent({ message: validatePrompt })
}

// Batch wait
const results = wait({ ids: Object.values(workers), timeout_ms: 900000 })

// Process all results
Object.values(workers).forEach(id => close_agent({ id }))
```

### Pattern 3: Sequential Worker Chain

```javascript
const actions = ['init', 'develop', 'validate', 'complete']

for (const action of actions) {
  const workerId = spawn_agent({ message: buildPrompt(action) })
  const result = wait({ ids: [workerId] })
  
  updateState(action, result)
  close_agent({ id: workerId })
}
```

## Error Handling

| Error | Recovery |
|-------|----------|
| Worker timeout | `send_input` request convergence |
| Worker fails | Log error, coordinator decides retry strategy |
| Partial results | Use completed workers, mark incomplete |
| State corruption | Rebuild from progress files |

## File Structure

```
.codex/skills/ccw-loop-b/
+-- SKILL.md                         # Entry point
+-- README.md                        # This file
+-- phases/
|   +-- state-schema.md              # State structure definition
+-- specs/
    +-- action-catalog.md            # Action reference

.codex/agents/
+-- ccw-loop-b-init.md               # Worker: Init
+-- ccw-loop-b-develop.md            # Worker: Develop
+-- ccw-loop-b-debug.md              # Worker: Debug
+-- ccw-loop-b-validate.md           # Worker: Validate
+-- ccw-loop-b-complete.md           # Worker: Complete
```

## Comparison: ccw-loop vs ccw-loop-b

| Aspect | ccw-loop | ccw-loop-b |
|--------|----------|------------|
| Pattern | Single agent, multi-phase | Coordinator + workers |
| Worker model | Single agent handles all | Specialized workers per action |
| Parallelization | Sequential only | Supports parallel mode |
| Flexibility | Fixed sequence | Mode-based (interactive/auto/parallel) |
| Best for | Simple linear workflows | Complex tasks needing specialization |

## Contributing

To add new workers:
1. Create worker role file in `.codex/agents/`
2. Define clear responsibilities
3. Update `action-catalog.md`
4. Add worker to coordinator spawn logic
5. Test integration with existing workers
