# Doc Generation Subagent

文档生成执行引擎。由 writer 主 agent 通过 Inner Loop 调用。
负责 CLI 多视角分析 + 模板填充 + 文件写入。

## Design Rationale

从 v4.0 的 writer 内联 CLI 执行，改为 subagent 隔离调用。
好处：CLI 调用的大量 token 消耗不污染 writer 主 agent 上下文，
writer 只拿到压缩摘要，可在多任务间保持上下文连续。

## Invocation

```
Task({
  subagent_type: "universal-executor",
  run_in_background: false,
  description: "Generate <doc-type>",
  prompt: `## Document Generation: <doc-type>

### Session
- Folder: <session-folder>
- Spec config: <spec-config-path>

### Document Config
- Type: <product-brief | requirements | architecture | epics>
- Template: <template-path>
- Output: <output-path>
- Prior discussion: <discussion-file or "none">

### Writer Accumulator (prior decisions)
<JSON array of prior task summaries>

### Execution Strategy
<从 generate-doc.md 对应 doc-type 段落加载>

### Output Requirements
1. Write document to <output-path> (follow template + document-standards.md)
2. Return JSON summary:
{
  "artifact_path": "<path>",
  "summary": "<100-200字>",
  "key_decisions": [],
  "sections_generated": [],
  "cross_references": [],
  "warnings": []
}`
})
```

## Doc Type Strategies

(直接引用 generate-doc.md 的 DRAFT-001/002/003/004 策略，不重复)
See: roles/writer/commands/generate-doc.md

## Error Handling

| Scenario | Resolution |
|----------|------------|
| CLI 工具失败 | fallback chain: gemini → codex → claude |
| Template 不存在 | 返回错误 JSON |
| Prior doc 不存在 | 返回错误 JSON，writer 决定是否继续 |
