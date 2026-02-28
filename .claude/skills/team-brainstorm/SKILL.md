---
name: team-brainstorm
description: Unified team skill for brainstorming team. All roles invoke this skill with --role arg for role-specific execution. Triggers on "team brainstorm".
allowed-tools: TeamCreate(*), TeamDelete(*), SendMessage(*), TaskCreate(*), TaskUpdate(*), TaskList(*), TaskGet(*), Task(*), AskUserQuestion(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team Brainstorm

Unified team skill: multi-angle brainstorming via Generator-Critic loops, shared memory, and dynamic pipeline selection. All team members invoke with `--role=xxx` to route to role-specific execution.

## Architecture

```
┌───────────────────────────────────────────────────┐
│  Skill(skill="team-brainstorm")                    │
│  args="<topic>" or args="--role=xxx"               │
└───────────────────┬───────────────────────────────┘
                    │ Role Router
         ┌──── --role present? ────┐
         │ NO                      │ YES
         ↓                         ↓
  Orchestration Mode         Role Dispatch
  (auto → coordinator)      (route to role.md)
         │
    ┌────┴────┬───────────┬───────────┬───────────┐
    ↓         ↓           ↓           ↓           ↓
┌──────────┐┌─────────┐┌──────────┐┌──────────┐┌─────────┐
│coordinator││ ideator ││challenger││synthesizer││evaluator│
│          ││ IDEA-*  ││CHALLENGE-*││ SYNTH-*  ││ EVAL-*  │
└──────────┘└─────────┘└──────────┘└──────────┘└─────────┘
```

## Role Router

### Input Parsing

Parse `$ARGUMENTS` to extract `--role`. If absent → Orchestration Mode (auto route to coordinator).

### Role Registry

| Role | File | Task Prefix | Type | Compact |
|------|------|-------------|------|---------|
| coordinator | [roles/coordinator.md](roles/coordinator.md) | (none) | orchestrator | **⚠️ 压缩后必须重读** |
| ideator | [roles/ideator.md](roles/ideator.md) | IDEA-* | pipeline | 压缩后必须重读 |
| challenger | [roles/challenger.md](roles/challenger.md) | CHALLENGE-* | pipeline | 压缩后必须重读 |
| synthesizer | [roles/synthesizer.md](roles/synthesizer.md) | SYNTH-* | pipeline | 压缩后必须重读 |
| evaluator | [roles/evaluator.md](roles/evaluator.md) | EVAL-* | pipeline | 压缩后必须重读 |

> **⚠️ COMPACT PROTECTION**: 角色文件是执行文档，不是参考资料。当 context compression 发生后，角色指令仅剩摘要时，**必须立即 `Read` 对应 role.md 重新加载后再继续执行**。不得基于摘要执行任何 Phase。

### Dispatch

1. Extract `--role` from arguments
2. If no `--role` → route to coordinator (Orchestration Mode)
3. Look up role in registry → Read the role file → Execute its phases

### Orchestration Mode

When invoked without `--role`, coordinator auto-starts. User just provides topic description.

**Invocation**: `Skill(skill="team-brainstorm", args="<topic-description>")`

**Lifecycle**:
```
User provides topic description
  → coordinator Phase 1-3: Topic clarification → TeamCreate → Create task chain
  → coordinator Phase 4: spawn first batch workers (background) → STOP
  → Worker executes → SendMessage callback → coordinator advances next step
  → Loop until pipeline complete → Phase 5 report
```

**User Commands** (wake paused coordinator):

| Command | Action |
|---------|--------|
| `check` / `status` | Output execution status graph, no advancement |
| `resume` / `continue` | Check worker states, advance next step |

---

## Shared Infrastructure

The following templates apply to all worker roles. Each role.md only needs to write **Phase 2-4** role-specific logic.

### Worker Phase 1: Task Discovery (shared by all workers)

Every worker executes the same task discovery flow on startup:

1. Call `TaskList()` to get all tasks
2. Filter: subject matches this role's prefix + owner is this role + status is pending + blockedBy is empty
3. No tasks → idle wait
4. Has tasks → `TaskGet` for details → `TaskUpdate` mark in_progress

**Resume Artifact Check** (prevent duplicate output after resume):
- Check whether this task's output artifact already exists
- Artifact complete → skip to Phase 5 report completion
- Artifact incomplete or missing → normal Phase 2-4 execution

### Worker Phase 5: Report (shared by all workers)

Standard reporting flow after task completion:

1. **Message Bus**: Call `mcp__ccw-tools__team_msg` to log message
   - Parameters: operation="log", team=**<session-id>**, from=<role>, to="coordinator", type=<message-type>, summary="[<role>] <summary>", ref=<artifact-path>
   - **CLI fallback**: When MCP unavailable → `ccw team log --team <session-id> --from <role> --to coordinator --type <type> --summary "[<role>] ..." --json`
   - **Note**: `team` must be session ID (e.g., `BRS-xxx-date`), NOT team name. Extract from `Session:` field in task description.
2. **SendMessage**: Send result to coordinator (content and summary both prefixed with `[<role>]`)
3. **TaskUpdate**: Mark task completed
4. **Loop**: Return to Phase 1 to check next task

### Wisdom Accumulation (all roles)

Cross-task knowledge accumulation. Coordinator creates `wisdom/` directory at session initialization.

**Directory**:
```
<session-folder>/wisdom/
├── learnings.md      # Patterns and insights
├── decisions.md      # Architecture and design decisions
├── conventions.md    # Codebase conventions
└── issues.md         # Known risks and issues
```

**Worker Load** (Phase 2): Extract `Session: <path>` from task description, read wisdom directory files.
**Worker Contribute** (Phase 4/5): Write this task's discoveries to corresponding wisdom files.

### Role Isolation Rules

| Allowed | Forbidden |
|---------|-----------|
| Process tasks with own prefix | Process tasks with other role prefixes |
| SendMessage to coordinator | Communicate directly with other workers |
| Read/write shared-memory.json (own fields) | Create tasks for other roles |
| Delegate to commands/ files | Modify resources outside own responsibility |

Coordinator additional restrictions: Do not generate ideas directly, do not evaluate/challenge ideas, do not execute analysis/synthesis, do not bypass workers.

### Output Tagging

All outputs must carry `[role_name]` prefix in both SendMessage content/summary and team_msg summary.

### Message Bus (All Roles)

Every SendMessage **before**, must call `mcp__ccw-tools__team_msg` to log:

**Parameters**: operation="log", team=**<session-id>**, from=<role>, to="coordinator", type=<message-type>, summary="[<role>] <summary>", ref=<artifact-path>

**CLI fallback**: When MCP unavailable → `ccw team log --team <session-id> --from <role> --to coordinator --type <type> --summary "[<role>] ..." --json`

**Note**: `team` must be session ID (e.g., `BRS-xxx-date`), NOT team name. Extract from `Session:` field in task description.

**Message types by role**:

| Role | Types |
|------|-------|
| coordinator | `pipeline_selected`, `gc_loop_trigger`, `task_unblocked`, `error`, `shutdown` |
| ideator | `ideas_ready`, `ideas_revised`, `error` |
| challenger | `critique_ready`, `error` |
| synthesizer | `synthesis_ready`, `error` |
| evaluator | `evaluation_ready`, `error` |

### Shared Memory

All roles read in Phase 2 and write in Phase 5 to `shared-memory.json`:

| Role | Field |
|------|-------|
| ideator | `generated_ideas` |
| challenger | `critique_insights` |
| synthesizer | `synthesis_themes` |
| evaluator | `evaluation_scores` |

### Team Configuration

| Setting | Value |
|---------|-------|
| Team name | brainstorm |
| Session directory | `.workflow/.team/BRS-<slug>-<date>/` |
| Shared memory | `shared-memory.json` in session dir |

---

## Three-Pipeline Architecture

```
Quick:
  IDEA-001 → CHALLENGE-001 → SYNTH-001

Deep (Generator-Critic Loop):
  IDEA-001 → CHALLENGE-001 → IDEA-002(fix) → CHALLENGE-002 → SYNTH-001 → EVAL-001

Full (Fan-out + Generator-Critic):
  [IDEA-001 + IDEA-002 + IDEA-003](parallel) → CHALLENGE-001(batch) → IDEA-004(fix) → SYNTH-001 → EVAL-001
```

### Generator-Critic Loop

ideator <-> challenger loop, max 2 rounds:

```
IDEA → CHALLENGE → (if critique.severity >= HIGH) → IDEA-fix → CHALLENGE-2 → SYNTH
                   (if critique.severity < HIGH) → SYNTH
```

### Cadence Control

**Beat model**: Event-driven, each beat = coordinator wake → process → spawn → STOP. Brainstorm beat: generate → challenge → synthesize → evaluate.

```
Beat Cycle (single beat)
═══════════════════════════════════════════════════════════
  Event                   Coordinator              Workers
───────────────────────────────────────────────────────────
  callback/resume ──→ ┌─ handleCallback ─┐
                      │  mark completed   │
                      │  check pipeline   │
                      ├─ handleSpawnNext ─┤
                      │  find ready tasks │
                      │  spawn workers ───┼──→ [Worker A] Phase 1-5
                      │  (parallel OK)  ──┼──→ [Worker B] Phase 1-5
                      └─ STOP (idle) ─────┘         │
                                                     │
  callback ←─────────────────────────────────────────┘
  (next beat)              SendMessage + TaskUpdate(completed)
═══════════════════════════════════════════════════════════
```

**Pipeline beat views**:

```
Quick (3 beats, strictly serial)
──────────────────────────────────────────────────────────
Beat  1         2              3
      │         │              │
      IDEA → CHALLENGE ──→ SYNTH
      ▲                        ▲
   pipeline                 pipeline
    start                    done

IDEA=ideator  CHALLENGE=challenger  SYNTH=synthesizer

Deep (5-6 beats, with Generator-Critic loop)
──────────────────────────────────────────────────────────
Beat  1         2              3         4         5         6
      │         │              │         │         │         │
      IDEA → CHALLENGE → (GC loop?) → IDEA-fix → SYNTH → EVAL
                              │
                        severity check
                  (< HIGH → skip to SYNTH)

Full (4-7 beats, fan-out + Generator-Critic)
──────────────────────────────────────────────────────────
Beat  1                    2              3-4        5         6
 ┌────┴────┐               │              │          │         │
 IDEA-1 ∥ IDEA-2 ∥ IDEA-3 → CHALLENGE → (GC loop) → SYNTH → EVAL
 ▲                                                              ▲
 parallel                                                    pipeline
 window                                                       done
```

**Checkpoints**:

| Trigger | Location | Behavior |
|---------|----------|----------|
| Generator-Critic loop | After CHALLENGE-* | If severity >= HIGH → create IDEA-fix task; else proceed to SYNTH |
| GC loop limit | Max 2 rounds | Exceeds limit → force convergence to SYNTH |
| Pipeline stall | No ready + no running | Check missing tasks, report to user |

**Stall Detection** (coordinator `handleCheck` executes):

| Check | Condition | Resolution |
|-------|-----------|------------|
| Worker no response | in_progress task no callback | Report waiting task list, suggest user `resume` |
| Pipeline deadlock | no ready + no running + has pending | Check blockedBy dependency chain, report blocking point |
| GC loop exceeded | ideator/challenger iteration > 2 rounds | Terminate loop, force convergence to synthesizer |

### Task Metadata Registry

| Task ID | Role | Phase | Dependencies | Description |
|---------|------|-------|-------------|-------------|
| IDEA-001 | ideator | generate | (none) | Multi-angle idea generation |
| IDEA-002 | ideator | generate | (none) | Parallel angle (Full pipeline only) |
| IDEA-003 | ideator | generate | (none) | Parallel angle (Full pipeline only) |
| CHALLENGE-001 | challenger | challenge | IDEA-001 (or all IDEA-*) | Devil's advocate critique and feasibility challenge |
| IDEA-004 | ideator | gc-fix | CHALLENGE-001 | Revision based on critique (GC loop, if triggered) |
| CHALLENGE-002 | challenger | gc-fix | IDEA-004 | Re-critique of revised ideas (GC loop round 2) |
| SYNTH-001 | synthesizer | synthesize | last CHALLENGE-* | Cross-idea integration, theme extraction, conflict resolution |
| EVAL-001 | evaluator | evaluate | SYNTH-001 | Scoring, ranking, priority recommendation, final selection |

---

## Coordinator Spawn Template

When coordinator spawns workers, use background mode (Spawn-and-Stop).

**Standard spawn** (single agent per role): For Quick/Deep pipeline, spawn one ideator. Challenger, synthesizer, and evaluator are always single agents.

**Parallel spawn** (Full pipeline): For Full pipeline with N idea angles, spawn N ideator agents in parallel (`ideator-1`, `ideator-2`, ...) with `run_in_background: true`. Each parallel ideator only processes tasks where owner matches its agent name. After all parallel ideators complete, proceed with single challenger for batch critique.

**Spawn template**:

```
Task({
  subagent_type: "general-purpose",
  description: "Spawn <role> worker",
  team_name: "brainstorm",
  name: "<role>",
  run_in_background: true,
  prompt: `You are team "brainstorm" <ROLE>.

## Primary Directive
All your work must be executed through Skill to load role definition:
Skill(skill="team-brainstorm", args="--role=<role>")

Current topic: <topic-description>
Session: <session-folder>

## Role Guidelines
- Only process <PREFIX>-* tasks, do not execute other role work
- All output prefixed with [<role>] identifier
- Only communicate with coordinator
- Do not use TaskCreate for other roles
- Call mcp__ccw-tools__team_msg before every SendMessage

## Workflow
1. Call Skill -> load role definition and execution logic
2. Follow role.md 5-Phase flow
3. team_msg + SendMessage results to coordinator
4. TaskUpdate completed -> check next task`
})
```

**Parallel ideator spawn** (Full pipeline with N angles):

> When Full pipeline has N parallel IDEA tasks assigned to ideator role, spawn N distinct agents named `ideator-1`, `ideator-2`, etc. Each agent only processes tasks where owner matches its agent name.

| Condition | Action |
|-----------|--------|
| Full pipeline with N idea angles (N > 1) | Spawn N agents: `ideator-1`, `ideator-2`, ... `ideator-N` with `run_in_background: true` |
| Quick/Deep pipeline (single ideator) | Standard spawn: single `ideator` agent |

```
Task({
  subagent_type: "general-purpose",
  description: "Spawn ideator-<N> worker",
  team_name: "brainstorm",
  name: "ideator-<N>",
  run_in_background: true,
  prompt: `You are team "brainstorm" IDEATOR (ideator-<N>).
Your agent name is "ideator-<N>", use this name for task discovery owner matching.

## Primary Directive
Skill(skill="team-brainstorm", args="--role=ideator --agent-name=ideator-<N>")

Current topic: <topic-description>
Session: <session-folder>

## Role Guidelines
- Only process tasks where owner === "ideator-<N>" with IDEA-* prefix
- All output prefixed with [ideator] identifier

## Workflow
1. TaskList -> find tasks where owner === "ideator-<N>" with IDEA-* prefix
2. Skill -> execute role definition
3. team_msg + SendMessage results to coordinator
4. TaskUpdate completed -> check next task`
})
```

**Dispatch must match agent names**: When dispatching parallel IDEA tasks, coordinator sets each task's owner to the corresponding instance name (`ideator-1`, `ideator-2`, etc.). In role.md, task discovery uses `--agent-name` for owner matching.

---

## Unified Session Directory

```
.workflow/.team/BRS-<slug>-<YYYY-MM-DD>/
├── team-session.json           # Session state
├── shared-memory.json          # Cumulative: generated_ideas / critique_insights / synthesis_themes / evaluation_scores
├── wisdom/                     # Cross-task knowledge
│   ├── learnings.md
│   ├── decisions.md
│   ├── conventions.md
│   └── issues.md
├── ideas/                      # Ideator output
│   ├── idea-001.md
│   ├── idea-002.md
│   └── idea-003.md
├── critiques/                  # Challenger output
│   ├── critique-001.md
│   └── critique-002.md
├── synthesis/                  # Synthesizer output
│   └── synthesis-001.md
└── evaluation/                 # Evaluator output
    └── evaluation-001.md
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown --role value | Error with available role list |
| Missing --role arg | Orchestration Mode → auto route to coordinator |
| Role file not found | Error with expected path (roles/<name>.md) |
| Task prefix conflict | Log warning, proceed |
| Generator-Critic loop exceeds 2 rounds | Force convergence → SYNTH |
| No ideas generated | Coordinator prompts with seed questions |
