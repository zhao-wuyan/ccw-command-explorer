# Quality Standards

质量评估标准和验收条件。

## Quality Dimensions

### 1. Completeness (完整性) - 25%

**定义**：所有必需的结构和字段都存在

- [ ] 所有 issues 都有规划或执行结果
- [ ] 每个 solution 都有完整的 task 列表
- [ ] 每个 task 都有 acceptance criteria
- [ ] 状态日志完整记录

**评分**：
- 90-100%：全部完整，可能有可选字段缺失
- 70-89%：主要字段完整，部分可选字段缺失
- 50-69%：核心字段完整，重要字段缺失
- <50%：结构不完整

### 2. Consistency (一致性) - 25%

**定义**：整个工作流中的术语、格式、风格统一

- [ ] Issue ID/Solution ID 格式统一
- [ ] Status 值遵循规范
- [ ] Task 结构一致
- [ ] 时间戳格式一致（ISO-8601）

**评分**：
- 90-100%：完全一致，无格式混乱
- 70-89%：大部分一致，偶有格式变化
- 50-69%：半数一致，混乱明显
- <50%：严重不一致

### 3. Correctness (正确性) - 25%

**定义**：执行过程中没有错误，验收条件都通过

- [ ] 无 DAG 循环依赖
- [ ] 所有测试通过
- [ ] 所有 acceptance criteria 验证通过
- [ ] 无代码冲突

**评分**：
- 90-100%：完全正确，无错误
- 70-89%：基本正确，<10% 错误率
- 50-69%：有明显错误，10-30% 错误率
- <50%：错误过多，>30% 错误率

### 4. Clarity (清晰度) - 25%

**定义**：文档清晰易读，逻辑清晰

- [ ] Task 描述明确可操作
- [ ] Acceptance criteria 具体明确
- [ ] 报告结构清晰，易理解
- [ ] 错误信息详细有帮助

**评分**：
- 90-100%：非常清晰，一目了然
- 70-89%：大部分清晰，有基本可读性
- 50-69%：部分清晰，理解有难度
- <50%：极不清晰，难以理解

## Quality Gates

### Pass (通过)

**条件**：总分 >= 80%

**结果**：工作流正常完成，可进入下一阶段

**检查清单**：
- [ ] 所有 issues 已规划或执行
- [ ] 成功率 >= 80%
- [ ] 无关键错误
- [ ] 报告完整

### Review (需审查)

**条件**：总分 60-79%

**结果**：工作流部分完成，有可改进项

**常见问题**：
- 部分 task 失败
- 某些验收条件未满足
- 文档不够完整

**改进方式**：
- 检查失败的 task
- 添加缺失的文档
- 优化工作流配置

### Fail (失败)

**条件**：总分 < 60%

**结果**：工作流失败，需重做

**常见原因**：
- 关键 task 失败
- 规划过程中断
- 系统错误过多
- 无法生成有效报告

**恢复方式**：
- 从快照恢复
- 修复根本问题
- 重新规划和执行

## Issue Classification

### Errors (必须修复)

| 错误 | 影响 | 处理 |
|------|------|------|
| DAG 循环依赖 | Critical | 中止规划 |
| 任务无 acceptance | High | 补充条件 |
| 提交失败 | High | 调查并重试 |
| 规划 subagent 超时 | Medium | 重试或跳过 |
| 无效的 solution ID | Medium | 重新生成 |

### Warnings (应该修复)

| 警告 | 影响 | 处理 |
|------|------|------|
| Task 执行时间过长 | Medium | 考虑拆分 |
| 测试覆盖率低 | Medium | 补充测试 |
| 多个解决方案 | Low | 明确选择 |
| Criteria 不具体 | Low | 改进措辞 |

### Info (可选改进)

| 信息 | 说明 |
|------|------|
| 建议任务数 | 2-7 个任务为最优 |
| 时间建议 | 总耗时 <= 2 小时为佳 |
| 代码风格 | 检查是否遵循项目规范 |

## 执行检查清单

### 规划阶段

- [ ] Issue 描述清晰
- [ ] 生成了有效的 solution
- [ ] 所有 task 有 acceptance criteria
- [ ] 依赖关系正确

### 执行阶段

- [ ] 每个 task 实现完整
- [ ] 所有测试通过
- [ ] 所有 acceptance criteria 验证通过
- [ ] 提交信息规范

### 完成阶段

- [ ] 生成了最终报告
- [ ] 统计信息准确
- [ ] 状态持久化完整
- [ ] 快照保存无误

## 自动化验证函数

```javascript
function runQualityChecks(workDir) {
  const state = JSON.parse(Read(`${workDir}/state.json`));
  const issues = state.issues || {};

  const scores = {
    completeness: checkCompleteness(issues),
    consistency: checkConsistency(state),
    correctness: checkCorrectness(issues),
    clarity: checkClarity(state)
  };

  const overall = Object.values(scores).reduce((a, b) => a + b) / 4;

  return {
    scores: scores,
    overall: overall.toFixed(1),
    gate: overall >= 80 ? 'pass' : overall >= 60 ? 'review' : 'fail',
    details: {
      issues_total: Object.keys(issues).length,
      completed: Object.values(issues).filter(i => i.status === 'completed').length,
      failed: Object.values(issues).filter(i => i.status === 'failed').length
    }
  };
}
```

## 报告模板

```markdown
# Quality Report

## Scores

| Dimension | Score | Status |
|-----------|-------|--------|
| Completeness | 90% | ✓ |
| Consistency | 85% | ✓ |
| Correctness | 92% | ✓ |
| Clarity | 88% | ✓ |
| **Overall** | **89%** | **PASS** |

## Issues Summary

- Total: 10
- Completed: 8 (80%)
- Failed: 2 (20%)
- Pending: 0 (0%)

## Recommendations

1. ...
2. ...

## Errors & Warnings

### Errors (0)

None

### Warnings (1)

- Task T4 in ISS-003 took 45 minutes (expected 30)
```
