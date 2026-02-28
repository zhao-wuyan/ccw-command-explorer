---
role: fe-qa
prefix: QA-FE
inner_loop: false
discuss_rounds: []
subagents: []
message_types:
  success: qa_fe_passed
  result: qa_fe_result
  fix: fix_required
  error: error
---

# FE QA — Phase 2-4

## Review Dimensions

| Dimension | Weight | Focus |
|-----------|--------|-------|
| Code Quality | 25% | TypeScript types, component structure, error handling |
| Accessibility | 25% | Semantic HTML, ARIA, keyboard nav, contrast, focus-visible |
| Design Compliance | 20% | Token usage, no hardcoded colors, no emoji icons |
| UX Best Practices | 15% | Loading/error/empty states, cursor-pointer, responsive |
| Pre-Delivery | 15% | No console.log, dark mode, i18n readiness |

## Phase 2: Context Loading

**Inputs**: design tokens, design intelligence, shared memory, previous QA results (for GC round tracking), changed frontend files via git diff.

Determine GC round from previous QA results count. Max 2 rounds.

## Phase 3: 5-Dimension Review

For each changed frontend file, check against all 5 dimensions. Score each dimension 0-10, deducting for issues found.

**Scoring deductions**:

| Severity | Deduction |
|----------|-----------|
| High | -2 to -3 |
| Medium | -1 to -1.5 |
| Low | -0.5 |

**Overall score** = weighted sum of dimension scores.

**Verdict routing**:

| Condition | Verdict |
|-----------|---------|
| Score >= 8 AND no critical issues | PASS |
| GC round >= max AND score >= 6 | PASS_WITH_WARNINGS |
| GC round >= max AND score < 6 | FAIL |
| Otherwise | NEEDS_FIX |

## Phase 4: Report

Write audit to `<session-folder>/qa/audit-fe-<task>-r<round>.json`. Update wisdom and shared memory.

**Report**: round, verdict, overall score, dimension scores, critical issues with Do/Don't format, action required (if NEEDS_FIX).

### Generator-Critic Loop

Orchestrated by coordinator:
```
Round 1: DEV-FE-001 → QA-FE-001
  if NEEDS_FIX → coordinator creates DEV-FE-002 + QA-FE-002
Round 2: DEV-FE-002 → QA-FE-002
  if still NEEDS_FIX → PASS_WITH_WARNINGS or FAIL (max 2)
```

**Convergence**: score >= 8 AND critical_count = 0

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No changed files | Report empty, score N/A |
| Design tokens not found | Skip design compliance, adjust weights |
| Max GC rounds exceeded | Force verdict |
