# Phase 2: Context Gathering

Gather project context and analyze codebase via context-search-agent with parallel exploration.

## Objective

- Gather project context using context-search-agent
- Identify critical files, architecture patterns, and constraints
- Detect conflict risk level for Phase 3 decision
- Update planning-notes.md with findings

## Core Philosophy

- **Agent Delegation**: Delegate all discovery to `context-search-agent` for autonomous execution
- **Detection-First**: Check for existing context-package before executing
- **Plan Mode**: Full comprehensive analysis (vs lightweight brainstorm mode)
- **Standardized Output**: Generate `.workflow/active/{session}/.process/context-package.json`

## Execution

### Step 2.1: Context-Package Detection

**Execute First** - Check if valid package already exists:

```javascript
const contextPackagePath = `.workflow/active/${sessionId}/.process/context-package.json`;

if (file_exists(contextPackagePath)) {
  const existing = Read(contextPackagePath);

  // Validate package belongs to current session
  if (existing?.metadata?.session_id === sessionId) {
    console.log("Valid context-package found for session:", sessionId);
    console.log("Stats:", existing.statistics);
    console.log("Conflict Risk:", existing.conflict_detection.risk_level);
    // Skip execution, store variables and proceed to Step 2.5
    contextPath = contextPackagePath;
    conflictRisk = existing.conflict_detection.risk_level;
    return; // Early exit - skip Steps 2.2-2.4
  }
}
```

### Step 2.2: Complexity Assessment & Parallel Explore

**Only execute if Step 2.1 finds no valid package**

```javascript
// 2.2.1 Complexity Assessment
function analyzeTaskComplexity(taskDescription) {
  const text = taskDescription.toLowerCase();
  if (/architect|refactor|restructure|modular|cross-module/.test(text)) return 'High';
  if (/multiple|several|integrate|migrate|extend/.test(text)) return 'Medium';
  return 'Low';
}

const ANGLE_PRESETS = {
  architecture: ['architecture', 'dependencies', 'modularity', 'integration-points'],
  security: ['security', 'auth-patterns', 'dataflow', 'validation'],
  performance: ['performance', 'bottlenecks', 'caching', 'data-access'],
  bugfix: ['error-handling', 'dataflow', 'state-management', 'edge-cases'],
  feature: ['patterns', 'integration-points', 'testing', 'dependencies'],
  refactor: ['architecture', 'patterns', 'dependencies', 'testing']
};

function selectAngles(taskDescription, complexity) {
  const text = taskDescription.toLowerCase();
  let preset = 'feature';
  if (/refactor|architect|restructure/.test(text)) preset = 'architecture';
  else if (/security|auth|permission/.test(text)) preset = 'security';
  else if (/performance|slow|optimi/.test(text)) preset = 'performance';
  else if (/fix|bug|error|issue/.test(text)) preset = 'bugfix';

  const count = complexity === 'High' ? 4 : (complexity === 'Medium' ? 3 : 1);
  return ANGLE_PRESETS[preset].slice(0, count);
}

const complexity = analyzeTaskComplexity(task_description);
const selectedAngles = selectAngles(task_description, complexity);
const sessionFolder = `.workflow/active/${sessionId}/.process`;

// 2.2.2 Launch Parallel Explore Agents
const explorationTasks = selectedAngles.map((angle, index) =>
  Task(
    subagent_type="cli-explore-agent",
    run_in_background=false,
    description=`Explore: ${angle}`,
    prompt=`
## Task Objective
Execute **${angle}** exploration for task planning context. Analyze codebase from this specific angle to discover relevant structure, patterns, and constraints.

## Assigned Context
- **Exploration Angle**: ${angle}
- **Task Description**: ${task_description}
- **Session ID**: ${sessionId}
- **Exploration Index**: ${index + 1} of ${selectedAngles.length}
- **Output File**: ${sessionFolder}/exploration-${angle}.json

## Agent Initialization
The cli-explore-agent autonomously executes project structure discovery, schema loading, project context loading, and keyword search as part of its Phase 1 initialization. No manual steps needed.

## Exploration Strategy (${angle} focus)

**Step 1: Structural Scan** (Bash)
- Identify modules related to ${angle}
- Locate files relevant to ${angle} aspect
- Analyze imports/dependencies from ${angle} perspective

**Step 2: Semantic Analysis** (Gemini CLI)
- How does existing code handle ${angle} concerns?
- What patterns are used for ${angle}?
- Where would new code integrate from ${angle} viewpoint?

**Step 3: Write Output**
- Consolidate ${angle} findings into JSON
- Identify ${angle}-specific clarification needs

## Expected Output

**File**: ${sessionFolder}/exploration-${angle}.json

**Required Fields** (all ${angle} focused):
- Follow explore-json-schema.json exactly (loaded during agent initialization)
- All fields scoped to ${angle} perspective
- Ensure rationale is specific to ${angle} topic (not generic)
- Include file:line locations in integration_points

## Success Criteria
- [ ] At least 3 relevant files identified with ${angle} rationale
- [ ] Patterns are actionable (code examples, not generic advice)
- [ ] Integration points include file:line locations
- [ ] Constraints are project-specific to ${angle}
- [ ] JSON output follows schema exactly
- [ ] clarification_needs includes options + recommended

## Output
Write: ${sessionFolder}/exploration-${angle}.json
Return: 2-3 sentence summary of ${angle} findings
`
  )
);

// 2.2.3 Generate Manifest after all complete
const explorationFiles = bash(`find ${sessionFolder} -name "exploration-*.json" -type f`).split('\n').filter(f => f.trim());
const explorationManifest = {
  session_id: sessionId,
  task_description,
  timestamp: new Date().toISOString(),
  complexity,
  exploration_count: selectedAngles.length,
  angles_explored: selectedAngles,
  explorations: explorationFiles.map(file => {
    const data = JSON.parse(Read(file));
    return { angle: data._metadata.exploration_angle, file: file.split('/').pop(), path: file, index: data._metadata.exploration_index };
  })
};
Write(`${sessionFolder}/explorations-manifest.json`, JSON.stringify(explorationManifest, null, 2));
```

### Step 2.3: Invoke Context-Search Agent

**Only execute after Step 2.2 completes**

```javascript
// Load user intent from planning-notes.md (from Phase 1)
const planningNotesPath = `.workflow/active/${sessionId}/planning-notes.md`;
let userIntent = { goal: task_description, key_constraints: "None specified" };

if (file_exists(planningNotesPath)) {
  const notesContent = Read(planningNotesPath);
  const goalMatch = notesContent.match(/\*\*GOAL\*\*:\s*(.+)/);
  const constraintsMatch = notesContent.match(/\*\*KEY_CONSTRAINTS\*\*:\s*(.+)/);
  if (goalMatch) userIntent.goal = goalMatch[1].trim();
  if (constraintsMatch) userIntent.key_constraints = constraintsMatch[1].trim();
}

Task(
  subagent_type="context-search-agent",
  run_in_background=false,
  description="Gather comprehensive context for plan",
  prompt=`
## Execution Mode
**PLAN MODE** (Comprehensive) - Full Phase 1-3 execution with priority sorting

## Session Information
- **Session ID**: ${sessionId}
- **Task Description**: ${task_description}
- **Output Path**: .workflow/${sessionId}/.process/context-package.json

## User Intent (from Phase 1 - Planning Notes)
**GOAL**: ${userIntent.goal}
**KEY_CONSTRAINTS**: ${userIntent.key_constraints}

This is the PRIMARY context source - all subsequent analysis must align with user intent.

## Exploration Input (from Step 2.2)
- **Manifest**: ${sessionFolder}/explorations-manifest.json
- **Exploration Count**: ${explorationManifest.exploration_count}
- **Angles**: ${explorationManifest.angles_explored.join(', ')}
- **Complexity**: ${complexity}

## Mission
Execute complete context-search-agent workflow (Phase 1-3) for implementation planning.

Key emphasis:
- Run: ccw spec load --category exploration FIRST (per your spec Phase 1.1b)
- Synthesize exploration results with project context
- Generate prioritized_context with user_intent alignment
- Apply specs/*.md constraints during conflict detection

Input priority: User Intent > project-tech.json > Exploration results > Code discovery > Web examples

## Output Requirements

Complete context-package.json must include a **prioritized_context** section:
```json
{
  "prioritized_context": {
    "user_intent": { "goal": "...", "scope": "...", "key_constraints": ["..."] },
    "priority_tiers": {
      "critical": [{ "path": "...", "relevance": 0.95, "rationale": "..." }],
      "high": [], "medium": [], "low": []
    },
    "dependency_order": ["module1", "module2", "module3"],
    "sorting_rationale": "Based on user goal alignment, exploration critical files, and dependency graph"
  }
}
```

All other required fields (metadata, project_context, project_guidelines, assets, dependencies, brainstorm_artifacts, conflict_detection, exploration_results) follow context-search-agent standard output schema.

## Planning Notes Record (REQUIRED)
After completing context-package.json, append to planning-notes.md:

**File**: .workflow/active/${sessionId}/planning-notes.md
**Location**: Under "## Context Findings (Phase 2)" section
**Format**:
### [Context-Search Agent] YYYY-MM-DD
- **Note**: [Brief summary of key findings]

Execute autonomously following agent documentation.
Report completion with statistics.
`
)
```

### Step 2.4: Output Verification

After agent completes, verify output:

```javascript
// Verify file was created
const outputPath = `.workflow/active/${sessionId}/.process/context-package.json`;
if (!file_exists(outputPath)) {
  throw new Error("Agent failed to generate context-package.json");
}

// Store variables for subsequent phases
contextPath = outputPath;

// Verify exploration_results included
const pkg = JSON.parse(Read(outputPath));
if (pkg.exploration_results?.exploration_count > 0) {
  console.log(`Exploration results aggregated: ${pkg.exploration_results.exploration_count} angles`);
}

conflictRisk = pkg.conflict_detection?.risk_level || 'low';
```

### TodoWrite Update (Phase 2 in progress - tasks attached)

```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "in_progress", "activeForm": "Executing context gathering"},
  {"content": "  -> Analyze codebase structure", "status": "in_progress", "activeForm": "Analyzing codebase structure"},
  {"content": "  -> Identify integration points", "status": "pending", "activeForm": "Identifying integration points"},
  {"content": "  -> Generate context package", "status": "pending", "activeForm": "Generating context package"},
  {"content": "Phase 4: Task Generation", "status": "pending", "activeForm": "Executing task generation"}
]
```

### TodoWrite Update (Phase 2 completed - tasks collapsed)

```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "completed", "activeForm": "Executing context gathering"},
  {"content": "Phase 4: Task Generation", "status": "pending", "activeForm": "Executing task generation"}
]
```

### Step 2.5: Update Planning Notes

After context gathering completes, update planning-notes.md with findings:

```javascript
// Read context-package to extract key findings
const contextPackage = JSON.parse(Read(contextPath))
const conflictRisk = contextPackage.conflict_detection?.risk_level || 'low'
const criticalFiles = (contextPackage.exploration_results?.aggregated_insights?.critical_files || [])
  .slice(0, 5).map(f => f.path)
const archPatterns = contextPackage.project_context?.architecture_patterns || []
const constraints = contextPackage.exploration_results?.aggregated_insights?.constraints || []

// Append Phase 2 findings to planning-notes.md
Edit(planningNotesPath, {
  old: '## Context Findings (Phase 2)\n(To be filled by context-gather)',
  new: `## Context Findings (Phase 2)

- **CRITICAL_FILES**: ${criticalFiles.join(', ') || 'None identified'}
- **ARCHITECTURE**: ${archPatterns.join(', ') || 'Not detected'}
- **CONFLICT_RISK**: ${conflictRisk}
- **CONSTRAINTS**: ${constraints.length > 0 ? constraints.join('; ') : 'None'}`
})

// Append Phase 2 constraints to consolidated list
Edit(planningNotesPath, {
  old: '## Consolidated Constraints (Phase 4 Input)',
  new: `## Consolidated Constraints (Phase 4 Input)
${constraints.map((c, i) => `${i + 2}. [Context] ${c}`).join('\n')}`
})
```

**Auto-Continue**: Return to user showing Phase 2 results, then auto-continue to Phase 3/4 (depending on `conflictRisk`).

## Output

- **Variable**: `contextPath` (path to context-package.json)
- **Variable**: `conflictRisk` (none/low/medium/high)
- **File**: `context-package.json`
- **TodoWrite**: Mark Phase 2 completed, determine Phase 3 or Phase 4

## Next Phase

Return to orchestrator. Orchestrator checks `conflictRisk`:
- If `conflictRisk >= medium` -> [Phase 3: Conflict Resolution](03-conflict-resolution.md)
- If `conflictRisk < medium` -> [Phase 4: Task Generation](04-task-generation.md)
