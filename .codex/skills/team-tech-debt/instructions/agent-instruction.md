# Agent Instruction Template -- Team Tech Debt

Role-specific instruction templates for CSV wave agents in the tech debt pipeline. Each role has a specialized instruction that is injected as the `instruction` parameter to `spawn_agents_on_csv`.

## Purpose

| Phase | Usage |
|-------|-------|
| Phase 1 | Orchestrator selects role-specific instruction based on task role |
| Phase 2 | Injected as `instruction` parameter to `spawn_agents_on_csv` |

---

## Scanner Instruction

```markdown
## TECH DEBT SCAN TASK

### MANDATORY FIRST STEPS
1. Read shared discoveries: <session-folder>/discoveries.ndjson (if exists)
2. Read project context: .workflow/project-tech.json (if exists)

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Role**: scanner
**Dimension Focus**: {debt_dimension}
**Pipeline Mode**: {pipeline_mode}

### Task Description
{description}

### Previous Context
{prev_context}

---

## Execution Protocol

1. **Read discoveries**: Load <session-folder>/discoveries.ndjson
2. **Detect project type**: Check package.json, pyproject.toml, go.mod, etc.
3. **Scan 5 dimensions**:
   - **Code**: Complexity > 10, TODO/FIXME, deprecated APIs, dead code, duplicated logic
   - **Architecture**: Circular dependencies, god classes, layering violations, tight coupling
   - **Testing**: Missing tests, low coverage, test quality issues, no integration tests
   - **Dependency**: Outdated packages, known vulnerabilities, unused dependencies
   - **Documentation**: Missing JSDoc/docstrings, stale API docs, no README sections
4. **Use tools**: mcp__ace-tool__search_context for semantic search, Grep for pattern matching, Bash for static analysis tools
5. **Standardize each finding**:
   - id: TD-NNN (sequential)
   - dimension: code|architecture|testing|dependency|documentation
   - severity: critical|high|medium|low
   - file: path, line: number
   - description: issue description
   - suggestion: fix suggestion
   - estimated_effort: small|medium|large|unknown
6. **Share discoveries**: Append each finding to discovery board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"debt_item_found","data":{"id":"TD-NNN","dimension":"<dim>","severity":"<sev>","file":"<path>","line":<n>,"description":"<desc>","suggestion":"<fix>","estimated_effort":"<effort>"}}' >> <session-folder>/discoveries.ndjson
   ```
7. **Write artifact**: Save structured inventory to <session-folder>/scan/debt-inventory.json
8. **Report result**

---

## Output (report_agent_job_result)

{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Scanned N dimensions. Found M debt items: X critical, Y high... (max 500 chars)",
  "debt_items_count": "<total count>",
  "artifacts_produced": "scan/debt-inventory.json",
  "error": ""
}
```

---

## Assessor Instruction

```markdown
## TECH DEBT ASSESSMENT TASK

### MANDATORY FIRST STEPS
1. Read shared discoveries: <session-folder>/discoveries.ndjson (if exists)
2. Read debt inventory: <session-folder>/scan/debt-inventory.json

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Role**: assessor

### Task Description
{description}

### Previous Context
{prev_context}

---

## Execution Protocol

1. **Load debt inventory** from <session-folder>/scan/debt-inventory.json
2. **Score each item**:
   - **Impact Score** (1-5): critical=5, high=4, medium=3, low=1
   - **Cost Score** (1-5): small=1, medium=3, large=5, unknown=3
3. **Classify into priority quadrants**:
   | Impact | Cost | Quadrant |
   |--------|------|----------|
   | >= 4 | <= 2 | quick-win |
   | >= 4 | >= 3 | strategic |
   | <= 3 | <= 2 | backlog |
   | <= 3 | >= 3 | defer |
4. **Sort** within each quadrant by impact_score descending
5. **Share discoveries**: Append assessment summary to discovery board
6. **Write artifact**: <session-folder>/assessment/priority-matrix.json
7. **Report result**

---

## Output (report_agent_job_result)

{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Assessed M items. Quick-wins: X, Strategic: Y, Backlog: Z, Defer: W (max 500 chars)",
  "debt_items_count": "<total assessed>",
  "artifacts_produced": "assessment/priority-matrix.json",
  "error": ""
}
```

---

## Planner Instruction

```markdown
## TECH DEBT PLANNING TASK

### MANDATORY FIRST STEPS
1. Read shared discoveries: <session-folder>/discoveries.ndjson (if exists)
2. Read priority matrix: <session-folder>/assessment/priority-matrix.json

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Role**: planner

### Task Description
{description}

### Previous Context
{prev_context}

---

## Execution Protocol

1. **Load priority matrix** from <session-folder>/assessment/priority-matrix.json
2. **Group items**: quickWins (quick-win), strategic, backlog, deferred
3. **Create 3-phase remediation plan**:
   - **Phase 1: Quick Wins** -- High impact, low cost, immediate execution
   - **Phase 2: Systematic** -- High impact, high cost, structured refactoring
   - **Phase 3: Prevention** -- Long-term prevention mechanisms
4. **Map action types** per dimension:
   | Dimension | Action Type |
   |-----------|-------------|
   | code | refactor |
   | architecture | restructure |
   | testing | add-tests |
   | dependency | update-deps |
   | documentation | add-docs |
5. **Generate prevention actions** for dimensions with >= 3 items:
   | Dimension | Prevention |
   |-----------|------------|
   | code | Add linting rules for complexity thresholds |
   | architecture | Introduce module boundary checks in CI |
   | testing | Set minimum coverage thresholds |
   | dependency | Configure automated update bot |
   | documentation | Add docstring enforcement in linting |
6. **Write artifacts**:
   - <session-folder>/plan/remediation-plan.md (human-readable with checklists)
   - <session-folder>/plan/remediation-plan.json (machine-readable)
7. **Report result**

---

## Output (report_agent_job_result)

{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Created 3-phase plan. Phase 1: X quick-wins. Phase 2: Y systematic. Phase 3: Z prevention. Total actions: N (max 500 chars)",
  "debt_items_count": "<total planned items>",
  "artifacts_produced": "plan/remediation-plan.md;plan/remediation-plan.json",
  "error": ""
}
```

---

## Executor Instruction

```markdown
## TECH DEBT FIX EXECUTION TASK

### MANDATORY FIRST STEPS
1. Read shared discoveries: <session-folder>/discoveries.ndjson (if exists)
2. Read remediation plan: <session-folder>/plan/remediation-plan.json

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Role**: executor

### Task Description
{description}

### Previous Context
{prev_context}

---

## Execution Protocol

**CRITICAL**: ALL file operations must execute within the worktree path.

1. **Load remediation plan** from <session-folder>/plan/remediation-plan.json
2. **Extract worktree path** from task description
3. **Group actions by type**: refactor -> update-deps -> add-tests -> add-docs -> restructure
4. **For each batch**:
   - Read target files in worktree
   - Apply changes following project conventions
   - Validate changes compile/lint: `cd "<worktree>" && npx tsc --noEmit` or equivalent
   - Track: items_fixed, items_failed, files_modified
5. **After each batch**: Verify via `cd "<worktree>" && git diff --name-only`
6. **Share discoveries**: Append fix_applied entries to discovery board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"fix_applied","data":{"file":"<path>","change":"<desc>","lines_modified":<n>,"debt_id":"<TD-NNN>"}}' >> <session-folder>/discoveries.ndjson
   ```
7. **Self-validate**:
   | Check | Command | Pass Criteria |
   |-------|---------|---------------|
   | Syntax | `cd "<worktree>" && npx tsc --noEmit` | No new errors |
   | Lint | `cd "<worktree>" && npx eslint --no-error-on-unmatched-pattern` | No new errors |
8. **Write artifact**: <session-folder>/fixes/fix-log.json
9. **Report result**

---

## Output (report_agent_job_result)

{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Fixed X/Y items. Batches: refactor(N), update-deps(N), add-tests(N). Files modified: Z (max 500 chars)",
  "debt_items_count": "<items fixed>",
  "artifacts_produced": "fixes/fix-log.json",
  "error": ""
}
```

---

## Validator Instruction

```markdown
## TECH DEBT VALIDATION TASK

### MANDATORY FIRST STEPS
1. Read shared discoveries: <session-folder>/discoveries.ndjson (if exists)
2. Read fix log: <session-folder>/fixes/fix-log.json (if exists)

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Role**: validator

### Task Description
{description}

### Previous Context
{prev_context}

---

## Execution Protocol

**CRITICAL**: ALL validation commands must execute within the worktree path.

1. **Extract worktree path** from task description
2. **Load fix results** from <session-folder>/fixes/fix-log.json
3. **Run 4-layer validation**:

   **Layer 1 -- Test Suite**:
   - Command: `cd "<worktree>" && npm test` or `cd "<worktree>" && python -m pytest`
   - PASS: No FAIL/error/failed keywords
   - SKIP: No test runner available

   **Layer 2 -- Type Check**:
   - Command: `cd "<worktree>" && npx tsc --noEmit`
   - Count: `error TS` occurrences

   **Layer 3 -- Lint Check**:
   - Command: `cd "<worktree>" && npx eslint --no-error-on-unmatched-pattern <modified-files>`
   - Count: error occurrences

   **Layer 4 -- Quality Analysis** (when > 5 modified files):
   - Compare code quality before/after
   - Assess complexity, duplication, naming improvements

4. **Calculate debt score**:
   - debt_score_after = debt items NOT in modified files (remaining unfixed)
   - improvement_percentage = ((before - after) / before) * 100

5. **Auto-fix attempt** (when total_regressions <= 3):
   - Fix minor regressions inline
   - Re-run validation checks

6. **Share discoveries**: Append regression_found entries if any:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"regression_found","data":{"file":"<path>","test":"<test>","description":"<desc>","severity":"<sev>"}}' >> <session-folder>/discoveries.ndjson
   ```

7. **Write artifact**: <session-folder>/validation/validation-report.json with:
   - validation_date, passed (bool), total_regressions
   - checks: {tests, types, lint, quality} with per-check status
   - debt_score_before, debt_score_after, improvement_percentage
8. **Report result**

---

## Output (report_agent_job_result)

{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Validation: PASSED|FAILED. Tests: OK/N failures. Types: OK/N errors. Lint: OK/N errors. Debt reduction: X% (max 500 chars)",
  "debt_items_count": "<debt_score_after>",
  "artifacts_produced": "validation/validation-report.json",
  "error": ""
}
```

---

## Placeholder Reference

| Placeholder | Resolved By | When |
|-------------|------------|------|
| `<session-folder>` | Skill designer (Phase 1) | Literal path baked into instruction |
| `{id}` | spawn_agents_on_csv | Runtime from CSV row |
| `{title}` | spawn_agents_on_csv | Runtime from CSV row |
| `{description}` | spawn_agents_on_csv | Runtime from CSV row |
| `{role}` | spawn_agents_on_csv | Runtime from CSV row |
| `{debt_dimension}` | spawn_agents_on_csv | Runtime from CSV row |
| `{pipeline_mode}` | spawn_agents_on_csv | Runtime from CSV row |
| `{prev_context}` | spawn_agents_on_csv | Runtime from CSV row |

---

## Instruction Selection Logic

The orchestrator selects the appropriate instruction section based on the task's `role` column:

| Role | Instruction Section |
|------|-------------------|
| scanner | Scanner Instruction |
| assessor | Assessor Instruction |
| planner | Planner Instruction |
| executor | Executor Instruction |
| validator | Validator Instruction |

Since each wave typically contains tasks from a single role (linear pipeline), the orchestrator uses the role of the first task in the wave to select the instruction template. The `<session-folder>` placeholder is replaced with the actual session path before injection.
