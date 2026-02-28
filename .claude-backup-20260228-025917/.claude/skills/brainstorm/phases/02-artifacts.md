# Phase 2: Interactive Framework Generation (Artifacts)

Seven-phase interactive workflow generating confirmed guidance specification through role-based analysis and synthesis. This phase handles all user interaction for topic exploration, role selection, and decision gathering.

## Objective

- Collect project context automatically (Phase 0)
- Analyze topic and extract keywords/challenges (Phase 1)
- Select roles via intelligent recommendation + user confirmation (Phase 2)
- Generate deep role-specific questions (Phase 3)
- Resolve cross-role conflicts (Phase 4)
- Final clarification and feature decomposition (Phase 4.5)
- Generate declarative guidance-specification.md (Phase 5)

## Auto Mode

When `--yes` or `-y`: Auto-select recommended roles, skip all clarification questions, use default answers.

## TodoWrite Integration

**TodoWrite Rule**: EXTEND auto-parallel's task list (NOT replace/overwrite)

**When called from auto mode**:
- Find artifacts parent task → Mark "in_progress"
- APPEND sub-tasks (Phase 0-5) → Mark each as completes
- When Phase 5 completes → Mark parent "completed"
- PRESERVE all other auto-parallel tasks

**Standalone Mode**:
```json
[
  {"content": "Initialize session", "status": "pending", "activeForm": "Initializing"},
  {"content": "Phase 0: Context collection", "status": "pending", "activeForm": "Phase 0"},
  {"content": "Phase 1: Topic analysis (2-4 questions)", "status": "pending", "activeForm": "Phase 1"},
  {"content": "Phase 2: Role selection", "status": "pending", "activeForm": "Phase 2"},
  {"content": "Phase 3: Role questions (per role)", "status": "pending", "activeForm": "Phase 3"},
  {"content": "Phase 4: Conflict resolution", "status": "pending", "activeForm": "Phase 4"},
  {"content": "Phase 4.5: Final clarification + Feature decomposition", "status": "pending", "activeForm": "Phase 4.5"},
  {"content": "Phase 5: Generate specification", "status": "pending", "activeForm": "Phase 5"}
]
```

## Execution

### Session Management

- Check `.workflow/active/` for existing sessions
- Multiple → Prompt selection | Single → Use it | None → Create `WFS-[topic-slug]`
- Parse `--count N` parameter (default: 3)
- Store decisions in `workflow-session.json`

### Phase 0: Context Collection

**Goal**: Gather project context BEFORE user interaction

**Steps**:
1. Check if `context-package.json` exists → Skip if valid
2. Invoke `context-search-agent` (BRAINSTORM MODE - lightweight)
3. Output: `.workflow/active/WFS-{session-id}/.process/context-package.json`

**Graceful Degradation**: If agent fails, continue to Phase 1 without context

```javascript
Task(
  subagent_type="context-search-agent",
  run_in_background=false,
  description="Gather project context for brainstorm",
  prompt=`
Execute context-search-agent in BRAINSTORM MODE (Phase 1-2 only).

Session: ${session_id}
Task: ${task_description}
Output: .workflow/${session_id}/.process/context-package.json

Required fields: metadata, project_context, assets, dependencies, conflict_detection
`
)
```

### Phase 1: Topic Analysis

**Goal**: Extract keywords/challenges enriched by Phase 0 context

**Steps**:
1. Load Phase 0 context (tech_stack, modules, conflict_risk)
2. Deep topic analysis (entities, challenges, constraints, metrics)
3. Generate 2-4 context-aware probing questions
4. AskUserQuestion → Store to `session.intent_context`

**Example**:
```javascript
AskUserQuestion({
  questions: [
    {
      question: "实时协作平台的主要技术挑战？",
      header: "核心挑战",
      multiSelect: false,
      options: [
        { label: "实时数据同步", description: "100+用户同时在线，状态同步复杂度高" },
        { label: "可扩展性架构", description: "用户规模增长时的系统扩展能力" },
        { label: "冲突解决机制", description: "多用户同时编辑的冲突处理策略" }
      ]
    },
    {
      question: "MVP阶段最关注的指标？",
      header: "优先级",
      multiSelect: false,
      options: [
        { label: "功能完整性", description: "实现所有核心功能" },
        { label: "用户体验", description: "流畅的交互体验和响应速度" },
        { label: "系统稳定性", description: "高可用性和数据一致性" }
      ]
    }
  ]
})
```

**⚠️ CRITICAL**: Questions MUST reference topic keywords. Generic "Project type?" violates dynamic generation.

### Phase 2: Role Selection

**Goal**: User selects roles from intelligent recommendations

**Available Roles**: data-architect, product-manager, product-owner, scrum-master, subject-matter-expert, system-architect, test-strategist, ui-designer, ux-expert

**Steps**:
1. Analyze Phase 1 keywords → Recommend count+2 roles with rationale
2. AskUserQuestion (multiSelect=true) → Store to `session.selected_roles`
3. If count+2 > 4, split into multiple rounds

**Example**:
```javascript
AskUserQuestion({
  questions: [{
    question: "请选择 3 个角色参与头脑风暴分析",
    header: "角色选择",
    multiSelect: true,
    options: [
      { label: "system-architect", description: "实时同步架构设计和技术选型" },
      { label: "ui-designer", description: "协作界面用户体验和状态展示" },
      { label: "product-manager", description: "功能优先级和MVP范围决策" },
      { label: "data-architect", description: "数据同步模型和存储方案设计" }
    ]
  }]
})
```

**⚠️ CRITICAL**: User MUST interact. NEVER auto-select without confirmation (unless --yes flag).

### Phase 3: Role-Specific Questions

**Goal**: Generate deep questions mapping role expertise to Phase 1 challenges

**Algorithm**:
1. FOR each selected role:
   - Map Phase 1 challenges to role domain
   - Generate 3-4 questions (implementation depth, trade-offs, edge cases)
   - AskUserQuestion per role → Store to `session.role_decisions[role]`
2. Process roles sequentially (one at a time for clarity)
3. If role needs > 4 questions, split into multiple rounds

**Example** (system-architect):
```javascript
AskUserQuestion({
  questions: [
    {
      question: "100+ 用户实时状态同步方案？",
      header: "状态同步",
      multiSelect: false,
      options: [
        { label: "Event Sourcing", description: "完整事件历史，支持回溯，存储成本高" },
        { label: "集中式状态管理", description: "实现简单，单点瓶颈风险" },
        { label: "CRDT", description: "去中心化，自动合并，学习曲线陡" }
      ]
    },
    {
      question: "两个用户同时编辑冲突如何解决？",
      header: "冲突解决",
      multiSelect: false,
      options: [
        { label: "自动合并", description: "用户无感知，可能产生意外结果" },
        { label: "手动解决", description: "用户控制，增加交互复杂度" },
        { label: "版本控制", description: "保留历史，需要分支管理" }
      ]
    }
  ]
})
```

### Phase 4: Conflict Resolution

**Goal**: Resolve ACTUAL conflicts from Phase 3 answers

**Algorithm**:
1. Analyze Phase 3 answers for conflicts:
   - Contradictory choices (e.g., "fast iteration" vs "complex Event Sourcing")
   - Missing integration (e.g., "Optimistic updates" but no conflict handling)
   - Implicit dependencies (e.g., "Live cursors" but no auth defined)
2. Generate clarification questions referencing SPECIFIC Phase 3 choices
3. AskUserQuestion (max 4 per call, multi-round) → Store to `session.cross_role_decisions`
4. If NO conflicts: Skip Phase 4 (inform user: "未检测到跨角色冲突，跳过Phase 4")

**Example**:
```javascript
AskUserQuestion({
  questions: [{
    question: "CRDT 与 UI 回滚期望冲突，如何解决？\n背景：system-architect选择CRDT，ui-designer期望回滚UI",
    header: "架构冲突",
    multiSelect: false,
    options: [
      { label: "采用 CRDT", description: "保持去中心化，调整UI期望" },
      { label: "显示合并界面", description: "增加用户交互，展示冲突详情" },
      { label: "切换到 OT", description: "支持回滚，增加服务器复杂度" }
    ]
  }]
})
```

### Phase 4.5: Final Clarification

**Purpose**: Ensure no important points missed before generating specification

**Steps**:
1. Ask initial check:
   ```javascript
   AskUserQuestion({
     questions: [{
       question: "在生成最终规范之前，是否有前面未澄清的重点需要补充？",
       header: "补充确认",
       multiSelect: false,
       options: [
         { label: "无需补充", description: "前面的讨论已经足够完整" },
         { label: "需要补充", description: "还有重要内容需要澄清" }
       ]
     }]
   })
   ```
2. If "需要补充":
   - Analyze user's additional points
   - Generate progressive questions (not role-bound, interconnected)
   - AskUserQuestion (max 4 per round) → Store to `session.additional_decisions`
   - Repeat until user confirms completion
3. If "无需补充": Proceed to Feature Decomposition

**Progressive Pattern**: Questions interconnected, each round informs next, continue until resolved.

#### Feature Decomposition

After final clarification, extract implementable feature units from all Phase 1-4 decisions.

**Steps**:
1. Analyze all accumulated decisions (`intent_context` + `role_decisions` + `cross_role_decisions` + `additional_decisions`)
2. Extract candidate features: each must be an independently implementable unit with clear boundaries
3. Generate candidate list (max 8 features) with structured format:
   - Feature ID: `F-{3-digit}` (e.g., F-001)
   - Name: kebab-case slug (e.g., `real-time-sync`, `user-auth`)
   - Description: one-sentence summary of the feature's scope
   - Related roles: which roles' decisions drive this feature
   - Priority: High / Medium / Low
4. Present candidate list to user for confirmation:
   ```javascript
   AskUserQuestion({
     questions: [{
       question: "以下是从讨论中提取的功能点清单：\n\nF-001: [name] - [description]\nF-002: [name] - [description]\n...\n\n是否需要调整？",
       header: "功能点确认",
       multiSelect: false,
       options: [
         { label: "确认无误", description: "功能点清单完整且合理，继续生成规范" },
         { label: "需要调整", description: "需要增加、删除或修改功能点" }
       ]
     }]
   })
   ```
5. If "需要调整": Collect adjustments and re-present until user confirms
6. Store confirmed list to `session.feature_list`

**Constraints**:
- Maximum 8 features (if more candidates, merge related items)
- Each feature MUST be independently implementable (no implicit cross-feature dependencies)
- Feature ID format: `F-{3-digit}` (F-001, F-002, ...)
- Feature slug: kebab-case, descriptive of the feature scope

**Granularity Guidelines** (用于验证功能点粒度是否合适):

| Signal | Too Coarse | Just Right | Too Fine |
|--------|-----------|------------|----------|
| 实现范围 | 需要 5+ 个独立模块协同 | 1-3 个模块，边界清晰 | 单个函数或单个 API 端点 |
| 角色关注 | 所有角色都深度涉及 | 2-4 个角色有实质贡献 | 仅 1 个角色关注 |
| 可测试性 | 无法写出清晰的验收标准 | 可定义 3-5 条可测量验收标准 | 验收标准等同于单元测试 |
| 依赖关系 | 与其他功能点循环依赖 | 依赖关系单向且可识别 | 无任何外部依赖（可能遗漏） |

**Quality Validation** (Step 3 提取候选功能点后，逐条验证):
1. **独立性检查**: 该功能点是否可以在其他功能点未完成时独立交付？若否 → 考虑合并或重新划分
2. **完整性检查**: 该功能点是否覆盖了一个用户可感知的完整价值？若否 → 可能太细，考虑合并
3. **粒度均衡检查**: 各功能点之间的复杂度是否大致均衡（最大不超过最小的 3 倍）？若否 → 拆分过大的或合并过小的
4. **边界清晰检查**: 是否能用一句话描述该功能点的输入和输出？若否 → 边界模糊，需重新定义

**Handling Vague Requirements** (当用户需求模糊时的额外步骤):
- 如果 Phase 1-4 的决策不足以支撑功能点分解（如缺少具体业务场景、技术选型未定），在 Step 4 确认时**主动告知用户**哪些功能点的粒度可能不够精确
- 对不确定的功能点标注 `Priority: TBD`，在后续 synthesis 阶段通过跨角色分析进一步明确
- 如果候选功能点 ≤ 2 个，可能是需求过于抽象 → 提示用户补充更多具体场景后再分解

### Phase 5: Generate Specification

**Steps**:
1. Load all decisions: `intent_context` + `selected_roles` + `role_decisions` + `cross_role_decisions` + `additional_decisions` + `feature_list`
2. Transform Q&A to declarative: Questions → Headers, Answers → CONFIRMED/SELECTED statements
3. Generate `guidance-specification.md`
4. Update `workflow-session.json` (metadata only)
5. Validate: No interrogative sentences, all decisions traceable

## Question Guidelines

### Core Principle

**Target**: 开发者（理解技术但需要从用户需求出发）

**Question Structure**: `[业务场景/需求前提] + [技术关注点]`
**Option Structure**: `标签：[技术方案] + 说明：[业务影响] + [技术权衡]`

### Quality Rules

**MUST Include**:
- ✅ All questions in Chinese (用中文提问)
- ✅ 业务场景作为问题前提
- ✅ 技术选项的业务影响说明
- ✅ 量化指标和约束条件

**MUST Avoid**:
- ❌ 纯技术选型无业务上下文
- ❌ 过度抽象的用户体验问题
- ❌ 脱离话题的通用架构问题

### Phase-Specific Requirements

| Phase | Focus | Key Requirements |
|-------|-------|------------------|
| 1 | 意图理解 | Reference topic keywords, 用户场景、业务约束、优先级 |
| 2 | 角色推荐 | Intelligent analysis (NOT keyword mapping), explain relevance |
| 3 | 角色问题 | Reference Phase 1 keywords, concrete options with trade-offs |
| 4 | 冲突解决 | Reference SPECIFIC Phase 3 choices, explain impact on both roles |

### Multi-Round Execution Pattern

```javascript
const BATCH_SIZE = 4;
for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
  const batch = allQuestions.slice(i, i + BATCH_SIZE);
  AskUserQuestion({ questions: batch });
  // Store responses before next round
}
```

## Output

### Generated Files

**File**: `.workflow/active/WFS-{topic}/.brainstorming/guidance-specification.md`

```markdown
# [Project] - Confirmed Guidance Specification

**Metadata**: [timestamp, type, focus, roles]

## 1. Project Positioning & Goals
**CONFIRMED Objectives**: [from topic + Phase 1]
**CONFIRMED Success Criteria**: [from Phase 1 answers]

## 2-N. [Role] Decisions
### SELECTED Choices
**[Question topic]**: [User's answer]
- **Rationale**: [From option description]
- **Impact**: [Implications]

### Cross-Role Considerations
**[Conflict resolved]**: [Resolution from Phase 4]
- **Affected Roles**: [Roles involved]

## Cross-Role Integration
**CONFIRMED Integration Points**: [API/Data/Auth from multiple roles]

## Risks & Constraints
**Identified Risks**: [From answers] → Mitigation: [Approach]

## Next Steps
**⚠️ Automatic Continuation** (when called from auto mode):
- Auto mode assigns agents for role-specific analysis
- Each selected role gets conceptual-planning-agent
- Agents read this guidance-specification.md for context

## Feature Decomposition

**Constraints**: Max 8 features | Each independently implementable | ID format: F-{3-digit}

| Feature ID | Name | Description | Related Roles | Priority |
|------------|------|-------------|---------------|----------|
| F-001 | [kebab-case-slug] | [One-sentence scope] | [role1, role2] | High/Medium/Low |
| F-002 | [kebab-case-slug] | [One-sentence scope] | [role1] | High/Medium/Low |

## Appendix: Decision Tracking
| Decision ID | Category | Question | Selected | Phase | Rationale |
|-------------|----------|----------|----------|-------|-----------|
| D-001 | Intent | [Q] | [A] | 1 | [Why] |
| D-002 | Roles | [Selected] | [Roles] | 2 | [Why] |
| D-003+ | [Role] | [Q] | [A] | 3 | [Why] |
```

### Session Metadata

```json
{
  "session_id": "WFS-{topic-slug}",
  "type": "brainstorming",
  "topic": "{original user input}",
  "selected_roles": ["system-architect", "ui-designer", "product-manager"],
  "phase_completed": "artifacts",
  "timestamp": "2025-10-24T10:30:00Z",
  "count_parameter": 3,
  "style_skill_package": null
}
```

**⚠️ Rule**: Session JSON stores ONLY metadata. All guidance content goes to guidance-specification.md.

### Validation Checklist

- ✅ No interrogative sentences (use CONFIRMED/SELECTED)
- ✅ Every decision traceable to user answer
- ✅ Cross-role conflicts resolved or documented
- ✅ Next steps concrete and specific
- ✅ No content duplication between .json and .md
- ✅ Feature Decomposition table present with validated entries

### Governance Rules

- All decisions MUST use CONFIRMED/SELECTED (NO "?" in decision sections)
- Every decision MUST trace to user answer
- Conflicts MUST be resolved (not marked "TBD")
- Next steps MUST be actionable
- Topic preserved as authoritative reference

**CRITICAL**: Guidance is single source of truth for downstream phases. Ambiguity violates governance.

### Update Mechanism

```
IF guidance-specification.md EXISTS:
  Prompt: "Regenerate completely / Update sections / Cancel"
ELSE:
  Run full Phase 0-5 flow
```

- **TodoWrite**: Mark Phase 2 completed, collapse sub-tasks to summary

## Next Phase

Return to orchestrator, then auto-continue to [Phase 3: Role Analysis](03-role-analysis.md) (auto mode: parallel execution for all selected roles).
