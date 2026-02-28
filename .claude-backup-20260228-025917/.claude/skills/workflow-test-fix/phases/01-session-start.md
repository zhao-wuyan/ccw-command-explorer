# Phase 1: Session Start (session-start)

Detect input mode and create test workflow session.

## Objective

- Detect input mode (session ID vs description)
- Create test workflow session with appropriate metadata

## Execution

### Step 1.0: Detect Input Mode

```
// Automatic mode detection based on input pattern
if (input.startsWith("WFS-")) {
  MODE = "session"
  // Load source session to preserve original task description
  Read(".workflow/active/[sourceSessionId]/workflow-session.json")
} else {
  MODE = "prompt"
}
```

### Step 1.1: Create Test Session

```
// Session Mode - preserve original task description
Skill(skill="workflow:session:start", args="--type test --new \"Test validation for [sourceSessionId]: [originalTaskDescription]\"")

// Prompt Mode - use user's description directly
Skill(skill="workflow:session:start", args="--type test --new \"Test generation for: [description]\"")
```

**Parse Output**:
- Extract: `SESSION_ID: WFS-test-[slug]` (store as `testSessionId`)

**Validation**:
- Session Mode: Source session `.workflow/active/[sourceSessionId]/` exists with completed IMPL tasks
- Both Modes: New test session directory created with metadata

**TodoWrite**: Mark step 1.1 completed, step 1.2 in_progress

### Session Metadata

**File**: `workflow-session.json`

| Mode | Fields |
|------|--------|
| **Session** | `type: "test"`, `source_session_id: "[sourceId]"` |
| **Prompt** | `type: "test"` (no source_session_id) |

## Output

- **Variable**: `testSessionId` (WFS-test-xxx)
- **Variable**: `MODE` (session | prompt)

## Next Phase

Continue to [Phase 2: Test Context Gather](02-test-context-gather.md).
