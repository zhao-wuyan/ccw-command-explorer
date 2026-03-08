# Team Testing -- CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier (PREFIX-NNN) | `"STRATEGY-001"` |
| `title` | string | Yes | Short task title | `"Analyze changes and define test strategy"` |
| `description` | string | Yes | Detailed task description (self-contained) | `"Analyze git diff, detect framework..."` |
| `role` | enum | Yes | Worker role: `strategist`, `generator`, `executor`, `analyst` | `"generator"` |
| `layer` | string | No | Test layer: `L1`, `L2`, `L3`, or empty | `"L1"` |
| `coverage_target` | string | No | Target coverage percentage for this layer | `"80"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"STRATEGY-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"STRATEGY-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[STRATEGY-001] Detected vitest, L1 target 80%..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` -> `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Generated 5 test files covering auth module..."` |
| `pass_rate` | string | Test pass rate as decimal | `"0.95"` |
| `coverage_achieved` | string | Actual coverage percentage achieved | `"82"` |
| `test_files` | string | Semicolon-separated paths of test files | `"tests/L1-unit/auth.test.ts;tests/L1-unit/user.test.ts"` |
| `error` | string | Error message if failed | `""` |

---

### exec_mode Values

| Value | Mechanism | Description |
|-------|-----------|-------------|
| `csv-wave` | `spawn_agents_on_csv` | One-shot batch execution within wave |
| `interactive` | `spawn_agent`/`wait`/`send_input`/`close_agent` | Multi-round individual execution (executor fix cycles) |

Interactive tasks appear in master CSV for dependency tracking but are NOT included in wave-{N}.csv files.

---

### Role Prefixes

| Role | Prefix | Responsibility Type |
|------|--------|---------------------|
| strategist | STRATEGY | read-only analysis |
| generator | TESTGEN | code-gen (test files) |
| executor | TESTRUN | validation (run + fix) |
| analyst | TESTANA | read-only analysis |

---

### Example Data

```csv
id,title,description,role,layer,coverage_target,deps,context_from,exec_mode,wave,status,findings,pass_rate,coverage_achieved,test_files,error
"STRATEGY-001","Analyze changes and define test strategy","Analyze git diff for changed files. Detect test framework (vitest/jest/pytest). Determine test layers needed (L1/L2/L3). Define coverage targets per layer. Generate prioritized test strategy document at <session>/strategy/test-strategy.md","strategist","","","","","csv-wave","1","pending","","","","",""
"TESTGEN-001","Generate L1 unit tests","Generate L1 unit tests for priority files from strategy. Read source files, identify exports, generate test cases covering happy path, edge cases, error handling. Write tests to <session>/tests/L1-unit/. Follow project test conventions.","generator","L1","80","STRATEGY-001","STRATEGY-001","csv-wave","2","pending","","","","",""
"TESTRUN-001","Execute L1 tests and collect coverage","Run L1 test suite with coverage collection. Parse results for pass rate and coverage. If pass_rate < 0.95 or coverage < 80%, attempt auto-fix (max 3 iterations). Save results to <session>/results/run-L1.json","executor","L1","80","TESTGEN-001","TESTGEN-001","interactive","3","pending","","","","",""
"TESTGEN-002","Generate L2 integration tests","Generate L2 integration tests based on L1 results and strategy. Focus on module interaction points. Write tests to <session>/tests/L2-integration/.","generator","L2","60","TESTRUN-001","TESTRUN-001","csv-wave","4","pending","","","","",""
"TESTRUN-002","Execute L2 tests and collect coverage","Run L2 integration test suite with coverage. Auto-fix up to 3 iterations. Save results to <session>/results/run-L2.json","executor","L2","60","TESTGEN-002","TESTGEN-002","interactive","5","pending","","","","",""
"TESTANA-001","Quality analysis report","Analyze defect patterns, coverage gaps, GC loop effectiveness. Generate quality report with score and recommendations. Write to <session>/analysis/quality-report.md","analyst","","","TESTRUN-002","TESTRUN-001;TESTRUN-002","csv-wave","6","pending","","","","",""
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
layer       ---------->  layer       ---------->  (reads)
coverage_target ------->  coverage_target ------->  (reads)
deps        ---------->  deps        ---------->  (reads)
context_from---------->  context_from---------->  (reads)
exec_mode   ---------->  exec_mode   ---------->  (reads)
                         wave         ---------->  (reads)
                         prev_context ---------->  (reads)
                                                   status
                                                   findings
                                                   pass_rate
                                                   coverage_achieved
                                                   test_files
                                                   error
```

---

## Output Schema (JSON)

Agent output via `report_agent_job_result` (csv-wave tasks):

```json
{
  "id": "TESTGEN-001",
  "status": "completed",
  "findings": "Generated 5 L1 unit test files covering auth, user, and session modules. Total 24 test cases: 15 happy path, 6 edge cases, 3 error handling.",
  "pass_rate": "",
  "coverage_achieved": "",
  "test_files": "tests/L1-unit/auth.test.ts;tests/L1-unit/user.test.ts;tests/L1-unit/session.test.ts",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `framework_detected` | `data.framework` | `{framework, config_file, test_pattern}` | Test framework identified |
| `test_generated` | `data.file` | `{file, source_file, test_count}` | Test file created |
| `defect_found` | `data.file+data.line` | `{file, line, pattern, description}` | Defect pattern discovered |
| `coverage_gap` | `data.file` | `{file, current, target, gap}` | Coverage gap identified |
| `convention_found` | `data.pattern` | `{pattern, example_file, description}` | Test convention detected |
| `fix_applied` | `data.test_file+data.fix_type` | `{test_file, fix_type, description}` | Test fix during GC loop |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00Z","worker":"STRATEGY-001","type":"framework_detected","data":{"framework":"vitest","config_file":"vitest.config.ts","test_pattern":"**/*.test.ts"}}
{"ts":"2026-03-08T10:05:00Z","worker":"TESTGEN-001","type":"test_generated","data":{"file":"tests/L1-unit/auth.test.ts","source_file":"src/auth.ts","test_count":8}}
{"ts":"2026-03-08T10:10:00Z","worker":"TESTRUN-001","type":"defect_found","data":{"file":"src/auth.ts","line":42,"pattern":"null_reference","description":"Missing null check on token payload"}}
{"ts":"2026-03-08T10:12:00Z","worker":"TESTRUN-001","type":"fix_applied","data":{"test_file":"tests/L1-unit/auth.test.ts","fix_type":"assertion_fix","description":"Fixed expected return type assertion"}}
```

> Both csv-wave and interactive agents read/write the same discoveries.ndjson file.

---

## Cross-Mechanism Context Flow

| Source | Target | Mechanism |
|--------|--------|-----------|
| CSV task findings | Interactive task | Injected via spawn message |
| Interactive task result | CSV task prev_context | Read from interactive/{id}-result.json |
| Any agent discovery | Any agent | Shared via discoveries.ndjson |
| Executor coverage data | GC loop handler | Read from results/run-{layer}.json |

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
| Role valid | role in {strategist, generator, executor, analyst} | "Invalid role: {role}" |
| Layer valid | layer in {L1, L2, L3, ""} | "Invalid layer: {layer}" |
| Coverage target valid | If layer present, coverage_target is numeric | "Invalid coverage target: {value}" |
