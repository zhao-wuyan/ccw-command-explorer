# Phase 4: Case/Experience Sync

同步案例和经验指南中的命令引用，确保命令链路完整。

> **重要约束**: 只检测**项目级别**的目录，不涉及用户全局目录：
> - ✅ `{project}/.claude/commands/`
> - ✅ `{project}/.claude/skills/`
> - ✅ `{project}/.codex/prompts/`
> - ✅ `{project}/.codex/skills/`
> - ❌ `~/.claude/` (用户全局)
> - ❌ `~/.codex/` (用户全局)

## Objective

- 检查案例（cases.ts）中的命令引用
- 检查经验（experience.ts）中的命令引用
- 更新部分废弃的案例/经验
- 删除全部废弃的案例/经验
- 验证 cmd 字段不含参数

## Input

- **Dependency**: `command-changes.json` (from Phase 2)
- **Files**: `src/data/cases.ts`, `src/data/experience.ts`

## Important Constraint

> **cmd 字段规则**: cmd 必须是纯命令，不含参数
> - ✅ 正确: `/workflow-lite-plan`
> - ❌ 错误: `/workflow-lite-plan --bugfix`
> - 原因: cmd 字段用于匹配 commands.ts 中的数据，带参数会匹配失败

## Execution Steps

### Step 1: Load Command Changes

```javascript
const changes = JSON.parse(Read(`${workDir}/command-changes.json`));
const { deletedCommands, staleCommands } = changes.details;

// 合并所有废弃命令
const deprecatedSet = new Set([
  ...deletedCommands,
  ...staleCommands
]);

console.log(`Checking ${deprecatedSet.size} deprecated commands in cases/experiences...`);
```

### Step 2: Analyze Cases

```javascript
const casesContent = Read('src/data/cases.ts');
const caseUpdates = {
  updated: [],
  deleted: [],
  warnings: []
};

// 查找所有案例中的命令引用
const casePattern = /{ id: '([^']+)',[\s\S]*?commands: \[([\s\S]*?)\]/g;
let match;

while ((match = casePattern.exec(casesContent)) !== null) {
  const caseId = match[1];
  const commandsBlock = match[2];

  // 提取命令列表
  const cmdPattern = /cmd: '([^']+)'/g;
  const cmds = [];
  let cmdMatch;
  while ((cmdMatch = cmdPattern.exec(commandsBlock)) !== null) {
    cmds.push(cmdMatch[1]);
  }

  // 检查废弃命令
  const deprecatedInCase = cmds.filter(cmd => deprecatedSet.has(cmd));
  const validInCase = cmds.filter(cmd => !deprecatedSet.has(cmd));

  if (deprecatedInCase.length > 0) {
    if (validInCase.length === 0) {
      // 全部废弃 → 标记删除
      caseUpdates.deleted.push({
        id: caseId,
        reason: 'all_commands_deprecated',
        deprecatedCommands: deprecatedInCase
      });
    } else {
      // 部分废弃 → 标记更新
      caseUpdates.updated.push({
        id: caseId,
        deprecatedCommands: deprecatedInCase,
        validCommands: validInCase
      });
    }
  }

  // 检查 cmd 字段是否含参数
  for (const cmd of cmds) {
    if (cmd.includes(' ') || cmd.includes('--')) {
      caseUpdates.warnings.push({
        id: caseId,
        cmd,
        issue: 'cmd_field_contains_params'
      });
    }
  }
}

console.log(`\nCase Analysis:`);
console.log(`  Need update: ${caseUpdates.updated.length}`);
console.log(`  Need delete: ${caseUpdates.deleted.length}`);
console.log(`  Warnings: ${caseUpdates.warnings.length}`);
```

### Step 3: Analyze Experiences

```javascript
const experienceContent = Read('src/data/experience.ts');
const experienceUpdates = {
  updated: [],
  deleted: [],
  warnings: []
};

// 查找所有经验中的命令引用
const expPattern = /{ id: '([^']+)',[\s\S]*?commands: \[([\s\S]*?)\]/g;

while ((match = expPattern.exec(experienceContent)) !== null) {
  const expId = match[1];
  const commandsBlock = match[2];

  // 提取命令列表 (数组格式)
  const cmdListPattern = /'([^']+)'/g;
  const cmds = [];
  let cmdMatch;
  while ((cmdMatch = cmdListPattern.exec(commandsBlock)) !== null) {
    cmds.push(cmdMatch[1]);
  }

  // 检查废弃命令
  const deprecatedInExp = cmds.filter(cmd => deprecatedSet.has(cmd));
  const validInExp = cmds.filter(cmd => !deprecatedSet.has(cmd));

  if (deprecatedInExp.length > 0) {
    if (validInExp.length === 0) {
      experienceUpdates.deleted.push({
        id: expId,
        reason: 'all_commands_deprecated',
        deprecatedCommands: deprecatedInExp
      });
    } else {
      experienceUpdates.updated.push({
        id: expId,
        deprecatedCommands: deprecatedInExp,
        validCommands: validInExp
      });
    }
  }

  // 检查 cmd 字段是否含参数
  for (const cmd of cmds) {
    if (cmd.includes(' ') || cmd.includes('--')) {
      experienceUpdates.warnings.push({
        id: expId,
        cmd,
        issue: 'cmd_field_contains_params'
      });
    }
  }
}

console.log(`\nExperience Analysis:`);
console.log(`  Need update: ${experienceUpdates.updated.length}`);
console.log(`  Need delete: ${experienceUpdates.deleted.length}`);
console.log(`  Warnings: ${experienceUpdates.warnings.length}`);
```

### Step 4: Find Replacement Commands

```javascript
const deprecatedContent = Read('src/data/deprecated.ts');

function findReplacement(oldCmd) {
  const pattern = new RegExp(`old: '${oldCmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',\\s*newCmd: '([^']+)'`);
  const match = deprecatedContent.match(pattern);
  return match ? match[1] : null;
}

// 为需要更新的案例/经验查找替代命令
for (const item of caseUpdates.updated) {
  item.replacements = item.deprecatedCommands.map(cmd => ({
    old: cmd,
    new: findReplacement(cmd)
  }));
}

for (const item of experienceUpdates.updated) {
  item.replacements = item.deprecatedCommands.map(cmd => ({
    old: cmd,
    new: findReplacement(cmd)
  }));
}
```

### Step 5: Apply Updates

```javascript
// 用户确认
if (caseUpdates.deleted.length > 0 || experienceUpdates.deleted.length > 0) {
  const confirmDelete = AskUserQuestion({
    questions: [{
      question: `发现 ${caseUpdates.deleted.length} 个案例和 ${experienceUpdates.deleted.length} 个经验全部命令已废弃，是否删除？`,
      header: '删除确认',
      multiSelect: false,
      options: [
        { label: '删除', description: '删除所有全部废弃的案例和经验' },
        { label: '保留', description: '保留但标记为需要更新' }
      ]
    }]
  });

  if (confirmDelete.includes('保留')) {
    caseUpdates.deleted = [];
    experienceUpdates.deleted = [];
  }
}

// 更新 cases.ts
let updatedCasesContent = casesContent;

// 删除全部废弃的案例
for (const item of caseUpdates.deleted) {
  const deletePattern = new RegExp(`\\s*{\\s*id: '${item.id}',[\\s\\S]*?},?\\s*`);
  updatedCasesContent = updatedCasesContent.replace(deletePattern, '');
}

// 更新部分废弃的案例命令
for (const item of caseUpdates.updated) {
  for (const repl of item.replacements) {
    if (repl.new) {
      updatedCasesContent = updatedCasesContent.replace(
        new RegExp(`cmd: '${repl.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'),
        `cmd: '${repl.new}'`
      );
    }
  }
}

Write('src/data/cases.ts', updatedCasesContent);

// 更新 experience.ts
let updatedExpContent = experienceContent;

for (const item of experienceUpdates.deleted) {
  const deletePattern = new RegExp(`\\s*{\\s*id: '${item.id}',[\\s\\S]*?},?\\s*`);
  updatedExpContent = updatedExpContent.replace(deletePattern, '');
}

for (const item of experienceUpdates.updated) {
  for (const repl of item.replacements) {
    if (repl.new) {
      updatedExpContent = updatedExpContent.replace(
        new RegExp(`'${repl.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'),
        `'${repl.new}'`
      );
    }
  }
}

Write('src/data/experience.ts', updatedExpContent);

console.log(`\nFiles updated:`);
console.log(`  src/data/cases.ts: ${caseUpdates.updated.length} updated, ${caseUpdates.deleted.length} deleted`);
console.log(`  src/data/experience.ts: ${experienceUpdates.updated.length} updated, ${experienceUpdates.deleted.length} deleted`);
```

### Step 6: Generate Update Report

```javascript
const caseUpdateReport = {
  timestamp: new Date().toISOString(),
  cases: {
    updated: caseUpdates.updated,
    deleted: caseUpdates.deleted,
    warnings: caseUpdates.warnings
  },
  experiences: {
    updated: experienceUpdates.updated,
    deleted: experienceUpdates.deleted,
    warnings: experienceUpdates.warnings
  },
  summary: {
    totalUpdated: caseUpdates.updated.length + experienceUpdates.updated.length,
    totalDeleted: caseUpdates.deleted.length + experienceUpdates.deleted.length,
    totalWarnings: caseUpdates.warnings.length + experienceUpdates.warnings.length
  }
};

Write(`${workDir}/case-updates.json`, JSON.stringify(caseUpdateReport, null, 2));
```

## Output

- **Updated**: `src/data/cases.ts`
- **Updated**: `src/data/experience.ts`
- **Report**: `{workDir}/case-updates.json`

## Quality Checklist

- [ ] 废弃命令检测完整
- [ ] 替代命令查找正确
- [ ] 用户确认删除操作
- [ ] cmd 字段不含参数
- [ ] 文件语法正确

## Next Phase

→ [Phase 5: Version Sync](05-version-sync.md) with all update reports
