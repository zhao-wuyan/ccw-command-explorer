---
name: workflow-test-fix-cycle
description: "End-to-end test-fix workflow generate test sessions with progressive layers (L0-L3), then execute iterative fix cycles until pass rate >= 95%. Combines test-fix-gen and test-cycle-execute into a unified pipeline. Triggers on \"workflow:test-fix-cycle\"."
allowed-tools: spawn_agent, wait_agent, send_message, assign_task, close_agent, request_user_input, Read, Write, Edit, Bash, Glob, Grep
---

# Workflow Test-Fix Cycle

End-to-end test-fix workflow pipeline: generate test sessions with progressive layers (L0-L3), AI code validation, and task generation (Phase 1), then execute iterative fix cycles with adaptive strategy engine until pass rate >= 95% (Phase 2).

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Workflow Test-Fix Cycle Orchestrator (SKILL.md)                            │
│  → Full pipeline: Test generation + Iterative execution                     │
│  → Phase dispatch: Read phase docs, execute, pass context                   │
└───────────────┬────────────────────────────────────────────────────────────┘
                │
   ┌────────────┴────────────────────────┐
   ↓                                     ↓
┌─────────────────────────┐   ┌─────────────────────────────┐
│ Phase 1: Test-Fix Gen   │   │ Phase 2: Test-Cycle Execute  │
│ phases/01-test-fix-gen  │   │ phases/02-test-cycle-execute │
│ 5 sub-phases:           │   │ 3 stages:                    │
│ ① Create Session        │   │ ① Discovery                  │
│ ② Gather Context        │   │ ② Main Loop (iterate)        │
│ ③ Test Analysis (Gemini)│   │ ③ Completion                 │
│ ④ Generate Tasks        │   │                              │
│ ⑤ Summary               │   │ Agents (via spawn_agent):    │
│                         │   │ @cli-planning-agent           │
│ Agents (via spawn_agent)│   │ @test-fix-agent               │
│ @test-context-search    │   │                              │
│ @context-search         │   │ Strategy: conservative →      │
│ @cli-execution          │   │ aggressive → surgical          │
│ @action-planning        │   │                              │
└────────┬────────────────┘   └────────────┬──────────────────┘
         ↓                                 ↓
   IMPL-001..002.json              Pass Rate >= 95%
   TEST_ANALYSIS_RESULTS.md        Auto-complete session

Task Pipeline:
┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐
│  IMPL-001    │───→│  IMPL-001.3     │───→│  IMPL-001.5     │───→│  IMPL-002    │
│  Test Gen    │    │  Code Validate  │    │  Quality Gate   │    │  Test & Fix  │
│  L1-L3       │    │  L0 + AI Issues │    │  Coverage 80%+  │    │  Max 10 iter │
│@code-developer│   │ @test-fix-agent │    │ @test-fix-agent │    │@test-fix-agent│
└──────────────┘    └─────────────────┘    └─────────────────┘    └──────────────┘
                                                                        │
                                                              Fix Loop: │
                                                    ┌──────────────────┘
                                                    ↓
                                              ┌──────────┐
                                              │ @cli-plan│───→ IMPL-fix-N.json
                                              │  agent   │
                                              ├──────────┤
                                              │@test-fix │───→ Apply & re-test
                                              │  agent   │
                                              └──────────┘
```

## Key Design Principles

1. **Two-Phase Pipeline**: Generation (Phase 1) creates session + tasks, Execution (Phase 2) runs iterative fix cycles
2. **Pure Orchestrator**: Dispatch to phase docs, parse outputs, pass context between phases
3. **Phase 1 Auto-Continue**: Sub-phases within Phase 1 run autonomously
4. **Subagent Lifecycle**: Explicit lifecycle management with spawn_agent → wait_agent → close_agent
5. **Progressive Test Layers**: L0 (Static) → L1 (Unit) → L2 (Integration) → L3 (E2E)
6. **AI Code Issue Detection**: Validates against common AI-generated code problems
7. **Intelligent Strategy Engine**: conservative → aggressive → surgical based on iteration context
8. **CLI Fallback Chain**: Gemini → Qwen → Codex for analysis resilience
9. **Progressive Testing**: Affected tests during iterations, full suite for final validation
10. **Role Path Loading**: Subagent roles loaded via path reference in MANDATORY FIRST STEPS

## Auto Mode

Phase 1 generates test session and tasks. Phase 2 executes iterative fix cycles until pass rate >= 95% or max iterations reached. **Between Phase 1 and Phase 2, you MUST stop and wait for user confirmation before proceeding to execution.** Phase 2 runs autonomously once approved.

## Subagent API Reference

### spawn_agent
Create a new subagent with task assignment.

```javascript
const agentId = spawn_agent({
  agent_type: "{agent_type}",
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. Run: `ccw spec load --category "planning execution"`

## TASK CONTEXT
${taskContext}

## DELIVERABLES
${deliverables}
`
})
```

### wait_agent
Get results from subagent (only way to retrieve results).

```javascript
const result = wait_agent({
  targets: [agentId],
  timeout_ms: 600000  // 10 minutes
})

if (result.timed_out) {
  // Handle timeout - can use assign_task to prompt completion
}
```

### assign_task
Assign new work to active subagent (for clarification or follow-up).

```javascript
assign_task({
  target: agentId,
  items: [{ type: "text", text: `
## CLARIFICATION ANSWERS
${answers}

## NEXT STEP
Continue with plan generation.
` }]
})
```

### close_agent
Clean up subagent resources (irreversible).

```javascript
close_agent({ id: agentId })
```

## Usage

```
workflow-test-fix-cycle <input> [options]

# Input (Phase 1 - Test Generation)
source-session-id    WFS-* session ID (Session Mode - test validation for completed implementation)
feature description  Text description of what to test (Prompt Mode)
/path/to/file.md     Path to requirements file (Prompt Mode)

# Options (Phase 2 - Cycle Execution)
--max-iterations=N   Custom iteration limit (default: 10)

# Examples
workflow-test-fix-cycle WFS-user-auth-v2                                              # Session Mode
workflow-test-fix-cycle "Test the user authentication API endpoints in src/auth/api.ts" # Prompt Mode - text
workflow-test-fix-cycle ./docs/api-requirements.md                                     # Prompt Mode - file
workflow-test-fix-cycle "Test user registration" --max-iterations=15                    # With custom iterations

# Resume (Phase 2 only - session already created)
workflow-test-fix-cycle --resume-session="WFS-test-user-auth"                          # Resume interrupted session
```

**Quality Gate**: Test pass rate >= 95% (criticality-aware) or 100%
**Max Iterations**: 10 (default, adjustable)
**CLI Tools**: Gemini → Qwen → Codex (fallback chain)

## Test Strategy Overview

Progressive Test Layers (L0-L3):

| Layer | Name | Focus |
|-------|------|-------|
| **L0** | Static Analysis | Compilation, imports, types, AI code issues |
| **L1** | Unit Tests | Function/class behavior (happy/negative/edge cases) |
| **L2** | Integration Tests | Component interactions, API contracts, failure modes |
| **L3** | E2E Tests | User journeys, critical paths (optional) |

**Key Features**:
- **AI Code Issue Detection** - Validates against common AI-generated code problems (hallucinated imports, placeholder code, mock leakage, etc.)
- **Project Type Detection** - Applies appropriate test templates (React, Node API, CLI, Library, etc.)
- **Quality Gates** - IMPL-001.3 (code validation) and IMPL-001.5 (test quality) ensure high standards

**Detailed specifications**: See the test-task-generate workflow tool for complete L0-L3 requirements and quality thresholds.

## Execution Flow

```
Input → Detect Mode (session | prompt | resume)
  │
  ├─ resume mode → Skip to Phase 2
  │
  └─ session/prompt mode → Phase 1
       │
Phase 1: Test-Fix Generation (phases/01-test-fix-gen.md)
  ├─ Sub-phase 1.1: Create Test Session → testSessionId
  ├─ Sub-phase 1.2: Gather Test Context (spawn_agent) → contextPath
  ├─ Sub-phase 1.3: Test Generation Analysis (spawn_agent → Gemini) → TEST_ANALYSIS_RESULTS.md
  ├─ Sub-phase 1.4: Generate Test Tasks (spawn_agent) → IMPL-*.json, IMPL_PLAN.md, TODO_LIST.md
  └─ Sub-phase 1.5: Phase 1 Summary
       │
  ⛔ MANDATORY CONFIRMATION GATE
  │   Present plan summary → request_user_input → User approves/cancels
  │   NEVER auto-proceed to Phase 2
       │
Phase 2: Test-Cycle Execution (phases/02-test-cycle-execute.md)
  ├─ Discovery: Load session, tasks, iteration state
  ├─ Main Loop (for each task):
  │   ├─ Execute → Test → Calculate pass_rate
  │   ├─ 100% → SUCCESS: Next task
  │   ├─ 95-99% + low criticality → PARTIAL SUCCESS: Approve
  │   └─ <95% → Fix Loop:
  │       ├─ Select strategy: conservative/aggressive/surgical
  │       ├─ spawn_agent(@cli-planning-agent) → IMPL-fix-N.json
  │       ├─ spawn_agent(@test-fix-agent) → Apply fix & re-test
  │       └─ Re-test → Back to decision
  └─ Completion: Final validation → Summary → Sync session state → Auto-complete session
```

## Core Rules

1. **Start Immediately**: First action is progress tracking initialization
2. **No Preliminary Analysis**: Do not read files before Phase 1
3. **Parse Every Output**: Extract data from each phase/sub-phase for the next
4. **Within-Phase Auto-Continue**: Sub-phases within a phase run automatically; Phase 2 iterations run automatically once started
5. **Phase Loading**: Read phase doc on-demand (`phases/01-*.md`, `phases/02-*.md`)
6. **Task Attachment Model**: Sub-tasks ATTACH → execute → COLLAPSE
7. **MANDATORY CONFIRMATION GATE**: After Phase 1 completes, you MUST stop and present the generated plan to the user. Wait for explicit user approval via request_user_input before starting Phase 2. NEVER auto-proceed from Phase 1 to Phase 2
8. **Phase 2 Continuous**: Once user approves, Phase 2 runs continuously until pass rate >= 95% or max iterations reached
9. **Explicit Lifecycle**: Always close_agent after wait_agent completes to free resources

## Phase Execution

### Phase 1: Test-Fix Generation

**Read**: `phases/01-test-fix-gen.md`

5 sub-phases that create a test session and generate task JSONs:
1. Create Test Session → `testSessionId`
2. Gather Test Context (spawn_agent → wait_agent → close_agent) → `contextPath`
3. Test Generation Analysis (spawn_agent → wait_agent → close_agent) → `TEST_ANALYSIS_RESULTS.md`
4. Generate Test Tasks (spawn_agent → wait_agent → close_agent) → `IMPL-001.json`, `IMPL-001.3.json`, `IMPL-001.5.json`, `IMPL-002.json`, `IMPL_PLAN.md`, `TODO_LIST.md`
5. Phase 1 Summary → **⛔ MANDATORY: Present plan and wait for user confirmation before Phase 2**

**Agents Used** (via spawn_agent):
- `test_context_search_agent` (agent_type: test_context_search_agent) - Context gathering (Session Mode)
- `context_search_agent` (agent_type: context_search_agent) - Context gathering (Prompt Mode)
- `cli_execution_agent` (agent_type: cli_execution_agent) - Test analysis with Gemini
- `action_planning_agent` (agent_type: action_planning_agent) - Task JSON generation

### Phase 2: Test-Cycle Execution

**Read**: `phases/02-test-cycle-execute.md`

3-stage iterative execution with adaptive strategy:
1. Discovery - Load session, tasks, iteration state
2. Main Loop - Execute tasks → Test → Analyze failures → Fix → Re-test
3. Completion - Final validation → Summary → Auto-complete session

**Agents Used** (via spawn_agent):
- `cli_planning_agent` (agent_type: cli_planning_agent) - Failure analysis, root cause extraction, fix task generation
- `test_fix_agent` (agent_type: test_fix_agent) - Test execution, code fixes, criticality assignment

**Strategy Engine**: conservative (iteration 1-2) → aggressive (pass >80%) → surgical (regression)

## Output Artifacts

### Directory Structure

```
{projectRoot}/.workflow/active/WFS-test-[session]/
├── workflow-session.json              # Session metadata
├── IMPL_PLAN.md                       # Test generation and execution strategy
├── TODO_LIST.md                       # Task checklist
├── .task/
│   ├── IMPL-001.json                  # Test understanding & generation
│   ├── IMPL-001.3-validation.json     # Code validation gate
│   ├── IMPL-001.5-review.json         # Test quality gate
│   ├── IMPL-002.json                  # Test execution & fix cycle
│   └── IMPL-fix-{N}.json             # Generated fix tasks (Phase 2)
├── .process/
│   ├── [test-]context-package.json    # Context and coverage analysis
│   ├── TEST_ANALYSIS_RESULTS.md       # Test requirements and strategy (L0-L3)
│   ├── iteration-state.json           # Current iteration + strategy + stuck tests
│   ├── test-results.json              # Latest results (pass_rate, criticality)
│   ├── test-output.log                # Full test output
│   ├── fix-history.json               # All fix attempts
│   ├── iteration-{N}-analysis.md      # CLI analysis report
│   └── iteration-{N}-cli-output.txt
└── .summaries/iteration-summaries/
```

## Progress Tracking Pattern

**Phase 1** (Generation):
```javascript
[
  { content: "Phase 1: Test-Fix Generation", status: "in_progress" },
  { content: "  1.1 Create Test Session", status: "completed" },
  { content: "  1.2 Gather Test Context", status: "in_progress" },
  { content: "  1.3 Test Generation Analysis", status: "pending" },
  { content: "  1.4 Generate Test Tasks", status: "pending" },
  { content: "  1.5 Phase Summary", status: "pending" },
  { content: "Phase 2: Test-Cycle Execution", status: "pending" }
]
```

**Phase 2** (Execution):
```javascript
[
  { content: "Phase 1: Test-Fix Generation", status: "completed" },
  { content: "Phase 2: Test-Cycle Execution", status: "in_progress" },
  { content: "  Execute IMPL-001: Generate tests [code-developer]", status: "completed" },
  { content: "  Execute IMPL-002: Test & Fix Cycle [ITERATION]", status: "in_progress" },
  { content: "    → Iteration 1: Initial test (pass: 70%, conservative)", status: "completed" },
  { content: "    → Iteration 2: Fix validation (pass: 82%, conservative)", status: "completed" },
  { content: "    → Iteration 3: Batch fix auth (pass: 89%, aggressive)", status: "in_progress" }
]
```

**Update Rules**:
- Phase 1: Attach/collapse sub-phase tasks within Phase 1
- Phase 2: Add iteration items with strategy and pass rate
- Mark completed after each phase/iteration
- Update parent task when all complete

## Error Handling

| Phase | Scenario | Action |
|-------|----------|--------|
| 1.1 | Source session not found (session mode) | Return error with session ID |
| 1.1 | No completed IMPL tasks (session mode) | Return error, source incomplete |
| 1.2 | Context gathering failed | Return error, check source artifacts |
| 1.2 | Agent timeout | Retry with extended timeout, close_agent, then return error |
| 1.3 | Gemini analysis failed | Return error, check context package |
| 1.4 | Task generation failed | Retry once, then return error |
| 2 | Test execution error | Log, retry with error context |
| 2 | CLI analysis failure | Fallback: Gemini → Qwen → Codex → manual |
| 2 | Agent execution error | Save state, close_agent, retry with simplified context |
| 2 | Max iterations reached | Generate failure report, mark blocked |
| 2 | Regression detected | Rollback last fix, switch to surgical strategy |
| 2 | Stuck tests detected | Continue with alternative strategy, document in failure report |

**Lifecycle Error Handling**:
```javascript
try {
  const agentId = spawn_agent({ message: "..." });
  const result = wait_agent({ targets: [agentId], timeout_ms: 600000 });
  // ... process result ...
  close_agent({ id: agentId });
} catch (error) {
  if (agentId) close_agent({ id: agentId });
  throw error;
}
```

## Coordinator Checklist

**Phase 1 (Generation)**:
- Detect input type (session ID / description / file path / resume)
- Initialize progress tracking with 2 top-level phases
- Read `phases/01-test-fix-gen.md` for detailed sub-phase execution
- Execute 5 sub-phases with spawn_agent → wait_agent → close_agent lifecycle
- Verify all Phase 1 outputs (4+ task JSONs, IMPL_PLAN.md, TODO_LIST.md)
- **Ensure all agents are closed** after each sub-phase completes
- **⛔ MANDATORY: Present plan summary and request_user_input for confirmation**
  - Show: session ID, task count, test layers, quality gates
  - Options: "Proceed to Execution" / "Review Plan" / "Cancel"
  - If "Cancel" → return, do NOT start Phase 2
  - If "Review Plan" → display IMPL_PLAN.md, then return
  - Only proceed to Phase 2 if user selects "Proceed to Execution"

**Phase 2 (Execution)**:
- Read `phases/02-test-cycle-execute.md` for detailed execution logic
- Load session state and task queue
- Execute iterative test-fix cycles with spawn_agent → wait_agent → close_agent
- Track iterations in progress tracking
- Auto-complete session on success (pass rate >= 95%)
- **Ensure all agents are closed** after each iteration

**Resume Mode**:
- If `--resume-session` provided, skip Phase 1
- Load existing session directly into Phase 2

## Related Skills

**Prerequisite Skills**:
- `workflow-plan` or `workflow-execute` - Complete implementation (Session Mode)
- None for Prompt Mode

**Phase 1 Agents** (used by phases/01-test-fix-gen.md via spawn_agent):
- `test_context_search_agent` (agent_type: test_context_search_agent) - Test coverage analysis (Session Mode)
- `context_search_agent` (agent_type: context_search_agent) - Codebase analysis (Prompt Mode)
- `cli_execution_agent` (agent_type: cli_execution_agent) - Test requirements with Gemini
- `action_planning_agent` (agent_type: action_planning_agent) - Task JSON generation

**Phase 2 Agents** (used by phases/02-test-cycle-execute.md via spawn_agent):
- `cli_planning_agent` (agent_type: cli_planning_agent) - CLI analysis, root cause extraction, task generation
- `test_fix_agent` (agent_type: test_fix_agent) - Test execution, code fixes, criticality assignment

**Follow-up**:
- Session sync: `$session-sync -y "Test-fix cycle complete: {pass_rate}% pass rate"`
- Session auto-complete on success
- Issue creation for follow-up work (post-completion expansion)
