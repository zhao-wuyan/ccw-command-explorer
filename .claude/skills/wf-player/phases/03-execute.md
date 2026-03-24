# Phase 3: Execute Loop

## Objective

Execute each node batch in topological order. Use the correct mechanism per node type. Save state after every checkpoint. Support CLI serial-blocking with hook callback resume.

## Pre-execution: Runtime Reference Resolution

Before executing each node, resolve any `{N-xxx.field}` and `{prev_*}` references in `args_template`:

```
function resolveArgs(args_template, node_id, session_state):
  for each {ref} in args_template:
    if ref matches {variable}:
      replace with session_state.context[variable]
    if ref matches {N-001.session_id}:
      replace with session_state.node_states["N-001"].session_id
    if ref matches {N-001.output_path}:
      replace with session_state.node_states["N-001"].output_path
    if ref matches {prev_session_id}:
      find previous non-checkpoint node -> replace with its session_id
    if ref matches {prev_output}:
      find previous non-checkpoint node -> replace with its output_text
    if ref matches {prev_output_path}:
      find previous non-checkpoint node -> replace with its output_path
  return resolved_args
```

## Node Execution by Type

Read `specs/node-executor.md` for full details. Summary:

### skill node

```
resolved_args = resolveArgs(node.args_template, ...)
mark node status = "running", write session-state.json

result = Skill(skill=node.executor, args=resolved_args)

extract from result: session_id, output_path, artifacts[]
update node_states[node.id]:
  status = "completed"
  session_id = extracted_session_id
  output_path = extracted_output_path
  artifacts = extracted_artifacts
  completed_at = now()

write session-state.json
advance to next node
```

### command node

Same as skill node but executor is a namespaced command:
```
Skill(skill=node.executor, args=resolved_args)
```

### cli node — CRITICAL: serial blocking

```
resolved_args = resolveArgs(node.args_template, ...)
mark node status = "running", write session-state.json

Bash({
  command: `ccw cli -p "${resolved_args}" --tool ${node.cli_tool} --mode ${node.cli_mode} --rule ${node.cli_rule}`,
  run_in_background: true
})

write session-state.json  // persist "running" state
STOP — wait for hook callback
```

**Hook callback resumes here**:
```
// Called when ccw cli completes
load session-state.json
find node with status "running"
extract result: exec_id, output_path, cli_output
update node_states[node.id]:
  status = "completed"
  output_path = extracted_output_path
  completed_at = now()
write session-state.json
advance to next node
```

### agent node

```
resolved_args = resolveArgs(node.args_template, ...)
mark node status = "running", write session-state.json

result = Agent({
  subagent_type: node.executor,
  prompt: resolved_args,
  run_in_background: node.run_in_background ?? false,
  description: node.name
})

update node_states[node.id]:
  status = "completed"
  output_path = result.output_path or session_dir + "/artifacts/" + node.id + ".md"
  completed_at = now()
write session-state.json
advance to next node
```

**Parallel agent nodes** (same parallel_group):
```
// Launch all agents in parallel
for each node in parallel_batch:
  mark node status = "running"

  Agent({
    subagent_type: node.executor,
    prompt: resolveArgs(node.args_template, ...),
    run_in_background: true,  // parallel
    description: node.name
  })

// Wait for all to complete (Agent with run_in_background=false blocks — use team-coordinate pattern)
// team-coordinate: spawn as team-workers with callbacks if complex
// For simple parallel: use multiple Agent calls synchronously or use team-coordinate's spawn-and-stop
```

### checkpoint node

```
// Save snapshot
snapshot = {
  session_id: session_state.session_id,
  checkpoint_id: node.id,
  checkpoint_name: node.name,
  saved_at: now(),
  node_states_snapshot: session_state.node_states,
  last_completed_node: previous_node_id
}

write session-state.json (last_checkpoint = node.id)
write <session_dir>/checkpoints/<node.id>.json

if node.auto_continue == false:
  // Pause for user
  AskUserQuestion({
    questions: [{
      question: node.description + "\n\nReview checkpoint state and confirm to continue.",
      header: "Checkpoint: " + node.name,
      options: [
        { label: "Continue", description: "Proceed to next node" },
        { label: "Pause", description: "Save state and exit (resume later)" },
        { label: "Abort", description: "Stop execution" }
      ]
    }]
  })

  on "Pause":
    session_state.status = "paused"
    write session-state.json
    output "Session paused. Resume with: Skill(skill='wf-player', args='--resume <session_id>')"
    EXIT

  on "Abort":
    session_state.status = "aborted"
    write session-state.json
    EXIT

// auto_continue or user chose Continue
mark checkpoint status = "completed"
write session-state.json
advance to next node
```

## Progress Display

After each node completes, print progress:
```
[wf-player] [2/5] CP-01 checkpoint saved ✓
[wf-player] [3/5] N-002 workflow-execute ... running
```

## Error Handling

On node failure (exception or skill returning error state):

```
on_fail = node.on_fail || "abort"

if on_fail == "skip":
  mark node status = "skipped"
  log warning
  advance to next node

if on_fail == "retry":
  retry once
  if still fails: fall through to abort

if on_fail == "abort":
  AskUserQuestion:
    - Retry
    - Skip this node
    - Abort workflow
  handle choice accordingly
```

## Loop Termination

After last node in execution_plan completes:
- All node_states should be "completed" or "skipped"
- Proceed to Phase 4 (Complete)
