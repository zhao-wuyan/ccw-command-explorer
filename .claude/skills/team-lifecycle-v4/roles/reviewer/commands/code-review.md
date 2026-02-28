# Command: code-review

## Purpose

4-dimension code review analyzing quality, security, architecture, and requirements compliance. Produces a verdict (BLOCK/CONDITIONAL/APPROVE) with categorized findings.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Plan file | `<session_folder>/plan/plan.json` | Yes |
| Git diff | `git diff HEAD~1` or `git diff --cached` | Yes |
| Modified files | From git diff --name-only | Yes |
| Test results | Tester output (if available) | No |
| Wisdom | `<session_folder>/wisdom/` | No |

## Phase 3: 4-Dimension Review

### Dimension Overview

| Dimension | Focus | Weight |
|-----------|-------|--------|
| Quality | Code correctness, type safety, clean code | Equal |
| Security | Vulnerability patterns, secret exposure | Equal |
| Architecture | Module structure, coupling, file size | Equal |
| Requirements | Acceptance criteria coverage, completeness | Equal |

---

### Dimension 1: Quality

Scan each modified file for quality anti-patterns.

| Severity | Pattern | What to Detect |
|----------|---------|----------------|
| Critical | Empty catch blocks | `catch(e) {}` with no handling |
| High | @ts-ignore without justification | Suppression comment < 10 chars explanation |
| High | `any` type in public APIs | `any` outside comments and generic definitions |
| High | console.log in production | `console.(log\|debug\|info)` outside test files |
| Medium | Magic numbers | Numeric literals > 1 digit, not in const/comment |
| Medium | Duplicate code | Identical lines (>30 chars) appearing 3+ times |

**Detection example** (Grep for console statements):

```bash
Grep(pattern="console\\.(log|debug|info)", path="<file_path>", output_mode="content", "-n"=true)
```

---

### Dimension 2: Security

Scan for vulnerability patterns across all modified files.

| Severity | Pattern | What to Detect |
|----------|---------|----------------|
| Critical | Hardcoded secrets | `api_key=`, `password=`, `secret=`, `token=` with string values (20+ chars) |
| Critical | SQL injection | String concatenation in `query()`/`execute()` calls |
| High | eval/exec usage | `eval()`, `new Function()`, `setTimeout(string)` |
| High | XSS vectors | `innerHTML`, `dangerouslySetInnerHTML` |
| Medium | Insecure random | `Math.random()` in security context (token/key/password/session) |
| Low | Missing input validation | Functions with parameters but no validation in first 5 lines |

---

### Dimension 3: Architecture

Assess structural health of modified files.

| Severity | Pattern | What to Detect |
|----------|---------|----------------|
| Critical | Circular dependencies | File A imports B, B imports A |
| High | Excessive parent imports | Import traverses >2 parent directories (`../../../`) |
| Medium | Large files | Files exceeding 500 lines |
| Medium | Tight coupling | >5 imports from same base module |
| Medium | Long functions | Functions exceeding 50 lines |
| Medium | Module boundary changes | Modifications to index.ts/index.js files |

**Detection example** (check for deep parent imports):

```bash
Grep(pattern="from\\s+['\"](\\.\\./){3,}", path="<file_path>", output_mode="content", "-n"=true)
```

---

### Dimension 4: Requirements

Verify implementation against plan acceptance criteria.

| Severity | Check | Method |
|----------|-------|--------|
| High | Unmet acceptance criteria | Extract criteria from plan, check keyword overlap (threshold: 70%) |
| High | Missing error handling | Plan mentions "error handling" but no try/catch in code |
| Medium | Partially met criteria | Keyword overlap 40-69% |
| Medium | Missing tests | Plan mentions "test" but no test files in modified set |

**Verification flow**:
1. Read plan file → extract acceptance criteria section
2. For each criterion → extract keywords (4+ char meaningful words)
3. Search modified files for keyword matches
4. Score: >= 70% match = met, 40-69% = partial, < 40% = unmet

---

### Verdict Routing

| Verdict | Criteria | Action |
|---------|----------|--------|
| BLOCK | Any critical-severity issues found | Must fix before merge |
| CONDITIONAL | High or medium issues, no critical | Should address, can merge with tracking |
| APPROVE | Only low issues or none | Ready to merge |

## Phase 4: Validation

### Report Format

The review report follows this structure:

```
# Code Review Report

**Verdict**: <BLOCK|CONDITIONAL|APPROVE>

## Blocking Issues (if BLOCK)
- **<type>** (<file>:<line>): <message>

## Review Dimensions

### Quality Issues
**CRITICAL** (<count>)
- <message> (<file>:<line>)

### Security Issues
(same format per severity)

### Architecture Issues
(same format per severity)

### Requirements Issues
(same format per severity)

## Recommendations
1. <actionable recommendation>
```

### Summary Counts

| Field | Description |
|-------|-------------|
| Total issues | Sum across all dimensions and severities |
| Critical count | Must be 0 for APPROVE |
| Blocking issues | Listed explicitly in report header |
| Dimensions covered | Must be 4/4 |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Plan file not found | Skip requirements dimension, note in report |
| Git diff empty | Report no changes to review |
| File read fails | Skip file, note in report |
| No modified files | Report empty review |
