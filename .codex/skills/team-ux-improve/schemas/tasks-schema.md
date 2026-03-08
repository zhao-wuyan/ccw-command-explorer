# UX Improvement — CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier | `"SCAN-001"` |
| `title` | string | Yes | Short task title | `"Scan Button component"` |
| `description` | string | Yes | Detailed task description (self-contained) | `"Scan Button component for UX issues..."` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"EXPLORE-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"EXPLORE-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |
| `role` | enum | Yes | Role name: `explorer`, `scanner`, `diagnoser`, `designer`, `implementer`, `tester` | `"scanner"` |
| `component` | string | No | Component name being processed | `"Button"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[EXPLORE-001] Found 15 components..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` → `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Found 3 UX issues: unresponsive onClick..."` |
| `issues_found` | string | Number of issues found (scanner/diagnoser) | `"3"` |
| `issues_fixed` | string | Number of issues fixed (implementer) | `"3"` |
| `error` | string | Error message if failed | `""` |

---

### exec_mode Values

| Value | Mechanism | Description |
|-------|-----------|-------------|
| `csv-wave` | `spawn_agents_on_csv` | One-shot batch execution within wave |
| `interactive` | `spawn_agent`/`wait`/`send_input`/`close_agent` | Multi-round individual execution |

---

### Example Data

```csv
id,title,description,deps,context_from,exec_mode,role,component,wave,status,findings,issues_found,issues_fixed,error
EXPLORE-001,Framework Exploration,Explore React component patterns,,,"interactive",explorer,,1,completed,"Found 15 components using React hooks","","",""
SCAN-001,Scan Button,Scan Button for UX issues,EXPLORE-001,EXPLORE-001,"csv-wave",scanner,Button,2,pending,"","","",""
DIAG-001,Diagnose Button,Analyze root causes in Button,SCAN-001,SCAN-001,"csv-wave",diagnoser,Button,3,pending,"","","",""
DESIGN-001,Design Button fixes,Design fix approach for Button,DIAG-001,DIAG-001,"interactive",designer,Button,4,pending,"","","",""
```

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `ux_issue` | `component+type` | `{component, type, description, severity}` | UX issues discovered |
| `pattern` | `pattern` | `{pattern, files[], description}` | UI patterns identified |
| `fix_approach` | `component+issue` | `{component, issue, approach, rationale}` | Fix strategies |
| `test_result` | `component+test` | `{component, test, status, details}` | Test outcomes |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T14:30:22Z","worker":"SCAN-001","type":"ux_issue","data":{"component":"Button","type":"unresponsive_click","description":"onClick handler not firing","severity":"high"}}
{"ts":"2026-03-08T14:35:10Z","worker":"DIAG-001","type":"pattern","data":{"pattern":"event delegation","files":["Button.tsx"],"description":"Using event delegation pattern"}}
```

---

## Validation Rules

| Rule | Check | Error |
|------|-------|-------|
| Unique IDs | No duplicate `id` values | "Duplicate task ID: {id}" |
| Valid deps | All dep IDs exist in tasks | "Unknown dependency: {dep_id}" |
| No self-deps | Task cannot depend on itself | "Self-dependency: {id}" |
| No circular deps | Topological sort completes | "Circular dependency detected" |
| exec_mode valid | Value is `csv-wave` or `interactive` | "Invalid exec_mode: {value}" |
| Role valid | role ∈ {explorer, scanner, diagnoser, designer, implementer, tester} | "Invalid role: {role}" |
