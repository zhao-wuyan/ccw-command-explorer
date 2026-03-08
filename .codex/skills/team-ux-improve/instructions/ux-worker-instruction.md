## TASK ASSIGNMENT

### MANDATORY FIRST STEPS
1. Read shared discoveries: {session_folder}/discoveries.ndjson (if exists, skip if not)
2. Read project context: .workflow/project-tech.json (if exists)
3. Read exploration cache: {session_folder}/explorations/cache-index.json (if exists)

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Description**: {description}
**Role**: {role}
**Component**: {component}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

1. **Read discoveries**: Load {session_folder}/discoveries.ndjson for shared UX findings
2. **Use context**: Apply previous tasks' findings from prev_context above
3. **Execute**: Perform role-specific task
   - **Scanner**: Scan component for UX issues (unresponsive buttons, missing feedback, state refresh)
   - **Diagnoser**: Analyze root causes of identified issues
   - **Implementer**: Apply fixes following design guide
4. **Share discoveries**: Append findings to shared board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> {session_folder}/discoveries.ndjson
   ```
5. **Report result**: Return JSON via report_agent_job_result

### Discovery Types to Share
- `ux_issue`: `{component, type, description, severity}` — UX issues discovered
- `pattern`: `{pattern, files[], description}` — UI patterns identified
- `fix_approach`: `{component, issue, approach, rationale}` — Fix strategies
- `test_result`: `{component, test, status, details}` — Test outcomes

---

## Output (report_agent_job_result)

Return JSON:
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries (max 500 chars)",
  "issues_found": "3",
  "issues_fixed": "3",
  "error": ""
}
