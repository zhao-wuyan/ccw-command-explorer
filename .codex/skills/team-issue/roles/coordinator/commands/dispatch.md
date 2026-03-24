# Dispatch

Create the issue resolution task chain with correct dependencies and structured task descriptions based on selected pipeline mode.

## Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Requirement | From coordinator Phase 1 | Yes |
| Session folder | From coordinator Phase 2 | Yes |
| Pipeline mode | From session.json mode | Yes |
| Issue IDs | From session.json issue_ids | Yes |
| Execution method | From session.json execution_method | Yes |
| Code review | From session.json code_review | No |

1. Load requirement, pipeline mode, issue IDs, and execution method from session.json
2. Determine task chain from pipeline mode

## Task Description Template

Every task is built as a JSON entry in the tasks array:

```json
{
  "id": "<TASK-ID>",
  "title": "<TASK-ID>",
  "description": "PURPOSE: <what this task achieves> | Success: <completion criteria>\nTASK:\n  - <step 1>\n  - <step 2>\n  - <step 3>\nCONTEXT:\n  - Session: <session-folder>\n  - Issue IDs: <issue-id-list>\n  - Upstream artifacts: <artifact-list>\nEXPECTED: <deliverable path> + <quality criteria>\nCONSTRAINTS: <scope limits>\n---\nInnerLoop: false\nexecution_method: <method>\ncode_review: <setting>",
  "status": "pending",
  "role": "<role>",
  "prefix": "<PREFIX>",
  "deps": ["<dependency-list>"],
  "findings": "",
  "error": ""
}
```

## Pipeline Router

| Mode | Action |
|------|--------|
| quick | Create 4 tasks (EXPLORE -> SOLVE -> MARSHAL -> BUILD) |
| full | Create 5 tasks (EXPLORE -> SOLVE -> AUDIT -> MARSHAL -> BUILD) |
| batch | Create N+N+1+1+M tasks (EXPLORE-001..N -> SOLVE-001..N -> AUDIT-001 -> MARSHAL-001 -> BUILD-001..M) |

---

### Quick Pipeline

Build tasks array and write to tasks.json:

**EXPLORE-001** (explorer):
```json
{
  "id": "EXPLORE-001",
  "title": "EXPLORE-001",
  "description": "PURPOSE: Analyze issue context and map codebase impact | Success: Context report with relevant files and dependencies\nTASK:\n  - Load issue details via ccw issue status\n  - Explore codebase for relevant files and patterns\n  - Assess complexity and impact scope\nCONTEXT:\n  - Session: <session-folder>\n  - Issue IDs: <issue-id-list>\nEXPECTED: <session>/explorations/context-<issueId>.json with relevant files, dependencies, and impact assessment\nCONSTRAINTS: Exploration and analysis only, no solution design\n---\nInnerLoop: false",
  "status": "pending",
  "role": "explorer",
  "prefix": "EXPLORE",
  "deps": [],
  "findings": "",
  "error": ""
}
```

**SOLVE-001** (planner):
```json
{
  "id": "SOLVE-001",
  "title": "SOLVE-001",
  "description": "PURPOSE: Design solution and decompose into implementation tasks | Success: Bound solution with task decomposition\nTASK:\n  - Load explorer context report\n  - Generate solution plan via CLI\n  - Bind solution to issue\nCONTEXT:\n  - Session: <session-folder>\n  - Issue IDs: <issue-id-list>\n  - Upstream artifacts: explorations/context-<issueId>.json\nEXPECTED: <session>/solutions/solution-<issueId>.json with solution plan and task list\nCONSTRAINTS: Solution design only, no code implementation\n---\nInnerLoop: false",
  "status": "pending",
  "role": "planner",
  "prefix": "SOLVE",
  "deps": ["EXPLORE-001"],
  "findings": "",
  "error": ""
}
```

**MARSHAL-001** (integrator):
```json
{
  "id": "MARSHAL-001",
  "title": "MARSHAL-001",
  "description": "PURPOSE: Form execution queue with conflict detection and ordering | Success: Execution queue file with resolved conflicts\nTASK:\n  - Verify all issues have bound solutions\n  - Detect file conflicts between solutions\n  - Produce ordered execution queue with DAG-based parallel groups\nCONTEXT:\n  - Session: <session-folder>\n  - Issue IDs: <issue-id-list>\n  - Upstream artifacts: solutions/solution-<issueId>.json\nEXPECTED: .workflow/issues/queue/execution-queue.json with queue, conflicts, parallel groups\nCONSTRAINTS: Queue formation only, no implementation\n---\nInnerLoop: false",
  "status": "pending",
  "role": "integrator",
  "prefix": "MARSHAL",
  "deps": ["SOLVE-001"],
  "findings": "",
  "error": ""
}
```

**BUILD-001** (implementer):
```json
{
  "id": "BUILD-001",
  "title": "BUILD-001",
  "description": "PURPOSE: Implement solution plan and verify with tests | Success: Code changes committed, tests pass\nTASK:\n  - Load bound solution and explorer context\n  - Route to execution backend (Auto/Codex/Gemini)\n  - Run tests and verify implementation\n  - Commit changes\nCONTEXT:\n  - Session: <session-folder>\n  - Issue IDs: <issue-id-list>\n  - Upstream artifacts: explorations/context-<issueId>.json, solutions/solution-<issueId>.json, queue/execution-queue.json\nEXPECTED: <session>/builds/ with implementation results, tests passing\nCONSTRAINTS: Follow solution plan, no scope creep\n---\nInnerLoop: false\nexecution_method: <execution_method>\ncode_review: <code_review>",
  "status": "pending",
  "role": "implementer",
  "prefix": "BUILD",
  "deps": ["MARSHAL-001"],
  "findings": "",
  "error": ""
}
```

---

### Full Pipeline

Creates 5 tasks. EXPLORE-001 and SOLVE-001 same as Quick, then AUDIT gate before MARSHAL and BUILD.

**AUDIT-001** (reviewer):
```json
{
  "id": "AUDIT-001",
  "title": "AUDIT-001",
  "description": "PURPOSE: Review solution for technical feasibility, risk, and completeness | Success: Clear verdict (approved/concerns/rejected) with scores\nTASK:\n  - Load explorer context and bound solution\n  - Score across 3 dimensions: technical feasibility (40%), risk (30%), completeness (30%)\n  - Produce verdict: approved (>=80), concerns (60-79), rejected (<60)\nCONTEXT:\n  - Session: <session-folder>\n  - Issue IDs: <issue-id-list>\n  - Upstream artifacts: explorations/context-<issueId>.json, solutions/solution-<issueId>.json\nEXPECTED: <session>/audits/audit-report.json with per-issue scores and overall verdict\nCONSTRAINTS: Review only, do not modify solutions\n---\nInnerLoop: false",
  "status": "pending",
  "role": "reviewer",
  "prefix": "AUDIT",
  "deps": ["SOLVE-001"],
  "findings": "",
  "error": ""
}
```

**MARSHAL-001**: Same as Quick, but `deps: ["AUDIT-001"]`.

**BUILD-001**: Same as Quick, `deps: ["MARSHAL-001"]`.

---

### Batch Pipeline

Creates tasks in parallel batches. Issue count = N, BUILD tasks = M (from queue parallel groups).

**EXPLORE-001..N** (explorer, parallel):

For each issue in issue_ids (up to 5), create an EXPLORE task with distinct role:

| Issue Count | Role Assignment |
|-------------|-----------------|
| N = 1 | role: "explorer" |
| N > 1 | role: "explorer-1", "explorer-2", ..., "explorer-N" (max 5) |

```json
{
  "id": "EXPLORE-<NNN>",
  "title": "EXPLORE-<NNN>",
  "description": "PURPOSE: Analyze issue <issueId> context and map codebase impact | Success: Context report for <issueId>\nTASK:\n  - Load issue details for <issueId>\n  - Explore codebase for relevant files\n  - Assess complexity and impact scope\nCONTEXT:\n  - Session: <session-folder>\n  - Issue IDs: <issueId>\nEXPECTED: <session>/explorations/context-<issueId>.json\nCONSTRAINTS: Single issue scope, exploration only\n---\nInnerLoop: false",
  "status": "pending",
  "role": "explorer-<N>",
  "prefix": "EXPLORE",
  "deps": [],
  "findings": "",
  "error": ""
}
```

**SOLVE-001..N** (planner, sequential after all EXPLORE):

```json
{
  "id": "SOLVE-<NNN>",
  "title": "SOLVE-<NNN>",
  "description": "PURPOSE: Design solution for <issueId> | Success: Bound solution with tasks\nTASK:\n  - Load explorer context for <issueId>\n  - Generate solution plan\n  - Bind solution\nCONTEXT:\n  - Session: <session-folder>\n  - Issue IDs: <issueId>\n  - Upstream artifacts: explorations/context-<issueId>.json\nEXPECTED: <session>/solutions/solution-<issueId>.json\nCONSTRAINTS: Solution design only\n---\nInnerLoop: false",
  "status": "pending",
  "role": "planner",
  "prefix": "SOLVE",
  "deps": ["EXPLORE-001", "...", "EXPLORE-<N>"],
  "findings": "",
  "error": ""
}
```

**AUDIT-001** (reviewer, batch review):
```json
{
  "id": "AUDIT-001",
  "title": "AUDIT-001",
  "description": "PURPOSE: Batch review all solutions | Success: Verdict for each solution\nTASK:\n  - Load all explorer contexts and bound solutions\n  - Score each solution across 3 dimensions\n  - Produce per-issue verdicts and overall verdict\nCONTEXT:\n  - Session: <session-folder>\n  - Issue IDs: <all-issue-ids>\n  - Upstream artifacts: explorations/*.json, solutions/*.json\nEXPECTED: <session>/audits/audit-report.json with batch results\nCONSTRAINTS: Review only\n---\nInnerLoop: false",
  "status": "pending",
  "role": "reviewer",
  "prefix": "AUDIT",
  "deps": ["SOLVE-001", "...", "SOLVE-<N>"],
  "findings": "",
  "error": ""
}
```

**MARSHAL-001** (integrator): `deps: ["AUDIT-001"]`.

**BUILD-001..M** (implementer, DAG parallel):

> Note: In Batch mode, BUILD task count M is not known at dispatch time (depends on MARSHAL queue output). Defer BUILD task creation to handleCallback when MARSHAL completes. Coordinator creates BUILD tasks dynamically after reading execution-queue.json.

When M is known (deferred creation after MARSHAL), assign distinct roles:

| Build Count | Role Assignment |
|-------------|-----------------|
| M <= 2 | role: "implementer" |
| M > 2 | role: "implementer-1", ..., "implementer-M" (max 3) |

```json
{
  "id": "BUILD-<NNN>",
  "title": "BUILD-<NNN>",
  "description": "PURPOSE: Implement solution for <issueId> | Success: Code committed, tests pass\nTASK:\n  - Load bound solution and explorer context\n  - Execute implementation via <execution_method>\n  - Run tests, commit\nCONTEXT:\n  - Session: <session-folder>\n  - Issue IDs: <issueId>\n  - Upstream artifacts: explorations/context-<issueId>.json, solutions/solution-<issueId>.json, queue/execution-queue.json\nEXPECTED: <session>/builds/ with results\nCONSTRAINTS: Follow solution plan\n---\nInnerLoop: false\nexecution_method: <execution_method>\ncode_review: <code_review>",
  "status": "pending",
  "role": "implementer-<M>",
  "prefix": "BUILD",
  "deps": ["MARSHAL-001"],
  "findings": "",
  "error": ""
}
```

---

### Review-Fix Cycle (Full/Batch modes)

When AUDIT rejects a solution, coordinator creates fix tasks dynamically in handleCallback -- NOT at dispatch time.

**SOLVE-fix-001** (planner, revision) -- added to tasks.json dynamically:
```json
{
  "id": "SOLVE-fix-001",
  "title": "SOLVE-fix-001",
  "description": "PURPOSE: Revise solution addressing reviewer feedback (fix cycle <round>) | Success: Revised solution addressing rejection reasons\nTASK:\n  - Read reviewer feedback from audit report\n  - Design alternative approach addressing concerns\n  - Re-bind revised solution\nCONTEXT:\n  - Session: <session-folder>\n  - Issue IDs: <rejected-issue-ids>\n  - Upstream artifacts: audits/audit-report.json\n  - Reviewer feedback: <rejection-reasons>\nEXPECTED: <session>/solutions/solution-<issueId>.json (revised)\nCONSTRAINTS: Address reviewer concerns specifically\n---\nInnerLoop: false",
  "status": "pending",
  "role": "planner",
  "prefix": "SOLVE",
  "deps": ["AUDIT-001"],
  "findings": "",
  "error": ""
}
```

**AUDIT-002** (reviewer, re-review) -- added to tasks.json dynamically:
```json
{
  "id": "AUDIT-002",
  "title": "AUDIT-002",
  "description": "PURPOSE: Re-review revised solution (fix cycle <round>) | Success: Verdict on revised solution\nTASK:\n  - Load revised solution\n  - Re-evaluate previously rejected dimensions\n  - Produce updated verdict\nCONTEXT:\n  - Session: <session-folder>\n  - Issue IDs: <rejected-issue-ids>\n  - Upstream artifacts: solutions/solution-<issueId>.json (revised), audits/audit-report.json\nEXPECTED: <session>/audits/audit-report.json (updated)\nCONSTRAINTS: Focus on previously rejected dimensions\n---\nInnerLoop: false",
  "status": "pending",
  "role": "reviewer",
  "prefix": "AUDIT",
  "deps": ["SOLVE-fix-001"],
  "findings": "",
  "error": ""
}
```

## Validation

1. Verify all tasks created by reading tasks.json
2. Check dependency chain integrity:
   - No circular dependencies
   - All deps references exist
   - First task(s) have empty deps (EXPLORE tasks)
3. Log task count and pipeline mode
4. Verify mode-specific constraints:

| Mode | Constraint |
|------|-----------|
| quick | Exactly 4 tasks, no AUDIT |
| full | Exactly 5 tasks, includes AUDIT |
| batch | N EXPLORE + N SOLVE + 1 AUDIT + 1 MARSHAL + deferred BUILD |
