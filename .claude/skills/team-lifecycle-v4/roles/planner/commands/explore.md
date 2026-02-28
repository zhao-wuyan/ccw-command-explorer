# Command: explore

## Purpose

Complexity-driven codebase exploration using shared explore subagent with centralized cache. v4 optimized: checks cache before exploring, avoids duplicate work across roles.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Task description | PLAN-* task subject/description | Yes |
| Session folder | Task description `Session:` field | Yes |
| Spec context | `<session-folder>/spec/` (if exists) | No |
| Plan directory | `<session-folder>/plan/` | Yes (create if missing) |
| Project tech | `.workflow/project-tech.json` | No |
| Cache index | `<session-folder>/explorations/cache-index.json` | No (create if missing) |

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
| 2-3 | Medium | Explore subagent per angle | 2-3 |
| 4+ | High | Explore subagent per angle | 3-5 |

### Angle Presets

Select preset by dominant keyword match, then take first N angles per complexity:

| Preset | Trigger Keywords | Angles (priority order) |
|--------|-----------------|------------------------|
| architecture | refactor, architect, restructure, modular | architecture, dependencies, modularity, integration-points |
| security | security, auth, permission, access | security, auth-patterns, dataflow, validation |
| performance | performance, slow, optimize, cache | performance, bottlenecks, caching, data-access |
| bugfix | fix, bug, error, issue, broken | error-handling, dataflow, state-management, edge-cases |
| feature | (default) | patterns, integration-points, testing, dependencies |

### Cache-First Strategy (v4 new)

Before launching any exploration, check the shared cache:

```
1. Read <session-folder>/explorations/cache-index.json
2. For each selected angle:
   a. If angle exists in cache -> SKIP (reuse cached result)
   b. If angle not in cache -> explore via subagent
3. Only explore uncached angles
```

This avoids duplicating work done by analyst's `general` exploration or any prior role.

### Low Complexity: Direct Search

```bash
mcp__ace-tool__search_context(project_root_path="<project-root>", query="<task-description>")
```

Transform results into exploration JSON and write to `<session-folder>/explorations/explore-general.json`.
Update cache-index.json.

**ACE failure fallback**:

```bash
Bash(command="rg -l '<keywords>' --type ts", timeout=30000)
```

### Medium/High Complexity: Explore Subagent per Angle

For each uncached angle, call the shared explore subagent:

```
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: "Explore: <angle>",
  prompt: "Explore codebase for: <task-description>
Focus angle: <angle>
Keywords: <relevant-keywords>
Session folder: <session-folder>

## Cache Check
1. Read <session-folder>/explorations/cache-index.json (if exists)
2. Look for entry with matching angle
3. If found AND file exists -> read cached result, return summary
4. If not found -> proceed to exploration

## Exploration Focus
<angle-focus-from-table-below>

## Output
Write JSON to: <session-folder>/explorations/explore-<angle>.json
Update cache-index.json with new entry
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

After all explorations complete (both cached and new), write manifest to `<session-folder>/plan/explorations-manifest.json`:

```json
{
  "task_description": "<description>",
  "complexity": "<Low|Medium|High>",
  "exploration_count": "<N>",
  "cached_count": "<M>",
  "explorations": [
    { "angle": "<angle>", "file": "../explorations/explore-<angle>.json", "source": "cached|new" }
  ]
}
```

## Phase 4: Validation

### Output Files

```
<session-folder>/explorations/           (shared cache)
  +- cache-index.json                    (updated)
  +- explore-<angle>.json                (per angle)

<session-folder>/plan/
  +- explorations-manifest.json          (summary referencing shared cache)
```

### Success Criteria

| Check | Criteria | Required |
|-------|----------|----------|
| At least 1 exploration | Non-empty exploration file exists | Yes |
| Manifest written | explorations-manifest.json exists | Yes |
| File roles assigned | Every relevant_file has role + rationale | Yes |
| Cache updated | cache-index.json reflects all explorations | Yes |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Single exploration agent fails | Skip angle, remove from manifest, continue |
| All explorations fail | Proceed to plan generation with task description only |
| ACE search fails (Low) | Fallback to ripgrep keyword search |
| Schema file not found | Use inline schema from Output section |
| Cache index corrupt | Reset cache-index.json to empty, re-explore all |
