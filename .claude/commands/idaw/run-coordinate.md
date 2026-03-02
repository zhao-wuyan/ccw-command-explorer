---
name: run-coordinate
description: IDAW coordinator - execute task skill chains via external CLI with hook callbacks and git checkpoints
argument-hint: "[-y|--yes] [--task <id>[,<id>,...]] [--dry-run] [--tool <tool>]"
allowed-tools: Task(*), AskUserQuestion(*), Read(*), Write(*), Bash(*), Glob(*), Grep(*)
---

# IDAW Run Coordinate Command (/idaw:run-coordinate)

Coordinator variant of `/idaw:run`: external CLI execution with background tasks and hook callbacks.

**Execution Model**: `ccw cli -p "..." --tool <tool> --mode write` in background → hook callback → next step.

**vs `/idaw:run`**: Direct `Skill()` calls (blocking, main process) vs `ccw cli` (background, external process).

## When to Use

| Scenario | Use |
|----------|-----|
| Standard IDAW execution (main process) | `/idaw:run` |
| External CLI execution (background, hook-driven) | `/idaw:run-coordinate` |
| Need `claude` or `gemini` as execution tool | `/idaw:run-coordinate --tool claude` |
| Long-running tasks, avoid context window pressure | `/idaw:run-coordinate` |

## Skill Chain Mapping

```javascript
const SKILL_CHAIN_MAP = {
  'bugfix':          ['workflow-lite-plan', 'workflow-test-fix'],
  'bugfix-hotfix':   ['workflow-lite-plan'],
  'feature':         ['workflow-lite-plan', 'workflow-test-fix'],
  'feature-complex': ['workflow-plan', 'workflow-execute', 'workflow-test-fix'],
  'refactor':        ['workflow:refactor-cycle'],
  'tdd':             ['workflow-tdd-plan', 'workflow-execute'],
  'test':            ['workflow-test-fix'],
  'test-fix':        ['workflow-test-fix'],
  'review':          ['review-cycle'],
  'docs':            ['workflow-lite-plan']
};
```

## Task Type Inference

```javascript
function inferTaskType(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  if (/urgent|production|critical/.test(text) && /fix|bug/.test(text)) return 'bugfix-hotfix';
  if (/refactor|重构|tech.*debt/.test(text)) return 'refactor';
  if (/tdd|test-driven|test first/.test(text)) return 'tdd';
  if (/test fail|fix test|failing test/.test(text)) return 'test-fix';
  if (/generate test|写测试|add test/.test(text)) return 'test';
  if (/review|code review/.test(text)) return 'review';
  if (/docs|documentation|readme/.test(text)) return 'docs';
  if (/fix|bug|error|crash|fail/.test(text)) return 'bugfix';
  if (/complex|multi-module|architecture/.test(text)) return 'feature-complex';
  return 'feature';
}
```

## 6-Phase Execution (Coordinator Model)

### Phase 1: Load Tasks

```javascript
const args = $ARGUMENTS;
const autoYes = /(-y|--yes)/.test(args);
const dryRun = /--dry-run/.test(args);
const taskFilter = args.match(/--task\s+([\w,-]+)/)?.[1]?.split(',') || null;
const cliTool = args.match(/--tool\s+(\w+)/)?.[1] || 'claude';

// Load task files
const taskFiles = Glob('.workflow/.idaw/tasks/IDAW-*.json') || [];

if (taskFiles.length === 0) {
  console.log('No IDAW tasks found. Use /idaw:add to create tasks.');
  return;
}

// Parse and filter
let tasks = taskFiles.map(f => JSON.parse(Read(f)));

if (taskFilter) {
  tasks = tasks.filter(t => taskFilter.includes(t.id));
} else {
  tasks = tasks.filter(t => t.status === 'pending');
}

if (tasks.length === 0) {
  console.log('No pending tasks to execute. Use /idaw:add to add tasks or --task to specify IDs.');
  return;
}

// Sort: priority ASC (1=critical first), then ID ASC
tasks.sort((a, b) => {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return a.id.localeCompare(b.id);
});
```

### Phase 2: Session Setup

```javascript
// Generate session ID: IDA-{slug}-YYYYMMDD
const slug = tasks[0].title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .substring(0, 20)
  .replace(/-$/, '');
const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
let sessionId = `IDA-${slug}-${dateStr}`;

// Check collision
const existingSession = Glob(`.workflow/.idaw/sessions/${sessionId}/session.json`);
if (existingSession?.length > 0) {
  sessionId = `${sessionId}-2`;
}

const sessionDir = `.workflow/.idaw/sessions/${sessionId}`;
Bash(`mkdir -p "${sessionDir}"`);

const session = {
  session_id: sessionId,
  mode: 'coordinate',  // ★ Marks this as coordinator-mode session
  cli_tool: cliTool,
  status: 'running',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  tasks: tasks.map(t => t.id),
  current_task: null,
  current_skill_index: 0,
  completed: [],
  failed: [],
  skipped: [],
  prompts_used: []
};

Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));

// Initialize progress.md
const progressHeader = `# IDAW Progress — ${sessionId} (coordinate mode)\nStarted: ${session.created_at}\nCLI Tool: ${cliTool}\n\n`;
Write(`${sessionDir}/progress.md`, progressHeader);
```

### Phase 3: Startup Protocol

```javascript
// Check for existing running sessions
const runningSessions = Glob('.workflow/.idaw/sessions/IDA-*/session.json')
  ?.map(f => { try { return JSON.parse(Read(f)); } catch { return null; } })
  .filter(s => s && s.status === 'running' && s.session_id !== sessionId) || [];

if (runningSessions.length > 0 && !autoYes) {
  const answer = AskUserQuestion({
    questions: [{
      question: `Found running session: ${runningSessions[0].session_id}. How to proceed?`,
      header: 'Conflict',
      multiSelect: false,
      options: [
        { label: 'Resume existing', description: 'Use /idaw:resume instead' },
        { label: 'Start fresh', description: 'Continue with new session' },
        { label: 'Abort', description: 'Cancel this run' }
      ]
    }]
  });
  if (answer.answers?.Conflict === 'Resume existing') {
    console.log(`Use: /idaw:resume ${runningSessions[0].session_id}`);
    return;
  }
  if (answer.answers?.Conflict === 'Abort') return;
}

// Check git status
const gitStatus = Bash('git status --porcelain 2>/dev/null');
if (gitStatus?.trim() && !autoYes) {
  const answer = AskUserQuestion({
    questions: [{
      question: 'Working tree has uncommitted changes. How to proceed?',
      header: 'Git',
      multiSelect: false,
      options: [
        { label: 'Continue', description: 'Proceed with dirty tree' },
        { label: 'Stash', description: 'git stash before running' },
        { label: 'Abort', description: 'Stop and handle manually' }
      ]
    }]
  });
  if (answer.answers?.Git === 'Stash') Bash('git stash push -m "idaw-pre-run"');
  if (answer.answers?.Git === 'Abort') return;
}

// Dry run
if (dryRun) {
  console.log(`# Dry Run — ${sessionId} (coordinate mode, tool: ${cliTool})\n`);
  for (const task of tasks) {
    const taskType = task.task_type || inferTaskType(task.title, task.description);
    const chain = task.skill_chain || SKILL_CHAIN_MAP[taskType] || SKILL_CHAIN_MAP['feature'];
    console.log(`## ${task.id}: ${task.title}`);
    console.log(`  Type: ${taskType} | Priority: ${task.priority}`);
    console.log(`  Chain: ${chain.join(' → ')}`);
    console.log(`  CLI: ccw cli --tool ${cliTool} --mode write\n`);
  }
  console.log(`Total: ${tasks.length} tasks`);
  return;
}
```

### Phase 4: Launch First Task (then wait for hook)

```javascript
// Start with the first task, first skill
const firstTask = tasks[0];
const resolvedType = firstTask.task_type || inferTaskType(firstTask.title, firstTask.description);
const chain = firstTask.skill_chain || SKILL_CHAIN_MAP[resolvedType] || SKILL_CHAIN_MAP['feature'];

// Update task → in_progress
firstTask.status = 'in_progress';
firstTask.task_type = resolvedType;
firstTask.execution.started_at = new Date().toISOString();
Write(`.workflow/.idaw/tasks/${firstTask.id}.json`, JSON.stringify(firstTask, null, 2));

// Update session
session.current_task = firstTask.id;
session.current_skill_index = 0;
session.updated_at = new Date().toISOString();
Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));

// ━━━ Pre-Task CLI Context Analysis (for complex/bugfix tasks) ━━━
if (['bugfix', 'bugfix-hotfix', 'feature-complex'].includes(resolvedType)) {
  console.log(`Pre-analysis: gathering context for ${resolvedType} task...`);
  const affectedFiles = (firstTask.context?.affected_files || []).join(', ');
  const preAnalysisPrompt = `PURPOSE: Pre-analyze codebase context for IDAW task.
TASK: • Understand current state of: ${affectedFiles || 'files related to: ' + firstTask.title} • Identify dependencies and risk areas
MODE: analysis
CONTEXT: @**/*
EXPECTED: Brief context summary in 3-5 bullet points
CONSTRAINTS: Keep concise`;
  Bash(`ccw cli -p '${preAnalysisPrompt.replace(/'/g, "'\\''")}' --tool gemini --mode analysis 2>&1 || echo "Pre-analysis skipped"`);
}

// Assemble prompt for first skill
const skillName = chain[0];
const prompt = assembleCliPrompt(skillName, firstTask, null, autoYes);

session.prompts_used.push({
  task_id: firstTask.id,
  skill_index: 0,
  skill: skillName,
  prompt: prompt,
  timestamp: new Date().toISOString()
});
session.updated_at = new Date().toISOString();
Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));

// Launch via ccw cli in background
console.log(`[1/${tasks.length}] ${firstTask.id}: ${firstTask.title}`);
console.log(`  Chain: ${chain.join(' → ')}`);
console.log(`  Launching: ${skillName} via ccw cli --tool ${cliTool}`);

Bash(
  `ccw cli -p "${escapeForShell(prompt)}" --tool ${cliTool} --mode write`,
  { run_in_background: true }
);

// ★ STOP HERE — wait for hook callback
// Hook callback will trigger handleStepCompletion() below
```

### Phase 5: Hook Callback Handler (per-step completion)

```javascript
// Called by hook when background CLI completes
async function handleStepCompletion(sessionId, cliOutput) {
  const sessionDir = `.workflow/.idaw/sessions/${sessionId}`;
  const session = JSON.parse(Read(`${sessionDir}/session.json`));

  const taskId = session.current_task;
  const task = JSON.parse(Read(`.workflow/.idaw/tasks/${taskId}.json`));

  const resolvedType = task.task_type || inferTaskType(task.title, task.description);
  const chain = task.skill_chain || SKILL_CHAIN_MAP[resolvedType] || SKILL_CHAIN_MAP['feature'];
  const skillIdx = session.current_skill_index;
  const skillName = chain[skillIdx];

  // Parse CLI output for session ID
  const parsedOutput = parseCliOutput(cliOutput);

  // Record skill result
  task.execution.skill_results.push({
    skill: skillName,
    status: parsedOutput.success ? 'completed' : 'failed',
    session_id: parsedOutput.sessionId,
    timestamp: new Date().toISOString()
  });

  // ━━━ Handle failure with CLI diagnosis ━━━
  if (!parsedOutput.success) {
    console.log(`  ${skillName} failed. Running CLI diagnosis...`);
    const diagnosisPrompt = `PURPOSE: Diagnose why skill "${skillName}" failed during IDAW task.
TASK: • Analyze error output • Check affected files: ${(task.context?.affected_files || []).join(', ') || 'unknown'}
MODE: analysis
CONTEXT: @**/* | Memory: IDAW task ${task.id}: ${task.title}
EXPECTED: Root cause + fix recommendation
CONSTRAINTS: Actionable diagnosis`;
    Bash(`ccw cli -p '${diagnosisPrompt.replace(/'/g, "'\\''")}' --tool gemini --mode analysis --rule analysis-diagnose-bug-root-cause 2>&1 || true`);

    task.execution.skill_results.push({
      skill: `cli-diagnosis:${skillName}`,
      status: 'completed',
      timestamp: new Date().toISOString()
    });

    // Retry once
    console.log(`  Retrying: ${skillName}`);
    const retryPrompt = assembleCliPrompt(skillName, task, parsedOutput, true);
    session.prompts_used.push({
      task_id: taskId,
      skill_index: skillIdx,
      skill: `${skillName}-retry`,
      prompt: retryPrompt,
      timestamp: new Date().toISOString()
    });
    Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));
    Write(`.workflow/.idaw/tasks/${taskId}.json`, JSON.stringify(task, null, 2));

    Bash(
      `ccw cli -p "${escapeForShell(retryPrompt)}" --tool ${session.cli_tool} --mode write`,
      { run_in_background: true }
    );
    return; // Wait for retry hook
  }

  // ━━━ Skill succeeded — advance ━━━
  const nextSkillIdx = skillIdx + 1;

  if (nextSkillIdx < chain.length) {
    // More skills in this task's chain → launch next skill
    session.current_skill_index = nextSkillIdx;
    session.updated_at = new Date().toISOString();

    const nextSkill = chain[nextSkillIdx];
    const nextPrompt = assembleCliPrompt(nextSkill, task, parsedOutput, true);

    session.prompts_used.push({
      task_id: taskId,
      skill_index: nextSkillIdx,
      skill: nextSkill,
      prompt: nextPrompt,
      timestamp: new Date().toISOString()
    });
    Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));
    Write(`.workflow/.idaw/tasks/${taskId}.json`, JSON.stringify(task, null, 2));

    console.log(`  Next skill: ${nextSkill}`);
    Bash(
      `ccw cli -p "${escapeForShell(nextPrompt)}" --tool ${session.cli_tool} --mode write`,
      { run_in_background: true }
    );
    return; // Wait for next hook
  }

  // ━━━ Task chain complete — git checkpoint ━━━
  const commitMsg = `feat(idaw): ${task.title} [${task.id}]`;
  const diffCheck = Bash('git diff --stat HEAD 2>/dev/null || echo ""');
  const untrackedCheck = Bash('git ls-files --others --exclude-standard 2>/dev/null || echo ""');

  if (diffCheck?.trim() || untrackedCheck?.trim()) {
    Bash('git add -A');
    Bash(`git commit -m "$(cat <<'EOF'\n${commitMsg}\nEOF\n)"`);
    const commitHash = Bash('git rev-parse --short HEAD 2>/dev/null')?.trim();
    task.execution.git_commit = commitHash;
  } else {
    task.execution.git_commit = 'no-commit';
  }

  task.status = 'completed';
  task.execution.completed_at = new Date().toISOString();
  task.updated_at = new Date().toISOString();
  Write(`.workflow/.idaw/tasks/${taskId}.json`, JSON.stringify(task, null, 2));

  session.completed.push(taskId);

  // Append progress
  const progressEntry = `## ${task.id} — ${task.title}\n` +
    `- Status: completed\n` +
    `- Type: ${task.task_type}\n` +
    `- Chain: ${chain.join(' → ')}\n` +
    `- Commit: ${task.execution.git_commit || '-'}\n` +
    `- Mode: coordinate (${session.cli_tool})\n\n`;
  const currentProgress = Read(`${sessionDir}/progress.md`);
  Write(`${sessionDir}/progress.md`, currentProgress + progressEntry);

  // ━━━ Advance to next task ━━━
  const allTaskIds = session.tasks;
  const completedSet = new Set([...session.completed, ...session.failed, ...session.skipped]);
  const nextTaskId = allTaskIds.find(id => !completedSet.has(id));

  if (nextTaskId) {
    // Load next task
    const nextTask = JSON.parse(Read(`.workflow/.idaw/tasks/${nextTaskId}.json`));
    const nextType = nextTask.task_type || inferTaskType(nextTask.title, nextTask.description);
    const nextChain = nextTask.skill_chain || SKILL_CHAIN_MAP[nextType] || SKILL_CHAIN_MAP['feature'];

    nextTask.status = 'in_progress';
    nextTask.task_type = nextType;
    nextTask.execution.started_at = new Date().toISOString();
    Write(`.workflow/.idaw/tasks/${nextTaskId}.json`, JSON.stringify(nextTask, null, 2));

    session.current_task = nextTaskId;
    session.current_skill_index = 0;
    session.updated_at = new Date().toISOString();
    Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));

    // Pre-analysis for complex tasks
    if (['bugfix', 'bugfix-hotfix', 'feature-complex'].includes(nextType)) {
      const affectedFiles = (nextTask.context?.affected_files || []).join(', ');
      Bash(`ccw cli -p 'PURPOSE: Pre-analyze context for ${nextTask.title}. TASK: Check ${affectedFiles || "related files"}. MODE: analysis. EXPECTED: 3-5 bullet points.' --tool gemini --mode analysis 2>&1 || true`);
    }

    const nextSkillName = nextChain[0];
    const nextPrompt = assembleCliPrompt(nextSkillName, nextTask, null, true);

    session.prompts_used.push({
      task_id: nextTaskId,
      skill_index: 0,
      skill: nextSkillName,
      prompt: nextPrompt,
      timestamp: new Date().toISOString()
    });
    Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));

    const taskNum = session.completed.length + 1;
    const totalTasks = session.tasks.length;
    console.log(`\n[${taskNum}/${totalTasks}] ${nextTaskId}: ${nextTask.title}`);
    console.log(`  Chain: ${nextChain.join(' → ')}`);

    Bash(
      `ccw cli -p "${escapeForShell(nextPrompt)}" --tool ${session.cli_tool} --mode write`,
      { run_in_background: true }
    );
    return; // Wait for hook
  }

  // ━━━ All tasks complete — Phase 6: Report ━━━
  session.status = session.failed.length > 0 && session.completed.length === 0 ? 'failed' : 'completed';
  session.current_task = null;
  session.updated_at = new Date().toISOString();
  Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));

  const summary = `\n---\n## Summary (coordinate mode)\n` +
    `- CLI Tool: ${session.cli_tool}\n` +
    `- Completed: ${session.completed.length}\n` +
    `- Failed: ${session.failed.length}\n` +
    `- Skipped: ${session.skipped.length}\n` +
    `- Total: ${session.tasks.length}\n`;
  const finalProgress = Read(`${sessionDir}/progress.md`);
  Write(`${sessionDir}/progress.md`, finalProgress + summary);

  console.log('\n=== IDAW Coordinate Complete ===');
  console.log(`Session: ${sessionId}`);
  console.log(`Completed: ${session.completed.length}/${session.tasks.length}`);
  if (session.failed.length > 0) console.log(`Failed: ${session.failed.join(', ')}`);
}
```

## Helper Functions

### assembleCliPrompt

```javascript
function assembleCliPrompt(skillName, task, previousResult, autoYes) {
  let prompt = '';
  const yFlag = autoYes ? ' -y' : '';

  // Map skill to command invocation
  if (skillName === 'workflow-lite-plan') {
    const goal = sanitize(`${task.title}\n${task.description}`);
    prompt = `/workflow-lite-plan${yFlag} "${goal}"`;
    if (task.task_type === 'bugfix') prompt = `/workflow-lite-plan${yFlag} --bugfix "${goal}"`;
    if (task.task_type === 'bugfix-hotfix') prompt = `/workflow-lite-plan${yFlag} --hotfix "${goal}"`;

  } else if (skillName === 'workflow-plan') {
    prompt = `/workflow-plan${yFlag} "${sanitize(task.title)}"`;

  } else if (skillName === 'workflow-execute') {
    if (previousResult?.sessionId) {
      prompt = `/workflow-execute${yFlag} --resume-session="${previousResult.sessionId}"`;
    } else {
      prompt = `/workflow-execute${yFlag}`;
    }

  } else if (skillName === 'workflow-test-fix') {
    if (previousResult?.sessionId) {
      prompt = `/workflow-test-fix${yFlag} "${previousResult.sessionId}"`;
    } else {
      prompt = `/workflow-test-fix${yFlag} "${sanitize(task.title)}"`;
    }

  } else if (skillName === 'workflow-tdd-plan') {
    prompt = `/workflow-tdd-plan${yFlag} "${sanitize(task.title)}"`;

  } else if (skillName === 'workflow:refactor-cycle') {
    prompt = `/workflow:refactor-cycle${yFlag} "${sanitize(task.title)}"`;

  } else if (skillName === 'review-cycle') {
    if (previousResult?.sessionId) {
      prompt = `/review-cycle${yFlag} --session="${previousResult.sessionId}"`;
    } else {
      prompt = `/review-cycle${yFlag}`;
    }

  } else {
    // Generic fallback
    prompt = `/${skillName}${yFlag} "${sanitize(task.title)}"`;
  }

  // Append task context
  prompt += `\n\nTask: ${task.title}\nDescription: ${task.description}`;
  if (task.context?.affected_files?.length > 0) {
    prompt += `\nAffected files: ${task.context.affected_files.join(', ')}`;
  }
  if (task.context?.acceptance_criteria?.length > 0) {
    prompt += `\nAcceptance criteria: ${task.context.acceptance_criteria.join('; ')}`;
  }

  return prompt;
}
```

### sanitize & escapeForShell

```javascript
function sanitize(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
}

function escapeForShell(prompt) {
  return prompt.replace(/'/g, "'\\''");
}
```

### parseCliOutput

```javascript
function parseCliOutput(output) {
  // Extract session ID from CLI output (e.g., WFS-xxx, session-xxx)
  const sessionMatch = output.match(/(?:session|WFS|Session ID)[:\s]*([\w-]+)/i);
  const success = !/(?:error|failed|fatal)/i.test(output) || /completed|success/i.test(output);

  return {
    success,
    sessionId: sessionMatch?.[1] || null,
    raw: output?.substring(0, 500)
  };
}
```

## CLI-Assisted Analysis

Same as `/idaw:run` — integrated at two points:

### Pre-Task Context Analysis
For `bugfix`, `bugfix-hotfix`, `feature-complex` tasks: auto-invoke `ccw cli --tool gemini --mode analysis` before launching skill chain.

### Error Recovery with CLI Diagnosis
When a skill's CLI execution fails: invoke diagnosis → retry once → if still fails, mark failed and advance.

```
Skill CLI fails → CLI diagnosis (gemini) → Retry CLI → Still fails → mark failed → next task
```

## State Flow

```
Phase 4: Launch first skill
    ↓
  ccw cli --tool claude --mode write (background)
    ↓
  ★ STOP — wait for hook callback
    ↓
Phase 5: handleStepCompletion()
    ├─ Skill succeeded + more in chain → launch next skill → STOP
    ├─ Skill succeeded + chain complete → git checkpoint → next task → STOP
    ├─ Skill failed → CLI diagnosis → retry → STOP
    └─ All tasks done → Phase 6: Report
```

## Session State (session.json)

```json
{
  "session_id": "IDA-fix-login-20260301",
  "mode": "coordinate",
  "cli_tool": "claude",
  "status": "running|waiting|completed|failed",
  "created_at": "ISO",
  "updated_at": "ISO",
  "tasks": ["IDAW-001", "IDAW-002"],
  "current_task": "IDAW-001",
  "current_skill_index": 0,
  "completed": [],
  "failed": [],
  "skipped": [],
  "prompts_used": [
    {
      "task_id": "IDAW-001",
      "skill_index": 0,
      "skill": "workflow-lite-plan",
      "prompt": "/workflow-lite-plan -y \"Fix login timeout\"",
      "timestamp": "ISO"
    }
  ]
}
```

## Differences from /idaw:run

| Aspect | /idaw:run | /idaw:run-coordinate |
|--------|-----------|---------------------|
| Execution | `Skill()` blocking in main process | `ccw cli` background + hook callback |
| Context window | Shared (each skill uses main context) | Isolated (each CLI gets fresh context) |
| Concurrency | Sequential blocking | Sequential non-blocking (hook-driven) |
| State tracking | session.json + task.json | session.json + task.json + prompts_used |
| Tool selection | N/A (Skill native) | `--tool claude\|gemini\|qwen` |
| Resume | Via `/idaw:resume` (same) | Via `/idaw:resume` (same, detects mode) |
| Best for | Short chains, interactive | Long chains, autonomous, context-heavy |

## Examples

```bash
# Execute all pending tasks via claude CLI
/idaw:run-coordinate -y

# Use specific CLI tool
/idaw:run-coordinate -y --tool gemini

# Execute specific tasks
/idaw:run-coordinate --task IDAW-001,IDAW-003 --tool claude

# Dry run (show plan without executing)
/idaw:run-coordinate --dry-run

# Interactive mode
/idaw:run-coordinate
```
