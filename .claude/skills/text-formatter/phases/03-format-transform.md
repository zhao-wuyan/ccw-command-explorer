# Phase 3: Format Transform

将内容转换为 BBCode + Markdown 混合格式（论坛优化）。

## Objective

- 根据分析结果转换内容
- 应用像素级字号规则
- 处理 Callout/标注语法
- 生成论坛兼容的输出

## Input

- 依赖: `input-config.json`, `analysis.json`
- 规范: `specs/format-rules.md`, `specs/element-mapping.md`

## Format Specification

### Size Hierarchy (Pixels)

| Element | Size | Color | Usage |
|---------|------|-------|-------|
| **H1** | 150 | #2196F3 | 文档主标题 |
| **H2** | 120 | #2196F3 | 章节标题 |
| **H3** | 100 | #333 | 子标题 |
| **H4+** | (默认) | - | 仅加粗 |
| **Notes** | 80 | gray | 备注/元数据 |

### Unsupported Tags (禁止使用)

| Tag | Reason | Alternative |
|-----|--------|-------------|
| `[align]` | 不渲染 | 删除，使用默认左对齐 |
| `[hr]` | 显示为文本 | 使用 Markdown `---` |
| `[table]` | 支持有限 | 转为列表或代码块 |
| HTML tags | 不支持 | 仅使用 BBCode |

## Execution Steps

### Step 1: 加载配置和分析

```javascript
const config = JSON.parse(Read(`${workDir}/input-config.json`));
const analysis = JSON.parse(Read(`${workDir}/analysis.json`));
const content = config.original_content;
```

### Step 2: Callout 配置

```javascript
// Callout 类型映射（像素级字号）
const CALLOUT_CONFIG = {
  // 信息类
  note: { icon: '📝', color: '#2196F3', label: '注意' },
  info: { icon: 'ℹ️', color: '#2196F3', label: '信息' },
  abstract: { icon: '📄', color: '#2196F3', label: '摘要' },
  summary: { icon: '📄', color: '#2196F3', label: '摘要' },
  tldr: { icon: '📄', color: '#2196F3', label: '摘要' },

  // 成功/提示类
  tip: { icon: '💡', color: '#4CAF50', label: '提示' },
  hint: { icon: '💡', color: '#4CAF50', label: '提示' },
  success: { icon: '✅', color: '#4CAF50', label: '成功' },
  check: { icon: '✅', color: '#4CAF50', label: '完成' },
  done: { icon: '✅', color: '#4CAF50', label: '完成' },

  // 警告类
  warning: { icon: '⚠️', color: '#FF9800', label: '警告' },
  caution: { icon: '⚠️', color: '#FF9800', label: '注意' },
  attention: { icon: '⚠️', color: '#FF9800', label: '注意' },
  question: { icon: '❓', color: '#FF9800', label: '问题' },
  help: { icon: '❓', color: '#FF9800', label: '帮助' },
  faq: { icon: '❓', color: '#FF9800', label: 'FAQ' },
  todo: { icon: '📋', color: '#FF9800', label: '待办' },

  // 错误/危险类
  danger: { icon: '❌', color: '#F44336', label: '危险' },
  error: { icon: '❌', color: '#F44336', label: '错误' },
  bug: { icon: '🐛', color: '#F44336', label: 'Bug' },
  important: { icon: '⭐', color: '#F44336', label: '重要' },

  // 其他
  example: { icon: '📋', color: '#9C27B0', label: '示例' },
  quote: { icon: '💬', color: 'gray', label: '引用' },
  cite: { icon: '💬', color: 'gray', label: '引用' }
};

// Callout 检测正则 (支持 +/- 折叠标记)
const CALLOUT_PATTERN = /^>\s*\[!(\w+)\][+-]?(?:\s+(.+))?$/;
```

### Step 3: Callout 解析器

```javascript
function parseCallouts(text) {
  const lines = text.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const match = lines[i].match(CALLOUT_PATTERN);
    if (match) {
      const type = match[1].toLowerCase();
      const title = match[2] || null;
      const content = [];
      i++;

      // 收集 Callout 内容行
      while (i < lines.length && lines[i].startsWith('>')) {
        content.push(lines[i].replace(/^>\s*/, ''));
        i++;
      }

      result.push({
        isCallout: true,
        type,
        title,
        content: content.join('\n')
      });
    } else {
      result.push({ isCallout: false, line: lines[i] });
      i++;
    }
  }

  return result;
}
```

### Step 4: BBCode+MD 转换器

```javascript
function formatBBCodeMD(text) {
  let result = text;

  // ===== 标题转换 (像素级字号) =====
  result = result.replace(/^######\s*(.+)$/gm, '[b]$1[/b]');
  result = result.replace(/^#####\s*(.+)$/gm, '[b]$1[/b]');
  result = result.replace(/^####\s*(.+)$/gm, '[b]$1[/b]');
  result = result.replace(/^###\s*(.+)$/gm, '[size=100][color=#333][b]$1[/b][/color][/size]');
  result = result.replace(/^##\s*(.+)$/gm, '[size=120][color=#2196F3][b]$1[/b][/color][/size]');
  result = result.replace(/^#\s*(.+)$/gm, '[size=150][color=#2196F3][b]$1[/b][/color][/size]');

  // ===== 文本样式 =====
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '[b][i]$1[/i][/b]');
  result = result.replace(/\*\*(.+?)\*\*/g, '[b]$1[/b]');
  result = result.replace(/__(.+?)__/g, '[b]$1[/b]');
  result = result.replace(/\*(.+?)\*/g, '[i]$1[/i]');
  result = result.replace(/_(.+?)_/g, '[i]$1[/i]');
  result = result.replace(/~~(.+?)~~/g, '[s]$1[/s]');
  result = result.replace(/==(.+?)==/g, '[color=yellow]$1[/color]');

  // ===== HTML 转 BBCode =====
  result = result.replace(/<mark>(.+?)<\/mark>/g, '[color=yellow]$1[/color]');
  result = result.replace(/<u>(.+?)<\/u>/g, '[u]$1[/u]');
  result = result.replace(/<details>\s*<summary>(.+?)<\/summary>\s*([\s\S]*?)<\/details>/g,
    '[spoiler=$1]$2[/spoiler]');

  // ===== 代码 =====
  result = result.replace(/```(\w*)\n([\s\S]*?)```/g, '[code]$2[/code]');
  // 行内代码保持原样 (部分论坛不支持 font=monospace)

  // ===== 链接和图片 =====
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[url=$2]$1[/url]');
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[img]$2[/img]');

  // ===== 引用 (非 Callout) =====
  result = result.replace(/^>\s+(.+)$/gm, '[quote]$1[/quote]');

  // ===== 列表 (使用 • 符号) =====
  result = result.replace(/^[-*+]\s+(.+)$/gm, '• $1');

  // ===== 分隔线 (保持 Markdown 语法) =====
  // `---` 在混合格式中通常可用，不转换为 [hr]

  return result.trim();
}
```

### Step 5: Callout 转换

```javascript
function convertCallouts(text) {
  const parsed = parseCallouts(text);

  return parsed.map(item => {
    if (item.isCallout) {
      const cfg = CALLOUT_CONFIG[item.type] || CALLOUT_CONFIG.note;
      const displayTitle = item.title || cfg.label;

      // 使用 [quote] 包裹，标题使用 size=100
      return `[quote]
[size=100][color=${cfg.color}][b]${cfg.icon} ${displayTitle}[/b][/color][/size]

${item.content}
[/quote]`;
    }
    return item.line;
  }).join('\n');
}
```

### Step 6: 执行转换

```javascript
// 1. 先处理 Callouts
let formattedContent = convertCallouts(content);

// 2. 再进行通用 BBCode+MD 转换
formattedContent = formatBBCodeMD(formattedContent);

// 3. 清理多余空行
formattedContent = formattedContent.replace(/\n{3,}/g, '\n\n');
```

### Step 7: 保存转换结果

```javascript
const outputFile = 'output.bbcode.txt';
Write(`${workDir}/${outputFile}`, formattedContent);

// 更新配置
config.output_file = outputFile;
config.formatted_content = formattedContent;
Write(`${workDir}/input-config.json`, JSON.stringify(config, null, 2));
```

## Output

- **File**: `output.bbcode.txt`
- **Format**: BBCode + Markdown 混合格式

## Quality Checklist

- [ ] 标题使用像素值 (150/120/100)
- [ ] 未使用 `[align]` 标签
- [ ] 未使用 `[hr]` 标签
- [ ] 分隔线使用 `---`
- [ ] Callout 正确转换为 [quote]
- [ ] 颜色值使用 hex 格式
- [ ] 内容完整无丢失

## Next Phase

→ [Phase 4: Output & Preview](04-output-preview.md)
