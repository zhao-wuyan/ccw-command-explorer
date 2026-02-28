# Phase 3: Template Loading

Load the command template file for content generation.

## Objective

Load the command template from the skill's templates directory. The template provides:
- YAML frontmatter structure
- Placeholder variables for substitution
- Standard command file sections

## Input

From Phase 2:
```javascript
{
  targetPath: string,
  targetDir: string,
  fileName: string,
  fileExists: boolean,
  params: {
    skillName: string,
    description: string,
    location: string,
    group: string | null,
    argumentHint: string
  }
}
```

## Template Location

```
.claude/skills/command-generator/templates/command-md.md
```

## Execution Steps

### Step 1: Locate Template File

```javascript
// Template is located in the skill's templates directory
const skillDir = '.claude/skills/command-generator';
const templatePath = `${skillDir}/templates/command-md.md`;
```

### Step 2: Read Template Content

```javascript
const templateContent = Read(templatePath);

if (!templateContent) {
  throw new Error(`Command template not found at ${templatePath}`);
}
```

### Step 3: Validate Template Structure

```javascript
// Verify template contains expected placeholders
const requiredPlaceholders = ['{{name}}', '{{description}}'];
const optionalPlaceholders = ['{{group}}', '{{argumentHint}}'];

for (const placeholder of requiredPlaceholders) {
  if (!templateContent.includes(placeholder)) {
    throw new Error(`Template missing required placeholder: ${placeholder}`);
  }
}
```

### Step 4: Store Template for Next Phase

```javascript
const template = {
  content: templateContent,
  requiredPlaceholders: requiredPlaceholders,
  optionalPlaceholders: optionalPlaceholders
};
```

## Template Format Reference

The template should follow this structure:

```markdown
---
name: {{name}}
description: {{description}}
{{#if group}}group: {{group}}{{/if}}
{{#if argumentHint}}argument-hint: {{argumentHint}}{{/if}}
---

# {{name}} Command

[Template content with placeholders]
```

## Output

```javascript
{
  status: 'loaded',
  template: {
    content: templateContent,
    requiredPlaceholders: requiredPlaceholders,
    optionalPlaceholders: optionalPlaceholders
  },
  targetPath: targetPath,
  params: params
}
```

## Error Handling

| Error | Action |
|-------|--------|
| Template file not found | Throw error with path |
| Missing required placeholder | Throw error with missing placeholder name |
| Empty template | Throw error |

## Next Phase

Proceed to [Phase 4: Content Formatting](04-content-formatting.md) with `template`, `targetPath`, and `params`.
