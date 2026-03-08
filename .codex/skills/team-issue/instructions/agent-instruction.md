# Agent Instruction -- Team Issue Resolution

CSV agent instruction template for `spawn_agents_on_csv`. Each agent receives this template with its row's column values substituted via `{column_name}` placeholders.

---

## TASK ASSIGNMENT

### MANDATORY FIRST STEPS
1. Read shared discoveries: `.workflow/.csv-wave/{session_id}/discoveries.ndjson` (if exists, skip if not)
2. Read project context: `.workflow/project-tech.json` (if exists)
3. Read wisdom files: `.workflow/.csv-wave/{session_id}/wisdom/` (conventions, learnings)

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Description**: {description}
**Role**: {role}
**Issue IDs**: {issue_ids}
**Execution Method**: {execution_method}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

### Role Router

Determine your execution steps based on `{role}`:

| Role | Execution Steps |
|------|----------------|
| explorer | Step A: Codebase Exploration |
| planner | Step B: Solution Design |
| integrator | Step C: Queue Formation |
| implementer | Step D: Implementation |

---

### Step A: Codebase Exploration (explorer role)

1. Extract issue ID from `{issue_ids}` (pattern: `GH-\d+` or `ISS-\d{8}-\d{6}`)
2. Load issue details: `Bash("ccw issue status <issueId> --json")`
3. Assess complexity from issue keywords:

| Signal | Weight |
|--------|--------|
| Structural change (refactor, architect) | +2 |
| Cross-cutting (multiple, across) | +2 |
| Integration (api, database) | +1 |
| High priority (>= 4) | +1 |

4. Explore codebase:
   - Use `mcp__ace-tool__search_context` for semantic search based on issue keywords
   - Read relevant files to understand context
   - Map dependencies and integration points
   - Check git log for related changes

5. Write context report:
   ```bash
   # Write to session explorations folder
   Write("<session>/explorations/context-<issueId>.json", JSON.stringify({
     issue_id: "<issueId>",
     issue: { id, title, priority, status, labels, feedback },
     relevant_files: [{ path, relevance }],
     dependencies: [],
     impact_scope: "low|medium|high",
     existing_patterns: [],
     related_changes: [],
     key_findings: [],
     complexity_assessment: "Low|Medium|High"
   }))
   ```

6. Share discoveries to board

---

### Step B: Solution Design (planner role)

1. Extract issue ID from `{issue_ids}`
2. Load explorer context (if available): Read upstream artifact from prev_context
3. Check if this is a revision task (SOLVE-fix-*): If yes, read audit report for rejection feedback
4. Generate solution via CLI:
   ```bash
   ccw cli -p "PURPOSE: Design solution for issue <issueId> and decompose into implementation tasks; success = solution with task breakdown
   TASK: * Load issue details * Analyze explorer context * Design solution approach * Break into tasks * Generate solution JSON
   MODE: analysis
   CONTEXT: @**/* | Memory: Issue <issueId>, Explorer findings from prev_context
   EXPECTED: Solution JSON with: issue_id, solution_id, approach, tasks[], estimated_files, dependencies
   CONSTRAINTS: Follow existing patterns | Minimal changes
   " --tool gemini --mode analysis --rule planning-breakdown-task-steps
   ```
5. Write solution artifact:
   ```bash
   Write("<session>/solutions/solution-<issueId>.json", solutionJson)
   ```
6. Bind solution to issue: `Bash("ccw issue bind <issueId> <solutionId>")`

---

### Step C: Queue Formation (integrator role)

1. Extract issue IDs from `{issue_ids}`
2. Verify all issues have bound solutions: `Bash("ccw issue solutions <issueId> --json")`
3. Analyze file conflicts between solutions
4. Build dependency graph for execution ordering
5. Determine parallel execution groups
6. Write execution queue:
   ```bash
   Write("<session>/queue/execution-queue.json", JSON.stringify({
     queue: [{ issue_id, solution_id, order, depends_on: [], estimated_files: [] }],
     conflicts: [{ issues: [], files: [], resolution: "" }],
     parallel_groups: [{ group: 0, issues: [] }]
   }))
   ```

---

### Step D: Implementation (implementer role)

1. Extract issue ID from `{issue_ids}`
2. Load bound solution: `Bash("ccw issue solutions <issueId> --json")`
3. Load explorer context (from prev_context or file)
4. Determine execution backend from `{execution_method}`:

| Method | CLI Command |
|--------|-------------|
| codex | `ccw cli --tool codex --mode write --id issue-<issueId>` |
| gemini | `ccw cli --tool gemini --mode write --id issue-<issueId>` |
| qwen | `ccw cli --tool qwen --mode write --id issue-<issueId>` |

5. Execute implementation:
   ```bash
   ccw cli -p "PURPOSE: Implement solution for issue <issueId>; success = all tasks completed, tests pass
   TASK: <solution.tasks as bullet points>
   MODE: write
   CONTEXT: @**/* | Memory: Solution plan, explorer context
   EXPECTED: Working implementation with code changes, test updates
   CONSTRAINTS: Follow existing patterns | Maintain backward compatibility
   " --tool <execution_method> --mode write --rule development-implement-feature
   ```

6. Verify: Run tests, check for errors
7. Update issue status: `Bash("ccw issue update <issueId> --status resolved")`

---

## Share Discoveries (ALL ROLES)

After completing your work, append findings to the shared discovery board:

```bash
echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> <session>/discoveries.ndjson
```

**Discovery Types to Share**:

| Type | Data Schema | When to Use |
|------|-------------|-------------|
| `file_found` | `{path, relevance, purpose}` | Explorer: relevant file discovered |
| `pattern_found` | `{pattern, location, description}` | Explorer: code pattern identified |
| `dependency_found` | `{from, to, type}` | Explorer: module dependency found |
| `solution_approach` | `{issue_id, approach, estimated_files}` | Planner: solution strategy |
| `conflict_found` | `{issues, files, resolution}` | Integrator: file conflict |
| `impl_result` | `{issue_id, files_changed, tests_pass}` | Implementer: build outcome |

---

## Output (report_agent_job_result)

Return JSON:
```json
{
  "id": "{id}",
  "status": "completed | failed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "artifact_path": "relative path to main artifact file (e.g., explorations/context-ISS-xxx.json)",
  "error": ""
}
```

---

## Quality Checklist

Before reporting complete:
- [ ] Mandatory first steps completed (discoveries, project context, wisdom)
- [ ] Role-specific execution steps followed
- [ ] At least 1 discovery shared to board
- [ ] Artifact file written to session folder
- [ ] Findings include file:line references where applicable
- [ ] prev_context findings were incorporated
