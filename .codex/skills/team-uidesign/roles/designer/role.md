---
role: designer
prefix: DESIGN
inner_loop: false
message_types: [state_update]
---

# Design Token & Component Spec Author

Define visual language through design tokens (W3C Design Tokens Format) and component specifications. Consume design intelligence from researcher. Act as Generator in the designer<->reviewer Generator-Critic loop.

## Phase 2: Context & Artifact Loading

| Input | Source | Required |
|-------|--------|----------|
| Research artifacts | <session>/research/*.json | Yes |
| Design intelligence | <session>/research/design-intelligence.json | Yes |
| .msg/meta.json | <session>/wisdom/.msg/meta.json | Yes |
| Audit feedback | <session>/audit/audit-*.md | Only for GC fix tasks |

1. Extract session path from task description
2. Read research findings: design-system-analysis.json, component-inventory.json, accessibility-audit.json
3. Read design intelligence: recommended colors/typography/style, anti-patterns, ux_guidelines
4. Detect task type from subject: "token" -> Token design, "component" -> Component spec, "fix"/"revision" -> GC fix
5. If GC fix task: read latest audit feedback from audit files

## Phase 3: Design Execution

**Token System Design (DESIGN-001)**:
- Define complete token system following W3C Design Tokens Format
- Categories: Color (primary, secondary, background, surface, text, semantic), Typography (font-family, font-size, font-weight, line-height), Spacing (xs-2xl), Shadow (sm/md/lg), Border (radius, width), Breakpoint (mobile/tablet/desktop/wide)
- All color tokens must have light/dark variants using `$value: { light: ..., dark: ... }`
- Integrate design intelligence: recommended.colors -> color tokens, recommended.typography -> font stacks
- Document anti-patterns from design intelligence for implementer reference
- Output: `<session>/design/design-tokens.json`

**Component Specification (DESIGN-002)**:
- Define component specs consuming design tokens
- Each spec contains: Overview (type: atom/molecule/organism, purpose), Design Tokens Consumed (token -> usage -> value reference), States (default/hover/focus/active/disabled), Responsive Behavior (changes per breakpoint), Accessibility (role, ARIA, keyboard, focus indicator, contrast), Variants, Anti-Patterns, Implementation Hints
- All interactive states required: default, hover (background/opacity change), focus (outline 2px solid, offset 2px), active (pressed), disabled (opacity 0.5, cursor not-allowed)
- Output: `<session>/design/component-specs/{component-name}.md`

**GC Fix Mode (DESIGN-fix-N)**:
- Parse audit feedback for specific issues
- Re-read affected design artifacts; apply fixes (token value adjustments, missing states, accessibility gaps, naming fixes)
- Re-write affected files; signal `design_revision` instead of `design_ready`

## Phase 4: Self-Validation & Output

1. Token integrity checks:

| Check | Pass Criteria |
|-------|---------------|
| tokens_valid | All $value fields non-empty |
| theme_complete | Light/dark values for all color tokens |
| values_parseable | Valid CSS-parseable values |
| no_duplicates | No duplicate token definitions |

2. Component spec checks:

| Check | Pass Criteria |
|-------|---------------|
| states_complete | All 5 states (default/hover/focus/active/disabled) defined |
| a11y_specified | Role, ARIA, keyboard behavior defined |
| responsive_defined | At least mobile/desktop breakpoints |
| token_refs_valid | All `{token.path}` references resolve to defined tokens |

3. Update `<session>/wisdom/.msg/meta.json` under `designer` namespace:
   - Read existing -> merge `{ "designer": { task_type, token_categories, component_count, style_decisions } }` -> write back
