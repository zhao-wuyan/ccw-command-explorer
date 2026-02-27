---
name: ccw-debug
description: Aggregated debug command - combines debugging diagnostics and test verification in a synergistic workflow supporting cli-quick / debug-first / test-first / bidirectional-verification modes
argument-hint: "[--mode cli|debug|test|bidirectional] [--yes|-y] [--hotfix] \"bug description or error message\""
allowed-tools: SlashCommand(*), TodoWrite(*), AskUserQuestion(*), Read(*), Bash(*)
---

# CCW-Debug Aggregated Command

## Core Concept

**Aggregated Debug Command** - Combines debugging diagnostics and test verification in a synergistic workflow. Not a simple concatenation of two commands, but intelligent orchestration based on mode selection.

### Four Execution Modes

| Mode | Workflow | Use Case | Characteristics |
|------|----------|----------|-----------------|
| **CLI Quick** (cli) | Direct CLI Analysis → Fix Suggestions | Simple issues, quick diagnosis | Fastest, minimal workflow, recommendation-only |
| **Debug First** (debug) | Debug → Analyze Hypotheses → Apply Fix → Test Verification | Root cause unclear, requires exploration | Starts with exploration, Gemini-assisted |
| **Test First** (test) | Generate Tests → Execute → Analyze Failures → CLI Fixes | Code implemented, needs test validation | Driven by test coverage, auto-iterates |
| **Bidirectional Verification** (bidirectional) | Parallel: Debug + Test → Merge Findings → Unified Fix | Complex systems, ambiguous symptoms | Parallel execution, converged insights |

---

## Quick Start

### Basic Usage

```bash
# CLI quick mode: fastest, recommendation-only (new!)
/ccw-debug --mode cli "Login failed: token validation error"

# Default mode: debug-first (recommended for most scenarios)
/ccw-debug "Login failed: token validation error"

# Test-first mode
/ccw-debug --mode test "User permission check failure"

# Bidirectional verification mode (complex issues)
/ccw-debug --mode bidirectional "Payment flow multiple failures"

# Auto mode (skip all confirmations)
/ccw-debug --yes "Quick fix: database connection timeout"

# Production hotfix (minimal diagnostics)
/ccw-debug --hotfix --yes "Production: API returns 500"
```

### Mode Selection Guide

**Choose "CLI Quick"** when:
- Need immediate diagnosis, not execution
- Want quick recommendations without workflows
- Simple issues with clear symptoms
- Just need fix suggestions, no auto-application
- Time is critical, prefer fast output
- Want to review CLI analysis before action

**Choose "Debug First"** when:
- Root cause is unclear
- Error messages are incomplete or vague
- Need to understand code execution flow
- Issues involve multi-module interactions

**Choose "Test First"** when:
- Code is fully implemented
- Need test coverage verification
- Have clear failure cases
- Want automated iterative fixes

**Choose "Bidirectional Verification"** when:
- System is complex (multiple subsystems)
- Problem symptoms are ambiguous (multiple possible root causes)
- Need multi-angle validation
- Time allows parallel analysis

---

## Execution Flow

### Overall Process

```
Phase 1: Intent Analysis & Mode Selection
   ├─ Parse --mode flag or recommend mode
   ├─ Check --hotfix and --yes flags
   └─ Determine workflow path

Phase 2: Initialization
   ├─ CLI Quick: Lightweight init (no session directory needed)
   ├─ Others: Create unified session directory (.workflow/.ccw-debug/)
   ├─ Setup TodoWrite tracking
   └─ Prepare session context

Phase 3: Execute Corresponding Workflow
   ├─ CLI Quick: ccw cli → Diagnosis Report → Optional: Escalate to debug/test/apply fix
   ├─ Debug First: /workflow:debug-with-file → Fix → /workflow:test-fix-gen → /workflow:test-cycle-execute
   ├─ Test First: /workflow:test-fix-gen → /workflow:test-cycle-execute → CLI analyze failures
   └─ Bidirectional: [/workflow:debug-with-file] ∥ [/workflow:test-fix-gen → test-cycle-execute]

Phase 4: Merge Findings (Bidirectional Mode) / Escalation Decision (CLI Mode)
   ├─ CLI Quick: Present results → Ask user: Apply fix? Escalate? Done?
   ├─ Bidirectional: Converge findings from both workflows
   ├─ Identify consistent and conflicting root cause analyses
   └─ Generate unified fix plan

Phase 5: Completion & Follow-up
   ├─ Generate summary report
   ├─ Provide next step recommendations
   └─ Optional: Expand to issues (testing/enhancement/refactoring/documentation)
```

---

## Workflow Details

### Mode 0: CLI Quick (Minimal Debug Method)

**Best For**: Fast recommendations without full workflow overhead

**Workflow**:
```
User Input → Quick Context Gather → ccw cli (Gemini/Qwen/Codex)
                                          ↓
                                    Analysis Report
                                          ↓
                                    Fix Recommendations
                                          ↓
                              Optional: User Decision
                    ┌──────────────┼──────────────┐
                    ↓              ↓              ↓
              Apply Fix    Escalate Mode    Done
                           (debug/test)
```

**Execution Steps**:

1. **Lightweight Context Gather** (Phase 2)
   ```javascript
   // No session directory needed for CLI mode
   const tempContext = {
     bug_description: bug_description,
     timestamp: getUtc8ISOString(),
     mode: "cli"
   }

   // Quick context discovery (30s max)
   // - Read error file if path provided
   // - Extract error patterns from description
   // - Identify likely affected files (basic grep)
   ```

2. **Execute CLI Analysis** (Phase 3)
   ```bash
   # Use ccw cli with bug diagnosis template
   ccw cli -p "
   PURPOSE: Quick bug diagnosis for immediate recommendations

   TASK:
   • Analyze bug symptoms: ${bug_description}
   • Identify likely root cause
   • Provide actionable fix recommendations (code snippets if possible)
   • Assess fix confidence level

   MODE: analysis

   CONTEXT: ${contextFiles.length > 0 ? '@' + contextFiles.join(' @') : 'Bug description only'}

   EXPECTED:
   - Root cause hypothesis (1-2 sentences)
   - Fix strategy (immediate/comprehensive/refactor)
   - Code snippets or file modification suggestions
   - Confidence level: High/Medium/Low
   - Risk assessment

   CONSTRAINTS: Quick analysis, 2-5 minutes max
   " --tool gemini --mode analysis --rule analysis-diagnose-bug-root-cause
   ```

3. **Present Results** (Phase 4)
   ```
   ## CLI Quick Analysis Complete

   **Issue**: [bug_description]
   **Analysis Time**: [duration]
   **Confidence**: [High/Medium/Low]

   ### Root Cause
   [1-2 sentence hypothesis]

   ### Fix Strategy
   [immediate_patch | comprehensive_fix | refactor]

   ### Recommended Changes

   **File**: src/module/file.ts
   ```typescript
   // Change line 45-50
   - old code
   + new code
   ```

   **Rationale**: [why this fix]
   **Risk**: [Low/Medium/High] - [risk description]

   ### Confidence Assessment
   - Analysis confidence: [percentage]
   - Recommendation: [apply immediately | review first | escalate to full debug]
   ```

4. **User Decision** (Phase 5)
   ```javascript
   // Parse --yes flag
   const autoYes = $ARGUMENTS.includes('--yes') || $ARGUMENTS.includes('-y')

   if (autoYes && confidence === 'High') {
     // Auto-apply fix
     console.log('[--yes + High confidence] Auto-applying fix...')
     applyFixFromCLIRecommendation(cliOutput)
   } else {
     // Ask user
     const decision = AskUserQuestion({
       questions: [{
         question: `CLI analysis complete (${confidence} confidence). What next?`,
         header: "Decision",
         multiSelect: false,
         options: [
           { label: "Apply Fix", description: "Apply recommended changes immediately" },
           { label: "Escalate to Debug", description: "Switch to debug-first for deeper analysis" },
           { label: "Escalate to Test", description: "Switch to test-first for validation" },
           { label: "Review Only", description: "Just review, no action" }
         ]
       }]
     })

     if (decision === "Apply Fix") {
       applyFixFromCLIRecommendation(cliOutput)
     } else if (decision === "Escalate to Debug") {
       // Re-invoke ccw-debug with --mode debug
       SlashCommand(command=`/ccw-debug --mode debug "${bug_description}"`)
     } else if (decision === "Escalate to Test") {
       // Re-invoke ccw-debug with --mode test
       SlashCommand(command=`/ccw-debug --mode test "${bug_description}"`)
     }
   }
   ```

**Key Characteristics**:
- **Speed**: 2-5 minutes total (fastest mode)
- **Session**: No persistent session directory (lightweight)
- **Output**: Recommendation report only
- **Execution**: Optional, user-controlled
- **Escalation**: Can upgrade to full debug/test workflows

**Limitations**:
- No hypothesis iteration (single-shot analysis)
- No automatic test generation
- No instrumentation/logging
- Best for clear symptoms with localized fixes

---

### Mode 1: Debug First

**Best For**: Issues requiring root cause exploration

**Workflow**:
```
User Input → Session Init → /workflow:debug-with-file
                                    ↓
                           Generate understanding.md + hypotheses
                                    ↓
                           User reproduces issue, analyze logs
                                    ↓
                           Gemini validates hypotheses
                                    ↓
                           Apply fix code
                                    ↓
                           /workflow:test-fix-gen
                                    ↓
                           /workflow:test-cycle-execute
                                    ↓
                           Generate unified report
```

**Execution Steps**:

1. **Session Initialization** (Phase 2)
   ```javascript
   const sessionId = `CCWD-${bugSlug}-${dateStr}`
   const sessionFolder = `.workflow/.ccw-debug/${sessionId}`
   bash(`mkdir -p ${sessionFolder}`)

   // Record mode selection
   const modeConfig = {
     mode: "debug",
     original_input: bug_description,
     timestamp: getUtc8ISOString(),
     flags: { hotfix, autoYes }
   }
   Write(`${sessionFolder}/mode-config.json`, JSON.stringify(modeConfig, null, 2))
   ```

2. **Start Debug** (Phase 3)
   ```javascript
   SlashCommand(command=`/workflow:debug-with-file "${bug_description}"`)

   // Update TodoWrite
   TodoWrite({
     todos: [
       { content: "Phase 1: Debug & Analysis", status: "completed" },
       { content: "Phase 2: Apply Fix from Debug Findings", status: "in_progress" },
       { content: "Phase 3: Generate & Execute Tests", status: "pending" },
       { content: "Phase 4: Generate Report", status: "pending" }
     ]
   })
   ```

3. **Apply Fix** (Handled by debug command)

4. **Test Generation & Execution**
   ```javascript
   // Auto-continue after debug command completes
   SlashCommand(command=`/workflow:test-fix-gen "Test validation for: ${bug_description}"`)
   SlashCommand(command="/workflow:test-cycle-execute")
   ```

5. **Generate Report** (Phase 5)
   ```
   ## Debug-First Workflow Completed

   **Issue**: [bug_description]
   **Mode**: Debug First
   **Session**: [sessionId]

   ### Debug Phase Results
   - Root Cause: [extracted from understanding.md]
   - Hypothesis Confirmation: [from hypotheses.json]
   - Fixes Applied: [list of modified files]

   ### Test Phase Results
   - Tests Created: [test files generated by IMPL-001]
   - Pass Rate: [final test pass rate]
   - Iteration Count: [fix iterations]

   ### Key Findings
   - [learning points from debugging]
   - [coverage insights from testing]
   ```

---

### Mode 2: Test First

**Best For**: Implemented code needing test validation

**Workflow**:
```
User Input → Session Init → /workflow:test-fix-gen
                                    ↓
                           Generate test tasks (IMPL-001, IMPL-002)
                                    ↓
                           /workflow:test-cycle-execute
                                    ↓
                           Auto-iterate: Test → Analyze Failures → CLI Fix
                                    ↓
                           Until pass rate ≥ 95%
                                    ↓
                           Generate report
```

**Execution Steps**:

1. **Session Initialization** (Phase 2)
   ```javascript
   const modeConfig = {
     mode: "test",
     original_input: bug_description,
     timestamp: getUtc8ISOString(),
     flags: { hotfix, autoYes }
   }
   ```

2. **Generate Tests** (Phase 3)
   ```javascript
   SlashCommand(command=`/workflow:test-fix-gen "${bug_description}"`)

   // Update TodoWrite
   TodoWrite({
     todos: [
       { content: "Phase 1: Generate Tests", status: "completed" },
       { content: "Phase 2: Execute & Fix Tests", status: "in_progress" },
       { content: "Phase 3: Final Validation", status: "pending" },
       { content: "Phase 4: Generate Report", status: "pending" }
     ]
   })
   ```

3. **Execute & Iterate** (Phase 3 cont.)
   ```javascript
   SlashCommand(command="/workflow:test-cycle-execute")

   // test-cycle-execute handles:
   // - Execute tests
   // - Analyze failures
   // - Generate fix tasks via CLI
   // - Iterate fixes until pass
   ```

4. **Generate Report** (Phase 5)

---

### Mode 3: Bidirectional Verification

**Best For**: Complex systems, multi-dimensional analysis

**Workflow**:
```
User Input → Session Init → Parallel execution:
                    ┌──────────────────────────────┐
                    │                              │
                    ↓                              ↓
         /workflow:debug-with-file    /workflow:test-fix-gen
                    │                              │
         Generate hypotheses & understanding    Generate test tasks
                    │                              │
                    ↓                              ↓
              Apply debug fixes       /workflow:test-cycle-execute
                    │                              │
                    └──────────────┬───────────────┘
                                   ↓
                        Phase 4: Merge Findings
                    ├─ Converge root cause analyses
                    ├─ Identify consistency (mutual validation)
                    ├─ Identify conflicts (need coordination)
                    └─ Generate unified report
```

**Execution Steps**:

1. **Parallel Execution** (Phase 3)
   ```javascript
   // Start debug
   const debugTask = SlashCommand(
     command=`/workflow:debug-with-file "${bug_description}"`,
     run_in_background=false
   )

   // Start test generation (synchronous execution, SlashCommand blocks)
   const testTask = SlashCommand(
     command=`/workflow:test-fix-gen "${bug_description}"`,
     run_in_background=false
   )

   // Execute test cycle
   const testCycleTask = SlashCommand(
     command="/workflow:test-cycle-execute",
     run_in_background=false
   )
   ```

2. **Merge Findings** (Phase 4)
   ```javascript
   // Read debug results
   const understandingMd = Read(`${debugSessionFolder}/understanding.md`)
   const hypothesesJson = JSON.parse(Read(`${debugSessionFolder}/hypotheses.json`))

   // Read test results
   const testResultsJson = JSON.parse(Read(`${testSessionFolder}/.process/test-results.json`))
   const fixPlanJson = JSON.parse(Read(`${testSessionFolder}/.task/IMPL-002.json`))

   // Merge analysis
   const convergence = {
     debug_root_cause: hypothesesJson.confirmed_hypothesis,
     test_failure_pattern: testResultsJson.failures,
     consistency: analyzeConsistency(debugRootCause, testFailures),
     conflicts: identifyConflicts(debugRootCause, testFailures),
     unified_root_cause: mergeRootCauses(debugRootCause, testFailures),
     recommended_fix: selectBestFix(debugRootCause, testRootCause)
   }
   ```

3. **Generate Report** (Phase 5)
   ```
   ## Bidirectional Verification Workflow Completed

   **Issue**: [bug_description]
   **Mode**: Bidirectional Verification

   ### Debug Findings
   - Root Cause (hypothesis): [from understanding.md]
   - Confidence: [from hypotheses.json]
   - Key code paths: [file:line]

   ### Test Findings
   - Failure pattern: [list of failing tests]
   - Error type: [error type]
   - Impact scope: [affected modules]

   ### Merged Analysis
   - ✓ Consistent: Both workflows identified same root cause
   - ⚠ Conflicts: [list any conflicts]
   - → Unified Root Cause: [final confirmed root cause]

   ### Recommended Fix
   - Strategy: [selected fix strategy]
   - Rationale: [why this strategy]
   - Risks: [known risks]
   ```

---

## Command Line Interface

### Complete Syntax

```bash
/ccw-debug [OPTIONS] <BUG_DESCRIPTION>

Options:
  --mode <cli|debug|test|bidirectional>  Execution mode (default: debug)
  --yes, -y                              Auto mode (skip all confirmations)
  --hotfix, -h                           Production hotfix mode (only for debug mode)
  --no-tests                             Skip test generation in debug-first mode
  --skip-report                          Don't generate final report
  --resume <session-id>                  Resume interrupted session

Arguments:
  <BUG_DESCRIPTION>                      Issue description, error message, or .md file path
```

### Examples

```bash
# CLI quick mode: fastest, recommendation-only (NEW!)
/ccw-debug --mode cli "User login timeout"
/ccw-debug --mode cli --yes "Quick fix: API 500 error"  # Auto-apply if high confidence

# Debug first (default)
/ccw-debug "User login timeout"

# Test first
/ccw-debug --mode test "Payment validation failure"

# Bidirectional verification
/ccw-debug --mode bidirectional "Multi-module data consistency issue"

# Hotfix auto mode
/ccw-debug --hotfix --yes "API 500 error"

# Debug first, skip tests
/ccw-debug --no-tests "Understand code flow"

# Resume interrupted session
/ccw-debug --resume CCWD-login-timeout-2025-01-27
```

---

## Session Structure

### File Organization

```
.workflow/.ccw-debug/CCWD-{slug}-{date}/
├── mode-config.json                # Mode configuration and flags
├── session-manifest.json            # Session index and status
├── final-report.md                  # Final report
│
├── debug/                           # Debug workflow (if mode includes debug)
│   ├── debug-session-id.txt
│   ├── understanding.md
│   ├── hypotheses.json
│   └── debug.log
│
├── test/                            # Test workflow (if mode includes test)
│   ├── test-session-id.txt
│   ├── IMPL_PLAN.md
│   ├── test-results.json
│   └── iteration-state.json
│
└── fusion/                          # Fusion analysis (bidirectional mode)
    ├── convergence-analysis.json
    ├── consistency-report.md
    └── unified-root-cause.json
```

### Session State Management

```json
{
  "session_id": "CCWD-login-timeout-2025-01-27",
  "mode": "debug|test|bidirectional",
  "status": "running|completed|failed|paused",
  "phases": {
    "phase_1": { "status": "completed", "timestamp": "..." },
    "phase_2": { "status": "in_progress", "timestamp": "..." },
    "phase_3": { "status": "pending" },
    "phase_4": { "status": "pending" },
    "phase_5": { "status": "pending" }
  },
  "sub_sessions": {
    "debug_session": "DBG-...",
    "test_session": "WFS-test-..."
  },
  "artifacts": {
    "debug_understanding": "...",
    "test_results": "...",
    "fusion_analysis": "..."
  }
}
```

---

## Mode Selection Logic

### Auto Mode Recommendation

When user doesn't specify `--mode`, recommend based on input analysis:

```javascript
function recommendMode(bugDescription) {
  const indicators = {
    cli_signals: [
      /quick|fast|simple|immediate/,
      /recommendation|suggest|advice/,
      /just need|only want|quick look/,
      /straightforward|obvious|clear/
    ],
    debug_signals: [
      /unclear|don't know|maybe|uncertain|why/,
      /error|crash|fail|exception|stack trace/,
      /execution flow|code path|how does/
    ],
    test_signals: [
      /test|coverage|verify|pass|fail/,
      /implementation|implemented|complete/,
      /case|scenario|should/
    ],
    complex_signals: [
      /multiple|all|system|integration/,
      /module|subsystem|network|distributed/,
      /concurrent|async|race/
    ]
  }

  let score = { cli: 0, debug: 0, test: 0, bidirectional: 0 }

  // CLI signals (lightweight preference)
  for (const pattern of indicators.cli_signals) {
    if (pattern.test(bugDescription)) score.cli += 3
  }

  // Debug signals
  for (const pattern of indicators.debug_signals) {
    if (pattern.test(bugDescription)) score.debug += 2
  }

  // Test signals
  for (const pattern of indicators.test_signals) {
    if (pattern.test(bugDescription)) score.test += 2
  }

  // Complex signals (prefer bidirectional for complex issues)
  for (const pattern of indicators.complex_signals) {
    if (pattern.test(bugDescription)) {
      score.bidirectional += 3
      score.cli -= 2  // Complex issues not suitable for CLI quick
    }
  }

  // If description is short and has clear error, prefer CLI
  if (bugDescription.length < 100 && /error|fail|crash/.test(bugDescription)) {
    score.cli += 2
  }

  // Return highest scoring mode
  return Object.entries(score).sort((a, b) => b[1] - a[1])[0][0]
}
```

---

## Best Practices

### When to Use Each Mode

| Issue Characteristic | Recommended Mode | Rationale |
|----------------------|-----------------|-----------|
| Simple error, clear symptoms | CLI Quick | Fastest recommendation |
| Incomplete error info, requires exploration | Debug First | Deep diagnostic capability |
| Code complete, needs test coverage | Test First | Automated iterative fixes |
| Cross-module issue, ambiguous symptoms | Bidirectional | Multi-angle insights |
| Production failure, needs immediate guidance | CLI Quick + --yes | Fastest guidance, optional escalation |
| Production failure, needs safe fix | Debug First + --hotfix | Minimal diagnosis time |
| Want to understand why it failed | Debug First | Records understanding evolution |
| Want to ensure all scenarios pass | Test First | Complete coverage-driven |

### Performance Tips

- **CLI Quick**: 2-5 minutes, no file I/O, recommendation-only
- **Debug First**: Usually requires manual issue reproduction (after logging added), then 15-30 min
- **Test First**: Fully automated, 20-45 min depending on test suite size
- **Bidirectional**: Most comprehensive but slowest (parallel workflows), 30-60 min

### Workflow Continuity

- **CLI Quick**: Can escalate to debug/test/apply fix based on user decision
- **Debug First**: Auto-launches test generation and execution after completion
- **Test First**: With high failure rates suggests switching to debug mode for root cause
- **Bidirectional**: Always executes complete flow

---

## Follow-up Expansion

After completion, offer to expand to issues:

```
## Done! What's next?

- [ ] Create Test issue (improve test coverage)
- [ ] Create Enhancement issue (optimize code quality)
- [ ] Create Refactor issue (improve architecture)
- [ ] Create Documentation issue (record learnings)
- [ ] Don't create any issue, end workflow
```

Selected items call: `/issue:new "{issue summary} - {dimension}"`

---

## Error Handling

| Error | CLI Quick | Debug First | Test First | Bidirectional |
|-------|-----------|-------------|-----------|---------------|
| Session creation failed | N/A (no session) | Retry → abort | Retry → abort | Retry → abort |
| CLI analysis failed | Retry with fallback tool → manual | N/A | N/A | N/A |
| Diagnosis/test failed | N/A | Continue with partial results | Direct failure | Use alternate workflow results |
| Low confidence result | Ask escalate or review | N/A | N/A | N/A |
| Merge conflicts | N/A | N/A | N/A | Select highest confidence plan |
| Fix application failed | Report error, no auto-retry | Request manual fix | Mark failed, request intervention | Try alternative plan |

---

## Relationship with ccw Command

| Feature | ccw | ccw-debug |
|---------|-----|----------|
| **Design** | General workflow orchestration | Debug + test aggregation |
| **Intent Detection** | ✅ Detects task type | ✅ Detects issue type |
| **Automation** | ✅ Auto-selects workflow | ✅ Auto-selects mode |
| **Quick Mode** | ❌ None | ✅ CLI Quick (2-5 min) |
| **Parallel Execution** | ❌ Sequential | ✅ Bidirectional mode parallel |
| **Fusion Analysis** | ❌ None | ✅ Bidirectional mode fusion |
| **Workflow Scope** | Broad (feature/bugfix/tdd/ui etc.) | Deep focus (debug + test) |
| **CLI Integration** | Yes | Yes (4 levels: quick/deep/iterative/fusion) |

---

## Usage Recommendations

1. **First Time**: Use default mode (debug-first), observe workflow
2. **Quick Decision**: Use CLI Quick (--mode cli) for immediate recommendations
3. **Quick Fix**: Use `--hotfix --yes` for minimal diagnostics (debug mode)
4. **Learning**: Use debug-first, read `understanding.md`
5. **Complete Validation**: Use bidirectional for multi-dimensional insights
6. **Auto Repair**: Use test-first for automatic iteration
7. **Escalation**: Start with CLI Quick, escalate to other modes as needed

---

## Reference

### Related Commands

- `ccw cli` - Direct CLI analysis (used by CLI Quick mode)
- `/workflow:debug-with-file` - Deep debug diagnostics
- `/workflow:test-fix-gen` - Test generation
- `/workflow:test-cycle-execute` - Test execution
- `/workflow:lite-fix` - Lightweight fix
- `/ccw` - General workflow orchestration

### Configuration Files

- `~/.claude/cli-tools.json` - CLI tool configuration (Gemini/Qwen/Codex)
- `.workflow/project-tech.json` - Project technology stack
- `.workflow/project-guidelines.json` - Project conventions

### CLI Tool Fallback Chain (for CLI Quick mode)

When CLI analysis fails, fallback order:
1. **Gemini** (primary): `gemini-2.5-pro`
2. **Qwen** (fallback): `coder-model`
3. **Codex** (fallback): `gpt-5.2`

---

## Summary: Mode Selection Decision Tree

```
User calls: /ccw-debug <bug_description>

┌─ Explicit --mode specified?
│  ├─ YES → Use specified mode
│  │         ├─ cli → 2-5 min analysis, optionally escalate
│  │         ├─ debug → Full debug-with-file workflow
│  │         ├─ test → Test-first workflow
│  │         └─ bidirectional → Parallel debug + test
│  │
│  └─ NO → Auto-recommend based on bug description
│          ├─ Keywords: "quick", "fast", "simple" → CLI Quick
│          ├─ Keywords: "error", "crash", "exception" → Debug First (or CLI if simple)
│          ├─ Keywords: "test", "verify", "coverage" → Test First
│          └─ Keywords: "multiple", "system", "distributed" → Bidirectional
│
├─ Check --yes flag
│  ├─ YES → Auto-confirm all decisions
│  │         ├─ CLI mode: Auto-apply if confidence High
│  │         └─ Others: Auto-select default options
│  │
│  └─ NO → Interactive mode, ask user for confirmations
│
├─ Check --hotfix flag (debug mode only)
│  ├─ YES → Minimal diagnostics, fast fix
│  └─ NO → Full analysis
│
└─ Execute selected mode workflow
   └─ Return results or escalation options
```
