## Context Acquisition (MCP Tools Priority)

**For task context gathering and analysis, ALWAYS prefer MCP tools**:

1. **mcp__ace-tool__search_context** - HIGHEST PRIORITY for code discovery
   - Semantic search with real-time codebase index
   - Use for: finding implementations, understanding architecture, locating patterns
   - Example: `mcp__ace-tool__search_context(project_root_path="/path", query="authentication logic")`

2. **smart_search** - Fallback for structured search
   - Use `smart_search(query="...")` for keyword/regex search
   - Use `smart_search(action="find_files", pattern="*.ts")` for file discovery
   - Supports modes: `auto`, `hybrid`, `exact`, `ripgrep`

3. **read_file** - Batch file reading
   - Read multiple files in parallel: `read_file(path="file1.ts")`, `read_file(path="file2.ts")`
   - Supports glob patterns: `read_file(path="src/**/*.config.ts")`

**Priority Order**:
```
ACE search_context (semantic) → smart_search (structured) → read_file (batch read) → shell commands (fallback)
```

**NEVER** use shell commands (`cat`, `find`, `grep`) when MCP tools are available.
### read_file - Read File Contents

**When**: Read files found by smart_search

**How**:
```javascript
read_file(path="/path/to/file.ts")                   // Single file
read_file(path="/src/**/*.config.ts")                // Pattern matching
```

---

### edit_file - Modify Files

**When**: Built-in Edit tool fails or need advanced features

**How**:
```javascript
edit_file(path="/file.ts", old_string="...", new_string="...", mode="update")
edit_file(path="/file.ts", line=10, content="...", mode="insert_after")
```

**Modes**: `update` (replace text), `insert_after`, `insert_before`, `delete_line`

---

### write_file - Create/Overwrite Files

**When**: Create new files or completely replace content

**How**:
```javascript
write_file(path="/new-file.ts", content="...")
```

---

### Exa - External Search

**When**: Find documentation/examples outside codebase

**How**:
```javascript
mcp__exa__search(query="React hooks 2025 documentation")
mcp__exa__search(query="FastAPI auth example", numResults=10)
mcp__exa__search(query="latest API docs", livecrawl="always")
```

**Parameters**:
- `query` (required): Search query string
- `numResults` (optional): Number of results to return (default: 5)
- `livecrawl` (optional): `"always"` or `"fallback"` for live crawling
