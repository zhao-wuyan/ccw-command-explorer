# Agent Instruction -- Team PlanEx

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
**Input Type**: {input_type}
**Raw Input**: {raw_input}
**Execution Method**: {execution_method}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

### Role Router

Determine your execution steps based on `{role}`:

| Role | Execution Steps |
|------|----------------|
| planner | Step A: Solution Planning |
| executor | Step B: Implementation |

---

### Step A: Solution Planning (planner role)

1. Parse issue ID from `{issue_ids}`
2. Determine input source from `{input_type}`:

| Input Type | Action |
|------------|--------|
| `issues` | Load issue details: `Bash("ccw issue status {issue_ids} --json")` |
| `text` | Create issue from text: `Bash("ccw issue create --title '<derived>' --context '{raw_input}'")` |
| `plan` | Read plan file: `Read("{raw_input}")`, parse into issue requirements |

3. Generate solution via CLI:
   ```bash
   ccw cli -p "PURPOSE: Generate implementation solution for issue <issueId>; success = actionable task breakdown with file paths
   TASK: * Load issue details * Analyze requirements * Design solution approach * Break down into implementation tasks * Identify files to modify/create
   MODE: analysis
   CONTEXT: @**/* | Memory: Session wisdom
   EXPECTED: JSON solution with: title, description, tasks array (each with description, files_touched), estimated_complexity
   CONSTRAINTS: Follow project patterns | Reference existing implementations
   " --tool gemini --mode analysis --rule planning-breakdown-task-steps
   ```

4. Parse CLI output to extract solution JSON

5. Write solution artifact:
   ```javascript
   Write("<session>/artifacts/solutions/<issueId>.json", JSON.stringify({
     session_id: "<session-id>",
     issue_id: "<issueId>",
     solution: solutionFromCli,
     planned_at: new Date().toISOString()
   }))
   ```

6. Check for file conflicts with other solutions in session:
   - Read other solution files in `<session>/artifacts/solutions/`
   - Compare `files_touched` lists
   - If overlapping files found, log warning to discoveries.ndjson

7. Share discoveries to board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"solution_designed","data":{"issue_id":"<issueId>","approach":"<approach>","task_count":<N>,"estimated_files":<M>}}' >> <session>/discoveries.ndjson
   ```

---

### Step B: Implementation (executor role)

1. Parse issue ID from `{issue_ids}`

2. Load solution artifact:
   - Primary: Read file from prev_context artifact_path
   - Fallback: `Read("<session>/artifacts/solutions/<issueId>.json")`
   - Last resort: `Bash("ccw issue solutions <issueId> --json")`

3. Load wisdom files for conventions and patterns

4. Determine execution backend from `{execution_method}`:

| Method | CLI Command |
|--------|-------------|
| codex | `ccw cli --tool codex --mode write --id exec-<issueId>` |
| gemini | `ccw cli --tool gemini --mode write --id exec-<issueId>` |
| qwen | `ccw cli --tool qwen --mode write --id exec-<issueId>` |

5. Execute implementation via CLI:
   ```bash
   ccw cli -p "PURPOSE: Implement solution for issue <issueId>; success = all tasks completed, tests pass
   TASK: <solution.tasks as bullet points>
   MODE: write
   CONTEXT: @**/* | Memory: Solution plan, session wisdom
   EXPECTED: Working implementation with code changes, test updates, no syntax errors
   CONSTRAINTS: Follow existing patterns | Maintain backward compatibility
   Issue: <issueId>
   Title: <solution.title>
   Solution: <solution JSON>" --tool <execution_method> --mode write --rule development-implement-feature
   ```

6. Verify implementation:

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Tests | Detect and run project test command | All pass |
| Syntax | IDE diagnostics or `tsc --noEmit` | No errors |

   If tests fail: retry implementation once, then report as failed.

7. Commit changes:
   ```bash
   git add -A
   git commit -m "feat(<issueId>): <solution.title>"
   ```

8. Update issue status:
   ```bash
   ccw issue update <issueId> --status completed
   ```

9. Share discoveries to board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"impl_result","data":{"issue_id":"<issueId>","files_changed":<N>,"tests_pass":<bool>,"commit":"<hash>"}}' >> <session>/discoveries.ndjson
   ```

---

## Share Discoveries (ALL ROLES)

After completing your work, append findings to the shared discovery board:

```bash
echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> <session>/discoveries.ndjson
```

**Discovery Types to Share**:

| Type | Data Schema | When to Use |
|------|-------------|-------------|
| `solution_designed` | `{issue_id, approach, task_count, estimated_files}` | Planner: solution plan completed |
| `conflict_warning` | `{issue_ids, overlapping_files}` | Planner: file overlap between issues |
| `pattern_found` | `{pattern, location, description}` | Any: code pattern identified |
| `impl_result` | `{issue_id, files_changed, tests_pass, commit}` | Executor: implementation outcome |
| `test_failure` | `{issue_id, test_file, error_msg}` | Executor: test failure |

---

## Output (report_agent_job_result)

Return JSON:
```json
{
  "id": "{id}",
  "status": "completed | failed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "artifact_path": "relative path to main artifact (e.g., artifacts/solutions/ISS-xxx.json or builds/ISS-xxx.json)",
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
- [ ] Findings include actionable details (file paths, task counts, etc.)
- [ ] prev_context findings were incorporated where available
