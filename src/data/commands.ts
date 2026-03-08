// ============================================
// 完整命令列表 - 基于 CCW 仓库实际存在
// ============================================
import type { Command } from './types';
import { CATEGORIES } from './constants';

export const COMMANDS: Command[] = [
  // ==================== 主入口命令 ====================
  { cmd: '/ccw', desc: '主入口！智能分析意图，自动选择命令', status: 'recommended', category: 'main', cli: 'claude', addedInVersion: 'v6.2',
    detail: '万能入口！告诉它你想做什么，它会分析你的意图，自动选择最合适的命令或命令组合执行。不用背命令，说人话就行',
    usage: '不知道用什么命令时，直接说 /ccw 你想做的事，比如"/ccw 修复登录bug"'
  },
  { cmd: '/ccw-help', desc: '命令帮助系统，搜索和浏览所有命令', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.2',
    detail: '交互式命令浏览器：按分类浏览90+个命令、搜索命令名或功能、查看详细使用说明',
    usage: '想知道有哪些命令、忘了某个命令怎么用'
  },
  { cmd: '/ccw-coordinator', desc: '交互式命令编排，分析需求推荐命令链', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.2',
    detail: '复杂需求分解器：分析你的需求，推荐需要执行的命令序列，你可以调整后再执行',
    usage: '一个任务需要多个命令配合完成，不知道怎么组合'
  },
  { cmd: '/flow-create', desc: '创建工作流模板', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.0',
    detail: '创建可重复使用的模板：把常用的命令组合存成模板，下次一键执行。比如"发布流程"模板',
    usage: '有固定的工作流程想反复使用'
  },

  // ==================== IDAW 任务管理 ====================
  { cmd: '/idaw:add', desc: '任务队列入口 - 手动描述或从 issue 批量导入，攒好再统一执行', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v7.1.0',
    detail: 'IDAW（Iterative Development Automated Workflow）的任务入口。支持两种创建方式：① 直接描述需求（手动创建）；② 从 ccw issue 系统导入（--from-issue）。任务类型（bugfix/feature/refactor/tdd 等）可手动指定，也可在执行时自动推断。创建的任务以 IDAW-001.json 格式保存到 .workflow/.idaw/tasks/，等待 /idaw:run 串行执行。',
    usage: '攒好一批待处理任务（bugfix、feature、重构等），先 add 进队列，再统一交给 /idaw:run 批量执行。也适合将 issue 系统里的问题单批量转为可执行任务。'
  },
  { cmd: '/idaw:run', desc: '批量执行任务队列 - 自动 Skill 链映射 + 失败 CLI 诊断 + 每任务 git 检查点', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v7.1.0',
    detail: 'IDAW 的核心执行命令。按优先级串行处理所有 pending 任务，每个任务完整流程：① 根据任务类型自动映射 Skill 链（bugfix → workflow-lite-plan + workflow-test-fix；feature-complex → workflow-plan + workflow-execute + workflow-test-fix 等 10 种类型）；② 对 bugfix/complex 任务先触发 Gemini CLI 预分析获取上下文；③ 串行执行链中每个 Skill；④ Skill 失败时自动触发 CLI 诊断 + 重试一次；⑤ 任务完成后自动 git commit 打检查点。支持 --dry-run 预览执行计划，-y 全自动无人值守模式。',
    usage: '已用 /idaw:add 积累了一批任务，现在要统一执行。特别适合「下班前挂着跑」或「一次性清掉积压任务」的场景——每个任务完成都有 git 检查点，失败了可以用 /idaw:resume 续跑，不怕中途中断。'
  },
  { cmd: '/idaw:run-coordinate', desc: '后台 CLI 协调执行 - 上下文隔离，hook 驱动，适合长链或大量任务', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v7.1.0',
    detail: '/idaw:run 的外部 CLI 变体，执行模型改为后台 hook 驱动：通过 ccw cli 在后台启动每个 Skill，等待 hook 回调后再推进下一步，而非在主进程阻塞。核心优势：每个 CLI 调用获得独立的上下文窗口，任务再多也不会膨胀主进程上下文；支持指定 --tool（claude/gemini/qwen）；状态文件额外记录 prompts_used 便于追溯。错误恢复同样支持 CLI 诊断 + 重试，任务完成后 git checkpoint。',
    usage: '任务链较长（如 feature-complex: plan + execute + test-fix）、或同时积压多个上下文重的任务时，用 coordinate 模式避免主进程上下文压力。也适合需要用 Gemini 等特定 CLI 工具执行任务的场景。'
  },
  { cmd: '/idaw:resume', desc: '续跑中断会话 - 从断点恢复，跳过或重试中断任务，无需重跑已完成部分', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v7.1.0',
    detail: '恢复 status 为 running 的 IDAW 会话（默认找最近一个，也可指定 session-id）。对中断时处于 in_progress 状态的任务，提供 Retry（重置为 pending 重跑）或 Skip（标记跳过继续）两种处理方式；-y 模式下自动 Skip。找到剩余 pending 任务后，复用 /idaw:run 完整执行逻辑（Skill 链 + CLI 诊断 + git checkpoint）继续推进，会话进度文件中追加 Resumed 标记。',
    usage: 'IDAW 执行中途因网络/系统原因中断、或手动 Ctrl+C 打断后，用此命令从断点继续，无需重跑已完成的任务。'
  },
  { cmd: '/idaw:status', desc: '查看任务队列和会话执行进度（只读）', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v7.1.0',
    detail: '只读命令，不触发任何执行。无参数时显示：全部任务的状态表（ID、标题、类型、优先级、状态）+ 最新会话的概要统计。传入 session-id 时显示该会话详情：每个任务的状态、git commit hash、以及 progress.md 的完整执行日志。',
    usage: '/idaw:run 跑完后查看哪些任务成功/失败；或在执行过程中另开终端随时检查进度；也可在用 /idaw:resume 前先确认哪些任务还剩余。'
  },

  // ==================== CLI 工具 ====================
  { cmd: '/cli:cli-init', desc: '初始化 CLI 工具配置 (Gemini/Qwen)', status: 'stable', category: 'main', cli: 'claude', addedInVersion: 'v6.2',
    detail: '首次配置：为Gemini和Qwen创建配置文件(.gemini/、.qwen/)，设置API密钥、模型选择等',
    usage: '想用Gemini或Qwen等外部AI工具，第一次需要先配置'
  },
  { cmd: '/cli:codex-review', desc: 'Codex 代码审查', status: 'stable', category: 'review', cli: 'claude', addedInVersion: 'v6.2',
    detail: '专业代码审查：可审查未提交的改动、对比两个分支、或审查特定提交。比普通审查更专业',
    usage: '想用OpenAI Codex进行专业代码审查'
  },

  // ==================== DDD 文档驱动开发 ====================
  { cmd: '/ddd:auto', desc: '链式命令 - 自动文档驱动开发流程', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '自动化 DDD 流程：链式调用 scan → plan → execute → sync。适合需要完整文档驱动开发流程的任务',
    usage: '想一次性完成文档驱动的开发流程'
  },
  { cmd: '/ddd:sync', desc: '任务后同步 - 更新文档索引、生成操作日志', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '完成开发任务后同步：分析 git 变更 → 追踪受影响的功能/需求 → 更新索引条目 → 生成操作日志 → 刷新文档',
    usage: '开发任务完成后，同步更新文档索引'
  },
  { cmd: '/ddd:update', desc: '增量索引更新 - 检测代码变更并追踪影响', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '轻量级增量更新：给定变更文件 → 追踪影响范围（代码→组件→功能→需求）→ 更新索引。比 sync 更轻量',
    usage: '开发过程中想快速检查哪些文档会受影响'
  },
  { cmd: '/ddd:scan', desc: '扫描代码库构建文档索引 - 无需规格文档', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '代码优先入口点：分析代码结构 → 推断功能 → 发现组件 → 反向工程项目知识图谱 → 生成 doc-index.json',
    usage: '现有项目没有规格文档，想开始使用文档驱动工作流'
  },
  { cmd: '/ddd:plan', desc: '文档驱动规划流水线 - 查询索引、探索、规划', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '完整规划流水线：查询 doc-index 获取即时上下文 → 探索代码库 → 澄清不明确点 → 生成 plan.json + TASK-*.json',
    usage: '需要基于文档索引进行规划的任务'
  },
  { cmd: '/ddd:execute', desc: '文档感知执行引擎 - 执行 plan.json', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '执行规划：读取 plan.json + TASK-*.json → 按依赖顺序执行任务 → 每个任务完成后调用 ddd:sync 更新索引',
    usage: '已通过 ddd:plan 生成规划文件，需要执行'
  },
  { cmd: '/ddd:index-build', desc: '构建文档索引 - 从 spec-generator 输出', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '规格优先入口点：读取 spec-generator 输出（产品简介、PRD、架构文档等）→ 构建完整的 doc-index.json',
    usage: '已运行 spec-generator，需要构建文档索引'
  },
  { cmd: '/ddd:doc-refresh', desc: '增量更新受影响的文档', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '选择性文档刷新：根据受影响的组件和功能 ID → 更新对应的 tech-registry/ 和 feature-maps/ 文档',
    usage: '代码变更后需要更新相关文档'
  },
  { cmd: '/ddd:doc-generate', desc: '生成完整文档树 - 从 doc-index.json', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '生成文档树：Layer 3 组件文档 → Layer 2 功能文档 → Layer 1 索引/概览文档。完整的项目文档生成',
    usage: '需要生成完整的项目文档'
  },

  // ==================== 工作流核心 ====================
  { cmd: '/team-planex-v2', desc: 'PlanEx 管道 v2 - CSV Wave 规划+执行混合模式', status: 'new', category: 'skill', cli: 'codex', addedInVersion: 'v7.2.3',
    detail: '混合团队技能：Planner 分解需求为 Issues + Solutions，Executor 通过 CLI 工具实现。支持 Issue IDs、文本输入、计划文件输入。使用 CSV Wave 并行执行，支持依赖排序和上下文传播',
    usage: '需求规划执行一体化，适合批量 Issue 处理'
  },
  { cmd: '/workflow:clean', desc: '清理代码和临时文件', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v5.2',
    detail: '智能清理：检测过时的会话目录、临时文件、死代码、无用的依赖。保持项目整洁',
    usage: '项目做了很久，想清理不需要的文件'
  },

  // With-File 系列
  { cmd: '/workflow:analyze-with-file', desc: '交互式协作分析', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '深度分析并记录：边分析代码边记录理解，支持多轮问答。生成分析文档，方便以后查阅',
    usage: '需要深入理解代码库、分析复杂模块'
  },
  { cmd: '/workflow:debug-with-file', desc: '交互式调试', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '科学调试：①猜测原因(假设)；②验证假设；③记录发现。系统化排查问题，不会漏掉线索',
    usage: '遇到难定位的复杂bug'
  },
  { cmd: '/workflow:collaborative-plan-with-file', desc: '协作式规划', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.0',
    detail: '多人协作规划：把大需求拆成多个领域，不同专业的人分别规划，最后自动检测冲突',
    usage: '涉及多个技术领域的复杂功能，需要不同专业的人分工规划'
  },
  { cmd: '/workflow:brainstorm-with-file', desc: '交互式头脑风暴', status: 'stable', category: 'brainstorm', cli: 'claude', addedInVersion: 'v6.0',
    detail: '创意发散并记录：多角度思考，记录想法的演变过程。完成后可选择：创建规划、创建Issue、或继续分析',
    usage: '需要创意思考、功能设计、架构方案讨论'
  },
  { cmd: '/workflow:roadmap-with-file', desc: '路线图规划', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v6.4',
    detail: '交互式路线图：与AI讨论需求，生成项目路线图和里程碑规划',
    usage: '需要规划项目路线图'
  },
  { cmd: '/workflow:unified-execute-with-file', desc: '通用执行引擎', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.2',
    detail: '万能执行器：支持执行各种格式的规划文件(brainstorm、plan、issue等)，按依赖顺序执行',
    usage: '有各种格式的规划文件需要执行'
  },
  { cmd: '/workflow:integration-test-cycle', desc: '集成测试循环', status: 'stable', category: 'test', cli: 'claude', addedInVersion: 'v6.2',
    detail: '集成测试：生成集成测试→执行→发现失败修复→再测试。循环到全部通过',
    usage: '需要为模块间的集成编写测试'
  },
  { cmd: '/workflow:refactor-cycle', desc: '重构循环', status: 'stable', category: 'workflow', cli: 'claude', addedInVersion: 'v6.2',
    detail: '安全重构：重构代码→运行测试验证→如果测试失败可回滚。确保重构不破坏功能',
    usage: '需要重构代码但怕改坏东西'
  },

  // ==================== 会话管理 ====================
  { cmd: '/workflow:session:start', desc: '开始新的工作流会话', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0',
    detail: '创建工作会话：生成唯一会话ID、创建会话目录(.workflow/sessions/xxx/)、初始化状态文件。后续工作都在这个会话里追踪',
    usage: '开始一个新的开发任务'
  },
  { cmd: '/workflow:session:list', desc: '列出所有会话及其状态', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0',
    detail: '会话列表：显示所有会话的ID、创建时间、当前状态(活跃/暂停/完成)、进度概览',
    usage: '想看看有哪些进行中或已完成的工作'
  },
  { cmd: '/workflow:session:resume', desc: '恢复最近暂停的会话', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0',
    detail: '恢复工作：找到最近暂停的会话，加载上下文，从上次停下的地方继续',
    usage: '继续之前暂停的工作'
  },
  { cmd: '/workflow:session:complete', desc: '完成并归档会话', status: 'stable', category: 'session', cli: 'claude', addedInVersion: 'v5.0',
    detail: '结束会话：标记会话为完成、生成总结报告、移动到归档目录。记录做了什么、有什么收获',
    usage: '任务完成后进行收尾'
  },
  { cmd: '/workflow:session:sync', desc: '同步会话状态', status: 'new', category: 'session', cli: 'claude', addedInVersion: 'v6.4',
    detail: '同步会话：将当前会话状态同步到文件系统，确保状态持久化',
    usage: '需要保存当前会话状态'
  },

  // ==================== 规格管理 ====================
  { cmd: '/workflow:spec:setup', desc: '初始化项目规格 - cli-explore-agent 分析 + 交互式问卷', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '初始化规格系统：调用 cli-explore-agent 分析项目 → 生成 project-tech.json → 交互式配置编码规范、架构约束、质量规则',
    usage: '新项目需要建立开发规范和约束'
  },
  { cmd: '/workflow:spec:add', desc: '添加规范 - 交互式或直接模式', status: 'new', category: 'workflow', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '添加规格条目：支持 convention（编码风格）、constraint（硬性规则）、learning（经验教训）。交互式向导或直接命令模式',
    usage: '需要添加编码规范、架构约束或记录经验教训'
  },

  // ==================== Issue 管理 ====================
  { cmd: '/issue:new', desc: '创建结构化 Issue', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v5.0',
    detail: '创建问题记录：填写问题描述、严重程度、影响范围、复现步骤。生成标准化Issue文件',
    usage: '发现问题想记录下来'
  },
  { cmd: '/issue:plan', desc: '规划 Issue 解决方案', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v5.0',
    detail: '设计方案：分析问题原因→设计解决思路→拆解实施步骤→预估工作量',
    usage: '已知问题需要规划如何解决'
  },
  { cmd: '/issue:queue', desc: '形成执行队列', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0',
    detail: '排列执行顺序：把多个Issue按优先级和依赖关系排成队列，先做重要的、先做被依赖的',
    usage: '有多个Issue想批量处理'
  },
  { cmd: '/issue:execute', desc: '执行 Issue 解决方案', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0',
    detail: '执行解决方案：按队列顺序执行，每个解决完自动提交git，方便追踪和回滚',
    usage: '执行已规划好的Issue解决方案'
  },
  { cmd: '/issue:discover', desc: '多角度发现潜在问题', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0',
    detail: '主动发现问题：8个维度扫描(bug风险/安全漏洞/性能问题/用户体验/测试覆盖/代码质量/可维护性/最佳实践)',
    usage: '想主动发现项目中的隐患'
  },
  { cmd: '/issue:discover-by-prompt', desc: '智能问题发现', status: 'new', category: 'issue', cli: 'claude', addedInVersion: 'v6.3',
    detail: '按需发现：你说关注什么(比如"安全问题")，AI针对性地扫描发现相关问题',
    usage: '有具体关注点想发现问题'
  },
  { cmd: '/issue:convert-to-plan', desc: '转换规划产物为执行计划', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0',
    detail: '格式转换：把各种规划文档(brainstorm结果、roadmap等)转成标准Issue格式，统一执行',
    usage: '有现成的规划文档想执行'
  },
  { cmd: '/issue:from-brainstorm', desc: '头脑风暴结果转 Issue', status: 'stable', category: 'issue', cli: 'claude', addedInVersion: 'v6.0',
    detail: '想法变任务：把头脑风暴产生的想法自动转成结构化的Issue，可以直接执行',
    usage: '头脑风暴后想把想法变成具体任务'
  },




  // ==================== UI 设计 ====================
  { cmd: '/workflow:ui-design:explore-auto', desc: '探索式 UI 设计', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '从零设计UI：根据需求描述，自动探索设计方案，生成完整的设计系统和UI代码',
    usage: '需要从头设计UI界面'
  },
  { cmd: '/workflow:ui-design:imitate-auto', desc: '高速 UI 复刻', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '参考复刻：提供设计图或网站URL，自动分析设计风格，快速生成相同风格的UI代码',
    usage: '有设计稿或参考网站想复刻'
  },

  { cmd: '/workflow:ui-design:style-extract', desc: '提取设计风格', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '提取样式：从设计图或现有代码中提取颜色、字体、间距等设计规范',
    usage: '想分析设计风格，建立设计系统'
  },
  { cmd: '/workflow:ui-design:layout-extract', desc: '提取布局结构', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '提取布局：从图片或网站分析页面布局结构，生成可复用的布局模板',
    usage: '想分析页面布局结构'
  },
  { cmd: '/workflow:ui-design:generate', desc: '组装 UI 原型', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '组装UI：把提取的设计风格和布局模板组合成可运行的UI代码',
    usage: '想生成可用的UI代码'
  },
  { cmd: '/workflow:ui-design:design-sync', desc: '同步设计系统', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '同步更新：设计稿更新后，自动同步代码实现，保持设计和代码一致',
    usage: '设计稿更新后需要同步代码'
  },
  { cmd: '/workflow:ui-design:animation-extract', desc: '提取动画模式', status: 'new', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '提取动画：从网站或视频分析动画效果，生成可复用的动画代码',
    usage: '想学习和复用动画效果'
  },
  { cmd: '/workflow:ui-design:codify-style', desc: '样式代码化', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '样式转代码：把设计规范(颜色、字体等)转换成CSS变量、Tailwind配置等代码',
    usage: '想将设计转换为代码'
  },
  { cmd: '/workflow:ui-design:import-from-code', desc: '从代码导入设计', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '代码反推设计：分析现有UI代码，反向提取设计规范和组件规范',
    usage: '想从代码中提取设计规范'
  },
  { cmd: '/workflow:ui-design:reference-page-generator', desc: '生成参考页面', status: 'stable', category: 'ui-design', cli: 'claude', addedInVersion: 'v6.3',
    detail: '生成参考页：把设计系统和组件生成HTML参考页面，方便查看和分享',
    usage: '想生成设计参考文档'
  },

  // ==================== 记忆系统 ====================
  { cmd: '/memory:prepare', desc: '准备记忆系统', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v6.4',
    detail: '初始化记忆：准备记忆系统所需的目录结构和配置文件',
    usage: '首次使用记忆系统前准备'
  },
  { cmd: '/memory:style-skill-memory', desc: '样式技能记忆', status: 'stable', category: 'memory', cli: 'claude', addedInVersion: 'v6.4',
    detail: '样式记忆：保存和加载 UI 样式相关的技能经验',
    usage: '需要保存或复用样式设计经验'
  },


  // ==================== Claude Code Skills (独立技能) ====================
  // 头脑风暴类
  { cmd: '/brainstorm', desc: '统一头脑风暴 - 自动流程或单角色分析', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '两种模式：①自动模式-理解需求→发散想法→收敛结论→执行；②单角色-只从某个专业视角分析（如架构师、产品经理）',
    usage: '需要创意发散、多角度思考、或从特定专业视角分析问题时'
  },
  { cmd: '/team-brainstorm', desc: '团队头脑风暴 - 多角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '5角色：创意者出点子→挑战者挑毛病→综合者整合→评估师打分排名。想法被挑战后自动改进，最多2轮。支持多人并行出点子',
    usage: '重要决策需要多人、多角度碰撞想法时'
  },


  // Issue 管理
  { cmd: '/issue-manage', desc: '交互式 Issue 管理 - CRUD 操作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '菜单驱动管理：列出所有问题、查看详情、编辑内容、删除、批量操作。像用手机App一样简单',
    usage: '想查看、修改或删除已有的问题时'
  },
  { cmd: '/team-issue', desc: '团队 Issue 解决 - 多角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '6角色分工：探索者分析→规划师设计方案→实现者写代码→审查者检查→整合者合并。适合复杂问题',
    usage: '一个Issue涉及多个模块、需要多人分工协作时'
  },

  // 记忆系统
  { cmd: '/memory-capture', desc: '统一记忆捕获 - 会话压缩或快速技巧', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '两种模式：①完整压缩-把当前对话压缩成结构化笔记，方便下次恢复；②快速技巧-记下小贴士、代码片段',
    usage: '当前会话做得不错想保存经验、或者记下有用的技巧'
  },
  { cmd: '/memory-manage', desc: '统一记忆管理 - CLAUDE.md 更新和文档生成', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '菜单选择：①全量更新所有CLAUDE.md；②只更新改动的模块；③生成项目文档。让项目知识保持最新',
    usage: '项目结构变了想更新文档、或者想生成完整项目说明'
  },

  // 代码审查
  { cmd: '/review-code', desc: '多维度代码审查 - 结构化报告', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '7个维度审查：代码对不对、好读吗、性能如何、安全吗、测试够不够、好维护吗、符合最佳实践吗。出详细报告',
    usage: '写完代码想检查质量、代码合入前想审查、接手别人的代码'
  },
  { cmd: '/review-cycle', desc: '统一代码审查 - 会话/模块/修复模式', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '三种模式：①审查当前工作流的所有改动；②只审查指定模块；③审查完自动修复发现的问题',
    usage: '想选择不同范围的审查、或者审查完想自动改问题'
  },
  { cmd: '/team-review', desc: '团队代码审查 - 多角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '多角色审查：同时从安全、性能、架构等角度审查，生成综合报告。比单人审查更全面',
    usage: '重要代码合入前、大型PR需要全面审查时'
  },

  // 技能管理
  { cmd: '/skill-generator', desc: '元技能 - 创建新的 Claude Code 技能', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v5.2',
    detail: '创建你自己的工作流模板：定义步骤、选择工具、设置参数。一次创建，反复使用',
    usage: '有重复的工作流程想固化成命令、想分享团队的工作方式'
  },
  { cmd: '/skill-tuning', desc: '技能诊断优化 - 检测和修复执行问题', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v5.2',
    detail: '诊断4类问题：①上下文爆炸(信息太多)；②长尾遗忘(记住前面的忘了后面的)；③数据流中断；④多Agent配合失败。自动给修复方案',
    usage: '自定义的技能执行出问题、想优化技能性能'
  },
  { cmd: '/skill-simplify', desc: 'SKILL.md 简化 - 功能完整性验证', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '简化 SKILL.md：分析功能清单 → 应用优化规则（合并等价变体、移除冗余描述）→ 验证功能完整性。确保简化不丢失功能',
    usage: 'SKILL.md 太长太复杂，想精简但保持功能完整'
  },
  { cmd: '/command-generator', desc: '命令文件生成器 - 创建 .md 命令文件', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: '生成命令文件：创建带有 YAML 前置配置的 .md 命令文件，支持项目和用户两种范围',
    usage: '想创建新的 Claude Code 命令'
  },

  // 规格生成
  { cmd: '/spec-generator', desc: '规格生成器 - 6阶段文档链', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '生成6份文档：①产品简介；②需求文档PRD；③架构设计；④用户故事；⑤技术方案；⑥就绪检查。从想法到可执行的任务',
    usage: '新项目立项、需求评审前、或者要把想法变成具体开发任务'
  },

  // 团队协作
  { cmd: '/team-frontend', desc: '团队前端开发 - 多角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '5个角色分工协作：分析师(需求+设计智能)→架构师(设计令牌)→开发者(写代码)→QA(审查)。内置行业设计知识库，自动匹配最佳UI方案',
    usage: '开发前端页面或组件，需要从需求到上线全流程时'
  },
  { cmd: '/team-lifecycle', desc: '团队全生命周期 - spec/impl/test (默认使用最新版本)', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '完整团队工作流：需求分析→文档编写→规划→执行→测试→审查。自动使用最新的 team-lifecycle 版本',
    usage: '大项目从0到1，需要完整的需求→设计→开发→测试流程'
  },
  { cmd: '/team-lifecycle-v3', desc: '团队全生命周期 v3 - 8角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.3',
    detail: '8个角色：协调者、分析师、作家、评论员、规划师、执行者、测试员、审查员。支持按需加载架构师和前端开发',
    usage: '需要完整生命周期的团队协作开发'
  },
  { cmd: '/team-lifecycle-v4', desc: '团队全生命周期 v4 - 优化节拍版', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: '相比v3优化：内联讨论子代理、共享探索工具，规格阶段节拍从12降到6。更高效的团队协作',
    usage: '需要更高效的生命周期开发流程'
  },
  { cmd: '/team-lifecycle-v5', desc: '团队全生命周期 v5 - 团队工作代理架构', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: '最新架构：基于 team-worker 代理，所有工作角色共享单一代理定义，从角色规格文件加载 Phase 2-4。更灵活的角色定制',
    usage: '需要最新的团队协作架构，支持自定义角色'
  },
  { cmd: '/team-coordinate', desc: '通用团队协调 - 动态角色生成', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: '通用协调技能：分析任务→生成角色→派发→执行→交付。只有协调者是内置的，所有工作角色在运行时动态生成',
    usage: '需要灵活的团队协作，角色根据任务动态生成'
  },
  { cmd: '/team-coordinate-v2', desc: '通用团队协调 v2 - 角色规格文件架构', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: 'v2架构：使用团队工作代理和角色规格文件。工作角色作为轻量级规格文件生成，通过 team-worker 代理派发',
    usage: '需要基于角色规格的团队协调'
  },
  { cmd: '/team-executor', desc: '轻量级会话执行 - 恢复并执行会话', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: '轻量执行：加载现有 team-coordinate 会话→协调状态→派发工作代理→执行→交付。无分析、无角色生成，纯执行',
    usage: '已有规划好的会话，需要恢复执行'
  },
  { cmd: '/team-executor-v2', desc: '轻量级会话执行 v2 - team-worker 代理', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: 'v2架构：恢复 team-coordinate-v2 会话，通过 team-worker 代理执行。需要提供会话路径',
    usage: '已有 v2 架构的会话，需要恢复执行'
  },
  { cmd: '/team-iterdev', desc: '团队迭代开发 - 生成器-批评者循环', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: '迭代开发团队：开发者-审查者循环（最多3轮）、任务账本实时进度、共享内存跨冲刺学习、动态流水线选择增量交付',
    usage: '需要迭代式开发，持续改进代码质量'
  },
  { cmd: '/team-roadmap-dev', desc: '路线图驱动开发 - 分阶段执行流水线', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: '路线图驱动：协调者与用户讨论路线图→派发分阶段执行流水线（规划→执行→验证）。支持暂停/恢复',
    usage: '需要根据路线图分阶段开发'
  },
  { cmd: '/team-planex', desc: '团队 PlanEx - 规划执行流水线', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '2人流水线：规划师边规划边派任务，执行者边收任务边写代码。规划师不等待执行完成，直接规划下一批，效率翻倍',
    usage: '明确需求的功能开发，想要"边规划边执行"提高效率'
  },
  { cmd: '/team-quality-assurance', desc: '团队质量保证 - QA 角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '6角色闭环：侦察兵扫描问题→策略师定测试方案→生成器写测试→执行器跑测试→分析师出报告。覆盖率不够自动补测试',
    usage: '功能开发完成后，需要全面的质量验证和测试覆盖'
  },
  { cmd: '/team-arch-opt', desc: '团队架构优化 - 依赖循环、结构分析', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '5角色协作：分析员(架构问题)→设计师(策略)→重构工程师(实施)→验证者(测试)→审查员(报告)。 发现依赖循环、模块违规、死代码',
    usage: '项目架构混乱、依赖循环复杂，模块耦合过紧，需要系统性重构'
  },
  { cmd: '/team-perf-opt', desc: '团队性能优化 - 分析瓶颈、设计策略', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '5角色协作：分析员(性能分析)→策略师(优化策略)→优化工程师(实施)→基准测试员(基准)→验证者(验证)→审查员(报告)。 发现性能瓶颈，设计优化方案，实施改进，验证效果',
    usage: '应用性能下降，响应变慢，需要系统性性能优化'
  },
  { cmd: '/team-tech-debt', desc: '团队技术债务 - 债务管理协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '6角色治理：扫描器找问题→评估师算成本→规划师排优先级→执行者修代码→验证者测回归。独立工作分支，修完自动创建PR',
    usage: '项目代码质量下降，需要系统性清理技术债务'
  },
  { cmd: '/workflow-lite-planex', desc: '轻量规划执行 - 规划+执行一体化', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v7.2.0',
    detail: '2阶段快速流程：Phase 1 轻量规划生成 IMPL_PLAN.md；Phase 2 使用 Task tool执行任务。自动确认完成',
    usage: '中小型功能，想快速规划后立即执行，无需复杂流程'
  },
  { cmd: '/team-testing', desc: '团队测试 - 多角色测试协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '测试团队协作，测试计划和执行',
    usage: '需要团队协作测试时'
  },
  { cmd: '/team-uidesign', desc: '团队 UI 设计 - 设计角色协作', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: 'UI 设计团队协作，设计系统管理',
    usage: '需要团队协作 UI 设计时'
  },
  { cmd: '/team-ultra-analyze', desc: '团队超深度分析 - 全面代码分析', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '超深度代码分析，全面理解代码库',
    usage: '需要深度理解代码时'
  },
  { cmd: '/team-designer', desc: '元技能 - 生成 v4 架构团队技能', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '生成团队技能包：收集需求 → 生成脚手架（SKILL.md、roles/、specs/、templates/）→ 验证。输出完整可用的团队技能',
    usage: '需要创建新的团队协作技能'
  },
  { cmd: '/team-edict', desc: '三省六部协作框架 - 串行审批+并行执行', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '受古代三省六部启发：太子接旨 → 中书省规划 → 门下省审议（多CLI并行）→ 尚书省调度 → 六部并行执行。强制看板状态上报',
    usage: '需要严格的级联审批流程和多部门并行执行'
  },
  { cmd: '/team-frontend-debug', desc: '前端调试团队 - Chrome DevTools MCP', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '双模式前端调试：①功能清单测试模式（TEST→ANALYZE→FIX→VERIFY）；②Bug报告调试模式（REPRODUCE→ANALYZE→FIX→VERIFY）。使用 Chrome DevTools MCP',
    usage: '需要调试前端交互问题、无响应按钮、状态刷新问题'
  },
  { cmd: '/team-ux-improve', desc: 'UX 改进团队 - 系统化发现和修复交互问题', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: 'UX 改进流水线：扫描器（发现UI/UX问题）→ 诊断师（分析根因）→ 设计师（设计方案）→ 实现者（修复）→ 测试员（验证）',
    usage: '需要系统化发现和修复 UI/UX 交互问题'
  },

  // 工作流技能
  { cmd: '/workflow-execute', desc: '工作流执行技能 - 协调 Agent 执行', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '按依赖顺序执行任务：A任务完成后才执行B任务，支持并行执行无依赖的任务、实时显示进度',
    usage: '有规划好的任务列表需要执行时'
  },
  { cmd: '/workflow-lite-plan', desc: '轻量规划技能 - 快速内存规划', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '快速规划：在内存中分析→拆解任务→排列顺序。不生成文件，适合中小任务，规划完立即执行',
    usage: '任务不复杂，想快速规划然后马上开始做'
  },
  { cmd: '/workflow-lite-execute', desc: '轻量执行引擎 - 多模式输入执行', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v7.2.2',
    detail: '轻量执行：三种输入模式 ①内存模式（--in-memory 从 workflow-lite-plan 传递）；②提示描述模式；③文件内容模式。支持任务分组、批量执行、代码审查',
    usage: '需要执行规划文件或直接执行任务'
  },
  { cmd: '/workflow-multi-cli-plan', desc: '多 CLI 规划 - 并行 CLI 执行', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '同时用多个AI分析：Gemini、Codex、Claude同时分析同一问题，然后交叉验证，综合得出最佳方案',
    usage: '复杂问题需要多角度分析、单个AI结论不确定时'
  },
  { cmd: '/workflow-plan', desc: '完整规划技能 - 5阶段规划', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '5阶段详细规划：①启动会话；②收集项目上下文；③AI分析；④澄清不明确的地方；⑤生成任务文件。适合大项目',
    usage: '复杂功能、多模块开发、需要详细规划文档时'
  },
  { cmd: '/workflow-skill-designer', desc: '工作流技能设计器 - 创建工作流', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.2',
    detail: '设计新的工作流模板：定义有哪些阶段、每个阶段用什么工具、怎么处理错误。生成标准SKILL.md文件',
    usage: '想创建团队标准工作流程、把最佳实践固化下来'
  },
  { cmd: '/workflow-tdd', desc: 'TDD 工作流技能 - Red-Green-Refactor', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '测试驱动开发流程：①Red-先写失败的测试；②Green-写最少代码让测试通过；③Refactor-优化代码。循环直到完成',
    usage: '想用专业方式开发、确保代码可测试、追求高质量代码'
  },
  { cmd: '/workflow-test-fix', desc: '测试修复技能 - 生成+执行+修复', status: 'stable', category: 'skill', cli: 'claude', addedInVersion: 'v6.0',
    detail: '自动化测试循环：①自动生成测试用例；②执行测试;③发现失败自动修复;④再测试。直到全部通过',
    usage: '功能写完了需要补测试、测试失败想自动修复'
  },
  { cmd: '/workflow-wave-plan', desc: 'CSV Wave 规划执行 - 分批探索和执行', status: 'new', category: 'skill', cli: 'claude', addedInVersion: 'v6.4',
    detail: 'CSV Wave流程：①分解需求生成 explore.csv；②波浪式探索代码；③综合发现生成 tasks.csv；④波浪式执行任务。支持上下文传播',
    usage: '需要批量探索和执行任务，保持上下文连贯'
  },
  { cmd: '/workflow-tdd-plan', desc: 'TDD 规划技能 - 6阶段规划+Red-Green-Refactor任务链', status: 'stable', category: 'tdd', cli: 'claude', addedInVersion: 'v7.0.8',
    detail: '统一 TDD 工作流：6阶段 TDD 规划 + Red-Green-Refactor 任务链生成 + 4阶段验证。触发词：workflow-tdd-plan、workflow-tdd-verify',
    usage: 'TDD 开发前规划测试用例，生成完整的 Red→Green→Refactor 执行任务链'
  },

  // ==================== Codex 预检清单 (Prompts) ====================
  { cmd: '/prep-plan', desc: 'workflow-plan 预检清单 - 环境验证、任务质量评估、执行配置', status: 'stable', category: 'prompt', cli: 'codex', addedInVersion: 'v6.2',
    detail: '执行前检查5项：①项目环境OK吗；②目标清晰吗；③成功标准明确吗；④范围边界清楚吗；⑤有什么限制。避免执行到一半发现问题',
    usage: '重要任务执行前想确保万无一失'
  },
  { cmd: '/prep-cycle', desc: 'parallel-dev-cycle 预检清单 - 0→1→100 迭代配置', status: 'stable', category: 'prompt', cli: 'codex', addedInVersion: 'v6.2',
    detail: '配置两阶段迭代：0→1先做出能跑的原型；1→100打磨到生产质量(测试90%通过、代码覆盖80%)',
    usage: '大型功能想分阶段交付：先快速出原型，再逐步完善'
  },

  // ==================== Codex 技能 (Skills) ====================
  // 规划类
  { cmd: '/collaborative-plan-with-file', desc: '串行协作规划 - Plan Note架构，自动冲突检测', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '多人协作规划：先把大需求拆成多个技术领域，每人负责一个领域规划，最后自动检测各领域的冲突和依赖',
    usage: '涉及多个技术领域(前端/后端/数据库等)的复杂功能，需要不同专业的人分工规划'
  },
  { cmd: '/roadmap-with-file', desc: '路线图规划 - Codex 版', status: 'new', category: 'skill', cli: 'codex', addedInVersion: 'v6.4',
    detail: '交互式路线图：与AI讨论需求，生成项目路线图和里程碑规划',
    usage: '需要规划项目路线图'
  },

  // 分析/头脑风暴类
  { cmd: '/analyze-with-file', desc: '交互式协作分析 - 文档化讨论过程', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '深度分析并记录过程：边分析边记录理解，支持多轮问答，AI会纠正你的误解。生成完整的分析文档',
    usage: '需要深入分析代码库、理解复杂架构、研究技术方案'
  },
  { cmd: '/brainstorm-with-file', desc: '交互式头脑风暴 - 并行多视角分析', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '3个AI同时思考：创意型(天马行空)、务实型(关注落地)、系统型(全局视角)，记录所有想法的演变过程',
    usage: '功能设计、架构方案需要多角度创意思考'
  },

  // 执行类
  { cmd: '/unified-execute-with-file', desc: '统一执行引擎 - 消费 .task/*.json 目录', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '任务执行器：读取任务JSON文件，按依赖顺序执行，支持并行执行无依赖的任务，实时显示进度',
    usage: '有准备好的任务文件需要执行'
  },
  { cmd: '/parallel-dev-cycle', desc: '多Agent并行开发循环 (RA→EP→CD→VAS)', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '4个AI同时工作：需求分析师(RA)理解需求→探索规划师(EP)设计方案→代码开发(CD)写代码→验证归档(VAS)测试。可并行推进',
    usage: '大型功能开发，想同时推进需求分析、设计、开发、测试'
  },
  { cmd: '/team-planex', desc: 'PlanEx团队 - 规划执行', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '2人流水线：规划师边规划边派任务，执行者边收任务边写代码。规划不等待执行完成，效率高',
    usage: '需求明确的开发任务，想要边规划边执行'
  },

  // Issue管理类
  { cmd: '/issue-discover', desc: 'Issue发现和创建 - 手动/多视角/prompt驱动', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '3种发现模式：①手动创建问题；②8维度自动扫描(bug/安全/性能/UX/测试/质量/维护性/最佳实践)；③根据你的描述迭代探索',
    usage: '想主动发现项目中的隐藏问题'
  },

  // 测试类
  { cmd: '/workflow-test-fix-cycle', desc: '端到端测试修复循环 - 直到通过率≥95%', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '自动测试循环：①生成4层测试(单元/集成/E2E/回归)；②执行测试；③失败自动修复；④循环直到95%通过',
    usage: '代码写完了需要补测试，希望测试失败能自动修复'
  },

  // 审查类
  { cmd: '/review-cycle', desc: '多维度代码审查 - 7维度并行分析', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '7维度同时审查：代码对不对、好读吗、性能如何、安全吗、测试够不够、好维护吗、符合最佳实践吗。发现问题可自动修复',
    usage: '代码写完需要全面审查、PR合入前检查'
  },

  // 调试类
  { cmd: '/debug-with-file', desc: '假设驱动调试 - 文档化探索过程', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.0',
    detail: '科学调试方法：①猜测可能原因(假设)；②验证假设；③记录发现；④AI纠正错误理解。系统化定位问题',
    usage: '遇到难定位的bug，需要系统化地分析和排查'
  },

  // 工具类
  { cmd: '/ccw-cli-tools', desc: 'CLI工具统一执行框架', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '统一调用外部AI：配置好Gemini/Qwen/Codex等工具，用一个模板调用不同AI，自动选择最合适的工具',
    usage: '想使用外部AI工具(Gemini/Qwen等)进行代码分析或生成'
  },
  { cmd: '/memory-compact', desc: '会话内存压缩为结构化文本', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v5.2',
    detail: '压缩会话内容：提取目标、计划、关键文件、重要决策，去掉冗余对话。方便下次恢复上下文',
    usage: '对话太长了想压缩保存，或者要切换话题但想保留关键信息'
  },
  { cmd: '/clean', desc: '智能代码清理 - 检测过时产物', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v5.2',
    detail: '自动扫描清理：废弃的工作流会话、临时文件、死代码、过时的依赖。让项目保持整洁',
    usage: '项目做久了文件变多，想清理不需要的东西'
  },
  { cmd: '/csv-wave-pipeline', desc: 'CSV 波浪流水线 - 批量任务执行', status: 'new', category: 'skill', cli: 'codex', addedInVersion: 'v6.4',
    detail: 'CSV驱动批量执行：读取 tasks.csv，分波次执行任务，支持进度保存和断点续传',
    usage: '有任务清单(CSV格式)需要批量执行'
  },
  { cmd: '/team-lifecycle', desc: '团队全生命周期 - Codex 版', status: 'stable', category: 'skill', cli: 'codex', addedInVersion: 'v6.2',
    detail: '完整生命周期：需求分析→架构设计→开发→测试→审查。包含多个模板文件(产品简介、PRD、架构文档、Epic模板)',
    usage: 'Codex 环境下的完整项目开发流程'
  },
  { cmd: '/project-documentation-workflow', desc: '波式项目文档生成器 - 动态任务分解', status: 'new', category: 'skill', cli: 'codex', addedInVersion: 'v7.2.2',
    detail: '文档生成流水线：分析项目结构 → 动态生成文档任务 → 拓扑排序计算执行波次 → 波次间综合 → 生成完整文档套件（架构、方法、理论、功能、用法、设计哲学）',
    usage: '需要为项目生成完整的文档套件'
  },
  { cmd: '/session-sync', desc: '快速同步会话 - specs/*.md + project-tech.json', status: 'new', category: 'skill', cli: 'codex', addedInVersion: 'v7.2.2',
    detail: '一次性同步：扫描 git diff → 提取规范更新 → 写入 specs/*.md 和 project-tech.json。无交互向导',
    usage: '需要快速同步会话工作到规范文件'
  },
  { cmd: '/spec-add', desc: '添加规范 - Codex 版', status: 'new', category: 'skill', cli: 'codex', addedInVersion: 'v7.2.2',
    detail: 'Codex 版规范添加：支持交互式向导和直接命令模式。添加 convention、constraint 或 learning',
    usage: 'Codex 环境下添加规范'
  },
  { cmd: '/spec-setup', desc: '初始化规格 - Codex 版', status: 'new', category: 'skill', cli: 'codex', addedInVersion: 'v7.2.2',
    detail: 'Codex 版规格初始化：cli-explore-agent 分析 + 交互式问卷配置规范',
    usage: 'Codex 环境下初始化项目规格'
  },

];

// ============================================
// 统计数据
// ============================================
export const STATS = {
  totalCommands: 127,
  categories: Object.keys(CATEGORIES).length,
  claudeCommands: COMMANDS.filter(c => c.cli === 'claude').length,
  codexCommands: COMMANDS.filter(c => c.cli === 'codex').length,
  newCommands: COMMANDS.filter(c => c.status === 'new').length,
  recommendedCommands: COMMANDS.filter(c => c.status === 'recommended').length,
  latestVersion: 'v7.2.4',  // 当前最新版本
};
