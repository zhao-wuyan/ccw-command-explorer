---
name: task-generate-tdd
description: Autonomous TDD task generation using action-planning-agent with Red-Green-Refactor cycles, test-first structure, and cycle validation
argument-hint: "[-y|--yes] --session WFS-session-id"
examples:
  - /workflow:tools:task-generate-tdd --session WFS-auth
  - /workflow:tools:task-generate-tdd -y --session WFS-auth
---

## Auto Mode

When `--yes` or `-y`: Skip user questions, use defaults (no materials, Agent executor).

# Autonomous TDD Task Generation Command

## Overview
Autonomous TDD task JSON and IMPL_PLAN.md generation using action-planning-agent with two-phase execution: discovery and document generation. Generates complete Red-Green-Refactor cycles contained within each task.

## Core Philosophy
- **Agent-Driven**: Delegate execution to action-planning-agent for autonomous operation
- **Two-Phase Flow**: Discovery (context gathering) → Output (document generation)
- **Memory-First**: Reuse loaded documents from conversation memory
- **MCP-Enhanced**: Use MCP tools for advanced code analysis and research
- **Semantic CLI Selection**: CLI tool usage determined from user's task description, not flags
- **Agent Simplicity**: Agent generates content with semantic CLI detection
- **Path Clarity**: All `focus_paths` prefer absolute paths (e.g., `D:\\project\\src\\module`), or clear relative paths from project root (e.g., `./src/module`)
- **TDD-First**: Every feature starts with a failing test (Red phase)
- **Feature-Complete Tasks**: Each task contains complete Red-Green-Refactor cycle
- **Quantification-Enforced**: All test cases, coverage requirements, and implementation scope MUST include explicit counts and enumerations

## Task Strategy & Philosophy

### Optimized Task Structure (Current)
- **1 feature = 1 task** containing complete TDD cycle internally
- Each task executes Red-Green-Refactor phases sequentially
- Task count = Feature count (typically 5 features = 5 tasks)

**Previous Approach** (Deprecated):
- 1 feature = 3 separate tasks (TEST-N.M, IMPL-N.M, REFACTOR-N.M)
- 5 features = 15 tasks with complex dependency chains
- High context switching cost between phases

### When to Use Subtasks
- Feature complexity >2500 lines or >6 files per TDD cycle
- Multiple independent sub-features needing parallel execution
- Strong technical dependency blocking (e.g., API before UI)
- Different tech stacks or domains within feature

### Task Limits
- **Maximum 18 tasks** (hard limit for TDD workflows)
- **Feature-based**: Complete functional units with internal TDD cycles
- **Hierarchy**: Flat (≤5 simple features) | Two-level (6-10 for complex features with sub-features)
- **Re-scope**: If >18 tasks needed, break project into multiple TDD workflow sessions

### TDD Cycle Mapping
- **Old approach**: 1 feature = 3 tasks (TEST-N.M, IMPL-N.M, REFACTOR-N.M)
- **Current approach**: 1 feature = 1 task (IMPL-N with internal Red-Green-Refactor phases)
- **Complex features**: 1 container (IMPL-N) + subtasks (IMPL-N.M) when necessary

## Execution Process

```
Input Parsing:
   ├─ Parse flags: --session
   └─ Validation: session_id REQUIRED

Phase 1: Discovery & Context Loading (Memory-First)
   ├─ Load session context (if not in memory)
   ├─ Load context package (if not in memory)
   ├─ Load test context package (if not in memory)
   ├─ Extract & load role analyses from context package
   ├─ Load conflict resolution (if exists)
   └─ Optional: MCP external research

Phase 2: Agent Execution (Document Generation)
   ├─ Pre-agent template selection (semantic CLI detection)
   ├─ Invoke action-planning-agent
   ├─ Generate TDD Task JSON Files (.task/IMPL-*.json)
   │  └─ Each task: complete Red-Green-Refactor cycle internally
   ├─ Create IMPL_PLAN.md (TDD variant)
   └─ Generate TODO_LIST.md with TDD phase indicators
```

## Execution Lifecycle

### Phase 0: User Configuration (Interactive)

**Purpose**: Collect user preferences before TDD task generation to ensure generated tasks match execution expectations and provide necessary supplementary context.

**User Questions**:
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
  // Follow-up question for file paths
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
    content: [...],  // Parsed paths or inline content
  },
  executionMethod: "agent|hybrid|cli",
  preferredCliTool: "codex|gemini|qwen|auto",
  enableResume: true  // Always enable resume for CLI executions
}
```

**Pass to Agent**: Include `userConfig` in agent prompt for Phase 2.

---

### Phase 1: Context Preparation & Discovery

**Command Responsibility**: Command prepares session paths and metadata, provides to agent for autonomous context loading.

**⚡ Memory-First Rule**: Skip file loading if documents already in conversation memory

**📊 Progressive Loading Strategy**: Load context incrementally due to large analysis.md file sizes:
- **Core**: session metadata + context-package.json (always load)
- **Selective**: synthesis_output OR (guidance + relevant role analyses) - NOT all role analyses
- **On-Demand**: conflict resolution (if conflict_risk >= medium), test context

**🛤️ Path Clarity Requirement**: All `focus_paths` prefer absolute paths (e.g., `D:\\project\\src\\module`), or clear relative paths from project root (e.g., `./src/module`)

**Session Path Structure** (Provided by Command to Agent):
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
├── IMPL_PLAN.md                   # Output: TDD implementation plan
└── TODO_LIST.md                   # Output: TODO list with TDD phases
```

**Command Preparation**:
1. **Assemble Session Paths** for agent prompt:
   - `session_metadata_path`: `.workflow/active/{session-id}/workflow-session.json`
   - `context_package_path`: `.workflow/active/{session-id}/.process/context-package.json`
   - `test_context_package_path`: `.workflow/active/{session-id}/.process/test-context-package.json`
   - Output directory paths

2. **Provide Metadata** (simple values):
   - `session_id`: WFS-{session-id}
   - `workflow_type`: "tdd"
   - `mcp_capabilities`: {exa_code, exa_web, code_index}

3. **Pass userConfig** from Phase 0

**Agent Context Package** (Agent loads autonomously):
```javascript
{
  "session_id": "WFS-[session-id]",
  "workflow_type": "tdd",

  // Core (ALWAYS load)
  "session_metadata": {
    // If in memory: use cached content
    // Else: Load from workflow-session.json
  },
  "context_package": {
    // If in memory: use cached content
    // Else: Load from context-package.json
  },

  // Selective (load based on progressive strategy)
  "brainstorm_artifacts": {
    // Loaded from context-package.json → brainstorm_artifacts section
    "synthesis_output": {"path": "...", "exists": true},  // Load if exists (highest priority)
    "guidance_specification": {"path": "...", "exists": true},  // Load if no synthesis
    "role_analyses": [  // Load SELECTIVELY based on task relevance
      {
        "role": "system-architect",
        "files": [{"path": "...", "type": "primary|supplementary"}]
      }
    ]
  },

  // On-Demand (load if exists)
  "test_context_package": {
    // Load from test-context-package.json
    // Contains existing test patterns and coverage analysis
  },
  "conflict_resolution": {
    // Load from conflict-resolution.json if conflict_risk >= medium
    // Check context-package.conflict_detection.resolution_file
  },

  // Capabilities
  "mcp_capabilities": {
    "exa_code": true,
    "exa_web": true,
    "code_index": true
  },

  // User configuration from Phase 0
  "user_config": {
    // From Phase 0 AskUserQuestion
  }
}
```

**Discovery Actions**:
1. **Load Session Context** (if not in memory)
   ```javascript
   if (!memory.has("workflow-session.json")) {
     Read(.workflow/active/{session-id}/workflow-session.json)
   }
   ```

2. **Load Context Package** (if not in memory)
   ```javascript
   if (!memory.has("context-package.json")) {
     Read(.workflow/active/{session-id}/.process/context-package.json)
   }
   ```

3. **Load Test Context Package** (if not in memory)
   ```javascript
   if (!memory.has("test-context-package.json")) {
     Read(.workflow/active/{session-id}/.process/test-context-package.json)
   }
   ```

4. **Extract & Load Role Analyses** (from context-package.json)
   ```javascript
   // Extract role analysis paths from context package
   const roleAnalysisPaths = contextPackage.brainstorm_artifacts.role_analyses
     .flatMap(role => role.files.map(f => f.path));

   // Load each role analysis file
   roleAnalysisPaths.forEach(path => Read(path));
   ```

5. **Load Conflict Resolution** (from conflict-resolution.json, if exists)
   ```javascript
   // Check for new conflict-resolution.json format
   if (contextPackage.conflict_detection?.resolution_file) {
     Read(contextPackage.conflict_detection.resolution_file)  // .process/conflict-resolution.json
   }
   // Fallback: legacy brainstorm_artifacts path
   else if (contextPackage.brainstorm_artifacts?.conflict_resolution?.exists) {
     Read(contextPackage.brainstorm_artifacts.conflict_resolution.path)
   }
   ```

6. **Code Analysis with Native Tools** (optional - enhance understanding)
   ```bash
   # Find relevant test files and patterns
   find . -name "*test*" -type f
   rg "describe|it\(|test\(" -g "*.ts"
   ```

7. **MCP External Research** (optional - gather TDD best practices)
   ```javascript
   // Get external TDD examples and patterns
   mcp__exa__get_code_context_exa(
     query="TypeScript TDD best practices Red-Green-Refactor",
     tokensNum="dynamic"
   )
   ```

### Phase 2: Agent Execution (TDD Document Generation)

**Purpose**: Generate TDD planning documents (IMPL_PLAN.md, task JSONs, TODO_LIST.md) - planning only, NOT code implementation.

**Agent Invocation**:
```javascript
Task(
  subagent_type="action-planning-agent",
  run_in_background=false,
  description="Generate TDD planning documents (IMPL_PLAN.md, task JSONs, TODO_LIST.md)",
  prompt=`
## TASK OBJECTIVE
Generate TDD implementation planning documents (IMPL_PLAN.md, task JSONs, TODO_LIST.md) for workflow session

IMPORTANT: This is PLANNING ONLY - you are generating planning documents, NOT implementing code.

CRITICAL: Follow the progressive loading strategy (load analysis.md files incrementally due to file size):
- **Core**: session metadata + context-package.json (always)
- **Selective**: synthesis_output OR (guidance + relevant role analyses) - NOT all
- **On-Demand**: conflict resolution (if conflict_risk >= medium), test context

## SESSION PATHS
Input:
  - Session Metadata: .workflow/active/{session-id}/workflow-session.json
  - Context Package: .workflow/active/{session-id}/.process/context-package.json
  - Test Context: .workflow/active/{session-id}/.process/test-context-package.json

Output:
  - Task Dir: .workflow/active/{session-id}/.task/
  - IMPL_PLAN: .workflow/active/{session-id}/IMPL_PLAN.md
  - TODO_LIST: .workflow/active/{session-id}/TODO_LIST.md

## CONTEXT METADATA
Session ID: {session-id}
Workflow Type: TDD
MCP Capabilities: {exa_code, exa_web, code_index}

## USER CONFIGURATION (from Phase 0)
Execution Method: ${userConfig.executionMethod}  // agent|hybrid|cli
Preferred CLI Tool: ${userConfig.preferredCliTool}  // codex|gemini|qwen|auto
Supplementary Materials: ${userConfig.supplementaryMaterials}

## CLI TOOL SELECTION
Based on userConfig.executionMethod:
- "agent": No command field in implementation_approach steps
- "hybrid": Add command field to complex steps only (Red/Green phases recommended for CLI)
- "cli": Add command field to ALL Red-Green-Refactor steps

CLI Resume Support (MANDATORY for all CLI commands):
- Use --resume parameter to continue from previous task execution
- Read previous task's cliExecutionId from session state
- Format: ccw cli -p "[prompt]" --resume [previousCliId] --tool [tool] --mode write

## EXPLORATION CONTEXT (from context-package.exploration_results)
- Load exploration_results from context-package.json
- Use aggregated_insights.critical_files for focus_paths generation
- Apply aggregated_insights.constraints to acceptance criteria
- Reference aggregated_insights.all_patterns for implementation approach
- Use aggregated_insights.all_integration_points for precise modification locations
- Use conflict_indicators for risk-aware task sequencing

## CONFLICT RESOLUTION CONTEXT (if exists)
- Check context-package.conflict_detection.resolution_file for conflict-resolution.json path
- If exists, load .process/conflict-resolution.json:
  - Apply planning_constraints as task constraints (for brainstorm-less workflows)
  - Reference resolved_conflicts for implementation approach alignment
  - Handle custom_conflicts with explicit task notes

## TEST CONTEXT INTEGRATION
- Load test-context-package.json for existing test patterns and coverage analysis
- Extract test framework configuration (Jest/Pytest/etc.)
- Identify existing test conventions and patterns
- Map coverage gaps to TDD Red phase test targets

## TDD DOCUMENT GENERATION TASK

**Agent Configuration Reference**: All TDD task generation rules, quantification requirements, Red-Green-Refactor cycle structure, quality standards, and execution details are defined in action-planning-agent.

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
- **Location**: `.workflow/active/{session-id}/.task/`
- **Schema**: 6-field structure with TDD-specific metadata
  - `id, title, status, context_package_path, meta, context, flow_control`
  - `meta.tdd_workflow`: true (REQUIRED)
  - `meta.max_iterations`: 3 (Green phase test-fix cycle limit)
  - `meta.cli_execution_id`: Unique CLI execution ID (format: `{session_id}-{task_id}`)
  - `meta.cli_execution`: Strategy object (new|resume|fork|merge_fork)
  - `context.tdd_cycles`: Array with quantified test cases and coverage
  - `context.focus_paths`: Absolute or clear relative paths (enhanced with exploration critical_files)
  - `flow_control.implementation_approach`: Exactly 3 steps with `tdd_phase` field
    1. Red Phase (`tdd_phase: "red"`): Write failing tests
    2. Green Phase (`tdd_phase: "green"`): Implement to pass tests
    3. Refactor Phase (`tdd_phase: "refactor"`): Improve code quality
  - `flow_control.pre_analysis`: Include exploration integration_points analysis
  - CLI tool usage based on userConfig (add `command` field per executionMethod)
- **Details**: See action-planning-agent.md § TDD Task JSON Generation

##### 2. IMPL_PLAN.md (TDD Variant)
- **Location**: `.workflow/active/{session-id}/IMPL_PLAN.md`
- **Template**: `~/.claude/workflows/cli-templates/prompts/workflow/impl-plan-template.txt`
- **TDD-Specific Frontmatter**: workflow_type="tdd", tdd_workflow=true, feature_count, task_breakdown
- **TDD Implementation Tasks Section**: Feature-by-feature with internal Red-Green-Refactor cycles
- **Context Analysis**: Artifact references and exploration insights
- **Details**: See action-planning-agent.md § TDD Implementation Plan Creation

##### 3. TODO_LIST.md
- **Location**: `.workflow/active/{session-id}/TODO_LIST.md`
- **Format**: Hierarchical task list with internal TDD phase indicators (Red → Green → Refactor)
- **Status**: ▸ (container), [ ] (pending), [x] (completed)
- **Links**: Task JSON references and summaries
- **Details**: See action-planning-agent.md § TODO List Generation

### CLI EXECUTION ID REQUIREMENTS (MANDATORY)

Each task JSON MUST include:
- **meta.cli_execution_id**: Unique ID for CLI execution (format: `{session_id}-{task_id}`)
- **meta.cli_execution**: Strategy object based on depends_on:
  - No deps → `{ "strategy": "new" }`
  - 1 dep (single child) → `{ "strategy": "resume", "resume_from": "parent-cli-id" }`
  - 1 dep (multiple children) → `{ "strategy": "fork", "resume_from": "parent-cli-id" }`
  - N deps → `{ "strategy": "merge_fork", "resume_from": ["id1", "id2", ...] }`
  - **Type**: `resume_from: string | string[]` (string for resume/fork, array for merge_fork)

**CLI Execution Strategy Rules**:
1. **new**: Task has no dependencies - starts fresh CLI conversation
2. **resume**: Task has 1 parent AND that parent has only this child - continues same conversation
3. **fork**: Task has 1 parent BUT parent has multiple children - creates new branch with parent context
4. **merge_fork**: Task has multiple parents - merges all parent contexts into new conversation

**Execution Command Patterns**:
- new: `ccw cli -p "[prompt]" --tool [tool] --mode write --id [cli_execution_id]`
- resume: `ccw cli -p "[prompt]" --resume [resume_from] --tool [tool] --mode write`
- fork: `ccw cli -p "[prompt]" --resume [resume_from] --id [cli_execution_id] --tool [tool] --mode write`
- merge_fork: `ccw cli -p "[prompt]" --resume [resume_from.join(',')] --id [cli_execution_id] --tool [tool] --mode write` (resume_from is array)

### Quantification Requirements (MANDATORY)

**Core Rules**:
1. **Explicit Test Case Counts**: Red phase specifies exact number with enumerated list
2. **Quantified Coverage**: Acceptance includes measurable percentage (e.g., ">=85%")
3. **Detailed Implementation Scope**: Green phase enumerates files, functions, line counts
4. **Enumerated Refactoring Targets**: Refactor phase lists specific improvements with counts

**TDD Phase Formats**:
- **Red Phase**: "Write N test cases: [test1, test2, ...]"
- **Green Phase**: "Implement N functions in file lines X-Y: [func1() X1-Y1, func2() X2-Y2, ...]"
- **Refactor Phase**: "Apply N refactorings: [improvement1 (details), improvement2 (details), ...]"
- **Acceptance**: "All N tests pass with >=X% coverage: verify by [test command]"

**Validation Checklist**:
- [ ] Every Red phase specifies exact test case count with enumerated list
- [ ] Every Green phase enumerates files, functions, and estimated line counts
- [ ] Every Refactor phase lists specific improvements with counts
- [ ] Every acceptance criterion includes measurable coverage percentage
- [ ] tdd_cycles array contains test_count and test_cases for each cycle
- [ ] No vague language ("comprehensive", "complete", "thorough")
- [ ] cli_execution_id and cli_execution strategy assigned to each task

### Agent Execution Summary

**Key Steps** (Detailed instructions in action-planning-agent.md):
1. Load task JSON template from provided path
2. Extract and decompose features with TDD cycles
3. Generate TDD task JSON files enforcing quantification requirements
4. Create IMPL_PLAN.md using TDD template variant
5. Generate TODO_LIST.md with TDD phase indicators
6. Update session state with TDD metadata

**Quality Gates** (Full checklist in action-planning-agent.md):
- ✓ Quantification requirements enforced (explicit counts, measurable acceptance, exact targets)
- ✓ Task count ≤18 (hard limit)
- ✓ Each task has meta.tdd_workflow: true
- ✓ Each task has exactly 3 implementation steps with tdd_phase field ("red", "green", "refactor")
- ✓ Each task has meta.cli_execution_id and meta.cli_execution strategy
- ✓ Green phase includes test-fix cycle logic with max_iterations
- ✓ focus_paths are absolute or clear relative paths (from exploration critical_files)
- ✓ Artifact references mapped correctly from context package
- ✓ Exploration context integrated (critical_files, constraints, patterns, integration_points)
- ✓ Conflict resolution context applied (if conflict_risk >= medium)
- ✓ Test context integrated (existing test patterns and coverage analysis)
- ✓ Documents follow TDD template structure
- ✓ CLI tool selection based on userConfig.executionMethod

## SUCCESS CRITERIA
- All planning documents generated successfully:
  - Task JSONs valid and saved to .task/ directory with cli_execution_id
  - IMPL_PLAN.md created with complete TDD structure
  - TODO_LIST.md generated matching task JSONs
- CLI execution strategies assigned based on task dependencies
- Return completion status with document count and task breakdown summary

## OUTPUT SUMMARY
Generate all three documents and report:
- TDD task JSON files created: N files (IMPL-*.json) with cli_execution_id assigned
- TDD cycles configured: N cycles with quantified test cases
- CLI execution strategies: new/resume/fork/merge_fork assigned per dependency graph
- Artifacts integrated: synthesis-spec/guidance-specification, relevant role analyses
- Exploration context: critical_files, constraints, patterns, integration_points
- Test context integrated: existing patterns and coverage
- Conflict resolution: applied (if conflict_risk >= medium)
- Session ready for TDD execution: /workflow:execute
`
)
```

### Agent Context Passing

**Context Delegation Model**: Command provides paths and metadata, agent loads context autonomously using progressive loading strategy.

**Command Provides** (in agent prompt):
```javascript
// Command assembles these simple values and paths for agent
const commandProvides = {
  // Session paths
  session_metadata_path: ".workflow/active/WFS-{id}/workflow-session.json",
  context_package_path: ".workflow/active/WFS-{id}/.process/context-package.json",
  test_context_package_path: ".workflow/active/WFS-{id}/.process/test-context-package.json",
  output_task_dir: ".workflow/active/WFS-{id}/.task/",
  output_impl_plan: ".workflow/active/WFS-{id}/IMPL_PLAN.md",
  output_todo_list: ".workflow/active/WFS-{id}/TODO_LIST.md",

  // Simple metadata
  session_id: "WFS-{id}",
  workflow_type: "tdd",
  mcp_capabilities: { exa_code: true, exa_web: true, code_index: true },

  // User configuration from Phase 0
  user_config: {
    supplementaryMaterials: { type: "...", content: [...] },
    executionMethod: "agent|hybrid|cli",
    preferredCliTool: "codex|gemini|qwen|auto",
    enableResume: true
  }
}
```

**Agent Loads Autonomously** (progressive loading):
```javascript
// Agent executes progressive loading based on memory state
const agentLoads = {
  // Core (ALWAYS load if not in memory)
  session_metadata: loadIfNotInMemory(session_metadata_path),
  context_package: loadIfNotInMemory(context_package_path),

  // Selective (based on progressive strategy)
  // Priority: synthesis_output > guidance + relevant_role_analyses
  brainstorm_content: loadSelectiveBrainstormArtifacts(context_package),

  // On-Demand (load if exists and relevant)
  test_context: loadIfExists(test_context_package_path),
  conflict_resolution: loadConflictResolution(context_package),

  // Optional (if MCP available)
  exploration_results: extractExplorationResults(context_package),
  external_research: executeMcpResearch()  // If needed
}
```

**Progressive Loading Implementation** (agent responsibility):
1. **Check memory first** - skip if already loaded
2. **Load core files** - session metadata + context-package.json
3. **Smart selective loading** - synthesis_output OR (guidance + task-relevant role analyses)
4. **On-demand loading** - test context, conflict resolution (if conflict_risk >= medium)
5. **Extract references** - exploration results, artifact paths from context package

## TDD Task Structure Reference

This section provides quick reference for TDD task JSON structure. For complete implementation details, see the agent invocation prompt in Phase 2 above.

**Quick Reference**:
- Each TDD task contains complete Red-Green-Refactor cycle
- Task ID format: `IMPL-N` (simple) or `IMPL-N.M` (complex subtasks)
- Required metadata:
  - `meta.tdd_workflow: true`
  - `meta.max_iterations: 3`
  - `meta.cli_execution_id: "{session_id}-{task_id}"`
  - `meta.cli_execution: { "strategy": "new|resume|fork|merge_fork", ... }`
- Context: `tdd_cycles` array with quantified test cases and coverage:
  ```javascript
  tdd_cycles: [
    {
      test_count: 5,                    // Number of test cases to write
      test_cases: ["case1", "case2"],   // Enumerated test scenarios
      implementation_scope: "...",      // Files and functions to implement
      expected_coverage: ">=85%"        // Coverage target
    }
  ]
  ```
- Context: `focus_paths` use absolute or clear relative paths
- Flow control: Exactly 3 steps with `tdd_phase` field ("red", "green", "refactor")
- Flow control: `pre_analysis` includes exploration integration_points analysis
- Command field: Added per `userConfig.executionMethod` (agent/hybrid/cli)
- See Phase 2 agent prompt for full schema and requirements

## Output Files Structure
```
.workflow/active/{session-id}/
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
    ├── conflict-resolution.json     # Conflict resolution results (if conflict_risk ≥ medium)
    ├── test-context-package.json    # Test coverage analysis
    ├── context-package.json         # Input from context-gather
    ├── context_package_path         # Path to smart context package
    └── green-fix-iteration-*.md     # Fix logs from Green phase test-fix cycles
```

**File Count**:
- **Old approach**: 5 features = 15 task JSON files (TEST/IMPL/REFACTOR × 5)
- **New approach**: 5 features = 5 task JSON files (IMPL-N × 5)
- **Complex feature**: 1 feature = 1 container + M subtasks (IMPL-N + IMPL-N.M)

## Validation Rules

### Task Completeness
- Every IMPL-N must contain complete TDD workflow in `flow_control.implementation_approach`
- Each task must have 3 steps with `tdd_phase`: "red", "green", "refactor"
- Every task must have `meta.tdd_workflow: true`

### Dependency Enforcement
- Sequential features: IMPL-N depends_on ["IMPL-(N-1)"] if needed
- Complex feature subtasks: IMPL-N.M depends_on ["IMPL-N.(M-1)"] or parent dependencies
- No circular dependencies allowed

### Task Limits
- Maximum 18 total tasks (simple + subtasks) - hard limit for TDD workflows
- Flat hierarchy (≤5 tasks) or two-level (6-18 tasks with containers)
- Re-scope requirements if >18 tasks needed

### TDD Workflow Validation
- `meta.tdd_workflow` must be true
- `flow_control.implementation_approach` must have exactly 3 steps
- Each step must have `tdd_phase` field ("red", "green", or "refactor")
- Green phase step must include test-fix cycle logic
- `meta.max_iterations` must be present (default: 3)

## Error Handling

### Input Validation Errors
| Error | Cause | Resolution |
|-------|-------|------------|
| Session not found | Invalid session ID | Verify session exists |
| Context missing | Incomplete planning | Run context-gather first |

### TDD Generation Errors
| Error | Cause | Resolution |
|-------|-------|------------|
| Task count exceeds 18 | Too many features or subtasks | Re-scope requirements or merge features into multiple TDD sessions |
| Missing test framework | No test config | Configure testing first |
| Invalid TDD workflow | Missing tdd_phase or incomplete flow_control | Fix TDD structure in ANALYSIS_RESULTS.md |
| Missing tdd_workflow flag | Task doesn't have meta.tdd_workflow: true | Add TDD workflow metadata |

## Integration & Usage

**Command Chain**:
- Called by: `/workflow:tdd-plan` (Phase 4)
- Invokes: `action-planning-agent` for autonomous task generation
- Followed by: `/workflow:execute`, `/workflow:tdd-verify`

**Basic Usage**:
```bash
# Standard execution
/workflow:tools:task-generate-tdd --session WFS-auth

# With semantic CLI request (include in task description)
# e.g., "Generate TDD tasks for auth module, use Codex for implementation"
```

**CLI Tool Selection**: Determined semantically from user's task description. Include "use Codex/Gemini/Qwen" in your request for CLI execution.

**Output**:
- TDD task JSON files in `.task/` directory (IMPL-N.json format)
- IMPL_PLAN.md with TDD Implementation Tasks section
- TODO_LIST.md with internal TDD phase indicators
- Session state updated with task count and TDD metadata
- MCP enhancements integrated (if available)

## Test Coverage Analysis Integration

The TDD workflow includes test coverage analysis (via `/workflow:tools:test-context-gather`) to:
- Detect existing test patterns and conventions
- Identify current test coverage gaps
- Discover test framework and configuration
- Enable integration with existing tests

This makes TDD workflow context-aware instead of assuming greenfield scenarios.

## Iterative Green Phase with Test-Fix Cycle

IMPL (Green phase) tasks include automatic test-fix cycle:

**Process Flow**:
1. **Initial Implementation**: Write minimal code to pass tests
2. **Test Execution**: Run test suite
3. **Success Path**: Tests pass → Complete task
4. **Failure Path**: Tests fail → Enter iterative fix cycle:
   - **Gemini Diagnosis**: Analyze failures with bug-fix template
   - **Fix Application**: Agent (default) or CLI (if `command` field present)
   - **Retest**: Verify fix resolves failures
   - **Repeat**: Up to max_iterations (default: 3)
5. **Safety Net**: Auto-revert all changes if max iterations reached



## Configuration Options
- **meta.max_iterations**: Number of fix attempts in Green phase (default: 3)
- **CLI tool usage**: Determined semantically from user's task description via `command` field in implementation_approach

