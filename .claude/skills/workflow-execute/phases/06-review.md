# Phase 6: Post-Implementation Review

Optional specialized review for completed implementations. In the standard workflow, **passing tests = approved code**. This phase executes only when user selects "Enter Review" in Phase 5 completion.

## Objective

- Perform specialized review (security/architecture/quality/action-items) on completed implementation
- Generate structured review report with severity levels and action items
- Provide CLI-assisted analysis using Gemini/Qwen for deep review

## Philosophy: "Tests Are the Review"

- **Default**: All tests pass → Code approved
- **Optional**: This phase for specialized reviews:
  - Security audits (vulnerabilities, auth/authz)
  - Architecture compliance (patterns, technical debt)
  - Action items verification (requirements met, acceptance criteria)
  - Code quality assessment (best practices, maintainability)

## Review Types

| Type | Focus | Use Case |
|------|-------|----------|
| `quality` | Code quality, best practices, maintainability | Default general review |
| `security` | Security vulnerabilities, data handling, access control | Security audits |
| `architecture` | Architectural patterns, technical debt, design decisions | Architecture compliance |
| `action-items` | Requirements met, acceptance criteria verified | Pre-deployment verification |

**Notes**:
- For CLAUDE.md updates, use `memory-manage` skill

## Execution

### Step 6.1: Review Type Selection

Prompt user to select review type:

```javascript
AskUserQuestion({
  questions: [{
    question: "Select review type:",
    header: "Review Type",
    multiSelect: false,
    options: [
      { label: "Quality (Recommended)", description: "Code quality, best practices, maintainability" },
      { label: "Security", description: "Security vulnerabilities, data handling, access control" },
      { label: "Architecture", description: "Architectural patterns, technical debt, design decisions" },
      { label: "Action Items", description: "Requirements met, acceptance criteria verified" }
    ]
  }]
})
```

**Auto Mode** (`--yes`): Skip selection, default to `quality`.

### Step 6.2: Validation

```bash
# Verify completed implementation exists
sessionPath=".workflow/active/${sessionId}"

if [ ! -d "${sessionPath}/.summaries" ] || [ -z "$(find ${sessionPath}/.summaries/ -name "IMPL-*.md" -type f 2>/dev/null)" ]; then
    echo "No completed implementation found. Complete implementation first."
    exit 1
fi
```

### Step 6.3: Context Loading

```bash
# Load implementation summaries
for summary in ${sessionPath}/.summaries/*.md; do
  cat "$summary"
done

# Load test results (if available)
for test_summary in ${sessionPath}/.summaries/TEST-FIX-*.md 2>/dev/null; do
  cat "$test_summary"
done

# Get changed files
git log --since="$(cat ${sessionPath}/workflow-session.json | jq -r .created_at)" --name-only --pretty=format: | sort -u
```

### Step 6.4: Specialized Review Analysis

Based on `review_type`, execute the corresponding analysis:

**Security Review** (`security`):
```bash
# Pattern scan
rg "password|token|secret|auth" -g "*.{ts,js,py}"
rg "eval|exec|innerHTML|dangerouslySetInnerHTML" -g "*.{ts,js,tsx}"

# Gemini security analysis
ccw spec load --category execution
ccw cli -p "
PURPOSE: Security audit of completed implementation
TASK: Review code for security vulnerabilities, insecure patterns, auth/authz issues
CONTEXT: @.summaries/IMPL-*.md,../..
EXPECTED: Security findings report with severity levels
RULES: Focus on OWASP Top 10, authentication, authorization, data validation, injection risks
" --tool gemini --mode write --cd ${sessionPath}
```

**Architecture Review** (`architecture`):
```bash
ccw spec load --category execution
ccw cli -p "
PURPOSE: Architecture compliance review
TASK: Evaluate adherence to architectural patterns, identify technical debt, review design decisions
CONTEXT: @.summaries/IMPL-*.md,../..
EXPECTED: Architecture assessment with recommendations
RULES: Check for patterns, separation of concerns, modularity, scalability
" --tool qwen --mode write --cd ${sessionPath}
```

**Quality Review** (`quality`):
```bash
ccw spec load --category execution
ccw cli -p "
PURPOSE: Code quality and best practices review
TASK: Assess code readability, maintainability, adherence to best practices
CONTEXT: @.summaries/IMPL-*.md,../..
EXPECTED: Quality assessment with improvement suggestions
RULES: Check for code smells, duplication, complexity, naming conventions
" --tool gemini --mode write --cd ${sessionPath}
```

**Action Items Review** (`action-items`):
```bash
# Load task requirements and acceptance criteria
for task_file in ${sessionPath}/.task/*.json; do
  cat "$task_file" | jq -r '
    "Task: " + .id + "\n" +
    "Requirements: " + .description + "\n" +
    "Acceptance: " + (.convergence.criteria | join(", "))
  '
done

# Cross-check implementation against requirements
ccw spec load --category execution
ccw cli -p "
PURPOSE: Verify all requirements and acceptance criteria are met
TASK: Cross-check implementation summaries against original requirements
CONTEXT: @.task/IMPL-*.json,.summaries/IMPL-*.md,../..
EXPECTED:
- Requirements coverage matrix
- Acceptance criteria verification
- Missing/incomplete action items
- Pre-deployment readiness assessment
RULES:
- Check each requirement has corresponding implementation
- Verify all acceptance criteria are met
- Flag any incomplete or missing action items
- Assess deployment readiness
" --tool gemini --mode write --cd ${sessionPath}
```

### Step 6.5: Generate Review Report

Write structured report to session directory:

```markdown
# Review Report: ${review_type}

**Session**: ${sessionId}
**Date**: $(date)
**Type**: ${review_type}

## Summary
- Tasks Reviewed: [count IMPL tasks]
- Files Changed: [count files]
- Severity: [High/Medium/Low]

## Findings

### Critical Issues
- [Issue 1 with file:line reference]

### Recommendations
- [Recommendation 1]

### Positive Observations
- [Good pattern observed]

## Action Items
- [ ] [Action 1]
- [ ] [Action 2]
```

**Output**: `${sessionPath}/REVIEW-${review_type}.md`

### Step 6.6: Post-Review Prompt

```
Review complete. Would you like to:
→ Run another review type
→ Complete session: /workflow:session:complete
```

If architecture or quality issues found, suggest:
```
Consider updating project documentation:
→ /update-memory-related
```

## Output

- **File**: `${sessionPath}/REVIEW-${review_type}.md`
- **TodoWrite**: Mark Phase 6 completed

## Next Phase

Return to orchestrator for session completion or additional review cycles.
