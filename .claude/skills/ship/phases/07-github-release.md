# Phase 7: GitHub Release

Tag the release commit and publish a GitHub release with auto-generated release notes.

## Objective

- Create an annotated git tag `vX.Y.Z` pointing at the release commit
- Push the tag to origin
- Create a GitHub release with structured release notes (summary, commit list, migration notes, compare link)

## Gate Condition

`gh release create` returns a release URL.

## Prerequisite

- Phase 6 (Platform Publish) completed with status `pass` or `skip`. **Do not create a release for a version that failed to publish.**
- `gh` CLI authenticated (`gh auth status`).

## Execution Steps

### Step 1: Create and Push Annotated Tag

```bash
# Tag the release commit
git tag -a "v${new_version}" -m "v${new_version}"

# Push to origin
git push origin "v${new_version}"
```

**Do NOT** use lightweight tags — annotated tags carry the release metadata and are what `gh release create` expects.

If the tag already exists (e.g. a prior attempt pushed the tag), decide:
- Same commit → skip tag creation, proceed to release
- Different commit → BLOCKED, tag must be deleted and recreated deliberately (destructive, require user confirmation)

### Step 2: Compose Release Notes

Release notes have four sections — keep them focused and scannable:

```markdown
## Summary

- **{highlight 1}**: one-line description of the most impactful change
- **{highlight 2}**: another key change (feature/fix/perf)
- **Scope**: rough scale indicator (e.g. "74 files across X, Y, Z")

## What's Changed

- `<commit subject>` (<short SHA>)
- `<commit subject>` (<short SHA>)

## Migration

{Migration notes if any, or "No action required."}

**Full Changelog**: https://github.com/{owner}/{repo}/compare/v{prev}...v{new}
```

**Sourcing the content**:

- **Summary bullets**: synthesize 2-4 highlights from the commits since last release. Prefer `feat:` / `refactor:` / breaking changes. Call out compatibility posture explicitly if it's non-trivial.
- **What's Changed**: one line per commit since `git describe --tags --abbrev=0` (exclude merge commits and the `chore: bump version` commit itself).
- **Migration**: only include if users need to take action. Default to "No action required."
- **Compare link**: always include — it's the authoritative diff.

```bash
prev_tag=$(git describe --tags --abbrev=0 HEAD^)
commits=$(git log "$prev_tag..v${new_version}^" --pretty=format:"- \`%s\` (%h)" --no-merges)
compare_url="https://github.com/${owner}/${repo}/compare/${prev_tag}...v${new_version}"
```

### Step 3: Create GitHub Release

```bash
gh release create "v${new_version}" \
  --title "v${new_version} — {short descriptive suffix}" \
  --notes "$(cat <<'EOF'
## Summary

- ...

## What's Changed

- ...

## Migration

...

**Full Changelog**: ...
EOF
)"
```

**Title convention**: `v{X.Y.Z} — {Short Theme}` (e.g. `v7.3.7 — Session ID Chronological Sort`). The suffix summarizes the release theme in 2-5 words.

**Flags**:
- Omit `--draft` unless the user wants to review notes first
- Omit `--prerelease` for standard releases; use it for `-beta` / `-rc` tags
- `--latest` is automatic when the tag is the highest semver

### Step 4: Capture Release URL

`gh release create` prints the release URL on stdout — capture and report it:

```bash
release_url=$(gh release create ... 2>&1 | tail -1)
echo "Release: $release_url"
```

## Output

```json
{
  "phase": "github-release",
  "tag": "v7.3.7",
  "tagged_sha": "3a0d6d71",
  "release_url": "https://github.com/owner/repo/releases/tag/v7.3.7",
  "previous_tag": "v7.3.6",
  "commits_included": 4,
  "overall": "pass|fail"
}
```

## Completion

After the GitHub release is created, emit the final Completion Status:

```
## STATUS: DONE

**Summary**: Released vX.Y.Z — published to {registry} and GitHub

### Details
- Version: {previous} -> {new} ({bump_type})
- npm: https://www.npmjs.com/package/{pkg_name}/v/{new}
- Release: {release_url}
- Tag: v{new} -> {commit_sha}

### Outputs
- CHANGELOG.md (updated)
- Release commit: {sha}
- npm tarball: {size}, {files} files
- GitHub release: {release_url}
```

Use `DONE_WITH_CONCERNS` if the publish step was skipped (private package) or if the release notes were auto-generated without human review.
