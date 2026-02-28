# Phase 1.5: Requirement Expansion & Clarification

在进入正式文档生成前，通过多轮交互讨论对原始需求进行深度挖掘、扩展和确认。

## Objective

- 识别原始需求中的模糊点、遗漏和潜在风险
- 通过 CLI 辅助分析需求完整性，生成深度探测问题
- 支持多轮交互讨论，逐步细化需求
- 生成经用户确认的 `refined-requirements.json` 作为后续阶段的高质量输入

## Input

- Dependency: `{workDir}/spec-config.json` (Phase 1 output)
- Optional: `{workDir}/discovery-context.json` (codebase context)

## Execution Steps

### Step 1: Load Phase 1 Context

```javascript
const specConfig = JSON.parse(Read(`${workDir}/spec-config.json`));
const { seed_analysis, seed_input, focus_areas, has_codebase, depth } = specConfig;

let discoveryContext = null;
if (has_codebase) {
  try {
    discoveryContext = JSON.parse(Read(`${workDir}/discovery-context.json`));
  } catch (e) { /* proceed without */ }
}
```

### Step 2: CLI Gap Analysis & Question Generation

调用 Gemini CLI 分析原始需求的完整性，识别模糊点并生成探测问题。

```javascript
Bash({
  command: `ccw cli -p "PURPOSE: 深度分析用户的初始需求，识别模糊点、遗漏和需要澄清的领域。
Success: 生成 3-5 个高质量的探测问题，覆盖功能范围、边界条件、非功能性需求、用户场景等维度。

ORIGINAL SEED INPUT:
${seed_input}

SEED ANALYSIS:
${JSON.stringify(seed_analysis, null, 2)}

FOCUS AREAS: ${focus_areas.join(', ')}
${discoveryContext ? `
CODEBASE CONTEXT:
- Existing patterns: ${discoveryContext.existing_patterns?.slice(0,5).join(', ') || 'none'}
- Tech stack: ${JSON.stringify(discoveryContext.tech_stack || {})}
` : ''}

TASK:
1. 评估当前需求描述的完整性（1-10 分，列出缺失维度）
2. 识别 3-5 个关键模糊区域，每个区域包含：
   - 模糊点描述（为什么不清楚）
   - 1-2 个开放式探测问题
   - 1-2 个扩展建议（基于领域最佳实践）
3. 检查以下维度是否有遗漏：
   - 功能范围边界（什么在范围内/外？）
   - 核心用户场景和流程
   - 非功能性需求（性能、安全、可用性、可扩展性）
   - 集成点和外部依赖
   - 数据模型和存储需求
   - 错误处理和异常场景
4. 基于领域经验提供需求扩展建议

MODE: analysis
EXPECTED: JSON output:
{
  \"completeness_score\": 7,
  \"missing_dimensions\": [\"Performance requirements\", \"Error handling\"],
  \"clarification_areas\": [
    {
      \"area\": \"Scope boundary\",
      \"rationale\": \"Input does not clarify...\",
      \"questions\": [\"Question 1?\", \"Question 2?\"],
      \"suggestions\": [\"Suggestion 1\", \"Suggestion 2\"]
    }
  ],
  \"expansion_recommendations\": [
    {
      \"category\": \"Non-functional\",
      \"recommendation\": \"Consider adding...\",
      \"priority\": \"high|medium|low\"
    }
  ]
}
CONSTRAINTS: 问题必须是开放式的，建议必须具体可执行，使用用户输入的语言
" --tool gemini --mode analysis`,
  run_in_background: true
});
// Wait for CLI result before continuing
```

解析 CLI 输出为结构化数据：
```javascript
const gapAnalysis = {
  completeness_score: 0,
  missing_dimensions: [],
  clarification_areas: [],
  expansion_recommendations: []
};
// Parse from CLI output
```

### Step 3: Interactive Discussion Loop

核心多轮交互循环。每轮：展示分析结果 → 用户回应 → 更新需求状态 → 判断是否继续。

```javascript
// Initialize requirement state
let requirementState = {
  problem_statement: seed_analysis.problem_statement,
  target_users: seed_analysis.target_users,
  domain: seed_analysis.domain,
  constraints: seed_analysis.constraints,
  confirmed_features: [],
  non_functional_requirements: [],
  boundary_conditions: [],
  integration_points: [],
  key_assumptions: [],
  discussion_rounds: 0
};

let discussionLog = [];
let userSatisfied = false;

// === Round 1: Present gap analysis results ===
// Display completeness_score, clarification_areas, expansion_recommendations
// Then ask user to respond

while (!userSatisfied && requirementState.discussion_rounds < 5) {
  requirementState.discussion_rounds++;

  if (requirementState.discussion_rounds === 1) {
    // --- First round: present initial gap analysis ---
    // Format questions and suggestions from gapAnalysis for display
    // Present as a structured summary to the user

    AskUserQuestion({
      questions: [
        {
          question: buildDiscussionPrompt(gapAnalysis, requirementState),
          header: "Req Expand",
          multiSelect: false,
          options: [
            { label: "I'll answer", description: "I have answers/feedback to provide (type in 'Other')" },
            { label: "Accept all suggestions", description: "Accept all expansion recommendations as-is" },
            { label: "Skip to generation", description: "Requirements are clear enough, proceed directly" }
          ]
        }
      ]
    });
  } else {
    // --- Subsequent rounds: refine based on user feedback ---
    // Call CLI with accumulated context for follow-up analysis
    Bash({
      command: `ccw cli -p "PURPOSE: 基于用户最新回应，更新需求理解，识别剩余模糊点。

CURRENT REQUIREMENT STATE:
${JSON.stringify(requirementState, null, 2)}

DISCUSSION HISTORY:
${JSON.stringify(discussionLog, null, 2)}

USER'S LATEST RESPONSE:
${lastUserResponse}

TASK:
1. 将用户回应整合到需求状态中
2. 识别 1-3 个仍需澄清或可扩展的领域
3. 生成后续问题（如有必要）
4. 如果需求已充分，输出最终需求摘要

MODE: analysis
EXPECTED: JSON output:
{
  \"updated_fields\": { /* fields to merge into requirementState */ },
  \"status\": \"need_more_discussion\" | \"ready_for_confirmation\",
  \"follow_up\": {
    \"remaining_areas\": [{\"area\": \"...\", \"questions\": [\"...\"]}],
    \"summary\": \"...\"
  }
}
CONSTRAINTS: 避免重复已回答的问题，聚焦未覆盖的领域
" --tool gemini --mode analysis`,
      run_in_background: true
    });
    // Wait for CLI result, parse and continue

    // If status === "ready_for_confirmation", break to confirmation step
    // If status === "need_more_discussion", present follow-up questions

    AskUserQuestion({
      questions: [
        {
          question: buildFollowUpPrompt(followUpAnalysis, requirementState),
          header: "Follow-up",
          multiSelect: false,
          options: [
            { label: "I'll answer", description: "I have more feedback (type in 'Other')" },
            { label: "Looks good", description: "Requirements are sufficiently clear now" },
            { label: "Accept suggestions", description: "Accept remaining suggestions" }
          ]
        }
      ]
    });
  }

  // Process user response
  // - "Skip to generation" / "Looks good" → userSatisfied = true
  // - "Accept all suggestions" → merge suggestions into requirementState, userSatisfied = true
  // - "I'll answer" (with Other text) → record in discussionLog, continue loop
  // - User selects Other with custom text → parse and record

  discussionLog.push({
    round: requirementState.discussion_rounds,
    agent_prompt: currentPrompt,
    user_response: userResponse,
    timestamp: new Date().toISOString()
  });
}
```

#### Helper: Build Discussion Prompt

```javascript
function buildDiscussionPrompt(gapAnalysis, state) {
  let prompt = `## Requirement Analysis Results\n\n`;
  prompt += `**Completeness Score**: ${gapAnalysis.completeness_score}/10\n`;

  if (gapAnalysis.missing_dimensions.length > 0) {
    prompt += `**Missing Dimensions**: ${gapAnalysis.missing_dimensions.join(', ')}\n\n`;
  }

  prompt += `### Key Questions\n\n`;
  gapAnalysis.clarification_areas.forEach((area, i) => {
    prompt += `**${i+1}. ${area.area}**\n`;
    prompt += `  ${area.rationale}\n`;
    area.questions.forEach(q => { prompt += `  - ${q}\n`; });
    if (area.suggestions.length > 0) {
      prompt += `  Suggestions: ${area.suggestions.join('; ')}\n`;
    }
    prompt += `\n`;
  });

  if (gapAnalysis.expansion_recommendations.length > 0) {
    prompt += `### Expansion Recommendations\n\n`;
    gapAnalysis.expansion_recommendations.forEach(rec => {
      prompt += `- [${rec.priority}] **${rec.category}**: ${rec.recommendation}\n`;
    });
  }

  prompt += `\nPlease answer the questions above, or choose an option below.`;
  return prompt;
}
```

### Step 4: Auto Mode Handling

```javascript
if (autoMode) {
  // Skip interactive discussion
  // CLI generates default requirement expansion based on seed_analysis
  Bash({
    command: `ccw cli -p "PURPOSE: 基于种子分析自动生成需求扩展，无需用户交互。

SEED ANALYSIS:
${JSON.stringify(seed_analysis, null, 2)}

SEED INPUT: ${seed_input}
DEPTH: ${depth}
${discoveryContext ? `CODEBASE: ${JSON.stringify(discoveryContext.tech_stack || {})}` : ''}

TASK:
1. 基于领域最佳实践，自动扩展功能需求清单
2. 推断合理的非功能性需求
3. 识别明显的边界条件
4. 列出关键假设

MODE: analysis
EXPECTED: JSON output matching refined-requirements.json schema
CONSTRAINTS: 保守推断，只添加高置信度的扩展
" --tool gemini --mode analysis`,
    run_in_background: true
  });
  // Parse output directly into refined-requirements.json
}
```

### Step 5: Generate Requirement Confirmation Summary

在写入文件前，向用户展示最终的需求确认摘要（非 auto mode）。

```javascript
if (!autoMode) {
  // Build confirmation summary from requirementState
  const summary = buildConfirmationSummary(requirementState);

  AskUserQuestion({
    questions: [
      {
        question: `## Requirement Confirmation\n\n${summary}\n\nConfirm and proceed to specification generation?`,
        header: "Confirm",
        multiSelect: false,
        options: [
          { label: "Confirm & proceed", description: "Requirements confirmed, start spec generation" },
          { label: "Need adjustments", description: "Go back and refine further" }
        ]
      }
    ]
  });

  // If "Need adjustments" → loop back to Step 3
  // If "Confirm & proceed" → continue to Step 6
}
```

### Step 6: Write refined-requirements.json

```javascript
const refinedRequirements = {
  session_id: specConfig.session_id,
  phase: "1.5",
  generated_at: new Date().toISOString(),
  source: autoMode ? "auto-expansion" : "interactive-discussion",
  discussion_rounds: requirementState.discussion_rounds,

  // Core requirement content
  clarified_problem_statement: requirementState.problem_statement,
  confirmed_target_users: requirementState.target_users.map(u =>
    typeof u === 'string' ? { name: u, needs: [], pain_points: [] } : u
  ),
  confirmed_domain: requirementState.domain,

  confirmed_features: requirementState.confirmed_features.map(f => ({
    name: f.name,
    description: f.description,
    acceptance_criteria: f.acceptance_criteria || [],
    edge_cases: f.edge_cases || [],
    priority: f.priority || "unset"
  })),

  non_functional_requirements: requirementState.non_functional_requirements.map(nfr => ({
    type: nfr.type,    // Performance, Security, Usability, Scalability, etc.
    details: nfr.details,
    measurable_criteria: nfr.measurable_criteria || ""
  })),

  boundary_conditions: {
    in_scope: requirementState.boundary_conditions.filter(b => b.scope === 'in'),
    out_of_scope: requirementState.boundary_conditions.filter(b => b.scope === 'out'),
    constraints: requirementState.constraints
  },

  integration_points: requirementState.integration_points,
  key_assumptions: requirementState.key_assumptions,

  // Traceability
  discussion_log: autoMode ? [] : discussionLog
};

Write(`${workDir}/refined-requirements.json`, JSON.stringify(refinedRequirements, null, 2));
```

### Step 7: Update spec-config.json

```javascript
specConfig.refined_requirements_file = "refined-requirements.json";
specConfig.phasesCompleted.push({
  phase: 1.5,
  name: "requirement-clarification",
  output_file: "refined-requirements.json",
  discussion_rounds: requirementState.discussion_rounds,
  completed_at: new Date().toISOString()
});

Write(`${workDir}/spec-config.json`, JSON.stringify(specConfig, null, 2));
```

## Output

- **File**: `refined-requirements.json`
- **Format**: JSON
- **Updated**: `spec-config.json` (added `refined_requirements_file` field and phase 1.5 to `phasesCompleted`)

## Quality Checklist

- [ ] Problem statement refined (>= 30 characters, more specific than seed)
- [ ] At least 2 confirmed features with descriptions
- [ ] At least 1 non-functional requirement identified
- [ ] Boundary conditions defined (in-scope + out-of-scope)
- [ ] Key assumptions listed (>= 1)
- [ ] Discussion rounds recorded (>= 1 in interactive mode)
- [ ] User explicitly confirmed requirements (non-auto mode)
- [ ] `refined-requirements.json` written with valid JSON
- [ ] `spec-config.json` updated with phase 1.5 completion

## Next Phase

Proceed to [Phase 2: Product Brief](02-product-brief.md). Phase 2 should load `refined-requirements.json` as primary input instead of relying solely on `spec-config.json.seed_analysis`.
