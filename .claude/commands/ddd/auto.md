---
name: auto
description: Chain command - automated document-driven development flow. Detects project state and runs the appropriate chain for new or existing projects.
argument-hint: "[-y|--yes] [--skip-spec] [--skip-build] [--spec <session-id>] [--resume] \"project idea or task description\""
allowed-tools: TodoWrite(*), Agent(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*)
---

## Auto Mode

When `--yes` or `-y`: All sub-commands run in auto mode. Minimal human intervention.

# DDD Auto Command (/ddd:auto)

## Purpose

Orchestrate the full document-driven development lifecycle. **Adapts to project state** — works for both new projects and existing codebases.

## Flow Variants

### Variant 1: New Project (no code, no spec)
```
spec-generator → ddd:index-build → ddd:plan → ddd:execute → verify → ddd:sync
```

### Variant 2: Existing Project (has code, no spec)
```
ddd:scan → ddd:plan → ddd:execute → verify → ddd:sync
```

### Variant 3: Existing Project with Spec (has code + spec)
```
ddd:index-build → ddd:plan → ddd:execute → verify → ddd:sync
```

### Variant 4: Index Exists (has doc-index.json)
```
ddd:plan → ddd:execute → verify → ddd:sync
```

## Flow Diagram

```
┌────────────────────────────────────────────────────────────┐
│                       /ddd:auto                            │
│                                                            │
│  Stage 0: Detect Project State                             │
│  ┌───────────────────────────────────┐                     │
│  │ has_codebase? has_spec? has_index?│                     │
│  └────────────┬──────────────────────┘                     │
│               │                                            │
│    ┌──────────┼──────────────┐                             │
│    ▼          ▼              ▼                              │
│  No Code    Code Only    Code + Spec   Index Exists        │
│    │          │              │              │               │
│    ▼          │              │              │               │
│  Stage 1     │              │              │               │
│  Spec Gen    │              │              │               │
│    │          │              │              │               │
│    ▼          │              ▼              │               │
│  Stage 2a   Stage 2b    Stage 2a          │               │
│  index-build ddd:scan   index-build       │               │
│  (Path A or Path B auto-detected)          │               │
│    │                                       │               │
│    └───────────────────┬───────────────────┘               │
│                        ▼                                   │
│              Stage 3: DDD Plan (enhanced)                  │
│              (doc-index query + exploration +               │
│               clarification + task planning)               │
│                        │                                   │
│                        ▼                                   │
│              Stage 4: Execute                              │
│              (ddd:execute = doc-aware execution)            │
│                        │                                   │
│                        ▼                                   │
│              Stage 4.5: Verify Gate                        │
│              (convergence + build + lint + tests            │
│               → execution-manifest.json)                   │
│                        │                                   │
│                   PASS / WARN → continue                   │
│                   FAIL → ask user                          │
│                        │                                   │
│                        ▼                                   │
│              Stage 5: Doc Sync                             │
│              (auto-triggered with --from-manifest,          │
│               or manual /ddd:sync)                         │
└────────────────────────────────────────────────────────────┘
```

## Stage 0: Project State Detection

Automatically detect project state to determine which stages to run:

```
Check 1: doc-index.json exists?    → has_index
Check 2: SPEC-* directories exist? → has_spec
Check 3: Source code directories?   → has_codebase
Check 4: project-tech.json exists?  → has_tech_analysis
```

### Decision Matrix

| has_codebase | has_spec | has_index | Action |
|:---:|:---:|:---:|--------|
| No | No | No | Stage 1 (spec-gen) → Stage 2a (index-build) → Stage 3-5 |
| No | Yes | No | Stage 2a (index-build) → Stage 3-5 |
| Yes | No | No | **Stage 2b (ddd:scan)** → Stage 3-5 |
| Yes | Yes | No | Stage 2a (index-build) → Stage 3-5 |
| Yes | * | Yes | **Skip to Stage 3** (index exists) |

### Override Flags

| Flag | Effect |
|------|--------|
| `--skip-spec` | Never run spec-generator |
| `--skip-build` | Never run index-build |
| `--spec <id>` | Use specific spec session, force Path A |
| `--from-scratch` | Rebuild index even if exists |

## Stage 1: Specification (conditional)

### Run When
- No codebase AND no spec AND `--skip-spec` not set
- User provides a new project idea (not an existing task description)

### Skip When
- `--skip-spec` flag
- Codebase already exists (existing project)
- `--spec <id>` pointing to existing session

### Execution
```
Invoke /spec-generator with user input
→ Output: .workflow/.doc-index/specs/SPEC-{slug}-{date}/
```

## Stage 2: Index Construction (conditional)

### Run When
- `doc-index.json` does not exist
- OR `--from-scratch` flag

### Route Selection

```
Has spec outputs → Stage 2a: /ddd:index-build (spec-first)
No spec, has code → Stage 2b: /ddd:scan (code-first)
```

### Stage 2a: /ddd:index-build (has spec)
```
Invoke /ddd:index-build [-y] [-s <spec-id>]
→ Output: doc-index.json from spec entities + code mapping
```

### Stage 2b: /ddd:scan (no spec, has code)
```
Invoke /ddd:scan [-y]
→ Output: doc-index.json from code analysis + inferred features
```

### Skip When
- `--skip-build` flag
- `doc-index.json` exists AND NOT `--from-scratch`
  - In this case, suggest `/ddd:update` for incremental refresh

## Stage 3: Planning (always runs)

### Execution

```
Invoke /ddd:plan [-y] "task description"
```

The enhanced `/ddd:plan` now performs:
1. Doc-index query (instant context from features, requirements, components, ADRs)
2. Doc-index-guided exploration (1-4 angles based on affected features)
3. Clarification (aggregate ambiguities from exploration + doc-index gaps)
4. Task planning (plan.json + TASK-*.json with doc_context traceability)
5. Handoff selection

Output:
- `plan.json` — plan overview with doc_context
- `.task/TASK-*.json` — individual tasks with doc_context
- `exploration-{angle}.json` — exploration results (if Phase 2 ran)
- `planning-context.md` — legacy context package

### Handoff Decision

After planning, `/ddd:plan` presents execution options:

| Option | Description | Auto-Select When |
|--------|-------------|-----------------|
| **ddd:execute** | Document-aware execution (recommended) | Default in ddd workflow |
| **lite-execute** | Standard execution (no doc awareness) | When doc traceability not needed |
| **direct** | Start coding with context | User prefers manual |
| **stop** | Just the plan context | Planning/research only |

With `-y`: Auto-select `ddd:execute`.

## Stage 4: Execution

Based on Stage 3 handoff decision:

| Mode | Delegates To |
|------|-------------|
| **ddd:execute** | `/ddd:execute --in-memory` with plan.json + doc-index enrichment |
| lite-execute | `/workflow:lite-execute` with plan.json path |
| direct | Output context package, developer works manually |
| stop | End here, no execution |

### ddd:execute Features (when selected)
- Doc-enriched task prompts (feature context + component docs + ADR constraints)
- Per-batch impact verification (changes stay within planned scope)
- Result persistence (`TASK-*.result.json` per task, `execution-manifest.json` per session)
- Post-execution verify gate (Stage 4.5, unless `--skip-verify`)
- Post-completion auto-sync with manifest (Stage 5 triggered automatically)

**Note**: When using `ddd:execute`, Stage 4.5 and Stage 5 are auto-triggered. For other modes, run Stage 5 manually.

## Stage 4.5: Verify Gate

Embedded within `ddd:execute` (Step 4.5). Runs after all batches complete, before doc sync.

### Purpose

Quality gate ensuring execution output is correct before committing to documentation updates. Prevents bad code from being "blessed" into the doc-index.

### Checks Performed

| Check | Description | Gate Behavior |
|-------|-------------|---------------|
| **Convergence** | Run `task.convergence.verification` for each task | FAIL if any critical task fails |
| **Build** | Run project build command (`tsc --noEmit`, etc.) | FAIL on build errors |
| **Lint** | Run project linter (`eslint`, etc.) | WARN only (non-blocking) |
| **Regression** | Run full test suite, compare to baseline | FAIL on new test failures |

### Gate Results

| Result | Action |
|--------|--------|
| **PASS** | All checks passed → proceed to Stage 5 |
| **WARN** | Non-critical issues (lint warnings) → proceed with warnings logged |
| **FAIL** | Critical issues → ask user: fix now / skip sync / abort |
| **FAIL + `-y`** | Log failures, set `error_state` in session, stop |

### Output

- `execution-manifest.json` — persisted to session folder, consumed by Stage 5
- Contains: task results, files_modified (with task attribution), verify gate results

## Stage 5: Post-Task Sync

### Trigger
- **Auto**: `/ddd:execute` triggers `/ddd:sync --from-manifest` automatically after verify gate passes
- **Manual**: User runs `/ddd:sync` after completing work in direct/lite-execute mode
- **Resume**: `/ddd:auto --resume` after task completion

### Execution
```
# Auto mode (from ddd:execute): uses manifest for precise change tracking
Invoke /ddd:sync [-y] --task-id <id> --from-manifest {session}/execution-manifest.json "task summary"

# Manual mode (from direct/lite-execute): falls back to git diff
Invoke /ddd:sync [-y] [--task-id <id>] "task summary"

→ Updates: doc-index.json, feature-maps/, tech-registry/, action-logs/
```

## State Tracking

### Session File: `.workflow/.doc-index/.auto-session.json`

```json
{
  "session_id": "DAUTO-{timestamp}",
  "input": "user's original input",
  "detected_state": {
    "has_codebase": true,
    "has_spec": false,
    "has_index": false,
    "build_path": "code-first"
  },
  "stages_completed": ["detect", "index-build", "plan"],
  "current_stage": "execute",
  "spec_session": "SPEC-{slug}-{date}|null",
  "plan_session": "planning/{task-slug}-{date}/",
  "plan_context": "planning/{task-slug}-{date}/plan.json",
  "execution_mode": "ddd:execute|lite-execute|direct|stop",
  "execution_manifest": "planning/{task-slug}-{date}/execution-manifest.json|null",
  "verify_gate": "PASS|WARN|FAIL|null",
  "error_state": null,
  "last_error": {
    "stage": "execute",
    "message": "Task TASK-002 failed: compilation error",
    "timestamp": "ISO8601",
    "recoverable": true
  },
  "created_at": "ISO8601",
  "last_updated": "ISO8601"
}
```

### Resume
```
/ddd:auto --resume    → Resume from current_stage in .auto-session.json
```

### Error Recovery
```
/ddd:auto --resume
  IF error_state is set:
    Display last error context
    Ask: retry current stage / skip to next / abort
  ELSE:
    Resume from current_stage normally
```

## Example Workflows

### New Project (Full Flow)
```
/ddd:auto "Build a task management API with user auth and team features"
→ Stage 0: No code, no spec → need spec-gen
→ Stage 1: spec-generator produces full spec
→ Stage 2: index-build creates index from spec + empty codebase
→ Stage 3: ddd:plan produces plan.json + TASK-*.json with doc_context
→ Stage 4: ddd:execute runs tasks with feature context enrichment
→ Stage 4.5: verify gate — convergence ✓, build ✓, tests ✓ → PASS
→ Stage 5: ddd:sync --from-manifest auto-triggered, updates index
```

### Existing Project, No Spec (Code-First)
```
/ddd:auto "Add rate limiting to API endpoints"
→ Stage 0: Has code, no spec, no index
→ Stage 2b: ddd:scan analyzes code, infers features from codebase
→ Stage 3: ddd:plan queries index, explores with security + patterns angles
→ Stage 4: ddd:execute runs with rate-limit component docs as context
→ Stage 4.5: verify gate — convergence ✓, tests 41/42 (1 regression) → WARN
→ Stage 5: ddd:sync --from-manifest, registers new rate-limit component
```

### Existing Project with Index (Incremental)
```
/ddd:auto "Fix auth token expiration bug"
→ Stage 0: Has code, has index → skip to plan
→ Stage 3: ddd:plan finds feat-auth, REQ-002, tech-auth-service (Low complexity, skip exploration)
→ Stage 4: ddd:execute runs single task with auth feature context
→ Stage 4.5: verify gate — convergence ✓, build ✓, tests ✓ → PASS
→ Stage 5: ddd:sync --from-manifest, updates tech-auth-service code locations
```

### Planning Only
```
/ddd:auto "Investigate payment module architecture"
→ Stage 0-2: (as needed)
→ Stage 3: ddd:plan shows full context with exploration results
→ Stage 4: user selects "stop" → gets plan.json + context package only
```
