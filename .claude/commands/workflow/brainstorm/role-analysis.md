---
name: role-analysis
description: Unified role-specific analysis generation with interactive context gathering and incremental updates
argument-hint: "[role-name] [--session session-id] [--update] [--include-questions] [--skip-questions]"
allowed-tools: Task(conceptual-planning-agent), AskUserQuestion(*), TodoWrite(*), Read(*), Write(*), Edit(*), Glob(*)
---

## 🎯 **Unified Role Analysis Generator**

### Purpose
**Unified command for generating and updating role-specific analysis** with interactive context gathering, framework alignment, and incremental update support. Replaces 9 individual role commands with single parameterized workflow.

### Core Function
- **Multi-Role Support**: Single command supports all 9 brainstorming roles
- **Interactive Context**: Dynamic question generation based on role and framework
- **Incremental Updates**: Merge new insights into existing analyses
- **Framework Alignment**: Address guidance-specification.md discussion points
- **Agent Delegation**: Use conceptual-planning-agent with role-specific templates

### Supported Roles

| Role ID | Title | Focus Area | Context Questions |
|---------|-------|------------|-------------------|
| `ux-expert` | UX专家 | User research, information architecture, user journey | 4 |
| `ui-designer` | UI设计师 | Visual design, high-fidelity mockups, design systems | 4 |
| `system-architect` | 系统架构师 | Technical architecture, scalability, integration patterns | 5 |
| `product-manager` | 产品经理 | Product strategy, roadmap, prioritization | 4 |
| `product-owner` | 产品负责人 | Backlog management, user stories, acceptance criteria | 4 |
| `scrum-master` | 敏捷教练 | Process facilitation, impediment removal, team dynamics | 3 |
| `subject-matter-expert` | 领域专家 | Domain knowledge, business rules, compliance | 4 |
| `data-architect` | 数据架构师 | Data models, storage strategies, data flow | 5 |
| `api-designer` | API设计师 | API contracts, versioning, integration patterns | 4 |

---

## 📋 **Usage**

```bash
# Generate new analysis with interactive context
/workflow:brainstorm:role-analysis ux-expert

# Generate with existing framework + context questions
/workflow:brainstorm:role-analysis system-architect --session WFS-xxx --include-questions

# Update existing analysis (incremental merge)
/workflow:brainstorm:role-analysis ui-designer --session WFS-xxx --update

# Quick generation (skip interactive context)
/workflow:brainstorm:role-analysis product-manager --session WFS-xxx --skip-questions
```

---

## ⚙️ **Execution Protocol**

### Phase 1: Detection & Validation

**Step 1.1: Role Validation**
```bash
VALIDATE role_name IN [
  ux-expert, ui-designer, system-architect, product-manager,
  product-owner, scrum-master, subject-matter-expert,
  data-architect, api-designer
]
IF invalid:
  ERROR: "Unknown role: {role_name}. Use one of: ux-expert, ui-designer, ..."
  EXIT
```

**Step 1.2: Session Detection**
```bash
IF --session PROVIDED:
  session_id = --session
  brainstorm_dir = .workflow/active/{session_id}/.brainstorming/
ELSE:
  FIND .workflow/active/WFS-*/
  IF multiple:
    PROMPT user to select
  ELSE IF single:
    USE existing
  ELSE:
    ERROR: "No active session. Run /workflow:brainstorm:artifacts first"
    EXIT

VALIDATE brainstorm_dir EXISTS
```

**Step 1.3: Framework Detection**
```bash
framework_file = {brainstorm_dir}/guidance-specification.md
IF framework_file EXISTS:
  framework_mode = true
  LOAD framework_content
ELSE:
  WARN: "No framework found - will create standalone analysis"
  framework_mode = false
```

**Step 1.4: Update Mode Detection**
```bash
existing_analysis = {brainstorm_dir}/{role_name}/analysis*.md
IF --update FLAG OR existing_analysis EXISTS:
  update_mode = true
  IF --update NOT PROVIDED:
    ASK: "Analysis exists. Update or regenerate?"
    OPTIONS: ["Incremental update", "Full regenerate", "Cancel"]
ELSE:
  update_mode = false
```

### Phase 2: Interactive Context Gathering

**Trigger Conditions**:
- Default: Always ask unless `--skip-questions` provided
- `--include-questions`: Force context gathering even if analysis exists
- `--skip-questions`: Skip all interactive questions

**Step 2.1: Load Role Configuration**
```javascript
const roleConfig = {
  'ux-expert': {
    title: 'UX专家',
    focus_area: 'User research, information architecture, user journey',
    question_categories: ['User Intent', 'Requirements', 'UX'],
    question_count: 4,
    template: '~/.claude/workflows/cli-templates/planning-roles/ux-expert.md'
  },
  'ui-designer': {
    title: 'UI设计师',
    focus_area: 'Visual design, high-fidelity mockups, design systems',
    question_categories: ['Requirements', 'UX', 'Feasibility'],
    question_count: 4,
    template: '~/.claude/workflows/cli-templates/planning-roles/ui-designer.md'
  },
  'system-architect': {
    title: '系统架构师',
    focus_area: 'Technical architecture, scalability, integration patterns',
    question_categories: ['Scale & Performance', 'Technical Constraints', 'Architecture Complexity', 'Non-Functional Requirements'],
    question_count: 5,
    template: '~/.claude/workflows/cli-templates/planning-roles/system-architect.md'
  },
  'product-manager': {
    title: '产品经理',
    focus_area: 'Product strategy, roadmap, prioritization',
    question_categories: ['User Intent', 'Requirements', 'Process'],
    question_count: 4,
    template: '~/.claude/workflows/cli-templates/planning-roles/product-manager.md'
  },
  'product-owner': {
    title: '产品负责人',
    focus_area: 'Backlog management, user stories, acceptance criteria',
    question_categories: ['Requirements', 'Decisions', 'Process'],
    question_count: 4,
    template: '~/.claude/workflows/cli-templates/planning-roles/product-owner.md'
  },
  'scrum-master': {
    title: '敏捷教练',
    focus_area: 'Process facilitation, impediment removal, team dynamics',
    question_categories: ['Process', 'Risk', 'Decisions'],
    question_count: 3,
    template: '~/.claude/workflows/cli-templates/planning-roles/scrum-master.md'
  },
  'subject-matter-expert': {
    title: '领域专家',
    focus_area: 'Domain knowledge, business rules, compliance',
    question_categories: ['Requirements', 'Feasibility', 'Terminology'],
    question_count: 4,
    template: '~/.claude/workflows/cli-templates/planning-roles/subject-matter-expert.md'
  },
  'data-architect': {
    title: '数据架构师',
    focus_area: 'Data models, storage strategies, data flow',
    question_categories: ['Architecture', 'Scale & Performance', 'Technical Constraints', 'Feasibility'],
    question_count: 5,
    template: '~/.claude/workflows/cli-templates/planning-roles/data-architect.md'
  },
  'api-designer': {
    title: 'API设计师',
    focus_area: 'API contracts, versioning, integration patterns',
    question_categories: ['Architecture', 'Requirements', 'Feasibility', 'Decisions'],
    question_count: 4,
    template: '~/.claude/workflows/cli-templates/planning-roles/api-designer.md'
  }
};

config = roleConfig[role_name];
```

**Step 2.2: Generate Role-Specific Questions**

**9-Category Taxonomy** (from synthesis.md):

| Category | Focus | Example Question Pattern |
|----------|-------|--------------------------|
| User Intent | 用户目标 | "该分析的核心目标是什么？" |
| Requirements | 需求细化 | "需求的优先级如何排序？" |
| Architecture | 架构决策 | "技术栈的选择考量？" |
| UX | 用户体验 | "交互复杂度的取舍？" |
| Feasibility | 可行性 | "资源约束下的实现范围？" |
| Risk | 风险管理 | "风险容忍度是多少？" |
| Process | 流程规范 | "开发迭代的节奏？" |
| Decisions | 决策确认 | "冲突的解决方案？" |
| Terminology | 术语统一 | "统一使用哪个术语？" |
| Scale & Performance | 性能扩展 | "预期的负载和性能要求？" |
| Technical Constraints | 技术约束 | "现有技术栈的限制？" |
| Architecture Complexity | 架构复杂度 | "架构的复杂度权衡？" |
| Non-Functional Requirements | 非功能需求 | "可用性和可维护性要求？" |

**Question Generation Algorithm**:
```javascript
async function generateQuestions(role_name, framework_content) {
  const config = roleConfig[role_name];
  const questions = [];

  // Parse framework for keywords
  const keywords = extractKeywords(framework_content);

  // Generate category-specific questions
  for (const category of config.question_categories) {
    const question = generateCategoryQuestion(category, keywords, role_name);
    questions.push(question);
  }

  return questions.slice(0, config.question_count);
}
```

**Step 2.3: Multi-Round Question Execution**

```javascript
const BATCH_SIZE = 4;
const user_context = {};

for (let i = 0; i < questions.length; i += BATCH_SIZE) {
  const batch = questions.slice(i, i + BATCH_SIZE);
  const currentRound = Math.floor(i / BATCH_SIZE) + 1;
  const totalRounds = Math.ceil(questions.length / BATCH_SIZE);

  console.log(`\n[Round ${currentRound}/${totalRounds}] ${config.title} 上下文询问\n`);

  AskUserQuestion({
    questions: batch.map(q => ({
      question: q.question,
      header: q.category.substring(0, 12),
      multiSelect: false,
      options: q.options.map(opt => ({
        label: opt.label,
        description: opt.description
      }))
    }))
  });

  // Store responses before next round
  for (const answer of responses) {
    user_context[answer.question] = {
      answer: answer.selected,
      category: answer.category,
      timestamp: new Date().toISOString()
    };
  }
}

// Save context to file
Write(
  `${brainstorm_dir}/${role_name}/${role_name}-context.md`,
  formatUserContext(user_context)
);
```

**Question Quality Rules** (from artifacts.md):

**MUST Include**:
- ✅ All questions in Chinese (用中文提问)
- ✅ 业务场景作为问题前提
- ✅ 技术选项的业务影响说明
- ✅ 量化指标和约束条件

**MUST Avoid**:
- ❌ 纯技术选型无业务上下文
- ❌ 过度抽象的通用问题
- ❌ 脱离框架的重复询问

### Phase 3: Agent Execution

**Step 3.1: Load Session Metadata**
```bash
session_metadata = Read(.workflow/active/{session_id}/workflow-session.json)
original_topic = session_metadata.topic
selected_roles = session_metadata.selected_roles
```

**Step 3.2: Prepare Agent Context**
```javascript
const agentContext = {
  role_name: role_name,
  role_config: roleConfig[role_name],
  output_location: `${brainstorm_dir}/${role_name}/`,
  framework_mode: framework_mode,
  framework_path: framework_mode ? `${brainstorm_dir}/guidance-specification.md` : null,
  update_mode: update_mode,
  user_context: user_context,
  original_topic: original_topic,
  session_id: session_id
};
```

**Step 3.3: Execute Conceptual Planning Agent**

**Framework-Based Analysis** (when guidance-specification.md exists):
```javascript
Task(
  subagent_type="conceptual-planning-agent",
  run_in_background=false,
  description=`Generate ${role_name} analysis`,
  prompt=`
[FLOW_CONTROL]

Execute ${role_name} analysis for existing topic framework

## Context Loading
ASSIGNED_ROLE: ${role_name}
OUTPUT_LOCATION: ${agentContext.output_location}
ANALYSIS_MODE: ${framework_mode ? "framework_based" : "standalone"}
UPDATE_MODE: ${update_mode}

## Flow Control Steps
1. **load_topic_framework**
   - Action: Load structured topic discussion framework
   - Command: Read(${agentContext.framework_path})
   - Output: topic_framework_content

2. **load_role_template**
   - Action: Load ${role_name} planning template
   - Command: Read(${roleConfig[role_name].template})
   - Output: role_template_guidelines

3. **load_session_metadata**
   - Action: Load session metadata and user intent
   - Command: Read(.workflow/active/${session_id}/workflow-session.json)
   - Output: session_context

4. **load_user_context** (if exists)
   - Action: Load interactive context responses
   - Command: Read(${brainstorm_dir}/${role_name}/${role_name}-context.md)
   - Output: user_context_answers

5. **${update_mode ? 'load_existing_analysis' : 'skip'}**
   ${update_mode ? `
   - Action: Load existing analysis for incremental update
   - Command: Read(${brainstorm_dir}/${role_name}/analysis.md)
   - Output: existing_analysis_content
   ` : ''}

## Analysis Requirements
**Primary Reference**: Original user prompt from workflow-session.json is authoritative
**Framework Source**: Address all discussion points in guidance-specification.md from ${role_name} perspective
**User Context Integration**: Incorporate interactive Q&A responses into analysis
**Role Focus**: ${roleConfig[role_name].focus_area}
**Template Integration**: Apply role template guidelines within framework structure

## Expected Deliverables
1. **analysis.md** (main document, optionally with analysis-{slug}.md sub-documents)
2. **Framework Reference**: @../guidance-specification.md (if framework_mode)
3. **User Context Reference**: @./${role_name}-context.md (if user context exists)
4. **User Intent Alignment**: Validate against session_context

## Update Requirements (if UPDATE_MODE)
- **Preserve Structure**: Maintain existing analysis structure
- **Add "Clarifications" Section**: Document new user context with timestamp
- **Merge Insights**: Integrate new perspectives without removing existing content
- **Resolve Conflicts**: If new context contradicts existing analysis, document both and recommend resolution

## Completion Criteria
- Address each discussion point from guidance-specification.md with ${role_name} expertise
- Provide actionable recommendations from ${role_name} perspective within analysis files
- All output files MUST start with "analysis" prefix (no recommendations.md or other naming)
- Reference framework document using @ notation for integration
- Update workflow-session.json with completion status
`
);
```

### Phase 4: Validation & Finalization

**Step 4.1: Validate Output**
```bash
VERIFY EXISTS: ${brainstorm_dir}/${role_name}/analysis.md
VERIFY CONTAINS: "@../guidance-specification.md" (if framework_mode)
IF user_context EXISTS:
  VERIFY CONTAINS: "@./${role_name}-context.md" OR "## Clarifications" section
```

**Step 4.2: Update Session Metadata**
```json
{
  "phases": {
    "BRAINSTORM": {
      "${role_name}": {
        "status": "${update_mode ? 'updated' : 'completed'}",
        "completed_at": "timestamp",
        "framework_addressed": true,
        "context_gathered": user_context ? true : false,
        "output_location": "${brainstorm_dir}/${role_name}/analysis.md",
        "update_history": [
          {
            "timestamp": "ISO8601",
            "mode": "${update_mode ? 'incremental' : 'initial'}",
            "context_questions": question_count
          }
        ]
      }
    }
  }
}
```

**Step 4.3: Completion Report**
```markdown
✅ ${roleConfig[role_name].title} Analysis Complete

**Output**: ${brainstorm_dir}/${role_name}/analysis.md
**Mode**: ${update_mode ? 'Incremental Update' : 'New Generation'}
**Framework**: ${framework_mode ? '✓ Aligned' : '✗ Standalone'}
**Context Questions**: ${question_count} answered

${update_mode ? '
**Changes**:
- Added "Clarifications" section with new user context
- Merged new insights into existing sections
- Resolved conflicts with framework alignment
' : ''}

**Next Steps**:
${selected_roles.length > 1 ? `
  - Continue with other roles: ${selected_roles.filter(r => r !== role_name).join(', ')}
  - Run synthesis: /workflow:brainstorm:synthesis --session ${session_id}
` : `
  - Clarify insights: /workflow:brainstorm:synthesis --session ${session_id}
  - Generate plan: /workflow:plan --session ${session_id}
`}
```

---

## 📋 **TodoWrite Integration**

### Workflow Progress Tracking

```javascript
TodoWrite({
  todos: [
    {
      content: "Phase 1: Detect session and validate role configuration",
      status: "in_progress",
      activeForm: "Detecting session and role"
    },
    {
      content: "Phase 2: Interactive context gathering with AskUserQuestion",
      status: "pending",
      activeForm: "Gathering user context"
    },
    {
      content: "Phase 3: Execute conceptual-planning-agent for role analysis",
      status: "pending",
      activeForm: "Executing agent analysis"
    },
    {
      content: "Phase 4: Validate output and update session metadata",
      status: "pending",
      activeForm: "Finalizing and validating"
    }
  ]
});
```

---

## 📊 **Output Structure**

### Directory Layout

```
.workflow/active/WFS-{session}/.brainstorming/
├── guidance-specification.md          # Framework (if exists)
└── {role-name}/
    ├── {role-name}-context.md         # Interactive Q&A responses
    ├── analysis.md                    # Main analysis (REQUIRED)
    └── analysis-{slug}.md             # Section documents (optional, max 5)
```

### Analysis Document Structure (New Generation)

```markdown
# ${roleConfig[role_name].title} Analysis: [Topic from Framework]

## Framework Reference
**Topic Framework**: @../guidance-specification.md
**Role Focus**: ${roleConfig[role_name].focus_area}
**User Context**: @./${role_name}-context.md

## User Context Summary
**Context Gathered**: ${question_count} questions answered
**Categories**: ${question_categories.join(', ')}

${user_context ? formatContextSummary(user_context) : ''}

## Discussion Points Analysis
[Address each point from guidance-specification.md with ${role_name} expertise]

### Core Requirements (from framework)
[Role-specific perspective on requirements]

### Technical Considerations (from framework)
[Role-specific technical analysis]

### User Experience Factors (from framework)
[Role-specific UX considerations]

### Implementation Challenges (from framework)
[Role-specific challenges and solutions]

### Success Metrics (from framework)
[Role-specific metrics and KPIs]

## ${roleConfig[role_name].title} Specific Recommendations
[Role-specific actionable strategies]

---
*Generated by ${role_name} analysis addressing structured framework*
*Context gathered: ${new Date().toISOString()}*
```

### Analysis Document Structure (Incremental Update)

```markdown
# ${roleConfig[role_name].title} Analysis: [Topic]

## Framework Reference
[Existing content preserved]

## Clarifications
### Session ${new Date().toISOString().split('T')[0]}
${Object.entries(user_context).map(([q, a]) => `
- **Q**: ${q} (Category: ${a.category})
  **A**: ${a.answer}
`).join('\n')}

## User Context Summary
[Updated with new context]

## Discussion Points Analysis
[Existing content enhanced with new insights]

[Rest of sections updated based on clarifications]
```

---

## 🔄 **Integration with Other Commands**

### Called By
- `/workflow:brainstorm:auto-parallel` (Phase 2 - parallel role execution)
- Manual invocation for single-role analysis

### Calls To
- `conceptual-planning-agent` (agent execution)
- `AskUserQuestion` (interactive context gathering)

### Coordinates With
- `/workflow:brainstorm:artifacts` (creates framework for role analysis)
- `/workflow:brainstorm:synthesis` (reads role analyses for integration)

---

## ✅ **Quality Assurance**

### Required Analysis Elements
- [ ] Framework discussion points addressed (if framework_mode)
- [ ] User context integrated (if context gathered)
- [ ] Role template guidelines applied
- [ ] Output files follow naming convention (analysis*.md only)
- [ ] Framework reference using @ notation
- [ ] Session metadata updated

### Context Quality
- [ ] Questions in Chinese with business context
- [ ] Options include technical trade-offs
- [ ] Categories aligned with role focus
- [ ] No generic questions unrelated to framework

### Update Quality (if update_mode)
- [ ] "Clarifications" section added with timestamp
- [ ] New insights merged without content loss
- [ ] Conflicts documented and resolved
- [ ] Framework alignment maintained

---

## 🎛️ **Command Parameters**

### Required Parameters
- `[role-name]`: Role identifier (ux-expert, ui-designer, system-architect, etc.)

### Optional Parameters
- `--session [session-id]`: Specify brainstorming session (auto-detect if omitted)
- `--update`: Force incremental update mode (auto-detect if analysis exists)
- `--include-questions`: Force context gathering even if analysis exists
- `--skip-questions`: Skip all interactive context gathering
- `--style-skill [package]`: For ui-designer only, load style SKILL package

### Parameter Combinations

| Scenario | Command | Behavior |
|----------|---------|----------|
| New analysis | `role-analysis ux-expert` | Generate + ask context questions |
| Quick generation | `role-analysis ux-expert --skip-questions` | Generate without context |
| Update existing | `role-analysis ux-expert --update` | Ask clarifications + merge |
| Force questions | `role-analysis ux-expert --include-questions` | Ask even if exists |
| Specific session | `role-analysis ux-expert --session WFS-xxx` | Target specific session |

---

## 🚫 **Error Handling**

### Invalid Role Name
```
ERROR: Unknown role: "ui-expert"
Valid roles: ux-expert, ui-designer, system-architect, product-manager,
            product-owner, scrum-master, subject-matter-expert,
            data-architect, api-designer
```

### No Active Session
```
ERROR: No active brainstorming session found
Run: /workflow:brainstorm:artifacts "[topic]" to create session
```

### Missing Framework (with warning)
```
WARN: No guidance-specification.md found
Generating standalone analysis without framework alignment
Recommend: Run /workflow:brainstorm:artifacts first for better results
```

### Agent Execution Failure
```
ERROR: Conceptual planning agent failed
Check: ${brainstorm_dir}/${role_name}/error.log
Action: Retry with --skip-questions or check framework validity
```

---

## 🔧 **Advanced Usage**

### Batch Role Generation (via auto-parallel)
```bash
# This command handles multiple roles in parallel
/workflow:brainstorm:auto-parallel "topic" --count 3
# → Internally calls role-analysis for each selected role
```

### Manual Multi-Role Workflow
```bash
# 1. Create framework
/workflow:brainstorm:artifacts "Build real-time collaboration platform" --count 3

# 2. Generate each role with context
/workflow:brainstorm:role-analysis system-architect --include-questions
/workflow:brainstorm:role-analysis ui-designer --include-questions
/workflow:brainstorm:role-analysis product-manager --include-questions

# 3. Synthesize insights
/workflow:brainstorm:synthesis --session WFS-xxx
```

### Iterative Refinement
```bash
# Initial generation
/workflow:brainstorm:role-analysis ux-expert

# User reviews and wants more depth
/workflow:brainstorm:role-analysis ux-expert --update --include-questions
# → Asks clarification questions, merges new insights
```

---

## 📚 **Reference Information**

### Role Template Locations
- Templates: `~/.claude/workflows/cli-templates/planning-roles/`
- Format: `{role-name}.md` (e.g., `ux-expert.md`, `system-architect.md`)

### Related Commands
- `/workflow:brainstorm:artifacts` - Create framework and select roles
- `/workflow:brainstorm:auto-parallel` - Parallel multi-role execution
- `/workflow:brainstorm:synthesis` - Integrate role analyses
- `/workflow:plan` - Generate implementation plan from synthesis

### Context Package
- Location: `.workflow/active/WFS-{session}/.process/context-package.json`
- Used by: `context-search-agent` (Phase 0 of artifacts)
- Contains: Project context, tech stack, conflict risks
