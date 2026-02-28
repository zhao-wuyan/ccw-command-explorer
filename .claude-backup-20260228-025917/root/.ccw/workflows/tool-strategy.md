# Tool Strategy - When to Use What

> **Focus**: Decision triggers and selection logic, NOT syntax (already registered with Claude)

## Quick Decision Tree

```
Need context?
├─ Exa available? → Use Exa (fastest, most comprehensive)
├─ Large codebase (>500 files)? → codex_lens
├─ Known files (<5)? → Read tool
└─ Unknown files? → smart_search → Read tool

Need to modify files?
├─ Built-in Edit fails? → mcp__ccw-tools__edit_file
└─ Still fails? → mcp__ccw-tools__write_file

Need to search?
├─ Semantic/concept search? → smart_search (mode=semantic)
├─ Exact pattern match? → Grep tool
└─ Multiple search modes needed? → smart_search (mode=auto)
```

---

## 1. Context Gathering Tools

### Exa (`mcp__exa__get_code_context_exa`)

**Use When**:
- ✅ Researching external APIs, libraries, frameworks
- ✅ Need recent documentation (post-cutoff knowledge)
- ✅ Looking for implementation examples in public repos
- ✅ Comparing architectural patterns across projects

**Don't Use When**:
- ❌ Searching internal codebase (use smart_search/codex_lens)
- ❌ Files already in working directory (use Read)

**Trigger Indicators**:
- User mentions specific library/framework names
- Questions about "best practices", "how does X work"
- Need to verify current API signatures

---

### read_file (`mcp__ccw-tools__read_file`)

**Use When**:
- ✅ Reading multiple related files at once (batch reading)
- ✅ Need directory traversal with pattern matching
- ✅ Searching file content with regex (`contentPattern`)
- ✅ Want to limit depth/file count for large directories

**Don't Use When**:
- ❌ Single file read → Use built-in Read tool (faster)
- ❌ Unknown file locations → Use smart_search first
- ❌ Need semantic search → Use smart_search or codex_lens

**Trigger Indicators**:
- Need to read "all TypeScript files in src/"
- Need to find "files containing TODO comments"
- Want to read "up to 20 config files"

**Advantages over Built-in Read**:
- Batch operation (multiple files in one call)
- Pattern-based filtering (glob + content regex)
- Directory traversal with depth control

---

### codex_lens (`mcp__ccw-tools__codex_lens`)

**Use When**:
- ✅ Large codebase (>500 files) requiring repeated searches
- ✅ Need semantic understanding of code relationships
- ✅ Working across multiple sessions (persistent index)
- ✅ Symbol-level navigation needed

**Don't Use When**:
- ❌ Small project (<100 files) → Use smart_search (no indexing overhead)
- ❌ One-time search → Use smart_search or Grep
- ❌ Files change frequently → Indexing overhead not worth it

**Trigger Indicators**:
- "Find all implementations of interface X"
- "What calls this function across the codebase?"
- Multi-session workflow on same codebase

**Action Selection**:
- `init`: First time in new codebase
- `search`: Find code patterns
- `search_files`: Find files by path/name pattern
- `symbol`: Get symbols in specific file
- `status`: Check if index exists/is stale
- `clean`: Remove stale index

---

### smart_search (`mcp__ccw-tools__smart_search`)

**Use When**:
- ✅ Don't know exact file locations
- ✅ Need concept/semantic search ("authentication logic")
- ✅ Medium-sized codebase (100-500 files)
- ✅ One-time or infrequent searches

**Don't Use When**:
- ❌ Known exact file path → Use Read directly
- ❌ Large codebase + repeated searches → Use codex_lens
- ❌ Exact pattern match → Use Grep (faster)

**Mode Selection**:
- `auto`: Let tool decide (default, safest)
- `exact`: Know exact pattern, need fast results
- `fuzzy`: Typo-tolerant file/symbol names
- `semantic`: Concept-based ("error handling", "data validation")
- `graph`: Dependency/relationship analysis

**Trigger Indicators**:
- "Find files related to user authentication"
- "Where is the payment processing logic?"
- "Locate database connection setup"

---

## 2. File Modification Tools

### edit_file (`mcp__ccw-tools__edit_file`)

**Use When**:
- ✅ Built-in Edit tool failed 1+ times
- ✅ Need dry-run preview before applying
- ✅ Need line-based operations (insert_after, insert_before)
- ✅ Need to replace all occurrences

**Don't Use When**:
- ❌ Built-in Edit hasn't failed yet → Try built-in first
- ❌ Need to create new file → Use write_file

**Trigger Indicators**:
- Built-in Edit returns "old_string not found"
- Built-in Edit fails due to whitespace/formatting
- Need to verify changes before applying (dryRun=true)

**Mode Selection**:
- `mode=update`: Replace text (similar to built-in Edit)
- `mode=line`: Line-based operations (insert_after, insert_before, delete)

---

### write_file (`mcp__ccw-tools__write_file`)

**Use When**:
- ✅ Creating brand new files
- ✅ MCP edit_file still fails (last resort)
- ✅ Need to completely replace file content
- ✅ Need backup before overwriting

**Don't Use When**:
- ❌ File exists + small change → Use Edit tools
- ❌ Built-in Edit hasn't been tried → Try built-in Edit first

**Trigger Indicators**:
- All Edit attempts failed
- Need to create new file with specific content
- User explicitly asks to "recreate file"

---

## 3. Decision Logic

### File Reading Priority

```
1. Known single file? → Built-in Read
2. Multiple files OR pattern matching? → mcp__ccw-tools__read_file
3. Unknown location? → smart_search, then Read
4. Large codebase + repeated access? → codex_lens
```

### File Editing Priority

```
1. Always try built-in Edit first
2. Fails 1+ times? → mcp__ccw-tools__edit_file
3. Still fails? → mcp__ccw-tools__write_file (last resort)
```

### Search Tool Priority

```
1. External knowledge? → Exa
2. Exact pattern in small codebase? → Built-in Grep
3. Semantic/unknown location? → smart_search
4. Large codebase + repeated searches? → codex_lens
```

---

## 4. Anti-Patterns

**Don't**:
- Use codex_lens for one-time searches in small projects
- Use smart_search when file path is already known
- Use write_file before trying Edit tools
- Use Exa for internal codebase searches
- Use read_file for single file when Read tool works

**Do**:
- Start with simplest tool (Read, Edit, Grep)
- Escalate to MCP tools when built-ins fail
- Use semantic search (smart_search) for exploratory tasks
- Use indexed search (codex_lens) for large, stable codebases
- Use Exa for external/public knowledge

