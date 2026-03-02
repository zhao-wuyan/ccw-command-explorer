# Phase 3: Role Analysis

Unified role-specific analysis generation with interactive context gathering, framework alignment, and incremental update support. Supports both parallel execution (auto mode, N roles simultaneously) and single-role execution.

## Objective

- Validate role name and detect session
- Gather interactive context via role-specific questions (optional)
- Execute conceptual-planning-agent with role template and framework
- Support feature-point output organization when feature list available
- Support incremental updates to existing analyses
- Validate output and update session metadata

## Supported Roles

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

## Execution

### Auto Mode Parallel Execution

When called from auto mode, launch N role-analysis calls simultaneously:

```javascript
// Single message with multiple Skill invokes for parallelism
// For each selected role:
Skill(skill="brainstorm", args="{role-name} --session {session-id} --skip-questions")

// For ui-designer with style-skill:
Skill(skill="brainstorm", args="ui-designer --session {session-id} --skip-questions --style-skill {style_skill_package}")
```

**Parallel Safety**: Each role operates independently on its own directory. No cross-agent dependencies.

### Step 3.1: Detection & Validation

**Step 3.1.1: Role Validation**
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

**Step 3.1.2: Session Detection**
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
    ERROR: "No active session. Run /brainstorm 'topic' first"
    EXIT

VALIDATE brainstorm_dir EXISTS
```

**Step 3.1.3: Framework Detection & Feature List Extraction**
```bash
framework_file = {brainstorm_dir}/guidance-specification.md
IF framework_file EXISTS:
  framework_mode = true
  LOAD framework_content
  # Extract Feature Decomposition table from guidance-specification.md
  feature_list = EXTRACT_TABLE(framework_content, "Feature Decomposition")
  # feature_list format: [{id: "F-001", slug: "real-time-sync", description: "...", roles: [...], priority: "High"}, ...]
  IF feature_list NOT EMPTY:
    feature_mode = true   # Use feature-point organization for sub-documents
  ELSE:
    feature_mode = false  # Fall back to arbitrary-topic organization
ELSE:
  WARN: "No framework found - will create standalone analysis"
  framework_mode = false
  feature_mode = false
```

**Step 3.1.4: Update Mode Detection**
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

### Step 3.2: Interactive Context Gathering

**Trigger Conditions**:
- Default: Always ask unless `--skip-questions` provided
- `--include-questions`: Force context gathering even if analysis exists
- `--skip-questions`: Skip all interactive questions

**Step 3.2.1: Load Role Configuration**
```javascript
const roleConfig = {
  'ux-expert': {
    title: 'UX专家',
    focus_area: 'User research, information architecture, user journey',
    question_categories: ['User Intent', 'Requirements', 'UX'],
    question_count: 4,
    template: '~/.ccw/workflows/cli-templates/planning-roles/ux-expert.md'
  },
  'ui-designer': {
    title: 'UI设计师',
    focus_area: 'Visual design, high-fidelity mockups, design systems',
    question_categories: ['Requirements', 'UX', 'Feasibility'],
    question_count: 4,
    template: '~/.ccw/workflows/cli-templates/planning-roles/ui-designer.md'
  },
  'system-architect': {
    title: '系统架构师',
    focus_area: 'Technical architecture, scalability, integration patterns',
    question_categories: ['Scale & Performance', 'Technical Constraints', 'Architecture Complexity', 'Non-Functional Requirements'],
    question_count: 5,
    template: '~/.ccw/workflows/cli-templates/planning-roles/system-architect.md'
  },
  'product-manager': {
    title: '产品经理',
    focus_area: 'Product strategy, roadmap, prioritization',
    question_categories: ['User Intent', 'Requirements', 'Process'],
    question_count: 4,
    template: '~/.ccw/workflows/cli-templates/planning-roles/product-manager.md'
  },
  'product-owner': {
    title: '产品负责人',
    focus_area: 'Backlog management, user stories, acceptance criteria',
    question_categories: ['Requirements', 'Decisions', 'Process'],
    question_count: 4,
    template: '~/.ccw/workflows/cli-templates/planning-roles/product-owner.md'
  },
  'scrum-master': {
    title: '敏捷教练',
    focus_area: 'Process facilitation, impediment removal, team dynamics',
    question_categories: ['Process', 'Risk', 'Decisions'],
    question_count: 3,
    template: '~/.ccw/workflows/cli-templates/planning-roles/scrum-master.md'
  },
  'subject-matter-expert': {
    title: '领域专家',
    focus_area: 'Domain knowledge, business rules, compliance',
    question_categories: ['Requirements', 'Feasibility', 'Terminology'],
    question_count: 4,
    template: '~/.ccw/workflows/cli-templates/planning-roles/subject-matter-expert.md'
  },
  'data-architect': {
    title: '数据架构师',
    focus_area: 'Data models, storage strategies, data flow',
    question_categories: ['Architecture', 'Scale & Performance', 'Technical Constraints', 'Feasibility'],
    question_count: 5,
    template: '~/.ccw/workflows/cli-templates/planning-roles/data-architect.md'
  },
  'api-designer': {
    title: 'API设计师',
    focus_area: 'API contracts, versioning, integration patterns',
    question_categories: ['Architecture', 'Requirements', 'Feasibility', 'Decisions'],
    question_count: 4,
    template: '~/.ccw/workflows/cli-templates/planning-roles/api-designer.md'
  }
};

config = roleConfig[role_name];
```

**Step 3.2.2: Generate Role-Specific Questions**

**9-Category Taxonomy**:

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

**Step 3.2.3: Multi-Round Question Execution**

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

**Question Quality Rules**:

**MUST Include**:
- ✅ All questions in Chinese (用中文提问)
- ✅ 业务场景作为问题前提
- ✅ 技术选项的业务影响说明
- ✅ 量化指标和约束条件

**MUST Avoid**:
- ❌ 纯技术选型无业务上下文
- ❌ 过度抽象的通用问题
- ❌ 脱离框架的重复询问

### Step 3.3: Agent Execution

**Step 3.3.1: Load Session Metadata**
```bash
session_metadata = Read(.workflow/active/{session_id}/workflow-session.json)
original_topic = session_metadata.topic
selected_roles = session_metadata.selected_roles
```

**Step 3.3.2: Prepare Agent Context**
```javascript
const agentContext = {
  role_name: role_name,
  role_config: roleConfig[role_name],
  output_location: `${brainstorm_dir}/${role_name}/`,
  framework_mode: framework_mode,
  feature_mode: feature_mode,
  feature_list: feature_mode ? feature_list : null,
  framework_path: framework_mode ? `${brainstorm_dir}/guidance-specification.md` : null,
  update_mode: update_mode,
  user_context: user_context,
  original_topic: original_topic,
  session_id: session_id
};
```

**Step 3.3.3: Execute Conceptual Planning Agent**

**Framework-Based Analysis** (when guidance-specification.md exists):
```javascript
// Build feature list injection block (only when feature_mode is true)
const featureListBlock = feature_mode ? `
## Feature Point List (from guidance-specification.md Feature Decomposition)
${feature_list.map(f => `- **${f.id}** (${f.slug}): ${f.description} [Priority: ${f.priority}]`).join('\n')}

**IMPORTANT - Feature-Point Output Organization**:
- Generate ONE sub-document per feature: analysis-F-{id}-{slug}.md (e.g., analysis-${feature_list[0].id}-${feature_list[0].slug}.md)
- Generate ONE cross-cutting document: analysis-cross-cutting.md
- analysis.md is a role overview INDEX only (< 1500 words), NOT a full analysis
- Each feature sub-document < 2000 words, cross-cutting < 2000 words
- Total across all files < 15000 words
` : `
## Output Organization (fallback: no feature list available)
- Generate analysis.md as main document (< 3000 words)
- Optionally split into analysis-{slug}.md sub-documents (max 5, < 2000 words each)
- Total < 15000 words
`;

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
FEATURE_MODE: ${feature_mode}
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

${featureListBlock}

## Analysis Requirements
**Primary Reference**: Original user prompt from workflow-session.json is authoritative
**Framework Source**: Address all discussion points in guidance-specification.md from ${role_name} perspective
**User Context Integration**: Incorporate interactive Q&A responses into analysis
**Role Focus**: ${roleConfig[role_name].focus_area}
**Template Integration**: Apply role template guidelines within framework structure
${feature_mode ? `**Feature Organization**: Organize analysis by feature points - each feature gets its own sub-document. Cross-cutting concerns go into analysis-cross-cutting.md.` : ''}

## Expected Deliverables
${feature_mode ? `
1. **analysis.md** - Role overview index (< 1500 words): role perspective summary, feature point index with @-references to sub-documents, cross-cutting summary
2. **analysis-cross-cutting.md** - Cross-feature decisions (< 2000 words): architecture decisions, technology choices, shared patterns that span multiple features
3. **analysis-F-{id}-{slug}.md** - One per feature (< 2000 words each): role-specific analysis, recommendations, considerations for that feature
4. **Framework Reference**: @../guidance-specification.md (if framework_mode)
5. **User Context Reference**: @./${role_name}-context.md (if user context exists)
6. **User Intent Alignment**: Validate against session_context
` : `
1. **analysis.md** (main document, optionally with analysis-{slug}.md sub-documents)
2. **Framework Reference**: @../guidance-specification.md (if framework_mode)
3. **User Context Reference**: @./${role_name}-context.md (if user context exists)
4. **User Intent Alignment**: Validate against session_context
`}

## Update Requirements (if UPDATE_MODE)
- **Preserve Structure**: Maintain existing analysis structure
- **Add "Clarifications" Section**: Document new user context with timestamp
- **Merge Insights**: Integrate new perspectives without removing existing content
- **Resolve Conflicts**: If new context contradicts existing analysis, document both and recommend resolution

## Completion Criteria
- Address each discussion point from guidance-specification.md with ${role_name} expertise
- Provide actionable recommendations from ${role_name} perspective within analysis files
- All output files MUST start with "analysis" prefix (no recommendations.md or other naming)
${feature_mode ? `- Each feature from the feature list has a corresponding analysis-F-{id}-{slug}.md file
- analysis-cross-cutting.md exists with cross-feature decisions
- analysis.md serves as index (< 1500 words), NOT a full analysis document` : ''}
- Reference framework document using @ notation for integration
- Update workflow-session.json with completion status
`
);
```

### Step 3.4: Validation & Finalization

**Step 3.4.1: Validate Output**
```bash
VERIFY EXISTS: ${brainstorm_dir}/${role_name}/analysis.md
VERIFY CONTAINS: "@../guidance-specification.md" (if framework_mode)
IF user_context EXISTS:
  VERIFY CONTAINS: "@./${role_name}-context.md" OR "## Clarifications" section
```

**Step 3.4.2: Update Session Metadata**
```json
{
  "phases": {
    "BRAINSTORM": {
      "${role_name}": {
        "status": "${update_mode ? 'updated' : 'completed'}",
        "completed_at": "timestamp",
        "framework_addressed": true,
        "context_gathered": true,
        "output_location": "${brainstorm_dir}/${role_name}/analysis.md",
        "update_history": [
          {
            "timestamp": "ISO8601",
            "mode": "${update_mode ? 'incremental' : 'initial'}",
            "context_questions": "question_count"
          }
        ]
      }
    }
  }
}
```

**Step 3.4.3: Completion Report**
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
  - Run synthesis: /brainstorm --session ${session_id} (auto mode)
` : `
  - Clarify insights: /brainstorm --session ${session_id} (auto mode)
  - Generate plan: /workflow-plan --session ${session_id}
`}
```

## Output

### Directory Layout

**Feature-point mode** (when `feature_list` available):
```
.workflow/active/WFS-{session}/.brainstorming/
├── guidance-specification.md
└── {role-name}/
    ├── {role-name}-context.md             # Interactive Q&A responses
    ├── analysis.md                        # Role overview INDEX (< 1500 words)
    ├── analysis-cross-cutting.md          # Cross-feature decisions (< 2000 words)
    ├── analysis-F-001-{slug}.md           # Per-feature analysis (< 2000 words)
    ├── analysis-F-002-{slug}.md
    └── analysis-F-00N-{slug}.md           # One per feature (max 8)
```

**Fallback mode** (when `feature_list` NOT available):
```
.workflow/active/WFS-{session}/.brainstorming/
├── guidance-specification.md
└── {role-name}/
    ├── {role-name}-context.md         # Interactive Q&A responses
    ├── analysis.md                    # Main analysis (REQUIRED)
    └── analysis-{slug}.md            # Section documents (optional, max 5)
```

### Document Structure Templates

#### Feature-Point Mode: analysis.md (Role Overview Index, < 1500 words)

```markdown
# ${roleConfig[role_name].title} Analysis: [Topic from Framework]

## Framework Reference
**Topic Framework**: @../guidance-specification.md
**Role Focus**: ${roleConfig[role_name].focus_area}
**User Context**: @./${role_name}-context.md

## Role Perspective Overview
[Brief summary of this role's perspective on the overall project]

## Feature Point Index
| Feature | Sub-document | Key Insight |
|---------|-------------|-------------|
| F-001: [name] | @./analysis-F-001-{slug}.md | [One-line summary] |
| F-002: [name] | @./analysis-F-002-{slug}.md | [One-line summary] |

## Cross-Cutting Summary
**Full analysis**: @./analysis-cross-cutting.md
[Brief overview of cross-feature decisions and shared patterns]

---
*Generated by ${role_name} analysis addressing structured framework*
```

#### Feature-Point Mode: analysis-cross-cutting.md (< 2000 words)

```markdown
# Cross-Cutting Analysis: ${roleConfig[role_name].title}

## Architecture Decisions
[Decisions that span multiple features]

## Technology Choices
[Shared technology selections and rationale]

## Shared Patterns
[Common patterns, constraints, and conventions across features]

## ${roleConfig[role_name].title} Recommendations
[Role-wide strategic recommendations]
```

#### Feature-Point Mode: analysis-F-{id}-{slug}.md (< 2000 words each)

```markdown
# Feature ${id}: [Feature Name] - ${roleConfig[role_name].title} Analysis

## Feature Overview
[Role-specific perspective on this feature's scope and goals]

## Analysis
[Detailed role-specific analysis for this feature]

## Recommendations
[Actionable recommendations for this feature from role perspective]

## Dependencies & Risks
[Cross-feature dependencies and risks from role viewpoint]
```

#### Fallback Mode: analysis.md (New Generation)

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

#### Incremental Update Structure

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

### Parameter Combinations

| Scenario | Command | Behavior |
|----------|---------|----------|
| New analysis | `/brainstorm ux-expert` | Generate + ask context questions |
| Quick generation | `/brainstorm ux-expert --skip-questions` | Generate without context |
| Update existing | `/brainstorm ux-expert --update` | Ask clarifications + merge |
| Force questions | `/brainstorm ux-expert --include-questions` | Ask even if exists |
| Specific session | `/brainstorm ux-expert --session WFS-xxx` | Target specific session |

### Quality Assurance

**Required Analysis Elements**:
- [ ] Framework discussion points addressed (if framework_mode)
- [ ] User context integrated (if context gathered)
- [ ] Role template guidelines applied
- [ ] Output files follow naming convention (analysis*.md only)
- [ ] Framework reference using @ notation
- [ ] Session metadata updated
- [ ] Feature-point organization used when feature_list available (if feature_mode)
- [ ] analysis.md is index only (< 1500 words) when in feature_mode
- [ ] analysis-cross-cutting.md exists when in feature_mode
- [ ] One analysis-F-{id}-{slug}.md per feature when in feature_mode

**Context Quality**:
- [ ] Questions in Chinese with business context
- [ ] Options include technical trade-offs
- [ ] Categories aligned with role focus
- [ ] No generic questions unrelated to framework

**Update Quality** (if update_mode):
- [ ] "Clarifications" section added with timestamp
- [ ] New insights merged without content loss
- [ ] Conflicts documented and resolved
- [ ] Framework alignment maintained

- **TodoWrite**: Mark Phase 3 completed (auto mode: collapse N parallel sub-tasks to summary)

## Error Handling

| Error | Recovery |
|-------|----------|
| Invalid role name | Show valid roles list, exit |
| No active session | Error with guidance to run /brainstorm first |
| Missing framework | Warn and generate standalone analysis |
| Agent execution failure | Check error.log, retry with --skip-questions |

## Advanced Usage

### Batch Role Generation (via auto mode)
```bash
# Auto mode handles multiple roles in parallel
/brainstorm "topic" --count 3
# → Internally calls role-analysis for each selected role with --skip-questions
```

### Manual Multi-Role Workflow
```bash
# 1. Create framework
/brainstorm "Build real-time collaboration platform" --count 3

# 2. Generate each role with context
/brainstorm system-architect --include-questions
/brainstorm ui-designer --include-questions
/brainstorm product-manager --include-questions

# 3. Synthesize insights
/brainstorm --session WFS-xxx
```

### Iterative Refinement
```bash
# Initial generation
/brainstorm ux-expert

# User reviews and wants more depth
/brainstorm ux-expert --update --include-questions
# → Asks clarification questions, merges new insights
```

## Next Phase

Return to orchestrator:
- If auto mode → Continue to [Phase 4: Synthesis](04-synthesis.md)
- If single-role mode → Workflow complete, report results
