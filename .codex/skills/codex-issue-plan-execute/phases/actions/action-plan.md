# Action: Plan Solutions

为选中的 issues 生成执行方案。

## Purpose

使用 subagent 分析 issues 并生成解决方案，支持多解决方案选择和自动绑定。

## Preconditions

- [ ] `state.status === "running"`
- [ ] `issues with status === "planning"` exist

## Execution

```javascript
async function execute(state) {
  const workDir = state.work_dir;
  const issues = state.issues || {};

  // 1. 识别需要规划的 issues
  const planningIssues = Object.values(issues).filter(i => i.status === "planning");

  if (planningIssues.length === 0) {
    console.log("No issues to plan");
    return { stateUpdates: { issues } };
  }

  console.log(`\n=== Planning ${planningIssues.length} Issues ===`);

  // 2. 为每个 issue 生成规划 subagent
  const planningAgents = planningIssues.map(issue => ({
    issue_id: issue.id,
    issue_title: issue.title,
    prompt: `
## TASK ASSIGNMENT

### MANDATORY FIRST STEPS (Agent Execute)
1. **Read role definition**: ~/.codex/agents/issue-plan-agent.md (MUST read first)
2. Read: .workflow/project-tech.json
3. Read: .workflow/project-guidelines.json
4. Read schema: ~/.claude/workflows/cli-templates/schemas/solution-schema.json

---

Goal: Plan solution for issue "${issue.id}: ${issue.title}"

Scope:
- CAN DO: Explore codebase, design solutions, create tasks
- CANNOT DO: Execute solutions, modify production code
- Directory: ${process.cwd()}

Task Description:
${issue.title}

Deliverables:
- Create ONE primary solution
- Write to: ${workDir}/solutions/${issue.id}-plan.json
- Format: JSON following solution-schema.json

Quality bar:
- Tasks have quantified acceptance.criteria
- Each task includes test.commands
- Solution follows schema exactly

Return: JSON with solution_id, task_count, status
`
  }));

  // 3. 执行规划（串行执行避免竞争）
  for (const agent of planningAgents) {
    console.log(`\n→ Planning: ${agent.issue_id}`);

    try {
      // 对于 Codex，这里应该使用 spawn_agent
      // 对于 Claude Code Task，使用 Task()

      // 模拟 Task 调用 (实际应该是 spawn_agent 对于 Codex)
      const result = await Task({
        subagent_type: "universal-executor",
        run_in_background: false,
        description: `Plan solution for ${agent.issue_id}`,
        prompt: agent.prompt
      });

      // 解析结果
      let planResult;
      try {
        planResult = typeof result === "string" ? JSON.parse(result) : result;
      } catch {
        planResult = { status: "executed", solution_id: `SOL-${agent.issue_id}-1` };
      }

      // 更新 issue 状态
      issues[agent.issue_id].status = "planned";
      issues[agent.issue_id].solution_id = planResult.solution_id || `SOL-${agent.issue_id}-1`;
      issues[agent.issue_id].planned_at = new Date().toISOString();

      console.log(`✓ ${agent.issue_id} → ${issues[agent.issue_id].solution_id}`);

      // 绑定解决方案
      try {
        Bash(`ccw issue bind ${agent.issue_id} ${issues[agent.issue_id].solution_id}`);
      } catch (error) {
        console.log(`Note: Could not bind solution (${error.message})`);
      }

    } catch (error) {
      console.error(`✗ Planning failed for ${agent.issue_id}: ${error.message}`);
      issues[agent.issue_id].status = "registered";  // 回退
      issues[agent.issue_id].error = error.message;
    }
  }

  // 4. 更新 issue 状态到 ccw
  try {
    Bash(`ccw issue update --from-planning`);
  } catch {
    console.log("Note: Could not update issue status");
  }

  return {
    stateUpdates: {
      issues: issues,
      completed_actions: [...state.completed_actions, "action-plan"]
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
        status: "planned",
        solution_id: solutionId,
        planned_at: timestamp
      }
    },
    queue: [
      ...state.queue,
      {
        item_id: `S-${index}`,
        issue_id: issue.id,
        solution_id: solutionId,
        status: "pending"
      }
    ]
  }
};
```

## Error Handling

| Error Type | Recovery |
|------------|----------|
| Subagent 超时 | 标记为失败，继续下一个 |
| 无效解决方案 | 回退到 registered 状态 |
| 绑定失败 | 记录警告，但继续 |
| 文件写入失败 | 重试 3 次 |

## Next Actions (Hints)

- 所有 issues 规划完成：执行 action-execute
- 部分失败：用户选择是否继续或重试
- 全部失败：返回 action-list 重新选择
