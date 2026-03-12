# ThemeToggle 组件规格

## 组件结构

```tsx
interface ThemeToggleProps {
  variant?: 'simple' | 'full';  // simple: 单按钮, full: 三按钮
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

## 视觉规格

### Simple 变体（推荐）

```
┌─────────────────┐
│   ☀️ / 🌙       │  ← 圆形按钮，悬停时高亮
└─────────────────┘
```

### Full 变体

```
┌───────────────────────────────┐
│  ☀️  │  🌙  │  🖥️            │  ← 三个按钮，当前选中高亮
└───────────────────────────────┘
```

## 样式规格

```css
.theme-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-toggle-btn:hover {
  background: var(--primary)20;
  border-color: var(--primary);
  color: var(--primary-light);
}
```

## 位置

放置于 Header 右上角，GitHub 按钮左侧。

## 无障碍

- `aria-label`: "切换主题"
- `title`: "切换到浅色模式" / "切换到暗黑模式"
- 支持键盘操作 (Enter/Space)
