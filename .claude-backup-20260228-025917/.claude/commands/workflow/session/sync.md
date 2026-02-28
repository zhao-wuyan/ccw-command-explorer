---
name: sync
description: Quick-sync session work to specs/*.md and project-tech
argument-hint: "[-y|--yes] [\"what was done\"]"
allowed-tools: Bash(*), Read(*), Write(*), Edit(*)
---

# Session Sync (/workflow:session:sync)

One-shot update `specs/*.md` + `project-tech.json` from current session context.

**Design**: Scan context → extract → write. No interactive wizards.

## Auto Mode

`--yes` or `-y`: Skip confirmation, auto-write both files.

## Process

```
Step 1: Gather Context
   ├─ git diff --stat HEAD~3..HEAD (recent changes)
   ├─ Active session folder (.workflow/.lite-plan/*) if exists
   └─ User summary ($ARGUMENTS or auto-generate from git log)

Step 2: Extract Updates
   ├─ Guidelines: conventions / constraints / learnings
   └─ Tech: development_index entry

Step 3: Preview & Confirm (skip if --yes)

Step 4: Write both files

Step 5: One-line confirmation
```

## Step 1: Gather Context

```javascript
const autoYes = $ARGUMENTS.includes('--yes') || $ARGUMENTS.includes('-y')
const userSummary = $ARGUMENTS.replace(/--yes|-y/g, '').trim()

// Recent changes
const gitStat = Bash('git diff --stat HEAD~3..HEAD 2>/dev/null || git diff --stat HEAD 2>/dev/null')
const gitLog = Bash('git log --oneline -5')

// Active session (optional)
const sessionFolders = Glob('.workflow/.lite-plan/*/plan.json')
let sessionContext = null
if (sessionFolders.length > 0) {
  const latest = sessionFolders[sessionFolders.length - 1]
  sessionContext = JSON.parse(Read(latest))
}

// Build summary
const summary = userSummary
  || sessionContext?.summary
  || gitLog.split('\n')[0].replace(/^[a-f0-9]+ /, '')
```

## Step 2: Extract Updates

Analyze context and produce two update payloads. Use LLM reasoning (current agent) — no CLI calls.

```javascript
// ── Guidelines extraction ──
// Scan git diff + session for:
//   - New patterns adopted → convention
//   - Restrictions discovered → constraint
//   - Surprises / gotchas → learning
//
// Output: array of { type, category, text }
// RULE: Only extract genuinely reusable insights. Skip trivial/obvious items.
// RULE: Deduplicate against existing guidelines before adding.

// Load existing specs via ccw spec load
const existingSpecs = Bash('ccw spec load --dimension specs 2>/dev/null || echo ""')
const guidelineUpdates = [] // populated by agent analysis

// ── Tech extraction ──
// Build one development_index entry from session work

function detectCategory(text) {
  text = text.toLowerCase()
  if (/\b(fix|bug|error|crash)\b/.test(text)) return 'bugfix'
  if (/\b(refactor|cleanup|reorganize)\b/.test(text)) return 'refactor'
  if (/\b(doc|readme|comment)\b/.test(text)) return 'docs'
  if (/\b(add|new|create|implement)\b/.test(text)) return 'feature'
  return 'enhancement'
}

function detectSubFeature(gitStat) {
  // Most-changed directory from git diff --stat
  const dirs = gitStat.match(/\S+\//g) || []
  const counts = {}
  dirs.forEach(d => {
    const seg = d.split('/').filter(Boolean).slice(-2, -1)[0] || 'general'
    counts[seg] = (counts[seg] || 0) + 1
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general'
}

const techEntry = {
  title: summary.slice(0, 60),
  sub_feature: detectSubFeature(gitStat),
  date: new Date().toISOString().split('T')[0],
  description: summary.slice(0, 100),
  status: 'completed',
  session_id: sessionContext ? sessionFolders[sessionFolders.length - 1].match(/lite-plan\/([^/]+)/)?.[1] : null
}
```

## Step 3: Preview & Confirm

```javascript
// Show preview
console.log(`
── Sync Preview ──

Guidelines (${guidelineUpdates.length} items):
${guidelineUpdates.map(g => `  [${g.type}/${g.category}] ${g.text}`).join('\n') || '  (none)'}

Tech [${detectCategory(summary)}]:
  ${techEntry.title}

Target files:
  .workflow/specs/*.md
  .workflow/project-tech.json
`)

if (!autoYes) {
  const confirm = AskUserQuestion("Apply these updates? (modify/skip items if needed)")
  // User can say "skip guidelines" or "change category to bugfix" etc.
}
```

## Step 4: Write

```javascript
// ── Update specs/*.md ──
if (guidelineUpdates.length > 0) {
  // Map guideline types to spec files
  const specFileMap = {
    convention: '.workflow/specs/coding-conventions.md',
    constraint: '.workflow/specs/architecture-constraints.md',
    learning: '.workflow/specs/coding-conventions.md' // learnings appended to conventions
  }

  for (const g of guidelineUpdates) {
    const targetFile = specFileMap[g.type]
    const existing = Read(targetFile)
    const ruleText = g.type === 'learning'
      ? `- [${g.category}] ${g.text} (learned: ${new Date().toISOString().split('T')[0]})`
      : `- [${g.category}] ${g.text}`

    // Deduplicate: skip if text already in file
    if (!existing.includes(g.text)) {
      const newContent = existing.trimEnd() + '\n' + ruleText + '\n'
      Write(targetFile, newContent)
    }
  }

  // Rebuild spec index after writing
  Bash('ccw spec rebuild')
}

// ── Update project-tech.json ──
const techPath = '.workflow/project-tech.json'
const tech = JSON.parse(Read(techPath))

if (!tech.development_index) {
  tech.development_index = { feature: [], enhancement: [], bugfix: [], refactor: [], docs: [] }
}

const category = detectCategory(summary)
tech.development_index[category].push(techEntry)
tech._metadata.last_updated = new Date().toISOString()

Write(techPath, JSON.stringify(tech, null, 2))
```

## Step 5: Confirm

```
✓ Synced: ${guidelineUpdates.length} guidelines + 1 tech entry [${category}]
```

## Error Handling

| Error | Resolution |
|-------|------------|
| File missing | Create scaffold (same as solidify Step 1) |
| No git history | Use user summary or session context only |
| No meaningful updates | Skip guidelines, still add tech entry |
| Duplicate entry | Skip silently (dedup check in Step 4) |

## Related Commands

- `/workflow:init` - Initialize project with specs scaffold
- `/workflow:init-specs` - Interactive wizard to create individual specs with scope selection
- `/workflow:session:solidify` - Add individual rules one at a time
