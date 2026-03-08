---
role: explorer
prefix: EXPLORE
inner_loop: false
message_types:
  success: exploration_ready
  error: error
---

# Codebase Explorer

Explore codebase structure through cli-explore-agent, collecting structured context (files, patterns, findings) for downstream analysis. One explorer per analysis perspective.

## Phase 2: Context & Scope Assessment

| Input | Source | Required |
|-------|--------|----------|
| Task description | From task subject/description | Yes |
| Session path | Extracted from task description | Yes |

1. Extract session path, topic, perspective, dimensions from task description:

| Field | Pattern | Default |
|-------|---------|---------|
| sessionFolder | `session:\s*(.+)` | required |
| topic | `topic:\s*(.+)` | required |
| perspective | `perspective:\s*(.+)` | "general" |
| dimensions | `dimensions:\s*(.+)` | "general" |

2. Determine exploration number from task subject (EXPLORE-N)
3. Build exploration strategy by perspective:

| Perspective | Focus | Search Depth |
|-------------|-------|-------------|
| general | Overall codebase structure and patterns | broad |
| technical | Implementation details, code patterns, feasibility | medium |
| architectural | System design, module boundaries, interactions | broad |
| business | Business logic, domain models, value flows | medium |
| domain_expert | Domain patterns, standards, best practices | deep |

## Phase 3: Codebase Exploration

Use CLI tool for codebase exploration:

```javascript
Bash({
  command: `ccw cli -p "PURPOSE: Explore codebase for <topic> from <perspective> perspective; success = structured findings with relevant files and patterns
TASK: • Run module depth analysis • Search for topic-related patterns • Identify key files and their relationships • Extract architectural insights
MODE: analysis
CONTEXT: @**/* | Memory: Session <session-folder>, perspective <perspective>
EXPECTED: JSON output with: relevant_files (path, relevance, summary), patterns, key_findings, module_map, questions_for_analysis, _metadata (perspective, search_queries, timestamp)
CONSTRAINTS: Focus on <perspective> angle - <strategy.focus> | Write to <session>/explorations/exploration-<num>.json
" --tool gemini --mode analysis --rule analysis-analyze-code-patterns`,
  run_in_background: false
})
```

**ACE fallback** (when CLI produces no output):
```javascript
mcp__ace-tool__search_context({ project_root_path: ".", query: "<topic> <perspective>" })
```

## Phase 4: Result Validation

| Check | Method | Action on Failure |
|-------|--------|-------------------|
| Output file exists | Read output path | Create empty result, run ACE fallback |
| Has relevant_files | Array length > 0 | Trigger ACE supplementary search |
| Has key_findings | Array length > 0 | Note partial results, proceed |

Write validated exploration to `<session>/explorations/exploration-<num>.json`.

Update `<session>/wisdom/.msg/meta.json` under `explorer` namespace:
- Read existing -> merge `{ "explorer": { perspective, file_count, finding_count } }` -> write back
