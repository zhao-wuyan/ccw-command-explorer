# Phase 2: Scaffold Generation

Generate the SKILL.md universal router and create the directory structure for the team skill.

## Objective

- Create directory structure (roles/, specs/, templates/)
- Generate SKILL.md as universal router following v4 pattern
- SKILL.md must NOT contain beat model, pipeline details, or role Phase 2-4 logic

## Step 2.1: Create Directory Structure

```bash
skillDir=".claude/skills/${teamConfig.skillName}"
mkdir -p "${skillDir}"

# Create role directories
for role in teamConfig.roles:
  mkdir -p "${skillDir}/roles/${role.name}"
  if role.hasCommands:
    mkdir -p "${skillDir}/roles/${role.name}/commands"

# Create specs directory
mkdir -p "${skillDir}/specs"

# Create templates directory (if needed)
if teamConfig.templates.length > 0:
  mkdir -p "${skillDir}/templates"
```

## Step 2.2: Generate SKILL.md

The SKILL.md follows a strict template. Every generated SKILL.md contains these sections in order:

### Section 1: Frontmatter

```yaml
---
name: ${teamConfig.skillName}
description: "${teamConfig.domain}. Triggers on ${teamConfig.skillName}."
allowed-tools: spawn_agent(*), wait_agent(*), report_agent_job_result(*), request_user_input(*), Read(*), Write(*), Edit(*), Bash(*), Glob(*), Grep(*)
---
```

### Section 2: Title + Architecture Diagram

```markdown
# ${Title}

${One-line description}

## Architecture

\```
Skill(skill="${teamConfig.skillName}", args="task description")
                    |
         SKILL.md (this file) = Router
                    |
     +--------------+--------------+
     |                             |
  no --role flag              --role <name>
     |                             |
  Coordinator                  Worker
  roles/coordinator/role.md    roles/<name>/role.md
     |
     +-- analyze → dispatch → spawn workers → STOP
                                    |
                    +-------+-------+-------+
                    v       v       v       v
                 [team-worker agents, each loads roles/<role>/role.md]
\```
```

### Section 3: Role Registry

```markdown
## Role Registry

| Role | Path | Prefix | Inner Loop |
|------|------|--------|------------|
| coordinator | roles/coordinator/role.md | — | — |
${teamConfig.roles.filter(r => r.name !== 'coordinator').map(r =>
  `| ${r.name} | ${r.path} | ${r.prefix}-* | ${r.inner_loop} |`
).join('\n')}
```

### Section 4: Role Router

```markdown
## Role Router

Parse `$ARGUMENTS`:
- Has `--role <name>` → Read `roles/<name>/role.md`, execute Phase 2-4
- No `--role` → Read `roles/coordinator/role.md`, execute entry router
```

### Section 5: Shared Constants

```markdown
## Shared Constants

- **Session prefix**: `${teamConfig.sessionPrefix}`
- **Session path**: `.workflow/.team/${teamConfig.sessionPrefix}-<slug>-<date>/`
- **CLI tools**: `ccw cli --mode analysis` (read-only), `ccw cli --mode write` (modifications)
- **Message bus**: `mcp__ccw-tools__team_msg(session_id=<session-id>, ...)`
```

### Section 6: Worker Spawn Template

```markdown
## Worker Spawn Template

Coordinator spawns workers using this template:

\```
spawn_agent({
  agent_type: "team_worker",
  items: [{
    description: "Spawn <role> worker",
    team_name: <team-name>,
    name: "<role>",
    prompt: `## Role Assignment
role: <role>
role_spec: .codex/skills/${teamConfig.skillName}/roles/<role>/role.md
session: <session-folder>
session_id: <session-id>
team_name: <team-name>
requirement: <task-description>
inner_loop: <true|false>

Read role_spec file to load Phase 2-4 domain instructions.
Execute built-in Phase 1 (task discovery) -> role Phase 2-4 -> built-in Phase 5 (report).`
  }]
})
\```
```

### Section 7: User Commands

```markdown
## User Commands

| Command | Action |
|---------|--------|
| `check` / `status` | View execution status graph |
| `resume` / `continue` | Advance to next step |
| `revise <TASK-ID> [feedback]` | Revise specific task |
| `feedback <text>` | Inject feedback for revision |
| `recheck` | Re-run quality check |
| `improve [dimension]` | Auto-improve weakest dimension |
```

### Section 8: Completion Action

```markdown
## Completion Action

When pipeline completes, coordinator presents:

\```
request_user_input({
  prompt: "Pipeline complete. What would you like to do?\n\nOptions:\n1. Archive & Clean (Recommended) - Archive session, clean up team\n2. Keep Active - Keep session for follow-up work\n3. Export Results - Export deliverables to target directory"
})
\```
```

### Section 9: Specs Reference

```markdown
## Specs Reference

${teamConfig.specs.map(s =>
  `- [specs/${s}.md](specs/${s}.md) — ${specDescription(s)}`
).join('\n')}
```

### Section 10: Session Directory

```markdown
## Session Directory

\```
.workflow/.team/${teamConfig.sessionPrefix}-<slug>-<date>/
├── team-session.json           # Session state + role registry
├── spec/                       # Spec phase outputs
├── plan/                       # Implementation plan + TASK-*.json
├── artifacts/                  # All deliverables
├── wisdom/                     # Cross-task knowledge
├── explorations/               # Shared explore cache
├── discussions/                # Discuss round records
└── .msg/                       # Team message bus
\```
```

### Section 11: Error Handling

```markdown
## Error Handling

| Scenario | Resolution |
|----------|------------|
| Unknown command | Error with available command list |
| Role not found | Error with role registry |
| CLI tool fails | Worker fallback to direct implementation |
| Fast-advance conflict | Coordinator reconciles on next callback |
| Completion action fails | Default to Keep Active |
```

## Step 2.3: Assemble and Write

Assemble all sections into a single SKILL.md file and write to `${skillDir}/SKILL.md`.

**Quality Rules**:
1. SKILL.md must NOT contain beat model (ONE_STEP_PER_INVOCATION, spawn-and-stop)
2. SKILL.md must NOT contain pipeline task details (task IDs, dependencies)
3. SKILL.md must NOT contain role Phase 2-4 logic
4. SKILL.md MUST contain role registry table with correct paths
5. SKILL.md MUST contain worker spawn template with correct `role_spec` paths

## Output

- **File**: `.claude/skills/${teamConfig.skillName}/SKILL.md`
- **Variable**: `skillDir` (path to skill root directory)
- **Next**: Phase 3 - Content Generation

## Next Phase

Return to orchestrator, then auto-continue to [Phase 3: Content Generation](03-content-generation.md).
