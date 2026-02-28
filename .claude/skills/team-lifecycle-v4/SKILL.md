---
name: team-lifecycle-v4
description: Unified team skill for full lifecycle - spec/impl/test. Optimized cadence with inline discuss subagent and shared explore. All roles invoke this skill with --role arg for role-specific execution. Triggers on "team lifecycle".
allowed-tools: TeamCreate(*), TeamDelete(*), SendMessage(*), TaskCreate(*), TaskUpdate(*), TaskList(*), TaskGet(*), Task(*), AskUserQuestion(*), TodoWrite(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Team Lifecycle v4

Unified team skill: specification -> implementation -> testing -> review. Optimized from v3 with **inline discuss subagent** and **shared explore utility**, halving spec pipeline beats from 12 to 6.

## Architecture

```
+---------------------------------------------------+
|  Skill(skill="team-lifecycle-v4")                  |
|  args="task description" or args="--role=xxx"      |
+-------------------+-------------------------------+
                    | Role Router
         +---- --role present? ----+
         | NO                      | YES
         v                         v
  Orchestration Mode         Role Dispatch
  (auto -> coordinator)      (route to role.md)
         |
    +----+----+-------+-------+-------+-------+
    v         v       v       v       v       v
 coordinator analyst writer planner executor tester
                                         ^        ^
                                on-demand by coordinator
                              +---------+ +--------+
                              |architect| |reviewer|
                              +---------+ +--------+
                              +-------------+ +-----+
                              |fe-developer | |fe-qa|
                              +-------------+ +-----+

  Subagents (callable by any role, not team members):
    [discuss-subagent]  - multi-perspective critique
    [explore-subagent]  - codebase exploration with cache
```

## Role Router

### Input Parsing

Parse `$ARGUMENTS` to extract `--role`. If absent -> Orchestration Mode (auto route to coordinator).

### Role Registry

| Role | File | Task Prefix | Type | Compact |
|------|------|-------------|------|---------|
| coordinator | [roles/coordinator/role.md](roles/coordinator/role.md) | (none) | orchestrator | compact must re-read |
| analyst | [roles/analyst/role.md](roles/analyst/role.md) | RESEARCH-* | pipeline | compact must re-read |
| writer | [roles/writer/role.md](roles/writer/role.md) | DRAFT-* | pipeline | compact must re-read |
| planner | [roles/planner/role.md](roles/planner/role.md) | PLAN-* | pipeline | compact must re-read |
| executor | [roles/executor/role.md](roles/executor/role.md) | IMPL-* | pipeline | compact must re-read |
| tester | [roles/tester/role.md](roles/tester/role.md) | TEST-* | pipeline | compact must re-read |
| reviewer | [roles/reviewer/role.md](roles/reviewer/role.md) | REVIEW-* + QUALITY-* | pipeline | compact must re-read |
| architect | [roles/architect/role.md](roles/architect/role.md) | ARCH-* | consulting (on-demand) | compact must re-read |
| fe-developer | [roles/fe-developer/role.md](roles/fe-developer/role.md) | DEV-FE-* | frontend pipeline | compact must re-read |
| fe-qa | [roles/fe-qa/role.md](roles/fe-qa/role.md) | QA-FE-* | frontend pipeline | compact must re-read |

> **COMPACT PROTECTION**: Role files are execution documents. After context compression, role instructions become summaries only -- **MUST immediately `Read` the role.md to reload before continuing**. Never execute any Phase based on summaries.

### Subagent Registry

| Subagent | Spec | Callable By | Purpose |
|----------|------|-------------|---------|
| discuss | [subagents/discuss-subagent.md](subagents/discuss-subagent.md) | analyst, writer, reviewer | Multi-perspective critique |
| explore | [subagents/explore-subagent.md](subagents/explore-subagent.md) | analyst, planner, any role | Codebase exploration with cache |
| doc-generation | [subagents/doc-generation-subagent.md](subagents/doc-generation-subagent.md) | writer | Document generation (CLI execution) |

### Dispatch

1. Extract `--role` from arguments
2. If no `--role` -> route to coordinator (Orchestration Mode)
3. Look up role in registry -> Read the role file -> Execute its phases

### Orchestration Mode

When invoked without `--role`, coordinator auto-starts. User just provides task description.

**Invocation**: `Skill(skill="team-lifecycle-v4", args="task description")`

**Lifecycle**:
```
User provides task description
  -> coordinator Phase 1-3: requirement clarification -> TeamCreate -> create task chain
  -> coordinator Phase 4: spawn first batch workers (background) -> STOP
  -> Worker executes -> SendMessage callback -> coordinator advances next step
  -> Loop until pipeline complete -> Phase 5 report
```

**User Commands** (wake paused coordinator):

| Command | Action |
|---------|--------|
| `check` / `status` | Output execution status graph, no advancement |
| `resume` / `continue` | Check worker states, advance next step |
| `revise <TASK-ID> [feedback]` | Create revision task for specified document + cascade downstream |
| `feedback <text>` | Analyze feedback impact, create targeted revision chain |
| `recheck` | Re-run QUALITY-001 quality check (after manual edits) |
| `improve [dimension]` | Auto-improve weakest dimension from readiness-report |

---

## Shared Infrastructure

The following templates apply to all worker roles. Each role.md only needs to write **Phase 2-4** role-specific logic.

### Worker Phase 1: Task Discovery (all workers shared)

Each worker on startup executes the same task discovery flow:

1. Call `TaskList()` to get all tasks
2. Filter: subject matches this role's prefix + owner is this role + status is pending + blockedBy is empty
3. No tasks -> idle wait
4. Has tasks -> `TaskGet` for details -> `TaskUpdate` mark in_progress

**Resume Artifact Check** (prevent duplicate output after resume):
- Check if this task's output artifacts already exist
- Artifacts complete -> skip to Phase 5 report completion
- Artifacts incomplete or missing -> normal Phase 2-4 execution

### Worker Phase 5: Report + Fast-Advance (all workers shared)

Task completion with optional fast-advance to skip coordinator round-trip:

1. **Message Bus**: Call `mcp__ccw-tools__team_msg` to log message
   - Params: operation="log", team=**<session-id>**, from=<role>, to="coordinator", type=<message-type>, summary="[<role>] <summary>", ref=<artifact-path>
   - **`team` must be session ID** (e.g., `TLS-my-project-2026-02-27`), NOT team name. Extract from task description `Session:` field → take folder name.
   - **CLI fallback**: `ccw team log --team <session-id> --from <role> --to coordinator --type <type> --summary "[<role>] ..." --json`
2. **TaskUpdate**: Mark task completed
3. **Fast-Advance Check**:
   - Call `TaskList()`, find pending tasks whose blockedBy are ALL completed
   - If exactly 1 ready task AND its owner matches a simple successor pattern -> **spawn it directly** (skip coordinator)
   - Otherwise -> **SendMessage** to coordinator for orchestration
4. **Loop**: Back to Phase 1 to check for next task

**Fast-Advance Rules**:

| Condition | Action |
|-----------|--------|
| 同前缀后续任务 (Inner Loop 角色) | 不 spawn，主 agent 内循环 (Phase 5-L) |
| 1 ready task, simple linear successor, 不同前缀 | Spawn directly via Task(run_in_background: true) |
| Multiple ready tasks (parallel window) | SendMessage to coordinator (needs orchestration) |
| No ready tasks + others running | SendMessage to coordinator (status update) |
| No ready tasks + nothing running | SendMessage to coordinator (pipeline may be complete) |
| Checkpoint task (e.g., spec->impl transition) | SendMessage to coordinator (needs user confirmation) |

**Fast-advance failure recovery**: If a fast-advanced task fails (worker exits without completing), the coordinator detects it as an orphaned in_progress task on next `resume`/`check` and resets it to pending for re-spawn. Self-healing, no manual intervention required. See [monitor.md](roles/coordinator/commands/monitor.md) Fast-Advance Failure Recovery.

### Worker Inner Loop (同前缀多任务角色)

适用角色：writer (DRAFT-*)、planner (PLAN-*)、executor (IMPL-*)

当一个角色拥有**同前缀的多个串行任务**时，不再每完成一个就 spawn 新 agent，而是在同一 agent 内循环处理：

**Inner Loop 流程**：

```
Phase 1: 发现任务 (首次)
  │
  ├─ 找到任务 → Phase 2-3: 加载上下文 + Subagent 执行
  │                │
  │                v
  │          Phase 4: 验证 (+ Inline Discuss if applicable)
  │                │
  │                v
  │          Phase 5-L: 轻量完成 (Loop variant)
  │                │
  │                ├─ TaskUpdate 标完成
  │                ├─ team_msg 记录
  │                ├─ 累积摘要到 context_accumulator
  │                │
  │                ├─ 检查：还有同前缀待处理任务？
  │                │   ├─ YES → 回到 Phase 1 (内循环)
  │                │   └─ NO → Phase 5-F: 最终报告
  │                │
  │                └─ 异常中断条件？
  │                    ├─ consensus_blocked HIGH → SendMessage → STOP
  │                    └─ 错误累计 ≥ 3 → SendMessage → STOP
  │
  └─ Phase 5-F: 最终报告 (Final)
       ├─ SendMessage (含全部任务摘要)
       └─ STOP
```

**context_accumulator** (主 agent 上下文中维护，不写文件):

每个 subagent 返回后，主 agent 将结果压缩为摘要追加到 accumulator：

```
context_accumulator = []

# DRAFT-001 subagent 返回后
context_accumulator.append({
  task: "DRAFT-001",
  artifact: "spec/product-brief.md",
  key_decisions: ["聚焦 B2B 场景", "MVP 不含移动端"],
  discuss_verdict: "consensus_reached",
  discuss_rating: 4.2
})

# DRAFT-002 subagent 返回后
context_accumulator.append({
  task: "DRAFT-002",
  artifact: "spec/requirements/_index.md",
  key_decisions: ["REQ-003 降级为 P2", "NFR-perf 新增 SLA"],
  discuss_verdict: "consensus_reached",
  discuss_rating: 3.8
})
```

后续 subagent 调用时，将 accumulator 摘要作为 CONTEXT 传入，实现知识传递。

**Phase 5-L vs Phase 5-F 区别**：

| 步骤 | Phase 5-L (循环中) | Phase 5-F (最终) |
|------|-------------------|-----------------|
| TaskUpdate completed | YES | YES |
| team_msg log | YES | YES |
| 累积摘要 | YES | - |
| SendMessage to coordinator | NO | YES (含所有任务汇总) |
| Fast-Advance 到下一前缀 | - | YES (检查跨前缀后续) |

**中断恢复**：

如果 Inner Loop agent 在 DRAFT-003 崩溃：
1. DRAFT-001, DRAFT-002 已落盘 + 已标完成 → 安全
2. DRAFT-003 状态为 in_progress → coordinator resume 时检测到无 active_worker → 重置为 pending
3. 重新 spawn writer → Phase 1 找到 DRAFT-003 → Resume Artifact Check:
   - DRAFT-003 产物不存在 → 正常执行
   - DRAFT-003 产物已写但未标完成 → 验证后标完成
4. 新 writer 从 DRAFT-003 开始循环，丢失的只是 001+002 的隐性摘要（可从磁盘重建基础信息）

**恢复增强** (可选)：在每个 Phase 5-L 后将 context_accumulator 写入 `<session>/shared-memory.json` 的 `context_accumulator` 字段，crash 后可读回。

### Inline Discuss Protocol (produce roles: analyst, writer, reviewer)

After completing their primary output, produce roles call the discuss subagent inline:

```
Task({
  subagent_type: "cli-discuss-agent",
  run_in_background: false,
  description: "Discuss <round-id>",
  prompt: <see subagents/discuss-subagent.md for prompt template>
})
```

**Discussion round mapping** (which role runs which discuss round):

| Role | After Task | Discuss Round | Perspectives |
|------|-----------|---------------|-------------|
| analyst | RESEARCH-001 | DISCUSS-001 | product, risk, coverage |
| writer | DRAFT-001 | DISCUSS-002 | product, technical, quality, coverage |
| writer | DRAFT-002 | DISCUSS-003 | quality, product, coverage |
| writer | DRAFT-003 | DISCUSS-004 | technical, risk |
| writer | DRAFT-004 | DISCUSS-005 | product, technical, quality, coverage |
| reviewer | QUALITY-001 | DISCUSS-006 | all 5 |

The discuss subagent writes its record to `discussions/` and returns the verdict. The calling role includes the discuss result in its Phase 5 report.

**Consensus-blocked handling** (produce role responsibility):

| Verdict | Severity | Role Action |
|---------|----------|-------------|
| consensus_reached | - | Include action items in report, proceed to Phase 5 |
| consensus_blocked | HIGH | SendMessage with `consensus_blocked=true, severity=HIGH`, include divergence details + action items. Coordinator creates revision task or pauses. |
| consensus_blocked | MEDIUM | SendMessage with `consensus_blocked=true, severity=MEDIUM`. Proceed to Phase 5 normally. Coordinator logs warning to wisdom. |
| consensus_blocked | LOW | Treat as consensus_reached with notes. Proceed normally. |

**SendMessage format for consensus_blocked**:

```
[<role>] <task-id> complete. Discuss <round-id>: consensus_blocked (severity=<HIGH|MEDIUM>)
Divergences: <divergence-summary>
Action items: <top-3-items>
Recommendation: <revise|proceed-with-caution|escalate>
```

**Coordinator response** (see monitor.md Consensus-Blocked Handling for full flow):
- HIGH -> revision task (max 1 per task) or pause for user decision
- MEDIUM -> proceed with warning, log to wisdom/issues.md
- DISCUSS-006 HIGH -> always pause for user (final sign-off gate)

### Shared Explore Utility

Any role needing codebase context calls the explore subagent:

```
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: "Explore <angle>",
  prompt: <see subagents/explore-subagent.md for prompt template>
})
```

**Cache**: Results stored in `explorations/` with `cache-index.json`. Before exploring, always check cache first. See [subagents/explore-subagent.md](subagents/explore-subagent.md).

### Wisdom Accumulation (all roles)

Cross-task knowledge accumulation. Coordinator creates `wisdom/` directory at session init.

**Directory**:
```
<session-folder>/wisdom/
+-- learnings.md      # Patterns and insights
+-- decisions.md      # Architecture and design decisions
+-- conventions.md    # Codebase conventions
+-- issues.md         # Known risks and issues
```

**Worker load** (Phase 2): Extract `Session: <path>` from task description, read wisdom files.
**Worker contribute** (Phase 4/5): Write discoveries to corresponding wisdom files.

### Role Isolation Rules

| Allowed | Prohibited |
|---------|-----------|
| Process own prefix tasks | Process other role's prefix tasks |
| SendMessage to coordinator | Directly communicate with other workers |
| Use tools declared in Toolbox | Create tasks for other roles |
| Call discuss/explore subagents | Modify resources outside own scope |
| Fast-advance simple successors | Spawn parallel worker batches |

Coordinator additionally prohibited: directly write/modify code, call implementation subagents, directly execute analysis/test/review.

---

## Pipeline Definitions

### Spec-only (6 tasks, was 12 in v3)

```
RESEARCH-001(+D1) -> DRAFT-001(+D2) -> DRAFT-002(+D3) -> DRAFT-003(+D4) -> DRAFT-004(+D5) -> QUALITY-001(+D6)
```

Each task includes inline discuss. `(+DN)` = inline discuss round N.

### Impl-only / Backend (4 tasks)

```
PLAN-001 -> IMPL-001 -> TEST-001 + REVIEW-001
```

### Full-lifecycle (10 tasks, was 16 in v3)

```
[Spec pipeline] -> PLAN-001(blockedBy: QUALITY-001) -> IMPL-001 -> TEST-001 + REVIEW-001
```

### Frontend Pipelines

```
FE-only:       PLAN-001 -> DEV-FE-001 -> QA-FE-001
               (GC loop: QA-FE verdict=NEEDS_FIX -> DEV-FE-002 -> QA-FE-002, max 2 rounds)

Fullstack:     PLAN-001 -> IMPL-001 || DEV-FE-001 -> TEST-001 || QA-FE-001 -> REVIEW-001

Full + FE:     [Spec pipeline] -> PLAN-001 -> IMPL-001 || DEV-FE-001 -> TEST-001 || QA-FE-001 -> REVIEW-001
```

### Cadence Control

**Beat model**: Event-driven, each beat = coordinator wake -> process -> spawn -> STOP.

```
Beat Cycle (single beat)
======================================================================
  Event                   Coordinator              Workers
----------------------------------------------------------------------
  callback/resume --> +- handleCallback -+
                      |  mark completed   |
                      |  check pipeline   |
                      +- handleSpawnNext -+
                      |  find ready tasks |
                      |  spawn workers ---+--> [Worker A] Phase 1-5
                      |  (parallel OK)  --+--> [Worker B] Phase 1-5
                      +- STOP (idle) -----+         |
                                                     |
  callback <-----------------------------------------+
  (next beat)              SendMessage + TaskUpdate(completed)
======================================================================

  Fast-Advance (skips coordinator for simple linear successors)
======================================================================
  [Worker A] Phase 5 complete
    +- 1 ready task? simple successor? --> spawn Worker B directly
    +- complex case? --> SendMessage to coordinator
======================================================================
```

**Pipeline beat view (v4 optimized)**:

```
Spec-only (6 beats, was 12 in v3)
-------------------------------------------------------
Beat  1         2         3         4         5         6
      |         |         |         |         |         |
    R1+D1 --> W1+D2 --> W2+D3 --> W3+D4 --> W4+D5 --> Q1+D6
    ^                                                     ^
  pipeline                                            sign-off
   start                                               pause

R=RESEARCH  W=DRAFT(writer)  Q=QUALITY  D=DISCUSS(inline)

Impl-only (3 beats, with parallel window)
-------------------------------------------------------
Beat  1         2              3
      |         |         +----+----+
      PLAN --> IMPL --> TEST || REVIEW    <-- parallel window
                         +----+----+
                           pipeline
                            done

Full-lifecycle (9 beats, was 15 in v3)
-------------------------------------------------------
Beat 1-6: [Spec pipeline as above]
                                    |
Beat 6 (Q1+D6 done):      PAUSE CHECKPOINT -- user confirms then resume
                                    |
Beat 7      8           9
 PLAN --> IMPL --> TEST || REVIEW

Fullstack (with dual parallel windows)
-------------------------------------------------------
Beat  1              2                    3                4
      |         +----+----+         +----+----+           |
      PLAN --> IMPL || DEV-FE --> TEST || QA-FE -->  REVIEW
              ^                ^                   ^
         parallel 1       parallel 2          sync barrier
```

**Checkpoints**:

| Trigger | Position | Behavior |
|---------|----------|----------|
| Spec->Impl transition | QUALITY-001 completed | Read readiness-report.md, extract gate + scores, display Checkpoint Output Template, pause for user action |
| GC loop max | QA-FE max 2 rounds | Stop iteration, report current state |
| Pipeline stall | No ready + no running | Check missing tasks, report to user |

**Checkpoint Output Template** (QUALITY-001 completion):

Coordinator reads `<session>/spec/readiness-report.md`, extracts gate + dimension scores, displays:

```
[coordinator] ══════════════════════════════════════════
[coordinator] SPEC PHASE COMPLETE
[coordinator] Quality Gate: <PASS|REVIEW|FAIL> (<score>%)
[coordinator]
[coordinator] Dimension Scores:
[coordinator]   Completeness:  <bar> <n>%
[coordinator]   Consistency:   <bar> <n>%
[coordinator]   Traceability:  <bar> <n>%
[coordinator]   Depth:         <bar> <n>%
[coordinator]   Coverage:      <bar> <n>%
[coordinator]
[coordinator] Available Actions:
[coordinator]   resume              → Proceed to implementation
[coordinator]   improve             → Auto-improve weakest dimension
[coordinator]   improve <dimension> → Improve specific dimension
[coordinator]   revise <TASK-ID>    → Revise specific document
[coordinator]   recheck             → Re-run quality check
[coordinator]   feedback <text>     → Inject feedback, create revision
[coordinator] ══════════════════════════════════════════
```

Gate-specific guidance:
- PASS: All actions available, resume is primary suggestion
- REVIEW: Recommend improve/revise before resume, warn on resume
- FAIL: Recommend improve/revise, do not suggest resume (user can force)

**Stall detection** (coordinator `handleCheck`):

| Check | Condition | Resolution |
|-------|-----------|-----------|
| Worker unresponsive | in_progress task with no callback | Report waiting tasks, suggest `resume` |
| Pipeline deadlock | no ready + no running + has pending | Check blockedBy chain, report blockage |
| GC loop exceeded | DEV-FE / QA-FE iteration > max_rounds | Terminate loop, output latest QA report |

### Task Metadata Registry

| Task ID | Role | Phase | Dependencies | Description | Inline Discuss |
|---------|------|-------|-------------|-------------|---------------|
| RESEARCH-001 | analyst | spec | (none) | Seed analysis and context gathering | DISCUSS-001 |
| DRAFT-001 | writer | spec | RESEARCH-001 | Generate Product Brief | DISCUSS-002 |
| DRAFT-002 | writer | spec | DRAFT-001 | Generate Requirements/PRD | DISCUSS-003 |
| DRAFT-003 | writer | spec | DRAFT-002 | Generate Architecture Document | DISCUSS-004 |
| DRAFT-004 | writer | spec | DRAFT-003 | Generate Epics & Stories | DISCUSS-005 |
| QUALITY-001 | reviewer | spec | DRAFT-004 | 5-dimension spec quality + sign-off | DISCUSS-006 |
| PLAN-001 | planner | impl | (none or QUALITY-001) | Multi-angle exploration and planning | - |
| IMPL-001 | executor | impl | PLAN-001 | Code implementation | - |
| TEST-001 | tester | impl | IMPL-001 | Test-fix cycles | - |
| REVIEW-001 | reviewer | impl | IMPL-001 | 4-dimension code review | - |
| DEV-FE-001 | fe-developer | impl | PLAN-001 | Frontend implementation | - |
| QA-FE-001 | fe-qa | impl | DEV-FE-001 | 5-dimension frontend QA | - |

## Coordinator Spawn Template

### 标准 Worker (单任务角色: analyst, tester, reviewer, architect)

When coordinator spawns workers, use background mode (Spawn-and-Stop):

```
Task({
  subagent_type: "general-purpose",
  description: "Spawn <role> worker",
  team_name: <team-name>,
  name: "<role>",
  run_in_background: true,
  prompt: `You are team "<team-name>" <ROLE>.

## Primary Instruction
All your work MUST be executed by calling Skill to get role definition:
Skill(skill="team-lifecycle-v4", args="--role=<role>")

Current requirement: <task-description>
Session: <session-folder>

## Role Guidelines
- Only process <PREFIX>-* tasks, do not execute other role work
- All output prefixed with [<role>] tag
- Only communicate with coordinator
- Do not use TaskCreate to create tasks for other roles
- Before each SendMessage, call mcp__ccw-tools__team_msg to log (team=<session-id> from Session field, NOT team name)
- After task completion, check for fast-advance opportunity (see SKILL.md Phase 5)

## Workflow
1. Call Skill -> get role definition and execution logic
2. Follow role.md 5-Phase flow
3. team_msg(team=<session-id>) + SendMessage results to coordinator
4. TaskUpdate completed -> check next task or fast-advance`
})
```

### Inner Loop Worker (多任务角色: writer, planner, executor)

```
Task({
  subagent_type: "general-purpose",
  description: "Spawn <role> worker (inner loop)",
  team_name: <team-name>,
  name: "<role>",
  run_in_background: true,
  prompt: `You are team "<team-name>" <ROLE>.

## Primary Instruction
All your work MUST be executed by calling Skill to get role definition:
Skill(skill="team-lifecycle-v4", args="--role=<role>")

Current requirement: <task-description>
Session: <session-folder>

## Inner Loop Mode
You will handle ALL <PREFIX>-* tasks in this session, not just the first one.
After completing each task, loop back to find the next <PREFIX>-* task.
Only SendMessage to coordinator when:
- All <PREFIX>-* tasks are done
- A consensus_blocked HIGH occurs
- Errors accumulate (≥ 3)

## Role Guidelines
- Only process <PREFIX>-* tasks, do not execute other role work
- All output prefixed with [<role>] tag
- Only communicate with coordinator
- Do not use TaskCreate to create tasks for other roles
- Before each SendMessage, call mcp__ccw-tools__team_msg to log (team=<session-id> from Session field, NOT team name)
- Use subagent calls for heavy work, retain summaries in context`
})
```

## Session Directory

```
.workflow/.team/TLS-<slug>-<date>/
+-- team-session.json           # Session state
+-- spec/                       # Spec artifacts
|   +-- spec-config.json
|   +-- discovery-context.json
|   +-- product-brief.md
|   +-- requirements/
|   +-- architecture/
|   +-- epics/
|   +-- readiness-report.md
|   +-- spec-summary.md
+-- discussions/                # Discussion records (written by discuss subagent)
+-- plan/                       # Plan artifacts
|   +-- plan.json
|   +-- .task/TASK-*.json
+-- explorations/               # Shared explore cache
|   +-- cache-index.json        # { angle+keywords_hash -> file_path }
|   +-- explore-<angle>.json
+-- architecture/               # Architect assessments + design-tokens.json
+-- analysis/                   # Analyst design-intelligence.json (UI mode)
+-- qa/                         # QA audit reports
+-- wisdom/                     # Cross-task knowledge
|   +-- learnings.md
|   +-- decisions.md
|   +-- conventions.md
|   +-- issues.md
+-- .msg/                       # Team message bus logs (messages.jsonl)
+-- shared-memory.json          # Cross-role state
```

## Session Resume

Coordinator supports `--resume` / `--continue` for interrupted sessions:

1. Scan `.workflow/.team/TLS-*/team-session.json` for active/paused sessions
2. Multiple matches -> AskUserQuestion for selection
3. Audit TaskList -> reconcile session state <-> task status
4. Reset in_progress -> pending (interrupted tasks)
5. Rebuild team and spawn needed workers only
6. Create missing tasks with correct blockedBy
7. Kick first executable task -> Phase 4 coordination loop

## Shared Spec Resources

| Resource | Path | Usage |
|----------|------|-------|
| Document Standards | [specs/document-standards.md](specs/document-standards.md) | YAML frontmatter, naming, structure |
| Quality Gates | [specs/quality-gates.md](specs/quality-gates.md) | Per-phase quality gates |
| Product Brief Template | [templates/product-brief.md](templates/product-brief.md) | DRAFT-001 |
| Requirements Template | [templates/requirements-prd.md](templates/requirements-prd.md) | DRAFT-002 |
| Architecture Template | [templates/architecture-doc.md](templates/architecture-doc.md) | DRAFT-003 |
| Epics Template | [templates/epics-template.md](templates/epics-template.md) | DRAFT-004 |
| Discuss Subagent | [subagents/discuss-subagent.md](subagents/discuss-subagent.md) | Inline discuss protocol |
| Explore Subagent | [subagents/explore-subagent.md](subagents/explore-subagent.md) | Shared exploration utility |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown --role value | Error with available role list |
| Missing --role arg | Orchestration Mode -> coordinator |
| Role file not found | Error with expected path |
| Command file not found | Fallback to inline execution |
| Discuss subagent fails | Role proceeds without discuss, logs warning |
| Explore cache corrupt | Clear cache, re-explore |
| Fast-advance spawns wrong task | Coordinator reconciles on next callback |
