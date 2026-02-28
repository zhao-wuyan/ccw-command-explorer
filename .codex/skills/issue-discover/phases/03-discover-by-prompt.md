# Phase 3: Discover by Prompt

> 来源: `commands/issue/discover-by-prompt.md`

## Overview

Prompt-driven issue discovery with intelligent planning. Instead of fixed perspectives, this command analyzes user intent via Gemini, plans exploration strategy dynamically, and executes iterative multi-agent exploration with ACE semantic search.

**Core workflow**: Prompt Analysis → ACE Context → Gemini Planning → Iterative Exploration → Cross-Analysis → Issue Generation

**Core Difference from Phase 2 (Discover)**:
- Phase 2: Pre-defined perspectives (bug, security, etc.), parallel execution
- Phase 3: User-driven prompt, Gemini-planned strategy, iterative exploration

## Prerequisites

- User prompt describing what to discover
- `ccw cli` available (for Gemini planning)
- `ccw issue` CLI available

## Auto Mode

When `--yes` or `-y`: Auto-continue all iterations, skip confirmations.

## Arguments

| Argument | Required | Type | Default | Description |
|----------|----------|------|---------|-------------|
| prompt | Yes | String | - | Natural language description of what to find |
| --scope | No | String | `**/*` | File pattern to explore |
| --depth | No | String | `standard` | `standard` (3 iterations) or `deep` (5+ iterations) |
| --max-iterations | No | Integer | 5 | Maximum exploration iterations |
| --plan-only | No | Flag | false | Stop after Gemini planning, show plan |
| -y, --yes | No | Flag | false | Skip all confirmations |

## Use Cases

| Scenario | Example Prompt |
|----------|----------------|
| API Contract | "Check if frontend calls match backend endpoints" |
| Error Handling | "Find inconsistent error handling patterns" |
| Migration Gap | "Compare old auth with new auth implementation" |
| Feature Parity | "Verify mobile has all web features" |
| Schema Drift | "Check if TypeScript types match API responses" |
| Integration | "Find mismatches between service A and service B" |

## Execution Steps

### Step 3.1: Prompt Analysis & Initialization

```javascript
// Parse arguments
const { prompt, scope, depth, maxIterations } = parseArgs(args);

// Generate discovery ID
const discoveryId = `DBP-${formatDate(new Date(), 'YYYYMMDD-HHmmss')}`;

// Create output directory
const outputDir = `${projectRoot}/.workflow/issues/discoveries/${discoveryId}`;
await mkdir(outputDir, { recursive: true });
await mkdir(`${outputDir}/iterations`, { recursive: true });

// Detect intent type from prompt
const intentType = detectIntent(prompt);
// Returns: 'comparison' | 'search' | 'verification' | 'audit'

// Initialize discovery state
await writeJson(`${outputDir}/discovery-state.json`, {
  discovery_id: discoveryId,
  type: 'prompt-driven',
  prompt: prompt,
  intent_type: intentType,
  scope: scope || '**/*',
  depth: depth || 'standard',
  max_iterations: maxIterations || 5,
  phase: 'initialization',
  created_at: new Date().toISOString(),
  iterations: [],
  cumulative_findings: [],
  comparison_matrix: null
});
```

### Step 3.2: ACE Context Gathering

```javascript
// Extract keywords from prompt for semantic search
const keywords = extractKeywords(prompt);

// Use ACE to understand codebase structure
const aceQueries = [
  `Project architecture and module structure for ${keywords.join(', ')}`,
  `Where are ${keywords[0]} implementations located?`,
  `How does ${keywords.slice(0, 2).join(' ')} work in this codebase?`
];

const aceResults = [];
for (const query of aceQueries) {
  const result = await mcp__ace-tool__search_context({
    project_root_path: process.cwd(),
    query: query
  });
  aceResults.push({ query, result });
}

// Build context package for Gemini (kept in memory)
const aceContext = {
  prompt_keywords: keywords,
  codebase_structure: aceResults[0].result,
  relevant_modules: aceResults.slice(1).map(r => r.result),
  detected_patterns: extractPatterns(aceResults)
};
```

**ACE Query Strategy by Intent Type**:

| Intent | ACE Queries |
|--------|-------------|
| **comparison** | "frontend API calls", "backend API handlers", "API contract definitions" |
| **search** | "{keyword} implementations", "{keyword} usage patterns" |
| **verification** | "expected behavior for {feature}", "test coverage for {feature}" |
| **audit** | "all {category} patterns", "{category} security concerns" |

### Step 3.3: Gemini Strategy Planning

```javascript
// Build Gemini planning prompt with ACE context
const planningPrompt = `
PURPOSE: Analyze discovery prompt and create exploration strategy based on codebase context
TASK:
• Parse user intent from prompt: "${prompt}"
• Use codebase context to identify specific modules and files to explore
• Create exploration dimensions with precise search targets
• Define comparison matrix structure (if comparison intent)
• Set success criteria and iteration strategy
MODE: analysis
CONTEXT: @${scope || '**/*'} | Discovery type: ${intentType}

## Codebase Context (from ACE semantic search)
${JSON.stringify(aceContext, null, 2)}

EXPECTED: JSON exploration plan:
{
  "intent_analysis": { "type": "${intentType}", "primary_question": "...", "sub_questions": [...] },
  "dimensions": [{ "name": "...", "description": "...", "search_targets": [...], "focus_areas": [...], "agent_prompt": "..." }],
  "comparison_matrix": { "dimension_a": "...", "dimension_b": "...", "comparison_points": [...] },
  "success_criteria": [...],
  "estimated_iterations": N,
  "termination_conditions": [...]
}
CONSTRAINTS: Use ACE context to inform targets | Focus on actionable plan
`;

// Execute Gemini planning
Bash({
  command: `ccw cli -p "${planningPrompt}" --tool gemini --mode analysis`,
  run_in_background: true,
  timeout: 300000
});

// Parse and validate
const explorationPlan = await parseGeminiPlanOutput(geminiResult);
```

**Gemini Planning Output Schema**:

```json
{
  "intent_analysis": {
    "type": "comparison|search|verification|audit",
    "primary_question": "string",
    "sub_questions": ["string"]
  },
  "dimensions": [
    {
      "name": "frontend",
      "description": "Client-side API calls and error handling",
      "search_targets": ["src/api/**", "src/hooks/**"],
      "focus_areas": ["fetch calls", "error boundaries", "response parsing"],
      "agent_prompt": "Explore frontend API consumption patterns..."
    }
  ],
  "comparison_matrix": {
    "dimension_a": "frontend",
    "dimension_b": "backend",
    "comparison_points": [
      {"aspect": "endpoints", "frontend_check": "fetch URLs", "backend_check": "route paths"},
      {"aspect": "methods", "frontend_check": "HTTP methods used", "backend_check": "methods accepted"},
      {"aspect": "payloads", "frontend_check": "request body structure", "backend_check": "expected schema"},
      {"aspect": "responses", "frontend_check": "response parsing", "backend_check": "response format"},
      {"aspect": "errors", "frontend_check": "error handling", "backend_check": "error responses"}
    ]
  },
  "success_criteria": ["All API endpoints mapped", "Discrepancies identified with file:line"],
  "estimated_iterations": 3,
  "termination_conditions": ["All comparison points verified", "Confidence > 0.8"]
}
```

### Step 3.4: Iterative Agent Exploration (with ACE)

```javascript
let iteration = 0;
let cumulativeFindings = [];
let sharedContext = { aceDiscoveries: [], crossReferences: [] };
let shouldContinue = true;

while (shouldContinue && iteration < maxIterations) {
  iteration++;
  const iterationDir = `${outputDir}/iterations/${iteration}`;
  await mkdir(iterationDir, { recursive: true });

  // ACE-assisted iteration planning
  const iterationAceQueries = iteration === 1
    ? explorationPlan.dimensions.map(d => d.focus_areas[0])
    : deriveQueriesFromFindings(cumulativeFindings);

  const iterationAceResults = [];
  for (const query of iterationAceQueries) {
    const result = await mcp__ace-tool__search_context({
      project_root_path: process.cwd(),
      query: `${query} in ${explorationPlan.scope}`
    });
    iterationAceResults.push({ query, result });
  }

  sharedContext.aceDiscoveries.push(...iterationAceResults);

  // Plan this iteration
  const iterationPlan = planIteration(iteration, explorationPlan, cumulativeFindings, iterationAceResults);

  // Step 1: Spawn dimension agents (parallel creation)
  const dimensionAgents = [];

  iterationPlan.dimensions.forEach(dimension => {
    const agentId = spawn_agent({
      message: buildDimensionPromptWithACE(dimension, iteration, cumulativeFindings, iterationAceResults, iterationDir)
    });
    dimensionAgents.push({ agentId, dimension });
  });

  // Step 2: Batch wait for all dimension agents
  const dimensionAgentIds = dimensionAgents.map(a => a.agentId);
  const iterationResults = wait({
    ids: dimensionAgentIds,
    timeout_ms: 600000  // 10 minutes
  });

  // Step 3: Check for timeouts
  if (iterationResults.timed_out) {
    console.log(`Iteration ${iteration}: some agents timed out, using completed results`);
  }

  // Step 4: Close all dimension agents
  dimensionAgentIds.forEach(id => close_agent({ id }));

  // Collect and analyze iteration findings
  const iterationFindings = await collectIterationFindings(iterationDir, iterationPlan.dimensions);

  // Cross-reference findings between dimensions
  if (iterationPlan.dimensions.length > 1) {
    const crossRefs = findCrossReferences(iterationFindings, iterationPlan.dimensions);
    sharedContext.crossReferences.push(...crossRefs);
  }

  cumulativeFindings.push(...iterationFindings);

  // Decide whether to continue
  const convergenceCheck = checkConvergence(iterationFindings, cumulativeFindings, explorationPlan);
  shouldContinue = !convergenceCheck.converged;

  // Update state
  await updateDiscoveryState(outputDir, {
    iterations: [...state.iterations, {
      number: iteration,
      findings_count: iterationFindings.length,
      ace_queries: iterationAceQueries.length,
      cross_references: sharedContext.crossReferences.length,
      new_discoveries: convergenceCheck.newDiscoveries,
      confidence: convergenceCheck.confidence,
      continued: shouldContinue
    }],
    cumulative_findings: cumulativeFindings
  });
}
```

**Iteration Loop**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Iteration Loop                           │
├─────────────────────────────────────────────────────────────┤
│  1. Plan: What to explore this iteration                    │
│     └─ Based on: previous findings + unexplored areas       │
│                                                             │
│  2. Execute: Spawn agents for this iteration                │
│     └─ Each agent: explore → collect → return summary       │
│     └─ Lifecycle: spawn_agent → batch wait → close_agent    │
│                                                             │
│  3. Analyze: Process iteration results                      │
│     └─ New findings? Gaps? Contradictions?                  │
│                                                             │
│  4. Decide: Continue or terminate                           │
│     └─ Terminate if: max iterations OR convergence OR       │
│                      high confidence on all questions       │
└─────────────────────────────────────────────────────────────┘
```

### Step 3.5: Cross-Analysis & Synthesis

```javascript
// For comparison intent, perform cross-analysis
if (intentType === 'comparison' && explorationPlan.comparison_matrix) {
  const comparisonResults = [];

  for (const point of explorationPlan.comparison_matrix.comparison_points) {
    const dimensionAFindings = cumulativeFindings.filter(f =>
      f.related_dimension === explorationPlan.comparison_matrix.dimension_a &&
      f.category.includes(point.aspect)
    );

    const dimensionBFindings = cumulativeFindings.filter(f =>
      f.related_dimension === explorationPlan.comparison_matrix.dimension_b &&
      f.category.includes(point.aspect)
    );

    const discrepancies = findDiscrepancies(dimensionAFindings, dimensionBFindings, point);

    comparisonResults.push({
      aspect: point.aspect,
      dimension_a_count: dimensionAFindings.length,
      dimension_b_count: dimensionBFindings.length,
      discrepancies: discrepancies,
      match_rate: calculateMatchRate(dimensionAFindings, dimensionBFindings)
    });
  }

  await writeJson(`${outputDir}/comparison-analysis.json`, {
    matrix: explorationPlan.comparison_matrix,
    results: comparisonResults,
    summary: {
      total_discrepancies: comparisonResults.reduce((sum, r) => sum + r.discrepancies.length, 0),
      overall_match_rate: average(comparisonResults.map(r => r.match_rate)),
      critical_mismatches: comparisonResults.filter(r => r.match_rate < 0.5)
    }
  });
}

const prioritizedFindings = prioritizeFindings(cumulativeFindings, explorationPlan);
```

### Step 3.6: Issue Generation & Summary

```javascript
// Convert high-confidence findings to issues
const issueWorthy = prioritizedFindings.filter(f =>
  f.confidence >= 0.7 || f.priority === 'critical' || f.priority === 'high'
);

const issues = issueWorthy.map(finding => ({
  id: `ISS-${discoveryId}-${finding.id}`,
  title: finding.title,
  description: finding.description,
  source: { discovery_id: discoveryId, finding_id: finding.id, dimension: finding.related_dimension },
  file: finding.file,
  line: finding.line,
  priority: finding.priority,
  category: finding.category,
  confidence: finding.confidence,
  status: 'discovered',
  created_at: new Date().toISOString()
}));

await writeJsonl(`${outputDir}/discovery-issues.jsonl`, issues);

// Update final state
await updateDiscoveryState(outputDir, {
  phase: 'complete',
  updated_at: new Date().toISOString(),
  results: {
    total_iterations: iteration,
    total_findings: cumulativeFindings.length,
    issues_generated: issues.length,
    comparison_match_rate: comparisonResults
      ? average(comparisonResults.map(r => r.match_rate))
      : null
  }
});

// Prompt user for next action
await ASK_USER([{
  id: "next_step",
  type: "select",
  prompt: `Discovery complete: ${issues.length} issues from ${cumulativeFindings.length} findings across ${iteration} iterations. What next?`,
  options: [
    { label: "Export to Issues (Recommended)", description: `Export ${issues.length} issues for planning` },
    { label: "Review Details", description: "View comparison analysis and iteration details" },
    { label: "Run Deeper", description: "Continue with more iterations" },
    { label: "Skip", description: "Complete without exporting" }
  ]
}]);  // BLOCKS (wait for user response)
```

## Dimension Agent Prompt Template

```javascript
function buildDimensionPromptWithACE(dimension, iteration, previousFindings, aceResults, outputDir) {
  const relevantAceResults = aceResults.filter(r =>
    r.query.includes(dimension.name) || dimension.focus_areas.some(fa => r.query.includes(fa))
  );

  return `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/cli-explore-agent.md (MUST read first)
2. Read: {projectRoot}/.workflow/project-tech.json
3. Read: {projectRoot}/.workflow/specs/*.md

---

## Task Objective
Explore ${dimension.name} dimension for issue discovery (Iteration ${iteration})

## Context
- Dimension: ${dimension.name}
- Description: ${dimension.description}
- Search Targets: ${dimension.search_targets.join(', ')}
- Focus Areas: ${dimension.focus_areas.join(', ')}

## ACE Semantic Search Results (Pre-gathered)
${JSON.stringify(relevantAceResults.map(r => ({ query: r.query, files: r.result.slice(0, 5) })), null, 2)}

**Use ACE for deeper exploration**: mcp__ace-tool__search_context available.

${iteration > 1 ? `
## Previous Findings to Build Upon
${summarizePreviousFindings(previousFindings, dimension.name)}

## This Iteration Focus
- Explore areas not yet covered
- Verify/deepen previous findings
- Follow leads from previous discoveries
` : ''}

## MANDATORY FIRST STEPS
1. Read schema: ~/.ccw/workflows/cli-templates/schemas/discovery-finding-schema.json
2. Review ACE results above for starting points
3. Explore files identified by ACE

## Exploration Instructions
${dimension.agent_prompt}

## Output Requirements
**1. Write JSON file**: ${outputDir}/${dimension.name}.json
- findings: [{id, title, category, description, file, line, snippet, confidence, related_dimension}]
- coverage: {files_explored, areas_covered, areas_remaining}
- leads: [{description, suggested_search}]
- ace_queries_used: [{query, result_count}]

**2. Return summary**: Total findings, key discoveries, recommended next areas
`;
}
```

## Output File Structure

```
{projectRoot}/.workflow/issues/discoveries/
└── {DBP-YYYYMMDD-HHmmss}/
    ├── discovery-state.json          # Session state with iteration tracking
    ├── iterations/
    │   ├── 1/
    │   │   └── {dimension}.json      # Dimension findings
    │   ├── 2/
    │   │   └── {dimension}.json
    │   └── ...
    ├── comparison-analysis.json      # Cross-dimension comparison (if applicable)
    └── discovery-issues.jsonl        # Generated issue candidates
```

## Configuration Options

| Flag | Default | Description |
|------|---------|-------------|
| `--scope` | `**/*` | File pattern to explore |
| `--depth` | `standard` | `standard` (3 iterations) or `deep` (5+ iterations) |
| `--max-iterations` | 5 | Maximum exploration iterations |
| `--tool` | `gemini` | Planning tool (gemini/qwen) |
| `--plan-only` | `false` | Stop after Gemini planning, show plan |

## Schema References

| Schema | Path | Used By |
|--------|------|---------|
| **Discovery State** | `discovery-state-schema.json` | Orchestrator (state tracking) |
| **Discovery Finding** | `discovery-finding-schema.json` | Dimension agents (output) |
| **Exploration Plan** | `exploration-plan-schema.json` | Gemini output validation (memory only) |

## Error Handling

| Error | Message | Resolution |
|-------|---------|------------|
| Gemini planning failed | CLI error | Retry with qwen fallback |
| ACE search failed | No results | Fall back to file glob patterns |
| No findings after iterations | Convergence at 0 | Report clean status |
| Agent timeout | Exploration too large | Narrow scope, reduce iterations |
| Agent lifecycle error | Resource leak | Ensure close_agent in error paths |

## Examples

```bash
# Single module deep dive
issue-discover --action discover-by-prompt "Find all potential issues in auth" --scope=src/auth/**

# API contract comparison
issue-discover --action discover-by-prompt "Check if API calls match implementations" --scope=src/**

# Plan only mode
issue-discover --action discover-by-prompt "Find inconsistent patterns" --plan-only
```

## Post-Phase Update

After prompt-driven discovery:
- Findings aggregated across iterations with confidence scores
- Comparison analysis generated (if comparison intent)
- Issue candidates written to discovery-issues.jsonl
- Report: total iterations, findings, issues, match rate
- Recommend next step: Export → issue-resolve (plan solutions)
