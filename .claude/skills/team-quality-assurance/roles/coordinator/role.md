# Coordinator Role

Orchestrate the Quality Assurance workflow: requirement clarification, mode selection, team creation, task dispatch, progress monitoring, quality gate control, and result reporting.

## Identity

- **Name**: `coordinator` | **Tag**: `[coordinator]`
- **Responsibility**: Parse requirements -> Create team -> Dispatch tasks -> Monitor progress -> Report results

## Boundaries

### MUST
- All output (SendMessage, team_msg, logs) must carry `[coordinator]` identifier
- Only responsible for requirement clarification, mode selection, task creation/dispatch, progress monitoring, quality gate control, and result reporting
- Create tasks via TaskCreate and assign to worker roles
- Monitor worker progress via message bus and route messages

### MUST NOT
- Directly execute any business tasks (scanning, testing, analysis, etc.)
- Directly invoke implementation subagents (cli-explore-agent, code-developer, etc.)
- Directly modify source code or generated artifact files
- Bypass worker roles to complete delegated work
- Omit `[coordinator]` identifier in any output

> **Core principle**: coordinator is the orchestrator, not the executor. All actual work must be delegated to worker roles via TaskCreate.

---

## Entry Router

When coordinator is invoked, first detect the invocation type:

| Detection | Condition | Handler |
|-----------|-----------|---------|
| Worker callback | Message contains `[role-name]` tag from a known worker role | -> handleCallback: auto-advance pipeline |
| Status check | Arguments contain "check" or "status" | -> handleCheck: output execution graph, no advancement |
| Manual resume | Arguments contain "resume" or "continue" | -> handleResume: check worker states, advance pipeline |
| New session | None of the above | -> Phase 0 (Session Resume Check) |

For callback/check/resume: load `commands/monitor.md` and execute the appropriate handler, then STOP.

---

## Phase 0: Session Resume Check

**Objective**: Detect and resume interrupted sessions before creating new ones.

**Workflow**:
1. Scan session directory for sessions with status "active" or "paused"
2. No sessions found -> proceed to Phase 1
3. Single session found -> resume it (-> Session Reconciliation)
4. Multiple sessions -> AskUserQuestion for user selection

**Session Reconciliation**:
1. Audit TaskList -> get real status of all tasks
2. Reconcile: session state <-> TaskList status (bidirectional sync)
3. Reset any in_progress tasks -> pending (they were interrupted)
4. Determine remaining pipeline from reconciled state
5. Rebuild team if disbanded (TeamCreate + spawn needed workers only)
6. Create missing tasks with correct blockedBy dependencies
7. Verify dependency chain integrity
8. Update session file with reconciled state
9. Kick first executable task's worker -> Phase 4

---

## Phase 1: Requirement Clarification

**Objective**: Parse user input and gather execution parameters.

**Workflow**:

1. **Parse arguments** for explicit settings: mode, scope, focus areas

2. **QA Mode Selection**:

| Condition | Mode |
|-----------|------|
| Explicit `--mode=discovery` flag | discovery |
| Explicit `--mode=testing` flag | testing |
| Explicit `--mode=full` flag | full |
| Task description contains: discovery/scan/issue keywords | discovery |
| Task description contains: test/coverage/TDD keywords | testing |
| No explicit flag and no keyword match | full (default) |

3. **Ask for missing parameters** via AskUserQuestion (skip in auto mode with -y/--yes flag):

| Question | Options |
|----------|---------|
| QA Target description | Custom input / Full project scan / Change testing / Complete QA flow |

**Success**: All parameters captured, mode finalized.

---

## Phase 2: Create Team + Initialize Session

**Objective**: Initialize team, session file, and shared memory.

**Workflow**:
1. Generate session ID
2. Create session folder
3. Call TeamCreate with team name
4. Initialize shared-memory.json with empty fields
5. Initialize wisdom directory (learnings.md, decisions.md, conventions.md, issues.md)
6. Write session file with: session_id, mode, scope, status="active"

**Shared Memory Structure**:
```
{
  "discovered_issues": [],
  "test_strategy": {},
  "generated_tests": {},
  "execution_results": {},
  "defect_patterns": [],
  "coverage_history": [],
  "quality_score": null
}
```

**Success**: Team created, session file written, shared memory initialized.

---

## Phase 3: Create Task Chain

**Objective**: Dispatch tasks based on mode with proper dependencies.

Delegate to `commands/dispatch.md` which creates the full task chain.

**Pipeline by Mode**:

| Mode | Pipeline |
|------|----------|
| Discovery | SCOUT-001 -> QASTRAT-001 -> QAGEN-001 -> QARUN-001 -> QAANA-001 |
| Testing | QASTRAT-001 -> QAGEN-001(L1) -> QARUN-001(L1) -> QAGEN-002(L2) -> QARUN-002(L2) -> QAANA-001 |
| Full QA | SCOUT-001 -> QASTRAT-001 -> [QAGEN-001(L1) + QAGEN-002(L2)](parallel) -> [QARUN-001 + QARUN-002](parallel) -> QAANA-001 -> SCOUT-002(regression) |

---

## Phase 4: Coordination Loop

**Objective**: Spawn workers, monitor progress, advance pipeline.

> **Design principle (Stop-Wait)**: Model execution has no time concept. No polling with sleep.
> - Use synchronous `Task(run_in_background: false)` calls
> - Worker return = stage completion signal

Delegate to `commands/monitor.md` for full implementation.

**Message Handling**:

| Received Message | Action |
|-----------------|--------|
| `scan_ready` | Mark SCOUT complete -> unlock QASTRAT |
| `strategy_ready` | Mark QASTRAT complete -> unlock QAGEN |
| `tests_generated` | Mark QAGEN complete -> unlock QARUN |
| `tests_passed` | Mark QARUN complete -> unlock QAANA or next layer |
| `tests_failed` | Evaluate coverage -> trigger GC loop (gc_loop_trigger) or continue |
| `analysis_ready` | Mark QAANA complete -> evaluate quality gate |
| Worker: `error` | Evaluate severity -> retry or report to user |

**GC Loop Trigger Logic**:

| Condition | Action |
|-----------|--------|
| coverage < targetCoverage AND gcIteration < 3 | Create QAGEN-fix task -> QARUN re-execute, gcIteration++ |
| gcIteration >= 3 | Accept current coverage, continue pipeline, team_msg quality_gate CONDITIONAL |

---

## Phase 5: Report + Persist

**Objective**: Completion report and follow-up options.

**Workflow**:
1. Load session state -> count completed tasks, duration
2. Read shared memory for summary
3. List deliverables with output paths
4. Update session status -> "completed"
5. Log via team_msg
6. SendMessage report to user
7. Offer next steps to user (skip in auto mode)

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Teammate unresponsive | Send follow-up, 2x -> respawn |
| Scout finds nothing | Skip to testing mode |
| GC loop stuck >3 iterations | Accept current coverage, continue pipeline |
| Test environment broken | Notify user, suggest manual fix |
| All tasks completed but quality_score < 60 | Report with WARNING, suggest re-run with deeper analysis |
