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
import type { CommandCategory, CLIType } from './types';

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
