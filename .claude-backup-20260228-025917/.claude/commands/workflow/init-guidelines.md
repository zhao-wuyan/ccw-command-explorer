---
name: init-guidelines
description: Interactive wizard to fill specs/*.md based on project analysis
argument-hint: "[--reset]"
examples:
  - /workflow:init-guidelines
  - /workflow:init-guidelines --reset
---

# Workflow Init Guidelines Command (/workflow:init-guidelines)

## Overview

Interactive multi-round wizard that analyzes the current project (via `project-tech.json`) and asks targeted questions to populate `.workflow/specs/*.md` with coding conventions, constraints, and quality rules.

**Design Principle**: Questions are dynamically generated based on the project's tech stack, architecture, and patterns — not generic boilerplate.

**Note**: This command may be called by `/workflow:init` after initialization. Upon completion, return to the calling workflow if applicable.

## Usage
```bash
/workflow:init-guidelines          # Fill guidelines interactively (skip if already populated)
/workflow:init-guidelines --reset  # Reset and re-fill guidelines from scratch
```

## Execution Process

```
Input Parsing:
   └─ Parse --reset flag → reset = true | false

Step 1: Check Prerequisites
   ├─ project-tech.json must exist (run /workflow:init first)
   ├─ specs/*.md: check if populated or scaffold-only
   └─ If populated + no --reset → Ask: "Guidelines already exist. Overwrite or append?"

Step 2: Load Project Context
   └─ Read project-tech.json → extract tech stack, architecture, patterns

Step 3: Multi-Round Interactive Questionnaire
   ├─ Round 1: Coding Conventions (coding_style, naming_patterns)
   ├─ Round 2: File & Documentation Conventions (file_structure, documentation)
   ├─ Round 3: Architecture & Tech Constraints (architecture, tech_stack)
   ├─ Round 4: Performance & Security Constraints (performance, security)
   └─ Round 5: Quality Rules (quality_rules)

Step 4: Write specs/*.md

Step 5: Display Summary
```

## Implementation

### Step 1: Check Prerequisites

```bash
bash(test -f .workflow/project-tech.json && echo "TECH_EXISTS" || echo "TECH_NOT_FOUND")
bash(test -f .workflow/specs/coding-conventions.md && echo "SPECS_EXISTS" || echo "SPECS_NOT_FOUND")
```

**If TECH_NOT_FOUND**: Exit with message
```
Project tech analysis not found. Run /workflow:init first.
```

**Parse --reset flag**:
```javascript
const reset = $ARGUMENTS.includes('--reset')
```

**If GUIDELINES_EXISTS and not --reset**: Check if guidelines are populated (not just scaffold)

```javascript
// Check if specs already have content via ccw spec list
const specsList = Bash('ccw spec list --json 2>/dev/null || echo "{}"')
const specsData = JSON.parse(specsList)
const isPopulated = (specsData.total || 0) > 5  // More than seed docs

if (isPopulated) {
  AskUserQuestion({
    questions: [{
      question: "Project guidelines already contain entries. How would you like to proceed?",
      header: "Mode",
      multiSelect: false,
      options: [
        { label: "Append", description: "Keep existing entries and add new ones from the wizard" },
        { label: "Reset", description: "Clear all existing entries and start fresh" },
        { label: "Cancel", description: "Exit without changes" }
      ]
    }]
  })
  // If Cancel → exit
  // If Reset → clear all arrays before proceeding
  // If Append → keep existing, wizard adds to them
}
```

### Step 2: Load Project Context

```javascript
// Load project context via ccw spec load for planning context
const projectContext = Bash('ccw spec load --category planning 2>/dev/null || echo "{}"')
const specData = JSON.parse(projectContext)

// Extract key info from loaded specs for generating smart questions
const languages = specData.overview?.technology_stack?.languages || []
const primaryLang = languages.find(l => l.primary)?.name || languages[0]?.name || 'Unknown'
const frameworks = specData.overview?.technology_stack?.frameworks || []
const testFrameworks = specData.overview?.technology_stack?.test_frameworks || []
const archStyle = specData.overview?.architecture?.style || 'Unknown'
const archPatterns = specData.overview?.architecture?.patterns || []
const buildTools = specData.overview?.technology_stack?.build_tools || []
```

### Step 3: Multi-Round Interactive Questionnaire

Each round uses `AskUserQuestion` with project-aware options. The user can always select "Other" to provide custom input.

**⚠️ CRITICAL**: After each round, collect the user's answers and convert them into guideline entries. Do NOT batch all rounds — process each round's answers before proceeding to the next.

---

#### Round 1: Coding Conventions

Generate options dynamically based on detected language/framework:

```javascript
// Build language-specific coding style options
const codingStyleOptions = []

if (['TypeScript', 'JavaScript'].includes(primaryLang)) {
  codingStyleOptions.push(
    { label: "Strict TypeScript", description: "Use strict mode, no 'any' type, explicit return types for public APIs" },
    { label: "Functional style", description: "Prefer pure functions, immutability, avoid class-based patterns where possible" },
    { label: "Const over let", description: "Always use const; only use let when reassignment is truly needed" }
  )
} else if (primaryLang === 'Python') {
  codingStyleOptions.push(
    { label: "Type hints", description: "Use type hints for all function signatures and class attributes" },
    { label: "Functional style", description: "Prefer pure functions, list comprehensions, avoid mutable state" },
    { label: "PEP 8 strict", description: "Strict PEP 8 compliance with max line length 88 (Black formatter)" }
  )
} else if (primaryLang === 'Go') {
  codingStyleOptions.push(
    { label: "Error wrapping", description: "Always wrap errors with context using fmt.Errorf with %w" },
    { label: "Interface first", description: "Define interfaces at the consumer side, not the provider" },
    { label: "Table-driven tests", description: "Use table-driven test pattern for all unit tests" }
  )
}
// Add universal options
codingStyleOptions.push(
  { label: "Early returns", description: "Prefer early returns / guard clauses over deep nesting" }
)

AskUserQuestion({
  questions: [
    {
      question: `Your project uses ${primaryLang}. Which coding style conventions do you follow?`,
      header: "Coding Style",
      multiSelect: true,
      options: codingStyleOptions.slice(0, 4) // Max 4 options
    },
    {
      question: `What naming conventions does your ${primaryLang} project use?`,
      header: "Naming",
      multiSelect: true,
      options: [
        { label: "camelCase variables", description: "Variables and functions use camelCase (e.g., getUserName)" },
        { label: "PascalCase types", description: "Classes, interfaces, type aliases use PascalCase (e.g., UserService)" },
        { label: "UPPER_SNAKE constants", description: "Constants use UPPER_SNAKE_CASE (e.g., MAX_RETRIES)" },
        { label: "Prefix interfaces", description: "Prefix interfaces with 'I' (e.g., IUserService)" }
      ]
    }
  ]
})
```

**Process Round 1 answers** → add to `conventions.coding_style` and `conventions.naming_patterns` arrays.

---

#### Round 2: File Structure & Documentation

```javascript
AskUserQuestion({
  questions: [
    {
      question: `Your project has a ${archStyle} architecture. What file organization rules apply?`,
      header: "File Structure",
      multiSelect: true,
      options: [
        { label: "Co-located tests", description: "Test files live next to source files (e.g., foo.ts + foo.test.ts)" },
        { label: "Separate test dir", description: "Tests in a dedicated __tests__ or tests/ directory" },
        { label: "One export per file", description: "Each file exports a single main component/class/function" },
        { label: "Index barrels", description: "Use index.ts barrel files for clean imports from directories" }
      ]
    },
    {
      question: "What documentation standards does your project follow?",
      header: "Documentation",
      multiSelect: true,
      options: [
        { label: "JSDoc/docstring public APIs", description: "All public functions and classes must have JSDoc/docstrings" },
        { label: "README per module", description: "Each major module/package has its own README" },
        { label: "Inline comments for why", description: "Comments explain 'why', not 'what' — code should be self-documenting" },
        { label: "No comment requirement", description: "Code should be self-explanatory; comments only for non-obvious logic" }
      ]
    }
  ]
})
```

**Process Round 2 answers** → add to `conventions.file_structure` and `conventions.documentation`.

---

#### Round 3: Architecture & Tech Stack Constraints

```javascript
// Build architecture-specific options
const archOptions = []

if (archStyle.toLowerCase().includes('monolith')) {
  archOptions.push(
    { label: "No circular deps", description: "Modules must not have circular dependencies" },
    { label: "Layer boundaries", description: "Strict layer separation: UI → Service → Data (no skipping layers)" }
  )
} else if (archStyle.toLowerCase().includes('microservice')) {
  archOptions.push(
    { label: "Service isolation", description: "Services must not share databases or internal state" },
    { label: "API contracts", description: "All inter-service communication through versioned API contracts" }
  )
}
archOptions.push(
  { label: "Stateless services", description: "Service/business logic must be stateless (state in DB/cache only)" },
  { label: "Dependency injection", description: "Use dependency injection for testability, no hardcoded dependencies" }
)

AskUserQuestion({
  questions: [
    {
      question: `Your ${archStyle} architecture uses ${archPatterns.join(', ') || 'various'} patterns. What architecture constraints apply?`,
      header: "Architecture",
      multiSelect: true,
      options: archOptions.slice(0, 4)
    },
    {
      question: `Tech stack: ${frameworks.join(', ')}. What technology constraints apply?`,
      header: "Tech Stack",
      multiSelect: true,
      options: [
        { label: "No new deps without review", description: "Adding new dependencies requires explicit justification and review" },
        { label: "Pin dependency versions", description: "All dependencies must use exact versions, not ranges" },
        { label: "Prefer native APIs", description: "Use built-in/native APIs over third-party libraries when possible" },
        { label: "Framework conventions", description: `Follow official ${frameworks[0] || 'framework'} conventions and best practices` }
      ]
    }
  ]
})
```

**Process Round 3 answers** → add to `constraints.architecture` and `constraints.tech_stack`.

---

#### Round 4: Performance & Security Constraints

```javascript
AskUserQuestion({
  questions: [
    {
      question: "What performance requirements does your project have?",
      header: "Performance",
      multiSelect: true,
      options: [
        { label: "API response time", description: "API endpoints must respond within 200ms (p95)" },
        { label: "Bundle size limit", description: "Frontend bundle size must stay under 500KB gzipped" },
        { label: "Lazy loading", description: "Large modules/routes must use lazy loading / code splitting" },
        { label: "No N+1 queries", description: "Database access must avoid N+1 query patterns" }
      ]
    },
    {
      question: "What security requirements does your project enforce?",
      header: "Security",
      multiSelect: true,
      options: [
        { label: "Input sanitization", description: "All user input must be validated and sanitized before use" },
        { label: "No secrets in code", description: "No API keys, passwords, or tokens in source code — use env vars" },
        { label: "Auth on all endpoints", description: "All API endpoints require authentication unless explicitly public" },
        { label: "Parameterized queries", description: "All database queries must use parameterized/prepared statements" }
      ]
    }
  ]
})
```

**Process Round 4 answers** → add to `constraints.performance` and `constraints.security`.

---

#### Round 5: Quality Rules

```javascript
AskUserQuestion({
  questions: [
    {
      question: `Testing with ${testFrameworks.join(', ') || 'your test framework'}. What quality rules apply?`,
      header: "Quality",
      multiSelect: true,
      options: [
        { label: "Min test coverage", description: "Minimum 80% code coverage for new code; no merging below threshold" },
        { label: "No skipped tests", description: "Tests must not be skipped (.skip/.only) in committed code" },
        { label: "Lint must pass", description: "All code must pass linter checks before commit (enforced by pre-commit)" },
        { label: "Type check must pass", description: "Full type checking (tsc --noEmit) must pass with zero errors" }
      ]
    }
  ]
})
```

**Process Round 5 answers** → add to `quality_rules` array as `{ rule, scope, enforced_by }` objects.

### Step 4: Write specs/*.md

For each category of collected answers, append rules to the corresponding spec MD file. Each spec file uses YAML frontmatter with `readMode`, `priority`, `category`, and `keywords`.

**Category Assignment**: Based on the round and question type:
- Round 1-2 (conventions): `category: general` (applies to all stages)
- Round 3 (architecture/tech): `category: planning` (planning phase)
- Round 4 (performance/security): `category: execution` (implementation phase)
- Round 5 (quality): `category: execution` (testing phase)

```javascript
// Helper: append rules to a spec MD file with category support
function appendRulesToSpecFile(filePath, rules, defaultCategory = 'general') {
  if (rules.length === 0) return

  // Check if file exists
  if (!file_exists(filePath)) {
    // Create file with frontmatter including category
    const frontmatter = `---
title: ${filePath.includes('conventions') ? 'Coding Conventions' : filePath.includes('constraints') ? 'Architecture Constraints' : 'Quality Rules'}
readMode: optional
priority: medium
category: ${defaultCategory}
scope: project
dimension: specs
keywords: [${defaultCategory}, ${filePath.includes('conventions') ? 'convention' : filePath.includes('constraints') ? 'constraint' : 'quality'}]
---

# ${filePath.includes('conventions') ? 'Coding Conventions' : filePath.includes('constraints') ? 'Architecture Constraints' : 'Quality Rules'}

`
    Write(filePath, frontmatter)
  }

  const existing = Read(filePath)
  // Append new rules as markdown list items after existing content
  const newContent = existing.trimEnd() + '\n' + rules.map(r => `- ${r}`).join('\n') + '\n'
  Write(filePath, newContent)
}

// Write conventions (general category)
appendRulesToSpecFile('.workflow/specs/coding-conventions.md',
  [...newCodingStyle, ...newNamingPatterns, ...newFileStructure, ...newDocumentation],
  'general')

// Write constraints (planning category)
appendRulesToSpecFile('.workflow/specs/architecture-constraints.md',
  [...newArchitecture, ...newTechStack, ...newPerformance, ...newSecurity],
  'planning')

// Write quality rules (execution category)
if (newQualityRules.length > 0) {
  const qualityPath = '.workflow/specs/quality-rules.md'
  if (!file_exists(qualityPath)) {
    Write(qualityPath, `---
title: Quality Rules
readMode: required
priority: high
category: execution
scope: project
dimension: specs
keywords: [execution, quality, testing, coverage, lint]
---

# Quality Rules

`)
  }
  appendRulesToSpecFile(qualityPath,
    newQualityRules.map(q => `${q.rule} (scope: ${q.scope}, enforced by: ${q.enforced_by})`),
    'execution')
}

// Rebuild spec index after writing
Bash('ccw spec rebuild')
```

### Step 5: Display Summary

```javascript
const countConventions = newCodingStyle.length + newNamingPatterns.length
  + newFileStructure.length + newDocumentation.length
const countConstraints = newArchitecture.length + newTechStack.length
  + newPerformance.length + newSecurity.length
const countQuality = newQualityRules.length

// Get updated spec list
const specsList = Bash('ccw spec list --json 2>/dev/null || echo "{}"')

console.log(`
✓ Project guidelines configured

## Summary
- Conventions: ${countConventions} rules added to coding-conventions.md
- Constraints: ${countConstraints} rules added to architecture-constraints.md
- Quality rules: ${countQuality} rules added to quality-rules.md

Spec index rebuilt. Use \`ccw spec list\` to view all specs.

Next steps:
- Use /workflow:session:solidify to add individual rules later
- Specs are auto-loaded via hook on each prompt
`)
```

## Answer Processing Rules

When converting user selections to guideline entries:

1. **Selected option** → Use the option's `description` as the guideline string (it's more precise than the label)
2. **"Other" with custom text** → Use the user's text directly as the guideline string
3. **Deduplication** → Skip entries that already exist in the guidelines (exact string match)
4. **Quality rules** → Convert to `{ rule: description, scope: "all", enforced_by: "code-review" }` format

## Error Handling

- **No project-tech.json**: Exit with instruction to run `/workflow:init` first
- **User cancels mid-wizard**: Save whatever was collected so far (partial is better than nothing)
- **File write failure**: Report error, suggest manual edit

## Related Commands

- `/workflow:init` - Creates scaffold; optionally calls this command
- `/workflow:init-specs` - Interactive wizard to create individual specs with scope selection
- `/workflow:session:solidify` - Add individual rules one at a time
