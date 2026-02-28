# Phase 7: Fix Parallel Planning

> Source: `commands/workflow/review-cycle-fix.md` Phase 2

## Overview
Launch N planning agents (up to MAX_PARALLEL=10) to analyze finding batches concurrently. Each agent outputs a partial plan. Orchestrator aggregates partial plans into unified fix-plan.json.

## Execution Strategy Determination

**Strategy Types**:

| Strategy | When to Use | Stage Structure |
|----------|-------------|-----------------|
| **Parallel** | All groups independent, different files | Single stage, all groups in parallel |
| **Serial** | Strong dependencies, shared resources | Multiple stages, one group per stage |
| **Hybrid** | Mixed dependencies | Multiple stages, parallel within stages |

**Dependency Detection**:
- Shared file modifications
- Utility creation + usage patterns
- Test dependency chains
- Risk level clustering (high-risk groups isolated)

## Phase 2: Parallel Planning Coordination (Orchestrator)

```javascript
const MAX_PARALLEL = 10;
const partialPlans = [];

// Process batches in chunks of MAX_PARALLEL
for (let i = 0; i < batches.length; i += MAX_PARALLEL) {
  const chunk = batches.slice(i, i + MAX_PARALLEL);
  const agentIds = [];

  // Step 1: Spawn agents in parallel
  for (const batch of chunk) {
    const agentId = spawn_agent({
      message: planningPrompt(batch)  // See Planning Agent template below
    });
    agentIds.push({ agentId, batch });
  }

  console.log(`Spawned ${agentIds.length} planning agents...`);

  // Step 2: Batch wait for all agents in this chunk
  const chunkResults = wait({
    ids: agentIds.map(a => a.agentId),
    timeout_ms: 600000  // 10 minutes
  });

  // Step 3: Collect results from this chunk
  for (const { agentId, batch } of agentIds) {
    if (chunkResults.status[agentId].completed) {
      const partialPlan = JSON.parse(Read(`${sessionDir}/partial-plan-${batch.batch_id}.json`));
      partialPlans.push(partialPlan);
      console.log(`Batch ${batch.batch_id} planning completed`);
    } else {
      console.log(`Batch ${batch.batch_id} planning failed/timed out`);
    }
  }

  // Step 4: Cleanup agents in this chunk
  agentIds.forEach(({ agentId }) => close_agent({ id: agentId }));
}

// Aggregate partial plans → fix-plan.json
let groupCounter = 1;
const groupIdMap = new Map();

for (const partial of partialPlans) {
  for (const group of partial.groups) {
    const newGroupId = `G${groupCounter}`;
    groupIdMap.set(`${partial.batch_id}:${group.group_id}`, newGroupId);
    aggregatedPlan.groups.push({ ...group, group_id: newGroupId, progress_file: `fix-progress-${groupCounter}.json` });
    groupCounter++;
  }
}

// Merge timelines, resolve cross-batch conflicts (shared files → serialize)
let stageCounter = 1;
for (const partial of partialPlans) {
  for (const stage of partial.timeline) {
    aggregatedPlan.timeline.push({
      ...stage, stage_id: stageCounter,
      groups: stage.groups.map(gid => groupIdMap.get(`${partial.batch_id}:${gid}`))
    });
    stageCounter++;
  }
}

// Write aggregated plan + initialize progress files
Write(`${sessionDir}/fix-plan.json`, JSON.stringify(aggregatedPlan, null, 2));
for (let i = 1; i <= aggregatedPlan.groups.length; i++) {
  Write(`${sessionDir}/fix-progress-${i}.json`, JSON.stringify(initProgressFile(aggregatedPlan.groups[i-1]), null, 2));
}
```

## Planning Agent Template (Batch Mode)

```javascript
// Spawn planning agent for a batch
const agentId = spawn_agent({
  message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/cli-planning-agent.md (MUST read first)
2. Execute: ccw spec load --category planning

---

## Task Objective
Analyze code review findings in batch ${batch.batch_id} and generate **partial** execution plan.

## Input Data
Review Session: ${reviewId}
Fix Session ID: ${fixSessionId}
Batch ID: ${batch.batch_id}
Batch Findings: ${batch.findings.length}

Findings:
${JSON.stringify(batch.findings, null, 2)}

Project Context:
- Structure: ${projectStructure}
- Test Framework: ${testFramework}
- Git Status: ${gitStatus}

## Output Requirements

### 1. partial-plan-${batch.batch_id}.json
Generate partial execution plan with structure:
{
  "batch_id": ${batch.batch_id},
  "groups": [...],  // Groups created from batch findings (use local IDs: G1, G2, ...)
  "timeline": [...],  // Local timeline for this batch only
  "metadata": {
    "findings_count": ${batch.findings.length},
    "groups_count": N,
    "created_at": "ISO-8601-timestamp"
  }
}

**Key Generation Rules**:
- **Groups**: Create groups with local IDs (G1, G2, ...) using intelligent grouping (file+dimension+root cause)
- **Timeline**: Define stages for this batch only (local dependencies within batch)
- **Progress Files**: DO NOT generate fix-progress-*.json here (orchestrator handles after aggregation)

## Analysis Requirements

### Intelligent Grouping Strategy
Group findings using these criteria (in priority order):

1. **File Proximity**: Findings in same file or related files
2. **Dimension Affinity**: Same dimension (security, performance, etc.)
3. **Root Cause Similarity**: Similar underlying issues
4. **Fix Approach Commonality**: Can be fixed with similar approach

**Grouping Guidelines**:
- Optimal group size: 2-5 findings per group
- Avoid cross-cutting concerns in same group
- Consider test isolation (different test suites → different groups)
- Balance workload across groups for parallel execution

### Execution Strategy Determination (Local Only)

**Parallel Mode**: Use when groups are independent, no shared files
**Serial Mode**: Use when groups have dependencies or shared resources
**Hybrid Mode**: Use for mixed dependency graphs (recommended for most cases)

**Dependency Analysis**:
- Identify shared files between groups
- Detect test dependency chains
- Evaluate risk of concurrent modifications

### Risk Assessment

For each group, evaluate:
- **Complexity**: Based on code structure, file size, existing tests
- **Impact Scope**: Number of files affected, API surface changes
- **Rollback Feasibility**: Ease of reverting changes if tests fail

### Test Strategy

For each group, determine:
- **Test Pattern**: Glob pattern matching affected tests
- **Pass Criteria**: All tests must pass (100% pass rate)
- **Test Command**: Infer from project (package.json, pytest.ini, etc.)

## Output Files

Write to ${sessionDir}:
- ./partial-plan-${batch.batch_id}.json

## Quality Checklist

Before finalizing outputs:
- All batch findings assigned to exactly one group
- Group dependencies (within batch) correctly identified
- Timeline stages respect local dependencies
- Test patterns are valid and specific
- Risk assessments are realistic
`
});

// Wait for completion
const result = wait({
  ids: [agentId],
  timeout_ms: 600000  // 10 minutes
});

// Cleanup
close_agent({ id: agentId });
```

## Output

- Files: `partial-plan-{batch-id}.json` (per agent), `fix-plan.json` (aggregated), `fix-progress-*.json` (initialized)
- Progress: Mark Phase 7 completed, Phase 8 in_progress

## Next Phase

Return to orchestrator, then auto-continue to [Phase 8: Fix Execution](08-fix-execution.md).
