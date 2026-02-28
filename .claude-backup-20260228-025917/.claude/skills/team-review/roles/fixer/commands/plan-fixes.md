# Command: plan-fixes

> Deterministic grouping algorithm. Groups findings by file, merges dependent groups, topological sorts within groups, writes fix-plan.json.

## When to Use

- Phase 3A of Fixer, after context resolution
- Requires: `fixableFindings[]`, `sessionFolder`, `quickPath` from Phase 2

**Trigger conditions**:
- FIX-* task in Phase 3 with at least 1 fixable finding

## Strategy

**Mode**: Direct (inline execution, deterministic algorithm, no CLI needed)

## Execution Steps

### Step 1: Group Findings by Primary File

```javascript
const fileGroups = {}
for (const f of fixableFindings) {
  const file = f.location?.file || '_unknown'
  if (!fileGroups[file]) fileGroups[file] = []
  fileGroups[file].push(f)
}
```

### Step 2: Merge Groups with Cross-File Dependencies

```javascript
// Build adjacency: if finding A (group X) depends on finding B (group Y), merge X into Y
const findingFileMap = {}
for (const f of fixableFindings) {
  findingFileMap[f.id] = f.location?.file || '_unknown'
}

// Union-Find for group merging
const parent = {}
const find = (x) => parent[x] === x ? x : (parent[x] = find(parent[x]))
const union = (a, b) => { parent[find(a)] = find(b) }

const allFiles = Object.keys(fileGroups)
for (const file of allFiles) parent[file] = file

for (const f of fixableFindings) {
  const myFile = f.location?.file || '_unknown'
  for (const depId of (f.fix_dependencies || [])) {
    const depFile = findingFileMap[depId]
    if (depFile && depFile !== myFile) {
      union(myFile, depFile)
    }
  }
}

// Collect merged groups
const mergedGroupMap = {}
for (const file of allFiles) {
  const root = find(file)
  if (!mergedGroupMap[root]) mergedGroupMap[root] = { files: [], findings: [] }
  mergedGroupMap[root].files.push(file)
  mergedGroupMap[root].findings.push(...fileGroups[file])
}

// Deduplicate files
for (const g of Object.values(mergedGroupMap)) {
  g.files = [...new Set(g.files)]
}
```

### Step 3: Topological Sort Within Each Group

```javascript
function topoSort(findings) {
  const idSet = new Set(findings.map(f => f.id))
  const inDegree = {}
  const adj = {}
  for (const f of findings) {
    inDegree[f.id] = 0
    adj[f.id] = []
  }
  for (const f of findings) {
    for (const depId of (f.fix_dependencies || [])) {
      if (idSet.has(depId)) {
        adj[depId].push(f.id)
        inDegree[f.id]++
      }
    }
  }

  const queue = findings.filter(f => inDegree[f.id] === 0).map(f => f.id)
  const sorted = []
  while (queue.length > 0) {
    const id = queue.shift()
    sorted.push(id)
    for (const next of adj[id]) {
      inDegree[next]--
      if (inDegree[next] === 0) queue.push(next)
    }
  }

  // Handle cycles: append any unsorted findings at the end
  const sortedSet = new Set(sorted)
  for (const f of findings) {
    if (!sortedSet.has(f.id)) sorted.push(f.id)
  }

  const findingMap = Object.fromEntries(findings.map(f => [f.id, f]))
  return sorted.map(id => findingMap[id])
}

const groups = Object.entries(mergedGroupMap).map(([root, g], i) => {
  const sorted = topoSort(g.findings)
  const maxSev = sorted.reduce((max, f) => {
    const ord = { critical: 0, high: 1, medium: 2, low: 3 }
    return (ord[f.severity] ?? 4) < (ord[max] ?? 4) ? f.severity : max
  }, 'low')
  return {
    id: `G${i + 1}`,
    files: g.files,
    findings: sorted,
    max_severity: maxSev
  }
})
```

### Step 4: Sort Groups by Max Severity

```javascript
const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }
groups.sort((a, b) => (SEV_ORDER[a.max_severity] ?? 4) - (SEV_ORDER[b.max_severity] ?? 4))

// Re-assign IDs after sort
groups.forEach((g, i) => { g.id = `G${i + 1}` })

const execution_order = groups.map(g => g.id)
```

### Step 5: Determine Execution Path

```javascript
const totalFindings = fixableFindings.length
const totalGroups = groups.length
const isQuickPath = totalFindings <= 5 && totalGroups <= 1
```

### Step 6: Write fix-plan.json

```javascript
const fixPlan = {
  plan_id: `fix-plan-${Date.now()}`,
  quick_path: isQuickPath,
  groups: groups.map(g => ({
    id: g.id,
    files: g.files,
    findings: g.findings.map(f => ({
      id: f.id, severity: f.severity, dimension: f.dimension,
      title: f.title, description: f.description,
      location: f.location, suggested_fix: f.suggested_fix,
      fix_strategy: f.fix_strategy, fix_complexity: f.fix_complexity,
      fix_dependencies: f.fix_dependencies,
      root_cause: f.root_cause, optimization: f.optimization
    })),
    max_severity: g.max_severity
  })),
  execution_order: execution_order,
  total_findings: totalFindings,
  total_groups: totalGroups
}

Bash(`mkdir -p "${sessionFolder}/fix"`)
Write(`${sessionFolder}/fix/fix-plan.json`, JSON.stringify(fixPlan, null, 2))

mcp__ccw-tools__team_msg({ operation:"log", team:"team-review", from:"fixer",
  to:"coordinator", type:"fix_progress",
  summary:`[fixer] Fix plan: ${totalGroups} groups, ${totalFindings} findings, path=${isQuickPath ? 'quick' : 'standard'}` })
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| All findings share one file | Single group, likely quick path |
| Dependency cycle detected | Topo sort appends cycle members at end |
| Finding references unknown dependency | Ignore that dependency edge |
| Empty fixableFindings | Should not reach this command (checked in Phase 2) |
