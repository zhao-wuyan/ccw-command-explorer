# Explore Subagent

Shared codebase exploration for discovering performance-critical code paths, module structures, and optimization opportunities. Results are cached to avoid redundant exploration across profiler and optimizer roles.

## Design Rationale

Codebase exploration is a read-only operation shared between profiler (mapping bottlenecks) and optimizer (understanding implementation context). Caching explorations avoids redundant work when optimizer re-explores paths the profiler already mapped.

## Invocation

Called by profiler, optimizer after needing codebase context for performance analysis or implementation:

```
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: "Explore codebase for performance-critical paths in <target-scope>",
  prompt: `Explore the codebase to identify performance-critical code paths.

Target scope: <target-scope>
Session: <session-folder>
Focus: <exploration-focus>

Tasks:
1. Map the module structure and entry points within scope
2. Identify hot code paths (frequently called functions, critical loops)
3. Find performance-relevant patterns (caching, lazy loading, async, pooling)
4. Note any existing performance optimizations or benchmark harnesses
5. List key files with their roles in the performance-critical path

Output a structured exploration report with:
- Module map (key files and their relationships)
- Hot path analysis (call chains, loop nests, recursive patterns)
- Existing optimization patterns found
- Performance-relevant configuration (caching, pooling, batching settings)
- Recommended investigation targets for profiling`
})
```

## Cache Mechanism

### Cache Index Schema

`<session-folder>/explorations/cache-index.json`:

```json
{
  "entries": [
    {
      "key": "<scope-hash>",
      "scope": "<target-scope>",
      "focus": "<exploration-focus>",
      "timestamp": "<ISO-8601>",
      "result_file": "<hash>.md"
    }
  ]
}
```

### Cache Lookup Rules

| Condition | Action |
|-----------|--------|
| Exact scope+focus match exists | Return cached result from <hash>.md |
| No match | Execute subagent, cache result to <hash>.md, update index |
| Cache file missing but index has entry | Remove stale entry, re-execute |
| Cache older than current session | Use cached (explorations are stable within session) |

## Integration with Calling Role

The calling role is responsible for:

1. **Before calling**: Determine target scope and exploration focus
2. **Calling**: Check cache first, invoke subagent only on cache miss
3. **After calling**:

| Result | Action |
|--------|--------|
| Exploration successful | Use findings to inform profiling/implementation |
| Exploration partial | Use available findings, note gaps |
| Exploration failed | Proceed without exploration context, use direct file reading |

## Output Schema

```json
{
  "scope": "<target-scope>",
  "module_map": [
    { "file": "<path>", "role": "<description>", "hot_path": true }
  ],
  "hot_paths": [
    { "chain": "<call-chain>", "frequency": "<high|medium|low>", "files": ["<path>"] }
  ],
  "existing_optimizations": [
    { "type": "<pattern>", "location": "<file:line>", "description": "<what>" }
  ],
  "investigation_targets": ["<file-or-pattern>"]
}
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Single exploration angle fails | Continue with partial results |
| All exploration fails | Return basic result from direct file listing |
| Target scope not found | Return error immediately |
| Cache corrupt | Clear cache-index.json, re-execute |
