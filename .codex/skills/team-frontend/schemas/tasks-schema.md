# Team Frontend -- CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier (PREFIX-NNN) | `"ANALYZE-001"` |
| `title` | string | Yes | Short task title | `"Requirement analysis + design intelligence"` |
| `description` | string | Yes | Detailed task description (self-contained) with PURPOSE/TASK/CONTEXT/EXPECTED/CONSTRAINTS | `"PURPOSE: Analyze frontend requirements..."` |
| `role` | enum | Yes | Worker role: `analyst`, `architect`, `developer`, `qa` | `"analyst"` |
| `pipeline_mode` | enum | Yes | Pipeline mode: `page`, `feature`, `system` | `"feature"` |
| `scope` | enum | Yes | Task scope: `full`, `tokens`, `components` | `"full"` |
| `review_type` | string | No | QA review type: `architecture-review`, `code-review`, `final` (empty for non-QA tasks) | `"code-review"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"ANALYZE-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"ANALYZE-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[ANALYZE-001] Detected React + shadcn stack..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` -> `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Generated 24 color tokens with dark mode..."` |
| `artifacts_produced` | string | Semicolon-separated paths of produced artifacts | `"artifacts/analysis/design-intelligence.json;artifacts/analysis/requirements.md"` |
| `qa_score` | string | QA weighted score 0-10 (empty for non-QA tasks) | `"8.5"` |
| `qa_verdict` | enum | `PASSED`, `PASSED_WITH_WARNINGS`, `FIX_REQUIRED` (empty for non-QA) | `"PASSED"` |
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

| Role | Prefix | Responsibility Type |
|------|--------|---------------------|
| analyst | ANALYZE | read-only (analysis + design intelligence retrieval) |
| architect | ARCH | orchestration (design token + component spec generation) |
| developer | DEV | code-gen (implementation from specs) |
| qa | QA | validation (5-dimension quality audit) |

---

### Example Data

```csv
id,title,description,role,pipeline_mode,scope,review_type,deps,context_from,exec_mode,wave,status,findings,artifacts_produced,qa_score,qa_verdict,error
"ANALYZE-001","Requirement analysis","PURPOSE: Analyze frontend requirements and retrieve design intelligence via ui-ux-pro-max | Success: design-intelligence.json produced with industry-specific recommendations\nTASK:\n- Detect tech stack and existing design system\n- Retrieve design intelligence\n- Compile design-intelligence.json and requirements.md\nCONTEXT:\n- Session: .workflow/.csv-wave/fe-saas-dashboard-20260308\n- Industry: saas\nEXPECTED: artifacts/analysis/design-intelligence.json + requirements.md","analyst","feature","full","","","","csv-wave","1","pending","","","","",""
"ARCH-001","Design token system + architecture","PURPOSE: Define design token system and component architecture | Success: design-tokens.json + component specs\nTASK:\n- Load design intelligence from analyst\n- Generate design tokens (colors, typography, spacing, shadows)\n- Define component specs\n- Generate project structure\nCONTEXT:\n- Session: .workflow/.csv-wave/fe-saas-dashboard-20260308\n- Upstream: design-intelligence.json\nEXPECTED: artifacts/architecture/design-tokens.json + component-specs/ + project-structure.md","architect","feature","full","","ANALYZE-001","ANALYZE-001","csv-wave","2","pending","","","","",""
"QA-001","Architecture review","PURPOSE: Review architecture before development | Success: Architecture approved with score >= 8\nTASK:\n- Load design intelligence and tokens\n- Execute 5-dimension audit on architecture\n- Calculate score and verdict\nCONTEXT:\n- Session: .workflow/.csv-wave/fe-saas-dashboard-20260308\n- Review type: architecture-review\nEXPECTED: artifacts/qa/audit-001.md","qa","feature","full","architecture-review","ARCH-001","ARCH-001","csv-wave","3","pending","","","","",""
"DEV-001","Frontend implementation","PURPOSE: Implement frontend from architecture artifacts | Success: All planned files implemented\nTASK:\n- Generate CSS custom properties from design tokens\n- Implement components following specs\n- Self-validate: no hardcoded colors, cursor-pointer, focus styles\nCONTEXT:\n- Session: .workflow/.csv-wave/fe-saas-dashboard-20260308\n- Upstream: design-tokens.json, component-specs/\nEXPECTED: src/styles/tokens.css + component files","developer","feature","full","","QA-001","QA-001;ARCH-001","csv-wave","4","pending","","","","",""
"QA-002","Code review","PURPOSE: Execute 5-dimension quality audit | Success: Score >= 8 with 0 critical issues\nTASK:\n- Execute full audit (code quality, accessibility, design compliance, UX, pre-delivery)\n- Calculate weighted score\nCONTEXT:\n- Session: .workflow/.csv-wave/fe-saas-dashboard-20260308\n- Review type: code-review\nEXPECTED: artifacts/qa/audit-002.md","qa","feature","full","code-review","DEV-001","DEV-001","csv-wave","5","pending","","","","",""
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
scope       ---------->  scope       ---------->  (reads)
review_type ---------->  review_type ---------->  (reads)
deps        ---------->  deps        ---------->  (reads)
context_from---------->  context_from---------->  (reads)
exec_mode   ---------->  exec_mode   ---------->  (reads)
                         wave         ---------->  (reads)
                         prev_context ---------->  (reads)
                                                   status
                                                   findings
                                                   artifacts_produced
                                                   qa_score
                                                   qa_verdict
                                                   error
```

---

## Output Schema (JSON)

Agent output via `report_agent_job_result` (csv-wave tasks):

```json
{
  "id": "ARCH-001",
  "status": "completed",
  "findings": "Generated design token system with 24 color tokens (light+dark), 7 typography scales, 6 spacing values. Created 3 component specs: Button, Card, Header. Project structure follows Next.js app router convention.",
  "artifacts_produced": "artifacts/architecture/design-tokens.json;artifacts/architecture/component-specs/button.md;artifacts/architecture/project-structure.md",
  "qa_score": "",
  "qa_verdict": "",
  "error": ""
}
```

QA agent output example:

```json
{
  "id": "QA-001",
  "status": "completed",
  "findings": "Architecture review: 8.2/10. Color tokens complete, typography scale follows best practices. Minor: missing border-radius for 'pill' variant.",
  "artifacts_produced": "artifacts/qa/audit-001.md",
  "qa_score": "8.2",
  "qa_verdict": "PASSED",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `tech_stack_detected` | `data.stack` | `{stack, framework, ui_lib}` | Tech stack identified |
| `design_pattern_found` | `data.pattern_name+data.location` | `{pattern_name, location, description}` | Existing design pattern |
| `token_generated` | `data.category` | `{category, count, supports_dark_mode}` | Design token category created |
| `file_modified` | `data.file` | `{file, change, lines_added}` | File change recorded |
| `issue_found` | `data.file+data.line` | `{file, line, severity, description}` | QA issue discovered |
| `anti_pattern_violation` | `data.pattern+data.file` | `{pattern, file, line, description}` | Industry anti-pattern detected |
| `artifact_produced` | `data.path` | `{name, path, producer, type}` | Deliverable created |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00Z","worker":"ANALYZE-001","type":"tech_stack_detected","data":{"stack":"react","framework":"nextjs","ui_lib":"shadcn"}}
{"ts":"2026-03-08T10:05:00Z","worker":"ARCH-001","type":"token_generated","data":{"category":"color","count":24,"supports_dark_mode":true}}
{"ts":"2026-03-08T10:10:00Z","worker":"DEV-001","type":"file_modified","data":{"file":"src/styles/tokens.css","change":"Generated CSS custom properties from design tokens","lines_added":85}}
{"ts":"2026-03-08T10:15:00Z","worker":"QA-001","type":"issue_found","data":{"file":"src/components/Button.tsx","line":42,"severity":"high","description":"Missing cursor-pointer on interactive button element"}}
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
| Role valid | role in {analyst, architect, developer, qa} | "Invalid role: {role}" |
| Pipeline mode valid | pipeline_mode in {page, feature, system} | "Invalid pipeline_mode: {mode}" |
| QA verdict valid | qa_verdict in {PASSED, PASSED_WITH_WARNINGS, FIX_REQUIRED, ""} | "Invalid qa_verdict: {verdict}" |
| Cross-mechanism deps | Interactive to CSV deps resolve correctly | "Cross-mechanism dependency unresolvable: {id}" |
