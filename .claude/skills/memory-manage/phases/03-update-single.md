# Phase 3: Single Module CLAUDE.md Update (update-single)

使用 Explore agent 深度分析后，为单个目标模块生成手册式 (说明书) CLAUDE.md。

## Objective

- 验证目标路径并扫描结构
- 使用 Explore agent 进行 7 维度深度探索
- 交互确认后通过 CLI tool 生成手册式 CLAUDE.md
- Tool fallback (gemini→qwen→codex)

## Parameters

- `<path>`: Target directory path (required)
- `--tool <gemini|qwen|codex>`: Primary CLI tool (default: gemini)

## Execution

```
Step 3.1: Target Validation & Scan
   ├─ Parse arguments (path, --tool)
   ├─ Validate target directory exists
   └─ Quick structure scan (file count, types, depth)

Step 3.2: Deep Exploration (Explore Agent)
   ├─ Launch Explore agent with "very thorough" level
   ├─ Analyze purpose, structure, patterns, exports, dependencies
   └─ Build comprehensive module understanding

Step 3.3: Confirmation
   ├─ Display exploration summary (key findings)
   └─ AskUserQuestion: Generate / Cancel

Step 3.4: Generate CLAUDE.md (CLI Tool)
   ├─ Construct manual-style prompt from exploration results
   ├─ Execute ccw cli with --mode write
   ├─ Tool fallback on failure
   └─ Write to <path>/CLAUDE.md

Step 3.5: Verification
   └─ Display generated CLAUDE.md preview + stats
```

### Step 3.1: Target Validation & Scan

```javascript
// Parse arguments
const args = $ARGUMENTS.trim()
const parts = args.split(/\s+/)
const toolFlagIdx = parts.indexOf('--tool')
const primaryTool = toolFlagIdx !== -1 ? parts[toolFlagIdx + 1] : 'gemini'
const targetPath = parts.find(p => !p.startsWith('--') && p !== primaryTool)

if (!targetPath) {
  console.log('ERROR: <path> is required. Usage: /memory:manage update-single <path> [--tool gemini|qwen|codex]')
  return
}

// Validate path exists
Bash({ command: `test -d "${targetPath}" && echo "EXISTS" || echo "NOT_FOUND"`, run_in_background: false })
// → NOT_FOUND: abort with error

// Quick structure scan
Bash({ command: `find "${targetPath}" -maxdepth 3 -type f -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l`, run_in_background: false })
Bash({ command: `ls "${targetPath}"`, run_in_background: false })

// Check existing CLAUDE.md
const hasExisting = file_exists(`${targetPath}/CLAUDE.md`)

console.log(`
## Target: ${targetPath}

Files: ${fileCount}
Existing CLAUDE.md: ${hasExisting ? 'Yes (will be overwritten)' : 'No (new)'}
Tool: ${primaryTool}

Launching deep exploration...
`)
```

### Step 3.2: Deep Exploration (Explore Agent)

**CRITICAL**: Use `run_in_background: false` — exploration results are REQUIRED before generation.

```javascript
const explorationResult = Task(
  subagent_type="Explore",
  run_in_background=false,
  description=`Explore: ${targetPath}`,
  prompt=`
Thoroughly explore the module at "${targetPath}" with "very thorough" level. I need comprehensive understanding for generating a manual-style CLAUDE.md (说明书).

## Exploration Focus

Analyze from these 7 dimensions:

1. **Purpose & Responsibility**
   - What problem does this module solve?
   - What is its core responsibility in the larger system?
   - One-sentence summary a developer would use to describe it

2. **Directory Structure & Key Files**
   - Map directory layout and file organization
   - Identify entry points, core logic files, utilities, types
   - Note any naming conventions or organizational patterns

3. **Code Patterns & Conventions**
   - Common patterns used (factory, observer, middleware, hooks, etc.)
   - Import/export conventions
   - Error handling patterns
   - State management approach (if applicable)

4. **Public API / Exports**
   - What does this module expose to the outside?
   - Key functions, classes, components, types exported
   - How do consumers typically import from this module?

5. **Dependencies & Integration**
   - External packages this module depends on
   - Internal modules it imports from
   - Modules that depend on this one (reverse dependencies)
   - Data flow: how data enters and exits this module

6. **Constraints & Gotchas**
   - Non-obvious rules a developer must follow
   - Performance considerations
   - Security-sensitive areas
   - Common pitfalls or mistakes

7. **Development Workflow**
   - How to add new functionality to this module
   - Testing approach used
   - Build/compilation specifics (if any)

## Output Format

Return a structured summary covering all 7 dimensions above. Include specific file:line references where relevant. Focus on **actionable knowledge** — what a developer needs to know to work with this module effectively.
`
)
```

### Step 3.3: Confirmation

```javascript
console.log(`
## Exploration Summary

${explorationResult}

---

**Will generate**: ${targetPath}/CLAUDE.md
**Style**: Manual/handbook (说明书)
**Tool**: ${primaryTool}
`)

AskUserQuestion({
  questions: [{
    question: `Generate manual-style CLAUDE.md for "${targetPath}"?`,
    header: "Confirm",
    multiSelect: false,
    options: [
      { label: "Generate", description: "Write CLAUDE.md based on exploration" },
      { label: "Cancel", description: "Abort without changes" }
    ]
  }]
})

// Cancel → abort
```

### Step 3.4: Generate CLAUDE.md (CLI Tool)

**Tool fallback hierarchy**:
```javascript
const toolOrder = {
  'gemini': ['gemini', 'qwen', 'codex'],
  'qwen':   ['qwen', 'gemini', 'codex'],
  'codex':  ['codex', 'gemini', 'qwen']
}[primaryTool]
```

**Generation via ccw cli**:
```javascript
for (let tool of toolOrder) {
  Bash({
    command: `ccw cli -p "PURPOSE: Generate a manual-style CLAUDE.md (说明书) for the module at current directory.
This CLAUDE.md should read like a developer handbook — practical, actionable, concise.

## Exploration Context (use as primary source)

${explorationResult}

## CLAUDE.md Structure Requirements

Generate CLAUDE.md following this exact structure:

### 1. Title & Summary
\`# <Module Name>\`
> One-line description of purpose

### 2. Responsibilities
- Bullet list of what this module owns
- Keep to 3-7 items, each one sentence

### 3. Structure
\`\`\`
directory-tree/
├── key-files-only
└── with-brief-annotations
\`\`\`

### 4. Key Patterns
- Code conventions specific to THIS module
- Import patterns, naming rules, style decisions
- NOT generic best practices — only module-specific patterns

### 5. Usage
- How other modules use this one
- Common import/usage examples (real code, not pseudo-code)

### 6. Integration Points
- **Depends on**: modules/packages this uses (with purpose)
- **Used by**: modules that import from here

### 7. Constraints & Gotchas
- Non-obvious rules developers MUST follow
- Common mistakes to avoid
- Performance or security notes

## Style Rules
- Be CONCISE: each section 3-10 lines max
- Be PRACTICAL: actionable knowledge only, no boilerplate
- Be SPECIFIC: reference actual files and patterns, not generic advice
- No API reference listings — this is a handbook, not a reference doc
- Total length: 50-150 lines of markdown
- Language: Match the project's primary language (check existing CLAUDE.md files)

MODE: write
CONTEXT: @**/*
EXPECTED: Single CLAUDE.md file at ./CLAUDE.md following the structure above
CONSTRAINTS: Only write CLAUDE.md, no other files" --tool ${tool} --mode write --cd "${targetPath}"`,
    run_in_background: false
  })

  if (exit_code === 0) {
    console.log(`✅ ${targetPath}/CLAUDE.md generated with ${tool}`)
    break
  }
  console.log(`⚠️ ${tool} failed, trying next...`)
}
```

### Step 3.5: Verification

```javascript
// Check file was created/updated
Bash({ command: `test -f "${targetPath}/CLAUDE.md" && echo "EXISTS" || echo "MISSING"`, run_in_background: false })

// Show stats
Bash({ command: `wc -l "${targetPath}/CLAUDE.md"`, run_in_background: false })

// Preview first 30 lines
Read(`${targetPath}/CLAUDE.md`, { limit: 30 })

console.log(`
## Result

✅ Generated: ${targetPath}/CLAUDE.md
   Lines: ${lineCount}
   Style: Manual/handbook format
   Tool: ${usedTool}
`)
```

## CLAUDE.md Output Style Guide

The generated CLAUDE.md is a **说明书 (handbook)**, NOT a reference doc:

| Aspect | Handbook Style | Reference Doc Style |
|--------|---------------|---------------------|
| Purpose | "This module handles user auth" | "Authentication module" |
| Content | How to work with it | What every function does |
| Patterns | "Always use `createAuthMiddleware()`" | "List of all exports" |
| Constraints | "Never store tokens in localStorage" | "Token storage API" |
| Length | 50-150 lines | 300+ lines |
| Audience | Developer joining the team | API consumer |

## Error Handling

| Error | Resolution |
|-------|------------|
| Path not found | Abort with clear error message |
| Explore agent failure | Fallback to basic `ls` + `head` file scan, continue |
| All CLI tools fail | Report failure with last error, suggest `--tool` override |
| Empty directory | Abort — nothing to document |
| Existing CLAUDE.md | Overwrite entirely (full regeneration) |

## Output

- **File**: `<path>/CLAUDE.md` — Manual-style module handbook
- **Preview**: First 30 lines displayed after generation

## Next Phase

Return to [manage.md](../manage.md) router.
