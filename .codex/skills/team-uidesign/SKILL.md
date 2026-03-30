---
name: team-uidesign
description: Unified team skill for UI design team. Research -> design tokens -> audit -> implementation. Uses team-worker agent architecture with roles/ for domain logic. Coordinator orchestrates dual-track pipeline with GC loops and sync points. Triggers on "team ui design", "ui design team".
allowed-tools: spawn_agent(*), wait_agent(*), send_message(*), assign_task(*), close_agent(*), list_agents(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*), mcp__ace-tool__search_context(*), mcp__ccw-tools__read_file(*), mcp__ccw-tools__write_file(*), mcp__ccw-tools__edit_file(*), mcp__ccw-tools__team_msg(*)
---

# Team UI Design

Systematic UI design pipeline: research -> design tokens -> review -> implementation. Built on **team-worker agent architecture** — all worker roles share a single agent definition with role-specific Phase 2-4 loaded from `roles/<role>/role.md`.

## Architecture

```
Skill(skill="team-uidesign", args="task description")
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
     +-- analyze → dispatch → spawn workers → STOP
                                    |
                    +-------+-------+-------+-------+
                    v       v       v       v
           [team-worker agents, each loads roles/<role>/role.md]
          researcher  designer  reviewer  implementer
```

## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | — | — |
| researcher | [roles/researcher/role.md](roles/researcher/role.md) | RESEARCH-* | false |
| designer | [roles/designer/role.md](roles/designer/role.md) | DESIGN-* | false |
| reviewer | [roles/reviewer/role.md](roles/reviewer/role.md) | AUDIT-* | false |
| implementer | [roles/implementer/role.md](roles/implementer/role.md) | BUILD-* | false |

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

- **Session prefix**: `UDS`
- **Session path**: `.workflow/.team/UDS-<slug>-<date>/`
- **CLI tools**: `ccw cli --mode analysis` (read-only), `ccw cli --mode write` (modifications)
- **Message bus**: `mcp__ccw-tools__team_msg(session_id=<session-id>, ...)`
- **Max GC rounds**: 2

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

UI design is a creative pipeline where research findings inform design decisions. Researcher needs thorough analysis, designer needs creative reasoning.

| Role | reasoning_effort | Rationale |
|------|-------------------|-----------|
| researcher | high | Deep analysis of existing design systems and patterns |
| designer | high | Creative design token/component spec generation |
| reviewer | high | Design audit must catch consistency and accessibility issues |
| implementer | medium | Implementation follows defined design specs |

### Research-to-Design Context Flow

Researcher findings must reach designer via coordinator's upstream context:
```
// After RESEARCH-001 completes, coordinator sends findings to designer
spawn_agent({
  agent_type: "team_worker",
  task_name: "DESIGN-001",
  fork_context: false,
  items: [
    ...,
    { type: "text", text: `## Upstream Context
Research findings: <session>/research/design-intelligence.json
Component inventory: <session>/research/component-inventory.json
Accessibility audit: <session>/research/accessibility-audit.json` }
  ]
})
```

## User Commands

| Command | Action |
|---------|--------|
| `check` / `status` | View execution status graph |
| `resume` / `continue` | Advance to next step |

## Specs Reference

- [specs/pipelines.md](specs/pipelines.md) — Pipeline definitions and task registry

## Session Directory

```
.workflow/.team/UDS-<slug>-<date>/
├── .msg/
│   ├── messages.jsonl         # Team message bus
│   └── meta.json              # Pipeline config + GC state
├── research/                  # Researcher output
│   ├── design-system-analysis.json
│   ├── component-inventory.json
│   ├── accessibility-audit.json
│   └── design-intelligence.json
├── design/                    # Designer output
│   ├── design-tokens.json
│   ├── component-specs/
│   └── layout-specs/
├── audit/                     # Reviewer output
│   └── audit-*.md
├── build/                     # Implementer output
│   ├── token-files/
│   └── component-files/
└── wisdom/                    # Cross-task knowledge
```

## v4 Agent Coordination

### Message Semantics

| Intent | API | Example |
|--------|-----|---------|
| Queue supplementary info (don't interrupt) | `send_message` | Send research findings to running designer |
| Assign build from reviewed specs | `assign_task` | Assign BUILD task after audit passes |
| Check running agents | `list_agents` | Verify agent health during resume |

### Agent Health Check

Use `list_agents({})` in handleResume and handleComplete:

```
// Reconcile session state with actual running agents
const running = list_agents({})
// Compare with meta.json active tasks
// Reset orphaned tasks (in_progress but agent gone) to pending
```

### Named Agent Targeting

Workers are spawned with `task_name: "<task-id>"` enabling direct addressing:
- `send_message({ target: "DESIGN-001", items: [...] })` -- send additional research findings to designer
- `assign_task({ target: "BUILD-001", items: [...] })` -- assign implementation from reviewed design specs
- `close_agent({ target: "AUDIT-001" })` -- cleanup after design audit

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown command | Error with available command list |
| Role not found | Error with role registry |
| Session corruption | Attempt recovery, fallback to manual |
| Fast-advance conflict | Coordinator reconciles on next callback |
| Completion action fails | Default to Keep Active |
| GC loop stuck > 2 rounds | Escalate to user: accept / retry / terminate |
