# Command: dispatch

## Purpose

Create task chains from dynamic dependency graphs. Builds pipelines from the task-analysis.json produced by Phase 1. Workers are spawned as team-worker agents with role-spec paths.

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
3. **Validate** all task owners exist in role registry
4. **For each task** (in topological order):

```
TaskCreate({
  subject: "<PREFIX>-<NNN>",
  owner: "<role-name>",
  description: "<task description from task-analysis>\nSession: <session-folder>\nScope: <scope>\nInnerLoop: <true|false>\nRoleSpec: <session-folder>/role-specs/<role-name>.md",
  blockedBy: [<dependency-list from graph>],
  status: "pending"
})
```

5. **Update team-session.json** with pipeline and tasks_total
6. **Validate** created chain

### Task Description Template

Every task description includes session path, inner loop flag, and role-spec path:

```
<task description>
Session: <session-folder>
Scope: <scope>
InnerLoop: <true|false>
RoleSpec: <session-folder>/role-specs/<role-name>.md
```

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
| All owners valid | Every task owner exists in team-session.json#roles |
| All blockedBy valid | Every blockedBy references an existing task subject |
| Session reference | Every task description contains `Session: <session-folder>` |
| RoleSpec reference | Every task description contains `RoleSpec: <path>` |

## Phase 4: Validation

| Check | Criteria |
|-------|----------|
| Task count | Matches dependency_graph node count |
| Dependencies | Every blockedBy references an existing task subject |
| Owner assignment | Each task owner is in role registry |
| Session reference | Every task description contains `Session:` |
| Pipeline integrity | No disconnected subgraphs (warn if found) |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Circular dependency detected | Report cycle, halt task creation |
| Owner not in role registry | Error, coordinator must fix roles first |
| TaskCreate fails | Log error, report to coordinator |
| Duplicate task subject | Skip creation, log warning |
| Empty dependency graph | Error, task analysis may have failed |
