## TASK ASSIGNMENT

### MANDATORY FIRST STEPS
1. Read shared discoveries: {session_folder}/discoveries.ndjson (if exists, skip if not)
2. Read project context: .workflow/project-tech.json (if exists)
3. Read implementation plan: {session_folder}/phase-{phase}/IMPL_PLAN.md
4. Read task details: {session_folder}/phase-{phase}/.task/{id}.json (if exists)

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Description**: {description}
**Phase**: {phase}
**Role**: {role}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

1. **Read discoveries**: Load {session_folder}/discoveries.ndjson for shared exploration findings
2. **Use context**: Apply previous tasks' findings from prev_context above
3. **Execute**: Implement the task following the implementation plan and task details
   - Read target files listed in description
   - Apply changes following project conventions
   - Validate changes compile/lint correctly
   - Run relevant tests if available
4. **Share discoveries**: Append exploration findings to shared board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> {session_folder}/discoveries.ndjson
   ```
5. **Report result**: Return JSON via report_agent_job_result

### Discovery Types to Share
- `file_pattern`: `{pattern, files[], description}` — Code patterns discovered
- `dependency`: `{from, to, type}` — Module dependencies identified
- `risk`: `{description, severity, mitigation}` — Implementation risks
- `test_gap`: `{area, description, priority}` — Testing gaps identified

---

## Output (report_agent_job_result)

Return JSON:
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "error": ""
}
