---
name: ccw
description: Intelligent coordinator — classify intent via structured extraction (action × object × style), map to skill chain, execute wave-by-wave via spawn_agents_on_csv. Barrier skills trigger coordinator-side artifact analysis between waves to dynamically assemble subsequent skill_call args. Each wave can be 1 or N parallel tasks.
argument-hint: "\"intent text\" [-y] [-c|--continue] [--dry-run] [--chain <name>]"
allowed-tools: spawn_agents_on_csv, Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

## Auto Mode

When `-y` or `--yes`: Skip clarification and confirmation prompts. Pass `-y` through to each step's skill invocation.

# CCW

## Usage

```bash
$ccw "implement user authentication with JWT"
$ccw -y "refactor the payment module"
$ccw --continue
$ccw --dry-run "add rate limiting to API endpoints"
$ccw --chain feature "add dark mode toggle"
```

**Flags**:
- `-y, --yes` — Auto mode: skip all prompts; propagate `-y` to each skill
- `--continue` — Resume latest paused session from last incomplete wave
- `--dry-run` — Display planned chain without executing
- `--chain <name>` — Force a specific chain (skips intent classification)

**Session state**: `.workflow/.ccw-coordinate/{session-id}/`
**Core Output**: `tasks.csv` (master) + `wave-{N}-results.csv` (per wave) + `context.md` (report)

---

## Overview

Wave-based pipeline coordinator. The coordinator loop builds one wave CSV at a time, calls `spawn_agents_on_csv`, then performs **coordinator-side artifact analysis** before assembling the next wave. Barrier skills produce artifacts (plan.json, analysis results, etc.) that the coordinator reads to dynamically resolve args for subsequent steps.

```
Intent → Structured Extract → Resolve Chain → [Wave Loop]:
          (action×object×style)  (chainMap)
  ┌─────────────────────────────────────────────────┐
  │ 1. Identify next wave (1 or N parallel steps)   │
  │ 2. Build wave-{N}.csv with skill_call per row   │
  │ 3. spawn_agents_on_csv(wave-{N}.csv)            │
  │ 4. Read wave-{N}-results.csv                    │
  │ 5. If barrier skill: analyze artifacts,         │
  │    update context for subsequent steps           │
  │ 6. Merge into master tasks.csv                  │
  └─────────────────────────────────────────────────┘
  → Report
```

---

## Barrier Skills

Skills that produce artifacts requiring **coordinator-side analysis** before the next wave can be assembled. After a barrier skill completes, the coordinator reads its output and updates the execution context.

| Skill | Artifacts to Read | Context Updates |
|-------|------------------|-----------------|
| `analyze-with-file` | `.workflow/.analysis/ANL-*/conclusions.json` | `analysis_dir`, `gaps`, `phase` |
| `brainstorm-with-file` | `.workflow/.brainstorm/*/` | `brainstorm_dir`, `features` |
| `workflow-plan` | `.workflow/active/WFS-*/workflow-session.json` | `plan_dir`, `task_count` |
| `workflow-lite-planex` | `.workflow/.lite-plan/*/plan.json` | `plan_dir`, `task_count` |
| `spec-generator` | `.workflow/.spec/*/` | `spec_session_id` |
| `roadmap-with-file` | `.workflow/.roadmap/*/roadmap.md` | `roadmap_dir` |
| `workflow-tdd-plan` | `.workflow/.tdd-plan/*/` | `tdd_plan_dir` |
| `issue-discover` | `.workflow/.issues/*/` | `issue_dir`, `issue_count` |
| `debug-with-file` | `.workflow/.debug/*/` | `debug_dir`, `findings` |

**Non-barrier skills** (can be grouped into multi-task waves): `workflow-execute`, `workflow-test-fix-cycle`, `review-cycle`, `clean`, `investigate`, `security-audit`, `ship`, `parallel-dev-cycle`, `brainstorm`, all `team-*` skills

---

## Phase 1: Structured Intent Extraction

Extract a structured intent tuple using LLM semantic understanding, then route deterministically via an action × object matrix.

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

Skills with `SKILL.md` (spawn_agents_on_csv native):
`analyze-with-file`, `brainstorm`, `brainstorm-with-file`, `clean`, `csv-wave-pipeline`, `debug-with-file`, `issue-discover`, `parallel-dev-cycle`, `project-documentation-workflow`, `review-cycle`, `roadmap-with-file`, `spec-generator`, `workflow-execute`, `workflow-lite-planex`, `workflow-plan`, `workflow-tdd-plan`, `workflow-test-fix-cycle`, `team-planex`, `team-coordinate`, `team-lifecycle-v4`, `team-issue`, `team-review`, `team-testing`, `team-quality-assurance`, `team-tech-debt`, `team-perf-opt`, `team-arch-opt`, `team-brainstorm`, `team-ultra-analyze`, `team-uidesign`, `team-ui-polish`, `team-ux-improve`, `team-visual-a11y`, `team-frontend`, `team-frontend-debug`, `team-interactive-craft`, `team-motion-design`, `team-roadmap-dev`

Skills with `orchestrator.md` (phase-based):
`investigate`, `security-audit`, `ship`, `memory-capture`

### Chain Definitions (task_type → skill sequence)

> All `$skill-name` references below correspond to actual `.codex/skills/{skill-name}/` directories.
> **[B]** = barrier skill (solo wave, coordinator analyzes artifacts after)

| task_type | Chain name | Steps (skills, in order) |
|-----------|-----------|--------------------------|
| `bugfix-hotfix` | `bugfix.hotfix` | $workflow-lite-planex `--hotfix` |
| `bugfix` | `bugfix.standard` | $investigate → $workflow-lite-planex `--bugfix` [B] → $workflow-test-fix-cycle |
| `feature` (low) | `rapid` | $workflow-lite-planex [B] → $workflow-test-fix-cycle |
| `feature` (high) | `coupled` | $workflow-plan [B] → $workflow-execute → $review-cycle → $workflow-test-fix-cycle |
| `greenfield` | `greenfield` | $brainstorm-with-file [B] → $workflow-plan [B] → $workflow-execute → $workflow-test-fix-cycle |
| `brainstorm` | `brainstorm-to-plan` | $brainstorm-with-file [B] → $workflow-plan [B] → $workflow-execute → $workflow-test-fix-cycle |
| `brainstorm-to-issue` | `brainstorm-to-issue` | $brainstorm-with-file [B] → $parallel-dev-cycle |
| `debug-file` | `debug-with-file` | $debug-with-file |
| `debug` | `investigate` | $investigate |
| `analyze-file` | `analyze-to-plan` | $analyze-with-file [B] → $workflow-lite-planex |
| `collaborative-plan` | `collaborative-plan` | $brainstorm-with-file [B] → $workflow-execute |
| `roadmap` | `roadmap` | $roadmap-with-file [B] → $team-planex |
| `spec-driven` | `spec-driven` | $spec-generator [B] → $workflow-plan [B] → $workflow-execute → $workflow-test-fix-cycle |
| `tdd` | `tdd` | $workflow-tdd-plan [B] → $workflow-execute |
| `test-gen` | `test-gen` | $workflow-test-fix-cycle |
| `test-fix` | `test-fix` | $workflow-test-fix-cycle |
| `review` | `review` | $review-cycle → $workflow-test-fix-cycle |
| `refactor` | `refactor` | $clean |
| `integration-test` | `integration-test` | $workflow-test-fix-cycle |
| `multi-cli` | `multi-cli` | $brainstorm → $workflow-test-fix-cycle |
| `issue-batch` | `issue` | $issue-discover [B] → $parallel-dev-cycle |
| `issue-transition` | `rapid-to-issue` | $workflow-lite-planex `--plan-only` [B] → $parallel-dev-cycle |
| `team-planex` | `team-planex` | $team-planex |
| `team-issue` | `team-issue` | $team-issue |
| `team-qa` | `team-qa` | $team-quality-assurance |
| `team-review` | `team-review` | $team-review |
| `team-testing` | `team-testing` | $team-testing |
| `documentation` | `docs` | $project-documentation-workflow |
| `security` | `security` | $security-audit |
| `ui-design` | `ui` | $brainstorm-with-file [B] → $workflow-plan [B] → $workflow-execute |
| `exploration` | `full` | $brainstorm → $workflow-plan [B] → $workflow-execute → $workflow-test-fix-cycle |
| `analyze-wave` | `analyze-wave` | $analyze-with-file [B] → $csv-wave-pipeline → $workflow-test-fix-cycle |
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
```

### Phase 1: Resolve Intent and Chain

**`--continue` mode**: Glob `.workflow/.ccw-coordinate/CCW-*/state.json` sorted by name desc; load the most recent; resume from first pending wave.

**Fresh mode**:

1. Read `.workflow/state.json` for project context (`current_phase`, `workflow_name`)
2. If `--chain` is given, use it directly
3. Otherwise, extract structured intent `{action, object, scope, style, urgency}` from user input using LLM semantic understanding
4. Route via `detectTaskType(intent)` matrix to get `task_type`
5. Assess complexity (`low|medium|high`) for complexity-adaptive routing
6. If no confident classification and not `AUTO_YES`: ask one clarifying question via `AskUserQuestion`
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
  context: {
    phase: resolvedPhase,
    plan_dir: null,
    analysis_dir: null,
    brainstorm_dir: null,
    spec_session_id: null,
    roadmap_dir: null,
    tdd_plan_dir: null,
    issue_dir: null,
    debug_dir: null,
    gaps: null
  },
  waves: [],   // populated as waves execute
  steps: CHAIN_STEPS[resolvedChain].map((skill, i) => ({
    step_n: i + 1,
    skill: skill.cmd,
    args: skill.args ?? '',
    is_barrier: BARRIER_SKILLS.has(skill.cmd),
    status: "pending",
    wave_n: null
  }))
}, null, 2))
```

**`--dry-run`**: Display the chain plan and stop.

```
Chain:  <resolvedChain>
Type:   <task_type> | Complexity: <complexity>
Steps:
  1. $<cmd> <args>  [BARRIER]
  2. $<cmd> <args>
  3. $<cmd> <args>
```

**User confirmation** (skip if `AUTO_YES`): Display the plan above and prompt `Proceed? (yes/no)`.

---

### Phase 2: Wave Execution Loop

The coordinator iterates over pending steps, grouping them into waves and executing one wave at a time.

#### Wave Grouping Rules

1. A **barrier skill** is always alone in its wave (wave size = 1)
2. Consecutive **non-barrier skills** with no inter-dependencies are grouped into one wave (wave size = N)
3. After a barrier wave completes → coordinator analyzes artifacts → updates context → re-assembles subsequent step args

#### Per-Wave Execution

```javascript
let waveNum = 0;

while (state.steps.some(s => s.status === 'pending')) {
  waveNum++;

  // 1. Determine wave contents
  const waveSteps = buildNextWave(state.steps);

  // 2. Assemble skill_call for each step (with latest context)
  const waveCsv = waveSteps.map((step, i) => ({
    id: String(step.step_n),
    skill_call: buildSkillCall(step, state.context),
    topic: `Chain "${state.chain}" step ${step.step_n}/${state.steps.length}`
  }));

  // 3. Write wave CSV
  const csvContent = 'id,skill_call,topic\n' + waveCsv.map(r =>
    `"${r.id}","${r.skill_call.replace(/"/g, '""')}","${r.topic}"`
  ).join('\n');
  Write(`${sessionDir}/wave-${waveNum}.csv`, csvContent);

  // 4. Execute wave
  spawn_agents_on_csv({
    csv_path: `${sessionDir}/wave-${waveNum}.csv`,
    id_column: "id",
    instruction: WAVE_INSTRUCTION,
    max_workers: waveSteps.length > 1 ? waveSteps.length : 1,
    max_runtime_seconds: 1800,
    output_csv_path: `${sessionDir}/wave-${waveNum}-results.csv`,
    output_schema: RESULT_SCHEMA
  });

  // 5. Read results, update step status
  const results = readCSV(`${sessionDir}/wave-${waveNum}-results.csv`);
  for (const row of results) {
    const step = state.steps.find(s => s.step_n === parseInt(row.id));
    step.status = row.status;
    step.findings = row.summary;
    step.artifacts = row.artifacts;
    step.wave_n = waveNum;
  }

  // 6. Barrier analysis (if wave contained a barrier skill)
  if (waveSteps.length === 1 && BARRIER_SKILLS.has(waveSteps[0].skill)) {
    analyzeBarrierArtifacts(waveSteps[0], results[0], state.context);
  }

  // 7. Persist state
  state.waves.push({ wave_n: waveNum, steps: waveSteps.map(s => s.step_n), results });
  Write(`${sessionDir}/state.json`, JSON.stringify(state, null, 2));

  // 8. Abort on failure
  if (results.some(r => r.status === 'failed')) {
    state.status = 'aborted';
    state.steps.filter(s => s.status === 'pending').forEach(s => s.status = 'skipped');
    Write(`${sessionDir}/state.json`, JSON.stringify(state, null, 2));
    break;
  }
}
```

---

### Instruction Template

```
你是 CSV job 子 agent。

先原样执行这一段技能调用：
{skill_call}

然后基于结果完成这一行任务说明：
{topic}

限制：
- 不要修改 .workflow/.ccw-coordinate/ 下的 state 文件
- skill 内部有自己的 session 管理，按 skill SKILL.md 执行即可

最后必须调用 `report_agent_job_result`，返回 JSON：
{"status":"completed|failed","skill_call":"{skill_call}","summary":"一句话结果","artifacts":"产物路径或空字符串","error":"失败原因或空字符串"}
```

### Result Schema

```javascript
const RESULT_SCHEMA = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["completed", "failed"] },
    skill_call: { type: "string" },
    summary: { type: "string" },
    artifacts: { type: "string" },
    error: { type: "string" }
  },
  required: ["status", "skill_call", "summary", "artifacts", "error"]
};
```

---

### Barrier Analysis Logic

After a barrier skill completes, the coordinator reads its artifacts and updates `state.context`:

```javascript
const BARRIER_SKILLS = new Set([
  'analyze-with-file', 'brainstorm-with-file', 'workflow-plan',
  'workflow-lite-planex', 'spec-generator', 'roadmap-with-file',
  'workflow-tdd-plan', 'issue-discover', 'debug-with-file'
]);

function analyzeBarrierArtifacts(step, result, ctx) {
  const artifactPath = result.artifacts;

  switch (step.skill) {
    case 'analyze-with-file':
      // Read analysis conclusions → extract gaps, phase info
      const analysisFiles = Glob('.workflow/.analysis/ANL-*/conclusions.json');
      const latest = analysisFiles.sort().pop();
      if (latest) {
        const conclusions = JSON.parse(Read(latest));
        ctx.analysis_dir = latest.replace('/conclusions.json', '');
        ctx.gaps = conclusions.gaps ?? null;
        if (!ctx.phase) ctx.phase = conclusions.phase ?? null;
      }
      break;

    case 'brainstorm-with-file':
      ctx.brainstorm_dir = artifactPath;
      break;

    case 'workflow-plan':
      // Read workflow session → know task structure for execute
      const wfSessions = Glob('.workflow/active/WFS-*/workflow-session.json');
      const latestWf = wfSessions.sort().pop();
      if (latestWf) {
        const session = JSON.parse(Read(latestWf));
        ctx.plan_dir = latestWf.replace('/workflow-session.json', '');
        ctx.task_count = session.tasks?.length ?? 0;
      }
      break;

    case 'workflow-lite-planex':
      const litePlans = Glob('.workflow/.lite-plan/*/plan.json');
      const latestPlan = litePlans.sort().pop();
      if (latestPlan) {
        ctx.plan_dir = latestPlan.replace('/plan.json', '');
        ctx.task_count = JSON.parse(Read(latestPlan)).tasks?.length ?? 0;
      }
      break;

    case 'spec-generator':
      ctx.spec_session_id = artifactPath;
      break;

    case 'roadmap-with-file':
      ctx.roadmap_dir = artifactPath;
      break;

    case 'workflow-tdd-plan':
      ctx.tdd_plan_dir = artifactPath;
      break;

    case 'issue-discover':
      ctx.issue_dir = artifactPath;
      break;

    case 'debug-with-file':
      ctx.debug_dir = artifactPath;
      ctx.findings = result.summary;
      break;
  }
}
```

### Skill Call Assembly

The coordinator builds each `skill_call` with resolved context — sub-agents just execute verbatim:

```javascript
const AUTO_FLAG_MAP = {
  'brainstorm-with-file': '-y',
  'analyze-with-file': '-y',
  'debug-with-file': '-y',
  'workflow-plan': '-y',
  'workflow-lite-planex': '-y',
  'workflow-execute': '-y',
  'workflow-test-fix-cycle': '-y',
  'workflow-tdd-plan': '-y',
  'spec-generator': '-y',
  'roadmap-with-file': '-y',
  'issue-discover': '-y',
  'parallel-dev-cycle': '-y',
  'review-cycle': '-y',
  'clean': '-y',
  'brainstorm': '-y',
  'csv-wave-pipeline': '-y',
};

function buildSkillCall(step, ctx) {
  let args = (step.args ?? '')
    .replace(/{intent}/g, state.intent ?? '')
    .replace(/{phase}/g, ctx.phase ?? '')
    .replace(/{plan_dir}/g, ctx.plan_dir ?? '')
    .replace(/{analysis_dir}/g, ctx.analysis_dir ?? '')
    .replace(/{brainstorm_dir}/g, ctx.brainstorm_dir ?? '')
    .replace(/{spec_session_id}/g, ctx.spec_session_id ?? '')
    .replace(/{roadmap_dir}/g, ctx.roadmap_dir ?? '')
    .replace(/{tdd_plan_dir}/g, ctx.tdd_plan_dir ?? '')
    .replace(/{issue_dir}/g, ctx.issue_dir ?? '')
    .replace(/{debug_dir}/g, ctx.debug_dir ?? '');

  // Inject intent as first arg if no args present
  if (!args.trim()) args = `"${state.intent}"`;

  if (state.auto_yes) {
    const flag = AUTO_FLAG_MAP[step.skill];
    if (flag && !args.includes(flag)) args = args ? `${args} ${flag}` : flag;
  }

  return `$${step.skill} ${args}`.trim();
}

function buildNextWave(steps) {
  const pending = steps.filter(s => s.status === 'pending');
  if (!pending.length) return [];

  const first = pending[0];
  // Barrier skill → solo wave
  if (BARRIER_SKILLS.has(first.skill)) return [first];

  // Group consecutive non-barriers
  const wave = [first];
  for (let i = 1; i < pending.length; i++) {
    if (BARRIER_SKILLS.has(pending[i].skill)) break;
    wave.push(pending[i]);
  }
  return wave;
}
```

---

### Phase 3: Completion Report

```javascript
state.status = state.steps.every(s => s.status === 'completed') ? 'completed' : state.status;
state.completed_at = new Date().toISOString();
Write(`${sessionDir}/state.json`, JSON.stringify(state, null, 2));
```

Generate `context.md`:

```markdown
# CCW Coordinate Report — {chain}

## Summary
- Session: {sessionId}
- Chain: {chain}
- Type: {task_type} | Complexity: {complexity}
- Waves: {waveNum} executed
- Steps: {completed}/{total} completed

## Wave Results
### Wave {N} (barrier: {skill})
| Step | Skill Call | Status | Summary |
|------|-----------|--------|---------|
| {step_n} | {skill_call} | {status} | {summary} |

Artifacts: {artifacts}
Context update: {what changed}
```

Display:

```
=== CCW COORDINATE COMPLETE ===
Session:  <sessionId>
Chain:    <chain>
Type:     <task_type> | Complexity: <complexity>
Waves:    <N> executed
Steps:    <completed>/<total>

WAVE RESULTS:
  [W1] $analyze-with-file -y       →  ✓  found 3 gaps       [BARRIER]
  [W2] $workflow-lite-planex -y     →  ✓  12 tasks planned   [BARRIER]
  [W3] $workflow-test-fix-cycle -y  →  ✓  all tests pass

State:    .workflow/.ccw-coordinate/<sessionId>/state.json
Resume:   $ccw --continue
```

---

## CSV Schema

### wave-{N}.csv (Per-Wave Input)

```csv
id,skill_call,topic
"1","$analyze-with-file ""fix auth"" -y","Chain ""bugfix.standard"" step 1/3"
```

| Column | Description |
|--------|-------------|
| `id` | Step number from chain (string) |
| `skill_call` | Full skill invocation assembled by coordinator with resolved context |
| `topic` | Brief description for the agent |

### tasks.csv (Master State)

```csv
id,skill,args,wave_n,status,findings,artifacts,error
```

Accumulated across all waves. Updated after each wave completes.

---

## Error Handling

| Code | Severity | Condition | Recovery |
|------|----------|-----------|----------|
| E001 | error | Intent unclassifiable after clarification | Default to `feature` chain (rapid) |
| E002 | error | `--chain` value not in chain map | List valid chains, abort |
| E003 | error | Wave timeout (max_runtime_seconds) | Mark step `failed`, abort chain |
| E004 | error | Barrier artifact not found | Retry wave once, then abort |
| E005 | error | `--continue`: no session found | List sessions, prompt |
| W001 | warning | Barrier artifact partial | Continue with available context |

---

## Core Rules

1. **Start Immediately**: Init session dir and write `state.json` before any wave
2. **Wave-by-wave**: Never start wave N+1 before wave N results are read and analyzed
3. **Barrier = solo wave**: A barrier skill always executes alone; coordinator analyzes its artifacts before proceeding
4. **Non-barriers can parallel**: Consecutive non-barrier skills in the same wave execute with `max_workers = N`
5. **Coordinator owns context**: Sub-agents never read prior results — coordinator assembles the full `skill_call` with resolved args
6. **Simple instruction**: Sub-agent instruction is minimal — just "execute {skill_call}, report result"
7. **Abort on failure**: Failed step → mark remaining as skipped → report
8. **State.json tracks waves**: Each wave is recorded with step IDs and results for resume
9. **Dry-run is read-only**: Display chain with [BARRIER] markers, no execution
10. **Resume from wave**: `--continue` finds last completed wave and resumes from next pending step
11. **Semantic Routing**: Use LLM structured extraction (`action × object × style`) not regex for intent classification
