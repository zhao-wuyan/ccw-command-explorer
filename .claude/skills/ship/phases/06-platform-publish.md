# Phase 6: Platform Publish

Publish the released version to its package registry (npm, PyPI, etc.). Runs after the release commit is merged to the default branch (or immediately after push for trunk-based workflows).

## Objective

- Detect the target registry from the version file type
- Verify the local working tree is on the release commit
- Publish to the registry
- Capture the published artifact metadata (name, version, tarball URL)

## Gate Condition

Publish command exits 0 and registry confirms the new version is live.

## When to Skip

- Project is marked `"private": true` in `package.json` (or equivalent private flag) — **skip and record as N/A**
- User explicitly passes `--no-publish`
- Registry is unreachable — report BLOCKED with diagnostic, do not retry blindly

## Execution Steps

### Step 1: Detect Registry

| Version File | Registry | Publish Command |
|--------------|----------|-----------------|
| `package.json` (not private) | npm | `npm publish` |
| `pyproject.toml` | PyPI | `python -m build && twine upload dist/*` |
| `Cargo.toml` | crates.io | `cargo publish` |
| `VERSION` / other | — | SKIP (no registry) |

```bash
if [ -f "package.json" ]; then
  is_private=$(node -p "require('./package.json').private === true" 2>/dev/null || echo "false")
  if [ "$is_private" = "true" ]; then
    echo "SKIP: package.json marked private"
    exit 0
  fi
  pkg_name=$(node -p "require('./package.json').name")
  pkg_version=$(node -p "require('./package.json').version")
fi
```

### Step 2: Verify Working Tree

Before publishing, confirm the local tree matches what was committed:

```bash
git status --porcelain  # must be empty
git rev-parse HEAD      # record the commit SHA being published
```

If the tree is dirty, abort — partial/uncommitted changes must never land in a published artifact.

### Step 3: Publish

**npm**:
```bash
# Default — runs the package's own prepublish hooks (build, clean, etc.)
npm publish 2>&1 | tee /tmp/publish.log

# For scoped packages that need public access:
# npm publish --access public
```

Background execution is acceptable for long publish operations (large packages, slow network). Use the Bash tool's `run_in_background: true` and monitor the output file.

**PyPI**:
```bash
rm -rf dist/ build/
python -m build
twine upload dist/* 2>&1 | tee /tmp/publish.log
```

### Step 4: Verify Publish

```bash
# npm — query the registry for the new version
npm view "$pkg_name@$pkg_version" version

# PyPI — query the simple index
curl -sfI "https://pypi.org/pypi/$pkg_name/$pkg_version/json" | head -1
```

If verification fails, check the publish log — a common cause is an `OTP required` prompt for 2FA npm accounts. Surface the prompt to the user.

## Output

```json
{
  "phase": "platform-publish",
  "registry": "npm|pypi|crates|none",
  "package_name": "claude-code-workflow",
  "published_version": "7.3.7",
  "tarball_size": "8.2 MB",
  "total_files": 2280,
  "published_sha": "3a0d6d71",
  "overall": "pass|skip|fail"
}
```

## Next Phase

Proceed to [Phase 7: GitHub Release](07-github-release.md).

If publish fails, report BLOCKED — **do not** proceed to GitHub release, since the release notes would point to a version that doesn't exist on the registry.
