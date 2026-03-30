# Phase 3: Hypothesis Testing

> **COMPACT PROTECTION**: This is a core execution phase. If context compression has occurred and this file is only a summary, **MUST `Read` this file again before executing any Step**. Do not execute from memory.

Form hypotheses from evidence and test each one. Enforce the 3-strike escalation rule.

## Objective

- Form a maximum of 3 hypotheses from Phase 1-2 evidence
- Test each hypothesis with minimal, read-only probes
- Confirm or reject each hypothesis with concrete evidence
- Enforce 3-strike rule: STOP and escalate after 3 consecutive unproductive test failures

## Input

| Source | Required | Description |
|--------|----------|-------------|
| investigation-report (phases 1-2) | Yes | Evidence, affected files, pattern analysis, initial suspects |
| assign_task message | Yes | Phase 3 instruction |

## Execution Steps

### Step 1: Form Hypotheses

Using evidence from Phase 1 (investigation report) and Phase 2 (pattern analysis), form up to 3 ranked hypotheses:

**Hypothesis formation rules**:
- Each hypothesis must cite at least one piece of evidence from Phase 1-2
- Each hypothesis must have a testable prediction
- Rank by confidence (high first)
- Maximum 3 hypotheses per investigation

Assemble hypotheses in memory:

```
hypotheses = [
  {
    id: "H1",
    description: "The root cause is <X> because evidence <Y>",
    evidence_supporting: ["<evidence item 1>", "<evidence item 2>"],
    predicted_behavior: "If H1 is correct, then we should observe <Z>",
    test_method: "How to verify: read file <X> line <Y>, check value <Z>",
    confidence: "high|medium|low"
  }
]
```

Initialize strike counter: 0

---

### Step 2: Test Hypotheses Sequentially

Test each hypothesis starting from highest confidence (H1 first). Use read-only probes only during testing.

**Allowed test methods**:

| Method | Usage |
|--------|-------|
| Read a specific file | Check a specific value, condition, or code pattern |
| Grep for a pattern | Confirm or deny the presence of a condition |
| Bash targeted test | Run a specific test that reveals the condition |
| Temporary log statement | Add a log to observe runtime behavior; MUST revert after |

**Prohibited during hypothesis testing**:
- Modifying production code (save for Phase 4)
- Changing multiple things at once
- Running the full test suite (targeted checks only)

---

### Step 3: Record Test Results

For each hypothesis test, record:

```
hypothesis_test = {
  id: "H1",
  test_performed: "<what was checked, e.g.: Read src/caller.ts:42 — checked null handling>",
  result: "confirmed|rejected|inconclusive",
  evidence: "<specific observation that confirms or rejects>",
  files_checked: ["<src/caller.ts:42-55>"]
}
```

---

### Step 4: 3-Strike Escalation Rule

Track consecutive unproductive test failures. After each hypothesis test, evaluate:

**Strike evaluation**:

| Test result | New insight gained | Strike action |
|-------------|-------------------|---------------|
| confirmed | — | CONFIRM root cause, end testing |
| rejected | Yes — narrows search or reveals new cause | No strike (productive rejection) |
| rejected | No — no actionable insight | +1 strike |
| inconclusive | Yes — identifies new area | No strike (productive) |
| inconclusive | No — no narrowing | +1 strike |

**Strike counter tracking**:

| Strike count | Action |
|--------------|--------|
| 1 | Continue to next hypothesis |
| 2 | Continue to next hypothesis |
| 3 | STOP — output escalation block immediately |

**On 3rd Strike — output this escalation block verbatim and halt**:

```
## ESCALATION: 3-Strike Limit Reached

### Failed Step
- Phase: 3 — Hypothesis Testing
- Step: Hypothesis test #<N>

### Error History
1. Attempt 1: <H1 description>
   Test: <what was checked>
   Result: <rejected/inconclusive> — <why>
2. Attempt 2: <H2 description>
   Test: <what was checked>
   Result: <rejected/inconclusive> — <why>
3. Attempt 3: <H3 description>
   Test: <what was checked>
   Result: <rejected/inconclusive> — <why>

### Current State
- Evidence collected: <summary from Phase 1-2>
- Hypotheses tested: <list>
- Files examined: <list>

### Diagnosis
- Likely root cause area: <best guess based on all evidence>
- Suggested human action: <specific recommendation — e.g., "Add logging to X", "Check runtime config Y", "Reproduce in debugger at Z">

### Diagnostic Dump
<Full investigation-report content from all phases>

STATUS: BLOCKED
```

After outputting escalation: set status BLOCKED. Do not proceed to Phase 4.

---

### Step 5: Confirm Root Cause

If a hypothesis is confirmed, document the confirmed root cause:

```
confirmed_root_cause = {
  hypothesis_id: "H1",
  description: "<Root cause description with full technical detail>",
  evidence_chain: [
    "Phase 1: <Error message X observed in Y>",
    "Phase 2: <Same pattern found in N other files>",
    "Phase 3: H1 confirmed — <specific condition at file.ts:42>"
  ],
  affected_code: {
    file: "<path/to/file.ts>",
    line_range: "<42-55>",
    function: "<functionName>"
  }
}
```

Add `hypothesis_tests` and `confirmed_root_cause` to investigation-report in memory.

Output Phase 3 results and await assign_task for Phase 4.

---

## Output

| Artifact | Format | Description |
|----------|--------|-------------|
| investigation-report (phase 3) | In-memory JSON | Phases 1-2 fields + hypothesis_tests + confirmed_root_cause |
| Phase 3 summary or escalation block | Structured text output | Either confirmed root cause or BLOCKED escalation |

## Success Criteria

| Criterion | Validation Method |
|-----------|-------------------|
| Maximum 3 hypotheses formed | Count of hypotheses array |
| Each hypothesis cites evidence | evidence_supporting non-empty for each |
| Each hypothesis tested with documented probe | test_performed field populated for each |
| Strike counter maintained correctly | Count of unproductive consecutive failures |
| Root cause confirmed with evidence chain OR escalation triggered | confirmed_root_cause present OR BLOCKED output |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Evidence insufficient to form 3 hypotheses | Form as many as evidence supports (minimum 1), proceed |
| Partial insight from rejected hypothesis | Do not count as strike; re-form or refine remaining hypotheses with new insight |
| All 3 hypotheses confirmed simultaneously | Use highest-confidence confirmed one as root cause |
| Hypothesis test requires production change | Prohibited — use static analysis or targeted read-only probe instead |

## Gate for Phase 4

Phase 4 can ONLY proceed if `confirmed_root_cause` is present. This is the Iron Law gate.

| Outcome | Next Step |
|---------|-----------|
| Root cause confirmed | -> [Phase 4: Implementation](04-implementation.md) |
| 3-strike escalation triggered | STOP — output diagnostic dump — STATUS: BLOCKED |
| Partial insight, re-forming hypotheses | Stay in Phase 3, re-test with refined hypotheses |

## Next Phase

-> [Phase 4: Implementation](04-implementation.md) ONLY with confirmed root cause.
