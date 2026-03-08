# Phase 2: Command Diff

运行 sync-commands.py 脚本，分析命令变动情况。

> **重要约束**: 只检测**项目级别**的目录，不涉及用户全局目录：
> - ✅ `{project}/.claude/commands/`
> - ✅ `{project}/.claude/skills/`
> - ✅ `{project}/.codex/prompts/`
> - ✅ `{project}/.codex/skills/`
> - ❌ `~/.claude/` (用户全局)
> - ❌ `~/.codex/` (用户全局)

> **⚠️ 忽略自身约束**: `ccw-wiki-sync` 是同步工具本身，**不参与同步对比和判断**：
> - 已硬编码排除在 `scripts/sync-commands.py` 的 `EXCLUDED_SKILLS` 中
> - 即使存在于项目级别目录，也不会出现在检测结果中
> - **原因**: 同步工具不应出现在百科数据中

> **git diff 范围约束**:
> - ✅ 只检测 `.codex/`、`.claude/` 和 `src/data/` 目录的变动
> - ❌ 忽略百科项目本身的 UI、组件等变动
> - **原因**: timeline 是针对 ccw 工作流和 skill 数据的，本项目变动无需关注

## Objective

- 运行 `scripts/sync-commands.py --json`
- 解析命令差异：新增、删除、残留、孤立引用
- 通过 `git diff` 检测修改的命令
- 生成命令变动报告

## Input

- **Dependency**: `version-diff.json` (from Phase 1)
- **Script**: `scripts/sync-commands.py`

## Execution Steps

### Step 1: Run sync-commands.py

```javascript
const scriptPath = 'scripts/sync-commands.py';
const result = Bash(`python "${scriptPath}" --json`);

let syncResult;
try {
  syncResult = JSON.parse(result);
} catch (e) {
  throw new Error(`Failed to parse sync-commands.py output: ${e.message}`);
}

console.log(`Sync Result:`);
console.log(`  Total actual commands: ${syncResult.total_actual}`);
console.log(`  Total in commands.ts: ${syncResult.total_ts}`);
console.log(`  Deprecated commands: ${syncResult.total_deprecated}`);
console.log(`  Synced: ${syncResult.synced}`);
```

### Step 2: Parse Command Categories

```javascript
const changes = {
  newCommands: syncResult.missing || [],      // 目录存在但 ts 缺失
  deletedCommands: syncResult.extra || [],    // ts 存在但目录不存在
  staleCommands: syncResult.stale_in_dirs || [], // 残留旧命令
  orphanRefs: syncResult.pattern_orphans || []   // patterns.ts 孤立引用
};

console.log(`\nCommand Changes:`);
console.log(`  New commands: ${changes.newCommands.length}`);
console.log(`  Deleted commands: ${changes.deletedCommands.length}`);
console.log(`  Stale commands: ${changes.staleCommands.length}`);
console.log(`  Orphan references: ${changes.orphanRefs.length}`);
```

### Step 3: Detect Modified Commands

> **重要**: git diff 只关注以下目录，忽略百科项目本身的 UI/组件变动：
> - `.codex/` - Codex 命令和技能
> - `.claude/` - Claude 命令和技能
> - `src/data/` - 数据文件（commands.ts, timeline.ts 等）

```javascript
// Get list of modified files from relevant directories only
// 注意：只检测 .codex/, .claude/, src/data/ 目录，忽略百科项目本身变动
const modifiedResult = Bash(`git diff --name-only HEAD~1 -- .claude/commands/ .claude/skills/ .codex/prompts/ .codex/skills/ src/data/ 2>/dev/null || echo ""`);

const modifiedFiles = modifiedResult.split('\n').filter(f => f.trim());

// Filter out new and deleted commands
const modifiedCommands = modifiedFiles.filter(file => {
  const cmdName = extractCommandName(file);
  return !changes.newCommands.includes(cmdName) &&
         !changes.deletedCommands.includes(cmdName) &&
         !changes.staleCommands.includes(cmdName);
});

changes.modifiedCommands = modifiedCommands.map(f => ({
  file: f,
  cmd: extractCommandName(f)
}));

console.log(`  Modified commands: ${changes.modifiedCommands.length}`);
```

### Step 4: Categorize Commands by Source

```javascript
function getCommandSource(cmd) {
  if (cmd.startsWith('/')) {
    const name = cmd.slice(1).split(':')[0];
    // Check each directory
    const claudeCmd = Glob(`.claude/commands/${name}*.md`);
    const claudeSkill = Glob(`.claude/skills/${name}/SKILL.md`);
    const codexPrompt = Glob(`.codex/prompts/${name}.md`);
    const codexSkill = Glob(`.codex/skills/${name}/SKILL.md`);

    if (claudeCmd.length > 0) return { source: 'claude/commands', cli: 'claude', type: 'workflow' };
    if (claudeSkill.length > 0) return { source: 'claude/skills', cli: 'claude', type: 'skill' };
    if (codexPrompt.length > 0) return { source: 'codex/prompts', cli: 'codex', type: 'prompt' };
    if (codexSkill.length > 0) return { source: 'codex/skills', cli: 'codex', type: 'skill' };
  }
  return { source: 'unknown', cli: 'claude', type: 'skill' };
}

// Enrich new commands with source info
changes.newCommands = changes.newCommands.map(cmd => ({
  cmd,
  ...getCommandSource(cmd)
}));
```

### Step 5: Generate Command Changes Report

```javascript
const commandChanges = {
  timestamp: new Date().toISOString(),
  summary: {
    total: changes.newCommands.length + changes.deletedCommands.length +
           changes.staleCommands.length + changes.modifiedCommands.length,
    new: changes.newCommands.length,
    deleted: changes.deletedCommands.length,
    stale: changes.staleCommands.length,
    modified: changes.modifiedCommands.length
  },
  details: changes
};

Write(`${workDir}/command-changes.json`, JSON.stringify(commandChanges, null, 2));
```

### Step 6: User Explanation

> **重要**: 必须向用户清晰说明判断结果，特别是无需更新 commands.ts 时的理由。

```javascript
// 生成用户说明
function generateUserExplanation(changes, versionDiff) {
  const { newCommands, deletedCommands, staleCommands, modifiedCommands } = changes;
  const totalChanges = newCommands.length + deletedCommands.length +
                       staleCommands.length + modifiedCommands.length;

  // 无需更新的情况
  if (totalChanges === 0) {
    return {
      needsUpdate: false,
      reason: determineNoUpdateReason(changes, versionDiff),
      message: generateNoUpdateMessage(changes, versionDiff)
    };
  }

  // 需要更新的情况
  return {
    needsUpdate: true,
    reason: '检测到命令变动',
    message: generateUpdateMessage(changes),
    actions: generateActionList(changes)
  };
}

function determineNoUpdateReason(changes, versionDiff) {
  // 判断无需更新的具体原因
  const reasons = [];

  if (changes.newCommands.length === 0 &&
      changes.deletedCommands.length === 0 &&
      changes.modifiedCommands.length === 0) {
    reasons.push('目录中的命令与 commands.ts 完全一致');
  }

  if (changes.staleCommands.length === 0) {
    reasons.push('无残留的废弃命令');
  }

  if (versionDiff && versionDiff.needsUpdate === false) {
    reasons.push(`版本号一致 (${versionDiff.localVersion} = ${versionDiff.pageVersion})`);
  }

  return reasons.length > 0 ? reasons.join('；') : '无变化';
}

function generateNoUpdateMessage(changes, versionDiff) {
  const lines = ['📋 **同步检测结果：无需更新 commands.ts**\n'];
  lines.push('**原因**：');

  if (versionDiff && versionDiff.needsUpdate === false) {
    lines.push(`- 本地版本 (${versionDiff.localVersion}) 与页面版本 (${versionDiff.pageVersion}) 一致`);
  }

  lines.push(`- 目录命令数 (${changes.all_actual?.length || 0}) 与 commands.ts 定义数 (${changes.ts_commands?.length || 0}) 一致`);
  lines.push('- 无新增命令、无删除命令、无修改命令');
  lines.push('- 无残留的废弃命令');

  lines.push('\n✅ 百科数据已是最新状态，跳过后续更新阶段。');
  return lines.join('\n');
}

function generateUpdateMessage(changes) {
  const lines = ['📋 **同步检测结果：需要更新 commands.ts**\n'];
  lines.push('**检测到的变动**：');

  if (changes.newCommands.length > 0) {
    lines.push(`\n### 新增命令 (${changes.newCommands.length})`);
    changes.newCommands.forEach(c => {
      lines.push(`- \`${c.cmd}\` [${c.source}]`);
    });
  }

  if (changes.deletedCommands.length > 0) {
    lines.push(`\n### 删除命令 (${changes.deletedCommands.length})`);
    changes.deletedCommands.forEach(c => lines.push(`- \`${c}\``));
  }

  if (changes.modifiedCommands.length > 0) {
    lines.push(`\n### 修改命令 (${changes.modifiedCommands.length})`);
    changes.modifiedCommands.forEach(c => lines.push(`- \`${c.cmd}\` (${c.file})`));
  }

  if (changes.staleCommands.length > 0) {
    lines.push(`\n### 残留废弃命令 (${changes.staleCommands.length})`);
    changes.staleCommands.forEach(c => lines.push(`- \`${c}\``));
  }

  return lines.join('\n');
}

function generateActionList(changes) {
  const actions = [];

  if (changes.newCommands.length > 0) {
    actions.push('Phase 3: 添加新命令到 commands.ts');
  }
  if (changes.deletedCommands.length > 0) {
    actions.push('Phase 3: 移动删除命令到 deprecated.ts');
  }
  if (changes.modifiedCommands.length > 0) {
    actions.push('Phase 3: 更新修改命令的描述');
  }
  if (changes.staleCommands.length > 0) {
    actions.push('Phase 3: 清理残留废弃命令');
  }

  return actions;
}

// 执行并输出用户说明
const userExplanation = generateUserExplanation(changes, versionDiff);
commandChanges.userExplanation = userExplanation;

// 输出到控制台（用户可见）
console.log('\n' + userExplanation.message);

// 更新 JSON
Write(`${workDir}/command-changes.json`, JSON.stringify(commandChanges, null, 2));
```

## Helper Functions

```javascript
function extractCommandName(filePath) {
  // Extract command name from file path
  // .claude/commands/workflow:session:start.md -> /workflow:session:start
  // .claude/skills/team-planex/SKILL.md -> /team-planex
  const match = filePath.match(/\/(commands|skills|prompts)\/([^/]+)/);
  if (match) {
    if (match[1] === 'commands') {
      const fileName = filePath.split('/').pop().replace('.md', '');
      return '/' + fileName;
    } else if (match[1] === 'skills') {
      return '/' + match[2];
    } else if (match[1] === 'prompts') {
      const fileName = filePath.split('/').pop().replace('.md', '');
      return '/' + fileName;
    }
  }
  return null;
}
```

## Output

- **File**: `{workDir}/command-changes.json`
- **Format**: JSON

### 需要更新时的输出示例

```json
{
  "timestamp": "2026-03-08T10:00:00Z",
  "summary": {
    "total": 5,
    "new": 3,
    "deleted": 1,
    "stale": 0,
    "modified": 1
  },
  "details": {
    "newCommands": [
      {
        "cmd": "/workflow:new-feature",
        "source": "claude/skills",
        "cli": "claude",
        "type": "skill"
      }
    ],
    "deletedCommands": ["/old-command"],
    "staleCommands": [],
    "modifiedCommands": [
      { "file": ".claude/commands/workflow:plan.md", "cmd": "/workflow:plan" }
    ],
    "orphanRefs": []
  },
  "userExplanation": {
    "needsUpdate": true,
    "reason": "检测到命令变动",
    "message": "📋 **同步检测结果：需要更新 commands.ts**\n\n**检测到的变动**：...",
    "actions": ["Phase 3: 添加新命令到 commands.ts", "Phase 3: 移动删除命令到 deprecated.ts"]
  }
}
```

### 无需更新时的输出示例

```json
{
  "timestamp": "2026-03-08T10:00:00Z",
  "summary": {
    "total": 0,
    "new": 0,
    "deleted": 0,
    "stale": 0,
    "modified": 0
  },
  "details": {
    "newCommands": [],
    "deletedCommands": [],
    "staleCommands": [],
    "modifiedCommands": [],
    "orphanRefs": []
  },
  "userExplanation": {
    "needsUpdate": false,
    "reason": "目录中的命令与 commands.ts 完全一致；版本号一致 (v7.2.4 = v7.2.4)",
    "message": "📋 **同步检测结果：无需更新 commands.ts**\n\n**原因**：\n- 本地版本 (v7.2.4) 与页面版本 (v7.2.4) 一致\n- 目录命令数 (124) 与 commands.ts 定义数 (124) 一致\n- 无新增命令、无删除命令、无修改命令\n- 无残留的废弃命令\n\n✅ 百科数据已是最新状态，跳过后续更新阶段。"
  }
}
```

## Quality Checklist

- [ ] sync-commands.py 执行成功
- [ ] JSON 解析正确
- [ ] git diff 命令执行成功
- [ ] 命令来源分类正确
- [ ] 输出文件格式正确
- [ ] **用户说明已生成** - 明确说明是否需要更新及理由
- [ ] **无需更新时理由充分** - 包含版本对比、命令数对比等具体信息

## Next Phase

→ [Phase 3: Command Update](03-command-update.md) with `command-changes.json`

**注意**: 若 `userExplanation.needsUpdate === false`，跳过 Phase 3-5，直接结束同步流程。
