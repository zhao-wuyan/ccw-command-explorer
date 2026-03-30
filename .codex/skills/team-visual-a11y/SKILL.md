---
name: team-visual-a11y
description: Unified team skill for visual accessibility QA. OKLCH color contrast, typography readability, focus management, WCAG AA/AAA audit at rendered level. Uses team-worker agent architecture. Triggers on "team visual a11y", "accessibility audit", "visual a11y".
allowed-tools: spawn_agent(*), wait_agent(*), send_message(*), assign_task(*), close_agent(*), list_agents(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*), mcp__ccw-tools__read_file(*), mcp__ccw-tools__write_file(*), mcp__ccw-tools__edit_file(*), mcp__ccw-tools__team_msg(*), mcp__chrome-devtools__evaluate_script(*), mcp__chrome-devtools__take_screenshot(*), mcp__chrome-devtools__emulate(*), mcp__chrome-devtools__lighthouse_audit(*), mcp__chrome-devtools__navigate_page(*), mcp__chrome-devtools__resize_page(*)
---

# Team Visual Accessibility

Deep visual accessibility QA: OKLCH-based perceptual color contrast, typography readability at all viewports, focus-visible completeness, WCAG AA/AAA audit at rendered level. Built on **team-worker agent architecture** -- all worker roles share a single agent definition with role-specific Phase 2-4 loaded from `roles/<role>/role.md`.

## Architecture

```
Skill(skill="team-visual-a11y", args="task description")
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
                    v       v       v       |
           [3 auditors spawn in PARALLEL]   |
        color-auditor  typo-auditor  focus-auditor
                    |       |       |
                    +---+---+---+---+
                        v
               remediation-planner
                        |
                        v
               fix-implementer (inner_loop)
                        |
                        v
               [re-audit: color + focus in PARALLEL]
```

## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | -- | -- |
| color-auditor | [roles/color-auditor/role.md](roles/color-auditor/role.md) | COLOR-* | false |
| typo-auditor | [roles/typo-auditor/role.md](roles/typo-auditor/role.md) | TYPO-* | false |
| focus-auditor | [roles/focus-auditor/role.md](roles/focus-auditor/role.md) | FOCUS-* | false |
| remediation-planner | [roles/remediation-planner/role.md](roles/remediation-planner/role.md) | REMED-* | false |
| fix-implementer | [roles/fix-implementer/role.md](roles/fix-implementer/role.md) | FIX-* | true |

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

- **Session prefix**: `VA`
- **Session path**: `.workflow/.team/VA-<slug>-<date>/`
- **team_name**: `visual-a11y`
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

### Parallel Fan-in Spawn (3 Auditors)

The 3 auditors run in parallel. Spawn all 3, then wait for all 3:

```javascript
// Spawn 3 auditors in parallel
spawn_agent({
  agent_type: "team_worker",
  task_name: "COLOR-001",
  fork_context: false,
  items: [
    { type: "text", text: `## Role Assignment
role: color-auditor
role_spec: ${skillRoot}/roles/color-auditor/role.md
session: ${sessionFolder}
session_id: ${sessionId}
requirement: ${colorTaskDescription}
inner_loop: false

Read role_spec file to load Phase 2-4 domain instructions.` },
    { type: "text", text: `## Task Context
task_id: COLOR-001
title: OKLCH Color Contrast Audit
description: ${colorTaskDescription}
pipeline_phase: audit` }
  ]
})

spawn_agent({
  agent_type: "team_worker",
  task_name: "TYPO-001",
  fork_context: false,
  items: [
    { type: "text", text: `## Role Assignment
role: typo-auditor
role_spec: ${skillRoot}/roles/typo-auditor/role.md
session: ${sessionFolder}
session_id: ${sessionId}
requirement: ${typoTaskDescription}
inner_loop: false

Read role_spec file to load Phase 2-4 domain instructions.` },
    { type: "text", text: `## Task Context
task_id: TYPO-001
title: Typography Readability Audit
description: ${typoTaskDescription}
pipeline_phase: audit` }
  ]
})

spawn_agent({
  agent_type: "team_worker",
  task_name: "FOCUS-001",
  fork_context: false,
  items: [
    { type: "text", text: `## Role Assignment
role: focus-auditor
role_spec: ${skillRoot}/roles/focus-auditor/role.md
session: ${sessionFolder}
session_id: ${sessionId}
requirement: ${focusTaskDescription}
inner_loop: false

Read role_spec file to load Phase 2-4 domain instructions.` },
    { type: "text", text: `## Task Context
task_id: FOCUS-001
title: Focus & Keyboard Accessibility Audit
description: ${focusTaskDescription}
pipeline_phase: audit` }
  ]
})

// Wait for ALL 3 auditors to complete
wait_agent({ targets: ["COLOR-001", "TYPO-001", "FOCUS-001"], timeout_ms: 900000 })

// Close all 3
close_agent({ target: "COLOR-001" })
close_agent({ target: "TYPO-001" })
close_agent({ target: "FOCUS-001" })

// Then spawn remediation-planner with all 3 audit results as upstream context
```

After spawning, use `wait_agent({ targets: [...], timeout_ms: 900000 })` to collect results, then `close_agent({ target })` each worker.

### Model Selection Guide

Visual accessibility is a precision pipeline where auditors need thorough analysis and fix-implementer needs careful code changes.

| Role | reasoning_effort | Rationale |
|------|-------------------|-----------|
| color-auditor | high | OKLCH calculations, contrast ratio precision |
| typo-auditor | high | Multi-breakpoint analysis, clamp() validation |
| focus-auditor | high | ARIA patterns, keyboard navigation completeness |
| remediation-planner | high | Synthesize 3 audit reports into actionable plan |
| fix-implementer | medium | Implementation follows defined remediation plan |

### Audit-to-Remediation Context Flow

All 3 audit findings must reach remediation-planner via coordinator's upstream context:
```
// After COLOR-001 + TYPO-001 + FOCUS-001 all complete, coordinator sends findings to planner
spawn_agent({
  agent_type: "team_worker",
  task_name: "REMED-001",
  fork_context: false,
  items: [
    ...,
    { type: "text", text: `## Upstream Context
Color audit: <session>/audits/color/color-audit-001.md
Typography audit: <session>/audits/typography/typo-audit-001.md
Focus audit: <session>/audits/focus/focus-audit-001.md` }
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
- [specs/oklch-standards.md](specs/oklch-standards.md) -- OKLCH color accessibility rules
- [specs/wcag-matrix.md](specs/wcag-matrix.md) -- WCAG 2.1 criteria matrix
- [specs/typography-scale.md](specs/typography-scale.md) -- Typography accessibility rules
- [specs/focus-patterns.md](specs/focus-patterns.md) -- Focus management patterns

## Session Directory

```
.workflow/.team/VA-<slug>-<date>/
+-- .msg/
|   +-- messages.jsonl         # Team message bus
|   +-- meta.json              # Pipeline config + GC state
+-- audits/
|   +-- color/                 # Color auditor output
|   |   +-- color-audit-001.md
|   +-- typography/            # Typography auditor output
|   |   +-- typo-audit-001.md
|   +-- focus/                 # Focus auditor output
|       +-- focus-audit-001.md
+-- remediation/               # Remediation planner output
|   +-- remediation-plan.md
+-- fixes/                     # Fix implementer output
|   +-- fix-summary-001.md
+-- re-audit/                  # Re-audit output (GC loop)
|   +-- color-audit-002.md
|   +-- focus-audit-002.md
+-- evidence/                  # Screenshots, traces
```

## v4 Agent Coordination

### Message Semantics

| Intent | API | Example |
|--------|-----|---------|
| Queue supplementary info (don't interrupt) | `send_message` | Send audit findings to running remediation-planner |
| Assign new work from reviewed plan | `assign_task` | Assign FIX task after remediation plan ready |
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
- `send_message({ target: "REMED-001", items: [...] })` -- send additional audit findings to remediation-planner
- `assign_task({ target: "FIX-001", items: [...] })` -- assign implementation from remediation plan
- `close_agent({ target: "COLOR-001" })` -- cleanup after color audit

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown command | Error with available command list |
| Role not found | Error with role registry |
| Session corruption | Attempt recovery, fallback to manual |
| Fast-advance conflict | Coordinator reconciles on next callback |
| Completion action fails | Default to Keep Active |
| GC loop stuck > 2 rounds | Escalate to user: accept / retry / terminate |
| Chrome DevTools unavailable | Degrade to static analysis only |
