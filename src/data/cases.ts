// ============================================
// CCW 命令使用案例
// ============================================

export type CaseLevel = 1 | 2 | 3 | 4 | 'skill' | 'issue' | 'team' | 'ui' | 'memory' | 'session' | 'multi-cli';

export interface CaseStep {
  role: 'user' | 'system';
  content: string;
  type?: 'command' | 'response' | 'note' | 'result' | 'choice' | 'tip';
  highlight?: boolean;
}

export interface CaseCommand {
  cmd: string;
  desc: string;
}

export interface Case {
  id: string;
  title: string;
  level: CaseLevel;
  category: string;
  scenario: string;
  commands: CaseCommand[];
  steps: CaseStep[];
  tips?: string[];
  // 增强字段
  prerequisites?: string[];      // 前置条件
  successCriteria?: string[];    // 成功标准
  estimatedTime?: string;        // 预估时间
  difficulty?: 'easy' | 'medium' | 'hard';  // 难度
}

// ============================================
// Level 1 - 超简单任务
// ============================================
export const LEVEL_1_CASES: Case[] = [
  {
    id: 'L1-001',
    title: '用万能入口直接搞定小任务',
    level: 1,
    category: '快速执行',
    scenario: '不知道用哪个命令？直接用 /ccw，AI 自动分析并执行',
    commands: [
      { cmd: '/ccw', desc: '主入口 - 智能分析意图，自动选择命令执行' },
    ],
    prerequisites: ['已安装 Claude Code Workflow', '有需要执行的小任务'],
    successCriteria: ['任务完成', '代码修改符合预期'],
    estimatedTime: '1-2 分钟',
    difficulty: 'easy',
    steps: [
      { role: 'user', content: '/ccw "给 src/utils/format.ts 里的函数加 JSDoc 注释"', type: 'command' },
      { role: 'system', content: '┌─ CCW 智能路由 ──────────────────────────────┐\n│ 🧠 分析意图: 代码改动 (简单、单文件)        │\n│ 🎯 选择命令: /review-code                   │\n│ ⚡ 直接执行，无需规划                       │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '⚡ 执行中: 为 formatDate, formatPrice, formatBytes 添加 JSDoc...', type: 'note' },
      { role: 'system', content: '✅ 完成！已为 3 个函数添加 JSDoc 注释\n\n📝 修改: src/utils/format.ts\n\n💡 /ccw 使用技巧:\n   - 简单任务 → 直接执行\n   - 复杂任务 → 自动调用 /workflow-plan\n   - 不确定时 → 直接说需求，让 AI 决定', type: 'result', highlight: true },
    ],
    tips: ['/ccw 是最佳起点，不需要记命令名', 'AI 自动判断复杂度选择合适命令', '适合所有日常小改动'],
  },
  {
    id: 'L1-002',
    title: '一键清理项目过时产物',
    level: 1,
    category: '代码清理',
    scenario: '开发过程中积累了过时的临时文件和废弃代码,一键清理',
    commands: [
      { cmd: '/workflow:clean', desc: '智能清理 - 检测过时产物和无用代码' },
    ],
    prerequisites: ['Git 仓库', '项目有一定的开发历史'],
    successCriteria: ['过时文件被识别并删除', '项目功能正常'],
    estimatedTime: '1-2 分钟',
    difficulty: 'easy',
    steps: [
      { role: 'user', content: '/workflow:clean', type: 'command' },
      { role: 'system', content: '┌─ 智能清理扫描 ──────────────────────────────┐\n│ 🔍 扫描项目...                              │\n│ 📋 检测过时产物和无用代码                   │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📊 发现可清理内容:\n\n  🗑️  过时临时文件:\n    - .workflow/.scratchpad/temp-*.md (8 个)\n    - .workflow/sessions/WFS-*/IMPL_PLAN.bak (3 个)\n\n  ⚠️  废弃代码 (需确认):\n    - src/auth/legacy-oauth.ts (已被新代码替代)\n    - src/utils/deprecated.ts (全部函数标记 @deprecated)\n\n  ✅  可安全删除:\n    - node_modules/.cache/ (112 MB)', type: 'response' },
      { role: 'system', content: '是否执行清理？(临时文件自动删除，废弃代码需确认)', type: 'choice' },
      { role: 'user', content: '是', type: 'command' },
      { role: 'system', content: '✅ 清理完成！\n\n  🗑️  删除临时文件: 11 个\n  🗑️  删除废弃代码: 2 个文件\n  💾  释放空间: 114 MB\n\n💡 建议定期运行 /workflow:clean 保持项目整洁', type: 'result', highlight: true },
    ],
    tips: ['安全清理，废弃代码需二次确认', '适合长期项目积累的清理', '释放磁盘空间 + 减少代码噪音'],
  },
];

// ============================================
// Level 2 - 轻量规划与执行
// ============================================
export const LEVEL_2_CASES: Case[] = [
  {
    id: 'L2-001',
    title: '用命令编排器找到最佳执行路径',
    level: 2,
    category: '命令编排',
    scenario: '需求清楚但不确定用哪个工作流，用 ccw-coordinator 推荐命令链',
    commands: [
      { cmd: '/ccw-coordinator', desc: '交互式命令编排 - 分析需求推荐命令链' },
      { cmd: '/workflow-lite-plan', desc: '轻量规划 + 自动执行' },
    ],
    steps: [
      { role: 'user', content: '/ccw-coordinator "我想给用户添加消息通知功能，站内信+邮件"', type: 'command' },
      { role: 'system', content: '┌─ CCW 命令编排器 ────────────────────────────┐\n│ 🧠 分析需求: 新功能开发，中等复杂度         │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📋 推荐命令链:\n\n  方案 A: 快速开发\n  ┌─────────────────────────────────────────┐\n  │  /workflow-lite-plan  →  自动执行       │\n  └─────────────────────────────────────────┘\n  适合: 需求清晰，希望快速交付\n\n  方案 B: 完整规划\n  ┌─────────────────────────────────────────┐\n  │  /workflow:collaborative-plan-with-file │\n  │  → /workflow-execute                    │\n  └─────────────────────────────────────────┘\n  适合: 复杂功能，需要文档化规划\n\n选择方案:', type: 'note' },
      { role: 'user', content: 'A', type: 'command' },
      { role: 'user', content: '/workflow-lite-plan "添加用户消息通知功能，支持站内信和邮件"', type: 'command' },
      { role: 'system', content: '┌─ 轻量规划 ───────────────────────────────────┐\n│ 📋 任务分解:                                 │\n│   1. 通知数据模型 (Notification entity)      │\n│   2. 站内信服务 (NotificationService)        │\n│   3. 邮件发送服务 (EmailService)             │\n│   4. REST API (/api/notifications)           │\n│   5. 前端通知铃铛组件                        │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '▶️ 确认后自动执行...\n\n  ☑️ [1/5] Notification 数据模型... ✓\n  ☑️ [2/5] NotificationService... ✓\n  ☑️ [3/5] EmailService... ✓\n  ☑️ [4/5] /api/notifications 路由... ✓\n  ☑️ [5/5] NotificationBell 组件... ✓', type: 'response' },
      { role: 'system', content: '✅ 完成！\n\n📁 新增文件: 5 个\n💡 建议: /review-cycle 审查代码，/workflow-test-fix 补充测试', type: 'result', highlight: true },
    ],
    tips: ['/ccw-coordinator 帮你选最合适的工作流', '避免"不知道用哪个命令"的困扰', '方案 A 快速，方案 B 完整，根据需求选择'],
  },
  {
    id: 'L2-002',
    title: '代码重构循环',
    level: 2,
    category: '重构',
    scenario: '对积累的技术债务进行自动化重构，直到达到质量目标',
    commands: [
      { cmd: '/workflow:refactor-cycle', desc: '重构循环 - 发现问题、执行重构、验证质量' },
    ],
    steps: [
      { role: 'user', content: '/workflow:refactor-cycle "重构 src/payment/ 模块，降低圈复杂度"', type: 'command' },
      { role: 'system', content: '┌─ 重构循环初始化 ────────────────────────────┐\n│ 🔍 分析目标: src/payment/                   │\n│ 📊 质量基线扫描...                          │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📊 当前质量基线:\n\n  圈复杂度:\n    processPayment()  — 23 (阈值: 10) 🔴\n    validateCard()    — 18 (阈值: 10) 🔴\n    calculateFee()    — 12 (阈值: 10) 🟡\n\n  代码重复:\n    validateAddress() 在 3 处重复\n\n🎯 重构目标: 圈复杂度 ≤ 10', type: 'response' },
      { role: 'system', content: '🔄 第 1 轮重构:\n\n  ✅ processPayment() 拆分为 3 个函数\n     → 圈复杂度: 23 → 7 ✓\n  ✅ validateCard() 提取验证规则表\n     → 圈复杂度: 18 → 6 ✓\n\n📊 轮次 1 质量扫描:\n  calculateFee() 仍为 12，继续...', type: 'response' },
      { role: 'system', content: '🔄 第 2 轮重构:\n\n  ✅ calculateFee() 拆分汇率逻辑\n     → 圈复杂度: 12 → 8 ✓\n  ✅ validateAddress() 提取公共函数\n\n📊 全部达标，回归测试...', type: 'response' },
      { role: 'system', content: '✅ 重构循环完成！\n\n📊 质量改善:\n   圈复杂度: 最高 23 → 最高 8 (-65%)\n   代码重复: -3 处\n   测试: 全部通过\n\n📁 变更: 12 个文件', type: 'result', highlight: true },
    ],
    tips: ['自动多轮重构，直到达标', '每轮验证不引入新 Bug', '适合有质量目标的系统性重构'],
  },
];

// ============================================
// Skill - 专项技能
// ============================================
export const SKILL_CASES: Case[] = [
  {
    id: 'SKILL-001',
    title: '命令帮助系统',
    level: 'skill',
    category: '帮助系统',
    scenario: '搜索和浏览所有可用命令',
    commands: [
      { cmd: '/ccw-help', desc: '命令帮助系统' },
    ],
    steps: [
      { role: 'user', content: '/ccw-help', type: 'command' },
      { role: 'system', content: '┌─ CCW 命令帮助系统 ───────────────────────────┐\n│ 📋 可用分类:                                 │\n│   1. 🌟 主入口 (4)                           │\n│   2. ⚙️ 工作流 (15)                          │\n│   3. 🔄 会话管理 (6)                         │\n│   4. 🐛 Issue管理 (8)                        │\n│   5. 📚 记忆系统 (2)                         │\n│   6. 🧠 头脑风暴 (1)                         │\n│   7. 🧪 TDD开发 (1)                          │\n│   8. 🔬 测试 (1)                             │\n│   9. 👀 代码审查 (2)                         │\n│   10. 🎨 UI设计 (10)                         │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '选择分类编号或输入搜索关键词:', type: 'note' },
      { role: 'user', content: 'test', type: 'command' },
      { role: 'system', content: '🔍 搜索结果:\n\n  1. /workflow-test-fix - 测试修复技能\n  2. /workflow-tdd-plan - TDD 规划技能\n  3. /workflow-tdd - TDD 工作流技能\n  4. /workflow:integration-test-cycle - 集成测试循环\n  5. /team-testing - 团队测试协作\n\n输入编号查看详情', type: 'response' },
      { role: 'user', content: '1', type: 'command' },
      { role: 'system', content: '┌─ /workflow-test-fix ────────────────────────┐\n│ 📝 详细说明:                                 │\n│   分析代码逻辑，自动生成单元测试、边界条件    │\n│   测试、异常情况测试，失败后自动修复          │\n│                                              │\n│ 💡 使用场景:                                 │\n│   功能写完需要补测试，或测试持续失败          │\n│                                              │\n│ 📦 涉及文件:                                 │\n│   - src/__tests__/*.test.ts                  │\n└──────────────────────────────────────────────┘', type: 'result', highlight: true },
    ],
    tips: ['按分类浏览 100+ 个命令', '支持关键词搜索', '查看详细使用说明'],
  },
  {
    id: 'SKILL-002',
    title: 'Issue 管理交互式操作',
    level: 'skill',
    category: 'Issue管理',
    scenario: '查看、编辑和管理已有 Issue',
    commands: [
      { cmd: '/issue-manage', desc: '交互式 Issue 管理' },
    ],
    steps: [
      { role: 'user', content: '/issue-manage', type: 'command' },
      { role: 'system', content: '┌─ Issue 管理 ────────────────────────────────┐\n│ 📋 当前 Issue 列表:                          │\n│                                              │\n│  1. [高] 订单提交网络超时 (待规划)            │\n│  2. [中] 添加用户头像上传 (进行中)            │\n│  3. [低] 优化首页加载速度 (待规划)            │\n│                                              │\n│ 操作: [V] 查看  [E] 编辑  [D] 删除  [N] 新建  [Q] 退出\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'user', content: 'V 1', type: 'command' },
      { role: 'system', content: '┌─ Issue 详情 #1 ─────────────────────────────┐\n│ 标题: 订单提交网络超时导致状态不一致         │\n│ 严重程度: 🔴 High                            │\n│ 状态: 待规划                                 │\n│                                              │\n│ 描述:                                        │\n│ 用户在提交订单时，如果网络超时，订单状态     │\n│ 会变成不一致                                 │\n│                                              │\n│ [P] 规划方案  [E] 编辑  [B] 返回             │\n└──────────────────────────────────────────────┘', type: 'result', highlight: true },
    ],
    tips: ['菜单驱动操作', '像用手机 App 一样简单', '支持增删改查'],
  },
  {
    id: 'SKILL-003',
    title: '创建自定义技能',
    level: 'skill',
    category: '技能管理',
    scenario: '创建可复用的工作流模板',
    commands: [
      { cmd: '/skill-generator', desc: '元技能 - 创建新技能' },
    ],
    steps: [
      { role: 'user', content: '/skill-generator', type: 'command' },
      { role: 'system', content: '┌─ 技能创建器 ────────────────────────────────┐\n│ 🛠️ 创建你自己的工作流模板                    │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '1. 技能名称:', type: 'note' },
      { role: 'user', content: 'release-pipeline', type: 'command' },
      { role: 'system', content: '2. 技能描述:', type: 'note' },
      { role: 'user', content: '自动化发布流程：测试 → 构建 → 部署', type: 'command' },
      { role: 'system', content: '3. 定义步骤 (每行一个):', type: 'note' },
      { role: 'user', content: '运行测试\n构建项目\n部署到生产', type: 'command' },
      { role: 'system', content: '✅ 技能创建成功！\n\n📁 产出文件:\n   - .claude/skills/release-pipeline.md\n\n💡 使用方法:\n   /release-pipeline\n\n📋 包含 3 个步骤:\n   1. 运行测试\n   2. 构建项目\n   3. 部署到生产', type: 'result', highlight: true },
    ],
    tips: ['把重复流程固化成模板', '一次创建，反复使用', '分享给团队成员'],
  },
];

// ============================================
// Level 3 - 标准工作流
// ============================================
export const LEVEL_3_CASES: Case[] = [
  {
    id: 'L3-001',
    title: 'TDD 规划开发流程（v7.0）',
    level: 3,
    category: 'TDD开发',
    scenario: '用 workflow-tdd-plan 6阶段规划实现支付模块',
    commands: [
      { cmd: '/workflow-tdd-plan', desc: 'TDD 规划技能 - 6阶段规划 + Red-Green-Refactor 任务链' },
    ],
    steps: [
      { role: 'user', content: '/workflow-tdd-plan "实现支付模块，支持微信支付和支付宝"', type: 'command' },
      { role: 'system', content: '┌─ TDD 规划 (6阶段) ──────────────────────────┐\n│ Phase 1: 会话发现  Phase 2: 上下文收集       │\n│ Phase 3: 覆盖分析  Phase 4: 冲突解决        │\n│ Phase 5: 任务生成  Phase 6: 结构验证        │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📋 Phase 5 生成 Red-Green-Refactor 任务链:\n\n  🔴 RED-001  → 支付接口失败测试\n  🟢 GREEN-001 → IPaymentGateway 实现\n  🔵 REFACTOR-001 → 提取公共逻辑\n\n  🔴 RED-002  → 微信支付失败测试\n  🟢 GREEN-002 → WechatPaymentGateway\n\n  🔴 RED-003  → 支付宝失败测试\n  🟢 GREEN-003 → AlipayGateway\n\n  📁 产出: .workflow/tdd-plan/tasks/ (9个任务)', type: 'response' },
      { role: 'system', content: '🔴→🟢→🔵 Cycle 1: 接口测试 → 实现 → 重构 ✓\n🔴→🟢→🔵 Cycle 2: 微信支付测试 → 实现 → 重构 ✓\n🔴→🟢→🔵 Cycle 3: 支付宝测试 → 实现 → 重构 ✓', type: 'response' },
      { role: 'system', content: '✅ TDD 开发完成！\n\n📁 新增: IPaymentGateway.ts, WechatPaymentGateway.ts, AlipayGateway.ts + 测试\n📊 覆盖率: 94%  严格遵循 Red-Green-Refactor', type: 'result', highlight: true },
    ],
    tips: ['v7.0 新命令，6阶段TDD规划', 'Red-Green-Refactor 严格执行', '先写失败测试再实现，保证质量'],
  },
  {
    id: 'L3-002',
    title: '协作式规划 + 执行复杂功能',
    level: 3,
    category: '功能开发',
    scenario: '用带文件的协作式规划开发 OAuth2 认证，规划产物可复用',
    commands: [
      { cmd: '/workflow:collaborative-plan-with-file', desc: '协作式规划 - 输出规划文件，支持多轮澄清' },
      { cmd: '/workflow-execute', desc: '执行工作流会话中的任务' },
    ],
    steps: [
      { role: 'user', content: '/workflow:collaborative-plan-with-file "实现 OAuth2 认证系统，支持 GitHub 和 Google 登录"', type: 'command' },
      { role: 'system', content: '┌─ 协作式规划 ────────────────────────────────┐\n│ 📋 多轮澄清 → 文档化规划文件                │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '❓ 澄清 1/2: 是否需要 Refresh Token？', type: 'note' },
      { role: 'user', content: '需要，7 天有效期', type: 'command' },
      { role: 'system', content: '❓ 澄清 2/2: 用户数据存储？', type: 'note' },
      { role: 'user', content: 'PostgreSQL + Prisma', type: 'command' },
      { role: 'system', content: '✅ 规划文件已生成:\n   📁 .workflow/plans/oauth2-plan.md\n   📁 .workflow/sessions/WFS-OAuth2/tasks/*.json (6个)\n\n💡 规划文件可复用: 切换到 Codex 也能直接执行', type: 'result' },
      { role: 'user', content: '/workflow-execute', type: 'command' },
      { role: 'system', content: '🤖 执行 6 个任务...\n\n  ✅ [1/6] OAuth2 数据模型\n  ✅ [2/6] GitHub Provider\n  ✅ [3/6] Google Provider\n  ✅ [4/6] Session 管理\n  ✅ [5/6] Refresh Token\n  ✅ [6/6] 集成认证系统\n\n✅ 完成！12 个文件，建议运行 /review-cycle 审查', type: 'result', highlight: true },
    ],
    tips: ['规划文件持久化，可复用或交给 Codex 执行', '多轮澄清保证需求准确', '适合复杂功能、多模块开发'],
  },
  {
    id: 'L3-003',
    title: '代码审查 + 自动修复循环',
    level: 3,
    category: '代码审查',
    scenario: '多维度审查本次改动并自动修复所有发现问题',
    commands: [
      { cmd: '/review-cycle', desc: '统一代码审查 - 7维度分析，自动修复循环' },
    ],
    steps: [
      { role: 'user', content: '/review-cycle', type: 'command' },
      { role: 'system', content: '┌─ 代码审查 (7维度) ──────────────────────────┐\n│ 📊 审查范围: 当前会话改动，12 个文件         │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '审查结果:\n\n  ✅ 正确性    通过\n  ❌ 安全性    1 个问题\n  ⚠️ 性能      2 个问题\n  ⚠️ 可维护性  1 个问题\n  ✅ 可读性    通过\n  ✅ 测试覆盖  通过\n  ✅ 文档      通过\n\n🔴 安全: oauth.ts:45 — state 参数未验证 (CSRF 风险)\n🟡 性能: session.ts:23 — 每次请求查询数据库\n🟡 维护: providers.ts — GitHub/Google 逻辑重复', type: 'response' },
      { role: 'system', content: '是否启动自动修复循环？', type: 'choice' },
      { role: 'user', content: '是', type: 'command' },
      { role: 'system', content: '🔧 修复循环:\n\n  ✅ 修复 CSRF state 验证\n  ✅ 添加 Redis 缓存层\n  ✅ 抽取 BaseOAuthProvider 公共类\n\n✅ 所有问题已修复，重新审查全部通过！', type: 'result', highlight: true },
    ],
    tips: ['7维度全面审查', '自动修复后再次验证', '代码合并前必备步骤'],
  },
  {
    id: 'L3-004',
    title: '假设驱动深度调试',
    level: 3,
    category: '调试',
    scenario: '用假设-验证方法调试生产环境随机 Bug',
    commands: [
      { cmd: '/workflow:debug-with-file', desc: '交互式假设驱动调试 - 文档化探索过程' },
    ],
    steps: [
      { role: 'user', content: '/workflow:debug-with-file "WebSocket 连接在生产环境随机断开，本地无法复现"', type: 'command' },
      { role: 'system', content: '📋 生成假设列表:\n\n  [1] 心跳超时配置不一致\n  [2] Nginx 代理超时\n  [3] 内存泄露导致连接崩溃\n  [4] 网络负载均衡问题\n\n选择优先验证哪个假设:', type: 'note' },
      { role: 'user', content: '2', type: 'command' },
      { role: 'system', content: '🔍 验证假设 [2]: Nginx 代理超时\n\n  检查 nginx.conf:\n    proxy_read_timeout = 60s  ← 发现!\n    WebSocket 心跳间隔 = 30s\n\n  分析: 60s 无数据时 Nginx 主动断开连接\n  根因: 心跳不足以维持连接', type: 'response' },
      { role: 'system', content: '🔧 提供修复方案:\n\n  方案 A: 增加 Nginx timeout\n  方案 B: 客户端 ping/pong 心跳 (推荐)\n\n选择:', type: 'note' },
      { role: 'user', content: 'B', type: 'command' },
      { role: 'system', content: '✅ 调试完成！\n\n  实施: WebSocket 客户端每 25s 发送 ping\n  📁 调试报告: .workflow/.debug/DBG-WS/debug-report.md\n  📁 根因记录: .workflow/.debug/DBG-WS/hypothesis-log.md', type: 'result', highlight: true },
    ],
    tips: ['科学的假设-验证方法论', '过程文档化，便于团队复盘', '适合生产环境难复现的 Bug'],
  },
  {
    id: 'L3-005',
    title: '集成测试自迭代循环',
    level: 3,
    category: '测试',
    scenario: '对核心模块执行集成测试，失败自动修复，循环直到全部通过',
    commands: [
      { cmd: '/workflow:integration-test-cycle', desc: '集成测试循环 - 探索+执行+修复，直到达标' },
    ],
    steps: [
      { role: 'user', content: '/workflow:integration-test-cycle "支付模块集成测试"', type: 'command' },
      { role: 'system', content: '┌─ 集成测试循环 ──────────────────────────────┐\n│ 🔍 Phase 1: 探索测试场景                    │\n│ 🧪 Phase 2: 执行集成测试                    │\n│ 🔧 Phase 3: 失败自动修复                    │\n│ 🔁 循环直到通过率 ≥ 95%                     │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '🔍 Phase 1 探索场景:\n\n  发现 8 个集成点:\n  - 支付 → 订单状态\n  - 支付 → 库存扣减\n  - 支付 → 通知发送\n  - 支付失败 → 回滚\n  - 超时 → 重试机制\n  - 重复支付 → 幂等\n  - 退款 → 积分返还\n  - 高并发 → 锁竞争', type: 'response' },
      { role: 'system', content: '🧪 第 1 轮执行: 6/8 通过 (75%)\n\n  ✗ 退款 → 积分返还: 积分未扣减\n  ✗ 高并发 → 锁竞争: 偶发死锁\n\n🔧 自动修复中...', type: 'response' },
      { role: 'system', content: '🧪 第 2 轮执行: 8/8 通过 (100%)\n\n✅ 集成测试循环完成！\n\n📊 统计:\n   - 测试场景: 8 个\n   - 修复问题: 2 个\n   - 最终通过率: 100%\n\n📁 报告: .workflow/test-results/integration-report.md', type: 'result', highlight: true },
    ],
    tips: ['自动发现测试场景，无需手写', '失败自动修复，多轮循环直到达标', '适合功能开发完成后的集成验收'],
  },
  {
    id: 'L3-006',
    title: 'Wave Plan 先勘探后施工',
    level: 3,
    category: '波浪规划',
    scenario: '对大型功能模块做渐进式探索与实现',
    commands: [
      { cmd: '/workflow-wave-plan', desc: 'CSV Wave 规划执行 - 分批探索和执行' },
    ],
    steps: [
      { role: 'user', content: '/workflow-wave-plan "重构订单系统，拆分成微服务架构"', type: 'command' },
      { role: 'system', content: '┌─ Wave Plan 初始化 ──────────────────────────┐\n│ 📋 模式: 先勘探 → 再计划 → 后施工           │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '🌊 Wave 1 - 探索:\n  扫描 src/order/**...\n  发现: 6 个核心模块, 15 处耦合, 3 处共享表', type: 'response' },
      { role: 'system', content: '🌊 Wave 2 - 计划:\n  批次 A (无依赖): 通知服务 + 库存服务\n  批次 B (依赖A): 支付服务 + 物流服务\n  批次 C (依赖B): 订单核心 + 状态机\n\n  📁 计划: .workflow/wave-plan/order-refactor.csv', type: 'response' },
      { role: 'system', content: '🌊 Wave 3 - 执行:\n  ✓ 批次 A 完成\n  ✓ 批次 B 完成\n  ✓ 批次 C 完成\n\n✅ 完成！6 个服务，15 处耦合全部解决，覆盖率 88%', type: 'result', highlight: true },
    ],
    tips: ['先探索再计划，避免盲目开发', '分批执行降低风险', '适合大型重构或未知代码库'],
  },
];

// ============================================
// Level 4 - 探索性任务
// ============================================
export const LEVEL_4_CASES: Case[] = [
  {
    id: 'L4-001',
    title: '头脑风暴：架构设计',
    level: 4,
    category: '头脑风暴',
    scenario: '重新设计通知系统架构',
    commands: [
      { cmd: '/workflow:brainstorm-with-file', desc: '交互式头脑风暴' },
    ],
    steps: [
      { role: 'user', content: '/workflow:brainstorm-with-file "通知系统重构：支持多渠道（站内/邮件/短信/推送）、高并发场景"', type: 'command' },
      { role: 'system', content: '┌─ 头脑风暴会话 BS-通知系统 ─────────────────┐\n│ 📁 文档: .workflow/.brainstorm/BS-通知/      │\n│ 🎭 启动多角色分析...                         │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📐 系统架构师:\n   消息队列(RabbitMQ) + 渠道适配器模式\n   建议: 消息解耦 + 用户偏好服务', type: 'response' },
      { role: 'system', content: '💻 开发者:\n   异步发送: BullMQ + Redis\n   重试: 指数退避，最多 3 次\n   降级: 短信失败降级到站内', type: 'response' },
      { role: 'system', content: '🔒 安全视角:\n   - 敏感通知加密传输\n   - 频率限制防滥用\n   - 审计日志记录', type: 'response' },
      { role: 'system', content: '📁 产出: .workflow/.brainstorm/BS-通知系统/brainstorm.md\n\n💡 下一步: /workflow-plan 或 /issue:from-brainstorm', type: 'result' },
    ],
    tips: ['多角色并行分析', '记录想法演变过程', '可转为计划或 Issue'],
  },
  {
    id: 'L4-002',
    title: '头脑风暴转 Issue 执行',
    level: 4,
    category: 'Issue工作流',
    scenario: '将头脑风暴结果转为可执行的 Issue',
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
  {
    id: 'L4-003',
    title: '多 CLI 协作规划',
    level: 4,
    category: '探索规划',
    scenario: '调用多个 AI CLI 工具并行分析同一问题',
    commands: [
      { cmd: '/workflow-multi-cli-plan', desc: '多 CLI 并行分析 + 自动执行' },
    ],
    steps: [
      { role: 'user', content: '/workflow-multi-cli-plan "设计一个高并发的秒杀系统"', type: 'command' },
      { role: 'system', content: '┌─ 多 CLI 协作规划 ────────────────────────────┐\n│ 🤖 并行调用 CLI 工具分析...                  │\n│   Gemini (分析) + Codex (编码) + Qwen (优化) │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '  ✓ Gemini 分析完成\n  ✓ Codex 分析完成\n  ✓ Qwen 分析完成', type: 'note' },
      { role: 'system', content: '📊 交叉验证:\n\nGemini: Redis 预扣库存 + 消息队列削峰\nCodex: CDN 静态化 + 限流令牌桶\nQwen: 库存预热 + 读写分离\n\n共同建议 (3/3): Redis 预扣 + 消息队列 + 限流', type: 'response' },
      { role: 'system', content: '✅ 综合计划已生成并执行！\n📁 产出文件: 8 个', type: 'result', highlight: true },
    ],
    tips: ['并行调用 Gemini/Codex/Qwen 等 CLI 工具', '交叉验证提高可靠性', '综合多方观点生成计划'],
  },
  {
    id: 'L4-004',
    title: '并行头脑风暴',
    level: 4,
    category: '头脑风暴',
    scenario: '自动选择多角色并行分析',
    commands: [
      { cmd: '/workflow:brainstorm-with-file', desc: '自动并行头脑风暴' },
    ],
    steps: [
      { role: 'user', content: '/workflow:brainstorm-with-file "设计一个智能客服系统"', type: 'command' },
      { role: 'system', content: '🎭 自动选择角色:\n  • 产品经理  • 系统架构师  • AI/ML 专家  • UX 专家  • 安全专家', type: 'response' },
      { role: 'system', content: '⏳ 5 角色并行分析中...', type: 'response' },
      { role: 'system', content: '🎯 产品经理: 多渠道接入 + 智能问答 + 人工转接\n🏗️ 架构师: 微服务 + WebSocket + Elasticsearch\nAI专家: RAG + LLM + 向量数据库', type: 'response' },
      { role: 'system', content: '🔄 综合推荐:\n  对话引擎: RAG + LLM\n  知识库: Elasticsearch + 向量混合检索\n  实时通信: WebSocket + Redis Pub/Sub', type: 'result' },
    ],
    tips: ['自动识别需要的角色', '5个角色并行分析', '综合生成最终方案'],
  },
  {
    id: 'L4-005',
    title: '头脑风暴 + Wave 流水线并行执行',
    level: 4,
    category: '探索规划',
    scenario: '先多角色头脑风暴探索设计方案，再用 workflow-wave-plan 将复杂任务分波次并行执行，适合需求模糊、任务量大的场景',
    commands: [
      { cmd: '/workflow:brainstorm-with-file', desc: '多角色头脑风暴，产出 brainstorm.md' },
      { cmd: '/workflow-wave-plan', desc: 'CSV 波次规划 + 并行 Agent 执行' },
    ],
    steps: [
      { role: 'user', content: '/workflow:brainstorm-with-file "重构支付模块：统一多支付渠道接口，支持微信/支付宝/信用卡"', type: 'command' },
      { role: 'system', content: '┌─ 头脑风暴会话 BS-支付重构 ─────────────────┐\n│ 📁 输出: .workflow/.brainstorm/BS-支付重构/  │\n│ 🎭 角色: 系统架构师 × 开发者 × 安全专家      │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '🏗️ 架构师: 策略模式封装各渠道适配器，网关统一路由\n💻 开发者: PaymentGateway 接口 + 工厂类，各渠道实现\n🔒 安全专家: 交易签名校验 + 幂等防重放 + 敏感字段加密', type: 'response' },
      { role: 'system', content: '📁 产出: .workflow/.brainstorm/BS-支付重构/brainstorm.md\n\n💡 方案确定，任务量较大，改用 wave-plan 并行执行', type: 'note' },
      { role: 'user', content: '/workflow-wave-plan "重构支付模块（参考 brainstorm.md）"', type: 'command' },
      { role: 'system', content: '┌─ Wave Plan 分解 ────────────────────────────┐\n│ Phase 1: 探索波 (explore.csv)               │\n│   E1: 现有支付代码扫描                      │\n│   E2: 各渠道 SDK 依赖分析                   │\n│   E3: 测试覆盖现状                          │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '⚡ 波次 1: 3 个探索 Agent 并行运行...\n  ✓ E1 完成 → 发现 legacy-pay.ts 耦合严重\n  ✓ E2 完成 → 找到 3 个 SDK 入口\n  ✓ E3 完成 → 当前覆盖率 42%', type: 'response' },
      { role: 'system', content: '📋 Phase 2: 执行波 (tasks.csv)\n  T1: PaymentGateway 接口定义 [context: E1+E2]\n  T2: WechatPayAdapter 实现  [context: E2+T1]\n  T3: AlipayAdapter 实现     [context: E2+T1]\n  T4: CreditCardAdapter      [context: E2+T1]\n  T5: 单元测试补充           [context: E3+T2+T3]', type: 'response' },
      { role: 'system', content: '⚡ 波次 2 (T1): 完成接口定义\n⚡ 波次 3 (T2+T3+T4): 3个 Agent 并行实现适配器...\n⚡ 波次 4 (T5): 补充测试', type: 'note' },
      { role: 'system', content: '✅ Wave Plan 完成！\n\n  📁 新增/修改文件: 12 个\n  ⏱️  探索波: 3 Agent 并行\n  ⚡  执行波: 最大并发 3\n  🔗  上下文链路: E1→T1→T2/T3/T4→T5', type: 'result', highlight: true },
    ],
    tips: [
      '先头脑风暴确定方向，再 workflow-wave-plan 执行大量任务',
      'workflow-wave-plan 用 CSV 记录上下文，Agent 间自动传递探索结论',
      '任务多、依赖复杂时，wave 并行效率远超串行',
    ],
  },
  {
    id: 'L4-006',
    title: '三段式工作流：头脑风暴→规划→执行',
    level: 4,
    category: '完整工作流',
    scenario: '方向不明时先头脑风暴发散，确定方向后用 workflow-plan 制定详细计划，最后 workflow-execute 按计划逐步实现',
    commands: [
      { cmd: '/workflow:brainstorm-with-file', desc: '发散探索，产出 brainstorm.md' },
      { cmd: '/workflow-plan', desc: '读取头脑风暴产出，制定实现计划' },
      { cmd: '/workflow-execute', desc: '按计划逐任务执行并提交' },
    ],
    steps: [
      { role: 'user', content: '/ccw "头脑风暴: 设计用户权限系统"', type: 'command' },
      { role: 'system', content: '┌─ CCW 路由 ───────────────────────────────────┐\n│ 🎯 意图: brainstorm → brainstorm-to-plan 流  │\n│ 📋 命令链: brainstorm-with-file → plan → exec│\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'user', content: '/workflow:brainstorm-with-file "设计用户权限系统：RBAC vs ABAC，支持多租户"', type: 'command' },
      { role: 'system', content: '🎭 架构师: RBAC 简单直观，ABAC 灵活但复杂\n   推荐: 混合模式（RBAC 为主 + 少量 ABAC 策略）\n\n💻 开发者: 用 Casbin 库，配置文件定义权限规则\n   多租户: schema 隔离 或 tenant_id 字段方案', type: 'response' },
      { role: 'system', content: '📁 产出: .workflow/.brainstorm/BS-权限系统/brainstorm.md\n   结论: Casbin RBAC + tenant_id 列隔离', type: 'note' },
      { role: 'user', content: '/workflow-plan', type: 'command' },
      { role: 'system', content: '┌─ Workflow Plan ──────────────────────────────┐\n│ 📖 读取 brainstorm.md...                     │\n│ 🧠 基于探索结论制定实现计划                  │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📋 实现计划 (WFS-权限系统):\n\n  IMPL-001: Casbin 基础配置 + 模型定义\n  IMPL-002: Role/Permission 数据模型\n  IMPL-003: 多租户 tenant_id 中间件\n  IMPL-004: 权限校验 Guard\n  IMPL-005: 管理员 API (角色 CRUD)\n  IMPL-006: 集成测试\n\n  存储: .workflow/sessions/WFS-权限系统/IMPL_PLAN.md', type: 'response' },
      { role: 'user', content: '/workflow-execute', type: 'command' },
      { role: 'system', content: '▶️ 读取计划: WFS-权限系统/IMPL_PLAN.md\n\n  ☑️ [1/6] IMPL-001: Casbin 配置... git commit ✓\n  ☑️ [2/6] IMPL-002: 数据模型... git commit ✓\n  ☑️ [3/6] IMPL-003: 多租户中间件... git commit ✓\n  ☑️ [4/6] IMPL-004: 权限 Guard... git commit ✓\n  ☑️ [5/6] IMPL-005: 管理 API... git commit ✓\n  ☑️ [6/6] IMPL-006: 集成测试... git commit ✓', type: 'response' },
      { role: 'system', content: '✅ 完成！6 个任务，6 个独立 git commit\n\n💡 brainstorm.md 中的探索结论全程指导实现方向', type: 'result', highlight: true },
    ],
    tips: [
      '三段式适合"方向不明确"的功能开发',
      'workflow-plan 自动读取 brainstorm.md，无需手动传递',
      '每个实现任务单独 git commit，方便 review 和回滚',
    ],
  },
  {
    id: 'L4-007',
    title: '用头脑风暴生成 Spec 文档再开发',
    level: 4,
    category: '规格驱动',
    scenario: '先头脑风暴探索需求全貌，再用 spec-generator 生成正式规格文档（PRD/架构/API），最后 workflow-plan 引用 spec 制定实现计划',
    commands: [
      { cmd: '/workflow:brainstorm-with-file', desc: '探索需求，明确核心方向' },
      { cmd: '/spec-generator', desc: '生成正式规格文档（PRD + 架构 + API）' },
      { cmd: '/workflow-plan', desc: '引用 spec 文档制定详细实现计划' },
      { cmd: '/workflow-execute', desc: '执行实现计划' },
    ],
    steps: [
      { role: 'user', content: '/workflow:brainstorm-with-file "设计数据导出功能：支持 CSV/Excel/PDF，大文件异步导出"', type: 'command' },
      { role: 'system', content: '🎭 产品经理: 导出任务队列 + 进度通知 + 7天下载链接\n🏗️ 架构师: 队列(BullMQ) + 流式生成 + S3 存储\n💻 开发者: exceljs/pdfkit 库，stream 避免内存溢出', type: 'response' },
      { role: 'system', content: '📁 产出: .workflow/.brainstorm/BS-数据导出/brainstorm.md\n   核心结论: 异步队列 + 流式生成 + OSS 存储', type: 'note' },
      { role: 'user', content: '/spec-generator "数据导出功能" --from-brainstorm', type: 'command' },
      { role: 'system', content: '┌─ Spec Generator ─────────────────────────────┐\n│ 📖 读取 brainstorm.md 提取需求...             │\n│ 📝 生成规格文档链...                          │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '  ✓ product-brief.md  → 产品定位 + 核心需求\n  ✓ PRD.md           → 功能规格 + 用户故事\n  ✓ architecture.md  → 系统架构 + 技术选型\n  ✓ api-spec.md      → API 接口定义\n  ✓ epics.md         → Epic 拆解 + 优先级\n\n  📁 存储: specs/data-export/', type: 'response' },
      { role: 'user', content: '/workflow-plan --spec specs/data-export/', type: 'command' },
      { role: 'system', content: '┌─ Workflow Plan (Spec 驱动) ──────────────────┐\n│ 📖 读取 specs/data-export/PRD.md...          │\n│ 📖 读取 specs/data-export/architecture.md... │\n│ 📖 读取 specs/data-export/api-spec.md...     │\n│ 🧠 基于规格制定实现计划...                   │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📋 实现计划 (WFS-数据导出):\n\n  IMPL-001: ExportJob 数据模型 + 状态机\n  IMPL-002: BullMQ 队列基础设施\n  IMPL-003: CSV 导出处理器 (stream)\n  IMPL-004: Excel 导出处理器 (exceljs)\n  IMPL-005: PDF 导出处理器 (pdfkit)\n  IMPL-006: OSS 上传 + 下载链接生成\n  IMPL-007: 进度通知 (WebSocket/SSE)\n  IMPL-008: 导出 API 端点\n\n  💡 每个 IMPL 任务都引用了对应的 spec 章节', type: 'response' },
      { role: 'user', content: '/workflow-execute', type: 'command' },
      { role: 'system', content: '▶️ 按 spec 约束逐任务执行...\n\n  ☑️ [1/8] ExportJob 模型... ✓\n  ☑️ [2/8] BullMQ 队列... ✓\n  ☑️ [3-5/8] 三种格式处理器... ✓\n  ☑️ [6/8] OSS 存储... ✓\n  ☑️ [7/8] 进度通知... ✓\n  ☑️ [8/8] API 端点... ✓', type: 'response' },
      { role: 'system', content: '✅ 完成！\n\n  📁 新增文件: 14 个\n  📋 规格覆盖: PRD → 架构 → API → 实现 完整链路\n  🔗 每个任务都有 spec 文档作为实现依据', type: 'result', highlight: true },
    ],
    tips: [
      'spec-generator 读取 brainstorm.md 自动提取需求，无需手动整理',
      'workflow-plan --spec 让实现计划与规格文档强绑定',
      '适合需要正式文档的产品功能，保留完整需求→实现链路',
    ],
  },
];

// ============================================
// Issue 工作流案例
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
      { role: 'system', content: '✅ 16 个问题全部解决！约 4 小时', type: 'result', highlight: true },
    ],
    tips: ['8维度全面扫描', '自动评估严重程度', '批量规划执行'],
  },
  {
    id: 'ISSUE-002',
    title: '创建结构化 Issue',
    level: 'issue',
    category: 'Issue管理',
    scenario: '手动创建一个问题记录',
    commands: [
      { cmd: '/issue:new', desc: '创建结构化 Issue' },
    ],
    steps: [
      { role: 'user', content: '/issue:new', type: 'command' },
      { role: 'system', content: '1. 问题描述:', type: 'note' },
      { role: 'user', content: '用户在提交订单时，如果网络超时，订单状态会变成不一致', type: 'command' },
      { role: 'system', content: '2. 严重程度:', type: 'note' },
      { role: 'user', content: 'high', type: 'command' },
      { role: 'system', content: '3. 影响范围:', type: 'note' },
      { role: 'user', content: '订单模块', type: 'command' },
      { role: 'system', content: '✅ Issue #17 创建成功！\n\n标题: 订单提交网络超时导致状态不一致\n严重程度: 🔴 High\n📁 文件: .workflow/issues/issue-17.json', type: 'result', highlight: true },
    ],
    tips: ['标准化 Issue 格式', '包含复现步骤', '方便后续跟踪和规划'],
  },
];

// ============================================
// Team 团队协作案例
// ============================================
export const TEAM_CASES: Case[] = [
  {
    id: 'TEAM-001',
    title: '团队头脑风暴协作',
    level: 'team',
    category: '团队协作',
    scenario: '多人多角度碰撞想法',
    commands: [
      { cmd: '/team-brainstorm', desc: '团队头脑风暴' },
    ],
    steps: [
      { role: 'user', content: '/team-brainstorm "产品定价策略"', type: 'command' },
      { role: 'system', content: '┌─ 团队头脑风暴 ───────────────────────────────┐\n│ 👥 5 个角色准备就绪                          │\n│                                              │\n│  🎨 创意者 - 出点子                          │\n│  🧐 挑战者 - 挑毛病                          │\n│  🔗 综合者 - 整合想法                        │\n│  📊 评估师 - 打分排名                        │\n│  ⚖️ 协调者 - 平衡决策                        │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '🎨 创意者 出点子:\n\n  方案 A: 免费增值模式\n  - 基础功能免费\n  - 高级功能订阅 (¥99/月)\n  - 企业版定制\n\n  方案 B: 按量计费\n  - 按调用次数收费\n  - 阶梯定价\n  - 预付费折扣', type: 'response' },
      { role: 'system', content: '🧐 挑战者 挑战:\n\n  对方案 A 的挑战:\n  - 免费用户转化率通常很低 (2-5%)\n  - 订阅制用户流失是长期问题\n\n  对方案 B 的挑战:\n  - 用户对"按量"有心理抗拒\n  - 预测成本困难，影响采用', type: 'response' },
      { role: 'system', content: '🔗 综合者 整合:\n\n  混合方案 C:\n  - 免费层 (有限额度)\n  - 订阅层 (无限使用 + 优先支持)\n  - 超额部分按量计费\n\n  优点:\n  - 降低入门门槛\n  - 可预测的订阅收入\n  - 超额收入额外利润', type: 'response' },
      { role: 'system', content: '📊 评估师 打分:\n\n  ┌─────────────────────────────────────────────┐\n  │ 方案      │ 可行性 │ 收益 │ 用户体验 │ 总分 │\n  │───────────│────────│──────│─────────│──────│\n  │ A 免费增值 │   8    │  7   │    9    │  24  │\n  │ B 按量    │   6    │  8   │    5    │  19  │\n  │ C 混合    │   9    │  9   │    8    │  26  │\n  └─────────────────────────────────────────────┘\n\n  🏆 推荐方案: C 混合模式', type: 'response' },
      { role: 'system', content: '✅ 头脑风暴完成！\n\n📁 产出: .workflow/brainstorm/pricing-strategy.md\n\n💡 下一步:\n   - /workflow-plan 生成实施计划\n   - /issue:from-brainstorm 创建任务', type: 'result', highlight: true },
    ],
    tips: ['5角色协作流程', '想法被挑战后自动改进', '最多2轮迭代'],
  },
  {
    id: 'TEAM-002',
    title: '团队 Issue 协作解决',
    level: 'team',
    category: '团队协作',
    scenario: '多角色分工解决复杂 Issue',
    commands: [
      { cmd: '/team-issue', desc: '团队 Issue 解决' },
    ],
    steps: [
      { role: 'user', content: '/team-issue "修复订单超时导致的库存不一致问题"', type: 'command' },
      { role: 'system', content: '┌─ 团队 Issue 协作 ─────────────────────────────┐\n│ 👥 6 个角色分工                              │\n│                                              │\n│  🔍 探索者 - 分析问题                        │\n│  📝 规划师 - 设计方案                        │\n│  💻 实现者 - 写代码                          │\n│  👀 审查者 - 检查代码                        │\n│  🧪 测试者 - 验证修复                        │\n│  🔗 整合者 - 合并代码                        │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '🔍 探索者 分析中...\n\n问题定位:\n  1. 订单创建和库存扣减不在同一事务\n  2. 网络超时后，订单回滚但库存未恢复\n  3. 缺少分布式事务处理\n\n根本原因: 没有实现最终一致性补偿机制', type: 'response' },
      { role: 'system', content: '📝 规划师 设计方案:\n\n解决方案: TCC (Try-Confirm-Cancel) 模式\n\n  Try 阶段:\n    - 预扣库存 (冻结)\n    - 创建待确认订单\n\n  Confirm 阶段:\n    - 确认扣减库存\n    - 更新订单状态\n\n  Cancel 阶段:\n    - 释放冻结库存\n    - 取消订单', type: 'response' },
      { role: 'system', content: '💻 实现者 编写代码...\n\n新增文件:\n  - src/order/tcc/InventoryTCC.ts\n  - src/order/tcc/OrderTCC.ts\n  - src/order/compensation/CompensationJob.ts\n\n修改文件:\n  - src/order/service.ts\n  - src/inventory/service.ts', type: 'response' },
      { role: 'system', content: '👀 审查者 检查代码:\n\n  ✅ 代码风格: 通过\n  ✅ 安全性: 通过\n  ⚠️ 性能: 建议添加本地缓存\n\n修复建议已应用', type: 'response' },
      { role: 'system', content: '🧪 测试者 验证:\n\n  ✓ 单元测试: 12/12 通过\n  ✓ 集成测试: 5/5 通过\n  ✓ 模拟超时场景: 通过\n  ✓ 库存恢复验证: 通过\n\n覆盖率: 94%', type: 'response' },
      { role: 'system', content: '✅ Issue 已解决！\n\n📊 统计:\n   - 新增代码: 580 行\n   - 测试代码: 320 行\n   - 总耗时: 约 4 小时', type: 'result', highlight: true },
    ],
    tips: ['6角色专业分工', '适合复杂 Issue', '全流程覆盖'],
  },
  {
    id: 'TEAM-003',
    title: '团队全生命周期开发',
    level: 'team',
    category: '团队协作',
    scenario: '从需求到上线的完整流程',
    commands: [
      { cmd: '/team-lifecycle', desc: '团队全生命周期' },
    ],
    steps: [
      { role: 'user', content: '/team-lifecycle "开发用户积分系统"', type: 'command' },
      { role: 'system', content: '┌─ 团队全生命周期 ─────────────────────────────┐\n│ 👥 8 个角色分工                              │\n│                                              │\n│  📊 分析师 - 需求调研                        │\n│  ✍️ 作家 - 文档编写                          │\n│  💬 评论员 - 文档评审                        │\n│  📋 规划师 - 任务拆解                        │\n│  💻 执行者 - 代码实现                        │\n│  🧪 测试者 - 测试验证                        │\n│  👀 审查者 - 代码审查                        │\n│  🚀 发布者 - 部署上线                        │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '选择模式:\n  [1] 完整流程 (需求 → 上线)\n  [2] 只写文档 (需求 → 设计)\n  [3] 只写代码 (设计 → 上线)', type: 'choice' },
      { role: 'user', content: '1', type: 'command' },
      { role: 'system', content: '📊 分析师 需求调研完成...\n💻 执行者 实现代码...\n🧪 测试者 测试验证...\n👀 审查者 代码审查...\n🚀 发布者 部署上线...', type: 'note' },
      { role: 'system', content: '✅ 全生命周期完成！\n\n📊 统计:\n   - 文档: 3 份\n   - 代码: 12 个文件, 2400 行\n   - 测试: 覆盖率 91%\n   - 总耗时: 约 3 天\n\n🚀 已上线到生产环境！', type: 'result', highlight: true },
    ],
    tips: ['8角色全流程覆盖', '三种模式可选', '从需求到上线一站式'],
  },
  {
    id: 'TEAM-004',
    title: '团队技术债务清理',
    level: 'team',
    category: '团队协作',
    scenario: '系统性清理项目技术债务',
    commands: [
      { cmd: '/team-tech-debt', desc: '团队技术债务管理' },
    ],
    steps: [
      { role: 'user', content: '/team-tech-debt', type: 'command' },
      { role: 'system', content: '┌─ 团队技术债务治理 ──────────────────────────┐\n│ 👥 6 个角色分工                              │\n│                                              │\n│  🔍 扫描器 - 发现问题                        │\n│  💰 评估师 - 计算成本                        │\n│  📋 规划师 - 排优先级                        │\n│  💻 执行者 - 修代码                          │\n│  ✅ 验证者 - 测回归                          │\n│  📝 记录者 - 记文档                          │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '🔍 扫描器 发现问题...\n\n技术债务清单:\n\n  🔴 高优先级\n     1. 认证模块缺少单元测试 (覆盖率 23%)\n     2. 数据库查询缺少索引 (10+ 慢查询)\n     3. 硬编码配置 (12 处)\n\n  🟡 中优先级\n     4. 过时的依赖包 (8 个)\n     5. 重复代码 (23 处)', type: 'response' },
      { role: 'system', content: '💰 评估师 计算 ROI...\n📋 规划师 排优先级...\n💻 执行者 修复中...\n✅ 验证者 回归测试...', type: 'note' },
      { role: 'system', content: '✅ 技术债务清理完成！\n\n📊 统计:\n   - 已处理债务: 6 项\n   - 新增测试: 45 个\n   - 性能提升: 查询速度 +60%\n   - 节省维护时间: 约 4h/周', type: 'result', highlight: true },
    ],
    tips: ['6角色治理流程', '自动计算 ROI', '独立工作分支', '自动创建 PR'],
  },
  {
    id: 'TEAM-005',
    title: '团队全生命周期 v5 并行开发',
    level: 'team',
    category: '团队协作',
    scenario: '用 team-worker 代理架构实现实时推送通知系统',
    commands: [
      { cmd: '/team-lifecycle-v5', desc: '团队全生命周期 v5 - team-worker 代理架构' },
    ],
    steps: [
      { role: 'user', content: '/team-lifecycle-v5 "实现实时推送通知系统（WebSocket + 消息队列）"', type: 'command' },
      { role: 'system', content: '┌─ 团队全生命周期 v5 ─────────────────────────┐\n│ 🤖 team-worker 代理架构 (v5 新特性)          │\n│                                              │\n│  ✍️  Spec Writer  — 撰写规格文档              │\n│  📋 Planner      — 任务拆解与排期            │\n│  💻 Developer    — 代码实现 (×2 并发)        │\n│  🧪 Tester       — 编写与运行测试            │\n│  👀 Reviewer     — 代码审查                  │\n│                                              │\n│ ⚡ v5 特性: 每个 worker 独立 Agent，真正并行 │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '✍️ [spec-writer] 撰写规格文档...\n📋 [planner] 任务拆解完成 (6 个 Wave 任务)...\n💻 [developer-1] + [developer-2] 并行执行 Wave 2...\n🧪 [tester] 测试套件: 50 个，覆盖率 93%...\n👀 [reviewer] 审查通过，修复 1 处 N+1 查询', type: 'note' },
      { role: 'system', content: '✅ 团队全生命周期 v5 完成！\n\n📊 执行统计:\n   - 实现任务: 6 个 (2 波并行)\n   - 测试: 50 个，覆盖率 93%\n   - 总耗时: 约 1.5 天 (vs v4 约 2 天)\n\n⚡ v5 team-worker 架构：真正并发，效率提升约 30%', type: 'result', highlight: true },
    ],
    tips: ['v5 team-worker 代理真正并发', '双 Developer 并行执行 Wave', '自动依赖管理，wave 解锁触发', '相比 v4 效率提升约 30%'],
  },
  {
    id: 'TEAM-006',
    title: '通用团队协调 v2 动态角色',
    level: 'team',
    category: '团队协作',
    scenario: '用角色规格文件动态组建团队执行数据库迁移',
    commands: [
      { cmd: '/team-coordinate-v2', desc: '通用团队协调 v2 - 角色规格文件架构' },
    ],
    steps: [
      { role: 'user', content: '/team-coordinate-v2 "将 MySQL 数据库迁移到 PostgreSQL，零停机迁移"', type: 'command' },
      { role: 'system', content: '┌─ 团队协调 v2 ───────────────────────────────┐\n│ 📋 分析需求，动态生成角色规格...            │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '🎭 动态生成专属角色团队:\n\n  .workflow/.team/db-migration/roles/\n  ├── db-analyst.md      # 数据库分析专家\n  ├── migration-dev.md   # 迁移工程师\n  ├── compat-tester.md   # 兼容性测试员\n  └── rollback-guard.md  # 回滚守卫\n\n  v2 特性: 角色行为由 .md 文件精确定义', type: 'response' },
      { role: 'system', content: '🔍 [db-analyst] 扫描 87 张表，发现 23 处 MySQL 专有语法...\n🔧 [migration-dev] 生成 3 阶段零停机迁移方案...\n🧪 [compat-tester] 312/312 兼容性测试通过...\n🛡️ [rollback-guard] 回滚演练通过，触发时 <30s 恢复', type: 'note' },
      { role: 'system', content: '✅ 数据库迁移方案完成！\n\n📊 统计:\n   - 4 个专属角色 (自动生成规格文件)\n   - 风险点 23 个，全部处理\n   - 预计停机: 0 分钟\n\n🎭 v2 角色规格文件可复用于下次迁移', type: 'result', highlight: true },
    ],
    tips: ['v2 用 .md 文件定义角色行为', '角色规格可跨项目复用', '动态生成最适合当前任务的团队', '比 v1 角色行为更可预测'],
  },
  {
    id: 'TEAM-007',
    title: '团队超深度代码分析',
    level: 'team',
    category: '团队协作',
    scenario: '上线前对核心支付模块进行多角度深度安全质量分析',
    commands: [
      { cmd: '/team-ultra-analyze', desc: '团队超深度分析 - 全面代码分析' },
    ],
    steps: [
      { role: 'user', content: '/team-ultra-analyze "src/payment/ 上线前全面分析"', type: 'command' },
      { role: 'system', content: '┌─ 团队超深度分析 ────────────────────────────┐\n│ 🔬 多角色并行分析，深度超越单次 review      │\n│                                              │\n│  🛡️  安全分析师 — OWASP Top 10 扫描          │\n│  ⚡ 性能专家   — 热路径 + 内存分析           │\n│  🏗️  架构审查员 — 设计模式 + 耦合度          │\n│  🧪 测试评审员 — 覆盖率 + 边界条件           │\n│  📖 可维护性专家 — 复杂度 + 可读性          │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '🛡️ [security] 安全扫描:\n\n  🔴 严重: payment/processor.ts:147 金额浮点数精度漏洞\n  🟠 高危: webhook 签名验证可被时序攻击\n  🟠 高危: 日志输出 PAN (PCI-DSS 违规)\n\n⚡ [performance] calculateFee() 高并发锁竞争\n🏗️ [architecture] PaymentService 职责过多 (SRP 违反)\n🧪 [test-review] 覆盖率 76%，失败重试逻辑 0% 覆盖\n📖 [maintainability] processPayment() 圈复杂度 23', type: 'response' },
      { role: 'system', content: '✅ 超深度分析完成！\n\n📊 综合风险矩阵:\n   安全: 4/10  性能: 7/10  架构: 6/10  测试: 5/10  维护: 6/10\n\n🚨 上线前必须修复:\n   1. 金额浮点数精度漏洞 (安全)\n   2. 补充失败重试和超时测试 (测试)\n\n📁 产出: .workflow/analysis/payment-ultra-report.md', type: 'result', highlight: true },
    ],
    tips: ['5角色并行分析，无盲区', '安全/性能/架构/测试/可维护性全覆盖', '综合风险矩阵，一目了然', '关键问题自动标记阻塞上线'],
  },
  {
    id: 'TEAM-008',
    title: '团队质量保证 QA 验证',
    level: 'team',
    category: '团队协作',
    scenario: '新功能发布前，QA 团队全流程验证',
    commands: [
      { cmd: '/team-quality-assurance', desc: '团队质量保证 - QA 角色协作' },
    ],
    steps: [
      { role: 'user', content: '/team-quality-assurance "用户积分系统 v2.0 发布前 QA"', type: 'command' },
      { role: 'system', content: '┌─ 团队质量保证 ──────────────────────────────┐\n│ 🎯 QA 全流程覆盖                             │\n│                                              │\n│  📋 QA Lead      — 制定测试策略              │\n│  🔬 功能测试员   — 验证需求覆盖              │\n│  🔗 集成测试员   — 验证系统联动              │\n│  🚀 性能测试员   — 压测与基准对比            │\n│  ♿ 可用性测试员  — UX + 无障碍检查          │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '🔬 [functional-tester] 功能验证: 49 个用例，47 通过，2 修复\n🔗 [integration-tester] 集成验证: 24/24 通过，退款积分不一致 P0\n🚀 [perf-tester] 性能: 全面提升 ~70%，1000 QPS 压测通过\n♿ [ux-tester] 可用性: WCAG AA 通过，修复 aria-label 缺失', type: 'note' },
      { role: 'system', content: '✅ QA 验证完成！\n\n📊 质量报告摘要:\n   - 功能: 47/49 通过 (2 已修复)\n   - 集成: 24/24 通过 (1 待修复)\n   - 性能: 全面提升 ~70%\n\n🚨 上线阻塞项: 退款积分不一致 (P0)\n\n📁 产出: .workflow/qa/points-v2-qa-report.md', type: 'result', highlight: true },
    ],
    tips: ['5角色专业 QA 分工', '功能/集成/性能/UX 全覆盖', '自动对比历史基准', '阻塞项明确标出，不漏放'],
  },
];

// ============================================
// UI 设计案例
// ============================================
export const UI_CASES: Case[] = [
  {
    id: 'UI-001',
    title: 'UI 设计从零开始',
    level: 'ui',
    category: 'UI设计',
    scenario: '根据需求设计完整 UI',
    commands: [
      { cmd: '/workflow:ui-design:explore-auto', desc: '探索式 UI 设计' },
      { cmd: '/workflow:ui-design:generate', desc: '组装 UI 原型' },
    ],
    steps: [
      { role: 'user', content: '/workflow:ui-design:explore-auto "设计一个任务管理应用的仪表盘页面"', type: 'command' },
      { role: 'system', content: '📋 设计需求分析:\n\n  核心功能:\n    - 任务统计卡片 (待办/进行中/已完成)\n    - 今日任务列表\n    - 快速添加任务\n    - 截止日期提醒\n\n  🎨 自动提取设计系统:\n    - Primary: #6366f1 (Indigo)\n    - 字体: Inter\n    - 间距: 16px/24px', type: 'response' },
      { role: 'user', content: '/workflow:ui-design:generate', type: 'command' },
      { role: 'system', content: '✅ UI 原型生成完成！\n\n📁 产出文件:\n   - src/components/Dashboard/StatsCard.tsx\n   - src/components/Dashboard/TaskList.tsx\n   - src/components/Dashboard/AddTaskModal.tsx\n   - src/styles/design-tokens.css\n\n🌐 预览地址: http://localhost:3000/dashboard', type: 'result', highlight: true },
    ],
    tips: ['自动分析设计需求', '提取设计系统', '生成可运行代码'],
  },
  {
    id: 'UI-002',
    title: 'UI 复刻参考网站',
    level: 'ui',
    category: 'UI设计',
    scenario: '根据设计稿或网站快速复刻',
    commands: [
      { cmd: '/workflow:ui-design:imitate-auto', desc: '高速 UI 复刻' },
    ],
    steps: [
      { role: 'user', content: '/workflow:ui-design:imitate-auto', type: 'command' },
      { role: 'system', content: '📋 请提供参考素材:\n\n  [1] 输入网站 URL\n  [2] 上传设计图\n  [3] 描述设计风格', type: 'note' },
      { role: 'user', content: '1\nhttps://linear.app', type: 'command' },
      { role: 'system', content: '📊 分析结果:\n\n  设计风格:\n    - 暗色主题 (#0a0a0f 背景)\n    - 紫色强调色 (#8b5cf6)\n    - 玻璃拟态卡片\n\n  布局结构:\n    - 左侧固定导航\n    - 顶部搜索栏\n    - 主内容区 + 右侧详情面板', type: 'response' },
      { role: 'system', content: '✅ 复刻完成！\n\n📁 产出文件:\n   - src/styles/linear-theme.css\n   - src/components/Layout/Sidebar.tsx\n   - src/components/Layout/Header.tsx\n\n🎨 相似度: 约 85%', type: 'result', highlight: true },
    ],
    tips: ['支持 URL 或设计图', '自动提取设计风格', '生成可用代码'],
  },
  {
    id: 'UI-003',
    title: '提取设计系统',
    level: 'ui',
    category: 'UI设计',
    scenario: '从现有代码提取设计规范',
    commands: [
      { cmd: '/workflow:ui-design:style-extract', desc: '提取设计风格' },
      { cmd: '/workflow:ui-design:codify-style', desc: '样式代码化' },
    ],
    steps: [
      { role: 'user', content: '/workflow:ui-design:style-extract', type: 'command' },
      { role: 'system', content: '📊 提取结果:\n\n  颜色 (12 个): #6366f1, #10b981, #0a0a0f...\n  字体 (3 个): Inter, JetBrains Mono...\n  间距 (6 个): 4px, 8px, 16px, 24px...\n  圆角 (4 个): 4px, 8px, 16px, 9999px', type: 'response' },
      { role: 'user', content: '/workflow:ui-design:codify-style', type: 'command' },
      { role: 'system', content: '✅ 设计系统代码化完成！\n\n📁 产出文件:\n   - src/styles/tokens.css (CSS 变量)\n   - tailwind.config.js (Tailwind 配置)\n   - src/types/design-tokens.ts (类型定义)', type: 'result', highlight: true },
    ],
    tips: ['从代码反向提取设计', '生成多种格式', '支持 Tailwind 和 CSS 变量'],
  },
];

// ============================================
// Memory 记忆系统案例
// ============================================
export const MEMORY_CASES: Case[] = [
  {
    id: 'MEM-001',
    title: '加载项目上下文',
    level: 'memory',
    category: '记忆系统',
    scenario: '快速了解项目结构',
    commands: [
      { cmd: '/memory:prepare', desc: '加载项目上下文' },
    ],
    steps: [
      { role: 'user', content: '/memory:prepare', type: 'command' },
      { role: 'system', content: '📋 项目概览:\n\n  项目名称: CCW 命令百科\n  技术栈: React + TypeScript + Vite\n\n  目录结构:\n    src/\n    ├── components/    # UI 组件\n    ├── data/          # 数据文件\n    └── hooks/         # 自定义 Hooks\n\n  约定: 组件 PascalCase，函数 camelCase', type: 'response' },
      { role: 'system', content: '✅ 上下文已加载！AI 将自动应用项目约定', type: 'result', highlight: true },
    ],
    tips: ['快速了解新项目', '加载项目约定', '后续对话自动应用'],
  },
  {
    id: 'MEM-002',
    title: '会话记忆压缩',
    level: 'memory',
    category: '记忆系统',
    scenario: '压缩长会话为结构化笔记',
    commands: [
      { cmd: '/memory-capture', desc: '压缩会话记忆' },
    ],
    steps: [
      { role: 'user', content: '/memory-capture', type: 'command' },
      { role: 'system', content: '📊 当前会话长度: 15,234 tokens\n🔄 压缩中...', type: 'response' },
      { role: 'system', content: '📋 压缩结果:\n\n  🎯 目标: 实现 OAuth2 认证系统\n  📝 进度: 3/6 完成\n  📁 关键文件: src/auth/oauth.ts\n  💡 决策: JWT session, 7天 Refresh Token\n  ⚠️ 待解决: CSRF state 验证, Redis 缓存', type: 'response' },
      { role: 'system', content: '✅ 压缩完成！\n\n  压缩前: 15,234 tokens → 压缩后: 1,856 tokens (87.8%)\n  📁 保存: .workflow/memory/session-compact.md', type: 'result', highlight: true },
    ],
    tips: ['压缩长会话', '保留关键信息', '方便下次恢复'],
  },
  {
    id: 'MEM-003',
    title: '更新项目文档',
    level: 'memory',
    category: '记忆系统',
    scenario: '增量更新 CLAUDE.md 文档',
    commands: [
      { cmd: '/memory-manage', desc: '增量更新文档' },
    ],
    steps: [
      { role: 'user', content: '/memory-manage', type: 'command' },
      { role: 'system', content: '📁 检测到变更的模块:\n  - src/auth/\n  - src/components/Dashboard/', type: 'response' },
      { role: 'system', content: '✅ 文档更新完成！\n\n  ✓ src/auth/CLAUDE.md - 更新认证模块文档\n  ✓ src/components/Dashboard/CLAUDE.md - 新增仪表盘组件文档', type: 'result', highlight: true },
    ],
    tips: ['只更新变更相关的文档', '根据 git diff 智能分析', '日常开发中的文档维护'],
  },
];

// ============================================
// Session 会话管理案例
// ============================================
export const SESSION_CASES: Case[] = [
  {
    id: 'SESS-001',
    title: '工作流会话管理',
    level: 'session',
    category: '会话管理',
    scenario: '管理开发工作流会话',
    commands: [
      { cmd: '/workflow:session:start', desc: '开始新会话' },
      { cmd: '/workflow:session:list', desc: '列出所有会话' },
      { cmd: '/workflow:session:resume', desc: '恢复会话' },
      { cmd: '/workflow:session:complete', desc: '完成会话' },
    ],
    steps: [
      { role: 'user', content: '/workflow:session:start', type: 'command' },
      { role: 'system', content: '✅ 新会话已创建！\n\n  Session ID: WFS-Payment-2025-12-15\n  📁 目录: .workflow/sessions/WFS-Payment/', type: 'response' },
      { role: 'user', content: '/workflow:session:list', type: 'command' },
      { role: 'system', content: '┌─ 会话列表 ─────────────────────────────────┐\n│ 🟢 WFS-Payment-2025-12-15 [活跃] 3/6 任务  │\n│ 🟡 WFS-OAuth2-2025-12-10 [暂停] 5/6 任务  │\n│ ✅ WFS-User-Profile-2025-12-05 [完成]      │\n└────────────────────────────────────────────┘', type: 'response' },
      { role: 'user', content: '/workflow:session:resume', type: 'command' },
      { role: 'system', content: '🔄 恢复 WFS-OAuth2，剩余任务: [6/6] 集成测试', type: 'response' },
      { role: 'user', content: '/workflow:session:complete', type: 'command' },
      { role: 'system', content: '✅ 会话已完成并归档！\n\n  📊 统计: 8小时 | 6任务 | 12个文件变更\n  📁 归档: .workflow/archive/WFS-OAuth2/', type: 'result', highlight: true },
    ],
    tips: ['创建/暂停/恢复/完成工作流', '自动追踪进度', '归档后可回溯'],
  },
  {
    id: 'SESS-002',
    title: '固化会话经验',
    level: 'session',
    category: '会话管理',
    scenario: '将学到的经验保存为项目规则',
    commands: [
      { cmd: '/workflow:session:solidify', desc: '固化会话经验' },
    ],
    steps: [
      { role: 'user', content: '/workflow:session:solidify', type: 'command' },
      { role: 'system', content: '📊 发现可复用经验:\n\n  1. OAuth2 state 参数必须验证 (防 CSRF)\n  2. Token 刷新应该使用无状态 JWT\n  3. Provider 抽象使用策略模式\n  4. 测试必须覆盖 token 过期场景\n\n是否保存到项目规则？', type: 'note' },
      { role: 'user', content: '是', type: 'command' },
      { role: 'system', content: '✅ 经验已固化到 CLAUDE.md！\n\n  新增 OAuth2 开发规范章节:\n  - 安全要求 (state, PKCE)\n  - Token 管理 (时效配置)\n  - 代码规范 (策略模式)', type: 'result', highlight: true },
    ],
    tips: ['从会话提取经验', '自动生成项目规则', '后续对话自动应用'],
  },
  {
    id: 'SESS-003',
    title: '同步会话产出到规格文档',
    level: 'session',
    category: '会话管理',
    scenario: '开发完成后将会话成果同步更新到 specs/*.md 和技术文档',
    commands: [
      { cmd: '/workflow:session:sync', desc: '同步会话工作到规格文档' },
    ],
    steps: [
      { role: 'user', content: '/workflow:session:sync', type: 'command' },
      { role: 'system', content: '📋 检测活跃会话: WFS-Payment-2026-01-20\n🔍 扫描会话产出...\n\n  新增文件: src/payment/retry.ts, src/payment/idempotent.ts\n  关键决策: 指数退避重试, 幂等 key = orderId+timestamp', type: 'response' },
      { role: 'system', content: '🔄 与规格文档对比差异:\n\n  specs/payment/architecture.md — 缺少重试策略\n  specs/payment/api-contract.md — 幂等 header 未记录\n  project-tech.md — 支付模块技术栈未列入\n\n是否同步这 3 处更新？(y/n)', type: 'note' },
      { role: 'user', content: 'y', type: 'command' },
      { role: 'system', content: '✅ 会话同步完成！\n\n  ✅ specs/payment/architecture.md — 追加「重试与幂等设计」\n  ✅ specs/payment/api-contract.md — 新增 X-Idempotency-Key\n  ✅ project-tech.md — 列入 Decimal.js, ioredis\n\n💡 specs 文档已与实际代码保持一致', type: 'result', highlight: true },
    ],
    tips: ['自动检测会话产出与规格文档的差异', '精准同步，不覆盖无关内容', '保持文档与代码实现始终一致', '开发完成后立即运行，养成好习惯'],
  },
];

// ============================================
// Multi-CLI 多终端协作案例
// ============================================
export const MULTI_CLI_CASES: Case[] = [
  {
    id: 'MCLI-001',
    title: 'Claude Code 规划 + Codex 执行标准流水线',
    level: 'multi-cli',
    category: '双CLI协作',
    scenario: 'Claude Code 生成协作规划文档，Codex 消费并执行实现',
    commands: [
      { cmd: '/workflow:collaborative-plan-with-file', desc: '协作式规划，输出规划文件 (Claude Code)' },
      { cmd: '/unified-execute-with-file', desc: '通用执行引擎，消费规划文件 (Codex)' },
    ],
    steps: [
      { role: 'user', content: '[Claude Code]\n/workflow:collaborative-plan-with-file "为电商平台实现优惠券系统"', type: 'command' },
      { role: 'system', content: '┌─ 协作式规划 (Claude Code) ──────────────────┐\n│ 📋 分析需求...                              │\n│ 🔍 探索现有代码库...                        │\n│ 🧠 多维度规划中...                          │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📊 规划文档已生成:\n\n  .workflow/plans/coupon-system-plan.md\n\n  内容:\n  ├── 背景与目标\n  ├── 架构设计 (策略模式 + 状态机)\n  ├── 数据模型 (CouponTemplate, CouponCode)\n  ├── 任务分解 (6 个 IMPL 任务)\n  └── 技术约束 (幂等, 并发控制)\n\n✅ 规划完成，文件已输出供 Codex 消费', type: 'result', highlight: true },
      { role: 'user', content: '[Codex]\n/unified-execute-with-file .workflow/plans/coupon-system-plan.md', type: 'command' },
      { role: 'system', content: '┌─ 通用执行引擎 (Codex) ──────────────────────┐\n│ 📖 解析规划文件...                          │\n│ 🔄 构建任务 DAG...                          │\n│ 🚀 开始执行...                              │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '🔄 执行进度:\n\n  ✅ IMPL-001: CouponTemplate 数据模型\n  ✅ IMPL-002: CouponCode 状态机\n  ✅ IMPL-003: 优惠券发放服务\n  ✅ IMPL-004: 优惠券核销服务\n  ✅ IMPL-005: 并发冲突防护 (Redis 锁)\n  ✅ IMPL-006: REST API + 集成测试\n\n覆盖率: 91%', type: 'response' },
      { role: 'system', content: '✅ 执行完成！\n\n📊 统计:\n   - 新增文件: 8 个\n   - 代码行数: 1,240 行\n   - 测试: 34 个，全部通过\n\n💡 Claude Code 负责思考规划，Codex 负责快速实现\n   两者分工协作，发挥各自优势', type: 'result', highlight: true },
    ],
    tips: [
      'Claude Code 擅长需求理解和架构规划',
      'Codex 擅长快速代码实现',
      '规划文件是两个 CLI 的协作接口',
      '可将规划文件保存复用，随时让 Codex 重新执行',
    ],
  },
  {
    id: 'MCLI-002',
    title: 'IDAW 任务驱动开发全流程',
    level: 'multi-cli',
    category: 'IDAW工作流',
    scenario: '用 IDAW 管理多任务串行执行，支持中断恢复',
    commands: [
      { cmd: '/idaw:add', desc: '添加 IDAW 任务队列' },
      { cmd: '/idaw:run', desc: 'IDAW 串行执行器' },
      { cmd: '/idaw:status', desc: '查看执行进度' },
      { cmd: '/idaw:resume', desc: '恢复中断会话' },
    ],
    steps: [
      { role: 'user', content: '/idaw:add', type: 'command' },
      { role: 'system', content: '📋 IDAW 任务添加模式:\n\n  请输入任务 (每行一个)，或粘贴 issue ID:\n  > ', type: 'note' },
      { role: 'user', content: '实现用户消息通知系统\n实现邮件模板引擎\n实现推送消息队列\n集成测试 + 文档', type: 'command' },
      { role: 'system', content: '✅ 已添加 4 个 IDAW 任务:\n\n  IDAW-001: 实现用户消息通知系统\n  IDAW-002: 实现邮件模板引擎\n  IDAW-003: 实现推送消息队列\n  IDAW-004: 集成测试 + 文档\n\n📁 会话: .workflow/idaw/session-notification/', type: 'response' },
      { role: 'user', content: '/idaw:run', type: 'command' },
      { role: 'system', content: '🚀 IDAW 执行器启动...\n\n  ⚡ 串行执行，每任务独立 git commit\n\n  ▶️  IDAW-001 执行中...\n    - 分析需求，生成实现方案\n    - 编写代码: NotificationService.ts\n    - 运行测试: 8/8 通过\n  ✅ IDAW-001 完成！(commit: a3f2b1c)\n\n  ▶️  IDAW-002 执行中...\n    - 邮件模板引擎实现中...', type: 'response' },
      { role: 'system', content: '⚠️ 连接中断！\n\n  IDAW-001: ✅ 已完成\n  IDAW-002: 🔄 执行中 (50%)\n  IDAW-003: ⏳ 待执行\n  IDAW-004: ⏳ 待执行\n\n  📸 检查点已保存', type: 'note' },
      { role: 'user', content: '/idaw:status', type: 'command' },
      { role: 'system', content: '📊 IDAW 会话状态:\n\n  会话: session-notification\n  进度: 1/4 完成 (25%)\n\n  ┌────────────┬────────┬──────────────┐\n  │ 任务       │ 状态   │ Commit       │\n  │────────────┼────────┼──────────────│\n  │ IDAW-001   │ ✅ 完成 │ a3f2b1c     │\n  │ IDAW-002   │ 🔄 中断 │ -            │\n  │ IDAW-003   │ ⏳ 待做 │ -            │\n  │ IDAW-004   │ ⏳ 待做 │ -            │\n  └────────────┴────────┴──────────────┘', type: 'response' },
      { role: 'user', content: '/idaw:resume', type: 'command' },
      { role: 'system', content: '🔄 恢复 IDAW 会话: session-notification\n\n  从检查点继续 IDAW-002...\n\n  ▶️  IDAW-002 继续执行...\n  ✅ IDAW-002 完成！(commit: d8e9f0a)\n\n  ▶️  IDAW-003 执行...\n  ✅ IDAW-003 完成！(commit: b5c6d7e)\n\n  ▶️  IDAW-004 执行...\n  ✅ IDAW-004 完成！(commit: f1a2b3c)\n\n✅ 所有 IDAW 任务完成！\n\n📊 统计:\n   - 总任务: 4 个\n   - 总 commit: 4 个 (每任务独立)\n   - 自动恢复: 1 次中断', type: 'result', highlight: true },
    ],
    tips: [
      'IDAW 适合多任务串行开发场景',
      '每任务完成后自动 git commit，进度安全',
      '中断后 /idaw:resume 无缝恢复',
      '可从 CCW Issue 直接导入任务队列',
    ],
  },
  {
    id: 'MCLI-003',
    title: 'Claude Code 深度分析 + Codex Wave 实现',
    level: 'multi-cli',
    category: '双CLI协作',
    scenario: 'Claude Code 深度分析架构问题，输出分析文件，Codex 波浪式 TDD 实现修复',
    commands: [
      { cmd: '/workflow:analyze-with-file', desc: '交互式协作分析，产出分析文件 (Claude Code)' },
      { cmd: '/wave-plan-pipeline', desc: '波浪式规划执行，先勘探再施工 (Codex)' },
    ],
    steps: [
      { role: 'user', content: '[Claude Code]\n/workflow:analyze-with-file "分析支付模块性能瓶颈和架构问题"', type: 'command' },
      { role: 'system', content: '┌─ 交互式协作分析 (Claude Code) ──────────────┐\n│ 🔍 多角度探索分析...                        │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '📊 分析发现:\n\n  🔴 P0 瓶颈:\n    - calculateFee() 每次调用查 DB (N+1)\n    - 汇率缓存完全缺失\n    - 支付验证串行执行，可并行化\n\n  🟡 架构问题:\n    - PaymentService 职责过多\n    - 缺乏 Circuit Breaker 保护\n    - 重试逻辑散落各处\n\n  📁 分析文件: .workflow/analysis/payment-analysis.md\n✅ 分析完成，文件已输出供 Codex 消费', type: 'result', highlight: true },
      { role: 'user', content: '[Codex]\n/wave-plan-pipeline .workflow/analysis/payment-analysis.md', type: 'command' },
      { role: 'system', content: '┌─ Wave 规划执行 (Codex) ─────────────────────┐\n│ 🌊 先勘探，再施工                           │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '🌊 Wave 1 — 勘探阶段:\n\n  读取分析文件，理解改造范围...\n  评估每个问题的影响面...\n  规划最小破坏性修复顺序...\n\n  执行计划:\n  ├── Wave 2: 汇率缓存层 (独立，无风险)\n  ├── Wave 3: N+1 查询修复 (需迁移)\n  ├── Wave 4: 并行验证改造 (需测试)\n  └── Wave 5: Circuit Breaker 集成', type: 'response' },
      { role: 'system', content: '🌊 Wave 2 — 汇率缓存层:\n  ✅ ExchangeRateCache.ts 实现完成\n  ✅ 测试: calculateFee() P99 8ms → 0.3ms\n\n🌊 Wave 3 — N+1 修复:\n  ✅ 批量查询重构完成\n  ✅ DB 调用减少 87%\n\n🌊 Wave 4 — 并行验证:\n  ✅ Promise.all() 重构\n  ✅ 验证延迟 180ms → 45ms\n\n🌊 Wave 5 — Circuit Breaker:\n  ✅ opossum 集成完成', type: 'response' },
      { role: 'system', content: '✅ Wave 执行完成！\n\n📊 性能改善:\n   - calculateFee()  : 8ms → 0.3ms (-96%)\n   - processPayment(): 180ms → 45ms (-75%)\n   - DB 调用数       : -87%\n\n💡 Claude Code 深度分析定位问题，Codex 波浪式稳健实现\n   分析文件是两者的协作接口', type: 'result', highlight: true },
    ],
    tips: [
      'Claude Code 擅长深度分析和问题定位',
      'Codex Wave 模式先勘探再施工，风险更低',
      '分析文件让 Codex 理解改造背景和优先级',
      '适合性能优化、架构重构等探索性任务',
    ],
  },
  {
    id: 'MCLI-004',
    title: '头脑风暴 → Issue → Codex 并行执行',
    level: 'multi-cli',
    category: '双CLI协作',
    scenario: 'Claude Code 创意规划并创建 Issue，Codex 并行多 Agent 开发循环',
    commands: [
      { cmd: '/workflow:brainstorm-with-file', desc: '交互式头脑风暴，产出创意文件 (Claude Code)' },
      { cmd: '/issue:from-brainstorm', desc: '从头脑风暴创建 Issue 队列 (Claude Code)' },
      { cmd: '/parallel-dev-cycle', desc: '多 Agent 并行开发循环 (Codex)' },
    ],
    steps: [
      { role: 'user', content: '[Claude Code]\n/workflow:brainstorm-with-file "电商平台下一版本功能规划"', type: 'command' },
      { role: 'system', content: '┌─ 交互式头脑风暴 (Claude Code) ──────────────┐\n│ 🧠 多角度创意发散...                        │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '💡 头脑风暴产出 (top 6 创意):\n\n  1. AI 个性化推荐引擎\n  2. 社交分享 + 裂变优惠\n  3. 直播购物集成\n  4. 智能客服机器人\n  5. 供应商协作门户\n  6. 数据分析仪表盘\n\n  📁 创意文件: .workflow/brainstorm/v2-features.md', type: 'result', highlight: true },
      { role: 'user', content: '/issue:from-brainstorm .workflow/brainstorm/v2-features.md', type: 'command' },
      { role: 'system', content: '📋 从头脑风暴生成 Issue:\n\n  优先级评估中...\n  拆解实现任务...\n\n  生成 Issue:\n  #42 AI 个性化推荐引擎 (高优先级)\n  #43 社交分享 + 裂变 (高优先级)\n  #44 智能客服机器人 (中优先级)\n  #45 数据分析仪表盘 (中优先级)\n\n✅ 4 个 Issue 已创建', type: 'response' },
      { role: 'user', content: '[Codex]\n/parallel-dev-cycle --issues 42,43,44,45', type: 'command' },
      { role: 'system', content: '┌─ 并行开发循环 (Codex) ──────────────────────┐\n│ ⚡ 多 Agent 并行执行                        │\n└──────────────────────────────────────────────┘', type: 'response' },
      { role: 'system', content: '🔀 并行分配 Agent:\n\n  Agent-1 → Issue #42 AI 推荐引擎\n  Agent-2 → Issue #43 社交分享\n  Agent-3 → Issue #44 智能客服\n  Agent-4 → Issue #45 数据仪表盘\n\n  ⚡ 4 个 Agent 同时工作中...', type: 'response' },
      { role: 'system', content: '📊 执行进度:\n\n  Agent-1 [Issue #42] ✅ AI 推荐引擎完成 (3.2h)\n  Agent-2 [Issue #43] ✅ 社交分享完成 (2.1h)\n  Agent-3 [Issue #44] ✅ 智能客服完成 (4.5h)\n  Agent-4 [Issue #45] ✅ 数据仪表盘完成 (2.8h)\n\n✅ 并行开发完成！\n\n📊 统计:\n   - 并行 Agent: 4 个\n   - 总开发时间: 4.5h (串行约 12.6h)\n   - 效率提升: 约 3x\n\n💡 Claude Code 负责创意策划和 Issue 管理\n   Codex 多 Agent 并行实现，极大缩短交付时间', type: 'result', highlight: true },
    ],
    tips: [
      'Claude Code 擅长需求梳理和 Issue 创建',
      'Codex 并行多 Agent 大幅缩短实现时间',
      '头脑风暴 → Issue → 执行，形成完整创意到代码流水线',
      '适合版本规划、功能冲刺等批量开发场景',
    ],
  },
];

// ============================================
// 聚合导出
// ============================================
export const ALL_CASES: Case[] = [
  ...LEVEL_1_CASES,
  ...LEVEL_2_CASES,
  ...SKILL_CASES,
  ...LEVEL_3_CASES,
  ...LEVEL_4_CASES,
  ...ISSUE_CASES,
  ...TEAM_CASES,
  ...UI_CASES,
  ...MEMORY_CASES,
  ...SESSION_CASES,
  ...MULTI_CLI_CASES,
];

export const CASES_BY_LEVEL: Record<string, Case[]> = {
  '1': LEVEL_1_CASES,
  '2': LEVEL_2_CASES,
  'skill': SKILL_CASES,
  '3': LEVEL_3_CASES,
  '4': LEVEL_4_CASES,
  'issue': ISSUE_CASES,
  'team': TEAM_CASES,
  'ui': UI_CASES,
  'memory': MEMORY_CASES,
  'session': SESSION_CASES,
  'multi-cli': MULTI_CLI_CASES,
};

export const LEVEL_CONFIG: Record<string, { name: string; emoji: string; color: string; desc: string }> = {
  '1': { name: '超简单', emoji: '⚡', color: '#4ade80', desc: '超简单任务' },
  '2': { name: '轻量规划', emoji: '🚀', color: '#60a5fa', desc: '轻量规划与执行' },
  'skill': { name: '专项技能', emoji: '🎯', color: '#c084fc', desc: '专项技能' },
  '3': { name: '标准工作流', emoji: '🔧', color: '#fb923c', desc: '标准工作流' },
  '4': { name: '探索性任务', emoji: '🌊', color: '#67e8f9', desc: '探索性任务' },
  'issue': { name: 'Issue 工作流', emoji: '🐛', color: '#f87171', desc: 'Issue 工作流' },
  'team': { name: '团队协作', emoji: '👥', color: '#818cf8', desc: '团队协作' },
  'ui': { name: 'UI 设计', emoji: '🎨', color: '#f472b6', desc: 'UI 设计' },
  'memory': { name: '记忆系统', emoji: '🧠', color: '#fbbf24', desc: '记忆系统' },
  'session': { name: '会话管理', emoji: '💾', color: '#2dd4bf', desc: '会话管理' },
  'multi-cli': { name: '多 CLI 协作', emoji: '🔀', color: '#a78bfa', desc: '多 CLI 协作' },
};
