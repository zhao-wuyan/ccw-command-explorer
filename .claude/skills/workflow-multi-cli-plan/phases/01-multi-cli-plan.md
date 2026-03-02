# Phase 1: Multi-CLI Collaborative Planning

Complete multi-CLI collaborative planning pipeline with ACE context gathering and iterative cross-verification. This phase document preserves the full content of the original `workflow-multi-cli-plan` command.

## Auto Mode

When `workflowPreferences.autoYes` is true: Auto-approve plan, use recommended solution and execution method (Agent, Skip review).

# Multi-CLI Collaborative Planning Command

## Quick Start

```bash
# Basic usage
/workflow-multi-cli-plan "Implement user authentication"

# With options
/workflow-multi-cli-plan "Add dark mode support" --max-rounds=3
/workflow-multi-cli-plan "Refactor payment module" --tools=gemini,codex,claude
/workflow-multi-cli-plan "Fix memory leak" --mode=serial
```

**Context Source**: ACE semantic search + Multi-CLI analysis
**Output Directory**: `.workflow/.multi-cli-plan/{session-id}/`
**Default Max Rounds**: 3 (convergence may complete earlier)
**CLI Tools**: @cli-discuss-agent (analysis), @cli-lite-planning-agent (plan generation)
**Execution**: Auto-hands off to `/workflow:lite-execute --in-memory` after plan approval

## What & Why

### Core Concept

Multi-CLI collaborative planning with **three-phase architecture**: ACE context gathering → Iterative multi-CLI discussion → Plan generation. Orchestrator delegates analysis to agents, only handles user decisions and session management.

**Process**:
- **Phase 1**: ACE semantic search gathers codebase context
- **Phase 2**: cli-discuss-agent orchestrates Gemini/Codex/Claude for cross-verified analysis
- **Phase 3-5**: User decision → Plan generation → Execution handoff

**vs Single-CLI Planning**:
- **Single**: One model perspective, potential blind spots
- **Multi-CLI**: Cross-verification catches inconsistencies, builds consensus on solutions

### Value Proposition

1. **Multi-Perspective Analysis**: Gemini + Codex + Claude analyze from different angles
2. **Cross-Verification**: Identify agreements/disagreements, build confidence
3. **User-Driven Decisions**: Every round ends with user decision point
4. **Iterative Convergence**: Progressive refinement until consensus reached

### Orchestrator Boundary (CRITICAL)

- **ONLY command** for multi-CLI collaborative planning
- Manages: Session state, user decisions, agent delegation, phase transitions
- Delegates: CLI execution to @cli-discuss-agent, plan generation to @cli-lite-planning-agent

### Execution Flow

```
Phase 1: Context Gathering
   └─ ACE semantic search, extract keywords, build context package

Phase 2: Multi-CLI Discussion (Iterative, via @cli-discuss-agent)
   ├─ Round N: Agent executes Gemini + Codex + Claude
   ├─ Cross-verify findings, synthesize solutions
   ├─ Write synthesis.json to rounds/{N}/
   └─ Loop until convergence or max rounds

Phase 3: Present Options
   └─ Display solutions with trade-offs from agent output

Phase 4: User Decision
   ├─ Select solution approach
   ├─ Select execution method (Agent/Codex/Auto)
   ├─ Select code review tool (Skip/Gemini/Codex/Agent)
   └─ Route:
      ├─ Approve → Phase 5
      ├─ Need More Analysis → Return to Phase 2
      └─ Cancel → Save session

Phase 5: Plan Generation & Execution Handoff
   ├─ Generate plan.json + .task/*.json (via @cli-lite-planning-agent, two-layer output)
   ├─ Build executionContext with user selections and taskFiles
   └─ Execute to /workflow:lite-execute --in-memory
```

### Agent Roles

| Agent | Responsibility |
|-------|---------------|
| **Orchestrator** | Session management, ACE context, user decisions, phase transitions, executionContext assembly |
| **@cli-discuss-agent** | Multi-CLI execution (Gemini/Codex/Claude), cross-verification, solution synthesis, synthesis.json output |
| **@cli-lite-planning-agent** | Task decomposition, two-layer output: plan.json (overview with task_ids[]) + .task/*.json (task files) |

## Core Responsibilities

### Phase 1: Context Gathering

**Session Initialization**:
```javascript
const sessionId = `MCP-${taskSlug}-${date}`
const sessionFolder = `.workflow/.multi-cli-plan/${sessionId}`
Bash(`mkdir -p ${sessionFolder}/rounds`)
```

**ACE Context Queries**:
```javascript
const aceQueries = [
  `Project architecture related to ${keywords}`,
  `Existing implementations of ${keywords[0]}`,
  `Code patterns for ${keywords} features`,
  `Integration points for ${keywords[0]}`
]
// Execute via mcp__ace-tool__search_context
```

**Context Package** (passed to agent):
- `relevant_files[]` - Files identified by ACE
- `detected_patterns[]` - Code patterns found
- `architecture_insights` - Structure understanding

### Phase 2: Agent Delegation

**Core Principle**: Orchestrator only delegates and reads output - NO direct CLI execution.

**⚠️ CRITICAL - CLI EXECUTION REQUIREMENT**:
- **MUST** execute CLI calls via `Bash` with `run_in_background: true`
- **MUST** wait for hook callback to receive complete results
- **MUST NOT** proceed with next phase until CLI execution fully completes
- Do NOT use `TaskOutput` polling during CLI execution - wait passively for results
- Minimize scope: Proceed only when 100% result available

**Agent Invocation**:
```javascript
Task({
  subagent_type: "cli-discuss-agent",
  run_in_background: false,
  description: `Discussion round ${currentRound}`,
  prompt: `
## Input Context
- task_description: ${taskDescription}
- round_number: ${currentRound}
- session: { id: "${sessionId}", folder: "${sessionFolder}" }
- ace_context: ${JSON.stringify(contextPackageage)}
- previous_rounds: ${JSON.stringify(analysisResults)}
- user_feedback: ${userFeedback || 'None'}
- cli_config: { tools: ["gemini", "codex"], mode: "parallel", fallback_chain: ["gemini", "codex", "claude"] }

## Execution Process
1. Parse input context (handle JSON strings)
2. Check if ACE supplementary search needed
3. Build CLI prompts with context
4. Execute CLIs (parallel or serial per cli_config.mode)
5. Parse CLI outputs, handle failures with fallback
6. Perform cross-verification between CLI results
7. Synthesize solutions, calculate scores
8. Calculate convergence, generate clarification questions
9. Write synthesis.json

## Output
Write: ${sessionFolder}/rounds/${currentRound}/synthesis.json

## Completion Checklist
- [ ] All configured CLI tools executed (or fallback triggered)
- [ ] Cross-verification completed with agreements/disagreements
- [ ] 2-3 solutions generated with file:line references
- [ ] Convergence score calculated (0.0-1.0)
- [ ] synthesis.json written with all Primary Fields
`
})
```

**Read Agent Output**:
```javascript
const synthesis = JSON.parse(Read(`${sessionFolder}/rounds/${round}/synthesis.json`))
// Access top-level fields: solutions, convergence, cross_verification, clarification_questions
```

**Convergence Decision**:
```javascript
if (synthesis.convergence.recommendation === 'converged') {
  // Proceed to Phase 3
} else if (synthesis.convergence.recommendation === 'user_input_needed') {
  // Collect user feedback, return to Phase 2
} else {
  // Continue to next round if new_insights && round < maxRounds
}
```

### Phase 3: Present Options

**Display from Agent Output** (no processing):
```javascript
console.log(`
## Solution Options

${synthesis.solutions.map((s, i) => `
**Option ${i+1}: ${s.name}**
Source: ${s.source_cli.join(' + ')}
Effort: ${s.effort} | Risk: ${s.risk}

Pros: ${s.pros.join(', ')}
Cons: ${s.cons.join(', ')}

Files: ${s.affected_files.slice(0,3).map(f => `${f.file}:${f.line}`).join(', ')}
`).join('\n')}

## Cross-Verification
Agreements: ${synthesis.cross_verification.agreements.length}
Disagreements: ${synthesis.cross_verification.disagreements.length}
`)
```

### Phase 4: User Decision

**Decision Options**:
```javascript
AskUserQuestion({
  questions: [
    {
      question: "Which solution approach?",
      header: "Solution",
      multiSelect: false,
      options: solutions.map((s, i) => ({
        label: `Option ${i+1}: ${s.name}`,
        description: `${s.effort} effort, ${s.risk} risk`
      })).concat([
        { label: "Need More Analysis", description: "Return to Phase 2" }
      ])
    },
    {
      question: "Execution method:",
      header: "Execution",
      multiSelect: false,
      options: [
        { label: "Agent", description: "@code-developer agent" },
        { label: "Codex", description: "codex CLI tool" },
        { label: "Auto", description: "Auto-select based on complexity" }
      ]
    },
    {
      question: "Code review after execution?",
      header: "Review",
      multiSelect: false,
      options: [
        { label: "Skip", description: "No review" },
        { label: "Gemini Review", description: "Gemini CLI tool" },
        { label: "Codex Review", description: "codex review --uncommitted" },
        { label: "Agent Review", description: "Current agent review" }
      ]
    }
  ]
})
```

**Routing**:
- Approve + execution method → Phase 5
- Need More Analysis → Phase 2 with feedback
- Cancel → Save session for resumption

**TodoWrite Update (Phase 4 Decision)**:
```javascript
const executionLabel = userSelection.execution_method  // "Agent" / "Codex" / "Auto"

TodoWrite({ todos: [
  { content: "Phase 1: Context Gathering", status: "completed", activeForm: "Gathering context" },
  { content: "Phase 2: Multi-CLI Discussion", status: "completed", activeForm: "Running discussion" },
  { content: "Phase 3: Present Options", status: "completed", activeForm: "Presenting options" },
  { content: `Phase 4: User Decision [${executionLabel}]`, status: "completed", activeForm: "Decision recorded" },
  { content: `Phase 5: Plan Generation [${executionLabel}]`, status: "in_progress", activeForm: `Generating plan [${executionLabel}]` }
]})
```

### Phase 5: Plan Generation & Execution Handoff

**Step 1: Build Context-Package** (Orchestrator responsibility):
```javascript
// Extract key information from user decision and synthesis
const contextPackage = {
  // Core solution details
  solution: {
    name: selectedSolution.name,
    source_cli: selectedSolution.source_cli,
    feasibility: selectedSolution.feasibility,
    effort: selectedSolution.effort,
    risk: selectedSolution.risk,
    summary: selectedSolution.summary
  },
  // Implementation plan (tasks, flow, milestones)
  implementation_plan: selectedSolution.implementation_plan,
  // Dependencies
  dependencies: selectedSolution.dependencies || { internal: [], external: [] },
  // Technical concerns
  technical_concerns: selectedSolution.technical_concerns || [],
  // Consensus from cross-verification
  consensus: {
    agreements: synthesis.cross_verification.agreements,
    resolved_conflicts: synthesis.cross_verification.resolution
  },
  // User constraints (from Phase 4 feedback)
  constraints: userConstraints || [],
  // Task context
  task_description: taskDescription,
  session_id: sessionId
}

// Write context-package for traceability
Write(`${sessionFolder}/context-package.json`, JSON.stringify(contextPackage, null, 2))
```

**Context-Package Schema**:

| Field | Type | Description |
|-------|------|-------------|
| `solution` | object | User-selected solution from synthesis |
| `solution.name` | string | Solution identifier |
| `solution.feasibility` | number | Viability score (0-1) |
| `solution.summary` | string | Brief analysis summary |
| `implementation_plan` | object | Task breakdown with flow and dependencies |
| `implementation_plan.approach` | string | High-level technical strategy |
| `implementation_plan.tasks[]` | array | Discrete tasks with id, name, depends_on, files |
| `implementation_plan.execution_flow` | string | Task sequence (e.g., "T1 → T2 → T3") |
| `implementation_plan.milestones` | string[] | Key checkpoints |
| `dependencies` | object | Module and package dependencies |
| `technical_concerns` | string[] | Risks and blockers |
| `consensus` | object | Cross-verified agreements from multi-CLI |
| `constraints` | string[] | User-specified constraints from Phase 4 |

```json
{
  "solution": {
    "name": "Strategy Pattern Refactoring",
    "source_cli": ["gemini", "codex"],
    "feasibility": 0.88,
    "effort": "medium",
    "risk": "low",
    "summary": "Extract payment gateway interface, implement strategy pattern for multi-gateway support"
  },
  "implementation_plan": {
    "approach": "Define interface → Create concrete strategies → Implement factory → Migrate existing code",
    "tasks": [
      {"id": "T1", "name": "Define PaymentGateway interface", "depends_on": [], "files": [{"file": "src/types/payment.ts", "line": 1, "action": "create"}], "key_point": "Include all existing Stripe methods"},
      {"id": "T2", "name": "Implement StripeGateway", "depends_on": ["T1"], "files": [{"file": "src/payment/stripe.ts", "line": 1, "action": "create"}], "key_point": "Wrap existing logic"},
      {"id": "T3", "name": "Create GatewayFactory", "depends_on": ["T1"], "files": [{"file": "src/payment/factory.ts", "line": 1, "action": "create"}], "key_point": null},
      {"id": "T4", "name": "Migrate processor to use factory", "depends_on": ["T2", "T3"], "files": [{"file": "src/payment/processor.ts", "line": 45, "action": "modify"}], "key_point": "Backward compatible"}
    ],
    "execution_flow": "T1 → (T2 | T3) → T4",
    "milestones": ["Interface defined", "Gateway implementations complete", "Migration done"]
  },
  "dependencies": {
    "internal": ["@/lib/payment-gateway", "@/types/payment"],
    "external": ["stripe@^14.0.0"]
  },
  "technical_concerns": ["Existing tests must pass", "No breaking API changes"],
  "consensus": {
    "agreements": ["Use strategy pattern", "Keep existing API"],
    "resolved_conflicts": "Factory over DI for simpler integration"
  },
  "constraints": ["backward compatible", "no breaking changes to PaymentResult type"],
  "task_description": "Refactor payment processing for multi-gateway support",
  "session_id": "MCP-payment-refactor-2026-01-14"
}
```

**Step 2: Invoke Planning Agent**:
```javascript
Task({
  subagent_type: "cli-lite-planning-agent",
  run_in_background: false,
  description: "Generate implementation plan",
  prompt: `
## Schema Reference
Execute: cat ~/.ccw/workflows/cli-templates/schemas/plan-overview-base-schema.json
Execute: cat ~/.ccw/workflows/cli-templates/schemas/task-schema.json

## Output Format: Two-Layer Structure
- plan.json: Overview with task_ids[] referencing .task/ files (NO tasks[] array)
- .task/TASK-*.json: Independent task files following task-schema.json

plan.json required: summary, approach, task_ids, task_count, _metadata (with plan_type)
Task files required: id, title, description, depends_on, convergence (with criteria[])
Task fields: files[].change (not modification_points), convergence.criteria (not acceptance), test (not verification)

## Context-Package (from orchestrator)
${JSON.stringify(contextPackage, null, 2)}

## Execution Process
1. Read plan-overview-base-schema.json + task-schema.json for output structure
2. Read project-tech.json and specs/*.md
3. Parse context-package fields:
   - solution: name, feasibility, summary
   - implementation_plan: tasks[], execution_flow, milestones
   - dependencies: internal[], external[]
   - technical_concerns: risks/blockers
   - consensus: agreements, resolved_conflicts
   - constraints: user requirements
4. Use implementation_plan.tasks[] as task foundation
5. Preserve task dependencies (depends_on) and execution_flow
6. Expand tasks with convergence.criteria (testable completion conditions)
7. Create .task/ directory and write individual TASK-*.json files
8. Generate plan.json with task_ids[] referencing .task/ files

## Output
- ${sessionFolder}/plan.json (overview with task_ids[])
- ${sessionFolder}/.task/TASK-*.json (independent task files)

## Completion Checklist
- [ ] plan.json has task_ids[] and task_count (NO embedded tasks[])
- [ ] .task/*.json files preserve task dependencies from implementation_plan
- [ ] Task execution order follows execution_flow
- [ ] Key_points reflected in task descriptions
- [ ] User constraints applied to implementation
- [ ] convergence.criteria are testable
- [ ] plan.json follows plan-overview-base-schema.json
- [ ] Task files follow task-schema.json
`
})
```

**Step 3: Build executionContext**:
```javascript
// After plan.json is generated by cli-lite-planning-agent
const plan = JSON.parse(Read(`${sessionFolder}/plan.json`))

// Load task files from .task/ directory (two-layer format)
const taskFiles = plan.task_ids.map(id => `${sessionFolder}/.task/${id}.json`)

// Build executionContext (same structure as lite-plan)
executionContext = {
  planObject: plan,
  taskFiles: taskFiles,  // Paths to .task/*.json files (two-layer format)
  explorationsContext: null,  // Multi-CLI doesn't use exploration files
  explorationAngles: [],      // No exploration angles
  explorationManifest: null,  // No manifest
  clarificationContext: null,  // Store user feedback from Phase 2 if exists
  executionMethod: userSelection.execution_method,  // From Phase 4
  codeReviewTool: userSelection.code_review_tool,   // From Phase 4
  originalUserInput: taskDescription,

  // Optional: Task-level executor assignments
  executorAssignments: null,  // Could be enhanced in future

  session: {
    id: sessionId,
    folder: sessionFolder,
    artifacts: {
      explorations: [],  // No explorations in multi-CLI workflow
      explorations_manifest: null,
      plan: `${sessionFolder}/plan.json`,
      task_dir: plan.task_ids ? `${sessionFolder}/.task/` : null,
      synthesis_rounds: Array.from({length: currentRound}, (_, i) =>
        `${sessionFolder}/rounds/${i+1}/synthesis.json`
      ),
      context_package: `${sessionFolder}/context-package.json`
    }
  }
}
```

**Step 4: Hand off to Execution**:
```javascript
// Direct phase handoff: Read and execute Phase 2 (lite-execute) with in-memory context
Read("phases/02-lite-execute.md")
// Execute Phase 2 with executionContext (Mode 1: In-Memory Plan)
```

## Output File Structure

```
.workflow/.multi-cli-plan/{MCP-task-slug-YYYY-MM-DD}/
├── session-state.json          # Session tracking (orchestrator)
├── rounds/
│   ├── 1/synthesis.json        # Round 1 analysis (cli-discuss-agent)
│   ├── 2/synthesis.json        # Round 2 analysis (cli-discuss-agent)
│   └── .../
├── context-package.json        # Extracted context for planning (orchestrator)
├── plan.json                   # Plan overview with task_ids[] (NO embedded tasks[])
└── .task/                      # Independent task files
    ├── TASK-001.json            # Task file following task-schema.json
    ├── TASK-002.json
    └── ...
```

**File Producers**:

| File | Producer | Content |
|------|----------|---------|
| `session-state.json` | Orchestrator | Session metadata, rounds, decisions |
| `rounds/*/synthesis.json` | cli-discuss-agent | Solutions, convergence, cross-verification |
| `context-package.json` | Orchestrator | Extracted solution, dependencies, consensus for planning |
| `plan.json` | cli-lite-planning-agent | Plan overview with task_ids[] referencing .task/ files |
| `.task/*.json` | cli-lite-planning-agent | Independent task files following task-schema.json |

## synthesis.json Schema

```json
{
  "round": 1,
  "solutions": [{
    "name": "Solution Name",
    "source_cli": ["gemini", "codex"],
    "feasibility": 0.85,
    "effort": "low|medium|high",
    "risk": "low|medium|high",
    "summary": "Brief analysis summary",
    "implementation_plan": {
      "approach": "High-level technical approach",
      "tasks": [
        {"id": "T1", "name": "Task", "depends_on": [], "files": [], "key_point": "..."}
      ],
      "execution_flow": "T1 → T2 → T3",
      "milestones": ["Checkpoint 1", "Checkpoint 2"]
    },
    "dependencies": {"internal": [], "external": []},
    "technical_concerns": ["Risk 1", "Blocker 2"]
  }],
  "convergence": {
    "score": 0.85,
    "new_insights": false,
    "recommendation": "converged|continue|user_input_needed"
  },
  "cross_verification": {
    "agreements": [],
    "disagreements": [],
    "resolution": "..."
  },
  "clarification_questions": []
}
```

**Key Planning Fields**:

| Field | Purpose |
|-------|---------|
| `feasibility` | Viability score (0-1) |
| `implementation_plan.tasks[]` | Discrete tasks with dependencies |
| `implementation_plan.execution_flow` | Task sequence visualization |
| `implementation_plan.milestones` | Key checkpoints |
| `technical_concerns` | Risks and blockers |

**Note**: Solutions ranked by internal scoring (array order = priority)

## TodoWrite Structure

**Initialization**:
```javascript
TodoWrite({ todos: [
  { content: "Phase 1: Context Gathering", status: "in_progress", activeForm: "Gathering context" },
  { content: "Phase 2: Multi-CLI Discussion", status: "pending", activeForm: "Running discussion" },
  { content: "Phase 3: Present Options", status: "pending", activeForm: "Presenting options" },
  { content: "Phase 4: User Decision", status: "pending", activeForm: "Awaiting decision" },
  { content: "Phase 5: Plan Generation", status: "pending", activeForm: "Generating plan" }
]})
```

**During Discussion Rounds**:
```javascript
TodoWrite({ todos: [
  { content: "Phase 1: Context Gathering", status: "completed", activeForm: "Gathering context" },
  { content: "Phase 2: Multi-CLI Discussion", status: "in_progress", activeForm: "Running discussion" },
  { content: "  → Round 1: Initial analysis", status: "completed", activeForm: "Analyzing" },
  { content: "  → Round 2: Deep verification", status: "in_progress", activeForm: "Verifying" },
  { content: "Phase 3: Present Options", status: "pending", activeForm: "Presenting options" },
  // ...
]})
```

## Error Handling

| Error | Resolution |
|-------|------------|
| ACE search fails | Fall back to Glob/Grep for file discovery |
| Agent fails | Retry once, then present partial results |
| CLI timeout (in agent) | Agent uses fallback: gemini → codex → claude |
| No convergence | Present best options, flag uncertainty |
| synthesis.json parse error | Request agent retry |
| User cancels | Save session for later resumption |

## Configuration

| Flag | Default | Description |
|------|---------|-------------|
| `--max-rounds` | 3 | Maximum discussion rounds |
| `--tools` | gemini,codex | CLI tools for analysis |
| `--mode` | parallel | Execution mode: parallel or serial |
| `--auto-execute` | false | Auto-execute after approval |

## Best Practices

1. **Be Specific**: Detailed task descriptions improve ACE context quality
2. **Provide Feedback**: Use clarification rounds to refine requirements
3. **Trust Cross-Verification**: Multi-CLI consensus indicates high confidence
4. **Review Trade-offs**: Consider pros/cons before selecting solution
5. **Check synthesis.json**: Review agent output for detailed analysis
6. **Iterate When Needed**: Don't hesitate to request more analysis

## Related Commands

```bash
# Simpler single-round planning
/workflow-lite-plan "task description"

# Issue-driven discovery
/issue:discover-by-prompt "find issues"

# View session files
cat .workflow/.multi-cli-plan/{session-id}/plan.json
cat .workflow/.multi-cli-plan/{session-id}/rounds/1/synthesis.json
cat .workflow/.multi-cli-plan/{session-id}/context-package.json

# Direct execution (if you have plan.json)
/workflow:lite-execute plan.json
```

## Next Phase

Return to orchestrator, then auto-continue to [Phase 2: Lite Execute](02-lite-execute.md) via Skill handoff.
