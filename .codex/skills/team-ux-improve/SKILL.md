---
name: team-ux-improve
description: Unified team skill for UX improvement. Systematically discovers and fixes UI/UX interaction issues including unresponsive buttons, missing feedback, and state refresh problems. Uses team-worker agent architecture with roles/ for domain logic. Coordinator orchestrates pipeline, workers are team-worker agents. Triggers on "team ux improve".
allowed-tools: spawn_agent(*), wait_agent(*), send_message(*), assign_task(*), close_agent(*), list_agents(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*), mcp__ace-tool__search_context(*), mcp__ccw-tools__read_file(*), mcp__ccw-tools__write_file(*), mcp__ccw-tools__edit_file(*), mcp__ccw-tools__team_msg(*)
---

# Team UX Improve

Systematic UX improvement pipeline: scan -> diagnose -> design -> implement -> test. Built on **team-worker agent architecture** — all worker roles share a single agent definition with role-specific Phase 2-4 loaded from `roles/<role>/role.md`.

## Architecture

```
Skill(skill="team-ux-improve", args="<project-path> [--framework react|vue]")
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
                    v       v       v       v       v
           [team-worker agents, each loads roles/<role>/role.md]
          scanner  diagnoser  designer  implementer  tester
```

## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | — | — |
| scanner | [roles/scanner/role.md](roles/scanner/role.md) | SCAN-* | false |
| diagnoser | [roles/diagnoser/role.md](roles/diagnoser/role.md) | DIAG-* | false |
| designer | [roles/designer/role.md](roles/designer/role.md) | DESIGN-* | false |
| implementer | [roles/implementer/role.md](roles/implementer/role.md) | IMPL-* | true |
| tester | [roles/tester/role.md](roles/tester/role.md) | TEST-* | false |

## Utility Member Registry

**Coordinator-only**: Utility members can only be spawned by Coordinator. Workers CANNOT call spawn_agent() to spawn utility members.

| Utility Member | Path | Callable By | Purpose |
|----------------|------|-------------|---------|
| explorer | [roles/explorer/role.md](roles/explorer/role.md) | Coordinator only | Explore codebase for UI component patterns and framework-specific patterns |

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

- **Session prefix**: `ux-improve`
- **Session path**: `.workflow/.team/ux-improve-<timestamp>/`
- **CLI tools**: `ccw cli --mode analysis` (read-only), `ccw cli --mode write` (modifications)
- **Message bus**: `mcp__ccw-tools__team_msg(session_id=<session-id>, ...)`
- **Max test iterations**: 5

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

UX improvement has an explorer utility member and a scan-diagnose-design-implement-test pipeline.

| Role | reasoning_effort | Rationale |
|------|-------------------|-----------|
| explorer | low | File reading and pattern summarization only (utility member) |
| scanner | medium | Broad UI/UX issue scanning, pattern-based detection |
| diagnoser | high | Root cause diagnosis of UX issues requires deep analysis |
| designer | high | UX improvement design needs careful user experience reasoning |
| implementer | high | UI code changes must preserve existing behavior |
| tester | medium | Test execution follows defined UX verification criteria |

## User Commands

| Command | Action |
|---------|--------|
| `check` / `status` | View execution status graph |
| `resume` / `continue` | Advance to next step |

## Specs Reference

- [specs/pipelines.md](specs/pipelines.md) — Pipeline definitions and task registry

## Session Directory

```
.workflow/.team/ux-improve-<timestamp>/
├── .msg/
│   ├── messages.jsonl      # Team message bus
│   └── meta.json           # Pipeline config + role state snapshot
├── artifacts/              # Role deliverables
│   ├── scan-report.md      # Scanner output
│   ├── diagnosis.md        # Diagnoser output
│   ├── design-guide.md     # Designer output
│   ├── fixes/              # Implementer output
│   └── test-report.md      # Tester output
├── explorations/           # Explorer cache
│   └── cache-index.json
└── wisdom/                 # Session knowledge base
    ├── contributions/      # Worker contributions (write-only for workers)
    ├── principles/
    ├── patterns/
    └── anti-patterns/
```

## v4 Agent Coordination

### Message Semantics

| Intent | API | Example |
|--------|-----|---------|
| Queue supplementary info (don't interrupt) | `send_message` | Send explorer findings to running scanner |
| Assign implementation from design | `assign_task` | Assign IMPL task from designer output |
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
- `send_message({ target: "SCAN-001", items: [...] })` -- send explorer findings to scanner
- `assign_task({ target: "IMPL-001", items: [...] })` -- assign UX fix from designer output
- `close_agent({ target: "TEST-001" })` -- cleanup after UX testing

### Explorer-Assisted Scanning

Coordinator spawns explorer (utility member) early to gather codebase context, then sends findings to scanner via upstream context:
```
// Explorer results inform scanner's scope
send_message({
  target: "SCAN-001",
  items: [
    { type: "text", text: `## Explorer Findings
component_patterns: <explorer's component inventory>
framework: <detected framework>
ui_library: <detected UI library>` }
  ]
})
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown command | Error with available command list |
| Role not found | Error with role registry |
| Project path invalid | Re-prompt user for valid path |
| Framework detection fails | request_user_input for framework selection |
| Session corruption | Attempt recovery, fallback to manual |
| Fast-advance conflict | Coordinator reconciles on next callback |
| No UI issues found | Complete with empty fix list, generate clean bill report |
| Test iterations exceeded | Accept current state, continue to completion |
