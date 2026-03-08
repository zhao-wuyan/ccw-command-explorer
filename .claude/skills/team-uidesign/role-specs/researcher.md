---
prefix: RESEARCH
inner_loop: false
message_types:
  success: research_ready
  progress: research_progress
  error: error
---

# Design System Researcher

Analyze existing design system, build component inventory, assess accessibility baseline, and retrieve industry-specific design intelligence via ui-ux-pro-max. Produce foundation data for downstream designer, reviewer, and implementer roles.

## Phase 2: Context & Environment Detection

| Input | Source | Required |
|-------|--------|----------|
| Task description | From task subject/description | Yes |
| Session path | Extracted from task description | Yes |
| .msg/meta.json | <session>/wisdom/.msg/meta.json | No |

1. Extract session path and target scope from task description
2. Detect project type and tech stack from package.json or equivalent:

| Package | Detected Stack |
|---------|---------------|
| next | nextjs |
| react | react |
| vue | vue |
| svelte | svelte |
| @shadcn/ui | shadcn |
| (default) | html-tailwind |

3. Use CLI tools (e.g., `ccw cli -p "..." --tool gemini --mode analysis`) or direct tools (Glob, Grep, mcp__ace-tool__search_context) to scan for existing design tokens, component files, styling patterns
4. Read industry context from session config (industry, strictness, must-have features)

## Phase 3: Research Execution

Execute 4 analysis streams:

**Stream 1 -- Design System Analysis**:
- Search for existing design tokens (CSS variables, theme configs, token files)
- Identify styling patterns (CSS-in-JS, CSS modules, utility classes, SCSS)
- Map color palette, typography scale, spacing system
- Find component library usage (MUI, Ant Design, shadcn, custom)
- Output: `<session>/research/design-system-analysis.json`

**Stream 2 -- Component Inventory**:
- Find all UI component files; identify props/API surface
- Identify states supported (hover, focus, disabled, etc.)
- Check accessibility attributes (ARIA labels, roles)
- Map inter-component dependencies and usage counts
- Output: `<session>/research/component-inventory.json`

**Stream 3 -- Accessibility Baseline**:
- Check ARIA attribute usage patterns, keyboard navigation support
- Assess color contrast ratios (if design tokens found)
- Find focus management and semantic HTML patterns
- Output: `<session>/research/accessibility-audit.json`

**Stream 4 -- Design Intelligence (ui-ux-pro-max)**:
- Call `Skill(skill="ui-ux-pro-max", args="<industry> <keywords> --design-system")` for design system recommendations
- Call `Skill(skill="ui-ux-pro-max", args="accessibility animation responsive --domain ux")` for UX guidelines
- Call `Skill(skill="ui-ux-pro-max", args="<keywords> --stack <detected-stack>")` for stack guidelines
- Degradation: when unavailable, use LLM general knowledge, mark `_source: "llm-general-knowledge"`
- Output: `<session>/research/design-intelligence.json`

Compile research summary metrics: design_system_exists, styling_approach, total_components, accessibility_level, design_intelligence_source, anti_patterns_count.

## Phase 4: Validation & Output

1. Verify all 4 output files exist and contain valid JSON with required fields:

| File | Required Fields |
|------|----------------|
| design-system-analysis.json | existing_tokens, styling_approach |
| component-inventory.json | components array |
| accessibility-audit.json | wcag_level |
| design-intelligence.json | _source, design_system |

2. If any file missing or invalid, re-run corresponding stream

3. Update `<session>/wisdom/.msg/meta.json` under `researcher` namespace:
   - Read existing -> merge `{ "researcher": { detected_stack, component_count, wcag_level, di_source, scope } }` -> write back
