# Understanding Document

**Session ID**: DBG-hamburger-menu-2025-03-12  
**Bug Description**: 移动端汉堡菜单点击后无法展开三个下拉框  
**Started**: 2026-03-12T23:39:13+08:00

---

## Exploration Timeline

### Iteration 1 - Initial Exploration (2026-03-12T23:39:13+08:00)

#### Current Understanding

- 现象：移动端点击“筛选”汉堡按钮后，包含 3 个 `<select>` 的筛选下拉面板未能展开显示（或被裁剪导致看起来未展开）。
- 相关状态：`showFilterDropdown`（`src/App.tsx`）控制 `.filter-dropdown` 是否渲染。
- 初步判断：下拉面板已渲染，但被父容器的 `overflow: hidden` 裁剪；移动端的 `overflow: visible` 覆盖规则由于 CSS 源码顺序被后面的全局规则覆盖，导致实际仍然是 `hidden`。

#### Evidence from Code Search

- `src/App.tsx`：`filter-toggle-btn` 点击切换 `showFilterDropdown`；当为 `true` 时渲染 `.filter-dropdown`，内部包含 3 个筛选 `<select>`（分类、等级、CLI）。
- `src/App.css`：
  - 移动端 `@media (max-width: 768px)` 内曾设置 `.floating-nav-card { overflow: visible; }`（意图允许下拉面板溢出显示）。
  - 但文件后部存在 `.floating-nav-card { overflow: hidden; }` 的全局样式，出现在该移动端 media query 之后；在相同选择器/相同特异性下，后出现的规则会覆盖前者，因此移动端实际仍被裁剪。

#### Next Steps

- 用更靠后的移动端规则显式覆盖 `.floating-nav-card` 的 `overflow`，确保下拉面板可见。
- 通过本地构建/测试验证无回归。

### Iteration 2 - Root Cause Confirmed & Fix Applied (2026-03-12T23:44:00+08:00)

#### Root Cause Identified

- `.filter-dropdown` 使用 `position: absolute; top: 100%` 从 `.floating-nav-card` 下方“溢出”展示。
- `src/App.css` 中全局 `.floating-nav-card { overflow: hidden; }` 出现在移动端 media query 之后，覆盖了移动端原本设置的 `overflow: visible`，导致下拉面板被裁剪，表现为“点击后无法展开”。

#### Fix Applied

- 在 `src/App.css` 中全局 `.floating-nav-card` 样式之后追加移动端 `@media (max-width: 768px)` 覆盖规则，确保最终级联结果为 `overflow: visible`（并同步恢复移动端预期的 `margin/top/border-radius`）。

---

## Current Consolidated Understanding

### What We Know
- `.filter-dropdown` 的渲染受 `showFilterDropdown` 控制，逻辑上点击应能展开。
- `.filter-dropdown` 使用 `position: absolute; top: 100%`，需要父级允许溢出才能显示在卡片外侧。
- `.floating-nav-card` 的 `overflow: hidden` 会裁剪下拉面板；当前 CSS 级联顺序使移动端的“可溢出”意图不生效。

### Current Investigation Focus
- 已通过更靠后的移动端覆盖规则确保 `.floating-nav-card` 允许溢出显示。
