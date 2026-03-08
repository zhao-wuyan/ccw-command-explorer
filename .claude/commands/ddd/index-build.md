---
name: index-build
description: Build document index from spec-generator outputs + codebase mapping. Requires existing spec session. For projects without specs, use /ddd:scan instead.
argument-hint: "[-y|--yes] [-s|--spec <spec-session-id>] [--from-scratch]"
allowed-tools: TodoWrite(*), Agent(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*), mcp__ace-tool__search_context(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-confirm all decisions, use inferred mappings, skip interactive review.

# DDD Index Build Command (/ddd:index-build)

## Purpose

From **spec-generator outputs** (requirements, architecture, epics), construct the central document index and map spec entities to actual code locations.

```
Spec outputs (REQ, ADR, EPIC) + Codebase → doc-index.json
```

> **No spec?** Use `/ddd:scan` instead — it reverse-engineers the index from code alone.

## Prerequisite

- At least one spec session in `.workflow/.doc-index/specs/` or `.workflow/.spec/`
- If no spec found → error with suggestion: "No spec session found. Run /ddd:scan for code-first indexing, or /spec-generator to create specs."

## Storage Location

```
.workflow/.doc-index/
├── doc-index.json              ← Central index (primary output)
├── specs/                      ← Spec-generator outputs
│   └── SPEC-{slug}-{date}/
├── feature-maps/               ← Feature documentation (from Epics)
│   ├── _index.md
│   └── {feature-slug}.md
├── tech-registry/              ← Technical component docs (from code mapping)
│   ├── _index.md
│   └── {component-slug}.md
└── action-logs/                ← Change history (initially empty)
    └── _index.md
```

## Phase 1: Discover & Parse Spec Sources

### 1.1 Locate Spec Session

```
IF --spec <id> provided:
  Load from .workflow/.doc-index/specs/<id>/ OR .workflow/.spec/<id>/
ELSE:
  Scan for all SPEC-* directories
  IF multiple → present list, ask user to select (-y picks latest)
  IF none → ERROR: "No spec session found. Use /ddd:scan or /spec-generator."
```

### 1.2 Migrate Specs (if needed)

If spec in `.workflow/.spec/` but not in `.workflow/.doc-index/specs/`:
- Copy to `.workflow/.doc-index/specs/`
- Preserve original (backward compatibility)

### 1.3 Extract Structured Entities

| Source File | Extract To |
|------------|------------|
| `spec-config.json` | project name, domain, spec_type |
| `glossary.json` | → index glossary[] |
| `product-brief.md` | vision, goals |
| `requirements/REQ-*.md` | → index requirements[] (with MoSCoW priority) |
| `requirements/NFR-*.md` | → index requirements[] (non-functional) |
| `architecture/ADR-*.md` | → index architectureDecisions[] |
| `epics/EPIC-*.md` | → feature grouping seeds |

## Phase 2: Codebase Mapping

Map spec entities to actual code locations using Gemini:

```bash
ccw cli -p "PURPOSE: Map codebase to specification entities for documentation indexing.
TASK:
• Scan the codebase and identify all major modules/components
• For each component: extract file paths, exported symbols (classes, functions, types)
• Match components to these specification entities by name/domain similarity:
  Requirements: {REQ-001: desc, REQ-002: desc, ...extracted from Phase 1}
  Architecture decisions: {ADR-001: title, ...extracted from Phase 1}
• Report unmatched components (exist in code but no spec counterpart)
• Report unmatched requirements (in spec but no code found)
MODE: analysis
CONTEXT: @**/*
EXPECTED: JSON: { components: [{ name, type, files, symbols, matched_req_ids, matched_adr_id, is_orphan }], unmatched_reqs: [REQ-NNN] }
CONSTRAINTS: Focus on source directories | Ignore node_modules, dist, build" --tool gemini --mode analysis
```

### 2.1 Generate Component IDs & Link

For each discovered component:
- ID: `tech-{kebab-case-name}`
- Link to matched `REQ-NNN` and `ADR-NNN`
- Flag orphans for user review

## Phase 3: Build Feature Map (from Epics)

### 3.1 Epic → Feature Mapping

```
Each EPIC-NNN → one feat-{slug}
  - id: feat-{slug} (from epic slug)
  - name: from Epic name
  - epicId: EPIC-NNN
  - status: inferred from code mapping
    - all requirements have matched components → "implemented"
    - some matched → "in-progress"
    - none matched → "planned"
  - requirementIds: from Epic's stories → requirement links
  - tags: from domain keywords
```

### 3.2 Document Generation (delegated)

Feature-map and tech-registry document generation is handled by `/ddd:doc-generate` in Phase 5.
Phase 3 only builds the data structures (feature → requirement → component mappings) that doc-generate consumes.

## Phase 4: Assemble doc-index.json

```json
{
  "version": "1.0",
  "project": "{project-name}",
  "build_path": "spec-first",
  "spec_session": "SPEC-{slug}-{date}",
  "last_updated": "ISO8601",
  "glossary": [
    { "id": "gloss-{slug}", "term": "Term", "definition": "...", "aliases": [], "category": "core|technical|business" }
  ],
  "features": [
    { "id": "feat-{slug}", "name": "...", "epicId": "EPIC-NNN", "status": "...", "docPath": "feature-maps/{slug}.md", "requirementIds": ["REQ-NNN"], "tags": [] }
  ],
  "requirements": [
    { "id": "REQ-NNN", "title": "...", "source": "spec", "priority": "Must|Should|Could|Won't", "sourcePath": "specs/SPEC-*/requirements/REQ-NNN-*.md", "techComponentIds": ["tech-{slug}"], "featureId": "feat-{slug}" }
  ],
  "technicalComponents": [
    { "id": "tech-{slug}", "name": "...", "type": "...", "responsibility": "...", "adrId": "ADR-NNN|null", "docPath": "tech-registry/{slug}.md", "codeLocations": [{ "path": "...", "symbols": [], "lineRange": [0,0] }], "dependsOn": [], "featureIds": ["feat-{slug}"], "actionIds": [] }
  ],
  "architectureDecisions": [
    { "id": "ADR-NNN", "title": "...", "source": "spec", "sourcePath": "specs/SPEC-*/architecture/ADR-NNN-*.md", "componentIds": ["tech-{slug}"] }
  ],
  "actions": []
}
```

### Merge with Existing Code-First Index

If a code-first index exists (from prior `/ddd:scan`):
- Replace `IREQ-NNN` with matching `REQ-NNN` where content overlaps
- Keep `IREQ-NNN` without spec counterpart (mark `source: "legacy-inferred"`)
- Replace `IADR-NNN` with `ADR-NNN` where applicable
- Update `build_path` to `"spec-first"`
- Preserve existing `tech-*` components (update links only)

## Phase 5: Generate Documents

Delegate all document generation to `/ddd:doc-generate`:

```
Invoke /ddd:doc-generate [-y]
```

This generates the complete document tree (Layer 3 → 2 → 1):
- `tech-registry/{slug}.md` — component docs from Phase 2 mapping (Layer 3)
- `feature-maps/{slug}.md` — feature docs from Phase 3 mapping (Layer 2)
- `_index.md`, `README.md`, `ARCHITECTURE.md`, `SCHEMA.md` — index/overview docs (Layer 1)

See `/ddd:doc-generate` for full details on generation strategy and flags.

## Phase 6: Coverage Report

```
Index Build Report (spec-first)

Spec: {session-id}
Features: {N} (from {N} Epics)
Requirements: {N} (REQ: {n}, NFR: {n})
Components: {N} ({orphan} orphans without spec match)
ADRs: {N}

Mapping Coverage:
  Requirements → Components: {%} ({unmapped} unmapped)
  Components → Features: {%}
  Epics → Features: 100%

Gaps:
  - {N} requirements have no matching code component
  - {N} code components are not linked to any requirement
```

## Flags

| Flag | Effect |
|------|--------|
| `-y, --yes` | Skip all interactive prompts |
| `-s, --spec <id>` | Use specific spec session |
| `--from-scratch` | Delete existing index and rebuild |

## Integration Points

- **Input from**: `spec-generator` outputs, codebase, existing `/ddd:scan` index
- **Delegates to**: `/ddd:doc-generate` (Phase 5, full document generation)
- **Output to**: `ddd:plan`, `ddd:sync`, `ddd:update`
- **Upgrades**: Can merge with prior code-first (`/ddd:scan`) index
