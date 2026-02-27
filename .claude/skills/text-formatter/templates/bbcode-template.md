# BBCode Template

论坛优化的 BBCode + Markdown 混合模板（像素级字号）。

## 核心规则

### 字号体系 (Pixels)

| 元素 | Size | 说明 |
|------|------|------|
| 主标题 | 150 | 文档标题 |
| 章节标题 | 120 | H2 级别 |
| 子标题 | 100 | H3 级别 |
| 正文 | (默认) | 不指定 |
| 备注 | 80 | 灰色小字 |

### 禁止使用

- `[align]` - 不渲染
- `[hr]` - 不渲染，用 `---`
- `[table]` - 支持有限
- HTML 标签

---

## 文档模板

### 基础文档结构

```bbcode
[size=150][color=#2196F3][b]{{title}}[/b][/color][/size]

[size=80][color=gray]{{metadata}}[/color][/size]

---

{{introduction}}

---

[size=120][color=#2196F3][b]{{section1_title}}[/b][/color][/size]

{{section1_content}}

---

[size=120][color=#2196F3][b]{{section2_title}}[/b][/color][/size]

{{section2_content}}

---

[size=80][color=gray]— 全文完 —[/color][/size]
```

### 带目录的文档

```bbcode
[size=150][color=#2196F3][b]{{title}}[/b][/color][/size]

[size=80][color=gray]{{author}} | {{date}}[/color][/size]

---

[size=100][b]📋 目录[/b][/size]

• {{section1_title}}
• {{section2_title}}
• {{section3_title}}

---

[size=120][color=#2196F3][b]{{section1_title}}[/b][/color][/size]

{{section1_content}}

---

[size=120][color=#2196F3][b]{{section2_title}}[/b][/color][/size]

{{section2_content}}

---

[size=120][color=#2196F3][b]{{section3_title}}[/b][/color][/size]

{{section3_content}}

---

[size=80][color=gray]— 全文完 —[/color][/size]
```

---

## Callout 模板

### 提示 (Note/Info)

```bbcode
[quote]
[size=100][color=#2196F3][b]📝 {{title}}[/b][/color][/size]

{{content}}
[/quote]
```

### 技巧 (Tip/Hint)

```bbcode
[quote]
[size=100][color=#4CAF50][b]💡 {{title}}[/b][/color][/size]

{{content}}
[/quote]
```

### 成功 (Success)

```bbcode
[quote]
[size=100][color=#4CAF50][b]✅ {{title}}[/b][/color][/size]

{{content}}
[/quote]
```

### 警告 (Warning/Caution)

```bbcode
[quote]
[size=100][color=#FF9800][b]⚠️ {{title}}[/b][/color][/size]

{{content}}
[/quote]
```

### 危险/错误 (Danger/Error)

```bbcode
[quote]
[size=100][color=#F44336][b]❌ {{title}}[/b][/color][/size]

{{content}}
[/quote]
```

### 示例 (Example)

```bbcode
[quote]
[size=100][color=#9C27B0][b]📋 {{title}}[/b][/color][/size]

{{content}}
[/quote]
```

### 问题 (Question/FAQ)

```bbcode
[quote]
[size=100][color=#FF9800][b]❓ {{title}}[/b][/color][/size]

{{content}}
[/quote]
```

### 重要 (Important)

```bbcode
[quote]
[size=100][color=#F44336][b]⭐ {{title}}[/b][/color][/size]

{{content}}
[/quote]
```

---

## 代码展示模板

### 单代码块

```bbcode
[size=100][color=#9C27B0][b]代码示例[/b][/color][/size]

[code]
{{code}}
[/code]

[size=80][color=gray]说明: {{description}}[/color][/size]
```

### 带标题的代码

```bbcode
[size=100][b]{{code_title}}[/b][/size]

[code]
{{code}}
[/code]
```

---

## 特性展示模板

### 特性列表

```bbcode
[size=120][color=#2196F3][b]功能特性[/b][/color][/size]

• [color=#4CAF50][b]✨ {{feature1}}[/b][/color] — {{desc1}}
• [color=#2196F3][b]🚀 {{feature2}}[/b][/color] — {{desc2}}
• [color=#FF9800][b]⚡ {{feature3}}[/b][/color] — {{desc3}}
```

### 详细特性卡片

```bbcode
[size=120][color=#2196F3][b]功能特性[/b][/color][/size]

[quote]
[size=100][color=#4CAF50][b]✨ {{feature1_title}}[/b][/color][/size]

{{feature1_description}}

[size=80][color=gray]适用场景: {{feature1_use_case}}[/color][/size]
[/quote]

[quote]
[size=100][color=#2196F3][b]🚀 {{feature2_title}}[/b][/color][/size]

{{feature2_description}}

[size=80][color=gray]适用场景: {{feature2_use_case}}[/color][/size]
[/quote]
```

---

## 步骤指南模板

```bbcode
[size=120][color=#2196F3][b]操作步骤[/b][/color][/size]

[size=100][color=#2196F3][b]步骤 1: {{step1_title}}[/b][/color][/size]

{{step1_content}}

[quote]
[size=100][color=#FF9800][b]💡 提示[/b][/color][/size]

{{step1_tip}}
[/quote]

[size=100][color=#2196F3][b]步骤 2: {{step2_title}}[/b][/color][/size]

{{step2_content}}

[size=100][color=#2196F3][b]步骤 3: {{step3_title}}[/b][/color][/size]

{{step3_content}}

---

[color=#4CAF50][b]✅ 完成！[/b][/color] {{completion_message}}
```

---

## 版本更新模板

```bbcode
[size=150][color=#673AB7][b]🎉 版本 {{version}} 更新日志[/b][/color][/size]

---

[size=120][color=#4CAF50][b]✨ 新功能[/b][/color][/size]

• [b]{{new_feature1}}[/b]: {{new_feature1_desc}}
• [b]{{new_feature2}}[/b]: {{new_feature2_desc}}

[size=120][color=#2196F3][b]🔧 改进[/b][/color][/size]

• {{improvement1}}
• {{improvement2}}

[size=120][color=#F44336][b]🐛 修复[/b][/color][/size]

• {{bugfix1}}
• {{bugfix2}}

---

[url={{download_url}}][b]📥 立即下载[/b][/url]
```

---

## FAQ 模板

```bbcode
[size=120][color=#2196F3][b]❓ 常见问题[/b][/color][/size]

---

[size=100][color=#333][b]Q: {{question1}}[/b][/color][/size]

[b]A:[/b] {{answer1}}

---

[size=100][color=#333][b]Q: {{question2}}[/b][/color][/size]

[b]A:[/b] {{answer2}}

---

[size=100][color=#333][b]Q: {{question3}}[/b][/color][/size]

[b]A:[/b] {{answer3}}
```

---

## 转换检查清单

### 必须检查

- [ ] 标题使用像素值 (150/120/100)
- [ ] 分隔线使用 `---`
- [ ] 未使用 `[align]`
- [ ] 未使用 `[hr]`
- [ ] 未使用 HTML 标签
- [ ] Callout 标题 size=100
- [ ] 灰色备注 size=80

### 颜色规范

| 用途 | 颜色 |
|------|------|
| 主标题 | #2196F3 |
| 章节标题 | #2196F3 |
| 子标题 | #333 |
| 成功/提示 | #4CAF50 |
| 警告 | #FF9800 |
| 错误/危险 | #F44336 |
| 示例 | #9C27B0 |
| 备注 | gray |
