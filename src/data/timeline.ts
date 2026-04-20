// ============================================
// 时间线数据 - 带版本详情
// ============================================
import type { TimelineItem } from './types';
import { COLORS } from './constants';

export const TIMELINE: TimelineItem[] = [
  {
    date: '2025-09',
    version: 'v1.0',
    title: '项目诞生',
    desc: '基础命令框架搭建',
    color: COLORS.primary,
    commands: 12,
    detail: {
      version: 'v1.0',
      highlights: [
        '建立基础工作流框架',
        '实现简单的任务执行',
        '基础的文件操作命令'
      ],
      newCommands: [
        '/workflow:plan',
        '/workflow:execute',
        '/workflow:replan',
        '/memory:load'
      ],
      usage: '这是 CCW 的第一个版本，主要提供基础的规划和执行能力。使用 /workflow:plan 规划任务，然后用 /workflow:execute 执行。'
    }
  },
  {
    date: '2025-10',
    version: 'v5.0',
    title: '大瘦身',
    desc: '精简重构，移除MCP依赖',
    color: COLORS.secondary,
    commands: 22,
    detail: {
      version: 'v5.0',
      highlights: [
        '移除 MCP 依赖，简化架构',
        '优化命令执行性能',
        '引入会话管理系统'
      ],
      newCommands: [
        '/workflow:session:start',
        '/workflow:session:list',
        '/workflow:session:resume',
        '/workflow:session:complete',
        '/issue:new',
        '/issue:plan'
      ],
      usage: '重大架构调整版本！新增会话管理，可以保存和恢复工作状态。'
    }
  },
  {
    date: '2025-11',
    version: 'v5.2',
    title: '记忆时代',
    desc: 'SKILL记忆系统上线',
    color: COLORS.accent1,
    commands: 35,
    detail: {
      version: 'v5.2',
      highlights: [
        'SKILL 记忆系统正式上线',
        '支持上下文压缩和记忆加载',
        '新增文档生成功能'
      ],
      newCommands: [
        '/memory:compact',
        '/memory:update-full',
        '/skill-generator',
        '/skill-tuning',
        '/review-code'
      ],
      usage: '记忆系统大升级！用 /memory:compact 压缩会话记忆，/memory:update-full 更新项目文档。'
    }
  },
  {
    date: '2025-12',
    version: 'v6.0',
    title: '问题管理',
    desc: 'Issue工作流完善',
    color: COLORS.warning,
    commands: 48,
    detail: {
      version: 'v6.0',
      highlights: [
        '完整的 Issue 工作流',
        '问题发现和队列管理',
        'TDD 开发流程支持'
      ],
      newCommands: [
        '/issue:queue',
        '/issue:execute',
        '/issue:discover',
        '/workflow:tdd-plan',
        '/workflow:tdd-verify'
      ],
      usage: 'Issue 管理大升级！用 /issue:discover 发现潜在问题，/issue:queue 形成执行队列。'
    }
  },
  {
    date: '2026-01',
    version: 'v6.2',
    title: '智能编排',
    desc: 'CCW统一入口',
    color: COLORS.accent2,
    commands: 62,
    detail: {
      version: 'v6.2',
      highlights: [
        'CCW 统一入口命令',
        '智能意图分析',
        '轻量级工作流系统'
      ],
      newCommands: [
        '/ccw',
        '/ccw-help',
        '/ccw-coordinator',
        '/workflow:lite-plan',
        '/workflow:lite-execute',
        '/workflow:lite-fix'
      ],
      usage: '最重要的更新！现在只需要记住 /ccw，它会智能分析你的意图，自动选择最合适的命令。'
    }
  },
  {
    date: '2026-02',
    version: 'v6.3',
    title: '4级工作流',
    desc: 'UI设计工作流上线',
    color: COLORS.accent3,
    commands: 75,
    detail: {
      version: 'v6.3',
      highlights: [
        '4级工作流系统',
        'UI 设计工作流',
        '增强的头脑风暴'
      ],
      newCommands: [
        '/workflow:brainstorm:auto-parallel',
        '/workflow:ui-design:explore-auto',
        '/workflow:ui-design:imitate-auto',
        '/workflow:review-module-cycle',
        '/workflow:test-cycle-execute'
      ],
      usage: '4级工作流让复杂度选择更清晰！还有全新的 UI 设计工作流！'
    }
  },
  {
    date: '2026-02',
    version: 'v7.0',
    title: '重大架构更新',
    desc: 'Team 系统重构',
    color: COLORS.accent5,
    commands: 120,
    detail: {
      version: 'v7.0',
      highlights: [
        'Team 架构全面升级 v2-v5',
        '统一工作流引擎',
        'Terminal Dashboard 重新设计',
        '队列调度系统',
        'Skill Hub 社区技能',
        '前端部署修复'
      ],
      newCommands: [
        '/team-lifecycle-v4',
        '/team-coordinate',
        '/team-executor',
        '/team-ultra-analyze',
        '/team-brainstorm',
        '/team-quality-assurance',
        '/workflow:session:*',
        '/workflow:tdd-*',
        '/workflow:test-fix-*',
        '/skill-generator',
        '/issue-manage'
      ],
      usage: '重大架构更新！Team 系统重构、工作流引擎改革、Dashboard 升级、队列调度系统，335+ 提交，442+ 新功能！'
    }
  },
  {
    date: '2026-03',
    version: 'v7.2',
    title: '架构优化与文档驱动',
    desc: '',
    color: COLORS.primary,
    commands: 126,
    detail: {
      version: 'v7.2.29',
      highlights: [
        '新 Skill: team-planex-v2 混合规划执行管道',
        '新 Skill: team-arch-opt 架构优化',
        '新 Skill: DDD 文档驱动开发流水线 (9 个命令)',
        '新 Skill: team-edict 三省六部协作框架',
        '新 Skill: team-frontend-debug 前端调试',
        '新 Skill: team-ux-improve UX 改进',
        '新 Skill: skill-simplify SKILL.md 简化',
        '新 Skill: skill-iter-tune 迭代式技能调优',
        '新 Skill: workflow-lite-execute 轻量执行引擎',
        '新命令: workflow:spec:setup、workflow:spec:add、workflow:spec:load',
        '依赖循环、耦合内聚分析',
        '分层违规、God Class 检测',
        '废弃: team-lifecycle-v3/v5, team-coordinate-v2, team-executor-v2',
        'v7.2.20: 移除 DDD/IDAW 系列命令',
        'v7.2.28: 新增 investigate、security-audit、ship 技能',
        'v7.2.28: 新增 team-interactive-craft、team-motion-design、team-ui-polish、team-visual-a11y 团队技能',
        'v7.2.28: 移除 team-iterdev、prep-plan、prep-cycle、unified-execute-with-file、collaborative-plan-with-file',
        'v7.2.29: Codex v4 Agent API 统一化 - wait/wait_agent/send_input/assign_task'
      ],
      newCommands: [
        '/team-planex-v2',
        '/ddd:auto',
        '/ddd:sync',
        '/ddd:update',
        '/ddd:scan',
        '/ddd:plan',
        '/ddd:execute',
        '/ddd:index-build',
        '/ddd:doc-refresh',
        '/ddd:doc-generate',
        '/workflow:spec:setup',
        '/workflow:spec:add',
        '/workflow:spec:load',
        '/team-designer',
        '/team-edict',
        '/team-frontend-debug',
        '/team-ux-improve',
        '/skill-simplify',
        '/skill-iter-tune',
        '/workflow-lite-execute',
        '/investigate',
        '/security-audit',
        '/ship',
        '/team-interactive-craft',
        '/team-motion-design',
        '/team-ui-polish',
        '/team-visual-a11y'
      ],
      usage: 'v7.2.28 新增系统化调试、安全审计、发布流水线技能，以及4个专业团队技能(交互组件、动效设计、UI精修、视觉无障碍)。移除了 DDD/IDAW 系列和 prep 预检清单等过时命令。'
    }
  },
  {
    date: '2026-04',
    version: 'v7.3.8',
    title: 'Chain 链式工作流',
    desc: '当前最新版本',
    color: COLORS.primary,
    commands: 111,
    detail: {
      version: 'v7.3.8',
      highlights: [
        '新 Skill: ccw-chain 链式工作流编排引擎',
        '新 Skill: ccw-coordinate 流水线协调器(Codex)',
        '移除: chain-loader、workflow-skill',
        '移除: workflow:collaborative-plan-with-file、workflow:unified-execute-with-file',
        '移除: flow-create、cli:li-init、cli:codex-review',
        'memory-capture 支持 Codex',
        'ship 流水线扩展至 7 阶段(新增平台发布+GitHub Release)',
      ],
      newCommands: [
        '/ccw-chain',
        '/ccw-coordinate',
      ],
      usage: 'v7.3 引入 Chain 链式工作流架构和流水线协调器。移除 chain-loader、workflow-skill 和 with-file 系列过时命令。memory-capture 现同时支持 Claude Code 和 Codex。'
    }
  },
];
