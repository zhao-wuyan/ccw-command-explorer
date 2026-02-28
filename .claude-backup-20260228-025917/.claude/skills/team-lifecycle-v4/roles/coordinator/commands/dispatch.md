# Command: dispatch

## Purpose

Create task chains based on execution mode. v4 optimized: spec pipeline reduced from 12 to 6 tasks by inlining discuss rounds into produce roles.

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
| spec-only | 6 | Spec pipeline | RESEARCH-001 |
| impl-only | 4 | Impl pipeline | PLAN-001 |
| fe-only | 3 | FE pipeline | PLAN-001 |
| fullstack | 6 | Fullstack pipeline | PLAN-001 |
| full-lifecycle | 10 | Spec + Impl | RESEARCH-001 |
| full-lifecycle-fe | 12 | Spec + Fullstack | RESEARCH-001 |

---

### Spec Pipeline (6 tasks, was 12 in v3)

Used by: spec-only, full-lifecycle, full-lifecycle-fe

| # | Subject | Owner | BlockedBy | Description | Inline Discuss |
|---|---------|-------|-----------|-------------|---------------|
| 1 | RESEARCH-001 | analyst | (none) | Seed analysis and context gathering | DISCUSS-001 |
| 2 | DRAFT-001 | writer | RESEARCH-001 | Generate Product Brief | DISCUSS-002 |
| 3 | DRAFT-002 | writer | DRAFT-001 | Generate Requirements/PRD | DISCUSS-003 |
| 4 | DRAFT-003 | writer | DRAFT-002 | Generate Architecture Document | DISCUSS-004 |
| 5 | DRAFT-004 | writer | DRAFT-003 | Generate Epics & Stories | DISCUSS-005 |
| 6 | QUALITY-001 | reviewer | DRAFT-004 | 5-dimension spec quality + sign-off | DISCUSS-006 |

**Key change from v3**: No separate DISCUSS-* tasks. Each produce role calls the discuss subagent inline after completing its primary output.

### Impl Pipeline (4 tasks)

Used by: impl-only, full-lifecycle (PLAN-001 blockedBy QUALITY-001)

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

GC loop (max 2 rounds): QA-FE verdict=NEEDS_FIX -> create DEV-FE-002 + QA-FE-002 dynamically.

### Fullstack Pipeline (6 tasks)

Used by: fullstack, full-lifecycle-fe (PLAN-001 blockedBy QUALITY-001)

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

### Impl-Only Pre-check

Before creating impl-only tasks, verify specification exists:

```
Spec exists?
  +- YES -> read spec path -> proceed with task creation
  +- NO -> error: "impl-only requires existing spec, use spec-only or full-lifecycle"
```

### Task Description Template

Every task description includes session, scope, and inline discuss metadata:

```
TaskCreate({
  subject: "<TASK-ID>",
  owner: "<role>",
  description: "<task description from pipeline table>\nSession: <session-folder>\nScope: <scope>\nInlineDiscuss: <DISCUSS-NNN or none>\nInnerLoop: <true|false>",
  blockedBy: [<dependency-list>],
  status: "pending"
})
```

**InnerLoop Flag Rules**:

| Role | InnerLoop |
|------|-----------|
| writer (DRAFT-*) | true |
| planner (PLAN-*) | true |
| executor (IMPL-*) | true |
| analyst, tester, reviewer, architect, fe-developer, fe-qa | false |

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
| Inline discuss | Spec tasks have InlineDiscuss field matching round config |

### Revision Task Template

When handleRevise/handleFeedback creates revision tasks:

```
TaskCreate({
  subject: "<ORIGINAL-ID>-R1",
  owner: "<same-role-as-original>",
  description: "<revision-type> revision of <ORIGINAL-ID>.\n
    Session: <session-folder>\n
    Original artifact: <artifact-path>\n
    User feedback: <feedback-text or 'system-initiated'>\n
    Revision scope: <targeted|full>\n
    InlineDiscuss: <same-discuss-round-as-original>\n
    InnerLoop: <true|false based on role>",
  status: "pending",
  blockedBy: [<predecessor-R1 if cascaded>]
})
```

**Revision naming**: `<ORIGINAL-ID>-R1` (max 1 revision per task; second revision -> `-R2`; third -> escalate to user)

**Cascade blockedBy chain example** (revise DRAFT-002):
- DRAFT-002-R1 (no blockedBy)
- DRAFT-003-R1 (blockedBy: DRAFT-002-R1)
- DRAFT-004-R1 (blockedBy: DRAFT-003-R1)
- QUALITY-001-R1 (blockedBy: DRAFT-004-R1)

### Improvement Task Template

When handleImprove creates improvement tasks:

```
TaskCreate({
  subject: "IMPROVE-<dimension>-001",
  owner: "writer",
  description: "Quality improvement: <dimension>.\n
    Session: <session-folder>\n
    Current score: <X>%\n
    Target: 80%\n
    Readiness report: <session>/spec/readiness-report.md\n
    Weak areas: <extracted-from-report>\n
    Strategy: <from-dimension-strategy-table>\n
    InnerLoop: true",
  status: "pending"
})
```

Improvement tasks are always followed by a QUALITY-001-R1 recheck (blockedBy: IMPROVE task).

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown mode | Reject with supported mode list |
| Missing spec for impl-only | Error, suggest spec-only or full-lifecycle |
| TaskCreate fails | Log error, report to user |
| Duplicate task subject | Skip creation, log warning |
