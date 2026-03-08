---
name: doc-generate
description: Generate full document tree from doc-index.json. Layer 3 (components) → Layer 2 (features) → Layer 1 (indexes/overview). Standalone or called by scan/index-build.
argument-hint: "[-y|--yes] [--layer <3|2|1|all>] [--force] [--skip-overview] [--skip-schema]"
allowed-tools: TodoWrite(*), Agent(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-generate all layers without confirmation prompts.

# DDD Doc Generate Command (/ddd:doc-generate)

## Purpose

Generate the complete document tree from `doc-index.json`. **Single source of truth** for all document generation logic, following bottom-up Layer 3 → 2 → 1 strategy.

```
doc-index.json → tech-registry/*.md (L3) → feature-maps/*.md (L2) → _index.md + README + ARCHITECTURE (L1)
```

## When to Use

| Scenario | Use |
|----------|-----|
| After `/ddd:scan` builds doc-index.json | **doc-generate** (auto-called by scan) |
| After `/ddd:index-build` builds doc-index.json | **doc-generate** (auto-called by index-build) |
| Rebuild all docs from existing index | **doc-generate --force** |
| Regenerate only component docs | **doc-generate --layer 3** |
| Regenerate only overview/index docs | **doc-generate --layer 1** |

## Prerequisite

- `doc-index.json` must exist at `.workflow/.doc-index/doc-index.json`
- If not found → error: "No doc-index.json found. Run /ddd:scan or /ddd:index-build first."

## Storage Output

```
.workflow/.doc-index/
├── doc-index.json              ← Input (read-only, not modified)
├── SCHEMA.md                   ← Schema documentation
├── README.md                   ← Project overview (Layer 1)
├── ARCHITECTURE.md             ← Architecture overview (Layer 1)
├── feature-maps/               ← Feature documentation (Layer 2)
│   ├── _index.md
│   └── {feature-slug}.md
├── tech-registry/              ← Component documentation (Layer 3)
│   ├── _index.md
│   └── {component-slug}.md
└── sessions/
    └── _index.md               ← Planning sessions index (Layer 1)
```

## Phase 1: Load & Validate

### 1.1 Load doc-index.json

```
Read .workflow/.doc-index/doc-index.json
Validate: features[], technicalComponents[] are non-empty arrays
```

### 1.2 Schema Version Check

```javascript
const schemaVersion = docIndex.schema_version || '0.0';
if (schemaVersion !== '1.0') {
  warn(`Schema version mismatch: found ${schemaVersion}, expected 1.0`);
}
```

### 1.3 Determine Generation Scope

```
IF --layer 3:  generate Layer 3 only
IF --layer 2:  generate Layer 2 only (requires Layer 3 exists)
IF --layer 1:  generate Layer 1 only (requires Layer 2 exists)
IF --layer all (default): generate Layer 3 → 2 → 1
```

### 1.4 Check Existing Docs

```
IF docs already exist AND NOT --force:
  Warn: "Documents already exist. Use --force to overwrite."
  Ask user (unless -y → overwrite)
```

## Phase 2: Layer 3 — Component Documentation

For each component in `technicalComponents[]`:

```bash
ccw cli -p "PURPOSE: Generate component documentation for {component.name}
TASK:
• Document component purpose and responsibility
• List exported symbols (classes, functions, types)
• Document dependencies (internal and external)
• Include code examples for key APIs
• Document integration points with other components
MODE: write
CONTEXT: @{component.codeLocations[].path}
EXPECTED: Markdown file with: Overview, API Reference, Dependencies, Usage Examples
CONSTRAINTS: Focus on public API | Include type signatures
" --tool gemini --mode write --cd .workflow/.doc-index/tech-registry/
```

Output: `.workflow/.doc-index/tech-registry/{component-slug}.md`

Frontmatter:
```markdown
---
layer: 3
component_id: tech-{slug}
name: ComponentName
type: service|controller|model|...
features: [feat-auth]
code_locations:
  - path: src/services/auth.ts
    symbols: [AuthService, AuthService.login]
generated_at: ISO8601
---
```

Sections: Responsibility, Code Locations, Related Requirements, Architecture Decisions, Dependencies (in/out)

## Phase 3: Layer 2 — Feature Documentation

For each feature in `features[]`:

```bash
ccw cli -p "PURPOSE: Generate feature documentation for {feature.name}
TASK:
• Describe feature purpose and business value
• List requirements (from requirementIds)
• Document components involved (from techComponentIds)
• Include architecture decisions (from adrIds)
• Provide integration guide
MODE: write
CONTEXT: @.workflow/.doc-index/tech-registry/{related-components}.md
EXPECTED: Markdown file with: Overview, Requirements, Components, Architecture, Integration
CONSTRAINTS: Reference Layer 3 component docs | Business-focused language
" --tool gemini --mode write --cd .workflow/.doc-index/feature-maps/
```

Output: `.workflow/.doc-index/feature-maps/{feature-slug}.md`

Frontmatter:
```markdown
---
layer: 2
feature_id: feat-{slug}
name: Feature Name
epic_id: EPIC-NNN|null
status: implemented|in-progress|planned|partial
requirements: [REQ-001, REQ-002]
components: [tech-auth-service, tech-user-model]
depends_on_layer3: [tech-auth-service, tech-user-model]
tags: [auth, security]
generated_at: ISO8601
---
```

Sections: Overview, Requirements (with mapping status), Technical Components, Architecture Decisions, Change History

## Phase 4: Layer 1 — Index & Overview Documentation

### 4.1 Index Documents

Generate catalog files:

- **feature-maps/_index.md** — Feature overview table with status
- **tech-registry/_index.md** — Component registry table with types
- **action-logs/_index.md** — Action history table (empty initially for new projects)

### 4.2 README.md (unless --skip-overview)

```bash
ccw cli -p "PURPOSE: Generate project README with overview and navigation
TASK:
• Project summary and purpose
• Quick start guide
• Navigation to features, components, and architecture
• Link to doc-index.json
MODE: write
CONTEXT: @.workflow/.doc-index/doc-index.json @.workflow/.doc-index/feature-maps/_index.md
EXPECTED: README.md with: Overview, Quick Start, Navigation, Links
CONSTRAINTS: High-level only | Entry point for new developers
" --tool gemini --mode write --cd .workflow/.doc-index/
```

### 4.3 ARCHITECTURE.md (unless --skip-overview)

```bash
ccw cli -p "PURPOSE: Generate architecture overview document
TASK:
• System design overview
• Component relationships and dependencies
• Key architecture decisions (from ADRs)
• Technology stack
MODE: write
CONTEXT: @.workflow/.doc-index/doc-index.json @.workflow/.doc-index/tech-registry/*.md
EXPECTED: ARCHITECTURE.md with: System Design, Component Diagram, ADRs, Tech Stack
CONSTRAINTS: Architecture-focused | Reference component docs for details
" --tool gemini --mode write --cd .workflow/.doc-index/
```

### 4.4 sessions/_index.md (unless --skip-overview)

```bash
ccw cli -p "PURPOSE: Generate planning sessions index
TASK:
• List all planning session folders chronologically
• Link to each session's plan.json
• Show session status and task count
MODE: write
CONTEXT: @.workflow/.doc-index/planning/*/plan.json
EXPECTED: sessions/_index.md with: Session List, Links, Status
CONSTRAINTS: Chronological order | Link to session folders
" --tool gemini --mode write --cd .workflow/.doc-index/sessions/
```

Layer 1 frontmatter:
```markdown
---
layer: 1
depends_on_layer2: [feat-auth, feat-orders]
generated_at: ISO8601
---
```

## Phase 5: SCHEMA.md (unless --skip-schema)

### 5.1 Generate Schema Documentation

```bash
ccw cli -p "PURPOSE: Document doc-index.json schema structure and versioning
TASK:
• Document current schema structure (all fields)
• Define versioning policy (semver: major.minor)
• Document migration protocol for version upgrades
• Provide examples for each schema section
MODE: write
CONTEXT: @.workflow/.doc-index/doc-index.json
EXPECTED: SCHEMA.md with: Schema Structure, Versioning Policy, Migration Protocol, Examples
CONSTRAINTS: Complete field documentation | Clear migration steps
" --tool gemini --mode write --cd .workflow/.doc-index/
```

### 5.2 Versioning Policy

**Semantic Versioning**:
- **Major** (X.0): Breaking changes (field removal, type changes, incompatible structure)
- **Minor** (X.Y): Non-breaking additions (new optional fields, new sections)

**Migration Protocol**:
1. Detect version mismatch in ddd:plan/ddd:sync
2. Log warning with migration instructions
3. Provide migration script or regeneration option
4. Update schema_version after successful migration

## Phase 6: Generation Report

```
Document Generation Report

Project: {name}
Source: doc-index.json (build_path: {spec-first|code-first})

Generated:
  Layer 3 (Components): {N} documents in tech-registry/
  Layer 2 (Features):   {N} documents in feature-maps/
  Layer 1 (Indexes):    {N} documents (_index.md, README, ARCHITECTURE)
  Schema:               SCHEMA.md

Total: {N} documents generated
```

## Flags

| Flag | Effect |
|------|--------|
| `-y, --yes` | Auto-confirm all decisions |
| `--layer <3\|2\|1\|all>` | Generate specific layer only (default: all) |
| `--force` | Overwrite existing documents |
| `--skip-overview` | Skip README.md, ARCHITECTURE.md, sessions/_index.md |
| `--skip-schema` | Skip SCHEMA.md generation |

## Integration Points

- **Input from**: `doc-index.json` (from `/ddd:scan` or `/ddd:index-build`)
- **Called by**: `/ddd:scan` (after index assembly), `/ddd:index-build` (after index assembly)
- **Standalone**: Can be run independently on any project with existing doc-index.json
- **Output**: Complete document tree in `.workflow/.doc-index/`
