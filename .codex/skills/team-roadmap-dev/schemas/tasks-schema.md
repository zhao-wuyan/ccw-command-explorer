# Roadmap-Driven Development — CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier | `"PLAN-101"` |
| `title` | string | Yes | Short task title | `"Phase 1 Planning"` |
| `description` | string | Yes | Detailed task description (self-contained) | `"Research and plan for authentication module..."` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"PLAN-101"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"PLAN-101"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |
| `phase` | integer | Yes | Phase number (1-based) | `1` |
| `role` | enum | Yes | Role name: `planner`, `executor`, `verifier` | `"executor"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[PLAN-101] Created implementation plan..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` → `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Implemented JWT middleware in src/middleware/auth.ts..."` |
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
id,title,description,deps,context_from,exec_mode,phase,role,wave,status,findings,error
PLAN-101,Phase 1 Planning,Research and plan for authentication module,,,"interactive",1,planner,1,pending,"",""
EXEC-101,Implement auth routes,Create Express routes for login/logout/register,PLAN-101,PLAN-101,"csv-wave",1,executor,2,pending,"",""
EXEC-102,Implement JWT middleware,Create JWT token generation and validation,PLAN-101,PLAN-101,"csv-wave",1,executor,2,pending,"",""
VERIFY-101,Verify Phase 1,Test and validate phase 1 implementation,"EXEC-101;EXEC-102","EXEC-101;EXEC-102","interactive",1,verifier,3,pending,"",""
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
phase       ───────────►  phase       ──────────►  (reads)
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
  "id": "EXEC-101",
  "status": "completed",
  "findings": "Implemented authentication routes in src/routes/auth.ts with login, logout, and register endpoints. Added input validation and error handling.",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `file_pattern` | `pattern` | `{pattern, files[], description}` | Code patterns discovered during exploration |
| `dependency` | `from+to` | `{from, to, type}` | Module dependencies identified |
| `risk` | `description` | `{description, severity, mitigation}` | Implementation risks and concerns |
| `test_gap` | `area` | `{area, description, priority}` | Testing gaps identified during verification |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T14:30:22Z","worker":"EXEC-101","type":"file_pattern","data":{"pattern":"auth middleware","files":["src/middleware/auth.ts"],"description":"JWT validation pattern"}}
{"ts":"2026-03-08T14:35:10Z","worker":"EXEC-102","type":"dependency","data":{"from":"auth.ts","to":"jwt.ts","type":"import"}}
{"ts":"2026-03-08T15:20:45Z","worker":"VERIFY-101","type":"test_gap","data":{"area":"token refresh","description":"No tests for token refresh flow","priority":"high"}}
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
| Role valid | role ∈ {planner, executor, verifier} | "Invalid role: {role}" |
| Phase valid | phase >= 1 | "Invalid phase: {phase}" |
