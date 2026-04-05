# Phase 1: Session Discovery

Create or discover workflow session and initialize planning notes document.

## Objective

- Create a new workflow session via `/workflow:session:start`
- Extract session ID for subsequent phases
- Initialize planning-notes.md with user intent and N+1 context structure

## Execution

### Step 1.1: Execute Session Start

```javascript
Skill(skill="workflow:session:start", args="--auto \"[structured-task-description]\"")
```

**Task Description Structure**:
```
GOAL: [Clear, concise objective]
SCOPE: [What's included/excluded]
CONTEXT: [Relevant background or constraints]
```

**Example**:
```
GOAL: Build JWT-based authentication system
SCOPE: User registration, login, token validation
CONTEXT: Existing user database schema, REST API endpoints
```

### Step 1.2: Parse Output

- Extract: `SESSION_ID: WFS-[id]` (store as `sessionId`)

**Validation**:
- Session ID successfully extracted
- Session directory `.workflow/active/[sessionId]/` exists

**Note**: Session directory contains `workflow-session.json` (metadata). Do NOT look for `manifest.json` here - it only exists in `.workflow/archives/` for archived sessions.

### Step 1.2.5: Session Integrity Check

For reused sessions (not newly created), validate key artifact completeness:

1. **Baseline**: `workflow-session.json` exists and is valid JSON; `.process/` and `.task/` directories exist (create if missing)
2. **Brainstorm inheritance**: If `.brainstorming/` directory exists, check:
   - `guidance-specification.md` exists → missing = WARN brainstorm Phase 2 incomplete
   - `*/analysis.md` count → 0 = WARN brainstorm Phase 3 incomplete
   - `feature-specs/` or `feature-index.json` → missing = WARN brainstorm Phase 4 (synthesis) incomplete
3. **Existing notes detection**: Store `existingNotes = file_exists(planning-notes.md)`

Store results in `sessionIntegrity` variable for downstream phases. Warnings are logged but **do not block** execution.

**TodoWrite**: Mark phase 1 completed, phase 2 in_progress

### Step 1.3: Initialize Planning Notes (Conditional)

After Phase 1, initialize planning-notes.md with user intent.

**Conditional logic**:
- If `existingNotes = true`: Only append `## User Intent (Phase 1)` section when missing from the file; do NOT overwrite existing content
- If `existingNotes = false`: Create new file using template below

```javascript
// Create planning notes document with N+1 context support
const planningNotesPath = `.workflow/active/${sessionId}/planning-notes.md`
const userGoal = structuredDescription.goal
const userConstraints = structuredDescription.context || "None specified"

Write(planningNotesPath, `# Planning Notes

**Session**: ${sessionId}
**Created**: ${new Date().toISOString()}

## User Intent (Phase 1)

- **GOAL**: ${userGoal}
- **KEY_CONSTRAINTS**: ${userConstraints}

---

## Context Findings (Phase 2)
(To be filled by context-gather)

## Conflict Decisions (Phase 3)
(To be filled if conflicts detected)

## Consolidated Constraints (Phase 4 Input)
1. ${userConstraints}

---

## Task Generation (Phase 4)
(To be filled by action-planning-agent)

## N+1 Context
### Decisions
| Decision | Rationale | Revisit? |
|----------|-----------|----------|

### Deferred
- [ ] (For N+1)
`)
```

## Output

- **Variable**: `sessionId` (WFS-xxx)
- **File**: `.workflow/active/[sessionId]/planning-notes.md`
- **TodoWrite**: Mark Phase 1 completed, Phase 2 in_progress

## Next Phase

Return to orchestrator, then auto-continue to [Phase 2: Context Gathering](02-context-gathering.md).
