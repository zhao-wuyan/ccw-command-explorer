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
  { cmd: '/workflow:plan', desc: '5阶段规划工作流，生成 IMPL_PLAN.md', status: 'stable', category: 'workflow', cli: 'claude', level: 3, addedInVersion: 'v1.0',
    detail: '详细规划流程：①创建会话；②收集项目上下文；③AI分析需求；④问你澄清问题；⑤生成任务文件(IMPL_PLAN.md)',
    usage: '复杂功能、多模块开发，需要详细规划文档'
  },
  { cmd: '/workflow:lite-plan', desc: '轻量级交互规划，内存中快速规划', status: 'stable', category: 'workflow', cli: 'claude', level: 2, addedInVersion: 'v6.2',
    detail: '快速规划：在内存中快速分析→拆解任务→排顺序。不生成文件，规划完直接执行。适合中小任务',
    usage: '做功能或修bug，想快速规划然后马上开始'
  },
  { cmd: '/workflow:lite-execute', desc: '执行内存中的计划', status: 'stable', category: 'workflow', cli: 'claude', level: 2, addedInVersion: 'v6.2',
    detail: '执行lite-plan生成的计划。配合lite-plan使用，一个规划一个执行',
    usage: '刚用lite-plan规划完，现在要执行'
  },
  { cmd: '/workflow:lite-fix', desc: '智能 bug 诊断修复', status: 'new', category: 'workflow', cli: 'claude', level: 2, addedInVersion: 'v6.2',
    detail: '自动修bug：①分析报错信息；②定位问题代码；③提出修复方案；④你确认后自动修复。支持生产环境热修复模式',
    usage: '发现bug想快速定位原因并修复'
  },
  { cmd: '/workflow:execute', desc: '协调 Agent 执行任务', status: 'stable', category: 'workflow', cli: 'claude', level: 3, addedInVersion: 'v1.0',
    detail: '执行任务列表：按依赖顺序执行，A完成才执行B，无依赖的可并行。实时显示进度',
    usage: '有规划好的任务列表需要执行'
  },
  { cmd: '/workflow:replan', desc: '交互式重新规划', status: 'stable', category: 'workflow', cli: 'claude', level: 3, addedInVersion: 'v1.0',
    detail: '调整计划：执行中发现需求变了或计划有问题，可以交互式调整任务，增删改都行',
    usage: '执行到一半发现计划需要调整'
  },
  { cmd: '/workflow:resume', desc: '智能恢复工作流会话', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0',
    detail: '恢复中断的工作：自动检测之前未完成的会话，恢复上下文继续执行',
    usage: '之前的工作被中断(关机、开会等)，想继续'
  },
  { cmd: '/workflow:review', desc: '后实现审查', status: 'stable', category: 'review', cli: 'claude', addedInVersion: 'v6.0',
    detail: '功能完成后审查：检查代码质量、是否符合规范、有没有明显问题',
    usage: '功能开发完成，合入代码前想检查一下'
  },
  { cmd: '/workflow:status', desc: '生成任务状态视图', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '查看进度：显示当前工作流执行到哪了、哪些任务完成、哪些还在做、哪些等待中',
    usage: '想了解当前工作流的执行进度'
  },
  { cmd: '/workflow:init', desc: '初始化项目状态', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0',
    detail: '首次使用准备：创建.workflow目录、初始化配置文件。在新项目里第一次用CCW要先执行这个',
    usage: '在新项目中第一次使用CCW'
  },
  { cmd: '/workflow:clean', desc: '清理代码和临时文件', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.2',
    detail: '智能清理：检测过时的会话目录、临时文件、死代码、无用的依赖。保持项目整洁',
    usage: '项目做了很久，想清理不需要的文件'
  },
  { cmd: '/workflow:plan-verify', desc: '计划一致性验证', status: 'stable', category: 'review', cli: 'claude', addedInVersion: 'v6.0',
    detail: '检查计划：验证任务计划是否完整、依赖关系是否正确、有没有遗漏或冲突',
    usage: '执行前想确保计划没问题'
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
  { cmd: '/workflow:req-plan-with-file', desc: '需求规划', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.2',
    detail: '文档转任务：读取需求文档(PRD、设计稿等)，提取功能点，生成开发任务',
    usage: '有现成的需求文档想转成开发任务'
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

  // ==================== 记忆系统 ====================
  { cmd: '/memory:docs', desc: '规划文档工作流', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '文档规划：分析项目哪些模块需要更新文档，规划更新策略',
    usage: '需要更新项目文档但不确定范围'
  },
  { cmd: '/memory:docs-full-cli', desc: '全量文档生成 (CLI)', status: 'new', category: 'memory', cli: 'claude', addedInVersion: 'v6.2',
    detail: '用外部AI全量更新：调用Gemini等外部AI，为所有模块生成CLAUDE.md文档。适合大项目',
    usage: '项目结构变化大，想全面更新所有文档'
  },
  { cmd: '/memory:docs-related-cli', desc: '增量文档更新 (CLI)', status: 'new', category: 'memory', cli: 'claude', addedInVersion: 'v6.2',
    detail: '用外部AI增量更新：只更新最近改动相关的模块文档，省时间',
    usage: '只改了几个文件，只想更新相关文档'
  },
  { cmd: '/memory:update-full', desc: '全量 CLAUDE.md 更新', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '内置AI全量更新：扫描整个项目，更新所有CLAUDE.md文件。不依赖外部工具',
    usage: '项目结构变化大想更新文档，不想配置外部AI'
  },
  { cmd: '/memory:update-related', desc: '增量 CLAUDE.md 更新', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '内置AI增量更新：根据git变动，只更新受影响模块的CLAUDE.md',
    usage: '日常开发中的文档维护'
  },
  { cmd: '/memory:load', desc: '加载项目上下文', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v1.0',
    detail: '快速了解项目：读取项目CLAUDE.md，快速加载项目结构、技术栈、约定等信息',
    usage: '开始新会话想快速了解项目'
  },
  { cmd: '/memory:load-skill-memory', desc: '加载技能记忆包', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '加载之前保存的技能包：读取SKILL.md文件，恢复之前学到的技能和经验',
    usage: '想复用之前保存的技能经验'
  },
  { cmd: '/memory:skill-memory', desc: '生成 SKILL.md', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '保存技能经验：把当前会话学到的技能、踩过的坑、发现的好方法保存成SKILL.md',
    usage: '有可复用的经验想保存'
  },
  { cmd: '/memory:code-map-memory', desc: '代码分析生成 Mermaid 文档', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '代码可视化：分析代码结构，生成Mermaid流程图、类图等，直观展示代码关系',
    usage: '想可视化代码架构'
  },
  { cmd: '/memory:tech-research', desc: '技术栈研究和 SKILL 包生成', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '学习新技术：研究新技术栈，总结要点，生成可复用的SKILL包。下次遇到同样技术直接用',
    usage: '学习新技术想沉淀知识'
  },
  { cmd: '/memory:workflow-skill-memory', desc: '归档会话生成工作流技能包', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v5.2',
    detail: '沉淀工作流经验：把完成的工作流会话归档，提取可复用的模式，生成技能包',
    usage: '完成重要工作后想沉淀经验'
  },
  { cmd: '/enhance-prompt', desc: '上下文感知提示词增强', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v6.0',
    detail: '优化你的指令：根据当前项目上下文，帮你把模糊的需求描述变成清晰具体的指令',
    usage: '想让AI更好理解你的意图'
  },
  { cmd: '/version', desc: '显示版本信息', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v1.0',
    detail: '查看版本：显示CCW当前版本、更新日志，检查是否有新版本可更新',
    usage: '想查看当前版本或检查更新'
  },

  // ==================== 头脑风暴 ====================
  { cmd: '/workflow:brainstorm:auto-parallel', desc: '并行头脑风暴，动态角色选择', status: 'new', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.3',
    detail: '自动多角色思考：自动选择多个专业视角(产品/技术/设计等)并行分析，最后综合结论',
    usage: '需要多角度创意思考但不确定需要哪些视角'
  },
  { cmd: '/workflow:brainstorm:artifacts', desc: '生成角色指导规范文档', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '定义角色职责：为每个角色(产品经理、架构师等)生成职责说明、关注点、输出规范',
    usage: '想定义团队中各角色的职责'
  },
  { cmd: '/workflow:brainstorm:synthesis', desc: '综合分析结果，智能问答', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '整合多角色结论：把各角色的分析结果综合起来，支持问答式深入探讨',
    usage: '多角色分析完后想整合结论'
  },
  { cmd: '/workflow:brainstorm:api-designer', desc: 'API 设计师角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: 'API专家视角：从API设计角度分析，关注接口规范、数据结构、版本兼容等',
    usage: '需要设计API接口时'
  },
  { cmd: '/workflow:brainstorm:data-architect', desc: '数据架构师角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '数据专家视角：从数据角度分析，关注数据模型、存储方案、数据流转等',
    usage: '需要设计数据结构时'
  },
  { cmd: '/workflow:brainstorm:product-manager', desc: '产品经理角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '产品视角：从产品价值角度分析，关注用户需求、市场价值、功能优先级',
    usage: '需要评估功能价值时'
  },
  { cmd: '/workflow:brainstorm:product-owner', desc: '产品负责人角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: 'PO视角：从产品决策角度分析，关注优先级排序、资源分配、迭代规划',
    usage: '需要确定功能优先级时'
  },
  { cmd: '/workflow:brainstorm:scrum-master', desc: 'Scrum Master 角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '敏捷教练视角：从流程优化角度分析，关注开发效率、团队协作、迭代改进',
    usage: '需要优化开发流程时'
  },
  { cmd: '/workflow:brainstorm:subject-matter-expert', desc: '领域专家角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '业务专家视角：从业务领域角度分析，关注业务规则、行业特点、合规要求',
    usage: '需要深入理解业务领域时'
  },
  { cmd: '/workflow:brainstorm:system-architect', desc: '系统架构师角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '架构专家视角：从技术架构角度分析，关注系统设计、技术选型、扩展性',
    usage: '需要设计系统架构时'
  },
  { cmd: '/workflow:brainstorm:ui-designer', desc: 'UI 设计师角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: 'UI专家视角：从界面设计角度分析，关注视觉效果、交互体验、设计规范',
    usage: '需要设计用户界面时'
  },
  { cmd: '/workflow:brainstorm:ux-expert', desc: 'UX 专家角色分析', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '体验专家视角：从用户体验角度分析，关注用户流程、易用性、无障碍设计',
    usage: '需要优化用户体验时'
  },

  // ==================== TDD ====================
  { cmd: '/workflow:tdd-plan', desc: 'TDD 工作流规划', status: 'stable', category: 'tdd', cli: 'claude', level: 3, addedInVersion: 'v6.0',
    detail: '测试驱动规划：生成Red-Green-Refactor任务链。①先写失败的测试；②写代码让测试通过；③优化代码',
    usage: '想用专业TDD方式开发'
  },
  { cmd: '/workflow:tdd-verify', desc: '验证 TDD 合规性', status: 'stable', category: 'tdd', cli: 'claude', level: 3, addedInVersion: 'v6.0',
    detail: '检查TDD是否规范：验证是否先写测试、测试覆盖率是否达标、重构是否破坏功能',
    usage: '检查TDD开发过程是否规范'
  },

  // ==================== 测试 ====================
  { cmd: '/workflow:test-gen', desc: '生成测试计划', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.0',
    detail: '生成测试用例：分析代码逻辑，自动生成单元测试、边界条件测试、异常情况测试',
    usage: '功能写完需要补测试'
  },
  { cmd: '/workflow:test-fix-gen', desc: '生成测试修复计划', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.0',
    detail: '测试失败修复：分析失败原因，生成修复任务列表',
    usage: '测试失败需要修复'
  },
  { cmd: '/workflow:test-cycle-execute', desc: '测试循环执行直到通过', status: 'new', category: 'test', cli: 'claude', addedInVersion: 'v6.3',
    detail: '自动修复循环：①执行测试；②发现失败自动修复；③再测试。循环直到全部通过或达到最大次数',
    usage: '想让测试自动跑通'
  },

  // ==================== 代码审查 ====================
  { cmd: '/workflow:review-module-cycle', desc: '模块多维度审查', status: 'new', category: 'review', cli: 'claude', addedInVersion: 'v6.3',
    detail: '指定模块审查：选择特定模块或文件，进行7维度代码审查，生成详细报告',
    usage: '想审查特定的代码模块'
  },
  { cmd: '/workflow:review-session-cycle', desc: '会话代码审查', status: 'new', category: 'review', cli: 'claude', addedInVersion: 'v6.3',
    detail: '审查本次改动：审查当前工作流会话中产生的所有代码变更',
    usage: '开发完成后想审查本次改动'
  },
  { cmd: '/workflow:review-fix', desc: '审查问题自动修复', status: 'new', category: 'review', cli: 'claude', addedInVersion: 'v6.3',
    detail: '自动修问题：根据审查报告自动修复发现的问题',
    usage: '审查发现问题后想自动修复'
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
  { cmd: '/workflow:ui-design:capture', desc: '批量截图捕获', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.2',
    detail: '批量截图：自动访问多个网页，批量截图保存，收集设计参考素材',
    usage: '需要收集UI设计参考'
  },
  { cmd: '/workflow:ui-design:explore-layers', desc: '深度 UI 探索', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.2',
    detail: '深度分析：分析UI的层次结构、组件关系、交互逻辑',
    usage: '需要深入分析UI结构'
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

  // ==================== Task 命令 ====================
  { cmd: '/task:create', desc: '创建实现任务', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0',
    detail: '手动创建单个任务：填写任务标题、描述、预计工作量。适合补充遗漏的任务',
    usage: '想单独创建一个任务'
  },
  { cmd: '/task:breakdown', desc: '任务分解', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0',
    detail: '拆分大任务：把一个大任务拆成多个小任务，便于分工和跟踪',
    usage: '任务太大想拆分'
  },
  { cmd: '/task:execute', desc: '执行任务', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.0',
    detail: '执行单个任务：选择一个任务执行，完成后自动标记状态',
    usage: '想执行特定任务'
  },

  // ==================== 内部工具 ====================
  { cmd: '/workflow:tools:concept-enhanced', desc: '增强智能分析，并行CLI执行', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '增强分析：同时调用多个外部AI(Gemini等)分析问题，综合结论',
    usage: '需要深度分析代码'
  },
  { cmd: '/workflow:tools:conflict-resolution', desc: 'CLI驱动的冲突检测和解决', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '冲突解决：检测任务间的代码冲突，提供合并策略或协调方案',
    usage: '存在代码冲突需要解决'
  },
  { cmd: '/workflow:tools:context-gather', desc: '智能收集项目上下文', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '收集上下文：智能分析与任务相关的代码文件、依赖关系、配置等',
    usage: '需要快速了解相关代码'
  },
  { cmd: '/workflow:tools:task-generate', desc: '生成任务JSON和IMPL_PLAN.md', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '生成任务文件：根据规划结果生成可执行的任务JSON文件和实现计划文档',
    usage: '需要生成可执行的任务文件'
  },
  { cmd: '/workflow:tools:task-generate-agent', desc: '使用action-planning-agent自动生成任务', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.2',
    detail: '自动生成任务：用专门的Agent分析需求，自动生成任务文件',
    usage: '需要自动化任务生成'
  },
  { cmd: '/workflow:tools:task-generate-tdd', desc: '生成TDD任务链 (Red-Green-Refactor)', status: 'stable', category: 'tdd', cli: 'claude', addedInVersion: 'v6.0',
    detail: '生成TDD任务：按测试驱动开发流程生成任务链：写测试→写代码→优化',
    usage: '需要TDD开发'
  },
  { cmd: '/workflow:tools:tdd-coverage-analysis', desc: 'TDD覆盖率分析', status: 'stable', category: 'tdd', cli: 'claude', addedInVersion: 'v6.0',
    detail: '覆盖率分析：分析TDD测试覆盖率，找出未覆盖的代码路径',
    usage: '需要检查测试覆盖率'
  },
  { cmd: '/workflow:tools:test-concept-enhanced', desc: '使用Gemini分析测试需求', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.0',
    detail: '测试需求分析：用Gemini分析代码，确定需要测试的场景和边界条件',
    usage: '需要深入分析测试需求'
  },
  { cmd: '/workflow:tools:test-context-gather', desc: '收集测试覆盖上下文', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.0',
    detail: '测试上下文：收集与测试相关的代码、依赖、配置等信息',
    usage: '准备编写测试'
  },
  { cmd: '/workflow:tools:test-task-generate', desc: '生成测试修复任务JSON', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.0',
    detail: '修复任务生成：分析测试失败原因，生成修复任务列表',
    usage: '测试失败需要修复'
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
  { cmd: '/team-iterdev', desc: '团队迭代开发 - 多角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '持续迭代：架构师设计→开发者写代码→测试→审查，发现质量问题自动退回修改。跨Sprint累积经验，越做越聪明',
    usage: '需要多轮迭代、持续交付的功能开发'
  },
  { cmd: '/team-lifecycle', desc: '团队全生命周期 - spec/impl/test', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '8个角色分工：分析师调研→作家写文档→评论员挑刺→规划师拆任务→执行者写代码→测试→审查。三种模式：只写文档/只写代码/完整流程',
    usage: '大项目从0到1，需要完整的需求→设计→开发→测试流程'
  },
  { cmd: '/team-lifecycle-v2', desc: '团队全生命周期 v2 - 增强版', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.3',
    detail: '比v1增强：12个角色(含前端专用)、支持前端流水线、跨角色知识积累(wisdom)、会话暂停恢复。自动检测前端任务，切换到前端专用流程',
    usage: '大型全栈项目，需要前后端并行开发，或者需要暂停/恢复工作'
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
    detail: '按依赖顺序执行任务：A任务完成后才执行B任务，支持并行执行无依赖的任务，实时显示进度',
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
    detail: '自动化测试循环：①自动生成测试用例；②执行测试；③发现失败自动修复；④再测试。直到全部通过',
    usage: '功能写完了需要补测试、测试失败想自动修复'
  },

  // ==================== Codex 预检清单 (Prompts) ====================
  { cmd: '/prompts:prep-plan', desc: 'workflow:plan 预检清单 - 环境验证、任务质量评估、执行配置', status: 'stable', category: 'prompt', cli: 'codex', addedInVersion: 'v6.2',
    detail: '执行前检查5项：①项目环境OK吗；②目标清晰吗；③成功标准明确吗；④范围边界清楚吗；⑤有什么限制。避免执行到一半发现问题',
    usage: '重要任务执行前想确保万无一失'
  },
  { cmd: '/prompts:prep-loop', desc: 'ccw-loop 预检清单 - 发现上游任务、验证转换', status: 'stable', category: 'prompt', cli: 'codex', addedInVersion: 'v6.2',
    detail: '自动找之前的规划文件：查找brainstorm、分析会话等产生的任务，验证格式正确，转换成可执行格式',
    usage: '之前做过规划，现在想执行那些任务'
  },
  { cmd: '/prompts:prep-cycle', desc: 'parallel-dev-cycle 预检清单 - 0→1→100 迭代配置', status: 'stable', category: 'prompt', cli: 'codex', addedInVersion: 'v6.2',
    detail: '配置两阶段迭代：0→1先做出能跑的原型；1→100打磨到生产质量(测试90%通过、代码覆盖80%)',
    usage: '大型功能想分阶段交付：先快速出原型，再逐步完善'
  },

  // ==================== Codex 技能 (Skills) ====================
  // 规划类
  { cmd: '/collaborative-plan-with-file', desc: '串行协作规划 - Plan Note架构，自动冲突检测', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '多人协作规划：先把大需求拆成多个技术领域，每人负责一个领域规划，最后自动检测各领域的冲突和依赖',
    usage: '涉及多个技术领域(前端/后端/数据库等)的复杂功能，需要不同专业的人分工规划'
  },
  { cmd: '/req-plan-with-file', desc: '需求规划工作流', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '从需求文档提取任务：读取PRD或设计文档，自动识别功能点，拆解成开发任务',
    usage: '有现成的需求文档/产品设计，想转成开发任务'
  },
  { cmd: '/workflow-req-plan', desc: '工作流需求规划', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '工作流级别的需求规划：不仅拆解任务，还生成任务间的依赖关系和执行顺序',
    usage: '复杂项目需要完整的工作流级别任务拆解'
  },
  { cmd: '/plan-converter', desc: '将规划产物转换为 .task/*.json 标准格式', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '格式转换器：把各种格式的规划文档(roadmap、plan-note、conclusions等)统一转成标准JSON格式，方便执行',
    usage: '有不同格式的规划文件，想统一执行'
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
  { cmd: '/issue-resolve', desc: 'Issue解决流水线 - 探索规划/转换/队列', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '统一解决流水线：从各种来源(规划文档、头脑风暴、手动)创建解决方案，形成执行队列，批量处理',
    usage: '有多个Issue需要批量解决'
  },
  { cmd: '/issue-execute', desc: 'Issue执行 - 每个方案提交一次', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '串行执行：一个Issue解决完→git commit→下一个Issue。每个方案单独提交，方便追踪和回滚',
    usage: '执行已规划好的Issue解决方案'
  },
  { cmd: '/issue-devpipeline', desc: 'Issue开发流水线', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '一站式处理：发现问题→规划方案→写代码→测试→提交。从发现到解决完整流程',
    usage: '想一次性完整处理Issue的生命周期'
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
