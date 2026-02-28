# Command: toolchain-scan

> Parallel static analysis tool execution. Detects available tools, runs concurrently, normalizes output into standardized findings.

## When to Use

- Phase 3 of Scanner, Standard mode, Step A
- At least one tool detected in Phase 2
- Quick mode does NOT use this command

## Strategy

### Delegation Mode

**Mode**: Direct (Bash parallel execution)

## Execution Steps

### Step 1: Build Tool Commands

```javascript
if (!Object.values(toolchain).some(Boolean)) {
  Write(`${sessionFolder}/scan/toolchain-findings.json`, '[]')
  return
}

const tmpDir = `${sessionFolder}/scan/tmp`
Bash(`mkdir -p "${tmpDir}"`)

const cmds = []

if (toolchain.tsc)
  cmds.push(`(cd "${projectRoot}" && npx tsc --noEmit --pretty false 2>&1 | head -500 > "${tmpDir}/tsc.txt") &`)
if (toolchain.eslint)
  cmds.push(`(cd "${projectRoot}" && npx eslint "${target}" --format json --no-error-on-unmatched-pattern 2>/dev/null | head -5000 > "${tmpDir}/eslint.json") &`)
if (toolchain.semgrep)
  cmds.push(`(cd "${projectRoot}" && semgrep --config auto --json "${target}" 2>/dev/null | head -5000 > "${tmpDir}/semgrep.json") &`)
if (toolchain.ruff)
  cmds.push(`(cd "${projectRoot}" && ruff check "${target}" --output-format json 2>/dev/null | head -5000 > "${tmpDir}/ruff.json") &`)
if (toolchain.mypy)
  cmds.push(`(cd "${projectRoot}" && mypy "${target}" --output json 2>/dev/null | head -2000 > "${tmpDir}/mypy.txt") &`)
if (toolchain.npmAudit)
  cmds.push(`(cd "${projectRoot}" && npm audit --json 2>/dev/null | head -5000 > "${tmpDir}/audit.json") &`)
```

### Step 2: Parallel Execution

```javascript
Bash(cmds.join('\n') + '\nwait', { timeout: 300000 })
```

### Step 3: Parse Tool Outputs

Each parser normalizes to: `{ dimension, category, severity, title, description, location:{file,line,end_line,code_snippet}, source, tool_rule, suggested_fix, effort, confidence }`

```javascript
const findings = []

// --- tsc: file(line,col): error TSxxxx: message ---
if (toolchain.tsc) {
  try {
    const out = Read(`${tmpDir}/tsc.txt`)
    const re = /^(.+)\((\d+),\d+\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/gm
    let m; while ((m = re.exec(out)) !== null) {
      findings.push({
        dimension: 'correctness', category: 'type-safety',
        severity: m[3] === 'error' ? 'high' : 'medium',
        title: `tsc ${m[4]}: ${m[5].slice(0,80)}`, description: m[5],
        location: { file: m[1], line: +m[2] },
        source: 'tool:tsc', tool_rule: m[4], suggested_fix: '',
        effort: 'low', confidence: 'high'
      })
    }
  } catch {}
}

// --- eslint: JSON array of {filePath, messages[{severity,ruleId,message,line}]} ---
if (toolchain.eslint) {
  try {
    const data = JSON.parse(Read(`${tmpDir}/eslint.json`))
    for (const f of data) for (const msg of (f.messages || [])) {
      const isErr = msg.severity === 2
      findings.push({
        dimension: isErr ? 'correctness' : 'maintainability',
        category: isErr ? 'bug' : 'code-smell',
        severity: isErr ? 'high' : 'medium',
        title: `eslint ${msg.ruleId || '?'}: ${(msg.message||'').slice(0,80)}`,
        description: msg.message || '',
        location: { file: f.filePath, line: msg.line || 1, end_line: msg.endLine, code_snippet: msg.source || '' },
        source: 'tool:eslint', tool_rule: msg.ruleId || null,
        suggested_fix: msg.fix ? 'Auto-fixable' : '', effort: msg.fix ? 'low' : 'medium', confidence: 'high'
      })
    }
  } catch {}
}

// --- semgrep: {results[{path,start:{line},end:{line},check_id,extra:{severity,message,fix,lines}}]} ---
if (toolchain.semgrep) {
  try {
    const data = JSON.parse(Read(`${tmpDir}/semgrep.json`))
    const smap = { ERROR:'high', WARNING:'medium', INFO:'low' }
    for (const r of (data.results || [])) {
      findings.push({
        dimension: 'security', category: r.check_id?.split('.').pop() || 'generic',
        severity: smap[r.extra?.severity] || 'medium',
        title: `semgrep: ${(r.extra?.message || r.check_id || '').slice(0,80)}`,
        description: r.extra?.message || '', location: { file: r.path, line: r.start?.line || 1, end_line: r.end?.line, code_snippet: r.extra?.lines || '' },
        source: 'tool:semgrep', tool_rule: r.check_id || null,
        suggested_fix: r.extra?.fix || '', effort: 'medium', confidence: smap[r.extra?.severity] === 'high' ? 'high' : 'medium'
      })
    }
  } catch {}
}

// --- ruff: [{code,message,filename,location:{row},end_location:{row},fix}] ---
if (toolchain.ruff) {
  try {
    const data = JSON.parse(Read(`${tmpDir}/ruff.json`))
    for (const item of data) {
      const code = item.code || ''
      const dim = code.startsWith('S') ? 'security' : (code.startsWith('F') || code.startsWith('B')) ? 'correctness' : 'maintainability'
      findings.push({
        dimension: dim, category: dim === 'security' ? 'input-validation' : dim === 'correctness' ? 'bug' : 'code-smell',
        severity: (code.startsWith('S') || code.startsWith('F')) ? 'high' : 'medium',
        title: `ruff ${code}: ${(item.message||'').slice(0,80)}`, description: item.message || '',
        location: { file: item.filename, line: item.location?.row || 1, end_line: item.end_location?.row },
        source: 'tool:ruff', tool_rule: code, suggested_fix: item.fix?.message || '',
        effort: item.fix ? 'low' : 'medium', confidence: 'high'
      })
    }
  } catch {}
}

// --- npm audit: {vulnerabilities:{name:{severity,title,fixAvailable,via}}} ---
if (toolchain.npmAudit) {
  try {
    const data = JSON.parse(Read(`${tmpDir}/audit.json`))
    const smap = { critical:'critical', high:'high', moderate:'medium', low:'low', info:'info' }
    for (const [,v] of Object.entries(data.vulnerabilities || {})) {
      findings.push({
        dimension: 'security', category: 'dependency', severity: smap[v.severity] || 'medium',
        title: `npm audit: ${v.name} - ${(v.title || '').slice(0,80)}`,
        description: v.title || `Vulnerable: ${v.name}`,
        location: { file: 'package.json', line: 1 },
        source: 'tool:npm-audit', tool_rule: null,
        suggested_fix: v.fixAvailable ? 'npm audit fix' : 'Manual resolution',
        effort: v.fixAvailable ? 'low' : 'high', confidence: 'high'
      })
    }
  } catch {}
}

// --- mypy: file:line: error: message [code] ---
if (toolchain.mypy) {
  try {
    const out = Read(`${tmpDir}/mypy.txt`)
    const re = /^(.+):(\d+):\s+(error|warning):\s+(.+?)(?:\s+\[(\w[\w-]*)\])?$/gm
    let m; while ((m = re.exec(out)) !== null) {
      if (m[3] === 'note') continue
      findings.push({
        dimension: 'correctness', category: 'type-safety',
        severity: m[3] === 'error' ? 'high' : 'medium',
        title: `mypy${m[5] ? ` [${m[5]}]` : ''}: ${m[4].slice(0,80)}`, description: m[4],
        location: { file: m[1], line: +m[2] },
        source: 'tool:mypy', tool_rule: m[5] || null, suggested_fix: '',
        effort: 'low', confidence: 'high'
      })
    }
  } catch {}
}
```

### Step 4: Write Output

```javascript
Write(`${sessionFolder}/scan/toolchain-findings.json`, JSON.stringify(findings, null, 2))
Bash(`rm -rf "${tmpDir}"`)
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Tool not found at runtime | Skip gracefully, continue with others |
| Tool times out (>5 min) | Killed by `wait` timeout, partial output used |
| Tool output unparseable | try/catch skips that tool's findings |
| All tools fail | Empty array written, semantic-scan covers all dimensions |
