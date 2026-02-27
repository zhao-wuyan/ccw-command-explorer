# Phase 1: Input Collection

收集用户输入的文本内容。

## Objective

- 获取用户输入内容（直接粘贴或文件路径）
- 生成输入配置文件

**注意**: 输出格式固定为 BBCode + Markdown 混合格式（论坛优化），无需选择。

## Input

- 来源: 用户交互
- 配置: 无前置依赖

## Execution Steps

### Step 1: 询问输入方式

```javascript
const inputMethod = await AskUserQuestion({
  questions: [
    {
      question: "请选择输入方式",
      header: "输入方式",
      multiSelect: false,
      options: [
        { label: "直接粘贴文本", description: "在对话中粘贴要格式化的内容" },
        { label: "指定文件路径", description: "读取指定文件的内容" }
      ]
    }
  ]
});
```

### Step 2: 获取内容

```javascript
let content = '';

if (inputMethod["输入方式"] === "直接粘贴文本") {
  // 提示用户粘贴内容
  const textInput = await AskUserQuestion({
    questions: [
      {
        question: "请粘贴要格式化的文本内容（粘贴后选择确认）",
        header: "文本内容",
        multiSelect: false,
        options: [
          { label: "已粘贴完成", description: "确认已在上方粘贴内容" }
        ]
      }
    ]
  });
  // 从用户消息中提取文本内容
  content = extractUserText();
} else {
  // 询问文件路径
  const filePath = await AskUserQuestion({
    questions: [
      {
        question: "请输入文件路径",
        header: "文件路径",
        multiSelect: false,
        options: [
          { label: "已输入路径", description: "确认路径已在上方输入" }
        ]
      }
    ]
  });
  content = Read(extractedFilePath);
}
```

### Step 3: 保存配置

```javascript
const config = {
  input_method: inputMethod["输入方式"],
  target_format: "BBCode+MD",  // 固定格式
  original_content: content,
  timestamp: new Date().toISOString()
};

Write(`${workDir}/input-config.json`, JSON.stringify(config, null, 2));
```

## Output

- **File**: `input-config.json`
- **Format**: JSON

```json
{
  "input_method": "直接粘贴文本",
  "target_format": "BBCode+MD",
  "original_content": "...",
  "timestamp": "2026-01-13T..."
}
```

## Quality Checklist

- [ ] 成功获取用户输入内容
- [ ] 内容非空且有效
- [ ] 配置文件已保存

## Next Phase

→ [Phase 2: Content Analysis](02-content-analysis.md)
