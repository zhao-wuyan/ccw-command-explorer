---
description: Plan issue(s) into bound solutions using subagent pattern (explore + plan closed-loop)
argument-hint: "<issue-id>[,<issue-id>,...] [--all-pending] [--batch-size 4]"
---

# Issue Plan (Codex Version)

## Goal

Create executable solution(s) for issue(s) and bind the selected solution to each issue using `ccw issue bind`.

This workflow uses **subagent pattern** for parallel batch processing: spawn planning agents per batch, wait for results, handle multi-solution selection.

## Core Guidelines

**⚠️ Data Access Principle**: Issues and solutions files can grow very large. To avoid context overflow:

| Operation | Correct | Incorrect |
|-----------|---------|-----------|
| List issues (brief) | `ccw issue list --status pending --brief` | Read issues.jsonl |
| Read issue details | `ccw issue status <id> --json` | Read issues.jsonl |
| Update status | `ccw issue update <id> --status ...` | Direct file edit |
| Bind solution | `ccw issue bind <id> <sol-id>` | Direct file edit |

**ALWAYS** use CLI commands for CRUD operations. **NEVER** read entire `issues.jsonl` or `solutions/*.jsonl` directly.

## Inputs

- **Explicit issues**: comma-separated IDs, e.g. `ISS-123,ISS-124`
- **All pending**: `--all-pending` → plan all issues in `registered` status
- **Batch size**: `--batch-size N` (default `4`) → max issues per subagent batch

## Output Requirements

For each issue:
- Register at least one solution and bind one solution to the issue
- Ensure tasks conform to `~/.claude/workflows/cli-templates/schemas/solution-schema.json`
- Each task includes quantified `acceptance.criteria` and concrete `acceptance.verification`

Return a final summary JSON:
```json
{
  "bound": [{ "issue_id": "...", "solution_id": "...", "task_count": 0 }],
  "pending_selection": [{ "issue_id": "...", "solutions": [{ "id": "...", "task_count": 0, "description": "..." }] }],
  "conflicts": [{ "file": "...", "issues": ["..."] }]
}
```

## Workflow

### Step 1: Resolve Issue List

**If `--all-pending`:**
```bash
ccw issue list --status registered --json
```

**Else (explicit IDs):**
```bash
# For each ID, ensure exists
ccw issue init <issue-id> --title "Issue <issue-id>" 2>/dev/null || true
ccw issue status <issue-id> --json
```

### Step 2: Group Issues by Similarity

Group issues for batch processing (max 4 per batch):

```bash
# Extract issue metadata for grouping
ccw issue list --status registered --brief --json
```

Group by:
- Shared tags
- Similar keywords in title
- Related components

### Step 3: Spawn Planning Subagents (Parallel)

For each batch, spawn a planning subagent:

```javascript
// Subagent message structure
spawn_agent({
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/issue-plan-agent.md (MUST read first)
2. Read: .workflow/project-tech.json
3. Read: .workflow/project-guidelines.json
4. Read schema: ~/.claude/workflows/cli-templates/schemas/solution-schema.json

---

Goal: Plan solutions for ${batch.length} issues with executable task breakdown

Scope:
- CAN DO: Explore codebase, design solutions, create tasks
- CANNOT DO: Execute solutions, modify production code
- Directory: ${process.cwd()}

Context:
- Issues: ${batch.map(i => `${i.id}: ${i.title}`).join('\n')}
- Fetch full details: ccw issue status <id> --json

Deliverables:
- For each issue: Write solution to .workflow/issues/solutions/{issue-id}.jsonl
- Single solution → auto-bind via ccw issue bind
- Multiple solutions → return in pending_selection

Quality bar:
- Tasks have quantified acceptance.criteria
- Each task includes test.commands
- Solution follows schema exactly
`
})
```

**Batch execution (parallel):**
```javascript
// Launch all batches in parallel
const agentIds = batches.map(batch => spawn_agent({ message: buildPrompt(batch) }))

// Wait for all agents to complete
const results = wait({ ids: agentIds, timeout_ms: 900000 })  // 15 min

// Collect results
const allBound = []
const allPendingSelection = []
const allConflicts = []

for (const id of agentIds) {
  if (results.status[id].completed) {
    const result = JSON.parse(results.status[id].completed)
    allBound.push(...(result.bound || []))
    allPendingSelection.push(...(result.pending_selection || []))
    allConflicts.push(...(result.conflicts || []))
  }
}

// Close all agents
agentIds.forEach(id => close_agent({ id }))
```

### Step 4: Handle Multi-Solution Selection

If `pending_selection` is non-empty, present options:

```
Issue ISS-001 has multiple solutions:
1. SOL-ISS-001-1: Refactor with adapter pattern (3 tasks)
2. SOL-ISS-001-2: Direct implementation (2 tasks)

Select solution (1-2):
```

Bind selected solution:
```bash
ccw issue bind ISS-001 SOL-ISS-001-1
```

### Step 5: Handle Conflicts

If conflicts detected:
- Low/Medium severity: Auto-resolve with recommended order
- High severity: Present to user for decision

### Step 6: Update Issue Status

After binding, update status:
```bash
ccw issue update <issue-id> --status planned
```

### Step 7: Output Summary

```markdown
## Planning Complete

**Planned**: 5 issues
**Bound Solutions**: 4
**Pending Selection**: 1

### Bound Solutions
| Issue | Solution | Tasks |
|-------|----------|-------|
| ISS-001 | SOL-ISS-001-1 | 3 |
| ISS-002 | SOL-ISS-002-1 | 2 |

### Pending Selection
- ISS-003: 2 solutions available (user selection required)

### Conflicts Detected
- src/auth.ts touched by ISS-001, ISS-002 (resolved: sequential)

**Next Step**: `/issue:queue`
```

## Subagent Role Reference

Planning subagent uses role file at: `~/.codex/agents/issue-plan-agent.md`

Role capabilities:
- Codebase exploration (rg, file reading)
- Solution design with task breakdown
- Schema validation
- Solution registration via CLI

## Quality Checklist

Before completing, verify:

- [ ] All input issues have solutions in `solutions/{issue-id}.jsonl`
- [ ] Single solution issues are auto-bound (`bound_solution_id` set)
- [ ] Multi-solution issues returned in `pending_selection` for user choice
- [ ] Each solution has executable tasks with `modification_points`
- [ ] Task acceptance criteria are quantified (not vague)
- [ ] Conflicts detected and reported (if multiple issues touch same files)
- [ ] Issue status updated to `planned` after binding
- [ ] All subagents closed after completion

## Error Handling

| Error | Resolution |
|-------|------------|
| Issue not found | Auto-create via `ccw issue init` |
| Subagent timeout | Retry with increased timeout or smaller batch |
| No solutions generated | Display error, suggest manual planning |
| User cancels selection | Skip issue, continue with others |
| File conflicts | Detect and suggest resolution order |

## Start Execution

Begin by resolving issue list:

```bash
# Default to all pending
ccw issue list --status registered --brief --json

# Or with explicit IDs
ccw issue status ISS-001 --json
```

Then group issues and spawn planning subagents.
