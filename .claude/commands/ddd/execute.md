---
name: execute
description: Document-aware execution engine — executes plan.json + TASK-*.json with doc-index context enrichment, per-batch impact verification, and post-completion doc sync.
argument-hint: "[-y|--yes] [--skip-sync] [--skip-verify] [--plan <path>] [--in-memory] \"optional task description\""
allowed-tools: TodoWrite(*), Agent(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*), mcp__ace-tool__search_context(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-confirm all decisions, auto-sync after completion.

# DDD Execute Command (/ddd:execute)

## Purpose

Same execution engine model as lite-execute, but each step is **doc-index-aware**:
- Tasks are enriched with feature context, component docs, and architecture constraints
- Per-batch impact verification ensures changes stay within planned scope
- Post-completion automatically syncs the document index

### Core Differentiator
Unlike generic execution engines, ddd:execute leverages the document architecture:
- Feature-maps provide business context for each task
- Tech-registry provides implementation patterns to follow
- ADRs surface as hard constraints during execution
- Requirement acceptance criteria inform convergence verification

## Prerequisite

- `plan.json` + `.task/TASK-*.json` files from `/ddd:plan`
- `doc-index.json` at `.workflow/.doc-index/doc-index.json`
- If `--in-memory`: receives executionContext from `/ddd:plan` handoff

---

## Step 1: Initialize & Load Context

### 1.1 Locate Plan

```
IF --in-memory:
  Load executionContext from ddd:plan handoff
  plan_path = executionContext.plan_path
  task_dir = executionContext.task_dir
ELIF --plan <path>:
  plan_path = <path>
  task_dir = {dirname(path)}/.task/
ELSE:
  Scan .workflow/.doc-index/planning/ for most recent session
  plan_path = {latest_session}/plan.json
  task_dir = {latest_session}/.task/
```

### 1.2 Load Plan & Tasks

- Read `plan.json` — validate against plan-overview-base-schema
- Read all `TASK-*.json` from `.task/` directory — validate against task-schema
- Read `doc-index.json` from `.workflow/.doc-index/`

### 1.3 Pre-Load Doc Context

For each task with `doc_context`:
- Load referenced `feature_docs` (feature-maps/{slug}.md)
- Load referenced `component_docs` (tech-registry/{slug}.md)
- Load ADR excerpts from doc-index `architectureDecisions[]`
- Extract requirement acceptance criteria from doc-index `requirements[]`
- Load `doc_context.symbol_docs[]` documentation content (if present)

### 1.4 Echo Strategy

Display execution summary:

```
DDD Execute: {plan.summary}
Complexity: {plan.complexity}
Tasks: {plan.task_count}

Doc-Index Impact:
  Features: {doc_context.affected_features}
  Requirements: {doc_context.affected_requirements}
  Components: {doc_context.affected_components}
  Constraints: {doc_context.architecture_constraints}

Execution plan: {batch count} batches, {parallel tasks} parallel where possible
```

---

## Step 2: Task Grouping & Batch Creation

### 2.1 Extract Dependencies

From each `TASK-*.json`, read `depends_on[]` to build dependency graph.

### 2.2 Group into Batches

```
Batch 1: Tasks with no dependencies (depends_on: [])
Batch 2: Tasks depending only on Batch 1 tasks
Batch 3: Tasks depending on Batch 1 + 2 tasks
...
```

Within each batch, tasks with the same `parallel_group` can run concurrently.

### 2.3 Assign Executor per Task

| Signal | Executor |
|--------|----------|
| `meta.execution_config.method == "cli"` | CLI tool (gemini/codex/qwen) |
| `meta.execution_config.method == "agent"` | Agent (code-developer/universal-executor) |
| Default | Agent (code-developer) |

---

## Step 3: Doc-Enriched Execution

For each task in batch order, build an enriched prompt:

### 3.1 Task Prompt Template

```markdown
## Goal
${plan.summary} — specifically: ${task.title}

## Document Context

### Feature: ${feature.name} (${feature.id})
${feature-map content excerpt — overview + requirements section}

### Components
${for each component in task.doc_context.component_ids:
  tech-registry excerpt — responsibility + code locations + key patterns}

### Symbol Documentation
${if doc_context.symbol_docs is non-empty:
  for each component in doc_context.component_ids:
    #### ${component.name} Symbols (Top-5)
    ${for each symbol in component.symbol_docs.slice(0, 5):
      - **${symbol.name}** (${symbol.type}): ${symbol.doc_summary}
        Source: `${symbol.source_path}` | Freshness: ${symbol.freshness}
    }
}

### Architecture Constraints
${for each ADR in task.doc_context.adr_ids:
  ADR title + decision + rationale from doc-index}

### Requirement Acceptance Criteria
${for each requirement in task.doc_context.requirement_ids:
  requirement title + priority + success criteria from doc-index}

## Task Details
${task.description}

### Files to Modify
${task.files[] — path, action, changes}

### Implementation Steps
${task.implementation[] — step-by-step guide}

## Done When
${task.convergence.criteria[]}
${task.convergence.verification}
```

### 3.2 Execute Task

**Agent execution**:
```
Agent(subagent_type="code-developer", prompt="{enriched prompt}")
```

**CLI execution**:
```bash
ccw cli -p "{enriched prompt}" --tool {cli_tool} --mode write
```

### 3.3 Record & Persist Result

After each task completes:
- Update `TASK-*.json` with `status`, `executed_at`, `result`
- Track `result.files_modified` for impact verification
- **Persist** result to `TASK-{id}.result.json` alongside the task file:

```json
{
  "task_id": "TASK-001",
  "status": "completed|failed",
  "executed_at": "ISO8601",
  "executor": "code-developer|gemini|codex",
  "files_modified": [
    { "path": "src/services/auth.ts", "action": "modified", "symbols_changed": ["AuthService.validate"] },
    { "path": "src/routes/login.ts", "action": "created", "symbols_changed": ["loginRoute"] }
  ],
  "convergence_result": {
    "criteria_met": ["Rate limiter middleware exists"],
    "criteria_unmet": [],
    "verification_output": "test output snippet..."
  },
  "error": null
}
```

This file serves as the durable handoff between execute and sync — survives process interruptions.

---

## Step 4: Per-Batch Impact Verification

After each batch completes (unless `--skip-verify`):

### 4.1 Trace Changed Files

For each file modified in the batch:
```
changed_file → match to doc-index.technicalComponents[].codeLocations[].path
  → component_ids → featureIds → requirementIds
```

### 4.2 Scope Verification

Compare actual impact to planned impact:

```
Planned scope:
  Features: [feat-auth]
  Components: [tech-auth-service, tech-user-model]

Actual impact:
  Features: [feat-auth]              ← OK, within scope
  Components: [tech-auth-service, tech-user-model, tech-email-service]
                                     ← WARNING: tech-email-service not in plan
```

### 4.3 Flag Unexpected Impact

If changes affect features/components NOT in `plan.doc_context`:
- **Warning**: Display unexpected impact
- **No -y**: Ask user to confirm continuation
- **With -y**: Log warning, continue execution

### 4.4 Skip Conditions

Skip verification when:
- `--skip-verify` flag is set
- Only 1 batch (no intermediate verification needed for simple plans)

---

## Step 4.5: Post-Execution Verify Gate

After all batches complete, before doc sync (unless `--skip-verify`):

### 4.5.1 Convergence Verification

For each completed task with `convergence.verification`:
```
Execute: {task.convergence.verification}
  → e.g., "npm test -- --grep rate-limit"
Record: pass/fail → update TASK-{id}.result.json.convergence_result
```

### 4.5.2 Build & Lint Check

```
Run project build command (if configured):
  → npm run build / tsc --noEmit / etc.
Run project lint command (if configured):
  → npm run lint / eslint src/ / etc.
```

If build or lint fails:
- **No -y**: Display errors, ask user: fix now / continue anyway / abort
- **With -y**: Log warning, continue (non-blocking)

### 4.5.3 Regression Test

```
Run project test suite:
  → npm test / pytest / etc.
Compare: test results before execution (baseline) vs after
```

If tests fail:
- **No -y**: Display failures, ask user: fix now / skip sync / abort
- **With -y**: Log failures as warning in execution results, continue

### 4.5.4 Verify Summary

```
Verify Gate Results:
  Convergence: {passed}/{total} tasks verified
  Build: pass|fail|skipped
  Lint: pass|fail|skipped
  Tests: {passed}/{total} ({new_failures} regressions)

  Gate: PASS / WARN (continue with warnings) / FAIL (blocked)
```

### 4.5.5 Persist Verify Manifest

Write `execution-manifest.json` to session folder:

```json
{
  "session_id": "{session-id}",
  "plan_path": "planning/{slug}/plan.json",
  "completed_at": "ISO8601",
  "tasks": [
    {
      "task_id": "TASK-001",
      "status": "completed",
      "result_file": ".task/TASK-001.result.json"
    }
  ],
  "files_modified": [
    { "path": "src/services/auth.ts", "action": "modified", "task_id": "TASK-001" },
    { "path": "src/routes/login.ts", "action": "created", "task_id": "TASK-001" }
  ],
  "verify": {
    "convergence": { "passed": 2, "total": 2 },
    "build": "pass",
    "lint": "pass",
    "tests": { "passed": 42, "total": 42, "regressions": 0 },
    "gate": "PASS"
  }
}
```

This manifest is the **single source of truth** consumed by `ddd:sync --from-manifest`.

---

## Step 5: Post-Completion Doc Sync

After all batches complete (unless `--skip-sync`):

### 5.1 Auto-Trigger ddd:sync

```
Invoke /ddd:sync [-y] --task-id {session-id} --from-manifest {session}/execution-manifest.json "{plan.summary}"
```

Note: `/ddd:sync` automatically creates a backup of `doc-index.json` before modifications.

When `--from-manifest` is provided, sync uses the **execution manifest** as its primary data source instead of git diff. This ensures:
- Precise file-level and symbol-level change tracking (from TASK-*.result.json)
- Task-to-file attribution (which task modified which file)
- Convergence verification results carried forward
- Survives process interruptions (manifest is persisted to disk)

Fallback: If manifest is unavailable (e.g., manual mode), sync falls back to git diff discovery.

### 5.2 Generate Action Log

Create action entry with:
- All tasks executed and their results
- Files modified across all batches
- Features and requirements addressed

### 5.3 Update Feature Status

Based on execution results:
- Requirements with verified convergence → update status
- Features with all requirements met → `status: "implemented"`

---

## Step 6: Summary & Follow-up

### 6.1 Execution Results

```
DDD Execute Complete

Tasks: {completed}/{total} ({failed} failed)
Files modified: {count}
Batches: {batch_count}

Doc-Index Changes:
  Features updated: {list}
  Components updated: {list}
  New components registered: {list}
  Requirements addressed: {list}

Convergence:
  {for each task: task.id — criteria met: X/Y}
```

### 6.2 Follow-up Suggestions

Based on execution results, suggest:
- **New issues**: If unexpected scope expansion was detected
- **Additional tests**: If convergence criteria only partially met
- **Documentation gaps**: If new components were created without docs
- **Next tasks**: If plan had tasks marked as future/deferred

---

## Flags

| Flag | Effect |
|------|--------|
| `-y, --yes` | Auto-confirm, auto-sync |
| `--skip-sync` | Skip post-completion ddd:sync (Step 5) |
| `--skip-verify` | Skip per-batch impact verification (Step 4) AND post-execution verify gate (Step 4.5) |
| `--plan <path>` | Explicit plan.json path |
| `--in-memory` | Accept executionContext from ddd:plan handoff |

## Integration Points

- **Input from**: `/ddd:plan` output (plan.json + TASK-*.json), `doc-index.json`
- **Output to**: Updated `doc-index.json` (via ddd:sync), `TASK-*.result.json` (per-task), `execution-manifest.json` (session-level)
- **Schemas**: `plan-overview-ddd-schema.json` (input), `task-schema.json` + `task-ddd-extension-schema.json` (input), `doc-index.json` (enrichment)
- **Delegates to**: `/ddd:sync` for post-completion synchronization
