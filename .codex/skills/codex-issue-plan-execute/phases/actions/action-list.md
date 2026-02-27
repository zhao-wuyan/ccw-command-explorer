# Action: List Issues

列出 issues 并支持用户交互选择。

## Purpose

展示当前所有 issues 的状态，收集用户的规划/执行意图。

## Preconditions

- [ ] `state.status === "running"`

## Execution

```javascript
async function execute(state) {
  // 1. 加载或初始化 issues
  let issues = state.issues || {};

  // 2. 从 ccw issue list 或提供的参数加载 issues
  // 这取决于用户是否在命令行提供了 issue IDs
  // 示例：ccw codex issue:plan-execute ISS-001,ISS-002

  // 对于本次演示，我们假设从 issues.jsonl 加载
  try {
    const issuesListOutput = Bash("ccw issue list --status registered,planned --json").output;
    const issuesList = JSON.parse(issuesListOutput);

    issuesList.forEach(issue => {
      if (!issues[issue.id]) {
        issues[issue.id] = {
          id: issue.id,
          title: issue.title,
          status: "registered",
          solution_id: null,
          planned_at: null,
          executed_at: null,
          error: null
        };
      }
    });
  } catch (error) {
    console.log("Note: Could not load issues from ccw issue list");
    // 使用来自参数的 issues，或者空列表
  }

  // 3. 显示当前状态
  const totalIssues = Object.keys(issues).length;
  const registeredCount = Object.values(issues).filter(i => i.status === "registered").length;
  const plannedCount = Object.values(issues).filter(i => i.status === "planned").length;
  const completedCount = Object.values(issues).filter(i => i.status === "completed").length;

  console.log("\n=== Issue Status ===");
  console.log(`Total: ${totalIssues} | Registered: ${registeredCount} | Planned: ${plannedCount} | Completed: ${completedCount}`);

  if (totalIssues === 0) {
    console.log("\nNo issues found. Please create issues first using 'ccw issue init'");
    return {
      stateUpdates: {
        context: {
          ...state.context,
          total_issues: 0
        }
      }
    };
  }

  // 4. 显示详细列表
  console.log("\n=== Issue Details ===");
  Object.values(issues).forEach((issue, index) => {
    const status = issue.status === "completed" ? "✓" : issue.status === "planned" ? "→" : "○";
    console.log(`${status} [${index + 1}] ${issue.id}: ${issue.title} (${issue.status})`);
  });

  // 5. 询问用户下一步
  const issueIds = Object.keys(issues);
  const pendingIds = issueIds.filter(id => issues[id].status === "registered");

  if (pendingIds.length === 0) {
    console.log("\nNo unplanned issues. Ready to execute planned solutions.");
    return {
      stateUpdates: {
        context: {
          ...state.context,
          total_issues: totalIssues
        }
      }
    };
  }

  // 6. 显示选项
  console.log("\nNext action:");
  console.log("- Enter 'p' to PLAN selected issues");
  console.log("- Enter 'x' to EXECUTE planned solutions");
  console.log("- Enter 'a' to plan ALL pending issues");
  console.log("- Enter 'q' to QUIT");

  const response = await AskUserQuestion({
    questions: [{
      question: "Select issues to plan (comma-separated numbers, or 'all'):",
      header: "Selection",
      multiSelect: false,
      options: pendingIds.slice(0, 4).map(id => ({
        label: `${issues[id].id}: ${issues[id].title}`,
        description: `Current status: ${issues[id].status}`
      }))
    }]
  });

  // 7. 更新 issues 状态为 "planning"
  const selectedIds = [];
  if (response.Selection === "all") {
    selectedIds.push(...pendingIds);
  } else {
    // 解析用户选择
    selectedIds.push(response.Selection);
  }

  selectedIds.forEach(issueId => {
    if (issues[issueId]) {
      issues[issueId].status = "planning";
    }
  });

  return {
    stateUpdates: {
      issues: issues,
      context: {
        ...state.context,
        total_issues: totalIssues
      }
    }
  };
}
```

## State Updates

```javascript
return {
  stateUpdates: {
    issues: issues,
    context: {
      total_issues: Object.keys(issues).length,
      registered_count: registeredCount,
      planned_count: plannedCount,
      completed_count: completedCount
    }
  }
};
```

## Error Handling

| Error Type | Recovery |
|------------|----------|
| Issues 加载失败 | 使用空列表继续 |
| 用户输入无效 | 要求重新选择 |
| 列表显示异常 | 使用 JSON 格式输出 |

## Next Actions (Hints)

- 有 "planning" issues：执行 action-plan
- 无 pending issues：执行 action-execute
- 用户取消：中止
