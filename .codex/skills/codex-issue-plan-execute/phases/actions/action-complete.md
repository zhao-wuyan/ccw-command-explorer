# Action: Complete

完成工作流并生成最终报告。

## Purpose

序列化最终状态，生成执行摘要，清理临时文件。

## Preconditions

- [ ] `state.status === "running"`
- [ ] 所有 issues 已处理或错误限制达到

## Execution

```javascript
async function execute(state) {
  const workDir = state.work_dir;
  const issues = state.issues || {};

  console.log("\n=== Finalizing Workflow ===");

  // 1. 生成统计信息
  const totalIssues = Object.keys(issues).length;
  const completedCount = Object.values(issues).filter(i => i.status === "completed").length;
  const failedCount = Object.values(issues).filter(i => i.status === "failed").length;
  const pendingCount = totalIssues - completedCount - failedCount;

  const stats = {
    total_issues: totalIssues,
    completed: completedCount,
    failed: failedCount,
    pending: pendingCount,
    success_rate: totalIssues > 0 ? ((completedCount / totalIssues) * 100).toFixed(1) : 0,
    duration_ms: new Date() - new Date(state.created_at)
  };

  console.log("\n=== Summary ===");
  console.log(`Total Issues: ${stats.total_issues}`);
  console.log(`✓ Completed: ${stats.completed}`);
  console.log(`✗ Failed: ${stats.failed}`);
  console.log(`○ Pending: ${stats.pending}`);
  console.log(`Success Rate: ${stats.success_rate}%`);
  console.log(`Duration: ${(stats.duration_ms / 1000).toFixed(1)}s`);

  // 2. 生成详细报告
  const reportLines = [
    "# Execution Report",
    "",
    `## Summary`,
    `- Total Issues: ${stats.total_issues}`,
    `- Completed: ${stats.completed}`,
    `- Failed: ${stats.failed}`,
    `- Pending: ${stats.pending}`,
    `- Success Rate: ${stats.success_rate}%`,
    `- Duration: ${(stats.duration_ms / 1000).toFixed(1)}s`,
    "",
    "## Results by Issue"
  ];

  Object.values(issues).forEach((issue, index) => {
    const status = issue.status === "completed" ? "✓" : issue.status === "failed" ? "✗" : "○";
    reportLines.push(`### ${status} [${index + 1}] ${issue.id}: ${issue.title}`);
    reportLines.push(`- Status: ${issue.status}`);
    if (issue.solution_id) {
      reportLines.push(`- Solution: ${issue.solution_id}`);
    }
    if (issue.planned_at) {
      reportLines.push(`- Planned: ${issue.planned_at}`);
    }
    if (issue.executed_at) {
      reportLines.push(`- Executed: ${issue.executed_at}`);
    }
    if (issue.error) {
      reportLines.push(`- Error: ${issue.error}`);
    }
    reportLines.push("");
  });

  if (state.errors && state.errors.length > 0) {
    reportLines.push("## Errors");
    state.errors.forEach(error => {
      reportLines.push(`- [${error.timestamp}] ${error.action}: ${error.message}`);
    });
    reportLines.push("");
  }

  reportLines.push("## Files Generated");
  reportLines.push(`- Work Directory: ${workDir}`);
  reportLines.push(`- State File: ${workDir}/state.json`);
  reportLines.push(`- Execution Results: ${workDir}/execution-results.json`);
  reportLines.push(`- Solutions: ${workDir}/solutions/`);
  reportLines.push(`- Snapshots: ${workDir}/snapshots/`);

  // 3. 保存报告
  const reportPath = `${workDir}/final-report.md`;
  Write(reportPath, reportLines.join("\n"));

  // 4. 保存最终状态
  const finalState = {
    ...state,
    status: "completed",
    phase: "completed",
    completed_at: new Date().toISOString(),
    completed_actions: [...state.completed_actions, "action-complete"],
    context: {
      ...state.context,
      ...stats
    }
  };

  Write(`${workDir}/state.json`, JSON.stringify(finalState, null, 2));

  // 5. 保存汇总 JSON
  Write(`${workDir}/summary.json`, JSON.stringify({
    status: "completed",
    stats: stats,
    report_file: reportPath,
    work_dir: workDir,
    completed_at: new Date().toISOString()
  }, null, 2));

  // 6. 输出完成消息
  console.log(`\n✓ Workflow completed`);
  console.log(`📄 Report: ${reportPath}`);
  console.log(`📁 Working directory: ${workDir}`);

  return {
    stateUpdates: {
      status: "completed",
      phase: "completed",
      completed_at: new Date().toISOString(),
      completed_actions: [...state.completed_actions, "action-complete"],
      context: finalState.context
    }
  };
}
```

## State Updates

```javascript
return {
  stateUpdates: {
    status: "completed",
    phase: "completed",
    completed_at: timestamp,
    completed_actions: [...state.completed_actions, "action-complete"],
    context: {
      total_issues: stats.total_issues,
      completed_count: stats.completed,
      failed_count: stats.failed,
      success_rate: stats.success_rate
    }
  }
};
```

## Error Handling

| Error Type | Recovery |
|------------|----------|
| 报告生成失败 | 输出文本摘要到控制台 |
| 文件写入失败 | 继续完成，允许手动保存 |
| 权限错误 | 使用替代目录 |

## Next Actions (Hints)

- 无（终止状态）
- 用户可选择：
  - 查看报告：`cat {report_path}`
  - 恢复并重试失败的 issues：`codex issue:plan-execute --resume {work_dir}`
  - 清理临时文件：`rm -rf {work_dir}`
