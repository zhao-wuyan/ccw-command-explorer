---
name: add
description: Add IDAW tasks - manual creation or import from ccw issue
argument-hint: "[-y|--yes] [--from-issue <id>[,<id>,...]] \"description\" [--type <task_type>] [--priority <1-5>]"
allowed-tools: AskUserQuestion(*), Read(*), Bash(*), Write(*), Glob(*)
---

# IDAW Add Command (/idaw:add)

## Auto Mode

When `--yes` or `-y`: Skip clarification questions, create task with inferred details.

## IDAW Task Schema

```json
{
  "id": "IDAW-001",
  "title": "string",
  "description": "string",
  "status": "pending",
  "priority": 2,
  "task_type": null,
  "skill_chain": null,
  "context": {
    "affected_files": [],
    "acceptance_criteria": [],
    "constraints": [],
    "references": []
  },
  "source": {
    "type": "manual|import-issue",
    "issue_id": null,
    "issue_snapshot": null
  },
  "execution": {
    "session_id": null,
    "started_at": null,
    "completed_at": null,
    "skill_results": [],
    "git_commit": null,
    "error": null
  },
  "created_at": "ISO",
  "updated_at": "ISO"
}
```

**Valid task_type values**: `bugfix|bugfix-hotfix|feature|feature-complex|refactor|tdd|test|test-fix|review|docs`

## Implementation

### Phase 1: Parse Arguments

```javascript
const args = $ARGUMENTS;
const autoYes = /(-y|--yes)\b/.test(args);
const fromIssue = args.match(/--from-issue\s+([\w,-]+)/)?.[1];
const typeFlag = args.match(/--type\s+([\w-]+)/)?.[1];
const priorityFlag = args.match(/--priority\s+(\d)/)?.[1];

// Extract description: content inside quotes (preferred), or fallback to stripping flags
const quotedMatch = args.match(/(?:^|\s)["']([^"']+)["']/);
const description = quotedMatch
  ? quotedMatch[1].trim()
  : args.replace(/(-y|--yes|--from-issue\s+[\w,-]+|--type\s+[\w-]+|--priority\s+\d)/g, '').trim();
```

### Phase 2: Route — Import or Manual

```
--from-issue present?
  ├─ YES → Import Mode (Phase 3A)
  └─ NO  → Manual Mode (Phase 3B)
```

### Phase 3A: Import Mode (from ccw issue)

```javascript
const issueIds = fromIssue.split(',');

// Fetch all issues once (outside loop)
let issues = [];
try {
  const issueJson = Bash(`ccw issue list --json`);
  issues = JSON.parse(issueJson).issues || [];
} catch (e) {
  console.log(`Error fetching CCW issues: ${e.message || e}`);
  console.log('Ensure ccw is installed and issues exist. Use /issue:new to create issues first.');
  return;
}

for (const issueId of issueIds) {
  // 1. Find issue data
  const issue = issues.find(i => i.id === issueId.trim());
  if (!issue) {
    console.log(`Warning: Issue ${issueId} not found, skipping`);
    continue;
  }

  // 2. Check duplicate (same issue_id already imported)
  const existing = Glob('.workflow/.idaw/tasks/IDAW-*.json');
  for (const f of existing) {
    const data = JSON.parse(Read(f));
    if (data.source?.issue_id === issueId.trim()) {
      console.log(`Warning: Issue ${issueId} already imported as ${data.id}, skipping`);
      continue; // skip to next issue
    }
  }

  // 3. Generate next IDAW ID
  const nextId = generateNextId();

  // 4. Map issue → IDAW task
  const task = {
    id: nextId,
    title: issue.title,
    description: issue.context || issue.title,
    status: 'pending',
    priority: parseInt(priorityFlag) || issue.priority || 3,
    task_type: typeFlag || inferTaskType(issue.title, issue.context || ''),
    skill_chain: null,
    context: {
      affected_files: issue.affected_components || [],
      acceptance_criteria: [],
      constraints: [],
      references: issue.source_url ? [issue.source_url] : []
    },
    source: {
      type: 'import-issue',
      issue_id: issue.id,
      issue_snapshot: {
        id: issue.id,
        title: issue.title,
        status: issue.status,
        context: issue.context,
        priority: issue.priority,
        created_at: issue.created_at
      }
    },
    execution: {
      session_id: null,
      started_at: null,
      completed_at: null,
      skill_results: [],
      git_commit: null,
      error: null
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 5. Write task file
  Bash('mkdir -p .workflow/.idaw/tasks');
  Write(`.workflow/.idaw/tasks/${nextId}.json`, JSON.stringify(task, null, 2));
  console.log(`Created ${nextId} from issue ${issueId}: ${issue.title}`);
}
```

### Phase 3B: Manual Mode

```javascript
// 1. Validate description
if (!description && !autoYes) {
  const answer = AskUserQuestion({
    questions: [{
      question: 'Please provide a task description:',
      header: 'Task',
      multiSelect: false,
      options: [
        { label: 'Provide description', description: 'What needs to be done?' }
      ]
    }]
  });
  // Use custom text from "Other"
  description = answer.customText || '';
}

if (!description) {
  console.log('Error: No description provided. Usage: /idaw:add "task description"');
  return;
}

// 2. Generate next IDAW ID
const nextId = generateNextId();

// 3. Build title from first sentence
const title = description.split(/[.\n]/)[0].substring(0, 80).trim();

// 4. Determine task_type
const taskType = typeFlag || null; // null → inferred at run time

// 5. Create task
const task = {
  id: nextId,
  title: title,
  description: description,
  status: 'pending',
  priority: parseInt(priorityFlag) || 3,
  task_type: taskType,
  skill_chain: null,
  context: {
    affected_files: [],
    acceptance_criteria: [],
    constraints: [],
    references: []
  },
  source: {
    type: 'manual',
    issue_id: null,
    issue_snapshot: null
  },
  execution: {
    session_id: null,
    started_at: null,
    completed_at: null,
    skill_results: [],
    git_commit: null,
    error: null
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

Bash('mkdir -p .workflow/.idaw/tasks');
Write(`.workflow/.idaw/tasks/${nextId}.json`, JSON.stringify(task, null, 2));
console.log(`Created ${nextId}: ${title}`);
```

## Helper Functions

### ID Generation

```javascript
function generateNextId() {
  const files = Glob('.workflow/.idaw/tasks/IDAW-*.json') || [];
  if (files.length === 0) return 'IDAW-001';

  const maxNum = files
    .map(f => parseInt(f.match(/IDAW-(\d+)/)?.[1] || '0'))
    .reduce((max, n) => Math.max(max, n), 0);

  return `IDAW-${String(maxNum + 1).padStart(3, '0')}`;
}
```

### Task Type Inference (deferred — used at run time if task_type is null)

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

## Examples

```bash
# Manual creation
/idaw:add "Fix login timeout bug" --type bugfix --priority 2
/idaw:add "Add rate limiting to API endpoints" --priority 1
/idaw:add "Refactor auth module to use strategy pattern"

# Import from ccw issue
/idaw:add --from-issue ISS-20260128-001
/idaw:add --from-issue ISS-20260128-001,ISS-20260128-002 --priority 1

# Auto mode (skip clarification)
/idaw:add -y "Quick fix for typo in header"
```

## Output

```
Created IDAW-001: Fix login timeout bug
  Type: bugfix | Priority: 2 | Source: manual
  → Next: /idaw:run or /idaw:status
```
