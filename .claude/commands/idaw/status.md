---
name: status
description: View IDAW task and session progress
argument-hint: "[session-id]"
allowed-tools: Read(*), Glob(*), Bash(*)
---

# IDAW Status Command (/idaw:status)

## Overview

Read-only command to view IDAW task queue and execution session progress.

## Implementation

### Phase 1: Determine View Mode

```javascript
const sessionId = $ARGUMENTS?.trim();

if (sessionId) {
  // Specific session view
  showSession(sessionId);
} else {
  // Overview: pending tasks + latest session
  showOverview();
}
```

### Phase 2: Show Overview

```javascript
function showOverview() {
  // 1. Load all tasks
  const taskFiles = Glob('.workflow/.idaw/tasks/IDAW-*.json') || [];

  if (taskFiles.length === 0) {
    console.log('No IDAW tasks found. Use /idaw:add to create tasks.');
    return;
  }

  const tasks = taskFiles.map(f => JSON.parse(Read(f)));

  // 2. Group by status
  const byStatus = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed'),
    failed: tasks.filter(t => t.status === 'failed'),
    skipped: tasks.filter(t => t.status === 'skipped')
  };

  // 3. Display task summary table
  console.log('# IDAW Tasks\n');
  console.log('| ID | Title | Type | Priority | Status |');
  console.log('|----|-------|------|----------|--------|');

  // Sort: priority ASC, then ID ASC
  const sorted = [...tasks].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.id.localeCompare(b.id);
  });

  for (const t of sorted) {
    const type = t.task_type || '(infer)';
    console.log(`| ${t.id} | ${t.title.substring(0, 40)} | ${type} | ${t.priority} | ${t.status} |`);
  }

  console.log(`\nTotal: ${tasks.length} | Pending: ${byStatus.pending.length} | Completed: ${byStatus.completed.length} | Failed: ${byStatus.failed.length}`);

  // 4. Show latest session (if any)
  const sessionDirs = Glob('.workflow/.idaw/sessions/IDA-*/session.json') || [];
  if (sessionDirs.length > 0) {
    // Sort by modification time (newest first) — Glob returns sorted by mtime
    const latestSessionFile = sessionDirs[0];
    const session = JSON.parse(Read(latestSessionFile));
    console.log(`\n## Latest Session: ${session.session_id}`);
    console.log(`Status: ${session.status} | Tasks: ${session.tasks?.length || 0}`);
    console.log(`Completed: ${session.completed?.length || 0} | Failed: ${session.failed?.length || 0} | Skipped: ${session.skipped?.length || 0}`);
  }
}
```

### Phase 3: Show Specific Session

```javascript
function showSession(sessionId) {
  const sessionFile = `.workflow/.idaw/sessions/${sessionId}/session.json`;
  const progressFile = `.workflow/.idaw/sessions/${sessionId}/progress.md`;

  // Try reading session
  try {
    const session = JSON.parse(Read(sessionFile));

    console.log(`# IDAW Session: ${session.session_id}\n`);
    console.log(`Status: ${session.status}`);
    console.log(`Created: ${session.created_at}`);
    console.log(`Updated: ${session.updated_at}`);
    console.log(`Current Task: ${session.current_task || 'none'}\n`);

    // Task detail table
    console.log('| ID | Title | Status | Commit |');
    console.log('|----|-------|--------|--------|');

    for (const taskId of session.tasks) {
      const taskFile = `.workflow/.idaw/tasks/${taskId}.json`;
      try {
        const task = JSON.parse(Read(taskFile));
        const commit = task.execution?.git_commit?.substring(0, 7) || '-';
        console.log(`| ${task.id} | ${task.title.substring(0, 40)} | ${task.status} | ${commit} |`);
      } catch {
        console.log(`| ${taskId} | (file not found) | unknown | - |`);
      }
    }

    console.log(`\nCompleted: ${session.completed?.length || 0} | Failed: ${session.failed?.length || 0} | Skipped: ${session.skipped?.length || 0}`);

    // Show progress.md if exists
    try {
      const progress = Read(progressFile);
      console.log('\n---\n');
      console.log(progress);
    } catch {
      // No progress file yet
    }

  } catch {
    // Session not found — try listing all sessions
    console.log(`Session "${sessionId}" not found.\n`);
    listSessions();
  }
}
```

### Phase 4: List All Sessions

```javascript
function listSessions() {
  const sessionFiles = Glob('.workflow/.idaw/sessions/IDA-*/session.json') || [];

  if (sessionFiles.length === 0) {
    console.log('No IDAW sessions found. Use /idaw:run to start execution.');
    return;
  }

  console.log('# IDAW Sessions\n');
  console.log('| Session ID | Status | Tasks | Completed | Failed |');
  console.log('|------------|--------|-------|-----------|--------|');

  for (const f of sessionFiles) {
    try {
      const session = JSON.parse(Read(f));
      console.log(`| ${session.session_id} | ${session.status} | ${session.tasks?.length || 0} | ${session.completed?.length || 0} | ${session.failed?.length || 0} |`);
    } catch {
      // Skip malformed
    }
  }

  console.log('\nUse /idaw:status <session-id> for details.');
}
```

## Examples

```bash
# Show overview (pending tasks + latest session)
/idaw:status

# Show specific session details
/idaw:status IDA-auth-fix-20260301

# Output example:
# IDAW Tasks
#
# | ID       | Title                              | Type   | Priority | Status    |
# |----------|------------------------------------|--------|----------|-----------|
# | IDAW-001 | Fix auth token refresh             | bugfix | 1        | completed |
# | IDAW-002 | Add rate limiting                  | feature| 2        | pending   |
# | IDAW-003 | Refactor payment module            | refact | 3        | pending   |
#
# Total: 3 | Pending: 2 | Completed: 1 | Failed: 0
```
