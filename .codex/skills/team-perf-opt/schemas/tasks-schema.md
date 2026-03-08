# Team Performance Optimization -- CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier (PREFIX-NNN) | `"PROFILE-001"` |
| `title` | string | Yes | Short task title | `"Profile performance"` |
| `description` | string | Yes | Detailed task description (self-contained) with goal, inputs, outputs, success criteria | `"Profile application performance..."` |
| `role` | enum | Yes | Worker role: `profiler`, `strategist`, `optimizer`, `benchmarker`, `reviewer` | `"profiler"` |
| `bottleneck_type` | string | No | Performance bottleneck category: CPU, MEMORY, IO, NETWORK, RENDERING, DATABASE | `"CPU"` |
| `priority` | enum | No | P0 (Critical), P1 (High), P2 (Medium), P3 (Low) | `"P0"` |
| `target_files` | string | No | Semicolon-separated file paths to focus on | `"src/services/DataProcessor.ts"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"PROFILE-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"PROFILE-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[PROFILE-001] Found 3 CPU hotspots..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` -> `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Found 3 CPU hotspots, 1 memory leak..."` |
| `verdict` | string | Benchmark/review verdict: PASS, WARN, FAIL, APPROVE, REVISE, REJECT | `"PASS"` |
| `artifacts_produced` | string | Semicolon-separated paths of produced artifacts | `"artifacts/bottleneck-report.md"` |
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
| profiler | PROFILE | 1 | Performance profiling, baseline metrics, bottleneck identification |
| strategist | STRATEGY | 2 | Optimization plan design, strategy selection, prioritization |
| optimizer | IMPL / FIX | 3 | Code implementation, optimization application, targeted fixes |
| benchmarker | BENCH | 4 | Benchmark execution, before/after comparison, regression detection |
| reviewer | REVIEW | 4 | Code review for correctness, side effects, regression risks |

---

### Example Data

```csv
id,title,description,role,bottleneck_type,priority,target_files,deps,context_from,exec_mode,wave,status,findings,verdict,artifacts_produced,error
"PROFILE-001","Profile performance","PURPOSE: Profile application performance to identify bottlenecks\nTASK:\n- Detect project type (frontend/backend/CLI)\n- Trace hot code paths and CPU hotspots\n- Identify memory allocation patterns and leaks\n- Measure I/O and network latency\n- Collect quantified baseline metrics\nINPUT: Codebase under target scope\nOUTPUT: artifacts/baseline-metrics.json + artifacts/bottleneck-report.md\nSUCCESS: Ranked bottleneck list with severity, baseline metrics collected\nSESSION: .workflow/.csv-wave/perf-example-20260308","profiler","","","","","","csv-wave","1","pending","","","",""
"STRATEGY-001","Design optimization plan","PURPOSE: Design prioritized optimization plan from bottleneck report\nTASK:\n- For each bottleneck, select optimization strategy\n- Prioritize by impact/effort ratio (P0-P3)\n- Define measurable success criteria per optimization\n- Assign unique OPT-IDs with non-overlapping file targets\nINPUT: artifacts/bottleneck-report.md + artifacts/baseline-metrics.json\nOUTPUT: artifacts/optimization-plan.md\nSUCCESS: Prioritized plan with self-contained OPT blocks\nSESSION: .workflow/.csv-wave/perf-example-20260308","strategist","","","","PROFILE-001","PROFILE-001","csv-wave","2","pending","","","",""
"IMPL-001","Implement optimizations","PURPOSE: Implement performance optimizations per plan\nTASK:\n- Apply optimizations in priority order (P0 first)\n- Preserve existing behavior\n- Make minimal, focused changes\nINPUT: artifacts/optimization-plan.md\nOUTPUT: Modified source files\nSUCCESS: All planned optimizations applied, no functionality regressions\nSESSION: .workflow/.csv-wave/perf-example-20260308","optimizer","","","","STRATEGY-001","STRATEGY-001","csv-wave","3","pending","","","",""
"BENCH-001","Benchmark improvements","PURPOSE: Benchmark before/after optimization metrics\nTASK:\n- Run benchmarks matching detected project type\n- Compare post-optimization metrics vs baseline\n- Calculate improvement percentages\n- Detect any regressions\nINPUT: artifacts/baseline-metrics.json + artifacts/optimization-plan.md\nOUTPUT: artifacts/benchmark-results.json\nSUCCESS: All target improvements met, no regressions\nSESSION: .workflow/.csv-wave/perf-example-20260308","benchmarker","","","","IMPL-001","IMPL-001","csv-wave","4","pending","","","",""
"REVIEW-001","Review optimization code","PURPOSE: Review optimization changes for correctness and quality\nTASK:\n- Correctness: logic errors, race conditions, null safety\n- Side effects: unintended behavior changes, API breaks\n- Maintainability: code clarity, complexity, naming\n- Regression risk: impact on unrelated code paths\n- Best practices: idiomatic patterns, no anti-patterns\nINPUT: artifacts/optimization-plan.md + changed files\nOUTPUT: artifacts/review-report.md\nSUCCESS: APPROVE verdict (no Critical/High findings)\nSESSION: .workflow/.csv-wave/perf-example-20260308","reviewer","","","","IMPL-001","IMPL-001","csv-wave","4","pending","","","",""
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
bottleneck_type-------->  bottleneck_type-------->  (reads)
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
  "id": "PROFILE-001",
  "status": "completed",
  "findings": "Found 3 CPU hotspots: O(n^2) in DataProcessor.processRecords (Critical), unoptimized regex in Validator.check (High), synchronous file reads in ConfigLoader (Medium). Memory baseline: 145MB peak, 2 potential leak sites.",
  "verdict": "",
  "artifacts_produced": "artifacts/baseline-metrics.json;artifacts/bottleneck-report.md",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `bottleneck_found` | `data.location` | `{type, location, severity, description}` | Performance bottleneck identified |
| `hotspot_found` | `data.file+data.function` | `{file, function, cpu_pct, description}` | CPU hotspot detected |
| `memory_issue` | `data.file+data.type` | `{file, type, size_mb, description}` | Memory leak or bloat |
| `io_issue` | `data.operation` | `{operation, latency_ms, description}` | I/O performance issue |
| `db_issue` | `data.query` | `{query, latency_ms, description}` | Database performance issue |
| `file_modified` | `data.file` | `{file, change, lines_added}` | File change recorded |
| `metric_measured` | `data.metric+data.context` | `{metric, value, unit, context}` | Performance metric measured |
| `pattern_found` | `data.pattern_name+data.location` | `{pattern_name, location, description}` | Code pattern identified |
| `artifact_produced` | `data.path` | `{name, path, producer, type}` | Deliverable created |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00Z","worker":"PROFILE-001","type":"bottleneck_found","data":{"type":"CPU","location":"src/services/DataProcessor.ts:145","severity":"Critical","description":"O(n^2) nested loop in processRecords, 850ms for 10k records"}}
{"ts":"2026-03-08T10:01:00Z","worker":"PROFILE-001","type":"hotspot_found","data":{"file":"src/services/DataProcessor.ts","function":"processRecords","cpu_pct":42,"description":"Accounts for 42% of CPU time in profiling run"}}
{"ts":"2026-03-08T10:02:00Z","worker":"PROFILE-001","type":"metric_measured","data":{"metric":"response_time_p95","value":1250,"unit":"ms","context":"GET /api/dashboard"}}
{"ts":"2026-03-08T10:15:00Z","worker":"IMPL-001","type":"file_modified","data":{"file":"src/services/DataProcessor.ts","change":"Replaced O(n^2) with Map lookup O(n)","lines_added":12}}
{"ts":"2026-03-08T10:25:00Z","worker":"BENCH-001","type":"metric_measured","data":{"metric":"response_time_p95","value":380,"unit":"ms","context":"GET /api/dashboard (after optimization)"}}
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
| Role valid | role in {profiler, strategist, optimizer, benchmarker, reviewer} | "Invalid role: {role}" |
| Verdict enum | verdict in {PASS, WARN, FAIL, APPROVE, REVISE, REJECT, ""} | "Invalid verdict: {verdict}" |
| Cross-mechanism deps | Interactive to CSV deps resolve correctly | "Cross-mechanism dependency unresolvable: {id}" |
