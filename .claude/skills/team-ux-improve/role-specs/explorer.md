---
prefix: EXPLORE
inner_loop: false
message_types:
  success: explore_complete
  error: error
---

# Codebase Explorer

Explore codebase for UI component patterns, state management conventions, and framework-specific patterns. Callable by coordinator only.

## Phase 2: Exploration Scope

1. Parse exploration request from task description
2. Determine file patterns based on framework:

### Wisdom Input

1. Read `<session>/wisdom/patterns/ui-feedback.md` and `<session>/wisdom/patterns/state-management.md` if available
2. Use known patterns as reference when exploring codebase for component structures
3. Check `<session>/wisdom/anti-patterns/common-ux-pitfalls.md` to identify problematic patterns during exploration

| Framework | Patterns |
|-----------|----------|
| React | `**/*.tsx`, `**/*.jsx`, `**/use*.ts`, `**/store*.ts` |
| Vue | `**/*.vue`, `**/composables/*.ts`, `**/stores/*.ts` |

3. Check exploration cache: `<session>/explorations/cache-index.json`
   - If cache hit and fresh -> return cached results
   - If cache miss or stale -> proceed to Phase 3

## Phase 3: Codebase Exploration

Use ACE search for semantic queries:

```
mcp__ace-tool__search_context(
  project_root_path="<project-path>",
  query="<exploration-query>"
)
```

Exploration dimensions:

| Dimension | Query | Purpose |
|-----------|-------|---------|
| Component patterns | "UI components with user interactions" | Find interactive components |
| State management | "State management patterns useState ref reactive" | Identify state conventions |
| Event handling | "Event handlers onClick onChange onSubmit" | Map event patterns |
| Error handling | "Error handling try catch error state" | Find error patterns |
| Feedback mechanisms | "Loading state spinner progress indicator" | Find existing feedback |

For each dimension, collect:
- File paths
- Pattern examples
- Convention notes

## Phase 4: Exploration Summary

1. Generate pattern summary:

```markdown
# Exploration Summary

## Framework: React/Vue

## Component Patterns
- Button components use <pattern>
- Form components use <pattern>

## State Management Conventions
- Global state: Zustand/Pinia
- Local state: useState/ref
- Async state: custom hooks/composables

## Event Handling Patterns
- Form submit: <pattern>
- Button click: <pattern>

## Existing Feedback Mechanisms
- Loading: <pattern>
- Error: <pattern>
- Success: <pattern>
```

2. Cache results to `<session>/explorations/cache-index.json`
3. Write summary to `<session>/explorations/exploration-summary.md`

### Wisdom Contribution

If new component patterns or framework conventions discovered:
1. Write pattern summaries to `<session>/wisdom/contributions/explorer-patterns-<timestamp>.md`
2. Format:
   - Pattern Name: Descriptive name
   - Framework: React/Vue/etc.
   - Use Case: When to apply this pattern
   - Code Example: Representative snippet
   - Adoption: How widely used in codebase

4. Share state via team_msg:
   ```
   team_msg(operation="log", session_id=<session-id>, from="explorer",
            type="state_update", data={
              framework: <framework>,
              components_found: <count>,
              patterns_identified: [<pattern-list>]
            })
   ```
