# Phase 1: Compact - Session Memory Compression

Compress current session working memory into structured text optimized for session recovery, extract critical information, and save to persistent storage via MCP `core_memory` tool.

## Objective

- Capture everything needed to resume work seamlessly in a new session
- Minimize re-exploration by including file paths, decisions, and state
- Preserve train of thought for complex debugging
- Record actionable state (last action, known issues, pending)

## Input

- `sessionDescription` (Optional): User-provided session description string
  - Example: `"completed core-memory module"`
  - Example: `"debugging JWT refresh - suspected memory leak"`

## Execution

### Step 1.1: Analyze Current Session

Extract the following from conversation history:

```javascript
const sessionAnalysis = {
  sessionId: "",       // WFS-* if workflow session active, null otherwise
  projectRoot: "",     // Absolute path: D:\Claude_dms3
  objective: "",       // High-level goal (1-2 sentences)
  executionPlan: {
    source: "workflow" | "todo" | "user-stated" | "inferred",
    content: ""        // Full plan content - ALWAYS preserve COMPLETE and DETAILED form
  },
  workingFiles: [],    // {absolutePath, role} - modified files
  referenceFiles: [],  // {absolutePath, role} - read-only context files
  lastAction: "",      // Last significant action + result
  decisions: [],       // {decision, reasoning}
  constraints: [],     // User-specified limitations
  dependencies: [],    // Added/changed packages
  knownIssues: [],     // Deferred bugs
  changesMade: [],     // Completed modifications
  pending: [],         // Next steps
  notes: ""            // Unstructured thoughts
}
```

**Core Philosophy**:
- **Session Recovery First**: Capture everything needed to resume work seamlessly
- **Minimize Re-exploration**: Include file paths, decisions, and state to avoid redundant analysis
- **Preserve Train of Thought**: Keep notes and hypotheses for complex debugging
- **Actionable State**: Record last action result and known issues

### Step 1.2: Plan Detection (Priority Order)

**Priority 1: Workflow Session (IMPL_PLAN.md)**
```javascript
// Check for active workflow session
const manifest = await mcp__ccw-tools__session_manager({
  operation: "list",
  location: "active"
});

if (manifest.sessions?.length > 0) {
  const session = manifest.sessions[0];
  const plan = await mcp__ccw-tools__session_manager({
    operation: "read",
    session_id: session.id,
    content_type: "plan"
  });
  sessionAnalysis.sessionId = session.id;
  sessionAnalysis.executionPlan.source = "workflow";
  sessionAnalysis.executionPlan.content = plan.content;
}
```

**Priority 2: TodoWrite (Current Session Todos)**
```javascript
// Extract from conversation - look for TodoWrite tool calls
// Preserve COMPLETE todo list with all details
const todos = extractTodosFromConversation();
if (todos.length > 0) {
  sessionAnalysis.executionPlan.source = "todo";
  sessionAnalysis.executionPlan.content = todos.map(t =>
    `- [${t.status === 'completed' ? 'x' : t.status === 'in_progress' ? '>' : ' '}] ${t.content}`
  ).join('\n');
}
```

**Priority 3: User-Stated Plan**
```javascript
// Look for explicit plan statements in user messages:
// - "Here's my plan: 1. ... 2. ... 3. ..."
// - "I want to: first..., then..., finally..."
// - Numbered or bulleted lists describing steps
const userPlan = extractUserStatedPlan();
if (userPlan) {
  sessionAnalysis.executionPlan.source = "user-stated";
  sessionAnalysis.executionPlan.content = userPlan;
}
```

**Priority 4: Inferred Plan**
```javascript
// If no explicit plan, infer from:
// - Task description and breakdown discussion
// - Sequence of actions taken
// - Outstanding work mentioned
const inferredPlan = inferPlanFromDiscussion();
if (inferredPlan) {
  sessionAnalysis.executionPlan.source = "inferred";
  sessionAnalysis.executionPlan.content = inferredPlan;
}
```

### Step 1.3: Generate Structured Text

```javascript
const generateExecutionPlan = (plan) => {
  const sourceLabels = {
    'workflow': 'workflow (IMPL_PLAN.md)',
    'todo': 'todo (TodoWrite)',
    'user-stated': 'user-stated',
    'inferred': 'inferred'
  };

  // CRITICAL: Preserve complete plan content verbatim - DO NOT summarize
  return `### Source: ${sourceLabels[plan.source] || plan.source}

<details>
<summary>Full Execution Plan (Click to expand)</summary>

${plan.content}

</details>`;
};

const structuredText = `## Session ID
${sessionAnalysis.sessionId || '(none)'}

## Project Root
${sessionAnalysis.projectRoot}

## Objective
${sessionAnalysis.objective}

## Execution Plan
${generateExecutionPlan(sessionAnalysis.executionPlan)}

## Working Files (Modified)
${sessionAnalysis.workingFiles.map(f => `- ${f.absolutePath} (role: ${f.role})`).join('\n') || '(none)'}

## Reference Files (Read-Only)
${sessionAnalysis.referenceFiles.map(f => `- ${f.absolutePath} (role: ${f.role})`).join('\n') || '(none)'}

## Last Action
${sessionAnalysis.lastAction}

## Decisions
${sessionAnalysis.decisions.map(d => `- ${d.decision}: ${d.reasoning}`).join('\n') || '(none)'}

## Constraints
${sessionAnalysis.constraints.map(c => `- ${c}`).join('\n') || '(none)'}

## Dependencies
${sessionAnalysis.dependencies.map(d => `- ${d}`).join('\n') || '(none)'}

## Known Issues
${sessionAnalysis.knownIssues.map(i => `- ${i}`).join('\n') || '(none)'}

## Changes Made
${sessionAnalysis.changesMade.map(c => `- ${c}`).join('\n') || '(none)'}

## Pending
${sessionAnalysis.pending.length > 0
  ? sessionAnalysis.pending.map(p => `- ${p}`).join('\n')
  : '(none)'}

## Notes
${sessionAnalysis.notes || '(none)'}`;
```

### Step 1.4: Import to Core Memory

```javascript
mcp__ccw-tools__core_memory({
  operation: "import",
  text: structuredText
})
```

### Step 1.5: Report Recovery ID

After successful import, display the Recovery ID:

```
+============================================================================+
|  Session Memory Saved                                                      |
|                                                                            |
|  Recovery ID: CMEM-YYYYMMDD-HHMMSS                                        |
|                                                                            |
|  To restore: "Please import memory <ID>"                                   |
|  (MCP: core_memory export | CLI: ccw core-memory export --id <ID>)         |
+============================================================================+
```

## Path Resolution Rules

### Project Root Detection
1. Check current working directory from environment
2. Look for project markers: `.git/`, `package.json`, `.claude/`
3. Use the topmost directory containing these markers

### Absolute Path Conversion
```javascript
const toAbsolutePath = (relativePath, projectRoot) => {
  if (path.isAbsolute(relativePath)) return relativePath;
  return path.join(projectRoot, relativePath);
};
```

### Reference File Categories
| Category | Examples | Priority |
|----------|----------|----------|
| Project Config | `.claude/CLAUDE.md`, `package.json`, `tsconfig.json` | High |
| Type Definitions | `src/types/*.ts`, `*.d.ts` | High |
| Related Modules | Parent/sibling modules with shared interfaces | Medium |
| Test Files | Corresponding test files for modified code | Medium |
| Documentation | `README.md`, `ARCHITECTURE.md` | Low |

## Quality Checklist

Before generating:
- [ ] Session ID captured if workflow session active (WFS-*)
- [ ] Project Root is absolute path (e.g., D:\Claude_dms3)
- [ ] Objective clearly states the "North Star" goal
- [ ] Execution Plan: COMPLETE plan preserved VERBATIM (no summarization)
- [ ] Plan Source: Clearly identified (workflow | todo | user-stated | inferred)
- [ ] Plan Details: ALL phases, tasks, file paths, dependencies, status markers included
- [ ] All file paths are ABSOLUTE (not relative)
- [ ] Working Files: 3-8 modified files with roles
- [ ] Reference Files: Key context files (CLAUDE.md, types, configs)
- [ ] Last Action captures final state (success/failure)
- [ ] Decisions include reasoning, not just choices
- [ ] Known Issues separates deferred from forgotten bugs
- [ ] Notes preserve debugging hypotheses if any

## Output

- **Variable**: `structuredText` - the generated markdown string
- **MCP Result**: `{ operation: "import", id: "CMEM-YYYYMMDD-HHMMSS" }`
- **User Display**: Recovery ID banner with restore instructions

## Next Phase

N/A - Compact is a terminal phase. Return to SKILL.md orchestrator.
