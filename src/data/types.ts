// ============================================
// 命令分类和类型定义
// ============================================

export type CommandStatus = 'new' | 'stable' | 'recommended' | 'deprecated';
export type CLIType = 'claude' | 'codex';  // 支持 Claude Code 和 Codex
export type CommandCategory =
  | 'main'      // 主入口
  | 'workflow'  // 工作流
  | 'session'   // 会话管理
  | 'issue'     // Issue管理
  | 'memory'    // 记忆系统
  | 'brainstorm'// 头脑风暴
  | 'tdd'       // TDD开发
  | 'test'      // 测试
  | 'review'    // 代码审查
  | 'ui-design' // UI设计
  | 'prompt'    // 预检清单（Codex专用）
  | 'skill';    // 技能（Codex专用）

export interface Command {
  cmd: string;
  desc: string;
  status: CommandStatus;
  category: CommandCategory;
  cli: CLIType;  // 标注哪个 CLI 可用
  level?: 1 | 2 | 3 | 4;
  addedInVersion?: string;
  detail?: string;  // 详细描述
  usage?: string;   // 使用场景
}

export interface VersionDetail {
  version: string;
  highlights: string[];
  newCommands: string[];
  usage: string;
}

export interface TimelineItem {
  date: string;
  version: string;
  title: string;
  desc: string;
  color: string;
  commands: number;
  detail: VersionDetail;
}

export interface WorkflowLevel {
  level: 1 | 2 | 3 | 4;
  name: string;
  emoji: string;
  desc: string;
  useCase: string;
  color: string;
  commands: string[];
}

// ============================================
// 经验指南类型定义
// ============================================

export interface ExperienceTipCommand {
  cmd: string;
  cli: CLIType;
}

export interface ExperienceTip {
  id: string;
  title: string;
  scenario: string;
  recommendation: string;
  commands: ExperienceTipCommand[];  // 改为对象数组，包含 cmd 和 cli
  commandType: 'select' | 'sequence';  // select=多选一, sequence=按顺序执行
  reason: string;
  tips?: string[];
}

export interface ExperienceCategory {
  id: string;
  title: string;
  emoji: string;
  color: string;
  tips: ExperienceTip[];
}

// ============================================
// 智能推荐器类型定义
// ============================================

export interface TaskPattern {
  type: string;           // 任务类型
  keywords: RegExp;       // 匹配关键词
  level: 1 | 2 | 3 | 4;   // 推荐工作流级别
  flow: string;           // 工作流标识
  desc: string;           // 类型描述
  emoji: string;          // 图标
  weight: number;         // 匹配权重（越高越优先），用于多匹配时排序
}

export interface CommandChain {
  flow: string;
  level: number;
  pipeline: string[];
  commands: { cmd: string; desc: string }[];
  tips: string[];
}

export interface MatchResult {
  pattern: TaskPattern;     // 匹配的模式
  matchedKeyword: string;   // 匹配到的关键词
  score: number;            // 匹配得分（权重 * 关键词长度权重）
}

export interface ChainOption {
  name: string;              // 方案名称
  flow: string;              // 工作流标识
  level: number;             // 复杂度级别
  commands: {cmd: string; desc: string}[];  // 命令列表
  tips?: string[];           // 使用提示
}

export interface IntentAnalysis {
  goal: string;              // 提取的目标
  taskType: string;          // 任务类型
  level: number;             // 复杂度级别
  flow: string;              // 工作流标识（主推荐）
  chain: CommandChain;       // 推荐命令链（向后兼容）
  chains?: ChainOption[];    // 多命令链方案（新）
  pattern: TaskPattern;      // 匹配的模式
  confidence: number;        // 置信度 0-1
  matchedKeyword?: string;   // 匹配到的关键词
  isDefaultFallback: boolean; // 是否使用了默认兜底
  allMatches: MatchResult[]; // 所有匹配结果（用于展示备选）
}

// ============================================
// 奶奶级命令和废弃命令类型定义
// ============================================

export interface GrandmaCommand {
  cmd: string;
  desc: string;
  emoji: string;
  scenario: string;
  category: string;
  detail: string;
}

export interface DeprecatedCommand {
  old: string;
  newCmd: string | null;
  reason: string;
  deprecatedInVersion?: string;  // 废弃版本号
}
