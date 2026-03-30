# Phase 3: Version Bump

Detect the current version, determine the bump type, and update the version file.

## Objective

- Detect which version file the project uses
- Read the current version
- Determine bump type (patch/minor/major) from commit messages or user input
- Update the version file
- Record the version change

## Gate Condition

Version file updated successfully with the new version.

## Execution Steps

### Step 1: Detect Version File

Detection priority order:

| Priority | File | Read Method |
|----------|------|-------------|
| 1 | `package.json` | `jq -r .version package.json` |
| 2 | `pyproject.toml` | `grep -oP 'version\s*=\s*"\K[^"]+' pyproject.toml` |
| 3 | `VERSION` | `cat VERSION` |

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

### Step 2: Determine Bump Type

**Auto-detection from commit messages** (conventional commits):

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

**User confirmation**:
- For `patch` and `minor`: proceed with suggested bump, inform user
- For `major`: always ask user to confirm before proceeding (major bumps have significant implications)
- User can override the suggestion with an explicit bump type

### Step 3: Calculate New Version

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

### Step 4: Update Version File

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

### Step 5: Verify Update

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

## Output

- **Format**: Version change record
- **Structure**:

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

## Next Phase

If version updated successfully, proceed to [Phase 4: Changelog & Commit](04-changelog-commit.md).
If version update fails, report BLOCKED status.
