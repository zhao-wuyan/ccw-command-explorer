---
name: team-review
description: "Unified team skill for code scanning, vulnerability review, optimization suggestions, and automated fix. 4-role team: coordinator, scanner, reviewer, fixer. Triggers on team-review."
allowed-tools: Task, AskUserQuestion, TaskCreate, TaskUpdate, TaskList, TaskGet, Read, Write, Edit, Bash, Glob, Grep, Skill, mcp__ace-tool__search_context
---

# Team Review

Unified team skill: code scanning, vulnerability review, optimization suggestions, and automated fix. All team members invoke with `--role=xxx` to route to role-specific execution.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Skill(skill="team-review")                                 │
│  args="<target>" or args="--role=xxx"                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ Role Router
                ┌──── --role present? ────┐
                │ NO                      │ YES
                ↓                         ↓
         Orchestration Mode         Role Dispatch
         (auto → coordinator)      (route to role.md)
                │
           ┌────┴────┬───────────┬───────────┐
           ↓         ↓           ↓           ↓
      ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
      │ coord  │ │scanner │ │reviewer│ │ fixer  │
      │ (RC-*) │ │(SCAN-*)│ │(REV-*) │ │(FIX-*) │
      └────────┘ └────────┘ └────────┘ └────────┘
```

## Role Router

### Input Parsing

Parse `$ARGUMENTS` to extract `--role`. If absent → Orchestration Mode (auto route to coordinator).

### Role Registry

| Role | File | Task Prefix | Type | Compact |
|------|------|-------------|------|---------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | RC-* | orchestrator | **⚠️ 压缩后必须重读** |
| scanner | [roles/scanner/role.md](roles/scanner/role.md) | SCAN-* | read-only-analysis | 压缩后必须重读 |
| reviewer | [roles/reviewer/role.md](roles/reviewer/role.md) | REV-* | read-only-analysis | 压缩后必须重读 |
| fixer | [roles/fixer/role.md](roles/fixer/role.md) | FIX-* | code-generation | 压缩后必须重读 |

> **⚠️ COMPACT PROTECTION**: 角色文件是执行文档，不是参考资料。当 context compression 发生后，角色指令仅剩摘要时，**必须立即 `Read` 对应 role.md 重新加载后再继续执行**。不得基于摘要执行任何 Phase。

### Dispatch

1. Extract `--role` from arguments
2. If no `--role` → route to coordinator (Orchestration Mode)
3. Look up role in registry → Read the role file → Execute its phases

### Orchestration Mode

When invoked without `--role`, coordinator auto-starts. User just provides target description.

**Invocation**: `Skill(skill="team-review", args="<target-path>")`

**Lifecycle**:
```
User provides scan target
  → coordinator Phase 1-3: Parse flags → TeamCreate → Create task chain
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

## Pipeline (CP-1 Linear)

```
coordinator dispatch
  → SCAN-* (scanner: toolchain + LLM scan)
  → REV-*  (reviewer: deep analysis + report)
  → [user confirm]
  → FIX-*  (fixer: plan + execute + verify)
```

### Cadence Control

**Beat model**: Event-driven, each beat = coordinator wake → process → spawn → STOP.

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
                      └─ STOP (idle) ─────┘         │
                                                     │
  callback ←─────────────────────────────────────────┘
  (next beat)              SendMessage + TaskUpdate(completed)
═══════════════════════════════════════════════════════════
```

**Pipeline beat view**:

```
Review Pipeline (3 beats, linear with user checkpoint)
──────────────────────────────────────────────────────────
Beat  1         2         ⏸         3
      │         │         │         │
      SCAN → REV ──→ [confirm] → FIX
      ▲                              ▲
   pipeline                       pipeline
    start                          done

SCAN=scanner  REV=reviewer  FIX=fixer
```

**Checkpoints**:

| Trigger | Location | Behavior |
|---------|----------|----------|
| Review→Fix transition | REV-* complete | Pause, present review report, wait for user `resume` to confirm fix |
| Quick mode (`-q`) | After SCAN-* | Pipeline ends after scan, no review/fix |
| Fix-only mode (`--fix`) | Entry | Skip scan/review, go directly to fixer |

**Stall Detection** (coordinator `handleCheck` executes):

| Check | Condition | Resolution |
|-------|-----------|------------|
| Worker no response | in_progress task no callback | Report waiting task list, suggest user `resume` |
| Pipeline deadlock | no ready + no running + has pending | Check blockedBy dependency chain, report blocking point |

### Task Metadata Registry

| Task ID | Role | Phase | Dependencies | Description |
|---------|------|-------|-------------|-------------|
| SCAN-001 | scanner | scan | (none) | Toolchain + LLM code scanning |
| REV-001 | reviewer | review | SCAN-001 | Deep analysis and review report |
| FIX-001 | fixer | fix | REV-001 + user confirm | Plan + execute + verify fixes |

---

## Shared Infrastructure

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
   - Parameters: operation="log", team="review", from=<role>, to="coordinator", type=<message-type>, summary="[<role>] <summary>", ref=<artifact-path>
   - **CLI fallback**: When MCP unavailable → `ccw team log --team review --from <role> --to coordinator --type <type> --summary "[<role>] ..." --json`
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
| Use tools declared in Toolbox | Create tasks for other roles |
| Delegate to commands/ files | Modify resources outside own responsibility |

Coordinator additional restrictions: Do not write/modify code directly, do not call implementation subagents, do not execute analysis/test/review directly.

| Component | Location |
|-----------|----------|
| Session directory | `.workflow/.team-review/<workflow_id>/` |
| Shared memory | `shared-memory.json` in session dir |
| Team config | `specs/team-config.json` |
| Finding schema | `specs/finding-schema.json` |
| Dimensions | `specs/dimensions.md` |

---

## Coordinator Spawn Template

When coordinator spawns workers, use Skill invocation:

```
Skill(skill="team-review", args="--role=scanner <target> <flags>")
Skill(skill="team-review", args="--role=reviewer --input <scan-output> <flags>")
Skill(skill="team-review", args="--role=fixer --input <fix-manifest> <flags>")
```

## Usage

```bash
# Via coordinator (auto pipeline)
Skill(skill="team-review", args="src/auth/**")                    # scan + review
Skill(skill="team-review", args="--full src/auth/**")             # scan + review + fix
Skill(skill="team-review", args="--fix .review/review-*.json")    # fix only
Skill(skill="team-review", args="-q src/auth/**")                 # quick scan only

# Direct role invocation
Skill(skill="team-review", args="--role=scanner src/auth/**")
Skill(skill="team-review", args="--role=reviewer --input scan-result.json")
Skill(skill="team-review", args="--role=fixer --input fix-manifest.json")

# Flags (all modes)
--dimensions=sec,cor,perf,maint    # custom dimensions (default: all 4)
-y / --yes                         # skip confirmations
-q / --quick                       # quick scan mode
--full                             # full pipeline (scan → review → fix)
--fix                              # fix mode only
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown --role value | Error with available role list |
| Missing --role arg | Orchestration Mode → auto route to coordinator |
| Role file not found | Error with expected file path (roles/<name>/role.md) |
| Invalid flags | Warn and continue with defaults |
| No target specified (no --role) | AskUserQuestion to clarify |

## Execution Rules

1. **Parse first**: Extract --role and flags from $ARGUMENTS before anything else
2. **Progressive loading**: Read ONLY the matched role.md, not all four
3. **Full delegation**: Role.md owns entire execution -- do not add logic here
4. **Self-contained**: Each role.md includes its own message bus, task lifecycle, toolbox
5. **DO NOT STOP**: Continuous execution until role completes all 5 phases
