# Team UI Design -- CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier (PREFIX-NNN) | `"RESEARCH-001"` |
| `title` | string | Yes | Short task title | `"Design system analysis"` |
| `description` | string | Yes | Detailed task description (self-contained) with PURPOSE/TASK/CONTEXT/EXPECTED/CONSTRAINTS | `"PURPOSE: Analyze existing design system..."` |
| `role` | enum | Yes | Worker role: `researcher`, `designer`, `reviewer`, `implementer` | `"researcher"` |
| `pipeline_mode` | enum | Yes | Pipeline mode: `component`, `system`, `full-system` | `"component"` |
| `scope` | enum | Yes | Task scope: `full`, `tokens`, `components` | `"full"` |
| `audit_type` | string | No | Audit type: `token-audit`, `component-audit`, `final-audit` (empty for non-reviewer) | `"token-audit"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"RESEARCH-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"RESEARCH-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[RESEARCH-001] Detected React + shadcn stack..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` -> `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Generated 24 color tokens with dark mode..."` |
| `artifacts_produced` | string | Semicolon-separated paths of produced artifacts | `"artifacts/research/design-system-analysis.json;artifacts/research/component-inventory.json"` |
| `audit_score` | string | Audit weighted score 0-10 (empty for non-reviewer tasks) | `"8.5"` |
| `audit_signal` | enum | `audit_passed`, `audit_result`, `fix_required` (empty for non-reviewer) | `"audit_passed"` |
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
| researcher | RESEARCH | read-only (design system analysis + intelligence retrieval) |
| designer | DESIGN | generation (design tokens + component specs, W3C format) |
| reviewer | AUDIT | validation (5-dimension quality audit, GC critic) |
| implementer | BUILD | code-gen (CSS custom properties + components + accessibility) |

---

### Example Data

```csv
id,title,description,role,pipeline_mode,scope,audit_type,deps,context_from,exec_mode,wave,status,findings,artifacts_produced,audit_score,audit_signal,error
"RESEARCH-001","Design system analysis","PURPOSE: Analyze existing design system, build component inventory, assess accessibility baseline | Success: 4 research artifacts produced with valid data\nTASK:\n- Analyze existing design tokens and styling patterns\n- Build component inventory with props and states\n- Assess accessibility baseline\n- Retrieve design intelligence via ui-ux-pro-max\nCONTEXT:\n- Session: .workflow/.csv-wave/uds-saas-dashboard-20260308\n- Industry: SaaS/Tech\nEXPECTED: artifacts/research/*.json | All 4 research files with valid JSON\nCONSTRAINTS: Read-only analysis","researcher","component","full","","","","csv-wave","1","pending","","","","",""
"DESIGN-001","Design tokens + component spec","PURPOSE: Define design tokens (W3C format) and component specification | Success: Design tokens + component spec with all states defined\nTASK:\n- Define complete token system (color, typography, spacing, shadow, border, breakpoint)\n- Create component specification with all 5 interactive states\n- Ensure accessibility spec\nCONTEXT:\n- Session: .workflow/.csv-wave/uds-saas-dashboard-20260308\n- Upstream: research/*.json\nEXPECTED: artifacts/design/design-tokens.json + component-specs/*.md\nCONSTRAINTS: Follow W3C Design Tokens Format | Light/dark for all color tokens","designer","component","tokens","","RESEARCH-001","RESEARCH-001","csv-wave","2","pending","","","","",""
"AUDIT-001","Design audit","PURPOSE: 5-dimension quality audit for consistency, accessibility, completeness, quality, industry compliance | Success: Audit score >= 8 with 0 critical issues\nTASK:\n- Score 5 dimensions (consistency 20%, accessibility 25%, completeness 20%, quality 15%, industry 20%)\n- Check token naming, theme completeness, contrast ratios\n- Verify component states and ARIA spec\nCONTEXT:\n- Session: .workflow/.csv-wave/uds-saas-dashboard-20260308\n- Upstream: design/design-tokens.json, design/component-specs/*.md\nEXPECTED: artifacts/audit/audit-001.md\nCONSTRAINTS: Read-only analysis | GC convergence: score >= 8 and 0 critical","reviewer","component","full","token-audit","DESIGN-001","DESIGN-001","csv-wave","3","pending","","","","",""
"BUILD-001","Component implementation","PURPOSE: Implement component code from design specs | Success: Production code with token consumption and accessibility\nTASK:\n- Generate CSS custom properties from design tokens\n- Implement component with all 5 states\n- Add ARIA attributes and keyboard navigation\n- Validate no hardcoded values\nCONTEXT:\n- Session: .workflow/.csv-wave/uds-saas-dashboard-20260308\n- Upstream: design/design-tokens.json, design/component-specs/*.md, audit/audit-001.md\nEXPECTED: artifacts/build/**/*\nCONSTRAINTS: Use var(--token-name) only | Follow project patterns","implementer","component","full","","AUDIT-001","AUDIT-001","csv-wave","4","pending","","","","",""
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
audit_type  ---------->  audit_type  ---------->  (reads)
deps        ---------->  deps        ---------->  (reads)
context_from---------->  context_from---------->  (reads)
exec_mode   ---------->  exec_mode   ---------->  (reads)
                         wave         ---------->  (reads)
                         prev_context ---------->  (reads)
                                                   status
                                                   findings
                                                   artifacts_produced
                                                   audit_score
                                                   audit_signal
                                                   error
```

---

## Output Schema (JSON)

Agent output via `report_agent_job_result` (csv-wave tasks):

```json
{
  "id": "DESIGN-001",
  "status": "completed",
  "findings": "Generated design token system with 24 color tokens (light+dark), 7 typography scales, 6 spacing values. Created component spec for Button with all 5 states, ARIA roles, and responsive breakpoints.",
  "artifacts_produced": "artifacts/design/design-tokens.json;artifacts/design/component-specs/button.md",
  "audit_score": "",
  "audit_signal": "",
  "error": ""
}
```

Reviewer agent output example:

```json
{
  "id": "AUDIT-001",
  "status": "completed",
  "findings": "Design audit: 8.4/10. Token naming consistent, all color tokens have light/dark variants, contrast ratios meet WCAG AA. Minor: missing border-radius for pill variant.",
  "artifacts_produced": "artifacts/audit/audit-001.md",
  "audit_score": "8.4",
  "audit_signal": "audit_passed",
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
| `issue_found` | `data.file+data.line` | `{file, line, severity, description}` | Audit issue discovered |
| `anti_pattern_violation` | `data.pattern+data.file` | `{pattern, file, line, description}` | Design anti-pattern detected |
| `artifact_produced` | `data.path` | `{name, path, producer, type}` | Deliverable created |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00Z","worker":"RESEARCH-001","type":"tech_stack_detected","data":{"stack":"react","framework":"nextjs","ui_lib":"shadcn"}}
{"ts":"2026-03-08T10:05:00Z","worker":"DESIGN-001","type":"token_generated","data":{"category":"color","count":24,"supports_dark_mode":true}}
{"ts":"2026-03-08T10:10:00Z","worker":"BUILD-001","type":"file_modified","data":{"file":"tokens.css","change":"Generated CSS custom properties from design tokens","lines_added":85}}
{"ts":"2026-03-08T10:15:00Z","worker":"AUDIT-001","type":"issue_found","data":{"file":"design-tokens.json","line":0,"severity":"high","description":"Missing dark mode variant for semantic color tokens"}}
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
| Role valid | role in {researcher, designer, reviewer, implementer} | "Invalid role: {role}" |
| Pipeline mode valid | pipeline_mode in {component, system, full-system} | "Invalid pipeline_mode: {mode}" |
| Audit signal valid | audit_signal in {audit_passed, audit_result, fix_required, ""} | "Invalid audit_signal: {signal}" |
| Cross-mechanism deps | Interactive to CSV deps resolve correctly | "Cross-mechanism dependency unresolvable: {id}" |
