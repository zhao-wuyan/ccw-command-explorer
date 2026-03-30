# Phase 3: Threat Modeling

> **COMPACT PROTECTION**: This is a core execution phase. If context compression has occurred and this file is only a summary, **MUST `Read` this file again before executing any Step**. Do not execute from memory.

Map STRIDE threat categories to architecture components, identify trust boundaries, and assess attack surface.

## Objective

- Apply the STRIDE threat model to the project architecture
- Identify trust boundaries between system components
- Assess attack surface area per component
- Cross-reference with Phase 1 and Phase 2 findings

## Input

| Source | Required | Description |
|--------|----------|-------------|
| `.workflow/.security/supply-chain-report.json` | Yes | Phase 1 findings for dependency/CI context |
| `.workflow/.security/owasp-findings.json` | Yes | Phase 2 findings to cross-reference in STRIDE gaps |
| Project source files | Yes | Route handlers, data stores, external service clients, auth modules |

## Execution Steps

### Step 1: Architecture Component Discovery

Identify major system components by scanning project structure.

**Decision Table**:

| Component Pattern Found | component.type |
|------------------------|----------------|
| `app.get/post/put/delete/patch`, `router.`, `@app.route`, `@router.` | api_endpoint |
| `createConnection`, `mongoose.connect`, `sqlite`, `redis`, `S3`, `createClient` | data_store |
| `fetch`, `axios`, `http.request`, `requests.get/post`, `urllib` | external_service |
| `jwt`, `passport`, `session`, `oauth`, `bcrypt`, `argon2`, `crypto` | auth_module |
| `worker`, `subprocess`, `child_process`, `celery`, `queue` | worker |

**Execution**:

```bash
# Identify entry points (API routes, CLI commands, event handlers)
grep -rlE '(app\.(get|post|put|delete|patch|use)|router\.|@app\.route|@router\.)' \
  --include='*.ts' --include='*.js' --include='*.py' . || true

# Identify data stores (database connections, file storage)
grep -rlE '(createConnection|mongoose\.connect|sqlite|redis|S3|createClient)' \
  --include='*.ts' --include='*.js' --include='*.py' . || true

# Identify external service integrations
grep -rlE '(fetch|axios|http\.request|requests\.(get|post)|urllib)' \
  --include='*.ts' --include='*.js' --include='*.py' . || true

# Identify auth/session components
grep -rlE '(jwt|passport|session|oauth|bcrypt|argon2|crypto)' \
  --include='*.ts' --include='*.js' --include='*.py' . || true
```

---

### Step 2: Trust Boundary Identification

Map the 5 standard trust boundary types. For each boundary: document what data crosses it, how it is enforced, and what happens when enforcement fails.

**Trust Boundary Types**:

| Boundary | From | To | Key Data Crossing |
|----------|------|----|------------------|
| External boundary | User/browser | Application server | User input, credentials, session tokens |
| Service boundary | Application | External APIs/services | API keys, request bodies, response data |
| Data boundary | Application | Database/storage | Query parameters, credentials, PII |
| Internal boundary | Public routes | Authenticated/admin routes | Auth tokens, role claims |
| Process boundary | Main process | Worker/subprocess | Job parameters, environment variables |

For each boundary, document:
- What crosses the boundary (data types, credentials)
- How the boundary is enforced (middleware, TLS, auth)
- What happens when enforcement fails

---

### Step 3: STRIDE per Component

For each discovered component, evaluate all 6 STRIDE categories systematically.

**STRIDE Category Definitions**:

| Category | Threat | Key Question |
|----------|--------|-------------|
| S — Spoofing | Identity impersonation | Can an attacker pretend to be someone else? |
| T — Tampering | Data modification | Can data be modified in transit or at rest? |
| R — Repudiation | Deniable actions | Can a user deny performing an action? |
| I — Information Disclosure | Data leakage | Can sensitive data be exposed? |
| D — Denial of Service | Availability disruption | Can the system be made unavailable? |
| E — Elevation of Privilege | Unauthorized access | Can a user gain higher privileges? |

**Spoofing Analysis Checks**:
- Are authentication mechanisms in place at all entry points?
- Can API keys or tokens be forged or replayed?
- Are session tokens properly validated and rotated?

**Tampering Analysis Checks**:
- Is input validation applied before processing?
- Are database queries parameterized?
- Can request bodies or headers be manipulated to alter behavior?
- Are file uploads validated for type and content?

**Repudiation Analysis Checks**:
- Are user actions logged with sufficient detail (who, what, when)?
- Are logs tamper-proof or centralized?
- Can critical operations (payments, deletions) be traced to a user?

**Information Disclosure Analysis Checks**:
- Do error responses leak stack traces or internal paths?
- Are sensitive fields (passwords, tokens) excluded from logs and API responses?
- Is PII properly handled (encryption at rest, masking in logs)?
- Do debug endpoints or verbose modes expose internals?

**Denial of Service Analysis Checks**:
- Are rate limits applied to public endpoints?
- Can resource-intensive operations be triggered without limits?
- Are file upload sizes bounded?
- Are database queries bounded (pagination, timeouts)?

**Elevation of Privilege Analysis Checks**:
- Are role/permission checks applied consistently?
- Can horizontal privilege escalation occur (accessing other users' data)?
- Can vertical escalation occur (user -> admin)?
- Are admin/debug routes properly protected?

**Component Exposure Rating**:

| Rating | Criteria |
|--------|----------|
| High | Public-facing, handles sensitive data, complex logic |
| Medium | Authenticated access, moderate data sensitivity |
| Low | Internal only, no sensitive data, simple operations |

---

### Step 4: Attack Surface Assessment

Quantify the attack surface across the entire system.

**Attack Surface Components**:

```
Attack Surface = Sum of:
  - Number of public API endpoints
  - Number of external service integrations
  - Number of user-controllable input points
  - Number of privileged operations
  - Number of data stores with sensitive content
```

**Decision Table — Attack Surface Rating**:

| Total Score | Interpretation |
|-------------|---------------|
| 0–5 | Low attack surface |
| 6–15 | Moderate attack surface |
| 16–30 | High attack surface |
| > 30 | Very high attack surface — prioritize hardening |

Cross-reference Phase 1 and Phase 2 findings when populating `gaps` arrays for each STRIDE category. A finding in Phase 2 (e.g., A03 injection) maps to STRIDE T (Tampering) for the relevant component.

---

## Output

| Artifact | Format | Description |
|----------|--------|-------------|
| `.workflow/.security/threat-model.json` | JSON | STRIDE model with components, trust boundaries, attack surface |

```json
{
  "phase": "threat-modeling",
  "timestamp": "ISO-8601",
  "framework": "STRIDE",
  "components": [
    {
      "name": "Component name",
      "type": "api_endpoint|data_store|external_service|auth_module|worker",
      "files": ["path/to/file.ts"],
      "exposure": "high|medium|low",
      "trust_boundaries": ["external", "data"],
      "threats": {
        "spoofing": {
          "applicable": true,
          "findings": ["Description of threat"],
          "mitigations": ["Existing mitigation"],
          "gaps": ["Missing mitigation"]
        },
        "tampering": { "applicable": true, "findings": [], "mitigations": [], "gaps": [] },
        "repudiation": { "applicable": true, "findings": [], "mitigations": [], "gaps": [] },
        "information_disclosure": { "applicable": true, "findings": [], "mitigations": [], "gaps": [] },
        "denial_of_service": { "applicable": true, "findings": [], "mitigations": [], "gaps": [] },
        "elevation_of_privilege": { "applicable": true, "findings": [], "mitigations": [], "gaps": [] }
      }
    }
  ],
  "trust_boundaries": [
    {
      "name": "Boundary name",
      "from": "Component A",
      "to": "Component B",
      "enforcement": "TLS|auth_middleware|API_key",
      "data_crossing": ["request bodies", "credentials"],
      "risk_level": "high|medium|low"
    }
  ],
  "attack_surface": {
    "public_endpoints": 0,
    "external_integrations": 0,
    "input_points": 0,
    "privileged_operations": 0,
    "sensitive_data_stores": 0,
    "total_score": 0
  },
  "summary": {
    "components_analyzed": 0,
    "threats_identified": 0,
    "by_stride": { "S": 0, "T": 0, "R": 0, "I": 0, "D": 0, "E": 0 },
    "high_exposure_components": 0
  }
}
```

## Success Criteria

| Criterion | Validation Method |
|-----------|-------------------|
| At least one component analyzed | `components` array has at least 1 entry |
| All 6 STRIDE categories evaluated per component | Each component.threats has all 6 keys |
| Trust boundaries mapped | `trust_boundaries` array populated |
| Attack surface quantified | `attack_surface.total_score` calculated |
| `threat-model.json` written to `.workflow/.security/` | File exists and is valid JSON |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No components discovered via grep | Analyze project structure manually (README, package.json); note uncertainty |
| Phase 2 findings not available for cross-reference | Proceed with grep-only; note missing OWASP context |
| Ambiguous architecture (monolith vs microservices) | Document assumption in summary; note for user review |
| No `.github/workflows/` for CI boundary | Mark process boundary as not_applicable |

## Next Phase

-> [Phase 4: Report & Tracking](04-report-tracking.md)
