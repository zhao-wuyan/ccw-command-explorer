# Parallel Dev Cycle Skill

Multi-agent parallel development cycle using Codex subagent pattern with continuous iteration support.

## Overview

This skill implements a **single-file-per-agent** development workflow:

- **RA**: `requirements.md` (all requirements + edge cases + history)
- **EP**: `exploration.md`, `architecture.md`, `plan.json` (codebase exploration + architecture + structured tasks)
- **CD**: `implementation.md` (progress + files + decisions + testing)
- **VAS**: `summary.md` (validation + test results + recommendations)

Each file is **completely rewritten** on each iteration, with old versions auto-archived to `history/`.

## Installation

Files are in `.codex/skills/parallel-dev-cycle/`:

```
.codex/skills/parallel-dev-cycle/
├── SKILL.md                        # Main skill definition
├── README.md                       # This file
├── phases/
│   ├── orchestrator.md             # Multi-agent coordination
│   ├── state-schema.md             # Unified state structure
│   └── agents/
│       ├── requirements-analyst.md # RA role
│       ├── exploration-planner.md  # EP role
│       ├── code-developer.md       # CD role
│       └── validation-archivist.md # VAS role
└── specs/
    ├── coordination-protocol.md    # Agent communication
    └── versioning-strategy.md      # Version management
```

## Quick Start

### Launch New Cycle

```bash
/parallel-dev-cycle TASK="Implement OAuth authentication"
```

Creates:
```
.workflow/.cycle/cycle-v1-20260122-abc123.progress/
├── ra/
│   ├── requirements.md (v1.0.0)
│   └── changes.log (NDJSON)
├── ep/
│   ├── exploration.md (v1.0.0)
│   ├── architecture.md (v1.0.0)
│   ├── plan.json (v1.0.0)
│   └── changes.log (NDJSON)
├── cd/
│   ├── implementation.md (v1.0.0)
│   └── changes.log (NDJSON)
└── vas/
    ├── summary.md (v1.0.0)
    └── changes.log (NDJSON)
```

### Continue With Extension (XX-1 Pattern)

User adds requirement: "Also support Google OAuth"

```bash
/parallel-dev-cycle --cycle-id=cycle-v1-20260122-abc123 --extend="Add Google OAuth"
```

Automatically:
1. Archives old `requirements.md (v1.0.0)` → `history/requirements-v1.0.0.md`
2. Rewrites `requirements.md (v1.1.0)` - complete file replacement
3. Appends change to `changes.log` (NDJSON audit trail)

### Next Iteration (XX-2)

```bash
/parallel-dev-cycle --cycle-id=cycle-v1-20260122-abc123 --extend="Add GitHub provider"
```

All files update to v1.2.0, previous versions archived.

## Execution Flow

### Phase 1: Parallel Agent Execution

```
Time  RA              EP              CD              VAS
────  ──              ──              ──              ──
0ms   [spawned]       [spawned]       [spawned]       [spawned]
      ↓               ↓               ↓               ↓
      Analyzing       Exploring       Reading plan    Waiting
      task            codebase        from EP...
                                      ↓
5min  Outputs req.    Outputs plan    Requirements
      v1.0.0 ✓        v1.0.0 ✓        unclear - BLOCKED

10min Clarifies req   Updates plan    ✓ Ready
      v1.0.1 ✓        v1.0.1 ✓        Implementing...
                                      ↓
15min ✓ Complete      ✓ Complete      ✓ Code done      [waiting for CD]

20min                                                 [starts tests]
                                                      ↓
25min                                                 Outputs summary
                                                      v1.0.0 ✓
```

### Phase 2: Version Transition

When iteration completes, next extends to v1.1.0:

```
Current State (v1.0.0)
├── requirements.md (v1.0.0)
├── plan.json (v1.0.0)
├── implementation.md (v1.0.0)
└── summary.md (v1.0.0)

User: "Add GitHub provider"
         ↓
Archive Old                    Write New
├── history/requirements-v1.0.0.md  → requirements.md (v1.1.0) - REWRITTEN
├── history/plan-v1.0.0.json        → plan.json (v1.1.0) - REWRITTEN
├── history/impl-v1.0.0.md          → implementation.md (v1.1.0) - REWRITTEN
└── history/summary-v1.0.0.md       → summary.md (v1.1.0) - REWRITTEN
                                       ↓
                                 Append to changes.log (NDJSON)
```

## Session Files

```
.workflow/.cycle/{cycleId}.progress/

ra/ - Requirements Analyst
├── requirements.md           # v1.2.0 (current, complete rewrite)
├── changes.log              # NDJSON audit trail
└── history/
    ├── requirements-v1.0.0.md
    └── requirements-v1.1.0.md

ep/ - Exploration & Planning
├── exploration.md           # v1.2.0 (codebase exploration)
├── architecture.md          # v1.2.0 (architecture design)
├── plan.json                # v1.2.0 (structured task list, current)
├── changes.log              # NDJSON audit trail
└── history/
    ├── plan-v1.0.0.json
    └── plan-v1.1.0.json

cd/ - Code Developer
├── implementation.md        # v1.2.0 (current)
├── changes.log              # NDJSON audit trail
└── history/
    ├── implementation-v1.0.0.md
    └── implementation-v1.1.0.md

vas/ - Validation & Archival
├── summary.md               # v1.2.0 (current)
├── changes.log              # NDJSON audit trail
└── history/
    ├── summary-v1.0.0.md
    └── summary-v1.1.0.md
```

## Versioning Strategy

### Semantic Versioning

- **1.0.0**: Initial cycle
- **1.1.0**: User extends with new requirement
- **1.2.0**: Another iteration with more requirements

### What Gets Versioned

✅ **Main Document File**
- Completely rewritten each iteration
- Auto-archived to `history/`
- No inline version history (stays clean)

✅ **Changes.log (NDJSON)**
- Append-only (never deleted)
- Complete audit trail of all changes
- Used to trace requirement origins

✅ **Historical Snapshots**
- Auto-created in `history/` directory
- Keep last N versions (default: 5)
- For reference when needed

### Key Principle

> **主文档简洁清晰** ← Agent 只关注当前版本
>
> **完整历史记录** ← Changes.log 保留每个变更
>
> **版本快照归档** ← History/ 备份旧版本

## File Maintenance

### Each Agent

| Agent | File | Contains | Size |
|-------|------|----------|------|
| **RA** | requirements.md | All FR, NFR, edge cases, history summary | ~2-5KB |
| **EP** | exploration.md + architecture.md + plan.json | Codebase exploration, architecture design, structured task list | ~5-10KB total |
| **CD** | implementation.md | Completed tasks, files changed, decisions, tests | ~4-10KB |
| **VAS** | summary.md | Test results, coverage, issues, recommendations | ~5-12KB |

### Changes.log (Shared)

NDJSON format - one line per change:

```jsonl
{"timestamp":"2026-01-22T10:00:00+08:00","version":"1.0.0","agent":"ra","action":"create","change":"Initial requirements","iteration":1}
{"timestamp":"2026-01-22T11:00:00+08:00","version":"1.1.0","agent":"ra","action":"update","change":"Added Google OAuth","iteration":2}
{"timestamp":"2026-01-22T12:00:00+08:00","version":"1.2.0","agent":"ra","action":"update","change":"Added GitHub, MFA","iteration":3}
```

## Accessing History

### Current Version

```bash
# View latest requirements
cat .workflow/.cycle/cycle-xxx.progress/ra/requirements.md

# Quick check - version is in header
head -5 requirements.md  # "# Requirements Specification - v1.2.0"
```

### Version History

```bash
# View previous version
cat .workflow/.cycle/cycle-xxx.progress/ra/history/requirements-v1.1.0.md

# Audit trail - all changes
cat .workflow/.cycle/cycle-xxx.progress/ra/changes.log | jq .

# Changes in specific iteration
cat changes.log | jq 'select(.iteration==2)'

# Trace requirement history
cat changes.log | jq 'select(.change | contains("OAuth"))'
```

## Codex Pattern Implementation

### Multi-Agent Parallel

```javascript
// Create 4 agents in parallel
const agents = {
  ra: spawn_agent({ message: raRoleAndTask }),
  ep: spawn_agent({ message: epRoleAndTask }),
  cd: spawn_agent({ message: cdRoleAndTask }),
  vas: spawn_agent({ message: vasRoleAndTask })
}

// Wait for all 4 in parallel
const results = wait({ ids: [agents.ra, agents.ep, agents.cd, agents.vas] })
```

### Role Path Passing

Each agent reads its own role definition:

```javascript
spawn_agent({
  message: `
## MANDATORY FIRST STEPS
1. Read role: ~/.codex/agents/requirements-analyst.md
2. Read: .workflow/project-tech.json
3. Read: .workflow/project-guidelines.json

## TASK
${taskDescription}
`
})
```

### Deep Interaction

Use `send_input` for iteration refinement:

```javascript
// First output
const initial = wait({ ids: [agent] })

// User feedback
send_input({
  id: agent,
  message: `
## Feedback

${feedback}

## Next Steps
Update ${filename} based on feedback. Increment version.
Output PHASE_RESULT when complete.
`
})

// Updated output
const revised = wait({ ids: [agent] })

// Only close when done
close_agent({ id: agent })
```

## Error Handling

| Situation | Recovery |
|-----------|----------|
| Agent timeout | send_input requesting convergence or retry |
| State corrupted | Rebuild from changes.log NDJSON |
| Version mismatch | Agent checks version in state before reading |
| Blocked dependency | Orchestrator sends updated file path |

## Best Practices

1. **Let agents rewrite** - Don't maintain incremental history in main doc
2. **Trust changes.log** - NDJSON is the source of truth for history
3. **Archive on version bump** - Automatic, no manual versioning needed
4. **Keep files focused** - Each file should be readable in 5 minutes
5. **Version header always present** - Makes version obvious at a glance

## Integration

This skill works standalone or integrated with:
- Dashboard Loop Monitor (API triggers)
- CCW workflow system
- Custom orchestration

### API Trigger

```bash
POST /api/cycles/start
{
  "task": "Implement OAuth",
  "mode": "auto"
}
→ Returns cycle_id

GET /api/cycles/{cycle_id}/status
→ Returns agents status and progress
```

## Architecture Diagram

```
User Task
    ↓
Orchestrator (main coordinator)
    ├─→ spawn_agent(RA)
    ├─→ spawn_agent(EP)
    ├─→ spawn_agent(CD)
    └─→ spawn_agent(VAS)
           ↓
        wait({ ids: [all 4] })
           ↓
      All write to:
      - requirements.md (v1.x.0)
      - exploration.md, architecture.md, plan.json (v1.x.0)
      - implementation.md (v1.x.0)
      - summary.md (v1.x.0)
      - changes.log (NDJSON append)
           ↓
      [Automatic archival]
      - history/requirements-v1.{x-1}.0.md
      - history/plan-v1.{x-1}.0.json
      - etc...
           ↓
      Orchestrator: Next iteration?
      - Yes: send_input with feedback
      - No: close_agent, report summary
```

## License

MIT
