---
name: init-specs
description: Interactive wizard to create individual specs or personal constraints with scope selection
argument-hint: "[--scope <global|project>] [--dimension <specs|personal>] [--category <general|exploration|planning|execution>]"
examples:
  - /workflow:init-specs
  - /workflow:init-specs --scope global --dimension personal
  - /workflow:init-specs --scope project --dimension specs
---

# Workflow Init Specs Command (/workflow:init-specs)

## Overview

Interactive wizard for creating individual specs or personal constraints with scope selection. This command provides a guided experience for adding new rules to the spec system.

**Key Features**:
- Supports both project specs and personal specs
- Scope selection (global vs project) for personal specs
- Category-based organization for workflow stages
- Interactive mode with smart defaults

## Usage
```bash
/workflow:init-specs                              # Interactive mode (all prompts)
/workflow:init-specs --scope global               # Create global personal spec
/workflow:init-specs --scope project              # Create project spec (default)
/workflow:init-specs --dimension specs            # Project conventions/constraints
/workflow:init-specs --dimension personal         # Personal preferences
/workflow:init-specs --category exploration       # Workflow stage category
```

## Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `--scope` | `global`, `project` | `project` | Where to store the spec (only for personal dimension) |
| `--dimension` | `specs`, `personal` | Interactive | Type of spec to create |
| `--category` | `general`, `exploration`, `planning`, `execution` | `general` | Workflow stage category |

## Execution Process

```
Input Parsing:
   ├─ Parse --scope (global | project)
   ├─ Parse --dimension (specs | personal)
   └─ Parse --category (general | exploration | planning | execution)

Step 1: Gather Requirements (Interactive)
   ├─ If dimension not specified → Ask dimension
   ├─ If personal + scope not specified → Ask scope
   ├─ If category not specified → Ask category
   ├─ Ask type (convention | constraint | learning)
   └─ Ask content (rule text)

Step 2: Determine Target File
   ├─ specs dimension → .ccw/specs/coding-conventions.md or architecture-constraints.md
   └─ personal dimension → ~/.ccw/specs/personal/ or .ccw/specs/personal/

Step 3: Write Spec
   ├─ Check if file exists, create if needed with proper frontmatter
   ├─ Append rule to appropriate section
   └─ Run ccw spec rebuild

Step 4: Display Confirmation
```

## Implementation

### Step 1: Parse Input and Gather Requirements

```javascript
// Parse arguments
const args = $ARGUMENTS.toLowerCase()
const hasScope = args.includes('--scope')
const hasDimension = args.includes('--dimension')
const hasCategory = args.includes('--category')

// Extract values from arguments
let scope = hasScope ? args.match(/--scope\s+(\w+)/)?.[1] : null
let dimension = hasDimension ? args.match(/--dimension\s+(\w+)/)?.[1] : null
let category = hasCategory ? args.match(/--category\s+(\w+)/)?.[1] : null

// Validate values
if (scope && !['global', 'project'].includes(scope)) {
  console.log("Invalid scope. Use 'global' or 'project'.")
  return
}
if (dimension && !['specs', 'personal'].includes(dimension)) {
  console.log("Invalid dimension. Use 'specs' or 'personal'.")
  return
}
if (category && !['general', 'exploration', 'planning', 'execution'].includes(category)) {
  console.log("Invalid category. Use 'general', 'exploration', 'planning', or 'execution'.")
  return
}
```

### Step 2: Interactive Questions

**If dimension not specified**:
```javascript
if (!dimension) {
  const dimensionAnswer = AskUserQuestion({
    questions: [{
      question: "What type of spec do you want to create?",
      header: "Dimension",
      multiSelect: false,
      options: [
        {
          label: "Project Spec",
          description: "Coding conventions, constraints, quality rules for this project (stored in .ccw/specs/)"
        },
        {
          label: "Personal Spec",
          description: "Personal preferences and constraints that follow you across projects (stored in ~/.ccw/specs/personal/ or .ccw/specs/personal/)"
        }
      ]
    }]
  })
  dimension = dimensionAnswer.answers["Dimension"] === "Project Spec" ? "specs" : "personal"
}
```

**If personal dimension and scope not specified**:
```javascript
if (dimension === 'personal' && !scope) {
  const scopeAnswer = AskUserQuestion({
    questions: [{
      question: "Where should this personal spec be stored?",
      header: "Scope",
      multiSelect: false,
      options: [
        {
          label: "Global (Recommended)",
          description: "Apply to ALL projects (~/.ccw/specs/personal/)"
        },
        {
          label: "Project-only",
          description: "Apply only to this project (.ccw/specs/personal/)"
        }
      ]
    }]
  })
  scope = scopeAnswer.answers["Scope"].includes("Global") ? "global" : "project"
}
```

**If category not specified**:
```javascript
if (!category) {
  const categoryAnswer = AskUserQuestion({
    questions: [{
      question: "Which workflow stage does this spec apply to?",
      header: "Category",
      multiSelect: false,
      options: [
        {
          label: "General (Recommended)",
          description: "Applies to all stages (default)"
        },
        {
          label: "Exploration",
          description: "Code exploration, analysis, debugging"
        },
        {
          label: "Planning",
          description: "Task planning, requirements gathering"
        },
        {
          label: "Execution",
          description: "Implementation, testing, deployment"
        }
      ]
    }]
  })
  const categoryLabel = categoryAnswer.answers["Category"]
  category = categoryLabel.includes("General") ? "general"
    : categoryLabel.includes("Exploration") ? "exploration"
    : categoryLabel.includes("Planning") ? "planning"
    : "execution"
}
```

**Ask type**:
```javascript
const typeAnswer = AskUserQuestion({
  questions: [{
    question: "What type of rule is this?",
    header: "Type",
    multiSelect: false,
    options: [
      {
        label: "Convention",
        description: "Coding style preference (e.g., use functional components)"
      },
      {
        label: "Constraint",
        description: "Hard rule that must not be violated (e.g., no direct DB access)"
      },
      {
        label: "Learning",
        description: "Insight or lesson learned (e.g., cache invalidation needs events)"
      }
    ]
  }]
})
const type = typeAnswer.answers["Type"]
const isConvention = type.includes("Convention")
const isConstraint = type.includes("Constraint")
const isLearning = type.includes("Learning")
```

**Ask content**:
```javascript
const contentAnswer = AskUserQuestion({
  questions: [{
    question: "Enter the rule or guideline text:",
    header: "Content",
    multiSelect: false,
    options: []
  }]
})
const ruleText = contentAnswer.answers["Content"]
```

### Step 3: Determine Target File

```javascript
const path = require('path')
const os = require('os')

let targetFile: string
let targetDir: string

if (dimension === 'specs') {
  // Project specs - use .ccw/specs/ (same as frontend/backend spec-index-builder)
  targetDir = '.ccw/specs'
  if (isConstraint) {
    targetFile = path.join(targetDir, 'architecture-constraints.md')
  } else {
    targetFile = path.join(targetDir, 'coding-conventions.md')
  }
} else {
  // Personal specs - use .ccw/personal/ (same as backend spec-index-builder)
  if (scope === 'global') {
    targetDir = path.join(os.homedir(), '.ccw', 'personal')
  } else {
    targetDir = path.join('.ccw', 'personal')
  }

  // Create category-based filename
  const typePrefix = isConstraint ? 'constraints' : isLearning ? 'learnings' : 'conventions'
  targetFile = path.join(targetDir, `${typePrefix}.md`)
}
```

### Step 4: Write Spec

```javascript
const fs = require('fs')

// Ensure directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

// Check if file exists
const fileExists = fs.existsSync(targetFile)

if (!fileExists) {
  // Create new file with frontmatter
  const frontmatter = `---
title: ${dimension === 'specs' ? 'Project' : 'Personal'} ${isConstraint ? 'Constraints' : isLearning ? 'Learnings' : 'Conventions'}
readMode: optional
priority: medium
category: ${category}
scope: ${dimension === 'personal' ? scope : 'project'}
dimension: ${dimension}
keywords: [${category}, ${isConstraint ? 'constraint' : isLearning ? 'learning' : 'convention'}]
---

# ${dimension === 'specs' ? 'Project' : 'Personal'} ${isConstraint ? 'Constraints' : isLearning ? 'Learnings' : 'Conventions'}

`
  fs.writeFileSync(targetFile, frontmatter, 'utf8')
}

// Read existing content
let content = fs.readFileSync(targetFile, 'utf8')

// Format the new rule
const timestamp = new Date().toISOString().split('T')[0]
const rulePrefix = isLearning ? `- [learning] ` : `- [${category}] `
const ruleSuffix = isLearning ? ` (${timestamp})` : ''
const newRule = `${rulePrefix}${ruleText}${ruleSuffix}`

// Check for duplicate
if (content.includes(ruleText)) {
  console.log(`
Rule already exists in ${targetFile}
Text: "${ruleText}"
`)
  return
}

// Append the rule
content = content.trimEnd() + '\n' + newRule + '\n'
fs.writeFileSync(targetFile, content, 'utf8')

// Rebuild spec index
Bash('ccw spec rebuild')
```

### Step 5: Display Confirmation

```
Spec created successfully

Dimension: ${dimension}
Scope: ${dimension === 'personal' ? scope : 'project'}
Category: ${category}
Type: ${type}
Rule: "${ruleText}"

Location: ${targetFile}

Use 'ccw spec list' to view all specs
Use 'ccw spec load --category ${category}' to load specs by category
```

## Target File Resolution

### Project Specs (dimension: specs)
```
.ccw/specs/
├── coding-conventions.md    ← conventions, learnings
├── architecture-constraints.md  ← constraints
└── quality-rules.md         ← quality rules
```

### Personal Specs (dimension: personal)
```
# Global (~/.ccw/personal/)
~/.ccw/personal/
├── conventions.md           ← personal conventions (all projects)
├── constraints.md           ← personal constraints (all projects)
└── learnings.md             ← personal learnings (all projects)

# Project-local (.ccw/personal/)
.ccw/personal/
├── conventions.md           ← personal conventions (this project only)
├── constraints.md           ← personal constraints (this project only)
└── learnings.md             ← personal learnings (this project only)
```

## Category Field Usage

The `category` field in frontmatter enables filtered loading:

| Category | Use Case | Example Rules |
|----------|----------|---------------|
| `general` | Applies to all stages | "Use TypeScript strict mode" |
| `exploration` | Code exploration, debugging | "Always trace the call stack before modifying" |
| `planning` | Task planning, requirements | "Break down tasks into 2-hour chunks" |
| `execution` | Implementation, testing | "Run tests after each file modification" |

## Error Handling

- **File not writable**: Check permissions, suggest manual creation
- **Duplicate rule**: Warn and skip (don't add duplicates)
- **Invalid path**: Exit with error message

## Related Commands

- `/workflow:init` - Initialize project with specs scaffold
- `/workflow:init-guidelines` - Interactive wizard to fill specs
- `/workflow:session:solidify` - Add rules during/after sessions
- `ccw spec list` - View all specs
- `ccw spec load --category <cat>` - Load filtered specs
