# Team Review — CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier | `"1"` |
| `title` | string | Yes | Short task title | `"Scan codebase"` |
| `description` | string | Yes | Detailed task description (self-contained) | `"Run toolchain + LLM scan on src/**/*.ts"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"1;2"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"1"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |
| `dimension` | string | Yes | Review dimensions (comma-separated: sec,cor,prf,mnt) | `"sec,cor,prf,mnt"` |
| `target` | string | Yes | Target path or pattern for analysis | `"src/**/*.ts"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[Task 1] Scan found 15 issues..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` → `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Found 15 security issues, 8 correctness bugs"` |
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
id,title,description,deps,context_from,exec_mode,dimension,target,wave,status,findings,error
1,Scan codebase,Run toolchain + LLM scan on target files,,,"csv-wave","sec,cor,prf,mnt","src/**/*.ts",1,pending,"",""
2,Review findings,Deep analysis with root cause enrichment,1,1,"csv-wave","sec,cor,prf,mnt","scan-results.json",2,pending,"",""
3,Fix issues,Apply fixes with rollback-on-failure,2,2,"interactive","","review-report.json",3,pending,"",""
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
dimension   ───────────►  dimension   ──────────►  (reads)
target      ───────────►  target      ──────────►  (reads)
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
  "findings": "Found 15 security issues (3 critical, 5 high, 7 medium), 8 correctness bugs, 4 performance issues, 12 maintainability concerns. Toolchain: tsc (5 errors), eslint (8 warnings), semgrep (3 vulnerabilities). LLM scan: 26 semantic issues.",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `finding` | `file+line+dimension` | `{dimension, file, line, severity, title}` | Code issue discovered by scanner |
| `root_cause` | `finding_id` | `{finding_id, description, related_findings[]}` | Root cause analysis from reviewer |
| `fix_applied` | `file+line` | `{file, line, fix_strategy, status}` | Fix application result from fixer |
| `pattern` | `pattern_name` | `{pattern, files[], occurrences}` | Code pattern identified across files |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T14:30:22Z","worker":"1","type":"finding","data":{"dimension":"sec","file":"src/auth.ts","line":42,"severity":"high","title":"SQL injection vulnerability"}}
{"ts":"2026-03-08T14:35:10Z","worker":"2","type":"root_cause","data":{"finding_id":"SEC-001","description":"Unsanitized user input in query","related_findings":["SEC-002"]}}
{"ts":"2026-03-08T14:40:05Z","worker":"3","type":"fix_applied","data":{"file":"src/auth.ts","line":42,"fix_strategy":"minimal","status":"fixed"}}
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
| Dimension valid | dimension ∈ {sec, cor, prf, mnt} or combinations | "Invalid dimension: {dimension}" |
| Target non-empty | Every task has target | "Empty target for task: {id}" |
