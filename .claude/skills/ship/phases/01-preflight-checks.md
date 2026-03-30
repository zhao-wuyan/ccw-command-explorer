# Phase 1: Pre-Flight Checks

Validate that the repository is in a shippable state before proceeding with the release pipeline.

## Objective

- Confirm working tree is clean (no uncommitted changes)
- Validate current branch is appropriate for release
- Run test suite and confirm all tests pass
- Verify build succeeds

## Gate Condition

ALL four checks must pass. If any check fails, stop the pipeline and report BLOCKED status with the specific failure.

## Execution Steps

### Step 1: Git Clean Check

```bash
git_status=$(git status --porcelain)
if [ -n "$git_status" ]; then
  echo "FAIL: Working tree is dirty"
  echo "$git_status"
  # Gate: BLOCKED — commit or stash changes first
else
  echo "PASS: Working tree is clean"
fi
```

**Pass condition**: `git status --porcelain` produces empty output.
**On failure**: Report dirty files and suggest `git stash` or `git commit`.

### Step 2: Branch Validation

```bash
current_branch=$(git branch --show-current)
if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
  echo "WARN: Currently on $current_branch — direct push to main/master is risky"
  # Ask user for confirmation before proceeding
else
  echo "PASS: On branch $current_branch"
fi
```

**Pass condition**: Not on main/master, OR user explicitly confirms direct-to-main release.
**On warning**: Ask user to confirm they intend to release from main/master directly.

### Step 3: Test Suite Execution

Detect and run the project's test suite:

```bash
# Detection priority:
# 1. package.json with "test" script → npm test
# 2. pytest available and tests exist → pytest
# 3. No tests found → WARN and continue

if [ -f "package.json" ] && grep -q '"test"' package.json; then
  npm test
elif command -v pytest &>/dev/null && [ -d "tests" -o -d "test" ]; then
  pytest
elif [ -f "pyproject.toml" ] && grep -q 'pytest' pyproject.toml; then
  pytest
else
  echo "WARN: No test suite detected — skipping test check"
fi
```

**Pass condition**: Test command exits with code 0, or no tests detected (warn).
**On failure**: Report test failures and stop the pipeline.

### Step 4: Build Verification

Detect and run the project's build step:

```bash
# Detection priority:
# 1. package.json with "build" script → npm run build
# 2. pyproject.toml → python -m build (if build module available)
# 3. Makefile with build target → make build
# 4. No build step → PASS (not all projects need a build)

if [ -f "package.json" ] && grep -q '"build"' package.json; then
  npm run build
elif [ -f "pyproject.toml" ] && python -m build --help &>/dev/null; then
  python -m build
elif [ -f "Makefile" ] && grep -q '^build:' Makefile; then
  make build
else
  echo "INFO: No build step detected — skipping build check"
fi
```

**Pass condition**: Build command exits with code 0, or no build step detected.
**On failure**: Report build errors and stop the pipeline.

## Output

- **Format**: JSON object with pass/fail per check
- **Structure**:

```json
{
  "phase": "preflight",
  "timestamp": "ISO-8601",
  "checks": {
    "git_clean": { "status": "pass|fail", "details": "" },
    "branch": { "status": "pass|warn", "current": "branch-name", "details": "" },
    "tests": { "status": "pass|fail|skip", "details": "" },
    "build": { "status": "pass|fail|skip", "details": "" }
  },
  "overall": "pass|fail",
  "blockers": []
}
```

## Next Phase

If all checks pass, proceed to [Phase 2: Code Review](02-code-review.md).
If any check fails, report BLOCKED status with the preflight report.
