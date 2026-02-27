# Action: DEBUG

Hypothesis-driven debugging with understanding evolution documentation.

## Purpose

- Locate error source
- Generate testable hypotheses
- Add NDJSON instrumentation
- Analyze log evidence
- Correct understanding based on evidence
- Apply fixes

## Preconditions

- [ ] state.status === 'running'
- [ ] state.skill_state !== null

## Mode Detection

```javascript
const understandingPath = `${progressDir}/debug.md`
const debugLogPath = `${progressDir}/debug.log`

const understandingExists = fs.existsSync(understandingPath)
const logHasContent = fs.existsSync(debugLogPath) && fs.statSync(debugLogPath).size > 0

const debugMode = logHasContent ? 'analyze' : (understandingExists ? 'continue' : 'explore')
```

## Execution Steps

### Mode: Explore (First Debug)

#### Step E1: Get Bug Description

```javascript
// From test failures or user input
const bugDescription = state.skill_state.validate?.failed_tests?.[0]
  || await getUserInput('Describe the bug:')
```

#### Step E2: Search Codebase

```javascript
// Use ACE search_context to find related code
const searchResults = mcp__ace-tool__search_context({
  project_root_path: '.',
  query: `code related to: ${bugDescription}`
})
```

#### Step E3: Generate Hypotheses

```javascript
const hypotheses = [
  {
    id: 'H1',
    description: 'Most likely cause',
    testable_condition: 'What to check',
    logging_point: 'file.ts:functionName:42',
    evidence_criteria: {
      confirm: 'If we see X, hypothesis confirmed',
      reject: 'If we see Y, hypothesis rejected'
    },
    likelihood: 1,
    status: 'pending',
    evidence: null,
    verdict_reason: null
  },
  // H2, H3...
]
```

#### Step E4: Create Understanding Document

```javascript
const initialUnderstanding = `# Understanding Document

**Loop ID**: ${loopId}
**Bug Description**: ${bugDescription}
**Started**: ${getUtc8ISOString()}

---

## Exploration Timeline

### Iteration 1 - Initial Exploration (${getUtc8ISOString()})

#### Current Understanding

Based on bug description and code search:

- Error pattern: [identified pattern]
- Affected areas: [files/modules]
- Initial hypothesis: [first thoughts]

#### Evidence from Code Search

[Search results summary]

#### Hypotheses

${hypotheses.map(h => `
**${h.id}**: ${h.description}
- Testable condition: ${h.testable_condition}
- Logging point: ${h.logging_point}
- Likelihood: ${h.likelihood}
`).join('\n')}

---

## Current Consolidated Understanding

[Summary of what we know so far]
`

Write(understandingPath, initialUnderstanding)
Write(`${progressDir}/hypotheses.json`, JSON.stringify({ hypotheses, iteration: 1 }, null, 2))
```

#### Step E5: Add NDJSON Logging Points

```javascript
// For each hypothesis, add instrumentation
for (const hypothesis of hypotheses) {
  const [file, func, line] = hypothesis.logging_point.split(':')

  const logStatement = `console.log(JSON.stringify({
    hid: "${hypothesis.id}",
    ts: Date.now(),
    func: "${func}",
    data: { /* relevant context */ }
  }))`

  // Add to file using Edit tool
}
```

### Mode: Analyze (Has Logs)

#### Step A1: Parse Debug Log

```javascript
const logContent = Read(debugLogPath)
const entries = logContent.split('\n')
  .filter(l => l.trim())
  .map(l => JSON.parse(l))

// Group by hypothesis ID
const byHypothesis = entries.reduce((acc, e) => {
  acc[e.hid] = acc[e.hid] || []
  acc[e.hid].push(e)
  return acc
}, {})
```

#### Step A2: Evaluate Evidence

```javascript
const hypothesesData = JSON.parse(Read(`${progressDir}/hypotheses.json`))

for (const hypothesis of hypothesesData.hypotheses) {
  const evidence = byHypothesis[hypothesis.id] || []

  // Evaluate against criteria
  if (matchesConfirmCriteria(evidence, hypothesis.evidence_criteria.confirm)) {
    hypothesis.status = 'confirmed'
    hypothesis.evidence = evidence
    hypothesis.verdict_reason = 'Evidence matches confirm criteria'
  } else if (matchesRejectCriteria(evidence, hypothesis.evidence_criteria.reject)) {
    hypothesis.status = 'rejected'
    hypothesis.evidence = evidence
    hypothesis.verdict_reason = 'Evidence matches reject criteria'
  } else {
    hypothesis.status = 'inconclusive'
    hypothesis.evidence = evidence
    hypothesis.verdict_reason = 'Insufficient evidence'
  }
}
```

#### Step A3: Update Understanding

```javascript
const iteration = hypothesesData.iteration + 1
const timestamp = getUtc8ISOString()

const analysisEntry = `
### Iteration ${iteration} - Evidence Analysis (${timestamp})

#### Log Analysis Results

${hypothesesData.hypotheses.map(h => `
**${h.id}**: ${h.status.toUpperCase()}
- Evidence: ${JSON.stringify(h.evidence?.slice(0, 3))}
- Reasoning: ${h.verdict_reason}
`).join('\n')}

#### Corrected Understanding

[Any corrections to previous assumptions]

${confirmedHypothesis ? `
#### Root Cause Identified

**${confirmedHypothesis.id}**: ${confirmedHypothesis.description}
` : `
#### Next Steps

[What to investigate next]
`}

---
`

const existingUnderstanding = Read(understandingPath)
Write(understandingPath, existingUnderstanding + analysisEntry)
```

### Step: Update State

```javascript
state.skill_state.debug.active_bug = bugDescription
state.skill_state.debug.hypotheses = hypothesesData.hypotheses
state.skill_state.debug.hypotheses_count = hypothesesData.hypotheses.length
state.skill_state.debug.iteration = iteration
state.skill_state.debug.last_analysis_at = timestamp

if (confirmedHypothesis) {
  state.skill_state.debug.confirmed_hypothesis = confirmedHypothesis.id
}

state.skill_state.last_action = 'DEBUG'
state.updated_at = timestamp
Write(`.workflow/.loop/${loopId}.json`, JSON.stringify(state, null, 2))
```

## Output Format

```
ACTION_RESULT:
- action: DEBUG
- status: success
- message: {Mode description} - {result summary}
- state_updates: {
    "debug.iteration": {N},
    "debug.confirmed_hypothesis": "{id or null}"
  }

FILES_UPDATED:
- .workflow/.loop/{loopId}.progress/debug.md: Understanding updated
- .workflow/.loop/{loopId}.progress/hypotheses.json: Hypotheses updated
- [Source files]: Instrumentation added

NEXT_ACTION_NEEDED: {DEBUG | VALIDATE | DEVELOP | MENU}
```

## Next Action Selection

```javascript
if (confirmedHypothesis) {
  // Root cause found, apply fix and validate
  return 'VALIDATE'
} else if (allRejected) {
  // Generate new hypotheses
  return 'DEBUG'
} else {
  // Need more evidence - prompt user to reproduce bug
  return 'WAITING_INPUT'  // User needs to trigger bug
}
```

## Error Handling

| Error Type | Recovery |
|------------|----------|
| Empty debug.log | Prompt user to reproduce bug |
| All hypotheses rejected | Generate new hypotheses |
| >5 iterations | Suggest escalation |

## Next Actions

- Root cause found: `VALIDATE`
- Need more evidence: `DEBUG` (after reproduction)
- All rejected: `DEBUG` (new hypotheses)
