# Session State Schema

## File Location

`.workflow/sessions/WFR-<slug>-<date>-<time>/session-state.json`

## Full Schema

```json
{
  "session_id": "WFR-feature-tdd-review-20260317-143022",
  "template_id": "wft-feature-tdd-review-20260310",
  "template_path": ".workflow/templates/feature-tdd-review.json",
  "template_name": "Feature TDD with Review",

  "status": "running | paused | completed | failed | aborted | archived",

  "context": {
    "goal": "Implement user authentication",
    "scope": "src/auth"
  },

  "execution_plan": [
    { "batch": 1, "nodes": ["N-001"], "parallel": false },
    { "batch": 2, "nodes": ["CP-01"], "parallel": false },
    { "batch": 3, "nodes": ["N-002"], "parallel": false },
    { "batch": 4, "nodes": ["CP-02"], "parallel": false },
    { "batch": 5, "nodes": ["N-003a", "N-003b"], "parallel": true },
    { "batch": 6, "nodes": ["N-004"], "parallel": false }
  ],

  "current_batch": 3,
  "current_node": "N-002",
  "last_checkpoint": "CP-01",

  "node_states": {
    "N-001": {
      "status": "completed",
      "started_at": "2026-03-17T14:30:25Z",
      "completed_at": "2026-03-17T14:35:10Z",
      "session_id": "WFS-plan-20260317",
      "output_path": ".workflow/sessions/WFS-plan-20260317/IMPL_PLAN.md",
      "artifacts": [
        ".workflow/sessions/WFS-plan-20260317/IMPL_PLAN.md"
      ],
      "error": null
    },
    "CP-01": {
      "status": "completed",
      "saved_at": "2026-03-17T14:35:12Z",
      "snapshot_path": ".workflow/sessions/WFR-feature-tdd-review-20260317-143022/checkpoints/CP-01.json",
      "auto_continue": true
    },
    "N-002": {
      "status": "running",
      "started_at": "2026-03-17T14:35:14Z",
      "completed_at": null,
      "session_id": null,
      "output_path": null,
      "artifacts": [],
      "error": null,
      "cli_task_id": "gem-143514-x7k2"
    },
    "CP-02": {
      "status": "pending",
      "saved_at": null,
      "snapshot_path": null
    },
    "N-003a": {
      "status": "pending",
      "started_at": null,
      "completed_at": null,
      "session_id": null,
      "output_path": null,
      "artifacts": [],
      "error": null
    },
    "N-003b": { "status": "pending", "..." : "..." },
    "N-004": { "status": "pending", "..." : "..." }
  },

  "created_at": "2026-03-17T14:30:22Z",
  "updated_at": "2026-03-17T14:35:14Z",
  "completed_at": null
}
```

## Status Values

| Status | Description |
|--------|-------------|
| `running` | Active execution in progress |
| `paused` | User paused at checkpoint — resume with `--resume` |
| `completed` | All nodes executed successfully |
| `failed` | A node failed and abort was chosen |
| `aborted` | User aborted at checkpoint |
| `archived` | Completed and moved to archive/ |

## Node State Status Values

| Status | Description |
|--------|-------------|
| `pending` | Not yet started |
| `running` | Currently executing (may be waiting for CLI callback) |
| `completed` | Successfully finished |
| `skipped` | Skipped due to `on_fail: skip` |
| `failed` | Execution error |

## Checkpoint Snapshot Schema

`.workflow/sessions/<wfr-id>/checkpoints/<CP-id>.json`:

```json
{
  "session_id": "WFR-<id>",
  "checkpoint_id": "CP-01",
  "checkpoint_name": "After Plan",
  "saved_at": "2026-03-17T14:35:12Z",
  "context_snapshot": { "goal": "...", "scope": "..." },
  "node_states_snapshot": { /* full node_states at this point */ },
  "last_completed_node": "N-001",
  "next_node": "N-002"
}
```

## Session Directory Structure

```
.workflow/sessions/WFR-<slug>-<date>-<time>/
+-- session-state.json       # Main state file, updated after every node
+-- checkpoints/             # Checkpoint snapshots
|   +-- CP-01.json
|   +-- CP-02.json
+-- artifacts/               # Optional: copies of key artifacts
    +-- N-001-output.md
```
