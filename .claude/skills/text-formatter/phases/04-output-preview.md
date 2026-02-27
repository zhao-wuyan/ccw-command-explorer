# Phase 4: Output & Preview

输出最终结果并提供预览。

## Objective

- 保存格式化后的内容到文件
- 提供预览功能
- 显示转换统计信息

## Input

- 依赖: `input-config.json`, `output.*`
- 配置: `{workDir}/input-config.json`

## Execution Steps

### Step 1: 加载结果

```javascript
const config = JSON.parse(Read(`${workDir}/input-config.json`));
const analysis = JSON.parse(Read(`${workDir}/analysis.json`));
const outputFile = `${workDir}/${config.output_file}`;
const formattedContent = Read(outputFile);
```

### Step 2: 生成统计摘要

```javascript
const summary = {
  input: {
    method: config.input_method,
    original_length: config.original_content.length,
    word_count: config.original_content.split(/\s+/).length
  },
  output: {
    format: config.target_format,
    file: outputFile,
    length: formattedContent.length
  },
  elements: analysis.stats,
  reading_time: analysis.semantics?.estimated_reading_time || 1
};

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                     Text Formatter Summary                      ║
╠════════════════════════════════════════════════════════════════╣
║  Input:  ${summary.input.word_count} words (${summary.input.original_length} chars)
║  Output: ${summary.output.format} → ${summary.output.file}
║  Elements Converted:
║    • Headings: ${summary.elements.headings}
║    • Paragraphs: ${summary.elements.paragraphs}
║    • Lists: ${summary.elements.lists}
║    • Code Blocks: ${summary.elements.code_blocks}
║    • Links: ${summary.elements.links}
║  Estimated Reading Time: ${summary.reading_time} min
╚════════════════════════════════════════════════════════════════╝
`);
```

### Step 3: HTML 预览（如适用）

```javascript
if (config.target_format === 'HTML') {
  // 生成完整 HTML 文件用于预览
  const previewHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Text Formatter Preview</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    .content {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1, h2, h3, h4, h5, h6 { color: #333; margin-top: 1.5em; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
    pre { background: #282c34; color: #abb2bf; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1rem; color: #666; }
    a { color: #0066cc; }
    img { max-width: 100%; }
    hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; }
  </style>
</head>
<body>
  <div class="content">
    ${formattedContent}
  </div>
</body>
</html>`;

  Write(`${workDir}/preview.html`, previewHtml);

  // 可选：在浏览器中打开预览
  // Bash(`start "${workDir}/preview.html"`);  // Windows
  // Bash(`open "${workDir}/preview.html"`);   // macOS
}
```

### Step 4: 显示输出内容

```javascript
// 显示格式化后的内容
console.log('\n=== Formatted Content ===\n');
console.log(formattedContent);
console.log('\n=========================\n');

// 提示用户
console.log(`
📁 Output saved to: ${outputFile}
${config.target_format === 'HTML' ? '🌐 Preview available: ' + workDir + '/preview.html' : ''}

💡 Tips:
- Copy the content above for immediate use
- Or access the saved file at the path shown
`);
```

### Step 5: 询问后续操作

```javascript
const nextAction = await AskUserQuestion({
  questions: [
    {
      question: "需要执行什么操作？",
      header: "后续操作",
      multiSelect: false,
      options: [
        { label: "完成", description: "结束格式化流程" },
        { label: "转换为其他格式", description: "选择另一种输出格式" },
        { label: "重新编辑", description: "修改原始内容后重新格式化" }
      ]
    }
  ]
});

if (nextAction["后续操作"] === "转换为其他格式") {
  // 返回 Phase 1 选择新格式
  console.log('请重新运行 /text-formatter 选择其他格式');
}
```

## Output

- **File**: `output.{ext}` (最终输出)
- **File**: `preview.html` (HTML 预览，仅 HTML 格式)
- **Console**: 统计摘要和格式化内容

## Final Output Structure

```
{workDir}/
├── input-config.json     # 配置信息
├── analysis.json         # 分析结果
├── output.md             # Markdown 输出（如选择）
├── output.bbcode.txt     # BBCode 输出（如选择）
├── output.html           # HTML 输出（如选择）
└── preview.html          # HTML 预览页面
```

## Quality Checklist

- [ ] 输出文件已保存
- [ ] 统计信息正确显示
- [ ] 预览功能可用（HTML）
- [ ] 用户可访问输出内容

## Completion

此为最终阶段，格式化流程完成。
