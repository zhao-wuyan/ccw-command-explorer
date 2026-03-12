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
//   - Debugging experiences → bug
//   - Reusable code patterns → pattern
//   - Architecture/design decisions → decision
//   - Conventions, constraints, insights → rule
//
// Output: array of { type, tag, text }
//   type: 'bug' | 'pattern' | 'decision' | 'rule'
//   tag: domain tag (api, routing, schema, security, etc.)
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
${guidelineUpdates.map(g => `  [${g.type}:${g.tag}] ${g.text}`).join('\n') || '  (none)'}

Tech [${detectCategory(summary)}]:
  ${techEntry.title}

Target files:
  .ccw/specs/*.md
  .workflow/project-tech.json
`)

if (!autoYes) {
  const confirm = AskUserQuestion("Apply these updates? (modify/skip items if needed)")
  // User can say "skip guidelines" or "change category to bugfix" etc.
}
```

## Step 4: Write

```javascript
const matter = require('gray-matter')  // YAML frontmatter parser

// ── Frontmatter check & repair helper ──
// Ensures target spec file has valid YAML frontmatter with keywords
// Uses gray-matter for robust parsing (handles malformed frontmatter, missing fields)
function ensureFrontmatter(filePath, tag, type) {
  const titleMap = {
    'coding-conventions': 'Coding Conventions',
    'architecture-constraints': 'Architecture Constraints',
    'learnings': 'Learnings',
    'quality-rules': 'Quality Rules'
  }
  const basename = filePath.split('/').pop().replace('.md', '')
  const title = titleMap[basename] || basename
  const defaultFm = {
    title,
    readMode: 'optional',
    priority: 'medium',
    scope: 'project',
    dimension: 'specs',
    keywords: [tag, type]
  }

  if (!file_exists(filePath)) {
    // Case A: Create new file with frontmatter
    Write(filePath, matter.stringify(`\n# ${title}\n\n`, defaultFm))
    return
  }

  const raw = Read(filePath)
  let parsed
  try {
    parsed = matter(raw)
  } catch {
    parsed = { data: {}, content: raw }
  }

  const hasFrontmatter = raw.trimStart().startsWith('---')

  if (!hasFrontmatter) {
    // Case B: File exists but no frontmatter → prepend
    Write(filePath, matter.stringify(raw, defaultFm))
    return
  }

  // Case C: Frontmatter exists → ensure keywords include current tag
  const existingKeywords = parsed.data.keywords || []
  const newKeywords = [...new Set([...existingKeywords, tag, type])]

  if (newKeywords.length !== existingKeywords.length) {
    parsed.data.keywords = newKeywords
    Write(filePath, matter.stringify(parsed.content, parsed.data))
  }
}

// ── Update specs/*.md ──
// Uses .ccw/specs/ directory - unified [type:tag] entry format
if (guidelineUpdates.length > 0) {
  // Map knowledge types to spec files
  const specFileMap = {
    bug: '.ccw/specs/learnings.md',
    pattern: '.ccw/specs/coding-conventions.md',
    decision: '.ccw/specs/architecture-constraints.md',
    rule: null // determined by content below
  }

  const date = new Date().toISOString().split('T')[0]
  const needsDate = { bug: true, pattern: true, decision: true, rule: false }

  for (const g of guidelineUpdates) {
    // For rule type, route by content and tag
    let targetFile = specFileMap[g.type]
    if (!targetFile) {
      const isQuality = /\b(test|coverage|lint|eslint|质量|测试覆盖|pre-commit|tsc|type.check)\b/i.test(g.text)
        || ['testing', 'quality', 'lint'].includes(g.tag)
      const isConstraint = /\b(禁止|no|never|must not|forbidden|不得|不允许)\b/i.test(g.text)
      if (isQuality) {
        targetFile = '.ccw/specs/quality-rules.md'
      } else if (isConstraint) {
        targetFile = '.ccw/specs/architecture-constraints.md'
      } else {
        targetFile = '.ccw/specs/coding-conventions.md'
      }
    }

    // Ensure frontmatter exists and keywords are up-to-date
    ensureFrontmatter(targetFile, g.tag, g.type)

    const existing = Read(targetFile)
    const entryLine = needsDate[g.type]
      ? `- [${g.type}:${g.tag}] ${g.text} (${date})`
      : `- [${g.type}:${g.tag}] ${g.text}`

    // Deduplicate: skip if text already in file
    if (!existing.includes(g.text)) {
      const newContent = existing.trimEnd() + '\n' + entryLine + '\n'
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
| File missing | Create scaffold (same as spec:setup Step 4) |
| No git history | Use user summary or session context only |
| No meaningful updates | Skip guidelines, still add tech entry |
| Duplicate entry | Skip silently (dedup check in Step 4) |

## Related Commands

- `/workflow:spec:setup` - Initialize project with specs scaffold
- `/workflow:spec:add` - Add knowledge entries (bug/pattern/decision/rule) with unified [type:tag] format
- `/workflow:spec:load` - Interactive spec loader with keyword/type/tag filtering
