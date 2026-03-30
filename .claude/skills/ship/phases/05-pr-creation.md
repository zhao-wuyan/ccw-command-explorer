# Phase 5: PR Creation

Create a pull request via GitHub CLI with a structured body, linked issues, and release metadata.

## Objective

- Create a PR using `gh pr create` with structured body
- Auto-link related issues from commit messages
- Include release summary (version, changes, test plan)
- Output the PR URL

## Gate Condition

PR created successfully and URL returned.

## Execution Steps

### Step 1: Extract Issue References from Commits

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

### Step 2: Determine Target Branch

```bash
# Default target: main (fallback: master)
target_branch="main"
if ! git rev-parse --verify "origin/$target_branch" &>/dev/null; then
  target_branch="master"
fi

current_branch=$(git branch --show-current)
echo "PR: $current_branch -> $target_branch"
```

### Step 3: Build PR Title

Format: `release: vX.Y.Z`

```bash
pr_title="release: v${new_version}"
```

If the version context is not available, fall back to a descriptive title from the branch name.

### Step 4: Build PR Body

Construct the PR body using a HEREDOC for correct formatting:

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

### Step 5: Create PR via gh CLI

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

**PR body sections**:

| Section | Content |
|---------|---------|
| **Summary** | Version being released, one-line description |
| **Changes** | Grouped changelog entries (from Phase 4) |
| **Linked Issues** | Auto-extracted `fixes #N`, `closes #N` references |
| **Version** | Previous version, new version, bump type |
| **Test Plan** | Checklist confirming all phases passed |

### Step 6: Capture and Report PR URL

```bash
# gh pr create outputs the PR URL on success
pr_url=$(gh pr create ... 2>&1 | tail -1)
echo "PR created: $pr_url"
```

## Output

- **Format**: PR creation record
- **Structure**:

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

## Completion

After PR creation, output the final Completion Status:

```
## STATUS: DONE

**Summary**: Released vX.Y.Z — PR created at {pr_url}

### Details
- Phases completed: 5/5
- Version: {previous} -> {new} ({bump_type})
- PR: {pr_url}
- Key outputs: CHANGELOG.md updated, release commit pushed, PR created

### Outputs
- CHANGELOG.md (updated)
- {version_file} (version bumped)
- Release commit: {sha}
- PR: {pr_url}
```

If there were review warnings, use `DONE_WITH_CONCERNS` and list the warnings in the Details section.
