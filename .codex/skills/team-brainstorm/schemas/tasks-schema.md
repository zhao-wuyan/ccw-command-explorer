# Team Brainstorm — CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier | `"IDEA-001"` |
| `title` | string | Yes | Short task title | `"Multi-angle idea generation"` |
| `description` | string | Yes | Detailed task description (self-contained) | `"Generate 3+ ideas per angle..."` |
| `role` | string | Yes | Worker role: ideator, challenger, synthesizer, evaluator | `"ideator"` |
| `angle` | string | No | Brainstorming angle(s) for ideator tasks (semicolon-separated) | `"Technical;Product;Innovation"` |
| `gc_round` | integer | Yes | Generator-Critic round number (0 = initial, 1+ = revision) | `"0"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"IDEA-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"IDEA-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[Task IDEA-001] Generated 8 ideas..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` → `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Generated 8 ideas across 3 angles..."` |
| `gc_signal` | string | Generator-Critic signal (challenger only): `REVISION_NEEDED` or `CONVERGED` | `"REVISION_NEEDED"` |
| `severity_summary` | string | Severity count summary (challenger only) | `"CRITICAL:0 HIGH:2 MEDIUM:3 LOW:1"` |
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
id,title,description,role,angle,gc_round,deps,context_from,exec_mode,wave,status,findings,gc_signal,severity_summary,error
"IDEA-001","Multi-angle idea generation","Generate 3+ ideas per angle with title, description, assumption, and potential impact. Cover all assigned angles comprehensively.","ideator","Technical;Product;Innovation","0","","","csv-wave","1","pending","","","",""
"IDEA-002","Parallel angle generation (Risk)","Generate 3+ ideas focused on Risk angle with title, description, assumption, and potential impact.","ideator","Risk","0","","","csv-wave","1","pending","","","",""
"CHALLENGE-001","Critique generated ideas","Read all idea artifacts. Challenge each idea across assumption validity, feasibility, risk, and competition dimensions. Assign severity (CRITICAL/HIGH/MEDIUM/LOW) per idea. Output GC signal.","challenger","","0","IDEA-001;IDEA-002","IDEA-001;IDEA-002","csv-wave","2","pending","","","",""
"GC-CHECK-001","GC loop decision","Evaluate critique severity counts. If any HIGH/CRITICAL: REVISION_NEEDED. Else: CONVERGED.","gc-controller","","1","CHALLENGE-001","CHALLENGE-001","interactive","3","pending","","","",""
"IDEA-003","Revise ideas (GC Round 1)","Address HIGH/CRITICAL challenges from critique. Retain unchallenged ideas intact. Replace unsalvageable ideas.","ideator","","1","GC-CHECK-001","CHALLENGE-001","csv-wave","4","pending","","","",""
"SYNTH-001","Synthesize proposals","Extract themes from ideas and critiques. Resolve conflicts. Generate 1-3 integrated proposals with feasibility and innovation scores.","synthesizer","","0","IDEA-003","IDEA-001;IDEA-002;IDEA-003;CHALLENGE-001","csv-wave","5","pending","","","",""
"EVAL-001","Score and rank proposals","Score each proposal: Feasibility 30%, Innovation 25%, Impact 25%, Cost 20%. Generate final ranking and recommendation.","evaluator","","0","SYNTH-001","SYNTH-001","csv-wave","6","pending","","","",""
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
angle       ───────────►  angle       ──────────►  (reads)
gc_round    ───────────►  gc_round    ──────────►  (reads)
deps        ───────────►  deps        ──────────►  (reads)
context_from───────────►  context_from──────────►  (reads)
exec_mode   ───────────►  exec_mode   ──────────►  (reads)
                          wave         ──────────►  (reads)
                          prev_context ──────────►  (reads)
                                                    status
                                                    findings
                                                    gc_signal
                                                    severity_summary
                                                    error
```

---

## Output Schema (JSON)

Agent output via `report_agent_job_result` (csv-wave tasks):

```json
{
  "id": "IDEA-001",
  "status": "completed",
  "findings": "Generated 8 ideas across Technical, Product, Innovation angles. Key themes: API gateway pattern, event-driven architecture, developer experience tools.",
  "gc_signal": "",
  "severity_summary": "",
  "error": ""
}
```

Challenger-specific output:

```json
{
  "id": "CHALLENGE-001",
  "status": "completed",
  "findings": "Challenged 8 ideas. 2 HIGH severity (require revision), 3 MEDIUM, 3 LOW.",
  "gc_signal": "REVISION_NEEDED",
  "severity_summary": "CRITICAL:0 HIGH:2 MEDIUM:3 LOW:3",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `idea` | `data.title` | `{title, angle, description, assumption, impact}` | Generated brainstorm idea |
| `critique` | `data.idea_title` | `{idea_title, dimension, severity, challenge, rationale}` | Critique of an idea |
| `theme` | `data.name` | `{name, strength, supporting_ideas[]}` | Extracted theme from synthesis |
| `proposal` | `data.title` | `{title, source_ideas[], feasibility, innovation, description}` | Integrated proposal |
| `evaluation` | `data.proposal_title` | `{proposal_title, weighted_score, rank, recommendation}` | Scored proposal |
| `gc_decision` | `data.round` | `{round, signal, severity_counts}` | GC loop decision record |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00+08:00","worker":"IDEA-001","type":"idea","data":{"title":"API Gateway Pattern","angle":"Technical","description":"Centralized API gateway for microservice routing","assumption":"Services need unified entry point","impact":"Simplifies client integration"}}
{"ts":"2026-03-08T10:01:00+08:00","worker":"IDEA-001","type":"idea","data":{"title":"Event Sourcing Migration","angle":"Technical","description":"Adopt event sourcing for service state management","assumption":"Current state is hard to trace across services","impact":"Full audit trail and temporal queries"}}
{"ts":"2026-03-08T10:05:00+08:00","worker":"CHALLENGE-001","type":"critique","data":{"idea_title":"API Gateway Pattern","dimension":"feasibility","severity":"MEDIUM","challenge":"Single point of failure risk","rationale":"Requires HA design with circuit breakers"}}
{"ts":"2026-03-08T10:10:00+08:00","worker":"SYNTH-001","type":"theme","data":{"name":"Infrastructure Modernization","strength":8,"supporting_ideas":["API Gateway Pattern","Event Sourcing Migration"]}}
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
| Valid role | role in {ideator, challenger, synthesizer, evaluator, gc-controller} | "Invalid role: {role}" |
| GC round non-negative | gc_round >= 0 | "Invalid gc_round: {value}" |
| Cross-mechanism deps | Interactive→CSV deps resolve correctly | "Cross-mechanism dependency unresolvable: {id}" |
