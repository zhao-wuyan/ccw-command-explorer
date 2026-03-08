# Team PlanEx — Tasks Schema

## Task Metadata Registry

Team PlanEx uses a **message bus + state file** architecture instead of CSV. Tasks are tracked in `.msg/meta.json` with state updates via `team_msg`.

### Task State Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `task_id` | string | Unique task identifier | `"PLAN-001"` |
| `issue_id` | string | Source issue identifier | `"ISS-20260308-001"` |
| `title` | string | Task title from solution | `"Implement OAuth2 provider"` |
| `role` | enum | Worker role: `planner`, `executor` | `"executor"` |
| `status` | enum | Task status: `pending`, `in_progress`, `completed`, `failed` | `"completed"` |
| `assigned_to` | string | Worker agent name | `"executor"` |
| `depends_on` | array | Dependency task IDs | `["PLAN-001"]` |
| `files` | array | Files to modify | `["src/auth/oauth.ts"]` |
| `convergence_criteria` | array | Success criteria | `["Tests pass", "No lint errors"]` |
| `started_at` | string | ISO timestamp | `"2026-03-08T10:00:00+08:00"` |
| `completed_at` | string | ISO timestamp | `"2026-03-08T10:15:00+08:00"` |
| `error` | string | Error message if failed | `""` |

---

## Message Bus Schema

### Message Types

| Type | From | To | Data Schema | Description |
|------|------|----|-----------|----|
| `plan_ready` | planner | coordinator | `{issue_id, solution_path, task_count}` | Planning complete |
| `impl_start` | executor | coordinator | `{task_id, issue_id}` | Implementation started |
| `impl_complete` | executor | coordinator | `{task_id, issue_id, files_modified[], commit_hash}` | Implementation complete |
| `impl_progress` | executor | coordinator | `{task_id, progress_pct, current_step}` | Progress update |
| `error` | any | coordinator | `{task_id, error_type, message}` | Error occurred |
| `state_update` | any | coordinator | `{role, state: {}}` | Role state update (auto-synced to meta.json) |

### Message Format (NDJSON)

```jsonl
{"id":"MSG-001","ts":"2026-03-08T10:00:00+08:00","from":"planner","to":"coordinator","type":"plan_ready","summary":"Planning complete for ISS-001","data":{"issue_id":"ISS-20260308-001","solution_path":"artifacts/solutions/ISS-20260308-001.json","task_count":3}}
{"id":"MSG-002","ts":"2026-03-08T10:05:00+08:00","from":"executor","to":"coordinator","type":"impl_start","summary":"Starting EXEC-001","data":{"task_id":"EXEC-001","issue_id":"ISS-20260308-001"}}
{"id":"MSG-003","ts":"2026-03-08T10:15:00+08:00","from":"executor","to":"coordinator","type":"impl_complete","summary":"Completed EXEC-001","data":{"task_id":"EXEC-001","issue_id":"ISS-20260308-001","files_modified":["src/auth/oauth.ts"],"commit_hash":"abc123"}}
```

---

## State File Schema (meta.json)

### Structure

```json
{
  "session_id": "PEX-auth-system-20260308",
  "pipeline_mode": "plan-execute",
  "execution_method": "codex",
  "status": "running",
  "started_at": "2026-03-08T10:00:00+08:00",
  "issues": {
    "ISS-20260308-001": {
      "status": "completed",
      "solution_path": "artifacts/solutions/ISS-20260308-001.json",
      "tasks": ["EXEC-001", "EXEC-002"],
      "completed_at": "2026-03-08T10:30:00+08:00"
    }
  },
  "tasks": {
    "EXEC-001": {
      "task_id": "EXEC-001",
      "issue_id": "ISS-20260308-001",
      "title": "Implement OAuth2 provider",
      "role": "executor",
      "status": "completed",
      "assigned_to": "executor",
      "depends_on": [],
      "files": ["src/auth/oauth.ts"],
      "convergence_criteria": ["Tests pass", "No lint errors"],
      "started_at": "2026-03-08T10:05:00+08:00",
      "completed_at": "2026-03-08T10:15:00+08:00",
      "error": ""
    }
  },
  "roles": {
    "coordinator": {
      "status": "active",
      "current_phase": "execution",
      "last_update": "2026-03-08T10:15:00+08:00"
    },
    "planner": {
      "status": "idle",
      "issues_planned": 5,
      "last_update": "2026-03-08T10:10:00+08:00"
    },
    "executor": {
      "status": "active",
      "current_task": "EXEC-002",
      "tasks_completed": 1,
      "last_update": "2026-03-08T10:15:00+08:00"
    }
  }
}
```

---

## Solution File Schema

Planner generates solution files in `artifacts/solutions/<issue-id>.json`:

```json
{
  "issue_id": "ISS-20260308-001",
  "title": "Implement OAuth2 authentication",
  "approach": "Strategy pattern with provider abstraction",
  "complexity": "Medium",
  "tasks": [
    {
      "task_id": "EXEC-001",
      "title": "Create OAuth2 provider interface",
      "description": "Define provider interface with authorize/token/refresh methods",
      "files": ["src/auth/providers/oauth-provider.ts"],
      "depends_on": [],
      "convergence_criteria": [
        "Interface compiles without errors",
        "Type definitions exported"
      ]
    },
    {
      "task_id": "EXEC-002",
      "title": "Implement Google OAuth2 provider",
      "description": "Concrete implementation for Google OAuth2",
      "files": ["src/auth/providers/google-oauth.ts"],
      "depends_on": ["EXEC-001"],
      "convergence_criteria": [
        "Tests pass",
        "Handles token refresh",
        "Error handling complete"
      ]
    }
  ],
  "exploration_findings": {
    "existing_patterns": ["Strategy pattern in payment module"],
    "tech_stack": ["TypeScript", "Express", "Passport.js"],
    "integration_points": ["User service", "Session store"]
  }
}
```

---

## Execution Method Selection

Coordinator selects execution method based on issue complexity:

| Complexity | Method | Criteria |
|------------|--------|----------|
| Low | `gemini` | 1-2 files, simple logic, no architecture changes |
| Medium | `codex` | 3-5 files, moderate complexity, existing patterns |
| High | `codex` | 6+ files, complex logic, architecture changes |

Stored in `meta.json` → `execution_method` field.

---

## Validation Rules

| Rule | Check | Error |
|------|-------|-------|
| Unique task IDs | No duplicate `task_id` in meta.json | "Duplicate task ID: {task_id}" |
| Valid deps | All `depends_on` task IDs exist | "Unknown dependency: {dep_id}" |
| No self-deps | Task cannot depend on itself | "Self-dependency: {task_id}" |
| No circular deps | Dependency graph is acyclic | "Circular dependency detected" |
| Valid status | status ∈ {pending, in_progress, completed, failed} | "Invalid status: {status}" |
| Valid role | role ∈ {planner, executor} | "Invalid role: {role}" |
| Issue exists | issue_id exists in issues registry | "Unknown issue: {issue_id}" |
| Solution file exists | solution_path points to valid file | "Solution file not found: {path}" |

---

## Cross-Role Context Flow

| Source | Target | Mechanism |
|--------|--------|-----------|
| Planner solution | Executor | Read solution JSON from artifacts/solutions/ |
| Executor progress | Coordinator | Message bus (impl_progress, impl_complete) |
| Coordinator state | All workers | Read meta.json state field |
| Any role state update | meta.json | Auto-sync via team_msg type="state_update" |

---

## Discovery Types

Team PlanEx does not use discoveries.ndjson. All context is stored in:
- Solution files (planner output)
- Message bus (real-time communication)
- meta.json (persistent state)
- wisdom/ directory (cross-task knowledge)
