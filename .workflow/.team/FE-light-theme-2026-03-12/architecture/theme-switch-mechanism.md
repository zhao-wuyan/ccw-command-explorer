# 主题切换机制设计

## 1. 架构概述

```
┌─────────────────────────────────────────────────────────────────┐
│                        App.tsx                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    ThemeProvider                             ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  ││
│  │  │ useTheme()  │  │ localStorage│  │ prefers-color-scheme│  ││
│  │  │   hook      │  │ persistence │  │    detection        │  ││
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              data-theme="light|dark" on <html>               ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    CSS Variables                             ││
│  │         [data-theme="light"] { --bg: #f8fafc; }              ││
│  │         [data-theme="dark"] { --bg: #0a0a0f; }               ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 2. 实现方案

### 2.1 ThemeContext

```tsx
// src/contexts/ThemeContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    return (stored as Theme) || 'system';
  });

  const resolvedTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    localStorage.setItem('theme', theme);
  }, [theme, resolvedTheme]);

  // 监听系统偏好变化
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      document.documentElement.setAttribute(
        'data-theme',
        mediaQuery.matches ? 'light' : 'dark'
      );
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
```

### 2.2 ThemeToggle 组件

```tsx
// src/components/ThemeToggle.tsx
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="theme-toggle">
      <button
        onClick={() => setTheme('light')}
        className={theme === 'light' ? 'active' : ''}
        title="浅色模式"
      >
        <Sun size={18} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={theme === 'dark' ? 'active' : ''}
        title="暗黑模式"
      >
        <Moon size={18} />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={theme === 'system' ? 'active' : ''}
        title="跟随系统"
      >
        <Monitor size={18} />
      </button>
    </div>
  );
}
```

### 2.3 简化版切换按钮（推荐）

对于本项目，推荐使用更简洁的单按钮切换：

```tsx
// src/components/ThemeToggle.tsx
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggle}
      className="theme-toggle-btn"
      title={resolvedTheme === 'dark' ? '切换到浅色模式' : '切换到暗黑模式'}
    >
      {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
```

## 3. CSS 变量扩展

### 3.1 index.css 修改

```css
/* 默认暗黑模式 (保持向后兼容) */
:root {
  --bg: #0a0a0f;
  --bg-gradient1: #1a1a2e;
  --bg-gradient2: #16213e;
  /* ... 其他暗黑模式变量保持不变 ... */
}

/* 浅色模式 */
[data-theme="light"] {
  --bg: #f8fafc;
  --bg-gradient1: #f1f5f9;
  --bg-gradient2: #e2e8f0;
  --primary: #4f46e5;
  --primary-light: #6366f1;
  --secondary: #059669;
  --secondary-light: #10b981;
  --warning: #d97706;
  --warning-light: #f59e0b;
  --danger: #dc2626;
  --danger-light: #ef4444;
  --text: #0f172a;
  --text-muted: #475569;
  --text-dim: #94a3b8;
  --card-bg: rgba(0,0,0,0.03);
  --card-border: rgba(0,0,0,0.08);
}

/* 平滑过渡 */
*, *::before, *::after {
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
}
```

## 4. 文件修改清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/index.css` | 修改 | 添加浅色模式变量 |
| `src/App.css` | 修改 | 添加主题切换按钮样式 |
| `src/contexts/ThemeContext.tsx` | 新建 | 主题状态管理 |
| `src/components/ThemeToggle.tsx` | 新建 | 切换按钮组件 |
| `src/App.tsx` | 修改 | 集成 ThemeProvider 和 ThemeToggle |
| `src/data/constants.ts` | 修改 | 支持主题感知的颜色常量 |

## 5. 测试要点

1. **功能测试**
   - 点击切换按钮，主题正确切换
   - 刷新页面，主题保持不变
   - 清除 localStorage，使用系统偏好

2. **对比度测试**
   - 浅色模式文字对比度 ≥ 4.5
   - 暗黑模式保持现有对比度

3. **过渡测试**
   - 主题切换时无闪烁
   - 过渡动画流畅
