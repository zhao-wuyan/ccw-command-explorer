---
name: ccw-wiki-sync
description: CCW 百科数据自动化更新 - 从 npm/GitHub 同步版本、命令、案例数据。Triggers on "ccw wiki", "wiki update", "sync wiki", "update commands".
allowed-tools: Task, Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

# CCW Wiki Sync

CCW 百科数据自动化更新技能 - 从 npm 版本和 GitHub 仓库同步命令、版本、案例等数据到百科项目。

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CCW WIKI SYNC WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Phase 1: Version Check                                                  │
│     ├─ Read .claude/version.json (local version)                         │
│     ├─ Compare with STATS.latestVersion (page version)                   │
│     └─ Determine update necessity                                        │
│                                                                          │
│  Phase 2: Command Diff                                                   │
│     ├─ Run scripts/sync-commands.py --json                               │
│     ├─ Parse: missing (new), extra (deleted), stale (residue)            │
│     └─ git diff for modified commands                                    │
│                                                                          │
│  Phase 3: Command Update                                                 │
│     ├─ New commands → Read .md/SKILL.md → Generate Command object        │
│     ├─ Deleted commands → Move to deprecated.ts                          │
│     ├─ Modified commands → Update desc/detail/usage                      │
│     └─ Update patterns.ts → Add/Remove TASK_PATTERNS & COMMAND_CHAINS    │
│                                                                          │
│  Phase 4: Case/Experience Sync                                           │
│     ├─ Check cases.ts for deprecated command refs                        │
│     ├─ Partial deprecated → Supplement new command chain                 │
│     ├─ All deprecated → Delete case/experience                           │
│     └─ Validate cmd field (pure command, no params)                      │
│                                                                          │
│  Phase 5: Version Sync                                                   │
│     ├─ Update STATS.latestVersion                                        │
│     ├─ Update STATS.totalCommands                                        │
│     ├─ Major version (b changes) → Add to timeline.ts                    │
│     └─ GitHub release info supplement (optional)                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Design Principles

1. **项目级别限定**: 只检测和同步项目级别的 `.claude/` 和 `.codex/` 目录，不涉及用户全局目录（`~/.claude/`、`~/.codex/`）
2. **⚠️ 忽略自身**: `ccw-wiki-sync` 是同步工具本身，**不参与同步对比和判断**，应被排除检测（已硬编码在 `scripts/sync-commands.py` 的 `EXCLUDED_SKILLS` 中）
3. **📋 用户说明必须明确**: Phase 2 检测结果**必须向用户说明**判断理由：
   - **需要更新时**：列出新增/删除/修改的命令清单
   - **无需更新时**：明确理由（版本一致、命令数一致、无变动等）
4. **版本优先级**: npm 版本为主，GitHub 版本为辅
5. **增量更新**: 只处理变动的命令，不重新生成全部
6. **联动更新**: 命令变化时自动更新相关案例和经验
7. **cmd 字段约束**: cmd 必须是纯命令，不含参数（用于匹配 commands.ts）
8. **版本更新规则**: `a.b.c` 中 `b` 变化是大版本，创建新 timeline 条目；`c` 变化是小版本，合并到现有大版本条目中
9. **git diff 范围限制**: 执行 `git diff` 时，**只关注** `.codex/`、`.claude/` 和 `src/data/` 目录的变动
10. **timeline 内容约束**: timeline **只记录**来自 `.codex/` 和 `.claude/` 目录的命令/skill 变动；**百科项目本身的 UI、组件等变动不写入 timeline**（timeline 是针对 ccw 工作流和 skill 数据的）
11. **⚠️ CCW 更新前置**: 检测版本前**必须**先更新 CCW：`npm install -g claude-code-workflow && ccw install -m Path`，或确认已更新
12. **💡 GitHub Release 可选**: 尝试从 https://github.com/catlog22/Claude-Code-Workflow/releases 获取版本变动说明用于生成 `highlights`；**获取失败时自动跳过**（GitHub 可能尚未更新该版本说明），使用默认描述
13. **⚠️ 废弃版本号必须明确**: 添加废弃命令时**必须包含 `deprecatedInVersion` 字段**，版本号判断遵循以下优先级：
    - **本地优先**: 使用 `version-diff.json` 中的 `localVersion`
    - **GitHub 验证（版本跳跃）**: 当版本号跳跃多个小版本时（如 v7.0 → v7.2.3），**必须**从 GitHub releases 验证
    - **GitHub 补充**: 本地无法判断时，从 GitHub release notes 搜索命令变动信息
    - **跳跃检测**: 大版本跳跃（6.x→7.x）、中版本跳跃（7.0→7.2）、修复版本跳跃>5 个（7.2.0→7.2.6）时触发验证

---

## ⚠️ Critical Constraint: Project-Level Only

> **重要**: 此技能**只处理项目级别**的命令目录，不涉及用户全局配置。

### 检测范围

| 目录 | 位置 | 是否检测 |
|------|------|----------|
| 项目级 `.claude/` | `{project}/.claude/` | ✅ **是** |
| 项目级 `.codex/` | `{project}/.codex/` | ✅ **是** |
| 用户全局 `~/.claude/` | 用户主目录 | ❌ **否** |
| 用户全局 `~/.codex/` | 用户主目录 | ❌ **否** |

### 原因

1. **版本一致性**: 百科项目展示的是项目级别的命令，与项目环境绑定
2. **数据隔离**: 不同项目可能使用不同版本的 CCW，全局配置会影响判断
3. **`ccw install -m Path`**: 此命令安装到项目级别，技能检测的就是这个位置

---

## Data Sources

| Source | Path | Purpose |
|--------|------|---------|
| **本地版本** | `.claude/version.json` | version 字段 |
| **页面版本** | `src/data/commands.ts` | STATS.latestVersion |
| **命令列表** | `src/data/commands.ts` | COMMANDS 数组 |
| **废弃命令** | `src/data/deprecated.ts` | DEPRECATED_COMMANDS |
| **成长地图** | `src/data/timeline.ts` | TIMELINE |
| **使用案例** | `src/data/cases.ts` | ALL_CASES |
| **经验指南** | `src/data/experience.ts` | EXPERIENCE_GUIDE |
| **命令模式** | `src/data/patterns.ts` | TASK_PATTERNS + COMMAND_CHAINS |

## Command Directories (Project-Level Only)

> **约束**: 以下目录均为**项目级别**，位于项目根目录下。不扫描用户全局目录。

| Directory | Type | CLI | Full Path |
|-----------|------|-----|-----------|
| `.claude/commands/` | 斜杠命令 | Claude Code | `{project}/.claude/commands/` |
| `.claude/skills/` | 技能 | Claude Code | `{project}/.claude/skills/` |
| `.codex/prompts/` | 斜杠命令 | Codex | `{project}/.codex/prompts/` |
| `.codex/skills/` | 技能 | Codex | `{project}/.codex/skills/` |

**版本文件**: `{project}/.claude/version.json` - 由 `ccw install -m Path` 生成

---

## Directory Setup

```javascript
const timestamp = new Date().toISOString().slice(0, 10);
const workDir = `.workflow/.scratchpad/wiki-sync-${timestamp}`;

Bash(`mkdir -p "${workDir}"`);
```

## Output Structure

```
.workflow/.scratchpad/wiki-sync-{date}/
├── sync-status.json       # 同步状态
├── version-diff.json      # 版本差异
├── command-changes.json   # 命令变动详情
├── case-updates.json      # 案例更新记录
└── validation-report.json # 验证报告
```

---

## Execution Flow

### Phase 1: Version Check

检查本地版本与页面版本，判断是否需要更新。

**Input**: `.claude/version.json`, `src/data/commands.ts`
**Output**: `version-diff.json`

→ [phases/01-version-check.md](phases/01-version-check.md)

### Phase 2: Command Diff

运行 sync-commands.py 脚本，分析命令变动。

**Input**: `version-diff.json`
**Output**: `command-changes.json`

→ [phases/02-command-diff.md](phases/02-command-diff.md)

### Phase 3: Command Update

更新命令详情：新增、删除、修改，并同步 patterns.ts 中的关键词匹配。

**Input**: `command-changes.json`
**Output**: Updated `src/data/commands.ts`, `src/data/deprecated.ts`, `src/data/patterns.ts`

→ [phases/03-command-update.md](phases/03-command-update.md)

### Phase 4: Case/Experience Sync

同步案例和经验中的命令引用。

**Input**: `command-changes.json`
**Output**: Updated `src/data/cases.ts`, `src/data/experience.ts`

→ [phases/04-case-experience.md](phases/04-case-experience.md)

### Phase 5: Version Sync

更新版本号和时间线。

**Input**: All previous outputs
**Output**: Updated `STATS`, `timeline.ts`

→ [phases/05-version-sync.md](phases/05-version-sync.md)

---

## Reference Documents by Phase

### Phase 1: Version Check

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [phases/01-version-check.md](phases/01-version-check.md) | 版本检测执行指南 | 执行 Phase 1 时 |
| [specs/quality-standards.md](specs/quality-standards.md) | 质量标准 | 验证输出 |

### Phase 2: Command Diff

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [phases/02-command-diff.md](phases/02-command-diff.md) | 命令差异分析指南 | 执行 Phase 2 时 |
| `scripts/sync-commands.py` | 现有同步脚本 | 调用脚本时 |

### Phase 3: Command Update

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [phases/03-command-update.md](phases/03-command-update.md) | 命令更新指南 | 执行 Phase 3 时 |
| [templates/command-template.ts](templates/command-template.ts) | 命令对象模板 | 生成新命令时 |
| `src/data/patterns.ts` | 关键词匹配和命令链 | 更新智能推荐时 |

### Phase 4: Case/Experience Sync

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [phases/04-case-experience.md](phases/04-case-experience.md) | 案例/经验联动指南 | 执行 Phase 4 时 |

### Phase 5: Version Sync

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [phases/05-version-sync.md](phases/05-version-sync.md) | 版本同步指南 | 执行 Phase 5 时 |
| [templates/timeline-template.ts](templates/timeline-template.ts) | 时间线模板 | 添加新版本时 |

---

## Quick Start

```bash
# 检查当前状态
python scripts/sync-commands.py --json

# 执行完整同步
/ccw-wiki-sync

# 仅更新版本号
/ccw-wiki-sync --phase 5

# 自动模式（跳过确认）
/ccw-wiki-sync -y
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| `.claude/version.json` 不存在 | 提示用户先执行 `ccw install -m Path` |
| `sync-commands.py` 执行失败 | 检查 Python 环境，重试 |
| 命令文件读取失败 | 跳过该命令，记录到日志 |
| 案例/经验更新冲突 | 人工确认后处理 |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-03-08 | 初始版本 - 5 阶段同步流程 |
