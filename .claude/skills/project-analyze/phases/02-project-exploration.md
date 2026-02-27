# Phase 2: Project Exploration

Launch parallel exploration agents based on report type and task context.

## Execution

### Step 1: Intelligent Angle Selection

```javascript
// Angle presets based on report type (adapted from lite-plan.md)
const ANGLE_PRESETS = {
  architecture: ['layer-structure', 'module-dependencies', 'entry-points', 'data-flow'],
  design: ['design-patterns', 'class-relationships', 'interface-contracts', 'state-management'],
  methods: ['core-algorithms', 'critical-paths', 'public-apis', 'complex-logic'],
  comprehensive: ['architecture', 'patterns', 'dependencies', 'integration-points']
};

// Depth-based angle count
const angleCount = {
  shallow: 2,
  standard: 3,
  deep: 4
};

function selectAngles(reportType, depth) {
  const preset = ANGLE_PRESETS[reportType] || ANGLE_PRESETS.comprehensive;
  const count = angleCount[depth] || 3;
  return preset.slice(0, count);
}

const selectedAngles = selectAngles(config.type, config.depth);

console.log(`
## Exploration Plan

Report Type: ${config.type}
Depth: ${config.depth}
Selected Angles: ${selectedAngles.join(', ')}

Launching ${selectedAngles.length} parallel explorations...
`);
```

### Step 2: Launch Parallel Agents (Direct Output)

**⚠️ CRITICAL**: Agents write output files directly. No aggregation needed.

```javascript
// Launch agents with pre-assigned angles
const explorationTasks = selectedAngles.map((angle, index) =>
  Task({
    subagent_type: "cli-explore-agent",
    run_in_background: false,  // ⚠️ MANDATORY: Must wait for results
    description: `Explore: ${angle}`,
    prompt: `
## Exploration Objective
Execute **${angle}** exploration for ${config.type} project analysis report.

## Assigned Context
- **Exploration Angle**: ${angle}
- **Report Type**: ${config.type}
- **Depth**: ${config.depth}
- **Scope**: ${config.scope}
- **Exploration Index**: ${index + 1} of ${selectedAngles.length}
- **Output File**: ${sessionFolder}/exploration-${angle}.json

## MANDATORY FIRST STEPS (Execute by Agent)
**You (cli-explore-agent) MUST execute these steps in order:**
1. Run: ccw tool exec get_modules_by_depth '{}' (project structure)
2. Run: rg -l "{relevant_keyword}" --type ts (locate relevant files)
3. Analyze project from ${angle} perspective

## Exploration Strategy (${angle} focus)

**Step 1: Structural Scan** (Bash)
- get_modules_by_depth.sh → identify modules related to ${angle}
- find/rg → locate files relevant to ${angle} aspect
- Analyze imports/dependencies from ${angle} perspective

**Step 2: Semantic Analysis** (Gemini/Qwen CLI)
- How does existing code handle ${angle} concerns?
- What patterns are used for ${angle}?
- Identify key architectural decisions related to ${angle}

**Step 3: Write Output Directly**
- Consolidate ${angle} findings into JSON
- Write to output file path specified above

## Expected Output Schema

**File**: ${sessionFolder}/exploration-${angle}.json

\`\`\`json
{
  "angle": "${angle}",
  "findings": {
    "structure": [
      { "component": "...", "type": "module|layer|service", "description": "..." }
    ],
    "patterns": [
      { "name": "...", "usage": "...", "files": ["path1", "path2"] }
    ],
    "relationships": [
      { "from": "...", "to": "...", "type": "depends|imports|calls", "strength": "high|medium|low" }
    ],
    "key_files": [
      { "path": "src/file.ts", "relevance": 0.85, "rationale": "Core ${angle} logic" }
    ]
  },
  "insights": [
    { "observation": "...", "impact": "high|medium|low", "recommendation": "..." }
  ],
  "_metadata": {
    "exploration_angle": "${angle}",
    "exploration_index": ${index + 1},
    "report_type": "${config.type}",
    "timestamp": "ISO8601"
  }
}
\`\`\`

## Success Criteria
- [ ] get_modules_by_depth.sh executed
- [ ] At least 3 relevant files identified with ${angle} rationale
- [ ] Patterns are actionable (code examples, not generic advice)
- [ ] Relationships include concrete file references
- [ ] JSON output written to ${sessionFolder}/exploration-${angle}.json
- [ ] Return: 2-3 sentence summary of ${angle} findings
`
  })
);

// Execute all exploration tasks in parallel
```

## Output

Session folder structure after exploration:

```
${sessionFolder}/
├── exploration-{angle1}.json      # Agent 1 direct output
├── exploration-{angle2}.json      # Agent 2 direct output
├── exploration-{angle3}.json      # Agent 3 direct output (if applicable)
└── exploration-{angle4}.json      # Agent 4 direct output (if applicable)
```

## Downstream Usage (Phase 3 Analysis Input)

Subsequent analysis phases MUST read exploration outputs as input:

```javascript
// Discover exploration files by known angle pattern
const explorationData = {};
selectedAngles.forEach(angle => {
  const filePath = `${sessionFolder}/exploration-${angle}.json`;
  explorationData[angle] = JSON.parse(Read(filePath));
});

// Pass to analysis agent
Task({
  subagent_type: "analysis-agent",
  prompt: `
## Analysis Input

### Exploration Data by Angle
${Object.entries(explorationData).map(([angle, data]) => `
#### ${angle}
${JSON.stringify(data, null, 2)}
`).join('\n')}

## Analysis Task
Synthesize findings from all exploration angles...
`
});
```
