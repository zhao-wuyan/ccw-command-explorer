---
name: parallel-dev-cycle
description: Multi-agent parallel development cycle with requirement analysis, exploration planning, code development, and validation. Orchestration runs inline in main flow (no separate orchestrator agent). Supports continuous iteration with markdown progress documentation. Triggers on "parallel-dev-cycle".
allowed-tools: spawn_agent, wait_agent, send_message, assign_task, close_agent, request_user_input, Read, Write, Edit, Bash, Glob, Grep
---

# Parallel Dev Cycle

Multi-agent parallel development cycle using Codex subagent pattern with four specialized workers:
1. **Requirements Analysis & Extension** (RA) - Requirement analysis and self-enhancement
2. **Exploration & Planning** (EP) - Codebase exploration and implementation planning
3. **Code Development** (CD) - Code development with debug strategy support
4. **Validation & Archival Summary** (VAS) - Validation and archival summary

Orchestration logic (phase management, state updates, feedback coordination) runs **inline in the main flow** — no separate orchestrator agent is spawned. Only 4 worker agents are allocated.

Each agent **maintains one main document** (e.g., requirements.md, plan.json, implementation.md) that is completely rewritten per iteration, plus auxiliary logs (changes.log, debug-log.ndjson) that are append-only.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Input (Task)                        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             v
              ┌──────────────────────────────┐
              │  Main Flow (Inline Orchestration)  │
              │  Phase 1 → 2 → 3 → 4              │
              └──────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        v                    v                    v
    ┌────────┐         ┌────────┐         ┌────────┐
    │  RA    │         │  EP    │         │  CD    │
    │Agent   │         │Agent   │         │Agent   │
    └────────┘         └────────┘         └────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             v
                         ┌────────┐
                         │  VAS   │
                         │ Agent  │
                         └────────┘
                             │
                             v
              ┌──────────────────────────────┐
              │    Summary Report            │
              │  & Markdown Docs             │
              └──────────────────────────────┘
```

## Key Design Principles

1. **Main Document + Auxiliary Logs**: Each agent maintains one main document (rewritten per iteration) and auxiliary logs (append-only)
2. **Version-Based Overwrite**: Main documents completely rewritten per version; logs append-only
3. **Automatic Archival**: Old main document versions automatically archived to `history/` directory
4. **Complete Audit Trail**: Changes.log (NDJSON) preserves all change history
5. **Parallel Coordination**: Four agents launched simultaneously; coordination via shared state and inline main flow
6. **File References**: Use short file paths instead of content passing
7. **Self-Enhancement**: RA agent proactively extends requirements based on context
8. **Shared Discovery Board**: All agents share exploration findings via `discoveries.ndjson` — read on start, write as you discover, eliminating redundant codebase exploration

## Arguments

| Arg | Required | Description |
|-----|----------|-------------|
| TASK | One of TASK or --cycle-id | Task description (for new cycle, mutually exclusive with --cycle-id) |
| --cycle-id | One of TASK or --cycle-id | Existing cycle ID to continue (from API or previous session) |
| --extend | No | Extension description (only valid with --cycle-id) |
| --auto | No | Auto-cycle mode (run all phases sequentially without user confirmation) |
| --parallel | No | Number of parallel agents (default: 4, max: 4) |

## Auto Mode

When `--auto`: Run all phases sequentially without user confirmation between iterations. Use recommended defaults for all decisions. Automatically continue iteration loop until tests pass or max iterations reached.

## Prep Package Integration

When `prep-package.json` exists at `{projectRoot}/.workflow/.cycle/prep-package.json`, Phase 1 consumes it to:
- Use refined task description instead of raw TASK
- Apply auto-iteration config (convergence criteria, phase gates)
- Inject per-iteration agent focus directives (0→1 vs 1→100)

Prep packages are generated by the interactive prompt `/prompts:prep-cycle`. See [phases/00-prep-checklist.md](phases/00-prep-checklist.md) for schema.

## Execution Flow

```
Input Parsing:
   └─ Parse arguments (TASK | --cycle-id + --extend)
   └─ Convert to structured context (cycleId, state, progressDir)
   └─ Initialize progress tracking: functions.update_plan([...phases])

Phase 1: Session Initialization
   └─ Ref: phases/01-session-init.md
      ├─ Create new cycle OR resume existing cycle
      ├─ Initialize state file and directory structure
      └─ Output: cycleId, state, progressDir

Phase 2: Agent Execution (Parallel)
   └─ Ref: phases/02-agent-execution.md
      ├─ Tasks attached: Spawn RA → Spawn EP → Spawn CD → Spawn VAS → Wait all
      ├─ Spawn RA, EP, CD, VAS agents in parallel
      ├─ Wait for all agents with timeout handling
      └─ Output: agentOutputs (4 agent results)

Phase 3: Result Aggregation & Iteration
   └─ Ref: phases/03-result-aggregation.md
      ├─ Parse PHASE_RESULT from each agent
      ├─ Detect issues (test failures, blockers)
      ├─ Decision: Issues found AND iteration < max?
      │   ├─ Yes → Send feedback via assign_task, loop back to Phase 2
      │   └─ No → Proceed to Phase 4
      └─ Output: parsedResults, iteration status

Phase 4: Completion & Summary
   └─ Ref: phases/04-completion-summary.md
      ├─ Generate unified summary report
      ├─ Update final state
      ├─ Sync session state: $session-sync -y "Dev cycle complete: {iterations} iterations"
      ├─ Close all agents
      └─ Output: final cycle report with continuation instructions
```

**Phase Reference Documents** (read on-demand when phase executes):

| Phase | Document | Purpose |
|-------|----------|---------|
| 1 | [phases/01-session-init.md](phases/01-session-init.md) | Session creation/resume and state initialization |
| 2 | [phases/02-agent-execution.md](phases/02-agent-execution.md) | Parallel agent spawning and execution |
| 3 | [phases/03-result-aggregation.md](phases/03-result-aggregation.md) | Result parsing, feedback generation, iteration handling |
| 4 | [phases/04-completion-summary.md](phases/04-completion-summary.md) | Final summary generation and cleanup |

## Data Flow

```
User Input (TASK | --cycle-id + --extend)
    ↓
[Parse Arguments]
    ↓ cycleId, state, progressDir

Phase 1: Session Initialization
    ↓ cycleId, state, progressDir (initialized/resumed)

Phase 2: Agent Execution
    ├─ All agents read coordination/discoveries.ndjson on start
    ├─ Each agent explores → writes new discoveries to board
    ├─ Later-finishing agents benefit from earlier agents' findings
    ↓ agentOutputs {ra, ep, cd, vas} + shared discoveries.ndjson

Phase 3: Result Aggregation
    ↓ parsedResults, hasIssues, iteration count
    ↓ [Loop back to Phase 2 if issues and iteration < max]
    ↓ (discoveries.ndjson carries over across iterations)

Phase 4: Completion & Summary
    ↓ finalState, summaryReport

Return: cycle_id, iterations, final_state
```

## Session Structure

```
{projectRoot}/.workflow/.cycle/
├── {cycleId}.json                                 # Master state file
├── {cycleId}.progress/
    ├── ra/
    │   ├── requirements.md                        # Current version (complete rewrite)
    │   ├── changes.log                            # NDJSON complete history (append-only)
    │   └── history/                               # Archived snapshots
    ├── ep/
    │   ├── exploration.md                         # Codebase exploration report
    │   ├── architecture.md                        # Architecture design
    │   ├── plan.json                              # Structured task list (current version)
    │   ├── changes.log                            # NDJSON complete history
    │   └── history/
    ├── cd/
    │   ├── implementation.md                      # Current version
    │   ├── debug-log.ndjson                       # Debug hypothesis tracking
    │   ├── changes.log                            # NDJSON complete history
    │   └── history/
    ├── vas/
    │   ├── summary.md                             # Current version
    │   ├── changes.log                            # NDJSON complete history
    │   └── history/
    └── coordination/
        ├── discoveries.ndjson                     # Shared discovery board (all agents append)
        ├── timeline.md                            # Execution timeline
        └── decisions.log                          # Decision log
```

## State Management

Master state file: `{projectRoot}/.workflow/.cycle/{cycleId}.json`

```json
{
  "cycle_id": "cycle-v1-20260122T100000-abc123",
  "title": "Task title",
  "description": "Full task description",
  "status": "created | running | paused | completed | failed",
  "created_at": "ISO8601", "updated_at": "ISO8601",
  "max_iterations": 5, "current_iteration": 0,
  "agents": {
    "ra":  { "status": "idle | running | completed | failed", "output_files": [] },
    "ep":  { "status": "idle", "output_files": [] },
    "cd":  { "status": "idle", "output_files": [] },
    "vas": { "status": "idle", "output_files": [] }
  },
  "current_phase": "init | ra | ep | cd | vas | aggregation | complete",
  "completed_phases": [],
  "requirements": null, "plan": null, "changes": [], "test_results": null,
  "coordination": { "feedback_log": [], "blockers": [] }
}
```

**Recovery**: If state corrupted, rebuild from `.progress/` markdown files and changes.log.

## Progress Tracking

### Initialization (MANDATORY)

```javascript
// Initialize progress tracking after input parsing
functions.update_plan([
  { id: "phase-1", title: "Phase 1: Session Initialization", status: "in_progress" },
  { id: "phase-2", title: "Phase 2: Agent Execution", status: "pending" },
  { id: "phase-3", title: "Phase 3: Result Aggregation", status: "pending" },
  { id: "phase-4", title: "Phase 4: Completion & Summary", status: "pending" }
])
```

### Phase Transitions

```javascript
// After Phase 1 completes
functions.update_plan([
  { id: "phase-1", status: "completed" },
  { id: "phase-2", status: "in_progress" }
])

// After Phase 2 completes
functions.update_plan([
  { id: "phase-2", status: "completed" },
  { id: "phase-3", status: "in_progress" }
])

// After Phase 3 — iterate or complete
// If iterating back to Phase 2:
functions.update_plan([
  { id: "phase-3", status: "completed" },
  { id: "phase-2", title: "Phase 2: Agent Execution (Iteration N)", status: "in_progress" }
])
// If proceeding to Phase 4:
functions.update_plan([
  { id: "phase-3", status: "completed" },
  { id: "phase-4", status: "in_progress" }
])

// After Phase 4 completes
functions.update_plan([{ id: "phase-4", status: "completed" }])
```

## Versioning

- **1.0.0**: Initial cycle → **1.x.0**: Each iteration (minor bump)
- Each iteration: archive old → complete rewrite → append changes.log

```
Archive: copy requirements.md → history/requirements-v1.0.0.md
Rewrite: overwrite requirements.md with v1.1.0 (complete new content)
Append:  changes.log ← {"timestamp","version":"1.1.0","action":"update","description":"..."}
```

| Agent Output | Rewrite (per iteration) | Append-only |
|-------------|------------------------|-------------|
| RA | requirements.md | changes.log |
| EP | exploration.md, architecture.md, plan.json | changes.log |
| CD | implementation.md, issues.md | changes.log, debug-log.ndjson |
| VAS | summary.md, test-results.json | changes.log |

## Coordination Protocol

**Execution Order**: RA → EP → CD → VAS (dependency chain, all spawned in parallel but block on dependencies)

### Shared Discovery Board

All agents share a real-time discovery board at `coordination/discoveries.ndjson`. Each agent reads it on start and appends findings during work. This eliminates redundant codebase exploration.

**Lifecycle**:
- Created by the first agent to write a discovery (file may not exist initially)
- Carries over across iterations — never cleared or recreated
- Agents use Bash `echo '...' >> discoveries.ndjson` to append entries

**Format**: NDJSON, each line is a self-contained JSON with required top-level fields `ts`, `agent`, `type`, `data`:
```jsonl
{"ts":"2026-01-22T10:00:00+08:00","agent":"ra","type":"tech_stack","data":{"language":"TypeScript","framework":"Express","test":"Jest","build":"tsup"}}
```

**Discovery Types**:

| type | Dedup Key | Writers | Readers | Required `data` Fields |
|------|-----------|---------|---------|----------------------|
| `tech_stack` | singleton | RA | EP, CD, VAS | `language`, `framework`, `test`, `build` |
| `project_config` | `data.path` | RA | EP, CD | `path`, `key_deps[]`, `scripts{}` |
| `existing_feature` | `data.name` | RA, EP | CD | `name`, `files[]`, `summary` |
| `architecture` | singleton | EP | CD, VAS | `pattern`, `layers[]`, `entry` |
| `code_pattern` | `data.name` | EP, CD | CD, VAS | `name`, `description`, `example_file` |
| `integration_point` | `data.file` | EP | CD | `file`, `description`, `exports[]` |
| `similar_impl` | `data.feature` | EP | CD | `feature`, `files[]`, `relevance` |
| `code_convention` | singleton | CD | VAS | `naming`, `imports`, `formatting` |
| `utility` | `data.name` | CD | VAS | `name`, `file`, `usage` |
| `test_command` | singleton | CD, VAS | VAS, CD | `unit`, `integration`(opt), `coverage`(opt) |
| `test_baseline` | singleton | VAS | CD | `total`, `passing`, `coverage_pct`, `framework`, `config` |
| `test_pattern` | singleton | VAS | CD | `style`, `naming`, `fixtures` |
| `blocker` | `data.issue` | any | all | `issue`, `severity`, `impact` |

**Protocol Rules**:
1. Read board before own exploration → skip covered areas (if file doesn't exist, skip)
2. Write discoveries immediately via Bash `echo >>` → don't batch
3. Deduplicate — check existing entries; skip if same `type` + dedup key value already exists
4. Append-only — never modify or delete existing lines

### Agent → Main Flow Communication
```
PHASE_RESULT:
- phase: ra | ep | cd | vas
- status: success | failed | partial
- files_written: [list]
- summary: one-line summary
- issues: []
```

### Main Flow → Agent Communication

Feedback via `assign_task` (file refs + issue summary, never full content):
```
## FEEDBACK FROM [Source]
[Issue summary with file:line references]
## Reference
- File: .progress/vas/test-results.json (v1.0.0)
## Actions Required
1. [Specific fix]
```

**Rules**: Only main flow writes state file. Agents read state, write to own `.progress/{agent}/` directory only.

## Core Rules

1. **Start Immediately**: First action is `functions.update_plan` initialization, then Phase 1 execution
2. **Progressive Phase Loading**: Read phase docs ONLY when that phase is about to execute
3. **Parse Every Output**: Extract PHASE_RESULT data from each agent for next phase
4. **Auto-Continue**: After each phase, execute next pending phase automatically
5. **Track Progress**: Update `functions.update_plan` at each phase transition
6. **Single Writer**: Only main flow writes to master state file; agents report via PHASE_RESULT
7. **File References**: Pass file paths between agents, not content
8. **DO NOT STOP**: Continuous execution until all phases complete or max iterations reached

## Error Handling

| Error Type | Recovery |
|------------|----------|
| Agent timeout | assign_task requesting convergence, then retry |
| State corrupted | Rebuild from progress markdown files and changes.log |
| Agent failed | Re-spawn agent with previous context |
| Conflicting results | Main flow sends reconciliation request |
| Missing files | RA/EP agents identify and request clarification |
| Max iterations reached | Generate summary with remaining issues documented |

## Coordinator Checklist (Main Flow)

### Before Each Phase

- [ ] Read phase reference document
- [ ] Check current state for dependencies
- [ ] Update `functions.update_plan` with phase status

### After Each Phase

- [ ] Parse agent outputs (PHASE_RESULT)
- [ ] Update master state file
- [ ] Update `functions.update_plan` phase completion
- [ ] Determine next action (continue / iterate / complete)

## Reference Documents

| Document | Purpose |
|----------|---------|
| [roles/](roles/) | Agent role definitions (RA, EP, CD, VAS) |

## Usage

```bash
# Start new cycle
/parallel-dev-cycle TASK="Implement real-time notifications"

# Continue cycle
/parallel-dev-cycle --cycle-id=cycle-v1-20260122-abc123

# Iteration with extension
/parallel-dev-cycle --cycle-id=cycle-v1-20260122-abc123 --extend="Also add email notifications"

# Auto mode
/parallel-dev-cycle --auto TASK="Add OAuth authentication"
```
