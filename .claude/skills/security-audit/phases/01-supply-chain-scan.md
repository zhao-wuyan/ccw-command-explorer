# Phase 1: Supply Chain Scan

Detect low-hanging security risks in dependencies, secrets, CI/CD pipelines, and LLM/AI integrations.

## Objective

- Audit third-party dependencies for known vulnerabilities
- Scan source code for leaked secrets and credentials
- Review CI/CD configuration for injection risks
- Check for LLM/AI prompt injection vulnerabilities

## Execution Steps

### Step 1: Dependency Audit

Detect package manager and run appropriate audit tool.

```bash
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

If audit tools are not installed, log as INFO finding and continue.

### Step 2: Secrets Detection

Scan source files for hardcoded secrets using regex patterns.

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

Exclude: `node_modules/`, `.git/`, `dist/`, `build/`, `__pycache__/`, `*.lock`, `*.min.js`.

### Step 3: CI/CD Config Review

Check GitHub Actions and other CI/CD configs for injection risks.

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

### Step 4: LLM/AI Prompt Injection Check

Scan for patterns indicating prompt injection risk in LLM integrations.

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

## Output

- **File**: `supply-chain-report.json`
- **Location**: `${WORK_DIR}/supply-chain-report.json`
- **Format**: JSON

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

## Next Phase

Proceed to [Phase 2: OWASP Review](02-owasp-review.md) with supply chain findings as context.
