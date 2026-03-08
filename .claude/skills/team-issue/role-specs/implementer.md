---
prefix: BUILD
inner_loop: false
message_types:
  success: impl_complete
  failed: impl_failed
  error: error
---

# Issue Implementer

Load solution plan, route to execution backend (Agent/Codex/Gemini), run tests, and commit. Execution method determined by coordinator during task creation. Supports parallel instances for batch mode.

## Modes

| Backend | Condition | Method |
|---------|-----------|--------|
| codex | task_count > 3 or explicit | `ccw cli --tool codex --mode write --id issue-<issueId>` |
| gemini | task_count <= 3 or explicit | `ccw cli --tool gemini --mode write --id issue-<issueId>` |
| qwen | explicit | `ccw cli --tool qwen --mode write --id issue-<issueId>` |

## Phase 2: Load Solution & Resolve Executor

| Input | Source | Required |
|-------|--------|----------|
| Issue ID | Task description (GH-\d+ or ISS-\d{8}-\d{6}) | Yes |
| Bound solution | `ccw issue solutions <id> --json` | Yes |
| Explorer context | `<session>/explorations/context-<issueId>.json` | No |
| Execution method | Task description (`execution_method: Codex|Gemini|Qwen|Auto`) | Yes |
| Code review | Task description (`code_review: Skip|Gemini Review|Codex Review`) | No |

1. Extract issue ID from task description
2. If no issue ID -> report error, STOP
3. Load bound solution: `Bash("ccw issue solutions <issueId> --json")`
4. If no bound solution -> report error, STOP
5. Load explorer context (if available)
6. Resolve execution method (Auto: task_count <= 3 -> gemini, else codex)
7. Update issue status: `Bash("ccw issue update <issueId> --status in-progress")`

## Phase 3: Implementation (Multi-Backend Routing)

**Execution prompt template** (all backends):

```
## Issue
ID: <issueId>
Title: <solution.bound.title>

## Solution Plan
<solution.bound JSON>

## Codebase Context (from explorer)
Relevant files: <explorerContext.relevant_files>
Existing patterns: <explorerContext.existing_patterns>
Dependencies: <explorerContext.dependencies>

## Implementation Requirements
1. Follow the solution plan tasks in order
2. Write clean, minimal code following existing patterns
3. Run tests after each significant change
4. Ensure all existing tests still pass
5. Do NOT over-engineer

## Quality Checklist
- All solution tasks implemented
- No TypeScript/linting errors
- Existing tests pass
- New tests added where appropriate
```

Route by executor:
- **codex**: `Bash("ccw cli -p \"<prompt>\" --tool codex --mode write --id issue-<issueId>", { run_in_background: false })`
- **gemini**: `Bash("ccw cli -p \"<prompt>\" --tool gemini --mode write --id issue-<issueId>", { run_in_background: false })`
- **qwen**: `Bash("ccw cli -p \"<prompt>\" --tool qwen --mode write --id issue-<issueId>", { run_in_background: false })`

On CLI failure, resume: `ccw cli -p "Continue" --resume issue-<issueId> --tool <tool> --mode write`

## Phase 4: Verify & Commit

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Tests pass | Detect and run test command | No new failures |
| Code review | Optional, per task config | Review output logged |

- Tests pass -> optional code review -> `ccw issue update <issueId> --status resolved` -> report `impl_complete`
- Tests fail -> report `impl_failed` with truncated test output

Update `<session>/wisdom/.msg/meta.json` under `implementer` namespace:
- Read existing -> merge `{ "implementer": { issue_id, executor, test_status, review_status } }` -> write back
