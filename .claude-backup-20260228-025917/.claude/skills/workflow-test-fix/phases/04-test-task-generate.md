# Phase 4: Test Task Generate (test-task-generate)

Generate test task JSONs via test-action-planning-agent.

## Objective

- Generate test-specific IMPL_PLAN.md and task JSONs based on TEST_ANALYSIS_RESULTS.md
- Create minimum 4 tasks covering test generation, code validation, quality review, and test execution

## Execution

### Step 1.4: Generate Test Tasks

#### Phase 1: Context Preparation

**Purpose**: Assemble test session paths, load test analysis context, and create test-planning-notes.md.

**Execution Steps**:
1. Parse `--session` flag to get test session ID
2. Load `workflow-session.json` for session metadata
3. Verify `TEST_ANALYSIS_RESULTS.md` exists (from test-concept-enhanced)
4. Load `test-context-package.json` for coverage data
5. Create `test-planning-notes.md` with initial context

**After Phase 1**: Initialize test-planning-notes.md

```javascript
// Create test-planning-notes.md with N+1 context support
const testPlanningNotesPath = `.workflow/active/${testSessionId}/test-planning-notes.md`
const sessionMetadata = JSON.parse(Read(`.workflow/active/${testSessionId}/workflow-session.json`))
const testAnalysis = Read(`.workflow/active/${testSessionId}/.process/TEST_ANALYSIS_RESULTS.md`)
const sourceSessionId = sessionMetadata.source_session_id || 'N/A'

// Extract key info from TEST_ANALYSIS_RESULTS.md
const projectType = testAnalysis.match(/Project Type:\s*(.+)/)?.[1] || 'Unknown'
const testFramework = testAnalysis.match(/Test Framework:\s*(.+)/)?.[1] || 'Unknown'
const coverageTarget = testAnalysis.match(/Coverage Target:\s*(.+)/)?.[1] || '80%'

Write(testPlanningNotesPath, `# Test Planning Notes

**Session**: ${testSessionId}
**Source Session**: ${sourceSessionId}
**Created**: ${new Date().toISOString()}

## Test Intent (Phase 1)

- **PROJECT_TYPE**: ${projectType}
- **TEST_FRAMEWORK**: ${testFramework}
- **COVERAGE_TARGET**: ${coverageTarget}
- **SOURCE_SESSION**: ${sourceSessionId}

---

## Context Findings (Phase 1)

### Files with Coverage Gaps
(Extracted from TEST_ANALYSIS_RESULTS.md)

### Test Framework & Conventions
- Framework: ${testFramework}
- Coverage Target: ${coverageTarget}

---

## Gemini Enhancement (Phase 1.5)
(To be filled by Gemini analysis)

### Enhanced Test Suggestions
- **L1 (Unit)**: (Pending)
- **L2.1 (Integration)**: (Pending)
- **L2.2 (API Contracts)**: (Pending)
- **L2.4 (External APIs)**: (Pending)
- **L2.5 (Failure Modes)**: (Pending)

### Gemini Analysis Summary
(Pending enrichment)

---

## Consolidated Test Requirements (Phase 2 Input)
1. [Context] ${testFramework} framework conventions
2. [Context] ${coverageTarget} coverage target

---

## Task Generation (Phase 2)
(To be filled by test-action-planning-agent)

## N+1 Context
### Decisions
| Decision | Rationale | Revisit? |
|----------|-----------|----------|

### Deferred
- [ ] (For N+1)
`)
```

---

#### Phase 1.5: Gemini Test Enhancement

**Purpose**: Enrich test specifications with comprehensive test suggestions and record to test-planning-notes.md.

**Execution Steps**:
1. Load TEST_ANALYSIS_RESULTS.md from `.workflow/active/{test-session-id}/.process/`
2. Invoke `cli-execution-agent` with Gemini for test enhancement analysis
3. Use template: `~/.ccw/workflows/cli-templates/prompts/test-suggestions-enhancement.txt`
4. Gemini generates enriched test suggestions across L1-L3 layers -> gemini-enriched-suggestions.md
5. Record enriched suggestions to test-planning-notes.md (Gemini Enhancement section)

```javascript
Task(
  subagent_type="cli-execution-agent",
  run_in_background=false,
  description="Enhance test specifications with Gemini analysis",
  prompt=`
## Task Objective
Analyze TEST_ANALYSIS_RESULTS.md and generate enriched test suggestions using Gemini CLI

## Input Files
- Read: .workflow/active/{test-session-id}/.process/TEST_ANALYSIS_RESULTS.md
- Extract: Project type, test framework, coverage gaps, identified files

## Gemini Analysis Execution
Execute Gemini with comprehensive test enhancement prompt:
  ccw cli -p "[comprehensive test prompt]" --tool gemini --mode analysis --rule analysis-test-strategy-enhancement --cd .workflow/active/{test-session-id}/.process

## Expected Output
Generate gemini-enriched-suggestions.md with structured test enhancements:
  - L1 (Unit Tests): Edge cases, boundaries, error paths
  - L2.1 (Integration): Module interactions, dependency injection
  - L2.2 (API Contracts): Request/response, validation, error responses
  - L2.4 (External APIs): Mock strategies, failure scenarios, timeouts
  - L2.5 (Failure Modes): Exception handling, error propagation, recovery

## Validation
- gemini-enriched-suggestions.md created and complete
- Suggestions are actionable and specific (not generic)
- All L1-L3 layers covered
`
)
```

**Output**: gemini-enriched-suggestions.md (complete Gemini analysis)

**After Phase 1.5**: Update test-planning-notes.md with Gemini enhancement findings

```javascript
// Read enriched suggestions from gemini-enriched-suggestions.md
const enrichedSuggestionsPath = `.workflow/active/${testSessionId}/.process/gemini-enriched-suggestions.md`
const enrichedSuggestions = Read(enrichedSuggestionsPath)

// Update Phase 1.5 section in test-planning-notes.md with full enriched suggestions
Edit(testPlanningNotesPath, {
  old: '## Gemini Enhancement (Phase 1.5)\n(To be filled by Gemini analysis)\n\n### Enhanced Test Suggestions\n- **L1 (Unit)**: (Pending)\n- **L2.1 (Integration)**: (Pending)\n- **L2.2 (API Contracts)**: (Pending)\n- **L2.4 (External APIs)**: (Pending)\n- **L2.5 (Failure Modes)**: (Pending)\n\n### Gemini Analysis Summary\n(Pending enrichment)',
  new: `## Gemini Enhancement (Phase 1.5)

**Analysis Timestamp**: ${new Date().toISOString()}
**Template**: test-suggestions-enhancement.txt
**Output File**: .process/gemini-enriched-suggestions.md

### Enriched Test Suggestions (Complete Gemini Analysis)

${enrichedSuggestions}

### Gemini Analysis Summary
- **Status**: Enrichment complete
- **Layers Covered**: L1, L2.1, L2.2, L2.4, L2.5
- **Focus Areas**: API contracts, integration patterns, error scenarios, edge cases
- **Output Stored**: Full analysis in gemini-enriched-suggestions.md`
})

// Append Gemini constraints to consolidated test requirements
const geminiConstraints = [
  '[Gemini] Implement all suggested L1 edge cases and boundary tests',
  '[Gemini] Apply L2.1 module interaction patterns from analysis',
  '[Gemini] Follow L2.2 API contract test matrix from analysis',
  '[Gemini] Use L2.4 external API mock strategies from analysis',
  '[Gemini] Cover L2.5 error scenarios from analysis'
]

const currentNotes = Read(testPlanningNotesPath)
const constraintCount = (currentNotes.match(/^\d+\./gm) || []).length

Edit(testPlanningNotesPath, {
  old: '## Consolidated Test Requirements (Phase 2 Input)',
  new: `## Consolidated Test Requirements (Phase 2 Input)
1. [Context] ${testFramework} framework conventions
2. [Context] ${coverageTarget} coverage target
${geminiConstraints.map((c, i) => `${i + 3}. ${c}`).join('\n')}`
})
```

---

#### Phase 2: Test Document Generation (Agent)

**Agent Specialization**: This invokes `@test-action-planning-agent` - a specialized variant of action-planning-agent with:
- Progressive L0-L3 test layers (Static, Unit, Integration, E2E)
- AI code issue detection (L0.5) with severity levels
- Project type templates (React, Node API, CLI, Library, Monorepo)
- Test anti-pattern detection with quality gates
- Layer completeness thresholds and coverage targets

**See**: `d:\Claude_dms3\.claude\agents\test-action-planning-agent.md` for complete test specifications.

```javascript
Task(
  subagent_type="test-action-planning-agent",
  run_in_background=false,
  description="Generate test planning documents",
  prompt=`
## TASK OBJECTIVE
Generate test planning documents (IMPL_PLAN.md, task JSONs, TODO_LIST.md) for test workflow session

IMPORTANT: This is TEST PLANNING ONLY - you are generating planning documents, NOT executing tests.

## SESSION PATHS
Input:
  - Session Metadata: .workflow/active/{test-session-id}/workflow-session.json
  - TEST_ANALYSIS_RESULTS: .workflow/active/{test-session-id}/.process/TEST_ANALYSIS_RESULTS.md (REQUIRED)
  - Test Planning Notes: .workflow/active/{test-session-id}/test-planning-notes.md (REQUIRED - contains Gemini enhancement findings)
  - Test Context Package: .workflow/active/{test-session-id}/.process/test-context-package.json
  - Context Package: .workflow/active/{test-session-id}/.process/context-package.json
  - Enriched Suggestions: .workflow/active/{test-session-id}/.process/gemini-enriched-suggestions.md (for reference)
  - Source Session Summaries: .workflow/active/{source-session-id}/.summaries/IMPL-*.md (if exists)

Output:
  - Task Dir: .workflow/active/{test-session-id}/.task/
  - IMPL_PLAN: .workflow/active/{test-session-id}/IMPL_PLAN.md
  - TODO_LIST: .workflow/active/{test-session-id}/TODO_LIST.md

## CONTEXT METADATA
Session ID: {test-session-id}
Workflow Type: test_session
Source Session: {source-session-id} (if exists)
MCP Capabilities: {exa_code, exa_web, code_index}

## CONSOLIDATED CONTEXT
**From test-planning-notes.md**:
- Test Intent: Project type, test framework, coverage target
- Context Findings: Coverage gaps, file analysis
- Gemini Enhancement: Complete enriched test suggestions (L1-L3 layers)
  * Full analysis embedded in planning-notes.md
  * API contracts, integration patterns, error scenarios
- Consolidated Requirements: Combined constraints from all phases

## YOUR SPECIFICATIONS
You are @test-action-planning-agent. Your complete test specifications are defined in:
  d:\Claude_dms3\.claude\agents\test-action-planning-agent.md

This includes:
  - Progressive Test Layers (L0-L3) with L0.1-L0.5, L1.1-L1.5, L2.1-L2.5, L3.1-L3.4
  - AI Code Issue Detection (L0.5) with 7 categories and severity levels
  - Project Type Detection & Templates (6 project types)
  - Test Anti-Pattern Detection (5 categories)
  - Layer Completeness & Quality Metrics (thresholds and gate decisions)
  - Task JSON structure requirements (minimum 4 tasks)
  - Quality validation rules

**Follow your specification exactly** when generating test task JSONs.

## EXPECTED DELIVERABLES
1. Test Task JSON Files (.task/IMPL-*.json) - Minimum 4:
   - IMPL-001.json: Test generation (L1-L3 layers per spec)
   - IMPL-001.3-validation.json: Code validation gate (L0 + AI issues per spec)
   - IMPL-001.5-review.json: Test quality gate (anti-patterns + coverage per spec)
   - IMPL-002.json: Test execution & fix cycle

2. IMPL_PLAN.md: Test implementation plan with quality gates

3. TODO_LIST.md: Hierarchical task list with test phase indicators

## SUCCESS CRITERIA
- All test planning documents generated successfully
- Task count: minimum 4 (expandable for complex projects)
- Test framework: {detected from project}
- Coverage targets: L0 zero errors, L1 80%+, L2 70%+
- L0-L3 layers explicitly defined per spec
- AI issue detection configured per spec
- Quality gates with measurable thresholds
`
)
```

**Input**: `testSessionId` from Phase 1

**Note**: test-action-planning-agent generates test-specific IMPL_PLAN.md and task JSONs based on TEST_ANALYSIS_RESULTS.md.

**Expected Output** (minimum 4 tasks):

| Task | Type | Agent | Purpose |
|------|------|-------|---------|
| IMPL-001 | test-gen | @code-developer | Test understanding & generation (L1-L3) |
| IMPL-001.3 | code-validation | @test-fix-agent | Code validation gate (L0 + AI issues) |
| IMPL-001.5 | test-quality-review | @test-fix-agent | Test quality gate |
| IMPL-002 | test-fix | @test-fix-agent | Test execution & fix cycle |

**Validation**:
- `.workflow/active/[testSessionId]/.task/IMPL-001.json` exists
- `.workflow/active/[testSessionId]/.task/IMPL-001.3-validation.json` exists
- `.workflow/active/[testSessionId]/.task/IMPL-001.5-review.json` exists
- `.workflow/active/[testSessionId]/.task/IMPL-002.json` exists
- `.workflow/active/[testSessionId]/IMPL_PLAN.md` exists
- `.workflow/active/[testSessionId]/TODO_LIST.md` exists

## Test-Specific Execution Modes

### Test Generation (IMPL-001)
- **Agent Mode** (default): @code-developer generates tests within agent context
- **CLI Mode**: Use CLI tools when `command` field present in implementation_approach

### Test Execution & Fix (IMPL-002+)
- **Agent Mode** (default): Gemini diagnosis -> agent applies fixes
- **CLI Mode**: Gemini diagnosis -> CLI applies fixes (when `command` field present)

**CLI Tool Selection**: Determined semantically from user's task description (e.g., "use Codex for fixes")

## Output Directory Structure

```
.workflow/active/WFS-test-[session]/
|-- workflow-session.json              # Session metadata
|-- IMPL_PLAN.md                       # Test implementation plan
|-- TODO_LIST.md                       # Task checklist
|-- test-planning-notes.md             # Consolidated planning notes with full Gemini analysis
|-- .task/
|   |-- IMPL-001.json                  # Test generation (L1-L3)
|   |-- IMPL-001.3-validation.json     # Code validation gate (L0 + AI)
|   |-- IMPL-001.5-review.json         # Test quality gate
|   +-- IMPL-002.json                  # Test execution & fix cycle
+-- .process/
    |-- test-context-package.json      # Test coverage and patterns
    |-- gemini-enriched-suggestions.md # Gemini-generated test enhancements
    +-- TEST_ANALYSIS_RESULTS.md       # L0-L3 requirements (from test-concept-enhanced)
```

## Output

- **Files**: IMPL_PLAN.md, IMPL-*.json (4+), TODO_LIST.md
- **TodoWrite**: Mark Phase 1-4 completed, Phase 5 in_progress

## Next Phase

Return to orchestrator for summary output, then auto-continue to [Phase 5: Test Cycle Execute](05-test-cycle-execute.md).
