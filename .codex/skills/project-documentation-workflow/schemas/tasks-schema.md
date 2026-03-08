# CSV Schema — Project Documentation Workflow (Optimized)

Dynamic task decomposition with topological wave computation.

## tasks.csv (Master State)

### Column Definitions

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Task ID (doc-NNN, auto-generated) | `"doc-001"` |
| `title` | string | Yes | Document title | `"系统架构图"` |
| `description` | string | Yes | Detailed task description (self-contained) | `"绘制系统架构图..."` |
| `doc_type` | enum | Yes | Document type | `"architecture"` |
| `target_scope` | string | Yes | File scope (glob pattern) | `"src/**"` |
| `doc_sections` | string | Yes | Required sections (comma-separated) | `"components,dependencies"` |
| `formula_support` | boolean | No | LaTeX formula support needed | `"true"` |
| `priority` | enum | No | Task priority | `"high"` |
| `deps` | string | No | Dependency task IDs (semicolon-separated) | `"doc-001;doc-002"` |
| `context_from` | string | No | Context source task IDs | `"doc-001;doc-003"` |
| `wave` | integer | Computed | Wave number (computed by topological sort) | `1` |
| `status` | enum | Output | `pending` → `completed`/`failed`/`skipped` | `"completed"` |
| `findings` | string | Output | Key findings summary (max 500 chars) | `"Found 3 main components..."` |
| `doc_path` | string | Output | Generated document path | `"docs/02-architecture/system-architecture.md"` |
| `key_discoveries` | string | Output | Key discoveries (JSON array) | `"[{\"name\":\"...\",\"type\":\"...\"}]"` |
| `error` | string | Output | Error message if failed | `""` |

### doc_type Values

| Value | Typical Wave | Description |
|-------|--------------|-------------|
| `overview` | 1 | Project overview, tech stack, structure |
| `architecture` | 2 | System architecture, patterns, interactions |
| `implementation` | 3 | Algorithms, data structures, utilities |
| `theory` | 3 | Mathematical foundations, formulas (LaTeX) |
| `feature` | 4 | Feature documentation |
| `usage` | 4 | Usage guide, installation, configuration |
| `api` | 4 | API reference |
| `synthesis` | 5+ | Design philosophy, best practices, summary |

### priority Values

| Value | Description | Typical Use |
|-------|-------------|-------------|
| `high` | Essential document | overview, architecture |
| `medium` | Useful but optional | implementation details |
| `low` | Nice to have | extended examples |

---

## Dynamic Task Generation

### Task Count Guidelines

| Project Scale | File Count | Recommended Tasks | Waves |
|--------------|------------|-------------------|-------|
| Small | < 20 files | 5-8 tasks | 2-3 |
| Medium | 20-100 files | 10-15 tasks | 3-4 |
| Large | > 100 files | 15-25 tasks | 4-6 |

### Project Type → Task Templates

| Project Type | Essential Tasks | Optional Tasks |
|-------------|-----------------|----------------|
| **Library** | overview, api-reference, usage-guide | design-patterns, best-practices |
| **Application** | overview, architecture, feature-list, usage-guide | api-reference, deployment |
| **Service/API** | overview, architecture, api-reference | module-interactions, deployment |
| **CLI Tool** | overview, usage-guide, api-reference | architecture |
| **Numerical/Scientific** | overview, architecture, theoretical-foundations | algorithms, data-structures |

---

## Wave Computation (Topological Sort)

### Algorithm: Kahn's BFS

```
Input: tasks with deps field
Output: tasks with wave field

1. Build adjacency list from deps
2. Initialize in-degree for each task
3. Queue tasks with in-degree 0 (Wave 1)
4. While queue not empty:
   a. Current wave = all queued tasks
   b. For each completed task, decrement dependents' in-degree
   c. Queue tasks with in-degree 0 for next wave
5. Assign wave numbers
6. Detect cycles: if unassigned tasks remain → circular dependency
```

### Dependency Rules

| doc_type | Typical deps | Rationale |
|----------|--------------|-----------|
| `overview` | (none) | Foundation tasks |
| `architecture` | `overview` tasks | Needs project understanding |
| `implementation` | `architecture` tasks | Needs design context |
| `theory` | `overview` + `architecture` | Needs model understanding |
| `feature` | `implementation` tasks | Needs code knowledge |
| `api` | `implementation` tasks | Needs function signatures |
| `usage` | `feature` tasks | Needs feature knowledge |
| `synthesis` | Most other tasks | Integrates all findings |

---

## Example CSV (Small Project - 7 tasks, 3 waves)

```csv
id,title,description,doc_type,target_scope,doc_sections,formula_support,priority,deps,context_from,wave,status,findings,doc_path,key_discoveries,error
"doc-001","项目概述","撰写项目概述","overview","README.md,package.json","purpose,background,audience","false","high","","","1","pending","","","",""
"doc-002","技术栈","分析技术栈","overview","package.json,tsconfig.json","languages,frameworks,dependencies","false","medium","","doc-001","1","pending","","","",""
"doc-003","系统架构","绘制架构图","architecture","src/**","components,dependencies,dataflow","false","high","doc-001","doc-001;doc-002","2","pending","","","",""
"doc-004","核心算法","文档化核心算法","implementation","src/core/**","algorithms,complexity,examples","false","high","doc-003","doc-003","3","pending","","","",""
"doc-005","API参考","API文档","api","src/**/*.ts","endpoints,parameters,examples","false","high","doc-003","doc-003;doc-004","3","pending","","","",""
"doc-006","使用指南","使用说明","usage","README.md,examples/**","installation,configuration,running","false","high","doc-004;doc-005","doc-004;doc-005","4","pending","","","",""
"doc-007","最佳实践","推荐用法","synthesis","src/**,examples/**","recommendations,pitfalls,examples","false","medium","doc-006","doc-004;doc-005;doc-006","5","pending","","","",""
```

### Computed Wave Distribution

| Wave | Tasks | Parallelism |
|------|-------|-------------|
| 1 | doc-001, doc-002 | 2 concurrent |
| 2 | doc-003 | 1 (sequential) |
| 3 | doc-004, doc-005 | 2 concurrent |
| 4 | doc-006 | 1 (sequential) |
| 5 | doc-007 | 1 (sequential) |

---

## Per-Wave CSV (Temporary)

Extra columns added by Wave Engine:

| Column | Type | Description |
|--------|------|-------------|
| `prev_context` | string | Aggregated findings + Wave Summary + Relevant Discoveries |

### prev_context Assembly

```javascript
prev_context = 
  // 1. From context_from tasks
  context_from.map(id => task.findings).join('\n\n') +
  
  // 2. From Wave Summary (if wave > 1)
  '\n\n## Previous Wave Summary\n' + waveSummary +
  
  // 3. From Discoveries (filtered by relevance)
  '\n\n## Relevant Discoveries\n' + relevantDiscoveries
```

---

## Output Schema (Agent Report)

```json
{
  "id": "doc-003",
  "status": "completed",
  "findings": "Identified 4 core components: Parser, Analyzer, Generator, Exporter. Data flows left-to-right with feedback loop for error recovery. Main entry point is src/index.ts.",
  "doc_path": "docs/02-architecture/system-architecture.md",
  "key_discoveries": "[{\"name\":\"Parser\",\"type\":\"component\",\"file\":\"src/parser/index.ts\",\"description\":\"Transforms input to AST\"}]",
  "error": ""
}
```

---

## Validation Rules

| Rule | Check | Error |
|------|-------|-------|
| Unique IDs | No duplicate `id` values | "Duplicate task ID: {id}" |
| Valid deps | All dep IDs exist in task list | "Unknown dependency: {dep_id}" |
| No self-deps | Task cannot depend on itself | "Self-dependency: {id}" |
| No cycles | Topological sort completes | "Circular dependency involving: {ids}" |
| Context valid | All context_from IDs in earlier or same wave | "Invalid context_from: {id}" |
| Valid doc_type | doc_type ∈ enum values | "Invalid doc_type: {type}" |
| Valid priority | priority ∈ {high,medium,low} | "Invalid priority: {priority}" |
| Status enum | status ∈ {pending,completed,failed,skipped} | "Invalid status" |

---

## Wave Summary Schema

Each wave generates a summary file: `wave-summaries/wave-{N}-summary.md`

```markdown
# Wave {N} Summary

**Completed Tasks**: {count}

## By Document Type

### {doc_type}
#### {task.title}
{task.findings (truncated to 300 chars)}

**Key Points**:
- {discovery.name}: {discovery.description}
...

## Context for Wave {N+1}

Next wave will focus on: {next_wave_task_titles}
```
