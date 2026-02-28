---
name: team-ultra-analyze
description: Unified team skill for deep collaborative analysis. All roles invoke this skill with --role arg for role-specific execution. Triggers on "team ultra-analyze", "team analyze".
allowed-tools: TeamCreate(*), TeamDelete(*), SendMessage(*), TaskCreate(*), TaskUpdate(*), TaskList(*), TaskGet(*), Task(*), AskUserQuestion(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team Ultra Analyze

Deep collaborative analysis team skill. Splits monolithic analysis into 5-role collaboration: explore -> analyze -> discuss -> synthesize. Supports Quick/Standard/Deep pipeline modes with configurable depth (N parallel agents). Discussion loops enable user-guided progressive understanding. All members route via `--role=xxx`.

## Architecture

```
+-------------------------------------------------------------+
|  Skill(skill="team-ultra-analyze")                          |
|  args="topic description" or args="--role=xxx"              |
+----------------------------+--------------------------------+
                             | Role Router
          +---- --role present? ----+
          | NO                      | YES
          v                         v
   Orchestration Mode         Role Dispatch
   (auto -> coordinator)     (route to role.md)
          |
    +-----+------+----------+-----------+
    v            v          v           v           v
 coordinator  explorer   analyst   discussant  synthesizer
              EXPLORE-*  ANALYZE-*  DISCUSS-*   SYNTH-*
```

## Command Architecture

```
roles/
+-- coordinator/
|   +-- role.md              # Orchestration: topic clarification, pipeline selection, discussion loop, reporting
|   +-- commands/
|       +-- dispatch.md      # Task chain creation and dependency management
|       +-- monitor.md       # Progress monitoring + discussion loop
+-- explorer/
|   +-- role.md              # Codebase exploration
|   +-- commands/
|       +-- explore.md       # cli-explore-agent parallel exploration
+-- analyst/
|   +-- role.md              # Deep analysis
|   +-- commands/
|       +-- analyze.md       # CLI multi-perspective analysis
+-- discussant/
|   +-- role.md              # Discussion processing + direction adjustment
|   +-- commands/
|       +-- deepen.md        # Deep-dive exploration
+-- synthesizer/
    +-- role.md              # Synthesis and conclusions
    +-- commands/
        +-- synthesize.md    # Cross-perspective integration
```

**Design principle**: role.md retains Phase 1 (Task Discovery) and Phase 5 (Report) inline. Phase 2-4 delegate to `commands/*.md` based on complexity.

## Role Router

### Input Parsing

Parse `$ARGUMENTS` to extract `--role` and optional `--agent-name`. If `--role` is absent, enter Orchestration Mode (auto route to coordinator). The `--agent-name` parameter supports parallel instances (e.g., explorer-1, analyst-2) and is passed through to role.md for task discovery filtering.

### Role Registry

| Role | File | Task Prefix | Type | Compact |
|------|------|-------------|------|---------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | (none) | orchestrator | **compress: must re-read** |
| explorer | [roles/explorer/role.md](roles/explorer/role.md) | EXPLORE-* | parallel worker | compress: must re-read |
| analyst | [roles/analyst/role.md](roles/analyst/role.md) | ANALYZE-* | parallel worker | compress: must re-read |
| discussant | [roles/discussant/role.md](roles/discussant/role.md) | DISCUSS-* | pipeline | compress: must re-read |
| synthesizer | [roles/synthesizer/role.md](roles/synthesizer/role.md) | SYNTH-* | pipeline | compress: must re-read |

> **COMPACT PROTECTION**: Role files are execution documents, not reference material. When context compression occurs and role instructions are reduced to summaries, you **must immediately `Read` the corresponding role.md to reload before continuing execution**. Never execute any Phase based on compressed summaries alone.

### Dispatch

1. Extract `--role` from arguments
2. If no `--role` -> route to coordinator (Orchestration Mode)
3. Look up role in registry -> Read the role file -> Execute its phases

### Orchestration Mode

When invoked without `--role`, coordinator auto-starts. User just provides the analysis topic.

**Invocation**: `Skill(skill="team-ultra-analyze", args="analysis topic description")`

**Lifecycle**:
```
User provides analysis topic
  -> coordinator Phase 1-3: topic clarification -> TeamCreate -> pipeline selection -> create task chain
  -> coordinator Phase 4: spawn depth explorers in parallel (background) -> STOP
  -> Explorers execute -> SendMessage callback -> coordinator spawns analysts
  -> Analysts execute -> SendMessage callback -> coordinator spawns discussant
  -> Discussion loop (Deep mode: user feedback -> deepen -> re-analyze -> repeat)
  -> coordinator spawns synthesizer -> final conclusions -> Phase 5 report
```

**User Commands** (wake suspended coordinator):

| Command | Action |
|---------|--------|
| `check` / `status` | Output execution status diagram, do not advance pipeline |
| `resume` / `continue` | Check worker status, advance to next pipeline step |

---

## Shared Infrastructure

The following templates apply to all worker roles. Each role.md only needs to define **Phase 2-4** role-specific logic.

### Worker Phase 1: Task Discovery (shared by all workers)

Each worker executes the same task discovery flow on startup:

1. Call `TaskList()` to get all tasks
2. Filter: subject matches this role's prefix + owner matches this agent's name + status is pending + blockedBy is empty
3. No tasks -> idle wait
4. Has tasks -> `TaskGet` for details -> `TaskUpdate` mark in_progress

**Resume Artifact Check** (prevent duplicate output after recovery):
- Check if this task's output artifacts already exist
- Artifacts complete -> skip to Phase 5 report completion
- Artifacts incomplete or missing -> execute Phase 2-4 normally

### Worker Phase 5: Report (shared by all workers)

Standard report flow after task completion:

1. **Message Bus**: Call `mcp__ccw-tools__team_msg` to log message
   - Parameters: operation="log", team=<session-id>, from=<role>, to="coordinator", type=<message-type>, summary="[<role>] <summary>", ref=<artifact-path>
   - **Note**: `team` must be session ID (e.g., `UAN-xxx-date`), NOT team name. Extract from `Session:` field in task description.
   - **CLI fallback**: When MCP unavailable -> `ccw team log --team <session-id> --from <role> --to coordinator --type <type> --summary "[<role>] ..." --json`
2. **SendMessage**: Send result to coordinator (both content and summary prefixed with `[<role>]`)
3. **TaskUpdate**: Mark task completed
4. **Loop**: Return to Phase 1 to check for next task

### Wisdom Accumulation (all roles)

Cross-task knowledge accumulation. Coordinator creates `wisdom/` directory during session initialization.

**Directory**:
```
<session-folder>/wisdom/
+-- learnings.md      # Patterns and insights
+-- decisions.md      # Analysis direction decisions
+-- conventions.md    # Codebase conventions discovered
+-- issues.md         # Known risks and issues
```

**Worker load** (Phase 2): Extract `Session: <path>` from task description, read wisdom directory files.
**Worker contribute** (Phase 4/5): Write discoveries from this task into corresponding wisdom files.

### Role Isolation Rules

| Allowed | Prohibited |
|---------|-----------|
| Process tasks matching own prefix | Process tasks with other role prefixes |
| SendMessage to coordinator | Communicate directly with other workers |
| Read/write shared-memory.json (own fields) | Create tasks for other roles |
| Delegate to commands/*.md | Modify resources outside own responsibility |

Coordinator additionally prohibited: directly executing code exploration or analysis, directly calling cli-explore-agent or CLI analysis tools, bypassing workers to complete work.

### Shared Memory

Core shared artifact stored at `<session-folder>/shared-memory.json`. Each role reads the full memory but writes only to its own designated field:

| Role | Write Field |
|------|-------------|
| explorer | `explorations` |
| analyst | `analyses` |
| discussant | `discussions` |
| synthesizer | `synthesis` |
| coordinator | `decision_trail` + `current_understanding` |

On startup, read the file. After completing work, update own field and write back. If file does not exist, initialize with empty object.

### Message Bus (All Roles)

All roles log messages before sending via SendMessage. Call `mcp__ccw-tools__team_msg` with: operation="log", team=<session-id>, from=<role>, to="coordinator", type=<message-type>, summary="[<role>] <summary>", ref=<file-path>.

> **Note**: `team` must be session ID (e.g., `UAN-xxx-date`), NOT team name. Extract from `Session:` field in task description.

| Role | Types |
|------|-------|
| coordinator | `pipeline_selected`, `discussion_round`, `direction_adjusted`, `task_unblocked`, `error`, `shutdown` |
| explorer | `exploration_ready`, `error` |
| analyst | `analysis_ready`, `error` |
| discussant | `discussion_processed`, `error` |
| synthesizer | `synthesis_ready`, `error` |

**CLI fallback**: When MCP unavailable -> `ccw team log --team "<session-id>" --from "<role>" --to "coordinator" --type "<type>" --summary "<summary>" --json`

> **Note**: `team` must be session ID (e.g., `UAN-xxx-date`), NOT team name.

---

## Three-Mode Pipeline Architecture

```
Quick:    EXPLORE-001 -> ANALYZE-001 -> SYNTH-001
Standard: [EXPLORE-001..depth](parallel) -> [ANALYZE-001..depth](parallel) -> DISCUSS-001 -> SYNTH-001
Deep:     [EXPLORE-001..depth] -> [ANALYZE-001..depth] -> DISCUSS-001 -> ANALYZE-fix -> DISCUSS-002 -> ... -> SYNTH-001
```

### Mode Auto-Detection

Parse `--mode` from arguments first. If not specified, auto-detect from topic description:

| Condition | Mode | Depth |
|-----------|------|-------|
| `--mode=quick` explicit or topic contains "quick/overview/fast" | Quick | 1 |
| `--mode=deep` explicit or topic contains "deep/thorough/detailed/comprehensive" | Deep | N (from perspectives) |
| Default (no match) | Standard | N (from perspectives) |

**Depth** is determined by the number of selected analysis perspectives (e.g., architecture, implementation, performance, security, concept, comparison, decision). Quick mode always uses depth=1. Standard/Deep mode uses depth = number of selected perspectives.

### Discussion Loop (Deep Mode)

```
coordinator(AskUser) -> DISCUSS-N(deepen) -> [optional ANALYZE-fix] -> coordinator(AskUser) -> ... -> SYNTH
```

Maximum 5 discussion rounds. If exceeded, force synthesis and offer continuation option.

## Decision Recording Protocol

**CRITICAL**: Inherited from the original analyze-with-file command. During analysis, the following must be immediately recorded to discussion.md:

| Trigger | What to Record | Target Section |
|---------|---------------|----------------|
| **Direction choice** | What was chosen, why, which alternatives were rejected | `#### Decision Log` |
| **Key finding** | Discovery content, impact scope, confidence level | `#### Key Findings` |
| **Assumption change** | Old assumption -> new understanding, reason for change, impact | `#### Corrected Assumptions` |
| **User feedback** | User's raw input, adoption/adjustment rationale | `#### User Input` |

## Cadence Control

**Beat model**: Event-driven. Each beat = coordinator wakes -> processes callback -> spawns next phase -> STOP.

```
Beat Cycle (single beat)
=====================================================================
  Event                   Coordinator              Workers
---------------------------------------------------------------------
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
=====================================================================
```

**Discussion Loop Beat (Deep mode with configurable depth)**:

```
Phase 1 (explore):  Spawn depth explorers simultaneously
                    EXPLORE-1, EXPLORE-2, ..., EXPLORE-depth (all parallel)
                    -> All complete -> coordinator wakes

Phase 2 (analyze):  Spawn depth analysts simultaneously
                    ANALYZE-1, ANALYZE-2, ..., ANALYZE-depth (all parallel)
                    -> All complete -> coordinator wakes

Phase 3 (discuss):  Spawn 1 discussant
                    DISCUSS-001
                    -> Complete -> coordinator asks user for direction

Phase 3a (loop):    If user requests deeper analysis (Deep mode only):
                    -> Spawn ANALYZE-fix tasks -> DISCUSS-002 -> ask user -> repeat
                    -> Maximum 5 rounds

Phase 4 (synth):    Spawn 1 synthesizer
                    SYNTHESIZE-001
                    -> Complete -> coordinator reports to user
```

**Pipeline Beat Views**:

```
Quick (3 beats, serial)
------------------------------------------------------
Beat  1          2          3
      |          |          |
      EXPLORE -> ANALYZE -> SYNTH

Standard (4 beats, parallel windows)
------------------------------------------------------
Beat  1              2              3         4
      +----- ... ----+  +----- ... ----+      |         |
      E1 || E2 || EN    A1 || A2 || AN  ->  DISCUSS -> SYNTH
      +---- parallel ---+  +---- parallel ---+

Deep (4+ beats, with discussion loop)
------------------------------------------------------
Beat  1          2          3         3a...       4
      +-...-+    +-...-+    |    +-- loop --+     |
      E1||EN    A1||AN -> DISC -> A-fix->DISC -> SYNTH
                                  (max 5 rounds)
```

**Checkpoints**:

| Trigger | Location | Behavior |
|---------|----------|----------|
| Discussion round (Deep mode) | After DISCUSS-N completes | Pause, AskUser for direction/continuation |
| Discussion loop limit | >5 rounds | Force synthesis, offer continuation |
| Pipeline stall | No ready + no running | Check missing tasks, report to user |

**Stall detection** (coordinator `handleCheck`):

| Check | Condition | Resolution |
|-------|-----------|------------|
| Worker unresponsive | in_progress task with no callback | Report waiting tasks, suggest user `resume` |
| Pipeline deadlock | No ready + no running + has pending | Check blockedBy chain, report blockage |
| Discussion loop over limit | DISCUSS round > 5 | Terminate loop, output latest discussion state |

## Task Metadata Registry

| Task ID | Role | Phase | Dependencies | Description |
|---------|------|-------|-------------|-------------|
| EXPLORE-1..depth | explorer | explore | (none) | Parallel codebase exploration, one per perspective |
| ANALYZE-1..depth | analyst | analyze | EXPLORE-1..depth (all complete) | Parallel deep analysis, one per perspective |
| DISCUSS-001 | discussant | discuss | ANALYZE-1..depth (all complete) | Process analysis results, identify gaps |
| ANALYZE-fix-N | analyst | discuss-loop | DISCUSS-N | Re-analysis for specific areas (Deep mode only) |
| DISCUSS-002..N | discussant | discuss-loop | ANALYZE-fix-N | Subsequent discussion rounds (Deep mode, max 5) |
| SYNTHESIZE-001 | synthesizer | synthesize | Last DISCUSS-N | Cross-perspective integration and conclusions |

**Dynamic task creation**: Coordinator creates EXPLORE-1 through EXPLORE-depth and ANALYZE-1 through ANALYZE-depth based on the number of selected perspectives. Discussion loop tasks (ANALYZE-fix-N, DISCUSS-002+) are created dynamically in Deep mode based on user feedback.

## Coordinator Spawn Template

When coordinator spawns workers, use background mode (Spawn-and-Stop pattern). The coordinator determines the depth (number of parallel agents) based on selected perspectives.

**Phase 1 - Spawn Explorers**: Create depth explorer agents in parallel (EXPLORE-1 through EXPLORE-depth). Each explorer receives its assigned perspective/domain and agent name for task matching. All spawned with run_in_background:true. Coordinator stops after spawning and waits for callbacks.

**Phase 2 - Spawn Analysts**: After all explorers complete, create depth analyst agents in parallel (ANALYZE-1 through ANALYZE-depth). Each analyst receives its assigned perspective matching the corresponding explorer. All spawned with run_in_background:true. Coordinator stops.

**Phase 3 - Spawn Discussant**: After all analysts complete, create 1 discussant. It processes all analysis results and presents findings to user. Coordinator stops.

**Phase 3a - Discussion Loop** (Deep mode only): Based on user feedback, coordinator may create additional ANALYZE-fix and DISCUSS tasks. Loop continues until user is satisfied or 5 rounds reached.

**Phase 4 - Spawn Synthesizer**: After final discussion round, create 1 synthesizer. It integrates all explorations, analyses, and discussions into final conclusions. Coordinator stops.

**Quick mode exception**: When depth=1, spawn single explorer, single analyst, single discussant, single synthesizer -- all as simple agents without numbered suffixes.

**Single spawn example** (worker template used for all roles):

```
Task({
  subagent_type: "general-purpose",
  description: "Spawn <role> worker",
  team_name: <team-name>,
  name: "<agent-name>",
  run_in_background: true,
  prompt: `You are team "<team-name>" <ROLE> (<agent-name>).
Your agent name is "<agent-name>", use it for task discovery owner matching.

## Primary Instruction
All work must be executed by calling Skill for role definition:
Skill(skill="team-ultra-analyze", args="--role=<role> --agent-name=<agent-name>")

Current topic: <task-description>
Session: <session-folder>

## Role Rules
- Only process <PREFIX>-* tasks where owner === "<agent-name>"
- All output prefixed with [<role>] identifier
- Communicate only with coordinator
- Do not use TaskCreate for other roles
- Call mcp__ccw-tools__team_msg before every SendMessage

## Workflow
1. Call Skill -> load role definition and execution logic
2. Execute role.md 5-Phase process
3. team_msg + SendMessage result to coordinator
4. TaskUpdate completed -> check next task`
})
```

## Team Configuration

| Setting | Value |
|---------|-------|
| Team name | ultra-analyze |
| Session directory | .workflow/.team/UAN-{slug}-{date}/ |
| Shared memory file | shared-memory.json |
| Analysis dimensions | architecture, implementation, performance, security, concept, comparison, decision |
| Max discussion rounds | 5 |

## Unified Session Directory

```
.workflow/.team/UAN-{slug}-{YYYY-MM-DD}/
+-- shared-memory.json          # Exploration/analysis/discussion/synthesis shared memory
+-- discussion.md               # Understanding evolution and discussion timeline
+-- explorations/               # Explorer output
|   +-- exploration-001.json
|   +-- exploration-002.json
+-- analyses/                   # Analyst output
|   +-- analysis-001.json
|   +-- analysis-002.json
+-- discussions/                # Discussant output
|   +-- discussion-round-001.json
+-- conclusions.json            # Synthesizer output
+-- wisdom/                     # Cross-task knowledge
|   +-- learnings.md
|   +-- decisions.md
|   +-- conventions.md
|   +-- issues.md
```

## Session Resume

Coordinator supports `--resume` / `--continue` for interrupted sessions:

1. Scan `.workflow/.team/UAN-*/` for active/paused sessions
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
| Role file not found | Error with expected path (roles/{name}/role.md) |
| Task prefix conflict | Log warning, proceed |
| Discussion loop stuck >5 rounds | Force synthesis, offer continuation |
| CLI tool unavailable | Fallback chain: gemini -> codex -> manual analysis |
| Explorer agent fails | Continue with available context, note limitation |
