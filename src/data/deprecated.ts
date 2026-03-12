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
];
