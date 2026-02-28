# Command: scan

> 多视角 CLI Fan-out 扫描。从 bug、安全、测试覆盖、代码质量、UX 等视角并行分析代码，发现潜在问题。

## When to Use

- Phase 3 of Scout
- 需要对代码库进行多视角问题扫描
- 复杂度为 Medium 或 High 时使用 CLI Fan-out

**Trigger conditions**:
- SCOUT-* 任务进入 Phase 3
- 复杂度评估为 Medium/High
- 需要深度分析超出 ACE 搜索能力

## Strategy

### Delegation Mode

**Mode**: CLI Fan-out
**CLI Tool**: `gemini` (primary)
**CLI Mode**: `analysis`
**Parallel Perspectives**: 2-5（根据复杂度）

### Decision Logic

```javascript
// 复杂度决定扫描策略
if (complexity === 'Low') {
  // ACE 搜索 + Grep 内联分析（不使用 CLI）
  mode = 'inline'
} else if (complexity === 'Medium') {
  // CLI Fan-out: 3 个核心视角
  mode = 'cli-fanout'
  activePerspectives = perspectives.slice(0, 3)
} else {
  // CLI Fan-out: 所有视角
  mode = 'cli-fanout'
  activePerspectives = perspectives
}
```

## Execution Steps

### Step 1: Context Preparation

```javascript
// 确定扫描范围
const projectRoot = Bash(`git rev-parse --show-toplevel 2>/dev/null || pwd`).trim()
const scanScope = task.description.match(/scope:\s*(.+)/)?.[1] || '**/*'

// 获取变更文件用于聚焦扫描
const changedFiles = Bash(`git diff --name-only HEAD~5 2>/dev/null || echo ""`)
  .split('\n').filter(Boolean)

// 构建文件上下文
const fileContext = changedFiles.length > 0
  ? changedFiles.map(f => `@${f}`).join(' ')
  : `@${scanScope}`

// 已知缺陷模式（来自 shared memory）
const knownPatternsText = knownPatterns.length > 0
  ? `\nKnown defect patterns to verify: ${knownPatterns.map(p => p.description).join('; ')}`
  : ''
```

### Step 2: Execute Strategy

```javascript
if (mode === 'inline') {
  // 快速内联扫描
  const aceResults = mcp__ace-tool__search_context({
    project_root_path: projectRoot,
    query: "potential bugs, error handling issues, unchecked return values, security vulnerabilities, missing input validation"
  })

  // 解析 ACE 结果并分类
  for (const result of aceResults) {
    classifyFinding(result)
  }
} else {
  // CLI Fan-out: 每个视角一个 CLI 调用
  const perspectivePrompts = {
    'bug': `PURPOSE: Discover potential bugs and logic errors
TASK: • Find unchecked return values • Identify race conditions • Check null/undefined handling • Find off-by-one errors • Detect resource leaks
MODE: analysis
CONTEXT: ${fileContext}${knownPatternsText}
EXPECTED: List of findings with severity, file:line, description, and fix suggestion
CONSTRAINTS: Focus on real bugs, avoid false positives`,

    'security': `PURPOSE: Identify security vulnerabilities and risks
TASK: • Check for injection flaws (SQL, command, XSS) • Find authentication/authorization gaps • Identify sensitive data exposure • Check input validation • Review crypto usage
MODE: analysis
CONTEXT: ${fileContext}
EXPECTED: Security findings with CVSS-style severity, file:line, CWE references where applicable
CONSTRAINTS: Focus on exploitable vulnerabilities`,

    'test-coverage': `PURPOSE: Identify untested code paths and coverage gaps
TASK: • Find functions/methods without tests • Identify complex logic without assertions • Check error paths without coverage • Find boundary conditions untested
MODE: analysis
CONTEXT: ${fileContext}
EXPECTED: List of untested areas with file:line, complexity indicator, and test suggestion
CONSTRAINTS: Focus on high-risk untested code`,

    'code-quality': `PURPOSE: Detect code quality issues and anti-patterns
TASK: • Find code duplication • Identify overly complex functions • Check naming conventions • Find dead code • Detect God objects/functions
MODE: analysis
CONTEXT: ${fileContext}
EXPECTED: Quality findings with severity, file:line, and improvement suggestion
CONSTRAINTS: Focus on maintainability impacts`,

    'ux': `PURPOSE: Identify UX-impacting issues in code
TASK: • Find missing loading states • Check error message quality • Identify accessibility gaps • Find inconsistent UI patterns • Check responsive handling
MODE: analysis
CONTEXT: ${fileContext}
EXPECTED: UX findings with impact level, file:line, and user-facing description
CONSTRAINTS: Focus on user-visible issues`
  }

  for (const perspective of activePerspectives) {
    const prompt = perspectivePrompts[perspective]
    if (!prompt) continue

    Bash(`ccw cli -p "${prompt}" --tool gemini --mode analysis --rule analysis-assess-security-risks`, {
      run_in_background: true
    })
  }

  // 等待所有 CLI 完成（hook 回调通知）
}
```

### Step 3: Result Processing

```javascript
// 聚合所有视角的结果
const allFindings = { critical: [], high: [], medium: [], low: [] }

// 从 CLI 输出解析结果
for (const perspective of activePerspectives) {
  const findings = parseCliOutput(cliResults[perspective])
  for (const finding of findings) {
    finding.perspective = perspective
    allFindings[finding.severity].push(finding)
  }
}

// 去重：相同 file:line 的发现合并
function deduplicateFindings(findings) {
  const seen = new Set()
  const unique = []
  for (const f of findings) {
    const key = `${f.file}:${f.line}`
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(f)
    } else {
      // 合并视角信息到已有条目
      const existing = unique.find(u => `${u.file}:${u.line}` === key)
      if (existing) existing.perspectives = [...(existing.perspectives || [existing.perspective]), f.perspective]
    }
  }
  return unique
}

for (const severity of ['critical', 'high', 'medium', 'low']) {
  allFindings[severity] = deduplicateFindings(allFindings[severity])
}

// 与已知缺陷模式对比
for (const pattern of knownPatterns) {
  for (const severity of ['critical', 'high', 'medium', 'low']) {
    for (const finding of allFindings[severity]) {
      if (finding.file === pattern.file || finding.description.includes(pattern.type)) {
        finding.known_pattern = true
      }
    }
  }
}
```

## Output Format

```
## Scan Results

### Perspectives Scanned: [list]
### Complexity: [Low|Medium|High]

### Findings by Severity
#### Critical ([count])
- [file:line] [perspective] - [description]

#### High ([count])
- [file:line] [perspective] - [description]

#### Medium ([count])
- [file:line] - [description]

#### Low ([count])
- [file:line] - [description]

### Known Pattern Matches: [count]
### New Findings: [count]
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| CLI tool unavailable | Fall back to ACE search + Grep inline analysis |
| CLI returns empty for a perspective | Note incomplete perspective, continue others |
| Too many findings (>50) | Prioritize critical/high, summarize medium/low |
| Timeout on CLI call | Use partial results, note incomplete perspectives |
| Agent/CLI failure | Retry once, then fallback to inline execution |
| Timeout (>5 min) | Report partial results, notify coordinator |
