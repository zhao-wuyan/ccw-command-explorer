# Phase 1: Pre-Flight Checks

> **COMPACT PROTECTION**: This is a core execution phase. If context compression has occurred and this file is only a summary, **MUST `Read` this file again before executing any Step**. Do not execute from memory.

Validate that the repository is in a shippable state before proceeding with the release pipeline.

## Objective

- Confirm working tree is clean (no uncommitted changes)
- Validate current branch is appropriate for release
- Run test suite and confirm all tests pass
- Verify build succeeds

## Input

| Source | Required | Description |
|--------|----------|-------------|
| Repository working directory | Yes | Git repo with working tree |
| package.json / pyproject.toml / Makefile | No | Used for test and build detection |

## Execution Steps

### Step 1: Git Clean Check

Run `git status --porcelain` and evaluate output.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| Output is empty | PASS — working tree is clean |
| Output is non-empty | FAIL — working tree is dirty; report dirty files, suggest `git stash` or `git commit` |

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

---

### Step 2: Branch Validation

Run `git branch --show-current` and evaluate.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| Branch is not main or master | PASS — proceed |
| Branch is main or master | WARN — ask user to confirm direct-to-main/master release before proceeding |
| User confirms direct release | PASS with warning noted |
| User declines | BLOCKED — halt pipeline |

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

---

### Step 3: Test Suite Execution

Detect project type and run appropriate test command.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| package.json with "test" script exists | Run `npm test` |
| pytest available and tests/ or test/ directory exists | Run `pytest` |
| pyproject.toml with pytest listed exists | Run `pytest` |
| No test suite detected | WARN and continue (skip check) |
| Test command exits code 0 | PASS |
| Test command exits non-zero | FAIL — report test failures, halt pipeline |

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

---

### Step 4: Build Verification

Detect project build step and run it.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| package.json with "build" script exists | Run `npm run build` |
| pyproject.toml exists and python build module available | Run `python -m build` |
| Makefile with build target exists | Run `make build` |
| No build step detected | INFO — skip (not all projects need a build), PASS |
| Build command exits code 0 | PASS |
| Build command exits non-zero | FAIL — report build errors, halt pipeline |

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

---

## Output

| Artifact | Format | Description |
|----------|--------|-------------|
| preflight-report | JSON | Pass/fail per check, current branch, blockers list |

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

## Success Criteria

| Criterion | Validation Method |
|-----------|-------------------|
| Git working tree is clean | `git status --porcelain` returns empty |
| Branch is non-main or user confirmed | Branch check + optional user confirmation |
| Tests pass or skipped with warning | Test command exit code 0, or skip with WARN |
| Build passes or skipped with info | Build command exit code 0, or skip with INFO |
| Overall gate is "pass" | All checks produce pass/warn/skip (no fail) |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Dirty working tree | BLOCKED — list dirty files, suggest `git stash` or `git commit`, halt |
| Tests fail | BLOCKED — report test output, halt pipeline |
| Build fails | BLOCKED — report build output, halt pipeline |
| git command not found | BLOCKED — report environment error |
| No version file or project type detected | WARN — continue, version detection deferred to Phase 3 |

## Next Phase

-> [Phase 2: Code Review](02-code-review.md)

If any check fails (overall: "fail"), report BLOCKED status with the preflight report. Do not proceed.
