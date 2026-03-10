---
name: load
description: Interactive spec loader - ask what user needs, then load relevant specs by keyword routing
argument-hint: "[--all] [--type <bug|pattern|decision|rule>] [--tag <tag>] [\"keyword query\"]"
examples:
  - /workflow:spec:load
  - /workflow:spec:load "api routing"
  - /workflow:spec:load --type bug
  - /workflow:spec:load --all
  - /workflow:spec:load --tag security
---

# Spec Load Command (/workflow:spec:load)

## Overview

Interactive entry point for loading and browsing project specs. Asks the user what they need, then routes to the appropriate spec content based on keywords, type filters, or tag filters.

**Design**: Menu-driven → keyword match → load & display. No file modifications.

**Note**: This command may be called by other workflow commands. Upon completion, return immediately to continue the calling workflow.

## Usage
```bash
/workflow:spec:load                    # Interactive menu
/workflow:spec:load "api routing"      # Direct keyword search
/workflow:spec:load --type bug         # Filter by knowledge type
/workflow:spec:load --tag security     # Filter by domain tag
/workflow:spec:load --all              # Load all specs
```

## Execution Process

```
Input Parsing:
   ├─ Parse --all flag → loadAll = true | false
   ├─ Parse --type (bug|pattern|decision|rule)
   ├─ Parse --tag (domain tag)
   └─ Parse keyword query (positional text)

Decision:
   ├─ --all → Load all specs (Path C)
   ├─ --type or --tag or keyword → Direct filter (Path B)
   └─ No args → Interactive menu (Path A)

Path A: Interactive Menu
   ├─ Step A1: Ask user intent
   ├─ Step A2: Route to action
   └─ Step A3: Display results

Path B: Direct Filter
   ├─ Step B1: Build filter from args
   ├─ Step B2: Search specs
   └─ Step B3: Display results

Path C: Load All
   └─ Display all spec contents

Output:
   └─ Formatted spec entries matching user query
```

## Implementation

### Step 1: Parse Input

```javascript
const args = $ARGUMENTS
const argsLower = args.toLowerCase()

const loadAll = argsLower.includes('--all')
const hasType = argsLower.includes('--type')
const hasTag = argsLower.includes('--tag')

let type = hasType ? args.match(/--type\s+(\w+)/i)?.[1]?.toLowerCase() : null
let tag = hasTag ? args.match(/--tag\s+([\w-]+)/i)?.[1]?.toLowerCase() : null

// Extract keyword query (everything that's not a flag)
let keyword = args
  .replace(/--type\s+\w+/gi, '')
  .replace(/--tag\s+[\w-]+/gi, '')
  .replace(/--all/gi, '')
  .replace(/^["']|["']$/g, '')
  .trim()

// Validate type
if (type && !['bug', 'pattern', 'decision', 'rule'].includes(type)) {
  console.log("Invalid type. Use 'bug', 'pattern', 'decision', or 'rule'.")
  return
}
```

### Step 2: Determine Mode

```javascript
const useInteractive = !loadAll && !hasType && !hasTag && !keyword
```

### Path A: Interactive Menu

```javascript
if (useInteractive) {
  const answer = AskUserQuestion({
    questions: [{
      question: "What specs would you like to load?",
      header: "Action",
      multiSelect: false,
      options: [
        {
          label: "Browse all specs",
          description: "Load and display all project spec entries"
        },
        {
          label: "Search by keyword",
          description: "Find specs matching a keyword (e.g., api, security, routing)"
        },
        {
          label: "View bug experiences",
          description: "Load all [bug:*] debugging experience entries"
        },
        {
          label: "View code patterns",
          description: "Load all [pattern:*] reusable code pattern entries"
        }
      ]
    }]
  })

  const choice = answer.answers["Action"]

  if (choice === "Browse all specs") {
    loadAll = true
  } else if (choice === "View bug experiences") {
    type = "bug"
  } else if (choice === "View code patterns") {
    type = "pattern"
  } else if (choice === "Search by keyword") {
    // Ask for keyword
    const kwAnswer = AskUserQuestion({
      questions: [{
        question: "Enter keyword(s) to search for:",
        header: "Keyword",
        multiSelect: false,
        options: [
          { label: "api", description: "API endpoints, HTTP, REST, routing" },
          { label: "security", description: "Authentication, authorization, input validation" },
          { label: "arch", description: "Architecture, design patterns, module structure" },
          { label: "perf", description: "Performance, caching, optimization" }
        ]
      }]
    })
    keyword = kwAnswer.answers["Keyword"].toLowerCase()
  } else {
    // "Other" — user typed custom input, use as keyword
    keyword = choice.toLowerCase()
  }
}
```

### Step 3: Load Spec Files

```javascript
// Discover all spec files
const specFiles = [
  '.ccw/specs/coding-conventions.md',
  '.ccw/specs/architecture-constraints.md',
  '.ccw/specs/learnings.md',
  '.ccw/specs/quality-rules.md'
]

// Also check personal specs
const personalFiles = [
  '~/.ccw/personal/conventions.md',
  '~/.ccw/personal/constraints.md',
  '~/.ccw/personal/learnings.md',
  '.ccw/personal/conventions.md',
  '.ccw/personal/constraints.md',
  '.ccw/personal/learnings.md'
]

// Read all existing spec files
const allEntries = []

for (const file of [...specFiles, ...personalFiles]) {
  if (!file_exists(file)) continue
  const content = Read(file)

  // Extract entries using unified format regex
  // Entry line: - [type:tag] summary (date)
  // Extended:       - key: value
  const lines = content.split('\n')
  let currentEntry = null

  for (const line of lines) {
    const entryMatch = line.match(/^- \[(\w+):([\w-]+)\] (.*?)(?:\s+\((\d{4}-\d{2}-\d{2})\))?$/)
    if (entryMatch) {
      if (currentEntry) allEntries.push(currentEntry)
      currentEntry = {
        type: entryMatch[1],
        tag: entryMatch[2],
        summary: entryMatch[3],
        date: entryMatch[4] || null,
        extended: {},
        source: file,
        raw: line
      }
    } else if (currentEntry && /^\s{4}- ([\w-]+):\s?(.*)/.test(line)) {
      const fieldMatch = line.match(/^\s{4}- ([\w-]+):\s?(.*)/)
      currentEntry.extended[fieldMatch[1]] = fieldMatch[2]
    } else if (currentEntry && !/^\s{4}/.test(line) && line.trim() !== '') {
      // Non-indented non-empty line = end of current entry
      allEntries.push(currentEntry)
      currentEntry = null
    }

    // Also handle legacy format: - [tag] text (learned: date)
    const legacyMatch = line.match(/^- \[([\w-]+)\] (.+?)(?:\s+\(learned: (\d{4}-\d{2}-\d{2})\))?$/)
    if (!entryMatch && legacyMatch) {
      if (currentEntry) allEntries.push(currentEntry)
      currentEntry = {
        type: 'rule',
        tag: legacyMatch[1],
        summary: legacyMatch[2],
        date: legacyMatch[3] || null,
        extended: {},
        source: file,
        raw: line,
        legacy: true
      }
    }
  }
  if (currentEntry) allEntries.push(currentEntry)
}
```

### Step 4: Filter Entries

```javascript
let filtered = allEntries

// Filter by type
if (type) {
  filtered = filtered.filter(e => e.type === type)
}

// Filter by tag
if (tag) {
  filtered = filtered.filter(e => e.tag === tag)
}

// Filter by keyword (search in tag, summary, and extended fields)
if (keyword) {
  const kw = keyword.toLowerCase()
  const kwTerms = kw.split(/\s+/)

  filtered = filtered.filter(e => {
    const searchText = [
      e.type, e.tag, e.summary,
      ...Object.values(e.extended)
    ].join(' ').toLowerCase()

    return kwTerms.every(term => searchText.includes(term))
  })
}

// If --all, keep everything (no filter)
```

### Step 5: Display Results

```javascript
if (filtered.length === 0) {
  const filterDesc = []
  if (type) filterDesc.push(`type=${type}`)
  if (tag) filterDesc.push(`tag=${tag}`)
  if (keyword) filterDesc.push(`keyword="${keyword}"`)

  console.log(`
No specs found matching: ${filterDesc.join(', ') || '(all)'}

Available spec files:
${specFiles.filter(f => file_exists(f)).map(f => `  - ${f}`).join('\n') || '  (none)'}

Suggestions:
- Use /workflow:spec:setup to initialize specs
- Use /workflow:spec:add to add new entries
- Use /workflow:spec:load --all to see everything
`)
  return
}

// Group by source file
const grouped = {}
for (const entry of filtered) {
  if (!grouped[entry.source]) grouped[entry.source] = []
  grouped[entry.source].push(entry)
}

// Display
console.log(`
## Specs Loaded (${filtered.length} entries)
${type ? `Type: ${type}` : ''}${tag ? ` Tag: ${tag}` : ''}${keyword ? ` Keyword: "${keyword}"` : ''}
`)

for (const [source, entries] of Object.entries(grouped)) {
  console.log(`### ${source}`)
  console.log('')

  for (const entry of entries) {
    // Render entry
    const datePart = entry.date ? ` (${entry.date})` : ''
    console.log(`- [${entry.type}:${entry.tag}] ${entry.summary}${datePart}`)

    // Render extended fields
    for (const [key, value] of Object.entries(entry.extended)) {
      console.log(`    - ${key}: ${value}`)
    }
  }
  console.log('')
}

// Summary footer
const typeCounts = {}
for (const e of filtered) {
  typeCounts[e.type] = (typeCounts[e.type] || 0) + 1
}
const typeBreakdown = Object.entries(typeCounts)
  .map(([t, c]) => `${t}: ${c}`)
  .join(', ')

console.log(`---`)
console.log(`Total: ${filtered.length} entries (${typeBreakdown})`)
console.log(`Sources: ${Object.keys(grouped).join(', ')}`)
```

## Examples

### Interactive Browse
```bash
/workflow:spec:load
# → Menu: "What specs would you like to load?"
# → User selects "Browse all specs"
# → Displays all entries grouped by file
```

### Keyword Search
```bash
/workflow:spec:load "api routing"
# → Filters entries where tag/summary/extended contains "api" AND "routing"
# → Displays matching entries
```

### Type Filter
```bash
/workflow:spec:load --type bug
# → Shows all [bug:*] entries from learnings.md
```

### Tag Filter
```bash
/workflow:spec:load --tag security
# → Shows all [*:security] entries across all spec files
```

### Combined Filters
```bash
/workflow:spec:load --type rule --tag api
# → Shows all [rule:api] entries
```

### Load All
```bash
/workflow:spec:load --all
# → Displays every entry from every spec file
```

## Error Handling

| Error | Resolution |
|-------|------------|
| No spec files found | Suggest `/workflow:spec:setup` to initialize |
| No matching entries | Show available files and suggest alternatives |
| Invalid type | Exit with valid type list |
| Corrupt entry format | Skip unparseable lines, continue loading |

## Related Commands

- `/workflow:spec:setup` - Initialize project with specs scaffold
- `/workflow:spec:add` - Add knowledge entries (bug/pattern/decision/rule) with unified [type:tag] format
- `/workflow:session:sync` - Quick-sync session work to specs and project-tech
- `ccw spec list` - View spec file index
- `ccw spec load` - CLI-level spec loading (used by hooks)
