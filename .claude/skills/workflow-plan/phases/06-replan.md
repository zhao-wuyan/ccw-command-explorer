# Phase 6: Interactive Replan

Interactive workflow replanning with session-level artifact updates and boundary clarification through guided questioning.

## Objective

- Intelligently replan workflow sessions or individual tasks
- Interactive clarification to define modification boundaries
- Impact analysis with automatic detection of affected files and dependencies
- Backup management with restore capability
- Comprehensive artifact updates (IMPL_PLAN.md, TODO_LIST.md, task JSONs)

## Entry Point

Triggered via Replan Mode routing in SKILL.md.

## Input

Replan accepts requirements text as arguments. Session and mode preferences are provided via `workflowPreferences` context variables (set by SKILL.md via AskUserQuestion).

```
Input: requirements text (positional argument)
Context: workflowPreferences.autoYes, workflowPreferences.interactive
Session: auto-detected from .workflow/active/ or specified via workflowPreferences.sessionId
```

### Task Replan Mode

```text
# Direct task update
Replan input: IMPL-1 "requirements text"

# Interactive mode (workflowPreferences.interactive = true)
Replan input: IMPL-1 "requirements text"
```

## Language Convention

Interactive question options use Chinese (user-facing UI text) with English identifiers in parentheses. Structural content uses English. This is intentional for Chinese-language workflows.

## Execution

### Input Parsing

**Parse input**:
```javascript
// Reference workflowPreferences (set by SKILL.md via AskUserQuestion)
const sessionFlag = workflowPreferences.sessionId
const interactive = workflowPreferences.interactive
const taskIdMatch = $ARGUMENTS.match(/\b(IMPL-\d+(?:\.\d+)?)\b/)
const taskId = taskIdMatch?.[1]
```

### Step 6.1: Mode Detection & Session Discovery

**Process**:
1. **Detect Operation Mode**:
   - Check if task ID provided (IMPL-N or IMPL-N.M format) → Task mode
   - Otherwise → Session mode

2. **Discover/Validate Session**:
   - Use `--session` flag if provided
   - Otherwise auto-detect from `.workflow/active/`
   - Validate session exists

3. **Load Session Context**:
   - Read `workflow-session.json`
   - List existing tasks
   - Read `IMPL_PLAN.md` and `TODO_LIST.md`

4. **Parse Execution Intent** (from requirements text):
   ```javascript
   // Dynamic tool detection from cli-tools.json
   // Read enabled tools: ["gemini", "qwen", "codex", ...]
   const enabledTools = loadEnabledToolsFromConfig();  // See ~/.claude/cli-tools.json

   // Build dynamic patterns from enabled tools
   function buildExecPatterns(tools) {
     const patterns = {
       agent: /改为\s*Agent\s*执行|使用\s*Agent\s*执行/i
     };
     tools.forEach(tool => {
       // Pattern: "使用 {tool} 执行" or "改用 {tool}"
       patterns[`cli_${tool}`] = new RegExp(
         `使用\\s*(${tool})\\s*执行|改用\\s*(${tool})`, 'i'
       );
     });
     return patterns;
   }

   const execPatterns = buildExecPatterns(enabledTools);

   let executionIntent = null
   for (const [key, pattern] of Object.entries(execPatterns)) {
     if (pattern.test(requirements)) {
       executionIntent = key.startsWith('cli_')
         ? { method: 'cli', cli_tool: key.replace('cli_', '') }
         : { method: 'agent', cli_tool: null }
       break
     }
   }
   ```

**Output**: Session validated, context loaded, mode determined, **executionIntent parsed**

---

### Auto Mode Support

When `workflowPreferences.autoYes === true`, the phase skips interactive clarification and uses safe defaults:

```javascript
// Reference workflowPreferences (set by SKILL.md via AskUserQuestion)
const autoYes = workflowPreferences.autoYes
```

**Auto Mode Defaults**:
- **Modification Scope**: `tasks_only` (safest - only update task details)
- **Affected Modules**: All modules related to the task
- **Task Changes**: `update_only` (no structural changes)
- **Dependency Changes**: `no` (preserve existing dependencies)
- **User Confirmation**: Auto-confirm execution

**Note**: `workflowPreferences.interactive` overrides `workflowPreferences.autoYes` (forces interactive mode).

---

### Step 6.2: Interactive Requirement Clarification

**Purpose**: Define modification scope through guided questioning

**Auto Mode Check**:
```javascript
if (autoYes && !interactive) {
  // Use defaults and skip to Step 6.3
  console.log(`[Auto] Using safe defaults for replan:`)
  console.log(`  - Scope: tasks_only`)
  console.log(`  - Changes: update_only`)
  console.log(`  - Dependencies: preserve existing`)

  userSelections = {
    scope: 'tasks_only',
    modules: 'all_affected',
    task_changes: 'update_only',
    dependency_changes: false
  }
  // Proceed to Step 6.3
}
```

#### Session Mode Questions

**Q1: Modification Scope**
```javascript
Options:
- 仅更新任务细节 (tasks_only)
- 修改规划方案 (plan_update)
- 重构任务结构 (task_restructure)
- 全面重规划 (comprehensive)
```

**Q2: Affected Modules** (if scope >= plan_update)
```javascript
Options: Dynamically generated from existing tasks' focus_paths
- 认证模块 (src/auth)
- 用户管理 (src/user)
- 全部模块
```

**Q3: Task Changes** (if scope >= task_restructure)
```javascript
Options:
- 添加/删除任务 (add_remove)
- 合并/拆分任务 (merge_split)
- 仅更新内容 (update_only)
// Note: Max 4 options for AskUserQuestion
```

**Q4: Dependency Changes**
```javascript
Options:
- 是,需要重新梳理依赖
- 否,保持现有依赖
```

#### Task Mode Questions

**Q1: Update Type**
```javascript
Options:
- 需求和验收标准 (requirements & acceptance)
- 实现方案 (implementation_approach)
- 文件范围 (focus_paths)
- 依赖关系 (depends_on)
- 全部更新
```

**Q2: Ripple Effect**
```javascript
Options:
- 是,需要同步更新依赖任务
- 否,仅影响当前任务
- 不确定,请帮我分析
```

**Output**: User selections stored, modification boundaries defined

---

### Step 6.3: Impact Analysis & Planning

**Step 6.3.1: Analyze Required Changes**

Determine affected files based on clarification:

```typescript
interface ImpactAnalysis {
  affected_files: {
    impl_plan: boolean;
    todo_list: boolean;
    session_meta: boolean;
    tasks: string[];
  };

  operations: {
    type: 'create' | 'update' | 'delete' | 'merge' | 'split';
    target: string;
    reason: string;
  }[];

  backup_strategy: {
    timestamp: string;
    files: string[];
  };
}
```

**Step 6.3.2: Generate Modification Plan**

```markdown
## Modification Plan

### Impact Scope
- [ ] IMPL_PLAN.md: Update technical section 3
- [ ] TODO_LIST.md: Add 2 new tasks, delete 1 obsolete task
- [ ] IMPL-001.json: Update implementation approach
- [ ] workflow-session.json: Update task count

### Change Operations
1. **Create**: IMPL-004.json (2FA implementation)
2. **Update**: IMPL-001.json (add 2FA preparation)
3. **Delete**: IMPL-003.json (replaced by new approach)
```

**Step 6.3.3: User Confirmation**

```javascript
// Reference workflowPreferences (set by SKILL.md via AskUserQuestion)
const autoYes = workflowPreferences.autoYes

if (autoYes) {
  // Auto mode: Auto-confirm execution
  console.log(`[Auto] Auto-confirming replan execution`)
  userConfirmation = 'confirm'
  // Proceed to Step 6.4
} else {
  // Interactive mode: Ask user
  AskUserQuestion({
    questions: [{
      question: "Modification plan generated. Confirm action:",
      header: "Confirm",
      options: [
        { label: "Confirm Execute", description: "Apply all modifications" },
        { label: "Adjust Plan", description: "Re-answer questions to adjust scope" },
        { label: "Cancel", description: "Abort this replan" }
      ],
      multiSelect: false
    }]
  })
}
```

**Output**: Modification plan confirmed or adjusted

---

### Step 6.4: Backup Creation

**Process**:

1. **Create Backup Directory**:
```bash
timestamp=$(date -u +"%Y-%m-%dT%H-%M-%S")
backup_dir=".workflow/active/$SESSION_ID/.process/backup/replan-$timestamp"
mkdir -p "$backup_dir"
```

2. **Backup All Affected Files**:
   - IMPL_PLAN.md
   - TODO_LIST.md
   - workflow-session.json
   - Affected task JSONs

3. **Create Backup Manifest**:
```markdown
# Replan Backup Manifest

**Timestamp**: {timestamp}
**Reason**: {replan_reason}
**Scope**: {modification_scope}

## Restoration Command
cp {backup_dir}/* .workflow/active/{session}/
```

**Output**: All files safely backed up with manifest

---

### Step 6.5: Apply Modifications

**Step 6.5.1: Update IMPL_PLAN.md** (if needed)

Use Edit tool to modify specific sections:
- Update affected technical sections
- Update modification date

**Step 6.5.2: Update TODO_LIST.md** (if needed)

- Add new tasks with `[ ]` checkbox
- Mark deleted tasks as `[x] ~~task~~ (obsolete)`
- Update modified task descriptions

**Step 6.5.3: Update Task JSONs**

For each affected task:
```typescript
const updated_task = {
  ...task,
  context: {
    ...task.context,
    requirements: [...updated_requirements],
    acceptance: [...updated_acceptance]
  },
  flow_control: {
    ...task.flow_control,
    implementation_approach: [...updated_steps]
  },
  // Update execution config if intent detected
  ...(executionIntent && {
    meta: {
      ...task.meta,
      execution_config: {
        method: executionIntent.method,
        cli_tool: executionIntent.cli_tool,
        enable_resume: executionIntent.method !== 'agent'
      }
    }
  })
};

Write({
  file_path: `.workflow/active/${SESSION_ID}/.task/${task_id}.json`,
  content: JSON.stringify(updated_task, null, 2)
});
```

**Note**: Implementation approach steps are NO LONGER modified. CLI execution is controlled by task-level `meta.execution_config` only.

**Step 6.5.4: Create New Tasks** (if needed)

Generate complete task JSON with all required fields:
- id, title, status
- meta (type, agent)
- context (requirements, focus_paths, acceptance)
- flow_control (pre_analysis, implementation_approach, target_files)

**Step 6.5.5: Delete Obsolete Tasks** (if needed)

Move to backup instead of hard delete:
```bash
mv ".workflow/active/$SESSION_ID/.task/{task-id}.json" "$backup_dir/"
```

**Step 6.5.6: Update Session Metadata**

Update workflow-session.json:
- progress.current_tasks
- progress.last_replan
- replan_history array

**Output**: All modifications applied, artifacts updated

---

### Step 6.6: Verification & Summary

**Step 6.6.1: Verify Consistency**

1. Validate all task JSONs are valid JSON
2. Check task count within limits (max 10)
3. Verify dependency graph is acyclic

**Step 6.6.2: Generate Change Summary**

```markdown
## Replan Complete

### Session Info
- **Session**: {session-id}
- **Timestamp**: {timestamp}
- **Backup**: {backup-path}

### Change Summary
**Scope**: {scope}
**Reason**: {reason}

### Modified Files
- IMPL_PLAN.md: {changes}
- TODO_LIST.md: {changes}
- Task JSONs: {count} files updated

### Task Changes
- **Added**: {task-ids}
- **Deleted**: {task-ids}
- **Updated**: {task-ids}

### Rollback
cp {backup-path}/* .workflow/active/{session}/
```

**Output**: Summary displayed, replan complete

## TodoWrite Progress Tracking

### Session Mode Progress

```json
[
  {"content": "Mode detection and session discovery", "status": "completed", "activeForm": "Detecting mode and discovering session"},
  {"content": "Interactive requirement clarification", "status": "completed", "activeForm": "Clarifying requirements interactively"},
  {"content": "Impact analysis and plan generation", "status": "completed", "activeForm": "Analyzing impact and generating plan"},
  {"content": "Backup creation", "status": "completed", "activeForm": "Creating backup"},
  {"content": "Apply modifications to artifacts", "status": "completed", "activeForm": "Applying modifications"},
  {"content": "Verify consistency", "status": "completed", "activeForm": "Verifying consistency"}
]
```

### Task Mode Progress

```json
[
  {"content": "Detect session and load task", "status": "completed", "activeForm": "Detecting session and loading task"},
  {"content": "Interactive update confirmation", "status": "completed", "activeForm": "Confirming update interactively"},
  {"content": "Apply task modifications", "status": "completed", "activeForm": "Applying task modifications"}
]
```

## Error Handling

### Session Errors

```bash
# No active session found
ERROR: No active session found
Run /workflow:session:start to create a session

# Session not found
ERROR: Session WFS-invalid not found
Available sessions: [list]

# No changes specified
WARNING: No modifications specified
Provide requirements text or use interactive mode
```

### Task Errors

```bash
# Task not found
ERROR: Task IMPL-999 not found in session
Available tasks: [list]

# Task completed
WARNING: Task IMPL-001 is completed
Consider creating new task for additional work

# Circular dependency
ERROR: Circular dependency detected
Resolve dependency conflicts before proceeding
```

### Validation Errors

```bash
# Task limit exceeded
ERROR: Replan would create 12 tasks (limit: 10)
Consider: combining tasks, splitting sessions, or removing tasks

# Invalid JSON
ERROR: Generated invalid JSON
Backup preserved, rolling back changes
```

## File Structure

```
.workflow/active/WFS-session-name/
├── workflow-session.json
├── IMPL_PLAN.md
├── TODO_LIST.md
├── .task/
│   ├── IMPL-001.json
│   ├── IMPL-002.json
│   └── IMPL-003.json
└── .process/
    ├── context-package.json
    └── backup/
        └── replan-{timestamp}/
            ├── MANIFEST.md
            ├── IMPL_PLAN.md
            ├── TODO_LIST.md
            ├── workflow-session.json
            └── IMPL-*.json
```

## Examples

### Session Replan - Add Feature

```
Replan input: "Add 2FA support"

# Interactive clarification
Q: Modification scope?
A: Comprehensive replan

Q: Affected modules?
A: Auth module, API endpoints

Q: Task changes?
A: Add new tasks, update content

# Execution
Backup created
IMPL_PLAN.md updated
TODO_LIST.md updated
IMPL-004.json created
IMPL-001.json, IMPL-002.json updated

Replan complete! Added 1 task, updated 2 tasks
```

### Task Replan - Update Requirements

```bash
/workflow:replan IMPL-002 "Update acceptance criteria to include rate limiting"

# Interactive clarification
Q: Update type?
A: Requirements and acceptance criteria

Q: Ripple effect?
A: Yes, sync dependent tasks

# Execution
Backup created
IMPL-002.json updated
  - context.requirements updated
  - context.acceptance updated
IMPL-003.json updated (dependent task synced)

Task requirements updated with ripple effect applied
```

### Task Replan - Change Execution Method

```bash
/workflow:replan IMPL-001 "Use Codex for execution"

# Semantic parsing detects executionIntent:
# { method: 'cli', cli_tool: 'codex' }

# Execution (no interactive questions needed)
Backup created
IMPL-001.json updated
  - meta.execution_config = { method: 'cli', cli_tool: 'codex', enable_resume: true }

Task execution method updated: Agent → CLI (codex)
```

## Completion

Phase 6 is a terminal phase. Replan complete with backup and summary.
