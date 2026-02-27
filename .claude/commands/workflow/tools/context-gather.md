---
name: gather
description: Intelligently collect project context using context-search-agent based on task description, packages into standardized JSON
argument-hint: "--session WFS-session-id \"task description\""
examples:
  - /workflow:tools:context-gather --session WFS-user-auth "Implement user authentication system"
  - /workflow:tools:context-gather --session WFS-payment "Refactor payment module API"
  - /workflow:tools:context-gather --session WFS-bugfix "Fix login validation error"
allowed-tools: Task(*), Read(*), Glob(*)
---

# Context Gather Command (/workflow:tools:context-gather)

## Overview

Orchestrator command that invokes `context-search-agent` to gather comprehensive project context for implementation planning. Generates standardized `context-package.json` with codebase analysis, dependencies, and conflict detection.


## Core Philosophy

- **Agent Delegation**: Delegate all discovery to `context-search-agent` for autonomous execution
- **Detection-First**: Check for existing context-package before executing
- **Plan Mode**: Full comprehensive analysis (vs lightweight brainstorm mode)
- **Standardized Output**: Generate `.workflow/active/{session}/.process/context-package.json`

## Execution Process

```
Input Parsing:
   ├─ Parse flags: --session
   └─ Parse: task_description (required)

Step 1: Context-Package Detection
   └─ Decision (existing package):
      ├─ Valid package exists → Return existing (skip execution)
      └─ No valid package → Continue to Step 2

Step 2: Complexity Assessment & Parallel Explore
   ├─ Analyze task_description → classify Low/Medium/High
   ├─ Select exploration angles (1-4 based on complexity)
   ├─ Launch N cli-explore-agents in parallel
   │  └─ Each outputs: exploration-{angle}.json
   └─ Generate explorations-manifest.json

Step 3: Invoke Context-Search Agent (with exploration input)
   ├─ Phase 1: Initialization & Pre-Analysis
   ├─ Phase 2: Multi-Source Discovery
   │  ├─ Track 0: Exploration Synthesis (prioritize & deduplicate)
   │  ├─ Track 1-4: Existing tracks
   └─ Phase 3: Synthesis & Packaging
      └─ Generate context-package.json with exploration_results

Step 4: Output Verification
   └─ Verify context-package.json contains exploration_results
```

## Execution Flow

### Step 1: Context-Package Detection

**Execute First** - Check if valid package already exists:

```javascript
const contextPackagePath = `.workflow/${session_id}/.process/context-package.json`;

if (file_exists(contextPackagePath)) {
  const existing = Read(contextPackagePath);

  // Validate package belongs to current session
  if (existing?.metadata?.session_id === session_id) {
    console.log("✅ Valid context-package found for session:", session_id);
    console.log("📊 Stats:", existing.statistics);
    console.log("⚠️  Conflict Risk:", existing.conflict_detection.risk_level);
    return existing; // Skip execution, return existing
  } else {
    console.warn("⚠️ Invalid session_id in existing package, re-generating...");
  }
}
```

### Step 2: Complexity Assessment & Parallel Explore

**Only execute if Step 1 finds no valid package**

```javascript
// 2.1 Complexity Assessment
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

// 2.2 Launch Parallel Explore Agents
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
**You (cli-explore-agent) MUST execute these steps in order:**
1. Run: ccw tool exec get_modules_by_depth '{}' (project structure)
2. Run: rg -l "{keyword_from_task}" --type ts (locate relevant files)
3. Execute: cat ~/.claude/workflows/cli-templates/schemas/explore-json-schema.json (get output schema reference)

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

**File**: ${sessionFolder}/exploration-${angle}.json

**Schema Reference**: Schema obtained in MANDATORY FIRST STEPS step 3, follow schema exactly

**Required Fields** (all ${angle} focused):
- project_structure: Modules/architecture relevant to ${angle}
- relevant_files: Files affected from ${angle} perspective
  **IMPORTANT**: Use object format with relevance scores for synthesis:
  \`[{path: "src/file.ts", relevance: 0.85, rationale: "Core ${angle} logic"}]\`
  Scores: 0.7+ high priority, 0.5-0.7 medium, <0.5 low
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

// 2.3 Generate Manifest after all complete
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

### Step 3: Invoke Context-Search Agent

**Only execute after Step 2 completes**

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

## Exploration Input (from Step 2)
- **Manifest**: ${sessionFolder}/explorations-manifest.json
- **Exploration Count**: ${explorationManifest.exploration_count}
- **Angles**: ${explorationManifest.angles_explored.join(', ')}
- **Complexity**: ${complexity}

## Mission
Execute complete context-search-agent workflow for implementation planning:

### Phase 1: Initialization & Pre-Analysis
1. **Project State Loading**:
   - Read and parse `.workflow/project-tech.json`. Use its `overview` section as the foundational `project_context`. This is your primary source for architecture, tech stack, and key components.
   - Read and parse `.workflow/project-guidelines.json`. Load `conventions`, `constraints`, and `learnings` into a `project_guidelines` section.
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

- **Track 0**: Exploration Synthesis (load ${sessionFolder}/explorations-manifest.json, prioritize critical_files, deduplicate patterns/integration_points)
- **Track 1**: Historical archive analysis (query manifest.json for lessons learned)
- **Track 2**: Reference documentation (CLAUDE.md, architecture docs)
- **Track 3**: Web examples (use Exa MCP for unfamiliar tech/APIs)
- **Track 4**: Codebase analysis (5-layer discovery: files, content, patterns, deps, config/tests)

### Phase 3: Synthesis, Assessment & Packaging
1. Apply relevance scoring and build dependency graph
2. **Synthesize 5-source data** (including Track -1): Merge findings from all sources
   - Priority order: User Intent > Archive > Docs > Exploration > Code > Web
   - **Prioritize the context from `project-tech.json`** for architecture and tech stack unless code analysis reveals it's outdated
3. **Context Priority Sorting**:
   a. Combine scores from Track -1 (user intent alignment) + relevance scores + exploration critical_files
   b. Classify files into priority tiers:
      - **Critical** (score ≥ 0.85): Directly mentioned in user goal OR exploration critical_files
      - **High** (0.70-0.84): Key dependencies, patterns required for goal
      - **Medium** (0.50-0.69): Supporting files, indirect dependencies
      - **Low** (< 0.50): Contextual awareness only
   c. Generate dependency_order: Based on dependency graph + user goal sequence
   d. Document sorting_rationale: Explain prioritization logic

4. **Populate `project_context`**: Directly use the `overview` from `project-tech.json` to fill the `project_context` section. Include description, technology_stack, architecture, and key_components.
5. **Populate `project_guidelines`**: Load conventions, constraints, and learnings from `project-guidelines.json` into a dedicated section.
6. Integrate brainstorm artifacts (if .brainstorming/ exists, read content)
7. Perform conflict detection with risk assessment
8. **Inject historical conflicts** from archive analysis into conflict_detection
9. **Generate prioritized_context section**:
   ```json
   {
     "prioritized_context": {
       "user_intent": {
         "goal": "...",
         "scope": "...",
         "key_constraints": ["..."]
       },
       "priority_tiers": {
         "critical": [{ "path": "...", "relevance": 0.95, "rationale": "..." }],
         "high": [...],
         "medium": [...],
         "low": [...]
       },
       "dependency_order": ["module1", "module2", "module3"],
       "sorting_rationale": "Based on user goal alignment (Track -1), exploration critical files, and dependency graph analysis"
     }
   }
   ```
10. Generate and validate context-package.json with prioritized_context field

## Output Requirements
Complete context-package.json with:
- **metadata**: task_description, keywords, complexity, tech_stack, session_id
- **project_context**: description, technology_stack, architecture, key_components (sourced from `project-tech.json`)
- **project_guidelines**: {conventions, constraints, quality_rules, learnings} (sourced from `project-guidelines.json`)
- **assets**: {documentation[], source_code[], config[], tests[]} with relevance scores
- **dependencies**: {internal[], external[]} with dependency graph
- **brainstorm_artifacts**: {guidance_specification, role_analyses[], synthesis_output} with content
- **conflict_detection**: {risk_level, risk_factors, affected_modules[], mitigation_strategy, historical_conflicts[]}
- **exploration_results**: {manifest_path, exploration_count, angles, explorations[], aggregated_insights} (from Track 0)
- **prioritized_context**: {user_intent, priority_tiers{critical, high, medium, low}, dependency_order[], sorting_rationale}

## Quality Validation
Before completion verify:
- [ ] Valid JSON format with all required fields
- [ ] File relevance accuracy >80%
- [ ] Dependency graph complete (max 2 transitive levels)
- [ ] Conflict risk level calculated correctly
- [ ] No sensitive data exposed
- [ ] Total files ≤50 (prioritize high-relevance)

## Planning Notes Record (REQUIRED)
After completing context-package.json, append a brief execution record to planning-notes.md:

**File**: .workflow/active/${session_id}/planning-notes.md
**Location**: Under "## Context Findings (Phase 2)" section
**Format**:
\`\`\`
### [Context-Search Agent] YYYY-MM-DD
- **Note**: [智能补充：简短总结关键发现，如探索角度、关键文件、冲突风险等]
\`\`\`

Execute autonomously following agent documentation.
Report completion with statistics.
`
)
```

### Step 4: Output Verification

After agent completes, verify output:

```javascript
// Verify file was created
const outputPath = `.workflow/${session_id}/.process/context-package.json`;
if (!file_exists(outputPath)) {
  throw new Error("❌ Agent failed to generate context-package.json");
}

// Verify exploration_results included
const pkg = JSON.parse(Read(outputPath));
if (pkg.exploration_results?.exploration_count > 0) {
  console.log(`✅ Exploration results aggregated: ${pkg.exploration_results.exploration_count} angles`);
}
```

## Parameter Reference

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `--session` | string | ✅ | Workflow session ID (e.g., WFS-user-auth) |
| `task_description` | string | ✅ | Detailed task description for context extraction |

## Output Schema

Refer to `context-search-agent.md` Phase 3.7 for complete `context-package.json` schema.

**Key Sections**:
- **metadata**: Session info, keywords, complexity, tech stack
- **project_context**: Architecture patterns, conventions, tech stack (populated from `project-tech.json`)
- **project_guidelines**: Conventions, constraints, quality rules, learnings (populated from `project-guidelines.json`)
- **assets**: Categorized files with relevance scores (documentation, source_code, config, tests)
- **dependencies**: Internal and external dependency graphs
- **brainstorm_artifacts**: Brainstorm documents with full content (if exists)
- **conflict_detection**: Risk assessment with mitigation strategies and historical conflicts
- **exploration_results**: Aggregated exploration insights (from parallel explore phase)
- **prioritized_context**: Pre-sorted context with user intent and priority tiers (critical/high/medium/low)

## Notes

- **Detection-first**: Always check for existing package before invoking agent
- **User intent integration**: Load user intent from planning-notes.md (Phase 1 output)
- **Output**: Generates `context-package.json` with `prioritized_context` field
- **Plan-specific**: Use this for implementation planning; brainstorm mode uses direct agent call
