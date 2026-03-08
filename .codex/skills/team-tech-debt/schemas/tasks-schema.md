# Team Tech Debt -- CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier (TDPREFIX-NNN) | `"TDSCAN-001"` |
| `title` | string | Yes | Short task title | `"Multi-dimension debt scan"` |
| `description` | string | Yes | Detailed task description (self-contained) | `"Scan codebase across 5 dimensions..."` |
| `role` | enum | Yes | Worker role: `scanner`, `assessor`, `planner`, `executor`, `validator` | `"scanner"` |
| `debt_dimension` | string | Yes | Target dimensions: `all`, or specific dimension(s) | `"all"` |
| `pipeline_mode` | enum | Yes | Pipeline mode: `scan`, `remediate`, `targeted` | `"remediate"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"TDSCAN-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"TDSCAN-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from pipeline position) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[TDSCAN-001] Found 42 debt items..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` -> `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Found 42 debt items: 5 critical, 12 high..."` |
| `debt_items_count` | integer | Number of debt items processed | `42` |
| `artifacts_produced` | string | Semicolon-separated artifact paths | `"scan/debt-inventory.json"` |
| `error` | string | Error message if failed | `""` |

---

### exec_mode Values

| Value | Mechanism | Description |
|-------|-----------|-------------|
| `csv-wave` | `spawn_agents_on_csv` | One-shot batch execution within wave |
| `interactive` | `spawn_agent`/`wait`/`send_input`/`close_agent` | Plan approval, GC loop management |

Interactive tasks appear in master CSV for dependency tracking but are NOT included in wave-{N}.csv files.

---

### Role Registry

| Role | Prefix | Responsibility | inner_loop |
|------|--------|----------------|------------|
| scanner | TDSCAN | Multi-dimension debt scanning | false |
| assessor | TDEVAL | Quantitative severity assessment | false |
| planner | TDPLAN | Phased remediation planning | false |
| executor | TDFIX | Worktree-based debt cleanup | true |
| validator | TDVAL | 4-layer validation | false |

---

### Debt Dimensions

| Dimension | Description | Tools/Methods |
|-----------|-------------|---------------|
| code | Code smells, complexity, duplication | Static analysis, complexity metrics |
| architecture | Coupling, circular deps, layering violations | Dependency graph, coupling analysis |
| testing | Missing tests, low coverage, test quality | Coverage analysis, test quality |
| dependency | Outdated packages, vulnerabilities | Outdated check, vulnerability scan |
| documentation | Missing docs, stale API docs | Doc coverage, API doc check |

---

### Example Data

```csv
id,title,description,role,debt_dimension,pipeline_mode,deps,context_from,exec_mode,wave,status,findings,debt_items_count,artifacts_produced,error
"TDSCAN-001","Multi-dimension debt scan","Scan codebase across code, architecture, testing, dependency, and documentation dimensions. Produce structured debt inventory with severity rankings.\nSession: .workflow/.csv-wave/td-auth-20260308\nScope: src/**","scanner","all","remediate","","","csv-wave","1","pending","","0","",""
"TDEVAL-001","Severity assessment","Evaluate each debt item: impact score (1-5) x cost score (1-5). Classify into priority quadrants: quick-win, strategic, backlog, defer.\nSession: .workflow/.csv-wave/td-auth-20260308\nUpstream: TDSCAN-001 debt inventory","assessor","all","remediate","TDSCAN-001","TDSCAN-001","csv-wave","2","pending","","0","",""
"TDPLAN-001","Remediation planning","Create 3-phase remediation plan: Phase 1 quick-wins, Phase 2 systematic, Phase 3 prevention.\nSession: .workflow/.csv-wave/td-auth-20260308\nUpstream: TDEVAL-001 priority matrix","planner","all","remediate","TDEVAL-001","TDEVAL-001","csv-wave","3","pending","","0","",""
"PLAN-APPROVE","Plan approval gate","Review remediation plan and approve for execution","","all","remediate","TDPLAN-001","TDPLAN-001","interactive","3","pending","","0","",""
"TDFIX-001","Debt cleanup execution","Apply remediation plan actions in worktree: refactor, update deps, add tests, add docs.\nSession: .workflow/.csv-wave/td-auth-20260308\nWorktree: .worktrees/td-auth-20260308","executor","all","remediate","PLAN-APPROVE","TDPLAN-001","csv-wave","4","pending","","0","",""
"TDVAL-001","Cleanup validation","Run 4-layer validation: tests, type check, lint, quality analysis. Compare before/after debt scores.\nSession: .workflow/.csv-wave/td-auth-20260308\nWorktree: .worktrees/td-auth-20260308","validator","all","remediate","TDFIX-001","TDFIX-001","csv-wave","5","pending","","0","",""
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
debt_dimension ------->  debt_dimension ------->  (reads)
pipeline_mode -------->  pipeline_mode -------->  (reads)
deps        ---------->  deps        ---------->  (reads)
context_from---------->  context_from---------->  (reads)
exec_mode   ---------->  exec_mode   ---------->  (reads)
                         wave         ---------->  (reads)
                         prev_context ---------->  (reads)
                                                   status
                                                   findings
                                                   debt_items_count
                                                   artifacts_produced
                                                   error
```

---

## Output Schema (JSON)

Agent output via `report_agent_job_result` (csv-wave tasks):

```json
{
  "id": "TDSCAN-001",
  "status": "completed",
  "findings": "Scanned 5 dimensions. Found 42 debt items: 5 critical, 12 high, 15 medium, 10 low. Top issues: complex auth logic (code), circular deps in services (architecture), missing integration tests (testing).",
  "debt_items_count": "42",
  "artifacts_produced": "scan/debt-inventory.json",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `debt_item_found` | `data.file+data.line` | `{id, dimension, severity, file, line, description, suggestion, estimated_effort}` | Tech debt item identified |
| `pattern_found` | `data.pattern_name+data.location` | `{pattern_name, location, description}` | Anti-pattern found |
| `fix_applied` | `data.file+data.change` | `{file, change, lines_modified, debt_id}` | Fix applied |
| `regression_found` | `data.file+data.test` | `{file, test, description, severity}` | Regression in validation |
| `dependency_issue` | `data.package+data.issue` | `{package, current, latest, issue, severity}` | Dependency problem |
| `metric_recorded` | `data.metric` | `{metric, value, dimension, file}` | Quality metric |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00Z","worker":"TDSCAN-001","type":"debt_item_found","data":{"id":"TD-001","dimension":"code","severity":"high","file":"src/auth/jwt.ts","line":42,"description":"Cyclomatic complexity 18 exceeds threshold 10","suggestion":"Extract token validation logic","estimated_effort":"medium"}}
{"ts":"2026-03-08T10:05:00Z","worker":"TDSCAN-001","type":"dependency_issue","data":{"package":"express","current":"4.17.1","latest":"4.19.2","issue":"Known security vulnerability CVE-2024-XXXX","severity":"critical"}}
{"ts":"2026-03-08T10:30:00Z","worker":"TDFIX-001","type":"fix_applied","data":{"file":"src/auth/jwt.ts","change":"Extracted validateToken helper","lines_modified":25,"debt_id":"TD-001"}}
```

> Both csv-wave and interactive agents read/write the same discoveries.ndjson file.

---

## Cross-Mechanism Context Flow

| Source | Target | Mechanism |
|--------|--------|-----------|
| Scanner findings | Assessor | prev_context from TDSCAN + scan/debt-inventory.json |
| Assessor matrix | Planner | prev_context from TDEVAL + assessment/priority-matrix.json |
| Planner plan | Plan Approver | Interactive spawn reads plan/remediation-plan.md |
| Plan approval | Executor | Interactive result in interactive/PLAN-APPROVE-result.json |
| Executor fixes | Validator | prev_context from TDFIX + fixes/fix-log.json |
| Validator results | GC Loop | Interactive read of validation/validation-report.json |
| Any agent discovery | Any agent | Shared via discoveries.ndjson |

---

## GC Loop Schema

| Field | Type | Description |
|-------|------|-------------|
| `gc_rounds` | integer | Current GC round (0-based) |
| `max_gc_rounds` | integer | Maximum rounds (3) |
| `fix_task_id` | string | Current fix task ID (TDFIX-fix-N) |
| `val_task_id` | string | Current validation task ID (TDVAL-recheck-N) |
| `regressions` | array | List of regression descriptions |

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
| Role valid | role in {scanner, assessor, planner, executor, validator} | "Invalid role: {role}" |
| Pipeline mode valid | pipeline_mode in {scan, remediate, targeted} | "Invalid pipeline_mode: {mode}" |
| Description non-empty | Every task has description | "Empty description for task: {id}" |
| Status enum | status in {pending, completed, failed, skipped} | "Invalid status: {status}" |
| GC round limit | gc_rounds <= 3 | "GC round limit exceeded" |
