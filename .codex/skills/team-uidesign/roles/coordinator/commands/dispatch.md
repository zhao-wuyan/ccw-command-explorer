# Command: Dispatch

Create the UI design task chain with correct dependencies and structured task descriptions. Supports component, system, and full-system pipeline modes.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| User requirement | From coordinator Phase 1 | Yes |
| Session folder | From coordinator Phase 2 | Yes |
| Pipeline mode | From tasks.json `pipeline_mode` | Yes |
| Industry config | From tasks.json `industry` | Yes |

1. Load user requirement and design scope from tasks.json
2. Load pipeline stage definitions from specs/pipelines.md
3. Read `pipeline_mode` and `industry` from tasks.json

## Phase 3: Task Chain Creation (Mode-Branched)

### Task Entry Template

Each task in tasks.json `tasks` object:
```json
{
  "<TASK-ID>": {
    "title": "<concise title>",
    "description": "PURPOSE: <what this task achieves> | Success: <measurable completion criteria>\nTASK:\n  - <step 1: specific action>\n  - <step 2: specific action>\n  - <step 3: specific action>\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <design-scope>\n  - Industry: <industry>\n  - Upstream artifacts: <artifact-1>, <artifact-2>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <deliverable path> + <quality criteria>\nCONSTRAINTS: <scope limits, focus areas>",
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
| `component` | Create 4 tasks: RESEARCH -> DESIGN -> AUDIT -> BUILD |
| `system` | Create 7 tasks: dual-track with 2 sync points |
| `full-system` | Create 8 tasks: dual-track with 3 sync points (final audit) |

---

### Component Pipeline Task Chain

**RESEARCH-001** (researcher):
```json
{
  "RESEARCH-001": {
    "title": "Design system analysis and component inventory",
    "description": "PURPOSE: Analyze existing design system, build component inventory, assess accessibility baseline | Success: 4 research artifacts produced with valid data\nTASK:\n  - Analyze existing design tokens and styling patterns\n  - Build component inventory with props and states\n  - Assess accessibility baseline (WCAG level, ARIA coverage)\n  - Retrieve design intelligence via ui-ux-pro-max\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <design-scope>\n  - Industry: <industry>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/research/*.json | All 4 research files with valid JSON\nCONSTRAINTS: Read-only analysis | Focus on <design-scope>",
    "role": "researcher",
    "prefix": "RESEARCH",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**DESIGN-001** (designer):
```json
{
  "DESIGN-001": {
    "title": "Define component design with tokens and specifications",
    "description": "PURPOSE: Define component design with tokens and specifications | Success: Design tokens + component spec with all states defined\nTASK:\n  - Define design tokens consuming research findings\n  - Create component specification with all 5 interactive states\n  - Ensure accessibility spec (role, ARIA, keyboard, focus)\n  - Reference design intelligence recommendations\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <design-scope>\n  - Industry: <industry>\n  - Upstream artifacts: research/*.json\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/design/design-tokens.json + component-specs/*.md | Complete token system + spec\nCONSTRAINTS: Follow W3C Design Tokens Format | All color tokens need light/dark",
    "role": "designer",
    "prefix": "DESIGN",
    "deps": ["RESEARCH-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**AUDIT-001** (reviewer):
```json
{
  "AUDIT-001": {
    "title": "Audit design for consistency, accessibility, and quality",
    "description": "PURPOSE: Audit design for consistency, accessibility, and quality | Success: Audit score >= 8 with 0 critical issues\nTASK:\n  - Score 5 dimensions: consistency, accessibility, completeness, quality, industry compliance\n  - Check token naming, theme completeness, contrast ratios\n  - Verify component states and ARIA spec\n  - Check against design intelligence anti-patterns\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <design-scope>\n  - Industry: <industry>\n  - Upstream artifacts: design/design-tokens.json, design/component-specs/*.md\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/audit/audit-001.md | 5-dimension scored report\nCONSTRAINTS: Read-only analysis | GC convergence: score >= 8 and 0 critical",
    "role": "reviewer",
    "prefix": "AUDIT",
    "deps": ["DESIGN-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**BUILD-001** (implementer):
```json
{
  "BUILD-001": {
    "title": "Implement component code from design specs",
    "description": "PURPOSE: Implement component code from design specs | Success: Production code with token consumption and accessibility\nTASK:\n  - Generate CSS custom properties from design tokens\n  - Implement component with all 5 states\n  - Add ARIA attributes and keyboard navigation\n  - Validate no hardcoded values\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <design-scope>\n  - Industry: <industry>\n  - Upstream artifacts: design/design-tokens.json, design/component-specs/*.md, audit/audit-001.md\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/build/**/* | Component + tokens CSS/TS + tests\nCONSTRAINTS: Use var(--token-name) only | Follow project patterns",
    "role": "implementer",
    "prefix": "BUILD",
    "deps": ["AUDIT-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

---

### System Pipeline Task Chain (Dual-Track)

Create tasks in dependency order:

| Task | Role | deps | Description |
|------|------|------|-------------|
| RESEARCH-001 | researcher | [] | Design system analysis |
| DESIGN-001 | designer | [RESEARCH-001] | Token system design |
| AUDIT-001 | reviewer | [DESIGN-001] | Token audit [Sync Point 1] |
| DESIGN-002 | designer | [AUDIT-001] | Component specification |
| BUILD-001 | implementer | [AUDIT-001] | Token code implementation |
| AUDIT-002 | reviewer | [DESIGN-002] | Component audit [Sync Point 2] |
| BUILD-002 | implementer | [AUDIT-002, BUILD-001] | Component code implementation |

Task descriptions follow same template as component pipeline, with subject-specific content for tokens vs components and appropriate upstream artifacts.

---

### Full-System Pipeline Task Chain

Same as System Pipeline, plus:

| Task | Role | deps | Description |
|------|------|------|-------------|
| AUDIT-003 | reviewer | [BUILD-002] | Final integrated audit (cross-cutting) |

---

## Phase 4: Validation

Verify task chain integrity:

| Check | Method | Expected |
|-------|--------|----------|
| Task count correct | tasks.json count | component: 4, system: 7, full-system: 8 |
| Dependencies correct | Trace dependency graph | Acyclic, correct deps |
| No circular dependencies | Trace dependency graph | Acyclic |
| Task IDs use correct prefixes | Pattern check | RESEARCH/DESIGN/AUDIT/BUILD |
| Structured descriptions complete | Each has PURPOSE/TASK/CONTEXT/EXPECTED/CONSTRAINTS | All present |

If validation fails, fix the specific task and re-validate.
