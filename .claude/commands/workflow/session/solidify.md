---
name: solidify
description: Crystallize session learnings and user-defined constraints into permanent project guidelines, or compress recent memories
argument-hint: "[-y|--yes] [--type <convention|constraint|learning|compress>] [--category <category>] [--limit <N>] \"rule or insight\""
examples:
  - /workflow:session:solidify "Use functional components for all React code" --type convention
  - /workflow:session:solidify -y "No direct DB access from controllers" --type constraint --category architecture
  - /workflow:session:solidify "Cache invalidation requires event sourcing" --type learning --category architecture
  - /workflow:session:solidify --interactive
  - /workflow:session:solidify --type compress --limit 10
---

## Auto Mode

When `--yes` or `-y`: Auto-categorize and add guideline without confirmation.

# Session Solidify Command (/workflow:session:solidify)

## Overview

Crystallizes ephemeral session context (insights, decisions, constraints) into permanent project guidelines stored in `.ccw/specs/*.md`. This ensures valuable learnings persist across sessions and inform future planning.

## Use Cases

1. **During Session**: Capture important decisions as they're made
2. **After Session**: Reflect on lessons learned before archiving
3. **Proactive**: Add team conventions or architectural rules

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rule` | string | Yes (unless --interactive or --type compress) | The rule, convention, or insight to solidify |
| `--type` | enum | No | Type: `convention`, `constraint`, `learning`, `compress` (default: auto-detect) |
| `--category` | string | No | Category for organization (see categories below) |
| `--interactive` | flag | No | Launch guided wizard for adding rules |
| `--limit` | number | No | Number of recent memories to compress (default: 20, only for --type compress) |

### Type Categories

**convention** → Coding style preferences (goes to `conventions` section)
- Subcategories: `coding_style`, `naming_patterns`, `file_structure`, `documentation`

**constraint** → Hard rules that must not be violated (goes to `constraints` section)
- Subcategories: `architecture`, `tech_stack`, `performance`, `security`

**learning** -> Session-specific insights (goes to `learnings` array)
- Subcategories: `architecture`, `performance`, `security`, `testing`, `process`, `other`

**compress** -> Compress/deduplicate recent memories into a single consolidated CMEM
- No subcategories (operates on core memories, not project guidelines)
- Fetches recent non-archived memories, LLM-compresses them, creates a new CMEM
- Source memories are archived after successful compression

## Execution Process

```
Input Parsing:
   |- Parse: rule text (required unless --interactive or --type compress)
   |- Parse: --type (convention|constraint|learning|compress)
   |- Parse: --category (subcategory)
   |- Parse: --interactive (flag)
   +- Parse: --limit (number, default 20, compress only)

IF --type compress:
   Step C1: Fetch Recent Memories
      +- Call getRecentMemories(limit, excludeArchived=true)

   Step C2: Validate Candidates
      +- If fewer than 2 memories found -> abort with message

   Step C3: LLM Compress
      +- Build compression prompt with all memory contents
      +- Send to LLM for consolidation
      +- Receive compressed text

   Step C4: Merge Tags
      +- Collect tags from all source memories
      +- Deduplicate into a single merged tag array

   Step C5: Create Compressed CMEM
      +- Generate new CMEM via upsertMemory with:
         - content: compressed text from LLM
         - summary: auto-generated
         - tags: merged deduplicated tags
         - metadata: buildCompressionMetadata(sourceIds, originalSize, compressedSize)

   Step C6: Archive Source Memories
      +- Call archiveMemories(sourceIds)

   Step C7: Display Compression Report
      +- Show source count, compression ratio, new CMEM ID

ELSE (convention/constraint/learning):
   Step 1: Ensure Guidelines File Exists
      +- If not exists -> Create with empty structure

   Step 2: Auto-detect Type (if not specified)
      +- Analyze rule text for keywords

   Step 3: Validate and Format Entry
      +- Build entry object based on type

   Step 4: Update Guidelines File
      +- Add entry to appropriate section

   Step 5: Display Confirmation
      +- Show what was added and where
```

## Implementation

### Step 1: Ensure Guidelines File Exists

**Uses .ccw/specs/ directory (same as frontend/backend spec-index-builder)**

```bash
bash(test -f .ccw/specs/coding-conventions.md && echo "EXISTS" || echo "NOT_FOUND")
```

**If NOT_FOUND**, initialize spec system:

```bash
Bash('ccw spec init')
Bash('ccw spec rebuild')
```

### Step 2: Auto-detect Type (if not specified)

```javascript
function detectType(ruleText) {
  const text = ruleText.toLowerCase();

  // Constraint indicators
  if (/\b(no|never|must not|forbidden|prohibited|always must)\b/.test(text)) {
    return 'constraint';
  }

  // Learning indicators
  if (/\b(learned|discovered|realized|found that|turns out)\b/.test(text)) {
    return 'learning';
  }

  // Default to convention
  return 'convention';
}

function detectCategory(ruleText, type) {
  const text = ruleText.toLowerCase();

  if (type === 'constraint' || type === 'learning') {
    if (/\b(architecture|layer|module|dependency|circular)\b/.test(text)) return 'architecture';
    if (/\b(security|auth|permission|sanitize|xss|sql)\b/.test(text)) return 'security';
    if (/\b(performance|cache|lazy|async|sync|slow)\b/.test(text)) return 'performance';
    if (/\b(test|coverage|mock|stub)\b/.test(text)) return 'testing';
  }

  if (type === 'convention') {
    if (/\b(name|naming|prefix|suffix|camel|pascal)\b/.test(text)) return 'naming_patterns';
    if (/\b(file|folder|directory|structure|organize)\b/.test(text)) return 'file_structure';
    if (/\b(doc|comment|jsdoc|readme)\b/.test(text)) return 'documentation';
    return 'coding_style';
  }

  return type === 'constraint' ? 'tech_stack' : 'other';
}
```

### Step 3: Build Entry

```javascript
function buildEntry(rule, type, category, sessionId) {
  if (type === 'learning') {
    return {
      date: new Date().toISOString().split('T')[0],
      session_id: sessionId || null,
      insight: rule,
      category: category,
      context: null
    };
  }

  // For conventions and constraints, just return the rule string
  return rule;
}
```

### Step 4: Update Spec Files

```javascript
// Map type+category to target spec file
// Uses .ccw/specs/ directory (same as frontend/backend spec-index-builder)
const specFileMap = {
  convention: '.ccw/specs/coding-conventions.md',
  constraint: '.ccw/specs/architecture-constraints.md'
}

if (type === 'convention' || type === 'constraint') {
  const targetFile = specFileMap[type]
  const existing = Read(targetFile)

  // Deduplicate: skip if rule text already exists in the file
  if (!existing.includes(rule)) {
    const ruleText = `- [${category}] ${rule}`
    const newContent = existing.trimEnd() + '\n' + ruleText + '\n'
    Write(targetFile, newContent)
  }
} else if (type === 'learning') {
  // Learnings go to coding-conventions.md as a special section
  // Uses .ccw/specs/ directory (same as frontend/backend spec-index-builder)
  const targetFile = '.ccw/specs/coding-conventions.md'
  const existing = Read(targetFile)
  const entry = buildEntry(rule, type, category, sessionId)
  const learningText = `- [learning/${category}] ${entry.insight} (${entry.date})`

  if (!existing.includes(entry.insight)) {
    const newContent = existing.trimEnd() + '\n' + learningText + '\n'
    Write(targetFile, newContent)
  }
}

// Rebuild spec index after modification
Bash('ccw spec rebuild')
```

### Step 5: Display Confirmation

```
Guideline solidified

Type: ${type}
Category: ${category}
Rule: "${rule}"

Location: .ccw/specs/*.md -> ${type}s.${category}

Total ${type}s in ${category}: ${count}
```

## Compress Mode (--type compress)

When `--type compress` is specified, the command operates on core memories instead of project guidelines. It fetches recent memories, sends them to an LLM for consolidation, and creates a new compressed CMEM.

### Step C1: Fetch Recent Memories

```javascript
// Uses CoreMemoryStore.getRecentMemories()
const limit = parsedArgs.limit || 20;
const recentMemories = store.getRecentMemories(limit, /* excludeArchived */ true);

if (recentMemories.length < 2) {
  console.log("Not enough non-archived memories to compress (need at least 2).");
  return;
}
```

### Step C2: Build Compression Prompt

Concatenate all memory contents and send to LLM with the following prompt:

```
Given these ${N} memories, produce a single consolidated memory that:
1. Preserves all key information and insights
2. Removes redundancy and duplicate concepts
3. Organizes content by theme/topic
4. Maintains specific technical details and decisions

Source memories:
---
[Memory CMEM-XXXXXXXX-XXXXXX]:
${memory.content}
---
[Memory CMEM-XXXXXXXX-XXXXXX]:
${memory.content}
---
...

Output: A single comprehensive memory text.
```

### Step C3: Merge Tags from Source Memories

```javascript
// Collect all tags from source memories and deduplicate
const allTags = new Set();
for (const memory of recentMemories) {
  if (memory.tags) {
    for (const tag of memory.tags) {
      allTags.add(tag);
    }
  }
}
const mergedTags = Array.from(allTags);
```

### Step C4: Create Compressed CMEM

```javascript
const sourceIds = recentMemories.map(m => m.id);
const originalSize = recentMemories.reduce((sum, m) => sum + m.content.length, 0);
const compressedSize = compressedText.length;

const metadata = store.buildCompressionMetadata(sourceIds, originalSize, compressedSize);

const newMemory = store.upsertMemory({
  content: compressedText,
  summary: `Compressed from ${sourceIds.length} memories`,
  tags: mergedTags,
  metadata: metadata
});
```

### Step C5: Archive Source Memories

```javascript
// Archive all source memories after successful compression
store.archiveMemories(sourceIds);
```

### Step C6: Display Compression Report

```
Memory compression complete

New CMEM: ${newMemory.id}
Sources compressed: ${sourceIds.length}
Original size: ${originalSize} chars
Compressed size: ${compressedSize} chars
Compression ratio: ${(compressedSize / originalSize * 100).toFixed(1)}%
Tags merged: ${mergedTags.join(', ') || '(none)'}
Source memories archived: ${sourceIds.join(', ')}
```

### Compressed CMEM Metadata Format

The compressed CMEM's `metadata` field contains a JSON string with:

```json
{
  "compressed_from": ["CMEM-20260101-120000", "CMEM-20260102-140000", "..."],
  "compression_ratio": 0.45,
  "compressed_at": "2026-02-23T10:30:00.000Z"
}
```

- `compressed_from`: Array of source memory IDs that were consolidated
- `compression_ratio`: Ratio of compressed size to original size (lower = more compression)
- `compressed_at`: ISO timestamp of when the compression occurred

## Interactive Mode

When `--interactive` flag is provided:

```javascript
AskUserQuestion({
  questions: [
    {
      question: "What type of guideline are you adding?",
      header: "Type",
      multiSelect: false,
      options: [
        { label: "Convention", description: "Coding style preference (e.g., use functional components)" },
        { label: "Constraint", description: "Hard rule that must not be violated (e.g., no direct DB access)" },
        { label: "Learning", description: "Insight from this session (e.g., cache invalidation needs events)" }
      ]
    }
  ]
});

// Follow-up based on type selection...
```

## Examples

### Add a Convention
```bash
/workflow:session:solidify "Use async/await instead of callbacks" --type convention --category coding_style
```

Result in `.ccw/specs/coding-conventions.md`:
```markdown
- [coding_style] Use async/await instead of callbacks
```

### Add an Architectural Constraint
```bash
/workflow:session:solidify "No direct DB access from controllers" --type constraint --category architecture
```

Result in `.ccw/specs/architecture-constraints.md`:
```markdown
- [architecture] No direct DB access from controllers
```

### Capture a Session Learning
```bash
/workflow:session:solidify "Cache invalidation requires event sourcing for consistency" --type learning
```

Result in `.ccw/specs/coding-conventions.md`:
```markdown
- [learning/architecture] Cache invalidation requires event sourcing for consistency (2024-12-28)
```

### Compress Recent Memories
```bash
/workflow:session:solidify --type compress --limit 10
```

Result: Creates a new CMEM with consolidated content from the 10 most recent non-archived memories. Source memories are archived. The new CMEM's metadata tracks which memories were compressed:
```json
{
  "compressed_from": ["CMEM-20260220-100000", "CMEM-20260221-143000", "..."],
  "compression_ratio": 0.42,
  "compressed_at": "2026-02-23T10:30:00.000Z"
}
```

## Integration with Planning

The `specs/*.md` is consumed by:

1. **`workflow-plan` skill (context-gather phase)**: Loads guidelines into context-package.json
2. **`workflow-plan` skill**: Passes guidelines to task generation agent
3. **`task-generate-agent`**: Includes guidelines as "CRITICAL CONSTRAINTS" in system prompt

This ensures all future planning respects solidified rules without users needing to re-state them.

## Error Handling

- **Duplicate Rule**: Warn and skip if exact rule already exists
- **Invalid Category**: Suggest valid categories for the type
- **File Corruption**: Backup existing file before modification

## Related Commands

- `/workflow:session:start` - Start a session (may prompt for solidify at end)
- `/workflow:session:complete` - Complete session (prompts for learnings to solidify)
- `/workflow:init` - Creates specs/*.md scaffold if missing
- `/workflow:init-specs` - Interactive wizard to create individual specs with scope selection
