# Phase 4: Changelog & Commit

Generate changelog entry from git history, update CHANGELOG.md, create release commit, and push to remote.

## Objective

- Parse git log since last tag into grouped changelog entry
- Update or create CHANGELOG.md
- Create a release commit with version in the message
- Push the branch to remote

## Gate Condition

Release commit created and pushed to remote successfully.

## Execution Steps

### Step 1: Gather Commits Since Last Tag

```bash
last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -n "$last_tag" ]; then
  echo "Generating changelog since tag: $last_tag"
  git log "$last_tag"..HEAD --pretty=format:"%h %s" --no-merges
else
  echo "No previous tag found — using last 50 commits"
  git log --pretty=format:"%h %s" --no-merges -50
fi
```

### Step 2: Group Commits by Conventional Commit Type

Parse commit messages and group into categories:

| Prefix | Category | Changelog Section |
|--------|----------|-------------------|
| `feat:` / `feat(*):`| Features | **Features** |
| `fix:` / `fix(*):`| Bug Fixes | **Bug Fixes** |
| `perf:` | Performance | **Performance** |
| `docs:` | Documentation | **Documentation** |
| `refactor:` | Refactoring | **Refactoring** |
| `chore:` | Maintenance | **Maintenance** |
| `test:` | Testing | *(omitted from changelog)* |
| Other | Miscellaneous | **Other Changes** |

```bash
# Example grouping logic (executed by the agent, not a literal script):
# 1. Read all commits since last tag
# 2. Parse prefix from each commit message
# 3. Group into categories
# 4. Format as markdown sections
# 5. Omit empty categories
```

### Step 3: Format Changelog Entry

Generate a markdown changelog entry:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Features
- feat: description (sha)
- feat(scope): description (sha)

### Bug Fixes
- fix: description (sha)

### Performance
- perf: description (sha)

### Other Changes
- chore: description (sha)
```

Rules:
- Date format: YYYY-MM-DD (ISO 8601)
- Each entry includes the short SHA for traceability
- Empty categories are omitted
- Entries are listed in chronological order within each category

### Step 4: Update CHANGELOG.md

```bash
if [ -f "CHANGELOG.md" ]; then
  # Insert new entry after the first heading line (# Changelog)
  # The new entry goes between the main heading and the previous version entry
  # Use Write tool to insert the new section at the correct position
  echo "Updating existing CHANGELOG.md"
else
  # Create new CHANGELOG.md with header
  echo "Creating new CHANGELOG.md"
fi
```

**CHANGELOG.md structure**:
```markdown
# Changelog

## [X.Y.Z] - YYYY-MM-DD
(new entry here)

## [X.Y.Z-1] - YYYY-MM-DD
(previous entry)
```

### Step 5: Create Release Commit

```bash
# Stage version file and changelog
git add package.json package-lock.json pyproject.toml VERSION CHANGELOG.md 2>/dev/null

# Only stage files that actually exist and are modified
git add -u

# Create release commit
git commit -m "$(cat <<'EOF'
chore: bump version to X.Y.Z

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

**Commit message format**: `chore: bump version to X.Y.Z`
- Follows conventional commit format
- Includes Co-Authored-By trailer

### Step 6: Push to Remote

```bash
current_branch=$(git branch --show-current)

# Check if remote tracking branch exists
if git rev-parse --verify "origin/$current_branch" &>/dev/null; then
  git push origin "$current_branch"
else
  git push -u origin "$current_branch"
fi
```

**On push failure**:
- If rejected (non-fast-forward): Report BLOCKED, suggest `git pull --rebase`
- If permission denied: Report BLOCKED, check remote access
- If no remote configured: Report BLOCKED, suggest `git remote add`

## Output

- **Format**: Commit and push record
- **Structure**:

```json
{
  "phase": "changelog-commit",
  "changelog_entry": "## [X.Y.Z] - YYYY-MM-DD ...",
  "commit_sha": "abc1234",
  "commit_message": "chore: bump version to X.Y.Z",
  "pushed_to": "origin/branch-name",
  "overall": "pass|fail"
}
```

## Next Phase

If commit and push succeed, proceed to [Phase 5: PR Creation](05-pr-creation.md).
If push fails, report BLOCKED status with error details.
