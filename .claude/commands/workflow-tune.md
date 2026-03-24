---
name: workflow-tune
description: Workflow tuning - extract commands from reference docs or natural language, execute each via ccw cli --tool claude --mode write, then analyze artifacts via gemini. For testing how commands execute in Claude.
argument-hint: "<file-path> <intent> | \"step1 | step2 | step3\" | \"skill-a,skill-b\" | --file workflow.json [--depth quick|standard|deep] [-y|--yes] [--auto-fix]"
allowed-tools: Agent(*), AskUserQuestion(*), TaskCreate(*), TaskUpdate(*), TaskList(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Workflow Tune

测试 Claude command/skill 的执行效果并优化。提取可执行命令，逐步通过 `ccw cli --tool claude` 执行，分析产物质量，生成优化建议。

## Tool Assignment

| Phase | Tool | Mode | Rule |
|-------|------|------|------|
| Execute | `claude` | `write` | `universal-rigorous-style` |
| Analyze | `gemini` | `analysis` | `analysis-review-code-quality` |
| Synthesize | `gemini` | `analysis` | `analysis-review-architecture` |

## Architecture

```
Input → Parse → GenTestTask → Confirm → Setup → [resolveCmd → readMeta → assemblePrompt → Execute → STOP → Analyze → STOP]×N → Synthesize → STOP → Report
                    ↑                                       ↑
          Claude 直接生成测试任务            prompt 中注入 test_task
          (无需 CLI 调用)                  作为命令的执行输入
```

## Input Formats

```
1. --file workflow.json               → JSON definition
2. "cmd1 | cmd2 | cmd3"              → pipe-separated commands
3. "skill-a,skill-b,skill-c"         → comma-separated skills
4. natural language                   → semantic decomposition
   4a: <file-path> <intent>           → extract commands from reference doc via LLM
   4b: <pure intent text>             → intent-verb matching → ccw cli command assembly
```

**ANTI-PATTERN**: Steps like `{ command: "分析 Phase 管线" }` are WRONG — descriptions, not commands. Correct: `{ command: "/workflow-lite-plan analyze auth module" }` or `{ command: "ccw cli -p '...' --tool claude --mode write" }`

## Utility: Shell Escaping

```javascript
function escapeForShell(str) {
  // Replace single quotes with escaped version, wrap in single quotes
  return "'" + str.replace(/'/g, "'\\''") + "'";
}
```

## Phase 1: Setup

### Step 1.1: Parse Input + Preference Collection

```javascript
const args = $ARGUMENTS.trim();
const autoYes = /\b(-y|--yes)\b/.test(args);

// Preference collection (skip if -y)
if (autoYes) {
  workflowPreferences = { autoYes: true, analysisDepth: 'standard', autoFix: false };
} else {
  const prefResponse = AskUserQuestion({
    questions: [
      { question: "选择调优配置：", header: "Tune Config", multiSelect: false,
        options: [
          { label: "Quick (轻量分析)", description: "每步简要检查" },
          { label: "Standard (标准分析) (Recommended)", description: "每步详细分析" },
          { label: "Deep (深度分析)", description: "深度审查含架构建议" }
        ]
      },
      { question: "是否自动应用优化建议？", header: "Auto Fix", multiSelect: false,
        options: [
          { label: "No (仅报告) (Recommended)", description: "只分析不修改" },
          { label: "Yes (自动应用)", description: "自动应用高优先级建议" }
        ]
      }
    ]
  });
  const depthMap = { "Quick": "quick", "Standard": "standard", "Deep": "deep" };
  const selectedDepth = Object.keys(depthMap).find(k => prefResponse["Tune Config"].startsWith(k)) || "Standard";
  workflowPreferences = {
    autoYes: false,
    analysisDepth: depthMap[selectedDepth],
    autoFix: prefResponse["Auto Fix"].startsWith("Yes")
  };
}

// Parse --depth override
const depthMatch = args.match(/--depth\s+(quick|standard|deep)/);
if (depthMatch) workflowPreferences.analysisDepth = depthMatch[1];

// ── Format Detection ──
let steps = [], workflowName = 'unnamed-workflow', inputFormat = '';
let projectScenario = '';  // ★ 统一虚构项目场景，所有步骤共享（在 Step 1.1a 生成）

const fileMatch = args.match(/--file\s+"?([^\s"]+)"?/);
if (fileMatch) {
  const wfDef = JSON.parse(Read(fileMatch[1]));
  workflowName = wfDef.name || 'unnamed-workflow';
  projectScenario = wfDef.project_scenario || wfDef.description || '';
  steps = wfDef.steps;
  inputFormat = 'json';
}
else if (args.includes('|')) {
  const rawSteps = args.split(/(?:--context|--depth|-y|--yes|--auto-fix)\s+("[^"]*"|\S+)/)[0];
  steps = rawSteps.split('|').map((cmd, i) => ({
    name: `step-${i + 1}`,
    command: cmd.trim(),
    expected_artifacts: [], success_criteria: ''
  }));
  inputFormat = 'pipe';
}
else if (/^[\w-]+(,[\w-]+)+/.test(args.split(/\s/)[0])) {
  const skillNames = args.match(/^([^\s]+)/)[1].split(',');
  steps = skillNames.map(name => ({
    name, command: `/${name}`,
    expected_artifacts: [], success_criteria: ''
  }));
  inputFormat = 'skills';
}
else {
  inputFormat = 'natural-language';
  let naturalLanguageInput = args.replace(/--\w+\s+"[^"]*"/g, '').replace(/--\w+\s+\S+/g, '').replace(/-y|--yes/g, '').trim();
  const filePathPattern = /(?:[A-Za-z]:[\\\/][^\s,;]+|\/[^\s,;]+\.(?:md|txt|json|yaml|yml|toml)|\.\/?[^\s,;]+\.(?:md|txt|json|yaml|yml|toml))/g;
  const detectedPaths = naturalLanguageInput.match(filePathPattern) || [];
  let referenceDocContent = null, referenceDocPath = null;
  if (detectedPaths.length > 0) {
    referenceDocPath = detectedPaths[0];
    try {
      referenceDocContent = Read(referenceDocPath);
      naturalLanguageInput = naturalLanguageInput.replace(referenceDocPath, '').trim();
    } catch (e) { referenceDocContent = null; }
  }
  // → Mode 4a/4b in Step 1.1b
}

// workflowContext 已移除 — 统一使用 projectScenario（在 Step 1.1a 生成）
```

### Step 1.1a: Generate Test Task (测试任务直接生成)

> **核心概念**: 所有步骤共享一个**统一虚构项目场景**（如"在线书店网站"），每个命令根据自身能力获得该场景下的一个子任务。由当前 Claude 直接生成，不需要额外 CLI 调用。所有执行在独立沙箱目录中进行，不影响真实项目。

```javascript
// ★ 测试任务直接生成 — 无需 CLI 调用
// 来源优先级：
//   1. JSON 定义中的 step.test_task 字段 (已有则跳过)
//   2. 当前 Claude 直接生成

const stepsNeedTask = steps.filter(s => !s.test_task);

if (stepsNeedTask.length > 0) {
  // ── Step A: 生成统一项目场景 ──
  // 根据命令链的整体复杂度，选一个虚构项目作为测试场景
  // 场景必须：完全虚构、与当前工作空间无关、足够支撑所有步骤
  //
  // 场景池示例（根据步骤数量和类型选择合适规模）：
  //   1-2 步: 小型项目 — "命令行 TODO 工具" "Markdown 转 HTML 工具" "天气查询 CLI"
  //   3-4 步: 中型项目 — "在线书店网站" "团队任务看板" "博客系统"
  //   5+ 步:  大型项目 — "多租户 SaaS 平台" "电商系统" "在线教育平台"

  projectScenario = /* Claude 从上述池中选择或自创一个场景 */;
  // 例如: "在线书店网站 — 支持用户注册登录、书籍搜索浏览、购物车、订单管理、评论系统"

  // ── Step B: 为每步生成子任务 ──
  for (const step of stepsNeedTask) {
    const cmdFile = resolveCommandFile(step.command);
    const cmdMeta = readCommandMeta(cmdFile);
    const cmdDesc = (cmdMeta?.description || step.command).toLowerCase();

    // 根据命令类型分配场景下的子任务
    // 每个子任务必须按以下模板生成：
    //
    // ┌─────────────────────────────────────────────────┐
    // │ 项目: {projectScenario}                          │
    // │ 任务: {具体子任务描述}                            │
    // │ 功能点:                                          │
    // │   1. {功能点1 — 具体到接口/组件/模块}             │
    // │   2. {功能点2}                                   │
    // │   3. {功能点3}                                   │
    // │ 技术约束: {语言/框架/架构要求}                    │
    // │ 验收标准:                                        │
    // │   1. {可验证的标准1}                              │
    // │   2. {可验证的标准2}                              │
    // └─────────────────────────────────────────────────┘
    //
    // 命令类型 → 子任务映射：
    //   plan/design   → 架构设计任务: "为{场景}设计技术架构，包含模块划分、数据模型、API 设计"
    //   implement     → 功能实现任务: "实现{场景}的{某模块}，包含{具体功能点}"
    //   analyze/review→ 代码分析任务: "先在沙箱创建{场景}的{某模块}示例代码，然后分析其质量"
    //   test          → 测试任务:     "为{场景}的{某模块}编写测试，覆盖{具体场景}"
    //   fix/debug     → 修复任务:     "先在沙箱创建含已知 bug 的代码，然后诊断修复"
    //   refactor      → 重构任务:     "先在沙箱创建可工作但需重构的代码，然后重构"

    step.test_task = /* 按上述模板生成，必须包含：项目、任务、功能点、技术约束、验收标准 */;
    step.acceptance_criteria = /* 从 test_task 中提取 2-4 条可验证标准 */;
    step.complexity_level = /plan|design|architect/i.test(cmdDesc) ? 'high'
      : /test|lint|format/i.test(cmdDesc) ? 'low' : 'medium';
  }
}
```

**模拟示例** — 输入 `workflow-lite-plan,workflow-lite-execute`:

```
场景: 在线书店网站 — 支持用户注册登录、书籍搜索、购物车、订单管理

Step 1 (workflow-lite-plan → plan 类, high):
  项目: 在线书店网站
  任务: 为在线书店设计技术架构和实现计划
  功能点:
    1. 用户模块 — 注册、登录、个人信息管理
    2. 书籍模块 — 搜索、分类浏览、详情页
    3. 交易模块 — 购物车、下单、支付状态
    4. 数据模型 — User, Book, Order, CartItem 表结构设计
  技术约束: TypeScript + Express + SQLite, REST API
  验收标准:
    1. 输出包含模块划分和依赖关系
    2. 包含数据模型定义
    3. 包含 API 路由清单
    4. 包含实现步骤分解

Step 2 (workflow-lite-execute → implement 类, medium):
  项目: 在线书店网站
  任务: 根据 Step 1 的计划，实现书籍搜索和浏览模块
  功能点:
    1. GET /api/books — 分页列表，支持按标题/作者搜索
    2. GET /api/books/:id — 书籍详情
    3. GET /api/categories — 分类列表
    4. Book 数据模型 + seed 数据
  技术约束: TypeScript + Express + SQLite, 沿用 Step 1 架构
  验收标准:
    1. API 可正常调用返回 JSON
    2. 搜索支持模糊匹配
    3. 包含至少 5 条 seed 数据
```

### Step 1.1b: Semantic Decomposition (Format 4 only)

#### Mode 4a: Reference Document → LLM Extraction

```javascript
if (inputFormat === 'natural-language' && referenceDocContent) {
  const extractPrompt = `PURPOSE: Extract ACTUAL EXECUTABLE COMMANDS from the reference document. The user wants to TEST these commands by running them.

USER INTENT: ${naturalLanguageInput}
REFERENCE DOCUMENT: ${referenceDocPath}

DOCUMENT CONTENT:
${referenceDocContent}

CRITICAL RULES:
- "command" field MUST be a real executable: slash command (/skill-name args), ccw cli call, or shell command
- CORRECT: { "command": "/workflow-lite-plan analyze auth module" }
- CORRECT: { "command": "ccw cli -p 'review code' --tool claude --mode write" }
- WRONG:  { "command": "分析 Phase 管线" } ← DESCRIPTION, not command
- Default mode to "write"

EXPECTED OUTPUT (strict JSON):
{
  "workflow_name": "<name>",
  "project_scenario": "<虚构项目场景>",
  "steps": [{ "name": "", "command": "<executable>", "expected_artifacts": [], "success_criteria": "" }]
}`;

  Bash({
    command: `ccw cli -p ${escapeForShell(extractPrompt)} --tool claude --mode write --rule universal-rigorous-style`,
    run_in_background: true, timeout: 300000
  });
  // ■ STOP — wait for hook callback, parse JSON → steps[]
}
```

#### Mode 4b: Pure Intent → Command Assembly

```javascript
if (inputFormat === 'natural-language' && !referenceDocContent) {
  // Intent → rule mapping for ccw cli command generation
  const intentMap = [
    { pattern: /分析|analyze|审查|inspect|scan/i, name: 'analyze', rule: 'analysis-analyze-code-patterns' },
    { pattern: /评审|review|code.?review/i, name: 'review', rule: 'analysis-review-code-quality' },
    { pattern: /诊断|debug|排查|diagnose/i, name: 'diagnose', rule: 'analysis-diagnose-bug-root-cause' },
    { pattern: /安全|security|漏洞/i, name: 'security-audit', rule: 'analysis-assess-security-risks' },
    { pattern: /性能|performance|perf/i, name: 'perf-analysis', rule: 'analysis-analyze-performance' },
    { pattern: /架构|architecture/i, name: 'arch-review', rule: 'analysis-review-architecture' },
    { pattern: /修复|fix|repair|解决/i, name: 'fix', rule: 'development-debug-runtime-issues' },
    { pattern: /实现|implement|开发|create|新增/i, name: 'implement', rule: 'development-implement-feature' },
    { pattern: /重构|refactor/i, name: 'refactor', rule: 'development-refactor-codebase' },
    { pattern: /测试|test/i, name: 'test', rule: 'development-generate-tests' },
    { pattern: /规划|plan|设计|design/i, name: 'plan', rule: 'planning-plan-architecture-design' },
  ];

  const segments = naturalLanguageInput
    .split(/[，,；;、]|(?:然后|接着|之后|最后|再|并|and then|then|finally|next)\s*/i)
    .map(s => s.trim()).filter(Boolean);

  // ★ 将意图文本转化为完整的 ccw cli 命令
  steps = segments.map((segment, i) => {
    const matched = intentMap.find(m => m.pattern.test(segment));
    const rule = matched?.rule || 'universal-rigorous-style';
    // 组装真正可执行的命令
    const command = `ccw cli -p ${escapeForShell('PURPOSE: ' + segment + '\\nTASK: Execute based on intent\\nCONTEXT: @**/*')} --tool claude --mode write --rule ${rule}`;
    return {
      name: matched?.name || `step-${i + 1}`,
      command,
      original_intent: segment,  // 保留原始意图用于分析
      expected_artifacts: [], success_criteria: ''
    };
  });
}
```

### Step 1.1c: Execution Plan Confirmation

```javascript
function generateCommandDoc(steps, workflowName, projectScenario, analysisDepth) {
  const stepTable = steps.map((s, i) => {
    const cmdPreview = s.command.length > 60 ? s.command.substring(0, 57) + '...' : s.command;
    const taskPreview = (s.test_task || '-').length > 40 ? s.test_task.substring(0, 37) + '...' : (s.test_task || '-');
    return `| ${i + 1} | ${s.name} | \`${cmdPreview}\` | ${taskPreview} |`;
  }).join('\n');

  return `# Workflow Tune — Execution Plan\n\n**Workflow**: ${workflowName}\n**Test Project**: ${projectScenario}\n**Steps**: ${steps.length}\n**Depth**: ${analysisDepth}\n\n| # | Name | Command | Test Task |\n|---|------|---------|-----------|\n${stepTable}`;
}

const commandDoc = generateCommandDoc(steps, workflowName, projectScenario, workflowPreferences.analysisDepth);

if (!workflowPreferences.autoYes) {
  const confirmation = AskUserQuestion({
    questions: [{
      question: commandDoc + "\n\n确认执行以上 Workflow 调优计划？", header: "Confirm Execution", multiSelect: false,
      options: [
        { label: "Execute (确认执行)", description: "按计划开始执行" },
        { label: "Cancel (取消)", description: "取消" }
      ]
    }]
  });
  if (confirmation["Confirm Execution"].startsWith("Cancel")) return;
}
```

### Step 1.2: (Merged into Step 1.1a)

> Test requirements (acceptance_criteria) are now generated together with test_task in Step 1.1a, avoiding an extra CLI call.

### Step 1.3: Create Workspace + Sandbox Project

```javascript
const ts = Date.now();
const workDir = `.workflow/.scratchpad/workflow-tune-${ts}`;

// ★ 创建独立沙箱项目目录 — 所有命令执行在此目录中，不影响真实项目
const sandboxDir = `${workDir}/sandbox`;
Bash(`mkdir -p "${workDir}/steps" "${sandboxDir}"`);
// 初始化沙箱为独立 git 仓库（部分命令依赖 git 环境）
Bash(`cd "${sandboxDir}" && git init && echo "# Sandbox Project" > README.md && git add . && git commit -m "init sandbox"`);

for (let i = 0; i < steps.length; i++) Bash(`mkdir -p "${workDir}/steps/step-${i + 1}/artifacts"`);

Write(`${workDir}/command-doc.md`, commandDoc);

const initialState = {
  status: 'running', started_at: new Date().toISOString(),
  workflow_name: workflowName, project_scenario: projectScenario,
  analysis_depth: workflowPreferences.analysisDepth, auto_fix: workflowPreferences.autoFix,
  sandbox_dir: sandboxDir,  // ★ 独立沙箱项目目录
  current_step: 0,  // ★ State machine cursor
  current_phase: 'execute',  // 'execute' | 'analyze'
  steps: steps.map((s, i) => ({
    ...s, index: i, status: 'pending',
    test_task: s.test_task || '',  // ★ 每步的测试任务
    execution: null, analysis: null,
    test_requirements: s.test_requirements || null
  })),
  gemini_session_id: null,  // ★ Updated after each gemini callback
  work_dir: workDir,
  errors: [], error_count: 0, max_errors: 3
};

Write(`${workDir}/workflow-state.json`, JSON.stringify(initialState, null, 2));
Write(`${workDir}/process-log.md`, `# Process Log\n\n**Workflow**: ${workflowName}\n**Test Project**: ${projectScenario}\n**Steps**: ${steps.length}\n**Started**: ${new Date().toISOString()}\n\n---\n\n`);
```

## Phase 2: Execute Step

### resolveCommandFile — Slash command → file path

```javascript
function resolveCommandFile(command) {
  const cmdMatch = command.match(/^\/?([^\s]+)/);
  if (!cmdMatch) return null;
  const cmdName = cmdMatch[1];
  const cmdPath = cmdName.replace(/:/g, '/');

  const searchRoots = ['.claude', '~/.claude'];

  for (const root of searchRoots) {
    const candidates = [
      `${root}/commands/${cmdPath}.md`,
      `${root}/commands/${cmdPath}/index.md`,
    ];
    for (const candidate of candidates) {
      try { Read(candidate, { limit: 1 }); return candidate; } catch {}
    }
  }

  for (const root of searchRoots) {
    const candidates = [
      `${root}/skills/${cmdName}/SKILL.md`,
      `${root}/skills/${cmdPath.replace(/\//g, '-')}/SKILL.md`,
    ];
    for (const candidate of candidates) {
      try { Read(candidate, { limit: 1 }); return candidate; } catch {}
    }
  }

  return null;
}
```

### readCommandMeta — Read YAML frontmatter + body summary

```javascript
function readCommandMeta(filePath) {
  if (!filePath) return null;

  const content = Read(filePath);
  const meta = { filePath, name: '', description: '', argumentHint: '', allowedTools: '', bodySummary: '' };

  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (yamlMatch) {
    const yaml = yamlMatch[1];
    const nameMatch = yaml.match(/^name:\s*(.+)$/m);
    const descMatch = yaml.match(/^description:\s*(.+)$/m);
    const hintMatch = yaml.match(/^argument-hint:\s*"?(.+?)"?\s*$/m);
    const toolsMatch = yaml.match(/^allowed-tools:\s*(.+)$/m);

    if (nameMatch) meta.name = nameMatch[1].trim();
    if (descMatch) meta.description = descMatch[1].trim();
    if (hintMatch) meta.argumentHint = hintMatch[1].trim();
    if (toolsMatch) meta.allowedTools = toolsMatch[1].trim();
  }

  const bodyStart = content.indexOf('---', content.indexOf('---') + 3);
  if (bodyStart !== -1) {
    const body = content.substring(bodyStart + 3).trim();
    meta.bodySummary = body.split('\n').slice(0, 30).join('\n');
  }

  return meta;
}
```

### assembleStepPrompt — Build execution prompt from command metadata

```javascript
function assembleStepPrompt(step, stepIdx, state) {
  // ── 1. Resolve command file + metadata ──
  const isSlashCmd = step.command.startsWith('/');
  const cmdFile = isSlashCmd ? resolveCommandFile(step.command) : null;
  const cmdMeta = readCommandMeta(cmdFile);
  const cmdArgs = isSlashCmd ? step.command.replace(/^\/?[^\s]+\s*/, '').trim() : '';

  // ── 2. Prior/next step context ──
  const prevStep = stepIdx > 0 ? state.steps[stepIdx - 1] : null;
  const nextStep = stepIdx < state.steps.length - 1 ? state.steps[stepIdx + 1] : null;

  const priorContext = prevStep
    ? `PRIOR STEP: "${prevStep.name}" — ${prevStep.command}\n  Status: ${prevStep.status} | Artifacts: ${prevStep.execution?.artifact_count || 0}`
    : 'PRIOR STEP: None (first step)';

  const nextContext = nextStep
    ? `NEXT STEP: "${nextStep.name}" — ${nextStep.command}\n  Ensure output is consumable by next step`
    : 'NEXT STEP: None (last step)';

  // ── 3. Acceptance criteria (from test_task generation) ──
  const criteria = step.acceptance_criteria || [];
  const testReqSection = criteria.length > 0
    ? `ACCEPTANCE CRITERIA:\n${criteria.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}`
    : '';

  // ── 4. Test task — the concrete scenario to drive execution ──
  const testTask = step.test_task || '';
  const testTaskSection = testTask
    ? `TEST TASK (用此任务驱动命令执行):\n  ${testTask}`
    : '';

  // ── 5. Build prompt based on whether command has metadata ──
  if (cmdMeta) {
    // Slash command with resolved file — rich context prompt
    return `PURPOSE: Execute workflow step "${step.name}" (${stepIdx + 1}/${state.steps.length}).

COMMAND DEFINITION:
  Name: ${cmdMeta.name}
  Description: ${cmdMeta.description}
  Argument Format: ${cmdMeta.argumentHint || 'none'}
  Allowed Tools: ${cmdMeta.allowedTools || 'default'}
  Source: ${cmdMeta.filePath}

COMMAND TO EXECUTE: ${step.command}
ARGUMENTS: ${cmdArgs || '(no arguments)'}

${testTaskSection}

COMMAND REFERENCE (first 30 lines):
${cmdMeta.bodySummary}

PROJECT: ${state.project_scenario}
SANDBOX PROJECT: ${state.sandbox_dir}
OUTPUT DIR: ${state.work_dir}/steps/step-${stepIdx + 1}

${priorContext}
${nextContext}
${testReqSection}

TASK: Execute the command as described in COMMAND DEFINITION, using TEST TASK as the input/scenario. Use the COMMAND REFERENCE to understand expected behavior. All work happens in the SANDBOX PROJECT directory (an isolated empty project, NOT the real workspace). Auto-confirm all prompts.
CONSTRAINTS: Stay scoped to this step only. Follow the command's own execution flow. The TEST TASK is the real work — treat it as the $ARGUMENTS input to the command. Do NOT read/modify files outside SANDBOX PROJECT.`;

  } else {
    // Shell command, ccw cli command, or unresolved command
    return `PURPOSE: Execute workflow step "${step.name}" (${stepIdx + 1}/${state.steps.length}).
COMMAND: ${step.command}
${testTaskSection}
PROJECT: ${state.project_scenario}
SANDBOX PROJECT: ${state.sandbox_dir}
OUTPUT DIR: ${state.work_dir}/steps/step-${stepIdx + 1}

${priorContext}
${nextContext}
${testReqSection}

TASK: Execute the COMMAND above with TEST TASK as the input scenario. All work happens in the SANDBOX PROJECT directory (an isolated empty project). Auto-confirm all prompts.
CONSTRAINTS: Stay scoped to this step only. The TEST TASK is the real work to execute. Do NOT read/modify files outside SANDBOX PROJECT.`;
  }
}
```

### Step Execution

```javascript
const stepIdx = state.current_step;
const step = state.steps[stepIdx];
const stepDir = `${state.work_dir}/steps/step-${stepIdx + 1}`;

// Pre-execution: snapshot sandbox directory files
const preFiles = Bash(`find "${state.sandbox_dir}" -type f 2>/dev/null | sort`).stdout.trim();
Write(`${stepDir}/pre-exec-snapshot.txt`, preFiles || '(empty)');

const startTime = Date.now();
const prompt = assembleStepPrompt(step, stepIdx, state);

// ★ All steps execute via ccw cli --tool claude --mode write
// ★ --cd 指向沙箱目录（独立项目），不影响真实工作空间
Bash({
  command: `ccw cli -p ${escapeForShell(prompt)} --tool claude --mode write --rule universal-rigorous-style --cd "${state.sandbox_dir}"`,
  run_in_background: true, timeout: 600000
});
// ■ STOP — wait for hook callback
```

### Post-Execute Callback Handler

```javascript
// ★ This runs after receiving the ccw cli callback

const duration = Date.now() - startTime;

// Collect artifacts by scanning sandbox (not git diff — sandbox is an independent project)
const postFiles = Bash(`find "${state.sandbox_dir}" -type f -newer "${stepDir}/pre-exec-snapshot.txt" 2>/dev/null | sort`).stdout.trim();
const newArtifacts = postFiles ? postFiles.split('\n').filter(f => !f.endsWith('.git/')) : [];

const artifactManifest = {
  step: step.name, step_index: stepIdx,
  success: true, duration_ms: duration,
  artifacts: newArtifacts.map(f => ({
    path: f,
    type: f.endsWith('.md') ? 'markdown' : f.endsWith('.json') ? 'json' : 'other'
  })),
  collected_at: new Date().toISOString()
};
Write(`${stepDir}/artifacts-manifest.json`, JSON.stringify(artifactManifest, null, 2));

// Update state
state.steps[stepIdx].status = 'executed';
state.steps[stepIdx].execution = {
  success: true, duration_ms: duration,
  artifact_count: newArtifacts.length
};
state.current_phase = 'analyze';
Write(`${state.work_dir}/workflow-state.json`, JSON.stringify(state, null, 2));

// → Proceed to Phase 3 for this step
```

## Phase 3: Analyze Step (per step, via gemini)

```javascript
const manifest = JSON.parse(Read(`${stepDir}/artifacts-manifest.json`));

// Build artifact content for analysis
let artifactSummary = '';
if (state.analysis_depth === 'quick') {
  artifactSummary = manifest.artifacts.map(a => `- ${a.path} (${a.type})`).join('\n');
} else {
  const maxLines = state.analysis_depth === 'deep' ? 300 : 150;
  artifactSummary = manifest.artifacts.map(a => {
    try { return `--- ${a.path} ---\n${Read(a.path, { limit: maxLines })}`; }
    catch { return `--- ${a.path} --- [unreadable]`; }
  }).join('\n\n');
}

const criteria = step.acceptance_criteria || [];
const testTaskDesc = step.test_task ? `TEST TASK: ${step.test_task}` : '';
const criteriaSection = criteria.length > 0
  ? `ACCEPTANCE CRITERIA:\n${criteria.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}`
  : '';

const analysisPrompt = `PURPOSE: Evaluate execution quality of step "${step.name}" (${stepIdx + 1}/${state.steps.length}).
WORKFLOW: ${state.workflow_name} — ${state.project_scenario}
COMMAND: ${step.command}
${testTaskDesc}
${criteriaSection}
EXECUTION: Duration ${step.execution.duration_ms}ms | Artifacts: ${manifest.artifacts.length}
ARTIFACTS:\n${artifactSummary}
EXPECTED OUTPUT (strict JSON):
{ "quality_score": <0-100>, "requirement_match": { "pass": <bool>, "criteria_met": [], "criteria_missed": [], "fail_signals_detected": [] }, "execution_assessment": { "success": <bool>, "completeness": "", "notes": "" }, "artifact_assessment": { "count": <n>, "quality": "", "key_outputs": [], "missing_outputs": [] }, "issues": [{ "severity": "critical|high|medium|low", "description": "", "suggestion": "" }], "optimization_opportunities": [{ "area": "", "description": "", "impact": "high|medium|low" }], "step_summary": "" }`;

let cliCommand = `ccw cli -p ${escapeForShell(analysisPrompt)} --tool gemini --mode analysis --rule analysis-review-code-quality`;
if (state.gemini_session_id) cliCommand += ` --resume ${state.gemini_session_id}`;
Bash({ command: cliCommand, run_in_background: true, timeout: 300000 });
// ■ STOP — wait for hook callback
```

### Post-Analyze Callback Handler

```javascript
// ★ Parse analysis result JSON from callback
const analysisResult = /* parsed from callback output */;

// ★ Capture gemini session ID for resume chain
// Session ID is in stderr: [CCW_EXEC_ID=gem-xxxxxx-xxxx]
state.gemini_session_id = /* captured from callback exec_id */;

Write(`${stepDir}/step-${stepIdx + 1}-analysis.json`, JSON.stringify(analysisResult, null, 2));

// Update state
state.steps[stepIdx].analysis = {
  quality_score: analysisResult.quality_score,
  requirement_pass: analysisResult.requirement_match?.pass,
  issue_count: (analysisResult.issues || []).length
};
state.steps[stepIdx].status = 'completed';

// Append to process log
const logEntry = `## Step ${stepIdx + 1}: ${step.name}\n- Score: ${analysisResult.quality_score}/100\n- Req: ${analysisResult.requirement_match?.pass ? 'PASS' : 'FAIL'}\n- Issues: ${(analysisResult.issues || []).length}\n- Summary: ${analysisResult.step_summary}\n\n`;
Edit(`${state.work_dir}/process-log.md`, /* append logEntry */);

// ★ Advance state machine
state.current_step = stepIdx + 1;
state.current_phase = 'execute';
Write(`${state.work_dir}/workflow-state.json`, JSON.stringify(state, null, 2));

// ★ Decision: advance or synthesize
if (state.current_step < state.steps.length) {
  // → Back to Phase 2 for next step
} else {
  // → Phase 4: Synthesize
}
```

## Step Loop — State Machine

```
NOT a sync for-loop. Each step follows this state machine:

  ┌─────────────────────────────────────────────────────┐
  │ state.current_step = N, state.current_phase = X     │
  ├─────────────────────────────────────────────────────┤
  │ phase='execute' → Phase 2 → ccw cli claude → STOP  │
  │   callback → collect artifacts → phase='analyze'    │
  │ phase='analyze' → Phase 3 → ccw cli gemini → STOP  │
  │   callback → save analysis → current_step++         │
  │   if current_step < total → phase='execute' (loop)  │
  │   else → Phase 4 (synthesize)                       │
  └─────────────────────────────────────────────────────┘

Error handling:
  - Execute timeout → retry once, then mark failed, advance
  - Analyze failure → retry without --resume, then skip analysis
  - 3+ consecutive errors → terminate, jump to Phase 5 partial report
```

## Phase 4: Synthesize (via gemini)

```javascript
const stepAnalyses = state.steps.map((step, i) => {
  try { return { step: step.name, content: Read(`${state.work_dir}/steps/step-${i + 1}/step-${i + 1}-analysis.json`) }; }
  catch { return { step: step.name, content: '[Not available]' }; }
});

const scores = state.steps.map(s => s.analysis?.quality_score).filter(Boolean);
const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

const synthesisPrompt = `PURPOSE: Synthesize all step analyses into holistic workflow assessment with actionable optimization plan.
WORKFLOW: ${state.workflow_name} — ${state.project_scenario}
Steps: ${state.steps.length} | Avg Quality: ${avgScore}/100
STEP ANALYSES:\n${stepAnalyses.map(a => `### ${a.step}\n${a.content}`).join('\n\n---\n\n')}
Evaluate: coherence across steps, handoff quality, redundancy, bottlenecks.
EXPECTED OUTPUT (strict JSON):
{ "workflow_score": <0-100>, "coherence": { "score": <0-100>, "assessment": "", "gaps": [] }, "bottlenecks": [{ "step": "", "issue": "", "suggestion": "" }], "per_step_improvements": [{ "step": "", "priority": "high|medium|low", "action": "" }], "workflow_improvements": [{ "area": "", "description": "", "impact": "high|medium|low" }], "summary": "" }`;

let cliCommand = `ccw cli -p ${escapeForShell(synthesisPrompt)} --tool gemini --mode analysis --rule analysis-review-architecture`;
if (state.gemini_session_id) cliCommand += ` --resume ${state.gemini_session_id}`;
Bash({ command: cliCommand, run_in_background: true, timeout: 300000 });
// ■ STOP — wait for hook callback → parse JSON, write synthesis.json, update state
```

## Phase 5: Report

```javascript
const synthesis = JSON.parse(Read(`${state.work_dir}/synthesis.json`));
const scores = state.steps.map(s => s.analysis?.quality_score).filter(Boolean);
const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
const totalIssues = state.steps.reduce((sum, s) => sum + (s.analysis?.issue_count || 0), 0);

const stepTable = state.steps.map((s, i) => {
  const reqStr = s.analysis?.requirement_pass === true ? 'PASS' : s.analysis?.requirement_pass === false ? 'FAIL' : '-';
  return `| ${i + 1} | ${s.name} | ${s.execution?.success ? 'OK' : 'FAIL'} | ${reqStr} | ${s.analysis?.quality_score || '-'} | ${s.analysis?.issue_count || 0} |`;
}).join('\n');

const improvements = (synthesis.per_step_improvements || [])
  .filter(imp => imp.priority === 'high')
  .map(imp => `- **${imp.step}**: ${imp.action}`)
  .join('\n');

const report = `# Workflow Tune Report

| Field | Value |
|---|---|
| Workflow | ${state.workflow_name} |
| Test Project | ${state.project_scenario} |
| Workflow Score | ${synthesis.workflow_score || avgScore}/100 |
| Avg Step Score | ${avgScore}/100 |
| Total Issues | ${totalIssues} |
| Coherence | ${synthesis.coherence?.score || '-'}/100 |

## Step Results

| # | Step | Exec | Req | Quality | Issues |
|---|------|------|-----|---------|--------|
${stepTable}

## High Priority Improvements

${improvements || 'None'}

## Workflow-Level Improvements

${(synthesis.workflow_improvements || []).map(w => `- **${w.area}** (${w.impact}): ${w.description}`).join('\n') || 'None'}

## Bottlenecks

${(synthesis.bottlenecks || []).map(b => `- **${b.step}**: ${b.issue} → ${b.suggestion}`).join('\n') || 'None'}

## Summary

${synthesis.summary || 'N/A'}
`;

Write(`${state.work_dir}/final-report.md`, report);
state.status = 'completed';
Write(`${state.work_dir}/workflow-state.json`, JSON.stringify(state, null, 2));

// Output report to user
```

## Resume Chain

```
Step 1 Execute → ccw cli claude --mode write --rule universal-rigorous-style --cd step-1/ → STOP → callback → artifacts
Step 1 Analyze → ccw cli gemini --mode analysis --rule analysis-review-code-quality         → STOP → callback → gemini_session_id = exec_id
Step 2 Execute → ccw cli claude --mode write --rule universal-rigorous-style --cd step-2/ → STOP → callback → artifacts
Step 2 Analyze → ccw cli gemini --mode analysis --resume gemini_session_id                 → STOP → callback → gemini_session_id = exec_id
  ...
Synthesize   → ccw cli gemini --mode analysis --resume gemini_session_id                   → STOP → callback → synthesis
Report       → local generation (no CLI call)
```

## Error Handling

| Phase | Error | Recovery |
|-------|-------|----------|
| Execute | CLI timeout | Retry once, then mark step failed and advance |
| Execute | Command not found | Skip step, note in process-log |
| Analyze | CLI fails | Retry without --resume, then skip analysis |
| Synthesize | CLI fails | Generate report from step analyses only |
| Any | 3+ consecutive errors | Terminate, produce partial report |

## Core Rules

1. **STOP After Each CLI Call**: Every `ccw cli` call runs in background — STOP output immediately, wait for hook callback
2. **State Machine**: Advance via `current_step` + `current_phase`, never use sync loops for async operations
3. **Test Task Drives Execution**: 每个命令必须有 test_task（完整需求说明），作为命令的 $ARGUMENTS 输入。test_task 由当前 Claude 直接根据命令链复杂度生成，不需要额外 CLI 调用
4. **All Execution via claude**: `ccw cli --tool claude --mode write --rule universal-rigorous-style`
5. **All Analysis via gemini**: `ccw cli --tool gemini --mode analysis`, chained via `--resume`
6. **Session Capture**: After each gemini callback, capture exec_id → `gemini_session_id` for resume chain
7. **Sandbox Isolation**: 所有命令在独立沙箱目录（`sandbox/`）中执行，使用虚构测试任务，不影响真实项目
8. **Artifact Collection**: Scan sandbox filesystem (not git diff), compare pre/post snapshots
9. **Prompt Assembly**: Every step goes through `assembleStepPrompt()` — resolves command file, reads YAML metadata, injects test_task, builds rich context
10. **Auto-Confirm**: All prompts auto-confirmed, no blocking interactions during execution
