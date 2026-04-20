---
name: security-audit
description: OWASP Top 10 and STRIDE security auditing with supply chain analysis. Triggers on "security audit", "security scan", "cso".
agents: security-auditor
phases: 4
---

# Security Audit

4-phase security audit covering supply chain risks, OWASP Top 10 code review, STRIDE threat modeling, and trend-tracked reporting. Produces structured JSON findings in `.workflow/.security/`.

## Architecture

```
+----------------------------------------------------------------------+
|  security-audit Orchestrator                                          |
|  -> Mode selection: quick-scan (Phase 1 only) vs comprehensive       |
+-----------------------------------+----------------------------------+
                                    |
              +---------------------+---------------------+
              |                                           |
    [quick-scan mode]                        [comprehensive mode]
              |                                           |
    +---------v---------+                   +------------v-----------+
    |  Phase 1           |                   |  Phase 1               |
    |  Supply Chain Scan |                   |  Supply Chain Scan     |
    |  -> supply-chain-  |                   |  -> supply-chain-      |
    |     report.json    |                   |     report.json        |
    +---------+---------+                   +------------+-----------+
              |                                          |
       [score gate]                          +-----------v-----------+
       score >= 8/10                         |  Phase 2               |
              |                              |  OWASP Review          |
       [DONE or                              |  -> owasp-findings.    |
        DONE_WITH_CONCERNS]                  |     json               |
                                             +-----------+-----------+
                                                         |
                                             +-----------v-----------+
                                             |  Phase 3               |
                                             |  Threat Modeling       |
                                             |  (STRIDE)              |
                                             |  -> threat-model.json  |
                                             +-----------+-----------+
                                                         |
                                             +-----------v-----------+
                                             |  Phase 4               |
                                             |  Report & Tracking     |
                                             |  -> audit-report-      |
                                             |     {date}.json        |
                                             +-----------------------+
```

---

## Agent Registry

| Agent | task_name | Role File | Responsibility | Pattern | fork_turns |
|-------|-----------|-----------|----------------|---------|-------------|
| security-auditor | security-auditor | ~/.codex/agents/security-auditor.md | Execute all 4 phases: dependency audit, OWASP review, STRIDE modeling, report generation | Deep Interaction (2.3) | "none" |

> **COMPACT PROTECTION**: Agent files are execution documents. When context compression occurs and agent instructions are reduced to summaries, **you MUST immediately `Read` the corresponding agent.md to reload before continuing execution**.

---

## Fork Context Strategy

| Agent | task_name | fork_turns | fork_from | Rationale |
|-------|-----------|-------------|-----------|-----------|
| security-auditor | security-auditor | "none" | — | Starts fresh; all context provided via followup_task phase messages |

**Fork Decision Rules**:

| Condition | fork_turns | Reason |
|-----------|-------------|--------|
| security-auditor spawn | "none" | Self-contained pipeline; phase inputs passed via followup_task |

---

## Subagent Registry

Utility subagents spawned by `security-auditor` (not by the orchestrator):

| Subagent | Agent File | Callable By | Purpose | Model |
|----------|-----------|-------------|---------|-------|
| inline-owasp-analysis | ~/.codex/agents/cli-explore-agent.md | security-auditor (Phase 2) | OWASP Top 10 2021 code-level analysis | haiku |

> Subagents are spawned by agents within their own execution context (Pattern 2.8), not by the orchestrator.

---

## Mode Selection

Determine mode from user request before spawning any agent.

| User Intent | Mode | Phases to Execute | Gate |
|-------------|------|-------------------|------|
| "quick scan", "daily check", "fast audit" | quick-scan | Phase 1 only | score >= 8/10 |
| "full audit", "comprehensive", "security audit", "cso" | comprehensive | Phases 1 → 2 → 3 → 4 | no regression (initial: >= 2/10) |
| Ambiguous | Prompt user: "Quick-scan (Phase 1 only) or comprehensive (all 4 phases)?" | — | — |

---

## Phase Execution

### Progress Tracking Initialization

Before spawning any agent, initialize progress tracking. For comprehensive mode, all 4 phases; for quick-scan, Phase 1 only:

```
// Comprehensive mode
functions.update_plan([
  { id: "phase-1", title: "Phase 1: Supply Chain Scan", status: "in_progress" },
  { id: "phase-2", title: "Phase 2: OWASP Review", status: "pending" },
  { id: "phase-3", title: "Phase 3: Threat Modeling (STRIDE)", status: "pending" },
  { id: "phase-4", title: "Phase 4: Report & Tracking", status: "pending" }
])

// Quick-scan mode
functions.update_plan([
  { id: "phase-1", title: "Phase 1: Supply Chain Scan", status: "in_progress" }
])
```

### Phase 1: Supply Chain Scan

**Objective**: Detect low-hanging security risks in dependencies, secrets, CI/CD pipelines, and LLM integrations.

**Input**:

| Source | Description |
|--------|-------------|
| Working directory | Project source to be scanned |
| Mode | quick-scan or comprehensive |

**Execution**:

Spawn the security-auditor agent and assign Phase 1:

```
spawn_agent({
  task_name: "security-auditor",
  fork_turns: "none",
  message: `### MANDATORY FIRST STEPS
1. Read: ~/.codex/skills/security-audit/agents/security-auditor.md

## TASK: Phase 1 — Supply Chain Scan

Mode: <quick-scan|comprehensive>
Work directory: .workflow/.security

Execute Phase 1 per: ~/.codex/skills/security-audit/phases/01-supply-chain-scan.md

Deliverables:
- .workflow/.security/supply-chain-report.json
- Structured output summary with finding counts by severity`
})
const phase1Result = wait_agent({ timeout_ms: 1800000 })  // 30 minutes
```

**On timeout** (4-step cascade):

```
// Step 2: Status probe (non-interrupting, 3 min)
followup_task({
  target: "security-auditor",
  message: "STATUS_CHECK: Report current progress, findings so far, and estimated remaining work."
})
const status = wait_agent({ timeout_ms: 180000 })  // 3 min
if (status.timed_out) {
  // Step 3: Force finalize (interrupt, 3 min)
  followup_task({
    target: "security-auditor",
    message: "FINALIZE: Output all current findings immediately. Time limit reached.",
    interrupt: true
  })
  const forced = wait_agent({ timeout_ms: 180000 })  // 3 min
  if (forced.timed_out) {
    // Step 4: Abort
    close_agent({ target: "security-auditor" })
  }
}
```

**Output**:

| Artifact | Description |
|----------|-------------|
| `.workflow/.security/supply-chain-report.json` | Dependency, secrets, CI/CD, and LLM findings |

**Progress (comprehensive)**: `functions.update_plan([{id: "phase-1", status: "completed"}, {id: "phase-2", status: "in_progress"}])`

**Progress (quick-scan)**: `functions.update_plan([{id: "phase-1", status: "completed"}])`

---

### Quick-Scan Gate (quick-scan mode only)

After Phase 1 completes, evaluate score and close agent.

| Condition | Action |
|-----------|--------|
| score >= 8.0 | Status: DONE. No blocking issues. |
| 6.0 <= score < 8.0 | Status: DONE_WITH_CONCERNS. Log warning — review before deploy. |
| score < 6.0 | Status: DONE_WITH_CONCERNS. Block deployment. Remediate critical/high findings. |

```
close_agent({ target: "security-auditor" })
```

> **If quick-scan mode**: Stop here. Output final summary with score and findings count.

---

### Phase 2: OWASP Review (comprehensive mode only)

**Objective**: Systematic code-level review against all 10 OWASP Top 10 2021 categories.

**Input**:

| Source | Description |
|--------|-------------|
| `.workflow/.security/supply-chain-report.json` | Phase 1 findings for context |
| Source files | All .ts/.js/.py/.go/.java excluding node_modules, dist, build |

**Execution**:

```
followup_task({
  target: "security-auditor",
  message: `## Phase 2 — OWASP Review

Execute Phase 2 per: ~/.codex/skills/security-audit/phases/02-owasp-review.md

Context: supply-chain-report.json already written to .workflow/.security/
Reference: ~/.codex/skills/security-audit/specs/owasp-checklist.md

Deliverables:
- .workflow/.security/owasp-findings.json
- Coverage for all 10 OWASP categories (A01–A10)`
})
const phase2Result = wait_agent({ timeout_ms: 1800000 })  // 30 minutes
```

**Output**:

| Artifact | Description |
|----------|-------------|
| `.workflow/.security/owasp-findings.json` | OWASP findings with owasp_id, severity, file:line, evidence, remediation |

**Progress**: `functions.update_plan([{id: "phase-2", status: "completed"}, {id: "phase-3", status: "in_progress"}])`

---

### Phase 3: Threat Modeling (comprehensive mode only)

**Objective**: Apply STRIDE threat model to architecture components; assess attack surface.

**Input**:

| Source | Description |
|--------|-------------|
| `.workflow/.security/supply-chain-report.json` | Phase 1 findings |
| `.workflow/.security/owasp-findings.json` | Phase 2 findings |
| Source files | Route handlers, data stores, auth modules, external service clients |

**Execution**:

```
followup_task({
  target: "security-auditor",
  message: `## Phase 3 — Threat Modeling (STRIDE)

Execute Phase 3 per: ~/.codex/skills/security-audit/phases/03-threat-modeling.md

Context: supply-chain-report.json and owasp-findings.json available in .workflow/.security/
Cross-reference Phase 1 and Phase 2 findings when mapping STRIDE categories.

Deliverables:
- .workflow/.security/threat-model.json
- All 6 STRIDE categories (S, T, R, I, D, E) evaluated per component
- Trust boundaries and attack surface quantified`
})
const phase3Result = wait_agent({ timeout_ms: 1800000 })  // 30 minutes
```

**Output**:

| Artifact | Description |
|----------|-------------|
| `.workflow/.security/threat-model.json` | STRIDE threat model with components, trust boundaries, attack surface |

**Progress**: `functions.update_plan([{id: "phase-3", status: "completed"}, {id: "phase-4", status: "in_progress"}])`

---

### Phase 4: Report & Tracking (comprehensive mode only)

**Objective**: Calculate score, compare with previous audits, generate date-stamped report.

**Input**:

| Source | Description |
|--------|-------------|
| `.workflow/.security/supply-chain-report.json` | Phase 1 output |
| `.workflow/.security/owasp-findings.json` | Phase 2 output |
| `.workflow/.security/threat-model.json` | Phase 3 output |
| `.workflow/.security/audit-report-*.json` | Previous audit reports (optional, for trend) |

**Execution**:

```
followup_task({
  target: "security-auditor",
  message: `## Phase 4 — Report & Tracking

Execute Phase 4 per: ~/.codex/skills/security-audit/phases/04-report-tracking.md

Scoring reference: ~/.codex/skills/security-audit/specs/scoring-gates.md

Steps:
1. Aggregate all findings from phases 1–3
2. Calculate score using formula: base 10.0 - (weighted_sum / normalization)
3. Check for previous audit: ls -t .workflow/.security/audit-report-*.json | head -1
4. Compute trend (improving/stable/regressing/baseline)
5. Evaluate gate (initial >= 2/10; subsequent >= previous_score)
6. Write .workflow/.security/audit-report-<YYYY-MM-DD>.json

Deliverables:
- .workflow/.security/audit-report-<YYYY-MM-DD>.json
- Updated copies of all phase outputs in .workflow/.security/`
})
const phase4Result = wait_agent({ timeout_ms: 1800000 })  // 30 minutes
```

**Output**:

| Artifact | Description |
|----------|-------------|
| `.workflow/.security/audit-report-<date>.json` | Full scored report with trend, top risks, remediation priority |

**Progress**: `functions.update_plan([{id: "phase-4", status: "completed"}])`

---

### Comprehensive Gate (comprehensive mode only)

After Phase 4 completes, evaluate gate and close agent.

| Audit Type | Condition | Result | Action |
|------------|-----------|--------|--------|
| Initial (no prior audit) | score >= 2.0 | PASS | DONE. Baseline established. Plan remediation. |
| Initial | score < 2.0 | FAIL | DONE_WITH_CONCERNS. Critical exposure. Immediate triage required. |
| Subsequent | score >= previous_score | PASS | DONE. No regression. |
| Subsequent | previous_score - 0.5 <= score < previous_score | WARN | DONE_WITH_CONCERNS. Marginal change. Review new findings. |
| Subsequent | score < previous_score - 0.5 | FAIL | DONE_WITH_CONCERNS. Regression detected. Investigate new findings. |

```
close_agent({ target: "security-auditor" })
```

---

## Lifecycle Management

### Timeout Protocol

| Phase | Default Timeout | On Timeout |
|-------|-----------------|------------|
| Phase 1: Supply Chain | 1800000 ms (30 min) | Status probe (3 min) → force finalize (3 min) → close |
| Phase 2: OWASP Review | 1800000 ms (30 min) | Status probe (3 min) → force finalize (3 min) → close |
| Phase 3: Threat Modeling | 1800000 ms (30 min) | Status probe (3 min) → force finalize (3 min) → close |
| Phase 4: Report | 1800000 ms (30 min) | Status probe (3 min) → force finalize (3 min) → close |

### Cleanup Protocol

Agent is closed after the final executed phase (Phase 1 for quick-scan, Phase 4 for comprehensive).

```
close_agent({ target: "security-auditor" })
```

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Agent timeout (first) | Status probe via followup_task (3 min) → force finalize with interrupt (3 min) → close_agent |
| Agent timeout (second) | Log error, close_agent({ target: "security-auditor" }), report partial results |
| Phase output file missing | followup_task requesting specific file output, re-wait |
| Audit tool not installed (npm/pip) | Phase 1 logs as INFO finding and continues — not a blocker |
| No previous audit found | Treat as baseline — apply initial gate (>= 2/10) |
| User cancellation | close_agent({ target: "security-auditor" }), report current state |

---

## Output Format

```
## Summary
- One-sentence completion status with mode and final score

## Score
- Overall: <N>/10 (<Rating>)
- Gate: PASS|FAIL|WARN
- Mode: quick-scan|comprehensive

## Findings
- Critical: <N>
- High: <N>
- Medium: <N>
- Low: <N>

## Artifacts
- File: .workflow/.security/supply-chain-report.json
- File: .workflow/.security/owasp-findings.json (comprehensive only)
- File: .workflow/.security/threat-model.json (comprehensive only)
- File: .workflow/.security/audit-report-<date>.json (comprehensive only)

## Top Risks
1. <Most critical finding with file:line and remediation>
2. <Second finding>

## Next Steps
1. Remediate critical findings (effort: <low|medium|high>)
2. Re-run audit to verify fixes
```
