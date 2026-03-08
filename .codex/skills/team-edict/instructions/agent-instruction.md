## TASK ASSIGNMENT

### MANDATORY FIRST STEPS
1. Read shared discoveries: .workflow/.csv-wave/{session-id}/discoveries.ndjson (if exists, skip if not)
2. Read dispatch plan: .workflow/.csv-wave/{session-id}/plan/dispatch-plan.md (task details and acceptance criteria)
3. Read approved plan: .workflow/.csv-wave/{session-id}/plan/zhongshu-plan.md (overall strategy and context)
4. Read quality gates: .codex/skills/team-edict/specs/quality-gates.md (quality standards)
5. Read team config: .codex/skills/team-edict/specs/team-config.json (routing rules and artifact paths)

> **Note**: The session directory path is provided by the orchestrator in `additional_instructions`. Use it to resolve the paths above.

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Description**: {description}
**Department**: {department}
**Task Prefix**: {task_prefix}
**Priority**: {priority}
**Dispatch Batch**: {dispatch_batch}
**Acceptance Criteria**: {acceptance_criteria}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

1. **Read discoveries**: Load the session's discoveries.ndjson for shared exploration findings from other agents
2. **Use context**: Apply previous tasks' findings from prev_context above
3. **Report state start**: Append a state_update discovery with state "Doing":
   ```bash
   echo '{{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","worker":"{id}","type":"state_update","data":{{"state":"Doing","task_id":"{id}","department":"{department}","step":"Starting: {title}"}}}}' >> .workflow/.csv-wave/{session-id}/discoveries.ndjson
   ```
4. **Execute based on department**:

   **If department = gongbu (Engineering)**:
   - Read target files listed in description
   - Explore codebase to understand existing patterns and conventions
   - Implement changes following project coding style
   - Validate changes compile/lint correctly (use IDE diagnostics if available)
   - Write output artifact to session artifacts directory
   - Run relevant tests if available

   **If department = bingbu (Operations)**:
   - Analyze infrastructure requirements from description
   - Create/modify deployment scripts, CI/CD configs, or monitoring setup
   - Validate configuration syntax
   - Write output artifact to session artifacts directory

   **If department = hubu (Data & Resources)**:
   - Analyze data sources and requirements from description
   - Perform data analysis, generate reports or dashboards
   - Include key metrics and visualizations where applicable
   - Write output artifact to session artifacts directory

   **If department = libu (Documentation)**:
   - Read source code and existing documentation
   - Generate documentation following format specified in description
   - Ensure accuracy against current implementation
   - Include code examples where appropriate
   - Write output artifact to session artifacts directory

   **If department = libu-hr (Personnel)**:
   - Read agent/skill files as needed
   - Analyze patterns, generate training materials or evaluations
   - Write output artifact to session artifacts directory

   **If department = xingbu (Quality Assurance)**:
   - This department typically runs as interactive (test-fix loop)
   - If running as csv-wave: execute one-shot review/audit
   - Read code and test files, run analysis
   - Classify findings by severity (Critical/High/Medium/Low)
   - Write report artifact to session artifacts directory

5. **Write artifact**: Save your output to the appropriate artifact file:
   - gongbu -> `artifacts/gongbu-output.md`
   - bingbu -> `artifacts/bingbu-output.md`
   - hubu -> `artifacts/hubu-output.md`
   - libu -> `artifacts/libu-output.md`
   - libu-hr -> `artifacts/libu-hr-output.md`
   - xingbu -> `artifacts/xingbu-report.md`

   If multiple tasks exist for the same department, append task ID: `artifacts/gongbu-output-{id}.md`

6. **Share discoveries**: Append exploration findings to shared board:
   ```bash
   echo '{{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","worker":"{id}","type":"<type>","data":{{...}}}}' >> .workflow/.csv-wave/{session-id}/discoveries.ndjson
   ```

7. **Report completion state**:
   ```bash
   echo '{{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","worker":"{id}","type":"state_update","data":{{"state":"Done","task_id":"{id}","department":"{department}","remark":"Completed: <summary>"}}}}' >> .workflow/.csv-wave/{session-id}/discoveries.ndjson
   ```

8. **Report result**: Return JSON via report_agent_job_result

### Discovery Types to Share
- `codebase_pattern`: `{pattern_name, files, description}` -- Identified codebase patterns and conventions
- `dependency_found`: `{dep_name, version, used_by}` -- External dependency discoveries
- `risk_identified`: `{risk_id, severity, description, mitigation}` -- Risk findings
- `implementation_note`: `{file_path, note, line_range}` -- Implementation decisions
- `test_result`: `{test_suite, pass_rate, failures}` -- Test execution results
- `quality_issue`: `{issue_id, severity, file, description}` -- Quality issues found

---

## Artifact Output Format

Write your artifact file in this structure:

```markdown
# {department} Output Report -- {id}

## Task
{title}

## Implementation Summary
<What was done, key decisions made>

## Files Modified/Created
- `path/to/file1` -- description of change
- `path/to/file2` -- description of change

## Acceptance Criteria Verification
| Criterion | Status | Evidence |
|-----------|--------|----------|
| <from acceptance_criteria> | Pass/Fail | <specific evidence> |

## Key Findings
- Finding 1 with file:line reference
- Finding 2 with file:line reference

## Risks / Open Issues
- Any remaining risks or issues (if none, state "None identified")
```

---

## Output (report_agent_job_result)

Return JSON:
```json
{
  "id": "{id}",
  "status": "completed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "artifact_path": "artifacts/<department>-output.md",
  "error": ""
}
```

If the task fails:
```json
{
  "id": "{id}",
  "status": "failed",
  "findings": "Partial progress description",
  "artifact_path": "",
  "error": "Specific error description"
}
```

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Target files not found | Report in findings, attempt with available context |
| Acceptance criteria ambiguous | Interpret conservatively, note assumption in findings |
| Blocked by missing dependency output | Report "Blocked" state in discoveries, set status to failed with reason |
| Compilation/lint errors in changes | Attempt to fix; if unfixable, report in findings with details |
| Test failures | Report in findings with specific failures, continue with remaining work |
