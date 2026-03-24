# Dispatch Tasks

Create task chains from pipeline mode, write to tasks.json with proper deps relationships.

## Workflow

1. Read task-analysis.json -> extract pipeline_mode and parameters
2. Read specs/pipelines.md -> get task registry for selected pipeline
3. Topological sort tasks (respect deps)
4. Validate all owners exist in role registry (SKILL.md)
5. For each task (in order):
   - Add task entry to tasks.json `tasks` object (see template below)
   - Set deps array with upstream task IDs
6. Update tasks.json metadata with pipeline.tasks_total
7. Validate chain (no orphans, no cycles, all refs valid)

## Task Entry Template

Each task in tasks.json `tasks` object:
```json
{
  "<TASK-ID>": {
    "title": "<concise title>",
    "description": "PURPOSE: <goal> | Success: <criteria>\nTASK:\n  - <step 1>\n  - <step 2>\nCONTEXT:\n  - Session: <session-folder>\n  - Target: <target>\n  - Dimensions: <dimensions>\n  - Upstream artifacts: <list>\nEXPECTED: <artifact path> + <quality criteria>\nCONSTRAINTS: <scope limits>\n---\nInnerLoop: <true|false>\nRoleSpec: <project>/.codex/skills/team-review/roles/<role>/role.md",
    "role": "<role-name>",
    "prefix": "<PREFIX>",
    "deps": ["<upstream-task-id>"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

## Pipeline Task Registry

### default Mode
```
SCAN-001 (scanner): Multi-dimension code scan
  deps: [], meta: target=<target>, dimensions=<dims>
REV-001 (reviewer): Deep finding analysis and review
  deps: [SCAN-001]
```

### full Mode
```
SCAN-001 (scanner): Multi-dimension code scan
  deps: [], meta: target=<target>, dimensions=<dims>
REV-001 (reviewer): Deep finding analysis and review
  deps: [SCAN-001]
FIX-001 (fixer): Plan and execute fixes
  deps: [REV-001]
```

### fix-only Mode
```
FIX-001 (fixer): Execute fixes from manifest
  deps: [], meta: input=<fix-manifest>
```

### quick Mode
```
SCAN-001 (scanner): Quick scan (fast mode)
  deps: [], meta: target=<target>, quick=true
```

## InnerLoop Flag Rules

- true: fixer role (iterative fix cycles)
- false: scanner, reviewer roles

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
  type: "dispatch_ready",
  data: { pipeline: "<mode>", task_count: <N>, target: "<target>" }
})
```
