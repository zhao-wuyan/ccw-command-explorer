# Explore Subagent

Shared codebase exploration for discovering architecture-critical structures, dependency graphs, module boundaries, and layer organization. Results are cached to avoid redundant exploration across analyzer and refactorer roles.

## Design Rationale

Codebase exploration is a read-only operation shared between analyzer (mapping structural issues) and refactorer (understanding implementation context). Caching explorations avoids redundant work when refactorer re-explores structures the analyzer already mapped.

## Invocation

Called by analyzer, refactorer after needing codebase context for architecture analysis or implementation:

```
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: "Explore codebase for architecture-critical structures in <target-scope>",
  prompt: `Explore the codebase to identify architecture-critical structures.

Target scope: <target-scope>
Session: <session-folder>
Focus: <exploration-focus>

Tasks:
1. Map the module structure, entry points, and layer boundaries within scope
2. Build dependency graph (import/require relationships between modules)
3. Identify architectural patterns (layering, dependency injection, event-driven, plugin architecture)
4. Note any existing abstractions, interfaces, and module boundaries
5. List key files with their roles, layer assignment, and dependency relationships

Output a structured exploration report with:
- Module map (key files, their relationships, and layer assignments)
- Dependency graph (directed edges between modules, cycle indicators)
- Layer structure (identified layers and their boundaries)
- Existing architectural patterns found
- Architecture-relevant configuration (path aliases, barrel exports, module boundaries)`
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
| Exploration successful | Use findings to inform analysis/implementation |
| Exploration partial | Use available findings, note gaps |
| Exploration failed | Proceed without exploration context, use direct file reading |

## Output Schema

```json
{
  "scope": "<target-scope>",
  "module_map": [
    { "file": "<path>", "role": "<description>", "layer": "<presentation|domain|data|infra>", "dependency_graph": { "imports": ["<path>"], "imported_by": ["<path>"] } }
  ],
  "dependency_graph": {
    "nodes": ["<module-path>"],
    "edges": [{ "from": "<path>", "to": "<path>", "type": "<import|re-export|dynamic>" }],
    "cycles": [["<path-a>", "<path-b>", "<path-a>"]]
  },
  "layer_structure": [
    { "layer": "<name>", "modules": ["<path>"], "violations": ["<description>"] }
  ],
  "existing_patterns": [
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
