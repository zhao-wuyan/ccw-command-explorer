# Command: research

Gather context for a phase before creating execution plans. Explores the codebase, reads requirements from roadmap, and produces a structured context.md file.

## Purpose

Build a comprehensive understanding of the phase's scope by combining roadmap requirements, prior phase outputs, and codebase analysis. The resulting context.md is the sole input for the create-plans command.

## When to Use

- Phase 2 of planner execution (after task discovery, before plan creation)
- Called once per PLAN-* task (including gap closure iterations)

## Strategy

Subagent delegation (cli-explore-agent) for codebase exploration, supplemented by optional Gemini CLI for deep analysis when depth warrants it. Planner does NOT explore the codebase directly -- it delegates.

## Parameters

| Parameter | Source | Description |
|-----------|--------|-------------|
| `sessionFolder` | From PLAN-* task description | Session artifact directory |
| `phaseNumber` | From PLAN-* task description | Phase to research (1-based) |
| `depth` | From config.json or task description | "quick" / "standard" / "comprehensive" |

## Execution Steps

### Step 1: Read Roadmap and Extract Phase Requirements

```javascript
const roadmap = Read(`${sessionFolder}/roadmap.md`)
const config = JSON.parse(Read(`${sessionFolder}/config.json`))
const depth = config.depth || "standard"

// Parse phase section from roadmap
// Extract: goal, requirements (REQ-IDs), success criteria
const phaseSection = extractPhaseSection(roadmap, phaseNumber)
const phaseGoal = phaseSection.goal
const requirements = phaseSection.requirements    // [{id: "REQ-101", desc: "..."}, ...]
const successCriteria = phaseSection.successCriteria  // ["testable behavior 1", ...]
```

### Step 2: Read Prior Phase Context (if applicable)

```javascript
const priorContext = []

if (phaseNumber > 1) {
  // Load summaries from previous phases for dependency context
  for (let p = 1; p < phaseNumber; p++) {
    try {
      const summary = Glob(`${sessionFolder}/phase-${p}/summary-*.md`)
      for (const summaryFile of summary) {
        priorContext.push({
          phase: p,
          file: summaryFile,
          content: Read(summaryFile)
        })
      }
    } catch {
      // Prior phase may not have summaries yet (first phase)
    }

    // Also load verification results for dependency awareness
    try {
      const verification = Read(`${sessionFolder}/phase-${p}/verification.md`)
      priorContext.push({
        phase: p,
        file: `${sessionFolder}/phase-${p}/verification.md`,
        content: verification
      })
    } catch {}
  }
}

// For gap closure: load the verification that triggered re-planning
const isGapClosure = planTaskDescription.includes("Gap closure")
let gapContext = null
if (isGapClosure) {
  gapContext = Read(`${sessionFolder}/phase-${phaseNumber}/verification.md`)
}
```

### Step 3: Codebase Exploration via cli-explore-agent

```javascript
// Build exploration query from requirements
const explorationQuery = requirements.map(r => r.desc).join('; ')

const exploreResult = Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: `Explore codebase for phase ${phaseNumber} requirements`,
  prompt: `Explore this codebase to gather context for the following requirements:

## Phase Goal
${phaseGoal}

## Requirements
${requirements.map(r => `- ${r.id}: ${r.desc}`).join('\n')}

## Success Criteria
${successCriteria.map(c => `- ${c}`).join('\n')}

## What to Find
1. Files that will need modification to satisfy these requirements
2. Existing patterns and conventions relevant to this work
3. Dependencies and integration points
4. Test patterns used in this project
5. Configuration or schema files that may need updates

## Output Format
Provide a structured summary:
- **Relevant Files**: List of files with brief description of relevance
- **Patterns Found**: Coding patterns, naming conventions, architecture patterns
- **Dependencies**: Internal and external dependencies that affect this work
- **Test Infrastructure**: Test framework, test file locations, test patterns
- **Risks**: Potential issues or complications discovered`
})
```

### Step 4: Optional Deep Analysis via Gemini CLI

```javascript
// Only for comprehensive depth or complex phases
if (depth === "comprehensive") {
  const analysisResult = Bash({
    command: `ccw cli -p "PURPOSE: Deep codebase analysis for implementation planning. Phase goal: ${phaseGoal}
TASK: \
  - Analyze module boundaries and coupling for affected files \
  - Identify shared utilities and helpers that can be reused \
  - Map data flow through affected components \
  - Assess test coverage gaps in affected areas \
  - Identify backward compatibility concerns
MODE: analysis
CONTEXT: @**/* | Memory: Requirements: ${requirements.map(r => r.desc).join(', ')}
EXPECTED: Structured analysis with: module map, reuse opportunities, data flow diagram, test gaps, compatibility risks
CONSTRAINTS: Focus on files relevant to phase ${phaseNumber} requirements" \
    --tool gemini --mode analysis --rule analysis-analyze-code-patterns`,
    run_in_background: false,
    timeout: 300000
  })

  // Store deep analysis result for context.md
}
```

### Step 5: Write context.md

```javascript
Bash(`mkdir -p "${sessionFolder}/phase-${phaseNumber}"`)

const contextContent = `# Phase ${phaseNumber} Context

Generated: ${new Date().toISOString().slice(0, 19)}
Session: ${sessionFolder}
Depth: ${depth}

## Phase Goal

${phaseGoal}

## Requirements

${requirements.map(r => `- **${r.id}**: ${r.desc}`).join('\n')}

## Success Criteria

${successCriteria.map(c => `- [ ] ${c}`).join('\n')}

## Prior Phase Dependencies

${priorContext.length > 0
  ? priorContext.map(p => `### Phase ${p.phase}\n- Source: ${p.file}\n- Key outputs: ${extractKeyOutputs(p.content)}`).join('\n\n')
  : 'None (this is the first phase)'}

${isGapClosure ? `## Gap Closure Context\n\nThis is a gap closure iteration. Gaps from previous verification:\n${gapContext}` : ''}

## Relevant Files

${exploreResult.relevantFiles.map(f => `- \`${f.path}\`: ${f.description}`).join('\n')}

## Patterns Identified

${exploreResult.patterns.map(p => `- **${p.name}**: ${p.description}`).join('\n')}

## Dependencies

${exploreResult.dependencies.map(d => `- ${d}`).join('\n')}

## Test Infrastructure

${exploreResult.testInfo || 'Not analyzed (quick depth)'}

${depth === "comprehensive" && analysisResult ? `## Deep Analysis\n\n${analysisResult}` : ''}

## Questions / Risks

${exploreResult.risks.map(r => `- ${r}`).join('\n')}
`

Write(`${sessionFolder}/phase-${phaseNumber}/context.md`, contextContent)
```

## Output

| Artifact | Path | Description |
|----------|------|-------------|
| context.md | `{sessionFolder}/phase-{N}/context.md` | Structured phase context for plan creation |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| roadmap.md not found | Error to coordinator via message bus |
| cli-explore-agent fails | Retry once. Fallback: use ACE search_context directly |
| Gemini CLI fails | Skip deep analysis section, proceed with basic context |
| Prior phase summaries missing | Log warning, proceed without dependency context |
| Phase section not found in roadmap | Error to coordinator -- phase number may be invalid |
