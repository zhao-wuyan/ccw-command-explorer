# Agent Instruction Template -- Team Skill Designer

Base instruction template for CSV wave agents. Each agent receives this template with its row's column values substituted at runtime via `spawn_agents_on_csv`.

## Purpose

| Phase | Usage |
|-------|-------|
| Phase 1 | Baked into instruction parameter with session folder path |
| Phase 2 | Injected as `instruction` parameter to `spawn_agents_on_csv` |

---

## Base Instruction Template

```markdown
## TASK ASSIGNMENT -- Team Skill Designer

### MANDATORY FIRST STEPS
1. Read shared discoveries: <session-folder>/discoveries.ndjson (if exists, skip if not)
2. Read project context: .workflow/project-tech.json (if exists)
3. Read teamConfig: <session-folder>/teamConfig.json (REQUIRED -- contains complete skill configuration)

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Role**: {role}
**File Target**: {file_target}
**Generation Type**: {gen_type}

### Task Description
{description}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

1. **Read discoveries**: Load <session-folder>/discoveries.ndjson for shared exploration findings
2. **Read teamConfig**: Load <session-folder>/teamConfig.json for complete skill configuration (roles, pipelines, specs, templates)
3. **Use context**: Apply previous tasks' findings from prev_context above
4. **Execute by gen_type**:

### For gen_type = directory
   - Parse teamConfig to determine required directories
   - Create directory structure at teamConfig.targetDir
   - Create subdirectories: roles/, specs/, templates/ (if needed)
   - Create per-role subdirectories: roles/<role-name>/ (+ commands/ if hasCommands)
   - Verify all directories exist

### For gen_type = router
   - Read existing Codex team skill SKILL.md as reference pattern
   - Generate SKILL.md with these sections in order:
     1. YAML frontmatter (name, description, argument-hint, allowed-tools)
     2. Auto Mode section
     3. Title + Usage examples
     4. Overview with workflow diagram
     5. Task Classification Rules
     6. CSV Schema (header + column definitions)
     7. Agent Registry (if interactive agents exist)
     8. Output Artifacts table
     9. Session Structure diagram
     10. Implementation (session init, phases 0-4)
     11. Discovery Board Protocol
     12. Error Handling table
     13. Core Rules list
   - Use teamConfig.roles for role registry
   - Use teamConfig.pipelines for pipeline definitions

### For gen_type = role-bundle
   - Generate role.md with:
     1. YAML frontmatter (role, prefix, inner_loop, message_types)
     2. Identity section
     3. Boundaries (MUST/MUST NOT)
     4. Entry Router (for coordinator)
     5. Phase references (Phase 0-5 for coordinator)
   - Generate commands/*.md for each command in teamConfig.roles[].commands
   - Each command file: Purpose, Constants, Phase 2-4 execution logic
   - Coordinator always gets: analyze.md, dispatch.md, monitor.md

### For gen_type = role-inline
   - Generate single role.md with:
     1. YAML frontmatter (role, prefix, inner_loop, message_types)
     2. Identity section
     3. Boundaries (MUST/MUST NOT)
     4. Phase 2: Context Loading
     5. Phase 3: Domain Execution (role-specific logic)
     6. Phase 4: Output & Report

### For gen_type = spec
   - For pipelines.md: Generate from teamConfig.pipelines
     - Pipeline name, task table (ID, Role, Name, Depends On, Checkpoint)
     - Task metadata registry
     - Conditional routing rules
     - Dynamic specialist injection
   - For other specs: Generate domain-appropriate content

### For gen_type = template
   - Check for reference templates in existing skills
   - Generate domain-appropriate template structure
   - Include placeholder sections and formatting guidelines

5. **Share discoveries**: Append exploration findings to shared board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> <session-folder>/discoveries.ndjson
   ```
6. **Report result**: Return JSON via report_agent_job_result

### Discovery Types to Share
- `dir_created`: {path, description} -- Directory structure created
- `file_generated`: {file, gen_type, sections} -- File generated with specific sections
- `pattern_found`: {pattern_name, description} -- Design pattern identified
- `config_decision`: {decision, rationale, impact} -- Configuration decision made
- `reference_found`: {source, target, type} -- Cross-reference between generated files

---

## Output (report_agent_job_result)

Return JSON:
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries and generation notes (max 500 chars)",
  "files_produced": "semicolon-separated paths of produced files relative to skill root",
  "error": ""
}
```

---

## Quality Requirements

All agents must verify before reporting complete:

| Requirement | Criteria |
|-------------|----------|
| Files produced | Verify all claimed files exist via Read |
| teamConfig adherence | Generated content matches teamConfig specifications |
| Pattern fidelity | Generated files follow existing Codex skill patterns |
| Discovery sharing | At least 1 discovery shared to board |
| Error reporting | Non-empty error field if status is failed |
| YAML frontmatter | Role files must have valid frontmatter for agent parsing |

---

## Placeholder Reference

| Placeholder | Resolved By | When |
|-------------|------------|------|
| `<session-folder>` | Skill designer (Phase 1) | Literal path baked into instruction |
| `{id}` | spawn_agents_on_csv | Runtime from CSV row |
| `{title}` | spawn_agents_on_csv | Runtime from CSV row |
| `{description}` | spawn_agents_on_csv | Runtime from CSV row |
| `{role}` | spawn_agents_on_csv | Runtime from CSV row |
| `{file_target}` | spawn_agents_on_csv | Runtime from CSV row |
| `{gen_type}` | spawn_agents_on_csv | Runtime from CSV row |
| `{prev_context}` | spawn_agents_on_csv | Runtime from CSV row |
