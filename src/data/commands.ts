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
  | 'skill'     // 技能
  | 'agent';    // 代理（Codex专用）

export interface Command {
  cmd: string;
  desc: string;
  status: CommandStatus;
  category: CommandCategory;
  cli: CLIType;  // 标注哪个 CLI 可用
  level?: 1 | 2 | 3 | 4;
  addedInVersion?: string;
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
  'skill': { label: '🛠️ 技能', icon: 'Wrench', color: COLORS.accent4 },
  'agent': { label: '🤖 代理', icon: 'Bot', color: COLORS.accent5 },
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
  { cmd: '/ccw', desc: '主入口！智能分析意图，自动选择命令', status: 'recommended', category: 'main', cli: 'claude', addedInVersion: 'v6.2' },
  { cmd: '/ccw-help', desc: '命令帮助系统，搜索和浏览所有命令', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.2' },
  { cmd: '/ccw-coordinator', desc: '交互式命令编排，分析需求推荐命令链', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.2' },
  { cmd: '/flow-create', desc: '创建工作流模板', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.0' },

  // ==================== CLI 工具 ====================
  { cmd: '/cli:cli-init', desc: '初始化 CLI 工具配置 (Gemini/Qwen)', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.2' },
  { cmd: '/cli:codex-review', desc: 'Codex 代码审查', status: 'stable', category: 'review', cli: 'claude', addedInVersion: 'v6.2' },

  // ==================== 工作流核心 ====================
  { cmd: '/workflow:plan', desc: '5阶段规划工作流，生成 IMPL_PLAN.md', status: 'stable', category: 'workflow', cli: 'claude', level: 3, addedInVersion: 'v1.0' },
  { cmd: '/workflow:lite-plan', desc: '轻量级交互规划，内存中快速规划', status: 'stable', category: 'workflow', cli: 'claude', level: 2, addedInVersion: 'v6.2' },
  { cmd: '/workflow:lite-execute', desc: '执行内存中的计划', status: 'stable', category: 'workflow', cli: 'claude', level: 2, addedInVersion: 'v6.2' },
  { cmd: '/workflow:lite-fix', desc: '智能 bug 诊断修复', status: 'new', category: 'workflow', cli: 'claude', level: 2, addedInVersion: 'v6.2' },
  { cmd: '/workflow:execute', desc: '协调 Agent 执行任务', status: 'stable', category: 'workflow', cli: 'claude', level: 3, addedInVersion: 'v1.0' },
  { cmd: '/workflow:replan', desc: '交互式重新规划', status: 'stable', category: 'workflow', cli: 'claude', level: 3, addedInVersion: 'v1.0' },
  { cmd: '/workflow:resume', desc: '智能恢复工作流会话', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0' },
  { cmd: '/workflow:review', desc: '后实现审查', status: 'stable', category: 'review', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:status', desc: '生成任务状态视图', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:init', desc: '初始化项目状态', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0' },
  { cmd: '/workflow:clean', desc: '清理代码和临时文件', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.2' },
  { cmd: '/workflow:plan-verify', desc: '计划一致性验证', status: 'stable', category: 'review', cli: 'claude', addedInVersion: 'v6.0' },

  // With-File 系列
  { cmd: '/workflow:analyze-with-file', desc: '交互式协作分析', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:debug-with-file', desc: '交互式调试', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:collaborative-plan-with-file', desc: '协作式规划', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:brainstorm-with-file', desc: '交互式头脑风暴', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:req-plan-with-file', desc: '需求规划', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.2' },
  { cmd: '/workflow:unified-execute-with-file', desc: '通用执行引擎', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.2' },
  { cmd: '/workflow:integration-test-cycle', desc: '集成测试循环', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.2' },
  { cmd: '/workflow:refactor-cycle', desc: '重构循环', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.2' },

  // ==================== 会话管理 ====================
  { cmd: '/workflow:session:start', desc: '开始新的工作流会话', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0' },
  { cmd: '/workflow:session:list', desc: '列出所有会话及其状态', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0' },
  { cmd: '/workflow:session:resume', desc: '恢复最近暂停的会话', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0' },
  { cmd: '/workflow:session:complete', desc: '完成并归档会话', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0' },
  { cmd: '/workflow:session:solidify', desc: '固化会话经验为永久规则', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.2' },

  // ==================== Issue 管理 ====================
  { cmd: '/issue:new', desc: '创建结构化 Issue', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v5.0' },
  { cmd: '/issue:plan', desc: '规划 Issue 解决方案', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v5.0' },
  { cmd: '/issue:queue', desc: '形成执行队列', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/issue:execute', desc: '执行 Issue 解决方案', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/issue:discover', desc: '多角度发现潜在问题', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/issue:discover-by-prompt', desc: '智能问题发现', status: 'new', category: 'issue', cli: 'claude', addedInVersion: 'v6.3' },
  { cmd: '/issue:convert-to-plan', desc: '转换规划产物为执行计划', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/issue:from-brainstorm', desc: '头脑风暴结果转 Issue', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0' },

  // ==================== 记忆系统 ====================
  { cmd: '/memory:docs', desc: '规划文档工作流', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2' },
  { cmd: '/memory:docs-full-cli', desc: '全量文档生成 (CLI)', status: 'new', category: 'memory', cli: 'claude', addedInVersion: 'v6.2' },
  { cmd: '/memory:docs-related-cli', desc: '增量文档更新 (CLI)', status: 'new', category: 'memory', cli: 'claude', addedInVersion: 'v6.2' },
  { cmd: '/memory:update-full', desc: '全量 CLAUDE.md 更新', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2' },
  { cmd: '/memory:update-related', desc: '增量 CLAUDE.md 更新', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2' },
  { cmd: '/memory:load', desc: '加载项目上下文', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v1.0' },
  { cmd: '/memory:load-skill-memory', desc: '加载技能记忆包', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2' },
  { cmd: '/memory:skill-memory', desc: '生成 SKILL.md', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2' },
  { cmd: '/memory:code-map-memory', desc: '代码分析生成 Mermaid 文档', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2' },
  { cmd: '/memory:tech-research', desc: '技术栈研究和 SKILL 包生成', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2' },
  { cmd: '/memory:workflow-skill-memory', desc: '归档会话生成工作流技能包', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2' },
  { cmd: '/enhance-prompt', desc: '上下文感知提示词增强', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/version', desc: '显示版本信息', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v1.0' },

  // ==================== 头脑风暴 ====================
  { cmd: '/workflow:brainstorm:auto-parallel', desc: '并行头脑风暴，动态角色选择', status: 'new', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.3' },
  { cmd: '/workflow:brainstorm:artifacts', desc: '生成角色指导规范文档', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:brainstorm:synthesis', desc: '综合分析结果，智能问答', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:brainstorm:api-designer', desc: 'API 设计师角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:brainstorm:data-architect', desc: '数据架构师角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:brainstorm:product-manager', desc: '产品经理角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:brainstorm:product-owner', desc: '产品负责人角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:brainstorm:scrum-master', desc: 'Scrum Master 角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:brainstorm:subject-matter-expert', desc: '领域专家角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:brainstorm:system-architect', desc: '系统架构师角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:brainstorm:ui-designer', desc: 'UI 设计师角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:brainstorm:ux-expert', desc: 'UX 专家角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0' },

  // ==================== TDD ====================
  { cmd: '/workflow:tdd-plan', desc: 'TDD 工作流规划', status: 'stable', category: 'tdd', cli: 'claude', level: 3, addedInVersion: 'v6.0' },
  { cmd: '/workflow:tdd-verify', desc: '验证 TDD 合规性', status: 'stable', category: 'tdd', cli: 'claude', level: 3, addedInVersion: 'v6.0' },

  // ==================== 测试 ====================
  { cmd: '/workflow:test-gen', desc: '生成测试计划', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:test-fix-gen', desc: '生成测试修复计划', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:test-cycle-execute', desc: '测试循环执行直到通过', status: 'new', category: 'test', cli: 'claude', addedInVersion: 'v6.3' },

  // ==================== 代码审查 ====================
  { cmd: '/workflow:review-module-cycle', desc: '模块多维度审查', status: 'new', category: 'review', cli: 'claude', addedInVersion: 'v6.3' },
  { cmd: '/workflow:review-session-cycle', desc: '会话代码审查', status: 'new', category: 'review', cli: 'claude', addedInVersion: 'v6.3' },
  { cmd: '/workflow:review-fix', desc: '审查问题自动修复', status: 'new', category: 'review', cli: 'claude', addedInVersion: 'v6.3' },

  // ==================== UI 设计 ====================
  { cmd: '/workflow:ui-design:explore-auto', desc: '探索式 UI 设计', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3' },
  { cmd: '/workflow:ui-design:imitate-auto', desc: '高速 UI 复刻', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3' },
  { cmd: '/workflow:ui-design:capture', desc: '批量截图捕获', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.2' },
  { cmd: '/workflow:ui-design:explore-layers', desc: '深度 UI 探索', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.2' },
  { cmd: '/workflow:ui-design:style-extract', desc: '提取设计风格', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3' },
  { cmd: '/workflow:ui-design:layout-extract', desc: '提取布局结构', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3' },
  { cmd: '/workflow:ui-design:generate', desc: '组装 UI 原型', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3' },
  { cmd: '/workflow:ui-design:design-sync', desc: '同步设计系统', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3' },
  { cmd: '/workflow:ui-design:animation-extract', desc: '提取动画模式', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3' },
  { cmd: '/workflow:ui-design:codify-style', desc: '样式代码化', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3' },
  { cmd: '/workflow:ui-design:import-from-code', desc: '从代码导入设计', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3' },
  { cmd: '/workflow:ui-design:reference-page-generator', desc: '生成参考页面', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3' },

  // ==================== Task 命令 ====================
  { cmd: '/task:create', desc: '创建实现任务', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0' },
  { cmd: '/task:breakdown', desc: '任务分解', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0' },
  { cmd: '/task:execute', desc: '执行任务', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0' },

  // ==================== 内部工具 ====================
  { cmd: '/workflow:tools:concept-enhanced', desc: '增强智能分析，并行CLI执行', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:tools:conflict-resolution', desc: 'CLI驱动的冲突检测和解决', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:tools:context-gather', desc: '智能收集项目上下文', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:tools:task-generate', desc: '生成任务JSON和IMPL_PLAN.md', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:tools:task-generate-agent', desc: '使用action-planning-agent自动生成任务', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.2' },
  { cmd: '/workflow:tools:task-generate-tdd', desc: '生成TDD任务链 (Red-Green-Refactor)', status: 'stable', category: 'tdd', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:tools:tdd-coverage-analysis', desc: 'TDD覆盖率分析', status: 'stable', category: 'tdd', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:tools:test-concept-enhanced', desc: '使用Gemini分析测试需求', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:tools:test-context-gather', desc: '收集测试覆盖上下文', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.0' },
  { cmd: '/workflow:tools:test-task-generate', desc: '生成测试修复任务JSON', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.0' },

  // ==================== Codex 技能 (Skills) ====================
  { cmd: '/analyze-with-file', desc: '交互式协作分析', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/brainstorm-with-file', desc: '交互式头脑风暴', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/ccw-cli-tools', desc: 'CCW CLI 工具集成', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2' },
  { cmd: '/clean', desc: '智能代码清理', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v5.2' },
  { cmd: '/collaborative-plan-with-file', desc: '协作式规划', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/debug-with-file', desc: '交互式调试', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/issue-devpipeline', desc: 'Issue 开发流水线', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2' },
  { cmd: '/issue-discover', desc: 'Issue 发现', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/issue-execute', desc: 'Issue 执行', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/issue-resolve', desc: 'Issue 解决', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2' },
  { cmd: '/memory-compact', desc: '压缩会话记忆', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v5.2' },
  { cmd: '/parallel-dev-cycle', desc: '并行开发循环', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2' },
  { cmd: '/plan-converter', desc: '计划转换器', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2' },
  { cmd: '/req-plan-with-file', desc: '需求规划', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2' },
  { cmd: '/review-cycle', desc: '审查循环', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2' },
  { cmd: '/team-planex', desc: 'PlanEx 团队', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2' },
  { cmd: '/unified-execute-with-file', desc: '通用执行引擎', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2' },
  { cmd: '/workflow-req-plan', desc: '需求规划工作流', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2' },
  { cmd: '/workflow-test-fix-cycle', desc: '测试修复循环', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2' },

  // ==================== Codex 代理 (Agents) ====================
  { cmd: '/agent:action-planning', desc: '行动规划代理 - 生成实现计划', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/agent:cli-discuss', desc: 'CLI 讨论代理 - 多CLI协作讨论', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.2' },
  { cmd: '/agent:cli-execution', desc: 'CLI 执行代理 - 智能CLI调用', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.2' },
  { cmd: '/agent:cli-explore', desc: 'CLI 探索代理 - 代码库探索', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.2' },
  { cmd: '/agent:cli-lite-planning', desc: 'CLI 轻量规划代理', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.2' },
  { cmd: '/agent:cli-planning', desc: 'CLI 规划代理 - 深度规划分析', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.2' },
  { cmd: '/agent:code-developer', desc: '代码开发代理 - 代码实现', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/agent:conceptual-planning', desc: '概念规划代理 - 单一角色头脑风暴', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/agent:context-search', desc: '上下文搜索代理 - 开发任务上下文收集', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/agent:debug-explore', desc: '调试探索代理 - 假设驱动调试', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/agent:doc-generator', desc: '文档生成代理 - 自动文档生成', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/agent:issue-plan', desc: 'Issue 规划代理 - 闭环Issue规划', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/agent:issue-queue', desc: 'Issue 队列代理 - 解决方案排序', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/agent:memory-bridge', desc: '记忆桥接代理 - 文档更新协调', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/agent:tdd-developer', desc: 'TDD 开发代理 - Red-Green-Refactor', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/agent:test-fix', desc: '测试修复代理 - 迭代测试修复', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.0' },
  { cmd: '/agent:ui-design', desc: 'UI 设计代理 - 设计Token管理', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.3' },
  { cmd: '/agent:universal-executor', desc: '通用执行代理 - 多领域任务执行', status: 'stable', category: 'agent', cli: 'codex', addedInVersion: 'v6.0' },

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
  latestVersion: 'v6.2',  // 基于 COMMAND_REFERENCE.md 版本
  categories: Object.keys(CATEGORIES).length,
};
