---
description: Lightweight bug diagnosis and fix workflow with optimized Codex subagent patterns. Supports severity and scope control.
argument-hint: "BUG=\"<description or error message>\" [--hotfix] [--severity=critical|high|medium|low] [--scope=<path>]"
---

# Workflow Lite-Fix Command (Codex Optimized Version)

## Overview

Intelligent lightweight bug fixing command with **optimized subagent orchestration**. Uses merged mode pattern for context preservation across diagnosis, clarification, and fix planning phases.

**Core Optimizations:**
- **Context Preservation**: Primary agent retained across phases via `send_input()`
- **Merged Mode**: Diagnosis → Merge → Clarify → Plan in single agent context
- **Reduced Agent Cycles**: Minimize spawn/close overhead
- **Dual-Role Pattern**: Single agent handles both exploration and planning (Low/Medium)

**Core capabilities:**
- Intelligent bug analysis with automatic severity detection
- Parallel code diagnosis via Codex subagents (spawn_agent + batch wait)
- **Merged clarification + fix planning** (send_input to retained agent)
- Adaptive fix planning based on severity
- Two-step confirmation: fix-plan display → user approval
- Outputs fix-plan.json file after user confirmation

## Bug Description

**Target bug**: $BUG
**Hotfix mode**: $HOTFIX

- `--hotfix`: Hotfix mode, prioritize speed
- `--severity`: Bug severity (critical|high|medium|low)
- `--scope`: Debug scope limit (file path)

## Execution Modes

### Mode Selection Based on Severity

| Severity | Mode | Pattern | Phases |
|----------|------|---------|--------|
| Low/Medium | 方案A (合并模式) | Single dual-role agent | 2-phase with send_input |
| High/Critical | 方案B (混合模式) | Multi-agent + primary merge | Parallel → Merge → Plan |

## Execution Process

```
Phase 0: Setup & Severity Assessment
   ├─ Parse input (description, error message, or .md file)
   ├─ Create session folder
   ├─ Intelligent severity pre-assessment (Low/Medium/High/Critical)
   └─ Select execution mode (方案A or 方案B)

========== 方案A: Low/Medium Severity (Merged Mode) ==========

Phase 1A: Dual-Role Agent (Diagnosis + Planning)
   ├─ spawn_agent with combined diagnosis + planning role
   ├─ wait for initial diagnosis
   └─ Agent retains context for next phase

Phase 2A: Clarification + Fix Planning (send_input)
   ├─ send_input: clarification answers + "generate fix plan"
   ├─ wait for fix-plan.json generation
   └─ close_agent (single cleanup)

========== 方案B: High/Critical Severity (Mixed Mode) ==========

Phase 1B: Parallel Multi-Angle Diagnosis
   ├─ spawn_agent × N (primary = dual-role, others = explore-only)
   ├─ wait({ ids: [...] }) for all diagnoses
   └─ Collect all diagnosis results

Phase 2B: Merge + Clarify (send_input to primary)
   ├─ close_agent × (N-1) non-primary agents
   ├─ send_input to primary: other agents' diagnoses + "merge findings"
   └─ wait for merged analysis + clarification needs

Phase 3B: Fix Planning (send_input to primary)
   ├─ send_input: clarification answers + "generate fix plan"
   ├─ wait for fix-plan.json generation
   └─ close_agent (primary cleanup)

========== Common Phases ==========

Phase 4: Confirmation
   ├─ Display fix-plan summary (tasks, severity, risk level)
   ├─ Output confirmation request
   └─ STOP and wait for user approval

Phase 5: Output
   └─ Confirm fix-plan.json written to session folder
```

## Implementation

### Phase 0: Setup & Severity Assessment

**Session Setup** (MANDATORY):
```javascript
// Helper: Get UTC+8 (China Standard Time) ISO string
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

const bugSlug = "$BUG".toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40)
const dateStr = getUtc8ISOString().substring(0, 10)  // Format: 2025-11-29

const sessionId = `${bugSlug}-${dateStr}`
const sessionFolder = `.workflow/.lite-fix/${sessionId}`

// Create session folder
mkdir -p ${sessionFolder}
```

**Hotfix Mode Check**:
```javascript
const hotfixMode = "$HOTFIX" === "true"

if (hotfixMode) {
  // Skip diagnosis, go directly to minimal fix planning
  proceed_to_direct_fix()
}
```

**Severity Assessment**:
```javascript
// Analyze bug severity based on symptoms, scope, urgency, impact
const severity = analyzeBugSeverity("$BUG")
// Returns: 'Low' | 'Medium' | 'High' | 'Critical'

// Mode selection
const executionMode = (severity === 'Low' || severity === 'Medium') ? 'A' : 'B'

console.log(`
## Bug Analysis

**Severity**: ${severity}
**Execution Mode**: 方案${executionMode} (${executionMode === 'A' ? '合并模式 - Single Agent' : '混合模式 - Multi-Agent'})
`)
```

**Angle Selection** (for diagnosis):
```javascript
const DIAGNOSIS_ANGLE_PRESETS = {
  runtime_error: ['error-handling', 'dataflow', 'state-management', 'edge-cases'],
  performance: ['performance', 'bottlenecks', 'caching', 'data-access'],
  security: ['security', 'auth-patterns', 'dataflow', 'validation'],
  data_corruption: ['data-integrity', 'state-management', 'transactions', 'validation'],
  ui_bug: ['state-management', 'event-handling', 'rendering', 'data-binding'],
  integration: ['api-contracts', 'error-handling', 'timeouts', 'fallbacks']
}

function selectDiagnosisAngles(bugDescription, count) {
  const text = bugDescription.toLowerCase()
  let preset = 'runtime_error'

  if (/slow|timeout|performance|lag|hang/.test(text)) preset = 'performance'
  else if (/security|auth|permission|access|token/.test(text)) preset = 'security'
  else if (/corrupt|data|lost|missing|inconsistent/.test(text)) preset = 'data_corruption'
  else if (/ui|display|render|style|click|button/.test(text)) preset = 'ui_bug'
  else if (/api|integration|connect|request|response/.test(text)) preset = 'integration'

  return DIAGNOSIS_ANGLE_PRESETS[preset].slice(0, count)
}

const angleCount = severity === 'Critical' ? 4 : (severity === 'High' ? 3 : (severity === 'Medium' ? 2 : 1))
const selectedAngles = selectDiagnosisAngles("$BUG", angleCount)
```

---

## 方案A: Low/Medium Severity (合并模式)

**Pattern**: Single dual-role agent handles diagnosis + clarification + fix planning with context preserved via `send_input()`.

### Phase 1A: Dual-Role Agent (Diagnosis + Planning)

```javascript
// ==================== MERGED MODE ====================

// Step 1: Spawn single dual-role agent (角色文件由 agent 自己读取)
const dualAgent = spawn_agent({
  message: `
## PHASE 1: DIAGNOSIS

### Task Objective
Execute comprehensive diagnosis for bug root cause analysis. You have combined diagnosis + planning capabilities.

### Bug Description
$BUG

### Diagnosis Angles (analyze all)
${selectedAngles.map((angle, i) => `${i + 1}. ${angle}`).join('\n')}

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read diagnosis role**: ~/.codex/agents/cli-explore-agent.md (MUST read first)
2. **Read planning role**: ~/.codex/agents/cli-lite-planning-agent.md (for Phase 2)
3. Run: ccw tool exec get_modules_by_depth '{}' (project structure)
4. Run: rg -l "{error_keyword_from_bug}" --type ts (locate relevant files)
5. Execute: cat ~/.claude/workflows/cli-templates/schemas/diagnosis-json-schema.json
6. Read: .workflow/project-tech.json
7. Read: .workflow/project-guidelines.json

### Diagnosis Tasks
For each angle (${selectedAngles.join(', ')}):
1. **Error Tracing**: rg for error messages, stack traces
2. **Root Cause Analysis**: Identify code paths, edge cases
3. **Affected Files**: List with relevance scores

### Expected Output
1. Write diagnosis to: ${sessionFolder}/diagnosis-merged.json
2. List any clarification needs (questions + options)
3. **DO NOT proceed to fix planning yet** - wait for Phase 2 input

### Clarification Format (if needed)
If you need clarification, output:
\`\`\`json
{
  "clarification_needs": [
    {
      "question": "...",
      "context": "...",
      "options": ["Option 1", "Option 2", "Option 3"],
      "recommended": 0
    }
  ]
}
\`\`\`

### Deliverables for Phase 1
- Write: ${sessionFolder}/diagnosis-merged.json
- Return: Diagnosis summary + clarification needs (if any)
`
})

// Step 3: Wait for diagnosis
const diagnosisResult = wait({
  ids: [dualAgent],
  timeout_ms: 600000  // 10 minutes
})

// Extract clarification needs from result
const clarificationNeeds = extractClarificationNeeds(diagnosisResult.status[dualAgent].completed)
```

**Handle Clarification (if needed)**:
```javascript
if (clarificationNeeds.length > 0) {
  console.log(`
## Clarification Needed

${clarificationNeeds.map((need, index) => `
### Question ${index + 1}

**${need.question}**

Context: ${need.context}

Options:
${need.options.map((opt, i) => `  ${i + 1}. ${opt}${need.recommended === i ? ' ★ (Recommended)' : ''}`).join('\n')}
`).join('\n')}

---

**Please reply with your choices** (e.g., "Q1: 2, Q2: 1") to continue.

**WAITING FOR USER INPUT...**
`)
  // STOP - Wait for user reply
  return
}
```

### Phase 2A: Clarification + Fix Planning (send_input)

```javascript
// After user replies with clarification answers...
const clarificationAnswers = /* user's answers */

// Step 4: send_input for fix planning (CONTEXT PRESERVED)
send_input({
  id: dualAgent,
  message: `
## PHASE 2: FIX PLANNING

### User Clarifications
${clarificationAnswers || "No clarifications needed"}

### Schema Reference
Execute: cat ~/.claude/workflows/cli-templates/schemas/fix-plan-json-schema.json

### Generate Fix Plan
Based on your diagnosis, generate a comprehensive fix plan:

1. Read your diagnosis file: ${sessionFolder}/diagnosis-merged.json
2. Synthesize root cause from all analyzed angles
3. Generate fix-plan.json with:
   - summary: 2-3 sentence overview
   - root_cause: Consolidated from diagnosis
   - strategy: "immediate_patch" | "comprehensive_fix" | "refactor"
   - tasks: 1-3 structured fix tasks (group by fix area)
   - severity: ${severity}
   - risk_level: based on analysis

### Task Grouping Rules
1. Group by fix area (all changes for one fix = one task)
2. Avoid file-per-task pattern
3. Each task = 10-30 minutes of work
4. Prefer parallel tasks (minimal dependencies)

### Deliverables
- Write: ${sessionFolder}/fix-plan.json
- Return: Brief fix plan summary
`
})

// Step 5: Wait for fix planning
const planResult = wait({
  ids: [dualAgent],
  timeout_ms: 600000  // 10 minutes
})

// Step 6: Cleanup (single close)
close_agent({ id: dualAgent })
```

---

## 方案B: High/Critical Severity (混合模式)

**Pattern**: Parallel multi-angle diagnosis → keep primary agent → send_input for merge + clarify + plan.

### Phase 1B: Parallel Multi-Angle Diagnosis

```javascript
// ==================== MIXED MODE ====================

// Step 1: Spawn parallel diagnosis agents (角色文件由 agent 自己读取)
// primary = dual-role (diagnosis + planning)
const diagnosisAgents = selectedAngles.map((angle, index) => {
  const isPrimary = index === 0

  return spawn_agent({
    message: `
## TASK ASSIGNMENT

### Agent Type
${isPrimary ? '**PRIMARY** (Dual-role: Diagnosis + Planning)' : `Secondary (Diagnosis only - angle: ${angle})`}

### Task Objective
Execute **${angle}** diagnosis for bug root cause analysis.

### Bug Description
$BUG

### Diagnosis Angle
${angle}

### Output File
${sessionFolder}/diagnosis-${angle}.json

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read diagnosis role**: ~/.codex/agents/cli-explore-agent.md (MUST read first)
${isPrimary ? '2. **Read planning role**: ~/.codex/agents/cli-lite-planning-agent.md (for Phase 2 & 3)\n3.' : '2.'} Run: ccw tool exec get_modules_by_depth '{}'
${isPrimary ? '4.' : '3.'} Run: rg -l "{error_keyword_from_bug}" --type ts
${isPrimary ? '5.' : '4.'} Execute: cat ~/.claude/workflows/cli-templates/schemas/diagnosis-json-schema.json
${isPrimary ? '6.' : '5.'} Read: .workflow/project-tech.json
${isPrimary ? '7.' : '6.'} Read: .workflow/project-guidelines.json

### Diagnosis Strategy (${angle} focus)
1. **Error Tracing**: rg for error messages, stack traces
2. **Root Cause Analysis**: Code paths, edge cases for ${angle}
3. **Affected Files**: List with ${angle} relevance

### Expected Output
Write: ${sessionFolder}/diagnosis-${angle}.json
Return: 2-3 sentence summary of ${angle} findings

${isPrimary ? `
### PRIMARY AGENT NOTE
You will receive follow-up tasks via send_input:
- Phase 2: Merge other agents' diagnoses
- Phase 3: Generate fix plan
Keep your context ready for continuation.
` : ''}
`
  })
})

// Step 3: Batch wait for ALL diagnosis agents
const diagnosisResults = wait({
  ids: diagnosisAgents,
  timeout_ms: 600000  // 10 minutes
})

// Step 4: Collect all diagnosis results
const allDiagnoses = selectedAngles.map((angle, index) => ({
  angle,
  agentId: diagnosisAgents[index],
  result: diagnosisResults.status[diagnosisAgents[index]].completed,
  file: `${sessionFolder}/diagnosis-${angle}.json`
}))

console.log(`
## Phase 1B Complete

Diagnoses collected:
${allDiagnoses.map(d => `- ${d.angle}: ${d.file}`).join('\n')}
`)
```

### Phase 2B: Merge + Clarify (send_input to primary)

```javascript
// Step 5: Close non-primary agents, keep primary
const primaryAgent = diagnosisAgents[0]
const primaryAngle = selectedAngles[0]

diagnosisAgents.slice(1).forEach(id => close_agent({ id }))

console.log(`
## Phase 2B: Merge Analysis

Closed ${diagnosisAgents.length - 1} secondary agents.
Sending merge task to primary agent (${primaryAngle})...
`)

// Step 6: send_input for merge + clarification
send_input({
  id: primaryAgent,
  message: `
## PHASE 2: MERGE + CLARIFY

### Task
Merge all diagnosis findings and identify clarification needs.

### Your Diagnosis (${primaryAngle})
Already in your context from Phase 1.

### Other Agents' Diagnoses to Merge
${allDiagnoses.slice(1).map(d => `
#### Diagnosis: ${d.angle}
File: ${d.file}
Summary: ${d.result}
`).join('\n')}

### Merge Instructions
1. Read all diagnosis files:
${allDiagnoses.map(d => `   - ${d.file}`).join('\n')}

2. Synthesize findings:
   - Identify common root causes across angles
   - Note conflicting findings
   - Rank confidence levels

3. Write merged analysis: ${sessionFolder}/diagnosis-merged.json

4. List clarification needs (if any):
   - Questions that need user input
   - Options with recommendations

### Expected Output
- Write: ${sessionFolder}/diagnosis-merged.json
- Return: Merged findings summary + clarification needs
`
})

// Step 7: Wait for merge
const mergeResult = wait({
  ids: [primaryAgent],
  timeout_ms: 300000  // 5 minutes
})

// Extract clarification needs
const clarificationNeeds = extractClarificationNeeds(mergeResult.status[primaryAgent].completed)
```

**Handle Clarification (if needed)**:
```javascript
if (clarificationNeeds.length > 0) {
  console.log(`
## Clarification Needed

${clarificationNeeds.map((need, index) => `
### Question ${index + 1}

**${need.question}**

Context: ${need.context}

Options:
${need.options.map((opt, i) => `  ${i + 1}. ${opt}${need.recommended === i ? ' ★ (Recommended)' : ''}`).join('\n')}
`).join('\n')}

---

**Please reply with your choices** to continue.

**WAITING FOR USER INPUT...**
`)
  return
}
```

### Phase 3B: Fix Planning (send_input to primary)

```javascript
// After user replies with clarification answers...
const clarificationAnswers = /* user's answers */

// Step 8: send_input for fix planning (CONTEXT PRESERVED)
send_input({
  id: primaryAgent,
  message: `
## PHASE 3: FIX PLANNING

### User Clarifications
${clarificationAnswers || "No clarifications needed"}

### Schema Reference
Execute: cat ~/.claude/workflows/cli-templates/schemas/fix-plan-json-schema.json

### Generate Fix Plan
Based on your merged diagnosis, generate a comprehensive fix plan:

1. Read merged diagnosis: ${sessionFolder}/diagnosis-merged.json
2. Consider all ${selectedAngles.length} diagnosis angles
3. Generate fix-plan.json with:
   - summary: 2-3 sentence overview
   - root_cause: Consolidated from all diagnoses
   - strategy: "immediate_patch" | "comprehensive_fix" | "refactor"
   - tasks: 1-5 structured fix tasks
   - severity: ${severity}
   - risk_level: based on analysis

### High/Critical Complexity Fields (REQUIRED)
For each task:
- rationale: Why this fix approach
- verification: How to verify success
- risks: Potential issues with fix

### Task Grouping Rules
1. Group by fix area (all changes for one fix = one task)
2. Avoid file-per-task pattern
3. Each task = 10-45 minutes of work
4. True dependencies only (prefer parallel)

### Deliverables
- Write: ${sessionFolder}/fix-plan.json
- Return: Brief fix plan summary
`
})

// Step 9: Wait for fix planning
const planResult = wait({
  ids: [primaryAgent],
  timeout_ms: 600000  // 10 minutes
})

// Step 10: Cleanup primary agent
close_agent({ id: primaryAgent })
```

---

## Common Phases (Both Modes)

### Phase 4: Confirmation

```javascript
const fixPlan = JSON.parse(Read(`${sessionFolder}/fix-plan.json`))

console.log(`
## Fix Plan

**Summary**: ${fixPlan.summary}
**Root Cause**: ${fixPlan.root_cause}
**Strategy**: ${fixPlan.strategy}

**Tasks** (${fixPlan.tasks.length}):
${fixPlan.tasks.map((t, i) => `
### Task ${i+1}: ${t.title}
- **Description**: ${t.description}
- **Scope**: ${t.scope}
- **Action**: ${t.action}
- **Complexity**: ${t.complexity}
- **Dependencies**: ${t.depends_on?.join(', ') || 'None'}
`).join('\n')}

**Severity**: ${fixPlan.severity}
**Risk Level**: ${fixPlan.risk_level}
**Estimated Time**: ${fixPlan.estimated_time}

---

## Confirmation Required

Please review the fix plan above and reply with:

- **"Allow"** - Proceed with this fix plan
- **"Modify"** - Describe what changes you want
- **"Cancel"** - Abort the workflow

**WAITING FOR USER CONFIRMATION...**
`)

return
```

### Phase 5: Output

```javascript
// After User Confirms "Allow"
console.log(`
## Fix Plan Output Complete

**Fix plan file**: ${sessionFolder}/fix-plan.json
**Session folder**: ${sessionFolder}

**Contents**:
- diagnosis-merged.json (or diagnosis-{angle}.json files)
- fix-plan.json

---

You can now use this fix plan with your preferred execution method.
`)
```

---

## Mode Comparison

| Aspect | 方案A (合并模式) | 方案B (混合模式) |
|--------|-----------------|-----------------|
| **Severity** | Low/Medium | High/Critical |
| **Agents** | 1 (dual-role) | N (parallel) → 1 (primary kept) |
| **Phases** | 2 (diagnosis → plan) | 3 (diagnose → merge → plan) |
| **Context** | Fully preserved | Merged via send_input |
| **Overhead** | Minimal | Higher (parallel coordination) |
| **Coverage** | Single comprehensive | Multi-angle deep dive |

## Optimization Benefits

| Aspect | Before (Original) | After (Optimized) |
|--------|-------------------|-------------------|
| **Agent Cycles** | spawn × N → close all → spawn new | spawn → send_input → close once |
| **Context Loss** | Diagnosis context lost before planning | Context preserved via send_input |
| **Merge Process** | None (separate planning agent) | Explicit merge phase (方案B) |
| **Low/Medium** | Same as High/Critical | Simplified single-agent path |

## Session Folder Structure

```
.workflow/.lite-fix/{bug-slug}-{YYYY-MM-DD}/
├── diagnosis-merged.json        # 方案A or merged 方案B
├── diagnosis-{angle1}.json      # 方案B only
├── diagnosis-{angle2}.json      # 方案B only
├── diagnosis-{angle3}.json      # 方案B only (if applicable)
├── diagnosis-{angle4}.json      # 方案B only (if applicable)
└── fix-plan.json                # Fix plan (after confirmation)
```

## Error Handling

| Error | Resolution |
|-------|------------|
| spawn_agent failure | Fallback to direct diagnosis |
| wait() timeout | Use completed results, continue |
| send_input failure | Re-spawn agent with context summary |
| Clarification timeout | Use diagnosis findings as-is |
| Confirmation timeout | Save context, display resume instructions |
| Root cause unclear | Extend diagnosis or escalate to 方案B |

---

**Now execute the lite-fix workflow for bug**: $BUG
