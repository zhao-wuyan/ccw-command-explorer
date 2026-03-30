# Phase 4: Report & Tracking

Generate scored audit report, compare with previous audits, and track trends.

## Objective

- Calculate security score from all phase findings
- Compare with previous audit results (if available)
- Generate date-stamped report in `.workflow/.security/`
- Track improvement or regression trends

## Prerequisites

- Phase 1: `supply-chain-report.json`
- Phase 2: `owasp-findings.json`
- Phase 3: `threat-model.json`
- Previous audit: `.workflow/.security/audit-report-*.json` (optional)

## Execution Steps

### Step 1: Aggregate Findings

Collect all findings from phases 1-3 and classify by severity.

```
All findings =
  supply-chain-report.findings
  + owasp-findings.findings
  + threat-model threats (where gaps exist)
```

### Step 2: Calculate Score

Apply scoring formula from [specs/scoring-gates.md](../specs/scoring-gates.md):

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

**Score interpretation**:

| Score | Rating | Meaning |
|-------|--------|---------|
| 9-10 | Excellent | Minimal risk, production-ready |
| 7-8 | Good | Acceptable risk, minor improvements needed |
| 5-6 | Fair | Notable risks, remediation recommended |
| 3-4 | Poor | Significant risks, remediation required |
| 0-2 | Critical | Severe vulnerabilities, immediate action needed |

### Step 3: Gate Evaluation

**Daily quick-scan gate** (Phase 1 only):
- PASS: score >= 8/10
- FAIL: score < 8/10 -- block deployment or flag for review

**Comprehensive audit gate** (all phases):
- For initial/baseline: PASS if score >= 2/10 (establishes baseline)
- For subsequent: PASS if score >= previous_score (no regression)
- Target: score >= 7/10 for production readiness

### Step 4: Trend Comparison

```bash
# Find previous audit reports
ls -t .workflow/.security/audit-report-*.json 2>/dev/null | head -5
```

Compare current vs. previous:
- Delta per OWASP category
- Delta per STRIDE category
- New findings vs. resolved findings
- Overall score trend

### Step 5: Generate Report

Write the final report with all consolidated data.

## Output

- **File**: `audit-report-{YYYY-MM-DD}.json`
- **Location**: `.workflow/.security/audit-report-{YYYY-MM-DD}.json`
- **Format**: JSON

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

## Report Storage

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

## Completion

After report generation, output skill completion status per the Completion Status Protocol:

- **DONE**: All phases completed, report generated, score calculated
- **DONE_WITH_CONCERNS**: Report generated but score below target or regression detected
- **BLOCKED**: Phase data missing or corrupted
