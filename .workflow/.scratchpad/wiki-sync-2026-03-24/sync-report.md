# CCW Wiki Sync Report

**同步日期**: 2026-03-24
**本地版本**: v7.2.20
**页面版本**: v7.2.7 → v7.2.20

## 同步摘要

| 类型 | 数量 | 详情 |
|------|------|------|
| **版本更新** | v7.2.7 → v7.2.20 | 小版本更新（b=2 不变） |
| **新增命令** | 6 | delegation-check, prompt-generator, wf-composer, wf-player, workflow-lite-test-review, workflow-tune |
| **废弃命令** | 16 | DDD系列(9), IDAW系列(5), team-edict, team-planex-v2 |
| **净命令数** | 116 | 126 - 16 + 6 |

## 新增命令详情

### 技能管理类
1. **`/delegation-check`** - 委托冲突检查器
   - 功能：检查命令委托提示与代理角色定义的内容分离边界
   - 检测7个冲突维度：角色重定义、领域泄露、质量门重复、输出格式冲突、流程覆盖、范围权限冲突、缺失契约

2. **`/prompt-generator`** - 提示词生成器
   - 四种模式：创建命令、创建技能、创建代理、转换现有文件
   - 遵循 GSD 内容分离原则

### 工作流工具类
3. **`/wf-composer`** - 工作流模板设计器
   - 自然语言 → DAG节点 → 执行器映射 → 检查点注入 → JSON模板

4. **`/wf-player`** - 工作流模板执行器
   - 加载模板 → 绑定变量 → DAG执行 → 检查点恢复

5. **`/workflow-lite-test-review`** - 轻量测试审查
   - lite-execute 后的收敛验证 + 测试执行 + 自动修复

6. **`/workflow-tune`** - 工作流调优
   - 测试命令执行效果 → 质量分析 → 优化建议

## 废弃命令详情

### DDD 文档驱动开发系列（9个）
- /ddd:auto, /ddd:sync, /ddd:update, /ddd:scan, /ddd:plan, /ddd:execute, /ddd:index-build, /ddd:doc-refresh, /ddd:doc-generate
- 废弃原因：功能已移除

### IDAW 迭代开发工作流系列（5个）
- /idaw:add, /idaw:run, /idaw:run-coordinate, /idaw:resume, /idaw:status
- 废弃原因：功能已移除

### 其他废弃命令（2个）
- `/team-edict` - 三省六部协作框架已移除
- `/team-planex-v2` - 请使用 /team-planex

## 文件更新清单

- [x] `src/data/commands.ts` - 移除废弃命令、添加新命令、更新STATS
- [x] `src/data/deprecated.ts` - 添加16条废弃记录
- [x] `src/data/patterns.ts` - 移除ddd和edict相关模式

## 下一步操作

1. 运行 `npm run build` 验证编译
2. 运行 `npm run dev` 本地预览
3. 提交变更到 Git
