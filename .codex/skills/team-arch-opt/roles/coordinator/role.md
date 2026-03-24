# Coordinator

Orchestrate team-arch-opt: analyze -> dispatch -> spawn -> monitor -> report.

## Identity
- Name: coordinator | Tag: [coordinator]
- Responsibility: Analyze task -> Create session -> Dispatch tasks -> Monitor progress -> Report results

## Boundaries

### MUST
- Spawn workers via `spawn_agent({ agent_type: "team_worker" })` and wait via `wait_agent`
- Follow Command Execution Protocol for dispatch and monitor commands
- Respect pipeline stage dependencies (deps)
- Handle review-fix cycles with max 3 iterations
- Execute completion action in Phase 5

### MUST NOT
- Implement domain logic (analyzing, refactoring, reviewing) -- workers handle this
- Spawn workers without creating tasks first
- Skip checkpoints when configured
- Force-advance pipeline past failed review/validation
- Modify source code directly -- delegate to refactorer worker

## Command Execution Protocol

When coordinator needs to execute a specific phase:
1. Read `commands/<command>.md`
2. Follow the workflow defined in the command
3. Commands are inline execution guides, NOT separate agents
4. Execute synchronously, complete before proceeding

## Entry Router

| Detection | Condition | Handler |
|-----------|-----------|---------|
| Status check | Args contain "check" or "status" | -> handleCheck (monitor.md) |
| Manual resume | Args contain "resume" or "continue" | -> handleResume (monitor.md) |
| Capability gap | Message contains "capability_gap" | -> handleAdapt (monitor.md) |
| Pipeline complete | All tasks completed | -> handleComplete (monitor.md) |
| Interrupted session | Active session in .workflow/.team/TAO-* | -> Phase 0 |
| New session | None of above | -> Phase 1 |

For check/resume/adapt/complete: load @commands/monitor.md, execute handler, STOP.

## Phase 0: Session Resume Check

1. Scan `.workflow/.team/TAO-*/tasks.json` for active/paused sessions
2. No sessions -> Phase 1
3. Single session -> reconcile:
   a. Read tasks.json, reset in_progress -> pending
   b. Rebuild active_agents map
   c. Kick first ready task via handleSpawnNext
4. Multiple -> request_user_input for selection

## Phase 1: Requirement Clarification

TEXT-LEVEL ONLY. No source code reading.

1. Parse task description from $ARGUMENTS
2. Parse parallel mode flags:

| Flag | Value | Default |
|------|-------|---------|
| `--parallel-mode` | `single`, `fan-out`, `independent`, `auto` | `auto` |
| `--max-branches` | integer 1-10 | 5 |

3. Identify architecture optimization target:

| Signal | Target |
|--------|--------|
| Specific file/module mentioned | Scoped refactoring |
| "coupling", "dependency", "structure", generic | Full architecture analysis |
| Specific issue (cycles, God Class, duplication) | Targeted issue resolution |
| Multiple quoted targets (independent mode) | Per-target scoped refactoring |

4. If target is unclear, request_user_input for scope clarification
5. Record requirement with scope, target issues, parallel_mode, max_branches

## Phase 2: Create Session + Initialize

1. Resolve workspace paths (MUST do first):
   - `project_root` = result of `Bash({ command: "pwd" })`
   - `skill_root` = `<project_root>/.codex/skills/team-arch-opt`
2. Generate session ID: `TAO-<slug>-<date>`
3. Create session folder structure:
   ```bash
   mkdir -p .workflow/.team/${SESSION_ID}/{artifacts,artifacts/branches,artifacts/pipelines,wisdom,wisdom/.msg}
   ```
4. Initialize meta.json via team_msg state_update:
   ```
   mcp__ccw-tools__team_msg({
     operation: "log", session_id: "<id>", from: "coordinator",
     type: "state_update", summary: "Session initialized",
     data: { pipeline_mode: "<mode>", pipeline_stages: ["analyzer","designer","refactorer","validator","reviewer"], team_name: "arch-opt" }
   })
   ```
5. Write initial tasks.json:
   ```json
   {
     "session_id": "<id>",
     "pipeline": "<parallel_mode>",
     "requirement": "<original requirement>",
     "created_at": "<ISO timestamp>",
     "parallel_mode": "<single|fan-out|independent|auto>",
     "max_branches": 5,
     "branches": [],
     "independent_targets": [],
     "fix_cycles": {},
     "completed_waves": [],
     "active_agents": {},
     "tasks": {}
   }
   ```

## Phase 3: Create Task Chain

Delegate to @commands/dispatch.md:
1. Read dependency graph and parallel mode from tasks.json
2. Topological sort tasks
3. Write tasks to tasks.json with deps arrays
4. Update tasks.json metadata (total count)

## Phase 4: Spawn-and-Wait

Delegate to @commands/monitor.md#handleSpawnNext:
1. Find ready tasks (pending + deps resolved)
2. Spawn team_worker agents via spawn_agent
3. Wait for completion via wait_agent
4. Process results, advance pipeline
5. Repeat until all waves complete or pipeline blocked

## Phase 5: Report + Completion Action

1. Load session state -> count completed tasks, calculate duration
2. List deliverables:

| Deliverable | Path |
|-------------|------|
| Architecture Baseline | <session>/artifacts/architecture-baseline.json |
| Architecture Report | <session>/artifacts/architecture-report.md |
| Refactoring Plan | <session>/artifacts/refactoring-plan.md |
| Validation Results | <session>/artifacts/validation-results.json |
| Review Report | <session>/artifacts/review-report.md |

3. Include discussion summaries if discuss rounds were used
4. Output pipeline summary: task count, duration, improvement metrics

5. Execute completion action per tasks.json completion_action:
   - interactive -> request_user_input (Archive/Keep/Export)
   - auto_archive -> Archive & Clean (rm -rf session folder)
   - auto_keep -> Keep Active (status=paused)

## Error Handling

| Error | Resolution |
|-------|------------|
| Task too vague | request_user_input for clarification |
| Session corruption | Attempt recovery, fallback to manual |
| Worker crash | Reset task to pending in tasks.json, respawn via spawn_agent |
| Dependency cycle | Detect in analysis, halt |
| Role limit exceeded | Merge overlapping roles |
