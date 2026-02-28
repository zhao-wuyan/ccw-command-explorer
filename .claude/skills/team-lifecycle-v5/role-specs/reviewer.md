---
role: reviewer
prefix: REVIEW
additional_prefixes: [QUALITY, IMPROVE]
inner_loop: false
discuss_rounds: [DISCUSS-006]
subagents: [discuss]
message_types:
  success_review: review_result
  success_quality: quality_result
  fix: fix_required
  error: error
---

# Reviewer — Phase 2-4

## Phase 2: Mode Detection

| Task Prefix | Mode | Dimensions | Inline Discuss |
|-------------|------|-----------|---------------|
| REVIEW-* | Code Review | quality, security, architecture, requirements | None |
| QUALITY-* | Spec Quality | completeness, consistency, traceability, depth, coverage | DISCUSS-006 |
| IMPROVE-* | Spec Quality (recheck) | Same as QUALITY | DISCUSS-006 |

## Phase 3: Review Execution

### Code Review (REVIEW-*)

**Inputs**: Plan file, git diff, modified files, test results (if available)

**4 dimensions**:

| Dimension | Critical Issues |
|-----------|----------------|
| Quality | Empty catch, any in public APIs, @ts-ignore, console.log |
| Security | Hardcoded secrets, SQL injection, eval/exec, innerHTML |
| Architecture | Circular deps, parent imports >2 levels, files >500 lines |
| Requirements | Missing core functionality, incomplete acceptance criteria |

### Spec Quality (QUALITY-* / IMPROVE-*)

**Inputs**: All spec docs in session folder, quality gate config

**5 dimensions**:

| Dimension | Weight | Focus |
|-----------|--------|-------|
| Completeness | 25% | All sections present with substance |
| Consistency | 20% | Terminology, format, references |
| Traceability | 25% | Goals -> Reqs -> Arch -> Stories chain |
| Depth | 20% | AC testable, ADRs justified, stories estimable |
| Coverage | 10% | Original requirements mapped |

**Quality gate**:

| Gate | Criteria |
|------|----------|
| PASS | Score >= 80% AND coverage >= 70% |
| REVIEW | Score 60-79% OR coverage 50-69% |
| FAIL | Score < 60% OR coverage < 50% |

**Artifacts**: readiness-report.md + spec-summary.md

## Phase 4: Verdict + Inline Discuss

### Code Review Verdict

| Verdict | Criteria |
|---------|----------|
| BLOCK | Critical issues present |
| CONDITIONAL | High/medium only |
| APPROVE | Low or none |

### Spec Quality Inline Discuss (DISCUSS-006)

After generating readiness-report.md, call discuss subagent:
- Artifact: `<session-folder>/spec/readiness-report.md`
- Round: DISCUSS-006
- Perspectives: product, technical, quality, risk, coverage (all 5)

Handle discuss verdict per team-worker consensus handling protocol.

> **Note**: DISCUSS-006 HIGH always triggers user pause (final sign-off gate), regardless of revision count.

**Report**: mode, verdict/gate, dimension scores, discuss verdict (QUALITY only), output paths.

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Missing context | Request from coordinator |
| Invalid mode | Abort with error |
| Analysis failure | Retry, then fallback template |
| Discuss subagent fails | Proceed without final discuss, log warning |
