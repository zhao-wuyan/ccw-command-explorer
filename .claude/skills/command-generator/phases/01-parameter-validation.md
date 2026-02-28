# Phase 1: Parameter Validation

Validate all required parameters for command generation.

## Objective

Ensure all required parameters are provided before proceeding with command generation:
- **skillName**: Command identifier (required)
- **description**: Command description (required)
- **location**: Target scope - "project" or "user" (required)
- **group**: Optional grouping subdirectory
- **argumentHint**: Optional argument hint string

## Input

Parameters received from skill invocation:
- `skillName`: string (required)
- `description`: string (required)
- `location`: "project" | "user" (required)
- `group`: string (optional)
- `argumentHint`: string (optional)

## Validation Rules

### Required Parameters

```javascript
const requiredParams = {
  skillName: {
    type: 'string',
    minLength: 1,
    pattern: /^[a-z][a-z0-9-]*$/,  // lowercase, alphanumeric, hyphens
    error: 'skillName must be lowercase alphanumeric with hyphens, starting with a letter'
  },
  description: {
    type: 'string',
    minLength: 10,
    error: 'description must be at least 10 characters'
  },
  location: {
    type: 'string',
    enum: ['project', 'user'],
    error: 'location must be "project" or "user"'
  }
};
```

### Optional Parameters

```javascript
const optionalParams = {
  group: {
    type: 'string',
    pattern: /^[a-z][a-z0-9-]*$/,
    default: null,
    error: 'group must be lowercase alphanumeric with hyphens'
  },
  argumentHint: {
    type: 'string',
    default: '',
    error: 'argumentHint must be a string'
  }
};
```

## Execution Steps

### Step 1: Extract Parameters

```javascript
// Extract from skill args
const params = {
  skillName: args.skillName,
  description: args.description,
  location: args.location,
  group: args.group || null,
  argumentHint: args.argumentHint || ''
};
```

### Step 2: Validate Required Parameters

```javascript
function validateRequired(params, rules) {
  const errors = [];
  
  for (const [key, rule] of Object.entries(rules)) {
    const value = params[key];
    
    // Check existence
    if (value === undefined || value === null || value === '') {
      errors.push(`${key} is required`);
      continue;
    }
    
    // Check type
    if (typeof value !== rule.type) {
      errors.push(`${key} must be a ${rule.type}`);
      continue;
    }
    
    // Check minLength
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${key} must be at least ${rule.minLength} characters`);
    }
    
    // Check pattern
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(rule.error);
    }
    
    // Check enum
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${key} must be one of: ${rule.enum.join(', ')}`);
    }
  }
  
  return errors;
}

const requiredErrors = validateRequired(params, requiredParams);
if (requiredErrors.length > 0) {
  throw new Error(`Validation failed:\n${requiredErrors.join('\n')}`);
}
```

### Step 3: Validate Optional Parameters

```javascript
function validateOptional(params, rules) {
  const warnings = [];
  
  for (const [key, rule] of Object.entries(rules)) {
    const value = params[key];
    
    if (value !== null && value !== undefined && value !== '') {
      if (rule.pattern && !rule.pattern.test(value)) {
        warnings.push(`${key}: ${rule.error}`);
      }
    }
  }
  
  return warnings;
}

const optionalWarnings = validateOptional(params, optionalParams);
// Log warnings but continue
```

### Step 4: Normalize Parameters

```javascript
const validatedParams = {
  skillName: params.skillName.trim().toLowerCase(),
  description: params.description.trim(),
  location: params.location.trim().toLowerCase(),
  group: params.group ? params.group.trim().toLowerCase() : null,
  argumentHint: params.argumentHint ? params.argumentHint.trim() : ''
};
```

## Output

```javascript
{
  status: 'validated',
  params: validatedParams,
  warnings: optionalWarnings
}
```

## Next Phase

Proceed to [Phase 2: Target Path Resolution](02-target-path-resolution.md) with `validatedParams`.
