# Phase 4: Implementation

> **COMPACT PROTECTION**: This is a core execution phase. If context compression has occurred and this file is only a summary, **MUST `Read` this file again before executing any Step**. Do not execute from memory.

Implement the minimal fix and add a regression test. Iron Law gate enforced at entry.

## Objective

- Verify Iron Law gate: confirmed root cause MUST exist from Phase 3
- Implement the minimal fix that addresses the confirmed root cause
- Add a regression test that fails without the fix and passes with it
- Verify the fix resolves the original reproduction case

## Input

| Source | Required | Description |
|--------|----------|-------------|
| investigation-report (phase 3) | Yes | Must contain confirmed_root_cause with evidence chain |
| assign_task message | Yes | Phase 4 instruction |

## Iron Law Gate Check

**MANDATORY FIRST ACTION before any code modification**:

| Condition | Action |
|-----------|--------|
| investigation-report contains `confirmed_root_cause` with non-empty description | Proceed to Step 1 |
| `confirmed_root_cause` absent or empty | Output "BLOCKED: Iron Law violation — no confirmed root cause. Return to Phase 3." Halt. Do NOT modify any files. |

Log the confirmed state before proceeding:
- Root cause: `<confirmed_root_cause.description>`
- Evidence chain: `<confirmed_root_cause.evidence_chain.length>` items
- Affected code: `<confirmed_root_cause.affected_code.file>:<confirmed_root_cause.affected_code.line_range>`

## Execution Steps

### Step 1: Plan the Minimal Fix

Define the fix scope BEFORE writing any code:

```
fix_plan = {
  description: "<What the fix does and why>",
  changes: [
    {
      file: "<path/to/file.ts>",
      change_type: "modify|add|remove",
      description: "<specific change description>",
      lines_affected: "<42-45>"
    }
  ],
  total_files_changed: <count>,
  total_lines_changed: "<estimated>"
}
```

**Minimal Fix Rules** (from Iron Law):

| Rule | Requirement |
|------|-------------|
| Change only necessary code | Only the confirmed root cause location |
| No refactoring | Do not restructure surrounding code |
| No feature additions | Fix only; no new capabilities |
| No style/format changes | Do not touch unrelated code formatting |
| >3 files changed | Requires written justification in fix_plan |

**Fix scope decision**:

| Files to change | Action |
|----------------|--------|
| 1-3 files | Proceed without justification |
| More than 3 files | Document justification in fix_plan.description before proceeding |

---

### Step 2: Implement the Fix

Apply the planned changes using Edit:

- Target only the file(s) and line(s) identified in `confirmed_root_cause.affected_code`
- Make exactly the change described in fix_plan
- Verify the edit was applied correctly by reading the modified section

**Decision table**:

| Edit outcome | Action |
|-------------|--------|
| Edit applied correctly | Proceed to Step 3 |
| Edit failed or incorrect | Re-apply with corrected old_string/new_string; if Edit fails 2+ times, use Bash sed as fallback |
| Fix requires more than planned | Document the additional change in fix_plan with justification |

---

### Step 3: Add Regression Test

Create or modify a test that proves the fix:

1. Find the appropriate test file for the affected module:
   - Use Glob for `**/*.test.{ts,js,py}`, `**/__tests__/**/*.{ts,js}`, or `**/test_*.py`
   - Match the test file to the affected source module
2. Add a regression test with these requirements:

**Regression test requirements**:

| Requirement | Details |
|-------------|---------|
| Test name references the bug | Name clearly describes the bug scenario (e.g., "should handle null display_name without error") |
| Tests exact code path | Exercises the specific path identified in root cause |
| Deterministic | No timing dependencies, no external services |
| Correct placement | In the appropriate test file for the affected module |
| Proves the fix | Must fail when fix is reverted, pass when fix is applied |

**Decision table**:

| Condition | Action |
|-----------|--------|
| Existing test file found for module | Add test to that file |
| No existing test file found | Create new test file following project conventions |
| Multiple candidate test files | Choose the one most directly testing the affected module |

---

### Step 4: Verify Fix Against Reproduction

Re-run the original reproduction case from Phase 1:

- If Phase 1 used a failing test: run that same test now
- If Phase 1 used a failing command: run that same command now
- If Phase 1 used static analysis: run the regression test as verification

Record verification result:

```
fix_applied = {
  description: "<what was fixed>",
  files_changed: ["<path/to/file.ts>"],
  lines_changed: <count>,
  regression_test: {
    file: "<path/to/test.ts>",
    test_name: "<test name>",
    status: "added|modified"
  },
  reproduction_verified: true|false
}
```

**Decision table**:

| Verification result | Action |
|--------------------|--------|
| Reproduction case now passes | Set reproduction_verified: true, proceed to Step 5 |
| Reproduction case still fails | Analyze why fix is insufficient, adjust fix, re-run |
| Cannot verify (setup required) | Document as concern, set reproduction_verified: false, proceed |

---

### Step 5: Assemble Phase 4 Output

Add `fix_applied` to investigation-report in memory. Output Phase 4 summary and await assign_task for Phase 5.

---

## Output

| Artifact | Format | Description |
|----------|--------|-------------|
| Modified source files | File edits | Minimal fix applied to affected code |
| Regression test | File add/edit | Test covering the exact bug scenario |
| investigation-report (phase 4) | In-memory JSON | Phases 1-3 fields + fix_applied section |
| Phase 4 summary | Structured text output | Fix description, test added, verification result |

## Success Criteria

| Criterion | Validation Method |
|-----------|-------------------|
| Iron Law gate passed | confirmed_root_cause present before any code change |
| Fix is minimal | fix_plan.total_files_changed <= 3 OR justification documented |
| Regression test added | fix_applied.regression_test populated |
| Original reproduction passes | fix_applied.reproduction_verified: true |
| No unrelated code changes | Only confirmed_root_cause.affected_code locations modified |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Iron Law gate fails | Output BLOCKED, halt, do not modify any files |
| Edit tool fails twice | Try Bash sed/awk as fallback; if still failing, use Write to recreate file |
| Fix does not resolve reproduction | Analyze remaining failure, adjust fix within Phase 4 |
| Fix requires changing >3 files | Document justification, proceed after explicit justification |
| No test file found for module | Create new test file following nearest similar test file pattern |
| Regression test is non-deterministic | Refactor test to remove timing/external dependencies |

## Next Phase

-> [Phase 5: Verification & Report](05-verification-report.md)
