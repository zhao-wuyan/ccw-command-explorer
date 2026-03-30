# Phase 1: Supply Chain Scan

> **COMPACT PROTECTION**: This is a core execution phase. If context compression has occurred and this file is only a summary, **MUST `Read` this file again before executing any Step**. Do not execute from memory.

Detect low-hanging security risks in third-party dependencies, hardcoded secrets, CI/CD pipelines, and LLM/AI integrations.

## Objective

- Audit third-party dependencies for known vulnerabilities
- Scan source code for leaked secrets and credentials
- Review CI/CD configuration for injection risks
- Check for LLM/AI prompt injection vulnerabilities

## Input

| Source | Required | Description |
|--------|----------|-------------|
| Project root | Yes | Working directory containing source files and dependency manifests |
| WORK_DIR | Yes | `.workflow/.security` — output directory (create if not exists) |

## Execution Steps

### Step 1: Dependency Audit

Detect package manager and run appropriate audit tool.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| `package-lock.json` or `yarn.lock` present | Run `npm audit --json` |
| `requirements.txt` or `pyproject.toml` present | Run `pip-audit --format json`; fallback `safety check --json` |
| `go.sum` present | Run `govulncheck ./...` |
| No manifest files found | Log INFO finding: "No dependency manifests detected"; continue |
| Audit tool not installed | Log INFO finding: "<tool> not installed — manual review needed"; continue |

**Execution**:

```bash
# Ensure output directory exists
mkdir -p .workflow/.security
WORK_DIR=".workflow/.security"

# Node.js projects
if [ -f package-lock.json ] || [ -f yarn.lock ]; then
  npm audit --json > "${WORK_DIR}/npm-audit-raw.json" 2>&1 || true
fi

# Python projects
if [ -f requirements.txt ] || [ -f pyproject.toml ]; then
  pip-audit --format json --output "${WORK_DIR}/pip-audit-raw.json" 2>&1 || true
  # Fallback: safety check
  safety check --json > "${WORK_DIR}/safety-raw.json" 2>&1 || true
fi

# Go projects
if [ -f go.sum ]; then
  govulncheck ./... 2>&1 | tee "${WORK_DIR}/govulncheck-raw.txt" || true
fi
```

---

### Step 2: Secrets Detection

Scan source files for hardcoded secrets using regex patterns. Exclude generated, compiled, and dependency directories.

**Decision Table**:

| Match Type | Severity | Category |
|------------|----------|----------|
| API key / token with 16+ chars | Critical | secret |
| AWS AKIA key pattern | Critical | secret |
| Private key PEM block | Critical | secret |
| DB connection string with embedded password | Critical | secret |
| Hardcoded JWT token | High | secret |
| No matches | — | No finding |

**Execution**:

```bash
# High-confidence patterns (case-insensitive)
grep -rniE \
  '(api[_-]?key|api[_-]?secret|access[_-]?token|auth[_-]?token|secret[_-]?key)\s*[:=]\s*["\x27][A-Za-z0-9+/=_-]{16,}' \
  --include='*.ts' --include='*.js' --include='*.py' --include='*.go' \
  --include='*.java' --include='*.rb' --include='*.env' --include='*.yml' \
  --include='*.yaml' --include='*.json' --include='*.toml' --include='*.cfg' \
  . || true

# AWS patterns
grep -rniE '(AKIA[0-9A-Z]{16}|aws[_-]?secret[_-]?access[_-]?key)' . || true

# Private keys
grep -rniE '-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----' . || true

# Connection strings with passwords
grep -rniE '(mongodb|postgres|mysql|redis)://[^:]+:[^@]+@' . || true

# JWT tokens (hardcoded)
grep -rniE 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}' . || true
```

Exclude from scan: `node_modules/`, `.git/`, `dist/`, `build/`, `__pycache__/`, `*.lock`, `*.min.js`.

Redact actual matched secret values in findings — use `[REDACTED]` in evidence field.

---

### Step 3: CI/CD Config Review

Check GitHub Actions and other CI/CD configurations for injection risks.

**Decision Table**:

| Pattern Found | Severity | Finding |
|---------------|----------|---------|
| `${{ github.event.` in `run:` block | High | Expression injection in workflow run step |
| `pull_request_target` with checkout of PR code | High | Privileged workflow triggered by untrusted code |
| `actions/checkout@v1` or `@v2` | Medium | Deprecated action version with known issues |
| `secrets.` passed to untrusted context | High | Secret exposure risk |
| No `.github/workflows/` directory | — | Not applicable; skip |

**Execution**:

```bash
# Find workflow files
find .github/workflows -name '*.yml' -o -name '*.yaml' 2>/dev/null

# Check for expression injection in run: blocks
# Dangerous: ${{ github.event.pull_request.title }} in run:
grep -rn '\${{.*github\.event\.' .github/workflows/ 2>/dev/null || true

# Check for pull_request_target with checkout of PR code
grep -rn 'pull_request_target' .github/workflows/ 2>/dev/null || true

# Check for use of deprecated/vulnerable actions
grep -rn 'actions/checkout@v1\|actions/checkout@v2' .github/workflows/ 2>/dev/null || true

# Check for secrets passed to untrusted contexts
grep -rn 'secrets\.' .github/workflows/ 2>/dev/null || true
```

---

### Step 4: LLM/AI Prompt Injection Check

Scan for patterns indicating prompt injection risk in LLM integrations.

**Decision Table**:

| Pattern Found | Severity | Finding |
|---------------|----------|---------|
| User input directly concatenated into prompt/system_message | High | LLM prompt injection vector |
| User input in template string passed to LLM call | High | LLM prompt injection via template |
| f-string with user data in `.complete`/`.generate` call | High | Python LLM prompt injection |
| LLM API call detected, no injection pattern | Low | LLM integration present — review for sanitization |

**Execution**:

```bash
# User input concatenated directly into prompts
grep -rniE '(prompt|system_message|messages)\s*[+=].*\b(user_input|request\.(body|query|params)|req\.)' \
  --include='*.ts' --include='*.js' --include='*.py' . || true

# Template strings with user data in LLM calls
grep -rniE '(openai|anthropic|llm|chat|completion)\.' \
  --include='*.ts' --include='*.js' --include='*.py' . || true

# Check for missing input sanitization before LLM calls
grep -rniE 'f".*{.*}.*".*\.(chat|complete|generate)' \
  --include='*.py' . || true
```

---

## Output

| Artifact | Format | Description |
|----------|--------|-------------|
| `.workflow/.security/supply-chain-report.json` | JSON | All supply chain findings with severity classifications |

```json
{
  "phase": "supply-chain-scan",
  "timestamp": "ISO-8601",
  "findings": [
    {
      "category": "dependency|secret|cicd|llm",
      "severity": "critical|high|medium|low",
      "title": "Finding title",
      "description": "Detailed description",
      "file": "path/to/file",
      "line": 42,
      "evidence": "matched text or context",
      "remediation": "How to fix"
    }
  ],
  "summary": {
    "total": 0,
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
    "by_category": { "dependency": 0, "secret": 0, "cicd": 0, "llm": 0 }
  }
}
```

## Success Criteria

| Criterion | Validation Method |
|-----------|-------------------|
| All 4 scan steps executed or explicitly skipped with reason | Review step execution log |
| `supply-chain-report.json` written to `.workflow/.security/` | File exists and is valid JSON |
| All findings have category, severity, file, evidence, remediation | JSON schema check |
| Secret values redacted in evidence field | No raw credential values in output |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Audit tool not installed | Log INFO finding; continue with remaining steps |
| `grep` finds no matches | No finding generated for that pattern; continue |
| `.github/workflows/` does not exist | Mark CI/CD step as not_applicable; continue |
| Write to WORK_DIR fails | Attempt `mkdir -p .workflow/.security` and retry once |

## Next Phase

-> [Phase 2: OWASP Review](02-owasp-review.md)
