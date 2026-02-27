---
description: Execute workflow tasks sequentially from session folder. Supports parallel execution and task filtering.
argument-hint: "SESSION=<path-to-session-folder> [--parallel] [--filter=<pattern>] [--skip-tests]"
---

# Workflow Execute (Codex Version)

## Core Principle

**Serial Execution**: Execute tasks ONE BY ONE in dependency order. Complete current task fully before moving to next. Continue autonomously until ALL tasks complete.

## Input

Session folder path via `$SESSION` (e.g., `.workflow/active/WFS-auth-system`)

- `--parallel`: Execute tasks in parallel (default: sequential)
- `--filter`: Filter tasks by pattern (e.g., `IMPL-1.*`)
- `--skip-tests`: Skip test execution

## Task Tracking (JSON Source of Truth + Codex TODO Tool)

- **Source of truth**: Task state MUST be read from and written to `$SESSION/.task/IMPL-*.json`.
- **Markdown views**: `$SESSION/TODO_LIST.md` and `$SESSION/IMPL_PLAN.md` are views; use them for ordering and display, but do NOT trust them for status.
- **Codex TODO tool**: Mirror the workflow into the built-in `update_plan` tool so progress is visible and consistent.

### Status mapping (Task JSON → `update_plan`)

- Task JSON uses workflow statuses (source of truth): `pending`, `in_progress`, `completed` (optionally also `blocked`, `cancelled`, `container`).
- `update_plan` only supports: `pending`, `in_progress`, `completed`.
- Map as:
  - `pending|blocked|cancelled|container` → `pending`
  - `in_progress` → `in_progress`
  - `completed` → `completed`

### `update_plan` rules (must follow)

1. At most ONE step can be `in_progress` at a time.
2. Do NOT jump `pending → completed`; always go through `in_progress`.
3. Do NOT batch-complete steps after the fact; update as you go.
4. If the plan changes (new tasks, re-order, merge/split), call `update_plan` with an `explanation`.
5. After calling `update_plan`, do NOT repeat the full plan in chat; only output a short progress line.
6. Keep each `step` short and stable (ID-first), e.g. `IMPL-1.1 - Add JWT middleware`.

## Autonomous Execution Loop

```
INIT: Validate session folder structure

WHILE tasks remain:
  1. Read TODO_LIST.md → Get ordered task IDs (ignore checkbox status)
  2. For each task ID, read $SESSION/.task/{task-id}.json → Get true status + deps
  3. Find FIRST eligible task:
     - status != "completed"
     - deps = taskJson.depends_on OR taskJson.context.depends_on (source of truth)
     - deps all completed (from JSON)
     - task is executable (skip status="container" or tasks with subtasks)
  4. Mark task JSON status to "in_progress" (immediately)
  5. Mirror status to `update_plan` (exactly one in_progress)
  6. Execute task fully (pre-analysis → implementation → verification)
  7. Mark task JSON status to "completed" (immediately after verification)
  8. Mirror completion to `update_plan`, output progress line, CONTINUE (DO NOT STOP)

WHEN all tasks completed:
  Output final summary
```

## Execution Steps

### Step 1: Validate Session

Check required files exist:
```
$SESSION/
├── IMPL_PLAN.md        ← Required
├── TODO_LIST.md        ← Required
└── .task/              ← Required, must have IMPL-*.json
```

If missing, report error and stop.

### Step 2: Parse TODO_LIST.md

Extract the ordered task list (IDs + titles). Do not treat checkbox states as authoritative.
```markdown
- ▸ **IMPL-1**: Parent task (container)
- [x] IMPL-1: Task 1 title (completed)
- [ ] IMPL-1.1: Task 2 title (pending) ← Execute this
- [ ] IMPL-2: Task 3 title (pending, depends on IMPL-1.1)
```

### Step 3: Find Next Executable Task

```javascript
// Sequential scan for first eligible task
for (task of todoList) {
  taskJson = read(`$SESSION/.task/${task.id}.json`)
  if (taskJson.status === "completed") continue
  if (taskJson.status === "container") continue
  
  // Check dependencies from task JSON (source of truth)
  const deps = taskJson.depends_on || taskJson.context?.depends_on || []
  if (deps.every(dep => read(`$SESSION/.task/${dep}.json`).status === "completed")) {
    return task  // Execute this one
  }
}
return null  // All done or all blocked
```

### Step 4: Load Task Context

```bash
# Read task definition
cat $SESSION/.task/$TASK_ID.json

# Read context package if exists
cat $SESSION/.process/context-package.json
```

### Step 5: Initialize Task Tracking (Codex TODO tool)

Before executing the first task, initialize `update_plan` from the ordered task list:
- Only include executable tasks (skip containers) to avoid non-actionable TODO items.
- `step`: Use a stable ID-first label like `IMPL-1.1 - {title}`.
- `status`: Map from task JSON status using the rules above.

Keep this plan updated throughout execution (see rules above).

Example initialization:
```javascript
update_plan({
  plan: [
    { step: "IMPL-1.1 - Task title", status: "pending" },
    { step: "IMPL-2 - Task title", status: "pending" }
  ]
})
```

### Step 6: Execute Task

#### 6A: Pre-Analysis (if flow_control.pre_analysis exists)
```markdown
## Pre-Analysis for: [task.title]

Execute each step:
1. [Read referenced files]
2. [Search for patterns]
3. [Load dependencies]
```

#### 6B: Implementation
```markdown
## Implementing: [task.title]

**Requirements**:
- [context.requirements[0]]
- ...

**Steps**:
1. [flow_control.implementation_approach[0].step] - [flow_control.implementation_approach[0].action]
2. [flow_control.implementation_approach[1].step] - [flow_control.implementation_approach[1].action]
...

**Focus Paths**:
- [context.focus_paths[0]]
- ...
```

#### 6C: Verification
```markdown
## Verifying: [task.title]

**Acceptance Criteria**:
- [x] [context.acceptance[0]]
- [x] [context.acceptance[1]]

All criteria met: YES → Mark completed
```

### Step 7: Update Status

Update task JSON with correct transitions:
- Before executing: `pending → in_progress`
- After verification: `in_progress → completed`

```json
{
  "id": "IMPL-1.1",
  "status": "completed",
  "completed_at": "2025-12-15T..."
}
```

### Step 8: Continue Immediately

**DO NOT STOP. Return to Step 2 to find next task.**

Output progress:
```
✓ [3/7] Completed: IMPL-1.1 - [task title]
→ Next: IMPL-2 - [next task title]
```

## Task JSON Structure

```json
{
  "id": "IMPL-1.1",
  "title": "Task Title",
  "status": "pending|in_progress|completed|blocked|cancelled|container",
  "meta": {
    "type": "feature|test|docs",
    "agent": "code-developer|test-fix-agent|..."
  },
  "context": {
    "requirements": ["Requirement 1", "Requirement 2"],
    "focus_paths": ["src/module/"],
    "acceptance": ["Criterion 1", "Criterion 2"],
    "depends_on": ["IMPL-1"]
  },
  "flow_control": {
    "pre_analysis": ["step 1", "step 2"],
    "implementation_approach": [
      { "step": "Step 1", "action": "Do X" },
      { "step": "Step 2", "action": "Do Y" }
    ]
  },
  "depends_on": ["IMPL-1"]
}
```

## Execution Rules

1. **Never stop mid-workflow** - Continue until all tasks complete
2. **One task at a time** - Fully complete before moving on
3. **Respect dependencies** - Skip blocked tasks, find next eligible
4. **Update status immediately** - Mark `in_progress` on start, `completed` right after verification
5. **Self-verify** - All acceptance criteria must pass before marking done
6. **Handle blocked state** - If all remaining tasks have unmet deps, report and stop
7. **Keep tracking in sync** - Task JSON is truth; `update_plan` must reflect the same state

## Final Summary

When ALL tasks completed:

```markdown
## Workflow Execution Complete

**Session**: $SESSION
**Total Tasks**: N
**Completed**: N

### Execution Log
| # | Task ID | Title | Status |
|---|---------|-------|--------|
| 1 | IMPL-1 | ... | ✓ |
| 2 | IMPL-1.1 | ... | ✓ |
| 3 | IMPL-2 | ... | ✓ |

### Files Modified
- `src/auth/login.ts`
- `src/utils/validator.ts`

### Summary
[What was accomplished across all tasks]
```

## Error Handling

| Situation | Action |
|-----------|--------|
| Session folder not found | Error and stop |
| Missing required files | Error: specify which file missing |
| Task JSON not found | Error, skip task, continue |
| Task blocked (deps not met) | Skip, find next eligible task |
| All tasks blocked | Report circular dependency, stop |
| Execution error | Report, set task JSON back to `pending`, continue to next eligible task |
| Verification failed | Retry once; if still failing, set back to `pending` and continue |
