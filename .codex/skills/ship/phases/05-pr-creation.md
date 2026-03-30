# Phase 5: PR Creation

> **COMPACT PROTECTION**: This is a core execution phase. If context compression has occurred and this file is only a summary, **MUST `Read` this file again before executing any Step**. Do not execute from memory.

Create a pull request via GitHub CLI with a structured body, linked issues, and release metadata.

## Objective

- Create a PR using `gh pr create` with structured body
- Auto-link related issues from commit messages
- Include release summary (version, changes, test plan)
- Output the PR URL

## Input

| Source | Required | Description |
|--------|----------|-------------|
| Phase 4 output | Yes | commit_sha, pushed_to |
| Phase 3 output | Yes | new_version, previous_version, bump_type, version_file |
| Phase 2 output | Yes | merge_base (for change summary) |
| Git history | Yes | Commit messages for issue extraction |

## Execution Steps

### Step 1: Extract Issue References from Commits

Scan commit messages for issue reference patterns.

**Issue Reference Pattern**: `fixes #N`, `closes #N`, `resolves #N`, `refs #N` (case-insensitive, singular and plural forms).

**Decision Table**:

| Condition | Action |
|-----------|--------|
| Last tag exists | Scan commits from last_tag..HEAD |
| No last tag | Scan last 50 commit subjects |
| Issue references found | Deduplicate, sort numerically |
| No issue references found | issues_section = empty (omit section from PR body) |

```bash
last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -n "$last_tag" ]; then
  commits=$(git log "$last_tag"..HEAD --pretty=format:"%s" --no-merges)
else
  commits=$(git log --pretty=format:"%s" --no-merges -50)
fi

# Extract issue references: fixes #N, closes #N, resolves #N, refs #N
issues=$(echo "$commits" | grep -oiE '(fix(es)?|close[sd]?|resolve[sd]?|refs?)\s*#[0-9]+' | grep -oE '#[0-9]+' | sort -u || true)

echo "Referenced issues: $issues"
```

---

### Step 2: Determine Target Branch

Find the appropriate base branch for the PR.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| origin/main exists | target_branch = main |
| origin/main not found | target_branch = master |

```bash
# Default target: main (fallback: master)
target_branch="main"
if ! git rev-parse --verify "origin/$target_branch" &>/dev/null; then
  target_branch="master"
fi

current_branch=$(git branch --show-current)
echo "PR: $current_branch -> $target_branch"
```

---

### Step 3: Build PR Title

Format the PR title as `release: vX.Y.Z`.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| new_version available from Phase 3 | pr_title = "release: v<new_version>" |
| new_version not available | Fall back to descriptive title derived from branch name |

```bash
pr_title="release: v${new_version}"
```

---

### Step 4: Build PR Body

Construct the full PR body with all sections.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| issues list non-empty | Include "## Linked Issues" section with each issue as `- #N` |
| issues list empty | Omit "## Linked Issues" section |
| Phase 2 warnings exist | Include warning note in Summary section |

```bash
# Gather change summary
change_summary=$(git log "$merge_base"..HEAD --pretty=format:"- %s (%h)" --no-merges)

# Build linked issues section
if [ -n "$issues" ]; then
  issues_section="## Linked Issues
$(echo "$issues" | while read -r issue; do echo "- $issue"; done)"
else
  issues_section=""
fi
```

**PR Body Sections Table**:

| Section | Content |
|---------|---------|
| **Summary** | Version being released, one-line description |
| **Changes** | Grouped changelog entries (from Phase 4) |
| **Linked Issues** | Auto-extracted `fixes #N`, `closes #N` references |
| **Version** | Previous version, new version, bump type |
| **Test Plan** | Checklist confirming all phases passed |

---

### Step 5: Create PR via gh CLI

Invoke `gh pr create` with title and fully assembled body.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| gh CLI available | Execute `gh pr create` |
| gh CLI not installed | BLOCKED — report missing CLI, advise `gh auth login` |
| PR created successfully | Capture URL from output |
| PR creation fails (already exists) | Report existing PR URL, gate = pass |
| PR creation fails (other error) | BLOCKED — report error details |

```bash
gh pr create --title "$pr_title" --base "$target_branch" --body "$(cat <<'EOF'
## Summary
Release vX.Y.Z

### Changes
- list of changes from changelog

## Linked Issues
- #N (fixes)
- #M (closes)

## Version
- Previous: X.Y.Z-1
- New: X.Y.Z
- Bump type: patch|minor|major

## Test Plan
- [ ] Pre-flight checks passed (git clean, branch, tests, build)
- [ ] AI code review completed with no critical issues
- [ ] Version bump verified in version file
- [ ] Changelog updated with all changes since last release
- [ ] Release commit pushed successfully

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

### Step 6: Capture and Report PR URL

Extract the PR URL from gh output.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| URL present in output | Record pr_url, set gate = pass |
| No URL in output | Check `gh pr view --json url` as fallback |
| Both fail | BLOCKED — report failure |

```bash
# gh pr create outputs the PR URL on success
pr_url=$(gh pr create ... 2>&1 | tail -1)
echo "PR created: $pr_url"
```

---

## Output

| Artifact | Format | Description |
|----------|--------|-------------|
| PR creation record | JSON | pr_url, pr_title, target_branch, source_branch, linked_issues |
| Final completion status | Text block | DONE / DONE_WITH_CONCERNS with full summary |

```json
{
  "phase": "pr-creation",
  "pr_url": "https://github.com/owner/repo/pull/N",
  "pr_title": "release: vX.Y.Z",
  "target_branch": "main",
  "source_branch": "feature-branch",
  "linked_issues": ["#1", "#2"],
  "overall": "pass|fail"
}
```

## Success Criteria

| Criterion | Validation Method |
|-----------|-------------------|
| Issue references extracted | issues list populated (or empty with no error) |
| Target branch determined | target_branch set to main or master |
| PR title formatted | pr_title = "release: v<new_version>" |
| PR body assembled with all sections | All required sections present |
| PR created via gh CLI | pr_url present in output |
| Completion status output | DONE or DONE_WITH_CONCERNS block present |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| gh CLI not installed | BLOCKED — report error, advise install + `gh auth login` |
| Not authenticated with gh | BLOCKED — report auth error, advise `gh auth login` |
| PR already exists for branch | Report existing PR URL, treat as pass |
| No changes to create PR for | BLOCKED — report, suggest verifying Phase 4 push succeeded |
| Issue regex finds no matches | issues = [] — omit Linked Issues section, continue |

## Completion Status

After PR creation, output the final Completion Status:

```
## STATUS: DONE

**Summary**: Released vX.Y.Z — PR created at <pr_url>

### Details
- Phases completed: 5/5
- Version: <previous> -> <new> (<bump_type>)
- PR: <pr_url>
- Key outputs: CHANGELOG.md updated, release commit pushed, PR created

### Outputs
- CHANGELOG.md (updated)
- <version_file> (version bumped)
- Release commit: <sha>
- PR: <pr_url>
```

If there were review warnings from Phase 2, use `DONE_WITH_CONCERNS` and list the warnings in the Details section:

```
## STATUS: DONE_WITH_CONCERNS

**Summary**: Released vX.Y.Z — PR created at <pr_url> (review warnings noted)

### Details
- Phases completed: 5/5
- Version: <previous> -> <new> (<bump_type>)
- PR: <pr_url>
- Concerns: <list review warnings from Phase 2>

### Outputs
- CHANGELOG.md (updated)
- <version_file> (version bumped)
- Release commit: <sha>
- PR: <pr_url>
```
