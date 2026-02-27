# Format Conversion Rules

BBCode + Markdown 混合格式转换规则（论坛优化）。

## When to Use

| Phase | Usage | Section |
|-------|-------|---------|
| Phase 3 | 格式转换 | All sections |

---

## Core Principles

### 1. Pixel-Based Sizing

**重要**: 使用像素值而非 1-7 级别

| 元素 | Size (px) | 说明 |
|------|-----------|------|
| 主标题 (H1) | 150 | 文档标题 |
| 章节标题 (H2) | 120 | 主要章节 |
| 子标题 (H3) | 100 | 子章节 |
| 正文 | (默认) | 不指定 size |
| 备注/灰色 | 80 | 脚注、元数据 |

### 2. Supported Tags Only

**支持的 BBCode 标签**:
- `[size=N]` - 字号（像素值）
- `[color=X]` - 颜色（hex 或名称，如 `[color=blue]`、`[color=#2196F3]`）
- `[b]`, `[i]`, `[s]`, `[u]` - 粗体、斜体、删除线、下划线
- `[quote]` - 引用块
- `[code]` - 代码块
- `[url]`, `[img]` - 链接、图片
- `[list]`, `[*]` - 列表
- `[spoiler]` 或 `[spoiler=标题]` - 折叠/隐藏内容

**禁止使用的标签**:
- `[align]` - 不渲染，显示为文本
- `[hr]` - 不渲染，使用 Markdown `---`
- `[table]` - 支持有限，避免使用

**HTML 标签转换** (输入时支持，转换为 BBCode):
- `<mark>text</mark>` → `[color=yellow]text[/color]`
- `<details><summary>标题</summary>内容</details>` → `[spoiler=标题]内容[/spoiler]`
- 其他 HTML 标签 (`<div>`, `<span>`) - 删除

### 3. Markdown as Separator

分隔线使用 Markdown 语法：`---`

---

## Element Conversion Rules

### 标题转换

| Markdown | BBCode Output |
|----------|---------------|
| `# H1` | `[size=150][color=#2196F3][b]H1[/b][/color][/size]` |
| `## H2` | `[size=120][color=#2196F3][b]H2[/b][/color][/size]` |
| `### H3` | `[size=100][color=#333][b]H3[/b][/color][/size]` |
| `#### H4+` | `[b]H4[/b]` (不加 size) |

### 文本样式

| Markdown/HTML | BBCode |
|---------------|--------|
| `**bold**` 或 `__bold__` | `[b]bold[/b]` |
| `*italic*` 或 `_italic_` | `[i]italic[/i]` |
| `***both***` | `[b][i]both[/i][/b]` |
| `~~strike~~` | `[s]strike[/s]` |
| `==highlight==` 或 `<mark>text</mark>` | `[color=yellow]highlight[/color]` |
| (无 MD 语法) | `[u]underline[/u]` |

### 折叠内容

| HTML | BBCode |
|------|--------|
| `<details><summary>标题</summary>内容</details>` | `[spoiler=标题]内容[/spoiler]` |
| (无 HTML) | `[spoiler]隐藏内容[/spoiler]` |

### 代码

| Markdown | BBCode |
|----------|--------|
| `` `inline` `` | 保持原样或 `[color=#9C27B0]inline[/color]` |
| ` ```code``` ` | `[code]code[/code]` |

### 链接和图片

| Markdown | BBCode |
|----------|--------|
| `[text](url)` | `[url=url]text[/url]` |
| `![alt](url)` | `[img]url[/img]` |

### 列表

```
Markdown:
- item 1
- item 2
  - nested

BBCode:
• item 1
• item 2
  • nested
```

注意：使用 `•` 符号而非 `[list][*]`，因为部分论坛渲染有问题。

### 引用

```
Markdown:
> quote text

BBCode:
[quote]
quote text
[/quote]
```

---

## Callout (标注) 转换

### Obsidian Callout 语法

```markdown
> [!TYPE] 可选标题
> 内容行 1
> 内容行 2
```

### 支持的 Callout 类型

| Type | Color | Icon | 中文标签 |
|------|-------|------|----------|
| note, info | #2196F3 | 📝 | 注意 / 信息 |
| tip, hint | #4CAF50 | 💡 | 提示 |
| success, check, done | #4CAF50 | ✅ | 成功 |
| warning, caution, attention | #FF9800 | ⚠️ | 警告 |
| danger, error, bug | #F44336 | ❌ | 危险 / 错误 |
| example | #9C27B0 | 📋 | 示例 |
| question, help, faq | #FF9800 | ❓ | 问题 |
| quote, cite | gray | 💬 | 引用 |
| abstract, summary, tldr | #2196F3 | 📄 | 摘要 |

### Callout 转换模板

```bbcode
[quote]
[size=100][color={color}][b]{icon} {title}[/b][/color][/size]

{content}
[/quote]
```

**示例**:

```markdown
> [!WARNING] 注意事项
> 这是警告内容
```

转换为：

```bbcode
[quote]
[size=100][color=#FF9800][b]⚠️ 注意事项[/b][/color][/size]

这是警告内容
[/quote]
```

### 可折叠 Callout

Obsidian 支持 `> [!NOTE]+` (展开) 和 `> [!NOTE]-` (折叠)。

由于 BBCode 不支持折叠，统一转换为普通 quote。

---

## Color Palette

### 语义颜色

| 语义 | Hex | 使用场景 |
|------|-----|----------|
| Primary | #2196F3 | 标题、链接、信息 |
| Success | #4CAF50 | 成功、提示、特性 |
| Warning | #FF9800 | 警告、注意 |
| Error | #F44336 | 错误、危险 |
| Purple | #9C27B0 | 示例、代码 |
| Gray | gray | 备注、元数据 |
| Dark | #333 | 子标题 |

### 颜色使用规则

1. **标题颜色**: H1/H2 使用 #2196F3，H3 使用 #333
2. **Callout 颜色**: 根据类型使用语义颜色
3. **备注颜色**: 使用 gray
4. **强调颜色**: 根据语义选择（成功用绿色，警告用橙色）

---

## Spacing Rules

### 空行控制

| 元素 | 前空行 | 后空行 |
|------|--------|--------|
| 标题 | 1 | 1 |
| 段落 | 0 | 1 |
| 列表 | 0 | 1 |
| 代码块 | 1 | 1 |
| Callout | 1 | 1 |
| 分隔线 `---` | 1 | 1 |

### 示例输出结构

```bbcode
[size=150][color=#2196F3][b]文档标题[/b][/color][/size]

[size=80][color=gray]作者 | 日期[/color][/size]

---

[size=120][color=#2196F3][b]第一章节[/b][/color][/size]

正文内容...

[quote]
[size=100][color=#4CAF50][b]💡 提示[/b][/color][/size]

提示内容
[/quote]

---

[size=120][color=#2196F3][b]第二章节[/b][/color][/size]

更多内容...

---

[size=80][color=gray]— 全文完 —[/color][/size]
```

---

## Quality Checklist

### 转换完整性

- [ ] 所有标题使用像素值 size
- [ ] 未使用 `[align]` 或 `[hr]`
- [ ] 分隔线使用 `---`
- [ ] Callout 正确转换为 quote
- [ ] 颜色符合语义规范
- [ ] 空行控制正确

### 常见错误

| 错误 | 正确做法 |
|------|----------|
| `[size=5]` | `[size=120]` |
| `[align=center]` | 删除，默认左对齐 |
| `[hr]` | 使用 `---` |
| `<div class="...">` | 删除 HTML 标签 |
