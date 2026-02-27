---
name: workflow:collaborative-plan-with-file
description: Unified collaborative planning with dynamic requirement splitting, parallel sub-agent exploration/understanding/planning, and automatic merge. Each agent maintains process files for full traceability.
argument-hint: "[-y|--yes] <task description> [--max-agents=5] [--depth=normal|deep] [--merge-rule=consensus|priority]"
allowed-tools: TodoWrite(*), Task(*), AskUserQuestion(*), Read(*), Bash(*), Write(*), Glob(*), Grep(*), mcp__ace-tool__search_context(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-approve splits, use default merge rule, skip confirmations.

# Collaborative Planning Command

## Quick Start

```bash
# Basic usage
/workflow:collaborative-plan-with-file "Implement real-time notification system"

# With options
/workflow:collaborative-plan-with-file "Refactor authentication module" --max-agents=4
/workflow:collaborative-plan-with-file "Add payment gateway support" --depth=deep
/workflow:collaborative-plan-with-file "Migrate to microservices" --merge-rule=priority
```

**Context Source**: ACE semantic search + Per-agent CLI exploration
**Output Directory**: `.workflow/.planning/{session-id}/`
**Default Max Agents**: 5 (actual count based on requirement complexity)
**CLI Tools**: cli-lite-planning-agent (internally calls ccw cli with gemini/codex/qwen)
**Schema**: plan-json-schema.json (sub-plans & final plan share same base schema)

## Output Artifacts

### Per Sub-Agent (Phase 2)

| Artifact | Description |
|----------|-------------|
| `planning-context.md` | Evidence paths + synthesized understanding |
| `sub-plan.json` | Sub-plan following plan-json-schema.json |

### Final Output (Phase 4)

| Artifact | Description |
|----------|-------------|
| `requirement-analysis.json` | Requirement breakdown and sub-agent assignments |
| `conflicts.json` | Detected conflicts between sub-plans |
| `plan.json` | Merged plan (plan-json-schema + merge_metadata) |
| `plan.md` | Human-readable plan summary |

**Agent**: `cli-lite-planning-agent` with `process_docs: true` for sub-agents

## Overview

Unified collaborative planning workflow that:

1. **Analyzes** complex requirements and splits into sub-requirements
2. **Spawns** parallel sub-agents, each responsible for one sub-requirement
3. **Each agent** maintains process files: planning-refs.md + sub-plan.json
4. **Merges** all sub-plans into unified plan.json with conflict resolution

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         COLLABORATIVE PLANNING                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Phase 1: Requirement Analysis & Splitting                               │
│     ├─ Analyze requirement complexity                                    │
│     ├─ Identify 2-5 sub-requirements (focus areas)                       │
│     └─ Write requirement-analysis.json                                   │
│                                                                          │
│  Phase 2: Parallel Sub-Agent Execution                                   │
│     ┌──────────────┬──────────────┬──────────────┐                       │
│     │   Agent 1    │   Agent 2    │   Agent N    │                       │
├──────────────┼──────────────┼──────────────┤                       │
│     │ planning     │ planning     │ planning     │  → planning-context.md│
│     │ + sub-plan   │ + sub-plan   │ + sub-plan   │  → sub-plan.json      │
│     └──────────────┴──────────────┴──────────────┘                       │
│                                                                          │
│  Phase 3: Cross-Verification & Conflict Detection                        │
│     ├─ Load all sub-plan.json files                                      │
│     ├─ Detect conflicts (effort, approach, dependencies)                 │
│     └─ Write conflicts.json                                              │
│                                                                          │
│  Phase 4: Merge & Synthesis                                              │
│     ├─ Resolve conflicts using merge-rule                                │
│     ├─ Merge all sub-plans into unified plan                             │
│     └─ Write plan.json + plan.md                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Output Structure

```
.workflow/.planning/{CPLAN-slug-YYYY-MM-DD}/
├── requirement-analysis.json     # Phase 1: Requirement breakdown
├── agents/                       # Phase 2: Per-agent process files
│   ├── {focus-area-1}/
│   │   ├── planning-context.md  # Evidence + understanding
│   │   └── sub-plan.json        # Agent's plan for this focus area
│   ├── {focus-area-2}/
│   │   └── ...
│   └── {focus-area-N}/
│       └── ...
├── conflicts.json                # Phase 3: Detected conflicts
├── plan.json                     # Phase 4: Unified merged plan
└── plan.md                       # Phase 4: Human-readable plan
```

## Implementation

### Session Initialization

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

const taskDescription = "$ARGUMENTS"
const taskSlug = taskDescription.toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
  .substring(0, 30)

const sessionId = `CPLAN-${taskSlug}-${getUtc8ISOString().substring(0, 10)}`
const sessionFolder = `.workflow/.planning/${sessionId}`

// Parse options
const maxAgents = parseInt($ARGUMENTS.match(/--max-agents=(\d+)/)?.[1] || '5')
const depth = $ARGUMENTS.match(/--depth=(normal|deep)/)?.[1] || 'normal'
const mergeRule = $ARGUMENTS.match(/--merge-rule=(consensus|priority)/)?.[1] || 'consensus'
const autoMode = $ARGUMENTS.includes('--yes') || $ARGUMENTS.includes('-y')

Bash(`mkdir -p ${sessionFolder}/agents`)
```

### Phase 1: Requirement Analysis & Splitting

Use CLI to analyze and split requirements:

```javascript
TodoWrite({ todos: [
  { content: "Phase 1: Requirement Analysis", status: "in_progress", activeForm: "Analyzing requirements" },
  { content: "Phase 2: Parallel Agent Execution", status: "pending", activeForm: "Running agents" },
  { content: "Phase 3: Conflict Detection", status: "pending", activeForm: "Detecting conflicts" },
  { content: "Phase 4: Merge & Synthesis", status: "pending", activeForm: "Merging plans" }
]})

// Step 1.1: Use CLI to analyze requirement and propose splits
Bash({
  command: `ccw cli -p "
PURPOSE: Analyze requirement and identify distinct sub-requirements/focus areas
Success: 2-${maxAgents} clearly separated sub-requirements that can be planned independently

TASK:
• Understand the overall requirement: '${taskDescription}'
• Identify major components, features, or concerns
• Split into 2-${maxAgents} independent sub-requirements
• Each sub-requirement should be:
  - Self-contained (can be planned independently)
  - Non-overlapping (minimal dependency on other sub-requirements)
  - Roughly equal in complexity
• For each sub-requirement, provide:
  - focus_area: Short identifier (e.g., 'auth-backend', 'ui-components')
  - description: What this sub-requirement covers
  - key_concerns: Main challenges or considerations
  - suggested_cli_tool: Which CLI tool is best suited (gemini/codex/qwen)

MODE: analysis

CONTEXT: @**/*

EXPECTED: JSON output with structure:
{
  \"original_requirement\": \"...\",
  \"complexity\": \"low|medium|high\",
  \"sub_requirements\": [
    {
      \"index\": 1,
      \"focus_area\": \"...\",
      \"description\": \"...\",
      \"key_concerns\": [\"...\"],
      \"suggested_cli_tool\": \"gemini|codex|qwen\",
      \"estimated_effort\": \"low|medium|high\"
    }
  ],
  \"dependencies_between_subs\": [
    { \"from\": 1, \"to\": 2, \"reason\": \"...\" }
  ],
  \"rationale\": \"Why this split was chosen\"
}

CONSTRAINTS: Maximum ${maxAgents} sub-requirements | Ensure clear boundaries
" --tool gemini --mode analysis`,
  run_in_background: true
})

// Wait for CLI completion and parse result
// ... (hook callback will provide result)
```

**After CLI completes**:

```javascript
// Parse CLI output to extract sub-requirements
const analysisResult = parseCLIOutput(cliOutput)
const subRequirements = analysisResult.sub_requirements

// Write requirement-analysis.json
Write(`${sessionFolder}/requirement-analysis.json`, JSON.stringify({
  session_id: sessionId,
  original_requirement: taskDescription,
  analysis_timestamp: getUtc8ISOString(),
  complexity: analysisResult.complexity,
  sub_requirements: subRequirements,
  dependencies_between_subs: analysisResult.dependencies_between_subs,
  rationale: analysisResult.rationale,
  options: { maxAgents, depth, mergeRule }
}, null, 2))

// Create agent folders
subRequirements.forEach(sub => {
  Bash(`mkdir -p ${sessionFolder}/agents/${sub.focus_area}`)
})

// User confirmation (unless auto mode)
if (!autoMode) {
  AskUserQuestion({
    questions: [{
      question: `已识别 ${subRequirements.length} 个子需求:\n${subRequirements.map((s, i) => `${i+1}. ${s.focus_area}: ${s.description}`).join('\n')}\n\n确认开始并行规划?`,
      header: "Confirm Split",
      multiSelect: false,
      options: [
        { label: "开始规划", description: "启动并行sub-agent" },
        { label: "调整拆分", description: "修改子需求划分" },
        { label: "取消", description: "退出规划" }
      ]
    }]
  })
}
```

### Phase 2: Parallel Sub-Agent Execution

Launch one agent per sub-requirement, each maintaining its own process files:

```javascript
TodoWrite({ todos: [
  { content: "Phase 1: Requirement Analysis", status: "completed", activeForm: "Analyzing requirements" },
  { content: "Phase 2: Parallel Agent Execution", status: "in_progress", activeForm: "Running agents" },
  ...subRequirements.map((sub, i) => ({
    content: `  → Agent ${i+1}: ${sub.focus_area}`,
    status: "pending",
    activeForm: `Planning ${sub.focus_area}`
  })),
  { content: "Phase 3: Conflict Detection", status: "pending", activeForm: "Detecting conflicts" },
  { content: "Phase 4: Merge & Synthesis", status: "pending", activeForm: "Merging plans" }
]})

// Launch all sub-agents in parallel
const agentPromises = subRequirements.map((sub, index) => {
  return Task({
    subagent_type: "cli-lite-planning-agent",
    run_in_background: false,
    description: `Plan: ${sub.focus_area}`,
    prompt: `
## Sub-Agent Context

You are planning ONE sub-requirement. Generate process docs + sub-plan.

**Focus Area**: ${sub.focus_area}
**Description**: ${sub.description}
**Key Concerns**: ${sub.key_concerns.join(', ')}
**CLI Tool**: ${sub.suggested_cli_tool}
**Depth**: ${depth}

## Input Context

\`\`\`json
{
  "task_description": "${sub.description}",
  "schema_path": "~/.claude/workflows/cli-templates/schemas/plan-json-schema.json",
  "session": { "id": "${sessionId}", "folder": "${sessionFolder}" },
  "process_docs": true,
  "focus_area": "${sub.focus_area}",
  "output_folder": "${sessionFolder}/agents/${sub.focus_area}",
  "cli_config": { "tool": "${sub.suggested_cli_tool}" },
  "parent_requirement": "${taskDescription}"
}
\`\`\`

## Output Requirements

Write 2 files to \`${sessionFolder}/agents/${sub.focus_area}/\`:
1. **planning-context.md** - Evidence paths + synthesized understanding
2. **sub-plan.json** - Plan with \`_metadata.source_agent: "${sub.focus_area}"\`

See cli-lite-planning-agent documentation for file formats.
`
  })
})

// Wait for all agents to complete
const agentResults = await Promise.all(agentPromises)
```

### Phase 3: Cross-Verification & Conflict Detection

Load all sub-plans and detect conflicts:

```javascript
TodoWrite({ todos: [
  { content: "Phase 1: Requirement Analysis", status: "completed", activeForm: "Analyzing requirements" },
  { content: "Phase 2: Parallel Agent Execution", status: "completed", activeForm: "Running agents" },
  { content: "Phase 3: Conflict Detection", status: "in_progress", activeForm: "Detecting conflicts" },
  { content: "Phase 4: Merge & Synthesis", status: "pending", activeForm: "Merging plans" }
]})

// Load all sub-plans
const subPlans = subRequirements.map(sub => {
  const planPath = `${sessionFolder}/agents/${sub.focus_area}/sub-plan.json`
  const content = Read(planPath)
  return {
    focus_area: sub.focus_area,
    index: sub.index,
    plan: JSON.parse(content)
  }
})

// Detect conflicts
const conflicts = {
  detected_at: getUtc8ISOString(),
  total_sub_plans: subPlans.length,
  conflicts: []
}

// 1. Effort conflicts (same task estimated differently)
const effortConflicts = detectEffortConflicts(subPlans)
conflicts.conflicts.push(...effortConflicts)

// 2. File conflicts (multiple agents modifying same file)
const fileConflicts = detectFileConflicts(subPlans)
conflicts.conflicts.push(...fileConflicts)

// 3. Approach conflicts (different approaches to same problem)
const approachConflicts = detectApproachConflicts(subPlans)
conflicts.conflicts.push(...approachConflicts)

// 4. Dependency conflicts (circular or missing dependencies)
const dependencyConflicts = detectDependencyConflicts(subPlans)
conflicts.conflicts.push(...dependencyConflicts)

// Write conflicts.json
Write(`${sessionFolder}/conflicts.json`, JSON.stringify(conflicts, null, 2))

console.log(`
## Conflict Detection Complete

**Total Sub-Plans**: ${subPlans.length}
**Conflicts Found**: ${conflicts.conflicts.length}

${conflicts.conflicts.length > 0 ? `
### Conflicts:
${conflicts.conflicts.map((c, i) => `
${i+1}. **${c.type}** (${c.severity})
   - Agents: ${c.agents_involved.join(' vs ')}
   - Issue: ${c.description}
   - Suggested Resolution: ${c.suggested_resolution}
`).join('\n')}
` : '✅ No conflicts detected - sub-plans are compatible'}
`)
```

**Conflict Detection Functions**:

```javascript
function detectFileConflicts(subPlans) {
  const fileModifications = {}
  const conflicts = []

  subPlans.forEach(sp => {
    sp.plan.tasks.forEach(task => {
      task.modification_points?.forEach(mp => {
        if (!fileModifications[mp.file]) {
          fileModifications[mp.file] = []
        }
        fileModifications[mp.file].push({
          focus_area: sp.focus_area,
          task_id: task.id,
          target: mp.target,
          change: mp.change
        })
      })
    })
  })

  Object.entries(fileModifications).forEach(([file, mods]) => {
    if (mods.length > 1) {
      const agents = [...new Set(mods.map(m => m.focus_area))]
      if (agents.length > 1) {
        conflicts.push({
          type: "file_conflict",
          severity: "high",
          file: file,
          agents_involved: agents,
          modifications: mods,
          description: `Multiple agents modifying ${file}`,
          suggested_resolution: "Sequence modifications or consolidate"
        })
      }
    }
  })

  return conflicts
}

function detectEffortConflicts(subPlans) {
  // Compare effort estimates across similar tasks
  // Return conflicts where estimates differ by >50%
  return []
}

function detectApproachConflicts(subPlans) {
  // Analyze approaches for contradictions
  // Return conflicts where approaches are incompatible
  return []
}

function detectDependencyConflicts(subPlans) {
  // Check for circular dependencies
  // Check for missing dependencies
  return []
}
```

### Phase 4: Merge & Synthesis

Use cli-lite-planning-agent to merge all sub-plans:

```javascript
TodoWrite({ todos: [
  { content: "Phase 1: Requirement Analysis", status: "completed", activeForm: "Analyzing requirements" },
  { content: "Phase 2: Parallel Agent Execution", status: "completed", activeForm: "Running agents" },
  { content: "Phase 3: Conflict Detection", status: "completed", activeForm: "Detecting conflicts" },
  { content: "Phase 4: Merge & Synthesis", status: "in_progress", activeForm: "Merging plans" }
]})

// Collect all planning context documents for context
const contextDocs = subRequirements.map(sub => {
  const path = `${sessionFolder}/agents/${sub.focus_area}/planning-context.md`
  return {
    focus_area: sub.focus_area,
    content: Read(path)
  }
})

// Invoke planning agent to merge
Task({
  subagent_type: "cli-lite-planning-agent",
  run_in_background: false,
  description: "Merge sub-plans into unified plan",
  prompt: `
## Mission: Merge Multiple Sub-Plans

Merge ${subPlans.length} sub-plans into a single unified plan.

## Schema Reference

Execute: cat ~/.claude/workflows/cli-templates/schemas/plan-json-schema.json

The merged plan follows the SAME schema as lite-plan, with ONE additional field:
- \`merge_metadata\`: Object containing merge-specific information

## Project Context

1. Read: .workflow/project-tech.json
2. Read: .workflow/project-guidelines.json

## Original Requirement

${taskDescription}

## Sub-Plans to Merge

${subPlans.map(sp => `
### Sub-Plan: ${sp.focus_area}
\`\`\`json
${JSON.stringify(sp.plan, null, 2)}
\`\`\`
`).join('\n')}

## Planning Context Documents

${contextDocs.map(cd => `
### Context: ${cd.focus_area}
${cd.content}
`).join('\n')}

## Detected Conflicts

\`\`\`json
${JSON.stringify(conflicts, null, 2)}
\`\`\`

## Merge Rules

**Rule**: ${mergeRule}
${mergeRule === 'consensus' ? `
- Equal weight to all sub-plans
- Conflicts resolved by finding middle ground
- Combine overlapping tasks
` : `
- Priority based on sub-requirement index
- Earlier agents' decisions take precedence
- Later agents adapt to earlier decisions
`}

## Requirements

1. **Task Consolidation**:
   - Combine tasks that modify same files
   - Preserve unique tasks from each sub-plan
   - Ensure no task duplication
   - Maintain clear task boundaries

2. **Dependency Resolution**:
   - Cross-reference dependencies between sub-plans
   - Create global task ordering
   - Handle inter-sub-plan dependencies

3. **Conflict Resolution**:
   - Apply ${mergeRule} rule to resolve conflicts
   - Document resolution rationale
   - Ensure no contradictions in final plan

4. **Metadata Preservation**:
   - Track which sub-plan each task originated from (source_agent field)
   - Include merge_metadata with:
     - merged_from: list of sub-plan focus areas
     - conflicts_resolved: count
     - merge_rule: ${mergeRule}

## Output

Write to ${sessionFolder}/plan.json following plan-json-schema.json.

Add ONE extension field for merge tracking:

\`\`\`json
{
  // ... all standard plan-json-schema fields ...

  "merge_metadata": {
    "source_session": "${sessionId}",
    "merged_from": ["focus-area-1", "focus-area-2"],
    "sub_plan_count": N,
    "conflicts_detected": N,
    "conflicts_resolved": N,
    "merge_rule": "${mergeRule}",
    "merged_at": "ISO-timestamp"
  }
}
\`\`\`

Each task should include \`source_agent\` field indicating which sub-plan it originated from.

## Success Criteria

- [ ] All sub-plan tasks included (or explicitly merged)
- [ ] Conflicts resolved per ${mergeRule} rule
- [ ] Dependencies form valid DAG (no cycles)
- [ ] merge_metadata present
- [ ] Schema compliance verified
- [ ] plan.json written to ${sessionFolder}/plan.json
`
})

// Generate human-readable plan.md
const plan = JSON.parse(Read(`${sessionFolder}/plan.json`))
const planMd = generatePlanMarkdown(plan, subRequirements, conflicts)
Write(`${sessionFolder}/plan.md`, planMd)
```

**Markdown Generation**:

```javascript
function generatePlanMarkdown(plan, subRequirements, conflicts) {
  return `# Collaborative Planning Session

**Session ID**: ${plan._metadata?.session_id || sessionId}
**Original Requirement**: ${taskDescription}
**Created**: ${getUtc8ISOString()}

---

## Sub-Requirements Analyzed

${subRequirements.map((sub, i) => `
### ${i+1}. ${sub.focus_area}
${sub.description}
- **Key Concerns**: ${sub.key_concerns.join(', ')}
- **Estimated Effort**: ${sub.estimated_effort}
`).join('\n')}

---

## Conflict Resolution

${conflicts.conflicts.length > 0 ? `
**Conflicts Detected**: ${conflicts.conflicts.length}
**Merge Rule**: ${mergeRule}

${conflicts.conflicts.map((c, i) => `
${i+1}. **${c.type}** - ${c.description}
   - Resolution: ${c.suggested_resolution}
`).join('\n')}
` : '✅ No conflicts detected'}

---

## Merged Plan

### Summary
${plan.summary}

### Approach
${plan.approach}

---

## Tasks

${plan.tasks.map((task, i) => `
### ${task.id}: ${task.title}

**Source**: ${task.source_agent || 'merged'}
**Scope**: ${task.scope}
**Action**: ${task.action}
**Complexity**: ${task.effort?.complexity || 'medium'}

${task.description}

**Modification Points**:
${task.modification_points?.map(mp => `- \`${mp.file}\` → ${mp.target}: ${mp.change}`).join('\n') || 'N/A'}

**Implementation**:
${task.implementation?.map((step, idx) => `${idx+1}. ${step}`).join('\n') || 'N/A'}

**Acceptance Criteria**:
${task.acceptance?.map(ac => `- ${ac}`).join('\n') || 'N/A'}

**Dependencies**: ${task.depends_on?.join(', ') || 'None'}

---
`).join('\n')}

## Execution

\`\`\`bash
# Execute this plan
/workflow:unified-execute-with-file -p ${sessionFolder}/plan.json

# Or with auto-confirmation
/workflow:unified-execute-with-file -y -p ${sessionFolder}/plan.json
\`\`\`

---

## Agent Process Files

${subRequirements.map(sub => `
### ${sub.focus_area}
- Context: \`${sessionFolder}/agents/${sub.focus_area}/planning-context.md\`
- Sub-Plan: \`${sessionFolder}/agents/${sub.focus_area}/sub-plan.json\`
`).join('\n')}

---

**Generated by**: /workflow:collaborative-plan-with-file
**Merge Rule**: ${mergeRule}
`
}
```

### Completion

```javascript
TodoWrite({ todos: [
  { content: "Phase 1: Requirement Analysis", status: "completed", activeForm: "Analyzing requirements" },
  { content: "Phase 2: Parallel Agent Execution", status: "completed", activeForm: "Running agents" },
  { content: "Phase 3: Conflict Detection", status: "completed", activeForm: "Detecting conflicts" },
  { content: "Phase 4: Merge & Synthesis", status: "completed", activeForm: "Merging plans" }
]})

console.log(`
✅ Collaborative Planning Complete

**Session**: ${sessionId}
**Sub-Agents**: ${subRequirements.length}
**Conflicts Resolved**: ${conflicts.conflicts.length}

## Output Files

📁 ${sessionFolder}/
├── requirement-analysis.json   # Requirement breakdown
├── agents/                     # Per-agent process files
${subRequirements.map(sub => `│   ├── ${sub.focus_area}/
│   │   ├── planning-context.md
│   │   └── sub-plan.json`).join('\n')}
├── conflicts.json              # Detected conflicts
├── plan.json                   # Unified plan (execution-ready)
└── plan.md                     # Human-readable plan

## Next Steps

Execute the plan:
\`\`\`bash
/workflow:unified-execute-with-file -p ${sessionFolder}/plan.json
\`\`\`

Review a specific agent's work:
\`\`\`bash
cat ${sessionFolder}/agents/{focus-area}/planning-context.md
\`\`\`
`)
```

## Configuration

| Flag | Default | Description |
|------|---------|-------------|
| `--max-agents` | 5 | Maximum sub-agents to spawn |
| `--depth` | normal | Exploration depth: normal or deep |
| `--merge-rule` | consensus | Conflict resolution: consensus or priority |
| `-y, --yes` | false | Auto-confirm all decisions |

## Error Handling

| Error | Resolution |
|-------|------------|
| Requirement too simple | Use single-agent lite-plan instead |
| Agent fails | Retry once, then continue with partial results |
| Merge conflicts unresolvable | Ask user for manual resolution |
| CLI timeout | Use fallback CLI tool |
| File write fails | Retry with alternative path |

## vs Other Planning Commands

| Command | Use Case |
|---------|----------|
| **collaborative-plan-with-file** | Complex multi-aspect requirements needing parallel exploration |
| lite-plan | Simple single-focus tasks |
| multi-cli-plan | Iterative cross-verification with convergence |

## Best Practices

1. **Be Specific**: Detailed requirements lead to better splits
2. **Review Process Files**: Check planning-context.md for insights
3. **Trust the Merge**: Conflict resolution follows defined rules
4. **Iterate if Needed**: Re-run with different --merge-rule if results unsatisfactory

---

**Now execute collaborative-plan-with-file for**: $ARGUMENTS
