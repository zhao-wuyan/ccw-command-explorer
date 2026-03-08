## TASK ASSIGNMENT

### MANDATORY FIRST STEPS
1. Read shared discoveries: {session_folder}/discoveries.ndjson (if exists, skip if not)
2. Read project context: .workflow/project-tech.json (if exists)
3. Read task schema: .codex/skills/team-arch-opt/schemas/tasks-schema.md

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Description**: {description}
**Role**: {role}
**Issue Type**: {issue_type}
**Priority**: {priority}
**Target Files**: {target_files}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

1. **Read discoveries**: Load {session_folder}/discoveries.ndjson for shared exploration findings
2. **Use context**: Apply previous tasks' findings from prev_context above
3. **Execute by role**:

   **If role = analyzer**:
   - Scan codebase for architecture issues within target scope
   - Build import/require graph, detect circular dependencies
   - Identify God Classes (>500 LOC, >10 public methods)
   - Calculate coupling (fan-in/fan-out) and cohesion metrics
   - Detect dead code, dead exports, layering violations
   - Collect quantified baseline metrics
   - Rank top 3-7 issues by severity (Critical/High/Medium)
   - Write `{session_folder}/artifacts/architecture-baseline.json` (metrics)
   - Write `{session_folder}/artifacts/architecture-report.md` (ranked issues)

   **If role = designer**:
   - Read architecture report and baseline from {session_folder}/artifacts/
   - For each issue, select refactoring strategy by type:
     - CYCLE: interface extraction, dependency inversion, mediator
     - GOD_CLASS: SRP decomposition, extract class/module
     - COUPLING: introduce interface/abstraction, DI, events
     - DUPLICATION: extract shared utility/base class
     - LAYER_VIOLATION: move to correct layer, add facade
     - DEAD_CODE: safe removal with reference verification
     - API_BLOAT: privatize internals, barrel file cleanup
   - Prioritize by impact/effort: P0 (high impact+low effort) to P3 (low impact or high effort)
   - Assign unique REFACTOR-IDs (REFACTOR-001, 002, ...) with non-overlapping file targets
   - Write `{session_folder}/artifacts/refactoring-plan.md`

   **If role = refactorer**:
   - Read refactoring plan from {session_folder}/artifacts/refactoring-plan.md
   - Apply refactorings in priority order (P0 first)
   - Preserve existing behavior -- refactoring must not change functionality
   - Update ALL import references when moving/renaming modules
   - Update ALL test files referencing moved/renamed symbols
   - Verify no dangling imports after module moves

   **If role = validator**:
   - Read baseline from {session_folder}/artifacts/architecture-baseline.json
   - Read plan from {session_folder}/artifacts/refactoring-plan.md
   - Build validation: compile/type-check, zero new errors
   - Test validation: run test suite, no new failures
   - Metric validation: coupling improved or neutral, no new cycles
   - API validation: public signatures preserved, no dangling references
   - Write `{session_folder}/artifacts/validation-results.json`
   - Set verdict: PASS / WARN / FAIL

   **If role = reviewer**:
   - Read plan from {session_folder}/artifacts/refactoring-plan.md
   - Review changed files across 5 dimensions:
     - Correctness: no behavior changes, all references updated
     - Pattern consistency: follows existing conventions
     - Completeness: imports, tests, configs all updated
     - Migration safety: no dangling refs, backward compatible
     - Best practices: SOLID, appropriate abstraction
   - Write `{session_folder}/artifacts/review-report.md`
   - Set verdict: APPROVE / REVISE / REJECT

4. **Share discoveries**: Append exploration findings to shared board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> {session_folder}/discoveries.ndjson
   ```
5. **Report result**: Return JSON via report_agent_job_result

### Discovery Types to Share
- `cycle_found`: `{modules, depth, description}` -- Circular dependency detected
- `god_class_found`: `{file, loc, methods, description}` -- God Class identified
- `coupling_issue`: `{module, fan_in, fan_out, description}` -- High coupling
- `dead_code_found`: `{file, type, description}` -- Dead code found
- `layer_violation`: `{from, to, description}` -- Layering violation
- `file_modified`: `{file, change, lines_added}` -- File change recorded
- `pattern_found`: `{pattern_name, location, description}` -- Pattern identified
- `metric_measured`: `{metric, value, unit, module}` -- Metric measured
- `artifact_produced`: `{name, path, producer, type}` -- Deliverable created

---

## Output (report_agent_job_result)

Return JSON:
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "verdict": "PASS|WARN|FAIL|APPROVE|REVISE|REJECT or empty",
  "artifacts_produced": "semicolon-separated artifact paths",
  "error": ""
}
