# Team Quality Assurance -- CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier (PREFIX-NNN) | `"SCOUT-001"` |
| `title` | string | Yes | Short task title | `"Multi-perspective code scan"` |
| `description` | string | Yes | Detailed task description (self-contained) | `"Scan codebase from multiple perspectives..."` |
| `role` | enum | Yes | Worker role: `scout`, `strategist`, `generator`, `executor`, `analyst` | `"scout"` |
| `perspective` | string | No | Scan perspectives (semicolon-separated, scout only) | `"bug;security;test-coverage;code-quality"` |
| `layer` | string | No | Test layer: `L1`, `L2`, `L3`, or empty | `"L1"` |
| `coverage_target` | string | No | Target coverage percentage for this layer | `"80"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"SCOUT-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"SCOUT-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[SCOUT-001] Found 5 security issues..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` -> `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Found 3 critical security issues..."` |
| `issues_found` | string | Count of issues discovered (scout/analyst) | `"5"` |
| `pass_rate` | string | Test pass rate as decimal (executor only) | `"0.95"` |
| `coverage_achieved` | string | Actual coverage percentage (executor only) | `"82"` |
| `test_files` | string | Semicolon-separated test file paths (generator only) | `"tests/L1-unit/auth.test.ts"` |
| `quality_score` | string | Quality score 0-100 (analyst only) | `"78"` |
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
| scout | SCOUT | read-only analysis (multi-perspective scan) |
| strategist | QASTRAT | read-only analysis (strategy formulation) |
| generator | QAGEN | code-gen (test file generation) |
| executor | QARUN | validation (test execution + fix cycles) |
| analyst | QAANA | read-only analysis (quality reporting) |

---

### Example Data

```csv
id,title,description,role,perspective,layer,coverage_target,deps,context_from,exec_mode,wave,status,findings,issues_found,pass_rate,coverage_achieved,test_files,quality_score,error
"SCOUT-001","Multi-perspective code scan","Scan codebase from bug, security, test-coverage, code-quality perspectives. Identify issues with severity ranking (critical/high/medium/low) and file:line references. Write scan results to <session>/scan/scan-results.json","scout","bug;security;test-coverage;code-quality","","","","","csv-wave","1","pending","","","","","","",""
"QASTRAT-001","Test strategy formulation","Analyze scout findings and code changes. Determine test layers (L1/L2/L3), define coverage targets, detect test framework, identify priority files. Write strategy to <session>/strategy/test-strategy.md","strategist","","","","SCOUT-001","SCOUT-001","csv-wave","2","pending","","","","","","",""
"QAGEN-L1-001","Generate L1 unit tests","Generate L1 unit tests based on strategy. Read source files, identify exports, generate test cases for happy path, edge cases, error handling. Follow project test conventions. Write tests to <session>/tests/L1-unit/","generator","","L1","80","QASTRAT-001","QASTRAT-001","csv-wave","3","pending","","","","","","",""
"QAGEN-L2-001","Generate L2 integration tests","Generate L2 integration tests based on strategy. Focus on module interaction points and integration boundaries. Write tests to <session>/tests/L2-integration/","generator","","L2","60","QASTRAT-001","QASTRAT-001","csv-wave","3","pending","","","","","","",""
"QARUN-L1-001","Execute L1 tests and collect coverage","Run L1 test suite with coverage collection. Parse results for pass rate and coverage. If pass_rate < 0.95 or coverage < 80%, attempt auto-fix (max 3 iterations). Save results to <session>/results/run-L1.json","executor","","L1","80","QAGEN-L1-001","QAGEN-L1-001","interactive","4","pending","","","","","","",""
"QARUN-L2-001","Execute L2 tests and collect coverage","Run L2 integration test suite with coverage. Auto-fix up to 3 iterations. Save results to <session>/results/run-L2.json","executor","","L2","60","QAGEN-L2-001","QAGEN-L2-001","interactive","4","pending","","","","","","",""
"QAANA-001","Quality analysis report","Analyze defect patterns, coverage gaps, test effectiveness. Calculate quality score (0-100). Generate comprehensive report with recommendations. Write to <session>/analysis/quality-report.md","analyst","","","","QARUN-L1-001;QARUN-L2-001","QARUN-L1-001;QARUN-L2-001","csv-wave","5","pending","","","","","","",""
"SCOUT-002","Regression scan","Post-fix regression scan. Verify no new issues introduced by test fixes. Focus on areas modified during GC loops.","scout","bug;security;code-quality","","","QAANA-001","QAANA-001","csv-wave","6","pending","","","","","","",""
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
perspective ---------->  perspective ---------->  (reads)
layer       ---------->  layer       ---------->  (reads)
coverage_target ------->  coverage_target ------->  (reads)
deps        ---------->  deps        ---------->  (reads)
context_from---------->  context_from---------->  (reads)
exec_mode   ---------->  exec_mode   ---------->  (reads)
                         wave         ---------->  (reads)
                         prev_context ---------->  (reads)
                                                   status
                                                   findings
                                                   issues_found
                                                   pass_rate
                                                   coverage_achieved
                                                   test_files
                                                   quality_score
                                                   error
```

---

## Output Schema (JSON)

Agent output via `report_agent_job_result` (csv-wave tasks):

```json
{
  "id": "SCOUT-001",
  "status": "completed",
  "findings": "Multi-perspective scan found 5 issues: 2 security (hardcoded keys, missing auth), 1 bug (null reference), 2 code-quality (duplicated logic, high complexity). All issues logged to discoveries.ndjson.",
  "issues_found": "5",
  "pass_rate": "",
  "coverage_achieved": "",
  "test_files": "",
  "quality_score": "",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `issue_found` | `data.file+data.line` | `{file, line, severity, perspective, description}` | Issue discovered by scout |
| `framework_detected` | `data.framework` | `{framework, config_file, test_pattern}` | Test framework identified |
| `test_generated` | `data.file` | `{file, source_file, test_count}` | Test file created |
| `defect_found` | `data.file+data.line` | `{file, line, pattern, description}` | Defect found during testing |
| `coverage_gap` | `data.file` | `{file, current, target, gap}` | Coverage gap identified |
| `convention_found` | `data.pattern` | `{pattern, example_file, description}` | Test convention detected |
| `fix_applied` | `data.test_file+data.fix_type` | `{test_file, fix_type, description}` | Test fix during GC loop |
| `quality_metric` | `data.dimension` | `{dimension, score, details}` | Quality dimension score |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00Z","worker":"SCOUT-001","type":"issue_found","data":{"file":"src/auth.ts","line":42,"severity":"high","perspective":"security","description":"Hardcoded secret key in auth module"}}
{"ts":"2026-03-08T10:02:00Z","worker":"SCOUT-001","type":"issue_found","data":{"file":"src/user.ts","line":15,"severity":"medium","perspective":"bug","description":"Missing null check on user object"}}
{"ts":"2026-03-08T10:05:00Z","worker":"QASTRAT-001","type":"framework_detected","data":{"framework":"vitest","config_file":"vitest.config.ts","test_pattern":"**/*.test.ts"}}
{"ts":"2026-03-08T10:10:00Z","worker":"QAGEN-L1-001","type":"test_generated","data":{"file":"tests/L1-unit/auth.test.ts","source_file":"src/auth.ts","test_count":8}}
{"ts":"2026-03-08T10:15:00Z","worker":"QARUN-L1-001","type":"defect_found","data":{"file":"src/auth.ts","line":42,"pattern":"null_reference","description":"Missing null check on token payload"}}
{"ts":"2026-03-08T10:20:00Z","worker":"QAANA-001","type":"quality_metric","data":{"dimension":"coverage_achievement","score":85,"details":"L1: 82%, L2: 68%"}}
```

> Both csv-wave and interactive agents read/write the same discoveries.ndjson file.

---

## Cross-Mechanism Context Flow

| Source | Target | Mechanism |
|--------|--------|-----------|
| Scout findings | Strategist prev_context | CSV context_from column |
| CSV task findings | Interactive task | Injected via spawn message |
| Interactive task result | CSV task prev_context | Read from interactive/{id}-result.json |
| Any agent discovery | Any agent | Shared via discoveries.ndjson |
| Executor coverage data | GC loop handler | Read from results/run-{layer}.json |
| Analyst quality score | Regression scout | Injected via prev_context |

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
| Role valid | role in {scout, strategist, generator, executor, analyst} | "Invalid role: {role}" |
| Layer valid | layer in {L1, L2, L3, ""} | "Invalid layer: {layer}" |
| Perspective valid | If scout, perspective contains valid values | "Invalid perspective: {value}" |
| Coverage target valid | If layer present, coverage_target is numeric | "Invalid coverage target: {value}" |
