---
description: Merge multiple planning/brainstorm/analysis outputs, resolve conflicts, and synthesize unified plan. Multi-team input aggregation and plan crystallization
argument-hint: "PATTERN=\"<plan pattern or topic>\" [--rule=consensus|priority|hierarchy] [--output=<path>] [--auto] [--verbose]"
---

# Codex Merge-Plans-With-File Prompt

## Overview

Plan aggregation and conflict resolution workflow. Takes multiple planning artifacts (brainstorm conclusions, analysis recommendations, quick-plans, implementation plans) and synthesizes them into a unified, conflict-resolved execution plan.

**Core workflow**: Load Sources → Parse Plans → Conflict Analysis → Arbitration → Unified Plan

**Key features**:
- **Multi-Source Support**: brainstorm, analysis, quick-plan, IMPL_PLAN, task JSONs
- **Conflict Detection**: Identify contradictions across all input plans
- **Resolution Rules**: consensus, priority-based, or hierarchical resolution
- **Unified Synthesis**: Single authoritative plan from multiple perspectives
- **Decision Tracking**: Full audit trail of conflicts and resolutions

## Target Pattern

**$PATTERN**

- `--rule`: Conflict resolution (consensus | priority | hierarchy) - consensus by default
- `--output`: Output directory (default: .workflow/.merged/{pattern})
- `--auto`: Auto-resolve conflicts using rule, skip confirmations
- `--verbose`: Include detailed conflict analysis

## Execution Process

```
Phase 1: Discovery & Loading
   ├─ Search for artifacts matching pattern
   ├─ Load synthesis.json, conclusions.json, IMPL_PLAN.md, task JSONs
   ├─ Parse into normalized task structure
   └─ Validate completeness

Phase 2: Plan Normalization
   ├─ Convert all formats to common task representation
   ├─ Extract: tasks, dependencies, effort, risks
   ├─ Identify scope and boundaries
   └─ Aggregate recommendations

Phase 3: Conflict Detection (Parallel)
   ├─ Architecture conflicts: different design approaches
   ├─ Task conflicts: overlapping or duplicated tasks
   ├─ Effort conflicts: different estimates
   ├─ Risk conflicts: different risk assessments
   ├─ Scope conflicts: different feature sets
   └─ Generate conflict matrix

Phase 4: Conflict Resolution
   ├─ Analyze source rationale for each conflict
   ├─ Apply resolution rule (consensus / priority / hierarchy)
   ├─ Escalate unresolvable conflicts to user (unless --auto)
   ├─ Document decision rationale
   └─ Generate resolutions.json

Phase 5: Plan Synthesis
   ├─ Merge task lists (deduplicate, combine insights)
   ├─ Integrate dependencies
   ├─ Consolidate effort and risk estimates
   ├─ Generate execution sequence
   └─ Output unified-plan.json

Output:
   ├─ .workflow/.merged/{sessionId}/merge.md (process log)
   ├─ .workflow/.merged/{sessionId}/source-index.json (input sources)
   ├─ .workflow/.merged/{sessionId}/conflicts.json (conflict matrix)
   ├─ .workflow/.merged/{sessionId}/resolutions.json (decisions)
   ├─ .workflow/.merged/{sessionId}/unified-plan.json (for execution)
   └─ .workflow/.merged/{sessionId}/unified-plan.md (human-readable)
```

## Implementation Details

### Phase 1: Discover & Load Sources

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

const mergeSlug = "$PATTERN".toLowerCase()
  .replace(/[*?]/g, '-')
  .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, '-')
  .substring(0, 30)
const sessionId = `MERGE-${mergeSlug}-${getUtc8ISOString().substring(0, 10)}`
const sessionFolder = `.workflow/.merged/${sessionId}`

bash(`mkdir -p ${sessionFolder}`)

// Search paths for matching artifacts
const searchPaths = [
  `.workflow/.brainstorm/*${$PATTERN}*/synthesis.json`,
  `.workflow/.analysis/*${$PATTERN}*/conclusions.json`,
  `.workflow/.planning/*${$PATTERN}*/synthesis.json`,
  `.workflow/.plan/*${$PATTERN}*IMPL_PLAN.md`,
  `.workflow/**/*${$PATTERN}*.json`
]

// Load and validate each source
const sourcePlans = []
for (const pattern of searchPaths) {
  const matches = glob(pattern)
  for (const path of matches) {
    const plan = loadAndParsePlan(path)
    if (plan?.tasks?.length > 0) {
      sourcePlans.push({ path, type: inferType(path), plan })
    }
  }
}
```

### Phase 2: Normalize Plans

Convert all source formats to common structure:

```javascript
const normalizedPlans = sourcePlans.map((src, idx) => ({
  index: idx,
  source: src.path,
  type: src.type,

  metadata: {
    title: src.plan.title || `Plan ${idx + 1}`,
    topic: src.plan.topic,
    complexity: src.plan.complexity_level || 'unknown'
  },

  tasks: src.plan.tasks.map(task => ({
    id: `T${idx}-${task.id || task.title.substring(0, 20)}`,
    title: task.title,
    description: task.description,
    type: task.type || inferTaskType(task),
    priority: task.priority || 'normal',

    effort: { estimated: task.effort_estimate, from_plan: idx },
    risk: { level: task.risk_level || 'medium', from_plan: idx },
    dependencies: task.dependencies || [],

    source_plan_index: idx
  }))
}))
```

### Phase 3: Parallel Conflict Detection

Launch parallel agents to detect and analyze conflicts:

```javascript
// Parallel conflict detection with CLI agents
const conflictPromises = []

// Agent 1: Detect effort and task conflicts
conflictPromises.push(
  Bash({
    command: `ccw cli -p "
PURPOSE: Detect effort conflicts and task duplicates across multiple plans
Success: Complete identification of conflicting estimates and duplicate tasks

TASK:
• Identify tasks with significantly different effort estimates (>50% variance)
• Detect duplicate/similar tasks across plans
• Analyze effort estimation reasoning
• Suggest resolution for each conflict

MODE: analysis

CONTEXT:
- Plan 1: ${JSON.stringify(normalizedPlans[0]?.tasks?.slice(0,3) || [], null, 2)}
- Plan 2: ${JSON.stringify(normalizedPlans[1]?.tasks?.slice(0,3) || [], null, 2)}
- [Additional plans...]

EXPECTED:
- Effort conflicts detected (task name, estimate in each plan, variance %)
- Duplicate task analysis (similar tasks, scope differences)
- Resolution recommendation for each conflict
- Confidence level for each detection

CONSTRAINTS: Focus on significant conflicts (>30% effort variance)
" --tool gemini --mode analysis`,
    run_in_background: true
  })
)

// Agent 2: Analyze architecture and scope conflicts
conflictPromises.push(
  Bash({
    command: \`ccw cli -p "
PURPOSE: Analyze architecture and scope conflicts across plans
Success: Clear identification of design approach differences and scope gaps

TASK:
• Identify different architectural approaches in plans
• Detect scope differences (features included/excluded)
• Analyze design philosophy conflicts
• Suggest approach to reconcile different visions

MODE: analysis

CONTEXT:
- Plan 1 architecture: \${normalizedPlans[0]?.metadata?.complexity || 'unknown'}
- Plan 2 architecture: \${normalizedPlans[1]?.metadata?.complexity || 'unknown'}
- Different design approaches detected: \${JSON.stringify(['approach1', 'approach2'])}

EXPECTED:
- Architecture conflicts identified (approach names and trade-offs)
- Scope conflicts (features/components in plan A but not B, vice versa)
- Design philosophy alignment/misalignment
- Recommendation for unified approach
- Pros/cons of each architectural approach

CONSTRAINTS: Consider both perspectives objectively
" --tool codex --mode analysis\`,
    run_in_background: true
  })
)

// Agent 3: Analyze risk assessment conflicts
conflictPromises.push(
  Bash({
    command: \`ccw cli -p "
PURPOSE: Analyze risk assessment conflicts across plans
Success: Unified risk assessment with conflict resolution

TASK:
• Identify tasks/areas with significantly different risk ratings
• Analyze risk assessment reasoning
• Detect missing risks in some plans
• Propose unified risk assessment

MODE: analysis

CONTEXT:
- Risk areas with disagreement: [list areas]
- Plan 1 risk ratings: [risk matrix]
- Plan 2 risk ratings: [risk matrix]

EXPECTED:
- Risk conflicts identified (area, plan A rating, plan B rating)
- Explanation of why assessments differ
- Missing risks analysis (important in one plan but not others)
- Unified risk rating recommendation
- Confidence level for each assessment

CONSTRAINTS: Be realistic in risk assessment, not pessimistic
" --tool claude --mode analysis\`,
    run_in_background: true
  })
)

// Agent 4: Synthesize conflicts into resolution strategy
conflictPromises.push(
  Bash({
    command: \`ccw cli -p "
PURPOSE: Synthesize all conflicts into unified resolution strategy
Success: Clear path to merge plans with informed trade-off decisions

TASK:
• Analyze all detected conflicts holistically
• Identify which conflicts are critical vs. non-critical
• Propose resolution for each conflict type
• Suggest unified approach that honors valid insights from all plans

MODE: analysis

CONTEXT:
- Total conflicts detected: [number]
- Conflict types: effort, architecture, scope, risk
- Resolution rule: \${resolutionRule}
- Plan importance: \${normalizedPlans.map(p => p.metadata.title).join(', ')}

EXPECTED:
- Conflict priority ranking (critical, important, minor)
- Recommended resolution for each conflict
- Rationale for each recommendation
- Potential issues with proposed resolution
- Fallback options if recommendation not accepted
- Overall merge strategy and sequencing

CONSTRAINTS: Aim for solution that maximizes learning from all perspectives
" --tool gemini --mode analysis\`,
    run_in_background: true
  })
)

// Wait for all conflict detection agents to complete
const [effortConflicts, archConflicts, riskConflicts, resolutionStrategy] =
  await Promise.all(conflictPromises)

// Parse and consolidate all conflict findings
const allConflicts = {
  effort: parseEffortConflicts(effortConflicts),
  architecture: parseArchConflicts(archConflicts),
  risk: parseRiskConflicts(riskConflicts),
  strategy: parseResolutionStrategy(resolutionStrategy),
  timestamp: getUtc8ISOString()
}

Write(\`\${sessionFolder}/conflicts.json\`, JSON.stringify(allConflicts, null, 2))
```

**Conflict Detection Workflow**:

| Agent | Conflict Type | Focus | Output |
|-------|--------------|--------|--------|
| Gemini | Effort & Tasks | Duplicate detection, estimate variance | Conflicts with variance %, resolution suggestions |
| Codex | Architecture & Scope | Design approach differences | Design conflicts, scope gaps, recommendations |
| Claude | Risk Assessment | Risk rating disagreements | Risk conflicts, missing risks, unified assessment |
| Gemini | Resolution Strategy | Holistic synthesis | Priority ranking, resolution path, trade-offs |

### Phase 4: Resolve Conflicts

**Rule: Consensus (default)**
- Use median/average of conflicting estimates
- Merge scope differences
- Document minority viewpoints

**Rule: Priority**
- First plan has highest authority
- Later plans supplement but don't override

**Rule: Hierarchy**
- User ranks plan importance
- Higher-ranked plan wins conflicts

```javascript
const resolutions = {}

if (rule === 'consensus') {
  for (const conflict of conflicts.effort) {
    resolutions[conflict.task] = {
      resolved: calculateMedian(conflict.estimates),
      method: 'consensus-median',
      rationale: 'Used median of all estimates'
    }
  }
} else if (rule === 'priority') {
  for (const conflict of conflicts.effort) {
    const primary = conflict.estimates[0] // First plan
    resolutions[conflict.task] = {
      resolved: primary.value,
      method: 'priority-based',
      rationale: `Selected from plan ${primary.from_plan} (highest priority)`
    }
  }
} else if (rule === 'hierarchy') {
  // Request user ranking if not --auto
  const ranking = getUserPlanRanking(normalizedPlans)
  // Apply hierarchy-based resolution
}

Write(`${sessionFolder}/resolutions.json`, JSON.stringify(resolutions, null, 2))
```

### Phase 5: Generate Unified Plan

```javascript
const unifiedPlan = {
  session_id: sessionId,
  merge_timestamp: getUtc8ISOString(),

  summary: {
    total_source_plans: sourcePlans.length,
    original_tasks: allTasks.length,
    merged_tasks: deduplicatedTasks.length,
    conflicts_resolved: Object.keys(resolutions).length,
    resolution_rule: rule
  },

  tasks: deduplicatedTasks.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    effort: task.resolved_effort,
    risk: task.resolved_risk,
    dependencies: task.merged_dependencies,
    source_plans: task.contributing_plans
  })),

  execution_sequence: topologicalSort(tasks),
  critical_path: identifyCriticalPath(tasks),

  risks: aggregateRisks(tasks),
  success_criteria: aggregateCriteria(tasks)
}

Write(`${sessionFolder}/unified-plan.json`, JSON.stringify(unifiedPlan, null, 2))
```

### Phase 6: Generate Human-Readable Plan

```markdown
# Merged Planning Session

**Session ID**: ${sessionId}
**Pattern**: $PATTERN
**Created**: ${timestamp}

---

## Merge Summary

**Source Plans**: ${summary.total_source_plans}
**Original Tasks**: ${summary.original_tasks}
**Merged Tasks**: ${summary.merged_tasks}
**Conflicts Resolved**: ${summary.conflicts_resolved}
**Resolution Method**: ${summary.resolution_rule}

---

## Unified Task List

${tasks.map((task, i) => `
${i+1}. **${task.id}: ${task.title}**
   - Effort: ${task.effort}
   - Risk: ${task.risk}
   - From plans: ${task.source_plans.join(', ')}
`).join('\n')}

---

## Execution Sequence

**Critical Path**: ${critical_path.join(' → ')}

---

## Conflict Resolution Report

${Object.entries(resolutions).map(([key, res]) => `
- **${key}**: ${res.rationale}
`).join('\n')}

---

## Next Steps

**Execute**:
\`\`\`
/workflow:unified-execute-with-file -p ${sessionFolder}/unified-plan.json
\`\`\`
```

## Session Folder Structure

```
.workflow/.merged/{sessionId}/
├── merge.md              # Process log
├── source-index.json     # All input sources
├── conflicts.json        # Detected conflicts
├── resolutions.json      # How resolved
├── unified-plan.json     # Merged plan (for execution)
└── unified-plan.md       # Human-readable
```

## Resolution Rules Comparison

| Rule | Method | Best For | Tradeoff |
|------|--------|----------|----------|
| **Consensus** | Median/average | Similar-quality inputs | May miss extremes |
| **Priority** | First wins | Clear authority order | Discards alternatives |
| **Hierarchy** | User-ranked | Mixed stakeholders | Needs user input |

## Input Format Support

| Source Type | Detection Pattern | Parsing |
|-------------|-------------------|---------|
| Brainstorm | `.brainstorm/*/synthesis.json` | Top ideas → tasks |
| Analysis | `.analysis/*/conclusions.json` | Recommendations → tasks |
| Quick-Plan | `.planning/*/synthesis.json` | Direct task list |
| IMPL_PLAN | `*IMPL_PLAN.md` | Markdown → tasks |
| Task JSON | `*.json` with `tasks` | Direct mapping |

## Error Handling

| Situation | Action |
|-----------|--------|
| No plans found | List available plans, suggest search terms |
| Incompatible format | Skip, continue with others |
| Circular dependencies | Alert user, suggest manual review |
| Unresolvable conflict | Require user decision (unless --auto) |

## Integration Flow

```
Brainstorm Sessions / Analyses / Plans
         │
         ├─ synthesis.json (session 1)
         ├─ conclusions.json (session 2)
         ├─ synthesis.json (session 3)
         │
         ▼
merge-plans-with-file
         │
         ├─ unified-plan.json
         │
         ▼
unified-execute-with-file
         │
         ▼
Implementation
```

## Usage Patterns

**Pattern 1: Merge all auth-related plans**
```
PATTERN="authentication" --rule=consensus --auto
→ Finds all auth plans
→ Merges with consensus method
```

**Pattern 2: Prioritized merge**
```
PATTERN="payment" --rule=priority
→ First plan has authority
→ Others supplement
```

**Pattern 3: Team input merge**
```
PATTERN="feature-*" --rule=hierarchy
→ Asks for plan ranking
→ Applies hierarchy resolution
```

---

**Now execute merge-plans-with-file for pattern**: $PATTERN
