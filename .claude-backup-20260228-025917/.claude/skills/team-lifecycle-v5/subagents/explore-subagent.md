# Explore Subagent

Shared codebase exploration utility with centralized caching. Callable by any role needing code context. Replaces v3's standalone explorer role.

## Design Rationale

In v3, exploration happened in 3 separate places:
- `analyst` Phase 3: ACE semantic search for architecture patterns
- `planner` Phase 2: multi-angle cli-explore-agent
- `explorer` role: standalone service with full spawn cycle

Results were scattered across different directories and never shared. In v4, all exploration routes through this subagent with a **unified cache** in `explorations/`.

## Invocation

```
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: "Explore <angle>",
  prompt: `Explore codebase for: <query>

Focus angle: <angle>
Keywords: <keyword-list>
Session folder: <session-folder>

## Cache Check
1. Read <session-folder>/explorations/cache-index.json (if exists)
2. Look for entry with matching angle
3. If found AND file exists -> read cached result, return summary
4. If not found -> proceed to exploration

## Exploration
<angle-specific-focus-from-table-below>

## Output
Write JSON to: <session-folder>/explorations/explore-<angle>.json
Update cache-index.json with new entry

## Output Schema
{
  "angle": "<angle>",
  "query": "<query>",
  "relevant_files": [
    { "path": "...", "rationale": "...", "role": "...", "discovery_source": "...", "key_symbols": [] }
  ],
  "patterns": [],
  "dependencies": [],
  "external_refs": [],
  "_metadata": { "created_by": "<calling-role>", "timestamp": "...", "cache_key": "..." }
}

Return summary: file count, pattern count, top 5 files, output path`
})
```

## Cache Mechanism

### Cache Index Schema

`<session-folder>/explorations/cache-index.json`:

```json
{
  "entries": [
    {
      "angle": "architecture",
      "keywords": ["auth", "middleware"],
      "file": "explore-architecture.json",
      "created_by": "analyst",
      "created_at": "2026-02-27T10:00:00Z",
      "file_count": 15
    }
  ]
}
```

### Cache Lookup Rules

| Condition | Action |
|-----------|--------|
| Exact angle match exists | Return cached result |
| No match | Execute exploration, cache result |
| Cache file missing but index has entry | Remove stale entry, re-explore |

### Cache Invalidation

Cache is session-scoped. No explicit invalidation needed -- each session starts fresh. If a role suspects stale data, it can pass `force_refresh: true` in the prompt to bypass cache.

## Angle Focus Guide

| Angle | Focus Points | Typical Caller |
|-------|-------------|----------------|
| architecture | Layer boundaries, design patterns, component responsibilities, ADRs | analyst, planner |
| dependencies | Import chains, external libraries, circular dependencies, shared utilities | planner |
| modularity | Module interfaces, separation of concerns, extraction opportunities | planner |
| integration-points | API endpoints, data flow between modules, event systems | analyst, planner |
| security | Auth/authz logic, input validation, sensitive data handling, middleware | planner |
| auth-patterns | Auth flows, session management, token validation, permissions | planner |
| dataflow | Data transformations, state propagation, validation points | planner |
| performance | Bottlenecks, N+1 queries, blocking operations, algorithm complexity | planner |
| error-handling | Try-catch blocks, error propagation, recovery strategies, logging | planner |
| patterns | Code conventions, design patterns, naming conventions, best practices | analyst, planner |
| testing | Test files, coverage gaps, test patterns, mocking strategies | planner |
| general | Broad semantic search for topic-related code | analyst |

## Exploration Strategies

### Low Complexity (direct search)

For simple queries, use ACE semantic search:

```
mcp__ace-tool__search_context(project_root_path="<project-root>", query="<query>")
```

ACE failure fallback: `rg -l '<keywords>' --type ts`

### Medium/High Complexity (multi-angle)

For complex queries, call cli-explore-agent per angle. The calling role determines complexity and selects angles (see planner's `commands/explore.md`).

## Search Tool Priority

| Tool | Priority | Use Case |
|------|----------|----------|
| mcp__ace-tool__search_context | P0 | Semantic search |
| Grep / Glob | P1 | Pattern matching |
| cli-explore-agent | Deep | Multi-angle exploration |
| WebSearch | P3 | External docs |

## Integration with Roles

### analyst (RESEARCH-001)

```
# After seed analysis, explore codebase context
Task({
  subagent_type: "cli-explore-agent",
  description: "Explore general context",
  prompt: "Explore codebase for: <topic>\nFocus angle: general\n..."
})
# Result feeds into discovery-context.json
```

### planner (PLAN-001)

```
# Multi-angle exploration before plan generation
for angle in selected_angles:
  Task({
    subagent_type: "cli-explore-agent",
    description: "Explore <angle>",
    prompt: "Explore codebase for: <task>\nFocus angle: <angle>\n..."
  })
# Explorations manifest built from cache-index.json
```

### Any role needing context

Any role can call explore subagent when needing codebase context for better decisions.

## Comparison with v3

| Aspect | v3 (explorer role) | v4 (explore subagent) |
|--------|-------------------|----------------------|
| Identity | Full team member | Utility subagent |
| Task creation | Coordinator creates EXPLORE-* tasks | No tasks, direct call |
| Spawn overhead | Full agent lifecycle | Subagent call (~5s) |
| Result sharing | Isolated in explorations/ | Shared cache with index |
| Caller | Only via coordinator dispatch | Any role directly |
| Duplication | analyst + planner + explorer all explore | Single cached path |
