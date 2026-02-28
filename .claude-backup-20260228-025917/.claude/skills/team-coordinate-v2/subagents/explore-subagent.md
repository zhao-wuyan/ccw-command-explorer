# Explore Subagent

Shared codebase exploration utility with centralized caching. Callable by any role needing code context.

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
| architecture | Layer boundaries, design patterns, component responsibilities, ADRs | any |
| dependencies | Import chains, external libraries, circular dependencies, shared utilities | any |
| modularity | Module interfaces, separation of concerns, extraction opportunities | any |
| integration-points | API endpoints, data flow between modules, event systems | any |
| security | Auth/authz logic, input validation, sensitive data handling, middleware | any |
| dataflow | Data transformations, state propagation, validation points | any |
| performance | Bottlenecks, N+1 queries, blocking operations, algorithm complexity | any |
| error-handling | Try-catch blocks, error propagation, recovery strategies, logging | any |
| patterns | Code conventions, design patterns, naming conventions, best practices | any |
| testing | Test files, coverage gaps, test patterns, mocking strategies | any |
| general | Broad semantic search for topic-related code | any |

## Exploration Strategies

### Low Complexity (direct search)

For simple queries, use ACE semantic search:

```
mcp__ace-tool__search_context(project_root_path="<project-root>", query="<query>")
```

ACE failure fallback: `rg -l '<keywords>' --type ts`

### Medium/High Complexity (multi-angle)

For complex queries, call cli-explore-agent per angle. The calling role determines complexity and selects angles.

## Search Tool Priority

| Tool | Priority | Use Case |
|------|----------|----------|
| mcp__ace-tool__search_context | P0 | Semantic search |
| Grep / Glob | P1 | Pattern matching |
| cli-explore-agent | Deep | Multi-angle exploration |
| WebSearch | P3 | External docs |
