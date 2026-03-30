# Phase 3: Version Bump

> **COMPACT PROTECTION**: This is a core execution phase. If context compression has occurred and this file is only a summary, **MUST `Read` this file again before executing any Step**. Do not execute from memory.

Detect the current version, determine the bump type, and update the version file.

## Objective

- Detect which version file the project uses
- Read the current version
- Determine bump type (patch/minor/major) from commit messages or user input
- Update the version file
- Record the version change

## Input

| Source | Required | Description |
|--------|----------|-------------|
| Phase 2 gate result | Yes | overall: "pass" or "warn" — must have passed |
| package.json / pyproject.toml / VERSION | Conditional | One must exist; used for version detection |
| Git history | Yes | Commit messages for bump type auto-detection |

## Execution Steps

### Step 1: Detect Version File

Search for version file in priority order.

**Version File Detection Priority Table**:

| Priority | File | Read Method |
|----------|------|-------------|
| 1 | `package.json` | `jq -r .version package.json` |
| 2 | `pyproject.toml` | `grep -oP 'version\s*=\s*"\K[^"]+' pyproject.toml` |
| 3 | `VERSION` | `cat VERSION` |

**Decision Table**:

| Condition | Action |
|-----------|--------|
| package.json found | Set version_file = package.json, read version with node/jq |
| pyproject.toml found (no package.json) | Set version_file = pyproject.toml, read with grep -oP |
| VERSION found (no others) | Set version_file = VERSION, read with cat |
| No version file found | NEEDS_CONTEXT — ask user which file to use or create |

```bash
if [ -f "package.json" ]; then
  version_file="package.json"
  current_version=$(node -p "require('./package.json').version" 2>/dev/null || jq -r .version package.json)
elif [ -f "pyproject.toml" ]; then
  version_file="pyproject.toml"
  current_version=$(grep -oP 'version\s*=\s*"\K[^"]+' pyproject.toml | head -1)
elif [ -f "VERSION" ]; then
  version_file="VERSION"
  current_version=$(cat VERSION | tr -d '[:space:]')
else
  echo "NEEDS_CONTEXT: No version file found"
  echo "Expected one of: package.json, pyproject.toml, VERSION"
  # Ask user which file to use or create
fi

echo "Version file: $version_file"
echo "Current version: $current_version"
```

---

### Step 2: Determine Bump Type

Auto-detect from commit messages, then confirm with user for major bumps.

**Bump Type Auto-Detection from Conventional Commits**:

```bash
# Get commits since last tag
last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -n "$last_tag" ]; then
  commits=$(git log "$last_tag"..HEAD --oneline)
else
  commits=$(git log --oneline -20)
fi

# Scan for conventional commit prefixes
has_breaking=$(echo "$commits" | grep -iE '(BREAKING CHANGE|!:)' || true)
has_feat=$(echo "$commits" | grep -iE '^[a-f0-9]+ feat' || true)
has_fix=$(echo "$commits" | grep -iE '^[a-f0-9]+ fix' || true)

if [ -n "$has_breaking" ]; then
  suggested_bump="major"
elif [ -n "$has_feat" ]; then
  suggested_bump="minor"
else
  suggested_bump="patch"
fi

echo "Suggested bump: $suggested_bump"
```

**User Confirmation Decision Table**:

| Bump Type | Action |
|-----------|--------|
| patch | Proceed with suggested bump, inform user |
| minor | Proceed with suggested bump, inform user |
| major | Always ask user to confirm before proceeding |
| User overrides suggestion | Use user-specified bump type |
| User declines major bump | BLOCKED — halt, user must re-trigger with explicit bump type |

---

### Step 3: Calculate New Version

Apply semver arithmetic to derive new version.

**Decision Table**:

| Bump Type | Calculation |
|-----------|-------------|
| major | `(major+1).0.0` |
| minor | `major.(minor+1).0` |
| patch | `major.minor.(patch+1)` |

```bash
# Parse semver components
IFS='.' read -r major minor patch <<< "$current_version"

case "$bump_type" in
  major)
    new_version="$((major + 1)).0.0"
    ;;
  minor)
    new_version="${major}.$((minor + 1)).0"
    ;;
  patch)
    new_version="${major}.${minor}.$((patch + 1))"
    ;;
esac

echo "Version bump: $current_version -> $new_version"
```

---

### Step 4: Update Version File

Write new version to the appropriate file using the correct method for each format.

**Decision Table**:

| Version File | Update Method |
|--------------|---------------|
| package.json | `jq --arg v "<new_version>" '.version = $v'` + update package-lock.json if present |
| pyproject.toml | `sed -i "s/^version\s*=\s*\".*\"/version = \"<new_version>\"/"` |
| VERSION | `echo "<new_version>" > VERSION` |

```bash
case "$version_file" in
  package.json)
    # Use node/jq for safe JSON update
    jq --arg v "$new_version" '.version = $v' package.json > tmp.json && mv tmp.json package.json
    # Also update package-lock.json if it exists
    if [ -f "package-lock.json" ]; then
      jq --arg v "$new_version" '.version = $v | .packages[""].version = $v' package-lock.json > tmp.json && mv tmp.json package-lock.json
    fi
    ;;
  pyproject.toml)
    # Use sed for TOML update (version line in [project] or [tool.poetry])
    sed -i "s/^version\s*=\s*\".*\"/version = \"$new_version\"/" pyproject.toml
    ;;
  VERSION)
    echo "$new_version" > VERSION
    ;;
esac

echo "Updated $version_file: $current_version -> $new_version"
```

---

### Step 5: Verify Update

Re-read version file to confirm the update was applied correctly.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| Re-read version equals new_version | PASS — gate satisfied |
| Re-read version does not match | FAIL — report mismatch, BLOCKED |

```bash
# Re-read to confirm
case "$version_file" in
  package.json)
    verified=$(node -p "require('./package.json').version" 2>/dev/null || jq -r .version package.json)
    ;;
  pyproject.toml)
    verified=$(grep -oP 'version\s*=\s*"\K[^"]+' pyproject.toml | head -1)
    ;;
  VERSION)
    verified=$(cat VERSION | tr -d '[:space:]')
    ;;
esac

if [ "$verified" = "$new_version" ]; then
  echo "PASS: Version verified as $new_version"
else
  echo "FAIL: Version mismatch — expected $new_version, got $verified"
fi
```

---

## Output

| Artifact | Format | Description |
|----------|--------|-------------|
| Version change record | JSON | version_file, previous_version, new_version, bump_type, bump_source |

```json
{
  "phase": "version-bump",
  "version_file": "package.json",
  "previous_version": "1.2.3",
  "new_version": "1.3.0",
  "bump_type": "minor",
  "bump_source": "auto-detected|user-specified",
  "overall": "pass|fail"
}
```

## Success Criteria

| Criterion | Validation Method |
|-----------|-------------------|
| Version file detected | version_file field populated |
| Current version read | current_version field populated |
| Bump type determined | bump_type set to patch/minor/major |
| Version file updated | Write/edit operation succeeded |
| Update verified | Re-read matches new_version |
| overall = "pass" | All steps completed without error |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No version file found | NEEDS_CONTEXT — ask user which file to create or use |
| Version parse error (malformed semver) | NEEDS_CONTEXT — report current value, ask user for correction |
| jq not available | Fall back to node for package.json; report error for others |
| sed fails on pyproject.toml | Try Write tool to rewrite the file; report on failure |
| User declines major bump | BLOCKED — halt, user must re-trigger with explicit bump type |
| Version mismatch after update | BLOCKED — report expected vs actual, suggest manual fix |

## Next Phase

-> [Phase 4: Changelog & Commit](04-changelog-commit.md)

If version updated successfully (overall: "pass"), proceed to Phase 4.
If update fails or context needed, report BLOCKED / NEEDS_CONTEXT. Do not proceed.
