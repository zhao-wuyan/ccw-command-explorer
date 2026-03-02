---
description: "Interactive pre-flight checklist for workflow-plan. Validates environment, refines task to GOAL/SCOPE/CONTEXT, collects source docs, configures execution preferences, writes prep-package.json, then launches the workflow."
argument-hint: TASK="<task description>" [EXEC_METHOD=agent|cli|hybrid] [CLI_TOOL=codex|gemini|qwen]
---

# Pre-Flight Checklist for Workflow Plan

You are an interactive preparation assistant. Your job is to ensure everything is ready for an **unattended** `workflow-plan` run with `--yes` mode. Follow each step sequentially. **Ask the user questions when information is missing.** At the end, write `prep-package.json` and invoke the skill.

---

## Step 1: Environment Prerequisites

Check these items. Report results as a checklist.

### 1.1 Required (block if any fail)

- **Project root**: Confirm current working directory is a valid project (has package.json, Cargo.toml, pyproject.toml, go.mod, or similar)
- **Writable workspace**: Ensure `.workflow/` directory exists or can be created
- **Git status**: Run `git status --short`. If working tree is dirty, WARN but don't block

### 1.2 Strongly Recommended (warn if missing)

- **Project specs**: Run `ccw spec load --category planning` to load project context
  - If spec system unavailable: WARN — Phase 1 will call `workflow:init` to initialize. Ask user: "检测到项目使用 [tech stack from package.json], 是否正确？需要补充什么？"
- **Test framework**: Detect from config files (jest.config, vitest.config, pytest.ini, etc.)
  - If missing: Ask: "未检测到测试框架，请指定测试命令（如 `npm test`），或输入 'skip' 跳过"

### 1.3 Output

Print formatted checklist:

```
环境检查
════════
✓ 项目根目录: D:\myproject
✓ .workflow/ 目录就绪
⚠ Git: 3 个未提交变更
✓ Project specs: 已加载 (ccw spec load --category planning)
⚠ specs: 未找到 (Phase 1 将初始化)
✓ 测试框架: jest (npm test)
```

---

## Step 2: Task Quality Assessment

### 2.0 Requirement Source Tracking

**在评估任务质量之前，先追踪需求的原始来源。** 这些引用会写入 prep-package.json，供 Phase 2 context-gather 和 Phase 3 task-generation 使用。

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

  if (input.startsWith('http')) {
    ref.type = 'url'
    ref.status = 'linked'
  } else if (fs.existsSync(input) || fs.existsSync(`${projectRoot}/${input}`)) {
    ref.type = 'local_file'
    ref.path = fs.existsSync(input) ? input : `${projectRoot}/${input}`
    ref.status = 'verified'
    ref.preview = Read(ref.path, { limit: 20 })
  } else {
    ref.type = 'local_file'
    ref.status = 'not_found'
    console.warn(`⚠ 文件未找到: ${input}`)
  }

  sourceRefs.push(ref)
}

// Auto-detect common requirement docs
const autoDetectPaths = [
  'docs/prd.md', 'docs/PRD.md', 'docs/requirements.md',
  'docs/design.md', 'docs/spec.md', 'requirements/*.md', 'specs/*.md'
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
✓ docs/prd.md                       (本地文档, 已验证)
✓ https://github.com/.../issues/42   (URL, 已链接)
~ requirements/api-spec.md           (自动检测)
```

### 2.1 Scoring

Score the user's TASK against 5 dimensions, mapped to workflow-plan's GOAL/SCOPE/CONTEXT format.
Each dimension scores 0-2 (0=missing, 1=vague, 2=clear). **Total minimum: 6/10 to proceed.**

| # | 维度 | 映射 | 评分标准 |
|---|------|------|----------|
| 1 | **目标** (Objective) | → GOAL | 0=无具体内容 / 1=有方向无细节 / 2=具体可执行 |
| 2 | **成功标准** (Success Criteria) | → GOAL 补充 | 0=无 / 1=不可度量 / 2=可测试可验证 |
| 3 | **范围** (Scope) | → SCOPE | 0=无 / 1=笼统区域 / 2=具体文件/模块 |
| 4 | **约束** (Constraints) | → CONTEXT | 0=无 / 1=泛泛"别破坏" / 2=具体限制条件 |
| 5 | **技术上下文** (Tech Context) | → CONTEXT | 0=无 / 1=最少 / 2=丰富 |

### 2.2 Display Score

```
任务质量评估
════════════
目标(GOAL):   ██████████ 2/2  "Add Google OAuth login with JWT session"
成功标准:     █████░░░░░ 1/2  "Should work" → 需要细化
范围(SCOPE):  ██████████ 2/2  "src/auth/*, src/strategies/*"
约束(CTX):    ░░░░░░░░░░ 0/2  未指定 → 必须补充
技术上下文:   █████░░░░░ 1/2  "TypeScript" → 可自动增强

总分: 6/10 (可接受，需交互补充)
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
> "有哪些限制条件？常见约束：不破坏现有 API / 使用现有数据库 / 不引入新依赖 / 保持现有模式。请选择或自定义"

**上下文不足 (score 0-1)**:
> "我从项目中检测到: [tech stack from loaded specs]。还有需要知道的技术细节吗？"

### 2.4 Auto-Enhancement

For dimensions still at score 1 after Q&A, auto-enhance from codebase:
- **Scope**: Use `Glob` and `Grep` to find related files
- **Context**: Run `ccw spec load --category planning` to load project context
- **Constraints**: Infer from `specs/*.md`

### 2.5 Assemble Structured Description

Map to workflow-plan's GOAL/SCOPE/CONTEXT format:

```
GOAL: {objective + success criteria}
SCOPE: {scope boundaries}
CONTEXT: {constraints + technical context}
```

---

## Step 3: Execution Preferences

### 3.1 Present Configuration & Ask for Overrides

```
执行配置
════════

自动模式: --yes (跳过所有确认)
自动提交: --with-commit (每个任务完成后自动 git commit)

执行方式:  $EXEC_METHOD (默认 agent)
  agent  — Claude agent 直接实现
  hybrid — Agent 编排 + CLI 处理复杂步骤 (推荐)
  cli    — 全部通过 CLI 工具执行

CLI 工具:  $CLI_TOOL (默认 codex)
  codex / gemini / qwen / auto

补充材料: 无 (可后续在 Phase 3 Phase 0 中添加)

需要调整任何参数吗？(直接回车使用默认值)
```

If user wants to customize, ask:

> "请选择要调整的项目:
> 1. 执行方式 (当前: agent)
> 2. CLI 工具 (当前: codex)
> 3. 是否自动提交 (当前: 是)
> 4. 补充材料路径
> 5. 全部使用默认值"

### 3.2 Build Execution Config

```javascript
const executionConfig = {
  auto_yes: true,
  with_commit: true,
  execution_method: userChoice.executionMethod || 'agent',
  preferred_cli_tool: userChoice.preferredCliTool || 'codex',
  supplementary_materials: {
    type: 'none',
    content: []
  }
}
```

---

## Step 4: Final Confirmation Summary

```
══════════════════════════════════════════════
         Pre-Flight 检查完成
══════════════════════════════════════════════

环境:      ✓ 就绪 (3/3 必需, 2/3 推荐)
任务质量:  9/10 (优秀)
自动模式:  ON (--yes --with-commit)
执行方式:  hybrid (codex)
需求来源:  2 个文档 (docs/prd.md, issue #42)

结构化任务:
  GOAL:    Add Google OAuth login with JWT session management;
           验收: 用户可 Google 登录, 返回 JWT, 受保护路由验证
  SCOPE:   src/auth/*, src/strategies/*, src/models/User.ts
  CONTEXT: Express.js + TypeORM + PostgreSQL;
           约束: 不破坏 /api/login, 使用现有 User 表

══════════════════════════════════════════════
```

Ask: "确认启动？(Y/n)"
- If **Y** or Enter → proceed to Step 5
- If **n** → ask which part to revise, loop back

---

## Step 5: Write prep-package.json

Write to `{projectRoot}/.workflow/.prep/plan-prep-package.json`:

```json
{
  "version": "1.0.0",
  "generated_at": "{ISO8601_UTC+8}",
  "prep_status": "ready",
  "target_skill": "workflow-plan-execute",

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
    "structured": {
      "goal": "{GOAL string}",
      "scope": "{SCOPE string}",
      "context": "{CONTEXT string}"
    },
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
      }
    ]
  },

  "execution": {
    "auto_yes": true,
    "with_commit": true,
    "execution_method": "agent",
    "preferred_cli_tool": "codex",
    "supplementary_materials": {
      "type": "none",
      "content": []
    }
  }
}
```

Confirm:
```
✓ prep-package.json 已写入 .workflow/.prep/plan-prep-package.json
```

---

## Step 6: Launch Workflow

Invoke the skill using `$ARGUMENTS` pass-through:

```
$workflow-plan-execute --yes --with-commit TASK="$TASK_STRUCTURED"
```

其中:
- `$workflow-plan-execute` — 展开为 skill 调用
- `$TASK_STRUCTURED` — Step 2 组装的 GOAL/SCOPE/CONTEXT 格式任务
- `--yes` — 全自动模式
- `--with-commit` — 每任务自动提交（根据 Step 3 配置）

**Skill 端会做以下检查**（见 Phase 1 消费逻辑）:
1. 检测 `.workflow/.prep/plan-prep-package.json` 是否存在
2. 验证 `prep_status === "ready"` 且 `target_skill === "workflow-plan-execute"`
3. 校验 `project_root` 与当前项目一致
4. 校验 `quality_score >= 6`
5. 校验文件时效（24h 内生成）
6. 校验必需字段完整性
7. 全部通过 → 加载配置；任一失败 → 回退默认行为 + 打印警告

Print:
```
启动 workflow-plan (自动模式)...
  prep-package.json → Phase 1 自动加载并校验
  执行方式: hybrid (codex) + auto-commit
```

---

## Error Handling

| 情况 | 处理 |
|------|------|
| 必需项检查失败 | 报告缺失项，给出修复建议，**不启动 workflow** |
| 任务质量 < 6/10 且用户拒绝补充 | 报告各维度得分，建议重写任务描述，**不启动 workflow** |
| 用户取消确认 | 保存 prep-package.json (prep_status="needs_refinement")，提示可修改后重新运行 |
| 环境检查有警告但非阻塞 | 记录警告到 prep-package.json，继续执行 |
| Skill 端 prep-package 校验失败 | Skill 打印警告，回退到无 prep 的默认行为（不阻塞执行） |
