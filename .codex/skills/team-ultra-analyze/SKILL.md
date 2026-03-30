---
name: team-ultra-analyze
description: Deep collaborative analysis team skill. All roles route via this SKILL.md. Beat model is coordinator-only (monitor.md). Structure is roles/ + specs/. Triggers on "team ultra-analyze", "team analyze".
allowed-tools: spawn_agent(*), wait_agent(*), send_message(*), assign_task(*), close_agent(*), list_agents(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team Ultra Analyze

Deep collaborative analysis: explore -> analyze -> discuss -> synthesize. Supports Quick/Standard/Deep pipeline modes with configurable depth (N parallel agents). Discussion loops enable user-guided progressive understanding.

## Architecture

```
Skill(skill="team-ultra-analyze", args="<topic>")
                    |
         SKILL.md (this file) = Router
                    |
     +--------------+--------------+
     |                             |
  no --role flag              --role <name>
     |                             |
  Coordinator                  Worker
  roles/coordinator/role.md    roles/<name>/role.md
     |
     +-- analyze -> dispatch -> spawn workers -> STOP
                                    |
                    +-------+-------+-------+-------+
                    v       v       v       v
                 [team-worker agents, each loads roles/<role>/role.md]

Pipeline (Standard mode):
  [EXPLORE-1..N](parallel) -> [ANALYZE-1..N](parallel) -> DISCUSS-001 -> SYNTH-001

Pipeline (Deep mode):
  [EXPLORE-1..N] -> [ANALYZE-1..N] -> DISCUSS-001 -> ANALYZE-fix -> DISCUSS-002 -> ... -> SYNTH-001

Pipeline (Quick mode):
  EXPLORE-001 -> ANALYZE-001 -> SYNTH-001
```

## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | — | — |
| explorer | [roles/explorer/role.md](roles/explorer/role.md) | EXPLORE-* | false |
| analyst | [roles/analyst/role.md](roles/analyst/role.md) | ANALYZE-* | false |
| discussant | [roles/discussant/role.md](roles/discussant/role.md) | DISCUSS-* | false |
| synthesizer | [roles/synthesizer/role.md](roles/synthesizer/role.md) | SYNTH-* | false |

## Role Router

Parse `$ARGUMENTS`:
- Has `--role <name>` → Read `roles/<name>/role.md`, execute Phase 2-4
- No `--role` → `roles/coordinator/role.md`, execute entry router

## Delegation Lock

**Coordinator is a PURE ORCHESTRATOR. It coordinates, it does NOT do.**

Before calling ANY tool, apply this check:

| Tool Call | Verdict | Reason |
|-----------|---------|--------|
| `spawn_agent`, `wait_agent`, `close_agent`, `send_message`, `assign_task` | ALLOWED | Orchestration |
| `list_agents` | ALLOWED | Agent health check |
| `request_user_input` | ALLOWED | User interaction |
| `mcp__ccw-tools__team_msg` | ALLOWED | Message bus |
| `Read/Write` on `.workflow/.team/` files | ALLOWED | Session state |
| `Read` on `roles/`, `commands/`, `specs/` | ALLOWED | Loading own instructions |
| `Read/Grep/Glob` on project source code | BLOCKED | Delegate to worker |
| `Edit` on any file outside `.workflow/` | BLOCKED | Delegate to worker |
| `Bash("ccw cli ...")` | BLOCKED | Only workers call CLI |
| `Bash` running build/test/lint commands | BLOCKED | Delegate to worker |

**If a tool call is BLOCKED**: STOP. Create a task, spawn a worker.

**No exceptions for "simple" tasks.** Even a single-file read-and-report MUST go through spawn_agent.

---

## Shared Constants

- **Session prefix**: `UAN`
- **Session path**: `.workflow/.team/UAN-<slug>-<date>/`
- **Team name**: `ultra-analyze`
- **CLI tools**: `ccw cli --mode analysis` (read-only), `ccw cli --mode write` (modifications)
- **Message bus**: `mcp__ccw-tools__team_msg(session_id=<session-id>, ...)`

## Worker Spawn Template

Coordinator spawns workers using this template:

```
spawn_agent({
  agent_type: "team_worker",
  task_name: "<task-id>",
  fork_context: false,
  items: [
    { type: "text", text: `## Role Assignment
role: <role>
role_spec: <skill_root>/roles/<role>/role.md
session: <session-folder>
session_id: <session-id>
requirement: <topic-description>
inner_loop: false

Read role_spec file (<skill_root>/roles/<role>/role.md) to load Phase 2-4 domain instructions.` },

    { type: "text", text: `## Task Context
task_id: <task-id>
title: <task-title>
description: <task-description>
pipeline_phase: <pipeline-phase>` },

    { type: "text", text: `## Upstream Context
<prev_context>` }
  ]
})
```

After spawning, use `wait_agent({ targets: [...], timeout_ms: 900000 })` to collect results, then `close_agent({ target })` each worker.


### Model Selection Guide

| Role | model | reasoning_effort | Rationale |
|------|-------|-------------------|-----------|
| Explorer (EXPLORE-*) | (default) | medium | File reading and pattern scanning, less reasoning needed |
| Analyst (ANALYZE-*) | (default) | high | Deep analysis requires full reasoning |
| Discussant (DISCUSS-*) | (default) | high | Synthesis of multiple viewpoints, dialectic reasoning |
| Synthesizer (SYNTH-*) | (default) | medium | Aggregation and summary over generation |

Override model/reasoning_effort in spawn_agent when cost optimization is needed:
```
spawn_agent({
  agent_type: "team_worker",
  task_name: "<task-id>",
  fork_context: false,
  model: "<model-override>",
  reasoning_effort: "<effort-level>",
  items: [...]
})
```

## User Commands

| Command | Action |
|---------|--------|
| `check` / `status` | Output execution status diagram, do not advance pipeline |
| `resume` / `continue` | Check worker status, advance to next pipeline step |

## Session Directory

```
.workflow/.team/UAN-{slug}-{YYYY-MM-DD}/
+-- .msg/messages.jsonl          # Message bus log
+-- .msg/meta.json               # Session metadata + cross-role state
+-- discussion.md                # Understanding evolution and discussion timeline
+-- explorations/                # Explorer output
|   +-- exploration-001.json
|   +-- exploration-002.json
+-- analyses/                    # Analyst output
|   +-- analysis-001.json
|   +-- analysis-002.json
+-- discussions/                 # Discussant output
|   +-- discussion-round-001.json
+-- conclusions.json             # Synthesizer output
+-- wisdom/                      # Cross-task knowledge
|   +-- learnings.md
|   +-- decisions.md
|   +-- conventions.md
|   +-- issues.md
```

## v4 Agent Coordination

### Message Semantics

| Intent | API | Example |
|--------|-----|---------|
| Send exploration findings to running analysts | `send_message` | Queue upstream context without interrupting ANALYZE-* workers |
| Not used in this skill | `assign_task` | No resident agents -- all workers are one-shot |
| Check running agents | `list_agents` | Verify parallel explorer/analyst health during resume |

### Parallel Phase Coordination

Standard/Deep modes spawn N parallel agents in EXPLORE and ANALYZE phases. Use batch spawn + wait:

```
// EXPLORE phase: spawn N explorers in parallel
const explorerNames = ["EXPLORE-001", "EXPLORE-002", ..., "EXPLORE-00N"]
for (const name of explorerNames) {
  spawn_agent({ agent_type: "team_worker", task_name: name, ... })
}
wait_agent({ targets: explorerNames, timeout_ms: 900000 })
// Collect all results, then spawn ANALYZE phase

// ANALYZE phase: send exploration context to analysts via items (not send_message)
// since analysts are spawned AFTER explorers complete
```

### Agent Health Check

Use `list_agents({})` in handleResume and handleComplete:

```
// Reconcile session state with actual running agents
const running = list_agents({})
// Compare with tasks.json active_agents
// Reset orphaned tasks (in_progress but agent gone) to pending
// Critical for parallel phases -- multiple agents may crash independently
```

### Named Agent Targeting

Workers are spawned with `task_name: "<task-id>"` enabling direct addressing:
- `send_message({ target: "ANALYZE-001", items: [...] })` -- queue supplementary exploration findings
- `close_agent({ target: "EXPLORE-001" })` -- cleanup by name after wait_agent returns

## Completion Action

When pipeline completes, coordinator presents:

```
request_user_input({
  questions: [{
    question: "Ultra-Analyze pipeline complete. What would you like to do?",
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

| Choice | Action |
|--------|--------|
| Archive & Clean | Update session status="completed" -> output final summary |
| Keep Active | Update session status="paused" -> output resume instructions |
| Export Results | request_user_input for target path -> copy deliverables -> Archive & Clean |

## Specs Reference

- [specs/team-config.json](specs/team-config.json) — Team configuration and pipeline settings

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown --role value | Error with role registry list |
| Role file not found | Error with expected path (roles/{name}/role.md) |
| Discussion loop stuck >5 rounds | Force synthesis, offer continuation |
| CLI tool unavailable | Fallback chain: gemini -> codex -> manual analysis |
| Explorer agent fails | Continue with available context, note limitation |
| Fast-advance conflict | Coordinator reconciles on next callback |
| Completion action fails | Default to Keep Active |
