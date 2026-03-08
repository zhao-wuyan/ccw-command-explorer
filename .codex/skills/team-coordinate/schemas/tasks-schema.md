# Team Coordinate -- CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier (PREFIX-NNN) | `"RESEARCH-001"` |
| `title` | string | Yes | Short task title | `"Investigate auth patterns"` |
| `description` | string | Yes | Detailed task description (self-contained) with goal, steps, success criteria, key files | `"PURPOSE: Research JWT auth patterns..."` |
| `role` | string | Yes | Dynamic role name | `"researcher"` |
| `responsibility_type` | enum | Yes | `orchestration`, `read-only`, `code-gen`, `code-gen-docs`, `validation` | `"orchestration"` |
| `output_type` | enum | Yes | `artifact` (session files), `codebase` (project files), `mixed` | `"artifact"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"RESEARCH-001;DESIGN-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"RESEARCH-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[RESEARCH-001] Found 3 auth patterns..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` -> `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Implemented JWT middleware with refresh token support..."` |
| `artifacts_produced` | string | Semicolon-separated paths of produced artifacts | `"artifacts/research-findings.md;src/auth/jwt.ts"` |
| `error` | string | Error message if failed | `""` |

---

### exec_mode Values

| Value | Mechanism | Description |
|-------|-----------|-------------|
| `csv-wave` | `spawn_agents_on_csv` | One-shot batch execution within wave |
| `interactive` | `spawn_agent`/`wait`/`send_input`/`close_agent` | Multi-round individual execution |

Interactive tasks appear in master CSV for dependency tracking but are NOT included in wave-{N}.csv files.

---

### Dynamic Role Prefixes

| Capability | Prefix | Responsibility Type |
|------------|--------|---------------------|
| researcher | RESEARCH | orchestration |
| writer | DRAFT | code-gen-docs |
| developer | IMPL | code-gen |
| designer | DESIGN | orchestration |
| analyst | ANALYSIS | read-only |
| tester | TEST | validation |
| planner | PLAN | orchestration |
| (default) | TASK | orchestration |

---

### Example Data

```csv
id,title,description,role,responsibility_type,output_type,deps,context_from,exec_mode,wave,status,findings,artifacts_produced,error
"RESEARCH-001","Research auth patterns","PURPOSE: Investigate JWT authentication patterns and industry best practices | Success: Comprehensive findings document with pattern comparison\nTASK:\n- Survey JWT vs session-based auth\n- Compare token refresh strategies\n- Document security considerations\nCONTEXT:\n- Key files: src/auth/*, src/middleware/*\nEXPECTED: artifacts/research-findings.md","researcher","orchestration","artifact","","","csv-wave","1","pending","","",""
"DESIGN-001","Design auth architecture","PURPOSE: Design authentication module architecture based on research | Success: Architecture document with component diagram\nTASK:\n- Define auth module structure\n- Design token lifecycle\n- Plan middleware integration\nCONTEXT:\n- Upstream: RESEARCH-001 findings\nEXPECTED: artifacts/auth-design.md","designer","orchestration","artifact","RESEARCH-001","RESEARCH-001","csv-wave","2","pending","","",""
"IMPL-001","Implement auth module","PURPOSE: Build JWT authentication middleware | Success: Working auth module with tests passing\nTASK:\n- Create JWT utility functions\n- Implement auth middleware\n- Add route guards\nCONTEXT:\n- Upstream: DESIGN-001 architecture\n- Key files: src/auth/*, src/middleware/*\nEXPECTED: Source files + artifacts/implementation-summary.md","developer","code-gen","mixed","DESIGN-001","DESIGN-001","csv-wave","3","pending","","",""
"TEST-001","Test auth implementation","PURPOSE: Validate auth module correctness | Success: All tests pass, coverage >= 80%\nTASK:\n- Write unit tests for JWT utilities\n- Write integration tests for middleware\n- Run test suite\nCONTEXT:\n- Upstream: IMPL-001 implementation\nEXPECTED: artifacts/test-report.md","tester","validation","artifact","IMPL-001","IMPL-001","csv-wave","4","pending","","",""
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
responsibility_type --->  responsibility_type --->  (reads)
output_type ---------->  output_type ---------->  (reads)
deps        ---------->  deps        ---------->  (reads)
context_from---------->  context_from---------->  (reads)
exec_mode   ---------->  exec_mode   ---------->  (reads)
                         wave         ---------->  (reads)
                         prev_context ---------->  (reads)
                                                   status
                                                   findings
                                                   artifacts_produced
                                                   error
```

---

## Output Schema (JSON)

Agent output via `report_agent_job_result` (csv-wave tasks):

```json
{
  "id": "IMPL-001",
  "status": "completed",
  "findings": "Implemented JWT auth middleware with access/refresh token support. Created 3 files: jwt.ts, auth-middleware.ts, route-guard.ts. All syntax checks pass.",
  "artifacts_produced": "artifacts/implementation-summary.md;src/auth/jwt.ts;src/auth/auth-middleware.ts",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `pattern_found` | `data.pattern_name+data.location` | `{pattern_name, location, description}` | Design pattern identified |
| `file_modified` | `data.file` | `{file, change, lines_added}` | File change recorded |
| `dependency_found` | `data.from+data.to` | `{from, to, type}` | Dependency relationship |
| `issue_found` | `data.file+data.line` | `{file, line, severity, description}` | Issue discovered |
| `decision_made` | `data.decision` | `{decision, rationale, impact}` | Design decision |
| `artifact_produced` | `data.path` | `{name, path, producer, type}` | Deliverable created |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00Z","worker":"RESEARCH-001","type":"pattern_found","data":{"pattern_name":"Repository Pattern","location":"src/repos/","description":"Data access layer uses repository pattern"}}
{"ts":"2026-03-08T10:05:00Z","worker":"IMPL-001","type":"file_modified","data":{"file":"src/auth/jwt.ts","change":"Added JWT middleware","lines_added":45}}
{"ts":"2026-03-08T10:10:00Z","worker":"IMPL-001","type":"artifact_produced","data":{"name":"implementation-summary","path":"artifacts/implementation-summary.md","producer":"developer","type":"markdown"}}
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
| Role valid | role matches a generated role-instruction | "No instruction for role: {role}" |
| Cross-mechanism deps | Interactive to CSV deps resolve correctly | "Cross-mechanism dependency unresolvable: {id}" |
