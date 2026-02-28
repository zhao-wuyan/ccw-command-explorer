# Phase 4: Iterative Deep-Dive

> Source: Shared from `commands/workflow/review-session-cycle.md` + `commands/workflow/review-module-cycle.md` Phase 4

## Overview

Perform focused root cause analysis on critical findings. Select up to 5 findings per iteration, launch deep-dive agents, re-assess severity, and loop back to aggregation if needed.

## Prerequisites

- Phase 3 determined shouldIterate = true
- Available: severityDistribution, criticalFiles, deepDiveFindings

## Execution Steps

### Step 4.1: Check Iteration Limit

- Check `current_iteration` < `max_iterations` (default 3)
- If exceeded: Log iteration limit reached, skip to Phase 5
- Default iterations: 1 (deep-dive runs once; use --max-iterations=0 to skip entirely)

### Step 4.2: Select Findings for Deep-Dive

**Deep-Dive Selection Criteria**:
- All critical severity findings (priority 1)
- Top 3 high-severity findings in critical files (priority 2)
- Max 5 findings per iteration (prevent overwhelm)

**Selection algorithm**:
1. Collect all findings with severity = critical -> add to selection
2. If selection < 5: add high-severity findings from critical files (files in 3+ dimensions), sorted by dimension count descending
3. Cap at 5 total findings

### Step 4.3: Launch Deep-Dive Agents

- Spawn cli-explore-agent for each selected finding
- Use Dependency Map + Deep Scan mode
- Each agent runs independently (can be launched in parallel)
- Tool priority: gemini -> qwen -> codex (fallback on error/timeout)
- Lifecycle: spawn_agent → batch wait → close_agent

### Step 4.4: Collect Results

- Parse iteration JSON files from `{outputDir}/iterations/iteration-{N}-finding-{uuid}.json`
- Extract reassessed severities from each result
- Collect remediation plans and impact assessments
- Handle agent failures gracefully (log warning, mark finding as unanalyzed)

### Step 4.5: Re-Aggregate

- Update severity distribution based on reassessments
- Record iteration in review-state.json `iterations[]` array:

```json
{
  "iteration": 1,
  "findings_analyzed": ["uuid-1", "uuid-2"],
  "findings_resolved": 1,
  "findings_escalated": 1,
  "severity_change": {
    "before": {"critical": 2, "high": 5, "medium": 12, "low": 8},
    "after": {"critical": 1, "high": 6, "medium": 12, "low": 8}
  },
  "timestamp": "2025-01-25T14:30:00Z"
}
```

- Increment `current_iteration` in review-state.json
- Re-evaluate decision logic: Iterate if critical > 0 OR high > 5 OR critical files exist
- Loop back to Phase 3 aggregation check if conditions still met

## Deep-Dive Agent Invocation Template

### Module Mode

```javascript
// Step 1: Spawn deep-dive agents in parallel
const deepDiveAgents = [];

selectedFindings.forEach(finding => {
  const agentId = spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/cli-explore-agent.md (MUST read first)
2. Read original finding: ${dimensionJsonPath}
3. Read affected file: ${finding.file}
4. Identify related code: bash(grep -r "import.*${basename(finding.file)}" ${projectDir}/src --include="*.ts")
5. Read test files: bash(find ${projectDir}/tests -name "*${basename(finding.file, '.ts')}*" -type f)
6. Execute: cat ~/.ccw/workflows/cli-templates/schemas/review-deep-dive-results-schema.json (get output schema reference)
7. Read: ${projectRoot}/.workflow/project-tech.json (technology stack and architecture context)
8. Read: ${projectRoot}/.workflow/specs/*.md (user-defined constraints for remediation compliance)

---

## Task Objective
Perform focused root cause analysis using Dependency Map mode (for impact analysis) + Deep Scan mode (for semantic understanding) to generate comprehensive remediation plan for critical ${finding.dimension} issue

## Analysis Mode Selection
Use **Dependency Map mode** first to understand dependencies:
- Build dependency graph around ${finding.file} to identify affected components
- Detect circular dependencies or tight coupling related to this finding
- Calculate change risk scores for remediation impact

Then apply **Deep Scan mode** for semantic analysis:
- Understand design intent and architectural context
- Identify non-standard patterns or implicit dependencies
- Extract remediation insights from code structure

## Finding Context
- Finding ID: ${finding.id}
- Original Dimension: ${finding.dimension}
- Title: ${finding.title}
- File: ${finding.file}:${finding.line}
- Severity: ${finding.severity}
- Category: ${finding.category}
- Original Description: ${finding.description}
- Iteration: ${iteration}

## CLI Configuration
- Tool Priority: gemini → qwen → codex
- Template: ~/.ccw/workflows/cli-templates/prompts/analysis/01-diagnose-bug-root-cause.txt
- Mode: analysis (READ-ONLY)

## Expected Deliverables

**Schema Reference**: Schema obtained in MANDATORY FIRST STEPS step 6, follow schema exactly

1. Deep-Dive Results JSON: ${outputDir}/iterations/iteration-${iteration}-finding-${finding.id}.json

   **⚠️ CRITICAL JSON STRUCTURE REQUIREMENTS**:

   Root structure MUST be array: \`[{ ... }]\` NOT \`{ ... }\`

   Required top-level fields:
   - finding_id, dimension, iteration, analysis_timestamp
   - cli_tool_used, model, analysis_duration_ms
   - original_finding, root_cause, remediation_plan
   - impact_assessment, reassessed_severity, confidence_score, cross_references

   All nested objects must follow schema exactly - read schema for field names

2. Analysis Report: ${outputDir}/reports/deep-dive-${iteration}-${finding.id}.md
   - Detailed root cause analysis
   - Step-by-step remediation plan
   - Impact assessment and rollback strategy

## Success Criteria
- [ ] Schema obtained via cat review-deep-dive-results-schema.json
- [ ] Root cause clearly identified with supporting evidence
- [ ] Remediation plan is step-by-step actionable with exact file:line references
- [ ] Each step includes specific commands and validation tests
- [ ] Impact fully assessed (files, tests, breaking changes, dependencies)
- [ ] Severity re-evaluation justified with evidence
- [ ] Confidence score accurately reflects certainty of analysis
- [ ] JSON output follows schema exactly
- [ ] References include project-specific and external documentation
`
  });

  deepDiveAgents.push(agentId);
});

// Step 2: Batch wait for all deep-dive agents
const deepDiveResults = wait({
  ids: deepDiveAgents,
  timeout_ms: 2400000  // 40 minutes
});

// Step 3: Collect results
deepDiveAgents.forEach((agentId, index) => {
  const finding = selectedFindings[index];
  if (deepDiveResults.status[agentId].completed) {
    console.log(`Deep-dive completed for ${finding.id}`);
  } else {
    console.log(`Deep-dive failed/timed out for ${finding.id}`);
  }
});

// Step 4: Cleanup all agents
deepDiveAgents.forEach(id => close_agent({ id }));
```

### Session Mode

```javascript
// Step 1: Spawn deep-dive agents in parallel
const deepDiveAgents = [];

selectedFindings.forEach(finding => {
  const agentId = spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/cli-explore-agent.md (MUST read first)
2. Read original finding: ${dimensionJsonPath}
3. Read affected file: ${finding.file}
4. Identify related code: bash(grep -r "import.*${basename(finding.file)}" ${workflowDir}/src --include="*.ts")
5. Read test files: bash(find ${workflowDir}/tests -name "*${basename(finding.file, '.ts')}*" -type f)
6. Execute: cat ~/.ccw/workflows/cli-templates/schemas/review-deep-dive-results-schema.json (get output schema reference)
7. Read: ${projectRoot}/.workflow/project-tech.json (technology stack and architecture context)
8. Read: ${projectRoot}/.workflow/specs/*.md (user-defined constraints for remediation compliance)

---

## Task Objective
Perform focused root cause analysis using Dependency Map mode (for impact analysis) + Deep Scan mode (for semantic understanding) to generate comprehensive remediation plan for critical ${finding.dimension} issue

## Analysis Mode Selection
Use **Dependency Map mode** first to understand dependencies:
- Build dependency graph around ${finding.file} to identify affected components
- Detect circular dependencies or tight coupling related to this finding
- Calculate change risk scores for remediation impact

Then apply **Deep Scan mode** for semantic analysis:
- Understand design intent and architectural context
- Identify non-standard patterns or implicit dependencies
- Extract remediation insights from code structure

## Finding Context
- Finding ID: ${finding.id}
- Original Dimension: ${finding.dimension}
- Title: ${finding.title}
- File: ${finding.file}:${finding.line}
- Severity: ${finding.severity}
- Category: ${finding.category}
- Original Description: ${finding.description}
- Iteration: ${iteration}

## CLI Configuration
- Tool Priority: gemini → qwen → codex
- Template: ~/.ccw/workflows/cli-templates/prompts/analysis/01-diagnose-bug-root-cause.txt
- Timeout: 2400000ms (40 minutes)
- Mode: analysis (READ-ONLY)

## Expected Deliverables

**Schema Reference**: Schema obtained in MANDATORY FIRST STEPS step 6, follow schema exactly

1. Deep-Dive Results JSON: ${outputDir}/iterations/iteration-${iteration}-finding-${finding.id}.json

   **⚠️ CRITICAL JSON STRUCTURE REQUIREMENTS**:

   Root structure MUST be array: \`[{ ... }]\` NOT \`{ ... }\`

   Required top-level fields:
   - finding_id, dimension, iteration, analysis_timestamp
   - cli_tool_used, model, analysis_duration_ms
   - original_finding, root_cause, remediation_plan
   - impact_assessment, reassessed_severity, confidence_score, cross_references

   All nested objects must follow schema exactly - read schema for field names

2. Analysis Report: ${outputDir}/reports/deep-dive-${iteration}-${finding.id}.md
   - Detailed root cause analysis
   - Step-by-step remediation plan
   - Impact assessment and rollback strategy

## Success Criteria
- [ ] Schema obtained via cat review-deep-dive-results-schema.json
- [ ] Root cause clearly identified with supporting evidence
- [ ] Remediation plan is step-by-step actionable with exact file:line references
- [ ] Each step includes specific commands and validation tests
- [ ] Impact fully assessed (files, tests, breaking changes, dependencies)
- [ ] Severity re-evaluation justified with evidence
- [ ] Confidence score accurately reflects certainty of analysis
- [ ] JSON output follows schema exactly
- [ ] References include project-specific and external documentation
`
  });

  deepDiveAgents.push(agentId);
});

// Step 2: Batch wait for all deep-dive agents
const deepDiveResults = wait({
  ids: deepDiveAgents,
  timeout_ms: 2400000  // 40 minutes
});

// Step 3: Collect results
deepDiveAgents.forEach((agentId, index) => {
  const finding = selectedFindings[index];
  if (deepDiveResults.status[agentId].completed) {
    console.log(`Deep-dive completed for ${finding.id}`);
  } else {
    console.log(`Deep-dive failed/timed out for ${finding.id}`);
  }
});

// Step 4: Cleanup all agents
deepDiveAgents.forEach(id => close_agent({ id }));
```

## Key Differences Between Modes

| Aspect | Module Mode | Session Mode |
|--------|-------------|--------------|
| MANDATORY STEP 4 | `${projectDir}/src` | `${workflowDir}/src` |
| MANDATORY STEP 5 | `${projectDir}/tests` | `${workflowDir}/tests` |
| CLI Timeout | (not specified) | 2400000ms (40 minutes) |

## Iteration Control

**Phase 4 Orchestrator Responsibilities**:
- Check iteration count < max_iterations (default 3)
- Spawn deep-dive agents for selected findings
- Collect remediation plans and re-assessed severities
- Update severity distribution based on re-assessments
- Record iteration in review-state.json
- Loop back to aggregation if still have critical/high findings

**Termination Conditions** (any one stops iteration):
1. `current_iteration` >= `max_iterations`
2. No critical findings remaining AND high findings <= 5 AND no critical files
3. No findings selected for deep-dive (all resolved or downgraded)

**State Updates Per Iteration**:
- `review-state.json`: Increment `current_iteration`, append to `iterations[]`, update `severity_distribution`, set `next_action`
- `review-progress.json`: Update `deep_dive.analyzed` count, `deep_dive.percent_complete`, `phase`

## Output

- Files: `iterations/iteration-{N}-finding-{uuid}.json`, `reports/deep-dive-{N}-{uuid}.md`
- State: review-state.json `iterations[]` updated
- Decision: Re-enter Phase 3 aggregation or proceed to Phase 5

## Next Phase

- If still has critical findings AND iterations < max: Loop to [Phase 3: Aggregation](03-aggregation.md)
- Else: [Phase 5: Review Completion](05-review-completion.md)
