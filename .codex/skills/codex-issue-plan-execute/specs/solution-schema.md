# Solution Schema Specification

解决方案数据结构和验证规则。

## When to Use

| Phase | Usage | Section |
|-------|-------|---------|
| Phase: action-plan | Solution 生成 | Solution Structure |
| Phase: action-execute | Task 解析 | Task Definition |

---

## Solution Structure

### 完整 Schema

```json
{
  "id": "SOL-ISS-001-1",
  "issue_id": "ISS-001",
  "description": "Fix authentication token expiration by extending TTL",
  "strategy_type": "bugfix",
  "created_at": "2025-01-29T11:00:00Z",
  "tasks": [
    {
      "id": "T1",
      "title": "Update token TTL configuration",
      "action": "Modify",
      "scope": "src/config/auth.ts",
      "description": "Increase JWT token expiration from 1h to 24h",
      "modification_points": [
        {
          "file": "src/config/auth.ts",
          "target": "JWT_EXPIRY",
          "change": "Change value from 3600 to 86400"
        }
      ],
      "implementation": [
        "Open src/config/auth.ts",
        "Locate JWT_EXPIRY constant",
        "Update value: 3600 → 86400",
        "Add comment explaining change"
      ],
      "test": {
        "commands": ["npm test -- auth.config.test.ts"],
        "unit": ["Token expiration should be 24h"],
        "integration": []
      },
      "acceptance": {
        "criteria": [
          "Unit tests pass",
          "Token TTL is correctly set",
          "No breaking changes to API"
        ],
        "verification": [
          "Run: npm test",
          "Manual: Verify token in console"
        ]
      },
      "depends_on": [],
      "estimated_minutes": 15,
      "priority": 1
    }
  ],
  "exploration_context": {
    "relevant_files": [
      "src/config/auth.ts",
      "src/services/auth.service.ts",
      "tests/auth.test.ts"
    ],
    "patterns": "Follow existing config pattern in .env",
    "integration_points": "Used by AuthService in middleware"
  },
  "analysis": {
    "risk": "low",
    "impact": "medium",
    "complexity": "low"
  },
  "score": 0.95,
  "is_bound": true
}
```

## 字段说明

### 基础字段

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | ✓ | 唯一 ID：SOL-{issue-id}-{seq} |
| `issue_id` | string | ✓ | 关联的 Issue ID |
| `description` | string | ✓ | 解决方案描述 |
| `strategy_type` | string | | 策略类型：bugfix/feature/refactor |
| `tasks` | array | ✓ | 任务列表，至少 1 个 |

### Task 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务 ID：T1, T2, ... |
| `title` | string | 任务标题 |
| `action` | string | 动作类型：Create/Modify/Fix/Refactor |
| `scope` | string | 作用范围：文件或目录 |
| `modification_points` | array | 具体修改点列表 |
| `implementation` | array | 实现步骤 |
| `test` | object | 测试命令和用例 |
| `acceptance` | object | 验收条件和验证步骤 |
| `depends_on` | array | 任务依赖：[T1, T2] |
| `estimated_minutes` | number | 预计耗时（分钟） |

### 验收条件

```json
{
  "acceptance": {
    "criteria": [
      "Unit tests pass",
      "Function returns correct result",
      "No performance regression"
    ],
    "verification": [
      "Run: npm test -- module.test.ts",
      "Manual: Call function and verify output"
    ]
  }
}
```

## 验证规则

### 必需字段检查

```javascript
function validateSolution(solution) {
  if (!solution.id) throw new Error("Missing: id");
  if (!solution.issue_id) throw new Error("Missing: issue_id");
  if (!solution.description) throw new Error("Missing: description");
  if (!Array.isArray(solution.tasks)) throw new Error("tasks must be array");
  if (solution.tasks.length === 0) throw new Error("tasks cannot be empty");
  return true;
}

function validateTask(task) {
  if (!task.id) throw new Error("Missing: task.id");
  if (!task.title) throw new Error("Missing: task.title");
  if (!task.action) throw new Error("Missing: task.action");
  if (!Array.isArray(task.implementation)) throw new Error("implementation must be array");
  if (!task.acceptance) throw new Error("Missing: task.acceptance");
  if (!Array.isArray(task.acceptance.criteria)) throw new Error("acceptance.criteria must be array");
  if (task.acceptance.criteria.length === 0) throw new Error("acceptance.criteria cannot be empty");
  return true;
}
```

### 格式验证

- ID 格式：`SOL-ISS-\d+-\d+`
- Action 值：Create | Modify | Fix | Refactor | Add | Remove
- Risk/Impact/Complexity 值：low | medium | high
- Score 范围：0.0 - 1.0

## 任务依赖

### 表示方法

```json
{
  "tasks": [
    {
      "id": "T1",
      "title": "Create auth module",
      "depends_on": []
    },
    {
      "id": "T2",
      "title": "Add authentication logic",
      "depends_on": ["T1"]
    },
    {
      "id": "T3",
      "title": "Add tests",
      "depends_on": ["T1", "T2"]
    }
  ]
}
```

### DAG 验证

```javascript
function validateDAG(tasks) {
  const visited = new Set();
  const recursionStack = new Set();

  function hasCycle(taskId) {
    visited.add(taskId);
    recursionStack.add(taskId);

    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.depends_on) return false;

    for (const dep of task.depends_on) {
      if (!visited.has(dep)) {
        if (hasCycle(dep)) return true;
      } else if (recursionStack.has(dep)) {
        return true;  // 发现循环
      }
    }

    recursionStack.delete(taskId);
    return false;
  }

  for (const task of tasks) {
    if (!visited.has(task.id) && hasCycle(task.id)) {
      throw new Error(`Circular dependency detected: ${task.id}`);
    }
  }
  return true;
}
```

## 文件保存

### 位置

```
.workflow/.scratchpad/codex-issue-{timestamp}/solutions/
├── ISS-001-plan.json           # 规划结果
├── ISS-001-execution.json      # 执行结果
├── ISS-002-plan.json
└── ISS-002-execution.json
```

### 文件内容

**规划结果**：包含 solution 完整定义
**执行结果**：包含执行状态和提交信息

```json
{
  "solution_id": "SOL-ISS-001-1",
  "status": "completed|failed",
  "executed_at": "ISO-8601",
  "execution_result": {
    "files_modified": ["src/auth.ts"],
    "commit_hash": "abc123...",
    "tests_passed": true
  }
}
```

## 质量门控

### Solution 评分标准

| 指标 | 权重 | 评分方法 |
|------|------|----------|
| 任务完整性 | 30% | 无空任务，每个任务有 acceptance |
| 依赖合法性 | 20% | 无循环依赖，依赖链清晰 |
| 验收可测 | 30% | Criteria 明确可测，有验证步骤 |
| 复杂度评估 | 20% | Risk/Impact/Complexity 合理评估 |

### 通过条件

- 所有必需字段存在
- 无格式错误
- 无循环依赖
- Score >= 0.8
