---
name: memory-capture
description: Unified memory capture with routing - session compact or quick tips. Triggers on "memory capture", "compact session", "save session", "quick tip", "memory tips", "记录", "压缩会话".
agents: none
phases: 2
---

# Memory Capture

Unified memory capture skill that routes to two execution modes:
- **Compact**: Compress full session memory into structured text for recovery
- **Tips**: Quick note-taking for ideas, snippets, and insights

## Architecture

```
+-----------------------------------------------------------+
|  Memory Capture (Orchestrator)                            |
|  -> Parse input -> Detect mode -> Execute selected phase  |
+---------------------------+-------------------------------+
                            |
                    ┌───────┴───────┐
                    v               v
              +-----------+   +-----------+
              |  Compact  |   |   Tips    |
              |  (Phase1) |   |  (Phase2) |
              |  Full     |   |  Quick    |
              |  Session  |   |  Note     |
              +-----------+   +-----------+
                    |               |
                    └───────┬───────┘
                            v
                  +-------------------+
                  |  core_memory      |
                  |  (import via CLI) |
                  +-------------------+
```

---

## Phase Execution

### Progress Tracking Initialization

Before routing, initialize progress tracking:

```
functions.update_plan([
  { id: "route", title: "Route: Detect execution mode", status: "in_progress" },
  { id: "execute", title: "Execute: Run selected phase", status: "pending" },
  { id: "save", title: "Save: Import to core_memory", status: "pending" }
])
```

### Step 1: Parse Input & Route

Detect execution mode from user input.

**Auto-Route Rules** (priority order):

| Signal | Route | Examples |
|--------|-------|---------|
| Keyword: compact, session, 压缩, recovery, 保存会话 | → Compact (Phase 1) | "compact current session" |
| Keyword: tip, note, 记录, 快速 | → Tips (Phase 2) | "记录一个想法" |
| Has `--tag` or `--context` flags | → Tips (Phase 2) | `"note content" --tag bug` |
| Short text (<100 chars) + no session keywords | → Tips (Phase 2) | "Remember to use Redis" |
| Ambiguous or no arguments | → **Ask user** | `/memory-capture` |

**When ambiguous**, use `functions.request_user_input`:

```
functions.request_user_input({
  id: "mode-select",
  message: "选择记忆捕获模式",
  options: [
    "Compact - 压缩当前完整会话记忆（用于会话恢复）",
    "Tips - 快速记录一条笔记/想法/提示"
  ]
})
```

**Progress**: `functions.update_plan([{id: "route", status: "completed"}, {id: "execute", status: "in_progress"}])`

### Step 2: Execute Selected Phase

Based on routing result, read and execute the corresponding phase file.

**Phase Reference Documents** (read on-demand when phase executes):

| Mode | Document | Purpose |
|------|----------|---------|
| Compact | `~/.codex/skills/memory-capture/phases/01-compact.md` | Full session memory compression and structured export |
| Tips | `~/.codex/skills/memory-capture/phases/02-tips.md` | Quick note-taking with tags and context |

Read the selected phase file:

```
functions.exec_command({ cmd: "cat ~/.codex/skills/memory-capture/phases/0<N>-<mode>.md" })
```

Then execute the phase instructions verbatim.

**Progress**: `functions.update_plan([{id: "execute", status: "completed"}, {id: "save", status: "in_progress"}])`

### Step 3: Save via core_memory

Both phases converge on the same storage mechanism. Import the generated structured text:

```
functions.exec_command({ cmd: "ccw core-memory import --text '<structuredText>'" })
```

Or via MCP if available:

```
mcp__ccw-tools__core_memory({
  operation: "import",
  text: <structuredText>
})
```

**Progress**: `functions.update_plan([{id: "save", status: "completed"}])`

---

## Core Rules

1. **Single Phase Execution**: Only ONE phase executes per invocation — never both
2. **Content Faithful**: Phase files contain full execution detail — follow them verbatim
3. **Absolute Paths**: All file paths in output must be absolute
4. **No Summarization**: Compact mode preserves complete plan verbatim — never abbreviate
5. **Speed Priority**: Tips mode should be fast — minimal analysis overhead

---

## Input Processing

### Compact Mode Input

- Optional: `"session description"` as supplementary context
- Example: `/memory-capture compact` or `/memory-capture "completed auth module"`

### Tips Mode Input

- Required: `<note content>` — the tip/note text
- Optional: `--tag <tag1,tag2>` for categorization
- Optional: `--context <context>` for related code/feature reference
- Example: `/memory-capture tip "Use Redis for rate limiting" --tag config`

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| core_memory import fails | Retry once, then report error with structured text for manual save |
| No session context (compact) | Warn user, generate with available info |
| Empty note content (tips) | Ask user to provide content via `functions.request_user_input` |
| Ambiguous routing | Default to `functions.request_user_input` — never guess |
| Phase file not found | Fall back to inline instructions from this orchestrator |

---

## Output Format

```
## Summary
- Mode: <Compact | Tips>
- Status: <DONE | ERROR>

## Results
- Recovery ID: <CMEM-YYYYMMDD-HHMMSS>
- Content: <brief description of what was captured>

## Restore Instructions
- "Please import memory <ID>"
- CLI: ccw core-memory export --id <ID>
```
