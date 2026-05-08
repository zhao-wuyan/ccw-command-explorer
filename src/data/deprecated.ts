// ============================================
// 废弃命令
// ============================================
import type { DeprecatedCommand } from './types';

export const DEPRECATED_COMMANDS: DeprecatedCommand[] = [
  // v5.0 废弃 - Task 系列命令移除
  { old: '/task:replan', newCmd: '/workflow:replan', reason: '命令整合', deprecatedInVersion: 'v5.0' },
  { old: '/task:create', newCmd: null, reason: '命令已移除', deprecatedInVersion: 'v5.0' },
  { old: '/task:breakdown', newCmd: null, reason: '命令已移除', deprecatedInVersion: 'v5.0' },
  { old: '/task:execute', newCmd: null, reason: '命令已移除', deprecatedInVersion: 'v5.0' },

  // v5.2 废弃 - 基础命令移除
  { old: '/version', newCmd: null, reason: '命令已移除', deprecatedInVersion: 'v5.2' },
  { old: '/enhance-prompt', newCmd: null, reason: '命令已移除', deprecatedInVersion: 'v5.2' },

  // v6.0 废弃 - 命令重命名和升级
  { old: '/prompts:prep-plan', newCmd: '/prep-plan', reason: '命令重命名', deprecatedInVersion: 'v6.0' },
  { old: '/prompts:prep-cycle', newCmd: '/prep-cycle', reason: '命令重命名', deprecatedInVersion: 'v6.0' },
  { old: '/prompts:prep-loop', newCmd: null, reason: '预检清单文件已移除', deprecatedInVersion: 'v6.0' },
  { old: '/workflow:brainstorm:*', newCmd: '/brainstorm', reason: '头脑风暴命令升级为统一 skill', deprecatedInVersion: 'v6.0' },

  // v6.2 废弃 - Skill 升级大潮
  { old: '/workflow:plan', newCmd: '/workflow-plan', reason: '命令升级为 skill', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:execute', newCmd: '/workflow-execute', reason: '命令升级为 skill', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:replan', newCmd: null, reason: '命令已移除', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:resume', newCmd: '/workflow:session:resume', reason: '命令整合到会话管理', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:status', newCmd: null, reason: '命令已移除', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:review', newCmd: '/review-code', reason: '命令升级为 skill', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:plan-verify', newCmd: null, reason: '命令已移除', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:lite-plan', newCmd: '/workflow-lite-plan', reason: '命令升级为 skill，请使用新版本', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:lite-execute', newCmd: null, reason: '命令已移除，请使用 /workflow-execute', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:lite-fix', newCmd: '/workflow:debug-with-file', reason: 'token 消耗较多且效果一般，改用 debug-with-file（Claude  Code: /workflow:debug-with-file，Codex: /debug-with-file）', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:test-gen', newCmd: '/workflow-test-fix', reason: '命令整合', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:test-fix-gen', newCmd: '/workflow-test-fix', reason: '命令整合', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:test-cycle-execute', newCmd: '/workflow-test-fix', reason: '命令整合', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:review-module-cycle', newCmd: '/review-cycle', reason: '命令升级为 skill', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:review-session-cycle', newCmd: '/review-cycle', reason: '命令升级为 skill', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:review-fix', newCmd: '/review-cycle', reason: '命令升级为 skill', deprecatedInVersion: 'v6.2' },
  { old: '/workflow:tools:*', newCmd: null, reason: '内部工具命令已移除', deprecatedInVersion: 'v6.2' },
  { old: '/memory:docs', newCmd: '/memory-manage', reason: '命令整合到统一记忆管理', deprecatedInVersion: 'v6.2' },
  { old: '/memory:docs-full-cli', newCmd: '/memory-manage', reason: '命令整合到统一记忆管理', deprecatedInVersion: 'v6.2' },
  { old: '/memory:docs-related-cli', newCmd: '/memory-manage', reason: '命令整合到统一记忆管理', deprecatedInVersion: 'v6.2' },
  { old: '/memory:update-full', newCmd: '/memory-manage', reason: '命令整合到统一记忆管理', deprecatedInVersion: 'v6.2' },
  { old: '/memory:update-related', newCmd: '/memory-manage', reason: '命令整合到统一记忆管理', deprecatedInVersion: 'v6.2' },
  { old: '/memory:load', newCmd: '/memory-capture', reason: '命令整合到统一记忆捕获', deprecatedInVersion: 'v6.2' },
  { old: '/memory:load-skill-memory', newCmd: '/memory-capture', reason: '命令整合到统一记忆捕获', deprecatedInVersion: 'v6.2' },
  { old: '/memory:skill-memory', newCmd: '/memory-capture', reason: '命令整合到统一记忆捕获', deprecatedInVersion: 'v6.2' },
  { old: '/memory:code-map-memory', newCmd: null, reason: '命令已移除', deprecatedInVersion: 'v6.2' },
  { old: '/memory:tech-research', newCmd: null, reason: '命令已移除', deprecatedInVersion: 'v6.2' },
  { old: '/memory:workflow-skill-memory', newCmd: '/memory-capture', reason: '命令整合到统一记忆捕获', deprecatedInVersion: 'v6.2' },
  { old: '/issue-resolve', newCmd: '/issue-manage', reason: '命令整合到统一 Issue 管理', deprecatedInVersion: 'v6.2' },
  { old: '/issue-execute', newCmd: '/issue:execute', reason: '命令迁移到 Claude Code', deprecatedInVersion: 'v6.2' },
  { old: '/plan-converter', newCmd: '/workflow-execute', reason: '命令整合到工作流执行', deprecatedInVersion: 'v6.2' },
  { old: '/req-plan-with-file', newCmd: '/workflow-lite-plan', reason: '命令迁移到轻量级规划执行流程', deprecatedInVersion: 'v6.2' },
  { old: '/workflow-req-plan', newCmd: '/workflow-plan', reason: '命令整合', deprecatedInVersion: 'v6.2' },

  // v6.3 废弃 - UI 设计调整
  { old: '/workflow:ui-design:capture', newCmd: null, reason: '命令已移除', deprecatedInVersion: 'v6.3' },
  { old: '/workflow:ui-design:explore-layers', newCmd: null, reason: '命令已移除', deprecatedInVersion: 'v6.3' },

  // v7.0 废弃 - 架构升级
  { old: '/issue-devpipeline', newCmd: '/team-planex', reason: '命令升级为团队 plan-and-execute 流水线', deprecatedInVersion: 'v7.0' },
  { old: '/team-lifecycle-v2', newCmd: '/team-lifecycle-v5', reason: '已升级到 v5 版本', deprecatedInVersion: 'v7.0' },
  { old: '/workflow:tdd-plan', newCmd: '/workflow-tdd', reason: '命令升级为 skill', deprecatedInVersion: 'v7.0' },
  { old: '/workflow:tdd-verify', newCmd: '/workflow-tdd', reason: '命令升级为 skill', deprecatedInVersion: 'v7.0' },

  // v7.2.2 废弃 - 规格系统整合
  { old: '/workflow:init-specs', newCmd: '/workflow:spec:setup', reason: '命令整合到统一规格管理', deprecatedInVersion: 'v7.2.2' },
  { old: '/workflow:init-guidelines', newCmd: '/workflow:spec:setup', reason: '命令整合到统一规格管理', deprecatedInVersion: 'v7.2.2' },
  { old: '/workflow:session:solidify', newCmd: '/workflow:spec:add', reason: '固化经验功能整合到规格添加命令', deprecatedInVersion: 'v7.2.2' },

  // v7.2.3 废弃 - 命令清理
  { old: '/workflow:init', newCmd: '/workflow:spec:setup', reason: '项目初始化功能整合到规格管理系统', deprecatedInVersion: 'v7.2.3' },

  // v7.2.7 废弃 - 版本清理（skill 目录中不存在）
  { old: '/team-lifecycle-v3', newCmd: '/team-lifecycle-v4', reason: 'v3 版本已移除，请使用 v4 版本', deprecatedInVersion: 'v7.2.7' },
  { old: '/team-lifecycle-v5', newCmd: '/team-lifecycle-v4', reason: 'v5 版本已移除，请使用 v4 版本', deprecatedInVersion: 'v7.2.7' },
  { old: '/team-coordinate-v2', newCmd: '/team-coordinate', reason: 'v2 版本已移除，请使用无版本号的基础版本', deprecatedInVersion: 'v7.2.7' },
  { old: '/team-executor-v2', newCmd: '/team-executor', reason: 'v2 版本已移除，请使用无版本号的基础版本', deprecatedInVersion: 'v7.2.7' },

  // v7.2.20 废弃 - DDD 系列命令移除
  { old: '/ddd:auto', newCmd: null, reason: 'DDD 文档驱动开发功能已移除', deprecatedInVersion: 'v7.2.20' },
  { old: '/ddd:doc-generate', newCmd: null, reason: 'DDD 文档驱动开发功能已移除', deprecatedInVersion: 'v7.2.20' },
  { old: '/ddd:doc-refresh', newCmd: null, reason: 'DDD 文档驱动开发功能已移除', deprecatedInVersion: 'v7.2.20' },
  { old: '/ddd:execute', newCmd: null, reason: 'DDD 文档驱动开发功能已移除', deprecatedInVersion: 'v7.2.20' },
  { old: '/ddd:index-build', newCmd: null, reason: 'DDD 文档驱动开发功能已移除', deprecatedInVersion: 'v7.2.20' },
  { old: '/ddd:plan', newCmd: null, reason: 'DDD 文档驱动开发功能已移除', deprecatedInVersion: 'v7.2.20' },
  { old: '/ddd:scan', newCmd: null, reason: 'DDD 文档驱动开发功能已移除', deprecatedInVersion: 'v7.2.20' },
  { old: '/ddd:sync', newCmd: null, reason: 'DDD 文档驱动开发功能已移除', deprecatedInVersion: 'v7.2.20' },
  { old: '/ddd:update', newCmd: null, reason: 'DDD 文档驱动开发功能已移除', deprecatedInVersion: 'v7.2.20' },

  // v7.2.20 废弃 - IDAW 系列命令移除
  { old: '/idaw:add', newCmd: null, reason: 'IDAW 迭代开发工作流已移除', deprecatedInVersion: 'v7.2.20' },
  { old: '/idaw:resume', newCmd: null, reason: 'IDAW 迭代开发工作流已移除', deprecatedInVersion: 'v7.2.20' },
  { old: '/idaw:run', newCmd: null, reason: 'IDAW 迭代开发工作流已移除', deprecatedInVersion: 'v7.2.20' },
  { old: '/idaw:run-coordinate', newCmd: null, reason: 'IDAW 迭代开发工作流已移除', deprecatedInVersion: 'v7.2.20' },
  { old: '/idaw:status', newCmd: null, reason: 'IDAW 迭代开发工作流已移除', deprecatedInVersion: 'v7.2.20' },

  // v7.2.20 废弃 - 其他命令移除
  { old: '/team-edict', newCmd: null, reason: '三省六部协作框架已移除', deprecatedInVersion: 'v7.2.20' },
  { old: '/team-planex-v2', newCmd: '/team-planex', reason: 'v2 版本已移除，请使用 /team-planex', deprecatedInVersion: 'v7.2.20' },

  // v7.2.28 废弃 - Codex 预检清单移除
  { old: '/prep-plan', newCmd: null, reason: '预检清单功能已移除', deprecatedInVersion: 'v7.2.28' },
  { old: '/prep-cycle', newCmd: null, reason: '预检清单功能已移除', deprecatedInVersion: 'v7.2.28' },

  // v7.2.28 废弃 - 团队技能重构
  { old: '/team-iterdev', newCmd: '/team-lifecycle-v4', reason: '迭代开发团队已整合到全生命周期团队', deprecatedInVersion: 'v7.2.28' },

  // v7.2.28 废弃 - Codex 技能清理
  { old: '/unified-execute-with-file', newCmd: null, reason: '统一执行引擎已移除', deprecatedInVersion: 'v7.2.28' },
  { old: '/collaborative-plan-with-file', newCmd: null, reason: '协作规划功能已移除', deprecatedInVersion: 'v7.2.28' },

  // v7.3 废弃 - 命令清理
  { old: '/flow-create', newCmd: null, reason: '工作流模板创建功能已移除', deprecatedInVersion: 'v7.3' },
  { old: '/cli:cli-init', newCmd: null, reason: 'CLI 初始化功能已移除', deprecatedInVersion: 'v7.3' },
  { old: '/cli:codex-review', newCmd: '/review-cycle', reason: 'Codex 代码审查整合到统一审查流程', deprecatedInVersion: 'v7.3' },

  // v7.3.6 废弃 - 命令清理
  { old: '/workflow-skill', newCmd: '/ccw', reason: '技能快速启动功能整合到主入口 /ccw', deprecatedInVersion: 'v7.3.6' },
  { old: '/chain-loader', newCmd: null, reason: 'Chain 技能生成器已移除', deprecatedInVersion: 'v7.3.6' },
  { old: '/workflow:collaborative-plan-with-file', newCmd: null, reason: '协作式规划命令已移除', deprecatedInVersion: 'v7.3.6' },
  { old: '/workflow:unified-execute-with-file', newCmd: null, reason: '通用执行引擎命令已移除', deprecatedInVersion: 'v7.3.6' },

  // v7.3.14 废弃 - CCW 统一入口
  { old: '/ccw-coordinate', newCmd: '/ccw', reason: 'Codex 流水线协调器合并到统一 CCW 主入口，/ccw 现已支持 Claude Code 和 Codex 双平台', deprecatedInVersion: 'v7.3.14' },
];
