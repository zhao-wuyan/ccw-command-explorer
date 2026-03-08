// ============================================
// 老奶奶推荐命令
// ============================================
import type { GrandmaCommand } from './types';

export const GRANDMA_COMMANDS: GrandmaCommand[] = [
  { cmd: '/ccw', desc: '有事找 ccw！它会帮你选命令', emoji: '🌟', scenario: '不知道用什么命令时', category: '万能入口', detail: '这是万能入口！不知道用什么命令就说这个，AI会帮你分析意图，自动选择最合适的命令。' },
  { cmd: '/review-code', desc: '代码审查用这个', emoji: '👀', scenario: '代码写完需要检查', category: '代码审查', detail: '7维度代码审查：生成详细报告，方便查看问题。' },
  { cmd: '/ccw-help', desc: '忘了命令？查一下！', emoji: '❓', scenario: '想看看有哪些命令', category: '帮助系统', detail: '想看看有哪些命令可用？这个命令会列出所有命令，还能搜索。' },
  { cmd: '/issue:discover', desc: '发现问题！', emoji: '🔍', scenario: '想找出项目的问题', category: 'Issue管理', detail: '多角度发现项目潜在问题，代码质量、安全问题、性能问题等。' },
];
