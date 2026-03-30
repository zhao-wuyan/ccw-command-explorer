# Phase 2: Code Review

> **COMPACT PROTECTION**: This is a core execution phase. If context compression has occurred and this file is only a summary, **MUST `Read` this file again before executing any Step**. Do not execute from memory.

Automated AI-powered code review of changes since the base branch, with risk assessment.

## Objective

- Detect the merge base between current branch and target branch
- Generate diff for review
- Assess high-risk indicators before AI review
- Run AI-powered code review via inline subagent
- Flag high-risk changes (large diffs, sensitive files, breaking changes)

## Input

| Source | Required | Description |
|--------|----------|-------------|
| Phase 1 gate result | Yes | overall: "pass" — must have passed |
| Repository git history | Yes | Commit log, diff data |

## Execution Steps

### Step 1: Detect Merge Base

Determine the target branch and find the common ancestor commit.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| origin/main exists | Use main as target branch |
| origin/main not found | Fall back to master as target branch |
| Current branch is main or master | Use last tag as merge base |
| Current branch is main/master and no tags exist | Use initial commit as merge base |
| Current branch is feature branch | Use `git merge-base origin/<target> HEAD` |

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

---

### Step 2: Generate Diff Summary

Collect statistics and full diff content.

**Decision Table**:

| Condition | Action |
|-----------|--------|
| Diff command succeeds | Record files_changed, lines_added, lines_removed |
| No changes found | WARN — nothing to review; ask user whether to proceed |

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

---

### Step 3: Risk Assessment

Flag high-risk indicators before AI review.

**Risk Factor Table**:

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

**Decision Table**:

| Condition | Action |
|-----------|--------|
| Sensitive files detected | Set risk_level = high, add to risk_factors |
| files_changed > 50 | Set risk_level = high, add to risk_factors |
| lines changed > 1000 | Set risk_level = high, add to risk_factors |
| Config or migration files detected | Set risk_level = medium (if not already high) |
| No risk factors | Set risk_level = low |

---

### Step 4: AI Code Review via Inline Subagent

Spawn inline-code-review subagent for AI analysis. Replace the ccw cli call from the original with this inline subagent:

```
spawn_agent({
  task_name: "inline-code-review",
  fork_context: false,
  model: "haiku",
  reasoning_effort: "medium",
  message: `### MANDATORY FIRST STEPS
1. Read: ~/.codex/agents/cli-explore-agent.md

Goal: Review code changes for release readiness
Context: Diff from <merge_base> to HEAD (<files_changed> files, +<lines_added>/-<lines_removed> lines)

Task:
- Review diff for bugs and correctness issues
- Check for breaking changes (API, config, schema)
- Identify security concerns
- Assess test coverage gaps
- Flag formatting-only changes to exclude from critical issues

Expected: Risk level (low/medium/high), list of issues with severity and file:line reference, release recommendation (ship|hold|fix-first)
Constraints: Focus on correctness and security | Flag breaking API changes | Ignore formatting-only changes`
})
const result = wait_agent({ targets: ["inline-code-review"], timeout_ms: 300000 })
close_agent({ target: "inline-code-review" })
```

**Note**: Wait for the subagent to complete before proceeding. Do not advance to Step 5 while review is running.

---

### Step 5: Evaluate Review Results

Based on the inline subagent output, apply gate logic.

**Review Result Decision Table**:

| Review Result | Action |
|---------------|--------|
| recommendation: "ship", no critical issues | Gate = pass — proceed to Phase 3 |
| recommendation: "hold" or critical issues present | Gate = fail — report BLOCKED, list issues |
| recommendation: "fix-first" | Gate = fail — report BLOCKED, list issues with file:line |
| Warnings only, recommendation: "ship" | Gate = warn — proceed with DONE_WITH_CONCERNS note |
| Review subagent failed or timed out | Ask user whether to proceed or retry |

---

## Output

| Artifact | Format | Description |
|----------|--------|-------------|
| Review summary | JSON | Risk level, risk factors, AI review recommendation, critical issues, warnings |

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

## Success Criteria

| Criterion | Validation Method |
|-----------|-------------------|
| Merge base detected | merge_base SHA present in output |
| Diff statistics collected | files_changed, lines_added, lines_removed populated |
| Risk assessment completed | risk_level set (low/medium/high), risk_factors populated |
| AI review completed | ai_review.recommendation present |
| Gate condition evaluated | overall set to pass/fail/warn |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| origin/main and origin/master both missing | Use HEAD~1 as merge base, warn user |
| No commits in diff | WARN — nothing to review; ask user whether to proceed |
| Inline subagent timeout | Log warning, ask user whether to proceed without AI review |
| Inline subagent error | Log error, ask user whether to proceed |
| Critical issues found | BLOCKED — report full issues list with severity and file:line |

## Next Phase

-> [Phase 3: Version Bump](03-version-bump.md)

If review passes (overall: "pass" or "warn"), proceed to Phase 3.
If critical issues found (overall: "fail"), report BLOCKED status with review summary. Do not proceed.
