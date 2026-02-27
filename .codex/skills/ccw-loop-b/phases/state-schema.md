# State Schema (CCW Loop-B)

## Master State Structure

```json
{
  "loop_id": "loop-b-20260122-abc123",
  "title": "Implement user authentication",
  "description": "Full task description here",
  "mode": "interactive | auto | parallel",
  "status": "running | paused | completed | failed",
  "current_iteration": 3,
  "max_iterations": 10,
  "created_at": "2026-01-22T10:00:00.000Z",
  "updated_at": "2026-01-22T10:30:00.000Z",

  "skill_state": {
    "phase": "develop | debug | validate | complete",
    "action_index": 2,
    "workers_completed": ["init", "develop"],
    "parallel_results": null,
    "pending_tasks": [],
    "completed_tasks": [],
    "findings": []
  }
}
```

## Field Descriptions

### Core Fields (API Compatible)

| Field | Type | Description |
|-------|------|-------------|
| `loop_id` | string | Unique identifier |
| `title` | string | Short title (max 100 chars) |
| `description` | string | Full task description |
| `mode` | enum | Execution mode |
| `status` | enum | Current status |
| `current_iteration` | number | Iteration counter |
| `max_iterations` | number | Safety limit |
| `created_at` | ISO string | Creation timestamp |
| `updated_at` | ISO string | Last update timestamp |

### Skill State Fields

| Field | Type | Description |
|-------|------|-------------|
| `phase` | enum | Current execution phase |
| `action_index` | number | Position in action sequence (auto mode) |
| `workers_completed` | array | List of completed worker actions |
| `parallel_results` | object | Merged results from parallel mode |
| `pending_tasks` | array | Tasks waiting to be executed |
| `completed_tasks` | array | Tasks already done |
| `findings` | array | Discoveries during execution |

## Worker Output Structure

Each worker writes to `.workflow/.loop/{loopId}.workers/{action}.output.json`:

```json
{
  "action": "develop",
  "status": "success",
  "summary": "Implemented 3 functions",
  "files_changed": ["src/auth.ts", "src/utils.ts"],
  "next_suggestion": "validate",
  "loop_back_to": null,
  "timestamp": "2026-01-22T10:15:00.000Z",
  "detailed_output": {
    "tasks_completed": [
      { "id": "T1", "description": "Create auth module" }
    ],
    "metrics": {
      "lines_added": 150,
      "lines_removed": 20
    }
  }
}
```

## Progress File Structure

Human-readable progress in `.workflow/.loop/{loopId}.progress/{action}.md`:

```markdown
# Develop Progress

## Session: loop-b-20260122-abc123

### Iteration 1 (2026-01-22 10:15)

**Task**: Implement auth module

**Changes**:
- Created `src/auth.ts` with login/logout functions
- Added JWT token handling in `src/utils.ts`

**Status**: Success

---

### Iteration 2 (2026-01-22 10:30)

...
```

## Status Transitions

```
          +--------+
          | init   |
          +--------+
               |
               v
+------> +---------+
|        | develop |
|        +---------+
|             |
|    +--------+--------+
|    |                 |
|    v                 v
| +-------+       +---------+
| | debug |<------| validate|
| +-------+       +---------+
|    |                 |
|    +--------+--------+
|             |
|             v
|       [needs fix?]
|        yes |  | no
|            v  v
+------------+  +----------+
               | complete  |
               +----------+
```

## Parallel Results Schema

When `mode === 'parallel'`:

```json
{
  "parallel_results": {
    "develop": {
      "status": "success",
      "summary": "...",
      "suggestions": []
    },
    "debug": {
      "status": "success",
      "issues_found": [],
      "suggestions": []
    },
    "validate": {
      "status": "success",
      "test_results": {},
      "coverage": {}
    },
    "merged_at": "2026-01-22T10:45:00.000Z"
  }
}
```

## Directory Structure

```
.workflow/.loop/
+-- loop-b-20260122-abc123.json          # Master state
+-- loop-b-20260122-abc123.workers/
|   +-- init.output.json
|   +-- develop.output.json
|   +-- debug.output.json
|   +-- validate.output.json
|   +-- complete.output.json
+-- loop-b-20260122-abc123.progress/
    +-- develop.md
    +-- debug.md
    +-- validate.md
    +-- summary.md
```
