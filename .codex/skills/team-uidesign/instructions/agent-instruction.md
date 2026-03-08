# Team UI Design — Agent Instruction

This instruction is loaded by team-worker agents when spawned with roles: `researcher`, `designer`, `reviewer`, `implementer`.

---

## Role-Based Execution

### Researcher Role

**Responsibility**: Analyze existing design system, build component inventory, assess accessibility baseline, retrieve design intelligence.

**Input**:
- `id`: Task ID (e.g., `RESEARCH-001`)
- `title`: Task title
- `description`: Detailed task description with PURPOSE/TASK/CONTEXT/EXPECTED/CONSTRAINTS
- `role`: `researcher`
- `pipeline_mode`: `component`, `system`, or `full-system`
- `scope`: `full`
- `prev_context`: Previous tasks' findings (empty for wave 1)

**Execution Protocol**:

1. **Read shared discoveries**:
   ```javascript
   const discoveries = Read(`{session}/discoveries.ndjson`)
   ```

2. **Analyze existing design system**:
   - Scan codebase for design tokens (CSS variables, theme files, config)
   - Identify styling patterns (CSS-in-JS, Tailwind, styled-components)
   - Extract color palette, typography scale, spacing system

3. **Build component inventory**:
   - List all UI components with props and states
   - Document component hierarchy and composition patterns
   - Note accessibility features (ARIA, keyboard nav)

4. **Assess accessibility baseline**:
   - Check contrast ratios (WCAG AA/AAA)
   - Verify semantic HTML usage
   - Document keyboard navigation support
   - Note screen reader compatibility

5. **Retrieve design intelligence** (if ui-ux-pro-max available):
   - Query for industry best practices
   - Get component design patterns
   - Retrieve accessibility guidelines

6. **Write research artifacts**:
   ```javascript
   Write(`{session}/artifacts/research/design-system-analysis.json`, JSON.stringify({
     tech_stack: { framework: "React", ui_lib: "shadcn", styling: "Tailwind" },
     existing_tokens: { colors: 24, typography: 7, spacing: 6 },
     patterns: ["Compound components", "Render props"],
     gaps: ["Missing dark mode", "Inconsistent spacing"]
   }, null, 2))

   Write(`{session}/artifacts/research/component-inventory.json`, JSON.stringify({
     components: [
       { name: "Button", props: ["variant", "size"], states: ["default", "hover", "active", "disabled"] }
     ]
   }, null, 2))

   Write(`{session}/artifacts/research/accessibility-audit.json`, JSON.stringify({
     wcag_level: "AA",
     contrast_issues: 3,
     keyboard_nav: "partial",
     screen_reader: "good"
   }, null, 2))

   Write(`{session}/artifacts/research/design-intelligence.json`, JSON.stringify({
     industry: "SaaS/Tech",
     best_practices: ["8px grid", "4-5 color shades", "Semantic naming"],
     patterns: ["Button variants", "Form validation states"]
   }, null, 2))
   ```

7. **Share discoveries**:
   ```bash
   echo '{"ts":"2026-03-08T10:00:00Z","worker":"{id}","type":"tech_stack_detected","data":{"stack":"react","framework":"nextjs","ui_lib":"shadcn"}}' >> {session}/discoveries.ndjson
   ```

8. **Report result**:
   ```javascript
   report_agent_job_result({
     id: "{id}",
     status: "completed",
     findings: "Detected React + shadcn stack. 24 color tokens, 7 typography scales. Missing dark mode variants. WCAG AA baseline with 3 contrast issues.",
     artifacts_produced: "artifacts/research/design-system-analysis.json;artifacts/research/component-inventory.json;artifacts/research/accessibility-audit.json;artifacts/research/design-intelligence.json",
     audit_score: "",
     audit_signal: "",
     error: ""
   })
   ```

**Success Criteria**:
- All 4 research artifacts produced with valid JSON
- Tech stack identified
- Component inventory complete
- Accessibility baseline documented

---

### Designer Role

**Responsibility**: Generate design tokens (W3C Design Tokens Format) and component specifications.

**Input**:
- `id`: Task ID (e.g., `DESIGN-001`)
- `title`: Task title
- `description`: Detailed task description
- `role`: `designer`
- `pipeline_mode`: `component`, `system`, or `full-system`
- `scope`: `tokens`, `components`, or `full`
- `context_from`: Upstream task IDs (e.g., `RESEARCH-001`)
- `prev_context`: Previous tasks' findings

**Execution Protocol**:

1. **Read shared discoveries and upstream artifacts**:
   ```javascript
   const discoveries = Read(`{session}/discoveries.ndjson`)
   const research = JSON.parse(Read(`{session}/artifacts/research/design-system-analysis.json`))
   ```

2. **Generate design tokens** (W3C Design Tokens Format):
   ```javascript
   const tokens = {
     "color": {
       "primary": {
         "$type": "color",
         "$value": "#3B82F6",
         "$description": "Primary brand color"
       },
       "primary-dark": {
         "$type": "color",
         "$value": "#1E40AF",
         "$description": "Primary color for dark mode"
       }
     },
     "typography": {
       "font-size-base": {
         "$type": "dimension",
         "$value": "16px"
       }
     },
     "spacing": {
       "space-1": {
         "$type": "dimension",
         "$value": "4px"
       }
     }
   }
   Write(`{session}/artifacts/design/design-tokens.json`, JSON.stringify(tokens, null, 2))
   ```

3. **Create component specifications**:
   ```markdown
   # Button Component Specification

   ## Overview
   Primary interactive element for user actions.

   ## States
   1. Default: Base appearance
   2. Hover: Elevated, color shift
   3. Active: Pressed state
   4. Disabled: Reduced opacity, no interaction
   5. Focus: Keyboard focus ring

   ## Variants
   - Primary: Filled background
   - Secondary: Outlined
   - Ghost: Text only

   ## Accessibility
   - ARIA role: button
   - Keyboard: Enter/Space to activate
   - Focus visible: 2px outline
   - Contrast: WCAG AA minimum

   ## Token Usage
   - Background: color.primary
   - Text: color.on-primary
   - Padding: spacing.space-3 spacing.space-4
   - Border radius: border.radius-md
   ```

4. **Ensure light/dark mode support**:
   - All color tokens have light and dark variants
   - Semantic tokens reference base tokens
   - Theme switching mechanism defined

5. **Share discoveries**:
   ```bash
   echo '{"ts":"2026-03-08T10:05:00Z","worker":"{id}","type":"token_generated","data":{"category":"color","count":24,"supports_dark_mode":true}}' >> {session}/discoveries.ndjson
   ```

6. **Report result**:
   ```javascript
   report_agent_job_result({
     id: "{id}",
     status: "completed",
     findings: "Generated design token system with 24 color tokens (light+dark), 7 typography scales, 6 spacing values. Created component spec for Button with all 5 states, ARIA roles, and responsive breakpoints.",
     artifacts_produced: "artifacts/design/design-tokens.json;artifacts/design/component-specs/button.md",
     audit_score: "",
     audit_signal: "",
     error: ""
   })
   ```

**Success Criteria**:
- Design tokens in W3C format
- All color tokens have light/dark variants
- Component specs include all 5 states
- Accessibility requirements documented

---

### Reviewer Role

**Responsibility**: 5-dimension quality audit for design artifacts.

**Input**:
- `id`: Task ID (e.g., `AUDIT-001`)
- `title`: Task title
- `description`: Detailed task description
- `role`: `reviewer`
- `pipeline_mode`: `component`, `system`, or `full-system`
- `scope`: `full`
- `audit_type`: `token-audit`, `component-audit`, or `final-audit`
- `context_from`: Upstream task IDs (e.g., `DESIGN-001`)
- `prev_context`: Previous tasks' findings

**Execution Protocol**:

1. **Read design artifacts**:
   ```javascript
   const tokens = JSON.parse(Read(`{session}/artifacts/design/design-tokens.json`))
   const componentSpecs = Glob(`{session}/artifacts/design/component-specs/*.md`)
   ```

2. **5-Dimension Audit**:

   **Consistency (20%)**:
   - Token naming follows convention
   - Semantic tokens reference base tokens correctly
   - Component specs use consistent terminology

   **Accessibility (25%)**:
   - Contrast ratios meet WCAG AA (4.5:1 text, 3:1 UI)
   - All interactive states have focus indicators
   - ARIA roles and labels defined
   - Keyboard navigation specified

   **Completeness (20%)**:
   - All 5 interactive states defined
   - Light and dark mode for all color tokens
   - Responsive breakpoints specified
   - Edge cases documented

   **Quality (15%)**:
   - Token values follow design principles (8px grid, etc.)
   - Component specs are clear and actionable
   - No hardcoded values in specs

   **Industry Compliance (20%)**:
   - Follows industry best practices (from research)
   - Meets domain-specific requirements (healthcare: stricter accessibility)
   - Aligns with design system standards

3. **Calculate weighted score**:
   ```javascript
   const score = (consistency * 0.20) + (accessibility * 0.25) + (completeness * 0.20) + (quality * 0.15) + (industry * 0.20)
   ```

4. **Determine audit signal**:
   - `audit_passed`: score >= 8.0 AND critical_count === 0
   - `audit_result`: score >= 6.0 AND critical_count === 0
   - `fix_required`: score < 6.0 OR critical_count > 0

5. **Write audit report**:
   ```markdown
   # Design Audit Report: {id}

   ## Overall Score: {score}/10

   ## Dimension Scores
   - Consistency: {consistency}/10 (20%)
   - Accessibility: {accessibility}/10 (25%)
   - Completeness: {completeness}/10 (20%)
   - Quality: {quality}/10 (15%)
   - Industry: {industry}/10 (20%)

   ## Issues Found

   ### Critical (0)
   (none)

   ### High (1)
   - Missing dark mode variant for semantic color tokens

   ### Medium (2)
   - Border radius not defined for pill variant
   - Focus ring color not specified

   ### Low (3)
   - Token naming could be more semantic
   - Component spec missing edge case documentation
   - Responsive breakpoint values not aligned with 8px grid

   ## Recommendations
   1. Add dark mode variants for all semantic tokens
   2. Define border-radius-pill token
   3. Specify focus ring color (accessibility.focus-ring)

   ## Verdict: {audit_signal}
   ```

6. **Share discoveries**:
   ```bash
   echo '{"ts":"2026-03-08T10:15:00Z","worker":"{id}","type":"issue_found","data":{"file":"design-tokens.json","line":0,"severity":"high","description":"Missing dark mode variant for semantic color tokens"}}' >> {session}/discoveries.ndjson
   ```

7. **Report result**:
   ```javascript
   report_agent_job_result({
     id: "{id}",
     status: "completed",
     findings: "Design audit: 8.4/10. Token naming consistent, all color tokens have light/dark variants, contrast ratios meet WCAG AA. Minor: missing border-radius for pill variant.",
     artifacts_produced: "artifacts/audit/audit-001.md",
     audit_score: "8.4",
     audit_signal: "audit_passed",
     error: ""
   })
   ```

**Success Criteria**:
- All 5 dimensions scored
- Audit report written with issue breakdown
- Audit signal determined (pass/result/fix_required)
- Score >= 8.0 with 0 critical issues for GC convergence

---

### Implementer Role

**Responsibility**: Implement component code from design specs with token consumption and accessibility.

**Input**:
- `id`: Task ID (e.g., `BUILD-001`)
- `title`: Task title
- `description`: Detailed task description
- `role`: `implementer`
- `pipeline_mode`: `component`, `system`, or `full-system`
- `scope`: `full`
- `context_from`: Upstream task IDs (e.g., `AUDIT-001`)
- `prev_context`: Previous tasks' findings

**Execution Protocol**:

1. **Read design artifacts and audit feedback**:
   ```javascript
   const tokens = JSON.parse(Read(`{session}/artifacts/design/design-tokens.json`))
   const componentSpec = Read(`{session}/artifacts/design/component-specs/button.md`)
   const auditReport = Read(`{session}/artifacts/audit/audit-001.md`)
   ```

2. **Generate CSS custom properties from tokens**:
   ```css
   :root {
     --color-primary: #3B82F6;
     --color-primary-dark: #1E40AF;
     --font-size-base: 16px;
     --space-1: 4px;
   }

   [data-theme="dark"] {
     --color-primary: var(--color-primary-dark);
   }
   ```

3. **Implement component with all 5 states**:
   ```tsx
   import React from 'react'

   interface ButtonProps {
     variant?: 'primary' | 'secondary' | 'ghost'
     disabled?: boolean
     children: React.ReactNode
   }

   export const Button: React.FC<ButtonProps> = ({ variant = 'primary', disabled, children }) => {
     return (
       <button
         className={`btn btn-${variant}`}
         disabled={disabled}
         aria-disabled={disabled}
       >
         {children}
       </button>
     )
   }
   ```

4. **Add ARIA attributes and keyboard navigation**:
   - `role="button"` (if not native button)
   - `aria-disabled` for disabled state
   - `aria-pressed` for toggle buttons
   - Focus management with `:focus-visible`

5. **Validate no hardcoded values**:
   - All colors use `var(--token-name)`
   - All spacing uses token variables
   - All typography uses token variables

6. **Follow project patterns**:
   - Match existing component structure
   - Use same import patterns
   - Follow naming conventions from research

7. **Share discoveries**:
   ```bash
   echo '{"ts":"2026-03-08T10:10:00Z","worker":"{id}","type":"file_modified","data":{"file":"tokens.css","change":"Generated CSS custom properties from design tokens","lines_added":85}}' >> {session}/discoveries.ndjson
   ```

8. **Report result**:
   ```javascript
   report_agent_job_result({
     id: "{id}",
     status: "completed",
     findings: "Implemented Button component with all 5 states, ARIA attributes, keyboard navigation. Generated CSS custom properties from design tokens. No hardcoded values.",
     artifacts_produced: "artifacts/build/token-files/tokens.css;artifacts/build/component-files/Button.tsx",
     audit_score: "",
     audit_signal: "",
     error: ""
   })
   ```

**Success Criteria**:
- Component code implements all 5 states
- All values use token variables (no hardcoded)
- ARIA attributes present
- Keyboard navigation functional
- Follows project patterns

---

## Generator-Critic Loop (Designer <-> Reviewer)

When reviewer returns `audit_signal: "fix_required"`:

1. Coordinator creates `DESIGN-fix-{round}` task (max 2 rounds)
2. Designer reads audit feedback, applies targeted fixes
3. Coordinator creates `AUDIT-recheck-{round}` task
4. Reviewer re-audits fixed artifacts
5. Convergence: score >= 8.0 AND critical_count === 0

---

## Shared Discovery Board

All roles read/write `{session}/discoveries.ndjson`:

**Discovery Types**:
- `tech_stack_detected`: Tech stack identified
- `design_pattern_found`: Existing design pattern
- `token_generated`: Design token category created
- `file_modified`: File change recorded
- `issue_found`: Audit issue discovered
- `anti_pattern_violation`: Design anti-pattern detected
- `artifact_produced`: Deliverable created

**Protocol**:
1. Read discoveries at start
2. Append discoveries during execution (never modify existing)
3. Deduplicate by type + data key

---

## Error Handling

| Error | Resolution |
|-------|------------|
| Upstream artifact not found | Report error, mark failed |
| Design tokens invalid JSON | Report error, mark failed |
| Component spec missing required sections | Report error, mark failed |
| Audit score calculation error | Default to 0, report error |
| Implementation build fails | Report error, mark failed |
| CLI tool timeout | Fallback to direct implementation |

---

## Output Format

All roles use `report_agent_job_result` with this schema:

```json
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries (max 500 chars)",
  "artifacts_produced": "semicolon-separated paths",
  "audit_score": "0-10 (reviewer only)",
  "audit_signal": "audit_passed|audit_result|fix_required (reviewer only)",
  "error": ""
}
```
