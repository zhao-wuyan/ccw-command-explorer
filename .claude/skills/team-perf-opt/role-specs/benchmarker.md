---
prefix: BENCH
inner_loop: false
message_types:
  success: bench_complete
  error: error
  fix: fix_required
---

# Performance Benchmarker

Run benchmarks comparing before/after optimization metrics. Validate that improvements meet plan success criteria and detect any regressions.

## Phase 2: Environment & Baseline Loading

| Input | Source | Required |
|-------|--------|----------|
| Baseline metrics | <session>/artifacts/baseline-metrics.json (shared) | Yes |
| Optimization plan / detail | Varies by mode (see below) | Yes |
| shared-memory.json | <session>/wisdom/shared-memory.json | Yes |

1. Extract session path from task description
2. **Detect branch/pipeline context** from task description:

| Task Description Field | Value | Context |
|----------------------|-------|---------|
| `BranchId: B{NN}` | Present | Fan-out branch -- benchmark only this branch's metrics |
| `PipelineId: {P}` | Present | Independent pipeline -- use pipeline-scoped baseline |
| Neither present | - | Single mode -- full benchmark |

3. **Load baseline metrics**:
   - Single / Fan-out: Read `<session>/artifacts/baseline-metrics.json` (shared baseline)
   - Independent: Read `<session>/artifacts/pipelines/{P}/baseline-metrics.json`

4. **Load optimization context**:
   - Single: Read `<session>/artifacts/optimization-plan.md` -- all success criteria
   - Fan-out branch: Read `<session>/artifacts/branches/B{NN}/optimization-detail.md` -- only this branch's criteria
   - Independent: Read `<session>/artifacts/pipelines/{P}/optimization-plan.md`

5. Load shared-memory.json for project type and optimization scope
6. Detect available benchmark tools from project:

| Signal | Benchmark Tool | Method |
|--------|---------------|--------|
| package.json + vitest/jest | Test runner benchmarks | Run existing perf tests |
| package.json + webpack/vite | Bundle analysis | Compare build output sizes |
| Cargo.toml + criterion | Rust benchmarks | cargo bench |
| go.mod | Go benchmarks | go test -bench |
| Makefile with bench target | Custom benchmarks | make bench |
| No tooling detected | Manual measurement | Timed execution via Bash |

7. Get changed files scope from shared-memory:
   - Single: `optimizer` namespace
   - Fan-out: `optimizer.B{NN}` namespace
   - Independent: `optimizer.{P}` namespace

## Phase 3: Benchmark Execution

Run benchmarks matching detected project type:

**Frontend benchmarks**:
- Compare bundle size before/after (build output analysis)
- Measure render performance for affected components
- Check for dependency weight changes

**Backend benchmarks**:
- Measure endpoint response times for affected routes
- Profile memory usage under simulated load
- Verify database query performance improvements

**CLI / Library benchmarks**:
- Measure execution time for representative workloads
- Compare memory peak usage
- Test throughput under sustained load

**All project types**:
- Run existing test suite to verify no regressions
- Collect post-optimization metrics matching baseline format
- Calculate improvement percentages per metric

**Branch-scoped benchmarking** (fan-out mode):
- Only benchmark metrics relevant to this branch's optimization (from optimization-detail.md)
- Still check for regressions across all metrics (not just branch-specific ones)

## Phase 4: Result Analysis

Compare against baseline and plan criteria:

| Metric | Threshold | Verdict |
|--------|-----------|---------|
| Target improvement vs baseline | Meets plan success criteria | PASS |
| No regression in unrelated metrics | < 5% degradation allowed | PASS |
| All plan success criteria met | Every criterion satisfied | PASS |
| Improvement below target | > 50% of target achieved | WARN |
| Regression detected | Any unrelated metric degrades > 5% | FAIL -> fix_required |
| Plan criteria not met | Any criterion not satisfied | FAIL -> fix_required |

1. Write benchmark results to output path:
   - Single: `<session>/artifacts/benchmark-results.json`
   - Fan-out: `<session>/artifacts/branches/B{NN}/benchmark-results.json`
   - Independent: `<session>/artifacts/pipelines/{P}/benchmark-results.json`
   - Content: Per-metric: name, baseline value, current value, improvement %, verdict; Overall verdict: PASS / WARN / FAIL; Regression details (if any)

2. Update `<session>/wisdom/shared-memory.json` under scoped namespace:
   - Single: merge `{ "benchmarker": { verdict, improvements, regressions } }`
   - Fan-out: merge `{ "benchmarker.B{NN}": { verdict, improvements, regressions } }`
   - Independent: merge `{ "benchmarker.{P}": { verdict, improvements, regressions } }`

3. If verdict is FAIL, include detailed feedback in message for FIX task creation:
   - Which metrics failed, by how much, suggested investigation areas
