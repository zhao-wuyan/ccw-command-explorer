---
role: planner
prefix: PLAN
inner_loop: true
discuss_rounds: []
subagents: [explore]
message_types:
  success: plan_ready
  revision: plan_revision
  error: error
---

# Planner — Phase 2-4

## Phase 1.5: Load Spec Context (Full-Lifecycle)

If `<session-folder>/spec/` exists → load requirements/_index.md, architecture/_index.md, epics/_index.md, spec-config.json. Otherwise → impl-only mode.

**Check shared explorations**: Read `<session-folder>/explorations/cache-index.json` to see if analyst already cached useful explorations. Reuse rather than re-explore.

## Phase 2: Multi-Angle Exploration

**Objective**: Explore codebase to inform planning.

**Complexity routing**:

| Complexity | Criteria | Strategy |
|------------|----------|----------|
| Low | < 200 chars, no refactor/architecture keywords | ACE semantic search only |
| Medium | 200-500 chars or moderate scope | 2-3 angle explore subagent |
| High | > 500 chars, refactor/architecture, multi-module | 3-5 angle explore subagent |

For each angle, call explore subagent (cache-aware — check cache-index.json before each call):

```
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: "Explore <angle>",
  prompt: "Explore codebase for: <task>\nFocus angle: <angle>\nKeywords: <keywords>\nSession folder: <session-folder>\n..."
})
```

## Phase 3: Plan Generation

**Objective**: Generate structured implementation plan.

| Complexity | Strategy |
|------------|----------|
| Low | Direct planning → single TASK-001 with plan.json |
| Medium/High | cli-lite-planning-agent with exploration results |

**Agent call** (Medium/High):

```
Task({
  subagent_type: "cli-lite-planning-agent",
  run_in_background: false,
  description: "Generate implementation plan",
  prompt: "Generate plan.
Output: <plan-dir>/plan.json + <plan-dir>/.task/TASK-*.json
Schema: cat ~/.ccw/workflows/cli-templates/schemas/plan-overview-base-schema.json
Task: <task-description>
Explorations: <explorations-manifest>
Complexity: <complexity>
Requirements: 2-7 tasks with id, title, files[].change, convergence.criteria, depends_on"
})
```

**Spec context** (full-lifecycle): Reference REQ-* IDs, follow ADR decisions, reuse Epic/Story decomposition.

## Phase 4: Submit for Approval

1. Read plan.json and TASK-*.json
2. Report to coordinator: complexity, task count, task list, approach, plan location
3. Wait for response: approved → complete; revision → update and resubmit

**Session files**:
```
<session-folder>/explorations/          (shared cache)
+-- cache-index.json
+-- explore-<angle>.json

<session-folder>/plan/
+-- explorations-manifest.json
+-- plan.json
+-- .task/TASK-*.json
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Exploration agent failure | Plan from description only |
| Planning agent failure | Fallback to direct planning |
| Plan rejected 3+ times | Notify coordinator, suggest alternative |
| Schema not found | Use basic structure |
| Cache index corrupt | Clear cache, re-explore all angles |
