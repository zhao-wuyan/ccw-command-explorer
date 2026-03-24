# Command: Dispatch

Create the frontend development task chain with correct dependencies and structured task descriptions. Supports page, feature, and system pipeline modes.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| User requirement | From coordinator Phase 1 | Yes |
| Session folder | From coordinator Phase 2 | Yes |
| Pipeline mode | From session.json `pipeline_mode` | Yes |
| Industry | From session.json `industry` | Yes |
| Constraints | From session.json `constraints` | No |

1. Load user requirement and scope from session.json
2. Load pipeline mode (page / feature / system) from session.json
3. Load industry and constraints for task descriptions

## Phase 3: Task Chain Creation

### Task Description Template

Every task is a JSON entry in the tasks array, written to `<session>/tasks.json`:

```json
{
  "id": "<TASK-ID>",
  "subject": "<TASK-ID>",
  "description": "PURPOSE: <what this task achieves> | Success: <measurable completion criteria>\nTASK:\n  - <step 1: specific action>\n  - <step 2: specific action>\n  - <step 3: specific action>\nCONTEXT:\n  - Session: <session-folder>\n  - Industry: <industry>\n  - Scope: <scope>\n  - Upstream artifacts: <artifact-1>, <artifact-2>\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <deliverable path> + <quality criteria>\nCONSTRAINTS: <scope limits, focus areas>",
  "status": "pending",
  "owner": "<role>",
  "blockedBy": ["<dependency-list>"]
}
```

After building all entries, write the full array to `<session>/tasks.json`.

### Mode Router

| Mode | Task Chain |
|------|------------|
| `page` | ANALYZE-001 -> ARCH-001 -> DEV-001 -> QA-001 |
| `feature` | ANALYZE-001 -> ARCH-001 -> QA-001 -> DEV-001 -> QA-002 |
| `system` | ANALYZE-001 -> ARCH-001 -> QA-001 -> [ARCH-002 &#124;&#124; DEV-001] -> QA-002 -> DEV-002 -> QA-003 |

---

### Page Mode Task Chain (4 tasks)

**ANALYZE-001** (analyst):
```json
{
  "id": "ANALYZE-001",
  "subject": "ANALYZE-001",
  "description": "PURPOSE: Analyze frontend requirements and retrieve design intelligence | Success: design-intelligence.json produced with industry-specific recommendations\nTASK:\n  - Detect tech stack and existing design system\n  - Retrieve design intelligence via ui-ux-pro-max (or LLM fallback)\n  - Analyze existing codebase patterns\n  - Compile design-intelligence.json and requirements.md\nCONTEXT:\n  - Session: <session-folder>\n  - Industry: <industry>\n  - Scope: <scope>\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/analysis/design-intelligence.json + requirements.md | Structured design data\nCONSTRAINTS: Read-only analysis | No code modifications",
  "status": "pending",
  "owner": "analyst",
  "blockedBy": []
}
```

**ARCH-001** (architect):
```json
{
  "id": "ARCH-001",
  "subject": "ARCH-001",
  "description": "PURPOSE: Define design token system and component architecture | Success: design-tokens.json + component specs produced\nTASK:\n  - Load design intelligence from analyst output\n  - Generate design token system (colors, typography, spacing, shadows)\n  - Define component architecture and specs\n  - Generate project structure\nCONTEXT:\n  - Session: <session-folder>\n  - Industry: <industry>\n  - Scope: full\n  - Upstream artifacts: design-intelligence.json, requirements.md\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/architecture/design-tokens.json + component-specs/ + project-structure.md\nCONSTRAINTS: Use ui-ux-pro-max recommendations for token values | Support light/dark mode",
  "status": "pending",
  "owner": "architect",
  "blockedBy": ["ANALYZE-001"]
}
```

**DEV-001** (developer):
```json
{
  "id": "DEV-001",
  "subject": "DEV-001",
  "description": "PURPOSE: Implement frontend page/components from architecture artifacts | Success: All planned files implemented with design token usage\nTASK:\n  - Load design tokens, component specs, project structure\n  - Generate CSS custom properties from design tokens\n  - Implement components following specs and coding standards\n  - Self-validate: no hardcoded colors, cursor-pointer, focus styles, responsive\nCONTEXT:\n  - Session: <session-folder>\n  - Industry: <industry>\n  - Scope: full\n  - Upstream artifacts: design-tokens.json, component-specs/, project-structure.md\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: src/styles/tokens.css + component files | Design-token compliant code\nCONSTRAINTS: Use CSS variables from tokens | Mobile-first responsive | WCAG AA",
  "status": "pending",
  "owner": "developer",
  "blockedBy": ["ARCH-001"]
}
```

**QA-001** (qa):
```json
{
  "id": "QA-001",
  "subject": "QA-001",
  "description": "PURPOSE: Execute 5-dimension quality audit on implementation | Success: Score >= 8 with 0 critical issues\nTASK:\n  - Load design intelligence and tokens for compliance checks\n  - Execute 5-dimension audit (code quality, accessibility, design compliance, UX, pre-delivery)\n  - Calculate weighted score and determine verdict\n  - Write audit report\nCONTEXT:\n  - Session: <session-folder>\n  - Industry: <industry>\n  - Review type: code-review\n  - Upstream artifacts: design-intelligence.json, design-tokens.json, src/**\n  - Shared memory: <session>/.msg/meta.json\nEXPECTED: <session>/qa/audit-001.md | Weighted score + verdict + categorized issues\nCONSTRAINTS: Read-only review | No code modifications",
  "status": "pending",
  "owner": "qa",
  "blockedBy": ["DEV-001"]
}
```

---

### Feature Mode Task Chain (5 tasks)

Create ANALYZE-001 and ARCH-001 as page mode above, then:

**QA-001** (qa, architecture review):
- blockedBy: ["ARCH-001"]
- Review type: architecture-review
- Reviews architecture artifacts before developer starts

**DEV-001** (developer):
- blockedBy: ["QA-001"] (waits for arch review to pass)

**QA-002** (qa, code review):
- blockedBy: ["DEV-001"]
- Review type: code-review

---

### System Mode Task Chain (7 tasks)

Create ANALYZE-001, ARCH-001, QA-001 as feature mode above, then:

**ARCH-002** (architect, parallel with DEV-001):
- blockedBy: ["QA-001"]
- Scope: components (refined specs after QA feedback)

**DEV-001** (developer, parallel with ARCH-002):
- blockedBy: ["QA-001"]
- Scope: tokens (CSS generation)

**QA-002** (qa):
- blockedBy: ["ARCH-002"]
- Review type: component-review

**DEV-002** (developer):
- blockedBy: ["QA-002"]
- Scope: components

**QA-003** (qa, final review):
- blockedBy: ["DEV-002"]
- Review type: final

## Phase 4: Validation

| Check | Method | Expected |
|-------|--------|----------|
| Task count correct | Read tasks.json, count entries | page: 4, feature: 5, system: 7 |
| Dependencies correct | Trace dependency graph | Acyclic, correct blockedBy |
| Structured descriptions | Each has PURPOSE/TASK/CONTEXT/EXPECTED/CONSTRAINTS | All present |
| Owner assignments correct | Role matches task prefix | ANALYZE->analyst, ARCH->architect, DEV->developer, QA->qa |

If validation fails, fix the specific task entry in tasks.json and re-validate.
