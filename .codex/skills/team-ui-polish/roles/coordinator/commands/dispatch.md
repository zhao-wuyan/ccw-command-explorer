# Command: Dispatch

Create the UI polish task chain with correct dependencies and structured task descriptions. Supports scan-only, targeted, and full pipeline modes.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| User requirement | From coordinator Phase 1 | Yes |
| Session folder | From coordinator Phase 2 | Yes |
| Pipeline mode | From tasks.json `pipeline_mode` | Yes |
| Target | From tasks.json `target` (url/component/full_site) | Yes |
| Dimension filters | From tasks.json (targeted mode only) | No |

1. Load user requirement and polish scope from tasks.json
2. Load pipeline stage definitions from specs/pipelines.md
3. Read `pipeline_mode`, `target`, and `dimension_filters` from tasks.json

## Phase 3: Task Chain Creation (Mode-Branched)

### Task Entry Template

Each task in tasks.json `tasks` object:
```json
{
  "<TASK-ID>": {
    "title": "<concise title>",
    "description": "PURPOSE: <what this task achieves> | Success: <measurable completion criteria>\nTASK:\n  - <step 1: specific action>\n  - <step 2: specific action>\n  - <step 3: specific action>\nCONTEXT:\n  - Session: <session-folder>\n  - Target: <url|component-path|full_site>\n  - Dimension filters: <all | specific dimensions>\n  - Upstream artifacts: <artifact-1>, <artifact-2>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <deliverable path> + <quality criteria>\nCONSTRAINTS: <scope limits, focus areas>",
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
| `scan-only` | Create 2 tasks: SCAN -> DIAG |
| `targeted` | Create 4 tasks: SCAN -> DIAG -> OPT -> VERIFY |
| `full` | Create 4 tasks: SCAN -> DIAG -> OPT -> VERIFY (with GC loop enabled) |

---

### Scan-Only Pipeline Task Chain

**SCAN-001** (scanner):
```json
{
  "SCAN-001": {
    "title": "8-dimension UI audit against Impeccable design standards",
    "description": "PURPOSE: Scan UI against Impeccable's 8 audit dimensions to discover all design problems | Success: Complete scan report with per-dimension scores and issue inventory\nTASK:\n  - Load target files or take screenshots via Chrome DevTools\n  - Extract color values, font definitions, spacing values, animation declarations\n  - Score all 8 dimensions: anti-patterns, color, typography, spacing, motion, interaction, hierarchy, responsive\n  - Generate issue inventory with file:line locations and severity\nCONTEXT:\n  - Session: <session-folder>\n  - Target: <target>\n  - Dimension filters: all\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/scan/scan-report.md | 8-dimension scored report with issue inventory\nCONSTRAINTS: Read-only analysis | Reference specs/anti-patterns.md and specs/design-standards.md",
    "role": "scanner",
    "prefix": "SCAN",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**DIAG-001** (diagnostician):
```json
{
  "DIAG-001": {
    "title": "Root cause analysis and fix dependency graph",
    "description": "PURPOSE: Deep-dive root cause analysis of scan findings, classify severity, group systemic vs one-off | Success: Prioritized diagnosis with fix dependency graph\nTASK:\n  - Read scan report and classify each issue as systemic or one-off\n  - Group issues by root cause\n  - Build fix dependency graph (which fixes must come first)\n  - Prioritize by severity (P0 -> P1 -> P2 -> P3)\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream artifacts: scan/scan-report.md\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/diagnosis/diagnosis-report.md | Root cause groups with fix strategies and dependency graph\nCONSTRAINTS: Read-only analysis | Reference specs/fix-strategies.md",
    "role": "diagnostician",
    "prefix": "DIAG",
    "deps": ["SCAN-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

---

### Targeted Pipeline Task Chain

Same as scan-only SCAN-001 and DIAG-001, plus:

**Note**: For targeted mode, SCAN-001 description adds dimension filter:
```
  - Dimension filters: <specific dimensions from analyze output>
```

**OPT-001** (optimizer):
```json
{
  "OPT-001": {
    "title": "Apply targeted fixes following Impeccable design standards",
    "description": "PURPOSE: Apply targeted fixes for specified dimensions following Impeccable design standards | Success: All P0/P1 issues in targeted dimensions resolved\nTASK:\n  - Read diagnosis report for prioritized fix plan\n  - Apply fixes in dependency order (systemic first, then one-off)\n  - Follow Impeccable fix strategies per dimension\n  - Self-validate: no regressions, code compiles/lints\nCONTEXT:\n  - Session: <session-folder>\n  - Dimension filters: <targeted dimensions>\n  - Upstream artifacts: scan/scan-report.md, diagnosis/diagnosis-report.md\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: Modified source files + <session>/optimization/fix-log.md | Each fix documented with before/after\nCONSTRAINTS: Only fix targeted dimensions | Reference specs/fix-strategies.md and specs/design-standards.md",
    "role": "optimizer",
    "prefix": "OPT",
    "deps": ["DIAG-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**VERIFY-001** (verifier):
```json
{
  "VERIFY-001": {
    "title": "Verify fixes improved scores without regressions",
    "description": "PURPOSE: Verify fixes improved scores without introducing regressions | Success: Score improved or maintained in all dimensions, zero regressions\nTASK:\n  - Re-scan fixed code against same 8 dimensions\n  - Calculate before/after score delta per dimension\n  - Check for regressions (new issues introduced by fixes)\n  - Take after screenshots if Chrome DevTools available\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream artifacts: scan/scan-report.md, optimization/fix-log.md\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/verification/verify-report.md | Before/after comparison with regression check\nCONSTRAINTS: Read-only verification | Signal fix_required if regressions found",
    "role": "verifier",
    "prefix": "VERIFY",
    "deps": ["OPT-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

---

### Full Pipeline Task Chain

Same as targeted pipeline. The difference is in GC loop behavior:
- When VERIFY-001 reports `fix_required`, coordinator creates OPT-fix task (see monitor.md)
- Full mode enables GC loop; targeted mode does not create GC fix tasks

---

### GC Fix Task Template (created by monitor.md when verify fails)

```json
{
  "OPT-fix-<round>": {
    "title": "Address verification regressions from round <round>",
    "description": "PURPOSE: Address verification regressions from round <round> | Success: All regressions resolved, no new issues\nTASK:\n  - Parse verification feedback for specific regressions\n  - Apply targeted fixes for regression issues only\n  - Self-validate before reporting\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream artifacts: verification/verify-report.md, optimization/fix-log.md\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: Updated source files + appended <session>/optimization/fix-log.md\nCONSTRAINTS: Fix regressions only, do not expand scope",
    "role": "optimizer",
    "prefix": "OPT",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

Then create new VERIFY task with deps on OPT-fix.

## Phase 4: Validation

Verify task chain integrity:

| Check | Method | Expected |
|-------|--------|----------|
| Task count correct | tasks.json count | scan-only: 2, targeted: 4, full: 4 |
| Dependencies correct | Trace dependency graph | Acyclic, correct deps |
| No circular dependencies | Trace dependency graph | Acyclic |
| Task IDs use correct prefixes | Pattern check | SCAN/DIAG/OPT/VERIFY |
| Structured descriptions complete | Each has PURPOSE/TASK/CONTEXT/EXPECTED/CONSTRAINTS | All present |

If validation fails, fix the specific task and re-validate.
