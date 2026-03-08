# Team PlanEx -- CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier | `"PLAN-001"` |
| `title` | string | Yes | Short task title | `"Plan ISS-20260308-120000"` |
| `description` | string | Yes | Detailed task description (self-contained) | `"Generate implementation solution for issue ISS-20260308-120000"` |
| `role` | enum | Yes | Worker role: `planner` or `executor` | `"planner"` |
| `issue_ids` | string | Yes | Semicolon-separated issue IDs | `"ISS-20260308-120000"` |
| `input_type` | string | No | Input source type (planner only): `issues`, `text`, or `plan` | `"issues"` |
| `raw_input` | string | No | Raw input text (planner only) | `"ISS-20260308-120000"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |
| `execution_method` | string | No | CLI tool for EXEC tasks: codex, gemini, qwen, or empty | `"gemini"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"PLAN-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"PLAN-001"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[PLAN-001] Designed 4-task solution..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` -> `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Solution designed with 4 implementation tasks..."` |
| `artifact_path` | string | Path to generated artifact file | `"artifacts/solutions/ISS-20260308-120000.json"` |
| `error` | string | Error message if failed | `""` |

---

### exec_mode Values

| Value | Mechanism | Description |
|-------|-----------|-------------|
| `csv-wave` | `spawn_agents_on_csv` | One-shot batch execution within wave |
| `interactive` | `spawn_agent`/`wait`/`send_input`/`close_agent` | Multi-round individual execution (edge cases) |

> In standard PlanEx, all tasks use `csv-wave`. Interactive mode is reserved for rare multi-round coordination scenarios.

---

### Role Values

| Role | Task Prefixes | Responsibility |
|------|---------------|----------------|
| `planner` | PLAN-* | Requirement decomposition, solution design, issue creation |
| `executor` | EXEC-* | Solution implementation, testing, verification, commit |

---

### Example Data

```csv
id,title,description,role,issue_ids,input_type,raw_input,exec_mode,execution_method,deps,context_from,wave,status,findings,artifact_path,error
"PLAN-001","Plan issue-1","Generate solution for ISS-20260308-120000","planner","ISS-20260308-120000","issues","ISS-20260308-120000","csv-wave","","","","1","pending","","",""
"PLAN-002","Plan issue-2","Generate solution for ISS-20260308-120001","planner","ISS-20260308-120001","issues","ISS-20260308-120001","csv-wave","","","","1","pending","","",""
"EXEC-001","Implement issue-1","Implement solution for ISS-20260308-120000","executor","ISS-20260308-120000","","","csv-wave","gemini","PLAN-001","PLAN-001","2","pending","","",""
"EXEC-002","Implement issue-2","Implement solution for ISS-20260308-120001","executor","ISS-20260308-120001","","","csv-wave","gemini","PLAN-002","PLAN-002","2","pending","","",""
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
input_type  ---------->  input_type  ---------->  (reads, planner)
raw_input   ---------->  raw_input   ---------->  (reads, planner)
exec_mode   ---------->  exec_mode   ---------->  (reads)
execution_method ------>  execution_method ----->  (reads, executor)
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
  "id": "PLAN-001",
  "status": "completed",
  "findings": "Designed solution for ISS-20260308-120000: 4 implementation tasks, 6 files affected. Approach: refactor authentication handler to support token refresh.",
  "artifact_path": "artifacts/solutions/ISS-20260308-120000.json",
  "error": ""
}
```

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `solution_designed` | `issue_id` | `{issue_id, approach, task_count, estimated_files}` | Planner: solution plan completed |
| `conflict_warning` | `issue_ids` | `{issue_ids, overlapping_files}` | Planner: file overlap between issues |
| `pattern_found` | `pattern+location` | `{pattern, location, description}` | Any: code pattern identified |
| `impl_result` | `issue_id` | `{issue_id, files_changed, tests_pass, commit}` | Executor: implementation outcome |
| `test_failure` | `issue_id` | `{issue_id, test_file, error_msg}` | Executor: test failure details |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00Z","worker":"PLAN-001","type":"solution_designed","data":{"issue_id":"ISS-20260308-120000","approach":"refactor","task_count":4,"estimated_files":6}}
{"ts":"2026-03-08T10:05:00Z","worker":"PLAN-002","type":"conflict_warning","data":{"issue_ids":["ISS-20260308-120000","ISS-20260308-120001"],"overlapping_files":["src/auth/handler.ts"]}}
{"ts":"2026-03-08T10:10:00Z","worker":"EXEC-001","type":"impl_result","data":{"issue_id":"ISS-20260308-120000","files_changed":3,"tests_pass":true,"commit":"abc123"}}
```

> All agents (planner and executor) read/write the same discoveries.ndjson file.

---

## Cross-Wave Context Flow

| Source | Target | Mechanism |
|--------|--------|-----------|
| PLAN-N findings | EXEC-N prev_context | Injected via prev_context column in wave-2.csv |
| PLAN-N artifact_path | EXEC-N | Executor reads solution file from artifact_path |
| Any agent discovery | Any agent | Shared via discoveries.ndjson |

---

## Pipeline Structure

### Standard Two-Wave Pipeline

| Wave | Tasks | Role | Parallelism |
|------|-------|------|-------------|
| 1 | PLAN-001..N | planner | All concurrent (up to max_concurrency) |
| 2 | EXEC-001..N | executor | All concurrent (up to max_concurrency) |

Each EXEC-NNN depends on its corresponding PLAN-NNN. If PLAN-NNN fails, EXEC-NNN is automatically skipped.

---

## Solution Artifact Schema

Written by planner agents to `artifacts/solutions/{issueId}.json`:

```json
{
  "session_id": "planex-xxx-20260308",
  "issue_id": "ISS-20260308-120000",
  "solution": {
    "title": "Add rate limiting middleware",
    "approach": "Create express middleware with sliding window",
    "tasks": [
      {
        "order": 1,
        "description": "Create rate limiter middleware in src/middleware/rate-limit.ts",
        "files_touched": ["src/middleware/rate-limit.ts"]
      },
      {
        "order": 2,
        "description": "Add per-route configuration in src/config/routes.ts",
        "files_touched": ["src/config/routes.ts"]
      }
    ],
    "estimated_complexity": "Medium",
    "estimated_files": 4
  },
  "planned_at": "2026-03-08T10:00:00Z"
}
```

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
| Role valid | Value in {planner, executor} | "Invalid role: {role}" |
| Description non-empty | Every task has description | "Empty description for task: {id}" |
| Status enum | status in {pending, completed, failed, skipped} | "Invalid status" |
| EXEC deps on PLAN | Every EXEC-N must depend on PLAN-N | "EXEC task without PLAN dependency: {id}" |
| Issue IDs non-empty | Every task has at least one issue_id | "No issue_ids for task: {id}" |
