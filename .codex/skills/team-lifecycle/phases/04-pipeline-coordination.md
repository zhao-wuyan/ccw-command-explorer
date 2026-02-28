# Phase 4: Pipeline Coordination

> **COMPACT PROTECTION**: This is an execution document. After context compression, phase instructions become summaries only. You MUST immediately re-read this file via `Read("~/.codex/skills/team-lifecycle/phases/04-pipeline-coordination.md")` before continuing. Never execute based on summaries.

## Objective

Execute the main spawn/wait/close coordination loop. This is the core phase where the orchestrator spawns agents for pipeline tasks, waits for results, processes outputs (including consensus severity routing), handles checkpoints, and advances the pipeline through fast-advance or sequential beats until all tasks complete.

---

## Input

| Input | Source | Required |
|-------|--------|----------|
| sessionDir | Phase 2/3 output | Yes |
| state | team-session.json (current) | Yes |
| state.pipeline | Task chain from Phase 3 | Yes |
| state.mode | Pipeline mode | Yes |
| state.execution | sequential or parallel | Yes |

---

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| SPEC_AGENT_TIMEOUT | 900000 (15 min) | Timeout for spec pipeline agents (analyst, writer, reviewer) |
| IMPL_AGENT_TIMEOUT | 1800000 (30 min) | Timeout for impl pipeline agents (executor, tester, planner) |
| CONVERGENCE_WAIT | 120000 (2 min) | Additional wait after sending convergence request |
| MAX_RETRIES_PER_TASK | 3 | Maximum retries for a failing task before escalation |
| MAX_GC_ROUNDS | 2 | Maximum QA-FE fix-retest iterations |
| ORPHAN_THRESHOLD | 300000 (5 min) | Time before orphaned in_progress task is reset |

---

## Execution Steps

### Step 4.1: Compute Ready Tasks

Read the state file and find all tasks that can be started.

```javascript
// Read current state
const state = JSON.parse(Read("<session-dir>/team-session.json"))

// Compute sets
const completedIds = state.pipeline
  .filter(t => t.status === "completed")
  .map(t => t.id)

const inProgressIds = state.pipeline
  .filter(t => t.status === "in_progress")
  .map(t => t.id)

const readyTasks = state.pipeline.filter(t =>
  t.status === "pending"
  && t.blocked_by.every(dep => completedIds.includes(dep))
)
```

**Decision table** (what to do with ready tasks):

| Ready Count | In-Progress Count | Action |
|-------------|-------------------|--------|
| 0 | >0 | Wait for running agents (enter wait loop) |
| 0 | 0 | Pipeline complete -> proceed to Phase 5 |
| 1 | 0 | Spawn single agent, enter wait loop |
| 1+ | 0 | Spawn all ready agents (parallel or sequential per config), enter wait loop |
| 1+ | >0 | Spawn ready agents alongside running, enter wait loop |

### Step 4.2: Checkpoint Check

Before spawning, check if a checkpoint was just reached.

```javascript
// Check if the most recently completed task has is_checkpoint_after = true
const justCompleted = state.pipeline.filter(t => t.status === "completed")
const lastCompleted = justCompleted[justCompleted.length - 1]

if (lastCompleted && lastCompleted.is_checkpoint_after
    && !state.checkpoints_hit.includes(lastCompleted.id)) {
  // Checkpoint reached
  state.checkpoints_hit.push(lastCompleted.id)
  // Write state
  // Output checkpoint message and pause
}
```

**Checkpoint behavior**:

| Checkpoint Task | Message | Resume Condition |
|----------------|---------|-----------------|
| QUALITY-001 | "SPEC PHASE COMPLETE. Review spec artifacts before proceeding to implementation. Type 'resume' to continue." | User types 'resume' |
| DISCUSS-006 HIGH | "Final sign-off blocked with HIGH severity. Review divergences and decide. Type 'resume' to proceed or 'revise' to create revision." | User command |

When paused at checkpoint:
1. Update state: `status = "paused"`
2. Write state file
3. Output checkpoint message
4. Yield -- orchestrator stops, waits for user

When user resumes from checkpoint:
1. Update state: `status = "active"`
2. Proceed to spawn ready tasks

### Step 4.3: Spawn Agents

For each ready task, spawn an agent using the agent spawn template.

```javascript
const spawnedAgents = []

for (const task of readyTasks) {
  // Determine timeout based on pipeline phase
  const timeout = isSpecTask(task.id) ? SPEC_AGENT_TIMEOUT : IMPL_AGENT_TIMEOUT

  // Build predecessor context
  const predecessorContext = task.blocked_by.map(depId => {
    const depTask = state.pipeline.find(t => t.id === depId)
    return `${depId}: ${depTask.artifact_path || "(no artifact)"}`
  }).join("\n")

  // Spawn agent
  const agentId = spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/${task.owner}.md (MUST read first)
2. Read session state: ${sessionDir}/team-session.json
3. Read wisdom files: ${sessionDir}/wisdom/*.md (if exists)

---

## Session
Session directory: ${sessionDir}
Task ID: ${task.id}
Pipeline mode: ${state.mode}

## Scope
${state.scope}

## Task
${task.description}

## InlineDiscuss
${task.inline_discuss || "none"}

## Dependencies (completed predecessors)
${predecessorContext || "(none - this is the first task)"}

## Constraints
- Only process ${task.id} (prefix: ${task.id.split('-')[0]}-*)
- All output prefixed with [${task.owner}] tag
- Write artifacts to ${sessionDir}/${getArtifactSubdir(task)}
- Read wisdom files for cross-task knowledge before starting
- After completion, append discoveries to wisdom files
- If InlineDiscuss is set, spawn discuss subagent after primary artifact creation
  (Read ~/.codex/agents/discuss-agent.md for protocol)
- If codebase exploration is needed, spawn explore subagent
  (Read ~/.codex/agents/explore-agent.md for protocol)

## Completion Protocol
When work is complete, output EXACTLY:

TASK_COMPLETE:
- task_id: ${task.id}
- status: <success | failed | partial>
- artifact: <path-to-primary-artifact>
- discuss_verdict: <consensus_reached | consensus_blocked | none>
- discuss_severity: <HIGH | MEDIUM | LOW | none>
- summary: <one-line summary>
`
  })

  // Record in state
  task.status = "in_progress"
  task.agent_id = agentId
  task.started_at = new Date().toISOString()

  spawnedAgents.push({ agentId, taskId: task.id, owner: task.owner, timeout })

  state.active_agents.push({
    agent_id: agentId,
    task_id: task.id,
    owner: task.owner,
    spawned_at: new Date().toISOString()
  })
}

// Update state file
state.updated_at = new Date().toISOString()
Write("<session-dir>/team-session.json", JSON.stringify(state, null, 2))
```

**Agent-to-artifact-subdirectory mapping** (`getArtifactSubdir`):

| Agent / Task Prefix | Subdirectory |
|---------------------|-------------|
| analyst / RESEARCH-* | spec/ |
| writer / DRAFT-* | spec/ |
| reviewer / QUALITY-* | spec/ |
| planner / PLAN-* | plan/ |
| executor / IMPL-* | (project root - code changes) |
| tester / TEST-* | qa/ |
| reviewer / REVIEW-* | qa/ |
| architect / ARCH-* | architecture/ |
| fe-developer / DEV-FE-* | (project root - code changes) |
| fe-qa / QA-FE-* | qa/ |

### Step 4.4: Wait Loop

Enter the main wait loop. Wait for all spawned agents, then process results.

```javascript
// Collect all active agent IDs
const activeAgentIds = spawnedAgents.map(a => a.agentId)

// Determine timeout (use the maximum among spawned agents)
const maxTimeout = Math.max(...spawnedAgents.map(a => a.timeout))

// Wait for all agents
const results = wait({ ids: activeAgentIds, timeout_ms: maxTimeout })
```

### Step 4.5: Timeout Handling

If any agent timed out, send convergence request and retry.

```javascript
if (results.timed_out) {
  for (const agent of spawnedAgents) {
    if (!results.status[agent.agentId]?.completed) {
      // Send convergence request
      send_input({
        id: agent.agentId,
        message: `
## TIMEOUT NOTIFICATION

Execution timeout reached for task ${agent.taskId}. Please:
1. Save all current progress to artifact files
2. Output TASK_COMPLETE with status: partial
3. Include summary of completed vs remaining work
`
      })
    }
  }

  // Wait additional convergence period
  const convergenceResults = wait({
    ids: activeAgentIds.filter(id => !results.status[id]?.completed),
    timeout_ms: CONVERGENCE_WAIT
  })

  // Merge results
  // Agents still not complete after convergence -> force close
  for (const agent of spawnedAgents) {
    const agentResult = results.status[agent.agentId]?.completed
      || convergenceResults.status?.[agent.agentId]?.completed

    if (!agentResult) {
      // Force close and mark as failed
      close_agent({ id: agent.agentId })
      handleTaskFailure(agent.taskId, "timeout after convergence request")
    }
  }
}
```

### Step 4.6: Process Agent Results

For each completed agent, extract TASK_COMPLETE data and update state.

```javascript
for (const agent of spawnedAgents) {
  const output = results.status[agent.agentId]?.completed
  if (!output) continue  // handled in timeout section

  // Parse TASK_COMPLETE from output
  const taskResult = parseTaskComplete(output)

  if (!taskResult) {
    // Malformed output - treat as partial success
    handleMalformedOutput(agent.taskId, output)
    continue
  }

  // Update task in state
  const task = state.pipeline.find(t => t.id === agent.taskId)
  task.status = taskResult.status === "failed" ? "failed" : "completed"
  task.artifact_path = taskResult.artifact
  task.discuss_verdict = taskResult.discuss_verdict
  task.discuss_severity = taskResult.discuss_severity
  task.completed_at = new Date().toISOString()

  // Remove from active agents
  state.active_agents = state.active_agents.filter(
    a => a.agent_id !== agent.agentId
  )

  // Add to completed
  if (task.status === "completed") {
    state.completed_tasks.push(task.id)
    state.tasks_completed++
  }

  // Close agent
  close_agent({ id: agent.agentId })

  // Route by consensus verdict
  if (taskResult.discuss_verdict === "consensus_blocked") {
    handleConsensusBlocked(task, taskResult)
  }
}

// Write updated state
state.updated_at = new Date().toISOString()
Write("<session-dir>/team-session.json", JSON.stringify(state, null, 2))
```

### Step 4.7: Consensus Severity Routing

Handle consensus_blocked results from agents with inline discuss.

```javascript
function handleConsensusBlocked(task, taskResult) {
  const severity = taskResult.discuss_severity

  switch (severity) {
    case "LOW":
      // Treat as consensus_reached with notes
      // No special action needed, proceed normally
      break

    case "MEDIUM":
      // Log warning to wisdom/issues.md
      appendToFile("<session-dir>/wisdom/issues.md",
        `\n## ${task.id} - Consensus Warning (MEDIUM)\n`
        + `Divergences: ${taskResult.divergences || "see discussion record"}\n`
        + `Action items: ${taskResult.action_items || "see discussion record"}\n`)
      // Proceed normally
      break

    case "HIGH":
      // Check if this is DISCUSS-006 (final sign-off)
      if (task.inline_discuss === "DISCUSS-006") {
        // Always pause for user decision
        state.status = "paused"
        state.checkpoints_hit.push(`${task.id}-DISCUSS-006-HIGH`)
        // Output will include pause message
        return  // Do not advance pipeline
      }

      // Check revision limit
      if (task.revision_count >= 1) {
        // Already revised once, escalate to user
        state.status = "paused"
        // Output escalation message
        return
      }

      // Create revision task
      const revisionTask = {
        id: `${task.id}-R1`,
        owner: task.owner,
        status: "pending",
        blocked_by: [],
        description: `Revision of ${task.id}: address consensus-blocked divergences.\n`
          + `Session: ${sessionDir}\n`
          + `Original artifact: ${task.artifact_path}\n`
          + `Divergences: ${taskResult.divergences || "see discussion record"}\n`
          + `Action items: ${taskResult.action_items || "see discussion record"}\n`
          + `InlineDiscuss: ${task.inline_discuss}`,
        inline_discuss: task.inline_discuss,
        agent_id: null,
        artifact_path: null,
        discuss_verdict: null,
        discuss_severity: null,
        started_at: null,
        completed_at: null,
        revision_of: task.id,
        revision_count: task.revision_count + 1,
        is_checkpoint_after: task.is_checkpoint_after
      }

      // Insert revision into pipeline (after the original task)
      const taskIndex = state.pipeline.findIndex(t => t.id === task.id)
      state.pipeline.splice(taskIndex + 1, 0, revisionTask)
      state.tasks_total++

      // Update dependent tasks: anything blocked_by task.id should now be blocked_by revision.id
      for (const t of state.pipeline) {
        const depIdx = t.blocked_by.indexOf(task.id)
        if (depIdx !== -1) {
          t.blocked_by[depIdx] = revisionTask.id
        }
      }

      // Track revision chain
      state.revision_chains[task.id] = revisionTask.id
      break
  }
}
```

### Step 4.8: GC Loop Handling (Frontend QA)

When QA-FE agent completes with verdict NEEDS_FIX:

```javascript
function handleGCLoop(qaTask, taskResult) {
  if (state.gc_loop_count >= MAX_GC_ROUNDS) {
    // Max rounds reached, stop loop
    // Output: "QA-FE max rounds reached. Latest report: <artifact-path>"
    return
  }

  state.gc_loop_count++
  const round = state.gc_loop_count + 1

  // Create DEV-FE-NNN (fix task)
  const devFeTask = {
    id: `DEV-FE-${String(round).padStart(3, '0')}`,
    owner: "fe-developer",
    status: "pending",
    blocked_by: [qaTask.id],
    description: `Frontend fix round ${round}: address QA findings.\n`
      + `Session: ${sessionDir}\n`
      + `QA Report: ${qaTask.artifact_path}\n`
      + `Scope: ${state.scope}`,
    inline_discuss: null,
    agent_id: null,
    artifact_path: null,
    discuss_verdict: null,
    discuss_severity: null,
    started_at: null,
    completed_at: null,
    revision_of: null,
    revision_count: 0,
    is_checkpoint_after: false
  }

  // Create QA-FE-NNN (retest task)
  const qaFeTask = {
    id: `QA-FE-${String(round).padStart(3, '0')}`,
    owner: "fe-qa",
    status: "pending",
    blocked_by: [devFeTask.id],
    description: `Frontend QA round ${round}: retest after fixes.\n`
      + `Session: ${sessionDir}\n`
      + `Scope: ${state.scope}`,
    inline_discuss: null,
    agent_id: null,
    artifact_path: null,
    discuss_verdict: null,
    discuss_severity: null,
    started_at: null,
    completed_at: null,
    revision_of: null,
    revision_count: 0,
    is_checkpoint_after: false
  }

  // Add to pipeline
  state.pipeline.push(devFeTask, qaFeTask)
  state.tasks_total += 2

  // Update downstream dependencies (e.g., REVIEW-001 blocked_by QA-FE-001 -> QA-FE-NNN)
  for (const t of state.pipeline) {
    const depIdx = t.blocked_by.indexOf(qaTask.id)
    if (depIdx !== -1 && t.id !== devFeTask.id) {
      t.blocked_by[depIdx] = qaFeTask.id
    }
  }
}
```

### Step 4.9: Fast-Advance Check

After processing all results, determine whether to fast-advance or yield.

```javascript
// Recompute ready tasks after processing
const newReadyTasks = state.pipeline.filter(t =>
  t.status === "pending"
  && t.blocked_by.every(dep =>
    state.pipeline.find(p => p.id === dep)?.status === "completed"
  )
)

const stillRunning = state.active_agents.length > 0
```

**Fast-advance decision table**:

| Ready Count | Still Running | Checkpoint Pending | Action |
|-------------|---------------|-------------------|--------|
| 0 | Yes | No | Yield, wait for running agents |
| 0 | No | No | Pipeline complete -> Phase 5 |
| 0 | No | Yes | Paused at checkpoint, yield |
| 1 | No | No | Fast-advance: spawn immediately, re-enter Step 4.3 |
| 1 | Yes | No | Spawn alongside running, re-enter wait loop |
| 2+ | Any | No | Spawn all ready (batch), re-enter wait loop |
| Any | Any | Yes | Paused at checkpoint, yield |

```javascript
if (state.status === "paused") {
  // Checkpoint or escalation - yield
  // Output pause message
  return
}

if (newReadyTasks.length === 0 && state.active_agents.length === 0) {
  // Pipeline complete
  // Proceed to Phase 5
  return "PIPELINE_COMPLETE"
}

if (newReadyTasks.length > 0) {
  // Fast-advance: loop back to Step 4.3 with new ready tasks
  readyTasks = newReadyTasks
  // Continue to Step 4.3 (spawn agents)
}

if (newReadyTasks.length === 0 && state.active_agents.length > 0) {
  // Wait for running agents
  // Re-enter Step 4.4 (wait loop)
}
```

### Step 4.10: Orphan Detection

When processing a resume command or between beats, check for orphaned tasks.

```javascript
function detectOrphans(state) {
  const now = Date.now()

  for (const task of state.pipeline) {
    if (task.status !== "in_progress") continue

    // Check if there is an active agent for this task
    const hasAgent = state.active_agents.some(a => a.task_id === task.id)

    if (!hasAgent) {
      // Task is in_progress but no agent is tracking it
      const elapsed = now - new Date(task.started_at).getTime()

      if (elapsed > ORPHAN_THRESHOLD) {
        // Orphaned task (likely fast-advance failure)
        task.status = "pending"
        task.agent_id = null
        task.started_at = null

        // Log to wisdom
        appendToFile("<session-dir>/wisdom/issues.md",
          `\n## Orphaned Task Reset: ${task.id}\n`
          + `Task was in_progress for ${Math.round(elapsed / 1000)}s with no active agent. Reset to pending.\n`)
      }
    }
  }
}
```

### Step 4.11: Status Output

After each beat cycle, output a status summary.

```
[orchestrator] Beat complete
  Completed this beat: <task-ids>
  Still running: <task-ids> (<agent-roles>)
  Ready to spawn: <task-ids>
  Progress: <completed>/<total> (<percent>%)
  Next action: <spawning | waiting | checkpoint-paused | pipeline-complete>
```

### Step 4.12: User Command Handling

During Phase 4, user may issue commands.

**`check` / `status`**:

```
Read state file -> output status graph (see orchestrator.md User Commands) -> yield
No pipeline advancement.
```

**`resume` / `continue`**:

```
Read state file
  +- status === "paused"?
  |   +- YES -> update status to "active" -> detectOrphans -> Step 4.1 (compute ready)
  |   +- NO  -> detectOrphans -> Step 4.1 (compute ready)
```

---

## Pipeline Execution Patterns

### Spec-only (6 linear beats)

```javascript
// Beat 1: RESEARCH-001 (analyst)
analyst = spawn_agent(analystPrompt)
result = wait([analyst]) -> close_agent(analyst)
// Process discuss result (DISCUSS-001)
// Fast-advance to beat 2

// Beat 2: DRAFT-001 (writer)
writer1 = spawn_agent(writerPromptForDRAFT001)
result = wait([writer1]) -> close_agent(writer1)
// Process discuss result (DISCUSS-002)
// Fast-advance to beat 3

// Beats 3-5: DRAFT-002, DRAFT-003, DRAFT-004 (same pattern)
// Each: spawn writer -> wait -> close -> process discuss -> fast-advance

// Beat 6: QUALITY-001 (reviewer)
reviewer = spawn_agent(reviewerPromptForQUALITY001)
result = wait([reviewer]) -> close_agent(reviewer)
// Process discuss result (DISCUSS-006)
// If full-lifecycle: CHECKPOINT -> pause for user
// If spec-only: PIPELINE_COMPLETE -> Phase 5
```

### Impl-only (3 beats with parallel window)

```javascript
// Beat 1: PLAN-001 (planner)
planner = spawn_agent(plannerPrompt)
result = wait([planner]) -> close_agent(planner)

// Beat 2: IMPL-001 (executor)
executor = spawn_agent(executorPrompt)
result = wait([executor]) -> close_agent(executor)

// Beat 3: TEST-001 || REVIEW-001 (parallel)
tester = spawn_agent(testerPrompt)
reviewer = spawn_agent(reviewerPrompt)
results = wait([tester, reviewer])  // batch wait
close_agent(tester)
close_agent(reviewer)
// PIPELINE_COMPLETE -> Phase 5
```

### Fullstack (4 beats with dual parallel)

```javascript
// Beat 1: PLAN-001
planner = spawn_agent(plannerPrompt)
result = wait([planner]) -> close_agent(planner)

// Beat 2: IMPL-001 || DEV-FE-001 (parallel)
executor = spawn_agent(executorPrompt)
feDev = spawn_agent(feDevPrompt)
results = wait([executor, feDev])
close_agent(executor)
close_agent(feDev)

// Beat 3: TEST-001 || QA-FE-001 (parallel)
tester = spawn_agent(testerPrompt)
feQa = spawn_agent(feQaPrompt)
results = wait([tester, feQa])
close_agent(tester)
close_agent(feQa)
// Handle GC loop if QA-FE verdict is NEEDS_FIX

// Beat 4: REVIEW-001 (sync barrier)
reviewer = spawn_agent(reviewerPrompt)
result = wait([reviewer]) -> close_agent(reviewer)
// PIPELINE_COMPLETE -> Phase 5
```

---

## Output

| Output | Type | Destination |
|--------|------|-------------|
| state (final) | Object | Updated in team-session.json throughout |
| Pipeline status | String | "PIPELINE_COMPLETE" or "PAUSED" |
| All task artifacts | Files | Written by agents to session subdirectories |

---

## Success Criteria

- All pipeline tasks reach "completed" status (or "partial" with user acknowledgment)
- State file reflects accurate pipeline status at all times
- Checkpoints are properly enforced (spec-to-impl transition)
- Consensus severity routing executed correctly
- GC loop respects maximum round limit
- No orphaned tasks at pipeline end
- All agents properly closed

---

## Error Handling

| Error | Detection | Resolution |
|-------|-----------|------------|
| Agent timeout | wait() returns timed_out | Send convergence via send_input, wait 2 min, force close |
| Agent crash | wait() returns error | Reset task to pending, respawn (max 3 retries) |
| 3+ retries on same task | retry_count in task state | Pause pipeline, report to user |
| Orphaned task | in_progress + no agent + elapsed > 5 min | Reset to pending, respawn |
| Malformed TASK_COMPLETE | parseTaskComplete returns null | Treat as partial, log warning |
| State file write conflict | Write error | Retry once, fail on second error |
| Pipeline stall | No ready + no running + has pending | Inspect blocked_by, report to user |
| DISCUSS-006 HIGH | Parsed from reviewer output | Always pause for user |
| Revision also blocked | Revision task returns HIGH | Pause, escalate to user |
| GC loop exceeded | gc_loop_count >= MAX_GC_ROUNDS | Stop loop, report QA state |

---

## Next Phase

When pipeline completes (all tasks done, no paused checkpoint), proceed to [Phase 5: Completion Report](05-completion-report.md).
