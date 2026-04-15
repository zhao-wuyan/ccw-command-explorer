# Phase 2: Tips — Quick Note Taking

Quick note-taking for capturing ideas, snippets, reminders, and insights with optional tagging and context linking.

## Objective

- Provide minimal-friction note capture
- Support tagging for categorization and search
- Auto-detect context from current conversation
- Save to core_memory for persistent retrieval

## Input

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| noteContent | Yes | The tip/note text | `"Use Zod for runtime validation"` |
| tags | No | Comma-separated tags | `config,redis` |
| context | No | Related context (file, module, feature) | `src/payments` |

**Example inputs**:

| Input | Tags | Context |
|-------|------|---------|
| `"Use Zod for runtime validation - better DX than class-validator"` | — | — |
| `"Redis connection pool: max 10, min 2" --tag config,redis` | config, redis | — |
| `"Fix needed: race condition in payment processor" --tag bug,payment --context src/payments` | bug, payment | src/payments |

---

## Execution

### Step 2.1: Parse Arguments

Extract from user input:

| Component | Extraction Rule |
|-----------|----------------|
| Content | Everything before flags; text in quotes takes priority |
| Tags | Value after `--tag` flag, comma-separated |
| Context | Value after `--context` flag |

### Step 2.2: Gather Context

Collect contextual information:

| Source | Method | Description |
|--------|--------|-------------|
| Project root | Environment detection | Absolute path to project |
| Active session | `functions.exec_command({ cmd: "ccw session list --location active" })` | Session ID if active |
| Recent files | Conversation analysis | Last 5 files referenced in conversation |

### Step 2.3: Generate Structured Text

Assemble the tip into this template:

```
## Tip ID
TIP-YYYYMMDD-HHMMSS

## Timestamp
YYYY-MM-DD HH:MM:SS

## Project Root
<absolute path>

## Content
<note content>

## Tags
<comma-separated tags or "(none)">

## Context
<user-provided context or "(none)">

## Session Link
<session ID or "(none)">

## Auto-Detected Context
- <recently referenced files>
```

### Step 2.4: Save to Core Memory

Import the structured text:

```
functions.exec_command({ cmd: "ccw core-memory import --text '<structuredText>'" })
```

Or via MCP:

```
mcp__ccw-tools__core_memory({ operation: "import", text: <structuredText> })
```

### Step 2.5: Confirm to User

Display confirmation:

```
Tip saved successfully

  ID: CMEM-YYYYMMDD-HHMMSS
  Tags: <tags>
  Context: <context>

  To retrieve: ccw core-memory search --query "<keyword>"
```

---

## Tag Categories (Suggested)

| Category | Tags | Use For |
|----------|------|---------|
| **Technical** | `architecture`, `performance`, `security`, `bug`, `config`, `api` | Technical decisions and patterns |
| **Development** | `testing`, `debugging`, `refactoring`, `documentation` | Development process notes |
| **Domain** | `auth`, `database`, `frontend`, `backend`, `devops` | Domain-specific patterns |
| **Organizational** | `reminder`, `research`, `idea`, `review` | Follow-ups and planning |

---

## Search Integration

Tips can be retrieved using:

| Method | Command |
|--------|---------|
| MCP | `mcp__ccw-tools__core_memory({ operation: "search", query: "<keyword>", top_k: 10 })` |
| CLI | `ccw core-memory search --query "<keyword>" --top-k 10` |

---

## Quality Checklist

| Check | Requirement |
|-------|-------------|
| Content | Clear and actionable |
| Tags | Relevant and consistent with suggested categories |
| Context | Provides enough reference for retrieval |
| Auto-detected context | Accurate (verified against recent conversation) |
| Project root | Absolute path |
| Timestamp | Properly formatted (YYYY-MM-DD HH:MM:SS) |

---

## Best Practices

**Good tips** (specific + actionable):

| Example | Why Good |
|---------|----------|
| `"Use connection pooling for Redis: { max: 10, min: 2, acquireTimeoutMillis: 30000 }" --tag config,redis` | Specific values, tagged |
| `"Auth middleware must validate both access and refresh tokens" --tag security,auth --context src/middleware/auth.ts` | Context-linked |
| `"Memory leak fixed by unsubscribing event listeners in componentWillUnmount" --tag bug,react --context src/components/Chat.tsx` | Problem + solution |

**Avoid** (too vague or too long):

| Example | Problem |
|---------|---------|
| `"Fix the bug" --tag bug` | Too vague — no actionable info |
| Multi-paragraph implementation plans | Too long — use Compact mode instead |
| `"Remember to update this later"` | No context — unrecoverable |

---

## Output

| Artifact | Description |
|----------|-------------|
| structuredText | Generated tip markdown string for core_memory import |
| MCP/CLI Result | `{ operation: "import", id: "CMEM-YYYYMMDD-HHMMSS" }` |
| User Display | Confirmation with ID, tags, and retrieval hint |

## Next Phase

N/A — Tips is a terminal phase. Return to orchestrator.
