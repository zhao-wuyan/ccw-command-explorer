---
name: ccw-coordinator
description: Command orchestration tool - analyze requirements, recommend chain, execute sequentially with state persistence
argument-hint: "[task description]"
allowed-tools: Task(*), AskUserQuestion(*), Read(*), Write(*), Bash(*), Glob(*), Grep(*)
---

# CCW Coordinator Command

Interactive orchestration tool: analyze task → discover commands → recommend chain → execute sequentially → track state.

**Execution Model**: Pseudocode guidance. Claude intelligently executes each phase based on context.

## Skill 映射

命令端口定义中的 workflow 操作通过 `Skill()` 调用。

| Skill | 包含操作 |
|-------|---------|
| `workflow-lite-plan` | lite-plan, lite-execute |
| `workflow-plan` | plan, plan-verify, replan |
| `workflow-execute` | execute |
| `workflow-multi-cli-plan` | multi-cli-plan |
| `workflow-test-fix` | test-fix-gen, test-cycle-execute |
| `workflow-tdd-plan` | tdd-plan, tdd-verify |
| `review-cycle` | review-session-cycle, review-module-cycle, review-cycle-fix |
| `brainstorm` | auto-parallel, artifacts, role-analysis, synthesis |
| `spec-generator` | product-brief → PRD → architecture → epics |
| `workflow:collaborative-plan-with-file` | understanding agent → parallel agents → plan-note.md |
| `workflow:roadmap-with-file` | strategic requirement roadmap → issue creation → execution-plan.json |
| `workflow:integration-test-cycle` | explore → test dev → test-fix cycle → reflection |
| `workflow:refactor-cycle` | tech debt discovery → prioritize → execute → validate |
| `team-planex` | planner + executor wave pipeline（适合大量零散 issue 或 roadmap 产出的清晰 issue）|

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
| **Bug Fix** | lite-plan (--bugfix) → lite-execute | Quick bug diagnosis and fix execution | Fixed code |
| **Full Planning + Execution** | plan → execute | Detailed planning and execution | Working code |
| **Verified Planning + Execution** | plan → plan-verify → execute | Planning with verification and execution | Working code |
| **Replanning + Execution** | replan → execute | Update plan and execute changes | Working code |
| **TDD Planning + Execution** | tdd-plan → execute | Test-driven development planning and execution | Working code |
| **Test Generation + Execution** | test-gen → execute | Generate test suite and execute | Generated tests |
| **Spec-Driven Full Pipeline** | spec-generator → plan → execute | Specification-driven development | Working code |

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
| **Analyze to Plan** | analyze-with-file → lite-plan | Collaborative analysis → auto chain to lite-plan | discussion.md + code |
| **Brainstorm to Plan** | brainstorm-with-file → plan → execute | Multi-perspective ideation → formal planning | brainstorm.md + code |
| **Debug With File** | debug-with-file | Hypothesis-driven debugging with documentation | understanding.md |
| **Collaborative Plan** | collaborative-plan-with-file → unified-execute-with-file | Multi-agent collaborative planning and execution | plan-note.md + code |
| **Roadmap Plan** | roadmap-with-file → team-planex | Requirement decomposition and wave execution | execution-plan.json + code |

**Cycle Units** (循环单元):

| Unit Name | Commands | Purpose | Output |
|-----------|----------|---------|--------|
| **Integration Test Cycle** | integration-test-cycle | Self-iterating integration test with reflection | Tests passed |
| **Refactor Cycle** | refactor-cycle | Tech debt discovery and refactoring | Refactored code |

### Command-to-Unit Mapping (命令与最小单元的映射)

| Command | Can Precede | Atomic Units |
|---------|-----------|--------------|
| lite-plan | lite-execute, convert-to-plan | Quick Implementation, Rapid-to-Issue, Bug Fix |
| multi-cli-plan | lite-execute | Multi-CLI Planning |
| plan | plan-verify, execute | Full Planning + Execution, Verified Planning + Execution |
| plan-verify | execute | Verified Planning + Execution |
| replan | execute | Replanning + Execution |
| test-gen | execute | Test Generation + Execution |
| tdd-plan | execute | TDD Planning + Execution |
| spec-generator | plan | Spec-Driven Full Pipeline |
| review-session-cycle | review-cycle-fix | Code Review (Session) |
| review-module-cycle | review-cycle-fix | Code Review (Module) |
| test-fix-gen | test-cycle-execute | Test Validation |
| issue:discover | issue:plan | Issue Workflow |
| issue:plan | issue:queue | Issue Workflow |
| convert-to-plan | issue:queue | Rapid-to-Issue |
| issue:queue | issue:execute | Issue Workflow, Rapid-to-Issue, Brainstorm-to-Issue |
| issue:from-brainstorm | issue:queue | Brainstorm-to-Issue |
| analyze-with-file | lite-plan (auto) | Analyze to Plan |
| brainstorm-with-file | plan (auto), issue:from-brainstorm | Brainstorm to Plan, Brainstorm-to-Issue |
| collaborative-plan-with-file | unified-execute-with-file | Collaborative Plan |
| roadmap-with-file | team-planex | Roadmap Plan |
| unified-execute-with-file | (terminal) | Collaborative Plan |
| integration-test-cycle | (standalone) | Integration Test Cycle |
| refactor-cycle | (standalone) | Refactor Cycle |
| team-planex | (standalone) | Roadmap Plan (executor) |
| debug-with-file | (standalone) | Debug With File |

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
    goal: extractMainGoal(taskDescription),
    scope: extractScope(taskDescription),
    constraints: extractConstraints(taskDescription),
    complexity: determineComplexity(taskDescription),
    task_type: detectTaskType(taskDescription)
  };
}

// Task Type Detection Patterns (harmonized with ccw.md priority order)
function detectTaskType(text) {
  // Priority order (first match wins)
  // Urgent bugfix (dual condition - must come first)
  if (/urgent|production|critical/.test(text) && /fix|bug/.test(text)) return 'bugfix-hotfix';
  // With-File workflow patterns (specific keywords - must come before generic bugfix)
  if (/brainstorm.*issue|头脑风暴.*issue|idea.*issue|想法.*issue|从.*头脑风暴|convert.*brainstorm/.test(text)) return 'brainstorm-to-issue';
  // 0→1 Greenfield detection (priority over brainstorm/roadmap)
  if (/从零开始|from scratch|0.*to.*1|greenfield|全新.*开发|新项目|new project|build.*from.*ground/.test(text)) return 'greenfield';
  if (/brainstorm|ideation|头脑风暴|创意|发散思维|creative thinking/.test(text)) return 'brainstorm-file';
  if (/debug.*document|hypothesis.*debug|深度调试|假设.*验证|systematic debug/.test(text)) return 'debug-file';
  if (/analyze.*document|collaborative analysis|协作分析|深度.*理解/.test(text)) return 'analyze-file';
  if (/collaborative.*plan|协作.*规划|多人.*规划|multi.*agent.*plan|Plan Note|分工.*规划/.test(text)) return 'collaborative-plan';
  if (/roadmap|路线.*图/.test(text)) return 'roadmap';  // Narrowed: only explicit roadmap keywords
  if (/spec.*gen|specification|PRD|产品需求|产品文档|产品规格/.test(text)) return 'spec-driven';
  // Cycle workflow patterns
  if (/integration.*test|集成测试|端到端.*测试|e2e.*test|integration.*cycle/.test(text)) return 'integration-test';
  if (/refactor|重构|tech.*debt|技术债务/.test(text)) return 'refactor';
  // Team workflows (kept: team-planex only)
  if (/team.*plan.*exec|team.*planex|团队.*规划.*执行|并行.*规划.*执行|wave.*pipeline/.test(text)) return 'team-planex';
  // Standard workflows
  if (/multi.*cli|多.*CLI|多模型.*协作|multi.*model.*collab/.test(text)) return 'multi-cli';
  if (/fix|bug|error|crash|fail|debug|diagnose/.test(text)) return 'bugfix';
  if (/tdd|test-driven|先写测试|test first/.test(text)) return 'tdd';
  if (/测试失败|test fail|fix test|failing test/.test(text)) return 'test-fix';
  if (/generate test|写测试|add test|补充测试/.test(text)) return 'test-gen';
  if (/review|审查|code review/.test(text)) return 'review';
  // Issue workflow patterns
  if (/issues?.*batch|batch.*issues?|批量.*issue|issue.*批量/.test(text)) return 'issue-batch';
  if (/issue workflow|structured workflow|queue|multi-stage|转.*issue|issue.*流程/.test(text)) return 'issue-transition';
  // Additional task types (harmonized with ccw.md)
  if (/不确定|explore|研究|what if|权衡/.test(text)) return 'exploration';
  if (/quick|simple|small/.test(text) && /feature|function/.test(text)) return 'quick-task';
  if (/ui|design|component|style/.test(text)) return 'ui-design';
  if (/docs|documentation|readme/.test(text)) return 'documentation';
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
const commandPorts = {
  'lite-plan': {
    name: 'lite-plan',
    input: ['requirement', 'discussion-document', 'brainstorm-document'],
    output: ['plan'],
    tags: ['planning'],
    atomic_group: 'quick-implementation'
  },
  'lite-execute': {
    name: 'lite-execute',
    input: ['plan', 'multi-cli-plan'],
    output: ['code'],
    tags: ['execution'],
    atomic_groups: ['quick-implementation', 'multi-cli-planning', 'bug-fix']
  },
  'plan': {
    name: 'plan',
    input: ['requirement', 'specification'],
    output: ['detailed-plan'],
    tags: ['planning'],
    atomic_groups: ['full-planning-execution', 'verified-planning-execution', 'spec-driven']
  },
  'plan-verify': {
    name: 'plan-verify',
    input: ['detailed-plan'],
    output: ['verified-plan'],
    tags: ['planning'],
    atomic_group: 'verified-planning-execution'
  },
  'replan': {
    name: 'replan',
    input: ['session', 'feedback'],
    output: ['replan'],
    tags: ['planning'],
    atomic_group: 'replanning-execution'
  },
  'execute': {
    name: 'execute',
    input: ['detailed-plan', 'verified-plan', 'replan', 'test-tasks', 'tdd-tasks'],
    output: ['code'],
    tags: ['execution'],
    atomic_groups: ['full-planning-execution', 'verified-planning-execution', 'replanning-execution', 'test-generation-execution', 'tdd-planning-execution', 'spec-driven']
  },
  'test-cycle-execute': {
    name: 'test-cycle-execute',
    input: ['test-tasks'],
    output: ['test-passed'],
    tags: ['testing'],
    atomic_group: 'test-validation',
    note: '需要先执行test-fix-gen生成测试任务，再由此命令执行测试周期'
  },
  'tdd-plan': {
    name: 'tdd-plan',
    input: ['requirement'],
    output: ['tdd-tasks'],
    tags: ['planning', 'tdd'],
    atomic_group: 'tdd-planning-execution'
  },
  'tdd-verify': {
    name: 'tdd-verify',
    input: ['code'],
    output: ['tdd-verified'],
    tags: ['testing'],
    note: 'Internal sub-command of workflow-tdd-plan Skill, not in explicit pipelines'
  },
  'lite-plan-bugfix': {
    name: 'lite-plan',
    input: ['bug-report'],
    output: ['plan'],
    tags: ['bugfix', 'planning'],
    atomic_group: 'bug-fix',
    type: 'skill',
    note: '通过 --bugfix 参数传递 bugfix 语义'
  },
  'debug': {
    name: 'debug',
    input: ['bug-report'],
    output: ['debug-log'],
    tags: ['bugfix'],
    note: 'Standalone debug sub-command, used internally by lite-plan --bugfix'
  },
  'test-gen': {
    name: 'test-gen',
    input: ['code', 'session'],
    output: ['test-tasks'],
    tags: ['testing'],
    atomic_group: 'test-generation-execution'
  },
  'test-fix-gen': {
    name: 'test-fix-gen',
    input: ['failing-tests', 'session'],
    output: ['test-tasks'],
    tags: ['testing'],
    atomic_group: 'test-validation',
    note: '生成测试任务供test-cycle-execute执行'
  },
  'review': {
    name: 'review',
    input: ['code', 'session'],
    output: ['review-findings'],
    tags: ['review'],
    note: 'Base review command, pipelines use review-session-cycle or review-module-cycle instead'
  },
  'review-cycle-fix': {
    name: 'review-cycle-fix',
    input: ['review-findings', 'review-verified'],
    output: ['fixed-code'],
    tags: ['review'],
    atomic_group: 'code-review'
  },
  'brainstorm': {
    name: 'brainstorm',
    input: ['exploration-topic'],
    output: ['brainstorm-analysis'],
    tags: ['brainstorm'],
    type: 'skill'
  },
  'multi-cli-plan': {
    name: 'multi-cli-plan',
    input: ['requirement'],
    output: ['multi-cli-plan'],
    tags: ['planning', 'multi-cli'],
    atomic_group: 'multi-cli-planning'
  },
  'review-session-cycle': {
    name: 'review-session-cycle',
    input: ['code', 'session'],
    output: ['review-verified'],
    tags: ['review'],
    atomic_group: 'code-review'
  },
  'review-module-cycle': {
    name: 'review-module-cycle',
    input: ['module-pattern'],
    output: ['review-verified'],
    tags: ['review'],
    atomic_group: 'code-review'
  },

  // Issue workflow commands
  'issue:discover': {
    name: 'issue:discover',
    input: ['codebase'],
    output: ['pending-issues'],
    tags: ['issue'],
    atomic_group: 'issue-workflow'
  },
  'issue:plan': {
    name: 'issue:plan',
    input: ['pending-issues'],
    output: ['issue-plans'],
    tags: ['issue'],
    atomic_group: 'issue-workflow'
  },
  'issue:queue': {
    name: 'issue:queue',
    input: ['issue-plans', 'converted-plan'],
    output: ['execution-queue'],
    tags: ['issue'],
    atomic_groups: ['issue-workflow', 'rapid-to-issue']
  },
  'issue:execute': {
    name: 'issue:execute',
    input: ['execution-queue'],
    output: ['completed-issues'],
    tags: ['issue'],
    atomic_groups: ['issue-workflow', 'rapid-to-issue']
  },
  'issue:convert-to-plan': {
    name: 'issue:convert-to-plan',
    input: ['plan'],
    output: ['converted-plan'],
    tags: ['issue', 'planning'],
    atomic_group: 'rapid-to-issue'
  },

  // With-File workflows
  'brainstorm-with-file': {
    name: 'brainstorm-with-file',
    input: ['exploration-topic'],
    output: ['brainstorm-document'],
    tags: ['brainstorm', 'with-file'],
    atomic_group: 'brainstorm-to-plan',
    note: 'Auto chains to workflow-plan with brainstorm artifacts'
  },
  'issue:from-brainstorm': {
    name: 'issue:from-brainstorm',
    input: ['brainstorm-document'],
    output: ['converted-plan'],
    tags: ['issue', 'brainstorm'],
    atomic_group: 'brainstorm-to-issue'
  },
  'debug-with-file': {
    name: 'debug-with-file',
    input: ['bug-report'],
    output: ['understanding-document'],
    tags: ['bugfix', 'with-file'],
    note: 'Self-contained workflow with hypothesis-driven iteration'
  },
  'analyze-with-file': {
    name: 'analyze-with-file',
    input: ['analysis-topic'],
    output: ['discussion-document'],
    tags: ['analysis', 'with-file'],
    atomic_group: 'analyze-to-plan',
    note: 'Auto chains to lite-plan with analysis artifacts'
  },

  // Collaborative planning workflows
  'collaborative-plan-with-file': {
    name: 'collaborative-plan-with-file',
    input: ['requirement'],
    output: ['plan-note'],
    tags: ['planning', 'with-file'],
    atomic_group: 'collaborative-plan',
    note: 'Multi-agent collaborative planning with Plan Note shared doc'
  },
  'unified-execute-with-file': {
    name: 'unified-execute-with-file',
    input: ['plan-note', 'brainstorm-document', 'discussion-document'],
    output: ['code'],
    tags: ['execution', 'with-file'],
    atomic_group: 'collaborative-plan'
  },
  'roadmap-with-file': {
    name: 'roadmap-with-file',
    input: ['requirement'],
    output: ['execution-plan'],
    tags: ['planning', 'with-file'],
    atomic_group: 'roadmap-plan',
    note: 'Requirement decomposition with issue creation'
  },

  // Spec-driven workflow
  'spec-generator': {
    name: 'spec-generator',
    input: ['requirement'],
    output: ['specification'],
    tags: ['planning', 'specification'],
    atomic_group: 'spec-driven',
    note: '6-phase specification: product-brief → PRD → architecture → epics'
  },

  // Cycle workflows (self-iterating with reflection)
  'integration-test-cycle': {
    name: 'integration-test-cycle',
    input: ['requirement'],
    output: ['test-passed'],
    tags: ['testing', 'cycle'],
    note: 'Self-contained: explore → test dev → test-fix cycle → reflection'
  },
  'refactor-cycle': {
    name: 'refactor-cycle',
    input: ['codebase'],
    output: ['refactored-code'],
    tags: ['refactoring', 'cycle'],
    note: 'Self-contained: tech debt discovery → prioritize → execute → validate'
  },

  // Team workflows (kept: team-planex only)
  'team-planex': {
    name: 'team-planex',
    input: ['requirement', 'execution-plan'],
    output: ['code'],
    tags: ['team'],
    note: 'Self-contained: planner + executor wave pipeline'
  }
};
```

#### Recommendation Algorithm

```javascript
async function recommendCommandChain(analysis) {
  const { inputPort, outputPort } = determinePortFlow(analysis.task_type, analysis.constraints);
  const chain = selectChainByPorts(inputPort, outputPort, analysis);
  return chain;
}

function determinePortFlow(taskType, constraints) {
  const flows = {
    'bugfix':           { inputPort: 'bug-report', outputPort: constraints?.includes('skip-tests') ? 'fixed-code' : 'test-passed' },
    'tdd':              { inputPort: 'requirement', outputPort: 'tdd-verified' },
    'test-fix':         { inputPort: 'failing-tests', outputPort: 'test-passed' },
    'test-gen':         { inputPort: 'code', outputPort: 'test-passed' },
    'review':           { inputPort: 'code', outputPort: 'review-verified' },
    'brainstorm':       { inputPort: 'exploration-topic', outputPort: 'test-passed' },
    'multi-cli':        { inputPort: 'requirement', outputPort: 'test-passed' },
    // Issue workflow types
    'issue-batch':        { inputPort: 'codebase', outputPort: 'completed-issues' },
    'issue-transition':   { inputPort: 'requirement', outputPort: 'completed-issues' },
    // 0→1 Greenfield (exploration → formal planning → execution)
    'greenfield':             { inputPort: 'exploration-topic', outputPort: 'test-passed' },
    // With-File workflow types (auto chain to plan)
    'brainstorm-file':      { inputPort: 'exploration-topic', outputPort: 'test-passed' },
    'brainstorm-to-issue':  { inputPort: 'brainstorm-document', outputPort: 'completed-issues' },
    'debug-file':           { inputPort: 'bug-report', outputPort: 'understanding-document' },
    'analyze-file':         { inputPort: 'analysis-topic', outputPort: 'code' },
    'collaborative-plan':   { inputPort: 'requirement', outputPort: 'code' },
    'roadmap':              { inputPort: 'requirement', outputPort: 'code' },
    'spec-driven':          { inputPort: 'requirement', outputPort: 'test-passed' },
    // Cycle workflow types
    'integration-test':     { inputPort: 'requirement', outputPort: 'test-passed' },
    'refactor':             { inputPort: 'codebase', outputPort: 'refactored-code' },
    // Team workflows (kept: team-planex only)
    'team-planex':          { inputPort: 'requirement', outputPort: 'code' },
    // Additional task types (harmonized with ccw.md)
    'bugfix-hotfix':        { inputPort: 'bug-report', outputPort: 'fixed-code' },
    'exploration':          { inputPort: 'exploration-topic', outputPort: 'test-passed' },
    'quick-task':           { inputPort: 'requirement', outputPort: constraints?.includes('skip-tests') ? 'code' : 'test-passed' },
    'ui-design':            { inputPort: 'requirement', outputPort: 'code' },
    'documentation':        { inputPort: 'requirement', outputPort: 'code' },
    'feature':              { inputPort: 'requirement', outputPort: constraints?.includes('skip-tests') ? 'code' : 'test-passed' }
  };
  return flows[taskType] || flows['feature'];
}
```

#### Display to User

```
Recommended Command Chain:

Pipeline (管道视图):
需求 → lite-plan → 计划 → lite-execute → 代码 → test-cycle-execute → 测试通过

Commands (命令列表):
1. /workflow-lite-plan
2. /workflow:lite-execute
3. /workflow-test-fix

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

  Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));

  for (let i = 0; i < chain.length; i++) {
    const cmd = chain[i];
    console.log(`[${i+1}/${chain.length}] ${cmd.command}`);

    state.command_chain[i].status = 'running';
    state.updated_at = new Date().toISOString();
    Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));

    let promptContent = formatCommand(cmd, state.execution_results, analysis);
    let prompt = `${promptContent}\n\nTask: ${analysis.goal}`;
    if (state.execution_results.length > 0) {
      prompt += '\n\nPrevious results:\n';
      state.execution_results.forEach(r => {
        if (r.session_id) {
          prompt += `- ${r.command}: ${r.session_id} (${r.artifacts?.join(', ') || 'completed'})\n`;
        }
      });
    }

    state.prompts_used.push({ index: i, command: cmd.command, prompt: prompt });

    try {
      const taskId = Bash(
        `ccw cli -p "${escapePrompt(prompt)}" --tool claude --mode write`,
        { run_in_background: true }
      ).task_id;

      state.execution_results.push({
        index: i, command: cmd.command, status: 'in-progress',
        task_id: taskId, session_id: null, artifacts: [],
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

      if (action.error === 'Retry') { state.command_chain[i].status = 'pending'; state.execution_results.pop(); i--; }
      else if (action.error === 'Skip') { state.execution_results[state.execution_results.length - 1].status = 'skipped'; }
      else if (action.error === 'Abort') { state.status = 'failed'; break; }
    }

    Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));
  }

  if (state.status !== 'failed') state.status = 'waiting';
  state.updated_at = new Date().toISOString();
  Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));

  return state;
}

// Smart parameter assembly
function formatCommand(cmd, previousResults, analysis) {
  let prompt = `/workflow:${cmd.name} -y`;
  const name = cmd.name;

  // Planning commands - take task description
  if (['lite-plan', 'plan', 'tdd-plan', 'multi-cli-plan'].includes(name)) {
    prompt += ` "${analysis.goal}"`;

  } else if (name === 'lite-execute') {
    const hasPlan = previousResults.some(r => r.command.includes('plan'));
    prompt += hasPlan ? ' --in-memory' : ` "${analysis.goal}"`;

  } else if (name === 'execute') {
    const plan = previousResults.find(r => r.command.includes('plan'));
    if (plan?.session_id) prompt += ` --resume-session="${plan.session_id}"`;

  } else if (name === 'lite-plan' && analysis.task_type === 'bugfix') {
    prompt += ` --bugfix "${analysis.goal}"`;

  } else if (name === 'debug') {
    prompt += ` "${analysis.goal}"`;

  } else if (name === 'brainstorm') {
    prompt = `/brainstorm -y "${analysis.goal}"`;

  } else if (name === 'spec-generator') {
    prompt = `/spec-generator -y "${analysis.goal}"`;

  } else if (name === 'test-gen') {
    const impl = previousResults.find(r => r.command.includes('execute') || r.command.includes('lite-execute'));
    prompt += impl?.session_id ? ` "${impl.session_id}"` : ` "${analysis.goal}"`;

  } else if (name === 'test-fix-gen') {
    const latest = previousResults.filter(r => r.session_id).pop();
    prompt += latest?.session_id ? ` "${latest.session_id}"` : ` "${analysis.goal}"`;

  } else if (name === 'review') {
    const latest = previousResults.filter(r => r.session_id).pop();
    if (latest?.session_id) prompt += ` --session="${latest.session_id}"`;

  } else if (name === 'review-cycle-fix') {
    const review = previousResults.find(r => r.command.includes('review'));
    const latest = review || previousResults.filter(r => r.session_id).pop();
    if (latest?.session_id) prompt += ` --session="${latest.session_id}"`;

  } else if (name === 'tdd-verify') {
    const exec = previousResults.find(r => r.command.includes('execute'));
    if (exec?.session_id) prompt += ` --session="${exec.session_id}"`;

  } else if (name.includes('test') || name.includes('review') || name.includes('verify')) {
    const latest = previousResults.filter(r => r.session_id).pop();
    if (latest?.session_id) prompt += ` --session="${latest.session_id}"`;

  // Issue workflow commands
  } else if (name === 'issue:discover') {
    prompt = `/issue:discover -y`;
  } else if (name === 'issue:plan') {
    prompt = `/issue:plan -y --all-pending`;
  } else if (name === 'issue:queue') {
    prompt = `/issue:queue -y`;
  } else if (name === 'issue:execute') {
    prompt = `/issue:execute -y --queue auto`;
  } else if (name === 'issue:convert-to-plan' || name === 'convert-to-plan') {
    prompt = `/issue:convert-to-plan -y --latest-lite-plan`;

  // With-File workflows
  } else if (name === 'brainstorm-with-file') {
    prompt = `/workflow:brainstorm-with-file -y "${analysis.goal}"`;
  } else if (name === 'debug-with-file') {
    prompt = `/workflow:debug-with-file -y "${analysis.goal}"`;
  } else if (name === 'analyze-with-file') {
    prompt = `/workflow:analyze-with-file -y "${analysis.goal}"`;
  } else if (name === 'issue:from-brainstorm' || name === 'from-brainstorm') {
    const sessionMatch = analysis.goal.match(/BS-[\w-]+/);
    prompt = sessionMatch
      ? `/issue:from-brainstorm -y SESSION="${sessionMatch[0]}" --auto`
      : `/issue:from-brainstorm -y --auto`;

  // Collaborative planning workflows
  } else if (name === 'collaborative-plan-with-file') {
    prompt = `/workflow:collaborative-plan-with-file -y "${analysis.goal}"`;
  } else if (name === 'unified-execute-with-file') {
    prompt = `/workflow:unified-execute-with-file -y`;
  } else if (name === 'roadmap-with-file') {
    prompt = `/workflow:roadmap-with-file -y "${analysis.goal}"`;

  // Cycle workflows (self-contained)
  } else if (name === 'integration-test-cycle') {
    prompt = `/workflow:integration-test-cycle -y "${analysis.goal}"`;
  } else if (name === 'refactor-cycle') {
    prompt = `/workflow:refactor-cycle -y "${analysis.goal}"`;

  // Team workflows (kept: team-planex only)
  } else if (name === 'team-planex') {
    prompt = `/team-planex -y "${analysis.goal}"`;
  }

  return prompt;
}

// Hook callback: Called when background CLI completes
async function handleCliCompletion(sessionId, taskId, output) {
  const stateDir = `.workflow/.ccw-coordinator/${sessionId}`;
  const state = JSON.parse(Read(`${stateDir}/state.json`));

  const pendingIdx = state.execution_results.findIndex(r => r.task_id === taskId);
  if (pendingIdx === -1) return;

  const parsed = parseOutput(output);
  const cmdIdx = state.execution_results[pendingIdx].index;

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

  const nextIdx = cmdIdx + 1;
  if (nextIdx < state.command_chain.length) {
    await resumeChainExecution(sessionId, nextIdx);
  } else {
    state.status = 'completed';
    Write(`${stateDir}/state.json`, JSON.stringify(state, null, 2));
  }
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
    { "index": 0, "command": "/workflow-plan", "name": "plan", "status": "completed" },
    { "index": 1, "command": "/workflow-execute", "name": "execute", "status": "running" }
  ],
  "execution_results": [
    {
      "index": 0, "command": "/workflow-plan", "status": "completed",
      "task_id": "task-001", "session_id": "WFS-plan-20250124",
      "artifacts": ["IMPL_PLAN.md"], "timestamp": "2025-01-24T14:30:25Z"
    }
  ]
}
```

**Status Values**: `running` → `waiting` → `completed` | `failed`

### Status Flow

```
running → waiting → [hook callback] → waiting → [hook callback] → completed
   ↓                                                                    ↑
failed ←────────────────────────────────────────────────────────────┘
```

## Skill & Command Discovery

workflow 操作通过 `Skill()` 调用对应的 Skill。

```javascript
// Skill 调用方式
Skill({ skill: 'workflow-lite-plan', args: '"task description"' });
Skill({ skill: 'workflow-execute', args: '--resume-session="WFS-xxx"' });
Skill({ skill: 'brainstorm', args: '"exploration topic"' });
Skill({ skill: 'spec-generator', args: '"product specification"' });

// 命名空间命令调用方式
Skill({ skill: 'workflow:brainstorm-with-file', args: '"topic"' });
Skill({ skill: 'workflow:roadmap-with-file', args: '"requirement"' });
Skill({ skill: 'issue:discover', args: '' });
```

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

### Serial Blocking

**CRITICAL**: Commands execute one-by-one. After launching CLI in background:
1. Orchestrator stops immediately (`break`)
2. Wait for hook callback - **DO NOT use TaskOutput polling**
3. Hook callback triggers next command

## Available Skills & Commands

### Skills

| Skill | 包含操作 |
|-------|---------|
| `workflow-lite-plan` | lite-plan, lite-execute |
| `workflow-plan` | plan, plan-verify, replan |
| `workflow-execute` | execute |
| `workflow-multi-cli-plan` | multi-cli-plan |
| `workflow-test-fix` | test-fix-gen, test-cycle-execute |
| `workflow-tdd-plan` | tdd-plan, tdd-verify |
| `review-cycle` | review-session-cycle, review-module-cycle, review-cycle-fix |
| `brainstorm` | auto-parallel, artifacts, role-analysis, synthesis |
| `spec-generator` | product-brief → PRD → architecture → epics |
| `team-planex` | planner + executor wave pipeline |

### Commands（命名空间 Skill）

**With-File Workflows**: workflow:brainstorm-with-file, workflow:debug-with-file, workflow:analyze-with-file, workflow:collaborative-plan-with-file, workflow:roadmap-with-file
**Cycle Workflows**: workflow:integration-test-cycle, workflow:refactor-cycle
**Execution**: workflow:unified-execute-with-file
**Design**: workflow:ui-design:*
**Session Management**: workflow:session:start, workflow:session:resume, workflow:session:complete, workflow:session:solidify, workflow:session:list, workflow:session:sync
**Utility**: workflow:clean, workflow:init, workflow:init-guidelines, workflow:status
**Issue Workflow**: issue:discover, issue:discover-by-prompt, issue:plan, issue:queue, issue:execute, issue:convert-to-plan, issue:from-brainstorm, issue:new

### Testing Commands Distinction

| Command | Purpose | Output | Follow-up |
|---------|---------|--------|-----------|
| **test-gen** | 广泛测试示例生成并进行测试 | test-tasks (IMPL-001, IMPL-002) | Skill(workflow-execute) |
| **test-fix-gen** | 针对特定问题生成测试并在测试中修正 | test-tasks | Skill(workflow-test-fix) → test-cycle-execute |
| **test-cycle-execute** | 执行测试周期（迭代测试和修复） | test-passed | N/A (终点) |

### Task Type Routing (Pipeline Summary)

**Note**: `【 】` marks Minimum Execution Units (最小执行单元) - these commands must execute together.

| Task Type | Pipeline | Minimum Units |
|-----------|----------|---|
| **feature** (simple) | 需求 →【lite-plan → lite-execute】→ 代码 →【test-fix-gen → test-cycle-execute】→ 测试通过 | Quick Implementation + Test Validation |
| **feature** (complex) | 需求 →【plan → plan-verify】→ validate → execute → 代码 → review → fix | Full Planning + Code Review + Testing |
| **bugfix** | Bug报告 → lite-plan (--bugfix) → 修复代码 →【test-fix-gen → test-cycle-execute】→ 测试通过 | Bug Fix + Test Validation |
| **tdd** | 需求 → tdd-plan → TDD任务 → execute → 代码 → tdd-verify | TDD Planning + Execution |
| **test-fix** | 失败测试 →【test-fix-gen → test-cycle-execute】→ 测试通过 | Test Validation |
| **test-gen** | 代码/会话 →【test-gen → execute】→ 测试通过 | Test Generation + Execution |
| **review** | 代码 →【review-* → review-cycle-fix】→ 修复代码 →【test-fix-gen → test-cycle-execute】→ 测试通过 | Code Review + Testing |
| **brainstorm** | 探索主题 → brainstorm → 分析 →【plan → plan-verify】→ execute → test | Exploration + Planning + Execution |
| **multi-cli** | 需求 → multi-cli-plan → 对比分析 → lite-execute → test | Multi-Perspective + Testing |
| **spec-driven** | 需求 →【spec-generator → plan → execute】→ 代码 →【test-fix-gen → test-cycle-execute】→ 测试通过 | Spec-Driven + Testing |
| **issue-batch** | 代码库 →【discover → plan → queue → execute】→ 完成 issues | Issue Workflow |
| **issue-transition** | 需求 →【lite-plan → convert-to-plan → queue → execute】→ 完成 issues | Rapid-to-Issue |
| **analyze-file** | 分析主题 →【analyze-with-file → lite-plan → lite-execute】→ 代码 | Analyze to Plan |
| **greenfield** | 需求 →【brainstorm-with-file → plan → execute】→ 代码 → test | Greenfield (0→1) |
| **brainstorm-file** | 主题 →【brainstorm-with-file → plan → execute】→ 代码 → test | Brainstorm to Plan |
| **brainstorm-to-issue** | brainstorm.md →【from-brainstorm → queue → execute】→ 完成 issues | Brainstorm to Issue |
| **debug-file** | Bug报告 → debug-with-file → understanding.md (自包含) | Debug With File |
| **collaborative-plan** | 需求 →【collaborative-plan-with-file → unified-execute-with-file】→ 代码 | Collaborative Plan |
| **roadmap** | 需求 →【roadmap-with-file → team-planex】→ 代码 | Roadmap Plan |
| **integration-test** | 需求/模块 → integration-test-cycle → 测试通过 (自包含) | Integration Test Cycle |
| **refactor** | 代码库 → refactor-cycle → 重构后代码 (自包含) | Refactor Cycle |
| **team-planex** | 需求 → team-planex → 代码 (自包含) | Team Plan+Execute |
| **bugfix-hotfix** | Bug报告(紧急) → lite-plan (--hotfix) → 修复代码 | Hotfix (skip tests) |
| **exploration** | 探索主题 → brainstorm →【plan → execute】→ 代码 → test | Exploration + Planning |
| **quick-task** | 需求 →【lite-plan → lite-execute】→ 代码 → test | Quick Implementation |
| **ui-design** | UI需求 → ui-design:explore → plan → execute → 代码 | UI Design |
| **documentation** | 文档需求 → lite-plan → lite-execute → 文档 | Documentation |

Refer to the Skill 映射 section above for available Skills and Commands.
