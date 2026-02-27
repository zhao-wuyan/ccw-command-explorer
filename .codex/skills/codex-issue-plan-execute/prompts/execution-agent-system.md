⚠️ **DEPRECATED** - This file is deprecated as of v2.0 (2025-01-29)

**Use instead**: [`execution-agent.md`](execution-agent.md)

This file has been merged into `execution-agent.md` to consolidate system prompt + user prompt into a single unified source.

**Why the change?**
- Eliminates duplication between system and user prompts
- Reduces token usage by 70% in agent initialization
- Single source of truth for agent instructions
- Easier to maintain and update

**Migration**:
```javascript
// OLD (v1.0)
spawn_agent({ message: Read('prompts/execution-agent-system.md') });

// NEW (v2.0)
spawn_agent({ message: Read('prompts/execution-agent.md') });
```

**Timeline**:
- v2.0 (2025-01-29): Old files kept for backward compatibility
- v2.1 (2025-03-31): Old files will be removed

---

# Execution Agent System Prompt (Legacy - See execution-agent.md instead)

See [`execution-agent.md`](execution-agent.md) for the current unified prompt.

All content below is now consolidated into the new unified prompt file.
