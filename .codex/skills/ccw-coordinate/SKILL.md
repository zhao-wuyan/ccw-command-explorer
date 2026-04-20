---
name: ccw-coordinate
description: Team-agent pipeline coordinator — classifies intent via structured extraction (action × object × style), maps to skill chain, spawns one agent per step whose prompt contains the skill invocation ($skill-name "intent"). Step results propagate as context to each successor. Session state at .workflow/.ccw-coordinate/{session-id}/state.json.
argument-hint: "\"intent text\" [-y] [-c|--continue] [--dry-run] [--chain <name>]"
allowed-tools: spawn_agent, wait_agent, send_message, followup_task, close_agent, Read, Write, Bash, Glob, Grep
---

## Auto Mode

When `-y` or `--yes`: Skip clarification and confirmation prompts. Pass `-y` through to each step's skill invocation.

# CCW Coordinate

## Usage

```bash
$ccw-coordinate "implement user authentication with JWT"
$ccw-coordinate -y "refactor the payment module"
$ccw-coordinate --continue
$ccw-coordinate --dry-run "add rate limiting to API endpoints"
$ccw-coordinate --chain feature "add dark mode toggle"
```

**Flags**:
- `-y, --yes` — Auto mode: skip all prompts; propagate `-y` to each skill
- `--continue` — Resume latest paused session from last incomplete step
- `--dry-run` — Display planned chain without spawning any agents
- `--chain <name>` — Force a specific chain (skips intent classification)

**Session state**: `.workflow/.ccw-coordinate/{session-id}/state.json`

---

## Overview

Sequential pipeline coordinator (Pattern 2.5). Each chain step is one `spawn_agent` whose message contains a `$skill-name "intent"` invocation together with context accumulated from prior steps. The agent executes the skill and returns structured findings; those findings are injected into the next step's spawn message as `## Context from Previous Steps`.

```
Intent  →  Structured Extract  →  Resolve Chain  →  Step 1  →  Step 2  →  …  →  Step N  →  Report
             (action×object×style)   (chainMap)     spawn         spawn               spawn
                                                    wait          wait                wait
                                                    close         close               close
                                                     │             │                   │
                                                  findings  →  prev_context  →  prev_context
```

---

## Phase 1: Structured Intent Extraction

Instead of regex pattern matching, extract a structured intent tuple using LLM semantic understanding, then route deterministically via an action × object matrix.

**Extract structured intent from user input:**

```json
{
  "action":    "<from action enum>",
  "object":    "<from object enum>",
  "scope":     "<module/file/area or null>",
  "style":     "<from style enum>",
  "urgency":   "<low | normal | high>"
}
```

**Action enum**:

| action | Semantic meaning |
|--------|-----------------|
| `create` | Build something new — feature, project, component, spec |
| `fix` | Repair something broken — fix bug, resolve error, patch |
| `analyze` | Understand deeply — analyze, investigate, discuss, explore concept |
| `plan` | Design approach — plan, break down, roadmap, decompose |
| `execute` | Implement planned work — execute, implement, develop |
| `explore` | Open-ended discovery — brainstorm, ideate, creative thinking |
| `debug` | Diagnose failures — debug, diagnose, troubleshoot |
| `test` | Run or create tests — test, generate test, TDD |
| `review` | Evaluate code quality — review, code review |
| `refactor` | Restructure code — refactor, clean up, tech debt |
| `convert` | Bridge between workflows — convert brainstorm to issue |

**Object enum**:

| object | Meaning |
|--------|---------|
| `feature` | New functionality or enhancement |
| `bug` | Defect, error, broken behavior |
| `issue` | Issue-tracker item for batch/structured management |
| `code` | Source code in general |
| `test` | Tests, test suite, test coverage |
| `spec` | Specification, PRD, product requirements |
| `doc` | Documentation |
| `ui` | User interface, design, component |
| `performance` | Performance characteristics |
| `security` | Security concerns |
| `architecture` | System architecture, design decisions |
| `project` | Entire project (greenfield) |
| `team` | Team-based execution |

**Style enum**:

| style | Meaning |
|-------|---------|
| `quick` | Fast, lightweight, minimal ceremony |
| `documented` | With file artifacts, discussion docs |
| `collaborative` | Multi-agent, multi-perspective |
| `structured` | Formal planning, spec-driven, phased |
| `iterative` | Cycle-based, self-iterating with reflection |
| `tdd` | Test-driven development |
| `default` | No specific style preference |

---

## Chain Map

Routing via `detectTaskType(intent)` → chain name → skill list.

### Task Type Detection (action × object × style matrix)

```javascript
function detectTaskType(intent) {
  const { action, object, style, urgency } = intent;

  // Urgency override
  if (urgency === 'high' && (action === 'fix' || object === 'bug')) return 'bugfix-hotfix';

  // Style-first routing
  if (style === 'tdd') return 'tdd';
  if (style === 'collaborative' && action === 'plan') return 'collaborative-plan';
  if (style === 'collaborative' && action === 'analyze') return 'analyze-wave';
  if (style === 'collaborative' && action !== 'plan') return 'multi-cli';
  if (style === 'iterative' && object === 'test') return 'integration-test';
  if (style === 'iterative' && action === 'refactor') return 'refactor';

  // Action × Object matrix
  const matrix = {
    'create': { 'project': 'greenfield', 'feature': 'feature', 'spec': 'spec-driven', 'test': 'test-gen', 'doc': 'documentation', 'ui': 'ui-design', 'issue': 'issue-batch', '_default': 'feature' },
    'fix':    { 'bug': 'bugfix', 'test': 'test-fix', 'issue': 'issue-batch', 'code': 'bugfix', 'security': 'bugfix', '_default': 'bugfix' },
    'analyze':{ 'architecture': 'analyze-file', 'code': 'analyze-file', 'bug': 'debug-file', 'security': 'security', '_default': 'analyze-file' },
    'explore':{ 'feature': 'brainstorm', 'architecture': 'brainstorm', 'issue': 'issue-batch', '_default': 'exploration' },
    'plan':   { 'feature': 'feature', 'project': 'greenfield', 'issue': 'issue-transition', '_default': 'feature' },
    'execute':{ 'issue': 'issue-transition', '_default': 'feature' },
    'debug':  { 'bug': style === 'documented' ? 'debug-file' : 'debug', '_default': style === 'documented' ? 'debug-file' : 'debug' },
    'test':   { 'test': 'test-fix', 'code': 'test-gen', 'feature': 'integration-test', '_default': 'test-gen' },
    'review': { '_default': 'review' },
    'refactor':{ '_default': 'refactor' },
    'convert':{ 'issue': 'brainstorm-to-issue', '_default': 'issue-transition' },
  };

  // Special compound detections
  if (action === 'plan' && style === 'structured' && /roadmap/.test(rawInput)) return 'roadmap';
  if (/csv.?wave|wave.?pipeline|并行波|波次执行/.test(rawInput)) return 'analyze-wave';
  if (object === 'team') return 'team-planex';
  if (/ship|release|publish/.test(rawInput)) return 'ship';

  const actionMap = matrix[action];
  if (!actionMap) return 'feature';
  return actionMap[object] || actionMap['_default'] || 'feature';
}
```

### Available Skills Inventory

Skills with `SKILL.md` (spawn_agent native):
`analyze-with-file`, `brainstorm`, `brainstorm-with-file`, `clean`, `csv-wave-pipeline`, `debug-with-file`, `issue-discover`, `parallel-dev-cycle`, `project-documentation-workflow`, `review-cycle`, `roadmap-with-file`, `spec-generator`, `workflow-execute`, `workflow-lite-planex`, `workflow-plan`, `workflow-tdd-plan`, `workflow-test-fix-cycle`, `team-planex`, `team-coordinate`, `team-lifecycle-v4`, `team-issue`, `team-review`, `team-testing`, `team-quality-assurance`, `team-tech-debt`, `team-perf-opt`, `team-arch-opt`, `team-brainstorm`, `team-ultra-analyze`, `team-uidesign`, `team-ui-polish`, `team-ux-improve`, `team-visual-a11y`, `team-frontend`, `team-frontend-debug`, `team-interactive-craft`, `team-motion-design`, `team-roadmap-dev`

Skills with `orchestrator.md` (phase-based):
`investigate`, `security-audit`, `ship`, `memory-capture`

### Chain Definitions (task_type → skill sequence)

> All `$skill-name` references below correspond to actual `.codex/skills/{skill-name}/` directories.

| task_type | Chain name | Steps (skills, in order) |
|-----------|-----------|--------------------------|
| `bugfix-hotfix` | `bugfix.hotfix` | $workflow-lite-planex `--hotfix` |
| `bugfix` | `bugfix.standard` | $investigate → $workflow-lite-planex `--bugfix` → $workflow-test-fix-cycle |
| `feature` (low) | `rapid` | $workflow-lite-planex → $workflow-test-fix-cycle |
| `feature` (high) | `coupled` | $workflow-plan → $workflow-execute → $review-cycle → $workflow-test-fix-cycle |
| `greenfield` | `greenfield` | $brainstorm-with-file → $workflow-plan → $workflow-execute → $workflow-test-fix-cycle |
| `brainstorm` | `brainstorm-to-plan` | $brainstorm-with-file → $workflow-plan → $workflow-execute → $workflow-test-fix-cycle |
| `brainstorm-to-issue` | `brainstorm-to-issue` | $brainstorm-with-file → $parallel-dev-cycle |
| `debug-file` | `debug-with-file` | $debug-with-file |
| `debug` | `investigate` | $investigate |
| `analyze-file` | `analyze-to-plan` | $analyze-with-file → $workflow-lite-planex |
| `collaborative-plan` | `collaborative-plan` | $brainstorm-with-file → $workflow-execute |
| `roadmap` | `roadmap` | $roadmap-with-file → $team-planex |
| `spec-driven` | `spec-driven` | $spec-generator → $workflow-plan → $workflow-execute → $workflow-test-fix-cycle |
| `tdd` | `tdd` | $workflow-tdd-plan → $workflow-execute |
| `test-gen` | `test-gen` | $workflow-test-fix-cycle |
| `test-fix` | `test-fix` | $workflow-test-fix-cycle |
| `review` | `review` | $review-cycle → $workflow-test-fix-cycle |
| `refactor` | `refactor` | $clean |
| `integration-test` | `integration-test` | $workflow-test-fix-cycle |
| `multi-cli` | `multi-cli` | $brainstorm → $workflow-test-fix-cycle |
| `issue-batch` | `issue` | $issue-discover → $parallel-dev-cycle |
| `issue-transition` | `rapid-to-issue` | $workflow-lite-planex `--plan-only` → $parallel-dev-cycle |
| `team-planex` | `team-planex` | $team-planex |
| `team-issue` | `team-issue` | $team-issue |
| `team-qa` | `team-qa` | $team-quality-assurance |
| `team-review` | `team-review` | $team-review |
| `team-testing` | `team-testing` | $team-testing |
| `documentation` | `docs` | $project-documentation-workflow |
| `security` | `security` | $security-audit |
| `ui-design` | `ui` | $brainstorm-with-file → $workflow-plan → $workflow-execute |
| `exploration` | `full` | $brainstorm → $workflow-plan → $workflow-execute → $workflow-test-fix-cycle |
| `analyze-wave` | `analyze-wave` | $analyze-with-file → $csv-wave-pipeline → $workflow-test-fix-cycle |
| `ship` | `ship` | $ship |

---

## Implementation

### Session Initialization

```javascript
const dateStr = new Date().toISOString().substring(0, 10).replace(/-/g, '')
const timeStr = new Date().toISOString().substring(11, 19).replace(/:/g, '')
const sessionId = `CCW-${dateStr}-${timeStr}`
const sessionDir = `.workflow/.ccw-coordinate/${sessionId}`

Bash(`mkdir -p ${sessionDir}`)

functions.update_plan({
  explanation: "Starting CCW coordinate session",
  plan: [
    { step: "Phase 1: Extract intent and resolve chain", status: "in_progress" },
    { step: "Phase 2: Execute steps (pipeline)", status: "pending" },
    { step: "Phase 3: Completion report", status: "pending" }
  ]
})
```

### Phase 1: Extract Intent and Resolve Chain

**`--continue` mode**: Glob `.workflow/.ccw-coordinate/CCW-*/state.json` sorted by name desc; load the most recent; skip to Phase 2 at the first step where `status === "pending"`.

**Fresh mode**:

1. Read `.workflow/state.json` for project context (`current_phase`, `workflow_name`)
2. If `--chain` is given, use it directly
3. Otherwise, extract structured intent `{action, object, scope, style, urgency}` from user input using LLM semantic understanding
4. Route via `detectTaskType(intent)` matrix to get `task_type`
5. Assess complexity (`low|medium|high`) for complexity-adaptive routing
6. If no confident classification and not `AUTO_YES`: ask one clarifying question via `functions.request_user_input`
7. Resolve the chain's skill list from Chain Definitions
8. Write `state.json`:

```javascript
Write(`${sessionDir}/state.json`, JSON.stringify({
  id: sessionId,
  intent,
  structured_intent: { action, object, scope, style, urgency },
  task_type,
  complexity,
  chain: resolvedChain,
  auto_yes: AUTO_YES,
  status: "in_progress",
  started_at: new Date().toISOString(),
  steps: CHAIN_STEPS[resolvedChain].map((skill, i) => ({
    step_n: i + 1,
    skill,
    status: "pending",
    findings: null,
    quality_score: null,
    hints_for_next: null
  }))
}, null, 2))
```

**`--dry-run`**: Display the chain plan and stop — no agents spawned.

```
Chain:  <resolvedChain>
Type:   <task_type> | Complexity: <complexity>
Steps:
  1. <skill-1>
  2. <skill-2>
  3. <skill-3>
```

**User confirmation** (skip if `AUTO_YES`): Display the plan above and prompt `Proceed? (yes/no)`.

```javascript
functions.update_plan({
  explanation: "Chain resolved, starting pipeline",
  plan: [
    { step: "Phase 1: Extract intent and resolve chain", status: "completed" },
    { step: "Phase 2: Execute steps (pipeline)", status: "in_progress" },
    { step: "Phase 3: Completion report", status: "pending" }
  ]
})
```

---

### Phase 2: Execute Steps (Pipeline)

Sequential loop — each step spawns one agent, waits for it, extracts findings, then closes it before spawning the next.

```javascript
let prevContext = ''  // accumulates across steps

for (const step of state.steps.filter(s => s.status === 'pending')) {
  const skillFlag = AUTO_YES ? `-y` : ''

  // Assemble the agent prompt with the skill invocation embedded
  const stepPrompt = buildStepPrompt({
    step,
    totalSteps: state.steps.length,
    chain: state.chain,
    intent: state.intent,
    prevContext,
    skillFlag,
    sessionDir
  })

  // Spawn step agent
  const agent = spawn_agent({ message: stepPrompt })

  // Wait — with 4-step timeout cascade
  let result = wait_agent({ timeout_ms: 1800000 })
  if (result.timed_out) {
    // Status probe
    followup_task({ target: agent, message: "STATUS_CHECK: Report current progress, findings so far, and estimated remaining work." })
    const status = wait_agent({ timeout_ms: 180000 })  // 3 min
    if (status.timed_out) {
      // Force finalize
      followup_task({ target: agent, message: "FINALIZE: Output all current findings immediately. Time limit reached.", interrupt: true })
      result = wait_agent({ timeout_ms: 180000 })  // 3 min
      if (result.timed_out) {
        close_agent({ target: agent })
      }
    } else {
      result = status
    }
  }

  // Parse structured output from agent
  const output = parseLastJSON(result.status[agent].completed) ?? {
    quality_score: null,
    findings: result.status[agent].completed?.slice(-500) ?? "(no output)",
    hints_for_next: ""
  }

  close_agent({ target: agent })

  // Persist step result
  step.status = result.timed_out ? "failed" : "completed"
  step.findings = output.findings
  step.quality_score = output.quality_score
  step.hints_for_next = output.hints_for_next
  step.completed_at = new Date().toISOString()
  Write(`${sessionDir}/state.json`, JSON.stringify(state, null, 2))

  // Build prev_context for next step
  prevContext += `\n\n## Step ${step.step_n}: ${step.skill}\nFindings: ${step.findings}\nHints: ${step.hints_for_next ?? ''}`

  // Abort on failure — mark remaining steps as skipped
  if (step.status === "failed") {
    state.steps
      .filter(s => s.status === 'pending')
      .forEach(s => { s.status = 'skipped'; s.findings = `Blocked: step ${step.step_n} (${step.skill}) failed` })
    state.status = "aborted"
    Write(`${sessionDir}/state.json`, JSON.stringify(state, null, 2))
    break
  }
}
```

---

#### Step Agent Prompt Template (`buildStepPrompt`)

The assembled prompt embeds the skill call so the agent knows exactly what to invoke:

```
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS
1. Read: ~/.codex/AGENTS.md
2. Read: ~/.codex/skills/{skill}/SKILL.md (or orchestrator.md if SKILL.md not found)

---

**CCW Coordinate Chain: {chain}  |  Step {step_n} of {totalSteps}**

## Skill Invocation
Execute this skill call to complete your task:

  ${skill} "{intent}" {skillFlag}

Follow the Implementation section of the skill file you read in step 2.
The intent above is your driving goal.

{#if prevContext}
## Context from Previous Steps
{prevContext}

Use hints from the previous step to guide execution priorities.
{/if}

## Output (required — last JSON block in your response)
After execution complete, output exactly:
```json
{
  "quality_score": <0-10>,
  "findings": "<what was accomplished — max 500 chars>",
  "hints_for_next": "<specific guidance for the next chain step>"
}
```

Session artifacts: {sessionDir}/
```

---

### Phase 3: Completion Report

```javascript
state.status = state.steps.every(s => s.status === 'completed') ? "completed" : state.status
Write(`${sessionDir}/state.json`, JSON.stringify(state, null, 2))

functions.update_plan({
  explanation: "CCW coordinate complete",
  plan: [
    { step: "Phase 1: Extract intent and resolve chain", status: "completed" },
    { step: "Phase 2: Execute steps (pipeline)", status: "completed" },
    { step: "Phase 3: Completion report", status: "completed" }
  ]
})
```

Display:
```
=== CCW COORDINATE COMPLETE ===
Session:  <sessionId>
Chain:    <chain>
Type:     <task_type> | Complexity: <complexity>
Steps:    <N completed>/<total>

STEP RESULTS:
  [1] <skill>  — score: <N>/10  ✓  <findings summary>
  [2] <skill>  — score: <N>/10  ✓  <findings summary>
  [3] <skill>  — score: <N>/10  ✓  <findings summary>

State:  .workflow/.ccw-coordinate/<sessionId>/state.json
Resume: $ccw-coordinate --continue
```

---

## Error Handling

| Code | Severity | Condition | Recovery |
|------|----------|-----------|----------|
| E001 | error | Intent unclassifiable after clarification | Default to `feature` chain (rapid); note in state.json |
| E002 | error | `--chain` value not in chain map | List valid chains, abort |
| E003 | error | Step agent timeout (both waits) | Mark step `failed`; skip remaining steps; suggest `--continue` |
| E004 | error | Step agent failed (non-JSON output) | Mark step `failed`; preserve raw output in `findings`; skip remaining |
| E005 | error | `--continue`: no session found | Glob `.workflow/.ccw-coordinate/CCW-*/`, list sessions, prompt |
| W001 | warning | Step output JSON missing `hints_for_next` | Continue with empty hints; next step still gets `findings` |

---

## Core Rules

1. **Start Immediately**: Init session dir and write `state.json` before any spawn
2. **Sequential**: Never spawn step N+1 until step N agent is closed and results written
3. **Skill in Prompt**: Every step agent's message MUST contain `$skill-name "intent"` — this is how the agent knows which skill to execute
4. **State.json is source of truth**: Write after every step; `--continue` reads it to resume
5. **Skip on Failure**: Step failure immediately marks all remaining steps `skipped` and aborts the loop
6. **Close before spawn**: Always `close_agent` the current step agent before spawning the next
7. **Dry-run is read-only**: Stop after displaying the chain plan — never spawn agents
8. **Timeout handling**: 4-step cascade: status probe (3 min) → force finalize (3 min) → close; if still timed out → mark `failed`
9. **No CLI fallback**: All execution is agent-native — no `exec_command("maestro cli ...")`
10. **Semantic Routing**: Use LLM structured extraction (`action × object × style`) not regex for intent classification
