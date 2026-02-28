# Phase 1: Mode Detection & Interactive Routing

Parse user arguments, detect execution mode from flags/parameters, or interactively ask the user which mode to use via AskUserQuestion.

## Objective

- Parse all command arguments and flags
- Detect execution mode automatically when possible
- Ask user via AskUserQuestion when mode is ambiguous
- Initialize TodoWrite with mode-appropriate task list
- Route to correct execution path

## Execution

### Step 1.1: Parameter Parsing

```javascript
// Parse from user input (argument string)
const args = parseArguments(user_input);

// Flags
const auto_yes = args.includes('--yes') || args.includes('-y');
const count = extractFlag(args, '--count', 3);  // default 3, max 9
if (count > 9) count = 9;  // Cap at maximum
const session_id = extractFlag(args, '--session', null);
const update_mode = args.includes('--update');
const include_questions = args.includes('--include-questions');
const skip_questions = args.includes('--skip-questions');
const style_skill = extractFlag(args, '--style-skill', null);

// Role detection
const VALID_ROLES = [
  'data-architect', 'product-manager', 'product-owner', 'scrum-master',
  'subject-matter-expert', 'system-architect', 'test-strategist',
  'ui-designer', 'ux-expert'
];
const first_arg = getFirstNonFlagArg(args);
const is_role = VALID_ROLES.includes(first_arg);

// Topic extraction (everything that's not a flag or role)
const topic = is_role ? null : extractTopic(args);
```

### Step 1.2: Style-Skill Validation

```javascript
if (style_skill) {
  const skill_path = `.claude/skills/style-${style_skill}/SKILL.md`;
  if (fileExists(skill_path)) {
    style_skill_package = style_skill;
    style_reference_path = `.workflow/reference_style/${style_skill}`;
    // "✓ Style SKILL package found: style-{style_skill}"
  } else {
    // "⚠ WARNING: Style SKILL package not found: {style_skill}"
    style_skill_package = null;
  }
} else {
  style_skill_package = null;
}
```

### Step 1.3: Mode Detection

```javascript
// Auto-detection rules (ordered by priority)
if (auto_yes) {
  // --yes flag explicitly requests auto mode
  execution_mode = 'auto';
} else if (is_role) {
  // First arg is a valid role name → single role mode
  execution_mode = 'single-role';
  role_name = first_arg;
} else if (topic && !session_id) {
  // Topic provided without session → likely auto mode, but ask
  execution_mode = null;  // Ask user
} else {
  // Ambiguous → ask user
  execution_mode = null;
}
```

### Step 1.4: Interactive Mode Selection (when mode is null)

```javascript
if (execution_mode === null) {
  AskUserQuestion({
    questions: [{
      question: "请选择头脑风暴模式",
      header: "模式选择",
      multiSelect: false,
      options: [
        {
          label: "自动模式 (推荐)",
          description: "完整流程：框架生成 → 多角色并行分析 → 跨角色综合。适合新主题的全面分析"
        },
        {
          label: "单角色分析",
          description: "为单个角色生成分析文档。适合补充已有会话的角色视角或迭代更新"
        }
      ]
    }]
  });

  // Route based on user selection
  if (user_selected === "自动模式 (推荐)") {
    execution_mode = 'auto';
  } else {
    execution_mode = 'single-role';
  }
}
```

### Step 1.5: Single Role Mode - Role Selection (if needed)

When entering single-role mode without a role name specified:

```javascript
if (execution_mode === 'single-role' && !role_name) {
  // Need to ask which role
  AskUserQuestion({
    questions: [{
      question: "请选择要执行分析的角色",
      header: "角色选择",
      multiSelect: false,
      options: [
        { label: "system-architect", description: "系统架构师 - 技术架构、可扩展性、集成模式" },
        { label: "ux-expert", description: "UX专家 - 用户研究、信息架构、用户旅程" },
        { label: "product-manager", description: "产品经理 - 产品策略、路线图、优先级" },
        { label: "ui-designer", description: "UI设计师 - 视觉设计、高保真原型、设计系统" }
      ]
    }]
  });
  // Note: If user needs a role not in top 4, they select "Other" and type it
  role_name = user_selected;

  // Validate role name
  if (!VALID_ROLES.includes(role_name)) {
    // ERROR with valid roles list
    // EXIT
  }
}
```

### Step 1.6: Session Detection

```javascript
if (!session_id) {
  // Find active sessions
  const sessions = Glob('.workflow/active/WFS-*/');

  if (sessions.length > 1) {
    // Multiple sessions → ask user to select
    // Use AskUserQuestion with session list
  } else if (sessions.length === 1) {
    session_id = extractSessionId(sessions[0]);
  } else {
    if (execution_mode === 'auto') {
      // Will be created by artifacts phase
      session_id = null;  // artifacts handles creation
    } else {
      // Single role mode requires existing session
      // ERROR: "No active session. Run /brainstorm 'topic' first"
      // EXIT
    }
  }
}
```

### Step 1.7: Initialize TodoWrite

```javascript
if (execution_mode === 'auto') {
  TodoWrite({
    todos: [
      { content: "Phase 1: Mode detection and parameter parsing", status: "completed", activeForm: "Detecting mode" },
      { content: "Phase 2: Interactive Framework Generation", status: "pending", activeForm: "Generating framework" },
      { content: "Phase 3: Parallel Role Analysis", status: "pending", activeForm: "Executing parallel analysis" },
      { content: "Phase 4: Synthesis Integration", status: "pending", activeForm: "Executing synthesis" }
    ]
  });
} else {
  TodoWrite({
    todos: [
      { content: "Phase 1: Mode detection and parameter parsing", status: "completed", activeForm: "Detecting mode" },
      { content: `Phase 3: ${role_name} analysis`, status: "pending", activeForm: `Executing ${role_name} analysis` }
    ]
  });
}
```

## Output

- **Variable**: `execution_mode` ("auto" | "single-role")
- **Variable**: `role_name` (single-role mode only)
- **Variable**: `topic` (auto mode only)
- **Variable**: `session_id` (may be null for auto mode - artifacts creates it)
- **Variable**: `count` (auto mode, default 3)
- **Variable**: `auto_yes` (boolean)
- **Variable**: `style_skill_package` (optional)
- **Variable**: `update_mode`, `include_questions`, `skip_questions` (single-role flags)
- **TodoWrite**: Phase 1 completed, subsequent phases pending

## Next Phase

Return to orchestrator:
- If `execution_mode === 'auto'` → Continue to [Phase 2: Artifacts](02-artifacts.md)
- If `execution_mode === 'single-role'` → Continue to [Phase 3: Role Analysis](03-role-analysis.md)
