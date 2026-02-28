# Phase 2: Test Context Gather (test-context-gather)

Gather test context via coverage analysis or codebase scan.

## Objective

- Gather test context (coverage analysis or codebase scan)
- Generate context package for downstream analysis

## Execution

### Step 1.2: Gather Test Context

Two modes are available depending on whether a source session exists:

---

### Mode A: Session Mode (gather from source session)

Collect test coverage context using test-context-search-agent and package into standardized test-context JSON.

#### Core Philosophy

- **Agent Delegation**: Delegate all test coverage analysis to `test-context-search-agent` for autonomous execution
- **Detection-First**: Check for existing test-context-package before executing
- **Coverage-First**: Analyze existing test coverage before planning new tests
- **Source Context Loading**: Import implementation summaries from source session
- **Standardized Output**: Generate `.workflow/active/{test_session_id}/.process/test-context-package.json`

#### Step A.1: Test-Context-Package Detection

**Execute First** - Check if valid package already exists:

```javascript
const testContextPath = `.workflow/${test_session_id}/.process/test-context-package.json`;

if (file_exists(testContextPath)) {
  const existing = Read(testContextPath);

  // Validate package belongs to current test session
  if (existing?.metadata?.test_session_id === test_session_id) {
    console.log("Valid test-context-package found for session:", test_session_id);
    console.log("Coverage Stats:", existing.test_coverage.coverage_stats);
    console.log("Framework:", existing.test_framework.framework);
    console.log("Missing Tests:", existing.test_coverage.missing_tests.length);
    return existing; // Skip execution, return existing
  } else {
    console.warn("Invalid test_session_id in existing package, re-generating...");
  }
}
```

#### Step A.2: Invoke Test-Context-Search Agent

**Only execute if Step A.1 finds no valid package**

```javascript
Task(
  subagent_type="test-context-search-agent",
  run_in_background=false,
  description="Gather test coverage context",
  prompt=`

## Execution Mode
**PLAN MODE** (Comprehensive) - Full Phase 1-3 execution

## Session Information
- **Test Session ID**: ${test_session_id}
- **Output Path**: .workflow/${test_session_id}/.process/test-context-package.json

## Mission
Execute complete test-context-search-agent workflow for test generation planning:

### Phase 1: Session Validation & Source Context Loading
1. **Detection**: Check for existing test-context-package (early exit if valid)
2. **Test Session Validation**: Load test session metadata, extract source_session reference
3. **Source Context Loading**: Load source session implementation summaries, changed files, tech stack

### Phase 2: Test Coverage Analysis
Execute coverage discovery:
- **Track 1**: Existing test discovery (find *.test.*, *.spec.* files)
- **Track 2**: Coverage gap analysis (match implementation files to test files)
- **Track 3**: Coverage statistics (calculate percentages, identify gaps by module)

### Phase 3: Framework Detection & Packaging
1. Framework identification from package.json/requirements.txt
2. Convention analysis from existing test patterns
3. Generate and validate test-context-package.json

## Output Requirements
Complete test-context-package.json with:
- **metadata**: test_session_id, source_session_id, task_type, complexity
- **source_context**: implementation_summaries, tech_stack, project_patterns
- **test_coverage**: existing_tests[], missing_tests[], coverage_stats
- **test_framework**: framework, version, test_pattern, conventions
- **assets**: implementation_summary[], existing_test[], source_code[] with priorities
- **focus_areas**: Test generation guidance based on coverage gaps

## Quality Validation
Before completion verify:
- [ ] Valid JSON format with all required fields
- [ ] Source session context loaded successfully
- [ ] Test coverage gaps identified
- [ ] Test framework detected (or marked as 'unknown')
- [ ] Coverage percentage calculated correctly
- [ ] Missing tests catalogued with priority
- [ ] Execution time < 30 seconds (< 60s for large codebases)

Execute autonomously following agent documentation.
Report completion with coverage statistics.
`
)
```

#### Step A.3: Output Verification

After agent completes, verify output:

```javascript
// Verify file was created
const outputPath = `.workflow/${test_session_id}/.process/test-context-package.json`;
if (!file_exists(outputPath)) {
  throw new Error("Agent failed to generate test-context-package.json");
}

// Load and display summary
const testContext = Read(outputPath);
console.log("Test context package generated successfully");
console.log("Coverage:", testContext.test_coverage.coverage_stats.coverage_percentage + "%");
console.log("Tests to generate:", testContext.test_coverage.missing_tests.length);
```

---

### Mode B: Prompt Mode (gather from codebase)

Intelligently collect project context using context-search-agent based on task description, packages into standardized JSON.

#### Core Philosophy

- **Agent Delegation**: Delegate all discovery to `context-search-agent` for autonomous execution
- **Detection-First**: Check for existing context-package before executing
- **Plan Mode**: Full comprehensive analysis (vs lightweight brainstorm mode)
- **Standardized Output**: Generate `.workflow/active/{session}/.process/context-package.json`

#### Step B.1: Context-Package Detection

**Execute First** - Check if valid package already exists:

```javascript
const contextPackagePath = `.workflow/${session_id}/.process/context-package.json`;

if (file_exists(contextPackagePath)) {
  const existing = Read(contextPackagePath);

  // Validate package belongs to current session
  if (existing?.metadata?.session_id === session_id) {
    console.log("Valid context-package found for session:", session_id);
    console.log("Stats:", existing.statistics);
    console.log("Conflict Risk:", existing.conflict_detection.risk_level);
    return existing; // Skip execution, return existing
  } else {
    console.warn("Invalid session_id in existing package, re-generating...");
  }
}
```

#### Step B.2: Complexity Assessment & Parallel Explore

**Only execute if Step B.1 finds no valid package**

```javascript
// B.2.1 Complexity Assessment
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
const sessionFolder = `.workflow/active/${session_id}/.process`;

// B.2.2 Launch Parallel Explore Agents
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
- **Session ID**: ${session_id}
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
  [{path: "src/file.ts", relevance: 0.85, rationale: "Contains AuthService.login() - entry point for JWT token generation", role: "modify_target", discovery_source: "bash-scan", key_symbols: ["AuthService", "login"]}]
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

// B.2.3 Generate Manifest after all complete
const explorationFiles = bash(`find ${sessionFolder} -name "exploration-*.json" -type f`).split('\n').filter(f => f.trim());
const explorationManifest = {
  session_id,
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

#### Step B.3: Invoke Context-Search Agent

**Only execute after Step B.2 completes**

```javascript
// Load user intent from planning-notes.md (from Phase 1)
const planningNotesPath = `.workflow/active/${session_id}/planning-notes.md`;
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
- **Session ID**: ${session_id}
- **Task Description**: ${task_description}
- **Output Path**: .workflow/${session_id}/.process/context-package.json

## User Intent (from Phase 1 - Planning Notes)
**GOAL**: ${userIntent.goal}
**KEY_CONSTRAINTS**: ${userIntent.key_constraints}

This is the PRIMARY context source - all subsequent analysis must align with user intent.

## Exploration Input (from Step B.2)
- **Manifest**: ${sessionFolder}/explorations-manifest.json
- **Exploration Count**: ${explorationManifest.exploration_count}
- **Angles**: ${explorationManifest.angles_explored.join(', ')}
- **Complexity**: ${complexity}

## Mission
Execute complete context-search-agent workflow for implementation planning:

### Phase 1: Initialization & Pre-Analysis
1. **Project State Loading**:
   - Run: \`ccw spec load --category execution\` to load project context, tech stack, and guidelines.
   - If files don't exist, proceed with fresh analysis.
2. **Detection**: Check for existing context-package (early exit if valid)
3. **Foundation**: Initialize CodexLens, get project structure, load docs
4. **Analysis**: Extract keywords, determine scope, classify complexity based on task description and project state

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
2. **Synthesize 5-source data** (including Track -1): Merge findings from all sources
   - Priority order: User Intent > Archive > Docs > Exploration > Code > Web
   - **Prioritize the context from project-tech.json** for architecture and tech stack unless code analysis reveals it's outdated
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

Execute autonomously following agent documentation.
Report completion with statistics.
`
)
```

#### Step B.4: Output Verification

After agent completes, verify output:

```javascript
// Verify file was created
const outputPath = `.workflow/${session_id}/.process/context-package.json`;
if (!file_exists(outputPath)) {
  throw new Error("Agent failed to generate context-package.json");
}

// Verify exploration_results included
const pkg = JSON.parse(Read(outputPath));
if (pkg.exploration_results?.exploration_count > 0) {
  console.log(`Exploration results aggregated: ${pkg.exploration_results.exploration_count} angles`);
}
```

---

**Input**: `testSessionId` from Phase 1

**Parse Output**:
- Extract: context package path (store as `contextPath`)
- Pattern: `.workflow/active/[testSessionId]/.process/[test-]context-package.json`

**Validation**:
- Context package file exists and is valid JSON
- Contains coverage analysis (session mode) or codebase analysis (prompt mode)
- Test framework detected

**TodoWrite Update (tasks attached)**:
```json
[
  {"content": "Phase 1: Test Generation", "status": "in_progress"},
  {"content": "  -> Create test session", "status": "completed"},
  {"content": "  -> Gather test context", "status": "in_progress"},
  {"content": "    -> Load source/codebase context", "status": "in_progress"},
  {"content": "    -> Analyze test coverage", "status": "pending"},
  {"content": "    -> Generate context package", "status": "pending"},
  {"content": "  -> Test analysis (Gemini)", "status": "pending"},
  {"content": "  -> Generate test tasks", "status": "pending"},
  {"content": "Phase 2: Test Cycle Execution", "status": "pending"}
]
```

**TodoWrite Update (tasks collapsed)**:
```json
[
  {"content": "Phase 1: Test Generation", "status": "in_progress"},
  {"content": "  -> Create test session", "status": "completed"},
  {"content": "  -> Gather test context", "status": "completed"},
  {"content": "  -> Test analysis (Gemini)", "status": "pending"},
  {"content": "  -> Generate test tasks", "status": "pending"},
  {"content": "Phase 2: Test Cycle Execution", "status": "pending"}
]
```

## Output

- **Variable**: `contextPath` (context-package.json path)

## Next Phase

Continue to [Phase 3: Test Concept Enhanced](03-test-concept-enhanced.md).
