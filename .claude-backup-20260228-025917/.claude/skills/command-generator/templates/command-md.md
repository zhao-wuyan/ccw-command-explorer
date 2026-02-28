---
name: {{name}}
description: {{description}}
{{#if argumentHint}}argument-hint: {{argumentHint}}
{{/if}}---

# {{name}} Command

## Overview

[Describe the command purpose and what it does]

## Usage

```bash
/{{#if group}}{{group}}:{{/if}}{{name}} [arguments]
```

**Examples**:
```bash
# Example 1: Basic usage
/{{#if group}}{{group}}:{{/if}}{{name}}

# Example 2: With arguments
/{{#if group}}{{group}}:{{/if}}{{name}} --option value
```

## Execution Flow

```
Phase 1: Input Parsing
   - Parse arguments and flags
   - Validate input parameters

Phase 2: Core Processing
   - Execute main logic
   - Handle edge cases

Phase 3: Output Generation
   - Format results
   - Display to user
```

## Implementation

### Phase 1: Input Parsing

```javascript
// Parse command arguments
const args = parseArguments($ARGUMENTS);
```

### Phase 2: Core Processing

```javascript
// TODO: Implement core logic
```

### Phase 3: Output Generation

```javascript
// TODO: Format and display output
```

## Error Handling

| Error | Action |
|-------|--------|
| Invalid input | Show usage and error message |
| Processing failure | Log error and suggest recovery |

## Related Commands

- [Related command 1]
- [Related command 2]
