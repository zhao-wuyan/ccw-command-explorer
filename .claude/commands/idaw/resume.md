---
name: resume
description: Resume interrupted IDAW session from last checkpoint
argument-hint: "[-y|--yes] [session-id]"
allowed-tools: Skill(*), TodoWrite(*), AskUserQuestion(*), Read(*), Write(*), Bash(*), Glob(*)
---

# IDAW Resume Command (/idaw:resume)

## Auto Mode

When `--yes` or `-y`: Auto-skip interrupted task, continue with remaining.

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

## Implementation

### Phase 1: Find Resumable Session

```javascript
const args = $ARGUMENTS;
const autoYes = /(-y|--yes)/.test(args);
const targetSessionId = args.replace(/(-y|--yes)/g, '').trim();

let session = null;
let sessionDir = null;

if (targetSessionId) {
  // Load specific session
  sessionDir = `.workflow/.idaw/sessions/${targetSessionId}`;
  try {
    session = JSON.parse(Read(`${sessionDir}/session.json`));
  } catch {
    console.log(`Session "${targetSessionId}" not found.`);
    console.log('Use /idaw:status to list sessions, or /idaw:run to start a new one.');
    return;
  }
} else {
  // Find most recent running session
  const sessionFiles = Glob('.workflow/.idaw/sessions/IDA-*/session.json') || [];

  for (const f of sessionFiles) {
    try {
      const s = JSON.parse(Read(f));
      if (s.status === 'running') {
        session = s;
        sessionDir = f.replace(/\/session\.json$/, '').replace(/\\session\.json$/, '');
        break;
      }
    } catch {
      // Skip malformed
    }
  }

  if (!session) {
    console.log('No running sessions found to resume.');
    console.log('Use /idaw:run to start a new execution.');
    return;
  }
}

console.log(`Resuming session: ${session.session_id}`);
```

### Phase 2: Handle Interrupted Task

```javascript
// Find the task that was in_progress when interrupted
let currentTaskId = session.current_task;
let currentTask = null;

if (currentTaskId) {
  try {
    currentTask = JSON.parse(Read(`.workflow/.idaw/tasks/${currentTaskId}.json`));
  } catch {
    console.log(`Warning: Could not read task ${currentTaskId}`);
    currentTaskId = null;
  }
}

if (currentTask && currentTask.status === 'in_progress') {
  if (autoYes) {
    // Auto: skip interrupted task
    currentTask.status = 'skipped';
    currentTask.execution.error = 'Skipped on resume (auto mode)';
    currentTask.execution.completed_at = new Date().toISOString();
    currentTask.updated_at = new Date().toISOString();
    Write(`.workflow/.idaw/tasks/${currentTaskId}.json`, JSON.stringify(currentTask, null, 2));
    session.skipped.push(currentTaskId);
    console.log(`Skipped interrupted task: ${currentTaskId}`);
  } else {
    const answer = AskUserQuestion({
      questions: [{
        question: `Task ${currentTaskId} was interrupted: "${currentTask.title}". How to proceed?`,
        header: 'Resume',
        multiSelect: false,
        options: [
          { label: 'Retry', description: 'Reset to pending, re-execute from beginning' },
          { label: 'Skip', description: 'Mark as skipped, move to next task' }
        ]
      }]
    });

    if (answer.answers?.Resume === 'Skip') {
      currentTask.status = 'skipped';
      currentTask.execution.error = 'Skipped on resume (user choice)';
      currentTask.execution.completed_at = new Date().toISOString();
      currentTask.updated_at = new Date().toISOString();
      Write(`.workflow/.idaw/tasks/${currentTaskId}.json`, JSON.stringify(currentTask, null, 2));
      session.skipped.push(currentTaskId);
    } else {
      // Retry: reset to pending
      currentTask.status = 'pending';
      currentTask.execution.started_at = null;
      currentTask.execution.completed_at = null;
      currentTask.execution.skill_results = [];
      currentTask.execution.error = null;
      currentTask.updated_at = new Date().toISOString();
      Write(`.workflow/.idaw/tasks/${currentTaskId}.json`, JSON.stringify(currentTask, null, 2));
    }
  }
}
```

### Phase 3: Build Remaining Task Queue

```javascript
// Collect remaining tasks (pending, or the retried current task)
const allTaskIds = session.tasks;
const completedSet = new Set([...session.completed, ...session.failed, ...session.skipped]);

const remainingTasks = [];
for (const taskId of allTaskIds) {
  if (completedSet.has(taskId)) continue;
  try {
    const task = JSON.parse(Read(`.workflow/.idaw/tasks/${taskId}.json`));
    if (task.status === 'pending') {
      remainingTasks.push(task);
    }
  } catch {
    console.log(`Warning: Could not read task ${taskId}, skipping`);
  }
}

if (remainingTasks.length === 0) {
  console.log('No remaining tasks to execute. Session complete.');
  session.status = 'completed';
  session.current_task = null;
  session.updated_at = new Date().toISOString();
  Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));
  return;
}

// Sort: priority ASC, then ID ASC
remainingTasks.sort((a, b) => {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return a.id.localeCompare(b.id);
});

console.log(`Remaining tasks: ${remainingTasks.length}`);

// Append resume marker to progress.md
const progressFile = `${sessionDir}/progress.md`;
try {
  const currentProgress = Read(progressFile);
  Write(progressFile, currentProgress + `\n---\n**Resumed**: ${new Date().toISOString()}\n\n`);
} catch {
  Write(progressFile, `# IDAW Progress — ${session.session_id}\n\n---\n**Resumed**: ${new Date().toISOString()}\n\n`);
}

// Update TodoWrite
TodoWrite({
  todos: remainingTasks.map((t, i) => ({
    content: `IDAW:[${i + 1}/${remainingTasks.length}] ${t.title}`,
    status: i === 0 ? 'in_progress' : 'pending',
    activeForm: `Executing ${t.title}`
  }))
});
```

### Phase 4-6: Execute Remaining (reuse run.md main loop)

Execute remaining tasks using the same Phase 4-6 logic from `/idaw:run`:

```javascript
// Phase 4: Main Loop — identical to run.md Phase 4
for (let taskIdx = 0; taskIdx < remainingTasks.length; taskIdx++) {
  const task = remainingTasks[taskIdx];

  // Resolve skill chain
  const resolvedType = task.task_type || inferTaskType(task.title, task.description);
  const chain = task.skill_chain || SKILL_CHAIN_MAP[resolvedType] || SKILL_CHAIN_MAP['feature'];

  // Update task → in_progress
  task.status = 'in_progress';
  task.task_type = resolvedType;
  task.execution.started_at = new Date().toISOString();
  Write(`.workflow/.idaw/tasks/${task.id}.json`, JSON.stringify(task, null, 2));

  session.current_task = task.id;
  session.updated_at = new Date().toISOString();
  Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));

  console.log(`\n--- [${taskIdx + 1}/${remainingTasks.length}] ${task.id}: ${task.title} ---`);
  console.log(`Chain: ${chain.join(' → ')}`);

  // ━━━ Pre-Task CLI Context Analysis (for complex/bugfix tasks) ━━━
  if (['bugfix', 'bugfix-hotfix', 'feature-complex'].includes(resolvedType)) {
    console.log(`  Pre-analysis: gathering context for ${resolvedType} task...`);
    const affectedFiles = (task.context?.affected_files || []).join(', ');
    const preAnalysisPrompt = `PURPOSE: Pre-analyze codebase context for IDAW task before execution.
TASK: • Understand current state of: ${affectedFiles || 'files related to: ' + task.title} • Identify dependencies and risk areas • Note existing patterns to follow
MODE: analysis
CONTEXT: @**/*
EXPECTED: Brief context summary (affected modules, dependencies, risk areas) in 3-5 bullet points
CONSTRAINTS: Keep concise | Focus on execution-relevant context`;
    const preAnalysis = Bash(`ccw cli -p '${preAnalysisPrompt.replace(/'/g, "'\\''")}' --tool gemini --mode analysis 2>&1 || echo "Pre-analysis skipped"`);
    task.execution.skill_results.push({
      skill: 'cli-pre-analysis',
      status: 'completed',
      context_summary: preAnalysis?.substring(0, 500),
      timestamp: new Date().toISOString()
    });
  }

  // Execute skill chain
  let previousResult = null;
  let taskFailed = false;

  for (let skillIdx = 0; skillIdx < chain.length; skillIdx++) {
    const skillName = chain[skillIdx];
    const skillArgs = assembleSkillArgs(skillName, task, previousResult, autoYes, skillIdx === 0);

    console.log(`  [${skillIdx + 1}/${chain.length}] ${skillName}`);

    try {
      const result = Skill({ skill: skillName, args: skillArgs });
      previousResult = result;
      task.execution.skill_results.push({
        skill: skillName,
        status: 'completed',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // ━━━ CLI-Assisted Error Recovery ━━━
      console.log(`  Diagnosing failure: ${skillName}...`);
      const diagnosisPrompt = `PURPOSE: Diagnose why skill "${skillName}" failed during IDAW task execution.
TASK: • Analyze error: ${String(error).substring(0, 300)} • Check affected files: ${(task.context?.affected_files || []).join(', ') || 'unknown'} • Identify root cause • Suggest fix strategy
MODE: analysis
CONTEXT: @**/* | Memory: IDAW task ${task.id}: ${task.title}
EXPECTED: Root cause + actionable fix recommendation (1-2 sentences)
CONSTRAINTS: Focus on actionable diagnosis`;
      const diagnosisResult = Bash(`ccw cli -p '${diagnosisPrompt.replace(/'/g, "'\\''")}' --tool gemini --mode analysis --rule analysis-diagnose-bug-root-cause 2>&1 || echo "CLI diagnosis unavailable"`);

      task.execution.skill_results.push({
        skill: `cli-diagnosis:${skillName}`,
        status: 'completed',
        diagnosis: diagnosisResult?.substring(0, 500),
        timestamp: new Date().toISOString()
      });

      // Retry with diagnosis context
      console.log(`  Retry with diagnosis: ${skillName}`);
      try {
        const retryResult = Skill({ skill: skillName, args: skillArgs });
        previousResult = retryResult;
        task.execution.skill_results.push({
          skill: skillName,
          status: 'completed-retry-with-diagnosis',
          timestamp: new Date().toISOString()
        });
      } catch (retryError) {
        task.execution.skill_results.push({
          skill: skillName,
          status: 'failed',
          error: String(retryError).substring(0, 200),
          timestamp: new Date().toISOString()
        });

        if (autoYes) {
          taskFailed = true;
          break;
        }

        const answer = AskUserQuestion({
          questions: [{
            question: `${skillName} failed after CLI diagnosis + retry: ${String(retryError).substring(0, 100)}`,
            header: 'Error',
            multiSelect: false,
            options: [
              { label: 'Skip task', description: 'Mark as failed, continue' },
              { label: 'Abort', description: 'Stop run' }
            ]
          }]
        });

        if (answer.answers?.Error === 'Abort') {
          task.status = 'failed';
          task.execution.error = String(retryError).substring(0, 200);
          Write(`.workflow/.idaw/tasks/${task.id}.json`, JSON.stringify(task, null, 2));
          session.failed.push(task.id);
          session.status = 'failed';
          session.updated_at = new Date().toISOString();
          Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));
          return;
        }
        taskFailed = true;
        break;
      }
    }
  }

  // Phase 5: Checkpoint
  if (taskFailed) {
    task.status = 'failed';
    task.execution.error = 'Skill chain failed after retry';
    task.execution.completed_at = new Date().toISOString();
    session.failed.push(task.id);
  } else {
    // Git commit
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
    session.completed.push(task.id);
  }

  task.updated_at = new Date().toISOString();
  Write(`.workflow/.idaw/tasks/${task.id}.json`, JSON.stringify(task, null, 2));
  session.updated_at = new Date().toISOString();
  Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));

  // Append progress
  const chain_str = chain.join(' → ');
  const progressEntry = `## ${task.id} — ${task.title}\n- Status: ${task.status}\n- Chain: ${chain_str}\n- Commit: ${task.execution.git_commit || '-'}\n\n`;
  const currentProgress = Read(`${sessionDir}/progress.md`);
  Write(`${sessionDir}/progress.md`, currentProgress + progressEntry);
}

// Phase 6: Report
session.status = session.failed.length > 0 && session.completed.length === 0 ? 'failed' : 'completed';
session.current_task = null;
session.updated_at = new Date().toISOString();
Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));

const summary = `\n---\n## Summary (Resumed)\n- Completed: ${session.completed.length}\n- Failed: ${session.failed.length}\n- Skipped: ${session.skipped.length}\n`;
const finalProgress = Read(`${sessionDir}/progress.md`);
Write(`${sessionDir}/progress.md`, finalProgress + summary);

console.log('\n=== IDAW Resume Complete ===');
console.log(`Session: ${session.session_id}`);
console.log(`Completed: ${session.completed.length} | Failed: ${session.failed.length} | Skipped: ${session.skipped.length}`);
```

## Helper Functions

### assembleSkillArgs

```javascript
function assembleSkillArgs(skillName, task, previousResult, autoYes, isFirst) {
  let args = '';

  if (isFirst) {
    // Sanitize for shell safety
    const goal = `${task.title}\n${task.description}`
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')
      .replace(/`/g, '\\`');
    args = `"${goal}"`;
    if (task.task_type === 'bugfix-hotfix') args += ' --hotfix';
  } else if (previousResult?.session_id) {
    args = `--session="${previousResult.session_id}"`;
  }

  if (autoYes && !args.includes('-y') && !args.includes('--yes')) {
    args = args ? `${args} -y` : '-y';
  }

  return args;
}
```

## Examples

```bash
# Resume most recent running session (interactive)
/idaw:resume

# Resume specific session
/idaw:resume IDA-auth-fix-20260301

# Resume with auto mode (skip interrupted, continue)
/idaw:resume -y

# Resume specific session with auto mode
/idaw:resume -y IDA-auth-fix-20260301
```
