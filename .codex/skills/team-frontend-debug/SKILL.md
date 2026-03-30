---
name: team-frontend-debug
description: Frontend debugging team using Chrome DevTools MCP. Dual-mode — feature-list testing or bug-report debugging. Triggers on "team-frontend-debug", "frontend debug".
allowed-tools: spawn_agent(*), wait_agent(*), send_message(*), assign_task(*), close_agent(*), list_agents(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*), mcp__chrome-devtools__*(*)
---

# Frontend Debug Team

Dual-mode frontend debugging: feature-list testing or bug-report debugging, powered by Chrome DevTools MCP.

## Architecture

```
Skill(skill="team-frontend-debug", args="feature list or bug description")
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
     +-- analyze input → select pipeline → dispatch → spawn → STOP
                                    |
         ┌──────────────────────────┼──────────────────────┐
         v                         v                       v
    [test-pipeline]          [debug-pipeline]          [shared]
     tester(DevTools)        reproducer(DevTools)      analyzer
                                                       fixer
                                                       verifier
```

## Pipeline Modes

| Input | Pipeline | Flow |
|-------|----------|------|
| Feature list / 功能清单 | `test-pipeline` | TEST → ANALYZE → FIX → VERIFY |
| Bug report / 错误描述 | `debug-pipeline` | REPRODUCE → ANALYZE → FIX → VERIFY |

## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | — | — |
| tester | [roles/tester/role.md](roles/tester/role.md) | TEST-* | true |
| reproducer | [roles/reproducer/role.md](roles/reproducer/role.md) | REPRODUCE-* | false |
| analyzer | [roles/analyzer/role.md](roles/analyzer/role.md) | ANALYZE-* | false |
| fixer | [roles/fixer/role.md](roles/fixer/role.md) | FIX-* | true |
| verifier | [roles/verifier/role.md](roles/verifier/role.md) | VERIFY-* | false |

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

- **Session prefix**: `TFD`
- **Session path**: `.workflow/.team/TFD-<slug>-<date>/`
- **CLI tools**: `ccw cli --mode analysis` (read-only), `ccw cli --mode write` (modifications)
- **Message bus**: `mcp__ccw-tools__team_msg(session_id=<session-id>, ...)`

## Workspace Resolution

Coordinator MUST resolve paths at Phase 2 before spawning workers:

1. Run `Bash({ command: "pwd" })` → capture `project_root` (absolute path)
2. `skill_root = <project_root>/.claude/skills/team-frontend-debug`
3. Store in `team-session.json`:
   ```json
   { "project_root": "/abs/path/to/project", "skill_root": "/abs/path/to/skill" }
   ```
4. All worker `role_spec` values MUST use `<skill_root>/roles/<role>/role.md` (absolute)

This ensures workers always receive an absolute, resolvable path regardless of their working directory.

## Chrome DevTools MCP Tools

All browser inspection operations use Chrome DevTools MCP. Reproducer and Verifier are primary consumers.

| Tool | Purpose |
|------|---------|
| `mcp__chrome-devtools__navigate_page` | Navigate to target URL |
| `mcp__chrome-devtools__take_screenshot` | Capture visual state |
| `mcp__chrome-devtools__take_snapshot` | Capture DOM/a11y tree |
| `mcp__chrome-devtools__list_console_messages` | Read console logs |
| `mcp__chrome-devtools__get_console_message` | Get specific console message |
| `mcp__chrome-devtools__list_network_requests` | Monitor network activity |
| `mcp__chrome-devtools__get_network_request` | Inspect request/response detail |
| `mcp__chrome-devtools__performance_start_trace` | Start performance recording |
| `mcp__chrome-devtools__performance_stop_trace` | Stop and analyze trace |
| `mcp__chrome-devtools__click` | Simulate user click |
| `mcp__chrome-devtools__fill` | Fill form inputs |
| `mcp__chrome-devtools__hover` | Hover over elements |
| `mcp__chrome-devtools__evaluate_script` | Execute JavaScript in page |
| `mcp__chrome-devtools__wait_for` | Wait for element/text |
| `mcp__chrome-devtools__list_pages` | List open browser tabs |
| `mcp__chrome-devtools__select_page` | Switch active tab |

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

Debug workflows require tool-heavy interaction (Chrome DevTools MCP). Reasoning effort varies by role.

| Role | reasoning_effort | Rationale |
|------|-------------------|-----------|
| tester | medium | Systematic feature testing via DevTools, follows test plan |
| reproducer | medium | Reproduce bugs via DevTools interaction steps |
| analyzer | high | Root cause analysis requires deep reasoning about evidence |
| fixer | high | Code fixes must address root cause precisely |
| verifier | medium | Verification follows defined success criteria via DevTools |

## User Commands

| Command | Action |
|---------|--------|
| `check` / `status` | View execution status graph |
| `resume` / `continue` | Advance to next step |
| `revise <TASK-ID> [feedback]` | Revise specific task |
| `feedback <text>` | Inject feedback for revision |
| `retry <TASK-ID>` | Re-run a failed task |

## v4 Agent Coordination

### Message Semantics

| Intent | API | Example |
|--------|-----|---------|
| Queue supplementary info (don't interrupt) | `send_message` | Send DevTools evidence to running analyzer |
| Assign new work / trigger debug round | `assign_task` | Assign re-fix after verification failure |
| Check running agents | `list_agents` | Verify agent health during resume |

### Agent Health Check

Use `list_agents({})` in handleResume and handleComplete:

```
// Reconcile session state with actual running agents
const running = list_agents({})
// Compare with team-session.json active tasks
// Reset orphaned tasks (in_progress but agent gone) to pending
```

### Named Agent Targeting

Workers are spawned with `task_name: "<task-id>"` enabling direct addressing:
- `send_message({ target: "ANALYZE-001", items: [...] })` -- send evidence from reproducer to analyzer
- `assign_task({ target: "FIX-001", items: [...] })` -- assign fix based on analysis results
- `close_agent({ target: "VERIFY-001" })` -- cleanup after verification

### Iterative Debug Loop Pattern

When verifier reports a fix did not resolve the issue, coordinator uses `assign_task` to trigger re-analysis and re-fix:
```
// Verifier reports failure -> coordinator dispatches re-fix
assign_task({
  target: "FIX-001",   // reuse existing fixer if inner_loop, or spawn new
  items: [
    { type: "text", text: `## Re-fix Assignment
verification_result: FAIL
failure_evidence: <verifier's screenshot/console evidence>
previous_fix_summary: <what was tried>
instruction: Analyze verification failure and apply corrected fix.` }
  ]
})
```

This pattern enables iterative debug rounds: FIX -> VERIFY -> re-FIX -> re-VERIFY (max 3 rounds).

## Completion Action

When pipeline completes, coordinator presents:

```
request_user_input({
  questions: [{
    question: "Pipeline complete. What would you like to do?",
    header: "Completion",
    multiSelect: false,
    options: [
      { label: "Archive & Clean (Recommended)", description: "Archive session, clean up" },
      { label: "Keep Active", description: "Keep session for follow-up debugging" },
      { label: "Export Results", description: "Export debug report and patches" }
    ]
  }]
})
```

## Specs Reference

- [specs/pipelines.md](specs/pipelines.md) — Pipeline definitions and task registry
- [specs/debug-tools.md](specs/debug-tools.md) — Chrome DevTools MCP usage patterns and evidence collection

## Session Directory

```
.workflow/.team/TFD-<slug>-<date>/
├── team-session.json           # Session state + role registry
├── evidence/                   # Screenshots, snapshots, network logs
├── artifacts/                  # Test reports, RCA reports, patches, verification reports
├── wisdom/                     # Cross-task debug knowledge
└── .msg/                       # Team message bus
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| All features pass test | Report success, pipeline completes without ANALYZE/FIX/VERIFY |
| Bug not reproducible | Reproducer reports failure, coordinator asks user for more details |
| Browser not available | Report error, suggest manual reproduction steps |
| Analysis inconclusive | Analyzer requests more evidence via iteration loop |
| Fix introduces regression | Verifier reports fail, coordinator dispatches re-fix |
| No issues found in test | Skip downstream tasks, report all-pass |
| Unknown command | Error with available command list |
| Role not found | Error with role registry |
