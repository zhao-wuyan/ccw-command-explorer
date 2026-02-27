# Validation Report Template

验证报告的标准模板。

## Template Structure

```markdown
# Validation Report

**Session ID**: {{session_id}}
**Task**: {{task_description}}
**Validated**: {{timestamp}}

---

## Iteration {{iteration}} - Validation Run

### Test Execution Summary

| Metric | Value |
|--------|-------|
| Total Tests | {{total_tests}} |
| Passed | {{passed_tests}} |
| Failed | {{failed_tests}} |
| Skipped | {{skipped_tests}} |
| Duration | {{duration}}ms |
| **Pass Rate** | **{{pass_rate}}%** |

### Coverage Report

{{#if has_coverage}}
| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
{{#each coverage_files}}
| {{path}} | {{statements}}% | {{branches}}% | {{functions}}% | {{lines}}% |
{{/each}}

**Overall Coverage**: {{overall_coverage}}%
{{else}}
_No coverage data available_
{{/if}}

### Failed Tests

{{#if has_failures}}
{{#each failures}}
#### {{test_name}}

- **Suite**: {{suite}}
- **Error**: {{error_message}}
- **Stack**:
\`\`\`
{{stack_trace}}
\`\`\`
{{/each}}
{{else}}
_All tests passed_
{{/if}}

### Gemini Quality Analysis

{{gemini_analysis}}

### Recommendations

{{#each recommendations}}
- {{this}}
{{/each}}

---

## Validation Decision

**Result**: {{#if passed}}✅ PASS{{else}}❌ FAIL{{/if}}

**Rationale**: {{rationale}}

{{#if not_passed}}
### Next Actions

1. Review failed tests
2. Debug failures using action-debug-with-file
3. Fix issues and re-run validation
{{else}}
### Next Actions

1. Consider code review
2. Prepare for deployment
3. Update documentation
{{/if}}
```

## Template Variables

| Variable | Type | Source | Description |
|----------|------|--------|-------------|
| `session_id` | string | state.session_id | 会话 ID |
| `task_description` | string | state.task_description | 任务描述 |
| `timestamp` | string | 当前时间 | 验证时间 |
| `iteration` | number | 从文件计算 | 验证迭代次数 |
| `total_tests` | number | 测试输出 | 总测试数 |
| `passed_tests` | number | 测试输出 | 通过数 |
| `failed_tests` | number | 测试输出 | 失败数 |
| `pass_rate` | number | 计算得出 | 通过率 |
| `coverage_files` | array | 覆盖率报告 | 文件覆盖率 |
| `failures` | array | 测试输出 | 失败测试详情 |
| `gemini_analysis` | string | Gemini CLI | 质量分析 |
| `recommendations` | array | Gemini CLI | 建议列表 |

## Section Templates

### Test Summary

```markdown
### Test Execution Summary

| Metric | Value |
|--------|-------|
| Total Tests | {{total}} |
| Passed | {{passed}} |
| Failed | {{failed}} |
| Skipped | {{skipped}} |
| Duration | {{duration}}ms |
| **Pass Rate** | **{{rate}}%** |
```

### Coverage Table

```markdown
### Coverage Report

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
{{#each files}}
| `{{path}}` | {{statements}}% | {{branches}}% | {{functions}}% | {{lines}}% |
{{/each}}

**Overall Coverage**: {{overall}}%

**Coverage Thresholds**:
- ✅ Good: ≥ 80%
- ⚠️ Warning: 60-79%
- ❌ Poor: < 60%
```

### Failed Test Details

```markdown
### Failed Tests

{{#each failures}}
#### ❌ {{test_name}}

| Field | Value |
|-------|-------|
| Suite | {{suite}} |
| Error | {{error_message}} |
| Duration | {{duration}}ms |

**Stack Trace**:
\`\`\`
{{stack_trace}}
\`\`\`

**Possible Causes**:
{{#each possible_causes}}
- {{this}}
{{/each}}

---
{{/each}}
```

### Quality Analysis

```markdown
### Gemini Quality Analysis

#### Code Quality Assessment

| Dimension | Score | Status |
|-----------|-------|--------|
| Correctness | {{correctness}}/10 | {{correctness_status}} |
| Completeness | {{completeness}}/10 | {{completeness_status}} |
| Reliability | {{reliability}}/10 | {{reliability_status}} |
| Maintainability | {{maintainability}}/10 | {{maintainability_status}} |

#### Key Findings

{{#each findings}}
- **{{severity}}**: {{description}}
{{/each}}

#### Recommendations

{{#each recommendations}}
{{@index}}. {{this}}
{{/each}}
```

### Decision Section

```markdown
## Validation Decision

**Result**: {{#if passed}}✅ PASS{{else}}❌ FAIL{{/if}}

**Rationale**:
{{rationale}}

**Confidence Level**: {{confidence}}

### Decision Matrix

| Criteria | Status | Weight | Score |
|----------|--------|--------|-------|
| All tests pass | {{tests_pass}} | 40% | {{tests_score}} |
| Coverage ≥ 80% | {{coverage_pass}} | 30% | {{coverage_score}} |
| No critical issues | {{no_critical}} | 20% | {{critical_score}} |
| Quality analysis pass | {{quality_pass}} | 10% | {{quality_score}} |
| **Total** | | 100% | **{{total_score}}** |

**Threshold**: 70% to pass

### Next Actions

{{#if passed}}
1. ✅ Code review (recommended)
2. ✅ Update documentation
3. ✅ Prepare for deployment
{{else}}
1. ❌ Review failed tests
2. ❌ Debug failures
3. ❌ Fix issues and re-run
{{/if}}
```

## Historical Comparison

```markdown
## Validation History

| Iteration | Date | Pass Rate | Coverage | Status |
|-----------|------|-----------|----------|--------|
{{#each history}}
| {{iteration}} | {{date}} | {{pass_rate}}% | {{coverage}}% | {{status}} |
{{/each}}

### Trend Analysis

{{#if improving}}
📈 **Improving**: Pass rate increased from {{previous_rate}}% to {{current_rate}}%
{{else if declining}}
📉 **Declining**: Pass rate decreased from {{previous_rate}}% to {{current_rate}}%
{{else}}
➡️ **Stable**: Pass rate remains at {{current_rate}}%
{{/if}}
```
