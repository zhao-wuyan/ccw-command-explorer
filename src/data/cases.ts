// ============================================
// CCW 命令使用案例
// 基于帖子使用技巧重新梳理 - 2026-04-02
// ============================================
  
import type { CLIType } from './types';
  
export type CaseLevel = 1 | 2 | 3 | 4 | 'skill' | 'issue' | 'team' | 'ui' | 'memory' | 'session' | 'multi-cli';
  
export interface CaseStep {
  role: 'user' | 'system';
  content: string;
  type?: 'command' | 'response' | 'note' | 'result' | 'choice' | 'tip';
  highlight?: boolean;
}
  
export interface CaseCommand {
  cmd: string;
  cli?: CLIType;
  desc: string;
}

// Codex 专用内容接口
export interface CaseCodex {
  shared?: boolean;       // true = 与 Claude 共用相同命令和步骤，切换 Codex 时显示默认内容
  title?: string;         // 覆盖默认 title（当标题含 CLI 专有命令时需要）
  scenario?: string;      // 覆盖默认 scenario（当场景含 CLI 专有命令时需要）
  commands?: CaseCommand[];
  steps?: CaseStep[];
  tips?: string[];
}

export interface Case {
  id: string;
  title: string;        // 共用，不区分 CLI
  level: CaseLevel;
  category: string;     // 共用
  scenario: string;     // 共用
  commands: CaseCommand[];  // Claude 默认
  steps: CaseStep[];        // Claude 默认
  tips?: string[];          // Claude 默认
  prerequisites?: string[];
  successCriteria?: string[];
  estimatedTime?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  // Codex 内容（可选）
  // - 有 codex 字段: 切换到 Codex 时显示此案例
  //   - shared: true → 显示 Claude 的默认内容（命令相同）
  //   - 有 commands/steps → 显示 Codex 专用内容
  // - 无 codex 字段: 切换到 Codex 时隐藏此案例
  codex?: CaseCodex;
}
  
// ============================================
// 场景一：功能新增/变更 (从1→100日常开发)
// ============================================
export const FEATURE_CASES: Case[] = [
  {
    id: 'FEAT-001',
    title: '新增功能：analyze → plan → execute 标准流程',
    level: 1,
    category: '功能新增',
    scenario: '需求明确，按标准流程开发：先分析代码库，再规划任务，最后执行',
    commands: [
      { cmd: '/workflow:analyze-with-file', desc: '深度分析需求，探索代码库' },
      { cmd: '/workflow-lite-plan', desc: '轻量规划，生成任务列表' },
      { cmd: '/workflow-lite-execute', desc: '批量执行任务' },
      { cmd: '/workflow-lite-test-review', desc: '测试修复循环' },
    ],
    prerequisites: ['已安装 Claude Code Workflow', '需求描述清晰'],
    successCriteria: ['功能实现完整', '测试通过'],
    estimatedTime: '10-30 分钟',
    difficulty: 'easy',
    steps: [
      { role: 'user', content: '/workflow:analyze-with-file "给用户添加消息通知功能，支持站内信"', type: 'command' },
      { role: 'system', content: '┌─ 交互式协作分析 ────────────────────────────┐\n│ 📋 Phase 1: Topic Understanding              │\n│ 🧠 分析维度: 架构, 实现, 业务价值             │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📊 Phase 2: CLI 探索\n\n  🔍 代码库探索:\n    - src/notification/ 目录不存在\n    - 发现: 已有 EmailService，可复用\n\n  💡 技术方案建议:\n    - Notification 数据模型\n    - NotificationService 核心服务\n    - 站内信存储: PostgreSQL\n\n  📁 探索文件: .workflow/.analysis/ANL-notification/explorations.json', type: 'response' },
      { role: 'system', content: '📊 Phase 4: 综合结论\n\n  推荐任务:\n  1. Notification 数据模型\n  2. NotificationService 核心服务\n  3. REST API (/api/notifications)\n  4. 前端通知组件\n\n  📁 结论: .workflow/.analysis/ANL-notification/conclusions.json\n\n  🚪 下一步: [1]执行任务 [2]产出Issue [3]完成', type: 'response' },
      { role: 'user', content: '1', type: 'command' },
      { role: 'system', content: '🔄 自动流转到 workflow-lite-plan...\n\n┌─ Workflow-Lite-Plan ──────────────────────────┐\n│ 📋 已从 analyze-with-file 继承上下文         │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📋 执行计划:\n\n  TASK-001: Notification 数据模型 + 迁移\n  TASK-002: NotificationService 核心服务\n  TASK-003: /api/notifications 路由\n  TASK-004: NotificationBell 前端组件\n  TASK-005: 集成测试\n\n  确认执行?', type: 'choice' },
      { role: 'user', content: '是', type: 'command' },
      { role: 'system', content: '▶️ workflow-lite-execute 批量执行...\n\n  ☑️ [1/5] 数据模型 + 迁移... ✓\n  ☑️ [2/5] NotificationService... ✓\n  ☑️ [3/5] API 路由... ✓\n  ☑️ [4/5] 前端组件... ✓\n  ☑️ [5/5] 集成测试... ✓', type: 'response' },
      { role: 'system', content: '✅ 完成！\n\n  📁 新增文件: 8 个\n  📊 测试覆盖: 12 个场景\n\n💡 Claude: analyze → lite-plan → lite-execute → test-fix\n   Codex: analyze → csv-wave-pipeline', type: 'result', highlight: true },
    ],
    tips: [
      'Claude 路径: analyze → lite-plan → lite-execute → test-fix',
      'Codex 路径: analyze → csv-wave-pipeline',
      'analyze 环节单独摘出，深度探索代码库',
      '从分析到执行自动流转，保持信息连续性',
    ],
    // Codex 专用内容
    codex: {
      commands: [
        { cmd: '/analyze-with-file', desc: '深度分析需求' },
        { cmd: '/csv-wave-pipeline', desc: 'CSV Wave 流水线执行' },
      ],
      steps: [
        { role: 'user', content: '/analyze-with-file "给用户添加消息通知功能，支持站内信"', type: 'command' },
        { role: 'system', content: '┌─ Codex 分析模式 ────────────────────────────┐\n│ 📋 快速分析: 架构扫描 + 依赖检测             │\n│ 🎯 生成 CSV Wave 执行计划                    │\n└──────────────────────────────────────────────┘', type: 'response' },
        { role: 'system', content: '📊 分析结果:\n\n  模块: Notification\n  依赖: 无 (新模块)\n  文件预估: 8 个\n\n  📁 产出: .waves/wave-plan.csv', type: 'response' },
        { role: 'user', content: '/csv-wave-pipeline', type: 'command' },
        { role: 'system', content: '🌊 CSV Wave Pipeline 执行中...\n\n  Wave 1: 基础设施\n    ☑️ 数据模型 + 迁移... ✓\n    ☑️ 核心服务... ✓\n\n  Wave 2: API 层\n    ☑️ REST 路由... ✓\n\n  Wave 3: 前端\n    ☑️ 通知组件... ✓\n\n  Wave 4: 测试\n    ☑️ 集成测试... ✓', type: 'response' },
        { role: 'system', content: '✅ 完成！\n\n  📁 新增文件: 8 个\n  📊 测试覆盖: 12 个场景\n\n💡 Codex: analyze → csv-wave-pipeline 一条命令搞定', type: 'result', highlight: true },
      ],
      tips: [
        'Codex 路径: analyze → csv-wave-pipeline（一条命令搞定）',
        'CSV Wave 按 Wave 分批执行，每批独立 commit',
        '适合快速迭代，减少交互步骤',
      ],
    },
  },
  {
    id: 'FEAT-002',
    title: '功能变更：用 team-lifecycle-v4 全流程搞定',
    level: 1,
    category: '功能变更',
    scenario: '需求描述后直接交给团队技能，自动完成分析→规划→开发→测试→审查全流程',
    commands: [
      { cmd: '/team-lifecycle-v4', desc: '团队全生命周期 - 分析→规划→开发→测试→审查' },
    ],
    prerequisites: ['已安装 Claude Code Workflow'],
    successCriteria: ['功能完整实现', '测试通过', '代码审查通过'],
    estimatedTime: '30-60 分钟',
    difficulty: 'easy',
    steps: [
      { role: 'user', content: '/team-lifecycle-v4 "修改订单导出功能，支持 Excel 和 CSV 两种格式"', type: 'command' },
      { role: 'system', content: '┌─ 团队全生命周期 v4 ─────────────────────────┐\n│ 👥 角色分工:                                 │\n│  📊 分析师 — 需求分析                        │\n│  📋 规划师 — 任务拆解                        │\n│  💻 执行者 — 代码实现                        │\n│  🧪 测试者 — 测试验证                        │\n│  👀 审查者 — 代码审查                        │\n│  🚀 监督者 — 质量把关                        │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📊 [分析师] 需求分析:\n\n  现有功能: 订单导出 (仅 CSV)\n  变更内容: 增加 Excel 格式支持\n  涉及模块: src/services/export.service.ts\n\n📋 [规划师] 任务拆解:\n\n  IMPL-001: 安装 exceljs 依赖\n  IMPL-002: ExcelExportService 实现\n  IMPL-003: 修改导出 API 支持格式参数\n  IMPL-004: 前端格式选择器\n  IMPL-005: 测试用例补充', type: 'response' },
      { role: 'system', content: '💻 [执行者] 代码实现中...\n🧪 [测试者] 测试验证中...\n👀 [审查者] 代码审查中...', type: 'note' },
      { role: 'system', content: '✅ team-lifecycle-v4 完成！\n\n📊 执行统计:\n   - 实现任务: 5 个\n   - 测试: 18 个用例，覆盖率 92%\n   - 代码审查: 通过\n\n📁 新增/修改: 6 个文件\n\n💡 适合 0→1 或功能新增，一条命令全流程', type: 'result', highlight: true },
    ],
    tips: [
      'Claude: /team-lifecycle-v4 "需求或bug"',
      'Codex: /team-lifecycle-v4 "需求或bug"',
      '一条命令完成全流程，适合 0→1 或功能变更',
      'CCW team skill 是目前最稳定的工作流',
    ],
    // Claude 和 Codex 使用相同命令，标记 shared 让 Codex 也显示
    codex: { shared: true },
  },
];
  
// ============================================
// 场景二：Bug 修复
// ============================================
export const BUG_CASES: Case[] = [
  {
    id: 'BUG-001',
    title: 'Bug 修复：假设驱动自动诊断',
    level: 2,
    category: 'Bug修复',
    scenario: '遇到 Bug 用 debug-with-file，自动打日志、生成假设、验证根因、修复问题',
    commands: [
      { cmd: '/workflow:debug-with-file', desc: '假设驱动调试 - 自动诊断修复 (Claude)' },
    ],
    prerequisites: ['有 Bug 描述或复现步骤'],
    successCriteria: ['根因定位', '修复验证通过'],
    estimatedTime: '5-15 分钟',
    difficulty: 'easy',
    steps: [
      { role: 'user', content: '/workflow:debug-with-file "WebSocket 连接在生产环境随机断开"', type: 'command' },
      { role: 'system', content: '┌─ 假设驱动调试 ──────────────────────────────┐\n│ 🔍 分析问题: WebSocket 偶发断连             │\n│ 📋 生成假设列表...                           │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📋 假设列表:\n\n  [1] 心跳超时配置不一致\n  [2] Nginx 代理超时断开连接\n  [3] 服务端内存泄露\n  [4] 负载均衡 Session 未共享\n\n请选择优先验证的假设 (1-4):', type: 'note' },
      { role: 'user', content: '2', type: 'command' },
      { role: 'system', content: '🔍 验证假设 [2]: Nginx 代理超时\n\n  检查 nginx.conf:\n    proxy_read_timeout = 60s  ← 发现!\n    WebSocket 心跳间隔 = 30s\n\n  分析: 60s 无数据传输时 Nginx 主动断开\n  根因: 心跳间隔不足以维持连接', type: 'response' },
      { role: 'system', content: '🔧 修复方案:\n\n  方案 A: 增加 Nginx proxy_read_timeout\n  方案 B: 客户端每 25s 发送 ping (推荐)\n\n选择:', type: 'note' },
      { role: 'user', content: 'B', type: 'command' },
      { role: 'system', content: '✅ 修复完成！\n\n  修改: src/websocket/client.ts\n  新增: 每 25s 发送 ping 保活\n\n  📁 调试报告: .workflow/.debug/DBG-WS/debug-report.md', type: 'result', highlight: true },
    ],
    tips: [
      'Claude: /workflow:debug-with-file "问题描述"',
      'Codex: /debug-with-file "问题描述"',
      '自动打日志分析，解决 bug 简单强力',
      '科学的假设-验证方法论，过程文档化',
    ],
    // Codex 专用内容
    codex: {
      commands: [
        { cmd: '/debug-with-file', desc: '假设驱动调试 - 自动诊断修复 (Codex)' },
      ],
      steps: [
        { role: 'user', content: '/debug-with-file "WebSocket 连接在生产环境随机断开"', type: 'command' },
        { role: 'system', content: '┌─ Codex 调试模式 ────────────────────────────┐\n│ 🤖 自动诊断 + 快速修复                       │\n└──────────────────────────────────────────────┘', type: 'response' },
        { role: 'system', content: '📋 自动假设验证:\n\n  [1] 心跳超时 ✗\n  [2] Nginx 代理超时 ✓ 根因确认\n  [3] 内存泄露 ✗\n  [4] Session 未共享 ✗', type: 'response' },
        { role: 'system', content: '🔧 自动修复:\n\n  方案: 客户端 ping 保活\n  修改: src/websocket/client.ts\n\n  📁 调试报告: .workflow/.debug/DBG-WS/', type: 'result', highlight: true },
      ],
      tips: [
        'Codex: /debug-with-file "问题"',
        '自动验证假设，减少手动选择',
        '快速定位 + 自动修复',
      ],
    },
  },
];
  
// ============================================
// 场景三：从0→1开发
// ============================================
export const ZERO_TO_ONE_CASES: Case[] = [
  {
    id: 'ZTO-001',
    title: '只有想法：头脑风暴 → 规划 → 执行',
    level: 3,
    category: '从0→1开发',
    scenario: '只有一个想法，不确定怎么做。先头脑风暴发散，再规划收敛，最后执行实现',
    commands: [
      { cmd: '/brainstorm', desc: '头脑风暴 - 多角色发散分析' },
      { cmd: '/spec-generator', desc: '规格文档生成 - PRD/架构/API' },
      { cmd: '/workflow-plan', desc: '详细规划' },
      { cmd: '/workflow-execute', desc: '按计划执行' },
    ],
    prerequisites: ['有初步想法或需求方向'],
    successCriteria: ['产品落地', '功能可用'],
    estimatedTime: '1-3 小时',
    difficulty: 'medium',
    steps: [
      { role: 'user', content: '/brainstorm "做一个智能记账 App，自动识别消费类型"', type: 'command' },
      { role: 'system', content: '┌─ 头脑风暴 ───────────────────────────────────┐\n│ 🎭 多角色并行分析...                         │\n│  📐 系统架构师  💻 开发者  🎨 产品经理        │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📐 架构师: 前端 React Native + 后端 NestJS\n   OCR 识别: 腾讯云/阿里云 API\n   数据存储: PostgreSQL + Redis 缓存\n\n💻 开发者: 模块拆分\n   - 账单 OCR 识别服务\n   - 消费分类 ML 模型\n   - 用户记账 CRUD\n   - 统计分析报表\n\n🎨 产品经理: MVP 功能清单\n   - 拍照识别账单\n   - 自动分类 + 手动调整\n   - 月度消费报表', type: 'response' },
      { role: 'system', content: '📁 产出: .workflow/.brainstorm/BS-记账App/brainstorm.md\n\n💡 下一步:\n   [1] /spec-generator 生成正式规格文档\n   [2] /workflow-plan 直接规划实现\n   [3] /team-lifecycle-v4 全流程开发', type: 'result' },
      { role: 'user', content: '/spec-generator "智能记账App" --from-brainstorm', type: 'command' },
      { role: 'system', content: '┌─ Spec Generator ─────────────────────────────┐\n│ 📖 读取 brainstorm.md 提取需求...             │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '✅ 规格文档已生成:\n\n  ✓ product-brief.md  — 产品定位\n  ✓ PRD.md            — 功能规格 + 用户故事\n  ✓ architecture.md   — 系统架构 + 技术选型\n  ✓ api-spec.md       — API 接口定义\n\n  📁 存储: specs/smart-billing/', type: 'response' },
      { role: 'user', content: '/workflow-plan', type: 'command' },
      { role: 'system', content: '📋 实现计划 (WFS-智能记账):\n\n  Phase 1: 基础架构\n    IMPL-001: 项目初始化 (NestJS + React Native)\n    IMPL-002: 数据库设计\n\n  Phase 2: 核心功能\n    IMPL-003: OCR 识别服务\n    IMPL-004: 消费分类服务\n    IMPL-005: 记账 CRUD\n\n  Phase 3: 用户界面\n    IMPL-006: 移动端首页\n    IMPL-007: 拍照识别页\n    IMPL-008: 统计报表页\n\n确认后执行?', type: 'response' },
      { role: 'user', content: '是', type: 'command' },
      { role: 'system', content: '✅ 全流程完成！\n\n  📁 产出文件: 32 个\n  📊 测试覆盖: 78 个用例\n  🎯 MVP 功能全部实现\n\n💡 头脑风暴→规格→规划→执行，完整链路', type: 'result', highlight: true },
    ],
    tips: [
      '只有想法时: brainstorm → spec-generator → workflow-plan → execute',
      '想法明确时: spec-generator → workflow-plan → execute',
      '需求文档明确时: workflow-plan → execute',
      '建议清除会话后再执行 workflow-plan，避免上下文过长',
    ],
    // Codex 专用内容
    codex: {
      commands: [
        { cmd: '/brainstorm', desc: '头脑风暴 - 多角色发散分析' },
        { cmd: '/spec-generator', desc: '规格文档生成' },
        { cmd: '/workflow-plan', desc: '详细规划' },
        { cmd: '/workflow-execute', desc: '按计划执行' },
      ],
      steps: [
        { role: 'user', content: '/brainstorm "做一个智能记账 App，自动识别消费类型"', type: 'command' },
        { role: 'system', content: '┌─ Codex 头脑风暴 ─────────────────────────────┐\n│ 🤖 快速发散 + 自动收敛                       │\n└──────────────────────────────────────────────┘', type: 'response' },
        { role: 'system', content: '📐 架构: React Native + NestJS + OCR API\n💻 模块: OCR识别 | 分类ML | 记账CRUD | 报表\n🎨 MVP: 拍照识别 | 自动分类 | 月度报表\n\n📁 产出: .workflow/.brainstorm/BS-记账App/', type: 'response' },
        { role: 'user', content: '/spec-generator "智能记账App" --from-brainstorm', type: 'command' },
        { role: 'system', content: '✅ 规格文档:\n  ✓ PRD.md\n  ✓ architecture.md\n  ✓ api-spec.md\n\n  📁 存储: specs/smart-billing/', type: 'response' },
        { role: 'user', content: '/workflow-plan && /workflow-execute', type: 'command' },
        { role: 'system', content: '✅ 全流程完成！\n\n  📁 文件: 32个\n  📊 测试: 78用例\n\n💡 /brainstorm → /spec-generator → /workflow-plan → /workflow-execute', type: 'result', highlight: true },
      ],
      tips: [
        'Codex: /brainstorm → /spec-generator → /workflow-plan → /workflow-execute',
        '可链式执行: /workflow-plan && /workflow-execute',
        '快速迭代，减少交互',
      ],
    },
  },
  {
    id: 'ZTO-002',
    title: '需求文档明确：直接规划执行',
    level: 3,
    category: '从0→1开发',
    scenario: '已有详细的需求文档或 PRD，直接用 workflow-plan 制定实现计划，然后 execute 执行',
    commands: [
      { cmd: '/workflow-plan', desc: '读取需求文档，制定实现计划' },
      { cmd: '/workflow-execute', desc: '按计划逐步执行' },
    ],
    prerequisites: ['有需求文档或 PRD'],
    successCriteria: ['按需求实现功能', '测试通过'],
    estimatedTime: '30-60 分钟',
    difficulty: 'medium',
    steps: [
      { role: 'user', content: '/workflow-plan\n\n需求: 实现用户积分系统\n- 用户行为获得积分 (登录、购买、分享)\n- 积分等级和权益\n- 积分商城兑换\n- 积分明细记录', type: 'command' },
      { role: 'system', content: '┌─ Workflow Plan ──────────────────────────────┐\n│ 📖 解析需求文档...                           │\n│ 🧠 制定实现计划...                           │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📋 实现计划 (WFS-积分系统):\n\n  Phase 1: 数据层\n    IMPL-001: Point 数据模型 + 迁移\n    IMPL-002: PointRule 规则引擎\n    IMPL-003: PointRecord 明细表\n\n  Phase 2: 业务层\n    IMPL-004: PointService 核心服务\n    IMPL-005: PointLevel 等级计算\n    IMPL-006: PointExchange 积分兑换\n\n  Phase 3: API 层\n    IMPL-007: REST API 设计\n    IMPL-008: 管理后台接口\n\n  Phase 4: 前端\n    IMPL-009: 积分中心页面\n    IMPL-010: 积分商城页面\n\n  📁 存储: .workflow/sessions/WFS-积分系统/', type: 'response' },
      { role: 'user', content: '/workflow-execute', type: 'command' },
      { role: 'system', content: '▶️ 执行计划中...\n\n  ☑️ [1/10] Point 数据模型... git commit ✓\n  ☑️ [2/10] PointRule 规则引擎... git commit ✓\n  ☑️ [3/10] PointRecord 明细... git commit ✓\n  ...\n  ☑️ [10/10] 积分商城页面... git commit ✓', type: 'response' },
      { role: 'system', content: '✅ 完成！\n\n  📁 新增文件: 18 个\n  📊 测试覆盖: 45 个用例，覆盖率 89%\n  🔧 每个任务独立 git commit\n\n💡 需求文档 → workflow-plan → workflow-execute', type: 'result', highlight: true },
    ],
    tips: [
      '需求文档直接粘贴给 workflow-plan',
      'Codex: 需求文档 → /workflow-plan → /workflow-execute',
      '每个任务独立 commit，方便 review 和回滚',
    ],
    // Codex 专用内容
    codex: {
      commands: [
        { cmd: '/workflow-plan', desc: '读取需求文档，制定实现计划' },
        { cmd: '/workflow-execute', desc: '按计划逐步执行' },
      ],
      steps: [
        { role: 'user', content: '/workflow-plan\n\n需求: 实现用户积分系统\n- 用户行为获得积分 (登录、购买、分享)\n- 积分等级和权益\n- 积分商城兑换\n- 积分明细记录', type: 'command' },
        { role: 'system', content: '┌─ Codex 规划模式 ─────────────────────────────┐\n│ 🤖 快速解析 + 自动拆解                       │\n└──────────────────────────────────────────────┘', type: 'response' },
        { role: 'system', content: '📋 计划 (WFS-积分系统):\n\n  Phase 1: 数据层\n    IMPL-001: Point 数据模型\n    IMPL-002: PointRule 规则引擎\n    IMPL-003: PointRecord 明细表\n\n  Phase 2: 业务层\n    IMPL-004: PointService 核心服务\n    IMPL-005: PointLevel 等级计算\n    IMPL-006: PointExchange 积分兑换\n\n  Phase 3: API 层\n    IMPL-007: REST API 设计\n    IMPL-008: 管理后台接口\n\n  Phase 4: 前端\n    IMPL-009: 积分中心页面\n    IMPL-010: 积分商城页面', type: 'response' },
        { role: 'user', content: '/workflow-execute', type: 'command' },
        { role: 'system', content: '▶️ 执行中...\n\n  ☑️ [1/10] Point 数据模型... ✓\n  ☑️ [2/10] PointRule 规则引擎... ✓\n  ...\n  ☑️ [10/10] 积分商城页面... ✓', type: 'response' },
        { role: 'system', content: '✅ 完成！\n\n  📁 文件: 18个\n  📊 测试: 45用例, 89%覆盖\n\n💡 /workflow-plan → /workflow-execute', type: 'result', highlight: true },
      ],
      tips: [
        'Codex: /workflow-plan → /workflow-execute',
        '可链式: /workflow-plan && /workflow-execute',
        '每个任务独立 commit',
      ],
    },
  },
];
  
// ============================================
// 场景四：全自动交付
// ============================================
export const AUTO_CASES: Case[] = [
  {
    id: 'AUTO-001',
    title: '全自动：复杂需求用 ccw-coordinator',
    level: 4,
    category: '全自动交付',
    scenario: '复杂想法或需求，用 ccw-coordinator 自动分析意图、编排命令链、一键交付',
    commands: [
      { cmd: '/ccw-coordinator', desc: '复杂需求编排 - 分析→推荐命令链→执行' },
    ],
    prerequisites: ['已安装 Claude Code Workflow'],
    successCriteria: ['需求完整交付'],
    estimatedTime: '自动',
    difficulty: 'easy',
    steps: [
      { role: 'user', content: '/ccw-coordinator "重构整个支付模块，支持多渠道、高并发、幂等防重"', type: 'command' },
      { role: 'system', content: '┌─ CCW 命令编排器 ────────────────────────────┐\n│ 🧠 分析需求: 大型重构，多模块，高复杂度      │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📋 推荐命令链:\n\n  方案 A: 渐进式重构 (推荐)\n  ┌─────────────────────────────────────────┐\n  │  /workflow:analyze-with-file            │\n  │  → /workflow-wave-plan                  │\n  │  → 自动执行 + 测试修复                  │\n  └─────────────────────────────────────────┘\n  适合: 大型重构，需要探索代码库\n\n  方案 B: 团队协作\n  ┌─────────────────────────────────────────┐\n  │  /team-arch-opt "支付模块重构"           │\n  └─────────────────────────────────────────┘\n  适合: 需要多角色分工\n\n选择方案:', type: 'note' },
      { role: 'user', content: 'A', type: 'command' },
      { role: 'system', content: '🔄 启动渐进式重构...\n\n  [1/3] /workflow:analyze-with-file\n  ─────────────────────────────────────────\n  📊 分析支付模块...\n  发现: 6 个核心模块, 15 处耦合\n\n  [2/3] /workflow-wave-plan\n  ─────────────────────────────────────────\n  🌊 Wave 1: 探索现有代码\n  🌊 Wave 2: 设计新架构\n  🌊 Wave 3: 逐步迁移\n\n  [3/3] 自动执行\n  ─────────────────────────────────────────\n  ✅ 重构完成，测试通过', type: 'response' },
      { role: 'system', content: '✅ 全自动交付完成！\n\n📊 重构统计:\n   - 模块解耦: 15 → 3\n   - 新增渠道: 微信/支付宝/信用卡\n   - 并发支持: 1000 QPS\n   - 幂等防重: 已实现\n\n💡 复杂需求交给 ccw-coordinator，自动编排最优路径', type: 'result', highlight: true },
    ],
    tips: [
      '/ccw-coordinator "复杂想法需求" — 0→1 大型需求',
      '/ccw "中等规模需求" — 功能新增或变更',
      '自动分析意图，推荐最佳命令链',
    ],
    // Codex 专用内容 - 只有 /team-lifecycle-v4
    codex: {
      title: '全自动：复杂需求用 team-lifecycle-v4',
      scenario: '复杂想法或需求，用 team-lifecycle-v4 团队全流程自动分析、规划、执行、测试、审查',
      commands: [
        { cmd: '/team-lifecycle-v4', desc: 'Codex 全流程 - 一条命令完成复杂需求' },
      ],
      steps: [
        { role: 'user', content: '/team-lifecycle-v4 "重构整个支付模块，支持多渠道、高并发、幂等防重"', type: 'command' },
        { role: 'system', content: '┌─ Codex 团队模式 ────────────────────────────┐\n│ 🤖 全自动: 分析→规划→执行→测试→审查           │\n└──────────────────────────────────────────────┘', type: 'response' },
        { role: 'system', content: '📊 [分析师] 支付模块扫描...\n\n  模块: 6个 | 耦合: 15处\n  渠道: 微信 | 支付宝 | 信用卡\n\n📋 [规划师] Wave 拆解:\n\n  Wave 1: 解耦核心模块\n  Wave 2: 渠道适配器\n  Wave 3: 并发优化\n  Wave 4: 幂等防重\n  Wave 5: 测试覆盖', type: 'response' },
        { role: 'system', content: '✅ Codex 全流程完成！\n\n📊 重构统计:\n   - 模块解耦: 15 → 3\n   - 新增渠道: 微信/支付宝/信用卡\n   - 并发支持: 1000 QPS\n   - 幂等防重: 已实现\n\n💡 /team-lifecycle-v4 一条命令搞定复杂需求', type: 'result', highlight: true },
      ],
      tips: [
        'Codex: /team-lifecycle-v4 "复杂需求"',
        '全自动化执行，无需手动选择',
        '适合 0→1 大型需求',
      ],
    },
  },
  {
    id: 'AUTO-002',
    title: '全自动：中等需求用 ccw 一键搞定',
    level: 4,
    category: '全自动交付',
    scenario: '中等规模的功能新增或变更，直接用 /ccw 一条命令搞定',
    commands: [
      { cmd: '/ccw', desc: '主入口 - 语义分析，自动路由' },
    ],
    prerequisites: ['已安装 Claude Code Workflow'],
    successCriteria: ['需求完成'],
    estimatedTime: '自动',
    difficulty: 'easy',
    steps: [
      { role: 'user', content: '/ccw "给用户中心增加头像上传功能，支持裁剪和压缩"', type: 'command' },
      { role: 'system', content: '┌─ CCW 智能路由 ──────────────────────────────┐\n│ 🧠 分析意图: 功能新增，中等复杂度            │\n│ 🎯 选择路径: analyze → lite-plan → execute  │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '⚡ 自动执行中...\n\n  📋 任务分解:\n    1. OSS 存储配置\n    2. 图片上传 API\n    3. 图片裁剪服务 (Sharp)\n    4. 前端头像组件\n    5. 测试用例\n\n  ▶️ 执行:\n    ☑️ [1/5] OSS 配置... ✓\n    ☑️ [2/5] 上传 API... ✓\n    ☑️ [3/5] 裁剪服务... ✓\n    ☑️ [4/5] 前端组件... ✓\n    ☑️ [5/5] 测试... ✓', type: 'response' },
      { role: 'system', content: '✅ 完成！\n\n  📁 新增文件: 6 个\n  🎯 头像上传功能可用\n\n💡 /ccw 自动判断复杂度，选择最优路径', type: 'result', highlight: true },
    ],
    tips: [
      '/ccw "需求描述" — 最简单的入口',
      '自动判断简单/中等/复杂，选择对应流程',
      '日常开发首选入口',
    ],
    // Codex 没有中等规模的独立命令（帖子中 Codex 全自动交付只有 /team-lifecycle-v4）
    // 不设置 codex 字段 → 切换到 Codex 时此案例被隐藏
  },
];
  
// ============================================
// 场景五：规范系统
// ============================================
export const SPEC_CASES: Case[] = [
  {
    id: 'SPEC-001',
    title: '初始化项目规范',
    level: 'skill',
    category: '规范系统',
    scenario: '用 spec 系统约束项目按自定义风格开发，自动加载规范到工作流',
    commands: [
      { cmd: '/workflow:spec:setup', desc: '初始化规范系统' },
      { cmd: '/workflow:spec:add', desc: '添加规范条目' },
    ],
    steps: [
      { role: 'user', content: '/workflow:spec:setup', type: 'command' },
      { role: 'system', content: '┌─ 规范系统初始化 ────────────────────────────┐\n│ 📁 创建目录: specs/                          │\n│ 📋 生成模板文件...                           │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '✅ 初始化完成！\n\n  📁 创建文件:\n    - specs/coding-conventions.md\n    - specs/architecture.md\n    - specs/project-tech.md\n\n  💡 工作流执行时会自动加载这些规范', type: 'response' },
      { role: 'user', content: '/workflow:spec:add "使用 async/await 代替 callback，禁止 var 声明"', type: 'command' },
      { role: 'system', content: '✅ 规范已添加！\n\n  类型: coding-convention\n  内容: 使用 async/await 代替 callback，禁止 var 声明\n\n  📁 存储: specs/coding-conventions.md\n  🔄 后续工作流会自动应用此规范', type: 'result', highlight: true },
    ],
    tips: [
      '/workflow:spec:setup 完整初始化',
      '/workflow:spec:add "规范内容" 添加条目',
      '规范会自动分配加载阶段，工作流执行时自动应用',
    ],
  },
];
  
// ============================================
// 场景六：通用团队协调
// ============================================
export const TEAM_COORD_CASES: Case[] = [
  {
    id: 'TEAM-COORD-001',
    title: '通用协调：动态角色生成',
    level: 'team',
    category: '通用协调',
    scenario: '通过 team-coordinate 实现任务分解、角色生成及自动委派，中间产物自动流转',
    commands: [
      { cmd: '/team-coordinate', desc: '通用团队协调 - 动态角色生成' },
    ],
    steps: [
      { role: 'user', content: '/team-coordinate "将 MySQL 迁移到 PostgreSQL，零停机"', type: 'command' },
      { role: 'system', content: '┌─ 团队协调 ─────────────────────────────────┐\n│ 📋 分析需求，动态生成角色...                 │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '🎭 动态生成专属角色:\n\n  .workflow/.team/db-migration/roles/\n  ├── db-analyst.md      # 数据库分析专家\n  ├── migration-dev.md   # 迁移工程师\n  ├── compat-tester.md   # 兼容性测试员\n  └── rollback-guard.md  # 回滚守卫', type: 'response' },
      { role: 'system', content: '🔍 [db-analyst] 扫描 87 张表，发现 23 处 MySQL 专有语法...\n🔧 [migration-dev] 生成 3 阶段零停机方案...\n🧪 [compat-tester] 312 项兼容性测试通过...\n🛡️ [rollback-guard] 回滚演练通过，<30s 恢复', type: 'response' },
      { role: 'system', content: '✅ 迁移方案完成！\n\n  📊 统计:\n    - 4 个专属角色 (自动生成)\n    - 风险点 23 个，全部处理\n    - 预计停机: 0 分钟\n\n  🎭 角色规格可复用于下次迁移', type: 'result', highlight: true },
    ],
    tips: [
      '/team-coordinate "任意任务" — 自动分解、生成角色、委派执行',
      '根据需求查找最相近的 team skill',
      '角色规格可跨项目复用',
    ],
    codex: { shared: true },
  },
];
  
// ============================================
// Issue 工作流案例 (保留精简)
// ============================================
export const ISSUE_CASES: Case[] = [
  {
    id: 'ISSUE-001',
    title: 'Issue 发现与批量处理',
    level: 'issue',
    category: 'Issue管理',
    scenario: '多角度发现项目问题并批量解决',
    commands: [
      { cmd: '/issue:discover', desc: '多角度发现问题' },
      { cmd: '/issue:plan', desc: '规划解决方案' },
      { cmd: '/issue:queue', desc: '形成执行队列' },
      { cmd: '/issue:execute', desc: '执行解决方案' },
    ],
    steps: [
      { role: 'user', content: '/issue:discover', type: 'command' },
      { role: 'system', content: '┌─ 8维度扫描 ─────────────────────────────────┐\n│  Bug风险(3) 安全(1) 性能(2) UX(1)           │\n│  测试(4) 代码质量(2) 可维护(1) 最佳实践(2)  │\n│  总计: 16 个潜在问题                         │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'user', content: '/issue:plan --all-pending', type: 'command' },
      { role: 'system', content: '✓ 16 个 Issue 规划完成', type: 'response' },
      { role: 'user', content: '/issue:queue', type: 'command' },
      { role: 'user', content: '/issue:execute', type: 'command' },
      { role: 'system', content: '✅ 16 个问题全部解决！', type: 'result', highlight: true },
    ],
    tips: ['8维度全面扫描', '自动评估严重程度', '批量规划执行'],
  },
  {
    id: 'ISSUE-002',
    title: '头脑风暴转 Issue 执行',
    level: 'issue',
    category: 'Issue工作流',
    scenario: '将头脑风暴结果转为可执行的 Issue 队列',
    commands: [
      { cmd: '/issue:from-brainstorm', desc: '从头脑风暴创建 Issue' },
      { cmd: '/issue:queue', desc: '形成执行队列' },
      { cmd: '/issue:execute', desc: '执行 Issue' },
    ],
    steps: [
      { role: 'user', content: '/issue:from-brainstorm', type: 'command' },
      { role: 'system', content: '📁 来源: .workflow/.brainstorm/BS-通知系统/\n🤖 自动提取任务点...', type: 'response' },
      { role: 'system', content: '📋 创建 Issue:\n  ☑️ Issue-1: 消息队列基础设施 (依赖: 无)\n  ☑️ Issue-2: 渠道适配器接口 (依赖: Issue-1)\n  ☑️ Issue-3: 用户偏好服务 (依赖: 无)\n  ☑️ Issue-4: 发送服务与重试 (依赖: 1,2)\n  ☑️ Issue-5: 安全机制 (依赖: Issue-4)', type: 'response' },
      { role: 'user', content: '/issue:queue', type: 'command' },
      { role: 'system', content: '📌 批次 1 (并行): Issue-1 + Issue-3\n📌 批次 2: Issue-2\n📌 批次 3: Issue-4\n📌 批次 4: Issue-5', type: 'response' },
      { role: 'user', content: '/issue:execute', type: 'command' },
      { role: 'system', content: '✅ 全部 5 个 Issue 已完成！\n每个 Issue 单独 git commit', type: 'result', highlight: true },
    ],
    tips: ['自动提取头脑风暴中的任务', '按依赖排序执行队列', '每个 Issue 单独 git commit'],
  },
];
  
// ============================================
// UI 设计案例 (保留精简)
// ============================================
export const UI_CASES: Case[] = [
  {
    id: 'UI-001',
    title: 'UI 设计从零开始',
    level: 'ui',
    category: 'UI设计',
    scenario: '根据需求自动生成 UI 原型',
    commands: [
      { cmd: '/workflow:ui-design:explore-auto', desc: '探索式 UI 设计' },
      { cmd: '/workflow:ui-design:generate', desc: '组装 UI 原型' },
    ],
    steps: [
      { role: 'user', content: '/workflow:ui-design:explore-auto "设计任务管理仪表盘"', type: 'command' },
      { role: 'system', content: '📋 设计需求分析:\n\n  核心功能:\n    - 任务统计卡片\n    - 今日任务列表\n    - 快速添加任务\n\n  🎨 自动提取设计系统:\n    - Primary: #6366f1\n    - 字体: Inter', type: 'response' },
      { role: 'user', content: '/workflow:ui-design:generate', type: 'command' },
      { role: 'system', content: '✅ UI 原型生成完成！\n\n📁 产出:\n   - src/components/Dashboard/StatsCard.tsx\n   - src/components/Dashboard/TaskList.tsx\n   - src/styles/design-tokens.css', type: 'result', highlight: true },
    ],
    tips: ['自动分析设计需求', '提取设计系统', '生成可运行代码'],
  },
];
  
// ============================================
// 记忆系统案例 (保留精简)
// ============================================
export const MEMORY_CASES: Case[] = [
  {
    id: 'MEM-001',
    title: '会话记忆压缩',
    level: 'memory',
    category: '记忆系统',
    scenario: '压缩长会话为结构化笔记',
    commands: [
      { cmd: '/memory-capture', desc: '压缩会话记忆' },
    ],
    steps: [
      { role: 'user', content: '/memory-capture', type: 'command' },
      { role: 'system', content: '📊 当前会话: 15,234 tokens\n🔄 压缩中...', type: 'response' },
      { role: 'system', content: '📋 压缩结果:\n\n  🎯 目标: 实现 OAuth2 认证\n  📝 进度: 3/6 完成\n  💡 决策: JWT session, 7天 Refresh Token\n  ⚠️ 待解决: CSRF state 验证', type: 'response' },
      { role: 'system', content: '✅ 压缩完成！\n\n  15,234 → 1,856 tokens (87.8%)\n  📁 保存: .workflow/memory/session-compact.md', type: 'result', highlight: true },
    ],
    tips: ['压缩长会话', '保留关键信息', '方便下次恢复'],
  },
];
  
// ============================================
// 会话管理案例 (保留精简)
// ============================================
export const SESSION_CASES: Case[] = [
  {
    id: 'SESS-001',
    title: '工作流会话管理',
    level: 'session',
    category: '会话管理',
    scenario: '管理开发工作流会话：创建/暂停/恢复/完成',
    commands: [
      { cmd: '/workflow:session:start', desc: '开始新会话' },
      { cmd: '/workflow:session:list', desc: '列出所有会话' },
      { cmd: '/workflow:session:resume', desc: '恢复会话' },
      { cmd: '/workflow:session:complete', desc: '完成会话' },
    ],
    steps: [
      { role: 'user', content: '/workflow:session:start', type: 'command' },
      { role: 'system', content: '✅ 新会话已创建！\n\n  Session ID: WFS-Payment-2026-04-02\n  📁 目录: .workflow/sessions/WFS-Payment/', type: 'response' },
      { role: 'user', content: '/workflow:session:list', type: 'command' },
      { role: 'system', content: '┌─ 会话列表 ─────────────────────────────────┐\n│ 🟢 WFS-Payment [活跃] 3/6 任务              │\n│ 🟡 WFS-OAuth2 [暂停] 5/6 任务               │\n│ ✅ WFS-User-Profile [完成]                  │\n└────────────────────────────────────────────┘', type: 'response' },
      { role: 'user', content: '/workflow:session:resume', type: 'command' },
      { role: 'system', content: '🔄 恢复 WFS-OAuth2，剩余: [6/6] 集成测试', type: 'response' },
      { role: 'user', content: '/workflow:session:complete', type: 'command' },
      { role: 'system', content: '✅ 会话已完成并归档！\n\n  📊 统计: 8小时 | 6任务 | 12个文件\n  📁 归档: .workflow/archive/WFS-OAuth2/', type: 'result', highlight: true },
    ],
    tips: ['创建/暂停/恢复/完成工作流', '自动追踪进度', '归档后可回溯'],
  },
];
  
// ============================================
// 多 CLI 协作案例 (保留精简)
// ============================================
export const MULTI_CLI_CASES: Case[] = [
  {
    id: 'MCLI-001',
    title: '多 CLI 协作规划',
    level: 'multi-cli',
    category: '多CLI协作',
    scenario: '调用多个 AI CLI 工具并行分析同一问题，交叉验证',
    commands: [
      { cmd: '/workflow-multi-cli-plan', desc: '多 CLI 并行分析 + 自动执行' },
    ],
    steps: [
      { role: 'user', content: '/workflow-multi-cli-plan "设计高并发秒杀系统"', type: 'command' },
      { role: 'system', content: '┌─ 多 CLI 协作规划 ────────────────────────────┐\n│ 🤖 并行调用: Gemini + Codex + Qwen           │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '  ✓ Gemini 分析完成\n  ✓ Codex 分析完成\n  ✓ Qwen 分析完成', type: 'note' },
      { role: 'system', content: '📊 交叉验证:\n\nGemini: Redis 预扣库存 + 消息队列削峰\nCodex: CDN 静态化 + 限流令牌桶\nQwen: 库存预热 + 读写分离\n\n共同建议 (3/3): Redis 预扣 + 消息队列 + 限流', type: 'response' },
      { role: 'system', content: '✅ 综合计划已生成并执行！\n📁 产出文件: 8 个', type: 'result', highlight: true },
    ],
    tips: ['并行调用 Gemini/Codex/Qwen 等 CLI 工具', '交叉验证提高可靠性', '综合多方观点生成计划'],
  },
];
  
// ============================================
// 聚合导出
// ============================================
export const ALL_CASES: Case[] = [
  ...FEATURE_CASES,
  ...BUG_CASES,
  ...ZERO_TO_ONE_CASES,
  ...AUTO_CASES,
  ...SPEC_CASES,
  ...TEAM_COORD_CASES,
  ...ISSUE_CASES,
  ...UI_CASES,
  ...MEMORY_CASES,
  ...SESSION_CASES,
  ...MULTI_CLI_CASES,
];
  
// 按场景分类导出
export const CASES_BY_LEVEL: Record<string, Case[]> = {
  '1': FEATURE_CASES,      // 功能新增/变更
  '2': BUG_CASES,          // Bug 修复
  '3': ZERO_TO_ONE_CASES,  // 从0→1开发
  '4': AUTO_CASES,         // 全自动交付
  'skill': SPEC_CASES,     // 规范系统
  'issue': ISSUE_CASES,    // Issue 工作流
  'team': TEAM_COORD_CASES,// 团队协调
  'ui': UI_CASES,
  'memory': MEMORY_CASES,
  'session': SESSION_CASES,
  'multi-cli': MULTI_CLI_CASES,
};
  
// Level 配置 (按场景重命名)
export const LEVEL_CONFIG: Record<string, { name: string; emoji: string; color: string; desc: string }> = {
  '1': { name: '功能新增', emoji: '✨', color: '#4ade80', desc: '功能新增/变更 (从1→100)' },
  '2': { name: 'Bug修复', emoji: '🐛', color: '#f87171', desc: '假设驱动调试' },
  '3': { name: '从0→1开发', emoji: '🚀', color: '#60a5fa', desc: '想法→头脑风暴→规划→执行' },
  '4': { name: '全自动交付', emoji: '⚡', color: '#fbbf24', desc: 'ccw/ccw-coordinator 一键搞定' },
  'skill': { name: '规范系统', emoji: '📋', color: '#c084fc', desc: 'spec:setup/spec:add' },
  'issue': { name: 'Issue工作流', emoji: '🔖', color: '#fb923c', desc: 'Issue 发现/规划/执行' },
  'team': { name: '团队协调', emoji: '👥', color: '#818cf8', desc: 'team-coordinate 通用协调' },
  'ui': { name: 'UI设计', emoji: '🎨', color: '#f472b6', desc: 'UI 设计生成' },
  'memory': { name: '记忆系统', emoji: '🧠', color: '#34d399', desc: '会话记忆压缩' },
  'session': { name: '会话管理', emoji: '💾', color: '#2dd4bf', desc: '工作流会话管理' },
  'multi-cli': { name: '多CLI协作', emoji: '🔀', color: '#a78bfa', desc: '多 CLI 并行分析' },
};
  
// 兼容旧版导出名
export const LEVEL_1_CASES = FEATURE_CASES;
export const LEVEL_2_CASES = BUG_CASES;
export const LEVEL_3_CASES = ZERO_TO_ONE_CASES;
export const LEVEL_4_CASES = AUTO_CASES;
export const SKILL_CASES = SPEC_CASES;
export const TEAM_CASES = TEAM_COORD_CASES;
