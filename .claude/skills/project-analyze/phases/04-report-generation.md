# Phase 4: Report Generation

生成索引式报告，通过 markdown 链接引用章节文件。

> **规范参考**: [../specs/quality-standards.md](../specs/quality-standards.md)

## 设计原则

1. **引用而非嵌入**：主报告通过链接引用章节，不复制内容
2. **索引 + 综述**：主报告提供导航和高阶分析
3. **避免重复**：综述来自 consolidation，不重新生成
4. **独立可读**：各章节文件可单独阅读

## 输入

```typescript
interface ReportInput {
  output_dir: string;
  config: AnalysisConfig;
  consolidation: {
    quality_score: QualityScore;
    issues: { errors: Issue[], warnings: Issue[], info: Issue[] };
    stats: Stats;
    synthesis: string;  // consolidation agent 的综合分析
    section_summaries: Array<{file: string, summary: string}>;
  };
}
```

## 执行流程

```javascript
// 1. 质量门禁检查
if (consolidation.issues.errors.length > 0) {
  const response = await AskUserQuestion({
    questions: [{
      question: `发现 ${consolidation.issues.errors.length} 个严重问题，如何处理？`,
      header: "质量检查",
      multiSelect: false,
      options: [
        {label: "查看并修复", description: "显示问题列表，手动修复后重试"},
        {label: "忽略继续", description: "跳过问题检查，继续装配"},
        {label: "终止", description: "停止报告生成"}
      ]
    }]
  });

  if (response === "查看并修复") {
    return { action: "fix_required", errors: consolidation.issues.errors };
  }
  if (response === "终止") {
    return { action: "abort" };
  }
}

// 2. 生成索引式报告（不读取章节内容）
const report = generateIndexReport(config, consolidation);

// 3. 写入最终文件
const fileName = `${config.type.toUpperCase()}-REPORT.md`;
Write(`${outputDir}/${fileName}`, report);
```

## 报告模板

### 通用结构

```markdown
# {报告标题}

> 生成日期：{date}
> 分析范围：{scope}
> 分析深度：{depth}
> 质量评分：{overall}%

---

## 报告综述

{consolidation.synthesis - 来自汇总 Agent 的跨章节综合分析}

---

## 章节索引

| 章节 | 核心发现 | 详情 |
|------|----------|------|
{section_summaries 生成的表格行}

---

## 架构洞察

{从 consolidation 提取的跨模块关联分析}

---

## 建议与展望

{consolidation.recommendations - 优先级排序的综合建议}

---

**附录**

- [质量报告](./consolidation-summary.md)
- [章节文件目录](./sections/)
```

### 报告标题映射

| 类型 | 标题 |
|------|------|
| architecture | 项目架构设计报告 |
| design | 项目设计模式报告 |
| methods | 项目核心方法报告 |
| comprehensive | 项目综合分析报告 |

## 生成函数

```javascript
function generateIndexReport(config, consolidation) {
  const titles = {
    architecture: "项目架构设计报告",
    design: "项目设计模式报告",
    methods: "项目核心方法报告",
    comprehensive: "项目综合分析报告"
  };

  const date = new Date().toLocaleDateString('zh-CN');

  // 章节索引表格
  const sectionTable = consolidation.section_summaries
    .map(s => `| ${s.title} | ${s.summary} | [查看详情](./sections/${s.file}) |`)
    .join('\n');

  return `# ${titles[config.type]}

> 生成日期：${date}
> 分析范围：${config.scope}
> 分析深度：${config.depth}
> 质量评分：${consolidation.quality_score.overall}%

---

## 报告综述

${consolidation.synthesis}

---

## 章节索引

| 章节 | 核心发现 | 详情 |
|------|----------|------|
${sectionTable}

---

## 架构洞察

${consolidation.cross_analysis || '详见各章节分析。'}

---

## 建议与展望

${consolidation.recommendations || '详见质量报告中的改进建议。'}

---

**附录**

- [质量报告](./consolidation-summary.md)
- [章节文件目录](./sections/)
`;
}
```

## 输出结构

```
.workflow/.scratchpad/analyze-{timestamp}/
├── sections/                    # 独立章节（Phase 3 产出）
│   ├── section-overview.md
│   ├── section-layers.md
│   └── ...
├── consolidation-summary.md     # 质量报告（Phase 3.5 产出）
└── {TYPE}-REPORT.md             # 索引报告（本阶段产出）
```

## 与 Phase 3.5 的协作

Phase 3.5 consolidation agent 需要提供：

```typescript
interface ConsolidationOutput {
  // ... 原有字段
  synthesis: string;           // 跨章节综合分析（2-3 段落）
  cross_analysis: string;      // 架构级关联洞察
  recommendations: string;     // 优先级排序的建议
  section_summaries: Array<{
    file: string;              // 文件名
    title: string;             // 章节标题
    summary: string;           // 一句话核心发现
  }>;
}
```

## 关键变更

| 原设计 | 新设计 |
|--------|--------|
| 读取章节内容并拼接 | 链接引用，不读取内容 |
| 重新生成 Executive Summary | 直接使用 consolidation.synthesis |
| 嵌入质量评分表格 | 链接引用 consolidation-summary.md |
| 主报告包含全部内容 | 主报告仅为索引 + 综述 |
