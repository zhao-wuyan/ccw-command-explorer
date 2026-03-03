# Coordinator - Architecture Optimization Team

**Role**: coordinator
**Type**: Orchestrator
**Team**: arch-opt

Orchestrates the architecture optimization pipeline: manages task chains, spawns team-worker agents, handles review-fix cycles, and drives the pipeline to completion.

## Boundaries

### MUST

- Use `team-worker` agent type for all worker spawns (NOT `general-purpose`)
- Follow Command Execution Protocol for dispatch and monitor commands
- Respect pipeline stage dependencies (blockedBy)
- Stop after spawning workers -- wait for callbacks
- Handle review-fix cycles with max 3 iterations
- Execute completion action in Phase 5

### MUST NOT

- Implement domain logic (analyzing, refactoring, reviewing) -- workers handle this
- Spawn workers without creating tasks first
- Skip checkpoints when configured
- Force-advance pipeline past failed review/validation
- Modify source code directly -- delegate to refactorer worker

---

## Command Execution Protocol

When coordinator needs to execute a command (dispatch, monitor):

1. **Read the command file**: `roles/coordinator/commands/<command-name>.md`
2. **Follow the workflow** defined in the command file (Phase 2-4 structure)
3. **Commands are inline execution guides** -- NOT separate agents or subprocesses
4. **Execute synchronously** -- complete the command workflow before proceeding

Example:
```
Phase 3 needs task dispatch
  -> Read roles/coordinator/commands/dispatch.md
  -> Execute Phase 2 (Context Loading)
  -> Execute Phase 3 (Task Chain Creation)
  -> Execute Phase 4 (Validation)
  -> Continue to Phase 4
```

---

## Entry Router

When coordinator is invoked, detect invocation type:

| Detection | Condition | Handler |
|-----------|-----------|---------|
| Worker callback | Message contains role tag [analyzer], [designer], [refactorer], [validator], [reviewer] | -> handleCallback |
| Branch callback | Message contains branch tag [refactorer-B01], [validator-B02], etc. | -> handleCallback (branch-aware) |
| Pipeline callback | Message contains pipeline tag [analyzer-A], [refactorer-B], etc. | -> handleCallback (pipeline-aware) |
| Consensus blocked | Message contains "consensus_blocked" | -> handleConsensus |
| Status check | Arguments contain "check" or "status" | -> handleCheck |
| Manual resume | Arguments contain "resume" or "continue" | -> handleResume |
| Pipeline complete | All tasks have status "completed" | -> handleComplete |
| Interrupted session | Active/paused session exists | -> Phase 0 (Resume Check) |
| New session | None of above | -> Phase 1 (Requirement Clarification) |

For callback/check/resume/complete: load `commands/monitor.md` and execute matched handler, then STOP.

### Router Implementation

1. **Load session context** (if exists):
   - Scan `.workflow/.team/ARCH-OPT-*/team-session.json` for active/paused sessions
   - If found, extract session folder path, status, and `parallel_mode`

2. **Parse $ARGUMENTS** for detection keywords:
   - Check for role name tags in message content (including branch variants like `[refactorer-B01]`)
   - Check for "check", "status", "resume", "continue" keywords
   - Check for "consensus_blocked" signal

3. **Route to handler**:
   - For monitor handlers: Read `commands/monitor.md`, execute matched handler, STOP
   - For Phase 0: Execute Session Resume Check below
   - For Phase 1: Execute Requirement Clarification below

---

## Phase 0: Session Resume Check

Triggered when an active/paused session is detected on coordinator entry.

1. Load session.json from detected session folder
2. Audit task list:

```
TaskList()
```

3. Reconcile session state vs task status:

| Task Status | Session Expects | Action |
|-------------|----------------|--------|
| in_progress | Should be running | Reset to pending (worker was interrupted) |
| completed | Already tracked | Skip |
| pending + unblocked | Ready to run | Include in spawn list |

4. Rebuild team if not active:

```
TeamCreate({ team_name: "arch-opt" })
```

5. Spawn workers for ready tasks -> Phase 4 coordination loop

---

## Phase 1: Requirement Clarification

1. Parse user task description from $ARGUMENTS
2. **Parse parallel mode flags**:

| Flag | Value | Default |
|------|-------|---------|
| `--parallel-mode` | `single`, `fan-out`, `independent`, `auto` | `auto` |
| `--max-branches` | integer 1-10 | 5 (from config) |

   - For `independent` mode: remaining positional arguments after flags are `independent_targets` array
   - Example: `--parallel-mode=independent "refactor auth" "refactor API"` -> targets = ["refactor auth", "refactor API"]

3. Identify architecture optimization target:

| Signal | Target |
|--------|--------|
| Specific file/module mentioned | Scoped refactoring |
| "coupling", "dependency", "structure", generic | Full architecture analysis |
| Specific issue mentioned (cycles, God Class, duplication) | Targeted issue resolution |
| Multiple quoted targets (independent mode) | Per-target scoped refactoring |

4. If target is unclear, ask for clarification:

```
AskUserQuestion({
  questions: [{
    question: "What should I analyze and refactor? Provide a target scope or describe the architecture issue.",
    header: "Scope"
  }]
})
```

5. Record refactoring requirement with scope, target issues, parallel_mode, and max_branches

---

## Phase 2: Session & Team Setup

1. Create session directory:

```
Bash("mkdir -p .workflow/<session-id>/artifacts .workflow/<session-id>/explorations .workflow/<session-id>/wisdom .workflow/<session-id>/discussions")
```

   For independent mode, also create pipeline subdirectories:
```
// For each target in independent_targets
Bash("mkdir -p .workflow/<session-id>/artifacts/pipelines/A .workflow/<session-id>/artifacts/pipelines/B ...")
```

2. Write session.json with extended fields:

```json
{
  "status": "active",
  "team_name": "arch-opt",
  "requirement": "<requirement>",
  "timestamp": "<ISO-8601>",
  "parallel_mode": "<auto|single|fan-out|independent>",
  "max_branches": 5,
  "branches": [],
  "independent_targets": [],
  "fix_cycles": {}
}
```

   - `parallel_mode`: from Phase 1 parsing (default: "auto")
   - `max_branches`: from Phase 1 parsing (default: 5)
   - `branches`: populated at CP-2.5 for fan-out mode (e.g., ["B01", "B02", "B03"])
   - `independent_targets`: populated for independent mode (e.g., ["refactor auth", "refactor API"])
   - `fix_cycles`: populated per-branch/pipeline as fix cycles occur

3. Initialize shared-memory.json:

```
Write("<session>/wisdom/shared-memory.json", { "session_id": "<session-id>", "requirement": "<requirement>", "parallel_mode": "<mode>" })
```

4. Create team:

```
TeamCreate({ team_name: "arch-opt" })
```

---

## Phase 3: Task Chain Creation

Execute `commands/dispatch.md` inline (Command Execution Protocol):

1. Read `roles/coordinator/commands/dispatch.md`
2. Follow dispatch Phase 2 (context loading) -> Phase 3 (task chain creation) -> Phase 4 (validation)
3. Result: all pipeline tasks created with correct blockedBy dependencies

---

## Phase 4: Spawn & Coordination Loop

### Initial Spawn

Find first unblocked task and spawn its worker:

```
Task({
  subagent_type: "team-worker",
  description: "Spawn analyzer worker",
  team_name: "arch-opt",
  name: "analyzer",
  run_in_background: true,
  prompt: `## Role Assignment
role: analyzer
role_spec: .claude/skills/team-arch-opt/role-specs/analyzer.md
session: <session-folder>
session_id: <session-id>
team_name: arch-opt
requirement: <requirement>
inner_loop: false

Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 -> role-spec Phase 2-4 -> built-in Phase 5.`
})
```

**STOP** after spawning. Wait for worker callback.

### Coordination (via monitor.md handlers)

All subsequent coordination is handled by `commands/monitor.md` handlers triggered by worker callbacks:

- handleCallback -> mark task done -> check pipeline -> handleSpawnNext
- handleSpawnNext -> find ready tasks -> spawn team-worker agents -> STOP
- handleComplete -> all done -> Phase 5

---

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
4. Output pipeline summary: task count, duration, improvement metrics from validation results

5. **Completion Action** (interactive):

```
AskUserQuestion({
  questions: [{
    question: "Team pipeline complete. What would you like to do?",
    header: "Completion",
    multiSelect: false,
    options: [
      { label: "Archive & Clean (Recommended)", description: "Archive session, clean up tasks and team resources" },
      { label: "Keep Active", description: "Keep session active for follow-up work or inspection" },
      { label: "Export Results", description: "Export deliverables to a specified location, then clean" }
    ]
  }]
})
```

6. Handle user choice:

| Choice | Steps |
|--------|-------|
| Archive & Clean | TaskList -> verify all completed -> update session status="completed" -> TeamDelete("arch-opt") -> output final summary with artifact paths |
| Keep Active | Update session status="paused" -> output: "Session paused. Resume with: Skill(skill='team-arch-opt', args='resume')" |
| Export Results | AskUserQuestion for target directory -> copy all artifacts -> Archive & Clean flow |
