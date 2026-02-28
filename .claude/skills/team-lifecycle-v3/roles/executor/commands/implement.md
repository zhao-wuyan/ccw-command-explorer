# Command: implement

## Purpose

Multi-backend code implementation: route tasks to appropriate execution backend (direct edit, subagent, or CLI), build focused prompts, execute with retry and fallback.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Plan | `<session-folder>/plan/plan.json` | Yes |
| Task files | `<session-folder>/plan/.task/TASK-*.json` | Yes |
| Backend | Task metadata / plan default / auto-select | Yes |
| Working directory | task.metadata.working_dir or project root | No |
| Wisdom | `<session-folder>/wisdom/` | No |

## Phase 3: Implementation

### Backend Selection

Priority order (first match wins):

| Priority | Source | Method |
|----------|--------|--------|
| 1 | Task metadata | `task.metadata.executor` field |
| 2 | Plan default | "Execution Backend:" line in plan.json |
| 3 | Auto-select | See auto-select table below |

**Auto-select routing**:

| Condition | Backend |
|-----------|---------|
| Description < 200 chars AND no refactor/architecture keywords AND single target file | agent (direct edit) |
| Description < 200 chars AND simple scope | agent (subagent) |
| Complex scope OR architecture keywords | codex |
| Analysis-heavy OR multi-module integration | gemini |

### Execution Paths

```
Backend selected
  ├─ agent (direct edit)
  │   └─ Read target file → Edit directly → no subagent overhead
  ├─ agent (subagent)
  │   └─ Task({ subagent_type: "code-developer", run_in_background: false })
  ├─ codex (CLI)
  │   └─ Bash(command="ccw cli ... --tool codex --mode write", run_in_background=true)
  └─ gemini (CLI)
      └─ Bash(command="ccw cli ... --tool gemini --mode write", run_in_background=true)
```

### Path 1: Direct Edit (agent, simple task)

```bash
Read(file_path="<target-file>")
Edit(file_path="<target-file>", old_string="<old>", new_string="<new>")
```

### Path 2: Subagent (agent, moderate task)

```
Task({
  subagent_type: "code-developer",
  run_in_background: false,
  description: "Implement <task-id>",
  prompt: "<execution-prompt>"
})
```

### Path 3: CLI Backend (codex or gemini)

```bash
Bash(command="ccw cli -p '<execution-prompt>' --tool <codex|gemini> --mode write --cd <working-dir>", run_in_background=true)
```

### Execution Prompt Template

All backends receive the same structured prompt:

```
# Implementation Task: <task-id>

## Task Description
<task-description>

## Acceptance Criteria
1. <criterion>

## Context from Plan
<architecture-section>
<technical-stack-section>
<task-context-section>

## Files to Modify
<target-files or "Auto-detect based on task">

## Constraints
- Follow existing code style and patterns
- Preserve backward compatibility
- Add appropriate error handling
- Include inline comments for complex logic
```

### Batch Execution

When multiple IMPL tasks exist, execute in dependency order:

```
Topological sort by task.depends_on
  ├─ Batch 1: Tasks with no dependencies → execute
  ├─ Batch 2: Tasks depending on batch 1 → execute
  └─ Batch N: Continue until all tasks complete

Progress update per batch (when > 1 batch):
  → team_msg: "Processing batch <N>/<total>: <task-id>"
```

### Retry and Fallback

**Retry** (max 3 attempts per task):

```
Attempt 1 → failure
  ├─ team_msg: "Retry 1/3 after error: <message>"
  └─ Attempt 2 → failure
      ├─ team_msg: "Retry 2/3 after error: <message>"
      └─ Attempt 3 → failure → fallback

```

**Fallback** (when primary backend fails after retries):

| Primary Backend | Fallback |
|----------------|----------|
| codex | agent (subagent) |
| gemini | agent (subagent) |
| agent (subagent) | Report failure to coordinator |
| agent (direct edit) | agent (subagent) |

## Phase 4: Validation

### Self-Validation Steps

| Step | Method | Pass Criteria |
|------|--------|--------------|
| Syntax check | `Bash(command="tsc --noEmit", timeout=30000)` | Exit code 0 |
| Acceptance match | Check criteria keywords vs modified files | All criteria addressed |
| Test detection | Search for .test.ts/.spec.ts matching modified files | Tests identified |
| File changes | `Bash(command="git diff --name-only HEAD")` | At least 1 file modified |

### Result Routing

| Outcome | Message Type | Content |
|---------|-------------|---------|
| All tasks pass validation | impl_complete | Task ID, files modified, backend used |
| Batch progress | impl_progress | Batch index, total batches, current task |
| Validation failure after retries | error | Task ID, error details, retry count |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Syntax errors after implementation | Retry with error context (max 3) |
| Backend unavailable | Fallback to agent |
| Missing dependencies | Request from coordinator |
| All retries + fallback exhausted | Report failure with full error log |
