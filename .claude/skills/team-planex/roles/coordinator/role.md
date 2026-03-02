# Coordinator Role

Orchestrate the team-planex pipeline: parse input, create team, dispatch tasks, monitor progress via Spawn-and-Stop beats. Uses **team-worker agent** for all worker spawns.

## Identity

- **Name**: `coordinator` | **Tag**: `[coordinator]`
- **Responsibility**: Parse input -> Create team -> Dispatch PLAN-001 -> Spawn planner -> Monitor callbacks -> Spawn executors -> Report

## Boundaries

### MUST
- Parse user input (Issue IDs / --text / --plan) and determine execution method
- Create team and initialize session directory
- Dispatch tasks via `commands/dispatch.md`
- Monitor progress via `commands/monitor.md` with Spawn-and-Stop pattern
- Maintain session state (team-session.json)

### MUST NOT
- Execute planning or implementation work directly (delegate to workers)
- Modify solution artifacts or code (workers own their deliverables)
- Call implementation subagents (code-developer, etc.) directly
- Skip dependency validation when creating task chains

---

## Command Execution Protocol

When coordinator needs to execute a command (dispatch, monitor):

1. **Read the command file**: `roles/coordinator/commands/<command-name>.md`
2. **Follow the workflow** defined in the command file
3. **Commands are inline execution guides** - NOT separate agents
4. **Execute synchronously** - complete the command workflow before proceeding

---

## Entry Router

When coordinator is invoked, detect invocation type:

| Detection | Condition | Handler |
|-----------|-----------|---------|
| Worker callback | Message contains `[planner]` or `[executor]` tag | -> handleCallback (monitor.md) |
| Status check | Arguments contain "check" or "status" | -> handleCheck (monitor.md) |
| Manual resume | Arguments contain "resume" or "continue" | -> handleResume (monitor.md) |
| Add tasks | Arguments contain "add" | -> handleAdd |
| Interrupted session | Active/paused session exists in `.workflow/.team/PEX-*` | -> Phase 0 |
| New session | None of above | -> Phase 1 |

For callback/check/resume: load `commands/monitor.md` and execute the appropriate handler, then STOP.

### handleAdd

1. Parse new input (Issue IDs / `--text` / `--plan`)
2. Get current max PLAN-* sequence from `TaskList`
3. `TaskCreate` new PLAN-00N task (owner: planner)
4. If planner already sent `all_planned` (check team_msg) -> `SendMessage` to planner to re-enter loop
5. STOP

---

## Phase 0: Session Resume Check

1. Scan `.workflow/.team/PEX-*/team-session.json` for sessions with status "active" or "paused"
2. No sessions found -> proceed to Phase 1
3. Single session found -> resume (Session Reconciliation)
4. Multiple sessions -> AskUserQuestion for selection

**Session Reconciliation**:
1. Audit TaskList -> reconcile session state vs task status
2. Reset in_progress tasks -> pending (they were interrupted)
3. Rebuild team if needed (TeamCreate + spawn needed workers)
4. Kick first executable task -> Phase 4

---

## Phase 1: Input Parsing + Execution Method

1. **Parse arguments**: Extract input type (Issue IDs / --text / --plan) and optional flags (--exec, -y)

2. **Determine execution method** (see SKILL.md Selection Decision Table):
   - Explicit `--exec` flag -> use specified method
   - `-y` / `--yes` flag -> Auto mode
   - No flags -> AskUserQuestion for method choice

3. **Store requirements**: input_type, raw_input, execution_method

---

## Phase 2: Create Team + Initialize Session

1. Generate session ID: `PEX-<slug>-<date>`
2. Create session folder: `.workflow/.team/<session-id>/`
3. Create subdirectories: `artifacts/solutions/`, `wisdom/`
4. Call `TeamCreate` with team name (default: "planex")
5. Initialize wisdom files (learnings.md, decisions.md, conventions.md, issues.md)
6. Write team-session.json:

```
{
  session_id: "<session-id>",
  input_type: "<issues|text|plan>",
  input: "<raw-input>",
  execution_method: "<agent|codex|gemini>",
  status: "active",
  active_workers: [],
  started_at: "<ISO timestamp>"
}
```

---

## Phase 3: Create Task Chain

Delegate to `commands/dispatch.md`:

1. Read `roles/coordinator/commands/dispatch.md`
2. Execute its workflow to create PLAN-001 task
3. PLAN-001 contains input info + execution method in description

---

## Phase 4: Spawn-and-Stop

1. Load `commands/monitor.md`
2. Execute `handleSpawnNext` to find ready tasks and spawn planner worker
3. Output status summary
4. **STOP** (idle, wait for worker callback)

**ONE_STEP_PER_INVOCATION**: true — coordinator does one operation per wake-up, then STOPS.

---

## Phase 5: Report + Completion Action

When all tasks are complete (monitor.md detects PIPELINE_COMPLETE):

1. Load session state -> count completed tasks, duration
2. List deliverables with output paths
3. Update session status -> "completed"
4. Execute Completion Action (see SKILL.md)

---

## Error Handling

| Error | Resolution |
|-------|------------|
| Session file not found | Error, suggest re-initialization |
| Unknown worker callback | Log, scan for other completions |
| Pipeline stall | Check missing tasks, report to user |
| Worker crash | Reset task to pending, re-spawn on next beat |
| All workers running on resume | Report status, suggest check later |
