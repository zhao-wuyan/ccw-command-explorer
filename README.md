# CCW Command Explorer

> Claude Code Workflow 命令百科 - 交互式命令探索网站

一个现代化的 Web 应用，用于展示和探索 [Claude-Code-Workflow](https://github.com/catlog22/Claude-Code-Workflow) 项目的完整命令图谱。

## 项目简介

CCW Command Explorer 是一个交互式的命令文档网站，帮助开发者快速了解和使用 Claude Code Workflow 工作流系统。通过可视化的界面，用户可以：

- 浏览 95+ 个工作流命令
- 按分类、等级、CLI 类型筛选命令
- 查看命令的详细说明和使用场景
- 学习实际使用案例
- 了解项目的版本演进历史

## v7.0.5 新版本亮点

### Team 架构全面升级

全新设计的团队协作架构 v2-v5，支持动态角色生成和 team-worker 代理架构：

- **Team Lifecycle v5**：最新生命周期版本，team-worker 架构
- **Team Coordinate v2**：增强协调能力，team-executor-v2 改进代理编排
- **12+ 团队技能更新**：所有团队技能迁移到 v3 设计模式
- **新增团队技能**：team-roadmap-dev、team-tech-debt、team-iterdev、team-frontend、team-uidesign

### 统一工作流引擎

重构的工作流系统，提供更灵活的规划和执行能力：

- **Lightweight Interactive Planning**：内存执行模式，代码探索
- **Session 管理命令**：智能会话发现、恢复、同步、完成、固化
- **新工作流命令**：workflow:analyze-with-file、workflow:brainstorm-with-file、workflow:debug-with-file 等

## 功能特性

### 命令探索

- **分类浏览**：按主入口、工作流、会话管理、Issue 管理、记忆系统、头脑风暴、TDD 开发、测试、代码审查、UI 设计等分类浏览
- **等级筛选**：4 级工作流系统，从简单的 bug 修复到复杂的多角色头脑风暴
- **CLI 支持**：同时支持 Claude Code 和 Codex 命令
- **搜索功能**：快速搜索命令名称或描述

### 交互式学习

- **命令详情弹窗**：点击命令卡片查看详细说明、使用场景、相关命令
- **使用案例**：按等级分类的实际使用案例，展示完整的交互过程
- **版本时间线**：项目成长地图，了解每个版本的新功能和命令

### 快速入门指南

- **老奶奶指南**：只需记住 5 个核心命令，其他的让 `/ccw` 帮你选
- **安装教程**：详细的安装和更新步骤
- **废弃命令说明**：已废弃命令及其替代方案

## 技术栈

- **框架**：React 19 + TypeScript
- **构建工具**：Vite 7
- **样式**：CSS + Framer Motion 动画
- **图标**：Lucide React
- **分析**：Vercel Analytics + Speed Insights

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 项目结构

```
ccw-command-explorer/
├── public/              # 静态资源
├── src/
│   ├── data/
│   │   ├── commands.ts  # 命令数据定义
│   │   └── cases.ts     # 使用案例数据
│   ├── App.tsx          # 主应用组件
│   ├── App.css          # 样式文件
│   ├── main.tsx         # 入口文件
│   └── index.css        # 全局样式
├── index.html           # HTML 模板
├── package.json         # 项目配置
├── tsconfig.json        # TypeScript 配置
└── vite.config.ts       # Vite 配置
```

## 核心数据结构

### 命令 (Command)

```typescript
interface Command {
  cmd: string;           // 命令名称
  desc: string;          // 简短描述
  status: CommandStatus; // 状态：new | stable | recommended | deprecated
  category: CommandCategory; // 分类
  cli: CLIType;          // CLI 类型：claude | codex
  level?: 1 | 2 | 3 | 4; // 工作流等级
  detail?: string;       // 详细说明
  usage?: string;        // 使用场景
}
```

### 使用案例 (Case)

```typescript
interface Case {
  id: string;
  title: string;
  level: CaseLevel;
  category: string;
  scenario: string;
  commands: Array<{ cmd: string; desc: string }>;
  steps: CaseStep[];
  tips?: string[];
}
```

## 主要页面

### 概览页

- 项目成长地图（版本时间线）
- 4 级工作流系统说明
- 老奶奶也能看懂的命令指南

### 命令页

- 完整命令列表
- 多维度筛选（分类/等级/CLI）
- 命令详情弹窗
- 废弃命令说明

### 案例页

- 按等级分类的使用案例
- 交互过程展示
- 实用提示

### 安装页

- 项目仓库链接
- 安装和更新步骤
- 快速开始指南
- 相关资源链接

## 相关资源

- [GitHub 仓库](https://github.com/catlog22/Claude-Code-Workflow)
- [安装指南](https://github.com/catlog22/Claude-Code-Workflow/blob/master/INSTALL_CN.md)
- [快速入门](https://github.com/catlog22/Claude-Code-Workflow/blob/master/GETTING_STARTED_CN.md)
- [更新日志](https://github.com/catlog22/Claude-Code-Workflow/blob/master/CHANGELOG.md)

## 开发

### 代码规范

```bash
npm run lint
```

### 类型检查

```bash
npx tsc --noEmit
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**提示**：按 `/ccw` 让 AI 帮你选择最合适的命令
