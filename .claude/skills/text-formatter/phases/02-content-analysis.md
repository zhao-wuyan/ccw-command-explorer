# Phase 2: Content Analysis

分析输入内容的结构和语义元素。

## Objective

- 识别内容结构（标题、段落、列表等）
- 检测特殊元素（代码块、表格、链接等）
- 生成结构化分析结果

## Input

- 依赖: `input-config.json`
- 配置: `{workDir}/input-config.json`

## Execution Steps

### Step 1: 加载输入

```javascript
const config = JSON.parse(Read(`${workDir}/input-config.json`));
const content = config.original_content;
```

### Step 2: 结构分析

```javascript
function analyzeStructure(text) {
  const analysis = {
    elements: [],
    stats: {
      headings: 0,
      paragraphs: 0,
      lists: 0,
      code_blocks: 0,
      tables: 0,
      links: 0,
      images: 0,
      quotes: 0,
      callouts: 0
    }
  };

  // Callout 检测正则 (Obsidian 风格)
  const CALLOUT_PATTERN = /^>\s*\[!(\w+)\](?:\s+(.+))?$/;

  const lines = text.split('\n');
  let currentElement = null;
  let inCodeBlock = false;
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检测代码块
    if (line.match(/^```/)) {
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) {
        analysis.elements.push({
          type: 'code_block',
          start: i,
          language: line.replace(/^```/, '').trim()
        });
        analysis.stats.code_blocks++;
      }
      continue;
    }

    if (inCodeBlock) continue;

    // 检测标题 (Markdown 或纯文本模式)
    if (line.match(/^#{1,6}\s/)) {
      const level = line.match(/^(#+)/)[1].length;
      analysis.elements.push({
        type: 'heading',
        level: level,
        content: line.replace(/^#+\s*/, ''),
        line: i
      });
      analysis.stats.headings++;
      continue;
    }

    // 检测列表
    if (line.match(/^[\s]*[-*+]\s/) || line.match(/^[\s]*\d+\.\s/)) {
      if (!inList) {
        analysis.elements.push({
          type: 'list',
          start: i,
          ordered: line.match(/^\d+\./) !== null
        });
        analysis.stats.lists++;
        inList = true;
      }
      continue;
    } else {
      inList = false;
    }

    // 检测 Callout (Obsidian 风格) - 优先于普通引用
    const calloutMatch = line.match(CALLOUT_PATTERN);
    if (calloutMatch) {
      const calloutType = calloutMatch[1].toLowerCase();
      const calloutTitle = calloutMatch[2] || null;
      // 收集 Callout 内容行
      const calloutContent = [];
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith('>')) {
        calloutContent.push(lines[j].replace(/^>\s*/, ''));
        j++;
      }
      analysis.elements.push({
        type: 'callout',
        calloutType: calloutType,
        title: calloutTitle,
        content: calloutContent.join('\n'),
        start: i,
        end: j - 1
      });
      analysis.stats.callouts++;
      i = j - 1; // 跳过已处理的行
      continue;
    }

    // 检测普通引用
    if (line.match(/^>\s/)) {
      analysis.elements.push({
        type: 'quote',
        content: line.replace(/^>\s*/, ''),
        line: i
      });
      analysis.stats.quotes++;
      continue;
    }

    // 检测表格
    if (line.match(/^\|.*\|$/)) {
      analysis.elements.push({
        type: 'table_row',
        line: i
      });
      if (!analysis.elements.find(e => e.type === 'table')) {
        analysis.stats.tables++;
      }
      continue;
    }

    // 检测链接
    const links = line.match(/\[([^\]]+)\]\(([^)]+)\)/g);
    if (links) {
      analysis.stats.links += links.length;
    }

    // 检测图片
    const images = line.match(/!\[([^\]]*)\]\(([^)]+)\)/g);
    if (images) {
      analysis.stats.images += images.length;
    }

    // 普通段落
    if (line.trim() && !line.match(/^[-=]{3,}$/)) {
      analysis.elements.push({
        type: 'paragraph',
        line: i,
        preview: line.substring(0, 50)
      });
      analysis.stats.paragraphs++;
    }
  }

  return analysis;
}

const analysis = analyzeStructure(content);
```

### Step 3: 语义增强

```javascript
// 识别特殊语义
function enhanceSemantics(text, analysis) {
  const enhanced = { ...analysis };

  // 检测关键词强调
  const boldPatterns = text.match(/\*\*[^*]+\*\*/g) || [];
  const italicPatterns = text.match(/\*[^*]+\*/g) || [];

  enhanced.semantics = {
    emphasis: {
      bold: boldPatterns.length,
      italic: italicPatterns.length
    },
    estimated_reading_time: Math.ceil(text.split(/\s+/).length / 200) // 200 words/min
  };

  return enhanced;
}

const enhancedAnalysis = enhanceSemantics(content, analysis);
```

### Step 4: 保存分析结果

```javascript
Write(`${workDir}/analysis.json`, JSON.stringify(enhancedAnalysis, null, 2));
```

## Output

- **File**: `analysis.json`
- **Format**: JSON

```json
{
  "elements": [
    { "type": "heading", "level": 1, "content": "Title", "line": 0 },
    { "type": "paragraph", "line": 2, "preview": "..." },
    { "type": "callout", "calloutType": "warning", "title": "注意事项", "content": "...", "start": 4, "end": 6 },
    { "type": "code_block", "start": 8, "language": "javascript" }
  ],
  "stats": {
    "headings": 3,
    "paragraphs": 10,
    "lists": 2,
    "code_blocks": 1,
    "tables": 0,
    "links": 5,
    "images": 0,
    "quotes": 1,
    "callouts": 2
  },
  "semantics": {
    "emphasis": { "bold": 5, "italic": 3 },
    "estimated_reading_time": 2
  }
}
```

## Quality Checklist

- [ ] 所有结构元素已识别
- [ ] 统计信息准确
- [ ] 语义增强完成
- [ ] 分析文件已保存

## Next Phase

→ [Phase 3: Format Transform](03-format-transform.md)
