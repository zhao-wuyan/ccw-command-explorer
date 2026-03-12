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
└── planning/                   ← Planning sessions (Layer 1)
    ├── _index.md               ← Planning sessions index
    └── {task-slug}-{date}/     ← Individual session folders
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

## Phase 2: Layer 3 -- Component Documentation

For each component in `technicalComponents[]`, call the generate_ddd_docs endpoint:

```bash
for COMPONENT_ID in "${technicalComponents[@]}"; do
  ccw tool exec generate_ddd_docs '{"strategy":"component","entityId":"'"$COMPONENT_ID"'","tool":"gemini"}'
done
```

The endpoint handles:
- Loading the component entity from doc-index.json
- Building YAML frontmatter (layer: 3, component_id, name, type, features, code_locations, generated_at)
- Constructing the CLI prompt with code context paths
- **Including Change History section**: Pull related entries from `doc-index.json.actions[]` where `affectedComponents` includes this component ID. Display as timeline (date, action type, description)
- Writing output to `.workflow/.doc-index/tech-registry/{slug}.md`
- Tool fallback (gemini -> qwen -> codex) on failure

Output: `.workflow/.doc-index/tech-registry/{component-slug}.md`

## Phase 3: Layer 2 -- Feature Documentation

For each feature in `features[]`, call the generate_ddd_docs endpoint:

```bash
for FEATURE_ID in "${features[@]}"; do
  ccw tool exec generate_ddd_docs '{"strategy":"feature","entityId":"'"$FEATURE_ID"'","tool":"gemini"}'
done
```

The endpoint handles:
- Loading the feature entity from doc-index.json
- Building YAML frontmatter (layer: 2, feature_id, name, epic_id, status, requirements, components, tags, generated_at)
- Constructing the CLI prompt referencing Layer 3 component docs
- **Including Change History section**: Pull related entries from `doc-index.json.actions[]` where `affectedFeatures` includes this feature ID. Display as timeline (date, action type, description)
- Writing output to `.workflow/.doc-index/feature-maps/{slug}.md`
- Tool fallback (gemini -> qwen -> codex) on failure

Output: `.workflow/.doc-index/feature-maps/{feature-slug}.md`

## Phase 4: Layer 1 -- Index & Overview Documentation

### 4.1 Index Documents

Generate catalog files for each subdirectory:

```bash
# Feature maps index
ccw tool exec generate_ddd_docs '{"strategy":"index","entityId":"feature-maps","tool":"gemini"}'

# Tech registry index
ccw tool exec generate_ddd_docs '{"strategy":"index","entityId":"tech-registry","tool":"gemini"}'

# Action logs index
ccw tool exec generate_ddd_docs '{"strategy":"index","entityId":"action-logs","tool":"gemini"}'

# Planning sessions index
ccw tool exec generate_ddd_docs '{"strategy":"index","entityId":"planning","tool":"gemini"}'
```

Or generate all indexes at once (omit entityId):

```bash
ccw tool exec generate_ddd_docs '{"strategy":"index","tool":"gemini"}'
```

### 4.2 README.md (unless --skip-overview)

```bash
ccw tool exec generate_ddd_docs '{"strategy":"overview","tool":"gemini"}'
```

### 4.3 ARCHITECTURE.md (unless --skip-overview)

```bash
ccw tool exec generate_ddd_docs '{"strategy":"overview","entityId":"architecture","tool":"gemini"}'
```

## Phase 5: SCHEMA.md (unless --skip-schema)

### 5.1 Generate Schema Documentation

```bash
ccw tool exec generate_ddd_docs '{"strategy":"schema","tool":"gemini"}'
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
| `--skip-overview` | Skip README.md, ARCHITECTURE.md, planning/_index.md |
| `--skip-schema` | Skip SCHEMA.md generation |

## Integration Points

- **Input from**: `doc-index.json` (from `/ddd:scan` or `/ddd:index-build`)
- **Called by**: `/ddd:scan` (after index assembly), `/ddd:index-build` (after index assembly)
- **Standalone**: Can be run independently on any project with existing doc-index.json
- **Output**: Complete document tree in `.workflow/.doc-index/`
- **Endpoint**: `ccw tool exec generate_ddd_docs` handles prompt construction, frontmatter, tool fallback, and file creation
