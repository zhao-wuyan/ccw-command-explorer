# Phase 5: TDD Task Generation

> **📌 COMPACT SENTINEL [Phase 5: TDD-Task-Generation]**
> This phase contains 3 execution steps (Step 5.1 — 5.3).
> If you can read this sentinel but cannot find the full Step protocol below, context has been compressed.
> Recovery: `Read("phases/05-tdd-task-generation.md")`

Generate TDD tasks with Red-Green-Refactor cycles via action-planning-agent.

## Objective

- Generate IMPL_PLAN.md, task JSONs, and TODO_LIST.md with TDD structure
- Each task contains internal Red-Green-Refactor cycle
- Include Phase 0 user configuration (execution method, CLI tool preference)

## Core Philosophy

- **Agent-Driven**: Delegate execution to action-planning-agent for autonomous operation
- **Two-Phase Flow**: Discovery (context gathering) -> Output (document generation)
- **Memory-First**: Reuse loaded documents from conversation memory
- **MCP-Enhanced**: Use MCP tools for advanced code analysis and research
- **Semantic CLI Selection**: CLI tool usage determined from user's task description, not flags
- **Path Clarity**: All `focus_paths` prefer absolute paths or clear relative paths from project root
- **TDD-First**: Every feature starts with a failing test (Red phase)
- **Feature-Complete Tasks**: Each task contains complete Red-Green-Refactor cycle
- **Quantification-Enforced**: All test cases, coverage requirements, and implementation scope MUST include explicit counts and enumerations

## Task Strategy

### Optimized Task Structure
- **1 feature = 1 task** containing complete TDD cycle internally
- Each task executes Red-Green-Refactor phases sequentially
- Task count = Feature count (typically 5 features = 5 tasks)

### When to Use Subtasks
- Feature complexity >2500 lines or >6 files per TDD cycle
- Multiple independent sub-features needing parallel execution
- Strong technical dependency blocking (e.g., API before UI)
- Different tech stacks or domains within feature

### Task Limits
- **Maximum 18 tasks** (hard limit for TDD workflows)
- **Feature-based**: Complete functional units with internal TDD cycles
- **Hierarchy**: Flat (<=5 simple features) | Two-level (6-10 for complex features with sub-features)
- **Re-scope**: If >18 tasks needed, break project into multiple TDD workflow sessions

## Execution

### Phase 0: User Configuration (Interactive)

**Purpose**: Collect user preferences before TDD task generation.

```javascript
AskUserQuestion({
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
      question: "Select execution method for generated TDD tasks:",
      header: "Execution",
      multiSelect: false,
      options: [
        { label: "Agent (Recommended)", description: "Claude agent executes Red-Green-Refactor cycles directly" },
        { label: "Hybrid", description: "Agent orchestrates, calls CLI for complex steps (Red/Green phases)" },
        { label: "CLI Only", description: "All TDD cycles via CLI tools (codex/gemini/qwen)" }
      ]
    },
    {
      question: "If using CLI, which tool do you prefer?",
      header: "CLI Tool",
      multiSelect: false,
      options: [
        { label: "Codex (Recommended)", description: "Best for TDD Red-Green-Refactor cycles" },
        { label: "Gemini", description: "Best for analysis and large context" },
        { label: "Qwen", description: "Alternative analysis tool" },
        { label: "Auto", description: "Let agent decide per-task" }
      ]
    }
  ]
})
```

**Handle Materials Response**:
```javascript
if (userConfig.materials === "Provide file paths") {
  const pathsResponse = AskUserQuestion({
    questions: [{
      question: "Enter file paths to include (comma-separated or one per line):",
      header: "Paths",
      multiSelect: false,
      options: [
        { label: "Enter paths", description: "Provide paths in text input" }
      ]
    }]
  })
  userConfig.supplementaryPaths = parseUserPaths(pathsResponse)
}
```

**Build userConfig**:
```javascript
const userConfig = {
  supplementaryMaterials: {
    type: "none|paths|inline",
    content: [...],
  },
  executionMethod: "agent|hybrid|cli",
  preferredCliTool: "codex|gemini|qwen|auto",
  enableResume: true  // Always enable resume for CLI executions
}
```

**Auto Mode**: When `workflowPreferences.autoYes` is true, skip user questions, use defaults (no materials, Agent executor).

---

### Phase 1: Context Preparation & Discovery

**Memory-First Rule**: Skip file loading if documents already in conversation memory

**Progressive Loading Strategy**: Load context incrementally:
- **Core**: session metadata + context-package.json (always load)
- **Selective**: synthesis_output OR (guidance + relevant role analyses) - NOT all role analyses
- **On-Demand**: conflict resolution (if conflict_risk >= medium), test context

**Session Path Structure** (provided to agent):
```
.workflow/active/WFS-{session-id}/
├── workflow-session.json          # Session metadata
├── .process/
│   ├── context-package.json       # Context package with artifact catalog
│   ├── test-context-package.json  # Test coverage analysis
│   └── conflict-resolution.json   # Conflict resolution (if exists)
├── .task/                         # Output: Task JSON files
│   ├── IMPL-1.json
│   ├── IMPL-2.json
│   └── ...
├── plan.json                      # Output: Structured plan overview (TDD variant)
├── IMPL_PLAN.md                   # Output: TDD implementation plan
└── TODO_LIST.md                   # Output: TODO list with TDD phases
```

**Discovery Actions**:

1. **Load Session Context** (if not in memory)
   ```javascript
   if (!memory.has("workflow-session.json")) {
     Read(`.workflow/active/${sessionId}/workflow-session.json`)
   }
   ```

2. **Load Context Package** (if not in memory)
   ```javascript
   if (!memory.has("context-package.json")) {
     Read(`.workflow/active/${sessionId}/.process/context-package.json`)
   }
   ```

3. **Load Test Context Package** (if not in memory)
   ```javascript
   if (!memory.has("test-context-package.json")) {
     Read(`.workflow/active/${sessionId}/.process/test-context-package.json`)
   }
   ```

4. **Extract & Load Role Analyses** (from context-package.json)
   ```javascript
   const roleAnalysisPaths = contextPackage.brainstorm_artifacts.role_analyses
     .flatMap(role => role.files.map(f => f.path));
   roleAnalysisPaths.forEach(path => Read(path));
   ```

5. **Load Conflict Resolution** (if exists)
   ```javascript
   if (contextPackage.conflict_detection?.resolution_file) {
     Read(contextPackage.conflict_detection.resolution_file)
   } else if (contextPackage.brainstorm_artifacts?.conflict_resolution?.exists) {
     Read(contextPackage.brainstorm_artifacts.conflict_resolution.path)
   }
   ```

6. **Code Analysis with Native Tools** (optional)
   ```bash
   find . -name "*test*" -type f
   rg "describe|it\(|test\(" -g "*.ts"
   ```

7. **MCP External Research** (optional)
   ```javascript
   mcp__exa__get_code_context_exa(
     query="TypeScript TDD best practices Red-Green-Refactor",
     tokensNum="dynamic"
   )
   ```

---

### Step 5.1: Execute TDD Task Generation (Agent Invocation)

**Design Note**: The agent specification (action-planning-agent.md) already defines schemas, CLI execution strategies, quantification standards, and loading algorithms. This prompt provides **instance-specific parameters** and **TDD-specific requirements** only.

```javascript
Task(
  subagent_type="action-planning-agent",
  run_in_background=false,
  description="Generate TDD planning documents (IMPL_PLAN.md, task JSONs, TODO_LIST.md)",
  prompt=`
## TASK OBJECTIVE
Generate TDD implementation planning documents (IMPL_PLAN.md, task JSONs, TODO_LIST.md) for workflow session ${sessionId}

## SESSION PATHS
Session Root: .workflow/active/${sessionId}/
Input:
  - Session Metadata: .workflow/active/${sessionId}/workflow-session.json
  - Context Package: .workflow/active/${sessionId}/.process/context-package.json
  - Test Context: .workflow/active/${sessionId}/.process/test-context-package.json

Output:
  - Task Dir: .workflow/active/${sessionId}/.task/
  - IMPL_PLAN: .workflow/active/${sessionId}/IMPL_PLAN.md
  - TODO_LIST: .workflow/active/${sessionId}/TODO_LIST.md

## CONTEXT METADATA
Session ID: ${sessionId}
Workflow Type: TDD
MCP Capabilities: {exa_code, exa_web, code_index}

## PROJECT CONTEXT (MANDATORY - load before planning-notes)
These files provide project-level constraints that apply to ALL tasks:

1. **ccw spec load --category execution** (project specs and tech analysis)
   - Contains: tech_stack, architecture_type, key_components, build_system, test_framework, coding_conventions, naming_rules, forbidden_patterns, quality_gates, custom_constraints
   - Usage: Populate plan.json shared_context, align task tech choices, set correct test commands
   - Apply as HARD CONSTRAINTS on all generated tasks — task implementation steps,
     acceptance criteria, and convergence.verification MUST respect these guidelines
   - If empty/missing: No additional constraints (proceed normally)

Loading order: \`ccw spec load --category execution\` → planning-notes.md → context-package.json

## USER CONFIGURATION (from Phase 0)
Execution Method: ${userConfig.executionMethod}  // agent|hybrid|cli
Preferred CLI Tool: ${userConfig.preferredCliTool}  // codex|gemini|qwen|auto
Supplementary Materials: ${userConfig.supplementaryMaterials}

## EXPLORATION CONTEXT (from context-package.exploration_results) - SUPPLEMENT ONLY
If prioritized_context is incomplete, fall back to exploration_results:
- Use aggregated_insights.critical_files for focus_paths generation
- Apply aggregated_insights.constraints to acceptance criteria
- Reference aggregated_insights.all_patterns for implementation approach
- Use aggregated_insights.all_integration_points for precise modification locations

## TEST CONTEXT INTEGRATION
- Load test-context-package.json for existing test patterns and coverage analysis
- Extract test framework configuration (Jest/Pytest/etc.)
- Identify existing test conventions and patterns
- Map coverage gaps to TDD Red phase test targets

## TDD DOCUMENT GENERATION TASK

### TDD-Specific Requirements Summary

#### Task Structure Philosophy
- **1 feature = 1 task** containing complete TDD cycle internally
- Each task executes Red-Green-Refactor phases sequentially
- Task count = Feature count (typically 5 features = 5 tasks)
- Subtasks only when complexity >2500 lines or >6 files per cycle
- **Maximum 18 tasks** (hard limit for TDD workflows)

#### TDD Cycle Mapping
- **Simple features**: IMPL-N with internal Red-Green-Refactor phases
- **Complex features**: IMPL-N (container) + IMPL-N.M (subtasks)
- Each cycle includes: test_count, test_cases array, implementation_scope, expected_coverage

#### Required Outputs Summary

##### 1. TDD Task JSON Files (.task/IMPL-*.json)
- **Location**: .workflow/active/${sessionId}/.task/
- **Schema**: Unified flat schema (task-schema.json) with TDD-specific metadata
  - meta.tdd_workflow: true (REQUIRED)
  - meta.max_iterations: 3 (Green phase test-fix cycle limit)
  - tdd_cycles: Array with quantified test cases and coverage
  - focus_paths: Absolute or clear relative paths (enhanced with exploration critical_files)
  - implementation: Exactly 3 steps with tdd_phase field
    1. Red Phase (tdd_phase: "red"): Write failing tests
    2. Green Phase (tdd_phase: "green"): Implement to pass tests
    3. Refactor Phase (tdd_phase: "refactor"): Improve code quality
  - pre_analysis: Include exploration integration_points analysis

##### 2. IMPL_PLAN.md (TDD Variant)
- **Location**: .workflow/active/${sessionId}/IMPL_PLAN.md
- **Template**: ~/.ccw/workflows/cli-templates/prompts/workflow/impl-plan-template.txt
- **TDD-Specific Frontmatter**: workflow_type="tdd", tdd_workflow=true, feature_count, task_breakdown

##### 3. TODO_LIST.md
- **Location**: .workflow/active/${sessionId}/TODO_LIST.md
- **Format**: Hierarchical task list with internal TDD phase indicators (Red -> Green -> Refactor)

## SUCCESS CRITERIA
- All planning documents generated successfully:
  - Task JSONs valid and saved to .task/ directory
  - IMPL_PLAN.md created with complete TDD structure
  - TODO_LIST.md generated matching task JSONs
- Return completion status with document count and task breakdown summary

## SESSION-SPECIFIC NOTES
- Workflow Type: TDD — tasks use Red-Green-Refactor phases
- Deliverables: Task JSONs + IMPL_PLAN.md + plan.json + TODO_LIST.md (all 4 required)
- focus_paths: Derive from exploration critical_files and test context
- All other schemas, CLI execution strategies, quantification standards: Follow agent specification
`
)
```

**Note**: Phase 0 now includes:
- Supplementary materials collection (file paths or inline content)
- Execution method preference (Agent/Hybrid/CLI)
- CLI tool preference (Codex/Gemini/Qwen/Auto)
- These preferences are passed to agent for task generation

**CLI Tool Selection**: CLI tool usage is determined semantically from user's task description. Include "use Codex/Gemini/Qwen" in your request for CLI execution.

### Step 5.2: Parse Output

Extract: feature count, task count, CLI execution IDs assigned

### Step 5.3: Validate Outputs

- `plan.json` exists (structured plan overview with `_metadata.plan_type: "tdd"`)
- `IMPL_PLAN.md` exists (unified plan with TDD Implementation Tasks section)
- `IMPL-*.json` files exist (one per feature, or container + subtasks for complex features)
- `TODO_LIST.md` exists with internal TDD phase indicators
- Each IMPL task includes:
  - `meta.tdd_workflow: true`
  - `cli_execution.id: {session_id}-{task_id}`
  - `cli_execution: { "strategy": "new|resume|fork|merge_fork", ... }`
  - `implementation` with exactly 3 steps (red/green/refactor)
  - Green phase includes test-fix-cycle configuration
  - `focus_paths`: absolute or clear relative paths (enhanced with exploration critical_files)
  - `pre_analysis`: includes exploration integration_points analysis
- `IMPL_PLAN.md` contains `workflow_type: "tdd"` in frontmatter
- User configuration applied:
  - If executionMethod == "cli" or "hybrid": command field added to steps
  - CLI tool preference reflected in execution guidance
- Task count <=18 (compliance with hard limit)

### Red Flag Detection (Non-Blocking Warnings)

- Task count >18: `WARNING: Task count exceeds hard limit - request re-scope`
- Missing cli_execution.id: `WARNING: Task lacks CLI execution ID for resume support`
- Missing test-fix-cycle: `WARNING: Green phase lacks auto-revert configuration`
- Generic task names: `WARNING: Vague task names suggest unclear TDD cycles`
- Missing focus_paths: `WARNING: Task lacks clear file scope for implementation`

**Action**: Log warnings to `.workflow/active/[sessionId]/.process/tdd-warnings.log` (non-blocking)

### TodoWrite Update (Phase 5 Skill executed - tasks attached)

```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "completed", "activeForm": "Executing context gathering"},
  {"content": "Phase 3: Test Coverage Analysis", "status": "completed", "activeForm": "Executing test coverage analysis"},
  {"content": "Phase 5: TDD Task Generation", "status": "in_progress", "activeForm": "Executing TDD task generation"},
  {"content": "  -> Discovery - analyze TDD requirements", "status": "in_progress", "activeForm": "Analyzing TDD requirements"},
  {"content": "  -> Planning - design Red-Green-Refactor cycles", "status": "pending", "activeForm": "Designing TDD cycles"},
  {"content": "  -> Output - generate IMPL tasks with internal TDD phases", "status": "pending", "activeForm": "Generating TDD tasks"},
  {"content": "Phase 6: TDD Structure Validation", "status": "pending", "activeForm": "Validating TDD structure"}
]
```

**Note**: Agent execution **attaches** task-generate-tdd's 3 tasks. Orchestrator **executes** these tasks. Each generated IMPL task will contain internal Red-Green-Refactor cycle.

**Next Action**: Tasks attached -> **Execute Phase 5.1-5.3** sequentially

### TodoWrite Update (Phase 5 completed - tasks collapsed)

```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "completed", "activeForm": "Executing context gathering"},
  {"content": "Phase 3: Test Coverage Analysis", "status": "completed", "activeForm": "Executing test coverage analysis"},
  {"content": "Phase 5: TDD Task Generation", "status": "completed", "activeForm": "Executing TDD task generation"},
  {"content": "Phase 6: TDD Structure Validation", "status": "in_progress", "activeForm": "Validating TDD structure"}
]
```

**Note**: Phase 5 tasks completed and collapsed to summary. Each generated IMPL task contains complete Red-Green-Refactor cycle internally.

## TDD Task Structure Reference

**Quick Reference**:
- Each TDD task contains complete Red-Green-Refactor cycle
- Task ID format: `IMPL-N` (simple) or `IMPL-N.M` (complex subtasks)
- Required metadata:
  - `meta.tdd_workflow: true`
  - `meta.max_iterations: 3`
  - `cli_execution.id: "{session_id}-{task_id}"`
  - `cli_execution: { "strategy": "new|resume|fork|merge_fork", ... }`
- `tdd_cycles` array with quantified test cases and coverage:
  ```javascript
  tdd_cycles: [
    {
      test_count: 5,
      test_cases: ["case1", "case2"],
      implementation_scope: "...",
      expected_coverage: ">=85%"
    }
  ]
  ```
- `focus_paths` use absolute or clear relative paths
- `implementation`: Exactly 3 steps with `tdd_phase` field ("red", "green", "refactor")
- `pre_analysis`: includes exploration integration_points analysis
- **meta.execution_config**: Set per `userConfig.executionMethod` (agent/cli/hybrid)

## Output Files Structure

```
.workflow/active/{session-id}/
├── plan.json                        # Structured plan overview (TDD variant)
├── IMPL_PLAN.md                     # Unified plan with TDD Implementation Tasks section
├── TODO_LIST.md                     # Progress tracking with internal TDD phase indicators
├── .task/
│   ├── IMPL-1.json                  # Complete TDD task (Red-Green-Refactor internally)
│   ├── IMPL-2.json                  # Complete TDD task
│   ├── IMPL-3.json                  # Complex feature container (if needed)
│   ├── IMPL-3.1.json                # Complex feature subtask (if needed)
│   ├── IMPL-3.2.json                # Complex feature subtask (if needed)
│   └── ...
└── .process/
    ├── conflict-resolution.json     # Conflict resolution results (if conflict_risk >= medium)
    ├── test-context-package.json    # Test coverage analysis
    ├── context-package.json         # Input from context-gather
    └── tdd-warnings.log             # Non-blocking warnings
```

## Validation Rules

### Task Completeness
- Every IMPL-N must contain complete TDD workflow in `implementation`
- Each task must have 3 steps with `tdd_phase`: "red", "green", "refactor"
- Every task must have `meta.tdd_workflow: true`

### Dependency Enforcement
- Sequential features: IMPL-N depends_on ["IMPL-(N-1)"] if needed
- Complex feature subtasks: IMPL-N.M depends_on ["IMPL-N.(M-1)"] or parent dependencies
- No circular dependencies allowed

### Task Limits
- Maximum 18 total tasks (simple + subtasks) - hard limit for TDD workflows
- Flat hierarchy (<=5 tasks) or two-level (6-18 tasks with containers)
- Re-scope requirements if >18 tasks needed

## Output

- **File**: `plan.json` (structured plan overview)
- **File**: `IMPL_PLAN.md` (unified plan with TDD Implementation Tasks section)
- **File**: `IMPL-*.json` (task JSONs with internal TDD cycles)
- **File**: `TODO_LIST.md` (task list with TDD phase indicators)
- **File**: `.process/tdd-warnings.log` (non-blocking warnings)
- **TodoWrite**: Mark Phase 5 completed, Phase 6 in_progress

## Next Phase

Return to orchestrator, then auto-continue to [Phase 6: TDD Structure Validation](06-tdd-structure-validation.md).
