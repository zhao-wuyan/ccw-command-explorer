# Analyze Task

Parse iterative development task -> detect capabilities -> assess pipeline complexity -> design roles.

**CONSTRAINT**: Text-level analysis only. NO source code reading, NO codebase exploration.

## Signal Detection

| Keywords | Capability | Role |
|----------|------------|------|
| design, architect, restructure, refactor plan | architect | architect |
| implement, build, code, fix, develop | developer | developer |
| test, verify, validate, coverage | tester | tester |
| review, audit, quality, check | reviewer | reviewer |

## Pipeline Selection

| Signal | Score |
|--------|-------|
| Changed files > 10 | +3 |
| Changed files 3-10 | +2 |
| Structural change (refactor, architect, restructure) | +3 |
| Cross-cutting (multiple, across, cross) | +2 |
| Simple fix (fix, bug, typo, patch) | -2 |

| Score | Pipeline |
|-------|----------|
| >= 5 | multi-sprint |
| 2-4 | sprint |
| 0-1 | patch |

## Dependency Graph

Natural ordering tiers:
- Tier 0: architect (design must come first)
- Tier 1: developer (implementation requires design)
- Tier 2: tester, reviewer (validation requires artifacts, can run parallel)

## Complexity Assessment

| Factor | Points |
|--------|--------|
| Cross-module changes | +2 |
| Serial depth > 3 | +1 |
| Multiple developers needed | +2 |
| GC loop likely needed | +1 |

## Output

Write <session>/task-analysis.json:
```json
{
  "task_description": "<original>",
  "pipeline_type": "<patch|sprint|multi-sprint>",
  "capabilities": [{ "name": "<cap>", "role": "<role>", "keywords": ["..."] }],
  "roles": [{ "name": "<role>", "prefix": "<PREFIX>", "inner_loop": false }],
  "complexity": { "score": 0, "level": "Low|Medium|High" },
  "needs_architecture": true,
  "needs_testing": true,
  "needs_review": true
}
```
