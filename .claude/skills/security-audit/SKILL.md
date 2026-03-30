---
name: security-audit
description: OWASP Top 10 and STRIDE security auditing with supply chain analysis. Triggers on "security audit", "security scan", "cso".
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Security Audit

4-phase security audit covering supply chain risks, OWASP Top 10 code review, STRIDE threat modeling, and trend-tracked reporting. Produces structured JSON findings in `.workflow/.security/`.

## Architecture Overview

```
+-------------------------------------------------------------------+
|  Phase 1: Supply Chain Scan                                       |
|  -> Dependency audit, secrets detection, CI/CD review, LLM risks  |
|  -> Output: supply-chain-report.json                              |
+-----------------------------------+-------------------------------+
                                    |
+-----------------------------------v-------------------------------+
|  Phase 2: OWASP Review                                           |
|  -> OWASP Top 10 2021 code-level analysis via ccw cli            |
|  -> Output: owasp-findings.json                                  |
+-----------------------------------+-------------------------------+
                                    |
+-----------------------------------v-------------------------------+
|  Phase 3: Threat Modeling (STRIDE)                                |
|  -> 6 threat categories mapped to architecture components         |
|  -> Output: threat-model.json                                    |
+-----------------------------------+-------------------------------+
                                    |
+-----------------------------------v-------------------------------+
|  Phase 4: Report & Tracking                                      |
|  -> Score calculation, trend comparison, dated report             |
|  -> Output: .workflow/.security/audit-report-{date}.json         |
+-------------------------------------------------------------------+
```

## Key Design Principles

1. **Infrastructure-first**: Phase 1 catches low-hanging fruit (leaked secrets, vulnerable deps) before deeper analysis
2. **Standards-based**: OWASP Top 10 2021 and STRIDE provide systematic coverage
3. **Scoring gates**: Daily quick-scan must score 8/10; comprehensive audit minimum 2/10 for initial baseline
4. **Trend tracking**: Each audit compares against prior results in `.workflow/.security/`

## Execution Flow

### Quick-Scan Mode (daily)

Run Phase 1 only. Must score >= 8/10 to pass.

### Comprehensive Mode (full audit)

Run all 4 phases sequentially. Initial baseline minimum 2/10.

### Phase Sequence

1. **Phase 1: Supply Chain Scan** -- [phases/01-supply-chain-scan.md](phases/01-supply-chain-scan.md)
   - Dependency audit (npm audit / pip-audit / safety check)
   - Secrets detection (API keys, tokens, passwords in source)
   - CI/CD config review (injection risks in workflow YAML)
   - LLM/AI prompt injection check
2. **Phase 2: OWASP Review** -- [phases/02-owasp-review.md](phases/02-owasp-review.md)
   - Systematic OWASP Top 10 2021 code review
   - Uses `ccw cli --tool gemini --mode analysis --rule analysis-assess-security-risks`
3. **Phase 3: Threat Modeling** -- [phases/03-threat-modeling.md](phases/03-threat-modeling.md)
   - STRIDE threat model mapped to architecture components
   - Trust boundary identification and attack surface assessment
4. **Phase 4: Report & Tracking** -- [phases/04-report-tracking.md](phases/04-report-tracking.md)
   - Score calculation with severity weights
   - Trend comparison with previous audits
   - Date-stamped report to `.workflow/.security/`

## Scoring Overview

See [specs/scoring-gates.md](specs/scoring-gates.md) for full specification.

| Severity | Weight | Example |
|----------|--------|---------|
| Critical | 10 | RCE, SQL injection, leaked credentials |
| High | 7 | Broken auth, SSRF, privilege escalation |
| Medium | 4 | XSS, CSRF, verbose error messages |
| Low | 1 | Missing headers, informational disclosures |

**Gates**: Daily quick-scan >= 8/10, Comprehensive initial >= 2/10.

## Directory Setup

```bash
mkdir -p .workflow/.security
WORK_DIR=".workflow/.security"
```

## Output Structure

```
.workflow/.security/
  audit-report-{YYYY-MM-DD}.json    # Dated audit report
  supply-chain-report.json           # Latest supply chain scan
  owasp-findings.json                # Latest OWASP findings
  threat-model.json                  # Latest STRIDE threat model
```

## Reference Documents

| Document | Purpose |
|----------|---------|
| [phases/01-supply-chain-scan.md](phases/01-supply-chain-scan.md) | Dependency, secrets, CI/CD, LLM risk scan |
| [phases/02-owasp-review.md](phases/02-owasp-review.md) | OWASP Top 10 2021 code review |
| [phases/03-threat-modeling.md](phases/03-threat-modeling.md) | STRIDE threat modeling |
| [phases/04-report-tracking.md](phases/04-report-tracking.md) | Report generation and trend tracking |
| [specs/scoring-gates.md](specs/scoring-gates.md) | Scoring system and quality gates |
| [specs/owasp-checklist.md](specs/owasp-checklist.md) | OWASP Top 10 detection patterns |

## Completion Status Protocol

This skill follows the Completion Status Protocol defined in `_shared/SKILL-DESIGN-SPEC.md` sections 13-14.

Possible termination statuses:
- **DONE**: All phases completed, score calculated, report generated
- **DONE_WITH_CONCERNS**: Audit completed but findings exceed acceptable thresholds
- **BLOCKED**: Required tools unavailable (e.g., npm/pip not installed), permission denied
- **NEEDS_CONTEXT**: Ambiguous project scope, unclear trust boundaries

Escalation follows the Three-Strike Rule (section 14) per step.
