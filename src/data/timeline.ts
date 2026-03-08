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
    desc: '当前最新版本',
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
        '/team-lifecycle-v5',
        '/team-coordinate-v2',
        '/team-executor-v2',
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
];
