# Phase 3: Task Chain Creation

> **COMPACT PROTECTION**: This is an execution document. After context compression, phase instructions become summaries only. You MUST immediately re-read this file via `Read("~/.codex/skills/team-lifecycle/phases/03-task-chain-creation.md")` before continuing. Never execute based on summaries.

## Objective

Build the full pipeline task chain based on the selected mode, write all tasks to the state file (`team-session.json`). Each task entry contains its ID, owner agent, dependencies, description, and inline discuss metadata. No agents are spawned in this phase.

---

## Input

| Input | Source | Required |
|-------|--------|----------|
| sessionId | Phase 2 output | Yes |
| sessionDir | Phase 2 output | Yes |
| state | Phase 2 output (team-session.json) | Yes |
| state.mode | Pipeline mode | Yes |
| state.scope | Project scope | Yes |
| state.spec_path | Spec file path (impl-only) | Conditional |

---

## Execution Steps

### Step 3.1: Mode-to-Pipeline Routing

Select the pipeline definition based on mode.

| Mode | Pipeline | First Task | Checkpoint |
|------|----------|------------|------------|
| spec-only | Spec pipeline (6 tasks) | RESEARCH-001 | None |
| impl-only | Impl pipeline (4 tasks) | PLAN-001 | None |
| fe-only | FE pipeline (3 tasks) | PLAN-001 | None |
| fullstack | Fullstack pipeline (6 tasks) | PLAN-001 | None |
| full-lifecycle | Spec (6) + Impl (4) | RESEARCH-001 | After QUALITY-001 |
| full-lifecycle-fe | Spec (6) + Fullstack (6) | RESEARCH-001 | After QUALITY-001 |

### Step 3.2: Build Task Entries

For each task in the selected pipeline, create a task entry object.

**Task entry schema**:

```javascript
{
  id: "<TASK-ID>",
  owner: "<agent-role>",
  status: "pending",
  blocked_by: ["<dependency-task-id>", ...],
  description: "<task description>",
  inline_discuss: "<DISCUSS-NNN or null>",
  agent_id: null,
  artifact_path: null,
  discuss_verdict: null,
  discuss_severity: null,
  started_at: null,
  completed_at: null,
  revision_of: null,
  revision_count: 0,
  is_checkpoint_after: false
}
```

**Task description template** (every task gets this format):

```
<task-description-from-pipeline-table>
Session: <session-dir>
Scope: <scope>
InlineDiscuss: <DISCUSS-NNN or none>
```

### Step 3.3: Spec Pipeline Tasks

Used by: spec-only, full-lifecycle, full-lifecycle-fe

| # | ID | Owner | BlockedBy | Description | InlineDiscuss |
|---|-----|-------|-----------|-------------|---------------|
| 1 | RESEARCH-001 | analyst | (none) | Seed analysis and context gathering | DISCUSS-001 |
| 2 | DRAFT-001 | writer | RESEARCH-001 | Generate Product Brief | DISCUSS-002 |
| 3 | DRAFT-002 | writer | DRAFT-001 | Generate Requirements/PRD | DISCUSS-003 |
| 4 | DRAFT-003 | writer | DRAFT-002 | Generate Architecture Document | DISCUSS-004 |
| 5 | DRAFT-004 | writer | DRAFT-003 | Generate Epics and Stories | DISCUSS-005 |
| 6 | QUALITY-001 | reviewer | DRAFT-004 | 5-dimension spec quality + sign-off | DISCUSS-006 |

QUALITY-001 has `is_checkpoint_after: true` for full-lifecycle and full-lifecycle-fe modes (signals orchestrator to pause for user confirmation before impl phase).

### Step 3.4: Impl Pipeline Tasks

Used by: impl-only, full-lifecycle (PLAN-001 blockedBy QUALITY-001)

| # | ID | Owner | BlockedBy | Description | InlineDiscuss |
|---|-----|-------|-----------|-------------|---------------|
| 1 | PLAN-001 | planner | (none) | Multi-angle exploration and planning | none |
| 2 | IMPL-001 | executor | PLAN-001 | Code implementation | none |
| 3 | TEST-001 | tester | IMPL-001 | Test-fix cycles | none |
| 4 | REVIEW-001 | reviewer | IMPL-001 | 4-dimension code review | none |

For full-lifecycle mode: PLAN-001 `blocked_by` includes `QUALITY-001`.

TEST-001 and REVIEW-001 both depend on IMPL-001 and can run in parallel.

### Step 3.5: FE Pipeline Tasks

Used by: fe-only

| # | ID | Owner | BlockedBy | Description | InlineDiscuss |
|---|-----|-------|-----------|-------------|---------------|
| 1 | PLAN-001 | planner | (none) | Planning (frontend focus) | none |
| 2 | DEV-FE-001 | fe-developer | PLAN-001 | Frontend implementation | none |
| 3 | QA-FE-001 | fe-qa | DEV-FE-001 | 5-dimension frontend QA | none |

GC loop: if QA-FE-001 verdict is NEEDS_FIX, the orchestrator dynamically creates DEV-FE-002 and QA-FE-002 during Phase 4. These are NOT pre-created here.

### Step 3.6: Fullstack Pipeline Tasks

Used by: fullstack, full-lifecycle-fe (PLAN-001 blockedBy QUALITY-001)

| # | ID | Owner | BlockedBy | Description | InlineDiscuss |
|---|-----|-------|-----------|-------------|---------------|
| 1 | PLAN-001 | planner | (none) | Fullstack planning | none |
| 2 | IMPL-001 | executor | PLAN-001 | Backend implementation | none |
| 3 | DEV-FE-001 | fe-developer | PLAN-001 | Frontend implementation | none |
| 4 | TEST-001 | tester | IMPL-001 | Backend test-fix cycles | none |
| 5 | QA-FE-001 | fe-qa | DEV-FE-001 | Frontend QA | none |
| 6 | REVIEW-001 | reviewer | TEST-001, QA-FE-001 | Full code review | none |

IMPL-001 and DEV-FE-001 run in parallel (both depend only on PLAN-001).
TEST-001 and QA-FE-001 run in parallel (each depends on its respective impl).
REVIEW-001 is a sync barrier -- depends on both TEST-001 and QA-FE-001.

For full-lifecycle-fe: PLAN-001 `blocked_by` includes `QUALITY-001`.

### Step 3.7: Composite Mode Assembly

For composite modes, concatenate pipelines and adjust cross-pipeline dependencies.

**full-lifecycle** = Spec (6) + Impl (4):

```
Spec pipeline tasks (Step 3.3)
  +
Impl pipeline tasks (Step 3.4)
  with: PLAN-001.blocked_by = ["QUALITY-001"]
  with: QUALITY-001.is_checkpoint_after = true
```

**full-lifecycle-fe** = Spec (6) + Fullstack (6):

```
Spec pipeline tasks (Step 3.3)
  +
Fullstack pipeline tasks (Step 3.6)
  with: PLAN-001.blocked_by = ["QUALITY-001"]
  with: QUALITY-001.is_checkpoint_after = true
```

### Step 3.8: Impl-Only Pre-Check

If mode is `impl-only`, verify specification exists:

```
state.spec_path is set?
  +- YES -> read spec file -> include path in PLAN-001 description
  +- NO -> error: "impl-only requires existing spec"
```

Add to PLAN-001 description: `Spec: <spec-path>`

### Step 3.9: Write Pipeline to State File

```javascript
// Read current state
const state = JSON.parse(Read("<session-dir>/team-session.json"))

// Set pipeline
state.pipeline = taskEntries  // array of task entry objects from steps above
state.tasks_total = taskEntries.length
state.updated_at = new Date().toISOString()

// Write back
Write("<session-dir>/team-session.json",
  JSON.stringify(state, null, 2))
```

### Step 3.10: Validation

Before proceeding, validate the constructed pipeline.

| Check | Criteria | On Failure |
|-------|----------|-----------|
| Task count | Matches expected count for mode | Error with mismatch details |
| Dependencies | Every blocked_by reference exists as a task ID in the pipeline | Error with dangling reference |
| No cycles | Topological sort succeeds (no circular dependencies) | Error with cycle details |
| Owner assignment | Each task owner matches a valid agent from Agent Registry | Error with unknown agent |
| Unique IDs | No duplicate task IDs | Error with duplicate ID |
| Inline discuss | Spec tasks have correct DISCUSS-NNN assignment per round config | Warning if mismatch |
| Session reference | Every task description contains `Session: <session-dir>` | Fix missing references |

### Step 3.11: Output Confirmation

```
[orchestrator] Phase 3: Task chain created
  Mode: <mode>
  Tasks: <count>
  Pipeline:
    <task-id> (<owner>) [blocked_by: <deps>]
    <task-id> (<owner>) [blocked_by: <deps>]
    ...
  First ready task(s): <task-ids with empty blocked_by>
```

---

## Output

| Output | Type | Destination |
|--------|------|-------------|
| state (updated) | Object | Written to team-session.json |
| state.pipeline | Array | Task chain with all entries |
| Ready task IDs | Array | Tasks with empty blocked_by (passed to Phase 4) |

---

## Success Criteria

- Pipeline array written to state file with correct task count
- All dependencies are valid (no dangling, no cycles)
- Each task has owner, description, blocked_by, inline_discuss
- Composite modes have correct cross-pipeline dependencies
- Spec tasks have inline discuss metadata
- At least one task has empty blocked_by (pipeline can start)

---

## Error Handling

| Error | Resolution |
|-------|------------|
| Unknown mode | Should not happen (Phase 1 validates), fail with supported mode list |
| Missing spec for impl-only | Error, suggest spec-only or full-lifecycle |
| Dependency cycle detected | Report cycle, halt pipeline creation |
| State file read/write error | Report error, suggest re-initialization |
| Duplicate task ID | Skip duplicate, log warning |

---

## Next Phase

Proceed to [Phase 4: Pipeline Coordination](04-pipeline-coordination.md) with the ready task IDs.
