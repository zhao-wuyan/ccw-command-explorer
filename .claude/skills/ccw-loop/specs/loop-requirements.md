# Loop Requirements Specification

CCW Loop 的核心需求和约束定义。

## Core Requirements

### 1. 无状态循环

**Requirement**: 每次执行从文件读取状态，执行后写回文件，不依赖内存状态。

**Rationale**: 支持随时中断和恢复，状态持久化。

**Validation**:
- [ ] 每个 action 开始时从文件读取状态
- [ ] 每个 action 结束时将状态写回文件
- [ ] 无全局变量或内存状态依赖

### 2. 文件驱动进度

**Requirement**: 所有进度、理解、验证结果都记录在专用 Markdown 文件中。

**Rationale**: 可审计、可回顾、团队可见。

**Validation**:
- [ ] develop/progress.md 记录开发进度
- [ ] debug/understanding.md 记录理解演变
- [ ] validate/validation.md 记录验证结果
- [ ] 所有文件使用 Markdown 格式，易读

### 3. CLI 工具集成

**Requirement**: 关键决策点使用 Gemini/CLI 进行深度分析。

**Rationale**: 利用 LLM 能力提高质量。

**Validation**:
- [ ] 任务分解使用 Gemini
- [ ] 假设生成使用 Gemini
- [ ] 证据分析使用 Gemini
- [ ] 质量评估使用 Gemini

### 4. 用户控制循环

**Requirement**: 支持交互式和自动循环两种模式，用户可随时介入。

**Rationale**: 灵活性，适应不同场景。

**Validation**:
- [ ] 交互模式：每步显示菜单
- [ ] 自动模式：按预设流程执行
- [ ] 用户可随时退出
- [ ] 状态可恢复

### 5. 可恢复性

**Requirement**: 任何时候中断后，可以从上次位置继续。

**Rationale**: 长时间任务支持，意外中断恢复。

**Validation**:
- [ ] 状态保存在 state.json
- [ ] 使用 --resume 可继续
- [ ] 历史记录完整保留

## Quality Standards

### Completeness

| Dimension | Threshold |
|-----------|-----------|
| 进度文档完整性 | 每个任务都有记录 |
| 理解文档演变 | 每次迭代都有更新 |
| 验证报告详尽 | 包含所有测试结果 |

### Consistency

| Dimension | Threshold |
|-----------|-----------|
| 文件格式一致 | 所有 Markdown 文件使用相同模板 |
| 状态同步一致 | state.json 与文件内容匹配 |
| 时间戳格式 | 统一使用 ISO8601 格式 |

### Usability

| Dimension | Threshold |
|-----------|-----------|
| 菜单易用性 | 选项清晰，描述准确 |
| 进度可见性 | 随时可查看当前状态 |
| 错误提示 | 错误消息清晰，提供恢复建议 |

## Constraints

### 1. 文件结构约束

```
.workflow/.loop/{session-id}/
├── meta.json           # 只写一次，不再修改
├── state.json          # 每次 action 后更新
├── develop/
│   ├── progress.md     # 只追加，不删除
│   ├── tasks.json      # 任务状态更新
│   └── changes.log     # NDJSON 格式，只追加
├── debug/
│   ├── understanding.md   # 只追加，记录时间线
│   ├── hypotheses.json    # 更新假设状态
│   └── debug.log          # NDJSON 格式
└── validate/
    ├── validation.md      # 每次验证追加
    ├── test-results.json  # 累积测试结果
    └── coverage.json      # 最新覆盖率
```

### 2. 命名约束

- Session ID: `LOOP-{slug}-{YYYY-MM-DD}`
- Task ID: `task-{NNN}` (三位数字)
- Hypothesis ID: `H{N}` (单字母+数字)

### 3. 状态转换约束

```
pending → running → completed
              ↓
         user_exit
              ↓
            failed
```

Only allow: `pending→running`, `running→completed/user_exit/failed`

### 4. 错误限制约束

- 最大错误次数: 3
- 超过 3 次错误 → 自动终止
- 每次错误 → 记录到 state.errors[]

### 5. 迭代限制约束

- 最大迭代次数: 10 (警告)
- 超过 10 次 → 警告用户，但不强制停止
- 建议拆分任务或休息

## Integration Requirements

### 1. Dashboard 集成

**Requirement**: 与 CCW Dashboard Loop Monitor 无缝集成。

**Specification**:
- Dashboard 创建 Loop → 调用此 Skill
- state.json → Dashboard 实时显示
- 任务列表双向同步
- 状态控制按钮映射到 actions

### 2. Issue 系统集成

**Requirement**: 完成后可扩展为 Issue。

**Specification**:
- 支持维度: test, enhance, refactor, doc
- 调用 `/issue:new "{summary} - {dimension}"`
- 自动填充上下文

### 3. CLI 工具集成

**Requirement**: 使用 CCW CLI 工具进行分析和实现。

**Specification**:
- 任务分解: `--rule planning-breakdown-task-steps`
- 代码实现: `--rule development-implement-feature`
- 根因分析: `--rule analysis-diagnose-bug-root-cause`
- 质量评估: `--rule analysis-review-code-quality`

## Non-Functional Requirements

### Performance

- Session 初始化: < 5s
- Action 执行: < 30s (不含 CLI 调用)
- 状态读写: < 1s

### Reliability

- 状态文件损坏恢复: 支持从其他文件重建
- CLI 工具失败降级: 回退到手动模式
- 错误重试: 支持一次自动重试

### Maintainability

- 文档化: 所有 action 都有清晰说明
- 模块化: 每个 action 独立可测
- 可扩展: 易于添加新 action
