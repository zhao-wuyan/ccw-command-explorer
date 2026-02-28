# Phase 5: Completion Report

> **COMPACT PROTECTION**: This is an execution document. After context compression, phase instructions become summaries only. You MUST immediately re-read this file via `Read("~/.codex/skills/team-lifecycle/phases/05-completion-report.md")` before continuing. Never execute based on summaries.

## Objective

Summarize pipeline results, list all deliverable artifacts, update session status to completed, close any remaining agents, and present the user with next-step options.

---

## Input

| Input | Source | Required |
|-------|--------|----------|
| sessionDir | Phase 2 output | Yes |
| state | team-session.json (final) | Yes |
| state.pipeline | All tasks with final status | Yes |
| state.mode | Pipeline mode | Yes |
| state.started_at | Session start timestamp | Yes |

---

## Execution Steps

### Step 5.1: Load Final State

```javascript
const state = JSON.parse(Read("<session-dir>/team-session.json"))
```

### Step 5.2: Agent Cleanup

Close any remaining active agents (defensive -- should be none at this point).

```javascript
for (const agentEntry of state.active_agents) {
  try {
    close_agent({ id: agentEntry.agent_id })
  } catch (e) {
    // Agent already closed, ignore
  }
}
state.active_agents = []
```

### Step 5.3: Compute Summary Statistics

```javascript
const totalTasks = state.pipeline.length
const completedTasks = state.pipeline.filter(t => t.status === "completed").length
const failedTasks = state.pipeline.filter(t => t.status === "failed").length
const partialTasks = state.pipeline.filter(t => t.status === "partial").length
const revisionTasks = state.pipeline.filter(t => t.revision_of !== null).length

const startTime = new Date(state.started_at)
const endTime = new Date()
const durationMs = endTime - startTime
const durationMin = Math.round(durationMs / 60000)

const successRate = totalTasks > 0
  ? Math.round((completedTasks / totalTasks) * 100)
  : 0
```

### Step 5.4: Collect Deliverable Artifacts

Scan completed tasks for artifact paths. Group by pipeline phase.

```javascript
const artifacts = {
  spec: [],
  plan: [],
  impl: [],
  test: [],
  review: [],
  discussions: [],
  qa: []
}

for (const task of state.pipeline) {
  if (task.status !== "completed" || !task.artifact_path) continue

  if (task.id.startsWith("RESEARCH") || task.id.startsWith("DRAFT") || task.id.startsWith("QUALITY")) {
    artifacts.spec.push({ task_id: task.id, path: task.artifact_path })
  } else if (task.id.startsWith("PLAN")) {
    artifacts.plan.push({ task_id: task.id, path: task.artifact_path })
  } else if (task.id.startsWith("IMPL") || task.id.startsWith("DEV-FE")) {
    artifacts.impl.push({ task_id: task.id, path: task.artifact_path })
  } else if (task.id.startsWith("TEST")) {
    artifacts.test.push({ task_id: task.id, path: task.artifact_path })
  } else if (task.id.startsWith("REVIEW")) {
    artifacts.review.push({ task_id: task.id, path: task.artifact_path })
  } else if (task.id.startsWith("QA-FE")) {
    artifacts.qa.push({ task_id: task.id, path: task.artifact_path })
  }
}

// Also collect discussion records
const discussionFiles = Glob("<session-dir>/discussions/*.md")
for (const df of discussionFiles) {
  artifacts.discussions.push({ path: df })
}
```

### Step 5.5: Collect Wisdom Summary

Read wisdom files to include key findings in the report.

```javascript
const wisdomSummary = {
  learnings: Read("<session-dir>/wisdom/learnings.md") || "(none)",
  decisions: Read("<session-dir>/wisdom/decisions.md") || "(none)",
  conventions: Read("<session-dir>/wisdom/conventions.md") || "(none)",
  issues: Read("<session-dir>/wisdom/issues.md") || "(none)"
}
```

### Step 5.6: Check for Consensus Warnings

Collect any consensus-blocked results across the pipeline.

```javascript
const consensusIssues = state.pipeline
  .filter(t => t.discuss_verdict === "consensus_blocked")
  .map(t => ({
    task_id: t.id,
    severity: t.discuss_severity,
    revision: t.revision_of ? `revised as ${state.revision_chains[t.revision_of]}` : null
  }))
```

### Step 5.7: Update Session Status

```javascript
state.status = "completed"
state.updated_at = new Date().toISOString()
state.completed_at = new Date().toISOString()

Write("<session-dir>/team-session.json",
  JSON.stringify(state, null, 2))
```

### Step 5.8: Output Completion Report

Format and display the final report to the user.

```
==============================================================
[orchestrator] PIPELINE COMPLETE
==============================================================

Session: <session-id>
Mode: <mode>
Duration: <duration-min> minutes
Progress: <completed>/<total> tasks (<success-rate>%)

--------------------------------------------------------------
TASK SUMMARY
--------------------------------------------------------------
| Task ID | Agent | Status | Discuss | Artifact |
|---------|-------|--------|---------|----------|
| RESEARCH-001 | analyst | V | DISCUSS-001: reached | spec/discovery-context.json |
| DRAFT-001 | writer | V | DISCUSS-002: reached | spec/product-brief.md |
| ... | ... | ... | ... | ... |

V=completed  X=failed  ~=partial  R=revision

--------------------------------------------------------------
DELIVERABLES
--------------------------------------------------------------

Specification:
  <artifact-list from artifacts.spec>

Plan:
  <artifact-list from artifacts.plan>

Implementation:
  <artifact-list from artifacts.impl>

Testing:
  <artifact-list from artifacts.test>

Review:
  <artifact-list from artifacts.review>

Discussions:
  <discussion-file-list>

QA:
  <artifact-list from artifacts.qa>

--------------------------------------------------------------
CONSENSUS NOTES
--------------------------------------------------------------
<if consensusIssues.length > 0>
  <for each issue>
    <task-id>: consensus_blocked (<severity>) <revision-note>
  <end>
<else>
  All discussions reached consensus.
<end>

--------------------------------------------------------------
WISDOM HIGHLIGHTS
--------------------------------------------------------------
Key learnings: <summary from wisdom/learnings.md>
Key decisions: <summary from wisdom/decisions.md>
Issues flagged: <summary from wisdom/issues.md>

--------------------------------------------------------------
NEXT STEPS
--------------------------------------------------------------
Available actions:
  1. Exit - session complete
  2. View artifacts - read specific deliverable files
  3. Extend - add more tasks to this pipeline
  4. New session - start a fresh lifecycle
  5. Generate lite-plan - create a lightweight implementation plan from spec

Session directory: <session-dir>
==============================================================
```

### Step 5.9: Handle User Response

After presenting the report, wait for user input.

| User Choice | Action |
|-------------|--------|
| exit / done | Final cleanup, orchestrator stops |
| view `<artifact-path>` | Read and display the specified artifact |
| extend `<description>` | Re-enter Phase 1 with extend context, resume session |
| new `<description>` | Start fresh Phase 1 (new session) |
| lite-plan | Generate implementation plan from completed spec |

For "extend": the orchestrator reads the existing session, appends new requirements, and re-enters Phase 3 to create additional tasks appended to the existing pipeline.

For "view": simply read the requested file and display contents, then re-present the next steps menu.

---

## Output

| Output | Type | Destination |
|--------|------|-------------|
| Completion report | Text | Displayed to user |
| Updated state | JSON | team-session.json with status="completed" |
| User choice | String | Determines post-pipeline action |

---

## Success Criteria

- All agents closed (no orphaned agents)
- State file updated to status="completed"
- All artifact paths verified (files exist)
- Completion report includes all task statuses
- Consensus issues documented
- Wisdom highlights extracted
- Next steps presented to user

---

## Error Handling

| Error | Resolution |
|-------|------------|
| State file read error | Attempt to reconstruct from available artifacts |
| Artifact file missing | Report as "(artifact missing)" in deliverables list |
| Agent close failure | Ignore (agent already closed) |
| Wisdom file empty | Report "(no entries)" for that category |
| User input not recognized | Re-present available options |

---

## Post-Pipeline

This is the final phase. The orchestrator either stops (exit) or loops back to an earlier phase based on user choice.

```
User choice routing:
  exit     -> orchestrator stops
  view     -> display file -> re-present Step 5.9
  extend   -> Phase 1 (with resume context) -> Phase 3 -> Phase 4 -> Phase 5
  new      -> Phase 1 (fresh) -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5
  lite-plan -> generate plan from spec artifacts -> present to user
```
