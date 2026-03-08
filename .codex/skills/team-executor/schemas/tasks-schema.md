# Team Executor — CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier | `"1"` |
| `title` | string | Yes | Short task title | `"Implement auth module"` |
| `description` | string | Yes | Detailed task description (self-contained) | `"Create authentication module with JWT support"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"1;2"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"1"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |
| `role` | string | Yes | Role name from session role-specs | `"implementer"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[Task 1] Created auth module..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` → `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Implemented JWT auth with bcrypt password hashing"` |
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
id,title,description,deps,context_from,exec_mode,role,wave,status,findings,error
1,Implement auth module,Create authentication module with JWT,,,"csv-wave","implementer",1,pending,"",""
2,Write tests,Write unit tests for auth module,1,1,"csv-wave","tester",2,pending,"",""
3,Review code,Review implementation and tests,2,2,"interactive","reviewer",3,pending,"",""
```

---

### Column Lifecycle

```
Decomposer (Phase 1)     Wave Engine (Phase 2)    Agent (Execution)
─────────────────────    ────────────────────     ─────────────────
id          ───────────►  id          ──────────►  id
title       ───────────►  title       ──────────►  (reads)
description ───────────►  description ──────────►  (reads)
deps        ───────────►  deps        ──────────►  (reads)
context_from───────────►  context_from──────────►  (reads)
exec_mode   ───────────►  exec_mode   ──────────►  (reads)
role        ───────────►  role        ──────────►  (reads)
                          wave         ──────────►  (reads)
                          prev_context ──────────►  (reads)
                                                    status
                                                    findings
                                                    error
```

---

## Output Schema (JSON)

Agent output via `report_agent_job_result` (csv-wave tasks):

```json
{
  "id": "1",
  "status": "completed",
  "findings": "Implemented JWT authentication with bcrypt password hashing. Created login, logout, and token refresh endpoints. Added middleware for protected routes.",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `implementation` | `file+function` | `{file, function, approach, notes}` | Implementation approach taken |
| `test_result` | `test_name` | `{test_name, status, duration}` | Test execution result |
| `review_comment` | `file+line` | `{file, line, severity, comment}` | Code review comment |
| `pattern` | `pattern_name` | `{pattern, files[], occurrences}` | Code pattern identified |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T14:30:22Z","worker":"1","type":"implementation","data":{"file":"src/auth.ts","function":"login","approach":"JWT-based","notes":"Used bcrypt for password hashing"}}
{"ts":"2026-03-08T14:35:10Z","worker":"2","type":"test_result","data":{"test_name":"auth.login.success","status":"pass","duration":125}}
{"ts":"2026-03-08T14:40:05Z","worker":"3","type":"review_comment","data":{"file":"src/auth.ts","line":42,"severity":"medium","comment":"Consider adding rate limiting"}}
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
| Status enum | status ∈ {pending, completed, failed, skipped} | "Invalid status: {status}" |
| Cross-mechanism deps | Interactive→CSV deps resolve correctly | "Cross-mechanism dependency unresolvable: {id}" |
| Role non-empty | Every task has role | "Empty role for task: {id}" |
| Role exists | Role has corresponding role-spec file | "Role not found: {role}" |
