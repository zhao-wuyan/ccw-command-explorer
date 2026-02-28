# Command: scan-debt

> 三层并行 Fan-out 技术债务扫描。Subagent 结构探索 + CLI 维度分析 + 多视角 Gemini 深度分析，三层并行执行后 Fan-in 聚合。

## When to Use

- Phase 3 of Scanner
- 需要对代码库进行多维度技术债务扫描
- 复杂度为 Medium 或 High 时使用并行 Fan-out

**Trigger conditions**:
- TDSCAN-* 任务进入 Phase 3
- 复杂度评估为 Medium/High
- 需要深度分析超出 ACE 搜索能力

## Strategy

### Delegation Mode

**Mode**: Triple Fan-out + Fan-in
**Subagent**: `cli-explore-agent`（并行结构探索）
**CLI Tool**: `gemini` (primary)
**CLI Mode**: `analysis`
**Parallel Layers**:
- Fan-out A: 2-3 并行 subagent（结构探索）
- Fan-out B: 3-5 并行 CLI（维度分析）
- Fan-out C: 2-4 并行 CLI（多视角 Gemini）

### Decision Logic

```javascript
// 复杂度决定扫描策略
if (complexity === 'Low') {
  // ACE 搜索 + Grep 内联分析（不使用 CLI）
  mode = 'inline'
} else if (complexity === 'Medium') {
  // 双层 Fan-out: subagent 探索 + CLI 3 维度
  mode = 'dual-fanout'
  activeDimensions = ['code', 'testing', 'dependency']
  exploreAngles = ['structure', 'patterns']
} else {
  // 三层 Fan-out: subagent 探索 + CLI 5 维度 + 多视角 Gemini
  mode = 'triple-fanout'
  activeDimensions = dimensions  // all 5
  exploreAngles = ['structure', 'patterns', 'dependencies']
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
// 确定扫描范围
const projectRoot = Bash(`git rev-parse --show-toplevel 2>/dev/null || pwd`).trim()
const scanScope = task.description.match(/scope:\s*(.+)/)?.[1] || '**/*'

// 获取变更文件用于聚焦扫描
const changedFiles = Bash(`git diff --name-only HEAD~10 2>/dev/null || echo ""`)
  .split('\n').filter(Boolean)

// 构建文件上下文
const fileContext = changedFiles.length > 0
  ? changedFiles.map(f => `@${f}`).join(' ')
  : `@${scanScope}`

// 多视角检测（从 role.md Phase 2 传入）
// perspectives = detectPerspectives(task.description)
```

### Step 2: Execute Strategy

```javascript
if (mode === 'inline') {
  // 快速内联扫描（Low 复杂度）
  const aceResults = mcp__ace-tool__search_context({
    project_root_path: projectRoot,
    query: "code smells, TODO/FIXME, deprecated APIs, complex functions, dead code, missing tests, circular imports"
  })
  // 解析 ACE 结果并分类到维度
} else {
  // === 三层并行 Fan-out ===
  // A、B、C 三层同时启动，互不依赖

  // ─── Fan-out A: Subagent 并行探索（codebase 结构理解）───
  executeExploreAngles(exploreAngles)

  // ─── Fan-out B: CLI 维度分析（并行 gemini）───
  executeDimensionAnalysis(activeDimensions)

  // ─── Fan-out C: 多视角 Gemini 深度分析（并行）───
  if (mode === 'triple-fanout') {
    executePerspectiveAnalysis(perspectives)
  }

  // 等待所有 Fan-out 完成（hook 回调通知）
}
```

### Step 2a: Fan-out A — Subagent Exploration

> 并行启动 cli-explore-agent 探索代码库结构，为后续分析提供上下文。
> 每个角度独立执行，不互相依赖。

```javascript
function executeExploreAngles(angles) {
  const explorePrompts = {
    'structure': `Explore the codebase structure and module organization.
Focus on: directory layout, module boundaries, entry points, build configuration.
Project root: ${projectRoot}
Report: module map, key entry files, build system type, framework detection.`,

    'patterns': `Explore coding patterns and conventions used in this codebase.
Focus on: naming conventions, import patterns, error handling patterns, state management, design patterns.
Project root: ${projectRoot}
Report: dominant patterns, anti-patterns found, consistency assessment.`,

    'dependencies': `Explore dependency graph and inter-module relationships.
Focus on: import/require chains, circular dependencies, external dependency usage, shared utilities.
Project root: ${projectRoot}
Report: dependency hotspots, tightly-coupled modules, dependency depth analysis.`
  }

  // 并行启动所有探索角度（每个 cli-explore-agent 独立执行）
  for (const angle of angles) {
    Task({
      subagent_type: "cli-explore-agent",
      run_in_background: false,
      description: `Explore: ${angle}`,
      prompt: explorePrompts[angle] || `Explore from ${angle} perspective. Project: ${projectRoot}`
    })
  }

  // 所有 subagent 返回后，探索结果已可用
}
```

### Step 2b: Fan-out B — CLI Dimension Analysis

> 每个维度独立的 gemini CLI 分析，全部并行启动。

```javascript
function executeDimensionAnalysis(activeDimensions) {
  const dimensionPrompts = {
    'code': `PURPOSE: Identify code quality debt - complexity, duplication, code smells
TASK: • Find functions with cyclomatic complexity > 10 • Detect code duplication (>20 lines) • Identify code smells (God class, long method, feature envy) • Find TODO/FIXME/HACK comments • Detect dead code and unused exports
MODE: analysis
CONTEXT: ${fileContext}
EXPECTED: List of findings with severity (critical/high/medium/low), file:line, description, estimated fix effort (small/medium/large)
CONSTRAINTS: Focus on actionable items, skip generated code`,

    'architecture': `PURPOSE: Identify architecture debt - coupling, circular dependencies, layering violations
TASK: • Detect circular dependencies between modules • Find tight coupling between components • Identify layering violations (e.g., UI importing DB) • Check for God modules with too many responsibilities • Find missing abstraction layers
MODE: analysis
CONTEXT: ${fileContext}
EXPECTED: Architecture debt findings with severity, affected modules, dependency graph issues
CONSTRAINTS: Focus on structural issues, not style`,

    'testing': `PURPOSE: Identify testing debt - coverage gaps, test quality, missing test types
TASK: • Find modules without any test files • Identify complex logic without test coverage • Check for test anti-patterns (flaky tests, hardcoded values) • Find missing edge case tests • Detect test files that import from test utilities incorrectly
MODE: analysis
CONTEXT: ${fileContext}
EXPECTED: Testing debt findings with severity, affected files, missing test type (unit/integration/e2e)
CONSTRAINTS: Focus on high-risk untested code paths`,

    'dependency': `PURPOSE: Identify dependency debt - outdated packages, vulnerabilities, unnecessary deps
TASK: • Find outdated major-version dependencies • Identify known vulnerability packages • Detect unused dependencies • Find duplicate functionality from different packages • Check for pinned vs range versions
MODE: analysis
CONTEXT: @package.json @package-lock.json @requirements.txt @go.mod @pom.xml
EXPECTED: Dependency debt with severity, package name, current vs latest version, CVE references
CONSTRAINTS: Focus on security and compatibility risks`,

    'documentation': `PURPOSE: Identify documentation debt - missing docs, stale docs, undocumented APIs
TASK: • Find public APIs without JSDoc/docstrings • Identify README files that are outdated • Check for missing architecture documentation • Find configuration options without documentation • Detect stale comments that don't match code
MODE: analysis
CONTEXT: ${fileContext}
EXPECTED: Documentation debt with severity, file:line, type (missing/stale/incomplete)
CONSTRAINTS: Focus on public interfaces and critical paths`
  }

  // 并行启动所有维度分析
  for (const dimension of activeDimensions) {
    const prompt = dimensionPrompts[dimension]
    if (!prompt) continue

    Bash(`ccw cli -p "${prompt}" --tool gemini --mode analysis --rule analysis-analyze-code-patterns`, {
      run_in_background: true
    })
  }
}
```

### Step 2c: Fan-out C — Multi-Perspective Gemini Analysis

> 多视角深度分析，每个视角关注不同质量维度。
> 视角由 `detectPerspectives()` 自动检测，或在 High 复杂度下全量启用。
> 与 Fan-out B（维度分析）的区别：维度分析按"代码/测试/依赖"横切，视角分析按"安全/性能/质量/架构"纵切，交叉覆盖。

```javascript
function executePerspectiveAnalysis(perspectives) {
  const perspectivePrompts = {
    'security': `PURPOSE: Security-focused analysis of codebase to identify vulnerability debt
TASK: • Find injection vulnerabilities (SQL, command, XSS, LDAP) • Check authentication/authorization weaknesses • Identify hardcoded secrets or credentials • Detect insecure data handling (sensitive data exposure) • Find missing input validation on trust boundaries • Check for outdated crypto or insecure hash functions
MODE: analysis
CONTEXT: ${fileContext}
EXPECTED: Security findings with: severity (critical/high/medium/low), CWE/OWASP reference, file:line, remediation suggestion
CONSTRAINTS: Focus on exploitable vulnerabilities, not theoretical risks`,

    'performance': `PURPOSE: Performance-focused analysis to identify performance debt
TASK: • Find N+1 query patterns in database calls • Detect unnecessary re-renders or recomputations • Identify missing caching opportunities • Find synchronous blocking in async contexts • Detect memory leak patterns (event listener accumulation, unclosed resources) • Check for unoptimized loops or O(n²) algorithms on large datasets
MODE: analysis
CONTEXT: ${fileContext}
EXPECTED: Performance findings with: severity, impact estimate (latency/memory/CPU), file:line, optimization suggestion
CONSTRAINTS: Focus on measurable impact, not micro-optimizations`,

    'code-quality': `PURPOSE: Code quality deep analysis beyond surface-level linting
TASK: • Identify functions violating single responsibility principle • Find overly complex conditional chains (>3 nesting levels) • Detect hidden temporal coupling between functions • Find magic numbers and unexplained constants • Identify error handling anti-patterns (empty catch, swallowed errors) • Detect feature envy (methods that access other classes more than their own)
MODE: analysis
CONTEXT: ${fileContext}
EXPECTED: Quality findings with: severity, code smell category, file:line, refactoring suggestion with pattern name
CONSTRAINTS: Focus on maintainability impact, skip style-only issues`,

    'architecture': `PURPOSE: Architecture-level analysis of system design debt
TASK: • Identify layering violations (skip-layer calls, reverse dependencies) • Find God modules/classes with >5 distinct responsibilities • Detect missing domain boundaries (business logic in UI/API layer) • Check for abstraction leaks (implementation details in interfaces) • Identify duplicated business logic across modules • Find tightly coupled modules that should be independent
MODE: analysis
CONTEXT: ${fileContext}
EXPECTED: Architecture findings with: severity, affected modules, coupling metric, suggested restructuring
CONSTRAINTS: Focus on structural issues affecting scalability and team autonomy`
  }

  // 并行启动所有视角分析
  for (const perspective of perspectives) {
    const prompt = perspectivePrompts[perspective]
    if (!prompt) continue

    Bash(`ccw cli -p "${prompt}" --tool gemini --mode analysis --rule analysis-review-architecture`, {
      run_in_background: true
    })
  }
}
```

### Step 3: Fan-in Result Processing

> 三层 Fan-out 结果聚合：探索结果提供上下文，维度分析 + 视角分析交叉去重。

```javascript
// ─── 3a: 聚合探索结果（来自 Fan-out A）───
const exploreContext = {
  structure: exploreResults['structure'] || {},
  patterns: exploreResults['patterns'] || {},
  dependencies: exploreResults['dependencies'] || {}
}

// ─── 3b: 聚合维度分析结果（来自 Fan-out B）───
const dimensionFindings = []
for (const dimension of activeDimensions) {
  const findings = parseCliOutput(cliResults[dimension])
  for (const finding of findings) {
    finding.dimension = dimension
    finding.source = 'dimension-analysis'
    dimensionFindings.push(finding)
  }
}

// ─── 3c: 聚合视角分析结果（来自 Fan-out C）───
const perspectiveFindings = []
if (mode === 'triple-fanout') {
  for (const perspective of perspectives) {
    const findings = parseCliOutput(cliResults[perspective])
    for (const finding of findings) {
      finding.perspective = perspective
      finding.source = 'perspective-analysis'
      // 映射视角到最近维度（用于统一归类）
      finding.dimension = finding.dimension || mapPerspectiveToDimension(perspective)
      perspectiveFindings.push(finding)
    }
  }
}

// ─── 3d: 合并 + 交叉去重 ───
const allFindings = [...dimensionFindings, ...perspectiveFindings]

function deduplicateFindings(findings) {
  const seen = new Map()  // key → finding (保留严重性更高的)
  for (const f of findings) {
    const key = `${f.file}:${f.line}`
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, f)
    } else {
      // 同一位置多角度发现 → 合并，提升严重性
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      if ((severityOrder[f.severity] || 3) < (severityOrder[existing.severity] || 3)) {
        existing.severity = f.severity
      }
      // 记录交叉引用（被多个视角/维度发现的条目更可信）
      existing.crossRefs = existing.crossRefs || []
      existing.crossRefs.push({ source: f.source, perspective: f.perspective, dimension: f.dimension })
    }
  }
  return [...seen.values()]
}

// 视角 → 维度映射
function mapPerspectiveToDimension(perspective) {
  const map = {
    'security': 'code',
    'performance': 'code',
    'code-quality': 'code',
    'architecture': 'architecture'
  }
  return map[perspective] || 'code'
}

const deduped = deduplicateFindings(allFindings)

// ─── 3e: 按严重性排序（交叉引用的条目优先）───
deduped.sort((a, b) => {
  // 被多角度发现的条目 → 优先级提升
  const aBoost = (a.crossRefs?.length || 0) > 0 ? -0.5 : 0
  const bBoost = (b.crossRefs?.length || 0) > 0 ? -0.5 : 0
  const order = { critical: 0, high: 1, medium: 2, low: 3 }
  return ((order[a.severity] || 3) + aBoost) - ((order[b.severity] || 3) + bBoost)
})

// ─── 3f: 用探索上下文增强发现（可选）───
// 利用 Fan-out A 的结构探索结果标注模块归属
for (const finding of deduped) {
  if (finding.file && exploreContext.structure?.modules) {
    const module = exploreContext.structure.modules.find(m =>
      finding.file.startsWith(m.path)
    )
    if (module) finding.module = module.name
  }
}
```

## Output Format

```
## Debt Scan Results

### Scan Mode: [inline|dual-fanout|triple-fanout]
### Complexity: [Low|Medium|High]
### Perspectives: [security, performance, code-quality, architecture]

### Findings by Dimension
#### Code Quality ([count])
- [file:line] [severity] - [description] [crossRefs: N perspectives]

#### Architecture ([count])
- [module] [severity] - [description]

#### Testing ([count])
- [file:line] [severity] - [description]

#### Dependency ([count])
- [package] [severity] - [description]

#### Documentation ([count])
- [file:line] [severity] - [description]

### Multi-Perspective Highlights
#### Security Findings ([count])
- [file:line] [severity] - [CWE-xxx] [description]

#### Performance Findings ([count])
- [file:line] [severity] - [impact] [description]

### Cross-Referenced Items (多角度交叉验证)
- [file:line] confirmed by [N] sources - [description]

### Total Debt Items: [count]
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| CLI tool unavailable | Fall back to ACE search + Grep inline analysis |
| CLI returns empty for a dimension | Note incomplete dimension, continue others |
| Subagent explore fails | Skip explore context, proceed with CLI analysis only |
| Too many findings (>100) | Prioritize critical/high + cross-referenced, summarize rest |
| Timeout on CLI call | Use partial results, note incomplete dimensions/perspectives |
| Agent/CLI failure | Retry once, then fallback to inline execution |
| Perspective analysis timeout | Use dimension-only results, note missing perspectives |
| All Fan-out layers fail | Fall back to ACE inline scan (guaranteed minimum) |
