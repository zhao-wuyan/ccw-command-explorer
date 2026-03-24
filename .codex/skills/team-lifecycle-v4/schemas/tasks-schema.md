# Tasks Schema — team-lifecycle-v4

> Base schema: `~/.ccw/workflows/cli-templates/schemas/team-tasks-schema.json`

This file documents lifecycle-v4 specific extensions to the universal team tasks schema.

## Session ID Format

`tlv4-<topic>-<YYYYMMDD>` (e.g., `tlv4-auth-system-20260324`)

## Valid Roles

Must match a directory in `.codex/skills/team-lifecycle-v4/roles/`:

| Role | Task Prefix | Description |
|------|-------------|-------------|
| analyst | RESEARCH | Domain research and analysis |
| writer | DRAFT | Document generation (product brief, requirements, etc.) |
| planner | PLAN | Architecture and planning |
| executor | IMPL | Code implementation |
| tester | TEST | Testing and validation |
| reviewer | REVIEW / QUALITY | Code and spec review |
| supervisor | CHECKPOINT | Quality gate verification |
| coordinator | (orchestrator) | Pipeline orchestration (not a task role) |

## Valid Pipeline Phases

From `specs/pipelines.md`:

| Phase | Wave | Description |
|-------|------|-------------|
| research | 1 | Domain exploration |
| product-brief | 2 | Vision and problem definition |
| requirements | 3 | Functional/non-functional requirements |
| architecture | 4 | System design |
| epics | 5 | Epic and story breakdown |
| readiness | 6 | Pre-implementation readiness check |
| checkpoint | varies | Supervision gates |
| planning | 7 | Detailed implementation planning |
| arch-detail | 8 | Architecture refinement |
| orchestration | 9 | Task orchestration |
| implementation | 10+ | Code writing |
| validation | varies | Testing |
| review | varies | Code/spec review |

## Valid Pipelines

| Pipeline | Description |
|----------|-------------|
| spec-only | Research → Brief → Requirements → Architecture → Epics → Readiness |
| impl-only | Planning → Implementation → Validation → Review |
| full-lifecycle | spec-only + impl-only combined |
| fe-only | Frontend-specific implementation |
| fullstack | Full-stack implementation |
| full-lifecycle-fe | Full lifecycle with frontend focus |

## Example

```json
{
  "session_id": "tlv4-auth-system-20260324",
  "skill": "team-lifecycle-v4",
  "pipeline": "full-lifecycle",
  "requirement": "Design and implement user authentication system with OAuth2 and RBAC",
  "created_at": "2026-03-24T10:00:00+08:00",
  "supervision": true,
  "completed_waves": [1],
  "active_agents": { "DRAFT-001": "agent-abc123" },
  "tasks": {
    "RESEARCH-001": {
      "title": "Domain research",
      "description": "Explore auth domain: OAuth2 flows, RBAC patterns, competitor analysis",
      "role": "analyst",
      "pipeline_phase": "research",
      "deps": [],
      "context_from": [],
      "wave": 1,
      "status": "completed",
      "findings": "Identified OAuth2+RBAC pattern, 5 integration points, SSO requirement",
      "quality_score": null,
      "supervision_verdict": null,
      "error": null
    },
    "DRAFT-001": {
      "title": "Product brief",
      "description": "Generate product brief from research context",
      "role": "writer",
      "pipeline_phase": "product-brief",
      "deps": ["RESEARCH-001"],
      "context_from": ["RESEARCH-001"],
      "wave": 2,
      "status": "in_progress",
      "findings": null,
      "quality_score": null,
      "supervision_verdict": null,
      "error": null
    }
  }
}
```
