// ============================================
// 完整命令列表 - 基于 CCW 仓库实际存在
// ============================================
import type { Command } from './types';
import { CATEGORIES } from './constants';

export const COMMANDS: Command[] = [
  // ==================== 主入口命令 ====================
  { cmd: '/ccw', desc: '主入口！智能分析意图，自动选择命令', status: 'recommended', category: 'main', cli: ['claude'], addedInVersion: 'v6.2',
    detail: '万能入口！告诉它你想做什么，它会分析你的意图，自动选择最合适的命令或命令组合执行。不用背命令，说人话就行',
    usage: '不知道用什么命令时，直接说 /ccw 你想做的事，比如"/ccw 修复登录bug"'
  },
  { cmd: '/ccw-help', desc: '命令帮助系统，搜索和浏览所有命令', status: 'stable', category: 'main', cli: ['claude'], addedInVersion: 'v6.2',
    detail: '交互式命令浏览器：按分类浏览90+个命令、搜索命令名或功能、查看详细使用说明',
    usage: '想知道有哪些命令、忘了某个命令怎么用'
  },
  { cmd: '/ccw-coordinator', desc: '交互式命令编排，分析需求推荐命令链', status: 'stable', category: 'main', cli: ['claude'], addedInVersion: 'v6.2',
    detail: '复杂需求分解器：分析你的需求，推荐需要执行的命令序列，你可以调整后再执行',
    usage: '一个任务需要多个命令配合完成，不知道怎么组合'
  },
  { cmd: '/workflow-skill', desc: '直接启动任意工作流技能，按名称调用', status: 'new', category: 'main', cli: ['claude'], addedInVersion: 'v7.3',
    detail: '技能快速启动器：直接指定技能名称和参数即可调用，无需经过意图分析。不传参数则显示技能目录供选择',
    usage: '知道要用的技能名称，想快速调用'
  },

  // ==================== Chain 工作流 ====================
  { cmd: '/ccw-chain', desc: 'Chain 链式工作流编排，意图分析+自动路由', status: 'new', category: 'workflow', cli: ['claude'], addedInVersion: 'v7.3',
    detail: '链式工作流引擎：通过 chain_loader 实现渐进式步骤加载和 LLM 决策路由。支持意图分析→工作流匹配→技能流水线执行，支持自动模式(-y)跳过确认',
    usage: '复杂任务需要多步骤编排、自动选择工作流链'
  },
  { cmd: '/chain-loader', desc: 'Chain 技能生成器，将线性技能转为链图结构', status: 'new', category: 'workflow', cli: ['claude'], addedInVersion: 'v7.3',
    detail: '链式技能元工具：分析现有技能→设计节点图（步骤/决策/委托节点）→生成 chain JSON 并验证图连通性。支持 12 节点上限，超限自动拆分为主链+子链',
    usage: '想把现有技能改造为链式结构、创建新的链式技能'
  },

  // ==================== 工作流核心 ====================
  { cmd: '/workflow:clean', desc: '清理代码和临时文件', status: 'stable', category: 'workflow', cli: ['claude'], addedInVersion: 'v5.2',
    detail: '智能清理：检测过时的会话目录、临时文件、死代码、无用的依赖。保持项目整洁',
    usage: '项目做了很久，想清理不需要的文件'
  },

  // With-File 系列
  { cmd: '/workflow:analyze-with-file', desc: '交互式协作分析 - CLI探索+多视角+文档化', status: 'stable', category: 'workflow', cli: ['claude'], addedInVersion: 'v6.0',
    detail: '4阶段分析流程：①主题理解→②CLI探索(cli-explore-agent)+外部研究(workflow-research-agent)→③交互讨论(Intent Drift检测)→④综合结论(Findings Coverage Matrix)。支持多视角并行(Technical/Architectural/Business/Domain最多4个)、决策记录协议、产出discussion.md+conclusions.json',
    usage: '需要深入分析代码库、理解复杂架构、研究技术方案、多角度评估决策'
  },
  { cmd: '/workflow:debug-with-file', desc: '交互式调试 - 假设驱动+理解演变记录', status: 'stable', category: 'workflow', cli: ['claude'], addedInVersion: 'v6.0',
    detail: '证据驱动调试流程：Explore→Document→Log→Analyze→Correct→Fix→Verify。记录理解演变(understanding.md)，Gemini辅助纠正误解，保留学习成果',
    usage: '遇到难定位的复杂bug'
  },
  { cmd: '/workflow:collaborative-plan-with-file', desc: '协作式规划', status: 'stable', category: 'workflow', cli: ['claude'], addedInVersion: 'v6.0',
    detail: '多人协作规划：把大需求拆成多个领域，不同专业的人分别规划，最后自动检测冲突',
    usage: '涉及多个技术领域的复杂功能，需要不同专业的人分工规划'
  },
  { cmd: '/workflow:brainstorm-with-file', desc: '交互式头脑风暴 - 多CLI协作+发散收敛循环', status: 'stable', category: 'brainstorm', cli: ['claude'], addedInVersion: 'v6.0',
    detail: '多CLI协作头脑风暴：cli-explore-agent探索 + Multi-CLI视角(Gemini/Codex/Claude或专业角色)，发散-收敛循环(Diverge-Converge)，记录想法演变。支持creative/structured模式',
    usage: '需要创意思考、功能设计、架构方案讨论'
  },
  { cmd: '/workflow:roadmap-with-file', desc: '路线图规划', status: 'new', category: 'workflow', cli: ['claude'], addedInVersion: 'v6.4',
    detail: '交互式路线图：与AI讨论需求，生成项目路线图和里程碑规划',
    usage: '需要规划项目路线图'
  },
  { cmd: '/workflow:unified-execute-with-file', desc: '通用执行引擎', status: 'stable', category: 'workflow', cli: ['claude'], addedInVersion: 'v6.2',
    detail: '万能执行器：支持执行各种格式的规划文件(brainstorm、plan、issue等)，按依赖顺序执行',
    usage: '有各种格式的规划文件需要执行'
  },
  { cmd: '/workflow:integration-test-cycle', desc: '集成测试循环', status: 'stable', category: 'test', cli: ['claude'], addedInVersion: 'v6.2',
    detail: '集成测试：生成集成测试→执行→发现失败修复→再测试。循环到全部通过',
    usage: '需要为模块间的集成编写测试'
  },
  { cmd: '/workflow:refactor-cycle', desc: '重构循环', status: 'stable', category: 'workflow', cli: ['claude'], addedInVersion: 'v6.2',
    detail: '安全重构：重构代码→运行测试验证→如果测试失败可回滚。确保重构不破坏功能',
    usage: '需要重构代码但怕改坏东西'
  },

  // ==================== 会话管理 ====================
  { cmd: '/workflow:session:start', desc: '开始新的工作流会话', status: 'stable', category: 'session', cli: ['claude'], addedInVersion: 'v5.0',
    detail: '创建工作会话：生成唯一会话ID、创建会话目录(.workflow/sessions/xxx/)、初始化状态文件。后续工作都在这个会话里追踪',
    usage: '开始一个新的开发任务'
  },
  { cmd: '/workflow:session:list', desc: '列出所有会话及其状态', status: 'stable', category: 'session', cli: ['claude'], addedInVersion: 'v5.0',
    detail: '会话列表：显示所有会话的ID、创建时间、当前状态(活跃/暂停/完成)、进度概览',
    usage: '想看看有哪些进行中或已完成的工作'
  },
  { cmd: '/workflow:session:resume', desc: '恢复最近暂停的会话', status: 'stable', category: 'session', cli: ['claude'], addedInVersion: 'v5.0',
    detail: '恢复工作：找到最近暂停的会话，加载上下文，从上次停下的地方继续',
    usage: '继续之前暂停的工作'
  },
  { cmd: '/workflow:session:complete', desc: '完成并归档会话', status: 'stable', category: 'session', cli: ['claude'], addedInVersion: 'v5.0',
    detail: '结束会话：标记会话为完成、生成总结报告、移动到归档目录。记录做了什么、有什么收获',
    usage: '任务完成后进行收尾'
  },
  { cmd: '/workflow:session:sync', desc: '同步会话状态', status: 'new', category: 'session', cli: ['claude'], addedInVersion: 'v6.4',
    detail: '同步会话：将当前会话状态同步到文件系统，确保状态持久化',
    usage: '需要保存当前会话状态'
  },

  // ==================== 规格管理 ====================
  { cmd: '/workflow:spec:setup', desc: '初始化项目规格 - cli-explore-agent 分析 + 交互式问卷', status: 'new', category: 'workflow', cli: ['claude'], addedInVersion: 'v7.2.2',
    detail: '初始化规格系统：调用 cli-explore-agent 分析项目 → 生成 project-tech.json → 交互式配置编码规范、架构约束、质量规则',
    usage: '新项目需要建立开发规范和约束'
  },
  { cmd: '/workflow:spec:add', desc: '添加规范 - 交互式或直接模式', status: 'new', category: 'workflow', cli: ['claude'], addedInVersion: 'v7.2.2',
    detail: '添加规格条目：支持 convention（编码风格）、constraint（硬性规则）、learning（经验教训）。交互式向导或直接命令模式',
    usage: '需要添加编码规范、架构约束或记录经验教训'
  },
  { cmd: '/workflow:spec:load', desc: '交互式规格加载器 - 按关键词路由加载相关规格', status: 'new', category: 'workflow', cli: ['claude'], addedInVersion: 'v7.2.5',
    detail: '交互式规格浏览入口：菜单驱动 → 关键词匹配 → 加载并展示。支持按类型过滤（bug/pattern/decision/rule）、按标签过滤、关键词搜索，或加载全部规格',
    usage: '需要查看项目规格、搜索特定类型的知识条目'
  },

  // ==================== Issue 管理 ====================
  { cmd: '/issue:new', desc: '创建结构化 Issue', status: 'stable', category: 'issue', cli: ['claude'], addedInVersion: 'v5.0',
    detail: '创建问题记录：填写问题描述、严重程度、影响范围、复现步骤。生成标准化Issue文件',
    usage: '发现问题想记录下来'
  },
  { cmd: '/issue:plan', desc: '规划 Issue 解决方案', status: 'stable', category: 'issue', cli: ['claude'], addedInVersion: 'v5.0',
    detail: '设计方案：分析问题原因→设计解决思路→拆解实施步骤→预估工作量',
    usage: '已知问题需要规划如何解决'
  },
  { cmd: '/issue:queue', desc: '形成执行队列', status: 'stable', category: 'issue', cli: ['claude'], addedInVersion: 'v6.0',
    detail: '排列执行顺序：把多个Issue按优先级和依赖关系排成队列，先做重要的、先做被依赖的',
    usage: '有多个Issue想批量处理'
  },
  { cmd: '/issue:execute', desc: '执行 Issue 解决方案', status: 'stable', category: 'issue', cli: ['claude'], addedInVersion: 'v6.0',
    detail: '执行解决方案：按队列顺序执行，每个解决完自动提交git，方便追踪和回滚',
    usage: '执行已规划好的Issue解决方案'
  },
  { cmd: '/issue:discover', desc: '多角度发现潜在问题', status: 'stable', category: 'issue', cli: ['claude'], addedInVersion: 'v6.0',
    detail: '主动发现问题：8个维度扫描(bug风险/安全漏洞/性能问题/用户体验/测试覆盖/代码质量/可维护性/最佳实践)',
    usage: '想主动发现项目中的隐患'
  },
  { cmd: '/issue:discover-by-prompt', desc: '智能问题发现', status: 'new', category: 'issue', cli: ['claude'], addedInVersion: 'v6.3',
    detail: '按需发现：你说关注什么(比如"安全问题")，AI针对性地扫描发现相关问题',
    usage: '有具体关注点想发现问题'
  },
  { cmd: '/issue:convert-to-plan', desc: '转换规划产物为执行计划', status: 'stable', category: 'issue', cli: ['claude'], addedInVersion: 'v6.0',
    detail: '格式转换：把各种规划文档(brainstorm结果、roadmap等)转成标准Issue格式，统一执行',
    usage: '有现成的规划文档想执行'
  },
  { cmd: '/issue:from-brainstorm', desc: '头脑风暴结果转 Issue', status: 'stable', category: 'issue', cli: ['claude'], addedInVersion: 'v6.0',
    detail: '想法变任务：把头脑风暴产生的想法自动转成结构化的Issue，可以直接执行',
    usage: '头脑风暴后想把想法变成具体任务'
  },




  // ==================== UI 设计 ====================
  { cmd: '/workflow:ui-design:explore-auto', desc: '探索式 UI 设计', status: 'new', category: 'ui-design', cli: ['claude'], addedInVersion: 'v6.3',
    detail: '从零设计UI：根据需求描述，自动探索设计方案，生成完整的设计系统和UI代码',
    usage: '需要从头设计UI界面'
  },
  { cmd: '/workflow:ui-design:imitate-auto', desc: '高速 UI 复刻', status: 'new', category: 'ui-design', cli: ['claude'], addedInVersion: 'v6.3',
    detail: '参考复刻：提供设计图或网站URL，自动分析设计风格，快速生成相同风格的UI代码',
    usage: '有设计稿或参考网站想复刻'
  },

  { cmd: '/workflow:ui-design:style-extract', desc: '提取设计风格', status: 'new', category: 'ui-design', cli: ['claude'], addedInVersion: 'v6.3',
    detail: '提取样式：从设计图或现有代码中提取颜色、字体、间距等设计规范',
    usage: '想分析设计风格，建立设计系统'
  },
  { cmd: '/workflow:ui-design:layout-extract', desc: '提取布局结构', status: 'new', category: 'ui-design', cli: ['claude'], addedInVersion: 'v6.3',
    detail: '提取布局：从图片或网站分析页面布局结构，生成可复用的布局模板',
    usage: '想分析页面布局结构'
  },
  { cmd: '/workflow:ui-design:generate', desc: '组装 UI 原型', status: 'new', category: 'ui-design', cli: ['claude'], addedInVersion: 'v6.3',
    detail: '组装UI：把提取的设计风格和布局模板组合成可运行的UI代码',
    usage: '想生成可用的UI代码'
  },
  { cmd: '/workflow:ui-design:design-sync', desc: '同步设计系统', status: 'new', category: 'ui-design', cli: ['claude'], addedInVersion: 'v6.3',
    detail: '同步更新：设计稿更新后，自动同步代码实现，保持设计和代码一致',
    usage: '设计稿更新后需要同步代码'
  },
  { cmd: '/workflow:ui-design:animation-extract', desc: '提取动画模式', status: 'new', category: 'ui-design', cli: ['claude'], addedInVersion: 'v6.3',
    detail: '提取动画：从网站或视频分析动画效果，生成可复用的动画代码',
    usage: '想学习和复用动画效果'
  },
  { cmd: '/workflow:ui-design:codify-style', desc: '样式代码化', status: 'stable', category: 'ui-design', cli: ['claude'], addedInVersion: 'v6.3',
    detail: '样式转代码：把设计规范(颜色、字体等)转换成CSS变量、Tailwind配置等代码',
    usage: '想将设计转换为代码'
  },
  { cmd: '/workflow:ui-design:import-from-code', desc: '从代码导入设计', status: 'stable', category: 'ui-design', cli: ['claude'], addedInVersion: 'v6.3',
    detail: '代码反推设计：分析现有UI代码，反向提取设计规范和组件规范',
    usage: '想从代码中提取设计规范'
  },
  { cmd: '/workflow:ui-design:reference-page-generator', desc: '生成参考页面', status: 'stable', category: 'ui-design', cli: ['claude'], addedInVersion: 'v6.3',
    detail: '生成参考页：把设计系统和组件生成HTML参考页面，方便查看和分享',
    usage: '想生成设计参考文档'
  },

  // ==================== 记忆系统 ====================
  { cmd: '/memory:prepare', desc: '准备记忆系统', status: 'stable', category: 'memory', cli: ['claude'], addedInVersion: 'v6.4',
    detail: '初始化记忆：准备记忆系统所需的目录结构和配置文件',
    usage: '首次使用记忆系统前准备'
  },
  { cmd: '/memory:style-skill-memory', desc: '样式技能记忆', status: 'stable', category: 'memory', cli: ['claude'], addedInVersion: 'v6.4',
    detail: '样式记忆：保存和加载 UI 样式相关的技能经验',
    usage: '需要保存或复用样式设计经验'
  },


  // ==================== Claude Code Skills (独立技能) ====================
  // 头脑风暴类
  { cmd: '/brainstorm', desc: '统一头脑风暴 - 自动流程或单角色分析', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.0',
    detail: '两种模式：①自动模式-理解需求→发散想法→收敛结论→执行；②单角色-只从某个专业视角分析（如架构师、产品经理）',
    usage: '需要创意发散、多角度思考、或从特定专业视角分析问题时'
  },
  { cmd: '/team-brainstorm', desc: '团队头脑风暴 - 多角色协作', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.2',
    detail: '4角色协作：创意者(ideator)出点子→挑战者(challenger)挑毛病→综合者(synthesizer)整合→评估师(evaluator)打分。基于team-worker架构，支持Quick/Deep/Full流水线',
    usage: '重要决策需要多人、多角度碰撞想法时'
  },


  // Issue 管理
  { cmd: '/issue-manage', desc: '交互式 Issue 管理 - CRUD 操作', status: 'stable', category: 'skill', cli: ['claude'], addedInVersion: 'v6.2',
    detail: '菜单驱动管理：列出所有问题、查看详情、编辑内容、删除、批量操作。像用手机App一样简单',
    usage: '想查看、修改或删除已有的问题时'
  },
  { cmd: '/team-issue', desc: '团队 Issue 解决 - 多角色协作', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.2',
    detail: '6角色分工：探索者分析→规划师设计方案→实现者写代码→审查者检查→整合者合并。适合复杂问题',
    usage: '一个Issue涉及多个模块、需要多人分工协作时'
  },

  // 记忆系统
  { cmd: '/memory-capture', desc: '统一记忆捕获 - 会话压缩或快速技巧', status: 'stable', category: 'skill', cli: ['claude'], addedInVersion: 'v6.2',
    detail: '两种模式：①完整压缩-把当前对话压缩成结构化笔记，方便下次恢复；②快速技巧-记下小贴士、代码片段',
    usage: '当前会话做得不错想保存经验、或者记下有用的技巧'
  },
  { cmd: '/memory-manage', desc: '统一记忆管理 - CLAUDE.md 更新和文档生成', status: 'stable', category: 'skill', cli: ['claude'], addedInVersion: 'v6.2',
    detail: '菜单选择：①全量更新所有CLAUDE.md；②只更新改动的模块；③生成项目文档。让项目知识保持最新',
    usage: '项目结构变了想更新文档、或者想生成完整项目说明'
  },

  // 代码审查
  { cmd: '/review-code', desc: '多维度代码审查 - 结构化报告', status: 'stable', category: 'skill', cli: ['claude'], addedInVersion: 'v6.0',
    detail: '7个维度审查：代码对不对、好读吗、性能如何、安全吗、测试够不够、好维护吗、符合最佳实践吗。出详细报告',
    usage: '写完代码想检查质量、代码合入前想审查、接手别人的代码'
  },
  { cmd: '/review-cycle', desc: '统一代码审查 - 多维度并行分析', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.2',
    detail: '多维度同时审查：代码对不对、好读吗、性能如何、安全吗、测试够不够、好维护吗、符合最佳实践吗。发现问题可自动修复。支持会话/模块/修复三种模式',
    usage: '代码写完需要全面审查、PR合入前检查、审查完想自动改问题'
  },
  { cmd: '/team-review', desc: '团队代码审查 - 3角色流水线', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.2',
    detail: '3角色流水线：扫描器(scanner)发现问题→审查者(reviewer)深度分析→修复者(fixer)自动修复。基于team-worker架构',
    usage: '重要代码合入前、大型PR需要全面审查时'
  },

  // 技能管理
  { cmd: '/skill-generator', desc: '元技能 - 创建新的 Claude Code 技能', status: 'stable', category: 'skill', cli: ['claude'], addedInVersion: 'v5.2',
    detail: '创建你自己的工作流模板：定义步骤、选择工具、设置参数。一次创建，反复使用',
    usage: '有重复的工作流程想固化成命令、想分享团队的工作方式'
  },
  { cmd: '/skill-tuning', desc: '技能诊断优化 - 检测和修复执行问题', status: 'stable', category: 'skill', cli: ['claude'], addedInVersion: 'v5.2',
    detail: '诊断4类问题：①上下文爆炸(信息太多)；②长尾遗忘(记住前面的忘了后面的)；③数据流中断；④多Agent配合失败。自动给修复方案',
    usage: '自定义的技能执行出问题、想优化技能性能'
  },
  { cmd: '/skill-iter-tune', desc: '迭代式技能调优 - 执行-评估-改进反馈循环', status: 'new', category: 'skill', cli: ['claude'], addedInVersion: 'v7.2.7',
    detail: '迭代调优流程：Claude 执行 skill → Gemini 评估质量 → Agent 应用改进。循环直到达到质量阈值或最大迭代次数。支持单 skill 和 skill 链两种模式',
    usage: '需要通过迭代反馈优化 skill 质量，或调试 skill 执行问题'
  },
  { cmd: '/skill-simplify', desc: 'SKILL.md 简化 - 功能完整性验证', status: 'new', category: 'skill', cli: ['claude'], addedInVersion: 'v7.2.2',
    detail: '简化 SKILL.md：分析功能清单 → 应用优化规则（合并等价变体、移除冗余描述）→ 验证功能完整性。确保简化不丢失功能',
    usage: 'SKILL.md 太长太复杂，想精简但保持功能完整'
  },
  { cmd: '/command-generator', desc: '命令文件生成器 - 创建 .md 命令文件', status: 'new', category: 'skill', cli: ['claude'], addedInVersion: 'v6.4',
    detail: '生成命令文件：创建带有 YAML 前置配置的 .md 命令文件，支持项目和用户两种范围',
    usage: '想创建新的 Claude Code 命令'
  },

  // 规格生成
  { cmd: '/spec-generator', desc: '规格生成器 - 7阶段文档链', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.2',
    detail: '7阶段文档链：规格研究→发现→产品简介→需求PRD→架构设计→Epic拆分→就绪检查。含Codex审查关卡，从想法到可执行任务',
    usage: '新项目立项、需求评审前、或者要把想法变成具体开发任务'
  },

  // 团队协作
  { cmd: '/team-frontend', desc: '团队前端开发 - 多角色协作', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.2',
    detail: '4个角色分工协作：分析师(需求+设计智能)→架构师(设计令牌)→开发者(写代码)→QA(审查)。内置ui-ux-pro-max设计知识库，基于team-worker架构',
    usage: '开发前端页面或组件，需要从需求到上线全流程时'
  },
  { cmd: '/team-lifecycle', desc: '团队全生命周期 - spec/impl/test', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.2',
    detail: '完整生命周期：需求分析→架构设计→开发→测试→审查。包含多个模板文件(产品简介、PRD、架构文档、Epic模板)。自动使用最新的 team-lifecycle 版本',
    usage: '大项目从0到1，需要完整的需求→设计→开发→测试流程'
  },
  { cmd: '/team-lifecycle-v4', desc: '团队全生命周期 v4 - 优化节拍版', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.4',
    detail: '相比v3优化：内联讨论子代理、共享探索工具，规格阶段节拍从12降到6。更高效的团队协作',
    usage: '需要更高效的生命周期开发流程'
  },
  { cmd: '/team-coordinate', desc: '通用团队协调 - 动态角色生成', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.4',
    detail: '通用协调技能：分析任务→生成角色→派发→执行→交付。只有协调者是内置的，所有工作角色在运行时动态生成',
    usage: '需要灵活的团队协作，角色根据任务动态生成'
  },
  { cmd: '/team-executor', desc: '轻量级会话执行 - 恢复并执行会话', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.4',
    detail: '轻量执行：加载现有 team-coordinate 会话→协调状态→派发工作代理→执行→交付。无分析、无角色生成，纯执行',
    usage: '已有规划好的会话，需要恢复执行'
  },
  { cmd: '/team-roadmap-dev', desc: '路线图驱动开发 - 分阶段执行流水线', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.4',
    detail: '路线图驱动：协调者与用户讨论路线图→派发分阶段执行流水线（规划→执行→验证）。支持暂停/恢复',
    usage: '需要根据路线图分阶段开发'
  },
  { cmd: '/team-planex', desc: '团队 PlanEx - 规划执行流水线', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.2',
    detail: '2人流水线：规划师边规划边派任务，执行者边收任务边写代码。规划不等待执行完成，直接规划下一批，效率翻倍',
    usage: '需求明确的开发任务，想要边规划边执行'
  },
  { cmd: '/team-quality-assurance', desc: '团队质量保证 - QA 角色协作', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.2',
    detail: '6角色闭环：侦察兵扫描问题→策略师定测试方案→生成器写测试→执行器跑测试→分析师出报告。覆盖率不够自动补测试',
    usage: '功能开发完成后，需要全面的质量验证和测试覆盖'
  },
  { cmd: '/team-arch-opt', desc: '团队架构优化 - 依赖循环、结构分析', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v7.2.2',
    detail: '5角色协作：分析员(架构问题)→设计师(策略)→重构工程师(实施)→验证者(测试)→审查员(报告)。 发现依赖循环、模块违规、死代码',
    usage: '项目架构混乱、依赖循环复杂，模块耦合过紧，需要系统性重构'
  },
  { cmd: '/team-perf-opt', desc: '团队性能优化 - 分析瓶颈、设计策略', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v7.2.2',
    detail: '5角色协作：性能分析员(profiler)→策略师(strategist)→优化工程师(optimizer)→基准测试员(benchmarker)→审查员(reviewer)。基于team-worker架构',
    usage: '应用性能下降，响应变慢，需要系统性性能优化'
  },
  { cmd: '/team-tech-debt', desc: '团队技术债务 - 债务管理协作', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.2',
    detail: '6角色治理：扫描器找问题→评估师算成本→规划师排优先级→执行者修代码→验证者测回归。独立工作分支，修完自动创建PR',
    usage: '项目代码质量下降，需要系统性清理技术债务'
  },
  { cmd: '/workflow-lite-planex', desc: '轻量规划执行 - 规划+执行一体化', status: 'new', category: 'skill', cli: ['codex'], addedInVersion: 'v7.2.0',
    detail: '2阶段快速流程：Phase 1 轻量规划生成 IMPL_PLAN.md；Phase 2 使用 Task tool执行任务。自动确认完成',
    usage: '中小型功能，想快速规划后立即执行，无需复杂流程'
  },
  { cmd: '/team-testing', desc: '团队测试 - 渐进式测试协作', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.2',
    detail: '4角色流水线：策略师(strategist)规划测试→生成器(generator)写测试→执行器(executor)跑测试→分析师(analyst)出报告。基于team-worker架构',
    usage: '需要团队协作测试时'
  },
  { cmd: '/team-uidesign', desc: '团队 UI 设计 - 设计系统协作', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.2',
    detail: '4角色流水线：研究员(researcher)分析设计需求→设计师(designer)创建设计→审查者(reviewer)检查质量→实现者(implementer)构建组件。基于team-worker架构',
    usage: '需要团队协作 UI 设计时'
  },
  { cmd: '/team-ultra-analyze', desc: '团队超深度分析 - 多角色协作', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.2',
    detail: '4角色流水线：探索者(explorer)发现代码→分析师(analyst)深度分析→讨论者(discussant)交叉验证→综合者(synthesizer)提炼结论。基于team-worker架构',
    usage: '需要深度理解代码时'
  },
  { cmd: '/team-designer', desc: '元技能 - 生成 v4 架构团队技能', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v7.2.2',
    detail: '生成团队技能包：收集需求 → 生成脚手架（SKILL.md、roles/、specs/、templates/）→ 验证。输出完整可用的团队技能',
    usage: '需要创建新的团队协作技能'
  },
  { cmd: '/team-frontend-debug', desc: '前端调试团队 - Chrome DevTools MCP', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v7.2.2',
    detail: '双模式前端调试：①功能清单测试模式（TEST→ANALYZE→FIX→VERIFY）；②Bug报告调试模式（REPRODUCE→ANALYZE→FIX→VERIFY）。使用 Chrome DevTools MCP',
    usage: '需要调试前端交互问题、无响应按钮、状态刷新问题'
  },
  { cmd: '/team-ux-improve', desc: 'UX 改进团队 - 系统化发现和修复交互问题', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v7.2.2',
    detail: 'UX 改进流水线：扫描器（发现UI/UX问题）→ 诊断师（分析根因）→ 设计师（设计方案）→ 实现者（修复）→ 测试员（验证）',
    usage: '需要系统化发现和修复 UI/UX 交互问题'
  },

  // 新增技能工具
  { cmd: '/delegation-check', desc: '委托冲突检查 - 验证命令/代理内容分离', status: 'new', category: 'skill', cli: ['claude'], addedInVersion: 'v7.2.20',
    detail: '检查命令委托提示与代理角色定义是否遵循内容分离原则。检测 7 维冲突：角色重定义、领域泄露、质量门重复、输出格式冲突、流程覆盖、范围权限冲突、缺失契约',
    usage: '审查 workflow skill 质量，检查命令与代理的职责边界'
  },
  { cmd: '/prompt-generator', desc: '提示词生成器 - 创建/转换命令、技能、代理', status: 'new', category: 'skill', cli: ['claude'], addedInVersion: 'v7.2.20',
    detail: '四种模式：① 创建命令 - 新建编排工作流；② 创建技能 - 渐进式加载的 SKILL.md；③ 创建代理 - 角色定义+领域知识；④ 转换 - 现有文件重风格（零内容丢失）',
    usage: '想创建新的命令/技能/代理，或转换现有文件风格'
  },

  // 工作流技能
  { cmd: '/workflow-execute', desc: '工作流执行技能 - 协调 Agent 执行', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.0',
    detail: '按依赖顺序执行任务：A任务完成后才执行B任务，支持并行执行无依赖的任务、实时显示进度',
    usage: '有规划好的任务列表需要执行时'
  },
  { cmd: '/workflow-lite-plan', desc: '轻量规划技能 - 快速内存规划', status: 'stable', category: 'skill', cli: ['claude'], addedInVersion: 'v6.2',
    detail: '快速规划：在内存中分析→拆解任务→排列顺序。不生成文件，适合中小任务，规划完立即执行',
    usage: '任务不复杂，想快速规划然后马上开始做'
  },
  { cmd: '/workflow-lite-execute', desc: '轻量执行引擎 - 多模式输入执行', status: 'new', category: 'skill', cli: ['claude'], addedInVersion: 'v7.2.2',
    detail: '轻量执行：三种输入模式 ①内存模式（--in-memory 从 workflow-lite-plan 传递）；②提示描述模式；③文件内容模式。支持任务分组、批量执行、代码审查',
    usage: '需要执行规划文件或直接执行任务'
  },
  { cmd: '/workflow-multi-cli-plan', desc: '多 CLI 规划 - 并行 CLI 执行', status: 'stable', category: 'skill', cli: ['claude'], addedInVersion: 'v6.2',
    detail: '同时用多个AI分析：Gemini、Codex、Claude同时分析同一问题，然后交叉验证，综合得出最佳方案',
    usage: '复杂问题需要多角度分析、单个AI结论不确定时'
  },
  { cmd: '/workflow-plan', desc: '完整规划技能 - 4阶段规划+验证+重规划', status: 'stable', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v6.0',
    detail: '4阶段规划流程：启动会话→收集项目上下文→AI分析→生成任务文件。支持规划验证(workflow-plan-verify)和交互式重规划(workflow:replan)',
    usage: '复杂功能、多模块开发、需要详细规划文档时'
  },
  { cmd: '/workflow-skill-designer', desc: '工作流技能设计器 - 创建工作流', status: 'stable', category: 'skill', cli: ['claude'], addedInVersion: 'v6.2',
    detail: '设计新的工作流模板：定义有哪些阶段、每个阶段用什么工具、怎么处理错误。生成标准SKILL.md文件',
    usage: '想创建团队标准工作流程、把最佳实践固化下来'
  },
  { cmd: '/workflow-tdd', desc: 'TDD 工作流技能 - Red-Green-Refactor', status: 'stable', category: 'skill', cli: ['claude'], addedInVersion: 'v6.0',
    detail: '测试驱动开发流程：①Red-先写失败的测试；②Green-写最少代码让测试通过；③Refactor-优化代码。循环直到完成',
    usage: '想用专业方式开发、确保代码可测试、追求高质量代码'
  },
  { cmd: '/workflow-test-fix', desc: '测试修复技能 - 生成+执行+修复', status: 'stable', category: 'skill', cli: ['claude'], addedInVersion: 'v6.0',
    detail: '自动化测试循环：①自动生成测试用例；②执行测试;③发现失败自动修复;④再测试。直到全部通过',
    usage: '功能写完了需要补测试、测试失败想自动修复'
  },
  { cmd: '/workflow-wave-plan', desc: 'CSV Wave 规划执行 - 分批探索和执行', status: 'new', category: 'skill', cli: ['claude'], addedInVersion: 'v6.4',
    detail: 'CSV Wave流程：①分解需求生成 explore.csv；②波浪式探索代码；③综合发现生成 tasks.csv；④波浪式执行任务。支持上下文传播',
    usage: '需要批量探索和执行任务，保持上下文连贯'
  },
  { cmd: '/workflow-tdd-plan', desc: 'TDD 规划技能 - 6阶段规划+Red-Green-Refactor任务链', status: 'stable', category: 'tdd', cli: ['claude', 'codex'], addedInVersion: 'v7.0.8',
    detail: '统一 TDD 工作流：6阶段 TDD 规划 + Red-Green-Refactor 任务链生成 + 4阶段验证。触发词：workflow-tdd-plan、workflow-tdd-verify',
    usage: 'TDD 开发前规划测试用例，生成完整的 Red→Green→Refactor 执行任务链'
  },

  // 新增工作流工具
  { cmd: '/wf-composer', desc: '工作流模板设计器 - 自然语言生成可复用 JSON 模板', status: 'new', category: 'skill', cli: ['claude'], addedInVersion: 'v7.2.20',
    detail: '语义工作流设计：解析自然语言 → 分解为节点 → 映射执行器（skill/cli/agent）→ 自动注入检查点 → 确认并保存为 workflow-template.json',
    usage: '想把常用的工作流程固化成可复用的模板'
  },
  { cmd: '/wf-player', desc: '工作流模板执行器 - 加载模板并按 DAG 顺序执行', status: 'new', category: 'skill', cli: ['claude'], addedInVersion: 'v7.2.20',
    detail: '模板执行引擎：加载 JSON 模板 → 绑定变量 → DAG 拓扑排序 → 执行节点（支持 checkpoint 暂停恢复）→ 完成归档',
    usage: '有准备好的工作流模板需要执行'
  },
  { cmd: '/workflow-lite-test-review', desc: '轻量测试审查 - lite-execute 后的收敛验证+测试', status: 'new', category: 'skill', cli: ['claude'], addedInVersion: 'v7.2.20',
    detail: '后执行审查流水线：收敛验证（对照计划检查实现）→ 运行测试 → 生成检查清单 → 自动修复失败（最多3轮）→ 报告输出',
    usage: 'lite-execute 完成后进行测试验证和收敛检查'
  },
  { cmd: '/workflow-tune', desc: '工作流调优 - 测试命令执行效果并生成优化建议', status: 'new', category: 'skill', cli: ['claude'], addedInVersion: 'v7.2.20',
    detail: '命令效果测试：解析命令链 → 生成测试任务 → 逐步执行（claude）→ 质量分析（gemini）→ 综合评估 → 优化建议报告',
    usage: '想测试命令/技能的执行效果并获取优化建议'
  },

  // ==================== Codex 预检清单 (Prompts) ====================

  // ==================== Codex 技能 (Skills) ====================
  // 规划类
  { cmd: '/roadmap-with-file', desc: '路线图规划 - Codex 版', status: 'new', category: 'skill', cli: ['codex'], addedInVersion: 'v6.4',
    detail: '交互式路线图：与AI讨论需求，生成项目路线图和里程碑规划',
    usage: '需要规划项目路线图'
  },

  // 分析/头脑风暴类
  { cmd: '/analyze-with-file', desc: '交互式协作分析 - CLI探索+多视角+文档化', status: 'stable', category: 'skill', cli: ['codex'], addedInVersion: 'v6.0',
    detail: '4阶段分析流程：①主题理解→②CLI探索(cli-explore-agent)+外部研究(workflow-research-agent)→③交互讨论(Intent Drift检测)→④综合结论(Findings Coverage Matrix)。支持多视角并行(Technical/Architectural/Business/Domain最多4个)、决策记录协议、产出discussion.md+conclusions.json',
    usage: '需要深入分析代码库、理解复杂架构、研究技术方案、多角度评估决策'
  },
  { cmd: '/brainstorm-with-file', desc: '交互式头脑风暴 - 多CLI协作+发散收敛循环', status: 'stable', category: 'skill', cli: ['codex'], addedInVersion: 'v6.0',
    detail: '多CLI协作头脑风暴：Gemini/Codex/Claude多视角分析，发散-收敛循环(Diverge-Converge)，记录想法演变全过程。支持创意模式和结构化模式',
    usage: '功能设计、架构方案需要多角度创意思考'
  },

  // 执行类
  { cmd: '/parallel-dev-cycle', desc: '多Agent并行开发循环 (RA→EP→CD→VAS)', status: 'stable', category: 'skill', cli: ['codex'], addedInVersion: 'v6.2',
    detail: '4个AI同时工作：需求分析师(RA)理解需求→探索规划师(EP)设计方案→代码开发(CD)写代码→验证归档(VAS)测试。可并行推进',
    usage: '大型功能开发，想同时推进需求分析、设计、开发、测试'
  },

  // Issue管理类
  { cmd: '/issue-discover', desc: 'Issue发现和创建 - 手动/多视角/prompt驱动', status: 'stable', category: 'skill', cli: ['codex'], addedInVersion: 'v6.0',
    detail: '3种发现模式：①手动创建问题；②8维度自动扫描(bug/安全/性能/UX/测试/质量/维护性/最佳实践)；③根据你的描述迭代探索',
    usage: '想主动发现项目中的隐藏问题'
  },

  // 测试类
  { cmd: '/workflow-test-fix-cycle', desc: '端到端测试修复循环 - 直到通过率≥95%', status: 'stable', category: 'skill', cli: ['codex'], addedInVersion: 'v6.2',
    detail: '自动测试循环：①生成4层测试(单元/集成/E2E/回归)；②执行测试；③失败自动修复；④循环直到95%通过',
    usage: '代码写完了需要补测试，希望测试失败能自动修复'
  },

  // 审查类
  // 调试类
  { cmd: '/debug-with-file', desc: '假设驱动调试 - 文档化探索+理解演变', status: 'stable', category: 'skill', cli: ['codex'], addedInVersion: 'v6.0',
    detail: '证据驱动调试流程：Explore→Document→Log→Analyze→Correct→Fix→Verify。记录理解演变(understanding.md)，Gemini辅助纠正误解，保留学习成果',
    usage: '遇到难定位的bug，需要系统化地分析和排查'
  },

  // 工具类
  { cmd: '/ccw-cli-tools', desc: 'CLI工具统一执行框架', status: 'stable', category: 'skill', cli: ['codex'], addedInVersion: 'v6.2',
    detail: '统一调用外部AI：配置好Gemini/Qwen/Codex等工具，用一个模板调用不同AI，自动选择最合适的工具',
    usage: '想使用外部AI工具(Gemini/Qwen等)进行代码分析或生成'
  },
  { cmd: '/memory-compact', desc: '会话内存压缩为结构化文本', status: 'stable', category: 'skill', cli: ['codex'], addedInVersion: 'v5.2',
    detail: '压缩会话内容：提取目标、计划、关键文件、重要决策，去掉冗余对话。方便下次恢复上下文',
    usage: '对话太长了想压缩保存，或者要切换话题但想保留关键信息'
  },
  { cmd: '/clean', desc: '智能代码清理 - 检测过时产物', status: 'stable', category: 'skill', cli: ['codex'], addedInVersion: 'v5.2',
    detail: '自动扫描清理：废弃的工作流会话、临时文件、死代码、过时的依赖。让项目保持整洁',
    usage: '项目做久了文件变多，想清理不需要的东西'
  },
  { cmd: '/csv-wave-pipeline', desc: 'CSV 波浪流水线 - 批量任务执行', status: 'new', category: 'skill', cli: ['codex'], addedInVersion: 'v6.4',
    detail: 'CSV驱动批量执行：读取 tasks.csv，分波次执行任务，支持进度保存和断点续传',
    usage: '有任务清单(CSV格式)需要批量执行'
  },
  { cmd: '/project-documentation-workflow', desc: '波式项目文档生成器 - 动态任务分解', status: 'new', category: 'skill', cli: ['codex'], addedInVersion: 'v7.2.2',
    detail: '文档生成流水线：分析项目结构 → 动态生成文档任务 → 拓扑排序计算执行波次 → 波次间综合 → 生成完整文档套件（架构、方法、理论、功能、用法、设计哲学）',
    usage: '需要为项目生成完整的文档套件'
  },
  { cmd: '/session-sync', desc: '快速同步会话 - specs/*.md + project-tech.json', status: 'new', category: 'skill', cli: ['codex'], addedInVersion: 'v7.2.2',
    detail: '一次性同步：扫描 git diff → 提取规范更新 → 写入 specs/*.md 和 project-tech.json。无交互向导',
    usage: '需要快速同步会话工作到规范文件'
  },
  { cmd: '/spec-add', desc: '添加规范 - Codex 版', status: 'new', category: 'skill', cli: ['codex'], addedInVersion: 'v7.2.2',
    detail: 'Codex 版规范添加：支持交互式向导和直接命令模式。添加 convention、constraint 或 learning',
    usage: 'Codex 环境下添加规范'
  },
  { cmd: '/spec-setup', desc: '初始化规格 - Codex 版', status: 'new', category: 'skill', cli: ['codex'], addedInVersion: 'v7.2.2',
    detail: 'Codex 版规格初始化：cli-explore-agent 分析 + 交互式问卷配置规范',
    usage: 'Codex 环境下初始化项目规格'
  },

  // ==================== v7.2.28 新增 ====================
  { cmd: '/investigate', desc: '系统化调试 - 铁律方法论，无确认根因不修复', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v7.2.28',
    detail: '5阶段调查：收集证据→模式分析→假设测试(最多3次)→最小修复→验证报告。强制铁律：没有确认的根因禁止修复',
    usage: '遇到需要系统化排查的复杂bug'
  },
  { cmd: '/security-audit', desc: '安全审计 - OWASP Top 10 + STRIDE 威胁建模', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v7.2.28',
    detail: '4阶段审计：供应链扫描→OWASP Top 10代码分析→STRIDE威胁建模→趋势追踪报告。产出结构化JSON报告',
    usage: '需要对代码进行安全审计和威胁评估'
  },
  { cmd: '/ship', desc: '发布流水线 - 预检→审查→版本→更新日志→PR', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v7.2.28',
    detail: '5阶段门控流水线：预检检查(git/分支/测试/构建)→AI代码审查→版本号更新→更新日志生成→PR创建。每个阶段必须通过才能进入下一阶段',
    usage: '代码开发完成，准备发布上线'
  },
  { cmd: '/team-interactive-craft', desc: '交互组件团队 - 零依赖交互组件研发', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v7.2.28',
    detail: '4角色流水线：研究员→交互设计师→构建者→无障碍测试。Vanilla JS + CSS，零依赖。team-worker agent架构',
    usage: '需要构建纯原生交互组件，不依赖框架'
  },
  { cmd: '/team-motion-design', desc: '动效设计团队 - 动画token系统与GPU加速', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v7.2.28',
    detail: '4角色流水线：动效研究员→编舞师→动画师→性能测试。动画token系统、滚动编排、GPU加速、降级回退',
    usage: '需要设计系统化的动画和交互效果'
  },
  { cmd: '/team-ui-polish', desc: 'UI精修团队 - 自动发现并修复UI设计问题', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v7.2.28',
    detail: '4角色流水线：扫描器→诊断师→优化器→验证器。反AI痕迹检测、色彩/排版/间距质量、交互状态、视觉层次',
    usage: 'UI需要精修打磨，提升设计品质'
  },
  { cmd: '/team-visual-a11y', desc: '视觉无障碍团队 - OKLCH色彩+WCAG审计+修复', status: 'new', category: 'skill', cli: ['claude', 'codex'], addedInVersion: 'v7.2.28',
    detail: '6角色流水线：色彩审计(color-auditor, OKLCH感知对比)→排版审计(typo-auditor)→焦点审计(focus-auditor)→修复规划师(remediation-planner)→修复实施者(fix-implementer)。WCAG AA/AAA合规',
    usage: '需要对视觉无障碍进行专业审计'
  },

];

// ============================================
// 统计数据
// ============================================
export const STATS = {
  totalCommands: COMMANDS.length,
  categories: Object.keys(CATEGORIES).length,
  claudeCommands: COMMANDS.filter(c => c.cli.includes('claude')).length,
  codexCommands: COMMANDS.filter(c => c.cli.includes('codex')).length,
  newCommands: COMMANDS.filter(c => c.status === 'new').length,
  recommendedCommands: COMMANDS.filter(c => c.status === 'recommended').length,
  latestVersion: 'v7.3',  // 当前最新版本
};
