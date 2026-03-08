// Command Object Template
// 用于生成新的命令对象

// ============================================
// 命令对象结构
// ============================================

interface Command {
  cmd: string;                    // 必需: 命令名称，以 / 开头
  desc: string;                   // 必需: 简短描述 (< 80 字符)
  status: CommandStatus;          // 必需: 命令状态
  category: CommandCategory;      // 必需: 命令分类
  cli: CLIType;                   // 必需: CLI 类型
  level?: 1 | 2 | 3 | 4;          // 可选: 工作流级别
  addedInVersion?: string;        // 可选: 添加版本
  detail?: string;                // 可选: 详细描述 (< 200 字符)
  usage?: string;                 // 可选: 使用场景 (< 100 字符)
}

type CommandStatus = 'new' | 'stable' | 'recommended' | 'deprecated';
type CLIType = 'claude' | 'codex';
type CommandCategory =
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
  | 'skill';    // 技能

// ============================================
// 模板示例
// ============================================

// 示例 1: 基础命令
const basicCommand: Command = {
  cmd: '/example-command',
  desc: '示例命令的简短描述',
  status: 'new',
  category: 'workflow',
  cli: 'claude',
  addedInVersion: 'v7.1'
};

// 示例 2: 完整命令
const fullCommand: Command = {
  cmd: '/workflow:example',
  desc: '这是一个示例工作流命令，用于演示完整结构',
  status: 'stable',
  category: 'workflow',
  cli: 'claude',
  level: 2,
  addedInVersion: 'v7.0',
  detail: '详细的命令描述，解释命令的功能、参数、输出等信息。应该让用户清楚知道这个命令能做什么。',
  usage: '需要执行特定任务时，直接运行命令即可'
};

// 示例 3: Skill 类型命令
const skillCommand: Command = {
  cmd: '/team-example',
  desc: '团队协作技能示例',
  status: 'stable',
  category: 'skill',
  cli: 'claude',
  detail: '多角色协作：分析师→规划师→执行者→审查员',
  usage: '需要多人协作完成复杂任务时'
};

// 示例 4: Codex 专用命令
const codexCommand: Command = {
  cmd: '/codex-example',
  desc: 'Codex 专用命令示例',
  status: 'stable',
  category: 'prompt',
  cli: 'codex',
  addedInVersion: 'v6.2'
};

// ============================================
// 分类映射规则
// ============================================

/**
 * 根据命令来源目录判断分类
 *
 * 来源目录 → 分类
 * - .claude/commands/ → 'workflow' (斜杠命令)
 * - .claude/skills/   → 'skill' (技能)
 * - .codex/prompts/   → 'prompt' (预检清单)
 * - .codex/skills/    → 'skill' (技能)
 *
 * 特殊规则:
 * - 命令名含 'session' → 'session'
 * - 命令名含 'issue' → 'issue'
 * - 命令名含 'memory' → 'memory'
 * - 命令名含 'brainstorm' → 'brainstorm'
 * - 命令名含 'tdd' → 'tdd'
 * - 命令名含 'test' → 'test'
 * - 命令名含 'review' → 'review'
 * - 命令名含 'ui-design' → 'ui-design'
 * - 命令名含 'ccw' 且是主入口 → 'main'
 */

function mapCategory(cmdName: string, source: string): CommandCategory {
  // 特殊关键词优先
  if (cmdName.includes('session')) return 'session';
  if (cmdName.includes('issue')) return 'issue';
  if (cmdName.includes('memory')) return 'memory';
  if (cmdName.includes('brainstorm')) return 'brainstorm';
  if (cmdName.includes('tdd')) return 'tdd';
  if (cmdName.includes('test')) return 'test';
  if (cmdName.includes('review')) return 'review';
  if (cmdName.includes('ui-design')) return 'ui-design';

  // 主入口命令
  if (['/ccw', '/ccw-help', '/ccw-coordinator', '/flow-create'].includes(cmdName)) {
    return 'main';
  }

  // 按来源目录
  if (source.includes('prompts')) return 'prompt';
  if (source.includes('skills')) return 'skill';
  if (source.includes('commands')) return 'workflow';

  return 'skill'; // 默认
}

// ============================================
// 生成函数
// ============================================

function generateCommandObject(
  cmd: string,
  desc: string,
  source: string,
  localVersion: string,
  detail?: string,
  usage?: string
): Command {
  const category = mapCategory(cmd, source);
  const cli = source.includes('codex') ? 'codex' : 'claude';

  return {
    cmd,
    desc: desc.slice(0, 80),
    status: 'new',
    category,
    cli,
    addedInVersion: `v${localVersion}`,
    ...(detail && { detail: detail.slice(0, 200) }),
    ...(usage && { usage: usage.slice(0, 100) })
  };
}

// ============================================
// 导出格式
// ============================================

/**
 * 在 commands.ts 中使用的格式:
 *
 * { cmd: '/example', desc: '描述', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v7.1',
 *   detail: '详细描述', usage: '使用场景' }
 */
