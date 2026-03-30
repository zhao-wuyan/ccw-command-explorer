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

| Agent | task_name | Role File | Responsibility | Pattern | fork_context |
|-------|-----------|-----------|----------------|---------|-------------|
| security-auditor | security-auditor | ~/.codex/agents/security-auditor.md | Execute all 4 phases: dependency audit, OWASP review, STRIDE modeling, report generation | Deep Interaction (2.3) | false |

> **COMPACT PROTECTION**: Agent files are execution documents. When context compression occurs and agent instructions are reduced to summaries, **you MUST immediately `Read` the corresponding agent.md to reload before continuing execution**.

---

## Fork Context Strategy

| Agent | task_name | fork_context | fork_from | Rationale |
|-------|-----------|-------------|-----------|-----------|
| security-auditor | security-auditor | false | — | Starts fresh; all context provided via assign_task phase messages |

**Fork Decision Rules**:

| Condition | fork_context | Reason |
|-----------|-------------|--------|
| security-auditor spawn | false | Self-contained pipeline; phase inputs passed via assign_task |

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
  fork_context: false,
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
const phase1Result = wait_agent({ targets: ["security-auditor"], timeout_ms: 300000 })
```

**On timeout**:

```
assign_task({
  target: "security-auditor",
  items: [{ type: "text", text: "Finalize current supply chain scan and output supply-chain-report.json now." }]
})
const phase1Result = wait_agent({ targets: ["security-auditor"], timeout_ms: 120000 })
```

**Output**:

| Artifact | Description |
|----------|-------------|
| `.workflow/.security/supply-chain-report.json` | Dependency, secrets, CI/CD, and LLM findings |

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
assign_task({
  target: "security-auditor",
  items: [{ type: "text", text: `## Phase 2 — OWASP Review

Execute Phase 2 per: ~/.codex/skills/security-audit/phases/02-owasp-review.md

Context: supply-chain-report.json already written to .workflow/.security/
Reference: ~/.codex/skills/security-audit/specs/owasp-checklist.md

Deliverables:
- .workflow/.security/owasp-findings.json
- Coverage for all 10 OWASP categories (A01–A10)` }]
})
const phase2Result = wait_agent({ targets: ["security-auditor"], timeout_ms: 360000 })
```

**Output**:

| Artifact | Description |
|----------|-------------|
| `.workflow/.security/owasp-findings.json` | OWASP findings with owasp_id, severity, file:line, evidence, remediation |

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
assign_task({
  target: "security-auditor",
  items: [{ type: "text", text: `## Phase 3 — Threat Modeling (STRIDE)

Execute Phase 3 per: ~/.codex/skills/security-audit/phases/03-threat-modeling.md

Context: supply-chain-report.json and owasp-findings.json available in .workflow/.security/
Cross-reference Phase 1 and Phase 2 findings when mapping STRIDE categories.

Deliverables:
- .workflow/.security/threat-model.json
- All 6 STRIDE categories (S, T, R, I, D, E) evaluated per component
- Trust boundaries and attack surface quantified` }]
})
const phase3Result = wait_agent({ targets: ["security-auditor"], timeout_ms: 360000 })
```

**Output**:

| Artifact | Description |
|----------|-------------|
| `.workflow/.security/threat-model.json` | STRIDE threat model with components, trust boundaries, attack surface |

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
assign_task({
  target: "security-auditor",
  items: [{ type: "text", text: `## Phase 4 — Report & Tracking

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
- Updated copies of all phase outputs in .workflow/.security/` }]
})
const phase4Result = wait_agent({ targets: ["security-auditor"], timeout_ms: 300000 })
```

**Output**:

| Artifact | Description |
|----------|-------------|
| `.workflow/.security/audit-report-<date>.json` | Full scored report with trend, top risks, remediation priority |

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
| Phase 1: Supply Chain | 300000 ms (5 min) | assign_task "Finalize output now", re-wait 120s |
| Phase 2: OWASP Review | 360000 ms (6 min) | assign_task "Output partial findings", re-wait 120s |
| Phase 3: Threat Modeling | 360000 ms (6 min) | assign_task "Output partial threat model", re-wait 120s |
| Phase 4: Report | 300000 ms (5 min) | assign_task "Write report with available data", re-wait 120s |

### Cleanup Protocol

Agent is closed after the final executed phase (Phase 1 for quick-scan, Phase 4 for comprehensive).

```
close_agent({ target: "security-auditor" })
```

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Agent timeout (first) | assign_task "Finalize current work and output now" + re-wait 120000 ms |
| Agent timeout (second) | Log error, close_agent({ target: "security-auditor" }), report partial results |
| Phase output file missing | assign_task requesting specific file output, re-wait |
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
