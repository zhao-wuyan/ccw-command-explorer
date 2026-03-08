# Phase 3: Command Update

根据命令变动报告，更新 commands.ts 和 deprecated.ts。

> **重要约束**: 只检测**项目级别**的目录，不涉及用户全局目录：
> - ✅ `{project}/.claude/commands/`
> - ✅ `{project}/.claude/skills/`
> - ✅ `{project}/.codex/prompts/`
> - ✅ `{project}/.codex/skills/`
> - ❌ `~/.claude/` (用户全局)
> - ❌ `~/.codex/` (用户全局)

## Objective

- 处理新增命令：读取命令文件，生成 Command 对象
- 处理删除命令：移入 deprecated.ts
- 处理修改命令：更新 desc/detail/usage 字段
- 更新 STATS 统计

## Input

- **Dependency**: `command-changes.json` (from Phase 2)
- **Templates**: `templates/command-template.ts`

## Execution Steps

### Step 1: Read Command Changes

```javascript
const changes = JSON.parse(Read(`${workDir}/command-changes.json`));
const { newCommands, deletedCommands, modifiedCommands } = changes.details;

console.log(`Processing ${changes.summary.total} command changes...`);
```

### Step 2: Process New Commands

```javascript
const newCommandObjects = [];

for (const newCmd of newCommands) {
  console.log(`Processing new command: ${newCmd.cmd}`);

  // Read command file
  const commandContent = readCommandFile(newCmd);

  if (commandContent) {
    const commandObj = generateCommandObject(newCmd, commandContent);
    newCommandObjects.push(commandObj);
    console.log(`  Generated: ${commandObj.cmd} - ${commandObj.desc}`);
  }
}

function readCommandFile(cmdInfo) {
  const { cmd, source } = cmdInfo;
  const name = cmd.slice(1).split(':')[0];

  if (source === 'claude/commands') {
    const subPath = cmd.includes(':') ? cmd.slice(1).replace(':', '/') : name;
    return Read(`.claude/commands/${subPath}.md`);
  } else if (source === 'claude/skills') {
    return Read(`.claude/skills/${name}/SKILL.md`);
  } else if (source === 'codex/prompts') {
    return Read(`.codex/prompts/${name}.md`);
  } else if (source === 'codex/skills') {
    return Read(`.codex/skills/${name}/SKILL.md`);
  }
  return null;
}
```

### Step 3: Generate Command Object

```javascript
function generateCommandObject(cmdInfo, content) {
  const { cmd, source, cli, type } = cmdInfo;

  // Extract description from content
  const descMatch = content.match(/^#\s+.+?\n+(.+?)(?:\n\n|\n##)/s);
  const desc = descMatch ? descMatch[1].trim().slice(0, 80) : 'TODO: 添加描述';

  // Extract detail from content
  const detailMatch = content.match(/##\s+(?:描述|Description|Overview)\s*\n+(.+?)(?:\n##|\n---|\Z)/s);
  const detail = detailMatch ? detailMatch[1].trim().slice(0, 200) : undefined;

  // Extract usage from content
  const usageMatch = content.match(/##\s+(?:使用|Usage)\s*\n+(.+?)(?:\n##|\n---|\Z)/s);
  const usage = usageMatch ? usageMatch[1].trim().slice(0, 100) : undefined;

  // Get local version for addedInVersion
  const versionDiff = JSON.parse(Read(`${workDir}/version-diff.json`));
  const version = versionDiff.localVersion?.replace('v', '') || '7.0';

  return {
    cmd,
    desc,
    status: 'new',
    category: mapCategory(type, source),
    cli,
    addedInVersion: `v${version}`,
    ...(detail && { detail }),
    ...(usage && { usage })
  };
}

function mapCategory(type, source) {
  if (type === 'prompt') return 'prompt';
  if (type === 'skill') return 'skill';
  if (source.includes('commands')) return 'workflow';
  return 'skill';
}
```

### Step 4: Process Deleted Commands

> **重要**: 废弃命令必须包含 `deprecatedInVersion` 字段，明确废弃版本号。
>
> **版本号判断优先级**:
> 1. **本地数据优先**: 从 `version-diff.json` 的 `localVersion` 获取当前版本
> 2. **GitHub 验证（版本跳跃）**: 当版本号跳跃多个小版本时（如 v7.0 → v7.2.3），必须从 GitHub 验证
> 3. **GitHub 补充**: 本地无法判断时，从 GitHub releases 获取版本变动信息

```javascript
const deprecatedEntries = [];
const versionDiff = JSON.parse(Read(`${workDir}/version-diff.json`));
const localVersion = versionDiff.localVersion;
const pageVersion = versionDiff.pageVersion;

// 判断是否需要从 GitHub 验证版本号
// 条件：版本号跳跃多个小版本（如 v7.0 → v7.2.3，跳过了 v7.1, v7.2）
const needsGithubValidation = checkVersionJump(localVersion, pageVersion);

let githubReleases = null;
if (needsGithubValidation) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`检测到版本跳跃 (${pageVersion} → ${localVersion})`);
  console.log(`从 GitHub 获取版本变动信息进行验证...`);
  console.log(`${'='.repeat(50)}`);
  githubReleases = await fetchGithubReleases();
}

/**
 * 检查版本号是否跳跃多个小版本
 * @returns {boolean} - true 表示需要 GitHub 验证
 */
function checkVersionJump(localVersion, pageVersion) {
  if (!localVersion || !pageVersion) return true;

  const local = parseVersion(localVersion);
  const page = parseVersion(pageVersion);

  // 大版本跳跃（如 6.x → 7.x）
  if (local.major - page.major >= 1) return true;

  // 中版本跳跃（如 7.0 → 7.2，跳跃了 7.1）
  if (local.major === page.major && local.minor - page.minor >= 1) return true;

  // 修复版本跳跃超过 5 个（如 7.2.0 → 7.2.6）
  if (local.major === page.major && local.minor === page.minor && local.patch - page.patch > 5) return true;

  return false;
}

function parseVersion(version) {
  const parts = version.replace(/^v/, '').split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

for (const deletedCmd of deletedCommands) {
  console.log(`Processing deleted command: ${deletedCmd}`);

  // Check if already in deprecated.ts
  const deprecatedContent = Read('src/data/deprecated.ts');
  if (deprecatedContent.includes(`old: '${deletedCmd}'`)) {
    console.log(`  Already deprecated, skipping`);
    continue;
  }

  // Find replacement command (if any)
  const replacement = findReplacementCommand(deletedCmd);

  // 确定废弃版本号
  const deprecatedVersion = determineDeprecatedVersion(
    deletedCmd,
    localVersion,
    githubReleases,
    replacement
  );

  console.log(`  Deprecated in: ${deprecatedVersion}`);

  deprecatedEntries.push({
    old: deletedCmd,
    newCmd: replacement,
    reason: replacement ? '命令重命名' : '命令已移除',
    deprecatedInVersion: deprecatedVersion
  });
}

// ============================================
// 辅助函数：版本号判断
// ============================================

/**
 * 从 GitHub 获取 releases 信息
 */
async function fetchGithubReleases() {
  const GITHUB_RELEASES_URL = 'https://api.github.com/repos/catlog22/Claude-Code-Workflow/releases';

  try {
    const result = Bash(`curl -s "${GITHUB_RELEASES_URL}?per_page=20"`);
    const releases = JSON.parse(result);

    if (!Array.isArray(releases)) {
      console.log('  Warning: Failed to parse GitHub releases');
      return null;
    }

    console.log(`  Fetched ${releases.length} releases from GitHub`);

    // 提取版本号和发布信息
    return releases.map(r => ({
      tag_name: r.tag_name,
      name: r.name,
      body: r.body || '',
      published_at: r.published_at,
      html_url: r.html_url
    }));
  } catch (error) {
    console.log(`  Warning: Failed to fetch GitHub releases: ${error.message}`);
    return null;
  }
}

/**
 * 确定命令的废弃版本号
 *
 * @param {string} cmd - 废弃的命令
 * @param {string} localVersion - 本地版本（如 "v7.2.3"）
 * @param {Array|null} githubReleases - GitHub releases 信息
 * @param {string|null} replacement - 替换命令
 * @returns {string} - 废弃版本号（如 "v7.2.3"）
 */
function determineDeprecatedVersion(cmd, localVersion, githubReleases, replacement) {
  // 1. 优先使用本地版本
  if (localVersion) {
    // 检查本地版本是否可靠（不是太旧的版本）
    const normalizedLocal = localVersion.replace(/^v/, '');

    // 如果本地版本 >= 7.0，直接使用
    const majorVersion = parseInt(normalizedLocal.split('.')[0], 10);
    if (majorVersion >= 7) {
      return localVersion.startsWith('v') ? localVersion : `v${localVersion}`;
    }
  }

  // 2. 从 GitHub releases 推断版本号
  if (githubReleases && githubReleases.length > 0) {
    const inferredVersion = inferVersionFromGithub(cmd, githubReleases, replacement);
    if (inferredVersion) {
      return inferredVersion;
    }

    // 无法推断时，使用最新 release 版本
    const latestRelease = githubReleases[0];
    return latestRelease.tag_name;
  }

  // 3. 兜底：使用当前时间戳推断的大版本
  // 假设当前是 2026 年，CCW v7.x 是主流版本
  return 'v7.0';
}

/**
 * 从 GitHub releases 推断命令废弃的版本
 */
function inferVersionFromGithub(cmd, releases, replacement) {
  const cmdName = cmd.replace(/^\//, '').replace(/:/g, '-');

  // 遍历 releases，查找提到该命令的版本
  for (const release of releases) {
    const body = release.body || '';
    const releaseNotes = body.toLowerCase();

    // 检查 release notes 是否提到该命令
    // 常见模式: "remove /xxx", "deprecated /xxx", "rename /xxx to /yyy"
    const patterns = [
      new RegExp(`(remove|removed|delete|deleted)\\s+[\\`'/]?${cmdName}`, 'i'),
      new RegExp(`(deprecate|deprecated)\\s+[\\`'/]?${cmdName}`, 'i'),
      new RegExp(`(rename|renamed)\\s+[\\`'/]?${cmdName}\\s*to`, 'i'),
      new RegExp(`${cmdName}\\s*(has been|is now)\\s*(removed|deprecated)`, 'i'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(releaseNotes)) {
        console.log(`    Found in release ${release.tag_name}: ${pattern.source.slice(0, 30)}...`);
        return release.tag_name;
      }
    }

    // 如果有替换命令，检查是否在某个版本中新增
    if (replacement) {
      const replacementName = replacement.replace(/^\//, '').replace(/:/g, '-');
      const newCmdPattern = new RegExp(`(new|add|added|introduce|introduced)\\s+[\\`'/]?${replacementName}`, 'i');
      if (newCmdPattern.test(releaseNotes)) {
        console.log(`    Replacement ${replacement} found in ${release.tag_name}`);
        return release.tag_name;
      }
    }
  }

  return null;
}

/**
 * 查找替换命令
 */
function findReplacementCommand(oldCmd) {
  // Try to find replacement based on naming patterns
  // e.g., /workflow:plan -> /workflow-plan
  const baseName = oldCmd.split(':')[1] || oldCmd.slice(1);
  const skillVersion = `/${baseName}`;

  // Check if skill version exists
  const commandsContent = Read('src/data/commands.ts');
  if (commandsContent.includes(`cmd: '${skillVersion}'`)) {
    return skillVersion;
  }

  return null;
}
```

> **版本号判断流程图**:
>
> ```
> 废弃命令 ─┬─→ 本地版本可用？ ─Yes─→ 使用本地版本
>           │
>           No
>           │
>           ├─→ GitHub releases 可用？ ─Yes─→ 搜索 release notes
>           │                                │
>           │                                ├─→ 找到提及？ → 使用该版本
>           │                                │
>           │                                └─→ 未找到 → 使用最新版本
>           │
>           └─→ 兜底：使用 v7.0
> ```

### Step 5: Process Modified Commands

```javascript
const modifiedDetails = [];

for (const modCmd of modifiedCommands) {
  console.log(`Processing modified command: ${modCmd.cmd}`);

  const content = Read(modCmd.file);
  if (!content) continue;

  // Extract updated information
  const updates = extractCommandUpdates(content, modCmd.cmd);

  if (Object.keys(updates).length > 0) {
    modifiedDetails.push({
      cmd: modCmd.cmd,
      updates
    });
  }
}

function extractCommandUpdates(content, cmd) {
  const updates = {};

  // Extract new description
  const descMatch = content.match(/^#\s+.+?\n+(.+?)(?:\n\n|\n##)/s);
  if (descMatch) {
    updates.desc = descMatch[1].trim().slice(0, 80);
  }

  // Extract new detail
  const detailMatch = content.match(/##\s+(?:描述|Description|Overview)\s*\n+(.+?)(?:\n##|\n---)/s);
  if (detailMatch) {
    updates.detail = detailMatch[1].trim().slice(0, 200);
  }

  return updates;
}
```

### Step 6: Apply Updates to Files

```javascript
// Update commands.ts
let commandsContent = Read('src/data/commands.ts');

// Add new commands
if (newCommandObjects.length > 0) {
  const newCommandsCode = newCommandObjects.map(cmd =>
    `  { cmd: '${cmd.cmd}', desc: '${cmd.desc}', status: '${cmd.status}', category: '${cmd.category}', cli: '${cmd.cli}', addedInVersion: '${cmd.addedInVersion}'${cmd.detail ? `, detail: '${cmd.detail}'` : ''}${cmd.usage ? `, usage: '${cmd.usage}'` : ''} }`
  ).join(',\n');

  // Find insertion point (before closing bracket of COMMANDS array)
  const insertPoint = commandsContent.lastIndexOf('];');
  commandsContent = commandsContent.slice(0, insertPoint) +
                    ',\n' + newCommandsCode + '\n' +
                    commandsContent.slice(insertPoint);
}

// Remove deleted commands
for (const deleted of deletedCommands) {
  const cmdPattern = new RegExp(`\\{[^}]*cmd: '${deleted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[^}]*\\},?\\s*`, 'g');
  commandsContent = commandsContent.replace(cmdPattern, '');
}

// Update modified commands
for (const mod of modifiedDetails) {
  // Find and update desc
  if (mod.updates.desc) {
    const descPattern = new RegExp(`(cmd: '${mod.cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}', desc: ')[^']*(')`);
    commandsContent = commandsContent.replace(descPattern, `$1${mod.updates.desc}$2`);
  }
}

Write('src/data/commands.ts', commandsContent);

// Update deprecated.ts
if (deprecatedEntries.length > 0) {
  let deprecatedContent = Read('src/data/deprecated.ts');

  // 按 deprecatedInVersion 分组，生成带版本注释的条目
  const groupedByVersion = {};
  for (const d of deprecatedEntries) {
    const version = d.deprecatedInVersion || 'v7.0';
    if (!groupedByVersion[version]) {
      groupedByVersion[version] = [];
    }
    groupedByVersion[version].push(d);
  }

  // 生成新条目代码（包含版本注释）
  const newDeprecatedParts = [];
  for (const [version, entries] of Object.entries(groupedByVersion)) {
    // 添加版本注释
    newDeprecatedParts.push(`\n  // ${version} 废弃`);

    // 添加该版本的废弃命令
    for (const d of entries) {
      newDeprecatedParts.push(
        `  { old: '${d.old}', newCmd: ${d.newCmd ? `'${d.newCmd}'` : 'null'}, reason: '${d.reason}', deprecatedInVersion: '${d.deprecatedInVersion}' },`
      );
    }
  }

  const newDeprecated = newDeprecatedParts.join('\n');

  // 找到插入点（在最后一个条目之后，关闭括号之前）
  const insertPoint = deprecatedContent.lastIndexOf('];');
  deprecatedContent = deprecatedContent.slice(0, insertPoint) +
                      newDeprecated + '\n' +
                      deprecatedContent.slice(insertPoint);

  Write('src/data/deprecated.ts', deprecatedContent);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`废弃命令版本号摘要`);
  console.log(`${'='.repeat(50)}`);
  for (const [version, entries] of Object.entries(groupedByVersion)) {
    console.log(`  ${version}: ${entries.length} 个命令`);
    for (const e of entries) {
      console.log(`    - ${e.old}${e.newCmd ? ` → ${e.newCmd}` : ''}`);
    }
  }
}

console.log(`\nFiles updated:`);
console.log(`  src/data/commands.ts: +${newCommandObjects.length}, -${deletedCommands.length}, ~${modifiedDetails.length}`);
console.log(`  src/data/deprecated.ts: +${deprecatedEntries.length}`);
```

### Step 7: Update Patterns (Keyword Matching & Command Chains)

> **重要**: 更新 `patterns.ts` 中的关键词匹配和命令链，确保智能推荐器能正确推荐新命令，并移除废弃命令的匹配规则。

```javascript
let patternsContent = Read('src/data/patterns.ts');
const patternUpdates = { added: [], removed: [], chainsRemoved: [] };

// 1. 移除废弃命令的 TASK_PATTERNS 条目
for (const deletedCmd of deletedCommands) {
  // 提取命令名（如 /workflow:xxx -> xxx）
  const cmdName = deletedCmd.replace(/^\//, '').replace(/:/g, '-');

  // 查找并移除包含该命令的 pattern
  // 匹配格式: { type: 'xxx', keywords: /.../, ..., flow: 'xxx', ... }
  const flowPattern = new RegExp(`\\s*\\{[^}]*flow:\\s*['"\`]${cmdName}['"\`][^}]*\\},?\\s*`, 'g');
  const typePattern = new RegExp(`\\s*\\{[^}]*type:\\s*['"\`]${cmdName}['"\`][^}]*\\},?\\s*`, 'g');

  const beforeLength = patternsContent.length;
  patternsContent = patternsContent.replace(flowPattern, '');
  patternsContent = patternsContent.replace(typePattern, '');

  if (patternsContent.length < beforeLength) {
    patternUpdates.removed.push(cmdName);
    console.log(`  Removed pattern for: ${cmdName}`);
  }
}

// 2. 移除废弃命令的 COMMAND_CHAINS 条目
for (const deletedCmd of deletedCommands) {
  const chainKey = deletedCmd.replace(/^\//, '').replace(/:/g, '-');

  // 匹配格式: 'chain-key': { flow: 'chain-key', ... },
  const chainPattern = new RegExp(`\\s*['"\`]${chainKey}['"\`]:\\s*\\{[^}]*flow:\\s*['"\`]${chainKey}['"\`][\\s\\S]*?\\},?\\s*`, 'g');

  const beforeLength = patternsContent.length;
  patternsContent = patternsContent.replace(chainPattern, '');

  if (patternsContent.length < beforeLength) {
    patternUpdates.chainsRemoved.push(chainKey);
    console.log(`  Removed command chain for: ${chainKey}`);
  }
}

// 3. 新增命令的 Pattern 建议（需要人工确认）
if (newCommandObjects.length > 0) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`新增命令 Pattern 建议`);
  console.log(`${'='.repeat(50)}`);

  // 生成建议的 pattern 条目
  const suggestedPatterns = [];

  for (const newCmd of newCommandObjects) {
    const cmdName = newCmd.cmd.replace(/^\//, '').replace(/:/g, '-');
    const desc = newCmd.desc;

    // 根据命令名和描述推断可能的关键词
    const keywords = generateSuggestedKeywords(cmdName, desc);

    if (keywords) {
      suggestedPatterns.push({
        type: cmdName,
        keywords: keywords,
        level: inferCommandLevel(newCmd),
        flow: cmdName,
        desc: desc.slice(0, 20),
        emoji: inferEmoji(newCmd.category),
        weight: inferWeight(newCmd.category, newCmd.status)
      });
    }
  }

  if (suggestedPatterns.length > 0) {
    console.log(`\n建议添加以下 ${suggestedPatterns.length} 个 Pattern 条目到 TASK_PATTERNS:`);
    for (const sp of suggestedPatterns) {
      console.log(`  { type: '${sp.type}', keywords: ${sp.keywords}, level: ${sp.level}, flow: '${sp.flow}', desc: '${sp.desc}', emoji: '${sp.emoji}', weight: ${sp.weight} },`);
    }

    const addPatterns = AskUserQuestion({
      questions: [{
        question: '是否添加建议的 Pattern 条目？（也可稍后手动添加）',
        header: 'Patterns',
        multiSelect: false,
        options: [
          { label: '自动添加', description: '将建议的条目添加到 TASK_PATTERNS' },
          { label: '稍后手动', description: '记录到日志，稍后手动添加' },
          { label: '跳过', description: '不需要添加 pattern' }
        ]
      }]
    });

    if (addPatterns.includes('自动添加')) {
      // 找到 TASK_PATTERNS 数组的末尾（在 'feature' 兜底项之前）
      const featurePattern = /(\s*\{\s*type:\s*['"]feature['"][^}]*\},?\s*)/;
      const match = featurePattern.exec(patternsContent);

      if (match) {
        const insertPosition = match.index;
        const newPatternsCode = suggestedPatterns.map(sp =>
          `  { type: '${sp.type}', keywords: ${sp.keywords}, level: ${sp.level}, flow: '${sp.flow}', desc: '${sp.desc}', emoji: '${sp.emoji}', weight: ${sp.weight} },`
        ).join('\n') + '\n';

        patternsContent = patternsContent.slice(0, insertPosition) +
                          newPatternsCode +
                          patternsContent.slice(insertPosition);

        patternUpdates.added = suggestedPatterns.map(sp => sp.type);
        console.log(`  Added ${suggestedPatterns.length} patterns`);
      }
    } else if (addPatterns.includes('稍后手动')) {
      // 保存建议到日志
      const logData = { suggestedPatterns, timestamp: new Date().toISOString() };
      Write(`${workDir}/pattern-suggestions.json`, JSON.stringify(logData, null, 2));
      console.log(`  Suggestions saved to ${workDir}/pattern-suggestions.json`);
    }
  }
}

// 辅助函数
function generateSuggestedKeywords(cmdName, desc) {
  // 从命令名提取关键词
  const parts = cmdName.split('-');
  const keywords = [];

  // 添加命令名本身
  keywords.push(cmdName);

  // 添加中英文关键词映射
  const keywordMap = {
    'brainstorm': ['头脑风暴', '创意', '发散'],
    'analyze': ['分析', '理解', '探索'],
    'debug': ['调试', '排查', '诊断'],
    'plan': ['规划', '计划', '设计'],
    'execute': ['执行', '实现', '开发'],
    'test': ['测试', '验证', 'tdd'],
    'review': ['审查', '检查', 'review'],
    'refactor': ['重构', '优化', '清理'],
    'ui': ['ui', '界面', '设计', '样式'],
    'team': ['团队', '协作', '多人'],
    'workflow': ['工作流', '流程', '自动化'],
    'issue': ['问题', 'issue', 'bug'],
    'spec': ['规格', '文档', 'prd'],
    'roadmap': ['路线图', '规划', '里程碑'],
    'collaborative': ['协作', '多人', '协同'],
  };

  for (const part of parts) {
    if (keywordMap[part]) {
      keywords.push(...keywordMap[part]);
    }
  }

  if (keywords.length === 0) return null;

  // 生成正则表达式字符串
  return `/(${[...new Set(keywords)].join('|')})/`;
}

function inferCommandLevel(cmd) {
  // 根据命令类型推断复杂度级别
  if (cmd.cmd.includes('team') || cmd.cmd.includes('roadmap')) return 4;
  if (cmd.cmd.includes('workflow') || cmd.cmd.includes('plan')) return 3;
  return 2;
}

function inferEmoji(category) {
  const emojiMap = {
    'workflow': '🔄',
    'skill': '🎯',
    'prompt': '💬',
    'team': '👥',
    'test': '🧪',
    'review': '👀',
    'ui': '🎨',
    'default': '✨'
  };
  return emojiMap[category] || emojiMap.default;
}

function inferWeight(category, status) {
  // 新命令给予较高权重以突出显示
  if (status === 'new') return 85;
  return 70;
}

// 写入更新后的 patterns.ts
if (patternUpdates.removed.length > 0 || patternUpdates.chainsRemoved.length > 0 || patternUpdates.added.length > 0) {
  Write('src/data/patterns.ts', patternsContent);
  console.log(`\nPatterns updated:`);
  console.log(`  TASK_PATTERNS: +${patternUpdates.added.length}, -${patternUpdates.removed.length}`);
  console.log(`  COMMAND_CHAINS: -${patternUpdates.chainsRemoved.length}`);
}
```

## Output

- **Updated**: `src/data/commands.ts`
- **Updated**: `src/data/deprecated.ts`
- **Updated**: `src/data/patterns.ts` (keyword matching & command chains)
- **Report**: `{workDir}/update-log.json`
- **Suggestions**: `{workDir}/pattern-suggestions.json` (if deferred)

## Quality Checklist

- [ ] 新命令对象格式正确
- [ ] 删除命令已移入废弃列表
- [ ] **废弃命令包含 `deprecatedInVersion` 字段**
- [ ] **版本号来源正确（本地优先，GitHub 验证）**
- [ ] 修改命令详情已更新
- [ ] **废弃命令的 TASK_PATTERNS 已移除**
- [ ] **废弃命令的 COMMAND_CHAINS 已移除**
- [ ] **新命令的 Pattern 已添加或记录**
- [ ] 文件语法正确（无 JSON/TS 错误）
- [ ] STATS 统计待更新（Phase 5）

## Next Phase

→ [Phase 4: Case/Experience Sync](04-case-experience.md) with `command-changes.json`
