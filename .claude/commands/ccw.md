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
| `workflow-tdd` | 6-phase TDD plan → verify |
| `workflow-test-fix` | session → context → analysis → gen → cycle |
| `workflow-multi-cli-plan` | ACE context → CLI discussion → plan → execute |
| `review-cycle` | session/module review → fix orchestration |
| `brainstorm` | auto/single-role → artifacts → analysis → synthesis |
| `workflow:collaborative-plan-with-file` | understanding agent → parallel agents → plan-note.md |
| `workflow:req-plan-with-file` | requirement decomposition → issue creation → execution-plan.json |
| `workflow:integration-test-cycle` | explore → test dev → test-fix cycle → reflection |
| `workflow:refactor-cycle` | tech debt discovery → prioritize → execute → validate |
| `team-planex` | planner + executor wave pipeline（边规划边执行）|
| `team-iterdev` | 迭代开发团队（planner → developer → reviewer 循环）|
| `team-lifecycle` | 全生命周期团队（spec → impl → test）|
| `team-issue` | issue 解决团队（discover → plan → execute）|
| `team-testing` | 测试团队（strategy → generate → execute → analyze）|
| `team-quality-assurance` | QA 团队（scout → strategist → generator → executor → analyst）|
| `team-brainstorm` | 团队头脑风暴（facilitator → participants → synthesizer）|
| `team-uidesign` | UI 设计团队（designer → implementer dual-track）|

独立命令（仍使用 colon 格式）：workflow:brainstorm-with-file, workflow:debug-with-file, workflow:analyze-with-file, workflow:collaborative-plan-with-file, workflow:req-plan-with-file, workflow:integration-test-cycle, workflow:refactor-cycle, workflow:unified-execute-with-file, workflow:clean, workflow:init, workflow:init-guidelines, workflow:ui-design:*, issue:*, workflow:session:*

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
| TDD Planning | `workflow-tdd` → `workflow-execute` | tdd-plan 和 execute 是独立 Skill |
| 测试流水线 | `workflow-test-fix` | 内部完成 gen→cycle |
| 代码审查 | `review-cycle` | 内部完成 review→fix |
| 多CLI协作 | `workflow-multi-cli-plan` | ACE context → CLI discussion → plan → execute |
| 协作规划 | `workflow:collaborative-plan-with-file` | 多 agent 协作生成 plan-note.md |
| 需求路线图 | `workflow:req-plan-with-file` | 需求拆解→issue 创建→执行计划 |
| 集成测试循环 | `workflow:integration-test-cycle` | 自迭代集成测试闭环 |
| 重构循环 | `workflow:refactor-cycle` | 技术债务发现→重构→验证 |
| 团队 Plan+Execute | `team-planex` | 2 人团队 wave pipeline，边规划边执行 |
| 团队迭代开发 | `team-iterdev` | 多角色迭代开发闭环 |
| 团队全生命周期 | `team-lifecycle` | spec→impl→test 全流程 |
| 团队 Issue | `team-issue` | 多角色协作 issue 解决 |
| 团队测试 | `team-testing` | 多角色测试流水线 |
| 团队 QA | `team-quality-assurance` | 多角色质量保障闭环 |
| 团队头脑风暴 | `team-brainstorm` | 多角色协作头脑风暴 |
| 团队 UI 设计 | `team-uidesign` | dual-track 设计+实现 |

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
    // With-File workflows (documented exploration with multi-CLI collaboration)
    'brainstorm': /brainstorm|ideation|头脑风暴|创意|发散思维|creative thinking|multi-perspective.*think|compare perspectives|探索.*可能/,
    'brainstorm-to-issue': /brainstorm.*issue|头脑风暴.*issue|idea.*issue|想法.*issue|从.*头脑风暴|convert.*brainstorm/,
    'debug-file': /debug.*document|hypothesis.*debug|troubleshoot.*track|investigate.*log|调试.*记录|假设.*验证|systematic debug|深度调试/,
    'analyze-file': /analyze.*document|explore.*concept|understand.*architecture|investigate.*discuss|collaborative analysis|分析.*讨论|深度.*理解|协作.*分析/,
    'collaborative-plan': /collaborative.*plan|协作.*规划|多人.*规划|multi.*agent.*plan|Plan Note|分工.*规划/,
    'req-plan': /roadmap|需求.*规划|需求.*拆解|requirement.*plan|req.*plan|progressive.*plan|路线.*图/,
    // Cycle workflows (self-iterating with reflection)
    'integration-test': /integration.*test|集成测试|端到端.*测试|e2e.*test|integration.*cycle/,
    'refactor': /refactor|重构|tech.*debt|技术债务/,
    // Team workflows (multi-role collaboration, explicit "team" keyword required)
    'team-planex': /team.*plan.*exec|team.*planex|团队.*规划.*执行|并行.*规划.*执行|wave.*pipeline/,
    'team-iterdev': /team.*iter|team.*iterdev|迭代.*开发.*团队|iterative.*dev.*team/,
    'team-lifecycle': /team.*lifecycle|全生命周期|full.*lifecycle|spec.*impl.*test.*team/,
    'team-issue': /team.*issue.*resolv|团队.*issue|team.*resolve.*issue/,
    'team-testing': /team.*test|测试团队|comprehensive.*test.*team|全面.*测试.*团队/,
    'team-qa': /team.*qa|quality.*assurance.*team|QA.*团队|质量.*保障.*团队|团队.*质量/,
    'team-brainstorm': /team.*brainstorm|团队.*头脑风暴|team.*ideation|多人.*头脑风暴/,
    'team-uidesign': /team.*ui.*design|UI.*设计.*团队|dual.*track.*design|团队.*UI/,
    // Standard workflows
    'multi-cli-plan': /multi.*cli|多.*CLI|多模型.*协作|multi.*model.*collab/,
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
    // With-File workflows (documented exploration with multi-CLI collaboration)
    'brainstorm':        { level: 4, flow: 'brainstorm-with-file' },   // Multi-perspective ideation
    'brainstorm-to-issue': { level: 4, flow: 'brainstorm-to-issue' }, // Brainstorm → Issue workflow
    'debug-file':        { level: 3, flow: 'debug-with-file' },         // Hypothesis-driven debugging
    'analyze-file':      { level: 3, flow: 'analyze-with-file' },       // Collaborative analysis
    'collaborative-plan': { level: 3, flow: 'collaborative-plan' },     // Multi-agent collaborative planning
    'req-plan':          { level: 4, flow: 'req-plan' },                // Requirement-level roadmap planning
    // Cycle workflows (self-iterating with reflection)
    'integration-test':  { level: 3, flow: 'integration-test-cycle' },  // Self-iterating integration test
    'refactor':          { level: 3, flow: 'refactor-cycle' },          // Tech debt discovery and refactoring
    // Team workflows (multi-role collaboration)
    'team-planex':       { level: 'Team', flow: 'team-planex' },
    'team-iterdev':      { level: 'Team', flow: 'team-iterdev' },
    'team-lifecycle':    { level: 'Team', flow: 'team-lifecycle' },
    'team-issue':        { level: 'Team', flow: 'team-issue' },
    'team-testing':      { level: 'Team', flow: 'team-testing' },
    'team-qa':           { level: 'Team', flow: 'team-qa' },
    'team-brainstorm':   { level: 'Team', flow: 'team-brainstorm' },
    'team-uidesign':     { level: 'Team', flow: 'team-uidesign' },
    // Standard workflows
    'multi-cli-plan':    { level: 3, flow: 'multi-cli-plan' },     // Multi-CLI collaborative planning
    'bugfix':            { level: 2, flow: 'bugfix.standard' },
    'issue-batch':       { level: 'Issue', flow: 'issue' },
    'issue-transition':  { level: 2.5, flow: 'rapid-to-issue' },  // Bridge workflow
    'exploration':       { level: 4, flow: 'full' },
    'quick-task':        { level: 2, flow: 'rapid' },
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

    // With-File workflows (documented exploration with multi-CLI collaboration)
    'brainstorm-with-file': [
      { cmd: 'workflow:brainstorm-with-file', args: `"${analysis.goal}"` }
      // Note: Has built-in post-completion options (create plan, create issue, deep analysis)
    ],

    // Brainstorm-to-Issue workflow (bridge from brainstorm to issue execution)
    'brainstorm-to-issue': [
      // Note: Assumes brainstorm session already exists, or run brainstorm first
      { cmd: 'issue:from-brainstorm', args: `SESSION="${extractBrainstormSession(analysis)}" --auto` },
      { cmd: 'issue:queue', args: '' },
      { cmd: 'issue:execute', args: '--queue auto' }
    ],

    'debug-with-file': [
      { cmd: 'workflow:debug-with-file', args: `"${analysis.goal}"` }
      // Note: Self-contained with hypothesis-driven iteration and Gemini validation
    ],

    'analyze-with-file': [
      { cmd: 'workflow:analyze-with-file', args: `"${analysis.goal}"` }
      // Note: Self-contained with multi-round discussion and CLI exploration
    ],

    'collaborative-plan': [
      { cmd: 'workflow:collaborative-plan-with-file', args: `"${analysis.goal}"` },
      { cmd: 'workflow:unified-execute-with-file', args: '' }
      // Note: Plan Note → unified execution engine
    ],

    'req-plan': [
      { cmd: 'workflow:req-plan-with-file', args: `"${analysis.goal}"` },
      { cmd: 'team-planex', args: '' }
      // Note: Requirement decomposition → issue creation → team-planex wave execution
    ],

    // Cycle workflows (self-iterating with reflection)
    'integration-test-cycle': [
      { cmd: 'workflow:integration-test-cycle', args: `"${analysis.goal}"` }
      // Note: Self-contained explore → test → fix cycle with reflection
    ],

    'refactor-cycle': [
      { cmd: 'workflow:refactor-cycle', args: `"${analysis.goal}"` }
      // Note: Self-contained tech debt discovery → refactor → validate
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

    'tdd': [
      { cmd: 'workflow-tdd', args: `"${analysis.goal}"` },
      { cmd: 'workflow-execute', args: '' }
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

    // Level 4 - Full
    'full': [
      { cmd: 'brainstorm', args: `"${analysis.goal}"` },
      { cmd: 'workflow-plan', args: '' },
      { cmd: 'workflow-execute', args: '' },
      ...(analysis.constraints?.includes('skip-tests') ? [] : [
        { cmd: 'workflow-test-fix', args: '' }
      ])
    ],

    // Issue Workflow
    'issue': [
      { cmd: 'issue:discover', args: '' },
      { cmd: 'issue:plan', args: '--all-pending' },
      { cmd: 'issue:queue', args: '' },
      { cmd: 'issue:execute', args: '' }
    ],

    // Team Workflows (multi-role collaboration, self-contained)
    'team-planex': [
      { cmd: 'team-planex', args: `"${analysis.goal}"` }
    ],

    'team-iterdev': [
      { cmd: 'team-iterdev', args: `"${analysis.goal}"` }
    ],

    'team-lifecycle': [
      { cmd: 'team-lifecycle', args: `"${analysis.goal}"` }
    ],

    'team-issue': [
      { cmd: 'team-issue', args: `"${analysis.goal}"` }
    ],

    'team-testing': [
      { cmd: 'team-testing', args: `"${analysis.goal}"` }
    ],

    'team-qa': [
      { cmd: 'team-quality-assurance', args: `"${analysis.goal}"` }
    ],

    'team-brainstorm': [
      { cmd: 'team-brainstorm', args: `"${analysis.goal}"` }
    ],

    'team-uidesign': [
      { cmd: 'team-uidesign', args: `"${analysis.goal}"` }
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
    |-- Map task_type -> Level (1/2/3/4/Issue)
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
| "头脑风暴: 通知系统重构" | brainstorm | 4 | workflow:brainstorm-with-file |
| "从头脑风暴创建 issue" | brainstorm-to-issue | 4 | issue:from-brainstorm → issue:queue → issue:execute |
| "深度调试 WebSocket" | debug-file | 3 | workflow:debug-with-file |
| "协作分析: 认证架构优化" | analyze-file | 3 | workflow:analyze-with-file |
| "协作规划: 实时通知系统" | collaborative-plan | 3 | collaborative-plan-with-file → unified-execute-with-file |
| "需求规划: OAuth + 2FA" | req-plan | 4 | req-plan-with-file → team-planex |
| "集成测试: 支付流程" | integration-test | 3 | workflow:integration-test-cycle |
| "重构 auth 模块" | refactor | 3 | workflow:refactor-cycle |
| "multi-cli plan: API设计" | multi-cli-plan | 3 | workflow-multi-cli-plan → workflow-test-fix |
| "OAuth2 system" | feature (high) | 3 | workflow-plan → workflow-execute → review-cycle → workflow-test-fix |
| "Implement with TDD" | tdd | 3 | workflow-tdd → workflow-execute |
| "Uncertain: real-time" | exploration | 4 | brainstorm → workflow-plan → workflow-execute → workflow-test-fix |
| "team planex: 用户系统" | team-planex | Team | team-planex |
| "迭代开发团队: 支付模块" | team-iterdev | Team | team-iterdev |
| "全生命周期: 通知服务" | team-lifecycle | Team | team-lifecycle |
| "team resolve issue #42" | team-issue | Team | team-issue |
| "测试团队: 全面测试认证" | team-testing | Team | team-testing |
| "QA 团队: 质量保障支付" | team-qa | Team | team-quality-assurance |
| "团队头脑风暴: API 设计" | team-brainstorm | Team | team-brainstorm |
| "团队 UI 设计: 仪表盘" | team-uidesign | Team | team-uidesign |

---

## Key Design Principles

1. **Main Process Execution** - Use Skill in main process, no external CLI
2. **Intent-Driven** - Auto-select workflow based on task intent
3. **Skill-Based Chaining** - Build command chain by composing independent Skills
4. **Self-Contained Skills** - 每个 Skill 内部处理完整流水线，是天然的最小执行单元
5. **Progressive Clarification** - Low clarity triggers clarification phase
6. **TODO Tracking** - Use CCW prefix to isolate workflow todos
7. **Error Handling** - Retry/skip/abort at Skill level
8. **User Control** - Optional user confirmation at each phase

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
    {
      "index": 0,
      "command": "workflow-lite-plan",
      "status": "completed"
    },
    {
      "index": 1,
      "command": "workflow-test-fix",
      "status": "running"
    }
  ],
  "current_index": 1
}
```

**Status Values**:
- `running`: Workflow executing commands
- `completed`: All commands finished
- `failed`: User aborted or unrecoverable error
- `error`: Command execution failed (during error handling)

**Command Status Values**:
- `pending`: Not started
- `running`: Currently executing
- `completed`: Successfully finished
- `failed`: Execution failed

---

## With-File Workflows

**With-File workflows** provide documented exploration with multi-CLI collaboration. They are self-contained and generate comprehensive session artifacts.

| Workflow | Purpose | Key Features | Output Folder |
|----------|---------|--------------|---------------|
| **brainstorm-with-file** | Multi-perspective ideation | Gemini/Codex/Claude perspectives, diverge-converge cycles | `.workflow/.brainstorm/` |
| **debug-with-file** | Hypothesis-driven debugging | Gemini validation, understanding evolution, NDJSON logging | `.workflow/.debug/` |
| **analyze-with-file** | Collaborative analysis | Multi-round Q&A, CLI exploration, documented discussions | `.workflow/.analysis/` |
| **collaborative-plan-with-file** | Multi-agent collaborative planning | Understanding agent + parallel agents, Plan Note shared doc | `.workflow/.planning/` |
| **req-plan-with-file** | Requirement roadmap planning | Requirement decomposition, issue creation, execution-plan.json | `.workflow/.planning/` |

**Detection Keywords**:
- **brainstorm**: 头脑风暴, 创意, 发散思维, multi-perspective, compare perspectives
- **debug-file**: 深度调试, 假设验证, systematic debug, hypothesis debug
- **analyze-file**: 协作分析, 深度理解, collaborative analysis, explore concept
- **collaborative-plan**: 协作规划, 多人规划, collaborative plan, multi-agent plan, Plan Note
- **req-plan**: roadmap, 需求规划, 需求拆解, requirement plan, progressive plan

**Characteristics**:
1. **Self-Contained**: Each workflow handles its own iteration loop
2. **Documented Process**: Creates evolving documents (brainstorm.md, understanding.md, discussion.md)
3. **Multi-CLI**: Uses Gemini/Codex/Claude for different perspectives
4. **Built-in Post-Completion**: Offers follow-up options (create plan, issue, etc.)

---

## Team Workflows

**Team workflows** provide multi-role collaboration for complex tasks. Each team skill is self-contained with internal role routing via `--role=xxx`.

| Workflow | Roles | Pipeline | Use Case |
|----------|-------|----------|----------|
| **team-planex** | planner + executor | wave pipeline（边规划边执行）| 需要并行规划和执行的任务 |
| **team-iterdev** | planner → developer → reviewer | 迭代开发循环 | 需要多轮迭代的开发任务 |
| **team-lifecycle** | spec → impl → test | 全生命周期 | 从需求到测试的完整流程 |
| **team-issue** | discover → plan → execute | issue 解决 | 多角色协作解决 issue |
| **team-testing** | strategy → generate → execute → analyze | 测试流水线 | 全面测试覆盖 |
| **team-quality-assurance** | scout → strategist → generator → executor → analyst | QA 闭环 | 质量保障全流程 |
| **team-brainstorm** | facilitator → participants → synthesizer | 团队头脑风暴 | 多角色协作头脑风暴 |
| **team-uidesign** | designer → implementer | dual-track 设计+实现 | UI 设计与实现并行 |

**Detection Keywords**:
- **team-planex**: team planex, 团队规划执行, wave pipeline
- **team-iterdev**: team iterdev, 迭代开发团队, iterative dev team
- **team-lifecycle**: team lifecycle, 全生命周期, full lifecycle
- **team-issue**: team issue, 团队 issue, team resolve issue
- **team-testing**: team test, 测试团队, comprehensive test team
- **team-qa**: team qa, QA 团队, 质量保障团队
- **team-brainstorm**: team brainstorm, 团队头脑风暴, team ideation
- **team-uidesign**: team ui design, UI 设计团队, dual track design

**Characteristics**:
1. **Self-Contained**: Each team skill handles internal role coordination
2. **Role-Based Routing**: All roles invoke the same skill with `--role=xxx`
3. **Shared Memory**: Roles communicate via shared-memory.json and message bus
4. **Auto Mode Support**: All team skills support `-y`/`--yes` for skip confirmations

---

## Cycle Workflows

**Cycle workflows** provide self-iterating development cycles with reflection-driven strategy adjustment. Each cycle is autonomous with built-in test-fix loops and quality gates.

| Workflow | Pipeline | Key Features | Output Folder |
|----------|----------|--------------|---------------|
| **integration-test-cycle** | explore → test dev → test-fix → reflection | Self-iterating with max-iterations, auto continue | `.workflow/.test-cycle/` |
| **refactor-cycle** | discover → prioritize → execute → validate | Multi-dimensional analysis, regression validation | `.workflow/.refactor-cycle/` |

**Detection Keywords**:
- **integration-test**: integration test, 集成测试, 端到端测试, e2e test
- **refactor**: refactor, 重构, tech debt, 技术债务

**Characteristics**:
1. **Self-Iterating**: Autonomous test-fix loops until quality gate passes
2. **Reflection-Driven**: Strategy adjusts based on previous iteration results
3. **Continue Support**: `--continue` flag to resume interrupted sessions
4. **Auto Mode Support**: `-y`/`--yes` for fully autonomous execution

---

## Utility Commands

**Utility commands** are not auto-routed by CCW intent detection. Invoke directly when needed.

| Command | Purpose |
|---------|---------|
| `workflow:unified-execute-with-file` | Universal execution engine - consumes plan output from collaborative-plan, req-plan, brainstorm |
| `workflow:clean` | Intelligent code cleanup - mainline detection, stale artifact removal |
| `workflow:init` | Initialize `.workflow/project-tech.json` with project analysis |
| `workflow:init-guidelines` | Interactive wizard to fill `specs/*.md` |

---

## Usage

```bash
# Auto-select workflow
/ccw "Add user authentication"

# Auto mode - skip all confirmations, propagate -y to all skills
/ccw -y "Add user authentication"
/ccw --yes "Fix memory leak in WebSocket handler"

# Complex requirement (triggers clarification)
/ccw "Optimize system performance"

# Bug fix
/ccw "Fix memory leak in WebSocket handler"

# TDD development
/ccw "Implement user registration with TDD"

# Exploratory task
/ccw "Uncertain about architecture for real-time notifications"

# Multi-CLI collaborative planning
/ccw "multi-cli plan: 支付网关API设计"               # → workflow-multi-cli-plan → workflow-test-fix

# With-File workflows (documented exploration with multi-CLI collaboration)
/ccw "头脑风暴: 用户通知系统重新设计"           # → brainstorm-with-file
/ccw "从头脑风暴 BS-通知系统-2025-01-28 创建 issue"  # → brainstorm-to-issue (bridge)
/ccw "深度调试: 系统随机崩溃问题"              # → debug-with-file
/ccw "协作分析: 理解现有认证架构的设计决策"     # → analyze-with-file

# Team workflows (multi-role collaboration)
/ccw "team planex: 用户认证系统"               # → team-planex (planner + executor wave pipeline)
/ccw "迭代开发团队: 支付模块重构"              # → team-iterdev (planner → developer → reviewer)
/ccw "全生命周期: 通知服务开发"                # → team-lifecycle (spec → impl → test)
/ccw "team resolve issue #42"                  # → team-issue (discover → plan → execute)
/ccw "测试团队: 全面测试认证模块"              # → team-testing (strategy → generate → execute → analyze)
/ccw "QA 团队: 质量保障支付流程"               # → team-quality-assurance (scout → strategist → generator → executor → analyst)
/ccw "团队头脑风暴: API 网关设计"              # → team-brainstorm (facilitator → participants → synthesizer)
/ccw "团队 UI 设计: 管理后台仪表盘"            # → team-uidesign (designer → implementer dual-track)

# Collaborative planning & requirement workflows
/ccw "协作规划: 实时通知系统架构"              # → collaborative-plan-with-file → unified-execute
/ccw "需求规划: 用户认证 OAuth + 2FA"          # → req-plan-with-file → team-planex
/ccw "roadmap: 数据导出功能路线图"             # → req-plan-with-file → team-planex

# Cycle workflows (self-iterating)
/ccw "集成测试: 支付流程端到端"                # → integration-test-cycle
/ccw "重构 auth 模块的技术债务"                # → refactor-cycle
/ccw "tech debt: 清理支付服务"                 # → refactor-cycle

# Utility commands (invoked directly, not auto-routed)
# /workflow:unified-execute-with-file          # 通用执行引擎（消费 plan 输出）
# /workflow:clean                              # 智能代码清理
# /workflow:init                               # 初始化项目状态
# /workflow:init-guidelines                    # 交互式填充项目规范
```
