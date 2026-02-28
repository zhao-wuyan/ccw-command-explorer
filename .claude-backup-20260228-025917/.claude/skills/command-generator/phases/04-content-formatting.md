# Phase 4: Content Formatting

Format template content by substituting placeholders with parameter values.

## Objective

Replace all placeholder variables in the template with validated parameter values:
- `{{name}}` -> skillName
- `{{description}}` -> description
- `{{group}}` -> group (if provided)
- `{{argumentHint}}` -> argumentHint (if provided)

## Input

From Phase 3:
```javascript
{
  template: {
    content: string,
    requiredPlaceholders: string[],
    optionalPlaceholders: string[]
  },
  targetPath: string,
  params: {
    skillName: string,
    description: string,
    location: string,
    group: string | null,
    argumentHint: string
  }
}
```

## Placeholder Mapping

```javascript
const placeholderMap = {
  '{{name}}': params.skillName,
  '{{description}}': params.description,
  '{{group}}': params.group || '',
  '{{argumentHint}}': params.argumentHint || ''
};
```

## Execution Steps

### Step 1: Initialize Content

```javascript
let formattedContent = template.content;
```

### Step 2: Substitute Required Placeholders

```javascript
// These must always be replaced
formattedContent = formattedContent.replace(/\{\{name\}\}/g, params.skillName);
formattedContent = formattedContent.replace(/\{\{description\}\}/g, params.description);
```

### Step 3: Handle Optional Placeholders

```javascript
// Group placeholder
if (params.group) {
  formattedContent = formattedContent.replace(/\{\{group\}\}/g, params.group);
} else {
  // Remove group line if not provided
  formattedContent = formattedContent.replace(/^group: \{\{group\}\}\n?/gm, '');
  formattedContent = formattedContent.replace(/\{\{group\}\}/g, '');
}

// Argument hint placeholder
if (params.argumentHint) {
  formattedContent = formattedContent.replace(/\{\{argumentHint\}\}/g, params.argumentHint);
} else {
  // Remove argument-hint line if not provided
  formattedContent = formattedContent.replace(/^argument-hint: \{\{argumentHint\}\}\n?/gm, '');
  formattedContent = formattedContent.replace(/\{\{argumentHint\}\}/g, '');
}
```

### Step 4: Handle Conditional Sections

```javascript
// Remove empty frontmatter lines (caused by missing optional fields)
formattedContent = formattedContent.replace(/\n{3,}/g, '\n\n');

// Handle {{#if group}} style conditionals
if (formattedContent.includes('{{#if')) {
  // Process group conditional
  if (params.group) {
    formattedContent = formattedContent.replace(/\{\{#if group\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
  } else {
    formattedContent = formattedContent.replace(/\{\{#if group\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }
  
  // Process argumentHint conditional
  if (params.argumentHint) {
    formattedContent = formattedContent.replace(/\{\{#if argumentHint\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
  } else {
    formattedContent = formattedContent.replace(/\{\{#if argumentHint\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }
}
```

### Step 5: Validate Final Content

```javascript
// Ensure no unresolved placeholders remain
const unresolvedPlaceholders = formattedContent.match(/\{\{[^}]+\}\}/g);
if (unresolvedPlaceholders) {
  console.warn(`Warning: Unresolved placeholders found: ${unresolvedPlaceholders.join(', ')}`);
}

// Ensure frontmatter is valid
const frontmatterMatch = formattedContent.match(/^---\n([\s\S]*?)\n---/);
if (!frontmatterMatch) {
  throw new Error('Generated content has invalid frontmatter structure');
}
```

### Step 6: Generate Summary

```javascript
const summary = {
  name: params.skillName,
  description: params.description.substring(0, 50) + (params.description.length > 50 ? '...' : ''),
  location: params.location,
  group: params.group,
  hasArgumentHint: !!params.argumentHint
};
```

## Output

```javascript
{
  status: 'formatted',
  content: formattedContent,
  targetPath: targetPath,
  summary: summary
}
```

## Content Example

### Input Template
```markdown
---
name: {{name}}
description: {{description}}
{{#if group}}group: {{group}}{{/if}}
{{#if argumentHint}}argument-hint: {{argumentHint}}{{/if}}
---

# {{name}} Command
```

### Output (with all fields)
```markdown
---
name: create
description: Create structured issue from GitHub URL or text description
group: issue
argument-hint: [-y|--yes] <github-url | text-description> [--priority 1-5]
---

# create Command
```

### Output (minimal fields)
```markdown
---
name: deploy
description: Deploy application to production environment
---

# deploy Command
```

## Next Phase

Proceed to [Phase 5: File Generation](05-file-generation.md) with `content` and `targetPath`.
