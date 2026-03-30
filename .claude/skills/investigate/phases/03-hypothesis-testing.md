# Phase 3: Hypothesis Testing

Form hypotheses from evidence and test each one. Enforce the 3-strike escalation rule.

## Objective

- Form a maximum of 3 hypotheses from Phase 1-2 evidence
- Test each hypothesis with minimal, read-only probes
- Confirm or reject each hypothesis with concrete evidence
- Enforce 3-strike rule: STOP and escalate after 3 consecutive test failures

## Execution Steps

### Step 1: Form Hypotheses

Using evidence from Phase 1 (investigation report) and Phase 2 (pattern analysis), form up to 3 ranked hypotheses:

```json
{
  "hypotheses": [
    {
      "id": "H1",
      "description": "The root cause is X because evidence Y",
      "evidence_supporting": ["evidence item 1", "evidence item 2"],
      "predicted_behavior": "If H1 is correct, then we should observe Z",
      "test_method": "How to verify: read file X line Y, check value Z",
      "confidence": "high|medium|low"
    }
  ]
}
```

**Hypothesis Formation Rules**:
- Each hypothesis must cite at least one piece of evidence from Phase 1-2
- Each hypothesis must have a testable prediction
- Rank by confidence (high first)
- Maximum 3 hypotheses per investigation

### Step 2: Test Hypotheses Sequentially

Test each hypothesis starting from highest confidence. Use read-only probes:

**Allowed test methods**:
- `Read` a specific file and check a specific value or condition
- `Grep` for a pattern that would confirm or deny the hypothesis
- `Bash` to run a specific test or command that reveals the condition
- Temporarily add a log statement to observe runtime behavior (revert after)

**Prohibited during testing**:
- Modifying production code (save that for Phase 4)
- Changing multiple things at once
- Running the full test suite (targeted checks only)

```javascript
// Example hypothesis test
// H1: "Function X receives null because caller Y doesn't check return value"
const evidence = Read({ file_path: "src/caller.ts" })
// Check: Does caller Y use the return value without null check?
// Result: Confirmed / Rejected with specific evidence
```

### Step 3: Record Test Results

For each hypothesis test:

```json
{
  "hypothesis_tests": [
    {
      "id": "H1",
      "test_performed": "Read src/caller.ts:42 - checked null handling",
      "result": "confirmed|rejected|inconclusive",
      "evidence": "specific observation that confirms or rejects",
      "files_checked": ["src/caller.ts:42-55"]
    }
  ]
}
```

### Step 4: 3-Strike Escalation Rule

Track consecutive test failures. A "failure" means the test was inconclusive or the hypothesis was rejected AND no actionable insight was gained.

```
Strike Counter:
  [H1 rejected, no insight] → Strike 1
  [H2 rejected, no insight] → Strike 2
  [H3 rejected, no insight] → Strike 3 → STOP
```

**Important**: A rejected hypothesis that provides useful insight (narrows the search) does NOT count as a strike. Only truly unproductive tests count.

**On 3rd Strike — STOP and Escalate**:

```
## ESCALATION: 3-Strike Limit Reached

### Failed Step
- Phase: 3 — Hypothesis Testing
- Step: Hypothesis test #{N}

### Error History
1. Attempt 1: H1 — {description}
   Test: {what was checked}
   Result: {rejected/inconclusive} — {why}
2. Attempt 2: H2 — {description}
   Test: {what was checked}
   Result: {rejected/inconclusive} — {why}
3. Attempt 3: H3 — {description}
   Test: {what was checked}
   Result: {rejected/inconclusive} — {why}

### Current State
- Evidence collected: {summary from Phase 1-2}
- Hypotheses tested: {list}
- Files examined: {list}

### Diagnosis
- Likely root cause area: {best guess based on all evidence}
- Suggested human action: {specific recommendation — e.g., "Add logging to X", "Check runtime config Y", "Reproduce in debugger at Z"}

### Diagnostic Dump
{Full investigation-report.json content}
```

After escalation, set status to **BLOCKED** per Completion Status Protocol.

### Step 5: Confirm Root Cause

If a hypothesis is confirmed, document the confirmed root cause:

```json
{
  "phase": 3,
  "confirmed_root_cause": {
    "hypothesis_id": "H1",
    "description": "Root cause description with full evidence chain",
    "evidence_chain": [
      "Phase 1: Error message X observed in Y",
      "Phase 2: Same pattern found in 3 other files",
      "Phase 3: H1 confirmed — null check missing at file.ts:42"
    ],
    "affected_code": {
      "file": "path/to/file.ts",
      "line_range": "42-55",
      "function": "functionName"
    }
  }
}
```

## Output

- **Data**: `hypothesis-tests` and `confirmed_root_cause` added to investigation report (in-memory)
- **Format**: JSON structure as defined above

## Gate for Phase 4

**Phase 4 can ONLY proceed if `confirmed_root_cause` is present.** This is the Iron Law gate.

| Outcome | Next Step |
|---------|-----------|
| Root cause confirmed | Proceed to [Phase 4: Implementation](04-implementation.md) |
| 3-strike escalation | STOP, output diagnostic dump, status = BLOCKED |
| Partial insight | Re-form hypotheses with new evidence (stays in Phase 3) |

## Quality Checks

- [ ] Maximum 3 hypotheses formed, each with cited evidence
- [ ] Each hypothesis tested with a specific, documented probe
- [ ] Test results recorded with concrete evidence
- [ ] 3-strike counter maintained correctly
- [ ] Root cause confirmed with full evidence chain OR escalation triggered

## Next Phase

Proceed to [Phase 4: Implementation](04-implementation.md) ONLY with confirmed root cause.
