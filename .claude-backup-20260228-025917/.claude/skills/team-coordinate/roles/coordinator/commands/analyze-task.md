# Command: analyze-task

## Purpose

Parse user task description -> detect required capabilities -> build dependency graph -> design dynamic roles. This replaces v4's static mode selection with intelligent task decomposition.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Task description | User input from Phase 1 | Yes |
| Clarification answers | AskUserQuestion results (if any) | No |
| Session folder | From coordinator Phase 2 | Yes |

## Phase 3: Task Analysis

### Step 1: Signal Detection

Scan task description for capability keywords:

| Signal | Keywords | Capability | Prefix | Responsibility Type |
|--------|----------|------------|--------|---------------------|
| Research | investigate, explore, compare, survey, find, research, discover, benchmark, study | researcher | RESEARCH | orchestration |
| Writing | write, draft, document, article, report, blog, describe, explain, summarize, content | writer | DRAFT | code-gen (docs) |
| Coding | implement, build, code, fix, refactor, develop, create app, program, migrate, port | developer | IMPL | code-gen (code) |
| Design | design, architect, plan, structure, blueprint, model, schema, wireframe, layout | designer | DESIGN | orchestration |
| Analysis | analyze, review, audit, assess, evaluate, inspect, examine, diagnose, profile | analyst | ANALYSIS | read-only |
| Testing | test, verify, validate, QA, quality, check, assert, coverage, regression | tester | TEST | validation |
| Planning | plan, breakdown, organize, schedule, decompose, roadmap, strategy, prioritize | planner | PLAN | orchestration |

**Multi-match**: A task may trigger multiple capabilities. E.g., "research and write a technical article" triggers both `researcher` and `writer`.

**No match**: If no keywords match, default to a single `general` capability with `TASK` prefix.

### Step 2: Artifact Inference

Each capability produces default output artifacts:

| Capability | Default Artifact | Format |
|------------|-----------------|--------|
| researcher | Research findings | `<session>/artifacts/research-findings.md` |
| writer | Written document(s) | `<session>/artifacts/<doc-name>.md` |
| developer | Code implementation | Source files + `<session>/artifacts/implementation-summary.md` |
| designer | Design document | `<session>/artifacts/design-spec.md` |
| analyst | Analysis report | `<session>/artifacts/analysis-report.md` |
| tester | Test results | `<session>/artifacts/test-report.md` |
| planner | Execution plan | `<session>/artifacts/execution-plan.md` |

### Step 3: Dependency Graph Construction

Build a DAG of work streams using these inference rules:

| Pattern | Shape | Example |
|---------|-------|---------|
| Knowledge -> Creation | research blockedBy nothing, creation blockedBy research | RESEARCH-001 -> DRAFT-001 |
| Design -> Build | design first, build after | DESIGN-001 -> IMPL-001 |
| Build -> Validate | build first, test/review after | IMPL-001 -> TEST-001 + ANALYSIS-001 |
| Plan -> Execute | plan first, execute after | PLAN-001 -> IMPL-001 |
| Independent parallel | no dependency between them | DRAFT-001 || IMPL-001 |
| Analysis -> Revise | analysis finds issues, revise artifact | ANALYSIS-001 -> DRAFT-002 |

**Graph construction algorithm**:

1. Group capabilities by natural ordering: knowledge-gathering -> design/planning -> creation -> validation
2. Within same tier: capabilities are parallel unless task description implies sequence
3. Between tiers: downstream blockedBy upstream
4. Single-capability tasks: one node, no dependencies

**Natural ordering tiers**:

| Tier | Capabilities | Description |
|------|-------------|-------------|
| 0 | researcher, planner | Knowledge gathering / planning |
| 1 | designer | Design (requires context from tier 0 if present) |
| 2 | writer, developer | Creation (requires design/plan if present) |
| 3 | analyst, tester | Validation (requires artifacts to validate) |

### Step 4: Complexity Scoring

| Factor | Weight | Condition |
|--------|--------|-----------|
| Capability count | +1 each | Number of distinct capabilities |
| Cross-domain factor | +2 | Capabilities span 3+ tiers |
| Parallel tracks | +1 each | Independent parallel work streams |
| Serial depth | +1 per level | Longest dependency chain length |

| Total Score | Complexity | Role Limit |
|-------------|------------|------------|
| 1-3 | Low | 1-2 roles |
| 4-6 | Medium | 2-3 roles |
| 7+ | High | 3-5 roles |

### Step 5: Role Minimization

Apply merging rules to reduce role count:

| Rule | Condition | Action |
|------|-----------|--------|
| Absorb trivial | Capability has exactly 1 task AND no explore needed | Merge into nearest related role |
| Merge overlap | Two capabilities share >50% keywords from task description | Combine into single role |
| Cap at 5 | More than 5 roles after initial assignment | Merge lowest-priority pairs (priority: researcher > designer > developer > writer > analyst > planner > tester) |

**Merge priority** (when two must merge, keep the higher-priority one as the role name):

1. developer (code-gen is hardest to merge)
2. researcher (context-gathering is foundational)
3. writer (document generation has specific patterns)
4. designer (design has specific outputs)
5. analyst (analysis can be absorbed by reviewer pattern)
6. planner (planning can be merged with researcher or designer)
7. tester (can be absorbed by developer or analyst)

**IMPORTANT**: Even after merging, coordinator MUST spawn workers for all roles. Single-role tasks still use team architecture.

## Phase 4: Output

Write `<session-folder>/task-analysis.json`:

```json
{
  "task_description": "<original user input>",
  "capabilities": [
    {
      "name": "researcher",
      "prefix": "RESEARCH",
      "responsibility_type": "orchestration",
      "tasks": [
        { "id": "RESEARCH-001", "description": "..." }
      ],
      "artifacts": ["research-findings.md"]
    }
  ],
  "dependency_graph": {
    "RESEARCH-001": [],
    "DRAFT-001": ["RESEARCH-001"],
    "ANALYSIS-001": ["DRAFT-001"]
  },
  "roles": [
    {
      "name": "researcher",
      "prefix": "RESEARCH",
      "responsibility_type": "orchestration",
      "task_count": 1,
      "inner_loop": false
    },
    {
      "name": "writer",
      "prefix": "DRAFT",
      "responsibility_type": "code-gen (docs)",
      "task_count": 1,
      "inner_loop": false
    }
  ],
  "complexity": {
    "capability_count": 2,
    "cross_domain_factor": false,
    "parallel_tracks": 0,
    "serial_depth": 2,
    "total_score": 3,
    "level": "low"
  },
  "artifacts": [
    { "name": "research-findings.md", "producer": "researcher", "path": "artifacts/research-findings.md" },
    { "name": "article-draft.md", "producer": "writer", "path": "artifacts/article-draft.md" }
  ]
}
```

## Complexity Interpretation

**CRITICAL**: Complexity score is for **role design optimization**, NOT for skipping team workflow.

| Complexity | Team Structure | Coordinator Action |
|------------|----------------|-------------------|
| Low (1-2 roles) | Minimal team | Generate 1-2 roles, create team, spawn workers |
| Medium (2-3 roles) | Standard team | Generate roles, create team, spawn workers |
| High (3-5 roles) | Full team | Generate roles, create team, spawn workers |

**All complexity levels use team architecture**:
- Single-role tasks still spawn worker via Skill
- Coordinator NEVER executes task work directly
- Team infrastructure provides session management, message bus, fast-advance

**Purpose of complexity score**:
- ✅ Determine optimal role count (merge vs separate)
- ✅ Guide dependency graph design
- ✅ Inform user about task scope
- ❌ NOT for deciding whether to use team workflow

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No capabilities detected | Default to single `general` role with TASK prefix |
| Circular dependency in graph | Break cycle at lowest-tier edge, warn |
| Task description too vague | Return minimal analysis, coordinator will AskUserQuestion |
| All capabilities merge into one | Valid -- single-role execution via team worker |
