# Document Standards

Defines format conventions, YAML frontmatter schema, naming rules, and content structure for all spec-generator outputs.

## When to Use

| Phase | Usage | Section |
|-------|-------|---------|
| All Phases | Frontmatter format | YAML Frontmatter Schema |
| All Phases | File naming | Naming Conventions |
| Phase 2-5 | Document structure | Content Structure |
| Phase 6 | Validation reference | All sections |

---

## YAML Frontmatter Schema

Every generated document MUST begin with YAML frontmatter:

```yaml
---
session_id: SPEC-{slug}-{YYYY-MM-DD}
phase: {1-6}
document_type: {product-brief|requirements|architecture|epics|readiness-report|spec-summary}
status: draft|review|complete
generated_at: {ISO8601 timestamp}
stepsCompleted: []
version: 1
dependencies:
  - {list of input documents used}
---
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | Yes | Session identifier matching spec-config.json |
| `phase` | number | Yes | Phase number that generated this document (1-6) |
| `document_type` | string | Yes | One of: product-brief, requirements, architecture, epics, readiness-report, spec-summary |
| `status` | enum | Yes | draft (initial), review (user reviewed), complete (finalized) |
| `generated_at` | string | Yes | ISO8601 timestamp of generation |
| `stepsCompleted` | array | Yes | List of step IDs completed during generation |
| `version` | number | Yes | Document version, incremented on re-generation |
| `dependencies` | array | No | List of input files this document depends on |

### Status Transitions

```
draft -> review -> complete
  |                   ^
  +-------------------+  (direct promotion in auto mode)
```

- **draft**: Initial generation, not yet user-reviewed
- **review**: User has reviewed and provided feedback
- **complete**: Finalized, ready for downstream consumption

In auto mode (`-y`), documents are promoted directly from `draft` to `complete`.

---

## Naming Conventions

### Session ID Format

```
SPEC-{slug}-{YYYY-MM-DD}
```

- **slug**: Lowercase, alphanumeric + Chinese characters, hyphens as separators, max 40 chars
- **date**: UTC+8 date in YYYY-MM-DD format

Examples:
- `SPEC-task-management-system-2026-02-11`
- `SPEC-user-auth-oauth-2026-02-11`

### Output Files

| File | Phase | Description |
|------|-------|-------------|
| `spec-config.json` | 1 | Session configuration and state |
| `discovery-context.json` | 1 | Codebase exploration results (optional) |
| `product-brief.md` | 2 | Product brief document |
| `requirements.md` | 3 | PRD document |
| `architecture.md` | 4 | Architecture decisions document |
| `epics.md` | 5 | Epic/Story breakdown document |
| `readiness-report.md` | 6 | Quality validation report |
| `spec-summary.md` | 6 | One-page executive summary |

### Output Directory

```
.workflow/.spec/{session-id}/
```

---

## Content Structure

### Heading Hierarchy

- `#` (H1): Document title only (one per document)
- `##` (H2): Major sections
- `###` (H3): Subsections
- `####` (H4): Detail items (use sparingly)

Maximum depth: 4 levels. Prefer flat structures.

### Section Ordering

Every document follows this general pattern:

1. **YAML Frontmatter** (mandatory)
2. **Title** (H1)
3. **Executive Summary** (2-3 sentences)
4. **Core Content Sections** (H2, document-specific)
5. **Open Questions / Risks** (if applicable)
6. **References / Traceability** (links to upstream/downstream docs)

### Formatting Rules

| Element | Format | Example |
|---------|--------|---------|
| Requirements | `REQ-{NNN}` prefix | REQ-001: User login |
| Acceptance criteria | Checkbox list | `- [ ] User can log in with email` |
| Architecture decisions | `ADR-{NNN}` prefix | ADR-001: Use PostgreSQL |
| Epics | `EPIC-{NNN}` prefix | EPIC-001: Authentication |
| Stories | `STORY-{EPIC}-{NNN}` prefix | STORY-001-001: Login form |
| Priority tags | MoSCoW labels | `[Must]`, `[Should]`, `[Could]`, `[Won't]` |
| Mermaid diagrams | Fenced code blocks | ````mermaid ... ``` `` |
| Code examples | Language-tagged blocks | ````typescript ... ``` `` |

### Cross-Reference Format

Use relative references between documents:

```markdown
See [Product Brief](product-brief.md#section-name) for details.
Derived from [REQ-001](requirements.md#req-001).
```

### Language

- Document body: Follow user's input language (Chinese or English)
- Technical identifiers: Always English (REQ-001, ADR-001, EPIC-001)
- YAML frontmatter keys: Always English

---

## spec-config.json Schema

```json
{
  "session_id": "string (required)",
  "seed_input": "string (required) - original user input",
  "input_type": "text|file (required)",
  "timestamp": "ISO8601 (required)",
  "mode": "interactive|auto (required)",
  "complexity": "simple|moderate|complex (required)",
  "depth": "light|standard|comprehensive (required)",
  "focus_areas": ["string array"],
  "seed_analysis": {
    "problem_statement": "string",
    "target_users": ["string array"],
    "domain": "string",
    "constraints": ["string array"],
    "dimensions": ["string array - 3-5 exploration dimensions"]
  },
  "has_codebase": "boolean",
  "phasesCompleted": [
    {
      "phase": "number (1-6)",
      "name": "string (phase name)",
      "output_file": "string (primary output file)",
      "completed_at": "ISO8601"
    }
  ]
}
```

---

## Validation Checklist

- [ ] Every document starts with valid YAML frontmatter
- [ ] `session_id` matches across all documents in a session
- [ ] `status` field reflects current document state
- [ ] All cross-references resolve to valid targets
- [ ] Heading hierarchy is correct (no skipped levels)
- [ ] Technical identifiers use correct prefixes
- [ ] Output files are in the correct directory
