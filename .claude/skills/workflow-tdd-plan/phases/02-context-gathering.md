# Phase 2: Context Gathering

Gather project context and analyze codebase via context-search-agent with parallel exploration for TDD planning.

## Objective

- Gather project context using context-search-agent
- Identify critical files, architecture patterns, and constraints
- Detect conflict risk level for Phase 4 decision
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
Execute **${angle}** exploration for TDD task planning context. Analyze codebase from this specific angle to discover relevant structure, patterns, and constraints.

## Assigned Context
- **Exploration Angle**: ${angle}
- **Task Description**: ${task_description}
- **Session ID**: ${sessionId}
- **Exploration Index**: ${index + 1} of ${selectedAngles.length}
- **Output File**: ${sessionFolder}/exploration-${angle}.json

## MANDATORY FIRST STEPS (Execute by Agent)
1. Run: ccw tool exec get_modules_by_depth '{}' (project structure)
2. Run: rg -l "{keyword_from_task}" --type ts (locate relevant files)
3. Execute: cat ~/.ccw/workflows/cli-templates/schemas/explore-json-schema.json (get output schema reference)

## Exploration Strategy (${angle} focus)

**Step 1: Structural Scan** (Bash)
- get_modules_by_depth.sh -> identify modules related to ${angle}
- find/rg -> locate files relevant to ${angle} aspect
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

**Schema Reference**: Schema obtained in MANDATORY FIRST STEPS step 3, follow schema exactly

**Required Fields** (all ${angle} focused):
- project_structure: Modules/architecture relevant to ${angle}
- relevant_files: Files affected from ${angle} perspective
  **MANDATORY**: Every file MUST use structured object format with ALL required fields:
  [{path: "src/file.ts", relevance: 0.85, rationale: "Contains AuthService.login()", role: "modify_target", discovery_source: "bash-scan", key_symbols: ["AuthService", "login"]}]
  - **rationale** (required): Specific selection basis tied to ${angle} topic (>10 chars, not generic)
  - **role** (required): modify_target|dependency|pattern_reference|test_target|type_definition|integration_point|config|context_only
  - **discovery_source** (recommended): bash-scan|cli-analysis|ace-search|dependency-trace|manual
  - **key_symbols** (recommended): Key functions/classes/types in the file relevant to the task
  - Scores: 0.7+ high priority, 0.5-0.7 medium, <0.5 low
- patterns: ${angle}-related patterns to follow
- dependencies: Dependencies relevant to ${angle}
- integration_points: Where to integrate from ${angle} viewpoint (include file:line locations)
- constraints: ${angle}-specific limitations/conventions
- clarification_needs: ${angle}-related ambiguities (options array + recommended index)
- _metadata.exploration_angle: "${angle}"

## Success Criteria
- [ ] Schema obtained via cat explore-json-schema.json
- [ ] get_modules_by_depth.sh executed
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
  description="Gather comprehensive context for TDD plan",
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
Execute complete context-search-agent workflow for TDD implementation planning:

### Phase 1: Initialization & Pre-Analysis
1. **Project State Loading**:
   - Run: \`ccw spec load --category execution\` to load project context, tech stack, and guidelines.
   - If files don't exist, proceed with fresh analysis.
2. **Detection**: Check for existing context-package (early exit if valid)
3. **Foundation**: Initialize CodexLens, get project structure, load docs
4. **Analysis**: Extract keywords, determine scope, classify complexity

### Phase 2: Multi-Source Context Discovery
Execute all discovery tracks (WITH USER INTENT INTEGRATION):
- **Track -1**: User Intent & Priority Foundation (EXECUTE FIRST)
  - Load user intent (GOAL, KEY_CONSTRAINTS) from session input
  - Map user requirements to codebase entities (files, modules, patterns)
  - Establish baseline priority scores based on user goal alignment
  - Output: user_intent_mapping.json with preliminary priority scores

- **Track 0**: Exploration Synthesis (load explorations-manifest.json, prioritize critical_files, deduplicate patterns/integration_points)
- **Track 1**: Historical archive analysis (query manifest.json for lessons learned)
- **Track 2**: Reference documentation (CLAUDE.md, architecture docs)
- **Track 3**: Web examples (use Exa MCP for unfamiliar tech/APIs)
- **Track 4**: Codebase analysis (5-layer discovery: files, content, patterns, deps, config/tests)

### Phase 3: Synthesis, Assessment & Packaging
1. Apply relevance scoring and build dependency graph
2. **Synthesize 5-source data**: Merge findings from all sources
   - Priority order: User Intent > Archive > Docs > Exploration > Code > Web
   - **Prioritize the context from project-tech.json** for architecture and tech stack
3. **Context Priority Sorting**:
   a. Combine scores from Track -1 (user intent alignment) + relevance scores + exploration critical_files
   b. Classify files into priority tiers:
      - **Critical** (score >= 0.85): Directly mentioned in user goal OR exploration critical_files
      - **High** (0.70-0.84): Key dependencies, patterns required for goal
      - **Medium** (0.50-0.69): Supporting files, indirect dependencies
      - **Low** (< 0.50): Contextual awareness only
   c. Generate dependency_order: Based on dependency graph + user goal sequence
   d. Document sorting_rationale: Explain prioritization logic
4. **Populate project_context**: Directly use the overview from project-tech.json
5. **Populate project_guidelines**: Load from specs/*.md
6. Integrate brainstorm artifacts (if .brainstorming/ exists, read content)
7. Perform conflict detection with risk assessment
8. **Inject historical conflicts** from archive analysis into conflict_detection
9. **Generate prioritized_context section**:
   {
     "prioritized_context": {
       "user_intent": { "goal": "...", "scope": "...", "key_constraints": ["..."] },
       "priority_tiers": {
         "critical": [{ "path": "...", "relevance": 0.95, "rationale": "..." }],
         "high": [...], "medium": [...], "low": [...]
       },
       "dependency_order": ["module1", "module2", "module3"],
       "sorting_rationale": "Based on user goal alignment, exploration critical files, and dependency graph"
     }
   }
10. Generate and validate context-package.json with prioritized_context field

## Output Requirements
Complete context-package.json with:
- **metadata**: task_description, keywords, complexity, tech_stack, session_id
- **project_context**: description, technology_stack, architecture, key_components (from project-tech.json)
- **project_guidelines**: {conventions, constraints, quality_rules, learnings} (from specs/*.md)
- **assets**: {documentation[], source_code[], config[], tests[]} with relevance scores
- **dependencies**: {internal[], external[]} with dependency graph
- **brainstorm_artifacts**: {guidance_specification, role_analyses[], synthesis_output} with content
- **conflict_detection**: {risk_level, risk_factors, affected_modules[], mitigation_strategy, historical_conflicts[]}
- **exploration_results**: {manifest_path, exploration_count, angles, explorations[], aggregated_insights}
- **prioritized_context**: {user_intent, priority_tiers{critical, high, medium, low}, dependency_order[], sorting_rationale}

## Quality Validation
Before completion verify:
- [ ] Valid JSON format with all required fields
- [ ] File relevance accuracy >80%
- [ ] Dependency graph complete (max 2 transitive levels)
- [ ] Conflict risk level calculated correctly
- [ ] No sensitive data exposed
- [ ] Total files <= 50 (prioritize high-relevance)

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
  {"content": "Phase 3: Test Coverage Analysis", "status": "pending", "activeForm": "Executing test coverage analysis"},
  {"content": "Phase 5: TDD Task Generation", "status": "pending", "activeForm": "Executing TDD task generation"},
  {"content": "Phase 6: TDD Structure Validation", "status": "pending", "activeForm": "Validating TDD structure"}
]
```

### TodoWrite Update (Phase 2 completed - tasks collapsed)

```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "completed", "activeForm": "Executing context gathering"},
  {"content": "Phase 3: Test Coverage Analysis", "status": "pending", "activeForm": "Executing test coverage analysis"},
  {"content": "Phase 5: TDD Task Generation", "status": "pending", "activeForm": "Executing TDD task generation"},
  {"content": "Phase 6: TDD Structure Validation", "status": "pending", "activeForm": "Validating TDD structure"}
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

**Auto-Continue**: Return to user showing Phase 2 results, then auto-continue to Phase 3.

## Output

- **Variable**: `contextPath` (path to context-package.json)
- **Variable**: `conflictRisk` (none/low/medium/high)
- **File**: `context-package.json`
- **TodoWrite**: Mark Phase 2 completed, determine Phase 3 or Phase 4

## Next Phase

Return to orchestrator. Orchestrator continues to [Phase 3: Test Coverage Analysis](03-test-coverage-analysis.md).
