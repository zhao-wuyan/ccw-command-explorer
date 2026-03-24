# Workflow Template Schema

## File Location

`.workflow/templates/<slug>.json`

## Full Schema

```json
{
  "template_id": "wft-<slug>-<YYYYMMDD>",
  "name": "Human readable template name",
  "description": "Brief description of what this workflow achieves",
  "version": "1.0",
  "created_at": "2026-03-17T10:00:00Z",
  "source_session": "WFD-<slug>-<date>",
  "tags": ["feature", "medium"],

  "context_schema": {
    "goal": {
      "type": "string",
      "required": true,
      "description": "Main task goal or feature to implement"
    },
    "scope": {
      "type": "string",
      "required": false,
      "description": "Target file or module scope",
      "default": "src/**/*"
    }
  },

  "nodes": [
    {
      "id": "N-001",
      "name": "Plan Feature",
      "type": "skill",
      "executor": "workflow-lite-plan",
      "args_template": "{goal}",
      "input_ports": ["requirement"],
      "output_ports": ["plan"],
      "parallel_group": null,
      "on_fail": "abort"
    },
    {
      "id": "CP-01",
      "name": "Checkpoint: After Plan",
      "type": "checkpoint",
      "description": "Plan artifact saved before execution proceeds",
      "auto_continue": true,
      "save_fields": ["session_id", "artifacts", "output_path"]
    },
    {
      "id": "N-002",
      "name": "Execute Implementation",
      "type": "skill",
      "executor": "workflow-execute",
      "args_template": "--resume-session {N-001.session_id}",
      "input_ports": ["plan"],
      "output_ports": ["code"],
      "parallel_group": null,
      "on_fail": "abort"
    },
    {
      "id": "CP-02",
      "name": "Checkpoint: Before Testing",
      "type": "checkpoint",
      "description": "Implementation complete, ready for test validation",
      "auto_continue": true,
      "save_fields": ["session_id", "artifacts"]
    },
    {
      "id": "N-003",
      "name": "Run Tests",
      "type": "skill",
      "executor": "workflow-test-fix",
      "args_template": "--session {N-002.session_id}",
      "input_ports": ["code"],
      "output_ports": ["test-passed"],
      "parallel_group": null,
      "on_fail": "abort"
    }
  ],

  "edges": [
    { "from": "N-001", "to": "CP-01" },
    { "from": "CP-01", "to": "N-002" },
    { "from": "N-002", "to": "CP-02" },
    { "from": "CP-02", "to": "N-003" }
  ],

  "checkpoints": ["CP-01", "CP-02"],

  "atomic_groups": [
    {
      "name": "planning-execution",
      "nodes": ["N-001", "CP-01", "N-002"],
      "description": "Plan must be followed by execution"
    }
  ],

  "execution_mode": "serial",

  "metadata": {
    "node_count": 3,
    "checkpoint_count": 2,
    "estimated_duration": "20-40 min"
  }
}
```

## Node Type Definitions

### `skill` node
```json
{
  "id": "N-<seq>",
  "name": "<descriptive name>",
  "type": "skill",
  "executor": "<skill-name>",
  "args_template": "<string with {variable} and {prev-node-id.field} refs>",
  "input_ports": ["<port-name>"],
  "output_ports": ["<port-name>"],
  "parallel_group": "<group-name> | null",
  "on_fail": "abort | skip | retry"
}
```

### `cli` node
```json
{
  "id": "N-<seq>",
  "name": "<descriptive name>",
  "type": "cli",
  "executor": "ccw cli",
  "cli_tool": "gemini | qwen | codex",
  "cli_mode": "analysis | write",
  "cli_rule": "<rule-template-name>",
  "args_template": "PURPOSE: {goal}\nTASK: ...\nMODE: analysis\nCONTEXT: @**/*\nEXPECTED: ...\nCONSTRAINTS: ...",
  "input_ports": ["analysis-topic"],
  "output_ports": ["analysis"],
  "parallel_group": null,
  "on_fail": "abort"
}
```

### `command` node
```json
{
  "id": "N-<seq>",
  "name": "<descriptive name>",
  "type": "command",
  "executor": "workflow:refactor-cycle",
  "args_template": "{goal}",
  "input_ports": ["codebase"],
  "output_ports": ["refactored-code"],
  "parallel_group": null,
  "on_fail": "abort"
}
```

### `agent` node
```json
{
  "id": "N-<seq>",
  "name": "<descriptive name>",
  "type": "agent",
  "executor": "general-purpose",
  "args_template": "Task: {goal}\n\nContext from previous step:\n{prev_output}",
  "input_ports": ["requirement"],
  "output_ports": ["analysis"],
  "parallel_group": "<group-name> | null",
  "run_in_background": false,
  "on_fail": "abort"
}
```

### `checkpoint` node
```json
{
  "id": "CP-<seq>",
  "name": "Checkpoint: <description>",
  "type": "checkpoint",
  "description": "<what was just completed, what comes next>",
  "auto_continue": true,
  "save_fields": ["session_id", "artifacts", "output_path"]
}
```

## Runtime Reference Syntax

In `args_template` strings, these references are resolved at execution time by `wf-player`:

| Reference | Resolves To |
|-----------|-------------|
| `{variable}` | Value from context (bound at run start) |
| `{N-001.session_id}` | `node_states["N-001"].session_id` |
| `{N-001.output_path}` | `node_states["N-001"].output_path` |
| `{N-001.artifacts[0]}` | First artifact from N-001 |
| `{prev_session_id}` | session_id of the immediately preceding work node |
| `{prev_output}` | Full output text of the immediately preceding node |
| `{prev_output_path}` | Output file path of the immediately preceding node |
