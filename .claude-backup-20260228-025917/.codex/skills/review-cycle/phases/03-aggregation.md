# Phase 3: Aggregation

> Source: Shared from `commands/workflow/review-session-cycle.md` + `commands/workflow/review-module-cycle.md` Phase 3

## Overview

Load all dimension results, calculate severity distribution, identify cross-cutting concerns, and decide whether to enter iterative deep-dive (Phase 4) or proceed to completion (Phase 5).

## Execution Steps

### Step 3.1: Load Dimension Results

- Load all dimension JSON files from `{outputDir}/dimensions/`
- Parse each file following review-dimension-results-schema.json
- Handle missing files gracefully (log warning, skip)

### Step 3.2: Calculate Severity Distribution

- Count findings by severity level: critical, high, medium, low
- Store in review-state.json `severity_distribution` field

### Step 3.3: Cross-Cutting Concern Detection

**Cross-Cutting Concern Detection**:
1. Files appearing in 3+ dimensions = **Critical Files**
2. Same issue pattern across dimensions = **Systemic Issue**
3. Severity clustering in specific files = **Hotspots**

### Step 3.4: Deep-Dive Selection

**Deep-Dive Selection Criteria**:
- All critical severity findings (priority 1)
- Top 3 high-severity findings in critical files (priority 2)
- Max 5 findings per iteration (prevent overwhelm)

### Step 3.5: Decision Logic

**Iteration Trigger**:
- Critical findings > 0 OR
- High findings > 5 OR
- Critical files count > 0

If any trigger condition is met, proceed to Phase 4 (Iterative Deep-Dive). Otherwise, skip to Phase 5 (Completion).

### Step 3.6: Update State

- Update review-state.json with aggregation results
- Update review-progress.json

**Phase 3 Orchestrator Responsibilities**:
- Load all dimension JSON files from dimensions/
- Calculate severity distribution: Count by critical/high/medium/low
- Identify cross-cutting concerns: Files in 3+ dimensions
- Select deep-dive findings: Critical + high in critical files (max 5)
- Decision logic: Iterate if critical > 0 OR high > 5 OR critical files exist
- Update review-state.json with aggregation results

## Severity Assessment Reference

**Severity Levels**:
- **Critical**: Security vulnerabilities, data corruption risks, system-wide failures, authentication/authorization bypass
- **High**: Feature degradation, performance bottlenecks, architecture violations, significant technical debt
- **Medium**: Code smells, minor performance issues, style inconsistencies, maintainability concerns
- **Low**: Documentation gaps, minor refactoring opportunities, cosmetic issues

## Output

- Variables: severityDistribution, criticalFiles, deepDiveFindings, shouldIterate (boolean)
- State: review-state.json updated with aggregation results

## Next Phase

- If shouldIterate: [Phase 4: Iterative Deep-Dive](04-iterative-deep-dive.md)
- Else: [Phase 5: Review Completion](05-review-completion.md)
