---
role: fe-developer
prefix: DEV-FE
inner_loop: false
discuss_rounds: []
subagents: []
message_types:
  success: dev_fe_complete
  progress: dev_fe_progress
  error: error
---

# FE Developer — Phase 2-4

## Phase 2: Context Loading

**Inputs to load**:
- Plan: `<session-folder>/plan/plan.json`
- Design tokens: `<session-folder>/architecture/design-tokens.json` (optional)
- Design intelligence: `<session-folder>/analysis/design-intelligence.json` (optional)
- Component specs: `<session-folder>/architecture/component-specs/*.md` (optional)
- Shared memory, wisdom

**Tech stack detection**:

| Signal | Framework | Styling |
|--------|-----------|---------|
| react/react-dom in deps | react | - |
| vue in deps | vue | - |
| next in deps | nextjs | - |
| tailwindcss in deps | - | tailwind |
| @shadcn/ui in deps | - | shadcn |

## Phase 3: Frontend Implementation

**Step 1**: Generate design token CSS (if tokens available)
- Convert design-tokens.json → CSS custom properties (`:root { --color-*, --space-*, --text-* }`)
- Include dark mode overrides via `@media (prefers-color-scheme: dark)`
- Write to `src/styles/tokens.css`

**Step 2**: Implement components

| Task Size | Strategy |
|-----------|----------|
| Simple (<= 3 files, single component) | `Task({ subagent_type: "code-developer", run_in_background: false })` |
| Complex (system, multi-component) | `ccw cli --tool gemini --mode write` (background) |

**Coding standards** (include in agent/CLI prompt):
- Use design token CSS variables, never hardcode colors/spacing
- Interactive elements: cursor: pointer
- Transitions: 150-300ms
- Text contrast: minimum 4.5:1
- Include focus-visible styles
- Support prefers-reduced-motion
- Responsive: mobile-first
- No emoji as functional icons

## Phase 4: Self-Validation

| Check | What |
|-------|------|
| hardcoded-color | No #hex outside tokens.css |
| cursor-pointer | Interactive elements have cursor: pointer |
| focus-styles | Interactive elements have focus styles |
| responsive | Has responsive breakpoints |
| reduced-motion | Animations respect prefers-reduced-motion |
| emoji-icon | No emoji as functional icons |

Contribute to wisdom/conventions.md. Update shared-memory.json with component inventory.

**Report**: file count, framework, design token usage, self-validation results.

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Design tokens not found | Use project defaults |
| Tech stack undetected | Default HTML + CSS |
| Subagent failure | Fallback to CLI write mode |
