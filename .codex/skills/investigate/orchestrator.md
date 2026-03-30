---
name: investigate
description: Systematic debugging with Iron Law methodology. 5-phase investigation from evidence collection to verified fix. Triggers on "investigate", "debug", "root cause".
agents: investigator
phases: 5
---

# Investigate

Systematic debugging skill that enforces the Iron Law: never fix without a confirmed root cause. Produces a structured debug report with full evidence chain, minimal fix, and regression test.

## Architecture

```
+--------------------------------------------------------------+
|  investigate Orchestrator                                     |
|  -> Drive investigator agent through 5 sequential phases     |
+----------------------------+---------------------------------+
                             |
              spawn_agent (Phase 1 initial task)
                             |
                             v
                    +------------------+
                    |   investigator   |
                    |  (single agent,  |
                    |   5-phase loop)  |
                    +------------------+
                        |   ^   |
          assign_task   |   |   |  assign_task
          (Phase 2-5)   v   |   v  (Phase 3 gate check)
                    +------------------+
                    | Phase 1: Root    |
                    | Phase 2: Pattern |
                    | Phase 3: Hyp.    | <-- Gate: BLOCKED?
                    | Phase 4: Impl.   | <-- Iron Law gate
                    | Phase 5: Report  |
                    +------------------+
                             |
                             v
                  .workflow/.debug/debug-report-*.json
```

---

## Agent Registry

| Agent | task_name | Role File | Responsibility | Pattern | fork_context |
|-------|-----------|-----------|----------------|---------|-------------|
| investigator | `investigator` | `~/.codex/skills/investigate/agents/investigator.md` | Full 5-phase investigation execution | Deep Interaction (2.3) | false |

> **COMPACT PROTECTION**: Agent files are execution documents. When context compression occurs and agent instructions are reduced to summaries, **you MUST immediately `Read` the corresponding agent.md to reload before continuing execution**.

---

## Fork Context Strategy

| Agent | task_name | fork_context | fork_from | Rationale |
|-------|-----------|-------------|-----------|-----------|
| investigator | `investigator` | false | — | Starts fresh; receives all phase context via assign_task messages. No prior conversation history needed. |

**Fork Decision Rules**:

| Condition | fork_context | Reason |
|-----------|-------------|--------|
| investigator spawned (Phase 1) | false | Clean context; full task description in message |
| Phase 2-5 transitions | N/A | assign_task used, agent already running |

---

## Subagent Registry

Utility subagents callable by the investigator agent during analysis phases:

| Subagent | Agent File | Callable By | Purpose | Model |
|----------|-----------|-------------|---------|-------|
| inline-cli-analysis | `~/.codex/agents/cli-explore-agent.md` | investigator | Cross-file diagnostic analysis (replaces ccw cli calls) | haiku |

> Subagents are spawned by the investigator within its own execution context (Pattern 2.8), not by the orchestrator.

---

## Phase Execution

### Phase 1: Root Cause Investigation

**Objective**: Spawn the investigator agent and assign the Phase 1 investigation task. Agent reproduces the bug, collects evidence, and runs initial diagnosis.

**Input**:

| Source | Description |
|--------|-------------|
| User message | Bug description, symptom, context, error messages |

**Execution**:

Build the initial spawn message embedding the bug report and Phase 1 instructions, then spawn the investigator:

```
spawn_agent({
  task_name: "investigator",
  fork_context: false,
  message: `## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. Read role definition: ~/.codex/skills/investigate/agents/investigator.md (MUST read first)
2. Read: ~/.codex/skills/investigate/phases/01-root-cause-investigation.md

---

## Phase 1: Root Cause Investigation

Bug Report:
<user-provided bug description, symptoms, error messages, context>

Execute Phase 1 per the phase file. Produce investigation-report (in-memory) and report back with:
- Phase 1 complete summary
- bug_description, reproduction result, evidence collected, initial diagnosis
- Await next phase assignment.`
})

const p1Result = wait_agent({ targets: ["investigator"], timeout_ms: 300000 })
```

**Output**:

| Artifact | Description |
|----------|-------------|
| p1Result | Phase 1 completion summary with evidence, reproduction, initial diagnosis |

---

### Phase 2: Pattern Analysis

**Objective**: Assign Phase 2 to the running investigator. Agent searches codebase for similar patterns and classifies bug scope.

**Input**:

| Source | Description |
|--------|-------------|
| p1Result | Phase 1 output — evidence, affected files, initial suspects |

**Execution**:

```
assign_task({
  target: "investigator",
  items: [{
    type: "text",
    text: `## Phase 2: Pattern Analysis

Read: ~/.codex/skills/investigate/phases/02-pattern-analysis.md

Using your Phase 1 findings, execute Phase 2:
- Search for similar error patterns across the codebase
- Search for the same antipattern if identified
- Classify scope: isolated | module-wide | systemic
- Document all occurrences with file:line references

Report back with pattern_analysis section and scope classification. Await next phase assignment.`
  }]
})

const p2Result = wait_agent({ targets: ["investigator"], timeout_ms: 300000 })
```

**Output**:

| Artifact | Description |
|----------|-------------|
| p2Result | Pattern analysis section: scope classification, similar occurrences, scope justification |

---

### Phase 3: Hypothesis Testing

**Objective**: Assign Phase 3 to the investigator. Agent forms and tests up to 3 hypotheses. Orchestrator checks output for `BLOCKED` marker before proceeding.

**Input**:

| Source | Description |
|--------|-------------|
| p2Result | Pattern analysis results |

**Execution**:

```
assign_task({
  target: "investigator",
  items: [{
    type: "text",
    text: `## Phase 3: Hypothesis Testing

Read: ~/.codex/skills/investigate/phases/03-hypothesis-testing.md

Using Phase 1-2 evidence, execute Phase 3:
- Form up to 3 ranked hypotheses, each citing evidence
- Test each hypothesis with read-only probes
- Track 3-strike counter — if 3 consecutive unproductive failures: STOP and output ESCALATION block with BLOCKED status
- If a hypothesis is confirmed: output confirmed_root_cause with full evidence chain

Report back with hypothesis test results and either:
  confirmed_root_cause (proceed to Phase 4)
  OR  BLOCKED: <escalation dump> (halt)`
  }]
})

const p3Result = wait_agent({ targets: ["investigator"], timeout_ms: 480000 })
```

**Phase 3 Gate Decision**:

| Condition | Action |
|-----------|--------|
| p3Result contains `confirmed_root_cause` | Proceed to Phase 4 |
| p3Result contains `BLOCKED` | Halt workflow, output escalation dump to user, close investigator |
| p3Result contains `ESCALATION: 3-Strike Limit Reached` | Halt workflow, output diagnostic dump, close investigator |
| Timeout | assign_task "Finalize Phase 3 results now", re-wait 120s; if still timeout → halt |

If BLOCKED: close investigator and surface the diagnostic dump to the user. Do not proceed to Phase 4.

---

### Phase 4: Implementation

**Objective**: Assign Phase 4 only after confirmed root cause. Agent implements minimal fix and adds regression test.

**Input**:

| Source | Description |
|--------|-------------|
| p3Result | confirmed_root_cause with evidence chain, affected file:line |

**Execution**:

```
assign_task({
  target: "investigator",
  items: [{
    type: "text",
    text: `## Phase 4: Implementation

Read: ~/.codex/skills/investigate/phases/04-implementation.md

Iron Law gate confirmed — proceed with implementation:
- Verify confirmed_root_cause is present in your context (gate check)
- Plan the minimal fix before writing any code
- Implement only what is necessary to fix the confirmed root cause
- Add regression test: must fail without fix, pass with fix
- Verify fix against original reproduction case from Phase 1

Report back with fix_applied section. Await Phase 5 assignment.`
  }]
})

const p4Result = wait_agent({ targets: ["investigator"], timeout_ms: 480000 })
```

**Output**:

| Artifact | Description |
|----------|-------------|
| p4Result | fix_applied section: files changed, regression test details, reproduction verified |

---

### Phase 5: Verification & Report

**Objective**: Assign Phase 5 to run the full test suite and generate the structured debug report.

**Input**:

| Source | Description |
|--------|-------------|
| p4Result | fix_applied details — files changed, regression test |

**Execution**:

```
assign_task({
  target: "investigator",
  items: [{
    type: "text",
    text: `## Phase 5: Verification & Report

Read: ~/.codex/skills/investigate/phases/05-verification-report.md

Final phase:
- Run full test suite (detect framework: npm test / pytest / go test / cargo test)
- Verify the regression test passes
- Check for new failures introduced by the fix
- Generate structured debug report per specs/debug-report-format.md
- Write report to .workflow/.debug/debug-report-<YYYY-MM-DD>-<slug>.json
- Output completion status: DONE | DONE_WITH_CONCERNS | BLOCKED`
  }]
})

const p5Result = wait_agent({ targets: ["investigator"], timeout_ms: 300000 })
```

**Output**:

| Artifact | Description |
|----------|-------------|
| p5Result | Completion status, test suite results, path to debug report file |

---

## Lifecycle Management

### Timeout Protocol

| Phase | Default Timeout | On Timeout |
|-------|-----------------|------------|
| Phase 1 (spawn + wait) | 300000 ms | assign_task "Finalize Phase 1 now" + wait 120s; if still timeout → halt |
| Phase 2 (assign + wait) | 300000 ms | assign_task "Finalize Phase 2 now" + wait 120s; if still timeout → halt |
| Phase 3 (assign + wait) | 480000 ms | assign_task "Finalize Phase 3 now" + wait 120s; if still timeout → halt BLOCKED |
| Phase 4 (assign + wait) | 480000 ms | assign_task "Finalize Phase 4 now" + wait 120s; if still timeout → halt |
| Phase 5 (assign + wait) | 300000 ms | assign_task "Finalize Phase 5 now" + wait 120s; if still timeout → partial report |

### Cleanup Protocol

At workflow end (success or halt), close the investigator agent:

```
close_agent({ target: "investigator" })
```

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Agent timeout (first) | assign_task "Finalize current work and output results" + re-wait 120000 ms |
| Agent timeout (second) | close_agent, report partial results to user |
| Phase 3 BLOCKED | close_agent, surface full escalation dump to user, halt |
| Phase 4 Iron Law violation | close_agent, report "Cannot proceed: no confirmed root cause" |
| Phase 4 introduces regression | Investigator returns to fix adjustment; orchestrator re-waits same phase |
| User cancellation | close_agent({ target: "investigator" }), report current state |
| send_message ignored | Escalate to assign_task |

---

## Output Format

```
## Summary
- One-sentence completion status (DONE / DONE_WITH_CONCERNS / BLOCKED)

## Results
- Root cause: <confirmed root cause description>
- Fix: <what was changed>
- Regression test: <test name in test file>

## Artifacts
- File: .workflow/.debug/debug-report-<date>-<slug>.json
- Description: Full structured investigation report

## Next Steps (if DONE_WITH_CONCERNS or BLOCKED)
1. <recommended follow-up action>
2. <recommended follow-up action>
```
