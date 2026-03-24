# Command: dispatch

## Purpose

Create task chains from dynamic dependency graphs. Builds pipelines from the task-analysis.json produced by Phase 1. Workers are spawned as team_worker agents with role-spec paths.

## When to Use

| Trigger | Condition |
|---------|-----------|
| After analysis | Phase 1 complete, task-analysis.json exists |
| After adapt | handleAdapt created new roles, needs new tasks |
| Re-dispatch | Pipeline restructuring (rare) |

## Strategy

- **Delegation**: Inline execution (coordinator processes directly)
- **Inputs**: task-analysis.json + team-session.json
- **Output**: tasks.json with dependency chains

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Task analysis | `<session-folder>/task-analysis.json` | Yes |
| Session file | `<session-folder>/team-session.json` | Yes |
| Role registry | `team-session.json#roles` | Yes |
| Scope | User requirements description | Yes |

## Phase 3: Task Chain Creation

### Workflow

1. **Read dependency graph** from `task-analysis.json#dependency_graph`
2. **Topological sort** tasks to determine creation order
3. **Validate** all task roles exist in role registry
4. **Build tasks array** (in topological order):

```json
[
  {
    "id": "<PREFIX>-<NNN>",
    "title": "<PREFIX>-<NNN>",
    "description": "PURPOSE: <goal> | Success: <success_criteria>\nTASK:\n  - <step 1>\n  - <step 2>\n  - <step 3>\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream artifacts: <artifact-1.md>, <artifact-2.md>\n  - Key files: <file1>, <file2>\n  - Shared state: team_msg(operation=\"get_state\", session_id=<session-id>)\nEXPECTED: <deliverable path> + <quality criteria>\nCONSTRAINTS: <scope limits>\n---\nInnerLoop: <true|false>\nRoleSpec: <session-folder>/role-specs/<role-name>.md",
    "status": "pending",
    "role": "<role-name>",
    "prefix": "<PREFIX>",
    "deps": ["<dependency-list from graph>"],
    "findings": "",
    "error": ""
  }
]
```

5. **Write tasks.json** with the complete array
6. **Update team-session.json** with pipeline and tasks_total
7. **Validate** created chain

### Task Description Template

Every task description includes structured fields for clarity:

```
PURPOSE: <goal from task-analysis.json#tasks[].goal> | Success: <success_criteria from task-analysis.json#tasks[].success_criteria>
TASK:
  - <step 1 from task-analysis.json#tasks[].steps[]>
  - <step 2 from task-analysis.json#tasks[].steps[]>
  - <step 3 from task-analysis.json#tasks[].steps[]>
CONTEXT:
  - Session: <session-folder>
  - Upstream artifacts: <comma-separated list from task-analysis.json#tasks[].upstream_artifacts[]>
  - Key files: <comma-separated list from task-analysis.json#tasks[].key_files[]>
  - Shared state: team_msg(operation="get_state", session_id=<session-id>)
EXPECTED: <artifact path from task-analysis.json#capabilities[].artifacts[]> + <quality criteria based on capability type>
CONSTRAINTS: <constraints from task-analysis.json#tasks[].constraints>
---
InnerLoop: <true|false>
RoleSpec: <session-folder>/role-specs/<role-name>.md
```

**Field Mapping**:
- `PURPOSE`: From `task-analysis.json#capabilities[].tasks[].goal` + `success_criteria`
- `TASK`: From `task-analysis.json#capabilities[].tasks[].steps[]`
- `CONTEXT.Upstream artifacts`: From `task-analysis.json#capabilities[].tasks[].upstream_artifacts[]`
- `CONTEXT.Key files`: From `task-analysis.json#capabilities[].tasks[].key_files[]`
- `EXPECTED`: From `task-analysis.json#capabilities[].artifacts[]` + quality criteria
- `CONSTRAINTS`: From `task-analysis.json#capabilities[].tasks[].constraints`

### InnerLoop Flag Rules

| Condition | InnerLoop |
|-----------|-----------|
| Role has 2+ serial same-prefix tasks | true |
| Role has 1 task | false |
| Tasks are parallel (no dependency between them) | false |

### Dependency Validation

| Check | Criteria |
|-------|----------|
| No orphan tasks | Every task is reachable from at least one root |
| No circular deps | Topological sort succeeds without cycle |
| All roles valid | Every task role exists in team-session.json#roles |
| All deps valid | Every deps entry references an existing task id |
| Session reference | Every task description contains `Session: <session-folder>` |
| RoleSpec reference | Every task description contains `RoleSpec: <path>` |

## Phase 4: Validation

| Check | Criteria |
|-------|----------|
| Task count | Matches dependency_graph node count |
| Dependencies | Every deps entry references an existing task id |
| Role assignment | Each task role is in role registry |
| Session reference | Every task description contains `Session:` |
| Pipeline integrity | No disconnected subgraphs (warn if found) |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Circular dependency detected | Report cycle, halt task creation |
| Role not in role registry | Error, coordinator must fix roles first |
| Task creation fails | Log error, report to coordinator |
| Duplicate task id | Skip creation, log warning |
| Empty dependency graph | Error, task analysis may have failed |
