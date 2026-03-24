# Command: Dispatch

Create the performance optimization task chain with correct dependencies and structured task descriptions. Supports single, fan-out, independent, and auto parallel modes.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| User requirement | From coordinator Phase 1 | Yes |
| Session folder | From coordinator Phase 2 | Yes |
| Pipeline definition | From SKILL.md Pipeline Definitions | Yes |
| Parallel mode | From session.json `parallel_mode` | Yes |
| Max branches | From session.json `max_branches` | Yes |
| Independent targets | From session.json `independent_targets` (independent mode only) | Conditional |

1. Load user requirement and optimization scope from session.json
2. Load pipeline stage definitions from SKILL.md Task Metadata Registry
3. Read `parallel_mode` and `max_branches` from session.json
4. For `independent` mode: read `independent_targets` array from session.json

## Phase 3: Task Chain Creation (Mode-Branched)

### Task Description Template

Every task is a JSON entry in the tasks array, written to `<session>/tasks.json`:

```json
{
  "id": "<TASK-ID>",
  "subject": "<TASK-ID>",
  "description": "PURPOSE: <what this task achieves> | Success: <measurable completion criteria>\nTASK:\n  - <step 1: specific action>\n  - <step 2: specific action>\n  - <step 3: specific action>\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <optimization-scope>\n  - Branch: <branch-id or 'none'>\n  - Upstream artifacts: <artifact-1>, <artifact-2>\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <deliverable path> + <quality criteria>\nCONSTRAINTS: <scope limits, focus areas>\n---\nInnerLoop: <true|false>\nBranchId: <B01|A|none>",
  "status": "pending",
  "owner": "<role>",
  "blockedBy": ["<dependency-list>"]
}
```

After building all entries, write the full array to `<session>/tasks.json`.

### Mode Router

| Mode | Action |
|------|--------|
| `single` | Create 5 tasks (PROFILE -> STRATEGY -> IMPL -> BENCH + REVIEW) -- unchanged from linear pipeline |
| `auto` | Create PROFILE-001 + STRATEGY-001 only. **Defer branch creation to CP-2.5** after strategy completes |
| `fan-out` | Create PROFILE-001 + STRATEGY-001 only. **Defer branch creation to CP-2.5** after strategy completes |
| `independent` | Create M complete pipelines immediately (one per target) |

---

### Single Mode Task Chain

Create task entries in dependency order (backward compatible, unchanged):

**PROFILE-001** (profiler, Stage 1):
```json
{
  "id": "PROFILE-001",
  "subject": "PROFILE-001",
  "description": "PURPOSE: Profile application performance to identify bottlenecks | Success: Baseline metrics captured, top 3-5 bottlenecks ranked by severity\nTASK:\n  - Detect project type and available profiling tools\n  - Execute profiling across relevant dimensions (CPU, memory, I/O, network, rendering)\n  - Collect baseline metrics and rank bottlenecks by severity\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <optimization-scope>\n  - Branch: none\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/artifacts/baseline-metrics.json + <session>/artifacts/bottleneck-report.md | Quantified metrics with evidence\nCONSTRAINTS: Focus on <optimization-scope> | Profile before any changes\n---\nInnerLoop: false",
  "status": "pending",
  "owner": "profiler",
  "blockedBy": []
}
```

**STRATEGY-001** (strategist, Stage 2):
```json
{
  "id": "STRATEGY-001",
  "subject": "STRATEGY-001",
  "description": "PURPOSE: Design prioritized optimization plan from bottleneck analysis | Success: Actionable plan with measurable success criteria per optimization\nTASK:\n  - Analyze bottleneck report and baseline metrics\n  - Select optimization strategies per bottleneck type\n  - Prioritize by impact/effort ratio, define success criteria\n  - Each optimization MUST have a unique OPT-ID (OPT-001, OPT-002, ...) with non-overlapping target files\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <optimization-scope>\n  - Branch: none\n  - Upstream artifacts: baseline-metrics.json, bottleneck-report.md\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/artifacts/optimization-plan.md | Priority-ordered with improvement targets, discrete OPT-IDs\nCONSTRAINTS: Focus on highest-impact optimizations | Risk assessment required | Non-overlapping file targets per OPT-ID\n---\nInnerLoop: false",
  "status": "pending",
  "owner": "strategist",
  "blockedBy": ["PROFILE-001"]
}
```

**IMPL-001** (optimizer, Stage 3):
```json
{
  "id": "IMPL-001",
  "subject": "IMPL-001",
  "description": "PURPOSE: Implement optimization changes per strategy plan | Success: All planned optimizations applied, code compiles, existing tests pass\nTASK:\n  - Load optimization plan and identify target files\n  - Apply optimizations in priority order (P0 first)\n  - Validate changes compile and pass existing tests\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <optimization-scope>\n  - Branch: none\n  - Upstream artifacts: optimization-plan.md\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: Modified source files + validation passing | Optimizations applied without regressions\nCONSTRAINTS: Preserve existing behavior | Minimal changes per optimization | Follow code conventions\n---\nInnerLoop: true",
  "status": "pending",
  "owner": "optimizer",
  "blockedBy": ["STRATEGY-001"]
}
```

**BENCH-001** (benchmarker, Stage 4 - parallel):
```json
{
  "id": "BENCH-001",
  "subject": "BENCH-001",
  "description": "PURPOSE: Benchmark optimization results against baseline | Success: All plan success criteria met, no regressions detected\nTASK:\n  - Load baseline metrics and plan success criteria\n  - Run benchmarks matching project type\n  - Compare before/after metrics, calculate improvements\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <optimization-scope>\n  - Branch: none\n  - Upstream artifacts: baseline-metrics.json, optimization-plan.md\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/artifacts/benchmark-results.json | Per-metric comparison with verdicts\nCONSTRAINTS: Must compare against baseline | Flag any regressions\n---\nInnerLoop: false",
  "status": "pending",
  "owner": "benchmarker",
  "blockedBy": ["IMPL-001"]
}
```

**REVIEW-001** (reviewer, Stage 4 - parallel):
```json
{
  "id": "REVIEW-001",
  "subject": "REVIEW-001",
  "description": "PURPOSE: Review optimization code for correctness, side effects, and regression risks | Success: All dimensions reviewed, verdict issued\nTASK:\n  - Load modified files and optimization plan\n  - Review across 5 dimensions: correctness, side effects, maintainability, regression risk, best practices\n  - Issue verdict: APPROVE, REVISE, or REJECT with actionable feedback\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <optimization-scope>\n  - Branch: none\n  - Upstream artifacts: optimization-plan.md, benchmark-results.json (if available)\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/artifacts/review-report.md | Per-dimension findings with severity\nCONSTRAINTS: Focus on optimization changes only | Provide specific file:line references\n---\nInnerLoop: false",
  "status": "pending",
  "owner": "reviewer",
  "blockedBy": ["IMPL-001"]
}
```

---

### Auto / Fan-out Mode Task Chain (Deferred Branching)

For `auto` and `fan-out` modes, create only shared stages now. Branch tasks are created at **CP-2.5** after STRATEGY-001 completes.

Create PROFILE-001 and STRATEGY-001 entries with same templates as single mode above.

**Do NOT create IMPL/BENCH/REVIEW task entries yet.** They are created by the CP-2.5 Branch Creation subroutine in monitor.md.

---

### Independent Mode Task Chain

For `independent` mode, create M complete pipelines -- one per target in `independent_targets` array.

Pipeline prefix chars: `A, B, C, D, E, F, G, H, I, J` (from config `pipeline_prefix_chars`).

For each target index `i` (0-based), with prefix char `P = pipeline_prefix_chars[i]`:

```
// Create session subdirectory for this pipeline
Bash("mkdir -p <session>/artifacts/pipelines/<P>")

// Build task entries for this pipeline
Add entries to tasks array:
  { "id": "PROFILE-<P>01", ..., "blockedBy": [] }
  { "id": "STRATEGY-<P>01", ..., "blockedBy": ["PROFILE-<P>01"] }
  { "id": "IMPL-<P>01", ..., "blockedBy": ["STRATEGY-<P>01"] }
  { "id": "BENCH-<P>01", ..., "blockedBy": ["IMPL-<P>01"] }
  { "id": "REVIEW-<P>01", ..., "blockedBy": ["IMPL-<P>01"] }

Write all entries to <session>/tasks.json
```

Task descriptions follow same template as single mode, with additions:
- `Pipeline: <P>` in CONTEXT
- Artifact paths use `<session>/artifacts/pipelines/<P>/` instead of `<session>/artifacts/`
- Shared-memory namespace uses `<role>.<P>` (e.g., `profiler.A`, `optimizer.B`)
- Each pipeline's scope is its specific target from `independent_targets[i]`

Example for pipeline A with target "optimize rendering":
```json
{
  "id": "PROFILE-A01",
  "subject": "PROFILE-A01",
  "description": "PURPOSE: Profile rendering performance | Success: Rendering bottlenecks identified\nTASK:\n  - Detect project type and available profiling tools\n  - Execute profiling focused on rendering performance\n  - Collect baseline metrics and rank rendering bottlenecks\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: optimize rendering\n  - Pipeline: A\n  - Shared memory: <session>/.msg/meta.json (namespace: profiler.A)\nEXPECTED: <session>/artifacts/pipelines/A/baseline-metrics.json + bottleneck-report.md\nCONSTRAINTS: Focus on rendering scope\n---\nInnerLoop: false\nPipelineId: A",
  "status": "pending",
  "owner": "profiler",
  "blockedBy": []
}
```

---

### CP-2.5: Branch Creation Subroutine

**Triggered by**: monitor.md handleCallback when STRATEGY-001 completes in `auto` or `fan-out` mode.

**Procedure**:

1. Read `<session>/artifacts/optimization-plan.md` to count OPT-IDs
2. Read `.msg/meta.json` -> `strategist.optimization_count`
3. **Auto mode decision**:

| Optimization Count | Decision |
|-------------------|----------|
| count <= 2 | Switch to `single` mode -- add IMPL-001, BENCH-001, REVIEW-001 entries to tasks.json (standard single pipeline) |
| count >= 3 | Switch to `fan-out` mode -- create branch task entries below |

4. Update session.json with resolved `parallel_mode` (auto -> single or fan-out)

5. **Fan-out branch creation** (when count >= 3 or forced fan-out):
   - Truncate to `max_branches` if `optimization_count > max_branches` (keep top N by priority)
   - For each optimization `i` (1-indexed), branch ID = `B{NN}` where NN = zero-padded i:

```
// Create branch artifact directory
Bash("mkdir -p <session>/artifacts/branches/B{NN}")

// Extract single OPT detail to branch
Write("<session>/artifacts/branches/B{NN}/optimization-detail.md",
  extracted OPT-{NNN} block from optimization-plan.md)
```

6. Add branch task entries to `<session>/tasks.json` for each branch B{NN}:

```json
{
  "id": "IMPL-B{NN}",
  "subject": "IMPL-B{NN}",
  "description": "PURPOSE: Implement optimization OPT-{NNN} | Success: Single optimization applied, compiles, tests pass\nTASK:\n  - Load optimization detail from branches/B{NN}/optimization-detail.md\n  - Apply this single optimization to target files\n  - Validate changes compile and pass existing tests\nCONTEXT:\n  - Session: <session-folder>\n  - Branch: B{NN}\n  - Upstream artifacts: branches/B{NN}/optimization-detail.md\n  - Shared memory: <session>/.msg/meta.json (namespace: optimizer.B{NN})\nEXPECTED: Modified source files for OPT-{NNN} only\nCONSTRAINTS: Only implement this branch's optimization | Do not touch files outside OPT-{NNN} scope\n---\nInnerLoop: false\nBranchId: B{NN}",
  "status": "pending",
  "owner": "optimizer",
  "blockedBy": ["STRATEGY-001"]
}
```

```json
{
  "id": "BENCH-B{NN}",
  "subject": "BENCH-B{NN}",
  "description": "PURPOSE: Benchmark branch B{NN} optimization | Success: OPT-{NNN} metrics meet success criteria\nTASK:\n  - Load baseline metrics and OPT-{NNN} success criteria\n  - Benchmark only metrics relevant to this optimization\n  - Compare against baseline, calculate improvement\nCONTEXT:\n  - Session: <session-folder>\n  - Branch: B{NN}\n  - Upstream artifacts: baseline-metrics.json, branches/B{NN}/optimization-detail.md\n  - Shared memory: <session>/.msg/meta.json (namespace: benchmarker.B{NN})\nEXPECTED: <session>/artifacts/branches/B{NN}/benchmark-results.json\nCONSTRAINTS: Only benchmark this branch's metrics\n---\nInnerLoop: false\nBranchId: B{NN}",
  "status": "pending",
  "owner": "benchmarker",
  "blockedBy": ["IMPL-B{NN}"]
}
```

```json
{
  "id": "REVIEW-B{NN}",
  "subject": "REVIEW-B{NN}",
  "description": "PURPOSE: Review branch B{NN} optimization code | Success: Code quality verified for OPT-{NNN}\nTASK:\n  - Load modified files from optimizer.B{NN} shared-memory namespace\n  - Review across 5 dimensions for this branch's changes only\n  - Issue verdict: APPROVE, REVISE, or REJECT\nCONTEXT:\n  - Session: <session-folder>\n  - Branch: B{NN}\n  - Upstream artifacts: branches/B{NN}/optimization-detail.md\n  - Shared memory: <session>/.msg/meta.json (namespace: reviewer.B{NN})\nEXPECTED: <session>/artifacts/branches/B{NN}/review-report.md\nCONSTRAINTS: Only review this branch's changes\n---\nInnerLoop: false\nBranchId: B{NN}",
  "status": "pending",
  "owner": "reviewer",
  "blockedBy": ["IMPL-B{NN}"]
}
```

7. Update session.json:
   - `branches`: array of branch IDs (["B01", "B02", ...])
   - `fix_cycles`: object keyed by branch ID, all initialized to 0

---

## Phase 4: Validation

Verify task chain integrity:

| Check | Method | Expected |
|-------|--------|----------|
| Task count correct | Read tasks.json, count entries | single: 5, auto/fan-out: 2 (pre-CP-2.5), independent: 5*M |
| Dependencies correct | Trace dependency graph | Acyclic, correct blockedBy |
| No circular dependencies | Trace dependency graph | Acyclic |
| Task IDs use correct prefixes | Pattern check | Match naming rules per mode |
| Structured descriptions complete | Each has PURPOSE/TASK/CONTEXT/EXPECTED/CONSTRAINTS | All present |
| Branch/Pipeline IDs consistent | Cross-check with session.json | Match |

### Naming Rules Summary

| Mode | Stage 3 | Stage 4 | Fix |
|------|---------|---------|-----|
| Single | IMPL-001 | BENCH-001, REVIEW-001 | FIX-001, FIX-002 |
| Fan-out | IMPL-B01 | BENCH-B01, REVIEW-B01 | FIX-B01-1, FIX-B01-2 |
| Independent | IMPL-A01 | BENCH-A01, REVIEW-A01 | FIX-A01-1, FIX-A01-2 |

If validation fails, fix the specific task entry in tasks.json and re-validate.
