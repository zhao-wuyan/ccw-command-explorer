---
name: complete
description: Mark active workflow session as complete, archive with lessons learned, update manifest, remove active flag
argument-hint: "[-y|--yes] [--detailed]"
examples:
  - /workflow:session:complete
  - /workflow:session:complete --yes
  - /workflow:session:complete --detailed
---

# Complete Workflow Session (/workflow:session:complete)

Mark the currently active workflow session as complete, archive it, and update manifests.

## Pre-defined Commands

```bash
# Phase 1: Find active session
SESSION_PATH=$(find .workflow/active/ -maxdepth 1 -name "WFS-*" -type d | head -1)
SESSION_ID=$(basename "$SESSION_PATH")

# Phase 3: Move to archive
mkdir -p .workflow/archives/
mv .workflow/active/$SESSION_ID .workflow/archives/$SESSION_ID

# Cleanup marker
rm -f .workflow/archives/$SESSION_ID/.archiving
```

## Key Files to Read

**For manifest.json generation**, read ONLY these files:

| File | Extract |
|------|---------|
| `$SESSION_PATH/workflow-session.json` | session_id, description, started_at, status |
| `$SESSION_PATH/IMPL_PLAN.md` | title (first # heading), description (first paragraph) |
| `$SESSION_PATH/.tasks/*.json` | count files |
| `$SESSION_PATH/.summaries/*.md` | count files |
| `$SESSION_PATH/.review/dimensions/*.json` | count + findings summary (optional) |

## Execution Flow

### Phase 1: Find Session (2 commands)

```bash
# 1. Find and extract session
SESSION_PATH=$(find .workflow/active/ -maxdepth 1 -name "WFS-*" -type d | head -1)
SESSION_ID=$(basename "$SESSION_PATH")

# 2. Check/create archiving marker
test -f "$SESSION_PATH/.archiving" && echo "RESUMING" || touch "$SESSION_PATH/.archiving"
```

**Output**: `SESSION_ID` = e.g., `WFS-auth-feature`

### Phase 2: Generate Manifest Entry (Read-only)

Read the key files above, then build this structure:

```json
{
  "session_id": "<from workflow-session.json>",
  "description": "<from workflow-session.json>",
  "archived_at": "<current ISO timestamp>",
  "archive_path": ".workflow/archives/<SESSION_ID>",
  "metrics": {
    "duration_hours": "<(completed_at - started_at) / 3600000>",
    "tasks_completed": "<count .tasks/*.json>",
    "summaries_generated": "<count .summaries/*.md>",
    "review_metrics": {
      "dimensions_analyzed": "<count .review/dimensions/*.json>",
      "total_findings": "<sum from dimension JSONs>"
    }
  },
  "tags": ["<3-5 keywords from IMPL_PLAN.md>"],
  "lessons": {
    "successes": ["<key wins>"],
    "challenges": ["<difficulties>"],
    "watch_patterns": ["<patterns to monitor>"]
  }
}
```

**Lessons Generation**: Use gemini with `~/.ccw/workflows/cli-templates/prompts/archive/analysis-simple.txt`

### Phase 3: Atomic Commit (4 commands)

```bash
# 1. Create archive directory
mkdir -p .workflow/archives/

# 2. Move session
mv .workflow/active/$SESSION_ID .workflow/archives/$SESSION_ID

# 3. Update manifest.json (Read → Append → Write)
# Read: .workflow/archives/manifest.json (or [])
# Append: archive_entry from Phase 2
# Write: updated JSON

# 4. Remove marker
rm -f .workflow/archives/$SESSION_ID/.archiving
```

**Output**:
```
✓ Session "$SESSION_ID" archived successfully
  Location: .workflow/archives/$SESSION_ID/
  Manifest: Updated with N total sessions
```

### Phase 4: Auto-Sync Project State

Execute `/workflow:session:sync -y "{description}"` to update both `specs/*.md` and `project-tech.json` from session context.

Description 取自 Phase 2 的 `workflow-session.json` description 字段。

## Auto Mode Defaults

When `--yes` or `-y` flag is used:
- **Sync**: Auto-executed with `-y` (no confirmation)

## Error Recovery

| Phase | Symptom | Recovery |
|-------|---------|----------|
| 1 | No active session | `No active session found` |
| 2 | Analysis fails | Remove marker: `rm $SESSION_PATH/.archiving`, retry |
| 3 | Move fails | Session safe in active/, fix issue, retry |
| 3 | Manifest fails | Session in archives/, manually add entry, remove marker |

## Quick Reference

```
Phase 1: find session → create .archiving marker
Phase 2: read key files → build manifest entry (no writes)
Phase 3: mkdir → mv → update manifest.json → rm marker
Phase 4: /workflow:session:sync -y → update specs/*.md + project-tech
```
