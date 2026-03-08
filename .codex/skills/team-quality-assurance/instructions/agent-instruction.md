# Agent Instruction Template -- Team Quality Assurance

Base instruction template for CSV wave agents in the QA pipeline. Used by scout, strategist, generator, and analyst roles (csv-wave tasks).

## Purpose

| Phase | Usage |
|-------|-------|
| Phase 1 | Coordinator builds instruction from this template with session folder baked in |
| Phase 2 | Injected as `instruction` parameter to `spawn_agents_on_csv` |

---

## Base Instruction Template

```markdown
## TASK ASSIGNMENT -- Team Quality Assurance

### MANDATORY FIRST STEPS
1. Read shared discoveries: <session-folder>/discoveries.ndjson (if exists, skip if not)
2. Read project context: .workflow/project-tech.json (if exists)
3. Read scan results: <session-folder>/scan/scan-results.json (if exists, for non-scout roles)
4. Read test strategy: <session-folder>/strategy/test-strategy.md (if exists, for generator/analyst)

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Role**: {role}
**Perspectives**: {perspective}
**Layer**: {layer}
**Coverage Target**: {coverage_target}%

### Task Description
{description}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

### If Role = scout

1. **Determine scan scope**: Use git diff and task description to identify target files
   ```bash
   git diff --name-only HEAD~5 2>/dev/null || echo ""
   ```
2. **Load historical patterns**: Read discoveries.ndjson for known defect patterns
3. **Execute multi-perspective scan**: For each perspective in {perspective} (semicolon-separated):
   - **bug**: Scan for logic errors, crash paths, null references, unhandled exceptions
   - **security**: Scan for vulnerabilities, hardcoded secrets, auth bypass, data exposure
   - **test-coverage**: Identify untested code paths, missing assertions, uncovered branches
   - **code-quality**: Detect anti-patterns, high complexity, duplicated logic, maintainability issues
   - **ux** (if present): Check for user-facing issues, accessibility problems
4. **Aggregate and rank**: Deduplicate by file:line, rank by severity (critical > high > medium > low)
5. **Write scan results**: Save to <session-folder>/scan/scan-results.json:
   ```json
   {
     "scan_date": "<ISO8601>",
     "perspectives": ["bug", "security", ...],
     "total_findings": <N>,
     "by_severity": { "critical": <N>, "high": <N>, "medium": <N>, "low": <N> },
     "findings": [{ "id": "<N>", "severity": "<level>", "perspective": "<name>", "file": "<path>", "line": <N>, "description": "<text>" }]
   }
   ```
6. **Share discoveries**: For each critical/high finding:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"issue_found","data":{"file":"<path>","line":<N>,"severity":"<level>","perspective":"<name>","description":"<text>"}}' >> <session-folder>/discoveries.ndjson
   ```

### If Role = strategist

1. **Read scout results**: Load <session-folder>/scan/scan-results.json (if discovery or full mode)
2. **Analyze change scope**: Run `git diff --name-only HEAD~5` to identify changed files
3. **Detect test framework**: Check for vitest.config.ts, jest.config.js, pytest.ini, pyproject.toml
4. **Categorize files**: Source, Test, Config patterns
5. **Select test layers**:

   | Condition | Layer | Target |
   |-----------|-------|--------|
   | Has source file changes | L1: Unit Tests | 80% |
   | >= 3 source files OR critical issues | L2: Integration Tests | 60% |
   | >= 3 critical/high severity issues | L3: E2E Tests | 40% |

6. **Generate strategy**: Write to <session-folder>/strategy/test-strategy.md with scope analysis, layer configs, priority issues, risk assessment
7. **Share discoveries**: Append framework detection to board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"framework_detected","data":{"framework":"<name>","config_file":"<path>","test_pattern":"<pattern>"}}' >> <session-folder>/discoveries.ndjson
   ```

### If Role = generator

1. **Read strategy**: Load <session-folder>/strategy/test-strategy.md for layer config and priority files
2. **Read source files**: Load files listed in strategy for the target layer (limit 20 files)
3. **Learn test patterns**: Find 3 existing test files to understand conventions (imports, structure, naming)
4. **Detect if GC fix mode**: If task description contains "fix" -> read failure info from results/run-{layer}.json, fix failing tests only
5. **Generate tests**: For each priority source file:
   - Determine test file path following project conventions
   - Generate test cases: happy path, edge cases, error handling
   - Use proper test framework API
   - Include proper imports and mocks
6. **Write test files**: Save to <session-folder>/tests/<layer-dir>/
   - L1 -> tests/L1-unit/
   - L2 -> tests/L2-integration/
   - L3 -> tests/L3-e2e/
7. **Syntax check**: Run `tsc --noEmit` or equivalent to verify syntax
8. **Share discoveries**: Append test generation info to discoveries board

### If Role = analyst

1. **Read all results**: Load <session-folder>/results/run-*.json for execution data
2. **Read scan results**: Load <session-folder>/scan/scan-results.json (if exists)
3. **Read strategy**: Load <session-folder>/strategy/test-strategy.md
4. **Read discoveries**: Parse <session-folder>/discoveries.ndjson for all findings
5. **Analyze five dimensions**:
   - **Defect patterns**: Group issues by type, identify patterns with >= 2 occurrences
   - **Coverage gaps**: Compare achieved vs target per layer, identify per-file gaps
   - **Test effectiveness**: Per layer -- pass rate, iterations, coverage achieved
   - **Quality trend**: Compare against coverage_history if available
   - **Quality score** (0-100): Start from 100, deduct for issues, gaps, failures; bonus for effective layers
6. **Score-based recommendations**:

   | Score | Recommendation |
   |-------|----------------|
   | >= 80 | Quality is GOOD. Maintain current practices. |
   | 60-79 | Quality needs IMPROVEMENT. Focus on gaps and patterns. |
   | < 60 | Quality is CONCERNING. Recommend comprehensive review. |

7. **Generate report**: Write to <session-folder>/analysis/quality-report.md
8. **Share discoveries**: Append quality metrics to board

---

## Output (report_agent_job_result)

Return JSON:
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "issues_found": "count of issues discovered (scout/analyst, empty for others)",
  "pass_rate": "test pass rate as decimal (empty for non-executor tasks)",
  "coverage_achieved": "actual coverage percentage (empty for non-executor tasks)",
  "test_files": "semicolon-separated paths of test files (empty for non-generator tasks)",
  "quality_score": "quality score 0-100 (analyst only, empty for others)",
  "error": ""
}
```

---

## Quality Requirements

All agents must verify before reporting complete:

| Requirement | Criteria |
|-------------|----------|
| Scan results written | Verify scan-results.json exists (scout) |
| Strategy written | Verify test-strategy.md exists (strategist) |
| Tests generated | Verify test files exist in correct layer dir (generator) |
| Syntax clean | No compilation errors in generated tests (generator) |
| Report written | Verify quality-report.md exists (analyst) |
| Findings accuracy | Findings reflect actual work done |
| Discovery sharing | At least 1 discovery shared to board |
| Error reporting | Non-empty error field if status is failed |

---

## Placeholder Reference

| Placeholder | Resolved By | When |
|-------------|------------|------|
| `<session-folder>` | Skill designer (Phase 1) | Literal path baked into instruction |
| `{id}` | spawn_agents_on_csv | Runtime from CSV row |
| `{title}` | spawn_agents_on_csv | Runtime from CSV row |
| `{description}` | spawn_agents_on_csv | Runtime from CSV row |
| `{role}` | spawn_agents_on_csv | Runtime from CSV row |
| `{perspective}` | spawn_agents_on_csv | Runtime from CSV row |
| `{layer}` | spawn_agents_on_csv | Runtime from CSV row |
| `{coverage_target}` | spawn_agents_on_csv | Runtime from CSV row |
| `{prev_context}` | spawn_agents_on_csv | Runtime from CSV row |
