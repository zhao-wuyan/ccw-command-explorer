# Action: Initialize

初始化 Skill 执行状态和工作目录。

## Purpose

设置初始状态，创建工作目录，准备执行环境。

## Preconditions

- [ ] `state.status === "pending"`

## Execution

```javascript
async function execute(state) {
  // 创建工作目录
  const timestamp = new Date().toISOString().slice(0,19).replace(/[-:T]/g, '');
  const workDir = `.workflow/.scratchpad/codex-issue-${timestamp}`;

  Bash(`mkdir -p "${workDir}/solutions" "${workDir}/snapshots"`);

  // 初始化状态
  const initialState = {
    status: "running",
    phase: "initialized",
    work_dir: workDir,
    issues: {},
    queue: [],
    completed_actions: ["action-init"],
    context: {
      total_issues: 0,
      completed_count: 0,
      failed_count: 0
    },
    errors: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 保存初始状态
  Write(`${workDir}/state.json`, JSON.stringify(initialState, null, 2));
  Write(`${workDir}/state-history.json`, JSON.stringify([{
    timestamp: initialState.created_at,
    phase: "init",
    completed_actions: 1,
    issues_count: 0
  }], null, 2));

  console.log(`✓ Initialized: ${workDir}`);

  return {
    stateUpdates: {
      status: "running",
      phase: "initialized",
      work_dir: workDir,
      completed_actions: ["action-init"]
    }
  };
}
```

## State Updates

```javascript
return {
  stateUpdates: {
    status: "running",
    phase: "initialized",
    work_dir: workDir,
    completed_actions: ["action-init"]
  }
};
```

## Error Handling

| Error Type | Recovery |
|------------|----------|
| 目录创建失败 | 检查权限，使用临时目录 |
| 文件写入失败 | 重试或切换存储位置 |

## Next Actions (Hints)

- 成功：进入 listing phase，执行 action-list
- 失败：中止工作流
