# Team Ultra Analyze — CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier | `"EXPLORE-001"` |
| `title` | string | Yes | Short task title | `"Explore from technical perspective"` |
| `description` | string | Yes | Detailed task description (self-contained) | `"Search codebase from technical perspective..."` |
| `role` | string | Yes | Worker role: explorer, analyst, discussant, synthesizer | `"explorer"` |
| `perspective` | string | No | Analysis perspective: technical, architectural, business, domain_expert | `"technical"` |
| `dimensions` | string | No | Analysis dimensions (semicolon-separated) | `"architecture;implementation"` |
| `discussion_round` | integer | No | Discussion round number (0 = N/A, 1+ = round) | `"1"` |
| `discussion_type` | string | No | Discussion type: initial, deepen, direction-adjusted, specific-questions | `"initial"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"EXPLORE-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"EXPLORE-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[Task EXPLORE-001] Found 12 relevant files..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` → `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Found 12 files related to auth module..."` |
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
id,title,description,role,perspective,dimensions,discussion_round,discussion_type,deps,context_from,exec_mode,wave,status,findings,error
"EXPLORE-001","Explore from technical perspective","Search codebase from technical perspective. Collect files, patterns, and findings related to authentication module.","explorer","technical","architecture;implementation","0","","","","csv-wave","1","pending","",""
"EXPLORE-002","Explore from architectural perspective","Search codebase from architectural perspective. Focus on module boundaries, component interactions, and system design patterns.","explorer","architectural","architecture;security","0","","","","csv-wave","1","pending","",""
"ANALYZE-001","Deep analysis from technical perspective","Analyze exploration results from technical perspective. Generate insights with confidence levels and evidence references.","analyst","technical","architecture;implementation","0","","EXPLORE-001","EXPLORE-001","csv-wave","2","pending","",""
"ANALYZE-002","Deep analysis from architectural perspective","Analyze exploration results from architectural perspective. Focus on system design quality and scalability.","analyst","architectural","architecture;security","0","","EXPLORE-002","EXPLORE-002","csv-wave","2","pending","",""
"DISCUSS-001","Initial discussion round","Aggregate all analysis results across perspectives. Identify convergent themes, conflicting views, and top discussion points.","discussant","","","1","initial","ANALYZE-001;ANALYZE-002","ANALYZE-001;ANALYZE-002","csv-wave","3","pending","",""
"FEEDBACK-001","Discussion feedback gate","Collect user feedback on discussion results. Decide: continue deeper, adjust direction, or proceed to synthesis.","","","","1","","DISCUSS-001","DISCUSS-001","interactive","4","pending","",""
"SYNTH-001","Final synthesis","Integrate all explorations, analyses, and discussions into final conclusions with prioritized recommendations.","synthesizer","","","0","","FEEDBACK-001","EXPLORE-001;EXPLORE-002;ANALYZE-001;ANALYZE-002;DISCUSS-001","csv-wave","5","pending","",""
```

---

### Column Lifecycle

```
Decomposer (Phase 1)     Wave Engine (Phase 2)    Agent (Execution)
─────────────────────    ────────────────────     ─────────────────
id          ───────────►  id          ──────────►  id
title       ───────────►  title       ──────────►  (reads)
description ───────────►  description ──────────►  (reads)
role        ───────────►  role        ──────────►  (reads)
perspective ───────────►  perspective ──────────►  (reads)
dimensions  ───────────►  dimensions  ──────────►  (reads)
discussion_round ──────►  discussion_round ─────►  (reads)
discussion_type ───────►  discussion_type ──────►  (reads)
deps        ───────────►  deps        ──────────►  (reads)
context_from───────────►  context_from──────────►  (reads)
exec_mode   ───────────►  exec_mode   ──────────►  (reads)
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
  "id": "EXPLORE-001",
  "status": "completed",
  "findings": "Found 12 files related to auth module. Key files: src/auth/index.ts, src/auth/strategies/*.ts. Patterns: strategy pattern for provider switching, middleware chain for request validation.",
  "error": ""
}
```

Analyst output:

```json
{
  "id": "ANALYZE-001",
  "status": "completed",
  "findings": "3 key insights: (1) Auth uses strategy pattern [high confidence], (2) JWT validation lacks refresh token rotation [medium], (3) Rate limiting missing on auth endpoints [high]. 2 discussion points identified.",
  "error": ""
}
```

Discussant output:

```json
{
  "id": "DISCUSS-001",
  "status": "completed",
  "findings": "Convergent themes: JWT security concerns (2 perspectives agree), strategy pattern approval. Conflicts: architectural vs technical on middleware approach. Top questions: refresh token strategy, rate limit placement.",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `exploration` | `data.perspective+data.file` | `{perspective, file, relevance, summary, patterns[]}` | Explored file or module |
| `analysis` | `data.perspective+data.insight` | `{perspective, insight, confidence, evidence, file_ref}` | Analysis insight |
| `pattern` | `data.name` | `{name, file, description, type}` | Code or architecture pattern |
| `discussion_point` | `data.topic` | `{topic, perspectives[], convergence, open_questions[]}` | Discussion point |
| `recommendation` | `data.action` | `{action, rationale, priority, confidence}` | Recommendation |
| `conclusion` | `data.point` | `{point, evidence, confidence, perspectives_supporting[]}` | Final conclusion |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00+08:00","worker":"EXPLORE-001","type":"exploration","data":{"perspective":"technical","file":"src/auth/index.ts","relevance":"high","summary":"Auth module entry point with OAuth and JWT exports","patterns":["module-pattern","strategy-pattern"]}}
{"ts":"2026-03-08T10:01:00+08:00","worker":"EXPLORE-001","type":"pattern","data":{"name":"strategy-pattern","file":"src/auth/strategies/","description":"Provider switching via strategy pattern","type":"behavioral"}}
{"ts":"2026-03-08T10:05:00+08:00","worker":"ANALYZE-001","type":"analysis","data":{"perspective":"technical","insight":"JWT validation lacks refresh token rotation","confidence":"medium","evidence":"No rotation logic in src/auth/jwt/verify.ts","file_ref":"src/auth/jwt/verify.ts:42"}}
{"ts":"2026-03-08T10:10:00+08:00","worker":"DISCUSS-001","type":"discussion_point","data":{"topic":"JWT Security","perspectives":["technical","architectural"],"convergence":"Both agree on rotation need","open_questions":["Sliding vs fixed window?"]}}
{"ts":"2026-03-08T10:15:00+08:00","worker":"SYNTH-001","type":"conclusion","data":{"point":"Auth module needs refresh token rotation","evidence":"src/auth/jwt/verify.ts lacks rotation","confidence":"high","perspectives_supporting":["technical","architectural"]}}
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
| Valid role | role in {explorer, analyst, discussant, synthesizer} | "Invalid role: {role}" |
| Valid perspective | perspective in {technical, architectural, business, domain_expert, general, ""} | "Invalid perspective: {value}" |
| Discussion round non-negative | discussion_round >= 0 | "Invalid discussion_round: {value}" |
| Cross-mechanism deps | Interactive→CSV deps resolve correctly | "Cross-mechanism dependency unresolvable: {id}" |
