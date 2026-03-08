# Quality Standards

CCW Wiki Sync 质量标准和验证规范。

## When to Use

| Phase | Usage | Section |
|-------|-------|---------|
| Phase 3 | 验证命令对象格式 | Command Object Validation |
| Phase 4 | 验证案例/经验更新 | Case/Experience Validation |
| Phase 5 | 最终质量检查 | Final Validation |

---

## Quality Dimensions

### 1. Completeness (完整性) - 30%

| 检查项 | 权重 | 验证方式 |
|--------|------|----------|
| 版本号更新 | 10% | `STATS.latestVersion` 等于 `.claude/version.json` |
| 命令总数正确 | 10% | `STATS.totalCommands` 等于实际命令数 |
| 新命令完整 | 10% | 所有新命令都有 `desc`, `category`, `cli` |

### 2. Consistency (一致性) - 30%

| 检查项 | 权重 | 验证方式 |
|--------|------|----------|
| cmd 字段格式 | 15% | cmd 不含空格和参数 |
| category 值有效 | 10% | category 在 CATEGORIES 中定义 |
| cli 值有效 | 5% | cli 为 'claude' 或 'codex' |

### 3. Integrity (完整性) - 25%

| 检查项 | 权重 | 验证方式 |
|--------|------|----------|
| 废弃命令已迁移 | 10% | 删除的命令在 deprecated.ts 中 |
| 案例命令有效 | 10% | 案例中引用的命令在 commands.ts 中 |
| 经验命令有效 | 5% | 经验中引用的命令在 commands.ts 中 |

### 4. Syntax (语法) - 15%

| 检查项 | 权重 | 验证方式 |
|--------|------|----------|
| TypeScript 语法 | 10% | 无语法错误 |
| JSON 格式 | 5% | 输出文件格式正确 |

---

## Quality Gates

| Gate | Score | Action |
|------|-------|--------|
| **PASS** | ≥ 85% | 继续执行，更新完成 |
| **REVIEW** | 70-84% | 显示警告，用户确认后继续 |
| **FAIL** | < 70% | 必须修复问题后重试 |

---

## Validation Functions

### Validate Command Object

```javascript
function validateCommandObject(cmd) {
  const errors = [];
  const warnings = [];

  // 必需字段
  if (!cmd.cmd || !cmd.cmd.startsWith('/')) {
    errors.push(`Invalid cmd: ${cmd.cmd}`);
  }

  if (!cmd.desc || cmd.desc.length < 5) {
    errors.push(`desc too short: ${cmd.desc}`);
  }

  if (!['new', 'stable', 'recommended', 'deprecated'].includes(cmd.status)) {
    errors.push(`Invalid status: ${cmd.status}`);
  }

  const validCategories = ['main', 'workflow', 'session', 'issue', 'memory', 'brainstorm', 'tdd', 'test', 'review', 'ui-design', 'prompt', 'skill'];
  if (!validCategories.includes(cmd.category)) {
    errors.push(`Invalid category: ${cmd.category}`);
  }

  if (!['claude', 'codex'].includes(cmd.cli)) {
    errors.push(`Invalid cli: ${cmd.cli}`);
  }

  // cmd 字段不应包含参数
  if (cmd.cmd.includes(' ') || cmd.cmd.includes('--')) {
    warnings.push(`cmd contains params: ${cmd.cmd}`);
  }

  // desc 长度建议
  if (cmd.desc.length > 80) {
    warnings.push(`desc too long (${cmd.desc.length} chars)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

### Validate Case Commands

```javascript
function validateCaseCommands(caseItem, validCommands) {
  const errors = [];
  const warnings = [];

  for (const cmdRef of caseItem.commands) {
    const cmd = cmdRef.cmd || cmdRef;

    // 检查命令是否存在
    if (!validCommands.includes(cmd)) {
      errors.push(`Command not found: ${cmd}`);
    }

    // 检查是否含参数
    if (cmd.includes(' ') || cmd.includes('--')) {
      warnings.push(`cmd contains params: ${cmd}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

### Validate STATS

```javascript
function validateStats(commands) {
  const stats = {
    totalCommands: commands.length,
    claudeCommands: commands.filter(c => c.cli === 'claude').length,
    codexCommands: commands.filter(c => c.cli === 'codex').length,
    newCommands: commands.filter(c => c.status === 'new').length,
    recommendedCommands: commands.filter(c => c.status === 'recommended').length
  };

  const categories = new Set(commands.map(c => c.category));
  stats.categories = categories.size;

  return stats;
}
```

---

## Issue Classification

### Errors (Must Fix)

| Code | Description | Fix |
|------|-------------|-----|
| E001 | cmd 字段格式错误 | 修改为纯命令格式 |
| E002 | category 值无效 | 使用有效的分类 |
| E003 | cli 值无效 | 使用 'claude' 或 'codex' |
| E004 | 删除的命令未迁移到废弃列表 | 添加到 deprecated.ts |
| E005 | 案例引用不存在的命令 | 更新或删除案例 |

### Warnings (Should Fix)

| Code | Description | Fix |
|------|-------------|-----|
| W001 | cmd 字段包含参数 | 移除参数部分 |
| W002 | desc 过长 | 精简描述 |
| W003 | detail 缺失 | 添加详细描述 |
| W004 | usage 缺失 | 添加使用场景 |

### Info (Nice to Have)

| Code | Description |
|------|-------------|
| I001 | 新命令已添加 |
| I002 | 版本号已更新 |
| I003 | 时间线已更新 |

---

## Final Validation Checklist

执行完成前检查：

- [ ] `.claude/version.json` 存在且可读
- [ ] `STATS.latestVersion` 等于本地版本
- [ ] `STATS.totalCommands` 等于实际命令数
- [ ] 所有新命令格式正确
- [ ] 所有删除命令已在 deprecated.ts
- [ ] 案例/经验中的命令有效
- [ ] TypeScript 文件无语法错误
- [ ] 输出报告已生成
