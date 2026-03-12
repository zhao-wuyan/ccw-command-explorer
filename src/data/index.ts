// ============================================
// 统一导出所有数据模块
// ============================================

// 类型定义
export type {
  CommandStatus,
  CLIType,
  CommandCategory,
  Command,
  VersionDetail,
  TimelineItem,
  WorkflowLevel,
  ExperienceTip,
  ExperienceTipCommand,
  ExperienceCategory,
  TaskPattern,
  CommandChain,
  MatchResult,
  ChainOption,
  IntentAnalysis,
  GrandmaCommand,
  DeprecatedCommand,
} from './types';

// 常量配置
export { COLORS, CATEGORIES, CLI_CONFIG } from './constants';

// 时间线数据
export { TIMELINE } from './timeline';

// 工作流级别
export { WORKFLOW_LEVELS } from './workflow-levels';

// 命令数据
export { COMMANDS, STATS } from './commands';

// 奶奶级命令
export { GRANDMA_COMMANDS } from './grandma';

// 废弃命令
export { DEPRECATED_COMMANDS } from './deprecated';

// 经验指南
export { EXPERIENCE_GUIDE } from './experience';

// 智能推荐器
export { TASK_PATTERNS, COMMAND_CHAINS, analyzeIntent } from './patterns';

// 重新导出 cases 模块（已存在）
export * from './cases';
