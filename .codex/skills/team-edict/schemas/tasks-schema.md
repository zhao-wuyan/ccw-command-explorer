# Team Edict -- CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier (DEPT-NNN format) | `"IMPL-001"` |
| `title` | string | Yes | Short task title | `"Implement JWT auth middleware"` |
| `description` | string | Yes | Detailed task description (self-contained for agent) | `"Create JWT authentication middleware..."` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"IMPL-001;IMPL-002"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"IMPL-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |
| `department` | string | Yes | Target ministry: gongbu/bingbu/hubu/libu/libu-hr/xingbu | `"gongbu"` |
| `task_prefix` | string | Yes | Task type prefix: IMPL/OPS/DATA/DOC/HR/QA | `"IMPL"` |
| `priority` | string | Yes | Priority level: P0 (highest) to P3 (lowest) | `"P0"` |
| `dispatch_batch` | integer | Yes | Batch number from Shangshu dispatch plan (1-based) | `1` |
| `acceptance_criteria` | string | Yes | Specific measurable acceptance criteria | `"All auth endpoints return valid JWT"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[IMPL-001] Created auth middleware..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` -> `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Created 3 files, JWT validation working"` |
| `artifact_path` | string | Path to output artifact relative to session dir | `"artifacts/gongbu-output.md"` |
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
id,title,description,deps,context_from,exec_mode,department,task_prefix,priority,dispatch_batch,acceptance_criteria,wave,status,findings,artifact_path,error
IMPL-001,"Implement JWT auth","Create JWT authentication middleware with token generation, validation, and refresh. Use existing bcrypt patterns from src/auth/. Follow Express middleware convention.","","","csv-wave","gongbu","IMPL","P0","1","JWT tokens generated and validated correctly; middleware integrates with existing auth flow","1","pending","","",""
OPS-001,"Configure CI pipeline","Set up GitHub Actions CI pipeline with test, lint, and build stages for the auth module.","","","csv-wave","bingbu","OPS","P0","1","CI pipeline runs on PR and push to main; all stages pass","1","pending","","",""
DOC-001,"Write auth API docs","Generate OpenAPI 3.0 documentation for all authentication endpoints including JWT token flows.","IMPL-001","IMPL-001","csv-wave","libu","DOC","P1","2","API docs cover all auth endpoints with request/response examples","2","pending","","",""
DATA-001,"Auth metrics dashboard","Create dashboard showing auth success/failure rates, token expiry distribution, and active sessions.","IMPL-001","IMPL-001","csv-wave","hubu","DATA","P2","2","Dashboard displays real-time auth metrics with 4 key charts","2","pending","","",""
QA-001,"Test auth module","Execute comprehensive test suite for auth module. Run unit tests, integration tests, and security scans. Test-fix loop with gongbu if failures found.","IMPL-001","IMPL-001","interactive","xingbu","QA","P1","2","Test pass rate >= 95%; no Critical security issues; code review clean","2","pending","","",""
```

---

### Column Lifecycle

```
Decomposer (Phase 1)     Wave Engine (Phase 2)    Agent (Execution)
---------------------    --------------------     -----------------
id          ---------->  id          ---------->  id
title       ---------->  title       ---------->  (reads)
description ---------->  description ---------->  (reads)
deps        ---------->  deps        ---------->  (reads)
context_from---------->  context_from---------->  (reads)
exec_mode   ---------->  exec_mode   ---------->  (reads)
department  ---------->  department  ---------->  (reads)
task_prefix ---------->  task_prefix ---------->  (reads)
priority    ---------->  priority    ---------->  (reads)
dispatch_batch-------->  dispatch_batch-------->  (reads)
acceptance_criteria--->  acceptance_criteria--->  (reads)
                         wave         ---------->  (reads)
                         prev_context ---------->  (reads)
                                                   status
                                                   findings
                                                   artifact_path
                                                   error
```

---

## Output Schema (JSON)

Agent output via `report_agent_job_result` (csv-wave tasks):

```json
{
  "id": "IMPL-001",
  "status": "completed",
  "findings": "Implemented JWT auth middleware in src/auth/jwt.ts. Created token generation, validation, and refresh endpoints. Integrated with existing bcrypt password flow.",
  "artifact_path": "artifacts/gongbu-output.md",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `codebase_pattern` | `pattern_name` | `{pattern_name, files, description}` | Identified codebase patterns and conventions |
| `dependency_found` | `dep_name` | `{dep_name, version, used_by}` | External dependency discoveries |
| `risk_identified` | `risk_id` | `{risk_id, severity, description, mitigation}` | Risk findings from any agent |
| `implementation_note` | `file_path` | `{file_path, note, line_range}` | Implementation decisions and notes |
| `test_result` | `test_suite` | `{test_suite, pass_rate, failures}` | Test execution results |
| `quality_issue` | `issue_id` | `{issue_id, severity, file, description}` | Quality issues found during review |
| `routing_note` | `task_id` | `{task_id, department, reason}` | Dispatch routing decisions |
| `state_update` | `task_id` | `{state, task_id, department, step}` | Kanban state transition |
| `progress` | `task_id` | `{task_id, current, plan}` | Progress update within task |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T14:30:00Z","worker":"IMPL-001","type":"state_update","data":{"state":"Doing","task_id":"IMPL-001","department":"gongbu","step":"Starting JWT implementation"}}
{"ts":"2026-03-08T14:35:00Z","worker":"IMPL-001","type":"codebase_pattern","data":{"pattern_name":"express-middleware","files":["src/middleware/auth.ts","src/middleware/cors.ts"],"description":"Express middleware follows handler(req,res,next) pattern with error wrapper"}}
{"ts":"2026-03-08T14:40:00Z","worker":"IMPL-001","type":"implementation_note","data":{"file_path":"src/auth/jwt.ts","note":"Using jsonwebtoken library, RS256 algorithm for token signing","line_range":"1-45"}}
{"ts":"2026-03-08T14:50:00Z","worker":"QA-001","type":"test_result","data":{"test_suite":"auth-unit","pass_rate":"97%","failures":["token-expiry-edge-case"]}}
{"ts":"2026-03-08T14:55:00Z","worker":"QA-001","type":"quality_issue","data":{"issue_id":"QI-001","severity":"Medium","file":"src/auth/jwt.ts:23","description":"Missing input validation for refresh token format"}}
```

> Both csv-wave and interactive agents read/write the same discoveries.ndjson file.

---

## Cross-Mechanism Context Flow

| Source | Target | Mechanism |
|--------|--------|-----------|
| CSV task findings | Interactive task | Injected via spawn message or send_input |
| Interactive task result | CSV task prev_context | Read from interactive/{id}-result.json |
| Any agent discovery | Any agent | Shared via discoveries.ndjson |
| Phase 0 plan/review | CSV tasks | Plan and review files in session dir |

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
| Cross-mechanism deps | Interactive->CSV deps resolve correctly | "Cross-mechanism dependency unresolvable: {id}" |
| Department valid | Value in {gongbu, bingbu, hubu, libu, libu-hr, xingbu} | "Invalid department: {value}" |
| Task prefix matches dept | IMPL->gongbu, OPS->bingbu, DATA->hubu, DOC->libu, HR->libu-hr, QA->xingbu | "Prefix-department mismatch: {id}" |
| Acceptance criteria non-empty | Every task has acceptance_criteria | "Empty acceptance criteria for task: {id}" |
