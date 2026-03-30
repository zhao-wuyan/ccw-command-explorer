# Iron Law of Debugging

The Iron Law defines the non-negotiable rules that govern every investigation performed by this skill. These rules exist to prevent symptom-fixing and ensure durable, evidence-based solutions.

## When to Use

| Phase | Usage | Section |
|-------|-------|---------|
| Phase 3 | Hypothesis must produce confirmed root cause before proceeding | Rule 1 |
| Phase 1 | Reproduction must produce observable evidence | Rule 2 |
| Phase 4 | Fix scope must be minimal | Rule 3 |
| Phase 4 | Regression test is mandatory | Rule 4 |
| Phase 3 | 3 consecutive unproductive hypothesis failures trigger escalation | Rule 5 |

---

## Rules

### Rule 1: Never Fix Without Confirmed Root Cause

**Statement**: No code modification is permitted until a root cause has been confirmed through hypothesis testing with concrete evidence.

**Enforcement**: Phase 4 begins with an Iron Law gate check. If `confirmed_root_cause` is absent from the investigation report, Phase 4 is blocked.

**Rationale**: Fixing symptoms without understanding the cause leads to:
- Incomplete fixes that break under different conditions
- Masking of deeper issues
- Wasted investigation time when the bug recurs

### Rule 2: Evidence Must Be Reproducible

**Statement**: The bug must be reproducible through documented steps, or if not reproducible, the evidence must be sufficient to identify the root cause through static analysis.

**Enforcement**: Phase 1 documents reproduction steps and evidence. If reproduction fails, this is flagged as a concern but does not block investigation if sufficient static evidence exists.

**Acceptable evidence types**:
- Failing test case
- Error message with stack trace
- Log output showing the failure
- Code path analysis showing the defect condition

### Rule 3: Fix Must Be Minimal

**Statement**: The fix must change only what is necessary to address the confirmed root cause. No refactoring, no feature additions, no style changes to unrelated code.

**Enforcement**: Phase 4 requires a fix plan before implementation. Changes exceeding 3 files require written justification.

**What counts as minimal**:
- Adding a missing null check
- Fixing an incorrect condition
- Correcting a wrong variable reference
- Adding a missing import or dependency

**What is NOT minimal**:
- Refactoring the function "while we're here"
- Renaming variables for clarity
- Adding error handling to unrelated code paths
- Reformatting surrounding code

### Rule 4: Regression Test Required

**Statement**: Every fix must include a test that:
1. Fails when the fix is reverted (proves it tests the bug)
2. Passes when the fix is applied (proves the fix works)

**Enforcement**: Phase 4 requires a regression test before the phase is marked complete.

**Test requirements**:
- Test name clearly references the bug scenario
- Test exercises the exact code path of the root cause
- Test is deterministic (no timing dependencies, no external services)
- Test is placed in the appropriate test file for the affected module

### Rule 5: 3-Strike Escalation on Hypothesis Failure

**Statement**: If 3 consecutive hypothesis tests produce no actionable insight, the investigation must STOP and escalate with a full diagnostic dump.

**Enforcement**: Phase 3 tracks a strike counter. On the 3rd consecutive unproductive failure, execution halts and outputs the escalation block.

**What counts as a strike**:
- Hypothesis rejected AND no new insight gained
- Test was inconclusive AND no narrowing of search space

**What does NOT count as a strike**:
- Hypothesis rejected BUT new evidence narrows the search
- Hypothesis rejected BUT reveals a different potential cause
- Test inconclusive BUT identifies a new area to investigate

**Post-escalation**: Status set to BLOCKED. No further automated investigation. Preserve all intermediate outputs for human review.

---

## Validation Checklist

Before completing any investigation, verify:

- [ ] Rule 1: Root cause confirmed before any fix was applied
- [ ] Rule 2: Bug reproduction documented (or static evidence justified)
- [ ] Rule 3: Fix changes only necessary code (file count, line count documented)
- [ ] Rule 4: Regression test exists and passes
- [ ] Rule 5: No more than 3 consecutive unproductive hypothesis tests (or escalation triggered)
