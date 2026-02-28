# 命令转 Skill 规范 v2.0

> 基于 `workflow-plan` 转换实践提炼的标准流程
>
> **v2.0 变更**：命令调用引用统一转换为文件路径引用，不再保留 `/workflow:XX` 等命令调用语法

## ⚠️ 核心要求

**Phase 文件内容必须与原命令文件内容一致**

转换时只改变结构和组织方式，不改变功能实现细节。

---

## 目录

1. [转换目标](#1-转换目标)
2. [核心原则](#2-核心原则)
3. [结构映射](#3-结构映射)
4. [转换步骤](#4-转换步骤)
5. [SKILL.md 编写规范](#5-skillmd-编写规范)
6. [Phase 文件编写规范](#6-phase-文件编写规范)
7. [内容一致性验证](#7-内容一致性验证)
8. [质量检查清单](#8-质量检查清单)
9. [示例对照](#9-示例对照)

---

## 1. 转换目标

### 1.1 为什么转换

| 命令格式 | Skill 格式 |
|----------|-----------|
| 单文件 + 子命令引用 | 结构化目录 + 分阶段执行 |
| 一次性全量加载 | **分布读取**（按需加载） |
| 执行流程隐式 | 执行流程**显式定义** |
| 子命令散落各处 | Phase 文件**集中管理** |
| 缺乏复用机制 | 模板/规范可复用 |

### 1.2 转换收益

- **上下文优化**：Phase 文件按需加载，减少 token 消耗
- **可维护性**：结构清晰，修改范围可控
- **可扩展性**：新增阶段只需添加 Phase 文件
- **执行可视化**：TodoWrite 与 Phase 对齐，进度透明

---

## 2. 核心原则

### 2.1 内容一致性原则（最高优先级）

> **Phase 文件内容必须与原命令文件内容一致**
>
> 这是转换的第一要求，不可妥协。

**一致性定义**：

| 维度 | 一致性要求 | 验证方法 |
|------|-----------|---------|
| **代码逻辑** | 所有Bash命令、函数、条件判断完全一致 | 逐行对比代码块 |
| **Agent Prompt** | Prompt内容100%保留，包括示例和约束 | 全文搜索关键段落 |
| **数据结构** | 表格、Schema、类型定义完整复制 | 对比字段数量 |
| **执行步骤** | 步骤顺序、子步骤层级保持不变 | 对比步骤编号 |
| **文本说明** | 关键说明、注释、警告完整保留 | 抽查重要段落 |

**允许的差异**：

| 差异类型 | 说明 | 示例 |
|---------|------|------|
| ✅ 添加阶段标识 | Phase标题、来源标注 | `# Phase 1: Session Discovery` |
| ✅ 添加组织结构 | 章节标题优化 | 添加 `## Execution Steps` |
| ✅ 添加衔接说明 | Post-Phase Update | 阶段完成后的状态说明 |
| ✅ 命令引用转文件路径 | 将 `/workflow`、`/command` 等命令引用转换为相对文件路径 | 原文 `/workflow:session:start` → `phases/01-session-discovery.md` |
| ✅ 移除 Frontmatter | 移除命令的 argument-hint、examples | 命令级元数据在 Skill 中不需要 |
| ❌ 简化代码 | 任何代码的省略或改写 | 不允许 |
| ❌ 简化Prompt | Agent Prompt的任何删减 | 不允许 |
| ❌ 调整步骤 | 合并、拆分、重排步骤 | 不允许 |

**内容保留清单**：

| 内容类型 | 保留要求 | 示例 |
|---------|---------|------|
| **Bash命令** | 完整命令，包含所有参数、管道、重定向 | `find . -name "*.json" \| head -1` |
| **Agent Prompt** | 全文保留，包含OBJECTIVE、TASK、EXPECTED等所有节 | 完整的Task({prompt: "..."}) |
| **代码函数** | 完整函数体，所有if/else分支 | `analyzeTaskComplexity()` 全部代码 |
| **参数表格** | 所有行列，不省略任何参数 | Session Types表格 |
| **JSON Schema** | 所有字段、类型、required定义 | context-package.json schema |
| **验证逻辑** | 所有校验条件、错误处理、回滚代码 | conflict resolution验证清单 |
| **配置示例** | 输入输出示例、配置模板 | planning-notes.md模板 |
| **注释说明** | 重要的行内注释、块注释 | `// CRITICAL: ...` |

❌ **严格禁止的简化行为**：

1. **将代码替换为描述**
   - ❌ 错误：`Execute context gathering agent`
   - ✅ 正确：完整的 `Task({ subagent_type: "context-search-agent", prompt: "...[完整200行prompt]..." })`

2. **省略Prompt内容**
   - ❌ 错误：`Agent prompt for context gathering (see original file)`
   - ✅ 正确：复制粘贴完整Prompt文本

3. **压缩表格**
   - ❌ 错误：`Session types: Discovery/Auto/Force (see details in code)`
   - ✅ 正确：完整Session Types表格，包含type/description/use case列

4. **合并步骤**
   - ❌ 错误：将Step 1.1-1.4合并为Step 1
   - ✅ 正确：保持1.1、1.2、1.3、1.4独立步骤

5. **删除示例**
   - ❌ 错误：省略JSON输出示例
   - ✅ 正确：保留所有输入输出示例

**引用转换规则**：

命令引用统一转换为文件路径引用，规则如下：

| 原命令引用 | 转换方式 | 示例 |
|-----------|---------|------|
| **Frontmatter** | 移除，在 SKILL.md 中统一定义 | `argument-hint`、`examples` → 移除 |
| **命令调用语法** | 转换为 Phase 文件的相对路径 | `/workflow:session:start` → `phases/01-session-discovery.md` |
| **命令路径引用** | 转换为 Skill 目录内路径 | `commands/workflow/tools/` → `phases/` |
| **跨命令引用** | 转换为 Phase 间文件引用 | `workflow-plan` skill (context-gather phase) → `phases/02-context-gathering.md` |
| **命令参数说明** | 移除或转为 Phase Prerequisites | `usage: /workflow:plan [session-id]` → Phase Prerequisites 中说明 |

**转换示例**：

原命令文件中：
```markdown
## Related Commands
- `/workflow:session:start` - Start new session
- `workflow-plan` skill (context-gather phase) - Gather context
```

转换后 Phase 文件中（使用文件路径引用）：
```markdown
## Related Phases
- [Phase 1: Session Discovery](phases/01-session-discovery.md)
- [Phase 2: Context Gathering](phases/02-context-gathering.md)
```

或在 SKILL.md 的 Phase Reference Table 中统一管理引用关系：
```markdown
### Phase Reference Documents
| Phase | Document | Purpose |
|-------|----------|---------|
| Phase 1 | [phases/01-session-discovery.md](phases/01-session-discovery.md) | 会话发现与初始化 |
| Phase 2 | [phases/02-context-gathering.md](phases/02-context-gathering.md) | 上下文收集 |
```

### 2.2 分布读取原则

> **SKILL.md 引用 Phase，Phase 按执行顺序加载**

```
执行流程：
Phase 1 → Read: phases/01-xxx.md → 执行 → 释放
    ↓
Phase 2 → Read: phases/02-xxx.md → 执行 → 释放
    ↓
Phase N → Read: phases/0N-xxx.md → 执行 → 完成
```

### 2.3 职责分离原则

| 层级 | 职责 | 内容 |
|------|------|------|
| **SKILL.md** | 编排协调 | 流程图、数据流、TodoWrite 模式、阶段入口 |
| **Phase 文件** | 具体执行 | 完整执行逻辑、代码实现、Agent Prompt |
| **Specs** | 规范约束 | Schema 定义、质量标准、领域规范 |
| **Templates** | 可复用片段 | Agent 基础模板、输出模板 |

---

## 3. 结构映射

### 3.1 命令结构 → Skill 结构

```
commands/                              skills/
├── workflow/                          ├── workflow-plan/
│   ├── plan.md          ────────→    │   ├── SKILL.md (orchestrator)
│   ├── session/                      │   ├── phases/
│   │   └── start.md     ────────→    │   │   ├── 01-session-discovery.md
│   └── tools/                        │   │   ├── 02-context-gathering.md
│       ├── context-gather.md ───→    │   │   ├── 03-conflict-resolution.md
│       ├── conflict-resolution.md    │   │   └── 04-task-generation.md
│       └── task-generate-agent.md    │   └── (specs/, templates/ 可选)
```

### 3.2 文件映射规则

| 源文件类型 | 目标文件 | 映射规则 |
|-----------|---------|---------|
| 主命令文件 | `SKILL.md` | 提取元数据、流程、协调逻辑 |
| 子命令文件 | `phases/0N-xxx.md` | 完整内容 + 阶段标识 |
| 引用的规范 | `specs/xxx.md` | 独立提取或保留在 Phase 中 |
| 通用模板 | `templates/xxx.md` | 多处引用时提取 |

### 3.3 命名转换

| 原命令路径 | Phase 文件名 |
|-----------|-------------|
| `session/start.md` | `01-session-discovery.md` |
| `tools/context-gather.md` | `02-context-gathering.md` |
| `tools/conflict-resolution.md` | `03-conflict-resolution.md` |
| `tools/task-generate-agent.md` | `04-task-generation.md` |

**命名规则**：`{序号}-{动作描述}.md`
- 序号：两位数字 `01`, `02`, ...
- 动作：动词-名词形式，小写连字符

---

## 4. 转换步骤

### 4.1 准备阶段

```markdown
□ Step 0: 分析源命令结构
  - 读取主命令文件，识别调用的子命令
  - 绘制命令调用关系图
  - 统计各文件行数（用于后续验证）
```

### 4.2 创建目录结构

```markdown
□ Step 1: 创建 Skill 目录
  mkdir skills/{skill-name}/
  mkdir skills/{skill-name}/phases/
```

### 4.3 编写 SKILL.md

```markdown
□ Step 2: 编写 SKILL.md
  - 提取 Frontmatter (name, description, allowed-tools)
  - 编写架构概览图
  - 编写执行流程（含 Phase 引用表）
  - 编写数据流定义
  - 编写 TodoWrite 模式
  - 编写协调逻辑（阶段间衔接）
```

### 4.4 转换 Phase 文件

```markdown
□ Step 3: 逐个转换子命令为 Phase 文件
  FOR each 子命令:
    - 读取原命令完整内容
    - 添加 Phase 标题和元信息
    - 保留所有代码、表格、Agent Prompt
    - 添加 Post-Phase Update 节（如需）
    - 验证行数接近原文件
```

### 4.5 验证完整性

```markdown
□ Step 4: 验证内容完整性
  - 比较 Phase 文件与原命令行数
  - 确认关键代码块存在
  - 确认 Agent Prompt 完整
  - 确认表格和 Schema 完整
```

---

## 5. SKILL.md 编写规范

### 5.1 Frontmatter 模板

```yaml
---
name: {skill-name}
description: {简短描述}. Triggers on "{trigger-phrase}".
allowed-tools: Task, AskUserQuestion, TodoWrite, Read, Write, Edit, Bash, Glob, Grep
---
```

### 5.2 必需章节

```markdown
# {Skill Name}

{一句话描述功能}

## Architecture Overview
{ASCII 架构图}

## Key Design Principles
{设计原则列表}

## Auto Mode
{自动模式说明}

## Usage

```
Skill(skill="{skill-name}", args="<task description>")
Skill(skill="{skill-name}", args="[FLAGS] \"<task description>\"")

# Flags
{flag 说明，每个 flag 一行}

# Examples
Skill(skill="{skill-name}", args="\"Implement JWT authentication\"")                   # 说明
Skill(skill="{skill-name}", args="--mode xxx \"Refactor payment module\"")             # 说明
Skill(skill="{skill-name}", args="-y \"Add user profile page\"")                        # 说明
```

## Execution Flow
{流程图 + Phase 引用表}

### Phase Reference Documents
| Phase | Document | Load When |
|-------|----------|-----------|
| Phase 1 | phases/01-xxx.md | Phase 1 开始时 |
| ... | ... | ... |

## Core Rules
{执行约束和规则}

## Data Flow
{阶段间数据传递定义}

## TodoWrite Pattern
{任务列表模板}

## Error Handling
{错误处理策略}
```

**Usage 格式要求**：

- **必须使用代码块** 包裹 Usage 内容
- 使用 `Skill()` 调用格式，不使用 `/skill-name` 命令行格式
- 包含两种调用格式：基本调用 + 带 Flags 的完整调用
- Flags 说明每行一个 flag，格式：`flag-name    说明`
- Examples 必须展示所有 flag 组合的典型调用场景
- 字符串参数中的引号使用转义 `\"`
- Examples 行尾可添加 `# 说明` 注释

### 5.3 执行流程示例

```markdown
## Execution Flow

```
Phase 1: Session Discovery
    │ Ref: phases/01-session-discovery.md
    ↓
Phase 2: Context Gathering
    │ Ref: phases/02-context-gathering.md
    ↓
Phase 3: Conflict Resolution (conditional)
    │ Ref: phases/03-conflict-resolution.md
    ↓
Phase 4: Task Generation
    │ Ref: phases/04-task-generation.md
    ↓
Complete: IMPL_PLAN.md + Task JSONs
```

### Phase Reference Documents

| Phase | Document | Load When |
|-------|----------|-----------|
| Phase 1 | `phases/01-session-discovery.md` | Phase 1 开始执行时 |
| Phase 2 | `phases/02-context-gathering.md` | Phase 1 完成后 |
| Phase 3 | `phases/03-conflict-resolution.md` | conflict_risk ≥ medium 时 |
| Phase 4 | `phases/04-task-generation.md` | Phase 3 完成或跳过后 |
```

---

## 6. Phase 文件编写规范

### 6.1 Phase 文件结构

```markdown
# Phase N: {Phase Name}

> 来源: `commands/{path}/original.md`

## Overview
{阶段目标和职责}

## Prerequisites
{前置条件和输入}

## Execution Steps

### Step N.1: {Step Name}
{完整实现代码}

### Step N.2: {Step Name}
{完整实现代码}

## Agent Prompt (如有)
{完整 Agent Prompt，不简化}

## Output Format
{输出 Schema 和示例}

## Post-Phase Update
{阶段完成后的状态更新}
```

### 6.2 转换原则：只改结构，不改内容

**转换时的思维模式**：

> "我是在**搬运**内容，不是在**改写**内容"

| 操作 | 允许 | 禁止 |
|------|------|------|
| 复制粘贴代码 | ✅ | |
| 调整章节标题 | ✅ | |
| 添加Phase标识 | ✅ | |
| 改写代码逻辑 | | ❌ |
| 简化Prompt | | ❌ |
| 省略步骤 | | ❌ |

**转换流程**：

1. **打开原命令文件和新Phase文件并排显示**
2. **逐段复制粘贴**（不要凭记忆改写）
3. **只添加结构性元素**（Phase标题、章节标题）
4. **保留100%功能性内容**（代码、Prompt、表格、示例）

### 6.3 内容完整性自查

转换每个Phase文件后，必须完成以下检查：

| 检查项 | 检查方法 | 合格标准 |
|--------|---------|---------|
| **代码块数量** | 计数 ` ```bash ` 和 ` ```javascript ` | 与原文件相等 |
| **表格数量** | 计数 ` \| ` 开头的行 | 与原文件相等 |
| **Agent Prompt** | 搜索 `Task({` | 完整的prompt参数内容 |
| **步骤编号** | 检查 `### Step` | 编号序列与原文件一致 |
| **文件行数** | `wc -l` | ±20%以内 |
| **关键函数** | 搜索函数名 | 所有函数完整保留 |

**示例检查**：

```bash
# 原命令文件
$ grep -c "^###" commands/workflow/tools/context-gather.md
15

# Phase文件（应该相等或略多）
$ grep -c "^###" skills/workflow-plan/phases/02-context-gathering.md
16  # ✓ 只多了"Post-Phase Update"节

# 代码块数量对比
$ grep -c '```' commands/workflow/tools/context-gather.md
24

$ grep -c '```' skills/workflow-plan/phases/02-context-gathering.md
24  # ✓ 完全相等
```

### 6.4 内容保留清单（详细版）

转换时必须完整保留：

| 内容类型 | 保留要求 |
|---------|---------|
| **Bash 命令** | 完整命令，包含所有参数和路径 |
| **Agent Prompt** | 全文，包含示例和约束 |
| **代码函数** | 完整函数体，不简化 |
| **参数表格** | 所有列和行 |
| **JSON Schema** | 完整字段定义 |
| **验证逻辑** | if/else、校验代码 |
| **错误处理** | try/catch、回滚逻辑 |
| **示例** | 输入输出示例 |

### 6.3 禁止的简化

❌ **不要这样**：
```markdown
### Step 2: Run context gathering
Execute the context-search-agent to gather project context.
```

✅ **应该这样**：
```markdown
### Step 2: Run context gathering

```javascript
Task({
  subagent_type: "context-search-agent",
  prompt: `
## Context Search Task

### OBJECTIVE
Gather comprehensive context for planning session ${sessionId}

### MULTI-SOURCE DISCOVERY STRATEGY

**Track 0: Project Foundation**
- Read CLAUDE.md files at all levels
- Check .workflow/project-tech.json for stack info
...
[完整 Prompt 内容]
`,
  run_in_background: false
})
```
```

---

## 7. 内容一致性验证

### 7.1 验证流程

每完成一个Phase文件转换后，执行以下验证：

```
┌─────────────────────────────────────────────────────────────────┐
│  内容一致性验证流程                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: 行数对比                                                │
│       $ wc -l 原文件 Phase文件                                   │
│       └─→ 差异应在 ±20% 以内                                    │
│                                                                  │
│  Step 2: 代码块对比                                              │
│       $ grep -c '```' 原文件 Phase文件                           │
│       └─→ 数量应相等                                            │
│                                                                  │
│  Step 3: 关键内容抽查                                            │
│       - 搜索 Task({ → Agent Prompt 完整性                        │
│       - 搜索函数名 → 函数体完整性                                │
│       - 搜索表格标记 → 表格完整性                                │
│                                                                  │
│  Step 4: 并排对比                                                │
│       - 打开原文件和Phase文件                                    │
│       - 逐节对比功能性内容                                       │
│       - 确认无省略无改写                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 验证命令

```bash
# 1. 行数对比
wc -l commands/workflow/tools/context-gather.md skills/workflow-plan/phases/02-context-gathering.md

# 2. 代码块数量
grep -c '```' commands/workflow/tools/context-gather.md
grep -c '```' skills/workflow-plan/phases/02-context-gathering.md

# 3. 表格行数
grep -c '^|' commands/workflow/tools/context-gather.md
grep -c '^|' skills/workflow-plan/phases/02-context-gathering.md

# 4. Agent Prompt检查
grep -c 'Task({' commands/workflow/tools/context-gather.md
grep -c 'Task({' skills/workflow-plan/phases/02-context-gathering.md

# 5. 函数定义检查
grep -E '^(function|const.*=.*=>|async function)' commands/workflow/tools/context-gather.md
grep -E '^(function|const.*=.*=>|async function)' skills/workflow-plan/phases/02-context-gathering.md
```

### 7.3 一致性检查表

每个Phase文件必须填写：

| 检查项 | 原文件 | Phase文件 | 是否一致 |
|--------|--------|-----------|---------|
| 文件行数 | ___ | ___ | □ ±20%内 |
| 代码块数量 | ___ | ___ | □ 相等 |
| 表格行数 | ___ | ___ | □ 相等 |
| Task调用数 | ___ | ___ | □ 相等 |
| 函数定义数 | ___ | ___ | □ 相等 |
| 步骤数量 | ___ | ___ | □ 相等或+1 |

### 7.4 不一致处理

发现不一致时：

| 情况 | 处理方式 |
|------|---------|
| Phase文件行数少>20% | ❌ **必须补充**：定位缺失内容，从原文件复制 |
| 代码块数量少 | ❌ **必须补充**：找出缺失的代码块 |
| Agent Prompt缺失 | ❌ **严重问题**：立即从原文件完整复制 |
| 表格缺失 | ❌ **必须补充**：复制完整表格 |
| Phase文件行数多>20% | ✓ 可接受（添加了结构性内容） |

---

## 8. 质量检查清单

### 8.1 结构检查

```markdown
□ SKILL.md 存在且包含必需章节
□ phases/ 目录存在
□ Phase 文件按数字前缀排序
□ 所有子命令都有对应 Phase 文件
```

### 8.2 内容完整性检查

```markdown
□ Phase 文件行数 ≈ 原命令行数 (±20%)
□ 所有 Bash 命令完整保留
□ 所有 Agent Prompt 完整保留
□ 所有表格完整保留
□ 所有 JSON Schema 完整保留
□ 验证逻辑和错误处理完整
```

### 8.3 引用检查

```markdown
□ SKILL.md 中 Phase 引用路径正确
□ Phase 文件标注了来源命令
□ 跨 Phase 数据引用明确
```

### 8.4 行数对比表

| 原命令 | 行数 | Phase 文件 | 行数 | 差异 |
|--------|------|-----------|------|------|
| session/start.md | 202 | 01-session-discovery.md | 281 | +39% ✓ |
| tools/context-gather.md | 404 | 02-context-gathering.md | 427 | +6% ✓ |
| tools/conflict-resolution.md | 604 | 03-conflict-resolution.md | 645 | +7% ✓ |
| tools/task-generate-agent.md | 693 | 04-task-generation.md | 701 | +1% ✓ |

> Phase 文件可以比原命令稍长（添加了阶段标识、Post-Phase Update 等），但不应显著缩短。

---

## 9. 示例对照

### 9.1 workflow-plan 转换示例

**转换前**（命令结构）：
```
commands/workflow/
├── plan.md (163 行) ─── 主命令，调用子命令
├── session/
│   └── start.md (202 行) ─── 会话管理
└── tools/
    ├── context-gather.md (404 行) ─── 上下文收集
    ├── conflict-resolution.md (604 行) ─── 冲突解决
    └── task-generate-agent.md (693 行) ─── 任务生成
```

**转换后**（Skill 结构）：
```
skills/workflow-plan/
├── SKILL.md (348 行) ─── 编排协调
└── phases/
    ├── 01-session-discovery.md (281 行)
    ├── 02-context-gathering.md (427 行)
    ├── 03-conflict-resolution.md (645 行)
    └── 04-task-generation.md (701 行)
```

### 9.2 SKILL.md 与原主命令对比

| 原 plan.md 内容 | SKILL.md 对应位置 |
|----------------|-------------------|
| Frontmatter | Frontmatter (扩展) |
| argument-hint | Usage (转换为 Skill 调用格式) |
| 执行流程描述 | Execution Flow (可视化) |
| 子命令调用 | Phase Reference Table |
| 数据传递 | Data Flow (显式定义) |
| (无) | Usage (新增 - Skill 调用格式) |
| (无) | TodoWrite Pattern (新增) |
| (无) | Error Handling (新增) |

**Usage 转换示例**：

原命令 `argument-hint`:
```yaml
argument-hint: "[-y|--yes] \"text description\"|file.md"
```

转换为 SKILL.md Usage:
```
Skill(skill="workflow-plan", args="<task description>")
Skill(skill="workflow-plan", args="[-y|--yes] \"<task description>\"")

# Flags
-y, --yes    Skip all confirmations (auto mode)

# Examples
Skill(skill="workflow-plan", args="\"Implement authentication\"")     # Interactive mode
Skill(skill="workflow-plan", args="-y \"Implement authentication\"")  # Auto mode
```

### 9.3 Phase 文件与原子命令对比

| 原子命令内容 | Phase 文件对应 |
|-------------|---------------|
| Frontmatter | 移除 (Skill 不需要) |
| 步骤说明 | Execution Steps |
| 代码实现 | **完整保留（一致性要求）** |
| Agent Prompt | **完整保留（一致性要求）** |
| 输出格式 | Output Format |
| (无) | Post-Phase Update (新增) |

---

## 附录：快速转换命令

```bash
# 1. 统计原命令行数
wc -l commands/{path}/*.md commands/{path}/**/*.md

# 2. 创建 Skill 目录
mkdir -p skills/{skill-name}/phases

# 3. 转换完成后验证
wc -l skills/{skill-name}/SKILL.md skills/{skill-name}/phases/*.md

# 4. 对比行数差异
# Phase 文件行数应 ≈ 原命令行数 (±20%)
```

---

## 修订历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2025-02-05 | 基于 workflow-plan 转换实践创建 |
| v1.1 | 2025-02-05 | 强化内容一致性要求；添加第7章一致性验证；添加应移除的命令特有内容说明 |
| v2.0 | 2026-02-05 | 命令调用引用统一转换为文件路径引用；移除 `/workflow:XX` 命令语法；引用转换规则重构 |
| v2.1 | 2026-02-05 | 添加 Usage 部分格式规范（Skill 调用格式）；更新 5.2 必需章节；添加 Usage 转换示例到 9.2 节 |
