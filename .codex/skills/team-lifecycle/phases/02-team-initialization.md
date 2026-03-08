# Phase 2: Team Initialization

> **COMPACT PROTECTION**: This is an execution document. After context compression, phase instructions become summaries only. You MUST immediately re-read this file via `Read("~/~  or <project>/.codex/skills/team-lifecycle/phases/02-team-initialization.md")` before continuing. Never execute based on summaries.

## Objective

Create the session directory structure, initialize the state file (`team-session.json`), set up wisdom and exploration cache directories. No agents are spawned in this phase.

---

## Input

| Input | Source | Required |
|-------|--------|----------|
| requirements | Phase 1 output | Yes |
| requirements.mode | Finalized pipeline mode | Yes |
| requirements.scope | Project scope description | Yes |
| requirements.execution | sequential or parallel | Yes |
| Project root | Current working directory | Yes |

---

## Execution Steps

### Step 2.1: Generate Session ID

```javascript
// Generate slug from scope description (max 20 chars, kebab-case)
const slug = requirements.scope
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 20)

// Date in YYYY-MM-DD format
const date = new Date().toISOString().slice(0, 10)

const sessionId = `TLS-${slug}-${date}`
const sessionDir = `.workflow/.team/${sessionId}`
```

### Step 2.2: Create Directory Structure

```bash
mkdir -p "<session-dir>/spec/requirements"
mkdir -p "<session-dir>/spec/architecture"
mkdir -p "<session-dir>/spec/epics"
mkdir -p "<session-dir>/discussions"
mkdir -p "<session-dir>/plan/tasks"
mkdir -p "<session-dir>/explorations"
mkdir -p "<session-dir>/architecture"
mkdir -p "<session-dir>/analysis"
mkdir -p "<session-dir>/qa"
mkdir -p "<session-dir>/wisdom"
mkdir -p "<session-dir>/.msg"
```

**Directory purpose reference**:

| Directory | Purpose | Written By |
|-----------|---------|-----------|
| spec/ | Specification artifacts (briefs, PRDs, architecture, epics) | analyst, writer |
| discussions/ | Discussion records from inline discuss subagent | discuss subagent |
| plan/ | Implementation plan and task breakdown | planner |
| explorations/ | Shared codebase exploration cache | explore subagent |
| architecture/ | Architect assessments, design tokens | architect |
| analysis/ | Analyst design intelligence (UI mode) | analyst |
| qa/ | QA audit reports | fe-qa |
| wisdom/ | Cross-task knowledge accumulation | all agents |
| .msg/ | Message bus: meta.json (pipeline metadata) + messages.jsonl (event log) | orchestrator |

### Step 2.3: Initialize Wisdom Directory

Create the four wisdom files with empty starter content:

```javascript
// learnings.md
Write("<session-dir>/wisdom/learnings.md",
  "# Learnings\n\nPatterns and insights discovered during this session.\n")

// decisions.md
Write("<session-dir>/wisdom/decisions.md",
  "# Decisions\n\nArchitecture and design decisions made during this session.\n")

// conventions.md
Write("<session-dir>/wisdom/conventions.md",
  "# Conventions\n\nCodebase conventions identified during this session.\n")

// issues.md
Write("<session-dir>/wisdom/issues.md",
  "# Issues\n\nKnown risks and issues flagged during this session.\n")
```

### Step 2.4: Initialize Explorations Cache

```javascript
Write("<session-dir>/explorations/cache-index.json",
  JSON.stringify({ entries: [] }, null, 2))
```

### Step 2.5: Initialize Shared Memory

```javascript
Write("<session-dir>/shared-memory.json",
  JSON.stringify({
    design_intelligence: null,
    design_token_registry: null,
    component_inventory: null,
    style_decisions: null,
    qa_history: null,
    industry_context: null,
    exploration_cache: null
  }, null, 2))
```

### Step 2.6: Determine Task Counts

Compute expected task counts based on mode:

| Mode | Tasks | Pipeline Composition |
|------|-------|---------------------|
| spec-only | 6 | Spec pipeline (6) |
| impl-only | 4 | Impl pipeline (4) |
| fe-only | 3 | FE pipeline (3) + possible GC loop tasks |
| fullstack | 6 | Fullstack pipeline (6) |
| full-lifecycle | 10 | Spec (6) + Impl (4) |
| full-lifecycle-fe | 12 | Spec (6) + Fullstack (6) + possible GC loop tasks |

### Step 2.7: Write State File (team-session.json)

```javascript
const state = {
  session_id: sessionId,
  mode: requirements.mode,
  scope: requirements.scope,
  focus: requirements.focus || [],
  depth: requirements.depth || "normal",
  execution: requirements.execution || "parallel",
  status: "active",
  started_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  tasks_total: taskCount,       // from Step 2.6
  tasks_completed: 0,
  pipeline: [],                  // populated in Phase 3
  active_agents: [],
  completed_tasks: [],
  revision_chains: {},
  wisdom_entries: [],
  checkpoints_hit: [],
  gc_loop_count: 0,
  frontend_detected: requirements.frontend_detected || false,
  spec_path: requirements.spec_path || null,
  raw_input: requirements.raw_input
}

Write("<session-dir>/team-session.json",
  JSON.stringify(state, null, 2))
```

### Step 2.8: Initialize Message Bus (CRITICAL for UI)

Initialize `.msg/meta.json` with pipeline metadata so the frontend can display dynamic pipeline stages. This is the **same format** used by the Claude version's `team_msg` tool with `type: "state_update"`.

**pipeline_stages**: Array of role names representing pipeline stages. The UI displays these as the pipeline workflow visualization.

```javascript
// Determine pipeline_stages and roles based on mode
const PIPELINE_CONFIG = {
  "spec-only":          { stages: ["analyst", "writer", "reviewer"],                                                    roles: ["coordinator", "analyst", "writer", "reviewer"] },
  "impl-only":          { stages: ["planner", "executor", "tester", "reviewer"],                                        roles: ["coordinator", "planner", "executor", "tester", "reviewer"] },
  "fe-only":            { stages: ["planner", "fe-developer", "fe-qa"],                                                 roles: ["coordinator", "planner", "fe-developer", "fe-qa"] },
  "fullstack":          { stages: ["planner", "executor", "fe-developer", "tester", "fe-qa", "reviewer"],               roles: ["coordinator", "planner", "executor", "fe-developer", "tester", "fe-qa", "reviewer"] },
  "full-lifecycle":     { stages: ["analyst", "writer", "planner", "executor", "tester", "reviewer"],                   roles: ["coordinator", "analyst", "writer", "planner", "executor", "tester", "reviewer"] },
  "full-lifecycle-fe":  { stages: ["analyst", "writer", "planner", "executor", "fe-developer", "tester", "fe-qa", "reviewer"], roles: ["coordinator", "analyst", "writer", "planner", "executor", "fe-developer", "tester", "fe-qa", "reviewer"] }
}

const config = PIPELINE_CONFIG[requirements.mode]

// Write meta.json (read by API for frontend pipeline display)
const meta = {
  status: "active",
  pipeline_mode: requirements.mode,
  pipeline_stages: config.stages,
  roles: config.roles,
  team_name: "lifecycle",
  updated_at: new Date().toISOString()
}

Write("<session-dir>/.msg/meta.json", JSON.stringify(meta, null, 2))

// Initialize messages.jsonl with session init event
const initMsg = {
  id: "MSG-001",
  ts: new Date().toISOString(),
  from: "coordinator",
  to: "coordinator",
  type: "state_update",
  summary: "Session initialized",
  data: {
    pipeline_mode: requirements.mode,
    pipeline_stages: config.stages,
    roles: config.roles,
    team_name: "lifecycle"
  }
}

Write("<session-dir>/.msg/messages.jsonl", JSON.stringify(initMsg) + "\n")
```

> **Why**: The frontend API reads `.msg/meta.json` to derive pipeline stages, roles, and team_name for the dynamic pipeline UI. Without this file, the UI falls back to hardcoded 4-stage pipeline or message inference which may be inaccurate.

### Step 2.9: Output Confirmation

```
[orchestrator] Phase 2: Session initialized
  Session ID: <session-id>
  Session directory: <session-dir>
  Mode: <mode> (<task-count> tasks)
  Scope: <scope-summary>
  Execution: <sequential | parallel>
  Message bus: .msg/meta.json initialized
```

---

## Output

| Output | Type | Destination |
|--------|------|-------------|
| sessionId | String | Passed to Phase 3 |
| sessionDir | String | Passed to Phase 3 |
| state | Object | Written to team-session.json, passed to Phase 3 |
| meta | Object | Written to .msg/meta.json (read by frontend API) |

---

## Success Criteria

- Session directory created with all subdirectories (including `.msg/`)
- Wisdom files initialized (4 files)
- Explorations cache-index.json created (empty entries)
- Shared-memory.json created
- team-session.json written with correct mode, scope, task count
- `.msg/meta.json` written with pipeline_stages, roles, team_name, pipeline_mode
- `.msg/messages.jsonl` initialized with session init event
- State file is valid JSON and readable

---

## Error Handling

| Error | Resolution |
|-------|------------|
| Directory already exists with same session ID | Append random suffix to slug to ensure uniqueness |
| Write permission denied | Report error, suggest alternative directory |
| Disk space insufficient | Report error, suggest cleanup |
| Invalid mode in requirements | Should not happen (Phase 1 validates), but fail with message |

---

## Next Phase

Proceed to [Phase 3: Task Chain Creation](03-task-chain-creation.md) with `sessionId`, `sessionDir`, and `state`.
