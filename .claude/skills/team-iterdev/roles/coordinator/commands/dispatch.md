# Command: Dispatch

Create the iterative development task chain with correct dependencies and structured task descriptions.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| User requirement | From coordinator Phase 1 | Yes |
| Session folder | From coordinator Phase 2 | Yes |
| Pipeline definition | From SKILL.md Pipeline Definitions | Yes |
| Pipeline mode | From session.json `pipeline` | Yes |

1. Load user requirement and scope from session.json
2. Load pipeline stage definitions from SKILL.md Task Metadata Registry
3. Read `pipeline` mode from session.json (patch / sprint / multi-sprint)

## Phase 3: Task Chain Creation

### Task Description Template

Every task description uses structured format for clarity:

```
TaskCreate({
  subject: "<TASK-ID>",
  description: "PURPOSE: <what this task achieves> | Success: <measurable completion criteria>
TASK:
  - <step 1: specific action>
  - <step 2: specific action>
  - <step 3: specific action>
CONTEXT:
  - Session: <session-folder>
  - Scope: <task-scope>
  - Upstream artifacts: <artifact-1>, <artifact-2>
  - Shared memory: <session>/.msg/meta.json
EXPECTED: <deliverable path> + <quality criteria>
CONSTRAINTS: <scope limits, focus areas>
---
InnerLoop: <true|false>"
})
TaskUpdate({ taskId: "<TASK-ID>", addBlockedBy: [<dependency-list>], owner: "<role>" })
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
```
TaskCreate({
  subject: "DEV-001",
  description: "PURPOSE: Implement fix | Success: Fix applied, syntax clean
TASK:
  - Load target files and understand context
  - Apply fix changes
  - Validate syntax
CONTEXT:
  - Session: <session-folder>
  - Scope: <task-scope>
  - Shared memory: <session>/.msg/meta.json
EXPECTED: Modified source files + <session>/code/dev-log.md | Syntax clean
CONSTRAINTS: Minimal changes | Preserve existing behavior
---
InnerLoop: true"
})
TaskUpdate({ taskId: "DEV-001", owner: "developer" })
```

**VERIFY-001** (tester):
```
TaskCreate({
  subject: "VERIFY-001",
  description: "PURPOSE: Verify fix correctness | Success: Tests pass, no regressions
TASK:
  - Detect test framework
  - Run targeted tests for changed files
  - Run regression test suite
CONTEXT:
  - Session: <session-folder>
  - Scope: <task-scope>
  - Upstream artifacts: code/dev-log.md
  - Shared memory: <session>/.msg/meta.json
EXPECTED: <session>/verify/verify-001.json | Pass rate >= 95%
CONSTRAINTS: Focus on changed files | Report any regressions
---
InnerLoop: false"
})
TaskUpdate({ taskId: "VERIFY-001", addBlockedBy: ["DEV-001"], owner: "tester" })
```

---

### Sprint Pipeline

**DESIGN-001** (architect):
```
TaskCreate({
  subject: "DESIGN-001",
  description: "PURPOSE: Technical design and task breakdown | Success: Design document + task breakdown ready
TASK:
  - Explore codebase for patterns and dependencies
  - Create component design with integration points
  - Break down into implementable tasks with acceptance criteria
CONTEXT:
  - Session: <session-folder>
  - Scope: <task-scope>
  - Shared memory: <session>/.msg/meta.json
EXPECTED: <session>/design/design-001.md + <session>/design/task-breakdown.json | Components defined, tasks actionable
CONSTRAINTS: Focus on <task-scope> | Risk assessment required
---
InnerLoop: false"
})
TaskUpdate({ taskId: "DESIGN-001", owner: "architect" })
```

**DEV-001** (developer):
```
TaskCreate({
  subject: "DEV-001",
  description: "PURPOSE: Implement design | Success: All design tasks implemented, syntax clean
TASK:
  - Load design and task breakdown
  - Implement tasks in execution order
  - Validate syntax after changes
CONTEXT:
  - Session: <session-folder>
  - Scope: <task-scope>
  - Upstream artifacts: design/design-001.md, design/task-breakdown.json
  - Shared memory: <session>/.msg/meta.json
EXPECTED: Modified source files + <session>/code/dev-log.md | Syntax clean, all tasks done
CONSTRAINTS: Follow design | Preserve existing behavior | Follow code conventions
---
InnerLoop: true"
})
TaskUpdate({ taskId: "DEV-001", addBlockedBy: ["DESIGN-001"], owner: "developer" })
```

**VERIFY-001** (tester, parallel with REVIEW-001):
```
TaskCreate({
  subject: "VERIFY-001",
  description: "PURPOSE: Verify implementation | Success: Tests pass, no regressions
TASK:
  - Detect test framework
  - Run tests for changed files
  - Run regression test suite
CONTEXT:
  - Session: <session-folder>
  - Scope: <task-scope>
  - Upstream artifacts: code/dev-log.md
  - Shared memory: <session>/.msg/meta.json
EXPECTED: <session>/verify/verify-001.json | Pass rate >= 95%
CONSTRAINTS: Focus on changed files | Report regressions
---
InnerLoop: false"
})
TaskUpdate({ taskId: "VERIFY-001", addBlockedBy: ["DEV-001"], owner: "tester" })
```

**REVIEW-001** (reviewer, parallel with VERIFY-001):
```
TaskCreate({
  subject: "REVIEW-001",
  description: "PURPOSE: Code review for correctness and quality | Success: All dimensions reviewed, verdict issued
TASK:
  - Load changed files and design document
  - Review across 4 dimensions: correctness, completeness, maintainability, security
  - Score quality (1-10) and issue verdict
CONTEXT:
  - Session: <session-folder>
  - Scope: <task-scope>
  - Upstream artifacts: design/design-001.md, code/dev-log.md
  - Shared memory: <session>/.msg/meta.json
EXPECTED: <session>/review/review-001.md | Per-dimension findings with severity
CONSTRAINTS: Focus on implementation changes | Provide file:line references
---
InnerLoop: false"
})
TaskUpdate({ taskId: "REVIEW-001", addBlockedBy: ["DEV-001"], owner: "reviewer" })
```

---

### Multi-Sprint Pipeline

Sprint 1: DESIGN-001 -> DEV-001 -> DEV-002(incremental) -> VERIFY-001 -> DEV-fix -> REVIEW-001

Create Sprint 1 tasks using sprint templates above, plus:

**DEV-002** (developer, incremental):
```
TaskCreate({
  subject: "DEV-002",
  description: "PURPOSE: Incremental implementation | Success: Remaining tasks implemented
TASK:
  - Load remaining tasks from breakdown
  - Implement incrementally
  - Validate syntax
CONTEXT:
  - Session: <session-folder>
  - Scope: <task-scope>
  - Upstream artifacts: design/task-breakdown.json, code/dev-log.md
  - Shared memory: <session>/.msg/meta.json
EXPECTED: Modified source files + updated dev-log.md
CONSTRAINTS: Incremental delivery | Follow existing patterns
---
InnerLoop: true"
})
TaskUpdate({ taskId: "DEV-002", addBlockedBy: ["DEV-001"], owner: "developer" })
```

Subsequent sprints created dynamically after Sprint N completes.

## Phase 4: Validation

Verify task chain integrity:

| Check | Method | Expected |
|-------|--------|----------|
| Task count correct | TaskList count | patch: 2, sprint: 4, multi: 5+ |
| Dependencies correct | Trace addBlockedBy graph | Acyclic, correct ordering |
| No circular dependencies | Trace full graph | Acyclic |
| Structured descriptions | Each has PURPOSE/TASK/CONTEXT/EXPECTED | All present |

If validation fails, fix the specific task and re-validate.
