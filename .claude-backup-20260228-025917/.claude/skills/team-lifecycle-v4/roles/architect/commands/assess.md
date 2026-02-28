# Command: assess

## Purpose

Multi-mode architecture assessment. Auto-detects consultation mode from task subject prefix, runs mode-specific analysis, and produces a verdict with concerns and recommendations.

## Phase 2: Context Loading

### Common Context (all modes)

| Input | Source | Required |
|-------|--------|----------|
| Session folder | Task description `Session:` field | Yes |
| Wisdom | `<session_folder>/wisdom/` (all files) | No |
| Project tech | `.workflow/project-tech.json` | No |
| Explorations | `<session_folder>/explorations/` | No |

### Mode-Specific Context

| Mode | Task Pattern | Additional Context |
|------|-------------|-------------------|
| spec-review | ARCH-SPEC-* | `spec/architecture/_index.md`, `spec/architecture/ADR-*.md` |
| plan-review | ARCH-PLAN-* | `plan/plan.json`, `plan/.task/TASK-*.json` |
| code-review | ARCH-CODE-* | `git diff --name-only`, changed file contents |
| consult | ARCH-CONSULT-* | Question extracted from task description |
| feasibility | ARCH-FEASIBILITY-* | Proposal from task description, codebase search results |

## Phase 3: Mode-Specific Assessment

### Mode: spec-review

Review architecture documents for technical soundness across 4 dimensions.

**Assessment dimensions**:

| Dimension | Weight | Focus |
|-----------|--------|-------|
| Consistency | 25% | ADR decisions align with each other and with architecture index |
| Scalability | 25% | Design supports growth, no single-point bottlenecks |
| Security | 25% | Auth model, data protection, API security addressed |
| Tech fitness | 25% | Technology choices match project-tech.json and problem domain |

**Checks**:
- Read architecture index and all ADR files
- Cross-reference ADR decisions for contradictions
- Verify tech choices align with project-tech.json
- Score each dimension 0-100

---

### Mode: plan-review

Review implementation plan for architectural soundness.

**Checks**:

| Check | What | Severity if Failed |
|-------|------|-------------------|
| Dependency cycles | Build task graph, detect cycles via DFS | High |
| Task granularity | Flag tasks touching >8 files | Medium |
| Convention compliance | Verify plan follows wisdom/conventions.md | Medium |
| Architecture alignment | Verify plan doesn't contradict wisdom/decisions.md | High |

**Dependency cycle detection flow**:
1. Parse all TASK-*.json files -> extract id and depends_on
2. Build directed graph
3. DFS traversal -> flag any node visited twice in same stack
4. Report cycle path if found

---

### Mode: code-review

Assess architectural impact of code changes.

**Checks**:

| Check | Method | Severity if Found |
|-------|--------|-------------------|
| Layer violations | Detect upward imports (deeper layer importing shallower) | High |
| New dependencies | Parse package.json diff for added deps | Medium |
| Module boundary changes | Flag index.ts/index.js modifications | Medium |
| Architectural impact | Score based on file count and boundary changes | Info |

**Impact scoring**:

| Condition | Impact Level |
|-----------|-------------|
| Changed files > 10 | High |
| index.ts/index.js or package.json modified | Medium |
| All other cases | Low |

**Detection example** (find changed files):

```bash
Bash(command="git diff --name-only HEAD~1 2>/dev/null || git diff --name-only --cached")
```

---

### Mode: consult

Answer architecture decision questions. Route by question complexity.

**Complexity detection**:

| Condition | Classification |
|-----------|---------------|
| Question > 200 chars OR matches: architect, design, pattern, refactor, migrate, scalab | Complex |
| All other questions | Simple |

**Complex questions** -> delegate to CLI exploration:

```bash
Bash(command="ccw cli -p \"PURPOSE: Architecture consultation for: <question_summary>
TASK: Search codebase for relevant patterns, analyze architectural implications, provide options with trade-offs
MODE: analysis
CONTEXT: @**/*
EXPECTED: Options with trade-offs, file references, architectural implications
CONSTRAINTS: Advisory only, provide options not decisions\" --tool gemini --mode analysis --rule analysis-review-architecture", timeout=300000)
```

**Simple questions** -> direct analysis using available context (wisdom, project-tech, codebase search).

---

### Mode: feasibility

Evaluate technical feasibility of a proposal.

**Assessment areas**:

| Area | Method | Output |
|------|--------|--------|
| Tech stack compatibility | Compare proposal needs against project-tech.json | Compatible / Requires additions |
| Codebase readiness | Search for integration points using Grep/Glob | Touch-point count |
| Effort estimation | Based on touch-point count (see table below) | Low / Medium / High |
| Risk assessment | Based on effort + tech compatibility | Risks + mitigations |

**Effort estimation**:

| Touch Points | Effort | Implication |
|-------------|--------|-------------|
| <= 5 | Low | Straightforward implementation |
| 6 - 20 | Medium | Moderate refactoring needed |
| > 20 | High | Significant refactoring, consider phasing |

**Verdict for feasibility**:

| Condition | Verdict |
|-----------|---------|
| Low/medium effort, compatible stack | FEASIBLE |
| High touch-points OR new tech required | RISKY |
| Fundamental incompatibility or unreasonable effort | INFEASIBLE |

---

### Verdict Routing (all modes except feasibility)

| Verdict | Criteria |
|---------|----------|
| BLOCK | >= 2 high-severity concerns |
| CONCERN | >= 1 high-severity OR >= 3 medium-severity concerns |
| APPROVE | All other cases |

## Phase 4: Validation

### Output Format

Write assessment to `<session_folder>/architecture/arch-<slug>.json`.

**Report content sent to coordinator**:

| Field | Description |
|-------|-------------|
| mode | Consultation mode used |
| verdict | APPROVE / CONCERN / BLOCK (or FEASIBLE / RISKY / INFEASIBLE) |
| concern_count | Number of concerns by severity |
| recommendations | Actionable suggestions with trade-offs |
| output_path | Path to full assessment file |

**Wisdom contribution**: Append significant decisions to `<session_folder>/wisdom/decisions.md`.

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Architecture docs not found | Assess from available context, note limitation in report |
| Plan file missing | Report to coordinator via arch_concern |
| Git diff fails (no commits) | Use staged changes or skip code-review mode |
| CLI exploration timeout | Provide partial assessment, flag as incomplete |
| Exploration results unparseable | Fall back to direct analysis without exploration |
| Insufficient context | Request explorer assistance via coordinator |
