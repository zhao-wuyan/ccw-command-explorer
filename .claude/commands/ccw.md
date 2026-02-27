---
name: ccw
description: Main workflow orchestrator - analyze intent, select workflow, execute command chain in main process
argument-hint: "\"task description\""
allowed-tools: SlashCommand(*), TodoWrite(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*)
---

# CCW Command - Main Workflow Orchestrator

Main process orchestrator: intent analysis → workflow selection → command chain execution.

## Core Concept: Minimum Execution Units (最小执行单元)

**Definition**: A set of commands that must execute together as an atomic group to achieve a meaningful workflow milestone.

**Why This Matters**:
- **Prevents Incomplete States**: Avoid stopping after task generation without execution
- **User Experience**: User gets complete results, not intermediate artifacts requiring manual follow-up
- **Workflow Integrity**: Maintains logical coherence of multi-step operations

**Key Units in CCW**:

| Unit Type | Pattern | Example |
|-----------|---------|---------|
| **Planning + Execution** | plan-cmd → execute-cmd | lite-plan → lite-execute |
| **Testing** | test-gen-cmd → test-exec-cmd | test-fix-gen → test-cycle-execute |
| **Review** | review-cmd → fix-cmd | review-session-cycle → review-cycle-fix |

**Atomic Rules**:
1. CCW automatically groups commands into minimum units - never splits them
2. Pipeline visualization shows units with `【 】` markers
3. Error handling preserves unit boundaries (retry/skip affects whole unit)

## Execution Model

**Synchronous (Main Process)**: Commands execute via SlashCommand in main process, blocking until complete.

```
User Input → Analyze Intent → Select Workflow → [Confirm] → Execute Chain
                                                              ↓
                                                    SlashCommand (blocking)
                                                              ↓
                                                    Update TodoWrite
                                                              ↓
                                                    Next Command...
```

**vs ccw-coordinator**: External CLI execution with background tasks and hook callbacks.

## 5-Phase Workflow

### Phase 1: Analyze Intent

```javascript
function analyzeIntent(input) {
  return {
    goal: extractGoal(input),
    scope: extractScope(input),
    constraints: extractConstraints(input),
    task_type: detectTaskType(input),       // bugfix|feature|tdd|review|exploration|...
    complexity: assessComplexity(input),    // low|medium|high
    clarity_score: calculateClarity(input)  // 0-3 (>=2 = clear)
  };
}

// Task type detection (priority order)
function detectTaskType(text) {
  const patterns = {
    'bugfix-hotfix': /urgent|production|critical/ && /fix|bug/,
    // With-File workflows (documented exploration with multi-CLI collaboration)
    'brainstorm': /brainstorm|ideation|头脑风暴|创意|发散思维|creative thinking|multi-perspective.*think|compare perspectives|探索.*可能/,
    'brainstorm-to-issue': /brainstorm.*issue|头脑风暴.*issue|idea.*issue|想法.*issue|从.*头脑风暴|convert.*brainstorm/,
    'debug-file': /debug.*document|hypothesis.*debug|troubleshoot.*track|investigate.*log|调试.*记录|假设.*验证|systematic debug|深度调试/,
    'analyze-file': /analyze.*document|explore.*concept|understand.*architecture|investigate.*discuss|collaborative analysis|分析.*讨论|深度.*理解|协作.*分析/,
    // Standard workflows
    'bugfix': /fix|bug|error|crash|fail|debug/,
    'issue-batch': /issues?|batch/ && /fix|resolve/,
    'issue-transition': /issue workflow|structured workflow|queue|multi-stage/,
    'exploration': /uncertain|explore|research|what if/,
    'quick-task': /quick|simple|small/ && /feature|function/,
    'ui-design': /ui|design|component|style/,
    'tdd': /tdd|test-driven|test first/,
    'test-fix': /test fail|fix test|failing test/,
    'review': /review|code review/,
    'documentation': /docs|documentation|readme/
  };
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) return type;
  }
  return 'feature';
}
```

**Output**: `Type: [task_type] | Goal: [goal] | Complexity: [complexity] | Clarity: [clarity_score]/3`

---

### Phase 1.5: Requirement Clarification (if clarity_score < 2)

```javascript
async function clarifyRequirements(analysis) {
  if (analysis.clarity_score >= 2) return analysis;

  const questions = generateClarificationQuestions(analysis);  // Goal, Scope, Constraints
  const answers = await AskUserQuestion({ questions });
  return updateAnalysis(analysis, answers);
}
```

**Questions**: Goal (Create/Fix/Optimize/Analyze), Scope (Single file/Module/Cross-module/System), Constraints (Backward compat/Skip tests/Urgent hotfix)

---

### Phase 2: Select Workflow & Build Command Chain

```javascript
function selectWorkflow(analysis) {
  const levelMap = {
    'bugfix-hotfix':     { level: 2, flow: 'bugfix.hotfix' },
    // With-File workflows (documented exploration with multi-CLI collaboration)
    'brainstorm':        { level: 4, flow: 'brainstorm-with-file' },   // Multi-perspective ideation
    'brainstorm-to-issue': { level: 4, flow: 'brainstorm-to-issue' }, // Brainstorm → Issue workflow
    'debug-file':        { level: 3, flow: 'debug-with-file' },         // Hypothesis-driven debugging
    'analyze-file':      { level: 3, flow: 'analyze-with-file' },       // Collaborative analysis
    // Standard workflows
    'bugfix':            { level: 2, flow: 'bugfix.standard' },
    'issue-batch':       { level: 'Issue', flow: 'issue' },
    'issue-transition':  { level: 2.5, flow: 'rapid-to-issue' },  // Bridge workflow
    'exploration':       { level: 4, flow: 'full' },
    'quick-task':        { level: 1, flow: 'lite-lite-lite' },
    'ui-design':         { level: analysis.complexity === 'high' ? 4 : 3, flow: 'ui' },
    'tdd':               { level: 3, flow: 'tdd' },
    'test-fix':          { level: 3, flow: 'test-fix-gen' },
    'review':            { level: 3, flow: 'review-cycle-fix' },
    'documentation':     { level: 2, flow: 'docs' },
    'feature':           { level: analysis.complexity === 'high' ? 3 : 2, flow: analysis.complexity === 'high' ? 'coupled' : 'rapid' }
  };

  const selected = levelMap[analysis.task_type] || levelMap['feature'];
  return buildCommandChain(selected, analysis);
}

// Build command chain (port-based matching with Minimum Execution Units)
function buildCommandChain(workflow, analysis) {
  const chains = {
    // Level 1 - Rapid
    'lite-lite-lite': [
      { cmd: '/workflow:lite-lite-lite', args: `"${analysis.goal}"` }
    ],

    // Level 2 - Lightweight
    'rapid': [
      // Unit: Quick Implementation【lite-plan → lite-execute】
      { cmd: '/workflow:lite-plan', args: `"${analysis.goal}"`, unit: 'quick-impl' },
      { cmd: '/workflow:lite-execute', args: '--in-memory', unit: 'quick-impl' },
      // Unit: Test Validation【test-fix-gen → test-cycle-execute】
      ...(analysis.constraints?.includes('skip-tests') ? [] : [
        { cmd: '/workflow:test-fix-gen', args: '', unit: 'test-validation' },
        { cmd: '/workflow:test-cycle-execute', args: '', unit: 'test-validation' }
      ])
    ],

    // Level 2 Bridge - Lightweight to Issue Workflow
    'rapid-to-issue': [
      // Unit: Quick Implementation【lite-plan → convert-to-plan】
      { cmd: '/workflow:lite-plan', args: `"${analysis.goal}"`, unit: 'quick-impl-to-issue' },
      { cmd: '/issue:convert-to-plan', args: '--latest-lite-plan -y', unit: 'quick-impl-to-issue' },
      // Auto-continue to issue workflow
      { cmd: '/issue:queue', args: '' },
      { cmd: '/issue:execute', args: '--queue auto' }
    ],

    'bugfix.standard': [
      // Unit: Bug Fix【lite-fix → lite-execute】
      { cmd: '/workflow:lite-fix', args: `"${analysis.goal}"`, unit: 'bug-fix' },
      { cmd: '/workflow:lite-execute', args: '--in-memory', unit: 'bug-fix' },
      // Unit: Test Validation【test-fix-gen → test-cycle-execute】
      ...(analysis.constraints?.includes('skip-tests') ? [] : [
        { cmd: '/workflow:test-fix-gen', args: '', unit: 'test-validation' },
        { cmd: '/workflow:test-cycle-execute', args: '', unit: 'test-validation' }
      ])
    ],

    'bugfix.hotfix': [
      { cmd: '/workflow:lite-fix', args: `--hotfix "${analysis.goal}"` }
    ],

    'multi-cli-plan': [
      // Unit: Multi-CLI Planning【multi-cli-plan → lite-execute】
      { cmd: '/workflow:multi-cli-plan', args: `"${analysis.goal}"`, unit: 'multi-cli' },
      { cmd: '/workflow:lite-execute', args: '--in-memory', unit: 'multi-cli' },
      // Unit: Test Validation【test-fix-gen → test-cycle-execute】
      ...(analysis.constraints?.includes('skip-tests') ? [] : [
        { cmd: '/workflow:test-fix-gen', args: '', unit: 'test-validation' },
        { cmd: '/workflow:test-cycle-execute', args: '', unit: 'test-validation' }
      ])
    ],

    'docs': [
      // Unit: Quick Implementation【lite-plan → lite-execute】
      { cmd: '/workflow:lite-plan', args: `"${analysis.goal}"`, unit: 'quick-impl' },
      { cmd: '/workflow:lite-execute', args: '--in-memory', unit: 'quick-impl' }
    ],

    // With-File workflows (documented exploration with multi-CLI collaboration)
    'brainstorm-with-file': [
      { cmd: '/workflow:brainstorm-with-file', args: `"${analysis.goal}"` }
      // Note: Has built-in post-completion options (create plan, create issue, deep analysis)
    ],

    // Brainstorm-to-Issue workflow (bridge from brainstorm to issue execution)
    'brainstorm-to-issue': [
      // Note: Assumes brainstorm session already exists, or run brainstorm first
      { cmd: '/issue:from-brainstorm', args: `SESSION="${extractBrainstormSession(analysis)}" --auto` },
      { cmd: '/issue:queue', args: '' },
      { cmd: '/issue:execute', args: '--queue auto' }
    ],

    'debug-with-file': [
      { cmd: '/workflow:debug-with-file', args: `"${analysis.goal}"` }
      // Note: Self-contained with hypothesis-driven iteration and Gemini validation
    ],

    'analyze-with-file': [
      { cmd: '/workflow:analyze-with-file', args: `"${analysis.goal}"` }
      // Note: Self-contained with multi-round discussion and CLI exploration
    ],

    // Level 3 - Standard
    'coupled': [
      // Unit: Verified Planning【plan → plan-verify】
      { cmd: '/workflow:plan', args: `"${analysis.goal}"`, unit: 'verified-planning' },
      { cmd: '/workflow:plan-verify', args: '', unit: 'verified-planning' },
      // Execution
      { cmd: '/workflow:execute', args: '' },
      // Unit: Code Review【review-session-cycle → review-cycle-fix】
      { cmd: '/workflow:review-session-cycle', args: '', unit: 'code-review' },
      { cmd: '/workflow:review-cycle-fix', args: '', unit: 'code-review' },
      // Unit: Test Validation【test-fix-gen → test-cycle-execute】
      ...(analysis.constraints?.includes('skip-tests') ? [] : [
        { cmd: '/workflow:test-fix-gen', args: '', unit: 'test-validation' },
        { cmd: '/workflow:test-cycle-execute', args: '', unit: 'test-validation' }
      ])
    ],

    'tdd': [
      // Unit: TDD Planning + Execution【tdd-plan → execute】
      { cmd: '/workflow:tdd-plan', args: `"${analysis.goal}"`, unit: 'tdd-planning' },
      { cmd: '/workflow:execute', args: '', unit: 'tdd-planning' },
      // TDD Verification
      { cmd: '/workflow:tdd-verify', args: '' }
    ],

    'test-fix-gen': [
      // Unit: Test Validation【test-fix-gen → test-cycle-execute】
      { cmd: '/workflow:test-fix-gen', args: `"${analysis.goal}"`, unit: 'test-validation' },
      { cmd: '/workflow:test-cycle-execute', args: '', unit: 'test-validation' }
    ],

    'review-cycle-fix': [
      // Unit: Code Review【review-session-cycle → review-cycle-fix】
      { cmd: '/workflow:review-session-cycle', args: '', unit: 'code-review' },
      { cmd: '/workflow:review-cycle-fix', args: '', unit: 'code-review' },
      // Unit: Test Validation【test-fix-gen → test-cycle-execute】
      { cmd: '/workflow:test-fix-gen', args: '', unit: 'test-validation' },
      { cmd: '/workflow:test-cycle-execute', args: '', unit: 'test-validation' }
    ],

    'ui': [
      { cmd: '/workflow:ui-design:explore-auto', args: `"${analysis.goal}"` },
      // Unit: Planning + Execution【plan → execute】
      { cmd: '/workflow:plan', args: '', unit: 'plan-execute' },
      { cmd: '/workflow:execute', args: '', unit: 'plan-execute' }
    ],

    // Level 4 - Brainstorm
    'full': [
      { cmd: '/workflow:brainstorm:auto-parallel', args: `"${analysis.goal}"` },
      // Unit: Verified Planning【plan → plan-verify】
      { cmd: '/workflow:plan', args: '', unit: 'verified-planning' },
      { cmd: '/workflow:plan-verify', args: '', unit: 'verified-planning' },
      // Execution
      { cmd: '/workflow:execute', args: '' },
      // Unit: Test Validation【test-fix-gen → test-cycle-execute】
      { cmd: '/workflow:test-fix-gen', args: '', unit: 'test-validation' },
      { cmd: '/workflow:test-cycle-execute', args: '', unit: 'test-validation' }
    ],

    // Issue Workflow
    'issue': [
      { cmd: '/issue:discover', args: '' },
      { cmd: '/issue:plan', args: '--all-pending' },
      { cmd: '/issue:queue', args: '' },
      { cmd: '/issue:execute', args: '' }
    ]
  };

  return chains[workflow.flow] || chains['rapid'];
}
```

**Output**: `Level [X] - [flow] | Pipeline: [...] | Commands: [1. /cmd1 2. /cmd2 ...]`

---

### Phase 3: User Confirmation

```javascript
async function getUserConfirmation(chain) {
  const response = await AskUserQuestion({
    questions: [{
      question: "Execute this command chain?",
      header: "Confirm",
      options: [
        { label: "Confirm", description: "Start" },
        { label: "Adjust", description: "Modify" },
        { label: "Cancel", description: "Abort" }
      ]
    }]
  });

  if (response.error === "Cancel") throw new Error("Cancelled");
  if (response.error === "Adjust") return await adjustChain(chain);
  return chain;
}
```

---

### Phase 4: Setup TODO Tracking

```javascript
function setupTodoTracking(chain, workflow) {
  const todos = chain.map((step, i) => ({
    content: `CCW:${workflow}: [${i + 1}/${chain.length}] ${step.cmd}`,
    status: i === 0 ? 'in_progress' : 'pending',
    activeForm: `Executing ${step.cmd}`
  }));
  TodoWrite({ todos });
}
```

**Output**: `-> CCW:rapid: [1/3] /workflow:lite-plan | CCW:rapid: [2/3] /workflow:lite-execute | ...`

---

### Phase 5: Execute Command Chain

```javascript
async function executeCommandChain(chain, workflow) {
  let previousResult = null;

  for (let i = 0; i < chain.length; i++) {
    try {
      const fullCommand = assembleCommand(chain[i], previousResult);
      const result = await SlashCommand({ command: fullCommand });

      previousResult = { ...result, success: true };
      updateTodoStatus(i, chain.length, workflow, 'completed');

    } catch (error) {
      const action = await handleError(chain[i], error, i);
      if (action === 'retry') {
        i--;  // Retry
      } else if (action === 'abort') {
        return { success: false, error: error.message };
      }
      // 'skip' - continue
    }
  }

  return { success: true, completed: chain.length };
}

// Assemble full command with session/plan parameters
function assembleCommand(step, previousResult) {
  let command = step.cmd;
  if (step.args) {
    command += ` ${step.args}`;
  } else if (previousResult?.session_id) {
    command += ` --session="${previousResult.session_id}"`;
  }
  return command;
}

// Update TODO: mark current as complete, next as in-progress
function updateTodoStatus(index, total, workflow, status) {
  const todos = getAllCurrentTodos();
  const updated = todos.map(todo => {
    if (todo.content.startsWith(`CCW:${workflow}:`)) {
      const stepNum = extractStepIndex(todo.content);
      if (stepNum === index + 1) return { ...todo, status };
      if (stepNum === index + 2 && status === 'completed') return { ...todo, status: 'in_progress' };
    }
    return todo;
  });
  TodoWrite({ todos: updated });
}

// Error handling: Retry/Skip/Abort
async function handleError(step, error, index) {
  const response = await AskUserQuestion({
    questions: [{
      question: `${step.cmd} failed: ${error.message}`,
      header: "Error",
      options: [
        { label: "Retry", description: "Re-execute" },
        { label: "Skip", description: "Continue next" },
        { label: "Abort", description: "Stop" }
      ]
    }]
  });
  return { Retry: 'retry', Skip: 'skip', Abort: 'abort' }[response.Error] || 'abort';
}
```

---

## Execution Flow Summary

```
User Input
    |
Phase 1: Analyze Intent
    |-- Extract: goal, scope, constraints, task_type, complexity, clarity
    +-- If clarity < 2 -> Phase 1.5: Clarify Requirements
    |
Phase 2: Select Workflow & Build Chain
    |-- Map task_type -> Level (1/2/3/4/Issue)
    |-- Select flow based on complexity
    +-- Build command chain (port-based)
    |
Phase 3: User Confirmation (optional)
    |-- Show pipeline visualization
    +-- Allow adjustment
    |
Phase 4: Setup TODO Tracking
    +-- Create todos with CCW prefix
    |
Phase 5: Execute Command Chain
    |-- For each command:
    |   |-- Assemble full command
    |   |-- Execute via SlashCommand
    |   |-- Update TODO status
    |   +-- Handle errors (retry/skip/abort)
    +-- Return workflow result
```

---

## Pipeline Examples (with Minimum Execution Units)

**Note**: `【 】` marks Minimum Execution Units - commands execute together as atomic groups.

| Input | Type | Level | Pipeline (with Units) |
|-------|------|-------|-----------------------|
| "Add API endpoint" | feature (low) | 2 |【lite-plan → lite-execute】→【test-fix-gen → test-cycle-execute】|
| "Fix login timeout" | bugfix | 2 |【lite-fix → lite-execute】→【test-fix-gen → test-cycle-execute】|
| "Use issue workflow" | issue-transition | 2.5 |【lite-plan → convert-to-plan】→ queue → execute |
| "头脑风暴: 通知系统重构" | brainstorm | 4 | brainstorm-with-file → (built-in post-completion) |
| "从头脑风暴创建 issue" | brainstorm-to-issue | 4 | from-brainstorm → queue → execute |
| "深度调试 WebSocket 连接断开" | debug-file | 3 | debug-with-file → (hypothesis iteration) |
| "协作分析: 认证架构优化" | analyze-file | 3 | analyze-with-file → (multi-round discussion) |
| "OAuth2 system" | feature (high) | 3 |【plan → plan-verify】→ execute →【review-session-cycle → review-cycle-fix】→【test-fix-gen → test-cycle-execute】|
| "Implement with TDD" | tdd | 3 |【tdd-plan → execute】→ tdd-verify |
| "Uncertain: real-time arch" | exploration | 4 | brainstorm:auto-parallel →【plan → plan-verify】→ execute →【test-fix-gen → test-cycle-execute】|

---

## Key Design Principles

1. **Main Process Execution** - Use SlashCommand in main process, no external CLI
2. **Intent-Driven** - Auto-select workflow based on task intent
3. **Port-Based Chaining** - Build command chain using port matching
4. **Minimum Execution Units** - Commands grouped into atomic units, never split (e.g., lite-plan → lite-execute)
5. **Progressive Clarification** - Low clarity triggers clarification phase
6. **TODO Tracking** - Use CCW prefix to isolate workflow todos
7. **Unit-Aware Error Handling** - Retry/skip/abort affects whole unit, not individual commands
8. **User Control** - Optional user confirmation at each phase

---

## State Management

**TodoWrite-Based Tracking**: All execution state tracked via TodoWrite with `CCW:` prefix.

```javascript
// Initial state
todos = [
  { content: "CCW:rapid: [1/3] /workflow:lite-plan", status: "in_progress" },
  { content: "CCW:rapid: [2/3] /workflow:lite-execute", status: "pending" },
  { content: "CCW:rapid: [3/3] /workflow:test-cycle-execute", status: "pending" }
];

// After command 1 completes
todos = [
  { content: "CCW:rapid: [1/3] /workflow:lite-plan", status: "completed" },
  { content: "CCW:rapid: [2/3] /workflow:lite-execute", status: "in_progress" },
  { content: "CCW:rapid: [3/3] /workflow:test-cycle-execute", status: "pending" }
];
```

**vs ccw-coordinator**: Extensive state.json with task_id, status transitions, hook callbacks.

---

## With-File Workflows

**With-File workflows** provide documented exploration with multi-CLI collaboration. They are self-contained and generate comprehensive session artifacts.

| Workflow | Purpose | Key Features | Output Folder |
|----------|---------|--------------|---------------|
| **brainstorm-with-file** | Multi-perspective ideation | Gemini/Codex/Claude perspectives, diverge-converge cycles | `.workflow/.brainstorm/` |
| **debug-with-file** | Hypothesis-driven debugging | Gemini validation, understanding evolution, NDJSON logging | `.workflow/.debug/` |
| **analyze-with-file** | Collaborative analysis | Multi-round Q&A, CLI exploration, documented discussions | `.workflow/.analysis/` |

**Detection Keywords**:
- **brainstorm**: 头脑风暴, 创意, 发散思维, multi-perspective, compare perspectives
- **debug-file**: 深度调试, 假设验证, systematic debug, hypothesis debug
- **analyze-file**: 协作分析, 深度理解, collaborative analysis, explore concept

**Characteristics**:
1. **Self-Contained**: Each workflow handles its own iteration loop
2. **Documented Process**: Creates evolving documents (brainstorm.md, understanding.md, discussion.md)
3. **Multi-CLI**: Uses Gemini/Codex/Claude for different perspectives
4. **Built-in Post-Completion**: Offers follow-up options (create plan, issue, etc.)

---

## Type Comparison: ccw vs ccw-coordinator

| Aspect | ccw | ccw-coordinator |
|--------|-----|-----------------|
| **Type** | Main process (SlashCommand) | External CLI (ccw cli + hook callbacks) |
| **Execution** | Synchronous blocking | Async background with hook completion |
| **Workflow** | Auto intent-based selection | Manual chain building |
| **Intent Analysis** | 5-phase clarity check | 3-phase requirement analysis |
| **State** | TodoWrite only (in-memory) | state.json + checkpoint/resume |
| **Error Handling** | Retry/skip/abort (interactive) | Retry/skip/abort (via AskUser) |
| **Use Case** | Auto workflow for any task | Manual orchestration, large chains |

---

## Usage

```bash
# Auto-select workflow
ccw "Add user authentication"

# Complex requirement (triggers clarification)
ccw "Optimize system performance"

# Bug fix
ccw "Fix memory leak in WebSocket handler"

# TDD development
ccw "Implement user registration with TDD"

# Exploratory task
ccw "Uncertain about architecture for real-time notifications"

# With-File workflows (documented exploration with multi-CLI collaboration)
ccw "头脑风暴: 用户通知系统重新设计"           # → brainstorm-with-file
ccw "从头脑风暴 BS-通知系统-2025-01-28 创建 issue"  # → brainstorm-to-issue (bridge)
ccw "深度调试: 系统随机崩溃问题"              # → debug-with-file
ccw "协作分析: 理解现有认证架构的设计决策"     # → analyze-with-file
```
