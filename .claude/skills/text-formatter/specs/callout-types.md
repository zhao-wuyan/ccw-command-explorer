# Callout Types

Obsidian 风格的 Callout/Admonition 类型定义和转换规则。

## When to Use

| Phase | Usage | Section |
|-------|-------|---------|
| Phase 2 | 检测 Callout | Detection patterns |
| Phase 3 | 格式转换 | Conversion rules |

---

## Callout 语法

### Obsidian 原生语法

```markdown
> [!TYPE] 可选标题
> 内容行1
> 内容行2
```

### 支持的类型

| Type | Alias | Icon | Color | 用途 |
|------|-------|------|-------|------|
| `note` | - | 📝 | blue | 普通提示 |
| `info` | - | ℹ️ | blue | 信息说明 |
| `tip` | `hint` | 💡 | green | 技巧提示 |
| `success` | `check`, `done` | ✅ | green | 成功状态 |
| `warning` | `caution`, `attention` | ⚠️ | orange | 警告信息 |
| `danger` | `error` | ❌ | red | 危险/错误 |
| `bug` | - | 🐛 | red | Bug 说明 |
| `example` | - | 📋 | purple | 示例内容 |
| `quote` | `cite` | 💬 | gray | 引用内容 |
| `abstract` | `summary`, `tldr` | 📄 | cyan | 摘要 |
| `question` | `help`, `faq` | ❓ | yellow | 问题/FAQ |
| `todo` | - | 📌 | orange | 待办事项 |

---

## 检测 Pattern

```javascript
// Callout 检测正则
const CALLOUT_PATTERN = /^>\s*\[!(\w+)\](?:\s+(.+))?$/;

// 检测函数
function detectCallout(line) {
  const match = line.match(CALLOUT_PATTERN);
  if (match) {
    return {
      type: match[1].toLowerCase(),
      title: match[2] || null
    };
  }
  return null;
}

// 解析完整 Callout 块
function parseCalloutBlock(lines, startIndex) {
  const firstLine = lines[startIndex];
  const calloutInfo = detectCallout(firstLine);

  if (!calloutInfo) return null;

  const content = [];
  let i = startIndex + 1;

  while (i < lines.length && lines[i].startsWith('>')) {
    content.push(lines[i].replace(/^>\s*/, ''));
    i++;
  }

  return {
    ...calloutInfo,
    content: content.join('\n'),
    endIndex: i - 1
  };
}
```

---

## 转换规则

### BBCode 转换

```javascript
const CALLOUT_BBCODE = {
  note: {
    icon: '📝',
    color: '#2196F3',
    label: '注意'
  },
  info: {
    icon: 'ℹ️',
    color: '#2196F3',
    label: '信息'
  },
  tip: {
    icon: '💡',
    color: '#4CAF50',
    label: '提示'
  },
  success: {
    icon: '✅',
    color: '#4CAF50',
    label: '成功'
  },
  warning: {
    icon: '⚠️',
    color: '#FF9800',
    label: '警告'
  },
  danger: {
    icon: '❌',
    color: '#F44336',
    label: '危险'
  },
  bug: {
    icon: '🐛',
    color: '#F44336',
    label: 'Bug'
  },
  example: {
    icon: '📋',
    color: '#9C27B0',
    label: '示例'
  },
  quote: {
    icon: '💬',
    color: '#9E9E9E',
    label: '引用'
  },
  question: {
    icon: '❓',
    color: '#FFEB3B',
    label: '问题'
  }
};

function calloutToBBCode(type, title, content, style = 'forum') {
  const config = CALLOUT_BBCODE[type] || CALLOUT_BBCODE.note;
  const displayTitle = title || config.label;

  if (style === 'compact') {
    return `[quote][b]${config.icon} ${displayTitle}[/b]
${content}[/quote]`;
  }

  // Forum style - more visual
  return `[quote]
[color=${config.color}][size=4][b]${config.icon} ${displayTitle}[/b][/size][/color]

${content}
[/quote]`;
}
```

### HTML 转换

```javascript
function calloutToHTML(type, title, content) {
  const config = CALLOUT_BBCODE[type] || CALLOUT_BBCODE.note;
  const displayTitle = title || config.label;

  return `<div class="callout callout-${type}">
  <div class="callout-title">
    <span class="callout-icon">${config.icon}</span>
    <span class="callout-title-text">${displayTitle}</span>
  </div>
  <div class="callout-content">
    ${content}
  </div>
</div>`;
}
```

### Hybrid 转换

```javascript
function calloutToHybrid(type, title, content) {
  const config = CALLOUT_BBCODE[type] || CALLOUT_BBCODE.note;
  const displayTitle = title || config.label;

  // HTML container + BBCode styling + MD content
  return `<div class="callout ${type}">

[color=${config.color}][b]${config.icon} ${displayTitle}[/b][/color]

${content}

</div>`;
}
```

---

## Callout CSS 样式

```css
/* Base callout styles */
.callout {
  padding: 1rem;
  margin: 1rem 0;
  border-left: 4px solid;
  border-radius: 4px;
  background: #f8f9fa;
}

.callout-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.callout-icon {
  font-size: 1.2em;
}

/* Type-specific colors */
.callout-note, .callout-info {
  border-color: #2196F3;
  background: #E3F2FD;
}

.callout-tip, .callout-success {
  border-color: #4CAF50;
  background: #E8F5E9;
}

.callout-warning {
  border-color: #FF9800;
  background: #FFF3E0;
}

.callout-danger, .callout-bug {
  border-color: #F44336;
  background: #FFEBEE;
}

.callout-example {
  border-color: #9C27B0;
  background: #F3E5F5;
}

.callout-quote {
  border-color: #9E9E9E;
  background: #FAFAFA;
}

.callout-question {
  border-color: #FFC107;
  background: #FFFDE7;
}
```

---

## 折叠 Callout

支持可折叠的 Callout 语法：

```markdown
> [!NOTE]+ 默认展开
> 内容

> [!NOTE]- 默认折叠
> 内容
```

### BBCode 折叠

```bbcode
[collapse=📝 注意]
内容
[/collapse]
```

### HTML 折叠

```html
<details class="callout callout-note">
  <summary>📝 注意</summary>
  <div class="callout-content">
    内容
  </div>
</details>
```
