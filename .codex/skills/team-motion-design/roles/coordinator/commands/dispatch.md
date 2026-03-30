# Command: Dispatch

Create the motion design task chain with correct dependencies and structured task descriptions. Supports tokens, component, and page pipeline modes.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| User requirement | From coordinator Phase 1 | Yes |
| Session folder | From coordinator Phase 2 | Yes |
| Pipeline mode | From tasks.json `pipeline_mode` | Yes |
| Framework config | From tasks.json `framework` | Yes |

1. Load user requirement and motion scope from tasks.json
2. Load pipeline stage definitions from specs/pipelines.md
3. Read `pipeline_mode` and `framework` from tasks.json

## Phase 3: Task Chain Creation (Mode-Branched)

### Task Description Template

Every task is added to tasks.json with structured format:

```json
{
  "<TASK-ID>": {
    "title": "<task title>",
    "description": "PURPOSE: <what this task achieves> | Success: <measurable completion criteria>\nTASK:\n  - <step 1: specific action>\n  - <step 2: specific action>\n  - <step 3: specific action>\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <motion-scope>\n  - Framework: <framework>\n  - Upstream artifacts: <artifact-1>, <artifact-2>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <deliverable path> + <quality criteria>\nCONSTRAINTS: <scope limits, focus areas>",
    "role": "<role>",
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
| `tokens` | Create 4 tasks: MRESEARCH -> CHOREO -> ANIM -> MTEST |
| `component` | Create 4 tasks: MRESEARCH -> CHOREO -> ANIM -> MTEST (GC loop) |
| `page` | Create 4+ tasks: MRESEARCH -> CHOREO -> [ANIM-001..N parallel] -> MTEST |

---

### Tokens Pipeline Task Chain

**MRESEARCH-001** (motion-researcher):
```json
{
  "MRESEARCH-001": {
    "title": "Audit existing animations and measure performance baseline",
    "description": "PURPOSE: Audit existing animations, measure performance baseline, catalog easing patterns | Success: 3 research artifacts produced with valid data\nTASK:\n  - Scan codebase for existing CSS @keyframes, transitions, JS animation code\n  - Measure paint/composite costs via Chrome DevTools performance traces (if available)\n  - Catalog existing easing functions and timing patterns\n  - Identify properties being animated (safe vs unsafe for compositor)\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <motion-scope>\n  - Framework: <framework>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/research/*.json | All 3 research files with valid JSON\nCONSTRAINTS: Read-only analysis | Focus on existing animation patterns",
    "role": "motion-researcher",
    "prefix": "MRESEARCH",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**CHOREO-001** (choreographer):
```json
{
  "CHOREO-001": {
    "title": "Design animation token system",
    "description": "PURPOSE: Design animation token system with easing functions, duration scale, stagger formulas | Success: Complete motion-tokens.json with all token categories\nTASK:\n  - Define easing functions (ease-out, ease-in-out, ease-spring) as cubic-bezier values\n  - Define duration scale (fast, base, slow, slower, slowest)\n  - Define stagger formula with base delay and increment\n  - Define reduced-motion fallback tokens\n  - Reference specs/motion-tokens.md for token schema\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <motion-scope>\n  - Framework: <framework>\n  - Upstream artifacts: research/*.json\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/choreography/motion-tokens.json | Complete token system\nCONSTRAINTS: Follow motion-tokens.md schema | All tokens must have reduced-motion fallback",
    "role": "choreographer",
    "prefix": "CHOREO",
    "deps": ["MRESEARCH-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**ANIM-001** (animator):
```json
{
  "ANIM-001": {
    "title": "Implement CSS custom properties and utility classes from motion tokens",
    "description": "PURPOSE: Implement CSS custom properties and utility classes from motion tokens | Success: Production-ready CSS with token consumption and reduced-motion overrides\nTASK:\n  - Generate CSS custom properties from motion-tokens.json\n  - Create utility animation classes consuming tokens\n  - Add prefers-reduced-motion media query overrides\n  - Ensure compositor-only properties (transform, opacity) per specs/gpu-constraints.md\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <motion-scope>\n  - Framework: <framework>\n  - Upstream artifacts: choreography/motion-tokens.json\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/animations/keyframes/*.css | Token CSS + utility classes + reduced-motion\nCONSTRAINTS: Compositor-only animations | No layout-triggering properties | will-change budget",
    "role": "animator",
    "prefix": "ANIM",
    "deps": ["CHOREO-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**MTEST-001** (motion-tester):
```json
{
  "MTEST-001": {
    "title": "Verify animation performance and accessibility compliance",
    "description": "PURPOSE: Verify animation performance and accessibility compliance | Success: 60fps confirmed, no layout thrashing, reduced-motion present\nTASK:\n  - Start Chrome DevTools performance trace (if available)\n  - Verify compositor-only animations (no paint/layout triggers)\n  - Check will-change usage (not excessive, max 3-4 elements)\n  - Validate prefers-reduced-motion @media query presence\n  - Static code analysis as fallback if Chrome DevTools unavailable\nCONTEXT:\n  - Session: <session-folder>\n  - Scope: <motion-scope>\n  - Framework: <framework>\n  - Upstream artifacts: animations/keyframes/*.css, choreography/motion-tokens.json\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/testing/reports/perf-report-001.md | Performance validation report\nCONSTRAINTS: Target 60fps | Flag any layout-triggering properties",
    "role": "motion-tester",
    "prefix": "MTEST",
    "deps": ["ANIM-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

---

### Component Pipeline Task Chain

Same as Tokens pipeline with enhanced task descriptions:

- **MRESEARCH-001**: Same as tokens, plus focus on target component(s) existing animation
- **CHOREO-001**: Same token design, plus transition state diagrams (entry/exit/hover/focus/loading) and scroll-triggered reveal sequences for the component(s)
- **ANIM-001**: Implement component-specific animations: @keyframes, IntersectionObserver triggers, rAF coordination, staggered orchestration
- **MTEST-001**: Same as tokens, plus GC loop -- if FPS < 60 or layout thrashing, send `fix_required` signal

GC loop between animator and motion-tester (max 2 rounds).

---

### Page Pipeline Task Chain

**MRESEARCH-001** and **CHOREO-001**: Same as component, but scope is full page with multiple scroll sections.

**CHOREO-001** additionally defines scroll section boundaries, parallax depths, and staggered entry sequences per section.

**ANIM-001..N** (parallel): One ANIM task per scroll section or page area:
```json
{
  "ANIM-<NNN>": {
    "title": "Implement animations for <section-name>",
    "description": "PURPOSE: Implement animations for <section-name> | Success: Scroll-triggered reveals with 60fps performance\nTASK:\n  - Implement IntersectionObserver-based scroll triggers for <section-name>\n  - Apply staggered entry animations with calculated delays\n  - Add scroll-linked parallax (if specified in choreography)\n  - Ensure prefers-reduced-motion fallback\nCONTEXT:\n  - Session: <session-folder>\n  - Section: <section-name>\n  - Upstream artifacts: choreography/sequences/<section>.md, choreography/motion-tokens.json\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/animations/keyframes/<section>.css + orchestrators/<section>.js\nCONSTRAINTS: Compositor-only | will-change budget | Follow motion-tokens",
    "role": "animator",
    "prefix": "ANIM",
    "deps": ["CHOREO-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**MTEST-001**: Blocked by all ANIM tasks. Full page performance validation.

---

## Phase 4: Validation

Verify task chain integrity:

| Check | Method | Expected |
|-------|--------|----------|
| Task count correct | tasks.json count | tokens: 4, component: 4, page: 4+N |
| Dependencies correct | Trace dependency graph | Acyclic, correct deps |
| No circular dependencies | Trace dependency graph | Acyclic |
| Task IDs use correct prefixes | Pattern check | MRESEARCH/CHOREO/ANIM/MTEST |
| Structured descriptions complete | Each has PURPOSE/TASK/CONTEXT/EXPECTED/CONSTRAINTS | All present |

If validation fails, fix the specific task and re-validate.
