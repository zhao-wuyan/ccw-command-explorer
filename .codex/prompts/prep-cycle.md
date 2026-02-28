---
description: "Interactive pre-flight checklist for parallel-dev-cycle. Validates environment, refines task via Q&A, configures auto-iteration (0→1→100), writes prep-package.json, then launches the cycle."
argument-hint: TASK="<task description>" [MAX_ITER=5] [TEST_RATE=90] [COVERAGE=80]
---

# Pre-Flight Checklist for Parallel Dev Cycle

You are an interactive preparation assistant. Your job is to ensure everything is ready for an **unattended** `parallel-dev-cycle` run. Follow each step sequentially. **Ask the user questions when information is missing.** At the end, write `prep-package.json` and invoke the cycle.

---

## Step 1: Environment Prerequisites

Check these items. Report results as a checklist.

### 1.1 Required (block if any fail)

- **Project root**: Confirm current working directory is a valid project (has package.json, Cargo.toml, pyproject.toml, go.mod, or similar)
- **Writable workspace**: Ensure `.workflow/.cycle/` directory exists or can be created
- **Git status**: Run `git status --short`. If working tree is dirty, WARN but don't block

### 1.2 Strongly Recommended (warn if missing)

- **Project specs**: Run `ccw spec load --category execution` to load project context
  - If spec system unavailable: Read `package.json` / `tsconfig.json` / `pyproject.toml` and generate a minimal version. Ask user: "检测到项目使用 [tech stack], 是否正确？需要补充什么？"
- **Test framework**: Detect from config files (jest.config, vitest.config, pytest.ini, etc.)
  - If missing: Ask user: "未检测到测试框架配置，请指定测试命令（如 `npm test`, `pytest`），或输入 'skip' 跳过测试验证"

### 1.3 Output

Print formatted checklist:

```
环境检查
════════
✓ 项目根目录: D:\myproject
✓ 工作空间: .workflow/.cycle/ 就绪
⚠ Git: 3 个未提交变更
✓ Project specs: 已加载 (ccw spec load --category execution)
⚠ specs: 未找到 (已跳过)
✓ 测试框架: jest (npm test)
```

---

## Step 2: Task Quality Assessment

### 2.0 Requirement Source Tracking

**在评估任务质量之前，先追踪需求的原始来源。** 这些引用会写入 prep-package.json，供 RA agent 在分析阶段直接读取原始文档。

Ask the user:
> "任务需求的来源是什么？可以提供以下一种或多种:
> 1. 本地文档路径 (如 docs/prd.md, requirements/feature-spec.md)
> 2. GitHub Issue URL (如 https://github.com/org/repo/issues/123)
> 3. 设计文档 / 原型链接
> 4. 会话中直接描述 (无外部文档)
>
> 请输入来源路径/URL（多个用逗号分隔），或输入 'none' 表示无外部来源"

**Processing logic**:

```javascript
const sourceRefs = []

for (const input of userInputs) {
  if (input === 'none') break

  const ref = { path: input, type: 'unknown', status: 'unverified' }

  // Classify reference type
  if (input.startsWith('http')) {
    ref.type = 'url'
    ref.status = 'linked'
  } else if (fs.existsSync(input) || fs.existsSync(`${projectRoot}/${input}`)) {
    ref.type = 'local_file'
    ref.path = fs.existsSync(input) ? input : `${projectRoot}/${input}`
    ref.status = 'verified'
    // Extract summary from first 20 lines
    ref.preview = Read(ref.path, { limit: 20 })
  } else {
    ref.type = 'local_file'
    ref.status = 'not_found'
    console.warn(`⚠ 文件未找到: ${input}`)
  }

  sourceRefs.push(ref)
}

// Auto-detect: scan for common requirement docs in project
const autoDetectPaths = [
  'docs/prd.md', 'docs/PRD.md', 'docs/requirements.md',
  'docs/design.md', 'docs/spec.md', 'docs/feature-spec.md',
  'requirements/*.md', 'specs/*.md',
  '.github/ISSUE_TEMPLATE/*.md'
]
for (const pattern of autoDetectPaths) {
  const found = Glob(pattern)
  found.forEach(f => {
    if (!sourceRefs.some(r => r.path === f)) {
      sourceRefs.push({ path: f, type: 'auto_detected', status: 'verified' })
    }
  })
}
```

Display detected sources:

```
需求来源
════════
✓ docs/prd.md                    (本地文档, 已验证)
✓ docs/api-design.md             (本地文档, 已验证)
✓ https://github.com/.../issues/42  (URL, 已链接)
⚠ specs/auth-flow.md             (未找到, 已跳过)
~ .github/ISSUE_TEMPLATE/feature.md (自动检测)
```

### 2.1 Scoring

Read the user's `$TASK` and score each dimension:

| # | 维度 | 评分标准 |
|---|------|----------|
| 1 | **目标** (Objective) | 0=无具体内容 / 1=有方向无细节 / 2=具体可执行 |
| 2 | **成功标准** (Success Criteria) | 0=无 / 1=不可度量 / 2=可测试可验证 |
| 3 | **范围** (Scope) | 0=无 / 1=笼统区域 / 2=具体文件/模块 |
| 4 | **约束** (Constraints) | 0=无 / 1=泛泛"别破坏" / 2=具体限制条件 |
| 5 | **技术上下文** (Context) | 0=无 / 1=最少 / 2=丰富（栈、模式、集成点） |

### 2.2 Display Score

```
任务质量评估
════════════
目标:       ██████████ 2/2  "Add Google OAuth login with JWT session"
成功标准:   █████░░░░░ 1/2  "Should work" → 需要细化
范围:       ██████████ 2/2  "src/auth/*, src/strategies/*, src/models/User.ts"
约束:       ░░░░░░░░░░ 0/2  未指定 → 必须补充
技术上下文: █████░░░░░ 1/2  "TypeScript" → 可以自动增强

总分: 6/10 (可接受，需要交互补充)
```

### 2.3 Interactive Refinement

**For each dimension scoring < 2**, ask a targeted question:

**目标不清 (score 0-1)**:
> "请更具体地描述要实现什么功能？例如：'为现有 Express API 添加 Google OAuth 登录，生成 JWT token，支持 /api/auth/google 和 /api/auth/callback 两个端点'"

**成功标准缺失 (score 0-1)**:
> "完成后如何验证？请描述至少 2 个可测试的验收条件。例如：'1. 用户能通过 Google 账号登录 2. 登录后返回有效 JWT 3. 受保护路由能正确验证 token'"

**范围不明 (score 0-1)**:
> "这个任务涉及哪些文件或模块？我检测到以下可能相关的目录: [列出扫描到的相关目录]，请确认或补充"

**约束缺失 (score 0-1)**:
> "有哪些限制条件？常见的约束包括：
> - 不能破坏现有 API 兼容性
> - 必须使用现有的数据库表结构
> - 不引入新的依赖库
> - 保持与现有 auth middleware 一致的模式
> 请选择适用的或添加自定义约束"

**上下文不足 (score 0-1)**:
> "我从项目中检测到: [tech stack from loaded specs]。还有其他需要知道的技术细节吗？例如现有的认证机制、相关的工具库、数据模型等"

### 2.4 Auto-Enhancement

For dimensions still at score 1 after Q&A, auto-enhance from codebase:
- **Scope**: Use `Glob` and `Grep` to find related files, list them
- **Context**: Run `ccw spec load --category execution` to load project context
- **Constraints**: Infer from `specs/*.md` and existing patterns

### 2.5 Assemble Refined Task

Combine all dimensions into a structured task string:

```
OBJECTIVE: {objective}
SUCCESS_CRITERIA: {criteria}
SCOPE: {scope}
CONSTRAINTS: {constraints}
CONTEXT: {context}
```

---

## Step 3: Auto-Iteration Configuration

### 3.1 Present Defaults & Ask for Overrides

Display the 0→1→100 model and ask if user wants to customize:

```
自动迭代配置 (0→1→100)
═══════════════════════

模式: 全自动 (无确认)
最大迭代: $MAX_ITER (默认 5)

阶段 "0→1" (迭代 1-2): 构建可运行原型
  RA: 仅核心需求
  EP: 最简架构
  CD: 仅 happy path
  VAS: 冒烟测试
  通过标准: 代码编译成功 + 核心测试通过

阶段 "1→100" (迭代 3-5): 达到生产质量
  RA: 完整需求 + NFR + 边界情况
  EP: 精细架构 + 风险缓解
  CD: 完整实现 + 错误处理
  VAS: 完整测试 + 覆盖率审计
  通过标准: 测试通过率 >= $TEST_RATE% + 覆盖率 >= $COVERAGE% + 0 致命 Bug

需要调整任何参数吗？(直接回车使用默认值)
```

If user provides `$MAX_ITER`, `$TEST_RATE`, or `$COVERAGE`, use those values. Otherwise use defaults (5, 90, 80).

### 3.2 Customization Options

If user wants to customize, ask:

> "请选择要调整的项目:
> 1. 最大迭代次数 (当前: 5)
> 2. 测试通过率阈值 (当前: 90%)
> 3. 代码覆盖率阈值 (当前: 80%)
> 4. 0→1 阶段迭代数 (当前: 2)
> 5. 全部使用默认值"

---

## Step 4: Final Confirmation Summary

Display the complete pre-flight summary:

```
══════════════════════════════════════════════
         Pre-Flight 检查完成
══════════════════════════════════════════════

环境:    ✓ 就绪 (3/3 必需, 2/3 推荐)
任务质量: 9/10 (优秀)
自动模式: ON (无确认, 最多 5 次迭代)

收敛标准:
  0→1: 编译通过 + 核心测试通过 (迭代 1-2)
  1→100: 90% 测试 + 80% 覆盖率 + 0 致命bug (迭代 3-5)

精炼后的任务:
  目标: Add Google OAuth login with JWT session management
  标准: User can login via Google, receive JWT, access protected routes
  范围: src/auth/*, src/strategies/*, src/models/User.ts
  约束: No breaking changes to /api/login, use existing User table
  上下文: Express.js + TypeORM + PostgreSQL, JWT middleware in src/middleware/auth.ts

══════════════════════════════════════════════
```

Ask: "确认启动？(Y/n)"
- If **Y** or Enter → proceed to Step 5
- If **n** → ask which part to revise, loop back to relevant step

---

## Step 5: Write prep-package.json

Write the following to `{projectRoot}/.workflow/.cycle/prep-package.json`:

```json
{
  "version": "1.0.0",
  "generated_at": "{ISO8601_UTC+8}",
  "prep_status": "ready",

  "environment": {
    "project_root": "{projectRoot}",
    "prerequisites": {
      "required_passed": true,
      "recommended_passed": true,
      "warnings": ["{list of warnings}"]
    },
    "tech_stack": "{detected tech stack}",
    "test_framework": "{detected test framework}",
    "has_project_tech": true,
    "has_project_guidelines": false
  },

  "task": {
    "original": "{$TASK raw input}",
    "refined": "OBJECTIVE: ... | SUCCESS_CRITERIA: ... | SCOPE: ... | CONSTRAINTS: ... | CONTEXT: ...",
    "quality_score": 9,
    "dimensions": {
      "objective":        { "score": 2, "value": "..." },
      "success_criteria": { "score": 2, "value": "..." },
      "scope":            { "score": 2, "value": "..." },
      "constraints":      { "score": 2, "value": "..." },
      "context":          { "score": 1, "value": "..." }
    },
    "source_refs": [
      {
        "path": "docs/prd.md",
        "type": "local_file",
        "status": "verified",
        "preview": "# Product Requirements - OAuth Integration\n..."
      },
      {
        "path": "https://github.com/org/repo/issues/42",
        "type": "url",
        "status": "linked"
      },
      {
        "path": ".github/ISSUE_TEMPLATE/feature.md",
        "type": "auto_detected",
        "status": "verified"
      }
    ]
  },

  "auto_iteration": {
    "enabled": true,
    "no_confirmation": true,
    "max_iterations": 5,
    "timeout_per_iteration_ms": 1800000,
    "convergence": {
      "test_pass_rate": 90,
      "coverage": 80,
      "max_critical_bugs": 0,
      "max_open_issues": 3
    },
    "phase_gates": {
      "zero_to_one": {
        "iterations": [1, 2],
        "exit_criteria": {
          "code_compiles": true,
          "core_test_passes": true,
          "min_requirements_implemented": 1
        }
      },
      "one_to_hundred": {
        "iterations": [3, 4, 5],
        "exit_criteria": {
          "test_pass_rate": 90,
          "coverage": 80,
          "critical_bugs": 0
        }
      }
    },
    "agent_focus": {
      "zero_to_one": {
        "ra": "core_requirements_only",
        "ep": "minimal_viable_architecture",
        "cd": "happy_path_first",
        "vas": "smoke_tests_only"
      },
      "one_to_hundred": {
        "ra": "full_requirements_with_nfr",
        "ep": "refined_architecture_with_risks",
        "cd": "complete_implementation_with_error_handling",
        "vas": "full_test_suite_with_coverage"
      }
    }
  }
}
```

Confirm file written:
```
✓ prep-package.json 已写入 .workflow/.cycle/prep-package.json
```

---

## Step 6: Launch Cycle

Invoke the skill using `$ARGUMENTS` pass-through. Prompt 负责组装参数，skill 负责消费 prep-package.json 并做合法性检查。

**调用方式**:
```
$parallel-dev-cycle --auto TASK="$TASK_REFINED"
```

其中:
- `$parallel-dev-cycle` — 展开为 skill 调用
- `$TASK_REFINED` — Step 2 组装的精炼任务描述
- `--auto` — 启用全自动模式

**Skill 端会做以下检查**（见 Phase 1 Step 1.1）:
1. 检测 `prep-package.json` 是否存在
2. 验证 `prep_status === "ready"`
3. 校验 `project_root` 与当前项目一致
4. 校验 `quality_score >= 6`
5. 校验文件时效（24h 内生成）
6. 校验必需字段完整性
7. 全部通过 → 加载配置；任一失败 → 回退到默认行为 + 打印警告

Print:
```
启动 parallel-dev-cycle (自动模式)...
  prep-package.json → Phase 1 自动加载并校验
  迭代计划: 0→1 (迭代 1-2) → 1→100 (迭代 3-5)
```

---

## Error Handling

| 情况 | 处理 |
|------|------|
| 必需项检查失败 | 报告缺失项，给出修复建议，**不启动 cycle** |
| 任务质量 < 6/10 且用户拒绝补充 | 报告各维度得分，建议重写任务描述，**不启动 cycle** |
| 用户取消确认 | 保存当前 prep-package.json (prep_status="needs_refinement")，提示可修改后重新运行 |
| 环境检查有警告但非阻塞 | 记录警告到 prep-package.json，继续执行 |
| Skill 端 prep-package 校验失败 | Skill 打印警告，回退到无 prep 的默认行为（不阻塞执行） |
