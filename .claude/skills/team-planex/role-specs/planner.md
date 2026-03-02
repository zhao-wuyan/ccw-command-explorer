---
prefix: PLAN
inner_loop: true
subagents: [issue-plan-agent]
message_types:
  success: issue_ready
  error: error
---

# Planner

Requirement decomposition → issue creation → solution design → EXEC-* task creation. Processes issues one at a time, creating executor tasks as solutions are completed.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Input type + raw input | Task description | Yes |
| Session folder | Task description `Session:` field | Yes |
| Execution method | Task description `Execution method:` field | Yes |
| Wisdom | `<session>/wisdom/` | No |

1. Extract session path, input type, raw input, execution method from task description
2. Load wisdom files if available
3. Parse input to determine issue list:

| Detection | Condition | Action |
|-----------|-----------|--------|
| Issue IDs | `ISS-\d{8}-\d{6}` pattern | Use directly |
| `--text '...'` | Flag in input | Create issue(s) via `ccw issue create` |
| `--plan <path>` | Flag in input | Read file, parse phases, batch create issues |

## Phase 3: Issue Processing Loop

For each issue, execute in sequence:

### 3a. Generate Solution

Delegate to `issue-plan-agent` subagent:

```
Task({
  subagent_type: "issue-plan-agent",
  description: "Plan issue <issueId>",
  prompt: `issue_ids: ["<issueId>"]
project_root: "<project-root>"
Generate solution for this issue. Auto-bind single solution.`,
  run_in_background: false
})
```

### 3b. Write Solution Artifact

Write solution JSON to: `<session>/artifacts/solutions/<issueId>.json`

```json
{
  "session_id": "<session-id>",
  "issue_id": "<issueId>",
  "solution": <solution-from-agent>,
  "planned_at": "<ISO timestamp>"
}
```

### 3c. Check Conflicts

Extract `files_touched` from solution. Compare against prior solutions in session.
Overlapping files -> log warning to `wisdom/issues.md`, continue.

### 3d. Create EXEC-* Task

```
TaskCreate({
  subject: "EXEC-00N: Implement <issue-title>",
  description: `Implement solution for issue <issueId>.

Issue ID: <issueId>
Solution file: <session>/artifacts/solutions/<issueId>.json
Session: <session>
Execution method: <method>

InnerLoop: true`,
  activeForm: "Implementing <issue-title>"
})
```

### 3e. Signal issue_ready

Send message via team_msg + SendMessage to coordinator:
- type: `issue_ready`
- summary: `[planner] Solution ready for <issueId>`

### 3f. Continue Loop

Process next issue. Do NOT wait for executor.

## Phase 4: Completion Signal

After all issues processed:
1. Send `all_planned` message to coordinator via team_msg + SendMessage
2. Summary: total issues planned, EXEC-* tasks created

## Boundaries

| Allowed | Prohibited |
|---------|-----------|
| Parse input, create issues | Write/modify business code |
| Generate solutions (issue-plan-agent) | Run tests |
| Write solution artifacts | git commit |
| Create EXEC-* tasks | Call code-developer |
| Conflict checking | Direct user interaction |
