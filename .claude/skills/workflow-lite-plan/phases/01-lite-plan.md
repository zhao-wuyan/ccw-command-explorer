# Phase 1: Lite-Plan

Complete planning pipeline: task analysis, multi-angle exploration, clarification, adaptive planning, confirmation, and execution handoff.

---

## Overview

Intelligent lightweight planning command with dynamic workflow adaptation based on task complexity. Focuses on planning phases (exploration, clarification, planning, confirmation) and delegates execution to Phase 2 (lite-execute).

**Core capabilities:**
- Intelligent task analysis with automatic exploration detection
- Dynamic code exploration (cli-explore-agent) when codebase understanding needed
- Interactive clarification after exploration to gather missing information
- Adaptive planning: Low complexity → Direct Claude; Medium/High → cli-lite-planning-agent
- Two-step confirmation: plan display → multi-dimensional input collection
- Execution handoff with complete context to lite-execute

## Input

```
<task-description>         Task description or path to .md file (required)
```

Workflow preferences (`autoYes`, `forceExplore`) are collected by SKILL.md via AskUserQuestion and passed as `workflowPreferences` context variable.

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| `exploration-{angle}.json` | Per-angle exploration results (1-4 files based on complexity) |
| `explorations-manifest.json` | Index of all exploration files |
| `planning-context.md` | Evidence paths + synthesized understanding |
| `plan.json` | Plan overview with task_ids[] (plan-overview-base-schema.json) |
| `.task/TASK-*.json` | Independent task files (one per task) |

**Output Directory**: `.workflow/.lite-plan/{task-slug}-{YYYY-MM-DD}/`

**Agent Usage**:
- Low complexity → Direct Claude planning (no agent)
- Medium/High complexity → `cli-lite-planning-agent` generates `plan.json`

**Schema Reference**: `~/.ccw/workflows/cli-templates/schemas/plan-overview-base-schema.json`

## Auto Mode Defaults

When `workflowPreferences.autoYes === true`:
- **Clarification Questions**: Skipped (no clarification phase)
- **Plan Confirmation**: Auto-selected "Allow"
- **Execution Method**: Auto-selected "Auto"
- **Code Review**: Auto-selected "Skip"

## Execution Process

```
Phase 1: Task Analysis & Exploration
   ├─ Parse input (description or .md file)
   ├─ intelligent complexity assessment (Low/Medium/High)
   ├─ Exploration decision (auto-detect or workflowPreferences.forceExplore)
   ├─ Context protection: If file reading ≥50k chars → force cli-explore-agent
   └─ Decision:
      ├─ needsExploration=true → Launch parallel cli-explore-agents (1-4 based on complexity)
      └─ needsExploration=false → Skip to Phase 2/3

Phase 2: Clarification (optional, multi-round)
   ├─ Aggregate clarification_needs from all exploration angles
   ├─ Deduplicate similar questions
   └─ Decision:
      ├─ Has clarifications → AskUserQuestion (max 4 questions per round, multiple rounds allowed)
      └─ No clarifications → Skip to Phase 3

Phase 3: Planning (NO CODE EXECUTION - planning only)
   └─ Decision (based on Phase 1 complexity):
      ├─ Low → Load schema: cat ~/.ccw/workflows/cli-templates/schemas/plan-overview-base-schema.json → Direct Claude planning (following schema) → plan.json
      └─ Medium/High → cli-lite-planning-agent → plan.json (agent internally executes quality check)

Phase 4: Confirmation & Selection
   ├─ Display plan summary (tasks, complexity, estimated time)
   └─ AskUserQuestion:
      ├─ Confirm: Allow / Modify / Cancel
      ├─ Execution: Agent / Codex / Auto
      └─ Review: Gemini / Agent / Skip

Phase 5: Execute
   ├─ Build executionContext (plan + explorations + clarifications + selections)
   └─ Direct handoff: Read phases/02-lite-execute.md → Execute with executionContext (Mode 1)
```

## Implementation

### Phase 1: Intelligent Multi-Angle Exploration

**Session Setup** (MANDATORY - follow exactly):
```javascript
// Helper: Get UTC+8 (China Standard Time) ISO string
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

const taskSlug = task_description.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40)
const dateStr = getUtc8ISOString().substring(0, 10)  // Format: 2025-11-29

const sessionId = `${taskSlug}-${dateStr}`  // e.g., "implement-jwt-refresh-2025-11-29"
const sessionFolder = `.workflow/.lite-plan/${sessionId}`

bash(`mkdir -p ${sessionFolder} && test -d ${sessionFolder} && echo "SUCCESS: ${sessionFolder}" || echo "FAILED: ${sessionFolder}"`)
```

**TodoWrite (Phase 1 start)**:
```javascript
TodoWrite({ todos: [
  { content: "Phase 1: Exploration", status: "in_progress", activeForm: "Exploring codebase" },
  { content: "Phase 2: Clarification", status: "pending", activeForm: "Collecting clarifications" },
  { content: "Phase 3: Planning", status: "pending", activeForm: "Generating plan" },
  { content: "Phase 4: Confirmation", status: "pending", activeForm: "Awaiting confirmation" },
  { content: "Phase 5: Execution", status: "pending", activeForm: "Executing tasks" }
]})
```

**Exploration Decision Logic**:
```javascript
// Check if task description already contains prior analysis context (from analyze-with-file)
const hasPriorAnalysis = /##\s*Prior Analysis/i.test(task_description)

needsExploration = workflowPreferences.forceExplore ? true
  : hasPriorAnalysis ? false
  : (task.mentions_specific_files ||
     task.requires_codebase_context ||
     task.needs_architecture_understanding ||
     task.modifies_existing_code)

if (!needsExploration) {
  // Skip exploration — analysis context already in task description (or not needed)
  // manifest is absent; Phase 3 loads it with safe fallback
  proceed_to_next_phase()
}
```

**⚠️ Context Protection**: File reading ≥50k chars → force `needsExploration=true` (delegate to cli-explore-agent)

**Complexity Assessment** (Intelligent Analysis):
```javascript
// analyzes task complexity based on:
// - Scope: How many systems/modules are affected?
// - Depth: Surface change vs architectural impact?
// - Risk: Potential for breaking existing functionality?
// - Dependencies: How interconnected is the change?

const complexity = analyzeTaskComplexity(task_description)
// Returns: 'Low' | 'Medium' | 'High'
// Low: ONLY truly trivial — single file, single function, zero cross-module impact, no new patterns
//   Examples: fix typo, rename variable, add log line, adjust constant value
// Medium: Multiple files OR any integration point OR new pattern introduction OR moderate risk
//   Examples: add endpoint, implement feature, refactor module, fix bug spanning files
// High: Cross-module, architectural, or systemic change
//   Examples: new subsystem, migration, security overhaul, API redesign
// ⚠️ Default bias: When uncertain between Low and Medium, choose Medium

// Angle assignment based on task type (orchestrator decides, not agent)
const ANGLE_PRESETS = {
  architecture: ['architecture', 'dependencies', 'modularity', 'integration-points'],
  security: ['security', 'auth-patterns', 'dataflow', 'validation'],
  performance: ['performance', 'bottlenecks', 'caching', 'data-access'],
  bugfix: ['error-handling', 'dataflow', 'state-management', 'edge-cases'],
  feature: ['patterns', 'integration-points', 'testing', 'dependencies']
}

function selectAngles(taskDescription, count) {
  const text = taskDescription.toLowerCase()
  let preset = 'feature' // default

  if (/refactor|architect|restructure|modular/.test(text)) preset = 'architecture'
  else if (/security|auth|permission|access/.test(text)) preset = 'security'
  else if (/performance|slow|optimi|cache/.test(text)) preset = 'performance'
  else if (/fix|bug|error|issue|broken/.test(text)) preset = 'bugfix'

  return ANGLE_PRESETS[preset].slice(0, count)
}

const selectedAngles = selectAngles(task_description, complexity === 'High' ? 4 : (complexity === 'Medium' ? 3 : 1))

// Planning strategy determination
// Agent trigger: anything beyond trivial single-file change
// - hasPriorAnalysis → always agent (analysis validated non-trivial task)
// - multi-angle exploration → agent (complexity warranted multiple angles)
// - Medium/High complexity → agent
// Direct Claude planning ONLY for truly trivial Low + no analysis + single angle
const planningStrategy = (
  complexity === 'Low' && !hasPriorAnalysis && selectedAngles.length <= 1
) ? 'Direct Claude Planning'
  : 'cli-lite-planning-agent'

console.log(`
## Exploration Plan

Task Complexity: ${complexity}
Selected Angles: ${selectedAngles.join(', ')}
Planning Strategy: ${planningStrategy}

Launching ${selectedAngles.length} parallel explorations...
`)
```

**Launch Parallel Explorations** - Orchestrator assigns angle to each agent:

**⚠️ CRITICAL - NO BACKGROUND EXECUTION**:
- **MUST NOT use `run_in_background: true`** - exploration results are REQUIRED before planning


```javascript
// Launch agents with pre-assigned angles
const explorationTasks = selectedAngles.map((angle, index) =>
  Task(
    subagent_type="cli-explore-agent",
    run_in_background=false,  // ⚠️ MANDATORY: Must wait for results
    description=`Explore: ${angle}`,
    prompt=`
## Task Objective
Execute **${angle}** exploration for task planning context. Analyze codebase from this specific angle to discover relevant structure, patterns, and constraints.

## Output Location

**Session Folder**: ${sessionFolder}
**Output File**: ${sessionFolder}/exploration-${angle}.json

## Assigned Context
- **Exploration Angle**: ${angle}
- **Task Description**: ${task_description}
- **Exploration Index**: ${index + 1} of ${selectedAngles.length}

## Agent Initialization
cli-explore-agent autonomously handles: project structure discovery, schema loading, project context loading (project-tech.json, specs/*.md), and keyword search. These steps execute automatically.

## Exploration Strategy (${angle} focus)

**Step 1: Structural Scan** (Bash)
- get_modules_by_depth.sh → identify modules related to ${angle}
- find/rg → locate files relevant to ${angle} aspect
- Analyze imports/dependencies from ${angle} perspective

**Step 2: Semantic Analysis** (Gemini CLI)
- How does existing code handle ${angle} concerns?
- What patterns are used for ${angle}?
- Where would new code integrate from ${angle} viewpoint?

**Step 3: Write Output**
- Consolidate ${angle} findings into JSON
- Identify ${angle}-specific clarification needs

## Expected Output

**Schema Reference**: explore-json-schema.json (auto-loaded by agent during initialization)

**Required Fields** (all ${angle} focused):
- Follow explore-json-schema.json exactly (auto-loaded by agent)
- All fields scoped to ${angle} perspective
- Ensure rationale is specific and >10 chars (not generic)
- Include file:line locations in integration_points
- _metadata.exploration_angle: "${angle}"

## Success Criteria
- [ ] get_modules_by_depth.sh executed
- [ ] At least 3 relevant files identified with specific rationale + role
- [ ] Every file has rationale >10 chars (not generic like "Related to ${angle}")
- [ ] Every file has role classification (modify_target/dependency/etc.)
- [ ] Patterns are actionable (code examples, not generic advice)
- [ ] Integration points include file:line locations
- [ ] Constraints are project-specific to ${angle}
- [ ] JSON output follows schema exactly
- [ ] clarification_needs includes options + recommended
- [ ] Files with relevance >= 0.7 have key_code array describing key symbols
- [ ] Files with relevance >= 0.7 have topic_relation explaining connection to ${angle}

## Execution
**Write**: \`${sessionFolder}/exploration-${angle}.json\`
**Return**: 2-3 sentence summary of ${angle} findings
`
  )
)

// Execute all exploration tasks in parallel
```

**Auto-discover Generated Exploration Files**:
```javascript
// After explorations complete, auto-discover all exploration-*.json files
const explorationFiles = bash(`find ${sessionFolder} -name "exploration-*.json" -type f`)
  .split('\n')
  .filter(f => f.trim())

// Read metadata to build manifest
const explorationManifest = {
  session_id: sessionId,
  task_description: task_description,
  timestamp: getUtc8ISOString(),
  complexity: complexity,
  exploration_count: explorationCount,
  explorations: explorationFiles.map(file => {
    const data = JSON.parse(Read(file))
    const filename = path.basename(file)
    return {
      angle: data._metadata.exploration_angle,
      file: filename,
      path: file,
      index: data._metadata.exploration_index
    }
  })
}

Write(`${sessionFolder}/explorations-manifest.json`, JSON.stringify(explorationManifest, null, 2))

console.log(`
## Exploration Complete

Generated exploration files in ${sessionFolder}:
${explorationManifest.explorations.map(e => `- exploration-${e.angle}.json (angle: ${e.angle})`).join('\n')}

Manifest: explorations-manifest.json
Angles explored: ${explorationManifest.explorations.map(e => e.angle).join(', ')}
`)
```

**TodoWrite (Phase 1 complete)**:
```javascript
TodoWrite({ todos: [
  { content: "Phase 1: Exploration", status: "completed", activeForm: "Exploring codebase" },
  { content: "Phase 2: Clarification", status: "in_progress", activeForm: "Collecting clarifications" },
  { content: "Phase 3: Planning", status: "pending", activeForm: "Generating plan" },
  { content: "Phase 4: Confirmation", status: "pending", activeForm: "Awaiting confirmation" },
  { content: "Phase 5: Execution", status: "pending", activeForm: "Executing tasks" }
]})
```

**Output**:
- `${sessionFolder}/exploration-{angle1}.json`
- `${sessionFolder}/exploration-{angle2}.json`
- ... (1-4 files based on complexity)
- `${sessionFolder}/explorations-manifest.json`

---

### Phase 2: Clarification (Optional, Multi-Round)

**Skip if**: No exploration or `clarification_needs` is empty across all explorations

**⚠️ CRITICAL**: AskUserQuestion tool limits max 4 questions per call. **MUST execute multiple rounds** to exhaust all clarification needs - do NOT stop at round 1.

**Aggregate clarification needs from all exploration angles**:
```javascript
// Load manifest and all exploration files (may not exist if exploration was skipped)
const manifest = file_exists(`${sessionFolder}/explorations-manifest.json`)
  ? JSON.parse(Read(`${sessionFolder}/explorations-manifest.json`))
  : { exploration_count: 0, explorations: [] }
const explorations = manifest.explorations.map(exp => ({
  angle: exp.angle,
  data: JSON.parse(Read(exp.path))
}))

// Aggregate clarification needs from all explorations
const allClarifications = []
explorations.forEach(exp => {
  if (exp.data.clarification_needs?.length > 0) {
    exp.data.clarification_needs.forEach(need => {
      allClarifications.push({
        ...need,
        source_angle: exp.angle
      })
    })
  }
})

// Intelligent deduplication: analyze allClarifications by intent
// - Identify questions with similar intent across different angles
// - Merge similar questions: combine options, consolidate context
// - Produce dedupedClarifications with unique intents only
const dedupedClarifications = intelligentMerge(allClarifications)

const autoYes = workflowPreferences.autoYes

if (autoYes) {
  // Auto mode: Skip clarification phase
  console.log(`[Auto] Skipping ${dedupedClarifications.length} clarification questions`)
  console.log(`Proceeding to planning with exploration results...`)
  // Continue to Phase 3
} else if (dedupedClarifications.length > 0) {
  // Interactive mode: Multi-round clarification
  const BATCH_SIZE = 4
  const totalRounds = Math.ceil(dedupedClarifications.length / BATCH_SIZE)

  for (let i = 0; i < dedupedClarifications.length; i += BATCH_SIZE) {
    const batch = dedupedClarifications.slice(i, i + BATCH_SIZE)
    const currentRound = Math.floor(i / BATCH_SIZE) + 1

    console.log(`### Clarification Round ${currentRound}/${totalRounds}`)

    AskUserQuestion({
      questions: batch.map(need => ({
        question: `[${need.source_angle}] ${need.question}\n\nContext: ${need.context}`,
        header: need.source_angle.substring(0, 12),
        multiSelect: false,
        options: need.options.map((opt, index) => ({
          label: need.recommended === index ? `${opt} ★` : opt,
          description: need.recommended === index ? `Recommended` : `Use ${opt}`
        }))
      }))
    })

    // Store batch responses in clarificationContext before next round
  }
}
```

**Output**: `clarificationContext` (in-memory)

---

### Phase 3: Planning

**Planning Strategy Selection** (based on Phase 1 complexity):

**IMPORTANT**: Phase 3 is **planning only** - NO code execution. All execution happens in Phase 5 via lite-execute.

**Executor Assignment** (Claude 智能分配，plan 生成后执行):

```javascript
// 分配规则（优先级从高到低）：
// 1. 用户明确指定："用 gemini 分析..." → gemini, "codex 实现..." → codex
// 2. 默认 → agent

const executorAssignments = {}  // { taskId: { executor: 'gemini'|'codex'|'agent', reason: string } }

// Load tasks from .task/ directory for executor assignment
const taskFiles = Glob(`${sessionFolder}/.task/TASK-*.json`)
taskFiles.forEach(taskPath => {
  const task = JSON.parse(Read(taskPath))
  // Claude 根据上述规则语义分析，为每个 task 分配 executor
  executorAssignments[task.id] = { executor: '...', reason: '...' }
})
```

**Low Complexity** - Direct planning by Claude:
```javascript
// Step 1: Read schema
const schema = Bash(`cat ~/.ccw/workflows/cli-templates/schemas/plan-overview-base-schema.json`)

// Step 2: Read exploration files if available
const manifest = file_exists(`${sessionFolder}/explorations-manifest.json`)
  ? JSON.parse(Read(`${sessionFolder}/explorations-manifest.json`))
  : { explorations: [] }
manifest.explorations.forEach(exp => {
  const explorationData = Read(exp.path)
  console.log(`\n### Exploration: ${exp.angle}\n${explorationData}`)
})

// Step 3: Generate task objects (Claude directly, no agent)
// ⚠️ Tasks MUST incorporate insights from exploration files read in Step 2
// Task fields use NEW names: convergence.criteria (not acceptance), files[].change (not modification_points), test (not verification)
const tasks = [
  {
    id: "TASK-001",
    title: "...",
    description: "...",
    depends_on: [],
    convergence: { criteria: ["..."] },
    files: [{ path: "...", change: "..." }],
    implementation: ["..."],
    test: "..."
  },
  // ... more tasks
]

// Step 4: Write task files to .task/ directory
const taskDir = `${sessionFolder}/.task`
Bash(`mkdir -p "${taskDir}"`)
tasks.forEach(task => {
  Write(`${taskDir}/${task.id}.json`, JSON.stringify(task, null, 2))
})

// Step 5: Generate plan overview (NO embedded tasks[])
const plan = {
  summary: "...",
  approach: "...",
  task_ids: tasks.map(t => t.id),
  task_count: tasks.length,
  complexity: "Low",
  estimated_time: "...",
  recommended_execution: "Agent",
  _metadata: {
    timestamp: getUtc8ISOString(),
    source: "direct-planning",
    planning_mode: "direct",
    plan_type: "feature"
  }
}

// Step 6: Write plan overview to session folder
Write(`${sessionFolder}/plan.json`, JSON.stringify(plan, null, 2))

// Step 7: MUST continue to Phase 4 (Confirmation) - DO NOT execute code here
```

**Medium/High Complexity** - Invoke cli-lite-planning-agent:

```javascript
Task(
  subagent_type="cli-lite-planning-agent",
  run_in_background=false,
  description="Generate detailed implementation plan",
  prompt=`
Generate implementation plan and write plan.json.

## Output Location

**Session Folder**: ${sessionFolder}
**Output Files**:
- ${sessionFolder}/planning-context.md (evidence + understanding)
- ${sessionFolder}/plan.json (plan overview -- NO embedded tasks[])
- ${sessionFolder}/.task/TASK-*.json (independent task files, one per task)

## Output Schema Reference
Execute: cat ~/.ccw/workflows/cli-templates/schemas/plan-overview-base-schema.json (get schema reference before generating plan)

## Project Context (MANDATORY - Load via ccw spec)
Execute: ccw spec load --category planning
This loads technology stack, architecture, key components, and user-defined constraints/conventions.

**CRITICAL**: All generated tasks MUST comply with constraints in specs/*.md

## Task Description
${task_description}

## Multi-Angle Exploration Context

${manifest.explorations.length > 0
  ? manifest.explorations.map(exp => `### Exploration: ${exp.angle} (${exp.file})
Path: ${exp.path}

Read this file for detailed ${exp.angle} analysis.`).join('\n\n') + `

Total explorations: ${manifest.exploration_count}
Angles covered: ${manifest.explorations.map(e => e.angle).join(', ')}

Manifest: ${sessionFolder}/explorations-manifest.json`
  : `No exploration files. Task Description above contains "## Prior Analysis" with analysis summary, key files, and findings — use it as primary planning context.`}

## User Clarifications
${JSON.stringify(clarificationContext) || "None"}

## Complexity Level
${complexity}

## Requirements
Generate plan.json and .task/*.json following the schema obtained above. Key constraints:
- _metadata.exploration_angles: ${JSON.stringify(manifest.explorations.map(e => e.angle))}

**Output Format**: Two-layer structure:
- plan.json: Overview with task_ids[] referencing .task/ files (NO tasks[] array)
- .task/TASK-*.json: Independent task files following task-schema.json

Follow plan-overview-base-schema.json (loaded via cat command above) for plan.json structure.
Follow task-schema.json for .task/TASK-*.json structure.
Note: Use files[].change (not modification_points), convergence.criteria (not acceptance).

## Task Grouping Rules
1. **Group by feature**: All changes for one feature = one task (even if 3-5 files)
2. **Group by context**: Tasks with similar context or related functional changes can be grouped together
3. **Minimize agent count**: Simple, unrelated tasks can also be grouped to reduce agent execution overhead
4. **Avoid file-per-task**: Do NOT create separate tasks for each file
5. **Substantial tasks**: Each task should represent 15-60 minutes of work
6. **True dependencies only**: Only use depends_on when Task B cannot start without Task A's output
7. **Prefer parallel**: Most tasks should be independent (no depends_on)

## Execution
1. Read schema file (cat command above)
2. Execute CLI planning using Gemini (Qwen fallback)
3. Read ALL exploration files for comprehensive context
4. Synthesize findings and generate tasks + plan overview
5. **Write**: \`${sessionFolder}/planning-context.md\` (evidence paths + understanding)
6. **Create**: \`${sessionFolder}/.task/\` directory (mkdir -p)
7. **Write**: \`${sessionFolder}/.task/TASK-001.json\`, \`TASK-002.json\`, etc. (one per task)
8. **Write**: \`${sessionFolder}/plan.json\` (overview with task_ids[], NO tasks[])
9. Return brief completion summary
`
)
```

**Output**: `${sessionFolder}/plan.json`

**TodoWrite (Phase 3 complete)**:
```javascript
TodoWrite({ todos: [
  { content: "Phase 1: Exploration", status: "completed", activeForm: "Exploring codebase" },
  { content: "Phase 2: Clarification", status: "completed", activeForm: "Collecting clarifications" },
  { content: "Phase 3: Planning", status: "completed", activeForm: "Generating plan" },
  { content: "Phase 4: Confirmation", status: "in_progress", activeForm: "Awaiting confirmation" },
  { content: "Phase 5: Execution", status: "pending", activeForm: "Executing tasks" }
]})
```

---

### Phase 4: Task Confirmation & Execution Selection

**Step 4.1: Display Plan**
```javascript
const plan = JSON.parse(Read(`${sessionFolder}/plan.json`))

// Load tasks from .task/ directory
const tasks = (plan.task_ids || []).map(id => {
  const taskPath = `${sessionFolder}/.task/${id}.json`
  return JSON.parse(Read(taskPath))
})
const taskList = tasks

console.log(`
## Implementation Plan

**Summary**: ${plan.summary}
**Approach**: ${plan.approach}

**Tasks** (${taskList.length}):
${taskList.map((t, i) => `${i+1}. ${t.title} (${t.scope || t.files?.[0]?.path || ''})`).join('\n')}

**Complexity**: ${plan.complexity}
**Estimated Time**: ${plan.estimated_time}
**Recommended**: ${plan.recommended_execution}
`)
```

**Step 4.2: Collect Confirmation**
```javascript
const autoYes = workflowPreferences.autoYes

let userSelection

if (autoYes) {
  // Auto mode: Use defaults
  console.log(`[Auto] Auto-confirming plan:`)
  console.log(`  - Confirmation: Allow`)
  console.log(`  - Execution: Auto`)
  console.log(`  - Review: Skip`)

  userSelection = {
    confirmation: "Allow",
    execution_method: "Auto",
    code_review_tool: "Skip"
  }
} else {
  // Interactive mode: Ask user
  // Note: Execution "Other" option allows specifying CLI tools from ~/.claude/cli-tools.json
  userSelection = AskUserQuestion({
    questions: [
      {
        question: `Confirm plan? (${taskList.length} tasks, ${plan.complexity})`,
        header: "Confirm",
        multiSelect: false,
        options: [
          { label: "Allow", description: "Proceed as-is" },
          { label: "Modify", description: "Adjust before execution" },
          { label: "Cancel", description: "Abort workflow" }
        ]
      },
      {
        question: "Execution method:",
        header: "Execution",
        multiSelect: false,
        options: [
          { label: "Agent", description: "@code-developer agent" },
          { label: "Codex", description: "codex CLI tool" },
          { label: "Auto", description: `Auto: ${plan.complexity === 'Low' ? 'Agent' : 'Codex'}` }
        ]
      },
      {
        question: "Code review after execution?",
        header: "Review",
        multiSelect: false,
        options: [
          { label: "Gemini Review", description: "Gemini CLI review" },
          { label: "Codex Review", description: "Git-aware review (prompt OR --uncommitted)" },
          { label: "Agent Review", description: "@code-reviewer agent" },
          { label: "Skip", description: "No review" }
        ]
      }
    ]
  })
}
```

**TodoWrite (Phase 4 confirmed)**:
```javascript
const executionLabel = userSelection.execution_method

TodoWrite({ todos: [
  { content: "Phase 1: Exploration", status: "completed", activeForm: "Exploring codebase" },
  { content: "Phase 2: Clarification", status: "completed", activeForm: "Collecting clarifications" },
  { content: "Phase 3: Planning", status: "completed", activeForm: "Generating plan" },
  { content: `Phase 4: Confirmed [${executionLabel}]`, status: "completed", activeForm: "Confirmed" },
  { content: `Phase 5: Execution [${executionLabel}]`, status: "in_progress", activeForm: `Executing [${executionLabel}]` }
]})
```

---

### Phase 5: Handoff to Execution

**CRITICAL**: lite-plan NEVER executes code directly. ALL execution MUST go through lite-execute.

**Step 5.1: Build executionContext**

```javascript
// Load manifest and all exploration files (may not exist if exploration was skipped)
const manifest = file_exists(`${sessionFolder}/explorations-manifest.json`)
  ? JSON.parse(Read(`${sessionFolder}/explorations-manifest.json`))
  : { exploration_count: 0, explorations: [] }
const explorations = {}

manifest.explorations.forEach(exp => {
  if (file_exists(exp.path)) {
    explorations[exp.angle] = JSON.parse(Read(exp.path))
  }
})

const plan = JSON.parse(Read(`${sessionFolder}/plan.json`))

executionContext = {
  planObject: plan,  // plan overview (no tasks[])
  taskFiles: (plan.task_ids || []).map(id => ({
    id,
    path: `${sessionFolder}/.task/${id}.json`
  })),
  explorationsContext: explorations,
  explorationAngles: manifest.explorations.map(e => e.angle),
  explorationManifest: manifest,
  clarificationContext: clarificationContext || null,
  executionMethod: userSelection.execution_method,  // 全局默认，可被 executorAssignments 覆盖
  codeReviewTool: userSelection.code_review_tool,
  originalUserInput: task_description,

  // 任务级 executor 分配（优先于全局 executionMethod）
  executorAssignments: executorAssignments,  // { taskId: { executor, reason } }

  session: {
    id: sessionId,
    folder: sessionFolder,
    artifacts: {
      explorations: manifest.explorations.map(exp => ({
        angle: exp.angle,
        path: exp.path
      })),
      explorations_manifest: `${sessionFolder}/explorations-manifest.json`,
      plan: `${sessionFolder}/plan.json`,
      task_dir: `${sessionFolder}/.task`
    }
  }
}
```

**Step 5.2: Handoff**

```javascript
// ⚠️ COMPACT PROTECTION: Phase 2 instructions MUST persist in memory throughout execution.
// If compact compresses Phase 2 content at any point, re-read this file before continuing.
// See SKILL.md "Compact Protection" section for full protocol.
Read("phases/02-lite-execute.md")
// Execute Phase 2 with executionContext (Mode 1: In-Memory Plan)
```

## Session Folder Structure

```
.workflow/.lite-plan/{task-slug}-{YYYY-MM-DD}/
├── exploration-{angle1}.json      # Exploration angle 1
├── exploration-{angle2}.json      # Exploration angle 2
├── exploration-{angle3}.json      # Exploration angle 3 (if applicable)
├── exploration-{angle4}.json      # Exploration angle 4 (if applicable)
├── explorations-manifest.json     # Exploration index
├── planning-context.md            # Evidence paths + understanding
├── plan.json                      # Plan overview (task_ids[])
└── .task/                         # Task files directory
    ├── TASK-001.json
    ├── TASK-002.json
    └── ...
```

**Example**:
```
.workflow/.lite-plan/implement-jwt-refresh-2025-11-25-14-30-25/
├── exploration-architecture.json
├── exploration-auth-patterns.json
├── exploration-security.json
├── explorations-manifest.json
├── planning-context.md
├── plan.json
└── .task/
    ├── TASK-001.json
    ├── TASK-002.json
    └── TASK-003.json
```

## Error Handling

| Error | Resolution |
|-------|------------|
| Exploration agent failure | Skip exploration, continue with task description only |
| Planning agent failure | Fallback to direct planning by Claude |
| Clarification timeout | Use exploration findings as-is |
| Confirmation timeout | Save context, display resume instructions |
| Modify loop > 3 times | Suggest breaking task or using /workflow-plan |

## Next Phase

After Phase 5 handoff, execution continues in [Phase 2: Lite-Execute](02-lite-execute.md).
