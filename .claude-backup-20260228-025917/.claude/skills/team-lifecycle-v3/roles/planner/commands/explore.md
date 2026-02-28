# Command: explore

## Purpose

Complexity-driven codebase exploration: assess task complexity, select exploration angles by category, execute parallel exploration agents, and produce structured exploration results for plan generation.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Task description | PLAN-* task subject/description | Yes |
| Session folder | Task description `Session:` field | Yes |
| Spec context | `<session-folder>/spec/` (if exists) | No |
| Plan directory | `<session-folder>/plan/` | Yes (create if missing) |
| Project tech | `.workflow/project-tech.json` | No |

## Phase 3: Exploration

### Complexity Assessment

Score the task description against keyword indicators:

| Indicator | Keywords | Score |
|-----------|----------|-------|
| Structural change | refactor, architect, restructure, modular | +2 |
| Multi-scope | multiple, across, cross-cutting | +2 |
| Integration | integrate, api, database | +1 |
| Non-functional | security, performance, auth | +1 |

**Complexity routing**:

| Score | Level | Strategy | Angle Count |
|-------|-------|----------|-------------|
| 0-1 | Low | ACE semantic search only | 1 |
| 2-3 | Medium | cli-explore-agent per angle | 2-3 |
| 4+ | High | cli-explore-agent per angle | 3-5 |

### Angle Presets

Select preset by dominant keyword match, then take first N angles per complexity:

| Preset | Trigger Keywords | Angles (priority order) |
|--------|-----------------|------------------------|
| architecture | refactor, architect, restructure, modular | architecture, dependencies, modularity, integration-points |
| security | security, auth, permission, access | security, auth-patterns, dataflow, validation |
| performance | performance, slow, optimize, cache | performance, bottlenecks, caching, data-access |
| bugfix | fix, bug, error, issue, broken | error-handling, dataflow, state-management, edge-cases |
| feature | (default) | patterns, integration-points, testing, dependencies |

### Low Complexity: Direct Search

```bash
mcp__ace-tool__search_context(project_root_path="<project-root>", query="<task-description>")
```

Transform results into exploration JSON and write to `<plan-dir>/exploration-<angle>.json`.

**ACE failure fallback**:

```bash
Bash(command="rg -l '<keywords>' --type ts", timeout=30000)
```

### Medium/High Complexity: Parallel Exploration

For each selected angle, launch an exploration agent:

```
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: "Explore: <angle>",
  prompt: "## Task Objective
Execute <angle> exploration for task planning context.

## Output Location
Output File: <plan-dir>/exploration-<angle>.json

## Assigned Context
- Exploration Angle: <angle>
- Task Description: <task-description>
- Spec Context: <available|not available>

## Mandatory First Steps
1. rg -l '<relevant-keyword>' --type ts
2. cat ~/.ccw/workflows/cli-templates/schemas/explore-json-schema.json
3. Read .workflow/project-tech.json (if exists)

## Exploration Focus
<angle-focus-from-table-below>

## Output
Write JSON to: <plan-dir>/exploration-<angle>.json
Each file in relevant_files MUST have: rationale (>10 chars), role, discovery_source, key_symbols"
})
```

### Angle Focus Guide

| Angle | Focus Points |
|-------|-------------|
| architecture | Layer boundaries, design patterns, component responsibilities, ADRs |
| dependencies | Import chains, external libraries, circular dependencies, shared utilities |
| modularity | Module interfaces, separation of concerns, extraction opportunities |
| integration-points | API endpoints, data flow between modules, event systems, service integrations |
| security | Auth/authz logic, input validation, sensitive data handling, middleware |
| auth-patterns | Auth flows (login/refresh), session management, token validation, permissions |
| dataflow | Data transformations, state propagation, validation points, mutation paths |
| performance | Bottlenecks, N+1 queries, blocking operations, algorithm complexity |
| error-handling | Try-catch blocks, error propagation, recovery strategies, logging |
| patterns | Code conventions, design patterns, naming conventions, best practices |
| testing | Test files, coverage gaps, test patterns (unit/integration/e2e), mocking |

### Explorations Manifest

After all explorations complete, write manifest to `<plan-dir>/explorations-manifest.json`:

```
{
  "task_description": "<description>",
  "complexity": "<Low|Medium|High>",
  "exploration_count": <N>,
  "explorations": [
    { "angle": "<angle>", "file": "exploration-<angle>.json" }
  ]
}
```

## Phase 4: Validation

### Output Files

```
<session-folder>/plan/
  ├─ exploration-<angle>.json      (per angle)
  └─ explorations-manifest.json    (summary)
```

### Success Criteria

| Check | Criteria | Required |
|-------|----------|----------|
| At least 1 exploration | Non-empty exploration file exists | Yes |
| Manifest written | explorations-manifest.json exists | Yes |
| File roles assigned | Every relevant_file has role + rationale | Yes |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Single exploration agent fails | Skip angle, remove from manifest, continue |
| All explorations fail | Proceed to plan generation with task description only |
| ACE search fails (Low) | Fallback to ripgrep keyword search |
| Schema file not found | Use inline schema from Output section |
