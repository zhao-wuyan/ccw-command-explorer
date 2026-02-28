# Phase 4: Synthesis Integration

Six-phase workflow to eliminate ambiguities, generate per-feature specifications through cross-role analysis and user clarification, with conditional quality review.

## Objective

- Discover and validate all role analysis files (read-only, never modify originals)
- Execute cross-role analysis to identify consensus, conflicts, and gaps
- Present enhancement recommendations and clarification questions to user
- Generate consolidated feature specifications as final synthesis artifact
- Conditional quality review based on task complexity
- Update context package and session metadata

## Design Principles

1. **原始角色产出不可变** — 角色分析文档是各角色的原始视角，综合阶段只读不写
2. **Spec 作为最终信物** — 所有综合决策、冲突解决、用户澄清都体现在 spec 中，不倒灌回角色文档
3. **单 Agent 顺序生成** — 一个 Spec Agent 加载一次上下文，顺序生成所有 spec，跨 feature 决策可传递复用
4. **按需校验** — Review Agent 由 Spec Agent 根据复杂度自判断触发，非必须环节

## Auto Mode

When `--yes` or `-y`: Auto-select all enhancements, skip clarification questions, use default answers.

## Quick Reference

### Phase Summary

| Phase | Goal | Executor | Output |
|-------|------|----------|--------|
| 1 | Session detection | Main flow | session_id, brainstorm_dir |
| 2 | File discovery | Main flow | role_analysis_paths |
| 3A | Cross-role analysis | Agent | enhancement_recommendations, feature_conflict_map |
| 4 | User interaction | Main flow + AskUserQuestion | spec_context |
| 5 | Spec generation + conditional review | Spec Agent → Review Agent | feature-specs/, feature-index.json, synthesis-changelog.md |
| 6 | Finalization | Main flow | context-package.json, report |

### AskUserQuestion Pattern

```javascript
// Enhancement selection (multi-select)
AskUserQuestion({
  questions: [{
    question: "请选择要应用的改进建议",
    header: "改进选择",
    multiSelect: true,
    options: [
      { label: "EP-001: API Contract", description: "添加详细的请求/响应 schema 定义" },
      { label: "EP-002: User Intent", description: "明确用户需求优先级和验收标准" }
    ]
  }]
})

// Clarification questions (single-select, multi-round)
AskUserQuestion({
  questions: [
    {
      question: "MVP 阶段的核心目标是什么？",
      header: "用户意图",
      multiSelect: false,
      options: [
        { label: "快速验证", description: "最小功能集，快速上线获取反馈" },
        { label: "技术壁垒", description: "完善架构，为长期发展打基础" },
        { label: "功能完整", description: "覆盖所有规划功能，延迟上线" }
      ]
    }
  ]
})
```

## Task Tracking

```json
[
  {"content": "Detect session and validate analyses", "status": "pending", "activeForm": "Detecting session"},
  {"content": "Discover role analysis file paths", "status": "pending", "activeForm": "Discovering paths"},
  {"content": "Execute analysis agent (cross-role analysis + feature conflict map)", "status": "pending", "activeForm": "Executing analysis"},
  {"content": "Present enhancements via AskUserQuestion", "status": "pending", "activeForm": "Selecting enhancements"},
  {"content": "Clarification questions via AskUserQuestion", "status": "pending", "activeForm": "Clarifying"},
  {"content": "Execute Spec Agent (generate specs + index + changelog)", "status": "pending", "activeForm": "Generating specs"},
  {"content": "Conditional Review Agent", "status": "pending", "activeForm": "Reviewing specs"},
  {"content": "Update context package and metadata", "status": "pending", "activeForm": "Finalizing"}
]
```

## Execution

### Phase 1: Discovery & Validation

1. **Detect Session**: Use `--session` parameter or find `.workflow/active/WFS-*`
2. **Validate Files**:
   - `guidance-specification.md` (optional, warn if missing)
   - `*/analysis*.md` (required, error if empty)
3. **Load User Intent**: Extract from `workflow-session.json`
4. **Detect Feature Mode**: Check if role analyses use feature-point organization
   ```javascript
   // Feature mode is active when:
   // 1. guidance-specification.md contains Feature Decomposition table
   // 2. Role directories contain analysis-F-{id}-*.md files
   const has_feature_decomposition = guidanceSpecContent &&
     guidanceSpecContent.includes('Feature Decomposition');
   const has_feature_subdocs = Glob(`${brainstorm_dir}/*/analysis-F-*-*.md`).length > 0;
   const feature_mode = has_feature_decomposition && has_feature_subdocs;

   // Extract feature_list from guidance-spec if feature_mode
   if (feature_mode) {
     feature_list = extractFeatureDecompositionTable(guidanceSpecContent);
     // feature_list: [{id, slug, description, roles, priority}, ...]
   }
   ```

### Phase 2: Role Discovery & Path Preparation

**Main flow prepares file paths for Agent**:

1. **Discover Analysis Files**:
   - Glob: `.workflow/active/WFS-{session}/.brainstorming/*/analysis*.md`
   - Supports: analysis.md + analysis-{slug}.md (max 5)

2. **Extract Role Information**:
   - `role_analysis_paths`: Relative paths
   - `participating_roles`: Role names from directories

3. **Pass to Agent**: session_id, brainstorm_dir, role_analysis_paths, participating_roles

### Phase 3A: Analysis & Enhancement Agent

**Agent executes cross-role analysis**:

**Input Optimization (feature_mode)**: When feature_mode is active, only read `{role}/analysis.md` index files (NOT sub-documents like `analysis-F-{id}-*.md` or `analysis-cross-cutting.md`). This reduces input tokens from ~39K to ~4.5K while preserving the role perspective overview, feature point index, and cross-cutting summary needed for conflict detection.

**Input (fallback mode)**: When feature_mode is NOT active, read all `{role}/analysis*.md` files as before.

```javascript
// Prepare input paths based on mode
const analysis_input_paths = feature_mode
  ? participating_roles.map(r => `${brainstorm_dir}/${r}/analysis.md`)  // Index files only (~4.5K total)
  : role_analysis_paths;  // All analysis files (fallback)

Task(conceptual-planning-agent, `
## Agent Mission
Analyze role documents, identify conflicts/gaps, generate enhancement recommendations.
${feature_mode ? 'Additionally, generate feature_conflict_map for per-feature consensus/conflicts across roles.' : ''}

## Input
- brainstorm_dir: ${brainstorm_dir}
- analysis_input_paths: ${analysis_input_paths}
- participating_roles: ${participating_roles}
- feature_mode: ${feature_mode}
${feature_mode ? `- guidance_spec_path: ${brainstorm_dir}/guidance-specification.md (read Feature Decomposition section only)` : ''}

## Flow Control Steps
1. load_session_metadata → Read workflow-session.json
2. load_role_analyses → Read analysis files from analysis_input_paths
   ${feature_mode ? '(INDEX files only - each ~500-800 words with role overview, feature index table, cross-cutting summary)' : '(All analysis files)'}
${feature_mode ? `3. load_feature_decomposition → Read Feature Decomposition table from guidance-specification.md
4. cross_role_analysis → Identify consensus, conflicts, gaps, ambiguities
5. generate_feature_conflict_map → For each feature in Feature Decomposition, extract per-feature consensus/conflicts/cross-references from role index summaries
6. generate_recommendations → Format as EP-001, EP-002, ...` : `3. cross_role_analysis → Identify consensus, conflicts, gaps, ambiguities
4. generate_recommendations → Format as EP-001, EP-002, ...`}

## Output Format

### enhancement_recommendations (always)
[
  {
    "id": "EP-001",
    "title": "API Contract Specification",
    "affected_roles": ["system-architect", "api-designer"],
    "category": "Architecture",
    "current_state": "High-level API descriptions",
    "enhancement": "Add detailed contract definitions",
    "rationale": "Enables precise implementation",
    "priority": "High"
  }
]

${feature_mode ? `### feature_conflict_map (feature_mode only)
Bridge artifact from Phase 3A to Phase 5. One entry per feature from Feature Decomposition.

{
  "F-001": {
    "consensus": [
      "All roles agree on real-time sync via WebSocket",
      "Event-driven architecture preferred"
    ],
    "conflicts": [
      {
        "topic": "State management approach",
        "views": {
          "system-architect": "Server-authoritative with CRDT",
          "ux-expert": "Optimistic local-first updates"
        },
        "resolution": "Hybrid: optimistic local with server reconciliation via CRDT because balances UX responsiveness with data consistency, tradeoff: increased client complexity",
        "confidence": "[RESOLVED]",
        "applies_when": "Online mode with collaborative editing"
      }
    ],
    "cross_refs": [
      "F-003 (offline-mode) depends on sync conflict resolution strategy"
    ]
  }
}

**feature_conflict_map Rules**:
- One entry per feature ID from guidance-specification.md Feature Decomposition
- consensus[]: Statements where 2+ roles explicitly agree
- conflicts[]: Disagreements with topic, per-role positions, and suggested resolution
- cross_refs[]: References to other features or cross-cutting docs
- If a feature has no conflicts, set conflicts to empty array
- Keep each entry concise: aim for 100-200 words per feature

**Resolution Quality Requirements**:
1. **Actionable**: resolution must be directly executable. Bad: "需要权衡" → Good: "采用 JWT 无状态认证，RefreshToken 存 HttpOnly Cookie"
2. **Justified**: Explain why. Format: "[方案] because [原因]，tradeoff: [代价]"
3. **Scoped**: If limited scope, mark "Applies when: [条件]"
4. **Confidence**: [RESOLVED] | [SUGGESTED] | [UNRESOLVED]
` : ''}
`)
```

**Phase 3A Output Storage**:
```javascript
// Store enhancement_recommendations for Phase 4
const enhancement_recommendations = agent_output.enhancement_recommendations;

// Store feature_conflict_map for Phase 5 Spec Agent (feature_mode only)
const feature_conflict_map = feature_mode ? agent_output.feature_conflict_map : null;
```

### Phase 4: User Interaction

**All interactions via AskUserQuestion (Chinese questions)**

#### Step 1: Enhancement Selection

```javascript
// If enhancements > 4, split into multiple rounds
const enhancements = [...]; // from Phase 3A
const BATCH_SIZE = 4;

for (let i = 0; i < enhancements.length; i += BATCH_SIZE) {
  const batch = enhancements.slice(i, i + BATCH_SIZE);

  AskUserQuestion({
    questions: [{
      question: `请选择要应用的改进建议 (第${Math.floor(i/BATCH_SIZE)+1}轮)`,
      header: "改进选择",
      multiSelect: true,
      options: batch.map(ep => ({
        label: `${ep.id}: ${ep.title}`,
        description: `影响: ${ep.affected_roles.join(', ')} | ${ep.enhancement}`
      }))
    }]
  })

  // Store selections before next round
}

// User can also skip: provide "跳过" option
```

#### Step 2: Clarification Questions

```javascript
// Generate questions based on 9-category taxonomy scan
// Categories: User Intent, Requirements, Architecture, UX, Feasibility, Risk, Process, Decisions, Terminology

const clarifications = [...]; // from analysis
const BATCH_SIZE = 4;

for (let i = 0; i < clarifications.length; i += BATCH_SIZE) {
  const batch = clarifications.slice(i, i + BATCH_SIZE);
  const currentRound = Math.floor(i / BATCH_SIZE) + 1;
  const totalRounds = Math.ceil(clarifications.length / BATCH_SIZE);

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
  })

  // Store answers before next round
}
```

### Question Guidelines

**Target**: 开发者（理解技术但需要从用户需求出发）

**Question Structure**: `[跨角色分析发现] + [需要澄清的决策点]`
**Option Structure**: `标签：[具体方案] + 说明：[业务影响] + [技术权衡]`

**9-Category Taxonomy**:

| Category | Focus | Example Question Pattern |
|----------|-------|--------------------------|
| User Intent | 用户目标 | "MVP阶段核心目标？" + 验证/壁垒/完整性 |
| Requirements | 需求细化 | "功能优先级如何排序？" + 核心/增强/可选 |
| Architecture | 架构决策 | "技术栈选择考量？" + 熟悉度/先进性/成熟度 |
| UX | 用户体验 | "交互复杂度取舍？" + 简洁/丰富/渐进 |
| Feasibility | 可行性 | "资源约束下的范围？" + 最小/标准/完整 |
| Risk | 风险管理 | "风险容忍度？" + 保守/平衡/激进 |
| Process | 流程规范 | "迭代节奏？" + 快速/稳定/灵活 |
| Decisions | 决策确认 | "冲突解决方案？" + 方案A/方案B/折中 |
| Terminology | 术语统一 | "统一使用哪个术语？" + 术语A/术语B |

**Quality Rules**:

**MUST Include**:
- All questions in Chinese (用中文提问)
- 基于跨角色分析的具体发现
- 选项包含业务影响说明
- 解决实际的模糊点或冲突

**MUST Avoid**:
- 与角色分析无关的通用问题
- 重复已在 artifacts 阶段确认的内容
- 过于细节的实现级问题

#### Step 3: Build Spec Context

```javascript
// Unified context for Spec Agent (replaces per-role update_plan)
spec_context = {
  selected_enhancements: selected_eps,  // ["EP-001", "EP-002", ...]
  enhancement_details: enhancements.filter(ep => selected_eps.includes(ep.id)),
  clarification_answers: [
    { question: "...", answer: "...", category: "..." }
  ],
  original_user_intent: intent
}
```

### Phase 5: Spec Generation & Conditional Review

**Single Spec Agent generates all outputs sequentially, then self-evaluates complexity to decide whether to trigger Review Agent.**

**Skip condition (feature_mode = false)**: Spec Agent generates a single `synthesis-specification.md` instead of per-feature specs. Feature-index.json is skipped. All other logic (changelog, review) still applies.

#### Step 1: Prepare Input

```javascript
const feature_specs_dir = `${brainstorm_dir}/feature-specs`;
// Ensure directory exists (create if not) [feature_mode only]

// Build per-feature input bundles [feature_mode only]
const feature_bundles = feature_list.map(feature => {
  const fid = feature.id;
  const slug = feature.slug;

  const role_analysis_files = participating_roles
    .map(role => `${brainstorm_dir}/${role}/analysis-${fid}-${slug}.md`)
    .filter(path => fileExists(path));

  return {
    feature_id: fid,
    feature_slug: slug,
    feature_name: feature.description,
    feature_priority: feature.priority,
    conflict_map_entry: feature_conflict_map[fid],
    role_analysis_files: role_analysis_files,
    contributing_roles: role_analysis_files.map(f => extractRoleName(f)),
    output_path: `${feature_specs_dir}/${fid}-${slug}.md`
  };
});
```

#### Step 2: Execute Spec Agent

```javascript
Task(conceptual-planning-agent, `
## Agent Mission
Generate all feature specifications sequentially, produce feature-index.json and synthesis-changelog.md.
After generation, self-evaluate complexity and output complexity_score.

## Input
- brainstorm_dir: ${brainstorm_dir}
- feature_mode: ${feature_mode}
- participating_roles: ${participating_roles}
${feature_mode ? `- feature_bundles: ${JSON.stringify(feature_bundles)}
- feature_conflict_map: ${JSON.stringify(feature_conflict_map)}` : `- role_analysis_paths: ${role_analysis_paths}`}
- spec_context: ${JSON.stringify(spec_context)}
- guidance_spec_path: ${brainstorm_dir}/guidance-specification.md

## Flow Control Steps

### Step 1: Load Context (once)
1. Read guidance-specification.md
2. Read spec_context (enhancements + clarifications + user intent)
${feature_mode
  ? '3. Load feature_conflict_map into working memory'
  : '3. Read all role analysis files'}

### Step 2: Generate Specs
${feature_mode ? `
For EACH feature in feature_bundles (sequentially):
  a. Read role-specific analysis files for this feature
     (Each file ~1500-2000 words, total ~6.5K words for 3-4 roles)
  b. Apply conflict_map_entry to identify resolved/unresolved conflicts
  c. Apply four-layer aggregation rules (see below)
  d. Apply relevant enhancements from spec_context.enhancement_details
  e. Incorporate relevant clarification answers from spec_context.clarification_answers
  f. Generate feature spec using template (see below)
  g. Write to feature_bundles[i].output_path

**Cross-feature context**: Decisions made in earlier features carry forward.
When a later feature references an earlier one, use the actual decision (not re-analyze).
` : `
Generate a single synthesis-specification.md:
  a. Read all role analysis files
  b. Apply cross-role conflict resolution
  c. Incorporate selected enhancements and clarification answers
  d. Write consolidated synthesis to ${brainstorm_dir}/synthesis-specification.md
`}

### Step 3: Generate feature-index.json [feature_mode only]

${feature_mode ? `
Collect all generated spec paths and build structured index:

const feature_index = {
  "version": "1.0",
  "generated_at": new Date().toISOString(),
  "session_id": "${session_id}",
  "feature_mode": true,
  "features": feature_bundles.map(fb => ({
    "id": fb.feature_id,
    "slug": fb.feature_slug,
    "name": fb.feature_name,
    "priority": fb.feature_priority,
    "spec_path": "feature-specs/" + fb.feature_id + "-" + fb.feature_slug + ".md",
    "contributing_roles": fb.contributing_roles,
    "cross_cutting_refs": feature_conflict_map[fb.feature_id]
      ? feature_conflict_map[fb.feature_id].cross_refs : []
  })),
  "cross_cutting_specs": participating_roles
    .filter(role => fileExists(brainstorm_dir + "/" + role + "/analysis-cross-cutting.md"))
    .map(role => role + "/analysis-cross-cutting.md")
};

Write feature-index.json to ${brainstorm_dir}/feature-index.json
` : 'Skip this step.'}

### Step 4: Generate synthesis-changelog.md

Record all synthesis decisions as audit trail:

Write to ${brainstorm_dir}/synthesis-changelog.md:

---
# Synthesis Changelog

**Session**: ${session_id}
**Generated**: {timestamp}

## Enhancements Applied
For each selected enhancement:
- **{EP-ID}**: {title} — {how it was incorporated into which spec(s)}

## Clarifications Resolved
For each clarification answer:
- **{Category}**: {question} → {answer} — {impact on specs}

## Conflicts Resolved
For each conflict in feature_conflict_map:
- **{Feature ID} / {topic}**: {resolution} [{confidence}]

## Unresolved Items
List any [DECISION NEEDED] or [UNRESOLVED] items remaining in specs.
---

### Step 5: Self-Evaluate Complexity

Compute complexity_score based on generation results:

| Dimension | Low (0) | Medium (1) | High (2) |
|-----------|---------|------------|----------|
| Feature count | ≤2 | 3-4 | ≥5 |
| UNRESOLVED conflicts | 0 | 1-2 | ≥3 |
| Participating roles | ≤2 | 3-4 | ≥5 |
| Cross-feature dependencies | 0 | 1-2 | ≥3 |

Output complexity_score (0-8) at the end of agent response.

## Output
- Feature specs: ${feature_mode ? 'feature-specs/F-{id}-{slug}.md' : 'synthesis-specification.md'}
${feature_mode ? '- feature-index.json' : ''}
- synthesis-changelog.md
- complexity_score: {number}

${feature_mode ? `
## Four-Layer Aggregation Rules

### Layer 1: Direct Reference
- Quote role analyses directly when consensus exists
- Format: "[Role] recommends: [direct quote]"
- Use for undisputed technical recommendations

### Layer 2: Structured Extraction
- Extract and organize key information from each role into unified structure
- Merge complementary perspectives
- De-duplicate overlapping content across roles

### Layer 3: Conflict Distillation
- **[RESOLVED]**: State the resolution directly as a design decision. Format: "**Decision**: [resolution]. **Rationale**: [from conflict.resolution]. **Trade-off**: [tradeoff]."
- **[SUGGESTED]**: Adopt the suggested resolution but mark source. Format: "**Recommended**: [resolution] (suggested by Phase 3A cross-role analysis). **Rationale**: [reason]. **Alternative**: [strongest competing view]."
- **[UNRESOLVED]**: Do NOT pick a side. Present all options neutrally. Format: "**[DECISION NEEDED]**: [topic]. **Options**: [role1: approach1] vs [role2: approach2]. **Evaluation**: [pros/cons of each]. **Impact if deferred**: [consequence]."
- **Unresolved escalation**: If 2+ [UNRESOLVED] conflicts, add warning at top of Section 2

### Layer 4: Cross-Feature Annotation
- Add explicit dependency notes with feature IDs
- Document integration points with other features
- Note shared constraints or patterns
` : ''}

${feature_mode ? `
## Feature Spec Template (7 Sections, target 1500-2500 words)

---
# Feature Spec: {feature_id} - {feature_name}

**Priority**: {feature_priority}
**Contributing Roles**: [list of roles]
**Status**: Draft (from synthesis)

## 1. Requirements Summary
[Consolidated requirements from all role perspectives]
- Functional requirements (from product-manager, product-owner)
- User experience requirements (from ux-expert, ui-designer)
- Technical requirements (from system-architect, data-architect, api-designer)
- Domain requirements (from subject-matter-expert)

## 2. Design Decisions [CORE SECTION]
[Key architectural and design decisions with rationale - 40%+ of word count]
For each decision:
- **Decision**: [What was decided]
- **Context**: [Why this decision was needed]
- **Options Considered**: [Alternatives from different roles]
- **Chosen Approach**: [Selected option with rationale]
- **Trade-offs**: [What we gain vs. what we sacrifice]
- **Source**: [Which role(s) drove this decision]

## 3. Interface Contract
[API endpoints, data models, component interfaces]
- External interfaces (API contracts from api-designer)
- Internal interfaces (component boundaries from system-architect)
- Data interfaces (schemas from data-architect)
- User interfaces (interaction patterns from ux-expert/ui-designer)

## 4. Constraints & Risks
[Technical constraints, business risks, mitigation strategies]
- Performance constraints (from system-architect)
- Data constraints (from data-architect)
- UX constraints (from ux-expert)
- Business/domain constraints (from subject-matter-expert)
- Risk mitigation strategies (from scrum-master)

## 5. Acceptance Criteria
[Testable criteria for feature completion]
- Functional acceptance (from product-owner user stories)
- Performance acceptance (from system-architect NFRs)
- UX acceptance (from ux-expert usability criteria)
- Data integrity acceptance (from data-architect)

## 6. Detailed Analysis References
[Pointers back to role-specific analysis documents]
- @../{role}/analysis-{feature_id}-{feature_slug}.md for each contributing role
- @../guidance-specification.md#feature-decomposition

## 7. Cross-Feature Dependencies
[Dependencies on and from other features]
- **Depends on**: [Feature IDs this feature requires]
- **Required by**: [Feature IDs that depend on this feature]
- **Shared patterns**: References to analysis-cross-cutting.md patterns
- **Integration points**: [Specific interfaces between features]
---

## Feature Spec Completion Criteria
- All 7 sections populated with aggregated content
- Section 2 (Design Decisions) is the most detailed section (40%+ of word count)
- All conflicts from conflict_map_entry addressed with resolutions
- Cross-feature dependencies explicitly documented
- Word count between 1500-2500
- No placeholder text except [DECISION NEEDED] for genuinely unresolved items
` : ''}
`)
```

#### Step 3: Conditional Review Agent

**Trigger**: `complexity_score >= 4` (from Spec Agent output)

**Skip**: If `complexity_score < 4`, proceed directly to Phase 6 Finalization.

```javascript
if (complexity_score >= 4) {
  Task(conceptual-planning-agent, `
## Agent Mission
Review all generated feature specs for cross-feature consistency and quality.
Read ONLY the generated specs (not role analysis originals) to minimize context.

## Input
- brainstorm_dir: ${brainstorm_dir}
- feature_mode: ${feature_mode}
${feature_mode
  ? `- feature_spec_files: ${Glob(brainstorm_dir + '/feature-specs/F-*-*.md')}
- feature_index_path: ${brainstorm_dir}/feature-index.json`
  : `- synthesis_spec_path: ${brainstorm_dir}/synthesis-specification.md`}
- changelog_path: ${brainstorm_dir}/synthesis-changelog.md

## Review Checklist

### 1. Cross-Feature Consistency
- Terminology: same concept uses same term across all specs
- Decisions: no contradictory decisions between features
- Technology choices: consistent stack across features

### 2. Conflict Resolution Completeness
- All [UNRESOLVED] items have [DECISION NEEDED] markers
- All [RESOLVED] items state clear decision + rationale
- No silent conflicts (same topic, different decisions in different specs)

### 3. Dependency Bidirectionality
- If F-001 "Depends on" F-003 → F-003 must have "Required by" F-001
- Cross-refs in feature-index.json match spec Section 7

### 4. Enhancement & Clarification Coverage
- All selected enhancements (from changelog) reflected in relevant specs
- All clarification answers (from changelog) incorporated

## Action Protocol
- **Minor issues** (typo, missing cross-ref, terminology inconsistency):
  Fix directly in the spec file. Log fix in review_fixes[].
- **Major issues** (contradictory decisions, missing section, unaddressed conflict):
  Add [REVIEW-FLAG] annotation inline. Log in review_flags[].

## Output Format
Append to synthesis-changelog.md:

## Review Results
**Complexity Score**: {score}
**Specs Reviewed**: {count}
**Minor Fixes Applied**: {count}
**Major Flags Raised**: {count}

### Fixes Applied
- {spec_file}: {description of fix}

### Flags Raised
- {spec_file}: [REVIEW-FLAG] {description of issue}
`)
}
```

**Review Agent Characteristics**:
- **Input**: Only generated specs + changelog (NOT role analysis originals)
- **Context budget**: ~10-15K words (much smaller than generation phase)
- **Write permission**: Can modify spec files for minor fixes; uses [REVIEW-FLAG] for major issues
- **Isolation**: Does not touch role analysis files or guidance-specification.md

### Phase 6: Finalization

#### Step 1: Update Context Package

```javascript
const context_pkg = Read(".workflow/active/WFS-{session}/.process/context-package.json")

// Update metadata timestamps
// Add spec paths

if (feature_mode) {
  context_pkg.feature_index_path = `${brainstorm_dir}/feature-index.json`;
  context_pkg.feature_specs_dir = `${brainstorm_dir}/feature-specs/`;
  context_pkg.feature_mode = true;
} else {
  context_pkg.synthesis_spec_path = `${brainstorm_dir}/synthesis-specification.md`;
}

context_pkg.changelog_path = `${brainstorm_dir}/synthesis-changelog.md`;

Write(context_pkg_path, JSON.stringify(context_pkg))
```

#### Step 2: Update Session Metadata

```json
{
  "phases": {
    "BRAINSTORM": {
      "status": "synthesis_completed",
      "completed_at": "timestamp",
      "participating_roles": ["..."],
      "synthesis_results": {
        "enhancements_applied": ["EP-001", "EP-002"],
        "questions_asked": 3,
        "categories_clarified": ["Architecture", "UX"],
        "complexity_score": 5,
        "review_triggered": true,
        "review_fixes": 2,
        "review_flags": 0
      },
      "feature_spec_results": {
        "feature_mode": true,
        "features_generated": ["F-001", "F-002", "F-003"],
        "feature_index_path": ".brainstorming/feature-index.json",
        "feature_specs_dir": ".brainstorming/feature-specs/"
      },
      "quality_metrics": {
        "user_intent_alignment": "validated",
        "ambiguity_resolution": "complete",
        "terminology_consistency": "enforced"
      }
    }
  }
}
```

**Note**: `feature_spec_results` only present when `feature_mode` is true.

#### Step 3: Completion Report

```markdown
## Synthesis Complete

**Session**: {sessionId}
**Enhancements Applied**: EP-001, EP-002, EP-003
**Questions Answered**: 3/5
**Complexity Score**: {score}/8

### Review Status
{review_triggered ? "Review Agent executed: {fixes} fixes applied, {flags} flags raised" : "Skipped (complexity below threshold)"}

### Feature Specs (feature_mode only)
**Feature Specs Generated**: F-001, F-002, F-003
**Feature Index**: .brainstorming/feature-index.json
**Spec Directory**: .brainstorming/feature-specs/
**Changelog**: .brainstorming/synthesis-changelog.md

### Next Steps
PROCEED: `/workflow:plan --session {session-id}`
```

## Output

**Location (role analyses)**: `.workflow/active/WFS-{session}/.brainstorming/[role]/analysis*.md` (read-only, never modified by synthesis)
**Location (feature specs)**: `.workflow/active/WFS-{session}/.brainstorming/feature-specs/F-{id}-{slug}.md` [feature_mode]
**Location (synthesis spec)**: `.workflow/active/WFS-{session}/.brainstorming/synthesis-specification.md` [non-feature_mode]
**Location (feature index)**: `.workflow/active/WFS-{session}/.brainstorming/feature-index.json` [feature_mode]
**Location (changelog)**: `.workflow/active/WFS-{session}/.brainstorming/synthesis-changelog.md`

**Directory Structure** (feature_mode):
```
.workflow/active/WFS-{session}/.brainstorming/
├── guidance-specification.md              # Phase 2 output (read-only)
├── feature-index.json                     # Phase 5 Spec Agent output
├── synthesis-changelog.md                 # Phase 5 Spec Agent output (+ Review appendix)
├── feature-specs/                         # Phase 5 Spec Agent output
│   ├── F-001-{slug}.md                    # Consolidated feature spec (1500-2500 words)
│   ├── F-002-{slug}.md
│   └── F-00N-{slug}.md
├── {role-1}/                              # Phase 3 output (IMMUTABLE)
│   ├── analysis.md                        # Role overview index
│   ├── analysis-cross-cutting.md
│   ├── analysis-F-001-{slug}.md           # Per-feature detail
│   └── analysis-F-002-{slug}.md
└── {role-N}/
    └── ...
```

**Consumers**: `action-planning-agent` reads feature-index.json to generate task JSONs. `code-developer` loads individual feature specs as implementation context.

## Quality Checklist

**Content**:
- All role analyses loaded/analyzed (read-only)
- Cross-role analysis (consensus, conflicts, gaps)
- 9-category ambiguity scan
- Questions prioritized

**Spec Generation**:
- Single Spec Agent generates all specs sequentially
- Cross-feature decisions carry forward (no re-analysis)
- All selected enhancements incorporated
- All clarification answers reflected
- synthesis-changelog.md records all decisions

**Feature Specs (feature_mode only)**:
- Phase 3A reads only analysis.md index files (not sub-documents), input token <= 5K words
- feature_conflict_map generated with consensus/conflicts/cross_refs per feature
- Feature spec template has 7 sections, Section 2 (Design Decisions) is core
- Four-layer aggregation rules applied
- Each feature spec is 1500-2500 words
- feature-index.json generated with features[] + cross_cutting_specs[]

**Review (conditional)**:
- complexity_score computed from 4 dimensions (0-8 scale)
- Review triggered when score >= 4
- Minor fixes applied directly, major issues flagged with [REVIEW-FLAG]
- Review results appended to synthesis-changelog.md

**Immutability**:
- Role analysis files NOT modified by synthesis
- guidance-specification.md NOT modified by synthesis
- Only spec files, index, and changelog are write targets

- **TodoWrite**: Mark Phase 4 completed, collapse all sub-tasks to summary

## Next Phase

Return to orchestrator. Auto mode workflow is now complete. Report final summary to user.
