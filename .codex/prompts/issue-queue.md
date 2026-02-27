---
description: Form execution queue from bound solutions using subagent for conflict analysis and ordering
argument-hint: "[--queues <n>] [--issue <id>] [--append <id>]"
---

# Issue Queue (Codex Version)

## Goal

Create an ordered execution queue from all bound solutions. Uses **subagent pattern** to analyze inter-solution file conflicts, calculate semantic priorities, and assign parallel/sequential execution groups.

**Design Principle**: Queue items are **solutions**, not individual tasks. Each executor receives a complete solution with all its tasks.

## Core Guidelines

**⚠️ Data Access Principle**: Issues and queue files can grow very large. To avoid context overflow:

| Operation | Correct | Incorrect |
|-----------|---------|-----------|
| List issues (brief) | `ccw issue list --status planned --brief` | Read issues.jsonl |
| List queue (brief) | `ccw issue queue --brief` | Read queues/*.json |
| Read issue details | `ccw issue status <id> --json` | Read issues.jsonl |
| Get next item | `ccw issue next --json` | Read queues/*.json |
| Sync from queue | `ccw issue update --from-queue` | Direct file edit |

**ALWAYS** use CLI commands for CRUD operations. **NEVER** read entire `issues.jsonl` or `queues/*.json` directly.

## Inputs

- **All planned**: Default behavior → queue all issues with `planned` status and bound solutions
- **Multiple queues**: `--queues <n>` → create N parallel queues
- **Specific issue**: `--issue <id>` → queue only that issue's solution
- **Append mode**: `--append <id>` → append issue to active queue (don't create new)

## Output Requirements

**Generate Files (EXACTLY 2):**
1. `.workflow/issues/queues/{queue-id}.json` - Full queue with solutions, conflicts, groups
2. `.workflow/issues/queues/index.json` - Update with new queue entry

**Return Summary:**
```json
{
  "queue_id": "QUE-YYYYMMDD-HHMMSS",
  "total_solutions": 3,
  "total_tasks": 12,
  "execution_groups": [{ "id": "P1", "type": "parallel", "count": 2 }],
  "conflicts_resolved": 1,
  "issues_queued": ["ISS-xxx", "ISS-yyy"]
}
```

## Workflow

### Step 1: Generate Queue ID and Load Solutions

```bash
# Generate queue ID
QUEUE_ID="QUE-$(date -u +%Y%m%d-%H%M%S)"

# Load planned issues with bound solutions
ccw issue list --status planned --json
```

For each issue, extract:
- `id`, `bound_solution_id`, `priority`
- Read solution from `.workflow/issues/solutions/{issue-id}.jsonl`
- Collect `files_touched` from all tasks' `modification_points.file`

Build solution list:
```json
[
  {
    "issue_id": "ISS-xxx",
    "solution_id": "SOL-xxx",
    "task_count": 3,
    "files_touched": ["src/auth.ts", "src/utils.ts"],
    "priority": "medium"
  }
]
```

### Step 2: Spawn Queue Agent for Conflict Analysis

Spawn subagent to analyze conflicts and order solutions:

```javascript
const agentId = spawn_agent({
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/issue-queue-agent.md (MUST read first)
2. Read: .workflow/project-tech.json
3. Read: .workflow/project-guidelines.json

---

Goal: Order ${solutions.length} solutions into execution queue with conflict resolution

Scope:
- CAN DO: Analyze file conflicts, calculate priorities, assign groups
- CANNOT DO: Execute solutions, modify code
- Queue ID: ${QUEUE_ID}

Context:
- Solutions: ${JSON.stringify(solutions, null, 2)}
- Project Root: ${process.cwd()}

Deliverables:
1. Write queue JSON to: .workflow/issues/queues/${QUEUE_ID}.json
2. Update index: .workflow/issues/queues/index.json
3. Return summary JSON

Quality bar:
- No circular dependencies in DAG
- Parallel groups have NO file overlaps
- Semantic priority calculated (0.0-1.0)
- All conflicts resolved with rationale
`
})

// Wait for agent completion
const result = wait({ ids: [agentId], timeout_ms: 600000 })

// Parse result
const summary = JSON.parse(result.status[agentId].completed)

// Check for clarifications
if (summary.clarifications?.length > 0) {
  // Handle high-severity conflicts requiring user input
  for (const clarification of summary.clarifications) {
    console.log(`Conflict: ${clarification.question}`)
    console.log(`Options: ${clarification.options.join(', ')}`)
    // Get user input and send back
    send_input({
      id: agentId,
      message: `Conflict ${clarification.conflict_id} resolved: ${userChoice}`
    })
    wait({ ids: [agentId], timeout_ms: 300000 })
  }
}

// Close agent
close_agent({ id: agentId })
```

### Step 3: Multi-Queue Support (if --queues > 1)

When creating multiple parallel queues:

1. **Partition solutions** to minimize cross-queue file conflicts
2. **Spawn N agents in parallel** (one per queue)
3. **Wait for all agents** with batch wait

```javascript
// Partition solutions by file overlap
const partitions = partitionSolutions(solutions, numQueues)

// Spawn agents in parallel
const agentIds = partitions.map((partition, i) => 
  spawn_agent({
    message: buildQueuePrompt(partition, `${QUEUE_ID}-${i+1}`, i+1, numQueues)
  })
)

// Batch wait for all agents
const results = wait({ ids: agentIds, timeout_ms: 600000 })

// Collect clarifications from all agents
const allClarifications = agentIds.flatMap((id, i) => 
  (results.status[id].clarifications || []).map(c => ({ ...c, queue_id: `${QUEUE_ID}-${i+1}`, agent_id: id }))
)

// Handle clarifications, then close all agents
agentIds.forEach(id => close_agent({ id }))
```

### Step 4: Update Issue Statuses

**MUST use CLI command:**

```bash
# Batch update from queue (recommended)
ccw issue update --from-queue ${QUEUE_ID}

# Or individual update
ccw issue update <issue-id> --status queued
```

### Step 5: Active Queue Check

```bash
ccw issue queue list --brief
```

**Decision:**
- If no active queue: `ccw issue queue switch ${QUEUE_ID}`
- If active queue exists: Present options to user

```
Active queue exists. Choose action:
1. Merge into existing queue
2. Use new queue (keep existing in history)
3. Cancel (delete new queue)

Select (1-3):
```

### Step 6: Output Summary

```markdown
## Queue Formed: ${QUEUE_ID}

**Solutions**: 5
**Tasks**: 18
**Execution Groups**: 3

### Execution Order
| # | Item | Issue | Tasks | Group | Files |
|---|------|-------|-------|-------|-------|
| 1 | S-1 | ISS-001 | 3 | P1 | src/auth.ts |
| 2 | S-2 | ISS-002 | 2 | P1 | src/api.ts |
| 3 | S-3 | ISS-003 | 4 | S2 | src/auth.ts |

### Conflicts Resolved
- src/auth.ts: S-1 → S-3 (sequential, S-1 creates module)

**Next Step**: `/issue:execute --queue ${QUEUE_ID}`
```

## Subagent Role Reference

Queue agent uses role file at: `~/.codex/agents/issue-queue-agent.md`

Role capabilities:
- File conflict detection (5 types)
- Dependency DAG construction
- Semantic priority calculation
- Execution group assignment

## Queue File Schema

```json
{
  "id": "QUE-20251228-120000",
  "status": "active",
  "issue_ids": ["ISS-001", "ISS-002"],
  "solutions": [
    {
      "item_id": "S-1",
      "issue_id": "ISS-001",
      "solution_id": "SOL-ISS-001-1",
      "status": "pending",
      "execution_order": 1,
      "execution_group": "P1",
      "depends_on": [],
      "semantic_priority": 0.8,
      "files_touched": ["src/auth.ts"],
      "task_count": 3
    }
  ],
  "conflicts": [...],
  "execution_groups": [...]
}
```

## Quality Checklist

Before completing, verify:

- [ ] Exactly 2 files generated: queue JSON + index update
- [ ] Queue has valid DAG (no circular dependencies)
- [ ] All file conflicts resolved with rationale
- [ ] Semantic priority calculated for each solution (0.0-1.0)
- [ ] Execution groups assigned (P* for parallel, S* for sequential)
- [ ] Issue statuses updated to `queued`
- [ ] All subagents closed after completion

## Error Handling

| Situation | Action |
|-----------|--------|
| No planned issues | Return empty queue summary |
| Circular dependency detected | Abort, report cycle details |
| Missing solution file | Skip issue, log warning |
| Agent timeout | Retry with increased timeout |
| Clarification rejected | Abort queue formation |

## Start Execution

Begin by listing planned issues:

```bash
ccw issue list --status planned --json
```

Then extract solution data and spawn queue agent.
