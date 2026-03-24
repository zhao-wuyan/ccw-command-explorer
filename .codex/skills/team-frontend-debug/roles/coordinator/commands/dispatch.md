# Dispatch Debug Tasks

Create task chains from dependency graph with proper blockedBy relationships.

## Workflow

1. Read task-analysis.json -> extract pipeline_type and dependency_graph
2. Read specs/pipelines.md -> get task registry for selected pipeline
3. Topological sort tasks (respect blockedBy)
4. Validate all owners exist in role registry (SKILL.md)
5. For each task (in order):
   - Build JSON entry with structured description (see template below)
   - Set blockedBy and owner fields in the entry
6. Write all entries to `<session>/tasks.json`
7. Update team-session.json with pipeline.tasks_total
8. Validate chain (no orphans, no cycles, all refs valid)

## Task Description Template

Each task is a JSON entry in the tasks array:

```json
{
  "id": "<TASK-ID>",
  "subject": "<TASK-ID>",
  "description": "PURPOSE: <goal> | Success: <criteria>\nTASK:\n  - <step 1>\n  - <step 2>\nCONTEXT:\n  - Session: <session-folder>\n  - Base URL / Bug URL: <url>\n  - Upstream artifacts: <list>\nEXPECTED: <artifact path> + <quality criteria>\nCONSTRAINTS: <scope limits>\n---\nInnerLoop: <true|false>\nRoleSpec: ~  or <project>/.codex/skills/team-frontend-debug/roles/<role>/role.md",
  "status": "pending",
  "owner": "<role>",
  "blockedBy": ["<dependency-list>"]
}
```

---

## Test Pipeline Tasks (mode: test-pipeline)

### TEST-001: Feature Testing

```json
{
  "id": "TEST-001",
  "subject": "TEST-001",
  "description": "PURPOSE: Test all features from feature list and discover issues | Success: All features tested with pass/fail results\nTASK:\n  - Parse feature list from task description\n  - For each feature: navigate to URL, explore page, generate test scenarios\n  - Execute test scenarios using Chrome DevTools MCP (click, fill, hover, etc.)\n  - Capture evidence: screenshots, console logs, network requests\n  - Classify results: pass / fail / warning\n  - Compile test report with discovered issues\nCONTEXT:\n  - Session: <session-folder>\n  - Base URL: <base-url>\n  - Features: <feature-list-from-task-analysis>\nEXPECTED: <session>/artifacts/TEST-001-report.md + <session>/artifacts/TEST-001-issues.json\nCONSTRAINTS: Use Chrome DevTools MCP only | Do not modify any code | Test all listed features\n---\nInnerLoop: true\nRoleSpec: ~  or <project>/.codex/skills/team-frontend-debug/roles/tester/role.md",
  "status": "pending",
  "owner": "tester",
  "blockedBy": []
}
```

### ANALYZE-001 (Test Mode): Analyze Discovered Issues

```json
{
  "id": "ANALYZE-001",
  "subject": "ANALYZE-001",
  "description": "PURPOSE: Analyze issues discovered by tester to identify root causes | Success: RCA for each discovered issue\nTASK:\n  - Load test report and issues list from TEST-001\n  - For each high/medium severity issue: analyze evidence, identify root cause\n  - Correlate console errors, network failures, DOM anomalies to source code\n  - Produce consolidated RCA report covering all issues\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream: <session>/artifacts/TEST-001-issues.json\n  - Test evidence: <session>/evidence/\nEXPECTED: <session>/artifacts/ANALYZE-001-rca.md with root causes for all issues\nCONSTRAINTS: Read-only analysis | Skip low-severity warnings unless user requests\n---\nInnerLoop: false\nRoleSpec: ~  or <project>/.codex/skills/team-frontend-debug/roles/analyzer/role.md",
  "status": "pending",
  "owner": "analyzer",
  "blockedBy": ["TEST-001"]
}
```

**Conditional**: If TEST-001 reports zero issues -> skip ANALYZE-001, FIX-001, VERIFY-001. Pipeline completes.

### FIX-001 (Test Mode): Fix All Issues

```json
{
  "id": "FIX-001",
  "subject": "FIX-001",
  "description": "PURPOSE: Fix all identified issues from RCA | Success: All high/medium issues resolved\nTASK:\n  - Load consolidated RCA report from ANALYZE-001\n  - For each root cause: locate code, implement fix\n  - Run syntax/type check after all modifications\n  - Document all changes\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream: <session>/artifacts/ANALYZE-001-rca.md\nEXPECTED: Modified source files + <session>/artifacts/FIX-001-changes.md\nCONSTRAINTS: Minimal changes per issue | Follow existing code style\n---\nInnerLoop: true\nRoleSpec: ~  or <project>/.codex/skills/team-frontend-debug/roles/fixer/role.md",
  "status": "pending",
  "owner": "fixer",
  "blockedBy": ["ANALYZE-001"]
}
```

### VERIFY-001 (Test Mode): Re-Test After Fix

```json
{
  "id": "VERIFY-001",
  "subject": "VERIFY-001",
  "description": "PURPOSE: Re-run failed test scenarios to verify fixes | Success: Previously failed scenarios now pass\nTASK:\n  - Load original test report (failed scenarios only)\n  - Re-execute failed scenarios using Chrome DevTools MCP\n  - Capture evidence and compare with original\n  - Report pass/fail per scenario\nCONTEXT:\n  - Session: <session-folder>\n  - Original test report: <session>/artifacts/TEST-001-report.md\n  - Fix changes: <session>/artifacts/FIX-001-changes.md\n  - Failed features: <from TEST-001-issues.json>\nEXPECTED: <session>/artifacts/VERIFY-001-report.md with pass/fail per previously-failed scenario\nCONSTRAINTS: Only re-test failed scenarios | Use Chrome DevTools MCP only\n---\nInnerLoop: false\nRoleSpec: ~  or <project>/.codex/skills/team-frontend-debug/roles/verifier/role.md",
  "status": "pending",
  "owner": "verifier",
  "blockedBy": ["FIX-001"]
}
```

---

## Debug Pipeline Tasks (mode: debug-pipeline)

### REPRODUCE-001: Evidence Collection

```json
{
  "id": "REPRODUCE-001",
  "subject": "REPRODUCE-001",
  "description": "PURPOSE: Reproduce reported bug and collect debug evidence | Success: Bug reproduced with evidence artifacts\nTASK:\n  - Navigate to target URL\n  - Execute reproduction steps using Chrome DevTools MCP\n  - Capture evidence: screenshots, DOM snapshots, console logs, network requests\n  - If performance dimension: run performance trace\n  - Package all evidence into session evidence/ directory\nCONTEXT:\n  - Session: <session-folder>\n  - Bug URL: <target-url>\n  - Steps: <reproduction-steps>\n  - Evidence plan: <from task-analysis.json>\nEXPECTED: <session>/evidence/ directory with all captures + reproduction report\nCONSTRAINTS: Use Chrome DevTools MCP only | Do not modify any code\n---\nInnerLoop: false\nRoleSpec: ~  or <project>/.codex/skills/team-frontend-debug/roles/reproducer/role.md",
  "status": "pending",
  "owner": "reproducer",
  "blockedBy": []
}
```

### ANALYZE-001 (Debug Mode): Root Cause Analysis

```json
{
  "id": "ANALYZE-001",
  "subject": "ANALYZE-001",
  "description": "PURPOSE: Analyze evidence to identify root cause | Success: RCA report with specific file:line location\nTASK:\n  - Load evidence from REPRODUCE-001\n  - Analyze console errors and stack traces\n  - Analyze failed/abnormal network requests\n  - Compare DOM snapshot against expected structure\n  - Correlate findings to source code location\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream: <session>/evidence/\n  - Bug description: <bug-description>\nEXPECTED: <session>/artifacts/ANALYZE-001-rca.md with root cause, file:line, fix recommendation\nCONSTRAINTS: Read-only analysis | Request more evidence if inconclusive\n---\nInnerLoop: false\nRoleSpec: ~  or <project>/.codex/skills/team-frontend-debug/roles/analyzer/role.md",
  "status": "pending",
  "owner": "analyzer",
  "blockedBy": ["REPRODUCE-001"]
}
```

### FIX-001 (Debug Mode): Code Fix

```json
{
  "id": "FIX-001",
  "subject": "FIX-001",
  "description": "PURPOSE: Fix the identified bug | Success: Code changes that resolve the root cause\nTASK:\n  - Load RCA report from ANALYZE-001\n  - Locate the problematic code\n  - Implement fix following existing code patterns\n  - Run syntax/type check on modified files\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream: <session>/artifacts/ANALYZE-001-rca.md\nEXPECTED: Modified source files + <session>/artifacts/FIX-001-changes.md\nCONSTRAINTS: Minimal changes | Follow existing code style | No breaking changes\n---\nInnerLoop: true\nRoleSpec: ~  or <project>/.codex/skills/team-frontend-debug/roles/fixer/role.md",
  "status": "pending",
  "owner": "fixer",
  "blockedBy": ["ANALYZE-001"]
}
```

### VERIFY-001 (Debug Mode): Fix Verification

```json
{
  "id": "VERIFY-001",
  "subject": "VERIFY-001",
  "description": "PURPOSE: Verify bug is fixed | Success: Original bug no longer reproduces\nTASK:\n  - Navigate to same URL as REPRODUCE-001\n  - Execute same reproduction steps\n  - Capture evidence and compare with original\n  - Confirm bug is resolved and no regressions\nCONTEXT:\n  - Session: <session-folder>\n  - Original evidence: <session>/evidence/\n  - Fix changes: <session>/artifacts/FIX-001-changes.md\nEXPECTED: <session>/artifacts/VERIFY-001-report.md with pass/fail verdict\nCONSTRAINTS: Use Chrome DevTools MCP only | Same steps as reproduction\n---\nInnerLoop: false\nRoleSpec: ~  or <project>/.codex/skills/team-frontend-debug/roles/verifier/role.md",
  "status": "pending",
  "owner": "verifier",
  "blockedBy": ["FIX-001"]
}
```

---

## Dynamic Iteration Tasks

### REPRODUCE-002 (Debug Mode): Supplemental Evidence

Created when Analyzer requests more evidence -- add new entry to `<session>/tasks.json`:
```json
{
  "id": "REPRODUCE-002",
  "subject": "REPRODUCE-002",
  "description": "PURPOSE: Collect additional evidence per Analyzer request | Success: Targeted evidence collected\nTASK: <specific evidence requests from Analyzer>\nCONTEXT: Session + Analyzer request\n---\nInnerLoop: false\nRoleSpec: ~  or <project>/.codex/skills/team-frontend-debug/roles/reproducer/role.md",
  "status": "pending",
  "owner": "reproducer",
  "blockedBy": []
}
```

### FIX-002 (Either Mode): Re-Fix After Failed Verification

Created when Verifier reports fail -- add new entry to `<session>/tasks.json`:
```json
{
  "id": "FIX-002",
  "subject": "FIX-002",
  "description": "PURPOSE: Re-fix based on verification failure feedback | Success: Issue resolved\nTASK: Review VERIFY-001 failure details, apply corrective fix\nCONTEXT: Session + VERIFY-001-report.md\n---\nInnerLoop: true\nRoleSpec: ~  or <project>/.codex/skills/team-frontend-debug/roles/fixer/role.md",
  "status": "pending",
  "owner": "fixer",
  "blockedBy": ["VERIFY-001"]
}
```

## Conditional Skip Rules

| Condition | Action |
|-----------|--------|
| test-pipeline + TEST-001 finds 0 issues | Skip ANALYZE/FIX/VERIFY -> pipeline complete |
| test-pipeline + TEST-001 finds only warnings | request_user_input: fix warnings or complete |
| debug-pipeline + REPRODUCE-001 cannot reproduce | request_user_input: retry with more info or abort |

## InnerLoop Flag Rules

- true: tester (iterates over features), fixer (may need multiple fix passes)
- false: reproducer, analyzer, verifier (single-pass tasks)

## Dependency Validation

- No orphan tasks (all tasks have valid owner)
- No circular dependencies
- All blockedBy references exist
- Session reference in every task description
- RoleSpec reference in every task description
