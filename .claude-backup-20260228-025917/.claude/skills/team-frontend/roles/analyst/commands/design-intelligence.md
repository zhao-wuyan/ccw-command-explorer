# Command: design-intelligence

> 通过 Skill 调用 ui-ux-pro-max 获取行业设计智能，生成 design-intelligence.json。

## When to Use

- Phase 3 of analyst role: Core design intelligence retrieval
- ui-ux-pro-max skill 已安装

## Strategy

### Delegation Mode

**Mode**: Skill invocation
**Skill**: `ui-ux-pro-max`

## Execution Steps

### Step 1: 调用 ui-ux-pro-max 生成设计系统

analyst 在 subagent 中通过 Skill 调用 ui-ux-pro-max，获取完整设计系统推荐：

```javascript
// 核心调用：生成完整设计系统
// ui-ux-pro-max 的 Step 2 会自动执行 search.py --design-system
Task({
  subagent_type: "general-purpose",
  run_in_background: false,
  description: "Retrieve design intelligence via ui-ux-pro-max skill",
  prompt: `调用 ui-ux-pro-max skill 获取设计系统推荐。

## 需求
- 产品类型/行业: ${industry}
- 关键词: ${keywords}
- 技术栈: ${detectedStack}

## 执行步骤

### 1. 生成设计系统（必须）
Skill(skill="ui-ux-pro-max", args="${industry} ${keywords} --design-system")

### 2. 补充 UX 指南
Skill(skill="ui-ux-pro-max", args="accessibility animation responsive --domain ux")

### 3. 获取技术栈指南
Skill(skill="ui-ux-pro-max", args="${keywords} --stack ${detectedStack}")

## 输出
将所有结果整合写入: ${sessionFolder}/analysis/design-intelligence-raw.md

包含:
- 设计系统推荐（pattern, style, colors, typography, effects, anti-patterns）
- UX 最佳实践
- 技术栈指南
- 行业反模式列表
`
})
```

### Step 2: 解析 Skill 输出

```javascript
// 读取 ui-ux-pro-max 的原始输出
let rawOutput = ''
try {
  rawOutput = Read(`${sessionFolder}/analysis/design-intelligence-raw.md`)
} catch {}

// 解析为结构化 design-intelligence.json
const designIntelligence = {
  _source: "ui-ux-pro-max-skill",
  _generated_at: new Date().toISOString(),
  industry: industry,
  detected_stack: detectedStack,
  design_system: parseDesignSystem(rawOutput),
  ux_guidelines: parseUxGuidelines(rawOutput),
  stack_guidelines: parseStackGuidelines(rawOutput),
  recommendations: {
    style: null,
    color_palette: null,
    typography: null,
    anti_patterns: parseAntiPatterns(rawOutput),
    must_have: industryConfig?.mustHave || []
  }
}

Write(`${sessionFolder}/analysis/design-intelligence.json`, JSON.stringify(designIntelligence, null, 2))
```

### Step 3: Fallback

```javascript
// 若 ui-ux-pro-max skill 不可用（未安装），降级为 LLM 通用设计知识
// analyst 在 Phase 3 中直接基于 LLM 知识生成设计推荐
if (!skillAvailable) {
  return {
    _source: "llm-general-knowledge",
    _fallback: true,
    note: "ui-ux-pro-max skill not installed. Install via: /plugin install ui-ux-pro-max@ui-ux-pro-max-skill"
  }
}
```

## Skill 调用参考

ui-ux-pro-max 支持的调用方式：

| 用途 | 调用 |
|------|------|
| 完整设计系统 | `Skill(skill="ui-ux-pro-max", args="<query> --design-system")` |
| 持久化设计系统 | `Skill(skill="ui-ux-pro-max", args="<query> --design-system --persist -p <name>")` |
| 领域搜索 | `Skill(skill="ui-ux-pro-max", args="<query> --domain <domain>")` |
| 技术栈指南 | `Skill(skill="ui-ux-pro-max", args="<query> --stack <stack>")` |

可用领域: product, style, typography, color, landing, chart, ux, web
可用技术栈: html-tailwind, react, nextjs, vue, svelte, shadcn, swiftui, react-native, flutter

## Output Format

```json
{
  "_source": "ui-ux-pro-max-skill",
  "design_system": {
    "pattern": "...",
    "style": "...",
    "colors": { "primary": "...", "secondary": "...", "cta": "..." },
    "typography": { "heading": "...", "body": "..." },
    "effects": "...",
    "anti_patterns": []
  },
  "ux_guidelines": [],
  "stack_guidelines": {},
  "recommendations": {
    "style": null,
    "color_palette": null,
    "typography": null,
    "anti_patterns": [],
    "must_have": []
  }
}
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| ui-ux-pro-max skill not installed | Fallback to LLM general knowledge, suggest install command |
| Skill execution error | Retry once, then fallback |
| Partial output | Use available data, fill gaps with defaults |
| Timeout | Use partial results, log warning |
