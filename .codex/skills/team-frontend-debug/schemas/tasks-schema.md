# Team Frontend Debug -- CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier (PREFIX-NNN) | `"TEST-001"` |
| `title` | string | Yes | Short task title | `"Feature testing"` |
| `description` | string | Yes | Detailed task description (self-contained) with PURPOSE/TASK/CONTEXT/EXPECTED/CONSTRAINTS | `"PURPOSE: Test all features from list..."` |
| `role` | enum | Yes | Worker role: `tester`, `reproducer`, `analyzer`, `fixer`, `verifier` | `"tester"` |
| `pipeline_mode` | enum | Yes | Pipeline mode: `test-pipeline` or `debug-pipeline` | `"test-pipeline"` |
| `base_url` | string | No | Target URL for browser-based tasks | `"http://localhost:3000"` |
| `evidence_dimensions` | string | No | Semicolon-separated evidence types to collect | `"screenshot;console;network"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"TEST-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"TEST-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[TEST-001] Found 3 issues: 2 high, 1 medium..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` -> `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Tested 5 features: 3 pass, 2 fail. BUG-001: TypeError on login. BUG-002: API 500 on save."` |
| `artifacts_produced` | string | Semicolon-separated paths of produced artifacts | `"artifacts/TEST-001-report.md;artifacts/TEST-001-issues.json"` |
| `issues_count` | string | Number of issues found (tester/analyzer only, empty for others) | `"2"` |
| `verdict` | string | Verification verdict: `pass`, `pass_with_warnings`, `fail` (verifier only) | `"pass"` |
| `error` | string | Error message if failed | `""` |

---

### exec_mode Values

| Value | Mechanism | Description |
|-------|-----------|-------------|
| `csv-wave` | `spawn_agents_on_csv` | One-shot batch execution within wave |
| `interactive` | `spawn_agent`/`wait`/`send_input`/`close_agent` | Multi-round individual execution |

Interactive tasks appear in master CSV for dependency tracking but are NOT included in wave-{N}.csv files.

---

### Role Prefixes

| Role | Prefix | Pipeline | Inner Loop |
|------|--------|----------|------------|
| tester | TEST | test-pipeline | Yes (iterates over features) |
| reproducer | REPRODUCE | debug-pipeline | No |
| analyzer | ANALYZE | both | No |
| fixer | FIX | both | Yes (may need multiple fix passes) |
| verifier | VERIFY | both | No |

---

### Example Data (Test Pipeline)

```csv
id,title,description,role,pipeline_mode,base_url,evidence_dimensions,deps,context_from,exec_mode,wave,status,findings,artifacts_produced,issues_count,verdict,error
"TEST-001","Feature testing","PURPOSE: Test all features from feature list and discover issues | Success: All features tested with pass/fail results\nTASK:\n- Parse feature list\n- Navigate to each feature URL using Chrome DevTools\n- Execute test scenarios (click, fill, hover)\n- Capture evidence: screenshots, console logs, network requests\n- Classify results: pass/fail/warning\nCONTEXT:\n- Session: .workflow/.csv-wave/tfd-login-test-20260308\n- Base URL: http://localhost:3000\n- Features: Login, Dashboard, Profile\nEXPECTED: artifacts/TEST-001-report.md + artifacts/TEST-001-issues.json\nCONSTRAINTS: Chrome DevTools MCP only | No code modifications","tester","test-pipeline","http://localhost:3000","screenshot;console;network","","","csv-wave","1","pending","","","","",""
"ANALYZE-001","Root cause analysis","PURPOSE: Analyze discovered issues to identify root causes | Success: RCA for each high/medium issue\nTASK:\n- Load test report and issues list\n- Analyze console errors, network failures, DOM anomalies\n- Map to source code locations\nCONTEXT:\n- Session: .workflow/.csv-wave/tfd-login-test-20260308\n- Upstream: artifacts/TEST-001-issues.json\nEXPECTED: artifacts/ANALYZE-001-rca.md","analyzer","test-pipeline","","console;network","TEST-001","TEST-001","csv-wave","2","pending","","","","",""
"FIX-001","Fix all issues","PURPOSE: Fix identified issues | Success: All high/medium issues resolved\nTASK:\n- Load RCA report\n- Locate and fix each root cause\n- Run syntax/type checks\nCONTEXT:\n- Session: .workflow/.csv-wave/tfd-login-test-20260308\n- Upstream: artifacts/ANALYZE-001-rca.md\nEXPECTED: Modified source files + artifacts/FIX-001-changes.md","fixer","test-pipeline","","","ANALYZE-001","ANALYZE-001","csv-wave","3","pending","","","","",""
"VERIFY-001","Verify fixes","PURPOSE: Re-test failed scenarios to verify fixes | Success: Previously failed scenarios now pass\nTASK:\n- Re-execute failed test scenarios\n- Capture evidence and compare\n- Report pass/fail per scenario\nCONTEXT:\n- Session: .workflow/.csv-wave/tfd-login-test-20260308\n- Original: artifacts/TEST-001-report.md\n- Fix: artifacts/FIX-001-changes.md\nEXPECTED: artifacts/VERIFY-001-report.md","verifier","test-pipeline","http://localhost:3000","screenshot;console;network","FIX-001","FIX-001;TEST-001","csv-wave","4","pending","","","","",""
```

### Example Data (Debug Pipeline)

```csv
id,title,description,role,pipeline_mode,base_url,evidence_dimensions,deps,context_from,exec_mode,wave,status,findings,artifacts_produced,issues_count,verdict,error
"REPRODUCE-001","Bug reproduction","PURPOSE: Reproduce bug and collect evidence | Success: Bug reproduced with artifacts\nTASK:\n- Navigate to target URL\n- Execute reproduction steps\n- Capture screenshots, snapshots, console logs, network\nCONTEXT:\n- Session: .workflow/.csv-wave/tfd-save-crash-20260308\n- Bug URL: http://localhost:3000/settings\n- Steps: 1. Click save 2. Observe white screen\nEXPECTED: evidence/ directory with all captures","reproducer","debug-pipeline","http://localhost:3000/settings","screenshot;console;network;snapshot","","","csv-wave","1","pending","","","","",""
"ANALYZE-001","Root cause analysis","PURPOSE: Analyze evidence to find root cause | Success: RCA with file:line location\nTASK:\n- Load evidence from reproducer\n- Analyze console errors and stack traces\n- Map to source code\nCONTEXT:\n- Session: .workflow/.csv-wave/tfd-save-crash-20260308\n- Upstream: evidence/\nEXPECTED: artifacts/ANALYZE-001-rca.md","analyzer","debug-pipeline","","","REPRODUCE-001","REPRODUCE-001","csv-wave","2","pending","","","","",""
"FIX-001","Code fix","PURPOSE: Fix the identified bug | Success: Root cause resolved\nTASK:\n- Load RCA report\n- Implement fix\n- Validate syntax\nCONTEXT:\n- Session: .workflow/.csv-wave/tfd-save-crash-20260308\n- Upstream: artifacts/ANALYZE-001-rca.md\nEXPECTED: Modified files + artifacts/FIX-001-changes.md","fixer","debug-pipeline","","","ANALYZE-001","ANALYZE-001","csv-wave","3","pending","","","","",""
"VERIFY-001","Fix verification","PURPOSE: Verify bug is fixed | Success: Original bug no longer reproduces\nTASK:\n- Same reproduction steps as REPRODUCE-001\n- Capture evidence and compare\n- Confirm resolution\nCONTEXT:\n- Session: .workflow/.csv-wave/tfd-save-crash-20260308\n- Original: evidence/\n- Fix: artifacts/FIX-001-changes.md\nEXPECTED: artifacts/VERIFY-001-report.md","verifier","debug-pipeline","http://localhost:3000/settings","screenshot;console;network;snapshot","FIX-001","FIX-001;REPRODUCE-001","csv-wave","4","pending","","","","",""
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
pipeline_mode --------->  pipeline_mode --------->  (reads)
base_url    ---------->  base_url    ---------->  (reads)
evidence_dimensions --->  evidence_dimensions --->  (reads)
deps        ---------->  deps        ---------->  (reads)
context_from---------->  context_from---------->  (reads)
exec_mode   ---------->  exec_mode   ---------->  (reads)
                         wave         ---------->  (reads)
                         prev_context ---------->  (reads)
                                                   status
                                                   findings
                                                   artifacts_produced
                                                   issues_count
                                                   verdict
                                                   error
```

---

## Output Schema (JSON)

Agent output via `report_agent_job_result` (csv-wave tasks):

Tester output:
```json
{
  "id": "TEST-001",
  "status": "completed",
  "findings": "Tested 5 features: 3 pass, 2 fail. BUG-001: TypeError on login submit. BUG-002: API 500 on profile save.",
  "artifacts_produced": "artifacts/TEST-001-report.md;artifacts/TEST-001-issues.json",
  "issues_count": "2",
  "verdict": "",
  "error": ""
}
```

Verifier output:
```json
{
  "id": "VERIFY-001",
  "status": "completed",
  "findings": "Original bug resolved. Login error no longer appears. No new console errors. No new network failures.",
  "artifacts_produced": "artifacts/VERIFY-001-report.md",
  "issues_count": "",
  "verdict": "pass",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `feature_tested` | `data.feature` | `{feature, name, result, issues}` | Feature test result |
| `bug_reproduced` | `data.url` | `{url, steps, console_errors, network_failures}` | Bug reproduction result |
| `evidence_collected` | `data.dimension+data.file` | `{dimension, file, description}` | Evidence artifact saved |
| `root_cause_found` | `data.file+data.line` | `{category, file, line, confidence}` | Root cause identified |
| `file_modified` | `data.file` | `{file, change, lines_added}` | Code fix applied |
| `verification_result` | `data.verdict` | `{verdict, original_error_resolved, new_errors}` | Fix verification |
| `issue_found` | `data.file+data.line` | `{file, line, severity, description}` | Issue discovered |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00Z","worker":"TEST-001","type":"feature_tested","data":{"feature":"F-001","name":"Login","result":"fail","issues":1}}
{"ts":"2026-03-08T10:05:00Z","worker":"REPRODUCE-001","type":"bug_reproduced","data":{"url":"/settings","steps":3,"console_errors":2,"network_failures":0}}
{"ts":"2026-03-08T10:10:00Z","worker":"ANALYZE-001","type":"root_cause_found","data":{"category":"TypeError","file":"src/components/Settings.tsx","line":142,"confidence":"high"}}
{"ts":"2026-03-08T10:15:00Z","worker":"FIX-001","type":"file_modified","data":{"file":"src/components/Settings.tsx","change":"Added null check for user object","lines_added":3}}
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
| Role valid | role in {tester, reproducer, analyzer, fixer, verifier} | "Invalid role: {role}" |
| Pipeline mode valid | pipeline_mode in {test-pipeline, debug-pipeline} | "Invalid pipeline_mode: {mode}" |
| Verdict valid | verdict in {pass, pass_with_warnings, fail, ""} | "Invalid verdict: {verdict}" |
| Base URL for browser tasks | tester/reproducer/verifier have non-empty base_url | "Missing base_url for browser task: {id}" |
