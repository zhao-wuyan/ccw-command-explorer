# Phase 3: Test Coverage Analysis

Analyze existing test coverage, detect test framework, and identify coverage gaps.

## Objective

- Analyze existing codebase for test patterns and conventions
- Detect current test coverage and framework
- Identify related components and integration points
- Generate test-context-package.json

## Core Philosophy

- **Agent Delegation**: Delegate all test coverage analysis to `test-context-search-agent` for autonomous execution
- **Detection-First**: Check for existing test-context-package before executing
- **Coverage-First**: Analyze existing test coverage before planning new tests
- **Source Context Loading**: Import implementation summaries from source session
- **Standardized Output**: Generate `.workflow/active/{session}/.process/test-context-package.json`

## Execution

### Step 3.1: Test-Context-Package Detection

**Execute First** - Check if valid package already exists:

```javascript
const testContextPath = `.workflow/active/${sessionId}/.process/test-context-package.json`;

if (file_exists(testContextPath)) {
  const existing = Read(testContextPath);

  // Validate package belongs to current session
  if (existing?.metadata?.test_session_id === sessionId) {
    console.log("Valid test-context-package found for session:", sessionId);
    console.log("Coverage Stats:", existing.test_coverage.coverage_stats);
    console.log("Framework:", existing.test_framework.framework);
    console.log("Missing Tests:", existing.test_coverage.missing_tests.length);
    // Skip execution, store variable and proceed
    testContextPath_var = testContextPath;
    return; // Early exit - skip Steps 3.2-3.3
  }
}
```

### Step 3.2: Invoke Test-Context-Search Agent

**Only execute if Step 3.1 finds no valid package**

```javascript
Task(
  subagent_type="test-context-search-agent",
  run_in_background=false,
  description="Gather test coverage context",
  prompt=`

## Execution Mode
**PLAN MODE** (Comprehensive) - Full Phase 1-3 execution

## Session Information
- **Test Session ID**: ${sessionId}
- **Output Path**: .workflow/active/${sessionId}/.process/test-context-package.json

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

### Step 3.3: Output Verification

After agent completes, verify output:

```javascript
// Verify file was created
const outputPath = `.workflow/active/${sessionId}/.process/test-context-package.json`;
if (!file_exists(outputPath)) {
  throw new Error("Agent failed to generate test-context-package.json");
}

// Load and display summary
const testContext = JSON.parse(Read(outputPath));
console.log("Test context package generated successfully");
console.log("Coverage:", testContext.test_coverage.coverage_stats.coverage_percentage + "%");
console.log("Tests to generate:", testContext.test_coverage.missing_tests.length);

// Store variable for subsequent phases
testContextPath_var = outputPath;
```

### TodoWrite Update (Phase 3 Skill executed - tasks attached)

```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "completed", "activeForm": "Executing context gathering"},
  {"content": "Phase 3: Test Coverage Analysis", "status": "in_progress", "activeForm": "Executing test coverage analysis"},
  {"content": "  -> Detect test framework and conventions", "status": "in_progress", "activeForm": "Detecting test framework"},
  {"content": "  -> Analyze existing test coverage", "status": "pending", "activeForm": "Analyzing test coverage"},
  {"content": "  -> Identify coverage gaps", "status": "pending", "activeForm": "Identifying coverage gaps"},
  {"content": "Phase 5: TDD Task Generation", "status": "pending", "activeForm": "Executing TDD task generation"},
  {"content": "Phase 6: TDD Structure Validation", "status": "pending", "activeForm": "Validating TDD structure"}
]
```

**Note**: Agent execution **attaches** test-context-search's 3 tasks. Orchestrator **executes** these tasks.

**Next Action**: Tasks attached -> **Execute Phase 3.1-3.3** sequentially

### TodoWrite Update (Phase 3 completed - tasks collapsed)

```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "completed", "activeForm": "Executing context gathering"},
  {"content": "Phase 3: Test Coverage Analysis", "status": "completed", "activeForm": "Executing test coverage analysis"},
  {"content": "Phase 5: TDD Task Generation", "status": "pending", "activeForm": "Executing TDD task generation"},
  {"content": "Phase 6: TDD Structure Validation", "status": "pending", "activeForm": "Validating TDD structure"}
]
```

**Note**: Phase 3 tasks completed and collapsed to summary.

**After Phase 3**: Return to user showing test coverage results, then auto-continue to Phase 4/5 (depending on conflict_risk)

## Output

- **Variable**: `testContextPath` (path to test-context-package.json)
- **TodoWrite**: Mark Phase 3 completed

## Next Phase

Based on `conflictRisk` from Phase 2:
- If conflictRisk >= medium -> [Phase 4: Conflict Resolution](04-conflict-resolution.md)
- If conflictRisk < medium -> Skip to [Phase 5: TDD Task Generation](05-tdd-task-generation.md)
