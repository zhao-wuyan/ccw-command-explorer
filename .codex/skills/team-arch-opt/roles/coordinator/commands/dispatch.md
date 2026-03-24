# Command: Dispatch

Create the architecture optimization task chain with correct dependencies and structured task descriptions. Supports single, fan-out, independent, and auto parallel modes.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| User requirement | From coordinator Phase 1 | Yes |
| Session folder | From coordinator Phase 2 | Yes |
| Pipeline definition | From SKILL.md Pipeline Definitions | Yes |
| Parallel mode | From tasks.json `parallel_mode` | Yes |
| Max branches | From tasks.json `max_branches` | Yes |
| Independent targets | From tasks.json `independent_targets` (independent mode only) | Conditional |

1. Load user requirement and refactoring scope from tasks.json
2. Load pipeline stage definitions from SKILL.md Task Metadata Registry
3. Read `parallel_mode` and `max_branches` from tasks.json
4. For `independent` mode: read `independent_targets` array from tasks.json

## Phase 3: Task Chain Creation (Mode-Branched)

### Task Entry Template

Every task in tasks.json `tasks` object uses structured format:

```json
{
  "<TASK-ID>": {
    "title": "<concise title>",
    "description": "PURPOSE: <what this task achieves> | Success: <measurable completion criteria>\nTASK:\n  - <step 1: specific action>\n  - <step 2: specific action>\n  - <step 3: specific action>\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <refactoring-scope>\n  - Branch: <branch-id or 'none'>\n  - Upstream artifacts: <artifact-1>, <artifact-2>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <deliverable path> + <quality criteria>\nCONSTRAINTS: <scope limits, focus areas>\n---\nInnerLoop: <true|false>\nBranchId: <B01|A|none>",
    "role": "<role-name>",
    "prefix": "<PREFIX>",
    "deps": ["<upstream-task-id>"],
    "status": "pending",
    "findings": null,
    "error": null
  }
}
```

### Mode Router

| Mode | Action |
|------|--------|
| `single` | Create 5 tasks (ANALYZE -> DESIGN -> REFACTOR -> VALIDATE + REVIEW) -- unchanged from linear pipeline |
| `auto` | Create ANALYZE-001 + DESIGN-001 only. **Defer branch creation to CP-2.5** after design completes |
| `fan-out` | Create ANALYZE-001 + DESIGN-001 only. **Defer branch creation to CP-2.5** after design completes |
| `independent` | Create M complete pipelines immediately (one per target) |

---

### Single Mode Task Chain

Create tasks in dependency order (backward compatible, unchanged):

**ANALYZE-001** (analyzer, Stage 1):
```json
{
  "ANALYZE-001": {
    "title": "Analyze codebase architecture",
    "description": "PURPOSE: Analyze codebase architecture to identify structural issues | Success: Baseline metrics captured, top 3-7 issues ranked by severity\nTASK:\n  - Detect project type and available analysis tools\n  - Execute analysis across relevant dimensions (dependencies, coupling, cohesion, layering, duplication, dead code)\n  - Collect baseline metrics and rank architecture issues by severity\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <refactoring-scope>\n  - Branch: none\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/artifacts/architecture-baseline.json + <session>/artifacts/architecture-report.md | Quantified metrics with evidence\nCONSTRAINTS: Focus on <refactoring-scope> | Analyze before any changes\n---\nInnerLoop: false",
    "role": "analyzer",
    "prefix": "ANALYZE",
    "deps": [],
    "status": "pending",
    "findings": null,
    "error": null
  }
}
```

**DESIGN-001** (designer, Stage 2):
```json
{
  "DESIGN-001": {
    "title": "Design prioritized refactoring plan",
    "description": "PURPOSE: Design prioritized refactoring plan from architecture analysis | Success: Actionable plan with measurable success criteria per refactoring\nTASK:\n  - Analyze architecture report and baseline metrics\n  - Select refactoring strategies per issue type\n  - Prioritize by impact/effort ratio, define success criteria\n  - Each refactoring MUST have a unique REFACTOR-ID (REFACTOR-001, REFACTOR-002, ...) with non-overlapping target files\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <refactoring-scope>\n  - Branch: none\n  - Upstream artifacts: architecture-baseline.json, architecture-report.md\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/artifacts/refactoring-plan.md | Priority-ordered with structural improvement targets, discrete REFACTOR-IDs\nCONSTRAINTS: Focus on highest-impact refactorings | Risk assessment required | Non-overlapping file targets per REFACTOR-ID\n---\nInnerLoop: false",
    "role": "designer",
    "prefix": "DESIGN",
    "deps": ["ANALYZE-001"],
    "status": "pending",
    "findings": null,
    "error": null
  }
}
```

**REFACTOR-001** (refactorer, Stage 3):
```json
{
  "REFACTOR-001": {
    "title": "Implement refactoring changes per design plan",
    "description": "PURPOSE: Implement refactoring changes per design plan | Success: All planned refactorings applied, code compiles, existing tests pass\nTASK:\n  - Load refactoring plan and identify target files\n  - Apply refactorings in priority order (P0 first)\n  - Update all import references for moved/renamed modules\n  - Validate changes compile and pass existing tests\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <refactoring-scope>\n  - Branch: none\n  - Upstream artifacts: refactoring-plan.md\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: Modified source files + validation passing | Refactorings applied without regressions\nCONSTRAINTS: Preserve existing behavior | Update all references | Follow code conventions\n---\nInnerLoop: true",
    "role": "refactorer",
    "prefix": "REFACTOR",
    "deps": ["DESIGN-001"],
    "status": "pending",
    "findings": null,
    "error": null
  }
}
```

**VALIDATE-001** (validator, Stage 4 - parallel):
```json
{
  "VALIDATE-001": {
    "title": "Validate refactoring results against baseline",
    "description": "PURPOSE: Validate refactoring results against baseline | Success: Build passes, tests pass, no metric regressions, API compatible\nTASK:\n  - Load architecture baseline and plan success criteria\n  - Run build validation (compilation, type checking)\n  - Run test validation (existing test suite)\n  - Compare dependency metrics against baseline\n  - Verify API compatibility (no dangling references)\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <refactoring-scope>\n  - Branch: none\n  - Upstream artifacts: architecture-baseline.json, refactoring-plan.md\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/artifacts/validation-results.json | Per-dimension validation with verdicts\nCONSTRAINTS: Must compare against baseline | Flag any regressions or broken imports\n---\nInnerLoop: false",
    "role": "validator",
    "prefix": "VALIDATE",
    "deps": ["REFACTOR-001"],
    "status": "pending",
    "findings": null,
    "error": null
  }
}
```

**REVIEW-001** (reviewer, Stage 4 - parallel):
```json
{
  "REVIEW-001": {
    "title": "Review refactoring code for correctness and quality",
    "description": "PURPOSE: Review refactoring code for correctness, pattern consistency, and migration safety | Success: All dimensions reviewed, verdict issued\nTASK:\n  - Load modified files and refactoring plan\n  - Review across 5 dimensions: correctness, pattern consistency, completeness, migration safety, best practices\n  - Issue verdict: APPROVE, REVISE, or REJECT with actionable feedback\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <refactoring-scope>\n  - Branch: none\n  - Upstream artifacts: refactoring-plan.md, validation-results.json (if available)\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/artifacts/review-report.md | Per-dimension findings with severity\nCONSTRAINTS: Focus on refactoring changes only | Provide specific file:line references\n---\nInnerLoop: false",
    "role": "reviewer",
    "prefix": "REVIEW",
    "deps": ["REFACTOR-001"],
    "status": "pending",
    "findings": null,
    "error": null
  }
}
```

---

### Auto / Fan-out Mode Task Chain (Deferred Branching)

For `auto` and `fan-out` modes, create only shared stages now. Branch tasks are created at **CP-2.5** after DESIGN-001 completes.

Create ANALYZE-001 and DESIGN-001 with same templates as single mode above.

**Do NOT create REFACTOR/VALIDATE/REVIEW tasks yet.** They are created by the CP-2.5 Branch Creation subroutine in monitor.md.

---

### Independent Mode Task Chain

For `independent` mode, create M complete pipelines -- one per target in `independent_targets` array.

Pipeline prefix chars: `A, B, C, D, E, F, G, H, I, J` (from config `pipeline_prefix_chars`).

For each target index `i` (0-based), with prefix char `P = pipeline_prefix_chars[i]`:

```javascript
// Create session subdirectory for this pipeline
Bash("mkdir -p <session>/artifacts/pipelines/<P>")

// Add pipeline tasks to tasks.json:
state.tasks["ANALYZE-<P>01"] = { title: "...", role: "analyzer", prefix: "ANALYZE", deps: [], ... }
state.tasks["DESIGN-<P>01"] = { title: "...", role: "designer", prefix: "DESIGN", deps: ["ANALYZE-<P>01"], ... }
state.tasks["REFACTOR-<P>01"] = { title: "...", role: "refactorer", prefix: "REFACTOR", deps: ["DESIGN-<P>01"], ... }
state.tasks["VALIDATE-<P>01"] = { title: "...", role: "validator", prefix: "VALIDATE", deps: ["REFACTOR-<P>01"], ... }
state.tasks["REVIEW-<P>01"] = { title: "...", role: "reviewer", prefix: "REVIEW", deps: ["REFACTOR-<P>01"], ... }
```

Task descriptions follow same template as single mode, with additions:
- `Pipeline: <P>` in CONTEXT
- Artifact paths use `<session>/artifacts/pipelines/<P>/` instead of `<session>/artifacts/`
- Meta.json namespace uses `<role>.<P>` (e.g., `analyzer.A`, `refactorer.B`)
- Each pipeline's scope is its specific target from `independent_targets[i]`

Example for pipeline A with target "refactor auth module":
```json
{
  "ANALYZE-A01": {
    "title": "Analyze auth module architecture",
    "description": "PURPOSE: Analyze auth module architecture | Success: Auth module structural issues identified\nTASK:\n  - Detect project type and available analysis tools\n  - Execute architecture analysis focused on auth module\n  - Collect baseline metrics and rank auth module issues\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: refactor auth module\n  - Pipeline: A\n  - Shared memory: <session>/wisdom/.msg/meta.json (namespace: analyzer.A)\nEXPECTED: <session>/artifacts/pipelines/A/architecture-baseline.json + architecture-report.md\nCONSTRAINTS: Focus on auth module scope\n---\nInnerLoop: false\nPipelineId: A",
    "role": "analyzer",
    "prefix": "ANALYZE",
    "deps": [],
    "status": "pending",
    "findings": null,
    "error": null
  }
}
```

---

### CP-2.5: Branch Creation Subroutine

**Triggered by**: monitor.md handleSpawnNext when DESIGN-001 completes in `auto` or `fan-out` mode.

**Procedure**:

1. Read `<session>/artifacts/refactoring-plan.md` to count REFACTOR-IDs
2. Read `.msg/meta.json` -> `designer.refactoring_count`
3. **Auto mode decision**:

| Refactoring Count | Decision |
|-------------------|----------|
| count <= 2 | Switch to `single` mode -- add REFACTOR-001, VALIDATE-001, REVIEW-001 to tasks.json (standard single pipeline) |
| count >= 3 | Switch to `fan-out` mode -- add branch tasks below |

4. Update tasks.json with resolved `parallel_mode` (auto -> single or fan-out)

5. **Fan-out branch creation** (when count >= 3 or forced fan-out):
   - Truncate to `max_branches` if `refactoring_count > max_branches` (keep top N by priority)
   - For each refactoring `i` (1-indexed), branch ID = `B{NN}` where NN = zero-padded i:

```javascript
// Create branch artifact directory
Bash("mkdir -p <session>/artifacts/branches/B{NN}")

// Extract single REFACTOR detail to branch
Write("<session>/artifacts/branches/B{NN}/refactoring-detail.md",
  extracted REFACTOR-{NNN} block from refactoring-plan.md)
```

6. Add branch tasks to tasks.json for each branch B{NN}:

```json
{
  "REFACTOR-B{NN}": {
    "title": "Implement refactoring REFACTOR-{NNN}",
    "description": "PURPOSE: Implement refactoring REFACTOR-{NNN} | Success: Single refactoring applied, compiles, tests pass\nTASK:\n  - Load refactoring detail from branches/B{NN}/refactoring-detail.md\n  - Apply this single refactoring to target files\n  - Update all import references for moved/renamed modules\n  - Validate changes compile and pass existing tests\nCONTEXT:\n  - Session: <session-folder>\n  - Branch: B{NN}\n  - Upstream artifacts: branches/B{NN}/refactoring-detail.md\n  - Shared memory: <session>/wisdom/.msg/meta.json (namespace: refactorer.B{NN})\nEXPECTED: Modified source files for REFACTOR-{NNN} only\nCONSTRAINTS: Only implement this branch's refactoring | Do not touch files outside REFACTOR-{NNN} scope\n---\nInnerLoop: false\nBranchId: B{NN}",
    "role": "refactorer",
    "prefix": "REFACTOR",
    "deps": ["DESIGN-001"],
    "status": "pending",
    "findings": null,
    "error": null
  },
  "VALIDATE-B{NN}": {
    "title": "Validate branch B{NN} refactoring",
    "description": "PURPOSE: Validate branch B{NN} refactoring | Success: REFACTOR-{NNN} passes build, tests, and metric checks\nTASK:\n  - Load architecture baseline and REFACTOR-{NNN} success criteria\n  - Validate build, tests, dependency metrics, and API compatibility\n  - Compare against baseline, check for regressions\nCONTEXT:\n  - Session: <session-folder>\n  - Branch: B{NN}\n  - Upstream artifacts: architecture-baseline.json, branches/B{NN}/refactoring-detail.md\n  - Shared memory: <session>/wisdom/.msg/meta.json (namespace: validator.B{NN})\nEXPECTED: <session>/artifacts/branches/B{NN}/validation-results.json\nCONSTRAINTS: Only validate this branch's changes\n---\nInnerLoop: false\nBranchId: B{NN}",
    "role": "validator",
    "prefix": "VALIDATE",
    "deps": ["REFACTOR-B{NN}"],
    "status": "pending",
    "findings": null,
    "error": null
  },
  "REVIEW-B{NN}": {
    "title": "Review branch B{NN} refactoring code",
    "description": "PURPOSE: Review branch B{NN} refactoring code | Success: Code quality verified for REFACTOR-{NNN}\nTASK:\n  - Load modified files from refactorer.B{NN} namespace in .msg/meta.json\n  - Review across 5 dimensions for this branch's changes only\n  - Issue verdict: APPROVE, REVISE, or REJECT\nCONTEXT:\n  - Session: <session-folder>\n  - Branch: B{NN}\n  - Upstream artifacts: branches/B{NN}/refactoring-detail.md\n  - Shared memory: <session>/wisdom/.msg/meta.json (namespace: reviewer.B{NN})\nEXPECTED: <session>/artifacts/branches/B{NN}/review-report.md\nCONSTRAINTS: Only review this branch's changes\n---\nInnerLoop: false\nBranchId: B{NN}",
    "role": "reviewer",
    "prefix": "REVIEW",
    "deps": ["REFACTOR-B{NN}"],
    "status": "pending",
    "findings": null,
    "error": null
  }
}
```

7. Update tasks.json:
   - `branches`: array of branch IDs (["B01", "B02", ...])
   - `fix_cycles`: object keyed by branch ID, all initialized to 0

---

## Phase 4: Validation

Verify task chain integrity:

| Check | Method | Expected |
|-------|--------|----------|
| Task count correct | tasks.json task count | single: 5, auto/fan-out: 2 (pre-CP-2.5), independent: 5*M |
| Dependencies correct | Trace dependency graph | Acyclic, correct deps |
| No circular dependencies | Trace dependency graph | Acyclic |
| Task IDs use correct prefixes | Pattern check | Match naming rules per mode |
| Structured descriptions complete | Each has PURPOSE/TASK/CONTEXT/EXPECTED/CONSTRAINTS | All present |
| Branch/Pipeline IDs consistent | Cross-check with tasks.json | Match |

### Naming Rules Summary

| Mode | Stage 3 | Stage 4 | Fix |
|------|---------|---------|-----|
| Single | REFACTOR-001 | VALIDATE-001, REVIEW-001 | FIX-001, FIX-002 |
| Fan-out | REFACTOR-B01 | VALIDATE-B01, REVIEW-B01 | FIX-B01-1, FIX-B01-2 |
| Independent | REFACTOR-A01 | VALIDATE-A01, REVIEW-A01 | FIX-A01-1, FIX-A01-2 |

If validation fails, fix the specific task and re-validate.
