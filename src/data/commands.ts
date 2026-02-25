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
// 颜色配置
// ============================================
export const COLORS = {
  bg: '#0a0a0f',
  bgGradient1: '#1a1a2e',
  bgGradient2: '#16213e',
  primary: '#6366f1',
  primaryLight: '#818cf8',
  secondary: '#10b981',
  secondaryLight: '#34d399',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  danger: '#ef4444',
  dangerLight: '#f87171',
  text: '#ffffff',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  accent1: '#ec4899',
  accent2: '#8b5cf6',
  accent3: '#06b6d4',
  accent4: '#84cc16',
  accent5: '#f97316',
  cardBg: 'rgba(255,255,255,0.05)',
  cardBorder: 'rgba(255,255,255,0.1)',
};

// ============================================
// 分类配置
// ============================================
export const CATEGORIES: Record<CommandCategory, { label: string; icon: string; color: string }> = {
  'main': { label: '🌟 主入口', icon: 'Home', color: COLORS.accent1 },
  'workflow': { label: '⚙️ 工作流', icon: 'GitBranch', color: COLORS.primary },
  'session': { label: '🔄 会话管理', icon: 'Users', color: COLORS.primaryLight },
  'issue': { label: '🐛 Issue管理', icon: 'AlertCircle', color: COLORS.warning },
  'memory': { label: '📚 记忆系统', icon: 'Database', color: COLORS.accent2 },
  'brainstorm': { label: '🧠 头脑风暴', icon: 'Lightbulb', color: COLORS.accent1 },
  'tdd': { label: '🧪 TDD开发', icon: 'TestTube', color: COLORS.secondary },
  'test': { label: '🔬 测试', icon: 'FlaskConical', color: COLORS.accent4 },
  'review': { label: '👀 代码审查', icon: 'Search', color: COLORS.danger },
  'ui-design': { label: '🎨 UI设计', icon: 'Palette', color: COLORS.accent3 },
  'prompt': { label: '📋 预检清单', icon: 'ClipboardCheck', color: COLORS.accent5 },
  'skill': { label: '🛠️ 技能', icon: 'Wrench', color: COLORS.accent4 },
};

// ============================================
// CLI 配置
// ============================================
export const CLI_CONFIG: Record<CLIType, { label: string; color: string; shortLabel: string }> = {
  'claude': { label: 'Claude Code', color: COLORS.accent2, shortLabel: 'C' },
  'codex': { label: 'Codex', color: COLORS.accent3, shortLabel: 'X' },
};

// ============================================
// 时间线数据 - 带版本详情
// ============================================
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
    desc: '当前最新版本',
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
];

// ============================================
// 4级工作流系统
// ============================================
export const WORKFLOW_LEVELS: WorkflowLevel[] = [
  {
    level: 1,
    name: '/workflow:lite-fix',
    emoji: '⚡',
    desc: '超简单！直接修bug',
    useCase: '改配置、换变量名、修简单bug',
    color: COLORS.secondary,
    commands: ['/workflow:lite-fix']
  },
  {
    level: 2,
    name: '/workflow:lite-plan /lite-execute',
    emoji: '📝',
    desc: '稍微复杂，先想再做',
    useCase: '做一个功能、修一个问题',
    color: COLORS.primary,
    commands: ['/workflow:lite-plan', '/workflow:lite-execute']
  },
  {
    level: 3,
    name: '/workflow:plan /tdd-plan',
    emoji: '🏗️',
    desc: '比较复杂，需要完整规划',
    useCase: '改多个文件、多模块开发',
    color: COLORS.warning,
    commands: ['/workflow:plan', '/workflow:tdd-plan', '/workflow:execute', '/workflow:replan']
  },
  {
    level: 4,
    name: '/workflow:brainstorm:*',
    emoji: '🎯',
    desc: '大项目！多个角色头脑风暴',
    useCase: '新功能设计、架构决策',
    color: COLORS.accent1,
    commands: ['/workflow:brainstorm:auto-parallel', '/workflow:brainstorm:artifacts', '/workflow:brainstorm:synthesis']
  },
];

// ============================================
// 完整命令列表 - 基于 CCW 仓库实际存在
// ============================================
export const COMMANDS: Command[] = [
  // ==================== 主入口命令 ====================
  { cmd: '/ccw', desc: '主入口！智能分析意图，自动选择命令', status: 'recommended', category: 'main', cli: 'claude', addedInVersion: 'v6.2',
    detail: 'CCW 统一入口，智能分析用户输入的意图，自动推荐和执行最合适的命令或命令链',
    usage: '不知道用什么命令时，直接说 /ccw 加你的需求描述'
  },
  { cmd: '/ccw-help', desc: '命令帮助系统，搜索和浏览所有命令', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.2',
    detail: '交互式命令浏览器，支持搜索、分类浏览、查看命令详情',
    usage: '想了解所有可用命令或查找特定命令时'
  },
  { cmd: '/ccw-coordinator', desc: '交互式命令编排，分析需求推荐命令链', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.2',
    detail: '分析复杂需求，推荐最优命令执行序列，支持交互式调整',
    usage: '有复杂需求需要多个命令配合完成时'
  },
  { cmd: '/flow-create', desc: '创建工作流模板', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.0',
    detail: '创建可复用的工作流模板，定义固定的命令序列和参数',
    usage: '需要创建可重复执行的工作流模板时'
  },

  // ==================== CLI 工具 ====================
  { cmd: '/cli:cli-init', desc: '初始化 CLI 工具配置 (Gemini/Qwen)', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.2',
    detail: '为 Gemini 和 Qwen CLI 工具创建配置文件（.gemini/、.qwen/）',
    usage: '首次使用外部 CLI 工具前初始化配置'
  },
  { cmd: '/cli:codex-review', desc: 'Codex 代码审查', status: 'stable', category: 'review', cli: 'claude', addedInVersion: 'v6.2',
    detail: '调用 Codex CLI 进行代码审查，支持多种审查目标（未提交/分支对比/特定提交）',
    usage: '需要使用 Codex 进行专业代码审查时'
  },

  // ==================== 工作流核心 ====================
  { cmd: '/workflow:plan', desc: '5阶段规划工作流，生成 IMPL_PLAN.md', status: 'stable', category: 'workflow', cli: 'claude', level: 3, addedInVersion: 'v1.0',
    detail: '完整的5阶段规划：会话启动→上下文收集→智能分析→概念澄清→任务生成',
    usage: '复杂功能开发，需要详细规划任务时'
  },
  { cmd: '/workflow:lite-plan', desc: '轻量级交互规划，内存中快速规划', status: 'stable', category: 'workflow', cli: 'claude', level: 2, addedInVersion: 'v6.2',
    detail: '轻量级规划流程，在内存中完成规划，不生成持久化文件',
    usage: '中等复杂度任务，需要快速规划'
  },
  { cmd: '/workflow:lite-execute', desc: '执行内存中的计划', status: 'stable', category: 'workflow', cli: 'claude', level: 2, addedInVersion: 'v6.2',
    detail: '执行 lite-plan 生成的内存计划',
    usage: '配合 /workflow:lite-plan 使用'
  },
  { cmd: '/workflow:lite-fix', desc: '智能 bug 诊断修复', status: 'new', category: 'workflow', cli: 'claude', level: 2, addedInVersion: 'v6.2',
    detail: '自动诊断问题根因并提供修复方案，支持交互式确认',
    usage: '发现 bug 需要快速定位和修复时'
  },
  { cmd: '/workflow:execute', desc: '协调 Agent 执行任务', status: 'stable', category: 'workflow', cli: 'claude', level: 3, addedInVersion: 'v1.0',
    detail: '协调多个 Agent 按依赖顺序执行任务，支持进度跟踪',
    usage: '执行已规划的任务列表'
  },
  { cmd: '/workflow:replan', desc: '交互式重新规划', status: 'stable', category: 'workflow', cli: 'claude', level: 3, addedInVersion: 'v1.0',
    detail: '基于当前执行状态重新规划任务，支持增量调整',
    usage: '执行中发现需要调整计划时'
  },
  { cmd: '/workflow:resume', desc: '智能恢复工作流会话', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0',
    detail: '检测并恢复中断的工作流会话，保持上下文连续性',
    usage: '之前的工作流被中断需要继续时'
  },
  { cmd: '/workflow:review', desc: '后实现审查', status: 'stable', category: 'review', cli: 'claude', addedInVersion: 'v6.0',
    detail: '实现完成后的代码审查，检查代码质量和规范遵循',
    usage: '功能开发完成后进行质量检查'
  },
  { cmd: '/workflow:status', desc: '生成任务状态视图', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '显示当前工作流的状态、进度和任务详情',
    usage: '想了解当前工作流执行进度时'
  },
  { cmd: '/workflow:init', desc: '初始化项目状态', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0',
    detail: '初始化 .workflow 目录结构，创建必要的配置文件',
    usage: '在新项目中首次使用 CCW 时'
  },
  { cmd: '/workflow:clean', desc: '清理代码和临时文件', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.2',
    detail: '智能检测并清理过时的会话、临时文件、死代码等',
    usage: '项目需要清理冗余文件时'
  },
  { cmd: '/workflow:plan-verify', desc: '计划一致性验证', status: 'stable', category: 'review', cli: 'claude', addedInVersion: 'v6.0',
    detail: '验证任务计划的一致性和完整性',
    usage: '执行前验证计划的正确性'
  },

  // With-File 系列
  { cmd: '/workflow:analyze-with-file', desc: '交互式协作分析', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '基于文件进行深度代码分析，记录分析过程和发现',
    usage: '需要深入分析代码库或特定模块时'
  },
  { cmd: '/workflow:debug-with-file', desc: '交互式调试', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '假设驱动的调试工作流，记录探索过程和解决方案',
    usage: '遇到复杂 bug 需要系统化调试时'
  },
  { cmd: '/workflow:collaborative-plan-with-file', desc: '协作式规划', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '多人协作规划工作流，支持任务分配和冲突检测',
    usage: '需要团队协作完成复杂任务时'
  },
  { cmd: '/workflow:brainstorm-with-file', desc: '交互式头脑风暴', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '基于文件内容进行创意发散，记录想法演变过程',
    usage: '需要创意思考或功能设计时'
  },
  { cmd: '/workflow:req-plan-with-file', desc: '需求规划', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.2',
    detail: '从需求文档提取并规划实现任务',
    usage: '有现成的需求文档需要转化为开发任务时'
  },
  { cmd: '/workflow:unified-execute-with-file', desc: '通用执行引擎', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.2',
    detail: '统一的任务执行引擎，支持多种任务文件格式',
    usage: '执行各种格式规划文件中的任务'
  },
  { cmd: '/workflow:integration-test-cycle', desc: '集成测试循环', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.2',
    detail: '集成测试生成和执行的迭代循环',
    usage: '需要进行集成测试时'
  },
  { cmd: '/workflow:refactor-cycle', desc: '重构循环', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.2',
    detail: '安全的代码重构工作流，包含测试验证和回滚支持',
    usage: '需要进行代码重构时'
  },

  // ==================== 会话管理 ====================
  { cmd: '/workflow:session:start', desc: '开始新的工作流会话', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0',
    detail: '创建新的工作流会话，初始化会话目录和配置',
    usage: '开始一个新的开发任务时'
  },
  { cmd: '/workflow:session:list', desc: '列出所有会话及其状态', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0',
    detail: '显示所有工作流会话及其当前状态（活跃/暂停/完成）',
    usage: '查看所有会话概览时'
  },
  { cmd: '/workflow:session:resume', desc: '恢复最近暂停的会话', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0',
    detail: '找到最近暂停的会话并恢复执行',
    usage: '继续之前暂停的工作时'
  },
  { cmd: '/workflow:session:complete', desc: '完成并归档会话', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0',
    detail: '标记会话为完成，生成总结报告并归档',
    usage: '任务完成后进行收尾'
  },
  { cmd: '/workflow:session:solidify', desc: '固化会话经验为永久规则', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.2',
    detail: '将会话中学到的经验固化为可复用的规则和模板',
    usage: '有值得保留的经验需要固化时'
  },

  // ==================== Issue 管理 ====================
  { cmd: '/issue:new', desc: '创建结构化 Issue', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v5.0',
    detail: '创建符合 CCW 规范的结构化 Issue 文件',
    usage: '需要记录新问题或任务时'
  },
  { cmd: '/issue:plan', desc: '规划 Issue 解决方案', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v5.0',
    detail: '为 Issue 生成详细的解决方案计划',
    usage: '需要规划如何解决特定 Issue 时'
  },
  { cmd: '/issue:queue', desc: '形成执行队列', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0',
    detail: '将多个 Issue 按优先级和依赖关系排列成执行队列',
    usage: '批量处理多个 Issue 时'
  },
  { cmd: '/issue:execute', desc: '执行 Issue 解决方案', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0',
    detail: '执行队列中的 Issue 解决方案',
    usage: '执行已规划的 Issue 时'
  },
  { cmd: '/issue:discover', desc: '多角度发现潜在问题', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0',
    detail: '从多个维度（代码质量、安全、性能等）自动发现项目潜在问题',
    usage: '想主动发现项目中的隐藏问题时'
  },
  { cmd: '/issue:discover-by-prompt', desc: '智能问题发现', status: 'new', category: 'issue', cli: 'claude', addedInVersion: 'v6.3',
    detail: '基于自然语言描述智能发现相关问题',
    usage: '有具体关注点需要发现问题时'
  },
  { cmd: '/issue:convert-to-plan', desc: '转换规划产物为执行计划', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0',
    detail: '将各种规划文档转换为可执行的 Issue 计划',
    usage: '有现成的规划文档需要执行时'
  },
  { cmd: '/issue:from-brainstorm', desc: '头脑风暴结果转 Issue', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0',
    detail: '将头脑风暴产生的想法转化为结构化 Issue',
    usage: '头脑风暴后需要转化为具体任务时'
  },

  // ==================== 记忆系统 ====================
  { cmd: '/memory:docs', desc: '规划文档工作流', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '规划项目文档的更新策略',
    usage: '需要更新项目文档但不确定范围时'
  },
  { cmd: '/memory:docs-full-cli', desc: '全量文档生成 (CLI)', status: 'new', category: 'memory', cli: 'claude', addedInVersion: 'v6.2',
    detail: '使用外部 CLI 工具全量更新项目文档',
    usage: '需要全面更新项目所有 CLAUDE.md 时'
  },
  { cmd: '/memory:docs-related-cli', desc: '增量文档更新 (CLI)', status: 'new', category: 'memory', cli: 'claude', addedInVersion: 'v6.2',
    detail: '基于 git 变更增量更新相关模块的文档',
    usage: '只需要更新受影响模块的文档时'
  },
  { cmd: '/memory:update-full', desc: '全量 CLAUDE.md 更新', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '全量扫描并更新项目中所有 CLAUDE.md 文件',
    usage: '项目结构有较大变化时'
  },
  { cmd: '/memory:update-related', desc: '增量 CLAUDE.md 更新', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '只更新与最近变更相关的 CLAUDE.md 文件',
    usage: '日常开发中的文档维护'
  },
  { cmd: '/memory:load', desc: '加载项目上下文', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v1.0',
    detail: '快速加载项目相关的上下文信息到会话',
    usage: '开始新会话需要快速了解项目时'
  },
  { cmd: '/memory:load-skill-memory', desc: '加载技能记忆包', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '加载之前保存的技能记忆包到当前会话',
    usage: '需要复用之前学到的技能时'
  },
  { cmd: '/memory:skill-memory', desc: '生成 SKILL.md', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '从会话中提取并生成 SKILL.md 文件',
    usage: '有可复用的经验需要保存时'
  },
  { cmd: '/memory:code-map-memory', desc: '代码分析生成 Mermaid 文档', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '分析代码结构生成 Mermaid 图表文档',
    usage: '需要可视化代码架构时'
  },
  { cmd: '/memory:tech-research', desc: '技术栈研究和 SKILL 包生成', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '研究新技术栈并生成对应的 SKILL 包',
    usage: '学习新技术并沉淀知识时'
  },
  { cmd: '/memory:workflow-skill-memory', desc: '归档会话生成工作流技能包', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '将完成的工作流会话归档为可复用的技能包',
    usage: '完成重要工作流后沉淀经验时'
  },
  { cmd: '/enhance-prompt', desc: '上下文感知提示词增强', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v6.0',
    detail: '基于当前上下文增强用户的提示词',
    usage: '需要让 AI 更好理解你的意图时'
  },
  { cmd: '/version', desc: '显示版本信息', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v1.0',
    detail: '显示 CCW 的版本信息和更新检查',
    usage: '查看当前版本或检查更新时'
  },

  // ==================== 头脑风暴 ====================
  { cmd: '/workflow:brainstorm:auto-parallel', desc: '并行头脑风暴，动态角色选择', status: 'new', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.3',
    detail: '自动选择多个角色并行进行头脑风暴',
    usage: '需要多角度创意思考时'
  },
  { cmd: '/workflow:brainstorm:artifacts', desc: '生成角色指导规范文档', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '为每个角色生成指导规范文档',
    usage: '需要定义角色职责时'
  },
  { cmd: '/workflow:brainstorm:synthesis', desc: '综合分析结果，智能问答', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '综合多个角色的分析结果，支持交互式问答',
    usage: '需要整合多个视角的分析时'
  },
  { cmd: '/workflow:brainstorm:api-designer', desc: 'API 设计师角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '从 API 设计师角度分析功能需求',
    usage: '需要设计 API 接口时'
  },
  { cmd: '/workflow:brainstorm:data-architect', desc: '数据架构师角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '从数据架构师角度分析数据模型',
    usage: '需要设计数据结构时'
  },
  { cmd: '/workflow:brainstorm:product-manager', desc: '产品经理角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '从产品经理角度分析功能价值',
    usage: '需要评估功能价值时'
  },
  { cmd: '/workflow:brainstorm:product-owner', desc: '产品负责人角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '从产品负责人角度分析优先级',
    usage: '需要确定功能优先级时'
  },
  { cmd: '/workflow:brainstorm:scrum-master', desc: 'Scrum Master 角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '从敏捷教练角度分析流程优化',
    usage: '需要优化开发流程时'
  },
  { cmd: '/workflow:brainstorm:subject-matter-expert', desc: '领域专家角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '从领域专家角度分析业务逻辑',
    usage: '需要深入理解业务领域时'
  },
  { cmd: '/workflow:brainstorm:system-architect', desc: '系统架构师角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '从系统架构师角度分析技术架构',
    usage: '需要设计系统架构时'
  },
  { cmd: '/workflow:brainstorm:ui-designer', desc: 'UI 设计师角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '从 UI 设计师角度分析界面设计',
    usage: '需要设计用户界面时'
  },
  { cmd: '/workflow:brainstorm:ux-expert', desc: 'UX 专家角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '从 UX 专家角度分析用户体验',
    usage: '需要优化用户体验时'
  },

  // ==================== TDD ====================
  { cmd: '/workflow:tdd-plan', desc: 'TDD 工作流规划', status: 'stable', category: 'tdd', cli: 'claude', level: 3, addedInVersion: 'v6.0',
    detail: '测试驱动开发工作流规划，生成 Red-Green-Refactor 任务链',
    usage: '需要按照 TDD 模式开发时'
  },
  { cmd: '/workflow:tdd-verify', desc: '验证 TDD 合规性', status: 'stable', category: 'tdd', cli: 'claude', level: 3, addedInVersion: 'v6.0',
    detail: '验证代码是否符合 TDD 规范',
    usage: '检查 TDD 开发过程是否合规时'
  },

  // ==================== 测试 ====================
  { cmd: '/workflow:test-gen', desc: '生成测试计划', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.0',
    detail: '根据代码生成测试计划和测试用例',
    usage: '需要为新功能生成测试时'
  },
  { cmd: '/workflow:test-fix-gen', desc: '生成测试修复计划', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.0',
    detail: '根据测试失败生成修复计划',
    usage: '测试失败需要修复时'
  },
  { cmd: '/workflow:test-cycle-execute', desc: '测试循环执行直到通过', status: 'new', category: 'test', cli: 'claude', addedInVersion: 'v6.3',
    detail: '迭代执行测试直到所有测试通过',
    usage: '需要确保所有测试通过时'
  },

  // ==================== 代码审查 ====================
  { cmd: '/workflow:review-module-cycle', desc: '模块多维度审查', status: 'new', category: 'review', cli: 'claude', addedInVersion: 'v6.3',
    detail: '对特定模块进行多维度代码审查',
    usage: '需要审查特定模块代码质量时'
  },
  { cmd: '/workflow:review-session-cycle', desc: '会话代码审查', status: 'new', category: 'review', cli: 'claude', addedInVersion: 'v6.3',
    detail: '审查工作流会话中产生的所有代码变更',
    usage: '完成开发后需要审查变更时'
  },
  { cmd: '/workflow:review-fix', desc: '审查问题自动修复', status: 'new', category: 'review', cli: 'claude', addedInVersion: 'v6.3',
    detail: '根据审查结果自动修复发现的问题',
    usage: '审查发现问题后需要修复时'
  },

  // ==================== UI 设计 ====================
  { cmd: '/workflow:ui-design:explore-auto', desc: '探索式 UI 设计', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '自动探索并生成 UI 设计方案',
    usage: '需要从头设计 UI 时'
  },
  { cmd: '/workflow:ui-design:imitate-auto', desc: '高速 UI 复刻', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '从参考图或网站快速复刻 UI',
    usage: '有设计参考需要复刻时'
  },
  { cmd: '/workflow:ui-design:capture', desc: '批量截图捕获', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.2',
    detail: '批量捕获网站或应用截图',
    usage: '需要收集 UI 参考时'
  },
  { cmd: '/workflow:ui-design:explore-layers', desc: '深度 UI 探索', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.2',
    detail: '深度分析 UI 结构和层次',
    usage: '需要深入分析 UI 时'
  },
  { cmd: '/workflow:ui-design:style-extract', desc: '提取设计风格', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '从图片或代码中提取设计风格和颜色',
    usage: '需要分析设计风格时'
  },
  { cmd: '/workflow:ui-design:layout-extract', desc: '提取布局结构', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '从图片或网站提取布局结构',
    usage: '需要分析页面布局时'
  },
  { cmd: '/workflow:ui-design:generate', desc: '组装 UI 原型', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '将提取的风格和布局组装成 UI 原型',
    usage: '需要生成可用的 UI 代码时'
  },
  { cmd: '/workflow:ui-design:design-sync', desc: '同步设计系统', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '同步设计稿和代码实现',
    usage: '设计稿更新后需要同步代码时'
  },
  { cmd: '/workflow:ui-design:animation-extract', desc: '提取动画模式', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '从网站或视频提取动画效果',
    usage: '需要学习和复用动画效果时'
  },
  { cmd: '/workflow:ui-design:codify-style', desc: '样式代码化', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '将设计样式转换为可用的代码',
    usage: '需要将设计转换为代码时'
  },
  { cmd: '/workflow:ui-design:import-from-code', desc: '从代码导入设计', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '从现有代码反向提取设计规范',
    usage: '需要从代码中提取设计规范时'
  },
  { cmd: '/workflow:ui-design:reference-page-generator', desc: '生成参考页面', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '生成 UI 设计参考页面',
    usage: '需要生成设计参考时'
  },

  // ==================== Task 命令 ====================
  { cmd: '/task:create', desc: '创建实现任务', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0',
    detail: '手动创建单个实现任务',
    usage: '需要单独创建任务时'
  },
  { cmd: '/task:breakdown', desc: '任务分解', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0',
    detail: '将大任务分解为更小的子任务',
    usage: '任务太大需要拆分时'
  },
  { cmd: '/task:execute', desc: '执行任务', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0',
    detail: '执行单个任务',
    usage: '需要执行特定任务时'
  },

  // ==================== 内部工具 ====================
  { cmd: '/workflow:tools:concept-enhanced', desc: '增强智能分析，并行CLI执行', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '增强的智能分析工具，支持并行 CLI 执行',
    usage: '需要深度分析代码时'
  },
  { cmd: '/workflow:tools:conflict-resolution', desc: 'CLI驱动的冲突检测和解决', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '检测代码冲突并提供解决方案',
    usage: '存在代码冲突需要解决时'
  },
  { cmd: '/workflow:tools:context-gather', desc: '智能收集项目上下文', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '智能收集与任务相关的项目上下文',
    usage: '需要快速了解相关代码时'
  },
  { cmd: '/workflow:tools:task-generate', desc: '生成任务JSON和IMPL_PLAN.md', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '根据规划生成任务文件',
    usage: '需要生成可执行的任务文件时'
  },
  { cmd: '/workflow:tools:task-generate-agent', desc: '使用action-planning-agent自动生成任务', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.2',
    detail: '使用 Agent 自动分析并生成任务',
    usage: '需要自动化任务生成时'
  },
  { cmd: '/workflow:tools:task-generate-tdd', desc: '生成TDD任务链 (Red-Green-Refactor)', status: 'stable', category: 'tdd', cli: 'claude', addedInVersion: 'v6.0',
    detail: '生成符合 TDD 流程的任务链',
    usage: '需要 TDD 开发时'
  },
  { cmd: '/workflow:tools:tdd-coverage-analysis', desc: 'TDD覆盖率分析', status: 'stable', category: 'tdd', cli: 'claude', addedInVersion: 'v6.0',
    detail: '分析 TDD 测试覆盖率',
    usage: '需要检查测试覆盖率时'
  },
  { cmd: '/workflow:tools:test-concept-enhanced', desc: '使用Gemini分析测试需求', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.0',
    detail: '使用 Gemini 进行测试需求分析',
    usage: '需要深入分析测试需求时'
  },
  { cmd: '/workflow:tools:test-context-gather', desc: '收集测试覆盖上下文', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.0',
    detail: '收集与测试相关的上下文信息',
    usage: '准备编写测试时'
  },
  { cmd: '/workflow:tools:test-task-generate', desc: '生成测试修复任务JSON', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.0',
    detail: '根据测试失败生成修复任务',
    usage: '测试失败需要修复时'
  },

  // ==================== Claude Code Skills (独立技能) ====================
  // 头脑风暴类
  { cmd: '/brainstorm', desc: '统一头脑风暴 - 自动流程或单角色分析', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '双模式：自动流水线（种子理解→发散→收敛→执行）或单角色深度分析',
    usage: '需要创意发散或功能设计时'
  },
  { cmd: '/team-brainstorm', desc: '团队头脑风暴 - 多角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '团队模式头脑风暴，支持多角色并行分析',
    usage: '需要团队协作进行创意思考时'
  },

  // 帮助系统
  { cmd: '/ccw-help', desc: 'CCW 命令帮助系统 - 搜索、浏览、推荐', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '交互式命令浏览器，支持搜索、分类浏览、智能推荐',
    usage: '想了解所有可用命令时'
  },

  // Issue 管理
  { cmd: '/issue-manage', desc: '交互式 Issue 管理 - CRUD 操作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '菜单驱动：查看、编辑、删除、批量操作、历史记录',
    usage: '需要管理现有 Issue 时'
  },
  { cmd: '/team-issue', desc: '团队 Issue 解决 - 多角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '团队协作解决 Issue，规划者和执行者分工',
    usage: '复杂 Issue 需要团队协作时'
  },

  // 记忆系统
  { cmd: '/memory-capture', desc: '统一记忆捕获 - 会话压缩或快速技巧', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '路由到会话压缩（完整上下文）或快速技巧（小贴士）',
    usage: '需要保存当前会话经验时'
  },
  { cmd: '/memory-manage', desc: '统一记忆管理 - CLAUDE.md 更新和文档生成', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '交互式路由：全量更新、增量更新、文档生成',
    usage: '需要更新项目记忆时'
  },

  // 代码审查
  { cmd: '/review-code', desc: '多维度代码审查 - 结构化报告', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '多维度：正确性、可读性、性能、安全性、测试、架构',
    usage: '需要进行代码质量审查时'
  },
  { cmd: '/review-cycle', desc: '统一代码审查 - 会话/模块/修复模式', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '路由到会话审查、模块审查或自动修复',
    usage: '需要灵活选择审查模式时'
  },
  { cmd: '/team-review', desc: '团队代码审查 - 多角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '团队协作审查，多角度分析代码质量',
    usage: '需要团队审查大型 PR 时'
  },

  // 技能管理
  { cmd: '/skill-generator', desc: '元技能 - 创建新的 Claude Code 技能', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v5.2',
    detail: '创建新技能模板，支持顺序执行和自主执行模式',
    usage: '需要创建自定义工作流技能时'
  },
  { cmd: '/skill-tuning', desc: '技能诊断优化 - 检测和修复执行问题', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v5.2',
    detail: '诊断：上下文爆炸、长尾遗忘、数据流中断、Agent协调失败',
    usage: '技能执行出现问题时'
  },

  // 规格生成
  { cmd: '/spec-generator', desc: '规格生成器 - 6阶段文档链', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '生成完整规格文档链：产品简介→PRD→架构设计→史诗拆解',
    usage: '新项目需要完整规格文档时'
  },

  // 团队协作
  { cmd: '/team-frontend', desc: '团队前端开发 - 多角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '前端团队协作，内置 ui-ux-pro-max 设计智能',
    usage: '需要团队协作开发前端时'
  },
  { cmd: '/team-iterdev', desc: '团队迭代开发 - 多角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '迭代开发团队协作，规划者和执行者分工',
    usage: '需要团队迭代开发时'
  },
  { cmd: '/team-lifecycle', desc: '团队全生命周期 - spec/impl/test', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '完整生命周期：规格→实现→测试',
    usage: '需要完整开发周期时'
  },
  { cmd: '/team-lifecycle-v2', desc: '团队全生命周期 v2 - 增强版', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.3',
    detail: '增强版生命周期，优化协作流程',
    usage: '需要增强版完整开发周期时'
  },
  { cmd: '/team-planex', desc: '团队 PlanEx - 规划执行流水线', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '2人团队（规划者+执行者），波流水线并发',
    usage: '需要规划执行流水线时'
  },
  { cmd: '/team-quality-assurance', desc: '团队质量保证 - QA 角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: 'QA 团队协作，质量检查和验证',
    usage: '需要质量保证流程时'
  },
  { cmd: '/team-tech-debt', desc: '团队技术债务 - 债务管理协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '技术债务识别、优先级排序、处理',
    usage: '需要管理技术债务时'
  },
  { cmd: '/team-testing', desc: '团队测试 - 多角色测试协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '测试团队协作，测试计划和执行',
    usage: '需要团队协作测试时'
  },
  { cmd: '/team-uidesign', desc: '团队 UI 设计 - 设计角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: 'UI 设计团队协作，设计系统管理',
    usage: '需要团队协作 UI 设计时'
  },
  { cmd: '/team-ultra-analyze', desc: '团队超深度分析 - 全面代码分析', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '超深度代码分析，全面理解代码库',
    usage: '需要深度理解代码时'
  },

  // 工作流技能
  { cmd: '/workflow-execute', desc: '工作流执行技能 - 协调 Agent 执行', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '协调多个 Agent 按依赖顺序执行任务',
    usage: '需要执行复杂工作流时'
  },
  { cmd: '/workflow-lite-plan', desc: '轻量规划技能 - 快速内存规划', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '轻量级规划，内存中完成不生成文件',
    usage: '需要快速规划时'
  },
  { cmd: '/workflow-multi-cli-plan', desc: '多 CLI 规划 - 并行 CLI 执行', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '使用多个 CLI 工具并行规划分析',
    usage: '需要多角度规划分析时'
  },
  { cmd: '/workflow-plan', desc: '完整规划技能 - 5阶段规划', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '5阶段：启动→上下文→分析→澄清→任务生成',
    usage: '需要完整规划流程时'
  },
  { cmd: '/workflow-skill-designer', desc: '工作流技能设计器 - 创建工作流', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '设计新的工作流技能，定义阶段和工具',
    usage: '需要创建新工作流时'
  },
  { cmd: '/workflow-tdd', desc: 'TDD 工作流技能 - Red-Green-Refactor', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: 'TDD 工作流，生成测试驱动开发任务链',
    usage: '需要 TDD 开发时'
  },
  { cmd: '/workflow-test-fix', desc: '测试修复技能 - 生成+执行+修复', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '完整测试修复流程：生成测试→执行→修复→验证',
    usage: '需要生成测试并修复时'
  },

  // ==================== Codex 预检清单 (Prompts) ====================
  { cmd: '/prompts:prep-plan', desc: 'workflow:plan 预检清单 - 环境验证、任务质量评估、执行配置', status: 'stable', category: 'prompt', cli: 'codex', addedInVersion: 'v6.2',
    detail: '在启动 workflow:plan 之前进行完整预检：验证项目环境、评估任务描述质量（目标/成功标准/范围/约束/上下文5个维度）、配置执行偏好',
    usage: '准备执行复杂规划任务时，先用预检清单确保万无一失'
  },
  { cmd: '/prompts:prep-loop', desc: 'ccw-loop 预检清单 - 发现上游任务、验证转换', status: 'stable', category: 'prompt', cli: 'codex', addedInVersion: 'v6.2',
    detail: '自动发现来自 collaborative-plan、analyze-with-file、brainstorm 等上游会话的任务文件，验证格式并转换为 ccw-loop 标准格式',
    usage: '想要执行之前规划好的任务时，用这个命令准备执行环境'
  },
  { cmd: '/prompts:prep-cycle', desc: 'parallel-dev-cycle 预检清单 - 0→1→100 迭代配置', status: 'stable', category: 'prompt', cli: 'codex', addedInVersion: 'v6.2',
    detail: '为并行开发循环配置迭代参数：0→1阶段构建可运行原型，1→100阶段达到生产质量（测试通过率≥90%、覆盖率≥80%）',
    usage: '需要进行多Agent并行开发时，用这个命令配置迭代策略'
  },

  // ==================== Codex 技能 (Skills) ====================
  // 规划类
  { cmd: '/codex:collaborative-plan-with-file', desc: '串行协作规划 - Plan Note架构，自动冲突检测', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '使用 Plan Note 架构进行串行协作规划，分析需求后识别子领域，逐个领域规划，最后自动检测跨领域冲突',
    usage: '适合需要多人协作、涉及多个技术领域的复杂功能规划'
  },
  { cmd: '/codex:req-plan-with-file', desc: '需求规划工作流', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '基于需求文档生成结构化的任务规划，支持从 PRD、设计文档等提取任务',
    usage: '有现成的需求文档需要转化为可执行任务时'
  },
  { cmd: '/codex:workflow-req-plan', desc: '工作流需求规划', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '工作流级别的需求规划，生成完整的任务链和依赖关系',
    usage: '复杂项目的工作流级别需求拆解'
  },
  { cmd: '/codex:plan-converter', desc: '将规划产物转换为 .task/*.json 标准格式', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '支持多种输入格式（roadmap.jsonl、plan-note.md、conclusions.json等）统一转换为 .task/*.json 标准格式',
    usage: '有各种格式的规划产物需要统一执行时'
  },

  // 分析/头脑风暴类
  { cmd: '/codex:analyze-with-file', desc: '交互式协作分析 - 文档化讨论过程', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '交互式分析工作流，记录讨论过程和决策演变，支持多轮Q&A和深度探索',
    usage: '需要深入分析代码、架构或技术方案时'
  },
  { cmd: '/codex:brainstorm-with-file', desc: '交互式头脑风暴 - 并行多视角分析', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '使用并行子Agent进行多视角头脑风暴（Creative/Pragmatic/Systematic），记录想法演变过程',
    usage: '需要创意发散、多角度思考功能设计或架构方案时'
  },

  // 执行类
  { cmd: '/codex:unified-execute-with-file', desc: '统一执行引擎 - 消费 .task/*.json 目录', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '统一的任务执行引擎，按拓扑顺序串行执行 .task/*.json 中的任务，支持收敛验证和进度跟踪',
    usage: '有准备好的任务文件需要执行时'
  },
  { cmd: '/codex:parallel-dev-cycle', desc: '多Agent并行开发循环 (RA→EP→CD→VAS)', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '4个专门Agent并行工作：需求分析(RA)、探索规划(EP)、代码开发(CD)、验证归档(VAS)，支持0→1→100迭代模型',
    usage: '大型功能开发，需要并行处理需求、设计、开发、验证'
  },
  { cmd: '/codex:team-planex', desc: 'PlanEx团队 - 规划执行', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: 'PlanEx团队协作模式，规划者和执行者协作完成任务',
    usage: '需要团队协作的开发任务'
  },

  // Issue管理类
  { cmd: '/codex:issue-discover', desc: 'Issue发现和创建 - 手动/多视角/prompt驱动', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '三种Issue发现模式：手动创建、多视角自动发现(bug/UX/安全/性能等8个维度)、prompt驱动的迭代探索',
    usage: '想要发现项目中的潜在问题时'
  },
  { cmd: '/codex:issue-resolve', desc: 'Issue解决流水线 - 探索规划/转换/队列', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '统一的Issue解决流水线，支持从多种来源（规划产物、brainstorm、手动）创建解决方案并形成执行队列',
    usage: '批量处理Issue时'
  },
  { cmd: '/codex:issue-execute', desc: 'Issue执行 - 每个方案提交一次', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '串行执行Issue队列中的解决方案，每个方案完成后自动git commit',
    usage: '执行已规划的Issue解决方案'
  },
  { cmd: '/codex:issue-devpipeline', desc: 'Issue开发流水线', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '完整的Issue开发流水线，从发现到解决的一站式处理',
    usage: '需要完整处理Issue生命周期的场景'
  },

  // 测试类
  { cmd: '/codex:workflow-test-fix-cycle', desc: '端到端测试修复循环 - 直到通过率≥95%', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '自动生成测试用例（L0-L3四层），迭代执行测试和修复直到通过率达到95%以上',
    usage: '需要为代码生成完整测试并修复发现的问题时'
  },

  // 审查类
  { cmd: '/codex:review-cycle', desc: '多维度代码审查 - 7维度并行分析', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '7维度并行审查：正确性、可读性、性能、安全性、测试、可维护性、最佳实践，支持自动修复',
    usage: '需要进行全面代码审查时'
  },

  // 调试类
  { cmd: '/codex:debug-with-file', desc: '假设驱动调试 - 文档化探索过程', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '基于假设驱动的调试工作流，记录探索过程和理解演变，支持分析辅助纠正误解',
    usage: '遇到难以定位的bug需要系统化调试时'
  },

  // 工具类
  { cmd: '/codex:ccw-cli-tools', desc: 'CLI工具统一执行框架', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '配置驱动的CLI工具选择，统一的prompt模板，支持Gemini/Qwen/Codex等多种工具',
    usage: '需要使用外部CLI工具进行代码分析或实现时'
  },
  { cmd: '/codex:memory-compact', desc: '会话内存压缩为结构化文本', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v5.2',
    detail: '将当前会话的工作内存压缩为结构化文本，提取关键信息便于会话恢复',
    usage: '会话内容过多需要压缩保存时'
  },
  { cmd: '/codex:clean', desc: '智能代码清理 - 检测过时产物', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v5.2',
    detail: '智能检测项目中的过时产物：废弃的会话、临时文件、死代码等',
    usage: '项目需要清理时'
  },

];

// ============================================
// 老奶奶推荐命令
// ============================================
export const GRANDMA_COMMANDS = [
  { cmd: '/ccw', desc: '有事找 ccw！它会帮你选命令', emoji: '🌟', scenario: '不知道用什么命令时', category: '万能入口', detail: '这是万能入口！不知道用什么命令就说这个，AI会帮你分析意图，自动选择最合适的命令。' },
  { cmd: '/workflow:lite-fix', desc: '修 bug 用这个', emoji: '🔧', scenario: '发现问题需要修复', category: 'Level 1-2', detail: '发现bug了？用这个命令，AI会帮你诊断问题原因，然后自动修复。' },
  { cmd: '/workflow:lite-plan', desc: '先想清楚再做', emoji: '📝', scenario: '做一个功能、改几个文件', category: 'Level 2', detail: '做一个功能、修一个bug，先用这个规划一下，看看要做什么再开始。' },
  { cmd: '/ccw-help', desc: '忘了命令？查一下！', emoji: '❓', scenario: '想看看有哪些命令', category: '帮助系统', detail: '想看看有哪些命令可用？这个命令会列出所有命令，还能搜索。' },
  { cmd: '/issue:discover', desc: '发现问题！', emoji: '🔍', scenario: '想找出项目的问题', category: 'Issue管理', detail: '多角度发现项目潜在问题，代码质量、安全问题、性能问题等。' },
];

// ============================================
// 废弃命令
// ============================================
export const DEPRECATED_COMMANDS = [
  { old: '/task:replan', newCmd: '/workflow:replan', reason: '命令整合' },
];

// ============================================
// 统计数据
// ============================================
export const STATS = {
  totalCommands: COMMANDS.length,
  claudeCount: COMMANDS.filter(c => c.cli === 'claude').length,
  codexCount: COMMANDS.filter(c => c.cli === 'codex').length,
  latestVersion: 'v6.3',  // 当前最新版本
  categories: Object.keys(CATEGORIES).length,
};
