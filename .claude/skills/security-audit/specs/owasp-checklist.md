# OWASP Top 10 2021 Checklist

Code-level detection patterns, vulnerable code examples, and remediation templates for each OWASP category.

## When to Use

| Phase | Usage | Section |
|-------|-------|---------|
| Phase 2 | Reference during OWASP code review | All categories |
| Phase 4 | Classify findings by OWASP category | Category IDs |

---

## A01: Broken Access Control

**CWE**: CWE-200, CWE-284, CWE-285, CWE-352, CWE-639

### Detection Patterns

```bash
# Missing auth middleware on route handlers
grep -rnE 'app\.(get|post|put|delete|patch)\s*\(\s*["\x27/]' --include='*.ts' --include='*.js' .
# Then verify each route has auth middleware

# Direct object reference without ownership check
grep -rnE 'findById\(.*params|findOne\(.*params|\.get\(.*id' --include='*.ts' --include='*.js' --include='*.py' .

# Path traversal patterns
grep -rnE '(readFile|writeFile|createReadStream|open)\s*\(.*req\.' --include='*.ts' --include='*.js' .
grep -rnE 'os\.path\.join\(.*request\.' --include='*.py' .

# Missing CORS restrictions
grep -rnE 'Access-Control-Allow-Origin.*\*|cors\(\s*\)' --include='*.ts' --include='*.js' .
```

### Vulnerable Code Example

```javascript
// BAD: No ownership check
app.get('/api/documents/:id', auth, async (req, res) => {
  const doc = await Document.findById(req.params.id);  // Any user can access any doc
  res.json(doc);
});
```

### Remediation

```javascript
// GOOD: Ownership check
app.get('/api/documents/:id', auth, async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.user.id });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});
```

---

## A02: Cryptographic Failures

**CWE**: CWE-259, CWE-327, CWE-331, CWE-798

### Detection Patterns

```bash
# Weak hash algorithms
grep -rniE '(md5|sha1)\s*\(' --include='*.ts' --include='*.js' --include='*.py' --include='*.java' .

# Plaintext password storage
grep -rniE 'password\s*[:=]\s*.*\.(body|query|params)' --include='*.ts' --include='*.js' .

# Hardcoded encryption keys
grep -rniE '(encrypt|cipher|secret|key)\s*[:=]\s*["\x27][A-Za-z0-9+/=]{8,}' --include='*.ts' --include='*.js' --include='*.py' .

# HTTP (not HTTPS) for sensitive operations
grep -rniE 'http://.*\.(api|auth|login|payment)' --include='*.ts' --include='*.js' --include='*.py' .

# Missing encryption at rest
grep -rniE '(password|ssn|credit.?card|social.?security)' --include='*.sql' --include='*.prisma' --include='*.schema' .
```

### Vulnerable Code Example

```python
# BAD: MD5 for password hashing
import hashlib
password_hash = hashlib.md5(password.encode()).hexdigest()
```

### Remediation

```python
# GOOD: bcrypt with proper work factor
import bcrypt
password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
```

---

## A03: Injection

**CWE**: CWE-20, CWE-74, CWE-79, CWE-89

### Detection Patterns

```bash
# SQL string concatenation/interpolation
grep -rniE "(query|execute|raw)\s*\(\s*[\`\"'].*(\+|\$\{|%s|\.format)" --include='*.ts' --include='*.js' --include='*.py' .
grep -rniE "f[\"'].*SELECT.*\{" --include='*.py' .

# NoSQL injection
grep -rniE '\$where|\$regex.*req\.' --include='*.ts' --include='*.js' .
grep -rniE 'find\(\s*\{.*req\.(body|query|params)' --include='*.ts' --include='*.js' .

# OS command injection
grep -rniE '(child_process|exec|execSync|spawn|system|popen|subprocess)\s*\(.*req\.' --include='*.ts' --include='*.js' --include='*.py' .

# XPath/LDAP injection
grep -rniE '(xpath|ldap).*\+.*req\.' --include='*.ts' --include='*.js' --include='*.py' .

# Template injection
grep -rniE '(render_template_string|Template\(.*req\.|eval\(.*req\.)' --include='*.py' --include='*.js' .
```

### Vulnerable Code Example

```javascript
// BAD: SQL string concatenation
const result = await db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);
```

### Remediation

```javascript
// GOOD: Parameterized query
const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
```

---

## A04: Insecure Design

**CWE**: CWE-209, CWE-256, CWE-501, CWE-522

### Detection Patterns

```bash
# Missing rate limiting on auth endpoints
grep -rniE '(login|register|reset.?password|forgot.?password)' --include='*.ts' --include='*.js' --include='*.py' .
# Then check if rate limiting middleware is applied

# No account lockout mechanism
grep -rniE 'failed.?login|login.?attempt|max.?retries' --include='*.ts' --include='*.js' --include='*.py' .

# Business logic without validation
grep -rniE '(transfer|withdraw|purchase|delete.?account)' --include='*.ts' --include='*.js' --include='*.py' .
# Then check for confirmation/validation steps
```

### Checks

- [ ] Authentication flows have rate limiting
- [ ] Account lockout after N failed attempts
- [ ] Multi-step operations have proper state validation
- [ ] Business-critical operations require confirmation
- [ ] Threat modeling has been performed (see Phase 3)

### Remediation

Implement defense-in-depth: rate limiting, input validation, business logic validation, and multi-step confirmation for critical operations.

---

## A05: Security Misconfiguration

**CWE**: CWE-2, CWE-11, CWE-13, CWE-15, CWE-16, CWE-388

### Detection Patterns

```bash
# Debug mode enabled
grep -rniE '(DEBUG|NODE_ENV)\s*[:=]\s*(true|True|1|"development"|"debug")' \
  --include='*.env' --include='*.env.*' --include='*.py' --include='*.json' --include='*.yaml' .

# Default credentials
grep -rniE '(admin|root|test|default).*[:=].*password' --include='*.env' --include='*.yaml' --include='*.json' --include='*.py' .

# Verbose error responses (stack traces to client)
grep -rniE '(stack|stackTrace|traceback).*res\.(json|send)|app\.use.*err.*stack' --include='*.ts' --include='*.js' .

# Missing security headers
grep -rniE '(helmet|X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)' --include='*.ts' --include='*.js' .

# Directory listing enabled
grep -rniE 'autoindex\s+on|directory.?listing|serveStatic.*index.*false' --include='*.conf' --include='*.ts' --include='*.js' .

# Unnecessary features/services
grep -rniE '(graphiql|playground|swagger-ui).*true' --include='*.ts' --include='*.js' --include='*.py' --include='*.yaml' .
```

### Vulnerable Code Example

```javascript
// BAD: Stack trace in error response
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});
```

### Remediation

```javascript
// GOOD: Generic error response in production
app.use((err, req, res, next) => {
  console.error(err.stack);  // Log internally
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## A06: Vulnerable and Outdated Components

**CWE**: CWE-1104

### Detection Patterns

```bash
# Check dependency lock files age
ls -la package-lock.json yarn.lock requirements.txt Pipfile.lock go.sum 2>/dev/null

# Run package audits (from Phase 1)
npm audit --json 2>/dev/null
pip-audit --format json 2>/dev/null

# Check for pinned vs unpinned dependencies
grep -E ':\s*"\^|:\s*"~|:\s*"\*|>=\s' package.json 2>/dev/null
grep -E '^[a-zA-Z].*[^=]==[^=]' requirements.txt 2>/dev/null  # Good: pinned
grep -E '^[a-zA-Z].*>=|^[a-zA-Z][^=]*$' requirements.txt 2>/dev/null  # Bad: unpinned
```

### Checks

- [ ] All dependencies have pinned versions
- [ ] No known CVEs in dependencies (via audit tools)
- [ ] Dependencies are actively maintained (not abandoned)
- [ ] Lock files are committed to version control

### Remediation

Run `npm audit fix` or `pip install --upgrade` for vulnerable packages. Pin all dependency versions. Set up automated dependency scanning (Dependabot, Renovate).

---

## A07: Identification and Authentication Failures

**CWE**: CWE-255, CWE-259, CWE-287, CWE-384

### Detection Patterns

```bash
# Weak password requirements
grep -rniE 'password.*length.*[0-5]|minlength.*[0-5]|min.?length.*[0-5]' --include='*.ts' --include='*.js' --include='*.py' .

# Missing password hashing
grep -rniE 'password\s*[:=].*req\.' --include='*.ts' --include='*.js' .
# Then check if bcrypt/argon2/scrypt is used before storage

# Session fixation (no rotation after login)
grep -rniE 'session\.regenerate|session\.id\s*=' --include='*.ts' --include='*.js' .

# JWT without expiration
grep -rniE 'jwt\.sign\(' --include='*.ts' --include='*.js' .
# Then check for expiresIn option

# Credentials in URL
grep -rniE '(token|key|password|secret)=[^&\s]+' --include='*.ts' --include='*.js' --include='*.py' .
```

### Vulnerable Code Example

```javascript
// BAD: JWT without expiration
const token = jwt.sign({ userId: user.id }, SECRET);
```

### Remediation

```javascript
// GOOD: JWT with expiration and proper claims
const token = jwt.sign(
  { userId: user.id, role: user.role },
  SECRET,
  { expiresIn: '1h', issuer: 'myapp', audience: 'myapp-client' }
);
```

---

## A08: Software and Data Integrity Failures

**CWE**: CWE-345, CWE-353, CWE-426, CWE-494, CWE-502

### Detection Patterns

```bash
# Insecure deserialization
grep -rniE '(pickle\.load|yaml\.load\(|unserialize|JSON\.parse\(.*req\.|eval\()' --include='*.py' --include='*.ts' --include='*.js' --include='*.php' .

# Missing integrity checks on downloads/updates
grep -rniE '(download|fetch|curl|wget)' --include='*.sh' --include='*.yaml' --include='*.yml' .
# Then check for checksum/signature verification

# CI/CD pipeline without pinned action versions
grep -rniE 'uses:\s*[^@]+$|uses:.*@(main|master|latest)' .github/workflows/*.yml 2>/dev/null

# Unsafe YAML loading
grep -rniE 'yaml\.load\(' --include='*.py' .
# Should be yaml.safe_load()
```

### Vulnerable Code Example

```python
# BAD: Unsafe YAML loading
import yaml
data = yaml.load(user_input)  # Allows arbitrary code execution
```

### Remediation

```python
# GOOD: Safe YAML loading
import yaml
data = yaml.safe_load(user_input)
```

---

## A09: Security Logging and Monitoring Failures

**CWE**: CWE-223, CWE-532, CWE-778

### Detection Patterns

```bash
# Check for logging of auth events
grep -rniE '(log|logger|logging)\.' --include='*.ts' --include='*.js' --include='*.py' .
# Then check if login/logout/failed-auth events are logged

# Sensitive data in logs
grep -rniE 'log.*(password|token|secret|credit.?card|ssn)' --include='*.ts' --include='*.js' --include='*.py' .

# Empty catch blocks (swallowed errors)
grep -rniE 'catch\s*\([^)]*\)\s*\{\s*\}' --include='*.ts' --include='*.js' .

# Missing audit trail for critical operations
grep -rniE '(delete|update|create|transfer)' --include='*.ts' --include='*.js' --include='*.py' .
# Then check if these operations are logged with user context
```

### Checks

- [ ] Failed login attempts are logged with IP and timestamp
- [ ] Successful logins are logged
- [ ] Access control failures are logged
- [ ] Input validation failures are logged
- [ ] Sensitive data is NOT logged (passwords, tokens, PII)
- [ ] Logs include sufficient context (who, what, when, where)

### Remediation

Implement structured logging with: user ID, action, timestamp, IP address, result (success/failure). Exclude sensitive data. Set up log monitoring and alerting for anomalous patterns.

---

## A10: Server-Side Request Forgery (SSRF)

**CWE**: CWE-918

### Detection Patterns

```bash
# User-controlled URLs in fetch/request calls
grep -rniE '(fetch|axios|http\.request|requests\.(get|post)|urllib)\s*\(.*req\.(body|query|params)' \
  --include='*.ts' --include='*.js' --include='*.py' .

# URL construction from user input
grep -rniE '(url|endpoint|target|redirect)\s*[:=].*req\.(body|query|params)' --include='*.ts' --include='*.js' --include='*.py' .

# Image/file fetch from URL
grep -rniE '(download|fetchImage|getFile|loadUrl)\s*\(.*req\.' --include='*.ts' --include='*.js' --include='*.py' .

# Redirect without validation
grep -rniE 'res\.redirect\(.*req\.|redirect_to.*request\.' --include='*.ts' --include='*.js' --include='*.py' .
```

### Vulnerable Code Example

```javascript
// BAD: Unvalidated URL fetch
app.get('/proxy', async (req, res) => {
  const response = await fetch(req.query.url);  // Can access internal services
  res.send(await response.text());
});
```

### Remediation

```javascript
// GOOD: URL allowlist validation
const ALLOWED_HOSTS = ['api.example.com', 'cdn.example.com'];

app.get('/proxy', async (req, res) => {
  const url = new URL(req.query.url);
  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    return res.status(400).json({ error: 'Host not allowed' });
  }
  if (url.protocol !== 'https:') {
    return res.status(400).json({ error: 'HTTPS required' });
  }
  const response = await fetch(url.toString());
  res.send(await response.text());
});
```

---

## Quick Reference

| ID | Category | Key Grep Pattern | Severity Baseline |
|----|----------|-----------------|-------------------|
| A01 | Broken Access Control | `findById.*params` without owner check | High |
| A02 | Cryptographic Failures | `md5\|sha1` for passwords | High |
| A03 | Injection | `query.*\+.*req\.\|f".*SELECT.*\{` | Critical |
| A04 | Insecure Design | Missing rate limit on auth routes | Medium |
| A05 | Security Misconfiguration | `DEBUG.*true\|stack.*res.json` | Medium |
| A06 | Vulnerable Components | `npm audit` / `pip-audit` results | Varies |
| A07 | Auth Failures | `jwt.sign` without `expiresIn` | High |
| A08 | Integrity Failures | `pickle.load\|yaml.load` | High |
| A09 | Logging Failures | Empty catch blocks, no auth logging | Medium |
| A10 | SSRF | `fetch.*req.query.url` | High |
