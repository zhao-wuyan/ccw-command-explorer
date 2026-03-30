---
name: team-brainstorm
description: Unified team skill for brainstorming team. Uses team-worker agent architecture with role directories for domain logic. Coordinator orchestrates pipeline, workers are team-worker agents. Triggers on "team brainstorm".
allowed-tools: spawn_agent(*), wait_agent(*), send_message(*), assign_task(*), close_agent(*), list_agents(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team Brainstorm

Orchestrate multi-agent brainstorming: generate ideas -> challenge assumptions -> synthesize -> evaluate. Supports Quick, Deep, and Full pipelines with Generator-Critic loop.

## Architecture

```
Skill(skill="team-brainstorm", args="topic description")
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
                    +-------+-------+-------+
                    v       v       v       v
                 [ideator][challenger][synthesizer][evaluator]
```

## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | — | — |
| ideator | [roles/ideator/role.md](roles/ideator/role.md) | IDEA-* | false |
| challenger | [roles/challenger/role.md](roles/challenger/role.md) | CHALLENGE-* | false |
| synthesizer | [roles/synthesizer/role.md](roles/synthesizer/role.md) | SYNTH-* | false |
| evaluator | [roles/evaluator/role.md](roles/evaluator/role.md) | EVAL-* | false |

## Role Router

Parse `$ARGUMENTS`:
- Has `--role <name>` -> Read `roles/<name>/role.md`, execute Phase 2-4
- No `--role` -> `roles/coordinator/role.md`, execute entry router

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

- **Session prefix**: `BRS`
- **Session path**: `.workflow/.team/BRS-<slug>-<date>/`
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
description: <topic-description>
pipeline_phase: <pipeline-phase>` },

    { type: "text", text: `## Upstream Context
<prev_context>` }
  ]
})
```

After spawning, use `wait_agent({ targets: [...], timeout_ms: 900000 })` to collect results, then `close_agent({ target: <name> })` each worker.

**Parallel ideator spawn** (Full pipeline with N angles):

When Full pipeline has N parallel IDEA tasks, spawn N distinct team-worker agents named `ideator-1`, `ideator-2`, etc.

```
spawn_agent({
  agent_type: "team_worker",
  task_name: "ideator-<N>",
  fork_context: false,
  items: [
    { type: "text", text: `## Role Assignment
role: ideator
role_spec: <skill_root>/roles/ideator/role.md
session: <session-folder>
session_id: <session-id>
requirement: <topic-description>
agent_name: ideator-<N>
inner_loop: false

Read role_spec file (<skill_root>/roles/ideator/role.md) to load Phase 2-4 domain instructions.` },

    { type: "text", text: `## Task Context
task_id: <task-id>
title: <task-title>
description: <topic-description>
pipeline_phase: <pipeline-phase>` },

    { type: "text", text: `## Upstream Context
<prev_context>` }
  ]
})
```

After spawning, use `wait_agent({ targets: [...], timeout_ms: 900000 })` to collect results, then `close_agent({ target: <name> })` each worker.


### Model Selection Guide

| Role | model | reasoning_effort | Rationale |
|------|-------|-------------------|-----------|
| Ideator (IDEA-*) | (default) | high | Creative divergent thinking requires full reasoning |
| Challenger (CHALLENGE-*) | (default) | high | Critical analysis of ideas needs deep reasoning |
| Synthesizer (SYNTH-*) | (default) | medium | Aggregation and convergence over generation |
| Evaluator (EVAL-*) | (default) | medium | Scoring and ranking against criteria |

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
| `check` / `status` | View execution status graph, no advancement |
| `resume` / `continue` | Check worker states, advance next step |

## Session Directory

```
.workflow/.team/BRS-<slug>-<date>/
├── session.json                    # Session metadata + pipeline + gc_round
├── task-analysis.json              # Coordinator analyze output
├── .msg/
│   ├── messages.jsonl              # Message bus log
│   └── meta.json                   # Session state + cross-role state
├── wisdom/                         # Cross-task knowledge
│   ├── learnings.md
│   ├── decisions.md
│   ├── conventions.md
│   └── issues.md
├── ideas/                          # Ideator output
│   ├── idea-001.md
│   └── idea-002.md
├── critiques/                      # Challenger output
│   ├── critique-001.md
│   └── critique-002.md
├── synthesis/                      # Synthesizer output
│   └── synthesis-001.md
└── evaluation/                     # Evaluator output
    └── evaluation-001.md
```

## Specs Reference

- [specs/pipelines.md](specs/pipelines.md) — Pipeline definitions and task registry

## v4 Agent Coordination

### Message Semantics

| Intent | API | Example |
|--------|-----|---------|
| Share idea context across ideators | `send_message` | Send seed ideas to running ideator for cross-pollination |
| Not used in this skill | `assign_task` | No resident agents -- all workers are one-shot |
| Check running agents | `list_agents` | Verify parallel ideator health during Full pipeline |

### Parallel Ideator Coordination (Full Pipeline)

Full pipeline spawns N parallel ideators for different brainstorming angles. Use batch spawn + wait:

```
// Spawn N ideators in parallel, each with a different angle
const ideatorNames = ["IDEA-001", "IDEA-002", "IDEA-003"]
for (const name of ideatorNames) {
  spawn_agent({ agent_type: "team_worker", task_name: name, fork_context: false, ... })
}
wait_agent({ targets: ideatorNames, timeout_ms: 900000 })
// Collect all idea outputs, feed to challenger as upstream context
```

### Agent Health Check

Use `list_agents({})` in handleResume and handleComplete:

```
// Reconcile session state with actual running agents
const running = list_agents({})
// Compare with tasks.json active_agents
// Reset orphaned tasks (in_progress but agent gone) to pending
```

### Named Agent Targeting

Workers are spawned with `task_name: "<task-id>"` enabling direct addressing:
- `send_message({ target: "IDEA-002", items: [...] })` -- share context from another ideator
- `close_agent({ target: "IDEA-001" })` -- cleanup by name after wait_agent returns

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown command | Error with available command list |
| Role not found | Error with role registry |
| CLI tool fails | Worker fallback to direct implementation |
| Fast-advance conflict | Coordinator reconciles on next callback |
| Completion action fails | Default to Keep Active |
| Generator-Critic loop exceeds 2 rounds | Force convergence to synthesizer |
| No ideas generated | Coordinator prompts with seed questions |
