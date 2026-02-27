# State Schema Definition

状态结构定义和验证规则。

## 初始状态

```json
{
  "status": "pending",
  "phase": "init",
  "work_dir": "",
  "issues": {},
  "queue": [],
  "completed_actions": [],
  "context": {
    "total_issues": 0,
    "completed_count": 0,
    "failed_count": 0
  },
  "errors": [],
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

## 状态转移

```
pending
  ↓
init (Action-Init)
  ↓
running
  ├→ list (Action-List) → Display issues
  ├→ plan (Action-Plan) → Plan issues
  ├→ execute (Action-Execute) → Execute solutions
  ├→ back to list/plan/execute loop
  │
  └→ complete (Action-Complete) → Finalize
       ↓
completed
```

## 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | string | "pending"\|"running"\|"completed" - 全局状态 |
| `phase` | string | "init"\|"listing"\|"planning"\|"executing"\|"complete" - 当前阶段 |
| `work_dir` | string | 工作目录路径 |
| `issues` | object | Issue 状态映射 `{issue_id: IssueState}` |
| `queue` | array | 待执行队列 |
| `completed_actions` | array | 已执行动作 ID 列表 |
| `context` | object | 执行上下文信息 |
| `errors` | array | 错误日志 |

## Issue 状态

```json
{
  "id": "ISS-xxx",
  "title": "Issue title",
  "status": "registered|planning|planned|executing|completed|failed",
  "solution_id": "SOL-xxx-1",
  "planned_at": "ISO-8601",
  "executed_at": "ISO-8601",
  "error": null
}
```

## Queue Item

```json
{
  "item_id": "S-1",
  "issue_id": "ISS-xxx",
  "solution_id": "SOL-xxx-1",
  "status": "pending|executing|completed|failed"
}
```

## 验证函数

```javascript
function validateState(state) {
  // Required fields
  if (!state.status) throw new Error("Missing: status");
  if (!state.phase) throw new Error("Missing: phase");
  if (!state.work_dir) throw new Error("Missing: work_dir");

  // Valid status values
  const validStatus = ["pending", "running", "completed"];
  if (!validStatus.includes(state.status)) {
    throw new Error(`Invalid status: ${state.status}`);
  }

  // Issues structure
  if (typeof state.issues !== "object") {
    throw new Error("issues must be object");
  }

  // Queue is array
  if (!Array.isArray(state.queue)) {
    throw new Error("queue must be array");
  }

  return true;
}
```

## 状态持久化

```javascript
// 保存状态
function saveState(state) {
  const statePath = `${state.work_dir}/state.json`;
  Write(statePath, JSON.stringify(state, null, 2));

  // 保存历史
  const historyPath = `${state.work_dir}/state-history.json`;
  const history = Read(historyPath).then(JSON.parse).catch(() => []);
  history.push({
    timestamp: new Date().toISOString(),
    phase: state.phase,
    completed_actions: state.completed_actions.length,
    issues_count: Object.keys(state.issues).length
  });
  Write(historyPath, JSON.stringify(history, null, 2));
}

// 加载状态
function loadState(workDir) {
  const statePath = `${workDir}/state.json`;
  return JSON.parse(Read(statePath));
}
```
