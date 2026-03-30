# Command: Dispatch

Create the visual accessibility task chain with correct dependencies and structured task descriptions. Supports audit-only and full pipeline modes.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| User requirement | From coordinator Phase 1 | Yes |
| Session folder | From coordinator Phase 2 | Yes |
| Pipeline mode | From session tasks.json `pipeline_mode` | Yes |
| Target info | From session tasks.json `target` | Yes |

1. Load user requirement and scope from tasks.json
2. Load pipeline stage definitions from specs/pipelines.md
3. Read `pipeline_mode` and `target` from tasks.json

## Phase 3: Task Chain Creation (Mode-Branched)

### Task Description Template

Every task is added to tasks.json with structured format:

```json
{
  "<TASK-ID>": {
    "title": "<task title>",
    "description": "PURPOSE: <what this task achieves> | Success: <measurable completion criteria>\nTASK:\n  - <step 1: specific action>\n  - <step 2: specific action>\n  - <step 3: specific action>\nCONTEXT:\n  - Session: <session-folder>\n  - Target: <URL or file path>\n  - WCAG Level: <AA|AAA>\n  - Upstream artifacts: <artifact-1>, <artifact-2>\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <deliverable path> + <quality criteria>\nCONSTRAINTS: <scope limits, focus areas>",
    "role": "<role-name>",
    "prefix": "<PREFIX>",
    "deps": ["<dependency-list>"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

### Mode Router

| Mode | Action |
|------|--------|
| `audit-only` | Create 4 tasks: [COLOR-001 + TYPO-001 + FOCUS-001] parallel -> REMED-001 |
| `full` | Create 7 tasks: [COLOR-001 + TYPO-001 + FOCUS-001] -> REMED-001 -> FIX-001 -> [COLOR-002 + FOCUS-002] |

---

### Audit-Only Pipeline Task Chain

**COLOR-001** (color-auditor):
```json
{
  "COLOR-001": {
    "title": "OKLCH Color Contrast Audit",
    "description": "PURPOSE: OKLCH color contrast audit for all color combinations | Success: Complete color audit with WCAG 2.1 + APCA contrast ratios and color blindness assessment\nTASK:\n  - Extract all color values (OKLCH, HSL, RGB, hex) from stylesheets\n  - Calculate WCAG 2.1 contrast ratios for all text/background combinations\n  - Calculate APCA Lc values for body and large text\n  - Assess OKLCH lightness ranges for text and backgrounds\n  - Simulate color blindness (protanopia, deuteranopia, tritanopia)\n  - Check dark mode color parity if applicable\nCONTEXT:\n  - Session: <session-folder>\n  - Target: <target>\n  - WCAG Level: <level>\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/audits/color/color-audit-001.md | Pass/fail per color combination\nCONSTRAINTS: Read-only analysis | Use Chrome DevTools for computed styles when available",
    "role": "color-auditor",
    "prefix": "COLOR",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**TYPO-001** (typo-auditor):
```json
{
  "TYPO-001": {
    "title": "Typography Readability Audit",
    "description": "PURPOSE: Typography readability audit across all viewports | Success: Complete typography audit with size, line-height, reading width at each breakpoint\nTASK:\n  - Audit font sizes at each breakpoint (320px, 768px, 1024px, 1400px)\n  - Validate minimum body text >= 16px on mobile\n  - Check line-height ratios (body 1.5-1.75, headings 1.1-1.3)\n  - Validate clamp() functions for responsive scaling\n  - Measure reading width (45-75 characters per line)\n  - Assess font loading strategy (font-display values)\nCONTEXT:\n  - Session: <session-folder>\n  - Target: <target>\n  - WCAG Level: <level>\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/audits/typography/typo-audit-001.md | Breakpoint-by-breakpoint report\nCONSTRAINTS: Read-only analysis | Screenshot at multiple viewports if Chrome DevTools available",
    "role": "typo-auditor",
    "prefix": "TYPO",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**FOCUS-001** (focus-auditor):
```json
{
  "FOCUS-001": {
    "title": "Focus & Keyboard Accessibility Audit",
    "description": "PURPOSE: Focus management and keyboard accessibility audit | Success: Complete focus audit with tab order, indicator visibility, ARIA coverage\nTASK:\n  - Audit tab order for logical sequence and no tab traps\n  - Check focus indicator visibility (outline >= 2px, contrast >= 3:1)\n  - Verify :focus-visible usage for keyboard vs mouse distinction\n  - Check skip link presence and functionality\n  - Audit focus traps in modals/dialogs (Tab cycles, Escape dismisses)\n  - Verify ARIA live regions for dynamic content\n  - Check ARIA roles and states on interactive elements\n  - Validate keyboard operability (Enter/Space, Arrow keys)\nCONTEXT:\n  - Session: <session-folder>\n  - Target: <target>\n  - WCAG Level: <level>\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/audits/focus/focus-audit-001.md | Element-by-element focus report\nCONSTRAINTS: Read-only analysis | Tab through elements if Chrome DevTools available",
    "role": "focus-auditor",
    "prefix": "FOCUS",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**CRITICAL**: COLOR-001, TYPO-001, FOCUS-001 have NO deps -- they run in PARALLEL.

**REMED-001** (remediation-planner):
```json
{
  "REMED-001": {
    "title": "Prioritized Remediation Plan",
    "description": "PURPOSE: Synthesize all 3 audit findings into prioritized remediation plan | Success: Complete remediation plan with severity ranking, code-level fix guidance, WCAG criterion mapping\nTASK:\n  - Read color, typography, and focus audit reports\n  - Merge and deduplicate findings\n  - Prioritize by severity (Critical > High > Medium > Low)\n  - Group by file/component for efficient fixing\n  - Provide code-level fix guidance (specific CSS/HTML changes)\n  - Map each fix to WCAG success criterion\n  - Estimate effort per fix\nCONTEXT:\n  - Session: <session-folder>\n  - Target: <target>\n  - WCAG Level: <level>\n  - Upstream artifacts: audits/color/color-audit-001.md, audits/typography/typo-audit-001.md, audits/focus/focus-audit-001.md\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/remediation/remediation-plan.md | All critical/high issues addressed\nCONSTRAINTS: Read-only synthesis | No code modifications",
    "role": "remediation-planner",
    "prefix": "REMED",
    "deps": ["COLOR-001", "TYPO-001", "FOCUS-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

---

### Full Pipeline Task Chain

Same as audit-only (COLOR-001, TYPO-001, FOCUS-001, REMED-001), plus:

**FIX-001** (fix-implementer):
```json
{
  "FIX-001": {
    "title": "Implement Accessibility Fixes",
    "description": "PURPOSE: Implement accessibility fixes from remediation plan | Success: All critical and high severity issues fixed with passing contrast ratios and ARIA validation\nTASK:\n  - Read remediation plan for prioritized fix list\n  - Apply OKLCH color corrections for contrast compliance\n  - Add/fix focus styles (outline, outline-offset, :focus-visible)\n  - Add missing ARIA attributes (role, aria-label, aria-live, aria-expanded)\n  - Add reduced-motion media queries where needed\n  - Fix typography (clamp(), line-height, max-width for reading)\n  - Add skip link if missing\n  - Apply fixes in priority order (critical first)\nCONTEXT:\n  - Session: <session-folder>\n  - Target: <target>\n  - WCAG Level: <level>\n  - Upstream artifacts: remediation/remediation-plan.md\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: Modified source files + <session>/fixes/fix-summary-001.md | All critical/high fixes applied\nCONSTRAINTS: Modify only files identified in remediation plan | Preserve existing functionality",
    "role": "fix-implementer",
    "prefix": "FIX",
    "deps": ["REMED-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**COLOR-002** (color-auditor):
```json
{
  "COLOR-002": {
    "title": "Re-audit Color Contrast After Fixes",
    "description": "PURPOSE: Re-audit color contrast after fixes applied | Success: All color combinations pass WCAG target level\nTASK:\n  - Re-extract all color values from modified stylesheets\n  - Re-calculate WCAG 2.1 contrast ratios\n  - Re-calculate APCA Lc values\n  - Compare before/after for each fixed combination\n  - Verify no regressions in unfixed combinations\nCONTEXT:\n  - Session: <session-folder>\n  - Target: <target>\n  - WCAG Level: <level>\n  - Upstream artifacts: fixes/fix-summary-001.md, audits/color/color-audit-001.md\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/re-audit/color-audit-002.md | Before/after comparison with pass/fail\nCONSTRAINTS: Read-only verification | Focus on fixed items + regression check",
    "role": "color-auditor",
    "prefix": "COLOR",
    "deps": ["FIX-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**FOCUS-002** (focus-auditor):
```json
{
  "FOCUS-002": {
    "title": "Re-audit Focus Management After Fixes",
    "description": "PURPOSE: Re-audit focus management after fixes applied | Success: All focus indicators visible with correct ARIA attributes\nTASK:\n  - Re-audit tab order after DOM changes\n  - Verify focus indicator fixes (outline, contrast)\n  - Check new ARIA attributes are valid\n  - Verify skip link implementation\n  - Test keyboard operability of fixed elements\n  - Compare before/after for each fixed element\nCONTEXT:\n  - Session: <session-folder>\n  - Target: <target>\n  - WCAG Level: <level>\n  - Upstream artifacts: fixes/fix-summary-001.md, audits/focus/focus-audit-001.md\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/re-audit/focus-audit-002.md | Before/after comparison with pass/fail\nCONSTRAINTS: Read-only verification | Focus on fixed items + regression check",
    "role": "focus-auditor",
    "prefix": "FOCUS",
    "deps": ["FIX-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**CRITICAL**: COLOR-002 and FOCUS-002 both blocked only by FIX-001 -- they run in PARALLEL after fixes.

---

## Phase 4: Validation

Verify task chain integrity:

| Check | Method | Expected |
|-------|--------|----------|
| Task count correct | tasks.json count | audit-only: 4, full: 7 |
| Dependencies correct | Trace dependency graph | Acyclic, correct deps |
| No circular dependencies | Trace dependency graph | Acyclic |
| 3 audit tasks have NO deps | Pattern check | COLOR-001, TYPO-001, FOCUS-001 are parallel |
| REMED-001 blocked by all 3 | Check deps | [COLOR-001, TYPO-001, FOCUS-001] |
| Task IDs use correct prefixes | Pattern check | COLOR/TYPO/FOCUS/REMED/FIX |
| Structured descriptions complete | Each has PURPOSE/TASK/CONTEXT/EXPECTED/CONSTRAINTS | All present |

If validation fails, fix the specific task and re-validate.
