# Flow Template Generator

Generate workflow templates for meta-skill/flow-coordinator.

## Usage

```
/meta-skill:flow-create [template-name] [--output <path>]
```

**Examples**:
```bash
/meta-skill:flow-create bugfix-v2
/meta-skill:flow-create my-workflow --output ~/.claude/skills/my-skill/templates/
```

## Execution Flow

```
User Input → Phase 1: Template Design → Phase 2: Step Definition → Phase 3: Generate JSON
                ↓                            ↓                           ↓
         Name + Description           Define workflow steps        Write template file
```

---

## Phase 1: Template Design

Gather basic template information:

```javascript
async function designTemplate(input) {
  const templateName = parseTemplateName(input) || await askTemplateName();

  const metadata = await AskUserQuestion({
    questions: [
      {
        question: "What is the purpose of this workflow template?",
        header: "Purpose",
        options: [
          { label: "Feature Development", description: "Implement new features with planning and testing" },
          { label: "Bug Fix", description: "Diagnose and fix bugs with verification" },
          { label: "TDD Development", description: "Test-driven development workflow" },
          { label: "Code Review", description: "Review cycle with findings and fixes" },
          { label: "Testing", description: "Test generation and validation" },
          { label: "Issue Workflow", description: "Complete issue lifecycle (discover → plan → queue → execute)" },
          { label: "With-File Workflow", description: "Documented exploration (brainstorm/debug/analyze)" },
          { label: "Custom", description: "Define custom workflow purpose" }
        ],
        multiSelect: false
      },
      {
        question: "What complexity level?",
        header: "Level",
        options: [
          { label: "Level 1 (Rapid)", description: "1-2 steps, ultra-lightweight hotfix" },
          { label: "Level 2 (Lightweight)", description: "2-4 steps, quick implementation" },
          { label: "Level 3 (Standard)", description: "4-6 steps, with verification and testing" },
          { label: "Level 4 (Full)", description: "6+ steps, brainstorm + full workflow" }
        ],
        multiSelect: false
      }
    ]
  });

  return {
    name: templateName,
    description: generateDescription(templateName, metadata.Purpose),
    level: parseLevel(metadata.Level),
    purpose: metadata.Purpose
  };
}
```

---

## Phase 2: Step Definition

### Step 2.1: Select Command Category

```javascript
async function selectCommandCategory() {
  return await AskUserQuestion({
    questions: [{
      question: "Select command category",
      header: "Category",
      options: [
        { label: "Planning", description: "lite-plan, plan, multi-cli-plan, tdd-plan, quick-plan-with-file" },
        { label: "Execution", description: "lite-execute, execute, unified-execute-with-file" },
        { label: "Testing", description: "test-fix-gen, test-cycle-execute, test-gen, tdd-verify" },
        { label: "Review", description: "review-session-cycle, review-module-cycle, review-cycle-fix" },
        { label: "Bug Fix", description: "lite-plan --bugfix, debug-with-file" },
        { label: "Brainstorm", description: "brainstorm-with-file, brainstorm (unified skill)" },
        { label: "Analysis", description: "analyze-with-file" },
        { label: "Issue", description: "discover, plan, queue, execute, from-brainstorm, convert-to-plan" },
        { label: "Utility", description: "clean, init, replan, status" }
      ],
      multiSelect: false
    }]
  });
}
```

### Step 2.2: Select Specific Command

```javascript
async function selectCommand(category) {
  const commandOptions = {
    'Planning': [
      { label: "/workflow-lite-plan", description: "Lightweight merged-mode planning" },
      { label: "/workflow-plan", description: "Full planning with architecture design" },
      { label: "/workflow-multi-cli-plan", description: "Multi-CLI collaborative planning (Gemini+Codex+Claude)" },
      { label: "/workflow-tdd-plan", description: "TDD workflow planning with Red-Green-Refactor" },
      { label: "/workflow:quick-plan-with-file", description: "Rapid planning with minimal docs" },
      { label: "/workflow-plan-verify", description: "Verify plan against requirements" },
      { label: "/workflow:replan", description: "Update plan and execute changes" }
    ],
    'Execution': [
      { label: "/workflow:lite-execute", description: "Execute from in-memory plan" },
      { label: "/workflow-execute", description: "Execute from planning session" },
      { label: "/workflow:unified-execute-with-file", description: "Universal execution engine" }
    ],
    'Testing': [
      { label: "/workflow-test-fix", description: "Generate test tasks for specific issues" },
      { label: "/workflow-test-fix", description: "Execute iterative test-fix cycle (>=95% pass)" },
      { label: "/workflow:test-gen", description: "Generate comprehensive test suite" },
      { label: "/workflow-tdd-verify", description: "Verify TDD workflow compliance" }
    ],
    'Review': [
      { label: "/workflow:review-session-cycle", description: "Session-based multi-dimensional code review" },
      { label: "/workflow:review-module-cycle", description: "Module-focused code review" },
      { label: "/workflow:review-cycle-fix", description: "Fix review findings with prioritization" },
      { label: "/workflow:review", description: "Post-implementation review" }
    ],
    'Bug Fix': [
      { label: "/workflow-lite-plan", description: "Lightweight bug diagnosis and fix (with --bugfix flag)" },
      { label: "/workflow:debug-with-file", description: "Hypothesis-driven debugging with documentation" }
    ],
    'Brainstorm': [
      { label: "/workflow:brainstorm-with-file", description: "Multi-perspective ideation with documentation" },
      { label: "/brainstorm", description: "Unified brainstorming skill (auto-parallel + role analysis)" }
    ],
    'Analysis': [
      { label: "/workflow:analyze-with-file", description: "Collaborative analysis with documentation" }
    ],
    'Issue': [
      { label: "/issue:discover", description: "Multi-perspective issue discovery" },
      { label: "/issue:discover-by-prompt", description: "Prompt-based issue discovery with Gemini" },
      { label: "/issue:plan", description: "Plan issue solutions" },
      { label: "/issue:queue", description: "Form execution queue with conflict analysis" },
      { label: "/issue:execute", description: "Execute issue queue with DAG orchestration" },
      { label: "/issue:from-brainstorm", description: "Convert brainstorm to issue" },
      { label: "/issue:convert-to-plan", description: "Convert planning artifacts to issue solutions" }
    ],
    'Utility': [
      { label: "/workflow:clean", description: "Intelligent code cleanup" },
      { label: "/workflow:init", description: "Initialize project-level state" },
      { label: "/workflow:replan", description: "Interactive workflow replanning" },
      { label: "/workflow:status", description: "Generate workflow status views" }
    ]
  };

  return await AskUserQuestion({
    questions: [{
      question: `Select ${category} command`,
      header: "Command",
      options: commandOptions[category] || commandOptions['Planning'],
      multiSelect: false
    }]
  });
}
```

### Step 2.3: Select Execution Unit

```javascript
async function selectExecutionUnit() {
  return await AskUserQuestion({
    questions: [{
      question: "Select execution unit (atomic command group)",
      header: "Unit",
      options: [
        // Planning + Execution Units
        { label: "quick-implementation", description: "【lite-plan → lite-execute】" },
        { label: "multi-cli-planning", description: "【multi-cli-plan → lite-execute】" },
        { label: "full-planning-execution", description: "【plan → execute】" },
        { label: "verified-planning-execution", description: "【plan → plan-verify → execute】" },
        { label: "replanning-execution", description: "【replan → execute】" },
        { label: "tdd-planning-execution", description: "【tdd-plan → execute】" },
        // Testing Units
        { label: "test-validation", description: "【test-fix-gen → test-cycle-execute】" },
        { label: "test-generation-execution", description: "【test-gen → execute】" },
        // Review Units
        { label: "code-review", description: "【review-*-cycle → review-cycle-fix】" },
        // Bug Fix Units
        { label: "bug-fix", description: "【lite-plan --bugfix → lite-execute】" },
        // Issue Units
        { label: "issue-workflow", description: "【discover → plan → queue → execute】" },
        { label: "rapid-to-issue", description: "【lite-plan → convert-to-plan → queue → execute】" },
        { label: "brainstorm-to-issue", description: "【from-brainstorm → queue → execute】" },
        // With-File Units (self-contained)
        { label: "brainstorm-with-file", description: "Self-contained brainstorming workflow" },
        { label: "debug-with-file", description: "Self-contained debugging workflow" },
        { label: "analyze-with-file", description: "Self-contained analysis workflow" },
        // Standalone
        { label: "standalone", description: "Single command, no atomic grouping" }
      ],
      multiSelect: false
    }]
  });
}
```

### Step 2.4: Select Execution Mode

```javascript
async function selectExecutionMode() {
  return await AskUserQuestion({
    questions: [{
      question: "Execution mode for this step?",
      header: "Mode",
      options: [
        { label: "mainprocess", description: "Run in main process (blocking, synchronous)" },
        { label: "async", description: "Run asynchronously (background, hook callbacks)" }
      ],
      multiSelect: false
    }]
  });
}
```

### Complete Step Definition Flow

```javascript
async function defineSteps(templateDesign) {
  // Suggest steps based on purpose
  const suggestedSteps = getSuggestedSteps(templateDesign.purpose);

  const customize = await AskUserQuestion({
    questions: [{
      question: "Use suggested steps or customize?",
      header: "Steps",
      options: [
        { label: "Use Suggested", description: `Suggested: ${suggestedSteps.map(s => s.cmd).join(' → ')}` },
        { label: "Customize", description: "Modify or add custom steps" },
        { label: "Start Empty", description: "Define all steps from scratch" }
      ],
      multiSelect: false
    }]
  });

  if (customize.Steps === "Use Suggested") {
    return suggestedSteps;
  }

  // Interactive step definition
  const steps = [];
  let addMore = true;
  while (addMore) {
    const category = await selectCommandCategory();
    const command = await selectCommand(category.Category);
    const unit = await selectExecutionUnit();
    const execMode = await selectExecutionMode();
    const contextHint = await askContextHint(command.Command);

    steps.push({
      cmd: command.Command,
      args: command.Command.includes('plan') || command.Command.includes('fix') ? '"{{goal}}"' : undefined,
      unit: unit.Unit,
      execution: {
        type: "slash-command",
        mode: execMode.Mode
      },
      contextHint: contextHint
    });

    const continueAdding = await AskUserQuestion({
      questions: [{
        question: `Added step ${steps.length}: ${command.Command}. Add another?`,
        header: "Continue",
        options: [
          { label: "Add More", description: "Define another step" },
          { label: "Done", description: "Finish step definition" }
        ],
        multiSelect: false
      }]
    });
    addMore = continueAdding.Continue === "Add More";
  }

  return steps;
}
```

---

## Suggested Step Templates

### Feature Development (Level 2 - Rapid)
```json
{
  "name": "rapid",
  "description": "Quick implementation with testing",
  "level": 2,
  "steps": [
    { "cmd": "/workflow-lite-plan", "args": "\"{{goal}}\"", "unit": "quick-implementation", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Create lightweight implementation plan" },
    { "cmd": "/workflow:lite-execute", "args": "--in-memory", "unit": "quick-implementation", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Execute implementation based on plan" },
    { "cmd": "/workflow-test-fix", "unit": "test-validation", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Generate test tasks" },
    { "cmd": "/workflow-test-fix", "unit": "test-validation", "execution": { "type": "slash-command", "mode": "async" }, "contextHint": "Execute test-fix cycle until pass rate >= 95%" }
  ]
}
```

### Feature Development (Level 3 - Coupled)
```json
{
  "name": "coupled",
  "description": "Full workflow with verification, review, and testing",
  "level": 3,
  "steps": [
    { "cmd": "/workflow-plan", "args": "\"{{goal}}\"", "unit": "verified-planning-execution", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Create detailed implementation plan" },
    { "cmd": "/workflow-plan-verify", "unit": "verified-planning-execution", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Verify plan against requirements" },
    { "cmd": "/workflow-execute", "unit": "verified-planning-execution", "execution": { "type": "slash-command", "mode": "async" }, "contextHint": "Execute implementation" },
    { "cmd": "/workflow:review-session-cycle", "unit": "code-review", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Multi-dimensional code review" },
    { "cmd": "/workflow:review-cycle-fix", "unit": "code-review", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Fix review findings" },
    { "cmd": "/workflow-test-fix", "unit": "test-validation", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Generate test tasks" },
    { "cmd": "/workflow-test-fix", "unit": "test-validation", "execution": { "type": "slash-command", "mode": "async" }, "contextHint": "Execute test-fix cycle" }
  ]
}
```

### Bug Fix (Level 2)
```json
{
  "name": "bugfix",
  "description": "Bug diagnosis and fix with testing",
  "level": 2,
  "steps": [
    { "cmd": "/workflow-lite-plan", "args": "--bugfix \"{{goal}}\"", "unit": "bug-fix", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Diagnose and plan bug fix" },
    { "cmd": "/workflow:lite-execute", "args": "--in-memory", "unit": "bug-fix", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Execute bug fix" },
    { "cmd": "/workflow-test-fix", "unit": "test-validation", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Generate regression tests" },
    { "cmd": "/workflow-test-fix", "unit": "test-validation", "execution": { "type": "slash-command", "mode": "async" }, "contextHint": "Verify fix with tests" }
  ]
}
```

### Bug Fix Hotfix (Level 2)
```json
{
  "name": "bugfix-hotfix",
  "description": "Urgent production bug fix (no tests)",
  "level": 2,
  "steps": [
    { "cmd": "/workflow-lite-plan", "args": "--hotfix \"{{goal}}\"", "unit": "standalone", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Emergency hotfix mode" }
  ]
}
```

### TDD Development (Level 3)
```json
{
  "name": "tdd",
  "description": "Test-driven development with Red-Green-Refactor",
  "level": 3,
  "steps": [
    { "cmd": "/workflow-tdd-plan", "args": "\"{{goal}}\"", "unit": "tdd-planning-execution", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Create TDD task chain" },
    { "cmd": "/workflow-execute", "unit": "tdd-planning-execution", "execution": { "type": "slash-command", "mode": "async" }, "contextHint": "Execute TDD cycle" },
    { "cmd": "/workflow-tdd-verify", "unit": "standalone", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Verify TDD compliance" }
  ]
}
```

### Code Review (Level 3)
```json
{
  "name": "review",
  "description": "Code review cycle with fixes and testing",
  "level": 3,
  "steps": [
    { "cmd": "/workflow:review-session-cycle", "unit": "code-review", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Multi-dimensional code review" },
    { "cmd": "/workflow:review-cycle-fix", "unit": "code-review", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Fix review findings" },
    { "cmd": "/workflow-test-fix", "unit": "test-validation", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Generate tests for fixes" },
    { "cmd": "/workflow-test-fix", "unit": "test-validation", "execution": { "type": "slash-command", "mode": "async" }, "contextHint": "Verify fixes pass tests" }
  ]
}
```

### Test Fix (Level 3)
```json
{
  "name": "test-fix",
  "description": "Fix failing tests",
  "level": 3,
  "steps": [
    { "cmd": "/workflow-test-fix", "args": "\"{{goal}}\"", "unit": "test-validation", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Generate test fix tasks" },
    { "cmd": "/workflow-test-fix", "unit": "test-validation", "execution": { "type": "slash-command", "mode": "async" }, "contextHint": "Execute test-fix cycle" }
  ]
}
```

### Issue Workflow (Level Issue)
```json
{
  "name": "issue",
  "description": "Complete issue lifecycle",
  "level": "Issue",
  "steps": [
    { "cmd": "/issue:discover", "unit": "issue-workflow", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Discover issues from codebase" },
    { "cmd": "/issue:plan", "args": "--all-pending", "unit": "issue-workflow", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Plan issue solutions" },
    { "cmd": "/issue:queue", "unit": "issue-workflow", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Form execution queue" },
    { "cmd": "/issue:execute", "unit": "issue-workflow", "execution": { "type": "slash-command", "mode": "async" }, "contextHint": "Execute issue queue" }
  ]
}
```

### Rapid to Issue (Level 2.5)
```json
{
  "name": "rapid-to-issue",
  "description": "Bridge lightweight planning to issue workflow",
  "level": 2,
  "steps": [
    { "cmd": "/workflow-lite-plan", "args": "\"{{goal}}\"", "unit": "rapid-to-issue", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Create lightweight plan" },
    { "cmd": "/issue:convert-to-plan", "args": "--latest-lite-plan -y", "unit": "rapid-to-issue", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Convert to issue plan" },
    { "cmd": "/issue:queue", "unit": "rapid-to-issue", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Form execution queue" },
    { "cmd": "/issue:execute", "args": "--queue auto", "unit": "rapid-to-issue", "execution": { "type": "slash-command", "mode": "async" }, "contextHint": "Execute issue queue" }
  ]
}
```

### Brainstorm to Issue (Level 4)
```json
{
  "name": "brainstorm-to-issue",
  "description": "Bridge brainstorm session to issue workflow",
  "level": 4,
  "steps": [
    { "cmd": "/issue:from-brainstorm", "args": "SESSION=\"{{session}}\" --auto", "unit": "brainstorm-to-issue", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Convert brainstorm to issue" },
    { "cmd": "/issue:queue", "unit": "brainstorm-to-issue", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Form execution queue" },
    { "cmd": "/issue:execute", "args": "--queue auto", "unit": "brainstorm-to-issue", "execution": { "type": "slash-command", "mode": "async" }, "contextHint": "Execute issue queue" }
  ]
}
```

### With-File: Brainstorm (Level 4)
```json
{
  "name": "brainstorm",
  "description": "Multi-perspective ideation with documentation",
  "level": 4,
  "steps": [
    { "cmd": "/workflow:brainstorm-with-file", "args": "\"{{goal}}\"", "unit": "brainstorm-with-file", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Multi-CLI brainstorming with documented diverge-converge cycles" }
  ]
}
```

### With-File: Debug (Level 3)
```json
{
  "name": "debug",
  "description": "Hypothesis-driven debugging with documentation",
  "level": 3,
  "steps": [
    { "cmd": "/workflow:debug-with-file", "args": "\"{{goal}}\"", "unit": "debug-with-file", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Hypothesis-driven debugging with Gemini validation" }
  ]
}
```

### With-File: Analyze (Level 3)
```json
{
  "name": "analyze",
  "description": "Collaborative analysis with documentation",
  "level": 3,
  "steps": [
    { "cmd": "/workflow:analyze-with-file", "args": "\"{{goal}}\"", "unit": "analyze-with-file", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Multi-round collaborative analysis with CLI exploration" }
  ]
}
```

### Full Workflow (Level 4)
```json
{
  "name": "full",
  "description": "Complete workflow: brainstorm → plan → execute → test",
  "level": 4,
  "steps": [
    { "cmd": "/brainstorm", "args": "\"{{goal}}\"", "unit": "standalone", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Unified brainstorming with multi-perspective exploration" },
    { "cmd": "/workflow-plan", "unit": "verified-planning-execution", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Create detailed plan from brainstorm" },
    { "cmd": "/workflow-plan-verify", "unit": "verified-planning-execution", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Verify plan quality" },
    { "cmd": "/workflow-execute", "unit": "verified-planning-execution", "execution": { "type": "slash-command", "mode": "async" }, "contextHint": "Execute implementation" },
    { "cmd": "/workflow-test-fix", "unit": "test-validation", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Generate comprehensive tests" },
    { "cmd": "/workflow-test-fix", "unit": "test-validation", "execution": { "type": "slash-command", "mode": "async" }, "contextHint": "Execute test cycle" }
  ]
}
```

### Multi-CLI Planning (Level 3)
```json
{
  "name": "multi-cli-plan",
  "description": "Multi-CLI collaborative planning with cross-verification",
  "level": 3,
  "steps": [
    { "cmd": "/workflow-multi-cli-plan", "args": "\"{{goal}}\"", "unit": "multi-cli-planning", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Gemini+Codex+Claude collaborative planning" },
    { "cmd": "/workflow:lite-execute", "args": "--in-memory", "unit": "multi-cli-planning", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Execute converged plan" },
    { "cmd": "/workflow-test-fix", "unit": "test-validation", "execution": { "type": "slash-command", "mode": "mainprocess" }, "contextHint": "Generate tests" },
    { "cmd": "/workflow-test-fix", "unit": "test-validation", "execution": { "type": "slash-command", "mode": "async" }, "contextHint": "Execute test cycle" }
  ]
}
```

### Ultra-Lightweight (Level 1)

> **Note**: `lite-lite-lite` has been removed. Use `bugfix-hotfix` for Level 1 urgent tasks, or `rapid` (Level 2) for simple features.

---

## Command Port Reference

Each command has input/output ports for pipeline composition:

| Command | Input Port | Output Port | Atomic Unit |
|---------|------------|-------------|-------------|
| **Planning** |
| lite-plan | requirement | plan | quick-implementation |
| plan | requirement | detailed-plan | full-planning-execution |
| plan-verify | detailed-plan | verified-plan | verified-planning-execution |
| multi-cli-plan | requirement | multi-cli-plan | multi-cli-planning |
| tdd-plan | requirement | tdd-tasks | tdd-planning-execution |
| replan | session, feedback | replan | replanning-execution |
| **Execution** |
| lite-execute | plan, multi-cli-plan | code | (multiple) |
| execute | detailed-plan, verified-plan, replan, tdd-tasks | code | (multiple) |
| **Testing** |
| test-fix-gen | failing-tests, session | test-tasks | test-validation |
| test-cycle-execute | test-tasks | test-passed | test-validation |
| test-gen | code, session | test-tasks | test-generation-execution |
| tdd-verify | code | tdd-verified | standalone |
| **Review** |
| review-session-cycle | code, session | review-verified | code-review |
| review-module-cycle | module-pattern | review-verified | code-review |
| review-cycle-fix | review-findings | fixed-code | code-review |
| **Bug Fix** |
| lite-plan --bugfix | bug-report | plan | bug-fix |
| debug-with-file | bug-report | understanding-document | debug-with-file |
| **With-File** |
| brainstorm-with-file | exploration-topic | brainstorm-document | brainstorm-with-file |
| analyze-with-file | analysis-topic | discussion-document | analyze-with-file |
| **Issue** |
| issue:discover | codebase | pending-issues | issue-workflow |
| issue:plan | pending-issues | issue-plans | issue-workflow |
| issue:queue | issue-plans, converted-plan | execution-queue | issue-workflow |
| issue:execute | execution-queue | completed-issues | issue-workflow |
| issue:convert-to-plan | plan | converted-plan | rapid-to-issue |
| issue:from-brainstorm | brainstorm-document | converted-plan | brainstorm-to-issue |

---

## Minimum Execution Units (最小执行单元)

**Definition**: Commands that must execute together as an atomic group.

| Unit Name | Commands | Purpose |
|-----------|----------|---------|
| **quick-implementation** | lite-plan → lite-execute | Lightweight plan and execution |
| **multi-cli-planning** | multi-cli-plan → lite-execute | Multi-perspective planning and execution |
| **bug-fix** | lite-plan --bugfix → lite-execute | Bug diagnosis and fix |
| **full-planning-execution** | plan → execute | Detailed planning and execution |
| **verified-planning-execution** | plan → plan-verify → execute | Planning with verification |
| **replanning-execution** | replan → execute | Update plan and execute |
| **tdd-planning-execution** | tdd-plan → execute | TDD planning and execution |
| **test-validation** | test-fix-gen → test-cycle-execute | Test generation and fix cycle |
| **test-generation-execution** | test-gen → execute | Generate and execute tests |
| **code-review** | review-*-cycle → review-cycle-fix | Review and fix findings |
| **issue-workflow** | discover → plan → queue → execute | Complete issue lifecycle |
| **rapid-to-issue** | lite-plan → convert-to-plan → queue → execute | Bridge to issue workflow |
| **brainstorm-to-issue** | from-brainstorm → queue → execute | Brainstorm to issue bridge |
| **brainstorm-with-file** | (self-contained) | Multi-perspective ideation |
| **debug-with-file** | (self-contained) | Hypothesis-driven debugging |
| **analyze-with-file** | (self-contained) | Collaborative analysis |

---

## Phase 3: Generate JSON

```javascript
async function generateTemplate(design, steps, outputPath) {
  const template = {
    name: design.name,
    description: design.description,
    level: design.level,
    steps: steps
  };

  const finalPath = outputPath || `~/.claude/skills/flow-coordinator/templates/${design.name}.json`;

  // Write template
  Write(finalPath, JSON.stringify(template, null, 2));

  // Validate
  const validation = validateTemplate(template);

  console.log(`✅ Template created: ${finalPath}`);
  console.log(`   Steps: ${template.steps.length}`);
  console.log(`   Level: ${template.level}`);
  console.log(`   Units: ${[...new Set(template.steps.map(s => s.unit))].join(', ')}`);

  return { path: finalPath, template, validation };
}
```

---

## Output Format

```json
{
  "name": "template-name",
  "description": "Template description",
  "level": 2,
  "steps": [
    {
      "cmd": "/workflow:command",
      "args": "\"{{goal}}\"",
      "unit": "unit-name",
      "execution": {
        "type": "slash-command",
        "mode": "mainprocess"
      },
      "contextHint": "Description of what this step does"
    }
  ]
}
```

---

## Examples

**Create a quick bugfix template**:
```
/meta-skill:flow-create hotfix-simple

→ Purpose: Bug Fix
→ Level: 2 (Lightweight)
→ Steps: Use Suggested
→ Output: ~/.claude/skills/flow-coordinator/templates/hotfix-simple.json
```

**Create a custom multi-stage workflow**:
```
/meta-skill:flow-create complex-feature --output ~/.claude/skills/my-project/templates/

→ Purpose: Feature Development
→ Level: 3 (Standard)
→ Steps: Customize
  → Step 1: /brainstorm (standalone, mainprocess)
  → Step 2: /workflow-plan (verified-planning-execution, mainprocess)
  → Step 3: /workflow-plan-verify (verified-planning-execution, mainprocess)
  → Step 4: /workflow-execute (verified-planning-execution, async)
  → Step 5: /workflow:review-session-cycle (code-review, mainprocess)
  → Step 6: /workflow:review-cycle-fix (code-review, mainprocess)
  → Done
→ Output: ~/.claude/skills/my-project/templates/complex-feature.json
```
