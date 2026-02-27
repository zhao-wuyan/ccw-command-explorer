# Agent Communication Optimization

优化 agent 通信机制：使用简短的产出文件引用而不是内容传递。

## 背景

在多 agent 系统中，传递完整的文件内容会导致：
- 消息体积过大
- 上下文使用量增加
- 通信效率低下
- 容易引入上下文断层

**优化方案**: 使用文件路径引用，让 agent 自动读取需要的文件。

## 优化原则

### 原则 1: 文件引用而非内容传递

❌ **错误做法**（传递内容）:
```javascript
send_input({
  id: agents.cd,
  message: `
Requirements:
${requirements_content}  // 完整内容 - 浪费空间

Plan:
${plan_json}  // 完整 JSON - 重复信息
`
})
```

✅ **正确做法**（引用文件）:
```javascript
send_input({
  id: agents.cd,
  message: `
## Feedback from Validation

Test failures found. Review these outputs:

## Reference
- Requirements: .workflow/.cycle/${cycleId}.progress/ra/requirements.md (v1.0.0)
- Plan: .workflow/.cycle/${cycleId}.progress/ep/plan.json (v1.0.0)
- Test Results: .workflow/.cycle/${cycleId}.progress/vas/test-results.json

## Issues Found
${summary_of_issues}  // 只传递摘要

## Actions Required
1. Fix OAuth token refresh (test line 45)
2. Update implementation.md with fixes
`
})
```

### 原则 2: 摘要而非全文

❌ **错误**：
```javascript
// 传递所有文件内容
RA输出: "requirements.md (2000 lines) + edge-cases.md (1000 lines) + changes.log (500 lines)"

EP读取: 全文解析所有内容（浪费token）
```

✅ **正确**：
```javascript
// 只传递关键摘要
RA输出:
- 10个功能需求
- 5个非功能需求
- 8个边界场景
- 文件路径用于完整查看

EP读取: 读取摘要 + 需要时查看完整文件（高效）
```

### 原则 3: 文件版本跟踪

每个引用必须包含版本:

```javascript
send_input({
  id: agents.cd,
  message: `
Requirements: .workflow/.cycle/${cycleId}.progress/ra/requirements.md (v1.1.0)
                                                                       ^^^^^^^ 版本号

Plan: .workflow/.cycle/${cycleId}.progress/ep/plan.json (v1.0.0)
                                                          ^^^^^^^ 版本号
`
})
```

**好处**:
- 避免使用过期信息
- 自动检测版本不匹配
- 支持多版本迭代

## 实现模式

### Pattern 1: 通知 + 引用

Agent 向其他 agent 通知输出，而非传递内容：

```javascript
// RA 输出摘要
const raSummary = {
  requirements_count: 10,
  edge_cases_count: 8,
  version: "1.0.0",
  output_file: ".workflow/.cycle/${cycleId}.progress/ra/requirements.md",
  key_requirements: [
    "FR-001: OAuth authentication",
    "FR-002: Multi-provider support",
    "..."  // 只列出标题，不传递完整内容
  ]
}

// 更新状态，让其他 agent 读取
state.requirements = {
  version: raSummary.version,
  output_file: raSummary.output_file,
  summary: raSummary.key_requirements
}

// EP agent 从状态读取
const requiredDetails = state.requirements
const outputFile = requiredDetails.output_file
const requirements = JSON.parse(Read(outputFile))  // EP 自己读取完整文件
```

### Pattern 2: 反馈通知

Orchestrator 发送反馈时只传递摘要和行号：

```javascript
// ❌ 错误：传递完整测试结果
send_input({
  id: agents.cd,
  message: `
Test Results:
${entire_test_results_json}  // 完整 JSON - 太大
`
})

// ✅ 正确：引用文件 + 问题摘要
send_input({
  id: agents.cd,
  message: `
## Test Failures

Full results: .workflow/.cycle/${cycleId}.progress/vas/test-results.json (v1.0.0)

## Quick Summary
- Failed: oauth-refresh (line 45, expected token refresh)
- Failed: concurrent-login (line 78, race condition)

## Fix Instructions
1. Review test cases at referenced lines
2. Fix implementation
3. Re-run tests
4. Update implementation.md

Reference previous file paths if you need full details.
`
})
```

### Pattern 3: 依赖链路

Agent 通过文件引用获取依赖：

```javascript
// EP agent: 从状态读取 RA 输出路径
const raOutputPath = state.requirements?.output_file
if (raOutputPath && exists(raOutputPath)) {
  const requirements = Read(raOutputPath)
  // 使用 requirements 生成计划
}

// CD agent: 从状态读取 EP 输出路径
const epPlanPath = state.plan?.output_file
if (epPlanPath && exists(epPlanPath)) {
  const plan = JSON.parse(Read(epPlanPath))
  // 根据 plan 实现功能
}

// VAS agent: 从状态读取 CD 输出路径
const cdChangesPath = state.changes?.output_file
if (cdChangesPath && exists(cdChangesPath)) {
  const changes = readNDJSON(cdChangesPath)
  // 根据 changes 生成测试
}
```

## 状态文件引用结构

优化后的状态文件应该包含文件路径而不是内容：

```json
{
  "cycle_id": "cycle-v1-20260122-abc123",

  "requirements": {
    "version": "1.0.0",
    "output_files": {
      "specification": ".workflow/.cycle/cycle-v1-20260122-abc123.progress/ra/requirements.md",
      "edge_cases": ".workflow/.cycle/cycle-v1-20260122-abc123.progress/ra/edge-cases.md",
      "changes_log": ".workflow/.cycle/cycle-v1-20260122-abc123.progress/ra/changes.log"
    },
    "summary": {
      "functional_requirements": 10,
      "edge_cases": 8,
      "constraints": 5
    }
  },

  "exploration": {
    "version": "1.0.0",
    "output_files": {
      "exploration": ".workflow/.cycle/cycle-v1-20260122-abc123.progress/ep/exploration.md",
      "architecture": ".workflow/.cycle/cycle-v1-20260122-abc123.progress/ep/architecture.md"
    },
    "summary": {
      "key_components": ["Auth Module", "User Service"],
      "integration_points": 5,
      "identified_risks": 3
    }
  },

  "plan": {
    "version": "1.0.0",
    "output_file": ".workflow/.cycle/cycle-v1-20260122-abc123.progress/ep/plan.json",
    "summary": {
      "total_tasks": 8,
      "critical_path": ["TASK-001", "TASK-003", "TASK-004"],
      "estimated_hours": 16
    }
  },

  "implementation": {
    "version": "1.0.0",
    "output_files": {
      "progress": ".workflow/.cycle/cycle-v1-20260122-abc123.progress/cd/implementation.md",
      "changes": ".workflow/.cycle/cycle-v1-20260122-abc123.progress/cd/changes.log",
      "issues": ".workflow/.cycle/cycle-v1-20260122-abc123.progress/cd/issues.md"
    },
    "summary": {
      "tasks_completed": 3,
      "files_modified": 5,
      "blockers": 0
    }
  },

  "validation": {
    "version": "1.0.0",
    "output_files": {
      "validation": ".workflow/.cycle/cycle-v1-20260122-abc123.progress/vas/validation.md",
      "test_results": ".workflow/.cycle/cycle-v1-20260122-abc123.progress/vas/test-results.json",
      "coverage": ".workflow/.cycle/cycle-v1-20260122-abc123.progress/vas/coverage.md"
    },
    "summary": {
      "pass_rate": 92,
      "coverage": 87,
      "failures": 4
    }
  }
}
```

## Agent 通信模板优化

### 优化前: 完整内容传递

```javascript
send_input({
  id: agents.cd,
  message: `
## Requirements (Complete Content)

${fs.readFileSync(requirementsFile, 'utf8')}  // 2000+ lines

## Plan (Complete JSON)

${fs.readFileSync(planFile, 'utf8')}  // 1000+ lines

## Test Results (Complete)

${fs.readFileSync(testResultsFile, 'utf8')}  // 500+ lines

## Your Task

Fix the implementation...
`  // 总消息体: 4000+ 行
})
```

### 优化后: 文件引用 + 摘要

```javascript
send_input({
  id: agents.cd,
  message: `
## Test Failures - Action Required

Full Test Report: .workflow/.cycle/${cycleId}.progress/vas/test-results.json (v1.0.0)

## Summary of Failures
- oauth-refresh: Expected token refresh, got error (test line 45)
- concurrent-login: Race condition in session writes (test line 78)

## Implementation Reference
- Current Code: .workflow/.cycle/${cycleId}.progress/cd/implementation.md (v1.0.0)
- Code Changes: .workflow/.cycle/${cycleId}.progress/cd/changes.log (v1.0.0)

## Action Required
1. Review failing tests in referenced test results file
2. Fix root causes (race condition, token handling)
3. Update implementation.md with fixes
4. Re-run tests

## Context
- Requirement: .workflow/.cycle/${cycleId}.progress/ra/requirements.md (v1.0.0)
- Plan: .workflow/.cycle/${cycleId}.progress/ep/plan.json (v1.0.0)

Output PHASE_RESULT when complete.
`  // 总消息体: <500 行，高效传递
})
```

## 版本控制最佳实践

### 版本不匹配检测

```javascript
function validateVersionConsistency(state) {
  const versions = {
    ra: state.requirements?.version,
    ep: state.plan?.version,
    cd: state.implementation?.version,
    vas: state.validation?.version
  }

  // 检查版本一致性
  const allVersions = Object.values(versions).filter(v => v)
  const unique = new Set(allVersions)

  if (unique.size > 1) {
    console.warn('Version mismatch detected:')
    console.warn(versions)
    // 返回版本差异，让 orchestrator 决定是否继续
  }

  return unique.size === 1
}
```

### 文件存在性检查

```javascript
function validateReferences(state, cycleId) {
  const checks = []

  // 检查所有引用的文件是否存在
  for (const [agent, data] of Object.entries(state)) {
    if (data?.output_files) {
      for (const [name, path] of Object.entries(data.output_files)) {
        if (!fs.existsSync(path)) {
          checks.push({
            agent: agent,
            file: name,
            path: path,
            status: 'missing'
          })
        }
      }
    }
  }

  return checks
}
```

## 好处总结

| 方面 | 改进 |
|------|------|
| 消息体积 | 减少 80-90% |
| Token 使用 | 减少 60-70% |
| 读取速度 | 无需解析冗余内容 |
| 版本控制 | 清晰的版本跟踪 |
| 上下文清晰 | 不会混淆版本 |
| 可维护性 | 文件变更不需要修改消息 |

## 迁移建议

### 第一步: 更新状态结构

```json
// 从这样:
"requirements": "完整内容"

// 改为这样:
"requirements": {
  "version": "1.0.0",
  "output_file": "path/to/file",
  "summary": {...}
}
```

### 第二步: 更新通信模板

所有 `send_input` 消息改为引用路径。

### 第三步: Agent 自动读取

Agent 从引用路径自动读取所需文件。

### 第四步: 测试版本检测

确保版本不匹配时有警告。
