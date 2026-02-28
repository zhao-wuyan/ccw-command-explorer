# Phase 5: Review Completion

> Source: Shared from `commands/workflow/review-session-cycle.md` + `commands/workflow/review-module-cycle.md` Phase 5

## Overview

Finalize review state, generate completion statistics, and optionally prompt for automated fix pipeline.

## Execution Steps

### Step 5.1: Finalize State

**Phase 5 Orchestrator Responsibilities**:
- Finalize review-progress.json with completion statistics
- Update review-state.json with completion_time and phase=complete
- Progress tracking: Mark all tasks done

**review-state.json updates**:
```json
{
  "phase": "complete",
  "completion_time": "2025-01-25T15:00:00Z",
  "next_action": "none"
}
```

**review-progress.json updates**:
```json
{
  "phase": "complete",
  "overall_percent": 100,
  "completion_time": "2025-01-25T15:00:00Z",
  "final_severity_distribution": {
    "critical": 0,
    "high": 3,
    "medium": 12,
    "low": 8
  }
}
```

### Step 5.2: Evaluate Completion Status

**Full Success**:
- All dimensions reviewed
- Critical findings = 0
- High findings <= 5
- Action: Generate final report, mark phase=complete

**Partial Success**:
- All dimensions reviewed
- Max iterations reached
- Still have critical/high findings
- Action: Generate report with warnings, recommend follow-up

### Step 5.3: Progress Tracking Completion

Update progress tracking to reflect all phases completed:
```
Phase 1: Discovery & Initialization     → completed
Phase 2: Parallel Reviews (7 dimensions) → completed
  → Security review                      → completed
  → Architecture review                  → completed
  → Quality review                       → completed
  ... other dimensions as sub-items
Phase 3: Aggregation                     → completed
Phase 4: Deep-dive                       → completed
Phase 5: Completion                      → completed
```

### Step 5.4: Fix Pipeline Prompt

- Ask user: "Run automated fixes on findings? [Y/n]"
- If confirmed AND --fix flag: Continue to Phase 6
- Display summary of findings by severity:

```
Review Complete - Summary:
  Critical: 0  High: 3  Medium: 12  Low: 8
  Total findings: 23
  Dimensions reviewed: 7/7
  Iterations completed: 2/3

Run automated fixes on findings? [Y/n]
```

## Completion Conditions

**Full Success**:
- All dimensions reviewed
- Critical findings = 0
- High findings <= 5
- Action: Generate final report, mark phase=complete

**Partial Success**:
- All dimensions reviewed
- Max iterations reached
- Still have critical/high findings
- Action: Generate report with warnings, recommend follow-up

## Error Handling Reference

### Phase-Level Error Matrix

| Phase | Error | Blocking? | Action |
|-------|-------|-----------|--------|
| Phase 1 | Invalid path pattern / Session not found | Yes | Error and exit |
| Phase 1 | No files matched / No completed tasks | Yes | Error and exit |
| Phase 1 | Files not readable / No changed files | Yes | Error and exit |
| Phase 2 | Single dimension fails | No | Log warning, continue other dimensions |
| Phase 2 | All dimensions fail | Yes | Error and exit |
| Phase 3 | Missing dimension JSON | No | Skip in aggregation, log warning |
| Phase 4 | Deep-dive agent fails | No | Skip finding, continue others |
| Phase 4 | Max iterations reached | No | Generate partial report |

### CLI Fallback Chain

Gemini -> Qwen -> Codex -> degraded mode

### Fallback Triggers

1. HTTP 429, 5xx errors, connection timeout
2. Invalid JSON output (parse error, missing required fields)
3. Low confidence score < 0.4
4. Analysis too brief (< 100 words in report)

### Fallback Behavior

- On trigger: Retry with next tool in chain
- After Codex fails: Enter degraded mode (skip analysis, log error)
- Degraded mode: Continue workflow with available results

## Best Practices

1. **Start Specific**: Begin with focused module patterns for faster results
2. **Expand Gradually**: Add more modules based on initial findings
3. **Use Glob Wisely**: `src/auth/**` is more efficient than `src/**` with lots of irrelevant files
4. **Trust Aggregation Logic**: Auto-selection based on proven heuristics
5. **Monitor Logs**: Check reports/ directory for CLI analysis insights

## Related Commands

### View Review Progress

Use `ccw view` to open the review dashboard in browser:

```bash
ccw view
```

### Automated Fix Workflow

After completing a review, use the generated findings JSON for automated fixing:

```bash
# Step 1: Complete review (this skill)
review-cycle src/auth/**
# OR
review-cycle

# Step 2: Run automated fixes using dimension findings
review-cycle --fix ${projectRoot}/.workflow/active/WFS-{session-id}/.review/
```

## Output

- State: review-state.json (phase=complete), review-progress.json (final)
- Decision: fix pipeline or end

## Next Phase

- If fix requested: [Phase 6: Fix Discovery & Batching](06-fix-discovery-batching.md)
- Else: Workflow complete
