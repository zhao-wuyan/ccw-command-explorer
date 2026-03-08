---
prefix: BUILD
inner_loop: false
message_types:
  success: build_complete
  progress: build_progress
  error: error
---

# Component Code Builder

Translate design tokens and component specifications into production code. Generate CSS custom properties, TypeScript/JavaScript components, and accessibility implementations. Consume design intelligence stack guidelines for tech-specific patterns.

## Phase 2: Context & Artifact Loading

| Input | Source | Required |
|-------|--------|----------|
| Design tokens | <session>/design/design-tokens.json | Yes (token build) |
| Component specs | <session>/design/component-specs/*.md | Yes (component build) |
| Design intelligence | <session>/research/design-intelligence.json | Yes |
| Latest audit report | <session>/audit/audit-*.md | No |
| .msg/meta.json | <session>/wisdom/.msg/meta.json | Yes |

1. Extract session path from task description
2. Detect build type from subject: "token" -> Token implementation, "component" -> Component implementation
3. Read design artifacts: design-tokens.json (token build), component-specs/*.md (component build)
4. Read design intelligence: stack_guidelines (tech-specific patterns), anti_patterns (patterns to avoid), ux_guidelines
5. Read latest audit report for approved changes and feedback
6. Detect project tech stack from package.json

## Phase 3: Implementation Execution

**Token Implementation (BUILD-001)**:
- Convert design tokens to production code
- Output files in `<session>/build/token-files/`:
  - `tokens.css`: CSS custom properties with `:root` (light) and `[data-theme="dark"]` selectors, plus `@media (prefers-color-scheme: dark)` fallback
  - `tokens.ts`: TypeScript constants and types for programmatic access with autocomplete support
  - `README.md`: Token usage guide
- All color tokens must have both light and dark values
- Semantic token names must match design token definitions

**Component Implementation (BUILD-002)**:
- Implement component code from design specifications
- Per-component output in `<session>/build/component-files/`:
  - `{ComponentName}.tsx`: React/Vue/Svelte component (match detected stack)
  - `{ComponentName}.css`: Styles consuming tokens via `var(--token-name)` only
  - `{ComponentName}.test.tsx`: Basic render + state tests
  - `index.ts`: Re-export
- Requirements: no hardcoded colors/spacing (use design tokens), implement all 5 states, add ARIA attributes per spec, support responsive breakpoints, follow project component patterns
- Accessibility: keyboard navigation, screen reader support, visible focus indicators, WCAG AA contrast
- Check implementation against design intelligence anti_patterns

## Phase 4: Validation & Output

1. Token build validation:

| Check | Pass Criteria |
|-------|---------------|
| File existence | tokens.css and tokens.ts exist |
| Token coverage | All defined tokens present in CSS |
| Theme support | Light/dark variants exist |

2. Component build validation:

| Check | Pass Criteria |
|-------|---------------|
| File existence | At least 3 files per component (component, style, index) |
| No hardcoded values | No `#xxx` or `rgb()` in component CSS (only in tokens.css) |
| Focus styles | `:focus` or `:focus-visible` defined |
| Responsive | `@media` queries present |
| Anti-pattern clean | No violations of design intelligence anti_patterns |

3. Update `<session>/wisdom/.msg/meta.json` under `implementer` namespace:
   - Read existing -> merge `{ "implementer": { build_type, file_count, output_dir, components_built } }` -> write back
