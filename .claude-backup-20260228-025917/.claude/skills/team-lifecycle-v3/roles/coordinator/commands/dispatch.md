# Command: dispatch

## Purpose

Create task chains based on execution mode. Each mode maps to a predefined pipeline from SKILL.md Task Metadata Registry. Tasks are created with proper dependency chains, owner assignments, and session references.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Mode | Phase 1 requirements (spec-only, impl-only, etc.) | Yes |
| Session folder | `<session-folder>` from Phase 2 | Yes |
| Scope | User requirements description | Yes |
| Spec file | User-provided path (impl-only mode only) | Conditional |

## Phase 3: Task Chain Creation

### Mode-to-Pipeline Routing

| Mode | Tasks | Pipeline | First Task |
|------|-------|----------|------------|
| spec-only | 12 | Spec pipeline | RESEARCH-001 |
| impl-only | 4 | Impl pipeline | PLAN-001 |
| fe-only | 3 | FE pipeline | PLAN-001 |
| fullstack | 6 | Fullstack pipeline | PLAN-001 |
| full-lifecycle | 16 | Spec + Impl | RESEARCH-001 |
| full-lifecycle-fe | 18 | Spec + Fullstack | RESEARCH-001 |

---

### Spec Pipeline (12 tasks)

Used by: spec-only, full-lifecycle, full-lifecycle-fe

| # | Subject | Owner | BlockedBy | Description |
|---|---------|-------|-----------|-------------|
| 1 | RESEARCH-001 | analyst | (none) | Seed analysis and context gathering |
| 2 | DISCUSS-001 | discussant | RESEARCH-001 | Critique research findings |
| 3 | DRAFT-001 | writer | DISCUSS-001 | Generate Product Brief |
| 4 | DISCUSS-002 | discussant | DRAFT-001 | Critique Product Brief |
| 5 | DRAFT-002 | writer | DISCUSS-002 | Generate Requirements/PRD |
| 6 | DISCUSS-003 | discussant | DRAFT-002 | Critique Requirements/PRD |
| 7 | DRAFT-003 | writer | DISCUSS-003 | Generate Architecture Document |
| 8 | DISCUSS-004 | discussant | DRAFT-003 | Critique Architecture Document |
| 9 | DRAFT-004 | writer | DISCUSS-004 | Generate Epics |
| 10 | DISCUSS-005 | discussant | DRAFT-004 | Critique Epics |
| 11 | QUALITY-001 | reviewer | DISCUSS-005 | 5-dimension spec quality validation |
| 12 | DISCUSS-006 | discussant | QUALITY-001 | Final review discussion and sign-off |

### Impl Pipeline (4 tasks)

Used by: impl-only, full-lifecycle (PLAN-001 blockedBy DISCUSS-006)

| # | Subject | Owner | BlockedBy | Description |
|---|---------|-------|-----------|-------------|
| 1 | PLAN-001 | planner | (none) | Multi-angle exploration and planning |
| 2 | IMPL-001 | executor | PLAN-001 | Code implementation |
| 3 | TEST-001 | tester | IMPL-001 | Test-fix cycles |
| 4 | REVIEW-001 | reviewer | IMPL-001 | 4-dimension code review |

### FE Pipeline (3 tasks)

Used by: fe-only

| # | Subject | Owner | BlockedBy | Description |
|---|---------|-------|-----------|-------------|
| 1 | PLAN-001 | planner | (none) | Planning (frontend focus) |
| 2 | DEV-FE-001 | fe-developer | PLAN-001 | Frontend implementation |
| 3 | QA-FE-001 | fe-qa | DEV-FE-001 | 5-dimension frontend QA |

GC loop (max 2 rounds): QA-FE verdict=NEEDS_FIX → create DEV-FE-002 + QA-FE-002 dynamically.

### Fullstack Pipeline (6 tasks)

Used by: fullstack, full-lifecycle-fe (PLAN-001 blockedBy DISCUSS-006)

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
| full-lifecycle | Spec (12) + Impl (4) | DISCUSS-006 |
| full-lifecycle-fe | Spec (12) + Fullstack (6) | DISCUSS-006 |

---

### Impl-Only Pre-check

Before creating impl-only tasks, verify specification exists:

```
Spec exists?
  ├─ YES → read spec path → proceed with task creation
  └─ NO → error: "impl-only requires existing spec, use spec-only or full-lifecycle"
```

### Task Description Template

Every task description includes session and scope context:

```
TaskCreate({
  subject: "<TASK-ID>",
  owner: "<role>",
  description: "<task description from pipeline table>\nSession: <session-folder>\nScope: <scope>",
  blockedBy: [<dependency-list>],
  status: "pending"
})
```

### Execution Method

| Method | Behavior |
|--------|----------|
| sequential | One task active at a time; next activated after predecessor completes |
| parallel | Tasks with all deps met run concurrently (e.g., TEST-001 + REVIEW-001) |

## Phase 4: Validation

| Check | Criteria |
|-------|----------|
| Task count | Matches mode total from routing table |
| Dependencies | Every blockedBy references an existing task subject |
| Owner assignment | Each task owner matches SKILL.md Role Registry prefix |
| Session reference | Every task description contains `Session: <session-folder>` |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown mode | Reject with supported mode list |
| Missing spec for impl-only | Error, suggest spec-only or full-lifecycle |
| TaskCreate fails | Log error, report to user |
| Duplicate task subject | Skip creation, log warning |
