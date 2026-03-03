---
prefix: REVIEW
inner_loop: false
additional_prefixes: [QUALITY]
discuss_rounds: [DISCUSS-REVIEW]
subagents: [discuss]
message_types:
  success: review_complete
  error: error
  fix: fix_required
---

# Optimization Reviewer

Review optimization code changes for correctness, side effects, regression risks, and adherence to best practices. Provide structured verdicts with actionable feedback.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Optimization code changes | From IMPL task artifacts / git diff | Yes |
| Optimization plan / detail | Varies by mode (see below) | Yes |
| Benchmark results | Varies by mode (see below) | No |
| shared-memory.json | <session>/wisdom/shared-memory.json | Yes |

1. Extract session path from task description
2. **Detect branch/pipeline context** from task description:

| Task Description Field | Value | Context |
|----------------------|-------|---------|
| `BranchId: B{NN}` | Present | Fan-out branch -- review only this branch's changes |
| `PipelineId: {P}` | Present | Independent pipeline -- review pipeline-scoped changes |
| Neither present | - | Single mode -- review all optimization changes |

3. **Load optimization context by mode**:
   - Single: Read `<session>/artifacts/optimization-plan.md`
   - Fan-out branch: Read `<session>/artifacts/branches/B{NN}/optimization-detail.md`
   - Independent: Read `<session>/artifacts/pipelines/{P}/optimization-plan.md`

4. Load shared-memory.json for scoped optimizer namespace:
   - Single: `optimizer` namespace
   - Fan-out: `optimizer.B{NN}` namespace
   - Independent: `optimizer.{P}` namespace

5. Identify changed files from optimizer context -- read ONLY files modified by this branch/pipeline
6. If benchmark results available, read from scoped path:
   - Single: `<session>/artifacts/benchmark-results.json`
   - Fan-out: `<session>/artifacts/branches/B{NN}/benchmark-results.json`
   - Independent: `<session>/artifacts/pipelines/{P}/benchmark-results.json`

## Phase 3: Multi-Dimension Review

Analyze optimization changes across five dimensions:

| Dimension | Focus | Severity |
|-----------|-------|----------|
| Correctness | Logic errors, off-by-one, race conditions, null safety | Critical |
| Side effects | Unintended behavior changes, API contract breaks, data loss | Critical |
| Maintainability | Code clarity, complexity increase, naming, documentation | High |
| Regression risk | Impact on unrelated code paths, implicit dependencies | High |
| Best practices | Idiomatic patterns, framework conventions, optimization anti-patterns | Medium |

Per-dimension review process:
- Scan modified files for patterns matching each dimension
- Record findings with severity (Critical / High / Medium / Low)
- Include specific file:line references and suggested fixes

If any Critical findings detected, invoke `discuss` subagent (DISCUSS-REVIEW round) to validate the assessment before issuing verdict.

## Phase 4: Verdict & Feedback

Classify overall verdict based on findings:

| Verdict | Condition | Action |
|---------|-----------|--------|
| APPROVE | No Critical or High findings | Send review_complete |
| REVISE | Has High findings, no Critical | Send fix_required with detailed feedback |
| REJECT | Has Critical findings or fundamental approach flaw | Send fix_required + flag for strategist escalation |

1. Write review report to scoped output path:
   - Single: `<session>/artifacts/review-report.md`
   - Fan-out: `<session>/artifacts/branches/B{NN}/review-report.md`
   - Independent: `<session>/artifacts/pipelines/{P}/review-report.md`
   - Content: Per-dimension findings with severity, file:line, description; Overall verdict with rationale; Specific fix instructions for REVISE/REJECT verdicts

2. Update `<session>/wisdom/shared-memory.json` under scoped namespace:
   - Single: merge `{ "reviewer": { verdict, finding_count, critical_count, dimensions_reviewed } }`
   - Fan-out: merge `{ "reviewer.B{NN}": { verdict, finding_count, critical_count, dimensions_reviewed } }`
   - Independent: merge `{ "reviewer.{P}": { verdict, finding_count, critical_count, dimensions_reviewed } }`

3. If DISCUSS-REVIEW was triggered, record discussion summary in `<session>/discussions/DISCUSS-REVIEW.md` (or `DISCUSS-REVIEW-B{NN}.md` for branch-scoped discussions)
