# Phase 2: Code Review

Automated AI-powered code review of changes since the base branch, with risk assessment.

## Objective

- Detect the merge base between current branch and target branch
- Generate diff for review
- Run AI-powered code review via CCW CLI
- Flag high-risk changes (large diffs, sensitive files, breaking changes)

## Gate Condition

No critical issues flagged by the review. Warnings are reported but do not block.

## Execution Steps

### Step 1: Detect Merge Base

```bash
# Determine target branch (default: main, fallback: master)
target_branch="main"
if ! git rev-parse --verify "origin/$target_branch" &>/dev/null; then
  target_branch="master"
fi

# Find merge base
merge_base=$(git merge-base "origin/$target_branch" HEAD)
echo "Merge base: $merge_base"

# If on main/master directly, compare against last tag
current_branch=$(git branch --show-current)
if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
  last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
  if [ -n "$last_tag" ]; then
    merge_base="$last_tag"
    echo "On main — using last tag as base: $last_tag"
  else
    # Use first commit if no tags exist
    merge_base=$(git rev-list --max-parents=0 HEAD | head -1)
    echo "No tags found — using initial commit as base"
  fi
fi
```

### Step 2: Generate Diff Summary

```bash
# File-level summary
git diff --stat "$merge_base"...HEAD

# Full diff for review
git diff "$merge_base"...HEAD > /tmp/ship-review-diff.txt

# Count changes for risk assessment
files_changed=$(git diff --name-only "$merge_base"...HEAD | wc -l)
lines_added=$(git diff --numstat "$merge_base"...HEAD | awk '{s+=$1} END {print s}')
lines_removed=$(git diff --numstat "$merge_base"...HEAD | awk '{s+=$2} END {print s}')
```

### Step 3: Risk Assessment

Flag high-risk indicators before AI review:

| Risk Factor | Threshold | Risk Level |
|-------------|-----------|------------|
| Files changed | > 50 | High |
| Lines changed | > 1000 | High |
| Sensitive files modified | Any of: `.env*`, `*secret*`, `*credential*`, `*auth*`, `*.key`, `*.pem` | High |
| Config files modified | `package.json`, `pyproject.toml`, `tsconfig.json`, `Dockerfile` | Medium |
| Migration files | `*migration*`, `*migrate*` | Medium |

```bash
# Check for sensitive file changes
sensitive_files=$(git diff --name-only "$merge_base"...HEAD | grep -iE '\.(env|key|pem)|secret|credential' || true)
if [ -n "$sensitive_files" ]; then
  echo "HIGH RISK: Sensitive files modified:"
  echo "$sensitive_files"
fi
```

### Step 4: AI Code Review

Use CCW CLI for automated analysis:

```bash
ccw cli -p "PURPOSE: Review code changes for release readiness; success = all critical issues identified with file:line references
TASK: Review diff for bugs | Check for breaking changes | Identify security concerns | Assess test coverage gaps
MODE: analysis
CONTEXT: @**/* | Reviewing diff from $merge_base to HEAD ($files_changed files, +$lines_added/-$lines_removed lines)
EXPECTED: Risk assessment (low/medium/high), list of issues with severity and file:line, release recommendation (ship/hold/fix-first)
CONSTRAINTS: Focus on correctness and security | Flag breaking API changes | Ignore formatting-only changes
" --tool gemini --mode analysis
```

**Note**: Wait for the CLI analysis to complete before proceeding. Do not proceed to Phase 3 while review is running.

### Step 5: Evaluate Review Results

Based on the AI review output:

| Review Result | Action |
|---------------|--------|
| No critical issues | Proceed to Phase 3 |
| Critical issues found | Report BLOCKED, list issues |
| Warnings only | Proceed with DONE_WITH_CONCERNS note |
| Review failed/timeout | Ask user whether to proceed or retry |

## Output

- **Format**: Review summary with risk assessment
- **Structure**:

```json
{
  "phase": "code-review",
  "merge_base": "commit-sha",
  "stats": {
    "files_changed": 0,
    "lines_added": 0,
    "lines_removed": 0
  },
  "risk_level": "low|medium|high",
  "risk_factors": [],
  "ai_review": {
    "recommendation": "ship|hold|fix-first",
    "critical_issues": [],
    "warnings": []
  },
  "overall": "pass|fail|warn"
}
```

## Next Phase

If review passes (no critical issues), proceed to [Phase 3: Version Bump](03-version-bump.md).
If critical issues found, report BLOCKED status with review summary.
