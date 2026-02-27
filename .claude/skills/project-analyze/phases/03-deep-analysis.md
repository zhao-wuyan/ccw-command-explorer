# Phase 3: Deep Analysis

并行 Agent 撰写设计报告章节，返回简要信息。

> **规范参考**: [../specs/quality-standards.md](../specs/quality-standards.md)
> **写作风格**: [../specs/writing-style.md](../specs/writing-style.md)

## Exploration → Agent 自动分配

根据 Phase 2 生成的 exploration 文件名自动分配对应的 analysis agent。

### 映射规则

```javascript
// Exploration 角度 → Agent 映射（基于文件名识别，不读取内容）
const EXPLORATION_TO_AGENT = {
  // Architecture Report 角度
  'layer-structure': 'layers',
  'module-dependencies': 'dependencies',
  'entry-points': 'entrypoints',
  'data-flow': 'dataflow',

  // Design Report 角度
  'design-patterns': 'patterns',
  'class-relationships': 'classes',
  'interface-contracts': 'interfaces',
  'state-management': 'state',

  // Methods Report 角度
  'core-algorithms': 'algorithms',
  'critical-paths': 'paths',
  'public-apis': 'apis',
  'complex-logic': 'logic',

  // Comprehensive 角度
  'architecture': 'overview',
  'patterns': 'patterns',
  'dependencies': 'dependencies',
  'integration-points': 'entrypoints'
};

// 从文件名提取角度
function extractAngle(filename) {
  // exploration-layer-structure.json → layer-structure
  const match = filename.match(/exploration-(.+)\.json$/);
  return match ? match[1] : null;
}

// 分配 agent
function assignAgent(explorationFile) {
  const angle = extractAngle(path.basename(explorationFile));
  return EXPLORATION_TO_AGENT[angle] || null;
}

// Agent 配置（用于 buildAgentPrompt）
const AGENT_CONFIGS = {
  overview: {
    role: '首席系统架构师',
    task: '基于代码库全貌，撰写"总体架构"章节，洞察核心价值主张和顶层技术决策',
    focus: '领域边界与定位、架构范式、核心技术决策、顶层模块划分',
    constraint: '避免罗列目录结构，重点阐述设计意图，包含至少1个 Mermaid 架构图'
  },
  layers: {
    role: '资深软件设计师',
    task: '分析系统逻辑分层结构，撰写"逻辑视点与分层架构"章节',
    focus: '职责分配体系、数据流向与约束、边界隔离策略、异常处理流',
    constraint: '不要列举具体文件名，关注层级间契约和隔离艺术'
  },
  dependencies: {
    role: '集成架构专家',
    task: '审视系统外部连接与内部耦合，撰写"依赖管理与生态集成"章节',
    focus: '外部集成拓扑、核心依赖分析、依赖注入与控制反转、供应链安全',
    constraint: '禁止简单列出依赖配置，必须分析集成策略和风险控制模型'
  },
  dataflow: {
    role: '数据架构师',
    task: '追踪系统数据流转机制，撰写"数据流与状态管理"章节',
    focus: '数据入口与出口、数据转换管道、持久化策略、一致性保障',
    constraint: '关注数据生命周期和形态演变，不要罗列数据库表结构'
  },
  entrypoints: {
    role: '系统边界分析师',
    task: '识别系统入口设计和关键路径，撰写"系统入口与调用链"章节',
    focus: '入口类型与职责、请求处理管道、关键业务路径、异常与边界处理',
    constraint: '关注入口设计哲学，不要逐个列举所有端点'
  },
  patterns: {
    role: '核心开发规范制定者',
    task: '挖掘代码中的复用机制和标准化实践，撰写"设计模式与工程规范"章节',
    focus: '架构级模式、通信与并发模式、横切关注点实现、抽象与复用策略',
    constraint: '避免教科书式解释，必须结合项目上下文说明应用场景'
  },
  classes: {
    role: '领域模型设计师',
    task: '分析系统类型体系和领域模型，撰写"类型体系与领域建模"章节',
    focus: '领域模型设计、继承与组合策略、职责分配原则、类型安全与约束',
    constraint: '关注建模思想，用 UML 类图辅助说明核心关系'
  },
  interfaces: {
    role: '契约设计专家',
    task: '分析系统接口设计和抽象层次，撰写"接口契约与抽象设计"章节',
    focus: '抽象层次设计、契约与实现分离、扩展点设计、版本演进策略',
    constraint: '关注接口设计哲学，不要逐个列举接口方法签名'
  },
  state: {
    role: '状态管理架构师',
    task: '分析系统状态管理机制，撰写"状态管理与生命周期"章节',
    focus: '状态模型设计、状态生命周期、并发与一致性、状态恢复与容错',
    constraint: '关注状态管理设计决策，不要列举具体变量名'
  },
  algorithms: {
    role: '算法架构师',
    task: '分析系统核心算法设计，撰写"核心算法与计算模型"章节',
    focus: '算法选型与权衡、计算模型设计、性能与可扩展性、正确性保障',
    constraint: '关注算法思想，用流程图辅助说明复杂逻辑'
  },
  paths: {
    role: '性能架构师',
    task: '分析系统关键执行路径，撰写"关键路径与性能设计"章节',
    focus: '关键业务路径、性能敏感区域、瓶颈识别与缓解、降级与熔断',
    constraint: '关注路径设计战略考量，不要罗列所有代码执行步骤'
  },
  apis: {
    role: 'API 设计规范专家',
    task: '分析系统对外接口设计规范，撰写"API 设计与规范"章节',
    focus: 'API 设计风格、命名与结构规范、版本管理策略、错误处理规范',
    constraint: '关注设计规范和一致性，不要逐个列举所有 API 端点'
  },
  logic: {
    role: '业务逻辑架构师',
    task: '分析系统业务逻辑建模，撰写"业务逻辑与规则引擎"章节',
    focus: '业务规则建模、决策点设计、边界条件处理、业务流程编排',
    constraint: '关注业务逻辑组织方式，不要逐行解释代码逻辑'
  }
};
```

### 自动发现与分配流程

```javascript
// 1. 发现所有 exploration 文件（仅看文件名）
const explorationFiles = bash(`find ${sessionFolder} -name "exploration-*.json" -type f`)
  .split('\n')
  .filter(f => f.trim());

// 2. 按文件名自动分配 agent
const agentAssignments = explorationFiles.map(file => {
  const angle = extractAngle(path.basename(file));
  const agentName = EXPLORATION_TO_AGENT[angle];
  return {
    exploration_file: file,
    angle: angle,
    agent: agentName,
    output_file: `section-${agentName}.md`
  };
}).filter(a => a.agent);  // 过滤未映射的角度

console.log(`
## Agent Auto-Assignment

Found ${explorationFiles.length} exploration files:
${agentAssignments.map(a => `- ${a.angle} → ${a.agent} agent`).join('\n')}
`);
```

---

## Agent 执行前置条件

**每个 Agent 接收 exploration 文件路径，自行读取内容**：

```javascript
// Agent prompt 中包含文件路径
// Agent 启动后的操作顺序：
// 1. Read exploration 文件（上下文输入）
// 2. Read 规范文件
// 3. 执行分析任务
```

规范文件路径（相对于 skill 根目录）：
- `specs/quality-standards.md` - 质量标准和检查清单
- `specs/writing-style.md` - 段落式写作规范

---

## 通用写作规范（所有 Agent 共用）

```
[STYLE]
- **语言规范**：使用严谨、专业的中文进行技术写作。仅专业术语（如 Singleton, Middleware, ORM）保留英文原文。
- **叙述视角**：采用完全客观的第三人称视角（"上帝视角"）。严禁使用"我们"、"开发者"、"用户"、"你"或"我"。主语应为"系统"、"模块"、"设计"、"架构"或"该层"。
- **段落结构**：
    - 禁止使用无序列表作为主要叙述方式，必须将观点融合在连贯的段落中。
    - 采用"论点-论据-结论"的逻辑结构。
    - 善用逻辑连接词（"因此"、"然而"、"鉴于"、"进而"）来体现设计思路的推演过程。
- **内容深度**：
    - 抽象化：描述"做什么"和"为什么这么做"，而不是"怎么写的"。
    - 方法论：强调设计模式、架构原则（如 SOLID、高内聚低耦合）的应用。
    - 非代码化：除非定义关键接口，否则不直接引用代码。文件引用仅作为括号内的来源标注 (参考: path/to/file)。
```

## Agent 配置

### Architecture Report Agents

| Agent | 输出文件 | 关注点 |
|-------|----------|--------|
| overview | section-overview.md | 顶层架构、技术决策、设计哲学 |
| layers | section-layers.md | 逻辑分层、职责边界、隔离策略 |
| dependencies | section-dependencies.md | 依赖治理、集成拓扑、风险控制 |
| dataflow | section-dataflow.md | 数据流向、转换机制、一致性保障 |
| entrypoints | section-entrypoints.md | 入口设计、调用链、异常传播 |

### Design Report Agents

| Agent | 输出文件 | 关注点 |
|-------|----------|--------|
| patterns | section-patterns.md | 架构模式、通信机制、横切关注点 |
| classes | section-classes.md | 类型体系、继承策略、职责划分 |
| interfaces | section-interfaces.md | 契约设计、抽象层次、扩展机制 |
| state | section-state.md | 状态模型、生命周期、并发控制 |

### Methods Report Agents

| Agent | 输出文件 | 关注点 |
|-------|----------|--------|
| algorithms | section-algorithms.md | 核心算法思想、复杂度权衡、优化策略 |
| paths | section-paths.md | 关键路径设计、性能敏感点、瓶颈分析 |
| apis | section-apis.md | API 设计规范、版本策略、兼容性 |
| logic | section-logic.md | 业务逻辑建模、决策机制、边界处理 |

---

## Agent 返回格式

```typescript
interface AgentReturn {
  status: "completed" | "partial" | "failed";
  output_file: string;
  summary: string;               // 50字以内
  cross_module_notes: string[];  // 跨模块发现
  stats: { diagrams: number; };
}
```

---

## Agent 提示词

### Overview Agent

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  prompt: `
[SPEC]
首先读取规范文件：
- Read: ${skillRoot}/specs/quality-standards.md
- Read: ${skillRoot}/specs/writing-style.md
严格遵循规范中的质量标准和段落式写作要求。

[ROLE] 首席系统架构师

[TASK]
基于代码库的全貌，撰写《系统架构设计报告》的"总体架构"章节。透过代码表象，洞察系统的核心价值主张和顶层技术决策。
输出: ${outDir}/sections/section-overview.md

[STYLE]
- 严谨专业的中文技术写作，专业术语保留英文
- 完全客观的第三人称视角，严禁"我们"、"开发者"
- 段落式叙述，采用"论点-论据-结论"结构
- 善用逻辑连接词体现设计推演过程
- 描述"做什么"和"为什么"，非"怎么写的"
- 不直接引用代码，文件仅作来源标注

[FOCUS]
- 领域边界与定位：系统旨在解决什么核心业务问题？其在更大的技术生态中处于什么位置？
- 架构范式：采用何种架构风格（分层、六边形、微服务、事件驱动等）？选择该范式的根本原因是什么？
- 核心技术决策：关键技术栈的选型依据，这些选型如何支撑系统的非功能性需求（性能、扩展性、维护性）
- 顶层模块划分：系统在最高层级被划分为哪些逻辑单元？它们之间的高层协作机制是怎样的？

[CONSTRAINT]
- 避免罗列目录结构
- 重点阐述"设计意图"而非"现有功能"
- 包含至少1个 Mermaid 架构图辅助说明

[RETURN JSON]
{"status":"completed","output_file":"section-overview.md","summary":"<50字>","cross_module_notes":[],"stats":{"diagrams":1}}
`
})
```

### Layers Agent

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  prompt: `
[SPEC]
首先读取规范文件：
- Read: ${skillRoot}/specs/quality-standards.md
- Read: ${skillRoot}/specs/writing-style.md
严格遵循规范中的质量标准和段落式写作要求。

[ROLE] 资深软件设计师

[TASK]
分析系统的逻辑分层结构，撰写《系统架构设计报告》的"逻辑视点与分层架构"章节。重点揭示系统如何通过分层来隔离关注点。
输出: ${outDir}/sections/section-layers.md

[STYLE]
- 严谨专业的中文技术写作
- 客观第三人称视角，主语为"系统"、"该层"、"设计"
- 段落式叙述，禁止无序列表作为主体
- 强调方法论和架构原则的应用

[FOCUS]
- 职责分配体系：系统被划分为哪几个逻辑层级？每一层的核心职责和输入输出是什么？
- 数据流向与约束：数据在各层之间是如何流动的？是否存在严格的单向依赖规则？
- 边界隔离策略：各层之间通过何种方式解耦（接口抽象、DTO转换、依赖注入）？如何防止下层实现细节泄露到上层？
- 异常处理流：异常信息如何在分层结构中传递和转化？

[CONSTRAINT]
- 不要列举具体的文件名列表
- 关注"层级间的契约"和"隔离的艺术"

[RETURN JSON]
{"status":"completed","output_file":"section-layers.md","summary":"<50字>","cross_module_notes":[],"stats":{}}
`
})
```

### Dependencies Agent

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  prompt: `
[SPEC]
首先读取规范文件：
- Read: ${skillRoot}/specs/quality-standards.md
- Read: ${skillRoot}/specs/writing-style.md
严格遵循规范中的质量标准和段落式写作要求。

[ROLE] 集成架构专家

[TASK]
审视系统的外部连接与内部耦合情况，撰写《系统架构设计报告》的"依赖管理与生态集成"章节。
输出: ${outDir}/sections/section-dependencies.md

[STYLE]
- 严谨专业的中文技术写作
- 客观第三人称视角
- 段落式叙述，逻辑连贯

[FOCUS]
- 外部集成拓扑：系统如何与外部世界（第三方API、数据库、中间件）交互？采用了何种适配器或防腐层设计来隔离外部变化？
- 核心依赖分析：区分"核心业务依赖"与"基础设施依赖"。系统对关键框架的依赖程度如何？是否存在被锁定的风险？
- 依赖注入与控制反转：系统内部模块间的组装方式是什么？是否实现了依赖倒置原则以支持可测试性？
- 供应链安全与治理：对于复杂的依赖树，系统采用了何种策略来管理版本和兼容性？

[CONSTRAINT]
- 禁止简单列出依赖配置文件的内容
- 必须分析依赖背后的"集成策略"和"风险控制模型"

[RETURN JSON]
{"status":"completed","output_file":"section-dependencies.md","summary":"<50字>","cross_module_notes":[],"stats":{}}
`
})
```

### Patterns Agent

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  prompt: `
[SPEC]
首先读取规范文件：
- Read: ${skillRoot}/specs/quality-standards.md
- Read: ${skillRoot}/specs/writing-style.md
严格遵循规范中的质量标准和段落式写作要求。

[ROLE] 核心开发规范制定者

[TASK]
挖掘代码中的复用机制和标准化实践，撰写《系统架构设计报告》的"设计模式与工程规范"章节。
输出: ${outDir}/sections/section-patterns.md

[STYLE]
- 严谨专业的中文技术写作
- 客观第三人称视角
- 段落式叙述，结合项目上下文

[FOCUS]
- 架构级模式：识别系统中广泛使用的架构模式（CQRS、Event Sourcing、Repository Pattern、Unit of Work）。阐述引入这些模式解决了什么特定难题
- 通信与并发模式：分析组件间的通信机制（同步/异步、观察者模式、发布订阅）以及并发控制策略
- 横切关注点实现：系统如何统一处理日志、鉴权、缓存、事务管理等横切逻辑（AOP、中间件管道、装饰器）？
- 抽象与复用策略：分析基类、泛型、工具类的设计思想，系统如何通过抽象来减少重复代码并提高一致性？

[CONSTRAINT]
- 避免教科书式地解释设计模式定义，必须结合当前项目上下文说明其应用场景
- 关注"解决类问题的通用机制"

[RETURN JSON]
{"status":"completed","output_file":"section-patterns.md","summary":"<50字>","cross_module_notes":[],"stats":{}}
`
})
```

### DataFlow Agent

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  prompt: `
[SPEC]
首先读取规范文件：
- Read: ${skillRoot}/specs/quality-standards.md
- Read: ${skillRoot}/specs/writing-style.md
严格遵循规范中的质量标准和段落式写作要求。

[ROLE] 数据架构师

[TASK]
追踪系统的数据流转机制，撰写《系统架构设计报告》的"数据流与状态管理"章节。
输出: ${outDir}/sections/section-dataflow.md

[STYLE]
- 严谨专业的中文技术写作
- 客观第三人称视角
- 段落式叙述

[FOCUS]
- 数据入口与出口：数据从何处进入系统，最终流向何处？边界处的数据校验和转换策略是什么？
- 数据转换管道：数据在各层/模块间经历了怎样的形态变化？DTO、Entity、VO 等数据对象的职责边界如何划分？
- 持久化策略：系统如何设计数据存储方案？采用了何种 ORM 策略或数据访问模式？
- 一致性保障：系统如何处理事务边界？分布式场景下如何保证数据一致性？

[CONSTRAINT]
- 关注数据的"生命周期"和"形态演变"
- 不要罗列数据库表结构

[RETURN JSON]
{"status":"completed","output_file":"section-dataflow.md","summary":"<50字>","cross_module_notes":[],"stats":{}}
`
})
```

### EntryPoints Agent

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  prompt: `
[SPEC]
首先读取规范文件：
- Read: ${skillRoot}/specs/quality-standards.md
- Read: ${skillRoot}/specs/writing-style.md
严格遵循规范中的质量标准和段落式写作要求。

[ROLE] 系统边界分析师

[TASK]
识别系统的入口设计和关键路径，撰写《系统架构设计报告》的"系统入口与调用链"章节。
输出: ${outDir}/sections/section-entrypoints.md

[STYLE]
- 严谨专业的中文技术写作
- 客观第三人称视角
- 段落式叙述

[FOCUS]
- 入口类型与职责：系统提供了哪些类型的入口（REST API、CLI、消息队列消费者、定时任务）？各入口的设计目的和适用场景是什么？
- 请求处理管道：从入口到核心逻辑，请求经过了怎样的处理管道？中间件/拦截器的编排逻辑是什么？
- 关键业务路径：最重要的几条业务流程的调用链是怎样的？关键节点的设计考量是什么？
- 异常与边界处理：系统如何统一处理异常？异常信息如何传播和转化？

[CONSTRAINT]
- 关注"入口的设计哲学"而非 API 清单
- 不要逐个列举所有端点

[RETURN JSON]
{"status":"completed","output_file":"section-entrypoints.md","summary":"<50字>","cross_module_notes":[],"stats":{}}
`
})
```

### Classes Agent

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  prompt: `
[SPEC]
首先读取规范文件：
- Read: ${skillRoot}/specs/quality-standards.md
- Read: ${skillRoot}/specs/writing-style.md
严格遵循规范中的质量标准和段落式写作要求。

[ROLE] 领域模型设计师

[TASK]
分析系统的类型体系和领域模型，撰写《系统架构设计报告》的"类型体系与领域建模"章节。
输出: ${outDir}/sections/section-classes.md

[STYLE]
- 严谨专业的中文技术写作
- 客观第三人称视角
- 段落式叙述

[FOCUS]
- 领域模型设计：系统的核心领域概念有哪些？它们之间的关系如何建模（聚合、实体、值对象）？
- 继承与组合策略：系统倾向于使用继承还是组合？基类/接口的设计意图是什么？
- 职责分配原则：类的职责划分遵循了什么原则？是否体现了单一职责原则？
- 类型安全与约束：系统如何利用类型系统来表达业务约束和不变量？

[CONSTRAINT]
- 关注"建模思想"而非类的属性列表
- 用 UML 类图辅助说明核心关系

[RETURN JSON]
{"status":"completed","output_file":"section-classes.md","summary":"<50字>","cross_module_notes":[],"stats":{}}
`
})
```

### Interfaces Agent

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  prompt: `
[SPEC]
首先读取规范文件：
- Read: ${skillRoot}/specs/quality-standards.md
- Read: ${skillRoot}/specs/writing-style.md
严格遵循规范中的质量标准和段落式写作要求。

[ROLE] 契约设计专家

[TASK]
分析系统的接口设计和抽象层次，撰写《系统架构设计报告》的"接口契约与抽象设计"章节。
输出: ${outDir}/sections/section-interfaces.md

[STYLE]
- 严谨专业的中文技术写作
- 客观第三人称视角
- 段落式叙述

[FOCUS]
- 抽象层次设计：系统定义了哪些核心接口/抽象类？这些抽象的设计意图和职责边界是什么？
- 契约与实现分离：接口如何隔离契约与实现？多态机制如何被运用？
- 扩展点设计：系统预留了哪些扩展点？如何在不修改核心代码的情况下扩展功能？
- 版本演进策略：接口如何支持版本演进？向后兼容性如何保障？

[CONSTRAINT]
- 关注"接口的设计哲学"
- 不要逐个列举接口方法签名

[RETURN JSON]
{"status":"completed","output_file":"section-interfaces.md","summary":"<50字>","cross_module_notes":[],"stats":{}}
`
})
```

### State Agent

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  prompt: `
[SPEC]
首先读取规范文件：
- Read: ${skillRoot}/specs/quality-standards.md
- Read: ${skillRoot}/specs/writing-style.md
严格遵循规范中的质量标准和段落式写作要求。

[ROLE] 状态管理架构师

[TASK]
分析系统的状态管理机制，撰写《系统架构设计报告》的"状态管理与生命周期"章节。
输出: ${outDir}/sections/section-state.md

[STYLE]
- 严谨专业的中文技术写作
- 客观第三人称视角
- 段落式叙述

[FOCUS]
- 状态模型设计：系统需要管理哪些类型的状态（会话状态、应用状态、领域状态）？状态的存储位置和作用域是什么？
- 状态生命周期：状态如何创建、更新、销毁？生命周期管理的机制是什么？
- 并发与一致性：多线程/多实例场景下，状态如何保持一致？采用了何种并发控制策略？
- 状态恢复与容错：系统如何处理状态丢失或损坏？是否有状态恢复机制？

[CONSTRAINT]
- 关注"状态管理的设计决策"
- 不要列举具体的变量名

[RETURN JSON]
{"status":"completed","output_file":"section-state.md","summary":"<50字>","cross_module_notes":[],"stats":{}}
`
})
```

### Algorithms Agent

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  prompt: `
[SPEC]
首先读取规范文件：
- Read: ${skillRoot}/specs/quality-standards.md
- Read: ${skillRoot}/specs/writing-style.md
严格遵循规范中的质量标准和段落式写作要求。

[ROLE] 算法架构师

[TASK]
分析系统的核心算法设计，撰写《系统架构设计报告》的"核心算法与计算模型"章节。
输出: ${outDir}/sections/section-algorithms.md

[STYLE]
- 严谨专业的中文技术写作
- 客观第三人称视角
- 段落式叙述

[FOCUS]
- 算法选型与权衡：系统的核心业务逻辑采用了哪些关键算法？选择这些算法的考量因素是什么（时间复杂度、空间复杂度、可维护性）？
- 计算模型设计：复杂计算如何被分解和组织？是否采用了流水线、Map-Reduce 等计算模式？
- 性能与可扩展性：算法设计如何考虑性能和可扩展性？是否有针对大数据量的优化策略？
- 正确性保障：关键算法的正确性如何保障？是否有边界条件的特殊处理？

[CONSTRAINT]
- 关注"算法思想"而非具体实现代码
- 用流程图辅助说明复杂逻辑

[RETURN JSON]
{"status":"completed","output_file":"section-algorithms.md","summary":"<50字>","cross_module_notes":[],"stats":{}}
`
})
```

### Paths Agent

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  prompt: `
[SPEC]
首先读取规范文件：
- Read: ${skillRoot}/specs/quality-standards.md
- Read: ${skillRoot}/specs/writing-style.md
严格遵循规范中的质量标准和段落式写作要求。

[ROLE] 性能架构师

[TASK]
分析系统的关键执行路径，撰写《系统架构设计报告》的"关键路径与性能设计"章节。
输出: ${outDir}/sections/section-paths.md

[STYLE]
- 严谨专业的中文技术写作
- 客观第三人称视角
- 段落式叙述

[FOCUS]
- 关键业务路径：系统中最重要的几条业务执行路径是什么？这些路径的设计目标和约束是什么？
- 性能敏感区域：哪些环节是性能敏感的？系统采用了何种优化策略（缓存、异步、批处理）？
- 瓶颈识别与缓解：潜在的性能瓶颈在哪里？设计中是否预留了扩展空间？
- 降级与熔断：在高负载或故障场景下，系统如何保护关键路径？

[CONSTRAINT]
- 关注"路径设计的战略考量"
- 不要罗列所有代码执行步骤

[RETURN JSON]
{"status":"completed","output_file":"section-paths.md","summary":"<50字>","cross_module_notes":[],"stats":{}}
`
})
```

### APIs Agent

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  prompt: `
[SPEC]
首先读取规范文件：
- Read: ${skillRoot}/specs/quality-standards.md
- Read: ${skillRoot}/specs/writing-style.md
严格遵循规范中的质量标准和段落式写作要求。

[ROLE] API 设计规范专家

[TASK]
分析系统的对外接口设计规范，撰写《系统架构设计报告》的"API 设计与规范"章节。
输出: ${outDir}/sections/section-apis.md

[STYLE]
- 严谨专业的中文技术写作
- 客观第三人称视角
- 段落式叙述

[FOCUS]
- API 设计风格：系统采用了何种 API 设计风格（RESTful、GraphQL、RPC）？选择该风格的原因是什么？
- 命名与结构规范：API 的命名、路径结构、参数设计遵循了什么规范？是否有一致性保障机制？
- 版本管理策略：API 如何支持版本演进？向后兼容性策略是什么？
- 错误处理规范：API 错误响应的设计规范是什么？错误码体系如何组织？

[CONSTRAINT]
- 关注"设计规范和一致性"
- 不要逐个列举所有 API 端点

[RETURN JSON]
{"status":"completed","output_file":"section-apis.md","summary":"<50字>","cross_module_notes":[],"stats":{}}
`
})
```

### Logic Agent

```javascript
Task({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  prompt: `
[SPEC]
首先读取规范文件：
- Read: ${skillRoot}/specs/quality-standards.md
- Read: ${skillRoot}/specs/writing-style.md
严格遵循规范中的质量标准和段落式写作要求。

[ROLE] 业务逻辑架构师

[TASK]
分析系统的业务逻辑建模，撰写《系统架构设计报告》的"业务逻辑与规则引擎"章节。
输出: ${outDir}/sections/section-logic.md

[STYLE]
- 严谨专业的中文技术写作
- 客观第三人称视角
- 段落式叙述

[FOCUS]
- 业务规则建模：核心业务规则如何被表达和组织？是否采用了规则引擎或策略模式？
- 决策点设计：系统中的关键决策点有哪些？决策逻辑如何被封装和测试？
- 边界条件处理：系统如何处理边界条件和异常情况？是否有防御性编程措施？
- 业务流程编排：复杂业务流程如何被编排？是否采用了工作流引擎或状态机？

[CONSTRAINT]
- 关注"业务逻辑的组织方式"
- 不要逐行解释代码逻辑

[RETURN JSON]
{"status":"completed","output_file":"section-logic.md","summary":"<50字>","cross_module_notes":[],"stats":{}}
`
})
```

---

## 执行流程

```javascript
// 1. 发现 exploration 文件并自动分配 agent
const explorationFiles = bash(`find ${sessionFolder} -name "exploration-*.json" -type f`)
  .split('\n')
  .filter(f => f.trim());

const agentAssignments = explorationFiles.map(file => {
  const angle = extractAngle(path.basename(file));
  const agentName = EXPLORATION_TO_AGENT[angle];
  return { exploration_file: file, angle, agent: agentName };
}).filter(a => a.agent);

// 2. 准备目录
Bash(`mkdir "${outputDir}\\sections"`);

// 3. 并行启动所有 Agent（传递 exploration 文件路径）
const results = await Promise.all(
  agentAssignments.map(assignment =>
    Task({
      subagent_type: "cli-explore-agent",
      run_in_background: false,
      description: `Analyze: ${assignment.agent}`,
      prompt: buildAgentPrompt(assignment, config, outputDir)
    })
  )
);

// 4. 收集简要返回信息
const summaries = results.map(r => JSON.parse(r));

// 5. 传递给 Phase 3.5 汇总 Agent
return { summaries, cross_notes: summaries.flatMap(s => s.cross_module_notes) };
```

### Agent Prompt 构建

```javascript
function buildAgentPrompt(assignment, config, outputDir) {
  const agentConfig = AGENT_CONFIGS[assignment.agent];
  return `
[CONTEXT]
**Exploration 文件**: ${assignment.exploration_file}
首先读取此文件获取 ${assignment.angle} 探索结果作为分析上下文。

[SPEC]
读取规范文件：
- Read: ${skillRoot}/specs/quality-standards.md
- Read: ${skillRoot}/specs/writing-style.md

[ROLE] ${agentConfig.role}

[TASK]
${agentConfig.task}
输出: ${outputDir}/sections/section-${assignment.agent}.md

[STYLE]
- 严谨专业的中文技术写作，专业术语保留英文
- 完全客观的第三人称视角，严禁"我们"、"开发者"
- 段落式叙述，采用"论点-论据-结论"结构
- 善用逻辑连接词体现设计推演过程

[FOCUS]
${agentConfig.focus}

[CONSTRAINT]
${agentConfig.constraint}

[RETURN JSON]
{"status":"completed","output_file":"section-${assignment.agent}.md","summary":"<50字>","cross_module_notes":[],"stats":{}}
`;
}
```

## Output

各 Agent 写入 `sections/section-xxx.md`，返回简要 JSON 供 Phase 3.5 汇总。
