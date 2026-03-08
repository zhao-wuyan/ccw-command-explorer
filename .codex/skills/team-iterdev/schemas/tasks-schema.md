# Team IterDev -- CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier | `"DEV-001"` |
| `title` | string | Yes | Short task title | `"Implement design"` |
| `description` | string | Yes | Detailed task description (self-contained) | `"Load design document, implement tasks in execution order..."` |
| `role` | string | Yes | Worker role: architect, developer, tester, reviewer | `"developer"` |
| `pipeline` | string | Yes | Pipeline mode: patch, sprint, multi-sprint | `"sprint"` |
| `sprint_num` | integer | Yes | Sprint number (1-based, for multi-sprint tracking) | `"1"` |
| `gc_round` | integer | Yes | Generator-Critic round number (0 = initial, 1+ = fix round) | `"0"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"DESIGN-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"DESIGN-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[Task DESIGN-001] Created design with 3 components..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` -> `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Implemented 5 files, all syntax clean..."` |
| `review_score` | string | Quality score 1-10 (reviewer only, empty for others) | `"8"` |
| `gc_signal` | string | `REVISION_NEEDED` or `CONVERGED` (reviewer only) | `"CONVERGED"` |
| `error` | string | Error message if failed | `""` |

---

### exec_mode Values

| Value | Mechanism | Description |
|-------|-----------|-------------|
| `csv-wave` | `spawn_agents_on_csv` | One-shot batch execution within wave |
| `interactive` | `spawn_agent`/`wait`/`send_input`/`close_agent` | Multi-round individual execution |

Interactive tasks appear in master CSV for dependency tracking but are NOT included in wave-{N}.csv files.

---

### Example Data

```csv
id,title,description,role,pipeline,sprint_num,gc_round,deps,context_from,exec_mode,wave,status,findings,review_score,gc_signal,error
"DESIGN-001","Technical design and task breakdown","Explore codebase for patterns and dependencies. Create component design with integration points. Break into implementable tasks with acceptance criteria.","architect","sprint","1","0","","","csv-wave","1","pending","","","",""
"DEV-001","Implement design","Load design document and task breakdown. Implement tasks in execution order. Validate syntax after each change. Write dev log.","developer","sprint","1","0","DESIGN-001","DESIGN-001","csv-wave","2","pending","","","",""
"VERIFY-001","Verify implementation","Detect test framework. Run targeted tests for changed files. Run regression test suite. Report pass rate.","tester","sprint","1","0","DEV-001","DEV-001","csv-wave","3","pending","","","",""
"REVIEW-001","Code review","Load changed files and design. Review across correctness, completeness, maintainability, security. Score quality 1-10. Issue verdict.","reviewer","sprint","1","0","DEV-001","DEV-001","csv-wave","3","pending","","","",""
"GC-CHECK-001","GC loop decision","Evaluate review severity. If critical_count > 0 or score < 7: REVISION. Else: CONVERGE.","gc-controller","sprint","1","1","REVIEW-001","REVIEW-001","interactive","4","pending","","","",""
"DEV-fix-1","Fix review issues (round 1)","Fix critical and high issues from REVIEW-001. Focus on review feedback only. Do NOT change unflagged code.","developer","sprint","1","1","GC-CHECK-001","REVIEW-001","csv-wave","5","pending","","","",""
"REVIEW-002","Re-review (round 1)","Review fixes from DEV-fix-1. Re-evaluate quality. Check if critical issues are resolved.","reviewer","sprint","1","1","DEV-fix-1","DEV-fix-1","csv-wave","6","pending","","","",""
```

---

### Column Lifecycle

```
Decomposer (Phase 1)     Wave Engine (Phase 2)    Agent (Execution)
---------------------    --------------------     -----------------
id          ----------->  id          ---------->  id
title       ----------->  title       ---------->  (reads)
description ----------->  description ---------->  (reads)
role        ----------->  role        ---------->  (reads)
pipeline    ----------->  pipeline    ---------->  (reads)
sprint_num  ----------->  sprint_num  ---------->  (reads)
gc_round    ----------->  gc_round    ---------->  (reads)
deps        ----------->  deps        ---------->  (reads)
context_from----------->  context_from---------->  (reads)
exec_mode   ----------->  exec_mode   ---------->  (reads)
                          wave         ---------->  (reads)
                          prev_context ---------->  (reads)
                                                    status
                                                    findings
                                                    review_score
                                                    gc_signal
                                                    error
```

---

## Output Schema (JSON)

Agent output via `report_agent_job_result` (csv-wave tasks):

```json
{
  "id": "DEV-001",
  "status": "completed",
  "findings": "Implemented 5 files following design. All syntax checks pass. Key changes: src/auth/jwt.ts, src/middleware/auth.ts.",
  "review_score": "",
  "gc_signal": "",
  "error": ""
}
```

Reviewer-specific output:

```json
{
  "id": "REVIEW-001",
  "status": "completed",
  "findings": "Reviewed 5 files. Correctness: 8/10, Completeness: 9/10, Maintainability: 7/10, Security: 6/10. 1 HIGH issue (missing token expiry check).",
  "review_score": "7.5",
  "gc_signal": "REVISION_NEEDED",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `design_decision` | `data.component` | `{component, approach, rationale, alternatives}` | Architecture decision |
| `implementation` | `data.file` | `{file, changes, pattern_used, notes}` | Code implementation detail |
| `test_result` | `data.test_suite` | `{test_suite, pass_rate, failures[], regressions}` | Test execution result |
| `review_finding` | `data.file_line` | `{file_line, severity, dimension, description, suggestion}` | Review finding |
| `convention` | `data.name` | `{name, description, example}` | Discovered project convention |
| `gc_decision` | `data.round` | `{round, signal, critical_count, score}` | GC loop decision record |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00+08:00","worker":"DESIGN-001","type":"design_decision","data":{"component":"AuthModule","approach":"JWT with refresh tokens","rationale":"Stateless auth","alternatives":"Session-based, OAuth2"}}
{"ts":"2026-03-08T10:05:00+08:00","worker":"DEV-001","type":"implementation","data":{"file":"src/auth/jwt.ts","changes":"Added JWT middleware with token validation","pattern_used":"Express middleware","notes":"Reuses existing bcrypt"}}
{"ts":"2026-03-08T10:10:00+08:00","worker":"VERIFY-001","type":"test_result","data":{"test_suite":"auth","pass_rate":0.96,"failures":["token-expiry-edge-case"],"regressions":false}}
{"ts":"2026-03-08T10:15:00+08:00","worker":"REVIEW-001","type":"review_finding","data":{"file_line":"src/auth/jwt.ts:42","severity":"HIGH","dimension":"security","description":"Token expiry not validated","suggestion":"Add exp claim check in validateToken()"}}
```

> Both csv-wave and interactive agents read/write the same discoveries.ndjson file.

---

## Cross-Mechanism Context Flow

| Source | Target | Mechanism |
|--------|--------|-----------|
| CSV task findings | Interactive task | Injected via spawn message or send_input |
| Interactive task result | CSV task prev_context | Read from interactive/{id}-result.json |
| Any agent discovery | Any agent | Shared via discoveries.ndjson |

---

## Validation Rules

| Rule | Check | Error |
|------|-------|-------|
| Unique IDs | No duplicate `id` values | "Duplicate task ID: {id}" |
| Valid deps | All dep IDs exist in tasks | "Unknown dependency: {dep_id}" |
| No self-deps | Task cannot depend on itself | "Self-dependency: {id}" |
| No circular deps | Topological sort completes | "Circular dependency detected involving: {ids}" |
| context_from valid | All context IDs exist and in earlier waves | "Invalid context_from: {id}" |
| exec_mode valid | Value is `csv-wave` or `interactive` | "Invalid exec_mode: {value}" |
| Description non-empty | Every task has description | "Empty description for task: {id}" |
| Status enum | status in {pending, completed, failed, skipped} | "Invalid status: {status}" |
| Valid role | role in {architect, developer, tester, reviewer, gc-controller} | "Invalid role: {role}" |
| GC round non-negative | gc_round >= 0 | "Invalid gc_round: {value}" |
| Valid pipeline | pipeline in {patch, sprint, multi-sprint} | "Invalid pipeline: {value}" |
| Cross-mechanism deps | Interactive<->CSV deps resolve correctly | "Cross-mechanism dependency unresolvable: {id}" |
