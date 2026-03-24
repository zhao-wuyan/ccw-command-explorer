# Phase 3: Enrich — Inject Checkpoints + Build DAG

## Objective

Build the directed acyclic graph (DAG) with proper edges, auto-inject checkpoint nodes at phase boundaries, and finalize the context_schema.

## Workflow

### Step 3.1 — Load Nodes

Read `design-session/nodes.json`. Get nodes[] list.

### Step 3.2 — Build Sequential Edges

Start with a linear chain: N-001 → N-002 → N-003 → ...

For nodes with the same `parallel_group`:
- Remove edges between them
- Add fan-out from the last non-parallel node to all group members
- Add fan-in from all group members to the next non-parallel node

### Step 3.3 — Auto-Inject Checkpoint Nodes

Scan the edge list and inject a `checkpoint` node between edges that cross a phase boundary.

**Phase boundary detection rules** (inject checkpoint if ANY rule triggers):

| Rule | Condition |
|------|-----------|
| **Artifact boundary** | Source node has output_ports containing `plan`, `spec`, `analysis`, `review-findings` |
| **Execution gate** | Target node type is `skill` with executor containing `execute` |
| **Agent spawn** | Target node type is `agent` |
| **Long-running** | Target node executor is `workflow-plan`, `spec-generator`, `collaborative-plan-with-file` |
| **User-defined** | Intent step had `type_hint: checkpoint` |
| **Post-testing** | Source node executor contains `test-fix` or `integration-test` |

**Checkpoint node template**:
```json
{
  "id": "CP-<seq>",
  "name": "Checkpoint: <description>",
  "type": "checkpoint",
  "description": "<what was just completed>",
  "auto_continue": true,
  "save_fields": ["session_id", "artifacts", "output_path"]
}
```

Set `auto_continue: false` for checkpoints that:
- Precede a user-facing deliverable (spec, plan, review report)
- Are explicitly requested by the user ("pause and show me")

### Step 3.4 — Insert Checkpoint Edges

For each injected checkpoint CP-X between edge (A → B):
- Remove edge A → B
- Add edges: A → CP-X, CP-X → B

### Step 3.5 — Finalize context_schema

Aggregate all `{variable}` references found in nodes' args_template strings.

For each unique variable name found:
- Look up from `intent.json#variables` if already defined
- Otherwise infer: type=string, required=true, description="<variable name>"

Produce final `context_schema{}` map.

### Step 3.6 — Validate DAG

Check:
- No cycles (topological sort must succeed)
- No orphan nodes (every node reachable from start)
- Every non-start node has at least one incoming edge
- Every non-terminal node has at least one outgoing edge

On cycle detection: report error, ask user to resolve.

### Step 3.7 — Write Output

Write `design-session/dag.json`:
```json
{
  "session_id": "<WFD-id>",
  "nodes": [ /* all nodes including injected checkpoints */ ],
  "edges": [
    { "from": "N-001", "to": "CP-01" },
    { "from": "CP-01", "to": "N-002" }
  ],
  "checkpoints": ["CP-01", "CP-02"],
  "parallel_groups": { "<group-name>": ["N-003", "N-004"] },
  "context_schema": {
    "goal": { "type": "string", "required": true, "description": "..." }
  },
  "topological_order": ["N-001", "CP-01", "N-002"]
}
```

## Success Criteria

- dag.json exists and is valid (no cycles)
- At least one checkpoint exists (or user explicitly opted out)
- context_schema contains all variables referenced in args_templates
- topological_order covers all nodes
