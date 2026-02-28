# Command: analyze-task

## Purpose

Parse user task description -> detect required capabilities -> build dependency graph -> design dynamic roles with role-spec metadata. Outputs structured task-analysis.json with frontmatter fields for role-spec generation.

## CRITICAL CONSTRAINT

**TEXT-LEVEL analysis only. MUST NOT read source code or explore codebase.**

**Allowed:**
- Parse user task description text
- AskUserQuestion for clarification
- Keyword-to-capability mapping
- Write `task-analysis.json`

If task context requires codebase knowledge, set `needs_research: true`. Phase 2 will spawn researcher worker.

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

**Multi-match**: A task may trigger multiple capabilities.

**No match**: Default to a single `general` capability with `TASK` prefix.

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

Build a DAG of work streams using natural ordering tiers:

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

Apply merging rules to reduce role count (cap at 5).

### Step 6: Role-Spec Metadata Assignment

For each role, determine frontmatter fields:

| Field | Derivation |
|-------|------------|
| `prefix` | From capability prefix (e.g., RESEARCH, DRAFT, IMPL) |
| `inner_loop` | `true` if role has 2+ serial same-prefix tasks |
| `subagents` | Inferred from responsibility type: orchestration -> [explore], code-gen (docs) -> [explore], validation -> [] |
| `message_types.success` | `<prefix>_complete` |
| `message_types.error` | `error` |

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
      "inner_loop": false,
      "role_spec_metadata": {
        "subagents": ["explore"],
        "message_types": {
          "success": "research_complete",
          "error": "error"
        }
      }
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
  "needs_research": false,
  "artifacts": [
    { "name": "research-findings.md", "producer": "researcher", "path": "artifacts/research-findings.md" }
  ]
}
```

## Complexity Interpretation

**CRITICAL**: Complexity score is for **role design optimization**, NOT for skipping team workflow.

| Complexity | Team Structure | Coordinator Action |
|------------|----------------|-------------------|
| Low (1-2 roles) | Minimal team | Generate 1-2 role-specs, create team, spawn workers |
| Medium (2-3 roles) | Standard team | Generate role-specs, create team, spawn workers |
| High (3-5 roles) | Full team | Generate role-specs, create team, spawn workers |

**All complexity levels use team-worker architecture**:
- Single-role tasks still spawn team-worker agent
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
| All capabilities merge into one | Valid -- single-role execution via team-worker |
