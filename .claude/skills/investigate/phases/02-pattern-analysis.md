# Phase 2: Pattern Analysis

Search for similar patterns in the codebase to determine if the bug is isolated or systemic.

## Objective

- Search for similar error patterns, antipatterns, or code smells across the codebase
- Determine if the bug is an isolated incident or part of a systemic issue
- Identify related code that may be affected by the same root cause
- Refine the scope of the investigation

## Execution Steps

### Step 1: Search for Similar Error Patterns

Look for the same error type or message elsewhere in the codebase:

```javascript
// Search for identical or similar error messages
Grep({ pattern: "error_message_fragment", path: "src/", output_mode: "content", context: 3 })

// Search for the same exception/error type
Grep({ pattern: "ErrorClassName|error_code", path: "src/", output_mode: "files_with_matches" })

// Search for similar error handling patterns
Grep({ pattern: "catch.*{similar_pattern}", path: "src/", output_mode: "content" })
```

### Step 2: Search for Same Antipattern

If the initial diagnosis suggests a coding antipattern, search for it globally:

```javascript
// Examples of antipattern searches:
// Missing null checks
Grep({ pattern: "variable\\.property", path: "src/", glob: "*.ts" })

// Unchecked async operations
Grep({ pattern: "async.*without.*await", path: "src/" })

// Direct mutation of shared state
Grep({ pattern: "shared_state_pattern", path: "src/" })
```

### Step 3: Module-Level Analysis

Examine the affected module for structural issues:

```javascript
// List all files in the affected module
Glob({ pattern: "src/affected-module/**/*" })

// Check imports and dependencies
Grep({ pattern: "import.*from.*affected-module", path: "src/" })

// Check for circular dependencies or unusual patterns
Grep({ pattern: "require.*affected-module", path: "src/" })
```

### Step 4: CLI Cross-File Pattern Analysis (Optional)

For complex patterns that span multiple files, use CLI analysis:

```bash
ccw cli -p "PURPOSE: Identify all instances of antipattern across codebase; success = complete scope map
TASK: Search for pattern '{antipattern_description}' | Map all occurrences | Assess systemic risk
MODE: analysis
CONTEXT: @src/**/*.{ext} | Bug in {module}, pattern: {pattern_description}
EXPECTED: List of all files with same pattern, risk assessment per occurrence
CONSTRAINTS: Focus on {antipattern} pattern only | Ignore test files for scope" \
  --tool gemini --mode analysis
```

### Step 5: Scope Assessment

Classify the bug scope based on findings:

```json
{
  "phase": 2,
  "pattern_analysis": {
    "scope": "isolated|module-wide|systemic",
    "similar_occurrences": [
      {
        "file": "path/to/file.ts",
        "line": 42,
        "pattern": "description of similar pattern",
        "risk": "same_bug|potential_bug|safe"
      }
    ],
    "total_occurrences": 1,
    "affected_modules": ["module-name"],
    "antipattern_identified": "description or null",
    "scope_justification": "why this scope classification"
  }
}
```

**Scope Definitions**:
- **isolated**: Bug exists in a single location, no similar patterns found
- **module-wide**: Same pattern exists in multiple files within the same module
- **systemic**: Pattern spans multiple modules, may require broader fix

## Output

- **Data**: `pattern-analysis` section added to investigation report (in-memory)
- **Format**: JSON structure as defined above

## Decision Point

| Scope | Action |
|-------|--------|
| isolated | Proceed to Phase 3 with narrow focus |
| module-wide | Proceed to Phase 3, note all occurrences for Phase 4 fix |
| systemic | Proceed to Phase 3, but flag for potential multi-phase fix or separate tracking |

## Quality Checks

- [ ] At least 3 search queries executed against the codebase
- [ ] Scope classified as isolated, module-wide, or systemic
- [ ] Similar occurrences documented with file:line references
- [ ] Scope justification provided with evidence

## Next Phase

Proceed to [Phase 3: Hypothesis Testing](03-hypothesis-testing.md) with the pattern analysis results.
