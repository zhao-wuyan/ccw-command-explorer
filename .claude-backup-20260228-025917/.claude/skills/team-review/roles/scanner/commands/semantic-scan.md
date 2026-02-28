# Command: semantic-scan

> LLM-based semantic analysis via CLI. Supplements toolchain findings with issues that static tools cannot detect: business logic flaws, architectural problems, complex security patterns.

## When to Use

- Phase 3 of Scanner, Standard mode, Step B
- Runs AFTER toolchain-scan completes (needs its output to avoid duplication)
- Quick mode does NOT use this command

**Trigger conditions**:
- SCAN-* task in Phase 3 with `quickMode === false`
- toolchain-scan.md has completed (toolchain-findings.json exists or empty)

## Strategy

### Delegation Mode

**Mode**: CLI Fan-out (single gemini agent, analysis only)

### Tool Fallback Chain

```
gemini (primary) -> qwen (fallback) -> codex (fallback)
```

## Execution Steps

### Step 1: Prepare Context

Build the CLI prompt with target files and a summary of toolchain findings to avoid duplication.

```javascript
// Read toolchain findings for dedup context
let toolFindings = []
try {
  toolFindings = JSON.parse(Read(`${sessionFolder}/scan/toolchain-findings.json`))
} catch { /* no toolchain findings */ }

// Build toolchain summary for dedup (compact: file:line:rule per line)
const toolSummary = toolFindings.length > 0
  ? toolFindings.slice(0, 50).map(f =>
      `${f.location?.file}:${f.location?.line} [${f.source}] ${f.title}`
    ).join('\n')
  : '(no toolchain findings)'

// Build target file list for CLI context
// Limit to reasonable size for CLI prompt
const fileList = targetFiles.slice(0, 100)
const targetPattern = fileList.length <= 20
  ? fileList.join(' ')
  : `${target}/**/*.{ts,tsx,js,jsx,py,go,java,rs}`

// Map requested dimensions to scan focus areas
const DIM_FOCUS = {
  sec:   'Security: business logic vulnerabilities, privilege escalation, sensitive data flow, auth bypass, injection beyond simple patterns',
  cor:   'Correctness: logic errors, unhandled exception paths, state management bugs, race conditions, incorrect algorithm implementation',
  perf:  'Performance: algorithm complexity (O(n^2)+), N+1 queries, unnecessary sync operations, memory leaks, missing caching opportunities',
  maint: 'Maintainability: architectural coupling, abstraction leaks, project convention violations, dead code paths, excessive complexity'
}

const focusAreas = dimensions
  .map(d => DIM_FOCUS[d])
  .filter(Boolean)
  .map((desc, i) => `${i + 1}. ${desc}`)
  .join('\n')
```

### Step 2: Execute CLI Scan

```javascript
const maxPerDimension = 5
const minSeverity = 'medium'

const cliPrompt = `PURPOSE: Supplement toolchain scan with semantic analysis that static tools cannot detect. Find logic errors, architectural issues, and complex vulnerability patterns.
TASK:
${focusAreas}
MODE: analysis
CONTEXT: @${targetPattern}
Toolchain already detected these issues (DO NOT repeat them):
${toolSummary}
EXPECTED: Respond with ONLY a JSON array (no markdown, no explanation). Each element:
{"dimension":"security|correctness|performance|maintainability","category":"<sub-category>","severity":"critical|high|medium","title":"<concise title>","description":"<detailed explanation>","location":{"file":"<path>","line":<number>,"end_line":<number>,"code_snippet":"<relevant code>"},"source":"llm","suggested_fix":"<how to fix>","effort":"low|medium|high","confidence":"high|medium|low"}
CONSTRAINTS: Max ${maxPerDimension} findings per dimension | Only ${minSeverity} severity and above | Do not duplicate toolchain findings | Focus on issues tools CANNOT detect | Return raw JSON array only`

let cliOutput = null
let cliTool = 'gemini'

// Try primary tool
try {
  cliOutput = Bash(
    `ccw cli -p "${cliPrompt.replace(/"/g, '\\"')}" --tool gemini --mode analysis --rule analysis-review-code-quality`,
    { timeout: 300000 }
  )
} catch {
  // Fallback to qwen
  try {
    cliTool = 'qwen'
    cliOutput = Bash(
      `ccw cli -p "${cliPrompt.replace(/"/g, '\\"')}" --tool qwen --mode analysis`,
      { timeout: 300000 }
    )
  } catch {
    // Fallback to codex
    try {
      cliTool = 'codex'
      cliOutput = Bash(
        `ccw cli -p "${cliPrompt.replace(/"/g, '\\"')}" --tool codex --mode analysis`,
        { timeout: 300000 }
      )
    } catch {
      // All CLI tools failed
      cliOutput = null
    }
  }
}
```

### Step 3: Parse & Validate Output

```javascript
let semanticFindings = []

if (cliOutput) {
  try {
    // Extract JSON array from CLI output (may have surrounding text)
    const jsonMatch = cliOutput.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])

      // Validate each finding against schema
      semanticFindings = parsed.filter(f => {
        // Required fields check
        if (!f.dimension || !f.title || !f.location?.file) return false
        // Dimension must be valid
        if (!['security', 'correctness', 'performance', 'maintainability'].includes(f.dimension)) return false
        // Severity must be valid and meet minimum
        const validSev = ['critical', 'high', 'medium']
        if (!validSev.includes(f.severity)) return false
        return true
      }).map(f => ({
        dimension: f.dimension,
        category: f.category || 'general',
        severity: f.severity,
        title: f.title,
        description: f.description || f.title,
        location: {
          file: f.location.file,
          line: f.location.line || 1,
          end_line: f.location.end_line || f.location.line || 1,
          code_snippet: f.location.code_snippet || ''
        },
        source: 'llm',
        tool_rule: null,
        suggested_fix: f.suggested_fix || '',
        effort: ['low', 'medium', 'high'].includes(f.effort) ? f.effort : 'medium',
        confidence: ['high', 'medium', 'low'].includes(f.confidence) ? f.confidence : 'medium'
      }))
    }
  } catch {
    // JSON parse failed - log and continue with empty
  }
}

// Enforce per-dimension limits
const dimCounts = {}
semanticFindings = semanticFindings.filter(f => {
  dimCounts[f.dimension] = (dimCounts[f.dimension] || 0) + 1
  return dimCounts[f.dimension] <= maxPerDimension
})

// Write output
Write(`${sessionFolder}/scan/semantic-findings.json`,
  JSON.stringify(semanticFindings, null, 2))
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| gemini CLI fails | Fallback to qwen, then codex |
| All CLI tools fail | Log warning, write empty findings array (toolchain results still valid) |
| CLI output not valid JSON | Attempt regex extraction, else empty findings |
| Findings exceed per-dimension limit | Truncate to max per dimension |
| Invalid dimension/severity in output | Filter out invalid entries |
| CLI timeout (>5 min) | Kill, log warning, return empty findings |
