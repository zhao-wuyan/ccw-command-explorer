# Team Lifecycle v4 -- CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier | `"RESEARCH-001"` |
| `title` | string | Yes | Short task title | `"Domain research"` |
| `description` | string | Yes | Detailed task description (self-contained) | `"Explore domain, extract structured context..."` |
| `role` | string | Yes | Worker role: analyst, writer, planner, executor, tester, reviewer, supervisor | `"analyst"` |
| `pipeline_phase` | string | Yes | Lifecycle phase: research, product-brief, requirements, architecture, epics, checkpoint, readiness, planning, implementation, validation, review | `"research"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"RESEARCH-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"RESEARCH-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[Task RESEARCH-001] Explored domain..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` -> `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Identified 5 integration points..."` |
| `quality_score` | string | Quality gate score (0-100) for reviewer tasks | `"85"` |
| `supervision_verdict` | string | Checkpoint verdict: `pass` / `warn` / `block` | `"pass"` |
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
id,title,description,role,pipeline_phase,deps,context_from,exec_mode,wave,status,findings,quality_score,supervision_verdict,error
"RESEARCH-001","Domain research","Explore domain and competitors. Extract structured context: problem statement, target users, domain, constraints, exploration dimensions. Use CLI analysis tools.","analyst","research","","","csv-wave","1","pending","","","",""
"DRAFT-001","Product brief","Generate product brief from research context. Include vision statement, problem definition, target users, success goals. Use templates/product-brief.md template.","writer","product-brief","RESEARCH-001","RESEARCH-001","csv-wave","2","pending","","","",""
"DRAFT-002","Requirements PRD","Generate requirements PRD with functional requirements (FR-NNN), acceptance criteria, MoSCoW prioritization, user stories.","writer","requirements","DRAFT-001","DRAFT-001","csv-wave","3","pending","","","",""
"CHECKPOINT-001","Brief-PRD consistency","Verify: vision->requirements trace, terminology alignment, scope consistency, decision continuity, artifact existence.","supervisor","checkpoint","DRAFT-002","DRAFT-001;DRAFT-002","interactive","4","pending","","","",""
"DRAFT-003","Architecture design","Generate architecture with component diagram, tech stack justification, ADRs, data model, integration points.","writer","architecture","CHECKPOINT-001","DRAFT-002;CHECKPOINT-001","csv-wave","5","pending","","","",""
"DRAFT-004","Epics and stories","Generate 2-8 epics with 3-12 stories each. Include MVP subset, story format with ACs and estimates.","writer","epics","DRAFT-003","DRAFT-003","csv-wave","6","pending","","","",""
"CHECKPOINT-002","Full spec consistency","Verify: 4-doc terminology, decision chain, architecture-epics alignment, quality trend, open questions.","supervisor","checkpoint","DRAFT-004","DRAFT-001;DRAFT-002;DRAFT-003;DRAFT-004","interactive","7","pending","","","",""
"QUALITY-001","Readiness gate","Score spec quality across Completeness, Consistency, Traceability, Depth (25% each). Gate: >=80% pass, 60-79% review, <60% fail.","reviewer","readiness","CHECKPOINT-002","DRAFT-001;DRAFT-002;DRAFT-003;DRAFT-004","csv-wave","8","pending","","","",""
"PLAN-001","Implementation planning","Explore codebase, generate plan.json + TASK-*.json (2-7 tasks), assess complexity (Low/Medium/High).","planner","planning","QUALITY-001","QUALITY-001","csv-wave","9","pending","","","",""
"CHECKPOINT-003","Plan-input alignment","Verify: plan covers requirements, complexity sanity, dependency chain, execution method, upstream context.","supervisor","checkpoint","PLAN-001","PLAN-001","interactive","10","pending","","","",""
"IMPL-001","Code implementation","Execute implementation plan tasks. Follow existing code patterns. Run convergence checks.","executor","implementation","CHECKPOINT-003","PLAN-001","csv-wave","11","pending","","","",""
"TEST-001","Test execution","Detect test framework. Run affected tests first, then full suite. Fix failures (max 10 iterations, 95% target).","tester","validation","IMPL-001","IMPL-001","csv-wave","12","pending","","","",""
"REVIEW-001","Code review","Multi-dimensional code review: quality, security, architecture, requirements coverage. Verdict: BLOCK/CONDITIONAL/APPROVE.","reviewer","review","IMPL-001","IMPL-001","csv-wave","12","pending","","","",""
```

---

### Column Lifecycle

```
Decomposer (Phase 1)     Wave Engine (Phase 2)    Agent (Execution)
---------------------    --------------------     -----------------
id          ---------->  id          ---------->  id
title       ---------->  title       ---------->  (reads)
description ---------->  description ---------->  (reads)
role        ---------->  role        ---------->  (reads)
pipeline_phase -------->  pipeline_phase -------->  (reads)
deps        ---------->  deps        ---------->  (reads)
context_from---------->  context_from---------->  (reads)
exec_mode   ---------->  exec_mode   ---------->  (reads)
                          wave         ---------->  (reads)
                          prev_context ---------->  (reads)
                                                    status
                                                    findings
                                                    quality_score
                                                    supervision_verdict
                                                    error
```

---

## Output Schema (JSON)

Agent output via `report_agent_job_result` (csv-wave tasks):

```json
{
  "id": "RESEARCH-001",
  "status": "completed",
  "findings": "Explored domain: identified OAuth2+RBAC auth pattern, 5 integration points, TypeScript/React stack. Key constraint: must support SSO.",
  "quality_score": "",
  "supervision_verdict": "",
  "error": ""
}
```

Quality gate output:

```json
{
  "id": "QUALITY-001",
  "status": "completed",
  "findings": "Quality gate: Completeness 90%, Consistency 85%, Traceability 80%, Depth 75%. Overall: 82.5% PASS.",
  "quality_score": "82",
  "supervision_verdict": "",
  "error": ""
}
```

Interactive tasks (CHECKPOINT-*) output via JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `research` | `data.dimension` | `{dimension, findings[], constraints[], integration_points[]}` | Research context |
| `spec_artifact` | `data.doc_type` | `{doc_type, path, sections[], key_decisions[]}` | Specification document |
| `exploration` | `data.angle` | `{angle, relevant_files[], patterns[], recommendations[]}` | Codebase exploration |
| `plan_task` | `data.task_id` | `{task_id, title, files[], complexity, convergence_criteria[]}` | Plan task definition |
| `implementation` | `data.task_id` | `{task_id, files_modified[], approach, changes_summary}` | Implementation result |
| `test_result` | `data.framework` | `{framework, pass_rate, failures[], fix_iterations}` | Test result |
| `review_finding` | `data.file` | `{file, line, severity, dimension, description, suggested_fix}` | Review finding |
| `checkpoint` | `data.checkpoint_id` | `{checkpoint_id, verdict, score, risks[], blocks[]}` | Checkpoint result |
| `quality_gate` | `data.gate_id` | `{gate_id, score, dimensions{}, verdict}` | Quality assessment |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00+08:00","worker":"RESEARCH-001","type":"research","data":{"dimension":"domain","findings":["Auth system needs OAuth2 + RBAC"],"constraints":["Must support SSO"],"integration_points":["User service API"]}}
{"ts":"2026-03-08T10:15:00+08:00","worker":"DRAFT-001","type":"spec_artifact","data":{"doc_type":"product-brief","path":"spec/product-brief.md","sections":["Vision","Problem","Users","Goals"],"key_decisions":["OAuth2 over custom auth"]}}
{"ts":"2026-03-08T11:00:00+08:00","worker":"IMPL-001","type":"implementation","data":{"task_id":"IMPL-001","files_modified":["src/auth/oauth.ts","src/auth/rbac.ts"],"approach":"Strategy pattern for auth providers","changes_summary":"Created OAuth2 provider, RBAC middleware, session management"}}
{"ts":"2026-03-08T11:30:00+08:00","worker":"TEST-001","type":"test_result","data":{"framework":"vitest","pass_rate":98,"failures":["timeout in SSO integration test"],"fix_iterations":2}}
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
| Valid role | role in {analyst, writer, planner, executor, tester, reviewer, supervisor} | "Invalid role: {role}" |
| Valid pipeline_phase | pipeline_phase in {research, product-brief, requirements, architecture, epics, checkpoint, readiness, planning, implementation, validation, review} | "Invalid pipeline_phase: {value}" |
| Cross-mechanism deps | Interactive->CSV deps resolve correctly | "Cross-mechanism dependency unresolvable: {id}" |
