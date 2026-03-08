# CCW Wiki Sync

CCW 百科数据自动化更新技能。

## 概述

此技能用于自动同步 CCW 百科项目的数据，包括：

- 版本号更新
- 命令列表同步（新增/删除/修改）
- 案例/经验联动更新
- 时间线维护

## ⚠️ 重要约束：仅限项目级别

> **关键**: 此技能**只检测和同步项目级别**的目录，不涉及用户全局配置。

### 检测范围

| 目录 | 位置 | 是否检测 |
|------|------|----------|
| 项目级 `.claude/` | `{project}/.claude/` | ✅ 是 |
| 项目级 `.codex/` | `{project}/.codex/` | ✅ 是 |
| 用户全局 `~/.claude/` | 用户主目录 | ❌ 否 |
| 用户全局 `~/.codex/` | 用户主目录 | ❌ 否 |

### 原因

1. **版本一致性**: 百科项目展示的是项目级别的命令，与项目环境绑定
2. **数据隔离**: 不同项目可能使用不同版本的 CCW
3. **`ccw install -m Path`**: 此命令安装到项目级别，技能检测的就是这个位置

## 使用方法

### 基本用法

```bash
# 执行完整同步
/ccw-wiki-sync

# 自动模式（跳过确认）
/ccw-wiki-sync -y
```

### 分阶段执行

```bash
# 仅执行版本检查
/ccw-wiki-sync --phase 1

# 仅执行命令差异分析
/ccw-wiki-sync --phase 2

# 仅更新命令
/ccw-wiki-sync --phase 3

# 仅同步案例/经验
/ccw-wiki-sync --phase 4

# 仅更新版本号
/ccw-wiki-sync --phase 5
```

## 前置条件

1. **本地 CCW 数据**
   ```bash
   npm install -g claude-code-workflow
   ccw install -m Path
   ```

2. **sync-commands.py 脚本**
   - 位于 `scripts/sync-commands.py`
   - 需要 Python 环境

## 执行流程

```
Phase 1: Version Check
   ↓ 读取本地版本，对比页面版本
Phase 2: Command Diff
   ↓ 运行 sync-commands.py，分析差异
Phase 3: Command Update
   ↓ 更新 commands.ts, deprecated.ts
Phase 4: Case/Experience Sync
   ↓ 联动更新案例和经验
Phase 5: Version Sync
   → 更新 STATS, timeline.ts
```

## 文件结构

```
ccw-wiki-sync/
├── SKILL.md                     # 技能入口
├── phases/
│   ├── 01-version-check.md      # 版本检测
│   ├── 02-command-diff.md       # 命令差异分析
│   ├── 03-command-update.md     # 命令更新
│   ├── 04-case-experience.md    # 案例/经验同步
│   └── 05-version-sync.md       # 版本同步
├── specs/
│   └── quality-standards.md     # 质量标准
├── templates/
│   ├── command-template.ts      # 命令对象模板
│   └── timeline-template.ts     # 时间线模板
└── README.md                    # 本文件
```

## 输出文件

执行后会在 `.workflow/.scratchpad/wiki-sync-{date}/` 生成：

| 文件 | 内容 |
|------|------|
| `version-diff.json` | 版本对比结果 |
| `command-changes.json` | 命令变动详情 |
| `case-updates.json` | 案例/经验更新记录 |
| `validation-report.json` | 最终验证报告 |

## 关键约束

### cmd 字段规则

cmd 字段必须是纯命令，不含参数：

- ✅ `/workflow-lite-plan`
- ❌ `/workflow-lite-plan --bugfix`

原因：cmd 用于匹配 commands.ts 数据，带参数会导致匹配失败。

### 版本号规则

版本号格式 `a.b.c`：

- `a`: 里程碑版本
- `b`: 大版本（变化时记录到 timeline）
- `c`: 小版本（合并到大版本，不单独记录）

## 数据来源

| 来源 | 路径 | 用途 |
|------|------|------|
| 本地版本 | `.claude/version.json` | 主版本号来源 |
| 页面版本 | `src/data/commands.ts` | STATS.latestVersion |
| GitHub | `https://github.com/catlog22/Claude-Code-Workflow` | 辅助信息 |

## 错误处理

| 错误 | 解决方案 |
|------|----------|
| version.json 不存在 | 执行 `ccw install -m Path` |
| sync-commands.py 失败 | 检查 Python 环境 |
| 命令文件读取失败 | 跳过该命令，记录日志 |
| 案例/经验更新冲突 | 人工确认 |

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-03-08 | 初始版本 |
