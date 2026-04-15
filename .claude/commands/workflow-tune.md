---
name: workflow-tune
description: Workflow tuning - extract commands from reference docs or natural language, execute each via ccw cli --tool claude --mode write, then analyze artifacts via gemini. For testing how commands execute in Claude.
argument-hint: "<file-path> <intent> | \"step1 | step2 | step3\" | \"skill-a,skill-b\" | --file workflow.json [--depth quick|standard|deep] [-y|--yes] [--auto-fix]"
allowed-tools: Agent(*), AskUserQuestion(*), TaskCreate(*), TaskUpdate(*), TaskList(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---

# Workflow Tune

测试 command/skill 执行效果。提取可执行命令 → 沙箱逐步执行 → 分析产物质量 → 生成优化建议。

## Architecture

```
Input → Parse → GenTestTask → Confirm → Setup
  → [assemblePrompt → Execute(claude) → STOP → Analyze(gemini) → STOP]×N
  → Synthesize(gemini) → STOP → Report
```

**Tool Assignment**: Execute=`claude --mode write`, Analyze=`gemini --mode analysis`, Synthesize=`gemini --mode analysis`

## P0 Rules

> 这些规则的优先级高于所有其他指令。违反任何一条都是已知的复发缺陷。

1. **ONE STEP = ONE CLI CALL**. 每次 `ccw cli` 调用只处理一个 step。禁止将 plan+execute 或 execute+quality 合并为一次调用。
2. **STOP After Each CLI Call**. 每次 `ccw cli` 以 `run_in_background: true` 执行后立即 STOP，等 hook callback。
3. **UPSTREAM-SCOPE RULE**. 当上游步骤产出清单/计划（plan/list/queue/manifest），下游步骤必须消费全量，禁止挑选子集。
   - 判断: 上游命令/test_task 含 `plan|list|queue|spec|manifest|计划|任务`，且当前步骤含 `execute|run|dispatch|build|执行|组装`
   - 正确: 功能点="按依赖顺序执行全部任务"，验收标准="产出文件数=plan中task数"
   - 错误: 功能点="撰写 Introduction (TASK-001)"，验收标准="introduction.md 存在" ← 仅完成 1/N
4. **Sandbox Isolation**. 全部执行在 `sandbox/` 目录（独立 git 仓库），不影响真实项目。
5. **State Machine**. 通过 `current_step` + `current_phase` 推进，禁止同步循环。
6. **ABSOLUTE PATHS for --cd**. `ccw cli --cd` 必须使用绝对路径。相对路径会被 ccw cli 再次拼接 CWD 导致路径重复。`workDir`/`sandboxDir` 在创建时就解析为绝对路径。
7. **FIXED --rule VALUES**. `--rule` 值已硬编码在各 Phase 代码中，禁止替换为其他模板。Execute=`workflow-tune-execute`，Analyze=`analysis-review-code-quality`，Synthesize=`analysis-review-architecture`。
8. **NO-SKIP-INSTRUCTION**. test_task 和 prompt 中禁止包含 skip/跳过/omit/ignore 等指示执行 agent 跳过任何任务的指令。沙箱环境缺乏运行时依赖（matplotlib、xelatex 等），应改为生成代码/骨架文件而非跳过。
   - 错误: "Skip figure/generate tasks as they require external tools"
   - 正确: "For figure/generate tasks, produce Python matplotlib code (.py) + SVG files. Do NOT skip any tasks."

## Input Formats

| Format | Pattern | Example |
|--------|---------|---------|
| JSON definition | `--file workflow.json` | `--file motor-benchmark.json` |
| Pipe-separated | `"cmd1 \| cmd2 \| cmd3"` | `"/workspace:init \| /workspace:new-paper"` |
| Comma-separated | `"skill-a,skill-b"` | `"workflow-lite-plan,workflow-lite-execute"` |
| Reference doc + intent | `<path> <intent>` | `COMMAND-FLOW.md 测试前5个命令` |
| Pure intent | `<text>` | `"分析代码质量，然后修复问题"` |

**ANTI-PATTERN**: `{ command: "分析代码" }` 是描述不是命令。正确: `{ command: "/workflow-lite-plan ..." }` 或 `{ command: "ccw cli -p '...' --tool claude --mode write" }`

---

## Phase 1: Setup

### 1.1 Parse Input + Preferences

```javascript
const args = $ARGUMENTS.trim();
const autoYes = /\b(-y|--yes)\b/.test(args);
const depthMatch = args.match(/--depth\s+(quick|standard|deep)/);

const workflowPreferences = autoYes
  ? { autoYes: true, analysisDepth: depthMatch?.[1] || 'standard', autoFix: /--auto-fix/.test(args) }
  : /* AskUserQuestion: depth(quick/standard/deep) + autoFix(yes/no) */;

// Format detection → steps[]
let steps, workflowName, projectScenario, inputFormat;
const fileMatch = args.match(/--file\s+"?([^\s"]+)"?/);

if (fileMatch) {                                    // JSON definition
  const wf = JSON.parse(Read(fileMatch[1]));
  steps = wf.steps; workflowName = wf.name; projectScenario = wf.project_scenario;
  inputFormat = 'json';
}
else if (args.includes('|'))  { /* split by | → steps[] */ inputFormat = 'pipe'; }
else if (/^[\w-]+(,[\w-]+)+/.test(args.split(/\s/)[0])) { /* split by , → steps[] */ inputFormat = 'skills'; }
else {
  inputFormat = 'natural-language';
  // Detect file path in args → Mode 4a (reference doc extraction via claude CLI)
  // No file path → Mode 4b (intent-verb matching → ccw cli command assembly)
  // Both modes output steps[] with executable commands
}
```

### 1.2 Generate Test Tasks

> 所有步骤共享统一虚构项目场景。由当前 Claude 直接生成，无需 CLI 调用。

```javascript
const stepsNeedTask = steps.filter(s => !s.test_task);
if (stepsNeedTask.length === 0) goto('1.3');

// Step A: 选择虚构项目场景（按步骤数量选规模）
//   1-2 步: 小型 ("CLI TODO 工具")
//   3-4 步: 中型 ("团队任务看板")
//   5+ 步:  大型 ("电商平台")
projectScenario = /* 选择或自创场景 */;

// Step B: 为每步生成 test_task
for (const [stepIdx, step] of stepsNeedTask.entries()) {
  const cmdMeta = readCommandMeta(resolveCommandFile(step.command));
  const cmdDesc = (cmdMeta?.description || step.command).toLowerCase();

  // ★ Upstream-scope detection (P0 Rule #3)
  const hasUpstreamScope = stepIdx > 0
    && /plan|list|catalog|queue|todo|spec|manifest|清单|计划|任务/i.test(
         (steps[stepIdx - 1]?.command || '') + ' ' + (steps[stepIdx - 1]?.test_task || ''))
    && /execute|run|process|consume|iterate|dispatch|assemble|build|执行|运行|组装/i.test(cmdDesc);

  const upstreamFlags = step.flags || '';  // from JSON definition (e.g. "--type draft-section")

  // test_task 模板:
  //   项目: {projectScenario}
  //   任务: {子任务描述}
  //   功能点: 1. ... 2. ... 3. ...
  //   验收标准: 1. ... 2. ...
  //
  // ★ hasUpstreamScope=true 时:
  //   - 任务 = "按上游计划的依赖顺序执行全部任务"（禁止挑选子集）
  //   - 若 upstreamFlags 非空，在任务中传递（如 "--type draft-section"）
  //   - 命令参数不含单个 task ID，用 --all 或 --type 或无参数
  //   - 验收标准必须含全量覆盖率（"产出文件数 = plan 中 task 数"）
  //   - ★ TYPE-AWARE CRITERIA: 从上游 plan 产物（plan.json 等）中提取
  //     task type 分布，为每种 type 生成对应的验收标准:
  //       文本类(draft-section/writing/review) → "对应 .md 文件数 >= N"
  //       代码类(figure/generate, experiment/*) → "代码文件(.py/.svg) 数 >= N"
  //       数据类(data/*, assembly/*) → "数据/组装文件数 >= N"
  //     这确保非文本类产出（图片代码、实验脚本、组装产物）不被静默跳过。
  //     若上游 plan 不可读，退回通用全量覆盖标准。
  //
  // ★ hasUpstreamScope=false 时:
  //   - 按命令类型分配子任务: plan→架构设计, implement→功能实现, analyze→分析, test→测试

  // ★ P0 Rule #8: NO-SKIP-INSTRUCTION validation
  // 检测 test_task 中是否包含跳过指令，若有则重写为沙箱兼容指令
  const skipPattern = /skip|跳过|omit|ignore| bypass|不需要|无需.*任务/i;
  if (skipPattern.test(step.test_task)) {
    // 将跳过指令替换为沙箱兼容降级指令
    step.test_task = step.test_task.replace(
      /skip\s+(.+?tasks?.*?)(?:\s*as\s+they\s+.+?)/i,
      'For $1, produce code/skeleton files in sandbox (no runtime execution required).'
    ).replace(
      /跳过\s*(.+?(?:任务|task).+?)(?:\s*(?:因为|由于).+?)/i,
      '对于 $1，生成代码/骨架文件（无需运行时依赖）。'
    );
    // 通用兜底：移除残留的跳过指令
    step.test_task = step.test_task.replace(
      /(?:do\s+not|不要|禁止)\s+(?:attempt|尝试|执行)\s+(.+?tasks?.*?)(?:\.|$)/gi,
      'Attempt all tasks including $1. For tasks requiring unavailable dependencies, produce code approximations.'
    );
  }

  // ★ Sandbox artifact type detection
  // 检测 test_task 涉及的任务类型，补充沙箱兼容验收标准
  const artifactTypes = [];
  if (/figure|chart|plot|graph|图|svg|png/i.test(step.test_task)) artifactTypes.push('code(.py)+svg');
  if (/assembly|assemble|manuscript|bib|latex|tex|组装|论文/i.test(step.test_task)) artifactTypes.push('code(.bib,.tex)');
  if (/experiment|data|csv|excel|实验|数据/i.test(step.test_task)) artifactTypes.push('code(.py,.csv)');

  step.test_task = /* 按上述规则生成 */;
  step.acceptance_criteria = /* 2-4 条可验证标准 */;

  // 补充沙箱兼容验收标准：涉及代码/图表/组装时，必须产出代码文件
  if (artifactTypes.length > 0) {
    const sandboxCriteria = `Sandbox produces code artifacts: ${artifactTypes.join(', ')}`;
    if (!step.acceptance_criteria.some(c => /code|artifact|file/i.test(c))) {
      step.acceptance_criteria.push(sandboxCriteria);
    }
  }

  step.complexity_level = /plan|design|architect/i.test(cmdDesc) ? 'high'
    : /test|lint|format/i.test(cmdDesc) ? 'low' : 'medium';
}
```

### 1.3 Confirm + Create Workspace

```javascript
// Show execution plan table, ask confirmation (skip if autoYes)
const commandDoc = generateCommandDoc(steps, workflowName, projectScenario, analysisDepth);
if (!autoYes) { /* AskUserQuestion: confirm or cancel */ }

// Create sandbox — MUST resolve absolute path (P0 Rule #6)
const cwd = Bash('pwd').stdout.trim();
const workDir = `${cwd}/.workflow/.scratchpad/workflow-tune-${Date.now()}`;
const sandboxDir = `${workDir}/sandbox`;
Bash(`mkdir -p "${workDir}/steps" "${sandboxDir}"`);
Bash(`cd "${sandboxDir}" && git init && echo "# Sandbox" > README.md && git add . && git commit -m "init"`);

// Initialize state
const state = {
  status: 'running', started_at: new Date().toISOString(),
  workflow_name: workflowName, project_scenario: projectScenario,
  analysis_depth: analysisDepth, auto_fix: autoFix,
  sandbox_dir: sandboxDir, current_step: 0, current_phase: 'execute',
  steps: steps.map((s, i) => ({ ...s, index: i, status: 'pending', execution: null, analysis: null })),
  gemini_session_id: null, work_dir: workDir,
  errors: [], error_count: 0, max_errors: 3
};
Write(`${workDir}/workflow-state.json`, JSON.stringify(state, null, 2));
Write(`${workDir}/command-doc.md`, commandDoc);
```

---

## Phase 2: Execute Step

### Utilities

```javascript
function escapeForShell(str) { return "'" + str.replace(/'/g, "'\\''") + "'"; }

function resolveCommandFile(command) {
  const cmdPath = command.match(/^\/?([^\s]+)/)?.[1]?.replace(/:/g, '/');
  if (!cmdPath) return null;
  for (const root of ['.claude', '~/.claude']) {
    for (const p of [`${root}/commands/${cmdPath}.md`, `${root}/commands/${cmdPath}/index.md`,
                      `${root}/skills/${cmdPath}/SKILL.md`]) {
      try { Read(p, { limit: 1 }); return p; } catch {}
    }
  }
  return null;
}

function readCommandMeta(filePath) {
  if (!filePath) return null;
  const content = Read(filePath);
  const meta = { filePath, name: '', description: '', argumentHint: '', allowedTools: '', bodySummary: '' };
  const yaml = content.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (yaml) {
    meta.name = yaml.match(/^name:\s*(.+)$/m)?.[1]?.trim() || '';
    meta.description = yaml.match(/^description:\s*(.+)$/m)?.[1]?.trim() || '';
    meta.argumentHint = yaml.match(/^argument-hint:\s*"?(.+?)"?\s*$/m)?.[1]?.trim() || '';
    meta.allowedTools = yaml.match(/^allowed-tools:\s*(.+)$/m)?.[1]?.trim() || '';
  }
  const bodyStart = content.indexOf('---', content.indexOf('---') + 3);
  if (bodyStart !== -1) meta.bodySummary = content.substring(bodyStart + 3).trim().split('\n').slice(0, 30).join('\n');
  return meta;
}
```

### assembleStepPrompt

```javascript
function assembleStepPrompt(step, stepIdx, state) {
  const isSlashCmd = step.command.startsWith('/');
  const cmdFile = isSlashCmd ? resolveCommandFile(step.command) : null;
  const cmdMeta = readCommandMeta(cmdFile);
  const cmdArgs = isSlashCmd ? step.command.replace(/^\/?[^\s]+\s*/, '').trim() : '';
  const cmdDesc = (cmdMeta?.description || step.command).toLowerCase();

  const prevStep = stepIdx > 0 ? state.steps[stepIdx - 1] : null;
  const nextStep = stepIdx < state.steps.length - 1 ? state.steps[stepIdx + 1] : null;

  // Upstream-scope detection (P0 Rule #3)
  const isUpstreamScope = prevStep
    && /plan|list|catalog|queue|todo|spec|manifest|清单|计划|任务/i.test(
         (prevStep.command || '') + ' ' + (prevStep.test_task || ''))
    && /execute|run|process|consume|iterate|dispatch|assemble|build|执行|运行|组装/i.test(cmdDesc);

  const prior = !prevStep ? 'None (first step)'
    : isUpstreamScope
      ? `"${prevStep.name}" — ${prevStep.status} | ${prevStep.execution?.artifact_count || 0} artifacts
  ★ UPSTREAM SCOPE: Must consume ALL outputs. Prior task: ${(prevStep.test_task || '').substring(0, 300)}`
    : `"${prevStep.name}" — ${prevStep.status} | ${prevStep.execution?.artifact_count || 0} artifacts`;

  const next = nextStep ? `"${nextStep.name}" — ensure output is consumable` : 'None (last step)';

  const criteria = (step.acceptance_criteria || []).map((c, i) => `  ${i + 1}. ${c}`).join('\n');
  const testTask = step.test_task ? `TEST TASK:\n  ${step.test_task}` : '';
  const upstreamWarning = isUpstreamScope
    ? '\n★ UPSTREAM SCOPE: Execute ALL items from prior plan — do NOT pick a subset. Use --all or --type flag, not single task IDs.'
    : '';

  // ★ Sandbox compatibility instructions (P0 Rule #8)
  // 沙箱是纯文件环境，无 matplotlib/xelatex 等运行时，但仍需产出代码文件
  const testTaskLower = (step.test_task || '').toLowerCase();
  let sandboxInstructions = '';
  if (/figure|chart|plot|graph|图|visual/i.test(testTaskLower)) {
    sandboxInstructions += '\nSANDBOX MODE: For figure/chart tasks, generate Python matplotlib code (.py) + SVG output. Do NOT skip — produce code artifacts even if rendering is unavailable.';
  }
  if (/assembly|assemble|manuscript|bib|latex|tex|组装|参考文献/i.test(testTaskLower)) {
    sandboxInstructions += '\nSANDBOX MODE: For assembly tasks, generate .bib (BibTeX entries) and .tex (LaTeX skeleton) files. Do NOT skip — produce structural artifacts.';
  }
  if (/experiment|data|csv|实验|数据处理/i.test(testTaskLower)) {
    sandboxInstructions += '\nSANDBOX MODE: For experiment/data tasks, generate Python analysis scripts (.py) and sample data files (.csv). Do NOT skip.';
  }
  // 通用兜底：检测到 test_task 涉及多任务类型时，确保无跳过指令
  if (isUpstreamScope) {
    sandboxInstructions += '\nSANDBOX MODE: Execute ALL tasks. If a task requires unavailable runtime dependencies (matplotlib, xelatex, etc.), produce source code (.py/.tex/.bib) instead of rendered output. NEVER skip any task.';
  }

  if (cmdMeta) {
    return `PURPOSE: Execute step "${step.name}" (${stepIdx + 1}/${state.steps.length}).

COMMAND: ${step.command}
ARGUMENTS: ${cmdArgs || '(none)'}
DEFINITION: ${cmdMeta.name} — ${cmdMeta.description}
SOURCE: ${cmdMeta.filePath}

${testTask}

PROJECT: ${state.project_scenario}
SANDBOX: ${state.sandbox_dir}

PRIOR STEP: ${prior}
NEXT STEP: ${next}
${criteria ? `ACCEPTANCE CRITERIA:\n${criteria}` : ''}${sandboxInstructions}

TASK: Execute the command using TEST TASK as input. Auto-confirm all prompts. All work in SANDBOX directory.${upstreamWarning}
CONSTRAINTS: Stay scoped to this step. Do NOT modify files outside SANDBOX.`;
  } else {
    return `PURPOSE: Execute step "${step.name}" (${stepIdx + 1}/${state.steps.length}).
COMMAND: ${step.command}
${testTask}
PROJECT: ${state.project_scenario}
SANDBOX: ${state.sandbox_dir}
PRIOR STEP: ${prior}
NEXT STEP: ${next}
${criteria ? `ACCEPTANCE CRITERIA:\n${criteria}` : ''}${sandboxInstructions}
TASK: Execute COMMAND with TEST TASK as input. Auto-confirm all prompts.${upstreamWarning}
CONSTRAINTS: Stay scoped. All work in SANDBOX.`;
  }
}
```

### Execute + Collect

```javascript
const stepIdx = state.current_step;
const step = state.steps[stepIdx];
const stepDir = `${state.work_dir}/steps/step-${stepIdx + 1}`;

// Pre-snapshot
Write(`${stepDir}/pre-exec-snapshot.txt`,
  Bash(`find "${state.sandbox_dir}" -type f 2>/dev/null | sort`).stdout.trim() || '(empty)');

const prompt = assembleStepPrompt(step, stepIdx, state);
Write(`${stepDir}/prompt.txt`, prompt);

Bash({
  command: `ccw cli -p ${escapeForShell(prompt)} --tool claude --mode write --rule workflow-tune-execute --cd "${state.sandbox_dir}"`,
  run_in_background: true, timeout: 600000
});
// ■ STOP — wait for hook callback

// === Post-Execute (after callback) ===
const newArtifacts = Bash(`find "${state.sandbox_dir}" -type f -newer "${stepDir}/pre-exec-snapshot.txt" 2>/dev/null | sort`)
  .stdout.trim().split('\n').filter(f => f && !f.includes('.git/'));

Write(`${stepDir}/artifacts-manifest.json`, JSON.stringify({
  step: step.name, step_index: stepIdx, success: true,
  duration_ms: Date.now() - startTime,
  artifacts: newArtifacts.map(f => ({ path: f, type: f.match(/\.(md|json|jsonl|py|tex|bib|svg|csv)$/)?.[1] || 'other' })),
  collected_at: new Date().toISOString()
}, null, 2));

state.steps[stepIdx].status = 'executed';
state.steps[stepIdx].execution = { success: true, duration_ms: Date.now() - startTime, artifact_count: newArtifacts.length };
state.current_phase = 'analyze';
Write(`${state.work_dir}/workflow-state.json`, JSON.stringify(state, null, 2));
```

---

## Phase 3: Analyze Step (per step, via gemini)

```javascript
const manifest = JSON.parse(Read(`${stepDir}/artifacts-manifest.json`));

// Build artifact content (depth-dependent)
const maxLines = state.analysis_depth === 'quick' ? 0 : state.analysis_depth === 'deep' ? 300 : 150;
const artifactSummary = maxLines === 0
  ? manifest.artifacts.map(a => `- ${a.path} (${a.type})`).join('\n')
  : manifest.artifacts.map(a => {
      try { return `--- ${a.path} ---\n${Read(a.path, { limit: maxLines })}`; }
      catch { return `--- ${a.path} --- [unreadable]`; }
    }).join('\n\n');

// ★ Detect upstream plan artifact for type-aware evaluation
// Scans sandbox for plan.json/plan.yaml → extracts task type distribution
// Enables gemini to evaluate whether ALL task types produced outputs
const planTypeContext = (() => {
  try {
    const planFiles = Glob(`${state.sandbox_dir}/**/plan.json`);
    if (!planFiles.length) return '';
    const plan = JSON.parse(Read(planFiles[0]));
    if (!plan.tasks?.length) return '';
    const typeDist = {};
    plan.tasks.forEach(t => { typeDist[t.type] = (typeDist[t.type] || 0) + 1; });
    return `\nPLAN TASK TYPES: ${JSON.stringify(typeDist)}\nNOTE: Evaluate output completeness per task type. Missing types (e.g. plan has figure tasks but no .py/.png/.svg outputs) are critical gaps.`;
  } catch { return ''; }
})();

const analysisPrompt = `PURPOSE: Evaluate step "${step.name}" (${stepIdx + 1}/${state.steps.length}).
WORKFLOW: ${state.workflow_name} — ${state.project_scenario}
COMMAND: ${step.command}
TEST TASK: ${step.test_task || 'N/A'}
ACCEPTANCE CRITERIA: ${(step.acceptance_criteria || []).join('; ') || 'N/A'}
EXECUTION: ${step.execution.duration_ms}ms | ${manifest.artifacts.length} artifacts${planTypeContext}
ARTIFACTS:
${artifactSummary}

OUTPUT (strict JSON): { "quality_score": <0-100>, "requirement_match": { "pass": <bool>, "criteria_met": [], "criteria_missed": [] }, "execution_assessment": { "success": <bool>, "completeness": "" }, "artifact_assessment": { "count": <n>, "quality": "", "key_outputs": [], "missing_outputs": [] }, "type_coverage": { "plan_types": {}, "output_types": {}, "missing": [] }, "issues": [{ "severity": "critical|high|medium|low", "description": "", "suggestion": "" }], "optimization_opportunities": [{ "area": "", "impact": "high|medium|low", "description": "" }], "step_summary": "" }`;

let cmd = `ccw cli -p ${escapeForShell(analysisPrompt)} --tool gemini --mode analysis --rule analysis-review-code-quality`;
if (state.gemini_session_id) cmd += ` --resume ${state.gemini_session_id}`;
Bash({ command: cmd, run_in_background: true, timeout: 300000 });
// ■ STOP — wait for hook callback

// === Post-Analyze (after callback) ===
// Parse JSON result, capture gemini_session_id from [CCW_EXEC_ID=...] in stderr
Write(`${stepDir}/step-${stepIdx + 1}-analysis.json`, JSON.stringify(analysisResult, null, 2));

state.steps[stepIdx].analysis = {
  quality_score: analysisResult.quality_score,
  requirement_pass: analysisResult.requirement_match?.pass,
  issue_count: (analysisResult.issues || []).length
};
state.steps[stepIdx].status = 'completed';
state.current_step = stepIdx + 1;
state.current_phase = state.current_step < state.steps.length ? 'execute' : 'synthesize';
Write(`${state.work_dir}/workflow-state.json`, JSON.stringify(state, null, 2));

// Append to process log
Edit(`${state.work_dir}/process-log.md`, /* append step summary */);
```

---

## Phase 4: Synthesize (via gemini)

```javascript
const stepAnalyses = state.steps.map((s, i) => {
  try { return `### ${s.name}\n${Read(`${state.work_dir}/steps/step-${i + 1}/step-${i + 1}-analysis.json`)}`; }
  catch { return `### ${s.name}\n[Not available]`; }
}).join('\n\n---\n\n');

const scores = state.steps.map(s => s.analysis?.quality_score).filter(Boolean);
const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

const synthesisPrompt = `PURPOSE: Synthesize all step analyses into workflow assessment.
WORKFLOW: ${state.workflow_name} — ${state.project_scenario}
Steps: ${state.steps.length} | Avg Quality: ${avgScore}/100
STEP ANALYSES:
${stepAnalyses}

Evaluate: cross-step coherence, handoff quality, bottlenecks, redundancy.
TYPE COVERAGE: If any step involved plan→execute, check whether ALL task types in the plan produced corresponding outputs. Missing types (e.g. plan has figure/code tasks but sandbox has only .md files) reduce workflow_score by 10 per missing type.
OUTPUT (strict JSON): { "workflow_score": <0-100>, "coherence": { "score": <0-100>, "assessment": "", "gaps": [] }, "type_coverage": { "types_in_plan": [], "types_with_output": [], "missing_types": [], "coverage_rate": "<pct>" }, "bottlenecks": [{ "step": "", "issue": "", "suggestion": "" }], "per_step_improvements": [{ "step": "", "priority": "high|medium|low", "action": "" }], "workflow_improvements": [{ "area": "", "impact": "high|medium|low", "description": "" }], "summary": "" }`;

let cmd = `ccw cli -p ${escapeForShell(synthesisPrompt)} --tool gemini --mode analysis --rule analysis-review-architecture`;
if (state.gemini_session_id) cmd += ` --resume ${state.gemini_session_id}`;
Bash({ command: cmd, run_in_background: true, timeout: 300000 });
// ■ STOP — wait for hook callback → parse JSON → write synthesis.json
```

---

## Phase 5: Report

```javascript
const synthesis = JSON.parse(Read(`${state.work_dir}/synthesis.json`));
const avgScore = /* compute from steps */;

const report = `# Workflow Tune Report

| Field | Value |
|---|---|
| Workflow | ${state.workflow_name} |
| Test Project | ${state.project_scenario} |
| Score | ${synthesis.workflow_score || avgScore}/100 |
| Coherence | ${synthesis.coherence?.score || '-'}/100 |

## Step Results

| # | Step | Exec | Req | Quality | Issues |
|---|------|------|-----|---------|--------|
${state.steps.map((s, i) => `| ${i+1} | ${s.name} | ${s.execution?.success ? 'OK' : 'FAIL'} | ${s.analysis?.requirement_pass ? 'PASS' : 'FAIL'} | ${s.analysis?.quality_score || '-'} | ${s.analysis?.issue_count || 0} |`).join('\n')}

## High Priority Improvements
${(synthesis.per_step_improvements || []).filter(i => i.priority === 'high').map(i => `- **${i.step}**: ${i.action}`).join('\n') || 'None'}

## Bottlenecks
${(synthesis.bottlenecks || []).map(b => `- **${b.step}**: ${b.issue} → ${b.suggestion}`).join('\n') || 'None'}

## Summary
${synthesis.summary || 'N/A'}`;

Write(`${state.work_dir}/report.md`, report);
state.status = 'completed';
Write(`${state.work_dir}/workflow-state.json`, JSON.stringify(state, null, 2));
```

---

## State Machine

```
┌─────────────────────────────────────────────────────┐
│ current_step = N, current_phase = X                 │
├─────────────────────────────────────────────────────┤
│ execute  → ccw cli claude → STOP → callback         │
│         → collect artifacts → phase = 'analyze'     │
│ analyze  → ccw cli gemini → STOP → callback         │
│         → save analysis → step++ → phase = 'execute'│
│ (if last step) → phase = 'synthesize'               │
│ synthesize → ccw cli gemini → STOP → callback       │
│         → report → done                             │
└─────────────────────────────────────────────────────┘
```

## Error Handling

| Phase | Error | Recovery |
|-------|-------|----------|
| Execute | CLI timeout | Retry once, then mark failed, advance |
| Execute | Command not found | Skip step, note in process-log |
| Analyze | CLI fails | Retry without `--resume`, then skip |
| Synthesize | CLI fails | Generate report from step analyses only |
| Any | 3+ consecutive errors | Terminate, partial report |
