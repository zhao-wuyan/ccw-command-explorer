---
name: add
description: Add knowledge entries (bug fixes, code patterns, decisions, rules) to project specs interactively or automatically
argument-hint: "[-y|--yes] [--type <bug|pattern|decision|rule>] [--tag <tag>] [--dimension <specs|personal>] [--scope <global|project>] [--interactive] \"summary text\""
examples:
  - /workflow:spec:add "Use functional components for all React code"
  - /workflow:spec:add -y "No direct DB access from controllers" --type rule
  - /workflow:spec:add --type bug --tag api "API 返回 502 Bad Gateway"
  - /workflow:spec:add --type pattern --tag routing "添加新 API 路由标准流程"
  - /workflow:spec:add --type decision --tag db "选用 PostgreSQL 作为主数据库"
  - /workflow:spec:add --interactive
---

## Auto Mode

When `--yes` or `-y`: Auto-categorize and add entry without confirmation.

# Spec Add Command (/workflow:spec:add)

## Overview

Unified command for adding structured knowledge entries one at a time. Supports 4 knowledge types with optional extended fields for complex entries (bug debugging, code patterns, architecture decisions).

**Key Features**:
- 4 knowledge types: `bug`, `pattern`, `decision`, `rule`
- Unified entry format: `- [type:tag] summary (date)`
- Extended fields for complex types (bug/pattern/decision)
- Interactive wizard with type-specific field prompts
- Direct CLI mode with auto-detection
- Backward compatible: `[tag]` = `[rule:tag]` shorthand
- Auto-confirm mode (`-y`/`--yes`) for scripted usage

## Knowledge Type System

| Type | Purpose | Format | Target File |
|------|---------|--------|-------------|
| `bug` | Debugging experience (symptoms → cause → fix) | Extended | `learnings.md` |
| `pattern` | Reusable code patterns / reference implementations | Extended | `coding-conventions.md` |
| `decision` | Architecture / design decisions (ADR-lite) | Extended | `architecture-constraints.md` |
| `rule` | Hard constraints, conventions, general insights | Simple (single line) | By content (conventions / constraints) |

### Extended Fields Per Type

**bug** (core: 原因, 修复 | optional: 症状, 参考):
```markdown
- [bug:api] API 返回 502 Bad Gateway (2026-03-06)
    - 原因: 路由处理器未在 server.ts 路由分发中注册
    - 修复: 在路由分发逻辑中导入并调用 app.use(newRouter)
    - 参考: src/server.ts:45
```

**pattern** (core: 场景, 代码 | optional: 步骤):
```markdown
- [pattern:routing] 添加新 API 路由标准流程 (2026-03-06)
    - 场景: Express 应用新增业务接口
    - 步骤: 1.创建 routes/xxx.ts → 2.server.ts import → 3.app.use() 挂载
    - 代码:
        ```typescript
        if (pathname.startsWith('/api/xxx')) {
          if (await handleXxxRoutes(routeContext)) return;
        }
        ```
```

**decision** (core: 决策, 理由 | optional: 背景, 备选, 状态):
```markdown
- [decision:db] 选用 PostgreSQL 作为主数据库 (2026-03-01)
    - 决策: 使用 PostgreSQL 15
    - 理由: JSONB 支持完善，PostGIS 扩展成熟
    - 备选: MySQL(JSON弱) / SQLite(不适合并发)
    - 状态: accepted
```

**rule** (no extended fields):
```markdown
- [rule:security] 禁止在代码中硬编码密钥或密码
```

### Entry Format Specification

```
Entry Line:  - [type:tag] 摘要描述 (YYYY-MM-DD)
Extended:        - key: value
Code Block:          ```lang
                     code here
                     ```
```

- **`type`**: Required. One of `bug`, `pattern`, `decision`, `rule`
- **`tag`**: Required. Domain tag (api, routing, schema, react, security, etc.)
- **`(date)`**: Required for bug/pattern/decision. Optional for rule.
- **Backward compat**: `- [tag] text` = `- [rule:tag] text`

### Parsing Regex

```javascript
// Entry line extraction
/^- \[(\w+):([\w-]+)\] (.*?)(?: \((\d{4}-\d{2}-\d{2})\))?$/

// Extended field extraction (per indented line)
/^\s{4}-\s([\w-]+):\s?(.*)/
```

## Use Cases

1. **Bug Fix**: Capture debugging experience immediately after fixing a bug
2. **Code Pattern**: Record reusable coding patterns discovered during implementation
3. **Architecture Decision**: Document important technical decisions with rationale
4. **Rule/Convention**: Add team conventions or hard constraints
5. **Interactive**: Guided wizard with type-specific field prompts

## Usage
```bash
/workflow:spec:add                                                    # Interactive wizard
/workflow:spec:add --interactive                                       # Explicit interactive wizard
/workflow:spec:add "Use async/await instead of callbacks"              # Direct mode (auto-detect → rule)
/workflow:spec:add --type bug --tag api "API 返回 502"                 # Bug with tag
/workflow:spec:add --type pattern --tag react "带状态函数组件"          # Pattern with tag
/workflow:spec:add --type decision --tag db "选用 PostgreSQL"          # Decision with tag
/workflow:spec:add -y "No direct DB access" --type rule --tag arch     # Auto-confirm rule
/workflow:spec:add --scope global --dimension personal                 # Global personal spec
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `summary` | string | Yes (unless `--interactive`) | - | Summary text for the knowledge entry |
| `--type` | enum | No | auto-detect | Type: `bug`, `pattern`, `decision`, `rule` |
| `--tag` | string | No | auto-detect | Domain tag (api, routing, schema, react, security, etc.) |
| `--dimension` | enum | No | Interactive | `specs` (project) or `personal` |
| `--scope` | enum | No | `project` | `global` or `project` (only for personal dimension) |
| `--interactive` | flag | No | - | Launch full guided wizard |
| `-y` / `--yes` | flag | No | - | Auto-categorize and add without confirmation |

### Legacy Parameter Mapping

For backward compatibility, old parameter values are internally mapped:

| Old Parameter | Old Value | Maps To |
|---------------|-----------|---------|
| `--type` | `convention` | `rule` |
| `--type` | `constraint` | `rule` |
| `--type` | `learning` | `bug` (if has cause/fix indicators) or `rule` (otherwise) |
| `--category` | `<value>` | `--tag <value>` |

### Suggested Tags

| Domain | Tags |
|--------|------|
| Backend | `api`, `routing`, `db`, `auth`, `middleware` |
| Frontend | `react`, `ui`, `state`, `css`, `a11y` |
| Infra | `deploy`, `ci`, `docker`, `perf`, `build` |
| Quality | `security`, `testing`, `lint`, `typing` |
| Architecture | `arch`, `schema`, `migration`, `pattern` |

Tags are freeform — any `[\w-]+` value is accepted.

## Execution Process

```
Input Parsing:
   |- Parse: summary text (positional argument, optional if --interactive)
   |- Parse: --type (bug|pattern|decision|rule)
   |- Parse: --tag (domain tag)
   |- Parse: --dimension (specs|personal)
   |- Parse: --scope (global|project)
   |- Parse: --interactive (flag)
   +- Parse: -y / --yes (flag)

Step 1: Parse Input (with legacy mapping)

Step 2: Determine Mode
   |- If --interactive OR no summary text → Full Interactive Wizard (Path A)
   +- If summary text provided → Direct Mode (Path B)

Path A: Interactive Wizard
   |- Step A1: Ask dimension (if not specified)
   |- Step A2: Ask scope (if personal + scope not specified)
   |- Step A3: Ask type (bug|pattern|decision|rule)
   |- Step A4: Ask tag (domain tag)
   |- Step A5: Ask summary (entry text)
   |- Step A6: Ask extended fields (if bug/pattern/decision)
   +- Continue to Step 3

Path B: Direct Mode
   |- Step B1: Auto-detect type (if not specified) using detectType()
   |- Step B2: Auto-detect tag (if not specified) using detectTag()
   |- Step B3: Default dimension to 'specs' if not specified
   +- Continue to Step 3

Step 3: Determine Target File
   |- bug → .ccw/specs/learnings.md
   |- pattern → .ccw/specs/coding-conventions.md
   |- decision → .ccw/specs/architecture-constraints.md
   |- rule → .ccw/specs/coding-conventions.md or architecture-constraints.md
   +- personal → ~/.ccw/personal/ or .ccw/personal/

Step 4: Build Entry (entry line + extended fields)

Step 5: Validate and Write
   |- Ensure target directory and file exist
   |- Check for duplicates
   |- Append entry to file
   +- Run ccw spec rebuild

Step 6: Display Confirmation
   +- If -y/--yes: Minimal output
   +- Otherwise: Full confirmation with location details
```

## Implementation

### Step 1: Parse Input

```javascript
// Parse arguments
const args = $ARGUMENTS
const argsLower = args.toLowerCase()

// Extract flags
const autoConfirm = argsLower.includes('--yes') || argsLower.includes('-y')
const isInteractive = argsLower.includes('--interactive')

// Extract named parameters (support both new and legacy names)
const hasType = argsLower.includes('--type')
const hasTag = argsLower.includes('--tag') || argsLower.includes('--category')
const hasDimension = argsLower.includes('--dimension')
const hasScope = argsLower.includes('--scope')

let type = hasType ? args.match(/--type\s+(\w+)/i)?.[1]?.toLowerCase() : null
let tag = hasTag ? args.match(/--(?:tag|category)\s+([\w-]+)/i)?.[1]?.toLowerCase() : null
let dimension = hasDimension ? args.match(/--dimension\s+(\w+)/i)?.[1]?.toLowerCase() : null
let scope = hasScope ? args.match(/--scope\s+(\w+)/i)?.[1]?.toLowerCase() : null

// Extract summary text (everything before flags, or quoted string)
let summaryText = args
  .replace(/--type\s+\w+/gi, '')
  .replace(/--(?:tag|category)\s+[\w-]+/gi, '')
  .replace(/--dimension\s+\w+/gi, '')
  .replace(/--scope\s+\w+/gi, '')
  .replace(/--interactive/gi, '')
  .replace(/--yes/gi, '')
  .replace(/-y\b/gi, '')
  .replace(/^["']|["']$/g, '')
  .trim()

// Legacy type mapping
if (type) {
  const legacyMap = { 'convention': 'rule', 'constraint': 'rule' }
  if (legacyMap[type]) {
    type = legacyMap[type]
  } else if (type === 'learning') {
    // Defer to detectType() for finer classification
    type = null
  }
}

// Validate values
if (scope && !['global', 'project'].includes(scope)) {
  console.log("Invalid scope. Use 'global' or 'project'.")
  return
}
if (dimension && !['specs', 'personal'].includes(dimension)) {
  console.log("Invalid dimension. Use 'specs' or 'personal'.")
  return
}
if (type && !['bug', 'pattern', 'decision', 'rule'].includes(type)) {
  console.log("Invalid type. Use 'bug', 'pattern', 'decision', or 'rule'.")
  return
}
// Tags are freeform [\w-]+, no validation needed
```

### Step 2: Determine Mode

```javascript
const useInteractiveWizard = isInteractive || !summaryText
```

### Path A: Interactive Wizard

**If dimension not specified**:
```javascript
if (!dimension) {
  const dimensionAnswer = AskUserQuestion({
    questions: [{
      question: "What type of spec do you want to create?",
      header: "Dimension",
      multiSelect: false,
      options: [
        {
          label: "Project Spec",
          description: "Knowledge entries for this project (stored in .ccw/specs/)"
        },
        {
          label: "Personal Spec",
          description: "Personal preferences across projects (stored in ~/.ccw/personal/)"
        }
      ]
    }]
  })
  dimension = dimensionAnswer.answers["Dimension"] === "Project Spec" ? "specs" : "personal"
}
```

**If personal dimension and scope not specified**:
```javascript
if (dimension === 'personal' && !scope) {
  const scopeAnswer = AskUserQuestion({
    questions: [{
      question: "Where should this personal spec be stored?",
      header: "Scope",
      multiSelect: false,
      options: [
        {
          label: "Global (Recommended)",
          description: "Apply to ALL projects (~/.ccw/personal/)"
        },
        {
          label: "Project-only",
          description: "Apply only to this project (.ccw/personal/)"
        }
      ]
    }]
  })
  scope = scopeAnswer.answers["Scope"].includes("Global") ? "global" : "project"
}
```

**Ask type (if not specified)**:
```javascript
if (!type) {
  const typeAnswer = AskUserQuestion({
    questions: [{
      question: "What type of knowledge entry is this?",
      header: "Type",
      multiSelect: false,
      options: [
        {
          label: "Bug",
          description: "Debugging experience: symptoms, root cause, fix (e.g., API 502 caused by...)"
        },
        {
          label: "Pattern",
          description: "Reusable code pattern or reference implementation (e.g., adding API routes)"
        },
        {
          label: "Decision",
          description: "Architecture or design decision with rationale (e.g., chose PostgreSQL because...)"
        },
        {
          label: "Rule",
          description: "Hard constraint, convention, or general insight (e.g., no direct DB access)"
        }
      ]
    }]
  })
  const typeLabel = typeAnswer.answers["Type"]
  type = typeLabel.includes("Bug") ? "bug"
    : typeLabel.includes("Pattern") ? "pattern"
    : typeLabel.includes("Decision") ? "decision"
    : "rule"
}
```

**Ask tag (if not specified)**:
```javascript
if (!tag) {
  const tagAnswer = AskUserQuestion({
    questions: [{
      question: "What domain does this entry belong to?",
      header: "Tag",
      multiSelect: false,
      options: [
        { label: "api", description: "API endpoints, HTTP, REST, routing" },
        { label: "arch", description: "Architecture, design patterns, module structure" },
        { label: "security", description: "Authentication, authorization, input validation" },
        { label: "perf", description: "Performance, caching, optimization" }
      ]
    }]
  })
  tag = tagAnswer.answers["Tag"].toLowerCase().replace(/\s+/g, '-')
}
```

**Ask summary (entry text)**:
```javascript
if (!summaryText) {
  const contentAnswer = AskUserQuestion({
    questions: [{
      question: "Enter the summary text for this entry:",
      header: "Summary",
      multiSelect: false,
      options: [
        { label: "Custom text", description: "Type your summary using the 'Other' option below" },
        { label: "Skip", description: "Cancel adding an entry" }
      ]
    }]
  })
  if (contentAnswer.answers["Summary"] === "Skip") return
  summaryText = contentAnswer.answers["Summary"]
}
```

**Ask extended fields (if bug/pattern/decision)**:
```javascript
let extendedFields = {}

if (type === 'bug') {
  // Core fields: 原因, 修复
  const bugAnswer = AskUserQuestion({
    questions: [
      {
        question: "Root cause of the bug (原因):",
        header: "Cause",
        multiSelect: false,
        options: [
          { label: "Enter cause", description: "Type root cause via 'Other' option" },
          { label: "Skip", description: "Add later by editing the file" }
        ]
      },
      {
        question: "How was it fixed (修复):",
        header: "Fix",
        multiSelect: false,
        options: [
          { label: "Enter fix", description: "Type fix description via 'Other' option" },
          { label: "Skip", description: "Add later by editing the file" }
        ]
      }
    ]
  })
  if (bugAnswer.answers["Cause"] !== "Skip") extendedFields['原因'] = bugAnswer.answers["Cause"]
  if (bugAnswer.answers["Fix"] !== "Skip") extendedFields['修复'] = bugAnswer.answers["Fix"]

} else if (type === 'pattern') {
  // Core field: 场景
  const patternAnswer = AskUserQuestion({
    questions: [{
      question: "When should this pattern be used (场景):",
      header: "UseCase",
      multiSelect: false,
      options: [
        { label: "Enter use case", description: "Type applicable scenario via 'Other' option" },
        { label: "Skip", description: "Add later by editing the file" }
      ]
    }]
  })
  if (patternAnswer.answers["UseCase"] !== "Skip") extendedFields['场景'] = patternAnswer.answers["UseCase"]

} else if (type === 'decision') {
  // Core fields: 决策, 理由
  const decisionAnswer = AskUserQuestion({
    questions: [
      {
        question: "What was decided (决策):",
        header: "Decision",
        multiSelect: false,
        options: [
          { label: "Enter decision", description: "Type the decision via 'Other' option" },
          { label: "Skip", description: "Add later by editing the file" }
        ]
      },
      {
        question: "Why was this chosen (理由):",
        header: "Rationale",
        multiSelect: false,
        options: [
          { label: "Enter rationale", description: "Type the reasoning via 'Other' option" },
          { label: "Skip", description: "Add later by editing the file" }
        ]
      }
    ]
  })
  if (decisionAnswer.answers["Decision"] !== "Skip") extendedFields['决策'] = decisionAnswer.answers["Decision"]
  if (decisionAnswer.answers["Rationale"] !== "Skip") extendedFields['理由'] = decisionAnswer.answers["Rationale"]
}
```

### Path B: Direct Mode

**Auto-detect type if not specified**:
```javascript
function detectType(text) {
  const t = text.toLowerCase()

  // Bug indicators
  if (/\b(bug|fix|错误|报错|502|404|500|crash|失败|异常|undefined|null pointer)\b/.test(t)) {
    return 'bug'
  }

  // Pattern indicators
  if (/\b(pattern|模式|模板|标准流程|how to|步骤|参考)\b/.test(t)) {
    return 'pattern'
  }

  // Decision indicators
  if (/\b(决定|选用|采用|decision|chose|选择|替代|vs|比较)\b/.test(t)) {
    return 'decision'
  }

  // Default to rule
  return 'rule'
}

function detectTag(text) {
  const t = text.toLowerCase()

  if (/\b(api|http|rest|endpoint|路由|routing|proxy)\b/.test(t)) return 'api'
  if (/\b(security|auth|permission|密钥|xss|sql|注入)\b/.test(t)) return 'security'
  if (/\b(database|db|sql|postgres|mysql|mongo|数据库)\b/.test(t)) return 'db'
  if (/\b(react|component|hook|组件|jsx|tsx)\b/.test(t)) return 'react'
  if (/\b(performance|perf|cache|缓存|slow|慢|优化)\b/.test(t)) return 'perf'
  if (/\b(test|testing|jest|vitest|测试|coverage)\b/.test(t)) return 'testing'
  if (/\b(architecture|arch|layer|模块|module|依赖)\b/.test(t)) return 'arch'
  if (/\b(build|webpack|vite|compile|构建|打包)\b/.test(t)) return 'build'
  if (/\b(deploy|ci|cd|docker|部署)\b/.test(t)) return 'deploy'
  if (/\b(style|naming|命名|格式|lint|eslint)\b/.test(t)) return 'style'
  if (/\b(schema|migration|迁移|版本)\b/.test(t)) return 'schema'
  if (/\b(error|exception|错误处理|异常处理)\b/.test(t)) return 'error'
  if (/\b(ui|css|layout|样式|界面)\b/.test(t)) return 'ui'
  if (/\b(file|path|路径|目录|文件)\b/.test(t)) return 'file'
  if (/\b(doc|comment|文档|注释)\b/.test(t)) return 'doc'

  return 'general'
}

if (!type) {
  type = detectType(summaryText)
}
if (!tag) {
  tag = detectTag(summaryText)
}
if (!dimension) {
  dimension = 'specs'  // Default to project specs in direct mode
}
```

### Step 3: Ensure Guidelines File Exists

**Uses .ccw/specs/ directory (same as frontend/backend spec-index-builder)**

```bash
bash(test -f .ccw/specs/coding-conventions.md && echo "EXISTS" || echo "NOT_FOUND")
```

**If NOT_FOUND**, initialize spec system:

```bash
Bash('ccw spec init')
Bash('ccw spec rebuild')
```

### Step 4: Determine Target File

```javascript
const path = require('path')
const os = require('os')

let targetFile
let targetDir

if (dimension === 'specs') {
  targetDir = '.ccw/specs'

  if (type === 'bug') {
    targetFile = path.join(targetDir, 'learnings.md')
  } else if (type === 'decision') {
    targetFile = path.join(targetDir, 'architecture-constraints.md')
  } else if (type === 'pattern') {
    targetFile = path.join(targetDir, 'coding-conventions.md')
  } else {
    // rule: route by content and tag
    const isConstraint = /\b(禁止|no|never|must not|forbidden|不得|不允许)\b/i.test(summaryText)
    const isQuality = /\b(test|coverage|lint|eslint|质量|测试覆盖|pre-commit|tsc|type.check)\b/i.test(summaryText)
      || ['testing', 'quality', 'lint'].includes(tag)
    if (isQuality) {
      targetFile = path.join(targetDir, 'quality-rules.md')
    } else if (isConstraint) {
      targetFile = path.join(targetDir, 'architecture-constraints.md')
    } else {
      targetFile = path.join(targetDir, 'coding-conventions.md')
    }
  }
} else {
  // Personal specs
  if (scope === 'global') {
    targetDir = path.join(os.homedir(), '.ccw', 'personal')
  } else {
    targetDir = path.join('.ccw', 'personal')
  }

  // Type-based filename
  const fileMap = { bug: 'learnings', pattern: 'conventions', decision: 'constraints', rule: 'conventions' }
  targetFile = path.join(targetDir, `${fileMap[type]}.md`)
}
```

### Step 5: Build Entry

```javascript
function buildEntry(summary, type, tag, extendedFields) {
  const date = new Date().toISOString().split('T')[0]
  const needsDate = ['bug', 'pattern', 'decision'].includes(type)

  // Entry line
  let entry = `- [${type}:${tag}] ${summary}`
  if (needsDate) {
    entry += ` (${date})`
  }

  // Extended fields (indented with 4 spaces)
  if (extendedFields && Object.keys(extendedFields).length > 0) {
    for (const [key, value] of Object.entries(extendedFields)) {
      entry += `\n    - ${key}: ${value}`
    }
  }

  return entry
}
```

### Step 6: Write Spec

```javascript
const fs = require('fs')
const matter = require('gray-matter')  // YAML frontmatter parser

// Ensure directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

// ── Frontmatter check & repair ──
// Handles 3 cases:
//   A) File doesn't exist → create with frontmatter
//   B) File exists but no frontmatter → prepend frontmatter
//   C) File exists with frontmatter → ensure keywords include current tag

const titleMap = {
  'coding-conventions': 'Coding Conventions',
  'architecture-constraints': 'Architecture Constraints',
  'learnings': 'Learnings',
  'quality-rules': 'Quality Rules',
  'conventions': 'Personal Conventions',
  'constraints': 'Personal Constraints'
}

function ensureFrontmatter(filePath, dim, sc, t, ty) {
  const basename = path.basename(filePath, '.md')
  const title = titleMap[basename] || basename

  if (!fs.existsSync(filePath)) {
    // Case A: Create new file with frontmatter
    const content = `---
title: ${title}
readMode: optional
priority: medium
scope: ${dim === 'personal' ? sc : 'project'}
dimension: ${dim}
keywords: [${t}, ${ty}]
---

# ${title}

`
    fs.writeFileSync(filePath, content, 'utf8')
    return
  }

  // File exists — read and check frontmatter
  const raw = fs.readFileSync(filePath, 'utf8')
  let parsed
  try {
    parsed = matter(raw)
  } catch {
    parsed = { data: {}, content: raw }
  }

  const hasFrontmatter = raw.trimStart().startsWith('---')

  if (!hasFrontmatter) {
    // Case B: File exists but no frontmatter → prepend
    const fm = `---
title: ${title}
readMode: optional
priority: medium
scope: ${dim === 'personal' ? sc : 'project'}
dimension: ${dim}
keywords: [${t}, ${ty}]
---

`
    fs.writeFileSync(filePath, fm + raw, 'utf8')
    return
  }

  // Case C: Frontmatter exists → ensure keywords include current tag
  const existingKeywords = parsed.data.keywords || []
  const newKeywords = [...new Set([...existingKeywords, t, ty])]

  if (newKeywords.length !== existingKeywords.length) {
    // Keywords changed — update frontmatter
    parsed.data.keywords = newKeywords
    const updated = matter.stringify(parsed.content, parsed.data)
    fs.writeFileSync(filePath, updated, 'utf8')
  }
}

ensureFrontmatter(targetFile, dimension, scope, tag, type)

// Read existing content
let content = fs.readFileSync(targetFile, 'utf8')

// Deduplicate: skip if summary text already exists in the file
if (content.includes(summaryText)) {
  console.log(`
Entry already exists in ${targetFile}
Text: "${summaryText}"
`)
  return
}

// Build the entry
const newEntry = buildEntry(summaryText, type, tag, extendedFields)

// Append the entry
content = content.trimEnd() + '\n' + newEntry + '\n'
fs.writeFileSync(targetFile, content, 'utf8')

// Rebuild spec index
Bash('ccw spec rebuild')
```

### Step 7: Display Confirmation

**If `-y`/`--yes` (auto mode)**:
```
Spec added: [${type}:${tag}] "${summaryText}" -> ${targetFile}
```

**Otherwise (full confirmation)**:
```
Entry created successfully

Type: ${type}
Tag: ${tag}
Summary: "${summaryText}"
Dimension: ${dimension}
Scope: ${dimension === 'personal' ? scope : 'project'}
${Object.keys(extendedFields).length > 0 ? `Extended fields: ${Object.keys(extendedFields).join(', ')}` : ''}

Location: ${targetFile}

Use 'ccw spec list' to view all specs
Tip: Edit ${targetFile} to add code examples or additional details
```

## Target File Resolution

### Project Specs (dimension: specs)
```
.ccw/specs/
|- coding-conventions.md       <- pattern, rule (conventions)
|- architecture-constraints.md <- decision, rule (constraints)
|- learnings.md                <- bug (debugging experience)
+- quality-rules.md            <- quality rules
```

### Personal Specs (dimension: personal)
```
# Global (~/.ccw/personal/)
~/.ccw/personal/
|- conventions.md              <- pattern, rule (all projects)
|- constraints.md              <- decision, rule (all projects)
+- learnings.md                <- bug (all projects)

# Project-local (.ccw/personal/)
.ccw/personal/
|- conventions.md              <- pattern, rule (this project only)
|- constraints.md              <- decision, rule (this project only)
+- learnings.md                <- bug (this project only)
```

## Examples

### Interactive Wizard
```bash
/workflow:spec:add --interactive
# Prompts for: dimension -> scope (if personal) -> type -> tag -> summary -> extended fields
```

### Add a Bug Fix Experience
```bash
/workflow:spec:add --type bug --tag api "API 返回 502 Bad Gateway"
```

Result in `.ccw/specs/learnings.md`:
```markdown
- [bug:api] API 返回 502 Bad Gateway (2026-03-09)
```

With interactive extended fields:
```markdown
- [bug:api] API 返回 502 Bad Gateway (2026-03-09)
    - 原因: 路由处理器未在 server.ts 路由分发中注册
    - 修复: 在路由分发逻辑中导入并调用 app.use(newRouter)
```

### Add a Code Pattern
```bash
/workflow:spec:add --type pattern --tag routing "添加新 API 路由标准流程"
```

Result in `.ccw/specs/coding-conventions.md`:
```markdown
- [pattern:routing] 添加新 API 路由标准流程 (2026-03-09)
    - 场景: Express 应用新增业务接口
```

### Add an Architecture Decision
```bash
/workflow:spec:add --type decision --tag db "选用 PostgreSQL 作为主数据库"
```

Result in `.ccw/specs/architecture-constraints.md`:
```markdown
- [decision:db] 选用 PostgreSQL 作为主数据库 (2026-03-09)
    - 决策: 使用 PostgreSQL 15
    - 理由: JSONB 支持完善，PostGIS 扩展成熟
```

### Add a Rule (Direct, Auto-detect)
```bash
/workflow:spec:add "Use async/await instead of callbacks"
```

Result in `.ccw/specs/coding-conventions.md`:
```markdown
- [rule:style] Use async/await instead of callbacks
```

### Add a Constraint Rule
```bash
/workflow:spec:add -y "No direct DB access from controllers" --type rule --tag arch
```

Result in `.ccw/specs/architecture-constraints.md`:
```markdown
- [rule:arch] No direct DB access from controllers
```

### Legacy Compatibility
```bash
# Old syntax still works
/workflow:spec:add "No ORM allowed" --type constraint --category architecture
# Internally maps to: --type rule --tag architecture
```

Result:
```markdown
- [rule:architecture] No ORM allowed
```

### Personal Spec
```bash
/workflow:spec:add --scope global --dimension personal --type rule --tag style "Prefer descriptive variable names"
```

Result in `~/.ccw/personal/conventions.md`:
```markdown
- [rule:style] Prefer descriptive variable names
```

## Error Handling

- **Duplicate Entry**: Warn and skip if summary text already exists in target file
- **Invalid Type**: Exit with error - must be 'bug', 'pattern', 'decision', or 'rule'
- **Invalid Scope**: Exit with error - must be 'global' or 'project'
- **Invalid Dimension**: Exit with error - must be 'specs' or 'personal'
- **Legacy Type**: Auto-map convention→rule, constraint→rule, learning→auto-detect
- **File not writable**: Check permissions, suggest manual creation
- **File Corruption**: Backup existing file before modification

## Related Commands

- `/workflow:spec:setup` - Initialize project with specs scaffold
- `/workflow:session:sync` - Quick-sync session work to specs and project-tech
- `/workflow:session:start` - Start a session
- `/workflow:session:complete` - Complete session (prompts for learnings)
- `ccw spec list` - View all specs
- `ccw spec load --category <cat>` - Load filtered specs
- `ccw spec rebuild` - Rebuild spec index
