# Dispatch Tasks

Create testing task chains with correct dependencies. Supports targeted, standard, and comprehensive pipelines.

## Workflow

1. Read task-analysis.json -> extract pipeline_mode and dependency_graph
2. Read specs/pipelines.md -> get task registry for selected pipeline
3. Topological sort tasks (respect deps)
4. Validate all owners exist in role registry (SKILL.md)
5. For each task (in order):
   - Add task entry to tasks.json `tasks` object (see template below)
   - Set deps array with upstream task IDs
6. Update tasks.json metadata: total count
7. Validate chain (no orphans, no cycles, all refs valid)

## Task Entry Template

Each task in tasks.json `tasks` object:
```json
{
  "<TASK-ID>": {
    "title": "<concise title>",
    "description": "PURPOSE: <goal> | Success: <criteria>\nTASK:\n  - <step 1>\n  - <step 2>\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <scope>\n  - Layer: <L1-unit|L2-integration|L3-e2e>\n  - Upstream artifacts: <artifact-1>, <artifact-2>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <deliverable path> + <quality criteria>\nCONSTRAINTS: <scope limits, focus areas>\n---\nInnerLoop: <true|false>\nRoleSpec: <project>/.codex/skills/team-testing/roles/<role>/role.md",
    "role": "<role-name>",
    "prefix": "<PREFIX>",
    "deps": ["<upstream-task-id>"],
    "status": "pending",
    "findings": null,
    "error": null
  }
}
```

## Pipeline Task Registry

### Targeted Pipeline
```
STRATEGY-001 (strategist): Analyze change scope, define test strategy
  deps: []
TESTGEN-001 (generator): Generate L1 unit tests
  deps: [STRATEGY-001], meta: layer=L1-unit
TESTRUN-001 (executor): Execute L1 tests, collect coverage
  deps: [TESTGEN-001], inner_loop: true, meta: layer=L1-unit, coverage_target=80%
```

### Standard Pipeline
```
STRATEGY-001 (strategist): Analyze change scope, define test strategy
  deps: []
TESTGEN-001 (generator): Generate L1 unit tests
  deps: [STRATEGY-001], meta: layer=L1-unit
TESTRUN-001 (executor): Execute L1 tests, collect coverage
  deps: [TESTGEN-001], inner_loop: true, meta: layer=L1-unit, coverage_target=80%
TESTGEN-002 (generator): Generate L2 integration tests
  deps: [TESTRUN-001], meta: layer=L2-integration
TESTRUN-002 (executor): Execute L2 tests, collect coverage
  deps: [TESTGEN-002], inner_loop: true, meta: layer=L2-integration, coverage_target=60%
TESTANA-001 (analyst): Defect pattern analysis, quality report
  deps: [TESTRUN-002]
```

### Comprehensive Pipeline
```
STRATEGY-001 (strategist): Analyze change scope, define test strategy
  deps: []
TESTGEN-001 (generator-1): Generate L1 unit tests
  deps: [STRATEGY-001], meta: layer=L1-unit
TESTGEN-002 (generator-2): Generate L2 integration tests
  deps: [STRATEGY-001], meta: layer=L2-integration
TESTRUN-001 (executor-1): Execute L1 tests, collect coverage
  deps: [TESTGEN-001], inner_loop: true, meta: layer=L1-unit, coverage_target=80%
TESTRUN-002 (executor-2): Execute L2 tests, collect coverage
  deps: [TESTGEN-002], inner_loop: true, meta: layer=L2-integration, coverage_target=60%
TESTGEN-003 (generator): Generate L3 E2E tests
  deps: [TESTRUN-001, TESTRUN-002], meta: layer=L3-e2e
TESTRUN-003 (executor): Execute L3 tests, collect coverage
  deps: [TESTGEN-003], inner_loop: true, meta: layer=L3-e2e, coverage_target=40%
TESTANA-001 (analyst): Defect pattern analysis, quality report
  deps: [TESTRUN-003]
```

## InnerLoop Flag Rules

- true: generator, executor roles (GC loop iterations)
- false: strategist, analyst roles

## Dependency Validation

- No orphan tasks (all tasks have valid owner)
- No circular dependencies
- All deps references exist in tasks object
- Session reference in every task description
- RoleSpec reference in every task description

## Log After Creation

```
mcp__ccw-tools__team_msg({
  operation: "log",
  session_id: <session-id>,
  from: "coordinator",
  type: "pipeline_selected",
  data: { pipeline: "<mode>", task_count: <N> }
})
```
