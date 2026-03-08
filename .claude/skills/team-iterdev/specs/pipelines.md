# IterDev Pipeline Definitions

## Three-Pipeline Architecture

### Patch Pipeline (2 beats, serial)

```
DEV-001 -> VERIFY-001
[developer]  [tester]
```

### Sprint Pipeline (4 beats, with parallel window)

```
DESIGN-001 -> DEV-001 -> [VERIFY-001 + REVIEW-001] (parallel)
[architect]   [developer]  [tester]       [reviewer]
```

### Multi-Sprint Pipeline (N beats, iterative)

```
Sprint 1: DESIGN-001 -> DEV-001 -> DEV-002(incremental) -> VERIFY-001 -> DEV-fix -> REVIEW-001
Sprint 2: DESIGN-002(refined) -> DEV-003 -> VERIFY-002 -> REVIEW-002
...
```

## Generator-Critic Loop (developer <-> reviewer)

```
DEV -> REVIEW -> (if review.critical_count > 0 || review.score < 7)
              -> DEV-fix -> REVIEW-2 -> (if still issues) -> DEV-fix-2 -> REVIEW-3
              -> (max 3 rounds, then accept with warning)
```

## Pipeline Selection Logic

| Signal | Score |
|--------|-------|
| Changed files > 10 | +3 |
| Changed files 3-10 | +2 |
| Structural change | +3 |
| Cross-cutting concern | +2 |
| Simple fix | -2 |

| Score | Pipeline |
|-------|----------|
| >= 5 | multi-sprint |
| 2-4 | sprint |
| 0-1 | patch |

## Task Metadata Registry

| Task ID | Role | Pipeline | Dependencies | Description |
|---------|------|----------|-------------|-------------|
| DESIGN-001 | architect | sprint/multi | (none) | Technical design and task breakdown |
| DEV-001 | developer | all | DESIGN-001 (sprint/multi) or (none for patch) | Code implementation |
| DEV-002 | developer | multi | DEV-001 | Incremental implementation |
| DEV-fix | developer | sprint/multi | REVIEW-* (GC loop trigger) | Fix issues from review |
| VERIFY-001 | tester | all | DEV-001 (or last DEV) | Test execution and fix cycles |
| REVIEW-001 | reviewer | sprint/multi | DEV-001 (or last DEV) | Code review and quality scoring |

## Checkpoints

| Trigger Condition | Location | Behavior |
|-------------------|----------|----------|
| GC loop exceeds max rounds | After REVIEW-3 | Stop iteration, accept with warning, record in wisdom |
| Sprint transition | End of Sprint N | Pause, retrospective, user confirms `resume` for Sprint N+1 |
| Pipeline stall | No ready + no running tasks | Check missing tasks, report blockedBy chain to user |

## Multi-Sprint Dynamic Downgrade

If Sprint N metrics are strong (velocity >= expected, review avg >= 8), coordinator may downgrade Sprint N+1 from multi-sprint to sprint pipeline for efficiency.

## Task Ledger Schema

| Field | Description |
|-------|-------------|
| `sprint_id` | Current sprint identifier |
| `sprint_goal` | Sprint objective |
| `tasks[]` | Array of task entries |
| `metrics` | Aggregated metrics: total, completed, in_progress, blocked, velocity |

**Task Entry Fields**:

| Field | Description |
|-------|-------------|
| `id` | Task identifier |
| `title` | Task title |
| `owner` | Assigned role |
| `status` | pending / in_progress / completed / blocked |
| `started_at` / `completed_at` | Timestamps |
| `gc_rounds` | Generator-Critic iteration count |
| `review_score` | Reviewer score (null until reviewed) |
| `test_pass_rate` | Tester pass rate (null until tested) |
