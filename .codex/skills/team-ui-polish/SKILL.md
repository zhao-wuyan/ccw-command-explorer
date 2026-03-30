---
name: team-ui-polish
description: Unified team skill for UI polish. Auto-discover and fix UI design issues using Impeccable design standards. Anti-AI-slop detection, color/typography/spacing quality, motion, interaction states, visual hierarchy. Uses team-worker agent architecture. Triggers on "team ui polish", "ui polish", "design polish".
allowed-tools: spawn_agent(*), wait_agent(*), send_message(*), assign_task(*), close_agent(*), list_agents(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*), mcp__ccw-tools__read_file(*), mcp__ccw-tools__write_file(*), mcp__ccw-tools__edit_file(*), mcp__ccw-tools__team_msg(*), mcp__chrome-devtools__evaluate_script(*), mcp__chrome-devtools__take_screenshot(*), mcp__chrome-devtools__navigate_page(*), mcp__chrome-devtools__resize_page(*)
---

# Team UI Polish

Automatic UI quality improvement pipeline: scan -> diagnose -> optimize -> verify. Built on **team-worker agent architecture** -- all worker roles share a single agent definition with role-specific Phase 2-4 loaded from `roles/<role>/role.md`.

## Architecture

```
Skill(skill="team-ui-polish", args="task description")
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
           [team-worker agents, each loads roles/<role>/role.md]
          scanner  diagnostician  optimizer <-> verifier (GC loop)
```

## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | -- | -- |
| scanner | [roles/scanner/role.md](roles/scanner/role.md) | SCAN-* | false |
| diagnostician | [roles/diagnostician/role.md](roles/diagnostician/role.md) | DIAG-* | false |
| optimizer | [roles/optimizer/role.md](roles/optimizer/role.md) | OPT-* | true |
| verifier | [roles/verifier/role.md](roles/verifier/role.md) | VERIFY-* | false |

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

- **Session prefix**: `UIP`
- **Session path**: `.workflow/.team/UIP-<slug>-<date>/`
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

UI polish is a sequential pipeline where scan findings drive all downstream work. Scanner and verifier need thorough analysis, optimizer needs creative problem-solving.

| Role | reasoning_effort | Rationale |
|------|-------------------|-----------|
| scanner | high | Deep 8-dimension audit must catch every issue |
| diagnostician | high | Root cause analysis requires careful classification |
| optimizer | high | Creative fix application following design standards |
| verifier | high | Regression detection must be thorough |

### Scan-to-Diagnosis Context Flow

Scanner findings must reach diagnostician via coordinator's upstream context:
```
// After SCAN-001 completes, coordinator sends findings to diagnostician
spawn_agent({
  agent_type: "team_worker",
  task_name: "DIAG-001",
  fork_context: false,
  items: [
    ...,
    { type: "text", text: `## Upstream Context
Scan report: <session>/scan/scan-report.md` }
  ]
})
```

## User Commands

| Command | Action |
|---------|--------|
| `check` / `status` | View execution status graph |
| `resume` / `continue` | Advance to next step |

## Specs Reference

- [specs/pipelines.md](specs/pipelines.md) -- Pipeline definitions and task registry
- [specs/team-config.json](specs/team-config.json) -- Team configuration
- [specs/anti-patterns.md](specs/anti-patterns.md) -- AI slop and design anti-pattern catalog
- [specs/design-standards.md](specs/design-standards.md) -- Impeccable positive design standards
- [specs/fix-strategies.md](specs/fix-strategies.md) -- Issue-to-fix mapping
- [specs/scoring-guide.md](specs/scoring-guide.md) -- Scoring rubric

## Session Directory

```
.workflow/.team/UIP-<slug>-<date>/
+-- .msg/
|   +-- messages.jsonl         # Team message bus
|   +-- meta.json              # Pipeline config + GC state
+-- scan/                      # Scanner output
|   +-- scan-report.md
+-- diagnosis/                 # Diagnostician output
|   +-- diagnosis-report.md
+-- optimization/              # Optimizer output
|   +-- fix-log.md
+-- verification/              # Verifier output
|   +-- verify-report.md
+-- evidence/                  # Screenshots (before/after)
|   +-- *.png
+-- wisdom/                    # Cross-task knowledge
```

## v4 Agent Coordination

### Message Semantics

| Intent | API | Example |
|--------|-----|---------|
| Queue supplementary info (don't interrupt) | `send_message` | Send scan findings to running diagnostician |
| Assign fix from verification feedback | `assign_task` | Assign OPT-fix task after verify fails |
| Check running agents | `list_agents` | Verify agent health during resume |

### Agent Health Check

Use `list_agents({})` in handleResume and handleComplete:

```
// Reconcile session state with actual running agents
const running = list_agents({})
// Compare with tasks.json active tasks
// Reset orphaned tasks (in_progress but agent gone) to pending
```

### Named Agent Targeting

Workers are spawned with `task_name: "<task-id>"` enabling direct addressing:
- `send_message({ target: "DIAG-001", items: [...] })` -- send additional scan findings to diagnostician
- `assign_task({ target: "OPT-001", items: [...] })` -- assign optimization from diagnosis report
- `close_agent({ target: "VERIFY-001" })` -- cleanup after verification

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown command | Error with available command list |
| Role not found | Error with role registry |
| Session corruption | Attempt recovery, fallback to manual |
| Fast-advance conflict | Coordinator reconciles on next callback |
| Completion action fails | Default to Keep Active |
| GC loop stuck > 2 rounds | Escalate to user: accept / retry / terminate |
