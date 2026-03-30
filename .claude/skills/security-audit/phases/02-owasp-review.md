# Phase 2: OWASP Review

Systematic code-level review against OWASP Top 10 2021 categories.

## Objective

- Review codebase against all 10 OWASP Top 10 2021 categories
- Use CCW CLI multi-model analysis for comprehensive coverage
- Produce structured findings with file:line references and remediation steps

## Prerequisites

- Phase 1 supply-chain-report.json (provides dependency context)
- Read [specs/owasp-checklist.md](../specs/owasp-checklist.md) for detection patterns

## Execution Steps

### Step 1: Identify Target Scope

```bash
# Identify source directories (exclude deps, build, test fixtures)
# Focus on: API routes, auth modules, data access, input handlers
find . -type f \( -name '*.ts' -o -name '*.js' -o -name '*.py' -o -name '*.go' -o -name '*.java' \) \
  ! -path '*/node_modules/*' ! -path '*/dist/*' ! -path '*/.git/*' \
  ! -path '*/build/*' ! -path '*/__pycache__/*' ! -path '*/vendor/*' \
  | head -200
```

### Step 2: CCW CLI Analysis

Run multi-model security analysis using the security risks rule template.

```bash
ccw cli -p "PURPOSE: OWASP Top 10 2021 security audit of this codebase.
Systematically check each OWASP category:
A01 Broken Access Control | A02 Cryptographic Failures | A03 Injection |
A04 Insecure Design | A05 Security Misconfiguration | A06 Vulnerable Components |
A07 Identification/Auth Failures | A08 Software/Data Integrity Failures |
A09 Security Logging/Monitoring Failures | A10 SSRF

TASK: For each OWASP category, scan relevant code patterns, identify vulnerabilities with file:line references, classify severity, provide remediation.

MODE: analysis

CONTEXT: @src/**/* @**/*.config.* @**/*.env.example

EXPECTED: JSON-structured findings per OWASP category with severity, file:line, evidence, remediation.

CONSTRAINTS: Code-level analysis only | Every finding must have file:line reference | Focus on real vulnerabilities not theoretical risks
" --tool gemini --mode analysis --rule analysis-assess-security-risks
```

### Step 3: Manual Pattern Scanning

Supplement CLI analysis with targeted pattern scans per OWASP category. Reference [specs/owasp-checklist.md](../specs/owasp-checklist.md) for full pattern list.

**A01 - Broken Access Control**:
```bash
# Missing auth middleware on routes
grep -rn 'app\.\(get\|post\|put\|delete\|patch\)(' --include='*.ts' --include='*.js' . | grep -v 'auth\|middleware\|protect'
# Direct object references without ownership check
grep -rn 'params\.id\|req\.params\.' --include='*.ts' --include='*.js' . || true
```

**A03 - Injection**:
```bash
# SQL string concatenation
grep -rniE '(query|execute|raw)\s*\(\s*[`"'\'']\s*SELECT.*\+\s*|f".*SELECT.*{' --include='*.ts' --include='*.js' --include='*.py' . || true
# Command injection
grep -rniE '(exec|spawn|system|popen|subprocess)\s*\(' --include='*.ts' --include='*.js' --include='*.py' . || true
```

**A05 - Security Misconfiguration**:
```bash
# Debug mode enabled
grep -rniE '(DEBUG|debug)\s*[:=]\s*(true|True|1|"true")' --include='*.env' --include='*.py' --include='*.ts' --include='*.json' . || true
# CORS wildcard
grep -rniE "cors.*\*|Access-Control-Allow-Origin.*\*" --include='*.ts' --include='*.js' --include='*.py' . || true
```

**A07 - Identification and Authentication Failures**:
```bash
# Weak password patterns
grep -rniE 'password.*length.*[0-5][^0-9]|minlength.*[0-5][^0-9]' --include='*.ts' --include='*.js' --include='*.py' . || true
# Hardcoded credentials
grep -rniE '(password|passwd|pwd)\s*[:=]\s*["\x27][^"\x27]{3,}' --include='*.ts' --include='*.js' --include='*.py' --include='*.env' . || true
```

### Step 4: Consolidate Findings

Merge CLI analysis results and manual pattern scan results. Deduplicate and classify by OWASP category.

## OWASP Top 10 2021 Categories

| ID | Category | Key Checks |
|----|----------|------------|
| A01 | Broken Access Control | Missing auth, IDOR, path traversal, CORS |
| A02 | Cryptographic Failures | Weak algorithms, plaintext storage, missing TLS |
| A03 | Injection | SQL, NoSQL, OS command, LDAP, XPath injection |
| A04 | Insecure Design | Missing threat modeling, insecure business logic |
| A05 | Security Misconfiguration | Debug enabled, default creds, verbose errors |
| A06 | Vulnerable and Outdated Components | Known CVEs in dependencies (from Phase 1) |
| A07 | Identification and Authentication Failures | Weak passwords, missing MFA, session issues |
| A08 | Software and Data Integrity Failures | Unsigned updates, insecure deserialization, CI/CD |
| A09 | Security Logging and Monitoring Failures | Missing audit logs, no alerting, insufficient logging |
| A10 | Server-Side Request Forgery (SSRF) | Unvalidated URLs, internal resource access |

## Output

- **File**: `owasp-findings.json`
- **Location**: `${WORK_DIR}/owasp-findings.json`
- **Format**: JSON

```json
{
  "phase": "owasp-review",
  "timestamp": "ISO-8601",
  "owasp_version": "2021",
  "findings": [
    {
      "owasp_id": "A01",
      "owasp_category": "Broken Access Control",
      "severity": "critical|high|medium|low",
      "title": "Finding title",
      "description": "Detailed description",
      "file": "path/to/file",
      "line": 42,
      "evidence": "code snippet or pattern match",
      "remediation": "Specific fix recommendation",
      "cwe": "CWE-XXX"
    }
  ],
  "coverage": {
    "A01": "checked|not_applicable",
    "A02": "checked|not_applicable",
    "A03": "checked|not_applicable",
    "A04": "checked|not_applicable",
    "A05": "checked|not_applicable",
    "A06": "checked|not_applicable",
    "A07": "checked|not_applicable",
    "A08": "checked|not_applicable",
    "A09": "checked|not_applicable",
    "A10": "checked|not_applicable"
  },
  "summary": {
    "total": 0,
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
    "categories_checked": 10,
    "categories_with_findings": 0
  }
}
```

## Next Phase

Proceed to [Phase 3: Threat Modeling](03-threat-modeling.md) with OWASP findings as input for STRIDE analysis.
