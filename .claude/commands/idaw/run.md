---
name: run
description: IDAW orchestrator - execute task skill chains serially with git checkpoints
argument-hint: "[-y|--yes] [--task <id>[,<id>,...]] [--dry-run]"
allowed-tools: Skill(*), TodoWrite(*), AskUserQuestion(*), Read(*), Write(*), Bash(*), Glob(*)
---

# IDAW Run Command (/idaw:run)

## Auto Mode

When `--yes` or `-y`: Skip all confirmations, auto-skip on failure, proceed with dirty git.

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

## 6-Phase Execution

### Phase 1: Load Tasks

```javascript
const args = $ARGUMENTS;
const autoYes = /(-y|--yes)/.test(args);
const dryRun = /--dry-run/.test(args);
const taskFilter = args.match(/--task\s+([\w,-]+)/)?.[1]?.split(',') || null;

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
  status: 'running',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  tasks: tasks.map(t => t.id),
  current_task: null,
  completed: [],
  failed: [],
  skipped: []
};

Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));

// Initialize progress.md
const progressHeader = `# IDAW Progress — ${sessionId}\nStarted: ${session.created_at}\n\n`;
Write(`${sessionDir}/progress.md`, progressHeader);

// TodoWrite
TodoWrite({
  todos: tasks.map((t, i) => ({
    content: `IDAW:[${i + 1}/${tasks.length}] ${t.title}`,
    status: i === 0 ? 'in_progress' : 'pending',
    activeForm: `Executing ${t.title}`
  }))
});
```

### Phase 3: Startup Protocol

```javascript
// Check for existing running sessions
const runningSessions = Glob('.workflow/.idaw/sessions/IDA-*/session.json')
  ?.map(f => JSON.parse(Read(f)))
  .filter(s => s.status === 'running' && s.session_id !== sessionId) || [];

if (runningSessions.length > 0) {
  if (!autoYes) {
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
  // autoYes or "Start fresh": proceed
}

// Check git status
const gitStatus = Bash('git status --porcelain 2>/dev/null');
if (gitStatus?.trim()) {
  if (!autoYes) {
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
    if (answer.answers?.Git === 'Stash') {
      Bash('git stash push -m "idaw-pre-run"');
    }
    if (answer.answers?.Git === 'Abort') return;
  }
  // autoYes: proceed silently
}

// Dry run: show plan and exit
if (dryRun) {
  console.log(`# Dry Run — ${sessionId}\n`);
  for (const task of tasks) {
    const taskType = task.task_type || inferTaskType(task.title, task.description);
    const chain = task.skill_chain || SKILL_CHAIN_MAP[taskType] || SKILL_CHAIN_MAP['feature'];
    console.log(`## ${task.id}: ${task.title}`);
    console.log(`  Type: ${taskType} | Priority: ${task.priority}`);
    console.log(`  Chain: ${chain.join(' → ')}\n`);
  }
  console.log(`Total: ${tasks.length} tasks`);
  return;
}
```

### Phase 4: Main Loop (serial, one task at a time)

```javascript
for (let taskIdx = 0; taskIdx < tasks.length; taskIdx++) {
  const task = tasks[taskIdx];

  // Skip completed/failed/skipped
  if (['completed', 'failed', 'skipped'].includes(task.status)) continue;

  // Resolve skill chain
  const resolvedType = task.task_type || inferTaskType(task.title, task.description);
  const chain = task.skill_chain || SKILL_CHAIN_MAP[resolvedType] || SKILL_CHAIN_MAP['feature'];

  // Update task status → in_progress
  task.status = 'in_progress';
  task.task_type = resolvedType; // persist inferred type
  task.execution.started_at = new Date().toISOString();
  Write(`.workflow/.idaw/tasks/${task.id}.json`, JSON.stringify(task, null, 2));

  // Update session
  session.current_task = task.id;
  session.updated_at = new Date().toISOString();
  Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));

  console.log(`\n--- [${taskIdx + 1}/${tasks.length}] ${task.id}: ${task.title} ---`);
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

  // Execute each skill in chain
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
      // Step 1: Invoke CLI diagnosis (auto-invoke trigger: self-repair fails)
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

      // Step 2: Retry with diagnosis context
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
        // Step 3: Failed after CLI-assisted retry
        task.execution.skill_results.push({
          skill: skillName,
          status: 'failed',
          error: String(retryError).substring(0, 200),
          timestamp: new Date().toISOString()
        });

        if (autoYes) {
          taskFailed = true;
          break;
        } else {
          const answer = AskUserQuestion({
            questions: [{
              question: `${skillName} failed after CLI diagnosis + retry: ${String(retryError).substring(0, 100)}. How to proceed?`,
              header: 'Error',
              multiSelect: false,
              options: [
                { label: 'Skip task', description: 'Mark task as failed, continue to next' },
                { label: 'Abort', description: 'Stop entire run' }
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
  }

  // Phase 5: Checkpoint (per task) — inline
  if (taskFailed) {
    task.status = 'failed';
    task.execution.error = 'Skill chain failed after retry';
    task.execution.completed_at = new Date().toISOString();
    session.failed.push(task.id);
  } else {
    // Git commit checkpoint
    const commitMsg = `feat(idaw): ${task.title} [${task.id}]`;
    const diffCheck = Bash('git diff --stat HEAD 2>/dev/null || echo ""');
    const untrackedCheck = Bash('git ls-files --others --exclude-standard 2>/dev/null || echo ""');

    if (diffCheck?.trim() || untrackedCheck?.trim()) {
      Bash('git add -A');
      const commitResult = Bash(`git commit -m "$(cat <<'EOF'\n${commitMsg}\nEOF\n)"`);
      const commitHash = Bash('git rev-parse --short HEAD 2>/dev/null')?.trim();
      task.execution.git_commit = commitHash;
    } else {
      task.execution.git_commit = 'no-commit';
    }

    task.status = 'completed';
    task.execution.completed_at = new Date().toISOString();
    session.completed.push(task.id);
  }

  // Write task + session state
  task.updated_at = new Date().toISOString();
  Write(`.workflow/.idaw/tasks/${task.id}.json`, JSON.stringify(task, null, 2));

  session.updated_at = new Date().toISOString();
  Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));

  // Append to progress.md
  const duration = task.execution.started_at && task.execution.completed_at
    ? formatDuration(new Date(task.execution.completed_at) - new Date(task.execution.started_at))
    : 'unknown';

  const progressEntry = `## ${task.id} — ${task.title}\n` +
    `- Status: ${task.status}\n` +
    `- Type: ${task.task_type}\n` +
    `- Chain: ${chain.join(' → ')}\n` +
    `- Commit: ${task.execution.git_commit || '-'}\n` +
    `- Duration: ${duration}\n\n`;

  const currentProgress = Read(`${sessionDir}/progress.md`);
  Write(`${sessionDir}/progress.md`, currentProgress + progressEntry);

  // Update TodoWrite
  if (taskIdx + 1 < tasks.length) {
    TodoWrite({
      todos: tasks.map((t, i) => ({
        content: `IDAW:[${i + 1}/${tasks.length}] ${t.title}`,
        status: i < taskIdx + 1 ? 'completed' : (i === taskIdx + 1 ? 'in_progress' : 'pending'),
        activeForm: `Executing ${t.title}`
      }))
    });
  }
}
```

### Phase 6: Report

```javascript
session.status = session.failed.length > 0 && session.completed.length === 0 ? 'failed' : 'completed';
session.current_task = null;
session.updated_at = new Date().toISOString();
Write(`${sessionDir}/session.json`, JSON.stringify(session, null, 2));

// Final progress summary
const summary = `\n---\n## Summary\n` +
  `- Completed: ${session.completed.length}\n` +
  `- Failed: ${session.failed.length}\n` +
  `- Skipped: ${session.skipped.length}\n` +
  `- Total: ${tasks.length}\n`;

const finalProgress = Read(`${sessionDir}/progress.md`);
Write(`${sessionDir}/progress.md`, finalProgress + summary);

// Display report
console.log('\n=== IDAW Run Complete ===');
console.log(`Session: ${sessionId}`);
console.log(`Completed: ${session.completed.length}/${tasks.length}`);
if (session.failed.length > 0) console.log(`Failed: ${session.failed.join(', ')}`);
if (session.skipped.length > 0) console.log(`Skipped: ${session.skipped.join(', ')}`);

// List git commits
for (const taskId of session.completed) {
  const t = JSON.parse(Read(`.workflow/.idaw/tasks/${taskId}.json`));
  if (t.execution.git_commit && t.execution.git_commit !== 'no-commit') {
    console.log(`  ${t.execution.git_commit} ${t.title}`);
  }
}
```

## Helper Functions

### assembleSkillArgs

```javascript
function assembleSkillArgs(skillName, task, previousResult, autoYes, isFirst) {
  let args = '';

  if (isFirst) {
    // First skill: pass task goal — sanitize for shell safety
    const goal = `${task.title}\n${task.description}`
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')
      .replace(/`/g, '\\`');
    args = `"${goal}"`;

    // bugfix-hotfix: add --hotfix
    if (task.task_type === 'bugfix-hotfix') {
      args += ' --hotfix';
    }
  } else if (previousResult?.session_id) {
    // Subsequent skills: chain session
    args = `--session="${previousResult.session_id}"`;
  }

  // Propagate -y
  if (autoYes && !args.includes('-y') && !args.includes('--yes')) {
    args = args ? `${args} -y` : '-y';
  }

  return args;
}
```

### formatDuration

```javascript
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${seconds}s`;
}
```

## CLI-Assisted Analysis

IDAW integrates `ccw cli` (Gemini) for intelligent analysis at two key points:

### Pre-Task Context Analysis

For `bugfix`, `bugfix-hotfix`, and `feature-complex` tasks, IDAW automatically invokes CLI analysis **before** executing the skill chain to gather codebase context:

```
Task starts → CLI pre-analysis (gemini) → Context gathered → Skill chain executes
```

- Identifies dependencies and risk areas
- Notes existing patterns to follow
- Results stored in `task.execution.skill_results` as `cli-pre-analysis`

### Error Recovery with CLI Diagnosis

When a skill fails, instead of blind retry, IDAW uses CLI-assisted diagnosis:

```
Skill fails → CLI diagnosis (gemini, analysis-diagnose-bug-root-cause)
           → Root cause identified → Retry with diagnosis context
           → Still fails → Skip (autoYes) or Ask user (interactive)
```

- Uses `--rule analysis-diagnose-bug-root-cause` template
- Diagnosis results stored in `task.execution.skill_results` as `cli-diagnosis:{skill}`
- Follows CLAUDE.md auto-invoke trigger pattern: "self-repair fails → invoke CLI analysis"

### Execution Flow (with CLI analysis)

```
Phase 4 Main Loop (per task):
  ├─ [bugfix/complex only] CLI pre-analysis → context summary
  ├─ Skill 1: execute
  │   ├─ Success → next skill
  │   └─ Failure → CLI diagnosis → retry → success/fail
  ├─ Skill 2: execute ...
  └─ Phase 5: git checkpoint
```

## Examples

```bash
# Execute all pending tasks
/idaw:run -y

# Execute specific tasks
/idaw:run --task IDAW-001,IDAW-003

# Dry run (show plan without executing)
/idaw:run --dry-run

# Interactive mode (confirm at each step)
/idaw:run
```
