// ============================================
// 智能推荐器 - 任务类型检测规则
// ============================================
import type { TaskPattern, CommandChain, MatchResult, IntentAnalysis } from './types';

// 改进1: 增强关键词覆盖，添加更多同义词/近义词
// 改进3: 添加权重字段，用于多匹配时的优先级判断
export const TASK_PATTERNS: TaskPattern[] = [
  // Level 1 - 超简单（使用精确短语避免贪婪匹配）
  { type: 'quick-fix', keywords: /改个|换个|改下|换下|小改一下|修改.*名|简单.*改/, level: 1, flow: 'rapid', desc: '快速修改', emoji: '⚡', weight: 100 },

  // With-File workflows（使用精确短语）
  { type: 'greenfield', keywords: /从零开始|from scratch|0\s*to\s*1|greenfield|全新开发|新项目|new project|空白开始/, level: 4, flow: 'greenfield', desc: '0→1 全新开发', emoji: '🌱', weight: 95 },
  { type: 'brainstorm', keywords: /brainstorm|ideation|头脑风暴|创意设计|发散思维|creative thinking|multi-perspective|compare perspectives|多角度|集思广益|头脑激荡|想几个方案|思考方案|方案设想/, level: 4, flow: 'brainstorm-to-plan', desc: '头脑风暴', emoji: '🧠', weight: 95 },
  { type: 'debug-file', keywords: /debug document|hypothesis debug|troubleshoot track|investigate log|调试记录|假设验证|systematic debug|深度调试|排查问题|定位问题|诊断问题/, level: 3, flow: 'debug-with-file', desc: '深度调试', emoji: '🔍', weight: 90 },
  { type: 'analyze-file', keywords: /analyze document|explore concept|understand architecture|investigate discuss|collaborative analysis|分析讨论|深度理解|协作分析|帮我分析|理解代码|理解架构|分析架构|充分理解/, level: 3, flow: 'analyze-to-plan', desc: '协作分析', emoji: '📊', weight: 90 },
  { type: 'collaborative-plan', keywords: /collaborative plan|协作规划|多人规划|multi agent plan|Plan Note|分工规划|一起规划|协同设计|协作设计|架构设计|架构扩展/, level: 3, flow: 'collaborative-plan', desc: '协作规划', emoji: '👥', weight: 88 },
  { type: 'roadmap', keywords: /roadmap|路线图|规划图|发展路径|阶段计划|里程碑/, level: 4, flow: 'roadmap', desc: '路线图规划', emoji: '🗺️', weight: 85 },

  // Cycle workflows
  { type: 'integration-test', keywords: /integration test|集成测试|端到端测试|e2e test|integration cycle|联调测试|系统测试/, level: 3, flow: 'integration-test-cycle', desc: '集成测试循环', emoji: '🔄', weight: 85 },
  { type: 'refactor', keywords: /refactor|重构|tech debt|技术债务|优化代码|改进架构|清理代码/, level: 3, flow: 'refactor-cycle', desc: '重构循环', emoji: '🔨', weight: 85 },

  // Issue workflows
  { type: 'issue-batch', keywords: /issues|batch fix|批量修复|多个问题|批量处理/, level: 2, flow: 'issue', desc: 'Issue 批量处理', emoji: '🐛', weight: 80 },

  // Team workflows
  { type: 'team-planex', keywords: /team plan exec|team planex|团队规划执行|并行规划执行|wave pipeline|团队协作|多人执行/, level: 4, flow: 'team-planex', desc: 'Team 并行执行', emoji: '🚀', weight: 85 },

  // Standard workflows
  { type: 'multi-cli', keywords: /multi cli|多 CLI|多模型协作|multi model collab|多终端|多个 AI|多模型/, level: 3, flow: 'multi-cli-plan', desc: '多CLI协作', emoji: '🤖', weight: 80 },
  { type: 'bugfix-hotfix', keywords: /urgent|production|critical|紧急|线上问题|hotfix|生产问题|立刻修|马上修/, level: 2, flow: 'bugfix.hotfix', desc: '紧急修复', emoji: '🚨', weight: 100 },
  { type: 'bugfix', keywords: /fix|bug|error|crash|fail|debug|修复|解决|问题|报错|异常|出错|不对|不正常/, level: 2, flow: 'bugfix.standard', desc: 'Bug修复', emoji: '🔧', weight: 70 },
  { type: 'tdd', keywords: /tdd|test-driven|test first|测试驱动|先写测试|测试先行/, level: 3, flow: 'tdd', desc: 'TDD开发', emoji: '🧪', weight: 90 },
  { type: 'test-gen', keywords: /generate test|写测试|add test|补充测试|生成测试|添加测试|增加测试/, level: 3, flow: 'test-gen', desc: '测试生成', emoji: '🔬', weight: 85 },
  { type: 'test-fix', keywords: /test fail|fix test|failing test|测试失败|测试不过|测试报错/, level: 3, flow: 'test-fix-gen', desc: '测试修复', emoji: '✅', weight: 85 },
  { type: 'review', keywords: /review|code review|代码审查|审查代码|检查代码|code check|评审代码/, level: 3, flow: 'review-cycle-fix', desc: '代码审查', emoji: '👀', weight: 80 },
  { type: 'ui-design', keywords: /ui design|design|component|style|界面设计|UI设计|样式设计|前端组件|页面设计|交互设计/, level: 3, flow: 'ui', desc: 'UI设计', emoji: '🎨', weight: 75 },
  { type: 'spec-driven', keywords: /spec gen|specification|PRD|产品需求|产品文档|产品规格|需求文档|规格说明/, level: 4, flow: 'spec-driven', desc: '规格驱动', emoji: '📋', weight: 90 },
  { type: 'exploration', keywords: /uncertain|explore|research|what if|不确定|探索|研究|调研|可行性分析|评估方案|比较方案|方案对比/, level: 4, flow: 'full', desc: '探索性任务', emoji: '🔎', weight: 85 },
  { type: 'quick-task', keywords: /quick|simple|small task|快速任务|简单任务|小改一下|小修一下|一会好|很快完成/, level: 2, flow: 'rapid', desc: '快速任务', emoji: '⚡', weight: 60 },

  // 复杂需求检测 - 检测需要架构设计的复杂需求（提升权重确保优先匹配）
  { type: 'complex-feature', keywords: /架构扩展|扩展能力|预留扩展|考虑未来|复用资源|性能影响|资源占用|架构预留|扩展设计|扩展性/, level: 3, flow: 'collaborative-plan', desc: '复杂功能开发', emoji: '🏗️', weight: 92 },

  // 需求澄清检测 - 检测需要讨论和补充的需求（提升权重确保优先匹配）
  { type: 'clarify-needed', keywords: /初步方案|方案不足|帮我补|补漏|不足之处|可能有问题|你看一下|有哪些要|需要理解|帮我完善|补充方案/, level: 3, flow: 'analyze-to-plan', desc: '需求需澄清', emoji: '💬', weight: 91 },

  // Default - feature (最低权重，作为兜底)
  { type: 'feature', keywords: /.*/, level: 2, flow: 'rapid', desc: '功能开发', emoji: '✨', weight: 1 },
];

// 命令链定义
export const COMMAND_CHAINS: Record<string, CommandChain> = {
  // Level 1 - 超简单
  'rapid': {
    flow: 'rapid',
    level: 1,
    pipeline: ['workflow-lite-plan', 'workflow-test-fix'],
    commands: [
      { cmd: '/workflow-lite-plan', desc: '轻量规划+执行' },
      { cmd: '/workflow-test-fix', desc: '测试生成+修复' },
    ],
    tips: ['适合简单任务', '规划执行一体化', '自动处理测试'],
  },

  // Bugfix
  'bugfix.standard': {
    flow: 'bugfix.standard',
    level: 2,
    pipeline: ['workflow-lite-plan', 'workflow-test-fix'],
    commands: [
      { cmd: '/workflow-lite-plan', desc: '--bugfix Bug修复规划' },
      { cmd: '/workflow-test-fix', desc: '测试修复' },
    ],
    tips: ['标准bug修复流程', '包含测试验证'],
  },

  'bugfix.hotfix': {
    flow: 'bugfix.hotfix',
    level: 2,
    pipeline: ['workflow-lite-plan'],
    commands: [
      { cmd: '/workflow-lite-plan', desc: '--hotfix 紧急修复' },
    ],
    tips: ['跳过测试', '快速上线', '仅限紧急情况'],
  },

  // With-File workflows
  'analyze-to-plan': {
    flow: 'analyze-to-plan',
    level: 3,
    pipeline: ['workflow:analyze-with-file', 'workflow-lite-plan'],
    commands: [
      { cmd: '/workflow:analyze-with-file', desc: '协作分析' },
      { cmd: '/workflow-lite-plan', desc: '轻量规划' },
    ],
    tips: ['先深度理解', '再快速执行'],
  },

  'brainstorm-to-plan': {
    flow: 'brainstorm-to-plan',
    level: 4,
    pipeline: ['workflow:brainstorm-with-file', 'workflow-plan', 'workflow-execute', 'workflow-test-fix'],
    commands: [
      { cmd: '/workflow:brainstorm-with-file', desc: '头脑风暴' },
      { cmd: '/workflow-plan', desc: '正式规划' },
      { cmd: '/workflow-execute', desc: '执行任务' },
      { cmd: '/workflow-test-fix', desc: '测试验证' },
    ],
    tips: ['多角度探索', '正式规划', '完整执行'],
  },

  'debug-with-file': {
    flow: 'debug-with-file',
    level: 3,
    pipeline: ['workflow:debug-with-file'],
    commands: [
      { cmd: '/workflow:debug-with-file', desc: '假设驱动调试' },
    ],
    tips: ['假设→验证→修复', '自动循环'],
  },

  'greenfield': {
    flow: 'greenfield',
    level: 4,
    pipeline: ['workflow:brainstorm-with-file', 'workflow-plan', 'workflow-execute', 'review-cycle', 'workflow-test-fix'],
    commands: [
      { cmd: '/workflow:brainstorm-with-file', desc: '需求探索' },
      { cmd: '/workflow-plan', desc: '架构规划' },
      { cmd: '/workflow-execute', desc: '实现执行' },
      { cmd: '/review-cycle', desc: '代码审查' },
      { cmd: '/workflow-test-fix', desc: '测试验证' },
    ],
    tips: ['0→1全流程', '包含审查', '质量保障'],
  },

  'collaborative-plan': {
    flow: 'collaborative-plan',
    level: 3,
    pipeline: ['workflow:collaborative-plan-with-file', 'workflow:unified-execute-with-file'],
    commands: [
      { cmd: '/workflow:collaborative-plan-with-file', desc: '多Agent协作规划' },
      { cmd: '/workflow:unified-execute-with-file', desc: '统一执行' },
    ],
    tips: ['多角色协作', '自动分工'],
  },

  'roadmap': {
    flow: 'roadmap',
    level: 4,
    pipeline: ['workflow:roadmap-with-file', 'team-planex'],
    commands: [
      { cmd: '/workflow:roadmap-with-file', desc: '需求路线图' },
      { cmd: '/team-planex', desc: 'Wave并行执行' },
    ],
    tips: ['需求拆解', 'Issue创建', '并行执行'],
  },

  // Cycle workflows
  'integration-test-cycle': {
    flow: 'integration-test-cycle',
    level: 3,
    pipeline: ['workflow:integration-test-cycle'],
    commands: [
      { cmd: '/workflow:integration-test-cycle', desc: '集成测试循环' },
    ],
    tips: ['自动探索', '测试开发', '修复循环'],
  },

  'refactor-cycle': {
    flow: 'refactor-cycle',
    level: 3,
    pipeline: ['workflow:refactor-cycle'],
    commands: [
      { cmd: '/workflow:refactor-cycle', desc: '重构循环' },
    ],
    tips: ['债务发现', '优先级排序', '验证闭环'],
  },

  // Issue workflow
  'issue': {
    flow: 'issue',
    level: 2,
    pipeline: ['issue:discover', 'issue:plan', 'issue:queue', 'issue:execute'],
    commands: [
      { cmd: '/issue:discover', desc: '发现问题' },
      { cmd: '/issue:plan', desc: '规划方案' },
      { cmd: '/issue:queue', desc: '排成队列' },
      { cmd: '/issue:execute', desc: '批量执行' },
    ],
    tips: ['主动发现问题', '批量处理', '独立提交'],
  },

  // Team workflows
  'team-planex': {
    flow: 'team-planex',
    level: 4,
    pipeline: ['team-planex'],
    commands: [
      { cmd: '/team-planex', desc: 'Team并行执行' },
    ],
    tips: ['Planner+Executor', 'Wave流水线', '高效并行'],
  },

  // Standard workflows
  'multi-cli-plan': {
    flow: 'multi-cli-plan',
    level: 3,
    pipeline: ['workflow-multi-cli-plan', 'workflow-test-fix'],
    commands: [
      { cmd: '/workflow-multi-cli-plan', desc: '多CLI协作规划' },
      { cmd: '/workflow-test-fix', desc: '测试验证' },
    ],
    tips: ['多模型讨论', '交叉验证'],
  },

  'tdd': {
    flow: 'tdd',
    level: 3,
    pipeline: ['workflow-tdd-plan', 'workflow-execute'],
    commands: [
      { cmd: '/workflow-tdd-plan', desc: 'TDD规划' },
      { cmd: '/workflow-execute', desc: '执行实现' },
    ],
    tips: ['测试先行', 'Red-Green-Refactor'],
  },

  'test-gen': {
    flow: 'test-gen',
    level: 3,
    pipeline: ['workflow-test-fix'],
    commands: [
      { cmd: '/workflow-test-fix', desc: '测试生成' },
    ],
    tips: ['自动生成', '循环修复'],
  },

  'test-fix-gen': {
    flow: 'test-fix-gen',
    level: 3,
    pipeline: ['workflow-test-fix'],
    commands: [
      { cmd: '/workflow-test-fix', desc: '测试修复' },
    ],
    tips: ['分析失败', '自动修复'],
  },

  'review-cycle-fix': {
    flow: 'review-cycle-fix',
    level: 3,
    pipeline: ['review-cycle', 'workflow-test-fix'],
    commands: [
      { cmd: '/review-cycle', desc: '代码审查' },
      { cmd: '/workflow-test-fix', desc: '测试验证' },
    ],
    tips: ['多维度审查', '自动修复'],
  },

  'ui': {
    flow: 'ui',
    level: 3,
    pipeline: ['workflow:ui-design:explore-auto', 'workflow-plan', 'workflow-execute'],
    commands: [
      { cmd: '/workflow:ui-design:explore-auto', desc: 'UI设计探索' },
      { cmd: '/workflow-plan', desc: '规划' },
      { cmd: '/workflow-execute', desc: '实现' },
    ],
    tips: ['设计系统', 'Token驱动'],
  },

  'spec-driven': {
    flow: 'spec-driven',
    level: 4,
    pipeline: ['spec-generator', 'workflow-plan', 'workflow-execute', 'workflow-test-fix'],
    commands: [
      { cmd: '/spec-generator', desc: '生成产品规格' },
      { cmd: '/workflow-plan', desc: '规划' },
      { cmd: '/workflow-execute', desc: '执行' },
      { cmd: '/workflow-test-fix', desc: '测试' },
    ],
    tips: ['PRD驱动', '完整流水线'],
  },

  'full': {
    flow: 'full',
    level: 4,
    pipeline: ['brainstorm', 'workflow-plan', 'workflow-execute', 'workflow-test-fix'],
    commands: [
      { cmd: '/brainstorm', desc: '头脑风暴' },
      { cmd: '/workflow-plan', desc: '规划' },
      { cmd: '/workflow-execute', desc: '执行' },
      { cmd: '/workflow-test-fix', desc: '测试' },
    ],
    tips: ['完整探索', '正式规划', '执行验证'],
  },
};

// 意图分析函数（改进版）
// 改进2: 添加未匹配提示，明确告知用户使用了默认推荐
// 改进3: 收集所有匹配结果，按权重排序
export function analyzeIntent(input: string): IntentAnalysis {
  const lowerInput = input.toLowerCase();

  // 收集所有匹配结果
  const allMatches: MatchResult[] = [];

  for (const pattern of TASK_PATTERNS) {
    const match = lowerInput.match(pattern.keywords);
    if (match) {
      // 计算匹配得分：权重 * (关键词长度权重，更长的关键词更精确)
      const keywordLength = match[0].length;
      const lengthBonus = Math.min(keywordLength / 10, 1.5); // 长度加成，上限1.5x
      const score = pattern.weight * lengthBonus;

      allMatches.push({
        pattern,
        matchedKeyword: match[0],
        score,
      });
    }
  }

  // 按得分排序
  allMatches.sort((a, b) => b.score - a.score);

  // 选择最佳匹配（第一个）
  const bestMatch = allMatches[0];

  if (bestMatch && bestMatch.pattern.type !== 'feature') {
    // 有有效匹配
    const chain = COMMAND_CHAINS[bestMatch.pattern.flow] || COMMAND_CHAINS['rapid'];
    const confidence = Math.min(0.95, 0.6 + (bestMatch.score / 200));

    return {
      goal: input,
      taskType: bestMatch.pattern.type,
      level: bestMatch.pattern.level,
      flow: bestMatch.pattern.flow,
      chain,
      pattern: bestMatch.pattern,
      confidence,
      matchedKeyword: bestMatch.matchedKeyword,
      isDefaultFallback: false,
      allMatches: allMatches.slice(0, 5), // 保留前5个备选
    };
  }

  // 默认返回 rapid (兜底)
  const defaultChain = COMMAND_CHAINS['rapid'];
  const defaultPattern = TASK_PATTERNS.find(p => p.type === 'feature')!;

  return {
    goal: input,
    taskType: 'feature',
    level: 2,
    flow: 'rapid',
    chain: defaultChain,
    pattern: defaultPattern,
    confidence: 0.3,
    matchedKeyword: undefined,
    isDefaultFallback: true,
    allMatches: allMatches.slice(0, 5), // 即使是兜底也返回匹配结果供参考
  };
}
