# Phase 5: Version Sync

更新版本号、统计数据和时间线。

> **重要约束**: 只检测**项目级别**的目录，不涉及用户全局目录：
> - ✅ `{project}/.claude/version.json` (本地版本来源)
> - ✅ `{project}/.claude/commands/`
> - ✅ `{project}/.claude/skills/`
> - ✅ `{project}/.codex/prompts/`
> - ✅ `{project}/.codex/skills/`
> - ❌ `~/.claude/` (用户全局)
> - ❌ `~/.codex/` (用户全局)

## Objective

- 更新 `STATS.latestVersion`
- 更新 `STATS.totalCommands` 等统计
- 判断是否为大版本更新
- 大版本添加到 `timeline.ts`
- 可选：从 GitHub release 补充信息

## Input

- **Dependencies**: All previous phase outputs
- `version-diff.json`
- `command-changes.json`
- `case-updates.json`

## Execution Steps

### Step 1: Calculate New Stats

```javascript
const commandsContent = Read('src/data/commands.ts');

// 统计命令数量
const cmdMatches = commandsContent.match(/cmd: '\/[^']+'/g) || [];
const totalCommands = cmdMatches.length;

// 统计各类型命令
const claudeCommands = (commandsContent.match(/cli: 'claude'/g) || []).length;
const codexCommands = (commandsContent.match(/cli: 'codex'/g) || []).length;
const newCommands = (commandsContent.match(/status: 'new'/g) || []).length;
const recommendedCommands = (commandsContent.match(/status: 'recommended'/g) || []).length;

// 统计分类数
const categories = new Set();
const catPattern = /category: '([^']+)'/g;
let catMatch;
while ((catMatch = catPattern.exec(commandsContent)) !== null) {
  categories.add(catMatch[1]);
}

console.log(`\nNew Stats:`);
console.log(`  Total commands: ${totalCommands}`);
console.log(`  Claude commands: ${claudeCommands}`);
console.log(`  Codex commands: ${codexCommands}`);
console.log(`  New commands: ${newCommands}`);
console.log(`  Recommended: ${recommendedCommands}`);
console.log(`  Categories: ${categories.size}`);
```

### Step 2: Determine Version Update

```javascript
const versionDiff = JSON.parse(Read(`${workDir}/version-diff.json`));
const newVersion = versionDiff.localVersion;

// 解析版本号
function parseVersion(v) {
  const parts = v.replace('v', '').split('.').map(Number);
  return {
    major: parts[0] || 0,    // a - 里程碑
    minor: parts[1] || 0,    // b - 大版本
    patch: parts[2] || 0     // c - 小版本
  };
}

const oldVer = parseVersion(versionDiff.pageVersion);
const newVer = parseVersion(newVersion);

// 判断是否为大版本更新 (b 变化)
const isMajorUpdate = newVer.minor > oldVer.minor || newVer.major > oldVer.major;

console.log(`\nVersion Analysis:`);
console.log(`  Old: ${versionDiff.pageVersion}`);
console.log(`  New: ${newVersion}`);
console.log(`  Is major update: ${isMajorUpdate}`);
```

### Step 3: Update STATS

```javascript
let updatedContent = commandsContent;

// 更新 latestVersion
updatedContent = updatedContent.replace(
  /latestVersion: '([^']+)'/,
  `latestVersion: '${newVersion}'`
);

// 更新 totalCommands
updatedContent = updatedContent.replace(
  /totalCommands: \d+/,
  `totalCommands: ${totalCommands}`
);

// 更新 claudeCommands
updatedContent = updatedContent.replace(
  /claudeCommands: COMMANDS\.filter[^}]+\}/,
  `claudeCommands: ${claudeCommands}`
);

// 更新 codexCommands
updatedContent = updatedContent.replace(
  /codexCommands: COMMANDS\.filter[^}]+\}/,
  `codexCommands: ${codexCommands}`
);

// 更新 newCommands
updatedContent = updatedContent.replace(
  /newCommands: COMMANDS\.filter[^}]+\}/,
  `newCommands: ${newCommands}`
);

// 更新 recommendedCommands
updatedContent = updatedContent.replace(
  /recommendedCommands: COMMANDS\.filter[^}]+\}/,
  `recommendedCommands: ${recommendedCommands}`
);

Write('src/data/commands.ts', updatedContent);
console.log(`\nUpdated STATS in commands.ts`);
```

### Step 4: Update Timeline

> **timeline 内容约束**:
> - ✅ **只记录**来自 `.codex/` 和 `.claude/` 目录的命令/skill 变动
> - ❌ **不记录**百科项目本身的 UI、组件等变动
> - **原因**: timeline 是针对 ccw 工作流和 skill 数据的，本项目变动无需关注
> - 只有当 `command-changes.json` 中有实际的命令变动时才更新 timeline

> **版本更新规则**:
> - **大版本更新**（b 变化，如 v7.0 → v7.1）：创建新的 timeline 条目
> - **小版本更新**（c 变化，如 v7.1.0 → v7.1.1）：合并到现有的大版本条目中

```javascript
// 获取变更摘要 - 只关注来自 .codex 和 .claude 目录的命令变动
const commandChanges = JSON.parse(Read(`${workDir}/command-changes.json`));

// 检查是否有实际的命令变动（来自 .codex 或 .claude 目录）
const hasCommandChanges =
  (commandChanges.details.newCommands?.length > 0) ||
  (commandChanges.details.deletedCommands?.length > 0) ||
  (commandChanges.details.modifiedCommands?.length > 0);

if (!hasCommandChanges) {
  console.log(`  No command changes from .codex/.claude directories - skipping timeline update`);
  console.log(`  (timeline only records ccw workflow/skill data changes, not wiki project UI changes)`);
} else {
  console.log(`  Command changes detected - checking version update type...`);

  // 解析版本号
  const newVerParts = newVersion.replace('v', '').split('.').map(Number);
  const oldVerParts = versionDiff.pageVersion.replace('v', '').split('.').map(Number);

  // 判断更新类型：大版本（b 变化）还是小版本（c 变化）
  const isMajorUpdate = newVerParts[1] > (oldVerParts[1] || 0); // b 变化
  const isMinorUpdate = newVerParts[1] === (oldVerParts[1] || 0) &&
                        newVerParts[2] > (oldVerParts[2] || 0); // c 变化

  console.log(`  Update type: ${isMajorUpdate ? '大版本 (b 变化)' : isMinorUpdate ? '小版本 (c 变化)' : '其他'}`);

  const newCmdList = commandChanges.details.newCommands.slice(0, 5).map(c => c.cmd);

  if (isMajorUpdate) {
    // 大版本更新：创建新的 timeline 条目
    console.log(`\n创建新的 timeline 条目...`);

    const timelineEntry = {
      date: new Date().toISOString().slice(0, 7), // YYYY-MM
      version: newVersion,
      title: '版本更新',
      desc: '新增命令和功能优化',
      color: 'COLORS.accent5',
      commands: totalCommands,
      detail: {
        version: newVersion,
        highlights: [
          '功能增强和优化',
          '新增工作流命令'
        ],
        newCommands: newCmdList,
        usage: '查看命令详情了解更多信息'
      }
    };

    const addToTimeline = AskUserQuestion({
      questions: [{
        question: `检测到大版本更新 ${newVersion}，是否添加到时间线？`,
        header: 'Timeline',
        multiSelect: false,
        options: [
          { label: '添加', description: '自动添加时间线条目' },
          { label: '手动编辑', description: '稍后手动编辑 timeline.ts' },
          { label: '跳过', description: '不添加时间线' }
        ]
      }]
    });

    if (addToTimeline.includes('添加')) {
      let timelineContent = Read('src/data/timeline.ts');

      const newEntryCode = `
  {
    date: '${timelineEntry.date}',
    version: '${timelineEntry.version}',
    title: '${timelineEntry.title}',
    desc: '${timelineEntry.desc}',
    color: ${timelineEntry.color},
    commands: ${timelineEntry.commands},
    detail: {
      version: '${timelineEntry.detail.version}',
      highlights: ${JSON.stringify(timelineEntry.detail.highlights)},
      newCommands: ${JSON.stringify(timelineEntry.detail.newCommands)},
      usage: '${timelineEntry.detail.usage}'
    }
  },
`;

      const insertPoint = timelineContent.indexOf('export const TIMELINE');
      const arrayStart = timelineContent.indexOf('[', insertPoint) + 1;
      timelineContent = timelineContent.slice(0, arrayStart) +
                        newEntryCode +
                        timelineContent.slice(arrayStart);

      Write('src/data/timeline.ts', timelineContent);
      console.log(`  ✓ Created new timeline entry for ${newVersion}`);
    }

  } else if (isMinorUpdate) {
    // 小版本更新：合并到现有的大版本条目中
    console.log(`\n小版本更新，合并到现有大版本条目...`);

    const majorVersion = `v${newVerParts[0]}.${newVerParts[1]}`; // 如 v7.1
    console.log(`  目标大版本: ${majorVersion}`);

    const mergeToTimeline = AskUserQuestion({
      questions: [{
        question: `检测到小版本更新 ${newVersion}，是否合并到 ${majorVersion} 的 timeline 条目？`,
        header: 'Timeline',
        multiSelect: false,
        options: [
          { label: '合并', description: `将变更合并到 ${majorVersion} 条目中` },
          { label: '手动编辑', description: '稍后手动编辑 timeline.ts' },
          { label: '跳过', description: '不更新时间线' }
        ]
      }]
    });

    if (mergeToTimeline.includes('合并')) {
      let timelineContent = Read('src/data/timeline.ts');

      // 查找匹配的大版本条目
      const versionPattern = new RegExp(`version:\\s*['"]${majorVersion}(\\.\\d+)?['"]`, 'g');
      const match = versionPattern.exec(timelineContent);

      if (match) {
        // 找到匹配条目，更新其内容
        console.log(`  找到 ${majorVersion} 条目，准备合并变更...`);

        // 更新版本号到最新小版本
        const oldVersionPattern = new RegExp(`(version:\\s*['"])${majorVersion}(\\.\\d+)?(['"])`, 'g');
        timelineContent = timelineContent.replace(oldVersionPattern, `$1${newVersion}$3`);

        // 更新命令数
        const entryMatch = timelineContent.match(new RegExp(`version:\\s*['"]${newVersion}['"][\\s\\S]*?commands:\\s*(\\d+)`));
        if (entryMatch) {
          const currentCommands = parseInt(entryMatch[1]);
          timelineContent = timelineContent.replace(
            new RegExp(`(version:\\s*['"]${newVersion}['"][\\s\\S]*?commands:\\s*)${currentCommands}`),
            `$1${totalCommands}`
          );
        }

        Write('src/data/timeline.ts', timelineContent);
        console.log(`  ✓ Merged changes into ${majorVersion} entry (now ${newVersion})`);
      } else {
        console.log(`  ⚠️ 未找到 ${majorVersion} 条目，无法合并`);
        console.log(`  建议：手动添加新条目或检查 timeline.ts`);
      }
    }
  }
} // end of hasCommandChanges check
```

### Step 5: GitHub Release Info (Optional - Best Effort)

> **💡 说明**: 尝试从 GitHub releases 获取版本变动信息。**如果获取失败则自动跳过**，因为 GitHub 可能还没有更新对应版本的说明。
>
> - 地址: https://github.com/catlog22/Claude-Code-Workflow/releases
> - 需要获取从 `pageVersion` 到 `newVersion` 之间所有版本的 release notes
> - 用于生成 timeline 的 `highlights` 和 `desc` 字段
> - **获取失败时自动使用默认描述，无需用户干预**

```javascript
// 获取需要查询的版本范围
const oldVer = versionDiff.pageVersion.replace('v', '');
const newVer = newVersion.replace('v', '');

console.log(`\n${'='.repeat(50)}`);
console.log(`GitHub Release 信息获取（可选）`);
console.log(`${'='.repeat(50)}`);
console.log(`版本范围: ${oldVer} → ${newVer}`);

// 默认 highlights（获取失败时使用）
const defaultHighlights = [
  '功能增强和优化',
  '新增工作流命令',
  '修复已知问题'
];

// 使用 WebFetch 获取 release 信息
const releasesUrl = 'https://github.com/catlog22/Claude-Code-Workflow/releases';
let releaseInfoObtained = false;
let releaseHighlights = defaultHighlights;

try {
  // 尝试使用 WebFetch 工具获取页面内容
  const releasesPage = WebFetch({
    url: releasesUrl,
    prompt: `提取从版本 ${oldVer} 到 ${newVer} 之间的所有 release 信息，包括：
1. 版本号
2. 发布日期
3. 主要变更内容（highlights）
4. 新增的命令或功能
请以结构化格式返回。如果该版本还没有发布说明，请明确告知。`
  });

  // 检查是否获取到有效内容（非空且不是错误信息）
  if (releasesPage && !releasesPage.includes('没有') && !releasesPage.includes('未找到') && releasesPage.length > 50) {
    console.log(`\n✓ 成功获取到 Release 信息`);
    releaseInfoObtained = true;

    // 保存 release 信息到工作目录
    const releaseInfo = {
      timestamp: new Date().toISOString(),
      versionRange: { from: oldVer, to: newVer },
      releases: releasesPage
    };
    Write(`${workDir}/release-info.json`, JSON.stringify(releaseInfo, null, 2));
  } else {
    console.log(`\n⚠️ GitHub 上尚未发布版本 ${newVer} 的说明，跳过获取`);
    console.log(`  将使用默认描述`);
  }

} catch (e) {
  // 获取失败时自动跳过，不中断流程
  console.log(`\n⚠️ GitHub Release 获取失败: ${e.message || '网络错误'}`);
  console.log(`  原因可能是: 网络问题 / GitHub 未更新该版本说明 / 速率限制`);
  console.log(`  将使用默认描述继续，无需人工干预`);
}

// 记录最终使用的 highlights
console.log(`\n使用的 Timeline Highlights: ${releaseHighlights.join(', ')}`);
console.log(`Release 信息获取状态: ${releaseInfoObtained ? '成功' : '使用默认值（跳过）'}`);

// 无需用户确认，直接继续
```

**Release 信息格式示例**:
```json
{
  "timestamp": "2026-03-08T10:00:00Z",
  "versionRange": { "from": "7.0", "to": "7.1.0" },
  "releases": [
    {
      "version": "7.1.0",
      "date": "2026-03-01",
      "highlights": [
        "新增 team-coordinate-v2 技能",
        "优化 issue 管理工作流",
        "修复 CLI 工具调用问题"
      ],
      "newCommands": ["/team-coordinate-v2", "/workflow:xxx"]
    }
  ]
}
```
```

### Step 6: Generate Final Report

```javascript
const finalReport = {
  timestamp: new Date().toISOString(),
  version: {
    old: versionDiff.pageVersion,
    new: newVersion,
    isMajorUpdate
  },
  stats: {
    totalCommands,
    claudeCommands,
    codexCommands,
    newCommands,
    recommendedCommands,
    categories: categories.size
  },
  filesUpdated: [
    'src/data/commands.ts',
    'src/data/deprecated.ts',
    'src/data/cases.ts',
    'src/data/experience.ts',
    ...(isMajorUpdate ? ['src/data/timeline.ts'] : [])
  ],
  changes: JSON.parse(Read(`${workDir}/command-changes.json`)).summary,
  caseUpdates: JSON.parse(Read(`${workDir}/case-updates.json`)).summary
};

Write(`${workDir}/validation-report.json`, JSON.stringify(finalReport, null, 2));

console.log(`\n${'='.repeat(50)}`);
console.log(`CCW Wiki Sync Complete!`);
console.log(`${'='.repeat(50)}`);
console.log(`Version: ${versionDiff.pageVersion} → ${newVersion}`);
console.log(`Commands: ${totalCommands} total`);
console.log(`Files updated: ${finalReport.filesUpdated.length}`);
console.log(`Report: ${workDir}/validation-report.json`);
```

## Output

- **Updated**: `src/data/commands.ts` (STATS)
- **Updated**: `src/data/timeline.ts` (if major version)
- **Report**: `{workDir}/validation-report.json`

## Final Report Format

```json
{
  "timestamp": "2026-03-08T10:00:00Z",
  "version": {
    "old": "v7.0",
    "new": "v7.1.0",
    "isMajorUpdate": true
  },
  "stats": {
    "totalCommands": 110,
    "claudeCommands": 75,
    "codexCommands": 35,
    "newCommands": 5,
    "recommendedCommands": 3,
    "categories": 12
  },
  "filesUpdated": [
    "src/data/commands.ts",
    "src/data/deprecated.ts",
    "src/data/cases.ts",
    "src/data/experience.ts",
    "src/data/timeline.ts"
  ],
  "changes": {
    "total": 5,
    "new": 3,
    "deleted": 1,
    "stale": 0,
    "modified": 1
  },
  "caseUpdates": {
    "totalUpdated": 2,
    "totalDeleted": 0,
    "totalWarnings": 1
  }
}
```

## Quality Checklist

- [ ] STATS 版本号已更新
- [ ] STATS 命令总数已更新
- [ ] 大版本已添加到 timeline
- [ ] 所有文件语法正确
- [ ] 最终报告已生成

## Completion

CCW Wiki Sync 完成！查看 `{workDir}/validation-report.json` 获取详细报告。
