# Agent Instruction Template -- Team Coordinate

Base instruction template for CSV wave agents. The orchestrator dynamically customizes this per role during Phase 1, writing role-specific versions to `role-instructions/{role-name}.md`.

## Purpose

| Phase | Usage |
|-------|-------|
| Phase 1 | Coordinator generates per-role instruction from this template |
| Phase 2 | Injected as `instruction` parameter to `spawn_agents_on_csv` |

---

## Base Instruction Template

```markdown
## TASK ASSIGNMENT -- Team Coordinate

### MANDATORY FIRST STEPS
1. Read shared discoveries: <session-folder>/discoveries.ndjson (if exists, skip if not)
2. Read project context: .workflow/project-tech.json (if exists)

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Role**: {role}
**Responsibility**: {responsibility_type}
**Output Type**: {output_type}

### Task Description
{description}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

1. **Read discoveries**: Load <session-folder>/discoveries.ndjson for shared exploration findings
2. **Use context**: Apply previous tasks' findings from prev_context above
3. **Execute task**:
   - Read target files referenced in description
   - Follow the execution steps outlined in the TASK section of description
   - Produce deliverables matching the EXPECTED section of description
   - Verify output matches success criteria
4. **Share discoveries**: Append exploration findings to shared board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> <session-folder>/discoveries.ndjson
   ```
5. **Report result**: Return JSON via report_agent_job_result

### Discovery Types to Share
- `pattern_found`: {pattern_name, location, description} -- Design pattern identified in codebase
- `file_modified`: {file, change, lines_added} -- File change performed by this agent
- `dependency_found`: {from, to, type} -- Dependency relationship between components
- `issue_found`: {file, line, severity, description} -- Issue or bug discovered
- `decision_made`: {decision, rationale, impact} -- Design decision made during execution
- `artifact_produced`: {name, path, producer, type} -- Deliverable file created

---

## Output (report_agent_job_result)

Return JSON:
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "artifacts_produced": "semicolon-separated paths of produced files",
  "error": ""
}
```

---

## Role-Specific Customization

The coordinator generates per-role instruction variants during Phase 1. Each variant adds role-specific execution guidance to Step 3.

### For Research / Exploration Roles

Add to execution protocol step 3:
```
3. **Execute**:
   - Define exploration scope from description
   - Use code search tools to find relevant patterns and implementations
   - Survey approaches, compare alternatives
   - Document findings with file:line references
   - Write research artifact to <session-folder>/artifacts/
```

### For Code Implementation Roles

Add to execution protocol step 3:
```
3. **Execute**:
   - Read upstream design/spec artifacts referenced in description
   - Read target files listed in description
   - Apply code changes following project conventions
   - Validate changes compile/lint correctly
   - Run relevant tests if available
   - Write implementation summary to <session-folder>/artifacts/
```

### For Analysis / Audit Roles

Add to execution protocol step 3:
```
3. **Execute**:
   - Read target files/modules for analysis
   - Apply analysis criteria systematically
   - Classify findings by severity (critical, high, medium, low)
   - Include file:line references in findings
   - Write analysis report to <session-folder>/artifacts/
```

### For Test / Validation Roles

Add to execution protocol step 3:
```
3. **Execute**:
   - Read source files to understand implementation
   - Identify test cases from description
   - Generate test files following project test conventions
   - Run tests and capture results
   - Write test report to <session-folder>/artifacts/
```

### For Documentation / Writing Roles

Add to execution protocol step 3:
```
3. **Execute**:
   - Read source code and existing documentation
   - Generate documentation following template in description
   - Ensure accuracy against current implementation
   - Include code examples where appropriate
   - Write document to <session-folder>/artifacts/
```

### For Design / Architecture Roles

Add to execution protocol step 3:
```
3. **Execute**:
   - Read upstream research findings
   - Analyze existing codebase structure
   - Design component interactions and data flow
   - Document architecture decisions with rationale
   - Write design document to <session-folder>/artifacts/
```

---

## Quality Requirements

All agents must verify before reporting complete:

| Requirement | Criteria |
|-------------|----------|
| Files produced | Verify all claimed artifacts exist via Read |
| Files modified | Verify content actually changed |
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
| `{responsibility_type}` | spawn_agents_on_csv | Runtime from CSV row |
| `{output_type}` | spawn_agents_on_csv | Runtime from CSV row |
| `{prev_context}` | spawn_agents_on_csv | Runtime from CSV row |
