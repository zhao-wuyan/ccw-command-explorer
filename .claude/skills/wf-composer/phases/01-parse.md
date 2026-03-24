# Phase 1: Parse — Semantic Intent Extraction

## Objective

Extract structured semantic steps and context variables from the user's natural language workflow description.

## Workflow

### Step 1.1 — Read Input

Parse `$ARGUMENTS` as the workflow description. If empty or ambiguous, AskUserQuestion:
- "Describe the workflow you want to automate. Include: what steps to run, in what order, and what varies each time (inputs)."

### Step 1.2 — Extract Steps

Scan the description for sequential actions. Each action becomes a candidate node.

**Signal patterns** (not exhaustive — apply NL understanding):

| Signal | Candidate Node Type |
|--------|---------------------|
| "analyze", "review", "explore" | analysis step (cli --mode analysis) |
| "plan", "design", "spec" | planning step (skill: workflow-lite-plan / workflow-plan) |
| "implement", "build", "code", "fix", "refactor" | execution step (skill: workflow-execute) |
| "test", "validate", "verify" | testing step (skill: workflow-test-fix) |
| "brainstorm", "ideate" | brainstorm step (skill: brainstorm / brainstorm-with-file) |
| "review code", "code review" | review step (skill: review-cycle) |
| "save", "checkpoint", "pause" | explicit checkpoint node |
| "spawn agent", "delegate", "subagent" | agent node |
| "then", "next", "after", "finally" | sequential edge signal |
| "parallel", "simultaneously", "at the same time" | parallel edge signal |

### Step 1.3 — Extract Variables

Identify inputs that vary per run. These become `context_schema` entries.

**Variable detection**:
- Direct mentions: "the goal", "the target", "my task", "user-provided X"
- Parameterized slots: `{goal}`, `[feature]`, `<scope>` patterns in the description
- Implicit from task type: any "feature/bugfix/topic" is `goal`

For each variable: assign name, type (string|path|boolean), required flag, description.

### Step 1.4 — Detect Task Type

Use ccw-coordinator task detection logic to classify the overall workflow:

```
bugfix | feature | tdd | review | brainstorm | spec-driven | roadmap |
refactor | integration-test | greenfield | quick-task | custom
```

`custom` = user describes a non-standard combination.

### Step 1.5 — Complexity Assessment

Count nodes, detect parallel tracks, identify dependencies:
- `simple` = 1-3 nodes, linear
- `medium` = 4-7 nodes, at most 1 parallel track
- `complex` = 8+ nodes or multiple parallel tracks

### Step 1.6 — Write Output

Create session dir: `.workflow/templates/design-drafts/WFD-<slug>-<date>/`

Write `intent.json`:
```json
{
  "session_id": "WFD-<slug>-<date>",
  "raw_description": "<original user input>",
  "task_type": "<detected type>",
  "complexity": "simple|medium|complex",
  "steps": [
    {
      "seq": 1,
      "description": "<extracted step description>",
      "type_hint": "analysis|planning|execution|testing|review|checkpoint|agent|cli",
      "parallel_with": null,
      "variables": ["goal"]
    }
  ],
  "variables": {
    "goal": { "type": "string", "required": true, "description": "<inferred description>" }
  },
  "created_at": "<ISO timestamp>"
}
```

## Success Criteria

- `intent.json` exists with at least 1 step
- All referenced variables extracted to `variables` map
- task_type and complexity assigned
