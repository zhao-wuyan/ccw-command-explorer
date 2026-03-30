---
name: team-frontend
description: Unified team skill for frontend development. Pure router — all roles read this file. Beat model is coordinator-only in monitor.md. Built-in ui-ux-pro-max design intelligence. Triggers on "team frontend".
allowed-tools: spawn_agent(*), wait_agent(*), send_message(*), assign_task(*), close_agent(*), list_agents(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*), WebFetch(*), WebSearch(*), mcp__ace-tool__search_context(*)
---

# Team Frontend Development

Unified team skill: frontend development with built-in ui-ux-pro-max design intelligence. Covers requirement analysis, design system generation, frontend implementation, and quality assurance. Built on **team-worker agent architecture** — all worker roles share a single agent definition with role-specific Phase 2-4 loaded from role.md specs.

## Architecture

```
Skill(skill="team-frontend", args="task description")
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
               [analyst] [architect] [developer] [qa]
              (team-worker agents, each loads roles/<role>/role.md)
```

## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | — | — |
| analyst | [roles/analyst/role.md](roles/analyst/role.md) | ANALYZE-* | false |
| architect | [roles/architect/role.md](roles/architect/role.md) | ARCH-* | false |
| developer | [roles/developer/role.md](roles/developer/role.md) | DEV-* | true |
| qa | [roles/qa/role.md](roles/qa/role.md) | QA-* | false |

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

- **Session prefix**: `FE`
- **Session path**: `.workflow/.team/FE-<slug>-<date>/`
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
requirement: <task-description>
inner_loop: <true|false>

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
| Analyst (ANALYZE-*) | (default) | high | Design intelligence requires deep UI/UX reasoning |
| Architect (ARCH-*) | (default) | high | Component spec and design token generation needs precision |
| Developer (DEV-*) | (default) | high | Frontend code generation needs full reasoning |
| QA (QA-*) | (default) | high | 5-dimension audit requires thorough analysis |

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
| `check` / `status` | View execution status graph |
| `resume` / `continue` | Advance to next step |

## Session Directory

```
.workflow/.team/FE-<slug>-<YYYY-MM-DD>/
├── .msg/
│   ├── messages.jsonl          # Message bus log
│   └── meta.json               # Session state + cross-role state
├── task-analysis.json          # Coordinator analyze output
├── wisdom/                     # Cross-task knowledge
├── analysis/                   # Analyst output
│   ├── design-intelligence.json
│   └── requirements.md
├── architecture/               # Architect output
│   ├── design-tokens.json
│   ├── component-specs/
│   └── project-structure.md
├── qa/                         # QA output
│   └── audit-<NNN>.md
└── build/                      # Developer output
```

## Specs Reference

- [specs/pipelines.md](specs/pipelines.md) — Pipeline definitions and task registry

## v4 Agent Coordination

### Message Semantics

| Intent | API | Example |
|--------|-----|---------|
| Send architecture specs to running developer | `send_message` | Queue design tokens and component specs to DEV-* |
| Not used in this skill | `assign_task` | No resident agents -- all workers are one-shot |
| Check running agents | `list_agents` | Verify agent health during resume |

### Pipeline Pattern

Sequential pipeline with GC loops: analyst -> architect -> developer -> QA. In **system mode**, architect revision (ARCH-002) and developer (DEV-001) may run in parallel after QA-001 arch review.

### fork_context Consideration

Developer workers (DEV-*) benefit from `fork_context: true` when the coordinator has accumulated significant design context (analysis results, architecture specs, design tokens). This avoids the developer needing to re-read all upstream artifacts:

```
// Consider fork_context: true for developer in feature/system modes
spawn_agent({
  agent_type: "team_worker",
  task_name: "DEV-001",
  fork_context: true,  // Developer gets full coordinator context including design decisions
  items: [...]
})
```

### GC Loop (QA Fix Cycle)

QA may flag FIX_REQUIRED, creating DEV-fix + QA-recheck tasks (max 2 rounds). If QA score remains < 6 after 2 rounds, escalate to user.

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
- `send_message({ target: "DEV-001", items: [...] })` -- queue architecture specs to running developer
- `close_agent({ target: "ARCH-001" })` -- cleanup by name after completion

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown command | Error with available command list |
| Role not found | Error with role registry |
| QA score < 6 over 2 GC rounds | Escalate to user |
| ui-ux-pro-max unavailable | Degrade to LLM general design knowledge |
| Worker no response | Report waiting task, suggest user `resume` |
| Pipeline deadlock | Check blockedBy chain, report blocking point |
