# Phase 1: Root Cause Investigation

Reproduce the bug and collect all available evidence before forming any theories.

## Objective

- Reproduce the bug with concrete, observable symptoms
- Collect all evidence: error messages, logs, stack traces, affected files
- Establish a baseline understanding of what goes wrong and where
- Use CLI analysis for initial diagnosis

## Execution Steps

### Step 1: Understand the Bug Report

Parse the user's description to extract:
- **Symptom**: What observable behavior is wrong?
- **Expected**: What should happen instead?
- **Context**: When/where does it occur? (specific input, environment, timing)

```javascript
const bugReport = {
  symptom: "extracted from user description",
  expected_behavior: "what should happen",
  context: "when/where it occurs",
  user_provided_files: ["files mentioned by user"],
  user_provided_errors: ["error messages provided"]
}
```

### Step 2: Reproduce the Bug

Attempt to reproduce using the most direct method available:

1. **Run the failing test** (if one exists):
   ```bash
   # Identify and run the specific failing test
   ```

2. **Run the failing command** (if CLI/script):
   ```bash
   # Execute the command that triggers the bug
   ```

3. **Read error-producing code path** (if reproduction requires complex setup):
   - Use `Grep` to find the error message in source code
   - Use `Read` to trace the code path that produces the error
   - Document the theoretical reproduction path

**If reproduction fails**: Document what was attempted. The investigation can continue with static analysis, but note this as a concern.

### Step 3: Collect Evidence

Gather all available evidence using project tools:

```javascript
// 1. Find error messages in source
Grep({ pattern: "error message text", path: "src/" })

// 2. Find related log output
Grep({ pattern: "relevant log pattern", path: "." })

// 3. Read stack trace files or test output
Read({ file_path: "path/to/failing-test-output" })

// 4. Identify affected files and modules
Glob({ pattern: "**/*relevant-module*" })
```

### Step 4: Initial Diagnosis via CLI Analysis

Use `ccw cli` for a broader diagnostic perspective:

```bash
ccw cli -p "PURPOSE: Diagnose root cause of bug from collected evidence
TASK: Analyze error context | Trace data flow | Identify suspicious code patterns
MODE: analysis
CONTEXT: @{affected_files} | Evidence: {error_messages_and_traces}
EXPECTED: Top 3 likely root causes ranked by evidence strength
CONSTRAINTS: Read-only analysis | Focus on {affected_module}" \
  --tool gemini --mode analysis
```

### Step 5: Write Investigation Report

Generate `investigation-report.json` in memory (carried to next phase):

```json
{
  "phase": 1,
  "bug_description": "concise description of the bug",
  "reproduction": {
    "reproducible": true,
    "steps": [
      "step 1: ...",
      "step 2: ...",
      "step 3: observe error"
    ],
    "reproduction_method": "test|command|static_analysis"
  },
  "evidence": {
    "error_messages": ["exact error text"],
    "stack_traces": ["relevant stack trace"],
    "affected_files": ["file1.ts", "file2.ts"],
    "affected_modules": ["module-name"],
    "log_output": ["relevant log lines"]
  },
  "initial_diagnosis": {
    "cli_tool_used": "gemini",
    "top_suspects": [
      { "description": "suspect 1", "evidence_strength": "strong|moderate|weak", "files": [] }
    ]
  }
}
```

## Output

- **Data**: `investigation-report` (in-memory, passed to Phase 2)
- **Format**: JSON structure as defined above

## Quality Checks

- [ ] Bug symptom clearly documented
- [ ] Reproduction attempted (success or documented failure)
- [ ] At least one piece of concrete evidence collected (error message, stack trace, or failing test)
- [ ] Affected files identified
- [ ] Initial diagnosis generated

## Next Phase

Proceed to [Phase 2: Pattern Analysis](02-pattern-analysis.md) with the investigation report.
