# Scoring Gates

Defines the 10-point scoring system, severity weights, quality gates, and trend tracking format for security audits.

## When to Use

| Phase | Usage | Section |
|-------|-------|---------|
| Phase 1 | Quick-scan scoring (daily gate) | Severity Weights, Daily Gate |
| Phase 4 | Full audit scoring and reporting | All sections |

---

## 10-Point Scale

All security audit scores are on a 0-10 scale where 10 = no findings and 0 = critical exposure.

| Score | Rating | Description |
|-------|--------|-------------|
| 9.0 - 10.0 | Excellent | Minimal risk. Production-ready without reservations. |
| 7.0 - 8.9 | Good | Low risk. Acceptable for production with minor improvements. |
| 5.0 - 6.9 | Fair | Moderate risk. Remediation recommended before production. |
| 3.0 - 4.9 | Poor | High risk. Remediation required. Not production-ready. |
| 0.0 - 2.9 | Critical | Severe exposure. Immediate action required. |

## Severity Weights

Each finding is weighted by severity for score calculation.

| Severity | Weight | Criteria | Examples |
|----------|--------|----------|----------|
| **Critical** | 10 | Exploitable with high impact, no user interaction needed | RCE, SQL injection with data access, leaked production credentials, auth bypass |
| **High** | 7 | Exploitable with significant impact, may need user interaction | Broken authentication, SSRF, privilege escalation, XSS with session theft |
| **Medium** | 4 | Limited exploitability or moderate impact | Reflected XSS, CSRF, verbose error messages, missing security headers |
| **Low** | 1 | Informational or minimal impact | Missing best-practice headers, minor info disclosure, deprecated dependencies without known exploit |

## Score Calculation

```
Input:
  findings[]     -- array of all findings with severity
  files_scanned  -- total source files analyzed

Algorithm:
  base_score = 10.0
  normalization = max(10, files_scanned)

  weighted_sum = 0
  for each finding:
    weighted_sum += severity_weight(finding.severity)

  penalty = weighted_sum / normalization
  final_score = max(0, base_score - penalty)
  final_score = round(final_score, 1)

  return final_score
```

**Example**:

| Findings | Files Scanned | Weighted Sum | Penalty | Score |
|----------|--------------|--------------|---------|-------|
| 1 critical | 50 | 10 | 0.2 | 9.8 |
| 2 critical, 3 high | 50 | 41 | 0.82 | 9.2 |
| 5 critical, 10 high | 50 | 120 | 2.4 | 7.6 |
| 10 critical, 20 high, 15 medium | 100 | 300 | 3.0 | 7.0 |
| 20 critical | 20 | 200 | 10.0 | 0.0 |

## Quality Gates

### Daily Quick-Scan Gate

Applies to Phase 1 (Supply Chain Scan) only.

| Result | Condition | Action |
|--------|-----------|--------|
| **PASS** | score >= 8.0 | Continue. No blocking issues. |
| **WARN** | 6.0 <= score < 8.0 | Log warning. Review findings before deploy. |
| **FAIL** | score < 6.0 | Block deployment. Remediate critical/high findings. |

### Comprehensive Audit Gate

Applies to full audit (all 4 phases).

**Initial/Baseline audit** (no previous audit exists):

| Result | Condition | Action |
|--------|-----------|--------|
| **PASS** | score >= 2.0 | Baseline established. Plan remediation. |
| **FAIL** | score < 2.0 | Critical exposure. Immediate triage required. |

**Subsequent audits** (previous audit exists):

| Result | Condition | Action |
|--------|-----------|--------|
| **PASS** | score >= previous_score | No regression. Continue improvement. |
| **WARN** | score within 0.5 of previous | Marginal change. Review new findings. |
| **FAIL** | score < previous_score - 0.5 | Regression detected. Investigate new findings. |

**Production readiness target**: score >= 7.0

## Trend Tracking Format

Each audit report stores trend data for comparison.

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

**Direction values**:

| Direction | Condition |
|-----------|-----------|
| `improving` | score_delta > 0.5 |
| `stable` | -0.5 <= score_delta <= 0.5 |
| `regressing` | score_delta < -0.5 |
| `baseline` | No previous audit exists |

## Finding Deduplication

When the same vulnerability appears in multiple phases:
1. Keep the highest-severity classification
2. Merge evidence from all phases
3. Count as a single finding for scoring
4. Note all phases that detected it
