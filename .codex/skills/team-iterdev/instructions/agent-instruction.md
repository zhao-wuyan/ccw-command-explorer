## TASK ASSIGNMENT

### MANDATORY FIRST STEPS
1. Read shared discoveries: .workflow/.csv-wave/{session-id}/discoveries.ndjson (if exists, skip if not)
2. Read project context: .workflow/project-tech.json (if exists)

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Role**: {role}
**Description**: {description}
**Pipeline**: {pipeline}
**Sprint**: {sprint_num}
**GC Round**: {gc_round}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

1. **Read discoveries**: Load shared discoveries from the session's discoveries.ndjson for cross-task context
2. **Use context**: Apply previous tasks' findings from prev_context above
3. **Execute by role**:

### Role: architect (DESIGN-* tasks)
- Explore codebase for existing patterns, module structure, and dependencies
- Use mcp__ace-tool__search_context for semantic discovery when available
- Create design document covering:
  - Architecture decision: approach, rationale, alternatives considered
  - Component design: responsibility, dependencies, files to modify, complexity
  - Task breakdown: file changes, estimated complexity, dependencies, acceptance criteria
  - Integration points and risks with mitigations
- Write design document to session design/ directory
- Write task breakdown JSON (array of tasks with id, title, files, complexity, dependencies, acceptance_criteria)
- Record architecture decisions in wisdom/decisions.md via discovery board

### Role: developer (DEV-* tasks)
- **Normal task** (gc_round = 0):
  - Read design document and task breakdown from context
  - Implement tasks following the execution order from breakdown
  - Use Edit or Write for file modifications
  - Validate syntax after each major change (tsc --noEmit or equivalent)
  - Auto-fix if validation fails (max 2 attempts)
- **Fix task** (gc_round > 0):
  - Read review feedback from prev_context
  - Focus on critical/high severity issues ONLY
  - Do NOT change code that was not flagged in review
  - Fix critical issues first, then high, then medium
  - Maintain existing code style and patterns
- Write dev log to session code/ directory
- Record implementation details via discovery board

### Role: tester (VERIFY-* tasks)
- Detect test framework from project files (package.json, pytest.ini, etc.)
- Get list of changed files from dev log in prev_context
- Run targeted tests for changed files
- Run regression test suite
- If tests fail: attempt fix (max 3 iterations using available tools)
- Write verification results JSON to session verify/ directory
- Record test results via discovery board
- Report pass rate in findings

### Role: reviewer (REVIEW-* tasks)
- Read changed files from dev log in prev_context
- Read design document for requirements alignment
- Review across 4 weighted dimensions:
  - Correctness (30%): Logic correctness, boundary handling, edge cases
  - Completeness (25%): Coverage of design requirements
  - Maintainability (25%): Readability, code style, DRY, naming
  - Security (20%): Vulnerabilities, input validation, auth issues
- Assign severity per finding: CRITICAL / HIGH / MEDIUM / LOW
- Include file:line references for each finding
- Calculate weighted quality score (1-10)
- Determine GC signal:
  - critical_count > 0 OR score < 7 -> `REVISION_NEEDED`
  - critical_count == 0 AND score >= 7 -> `CONVERGED`
- Write review report to session review/ directory
- Record review findings via discovery board

4. **Share discoveries**: Append exploration findings to shared board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> .workflow/.csv-wave/{session-id}/discoveries.ndjson
   ```

   Discovery types to share:
   - `design_decision`: {component, approach, rationale, alternatives} -- architecture decision
   - `implementation`: {file, changes, pattern_used, notes} -- code implementation detail
   - `test_result`: {test_suite, pass_rate, failures[], regressions} -- test execution result
   - `review_finding`: {file_line, severity, dimension, description, suggestion} -- review finding
   - `convention`: {name, description, example} -- discovered project convention

5. **Report result**: Return JSON via report_agent_job_result

---

## Output (report_agent_job_result)

Return JSON:
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "review_score": "Quality score 1-10 (reviewer only, empty for others)",
  "gc_signal": "REVISION_NEEDED | CONVERGED (reviewer only, empty for others)",
  "error": ""
}

**Role-specific findings guidance**:
- **architect**: List component count, task count, key decisions. Example: "Designed 3 components (AuthModule, TokenService, Middleware). Created 5 implementation tasks. Key decision: JWT with refresh token rotation."
- **developer**: List changed file count, syntax status, key changes. Example: "Modified 5 files. All syntax clean. Key changes: JWT middleware, token validation, auth routes."
- **developer (fix)**: List fixed issue count, remaining issues. Example: "Fixed 2 HIGH issues (token expiry, input validation). 0 remaining critical/high issues."
- **tester**: List pass rate, test count, regression status. Example: "Pass rate: 96% (24/25 tests). 1 edge case failure (token-expiry). No regressions detected."
- **reviewer**: List score, issue counts, verdict. Example: "Score: 7.5/10. Findings: 0 CRITICAL, 1 HIGH, 3 MEDIUM, 2 LOW. GC signal: REVISION_NEEDED."
