## TASK ASSIGNMENT

### MANDATORY FIRST STEPS
1. Read role definition: {role_spec_path} (MUST read first)
2. Read shared discoveries: {session_folder}/discoveries.ndjson (if exists, skip if not)
3. Read project context: .workflow/project-tech.json (if exists)

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Description**: {description}
**Role**: {role}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

1. **Read role definition**: Load {role_spec_path} for Phase 2-4 domain instructions (MANDATORY)
2. **Read discoveries**: Load {session_folder}/discoveries.ndjson for shared exploration findings
3. **Use context**: Apply previous tasks' findings from prev_context above
4. **Execute**: Follow the role-specific instructions from your role definition file
5. **Share discoveries**: Append exploration findings to shared board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> {session_folder}/discoveries.ndjson
   ```
6. **Report result**: Return JSON via report_agent_job_result

### Role Definition Structure

Your role definition file contains:
- **Phase 2**: Context & scope resolution
- **Phase 3**: Execution steps
- **Phase 4**: Output generation

Follow the phases in order as defined in your role file.

### Discovery Types to Share

- `implementation`: {file, function, approach, notes} — Implementation approach taken
- `test_result`: {test_name, status, duration} — Test execution result
- `review_comment`: {file, line, severity, comment} — Code review comment
- `pattern`: {pattern, files[], occurrences} — Code pattern identified

---

## Output (report_agent_job_result)

Return JSON:
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "error": ""
}

**Findings format**: Concise summary of what was accomplished, key decisions made, and any important notes for downstream tasks.
