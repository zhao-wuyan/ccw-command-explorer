# Orchestrator - Dual-Agent Pipeline Architecture

主流程编排器：创建两个持久化 agent（规划和执行），流水线式处理所有 issue。

> **Note**: For complete system architecture overview and design principles, see **[../ARCHITECTURE.md](../ARCHITECTURE.md)**

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│        Main Orchestrator (Claude Code)                  │
│        流水线式分配任务给两个持久化 agent               │
└──────┬────────────────────────────────────────┬────────┘
       │ send_input                             │ send_input
       │ (逐个 issue)                           │ (逐个 solution)
       ▼                                        ▼
┌──────────────────┐                    ┌──────────────────┐
│ Planning Agent   │                    │ Execution Agent  │
│ (持久化)         │                    │ (持久化)         │
│                  │                    │                  │
│ • 接收 issue    │                    │ • 接收 solution │
│ • 设计方案      │                    │ • 执行 tasks   │
│ • 返回 solution │                    │ • 返回执行结果 │
└──────────────────┘                    └──────────────────┘
       ▲                                        ▲
       └────────────────┬─────────────────────┘
              wait for completion
```

## Main Orchestrator Pseudocode

```javascript
async function mainOrchestrator(workDir, issues) {
  const planningResults = { results: [] };  // 统一存储
  const executionResults = { results: [] }; // 统一存储

  // 1. Create persistent agents (never close until done)
  const planningAgentId = spawn_agent({
    message: Read('prompts/planning-agent-system.md')
  });

  const executionAgentId = spawn_agent({
    message: Read('prompts/execution-agent-system.md')
  });

  try {
    // Phase 1: Planning Pipeline
    for (const issue of issues) {
      // Send issue to planning agent (不新建 agent，用 send_input)
      send_input({
        id: planningAgentId,
        message: buildPlanningRequest(issue)
      });

      // Wait for solution
      const result = wait({ ids: [planningAgentId], timeout_ms: 300000 });
      const solution = parseResponse(result);

      // Store in unified results
      planningResults.results.push({
        issue_id: issue.id,
        solution: solution,
        status: solution ? "completed" : "failed"
      });
    }

    // Save planning results once
    Write(`${workDir}/planning-results.json`, JSON.stringify(planningResults, null, 2));

    // Phase 2: Execution Pipeline
    for (const planning of planningResults.results) {
      if (planning.status !== "completed") continue;

      // Send solution to execution agent (不新建 agent，用 send_input)
      send_input({
        id: executionAgentId,
        message: buildExecutionRequest(planning.solution)
      });

      // Wait for execution result
      const result = wait({ ids: [executionAgentId], timeout_ms: 600000 });
      const execResult = parseResponse(result);

      // Store in unified results
      executionResults.results.push({
        issue_id: planning.issue_id,
        status: execResult?.status || "failed",
        commit_hash: execResult?.commit_hash
      });
    }

    // Save execution results once
    Write(`${workDir}/execution-results.json`, JSON.stringify(executionResults, null, 2));

  } finally {
    // Close agents after ALL issues processed
    close_agent({ id: planningAgentId });
    close_agent({ id: executionAgentId });
  }

  generateFinalReport(workDir, planningResults, executionResults);
}
```

## Key Design Principles

### 1. Agent Persistence

- **Creating**: Each agent created once at the beginning
- **Running**: Agents continue running, receiving multiple `send_input` calls
- **Closing**: Agents closed only after all issues processed
- **Benefit**: Agent maintains context across multiple issues

### 2. Unified Results Storage

```json
// planning-results.json
{
  "phase": "planning",
  "created_at": "2025-01-29T12:00:00Z",
  "results": [
    {
      "issue_id": "ISS-001",
      "solution_id": "SOL-ISS-001-1",
      "status": "completed",
      "solution": { "id": "...", "tasks": [...] },
      "planned_at": "2025-01-29T12:05:00Z"
    },
    {
      "issue_id": "ISS-002",
      "solution_id": "SOL-ISS-002-1",
      "status": "completed",
      "solution": { "id": "...", "tasks": [...] },
      "planned_at": "2025-01-29T12:10:00Z"
    }
  ]
}

// execution-results.json
{
  "phase": "execution",
  "created_at": "2025-01-29T12:15:00Z",
  "results": [
    {
      "issue_id": "ISS-001",
      "solution_id": "SOL-ISS-001-1",
      "status": "completed",
      "commit_hash": "abc123def",
      "files_modified": ["src/auth.ts"],
      "executed_at": "2025-01-29T12:20:00Z"
    }
  ]
}
```

**优点**:
- 单一 JSON 文件，易于查询和分析
- 完整的处理历史
- 减少文件 I/O 次数

### 3. Pipeline Flow

```
Issue 1 → Planning Agent → Wait → Solution 1 (save)
Issue 2 → Planning Agent → Wait → Solution 2 (save)
Issue 3 → Planning Agent → Wait → Solution 3 (save)
[All saved to planning-results.json]

Solution 1 → Execution Agent → Wait → Result 1 (save)
Solution 2 → Execution Agent → Wait → Result 2 (save)
Solution 3 → Execution Agent → Wait → Result 3 (save)
[All saved to execution-results.json]
```

### 4. Agent Communication via send_input

Instead of creating new agents, reuse persistent ones:

```javascript
// ❌ OLD: Create new agent per issue
for (const issue of issues) {
  const agentId = spawn_agent({ message: prompt });
  const result = wait({ ids: [agentId] });
  close_agent({ id: agentId });  // ← Expensive!
}

// ✅ NEW: Persistent agent with send_input
const agentId = spawn_agent({ message: initialPrompt });
for (const issue of issues) {
  send_input({ id: agentId, message: taskPrompt });  // ← Reuse!
  const result = wait({ ids: [agentId] });
}
close_agent({ id: agentId });  // ← Single cleanup
```

### 5. Path Resolution for Global Installation

When this skill is installed globally:
- **Skill-internal paths**: Use relative paths from skill root (e.g., `prompts/planning-agent-system.md`)
- **Project paths**: Use project-relative paths starting with `.` (e.g., `.workflow/project-tech.json`)
- **User-home paths**: Use `~` prefix (e.g., `~/.codex/agents/...`)
- **Working directory**: Always relative to the project root when skill executes

## Benefits of This Architecture

| 方面 | 优势 |
|------|------|
| **性能** | Agent 创建/销毁开销仅一次（而非 N 次） |
| **上下文** | Agent 在多个任务间保持上下文 |
| **存储** | 统一的 JSON 文件，易于追踪和查询 |
| **通信** | 通过 send_input 实现 agent 间的数据传递 |
| **可维护性** | 流水线结构清晰，易于调试 |
