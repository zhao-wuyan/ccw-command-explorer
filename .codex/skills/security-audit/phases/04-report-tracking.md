# Phase 4: Report & Tracking

> **COMPACT PROTECTION**: This is a core execution phase. If context compression has occurred and this file is only a summary, **MUST `Read` this file again before executing any Step**. Do not execute from memory.

Generate scored audit report, compare with previous audits, and track security trends.

## Objective

- Calculate security score from all phase findings
- Compare with previous audit results (if available)
- Generate date-stamped report in `.workflow/.security/`
- Track improvement or regression trends

## Input

| Source | Required | Description |
|--------|----------|-------------|
| `.workflow/.security/supply-chain-report.json` | Yes | Phase 1 findings |
| `.workflow/.security/owasp-findings.json` | Yes | Phase 2 findings |
| `.workflow/.security/threat-model.json` | Yes | Phase 3 findings (STRIDE gaps) |
| `.workflow/.security/audit-report-*.json` | No | Previous audit reports for trend comparison |
| `~/.codex/skills/security-audit/specs/scoring-gates.md` | Yes | Scoring formula and gate thresholds |

## Execution Steps

### Step 1: Aggregate Findings

Collect all findings from phases 1–3 and classify by severity.

**Aggregation Formula**:

```
All findings =
  supply-chain-report.findings
  + owasp-findings.findings
  + threat-model threats (where gaps array is non-empty)
```

**Deduplication Rule**:

| Condition | Action |
|-----------|--------|
| Same vulnerability appears in multiple phases | Keep highest-severity classification; merge evidence; count as single finding |
| Same file:line in different categories | Merge into one finding; note all phases that detected it |
| Unique finding per phase | Include as-is |

---

### Step 2: Calculate Score

Apply scoring formula from `~/.codex/skills/security-audit/specs/scoring-gates.md`.

**Scoring Formula**:

```
Base score = 10.0

For each finding:
  penalty = severity_weight / total_files_scanned
  - Critical: weight = 10  (each critical finding has outsized impact)
  - High:     weight = 7
  - Medium:   weight = 4
  - Low:      weight = 1

Weighted penalty = SUM(finding_weight * count_per_severity) / normalization_factor
Final score = max(0, 10.0 - weighted_penalty)

Normalization factor = max(10, total_files_scanned)
```

**Severity Weights**:

| Severity | Weight | Criteria | Examples |
|----------|--------|----------|----------|
| Critical | 10 | Exploitable with high impact, no user interaction needed | RCE, SQL injection with data access, leaked production credentials, auth bypass |
| High | 7 | Exploitable with significant impact, may need user interaction | Broken authentication, SSRF, privilege escalation, XSS with session theft |
| Medium | 4 | Limited exploitability or moderate impact | Reflected XSS, CSRF, verbose error messages, missing security headers |
| Low | 1 | Informational or minimal impact | Missing best-practice headers, minor info disclosure, deprecated dependencies without known exploit |

**Score Interpretation**:

| Score | Rating | Meaning |
|-------|--------|---------|
| 9.0–10.0 | Excellent | Minimal risk, production-ready |
| 7.0–8.9 | Good | Acceptable risk, minor improvements needed |
| 5.0–6.9 | Fair | Notable risks, remediation recommended |
| 3.0–4.9 | Poor | Significant risks, remediation required |
| 0.0–2.9 | Critical | Severe vulnerabilities, immediate action needed |

**Example Score Calculations**:

| Findings | Files Scanned | Weighted Sum | Penalty | Score |
|----------|--------------|--------------|---------|-------|
| 1 critical | 50 | 10 | 0.2 | 9.8 |
| 2 critical, 3 high | 50 | 41 | 0.82 | 9.2 |
| 5 critical, 10 high | 50 | 120 | 2.4 | 7.6 |
| 10 critical, 20 high, 15 medium | 100 | 300 | 3.0 | 7.0 |
| 20 critical | 20 | 200 | 10.0 | 0.0 |

---

### Step 3: Gate Evaluation

**Daily quick-scan gate** (Phase 1 only):

| Result | Condition | Action |
|--------|-----------|--------|
| PASS | score >= 8.0 | Continue. No blocking issues. |
| WARN | 6.0 <= score < 8.0 | Log warning. Review findings before deploy. |
| FAIL | score < 6.0 | Block deployment. Remediate critical/high findings. |

**Comprehensive audit gate** (all phases):

Initial/baseline audit (no previous audit exists):

| Result | Condition | Action |
|--------|-----------|--------|
| PASS | score >= 2.0 | Baseline established. Plan remediation. |
| FAIL | score < 2.0 | Critical exposure. Immediate triage required. |

Subsequent audits (previous audit exists):

| Result | Condition | Action |
|--------|-----------|--------|
| PASS | score >= previous_score | No regression. Continue improvement. |
| WARN | score within 0.5 of previous | Marginal change. Review new findings. |
| FAIL | score < previous_score - 0.5 | Regression detected. Investigate new findings. |

Production readiness target: score >= 7.0

---

### Step 4: Trend Comparison

Find and compare with previous audit reports.

**Execution**:

```bash
# Find previous audit reports
ls -t .workflow/.security/audit-report-*.json 2>/dev/null | head -5
```

**Trend Direction Decision Table**:

| Condition | direction |
|-----------|-----------|
| No previous audit file found | `baseline` |
| score_delta > 0.5 | `improving` |
| -0.5 <= score_delta <= 0.5 | `stable` |
| score_delta < -0.5 | `regressing` |

Compare current vs. previous:
- Delta per OWASP category (new findings vs. resolved findings)
- Delta per STRIDE category
- New findings vs. resolved findings (by title/file comparison)
- Overall score trend

**Trend JSON Format**:

```json
{
  "trend": {
    "current_date": "2026-03-29",
    "current_score": 7.5,
    "previous_date": "2026-03-22",
    "previous_score": 6.8,
    "score_delta": 0.7,
    "new_findings": 2,
    "resolved_findings": 5,
    "direction": "improving",
    "history": [
      { "date": "2026-03-15", "score": 5.2, "total_findings": 45 },
      { "date": "2026-03-22", "score": 6.8, "total_findings": 32 },
      { "date": "2026-03-29", "score": 7.5, "total_findings": 29 }
    ]
  }
}
```

---

### Step 5: Generate Report

Assemble and write the final scored report.

**Execution**:

```bash
# Ensure directory exists
mkdir -p .workflow/.security

# Write report with date stamp
DATE=$(date +%Y-%m-%d)
cp "${WORK_DIR}/audit-report.json" ".workflow/.security/audit-report-${DATE}.json"

# Also maintain latest copies of phase outputs
cp "${WORK_DIR}/supply-chain-report.json" ".workflow/.security/" 2>/dev/null || true
cp "${WORK_DIR}/owasp-findings.json" ".workflow/.security/" 2>/dev/null || true
cp "${WORK_DIR}/threat-model.json" ".workflow/.security/" 2>/dev/null || true
```

Build `remediation_priority` list: rank by severity weight × inverse effort (low effort + high impact = priority 1).

---

## Output

| Artifact | Format | Description |
|----------|--------|-------------|
| `.workflow/.security/audit-report-<YYYY-MM-DD>.json` | JSON | Full scored report with trend, top risks, remediation priority |

```json
{
  "report": "security-audit",
  "version": "1.0",
  "timestamp": "ISO-8601",
  "date": "YYYY-MM-DD",
  "mode": "comprehensive|quick-scan",
  "score": {
    "overall": 7.5,
    "rating": "Good",
    "gate": "PASS|FAIL",
    "gate_threshold": 8
  },
  "findings_summary": {
    "total": 0,
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
    "by_phase": {
      "supply_chain": 0,
      "owasp": 0,
      "stride": 0
    },
    "by_owasp": {
      "A01": 0, "A02": 0, "A03": 0, "A04": 0, "A05": 0,
      "A06": 0, "A07": 0, "A08": 0, "A09": 0, "A10": 0
    },
    "by_stride": { "S": 0, "T": 0, "R": 0, "I": 0, "D": 0, "E": 0 }
  },
  "top_risks": [
    {
      "rank": 1,
      "title": "Most critical finding",
      "severity": "critical",
      "source_phase": "owasp",
      "remediation": "How to fix",
      "effort": "low|medium|high"
    }
  ],
  "trend": {
    "previous_date": "YYYY-MM-DD or null",
    "previous_score": 0,
    "score_delta": 0,
    "new_findings": 0,
    "resolved_findings": 0,
    "direction": "improving|stable|regressing|baseline"
  },
  "phases_completed": ["supply-chain-scan", "owasp-review", "threat-modeling", "report-tracking"],
  "files_scanned": 0,
  "remediation_priority": [
    {
      "priority": 1,
      "finding": "Finding title",
      "effort": "low",
      "impact": "high",
      "recommendation": "Specific action"
    }
  ]
}
```

## Success Criteria

| Criterion | Validation Method |
|-----------|-------------------|
| Score calculated using correct formula | Verify: base 10.0 - (weighted_sum / max(10, files)) |
| Gate evaluation matches mode and audit history | Check gate logic against previous audit presence |
| Trend direction computed correctly | Verify score_delta and direction mapping |
| `audit-report-<date>.json` written to `.workflow/.security/` | File exists, is valid JSON, contains all required fields |
| remediation_priority ranked by severity and effort | Priority 1 = highest severity + lowest effort |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Phase data file missing or corrupted | Report as BLOCKED; output partial report with available data |
| Previous audit parse error | Treat as baseline; note data integrity issue |
| files_scanned is zero | Use normalization_factor of 10 (minimum); continue |
| Date command unavailable | Use ISO timestamp substring for date portion |
| Write fails | Retry once with explicit `mkdir -p`; report BLOCKED if still failing |

## Completion Status

After report generation, output skill completion status:

| Status | Condition |
|--------|-----------|
| DONE | All phases completed, report generated, gate PASS |
| DONE_WITH_CONCERNS | Report generated but gate WARN or FAIL, or regression detected |
| BLOCKED | Phase data missing or corrupted, cannot calculate score |
