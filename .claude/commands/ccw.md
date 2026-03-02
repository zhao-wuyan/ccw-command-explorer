---
name: ccw
description: Main workflow orchestrator - analyze intent, select workflow, execute command chain in main process
argument-hint: "\"task description\""
allowed-tools: Skill(*), TodoWrite(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*)
---

# CCW Command - Main Workflow Orchestrator

Main process orchestrator: intent analysis → workflow selection → command chain execution.

## Skill 映射

命令链中的 workflow 操作通过 `Skill()` 调用。每个 Skill 是自包含的执行单元，内部处理完整流水线。

| Skill | 内部流水线 |
|-------|-----------|
| `workflow-lite-plan` | explore → plan → confirm → execute |
| `workflow-plan` | session → context → convention → gen → verify/replan |
| `workflow-execute` | session discovery → task processing → commit |
| `workflow-tdd-plan` | 6-phase TDD plan → verify |
| `workflow-test-fix` | session → context → analysis → gen → cycle |
| `workflow-multi-cli-plan` | ACE context → CLI discussion → plan → execute |
| `review-cycle` | session/module review → fix orchestration |
| `brainstorm` | auto/single-role → artifacts → analysis → synthesis |
| `spec-generator` | product-brief → PRD → architecture → epics |
| `workflow:collaborative-plan-with-file` | understanding agent → parallel agents → plan-note.md |
| `workflow:roadmap-with-file` | strategic requirement roadmap → issue creation → execution-plan.json |
| `workflow:integration-test-cycle` | explore → test dev → test-fix cycle → reflection |
| `workflow:refactor-cycle` | tech debt discovery → prioritize → execute → validate |
| `team-planex` | planner + executor wave pipeline（适合大量零散 issue 或 roadmap 产出的清晰 issue）|

## Core Concept: Self-Contained Skills (自包含 Skill)

**Definition**: 每个 Skill 内部处理完整流水线，是天然的最小执行单元。单次 Skill 调用即完成一个有意义的工作里程碑。

**Why This Matters**:
- **Prevents Incomplete States**: 每个 Skill 内部保证端到端完整性
- **User Experience**: User gets complete results, not intermediate artifacts requiring manual follow-up
- **Simplified Orchestration**: 命令链只需组合独立 Skill，无需关注内部步骤

**Key Units in CCW**:

| 单元类型 | Skill | 说明 |
|---------|-------|------|
| 轻量 Plan+Execute | `workflow-lite-plan` | 内部完成 plan→execute |
| 标准 Planning | `workflow-plan` → `workflow-execute` | plan 和 execute 是独立 Skill |
| TDD Planning | `workflow-tdd-plan` → `workflow-execute` | tdd-plan 和 execute 是独立 Skill |
| 规格驱动 | `spec-generator` → `workflow-plan` → `workflow-execute` | 规格文档驱动完整开发 |
| 测试流水线 | `workflow-test-fix` | 内部完成 gen→cycle |
| 代码审查 | `review-cycle` | 内部完成 review→fix |
| 多CLI协作 | `workflow-multi-cli-plan` | ACE context → CLI discussion → plan → execute |
| 分析→规划 | `workflow:analyze-with-file` → `workflow-lite-plan` | 协作分析产物自动传递给 lite-plan |
| 头脑风暴→规划 | `workflow:brainstorm-with-file` → `workflow-plan` → `workflow-execute` | 头脑风暴产物自动传递给正式规划 |
| 0→1 开发(小) | `workflow:brainstorm-with-file` → `workflow-plan` → `workflow-execute` | 小规模从零开始，探索+正式规划+实现 |
| 0→1 开发(中/大) | `workflow:brainstorm-with-file` → `workflow-plan` → `workflow-execute` | 探索后正式规划+执行 |
| 协作规划 | `workflow:collaborative-plan-with-file` → `workflow:unified-execute-with-file` | 多 agent 协作规划→通用执行 |
| 需求路线图 | `workflow:roadmap-with-file` → `team-planex` | 需求拆解→issue 创建→wave pipeline 执行（需明确 roadmap 关键词）|
| 集成测试循环 | `workflow:integration-test-cycle` | 自迭代集成测试闭环 |
| 重构循环 | `workflow:refactor-cycle` | 技术债务发现→重构→验证 |

## Execution Model

**Synchronous (Main Process)**: Commands execute via Skill in main process, blocking until complete.

```
User Input → Analyze Intent → Select Workflow → [Confirm] → Execute Chain
                                                              ↓
                                                    Skill (blocking)
                                                              ↓
                                                    Update TodoWrite
                                                              ↓
                                                    Next Command...
```

**vs ccw-coordinator**: External CLI execution with background tasks and hook callbacks.

## Auto Mode (`-y` / `--yes`)

当用户传入 `-y` 或 `--yes` 时，整个 CCW 链路进入自动模式：

```javascript
// Phase 0: 检测 -y 标志（在 Phase 1 之前执行）
const autoYes = /\b(-y|--yes)\b/.test($ARGUMENTS)
```

**自动模式行为**:
- **Phase 1.5**: 跳过需求澄清（clarity_score < 2 也不询问，用已有信息推断）
- **Phase 3**: 跳过用户确认，直接执行命令链
- **Phase 5**: 错误处理自动选择 "Skip"（继续下一个命令）
- **Skill 传播**: `-y` 自动附加到链中每个 Skill 的 args

**传播机制**: 通过 `assembleCommand` 注入 `-y`：
```javascript
function assembleCommand(step, previousResult) {
  let args = step.args || '';
  if (!args && previousResult?.session_id) {
    args = `--session="${previousResult.session_id}"`;
  }
  // ★ 传播 -y 到下游 Skill
  if (autoYes && !args.includes('-y') && !args.includes('--yes')) {
    args = args ? `${args} -y` : '-y';
  }
  return { skill: step.cmd, args };
}
```

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
    // With-File workflows (documented exploration → auto chain to lite-plan)
    // 0→1 Greenfield detection (priority over brainstorm/roadmap)
    'greenfield': /从零开始|from scratch|0.*to.*1|greenfield|全新.*开发|新项目|new project|build.*from.*ground/,
    'brainstorm': /brainstorm|ideation|头脑风暴|创意|发散思维|creative thinking|multi-perspective.*think|compare perspectives|探索.*可能/,
    'brainstorm-to-issue': /brainstorm.*issue|头脑风暴.*issue|idea.*issue|想法.*issue|从.*头脑风暴|convert.*brainstorm/,
    'debug-file': /debug.*document|hypothesis.*debug|troubleshoot.*track|investigate.*log|调试.*记录|假设.*验证|systematic debug|深度调试/,
    'analyze-file': /analyze.*document|explore.*concept|understand.*architecture|investigate.*discuss|collaborative analysis|分析.*讨论|深度.*理解|协作.*分析/,
    'collaborative-plan': /collaborative.*plan|协作.*规划|多人.*规划|multi.*agent.*plan|Plan Note|分工.*规划/,
    'roadmap': /roadmap|路线.*图/,  // Narrowed: only explicit roadmap keywords (需求规划/需求拆解 moved to greenfield routing)
    'spec-driven': /spec.*gen|specification|PRD|产品需求|产品文档|产品规格/,
    // Cycle workflows (self-iterating with reflection)
    'integration-test': /integration.*test|集成测试|端到端.*测试|e2e.*test|integration.*cycle/,
    'refactor': /refactor|重构|tech.*debt|技术债务/,
    // Team workflows (kept: team-planex only)
    'team-planex': /team.*plan.*exec|team.*planex|团队.*规划.*执行|并行.*规划.*执行|wave.*pipeline/,
    // Standard workflows
    'multi-cli': /multi.*cli|多.*CLI|多模型.*协作|multi.*model.*collab/,
    'bugfix': /fix|bug|error|crash|fail|debug/,
    'issue-batch': /issues?|batch/ && /fix|resolve/,
    'issue-transition': /issue workflow|structured workflow|queue|multi-stage/,
    'exploration': /uncertain|explore|research|what if/,
    'quick-task': /quick|simple|small/ && /feature|function/,
    'ui-design': /ui|design|component|style/,
    'tdd': /tdd|test-driven|test first/,
    'test-fix': /test fail|fix test|failing test/,
    'test-gen': /generate test|写测试|add test|补充测试/,
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
  if (autoYes) return analysis;  // ★ 自动模式：跳过澄清，用已有信息推断

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
    // 0→1 Greenfield (complexity-adaptive routing)
    'greenfield':        { level: analysis.complexity === 'high' ? 4 : 3,
                           flow: analysis.complexity === 'high' ? 'greenfield-phased'    // large: brainstorm → workflow-plan → execute
                                : analysis.complexity === 'medium' ? 'greenfield-plan'   // medium: brainstorm → workflow-plan → execute
                                : 'brainstorm-to-plan' },                                // small: brainstorm → workflow-plan
    // With-File workflows → auto chain to lite-plan
    'brainstorm':        { level: 4, flow: 'brainstorm-to-plan' },     // brainstorm-with-file → workflow-plan
    'brainstorm-to-issue': { level: 4, flow: 'brainstorm-to-issue' },  // Brainstorm → Issue workflow
    'debug-file':        { level: 3, flow: 'debug-with-file' },         // Hypothesis-driven debugging (standalone)
    'analyze-file':      { level: 3, flow: 'analyze-to-plan' },         // analyze-with-file → lite-plan
    'collaborative-plan': { level: 3, flow: 'collaborative-plan' },     // Multi-agent collaborative planning
    'roadmap':           { level: 4, flow: 'roadmap' },                 // roadmap → team-planex (explicit roadmap only)
    'spec-driven':       { level: 4, flow: 'spec-driven' },             // spec-generator → plan → execute
    // Cycle workflows (self-iterating with reflection)
    'integration-test':  { level: 3, flow: 'integration-test-cycle' },
    'refactor':          { level: 3, flow: 'refactor-cycle' },
    // Team workflows (kept: team-planex only)
    'team-planex':       { level: 'Team', flow: 'team-planex' },
    // Standard workflows
    'multi-cli':         { level: 3, flow: 'multi-cli-plan' },
    'bugfix':            { level: 2, flow: 'bugfix.standard' },
    'issue-batch':       { level: 'Issue', flow: 'issue' },
    'issue-transition':  { level: 2.5, flow: 'rapid-to-issue' },
    'exploration':       { level: 4, flow: 'full' },
    'quick-task':        { level: 2, flow: 'rapid' },
    'ui-design':         { level: analysis.complexity === 'high' ? 4 : 3, flow: 'ui' },
    'tdd':               { level: 3, flow: 'tdd' },
    'test-gen':          { level: 3, flow: 'test-gen' },
    'test-fix':          { level: 3, flow: 'test-fix-gen' },
    'review':            { level: 3, flow: 'review-cycle-fix' },
    'documentation':     { level: 2, flow: 'docs' },
    'feature':           { level: analysis.complexity === 'high' ? 3 : 2, flow: analysis.complexity === 'high' ? 'coupled' : 'rapid' }
  };

  const selected = levelMap[analysis.task_type] || levelMap['feature'];
  return buildCommandChain(selected, analysis);
}

// Build command chain (Skill-based composition)
function buildCommandChain(workflow, analysis) {
  const chains = {
    // Level 2 - Lightweight
    'rapid': [
      { cmd: 'workflow-lite-plan', args: `"${analysis.goal}"` },
      ...(analysis.constraints?.includes('skip-tests') ? [] : [
        { cmd: 'workflow-test-fix', args: '' }
      ])
    ],

    // Level 2 Bridge - Lightweight to Issue Workflow
    'rapid-to-issue': [
      { cmd: 'workflow-lite-plan', args: `"${analysis.goal}" --plan-only` },
      { cmd: 'issue:convert-to-plan', args: '--latest-lite-plan -y' },
      { cmd: 'issue:queue', args: '' },
      { cmd: 'issue:execute', args: '--queue auto' }
    ],

    'bugfix.standard': [
      { cmd: 'workflow-lite-plan', args: `--bugfix "${analysis.goal}"` },
      ...(analysis.constraints?.includes('skip-tests') ? [] : [
        { cmd: 'workflow-test-fix', args: '' }
      ])
    ],

    'bugfix.hotfix': [
      { cmd: 'workflow-lite-plan', args: `--hotfix "${analysis.goal}"` }
    ],

    'multi-cli-plan': [
      { cmd: 'workflow-multi-cli-plan', args: `"${analysis.goal}"` },
      ...(analysis.constraints?.includes('skip-tests') ? [] : [
        { cmd: 'workflow-test-fix', args: '' }
      ])
    ],

    'docs': [
      { cmd: 'workflow-lite-plan', args: `"${analysis.goal}"` }
    ],

    // With-File → Auto Chain to lite-plan
    'analyze-to-plan': [
      { cmd: 'workflow:analyze-with-file', args: `"${analysis.goal}"` },
      { cmd: 'workflow-lite-plan', args: '' }  // auto receives analysis artifacts (discussion.md)
    ],

    'brainstorm-to-plan': [
      { cmd: 'workflow:brainstorm-with-file', args: `"${analysis.goal}"` },
      { cmd: 'workflow-plan', args: '' },         // formal planning with brainstorm artifacts
      { cmd: 'workflow-execute', args: '' },
      ...(analysis.constraints?.includes('skip-tests') ? [] : [
        { cmd: 'workflow-test-fix', args: '' }
      ])
    ],

    'debug-with-file': [
      { cmd: 'workflow:debug-with-file', args: `"${analysis.goal}"` }
      // Note: Self-contained with hypothesis-driven iteration and Gemini validation
    ],

    // Brainstorm-to-Issue workflow (bridge from brainstorm to issue execution)
    'brainstorm-to-issue': [
      { cmd: 'issue:from-brainstorm', args: `SESSION="${extractBrainstormSession(analysis)}" --auto` },
      { cmd: 'issue:queue', args: '' },
      { cmd: 'issue:execute', args: '--queue auto' }
    ],

    // 0→1 Greenfield (complexity-adaptive)
    'greenfield-plan': [
      { cmd: 'workflow:brainstorm-with-file', args: `"${analysis.goal}"` },
      { cmd: 'workflow-plan', args: '' },         // formal planning after exploration
      { cmd: 'workflow-execute', args: '' },
      ...(analysis.constraints?.includes('skip-tests') ? [] : [
        { cmd: 'workflow-test-fix', args: '' }
      ])
    ],

    'greenfield-phased': [
      { cmd: 'workflow:brainstorm-with-file', args: `"${analysis.goal}"` },
      { cmd: 'workflow-plan', args: '' },         // formal planning after exploration
      { cmd: 'workflow-execute', args: '' },
      { cmd: 'review-cycle', args: '' },
      ...(analysis.constraints?.includes('skip-tests') ? [] : [
        { cmd: 'workflow-test-fix', args: '' }
      ])
    ],

    // Universal Plan+Execute
    'collaborative-plan': [
      { cmd: 'workflow:collaborative-plan-with-file', args: `"${analysis.goal}"` },
      { cmd: 'workflow:unified-execute-with-file', args: '' }
    ],

    'roadmap': [
      { cmd: 'workflow:roadmap-with-file', args: `"${analysis.goal}"` },
      { cmd: 'team-planex', args: '' }
    ],

    // Level 3 - Standard
    'coupled': [
      { cmd: 'workflow-plan', args: `"${analysis.goal}"` },
      { cmd: 'workflow-execute', args: '' },
      { cmd: 'review-cycle', args: '' },
      ...(analysis.constraints?.includes('skip-tests') ? [] : [
        { cmd: 'workflow-test-fix', args: '' }
      ])
    ],

    // Level 4 - Spec-Driven Full Pipeline
    'spec-driven': [
      { cmd: 'spec-generator', args: `"${analysis.goal}"` },
      { cmd: 'workflow-plan', args: '' },
      { cmd: 'workflow-execute', args: '' },
      ...(analysis.constraints?.includes('skip-tests') ? [] : [
        { cmd: 'workflow-test-fix', args: '' }
      ])
    ],

    'tdd': [
      { cmd: 'workflow-tdd-plan', args: `"${analysis.goal}"` },
      { cmd: 'workflow-execute', args: '' }
    ],

    'test-gen': [
      { cmd: 'workflow-test-fix', args: `"${analysis.goal}"` }
    ],

    'test-fix-gen': [
      { cmd: 'workflow-test-fix', args: `"${analysis.goal}"` }
    ],

    'review-cycle-fix': [
      { cmd: 'review-cycle', args: '' },
      ...(analysis.constraints?.includes('skip-tests') ? [] : [
        { cmd: 'workflow-test-fix', args: '' }
      ])
    ],

    'ui': [
      { cmd: 'workflow:ui-design:explore-auto', args: `"${analysis.goal}"` },
      { cmd: 'workflow-plan', args: '' },
      { cmd: 'workflow-execute', args: '' }
    ],

    // Level 4 - Full Exploration (brainstorm → formal planning → execute)
    'full': [
      { cmd: 'brainstorm', args: `"${analysis.goal}"` },
      { cmd: 'workflow-plan', args: '' },
      { cmd: 'workflow-execute', args: '' },
      ...(analysis.constraints?.includes('skip-tests') ? [] : [
        { cmd: 'workflow-test-fix', args: '' }
      ])
    ],

    // Cycle workflows (self-iterating with reflection)
    'integration-test-cycle': [
      { cmd: 'workflow:integration-test-cycle', args: `"${analysis.goal}"` }
    ],

    'refactor-cycle': [
      { cmd: 'workflow:refactor-cycle', args: `"${analysis.goal}"` }
    ],

    // Issue Workflow
    'issue': [
      { cmd: 'issue:discover', args: '' },
      { cmd: 'issue:plan', args: '--all-pending' },
      { cmd: 'issue:queue', args: '' },
      { cmd: 'issue:execute', args: '' }
    ],

    // Team Workflows (kept: team-planex only)
    'team-planex': [
      { cmd: 'team-planex', args: `"${analysis.goal}"` }
    ]
  };

  return chains[workflow.flow] || chains['rapid'];
}
```

**Output**: `Level [X] - [flow] | Pipeline: [...] | Commands: [1. cmd1 2. cmd2 ...]`

---

### Phase 3: User Confirmation

```javascript
async function getUserConfirmation(chain) {
  if (autoYes) return chain;  // ★ 自动模式：跳过确认，直接执行

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

### Phase 4: Setup TODO Tracking & Status File

```javascript
function setupTodoTracking(chain, workflow, analysis) {
  const sessionId = `ccw-${Date.now()}`;
  const stateDir = `.workflow/.ccw/${sessionId}`;
  Bash(`mkdir -p "${stateDir}"`);

  const todos = chain.map((step, i) => ({
    content: `CCW:${workflow}: [${i + 1}/${chain.length}] ${step.cmd}`,
    status: i === 0 ? 'in_progress' : 'pending',
    activeForm: `Executing ${step.cmd}`
  }));
  TodoWrite({ todos });

  // Initialize status.json for hook tracking
  const state = {
    session_id: sessionId,
    workflow: workflow,
    status: 'running',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    analysis: analysis,
    command_chain: chain.map((step, idx) => ({
      index: idx,
      command: step.cmd,
      status: idx === 0 ? 'running' : 'pending'
    })),
    current_index: 0
  };

  Write(`${stateDir}/status.json`, JSON.stringify(state, null, 2));

  return { sessionId, stateDir, state };
}
```

**Output**:
- TODO: `-> CCW:rapid: [1/2] workflow-lite-plan | CCW:rapid: [2/2] workflow-test-fix | ...`
- Status File: `.workflow/.ccw/{session_id}/status.json`

---

### Phase 5: Execute Command Chain

```javascript
async function executeCommandChain(chain, workflow, trackingState) {
  let previousResult = null;
  const { sessionId, stateDir, state } = trackingState;

  for (let i = 0; i < chain.length; i++) {
    try {
      // Update status: mark current as running
      state.command_chain[i].status = 'running';
      state.current_index = i;
      state.updated_at = new Date().toISOString();
      Write(`${stateDir}/status.json`, JSON.stringify(state, null, 2));

      const assembled = assembleCommand(chain[i], previousResult);
      const result = await Skill(assembled);

      previousResult = { ...result, success: true };

      // Update status: mark current as completed, next as running
      state.command_chain[i].status = 'completed';
      if (i + 1 < chain.length) {
        state.command_chain[i + 1].status = 'running';
      }
      state.updated_at = new Date().toISOString();
      Write(`${stateDir}/status.json`, JSON.stringify(state, null, 2));

      updateTodoStatus(i, chain.length, workflow, 'completed');

    } catch (error) {
      // Update status on error
      state.command_chain[i].status = 'failed';
      state.status = 'error';
      state.updated_at = new Date().toISOString();
      Write(`${stateDir}/status.json`, JSON.stringify(state, null, 2));

      const action = await handleError(chain[i], error, i);
      if (action === 'retry') {
        state.command_chain[i].status = 'pending';
        state.status = 'running';
        i--;  // Retry
      } else if (action === 'abort') {
        state.status = 'failed';
        Write(`${stateDir}/status.json`, JSON.stringify(state, null, 2));
        return { success: false, error: error.message };
      }
      // 'skip' - continue
      state.status = 'running';
    }
  }

  // Mark workflow as completed
  state.status = 'completed';
  state.updated_at = new Date().toISOString();
  Write(`${stateDir}/status.json`, JSON.stringify(state, null, 2));

  return { success: true, completed: chain.length, sessionId };
}

// Assemble Skill call with session/plan parameters
function assembleCommand(step, previousResult) {
  let args = step.args || '';
  if (!args && previousResult?.session_id) {
    args = `--session="${previousResult.session_id}"`;
  }
  // ★ 传播 -y 到下游 Skill
  if (autoYes && !args.includes('-y') && !args.includes('--yes')) {
    args = args ? `${args} -y` : '-y';
  }
  return { skill: step.cmd, args };
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
  if (autoYes) return 'skip';  // ★ 自动模式：跳过失败命令，继续下一个

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
    |-- Map task_type -> Level (2/3/4/Issue/Team)
    |-- Select flow based on complexity
    +-- Build command chain (Skill-based)
    |
Phase 3: User Confirmation (optional)
    |-- Show pipeline visualization
    +-- Allow adjustment
    |
Phase 4: Setup TODO Tracking & Status File
    |-- Create todos with CCW prefix
    +-- Initialize .workflow/.ccw/{session_id}/status.json
    |
Phase 5: Execute Command Chain
    |-- For each command:
    |   |-- Update status.json (current=running)
    |   |-- Assemble Skill call
    |   |-- Execute via Skill
    |   |-- Update status.json (current=completed, next=running)
    |   |-- Update TODO status
    |   +-- Handle errors (retry/skip/abort)
    +-- Mark status.json as completed
```

---

## Pipeline Examples

| Input | Type | Level | Pipeline |
|-------|------|-------|----------|
| "Add API endpoint" | feature (low) | 2 | workflow-lite-plan → workflow-test-fix |
| "Fix login timeout" | bugfix | 2 | workflow-lite-plan → workflow-test-fix |
| "Use issue workflow" | issue-transition | 2.5 | workflow-lite-plan(plan-only) → convert-to-plan → queue → execute |
| "协作分析: 认证架构" | analyze-file | 3 | analyze-with-file → workflow-lite-plan |
| "深度调试 WebSocket" | debug-file | 3 | workflow:debug-with-file |
| "从零开始: 用户系统" | greenfield (medium) | 3 | brainstorm-with-file → workflow-plan → workflow-execute → workflow-test-fix |
| "greenfield: 大型平台" | greenfield (high) | 4 | brainstorm-with-file → workflow-plan → workflow-execute → review-cycle → workflow-test-fix |
| "头脑风暴: 通知系统" | brainstorm | 4 | brainstorm-with-file → workflow-plan → workflow-execute → workflow-test-fix |
| "从头脑风暴创建 issue" | brainstorm-to-issue | 4 | issue:from-brainstorm → issue:queue → issue:execute |
| "协作规划: 实时通知系统" | collaborative-plan | 3 | collaborative-plan-with-file → unified-execute-with-file |
| "roadmap: OAuth + 2FA" | roadmap | 4 | roadmap-with-file → team-planex |
| "specification: 用户系统" | spec-driven | 4 | spec-generator → workflow-plan → workflow-execute → workflow-test-fix |
| "集成测试: 支付流程" | integration-test | 3 | workflow:integration-test-cycle |
| "重构 auth 模块" | refactor | 3 | workflow:refactor-cycle |
| "multi-cli plan: API设计" | multi-cli-plan | 3 | workflow-multi-cli-plan → workflow-test-fix |
| "OAuth2 system" | feature (high) | 3 | workflow-plan → workflow-execute → review-cycle → workflow-test-fix |
| "Implement with TDD" | tdd | 3 | workflow-tdd-plan → workflow-execute |
| "Uncertain: real-time" | exploration | 4 | brainstorm → workflow-plan → workflow-execute → workflow-test-fix |
| "team planex: 用户系统" | team-planex | Team | team-planex |

---

## Key Design Principles

1. **Main Process Execution** - Use Skill in main process, no external CLI
2. **Intent-Driven** - Auto-select workflow based on task intent
3. **Skill-Based Chaining** - Build command chain by composing independent Skills
4. **Self-Contained Skills** - 每个 Skill 内部处理完整流水线，是天然的最小执行单元
5. **Auto Chain** - With-File 产物自动传递给下游 Skill（如 analyze → lite-plan）
6. **Progressive Clarification** - Low clarity triggers clarification phase
7. **TODO Tracking** - Use CCW prefix to isolate workflow todos
8. **Error Handling** - Retry/skip/abort at Skill level
9. **User Control** - Optional user confirmation at each phase

---

## State Management

### Dual Tracking System

**1. TodoWrite-Based Tracking** (UI Display): All execution state tracked via TodoWrite with `CCW:` prefix.

```javascript
// Initial state (rapid workflow: 2 steps)
todos = [
  { content: "CCW:rapid: [1/2] workflow-lite-plan", status: "in_progress" },
  { content: "CCW:rapid: [2/2] workflow-test-fix", status: "pending" }
];

// After step 1 completes
todos = [
  { content: "CCW:rapid: [1/2] workflow-lite-plan", status: "completed" },
  { content: "CCW:rapid: [2/2] workflow-test-fix", status: "in_progress" }
];
```

**2. Status.json Tracking**: Persistent state file for workflow monitoring.

**Location**: `.workflow/.ccw/{session_id}/status.json`

**Structure**:
```json
{
  "session_id": "ccw-1706123456789",
  "workflow": "rapid",
  "status": "running|completed|failed|error",
  "created_at": "2025-02-01T10:30:00Z",
  "updated_at": "2025-02-01T10:35:00Z",
  "analysis": {
    "goal": "Add user authentication",
    "scope": ["auth"],
    "constraints": [],
    "task_type": "feature",
    "complexity": "medium"
  },
  "command_chain": [
    { "index": 0, "command": "workflow-lite-plan", "status": "completed" },
    { "index": 1, "command": "workflow-test-fix", "status": "running" }
  ],
  "current_index": 1
}
```

**Status Values**: `running` | `completed` | `failed` | `error`
**Command Status Values**: `pending` | `running` | `completed` | `failed`

---

## With-File Workflows

**With-File workflows** provide documented exploration with multi-CLI collaboration. They generate comprehensive session artifacts and can auto-chain to lite-plan for implementation.

| Workflow | Purpose | Auto Chain | Output Folder |
|----------|---------|------------|---------------|
| **brainstorm-with-file** | Multi-perspective ideation | → workflow-plan → workflow-execute (auto) | `.workflow/.brainstorm/` |
| **debug-with-file** | Hypothesis-driven debugging | Standalone (self-contained) | `.workflow/.debug/` |
| **analyze-with-file** | Collaborative analysis | → workflow-lite-plan (auto) | `.workflow/.analysis/` |
| **collaborative-plan-with-file** | Multi-agent collaborative planning | → unified-execute-with-file | `.workflow/.planning/` |
| **roadmap-with-file** | Strategic requirement roadmap | → team-planex | `.workflow/.planning/` |

**Auto Chain Mechanism**: When `analyze-with-file` completes, its artifacts (discussion.md) are automatically passed to `workflow-lite-plan`. When `brainstorm-with-file` completes, its artifacts (brainstorm.md) are passed to `workflow-plan` for formal planning. No user intervention needed.

**Detection Keywords**:
- **brainstorm**: 头脑风暴, 创意, 发散思维, multi-perspective, compare perspectives
- **debug-file**: 深度调试, 假设验证, systematic debug, hypothesis debug
- **analyze-file**: 协作分析, 深度理解, collaborative analysis, explore concept
- **collaborative-plan**: 协作规划, 多人规划, collaborative plan, multi-agent plan, Plan Note
- **roadmap**: roadmap, 需求规划, 需求拆解, requirement plan, progressive plan
- **spec-driven**: specification, PRD, 产品需求, 产品文档

---

## Cycle Workflows

**Cycle workflows** provide self-iterating development cycles with reflection-driven strategy adjustment.

| Workflow | Pipeline | Key Features | Output Folder |
|----------|----------|--------------|---------------|
| **integration-test-cycle** | explore → test dev → test-fix → reflection | Self-iterating with max-iterations, auto continue | `.workflow/.test-cycle/` |
| **refactor-cycle** | discover → prioritize → execute → validate | Multi-dimensional analysis, regression validation | `.workflow/.refactor-cycle/` |

---

## Utility Commands

**Utility commands** are not auto-routed by CCW intent detection. Invoke directly when needed.

| Command | Purpose |
|---------|---------|
| `workflow:unified-execute-with-file` | Universal execution engine - consumes plan output from collaborative-plan, roadmap, brainstorm |
| `workflow:clean` | Intelligent code cleanup - mainline detection, stale artifact removal |
| `workflow:init` | Initialize `.workflow/project-tech.json` with project analysis |
| `workflow:init-guidelines` | Interactive wizard to fill `specs/*.md` |
| `workflow:status` | Generate on-demand views for project overview and workflow tasks |

---

## Usage

```bash
# Auto-select workflow
/ccw "Add user authentication"

# Auto mode - skip all confirmations, propagate -y to all skills
/ccw -y "Add user authentication"
/ccw --yes "Fix memory leak in WebSocket handler"

# Bug fix
/ccw "Fix memory leak in WebSocket handler"

# TDD development
/ccw "Implement user registration with TDD"

# Exploratory task
/ccw "Uncertain about architecture for real-time notifications"

# Multi-CLI collaborative planning
/ccw "multi-cli plan: 支付网关API设计"               # → workflow-multi-cli-plan → workflow-test-fix

# 0→1 Greenfield development (exploration-first)
/ccw "从零开始: 用户认证系统"                   # → brainstorm-with-file → workflow-plan → workflow-execute → workflow-test-fix
/ccw "new project: 数据导出模块"               # → brainstorm-with-file → workflow-plan → workflow-execute → workflow-test-fix
/ccw "全新开发: 实时通知系统"                   # → brainstorm-with-file → workflow-plan → workflow-execute → review-cycle → workflow-test-fix

# With-File workflows → auto chain
/ccw "协作分析: 理解现有认证架构的设计决策"     # → analyze-with-file → workflow-lite-plan
/ccw "头脑风暴: 用户通知系统重新设计"           # → brainstorm-with-file → workflow-plan → workflow-execute → workflow-test-fix
/ccw "深度调试: 系统随机崩溃问题"              # → debug-with-file (standalone)
/ccw "从头脑风暴 BS-通知系统-2025-01-28 创建 issue"  # → brainstorm-to-issue (bridge)

# Spec-driven full pipeline
/ccw "specification: 用户认证系统产品文档"      # → spec-generator → workflow-plan → workflow-execute → workflow-test-fix

# Collaborative planning & requirement workflows
/ccw "协作规划: 实时通知系统架构"              # → collaborative-plan-with-file → unified-execute
/ccw "roadmap: 用户认证 OAuth + 2FA 路线图"    # → roadmap-with-file → team-planex (explicit roadmap only)
/ccw "roadmap: 数据导出功能路线图"             # → roadmap-with-file → team-planex (explicit roadmap only)

# Team workflows (kept: team-planex)
/ccw "team planex: 用户认证系统"               # → team-planex (planner + executor wave pipeline)

# Cycle workflows (self-iterating)
/ccw "集成测试: 支付流程端到端"                # → integration-test-cycle
/ccw "重构 auth 模块的技术债务"                # → refactor-cycle

# Utility commands (invoked directly, not auto-routed)
# /workflow:unified-execute-with-file          # 通用执行引擎（消费 plan 输出）
# /workflow:clean                              # 智能代码清理
# /workflow:init                               # 初始化项目状态
# /workflow:init-guidelines                    # 交互式填充项目规范
# /workflow:status                             # 项目概览和工作流状态
```
