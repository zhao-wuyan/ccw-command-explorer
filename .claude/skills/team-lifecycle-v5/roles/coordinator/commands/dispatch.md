# Command: dispatch

## Purpose

Create task chains based on execution mode. v5: uses team-worker agent for all spawns. Task descriptions include role_spec paths.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Mode | Phase 1 requirements | Yes |
| Session folder | Phase 2 session init | Yes |
| Scope | User requirements description | Yes |
| Spec file | User-provided path (impl-only mode only) | Conditional |

## Phase 3: Task Chain Creation

### Mode-to-Pipeline Routing

| Mode | Tasks | Pipeline | First Task |
|------|-------|----------|------------|
| spec-only | 6 | Spec pipeline | RESEARCH-001 |
| impl-only | 4 | Impl pipeline | PLAN-001 |
| fe-only | 3 | FE pipeline | PLAN-001 |
| fullstack | 6 | Fullstack pipeline | PLAN-001 |
| full-lifecycle | 10 | Spec + Impl | RESEARCH-001 |
| full-lifecycle-fe | 12 | Spec + Fullstack | RESEARCH-001 |

---

### Spec Pipeline (6 tasks)

| # | Subject | Owner | BlockedBy | Description | Inline Discuss |
|---|---------|-------|-----------|-------------|---------------|
| 1 | RESEARCH-001 | analyst | (none) | Seed analysis and context gathering | DISCUSS-001 |
| 2 | DRAFT-001 | writer | RESEARCH-001 | Generate Product Brief | DISCUSS-002 |
| 3 | DRAFT-002 | writer | DRAFT-001 | Generate Requirements/PRD | DISCUSS-003 |
| 4 | DRAFT-003 | writer | DRAFT-002 | Generate Architecture Document | DISCUSS-004 |
| 5 | DRAFT-004 | writer | DRAFT-003 | Generate Epics & Stories | DISCUSS-005 |
| 6 | QUALITY-001 | reviewer | DRAFT-004 | 5-dimension spec quality + sign-off | DISCUSS-006 |

### Impl Pipeline (4 tasks)

| # | Subject | Owner | BlockedBy | Description |
|---|---------|-------|-----------|-------------|
| 1 | PLAN-001 | planner | (none) | Multi-angle exploration and planning |
| 2 | IMPL-001 | executor | PLAN-001 | Code implementation |
| 3 | TEST-001 | tester | IMPL-001 | Test-fix cycles |
| 4 | REVIEW-001 | reviewer | IMPL-001 | 4-dimension code review |

### FE Pipeline (3 tasks)

| # | Subject | Owner | BlockedBy | Description |
|---|---------|-------|-----------|-------------|
| 1 | PLAN-001 | planner | (none) | Planning (frontend focus) |
| 2 | DEV-FE-001 | fe-developer | PLAN-001 | Frontend implementation |
| 3 | QA-FE-001 | fe-qa | DEV-FE-001 | 5-dimension frontend QA |

GC loop (max 2 rounds): QA-FE verdict=NEEDS_FIX -> create DEV-FE-002 + QA-FE-002 dynamically.

### Fullstack Pipeline (6 tasks)

| # | Subject | Owner | BlockedBy | Description |
|---|---------|-------|-----------|-------------|
| 1 | PLAN-001 | planner | (none) | Fullstack planning |
| 2 | IMPL-001 | executor | PLAN-001 | Backend implementation |
| 3 | DEV-FE-001 | fe-developer | PLAN-001 | Frontend implementation |
| 4 | TEST-001 | tester | IMPL-001 | Backend test-fix cycles |
| 5 | QA-FE-001 | fe-qa | DEV-FE-001 | Frontend QA |
| 6 | REVIEW-001 | reviewer | TEST-001, QA-FE-001 | Full code review |

### Composite Modes

| Mode | Construction | PLAN-001 BlockedBy |
|------|-------------|-------------------|
| full-lifecycle | Spec (6) + Impl (4) | QUALITY-001 |
| full-lifecycle-fe | Spec (6) + Fullstack (6) | QUALITY-001 |

---

### Task Description Template

Every task description uses structured format for clarity:

```
TaskCreate({
  subject: "<TASK-ID>",
  owner: "<role>",
  description: "PURPOSE: <what this task achieves> | Success: <measurable completion criteria>
TASK:
  - <step 1: specific action>
  - <step 2: specific action>
  - <step 3: specific action>
CONTEXT:
  - Session: <session-folder>
  - Scope: <scope>
  - Upstream artifacts: <artifact-1.md>, <artifact-2.md>
  - Key files: <file1>, <file2> (if applicable)
  - Shared memory: <session>/shared-memory.json
EXPECTED: <deliverable path> + <quality criteria>
CONSTRAINTS: <scope limits, focus areas>
---
InlineDiscuss: <DISCUSS-NNN or none>
InnerLoop: <true|false>",
  blockedBy: [<dependency-list>],
  status: "pending"
})
```

**Field Guidelines**:
- **PURPOSE**: Clear goal statement + success criteria
- **TASK**: 2-5 actionable steps with specific verbs
- **CONTEXT**: Session path, scope, upstream artifacts, relevant files
- **EXPECTED**: Output artifact path + quality requirements
- **CONSTRAINTS**: Scope boundaries, focus areas, exclusions

**InnerLoop Flag Rules**:

| Role | InnerLoop |
|------|-----------|
| writer (DRAFT-*) | true |
| planner (PLAN-*) | true |
| executor (IMPL-*) | true |
| analyst, tester, reviewer, architect, fe-developer, fe-qa | false |

### Revision Task Template

```
TaskCreate({
  subject: "<ORIGINAL-ID>-R1",
  owner: "<same-role-as-original>",
  description: "PURPOSE: <revision-type> revision of <ORIGINAL-ID> | Success: Address feedback and pass quality checks
TASK:
  - Review original artifact and feedback
  - Apply targeted fixes to weak areas
  - Validate against quality criteria
CONTEXT:
  - Session: <session-folder>
  - Original artifact: <artifact-path>
  - User feedback: <feedback-text or 'system-initiated'>
  - Revision scope: <targeted|full>
  - Shared memory: <session>/shared-memory.json
EXPECTED: Updated artifact at <artifact-path> + revision summary
CONSTRAINTS: <revision scope limits>
---
InlineDiscuss: <same-discuss-round-as-original>
InnerLoop: <true|false based on role>",
  status: "pending",
  blockedBy: [<predecessor-R1 if cascaded>]
})
```

**Revision naming**: `<ORIGINAL-ID>-R1` (max 1 revision per task; second -> `-R2`; third -> escalate to user)

**Cascade Rules**:

| Revised Task | Downstream (auto-cascade) |
|-------------|--------------------------|
| RESEARCH-001 | DRAFT-001~004-R1, QUALITY-001-R1 |
| DRAFT-001 | DRAFT-002~004-R1, QUALITY-001-R1 |
| DRAFT-002 | DRAFT-003~004-R1, QUALITY-001-R1 |
| DRAFT-003 | DRAFT-004-R1, QUALITY-001-R1 |
| DRAFT-004 | QUALITY-001-R1 |
| QUALITY-001 | (no cascade, just recheck) |

### Improvement Task Template

```
TaskCreate({
  subject: "IMPROVE-<dimension>-001",
  owner: "writer",
  description: "PURPOSE: Improve <dimension> quality from <X>% to 80% | Success: Pass quality threshold
TASK:
  - Review readiness report weak areas
  - Apply dimension-specific improvement strategy
  - Validate improvements against criteria
CONTEXT:
  - Session: <session-folder>
  - Current score: <X>%
  - Target: 80%
  - Readiness report: <session>/spec/readiness-report.md
  - Weak areas: <extracted-from-report>
  - Strategy: <from-dimension-strategy-table>
  - Shared memory: <session>/shared-memory.json
EXPECTED: Improved artifacts + quality improvement summary
CONSTRAINTS: Focus on <dimension> only
---
InnerLoop: true",
  status: "pending"
})
```

Improvement tasks always followed by QUALITY-001-R1 recheck (blockedBy: IMPROVE task).

### Impl-Only Pre-check

Before creating impl-only tasks, verify specification exists:
- Spec exists? YES -> read spec path -> proceed
- NO -> error: "impl-only requires existing spec"

## Phase 4: Validation

| Check | Criteria |
|-------|----------|
| Task count | Matches mode total |
| Dependencies | Every blockedBy references existing task subject |
| Owner assignment | Each task owner matches Role Registry prefix |
| Session reference | Every task contains `Session: <session-folder>` |
| Inline discuss | Spec tasks have InlineDiscuss field |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown mode | Reject with supported mode list |
| Missing spec for impl-only | Error, suggest spec-only or full-lifecycle |
| TaskCreate fails | Log error, report to user |
| Duplicate task subject | Skip creation, log warning |
