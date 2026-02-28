# Phase 8: Fix Execution

> Source: `commands/workflow/review-cycle-fix.md` Phase 3

## Overview
Stage-based execution using aggregated fix-plan.json timeline. Each group gets a cli-execute-agent that applies fixes, runs tests, and commits on success or rolls back on failure.

## Conservative Test Verification

**Test Strategy** (per fix):

```javascript
// 1. Identify affected tests
const testPattern = identifyTestPattern(finding.file);
// e.g., "tests/auth/**/*.test.*" for src/auth/service.ts

// 2. Run tests
const result = await runTests(testPattern);

// 3. Evaluate
if (result.passRate < 100%) {
  // Rollback
  await gitCheckout(finding.file);

  // Retry with failure context
  if (attempts < maxIterations) {
    const fixContext = analyzeFailure(result.stderr);
    regenerateFix(finding, fixContext);
    retry();
  } else {
    markFailed(finding.id);
  }
} else {
  // Commit
  await gitCommit(`Fix: ${finding.title} [${finding.id}]`);
  markFixed(finding.id);
}
```

**Pass Criteria**: 100% test pass rate (no partial fixes)

## Phase 3: Execution Orchestration (Orchestrator)

- Load fix-plan.json timeline stages
- For each stage:
  - If parallel mode: Spawn all group agents, batch wait
  - If serial mode: Spawn groups sequentially with wait between each
  - Assign agent IDs (agents update their fix-progress-{N}.json)
- Handle agent failures gracefully (mark group as failed, continue)
- Advance to next stage only when current stage complete
- Lifecycle: spawn_agent → wait → close_agent per group/batch

## Execution Agent Template (Per Group)

```javascript
// Spawn execution agent for a group
const execAgentId = spawn_agent({
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/cli-execution-agent.md (MUST read first)
2. Execute: ccw spec load --category execution

---

## Task Objective
Execute fixes for code review findings in group ${group.group_id}. Update progress file in real-time with flow control tracking.

## Assignment
- Group ID: ${group.group_id}
- Group Name: ${group.group_name}
- Progress File: ${sessionDir}/${group.progress_file}
- Findings Count: ${group.findings.length}
- Max Iterations: ${maxIterations} (per finding)

## Fix Strategy
${JSON.stringify(group.fix_strategy, null, 2)}

## Risk Assessment
${JSON.stringify(group.risk_assessment, null, 2)}

## Execution Flow

### Initialization (Before Starting)

1. Read ${group.progress_file} to load initial state
2. Update progress file:
   - assigned_agent: "${agentId}"
   - status: "in-progress"
   - started_at: Current ISO 8601 timestamp
   - last_update: Current ISO 8601 timestamp
3. Write updated state back to ${group.progress_file}

### Main Execution Loop

For EACH finding in ${group.progress_file}.findings:

#### Step 1: Analyze Context

**Before Step**:
- Update finding: status→"in-progress", started_at→now()
- Update current_finding: Populate with finding details, status→"analyzing", action→"Reading file and understanding code structure"
- Update phase→"analyzing"
- Update flow_control: Add "analyze_context" step to implementation_approach (status→"in-progress"), set current_step→"analyze_context"
- Update last_update→now(), write to ${group.progress_file}

**Action**:
- Read file: finding.file
- Understand code structure around line: finding.line
- Analyze surrounding context (imports, dependencies, related functions)
- Review recommendations: finding.recommendations

**After Step**:
- Update flow_control: Mark "analyze_context" step as "completed" with completed_at→now()
- Update last_update→now(), write to ${group.progress_file}

#### Step 2: Apply Fix

**Before Step**:
- Update current_finding: status→"fixing", action→"Applying code changes per recommendations"
- Update phase→"fixing"
- Update flow_control: Add "apply_fix" step to implementation_approach (status→"in-progress"), set current_step→"apply_fix"
- Update last_update→now(), write to ${group.progress_file}

**Action**:
- Use Edit tool to implement code changes per finding.recommendations
- Follow fix_strategy.approach
- Maintain code style and existing patterns

**After Step**:
- Update flow_control: Mark "apply_fix" step as "completed" with completed_at→now()
- Update last_update→now(), write to ${group.progress_file}

#### Step 3: Test Verification

**Before Step**:
- Update current_finding: status→"testing", action→"Running test suite to verify fix"
- Update phase→"testing"
- Update flow_control: Add "run_tests" step to implementation_approach (status→"in-progress"), set current_step→"run_tests"
- Update last_update→now(), write to ${group.progress_file}

**Action**:
- Run tests using fix_strategy.test_pattern
- Require 100% pass rate
- Capture test output

**On Test Failure**:
- Git rollback: \`git checkout -- \${finding.file}\`
- Increment finding.attempts
- Update flow_control: Mark "run_tests" step as "failed" with completed_at→now()
- Update errors: Add entry (finding_id, error_type→"test_failure", message, timestamp)
- If finding.attempts < ${maxIterations}:
  - Reset flow_control: implementation_approach→[], current_step→null
  - Retry from Step 1
- Else:
  - Update finding: status→"completed", result→"failed", error_message→"Max iterations reached", completed_at→now()
  - Update summary counts, move to next finding

**On Test Success**:
- Update flow_control: Mark "run_tests" step as "completed" with completed_at→now()
- Update last_update→now(), write to ${group.progress_file}
- Proceed to Step 4

#### Step 4: Commit Changes

**Before Step**:
- Update current_finding: status→"committing", action→"Creating git commit for successful fix"
- Update phase→"committing"
- Update flow_control: Add "commit_changes" step to implementation_approach (status→"in-progress"), set current_step→"commit_changes"
- Update last_update→now(), write to ${group.progress_file}

**Action**:
- Git commit: \`git commit -m "fix(${finding.dimension}): ${finding.title} [${finding.id}]"\`
- Capture commit hash

**After Step**:
- Update finding: status→"completed", result→"fixed", commit_hash→<captured>, test_passed→true, completed_at→now()
- Update flow_control: Mark "commit_changes" step as "completed" with completed_at→now()
- Update last_update→now(), write to ${group.progress_file}

#### After Each Finding

- Update summary: Recalculate counts (pending/in_progress/fixed/failed) and percent_complete
- If all findings completed: Clear current_finding, reset flow_control
- Update last_update→now(), write to ${group.progress_file}

### Final Completion

When all findings processed:
- Update status→"completed", phase→"done", summary.percent_complete→100.0
- Update last_update→now(), write final state to ${group.progress_file}

## Critical Requirements

### Progress File Updates
- **MUST update after every significant action** (before/after each step)
- **Always maintain complete structure** - never write partial updates
- **Use ISO 8601 timestamps** - e.g., "2025-01-25T14:36:00Z"

### Flow Control Format
Follow action-planning-agent flow_control.implementation_approach format:
- step: Identifier (e.g., "analyze_context", "apply_fix")
- action: Human-readable description
- status: "pending" | "in-progress" | "completed" | "failed"
- started_at: ISO 8601 timestamp or null
- completed_at: ISO 8601 timestamp or null

### Error Handling
- Capture all errors in errors[] array
- Never leave progress file in invalid state
- Always write complete updates, never partial
- On unrecoverable error: Mark group as failed, preserve state

## Test Patterns
Use fix_strategy.test_pattern to run affected tests:
- Pattern: ${group.fix_strategy.test_pattern}
- Command: Infer from project (npm test, pytest, etc.)
- Pass Criteria: 100% pass rate required
`
});

// Wait for completion
const execResult = wait({
  ids: [execAgentId],
  timeout_ms: 1200000  // 20 minutes per group
});

// Cleanup
close_agent({ id: execAgentId });
```

## Output
- Files: fix-progress-{N}.json (updated per group), git commits
- Progress: Mark Phase 8 completed, Phase 9 in_progress

## Next Phase
Return to orchestrator, then auto-continue to [Phase 9: Fix Completion](09-fix-completion.md).
