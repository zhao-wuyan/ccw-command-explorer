# Session Schema

Required session structure for team-executor. All components MUST exist for valid execution.

## Directory Structure

```
<session-folder>/
+-- team-session.json           # Session state + dynamic role registry (REQUIRED)
+-- task-analysis.json          # Task analysis output: capabilities, dependency graph (REQUIRED)
+-- roles/                      # Dynamic role definitions (REQUIRED, >= 1 .md file)
|   +-- <role-1>.md
|   +-- <role-2>.md
+-- artifacts/                  # All MD deliverables from workers
|   +-- <artifact>.md
+-- shared-memory.json          # Cross-role state store
+-- wisdom/                     # Cross-task knowledge
|   +-- learnings.md
|   +-- decisions.md
|   +-- issues.md
+-- explorations/               # Shared explore cache
|   +-- cache-index.json
|   +-- explore-<angle>.json
+-- discussions/                # Inline discuss records
|   +-- <round>.md
+-- .msg/                       # Team message bus logs
```

## Validation Checklist

team-executor validates the following before execution:

### Required Components

| Component | Validation | Error Message |
|-----------|------------|---------------|
| `--session` argument | Must be provided | "Session required. Usage: --session=<path-to-TC-folder>" |
| Directory | Must exist at path | "Session directory not found: <path>" |
| `team-session.json` | Must exist, parse as JSON, and contain all required fields | "Invalid session: team-session.json missing, corrupt, or missing required fields" |
| `task-analysis.json` | Must exist, parse as JSON, and contain all required fields | "Invalid session: task-analysis.json missing, corrupt, or missing required fields" |
| `roles/` directory | Must exist and contain >= 1 .md file | "Invalid session: no role files in roles/" |
| Role file mapping | Each role in team-session.json#roles must have .md file | "Role file not found: roles/<role>.md" |
| Role file structure | Each role .md must contain required headers | "Invalid role file: roles/<role>.md missing required section: <section>" |

### Validation Algorithm

```
1. Parse --session=<path> from arguments
   +- Not provided -> ERROR: "Session required. Usage: --session=<path-to-TC-folder>"

2. Check directory exists
   +- Not exists -> ERROR: "Session directory not found: <path>"

3. Check team-session.json
   +- Not exists -> ERROR: "Invalid session: team-session.json missing"
   +- Parse error -> ERROR: "Invalid session: team-session.json corrupt"
   +- Validate required fields:
       +- session_id (string) -> missing/invalid -> ERROR: "team-session.json missing required field: session_id"
       +- task_description (string) -> missing -> ERROR: "team-session.json missing required field: task_description"
       +- status (string: active|paused|completed) -> missing/invalid -> ERROR: "team-session.json has invalid status"
       +- team_name (string) -> missing -> ERROR: "team-session.json missing required field: team_name"
       +- roles (array) -> missing/empty -> ERROR: "team-session.json missing or empty roles array"

4. Check task-analysis.json
   +- Not exists -> ERROR: "Invalid session: task-analysis.json missing"
   +- Parse error -> ERROR: "Invalid session: task-analysis.json corrupt"
   +- Validate required fields:
       +- capabilities (array) -> missing -> ERROR: "task-analysis.json missing required field: capabilities"
       +- dependency_graph (object) -> missing -> ERROR: "task-analysis.json missing required field: dependency_graph"
       +- roles (array) -> missing/empty -> ERROR: "task-analysis.json missing or empty roles array"
       +- tasks (array) -> missing/empty -> ERROR: "task-analysis.json missing or empty tasks array"

5. Check roles/ directory
   +- Not exists -> ERROR: "Invalid session: roles/ directory missing"
   +- No .md files -> ERROR: "Invalid session: no role files in roles/"

6. Check role file mapping and structure
   +- For each role in team-session.json#roles:
       +- Check roles/<role.name>.md exists
           +- Not exists -> ERROR: "Role file not found: roles/<role.name>.md"
       +- Validate role file structure (see Role File Structure Validation):
           +- Check for required headers: "# Role:", "## Identity", "## Boundaries", "## Execution"
           +- Missing header -> ERROR: "Invalid role file: roles/<role.name>.md missing required section: <section>"

7. All checks pass -> proceed to Phase 0
```

---

## team-session.json Schema

```json
{
  "session_id": "TC-<slug>-<date>",
  "task_description": "<original user input>",
  "status": "active | paused | completed",
  "team_name": "<team-name>",
  "roles": [
    {
      "name": "<role-name>",
      "prefix": "<PREFIX>",
      "responsibility_type": "<type>",
      "inner_loop": false,
      "role_file": "roles/<role-name>.md"
    }
  ],
  "pipeline": {
    "dependency_graph": {},
    "tasks_total": 0,
    "tasks_completed": 0
  },
  "active_workers": [],
  "completed_tasks": [],
  "created_at": "<timestamp>"
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `session_id` | string | Unique session identifier (e.g., "TC-auth-feature-2026-02-27") |
| `task_description` | string | Original task description from user |
| `status` | string | One of: "active", "paused", "completed" |
| `team_name` | string | Team name for Task tool |
| `roles` | array | List of role definitions |
| `roles[].name` | string | Role name (must match .md filename) |
| `roles[].prefix` | string | Task prefix for this role (e.g., "SPEC", "IMPL") |
| `roles[].role_file` | string | Relative path to role file |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `pipeline` | object | Pipeline metadata |
| `active_workers` | array | Currently running workers |
| `completed_tasks` | array | List of completed task IDs |
| `created_at` | string | ISO timestamp |

---

## task-analysis.json Schema

```json
{
  "capabilities": [
    {
      "name": "<capability-name>",
      "description": "<description>",
      "artifact_type": "<type>"
    }
  ],
  "dependency_graph": {
    "<task-id>": {
      "depends_on": ["<dependency-task-id>"],
      "role": "<role-name>"
    }
  },
  "roles": [
    {
      "name": "<role-name>",
      "prefix": "<PREFIX>",
      "responsibility_type": "<type>",
      "inner_loop": false
    }
  ],
  "tasks": [
    {
      "id": "<task-id>",
      "subject": "<task-subject>",
      "owner": "<role-name>",
      "blockedBy": ["<dependency-task-id>"]
    }
  ],
  "complexity_score": 0
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `capabilities` | array | Detected capabilities |
| `dependency_graph` | object | Task dependency DAG |
| `roles` | array | Role definitions |
| `tasks` | array | Task definitions |

---

## Role File Schema

Each role file in `roles/<role-name>.md` must follow the structure defined in `team-coordinate/specs/role-template.md`.

### Minimum Required Sections

| Section | Description |
|---------|-------------|
| `# Role: <name>` | Header with role name |
| `## Identity` | Name, tag, prefix, responsibility |
| `## Boundaries` | MUST and MUST NOT rules |
| `## Execution (5-Phase)` | Phase 1-5 workflow |

### Role File Structure Validation

Role files MUST be validated for structure before execution. This catches malformed role files early and provides actionable error messages.

**Required Sections** (must be present in order):

| Section | Pattern | Purpose |
|---------|---------|---------|
| Role Header | `# Role: <name>` | Identifies the role definition |
| Identity | `## Identity` | Defines name, tag, prefix, responsibility |
| Boundaries | `## Boundaries` | Defines MUST and MUST NOT rules |
| Execution | `## Execution` | Defines the 5-Phase workflow |

**Validation Algorithm**:

```
For each role file in roles/<role>.md:
  1. Read file content
  2. Check for "# Role:" header
     +- Not found -> ERROR: "Invalid role file: roles/<role>.md missing role header"
  3. Check for "## Identity" section
     +- Not found -> ERROR: "Invalid role file: roles/<role>.md missing required section: Identity"
  4. Check for "## Boundaries" section
     +- Not found -> ERROR: "Invalid role file: roles/<role>.md missing required section: Boundaries"
  5. Check for "## Execution" section (or "## Execution (5-Phase)")
     +- Not found -> ERROR: "Invalid role file: roles/<role>.md missing required section: Execution"
  6. All checks pass -> role file valid
```

**Benefits**:
- Early detection of malformed role files
- Clear error messages for debugging
- Prevents runtime failures during worker execution

---

## Example Valid Session

```
.workflow/.team/TC-auth-feature-2026-02-27/
+-- team-session.json           # Valid JSON with session metadata
+-- task-analysis.json          # Valid JSON with dependency graph
+-- roles/
|   +-- spec-writer.md          # Role file for SPEC-* tasks
|   +-- implementer.md          # Role file for IMPL-* tasks
|   +-- tester.md               # Role file for TEST-* tasks
+-- artifacts/                  # (may be empty)
+-- shared-memory.json          # Valid JSON (may be {})
+-- wisdom/
|   +-- learnings.md
|   +-- decisions.md
|   +-- issues.md
+-- explorations/
|   +-- cache-index.json
+-- discussions/                # (may be empty)
+-- .msg/                       # (may be empty)
```

---

## Recovery from Invalid Sessions

If session validation fails:

1. **Missing team-session.json**: Re-run team-coordinate with original task
2. **Missing task-analysis.json**: Re-run team-coordinate with --resume
3. **Missing role files**: Re-run team-coordinate with --resume
4. **Corrupt JSON**: Manual inspection or re-run team-coordinate

**team-executor cannot fix invalid sessions** -- it can only report errors and suggest recovery steps.
