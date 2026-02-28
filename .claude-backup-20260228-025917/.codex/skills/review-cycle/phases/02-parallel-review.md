# Phase 2: Parallel Review Coordination

> Source: Shared from `commands/workflow/review-session-cycle.md` + `commands/workflow/review-module-cycle.md` Phase 2

## Overview

Launch 7 dimension-specific review agents simultaneously using cli-explore-agent in Deep Scan mode.

## Review Dimensions Configuration

**7 Specialized Dimensions** with priority-based allocation:

| Dimension | Template | Priority | Timeout |
|-----------|----------|----------|---------|
| **Security** | 03-assess-security-risks.txt | 1 (Critical) | 60min |
| **Architecture** | 02-review-architecture.txt | 2 (High) | 60min |
| **Quality** | 02-review-code-quality.txt | 3 (Medium) | 40min |
| **Action-Items** | 02-analyze-code-patterns.txt | 2 (High) | 40min |
| **Performance** | 03-analyze-performance.txt | 3 (Medium) | 60min |
| **Maintainability** | 02-review-code-quality.txt* | 3 (Medium) | 40min |
| **Best-Practices** | 03-review-quality-standards.txt | 3 (Medium) | 40min |

*Custom focus: "Assess technical debt and maintainability"

**Category Definitions by Dimension**:

```javascript
const CATEGORIES = {
  security: ['injection', 'authentication', 'authorization', 'encryption', 'input-validation', 'access-control', 'data-exposure'],
  architecture: ['coupling', 'cohesion', 'layering', 'dependency', 'pattern-violation', 'scalability', 'separation-of-concerns'],
  quality: ['code-smell', 'duplication', 'complexity', 'naming', 'error-handling', 'testability', 'readability'],
  'action-items': ['requirement-coverage', 'acceptance-criteria', 'documentation', 'deployment-readiness', 'missing-functionality'],
  performance: ['n-plus-one', 'inefficient-query', 'memory-leak', 'blocking-operation', 'caching', 'resource-usage'],
  maintainability: ['technical-debt', 'magic-number', 'long-method', 'large-class', 'dead-code', 'commented-code'],
  'best-practices': ['convention-violation', 'anti-pattern', 'deprecated-api', 'missing-validation', 'inconsistent-style']
};
```

## Severity Assessment

**Severity Levels**:
- **Critical**: Security vulnerabilities, data corruption risks, system-wide failures, authentication/authorization bypass
- **High**: Feature degradation, performance bottlenecks, architecture violations, significant technical debt
- **Medium**: Code smells, minor performance issues, style inconsistencies, maintainability concerns
- **Low**: Documentation gaps, minor refactoring opportunities, cosmetic issues

**Iteration Trigger**:
- Critical findings > 0 OR
- High findings > 5 OR
- Critical files count > 0

## Orchestrator Responsibilities

- Spawn 7 @cli-explore-agent instances simultaneously (Deep Scan mode)
- Pass dimension-specific context (template, timeout, custom focus, **target files**)
- Monitor completion via review-progress.json updates
- Progress tracking: Mark dimensions as completed
- CLI tool fallback: Gemini → Qwen → Codex (on error/timeout)
- Lifecycle: spawn_agent → batch wait → close_agent for all 7 agents

## Agent Output Schemas

**Agent-produced JSON files follow standardized schemas**:

1. **Dimension Results** (cli-explore-agent output from parallel reviews)
   - Schema: `~/.ccw/workflows/cli-templates/schemas/review-dimension-results-schema.json`
   - Output: `{output-dir}/dimensions/{dimension}.json`
   - Contains: findings array, summary statistics, cross_references

2. **Deep-Dive Results** (cli-explore-agent output from iterations)
   - Schema: `~/.ccw/workflows/cli-templates/schemas/review-deep-dive-results-schema.json`
   - Output: `{output-dir}/iterations/iteration-{N}-finding-{uuid}.json`
   - Contains: root_cause, remediation_plan, impact_assessment, reassessed_severity

## Review Agent Invocation Template

### Module Mode

**Review Agent** (parallel execution, 7 instances):

```javascript
// Step 1: Spawn 7 agents in parallel
const reviewAgents = [];
const dimensions = ['security', 'architecture', 'quality', 'action-items', 'performance', 'maintainability', 'best-practices'];

dimensions.forEach(dimension => {
  const agentId = spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/cli-explore-agent.md (MUST read first)
2. Read review state: ${reviewStateJsonPath}
3. Get target files: Read resolved_files from review-state.json
4. Validate file access: bash(ls -la ${targetFiles.join(' ')})
5. Execute: cat ~/.ccw/workflows/cli-templates/schemas/review-dimension-results-schema.json (get output schema reference)
6. Execute: ccw spec load --category "exploration execution" (technology stack and constraints)

---

## Task Objective
Conduct comprehensive ${dimension} code exploration and analysis using Deep Scan mode (Bash + Gemini dual-source strategy) for specified module files

## Analysis Mode Selection
Use **Deep Scan mode** for this review:
- Phase 1: Bash structural scan for standard patterns (classes, functions, imports)
- Phase 2: Gemini semantic analysis for design intent, non-standard patterns, ${dimension}-specific concerns
- Phase 3: Synthesis with attribution (bash-discovered vs gemini-discovered findings)

## Review Context
- Review Type: module (independent)
- Review Dimension: ${dimension}
- Review ID: ${reviewId}
- Target Pattern: ${targetPattern}
- Resolved Files: ${resolvedFiles.length} files
- Output Directory: ${outputDir}

## CLI Configuration
- Tool Priority: gemini → qwen → codex (fallback chain)
- Custom Focus: ${customFocus || 'Standard dimension analysis'}
- Mode: analysis (READ-ONLY)
- Context Pattern: ${targetFiles.map(f => '@' + f).join(' ')}

## Expected Deliverables

**Schema Reference**: Schema obtained in MANDATORY FIRST STEPS step 5, follow schema exactly

1. Dimension Results JSON: ${outputDir}/dimensions/${dimension}.json

   **⚠️ CRITICAL JSON STRUCTURE REQUIREMENTS**:

   Root structure MUST be array: \`[{ ... }]\` NOT \`{ ... }\`

   Required top-level fields:
   - dimension, review_id, analysis_timestamp (NOT timestamp/analyzed_at)
   - cli_tool_used (gemini|qwen|codex), model, analysis_duration_ms
   - summary (FLAT structure), findings, cross_references

   Summary MUST be FLAT (NOT nested by_severity):
   \`{ "total_findings": N, "critical": N, "high": N, "medium": N, "low": N, "files_analyzed": N, "lines_reviewed": N }\`

   Finding required fields:
   - id: format \`{dim}-{seq}-{uuid8}\` e.g., \`sec-001-a1b2c3d4\` (lowercase)
   - severity: lowercase only (critical|high|medium|low)
   - snippet (NOT code_snippet), impact (NOT exploit_scenario)
   - metadata, iteration (0), status (pending_remediation), cross_references

2. Analysis Report: ${outputDir}/reports/${dimension}-analysis.md
   - Human-readable summary with recommendations
   - Grouped by severity: critical → high → medium → low
   - Include file:line references for all findings

3. CLI Output Log: ${outputDir}/reports/${dimension}-cli-output.txt
   - Raw CLI tool output for debugging
   - Include full analysis text

## Dimension-Specific Guidance
${getDimensionGuidance(dimension)}

## Success Criteria
- [ ] Schema obtained via cat review-dimension-results-schema.json
- [ ] All target files analyzed for ${dimension} concerns
- [ ] All findings include file:line references with code snippets
- [ ] Severity assessment follows established criteria (see reference)
- [ ] Recommendations are actionable with code examples
- [ ] JSON output follows schema exactly
- [ ] Report is comprehensive and well-organized
`
  });

  reviewAgents.push(agentId);
});

// Step 2: Batch wait for all 7 agents
const reviewResults = wait({
  ids: reviewAgents,
  timeout_ms: 3600000  // 60 minutes
});

// Step 3: Check results and handle timeouts
if (reviewResults.timed_out) {
  console.log('Some dimension reviews timed out, continuing with completed results');
}

reviewAgents.forEach((agentId, index) => {
  const dimension = dimensions[index];
  if (reviewResults.status[agentId].completed) {
    console.log(`${dimension} review completed`);
  } else {
    console.log(`${dimension} review failed or timed out`);
  }
});

// Step 4: Cleanup all agents
reviewAgents.forEach(id => close_agent({ id }));
```

### Session Mode

**Review Agent** (parallel execution, 7 instances):

```javascript
// Step 1: Spawn 7 agents in parallel
const reviewAgents = [];
const dimensions = ['security', 'architecture', 'quality', 'action-items', 'performance', 'maintainability', 'best-practices'];

dimensions.forEach(dimension => {
  const agentId = spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/cli-explore-agent.md (MUST read first)
2. Read session metadata: ${sessionMetadataPath}
3. Read completed task summaries: bash(find ${summariesDir} -name "IMPL-*.md" -type f)
4. Get changed files: bash(cd ${workflowDir} && git log --since="${sessionCreatedAt}" --name-only --pretty=format: | sort -u)
5. Read review state: ${reviewStateJsonPath}
6. Execute: cat ~/.ccw/workflows/cli-templates/schemas/review-dimension-results-schema.json (get output schema reference)
7. Execute: ccw spec load --category "exploration execution" (technology stack and constraints)

---

## Task Objective
Conduct comprehensive ${dimension} code exploration and analysis using Deep Scan mode (Bash + Gemini dual-source strategy) for completed implementation in session ${sessionId}

## Analysis Mode Selection
Use **Deep Scan mode** for this review:
- Phase 1: Bash structural scan for standard patterns (classes, functions, imports)
- Phase 2: Gemini semantic analysis for design intent, non-standard patterns, ${dimension}-specific concerns
- Phase 3: Synthesis with attribution (bash-discovered vs gemini-discovered findings)

## Session Context
- Session ID: ${sessionId}
- Review Dimension: ${dimension}
- Review ID: ${reviewId}
- Implementation Phase: Complete (all tests passing)
- Output Directory: ${outputDir}

## CLI Configuration
- Tool Priority: gemini → qwen → codex (fallback chain)
- Template: ~/.ccw/workflows/cli-templates/prompts/analysis/${dimensionTemplate}
- Custom Focus: ${customFocus || 'Standard dimension analysis'}
- Timeout: ${timeout}ms
- Mode: analysis (READ-ONLY)

## Expected Deliverables

**Schema Reference**: Schema obtained in MANDATORY FIRST STEPS step 6, follow schema exactly

1. Dimension Results JSON: ${outputDir}/dimensions/${dimension}.json

   **⚠️ CRITICAL JSON STRUCTURE REQUIREMENTS**:

   Root structure MUST be array: \`[{ ... }]\` NOT \`{ ... }\`

   Required top-level fields:
   - dimension, review_id, analysis_timestamp (NOT timestamp/analyzed_at)
   - cli_tool_used (gemini|qwen|codex), model, analysis_duration_ms
   - summary (FLAT structure), findings, cross_references

   Summary MUST be FLAT (NOT nested by_severity):
   \`{ "total_findings": N, "critical": N, "high": N, "medium": N, "low": N, "files_analyzed": N, "lines_reviewed": N }\`

   Finding required fields:
   - id: format \`{dim}-{seq}-{uuid8}\` e.g., \`sec-001-a1b2c3d4\` (lowercase)
   - severity: lowercase only (critical|high|medium|low)
   - snippet (NOT code_snippet), impact (NOT exploit_scenario)
   - metadata, iteration (0), status (pending_remediation), cross_references

2. Analysis Report: ${outputDir}/reports/${dimension}-analysis.md
   - Human-readable summary with recommendations
   - Grouped by severity: critical → high → medium → low
   - Include file:line references for all findings

3. CLI Output Log: ${outputDir}/reports/${dimension}-cli-output.txt
   - Raw CLI tool output for debugging
   - Include full analysis text

## Dimension-Specific Guidance
${getDimensionGuidance(dimension)}

## Success Criteria
- [ ] Schema obtained via cat review-dimension-results-schema.json
- [ ] All changed files analyzed for ${dimension} concerns
- [ ] All findings include file:line references with code snippets
- [ ] Severity assessment follows established criteria (see reference)
- [ ] Recommendations are actionable with code examples
- [ ] JSON output follows schema exactly
- [ ] Report is comprehensive and well-organized
`
  });

  reviewAgents.push(agentId);
});

// Step 2: Batch wait for all 7 agents
const reviewResults = wait({
  ids: reviewAgents,
  timeout_ms: 3600000  // 60 minutes
});

// Step 3: Check results and handle timeouts
if (reviewResults.timed_out) {
  console.log('Some dimension reviews timed out, continuing with completed results');
}

reviewAgents.forEach((agentId, index) => {
  const dimension = dimensions[index];
  if (reviewResults.status[agentId].completed) {
    console.log(`${dimension} review completed`);
  } else {
    console.log(`${dimension} review failed or timed out`);
  }
});

// Step 4: Cleanup all agents
reviewAgents.forEach(id => close_agent({ id }));
```

## Deep-Dive Agent Invocation Template

**Deep-Dive Agent** (iteration execution):

```javascript
// Spawn deep-dive agent
const deepDiveAgentId = spawn_agent({
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/cli-explore-agent.md (MUST read first)
2. Read original finding: ${dimensionJsonPath}
3. Read affected file: ${file}
4. Identify related code: bash(grep -r "import.*${basename(file)}" ${projectDir}/src --include="*.ts")
5. Read test files: bash(find ${projectDir}/tests -name "*${basename(file, '.ts')}*" -type f)
6. Execute: cat ~/.ccw/workflows/cli-templates/schemas/review-deep-dive-results-schema.json (get output schema reference)
7. Execute: ccw spec load --category "exploration execution" (technology stack and constraints for remediation)

---

## Task Objective
Perform focused root cause analysis using Dependency Map mode (for impact analysis) + Deep Scan mode (for semantic understanding) to generate comprehensive remediation plan for critical ${dimension} issue

## Analysis Mode Selection
Use **Dependency Map mode** first to understand dependencies:
- Build dependency graph around ${file} to identify affected components
- Detect circular dependencies or tight coupling related to this finding
- Calculate change risk scores for remediation impact

Then apply **Deep Scan mode** for semantic analysis:
- Understand design intent and architectural context
- Identify non-standard patterns or implicit dependencies
- Extract remediation insights from code structure

## Finding Context
- Finding ID: ${findingId}
- Original Dimension: ${dimension}
- Title: ${findingTitle}
- File: ${file}:${line}
- Severity: ${severity}
- Category: ${category}
- Original Description: ${description}
- Iteration: ${iteration}

## CLI Configuration
- Tool Priority: gemini → qwen → codex
- Template: ~/.ccw/workflows/cli-templates/prompts/analysis/01-diagnose-bug-root-cause.txt
- Mode: analysis (READ-ONLY)

## Expected Deliverables

**Schema Reference**: Schema obtained in MANDATORY FIRST STEPS step 6, follow schema exactly

1. Deep-Dive Results JSON: ${outputDir}/iterations/iteration-${iteration}-finding-${findingId}.json

   **⚠️ CRITICAL JSON STRUCTURE REQUIREMENTS**:

   Root structure MUST be array: \`[{ ... }]\` NOT \`{ ... }\`

   Required top-level fields:
   - finding_id, dimension, iteration, analysis_timestamp
   - cli_tool_used, model, analysis_duration_ms
   - original_finding, root_cause, remediation_plan
   - impact_assessment, reassessed_severity, confidence_score, cross_references

   All nested objects must follow schema exactly - read schema for field names

2. Analysis Report: ${outputDir}/reports/deep-dive-${iteration}-${findingId}.md
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

// Wait for completion
const deepDiveResult = wait({
  ids: [deepDiveAgentId],
  timeout_ms: 2400000  // 40 minutes
});

// Cleanup
close_agent({ id: deepDiveAgentId });
```

## Dimension Guidance Reference

```javascript
function getDimensionGuidance(dimension) {
  const guidance = {
    security: `
      Focus Areas:
      - Input validation and sanitization
      - Authentication and authorization mechanisms
      - Data encryption (at-rest and in-transit)
      - SQL/NoSQL injection vulnerabilities
      - XSS, CSRF, and other web vulnerabilities
      - Sensitive data exposure
      - Access control and privilege escalation

      Severity Criteria:
      - Critical: Authentication bypass, SQL injection, RCE, sensitive data exposure
      - High: Missing authorization checks, weak encryption, exposed secrets
      - Medium: Missing input validation, insecure defaults, weak password policies
      - Low: Security headers missing, verbose error messages, outdated dependencies
    `,
    architecture: `
      Focus Areas:
      - Layering and separation of concerns
      - Coupling and cohesion
      - Design pattern adherence
      - Dependency management
      - Scalability and extensibility
      - Module boundaries
      - API design consistency

      Severity Criteria:
      - Critical: Circular dependencies, god objects, tight coupling across layers
      - High: Violated architectural principles, scalability bottlenecks
      - Medium: Missing abstractions, inconsistent patterns, suboptimal design
      - Low: Minor coupling issues, documentation gaps, naming inconsistencies
    `,
    quality: `
      Focus Areas:
      - Code duplication
      - Complexity (cyclomatic, cognitive)
      - Naming conventions
      - Error handling patterns
      - Code readability
      - Comment quality
      - Dead code

      Severity Criteria:
      - Critical: Severe complexity (CC > 20), massive duplication (>50 lines)
      - High: High complexity (CC > 10), significant duplication, poor error handling
      - Medium: Moderate complexity (CC > 5), naming issues, code smells
      - Low: Minor duplication, documentation gaps, cosmetic issues
    `,
    'action-items': `
      Focus Areas:
      - Requirements coverage verification
      - Acceptance criteria met
      - Documentation completeness
      - Deployment readiness
      - Missing functionality
      - Test coverage gaps
      - Configuration management

      Severity Criteria:
      - Critical: Core requirements not met, deployment blockers
      - High: Significant functionality missing, acceptance criteria not met
      - Medium: Minor requirements gaps, documentation incomplete
      - Low: Nice-to-have features missing, minor documentation gaps
    `,
    performance: `
      Focus Areas:
      - N+1 query problems
      - Inefficient algorithms (O(n^2) where O(n log n) possible)
      - Memory leaks
      - Blocking operations on main thread
      - Missing caching opportunities
      - Resource usage (CPU, memory, network)
      - Database query optimization

      Severity Criteria:
      - Critical: Memory leaks, O(n^2) in hot path, blocking main thread
      - High: N+1 queries, missing indexes, inefficient algorithms
      - Medium: Suboptimal caching, unnecessary computations, lazy loading issues
      - Low: Minor optimization opportunities, redundant operations
    `,
    maintainability: `
      Focus Areas:
      - Technical debt indicators
      - Magic numbers and hardcoded values
      - Long methods (>50 lines)
      - Large classes (>500 lines)
      - Dead code and commented code
      - Code documentation
      - Test coverage

      Severity Criteria:
      - Critical: Massive methods (>200 lines), severe technical debt blocking changes
      - High: Large methods (>100 lines), significant dead code, undocumented complex logic
      - Medium: Magic numbers, moderate technical debt, missing tests
      - Low: Minor refactoring opportunities, cosmetic improvements
    `,
    'best-practices': `
      Focus Areas:
      - Framework conventions adherence
      - Language idioms
      - Anti-patterns
      - Deprecated API usage
      - Coding standards compliance
      - Error handling patterns
      - Logging and monitoring

      Severity Criteria:
      - Critical: Severe anti-patterns, deprecated APIs with security risks
      - High: Major convention violations, poor error handling, missing logging
      - Medium: Minor anti-patterns, style inconsistencies, suboptimal patterns
      - Low: Cosmetic style issues, minor convention deviations
    `
  };

  return guidance[dimension] || 'Standard code review analysis';
}
```

## Output

- Files: `dimensions/{dimension}.json`, `reports/{dimension}-analysis.md`, `reports/{dimension}-cli-output.txt`
- Progress: Mark Phase 2 completed, Phase 3 in_progress

## Next Phase

Return to orchestrator, then auto-continue to [Phase 3: Aggregation](03-aggregation.md).
