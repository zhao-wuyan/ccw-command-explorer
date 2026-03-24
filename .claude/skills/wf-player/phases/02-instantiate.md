# Phase 2: Instantiate — Init Session State

## Objective

Create the WFR session directory, initialize `session-state.json` with all nodes marked pending, compute topological execution order.

## Workflow

### Step 2.1 — Generate Session ID

```
session_id = "WFR-<template-slug>-<YYYYMMDD>-<HHmmss>"
session_dir = ".workflow/sessions/<session_id>/"
```

Create session directory.

### Step 2.2 — Topological Sort

Run topological sort on `template.nodes` + `template.edges`:

```
function topoSort(nodes, edges):
  build adjacency list from edges
  Kahn's algorithm (BFS from nodes with no incoming edges)
  return ordered node IDs
```

**Parallel group handling**: Nodes in the same `parallel_group` can execute concurrently. In topological order, keep them adjacent and mark them as a parallel batch.

Store `execution_plan`:
```json
[
  { "batch": 1, "nodes": ["N-001"], "parallel": false },
  { "batch": 2, "nodes": ["CP-01"], "parallel": false },
  { "batch": 3, "nodes": ["N-002a", "N-002b"], "parallel": true },
  { "batch": 4, "nodes": ["N-003"], "parallel": false }
]
```

### Step 2.3 — Init Node States

For each node in template:
```json
{
  "N-001": {
    "status": "pending",
    "started_at": null,
    "completed_at": null,
    "session_id": null,
    "output_path": null,
    "artifacts": [],
    "error": null
  }
}
```

Checkpoint nodes:
```json
{
  "CP-01": {
    "status": "pending",
    "saved_at": null,
    "snapshot_path": null
  }
}
```

### Step 2.4 — Write session-state.json

See `specs/state-schema.md` for full schema. Write to `<session_dir>/session-state.json`:

```json
{
  "session_id": "<WFR-id>",
  "template_id": "<template.template_id>",
  "template_path": "<path to template>",
  "template_name": "<template.name>",
  "status": "running",
  "context": { /* bound_context from Phase 1 */ },
  "execution_plan": [ /* batches */ ],
  "current_batch": 1,
  "current_node": "N-001",
  "last_checkpoint": null,
  "node_states": { /* all nodes as pending */ },
  "created_at": "<ISO>",
  "updated_at": "<ISO>"
}
```

### Step 2.5 — Show Execution Start Banner

```
[wf-player] ============================================
[wf-player] Starting: <template.name>
[wf-player] Session: <session_id>
[wf-player] Context: goal="<value>"
[wf-player]
[wf-player] Plan: <N> nodes, <C> checkpoints
[wf-player]   N-001 [skill]      workflow-lite-plan
[wf-player]   CP-01 [checkpoint] After Plan
[wf-player]   N-002 [skill]      workflow-execute
[wf-player] ============================================
```

## Success Criteria

- `<session_dir>/session-state.json` written
- `execution_plan` has valid topological order
- Status = "running"
