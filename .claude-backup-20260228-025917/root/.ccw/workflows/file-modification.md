# File Modification

Before modifying files, always:
- Try built-in Edit tool first
- Escalate to MCP tools when built-ins fail
- Use write_file only as last resort

## MCP Tools Usage

### edit_file - Modify Files

**When**: Built-in Edit fails, need dry-run preview, or need line-based operations

**How**:
```javascript
edit_file(path="/file.ts", oldText="old", newText="new")              // Replace text
edit_file(path="/file.ts", oldText="old", newText="new", dryRun=true) // Preview diff
edit_file(path="/file.ts", oldText="old", newText="new", replaceAll=true) // Replace all
edit_file(path="/file.ts", mode="line", operation="insert_after", line=10, text="new line")
edit_file(path="/file.ts", mode="line", operation="delete", line=5, end_line=8)
```

**Modes**: `update` (replace text, default), `line` (line-based operations)

**Operations** (line mode): `insert_before`, `insert_after`, `replace`, `delete`

---

### write_file - Create/Overwrite Files

**When**: Create new files, completely replace content, or edit_file still fails

**How**:
```javascript
write_file(path="/new-file.ts", content="file content here")
write_file(path="/existing.ts", content="...", backup=true)  // Create backup first
```

---

## Priority Logic

> **Note**: Search priority is defined in `context-tools.md` - smart_search has HIGHEST PRIORITY for all discovery tasks.

**Search & Discovery** (defer to context-tools.md):
1. **smart_search FIRST** for any code/file discovery
2. Built-in Grep only for single-file exact line search (location already confirmed)
3. Exa for external/public knowledge

**File Reading**:
1. Unknown location → **smart_search first**, then Read
2. Known confirmed file → Built-in Read directly
3. Pattern matching → smart_search (action="find_files")

**File Editing**:
1. Always try built-in Edit first
2. Fails 1+ times → edit_file (MCP)
3. Still fails → write_file (MCP)

## Decision Triggers

**Search tasks** → Always start with smart_search (per context-tools.md)
**Known file edits** → Start with built-in Edit, escalate to MCP if fails
**External knowledge** → Use Exa
