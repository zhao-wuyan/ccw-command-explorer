# Document Versioning Strategy

Document version management strategy: Complete Rewrite + Archive History

## Recommended Approach: Complete Rewrite + Archive History

For each iteration, **completely rewrite** the main document, and automatically archive the old version to the `history/` directory.

### File Structure

```
.workflow/.cycle/cycle-v1-20260122-abc123.progress/
├── ra/
│   ├── requirements.md          # v1.2.0 (current version, complete rewrite)
│   ├── edge-cases.md            # v1.2.0 (current version, complete rewrite)
│   ├── changes.log              # NDJSON complete change history (append-only)
│   └── history/
│       ├── requirements-v1.0.0.md   (archived)
│       ├── requirements-v1.1.0.md   (archived)
│       ├── edge-cases-v1.0.0.md     (archived)
│       └── edge-cases-v1.1.0.md     (archived)
├── ep/
│   ├── exploration.md           # v1.2.0 (current)
│   ├── architecture.md          # v1.2.0 (current)
│   ├── plan.json                # v1.2.0 (current)
│   └── history/
│       ├── plan-v1.0.0.json
│       └── plan-v1.1.0.json
├── cd/
│   ├── implementation.md        # v1.2.0 (current)
│   ├── changes.log         # NDJSON complete history
│   ├── debug-log.ndjson         # Debug hypothesis tracking
│   ├── issues.md                # Current unresolved issues
│   └── history/
│       ├── implementation-v1.0.0.md
│       └── implementation-v1.1.0.md
└── vas/
    ├── validation.md            # v1.2.0 (current)
    ├── test-results.json        # v1.2.0 (current)
    ├── summary.md               # v1.2.0 (current)
    └── history/
        ├── validation-v1.0.0.md
        └── test-results-v1.0.0.json
```

## Optimized Document Template

### Requirements.md (Complete Rewrite Version)

```markdown
# Requirements Specification - v1.2.0

## Document Metadata
| Field | Value |
|-------|-------|
| Version | 1.2.0 |
| Previous | 1.1.0 (Added Google OAuth) |
| Changes | Added MFA, GitHub provider |
| Date | 2026-01-23T10:00:00+08:00 |
| Cycle | cycle-v1-20260122-abc123 |
| Iteration | 3 |

---

## Functional Requirements

### FR-001: OAuth Authentication
**Description**: Users can log in using OAuth providers.

**Supported Providers**: Google, GitHub

**Priority**: High

**Status**: ✓ Implemented (v1.0.0), Enhanced (v1.1.0, v1.2.0)

**Success Criteria**:
- User can click provider button
- Redirect to provider
- Return with valid token
- Session created

---

### FR-002: Multi-Provider Support
**Description**: System supports multiple OAuth providers simultaneously.

**Providers**:
- Google (v1.1.0)
- GitHub (v1.2.0)

**Priority**: High

**Status**: ✓ Implemented

---

### FR-003: Multi-Factor Authentication
**Description**: Optional MFA for enhanced security.

**Method**: TOTP (Time-based One-Time Password)

**Priority**: Medium

**Status**: 🆕 New in v1.2.0

**Success Criteria**:
- User can enable MFA in settings
- TOTP QR code generated
- Verification on login

---

## Non-Functional Requirements

### NFR-001: Performance
Response time < 500ms for all OAuth flows.

**Status**: ✓ Met (v1.0.0)

---

## Edge Cases

### EC-001: OAuth Provider Timeout
**Scenario**: Provider doesn't respond in 5 seconds

**Expected**: Display error, offer retry

**Status**: ✓ Handled

---

### EC-002: Invalid MFA Code (NEW v1.2.0)
**Scenario**: User enters incorrect TOTP code

**Expected**: Display error, max 3 attempts, lock after

**Status**: 🔄 To be implemented

---

## Constraints
- Must use existing JWT session management
- No new database servers
- Compatible with existing user table

---

## Assumptions
- Users have access to authenticator app for MFA
- OAuth providers are always available

---

## Version History Summary

| Version | Date | Summary |
|---------|------|---------|
| 1.0.0 | 2026-01-22 | Initial OAuth login (Google only implicit) |
| 1.1.0 | 2026-01-22 | + Explicit Google OAuth support |
| 1.2.0 | 2026-01-23 | + GitHub provider, + MFA (current) |

**Detailed History**: See `history/` directory and `changes.log`
```

### Changes.log (NDJSON - Complete History)

```jsonl
{"timestamp":"2026-01-22T10:00:00+08:00","iteration":1,"version":"1.0.0","action":"create","type":"requirement","id":"FR-001","description":"Initial OAuth requirement"}
{"timestamp":"2026-01-22T10:05:00+08:00","iteration":1,"version":"1.0.0","action":"create","type":"requirement","id":"NFR-001","description":"Performance requirement"}
{"timestamp":"2026-01-22T11:00:00+08:00","iteration":2,"version":"1.1.0","action":"update","type":"requirement","id":"FR-001","description":"Clarified Google OAuth support"}
{"timestamp":"2026-01-22T11:05:00+08:00","iteration":2,"version":"1.1.0","action":"create","type":"requirement","id":"FR-002","description":"Multi-provider support"}
{"timestamp":"2026-01-23T10:00:00+08:00","iteration":3,"version":"1.2.0","action":"create","type":"requirement","id":"FR-003","description":"MFA requirement"}
{"timestamp":"2026-01-23T10:05:00+08:00","iteration":3,"version":"1.2.0","action":"update","type":"requirement","id":"FR-002","description":"Added GitHub provider"}
```

## Implementation Flow

### Agent Workflow (RA Example)

```javascript
// ==================== RA Agent Iteration Flow ====================

// Read current state
const state = JSON.parse(Read(`.workflow/.cycle/${cycleId}.json`))
const currentVersion = state.requirements?.version || "0.0.0"
const iteration = state.current_iteration

// If iteration (old version exists)
if (currentVersion !== "0.0.0") {
  // 1. Archive old version
  const oldFile = `.workflow/.cycle/${cycleId}.progress/ra/requirements.md`
  const archiveFile = `.workflow/.cycle/${cycleId}.progress/ra/history/requirements-v${currentVersion}.md`

  Copy(oldFile, archiveFile)  // Archive

  // 2. Read old version (optional, for context understanding)
  const oldRequirements = Read(oldFile)

  // 3. Read change history
  const changesLog = readNDJSON(`.workflow/.cycle/${cycleId}.progress/ra/changes.log`)
}

// 4. Generate new version number
const newVersion = bumpVersion(currentVersion, 'minor')  // 1.1.0 -> 1.2.0

// 5. Generate new document (complete rewrite)
const newRequirements = generateRequirements({
  version: newVersion,
  previousVersion: currentVersion,
  previousSummary: "Added Google OAuth support",
  currentChanges: "Added MFA and GitHub provider",
  iteration: iteration,
  taskDescription: state.description,
  changesLog: changesLog  // For understanding history
})

// 6. Write new document (overwrite old)
Write(`.workflow/.cycle/${cycleId}.progress/ra/requirements.md`, newRequirements)

// 7. Append change to changes.log
appendNDJSON(`.workflow/.cycle/${cycleId}.progress/ra/changes.log`, {
  timestamp: getUtc8ISOString(),
  iteration: iteration,
  version: newVersion,
  action: "create",
  type: "requirement",
  id: "FR-003",
  description: "Added MFA requirement"
})

// 8. Update state
state.requirements = {
  version: newVersion,
  output_file: `.workflow/.cycle/${cycleId}.progress/ra/requirements.md`,
  summary: {
    functional_requirements: 3,
    edge_cases: 2,
    constraints: 3
  }
}

Write(`.workflow/.cycle/${cycleId}.json`, JSON.stringify(state, null, 2))
```

## Advantages Comparison

| Aspect | Incremental Update | Complete Rewrite + Archive |
|--------|-------------------|---------------------------|
| **Document Conciseness** | ❌ Gets longer | ✅ Always concise |
| **Agent Parsing** | ❌ Must parse history | ✅ Only read current version |
| **Maintenance Complexity** | ❌ High (version marking) | ✅ Low (direct rewrite) |
| **File Size** | ❌ Bloats | ✅ Fixed |
| **History Tracking** | ✅ In main document | ✅ In history/ + changes.log |
| **Human Readability** | ❌ Must skip history | ✅ Direct current view |
| **Token Usage** | ❌ More (read complete history) | ✅ Less (only read current) |

## Archive Strategy

### Auto-Archive Trigger

```javascript
function shouldArchive(currentVersion, state) {
  // Archive on each version update
  return currentVersion !== state.requirements?.version
}

function archiveOldVersion(cycleId, agent, filename, currentVersion) {
  const currentFile = `.workflow/.cycle/${cycleId}.progress/${agent}/${filename}`
  const archiveDir = `.workflow/.cycle/${cycleId}.progress/${agent}/history`
  const archiveFile = `${archiveDir}/${filename.replace('.', `-v${currentVersion}.`)}`

  // Ensure archive directory exists
  mkdir -p ${archiveDir}

  // Copy (not move, keep current file until new version written)
  Copy(currentFile, archiveFile)

  console.log(`Archived ${filename} v${currentVersion} to history/`)
}
```

### Cleanup Strategy (Optional)

Keep most recent N versions, delete older archives:

```javascript
function cleanupArchives(cycleId, agent, keepVersions = 3) {
  const historyDir = `.workflow/.cycle/${cycleId}.progress/${agent}/history`
  const archives = listFiles(historyDir)

  // Sort by version number
  archives.sort((a, b) => compareVersions(extractVersion(a), extractVersion(b)))

  // Delete oldest versions (keep most recent N)
  if (archives.length > keepVersions) {
    const toDelete = archives.slice(0, archives.length - keepVersions)
    toDelete.forEach(file => Delete(`${historyDir}/${file}`))
  }
}
```

## Importance of Changes.log

Although main document is completely rewritten, **changes.log (NDJSON) permanently preserves complete history**:

```bash
# View all changes
cat .workflow/.cycle/cycle-xxx.progress/ra/changes.log | jq .

# View history of specific requirement
cat .workflow/.cycle/cycle-xxx.progress/ra/changes.log | jq 'select(.id=="FR-001")'

# View changes by iteration
cat .workflow/.cycle/cycle-xxx.progress/ra/changes.log | jq 'select(.iteration==2)'
```

This way:
- **Main Document**: Clear and concise (current state)
- **Changes.log**: Complete traceability (all history)
- **History/**: Snapshot backups (view on demand)

## Recommended Implementation

1. ✅ Adopt "Complete Rewrite" strategy
2. ✅ Main document only keeps "previous version summary"
3. ✅ Auto-archive to `history/` directory
4. ✅ Changes.log (NDJSON) preserves complete history
5. ✅ Optional: Keep most recent 3-5 historical versions

This approach keeps documents concise (agent-friendly) while preserving complete history (audit-friendly).
