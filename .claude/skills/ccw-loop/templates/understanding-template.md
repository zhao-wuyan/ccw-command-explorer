# Understanding Document Template

调试理解演变文档的标准模板。

## Template Structure

```markdown
# Understanding Document

**Session ID**: {{session_id}}
**Bug Description**: {{bug_description}}
**Started**: {{started_at}}

---

## Exploration Timeline

{{#each iterations}}
### Iteration {{number}} - {{title}} ({{timestamp}})

{{#if is_exploration}}
#### Current Understanding

Based on bug description and initial code search:

- Error pattern: {{error_pattern}}
- Affected areas: {{affected_areas}}
- Initial hypothesis: {{initial_thoughts}}

#### Evidence from Code Search

{{#each search_results}}
**Keyword: "{{keyword}}"**
- Found in: {{files}}
- Key findings: {{insights}}
{{/each}}
{{/if}}

{{#if has_hypotheses}}
#### Hypotheses Generated (Gemini-Assisted)

{{#each hypotheses}}
**{{id}}** (Likelihood: {{likelihood}}): {{description}}
- Logging at: {{logging_point}}
- Testing: {{testable_condition}}
- Evidence to confirm: {{confirm_criteria}}
- Evidence to reject: {{reject_criteria}}
{{/each}}

**Gemini Insights**: {{gemini_insights}}
{{/if}}

{{#if is_analysis}}
#### Log Analysis Results

{{#each results}}
**{{id}}**: {{verdict}}
- Evidence: {{evidence}}
- Reasoning: {{reason}}
{{/each}}

#### Corrected Understanding

Previous misunderstandings identified and corrected:

{{#each corrections}}
- ~~{{wrong}}~~ → {{corrected}}
  - Why wrong: {{reason}}
  - Evidence: {{evidence}}
{{/each}}

#### New Insights

{{#each insights}}
- {{this}}
{{/each}}

#### Gemini Analysis

{{gemini_analysis}}
{{/if}}

{{#if root_cause_found}}
#### Root Cause Identified

**{{hypothesis_id}}**: {{description}}

Evidence supporting this conclusion:
{{supporting_evidence}}
{{else}}
#### Next Steps

{{next_steps}}
{{/if}}

---
{{/each}}

## Current Consolidated Understanding

### What We Know

{{#each valid_understandings}}
- {{this}}
{{/each}}

### What Was Disproven

{{#each disproven}}
- ~~{{assumption}}~~ (Evidence: {{evidence}})
{{/each}}

### Current Investigation Focus

{{current_focus}}

### Remaining Questions

{{#each questions}}
- {{this}}
{{/each}}
```

## Template Variables

| Variable | Type | Source | Description |
|----------|------|--------|-------------|
| `session_id` | string | state.session_id | 会话 ID |
| `bug_description` | string | state.debug.current_bug | Bug 描述 |
| `iterations` | array | 从文件解析 | 迭代历史 |
| `hypotheses` | array | state.debug.hypotheses | 假设列表 |
| `valid_understandings` | array | 从 Gemini 分析 | 有效理解 |
| `disproven` | array | 从假设状态 | 被否定的假设 |

## Section Templates

### Exploration Section

```markdown
### Iteration {{N}} - Initial Exploration ({{timestamp}})

#### Current Understanding

Based on bug description and initial code search:

- Error pattern: {{pattern}}
- Affected areas: {{areas}}
- Initial hypothesis: {{thoughts}}

#### Evidence from Code Search

{{#each search_results}}
**Keyword: "{{keyword}}"**
- Found in: {{files}}
- Key findings: {{insights}}
{{/each}}

#### Next Steps

- Generate testable hypotheses
- Add instrumentation
- Await reproduction
```

### Hypothesis Section

```markdown
#### Hypotheses Generated (Gemini-Assisted)

| ID | Description | Likelihood | Status |
|----|-------------|------------|--------|
{{#each hypotheses}}
| {{id}} | {{description}} | {{likelihood}} | {{status}} |
{{/each}}

**Details:**

{{#each hypotheses}}
**{{id}}**: {{description}}
- Logging at: `{{logging_point}}`
- Testing: {{testable_condition}}
- Confirm: {{evidence_criteria.confirm}}
- Reject: {{evidence_criteria.reject}}
{{/each}}
```

### Analysis Section

```markdown
### Iteration {{N}} - Evidence Analysis ({{timestamp}})

#### Log Analysis Results

{{#each results}}
**{{id}}**: **{{verdict}}**
- Evidence: \`{{evidence}}\`
- Reasoning: {{reason}}
{{/each}}

#### Corrected Understanding

| Previous Assumption | Corrected To | Reason |
|---------------------|--------------|--------|
{{#each corrections}}
| ~~{{wrong}}~~ | {{corrected}} | {{reason}} |
{{/each}}

#### Gemini Analysis

{{gemini_analysis}}
```

### Consolidated Understanding Section

```markdown
## Current Consolidated Understanding

### What We Know

{{#each valid}}
- {{this}}
{{/each}}

### What Was Disproven

{{#each disproven}}
- ~~{{this.assumption}}~~ (Evidence: {{this.evidence}})
{{/each}}

### Current Investigation Focus

{{focus}}

### Remaining Questions

{{#each questions}}
- {{this}}
{{/each}}
```

### Resolution Section

```markdown
### Resolution ({{timestamp}})

#### Fix Applied

- Modified files: {{files}}
- Fix description: {{description}}
- Root cause addressed: {{root_cause}}

#### Verification Results

{{verification}}

#### Lessons Learned

{{#each lessons}}
{{@index}}. {{this}}
{{/each}}

#### Key Insights for Future

{{#each insights}}
- {{this}}
{{/each}}
```

## Consolidation Rules

更新 "Current Consolidated Understanding" 时遵循以下规则:

1. **简化被否定项**: 移到 "What Was Disproven"，只保留单行摘要
2. **保留有效见解**: 将确认的发现提升到 "What We Know"
3. **避免重复**: 不在合并部分重复时间线细节
4. **关注当前状态**: 描述现在知道什么，而不是过程
5. **保留关键纠正**: 保留重要的 wrong→right 转换供学习

## Anti-Patterns

**错误示例 (冗余)**:
```markdown
## Current Consolidated Understanding

In iteration 1 we thought X, but in iteration 2 we found Y, then in iteration 3...
Also we checked A and found B, and then we checked C...
```

**正确示例 (精简)**:
```markdown
## Current Consolidated Understanding

### What We Know
- Error occurs during runtime update, not initialization
- Config value is None (not missing key)

### What Was Disproven
- ~~Initialization error~~ (Timing evidence)
- ~~Missing key hypothesis~~ (Key exists)

### Current Investigation Focus
Why is config value None during update?
```
