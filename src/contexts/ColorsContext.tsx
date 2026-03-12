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
}

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
  modalBg: '#1a1a2e', // 暗色弹窗背景
  panelBg: '#252542', // 暗色面板背景
  // 添加缺失的属性
  secondary2: '#14b8a6',
  secondary3: '#0d9488',
};

const LIGHT_COLORS: Colors = {
  bg: '#ffffff',
  bgGradient1: '#f8fafc',
  bgGradient2: '#f1f5f9',
  primary: '#4f46e5',
  primaryLight: '#6366f1',
  secondary: '#059669',
  secondaryLight: '#10b981',
  warning: '#d97706',
  warningLight: '#f59e0b',
  danger: '#dc2626',
  dangerLight: '#ef4444',
  text: '#0f172a',
  textMuted: '#374151',
  textDim: '#6b7280',
  accent1: '#db2777',
  accent2: '#7c3aed',
  accent3: '#0891b2',
  accent4: '#65a30d',
  accent5: '#ea580c',
  cardBg: 'rgba(0,0,0,0.02)',
  cardBorder: 'rgba(0,0,0,0.1)',
  codeBg: 'rgba(0,0,0,0.05)',
  modalBg: '#ffffff', // 浅色弹窗背景（纯白）
  panelBg: '#f8fafc', // 浅色面板背景（浅灰）
  // 添加缺失的属性
  secondary2: '#14b8a6',
  secondary3: '#0d9488',
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
