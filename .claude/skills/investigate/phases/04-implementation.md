# Phase 4: Implementation

Implement the minimal fix and add a regression test. Iron Law gate enforced.

## Objective

- Verify Iron Law gate: confirmed root cause MUST exist from Phase 3
- Implement the minimal fix that addresses the confirmed root cause
- Add a regression test that fails without the fix and passes with it
- Verify the fix resolves the original reproduction case

## Iron Law Gate Check

**MANDATORY**: Before any code modification, verify:

```javascript
if (!investigation_report.confirmed_root_cause) {
  // VIOLATION: Cannot proceed without confirmed root cause
  // Return to Phase 3 or escalate
  throw new Error("Iron Law violation: No confirmed root cause. Return to Phase 3.")
}

console.log(`Root cause confirmed: ${investigation_report.confirmed_root_cause.description}`)
console.log(`Evidence chain: ${investigation_report.confirmed_root_cause.evidence_chain.length} items`)
console.log(`Affected code: ${investigation_report.confirmed_root_cause.affected_code.file}:${investigation_report.confirmed_root_cause.affected_code.line_range}`)
```

If the gate check fails, do NOT proceed. Return status **BLOCKED** with reason "Iron Law: no confirmed root cause".

## Execution Steps

### Step 1: Plan the Minimal Fix

Define the fix scope BEFORE writing any code:

```json
{
  "fix_plan": {
    "description": "What the fix does and why",
    "changes": [
      {
        "file": "path/to/file.ts",
        "change_type": "modify|add|remove",
        "description": "specific change description",
        "lines_affected": "42-45"
      }
    ],
    "total_files_changed": 1,
    "total_lines_changed": "estimated"
  }
}
```

**Minimal Fix Rules** (from [specs/iron-law.md](../specs/iron-law.md)):
- Change only what is necessary to fix the confirmed root cause
- Do not refactor surrounding code
- Do not add features
- Do not change formatting or style of unrelated code
- If the fix requires changes to more than 3 files, document justification

### Step 2: Implement the Fix

Apply the planned changes using `Edit` tool:

```javascript
Edit({
  file_path: "path/to/affected/file.ts",
  old_string: "buggy code",
  new_string: "fixed code"
})
```

### Step 3: Add Regression Test

Create or modify a test that:
1. **Fails** without the fix (tests the exact bug condition)
2. **Passes** with the fix

```javascript
// Identify existing test file for the module
Glob({ pattern: "**/*.test.{ts,js,py}" })
// or
Glob({ pattern: "**/test_*.py" })

// Add regression test
// Test name should reference the bug: "should handle null return from X"
// Test should exercise the exact code path that caused the bug
```

**Regression test requirements**:
- Test name clearly describes the bug scenario
- Test exercises the specific code path identified in root cause
- Test is deterministic (no flaky timing, external dependencies)
- Test is placed in the appropriate test file for the module

### Step 4: Verify Fix Against Reproduction

Re-run the original reproduction case from Phase 1:

```bash
# Run the specific failing test/command from Phase 1
# It should now pass
```

Record the verification result:

```json
{
  "phase": 4,
  "fix_applied": {
    "description": "what was fixed",
    "files_changed": ["path/to/file.ts"],
    "lines_changed": 3,
    "regression_test": {
      "file": "path/to/test.ts",
      "test_name": "should handle null return from X",
      "status": "added|modified"
    },
    "reproduction_verified": true
  }
}
```

## Output

- **Data**: `fix_applied` section added to investigation report (in-memory)
- **Artifacts**: Modified source files and test files

## Quality Checks

- [ ] Iron Law gate passed: confirmed root cause exists
- [ ] Fix is minimal: only necessary changes made
- [ ] Regression test added that covers the specific bug
- [ ] Original reproduction case passes with the fix
- [ ] No unrelated code changes included

## Next Phase

Proceed to [Phase 5: Verification & Report](05-verification-report.md) to run full test suite and generate report.
