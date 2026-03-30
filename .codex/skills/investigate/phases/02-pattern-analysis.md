# Phase 2: Pattern Analysis

> **COMPACT PROTECTION**: This is a core execution phase. If context compression has occurred and this file is only a summary, **MUST `Read` this file again before executing any Step**. Do not execute from memory.

Search for similar patterns in the codebase to determine if the bug is isolated or systemic.

## Objective

- Search for similar error patterns, antipatterns, or code smells across the codebase
- Determine if the bug is an isolated incident or part of a systemic issue
- Identify related code that may be affected by the same root cause
- Refine the scope of the investigation

## Input

| Source | Required | Description |
|--------|----------|-------------|
| investigation-report (phase 1) | Yes | Evidence, affected files, affected modules, initial diagnosis suspects |
| assign_task message | Yes | Phase 2 instruction |

## Execution Steps

### Step 1: Search for Similar Error Patterns

Search for the same error type or message elsewhere in the codebase:

1. Grep for identical or similar error message fragments in `src/` with 3 lines of context.
2. Grep for the same exception class or error code — output mode: files with matches.
3. Grep for similar error handling patterns in the same module.

**Decision table**:

| Result | Action |
|--------|--------|
| Similar patterns found in same module | Note as module-wide indicator, continue |
| Similar patterns found across multiple modules | Note as systemic indicator, continue |
| No similar patterns found | Note as isolated indicator, continue |

---

### Step 2: Search for the Same Antipattern

If the Phase 1 initial diagnosis identified a coding antipattern, search for it globally:

**Common antipattern examples to search for**:

| Antipattern | Grep pattern style |
|-------------|-------------------|
| Missing null/undefined check | `variable\.property` without guard |
| Unchecked async operation | unhandled promise, missing await |
| Direct mutation of shared state | shared state write without lock |
| Type assumption violation | forced cast without validation |

Execute at least one targeted Grep for the identified antipattern across relevant source directories.

**Decision table**:

| Result | Action |
|--------|--------|
| Antipattern found in multiple files | Classify as module-wide or systemic candidate |
| Antipattern isolated to one location | Classify as isolated candidate |
| No antipattern identifiable | Proceed without antipattern classification |

---

### Step 3: Module-Level Analysis

Examine the affected module for structural issues:

1. Use Glob to list all files in the affected module directory.
2. Grep for imports from the affected module to understand its consumers.
3. Check for circular dependencies or unusual import patterns.

---

### Step 4: CLI Cross-File Pattern Analysis (Optional)

For complex patterns that span many files, use inline-cli-analysis subagent:

```
spawn_agent({
  task_name: "inline-cli-analysis",
  fork_context: false,
  model: "haiku",
  reasoning_effort: "medium",
  message: `### MANDATORY FIRST STEPS
1. Read: ~/.codex/agents/cli-explore-agent.md

PURPOSE: Identify all instances of antipattern across codebase; success = complete scope map
TASK: Search for pattern '<antipattern_description>' | Map all occurrences | Assess systemic risk
MODE: analysis
CONTEXT: @src/**/*.<ext> | Bug in <module>, pattern: <pattern_description>
EXPECTED: List of all files with same pattern, risk assessment per occurrence (same_bug|potential_bug|safe)
CONSTRAINTS: Focus on <antipattern> pattern only | Ignore test files for scope`
})
const patternResult = wait_agent({ targets: ["inline-cli-analysis"], timeout_ms: 180000 })
close_agent({ target: "inline-cli-analysis" })
```

**Decision table**:

| Condition | Action |
|-----------|--------|
| Pattern spans >3 files in >1 module | Use subagent for full scope map |
| Pattern confined to 1 module | Skip subagent, proceed with manual search results |
| Subagent timeout | Continue with manual search results |

---

### Step 5: Classify Scope and Assemble Pattern Analysis

Classify the bug scope based on all search findings:

**Scope Definitions**:

| Scope | Definition |
|-------|-----------|
| `isolated` | Bug exists in a single location; no similar patterns found elsewhere |
| `module-wide` | Same pattern exists in multiple files within the same module |
| `systemic` | Pattern spans multiple modules; may require broader fix |

Assemble `pattern_analysis` section and add to investigation-report:

```
pattern_analysis = {
  scope: "isolated|module-wide|systemic",
  similar_occurrences: [
    {
      file: "<path/to/file.ts>",
      line: <line number>,
      pattern: "<description of similar pattern>",
      risk: "same_bug|potential_bug|safe"
    }
  ],
  total_occurrences: <count>,
  affected_modules: ["<module-name>"],
  antipattern_identified: "<description or null>",
  scope_justification: "<evidence-based reasoning for this scope classification>"
}
```

**Scope decision table**:

| Scope | Phase 3 Focus |
|-------|--------------|
| isolated | Narrow hypothesis scope to single location |
| module-wide | Note all occurrences for Phase 4 fix planning |
| systemic | Note for potential multi-location fix; flag for separate tracking |

Output Phase 2 summary and await assign_task for Phase 3.

---

## Output

| Artifact | Format | Description |
|----------|--------|-------------|
| investigation-report (phase 2) | In-memory JSON | Phase 1 fields + pattern_analysis section added |
| Phase 2 summary | Structured text output | Scope classification with justification, await Phase 3 |

## Success Criteria

| Criterion | Validation Method |
|-----------|-------------------|
| At least 3 search queries executed | Count of Grep/Glob operations performed |
| Scope classified | pattern_analysis.scope is one of: isolated, module-wide, systemic |
| Similar occurrences documented | pattern_analysis.similar_occurrences populated (empty array acceptable for isolated) |
| Scope justification provided | pattern_analysis.scope_justification non-empty with evidence |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No source directory found | Search from project root, document uncertainty |
| Grep returns too many results | Narrow pattern, add path filter, take top 10 most relevant |
| inline-cli-analysis timeout | Continue with manual search results, log warning |
| Antipattern not identifiable from Phase 1 | Skip Step 2 antipattern search, proceed with error pattern search only |

## Next Phase

-> [Phase 3: Hypothesis Testing](03-hypothesis-testing.md)
