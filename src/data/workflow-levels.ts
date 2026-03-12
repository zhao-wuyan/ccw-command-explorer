// ============================================
// 4级工作流系统
// ============================================
import type { WorkflowLevel } from './types';
import { COLORS } from './constants';

export const WORKFLOW_LEVELS: WorkflowLevel[] = [
  {
    level: 1,
    name: '/review-code',
    emoji: '⚡',
    desc: '超简单！代码审查和快速修复',
    useCase: '代码质量检查、简单bug修复',
    color: COLORS.secondary,
    commands: ['/review-code']
  },
  {
    level: 2,
    name: '/workflow-lite-plan',
    emoji: '📝',
    desc: '稍微复杂，快速规划执行',
    useCase: '做一个功能、修一个问题',
    color: COLORS.primary,
    commands: ['/workflow-lite-plan']
  },
  {
    level: 3,
    name: '/workflow-plan / workflow-tdd',
    emoji: '🏗️',
    desc: '比较复杂，需要完整规划',
    useCase: '改多个文件、多模块开发',
    color: COLORS.warning,
    commands: ['/workflow-plan', '/workflow-tdd', '/workflow-execute']
  },
  {
    level: 4,
    name: '/team-* 系列命令',
    emoji: '🎯',
    desc: '大项目！多角色团队协作',
    useCase: '新功能设计、架构决策、复杂开发',
    color: COLORS.accent1,
    commands: ['/team-lifecycle-v4', '/team-coordinate', '/team-planex']
  },
];
