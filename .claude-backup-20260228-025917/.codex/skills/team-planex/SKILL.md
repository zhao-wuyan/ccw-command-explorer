---
name: team-planex
description: |
  Beat pipeline: planner decomposes requirements issue-by-issue, orchestrator spawns
  Codex executor per issue immediately. All execution via Codex CLI only.
---

# Team PlanEx (Codex)

逐 Issue 节拍流水线。Planner 每完成一个 issue 的 solution 立即输出 `ISSUE_READY` 信号，Orchestrator 即刻 spawn 独立 Codex executor 并行实现，无需等待 planner 完成全部规划。

## Architecture

```
Input (Issue IDs / --text / --plan)
  → Orchestrator: parse input → init session → spawn planner
  → Beat loop:
      wait(planner) → ISSUE_READY:{issueId} → spawn_agent(executor)
                   → send_input(planner, "Continue")
                   → ALL_PLANNED:{count}   → close_agent(planner)
  → wait(all executors) → report
```

## Agent Registry

| Agent | Role File | Responsibility |
|-------|-----------|----------------|
| `planner` | `~/.codex/agents/planex-planner.md` | Issue decomp → solution design → ISSUE_READY signals |
| `executor` | `~/.codex/agents/planex-executor.md` | Codex CLI implementation per issue |

> Both agents must be deployed to `~/.codex/agents/` before use.
> Source: `.codex/skills/team-planex/agents/`

---

## Input Parsing

Supported input types (parse from `$ARGUMENTS`):

| Type | Detection | Handler |
|------|-----------|---------|
| Issue IDs | `ISS-\d{8}-\d{6}` regex | Pass directly to planner |
| Text | `--text '...'` flag | Planner creates issue(s) first |
| Plan file | `--plan <path>` flag | Planner reads file, batch creates issues |

---

## Session Setup

Before spawning agents, initialize session directory:

```javascript
// Generate session slug from input description (max 20 chars, kebab-case)
const slug = toSlug(inputDescription).slice(0, 20)
const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const sessionDir = `.workflow/.team/PEX-${slug}-${date}`
const artifactsDir = `${sessionDir}/artifacts/solutions`

Bash(`mkdir -p "${artifactsDir}"`)

// Write initial session state
Write({
  file_path: `${sessionDir}/team-session.json`,
  content: JSON.stringify({
    session_id: `PEX-${slug}-${date}`,
    input_type: inputType,
    input: rawInput,
    status: "running",
    started_at: new Date().toISOString(),
    executors: []
  }, null, 2)
})
```

---

## Phase 1: Spawn Planner

```javascript
const plannerAgent = spawn_agent({
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/planex-planner.md (MUST read first)
2. Run: `ccw spec load --category "planning execution"`

---

## Session
Session directory: ${sessionDir}
Artifacts directory: ${artifactsDir}

## Input
${inputType === 'issues' ? `Issue IDs: ${issueIds.join(' ')}` : ''}
${inputType === 'text' ? `Requirement: ${requirementText}` : ''}
${inputType === 'plan' ? `Plan file: ${planPath}` : ''}

## Beat Protocol (CRITICAL)
Process issues one at a time. After completing each issue's solution:
1. Write solution JSON to: ${artifactsDir}/{issueId}.json
2. Output EXACTLY this line: ISSUE_READY:{issueId}
3. STOP and wait — do NOT continue until you receive "Continue"

When ALL issues are processed:
1. Output EXACTLY: ALL_PLANNED:{totalCount}
`
})
```

---

## Phase 2: Beat Loop

Orchestrator coordinates the planner-executor pipeline:

```javascript
const executorIds = []
const executorIssueMap = {}

while (true) {
  // Wait for planner beat signal (up to 10 min per issue)
  const plannerOut = wait({ ids: [plannerAgent], timeout_ms: 600000 })

  // Handle timeout: urge convergence and retry
  if (plannerOut.timed_out) {
    send_input({
      id: plannerAgent,
      message: "Please output ISSUE_READY:{issueId} for current issue or ALL_PLANNED if done."
    })
    continue
  }

  const output = plannerOut.status[plannerAgent].completed

  // Detect ALL_PLANNED — pipeline complete
  if (output.includes('ALL_PLANNED')) {
    const match = output.match(/ALL_PLANNED:(\d+)/)
    const total = match ? parseInt(match[1]) : executorIds.length
    close_agent({ id: plannerAgent })
    break
  }

  // Detect ISSUE_READY — spawn executor immediately
  const issueMatch = output.match(/ISSUE_READY:(ISS-\d{8}-\d{6}|[A-Z0-9-]+)/)
  if (issueMatch) {
    const issueId = issueMatch[1]
    const solutionFile = `${artifactsDir}/${issueId}.json`

    const executorId = spawn_agent({
      message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/planex-executor.md (MUST read first)
2. Run: `ccw spec load --category "planning execution"`

---

## Issue
Issue ID: ${issueId}
Solution file: ${solutionFile}
Session: ${sessionDir}

## Execution
Load solution from file → implement via Codex CLI → verify tests → commit → report.
`
    })

    executorIds.push(executorId)
    executorIssueMap[executorId] = issueId

    // Signal planner to continue to next issue
    send_input({ id: plannerAgent, message: "Continue with next issue." })
    continue
  }

  // Unexpected output: urge convergence
  send_input({
    id: plannerAgent,
    message: "Output ISSUE_READY:{issueId} when solution is ready, or ALL_PLANNED when all done."
  })
}
```

---

## Phase 3: Wait All Executors

```javascript
if (executorIds.length > 0) {
  // Extended timeout: Codex CLI execution per issue (~10-20 min each)
  const execResults = wait({ ids: executorIds, timeout_ms: 1800000 })

  if (execResults.timed_out) {
    const completed = executorIds.filter(id => execResults.status[id]?.completed)
    const pending   = executorIds.filter(id => !execResults.status[id]?.completed)
    // Log pending issues for manual follow-up
    if (pending.length > 0) {
      const pendingIssues = pending.map(id => executorIssueMap[id])
      Write({
        file_path: `${sessionDir}/pending-executors.json`,
        content: JSON.stringify({ pending_issues: pendingIssues, executor_ids: pending }, null, 2)
      })
    }
  }

  // Collect summaries
  const summaries = executorIds.map(id => ({
    issue_id: executorIssueMap[id],
    status: execResults.status[id]?.completed ? 'completed' : 'timeout',
    output: execResults.status[id]?.completed ?? null
  }))

  // Cleanup
  executorIds.forEach(id => {
    try { close_agent({ id }) } catch { /* already closed */ }
  })

  // Final report
  const completed = summaries.filter(s => s.status === 'completed').length
  const failed    = summaries.filter(s => s.status === 'timeout').length

  return `
## Pipeline Complete

**Total issues**: ${executorIds.length}
**Completed**: ${completed}
**Timed out**: ${failed}

${summaries.map(s => `- ${s.issue_id}: ${s.status}`).join('\n')}

Session: ${sessionDir}
`
}
```

---

## User Commands

During execution, the user may issue:

| Command | Action |
|---------|--------|
| `check` / `status` | Show executor progress summary |
| `resume` / `continue` | Urge stalled planner or executor |
| `add <issue-ids>` | `send_input` to planner with new issue IDs |
| `add --text '...'` | `send_input` to planner to create and plan new issue |
| `add --plan <path>` | `send_input` to planner to parse and batch create from plan file |

**`add` handler** (inject mid-execution):

```javascript
// Get current planner agent ID from session state
const session = JSON.parse(Read(`${sessionDir}/team-session.json`))
const plannerAgentId = session.planner_agent_id  // saved during Phase 1

send_input({
  id: plannerAgentId,
  message: `
## NEW ISSUES INJECTED
${newInput}

Process these after current issue (or immediately if idle).
Follow beat protocol: ISSUE_READY → wait for Continue → next issue.
`
})
```

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Planner timeout (>10 min per issue) | `send_input` urge convergence, re-enter loop |
| Planner never outputs ISSUE_READY | After 3 retries, `close_agent` + report stall |
| Solution file not written | Executor reports error, logs to `${sessionDir}/errors.json` |
| Executor (Codex CLI) failure | Executor handles resume; logs CLI resume command |
| ALL_PLANNED never received | After 60 min total, close planner, wait remaining executors |
| No issues to process | AskUserQuestion for clarification |
