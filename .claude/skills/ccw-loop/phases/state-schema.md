# State Schema

CCW Loop 的状态结构定义（统一版本）。

## 状态文件

**位置**: `.loop/{loopId}.json` (统一位置，API + Skill 共享)

**旧版本位置** (仅向后兼容): `.workflow/.loop/{session-id}/state.json`

## 结构定义

### 统一状态接口 (Unified Loop State)

```typescript
/**
 * Unified Loop State - API 和 Skill 共享的状态结构
 * API (loop-v2-routes.ts) 拥有状态的主控权
 * Skill (ccw-loop) 读取和更新此状态
 */
interface LoopState {
  // =====================================================
  // API FIELDS (from loop-v2-routes.ts)
  // 这些字段由 API 管理，Skill 只读
  // =====================================================

  loop_id: string                // Loop ID, e.g., "loop-v2-20260122-abc123"
  title: string                  // Loop 标题
  description: string            // Loop 描述
  max_iterations: number         // 最大迭代次数
  status: 'created' | 'running' | 'paused' | 'completed' | 'failed'
  current_iteration: number      // 当前迭代次数
  created_at: string             // 创建时间 (ISO8601)
  updated_at: string             // 最后更新时间 (ISO8601)
  completed_at?: string          // 完成时间 (ISO8601)
  failure_reason?: string        // 失败原因

  // =====================================================
  // SKILL EXTENSION FIELDS
  // 这些字段由 Skill 管理，API 只读
  // =====================================================

  skill_state?: {
    // 当前执行动作
    current_action: 'init' | 'develop' | 'debug' | 'validate' | 'complete' | null
    last_action: string | null
    completed_actions: string[]
    mode: 'interactive' | 'auto'

    // === 开发阶段 ===
    develop: {
      total: number
      completed: number
      current_task?: string
      tasks: DevelopTask[]
      last_progress_at: string | null
    }

    // === 调试阶段 ===
    debug: {
      active_bug?: string
      hypotheses_count: number
      hypotheses: Hypothesis[]
      confirmed_hypothesis: string | null
      iteration: number
      last_analysis_at: string | null
    }

    // === 验证阶段 ===
    validate: {
      pass_rate: number           // 测试通过率 (0-100)
      coverage: number            // 覆盖率 (0-100)
      test_results: TestResult[]
      passed: boolean
      failed_tests: string[]
      last_run_at: string | null
    }

    // === 错误追踪 ===
    errors: Array<{
      action: string
      message: string
      timestamp: string
    }>
  }
}

interface DevelopTask {
  id: string
  description: string
  tool: 'gemini' | 'qwen' | 'codex' | 'bash'
  mode: 'analysis' | 'write'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  files_changed: string[]
  created_at: string
  completed_at: string | null
}

interface Hypothesis {
  id: string                    // H1, H2, ...
  description: string
  testable_condition: string
  logging_point: string
  evidence_criteria: {
    confirm: string
    reject: string
  }
  likelihood: number            // 1 = 最可能
  status: 'pending' | 'confirmed' | 'rejected' | 'inconclusive'
  evidence: Record<string, any> | null
  verdict_reason: string | null
}

interface TestResult {
  test_name: string
  suite: string
  status: 'passed' | 'failed' | 'skipped'
  duration_ms: number
  error_message: string | null
  stack_trace: string | null
}
```

## 初始状态

### 由 API 创建时 (Dashboard 触发)

```json
{
  "loop_id": "loop-v2-20260122-abc123",
  "title": "Implement user authentication",
  "description": "Add login/logout functionality",
  "max_iterations": 10,
  "status": "created",
  "current_iteration": 0,
  "created_at": "2026-01-22T10:00:00+08:00",
  "updated_at": "2026-01-22T10:00:00+08:00"
}
```

### 由 Skill 初始化后 (action-init)

```json
{
  "loop_id": "loop-v2-20260122-abc123",
  "title": "Implement user authentication",
  "description": "Add login/logout functionality",
  "max_iterations": 10,
  "status": "running",
  "current_iteration": 0,
  "created_at": "2026-01-22T10:00:00+08:00",
  "updated_at": "2026-01-22T10:00:05+08:00",

  "skill_state": {
    "current_action": "init",
    "last_action": null,
    "completed_actions": [],
    "mode": "auto",

    "develop": {
      "total": 3,
      "completed": 0,
      "current_task": null,
      "tasks": [
        { "id": "task-001", "description": "Create auth component", "status": "pending" }
      ],
      "last_progress_at": null
    },

    "debug": {
      "active_bug": null,
      "hypotheses_count": 0,
      "hypotheses": [],
      "confirmed_hypothesis": null,
      "iteration": 0,
      "last_analysis_at": null
    },

    "validate": {
      "pass_rate": 0,
      "coverage": 0,
      "test_results": [],
      "passed": false,
      "failed_tests": [],
      "last_run_at": null
    },

    "errors": []
  }
}
```

## 控制信号检查 (Control Signals)

Skill 在每个 Action 开始前必须检查控制信号：

```javascript
/**
 * 检查 API 控制信号
 * @returns { continue: boolean, action: 'pause_exit' | 'stop_exit' | 'continue' }
 */
function checkControlSignals(loopId) {
  const state = JSON.parse(Read(`.loop/${loopId}.json`))

  switch (state.status) {
    case 'paused':
      // API 暂停了循环，Skill 应退出等待 resume
      return { continue: false, action: 'pause_exit' }

    case 'failed':
      // API 停止了循环 (用户手动停止)
      return { continue: false, action: 'stop_exit' }

    case 'running':
      // 正常继续
      return { continue: true, action: 'continue' }

    default:
      // 异常状态
      return { continue: false, action: 'stop_exit' }
  }
}
```

### 在 Action 中使用

```markdown
## Execution

### Step 1: Check Control Signals

\`\`\`javascript
const control = checkControlSignals(loopId)
if (!control.continue) {
  // 输出退出原因
  console.log(`Loop ${control.action}: status = ${state.status}`)

  // 如果是 pause_exit，保存当前进度
  if (control.action === 'pause_exit') {
    updateSkillState(loopId, { current_action: 'paused' })
  }

  return  // 退出 Action
}
\`\`\`

### Step 2: Execute Action Logic
...
```

## 状态转换规则

### 1. 初始化 (action-init)

```javascript
// Skill 初始化后
{
  // API 字段更新
  status: 'created' → 'running',  // 或保持 'running' 如果 API 已设置
  updated_at: timestamp,

  // Skill 字段初始化
  skill_state: {
    current_action: 'init',
    mode: 'auto',
    develop: {
      tasks: [...parsed_tasks],
      total: N,
      completed: 0
    }
  }
}
```

### 2. 开发进行中 (action-develop-with-file)

```javascript
// 开发任务执行后
{
  updated_at: timestamp,
  current_iteration: state.current_iteration + 1,

  skill_state: {
    current_action: 'develop',
    last_action: 'action-develop-with-file',
    completed_actions: [...state.skill_state.completed_actions, 'action-develop-with-file'],
    develop: {
      current_task: 'task-xxx',
      completed: N+1,
      last_progress_at: timestamp
    }
  }
}
```

### 3. 调试进行中 (action-debug-with-file)

```javascript
// 调试执行后
{
  updated_at: timestamp,
  current_iteration: state.current_iteration + 1,

  skill_state: {
    current_action: 'debug',
    last_action: 'action-debug-with-file',
    debug: {
      active_bug: '...',
      hypotheses_count: N,
      hypotheses: [...new_hypotheses],
      iteration: N+1,
      last_analysis_at: timestamp
    }
  }
}
```

### 4. 验证完成 (action-validate-with-file)

```javascript
// 验证执行后
{
  updated_at: timestamp,
  current_iteration: state.current_iteration + 1,

  skill_state: {
    current_action: 'validate',
    last_action: 'action-validate-with-file',
    validate: {
      test_results: [...results],
      pass_rate: 95.5,
      coverage: 85.0,
      passed: true | false,
      failed_tests: ['test1', 'test2'],
      last_run_at: timestamp
    }
  }
}
```

### 5. 完成 (action-complete)

```javascript
// 循环完成后
{
  status: 'running' → 'completed',
  completed_at: timestamp,
  updated_at: timestamp,

  skill_state: {
    current_action: 'complete',
    last_action: 'action-complete'
  }
}
```

## 状态派生字段

以下字段可从状态计算得出，不需要存储：

```javascript
// 开发完成度
const developProgress = state.develop.total_count > 0
  ? (state.develop.completed_count / state.develop.total_count) * 100
  : 0

// 是否有待开发任务
const hasPendingDevelop = state.develop.tasks.some(t => t.status === 'pending')

// 调试是否完成
const debugCompleted = state.debug.confirmed_hypothesis !== null

// 验证是否通过
const validationPassed = state.validate.passed && state.validate.test_results.length > 0

// 整体进度
const overallProgress = (
  (developProgress * 0.5) +
  (debugCompleted ? 25 : 0) +
  (validationPassed ? 25 : 0)
)
```

## 文件同步

### 统一位置 (Unified Location)

状态与文件的对应关系：

| 状态字段 | 同步文件 | 同步时机 |
|----------|----------|----------|
| 整个 LoopState | `.loop/{loopId}.json` | 每次状态变更 (主文件) |
| `skill_state.develop` | `.loop/{loopId}.progress/develop.md` | 每次开发操作后 |
| `skill_state.debug` | `.loop/{loopId}.progress/debug.md` | 每次调试操作后 |
| `skill_state.validate` | `.loop/{loopId}.progress/validate.md` | 每次验证操作后 |
| 代码变更日志 | `.loop/{loopId}.progress/changes.log` | 每次文件修改 (NDJSON) |
| 调试日志 | `.loop/{loopId}.progress/debug.log` | 每次调试日志 (NDJSON) |

### 文件结构示例

```
.loop/
├── loop-v2-20260122-abc123.json         # 主状态文件 (API + Skill)
├── loop-v2-20260122-abc123.tasks.jsonl  # 任务列表 (API 管理)
└── loop-v2-20260122-abc123.progress/    # Skill 进度文件
    ├── develop.md                       # 开发进度
    ├── debug.md                         # 调试理解
    ├── validate.md                      # 验证报告
    ├── changes.log                      # 代码变更 (NDJSON)
    └── debug.log                        # 调试日志 (NDJSON)
```

## 状态恢复

如果主状态文件 `.loop/{loopId}.json` 损坏，可以从进度文件重建 skill_state:

```javascript
function rebuildSkillStateFromProgress(loopId) {
  const progressDir = `.loop/${loopId}.progress`

  // 尝试从进度文件解析状态
  const skill_state = {
    develop: parseProgressFile(`${progressDir}/develop.md`),
    debug: parseProgressFile(`${progressDir}/debug.md`),
    validate: parseProgressFile(`${progressDir}/validate.md`)
  }

  return skill_state
}

// 解析进度 Markdown 文件
function parseProgressFile(filePath) {
  const content = Read(filePath)
  if (!content) return null

  // 从 Markdown 表格和结构中提取数据
  // ... implementation
}
```

### 恢复策略

1. **API 字段**: 无法恢复 - 需要从 API 重新获取或用户手动输入
2. **skill_state 字段**: 可以从 `.progress/` 目录的 Markdown 文件解析
3. **任务列表**: 从 `.loop/{loopId}.tasks.jsonl` 恢复

## 状态验证

```javascript
function validateState(state) {
  const errors = []

  // 必需字段
  if (!state.session_id) errors.push('Missing session_id')
  if (!state.task_description) errors.push('Missing task_description')

  // 状态一致性
  if (state.initialized && state.status === 'pending') {
    errors.push('Inconsistent: initialized but status is pending')
  }

  if (state.status === 'completed' && !state.validate.passed) {
    errors.push('Inconsistent: completed but validation not passed')
  }

  // 开发任务一致性
  const completedTasks = state.develop.tasks.filter(t => t.status === 'completed').length
  if (completedTasks !== state.develop.completed_count) {
    errors.push('Inconsistent: completed_count mismatch')
  }

  return { valid: errors.length === 0, errors }
}
```
