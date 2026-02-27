---
name: codex-coordinator
description: Command orchestration tool for Codex - analyze requirements, recommend command chain, execute sequentially with state persistence
argument-hint: "TASK=\"<task description>\" [--depth=standard|deep] [--auto-confirm] [--verbose]"
---

# Codex Coordinator Command

Interactive orchestration tool for Codex commands: analyze task → discover commands → recommend chain → execute sequentially → track state.

**Execution Model**: Intelligent agent-driven workflow. Claude analyzes each phase and orchestrates command execution.

## Core Concept: Minimum Execution Units (最小执行单元)

### What is a Minimum Execution Unit?

**Definition**: A set of commands that must execute together as an atomic group to achieve a meaningful workflow milestone. Splitting these commands breaks the logical flow and creates incomplete states.

**Why This Matters**:
- **Prevents Incomplete States**: Avoid stopping after task generation without execution
- **User Experience**: User gets complete results, not intermediate artifacts requiring manual follow-up
- **Workflow Integrity**: Maintains logical coherence of multi-step operations

### Codex Minimum Execution Units

**Planning + Execution Units** (规划+执行单元):

| Unit Name | Commands | Purpose | Output |
|-----------|----------|---------|--------|
| **Quick Implementation** | lite-plan-a → execute | Lightweight plan and immediate execution | Working code |
| **Bug Fix** | lite-fix → execute | Quick bug diagnosis and fix execution | Fixed code |
| **Issue Workflow** | issue-discover → issue-plan → issue-queue → issue-execute | Complete issue lifecycle | Completed issues |
| **Discovery & Analysis** | issue-discover → issue-discover-by-prompt | Issue discovery with multiple perspectives | Generated issues |
| **Brainstorm to Execution** | brainstorm-with-file → execute | Brainstorm ideas then implement | Working code |

**With-File Workflows** (文档化单元):

| Unit Name | Commands | Purpose | Output |
|-----------|----------|---------|--------|
| **Brainstorm With File** | brainstorm-with-file | Multi-perspective ideation with documentation | brainstorm.md |
| **Debug With File** | debug-with-file | Hypothesis-driven debugging with documentation | understanding.md |
| **Analyze With File** | analyze-with-file | Collaborative analysis with documentation | discussion.md |
| **Clean & Analyze** | clean → analyze-with-file | Cleanup then analyze | Cleaned code + analysis |

### Command-to-Unit Mapping (命令与最小单元的映射)

| Command | Precedes | Atomic Units |
|---------|----------|--------------|
| lite-plan-a | execute, brainstorm-with-file | Quick Implementation |
| lite-fix | execute | Bug Fix |
| issue-discover | issue-plan | Issue Workflow |
| issue-plan | issue-queue | Issue Workflow |
| issue-queue | issue-execute | Issue Workflow |
| brainstorm-with-file | execute, issue-execute | Brainstorm to Execution |
| debug-with-file | execute | Debug With File |
| analyze-with-file | (standalone) | Analyze With File |
| clean | analyze-with-file, execute | Clean & Analyze |
| quick-plan-with-file | execute | Quick Planning with File |
| merge-plans-with-file | execute | Merge Multiple Plans |
| unified-execute-with-file | (terminal) | Execute with File Tracking |

### Atomic Group Rules

1. **Never Split Units**: Coordinator must recommend complete units, not partial chains
2. **Multi-Unit Participation**: Some commands can participate in multiple units
3. **User Override**: User can explicitly request partial execution (advanced mode)
4. **Visualization**: Pipeline view shows unit boundaries with 【 】markers
5. **Validation**: Before execution, verify all unit commands are included

**Example Pipeline with Units**:
```
需求 → 【lite-plan-a → execute】→ 代码 → 【issue-discover → issue-plan → issue-queue → issue-execute】→ 完成
       └──── Quick Implementation ────┘         └────────── Issue Workflow ─────────┘
```

## 3-Phase Workflow

### Phase 1: Analyze Requirements

Parse task to extract: goal, scope, complexity, and task type.

```javascript
function analyzeRequirements(taskDescription) {
  return {
    goal: extractMainGoal(taskDescription),           // e.g., "Fix login bug"
    scope: extractScope(taskDescription),             // e.g., ["auth", "login"]
    complexity: determineComplexity(taskDescription), // 'simple' | 'medium' | 'complex'
    task_type: detectTaskType(taskDescription)        // See task type patterns below
  };
}

// Task Type Detection Patterns
function detectTaskType(text) {
  // Priority order (first match wins)
  if (/fix|bug|error|crash|fail|debug|diagnose/.test(text)) return 'bugfix';
  if (/生成|generate|discover|找出|issue|问题/.test(text)) return 'discovery';
  if (/plan|规划|设计|design|analyze|分析/.test(text)) return 'analysis';
  if (/清理|cleanup|clean|refactor|重构/.test(text)) return 'cleanup';
  if (/头脑|brainstorm|创意|ideation/.test(text)) return 'brainstorm';
  if (/合并|merge|combine|batch/.test(text)) return 'batch-planning';
  return 'feature';  // Default
}

// Complexity Assessment
function determineComplexity(text) {
  let score = 0;
  if (/refactor|重构|migrate|迁移|architect|架构|system|系统/.test(text)) score += 2;
  if (/multiple|多个|across|跨|all|所有|entire|整个/.test(text)) score += 2;
  if (/integrate|集成|api|database|数据库/.test(text)) score += 1;
  if (/security|安全|performance|性能|scale|扩展/.test(text)) score += 1;
  return score >= 4 ? 'complex' : score >= 2 ? 'medium' : 'simple';
}
```

**Display to user**:
```
Analysis Complete:
  Goal: [extracted goal]
  Scope: [identified areas]
  Complexity: [level]
  Task Type: [detected type]
```

### Phase 2: Discover Commands & Recommend Chain

Dynamic command chain assembly using task type and complexity matching.

#### Available Codex Commands (Discovery)

All commands from `~/.codex/prompts/`:
- **Planning**: @~/.codex/prompts/lite-plan-a.md, @~/.codex/prompts/lite-plan-b.md, @~/.codex/prompts/lite-plan-c.md, @~/.codex/prompts/quick-plan-with-file.md, @~/.codex/prompts/merge-plans-with-file.md
- **Execution**: @~/.codex/prompts/execute.md, @~/.codex/prompts/unified-execute-with-file.md
- **Bug Fixes**: @~/.codex/prompts/lite-fix.md, @~/.codex/prompts/debug-with-file.md
- **Discovery**: @~/.codex/prompts/issue-discover.md, @~/.codex/prompts/issue-discover-by-prompt.md, @~/.codex/prompts/issue-plan.md, @~/.codex/prompts/issue-queue.md, @~/.codex/prompts/issue-execute.md
- **Analysis**: @~/.codex/prompts/analyze-with-file.md
- **Brainstorming**: @~/.codex/prompts/brainstorm-with-file.md, @~/.codex/prompts/brainstorm-to-cycle.md
- **Cleanup**: @~/.codex/prompts/clean.md, @~/.codex/prompts/compact.md

#### Recommendation Algorithm

```javascript
async function recommendCommandChain(analysis) {
  // Step 1: 根据任务类型确定流程
  const { inputPort, outputPort } = determinePortFlow(analysis.task_type, analysis.complexity);

  // Step 2: Claude 根据命令特性和任务特征，智能选择命令序列
  const chain = selectChainByTaskType(analysis);

  return chain;
}

// 任务类型对应的端口流
function determinePortFlow(taskType, complexity) {
  const flows = {
    'bugfix':       { flow: ['lite-fix', 'execute'], depth: complexity === 'complex' ? 'deep' : 'standard' },
    'discovery':    { flow: ['issue-discover', 'issue-plan', 'issue-queue', 'issue-execute'], depth: 'standard' },
    'analysis':     { flow: ['analyze-with-file'], depth: complexity === 'complex' ? 'deep' : 'standard' },
    'cleanup':      { flow: ['clean'], depth: 'standard' },
    'brainstorm':   { flow: ['brainstorm-with-file', 'execute'], depth: complexity === 'complex' ? 'deep' : 'standard' },
    'batch-planning': { flow: ['merge-plans-with-file', 'execute'], depth: 'standard' },
    'feature':      { flow: complexity === 'complex' ? ['lite-plan-b'] : ['lite-plan-a', 'execute'], depth: complexity === 'complex' ? 'deep' : 'standard' }
  };
  return flows[taskType] || flows['feature'];
}
```

#### Display to User

```
Recommended Command Chain:

Pipeline (管道视图):
需求 → @~/.codex/prompts/lite-plan-a.md → 计划 → @~/.codex/prompts/execute.md → 代码完成

Commands (命令列表):
1. @~/.codex/prompts/lite-plan-a.md
2. @~/.codex/prompts/execute.md

Proceed? [Confirm / Show Details / Adjust / Cancel]
```

### Phase 2b: Get User Confirmation

Ask user for confirmation before proceeding with execution.

```javascript
async function getUserConfirmation(chain) {
  const response = await AskUserQuestion({
    questions: [{
      question: 'Proceed with this command chain?',
      header: 'Confirm Chain',
      multiSelect: false,
      options: [
        { label: 'Confirm and execute', description: 'Proceed with commands' },
        { label: 'Show details', description: 'View each command' },
        { label: 'Adjust chain', description: 'Remove or reorder' },
        { label: 'Cancel', description: 'Abort' }
      ]
    }]
  });

  return response;
}
```

### Phase 3: Execute Sequential Command Chain

```javascript
async function executeCommandChain(chain, analysis) {
  const sessionId = `codex-coord-${Date.now()}`;
  const stateDir = `.workflow/.codex-coordinator/${sessionId}`;

  // Create state directory
  const state = {
    session_id: sessionId,
    status: 'running',
    created_at: new Date().toISOString(),
    analysis: analysis,
    command_chain: chain.map((cmd, idx) => ({ ...cmd, index: idx, status: 'pending' })),
    execution_results: [],
  };

  // Save initial state
  Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));

  for (let i = 0; i < chain.length; i++) {
    const cmd = chain[i];
    console.log(`[${i+1}/${chain.length}] Executing: @~/.codex/prompts/${cmd.name}.md`);

    // Update status to running
    state.command_chain[i].status = 'running';
    state.updated_at = new Date().toISOString();
    Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));

    try {
      // Build command with parameters using full path
      let commandStr = `@~/.codex/prompts/${cmd.name}.md`;

      // Add parameters based on previous results and task context
      if (i > 0 && state.execution_results.length > 0) {
        const lastResult = state.execution_results[state.execution_results.length - 1];
        commandStr += ` --resume="${lastResult.session_id || lastResult.artifact}"`;
      }

      // For analysis-based commands, add depth parameter
      if (analysis.complexity === 'complex' && (cmd.name.includes('analyze') || cmd.name.includes('plan'))) {
        commandStr += ` --depth=deep`;
      }

      // Add task description for planning commands
      if (cmd.type === 'planning' && i === 0) {
        commandStr += ` TASK="${analysis.goal}"`;
      }

      // Execute command via Bash (spawning as background task)
      // Format: @~/.codex/prompts/command-name.md [] parameters
      // Note: This simulates the execution; actual implementation uses hook callbacks
      console.log(`Executing: ${commandStr}`);

      // Save execution record
      state.execution_results.push({
        index: i,
        command: cmd.name,
        status: 'in-progress',
        started_at: new Date().toISOString(),
        session_id: null,
        artifact: null
      });

      state.command_chain[i].status = 'completed';
      state.updated_at = new Date().toISOString();
      Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));

      console.log(`[${i+1}/${chain.length}] ✓ Completed: @~/.codex/prompts/${cmd.name}.md`);

    } catch (error) {
      state.command_chain[i].status = 'failed';
      state.updated_at = new Date().toISOString();
      Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));

      console.log(`❌ Command failed: ${error.message}`);
      break;
    }
  }

  state.status = 'completed';
  state.updated_at = new Date().toISOString();
  Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));

  console.log(`\n✅ Orchestration Complete: ${state.session_id}`);
  return state;
}
```

## State File Structure

**Location**: `.workflow/.codex-coordinator/{session_id}/state.json`

```json
{
  "session_id": "codex-coord-20250129-143025",
  "status": "running|waiting|completed|failed",
  "created_at": "2025-01-29T14:30:25Z",
  "updated_at": "2025-01-29T14:35:45Z",
  "analysis": {
    "goal": "Fix login authentication bug",
    "scope": ["auth", "login"],
    "complexity": "medium",
    "task_type": "bugfix"
  },
  "command_chain": [
    {
      "index": 0,
      "name": "lite-fix",
      "type": "bugfix",
      "status": "completed"
    },
    {
      "index": 1,
      "name": "execute",
      "type": "execution",
      "status": "pending"
    }
  ],
  "execution_results": [
    {
      "index": 0,
      "command": "lite-fix",
      "status": "completed",
      "started_at": "2025-01-29T14:30:25Z",
      "session_id": "fix-login-2025-01-29",
      "artifact": ".workflow/.lite-fix/fix-login-2025-01-29/fix-plan.json"
    }
  ]
}
```

### Status Values

- `running`: Orchestrator actively executing
- `waiting`: Paused, waiting for external events
- `completed`: All commands finished successfully
- `failed`: Error occurred or user aborted

## Task Type Routing (Pipeline Summary)

**Note**: 【 】marks Minimum Execution Units (最小执行单元) - these commands must execute together.

| Task Type | Pipeline | Minimum Units |
|-----------|----------|---|
| **bugfix** | Bug报告 →【@~/.codex/prompts/lite-fix.md → @~/.codex/prompts/execute.md】→ 修复代码 | Bug Fix |
| **discovery** | 需求 →【@~/.codex/prompts/issue-discover.md → @~/.codex/prompts/issue-plan.md → @~/.codex/prompts/issue-queue.md → @~/.codex/prompts/issue-execute.md】→ 完成 issues | Issue Workflow |
| **analysis** | 需求 → @~/.codex/prompts/analyze-with-file.md → 分析报告 | Analyze With File |
| **cleanup** | 代码库 → @~/.codex/prompts/clean.md → 清理完成 | Cleanup |
| **brainstorm** | 主题 →【@~/.codex/prompts/brainstorm-with-file.md → @~/.codex/prompts/execute.md】→ 实现代码 | Brainstorm to Execution |
| **batch-planning** | 需求集合 →【@~/.codex/prompts/merge-plans-with-file.md → @~/.codex/prompts/execute.md】→ 代码完成 | Merge Multiple Plans |
| **feature** (simple) | 需求 →【@~/.codex/prompts/lite-plan-a.md → @~/.codex/prompts/execute.md】→ 代码 | Quick Implementation |
| **feature** (complex) | 需求 → @~/.codex/prompts/lite-plan-b.md → 详细计划 → @~/.codex/prompts/execute.md → 代码 | Complex Planning |

## Available Commands Reference

### Planning Commands

| Command | Purpose | Usage | Output |
|---------|---------|-------|--------|
| **lite-plan-a** | Lightweight merged-mode planning | `@~/.codex/prompts/lite-plan-a.md TASK="..."` | plan.json |
| **lite-plan-b** | Multi-angle exploration planning | `@~/.codex/prompts/lite-plan-b.md TASK="..."` | plan.json |
| **lite-plan-c** | Parallel angle planning | `@~/.codex/prompts/lite-plan-c.md TASK="..."` | plan.json |
| **quick-plan-with-file** | Quick planning with file tracking | `@~/.codex/prompts/quick-plan-with-file.md TASK="..."` | plan + docs |
| **merge-plans-with-file** | Merge multiple plans | `@~/.codex/prompts/merge-plans-with-file.md PLANS="..."` | merged-plan.json |

### Execution Commands

| Command | Purpose | Usage | Output |
|---------|---------|-------|--------|
| **execute** | Execute tasks from plan | `@~/.codex/prompts/execute.md SESSION=".../plan/"` | Working code |
| **unified-execute-with-file** | Execute with file tracking | `@~/.codex/prompts/unified-execute-with-file.md SESSION="..."` | Code + tracking |

### Bug Fix Commands

| Command | Purpose | Usage | Output |
|---------|---------|-------|--------|
| **lite-fix** | Quick bug diagnosis and planning | `@~/.codex/prompts/lite-fix.md BUG="..."` | fix-plan.json |
| **debug-with-file** | Hypothesis-driven debugging | `@~/.codex/prompts/debug-with-file.md BUG="..."` | understanding.md |

### Discovery Commands

| Command | Purpose | Usage | Output |
|---------|---------|-------|--------|
| **issue-discover** | Multi-perspective issue discovery | `@~/.codex/prompts/issue-discover.md PATTERN="src/**"` | issues.jsonl |
| **issue-discover-by-prompt** | Prompt-based discovery | `@~/.codex/prompts/issue-discover-by-prompt.md PROMPT="..."` | issues |
| **issue-plan** | Plan issue solutions | `@~/.codex/prompts/issue-plan.md --all-pending` | issue-plans.json |
| **issue-queue** | Form execution queue | `@~/.codex/prompts/issue-queue.md --from-plan` | queue.json |
| **issue-execute** | Execute issue queue | `@~/.codex/prompts/issue-execute.md QUEUE="..."` | Completed |

### Analysis Commands

| Command | Purpose | Usage | Output |
|---------|---------|-------|--------|
| **analyze-with-file** | Collaborative analysis | `@~/.codex/prompts/analyze-with-file.md TOPIC="..."` | discussion.md |

### Brainstorm Commands

| Command | Purpose | Usage | Output |
|---------|---------|-------|--------|
| **brainstorm-with-file** | Multi-perspective brainstorming | `@~/.codex/prompts/brainstorm-with-file.md TOPIC="..."` | brainstorm.md |
| **brainstorm-to-cycle** | Bridge brainstorm to execution | `@~/.codex/prompts/brainstorm-to-cycle.md` | Executable plan |

### Utility Commands

| Command | Purpose | Usage | Output |
|---------|---------|-------|--------|
| **clean** | Intelligent code cleanup | `@~/.codex/prompts/clean.md` | Cleaned code |
| **compact** | Compact session memory | `@~/.codex/prompts/compact.md SESSION="..."` | Compressed state |

## Execution Flow

```
User Input: TASK="..."
    ↓
Phase 1: analyzeRequirements(task)
    ↓
Phase 2: recommendCommandChain(analysis)
         Display pipeline and commands
    ↓
User Confirmation
    ↓
Phase 3: executeCommandChain(chain, analysis)
    ├─ For each command:
    │  ├─ Update state to "running"
    │  ├─ Build command string with parameters
    │  ├─ Execute @command [] with parameters
    │  ├─ Save execution results
    │  └─ Update state to "completed"
    ↓
Output completion summary
```

## Key Design Principles

1. **Atomic Execution** - Never split minimum execution units
2. **State Persistence** - All state saved to JSON
3. **User Control** - Confirmation before execution
4. **Context Passing** - Parameters chain across commands
5. **Resume Support** - Can resume from state.json
6. **Intelligent Routing** - Task type determines command chain
7. **Complexity Awareness** - Different paths for simple vs complex tasks

## Command Invocation Format

**Format**: `@~/.codex/prompts/<command-name>.md <parameters>`

**Examples**:
```bash
@~/.codex/prompts/lite-plan-a.md TASK="Implement user authentication"
@~/.codex/prompts/execute.md SESSION=".workflow/.lite-plan/..."
@~/.codex/prompts/lite-fix.md BUG="Login fails with 404 error"
@~/.codex/prompts/issue-discover.md PATTERN="src/auth/**"
@~/.codex/prompts/brainstorm-with-file.md TOPIC="Improve user onboarding"
```

## Error Handling

| Situation | Action |
|-----------|--------|
| Unknown task type | Default to feature implementation |
| Command not found | Error: command not available |
| Execution fails | Report error, offer retry or skip |
| Invalid parameters | Validate and ask for correction |
| Circular dependency | Detect and report |
| All commands fail | Report and suggest manual intervention |

## Session Management

**Resume Previous Session**:
```
1. Find session in .workflow/.codex-coordinator/
2. Load state.json
3. Identify last completed command
4. Restart from next pending command
```

**View Session Progress**:
```
cat .workflow/.codex-coordinator/{session-id}/state.json
```

---

## Execution Instructions

The coordinator workflow follows these steps:

1. **Parse Input**: Extract task description from TASK parameter
2. **Analyze**: Determine goal, scope, complexity, and task type
3. **Recommend**: Build optimal command chain based on analysis
4. **Confirm**: Display pipeline and request user approval
5. **Execute**: Run commands sequentially with state tracking
6. **Report**: Display final results and artifacts

To use this coordinator, invoke it as a Claude Code command (not a Codex command):

From the Claude Code CLI, you would call Codex commands like:
```bash
@~/.codex/prompts/lite-plan-a.md TASK="Your task description"
```

Or with options:
```bash
@~/.codex/prompts/lite-plan-a.md TASK="..." --depth=deep
```

This coordinator orchestrates such Codex commands based on your task requirements.
