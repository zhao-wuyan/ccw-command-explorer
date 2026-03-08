# Team Skill Designer -- CSV Schema

## Master CSV: tasks.csv

### Column Definitions

#### Input Columns (Set by Decomposer)

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier | `"SCAFFOLD-001"` |
| `title` | string | Yes | Short task title | `"Create directory structure"` |
| `description` | string | Yes | Detailed generation instructions (self-contained) | `"Create roles/, specs/, templates/ directories..."` |
| `role` | string | Yes | Generator role name | `"scaffolder"` |
| `file_target` | string | Yes | Target file/directory path relative to skill root | `"roles/coordinator/role.md"` |
| `gen_type` | enum | Yes | `directory`, `router`, `role-bundle`, `role-inline`, `spec`, `template`, `validation` | `"role-inline"` |
| `deps` | string | No | Semicolon-separated dependency task IDs | `"SCAFFOLD-001;SPEC-001"` |
| `context_from` | string | No | Semicolon-separated task IDs for context | `"SPEC-001"` |
| `exec_mode` | enum | Yes | Execution mechanism: `csv-wave` or `interactive` | `"csv-wave"` |

#### Computed Columns (Set by Wave Engine)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `wave` | integer | Wave number (1-based, from topological sort) | `2` |
| `prev_context` | string | Aggregated findings from context_from tasks (per-wave CSV only) | `"[SCAFFOLD-001] Created directory structure at .codex/skills/..."` |

#### Output Columns (Set by Agent)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `status` | enum | `pending` -> `completed` / `failed` / `skipped` | `"completed"` |
| `findings` | string | Key discoveries (max 500 chars) | `"Generated coordinator with 3 commands: analyze, dispatch, monitor"` |
| `files_produced` | string | Semicolon-separated paths of produced files | `"roles/coordinator/role.md;roles/coordinator/commands/analyze.md"` |
| `error` | string | Error message if failed | `""` |

---

### exec_mode Values

| Value | Mechanism | Description |
|-------|-----------|-------------|
| `csv-wave` | `spawn_agents_on_csv` | One-shot batch execution within wave |
| `interactive` | `spawn_agent`/`wait`/`send_input`/`close_agent` | Multi-round individual execution |

Interactive tasks appear in master CSV for dependency tracking but are NOT included in wave-{N}.csv files.

---

### Generator Roles

| Role | gen_type Values | Description |
|------|-----------------|-------------|
| `scaffolder` | `directory` | Creates directory structures |
| `router-writer` | `router` | Generates SKILL.md orchestrator files |
| `role-writer` | `role-bundle`, `role-inline` | Generates role.md files (+ optional commands/) |
| `spec-writer` | `spec` | Generates specs/*.md files |
| `template-writer` | `template` | Generates templates/*.md files |
| `validator` | `validation` | Validates generated skill package |

---

### gen_type Values

| gen_type | Target | Description |
|----------|--------|-------------|
| `directory` | Directory path | Create directory structure with subdirectories |
| `router` | SKILL.md | Generate main orchestrator SKILL.md with frontmatter, role registry, router |
| `role-bundle` | Directory path | Generate role.md + commands/ folder with multiple command files |
| `role-inline` | Single .md file | Generate single role.md with inline Phase 2-4 logic |
| `spec` | Single .md file | Generate spec file (pipelines, quality-gates, etc.) |
| `template` | Single .md file | Generate document template file |
| `validation` | Report | Validate complete skill package structure and references |

---

### Example Data

```csv
id,title,description,role,file_target,gen_type,deps,context_from,exec_mode,wave,status,findings,files_produced,error
"SCAFFOLD-001","Create directory structure","Create complete directory structure for team-code-review skill:\n- ~  or <project>/.codex/skills/team-code-review/\n- roles/coordinator/ + commands/\n- roles/analyst/\n- roles/reviewer/\n- specs/\n- templates/","scaffolder","skill-dir","directory","","","csv-wave","1","pending","","",""
"ROUTER-001","Generate SKILL.md","Generate ~  or <project>/.codex/skills/team-code-review/SKILL.md with:\n- Frontmatter (name, description, allowed-tools)\n- Architecture diagram\n- Role registry table\n- CSV schema reference\n- Session structure\n- Wave execution engine\nUse teamConfig.json for role list and pipeline definitions","router-writer","SKILL.md","router","SCAFFOLD-001","SCAFFOLD-001","csv-wave","2","pending","","",""
"SPEC-001","Generate pipelines spec","Generate specs/pipelines.md with:\n- Pipeline definitions from teamConfig\n- Task registry with PREFIX-NNN format\n- Conditional routing rules\n- Dynamic specialist injection\nRoles: analyst(ANALYSIS-*), reviewer(REVIEW-*)","spec-writer","specs/pipelines.md","spec","SCAFFOLD-001","SCAFFOLD-001","csv-wave","2","pending","","",""
"ROLE-001","Generate coordinator","Generate roles/coordinator/role.md with entry router and commands/analyze.md, commands/dispatch.md, commands/monitor.md. Coordinator orchestrates the analysis pipeline","role-writer","roles/coordinator/","role-bundle","SCAFFOLD-001;SPEC-001","SPEC-001","csv-wave","3","pending","","",""
"ROLE-002","Generate analyst role","Generate roles/analyst/role.md with Phase 2 (context loading), Phase 3 (analysis execution), Phase 4 (output). Prefix: ANALYSIS, inner_loop: false","role-writer","roles/analyst/role.md","role-inline","SCAFFOLD-001;SPEC-001","SPEC-001","csv-wave","3","pending","","",""
"ROLE-003","Generate reviewer role","Generate roles/reviewer/role.md with Phase 2 (load artifacts), Phase 3 (review execution), Phase 4 (report). Prefix: REVIEW, inner_loop: false","role-writer","roles/reviewer/role.md","role-inline","SCAFFOLD-001;SPEC-001","SPEC-001","csv-wave","3","pending","","",""
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
file_target ---------->  file_target ---------->  (reads)
gen_type    ---------->  gen_type    ---------->  (reads)
deps        ---------->  deps        ---------->  (reads)
context_from---------->  context_from---------->  (reads)
exec_mode   ---------->  exec_mode   ---------->  (reads)
                         wave         ---------->  (reads)
                         prev_context ---------->  (reads)
                                                   status
                                                   findings
                                                   files_produced
                                                   error
```

---

## Output Schema (JSON)

Agent output via `report_agent_job_result` (csv-wave tasks):

```json
{
  "id": "ROLE-001",
  "status": "completed",
  "findings": "Generated coordinator role with entry router, 3 commands (analyze, dispatch, monitor), beat model in monitor.md only",
  "files_produced": "roles/coordinator/role.md;roles/coordinator/commands/analyze.md;roles/coordinator/commands/dispatch.md;roles/coordinator/commands/monitor.md",
  "error": ""
}
```

Interactive tasks output via structured text or JSON written to `interactive/{id}-result.json`.

---

## Discovery Types

| Type | Dedup Key | Data Schema | Description |
|------|-----------|-------------|-------------|
| `dir_created` | `data.path` | `{path, description}` | Directory structure created |
| `file_generated` | `data.file` | `{file, gen_type, sections}` | File generated with sections |
| `pattern_found` | `data.pattern_name` | `{pattern_name, description}` | Design pattern from golden sample |
| `config_decision` | `data.decision` | `{decision, rationale, impact}` | Config decision made |
| `validation_result` | `data.check` | `{check, passed, message}` | Validation check result |
| `reference_found` | `data.source+data.target` | `{source, target, type}` | Cross-reference between files |

### Discovery NDJSON Format

```jsonl
{"ts":"2026-03-08T10:00:00Z","worker":"SCAFFOLD-001","type":"dir_created","data":{"path":"~  or <project>/.codex/skills/team-code-review/roles/","description":"Created roles directory with coordinator, analyst, reviewer subdirs"}}
{"ts":"2026-03-08T10:05:00Z","worker":"ROLE-001","type":"file_generated","data":{"file":"roles/coordinator/role.md","gen_type":"role-bundle","sections":["entry-router","phase-0","phase-1","phase-2","phase-3"]}}
{"ts":"2026-03-08T10:10:00Z","worker":"SPEC-001","type":"config_decision","data":{"decision":"full-lifecycle pipeline","rationale":"Both analyst and reviewer roles present","impact":"4-tier dependency graph"}}
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
| gen_type valid | Value in {directory, router, role-bundle, role-inline, spec, template, validation} | "Invalid gen_type: {value}" |
| file_target valid | Path is relative and uses forward slashes | "Invalid file_target: {path}" |
| Cross-mechanism deps | Interactive to CSV deps resolve correctly | "Cross-mechanism dependency unresolvable: {id}" |
