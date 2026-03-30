# Command: Monitor

Handle all coordinator monitoring events: status checks, pipeline advancement, discussion loop control, and completion. Uses spawn_agent + wait_agent for synchronous coordination.

## Constants

| Key | Value |
|-----|-------|
| WORKER_AGENT | team_worker |
| MAX_DISCUSSION_ROUNDS_QUICK | 0 |
| MAX_DISCUSSION_ROUNDS_STANDARD | 1 |
| MAX_DISCUSSION_ROUNDS_DEEP | 5 |

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Session state | tasks.json | Yes |
| Trigger event | From Entry Router detection | Yes |
| Pipeline mode | From tasks.json `pipeline_mode` | Yes |
| Discussion round | From tasks.json `discussion_round` | Yes |

1. Load tasks.json for current state, `pipeline_mode`, `discussion_round`
2. Read tasks from tasks.json to get current task statuses
3. Identify trigger event type from Entry Router
4. Compute max discussion rounds from pipeline mode:

```
MAX_ROUNDS = pipeline_mode === 'deep' ? 5
           : pipeline_mode === 'standard' ? 1
           : 0
```

## Phase 3: Event Handlers

### handleCallback

Triggered when a worker completes (wait_agent returns).

1. Determine role from completed task prefix, then resolve completed tasks:

   **Role detection** (from task prefix):

   | Task Prefix | Role |
   |-------------|------|
   | `EXPLORE-*` | explorer |
   | `ANALYZE-*` | analyst |
   | `DISCUSS-*` | discussant |
   | `SYNTH-*` | synthesizer |

2. Mark task completed in tasks.json:

```
state.tasks[taskId].status = 'completed'
```

3. Record completion in session state via team_msg

4. **Role-specific post-completion logic**:

| Completed Role | Pipeline Mode | Post-Completion Action |
|---------------|---------------|------------------------|
| explorer | all | Log: exploration ready. Proceed to handleSpawnNext |
| analyst | all | Log: analysis ready. Proceed to handleSpawnNext |
| discussant | all | **Discussion feedback gate** (see below) |
| synthesizer | all | Proceed to handleComplete |

5. **Discussion Feedback Gate** (when discussant completes):

When a DISCUSS-* task completes, the coordinator collects user feedback BEFORE spawning the next task.

```
// Read current discussion_round from tasks.json
discussion_round = state.discussion_round || 0
discussion_round++

// Update tasks.json
state.discussion_round = discussion_round

// Check if discussion loop applies
IF pipeline_mode === 'quick':
    // No discussion in quick mode -- proceed to handleSpawnNext (SYNTH)
    -> handleSpawnNext

ELSE IF discussion_round >= MAX_ROUNDS:
    // Reached max rounds -- force proceed to synthesis
    Log: "Max discussion rounds reached, proceeding to synthesis"
    IF no SYNTH-001 task exists in tasks.json:
        Create SYNTH-001 task in tasks.json with deps on last DISCUSS task
    -> handleSpawnNext

ELSE:
    // Collect user feedback
    request_user_input({
      questions: [{
        question: "Discussion round <N> complete. What next?",
        header: "Discussion Feedback",
        multiSelect: false,
        options: [
          { label: "Continue deeper", description: "Current direction is good, go deeper" },
          { label: "Adjust direction", description: "Shift analysis focus" },
          { label: "Done", description: "Sufficient depth, proceed to synthesis" }
        ]
      }]
    })
```

6. **Feedback handling** (after request_user_input returns):

| Feedback | Action |
|----------|--------|
| "Continue deeper" | Create new DISCUSS-`<N+1>` task in tasks.json (pending, no deps). Record decision in discussion.md. Proceed to handleSpawnNext |
| "Adjust direction" | request_user_input for new focus. Create ANALYZE-fix-`<N>` task in tasks.json (pending). Create DISCUSS-`<N+1>` task (pending, deps: [ANALYZE-fix-`<N>`]). Record direction change in discussion.md. Proceed to handleSpawnNext |
| "Done" | Check if SYNTH-001 already exists in tasks.json: if yes, ensure deps is updated to reference last DISCUSS task; if no, create SYNTH-001 (pending, deps: [last DISCUSS]). Record decision in discussion.md. Proceed to handleSpawnNext |

**Dynamic task creation** -- add entries to tasks.json `tasks` object:

DISCUSS-N (subsequent round):
```json
{
  "DISCUSS-<NNN>": {
    "title": "Process discussion round <N>",
    "description": "PURPOSE: Process discussion round <N> | Success: Updated understanding\nTASK:\n  - Process previous round results\n  - Execute <type> discussion strategy\n  - Update discussion timeline\nCONTEXT:\n  - Session: <session-folder>\n  - Topic: <topic>\n  - Round: <N>\n  - Type: <deepen|direction-adjusted|specific-questions>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/discussions/discussion-round-<NNN>.json\n---\nInnerLoop: false",
    "role": "discussant",
    "prefix": "DISCUSS",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

ANALYZE-fix-N (direction adjustment):
```json
{
  "ANALYZE-fix-<N>": {
    "title": "Supplementary analysis with adjusted focus",
    "description": "PURPOSE: Supplementary analysis with adjusted focus | Success: New insights from adjusted direction\nTASK:\n  - Re-analyze from adjusted perspective: <adjusted_focus>\n  - Build on previous exploration findings\n  - Generate updated discussion points\nCONTEXT:\n  - Session: <session-folder>\n  - Topic: <topic>\n  - Type: direction-fix\n  - Adjusted focus: <adjusted_focus>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/analyses/analysis-fix-<N>.json\n---\nInnerLoop: false",
    "role": "analyst",
    "prefix": "ANALYZE",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

SYNTH-001 (created dynamically -- check existence first):
```javascript
// Guard: only create if SYNTH-001 doesn't exist yet in tasks.json
if (!state.tasks['SYNTH-001']) {
  state.tasks['SYNTH-001'] = {
    title: "Integrate all analysis into final conclusions",
    description: "PURPOSE: Integrate all analysis into final conclusions | Success: Executive summary with recommendations...",
    role: "synthesizer",
    prefix: "SYNTH",
    deps: ["<last-DISCUSS-task-id>"],
    status: "pending",
    findings: "",
    error: ""
  }
} else {
  // Always update deps to reference the last DISCUSS task
  state.tasks['SYNTH-001'].deps = ["<last-DISCUSS-task-id>"]
}
```

7. Record user feedback to decision_trail via team_msg:

```
mcp__ccw-tools__team_msg({
  operation: "log", session_id: sessionId, from: "coordinator",
  type: "state_update",
  data: { decision_trail_entry: {
    round: discussion_round,
    decision: feedback,
    context: "User feedback at discussion round N",
    timestamp: current ISO timestamp
  }}
})
```

8. Proceed to handleSpawnNext

### handleSpawnNext

Find and spawn the next ready tasks.

1. Read tasks.json, find tasks where:
   - Status is "pending"
   - All deps tasks have status "completed"

2. For each ready task, determine role from task prefix:

| Task Prefix | Role | Role Spec |
|-------------|------|-----------|
| `EXPLORE-*` | explorer | `<skill_root>/roles/explorer/role.md` |
| `ANALYZE-*` | analyst | `<skill_root>/roles/analyst/role.md` |
| `DISCUSS-*` | discussant | `<skill_root>/roles/discussant/role.md` |
| `SYNTH-*` | synthesizer | `<skill_root>/roles/synthesizer/role.md` |

3. Spawn team_worker for each ready task:

```javascript
// 1) Update status in tasks.json
state.tasks[taskId].status = 'in_progress'

// 2) Spawn worker
const agentId = spawn_agent({
  agent_type: "team_worker",
  task_name: taskId,  // e.g., "EXPLORE-001" — enables named targeting
  items: [
    { type: "text", text: `## Role Assignment
role: ${role}
role_spec: ${skillRoot}/roles/${role}/role.md
session: ${sessionFolder}
session_id: ${sessionId}
requirement: ${taskDescription}
agent_name: ${agentName}
inner_loop: false` },

    { type: "text", text: `## Current Task
- Task ID: ${taskId}
- Task: ${taskSubject}

Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 (task discovery, owner=${agentName}) -> role-spec Phase 2-4 -> built-in Phase 5 (report).` }
  ]
})

// 3) Track agent
state.active_agents[taskId] = { agentId, role, started_at: now }
```

After spawning all ready tasks:

```javascript
// 4) Batch wait — use task_name for stable targeting (v4)
const taskNames = Object.keys(state.active_agents)
const waitResult = wait_agent({ targets: taskNames, timeout_ms: 900000 })
if (waitResult.timed_out) {
  for (const taskId of taskNames) {
    state.tasks[taskId].status = 'timed_out'
    close_agent({ target: taskId })
    delete state.active_agents[taskId]
  }
} else {
  // 5) Collect results and update tasks.json
  for (const [taskId, agent] of Object.entries(state.active_agents)) {
    state.tasks[taskId].status = 'completed'
    close_agent({ target: taskId })  // Use task_name, not agentId
    delete state.active_agents[taskId]
  }
}
```

4. **Parallel spawn rules**:

| Mode | Stage | Spawn Behavior |
|------|-------|---------------|
| quick | All stages | One worker at a time (serial pipeline) |
| standard/deep | EXPLORE phase | Spawn all EXPLORE-001..N in parallel, wait_agent for all |
| standard/deep | ANALYZE phase | Spawn all ANALYZE-001..N in parallel, wait_agent for all |
| all | DISCUSS phase | One discussant at a time |
| all | SYNTH phase | One synthesizer |

**Cross-Agent Supplementary Context** (v4):

When spawning workers in a later pipeline phase, send upstream results as supplementary context to already-running workers:

```
// Example: Send exploration results to running analysts
send_message({
  target: "<running-agent-task-name>",
  items: [{ type: "text", text: `## Supplementary Context\n${upstreamFindings}` }]
})
// Note: send_message queues info without interrupting the agent's current work
```

Use `send_message` (not `assign_task`) for supplementary info that enriches but doesn't redirect the agent's current task.

5. **STOP** after processing -- wait for next event

### handleCheck

Output current pipeline status from tasks.json without advancing.

```
Pipeline Status (<mode> mode):
  [DONE]  EXPLORE-001  (explorer)     -> exploration-001.json
  [DONE]  EXPLORE-002  (explorer)     -> exploration-002.json
  [DONE]  ANALYZE-001  (analyst)      -> analysis-001.json
  [RUN]   ANALYZE-002  (analyst)      -> analyzing...
  [WAIT]  DISCUSS-001  (discussant)   -> blocked by ANALYZE-002
  [----]  SYNTH-001    (synthesizer)  -> blocked by DISCUSS-001

Discussion Rounds: 0/<max>
Pipeline Mode: <mode>
Session: <session-id>
```

Output status -- do NOT advance pipeline.

### handleResume

**Agent Health Check** (v4):
```
// Verify actual running agents match session state
const runningAgents = list_agents({})
// For each active_agent in tasks.json:
//   - If agent NOT in runningAgents -> agent crashed
//   - Reset that task to pending, remove from active_agents
// This prevents stale agent references from blocking the pipeline
```

Resume pipeline after user pause or interruption.

1. Audit tasks.json for inconsistencies:
   - Tasks stuck in "in_progress" -> reset to "pending"
   - Tasks with completed deps but still "pending" -> include in spawn list
2. Proceed to handleSpawnNext

### handleComplete

**Cleanup Verification** (v4):
```
// Verify all agents are properly closed
const remaining = list_agents({})
// If any team agents still running -> close_agent each
// Ensures clean session shutdown
```

Triggered when all pipeline tasks are completed.

**Completion check**:

| Mode | Completion Condition |
|------|---------------------|
| quick | EXPLORE-001 + ANALYZE-001 + SYNTH-001 all completed |
| standard | All EXPLORE + ANALYZE + DISCUSS-001 + SYNTH-001 completed |
| deep | All EXPLORE + ANALYZE + all DISCUSS-N + SYNTH-001 completed |

1. Verify all tasks completed in tasks.json. If any not completed, return to handleSpawnNext
2. If all completed, **inline-execute coordinator Phase 5** (report + completion action). Do NOT STOP here -- continue directly into Phase 5 within the same turn.

## Phase 4: State Persistence

After every handler execution **except handleComplete**:

1. Update tasks.json with current state:
   - `discussion_round`: current round count
   - `active_agents`: list of in-progress agents
2. Verify task list consistency (no orphan tasks, no broken dependencies)
3. **STOP** and wait for next event

> **handleComplete exception**: handleComplete does NOT STOP -- it transitions directly to coordinator Phase 5.

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Worker spawn fails | Retry once. If still fails, report to user via request_user_input: retry / skip / abort |
| Discussion loop exceeds max rounds | Force create SYNTH-001, proceed to synthesis |
| Synthesis fails | Report partial results from analyses and discussions |
| Pipeline stall (no ready + no running) | Check deps chains, report blockage to user |
| Missing task artifacts | Log warning, continue with available data |
