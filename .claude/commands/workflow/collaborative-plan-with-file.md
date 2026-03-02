---
name: workflow:collaborative-plan-with-file
description: Collaborative planning with Plan Note - Understanding agent creates shared plan-note.md template, parallel agents fill pre-allocated sections, conflict detection without merge. Outputs executable plan-note.md.
argument-hint: "[-y|--yes] <task description> [--max-agents=5]"
allowed-tools: TodoWrite(*), Task(*), AskUserQuestion(*), Read(*), Bash(*), Write(*), Glob(*), Grep(*), mcp__ace-tool__search_context(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-approve splits, skip confirmations.

# Collaborative Planning Command

## Quick Start

```bash
# Basic usage
/workflow:collaborative-plan-with-file "Implement real-time notification system"

# With options
/workflow:collaborative-plan-with-file "Refactor authentication module" --max-agents=4
/workflow:collaborative-plan-with-file "Add payment gateway support" -y
```

**Context Source**: Understanding-Agent + Per-agent exploration
**Output Directory**: `.workflow/.planning/{session-id}/`
**Default Max Agents**: 5 (actual count based on requirement complexity)
**Core Innovation**: Plan Note - shared collaborative document, no merge needed

## Output Artifacts

### Phase 1: Understanding Agent

| Artifact | Description |
|----------|-------------|
| `plan-note.md` | Shared collaborative document with pre-allocated sections |
| `requirement-analysis.json` | Sub-domain assignments and TASK ID ranges |

### Phase 2: Per Sub-Agent

| Artifact | Description |
|----------|-------------|
| `planning-context.md` | Evidence paths + synthesized understanding |
| `plan.json` | Plan overview with task_ids[] (NO embedded tasks[]) |
| `.task/TASK-*.json` | Independent task files following task-schema.json |
| Updates to `plan-note.md` | Agent fills pre-allocated sections |

### Phase 3: Final Output

| Artifact | Description |
|----------|-------------|
| `plan-note.md` | ⭐ Executable plan with conflict markers |
| `conflicts.json` | Detected conflicts with resolution options |
| `plan.md` | Human-readable summary |

## Overview

Unified collaborative planning workflow using **Plan Note** architecture:

1. **Understanding**: Agent analyzes requirements and creates plan-note.md template with pre-allocated sections
2. **Parallel Planning**: Each agent generates plan.json + fills their pre-allocated section in plan-note.md
3. **Conflict Detection**: Scan plan-note.md for conflicts (no merge needed)
4. **Completion**: Generate plan.md summary, ready for execution

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PLAN NOTE COLLABORATIVE PLANNING                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Phase 1: Understanding & Template Creation                              │
│     ├─ Understanding-Agent analyzes requirements                         │
│     ├─ Identify 2-5 sub-domains (focus areas)                            │
│     ├─ Create plan-note.md with pre-allocated sections                   │
│     └─ Assign TASK ID ranges (no conflicts)                              │
│                                                                          │
│  Phase 2: Parallel Agent Execution (No Locks Needed)                     │
│     ┌──────────────┬──────────────┬──────────────┐                       │
│     │   Agent 1    │   Agent 2    │   Agent N    │                       │
│     ├──────────────┼──────────────┼──────────────┤                       │
│     │ Own Section  │ Own Section  │ Own Section  │  ← Pre-allocated      │
│     │ plan.json    │ plan.json    │ plan.json    │  ← Detailed plans     │
│     └──────────────┴──────────────┴──────────────┘                       │
│                                                                          │
│  Phase 3: Conflict Detection (Single Source)                             │
│     ├─ Parse plan-note.md (all sections)                                 │
│     ├─ Detect file/dependency/strategy conflicts                         │
│     └─ Update plan-note.md conflict section                              │
│                                                                          │
│  Phase 4: Completion (No Merge)                                          │
│     ├─ Generate plan.md (human-readable)                                 │
│     └─ Ready for execution                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Output Structure

```
.workflow/.planning/{CPLAN-slug-YYYY-MM-DD}/
├── plan-note.md                  # Core: Requirements + Tasks + Conflicts
├── requirement-analysis.json     # Phase 1: Sub-domain assignments
├── agents/                       # Phase 2: Per-agent detailed plans
│   ├── {focus-area-1}/
│   │   ├── planning-context.md  # Evidence + understanding
│   │   ├── plan.json            # Plan overview with task_ids[] (NO embedded tasks[])
│   │   └── .task/               # Independent task files
│   │       ├── TASK-{ID}.json   # Task file following task-schema.json
│   │       └── ...
│   ├── {focus-area-2}/
│   │   └── ...
│   └── {focus-area-N}/
│       └── ...
├── conflicts.json                # Phase 3: Conflict details
└── plan.md                       # Phase 4: Human-readable summary
```

## Implementation

### Session Initialization

**Objective**: Create session context and directory structure for collaborative planning.

**Required Actions**:
1. Extract task description from `$ARGUMENTS`
2. Generate session ID with format: `CPLAN-{slug}-{date}`
   - slug: lowercase, alphanumeric, max 30 chars
   - date: YYYY-MM-DD (UTC+8)
3. Define session folder: `.workflow/.planning/{session-id}`
4. Parse command options:
   - `--max-agents=N` (default: 5)
   - `-y` or `--yes` for auto-approval mode
5. Create directory structure: `{session-folder}/agents/`

**Session Variables**:
- `sessionId`: Unique session identifier
- `sessionFolder`: Base directory for all artifacts
- `maxAgents`: Maximum number of parallel agents
- `autoMode`: Boolean for auto-confirmation

### Phase 1: Understanding & Template Creation

**Objective**: Analyze requirements and create the plan-note.md template with pre-allocated sections for parallel agents.

**Prerequisites**:
- Session initialized with valid sessionId and sessionFolder
- Task description available from $ARGUMENTS

**Guideline**: In Understanding phase, prioritize identifying latest documentation (README, design docs, architecture guides). When ambiguities exist, ask user for clarification instead of assuming interpretations.

**Workflow Steps**:

1. **Initialize Progress Tracking**
   - Create 4 todo items for workflow phases
   - Set Phase 1 status to `in_progress`

2. **Launch Understanding Agent**
   - Agent type: `cli-lite-planning-agent`
   - Execution mode: synchronous (run_in_background: false)

3. **Agent Tasks**:
   - **Identify Latest Documentation**: Search for and prioritize latest README, design docs, architecture guides
   - **Understand Requirements**: Extract core objective, key points, constraints from task description and latest docs
   - **Identify Ambiguities**: List any unclear points or multiple possible interpretations
   - **Form Clarification Checklist**: Prepare questions for user if ambiguities found (use AskUserQuestion)
   - **Split Sub-Domains**: Identify 2-{maxAgents} parallelizable focus areas
   - **Create Plan Note**: Generate plan-note.md with pre-allocated sections

**Output Files**:

| File | Purpose |
|------|---------|
| `{sessionFolder}/plan-note.md` | Collaborative template with pre-allocated sections per agent |
| `{sessionFolder}/requirement-analysis.json` | Sub-domain assignments and TASK ID ranges |

**requirement-analysis.json Schema**:
- `session_id`: Session identifier
- `original_requirement`: Task description
- `complexity`: Low | Medium | High
- `sub_domains[]`: Array of focus areas with task_id_range and estimated_effort
- `total_agents`: Number of agents to spawn

**Success Criteria**:
- Latest documentation identified and referenced (if available)
- Ambiguities resolved via user clarification (if any found)
- 2-{maxAgents} clear sub-domains identified
- Each sub-domain can be planned independently
- Plan Note template includes all pre-allocated sections
- TASK ID ranges have no overlap (100 IDs per agent)
- Requirements understanding is comprehensive

**Completion**:
- Log created artifacts
- Update Phase 1 todo status to `completed`

**Agent Call**:
```javascript
Task(
  subagent_type="cli-lite-planning-agent",
  run_in_background=false,
  description="Understand requirements and create plan template",
  prompt=`
## Mission: Create Plan Note Template

### Key Guidelines
1. **Prioritize Latest Documentation**: Search for and reference latest README, design docs, architecture guides when available
2. **Handle Ambiguities**: When requirement ambiguities exist, ask user for clarification (use AskUserQuestion) instead of assuming interpretations

### Project Context (MANDATORY)
Read and incorporate:
- \`.workflow/project-tech.json\` (if exists): Technology stack, architecture
- \`.ccw/specs/*.md\` (if exists): Constraints, conventions -- apply as HARD CONSTRAINTS on sub-domain splitting and plan structure

### Input Requirements
${taskDescription}

### Tasks
1. **Understand Requirements**: Extract core objective, key points, constraints (reference latest docs when available)
2. **Identify Ambiguities**: List any unclear points or multiple possible interpretations
3. **Form Clarification Checklist**: Prepare questions for user if ambiguities found
4. **Split Sub-Domains**: Identify 2-${maxAgents} parallelizable focus areas
5. **Create Plan Note**: Generate plan-note.md with pre-allocated sections

### Output Files

**File 1**: ${sessionFolder}/plan-note.md

Structure Requirements:
- YAML frontmatter: session_id, original_requirement, created_at, contributors, sub_domains, agent_sections, agent_task_id_ranges, status
- Section: ## 需求理解 (Core objectives, key points, constraints, split strategy)
- Section: ## 任务池 - {Focus Area 1} (Pre-allocated task section for agent 1, TASK-001 ~ TASK-100)
- Section: ## 任务池 - {Focus Area 2} (Pre-allocated task section for agent 2, TASK-101 ~ TASK-200)
- ... (One task pool section per sub-domain)
- Section: ## 依赖关系 (Auto-generated after all agents complete)
- Section: ## 冲突标记 (Populated in Phase 3)
- Section: ## 上下文证据 - {Focus Area 1} (Evidence for agent 1)
- Section: ## 上下文证据 - {Focus Area 2} (Evidence for agent 2)
- ... (One evidence section per sub-domain)

**File 2**: ${sessionFolder}/requirement-analysis.json
- session_id, original_requirement, complexity, sub_domains[], total_agents

### Success Criteria
- [ ] 2-${maxAgents} clear sub-domains identified
- [ ] Each sub-domain can be planned independently
- [ ] Plan Note template includes all pre-allocated sections
- [ ] TASK ID ranges have no overlap (100 IDs per agent)
`
)
```

### Phase 2: Parallel Sub-Agent Execution

**Objective**: Launch parallel planning agents to fill their pre-allocated sections in plan-note.md.

**Prerequisites**:
- Phase 1 completed successfully
- `{sessionFolder}/requirement-analysis.json` exists with sub-domain definitions
- `{sessionFolder}/plan-note.md` template created

**Workflow Steps**:

1. **Load Sub-Domain Configuration**
   - Read `{sessionFolder}/requirement-analysis.json`
   - Extract sub-domains array with focus_area, description, task_id_range

2. **Update Progress Tracking**
   - Set Phase 2 status to `in_progress`
   - Add sub-todo for each agent

3. **User Confirmation** (unless autoMode)
   - Display identified sub-domains with descriptions
   - Options: "开始规划" / "调整拆分" / "取消"
   - Skip if autoMode enabled

4. **Create Agent Directories**
   - For each sub-domain: `{sessionFolder}/agents/{focus-area}/`

5. **Launch Parallel Agents**
   - Agent type: `cli-lite-planning-agent`
   - Execution mode: synchronous (run_in_background: false)
   - Launch ALL agents in parallel (single message with multiple Task calls)

**Per-Agent Context**:
- Focus area name and description
- Assigned TASK ID range (no overlap with other agents)
- Session ID and folder path

**Per-Agent Tasks**:

| Task | Output | Description |
|------|--------|-------------|
| Generate plan.json + .task/*.json | `{sessionFolder}/agents/{focus-area}/plan.json` + `.task/` | Two-layer output: plan overview + independent task files |
| Update plan-note.md | Sync to shared file | Fill pre-allocated task pool and evidence sections |

**Task Summary Format** (for plan-note.md):
- Task header: `### TASK-{ID}: {Title} [{focus-area}]`
- Status, Complexity, Dependencies
- Scope description
- Modification points with file:line references
- Conflict risk assessment

**Evidence Format** (for plan-note.md):
- Related files with relevance scores
- Existing patterns identified
- Constraints discovered

**Agent Execution Rules**:
- Each agent modifies ONLY its pre-allocated sections
- Use assigned TASK ID range exclusively
- No locking needed (exclusive sections)
- Include conflict_risk assessment for each task

**Completion**:
- Wait for all agents to complete
- Log generated artifacts for each agent
- Update Phase 2 todo status to `completed`

**User Confirmation** (unless autoMode):
```javascript
if (!autoMode) {
  AskUserQuestion({
    questions: [{
      question: `已识别 ${subDomains.length} 个子领域:\n${subDomains.map((s, i) => `${i+1}. ${s.focus_area}: ${s.description}`).join('\n')}\n\n确认开始并行规划?`,
      header: "Confirm Split",
      multiSelect: false,
      options: [
        { label: "开始规划", description: "启动并行sub-agent" },
        { label: "调整拆分", description: "修改子领域划分" },
        { label: "取消", description: "退出规划" }
      ]
    }]
  })
}
```

**Launch Parallel Agents** (single message, multiple Task calls):
```javascript
// Create agent directories
subDomains.forEach(sub => {
  Bash(`mkdir -p ${sessionFolder}/agents/${sub.focus_area}`)
})

// Launch all agents in parallel
subDomains.map(sub =>
  Task(
    subagent_type="cli-lite-planning-agent",
    run_in_background=false,
    description=`Plan: ${sub.focus_area}`,
    prompt=`
## Sub-Agent Context

**Focus Area**: ${sub.focus_area}
**Description**: ${sub.description}
**TASK ID Range**: ${sub.task_id_range[0]}-${sub.task_id_range[1]}
**Session**: ${sessionId}

### Project Context (MANDATORY)
Read and incorporate:
- \`.workflow/project-tech.json\` (if exists): Technology stack, architecture
- \`.ccw/specs/*.md\` (if exists): Constraints, conventions -- apply as HARD CONSTRAINTS

## Dual Output Tasks

### Task 1: Generate Two-Layer Plan Output
Output: ${sessionFolder}/agents/${sub.focus_area}/plan.json
Output: ${sessionFolder}/agents/${sub.focus_area}/.task/TASK-*.json
Schema (plan): ~/.ccw/workflows/cli-templates/schemas/plan-overview-base-schema.json
Schema (tasks): ~/.ccw/workflows/cli-templates/schemas/task-schema.json

### Task 2: Sync Summary to plan-note.md

**Locate Your Sections**:
- Task Pool: "## 任务池 - ${toTitleCase(sub.focus_area)}"
- Evidence: "## 上下文证据 - ${toTitleCase(sub.focus_area)}"

**Task Summary Format**:
- Task header: ### TASK-${sub.task_id_range[0]}: Task Title [${sub.focus_area}]
- Fields: 状态, 复杂度, 依赖, 范围, 修改点, 冲突风险

**Evidence Format**:
- 相关文件, 现有模式, 约束

## Execution Steps
1. Create .task/ directory: mkdir -p ${sessionFolder}/agents/${sub.focus_area}/.task
2. Generate individual task files in .task/TASK-*.json following task-schema.json
3. Generate plan.json with task_ids[] referencing .task/ files (NO embedded tasks[])
4. Extract summary from .task/*.json files
5. Read ${sessionFolder}/plan-note.md
6. Locate and replace your task pool section
7. Locate and replace your evidence section
8. Write back plan-note.md

## Important
- Only modify your pre-allocated sections
- Use assigned TASK ID range: ${sub.task_id_range[0]}-${sub.task_id_range[1]}
`
  )
)
```

### Phase 3: Conflict Detection

**Objective**: Analyze plan-note.md for conflicts across all agent contributions without merging files.

**Prerequisites**:
- Phase 2 completed successfully
- All agents have updated plan-note.md with their sections
- `{sessionFolder}/plan-note.md` contains all task and evidence sections

**Workflow Steps**:

1. **Update Progress Tracking**
   - Set Phase 3 status to `in_progress`

2. **Parse Plan Note**
   - Read `{sessionFolder}/plan-note.md`
   - Extract YAML frontmatter (session metadata)
   - Parse markdown sections by heading levels
   - Identify all "任务池" sections

3. **Extract All Tasks**
   - For each "任务池" section:
     - Extract tasks matching pattern: `### TASK-{ID}: {Title} [{author}]`
     - Parse task details: status, complexity, dependencies, modification points, conflict risk
   - Consolidate into single task list

4. **Detect Conflicts**

   **File Conflicts**:
   - Group modification points by file:location
   - Identify locations modified by multiple agents
   - Record: severity=high, tasks involved, agents involved, suggested resolution

   **Dependency Cycles**:
   - Build dependency graph from task dependencies
   - Detect cycles using depth-first search
   - Record: severity=critical, cycle path, suggested resolution

   **Strategy Conflicts**:
   - Group tasks by files they modify
   - Identify files with high/medium conflict risk from multiple agents
   - Record: severity=medium, tasks involved, agents involved, suggested resolution

5. **Generate Conflict Artifacts**

   **conflicts.json**:
   - Write to `{sessionFolder}/conflicts.json`
   - Include: detected_at, total_tasks, total_agents, conflicts array
   - Each conflict: type, severity, tasks_involved, description, suggested_resolution

   **Update plan-note.md**:
   - Locate "## 冲突标记" section
   - Generate markdown summary of conflicts
   - Replace section content with conflict markdown

6. **Completion**
   - Log conflict detection summary
   - Display conflict details if any found
   - Update Phase 3 todo status to `completed`

**Conflict Types**:

| Type | Severity | Detection Logic |
|------|----------|-----------------|
| file_conflict | high | Same file:location modified by multiple agents |
| dependency_cycle | critical | Circular dependencies in task graph |
| strategy_conflict | medium | Multiple high-risk tasks in same file from different agents |

**Conflict Detection Functions**:

**parsePlanNote(markdown)**:
- Input: Raw markdown content of plan-note.md
- Process:
  - Extract YAML frontmatter between `---` markers
  - Parse frontmatter as YAML to get session metadata
  - Scan for heading patterns `^(#{2,})\s+(.+)$`
  - Build sections array with: level, heading, start position, content
- Output: `{ frontmatter: object, sections: array }`

**extractTasksFromSection(content, sectionHeading)**:
- Input: Section content text, section heading for attribution
- Process:
  - Match task pattern: `### (TASK-\d+):\s+(.+?)\s+\[(.+?)\]`
  - For each match: extract taskId, title, author
  - Call parseTaskDetails for additional fields
- Output: Array of task objects with id, title, author, source_section, ...details

**parseTaskDetails(content)**:
- Input: Task content block
- Process:
  - Extract fields via regex patterns:
    - `**状态**:\s*(.+)` → status
    - `**复杂度**:\s*(.+)` → complexity
    - `**依赖**:\s*(.+)` → depends_on (extract TASK-\d+ references)
    - `**冲突风险**:\s*(.+)` → conflict_risk
  - Extract modification points: `-\s+\`([^`]+):\s*([^`]+)\`:\s*(.+)` → file, location, summary
- Output: Details object with status, complexity, depends_on[], modification_points[], conflict_risk

**detectFileConflicts(tasks)**:
- Input: All tasks array
- Process:
  - Build fileMap: `{ "file:location": [{ task_id, task_title, source_agent, change }] }`
  - For each location with multiple modifications from different agents:
    - Create conflict with type='file_conflict', severity='high'
    - Include: location, tasks_involved, agents_involved, modifications
    - Suggested resolution: 'Coordinate modification order or merge changes'
- Output: Array of file conflict objects

**detectDependencyCycles(tasks)**:
- Input: All tasks array
- Process:
  - Build dependency graph: `{ taskId: [dependsOn_taskIds] }`
  - Use DFS with recursion stack to detect cycles
  - For each cycle found:
    - Create conflict with type='dependency_cycle', severity='critical'
    - Include: cycle path as tasks_involved
    - Suggested resolution: 'Remove or reorganize dependencies'
- Output: Array of dependency cycle conflict objects

**detectStrategyConflicts(tasks)**:
- Input: All tasks array
- Process:
  - Group tasks by files they modify
  - For each file with tasks from multiple agents:
    - Filter for high/medium conflict_risk tasks
    - If >1 high-risk tasks from different agents:
      - Create conflict with type='strategy_conflict', severity='medium'
      - Include: file, tasks_involved, agents_involved
      - Suggested resolution: 'Review approaches and align on single strategy'
- Output: Array of strategy conflict objects

**generateConflictMarkdown(conflicts)**:
- Input: Array of conflict objects
- Process:
  - If empty: return '✅ 无冲突检测到'
  - For each conflict:
    - Generate header: `### CONFLICT-{padded_index}: {description}`
    - Add fields: 严重程度, 涉及任务, 涉及Agent
    - Add 问题详情 based on conflict type
    - Add 建议解决方案
    - Add 决策状态: [ ] 待解决
- Output: Markdown string for plan-note.md "## 冲突标记" section

**replaceSectionContent(markdown, sectionHeading, newContent)**:
- Input: Original markdown, target section heading, new content
- Process:
  - Find section heading position via regex
  - Find next heading of same or higher level
  - Replace content between heading and next section
  - If section not found: append at end
- Output: Updated markdown string

### Phase 4: Completion

**Objective**: Generate human-readable plan summary and finalize workflow.

**Prerequisites**:
- Phase 3 completed successfully
- Conflicts detected and documented in plan-note.md
- All artifacts generated

**Workflow Steps**:

1. **Update Progress Tracking**
   - Set Phase 4 status to `in_progress`

2. **Read Final State**
   - Read `{sessionFolder}/plan-note.md`
   - Extract frontmatter metadata
   - Load conflicts from Phase 3

3. **Generate plan.md**
   - Create human-readable summary including:
     - Session metadata
     - Requirements understanding
     - Sub-domain breakdown
     - Task overview by focus area
     - Conflict report
     - Execution instructions

4. **Write Summary File**
   - Write to `{sessionFolder}/plan.md`

5. **Display Completion Summary**
   - Session statistics
   - File structure
   - Execution command
   - Conflict status

6. **Update Todo**
   - Set Phase 4 status to `completed`

**plan.md Structure**:

| Section | Content |
|---------|---------|
| Header | Session ID, created time, original requirement |
| Requirements | Copy from plan-note.md "## 需求理解" section |
| Sub-Domain Split | List each focus area with description and task ID range |
| Task Overview | Tasks grouped by focus area with complexity and dependencies |
| Conflict Report | Summary of detected conflicts or "无冲突" |
| Execution | Command to execute the plan |

**Required Function** (semantic description):
- **generateHumanReadablePlan**: Extract sections from plan-note.md and format as readable plan.md with session info, requirements, tasks, and conflicts

## Configuration

| Flag | Default | Description |
|------|---------|-------------|
| `--max-agents` | 5 | Maximum sub-agents to spawn |
| `-y, --yes` | false | Auto-confirm all decisions |

## Error Handling

| Error | Resolution |
|-------|------------|
| Understanding agent fails | Retry once, provide more context |
| Planning agent fails | Skip failed agent, continue with others |
| Section not found in plan-note | Agent creates section (defensive) |
| Conflict detection fails | Continue with empty conflicts |


## Best Practices

1. **Clear Requirements**: Detailed requirements → better sub-domain splitting
2. **Reference Latest Documentation**: Understanding agent should prioritize identifying and referencing latest docs (README, design docs, architecture guides)
3. **Ask When Uncertain**: When ambiguities or multiple interpretations exist, ask user for clarification instead of assuming
4. **Review Plan Note**: Check plan-note.md before execution
5. **Resolve Conflicts**: Address high/critical conflicts before execution
6. **Inspect Details**: Use agents/{focus-area}/plan.json for deep dive

---

**Now execute collaborative-plan-with-file for**: $ARGUMENTS
