# Command: generate-report

> Cross-correlate enriched + pass-through findings, compute metrics, write review-report.json (for fixer) and review-report.md (for humans).

## When to Use

- Phase 4 of Reviewer, after deep analysis (or directly if deep_analysis was empty)
- Requires: `enrichedFindings[]` (from Phase 3 or empty), `pass_through[]` (from Phase 2), `sessionFolder`

## Strategy

**Mode**: Direct (inline execution, no CLI needed)

## Execution Steps

### Step 1: Load & Combine Findings

```javascript
let enrichedFindings = []
try { enrichedFindings = JSON.parse(Read(`${sessionFolder}/review/enriched-findings.json`)) } catch {}
const allFindings = [...enrichedFindings, ...pass_through]
```

### Step 2: Cross-Correlate

```javascript
// 2a: Critical files (file appears in >=2 dimensions)
const fileDimMap = {}
for (const f of allFindings) {
  const file = f.location?.file; if (!file) continue
  if (!fileDimMap[file]) fileDimMap[file] = new Set()
  fileDimMap[file].add(f.dimension)
}
const critical_files = Object.entries(fileDimMap)
  .filter(([, dims]) => dims.size >= 2)
  .map(([file, dims]) => ({
    file, dimensions: [...dims],
    finding_count: allFindings.filter(f => f.location?.file === file).length,
    severities: [...new Set(allFindings.filter(f => f.location?.file === file).map(f => f.severity))]
  })).sort((a, b) => b.finding_count - a.finding_count)

// 2b: Group by shared root cause
const rootCauseGroups = [], grouped = new Set()
for (const f of allFindings) {
  if (grouped.has(f.id)) continue
  const related = (f.root_cause?.related_findings || []).filter(rid => !grouped.has(rid))
  if (related.length > 0) {
    const ids = [f.id, ...related]; ids.forEach(id => grouped.add(id))
    rootCauseGroups.push({ root_cause: f.root_cause?.description || f.title,
      finding_ids: ids, primary_id: f.id, dimension: f.dimension, severity: f.severity })
  }
}

// 2c: Optimization suggestions from root cause groups + standalone enriched
const optimization_suggestions = []
for (const group of rootCauseGroups) {
  const p = allFindings.find(f => f.id === group.primary_id)
  if (p?.optimization?.approach) {
    optimization_suggestions.push({ title: `Fix root cause: ${group.root_cause}`,
      approach: p.optimization.approach, alternative: p.optimization.alternative || '',
      tradeoff: p.optimization.tradeoff || '', affected_findings: group.finding_ids,
      fix_strategy: p.fix_strategy || 'minimal', fix_complexity: p.fix_complexity || 'medium',
      estimated_impact: `Resolves ${group.finding_ids.length} findings` })
  }
}
for (const f of enrichedFindings) {
  if (grouped.has(f.id) || !f.optimization?.approach || f.severity === 'low' || f.severity === 'info') continue
  optimization_suggestions.push({ title: `${f.id}: ${f.title}`,
    approach: f.optimization.approach, alternative: f.optimization.alternative || '',
    tradeoff: f.optimization.tradeoff || '', affected_findings: [f.id],
    fix_strategy: f.fix_strategy || 'minimal', fix_complexity: f.fix_complexity || 'medium',
    estimated_impact: 'Resolves 1 finding' })
}

// 2d: Metrics
const by_dimension = {}, by_severity = {}, dimension_severity_matrix = {}
for (const f of allFindings) {
  by_dimension[f.dimension] = (by_dimension[f.dimension] || 0) + 1
  by_severity[f.severity] = (by_severity[f.severity] || 0) + 1
  if (!dimension_severity_matrix[f.dimension]) dimension_severity_matrix[f.dimension] = {}
  dimension_severity_matrix[f.dimension][f.severity] = (dimension_severity_matrix[f.dimension][f.severity] || 0) + 1
}
const fixable = allFindings.filter(f => f.fix_strategy !== 'skip')
const autoFixable = fixable.filter(f => f.fix_complexity === 'low' && f.fix_strategy === 'minimal')
```

### Step 3: Write review-report.json

```javascript
const reviewReport = {
  review_id: `rev-${Date.now()}`, review_date: new Date().toISOString(),
  findings: allFindings, critical_files, optimization_suggestions, root_cause_groups: rootCauseGroups,
  summary: { total: allFindings.length, deep_analyzed: enrichedFindings.length,
    pass_through: pass_through.length, by_dimension, by_severity, dimension_severity_matrix,
    fixable_count: fixable.length, auto_fixable_count: autoFixable.length,
    critical_file_count: critical_files.length, optimization_count: optimization_suggestions.length }
}
Bash(`mkdir -p "${sessionFolder}/review"`)
Write(`${sessionFolder}/review/review-report.json`, JSON.stringify(reviewReport, null, 2))
```

### Step 4: Write review-report.md

```javascript
const dims = ['security','correctness','performance','maintainability']
const sevs = ['critical','high','medium','low','info']
const S = reviewReport.summary

// Dimension x Severity matrix
let mx = '| Dimension | Critical | High | Medium | Low | Info | Total |\n|---|---|---|---|---|---|---|\n'
for (const d of dims) {
  mx += `| ${d} | ${sevs.map(s => dimension_severity_matrix[d]?.[s]||0).join(' | ')} | ${by_dimension[d]||0} |\n`
}
mx += `| **Total** | ${sevs.map(s => by_severity[s]||0).join(' | ')} | **${S.total}** |\n`

// Critical+High findings table
const ch = allFindings.filter(f => f.severity==='critical'||f.severity==='high')
  .sort((a,b) => (a.severity==='critical'?0:1)-(b.severity==='critical'?0:1))
let ft = '| ID | Sev | Dim | File:Line | Title | Fix |\n|---|---|---|---|---|---|\n'
if (ch.length) ch.forEach(f => { ft += `| ${f.id} | ${f.severity} | ${f.dimension} | ${f.location?.file}:${f.location?.line} | ${f.title} | ${f.fix_strategy||'-'} |\n` })
else ft += '| - | - | - | - | No critical/high findings | - |\n'

// Optimization suggestions
let os = optimization_suggestions.map((o,i) =>
  `### ${i+1}. ${o.title}\n- **Approach**: ${o.approach}\n${o.tradeoff?`- **Tradeoff**: ${o.tradeoff}\n`:''}- **Strategy**: ${o.fix_strategy} | **Complexity**: ${o.fix_complexity} | ${o.estimated_impact}`
).join('\n\n') || '_No optimization suggestions._'

// Critical files
const cf = critical_files.slice(0,10).map(c =>
  `- **${c.file}** (${c.finding_count} findings, dims: ${c.dimensions.join(', ')})`
).join('\n') || '_No critical files._'

// Fix scope
const fs = [
  by_severity.critical ? `${by_severity.critical} critical (must fix)` : '',
  by_severity.high ? `${by_severity.high} high (should fix)` : '',
  autoFixable.length ? `${autoFixable.length} auto-fixable (low effort)` : ''
].filter(Boolean).map(s => `- ${s}`).join('\n') || '- No actionable findings.'

Write(`${sessionFolder}/review/review-report.md`,
`# Review Report

**ID**: ${reviewReport.review_id} | **Date**: ${reviewReport.review_date}
**Findings**: ${S.total} | **Fixable**: ${S.fixable_count} | **Auto-fixable**: ${S.auto_fixable_count}

## Executive Summary
- Deep analyzed: ${S.deep_analyzed} | Pass-through: ${S.pass_through}
- Critical files: ${S.critical_file_count} | Optimizations: ${S.optimization_count}

## Metrics Matrix
${mx}
## Critical & High Findings
${ft}
## Critical Files
${cf}

## Optimization Suggestions
${os}

## Recommended Fix Scope
${fs}

**Total fixable**: ${S.fixable_count} / ${S.total}
`)
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Enriched findings missing | Use empty array, report pass_through only |
| JSON parse failure | Log warning, use raw findings |
| Session folder missing | Create review subdir via mkdir |
| Empty allFindings | Write minimal "clean" report |
