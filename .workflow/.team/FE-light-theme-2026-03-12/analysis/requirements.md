# 主题切换需求分析

## 1. 项目背景

CCW Command Explorer 是一个命令浏览器应用，当前仅支持暗黑模式。需要在保留现有暗黑模式的基础上，添加浅色模式支持。

## 2. 现有设计系统分析

### 2.1 CSS 变量系统 (`src/index.css`)

| 变量名 | 当前值（暗黑） | 用途 |
|--------|---------------|------|
| `--bg` | `#0a0a0f` | 主背景色 |
| `--bg-gradient1` | `#1a1a2e` | 渐变背景1 |
| `--bg-gradient2` | `#16213e` | 渐变背景2 |
| `--primary` | `#6366f1` | 主品牌色 |
| `--primary-light` | `#818cf8` | 主品牌色浅色 |
| `--secondary` | `#10b981` | 次要色 |
| `--text` | `#ffffff` | 主文字色 |
| `--text-muted` | `#94a3b8` | 次要文字色 |
| `--text-dim` | `#64748b` | 暗淡文字色 |
| `--card-bg` | `rgba(255,255,255,0.05)` | 卡片背景 |
| `--card-border` | `rgba(255,255,255,0.1)` | 卡片边框 |

### 2.2 JS 颜色常量 (`src/data/constants.ts`)

存在 `COLORS` 对象，与 CSS 变量值相同但独立维护。需要同步更新。

### 2.3 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 7
- **动画**: Framer Motion
- **图标**: Lucide React

## 3. 需求规格

### 3.1 功能需求

| ID | 需求 | 优先级 |
|----|------|--------|
| FR-1 | 添加浅色模式 CSS 变量 | P0 |
| FR-2 | 主题切换按钮（Sun/Moon 图标） | P0 |
| FR-3 | localStorage 持久化用户偏好 | P0 |
| FR-4 | 系统偏好检测（prefers-color-scheme） | P0 |
| FR-5 | 平滑过渡动画 | P1 |
| FR-6 | 同步更新 JS 颜色常量 | P1 |

### 3.2 非功能需求

| ID | 需求 | 标准 |
|----|------|------|
| NFR-1 | WCAG AA 对比度 | 文字对比度 ≥ 4.5 |
| NFR-2 | 性能 | 主题切换无闪烁 |
| NFR-3 | 兼容性 | 保留现有暗黑模式体验 |

### 3.3 约束条件

- ✅ 保留现有暗黑模式设计
- ✅ 保留品牌色（primary, secondary, accents）
- ✅ 支持系统偏好检测

## 4. 浅色模式配色方案

### 4.1 背景色

| 变量 | 暗黑模式 | 浅色模式 |
|------|----------|----------|
| `--bg` | `#0a0a0f` | `#f8fafc` |
| `--bg-gradient1` | `#1a1a2e` | `#f1f5f9` |
| `--bg-gradient2` | `#16213e` | `#e2e8f0` |

### 4.2 文字色

| 变量 | 暗黑模式 | 浅色模式 |
|------|----------|----------|
| `--text` | `#ffffff` | `#0f172a` |
| `--text-muted` | `#94a3b8` | `#475569` |
| `--text-dim` | `#64748b` | `#94a3b8` |

### 4.3 品牌色（保持不变）

| 变量 | 值 |
|------|-----|
| `--primary` | `#6366f1` |
| `--secondary` | `#10b981` |
| `--accent1-5` | 保持现有值 |

### 4.4 卡片和边框

| 变量 | 暗黑模式 | 浅色模式 |
|------|----------|----------|
| `--card-bg` | `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.03)` |
| `--card-border` | `rgba(255,255,255,0.1)` | `rgba(0,0,0,0.08)` |

## 5. 实现策略

### 5.1 CSS 变量切换

```css
/* 默认暗黑模式 */
:root {
  --bg: #0a0a0f;
  /* ... */
}

/* 浅色模式 */
[data-theme="light"] {
  --bg: #f8fafc;
  /* ... */
}
```

### 5.2 React 状态管理

```tsx
// ThemeContext 提供主题状态
const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

// 检测系统偏好
const systemTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

// 应用主题
document.documentElement.setAttribute('data-theme', resolvedTheme);
```

### 5.3 持久化

```tsx
// 初始化时读取
const savedTheme = localStorage.getItem('theme');

// 切换时保存
localStorage.setItem('theme', newTheme);
```

## 6. 验收标准

- [ ] 浅色模式下所有页面元素可见且对比度符合 WCAG AA
- [ ] 主题切换按钮正常工作，图标正确显示
- [ ] 刷新页面后主题保持不变
- [ ] 首次访问时自动检测系统偏好
- [ ] 现有暗黑模式功能不受影响
