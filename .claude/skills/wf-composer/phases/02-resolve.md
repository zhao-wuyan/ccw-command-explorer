# Phase 2: Resolve — Map Steps to Executor Nodes

## Objective

Map each intent step from `intent.json` into a concrete executor node with assigned type, executor, and arg template.

## Workflow

### Step 2.1 — Load Intent

Read `design-session/intent.json`. Load steps[], variables{}.

### Step 2.2 — Map Each Step to Executor

For each step, determine the executor node using the Node Catalog (`specs/node-catalog.md`).

**Resolution algorithm**:
1. Match `type_hint` to executor candidates in catalog
2. If multiple candidates, select by semantic fit to step description
3. If no catalog match, emit `cli` node with inferred `--rule` and `--mode`

**Node type assignment**:

| Step type_hint | Default executor type | Default executor |
|----------------|----------------------|------------------|
| `planning` | skill | `workflow-lite-plan` (simple/medium) or `workflow-plan` (complex) |
| `execution` | skill | `workflow-execute` |
| `testing` | skill | `workflow-test-fix` |
| `review` | skill | `review-cycle` |
| `brainstorm` | skill | `brainstorm` |
| `analysis` | cli | `ccw cli --tool gemini --mode analysis` |
| `spec` | skill | `spec-generator` |
| `tdd` | skill | `workflow-tdd-plan` |
| `refactor` | command | `workflow:refactor-cycle` |
| `integration-test` | command | `workflow:integration-test-cycle` |
| `agent` | agent | (infer subagent_type from description) |
| `checkpoint` | checkpoint | — |

### Step 2.3 — Build Arg Templates

For each node, build `args_template` by substituting variable references:

```
skill node:   args_template = `{goal}`  (or `--session {prev_session}`)
cli node:     args_template = `PURPOSE: {goal}\nTASK: ...\nMODE: analysis\nCONTEXT: @**/*`
agent node:   args_template = `{goal}\nContext: {prev_output}`
```

**Context injection rules**:
- Planning nodes that follow analysis: inject `--context {prev_output_path}`
- Execution nodes that follow planning: inject `--resume-session {prev_session_id}`
- Testing nodes that follow execution: inject `--session {prev_session_id}`

Use `{prev_session_id}` and `{prev_output_path}` as runtime-resolved references — the executor will substitute these from node state at run time.

### Step 2.4 — Assign Parallel Groups

For steps with `parallel_with` set:
- Assign same `parallel_group` string to both nodes
- Parallel nodes share no data dependency (each gets same input)

### Step 2.5 — Write Output

Write `design-session/nodes.json`:
```json
{
  "session_id": "<WFD-id>",
  "nodes": [
    {
      "id": "N-001",
      "seq": 1,
      "name": "<step description shortened>",
      "type": "skill|cli|command|agent|checkpoint",
      "executor": "<skill name | cli command | agent subagent_type>",
      "args_template": "<template string with {variable} placeholders>",
      "input_ports": ["<port>"],
      "output_ports": ["<port>"],
      "parallel_group": null,
      "on_fail": "abort"
    }
  ]
}
```

## Success Criteria

- Every intent step has a corresponding node in nodes.json
- Every node has a non-empty executor and args_template
- Parallel groups correctly assigned where step.parallel_with is set
