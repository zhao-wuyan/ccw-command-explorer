# Phase 4: Changelog & Commit

> **COMPACT PROTECTION**: This is a core execution phase. If context compression has occurred and this file is only a summary, **MUST `Read` this file again before executing any Step**. Do not execute from memory.

Generate changelog entry from git history, update CHANGELOG.md, create release commit, and push to remote.

## Objective

- Parse git log since last tag into grouped changelog entry
- Update or create CHANGELOG.md
- Create a release commit with version in the message
- Push the branch to remote

## Input

| Source | Required | Description |
|--------|----------|-------------|
| Phase 3 output | Yes | new_version, version_file, bump_type |
| Git history | Yes | Commits since last tag |
| CHANGELOG.md | No | Updated in-place if it exists; created if not |

## Execution Steps

### Step 1: Gather Commits Since Last Tag

Retrieve commits to include in the changelog.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| Last tag exists | `git log "$last_tag"..HEAD --pretty=format:"%h %s" --no-merges` |
| No previous tag found | Use last 50 commits: `git log --pretty=format:"%h %s" --no-merges -50` |

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

---

### Step 2: Group Commits by Conventional Commit Type

Parse commit messages and group into changelog sections.

**Conventional Commit Grouping Table**:

| Prefix | Category | Changelog Section |
|--------|----------|-------------------|
| `feat:` / `feat(*):` | Features | **Features** |
| `fix:` / `fix(*):` | Bug Fixes | **Bug Fixes** |
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

---

### Step 3: Format Changelog Entry

Generate a markdown changelog entry using ISO 8601 date format.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| Category has commits | Include section with all entries |
| Category is empty | Omit section entirely |
| test: commits present | Omit from changelog output |

Changelog entry format:

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

---

### Step 4: Update CHANGELOG.md

Write the new entry into CHANGELOG.md.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| CHANGELOG.md exists | Insert new entry after the first heading line (`# Changelog`), before previous version entry |
| CHANGELOG.md does not exist | Create new file with `# Changelog` heading followed by new entry |

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

---

### Step 5: Create Release Commit

Stage changed files and create conventionally-formatted release commit.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| Version file is package.json | Stage package.json and package-lock.json (if present) |
| Version file is pyproject.toml | Stage pyproject.toml |
| Version file is VERSION | Stage VERSION |
| CHANGELOG.md was updated/created | Stage CHANGELOG.md |
| git commit succeeds | Proceed to push step |
| git commit fails | BLOCKED — report error |

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

**Commit message format**: `chore: bump version to <new_version>`
- Follows conventional commit format
- Includes Co-Authored-By trailer

---

### Step 6: Push to Remote

Push the branch to the remote origin.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| Remote tracking branch exists | `git push origin "<current_branch>"` |
| No remote tracking branch | `git push -u origin "<current_branch>"` |
| Push succeeds (exit 0) | PASS — gate satisfied |
| Push rejected (non-fast-forward) | BLOCKED — report error, suggest `git pull --rebase` |
| Permission denied | BLOCKED — report error, advise check remote access |
| No remote configured | BLOCKED — report error, suggest `git remote add` |

```bash
current_branch=$(git branch --show-current)

# Check if remote tracking branch exists
if git rev-parse --verify "origin/$current_branch" &>/dev/null; then
  git push origin "$current_branch"
else
  git push -u origin "$current_branch"
fi
```

---

## Output

| Artifact | Format | Description |
|----------|--------|-------------|
| Commit and push record | JSON | changelog_entry, commit_sha, commit_message, pushed_to |
| CHANGELOG.md | Markdown file | Updated with new version entry |

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

## Success Criteria

| Criterion | Validation Method |
|-----------|-------------------|
| Commits gathered since last tag | Commit list non-empty or warn if empty |
| Changelog entry formatted | Markdown entry with correct sections |
| CHANGELOG.md updated or created | File exists with new entry at top |
| Release commit created | `git log -1 --oneline` shows commit |
| Branch pushed to remote | Push command exits 0 |
| overall = "pass" | All steps completed without error |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No commits since last tag | WARN — create minimal changelog entry, continue |
| CHANGELOG.md write error | BLOCKED — report file system error |
| git commit fails (nothing staged) | Verify version file and CHANGELOG.md were modified, re-stage |
| Push rejected (non-fast-forward) | BLOCKED — suggest `git pull --rebase`, halt |
| Push permission denied | BLOCKED — advise check SSH keys or access token |
| No remote configured | BLOCKED — suggest `git remote add origin <url>` |

## Next Phase

-> [Phase 5: PR Creation](05-pr-creation.md)

If commit and push succeed (overall: "pass"), proceed to Phase 5.
If push fails, report BLOCKED status with error details. Do not proceed.
