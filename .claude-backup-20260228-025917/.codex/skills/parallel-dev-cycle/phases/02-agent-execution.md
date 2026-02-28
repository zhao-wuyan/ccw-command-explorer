# Phase 2: Agent Execution (Parallel)

Spawn four specialized agents in parallel and wait for all to complete with timeout handling.

## Objective

- Spawn RA, EP, CD, VAS agents simultaneously using Codex subagent pattern
- Pass cycle context, role references, and **discovery protocol** to each agent
- Wait for all agents with configurable timeout
- Handle timeout with convergence request
- Output: agentOutputs from all 4 agents

## Shared Discovery Board

All agents share a discovery board at `{progressDir}/coordination/discoveries.ndjson`. Each agent reads it on start and writes discoveries during execution. This eliminates redundant codebase exploration across agents.

**Agent reads board → skips covered areas → explores unknowns → writes new findings → other agents benefit**

### Discovery Protocol Snippet (injected into every agent prompt)

```
## SHARED DISCOVERY PROTOCOL

Board: ${progressDir}/coordination/discoveries.ndjson

**On Start**: Read board (if exists; if not, skip — you'll be the first writer).
             Skip exploration for areas already covered.
**During Work**: Append discoveries as NDJSON entries via Bash `echo '...' >> discoveries.ndjson`.
**Format**: {"ts":"<ISO8601>","agent":"<role>","type":"<type>","data":{<required fields>}}
**Cross-iteration**: Board persists across iterations. Never clear it.

**You Write** (dedup key in parentheses):
- `<type>` (<dedup key>) → required data: <field1>, <field2>, ...

**You Read**: <comma-separated list of types from other agents>

**Rules**: Read before explore. Write via `echo >>`. Dedup by type+key. Append-only.
```

## Agent Role References

Each agent reads its detailed role definition at execution time:

| Agent | Role File | Main Output |
|-------|-----------|-------------|
| RA | [roles/requirements-analyst.md](../roles/requirements-analyst.md) | requirements.md |
| EP | [roles/exploration-planner.md](../roles/exploration-planner.md) | exploration.md, architecture.md, plan.json |
| CD | [roles/code-developer.md](../roles/code-developer.md) | implementation.md |
| VAS | [roles/validation-archivist.md](../roles/validation-archivist.md) | summary.md |

## Execution

### Step 2.1: Spawn RA Agent (Requirements Analyst)

```javascript
function spawnRAAgent(cycleId, state, progressDir) {
  // Build source references section from prep-package
  const sourceRefsSection = (state.source_refs && state.source_refs.length > 0)
    ? `## REQUIREMENT SOURCE DOCUMENTS

Read these original requirement documents BEFORE analyzing the task:

${state.source_refs
  .filter(r => r.status === 'verified' || r.status === 'linked')
  .map((r, i) => {
    if (r.type === 'local_file' || r.type === 'auto_detected') {
      return `${i + 1}. **Read**: ${r.path} (${r.type})`
    } else if (r.type === 'url') {
      return `${i + 1}. **Reference URL**: ${r.path} (fetch if accessible)`
    }
    return ''
  }).join('\n')}

Use these documents as the primary source of truth for requirements analysis.
Cross-reference the task description against these documents for completeness.
`
    : ''

  // Build focus directive from prep-package
  const focusDirective = getAgentFocusDirective('ra', state)

  return spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/requirements-analyst.md
2. Read: ${projectRoot}/.workflow/project-tech.json (if exists)
3. Read: ${projectRoot}/.workflow/specs/*.md (if exists)
4. Read: ${projectRoot}/.workflow/.cycle/${cycleId}.progress/coordination/feedback.md (if exists)

---

## SHARED DISCOVERY PROTOCOL

Board: ${progressDir}/coordination/discoveries.ndjson

**On Start**: Read board (if exists; if not, skip — you'll be the first writer). Skip exploration for areas already covered.
**During Work**: Append discoveries as NDJSON entries via Bash \`echo '...' >> discoveries.ndjson\`.
**Format**: {"ts":"<ISO8601>","agent":"ra","type":"<type>","data":{<see required fields>}}
**Cross-iteration**: Board persists across iterations. Never clear it.

**You Write** (dedup key in parentheses):
- \`tech_stack\` (singleton) → required data: language, framework, test, build
- \`project_config\` (data.path) → required data: path, key_deps[], scripts{}
- \`existing_feature\` (data.name) → required data: name, files[], summary

**You Read**: architecture, similar_impl, test_baseline, blocker

**Rules**: Read before explore. Write via \`echo >> \`. Dedup by type+key. Append-only.

---

${sourceRefsSection}
## CYCLE CONTEXT

- **Cycle ID**: ${cycleId}
- **Progress Dir**: ${progressDir}/ra/
- **Current Iteration**: ${state.current_iteration}
- **Task Description**: ${state.description}

## CURRENT REQUIREMENTS STATE

${state.requirements ? JSON.stringify(state.requirements, null, 2) : 'No previous requirements'}

## YOUR ROLE

Requirements Analyst - Analyze and refine requirements throughout the cycle.

## RESPONSIBILITIES

1. Analyze initial task description
2. Generate comprehensive requirements specification
3. Identify edge cases and implicit requirements
4. Track requirement changes across iterations
5. Maintain requirements.md and changes.log
6. **Share discoveries** to coordination/discoveries.ndjson
${focusDirective}
## DELIVERABLES

Write files to ${progressDir}/ra/:
- requirements.md: Full requirements specification
- edge-cases.md: Edge case analysis
- changes.log: NDJSON format change tracking

## OUTPUT FORMAT

\`\`\`
PHASE_RESULT:
- phase: ra
- status: success | failed
- files_written: [list]
- summary: one-line summary
- issues: []
\`\`\`
`
  })
}
```

### Step 2.2: Spawn EP Agent (Exploration & Planning)

```javascript
function spawnEPAgent(cycleId, state, progressDir) {
  return spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/exploration-planner.md
2. Read: ${projectRoot}/.workflow/project-tech.json
3. Read: ${projectRoot}/.workflow/specs/*.md
4. Read: ${progressDir}/ra/requirements.md

---

## SHARED DISCOVERY PROTOCOL

Board: ${progressDir}/coordination/discoveries.ndjson

**On Start**: Read board (if exists; if not, skip — you'll be the first writer). Skip exploration for areas already covered.
**During Work**: Append discoveries as NDJSON entries via Bash \`echo '...' >> discoveries.ndjson\`.
**Format**: {"ts":"<ISO8601>","agent":"ep","type":"<type>","data":{<see required fields>}}
**Cross-iteration**: Board persists across iterations. Never clear it.

**You Write** (dedup key in parentheses):
- \`architecture\` (singleton) → required data: pattern, layers[], entry
- \`code_pattern\` (data.name) → required data: name, description, example_file
- \`integration_point\` (data.file) → required data: file, description, exports[]
- \`similar_impl\` (data.feature) → required data: feature, files[], relevance

**You Read**: tech_stack, project_config, existing_feature, test_command, test_baseline

**Rules**: Read before explore. Write via \`echo >> \`. Dedup by type+key. Append-only.

---

## CYCLE CONTEXT

- **Cycle ID**: ${cycleId}
- **Progress Dir**: ${progressDir}/ep/
- **Requirements**: See requirements.md
- **Current Plan**: ${state.plan ? 'Existing' : 'None - first iteration'}

## YOUR ROLE

Exploration & Planning Agent - Explore architecture and generate implementation plan.

## RESPONSIBILITIES

1. Explore codebase architecture
2. Map integration points
3. Design implementation approach
4. Generate plan.json with task breakdown
5. Update or iterate on existing plan
6. **Share discoveries** to coordination/discoveries.ndjson

## DELIVERABLES

Write files to ${progressDir}/ep/:
- exploration.md: Codebase exploration findings
- architecture.md: Architecture design
- plan.json: Implementation plan (structured)

## OUTPUT FORMAT

\`\`\`
PHASE_RESULT:
- phase: ep
- status: success | failed
- files_written: [list]
- summary: one-line summary
- plan_version: X.Y.Z
\`\`\`
`
  })
}
```

### Step 2.3: Spawn CD Agent (Code Developer)

```javascript
function spawnCDAgent(cycleId, state, progressDir) {
  return spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/code-developer.md
2. Read: ${progressDir}/ep/plan.json
3. Read: ${progressDir}/ra/requirements.md

---

## SHARED DISCOVERY PROTOCOL

Board: ${progressDir}/coordination/discoveries.ndjson

**On Start**: Read board (if exists; if not, skip — you'll be the first writer). Skip exploration for areas already covered.
**During Work**: Append discoveries as NDJSON entries via Bash \`echo '...' >> discoveries.ndjson\`.
**Format**: {"ts":"<ISO8601>","agent":"cd","type":"<type>","data":{<see required fields>}}
**Cross-iteration**: Board persists across iterations. Never clear it.

**You Write** (dedup key in parentheses):
- \`code_convention\` (singleton) → required data: naming, imports, formatting
- \`utility\` (data.name) → required data: name, file, usage
- \`test_command\` (singleton) → required data: unit, integration(opt), coverage(opt)
- \`blocker\` (data.issue) → required data: issue, severity, impact

**You Read**: tech_stack, architecture, code_pattern, integration_point, similar_impl, test_baseline, test_command

**Rules**: Read before explore. Write via \`echo >> \`. Dedup by type+key. Append-only.

---

## CYCLE CONTEXT

- **Cycle ID**: ${cycleId}
- **Progress Dir**: ${progressDir}/cd/
- **Plan Version**: ${state.plan?.version || 'N/A'}
- **Previous Changes**: ${state.changes?.length || 0} files

## YOUR ROLE

Code Developer - Implement features based on plan and requirements.

## RESPONSIBILITIES

1. Implement features from plan
2. Track code changes
3. Handle integration issues
4. Maintain code quality
5. Report implementation progress and issues
6. **Share discoveries** to coordination/discoveries.ndjson

## DELIVERABLES

Write files to ${progressDir}/cd/:
- implementation.md: Implementation progress and decisions
- changes.log: NDJSON format, each line: {file, action, timestamp}
- issues.md: Development issues and blockers

## OUTPUT FORMAT

\`\`\`
PHASE_RESULT:
- phase: cd
- status: success | failed | partial
- files_changed: [count]
- summary: one-line summary
- blockers: []
\`\`\`
`
  })
}
```

### Step 2.4: Spawn VAS Agent (Validation & Archival)

```javascript
function spawnVASAgent(cycleId, state, progressDir) {
  return spawn_agent({
    message: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/validation-archivist.md
2. Read: ${progressDir}/cd/changes.log

---

## SHARED DISCOVERY PROTOCOL

Board: ${progressDir}/coordination/discoveries.ndjson

**On Start**: Read board (if exists; if not, skip — you'll be the first writer). Skip exploration for areas already covered.
**During Work**: Append discoveries as NDJSON entries via Bash \`echo '...' >> discoveries.ndjson\`.
**Format**: {"ts":"<ISO8601>","agent":"vas","type":"<type>","data":{<see required fields>}}
**Cross-iteration**: Board persists across iterations. Never clear it.

**You Write** (dedup key in parentheses):
- \`test_baseline\` (singleton) → required data: total, passing, coverage_pct, framework, config
- \`test_pattern\` (singleton) → required data: style, naming, fixtures
- \`test_command\` (singleton) → required data: unit, e2e(opt), coverage(opt)
- \`blocker\` (data.issue) → required data: issue, severity, impact

**You Read**: tech_stack, architecture, code_pattern, code_convention, test_command, utility, integration_point

**Rules**: Read before explore. Write via \`echo >> \`. Dedup by type+key. Append-only.

---

## CYCLE CONTEXT

- **Cycle ID**: ${cycleId}
- **Progress Dir**: ${progressDir}/vas/
- **Changes Count**: ${state.changes?.length || 0}
- **Iteration**: ${state.current_iteration}

## YOUR ROLE

Validation & Archival Specialist - Validate quality and create documentation.

## RESPONSIBILITIES

1. Run tests on implemented features
2. Generate coverage reports
3. Create archival documentation
4. Summarize cycle results
5. Generate version history
6. **Share discoveries** to coordination/discoveries.ndjson

## DELIVERABLES

Write files to ${progressDir}/vas/:
- validation.md: Test validation results
- test-results.json: Detailed test results
- coverage.md: Coverage report
- summary.md: Cycle summary and recommendations

## OUTPUT FORMAT

\`\`\`
PHASE_RESULT:
- phase: vas
- status: success | failed
- test_pass_rate: X%
- coverage: X%
- issues: []
\`\`\`
`
  })
}
```

### Step 2.5: Launch All Agents & Wait

```javascript
// Spawn all 4 agents in parallel
console.log('Spawning agents...')

const agents = {
  ra: spawnRAAgent(cycleId, state, progressDir),
  ep: spawnEPAgent(cycleId, state, progressDir),
  cd: spawnCDAgent(cycleId, state, progressDir),
  vas: spawnVASAgent(cycleId, state, progressDir)
}

// Wait for all agents to complete
console.log('Waiting for all agents...')
const results = wait({
  ids: [agents.ra, agents.ep, agents.cd, agents.vas],
  timeout_ms: 1800000  // 30 minutes
})
```

### Step 2.6: Timeout Handling

```javascript
if (results.timed_out) {
  console.log('Some agents timed out, sending convergence request...')
  Object.entries(agents).forEach(([name, id]) => {
    if (!results.status[id].completed) {
      send_input({
        id: id,
        message: `
## TIMEOUT NOTIFICATION

Execution timeout reached. Please:
1. Output current progress to markdown file
2. Save all state updates
3. Return completion status
`
      })
    }
  })
}
```

## Output

- **Variable**: `agents` - Map of agent names to agent IDs
- **Variable**: `results` - Wait results with completion status for each agent
- **Variable**: `agentOutputs` - Collected outputs from all 4 agents
- **TodoWrite**: Mark Phase 2 completed, Phase 3 in_progress

## Next Phase

Return to main flow, then auto-continue to [Phase 3: Result Aggregation & Iteration](03-result-aggregation.md).
