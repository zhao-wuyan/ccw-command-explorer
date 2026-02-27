---
description: Discover issues from user prompt with iterative multi-agent exploration and cross-module comparison
argument-hint: "<prompt> [--scope=src/**] [--depth=standard|deep] [--max-iterations=5]"
---

# Issue Discovery by Prompt (Codex Version)

## Goal

Prompt-driven issue discovery with intelligent planning. Instead of fixed perspectives, this command:

1. **Analyzes user intent** to understand what to find
2. **Plans exploration strategy** dynamically based on codebase structure
3. **Executes iterative exploration** with feedback loops
4. **Performs cross-module comparison** when detecting comparison intent

**Core Difference from `issue-discover.md`**:
- `issue-discover`: Pre-defined perspectives (bug, security, etc.), parallel execution
- `issue-discover-by-prompt`: User-driven prompt, planned strategy, iterative exploration

## Inputs

- **Prompt**: Natural language description of what to find
- **Scope**: `--scope=src/**` - File pattern to explore (default: `**/*`)
- **Depth**: `--depth=standard|deep` - standard (3 iterations) or deep (5+ iterations)
- **Max Iterations**: `--max-iterations=N` (default: 5)

## Output Requirements

**Generate Files:**
1. `.workflow/issues/discoveries/{discovery-id}/discovery-state.json` - Session state with iteration tracking
2. `.workflow/issues/discoveries/{discovery-id}/iterations/{N}/{dimension}.json` - Per-iteration findings
3. `.workflow/issues/discoveries/{discovery-id}/comparison-analysis.json` - Cross-dimension comparison (if applicable)
4. `.workflow/issues/discoveries/{discovery-id}/discovery-issues.jsonl` - Generated issue candidates

**Return Summary:**
```json
{
  "discovery_id": "DBP-YYYYMMDD-HHmmss",
  "prompt": "Check if frontend API calls match backend implementations",
  "intent_type": "comparison",
  "dimensions": ["frontend-calls", "backend-handlers"],
  "total_iterations": 3,
  "total_findings": 24,
  "issues_generated": 12,
  "comparison_match_rate": 0.75
}
```

## Workflow

### Step 1: Initialize Discovery Session

```bash
# Generate discovery ID
DISCOVERY_ID="DBP-$(date -u +%Y%m%d-%H%M%S)"
OUTPUT_DIR=".workflow/issues/discoveries/${DISCOVERY_ID}"

# Create directory structure
mkdir -p "${OUTPUT_DIR}/iterations"
```

Detect intent type from prompt:
- `comparison`: Contains "match", "compare", "versus", "vs", "between"
- `search`: Contains "find", "locate", "where"
- `verification`: Contains "verify", "check", "ensure"
- `audit`: Contains "audit", "review", "analyze"

### Step 2: Gather Context

Use `rg` and file exploration to understand codebase structure:

```bash
# Find relevant modules based on prompt keywords
rg -l "<keyword1>" --type ts | head -10
rg -l "<keyword2>" --type ts | head -10

# Understand project structure
ls -la src/
cat .workflow/project-tech.json 2>/dev/null || echo "No project-tech.json"
```

Build context package:
```json
{
  "prompt_keywords": ["frontend", "API", "backend"],
  "codebase_structure": { "modules": [...], "patterns": [...] },
  "relevant_modules": ["src/api/", "src/services/"]
}
```

### Step 3: Plan Exploration Strategy

Analyze the prompt and context to design exploration strategy.

**Output exploration plan:**
```json
{
  "intent_analysis": {
    "type": "comparison",
    "primary_question": "Do frontend API calls match backend implementations?",
    "sub_questions": ["Are endpoints aligned?", "Are payloads compatible?"]
  },
  "dimensions": [
    {
      "name": "frontend-calls",
      "description": "Client-side API calls and error handling",
      "search_targets": ["src/api/**", "src/hooks/**"],
      "focus_areas": ["fetch calls", "error boundaries", "response parsing"]
    },
    {
      "name": "backend-handlers",
      "description": "Server-side API implementations",
      "search_targets": ["src/server/**", "src/routes/**"],
      "focus_areas": ["endpoint handlers", "response schemas", "error responses"]
    }
  ],
  "comparison_matrix": {
    "dimension_a": "frontend-calls",
    "dimension_b": "backend-handlers",
    "comparison_points": [
      {"aspect": "endpoints", "frontend_check": "fetch URLs", "backend_check": "route paths"},
      {"aspect": "methods", "frontend_check": "HTTP methods used", "backend_check": "methods accepted"},
      {"aspect": "payloads", "frontend_check": "request body structure", "backend_check": "expected schema"},
      {"aspect": "responses", "frontend_check": "response parsing", "backend_check": "response format"}
    ]
  },
  "estimated_iterations": 3,
  "termination_conditions": ["All comparison points verified", "No new findings in last iteration"]
}
```

### Step 4: Iterative Exploration

Execute iterations until termination conditions are met:

```
WHILE iteration < max_iterations AND shouldContinue:
  1. Plan iteration focus based on previous findings
  2. Explore each dimension
  3. Collect and analyze findings
  4. Cross-reference between dimensions
  5. Check convergence
```

**For each iteration:**

1. **Search for relevant code** using `rg`:
```bash
# Based on dimension focus areas
rg "fetch\s*\(" --type ts -C 3 | head -50
rg "app\.(get|post|put|delete)" --type ts -C 3 | head -50
```

2. **Analyze and record findings**:
```json
{
  "dimension": "frontend-calls",
  "iteration": 1,
  "findings": [
    {
      "id": "F-001",
      "title": "Undefined endpoint in UserService",
      "category": "endpoint-mismatch",
      "file": "src/api/userService.ts",
      "line": 42,
      "snippet": "fetch('/api/users/profile')",
      "related_dimension": "backend-handlers",
      "confidence": 0.85
    }
  ],
  "coverage": {
    "files_explored": 15,
    "areas_covered": ["fetch calls", "axios instances"],
    "areas_remaining": ["graphql queries"]
  },
  "leads": [
    {"description": "Check GraphQL mutations", "suggested_search": "mutation.*User"}
  ]
}
```

3. **Cross-reference findings** between dimensions:
```javascript
// For each finding in dimension A, look for related code in dimension B
if (finding.related_dimension) {
  searchForRelatedCode(finding, otherDimension);
}
```

4. **Check convergence**:
```javascript
const convergence = {
  newDiscoveries: newFindings.length,
  confidence: calculateConfidence(cumulativeFindings),
  converged: newFindings.length === 0 || confidence > 0.9
};
```

### Step 5: Cross-Analysis (for comparison intent)

If intent is comparison, analyze findings across dimensions:

```javascript
for (const point of comparisonMatrix.comparison_points) {
  const aFindings = findings.filter(f => 
    f.related_dimension === dimension_a && f.category.includes(point.aspect)
  );
  const bFindings = findings.filter(f =>
    f.related_dimension === dimension_b && f.category.includes(point.aspect)
  );
  
  // Find discrepancies
  const discrepancies = compareFindings(aFindings, bFindings, point);
  
  // Calculate match rate
  const matchRate = calculateMatchRate(aFindings, bFindings);
}
```

Write to `comparison-analysis.json`:
```json
{
  "matrix": { "dimension_a": "...", "dimension_b": "...", "comparison_points": [...] },
  "results": [
    {
      "aspect": "endpoints",
      "dimension_a_count": 15,
      "dimension_b_count": 12,
      "discrepancies": [
        {"frontend": "/api/users/profile", "backend": "NOT_FOUND", "type": "missing_endpoint"}
      ],
      "match_rate": 0.80
    }
  ],
  "summary": {
    "total_discrepancies": 5,
    "overall_match_rate": 0.75,
    "critical_mismatches": ["endpoints", "payloads"]
  }
}
```

### Step 6: Generate Issues

Convert high-confidence findings to issues:

```bash
# For each finding with confidence >= 0.7 or priority critical/high
echo '{"id":"ISS-DBP-001","title":"Missing backend endpoint for /api/users/profile",...}' >> ${OUTPUT_DIR}/discovery-issues.jsonl
```

### Step 7: Update Final State

```json
{
  "discovery_id": "DBP-...",
  "type": "prompt-driven",
  "prompt": "...",
  "intent_type": "comparison",
  "phase": "complete",
  "created_at": "...",
  "updated_at": "...",
  "iterations": [
    {"number": 1, "findings_count": 10, "new_discoveries": 10, "confidence": 0.6},
    {"number": 2, "findings_count": 18, "new_discoveries": 8, "confidence": 0.75},
    {"number": 3, "findings_count": 24, "new_discoveries": 6, "confidence": 0.85}
  ],
  "results": {
    "total_iterations": 3,
    "total_findings": 24,
    "issues_generated": 12,
    "comparison_match_rate": 0.75
  }
}
```

### Step 8: Output Summary

```markdown
## Discovery Complete: DBP-...

**Prompt**: Check if frontend API calls match backend implementations
**Intent**: comparison
**Dimensions**: frontend-calls, backend-handlers

### Iteration Summary
| # | Findings | New | Confidence |
|---|----------|-----|------------|
| 1 | 10 | 10 | 60% |
| 2 | 18 | 8 | 75% |
| 3 | 24 | 6 | 85% |

### Comparison Results
- **Overall Match Rate**: 75%
- **Total Discrepancies**: 5
- **Critical Mismatches**: endpoints, payloads

### Issues Generated: 12
- 2 Critical
- 4 High
- 6 Medium

### Next Steps
- `/issue:plan DBP-001,DBP-002,...` to plan solutions
- `ccw view` to review findings in dashboard
```

## Quality Checklist

Before completing, verify:

- [ ] Intent type correctly detected from prompt
- [ ] Dimensions dynamically generated based on prompt
- [ ] Iterations executed until convergence or max limit
- [ ] Cross-reference analysis performed (for comparison intent)
- [ ] High-confidence findings converted to issues
- [ ] Discovery state shows `phase: complete`

## Error Handling

| Situation | Action |
|-----------|--------|
| No relevant code found | Report empty result, suggest broader scope |
| Max iterations without convergence | Complete with current findings, note in summary |
| Comparison dimension mismatch | Report which dimension has fewer findings |
| No comparison points matched | Report as "No direct matches found" |

## Use Cases

| Scenario | Example Prompt |
|----------|----------------|
| API Contract | "Check if frontend calls match backend endpoints" |
| Error Handling | "Find inconsistent error handling patterns" |
| Migration Gap | "Compare old auth with new auth implementation" |
| Feature Parity | "Verify mobile has all web features" |
| Schema Drift | "Check if TypeScript types match API responses" |
| Integration | "Find mismatches between service A and service B" |

## Start Discovery

Parse prompt and detect intent:

```bash
PROMPT="${1}"
SCOPE="${2:-**/*}"
DEPTH="${3:-standard}"

# Detect intent keywords
if echo "${PROMPT}" | grep -qiE '(match|compare|versus|vs|between)'; then
  INTENT="comparison"
elif echo "${PROMPT}" | grep -qiE '(find|locate|where)'; then
  INTENT="search"
elif echo "${PROMPT}" | grep -qiE '(verify|check|ensure)'; then
  INTENT="verification"
else
  INTENT="audit"
fi

echo "Intent detected: ${INTENT}"
echo "Starting discovery with scope: ${SCOPE}"
```

Then follow the workflow to explore and discover issues.
