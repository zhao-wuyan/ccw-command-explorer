# Phase 3: Threat Modeling (STRIDE)

Map STRIDE threat categories to architecture components, identify trust boundaries, and assess attack surface.

## Objective

- Apply the STRIDE threat model to the project architecture
- Identify trust boundaries between system components
- Assess attack surface area per component
- Cross-reference with Phase 1 and Phase 2 findings

## STRIDE Categories

| Category | Threat | Question | Typical Targets |
|----------|--------|----------|-----------------|
| **S** - Spoofing | Identity impersonation | Can an attacker pretend to be someone else? | Auth endpoints, API keys, session tokens |
| **T** - Tampering | Data modification | Can data be modified in transit or at rest? | Request bodies, database records, config files |
| **R** - Repudiation | Deniable actions | Can a user deny performing an action? | Audit logs, transaction records, user actions |
| **I** - Information Disclosure | Data leakage | Can sensitive data be exposed? | Error messages, logs, API responses, storage |
| **D** - Denial of Service | Availability disruption | Can the system be made unavailable? | API endpoints, resource-intensive operations |
| **E** - Elevation of Privilege | Unauthorized access | Can a user gain higher privileges? | Role checks, admin routes, permission logic |

## Execution Steps

### Step 1: Architecture Component Discovery

Identify major system components by scanning project structure.

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

### Step 2: Trust Boundary Identification

Map trust boundaries in the system:

1. **External boundary**: User/browser <-> Application server
2. **Service boundary**: Application <-> External APIs/services
3. **Data boundary**: Application <-> Database/storage
4. **Internal boundary**: Public routes <-> Authenticated routes <-> Admin routes
5. **Process boundary**: Main process <-> Worker/subprocess

For each boundary, document:
- What crosses the boundary (data types, credentials)
- How the boundary is enforced (middleware, TLS, auth)
- What happens when enforcement fails

### Step 3: STRIDE per Component

For each discovered component, systematically evaluate all 6 STRIDE categories:

**Spoofing Analysis**:
- Are authentication mechanisms in place at all entry points?
- Can API keys or tokens be forged or replayed?
- Are session tokens properly validated and rotated?

**Tampering Analysis**:
- Is input validation applied before processing?
- Are database queries parameterized?
- Can request bodies or headers be manipulated to alter behavior?
- Are file uploads validated for type and content?

**Repudiation Analysis**:
- Are user actions logged with sufficient detail (who, what, when)?
- Are logs tamper-proof or centralized?
- Can critical operations (payments, deletions) be traced to a user?

**Information Disclosure Analysis**:
- Do error responses leak stack traces or internal paths?
- Are sensitive fields (passwords, tokens) excluded from logs and API responses?
- Is PII properly handled (encryption at rest, masking in logs)?
- Do debug endpoints or verbose modes expose internals?

**Denial of Service Analysis**:
- Are rate limits applied to public endpoints?
- Can resource-intensive operations be triggered without limits?
- Are file upload sizes bounded?
- Are database queries bounded (pagination, timeouts)?

**Elevation of Privilege Analysis**:
- Are role/permission checks applied consistently?
- Can horizontal privilege escalation occur (accessing other users' data)?
- Can vertical escalation occur (user -> admin)?
- Are admin/debug routes properly protected?

### Step 4: Attack Surface Assessment

Quantify the attack surface:

```
Attack Surface = Sum of:
  - Number of public API endpoints
  - Number of external service integrations
  - Number of user-controllable input points
  - Number of privileged operations
  - Number of data stores with sensitive content
```

Rate each component:
- **High exposure**: Public-facing, handles sensitive data, complex logic
- **Medium exposure**: Authenticated access, moderate data sensitivity
- **Low exposure**: Internal only, no sensitive data, simple operations

## Output

- **File**: `threat-model.json`
- **Location**: `${WORK_DIR}/threat-model.json`
- **Format**: JSON

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

## Next Phase

Proceed to [Phase 4: Report & Tracking](04-report-tracking.md) with the threat model to generate the final scored audit report.
