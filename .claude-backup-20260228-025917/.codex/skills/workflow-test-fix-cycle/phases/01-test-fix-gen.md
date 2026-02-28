# Phase 1: Test-Fix Generation

5 sub-phases that create a test workflow session, gather context, analyze test requirements, and generate task JSONs. All agent interactions use spawn_agent → wait → close_agent lifecycle.

## Execution Model

**Auto-Continue Workflow**: All sub-phases run autonomously once triggered. Sub-phase 1.2-1.4 delegate to specialized agents via spawn_agent.

1. **Sub-phase 1.1 executes** → Test session created → Auto-continues
2. **Sub-phase 1.2 executes** → Context gathering (spawn_agent) → Auto-continues
3. **Sub-phase 1.3 executes** → Test generation analysis (spawn_agent → Gemini) → Auto-continues
4. **Sub-phase 1.4 executes** → Task generation (spawn_agent) → Auto-continues
5. **Sub-phase 1.5 executes** → Phase 1 Summary → Transitions to Phase 2

**Task Attachment Model**:
- Phase execution **expands workflow** by attaching sub-tasks to current progress tracking
- When executing a phase, its internal tasks are attached to the orchestrator's tracking
- Orchestrator **executes these attached tasks** sequentially
- After completion, attached tasks are **collapsed** back to high-level phase summary
- This is **task expansion**, not external delegation

**Auto-Continue Mechanism**:
- Progress tracking monitors current sub-phase status and dynamically manages task attachment/collapse
- When each sub-phase finishes executing, automatically execute next pending sub-phase
- All sub-phases run autonomously without user interaction
- **CONTINUOUS EXECUTION** - Do not stop until all sub-phases complete

## Sub-Phase 1.1: Create Test Session

**Step 1.0: Detect Input Mode**

```
// Automatic mode detection based on input pattern
if (input.startsWith("WFS-")) {
  MODE = "session"
  // Load source session to preserve original task description
  Read("${projectRoot}/.workflow/active/[sourceSessionId]/workflow-session.json")
} else {
  MODE = "prompt"
}
```

**Step 1.1: Execute** - Create test workflow session

```javascript
// Session Mode - preserve original task description
// Read and execute: workflow-plan session start phase
// with --type test --new "Test validation for [sourceSessionId]: [originalTaskDescription]"

// Prompt Mode - use user's description directly
// Read and execute: workflow-plan session start phase
// with --type test --new "Test generation for: [description]"
```

**Parse Output**:
- Extract: `SESSION_ID: WFS-test-[slug]` (store as `testSessionId`)

**Validation**:
- Session Mode: Source session `{projectRoot}/.workflow/active/[sourceSessionId]/` exists with completed IMPL tasks
- Both Modes: New test session directory created with metadata

**Progress Tracking**: Mark sub-phase 1.1 completed, sub-phase 1.2 in_progress

---

## Sub-Phase 1.2: Gather Test Context

**Step 2.1: Execute** - Gather context based on mode via spawn_agent

```javascript
// Session Mode - gather from source session via test-context-search-agent
const contextAgentId = spawn_agent({
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/test-context-search-agent.md (MUST read first)
2. Run: `ccw spec load --category planning`

---

## Task Objective
Gather test context for session [testSessionId]

## Session Paths
- Session Dir: ${projectRoot}/.workflow/active/[testSessionId]/
- Output: ${projectRoot}/.workflow/active/[testSessionId]/.process/test-context-package.json

## Expected Deliverables
- test-context-package.json with coverage analysis and test framework detection
`
});

const contextResult = wait({ ids: [contextAgentId], timeout_ms: 600000 });
close_agent({ id: contextAgentId });

// Prompt Mode - gather from codebase via context-search-agent
const contextAgentId = spawn_agent({
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/context-search-agent.md (MUST read first)
2. Run: `ccw spec load --category planning`

---

## Task Objective
Gather project context for session [testSessionId]: [task_description]

## Session Paths
- Session Dir: ${projectRoot}/.workflow/active/[testSessionId]/
- Output: ${projectRoot}/.workflow/active/[testSessionId]/.process/context-package.json

## Expected Deliverables
- context-package.json with codebase analysis
`
});

const contextResult = wait({ ids: [contextAgentId], timeout_ms: 600000 });
close_agent({ id: contextAgentId });
```

**Input**: `testSessionId` from Sub-Phase 1.1

**Parse Output**:
- Extract: context package path (store as `contextPath`)
- Pattern: `${projectRoot}/.workflow/active/[testSessionId]/.process/[test-]context-package.json`

**Validation**:
- Context package file exists and is valid JSON
- Contains coverage analysis (session mode) or codebase analysis (prompt mode)
- Test framework detected

**Progress Tracking Update (tasks attached)**:
```json
[
  {"content": "Phase 1: Test-Fix Generation", "status": "in_progress"},
  {"content": "  1.1 Create Test Session", "status": "completed"},
  {"content": "  1.2 Gather Test Context", "status": "in_progress"},
  {"content": "    → Load source/codebase context", "status": "in_progress"},
  {"content": "    → Analyze test coverage", "status": "pending"},
  {"content": "    → Generate context package", "status": "pending"},
  {"content": "  1.3 Test Generation Analysis", "status": "pending"},
  {"content": "  1.4 Generate Test Tasks", "status": "pending"},
  {"content": "  1.5 Phase Summary", "status": "pending"},
  {"content": "Phase 2: Test-Cycle Execution", "status": "pending"}
]
```

**Progress Tracking Update (tasks collapsed)**:
```json
[
  {"content": "Phase 1: Test-Fix Generation", "status": "in_progress"},
  {"content": "  1.1 Create Test Session", "status": "completed"},
  {"content": "  1.2 Gather Test Context", "status": "completed"},
  {"content": "  1.3 Test Generation Analysis", "status": "pending"},
  {"content": "  1.4 Generate Test Tasks", "status": "pending"},
  {"content": "  1.5 Phase Summary", "status": "pending"},
  {"content": "Phase 2: Test-Cycle Execution", "status": "pending"}
]
```

---

## Sub-Phase 1.3: Test Generation Analysis

**Step 3.1: Execute** - Analyze test requirements with Gemini via cli-execution-agent

```javascript
const analysisAgentId = spawn_agent({
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/cli-execution-agent.md (MUST read first)
2. Run: `ccw spec load --category planning`

---

## Task Objective
Analyze test requirements for session [testSessionId] using Gemini CLI

## Context
- Session ID: [testSessionId]
- Context Package: [contextPath]

## Expected Behavior
- Use Gemini to analyze coverage gaps
- Detect project type and apply appropriate test templates
- Generate multi-layered test requirements (L0-L3)
- Scan for AI code issues
- Generate TEST_ANALYSIS_RESULTS.md

## Output Path
${projectRoot}/.workflow/active/[testSessionId]/.process/TEST_ANALYSIS_RESULTS.md

## Expected Deliverables
- TEST_ANALYSIS_RESULTS.md with L0-L3 requirements and AI issue scan
`
});

const analysisResult = wait({ ids: [analysisAgentId], timeout_ms: 1200000 });
close_agent({ id: analysisAgentId });
```

**Input**:
- `testSessionId` from Sub-Phase 1.1
- `contextPath` from Sub-Phase 1.2

**Expected Behavior**:
- Use Gemini to analyze coverage gaps
- Detect project type and apply appropriate test templates
- Generate **multi-layered test requirements** (L0-L3)
- Scan for AI code issues
- Generate `TEST_ANALYSIS_RESULTS.md`

**Output**: `${projectRoot}/.workflow/active/[testSessionId]/.process/TEST_ANALYSIS_RESULTS.md`

**Validation** - TEST_ANALYSIS_RESULTS.md must include:
- Project Type Detection (with confidence)
- Coverage Assessment (current vs target)
- Test Framework & Conventions
- Multi-Layered Test Plan (L0-L3)
- AI Issue Scan Results
- Test Requirements by File (with layer annotations)
- Quality Assurance Criteria
- Success Criteria

**Note**: Detailed specifications for project types, L0-L3 layers, and AI issue detection are defined in the test-concept-enhanced workflow tool.

---

## Sub-Phase 1.4: Generate Test Tasks

**Step 4.1: Execute** - Generate test planning documents via action-planning-agent

```javascript
const taskGenAgentId = spawn_agent({
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/action-planning-agent.md (MUST read first)
2. Run: `ccw spec load --category planning`

---

## Task Objective
Generate test-specific IMPL_PLAN.md and task JSONs for session [testSessionId]

## Context
- Session ID: [testSessionId]
- TEST_ANALYSIS_RESULTS.md: ${projectRoot}/.workflow/active/[testSessionId]/.process/TEST_ANALYSIS_RESULTS.md

## Expected Output (minimum 4 tasks)
- IMPL-001.json: Test understanding & generation (@code-developer)
- IMPL-001.3-validation.json: Code validation gate (@test-fix-agent)
- IMPL-001.5-review.json: Test quality gate (@test-fix-agent)
- IMPL-002.json: Test execution & fix cycle (@test-fix-agent)
- IMPL_PLAN.md: Test generation and execution strategy
- TODO_LIST.md: Task checklist

## Output Paths
- Tasks: ${projectRoot}/.workflow/active/[testSessionId]/.task/
- Plan: ${projectRoot}/.workflow/active/[testSessionId]/IMPL_PLAN.md
- Todo: ${projectRoot}/.workflow/active/[testSessionId]/TODO_LIST.md
`
});

const taskGenResult = wait({ ids: [taskGenAgentId], timeout_ms: 600000 });
close_agent({ id: taskGenAgentId });
```

**Input**: `testSessionId` from Sub-Phase 1.1

**Note**: action-planning-agent generates test-specific IMPL_PLAN.md and task JSONs based on TEST_ANALYSIS_RESULTS.md.

**Expected Output** (minimum 4 tasks):

| Task | Type | Agent | Purpose |
|------|------|-------|---------|
| IMPL-001 | test-gen | @code-developer | Test understanding & generation (L1-L3) |
| IMPL-001.3 | code-validation | @test-fix-agent | Code validation gate (L0 + AI issues) |
| IMPL-001.5 | test-quality-review | @test-fix-agent | Test quality gate |
| IMPL-002 | test-fix | @test-fix-agent | Test execution & fix cycle |

**Validation**:
- `${projectRoot}/.workflow/active/[testSessionId]/.task/IMPL-001.json` exists
- `${projectRoot}/.workflow/active/[testSessionId]/.task/IMPL-001.3-validation.json` exists
- `${projectRoot}/.workflow/active/[testSessionId]/.task/IMPL-001.5-review.json` exists
- `${projectRoot}/.workflow/active/[testSessionId]/.task/IMPL-002.json` exists
- `${projectRoot}/.workflow/active/[testSessionId]/IMPL_PLAN.md` exists
- `${projectRoot}/.workflow/active/[testSessionId]/TODO_LIST.md` exists

**Progress Tracking Update (agent task attached)**:
```json
[
  {"content": "Phase 1: Test-Fix Generation", "status": "in_progress"},
  {"content": "  1.1 Create Test Session", "status": "completed"},
  {"content": "  1.2 Gather Test Context", "status": "completed"},
  {"content": "  1.3 Test Generation Analysis", "status": "completed"},
  {"content": "  1.4 Generate Test Tasks", "status": "in_progress"},
  {"content": "  1.5 Phase Summary", "status": "pending"},
  {"content": "Phase 2: Test-Cycle Execution", "status": "pending"}
]
```

---

## Sub-Phase 1.5: Phase 1 Summary

**Internal Summary** (transitions directly to Phase 2):
```
Phase 1 Complete - Test-Fix Generation

Input: [original input]
Mode: [Session|Prompt]
Test Session: [testSessionId]

Tasks Created:
- IMPL-001: Test Understanding & Generation (@code-developer)
- IMPL-001.3: Code Validation Gate - AI Error Detection (@test-fix-agent)
- IMPL-001.5: Test Quality Gate - Static Analysis & Coverage (@test-fix-agent)
- IMPL-002: Test Execution & Fix Cycle (@test-fix-agent)

Quality Thresholds:
- Code Validation: Zero CRITICAL issues, zero compilation errors
- Minimum Coverage: 80% line, 70% branch
- Static Analysis: Zero critical anti-patterns
- Max Fix Iterations: 5

Artifacts:
- Test plan: ${projectRoot}/.workflow/active/[testSessionId]/IMPL_PLAN.md
- Task list: ${projectRoot}/.workflow/active/[testSessionId]/TODO_LIST.md
- Analysis: ${projectRoot}/.workflow/active/[testSessionId]/.process/TEST_ANALYSIS_RESULTS.md

→ Transitioning to Phase 2: Test-Cycle Execution
```

**Progress Tracking**: Mark Phase 1 completed, Phase 2 in_progress. Immediately begin Phase 2.

## Data Flow

```
User Input (session ID | description | file path)
    ↓
[Detect Mode: session | prompt]
    ↓
Sub-Phase 1.1: session:start --type test --new "description"
    ↓ Output: testSessionId
    ↓
Sub-Phase 1.2: test-context-gather | context-gather (via spawn_agent)
    ↓ Input: testSessionId
    ↓ Output: contextPath (context-package.json)
    ↓
Sub-Phase 1.3: test-concept-enhanced (via spawn_agent → cli-execution-agent)
    ↓ Input: testSessionId + contextPath
    ↓ Output: TEST_ANALYSIS_RESULTS.md (L0-L3 requirements + AI issues)
    ↓
Sub-Phase 1.4: test-task-generate (via spawn_agent → action-planning-agent)
    ↓ Input: testSessionId + TEST_ANALYSIS_RESULTS.md
    ↓ Output: IMPL_PLAN.md, IMPL-*.json (4+), TODO_LIST.md
    ↓
Sub-Phase 1.5: Phase 1 Summary
    ↓
→ Phase 2: Test-Cycle Execution
```

## Execution Flow Diagram

```
Orchestrator triggers Phase 1
  ↓
[Input Detection] → MODE: session | prompt
  ↓
[Progress Init] Phase 1 sub-phases
  ↓
Sub-Phase 1.1: Create Test Session
  → Read and execute session start phase
  → testSessionId extracted (WFS-test-user-auth)
  ↓
Sub-Phase 1.2: Gather Test Context (spawn_agent executed)
  → spawn_agent: context-search-agent
  → wait → close_agent
  → ATTACH 3 sub-tasks: ← ATTACHED
    - → Load codebase context
    - → Analyze test coverage
    - → Generate context package
  → Execute sub-tasks sequentially
  → COLLAPSE tasks ← COLLAPSED
  → contextPath extracted
  ↓
Sub-Phase 1.3: Test Generation Analysis (spawn_agent executed)
  → spawn_agent: cli-execution-agent (Gemini)
  → wait → close_agent
  → ATTACH 3 sub-tasks: ← ATTACHED
    - → Analyze coverage gaps with Gemini
    - → Detect AI code issues (L0.5)
    - → Generate L0-L3 test requirements
  → Execute sub-tasks sequentially
  → COLLAPSE tasks ← COLLAPSED
  → TEST_ANALYSIS_RESULTS.md created
  ↓
Sub-Phase 1.4: Generate Test Tasks (spawn_agent executed)
  → spawn_agent: action-planning-agent
  → wait → close_agent
  → Agent autonomously generates:
    - IMPL-001.json (test generation)
    - IMPL-001.3-validation.json (code validation)
    - IMPL-001.5-review.json (test quality)
    - IMPL-002.json (test execution)
    - IMPL_PLAN.md
    - TODO_LIST.md
  ↓
Sub-Phase 1.5: Phase 1 Summary
  → Internal summary with artifacts
  → Transition to Phase 2
```

## Session Metadata

**File**: `workflow-session.json`

| Mode | Fields |
|------|--------|
| **Session** | `type: "test"`, `source_session_id: "[sourceId]"` |
| **Prompt** | `type: "test"` (no source_session_id) |

## Error Handling

| Sub-Phase | Error Condition | Action |
|-----------|----------------|--------|
| 1.1 | Source session not found (session mode) | Return error with session ID |
| 1.1 | No completed IMPL tasks (session mode) | Return error, source incomplete |
| 1.2 | Context gathering failed | Return error, check source artifacts |
| 1.2 | Agent timeout | Retry with extended timeout, close_agent, then return error |
| 1.3 | Gemini analysis failed | Return error, check context package |
| 1.4 | Task generation failed | Retry once, then return error |

**Lifecycle Error Handling**:
```javascript
try {
  const agentId = spawn_agent({ message: "..." });
  const result = wait({ ids: [agentId], timeout_ms: 600000 });
  // ... process result ...
  close_agent({ id: agentId });
} catch (error) {
  if (agentId) close_agent({ id: agentId });
  throw error;
}
```
