# Command: deep-analyze

> CLI Fan-out deep analysis. Splits findings into 2 domain groups, runs parallel CLI agents for root cause / impact / optimization enrichment.

## When to Use

- Phase 3 of Reviewer, when `deep_analysis.length > 0`
- Requires `deep_analysis[]` array and `sessionFolder` from Phase 2

**Trigger conditions**:
- REV-* task in Phase 3 with at least 1 finding triaged for deep analysis

## Strategy

### Delegation Mode

**Mode**: CLI Fan-out (max 2 parallel agents, analysis only)

### Tool Fallback Chain

```
gemini (primary) -> qwen (fallback) -> codex (fallback)
```

### Group Split

```
Group A: Security + Correctness findings -> 1 CLI agent
Group B: Performance + Maintainability findings -> 1 CLI agent
If either group empty -> skip that agent (run single agent only)
```

## Execution Steps

### Step 1: Split Findings into Groups

```javascript
const groupA = deep_analysis.filter(f =>
  f.dimension === 'security' || f.dimension === 'correctness'
)
const groupB = deep_analysis.filter(f =>
  f.dimension === 'performance' || f.dimension === 'maintainability'
)

// Collect all affected files for CLI context
const collectFiles = (group) => [...new Set(
  group.map(f => f.location?.file).filter(Boolean)
)]
const filesA = collectFiles(groupA)
const filesB = collectFiles(groupB)
```

### Step 2: Build CLI Prompts

```javascript
function buildPrompt(group, groupLabel, affectedFiles) {
  const findingsJson = JSON.stringify(group, null, 2)
  const filePattern = affectedFiles.length <= 20
    ? affectedFiles.map(f => `@${f}`).join(' ')
    : '@**/*.{ts,tsx,js,jsx,py,go,java,rs}'

  return `PURPOSE: Deep analysis of ${groupLabel} code findings -- root cause, impact, optimization suggestions.
TASK:
- For each finding: trace root cause (independent issue or symptom of another finding?)
- Identify findings sharing the same root cause -> mark related_findings with their IDs
- Assess impact scope and affected files (blast_radius: function/module/system)
- Propose fix strategy (minimal fix vs refactor) with tradeoff analysis
- Identify fix dependencies (which findings must be fixed first?)
- For each finding add these enrichment fields:
  root_cause: { description: string, related_findings: string[], is_symptom: boolean }
  impact: { scope: "low"|"medium"|"high", affected_files: string[], blast_radius: string }
  optimization: { approach: string, alternative: string, tradeoff: string }
  fix_strategy: "minimal" | "refactor" | "skip"
  fix_complexity: "low" | "medium" | "high"
  fix_dependencies: string[] (finding IDs that must be fixed first)
MODE: analysis
CONTEXT: ${filePattern}
Findings to analyze:
${findingsJson}
EXPECTED: Respond with ONLY a JSON array. Each element is the original finding object with the 6 enrichment fields added. Preserve ALL original fields exactly.
CONSTRAINTS: Preserve original finding fields | Only add enrichment fields | Return raw JSON array only | No markdown wrapping`
}

const promptA = groupA.length > 0
  ? buildPrompt(groupA, 'Security + Correctness', filesA) : null
const promptB = groupB.length > 0
  ? buildPrompt(groupB, 'Performance + Maintainability', filesB) : null
```

### Step 3: Execute CLI Agents (Parallel)

```javascript
function runCli(prompt) {
  const tools = ['gemini', 'qwen', 'codex']
  for (const tool of tools) {
    try {
      const out = Bash(
        `ccw cli -p "${prompt.replace(/"/g, '\\"')}" --tool ${tool} --mode analysis --rule analysis-diagnose-bug-root-cause`,
        { timeout: 300000 }
      )
      return out
    } catch { continue }
  }
  return null  // All tools failed
}

// Run both groups -- if both present, execute via Bash run_in_background for parallelism
let resultA = null, resultB = null

if (promptA && promptB) {
  // Both groups: run in parallel
  // Group A in background
  Bash(`ccw cli -p "${promptA.replace(/"/g, '\\"')}" --tool gemini --mode analysis --rule analysis-diagnose-bug-root-cause > "${sessionFolder}/review/_groupA.txt" 2>&1`,
    { run_in_background: true, timeout: 300000 })
  // Group B synchronous (blocks until done)
  resultB = runCli(promptB)
  // Wait for Group A to finish, then read output
  Bash(`sleep 5`)  // Brief wait if B finished faster
  try { resultA = Read(`${sessionFolder}/review/_groupA.txt`) } catch {}
  // If background failed, try synchronous fallback
  if (!resultA) resultA = runCli(promptA)
} else if (promptA) {
  resultA = runCli(promptA)
} else if (promptB) {
  resultB = runCli(promptB)
}
```

### Step 4: Parse & Merge Results

```javascript
function parseCliOutput(output) {
  if (!output) return []
  try {
    const match = output.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    // Validate enrichment fields exist
    return parsed.filter(f => f.id && f.dimension).map(f => ({
      ...f,
      root_cause: f.root_cause || { description: 'Unknown', related_findings: [], is_symptom: false },
      impact: f.impact || { scope: 'medium', affected_files: [f.location?.file].filter(Boolean), blast_radius: 'module' },
      optimization: f.optimization || { approach: f.suggested_fix || '', alternative: '', tradeoff: '' },
      fix_strategy: ['minimal', 'refactor', 'skip'].includes(f.fix_strategy) ? f.fix_strategy : 'minimal',
      fix_complexity: ['low', 'medium', 'high'].includes(f.fix_complexity) ? f.fix_complexity : 'medium',
      fix_dependencies: Array.isArray(f.fix_dependencies) ? f.fix_dependencies : []
    }))
  } catch { return [] }
}

const enrichedA = parseCliOutput(resultA)
const enrichedB = parseCliOutput(resultB)

// Merge: CLI-enriched findings replace originals, unenriched originals kept as fallback
const enrichedMap = new Map()
for (const f of [...enrichedA, ...enrichedB]) enrichedMap.set(f.id, f)

const enrichedFindings = deep_analysis.map(f =>
  enrichedMap.get(f.id) || {
    ...f,
    root_cause: { description: 'Analysis unavailable', related_findings: [], is_symptom: false },
    impact: { scope: 'medium', affected_files: [f.location?.file].filter(Boolean), blast_radius: 'unknown' },
    optimization: { approach: f.suggested_fix || '', alternative: '', tradeoff: '' },
    fix_strategy: 'minimal',
    fix_complexity: 'medium',
    fix_dependencies: []
  }
)

// Write output
Write(`${sessionFolder}/review/enriched-findings.json`, JSON.stringify(enrichedFindings, null, 2))

// Cleanup temp files
Bash(`rm -f "${sessionFolder}/review/_groupA.txt" "${sessionFolder}/review/_groupB.txt"`)
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| gemini CLI fails | Fallback to qwen, then codex |
| All CLI tools fail for a group | Use original findings with default enrichment |
| CLI output not valid JSON | Attempt regex extraction, else use defaults |
| Background task hangs | Synchronous fallback after timeout |
| One group fails, other succeeds | Merge partial results with defaults |
| Invalid enrichment fields | Apply defaults for missing/invalid fields |
