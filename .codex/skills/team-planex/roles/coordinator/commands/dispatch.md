# Command: dispatch

## Purpose

Create the initial task chain for team-planex pipeline. Creates PLAN-001 for planner. EXEC-* tasks are NOT pre-created -- planner creates them at runtime per issue.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Input type | Phase 1 requirements | Yes |
| Raw input | Phase 1 requirements | Yes |
| Session folder | Phase 2 session init | Yes |
| Execution method | Phase 1 requirements | Yes |

## Phase 3: Task Chain Creation

### Task Creation

Create a single PLAN-001 task entry in tasks.json:

```json
[
  {
    "id": "PLAN-001",
    "title": "PLAN-001: Requirement decomposition and solution design",
    "description": "Decompose requirements into issues and generate solutions.\n\nInput type: <issues|text|plan>\nInput: <raw-input>\nSession: <session-folder>\nExecution method: <agent|codex|gemini>\n\n## Instructions\n1. Parse input to get issue list\n2. For each issue: call issue-plan-agent -> write solution artifact\n3. After each solution: create EXEC-* task entry in tasks.json with solution_file path, role: executor\n4. After all issues: send all_planned signal\n\nInnerLoop: true",
    "status": "pending",
    "role": "planner",
    "prefix": "PLAN",
    "deps": [],
    "findings": "",
    "error": ""
  }
]
```

### EXEC-* Task Template (for planner reference)

Planner creates EXEC-* task entries in tasks.json at runtime using this template:

```json
{
  "id": "EXEC-00N",
  "title": "EXEC-00N: Implement <issue-title>",
  "description": "Implement solution for issue <issueId>.\n\nIssue ID: <issueId>\nSolution file: <session-folder>/artifacts/solutions/<issueId>.json\nSession: <session-folder>\nExecution method: <agent|codex|gemini>\n\nInnerLoop: true",
  "status": "pending",
  "role": "executor",
  "prefix": "EXEC",
  "deps": [],
  "findings": "",
  "error": ""
}
```

### Add Command Task Template

When coordinator handles `add` command, create additional PLAN tasks in tasks.json:

```json
{
  "id": "PLAN-00N",
  "title": "PLAN-00N: Additional requirement decomposition",
  "description": "Additional requirements to decompose.\n\nInput type: <issues|text|plan>\nInput: <new-input>\nSession: <session-folder>\nExecution method: <execution-method>\n\nInnerLoop: true",
  "status": "pending",
  "role": "planner",
  "prefix": "PLAN",
  "deps": [],
  "findings": "",
  "error": ""
}
```

## Phase 4: Validation

| Check | Criteria |
|-------|----------|
| PLAN-001 created | tasks.json contains PLAN-001 entry |
| Description complete | Contains Input, Session, Execution method |
| No orphans | All tasks have valid role |
