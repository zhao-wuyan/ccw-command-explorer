# Command: Dispatch

Create the iterative development task chain with correct dependencies and structured task descriptions.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| User requirement | From coordinator Phase 1 | Yes |
| Session folder | From coordinator Phase 2 | Yes |
| Pipeline definition | From SKILL.md Pipeline Definitions | Yes |
| Pipeline mode | From tasks.json `pipeline_mode` | Yes |

1. Load user requirement and scope from tasks.json
2. Load pipeline stage definitions from SKILL.md Task Metadata Registry
3. Read `pipeline_mode` from tasks.json (patch / sprint / multi-sprint)

## Phase 3: Task Chain Creation

### Task Entry Template

Each task in tasks.json `tasks` object:
```json
{
  "<TASK-ID>": {
    "title": "<concise title>",
    "description": "PURPOSE: <what this task achieves> | Success: <measurable completion criteria>\nTASK:\n  - <step 1: specific action>\n  - <step 2: specific action>\n  - <step 3: specific action>\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <task-scope>\n  - Upstream artifacts: <artifact-1>, <artifact-2>\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <deliverable path> + <quality criteria>\nCONSTRAINTS: <scope limits, focus areas>\n---\nInnerLoop: <true|false>",
    "role": "<role-name>",
    "prefix": "<PREFIX>",
    "deps": ["<dependency-list>"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

### Mode Router

| Mode | Action |
|------|--------|
| `patch` | Create DEV-001 + VERIFY-001 |
| `sprint` | Create DESIGN-001 + DEV-001 + VERIFY-001 + REVIEW-001 |
| `multi-sprint` | Create Sprint 1 chain, subsequent sprints created dynamically |

---

### Patch Pipeline

**DEV-001** (developer):
```json
{
  "DEV-001": {
    "title": "Implement fix",
    "description": "PURPOSE: Implement fix | Success: Fix applied, syntax clean\nTASK:\n  - Load target files and understand context\n  - Apply fix changes\n  - Validate syntax\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <task-scope>\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: Modified source files + <session>/code/dev-log.md | Syntax clean\nCONSTRAINTS: Minimal changes | Preserve existing behavior\n---\nInnerLoop: true",
    "role": "developer",
    "prefix": "DEV",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**VERIFY-001** (tester):
```json
{
  "VERIFY-001": {
    "title": "Verify fix correctness",
    "description": "PURPOSE: Verify fix correctness | Success: Tests pass, no regressions\nTASK:\n  - Detect test framework\n  - Run targeted tests for changed files\n  - Run regression test suite\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <task-scope>\n  - Upstream artifacts: code/dev-log.md\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/verify/verify-001.json | Pass rate >= 95%\nCONSTRAINTS: Focus on changed files | Report any regressions\n---\nInnerLoop: false",
    "role": "tester",
    "prefix": "VERIFY",
    "deps": ["DEV-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

---

### Sprint Pipeline

**DESIGN-001** (architect):
```json
{
  "DESIGN-001": {
    "title": "Technical design and task breakdown",
    "description": "PURPOSE: Technical design and task breakdown | Success: Design document + task breakdown ready\nTASK:\n  - Explore codebase for patterns and dependencies\n  - Create component design with integration points\n  - Break down into implementable tasks with acceptance criteria\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <task-scope>\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/design/design-001.md + <session>/design/task-breakdown.json | Components defined, tasks actionable\nCONSTRAINTS: Focus on <task-scope> | Risk assessment required\n---\nInnerLoop: false",
    "role": "architect",
    "prefix": "DESIGN",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**DEV-001** (developer):
```json
{
  "DEV-001": {
    "title": "Implement design",
    "description": "PURPOSE: Implement design | Success: All design tasks implemented, syntax clean\nTASK:\n  - Load design and task breakdown\n  - Implement tasks in execution order\n  - Validate syntax after changes\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <task-scope>\n  - Upstream artifacts: design/design-001.md, design/task-breakdown.json\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: Modified source files + <session>/code/dev-log.md | Syntax clean, all tasks done\nCONSTRAINTS: Follow design | Preserve existing behavior | Follow code conventions\n---\nInnerLoop: true",
    "role": "developer",
    "prefix": "DEV",
    "deps": ["DESIGN-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**VERIFY-001** (tester, parallel with REVIEW-001):
```json
{
  "VERIFY-001": {
    "title": "Verify implementation",
    "description": "PURPOSE: Verify implementation | Success: Tests pass, no regressions\nTASK:\n  - Detect test framework\n  - Run tests for changed files\n  - Run regression test suite\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <task-scope>\n  - Upstream artifacts: code/dev-log.md\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/verify/verify-001.json | Pass rate >= 95%\nCONSTRAINTS: Focus on changed files | Report regressions\n---\nInnerLoop: false",
    "role": "tester",
    "prefix": "VERIFY",
    "deps": ["DEV-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**REVIEW-001** (reviewer, parallel with VERIFY-001):
```json
{
  "REVIEW-001": {
    "title": "Code review for correctness and quality",
    "description": "PURPOSE: Code review for correctness and quality | Success: All dimensions reviewed, verdict issued\nTASK:\n  - Load changed files and design document\n  - Review across 4 dimensions: correctness, completeness, maintainability, security\n  - Score quality (1-10) and issue verdict\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <task-scope>\n  - Upstream artifacts: design/design-001.md, code/dev-log.md\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/review/review-001.md | Per-dimension findings with severity\nCONSTRAINTS: Focus on implementation changes | Provide file:line references\n---\nInnerLoop: false",
    "role": "reviewer",
    "prefix": "REVIEW",
    "deps": ["DEV-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

---

### Multi-Sprint Pipeline

Sprint 1: DESIGN-001 -> DEV-001 -> DEV-002(incremental) -> VERIFY-001 -> DEV-fix -> REVIEW-001

Create Sprint 1 tasks using sprint templates above, plus:

**DEV-002** (developer, incremental):
```json
{
  "DEV-002": {
    "title": "Incremental implementation",
    "description": "PURPOSE: Incremental implementation | Success: Remaining tasks implemented\nTASK:\n  - Load remaining tasks from breakdown\n  - Implement incrementally\n  - Validate syntax\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <task-scope>\n  - Upstream artifacts: design/task-breakdown.json, code/dev-log.md\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: Modified source files + updated dev-log.md\nCONSTRAINTS: Incremental delivery | Follow existing patterns\n---\nInnerLoop: true",
    "role": "developer",
    "prefix": "DEV",
    "deps": ["DEV-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

Subsequent sprints created dynamically after Sprint N completes.

## Phase 4: Validation

Verify task chain integrity:

| Check | Method | Expected |
|-------|--------|----------|
| Task count correct | tasks.json count | patch: 2, sprint: 4, multi: 5+ |
| Dependencies correct | Trace deps graph | Acyclic, correct ordering |
| No circular dependencies | Trace full graph | Acyclic |
| Structured descriptions | Each has PURPOSE/TASK/CONTEXT/EXPECTED | All present |

If validation fails, fix the specific task and re-validate.
