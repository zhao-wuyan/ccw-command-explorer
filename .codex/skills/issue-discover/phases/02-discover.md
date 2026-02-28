# Phase 2: Discover Issues (Multi-Perspective)

> 来源: `commands/issue/discover.md`

## Overview

Multi-perspective issue discovery orchestrator that explores code from different angles to identify potential bugs, UX improvements, test gaps, and other actionable items.

**Core workflow**: Initialize → Select Perspectives → Parallel Analysis → Aggregate → Generate Issues → User Action

**Discovery Scope**: Specified modules/files only
**Output Directory**: `{projectRoot}/.workflow/issues/discoveries/{discovery-id}/`
**Available Perspectives**: bug, ux, test, quality, security, performance, maintainability, best-practices
**Exa Integration**: Auto-enabled for security and best-practices perspectives
**CLI Tools**: Gemini → Qwen → Codex (fallback chain)

## Prerequisites

- Target file/module pattern (e.g., `src/auth/**`)
- `ccw issue` CLI available

## Auto Mode

When `--yes` or `-y`: Auto-select all perspectives, skip confirmations.

## Arguments

| Argument | Required | Type | Default | Description |
|----------|----------|------|---------|-------------|
| target | Yes | String | - | File/module glob pattern (e.g., `src/auth/**`) |
| --perspectives | No | String | interactive | Comma-separated: bug,ux,test,quality,security,performance,maintainability,best-practices |
| --external | No | Flag | false | Enable Exa research for all perspectives |
| -y, --yes | No | Flag | false | Skip all confirmations |

## Perspectives

| Perspective | Focus | Categories | Exa |
|-------------|-------|------------|-----|
| **bug** | Potential Bugs | edge-case, null-check, resource-leak, race-condition, boundary, exception-handling | - |
| **ux** | User Experience | error-message, loading-state, feedback, accessibility, interaction, consistency | - |
| **test** | Test Coverage | missing-test, edge-case-test, integration-gap, coverage-hole, assertion-quality | - |
| **quality** | Code Quality | complexity, duplication, naming, documentation, code-smell, readability | - |
| **security** | Security Issues | injection, auth, encryption, input-validation, data-exposure, access-control | ✓ |
| **performance** | Performance | n-plus-one, memory-usage, caching, algorithm, blocking-operation, resource | - |
| **maintainability** | Maintainability | coupling, cohesion, tech-debt, extensibility, module-boundary, interface-design | - |
| **best-practices** | Best Practices | convention, pattern, framework-usage, anti-pattern, industry-standard | ✓ |

## Execution Steps

### Step 2.1: Discovery & Initialization

```javascript
// Parse target pattern and resolve files
const resolvedFiles = await expandGlobPattern(targetPattern);
if (resolvedFiles.length === 0) {
  throw new Error(`No files matched pattern: ${targetPattern}`);
}

// Generate discovery ID
const discoveryId = `DSC-${formatDate(new Date(), 'YYYYMMDD-HHmmss')}`;

// Create output directory
const outputDir = `${projectRoot}/.workflow/issues/discoveries/${discoveryId}`;
await mkdir(outputDir, { recursive: true });
await mkdir(`${outputDir}/perspectives`, { recursive: true });

// Initialize unified discovery state
await writeJson(`${outputDir}/discovery-state.json`, {
  discovery_id: discoveryId,
  target_pattern: targetPattern,
  phase: "initialization",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  target: { files_count: { total: resolvedFiles.length }, project: {} },
  perspectives: [],
  external_research: { enabled: false, completed: false },
  results: { total_findings: 0, issues_generated: 0, priority_distribution: {} }
});
```

### Step 2.2: Interactive Perspective Selection

```javascript
let selectedPerspectives = [];

if (args.perspectives) {
  selectedPerspectives = args.perspectives.split(',').map(p => p.trim());
} else {
  // Interactive selection via ASK_USER
  const response = ASK_USER([{
    id: "focus",
    type: "select",
    prompt: "Select primary discovery focus:",
    options: [
      { label: "Bug + Test + Quality", description: "Quick scan: potential bugs, test gaps, code quality (Recommended)" },
      { label: "Security + Performance", description: "System audit: security issues, performance bottlenecks" },
      { label: "Maintainability + Best-practices", description: "Long-term health: coupling, tech debt, conventions" },
      { label: "Full analysis", description: "All 8 perspectives (comprehensive, takes longer)" }
    ]
  }]);  // BLOCKS (wait for user response)
  selectedPerspectives = parseSelectedPerspectives(response);
}
```

### Step 2.3: Parallel Perspective Analysis

Launch N agents in parallel (one per selected perspective):

```javascript
// Step 1: Spawn agents for each perspective (parallel creation)
const perspectiveAgents = [];

selectedPerspectives.forEach(perspective => {
  const agentId = spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/cli-explore-agent.md (MUST read first)
2. Read: {projectRoot}/.workflow/project-tech.json
3. Read: {projectRoot}/.workflow/specs/*.md

---

## Task Objective
Discover potential ${perspective} issues in specified module files.

## Discovery Context
- Discovery ID: ${discoveryId}
- Perspective: ${perspective}
- Target Pattern: ${targetPattern}
- Resolved Files: ${resolvedFiles.length} files
- Output Directory: ${outputDir}

## MANDATORY FIRST STEPS
1. Read discovery state: ${outputDir}/discovery-state.json
2. Read schema: ~/.ccw/workflows/cli-templates/schemas/discovery-finding-schema.json
3. Analyze target files for ${perspective} concerns

## Output Requirements

**1. Write JSON file**: ${outputDir}/perspectives/${perspective}.json
- Follow discovery-finding-schema.json exactly
- Each finding: id, title, priority, category, description, file, line, snippet, suggested_issue, confidence

**2. Return summary** (DO NOT write report file):
- Total findings, priority breakdown, key issues

## Perspective-Specific Guidance
${getPerspectiveGuidance(perspective)}

## Success Criteria
- [ ] JSON written to ${outputDir}/perspectives/${perspective}.json
- [ ] Summary returned with findings count and key issues
- [ ] Each finding includes actionable suggested_issue
- [ ] Priority uses lowercase enum: critical/high/medium/low
`
  });

  perspectiveAgents.push({ agentId, perspective });
});

// Step 2: Batch wait for all agents
const agentIds = perspectiveAgents.map(a => a.agentId);
const results = wait({
  ids: agentIds,
  timeout_ms: 600000  // 10 minutes
});

// Step 3: Check for timeouts
if (results.timed_out) {
  console.log('Some perspective analyses timed out, continuing with completed results');
}

// Step 4: Collect results
const completedResults = {};
perspectiveAgents.forEach(({ agentId, perspective }) => {
  if (results.status[agentId].completed) {
    completedResults[perspective] = results.status[agentId].completed;
  }
});

// Step 5: Close all agents
agentIds.forEach(id => close_agent({ id }));
```

### Exa Research Agent (for security and best-practices)

```javascript
// Only spawn if perspective requires external research
if (selectedPerspectives.includes('security') || selectedPerspectives.includes('best-practices') || args.external) {
  const exaAgentId = spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/cli-explore-agent.md (MUST read first)
2. Read: {projectRoot}/.workflow/project-tech.json
3. Read: {projectRoot}/.workflow/specs/*.md

---

## Task Objective
Research industry best practices for ${perspective} using Exa search

## Research Steps
1. Read project tech stack: {projectRoot}/.workflow/project-tech.json
2. Use Exa to search for best practices
3. Synthesize findings relevant to this project

## Output Requirements
**1. Write JSON file**: ${outputDir}/external-research.json
**2. Return summary** (DO NOT write report file)

## Success Criteria
- [ ] JSON written to ${outputDir}/external-research.json
- [ ] Findings are relevant to project's tech stack
`
  });

  const exaResult = wait({
    ids: [exaAgentId],
    timeout_ms: 300000  // 5 minutes
  });

  close_agent({ id: exaAgentId });
}
```

### Step 2.4: Aggregation & Prioritization

```javascript
// Load all perspective JSON files written by agents
const allFindings = [];
for (const perspective of selectedPerspectives) {
  const jsonPath = `${outputDir}/perspectives/${perspective}.json`;
  if (await fileExists(jsonPath)) {
    const data = await readJson(jsonPath);
    allFindings.push(...data.findings.map(f => ({ ...f, perspective })));
  }
}

// Deduplicate and prioritize
const prioritizedFindings = deduplicateAndPrioritize(allFindings);
```

### Step 2.5: Issue Generation & Summary

```javascript
// Convert high-priority findings to issues
const issueWorthy = prioritizedFindings.filter(f =>
  f.priority === 'critical' || f.priority === 'high' || f.priority_score >= 0.7
);

// Write discovery-issues.jsonl
await writeJsonl(`${outputDir}/discovery-issues.jsonl`, issues);

// Generate summary from agent returns
await writeSummaryFromAgentReturns(outputDir, completedResults, prioritizedFindings, issues);

// Update final state
await updateDiscoveryState(outputDir, {
  phase: 'complete',
  updated_at: new Date().toISOString(),
  'results.issues_generated': issues.length
});
```

### Step 2.6: User Action Prompt

```javascript
const hasHighPriority = issues.some(i => i.priority === 'critical' || i.priority === 'high');

await ASK_USER([{
  id: "next_step",
  type: "select",
  prompt: `Discovery complete: ${issues.length} issues generated, ${prioritizedFindings.length} total findings. What next?`,
  options: hasHighPriority ? [
    { label: "Export to Issues (Recommended)", description: `${issues.length} high-priority issues found - export to tracker` },
    { label: "Open Dashboard", description: "Review findings in ccw view before exporting" },
    { label: "Skip", description: "Complete discovery without exporting" }
  ] : [
    { label: "Open Dashboard (Recommended)", description: "Review findings in ccw view to decide which to export" },
    { label: "Export to Issues", description: `Export ${issues.length} issues to tracker` },
    { label: "Skip", description: "Complete discovery without exporting" }
  ]
}]);  // BLOCKS (wait for user response)

if (response === "Export to Issues") {
  await appendJsonl(`${projectRoot}/.workflow/issues/issues.jsonl`, issues);
}
```

## Perspective Guidance Reference

```javascript
function getPerspectiveGuidance(perspective) {
  const guidance = {
    bug: `Focus: Null checks, edge cases, resource leaks, race conditions, boundary conditions, exception handling
      Priority: Critical=data corruption/crash, High=malfunction, Medium=edge case issues, Low=minor`,
    ux: `Focus: Error messages, loading states, feedback, accessibility, interaction patterns, form validation
      Priority: Critical=inaccessible, High=confusing, Medium=inconsistent, Low=cosmetic`,
    test: `Focus: Missing unit tests, edge case coverage, integration gaps, assertion quality, test isolation
      Priority: Critical=no security tests, High=no core logic tests, Medium=weak coverage, Low=minor gaps`,
    quality: `Focus: Complexity, duplication, naming, documentation, code smells, readability
      Priority: Critical=unmaintainable, High=significant issues, Medium=naming/docs, Low=minor refactoring`,
    security: `Focus: Input validation, auth/authz, injection, XSS/CSRF, data exposure, access control
      Priority: Critical=auth bypass/injection, High=missing authz, Medium=weak validation, Low=headers`,
    performance: `Focus: N+1 queries, memory leaks, caching, algorithm efficiency, blocking operations
      Priority: Critical=memory leaks, High=N+1/inefficient, Medium=missing cache, Low=minor optimization`,
    maintainability: `Focus: Coupling, interface design, tech debt, extensibility, module boundaries, configuration
      Priority: Critical=unrelated code changes, High=unclear boundaries, Medium=coupling, Low=refactoring`,
    'best-practices': `Focus: Framework conventions, language patterns, anti-patterns, deprecated APIs, coding standards
      Priority: Critical=anti-patterns causing bugs, High=convention violations, Medium=style, Low=cosmetic`
  };
  return guidance[perspective] || 'General code discovery analysis';
}
```

## Output File Structure

```
{projectRoot}/.workflow/issues/discoveries/
├── index.json                           # Discovery session index
└── {discovery-id}/
    ├── discovery-state.json             # Unified state
    ├── perspectives/
    │   └── {perspective}.json           # Per-perspective findings
    ├── external-research.json           # Exa research results (if enabled)
    ├── discovery-issues.jsonl           # Generated candidate issues
    └── summary.md                       # Summary from agent returns
```

## Schema References

| Schema | Path | Purpose |
|--------|------|---------|
| **Discovery State** | `~/.ccw/workflows/cli-templates/schemas/discovery-state-schema.json` | Session state machine |
| **Discovery Finding** | `~/.ccw/workflows/cli-templates/schemas/discovery-finding-schema.json` | Perspective analysis results |

## Error Handling

| Error | Message | Resolution |
|-------|---------|------------|
| No files matched | Pattern empty | Check target pattern, verify path exists |
| Agent failure | Perspective analysis error | Retry failed perspective, check agent logs |
| No findings | All perspectives clean | Report clean status, no issues to generate |
| Agent lifecycle error | Resource leak | Ensure close_agent in error paths |

## Examples

```bash
# Quick scan with default perspectives
issue-discover --action discover src/auth/**

# Security-focused audit
issue-discover --action discover src/payment/** --perspectives=security,bug

# Full analysis with external research
issue-discover --action discover src/api/** --external
```

## Post-Phase Update

After discovery:
- Findings aggregated with priority distribution
- Issue candidates written to discovery-issues.jsonl
- Report: total findings, issues generated, priority breakdown
- Recommend next step: Export to issues → `/issue:plan` or `issue-resolve`
