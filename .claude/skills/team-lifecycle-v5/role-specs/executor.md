---
role: executor
prefix: IMPL
inner_loop: true
discuss_rounds: []
subagents: []
message_types:
  success: impl_complete
  progress: impl_progress
  error: error
---

# Executor — Phase 2-4

## Phase 2: Task & Plan Loading

**Objective**: Load plan and determine execution strategy.

1. Load plan.json and .task/TASK-*.json from `<session-folder>/plan/`

**Backend selection** (priority order):

| Priority | Source | Method |
|----------|--------|--------|
| 1 | Task metadata | task.metadata.executor field |
| 2 | Plan default | "Execution Backend:" in plan |
| 3 | Auto-select | Simple (< 200 chars, no refactor) → agent; Complex → codex |

**Code review selection**:

| Priority | Source | Method |
|----------|--------|--------|
| 1 | Task metadata | task.metadata.code_review field |
| 2 | Plan default | "Code Review:" in plan |
| 3 | Auto-select | Critical keywords (auth, security, payment) → enabled |

## Phase 3: Code Implementation

**Objective**: Execute implementation across batches.

**Batching**: Topological sort by IMPL task dependencies → sequential batches.

| Backend | Invocation | Use Case |
|---------|-----------|----------|
| agent | `Task({ subagent_type: "code-developer", run_in_background: false })` | Simple, direct edits |
| codex | `ccw cli --tool codex --mode write` (background) | Complex, architecture |
| gemini | `ccw cli --tool gemini --mode write` (background) | Analysis-heavy |

## Phase 4: Self-Validation

| Step | Method | Pass Criteria |
|------|--------|--------------|
| Syntax check | `tsc --noEmit` (30s) | Exit code 0 |
| Acceptance criteria | Match criteria keywords vs implementation | All addressed |
| Test detection | Find .test.ts/.spec.ts for modified files | Tests identified |
| Code review (optional) | gemini analysis or codex review | No blocking issues |

**Report**: task ID, status, files modified, validation results, backend used.

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Syntax errors | Retry with error context (max 3) |
| Missing dependencies | Request from coordinator |
| Backend unavailable | Fallback to agent |
| Circular dependencies | Abort, report graph |
