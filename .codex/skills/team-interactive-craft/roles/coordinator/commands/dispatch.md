# Command: Dispatch

Create the interactive craft task chain with correct dependencies and structured task descriptions. Supports single, gallery, and page pipeline modes.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| User requirement | From coordinator Phase 1 | Yes |
| Session folder | From coordinator Phase 2 | Yes |
| Pipeline mode | From tasks.json `pipeline_mode` | Yes |
| Interaction type | From tasks.json `interaction_type` | Yes |

1. Load user requirement and scope from tasks.json
2. Load pipeline stage definitions from specs/pipelines.md
3. Read `pipeline_mode` and `interaction_type` from tasks.json

## Phase 3: Task Chain Creation (Mode-Branched)

### Task Entry Template

Each task in tasks.json `tasks` object:
```json
{
  "<TASK-ID>": {
    "title": "<concise title>",
    "description": "PURPOSE: <what this task achieves> | Success: <measurable completion criteria>\nTASK:\n  - <step 1: specific action>\n  - <step 2: specific action>\n  - <step 3: specific action>\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <interaction-scope>\n  - Components: <component-list>\n  - Upstream artifacts: <artifact-1>, <artifact-2>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <deliverable path> + <quality criteria>\nCONSTRAINTS: <scope limits, focus areas>",
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
| `single` | Create 4 tasks: RESEARCH -> INTERACT -> BUILD -> A11Y |
| `gallery` | Create 6 tasks: RESEARCH -> INTERACT-001 -> BUILD-001 -> INTERACT-002 -> BUILD-002 -> A11Y |
| `page` | Create 4+ tasks: RESEARCH -> INTERACT -> [BUILD-001..N parallel] -> A11Y |

---

### Single Pipeline Task Chain

**RESEARCH-001** (researcher):
```json
{
  "RESEARCH-001": {
    "title": "Interaction pattern analysis and browser API audit",
    "description": "PURPOSE: Analyze interaction patterns, browser API availability, and reference implementations | Success: 3 research artifacts with valid data\nTASK:\n  - Catalog existing interactive components in project\n  - Audit browser API usage (IntersectionObserver, ResizeObserver, Pointer Events, Touch Events)\n  - Collect reference patterns for target component type\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <interaction-scope>\n  - Components: <component-list>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/research/*.json | All 3 research files with valid JSON\nCONSTRAINTS: Read-only analysis | Focus on <interaction-scope>",
    "role": "researcher",
    "prefix": "RESEARCH",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**INTERACT-001** (interaction-designer):
```json
{
  "INTERACT-001": {
    "title": "Interaction blueprint with state machine and event flows",
    "description": "PURPOSE: Design complete interaction blueprint with state machine and event flows | Success: Blueprint with all states, events, and keyboard mappings defined\nTASK:\n  - Define state machine (idle -> hover -> active -> animating -> complete)\n  - Map event flows (pointer/touch/keyboard -> handlers -> state transitions)\n  - Specify gesture parameters (lerp speed, thresholds, easing)\n  - Design animation choreography (entry/exit/idle transitions)\n  - Create touch/keyboard/mouse mapping table\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <interaction-scope>\n  - Upstream artifacts: research/*.json\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/interaction/blueprints/<component-name>.md | Complete state machine + event map + keyboard coverage\nCONSTRAINTS: Vanilla JS only | GPU-only animations | Progressive enhancement",
    "role": "interaction-designer",
    "prefix": "INTERACT",
    "deps": ["RESEARCH-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**BUILD-001** (builder):
```json
{
  "BUILD-001": {
    "title": "Vanilla JS + CSS interactive component implementation",
    "description": "PURPOSE: Implement interactive component as vanilla JS + CSS | Success: Working ES module + CSS with all states, touch-aware, keyboard accessible\nTASK:\n  - Implement ES module component class from interaction blueprint\n  - Write CSS with custom properties (no preprocessor)\n  - Add progressive enhancement (content works without JS)\n  - Use GPU-only animations (transform + opacity)\n  - Implement pointer events with touch fallback\n  - Add ResizeObserver for responsive behavior\n  - Add IntersectionObserver for scroll triggers (if applicable)\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <interaction-scope>\n  - Upstream artifacts: interaction/blueprints/*.md, research/*.json\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/build/components/<name>.js + <name>.css | Zero dependencies, all states implemented\nCONSTRAINTS: No npm packages | ES modules only | No inline styles | < 5ms per frame",
    "role": "builder",
    "prefix": "BUILD",
    "deps": ["INTERACT-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**A11Y-001** (a11y-tester):
```json
{
  "A11Y-001": {
    "title": "Accessibility audit of built component",
    "description": "PURPOSE: Audit accessibility of built component | Success: Audit report with pass/fail per check, 0 critical issues\nTASK:\n  - Test keyboard navigation (tab order, arrow keys, escape, enter/space)\n  - Check screen reader compatibility (ARIA roles, states, live regions)\n  - Verify reduced motion fallback (prefers-reduced-motion)\n  - Test focus management (visible indicator, focus trap for overlays)\n  - Check color contrast (foreground/background ratio)\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <interaction-scope>\n  - Upstream artifacts: build/components/*.js, build/components/*.css, interaction/blueprints/*.md\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/a11y/a11y-audit-001.md | Per-check pass/fail with remediation suggestions\nCONSTRAINTS: Read-only analysis | GC convergence: 0 critical issues",
    "role": "a11y-tester",
    "prefix": "A11Y",
    "deps": ["BUILD-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

---

### Gallery Pipeline Task Chain

Create tasks in dependency order:

| Task | Role | deps | Description |
|------|------|------|-------------|
| RESEARCH-001 | researcher | [] | Interaction patterns + browser API audit |
| INTERACT-001 | interaction-designer | [RESEARCH-001] | Base component interaction blueprint |
| BUILD-001 | builder | [INTERACT-001] | Base component implementation |
| INTERACT-002 | interaction-designer | [BUILD-001] | Gallery/scroll-snap interaction blueprint |
| BUILD-002 | builder | [INTERACT-002] | Gallery container + navigation implementation |
| A11Y-001 | a11y-tester | [BUILD-002] | Full gallery accessibility audit |

Task descriptions follow same template as single pipeline, with subject-specific content:
- INTERACT-002 focuses on scroll-snap container, navigation dots, active item detection
- BUILD-002 focuses on gallery container with CSS scroll-snap, IntersectionObserver for active item, navigation controls

---

### Page Pipeline Task Chain

| Task | Role | deps | Description |
|------|------|------|-------------|
| RESEARCH-001 | researcher | [] | Interaction patterns for all page sections |
| INTERACT-001 | interaction-designer | [RESEARCH-001] | Blueprints for all interactive sections |
| BUILD-001..N | builder | [INTERACT-001] | One task per section (parallel fan-out) |
| A11Y-001 | a11y-tester | [BUILD-001..N] | Full page accessibility audit |

**Parallel fan-out**: Create one BUILD task per distinct interactive section detected in the interaction blueprint. Each BUILD task deps only on INTERACT-001. A11Y-001 deps on ALL BUILD tasks.

Task descriptions for each BUILD-00N specify which section to implement, referencing the corresponding section in the interaction blueprint.

---

## Phase 4: Validation

Verify task chain integrity:

| Check | Method | Expected |
|-------|--------|----------|
| Task count correct | tasks.json count | single: 4, gallery: 6, page: 3+N |
| Dependencies correct | Trace dependency graph | Acyclic, correct deps |
| No circular dependencies | Trace dependency graph | Acyclic |
| Task IDs use correct prefixes | Pattern check | RESEARCH/INTERACT/BUILD/A11Y |
| Structured descriptions complete | Each has PURPOSE/TASK/CONTEXT/EXPECTED/CONSTRAINTS | All present |

If validation fails, fix the specific task and re-validate.
