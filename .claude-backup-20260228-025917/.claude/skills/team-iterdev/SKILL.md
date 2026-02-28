---
name: team-iterdev
description: Unified team skill for iterative development team. All roles invoke this skill with --role arg for role-specific execution. Triggers on "team iterdev".
allowed-tools: TeamCreate(*), TeamDelete(*), SendMessage(*), TaskCreate(*), TaskUpdate(*), TaskList(*), TaskGet(*), Task(*), AskUserQuestion(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team IterDev

Iterative development team skill. Generator-Critic loops (developer<->reviewer, max 3 rounds), task ledger (task-ledger.json) for real-time progress, shared memory (cross-sprint learning), and dynamic pipeline selection for incremental delivery. All team members route via `--role=xxx`.

## Architecture

```
+-------------------------------------------------+
|  Skill(skill="team-iterdev")                    |
|  args="task description" or args="--role=xxx"   |
+-------------------+-----------------------------+
                    | Role Router
         +---- --role present? ----+
         | NO                      | YES
         v                         v
  Orchestration Mode         Role Dispatch
  (auto -> coordinator)      (route to role.md)
         |
    +----+----+----------+---------+---------+
    v         v          v         v         v
 coordinator architect developer tester  reviewer
```

## Role Router

### Input Parsing

Parse `$ARGUMENTS` to extract `--role`. If absent -> Orchestration Mode (auto route to coordinator).

### Role Registry

| Role | File | Task Prefix | Type | Compact |
|------|------|-------------|------|---------|
| coordinator | [roles/coordinator.md](roles/coordinator.md) | (none) | orchestrator | **MUST re-read after compression** |
| architect | [roles/architect.md](roles/architect.md) | DESIGN-* | pipeline | MUST re-read after compression |
| developer | [roles/developer.md](roles/developer.md) | DEV-* | pipeline | MUST re-read after compression |
| tester | [roles/tester.md](roles/tester.md) | VERIFY-* | pipeline | MUST re-read after compression |
| reviewer | [roles/reviewer.md](roles/reviewer.md) | REVIEW-* | pipeline | MUST re-read after compression |

> **COMPACT PROTECTION**: Role files are execution documents, not reference material. When context compression occurs and role instructions are reduced to summaries, you **MUST immediately `Read` the corresponding role.md to reload before continuing execution**. Never execute any Phase based on summaries alone.

### Dispatch

1. Extract `--role` from arguments
2. If no `--role` -> route to coordinator (Orchestration Mode)
3. Look up role in registry -> Read the role file -> Execute its phases

### Orchestration Mode

When invoked without `--role`, coordinator auto-starts. User just provides task description.

**Invocation**: `Skill(skill="team-iterdev", args="task description")`

**Lifecycle**:
```
User provides task description
  -> coordinator Phase 1-3: requirement clarification -> TeamCreate -> create task chain
  -> coordinator Phase 4: spawn first batch of workers (background) -> STOP
  -> Worker executes -> SendMessage callback -> coordinator advances next step
  -> Loop until pipeline complete -> Phase 5 report
```

**User Commands** (wake suspended coordinator):

| Command | Action |
|---------|--------|
| `check` / `status` | Output execution status diagram, do not advance |
| `resume` / `continue` | Check worker status, advance next step |

---

## Shared Infrastructure

The following templates apply to all worker roles. Each role.md only needs to write **Phase 2-4** role-specific logic.

### Worker Phase 1: Task Discovery (shared by all workers)

Each worker executes the same task discovery flow on startup:

1. Call `TaskList()` to get all tasks
2. Filter: subject matches this role's prefix + owner is this role + status is pending + blockedBy is empty
3. No tasks -> idle wait
4. Has tasks -> `TaskGet` for details -> `TaskUpdate` mark in_progress

**Resume Artifact Check** (prevent duplicate output after recovery):
- Check if this task's output artifact already exists
- Artifact complete -> skip to Phase 5 report completion
- Artifact incomplete or missing -> normal Phase 2-4 execution

### Worker Phase 5: Report (shared by all workers)

Standard report flow after task completion:

1. **Message Bus**: Call `mcp__ccw-tools__team_msg` to log message
   - Parameters: operation="log", team=<session-id>, from=<role>, to="coordinator", type=<message-type>, summary="[<role>] <summary>", ref=<artifact-path>
   - **NOTE**: `team` must be **session ID** (e.g., `TID-project-2026-02-27`), NOT team name. Extract from `Session:` field in task description.
   - **CLI fallback**: When MCP unavailable -> `ccw team log --team <session-id> --from <role> --to coordinator --type <type> --summary "[<role>] ..." --json`
2. **SendMessage**: Send result to coordinator (content and summary both with `[<role>]` prefix)
3. **TaskUpdate**: Mark task completed
4. **Loop**: Return to Phase 1 to check next task

### Role Isolation Rules

| Allowed | Prohibited |
|---------|------------|
| Process tasks with own prefix | Process other roles' prefix tasks |
| Read/write shared-memory.json (own fields) | Create tasks for other roles |
| SendMessage to coordinator | Communicate directly with other workers |

**Coordinator additional restrictions**: No direct code writing, no calling implementation-type subagents, no directly executing analysis/testing/review.

### Message Bus

Call `mcp__ccw-tools__team_msg` with: operation="log", team=<session-id>, from=<role>, to="coordinator", type=<type>, summary="[<role>] <summary>", ref="<file_path>"

**NOTE**: `team` must be **session ID** (e.g., `TID-project-2026-02-27`), NOT team name. Extract from `Session:` field in task description.

**CLI Fallback**: `ccw team log --team "<session-id>" --from "<role>" --to "coordinator" --type "<type>" --summary "<summary>" --json`

| Role | Message Types |
|------|---------------|
| coordinator | `sprint_started`, `gc_loop_trigger`, `sprint_complete`, `task_unblocked`, `error`, `shutdown`, `conflict_detected`, `conflict_resolved`, `resource_locked`, `resource_unlocked`, `resource_contention`, `rollback_initiated`, `rollback_completed`, `rollback_failed`, `dependency_mismatch`, `dependency_update_needed`, `context_checkpoint_saved`, `context_restored`, `user_feedback_received`, `tech_debt_identified` |
| architect | `design_ready`, `design_revision`, `error` |
| developer | `dev_complete`, `dev_progress`, `error` |
| tester | `verify_passed`, `verify_failed`, `fix_required`, `error` |
| reviewer | `review_passed`, `review_revision`, `review_critical`, `error` |

### Team Configuration

| Setting | Value |
|---------|-------|
| Team name | iterdev |
| Session directory | `.workflow/.team/IDS-{slug}-{date}/` |
| Shared memory file | shared-memory.json |
| Task ledger file | task-ledger.json |

---

## Coordinator Protocol Summary

The coordinator manages several operational protocols. Full implementations reside in [roles/coordinator.md](roles/coordinator.md). The tables below describe the behavioral contracts for each protocol.

> **NOTE**: These are behavioral specifications only. Full procedural logic, data format details, and edge case handling are defined in the coordinator role file.

### Resource Lock Protocol

Concurrency control for shared resources. Prevents multiple workers from modifying the same files simultaneously.

| Action | Trigger Condition | Coordinator Behavior |
|--------|-------------------|----------------------|
| Acquire lock | Worker requests exclusive access to a resource | Check `resource_locks` in shared-memory.json. If unlocked, record lock with task ID, timestamp, and holder role. Log `resource_locked` message. Return success. |
| Deny lock | Resource already locked by another task | Return failure with current holder's task ID. Log `resource_contention` message. Worker must wait or request alternative resource. |
| Release lock | Worker completes task or explicitly releases | Remove lock entry from `resource_locks`. Log `resource_unlocked` message to all workers. |
| Force release | Lock held beyond timeout (5 min) | Force-remove lock entry. Notify original holder and coordinator. Log warning. |
| Deadlock detection | Multiple tasks waiting on each other's locks | Abort youngest task, release its locks, notify coordinator. |

### Conflict Detection Protocol

Detects and resolves file-level conflicts between concurrent development tasks.

| Action | Trigger Condition | Coordinator Behavior |
|--------|-------------------|----------------------|
| Detect conflict | DEV task completes with changed files | Compare changed files against other in_progress/completed tasks in ledger. If overlap found, update task's `conflict_info` to status "detected" with conflicting file list. Log `conflict_detected` message. |
| Resolve conflict | Conflict detected requiring resolution | Set `conflict_info.resolution_strategy` (manual/auto_merge/abort). Create `{taskId}-fix-conflict` task assigned to developer. Log `conflict_resolved` message. |
| Skip (no conflict) | No file overlap with other tasks | No action needed, task proceeds normally. |

### Rollback Point Protocol

Manages state snapshots for safe recovery when tasks fail or produce undesirable results.

| Action | Trigger Condition | Coordinator Behavior |
|--------|-------------------|----------------------|
| Create rollback point | Task successfully completes a phase | Generate snapshot ID, record rollback procedure (default: `git revert HEAD`) and state reference in task's `rollback_info` in the ledger. |
| Execute rollback | Task failure or user-requested revert | Log `rollback_initiated`. Execute stored rollback procedure. On success, log `rollback_completed`. On failure, log `rollback_failed` with error details. |
| Validate snapshot | Before executing rollback | Verify snapshot ID exists and rollback procedure is valid. Abort with error if invalid. |

### Dependency Validation Protocol

Validates external dependencies (npm, pip, etc.) before task execution begins.

| Action | Trigger Condition | Coordinator Behavior |
|--------|-------------------|----------------------|
| Validate dependencies | Task startup with declared dependencies | For each dependency: check installed version against expected version range. Record results in task's `external_dependencies` array in ledger (status: ok/mismatch/missing). |
| Report mismatch | Any dependency has status mismatch or missing | Log `dependency_mismatch` message listing affected packages. Block task until resolved or user overrides. |
| Update notification | External dependency has important update available | Log `dependency_update_needed` message. Add to sprint backlog for consideration. |

### Checkpoint Management Protocol

Saves and restores task execution state for interruption recovery.

| Action | Trigger Condition | Coordinator Behavior |
|--------|-------------------|----------------------|
| Save checkpoint | Task reaches significant progress milestone | Store checkpoint in `task_checkpoints` in shared-memory.json with timestamp and state data pointer. Retain last 5 checkpoints per task. Log `context_checkpoint_saved`. |
| Restore checkpoint | Task resumes after interruption | Load latest checkpoint for task. Read state data from pointer path. Log `context_restored`. Return state data to worker. |
| Checkpoint not found | Resume requested but no checkpoints exist | Return failure with reason. Worker starts fresh from Phase 1. |

### User Feedback Protocol

Collects, categorizes, and tracks user feedback throughout the sprint.

| Action | Trigger Condition | Coordinator Behavior |
|--------|-------------------|----------------------|
| Receive feedback | User provides feedback (via AskUserQuestion or direct) | Create feedback item with ID (FB-xxx), severity, category, timestamp. Store in `user_feedback_items` in shared-memory.json (max 50 items). Log `user_feedback_received`. |
| Link to task | Feedback relates to specific task | Update feedback item's `source_task_id` and set status to "reviewed". |
| Triage feedback | New feedback with high/critical severity | Prioritize in next sprint planning. Create task if actionable. |

### Tech Debt Management Protocol

Identifies, tracks, and prioritizes technical debt discovered during development.

| Action | Trigger Condition | Coordinator Behavior |
|--------|-------------------|----------------------|
| Identify debt | Worker reports tech debt during development or review | Create debt item with ID (TD-xxx), category (code/design/test/documentation), severity, estimated effort. Store in `tech_debt_items` in shared-memory.json. Log `tech_debt_identified`. |
| Generate report | Sprint retrospective or user request | Aggregate debt items by severity and category. Report totals, open items, and in-progress items. |
| Prioritize debt | Sprint planning phase | Rank debt items by severity and priority. Recommend items for current sprint based on estimated effort and available capacity. |
| Resolve debt | Developer completes debt resolution task | Update debt item status to "resolved". Record resolution in sprint history. |

---

## Three-Pipeline Architecture

```
Patch (simple fix):
  DEV-001 -> VERIFY-001

Sprint (standard feature):
  DESIGN-001 -> DEV-001 -> [VERIFY-001 + REVIEW-001](parallel)

Multi-Sprint (large feature):
  Sprint 1: DESIGN-001 -> DEV-001 -> DEV-002(incremental) -> VERIFY-001 -> DEV-fix -> REVIEW-001
  Sprint 2: DESIGN-002(refined) -> DEV-003 -> VERIFY-002 -> REVIEW-002
  ...
```

### Generator-Critic Loop

developer <-> reviewer loop, max 3 rounds:

```
DEV -> REVIEW -> (if review.critical_count > 0 || review.score < 7)
              -> DEV-fix -> REVIEW-2 -> (if still issues) -> DEV-fix-2 -> REVIEW-3
              -> (max 3 rounds, then accept with warning)
```

### Multi-Sprint Dynamic Downgrade

If Sprint N metrics are strong (velocity >= expected, review avg >= 8), coordinator may downgrade Sprint N+1 from multi-sprint to sprint pipeline for efficiency.

### Cadence Control

**Beat Model**: Event-driven. Each beat = coordinator wakes -> processes -> spawns -> STOP.

```
Beat Cycle (single beat)
===========================================================
  Event                   Coordinator              Workers
-----------------------------------------------------------
  callback/resume --> +- handleCallback -+
                      |  mark completed   |
                      |  check pipeline   |
                      +- handleSpawnNext -+
                      |  find ready tasks |
                      |  spawn workers ---+--> [Worker A] Phase 1-5
                      |  (parallel OK)  --+--> [Worker B] Phase 1-5
                      +- STOP (idle) -----+         |
                                                    |
  callback <----------------------------------------+
  (next beat)              SendMessage + TaskUpdate(completed)
===========================================================
```

**Pipeline Beat Views**:

```
Patch (2 beats, strict serial)
----------------------------------------------------------
Beat  1         2
      |         |
      DEV -> VERIFY
      ^           ^
   pipeline    pipeline
    start       done

Sprint (3 beats, with parallel window)
----------------------------------------------------------
Beat  1         2              3
      |         |         +----+----+
      DESIGN -> DEV --> VERIFY // REVIEW    <- parallel window
                          +----+----+
                            pipeline
                             done

Multi-Sprint (N beats, iterative)
----------------------------------------------------------
Sprint 1:
Beat  1      2      3      4        5         6
      |      |      |      |   +----+----+    |
   DESIGN -> DEV -> DEV -> VERIFY // DEV-fix -> REVIEW
                    (incr)         (GC loop)

Sprint 2: (refined pipeline based on Sprint 1 metrics)
Beat  7      8      9         10
      |      |      |          |
   DESIGN -> DEV -> VERIFY -> REVIEW
```

**Checkpoints**:

| Trigger Condition | Location | Behavior |
|-------------------|----------|----------|
| GC loop exceeds max rounds | After REVIEW-3 | Stop iteration, accept with warning, record in shared memory |
| Sprint transition | End of Sprint N | Pause, retrospective, user confirms `resume` for Sprint N+1 |
| Pipeline stall | No ready + no running tasks | Check missing tasks, report blockedBy chain to user |

**Stall Detection** (coordinator `handleCheck`):

| Check | Condition | Resolution |
|-------|-----------|------------|
| Worker unresponsive | in_progress task with no callback | Report waiting task list, suggest user `resume` |
| Pipeline deadlock | No ready + no running + has pending | Inspect blockedBy dependency chain, report blockage |
| GC loop exceeded | DEV/REVIEW iteration > max_rounds (3) | Terminate loop, output latest review report |

---

## Task Metadata Registry

| Task ID | Role | Pipeline | Dependencies | Description |
|---------|------|----------|-------------|-------------|
| DESIGN-001 | architect | sprint/multi | (none) | Technical design and task breakdown |
| DEV-001 | developer | all | DESIGN-001 (sprint/multi) or (none for patch) | Code implementation |
| DEV-002 | developer | multi | DEV-001 | Incremental implementation |
| DEV-fix | developer | sprint/multi | REVIEW-* (GC loop trigger) | Fix issues from review |
| VERIFY-001 | tester | all | DEV-001 (or last DEV) | Test execution and fix cycles |
| REVIEW-001 | reviewer | sprint/multi | DEV-001 (or last DEV) | Code review and quality scoring |

---

## Wisdom Accumulation

Cross-sprint knowledge accumulation. Coordinator initializes `wisdom/` directory at session start. Equivalent to shared-memory sprint_history but structured for long-term learning.

**Directory**:
```
<session-folder>/wisdom/
+-- learnings.md      # Patterns and insights
+-- decisions.md      # Architecture and design decisions
+-- conventions.md    # Codebase conventions
+-- issues.md         # Known risks and issues
```

**Worker Loading** (Phase 2): Extract `Session: <path>` from task description, read wisdom directory files.
**Worker Contributing** (Phase 4/5): Write discoveries from current task into corresponding wisdom files.

**Shared Memory** (sprint-level learning, accumulated across sprints):

| Field | Purpose |
|-------|---------|
| `sprint_history[]` | Per-sprint: what_worked, what_failed, patterns_learned |
| `architecture_decisions[]` | Cross-sprint architecture decisions |
| `implementation_context[]` | Implementation patterns and context |
| `review_feedback_trends[]` | Review quality trends across sprints |
| `resource_locks{}` | Current resource lock state (see Resource Lock Protocol) |
| `task_checkpoints{}` | Task checkpoint data (see Checkpoint Management Protocol) |
| `user_feedback_items[]` | User feedback items (see User Feedback Protocol) |
| `tech_debt_items[]` | Tech debt tracking (see Tech Debt Management Protocol) |

---

## Task Ledger

Real-time tracking of all sprint task progress. Coordinator updates at each task state transition.

**Structure**:

| Field | Description |
|-------|-------------|
| `sprint_id` | Current sprint identifier |
| `sprint_goal` | Sprint objective |
| `tasks[]` | Array of task entries (see below) |
| `metrics` | Aggregated metrics: total, completed, in_progress, blocked, velocity |

**Task Entry Fields**:

| Field | Description |
|-------|-------------|
| `id` | Task identifier (e.g., DEV-001) |
| `title` | Task title |
| `owner` | Assigned role |
| `status` | pending / in_progress / completed / blocked |
| `started_at` / `completed_at` | Timestamps |
| `gc_rounds` | Generator-Critic iteration count |
| `review_score` | Reviewer score (null until reviewed) |
| `test_pass_rate` | Tester pass rate (null until tested) |
| `conflict_info` | Conflict state: status (none/detected/resolved), conflicting_files, resolution_strategy, resolved_by_task_id |
| `rollback_info` | Rollback state: snapshot_id, rollback_procedure, last_successful_state_id |
| `external_dependencies[]` | Dependency entries: name, version_range, actual_version, source, status (ok/mismatch/missing) |

---

## Coordinator Spawn Template

When coordinator spawns workers, use background mode (Spawn-and-Stop):

```
Task({
  subagent_type: "general-purpose",
  description: "Spawn <role> worker",
  team_name: <team-name>,
  name: "<role>",
  run_in_background: true,
  prompt: `You are team "<team-name>" <ROLE>.

## Primary Instruction
All your work must be executed by calling Skill to load role definition:
Skill(skill="team-iterdev", args="--role=<role>")

Current requirement: <task-description>
Session: <session-folder>

## Role Guidelines
- Only process <PREFIX>-* tasks, do not execute other roles' work
- All output must have [<role>] identifier prefix
- Communicate only with coordinator
- Do not use TaskCreate to create tasks for other roles
- Before each SendMessage, call mcp__ccw-tools__team_msg to log

## Workflow
1. Call Skill -> load role definition and execution logic
2. Follow role.md 5-Phase flow
3. team_msg + SendMessage result to coordinator
4. TaskUpdate completed -> check next task`
})
```

---

## Unified Session Directory

```
.workflow/.team/IDS-{slug}-{YYYY-MM-DD}/
+-- team-session.json
+-- shared-memory.json          # Cross-sprint learning
+-- task-ledger.json            # Real-time task progress ledger
+-- wisdom/                     # Cross-task knowledge accumulation
|   +-- learnings.md
|   +-- decisions.md
|   +-- conventions.md
|   +-- issues.md
+-- design/                     # Architect output
|   +-- design-001.md
|   +-- task-breakdown.json
+-- code/                       # Developer tracking
|   +-- dev-log.md
+-- verify/                     # Tester output
|   +-- verify-001.json
+-- review/                     # Reviewer output
    +-- review-001.md
```

## Session Resume

Coordinator supports `--resume` / `--continue` for interrupted sessions:

1. Scan `.workflow/.team/IDS-*/team-session.json` for active/paused sessions
2. Multiple matches -> AskUserQuestion for selection
3. Audit TaskList -> reconcile session state with task status
4. Reset in_progress -> pending (interrupted tasks)
5. Rebuild team and spawn needed workers only
6. Create missing tasks with correct blockedBy
7. Kick first executable task -> Phase 4 coordination loop

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown --role value | Error with available role list |
| Missing --role arg | Orchestration Mode -> coordinator |
| Role file not found | Error with expected path |
| GC loop exceeds 3 rounds | Accept with warning, record in shared memory |
| Sprint velocity drops below 50% | Coordinator alerts user, suggests scope reduction |
| Task ledger corrupted | Rebuild from TaskList state |
| Conflict detected | Update conflict_info, notify coordinator, create DEV-fix task |
| Resource lock timeout | Force release after 5 min, notify holder and coordinator |
| Rollback requested | Validate snapshot_id, execute rollback procedure, notify all |
| Deadlock detected | Abort youngest task, release its locks, notify coordinator |
| Dependency mismatch | Log mismatch, block task until resolved or user override |
| Checkpoint restore failure | Log error, worker restarts from Phase 1 |
