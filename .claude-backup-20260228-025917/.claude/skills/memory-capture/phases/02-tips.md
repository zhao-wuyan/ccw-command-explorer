# Phase 2: Tips - Quick Note Taking

Quick note-taking for capturing ideas, snippets, reminders, and insights with optional tagging and context linking.

## Objective

- Provide minimal-friction note capture
- Support tagging for categorization and search
- Auto-detect context from current conversation
- Save to core_memory for persistent retrieval

## Input

- `noteContent` (Required): The tip/note content to save
- `tags` (Optional): Comma-separated tags for categorization
- `context` (Optional): Related context (file, module, feature)

**Examples**:
```bash
"Use Zod for runtime validation - better DX than class-validator"
"Redis connection pool: max 10, min 2" --tag config,redis
"Fix needed: race condition in payment processor" --tag bug,payment --context src/payments
```

## Execution

### Step 2.1: Parse Arguments

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

### Step 2.2: Gather Context

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

### Step 2.3: Generate Structured Text

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

### Step 2.4: Save to Core Memory

```javascript
mcp__ccw-tools__core_memory({
  operation: "import",
  text: structuredText
})
```

### Step 2.5: Confirm to User

```
Tip saved successfully

  ID: CMEM-YYYYMMDD-HHMMSS
  Tags: architecture, auth
  Context: src/auth/**

  To retrieve: core_memory(operation="search", query="<keyword>")
```

## Tag Categories (Suggested)

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

## Search Integration

Tips can be retrieved using:

```javascript
// Via MCP tool
mcp__ccw-tools__core_memory({
  operation: "search",
  query: "rate limiting",
  source_type: "core_memory",
  top_k: 10
})

// Via CLI
// ccw core-memory search --query "rate limiting" --top-k 10
```

## Quality Checklist

Before saving:
- [ ] Content is clear and actionable
- [ ] Tags are relevant and consistent
- [ ] Context provides enough reference
- [ ] Auto-detected context is accurate
- [ ] Project root is absolute path
- [ ] Timestamp is properly formatted

## Best Practices

### Good Tips

- **Specific and Actionable**: `"Use connection pooling for Redis: { max: 10, min: 2, acquireTimeoutMillis: 30000 }" --tag config,redis`
- **With Context**: `"Auth middleware must validate both access and refresh tokens" --tag security,auth --context src/middleware/auth.ts`
- **Problem + Solution**: `"Memory leak fixed by unsubscribing event listeners in componentWillUnmount" --tag bug,react --context src/components/Chat.tsx`

### Poor Tips (Avoid)

- Too Vague: `"Fix the bug" --tag bug`
- Too Long (use Compact instead): Multi-paragraph implementation plans
- No Context: `"Remember to update this later"`

## Output

- **Variable**: `structuredText` - the generated tip markdown string
- **MCP Result**: `{ operation: "import", id: "CMEM-YYYYMMDD-HHMMSS" }`
- **User Display**: Confirmation with ID, tags, and retrieval hint

## Next Phase

N/A - Tips is a terminal phase. Return to SKILL.md orchestrator.
