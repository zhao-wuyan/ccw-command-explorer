# Agent Instruction Template -- Team Frontend Debug

Base instruction template for CSV wave agents. The orchestrator dynamically customizes this per role during Phase 1, writing role-specific versions to `role-instructions/{role}.md`.

## Purpose

| Phase | Usage |
|-------|-------|
| Phase 1 | Coordinator generates per-role instruction from this template |
| Phase 2 | Injected as `instruction` parameter to `spawn_agents_on_csv` |

---

## Base Instruction Template

```markdown
## TASK ASSIGNMENT -- Team Frontend Debug

### MANDATORY FIRST STEPS
1. Read shared discoveries: <session-folder>/discoveries.ndjson (if exists, skip if not)
2. Read project context: .workflow/project-tech.json (if exists)

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Role**: {role}
**Pipeline Mode**: {pipeline_mode}
**Base URL**: {base_url}
**Evidence Dimensions**: {evidence_dimensions}

### Task Description
{description}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

1. **Read discoveries**: Load <session-folder>/discoveries.ndjson for shared exploration findings
2. **Use context**: Apply previous tasks' findings from prev_context above
3. **Execute task**: Follow role-specific instructions below
4. **Share discoveries**: Append exploration findings to shared board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> <session-folder>/discoveries.ndjson
   ```
5. **Report result**: Return JSON via report_agent_job_result

### Discovery Types to Share
- `feature_tested`: {feature, name, result, issues} -- Feature test result
- `bug_reproduced`: {url, steps, console_errors, network_failures} -- Bug reproduction outcome
- `evidence_collected`: {dimension, file, description} -- Evidence artifact saved
- `root_cause_found`: {category, file, line, confidence} -- Root cause identified
- `file_modified`: {file, change, lines_added} -- Code fix applied
- `verification_result`: {verdict, original_error_resolved, new_errors} -- Verification outcome
- `issue_found`: {file, line, severity, description} -- Issue discovered

---

## Output (report_agent_job_result)

Return JSON:
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "artifacts_produced": "semicolon-separated paths of produced files",
  "issues_count": "",
  "verdict": "",
  "error": ""
}
```

---

## Role-Specific Customization

The coordinator generates per-role instruction variants during Phase 1.

### For Tester Role (test-pipeline)

```
3. **Execute**:
   - Parse feature list from task description
   - For each feature:
     a. Navigate to feature URL: mcp__chrome-devtools__navigate_page({ type: "url", url: "<base_url><path>" })
     b. Wait for page load: mcp__chrome-devtools__wait_for({ text: ["<expected>"], timeout: 10000 })
     c. Explore page structure: mcp__chrome-devtools__take_snapshot()
     d. Generate test scenarios from UI elements if not predefined
     e. Capture baseline: take_screenshot (before), list_console_messages
     f. Execute test steps: map step descriptions to MCP actions
        - Click: take_snapshot -> find uid -> click({ uid })
        - Fill: take_snapshot -> find uid -> fill({ uid, value })
        - Hover: take_snapshot -> find uid -> hover({ uid })
        - Wait: wait_for({ text: ["expected"] })
        - Navigate: navigate_page({ type: "url", url: "path" })
        - Press key: press_key({ key: "Enter" })
     g. Capture result: take_screenshot (after), list_console_messages (errors), list_network_requests
     h. Evaluate: console errors? network failures? expected text present? visual issues?
     i. Classify: pass / fail / warning
   - Compile test report: <session>/artifacts/TEST-001-report.md
   - Compile issues list: <session>/artifacts/TEST-001-issues.json
   - Set issues_count in output
```

### For Reproducer Role (debug-pipeline)

```
3. **Execute**:
   - Verify browser accessible: mcp__chrome-devtools__list_pages()
   - Navigate to target URL: mcp__chrome-devtools__navigate_page({ type: "url", url: "<target>" })
   - Wait for load: mcp__chrome-devtools__wait_for({ text: ["<expected>"], timeout: 10000 })
   - Capture baseline evidence:
     - Screenshot (before): take_screenshot({ filePath: "<session>/evidence/before-screenshot.png" })
     - DOM snapshot (before): take_snapshot({ filePath: "<session>/evidence/before-snapshot.txt" })
     - Console baseline: list_console_messages()
   - Execute reproduction steps:
     - For each step, parse action and execute via MCP tools
     - Track DOM changes via snapshots after key steps
   - Capture post-action evidence:
     - Screenshot (after): take_screenshot({ filePath: "<session>/evidence/after-screenshot.png" })
     - DOM snapshot (after): take_snapshot({ filePath: "<session>/evidence/after-snapshot.txt" })
     - Console errors: list_console_messages({ types: ["error", "warn"] })
     - Network requests: list_network_requests({ resourceTypes: ["xhr", "fetch"] })
     - Request details for failures: get_network_request({ reqid: <id> })
     - Performance trace (if dimension): performance_start_trace() + reproduce + performance_stop_trace()
   - Write evidence-summary.json to <session>/evidence/
```

### For Analyzer Role

```
3. **Execute**:
   - Load evidence from upstream (reproducer evidence/ or tester artifacts/)
   - Console error analysis (priority):
     - Filter by type: error > warn > log
     - Extract stack traces, identify source file:line
     - Classify: TypeError, ReferenceError, NetworkError, etc.
   - Network analysis (if dimension):
     - Identify failed requests (4xx, 5xx, timeout, CORS)
     - Check auth tokens, API endpoints, payload issues
   - DOM structure analysis (if snapshots):
     - Compare before/after snapshots
     - Identify missing/extra elements, attribute anomalies
   - Performance analysis (if trace):
     - Identify long tasks (>50ms), layout thrashing, memory leaks
   - Cross-correlation: build timeline, identify trigger point
   - Source code mapping:
     - Use mcp__ace-tool__search_context or Grep to locate root cause
     - Read identified source files
   - Confidence assessment:
     - High (>80%): clear stack trace + specific line
     - Medium (50-80%): likely cause, needs confirmation
     - Low (<50%): request more evidence (set findings to include "need_more_evidence")
   - Write RCA report to <session>/artifacts/ANALYZE-001-rca.md
   - Set issues_count in output
```

### For Fixer Role

```
3. **Execute**:
   - Load RCA report from analyzer output
   - Extract root cause: category, file, line, recommended fix
   - Read identified source files
   - Search for similar patterns: mcp__ace-tool__search_context
   - Plan fix: minimal change addressing root cause
   - Apply fix strategy by category:
     - TypeError/null: add null check, default value
     - API error: fix URL, add error handling
     - Missing import: add import statement
     - CSS/rendering: fix styles, layout
     - State bug: fix state update logic
     - Race condition: add async handling
   - Implement fix using Edit tool (fallback: mcp__ccw-tools__edit_file)
   - Validate: run syntax/type checks
   - Document changes in <session>/artifacts/FIX-001-changes.md
```

### For Verifier Role

```
3. **Execute**:
   - Load original evidence (reproducer) and fix changes (fixer)
   - Pre-verification: check modified files contain expected changes
   - Navigate to same URL: mcp__chrome-devtools__navigate_page
   - Execute EXACT same reproduction/test steps
   - Capture post-fix evidence:
     - Screenshot: take_screenshot({ filePath: "<session>/evidence/verify-screenshot.png" })
     - DOM snapshot: take_snapshot({ filePath: "<session>/evidence/verify-snapshot.txt" })
     - Console: list_console_messages({ types: ["error", "warn"] })
     - Network: list_network_requests({ resourceTypes: ["xhr", "fetch"] })
   - Compare evidence:
     - Console: original error gone?
     - Network: failed request now succeeds?
     - Visual: expected rendering achieved?
     - New errors: any regression?
   - Determine verdict:
     - pass: original resolved AND no new errors
     - pass_with_warnings: original resolved BUT new issues
     - fail: original still present
   - Write verification report to <session>/artifacts/VERIFY-001-report.md
   - Set verdict in output
```

---

## Chrome DevTools MCP Reference

### Common Patterns

**Navigate and Wait**:
```
mcp__chrome-devtools__navigate_page({ type: "url", url: "<url>" })
mcp__chrome-devtools__wait_for({ text: ["<expected>"], timeout: 10000 })
```

**Find Element and Interact**:
```
mcp__chrome-devtools__take_snapshot()  // Get uids
mcp__chrome-devtools__click({ uid: "<uid>" })
mcp__chrome-devtools__fill({ uid: "<uid>", value: "<value>" })
```

**Capture Evidence**:
```
mcp__chrome-devtools__take_screenshot({ filePath: "<path>" })
mcp__chrome-devtools__list_console_messages({ types: ["error", "warn"] })
mcp__chrome-devtools__list_network_requests({ resourceTypes: ["xhr", "fetch"] })
```

**Debug API Error**:
```
mcp__chrome-devtools__list_network_requests()  // Find request
mcp__chrome-devtools__get_network_request({ reqid: <id> })  // Inspect details
```

---

## Quality Requirements

All agents must verify before reporting complete:

| Requirement | Criteria |
|-------------|----------|
| Files produced | Verify all claimed artifacts exist via Read |
| Evidence captured | All planned dimensions have evidence files |
| Findings accuracy | Findings reflect actual observations |
| Discovery sharing | At least 1 discovery shared to board |
| Error reporting | Non-empty error field if status is failed |
| Verdict set | verifier role sets verdict field |
| Issues count set | tester/analyzer roles set issues_count field |

---

## Placeholder Reference

| Placeholder | Resolved By | When |
|-------------|------------|------|
| `<session-folder>` | Skill designer (Phase 1) | Literal path baked into instruction |
| `{id}` | spawn_agents_on_csv | Runtime from CSV row |
| `{title}` | spawn_agents_on_csv | Runtime from CSV row |
| `{description}` | spawn_agents_on_csv | Runtime from CSV row |
| `{role}` | spawn_agents_on_csv | Runtime from CSV row |
| `{pipeline_mode}` | spawn_agents_on_csv | Runtime from CSV row |
| `{base_url}` | spawn_agents_on_csv | Runtime from CSV row |
| `{evidence_dimensions}` | spawn_agents_on_csv | Runtime from CSV row |
| `{prev_context}` | spawn_agents_on_csv | Runtime from CSV row |
