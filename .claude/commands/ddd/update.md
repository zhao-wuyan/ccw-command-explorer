---
name: update
description: Incremental index update - detect code changes and trace impact to related features/requirements. Lightweight alternative to full sync.
argument-hint: "[-y|--yes] [--files <file1,file2,...>] [--staged] [--check-only]"
allowed-tools: TodoWrite(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*), mcp__ace-tool__search_context(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-update index without confirmation prompts.

# DDD Update Command (/ddd:update)

## Purpose

Lightweight incremental update: given a set of changed files, trace their impact through the document index and update affected entries. Unlike `/ddd:sync` (full post-task sync), this command focuses on keeping the index fresh during development.

## When to Use: update vs sync

| Scenario | Use |
|----------|-----|
| Quick impact check during development | **ddd:update** |
| Preview what sync would change | **ddd:update --check-only** |
| Task completed, full reconciliation | ddd:sync |
| Register new components + update all docs | ddd:sync |

**Rule of thumb**: `update` = lightweight pulse (during work), `sync` = full checkpoint (after work).

## Use Cases

1. **During development**: Quick check which docs are affected by current changes
2. **Pre-commit check**: Ensure index is up-to-date before committing
3. **Periodic refresh**: Update stale code locations after refactoring

## Prerequisite

- `doc-index.json` must exist at `.workflow/.doc-index/doc-index.json`

## Phase 1: Identify Changed Files

### Source Priority

```
1. --files <list>      → Explicit file list
2. --staged            → git diff --cached --name-only
3. (default)           → git diff --name-only (unstaged changes)
```

### Output

List of changed file paths with change type (added/modified/deleted/renamed).

## Phase 2: Trace Impact

### 2.1 Forward Lookup (Code → Components → Features)

For each changed file:

```
doc-index.json.technicalComponents[]
  .codeLocations[].path MATCH changed_file
  → component_ids[]

doc-index.json.technicalComponents[component_ids]
  .featureIds[]
  → feature_ids[]

doc-index.json.features[feature_ids]
  .requirementIds[]
  → requirement_ids[]
```

### 2.2 Orphan Detection

Files not matching any component → flag as:
- **Potential new component**: if in src/ directory
- **Ignorable**: if in test/, docs/, config/ directories

### 2.3 Impact Report

```
Impact Analysis for 3 changed files:

  src/services/auth.ts (modified)
    → Component: tech-auth-service (AuthService)
    → Feature: feat-auth (User Authentication)
    → Requirements: REQ-001, REQ-002

  src/middleware/rate-limit.ts (added)
    → No matching component (new file)
    → Suggested: Register as new component

  src/utils/hash.ts (modified)
    → Component: tech-hash-util
    → Features: feat-auth, feat-password-reset
    → Requirements: REQ-001, REQ-005
```

## Phase 3: Update Index (unless --check-only)

### 3.1 Update Code Locations

For matched components:
- If file was renamed → update `codeLocations[].path`
- If file was deleted → remove code location entry
- If symbols changed → update `symbols` list (requires AST or Gemini analysis)

### 3.2 Register New Components (interactive unless -y)

For orphan files in src/:
- Prompt user for component name and type
- Or auto-generate with `-y`: derive name from file path
- Create `technicalComponents[]` entry
- Ask which feature it belongs to (or auto-link by directory structure)

### 3.3 Update Timestamps

- Update `technicalComponents[].docPath` last_updated in corresponding .md
- Update `doc-index.json.last_updated`

## Phase 4: Refresh Documents (if updates were made)

### 4.1 Delegate to /ddd:doc-refresh

From Phase 2 impact tracing, collect affected component and feature IDs, then delegate:

```
Invoke /ddd:doc-refresh [-y] --minimal --components {affected_component_ids} --features {affected_feature_ids}
```

The `--minimal` flag ensures only metadata/frontmatter is updated (code locations, timestamps), skipping full content regeneration. This keeps the update lightweight.

See `/ddd:doc-refresh` for full details.

### 4.2 Skip If --check-only

With `--check-only`, skip Phase 3 and Phase 4 entirely — only output the impact report.

## Flags

| Flag | Effect |
|------|--------|
| `-y, --yes` | Auto-confirm updates |
| `--files <list>` | Explicit comma-separated file list |
| `--staged` | Analyze staged (git cached) files |
| `--check-only` | Report impact without modifying index |

## Output

- **Console**: Impact report showing affected features/requirements
- **Updated**: `doc-index.json` (if not --check-only)
- **Updated**: Affected tech-registry/ and feature-maps/ docs

## Integration Points

- **Input from**: Git working tree, `doc-index.json`
- **Delegates to**: `/ddd:doc-refresh` (Phase 4.1, incremental document refresh with --minimal)
- **Output to**: Updated `doc-index.json`, impact report
- **Triggers**: During development, pre-commit, or periodic refresh
- **Can chain to**: `/ddd:sync` for full post-task synchronization
