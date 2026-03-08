# Phase 1: Version Check

检查本地 CCW 版本与页面版本，判断是否需要更新。

> **重要约束**: 只读取**项目级别**的版本文件，不涉及用户全局目录：
> - ✅ `{project}/.claude/version.json` (本地版本来源)
> - ❌ `~/.claude/` (用户全局)

> **⚠️ 前置条件**: 执行版本检测前，必须确保 CCW 已更新到最新版本！

## Objective

- **确认 CCW 更新状态**（必须步骤）
- 读取本地版本号（`.claude/version.json`）
- 读取页面版本号（`STATS.latestVersion`）
- 对比版本差异
- 判断更新必要性

## Input

- **Local Version**: `.claude/version.json` → `version` 字段
- **Page Version**: `src/data/commands.ts` → `STATS.latestVersion`

## Execution Steps

### Step 0: Verify CCW Update Status (REQUIRED)

> **重要**: 这是必须步骤！在检测版本之前，必须确保 CCW 已更新到最新版本。
>
> **⚠️ 注意**: 如果安装失败，请手动安装后再继续运行此 skill，不要自作主张跳过。

```javascript
// 询问用户是否已更新 CCW
const ccwUpdateStatus = AskUserQuestion({
  questions: [{
    question: '在检测版本之前，请确认 CCW 是否已更新到最新版本？',
    header: 'CCW 更新',
    multiSelect: false,
    options: [
      {
        label: '已更新',
        description: '我已经运行过 npm install -g claude-code-workflow && ccw install -m Path'
      },
      {
        label: '需要手动更新',
        description: '请在终端手动执行更新命令，完成后重新运行此 skill'
      }
    ]
  }]
});

if (ccwUpdateStatus.includes('需要手动更新')) {
  console.log('\n请手动执行以下命令更新 CCW：');
  console.log('  npm install -g claude-code-workflow');
  console.log('  ccw install -m Path');
  console.log('\n更新完成后，请重新运行 /ccw-wiki-sync');
  throw new Error('请手动更新 CCW 后重新运行此 skill');
}
```

**手动更新步骤**:
```bash
# 步骤 1: 更新 npm 包
npm install -g claude-code-workflow

# 步骤 2: 安装到项目
ccw install -m Path

# 步骤 3: 重新运行 skill
/ccw-wiki-sync
```

> **⚠️ 安装失败处理**: 如果 `ccw install -m Path` 执行失败，请检查：
> 1. 是否有管理员权限
> 2. 项目路径是否正确
> 3. 是否有网络问题
>
> 解决问题后手动安装成功，再重新运行此 skill。

### Step 1: Read Local Version

```javascript
const versionFile = '.claude/version.json';
let localVersion = null;

try {
  const versionData = JSON.parse(Read(versionFile));
  localVersion = versionData.version;
  console.log(`Local version: ${localVersion}`);
} catch (e) {
  console.log('Warning: .claude/version.json not found');
  console.log('Please run: npm install -g claude-code-workflow && ccw install -m Path');
}
```

### Step 1.5: Check npm Latest Version

> **重要**: 检测 npm 上的最新版本，若本地落后则等待用户手动更新后继续。

```javascript
// 检测 npm 最新版本
const npmVersionResult = Bash(`npm view claude-code-workflow version 2>/dev/null || echo "无法获取 npm 版本"`);

let npmLatestVersion = null;
if (npmVersionResult && !npmVersionResult.includes('无法获取')) {
  npmLatestVersion = 'v' + npmVersionResult.trim();
  console.log(`npm latest version: ${npmLatestVersion}`);
} else {
  console.log(`Warning: ${npmVersionResult}`);
}

// 对比本地版本与 npm 最新版本
let localIsOutdated = false;
if (npmLatestVersion && localVersion) {
  const localParts = localVersion.replace('v', '').split('.').map(Number);
  const npmParts = npmLatestVersion.replace('v', '').split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if ((localParts[i] || 0) < (npmParts[i] || 0)) {
      localIsOutdated = true;
      break;
    } else if ((localParts[i] || 0) > (npmParts[i] || 0)) {
      break;
    }
  }
}

if (localIsOutdated) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`⚠️ 本地版本落后于 npm 最新版本！`);
  console.log(`${'='.repeat(50)}`);
  console.log(`  本地: ${localVersion}`);
  console.log(`  npm:  ${npmLatestVersion}`);
  console.log(`\n请执行以下命令更新：`);
  console.log(`  npm install -g claude-code-workflow`);
  console.log(`  ccw install -m Path`);

  // 等待用户手动更新后继续
  const updateConfirm = AskUserQuestion({
    questions: [{
      question: `本地版本落后于 npm，请手动更新后选择"继续"`,
      header: '版本更新',
      multiSelect: false,
      options: [
        {
          label: '已更新，继续',
          description: '我已完成 npm install 和 ccw install，继续检测'
        },
        {
          label: '跳过更新',
          description: '继续使用当前版本（可能导致数据不一致）'
        }
      ]
    }]
  });

  if (updateConfirm.includes('已更新，继续')) {
    // 重新读取本地版本
    try {
      const versionData = JSON.parse(Read('.claude/version.json'));
      localVersion = versionData.version;
      console.log(`\n更新后本地版本: ${localVersion}`);
    } catch (e) {
      console.log('Warning: 更新后仍无法读取 .claude/version.json');
    }
  } else {
    console.log(`\n⚠️ 继续使用旧版本，百科数据可能与实际命令不一致！`);
  }
} else {
  console.log(`✓ 本地版本已是最新 (>= npm)`);
}
```

### Step 2: Read Page Version

```javascript
const commandsFile = 'src/data/commands.ts';
const content = Read(commandsFile);

// Extract latestVersion from STATS
const match = content.match(/latestVersion:\s*['"]([^'"]+)['"]/);
const pageVersion = match ? match[1] : null;
console.log(`Page version: ${pageVersion}`);
```

### Step 3: Compare Versions

```javascript
function compareVersions(v1, v2) {
  if (!v1 || !v2) return { needsUpdate: true, reason: 'version_not_found' };

  const parts1 = v1.replace('v', '').split('.').map(Number);
  const parts2 = v2.replace('v', '').split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if ((parts1[i] || 0) > (parts2[i] || 0)) {
      return { needsUpdate: true, reason: 'local_newer', level: i };
    }
    if ((parts1[i] || 0) < (parts2[i] || 0)) {
      return { needsUpdate: false, reason: 'page_newer' };
    }
  }

  return { needsUpdate: false, reason: 'same_version' };
}

const comparison = compareVersions(localVersion, pageVersion);
```

### Step 4: Generate Version Diff Report

```javascript
const versionDiff = {
  timestamp: new Date().toISOString(),
  localVersion,
  npmLatestVersion,
  pageVersion,
  comparison,
  localIsOutdated: npmLatestVersion && localVersion
    ? compareVersions(localVersion, npmLatestVersion).needsUpdate
    : false,
  recommendation: comparison.needsUpdate
    ? 'Update page version to match local'
    : 'No update needed'
};

Write(`${workDir}/version-diff.json`, JSON.stringify(versionDiff, null, 2));

console.log(`\n${'='.repeat(50)}`);
console.log(`Version Comparison Result:`);
console.log(`${'='.repeat(50)}`);
console.log(`  npm 最新:  ${npmLatestVersion || '无法获取'}`);
console.log(`  本地版本: ${localVersion || 'NOT FOUND'}`);
console.log(`  页面版本: ${pageVersion || 'NOT FOUND'}`);
console.log(`  Action: ${comparison.reason}`);
if (versionDiff.localIsOutdated) {
  console.log(`\n⚠️ 本地版本落后于 npm，建议先更新 CCW！`);
}
```

## Output

- **File**: `{workDir}/version-diff.json`
- **Format**: JSON

```json
{
  "timestamp": "2026-03-08T10:00:00Z",
  "localVersion": "v7.1.0",
  "npmLatestVersion": "v7.2.0",
  "pageVersion": "v7.0",
  "comparison": {
    "needsUpdate": true,
    "reason": "local_newer",
    "level": 1
  },
  "localIsOutdated": true,
  "recommendation": "Update page version to match local"
}
```

## Quality Checklist

- [ ] `.claude/version.json` 存在且可读
- [ ] npm 最新版本已获取
- [ ] `STATS.latestVersion` 正确提取
- [ ] 版本对比逻辑正确
- [ ] 本地落后于 npm 时已警告用户
- [ ] 输出文件格式正确

## Next Phase

If `comparison.needsUpdate` is true or user wants to check command changes:

→ [Phase 2: Command Diff](02-command-diff.md)

If no update needed:

→ Skip to completion with summary.
