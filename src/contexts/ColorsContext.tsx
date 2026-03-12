import { createContext, useContext, type ReactNode } from 'react';
import { useTheme } from './ThemeContext';

interface Colors {
  bg: string;
  bgGradient1: string;
  bgGradient2: string;
  primary: string;
  primaryLight: string;
  secondary: string;
  secondaryLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  text: string;
  textMuted: string;
  textDim: string;
  accent1: string;
  accent2: string;
  accent3: string;
  accent4: string;
  accent5: string;
  cardBg: string;
  cardBorder: string;
  codeBg: string;
  modalBg: string; // 弹窗背景（不透明）
  panelBg: string; // 弹窗内面板背景（不透明）
  // 添加缺失的属性
  secondary2: string;
  secondary3: string;
  // 分类颜色（色盲友好）
  categoryMain: string;
  categoryWorkflow: string;
  categorySession: string;
  categoryIssue: string;
  categoryMemory: string;
  categoryBrainstorm: string;
  categoryTdd: string;
  categoryTest: string;
  categoryReview: string;
  categoryUiDesign: string;
  categoryPrompt: string;
  categorySkill: string;
  // CLI 颜色
  cliClaude: string;
  cliCodex: string;
  // Level 颜色
  level1: string;
  level2: string;
  level3: string;
  level4: string;
  // 案例级别颜色
  caseLevel1: string;
  caseLevel2: string;
  caseLevel3: string;
  caseLevel4: string;
  caseLevelSkill: string;
  caseLevelIssue: string;
  caseLevelTeam: string;
  caseLevelUi: string;
  caseLevelMemory: string;
  caseLevelSession: string;
  caseLevelMultiCli: string;
}

// 深色模式颜色 - 保持鲜艳
const DARK_COLORS: Colors = {
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
  codeBg: 'rgba(0,0,0,0.3)',
  modalBg: '#1a1a2e',
  panelBg: '#252542',
  secondary2: '#14b8a6',
  secondary3: '#0d9488',
  // 分类颜色 - 深色模式保持鲜艳
  categoryMain: '#ec4899',      // 粉色
  categoryWorkflow: '#6366f1',  // 靛蓝
  categorySession: '#818cf8',   // 浅靛蓝
  categoryIssue: '#f59e0b',     // 琥珀
  categoryMemory: '#8b5cf6',    // 紫色
  categoryBrainstorm: '#ec4899',// 粉色
  categoryTdd: '#10b981',       // 翠绿
  categoryTest: '#84cc16',      // 青柠
  categoryReview: '#ef4444',    // 红色
  categoryUiDesign: '#06b6d4',  // 青色
  categoryPrompt: '#f97316',    // 橙色
  categorySkill: '#84cc16',     // 青柠
  // CLI 颜色
  cliClaude: '#8b5cf6',         // 紫色
  cliCodex: '#06b6d4',          // 青色
  // Level 颜色
  level1: '#10b981',            // 翠绿 - 简单
  level2: '#6366f1',            // 靛蓝 - 中等
  level3: '#f59e0b',            // 琥珀 - 复杂
  level4: '#ec4899',            // 粉色 - 非常复杂
  // 案例级别颜色 - 深色模式保持鲜艳
  caseLevel1: '#4ade80',        // 亮绿
  caseLevel2: '#60a5fa',        // 亮蓝
  caseLevel3: '#fb923c',        // 亮橙
  caseLevel4: '#67e8f9',        // 亮青
  caseLevelSkill: '#c084fc',    // 亮紫
  caseLevelIssue: '#f87171',    // 亮红
  caseLevelTeam: '#818cf8',     // 亮靛蓝
  caseLevelUi: '#f472b6',       // 亮粉
  caseLevelMemory: '#fbbf24',   // 亮黄
  caseLevelSession: '#2dd4bf',  // 亮青绿
  caseLevelMultiCli: '#a78bfa', // 亮紫罗兰
};

// 浅色模式颜色 - 使用更深的颜色确保对比度，同时保持色盲友好
const LIGHT_COLORS: Colors = {
  bg: '#ffffff',
  bgGradient1: '#f8fafc',
  bgGradient2: '#f1f5f9',
  primary: '#4f46e5',
  primaryLight: '#6366f1',
  secondary: '#059669',
  secondaryLight: '#10b981',
  warning: '#b45309',
  warningLight: '#d97706',
  danger: '#b91c1c',
  dangerLight: '#dc2626',
  text: '#0f172a',
  textMuted: '#374151',
  textDim: '#6b7280',
  accent1: '#be185d',
  accent2: '#6d28d9',
  accent3: '#0e7490',
  accent4: '#4d7c0f',
  accent5: '#c2410c',
  cardBg: 'rgba(0,0,0,0.02)',
  cardBorder: 'rgba(0,0,0,0.1)',
  codeBg: 'rgba(0,0,0,0.05)',
  modalBg: '#ffffff',
  panelBg: '#f8fafc',
  secondary2: '#0d9488',
  secondary3: '#0f766e',
  // 分类颜色 - 浅色模式使用更深版本，色盲友好
  // 使用蓝、橙、绿、紫等易区分的颜色
  categoryMain: '#be185d',      // 深粉 - 主入口
  categoryWorkflow: '#4f46e5',  // 深靛蓝 - 工作流
  categorySession: '#6366f1',   // 靛蓝 - 会话
  categoryIssue: '#b45309',     // 深琥珀 - Issue
  categoryMemory: '#6d28d9',    // 深紫 - 记忆
  categoryBrainstorm: '#be185d',// 深粉 - 头脑风暴
  categoryTdd: '#059669',       // 深翠绿 - TDD
  categoryTest: '#4d7c0f',      // 深青柠 - 测试
  categoryReview: '#b91c1c',    // 深红 - 审查
  categoryUiDesign: '#0e7490',  // 深青 - UI设计
  categoryPrompt: '#c2410c',    // 深橙 - 预检
  categorySkill: '#4d7c0f',     // 深青柠 - 技能
  // CLI 颜色
  cliClaude: '#6d28d9',         // 深紫
  cliCodex: '#0e7490',          // 深青
  // Level 颜色
  level1: '#059669',            // 深翠绿 - 简单
  level2: '#4f46e5',            // 深靛蓝 - 中等
  level3: '#b45309',            // 深琥珀 - 复杂
  level4: '#be185d',            // 深粉 - 非常复杂
  // 案例级别颜色 - 浅色模式使用更深版本
  caseLevel1: '#16a34a',        // 深绿
  caseLevel2: '#2563eb',        // 深蓝
  caseLevel3: '#c2410c',        // 深橙
  caseLevel4: '#0e7490',        // 深青
  caseLevelSkill: '#7c3aed',    // 深紫
  caseLevelIssue: '#dc2626',    // 深红
  caseLevelTeam: '#4f46e5',     // 深靛蓝
  caseLevelUi: '#db2777',       // 深粉
  caseLevelMemory: '#b45309',   // 深黄/琥珀
  caseLevelSession: '#0d9488',  // 深青绿
  caseLevelMultiCli: '#7c3aed', // 深紫罗兰
};

const ColorsContext = createContext<Colors>(DARK_COLORS);

export function ColorsProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === 'light' ? LIGHT_COLORS : DARK_COLORS;
  return (
    <ColorsContext.Provider value={colors}>
      {children}
    </ColorsContext.Provider>
  );
}

export function useColors(): Colors {
  return useContext(ColorsContext);
}

// 向后兼容：导出静态暗色常量
export const COLORS = DARK_COLORS;
