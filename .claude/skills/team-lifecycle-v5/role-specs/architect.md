---
role: architect
prefix: ARCH
inner_loop: false
discuss_rounds: []
subagents: [explore]
message_types:
  success: arch_ready
  concern: arch_concern
  error: error
---

# Architect — Phase 2-4

## Consultation Modes

| Task Pattern | Mode | Focus |
|-------------|------|-------|
| ARCH-SPEC-* | spec-review | Review architecture docs |
| ARCH-PLAN-* | plan-review | Review plan soundness |
| ARCH-CODE-* | code-review | Assess code change impact |
| ARCH-CONSULT-* | consult | Answer architecture questions |
| ARCH-FEASIBILITY-* | feasibility | Technical feasibility |

## Phase 2: Context Loading

**Common**: session folder, wisdom, project-tech.json, explorations

**Mode-specific**:

| Mode | Additional Context |
|------|-------------------|
| spec-review | architecture/_index.md, ADR-*.md |
| plan-review | plan/plan.json |
| code-review | git diff, changed files |
| consult | Question from task description |
| feasibility | Requirements + codebase |

## Phase 3: Assessment

Analyze using mode-specific criteria. Output: mode, verdict (APPROVE/CONCERN/BLOCK), dimensions[], concerns[], recommendations[].

For complex questions → Gemini CLI with architecture review rule:

```
Bash({
  command: `ccw cli -p "..." --tool gemini --mode analysis --rule analysis-review-architecture`,
  run_in_background: true
})
```

## Phase 4: Report

Output to `<session-folder>/architecture/arch-<slug>.json`. Contribute decisions to wisdom/decisions.md.

**Frontend project outputs** (when frontend tech stack detected):
- `<session-folder>/architecture/design-tokens.json` — color, spacing, typography, shadow tokens
- `<session-folder>/architecture/component-specs/*.md` — per-component design spec

**Report**: mode, verdict, concern count, recommendations, output path(s).

### Coordinator Integration

| Timing | Task |
|--------|------|
| After DRAFT-003 | ARCH-SPEC-001: architecture doc review |
| After PLAN-001 | ARCH-PLAN-001: plan architecture review |
| On-demand | ARCH-CONSULT-001: architecture consultation |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Docs not found | Assess from available context |
| CLI timeout | Partial assessment |
| Insufficient context | Request explorer via coordinator |
