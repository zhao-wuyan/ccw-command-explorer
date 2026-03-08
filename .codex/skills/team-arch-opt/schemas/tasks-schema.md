# Team Architecture Optimization -- CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier (PREFIX-NNN) | `"ANALYZE-001"` |
| `title` | string | Yes | Short task title | `"Analyze architecture"` |
| `description` | string | Yes | Detailed task description (self-contained) with goal, inputs, outputs, success criteria | `"Analyze codebase architecture..."` |
| `role` | enum | Yes | Worker role: `analyzer`, `designer`, `refactorer`, `validator`, `reviewer` | `"analyzer"` |
| `issue_type` | string | No | Architecture issue category: CYCLE, COUPLING, COHESION, GOD_CLASS, DUPLICATION, LAYER_VIOLATION, DEAD_CODE, API_BLOAT | `"CYCLE"` |
| `priority` | enum | No | P0 (Critical), P1 (High), P2 (Medium), P3 (Low) | `"P0"` |
| `target_files` | string | No | Semicolon-separated file paths to focus on | `"src/auth/index.ts;src/user/index.ts"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"ANALYZE-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"ANALYZE-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[ANALYZE-001] Found 5 architecture issues..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` -> `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Found 3 circular deps, 2 God Classes..."` |
| `verdict` | string | Validation/review verdict: PASS, WARN, FAIL, APPROVE, REVISE, REJECT | `"PASS"` |
| `artifacts_produced` | string | Semicolon-separated paths of produced artifacts | `"artifacts/architecture-report.md"` |
| `error` | string | Error message if failed | `""` |

---

### exec_mode Values

| Value | Mechanism | Description |
|-------|-----------|-------------|
| `csv-wave` | `spawn_agents_on_csv` | One-shot batch execution within wave |
| `interactive` | `spawn_agent`/`wait`/`send_input`/`close_agent` | Multi-round individual execution |

Interactive tasks appear in master CSV for dependency tracking but are NOT included in wave-{N}.csv files.

---

### Role Prefix Mapping

| Role | Prefix | Stage | Responsibility |
|------|--------|-------|----------------|
| analyzer | ANALYZE | 1 | Architecture analysis, baseline metrics, issue identification |
| designer | DESIGN | 2 | Refactoring plan design, strategy selection, prioritization |
| refactorer | REFACTOR / FIX | 3 | Code implementation, refactoring application, targeted fixes |
| validator | VALIDATE | 4 | Build checks, test suite, metric validation, API compatibility |
| reviewer | REVIEW | 4 | Code review for correctness, patterns, completeness, safety |

---

### Example Data

```csv
id,title,description,role,issue_type,priority,target_files,deps,context_from,exec_mode,wave,status,findings,verdict,artifacts_produced,error
"ANALYZE-001","Analyze architecture","PURPOSE: Analyze codebase architecture to identify structural issues\nTASK:\n- Build import graph, detect circular deps\n- Identify God Classes (>500 LOC, >10 methods)\n- Calculate coupling/cohesion metrics\n- Detect dead code and dead exports\nINPUT: Codebase under target scope\nOUTPUT: artifacts/architecture-baseline.json + artifacts/architecture-report.md\nSUCCESS: Ranked issue list with severity, baseline metrics collected\nSESSION: .workflow/.csv-wave/tao-example-20260308","analyzer","","","","","","csv-wave","1","pending","","","",""
"DESIGN-001","Design refactoring plan","PURPOSE: Design prioritized refactoring plan from architecture report\nTASK:\n- For each issue, select refactoring strategy\n- Prioritize by impact/effort ratio (P0-P3)\n- Define measurable success criteria per refactoring\n- Assign unique REFACTOR-IDs with non-overlapping file targets\nINPUT: artifacts/architecture-report.md + artifacts/architecture-baseline.json\nOUTPUT: artifacts/refactoring-plan.md\nSUCCESS: Prioritized plan with self-contained REFACTOR blocks\nSESSION: .workflow/.csv-wave/tao-example-20260308","designer","","","","ANALYZE-001","ANALYZE-001","csv-wave","2","pending","","","",""
"REFACTOR-001","Implement refactorings","PURPOSE: Implement architecture refactoring changes per plan\nTASK:\n- Apply refactorings in priority order (P0 first)\n- Update all import references when moving/renaming\n- Update all test files referencing moved symbols\n- Preserve existing behavior\nINPUT: artifacts/refactoring-plan.md\nOUTPUT: Modified source files\nSUCCESS: All planned structural changes applied, no dangling imports\nSESSION: .workflow/.csv-wave/tao-example-20260308","refactorer","","","","DESIGN-001","DESIGN-001","csv-wave","3","pending","","","",""
"VALIDATE-001","Validate refactoring","PURPOSE: Validate refactoring improves architecture without breaking functionality\nTASK:\n- Build check: zero new compilation errors\n- Test suite: all previously passing tests still pass\n- Metrics: coupling improved or neutral, no new cycles\n- API: public signatures preserved\nINPUT: artifacts/architecture-baseline.json + artifacts/refactoring-plan.md\nOUTPUT: artifacts/validation-results.json\nSUCCESS: All dimensions PASS\nSESSION: .workflow/.csv-wave/tao-example-20260308","validator","","","","REFACTOR-001","REFACTOR-001","csv-wave","4","pending","","","",""
"REVIEW-001","Review refactoring code","PURPOSE: Review refactoring changes for correctness and quality\nTASK:\n- Correctness: no behavior changes, all references updated\n- Pattern consistency: follows existing conventions\n- Completeness: imports, tests, configs all updated\n- Migration safety: no dangling refs, backward compatible\n- Best practices: SOLID principles, appropriate abstraction\nINPUT: artifacts/refactoring-plan.md + changed files\nOUTPUT: artifacts/review-report.md\nSUCCESS: APPROVE verdict (no Critical/High findings)\nSESSION: .workflow/.csv-wave/tao-example-20260308","reviewer","","","","REFACTOR-001","REFACTOR-001","csv-wave","4","pending","","","",""
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
issue_type  ---------->  issue_type  ---------->  (reads)
priority    ---------->  priority    ---------->  (reads)
target_files---------->  target_files---------->  (reads)
deps        ---------->  deps        ---------->  (reads)
context_from---------->  context_from---------->  (reads)
exec_mode   ---------->  exec_mode   ---------->  (reads)
                         wave         ---------->  (reads)
                         prev_context ---------->  (reads)
                                                   status
                                                   findings
                                                   verdict
                                                   artifacts_produced
                                                   error
```

---

## Output Schema (JSON)

Agent output via `report_agent_job_result` (csv-wave tasks):

```json
{
  "id": "ANALYZE-001",
  "status": "completed",
  "findings": "Found 5 architecture issues: 2 circular deps (auth<->user, service<->repo), 1 God Class (UserManager 850 LOC), 1 dead code cluster (src/legacy/), 1 API bloat (utils/ exports 45 symbols, 12 unused).",
  "verdict": "",
  "artifacts_produced": "artifacts/architecture-baseline.json;artifacts/architecture-report.md",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `cycle_found` | `data.modules` (sorted) | `{modules, depth, description}` | Circular dependency detected |
| `god_class_found` | `data.file` | `{file, loc, methods, description}` | God Class/Module identified |
| `coupling_issue` | `data.module` | `{module, fan_in, fan_out, description}` | High coupling detected |
| `dead_code_found` | `data.file+data.type` | `{file, type, description}` | Dead code or dead export |
| `layer_violation` | `data.from+data.to` | `{from, to, description}` | Layering violation detected |
| `file_modified` | `data.file` | `{file, change, lines_added}` | File change recorded |
| `pattern_found` | `data.pattern_name+data.location` | `{pattern_name, location, description}` | Code pattern identified |
| `metric_measured` | `data.metric+data.module` | `{metric, value, unit, module}` | Architecture metric measured |
| `artifact_produced` | `data.path` | `{name, path, producer, type}` | Deliverable created |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00Z","worker":"ANALYZE-001","type":"cycle_found","data":{"modules":["auth","user"],"depth":2,"description":"Circular dependency: auth imports user, user imports auth"}}
{"ts":"2026-03-08T10:01:00Z","worker":"ANALYZE-001","type":"god_class_found","data":{"file":"src/services/UserManager.ts","loc":850,"methods":15,"description":"UserManager handles auth, profile, permissions, notifications"}}
{"ts":"2026-03-08T10:05:00Z","worker":"ANALYZE-001","type":"metric_measured","data":{"metric":"coupling_score","value":0.72,"unit":"normalized","module":"src/auth/"}}
{"ts":"2026-03-08T10:20:00Z","worker":"REFACTOR-001","type":"file_modified","data":{"file":"src/auth/index.ts","change":"Extracted IAuthService interface to break cycle","lines_added":25}}
{"ts":"2026-03-08T10:25:00Z","worker":"REFACTOR-001","type":"artifact_produced","data":{"name":"refactoring-summary","path":"artifacts/refactoring-plan.md","producer":"designer","type":"markdown"}}
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
| Role valid | role in {analyzer, designer, refactorer, validator, reviewer} | "Invalid role: {role}" |
| Verdict enum | verdict in {PASS, WARN, FAIL, APPROVE, REVISE, REJECT, ""} | "Invalid verdict: {verdict}" |
| Cross-mechanism deps | Interactive to CSV deps resolve correctly | "Cross-mechanism dependency unresolvable: {id}" |
