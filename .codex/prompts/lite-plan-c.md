---
description: Lightweight interactive planning workflow with Codex subagent orchestration, outputs plan.json after user confirmation. Supports depth and exploration control.
argument-hint: "TASK=\"<description or file.md path>\" [--depth=standard|deep] [--explore] [--auto]"
---

# Workflow Lite-Plan Command (Codex Subagent Version)

## Overview

Intelligent lightweight planning command with dynamic workflow adaptation based on task complexity. Uses Codex subagent API for parallel exploration and planning phases.

**Core capabilities:**
- Intelligent task analysis with automatic exploration detection
- **Parallel code exploration via Codex subagents** (spawn_agent + batch wait)
- Interactive clarification after exploration to gather missing information
- Adaptive planning: Low complexity → Direct; Medium/High → cli-lite-planning-agent subagent
- Two-step confirmation: plan display → user approval
- Outputs plan.json file after user confirmation

## Task Description

**Target task**: $TASK
**Force exploration**: $EXPLORE

- `--depth`: Exploration depth (standard|deep)
- `--explore`: Force exploration phase
- `--auto`: Auto mode, skip confirmation

## Execution Process

```
Phase 1: Task Analysis & Exploration (Subagent Orchestration)
   ├─ Parse input (description or .md file)
   ├─ Intelligent complexity assessment (Low/Medium/High)
   ├─ Exploration decision (auto-detect or EXPLORE="true")
   └─ Decision:
      ├─ needsExploration=true → Spawn parallel cli-explore-agent subagents
      └─ needsExploration=false → Skip to Phase 2/3

Phase 2: Clarification (optional)
   ├─ Aggregate clarification needs from exploration results
   ├─ Output questions to user
   └─ STOP and wait for user reply

Phase 3: Planning (NO CODE EXECUTION - planning only)
   └─ Decision (based on complexity):
      ├─ Low → Direct planning following schema
      └─ Medium/High → Spawn cli-lite-planning-agent subagent → plan.json

Phase 4: Confirmation
   ├─ Display plan summary (tasks, complexity, estimated time)
   ├─ Output confirmation request
   └─ STOP and wait for user approval

Phase 5: Output
   └─ Write plan.json to session folder
```

## Implementation

### Phase 1: Intelligent Multi-Angle Exploration (Subagent Orchestration)

**Session Setup** (MANDATORY - follow exactly):
```javascript
// Helper: Get UTC+8 (China Standard Time) ISO string
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

const taskSlug = "$TASK".toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40)
const dateStr = getUtc8ISOString().substring(0, 10)  // Format: 2025-11-29

const sessionId = `${taskSlug}-${dateStr}`  // e.g., "implement-jwt-refresh-2025-11-29"
const sessionFolder = `.workflow/.lite-plan/${sessionId}`

// Create session folder
mkdir -p ${sessionFolder}
```

**Exploration Decision Logic**:
```javascript
needsExploration = (
  "$EXPLORE" === "true" ||
  task.mentions_specific_files ||
  task.requires_codebase_context ||
  task.needs_architecture_understanding ||
  task.modifies_existing_code
)

if (!needsExploration) {
  // Skip to Phase 2 (Clarification) or Phase 3 (Planning)
  proceed_to_next_phase()
}
```

**Context Protection**: File reading >=50k chars → force `needsExploration=true`

**Complexity Assessment** (Intelligent Analysis):
```javascript
// Analyzes task complexity based on:
// - Scope: How many systems/modules are affected?
// - Depth: Surface change vs architectural impact?
// - Risk: Potential for breaking existing functionality?
// - Dependencies: How interconnected is the change?

const complexity = analyzeTaskComplexity("$TASK")
// Returns: 'Low' | 'Medium' | 'High'

// Angle assignment based on task type
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

const selectedAngles = selectAngles("$TASK", complexity === 'High' ? 4 : (complexity === 'Medium' ? 3 : 1))

console.log(`
## Exploration Plan

Task Complexity: ${complexity}
Selected Angles: ${selectedAngles.join(', ')}

Launching ${selectedAngles.length} parallel subagent explorations...
`)
```

**Launch Parallel Exploration Subagents** (Codex Pattern):

```javascript
// ==================== CODEX SUBAGENT PATTERN ====================

// Step 1: Spawn parallel exploration subagents (角色文件由 agent 自己读取)
const explorationAgents = selectedAngles.map((angle, index) => {
  return spawn_agent({
    message: `
## TASK ASSIGNMENT

### Task Objective
Execute **${angle}** exploration for task planning context. Analyze codebase from this specific angle to discover relevant structure, patterns, and constraints.

### Assigned Context
- **Exploration Angle**: ${angle}
- **Task Description**: $TASK
- **Exploration Index**: ${index + 1} of ${selectedAngles.length}
- **Output File**: ${sessionFolder}/exploration-${angle}.json

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/cli-explore-agent.md (MUST read first)
2. Run: ccw tool exec get_modules_by_depth '{}' (project structure)
3. Run: rg -l "{keyword_from_task}" --type ts (locate relevant files)
4. Execute: cat ~/.claude/workflows/cli-templates/schemas/explore-json-schema.json (get output schema reference)
5. Read: .workflow/project-tech.json (technology stack and architecture context)
6. Read: .workflow/project-guidelines.json (user-defined constraints and conventions)

### Exploration Strategy (${angle} focus)

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

### Expected Output

**File**: ${sessionFolder}/exploration-${angle}.json

**Schema Reference**: Schema obtained in MANDATORY FIRST STEPS step 3, follow schema exactly

**Required Fields** (all ${angle} focused):
- project_structure: Modules/architecture relevant to ${angle}
- relevant_files: Files affected from ${angle} perspective
  **IMPORTANT**: Use object format with relevance scores:
  \`[{path: "src/file.ts", relevance: 0.85, rationale: "Core ${angle} logic"}]\`
- patterns: ${angle}-related patterns to follow
- dependencies: Dependencies relevant to ${angle}
- integration_points: Where to integrate from ${angle} viewpoint (include file:line locations)
- constraints: ${angle}-specific limitations/conventions
- clarification_needs: ${angle}-related ambiguities (options array + recommended index)
- _metadata.exploration_angle: "${angle}"

### Success Criteria
- [ ] Schema obtained via cat explore-json-schema.json
- [ ] get_modules_by_depth.sh executed
- [ ] At least 3 relevant files identified with ${angle} rationale
- [ ] Patterns are actionable (code examples, not generic advice)
- [ ] Integration points include file:line locations
- [ ] JSON output follows schema exactly
- [ ] clarification_needs includes options + recommended

### Deliverables
Write: ${sessionFolder}/exploration-${angle}.json
Return: 2-3 sentence summary of ${angle} findings
`
  })
})

// Step 3: Batch wait for ALL exploration subagents (KEY ADVANTAGE of Codex)
const explorationResults = wait({
  ids: explorationAgents,
  timeout_ms: 600000  // 10 minutes
})

// Step 4: Handle timeout
if (explorationResults.timed_out) {
  console.log('部分探索超时，继续使用已完成结果')
}

// Step 5: Collect results from completed agents
const completedExplorations = {}
explorationAgents.forEach((agentId, index) => {
  const angle = selectedAngles[index]
  if (explorationResults.status[agentId].completed) {
    completedExplorations[angle] = explorationResults.status[agentId].completed
  }
})

// Step 6: Cleanup - close all exploration agents
explorationAgents.forEach(id => close_agent({ id }))
```

**Build Exploration Manifest**:
```javascript
// After all explorations complete, auto-discover all exploration-*.json files
const explorationFiles = find(`${sessionFolder}`, "-name", "exploration-*.json")

const explorationManifest = {
  session_id: sessionId,
  task_description: "$TASK",
  timestamp: getUtc8ISOString(),
  complexity: complexity,
  exploration_count: selectedAngles.length,
  explorations: explorationFiles.map(file => {
    const data = JSON.parse(Read(file))
    return {
      angle: data._metadata.exploration_angle,
      file: path.basename(file),
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

**Output**:
- `${sessionFolder}/exploration-{angle1}.json`
- `${sessionFolder}/exploration-{angle2}.json`
- ... (1-4 files based on complexity)
- `${sessionFolder}/explorations-manifest.json`

---

### Phase 2: Clarification (Optional)

**Skip if**: No exploration or `clarification_needs` is empty across all explorations

**Aggregate clarification needs from all exploration angles**:
```javascript
// Load manifest and all exploration files
const manifest = JSON.parse(Read(`${sessionFolder}/explorations-manifest.json`))
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
const dedupedClarifications = intelligentMerge(allClarifications)
```

**Output Questions and Wait for User Reply**:
```javascript
if (dedupedClarifications.length > 0) {
  console.log(`
## Clarification Needed

Based on exploration, the following questions need your input:

${dedupedClarifications.map((need, index) => `
### Question ${index + 1}: [${need.source_angle}]

**${need.question}**

Context: ${need.context}

Options:
${need.options.map((opt, i) => `  ${i + 1}. ${opt}${need.recommended === i ? ' ★ (Recommended)' : ''}`).join('\n')}
`).join('\n')}

---

**Please reply with your choices** (e.g., "Q1: 2, Q2: 1, Q3: 3") to continue planning.

**WAITING FOR USER INPUT...**
`)

  // STOP HERE - Wait for user reply before continuing to Phase 3
  return
}
```

**After User Reply**: Store responses in `clarificationContext` and proceed to Phase 3.

---

### Phase 3: Planning

**IMPORTANT**: Phase 3 is **planning only** - NO code execution.

**Planning Strategy Selection** (based on Phase 1 complexity):

**Low Complexity** - Direct Planning:
```javascript
// Step 1: Read schema
const schema = Read("~/.claude/workflows/cli-templates/schemas/plan-json-schema.json")

// Step 2: Read all exploration files for context
const manifest = JSON.parse(Read(`${sessionFolder}/explorations-manifest.json`))
manifest.explorations.forEach(exp => {
  const explorationData = Read(exp.path)
  console.log(`\n### Exploration: ${exp.angle}\n${explorationData}`)
})

// Step 3: Generate plan following schema (direct, no subagent)
const plan = {
  summary: "Brief description of what will be implemented",
  approach: "High-level approach and strategy",
  tasks: [
    // Each task: { id, title, description, scope, files, depends_on, execution_group, complexity }
    // Group by feature/module, NOT by file
    // 2-7 tasks recommended
  ],
  estimated_time: "Total estimated time",
  complexity: complexity,
  _metadata: {
    timestamp: getUtc8ISOString(),
    source: "lite-plan",
    planning_mode: "direct",
    exploration_angles: manifest.explorations.map(e => e.angle)
  }
}

// Step 4: Write plan
Write(`${sessionFolder}/plan.json`, JSON.stringify(plan, null, 2))

// Step 5: Proceed to Phase 4 (Confirmation)
```

**Medium/High Complexity** - Spawn cli-lite-planning-agent Subagent:

```javascript
// ==================== CODEX SUBAGENT PATTERN ====================

// Step 1: Create planning subagent (角色文件由 agent 自己读取)
const planningAgent = spawn_agent({
  message: `
## TASK ASSIGNMENT

### Objective
Generate implementation plan and write plan.json.

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/cli-lite-planning-agent.md (MUST read first)
2. Execute: cat ~/.claude/workflows/cli-templates/schemas/plan-json-schema.json (get schema reference)
3. Read: .workflow/project-tech.json (technology stack, architecture, key components)
4. Read: .workflow/project-guidelines.json (user-defined constraints and conventions)

**CRITICAL**: All generated tasks MUST comply with constraints in project-guidelines.json

### Task Description
$TASK

### Multi-Angle Exploration Context

${manifest.explorations.map(exp => `#### Exploration: ${exp.angle} (${exp.file})
Path: ${exp.path}

Read this file for detailed ${exp.angle} analysis.`).join('\n\n')}

Total explorations: ${manifest.exploration_count}
Angles covered: ${manifest.explorations.map(e => e.angle).join(', ')}

Manifest: ${sessionFolder}/explorations-manifest.json

### User Clarifications
${JSON.stringify(clarificationContext) || "None"}

### Complexity Level
${complexity}

### Requirements
Generate plan.json following the schema obtained above. Key constraints:
- tasks: 2-7 structured tasks (**group by feature/module, NOT by file**)
- _metadata.exploration_angles: ${JSON.stringify(manifest.explorations.map(e => e.angle))}

### Task Grouping Rules
1. **Group by feature**: All changes for one feature = one task (even if 3-5 files)
2. **Group by context**: Tasks with similar context or related functional changes can be grouped together
3. **Minimize agent count**: Simple, unrelated tasks can also be grouped to reduce agent execution overhead
4. **Avoid file-per-task**: Do NOT create separate tasks for each file
5. **Substantial tasks**: Each task should represent 15-60 minutes of work
6. **True dependencies only**: Only use depends_on when Task B cannot start without Task A's output
7. **Prefer parallel**: Most tasks should be independent (no depends_on)

### Execution
1. Read schema file (cat command above)
2. Execute CLI planning using Gemini (Qwen fallback)
3. Read ALL exploration files for comprehensive context
4. Synthesize findings and generate plan following schema
5. Write JSON: Write('${sessionFolder}/plan.json', jsonContent)
6. Return brief completion summary

### Deliverables
Write: ${sessionFolder}/plan.json
Return: Brief plan summary
`
})

// Step 3: Wait for planning subagent to complete
const planResult = wait({
  ids: [planningAgent],
  timeout_ms: 900000  // 15 minutes
})

// Step 4: Cleanup
close_agent({ id: planningAgent })
```

**Output**: `${sessionFolder}/plan.json`

---

### Phase 4: Task Confirmation

**Display Plan Summary**:
```javascript
const plan = JSON.parse(Read(`${sessionFolder}/plan.json`))

console.log(`
## Implementation Plan

**Summary**: ${plan.summary}
**Approach**: ${plan.approach}

**Tasks** (${plan.tasks.length}):
${plan.tasks.map((t, i) => `
### Task ${i+1}: ${t.title}
- **Description**: ${t.description}
- **Scope**: ${t.scope}
- **Files**: ${t.files?.join(', ') || 'N/A'}
- **Complexity**: ${t.complexity}
- **Dependencies**: ${t.depends_on?.join(', ') || 'None'}
`).join('\n')}

**Overall Complexity**: ${plan.complexity}
**Estimated Time**: ${plan.estimated_time}

---

## Confirmation Required

Please review the plan above and reply with one of the following:

- **"Allow"** - Proceed with this plan, output plan.json
- **"Modify"** - Describe what changes you want to make
- **"Cancel"** - Abort the planning workflow

**WAITING FOR USER CONFIRMATION...**
`)

// STOP HERE - Wait for user confirmation before writing plan.json
return
```

---

### Phase 5: Output Plan File

**After User Confirms "Allow"**:
```javascript
// Final plan.json already written in Phase 3
console.log(`
## Plan Output Complete

**Plan file written**: ${sessionFolder}/plan.json

**Session folder**: ${sessionFolder}

**Contents**:
- explorations-manifest.json
${manifest.explorations.map(e => `- exploration-${e.angle}.json`).join('\n')}
- plan.json

---

You can now use this plan with your preferred execution method:
- Manual implementation following the tasks
- Pass to another tool/agent for execution
- Import into project management system
`)
```

---

## Codex vs Claude Comparison (for this workflow)

| Aspect | Claude Code Task | Codex Subagent |
|--------|------------------|----------------|
| **Creation** | `Task({ subagent_type, prompt })` | `spawn_agent({ message: role + task })` |
| **Role Loading** | Auto via `subagent_type` | Manual: Read `~/.codex/agents/*.md` |
| **Parallel Wait** | Multiple `Task()` calls | **Batch `wait({ ids: [...] })`** |
| **Result Retrieval** | Sync return or `TaskOutput` | `wait({ ids }).status[id].completed` |
| **Follow-up** | `resume` parameter | `send_input({ id, message })` |
| **Cleanup** | Automatic | **Explicit `close_agent({ id })`** |

**Codex Advantages for lite-plan**:
- True parallel exploration with batch `wait`
- Fine-grained lifecycle control
- Efficient multi-agent coordination

---

## Session Folder Structure

```
.workflow/.lite-plan/{task-slug}-{YYYY-MM-DD}/
├── exploration-{angle1}.json      # Exploration angle 1
├── exploration-{angle2}.json      # Exploration angle 2
├── exploration-{angle3}.json      # Exploration angle 3 (if applicable)
├── exploration-{angle4}.json      # Exploration angle 4 (if applicable)
├── explorations-manifest.json     # Exploration index
└── plan.json                      # Implementation plan (after confirmation)
```

## Workflow States

| State | Action | Next |
|-------|--------|------|
| Phase 1 Complete | Exploration done | → Phase 2 or 3 |
| Phase 2 Output | Questions displayed | → Wait for user reply |
| User Replied | Clarifications received | → Phase 3 |
| Phase 3 Complete | Plan generated | → Phase 4 |
| Phase 4 Output | Plan displayed | → Wait for user confirmation |
| User: "Allow" | Confirmed | → Phase 5 (Write plan.json) |
| User: "Modify" | Changes requested | → Revise plan, back to Phase 4 |
| User: "Cancel" | Aborted | → End workflow |

## Error Handling

| Error | Resolution |
|-------|------------|
| Subagent spawn failure | Fallback to direct exploration |
| wait() timeout | Use completed results, log partial status |
| Planning subagent failure | Fallback to direct planning |
| Clarification timeout | Use exploration findings as-is |
| Confirmation timeout | Save context, display resume instructions |
| Modify loop > 3 times | Suggest breaking task into smaller pieces |

---

**Now execute the lite-plan workflow for task**: $TASK
