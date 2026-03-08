# Agent Instruction Template -- Team Testing

Base instruction template for CSV wave agents in the testing pipeline. Used by strategist, generator, and analyst roles (csv-wave tasks).

## Purpose

| Phase | Usage |
|-------|-------|
| Phase 1 | Coordinator builds instruction from this template with session folder baked in |
| Phase 2 | Injected as `instruction` parameter to `spawn_agents_on_csv` |

---

## Base Instruction Template

```markdown
## TASK ASSIGNMENT -- Team Testing

### MANDATORY FIRST STEPS
1. Read shared discoveries: <session-folder>/discoveries.ndjson (if exists, skip if not)
2. Read project context: .workflow/project-tech.json (if exists)
3. Read test strategy: <session-folder>/strategy/test-strategy.md (if exists, skip for strategist)

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Role**: {role}
**Layer**: {layer}
**Coverage Target**: {coverage_target}%

### Task Description
{description}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

### If Role = strategist

1. **Analyze git diff**: Run `git diff --name-only HEAD~1 2>/dev/null || git diff --name-only --cached` to identify changed files
2. **Detect test framework**: Check for vitest.config.ts, jest.config.js, pytest.ini, pyproject.toml
3. **Scan existing test patterns**: Glob for `**/*.test.*` and `**/*.spec.*` to understand conventions
4. **Formulate strategy**:
   - Classify changed files by impact (new, modified, deleted, config)
   - Determine appropriate test layers (L1/L2/L3)
   - Set coverage targets per layer
   - Prioritize files for testing
   - Document risk assessment
5. **Write strategy**: Save to <session-folder>/strategy/test-strategy.md
6. **Share discoveries**: Append framework detection and conventions to discoveries board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"framework_detected","data":{"framework":"<name>","config_file":"<path>","test_pattern":"<pattern>"}}' >> <session-folder>/discoveries.ndjson
   ```

### If Role = generator

1. **Read strategy**: Load <session-folder>/strategy/test-strategy.md for layer config and priority files
2. **Read source files**: Load files listed in strategy for the target layer
3. **Learn test patterns**: Find 3 existing test files to understand conventions (imports, structure, naming)
4. **Generate tests**: For each priority source file:
   - Determine test file path following project conventions
   - Generate test cases: happy path, edge cases, error handling
   - Use proper test framework API (describe/it/test/expect)
   - Include proper imports and mocks
5. **Write test files**: Save to <session-folder>/tests/<layer-dir>/
   - L1 -> tests/L1-unit/
   - L2 -> tests/L2-integration/
   - L3 -> tests/L3-e2e/
6. **Syntax check**: Run `tsc --noEmit` or equivalent to verify syntax
7. **Share discoveries**: Append test generation info to discoveries board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"test_generated","data":{"file":"<test-path>","source_file":"<src-path>","test_count":<N>}}' >> <session-folder>/discoveries.ndjson
   ```

### If Role = analyst

1. **Read all results**: Load <session-folder>/results/run-*.json for execution data
2. **Read strategy**: Load <session-folder>/strategy/test-strategy.md
3. **Read discoveries**: Parse <session-folder>/discoveries.ndjson for defect patterns
4. **Analyze coverage**: Compare achieved vs target per layer
5. **Analyze defect patterns**: Group by type/frequency, assign severity
6. **Assess GC effectiveness**: Review improvement across rounds
7. **Calculate quality score** (0-100):
   - Coverage achievement: 30% weight
   - Test effectiveness: 25% weight
   - Defect detection: 25% weight
   - GC loop efficiency: 20% weight
8. **Generate report**: Write comprehensive analysis to <session-folder>/analysis/quality-report.md
9. **Share discoveries**: Append analysis findings to discoveries board

---

## Output (report_agent_job_result)

Return JSON:
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "pass_rate": "test pass rate as decimal (empty for non-executor tasks)",
  "coverage_achieved": "actual coverage percentage (empty for non-executor tasks)",
  "test_files": "semicolon-separated paths of test files (empty for non-generator tasks)",
  "error": ""
}
```

---

## Quality Requirements

All agents must verify before reporting complete:

| Requirement | Criteria |
|-------------|----------|
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
| `{layer}` | spawn_agents_on_csv | Runtime from CSV row |
| `{coverage_target}` | spawn_agents_on_csv | Runtime from CSV row |
| `{prev_context}` | spawn_agents_on_csv | Runtime from CSV row |
