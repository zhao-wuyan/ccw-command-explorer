---
name: tips
description: Quick note-taking command to capture ideas, snippets, reminders, and insights for later reference
argument-hint: "<note content> [--tag <tag1,tag2>] [--context <context>]"
allowed-tools: mcp__ccw-tools__core_memory(*), Read(*)
examples:
  - /memory:tips "Remember to use Redis for rate limiting"
  - /memory:tips "Auth pattern: JWT with refresh tokens" --tag architecture,auth
  - /memory:tips "Bug: memory leak in WebSocket handler after 24h" --context websocket-service
  - /memory:tips "Performance: lazy loading reduced bundle by 40%" --tag performance
---

# Memory Tips Command (/memory:tips)

## 1. Overview

The `memory:tips` command provides **quick note-taking** for capturing:
- Quick ideas and insights
- Code snippets and patterns
- Reminders and follow-ups
- Bug notes and debugging hints
- Performance observations
- Architecture decisions
- Library/tool recommendations

**Core Philosophy**:
- **Speed First**: Minimal friction for capturing thoughts
- **Searchable**: Tagged for easy retrieval
- **Context-Aware**: Optional context linking
- **Lightweight**: No complex session analysis

## 2. Parameters

- `<note content>` (Required): The tip/note content to save
- `--tag <tags>` (Optional): Comma-separated tags for categorization
- `--context <context>` (Optional): Related context (file, module, feature)

**Examples**:
```bash
/memory:tips "Use Zod for runtime validation - better DX than class-validator"
/memory:tips "Redis connection pool: max 10, min 2" --tag config,redis
/memory:tips "Fix needed: race condition in payment processor" --tag bug,payment --context src/payments
```

## 3. Structured Output Format

```markdown
## Tip ID
TIP-YYYYMMDD-HHMMSS

## Timestamp
YYYY-MM-DD HH:MM:SS

## Project Root
[Absolute path to project root, e.g., D:\Claude_dms3]

## Content
[The tip/note content exactly as provided]

## Tags
[Comma-separated tags, or (none)]

## Context
[Optional context linking - file, module, or feature reference]

## Session Link
[WFS-ID if workflow session active, otherwise (none)]

## Auto-Detected Context
[Files/topics from current conversation if relevant]
```

## 4. Field Definitions

| Field | Purpose | Example |
|-------|---------|---------|
| **Tip ID** | Unique identifier with timestamp | TIP-20260128-143052 |
| **Timestamp** | When tip was created | 2026-01-28 14:30:52 |
| **Project Root** | Current project path | D:\Claude_dms3 |
| **Content** | The actual tip/note | "Use Redis for rate limiting" |
| **Tags** | Categorization labels | architecture, auth, performance |
| **Context** | Related code/feature | src/auth/**, payment-module |
| **Session Link** | Link to workflow session | WFS-auth-20260128 |
| **Auto-Detected Context** | Files from conversation | src/api/handler.ts |

## 5. Execution Flow

### Step 1: Parse Arguments

```javascript
const parseTipsCommand = (input) => {
  // Extract note content (everything before flags)
  const contentMatch = input.match(/^"([^"]+)"|^([^\s-]+)/);
  const content = contentMatch ? (contentMatch[1] || contentMatch[2]) : '';

  // Extract tags
  const tagsMatch = input.match(/--tag\s+([^\s-]+)/);
  const tags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()) : [];

  // Extract context
  const contextMatch = input.match(/--context\s+([^\s-]+)/);
  const context = contextMatch ? contextMatch[1] : '';

  return { content, tags, context };
};
```

### Step 2: Gather Context

```javascript
const gatherTipContext = async () => {
  // Get project root
  const projectRoot = process.cwd(); // or detect from environment

  // Get current session if active
  const manifest = await mcp__ccw-tools__session_manager({
    operation: "list",
    location: "active"
  });
  const sessionId = manifest.sessions?.[0]?.id || null;

  // Auto-detect files from recent conversation
  const recentFiles = extractRecentFilesFromConversation(); // Last 5 messages

  return {
    projectRoot,
    sessionId,
    autoDetectedContext: recentFiles
  };
};
```

### Step 3: Generate Structured Text

```javascript
const generateTipText = (parsed, context) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const tipId = `TIP-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${new Date().toTimeString().slice(0,8).replace(/:/g, '')}`;

  return `## Tip ID
${tipId}

## Timestamp
${timestamp}

## Project Root
${context.projectRoot}

## Content
${parsed.content}

## Tags
${parsed.tags.length > 0 ? parsed.tags.join(', ') : '(none)'}

## Context
${parsed.context || '(none)'}

## Session Link
${context.sessionId || '(none)'}

## Auto-Detected Context
${context.autoDetectedContext.length > 0
  ? context.autoDetectedContext.map(f => `- ${f}`).join('\n')
  : '(none)'}`;
};
```

### Step 4: Save to Core Memory

```javascript
mcp__ccw-tools__core_memory({
  operation: "import",
  text: structuredText
})
```

**Response Format**:
```json
{
  "operation": "import",
  "id": "CMEM-YYYYMMDD-HHMMSS",
  "message": "Created memory: CMEM-YYYYMMDD-HHMMSS"
}
```

### Step 5: Confirm to User

```
✓ Tip saved successfully

  ID: CMEM-YYYYMMDD-HHMMSS
  Tags: architecture, auth
  Context: src/auth/**

  To retrieve: /memory:search "auth patterns"
  Or via MCP: core_memory(operation="search", query="auth")
```

## 6. Tag Categories (Suggested)

**Technical**:
- `architecture` - Design decisions and patterns
- `performance` - Optimization insights
- `security` - Security considerations
- `bug` - Bug notes and fixes
- `config` - Configuration settings
- `api` - API design patterns

**Development**:
- `testing` - Test strategies and patterns
- `debugging` - Debugging techniques
- `refactoring` - Refactoring notes
- `documentation` - Doc improvements

**Domain Specific**:
- `auth` - Authentication/authorization
- `database` - Database patterns
- `frontend` - UI/UX patterns
- `backend` - Backend logic
- `devops` - Infrastructure and deployment

**Organizational**:
- `reminder` - Follow-up items
- `research` - Research findings
- `idea` - Feature ideas
- `review` - Code review notes

## 7. Search Integration

Tips can be retrieved using:

```bash
# Via command (if /memory:search exists)
/memory:search "rate limiting"

# Via MCP tool
mcp__ccw-tools__core_memory({
  operation: "search",
  query: "rate limiting",
  source_type: "core_memory",
  top_k: 10
})

# Via CLI
ccw core-memory search --query "rate limiting" --top-k 10
```

## 8. Quality Checklist

Before saving:
- [ ] Content is clear and actionable
- [ ] Tags are relevant and consistent
- [ ] Context provides enough reference
- [ ] Auto-detected context is accurate
- [ ] Project root is absolute path
- [ ] Timestamp is properly formatted

## 9. Best Practices

### Good Tips Examples

✅ **Specific and Actionable**:
```
"Use connection pooling for Redis: { max: 10, min: 2, acquireTimeoutMillis: 30000 }"
--tag config,redis
```

✅ **With Context**:
```
"Auth middleware must validate both access and refresh tokens"
--tag security,auth --context src/middleware/auth.ts
```

✅ **Problem + Solution**:
```
"Memory leak fixed by unsubscribing event listeners in componentWillUnmount"
--tag bug,react --context src/components/Chat.tsx
```

### Poor Tips Examples

❌ **Too Vague**:
```
"Fix the bug" --tag bug
```

❌ **Too Long** (use /memory:compact instead):
```
"Here's the complete implementation plan for the entire auth system... [3 paragraphs]"
```

❌ **No Context**:
```
"Remember to update this later"
```

## 10. Use Cases

### During Development
```bash
/memory:tips "JWT secret must be 256-bit minimum" --tag security,auth
/memory:tips "Use debounce (300ms) for search input" --tag performance,ux
```

### After Bug Fixes
```bash
/memory:tips "Race condition in payment: lock with Redis SETNX" --tag bug,payment
```

### Code Review Insights
```bash
/memory:tips "Prefer early returns over nested ifs" --tag style,readability
```

### Architecture Decisions
```bash
/memory:tips "Chose PostgreSQL over MongoDB for ACID compliance" --tag architecture,database
```

### Library Recommendations
```bash
/memory:tips "Zod > Yup for TypeScript validation - better type inference" --tag library,typescript
```

## 11. Notes

- **Frequency**: Use liberally - capture all valuable insights
- **Retrieval**: Search by tags, content, or context
- **Lifecycle**: Tips persist across sessions
- **Organization**: Tags enable filtering and categorization
- **Integration**: Can reference tips in later workflows
- **Lightweight**: No complex session analysis required
