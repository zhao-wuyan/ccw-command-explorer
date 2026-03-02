# Phase 1: Session Discovery

Create or discover TDD workflow session and extract session ID.

## Objective

- Create a new TDD workflow session via `/workflow:session:start`
- Extract session ID for subsequent phases

## Execution

### Step 1.1: Execute Session Start

```javascript
Skill(skill="workflow:session:start", args="--type tdd --auto \"TDD: [structured-description]\"")
```

**TDD Structured Format**:
```
TDD: [Feature Name]
GOAL: [Objective]
SCOPE: [Included/excluded]
CONTEXT: [Background]
TEST_FOCUS: [Test scenarios]
```

**Example**:
```
TDD: JWT Authentication
GOAL: Implement JWT-based authentication
SCOPE: Email/password login, token generation, token refresh endpoints
CONTEXT: Existing user database schema, REST API
TEST_FOCUS: Login flow, token validation, refresh rotation, error cases
```

### Step 1.2: Parse Output

- Extract: `SESSION_ID: WFS-[id]` (store as `sessionId`)

**Validation**:
- Session ID successfully extracted
- Session directory `.workflow/active/[sessionId]/` exists

**Note**: Session directory contains `workflow-session.json` (metadata). Do NOT look for `manifest.json` here - it only exists in `.workflow/archives/` for archived sessions.

**TodoWrite**: Mark phase 1 completed, phase 2 in_progress

**After Phase 1**: Return to user showing Phase 1 results, then auto-continue to Phase 2

## Output

- **Variable**: `sessionId` (WFS-xxx)
- **TodoWrite**: Mark Phase 1 completed, Phase 2 in_progress

## Next Phase

Return to orchestrator, then auto-continue to [Phase 2: Context Gathering](02-context-gathering.md).
