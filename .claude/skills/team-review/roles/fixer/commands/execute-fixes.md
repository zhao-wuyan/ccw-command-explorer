# Command: execute-fixes

> Applies fixes from fix-plan.json via code-developer subagents. Quick path = 1 agent; standard = 1 agent per group.

## When to Use

- Phase 3B of Fixer, after plan-fixes
- Requires: `${sessionFolder}/fix/fix-plan.json`, `sessionFolder`, `projectRoot`

## Strategy

**Mode**: Sequential Delegation (code-developer agents via Task)

```
quick_path=true  -> 1 agent, all findings sequentially
quick_path=false -> 1 agent per group, groups in execution_order
```

## Execution Steps

### Step 1: Load Plan + Helpers

```javascript
const fixPlan = JSON.parse(Read(`${sessionFolder}/fix/fix-plan.json`))
const { groups, execution_order, quick_path: isQuickPath } = fixPlan
const results = { fixed: [], failed: [], skipped: [] }

// --- Agent prompt builder ---
function buildAgentPrompt(findings, files) {
  const fileContents = {}
  for (const file of files) { try { fileContents[file] = Read(file) } catch {} }

  const fDesc = findings.map((f, i) => {
    const fix = f.suggested_fix || f.optimization?.approach || '(no suggestion)'
    const deps = (f.fix_dependencies||[]).length ? `\nDepends on: ${f.fix_dependencies.join(', ')}` : ''
    return `### ${i+1}. ${f.id} [${f.severity}]\n**File**: ${f.location?.file}:${f.location?.line}\n**Title**: ${f.title}\n**Desc**: ${f.description}\n**Strategy**: ${f.fix_strategy||'minimal'}\n**Fix**: ${fix}${deps}`
  }).join('\n\n')

  const fContent = Object.entries(fileContents)
    .filter(([,c]) => c).map(([f,c]) => `### ${f}\n\`\`\`\n${String(c).slice(0,8000)}\n\`\`\``).join('\n\n')

  return `You are a code fixer agent. Apply fixes to the codebase.

## CRITICAL RULES
1. Apply each fix using Edit tool, in the order given (dependency-sorted)
2. After each fix, run related tests: tests/**/{filename}.test.* or *_test.*
3. Tests PASS -> finding is "fixed"
4. Tests FAIL -> revert: Bash("git checkout -- {file}") -> mark "failed" -> continue
5. Do NOT retry failed fixes with different strategy. Rollback and move on.
6. If a finding depends on a previously failed finding, mark "skipped"

## Findings (in order)
${fDesc}

## File Contents
${fContent}

## Required Output
After ALL findings, output JSON:
\`\`\`json
{"results":[{"id":"SEC-001","status":"fixed","file":"src/a.ts"},{"id":"COR-002","status":"failed","file":"src/b.ts","error":"reason"}]}
\`\`\`
Process each finding now. Rollback on failure, never retry.`
}

// --- Result parser ---
function parseAgentResults(output, findings) {
  const failedIds = new Set()
  let parsed = []
  try {
    const m = (output||'').match(/```json\s*\n?([\s\S]*?)\n?```/)
    if (m) { const j = JSON.parse(m[1]); parsed = j.results || j || [] }
  } catch {}

  if (parsed.length > 0) {
    for (const r of parsed) {
      const f = findings.find(x => x.id === r.id); if (!f) continue
      if (r.status === 'fixed') results.fixed.push({...f})
      else if (r.status === 'failed') { results.failed.push({...f, error: r.error||'unknown'}); failedIds.add(r.id) }
      else if (r.status === 'skipped') { results.skipped.push({...f, error: r.error||'dep failed'}); failedIds.add(r.id) }
    }
  } else {
    // Fallback: check git diff per file
    for (const f of findings) {
      const file = f.location?.file
      if (!file) { results.skipped.push({...f, error:'no file'}); continue }
      const diff = Bash(`git diff --name-only -- "${file}" 2>/dev/null`).trim()
      if (diff) results.fixed.push({...f})
      else { results.failed.push({...f, error:'no changes detected'}); failedIds.add(f.id) }
    }
  }
  // Catch unprocessed findings
  const done = new Set([...results.fixed,...results.failed,...results.skipped].map(x=>x.id))
  for (const f of findings) {
    if (done.has(f.id)) continue
    if ((f.fix_dependencies||[]).some(d => failedIds.has(d)))
      results.skipped.push({...f, error:'dependency failed'})
    else results.failed.push({...f, error:'not processed'})
  }
}
```

### Step 2: Execute

```javascript
if (isQuickPath) {
  // Single agent for all findings
  const group = groups[0]
  const prompt = buildAgentPrompt(group.findings, group.files)
  const out = Task({ subagent_type:"code-developer", prompt, run_in_background:false })
  parseAgentResults(out, group.findings)
} else {
  // One agent per group in execution_order
  const completedGroups = new Set()

  // Build group dependency map
  const groupDeps = {}
  for (const g of groups) {
    groupDeps[g.id] = new Set()
    for (const f of g.findings) {
      for (const depId of (f.fix_dependencies||[])) {
        const dg = groups.find(x => x.findings.some(fx => fx.id === depId))
        if (dg && dg.id !== g.id) groupDeps[g.id].add(dg.id)
      }
    }
  }

  for (const gid of execution_order) {
    const group = groups.find(g => g.id === gid)
    if (!group) continue

    const prompt = buildAgentPrompt(group.findings, group.files)
    const out = Task({ subagent_type:"code-developer", prompt, run_in_background:false })
    parseAgentResults(out, group.findings)
    completedGroups.add(gid)

    Write(`${sessionFolder}/fix/fix-progress.json`, JSON.stringify({
      completed_groups:[...completedGroups],
      results_so_far:{fixed:results.fixed.length, failed:results.failed.length}
    }, null, 2))

    mcp__ccw-tools__team_msg({ operation:"log", team:"team-review", from:"fixer",
      to:"coordinator", type:"fix_progress",
      summary:`[fixer] Group ${gid}: ${results.fixed.length} fixed, ${results.failed.length} failed` })
  }
}
```

### Step 3: Write Results

```javascript
Write(`${sessionFolder}/fix/execution-results.json`, JSON.stringify(results, null, 2))
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Agent crashes | Mark group findings as failed, continue next group |
| Test failure after fix | Rollback (`git checkout -- {file}`), mark failed, continue |
| No structured output | Fallback to git diff detection |
| Dependency failed | Skip dependent findings automatically |
| fix-plan.json missing | Report error, write empty results |
