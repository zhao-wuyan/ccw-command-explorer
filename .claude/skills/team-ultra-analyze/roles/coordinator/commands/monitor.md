# Command: Monitor

Handle all coordinator monitoring events: worker callbacks, status checks, pipeline advancement, discussion loop control, and completion.

## Constants

| Key | Value |
|-----|-------|
| SPAWN_MODE | background |
| ONE_STEP_PER_INVOCATION | true |
| WORKER_AGENT | team-worker |
| MAX_DISCUSSION_ROUNDS_QUICK | 0 |
| MAX_DISCUSSION_ROUNDS_STANDARD | 1 |
| MAX_DISCUSSION_ROUNDS_DEEP | 5 |

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Session state | `<session>/session.json` | Yes |
| Task list | `TaskList()` | Yes |
| Trigger event | From Entry Router detection | Yes |
| Pipeline mode | From session.json `pipeline_mode` | Yes |
| Discussion round | From session.json `discussion_round` | Yes |

1. Load session.json for current state, `pipeline_mode`, `discussion_round`
2. Run `TaskList()` to get current task statuses
3. Identify trigger event type from Entry Router
4. Compute max discussion rounds from pipeline mode:

```
MAX_ROUNDS = pipeline_mode === 'deep' ? 5
           : pipeline_mode === 'standard' ? 1
           : 0
```

## Phase 3: Event Handlers

### handleCallback

Triggered when a worker sends completion message (via SendMessage callback).

1. Parse message to identify role and task ID:

| Message Pattern | Role Detection |
|----------------|---------------|
| `[explorer]` or task ID `EXPLORE-*` | explorer |
| `[analyst]` or task ID `ANALYZE-*` | analyst |
| `[discussant]` or task ID `DISCUSS-*` | discussant |
| `[synthesizer]` or task ID `SYNTH-*` | synthesizer |

2. Mark task as completed:

```
TaskUpdate({ taskId: "<task-id>", status: "completed" })
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

When a DISCUSS-* task completes, the coordinator collects user feedback BEFORE spawning the next task. This replaces any while-loop pattern.

```
// Read current discussion_round from session state
discussion_round = session.discussion_round || 0
discussion_round++

// Update session state
Update session.json: discussion_round = discussion_round

// Check if discussion loop applies
IF pipeline_mode === 'quick':
    // No discussion in quick mode -- proceed to handleSpawnNext (SYNTH)
    -> handleSpawnNext

ELSE IF discussion_round >= MAX_ROUNDS:
    // Reached max rounds -- force proceed to synthesis
    Log: "Max discussion rounds reached, proceeding to synthesis"
    IF no SYNTH-001 task exists:
        Create SYNTH-001 task blocked by last DISCUSS task
    -> handleSpawnNext

ELSE:
    // Collect user feedback
    AskUserQuestion({
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

6. **Feedback handling** (still inside handleCallback, after AskUserQuestion returns):

| Feedback | Action |
|----------|--------|
| "Continue deeper" | Create new DISCUSS-`<N+1>` task (pending, no blockedBy). Record decision in discussion.md. Proceed to handleSpawnNext |
| "Adjust direction" | AskUserQuestion for new focus. Create ANALYZE-fix-`<N>` task (pending). Create DISCUSS-`<N+1>` task (pending, blockedBy ANALYZE-fix-`<N>`). Record direction change in discussion.md. Proceed to handleSpawnNext |
| "Done" | Create SYNTH-001 task (pending, blockedBy last DISCUSS). Record decision in discussion.md. Proceed to handleSpawnNext |

**Dynamic task creation templates**:

DISCUSS-N (subsequent round):
```
TaskCreate({
  subject: "DISCUSS-<NNN>",
  description: "PURPOSE: Process discussion round <N> | Success: Updated understanding
TASK:
  - Process previous round results
  - Execute <type> discussion strategy
  - Update discussion timeline
CONTEXT:
  - Session: <session-folder>
  - Topic: <topic>
  - Round: <N>
  - Type: <deepen|direction-adjusted|specific-questions>
  - Shared memory: <session>/wisdom/.msg/meta.json
EXPECTED: <session>/discussions/discussion-round-<NNN>.json
---
InnerLoop: false"
})
TaskUpdate({ taskId: "DISCUSS-<NNN>", owner: "discussant" })
```

ANALYZE-fix-N (direction adjustment):
```
TaskCreate({
  subject: "ANALYZE-fix-<N>",
  description: "PURPOSE: Supplementary analysis with adjusted focus | Success: New insights from adjusted direction
TASK:
  - Re-analyze from adjusted perspective: <adjusted_focus>
  - Build on previous exploration findings
  - Generate updated discussion points
CONTEXT:
  - Session: <session-folder>
  - Topic: <topic>
  - Type: direction-fix
  - Adjusted focus: <adjusted_focus>
  - Shared memory: <session>/wisdom/.msg/meta.json
EXPECTED: <session>/analyses/analysis-fix-<N>.json
---
InnerLoop: false"
})
TaskUpdate({ taskId: "ANALYZE-fix-<N>", owner: "analyst" })
```

SYNTH-001 (created dynamically in deep mode):
```
TaskCreate({
  subject: "SYNTH-001",
  description: "PURPOSE: Integrate all analysis into final conclusions | Success: Executive summary with recommendations
TASK:
  - Load all exploration, analysis, and discussion artifacts
  - Extract themes, consolidate evidence, prioritize recommendations
  - Write conclusions and update discussion.md
CONTEXT:
  - Session: <session-folder>
  - Topic: <topic>
  - Upstream artifacts: explorations/*.json, analyses/*.json, discussions/*.json
  - Shared memory: <session>/wisdom/.msg/meta.json
EXPECTED: <session>/conclusions.json + discussion.md update
CONSTRAINTS: Pure integration, no new exploration
---
InnerLoop: false"
})
TaskUpdate({ taskId: "SYNTH-001", addBlockedBy: ["<last-DISCUSS-task-id>"], owner: "synthesizer" })
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

1. Scan task list for tasks where:
   - Status is "pending"
   - All blockedBy tasks have status "completed"

2. For each ready task, determine role from task prefix:

| Task Prefix | Role | Role Spec |
|-------------|------|-----------|
| `EXPLORE-*` | explorer | `.claude/skills/team-ultra-analyze/role-specs/explorer.md` |
| `ANALYZE-*` | analyst | `.claude/skills/team-ultra-analyze/role-specs/analyst.md` |
| `DISCUSS-*` | discussant | `.claude/skills/team-ultra-analyze/role-specs/discussant.md` |
| `SYNTH-*` | synthesizer | `.claude/skills/team-ultra-analyze/role-specs/synthesizer.md` |

3. Spawn team-worker for each ready task:

```
Agent({
  subagent_type: "team-worker",
  description: "Spawn <role> worker for <task-subject>",
  team_name: "ultra-analyze",
  name: "<agent-name>",
  run_in_background: true,
  prompt: `## Role Assignment
role: <role>
role_spec: .claude/skills/team-ultra-analyze/role-specs/<role>.md
session: <session-folder>
session_id: <session-id>
team_name: ultra-analyze
requirement: <task-description>
agent_name: <agent-name>
inner_loop: false

## Current Task
- Task ID: <task-id>
- Task: <task-subject>

Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 (task discovery, owner=<agent-name>) -> role-spec Phase 2-4 -> built-in Phase 5 (report).`
})
```

4. **Parallel spawn rules**:

| Mode | Stage | Spawn Behavior |
|------|-------|---------------|
| quick | All stages | One worker at a time (serial pipeline) |
| standard/deep | EXPLORE phase | Spawn all EXPLORE-001..N in parallel |
| standard/deep | ANALYZE phase | Spawn all ANALYZE-001..N in parallel |
| all | DISCUSS phase | One discussant at a time |
| all | SYNTH phase | One synthesizer |

5. **STOP** after spawning -- wait for next callback

### handleCheck

Output current pipeline status without advancing.

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

Resume pipeline after user pause or interruption.

1. Audit task list for inconsistencies:
   - Tasks stuck in "in_progress" -> reset to "pending"
   - Tasks with completed blockers but still "pending" -> include in spawn list
2. Proceed to handleSpawnNext

### handleComplete

Triggered when all pipeline tasks are completed.

**Completion check**:

| Mode | Completion Condition |
|------|---------------------|
| quick | EXPLORE-001 + ANALYZE-001 + SYNTH-001 all completed |
| standard | All EXPLORE + ANALYZE + DISCUSS-001 + SYNTH-001 completed |
| deep | All EXPLORE + ANALYZE + all DISCUSS-N + SYNTH-001 completed |

1. Verify all tasks completed. If any not completed, return to handleSpawnNext
2. If all completed, transition to coordinator Phase 5

## Phase 4: State Persistence

After every handler execution:

1. Update session.json with current state:
   - `discussion_round`: current round count
   - `last_event`: event type and timestamp
   - `active_tasks`: list of in-progress task IDs
2. Verify task list consistency (no orphan tasks, no broken dependencies)
3. **STOP** and wait for next event

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Worker callback but task not completed | Log warning, reset task to pending, include in next handleSpawnNext |
| Worker spawn fails | Retry once. If still fails, report to user via AskUserQuestion: retry / skip / abort |
| Discussion loop exceeds max rounds | Force create SYNTH-001, proceed to synthesis |
| Synthesis fails | Report partial results from analyses and discussions |
| Pipeline stall (no ready + no running) | Check blockedBy chains, report blockage to user |
| Missing task artifacts | Log warning, continue with available data |
