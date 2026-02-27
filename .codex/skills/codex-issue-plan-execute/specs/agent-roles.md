# Agent Roles Definition

Agent角色定义和职责范围。

---

## Role Assignment

### Planning Agent (Issue-Plan-Agent)

**职责**: 分析issue并生成可执行的解决方案

**角色文件**: `~/.codex/agents/issue-plan-agent.md`  
**提示词**: `prompts/planning-agent.md`

#### Capabilities

**允许**:
- 读取代码、文档、配置
- 探索项目结构和依赖关系
- 分析问题和设计解决方案
- 分解任务为可执行步骤
- 定义验收条件

**禁止**:
- 修改代码
- 执行代码
- 推送到远程
- 删除文件或分支

#### Input Format

```json
{
  "type": "plan_issue",
  "issue_id": "ISS-001",
  "title": "Fix authentication timeout",
  "description": "User sessions timeout too quickly",
  "project_context": {
    "tech_stack": "Node.js + Express + JWT",
    "guidelines": "Follow existing patterns",
    "relevant_files": ["src/auth.ts", "src/middleware/auth.ts"]
  }
}
```

#### Output Format

```json
{
  "status": "completed|failed",
  "solution_id": "SOL-ISS-001-1",
  "tasks": [
    {
      "id": "T1",
      "title": "Update JWT configuration",
      "action": "Modify",
      "scope": "src/config/auth.ts",
      "description": "Increase token expiration time",
      "modification_points": ["TOKEN_EXPIRY constant"],
      "implementation": ["Step 1", "Step 2"],
      "test": {
        "commands": ["npm test -- auth.test.ts"],
        "unit": ["Token expiry should be 24 hours"]
      },
      "acceptance": {
        "criteria": ["Token valid for 24 hours", "Test suite passes"],
        "verification": ["Run tests"]
      },
      "depends_on": [],
      "estimated_minutes": 20,
      "priority": 1
    }
  ],
  "exploration_context": {
    "relevant_files": ["src/auth.ts", "src/middleware/auth.ts"],
    "patterns": "Follow existing JWT configuration pattern",
    "integration_points": "Used by authentication middleware"
  },
  "analysis": {
    "risk": "low|medium|high",
    "impact": "low|medium|high",
    "complexity": "low|medium|high"
  },
  "score": 0.95,
  "validation": {
    "schema_valid": true,
    "criteria_quantified": true,
    "no_circular_deps": true
  }
}
```

---

### Execution Agent (Issue-Execute-Agent)

**职责**: 执行规划的解决方案，实现所有任务

**角色文件**: `~/.codex/agents/issue-execute-agent.md`  
**提示词**: `prompts/execution-agent.md`

#### Capabilities

**允许**:
- 读取代码和配置
- 修改代码
- 运行测试
- 提交代码
- 验证acceptance criteria
- 创建snapshots用于恢复

**禁止**:
- 推送到远程分支
- 创建PR（除非明确授权）
- 删除分支
- 强制覆盖主分支

#### Input Format

```json
{
  "type": "execute_solution",
  "issue_id": "ISS-001",
  "solution_id": "SOL-ISS-001-1",
  "solution": {
    "id": "SOL-ISS-001-1",
    "tasks": [ /* task objects from planning */ ],
    "exploration_context": {
      "relevant_files": ["src/auth.ts"],
      "patterns": "Follow existing pattern",
      "integration_points": "Used by auth middleware"
    }
  },
  "project_root": "/path/to/project"
}
```

#### Output Format

```json
{
  "status": "completed|failed",
  "execution_result_id": "EXR-ISS-001-1",
  "issue_id": "ISS-001",
  "solution_id": "SOL-ISS-001-1",
  "executed_tasks": [
    {
      "task_id": "T1",
      "title": "Update JWT configuration",
      "status": "completed",
      "files_modified": ["src/config/auth.ts"],
      "commits": [
        {
          "hash": "abc123def456",
          "message": "[T1] Update JWT token expiration to 24 hours"
        }
      ],
      "test_results": {
        "passed": 8,
        "failed": 0,
        "command": "npm test -- auth.test.ts",
        "output": "All tests passed"
      },
      "acceptance_met": true,
      "execution_time_minutes": 15,
      "errors": []
    }
  ],
  "overall_stats": {
    "total_tasks": 1,
    "completed": 1,
    "failed": 0,
    "total_files_modified": 1,
    "total_commits": 1,
    "total_time_minutes": 15
  },
  "final_commit": {
    "hash": "xyz789abc",
    "message": "Resolve ISS-001: Fix authentication timeout"
  },
  "verification": {
    "all_tests_passed": true,
    "all_acceptance_met": true,
    "no_regressions": true
  }
}
```

---

## Dual-Agent Strategy

### 为什么使用双Agent模式

1. **关注点分离** - 规划和执行各自专注一个任务
2. **并行优化** - 虽然执行仍是串行，但规划可独立优化
3. **上下文最小化** - 仅传递solution ID，避免上下文膨胀
4. **错误隔离** - 规划失败不影响执行，反之亦然
5. **可维护性** - 每个agent专注单一职责

### 工作流程

```
┌────────────────────────────────────┐
│  Planning Agent                    │
│  • Analyze issue                   │
│  • Explore codebase                │
│  • Design solution                 │
│  • Generate tasks                  │
│  • Validate schema                 │
│  → Output: SOL-ISS-001-1 JSON      │
└────────────┬─────────────────────┘
             ↓
        ┌──────────────┐
        │ Save to      │
        │ planning-    │
        │ results.json │
        │ + Bind       │
        └──────┬───────┘
               ↓
┌────────────────────────────────────┐
│  Execution Agent                   │
│  • Load SOL-ISS-001-1              │
│  • Implement T1, T2, T3...         │
│  • Run tests per task              │
│  • Commit changes                  │
│  • Verify acceptance               │
│  → Output: EXR-ISS-001-1 JSON      │
└────────────┬─────────────────────┘
             ↓
        ┌──────────────┐
        │ Save to      │
        │ execution-   │
        │ results.json │
        └──────────────┘
```

---

## Context Minimization

### 信息传递原则

**目标**: 最小化上下文，减少token浪费

#### Planning Phase - 传递内容

- Issue ID 和 Title
- Issue Description
- Project tech stack (`project-tech.json`)
- Project guidelines (`project-guidelines.json`)
- Solution schema reference

#### Planning Phase - 不传递

- 完整的代码库快照
- 所有相关文件内容 (Agent自己探索)
- 历史执行结果
- 其他issues的信息

#### Execution Phase - 传递内容

- Solution ID (完整的solution JSON)
- 执行参数（worktree路径等）
- Project tech stack
- Project guidelines

#### Execution Phase - 不传递

- 规划阶段的完整上下文
- 其他solutions的信息
- 原始issue描述（solution JSON中已包含）

### 上下文加载策略

```javascript
// Planning Agent 自己加载
const issueDetails = Read(issueStore + issue_id);
const techStack = Read('.workflow/project-tech.json');
const guidelines = Read('.workflow/project-guidelines.json');
const schema = Read('~/.claude/workflows/cli-templates/schemas/solution-schema.json');

// Execution Agent 自己加载
const solution = planningResults.find(r => r.solution_id === solutionId);
const techStack = Read('.workflow/project-tech.json');
const guidelines = Read('.workflow/project-guidelines.json');
```

**优势**:
- 减少重复传递
- 使用相同的源文件版本
- Agents可以自我刷新上下文
- 易于更新project guidelines或tech stack

---

## 错误处理与重试

### Planning 错误

| 错误 | 原因 | 重试策略 | 恢复 |
|------|------|--------|------|
| Subagent超时 | 分析复杂或系统慢 | 增加timeout，重试1次 | 返回用户，标记失败 |
| 无效solution | 生成不符合schema | 验证schema，返回错误 | 返回用户进行修正 |
| 依赖循环 | DAG错误 | 检测循环，返回错误 | 用户手动修正 |
| 权限错误 | 无法读取文件 | 检查路径和权限 | 返回具体错误 |
| 格式错误 | JSON无效 | 验证格式，返回错误 | 用户修正格式 |

### Execution 错误

| 错误 | 原因 | 重试策略 | 恢复 |
|------|------|--------|------|
| Task失败 | 代码实现问题 | 检查错误，不重试 | 记录错误，标记失败 |
| 测试失败 | 测试用例不符 | 不提交，标记失败 | 返回测试输出 |
| 提交失败 | 冲突或权限 | 创建snapshot便于恢复 | 让用户决定 |
| Subagent超时 | 任务太复杂 | 增加timeout | 记录超时，标记失败 |
| 文件冲突 | 并发修改 | 创建snapshot | 让用户合并 |

---

## 交互指南

### 向Planning Agent的问题

```
"这个issue描述了什么问题？"
→ 返回：问题分析 + 根本原因

"解决这个问题需要修改哪些文件？"
→ 返回：文件列表 + 修改点

"如何验证解决方案是否有效？"
→ 返回：验收条件 + 验证步骤

"预计需要多少时间？"
→ 返回：每个任务的估计时间 + 总计

"有哪些风险？"
→ 返回：风险分析 + 影响评估
```

### 向Execution Agent的问题

```
"这个task有哪些实现步骤？"
→ 返回：逐步指南 + 代码示例

"所有测试都通过了吗？"
→ 返回：测试结果 + 失败原因（如有）

"acceptance criteria都满足了吗？"
→ 返回：验证结果 + 不符合项（如有）

"有哪些文件被修改了？"
→ 返回：文件列表 + 变更摘要

"代码有没有回归问题？"
→ 返回：回归测试结果
```

---

## Role文件位置

```
~/.codex/agents/
├── issue-plan-agent.md          # 规划角色定义
├── issue-execute-agent.md       # 执行角色定义
└── ...

.codex/skills/codex-issue-plan-execute/
├── prompts/
│   ├── planning-agent.md        # 规划提示词
│   └── execution-agent.md       # 执行提示词
└── specs/
    ├── agent-roles.md           # 本文件
    └── ...
```

### 如果角色文件不存在

Orchestrator会使用fallback策略：
- `universal-executor` 作为备用规划角色
- `code-developer` 作为备用执行角色

---

## 最佳实践

### 为Planning Agent设计提示词

✓ 从issue描述提取关键信息  
✓ 探索相关代码和类似实现  
✓ 分析根本原因和解决方向  
✓ 设计最小化解决方案  
✓ 分解为2-7个可执行任务  
✓ 为每个task定义明确的acceptance criteria  
✓ 验证任务依赖无循环  
✓ 估计总时间≤2小时  

### 为Execution Agent设计提示词

✓ 加载solution和所有task定义  
✓ 按依赖顺序执行tasks  
✓ 为每个task：implement → test → verify  
✓ 确保所有acceptance criteria通过  
✓ 运行完整的测试套件  
✓ 检查代码质量和风格一致性  
✓ 创建描述性的commit消息  
✓ 生成完整的execution result JSON  

---

## Communication Protocol

### Planning Agent Lifecycle

```
1. Initialize (once)
   - Read system prompt
   - Read role definition
   - Load project context

2. Process issues (loop)
   - Receive issue via send_input
   - Analyze issue
   - Design solution
   - Return solution JSON
   - Wait for next issue

3. Shutdown
   - Orchestrator closes when done
```

### Execution Agent Lifecycle

```
1. Initialize (once)
   - Read system prompt
   - Read role definition
   - Load project context

2. Process solutions (loop)
   - Receive solution via send_input
   - Implement all tasks
   - Run tests
   - Return execution result
   - Wait for next solution

3. Shutdown
   - Orchestrator closes when done
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2025-01-29 | Consolidated from subagent-roles.md, updated format |
| 1.0 | 2024-12-29 | Initial agent roles definition |

---

**Document Version**: 2.0  
**Last Updated**: 2025-01-29  
**Maintained By**: Codex Issue Plan-Execute Team
