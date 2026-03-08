# Team Issue Resolution -- CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier | `"EXPLORE-001"` |
| `title` | string | Yes | Short task title | `"Context analysis"` |
| `description` | string | Yes | Detailed task description (self-contained) | `"Analyze issue context and map codebase impact for ISS-20260308-120000"` |
| `role` | enum | Yes | Worker role: explorer, planner, reviewer, integrator, implementer | `"explorer"` |
| `issue_ids` | string | Yes | Semicolon-separated issue IDs | `"ISS-20260308-120000;ISS-20260308-120001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |
| `execution_method` | string | No | CLI tool for BUILD tasks: codex, gemini, qwen, or empty | `"gemini"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"EXPLORE-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"EXPLORE-001"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[EXPLORE-001] Found 5 relevant files..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` -> `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Identified 3 affected modules..."` |
| `artifact_path` | string | Path to generated artifact file | `"explorations/context-ISS-20260308-120000.json"` |
| `error` | string | Error message if failed | `""` |

---

### exec_mode Values

| Value | Mechanism | Description |
|-------|-----------|-------------|
| `csv-wave` | `spawn_agents_on_csv` | One-shot batch execution within wave |
| `interactive` | `spawn_agent`/`wait`/`send_input`/`close_agent` | Multi-round individual execution (review gates) |

Interactive tasks appear in master CSV for dependency tracking but are NOT included in wave-{N}.csv files.

---

### Role Values

| Role | Task Prefixes | Responsibility |
|------|---------------|----------------|
| `explorer` | EXPLORE-* | Codebase exploration, context analysis, impact assessment |
| `planner` | SOLVE-*, SOLVE-fix-* | Solution design, task decomposition, revision |
| `reviewer` | AUDIT-* | Technical review with multi-dimensional scoring |
| `integrator` | MARSHAL-* | Queue formation, conflict detection, execution ordering |
| `implementer` | BUILD-* | Code implementation, testing, verification |

---

### Example Data

```csv
id,title,description,role,issue_ids,exec_mode,execution_method,deps,context_from,wave,status,findings,artifact_path,error
"EXPLORE-001","Context analysis","Analyze issue context and map codebase impact for ISS-20260308-120000","explorer","ISS-20260308-120000","csv-wave","","","","1","pending","","",""
"SOLVE-001","Solution design","Design solution and decompose into implementation tasks for ISS-20260308-120000","planner","ISS-20260308-120000","csv-wave","","EXPLORE-001","EXPLORE-001","2","pending","","",""
"AUDIT-001","Technical review","Review solution for feasibility risk and completeness","reviewer","ISS-20260308-120000","interactive","","SOLVE-001","SOLVE-001","3","pending","","",""
"MARSHAL-001","Queue formation","Form execution queue with conflict detection and optimal ordering","integrator","ISS-20260308-120000","csv-wave","","AUDIT-001","SOLVE-001","4","pending","","",""
"BUILD-001","Implementation","Implement solution plan and verify with tests","implementer","ISS-20260308-120000","csv-wave","gemini","MARSHAL-001","EXPLORE-001;SOLVE-001","5","pending","","",""
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
issue_ids   ---------->  issue_ids   ---------->  (reads)
exec_mode   ---------->  exec_mode   ---------->  (reads)
execution_method ------>  execution_method ----->  (reads)
deps        ---------->  deps        ---------->  (reads)
context_from---------->  context_from---------->  (reads)
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
  "id": "EXPLORE-001",
  "status": "completed",
  "findings": "Identified 5 relevant files in src/auth/. Impact scope: medium. Key dependency: shared/utils/token.ts. Existing pattern: middleware-chain in src/middleware/.",
  "artifact_path": "explorations/context-ISS-20260308-120000.json",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `file_found` | `path` | `{path, relevance, purpose}` | Relevant file discovered during exploration |
| `pattern_found` | `pattern+location` | `{pattern, location, description}` | Code pattern identified |
| `dependency_found` | `from+to` | `{from, to, type}` | Dependency relationship between modules |
| `solution_approach` | `issue_id` | `{issue_id, approach, estimated_files}` | Solution strategy chosen |
| `conflict_found` | `files` | `{issues, files, resolution}` | File conflict between issue solutions |
| `impl_result` | `issue_id` | `{issue_id, files_changed, tests_pass}` | Implementation outcome |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00Z","worker":"EXPLORE-001","type":"file_found","data":{"path":"src/auth/handler.ts","relevance":"high","purpose":"Main auth request handler"}}
{"ts":"2026-03-08T10:01:00Z","worker":"EXPLORE-001","type":"pattern_found","data":{"pattern":"middleware-chain","location":"src/middleware/","description":"Express middleware chain pattern used across all route handlers"}}
{"ts":"2026-03-08T10:05:00Z","worker":"SOLVE-001","type":"solution_approach","data":{"issue_id":"ISS-20260308-120000","approach":"refactor-extract","estimated_files":5}}
{"ts":"2026-03-08T10:15:00Z","worker":"MARSHAL-001","type":"conflict_found","data":{"issues":["ISS-20260308-120000","ISS-20260308-120001"],"files":["src/auth/handler.ts"],"resolution":"sequential"}}
```

> Both csv-wave and interactive agents read/write the same discoveries.ndjson file.

---

## Cross-Mechanism Context Flow

| Source | Target | Mechanism |
|--------|--------|-----------|
| CSV task findings | Interactive task | Injected via spawn message (prev_context) |
| Interactive task result | CSV task prev_context | Read from interactive/{id}-result.json |
| Any agent discovery | Any agent | Shared via discoveries.ndjson |

---

## Pipeline-Specific Schemas

### Quick Pipeline (4 tasks, 4 waves)

| Wave | Tasks | exec_mode |
|------|-------|-----------|
| 1 | EXPLORE-001 | csv-wave |
| 2 | SOLVE-001 | csv-wave |
| 3 | MARSHAL-001 | csv-wave |
| 4 | BUILD-001 | csv-wave |

### Full Pipeline (5 tasks, 5 waves)

| Wave | Tasks | exec_mode |
|------|-------|-----------|
| 1 | EXPLORE-001 | csv-wave |
| 2 | SOLVE-001 | csv-wave |
| 3 | AUDIT-001 | interactive |
| 4 | MARSHAL-001 | csv-wave |
| 5 | BUILD-001 | csv-wave |

### Batch Pipeline (N+N+1+1+M tasks)

| Wave | Tasks | exec_mode | Parallelism |
|------|-------|-----------|-------------|
| 1 | EXPLORE-001..N | csv-wave | max 5 concurrent |
| 2 | SOLVE-001..N | csv-wave | sequential |
| 3 | AUDIT-001 | interactive | 1 |
| 4 | MARSHAL-001 | csv-wave | 1 |
| 5 | BUILD-001..M (deferred) | csv-wave | max 3 concurrent |

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
| Role valid | Value in {explorer, planner, reviewer, integrator, implementer} | "Invalid role: {role}" |
| Description non-empty | Every task has description | "Empty description for task: {id}" |
| Status enum | status in {pending, completed, failed, skipped} | "Invalid status: {status}" |
| Cross-mechanism deps | Interactive->CSV deps resolve correctly | "Cross-mechanism dependency unresolvable: {id}" |
| Issue IDs non-empty | Every task has at least one issue_id | "No issue_ids for task: {id}" |
