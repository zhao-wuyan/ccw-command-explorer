---
name: ccw-coordinator
description: Command orchestration tool - analyze requirements, recommend chain, execute sequentially with state persistence
argument-hint: "[task description]"
allowed-tools: Task(*), AskUserQuestion(*), Read(*), Write(*), Bash(*), Glob(*), Grep(*)
---

# CCW Coordinator Command

Interactive orchestration tool: analyze task → discover commands → recommend chain → execute sequentially → track state.

**Execution Model**: Pseudocode guidance. Claude intelligently executes each phase based on context.

## Core Concept: Minimum Execution Units (最小执行单元)

### What is a Minimum Execution Unit?

**Definition**: A set of commands that must execute together as an atomic group to achieve a meaningful workflow milestone. Splitting these commands breaks the logical flow and creates incomplete states.

**Why This Matters**:
- **Prevents Incomplete States**: Avoid stopping after task generation without execution
- **User Experience**: User gets complete results, not intermediate artifacts requiring manual follow-up
- **Workflow Integrity**: Maintains logical coherence of multi-step operations

### Minimum Execution Units

**Planning + Execution Units** (规划+执行单元):

| Unit Name | Commands | Purpose | Output |
|-----------|----------|---------|--------|
| **Quick Implementation** | lite-plan → lite-execute | Lightweight plan and immediate execution | Working code |
| **Multi-CLI Planning** | multi-cli-plan → lite-execute | Multi-perspective analysis and execution | Working code |
| **Bug Fix** | lite-fix → lite-execute | Quick bug diagnosis and fix execution | Fixed code |
| **Full Planning + Execution** | plan → execute | Detailed planning and execution | Working code |
| **Verified Planning + Execution** | plan → plan-verify → execute | Planning with verification and execution | Working code |
| **Replanning + Execution** | replan → execute | Update plan and execute changes | Working code |
| **TDD Planning + Execution** | tdd-plan → execute | Test-driven development planning and execution | Working code |
| **Test Generation + Execution** | test-gen → execute | Generate test suite and execute | Generated tests |

**Testing Units** (测试单元):

| Unit Name | Commands | Purpose | Output |
|-----------|----------|---------|--------|
| **Test Validation** | test-fix-gen → test-cycle-execute | Generate test tasks and execute test-fix cycle | Tests passed |

**Review Units** (审查单元):

| Unit Name | Commands | Purpose | Output |
|-----------|----------|---------|--------|
| **Code Review (Session)** | review-session-cycle → review-cycle-fix | Complete review cycle and apply fixes | Fixed code |
| **Code Review (Module)** | review-module-cycle → review-cycle-fix | Module review cycle and apply fixes | Fixed code |

**Issue Units** (Issue单元):

| Unit Name | Commands | Purpose | Output |
|-----------|----------|---------|--------|
| **Issue Workflow** | discover → plan → queue → execute | Complete issue lifecycle | Completed issues |
| **Rapid-to-Issue** | lite-plan → convert-to-plan → queue → execute | Bridge lite workflow to issue workflow | Completed issues |
| **Brainstorm-to-Issue** | from-brainstorm → queue → execute | Bridge brainstorm session to issue workflow | Completed issues |

**With-File Units** (文档化单元):

| Unit Name | Commands | Purpose | Output |
|-----------|----------|---------|--------|
| **Brainstorm With File** | brainstorm-with-file | Multi-perspective ideation with documentation | brainstorm.md |
| **Debug With File** | debug-with-file | Hypothesis-driven debugging with documentation | understanding.md |
| **Analyze With File** | analyze-with-file | Collaborative analysis with documentation | discussion.md |

### Command-to-Unit Mapping (命令与最小单元的映射)

| Command | Can Precede | Atomic Units |
|---------|-----------|--------------|
| lite-plan | lite-execute, convert-to-plan | Quick Implementation, Rapid-to-Issue |
| multi-cli-plan | lite-execute | Multi-CLI Planning |
| lite-fix | lite-execute | Bug Fix |
| plan | plan-verify, execute | Full Planning + Execution, Verified Planning + Execution |
| plan-verify | execute | Verified Planning + Execution |
| replan | execute | Replanning + Execution |
| test-gen | execute | Test Generation + Execution |
| tdd-plan | execute | TDD Planning + Execution |
| review-session-cycle | review-cycle-fix | Code Review (Session) |
| review-module-cycle | review-cycle-fix | Code Review (Module) |
| test-fix-gen | test-cycle-execute | Test Validation |
| issue:discover | issue:plan | Issue Workflow |
| issue:plan | issue:queue | Issue Workflow |
| convert-to-plan | issue:queue | Rapid-to-Issue |
| issue:queue | issue:execute | Issue Workflow, Rapid-to-Issue, Brainstorm-to-Issue |
| issue:from-brainstorm | issue:queue | Brainstorm-to-Issue |
| brainstorm-with-file | issue:from-brainstorm (optional) | Brainstorm With File, Brainstorm-to-Issue |
| debug-with-file | (standalone) | Debug With File |
| analyze-with-file | (standalone) | Analyze With File |

### Atomic Group Rules

1. **Never Split Units**: Coordinator must recommend complete units, not partial chains
2. **Multi-Unit Participation**: Some commands can participate in multiple units (e.g., plan → execute or plan → plan-verify → execute)
3. **User Override**: User can explicitly request partial execution (advanced mode)
4. **Visualization**: Pipeline view shows unit boundaries with `【 】` markers
5. **Validation**: Before execution, verify all unit commands are included

**Example Pipeline with Units**:
```
需求 → 【lite-plan → lite-execute】→ 代码 → 【test-fix-gen → test-cycle-execute】→ 测试通过
       └──── Quick Implementation ────┘         └────── Test Validation ──────┘
```

## 3-Phase Workflow

### Phase 1: Analyze Requirements

Parse task to extract: goal, scope, constraints, complexity, and task type.

```javascript
function analyzeRequirements(taskDescription) {
  return {
    goal: extractMainGoal(taskDescription),           // e.g., "Implement user registration"
    scope: extractScope(taskDescription),             // e.g., ["auth", "user_management"]
    constraints: extractConstraints(taskDescription), // e.g., ["no breaking changes"]
    complexity: determineComplexity(taskDescription), // 'simple' | 'medium' | 'complex'
    task_type: detectTaskType(taskDescription)        // See task type patterns below
  };
}

// Task Type Detection Patterns
function detectTaskType(text) {
  // Priority order (first match wins)
  if (/fix|bug|error|crash|fail|debug|diagnose/.test(text)) return 'bugfix';
  if (/tdd|test-driven|先写测试|test first/.test(text)) return 'tdd';
  if (/测试失败|test fail|fix test|failing test/.test(text)) return 'test-fix';
  if (/generate test|写测试|add test|补充测试/.test(text)) return 'test-gen';
  if (/review|审查|code review/.test(text)) return 'review';
  // Issue workflow patterns
  if (/issues?.*batch|batch.*issues?|批量.*issue|issue.*批量/.test(text)) return 'issue-batch';
  if (/issue workflow|structured workflow|queue|multi-stage|转.*issue|issue.*流程/.test(text)) return 'issue-transition';
  // With-File workflow patterns
  if (/brainstorm|ideation|头脑风暴|创意|发散思维|creative thinking/.test(text)) return 'brainstorm-file';
  if (/brainstorm.*issue|头脑风暴.*issue|idea.*issue|想法.*issue|从.*头脑风暴|convert.*brainstorm/.test(text)) return 'brainstorm-to-issue';
  if (/debug.*document|hypothesis.*debug|深度调试|假设.*验证|systematic debug/.test(text)) return 'debug-file';
  if (/analyze.*document|collaborative analysis|协作分析|深度.*理解/.test(text)) return 'analyze-file';
  if (/不确定|explore|研究|what if|brainstorm|权衡/.test(text)) return 'brainstorm';
  if (/多视角|比较方案|cross-verify|multi-cli/.test(text)) return 'multi-cli';
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
  Constraints: [identified constraints]
  Complexity: [level]
  Task Type: [detected type]
```

### Phase 2: Discover Commands & Recommend Chain

Dynamic command chain assembly using port-based matching.

#### Command Port Definition

Each command has input/output ports (tags) for pipeline composition:

```javascript
// Port labels represent data types flowing through the pipeline
const commandPorts = {
  'lite-plan': {
    name: 'lite-plan',
    input: ['requirement'],                    // 输入端口：需求
    output: ['plan'],                           // 输出端口：计划
    tags: ['planning'],
    atomic_group: 'quick-implementation'       // 最小单元：与 lite-execute 绑定
  },
  'lite-execute': {
    name: 'lite-execute',
    input: ['plan', 'multi-cli-plan', 'lite-fix'], // 输入端口：可接受多种规划输出
    output: ['code'],                           // 输出端口：代码
    tags: ['execution'],
    atomic_groups: [                           // 可参与多个最小单元
      'quick-implementation',                  // lite-plan → lite-execute
      'multi-cli-planning',                    // multi-cli-plan → lite-execute
      'bug-fix'                                // lite-fix → lite-execute
    ]
  },
  'plan': {
    name: 'plan',
    input: ['requirement'],
    output: ['detailed-plan'],
    tags: ['planning'],
    atomic_groups: [                           // 可参与多个最小单元
      'full-planning-execution',               // plan → execute
      'verified-planning-execution'            // plan → plan-verify → execute
    ]
  },
  'plan-verify': {
    name: 'plan-verify',
    input: ['detailed-plan'],
    output: ['verified-plan'],
    tags: ['planning'],
    atomic_group: 'verified-planning-execution' // 最小单元：plan → plan-verify → execute
  },
  'replan': {
    name: 'replan',
    input: ['session', 'feedback'],             // 输入端口：会话或反馈
    output: ['replan'],                         // 输出端口：更新后的计划（供 execute 执行）
    tags: ['planning'],
    atomic_group: 'replanning-execution'       // 最小单元：与 execute 绑定
  },
  'execute': {
    name: 'execute',
    input: ['detailed-plan', 'verified-plan', 'replan', 'test-tasks', 'tdd-tasks'], // 可接受多种规划输出
    output: ['code'],
    tags: ['execution'],
    atomic_groups: [                           // 可参与多个最小单元
      'full-planning-execution',               // plan → execute
      'verified-planning-execution',           // plan → plan-verify → execute
      'replanning-execution',                  // replan → execute
      'test-generation-execution',             // test-gen → execute
      'tdd-planning-execution'                 // tdd-plan → execute
    ]
  },
  'test-cycle-execute': {
    name: 'test-cycle-execute',
    input: ['test-tasks'],                      // 输入端口：测试任务(需先test-fix-gen生成)
    output: ['test-passed'],                    // 输出端口：测试通过
    tags: ['testing'],
    atomic_group: 'test-validation',           // 最小单元：与 test-fix-gen 绑定
    note: '需要先执行test-fix-gen生成测试任务，再由此命令执行测试周期'
  },
  'tdd-plan': {
    name: 'tdd-plan',
    input: ['requirement'],
    output: ['tdd-tasks'],                      // TDD 任务（供 execute 执行）
    tags: ['planning', 'tdd'],
    atomic_group: 'tdd-planning-execution'     // 最小单元：与 execute 绑定
  },
  'tdd-verify': {
    name: 'tdd-verify',
    input: ['code'],
    output: ['tdd-verified'],
    tags: ['testing']
  },
  'lite-fix': {
    name: 'lite-fix',
    input: ['bug-report'],                      // 输入端口：bug 报告
    output: ['lite-fix'],                       // 输出端口：修复计划（供 lite-execute 执行）
    tags: ['bugfix'],
    atomic_group: 'bug-fix'                    // 最小单元：与 lite-execute 绑定
  },
  'debug': {
    name: 'debug',
    input: ['bug-report'],
    output: ['debug-log'],
    tags: ['bugfix']
  },
  'test-gen': {
    name: 'test-gen',
    input: ['code', 'session'],                 // 可接受代码或会话
    output: ['test-tasks'],                     // 输出测试任务(IMPL-001,IMPL-002)，供 execute 执行
    tags: ['testing'],
    atomic_group: 'test-generation-execution'  // 最小单元：与 execute 绑定
  },
  'test-fix-gen': {
    name: 'test-fix-gen',
    input: ['failing-tests', 'session'],
    output: ['test-tasks'],                     // 输出测试任务，针对特定问题生成测试并在测试中修正
    tags: ['testing'],
    atomic_group: 'test-validation',           // 最小单元：与 test-cycle-execute 绑定
    note: '生成测试任务供test-cycle-execute执行'
  },
  'review': {
    name: 'review',
    input: ['code', 'session'],
    output: ['review-findings'],
    tags: ['review']
  },
  'review-cycle-fix': {
    name: 'review-cycle-fix',
    input: ['review-findings', 'review-verified'],  // Accept output from review-session-cycle or review-module-cycle
    output: ['fixed-code'],
    tags: ['review'],
    atomic_group: 'code-review'                // 最小单元：与 review-session-cycle/review-module-cycle 绑定
  },
  'brainstorm:auto-parallel': {
    name: 'brainstorm:auto-parallel',
    input: ['exploration-topic'],               // 输入端口：探索主题
    output: ['brainstorm-analysis'],
    tags: ['brainstorm']
  },
  'multi-cli-plan': {
    name: 'multi-cli-plan',
    input: ['requirement'],
    output: ['multi-cli-plan'],                 // 对比分析计划（供 lite-execute 执行）
    tags: ['planning', 'multi-cli'],
    atomic_group: 'multi-cli-planning'         // 最小单元：与 lite-execute 绑定
  },
  'review-session-cycle': {
    name: 'review-session-cycle',
    input: ['code', 'session'],                 // 可接受代码或会话
    output: ['review-verified'],                // 输出端口:审查通过
    tags: ['review'],
    atomic_group: 'code-review'                // 最小单元：与 review-cycle-fix 绑定
  },
  'review-module-cycle': {
    name: 'review-module-cycle',
    input: ['module-pattern'],                  // 输入端口:模块模式
    output: ['review-verified'],                // 输出端口:审查通过
    tags: ['review'],
    atomic_group: 'code-review'                // 最小单元：与 review-cycle-fix 绑定
  },

  // Issue workflow commands
  'issue:discover': {
    name: 'issue:discover',
    input: ['codebase'],                        // 输入端口：代码库
    output: ['pending-issues'],                 // 输出端口：待处理 issues
    tags: ['issue'],
    atomic_group: 'issue-workflow'             // 最小单元：discover → plan → queue → execute
  },
  'issue:plan': {
    name: 'issue:plan',
    input: ['pending-issues'],                  // 输入端口：待处理 issues
    output: ['issue-plans'],                    // 输出端口：issue 计划
    tags: ['issue'],
    atomic_group: 'issue-workflow'
  },
  'issue:queue': {
    name: 'issue:queue',
    input: ['issue-plans', 'converted-plan'],   // 可接受 issue:plan 或 convert-to-plan 输出
    output: ['execution-queue'],                // 输出端口：执行队列
    tags: ['issue'],
    atomic_groups: ['issue-workflow', 'rapid-to-issue']
  },
  'issue:execute': {
    name: 'issue:execute',
    input: ['execution-queue'],                 // 输入端口：执行队列
    output: ['completed-issues'],               // 输出端口：已完成 issues
    tags: ['issue'],
    atomic_groups: ['issue-workflow', 'rapid-to-issue']
  },
  'issue:convert-to-plan': {
    name: 'issue:convert-to-plan',
    input: ['plan'],                            // 输入端口：lite-plan 输出
    output: ['converted-plan'],                 // 输出端口：转换后的 issue 计划
    tags: ['issue', 'planning'],
    atomic_group: 'rapid-to-issue'             // 最小单元：lite-plan → convert-to-plan → queue → execute
  },

  // With-File workflows (documented exploration with multi-CLI collaboration)
  'brainstorm-with-file': {
    name: 'brainstorm-with-file',
    input: ['exploration-topic'],               // 输入端口：探索主题
    output: ['brainstorm-document'],            // 输出端口：brainstorm.md + 综合结论
    tags: ['brainstorm', 'with-file'],
    note: 'Self-contained workflow with multi-round diverge-converge cycles'
  },
  'issue:from-brainstorm': {
    name: 'issue:from-brainstorm',
    input: ['brainstorm-document'],             // 输入端口：brainstorm 产物（synthesis.json）
    output: ['converted-plan'],                 // 输出端口：issue + solution
    tags: ['issue', 'brainstorm'],
    atomic_group: 'brainstorm-to-issue'        // 最小单元：from-brainstorm → queue → execute
  },
  'debug-with-file': {
    name: 'debug-with-file',
    input: ['bug-report'],                      // 输入端口：bug 报告
    output: ['understanding-document'],         // 输出端口：understanding.md + 修复
    tags: ['bugfix', 'with-file'],
    note: 'Self-contained workflow with hypothesis-driven iteration'
  },
  'analyze-with-file': {
    name: 'analyze-with-file',
    input: ['analysis-topic'],                  // 输入端口：分析主题
    output: ['discussion-document'],            // 输出端口：discussion.md + 结论
    tags: ['analysis', 'with-file'],
    note: 'Self-contained workflow with multi-round discussion'
  }
};
```

#### Recommendation Algorithm

```javascript
async function recommendCommandChain(analysis) {
  // Step 1: 根据任务类型确定起始端口和目标端口
  const { inputPort, outputPort } = determinePortFlow(analysis.task_type, analysis.constraints);

  // Step 2: Claude 根据命令端口定义和任务特征，智能选择命令序列
  // 优先级：简单任务 → lite-* 命令，复杂任务 → 完整命令，特殊约束 → 调整流程
  const chain = selectChainByPorts(inputPort, outputPort, analysis);

  return chain;
}

// 任务类型对应的端口流
function determinePortFlow(taskType, constraints) {
  const flows = {
    'bugfix':         { inputPort: 'bug-report', outputPort: constraints?.includes('skip-tests') ? 'fixed-code' : 'test-passed' },
    'tdd':            { inputPort: 'requirement', outputPort: 'tdd-verified' },
    'test-fix':       { inputPort: 'failing-tests', outputPort: 'test-passed' },
    'test-gen':       { inputPort: 'code', outputPort: 'test-passed' },
    'review':         { inputPort: 'code', outputPort: 'review-verified' },
    'brainstorm':     { inputPort: 'exploration-topic', outputPort: 'test-passed' },
    'multi-cli':      { inputPort: 'requirement', outputPort: 'test-passed' },
    // Issue workflow types
    'issue-batch':      { inputPort: 'codebase', outputPort: 'completed-issues' },
    'issue-transition': { inputPort: 'requirement', outputPort: 'completed-issues' },
    // With-File workflow types
    'brainstorm-file':    { inputPort: 'exploration-topic', outputPort: 'brainstorm-document' },
    'brainstorm-to-issue': { inputPort: 'brainstorm-document', outputPort: 'completed-issues' },
    'debug-file':         { inputPort: 'bug-report', outputPort: 'understanding-document' },
    'analyze-file':       { inputPort: 'analysis-topic', outputPort: 'discussion-document' },
    'feature':            { inputPort: 'requirement', outputPort: constraints?.includes('skip-tests') ? 'code' : 'test-passed' }
  };
  return flows[taskType] || flows['feature'];
}

// Claude 根据端口流选择命令链
function selectChainByPorts(inputPort, outputPort, analysis) {
  // 参考下面的命令端口定义表和执行示例，Claude 智能选择合适的命令序列
  // 返回值示例: [lite-plan, lite-execute, test-cycle-execute]
}
```

#### Display to User

```
Recommended Command Chain:

Pipeline (管道视图):
需求 → lite-plan → 计划 → lite-execute → 代码 → test-cycle-execute → 测试通过

Commands (命令列表):
1. /workflow:lite-plan
2. /workflow:lite-execute
3. /workflow:test-cycle-execute

Proceed? [Confirm / Show Details / Adjust / Cancel]
```

### Phase 2b: Get User Confirmation

```javascript
async function getUserConfirmation(chain) {
  const response = await AskUserQuestion({
    questions: [{
      question: 'Proceed with this command chain?',
      header: 'Confirm',
      options: [
        { label: 'Confirm and execute', description: 'Proceed with commands' },
        { label: 'Show details', description: 'View each command' },
        { label: 'Adjust chain', description: 'Remove or reorder' },
        { label: 'Cancel', description: 'Abort' }
      ]
    }]
  });

  if (response.confirm === 'Cancel') throw new Error('Cancelled');
  if (response.confirm === 'Show details') {
    displayCommandDetails(chain);
    return getUserConfirmation(chain);
  }
  if (response.confirm === 'Adjust chain') {
    return await adjustChain(chain);
  }
  return chain;
}
```

### Phase 3: Execute Sequential Command Chain

```javascript
async function executeCommandChain(chain, analysis) {
  const sessionId = `ccw-coord-${Date.now()}`;
  const stateDir = `.workflow/.ccw-coordinator/${sessionId}`;
  Bash(`mkdir -p "${stateDir}"`);

  const state = {
    session_id: sessionId,
    status: 'running',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    analysis: analysis,
    command_chain: chain.map((cmd, idx) => ({ ...cmd, index: idx, status: 'pending' })),
    execution_results: [],
    prompts_used: []
  };

  // Save initial state immediately after confirmation
  Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));

  for (let i = 0; i < chain.length; i++) {
    const cmd = chain[i];
    console.log(`[${i+1}/${chain.length}] ${cmd.command}`);

    // Update command_chain status to running
    state.command_chain[i].status = 'running';
    state.updated_at = new Date().toISOString();
    Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));

    // Assemble prompt: Command first, then context
    let promptContent = formatCommand(cmd, state.execution_results, analysis);

    // Build full prompt: Command → Task → Previous Results
    let prompt = `${promptContent}\n\nTask: ${analysis.goal}`;
    if (state.execution_results.length > 0) {
      prompt += '\n\nPrevious results:\n';
      state.execution_results.forEach(r => {
        if (r.session_id) {
          prompt += `- ${r.command}: ${r.session_id} (${r.artifacts?.join(', ') || 'completed'})\n`;
        }
      });
    }

    // Record prompt used
    state.prompts_used.push({
      index: i,
      command: cmd.command,
      prompt: prompt
    });

    // Execute CLI command in background and stop
    // Format: ccw cli -p "PROMPT" --tool <tool> --mode <mode>
    // Note: -y is a command parameter INSIDE the prompt, not a ccw cli parameter
    // Example prompt: "/workflow:plan -y \"task description here\""
    try {
      const taskId = Bash(
        `ccw cli -p "${escapePrompt(prompt)}" --tool claude --mode write`,
        { run_in_background: true }
      ).task_id;

      // Save checkpoint
      state.execution_results.push({
        index: i,
        command: cmd.command,
        status: 'in-progress',
        task_id: taskId,
        session_id: null,
        artifacts: [],
        timestamp: new Date().toISOString()
      });
      state.command_chain[i].status = 'running';
      state.updated_at = new Date().toISOString();
      Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));

      console.log(`[${i+1}/${chain.length}] ${cmd.command}\n`);
      break; // Stop, wait for hook callback

    } catch (error) {
      state.command_chain[i].status = 'failed';
      state.updated_at = new Date().toISOString();
      Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));

      const action = await AskUserQuestion({
        questions: [{
          question: `${cmd.command} failed to start: ${error.message}. What to do?`,
          header: 'Error',
          options: [
            { label: 'Retry', description: 'Try again' },
            { label: 'Skip', description: 'Continue next command' },
            { label: 'Abort', description: 'Stop execution' }
          ]
        }]
      });

      if (action.error === 'Retry') {
        state.command_chain[i].status = 'pending';
        state.execution_results.pop();
        i--;
      } else if (action.error === 'Skip') {
        state.execution_results[state.execution_results.length - 1].status = 'skipped';
      } else if (action.error === 'Abort') {
        state.status = 'failed';
        break;
      }
    }

    Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));
  }

  // Hook callbacks handle completion
  if (state.status !== 'failed') state.status = 'waiting';
  state.updated_at = new Date().toISOString();
  Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));

  console.log(`\n📋 Orchestrator paused: ${state.session_id}\n`);
  return state;
}

// Smart parameter assembly
// Returns prompt content to be used with: ccw cli -p "RETURNED_VALUE" --tool claude --mode write
function formatCommand(cmd, previousResults, analysis) {
  // Format: /workflow:<command> -y <parameters>
  let prompt = `/workflow:${cmd.name} -y`;
  const name = cmd.name;

  // Planning commands - take task description
  if (['lite-plan', 'plan', 'tdd-plan', 'multi-cli-plan'].includes(name)) {
    prompt += ` "${analysis.goal}"`;

  // Lite execution - use --in-memory if plan exists
  } else if (name === 'lite-execute') {
    const hasPlan = previousResults.some(r => r.command.includes('plan'));
    prompt += hasPlan ? ' --in-memory' : ` "${analysis.goal}"`;

  // Standard execution - resume from planning session
  } else if (name === 'execute') {
    const plan = previousResults.find(r => r.command.includes('plan'));
    if (plan?.session_id) prompt += ` --resume-session="${plan.session_id}"`;

  // Bug fix commands - take bug description
  } else if (['lite-fix', 'debug'].includes(name)) {
    prompt += ` "${analysis.goal}"`;

  // Brainstorm - take topic description
  } else if (name === 'brainstorm:auto-parallel' || name === 'auto-parallel') {
    prompt += ` "${analysis.goal}"`;

  // Test generation from session - needs source session
  } else if (name === 'test-gen') {
    const impl = previousResults.find(r =>
      r.command.includes('execute') || r.command.includes('lite-execute')
    );
    if (impl?.session_id) prompt += ` "${impl.session_id}"`;
    else prompt += ` "${analysis.goal}"`;

  // Test fix generation - session or description
  } else if (name === 'test-fix-gen') {
    const latest = previousResults.filter(r => r.session_id).pop();
    if (latest?.session_id) prompt += ` "${latest.session_id}"`;
    else prompt += ` "${analysis.goal}"`;

  // Review commands - take session or use latest
  } else if (name === 'review') {
    const latest = previousResults.filter(r => r.session_id).pop();
    if (latest?.session_id) prompt += ` --session="${latest.session_id}"`;

  // Review fix - takes session from review
  } else if (name === 'review-cycle-fix') {
    const review = previousResults.find(r => r.command.includes('review'));
    const latest = review || previousResults.filter(r => r.session_id).pop();
    if (latest?.session_id) prompt += ` --session="${latest.session_id}"`;

  // TDD verify - takes execution session
  } else if (name === 'tdd-verify') {
    const exec = previousResults.find(r => r.command.includes('execute'));
    if (exec?.session_id) prompt += ` --session="${exec.session_id}"`;

  // Session-based commands (test-cycle, review-session, plan-verify)
  } else if (name.includes('test') || name.includes('review') || name.includes('verify')) {
    const latest = previousResults.filter(r => r.session_id).pop();
    if (latest?.session_id) prompt += ` --session="${latest.session_id}"`;

  // Issue workflow commands
  } else if (name === 'issue:discover') {
    // No parameters needed - discovers from codebase
    prompt = `/issue:discover -y`;

  } else if (name === 'issue:plan') {
    prompt = `/issue:plan -y --all-pending`;

  } else if (name === 'issue:queue') {
    prompt = `/issue:queue -y`;

  } else if (name === 'issue:execute') {
    prompt = `/issue:execute -y --queue auto`;

  } else if (name === 'issue:convert-to-plan' || name === 'convert-to-plan') {
    // Convert latest lite-plan to issue plan
    prompt = `/issue:convert-to-plan -y --latest-lite-plan`;

  // With-File workflows (self-contained)
  } else if (name === 'brainstorm-with-file') {
    prompt = `/workflow:brainstorm-with-file -y "${analysis.goal}"`;

  } else if (name === 'debug-with-file') {
    prompt = `/workflow:debug-with-file -y "${analysis.goal}"`;

  } else if (name === 'analyze-with-file') {
    prompt = `/workflow:analyze-with-file -y "${analysis.goal}"`;

  // Brainstorm-to-issue bridge
  } else if (name === 'issue:from-brainstorm' || name === 'from-brainstorm') {
    // Extract session ID from analysis.goal or latest brainstorm
    const sessionMatch = analysis.goal.match(/BS-[\w-]+/);
    if (sessionMatch) {
      prompt = `/issue:from-brainstorm -y SESSION="${sessionMatch[0]}" --auto`;
    } else {
      // Find latest brainstorm session
      prompt = `/issue:from-brainstorm -y --auto`;
    }
  }

  return prompt;
}

// Hook callback: Called when background CLI completes
async function handleCliCompletion(sessionId, taskId, output) {
  const stateDir = `.workflow/.ccw-coordinator/${sessionId}`;
  const state = JSON.parse(Read(`${stateDir}/state.json`));

  const pendingIdx = state.execution_results.findIndex(r => r.task_id === taskId);
  if (pendingIdx === -1) {
    console.error(`Unknown task_id: ${taskId}`);
    return;
  }

  const parsed = parseOutput(output);
  const cmdIdx = state.execution_results[pendingIdx].index;

  // Update result
  state.execution_results[pendingIdx] = {
    ...state.execution_results[pendingIdx],
    status: parsed.sessionId ? 'completed' : 'failed',
    session_id: parsed.sessionId,
    artifacts: parsed.artifacts,
    completed_at: new Date().toISOString()
  };
  state.command_chain[cmdIdx].status = parsed.sessionId ? 'completed' : 'failed';
  state.updated_at = new Date().toISOString();
  Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));

  // Trigger next command or complete
  const nextIdx = cmdIdx + 1;
  if (nextIdx < state.command_chain.length) {
    await resumeChainExecution(sessionId, nextIdx);
  } else {
    state.status = 'completed';
    Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));
    console.log(`✅ Completed: ${sessionId}\n`);
  }
}

// Parse command output
function parseOutput(output) {
  const sessionMatch = output.match(/WFS-[\w-]+/);
  const artifacts = [];
  output.matchAll(/\.workflow\/[^\s]+/g).forEach(m => artifacts.push(m[0]));
  return { sessionId: sessionMatch?.[0] || null, artifacts };
}
```

## State File Structure

**Location**: `.workflow/.ccw-coordinator/{session_id}/state.json`

```json
{
  "session_id": "ccw-coord-20250124-143025",
  "status": "running|waiting|completed|failed",
  "created_at": "2025-01-24T14:30:25Z",
  "updated_at": "2025-01-24T14:35:45Z",
  "analysis": {
    "goal": "Implement user registration",
    "scope": ["authentication", "user_management"],
    "constraints": ["no breaking changes"],
    "complexity": "medium"
  },
  "command_chain": [
    {
      "index": 0,
      "command": "/workflow:plan",
      "name": "plan",
      "description": "Detailed planning",
      "argumentHint": "[--explore] \"task\"",
      "status": "completed"
    },
    {
      "index": 1,
      "command": "/workflow:execute",
      "name": "execute",
      "description": "Execute with state resume",
      "argumentHint": "[--resume-session=\"WFS-xxx\"]",
      "status": "completed"
    },
    {
      "index": 2,
      "command": "/workflow:test-cycle-execute",
      "name": "test-cycle-execute",
      "status": "pending"
    }
  ],
  "execution_results": [
    {
      "index": 0,
      "command": "/workflow:plan",
      "status": "completed",
      "task_id": "task-001",
      "session_id": "WFS-plan-20250124",
      "artifacts": ["IMPL_PLAN.md", "exploration-architecture.json"],
      "timestamp": "2025-01-24T14:30:25Z",
      "completed_at": "2025-01-24T14:30:45Z"
    },
    {
      "index": 1,
      "command": "/workflow:execute",
      "status": "in-progress",
      "task_id": "task-002",
      "session_id": null,
      "artifacts": [],
      "timestamp": "2025-01-24T14:32:00Z",
      "completed_at": null
    }
  ],
  "prompts_used": [
    {
      "index": 0,
      "command": "/workflow:plan",
      "prompt": "/workflow:plan -y \"Implement user registration...\"\n\nTask: Implement user registration..."
    },
    {
      "index": 1,
      "command": "/workflow:execute",
      "prompt": "/workflow:execute -y --resume-session=\"WFS-plan-20250124\"\n\nTask: Implement user registration\n\nPrevious results:\n- /workflow:plan: WFS-plan-20250124 (IMPL_PLAN.md)"
    }
  ]
}
```

### Status Flow

```
running → waiting → [hook callback] → waiting → [hook callback] → completed
   ↓                                                                    ↑
failed ←────────────────────────────────────────────────────────────┘
```

**Status Values**:
- `running`: Orchestrator actively executing (launching CLI commands)
- `waiting`: Paused, waiting for hook callbacks to trigger continuation
- `completed`: All commands finished successfully
- `failed`: User aborted or unrecoverable error

### Field Descriptions

**execution_results[] fields**:
- `index`: Command position in chain (0-indexed)
- `command`: Full command string (e.g., `/workflow:plan`)
- `status`: `in-progress` | `completed` | `skipped` | `failed`
- `task_id`: Background task identifier (from Bash tool)
- `session_id`: Workflow session ID (e.g., `WFS-*`) or null if failed
- `artifacts`: Generated files/directories
- `timestamp`: Command start time (ISO 8601)
- `completed_at`: Command completion time or null if pending

**command_chain[] status values**:
- `pending`: Not started yet
- `running`: Currently executing
- `completed`: Successfully finished
- `failed`: Failed to execute

## CommandRegistry Integration

Sole CCW tool for command discovery:

```javascript
import { CommandRegistry } from 'ccw/tools/command-registry';

const registry = new CommandRegistry();

// Get all commands
const allCommands = registry.getAllCommandsSummary();
// Map<"/workflow:lite-plan" => {name, description}>

// Get categorized
const byCategory = registry.getAllCommandsByCategory();
// {planning, execution, testing, review, other}

// Get single command metadata
const cmd = registry.getCommand('lite-plan');
// {name, command, description, argumentHint, allowedTools, filePath}
```

## Universal Prompt Template

### Standard Format

```bash
ccw cli -p "PROMPT_CONTENT" --tool <tool> --mode <mode>
```

### Prompt Content Template

```
/workflow:<command> -y <command_parameters>

Task: <task_description>

<optional_previous_results>
```

### Template Variables

| Variable | Description | Examples |
|----------|-------------|----------|
| `<command>` | Workflow command name | `plan`, `lite-execute`, `test-cycle-execute` |
| `-y` | Auto-confirm flag (inside prompt) | Always include for automation |
| `<command_parameters>` | Command-specific parameters | Task description, session ID, flags |
| `<task_description>` | Brief task description | "Implement user authentication", "Fix memory leak" |
| `<optional_previous_results>` | Context from previous commands | "Previous results:\n- /workflow:plan: WFS-xxx" |

### Command Parameter Patterns

| Command Type | Parameter Pattern | Example |
|--------------|------------------|---------|
| **Planning** | `"task description"` | `/workflow:plan -y "Implement OAuth2"` |
| **Execution (with plan)** | `--resume-session="WFS-xxx"` | `/workflow:execute -y --resume-session="WFS-plan-001"` |
| **Execution (standalone)** | `--in-memory` or `"task"` | `/workflow:lite-execute -y --in-memory` |
| **Session-based** | `--session="WFS-xxx"` | `/workflow:test-fix-gen -y --session="WFS-impl-001"` |
| **Fix/Debug** | `"problem description"` | `/workflow:lite-fix -y "Fix timeout bug"` |

### Complete Examples

**Planning Command**:
```bash
ccw cli -p '/workflow:plan -y "Implement user registration with email validation"

Task: Implement user registration' --tool claude --mode write
```

**Execution with Context**:
```bash
ccw cli -p '/workflow:execute -y --resume-session="WFS-plan-20250124"

Task: Implement user registration

Previous results:
- /workflow:plan: WFS-plan-20250124 (IMPL_PLAN.md)' --tool claude --mode write
```

**Standalone Lite Execution**:
```bash
ccw cli -p '/workflow:lite-fix -y "Fix login timeout in auth module"

Task: Fix login timeout' --tool claude --mode write
```

## Execution Flow

```javascript
// Main entry point
async function ccwCoordinator(taskDescription) {
  // Phase 1
  const analysis = await analyzeRequirements(taskDescription);

  // Phase 2
  const chain = await recommendCommandChain(analysis);
  const confirmedChain = await getUserConfirmation(chain);

  // Phase 3
  const state = await executeCommandChain(confirmedChain, analysis);

  console.log(`✅ Complete! Session: ${state.session_id}`);
  console.log(`State: .workflow/.ccw-coordinator/${state.session_id}/state.json`);
}
```

## Key Design Principles

1. **No Fixed Logic** - Claude intelligently decides based on analysis
2. **Dynamic Discovery** - CommandRegistry retrieves available commands
3. **Smart Parameters** - Command args assembled based on previous results
4. **Full State Tracking** - All execution recorded to state.json
5. **User Control** - Confirmation + error handling with user choice
6. **Context Passing** - Each prompt includes previous results
7. **Resumable** - Can load state.json to continue
8. **Serial Blocking** - Commands execute one-by-one with hook-based continuation

## CLI Execution Model

### CLI Invocation Format

**IMPORTANT**: The `ccw cli` command executes prompts through external tools. The format is:

```bash
ccw cli -p "PROMPT_CONTENT" --tool <tool> --mode <mode>
```

**Parameters**:
- `-p "PROMPT_CONTENT"`: The prompt content to execute (required)
- `--tool <tool>`: CLI tool to use (e.g., `claude`, `gemini`, `qwen`)
- `--mode <mode>`: Execution mode (`analysis` or `write`)

**Note**: `-y` is a **command parameter inside the prompt**, NOT a `ccw cli` parameter.

### Prompt Assembly

The prompt content MUST start with the workflow command, followed by task context:

```
/workflow:<command> -y <parameters>

Task: <description>

<optional_context>
```

**Examples**:
```bash
# Planning command
ccw cli -p '/workflow:plan -y "Implement user registration feature"

Task: Implement user registration' --tool claude --mode write

# Execution command (with session reference)
ccw cli -p '/workflow:execute -y --resume-session="WFS-plan-20250124"

Task: Implement user registration

Previous results:
- /workflow:plan: WFS-plan-20250124' --tool claude --mode write

# Lite execution (in-memory from previous plan)
ccw cli -p '/workflow:lite-execute -y --in-memory

Task: Implement user registration' --tool claude --mode write
```

### Serial Blocking

**CRITICAL**: Commands execute one-by-one. After launching CLI in background:
1. Orchestrator stops immediately (`break`)
2. Wait for hook callback - **DO NOT use TaskOutput polling**
3. Hook callback triggers next command

**Prompt Structure**: Command must be first in prompt content

```javascript
// Example: Execute command and stop
const prompt = '/workflow:plan -y "Implement user authentication"\n\nTask: Implement user auth system';
const taskId = Bash(`ccw cli -p "${prompt}" --tool claude --mode write`, { run_in_background: true }).task_id;
state.execution_results.push({ status: 'in-progress', task_id: taskId, ... });
Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));
break; // ⚠️ STOP HERE - DO NOT use TaskOutput polling

// Hook callback will call handleCliCompletion(sessionId, taskId, output) when done
// → Updates state → Triggers next command via resumeChainExecution()
```


## Available Commands

All from `~/.claude/commands/workflow/` and `~/.claude/commands/issue/`:

**Planning**: lite-plan, plan, multi-cli-plan, plan-verify, tdd-plan
**Execution**: lite-execute, execute, develop-with-file
**Testing**: test-cycle-execute, test-gen, test-fix-gen, tdd-verify
**Review**: review, review-session-cycle, review-module-cycle, review-cycle-fix
**Bug Fixes**: lite-fix, debug, debug-with-file
**Brainstorming**: brainstorm:auto-parallel, brainstorm:artifacts, brainstorm:synthesis
**Design**: ui-design:*, animation-extract, layout-extract, style-extract, codify-style
**Session Management**: session:start, session:resume, session:complete, session:solidify, session:list
**Tools**: context-gather, test-context-gather, task-generate, conflict-resolution, action-plan-verify
**Utility**: clean, init, replan
**Issue Workflow**: issue:discover, issue:plan, issue:queue, issue:execute, issue:convert-to-plan, issue:from-brainstorm
**With-File Workflows**: brainstorm-with-file, debug-with-file, analyze-with-file

### Testing Commands Distinction

| Command | Purpose | Output | Follow-up |
|---------|---------|--------|-----------|
| **test-gen** | 广泛测试示例生成并进行测试 | test-tasks (IMPL-001, IMPL-002) | `/workflow:execute` |
| **test-fix-gen** | 针对特定问题生成测试并在测试中修正 | test-tasks | `/workflow:test-cycle-execute` |
| **test-cycle-execute** | 执行测试周期（迭代测试和修复） | test-passed | N/A (终点) |

**流程说明**:
- **test-gen → execute**: 生成全面的测试套件，execute 执行生成和测试
- **test-fix-gen → test-cycle-execute**: 针对特定问题生成修复任务，test-cycle-execute 迭代测试和修复直到通过

### Task Type Routing (Pipeline Summary)

**Note**: `【 】` marks Minimum Execution Units (最小执行单元) - these commands must execute together.

| Task Type | Pipeline | Minimum Units |
|-----------|----------|---|
| **feature** (simple) | 需求 →【lite-plan → lite-execute】→ 代码 →【test-fix-gen → test-cycle-execute】→ 测试通过 | Quick Implementation + Test Validation |
| **feature** (complex) | 需求 →【plan → plan-verify】→ validate → execute → 代码 → review → fix | Full Planning + Code Review + Testing |
| **bugfix** | Bug报告 → lite-fix → 修复代码 →【test-fix-gen → test-cycle-execute】→ 测试通过 | Bug Fix + Test Validation |
| **tdd** | 需求 → tdd-plan → TDD任务 → execute → 代码 → tdd-verify | TDD Planning + Execution |
| **test-fix** | 失败测试 →【test-fix-gen → test-cycle-execute】→ 测试通过 | Test Validation |
| **test-gen** | 代码/会话 →【test-gen → execute】→ 测试通过 | Test Generation + Execution |
| **review** | 代码 →【review-* → review-cycle-fix】→ 修复代码 →【test-fix-gen → test-cycle-execute】→ 测试通过 | Code Review + Testing |
| **brainstorm** | 探索主题 → brainstorm → 分析 →【plan → plan-verify】→ execute → test | Exploration + Planning + Execution |
| **multi-cli** | 需求 → multi-cli-plan → 对比分析 → lite-execute → test | Multi-Perspective + Testing |
| **issue-batch** | 代码库 →【discover → plan → queue → execute】→ 完成 issues | Issue Workflow |
| **issue-transition** | 需求 →【lite-plan → convert-to-plan → queue → execute】→ 完成 issues | Rapid-to-Issue |
| **brainstorm-file** | 主题 → brainstorm-with-file → brainstorm.md (自包含) | Brainstorm With File |
| **brainstorm-to-issue** | brainstorm.md →【from-brainstorm → queue → execute】→ 完成 issues | Brainstorm to Issue |
| **debug-file** | Bug报告 → debug-with-file → understanding.md (自包含) | Debug With File |
| **analyze-file** | 分析主题 → analyze-with-file → discussion.md (自包含) | Analyze With File |

Use `CommandRegistry.getAllCommandsSummary()` to discover all commands dynamically.
