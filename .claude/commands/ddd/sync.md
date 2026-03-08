---
name: sync
description: Post-task synchronization - update document index, generate action log, and refresh feature/component docs after completing a development task.
argument-hint: "[-y|--yes] [--dry-run] [--from-manifest <path>] [--task-id <id>] [--commit <hash>] \"task summary\""
allowed-tools: TodoWrite(*), Agent(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*), mcp__ace-tool__search_context(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-detect changes, auto-update all docs, skip review prompts.

# DDD Sync Command (/ddd:sync)

## Purpose

After completing a development task, synchronize the document index with actual code changes:
1. **Analyze** what changed (git diff)
2. **Trace** which features/requirements/components are affected
3. **Update** index entries (status, code locations, links)
4. **Generate** action log entry
5. **Refresh** feature-map and tech-registry documents

## When to Use: sync vs update

| Scenario | Use |
|----------|-----|
| Task completed, ready to commit | **ddd:sync** — full post-task reconciliation |
| Mid-development, quick impact check | ddd:update |
| Pre-commit validation | ddd:update --check-only |
| Auto-triggered after ddd:execute | **ddd:sync** (automatic) |
| Periodic index refresh during refactoring | ddd:update |

**Rule of thumb**: `sync` = task boundary (done something), `update` = development pulse (doing something).

## Prerequisite

- `doc-index.json` must exist
- Git repository with committed or staged changes

## Phase 1: Change Detection

### 0.1 Schema Version Check (TASK-006)

Before processing changes, verify doc-index schema compatibility:

```javascript
const docIndex = JSON.parse(Read('.workflow/.doc-index/doc-index.json'));
const schemaVersion = docIndex.schema_version || '0.0'; // Default for legacy

if (schemaVersion !== '1.0') {
  console.warn(`Schema version mismatch: found ${schemaVersion}, expected 1.0`);
  console.warn('Consider running schema migration or regenerating doc-index with /ddd:scan');
  // Continue with degraded functionality - may encounter missing fields
}
```

**Graceful degradation**: If version mismatch detected → log warning → continue with caution (some features may not work as expected).

### 1.0 Data Source Selection

```
IF --from-manifest <path>:
  Load execution-manifest.json
  → files_modified[] provides precise file list + action type + task attribution
  → TASK-*.result.json provides symbol-level changes + convergence results
  → Skip Phase 1.1/1.2 (already classified by execute)
  → Proceed directly to Phase 2 with manifest data
ELSE:
  → Fall through to Phase 1.1 (git-based discovery)
```

**`--from-manifest` advantages** (used automatically by ddd:execute):
- Precise file → task attribution (which task modified which file)
- Symbol-level change tracking (not just file-level)
- Convergence verification results carried forward to action-log
- Survives process interruptions (manifest is persisted to disk)

### 1.1 Identify Changes (git-based fallback)

```bash
# If --commit provided:
git diff --name-only {commit}^..{commit}
git diff --stat {commit}^..{commit}

# If --task-id provided, find related commits:
git log --oneline --grep="task-{id}" | head -10

# Otherwise: changes since last ddd:sync
git diff --name-only HEAD~1..HEAD
```

### 1.2 Classify Changes (git-based fallback)

For each changed file, determine:
- **Type**: added | modified | deleted | renamed
- **Category**: source | test | config | docs | other
- **Symbols affected**: parse diff for changed functions/classes (use Gemini if complex)

## Phase 2: Impact Tracing (Layer-Based, TASK-004)

**Strategy**: Trace impact through layers (files → components → features → indexes) following memory-manage pattern.

### 2.1 Match to Index

For each changed file path:

```
Search doc-index.json.technicalComponents[].codeLocations[].path
→ Find matching component IDs (Layer 3)
→ From components, find linked featureIds (Layer 2)
→ From features, find linked requirementIds (Layer 2)
```

### 2.2 Discover New Components

If changed files don't match any existing component:
- Flag as potential new component
- Ask user if it should be registered (or auto-register with `-y`)

### 2.3 Build Impact Report

```markdown
## Impact Summary

### Changed Files (5)
- src/services/auth.ts (modified) → tech-auth-service → feat-auth
- src/models/user.ts (modified) → tech-user-model → feat-auth
- src/routes/login.ts (added) → NEW COMPONENT → feat-auth
- src/tests/auth.test.ts (modified) → [test file, skip]
- package.json (modified) → [config, skip]

### Affected Features
- feat-auth: User Authentication (2 components modified, 1 new)

### Affected Requirements
- REQ-001: Email login (implementation updated)
- REQ-002: JWT token generation (implementation updated)
```

## Phase 2.4: DeepWiki Freshness Check

If DeepWiki integration is configured (`doc-index.json.freshness` exists):

### 2.4.1 Identify Modified Files
From `execution-manifest.json` or git diff, collect `files_modified[]` with `action == "modified"`.

### 2.4.2 Check Staleness
Query DeepWiki: `POST /api/deepwiki/stale-files { files: [{path, hash}] }`

For each stale file's symbols, calculate staleness score:
```
S(symbol) = min(1.0, w_t × T + w_c × C + w_s × M)
```
Where weights come from `doc-index.json.freshness.weights`.

### 2.4.3 Score Propagation (max aggregation)
```
S_file      = max(S_symbol_1, S_symbol_2, ...)
S_component = max(S_file_1, S_file_2, ...)
S_feature   = max(S_component_1, S_component_2, ...)
```

### 2.4.4 Status Assignment
Using thresholds from `doc-index.json.freshness.thresholds`:
- `fresh`: score in [0, warning_threshold)
- `warning`: score in [warning_threshold, stale_threshold)
- `stale`: score in [stale_threshold, 1.0]

### 2.4.5 Update Records
- Update `deepwiki_symbols.staleness_score` and `deepwiki_files.staleness_score` in DeepWiki SQLite
- Update `tech-registry/{slug}.md` YAML frontmatter with freshness block
- Update `feature-maps/{slug}.md` YAML frontmatter with freshness block
- Update `deepwiki_feature_to_symbol_index` in doc-index.json

### 2.4.6 Staleness Report
Add to action-log:
- Number of stale symbols/files/components
- Top-5 most stale items with scores
- Auto-regeneration candidates (if `auto_regenerate: true` and score >= stale threshold)

## Phase 3: Update Index

### 3.0 Dry-Run Gate

If `--dry-run` is set:
- Execute Phase 3 analysis (determine what would change)
- Display planned modifications as a preview report
- Skip all file writes (Phase 3.1-3.5 and Phase 4)
- Output: "Dry-run complete. Run without --dry-run to apply changes."

### 3.0.1 Backup Index

Before any modifications, create backup:
- Copy `doc-index.json` → `doc-index.json.bak`
- On failure: restore from `.bak` and report error
- On success: remove `.bak`

### 3.1 Update Technical Components

For each affected component in `doc-index.json`:
- Update `codeLocations` if file paths or line ranges changed
- Update `symbols` if new exports were added
- Add new `actionIds` entry

### 3.2 Register New Components

For newly discovered components:
- Generate `tech-{slug}` ID
- Create entry in `technicalComponents[]`
- Link to appropriate features
- Generate new `tech-registry/{slug}.md` document

### 3.3 Update Feature Status

For each affected feature:
- If all requirements now have mapped components → `status: "implemented"`
- If some requirements still unmapped → `status: "in-progress"`

### 3.4 Add Action Entry

```json
{
  "id": "task-{id}",
  "description": "{task summary from user}",
  "type": "feature|bugfix|refactor",
  "status": "completed",
  "affectedFeatures": ["feat-auth"],
  "affectedComponents": ["tech-auth-service", "tech-user-model"],
  "changedFiles": [
    { "path": "src/services/auth.ts", "action": "modified", "task_id": "TASK-001" },
    { "path": "src/models/user.ts", "action": "modified", "task_id": "TASK-001" }
  ],
  "symbolsChanged": ["AuthService.validate", "UserModel.toJSON"],
  "convergenceResults": {
    "passed": 2,
    "total": 2,
    "details": ["Rate limiter middleware exists", "Config accepts per-route limits"]
  },
  "verifyGate": "PASS|WARN|FAIL|skipped",
  "relatedCommit": "{commit hash}",
  "manifestPath": "{execution-manifest.json path | null}",
  "timestamp": "ISO8601"
}
```

### 3.5 Update Timestamp

Set `doc-index.json.last_updated` to current time.

## Phase 4: Refresh Documents & Action Log

### 4.1 Delegate Document Refresh to /ddd:doc-refresh

From Phase 2 impact tracing, collect affected component and feature IDs, then delegate:

```
Invoke /ddd:doc-refresh [-y] --components {affected_component_ids} --features {affected_feature_ids}
```

This handles Layer 3 → 2 → 1 selective document refresh. See `/ddd:doc-refresh` for full details.

### 4.2 Generate Action Log Entry

Create `.workflow/.doc-index/action-logs/{task-id}.md`:

```markdown
---
id: task-{id}
type: feature|bugfix|refactor
status: completed
features: [feat-auth]
components: [tech-auth-service, tech-user-model]
commit: {hash}
timestamp: ISO8601
---

# Task: {summary}

## Changes
| File | Type | Component |
|------|------|-----------|
| src/services/auth.ts | modified | tech-auth-service |

## Impact
- Features affected: feat-auth
- Requirements addressed: REQ-001, REQ-002

## Staleness (if DeepWiki freshness enabled)
| Item | Type | Score | Status |
|------|------|-------|--------|
| {symbol/file/component} | {type} | {score} | {fresh/warning/stale} |

## Notes
{any user-provided notes}
```

## Phase 5: Confirmation (unless -y)

Present update summary to user:
- Files updated in doc-index
- New documents created
- Status changes
- Ask for confirmation before writing

## Flags

| Flag | Effect |
|------|--------|
| `-y, --yes` | Auto-confirm all updates |
| `--dry-run` | Preview all changes without modifying any files |
| `--from-manifest <path>` | Use execution-manifest.json as data source (auto-set by ddd:execute) |
| `--task-id <id>` | Associate with specific task ID |
| `--commit <hash>` | Analyze specific commit |

## Integration Points

- **Input from**: `execution-manifest.json` (preferred, from ddd:execute) OR Git history (fallback), `doc-index.json`, `/ddd:plan` output
- **Delegates to**: `/ddd:doc-refresh` (Phase 4.1, selective document refresh)
- **Output to**: Updated `doc-index.json`, feature-maps/, tech-registry/, action-logs/
- **Triggers**: After completing any development task
- **Data source priority**: `--from-manifest` > `--commit` > `--task-id` > git diff HEAD~1
