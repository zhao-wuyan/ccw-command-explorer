# Agent Instruction Template -- Team Frontend

Base instruction template for CSV wave agents. The orchestrator dynamically customizes this per role during Phase 1, writing role-specific versions to `role-instructions/{role}.md`.

## Purpose

| Phase | Usage |
|-------|-------|
| Phase 1 | Coordinator generates per-role instruction from this template |
| Phase 2 | Injected as `instruction` parameter to `spawn_agents_on_csv` |

---

## Base Instruction Template

```markdown
## TASK ASSIGNMENT -- Team Frontend

### MANDATORY FIRST STEPS
1. Read shared discoveries: <session-folder>/discoveries.ndjson (if exists, skip if not)
2. Read project context: .workflow/project-tech.json (if exists)

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Role**: {role}
**Pipeline Mode**: {pipeline_mode}
**Scope**: {scope}
**Review Type**: {review_type}

### Task Description
{description}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

1. **Read discoveries**: Load <session-folder>/discoveries.ndjson for shared exploration findings
2. **Use context**: Apply previous tasks' findings from prev_context above
3. **Execute task**: Follow role-specific instructions below
4. **Share discoveries**: Append exploration findings to shared board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> <session-folder>/discoveries.ndjson
   ```
5. **Report result**: Return JSON via report_agent_job_result

### Discovery Types to Share
- `tech_stack_detected`: {stack, framework, ui_lib} -- Tech stack identification
- `design_pattern_found`: {pattern_name, location, description} -- Existing design pattern
- `token_generated`: {category, count, supports_dark_mode} -- Design token category created
- `file_modified`: {file, change, lines_added} -- File change performed
- `issue_found`: {file, line, severity, description} -- Issue discovered
- `anti_pattern_violation`: {pattern, file, line, description} -- Anti-pattern detected
- `artifact_produced`: {name, path, producer, type} -- Deliverable created

---

## Output (report_agent_job_result)

Return JSON:
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "artifacts_produced": "semicolon-separated paths of produced files",
  "qa_score": "",
  "qa_verdict": "",
  "error": ""
}
```

---

## Role-Specific Customization

The coordinator generates per-role instruction variants during Phase 1. Each variant adds role-specific execution guidance to Step 3.

### For Analyst Role

```
3. **Execute**:
   - Detect tech stack from package.json (react, nextjs, vue, svelte, html-tailwind)
   - Detect existing design system via Glob: **/*token*.*, **/*.css
   - Retrieve design intelligence via ui-ux-pro-max skill:
     - Full design system: Skill(skill="ui-ux-pro-max", args="<industry> <keywords> --design-system")
     - UX guidelines: Skill(skill="ui-ux-pro-max", args="accessibility animation responsive --domain ux")
     - Tech stack guide: Skill(skill="ui-ux-pro-max", args="<keywords> --stack <detected-stack>")
   - Fallback if skill unavailable: generate from LLM general design knowledge
   - Analyze existing codebase patterns (color palette, typography, spacing, components)
   - Optional: WebSearch for "<industry> web design trends best practices"
   - Compile design-intelligence.json with: _source, industry, detected_stack, design_system, ux_guidelines, stack_guidelines, recommendations
   - Write requirements.md summarizing all requirements
   - Output to <session-folder>/artifacts/analysis/
```

### For Architect Role

```
3. **Execute**:
   - Load design-intelligence.json from analyst output
   - Generate design token system (design-tokens.json) with categories:
     - color: primary, secondary, background, surface, text, CTA (light + dark mode)
     - typography: font families, font sizes (scale)
     - spacing: xs through 2xl
     - border-radius: sm, md, lg, full
     - shadow: sm, md, lg
     - transition: fast, normal, slow
   - Use $type + $value format (Design Tokens Community Group)
   - Generate component specs in component-specs/ directory:
     - Design reference (style, stack)
     - Props table (name, type, default, description)
     - Variants table
     - Accessibility requirements (role, keyboard, ARIA, contrast)
     - Anti-patterns to avoid
   - Generate project structure (project-structure.md) using stack-specific layout
   - Output to <session-folder>/artifacts/architecture/
```

### For Developer Role

```
3. **Execute**:
   - Load design tokens, component specs, and project structure from architect output
   - Generate CSS custom properties from design-tokens.json:
     - color -> --color-*, typography -> --font-*, --text-*, spacing -> --space-*
     - Add @media (prefers-color-scheme: dark) override for color tokens
   - Implement components following specs and coding standards:
     - Use design token CSS variables -- never hardcode colors/spacing
     - All interactive elements: cursor: pointer
     - Transitions: 150-300ms via var(--duration-normal)
     - Text contrast: minimum 4.5:1 ratio
     - Include focus-visible styles for keyboard navigation
     - Support prefers-reduced-motion
     - Responsive: mobile-first with md/lg breakpoints
     - No emoji as functional icons
   - Self-validate: scan for hardcoded colors, missing cursor-pointer, missing focus styles
   - Auto-fix where possible
   - Output to src/ directory (codebase files) + implementation summary
```

### For QA Role

```
3. **Execute**:
   - Load design intelligence and design tokens for compliance checks
   - Collect files to review based on review_type:
     - architecture-review: <session>/artifacts/architecture/**/*
     - code-review: src/**/*.{tsx,jsx,vue,svelte,html,css}
     - final: src/**/*.{tsx,jsx,vue,svelte,html,css}
   - Execute 5-dimension audit:
     - Dim 1 Code Quality (0.20): file length, console.log, empty catch, unused imports
     - Dim 2 Accessibility (0.25): alt text, labels, headings, focus styles, ARIA
     - Dim 3 Design Compliance (0.20): hardcoded colors, spacing, anti-patterns
     - Dim 4 UX Best Practices (0.20): cursor-pointer, transitions, responsive, states
     - Dim 5 Pre-Delivery (0.15): final checklist (code-review/final types only)
   - Calculate weighted score: sum(dimension_score * weight)
   - Determine verdict: score >= 8 AND critical == 0 -> PASSED; score >= 6 AND critical == 0 -> PASSED_WITH_WARNINGS; else -> FIX_REQUIRED
   - Write audit report to <session-folder>/artifacts/qa/
   - Set qa_score and qa_verdict in output
```

---

## Quality Requirements

All agents must verify before reporting complete:

| Requirement | Criteria |
|-------------|----------|
| Files produced | Verify all claimed artifacts exist via Read |
| Files modified | Verify content actually changed |
| Findings accuracy | Findings reflect actual work done |
| Discovery sharing | At least 1 discovery shared to board |
| Error reporting | Non-empty error field if status is failed |
| QA fields | qa_score and qa_verdict set for QA role tasks |

---

## Placeholder Reference

| Placeholder | Resolved By | When |
|-------------|------------|------|
| `<session-folder>` | Skill designer (Phase 1) | Literal path baked into instruction |
| `{id}` | spawn_agents_on_csv | Runtime from CSV row |
| `{title}` | spawn_agents_on_csv | Runtime from CSV row |
| `{description}` | spawn_agents_on_csv | Runtime from CSV row |
| `{role}` | spawn_agents_on_csv | Runtime from CSV row |
| `{pipeline_mode}` | spawn_agents_on_csv | Runtime from CSV row |
| `{scope}` | spawn_agents_on_csv | Runtime from CSV row |
| `{review_type}` | spawn_agents_on_csv | Runtime from CSV row |
| `{prev_context}` | spawn_agents_on_csv | Runtime from CSV row |
