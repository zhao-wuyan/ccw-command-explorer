# CCW Wiki Sync Report

## 同步概要

| 项目 | 值 |
|------|-----|
| 同步日期 | 2026-03-08 |
| 本地版本 | v7.2.2 |
| 页面版本（同步前） | v7.2.1 |
| 页面版本（同步后） | v7.2.2 |
| 命令总数 | 127 |

## 版本变化

**类型**: 小版本更新 (c 版本号变化)

**版本差异**: v7.2.1 → v7.2.2

## 命令变动

### 新增命令 (21个)

#### DDD 文档驱动开发 (9个)
| 命令 | 描述 |
|------|------|
| `/ddd:auto` | 链式命令 - 自动文档驱动开发流程 |
| `/ddd:sync` | 任务后同步 - 更新文档索引、生成操作日志 |
| `/ddd:update` | 增量索引更新 - 检测代码变更并追踪影响 |
| `/ddd:scan` | 扫描代码库构建文档索引 |
| `/ddd:plan` | 文档驱动规划流水线 |
| `/ddd:execute` | 文档感知执行引擎 |
| `/ddd:index-build` | 构建文档索引 |
| `/ddd:doc-refresh` | 增量更新受影响的文档 |
| `/ddd:doc-generate` | 生成完整文档树 |

#### 规格管理 (2个)
| 命令 | 描述 |
|------|------|
| `/workflow:spec:setup` | 初始化项目规格 - cli-explore-agent 分析 + 交互式问卷 |
| `/workflow:spec:add` | 添加规范 - 交互式或直接模式 |

#### 新技能 (6个)
| 命令 | 描述 |
|------|------|
| `/skill-simplify` | SKILL.md 简化 - 功能完整性验证 |
| `/team-designer` | 元技能 - 生成 v4 架构团队技能 |
| `/team-edict` | 三省六部协作框架 - 串行审批+并行执行 |
| `/team-frontend-debug` | 前端调试团队 - Chrome DevTools MCP |
| `/team-ux-improve` | UX 改进团队 |
| `/workflow-lite-execute` | 轻量执行引擎 - 多模式输入执行 |

#### Codex 技能 (4个)
| 命令 | 描述 |
|------|------|
| `/project-documentation-workflow` | 波式项目文档生成器 |
| `/session-sync` | 快速同步会话 |
| `/spec-add` | 添加规范 (Codex 版) |
| `/spec-setup` | 初始化规范 (Codex 版) |

### 废弃命令 (3个)

| 旧命令 | 替代命令 | 原因 |
|--------|----------|------|
| `/workflow:session:solidify` | `/workflow:spec:add` | 固化经验功能整合到规格添加命令 |
| `/workflow:init-specs` | `/workflow:spec:setup` | 命令整合到统一规格管理 |
| `/workflow:init-guidelines` | `/workflow:spec:setup` | 命令整合到统一规格管理 |

## 案例更新

- 更新 `SESS-002` 案例中的命令引用：`/workflow:session:solidify` → `/workflow:spec:add`

## 时间线更新

- 更新 v7.2 条目，版本号从 v7.2.1 更新为 v7.2.2
- 命令数量从 106 更新为 127
- 新增 highlights 内容

## 文件变更

| 文件 | 操作 |
|------|------|
| `src/data/commands.ts` | 更新 STATS, 新增命令 |
| `src/data/deprecated.ts` | 新增废弃命令记录 |
| `src/data/timeline.ts` | 更新 v7.2 条目 |
| `src/data/cases.ts` | 更新 SESS-002 案例 |

## 同步状态

✅ **完成** - 所有阶段执行完毕

- [x] Phase 1: 版本检查
- [x] Phase 2: 命令差异分析
- [x] Phase 3: 命令更新
- [x] Phase 4: 案例/经验同步
- [x] Phase 5: 版本同步
