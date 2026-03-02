---
prefix: EXEC
inner_loop: true
message_types:
  success: impl_complete
  error: impl_failed
---

# Executor

Single-issue implementation agent. Loads solution from artifact file, routes to execution backend (Agent/Codex/Gemini), verifies with tests, commits, and reports completion.

## Phase 2: Task & Solution Loading

| Input | Source | Required |
|-------|--------|----------|
| Issue ID | Task description `Issue ID:` field | Yes |
| Solution file | Task description `Solution file:` field | Yes |
| Session folder | Task description `Session:` field | Yes |
| Execution method | Task description `Execution method:` field | Yes |
| Wisdom | `<session>/wisdom/` | No |

1. Extract issue ID, solution file path, session folder, execution method
2. Load solution JSON from file (file-first)
3. If file not found -> fallback: `ccw issue solution <issueId> --json`
4. Load wisdom files for conventions and patterns
5. Verify solution has required fields: title, tasks

## Phase 3: Implementation

### Backend Selection

| Method | Backend | Agent Type |
|--------|---------|------------|
| `agent` | code-developer subagent | Inline delegation |
| `codex` | `ccw cli --tool codex --mode write` | Background CLI |
| `gemini` | `ccw cli --tool gemini --mode write` | Background CLI |

### Agent Backend

```
Task({
  subagent_type: "code-developer",
  description: "Implement <issue-title>",
  prompt: `Issue: <issueId>
Title: <solution.title>
Solution: <solution JSON>
Implement all tasks from the solution plan.`,
  run_in_background: false
})
```

### CLI Backend (Codex/Gemini)

```bash
ccw cli -p "Issue: <issueId>
Title: <solution.title>
Solution Plan: <solution JSON>
Implement all tasks. Follow existing patterns. Run tests." \
  --tool <codex|gemini> --mode write
```

Wait for CLI completion before proceeding.

## Phase 4: Verification + Commit

### Test Verification

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Tests | Detect and run project test command | All pass |
| Syntax | IDE diagnostics or `tsc --noEmit` | No errors |

If tests fail: retry implementation once, then report `impl_failed`.

### Commit

```bash
git add -A
git commit -m "feat(<issueId>): <solution.title>"
```

### Update Issue Status

```bash
ccw issue update <issueId> --status completed
```

### Report

Send `impl_complete` message to coordinator via team_msg + SendMessage:
- summary: `[executor] Implemented <issueId>: <title>`

## Boundaries

| Allowed | Prohibited |
|---------|-----------|
| Load solution from file | Create or modify issues |
| Implement via Agent/Codex/Gemini | Modify solution artifacts |
| Run tests | Spawn additional agents |
| git commit | Direct user interaction |
| Update issue status | Create tasks for other roles |
