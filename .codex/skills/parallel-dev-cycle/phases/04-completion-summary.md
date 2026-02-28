# Phase 4: Completion & Summary

Generate unified summary report, update final state, close all agents, and provide continuation instructions.

## Objective

- Generate comprehensive cycle summary report
- Update master state file with final status
- Close all agent sessions
- Provide continuation instructions for future iterations
- Output: final cycle report

## Execution

### Step 4.1: Generate Final Summary

```javascript
function generateFinalSummary(cycleId, state) {
  const summaryFile = `${projectRoot}/.workflow/.cycle/${cycleId}.progress/coordination/summary.md`

  const summary = `# Cycle Summary - ${cycleId}

## Metadata
- Cycle ID: ${cycleId}
- Started: ${state.created_at}
- Completed: ${state.completed_at}
- Iterations: ${state.current_iteration}
- Status: ${state.status}

## Phase Results
- Requirements Analysis: ✓ Completed
- Exploration & Planning: ✓ Completed
- Code Development: ✓ Completed
- Validation & Archival: ✓ Completed

## Key Deliverables
- Requirements: ${state.requirements ? '✓' : '✗'}
- Architecture Plan: ${state.plan ? '✓' : '✗'}
- Code Changes: ${state.changes?.length || 0} files
- Test Results: ${state.test_results?.pass_rate || '0'}% passing

## Generated Files
- ${projectRoot}/.workflow/.cycle/${cycleId}.progress/ra/requirements.md
- ${projectRoot}/.workflow/.cycle/${cycleId}.progress/ep/plan.json
- ${projectRoot}/.workflow/.cycle/${cycleId}.progress/cd/changes.log
- ${projectRoot}/.workflow/.cycle/${cycleId}.progress/vas/summary.md

## Continuation Instructions

To extend this cycle:

\`\`\`bash
/parallel-dev-cycle --cycle-id=${cycleId} --extend="New requirement or feedback"
\`\`\`

This will spawn agents for iteration ${state.current_iteration + 1}.
`

  Write(summaryFile, summary)
}
```

### Step 4.2: Update Final State

```javascript
state.status = 'completed'
state.completed_at = getUtc8ISOString()
Write(`${projectRoot}/.workflow/.cycle/${cycleId}.json`, JSON.stringify(state, null, 2))
```

### Step 4.3: Close All Agents

```javascript
Object.values(agents).forEach(id => {
  try {
    close_agent({ id })
  } catch (e) {
    console.warn(`Failed to close agent ${id}`)
  }
})
```

### Step 4.4: Return Result

```javascript
console.log('\n=== Parallel Dev Cycle Finished ===')

return {
  status: 'completed',
  cycle_id: cycleId,
  iterations: iteration,
  final_state: state
}
```

## Output

- **File**: `{projectRoot}/.workflow/.cycle/{cycleId}.progress/coordination/summary.md`
- **File**: `{projectRoot}/.workflow/.cycle/{cycleId}.json` (final state)
- **TodoWrite**: Mark Phase 4 completed (all tasks done)

## Completion

Parallel Dev Cycle has completed. The cycle report is at `{projectRoot}/.workflow/.cycle/{cycleId}.progress/coordination/summary.md`.

To continue iterating:
```bash
/parallel-dev-cycle --cycle-id={cycleId} --extend="Additional requirements or feedback"
```
