# Node Executor — Execution Mechanisms per Node Type

## Overview

Each node type uses a specific execution mechanism. This spec defines the exact invocation pattern.

## 1. skill node

**Mechanism**: `Skill()` tool — synchronous, blocks until complete.

```
Skill({
  skill: "<node.executor>",
  args: "<resolved_args>"
})
```

**Output extraction**: Parse Skill() result for:
- Session ID pattern: `WFS-[a-z]+-\d{8}` or `TC-[a-z]+-\d{8}`
- Output path: last `.md` or `.json` file path mentioned
- Artifacts: all file paths in output

**Session ID sources**:
- Explicit: "Session: WFS-plan-20260317" in output
- Implicit: first session-like ID in output

**Examples**:
```
// Planning skill
Skill({ skill: "workflow-lite-plan", args: "Implement user authentication" })

// Execute skill (with prior session)
Skill({ skill: "workflow-execute", args: "--resume-session WFS-plan-20260317" })

// Test skill (with prior session)
Skill({ skill: "workflow-test-fix", args: "--session WFS-exec-20260317" })
```

---

## 2. command node

**Mechanism**: `Skill()` tool with namespace command name — synchronous.

```
Skill({
  skill: "<node.executor>",  // e.g. "workflow:refactor-cycle"
  args: "<resolved_args>"
})
```

**Examples**:
```
Skill({ skill: "workflow:refactor-cycle", args: "Reduce coupling in auth module" })
Skill({ skill: "workflow:debug-with-file", args: "Login fails with 401 on valid tokens" })
Skill({ skill: "issue:discover", args: "" })
Skill({ skill: "issue:queue", args: "" })
```

---

## 3. cli node

**Mechanism**: `Bash()` with `run_in_background: true` — STOP after launch, resume via hook callback.

```
// Build command
const prompt = resolveArgs(node.args_template, ...)
const cmd = `ccw cli -p "${escapeForShell(prompt)}" --tool ${node.cli_tool} --mode ${node.cli_mode} --rule ${node.cli_rule}`

// Launch background
Bash({ command: cmd, run_in_background: true })

// Save CLI task ID to node state for hook matching
node_state.cli_task_id = <captured from stderr CCW_EXEC_ID>

// Write session-state.json
// STOP — do not proceed until hook callback fires
```

**Hook callback** (triggered when ccw cli completes):
```
// Identify which node was running (status = "running" with cli_task_id set)
// Extract from CLI output:
//   - output_path: file written by CLI
//   - cli_exec_id: from CCW_EXEC_ID
// Mark node completed
// Advance to next node
```

**CLI output escaping**:
```javascript
function escapeForShell(s) {
  // Use single quotes with escaped single quotes inside
  return "'" + s.replace(/'/g, "'\\''") + "'"
}
```

**Example**:
```
Bash({
  command: `ccw cli -p 'PURPOSE: Analyze auth module architecture\nTASK: • Review class structure • Check dependencies\nMODE: analysis\nCONTEXT: @src/auth/**/*\nEXPECTED: Architecture report with issues list\nCONSTRAINTS: Read only' --tool gemini --mode analysis --rule analysis-review-architecture`,
  run_in_background: true
})
```

---

## 4. agent node

**Mechanism**: `Agent()` tool.

Single agent (serial):
```
Agent({
  subagent_type: node.executor,       // "general-purpose" or "code-reviewer"
  prompt: resolveArgs(node.args_template, ...),
  run_in_background: false,           // blocks until complete
  description: node.name
})
```

Parallel agents (same parallel_group — use team-coordinate pattern):
```
// For 2-3 parallel agents: launch all with run_in_background: true
// Use SendMessage/callback or wait with sequential Skill() calls
// For complex parallel pipelines: delegate to team-coordinate

Skill({
  skill: "team-coordinate",
  args: "<description of parallel work>"
})
```

**Output extraction**:
- Agent output is usually the full response text
- Look for file paths in output for `output_path`

---

## 5. checkpoint node

**Mechanism**: Pure state management — no external calls unless `auto_continue: false`.

```
// 1. Write checkpoint snapshot
Write({
  file_path: "<session_dir>/checkpoints/<node.id>.json",
  content: JSON.stringify({
    session_id, checkpoint_id: node.id, checkpoint_name: node.name,
    saved_at: now(), context_snapshot: session_state.context,
    node_states_snapshot: session_state.node_states,
    last_completed_node: prev_node_id,
    next_node: next_node_id
  }, null, 2)
})

// 2. Update session state
session_state.last_checkpoint = node.id
node_states[node.id].status = "completed"
node_states[node.id].saved_at = now()
node_states[node.id].snapshot_path = checkpointPath

Write({ file_path: session_state_path, content: JSON.stringify(session_state, null, 2) })

// 3. If auto_continue = false: pause for user (see 03-execute.md)
// 4. If auto_continue = true: proceed immediately
```

---

## Context Passing Between Nodes

The runtime reference resolver in `03-execute.md` handles `{N-xxx.field}` substitution.

**Key resolved fields by node type**:

| Node type | Exposes | Referenced as |
|-----------|---------|---------------|
| skill | session_id | `{N-001.session_id}` |
| skill | output_path | `{N-001.output_path}` |
| skill | artifacts[0] | `{N-001.artifacts[0]}` |
| cli | output_path | `{N-001.output_path}` |
| agent | output_path | `{N-001.output_path}` |
| any | shorthand prev | `{prev_session_id}`, `{prev_output_path}` |

**Fallback**: If referenced field is null/empty, the args_template substitution results in empty string. The executor should handle gracefully (most skills default to latest session).
