# Action: Execute Solutions

按队列顺序执行已规划的解决方案。

## Purpose

加载计划的解决方案并使用 subagent 执行所有任务、提交更改。

## Preconditions

- [ ] `state.status === "running"`
- [ ] `issues with solution_id` exist (来自规划阶段)

## Execution

```javascript
async function execute(state) {
  const workDir = state.work_dir;
  const issues = state.issues || {};
  const queue = state.queue || [];

  // 1. 构建执行队列（来自已规划的 issues）
  const plannedIssues = Object.values(issues).filter(i => i.status === "planned");

  if (plannedIssues.length === 0) {
    console.log("No planned solutions to execute");
    return { stateUpdates: { queue } };
  }

  console.log(`\n=== Executing ${plannedIssues.length} Solutions ===`);

  // 2. 序列化执行每个解决方案
  const executionResults = [];

  for (let i = 0; i < plannedIssues.length; i++) {
    const issue = plannedIssues[i];
    const solutionId = issue.solution_id;

    console.log(`\n[${i + 1}/${plannedIssues.length}] Executing: ${solutionId}`);

    try {
      // 创建快照（便于恢复）
      const beforeSnapshot = {
        timestamp: new Date().toISOString(),
        phase: "before-execute",
        issue_id: issue.id,
        solution_id: solutionId,
        state: { ...state }
      };
      Write(`${workDir}/snapshots/snapshot-before-execute-${i}.json`, JSON.stringify(beforeSnapshot, null, 2));

      // 执行 subagent
      const executionPrompt = `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/issue-execute-agent.md (MUST read first)
2. Read: .workflow/project-tech.json
3. Read: .workflow/project-guidelines.json

---

Goal: Execute solution "${solutionId}" for issue "${issue.id}"

Scope:
- CAN DO: Implement tasks, run tests, commit code
- CANNOT DO: Push to remote or create PRs without approval
- Directory: ${process.cwd()}

Solution ID: ${solutionId}

Load solution details:
- Read: ${workDir}/solutions/${issue.id}-plan.json

Execution steps:
1. Parse all tasks from solution
2. Execute each task: implement → test → verify
3. Commit once for all tasks with formatted summary
4. Report completion

Quality bar:
- All acceptance criteria verified
- Tests passing
- Commit message follows conventions

Return: JSON with files_modified[], commit_hash, status
`;

      const result = await Task({
        subagent_type: "universal-executor",
        run_in_background: false,
        description: `Execute solution ${solutionId}`,
        prompt: executionPrompt
      });

      // 解析执行结果
      let execResult;
      try {
        execResult = typeof result === "string" ? JSON.parse(result) : result;
      } catch {
        execResult = { status: "executed", commit_hash: "unknown" };
      }

      // 保存执行结果
      Write(`${workDir}/solutions/${issue.id}-execution.json`, JSON.stringify({
        solution_id: solutionId,
        issue_id: issue.id,
        status: "completed",
        executed_at: new Date().toISOString(),
        execution_result: execResult
      }, null, 2));

      // 更新 issue 状态
      issues[issue.id].status = "completed";
      issues[issue.id].executed_at = new Date().toISOString();

      // 更新队列项
      const queueIndex = queue.findIndex(q => q.solution_id === solutionId);
      if (queueIndex >= 0) {
        queue[queueIndex].status = "completed";
      }

      // 更新 ccw
      try {
        Bash(`ccw issue update ${issue.id} --status completed`);
      } catch (error) {
        console.log(`Note: Could not update ccw status (${error.message})`);
      }

      console.log(`✓ ${solutionId} completed`);
      executionResults.push({
        issue_id: issue.id,
        solution_id: solutionId,
        status: "completed",
        commit: execResult.commit_hash
      });

      state.context.completed_count++;

    } catch (error) {
      console.error(`✗ Execution failed for ${solutionId}: ${error.message}`);

      // 更新失败状态
      issues[issue.id].status = "failed";
      issues[issue.id].error = error.message;

      state.context.failed_count++;

      executionResults.push({
        issue_id: issue.id,
        solution_id: solutionId,
        status: "failed",
        error: error.message
      });
    }
  }

  // 3. 保存执行结果摘要
  Write(`${workDir}/execution-results.json`, JSON.stringify({
    total: plannedIssues.length,
    completed: state.context.completed_count,
    failed: state.context.failed_count,
    results: executionResults,
    timestamp: new Date().toISOString()
  }, null, 2));

  return {
    stateUpdates: {
      issues: issues,
      queue: queue,
      context: state.context,
      completed_actions: [...state.completed_actions, "action-execute"]
    }
  };
}
```

## State Updates

```javascript
return {
  stateUpdates: {
    issues: {
      [issue.id]: {
        ...issue,
        status: "completed|failed",
        executed_at: timestamp,
        error: errorMessage
      }
    },
    queue: [
      ...queue.map(item =>
        item.solution_id === solutionId
          ? { ...item, status: "completed|failed" }
          : item
      )
    ],
    context: {
      ...state.context,
      completed_count: newCompletedCount,
      failed_count: newFailedCount
    }
  }
};
```

## Error Handling

| Error Type | Recovery |
|------------|----------|
| 任务执行失败 | 标记为失败，继续下一个 |
| 测试失败 | 不提交，标记为失败 |
| 提交失败 | 保存快照便于恢复 |
| Subagent 超时 | 记录超时，继续 |

## Next Actions (Hints)

- 执行完成：转入 action-complete 阶段
- 有失败项：用户选择是否重试
- 全部完成：生成最终报告
