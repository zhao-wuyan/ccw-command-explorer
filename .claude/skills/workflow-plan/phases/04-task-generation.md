# Phase 4: Task Generation

> **📌 COMPACT SENTINEL [Phase 4: Task-Generation]**
> This phase contains 6 execution steps (Step 4.0 — 4.4).
> If you can read this sentinel but cannot find the full Step protocol below, context has been compressed.
> Recovery: `Read("phases/04-task-generation.md")`

Generate implementation plan and task JSONs via action-planning-agent.

## Objective

- Generate IMPL_PLAN.md, task JSONs, and TODO_LIST.md
- Present user with plan confirmation choices (verify / execute / review)
- Route to Phase 5 (verify) if user selects verification

## Relationship with Brainstorm Phase

- If brainstorm role analyses exist ([role]/analysis.md files), they are incorporated as input
- **User's original intent is ALWAYS primary**: New or refined user goals override brainstorm recommendations
- **Role analysis.md files define "WHAT"**: Requirements, design specs, role-specific insights
- **IMPL_PLAN.md defines "HOW"**: Executable task breakdown, dependencies, implementation sequence
- Task generation translates high-level role analyses into concrete, actionable work items
- **Intent priority**: Current user prompt > role analysis.md files > guidance-specification.md

## Core Philosophy

- **Planning Only**: Generate planning documents (IMPL_PLAN.md, task JSONs, TODO_LIST.md) - does NOT implement code
- **Agent-Driven Document Generation**: Delegate plan generation to action-planning-agent
- **NO Redundant Context Sorting**: Context priority sorting is ALREADY completed in context-gather Phase 2/3
  - Use `context-package.json.prioritized_context` directly
  - DO NOT re-sort files or re-compute priorities
  - `priority_tiers` and `dependency_order` are pre-computed and ready-to-use
- **N+1 Parallel Planning**: Auto-detect multi-module projects, enable parallel planning (2+1 or 3+1 mode)
- **Progressive Loading**: Load context incrementally (Core -> Selective -> On-Demand) due to analysis.md file size
- **Memory-First**: Reuse loaded documents from conversation memory
- **Smart Selection**: Load synthesis_output OR guidance + relevant role analyses, NOT all role analyses

## Execution

### Step 4.0: User Configuration (Interactive)

**Auto Mode Check**:
```javascript
const autoYes = workflowPreferences?.autoYes || false;

if (autoYes) {
  console.log(`[autoYes] Using defaults: No materials, Agent executor, Codex CLI`)
  userConfig = {
    supplementaryMaterials: { type: "none", content: [] },
    executionMethod: "agent",
    preferredCliTool: "codex",
    enableResume: true
  }
  // Skip to Step 4.1
}
```

**User Questions** (skipped if autoYes):
```javascript
if (!autoYes) AskUserQuestion({
  questions: [
    {
      question: "Do you have supplementary materials or guidelines to include?",
      header: "Materials",
      multiSelect: false,
      options: [
        { label: "No additional materials", description: "Use existing context only" },
        { label: "Provide file paths", description: "I'll specify paths to include" },
        { label: "Provide inline content", description: "I'll paste content directly" }
      ]
    },
    {
      question: "Select execution method for generated tasks:",
      header: "Execution",
      multiSelect: false,
      options: [
        { label: "Agent (Recommended)", description: "Claude agent executes tasks directly" },
        { label: "Hybrid", description: "Agent orchestrates, calls CLI for complex steps" },
        { label: "CLI Only", description: "All execution via CLI tools (codex/gemini/qwen)" }
      ]
    },
    {
      question: "If using CLI, which tool do you prefer?",
      header: "CLI Tool",
      multiSelect: false,
      options: [
        { label: "Codex (Recommended)", description: "Best for implementation tasks" },
        { label: "Gemini", description: "Best for analysis and large context" },
        { label: "Qwen", description: "Alternative analysis tool" },
        { label: "Auto", description: "Let agent decide per-task" }
      ]
    }
  ]
})
```

### Step 4.1: Context Preparation & Module Detection

**Command prepares session paths, metadata, detects module structure. Context priority sorting is NOT performed here.**

```javascript
// Session Path Structure:
// .workflow/active/WFS-{session-id}/
// ├── workflow-session.json          # Session metadata
// ├── planning-notes.md              # Consolidated planning notes
// ├── .process/
// │   └── context-package.json       # Context package
// ├── .task/                         # Output: Task JSON files
// ├── plan.json                      # Output: Structured plan overview
// ├── IMPL_PLAN.md                   # Output: Implementation plan
// └── TODO_LIST.md                   # Output: TODO list

// Auto Module Detection (determines single vs parallel mode)
function autoDetectModules(contextPackage, projectRoot) {
  // Complexity Gate: Only parallelize for High complexity
  const complexity = contextPackage.metadata?.complexity || 'Medium';
  if (complexity !== 'High') {
    return [{ name: 'main', prefix: '', paths: ['.'] }];
  }

  // Priority 1: Explicit frontend/backend separation
  if (exists('src/frontend') && exists('src/backend')) {
    return [
      { name: 'frontend', prefix: 'A', paths: ['src/frontend'] },
      { name: 'backend', prefix: 'B', paths: ['src/backend'] }
    ];
  }

  // Priority 2: Monorepo structure
  if (exists('packages/*') || exists('apps/*')) {
    return detectMonorepoModules();
  }

  // Priority 3: Context-package dependency clustering
  const modules = clusterByDependencies(contextPackage.dependencies?.internal);
  if (modules.length >= 2) return modules.slice(0, 3);

  // Default: Single module (original flow)
  return [{ name: 'main', prefix: '', paths: ['.'] }];
}

// Decision Logic:
// complexity !== 'High' -> Force Phase 2A (Single Agent)
// modules.length == 1 -> Phase 2A (Single Agent, original flow)
// modules.length >= 2 && complexity == 'High' -> Phase 2B + Phase 3 (N+1 Parallel)
```

### Step 4.2A: Single Agent Planning (modules.length == 1)

**Purpose**: Generate IMPL_PLAN.md, task JSONs, and TODO_LIST.md - planning documents only, NOT code implementation.

**Design Note**: The agent specification (action-planning-agent.md) already defines schemas, strategies, quality standards, and loading algorithms. This prompt provides **instance-specific parameters only** — session paths, user config, and context-package consumption guidance unique to this session.

```javascript
Task(
  subagent_type="action-planning-agent",
  run_in_background=false,
  description="Generate planning documents (IMPL_PLAN.md, task JSONs, TODO_LIST.md)",
  prompt=`
## TASK OBJECTIVE
Generate implementation planning documents (IMPL_PLAN.md, task JSONs, TODO_LIST.md) for workflow session ${sessionId}

## SESSION PATHS
Session Root: .workflow/active/${sessionId}/
Input:
  - Session Metadata: .workflow/active/${sessionId}/workflow-session.json
  - Planning Notes: .workflow/active/${sessionId}/planning-notes.md
  - Context Package: .workflow/active/${sessionId}/.process/context-package.json
Output:
  - Task Dir: .workflow/active/${sessionId}/.task/
  - IMPL_PLAN: .workflow/active/${sessionId}/IMPL_PLAN.md
  - TODO_LIST: .workflow/active/${sessionId}/TODO_LIST.md

## CONTEXT METADATA
Session ID: ${sessionId}
MCP Capabilities: {exa_code, exa_web, code_index}

## PROJECT CONTEXT (MANDATORY - load via ccw spec)
Execute: ccw spec load --category planning

This loads:
- Technology stack, architecture, key components, build system, test framework
- User-maintained rules and constraints (coding_conventions, naming_rules, forbidden_patterns, quality_gates)

Usage:
- Populate plan.json shared_context, align task tech choices, set correct test commands
- Apply as HARD CONSTRAINTS on all generated tasks — task implementation steps,
  acceptance criteria, and convergence.verification MUST respect these guidelines

If spec load returns empty: Proceed normally with context-package.project_context

Loading order: ccw spec load → planning-notes.md → context-package.json

## USER CONFIGURATION (from Step 4.0)
Execution Method: ${userConfig.executionMethod}  // agent|hybrid|cli
Preferred CLI Tool: ${userConfig.preferredCliTool}  // codex|gemini|qwen|auto
Supplementary Materials: ${userConfig.supplementaryMaterials}

## PRIORITIZED CONTEXT (from context-package.prioritized_context) - ALREADY SORTED
Context sorting is ALREADY COMPLETED in Phase 2/3. DO NOT re-sort.
Direct usage:
- **user_intent**: Use goal/scope/key_constraints for task alignment
- **priority_tiers.critical**: PRIMARY focus for task generation
- **priority_tiers.high**: SECONDARY focus
- **dependency_order**: Use for task sequencing - already computed
- **sorting_rationale**: Reference for understanding priority decisions

## EXPLORATION CONTEXT (from context-package.exploration_results) - SUPPLEMENT ONLY
If prioritized_context is incomplete, fall back to exploration_results:
- Use aggregated_insights.critical_files for focus_paths generation
- Apply aggregated_insights.constraints to acceptance criteria
- Reference aggregated_insights.all_patterns for implementation approach
- Use aggregated_insights.all_integration_points for precise modification locations

## FEATURE SPECIFICATIONS (conditional)
If context-package has brainstorm_artifacts.feature_index_path:
  Feature Index: [from context-package]
  Feature Spec Dir: [from context-package]
Else if .workflow/active/${sessionId}/.brainstorming/feature-specs/ exists:
  Feature Index: .workflow/active/${sessionId}/.brainstorming/feature-specs/feature-index.json

If the directory does not exist, skip this section.

## SESSION-SPECIFIC NOTES
- Deliverables: Task JSONs + IMPL_PLAN.md + plan.json + TODO_LIST.md (all 4 required)
- focus_paths: Derive from prioritized_context.priority_tiers (critical + high)
- Task sequencing: Use dependency_order from context-package (pre-computed)
- All other schemas, strategies, quality standards: Follow agent specification
`
)
```

### Step 4.2B: N Parallel Planning (modules.length >= 2)

**Condition**: `modules.length >= 2` (multi-module detected)

**Purpose**: Launch N action-planning-agents simultaneously, one per module.

```javascript
// Launch N agents in parallel (one per module)
const planningTasks = modules.map(module =>
  Task(
    subagent_type="action-planning-agent",
    run_in_background=false,
    description=`Generate ${module.name} module task JSONs`,
    prompt=`
## TASK OBJECTIVE
Generate task JSON files for ${module.name} module within workflow session

IMPORTANT: This is PLANNING ONLY - generate task JSONs, NOT implementing code.
IMPORTANT: Generate Task JSONs ONLY. IMPL_PLAN.md and TODO_LIST.md by Phase 3 Coordinator.

## PLANNING NOTES (PHASE 1-3 CONTEXT)
Load: .workflow/active/${sessionId}/planning-notes.md

## MODULE SCOPE
- Module: ${module.name} (${module.type})
- Focus Paths: ${module.paths.join(', ')}
- Task ID Prefix: IMPL-${module.prefix}
- Task Limit: <=6 tasks (hard limit for this module)
- Other Modules: ${otherModules.join(', ')} (reference only)

## SESSION PATHS
Input:
  - Session Metadata: .workflow/active/${sessionId}/workflow-session.json
  - Planning Notes: .workflow/active/${sessionId}/planning-notes.md
  - Context Package: .workflow/active/${sessionId}/.process/context-package.json
Output:
  - Task Dir: .workflow/active/${sessionId}/.task/

## CROSS-MODULE DEPENDENCIES
- For dependencies ON other modules: Use placeholder depends_on: ["CROSS::{module}::{pattern}"]
- Example: depends_on: ["CROSS::B::api-endpoint"]
- Phase 3 Coordinator resolves to actual task IDs

## CLI EXECUTION ID REQUIREMENTS (MANDATORY)
Each task JSON MUST include:
- **cli_execution.id**: Unique ID (format: {session_id}-IMPL-${module.prefix}{seq})
- Cross-module dep -> { "strategy": "cross_module_fork", "resume_from": "CROSS::{module}::{pattern}" }

## QUALITY STANDARDS
  - Task count <= 9 for this module
  - Focus paths scoped to ${module.paths.join(', ')} only
  - Cross-module dependencies use CROSS:: placeholder format

## PLANNING NOTES RECORD (REQUIRED)
### [${module.name}] YYYY-MM-DD
- **Tasks**: [count] ([IDs])
- **CROSS deps**: [placeholders used]
    `
  )
);

// Execute all in parallel
await Promise.all(planningTasks);
```

### Step 4.3: Integration (+1 Coordinator, Multi-Module Only)

**Condition**: Only executed when `modules.length >= 2`

```javascript
Task(
  subagent_type="action-planning-agent",
  run_in_background=false,
  description="Integrate module tasks and generate unified documents",
  prompt=`
## TASK OBJECTIVE
Integrate all module task JSONs, resolve cross-module dependencies, and generate unified IMPL_PLAN.md and TODO_LIST.md

IMPORTANT: This is INTEGRATION ONLY - consolidate existing task JSONs, NOT creating new tasks.

## SESSION PATHS
Input:
  - Session Metadata: .workflow/active/${sessionId}/workflow-session.json
  - Context Package: .workflow/active/${sessionId}/.process/context-package.json
  - Task JSONs: .workflow/active/${sessionId}/.task/IMPL-*.json (from Phase 2B)
Output:
  - Updated Task JSONs: .workflow/active/${sessionId}/.task/IMPL-*.json (resolved dependencies)
  - IMPL_PLAN: .workflow/active/${sessionId}/IMPL_PLAN.md
  - TODO_LIST: .workflow/active/${sessionId}/TODO_LIST.md

## INTEGRATION STEPS
1. Collect all .task/IMPL-*.json, group by module prefix
2. Resolve CROSS:: dependencies -> actual task IDs, update task JSONs
3. Generate IMPL_PLAN.md (multi-module format)
4. Generate TODO_LIST.md (hierarchical format)

## CROSS-MODULE DEPENDENCY RESOLUTION
- Pattern: CROSS::{module}::{pattern} -> IMPL-{module}* matching title/context
- Log unresolved as warnings

## PLANNING NOTES RECORD (REQUIRED)
### [Coordinator] YYYY-MM-DD
- **Total**: [count] tasks
- **Resolved**: [CROSS:: resolutions]
  `
)
```

### TodoWrite Update (Phase 4 in progress)

```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "completed", "activeForm": "Executing context gathering"},
  {"content": "Phase 4: Task Generation", "status": "in_progress", "activeForm": "Executing task generation"}
]
```

### TodoWrite Update (Phase 4 completed)

```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "completed", "activeForm": "Executing context gathering"},
  {"content": "Phase 4: Task Generation", "status": "completed", "activeForm": "Executing task generation"}
]
```

### Step 4.4: Plan Confirmation (User Decision Gate)

After Phase 4 completes, present user with action choices:

```javascript
console.log(`
Planning complete for session: ${sessionId}
Tasks generated: ${taskCount}
Plan: .workflow/active/${sessionId}/IMPL_PLAN.md
`);

// Ask user for next action
const userChoice = AskUserQuestion({
  questions: [{
    question: "Planning complete. What would you like to do next?",
    header: "Next Action",
    multiSelect: false,
    options: [
      {
        label: "Verify Plan Quality (Recommended)",
        description: "Run quality verification to catch issues before execution."
      },
      {
        label: "Start Execution",
        description: "Begin implementing tasks immediately."
      },
      {
        label: "Review Status Only",
        description: "View task breakdown and session status without taking further action."
      }
    ]
  }]
});

// Execute based on user choice
if (userChoice.answers["Next Action"] === "Verify Plan Quality (Recommended)") {
  console.log("\nStarting plan verification...\n");
  // Route to Phase 5 (plan-verify) within this skill
} else if (userChoice.answers["Next Action"] === "Start Execution") {
  console.log("\nStarting task execution...\n");
  Skill(skill="workflow-execute", args="--session " + sessionId);
} else if (userChoice.answers["Next Action"] === "Review Status Only") {
  console.log("\nDisplaying session status...\n");
  // Display session status inline
  const sessionMeta = JSON.parse(Read(`.workflow/active/${sessionId}/workflow-session.json`));
  const todoList = Read(`.workflow/active/${sessionId}/TODO_LIST.md`);
  console.log(`Session: ${sessionId}`);
  console.log(`Status: ${sessionMeta.status}`);
  console.log(`\n--- TODO List ---\n${todoList}`);
}
```

**Auto Mode**: When `workflowPreferences.autoYes` is true, auto-select "Verify Plan Quality", then auto-continue to execute if quality gate is PROCEED.

**Return to Orchestrator**: Based on user's choice:
- **Verify** -> Orchestrator reads phases/05-plan-verify.md and executes Phase 5 in-process
- **Execute** -> Skill(skill="workflow-execute")
- **Review** -> Display session status inline

## Output

- **File**: `IMPL_PLAN.md` (implementation plan)
- **File**: `IMPL-*.json` (task JSON files)
- **File**: `TODO_LIST.md` (task list)
- **File**: `plan.json` (structured plan overview)
- **TodoWrite**: Mark Phase 4 completed

## Next Phase (Conditional)

Based on user's plan confirmation choice:
- If "Verify" -> [Phase 5: Plan Verification](05-plan-verify.md)
- If "Execute" -> Skill(skill="workflow-execute")
- If "Review" -> Display session status inline
