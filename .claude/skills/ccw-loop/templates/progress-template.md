# Progress Document Template

开发进度文档的标准模板。

## Template Structure

```markdown
# Development Progress

**Session ID**: {{session_id}}
**Task**: {{task_description}}
**Started**: {{started_at}}
**Estimated Complexity**: {{complexity}}

---

## Task List

{{#each tasks}}
{{@index}}. [{{#if completed}}x{{else}} {{/if}}] {{description}}
{{/each}}

## Key Files

{{#each key_files}}
- `{{this}}`
{{/each}}

---

## Progress Timeline

{{#each iterations}}
### Iteration {{@index}} - {{task_name}} ({{timestamp}})

#### Task Details

- **ID**: {{task_id}}
- **Tool**: {{tool}}
- **Mode**: {{mode}}

#### Implementation Summary

{{summary}}

#### Files Changed

{{#each files_changed}}
- `{{this}}`
{{/each}}

#### Status: {{status}}

---
{{/each}}

## Current Statistics

| Metric | Value |
|--------|-------|
| Total Tasks | {{total_tasks}} |
| Completed | {{completed_tasks}} |
| In Progress | {{in_progress_tasks}} |
| Pending | {{pending_tasks}} |
| Progress | {{progress_percentage}}% |

---

## Next Steps

{{#each next_steps}}
- [ ] {{this}}
{{/each}}
```

## Template Variables

| Variable | Type | Source | Description |
|----------|------|--------|-------------|
| `session_id` | string | state.session_id | 会话 ID |
| `task_description` | string | state.task_description | 任务描述 |
| `started_at` | string | state.created_at | 开始时间 |
| `complexity` | string | state.context.estimated_complexity | 预估复杂度 |
| `tasks` | array | state.develop.tasks | 任务列表 |
| `key_files` | array | state.context.key_files | 关键文件 |
| `iterations` | array | 从文件解析 | 迭代历史 |
| `total_tasks` | number | state.develop.total_count | 总任务数 |
| `completed_tasks` | number | state.develop.completed_count | 已完成数 |

## Usage Example

```javascript
const progressTemplate = Read('.claude/skills/ccw-loop/templates/progress-template.md')

function renderProgress(state) {
  let content = progressTemplate

  // 替换简单变量
  content = content.replace('{{session_id}}', state.session_id)
  content = content.replace('{{task_description}}', state.task_description)
  content = content.replace('{{started_at}}', state.created_at)
  content = content.replace('{{complexity}}', state.context?.estimated_complexity || 'unknown')

  // 替换任务列表
  const taskList = state.develop.tasks.map((t, i) => {
    const checkbox = t.status === 'completed' ? 'x' : ' '
    return `${i + 1}. [${checkbox}] ${t.description}`
  }).join('\n')
  content = content.replace('{{#each tasks}}...{{/each}}', taskList)

  // 替换统计
  content = content.replace('{{total_tasks}}', state.develop.total_count)
  content = content.replace('{{completed_tasks}}', state.develop.completed_count)
  // ...

  return content
}
```

## Section Templates

### Task Entry

```markdown
### Iteration {{N}} - {{task_name}} ({{timestamp}})

#### Task Details

- **ID**: {{task_id}}
- **Tool**: {{tool}}
- **Mode**: {{mode}}

#### Implementation Summary

{{summary}}

#### Files Changed

{{#each files}}
- `{{this}}`
{{/each}}

#### Status: COMPLETED

---
```

### Statistics Table

```markdown
## Current Statistics

| Metric | Value |
|--------|-------|
| Total Tasks | {{total}} |
| Completed | {{completed}} |
| In Progress | {{in_progress}} |
| Pending | {{pending}} |
| Progress | {{percentage}}% |
```

### Next Steps

```markdown
## Next Steps

{{#if all_completed}}
- [ ] Run validation tests
- [ ] Code review
- [ ] Update documentation
{{else}}
- [ ] Complete remaining {{pending}} tasks
- [ ] Review completed work
{{/if}}
```
