# Claude Instructions

- **Coding Philosophy**: @~/.claude/workflows/coding-philosophy.md

## CLI Endpoints

- **CLI Tools Usage**: @~/.claude/workflows/cli-tools-usage.md
- **CLI Endpoints Config**: @~/.claude/cli-tools.json

**Strictly follow the cli-tools.json configuration**

Available CLI endpoints are dynamically defined by the config file
## Tool Execution

- **Context Requirements**: @~/.claude/workflows/context-tools.md
- **File Modification**: @~/.claude/workflows/file-modification.md

### Agent Calls
- **Always use `run_in_background: false`** for Task tool agent calls: `Task({ subagent_type: "xxx", prompt: "...", run_in_background: false })` to ensure synchronous execution and immediate result visibility
- **TaskOutput usage**: Only use `TaskOutput({ task_id: "xxx", block: false })` + sleep loop to poll completion status. NEVER read intermediate output during agent/CLI execution - wait for final result only

### CLI Tool Calls (ccw cli)
- **Default: Use Bash `run_in_background: true`** - Unless otherwise specified, always execute CLI calls in background using Bash tool's background mode:
  ```
  Bash({
    command: "ccw cli -p '...' --tool gemini",
    run_in_background: true  // Bash tool parameter, not ccw cli parameter
  })
  ```
- **After CLI call**: Stop output immediately - let CLI execute in background. **DO NOT use TaskOutput polling** - wait for hook callback to receive results

### CLI Analysis Calls
- **Wait for results**: MUST wait for CLI analysis to complete before taking any write action. Do NOT proceed with fixes while analysis is running
- **Value every call**: Each CLI invocation is valuable and costly. NEVER waste analysis results:
  - Aggregate multiple analysis results before proposing solutions

### CLI Auto-Invoke Triggers
- **Reference**: See `cli-tools-usage.md` → [Auto-Invoke Triggers](#auto-invoke-triggers) for full specification
- **Key scenarios**: Self-repair fails, ambiguous requirements, architecture decisions, pattern uncertainty, critical code paths
- **Principles**: Default `--mode analysis`, no confirmation needed, wait for completion, flexible rule selection

## Code Diagnostics

- **Prefer `mcp__ide__getDiagnostics`** for code error checking over shell-based TypeScript compilation
