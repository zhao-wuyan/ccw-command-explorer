# Phase 3: Result Aggregation & Iteration

Parse agent outputs, detect issues, generate feedback, and manage the iteration loop.

## Objective

- Parse PHASE_RESULT from each agent's output
- Aggregate results into unified state
- Detect issues (test failures, blockers)
- Generate targeted feedback for affected agents
- Manage iteration loop (continue or proceed to completion)
- Output: parsedResults, iteration decision

## Execution

### Step 3.1: Collect Agent Outputs

```javascript
// Collect outputs from all 4 agents
const agentOutputs = {
  ra: results.status[agents.ra].completed,
  ep: results.status[agents.ep].completed,
  cd: results.status[agents.cd].completed,
  vas: results.status[agents.vas].completed
}
```

### Step 3.2: Parse PHASE_RESULT

Each agent outputs a structured PHASE_RESULT block. Parse it to extract status and data:

```javascript
function parseAgentOutputs(agentOutputs) {
  const results = {
    ra: parseOutput(agentOutputs.ra, 'ra'),
    ep: parseOutput(agentOutputs.ep, 'ep'),
    cd: parseOutput(agentOutputs.cd, 'cd'),
    vas: parseOutput(agentOutputs.vas, 'vas')
  }
  return results
}

function parseOutput(output, agent) {
  const result = {
    agent: agent,
    status: 'unknown',
    data: {}
  }

  // Parse PHASE_RESULT block
  const match = output.match(/PHASE_RESULT:\s*([\s\S]*?)(?:\n\n|$)/)
  if (match) {
    const lines = match[1].split('\n')
    for (const line of lines) {
      const m = line.match(/^-\s*(\w+):\s*(.+)$/)
      if (m) {
        result[m[1]] = m[2].trim()
      }
    }
  }

  return result
}
```

### Step 3.3: Update State with Results

```javascript
// Update agent states
state.agents.ra.status = 'completed'
state.agents.ep.status = 'completed'
state.agents.cd.status = 'completed'
state.agents.vas.status = 'completed'

// Update shared context from parsed results
state.requirements = parsedResults.ra.requirements
state.exploration = parsedResults.ep.exploration
state.plan = parsedResults.ep.plan
state.changes = parsedResults.cd.changes
state.test_results = parsedResults.vas.test_results

state.completed_phases.push(...['ra', 'ep', 'cd', 'vas'])
state.updated_at = getUtc8ISOString()

// Persist state
Write(`${projectRoot}/.workflow/.cycle/${cycleId}.json`, JSON.stringify(state, null, 2))
```

### Step 3.4: Issue Detection

```javascript
const hasIssues = parsedResults.vas.test_results?.passed === false ||
                 parsedResults.cd.issues?.length > 0

if (hasIssues && iteration < maxIterations) {
  console.log('Issues detected, preparing for next iteration...')
  // → Proceed to Step 3.5 (Feedback Generation)
} else if (!hasIssues) {
  console.log('All phases completed successfully')
  // → Proceed to Phase 4
} else if (iteration >= maxIterations) {
  console.log(`Reached maximum iterations (${maxIterations})`)
  // → Proceed to Phase 4 with issues documented
}
```

### Step 3.5: Feedback Generation

Generate targeted feedback based on issue type:

```javascript
function generateFeedback(parsedResults) {
  const feedback = {}

  // Check VAS results → feedback to CD
  if (parsedResults.vas.test_pass_rate < 100) {
    feedback.cd = `
## FEEDBACK FROM VALIDATION

Test pass rate: ${parsedResults.vas.test_pass_rate}%

## ISSUES TO FIX

${parsedResults.vas.data.issues || 'See test-results.json for details'}

## NEXT STEP

Fix failing tests and update implementation.md with resolution.
`
  }

  // Check CD blockers → feedback to RA
  if (parsedResults.cd.blockers?.length > 0) {
    feedback.ra = `
## FEEDBACK FROM DEVELOPMENT

Blockers encountered:
${parsedResults.cd.blockers.map(b => `- ${b}`).join('\n')}

## NEXT STEP

Clarify requirements or identify alternative approaches.
Update requirements.md if needed.
`
  }

  return feedback
}
```

### Step 3.6: Send Feedback via send_input

```javascript
const feedback = generateFeedback(parsedResults)

// Send feedback to relevant agents
if (feedback.ra) {
  send_input({
    id: agents.ra,
    message: feedback.ra
  })
}

if (feedback.cd) {
  send_input({
    id: agents.cd,
    message: feedback.cd
  })
}

// Wait for agents to process feedback and update
const updatedResults = wait({
  ids: [agents.ra, agents.cd].filter(Boolean),
  timeout_ms: 900000  // 15 minutes for fixes
})

console.log('Agents updated, continuing...')
```

### Step 3.7: Iteration Loop Decision

```javascript
// After feedback processing, decide next action:
//
// Option A: Issues remain AND iteration < max
//   → Loop back to Phase 2 (re-spawn or continue agents)
//
// Option B: No issues remaining
//   → Proceed to Phase 4 (Completion)
//
// Option C: Max iterations reached
//   → Proceed to Phase 4 with issues documented

if (hasIssues && iteration < maxIterations) {
  // Continue iteration loop
  iteration++
  state.current_iteration = iteration
  // → Back to Phase 2
} else {
  // Exit loop → Phase 4
  continueLoop = false
}
```

## Iteration Flow Diagram

```
Phase 2: Agent Execution
    ↓
Phase 3: Result Aggregation
    ↓
┌─ Issues detected?
│   ├─ No → Phase 4 (Complete)
│   └─ Yes
│       ├─ iteration < max?
│       │   ├─ Yes → Generate feedback → send_input → Wait → Back to Phase 2
│       │   └─ No → Phase 4 (Complete with issues)
```

## Output

- **Variable**: `parsedResults` - Parsed results from all 4 agents
- **Variable**: `hasIssues` - Boolean indicating if issues were found
- **Variable**: `continueLoop` - Boolean indicating if iteration should continue
- **TodoWrite**: Mark Phase 3 completed, Phase 4 in_progress (or loop)

## Next Phase

If iteration continues: Return to Phase 2.
If iteration completes: Return to main flow, then auto-continue to [Phase 4: Completion & Summary](04-completion-summary.md).
