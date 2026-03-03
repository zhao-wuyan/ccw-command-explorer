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
  textMuted: '#aab8c8',
  textDim: '#8b9eb5',
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

// ============================================
// 4级工作流系统
// ============================================
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
    commands: ['/team-lifecycle-v5', '/team-coordinate', '/team-planex']
  },
];

// ============================================
// 完整命令列表 - 基于 CCW 仓库实际存在
// ============================================
export const COMMANDS: Command[] = [
  // ==================== 主入口命令 ====================
  { cmd: '/ccw', desc: '主入口！智能分析意图，自动选择命令', status: 'recommended', category: 'main', cli: 'claude', addedInVersion: 'v6.2',
    detail: '万能入口！告诉它你想做什么，它会分析你的意图，自动选择最合适的命令或命令组合执行。不用背命令，说人话就行',
    usage: '不知道用什么命令时，直接说 /ccw 你想做的事，比如"/ccw 修复登录bug"'
  },
  { cmd: '/ccw-help', desc: '命令帮助系统，搜索和浏览所有命令', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.2',
    detail: '交互式命令浏览器：按分类浏览90+个命令、搜索命令名或功能、查看详细使用说明',
    usage: '想知道有哪些命令、忘了某个命令怎么用'
  },
  { cmd: '/ccw-coordinator', desc: '交互式命令编排，分析需求推荐命令链', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.2',
    detail: '复杂需求分解器：分析你的需求，推荐需要执行的命令序列，你可以调整后再执行',
    usage: '一个任务需要多个命令配合完成，不知道怎么组合'
  },
  { cmd: '/flow-create', desc: '创建工作流模板', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.0',
    detail: '创建可重复使用的模板：把常用的命令组合存成模板，下次一键执行。比如"发布流程"模板',
    usage: '有固定的工作流程想反复使用'
  },

  // ==================== IDAW 任务管理 ====================
  { cmd: '/idaw:add', desc: '任务队列入口 - 手动描述或从 issue 批量导入，攒好再统一执行', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v7.0',
    detail: 'IDAW（Iterative Development Automated Workflow）的任务入口。支持两种创建方式：① 直接描述需求（手动创建）；② 从 ccw issue 系统导入（--from-issue）。任务类型（bugfix/feature/refactor/tdd 等）可手动指定，也可在执行时自动推断。创建的任务以 IDAW-001.json 格式保存到 .workflow/.idaw/tasks/，等待 /idaw:run 串行执行。',
    usage: '攒好一批待处理任务（bugfix、feature、重构等），先 add 进队列，再统一交给 /idaw:run 批量执行。也适合将 issue 系统里的问题单批量转为可执行任务。'
  },
  { cmd: '/idaw:run', desc: '批量执行任务队列 - 自动 Skill 链映射 + 失败 CLI 诊断 + 每任务 git 检查点', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v7.0',
    detail: 'IDAW 的核心执行命令。按优先级串行处理所有 pending 任务，每个任务完整流程：① 根据任务类型自动映射 Skill 链（bugfix → workflow-lite-plan + workflow-test-fix；feature-complex → workflow-plan + workflow-execute + workflow-test-fix 等 10 种类型）；② 对 bugfix/complex 任务先触发 Gemini CLI 预分析获取上下文；③ 串行执行链中每个 Skill；④ Skill 失败时自动触发 CLI 诊断 + 重试一次；⑤ 任务完成后自动 git commit 打检查点。支持 --dry-run 预览执行计划，-y 全自动无人值守模式。',
    usage: '已用 /idaw:add 积累了一批任务，现在要统一执行。特别适合「下班前挂着跑」或「一次性清掉积压任务」的场景——每个任务完成都有 git 检查点，失败了可以用 /idaw:resume 续跑，不怕中途中断。'
  },
  { cmd: '/idaw:run-coordinate', desc: '后台 CLI 协调执行 - 上下文隔离，hook 驱动，适合长链或大量任务', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v7.0',
    detail: '/idaw:run 的外部 CLI 变体，执行模型改为后台 hook 驱动：通过 ccw cli 在后台启动每个 Skill，等待 hook 回调后再推进下一步，而非在主进程阻塞。核心优势：每个 CLI 调用获得独立的上下文窗口，任务再多也不会膨胀主进程上下文；支持指定 --tool（claude/gemini/qwen）；状态文件额外记录 prompts_used 便于追溯。错误恢复同样支持 CLI 诊断 + 重试，任务完成后 git checkpoint。',
    usage: '任务链较长（如 feature-complex: plan + execute + test-fix）、或同时积压多个上下文重的任务时，用 coordinate 模式避免主进程上下文压力。也适合需要用 Gemini 等特定 CLI 工具执行任务的场景。'
  },
  { cmd: '/idaw:resume', desc: '续跑中断会话 - 从断点恢复，跳过或重试中断任务，无需重跑已完成部分', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v7.0',
    detail: '恢复 status 为 running 的 IDAW 会话（默认找最近一个，也可指定 session-id）。对中断时处于 in_progress 状态的任务，提供 Retry（重置为 pending 重跑）或 Skip（标记跳过继续）两种处理方式；-y 模式下自动 Skip。找到剩余 pending 任务后，复用 /idaw:run 完整执行逻辑（Skill 链 + CLI 诊断 + git checkpoint）继续推进，会话进度文件中追加 Resumed 标记。',
    usage: 'IDAW 执行中途因网络/系统原因中断、或手动 Ctrl+C 打断后，用此命令从断点继续，无需重跑已完成的任务。'
  },
  { cmd: '/idaw:status', desc: '查看任务队列和会话执行进度（只读）', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v7.0',
    detail: '只读命令，不触发任何执行。无参数时显示：全部任务的状态表（ID、标题、类型、优先级、状态）+ 最新会话的概要统计。传入 session-id 时显示该会话详情：每个任务的状态、git commit hash、以及 progress.md 的完整执行日志。',
    usage: '/idaw:run 跑完后查看哪些任务成功/失败；或在执行过程中另开终端随时检查进度；也可在用 /idaw:resume 前先确认哪些任务还剩余。'
  },

  // ==================== CLI 工具 ====================
  { cmd: '/cli:cli-init', desc: '初始化 CLI 工具配置 (Gemini/Qwen)', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.2',
    detail: '首次配置：为Gemini和Qwen创建配置文件(.gemini/、.qwen/)，设置API密钥、模型选择等',
    usage: '想用Gemini或Qwen等外部AI工具，第一次需要先配置'
  },
  { cmd: '/cli:codex-review', desc: 'Codex 代码审查', status: 'stable', category: 'review', cli: 'claude', addedInVersion: 'v6.2',
    detail: '专业代码审查：可审查未提交的改动、对比两个分支、或审查特定提交。比普通审查更专业',
    usage: '想用OpenAI Codex进行专业代码审查'
  },

  // ==================== 工作流核心 ====================
  { cmd: '/workflow:init', desc: '初始化项目状态', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0',
    detail: '首次使用准备：创建.workflow目录、初始化配置文件。在新项目里第一次用CCW要先执行这个',
    usage: '在新项目中第一次使用CCW'
  },
  { cmd: '/workflow:init-specs', desc: '初始化规格目录', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v6.4',
    detail: '创建规格目录结构：初始化 .monkeycode/specs/ 目录，用于存放需求和设计文档',
    usage: '需要开始编写需求规格文档'
  },
  { cmd: '/workflow:init-guidelines', desc: '初始化开发指南', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v6.4',
    detail: '创建开发指南：生成项目编码规范、最佳实践等指南文档',
    usage: '新项目需要建立开发规范'
  },
  { cmd: '/workflow:clean', desc: '清理代码和临时文件', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.2',
    detail: '智能清理：检测过时的会话目录、临时文件、死代码、无用的依赖。保持项目整洁',
    usage: '项目做了很久，想清理不需要的文件'
  },

  // With-File 系列
  { cmd: '/workflow:analyze-with-file', desc: '交互式协作分析', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '深度分析并记录：边分析代码边记录理解，支持多轮问答。生成分析文档，方便以后查阅',
    usage: '需要深入理解代码库、分析复杂模块'
  },
  { cmd: '/workflow:debug-with-file', desc: '交互式调试', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '科学调试：①猜测原因(假设)；②验证假设；③记录发现。系统化排查问题，不会漏掉线索',
    usage: '遇到难定位的复杂bug'
  },
  { cmd: '/workflow:collaborative-plan-with-file', desc: '协作式规划', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '多人协作规划：把大需求拆成多个领域，不同专业的人分别规划，最后自动检测冲突',
    usage: '涉及多个技术领域的复杂功能，需要不同专业的人分工规划'
  },
  { cmd: '/workflow:brainstorm-with-file', desc: '交互式头脑风暴', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '创意发散并记录：多角度思考，记录想法的演变过程。完成后可选择：创建规划、创建Issue、或继续分析',
    usage: '需要创意思考、功能设计、架构方案讨论'
  },
  { cmd: '/workflow:roadmap-with-file', desc: '路线图规划', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v6.4',
    detail: '交互式路线图：与AI讨论需求，生成项目路线图和里程碑规划',
    usage: '需要规划项目路线图'
  },
  { cmd: '/workflow:unified-execute-with-file', desc: '通用执行引擎', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.2',
    detail: '万能执行器：支持执行各种格式的规划文件(brainstorm、plan、issue等)，按依赖顺序执行',
    usage: '有各种格式的规划文件需要执行'
  },
  { cmd: '/workflow:integration-test-cycle', desc: '集成测试循环', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.2',
    detail: '集成测试：生成集成测试→执行→发现失败修复→再测试。循环到全部通过',
    usage: '需要为模块间的集成编写测试'
  },
  { cmd: '/workflow:refactor-cycle', desc: '重构循环', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.2',
    detail: '安全重构：重构代码→运行测试验证→如果测试失败可回滚。确保重构不破坏功能',
    usage: '需要重构代码但怕改坏东西'
  },

  // ==================== 会话管理 ====================
  { cmd: '/workflow:session:start', desc: '开始新的工作流会话', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0',
    detail: '创建工作会话：生成唯一会话ID、创建会话目录(.workflow/sessions/xxx/)、初始化状态文件。后续工作都在这个会话里追踪',
    usage: '开始一个新的开发任务'
  },
  { cmd: '/workflow:session:list', desc: '列出所有会话及其状态', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0',
    detail: '会话列表：显示所有会话的ID、创建时间、当前状态(活跃/暂停/完成)、进度概览',
    usage: '想看看有哪些进行中或已完成的工作'
  },
  { cmd: '/workflow:session:resume', desc: '恢复最近暂停的会话', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0',
    detail: '恢复工作：找到最近暂停的会话，加载上下文，从上次停下的地方继续',
    usage: '继续之前暂停的工作'
  },
  { cmd: '/workflow:session:complete', desc: '完成并归档会话', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0',
    detail: '结束会话：标记会话为完成、生成总结报告、移动到归档目录。记录做了什么、有什么收获',
    usage: '任务完成后进行收尾'
  },
  { cmd: '/workflow:session:solidify', desc: '固化会话经验为永久规则', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.2',
    detail: '沉淀经验：把会话中学到的东西(发现的好方法、踩过的坑)变成项目规则，以后自动遵循',
    usage: '有值得保留的经验想固化下来'
  },
  { cmd: '/workflow:session:sync', desc: '同步会话状态', status: 'new', category: 'session', cli: 'claude', addedInVersion: 'v6.4',
    detail: '同步会话：将当前会话状态同步到文件系统，确保状态持久化',
    usage: '需要保存当前会话状态'
  },

  // ==================== Issue 管理 ====================
  { cmd: '/issue:new', desc: '创建结构化 Issue', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v5.0',
    detail: '创建问题记录：填写问题描述、严重程度、影响范围、复现步骤。生成标准化Issue文件',
    usage: '发现问题想记录下来'
  },
  { cmd: '/issue:plan', desc: '规划 Issue 解决方案', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v5.0',
    detail: '设计方案：分析问题原因→设计解决思路→拆解实施步骤→预估工作量',
    usage: '已知问题需要规划如何解决'
  },
  { cmd: '/issue:queue', desc: '形成执行队列', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0',
    detail: '排列执行顺序：把多个Issue按优先级和依赖关系排成队列，先做重要的、先做被依赖的',
    usage: '有多个Issue想批量处理'
  },
  { cmd: '/issue:execute', desc: '执行 Issue 解决方案', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0',
    detail: '执行解决方案：按队列顺序执行，每个解决完自动提交git，方便追踪和回滚',
    usage: '执行已规划好的Issue解决方案'
  },
  { cmd: '/issue:discover', desc: '多角度发现潜在问题', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0',
    detail: '主动发现问题：8个维度扫描(bug风险/安全漏洞/性能问题/用户体验/测试覆盖/代码质量/可维护性/最佳实践)',
    usage: '想主动发现项目中的隐患'
  },
  { cmd: '/issue:discover-by-prompt', desc: '智能问题发现', status: 'new', category: 'issue', cli: 'claude', addedInVersion: 'v6.3',
    detail: '按需发现：你说关注什么(比如"安全问题")，AI针对性地扫描发现相关问题',
    usage: '有具体关注点想发现问题'
  },
  { cmd: '/issue:convert-to-plan', desc: '转换规划产物为执行计划', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0',
    detail: '格式转换：把各种规划文档(brainstorm结果、roadmap等)转成标准Issue格式，统一执行',
    usage: '有现成的规划文档想执行'
  },
  { cmd: '/issue:from-brainstorm', desc: '头脑风暴结果转 Issue', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0',
    detail: '想法变任务：把头脑风暴产生的想法自动转成结构化的Issue，可以直接执行',
    usage: '头脑风暴后想把想法变成具体任务'
  },







  // ==================== UI 设计 ====================
  { cmd: '/workflow:ui-design:explore-auto', desc: '探索式 UI 设计', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '从零设计UI：根据需求描述，自动探索设计方案，生成完整的设计系统和UI代码',
    usage: '需要从头设计UI界面'
  },
  { cmd: '/workflow:ui-design:imitate-auto', desc: '高速 UI 复刻', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '参考复刻：提供设计图或网站URL，自动分析设计风格，快速生成相同风格的UI代码',
    usage: '有设计稿或参考网站想复刻'
  },

  { cmd: '/workflow:ui-design:style-extract', desc: '提取设计风格', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '提取样式：从设计图或现有代码中提取颜色、字体、间距等设计规范',
    usage: '想分析设计风格，建立设计系统'
  },
  { cmd: '/workflow:ui-design:layout-extract', desc: '提取布局结构', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '提取布局：从图片或网站分析页面布局结构，生成可复用的布局模板',
    usage: '想分析页面布局结构'
  },
  { cmd: '/workflow:ui-design:generate', desc: '组装 UI 原型', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '组装UI：把提取的设计风格和布局模板组合成可运行的UI代码',
    usage: '想生成可用的UI代码'
  },
  { cmd: '/workflow:ui-design:design-sync', desc: '同步设计系统', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '同步更新：设计稿更新后，自动同步代码实现，保持设计和代码一致',
    usage: '设计稿更新后需要同步代码'
  },
  { cmd: '/workflow:ui-design:animation-extract', desc: '提取动画模式', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '提取动画：从网站或视频分析动画效果，生成可复用的动画代码',
    usage: '想学习和复用动画效果'
  },
  { cmd: '/workflow:ui-design:codify-style', desc: '样式代码化', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '样式转代码：把设计规范(颜色、字体等)转换成CSS变量、Tailwind配置等代码',
    usage: '想将设计转换为代码'
  },
  { cmd: '/workflow:ui-design:import-from-code', desc: '从代码导入设计', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '代码反推设计：分析现有UI代码，反向提取设计规范和组件规范',
    usage: '想从代码中提取设计规范'
  },
  { cmd: '/workflow:ui-design:reference-page-generator', desc: '生成参考页面', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '生成参考页：把设计系统和组件生成HTML参考页面，方便查看和分享',
    usage: '想生成设计参考文档'
  },

  // ==================== 记忆系统 ====================
  { cmd: '/memory:prepare', desc: '准备记忆系统', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v6.4',
    detail: '初始化记忆：准备记忆系统所需的目录结构和配置文件',
    usage: '首次使用记忆系统前准备'
  },
  { cmd: '/memory:style-skill-memory', desc: '样式技能记忆', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v6.4',
    detail: '样式记忆：保存和加载 UI 样式相关的技能经验',
    usage: '需要保存或复用样式设计经验'
  },


  // ==================== Claude Code Skills (独立技能) ====================
  // 头脑风暴类
  { cmd: '/brainstorm', desc: '统一头脑风暴 - 自动流程或单角色分析', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '两种模式：①自动模式-理解需求→发散想法→收敛结论→执行；②单角色-只从某个专业视角分析（如架构师、产品经理）',
    usage: '需要创意发散、多角度思考、或从特定专业视角分析问题时'
  },
  { cmd: '/team-brainstorm', desc: '团队头脑风暴 - 多角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '5角色：创意者出点子→挑战者挑毛病→综合者整合→评估师打分排名。想法被挑战后自动改进，最多2轮。支持多人并行出点子',
    usage: '重要决策需要多人、多角度碰撞想法时'
  },

  // 帮助系统
  { cmd: '/ccw-help', desc: 'CCW 命令帮助系统 - 搜索、浏览、推荐', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '交互式命令浏览器：按分类浏览、搜索命令名、查看使用场景，还会根据你的需求智能推荐命令',
    usage: '不知道有什么命令、忘了命令名字、想找适合当前任务的命令'
  },

  // Issue 管理
  { cmd: '/issue-manage', desc: '交互式 Issue 管理 - CRUD 操作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '菜单驱动管理：列出所有问题、查看详情、编辑内容、删除、批量操作。像用手机App一样简单',
    usage: '想查看、修改或删除已有的问题时'
  },
  { cmd: '/team-issue', desc: '团队 Issue 解决 - 多角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '6角色分工：探索者分析→规划师设计方案→实现者写代码→审查者检查→整合者合并。适合复杂问题',
    usage: '一个Issue涉及多个模块、需要多人分工协作时'
  },

  // 记忆系统
  { cmd: '/memory-capture', desc: '统一记忆捕获 - 会话压缩或快速技巧', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '两种模式：①完整压缩-把当前对话压缩成结构化笔记，方便下次恢复；②快速技巧-记下小贴士、代码片段',
    usage: '当前会话做得不错想保存经验、或者记下有用的技巧'
  },
  { cmd: '/memory-manage', desc: '统一记忆管理 - CLAUDE.md 更新和文档生成', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '菜单选择：①全量更新所有CLAUDE.md；②只更新改动的模块；③生成项目文档。让项目知识保持最新',
    usage: '项目结构变了想更新文档、或者想生成完整项目说明'
  },

  // 代码审查
  { cmd: '/review-code', desc: '多维度代码审查 - 结构化报告', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '7个维度审查：代码对不对、好读吗、性能如何、安全吗、测试够不够、好维护吗、符合最佳实践吗。出详细报告',
    usage: '写完代码想检查质量、代码合入前想审查、接手别人的代码'
  },
  { cmd: '/review-cycle', desc: '统一代码审查 - 会话/模块/修复模式', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '三种模式：①审查当前工作流的所有改动；②只审查指定模块；③审查完自动修复发现的问题',
    usage: '想选择不同范围的审查、或者审查完想自动改问题'
  },
  { cmd: '/team-review', desc: '团队代码审查 - 多角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '多角色审查：同时从安全、性能、架构等角度审查，生成综合报告。比单人审查更全面',
    usage: '重要代码合入前、大型PR需要全面审查时'
  },

  // 技能管理
  { cmd: '/skill-generator', desc: '元技能 - 创建新的 Claude Code 技能', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v5.2',
    detail: '创建你自己的工作流模板：定义步骤、选择工具、设置参数。一次创建，反复使用',
    usage: '有重复的工作流程想固化成命令、想分享团队的工作方式'
  },
  { cmd: '/skill-tuning', desc: '技能诊断优化 - 检测和修复执行问题', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v5.2',
    detail: '诊断4类问题：①上下文爆炸(信息太多)；②长尾遗忘(记住前面的忘了后面的)；③数据流中断；④多Agent配合失败。自动给修复方案',
    usage: '自定义的技能执行出问题、想优化技能性能'
  },
  { cmd: '/command-generator', desc: '命令文件生成器 - 创建 .md 命令文件', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: '生成命令文件：创建带有 YAML 前置配置的 .md 命令文件，支持项目和用户两种范围',
    usage: '想创建新的 Claude Code 命令'
  },

  // 规格生成
  { cmd: '/spec-generator', desc: '规格生成器 - 6阶段文档链', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '生成6份文档：①产品简介；②需求文档PRD；③架构设计；④用户故事；⑤技术方案；⑥就绪检查。从想法到可执行的任务',
    usage: '新项目立项、需求评审前、或者要把想法变成具体开发任务'
  },

  // 团队协作
  { cmd: '/team-frontend', desc: '团队前端开发 - 多角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '5个角色分工协作：分析师(需求+设计智能)→架构师(设计令牌)→开发者(写代码)→QA(审查)。内置行业设计知识库，自动匹配最佳UI方案',
    usage: '开发前端页面或组件，需要从需求到上线全流程时'
  },
  { cmd: '/team-lifecycle', desc: '团队全生命周期 - spec/impl/test (默认使用最新版本)', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '完整团队工作流：需求分析→文档编写→规划→执行→测试→审查。自动使用最新的 team-lifecycle 版本',
    usage: '大项目从0到1，需要完整的需求→设计→开发→测试流程'
  },
  { cmd: '/team-lifecycle-v3', desc: '团队全生命周期 v3 - 8角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.3',
    detail: '8个角色：协调者、分析师、作家、评论员、规划师、执行者、测试员、审查员。支持按需加载架构师和前端开发',
    usage: '需要完整生命周期的团队协作开发'
  },
  { cmd: '/team-lifecycle-v4', desc: '团队全生命周期 v4 - 优化节拍版', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: '相比v3优化：内联讨论子代理、共享探索工具，规格阶段节拍从12降到6。更高效的团队协作',
    usage: '需要更高效的生命周期开发流程'
  },
  { cmd: '/team-lifecycle-v5', desc: '团队全生命周期 v5 - 团队工作代理架构', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: '最新架构：基于 team-worker 代理，所有工作角色共享单一代理定义，从角色规格文件加载 Phase 2-4。更灵活的角色定制',
    usage: '需要最新的团队协作架构，支持自定义角色'
  },
  { cmd: '/team-coordinate', desc: '通用团队协调 - 动态角色生成', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: '通用协调技能：分析任务→生成角色→派发→执行→交付。只有协调者是内置的，所有工作角色在运行时动态生成',
    usage: '需要灵活的团队协作，角色根据任务动态生成'
  },
  { cmd: '/team-coordinate-v2', desc: '通用团队协调 v2 - 角色规格文件架构', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: 'v2架构：使用团队工作代理和角色规格文件。工作角色作为轻量级规格文件生成，通过 team-worker 代理派发',
    usage: '需要基于角色规格的团队协调'
  },
  { cmd: '/team-executor', desc: '轻量级会话执行 - 恢复并执行会话', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: '轻量执行：加载现有 team-coordinate 会话→协调状态→派发工作代理→执行→交付。无分析、无角色生成，纯执行',
    usage: '已有规划好的会话，需要恢复执行'
  },
  { cmd: '/team-executor-v2', desc: '轻量级会话执行 v2 - team-worker 代理', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: 'v2架构：恢复 team-coordinate-v2 会话，通过 team-worker 代理执行。需要提供会话路径',
    usage: '已有 v2 架构的会话，需要恢复执行'
  },
  { cmd: '/team-iterdev', desc: '团队迭代开发 - 生成器-批评者循环', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: '迭代开发团队：开发者-审查者循环（最多3轮）、任务账本实时进度、共享内存跨冲刺学习、动态流水线选择增量交付',
    usage: '需要迭代式开发，持续改进代码质量'
  },
  { cmd: '/team-roadmap-dev', desc: '路线图驱动开发 - 分阶段执行流水线', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: '路线图驱动：协调者与用户讨论路线图→派发分阶段执行流水线（规划→执行→验证）。支持暂停/恢复',
    usage: '需要根据路线图分阶段开发'
  },
  { cmd: '/team-planex', desc: '团队 PlanEx - 规划执行流水线', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '2人流水线：规划师边规划边派任务，执行者边收任务边写代码。规划师不等待执行完成，直接规划下一批，效率翻倍',
    usage: '明确需求的功能开发，想要"边规划边执行"提高效率'
  },
  { cmd: '/team-quality-assurance', desc: '团队质量保证 - QA 角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '6角色闭环：侦察兵扫描问题→策略师定测试方案→生成器写测试→执行器跑测试→分析师出报告。覆盖率不够自动补测试',
    usage: '功能开发完成后，需要全面的质量验证和测试覆盖'
  },
  { cmd: '/team-tech-debt', desc: '团队技术债务 - 债务管理协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '6角色治理：扫描器找问题→评估师算成本→规划师排优先级→执行者修代码→验证者测回归。独立工作分支，修完自动创建PR',
    usage: '项目代码质量下降，需要系统性清理技术债务'
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
    detail: '按依赖顺序执行任务：A任务完成后才执行B任务，支持并行执行无依赖的任务、实时显示进度',
    usage: '有规划好的任务列表需要执行时'
  },
  { cmd: '/workflow-lite-plan', desc: '轻量规划技能 - 快速内存规划', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '快速规划：在内存中分析→拆解任务→排列顺序。不生成文件，适合中小任务，规划完立即执行',
    usage: '任务不复杂，想快速规划然后马上开始做'
  },
  { cmd: '/workflow-multi-cli-plan', desc: '多 CLI 规划 - 并行 CLI 执行', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '同时用多个AI分析：Gemini、Codex、Claude同时分析同一问题，然后交叉验证，综合得出最佳方案',
    usage: '复杂问题需要多角度分析、单个AI结论不确定时'
  },
  { cmd: '/workflow-plan', desc: '完整规划技能 - 5阶段规划', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '5阶段详细规划：①启动会话；②收集项目上下文；③AI分析；④澄清不明确的地方；⑤生成任务文件。适合大项目',
    usage: '复杂功能、多模块开发、需要详细规划文档时'
  },
  { cmd: '/workflow-skill-designer', desc: '工作流技能设计器 - 创建工作流', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '设计新的工作流模板：定义有哪些阶段、每个阶段用什么工具、怎么处理错误。生成标准SKILL.md文件',
    usage: '想创建团队标准工作流程、把最佳实践固化下来'
  },
  { cmd: '/workflow-tdd', desc: 'TDD 工作流技能 - Red-Green-Refactor', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '测试驱动开发流程：①Red-先写失败的测试；②Green-写最少代码让测试通过；③Refactor-优化代码。循环直到完成',
    usage: '想用专业方式开发、确保代码可测试、追求高质量代码'
  },
  { cmd: '/workflow-test-fix', desc: '测试修复技能 - 生成+执行+修复', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '自动化测试循环：①自动生成测试用例；②执行测试;③发现失败自动修复;④再测试。直到全部通过',
    usage: '功能写完了需要补测试、测试失败想自动修复'
  },
  { cmd: '/workflow-wave-plan', desc: 'CSV Wave 规划执行 - 分批探索和执行', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: 'CSV Wave流程：①分解需求生成 explore.csv；②波浪式探索代码；③综合发现生成 tasks.csv；④波浪式执行任务。支持上下文传播',
    usage: '需要批量探索和执行任务，保持上下文连贯'
  },
  { cmd: '/wave-plan-pipeline', desc: '先勘探再施工 - 探索>计划>执行一条龙流水线', status: 'new', category: 'skill', cli: 'codex', addedInVersion: 'v7.0',
    detail: '三阶段流水线：①并发探索（架构入口、集成点、测试命令、约束）生成 explore.csv；②综合探索结果生成 tasks.csv；③按依赖分 Wave 执行。探索结果自动喂给后续任务（E*→T*上下文链接）',
    usage: '代码库不熟、怕改错地方，想先探索再动手；需要多角度并发探索后再实施'
  },
  { cmd: '/workflow-tdd-plan', desc: 'TDD 规划技能 - 6阶段规划+Red-Green-Refactor任务链', status: 'stable', category: 'tdd', cli: 'claude', addedInVersion: 'v7.0',
    detail: '统一 TDD 工作流：6阶段 TDD 规划 + Red-Green-Refactor 任务链生成 + 4阶段验证。触发词：workflow-tdd-plan、workflow-tdd-verify',
    usage: 'TDD 开发前规划测试用例，生成完整的 Red→Green→Refactor 执行任务链'
  },

  // ==================== Codex 预检清单 (Prompts) ====================
  { cmd: '/prep-plan', desc: 'workflow:plan 预检清单 - 环境验证、任务质量评估、执行配置', status: 'stable', category: 'prompt', cli: 'codex', addedInVersion: 'v6.2',
    detail: '执行前检查5项：①项目环境OK吗；②目标清晰吗；③成功标准明确吗；④范围边界清楚吗；⑤有什么限制。避免执行到一半发现问题',
    usage: '重要任务执行前想确保万无一失'
  },
  { cmd: '/prep-cycle', desc: 'parallel-dev-cycle 预检清单 - 0→1→100 迭代配置', status: 'stable', category: 'prompt', cli: 'codex', addedInVersion: 'v6.2',
    detail: '配置两阶段迭代：0→1先做出能跑的原型；1→100打磨到生产质量(测试90%通过、代码覆盖80%)',
    usage: '大型功能想分阶段交付：先快速出原型，再逐步完善'
  },

  // ==================== Codex 技能 (Skills) ====================
  // 规划类
  { cmd: '/collaborative-plan-with-file', desc: '串行协作规划 - Plan Note架构，自动冲突检测', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '多人协作规划：先把大需求拆成多个技术领域，每人负责一个领域规划，最后自动检测各领域的冲突和依赖',
    usage: '涉及多个技术领域(前端/后端/数据库等)的复杂功能，需要不同专业的人分工规划'
  },
  { cmd: '/roadmap-with-file', desc: '路线图规划 - Codex 版', status: 'new', category: 'skill', cli: 'codex', addedInVersion: 'v6.4',
    detail: '交互式路线图：与AI讨论需求，生成项目路线图和里程碑规划',
    usage: '需要规划项目路线图'
  },

  // 分析/头脑风暴类
  { cmd: '/analyze-with-file', desc: '交互式协作分析 - 文档化讨论过程', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '深度分析并记录过程：边分析边记录理解，支持多轮问答，AI会纠正你的误解。生成完整的分析文档',
    usage: '需要深入分析代码库、理解复杂架构、研究技术方案'
  },
  { cmd: '/brainstorm-with-file', desc: '交互式头脑风暴 - 并行多视角分析', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '3个AI同时思考：创意型(天马行空)、务实型(关注落地)、系统型(全局视角)，记录所有想法的演变过程',
    usage: '功能设计、架构方案需要多角度创意思考'
  },

  // 执行类
  { cmd: '/unified-execute-with-file', desc: '统一执行引擎 - 消费 .task/*.json 目录', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '任务执行器：读取任务JSON文件，按依赖顺序执行，支持并行执行无依赖的任务，实时显示进度',
    usage: '有准备好的任务文件需要执行'
  },
  { cmd: '/parallel-dev-cycle', desc: '多Agent并行开发循环 (RA→EP→CD→VAS)', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '4个AI同时工作：需求分析师(RA)理解需求→探索规划师(EP)设计方案→代码开发(CD)写代码→验证归档(VAS)测试。可并行推进',
    usage: '大型功能开发，想同时推进需求分析、设计、开发、测试'
  },
  { cmd: '/team-planex', desc: 'PlanEx团队 - 规划执行', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '2人流水线：规划师边规划边派任务，执行者边收任务边写代码。规划不等待执行完成，效率高',
    usage: '需求明确的开发任务，想要边规划边执行'
  },

  // Issue管理类
  { cmd: '/issue-discover', desc: 'Issue发现和创建 - 手动/多视角/prompt驱动', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '3种发现模式：①手动创建问题；②8维度自动扫描(bug/安全/性能/UX/测试/质量/维护性/最佳实践)；③根据你的描述迭代探索',
    usage: '想主动发现项目中的隐藏问题'
  },

  // 测试类
  { cmd: '/workflow-test-fix-cycle', desc: '端到端测试修复循环 - 直到通过率≥95%', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '自动测试循环：①生成4层测试(单元/集成/E2E/回归)；②执行测试；③失败自动修复；④循环直到95%通过',
    usage: '代码写完了需要补测试，希望测试失败能自动修复'
  },

  // 审查类
  { cmd: '/review-cycle', desc: '多维度代码审查 - 7维度并行分析', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '7维度同时审查：代码对不对、好读吗、性能如何、安全吗、测试够不够、好维护吗、符合最佳实践吗。发现问题可自动修复',
    usage: '代码写完需要全面审查、PR合入前检查'
  },

  // 调试类
  { cmd: '/debug-with-file', desc: '假设驱动调试 - 文档化探索过程', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '科学调试方法：①猜测可能原因(假设)；②验证假设；③记录发现；④AI纠正错误理解。系统化定位问题',
    usage: '遇到难定位的bug，需要系统化地分析和排查'
  },

  // 工具类
  { cmd: '/ccw-cli-tools', desc: 'CLI工具统一执行框架', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '统一调用外部AI：配置好Gemini/Qwen/Codex等工具，用一个模板调用不同AI，自动选择最合适的工具',
    usage: '想使用外部AI工具(Gemini/Qwen等)进行代码分析或生成'
  },
  { cmd: '/memory-compact', desc: '会话内存压缩为结构化文本', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v5.2',
    detail: '压缩会话内容：提取目标、计划、关键文件、重要决策，去掉冗余对话。方便下次恢复上下文',
    usage: '对话太长了想压缩保存，或者要切换话题但想保留关键信息'
  },
  { cmd: '/clean', desc: '智能代码清理 - 检测过时产物', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v5.2',
    detail: '自动扫描清理：废弃的工作流会话、临时文件、死代码、过时的依赖。让项目保持整洁',
    usage: '项目做久了文件变多，想清理不需要的东西'
  },
  { cmd: '/csv-wave-pipeline', desc: 'CSV 波浪流水线 - 批量任务执行', status: 'new', category: 'skill', cli: 'codex', addedInVersion: 'v6.4',
    detail: 'CSV驱动批量执行：读取 tasks.csv，分波次执行任务，支持进度保存和断点续传',
    usage: '有任务清单(CSV格式)需要批量执行'
  },
  { cmd: '/team-lifecycle', desc: '团队全生命周期 - Codex 版', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '完整生命周期：需求分析→架构设计→开发→测试→审查。包含多个模板文件(产品简介、PRD、架构文档、Epic模板)',
    usage: 'Codex 环境下的完整项目开发流程'
  },

];

// ============================================
// 老奶奶推荐命令
// ============================================
export const GRANDMA_COMMANDS = [
  { cmd: '/ccw', desc: '有事找 ccw！它会帮你选命令', emoji: '🌟', scenario: '不知道用什么命令时', category: '万能入口', detail: '这是万能入口！不知道用什么命令就说这个，AI会帮你分析意图，自动选择最合适的命令。' },
  { cmd: '/review-code', desc: '代码审查用这个', emoji: '👀', scenario: '代码写完需要检查', category: '代码审查', detail: '7维度代码审查：生成详细报告，方便查看问题。' },
  { cmd: '/ccw-help', desc: '忘了命令？查一下！', emoji: '❓', scenario: '想看看有哪些命令', category: '帮助系统', detail: '想看看有哪些命令可用？这个命令会列出所有命令，还能搜索。' },
  { cmd: '/issue:discover', desc: '发现问题！', emoji: '🔍', scenario: '想找出项目的问题', category: 'Issue管理', detail: '多角度发现项目潜在问题，代码质量、安全问题、性能问题等。' },
];

// ============================================
// 废弃命令
// ============================================
export const DEPRECATED_COMMANDS = [
  { old: '/task:replan', newCmd: '/workflow:replan', reason: '命令整合' },
  { old: '/task:create', newCmd: null, reason: '命令已移除' },
  { old: '/task:breakdown', newCmd: null, reason: '命令已移除' },
  { old: '/task:execute', newCmd: null, reason: '命令已移除' },
  { old: '/version', newCmd: null, reason: '命令已移除' },
  { old: '/enhance-prompt', newCmd: null, reason: '命令已移除' },
  { old: '/prompts:prep-plan', newCmd: '/prep-plan', reason: '命令重命名' },
  { old: '/prompts:prep-cycle', newCmd: '/prep-cycle', reason: '命令重命名' },
  { old: '/prompts:prep-loop', newCmd: null, reason: '预检清单文件已移除' },
  { old: '/workflow:plan', newCmd: '/workflow-plan', reason: '命令升级为 skill' },
  { old: '/workflow:execute', newCmd: '/workflow-execute', reason: '命令升级为 skill' },
  { old: '/workflow:replan', newCmd: null, reason: '命令已移除' },
  { old: '/workflow:resume', newCmd: '/workflow:session:resume', reason: '命令整合到会话管理' },
  { old: '/workflow:status', newCmd: null, reason: '命令已移除' },
  { old: '/workflow:review', newCmd: '/review-code', reason: '命令升级为 skill' },
  { old: '/workflow:plan-verify', newCmd: null, reason: '命令已移除' },
  { old: '/workflow:lite-plan', newCmd: '/workflow-lite-plan', reason: '命令升级为 skill，请使用新版本' },
  { old: '/workflow:lite-execute', newCmd: null, reason: '命令已移除，请使用 /workflow-execute' },
  { old: '/workflow:lite-fix', newCmd: '/workflow:debug-with-file', reason: 'token 消耗较多且效果一般，改用 debug-with-file（Claude  Code: /workflow:debug-with-file，Codex: /debug-with-file）' },
  { old: '/workflow:tdd-plan', newCmd: '/workflow-tdd', reason: '命令升级为 skill' },
  { old: '/workflow:tdd-verify', newCmd: '/workflow-tdd', reason: '命令升级为 skill' },
  { old: '/workflow:test-gen', newCmd: '/workflow-test-fix', reason: '命令整合' },
  { old: '/workflow:test-fix-gen', newCmd: '/workflow-test-fix', reason: '命令整合' },
  { old: '/workflow:test-cycle-execute', newCmd: '/workflow-test-fix', reason: '命令整合' },
  { old: '/workflow:review-module-cycle', newCmd: '/review-cycle', reason: '命令升级为 skill' },
  { old: '/workflow:review-session-cycle', newCmd: '/review-cycle', reason: '命令升级为 skill' },
  { old: '/workflow:review-fix', newCmd: '/review-cycle', reason: '命令升级为 skill' },
  { old: '/workflow:brainstorm:*', newCmd: '/brainstorm', reason: '头脑风暴命令升级为统一 skill' },
  { old: '/workflow:tools:*', newCmd: null, reason: '内部工具命令已移除' },
  { old: '/workflow:ui-design:capture', newCmd: null, reason: '命令已移除' },
  { old: '/workflow:ui-design:explore-layers', newCmd: null, reason: '命令已移除' },
  { old: '/memory:docs', newCmd: '/memory-manage', reason: '命令整合到统一记忆管理' },
  { old: '/memory:docs-full-cli', newCmd: '/memory-manage', reason: '命令整合到统一记忆管理' },
  { old: '/memory:docs-related-cli', newCmd: '/memory-manage', reason: '命令整合到统一记忆管理' },
  { old: '/memory:update-full', newCmd: '/memory-manage', reason: '命令整合到统一记忆管理' },
  { old: '/memory:update-related', newCmd: '/memory-manage', reason: '命令整合到统一记忆管理' },
  { old: '/memory:load', newCmd: '/memory-capture', reason: '命令整合到统一记忆捕获' },
  { old: '/memory:load-skill-memory', newCmd: '/memory-capture', reason: '命令整合到统一记忆捕获' },
  { old: '/memory:skill-memory', newCmd: '/memory-capture', reason: '命令整合到统一记忆捕获' },
  { old: '/memory:code-map-memory', newCmd: null, reason: '命令已移除' },
  { old: '/memory:tech-research', newCmd: null, reason: '命令已移除' },
  { old: '/memory:workflow-skill-memory', newCmd: '/memory-capture', reason: '命令整合到统一记忆捕获' },
  { old: '/issue-resolve', newCmd: '/issue-manage', reason: '命令整合到统一 Issue 管理' },
  { old: '/issue-execute', newCmd: '/issue:execute', reason: '命令迁移到 Claude Code' },
  { old: '/issue-devpipeline', newCmd: '/team-planex', reason: '命令升级为团队 plan-and-execute 流水线' },
  { old: '/plan-converter', newCmd: '/workflow-execute', reason: '命令整合到工作流执行' },
  { old: '/req-plan-with-file', newCmd: '/workflow-lite-plan', reason: '命令迁移到轻量级规划执行流程' },
  { old: '/workflow-req-plan', newCmd: '/workflow-plan', reason: '命令整合' },
  { old: '/team-lifecycle-v2', newCmd: '/team-lifecycle-v5', reason: '已升级到 v5 版本' },
];

// ============================================
// 统计数据
// ============================================
export const STATS = {
  totalCommands: COMMANDS.length,
  claudeCount: COMMANDS.filter(c => c.cli === 'claude').length,
  codexCount: COMMANDS.filter(c => c.cli === 'codex').length,
  latestVersion: 'v7.0',  // 当前最新版本
  categories: Object.keys(CATEGORIES).length,
};

// ============================================
// 经验指南 - 场景决策树
// ============================================
export interface ExperienceTip {
  id: string;
  title: string;
  scenario: string;
  recommendation: string;
  commands: string[];
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

export const EXPERIENCE_GUIDE: ExperienceCategory[] = [
  {
    id: 'planning',
    title: '需求规划类',
    emoji: '📋',
    color: COLORS.primary,
    tips: [
      {
        id: 'roadmap-vs-plan',
        title: 'Roadmap vs Plan 如何选择？',
        scenario: '有一个需求，需要规划成开发任务',
        recommendation: '根据需求的清晰度和复杂度选择一个',
        commands: ['/workflow:roadmap-with-file', '/workflow-plan', '/workflow-lite-plan'],
        commandType: 'select',
        reason: 'Roadmap 适合需求模糊、需要逐步细化的场景；Plan 适合需求明确、需要详细规划的场景',
        tips: [
          '/workflow:roadmap-with-file - 需求0-1：把模糊想法拆成路线图，产出一系列issue',
          '/workflow-plan - 需求明确：5阶段详细规划，生成任务文件',
          '/workflow-lite-plan - 轻量快速：内存中规划，不生成文件，适合中小任务',
        ],
      },
      {
        id: 'three-ways-guide',
        title: '三种干活方式如何选？',
        scenario: '知道要做什么，但不确定用哪种工作流推进',
        recommendation: '按"先想清楚"到"直接开干"的程度选择',
        commands: ['/workflow:roadmap-with-file', '/wave-plan-pipeline', '/csv-wave-pipeline'],
        commandType: 'select',
        reason: '三种方式对应不同的准备程度：路线图对齐范围、探索再施工降低风险、直接排班最高效率',
        tips: [
          '/workflow:roadmap-with-file - 需要先对齐范围/里程碑/验收，沉淀可追踪的任务清单（issue）',
          '/wave-plan-pipeline - 不熟代码库、怕改错地方，先并发探索（架构/集成点/约束）再动手，探索结果自动喂给实施任务',
          '/csv-wave-pipeline - 已经知道要改什么，直接拆 tasks.csv 按依赖分 Wave 并发执行',
        ],
      },
      {
        id: 'simple-many',
        title: '简单任务批量处理流程',
        scenario: '多个简单任务需要批量处理',
        recommendation: '直接使用轻量规划，内置执行',
        commands: ['/workflow-lite-plan'],
        commandType: 'select',
        reason: '简单任务用轻量工具，规划和执行一体化，无需额外步骤',
        tips: [
          '/workflow-lite-plan - 规划+执行一体：探索→规划→确认→执行全流程自动完成',
          '不需要单独调用执行命令，lite-plan 内置执行阶段',
          '适合中小任务；复杂任务用 /workflow-plan → /workflow-execute',
        ],
      },
      {
        id: 'csv-pipeline',
        title: 'CSV批量任务流水线',
        scenario: '已有任务列表(CSV格式)，需要批量执行',
        recommendation: '直接使用 CSV 流水线',
        commands: ['/csv-wave-pipeline'],
        commandType: 'select',
        reason: '适合已有任务清单的场景，直接导入执行',
        tips: [
          '准备 tasks.csv 文件，包含任务描述',
          '运行 /csv-wave-pipeline 自动分批执行',
          '支持进度保存和断点续传',
        ],
      },
      {
        id: 'complex-single',
        title: '复杂单任务处理流程',
        scenario: '一个明确的复杂需求点，需要深度分析',
        recommendation: '按顺序执行：分析 → 规划',
        commands: ['/workflow:analyze-with-file', '/workflow:collaborative-plan-with-file'],
        commandType: 'sequence',
        reason: '复杂需求需要先分析冲突点、理解依赖关系，再规划',
        tips: [
          '第一步：/workflow:analyze-with-file - 交互式分析，发现潜在冲突',
          '第二步：/workflow:collaborative-plan-with-file - 多领域协作规划',
          '分析结果会自动传递给规划阶段',
        ],
      },
    ],
  },
  {
    id: 'execution',
    title: '执行效率类',
    emoji: '⚡',
    color: COLORS.secondary,
    tips: [
      {
        id: 'efficiency-first',
        title: '效率优先选择哪个？',
        scenario: '追求最快完成开发任务',
        recommendation: '根据任务数量和复杂度选择一个',
        commands: ['/workflow-lite-plan', '/team-planex', '/parallel-dev-cycle'],
        commandType: 'select',
        reason: '效率优先需要平衡并行度和上下文切换成本',
        tips: [
          '/workflow-lite-plan（规划+执行一体） - 单人快速执行，适合1-3个简单任务',
          '/team-planex - 双人流水线：规划师边规划边派任务，执行者边收边写',
          '/parallel-dev-cycle - 多Agent并行：需求分析、设计、开发、测试并行推进',
        ],
      },
      {
        id: 'tdd-workflow',
        title: 'TDD开发流程',
        scenario: '需要高质量、可测试的代码',
        recommendation: '按顺序执行：规划 → 执行',
        commands: ['/workflow-tdd', '/workflow-execute'],
        commandType: 'sequence',
        reason: 'TDD需要严格遵循Red-Green-Refactor循环',
        tips: [
          '第一步：/workflow-tdd - 生成Red-Green-Refactor任务链（含规划和合规验证）',
          '第二步：/workflow-execute - 按循环顺序执行：先写测试(红)→写代码(绿)→重构',
        ],
      },
      {
        id: 'multi-terminal',
        title: '多终端并行开发',
        scenario: '有多个终端可用，想同时推进多个任务',
        recommendation: '使用 Codex 多终端能力',
        commands: ['/parallel-dev-cycle'],
        commandType: 'select',
        reason: 'Codex支持多终端并行执行，Claude Code单线程',
        tips: [
          '/parallel-dev-cycle - 4个AI角色同时工作：需求分析师、探索规划师、代码开发、验证归档',
          '注意：此命令需要Codex环境支持多终端',
        ],
      },
    ],
  },
  {
    id: 'analysis',
    title: '分析探索类',
    emoji: '🔍',
    color: COLORS.accent2,
    tips: [
      {
        id: 'analyze-vs-brainstorm',
        title: 'Analyze vs Brainstorm 选择？',
        scenario: '需要深入理解代码或设计',
        recommendation: '根据目标选择一个',
        commands: ['/workflow:analyze-with-file', '/workflow:brainstorm-with-file', '/brainstorm'],
        commandType: 'select',
        reason: 'Analyze侧重理解现有代码，Brainstorm侧重创意发散',
        tips: [
          '/workflow:analyze-with-file - 理解代码：边分析边记录，多轮问答澄清误解',
          '/workflow:brainstorm-with-file - 创意发散：多角度思考，记录想法演变',
          '/brainstorm - 统一头脑风暴：自动流程或单角色分析，AI根据任务特征选择合适模式',
        ],
      },
      {
        id: 'deep-analysis-flow',
        title: '深度代码分析流程',
        scenario: '需要全面理解代码库架构',
        recommendation: '选择合适的深度分析工具',
        commands: ['/team-ultra-analyze', '/workflow:analyze-with-file'],
        commandType: 'select',
        reason: '深度分析可以多角色并行协作，或交互式逐步探索',
        tips: [
          '/team-ultra-analyze - 多角色并行协作，系统性全面理解代码库',
          '/workflow:analyze-with-file - 交互式深度分析：边探索边记录，多轮问答澄清架构设计',
        ],
      },
    ],
  },
  {
    id: 'issue',
    title: '问题管理类',
    emoji: '🐛',
    color: COLORS.warning,
    tips: [
      {
        id: 'issue-discovery',
        title: '主动发现问题选择哪个？',
        scenario: '想主动发现项目中的隐患',
        recommendation: '根据关注点选择一个扫描方式',
        commands: ['/issue:discover', '/issue:discover-by-prompt', '/issue-manage'],
        commandType: 'select',
        reason: '主动发现比被动修复成本更低',
        tips: [
          '/issue:discover - 8维度扫描：bug风险/安全漏洞/性能问题/用户体验/测试覆盖/代码质量/可维护性/最佳实践',
          '/issue:discover-by-prompt - 定向扫描：告诉AI你关注什么（如"安全问题"）',
          '/issue-manage - 交互式管理：菜单式操作，查看/编辑/删除已有Issue',
        ],
      },
      {
        id: 'issue-to-execution',
        title: 'Issue 从发现到执行流程',
        scenario: '发现了很多问题，如何系统化解决',
        recommendation: '按顺序执行：规划 → 排队 → 执行',
        commands: ['/issue:plan', '/issue:queue', '/issue:execute'],
        commandType: 'sequence',
        reason: '批量处理效率更高，避免重复切换上下文',
        tips: [
          '第一步：/issue:plan - 为每个Issue规划解决方案',
          '第二步：/issue:queue - 按优先级和依赖排成执行队列',
          '第三步：/issue:execute - 批量执行，每个Issue单独git commit',
        ],
      },
    ],
  },
  {
    id: 'testing',
    title: '测试相关类',
    emoji: '🧪',
    color: COLORS.accent4,
    tips: [
      {
        id: 'test-generation',
        title: '测试流程选择哪个？',
        scenario: '代码写完了需要补测试或修复失败测试',
        recommendation: '根据测试需求和复杂度选择一个',
        commands: ['/workflow-test-fix', '/team-testing', '/workflow:integration-test-cycle'],
        commandType: 'select',
        reason: '自动化程度越高，生成和修复失败测试的效率越高',
        tips: [
          '/workflow-test-fix - 一站式测试：自动生成→执行→修复，循环直到测试通过',
          '/team-testing - 团队测试：多角色协作，strategy→generate→execute→analyze全流程',
          '/workflow:integration-test-cycle - 集成测试循环：专注端到端集成测试，自迭代闭环',
        ],
      },
      {
        id: 'test-coverage',
        title: '提升测试覆盖率流程',
        scenario: '测试覆盖率不够，需要补充',
        recommendation: '按顺序执行：扫描 → 测试 → 报告',
        commands: ['/team-quality-assurance'],
        commandType: 'select',
        reason: '自动化能更快达到覆盖率目标',
        tips: [
          '/team-quality-assurance - 6角色闭环：扫描问题→定方案→写测试→跑测试→出报告',
          '覆盖率不够会自动补充测试',
          '循环直到达到目标覆盖率',
        ],
      },
    ],
  },
  {
    id: 'review',
    title: '代码审查类',
    emoji: '👀',
    color: COLORS.danger,
    tips: [
      {
        id: 'review-scope',
        title: '审查范围选择哪个？',
        scenario: '代码写完了需要审查',
        recommendation: '根据改动范围选择一个',
        commands: ['/review-cycle', '/cli:codex-review', '/review-code'],
        commandType: 'select',
        reason: '不同范围和工具偏好需要不同方式',
        tips: [
          '/review-cycle - 统一审查：支持会话/模块/修复模式，一个命令覆盖所有场景',
          '/cli:codex-review - Codex 代码审查：基于 Git diff 的结构化审查',
          '/review-code - 通用代码审查：7维度审查，生成详细报告',
        ],
      },
      {
        id: 'review-to-fix',
        title: '审查后自动修复流程',
        scenario: '审查发现问题后想自动修复',
        recommendation: '按顺序执行：审查 → 修复',
        commands: ['/review-cycle'],
        commandType: 'select',
        reason: '审查和修复合为一体，减少上下文切换',
        tips: [
          '/review-cycle - 审查+修复一体化：审查完自动修复发现的问题',
          '提示：/review-cycle 已内置修复能力，无需额外命令',
        ],
      },
    ],
  },
  {
    id: 'decision-tree',
    title: '决策速查表',
    emoji: '🌳',
    color: COLORS.accent1,
    tips: [
      {
        id: 'quick-decision',
        title: '一句话决策',
        scenario: '快速选择命令',
        recommendation: '记住这几点就够了',
        commands: ['/ccw'],
        commandType: 'select',
        reason: '/ccw 会帮你做决策',
        tips: [
          '需求0-1、模糊 → /workflow:roadmap-with-file',
          '不熟代码库、先探索再动手 → /wave-plan-pipeline（explore.csv→tasks.csv→Wave执行）',
          '需求明确、直接并发推进 → /csv-wave-pipeline（tasks.csv→按依赖Wave执行）',
          '需求明确、复杂 → /workflow-plan 或 /workflow:analyze-with-file',
          '简单任务、大量 → /workflow-lite-plan 或 /csv-wave-pipeline',
          '效率优先 → /team-planex 或 /parallel-dev-cycle',
          '不知道用什么 → /ccw 让AI帮你选',
        ],
      },
      {
        id: 'level-guide',
        title: '按复杂度选Level',
        scenario: '根据任务复杂度选择',
        recommendation: '选择一个适合的Level',
        commands: ['/workflow:debug-with-file', '/workflow-lite-plan', '/workflow-plan', '/brainstorm'],
        commandType: 'select',
        reason: '复杂度匹配避免过度设计或准备不足',
        tips: [
          'Level 1 - 超简单：/workflow:debug-with-file，改配置、换变量名、修简单bug',
          'Level 2 - 稍复杂：/workflow-lite-plan（规划+执行一体），做一个功能、修一个问题',
          'Level 3 - 比较复杂：/workflow-plan → /workflow-execute，改多个文件、多模块开发',
          'Level 4 - 大项目：/brainstorm，新功能设计、架构决策',
        ],
      },
    ],
  },
];

// ============================================
// 智能推荐器 - 任务类型检测规则（模仿 ccw 的意图分析）
// ============================================

// 改进1: 增强关键词覆盖，添加更多同义词/近义词
// 改进3: 添加权重字段，用于多匹配时的优先级判断
export interface TaskPattern {
  type: string;           // 任务类型
  keywords: RegExp;       // 匹配关键词
  level: 1 | 2 | 3 | 4;   // 推荐工作流级别
  flow: string;           // 工作流标识
  desc: string;           // 类型描述
  emoji: string;          // 图标
  weight: number;         // 匹配权重（越高越优先），用于多匹配时排序
}

export const TASK_PATTERNS: TaskPattern[] = [
  // Level 1 - 超简单（使用精确短语避免贪婪匹配）
  { type: 'quick-fix', keywords: /改个|换个|改下|换下|小改一下|修改.*名|简单.*改/, level: 1, flow: 'rapid', desc: '快速修改', emoji: '⚡', weight: 100 },

  // With-File workflows（使用精确短语）
  { type: 'greenfield', keywords: /从零开始|from scratch|0\s*to\s*1|greenfield|全新开发|新项目|new project|空白开始/, level: 4, flow: 'greenfield', desc: '0→1 全新开发', emoji: '🌱', weight: 95 },
  { type: 'brainstorm', keywords: /brainstorm|ideation|头脑风暴|创意设计|发散思维|creative thinking|multi-perspective|compare perspectives|多角度|集思广益|头脑激荡|想几个方案|思考方案|方案设想/, level: 4, flow: 'brainstorm-to-plan', desc: '头脑风暴', emoji: '🧠', weight: 95 },
  { type: 'debug-file', keywords: /debug document|hypothesis debug|troubleshoot track|investigate log|调试记录|假设验证|systematic debug|深度调试|排查问题|定位问题|诊断问题/, level: 3, flow: 'debug-with-file', desc: '深度调试', emoji: '🔍', weight: 90 },
  { type: 'analyze-file', keywords: /analyze document|explore concept|understand architecture|investigate discuss|collaborative analysis|分析讨论|深度理解|协作分析|帮我分析|理解代码|理解架构|分析架构|充分理解/, level: 3, flow: 'analyze-to-plan', desc: '协作分析', emoji: '📊', weight: 90 },
  { type: 'collaborative-plan', keywords: /collaborative plan|协作规划|多人规划|multi agent plan|Plan Note|分工规划|一起规划|协同设计|协作设计|架构设计|架构扩展/, level: 3, flow: 'collaborative-plan', desc: '协作规划', emoji: '👥', weight: 88 },
  { type: 'roadmap', keywords: /roadmap|路线图|规划图|发展路径|阶段计划|里程碑/, level: 4, flow: 'roadmap', desc: '路线图规划', emoji: '🗺️', weight: 85 },

  // Cycle workflows
  { type: 'integration-test', keywords: /integration test|集成测试|端到端测试|e2e test|integration cycle|联调测试|系统测试/, level: 3, flow: 'integration-test-cycle', desc: '集成测试循环', emoji: '🔄', weight: 85 },
  { type: 'refactor', keywords: /refactor|重构|tech debt|技术债务|优化代码|改进架构|清理代码/, level: 3, flow: 'refactor-cycle', desc: '重构循环', emoji: '🔨', weight: 85 },

  // Issue workflows
  { type: 'issue-batch', keywords: /issues|batch fix|批量修复|多个问题|批量处理/, level: 2, flow: 'issue', desc: 'Issue 批量处理', emoji: '🐛', weight: 80 },

  // Team workflows
  { type: 'team-planex', keywords: /team plan exec|team planex|团队规划执行|并行规划执行|wave pipeline|团队协作|多人执行/, level: 4, flow: 'team-planex', desc: 'Team 并行执行', emoji: '🚀', weight: 85 },

  // Standard workflows
  { type: 'multi-cli', keywords: /multi cli|多 CLI|多模型协作|multi model collab|多终端|多个 AI|多模型/, level: 3, flow: 'multi-cli-plan', desc: '多CLI协作', emoji: '🤖', weight: 80 },
  { type: 'bugfix-hotfix', keywords: /urgent|production|critical|紧急|线上问题|hotfix|生产问题|立刻修|马上修/, level: 2, flow: 'bugfix.hotfix', desc: '紧急修复', emoji: '🚨', weight: 100 },
  { type: 'bugfix', keywords: /fix|bug|error|crash|fail|debug|修复|解决|问题|报错|异常|出错|不对|不正常/, level: 2, flow: 'bugfix.standard', desc: 'Bug修复', emoji: '🔧', weight: 70 },
  { type: 'tdd', keywords: /tdd|test-driven|test first|测试驱动|先写测试|测试先行/, level: 3, flow: 'tdd', desc: 'TDD开发', emoji: '🧪', weight: 90 },
  { type: 'test-gen', keywords: /generate test|写测试|add test|补充测试|生成测试|添加测试|增加测试/, level: 3, flow: 'test-gen', desc: '测试生成', emoji: '🔬', weight: 85 },
  { type: 'test-fix', keywords: /test fail|fix test|failing test|测试失败|测试不过|测试报错/, level: 3, flow: 'test-fix-gen', desc: '测试修复', emoji: '✅', weight: 85 },
  { type: 'review', keywords: /review|code review|代码审查|审查代码|检查代码|code check|评审代码/, level: 3, flow: 'review-cycle-fix', desc: '代码审查', emoji: '👀', weight: 80 },
  { type: 'ui-design', keywords: /ui design|design|component|style|界面设计|UI设计|样式设计|前端组件|页面设计|交互设计/, level: 3, flow: 'ui', desc: 'UI设计', emoji: '🎨', weight: 75 },
  { type: 'spec-driven', keywords: /spec gen|specification|PRD|产品需求|产品文档|产品规格|需求文档|规格说明/, level: 4, flow: 'spec-driven', desc: '规格驱动', emoji: '📋', weight: 90 },
  { type: 'exploration', keywords: /uncertain|explore|research|what if|不确定|探索|研究|调研|可行性分析|评估方案|比较方案|方案对比/, level: 4, flow: 'full', desc: '探索性任务', emoji: '🔎', weight: 85 },
  { type: 'quick-task', keywords: /quick|simple|small task|快速任务|简单任务|小改一下|小修一下|一会好|很快完成/, level: 2, flow: 'rapid', desc: '快速任务', emoji: '⚡', weight: 60 },

  // 复杂需求检测 - 检测需要架构设计的复杂需求（提升权重确保优先匹配）
  { type: 'complex-feature', keywords: /架构扩展|扩展能力|预留扩展|考虑未来|复用资源|性能影响|资源占用|架构预留|扩展设计|扩展性/, level: 3, flow: 'collaborative-plan', desc: '复杂功能开发', emoji: '🏗️', weight: 92 },

  // 需求澄清检测 - 检测需要讨论和补充的需求（提升权重确保优先匹配）
  { type: 'clarify-needed', keywords: /初步方案|方案不足|帮我补|补漏|不足之处|可能有问题|你看一下|有哪些要|需要理解|帮我完善|补充方案/, level: 3, flow: 'analyze-to-plan', desc: '需求需澄清', emoji: '💬', weight: 91 },

  // Default - feature (最低权重，作为兜底)
  { type: 'feature', keywords: /.*/, level: 2, flow: 'rapid', desc: '功能开发', emoji: '✨', weight: 1 },
];

// 命令链定义
export interface CommandChain {
  flow: string;
  level: number;
  pipeline: string[];
  commands: { cmd: string; desc: string }[];
  tips: string[];
}

export const COMMAND_CHAINS: Record<string, CommandChain> = {
  // Level 1 - 超简单
  'rapid': {
    flow: 'rapid',
    level: 1,
    pipeline: ['workflow-lite-plan', 'workflow-test-fix'],
    commands: [
      { cmd: '/workflow-lite-plan', desc: '轻量规划+执行' },
      { cmd: '/workflow-test-fix', desc: '测试生成+修复' },
    ],
    tips: ['适合简单任务', '规划执行一体化', '自动处理测试'],
  },

  // Bugfix
  'bugfix.standard': {
    flow: 'bugfix.standard',
    level: 2,
    pipeline: ['workflow-lite-plan', 'workflow-test-fix'],
    commands: [
      { cmd: '/workflow-lite-plan --bugfix', desc: 'Bug修复规划' },
      { cmd: '/workflow-test-fix', desc: '测试修复' },
    ],
    tips: ['标准bug修复流程', '包含测试验证'],
  },

  'bugfix.hotfix': {
    flow: 'bugfix.hotfix',
    level: 2,
    pipeline: ['workflow-lite-plan'],
    commands: [
      { cmd: '/workflow-lite-plan --hotfix', desc: '紧急修复' },
    ],
    tips: ['跳过测试', '快速上线', '仅限紧急情况'],
  },

  // With-File workflows
  'analyze-to-plan': {
    flow: 'analyze-to-plan',
    level: 3,
    pipeline: ['workflow:analyze-with-file', 'workflow-lite-plan'],
    commands: [
      { cmd: '/workflow:analyze-with-file', desc: '协作分析' },
      { cmd: '/workflow-lite-plan', desc: '轻量规划' },
    ],
    tips: ['先深度理解', '再快速执行'],
  },

  'brainstorm-to-plan': {
    flow: 'brainstorm-to-plan',
    level: 4,
    pipeline: ['workflow:brainstorm-with-file', 'workflow-plan', 'workflow-execute', 'workflow-test-fix'],
    commands: [
      { cmd: '/workflow:brainstorm-with-file', desc: '头脑风暴' },
      { cmd: '/workflow-plan', desc: '正式规划' },
      { cmd: '/workflow-execute', desc: '执行任务' },
      { cmd: '/workflow-test-fix', desc: '测试验证' },
    ],
    tips: ['多角度探索', '正式规划', '完整执行'],
  },

  'debug-with-file': {
    flow: 'debug-with-file',
    level: 3,
    pipeline: ['workflow:debug-with-file'],
    commands: [
      { cmd: '/workflow:debug-with-file', desc: '假设驱动调试' },
    ],
    tips: ['假设→验证→修复', '自动循环'],
  },

  'greenfield': {
    flow: 'greenfield',
    level: 4,
    pipeline: ['workflow:brainstorm-with-file', 'workflow-plan', 'workflow-execute', 'review-cycle', 'workflow-test-fix'],
    commands: [
      { cmd: '/workflow:brainstorm-with-file', desc: '需求探索' },
      { cmd: '/workflow-plan', desc: '架构规划' },
      { cmd: '/workflow-execute', desc: '实现执行' },
      { cmd: '/review-cycle', desc: '代码审查' },
      { cmd: '/workflow-test-fix', desc: '测试验证' },
    ],
    tips: ['0→1全流程', '包含审查', '质量保障'],
  },

  'collaborative-plan': {
    flow: 'collaborative-plan',
    level: 3,
    pipeline: ['workflow:collaborative-plan-with-file', 'workflow:unified-execute-with-file'],
    commands: [
      { cmd: '/workflow:collaborative-plan-with-file', desc: '多Agent协作规划' },
      { cmd: '/workflow:unified-execute-with-file', desc: '统一执行' },
    ],
    tips: ['多角色协作', '自动分工'],
  },

  'roadmap': {
    flow: 'roadmap',
    level: 4,
    pipeline: ['workflow:roadmap-with-file', 'team-planex'],
    commands: [
      { cmd: '/workflow:roadmap-with-file', desc: '需求路线图' },
      { cmd: '/team-planex', desc: 'Wave并行执行' },
    ],
    tips: ['需求拆解', 'Issue创建', '并行执行'],
  },

  // Cycle workflows
  'integration-test-cycle': {
    flow: 'integration-test-cycle',
    level: 3,
    pipeline: ['workflow:integration-test-cycle'],
    commands: [
      { cmd: '/workflow:integration-test-cycle', desc: '集成测试循环' },
    ],
    tips: ['自动探索', '测试开发', '修复循环'],
  },

  'refactor-cycle': {
    flow: 'refactor-cycle',
    level: 3,
    pipeline: ['workflow:refactor-cycle'],
    commands: [
      { cmd: '/workflow:refactor-cycle', desc: '重构循环' },
    ],
    tips: ['债务发现', '优先级排序', '验证闭环'],
  },

  // Issue workflow
  'issue': {
    flow: 'issue',
    level: 2,
    pipeline: ['issue:discover', 'issue:plan', 'issue:queue', 'issue:execute'],
    commands: [
      { cmd: '/issue:discover', desc: '发现问题' },
      { cmd: '/issue:plan', desc: '规划方案' },
      { cmd: '/issue:queue', desc: '排成队列' },
      { cmd: '/issue:execute', desc: '批量执行' },
    ],
    tips: ['主动发现问题', '批量处理', '独立提交'],
  },

  // Team workflows
  'team-planex': {
    flow: 'team-planex',
    level: 4,
    pipeline: ['team-planex'],
    commands: [
      { cmd: '/team-planex', desc: 'Team并行执行' },
    ],
    tips: ['Planner+Executor', 'Wave流水线', '高效并行'],
  },

  // Standard workflows
  'multi-cli-plan': {
    flow: 'multi-cli-plan',
    level: 3,
    pipeline: ['workflow-multi-cli-plan', 'workflow-test-fix'],
    commands: [
      { cmd: '/workflow-multi-cli-plan', desc: '多CLI协作规划' },
      { cmd: '/workflow-test-fix', desc: '测试验证' },
    ],
    tips: ['多模型讨论', '交叉验证'],
  },

  'tdd': {
    flow: 'tdd',
    level: 3,
    pipeline: ['workflow-tdd-plan', 'workflow-execute'],
    commands: [
      { cmd: '/workflow-tdd-plan', desc: 'TDD规划' },
      { cmd: '/workflow-execute', desc: '执行实现' },
    ],
    tips: ['测试先行', 'Red-Green-Refactor'],
  },

  'test-gen': {
    flow: 'test-gen',
    level: 3,
    pipeline: ['workflow-test-fix'],
    commands: [
      { cmd: '/workflow-test-fix', desc: '测试生成' },
    ],
    tips: ['自动生成', '循环修复'],
  },

  'test-fix-gen': {
    flow: 'test-fix-gen',
    level: 3,
    pipeline: ['workflow-test-fix'],
    commands: [
      { cmd: '/workflow-test-fix', desc: '测试修复' },
    ],
    tips: ['分析失败', '自动修复'],
  },

  'review-cycle-fix': {
    flow: 'review-cycle-fix',
    level: 3,
    pipeline: ['review-cycle', 'workflow-test-fix'],
    commands: [
      { cmd: '/review-cycle', desc: '代码审查' },
      { cmd: '/workflow-test-fix', desc: '测试验证' },
    ],
    tips: ['多维度审查', '自动修复'],
  },

  'ui': {
    flow: 'ui',
    level: 3,
    pipeline: ['workflow:ui-design:explore-auto', 'workflow-plan', 'workflow-execute'],
    commands: [
      { cmd: '/workflow:ui-design:explore-auto', desc: 'UI设计探索' },
      { cmd: '/workflow-plan', desc: '规划' },
      { cmd: '/workflow-execute', desc: '实现' },
    ],
    tips: ['设计系统', 'Token驱动'],
  },

  'spec-driven': {
    flow: 'spec-driven',
    level: 4,
    pipeline: ['spec-generator', 'workflow-plan', 'workflow-execute', 'workflow-test-fix'],
    commands: [
      { cmd: '/spec-generator', desc: '生成产品规格' },
      { cmd: '/workflow-plan', desc: '规划' },
      { cmd: '/workflow-execute', desc: '执行' },
      { cmd: '/workflow-test-fix', desc: '测试' },
    ],
    tips: ['PRD驱动', '完整流水线'],
  },

  'full': {
    flow: 'full',
    level: 4,
    pipeline: ['brainstorm', 'workflow-plan', 'workflow-execute', 'workflow-test-fix'],
    commands: [
      { cmd: '/brainstorm', desc: '头脑风暴' },
      { cmd: '/workflow-plan', desc: '规划' },
      { cmd: '/workflow-execute', desc: '执行' },
      { cmd: '/workflow-test-fix', desc: '测试' },
    ],
    tips: ['完整探索', '正式规划', '执行验证'],
  },
};

// 单个匹配结果
export interface MatchResult {
  pattern: TaskPattern;     // 匹配的模式
  matchedKeyword: string;   // 匹配到的关键词
  score: number;            // 匹配得分（权重 * 关键词长度权重）
}

// 单个命令链方案
export interface ChainOption {
  name: string;              // 方案名称
  flow: string;              // 工作流标识
  level: number;             // 复杂度级别
  commands: {cmd: string; desc: string}[];  // 命令列表
  tips?: string[];           // 使用提示
}

// 意图分析结果类型
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
  isDefaultFallback: boolean; // 改进2: 是否使用了默认兜底
  allMatches: MatchResult[]; // 改进3: 所有匹配结果（用于展示备选）
}

// 意图分析函数（改进版）
// 改进2: 添加未匹配提示，明确告知用户使用了默认推荐
// 改进3: 收集所有匹配结果，按权重排序
export function analyzeIntent(input: string): IntentAnalysis {
  const lowerInput = input.toLowerCase();

  // 收集所有匹配结果
  const allMatches: MatchResult[] = [];

  for (const pattern of TASK_PATTERNS) {
    const match = lowerInput.match(pattern.keywords);
    if (match) {
      // 计算匹配得分：权重 * (关键词长度权重，更长的关键词更精确)
      const keywordLength = match[0].length;
      const lengthBonus = Math.min(keywordLength / 10, 1.5); // 长度加成，上限1.5x
      const score = pattern.weight * lengthBonus;

      allMatches.push({
        pattern,
        matchedKeyword: match[0],
        score,
      });
    }
  }

  // 按得分排序
  allMatches.sort((a, b) => b.score - a.score);

  // 选择最佳匹配（第一个）
  const bestMatch = allMatches[0];

  if (bestMatch && bestMatch.pattern.type !== 'feature') {
    // 有有效匹配
    const chain = COMMAND_CHAINS[bestMatch.pattern.flow] || COMMAND_CHAINS['rapid'];
    const confidence = Math.min(0.95, 0.6 + (bestMatch.score / 200));

    return {
      goal: input,
      taskType: bestMatch.pattern.type,
      level: bestMatch.pattern.level,
      flow: bestMatch.pattern.flow,
      chain,
      pattern: bestMatch.pattern,
      confidence,
      matchedKeyword: bestMatch.matchedKeyword,
      isDefaultFallback: false,
      allMatches: allMatches.slice(0, 5), // 保留前5个备选
    };
  }

  // 默认返回 rapid (兜底)
  const defaultChain = COMMAND_CHAINS['rapid'];
  const defaultPattern = TASK_PATTERNS.find(p => p.type === 'feature')!;

  return {
    goal: input,
    taskType: 'feature',
    level: 2,
    flow: 'rapid',
    chain: defaultChain,
    pattern: defaultPattern,
    confidence: 0.3,
    matchedKeyword: undefined,
    isDefaultFallback: true,
    allMatches: allMatches.slice(0, 5), // 即使是兜底也返回匹配结果供参考
  };
}
