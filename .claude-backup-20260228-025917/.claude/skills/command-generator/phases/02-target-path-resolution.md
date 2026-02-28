# Phase 2: Target Path Resolution

Resolve the target commands directory based on location parameter.

## Objective

Determine the correct target path for the command file based on:
- **location**: "project" or "user" scope
- **group**: Optional subdirectory for command organization
- **skillName**: Command filename (with .md extension)

## Input

From Phase 1 validation:
```javascript
{
  skillName: string,      // e.g., "create"
  description: string,
  location: "project" | "user",
  group: string | null,   // e.g., "issue"
  argumentHint: string
}
```

## Path Resolution Rules

### Location Mapping

```javascript
const locationMap = {
  project: '.claude/commands',
  user: '~/.claude/commands'  // Expands to user home directory
};
```

### Path Construction

```javascript
function resolveTargetPath(params) {
  const baseDir = locationMap[params.location];
  
  if (!baseDir) {
    throw new Error(`Invalid location: ${params.location}. Must be "project" or "user".`);
  }
  
  // Expand ~ to user home if present
  const expandedBase = baseDir.startsWith('~') 
    ? path.join(os.homedir(), baseDir.slice(1))
    : baseDir;
  
  // Build full path
  let targetPath;
  if (params.group) {
    // Grouped command: .claude/commands/{group}/{skillName}.md
    targetPath = path.join(expandedBase, params.group, `${params.skillName}.md`);
  } else {
    // Top-level command: .claude/commands/{skillName}.md
    targetPath = path.join(expandedBase, `${params.skillName}.md`);
  }
  
  return targetPath;
}
```

## Execution Steps

### Step 1: Get Base Directory

```javascript
const location = validatedParams.location;
const baseDir = locationMap[location];

if (!baseDir) {
  throw new Error(`Invalid location: ${location}. Must be "project" or "user".`);
}
```

### Step 2: Expand User Path (if applicable)

```javascript
const os = require('os');
const path = require('path');

let expandedBase = baseDir;
if (baseDir.startsWith('~')) {
  expandedBase = path.join(os.homedir(), baseDir.slice(1));
}
```

### Step 3: Construct Full Path

```javascript
let targetPath;
let targetDir;

if (validatedParams.group) {
  // Command with group subdirectory
  targetDir = path.join(expandedBase, validatedParams.group);
  targetPath = path.join(targetDir, `${validatedParams.skillName}.md`);
} else {
  // Top-level command
  targetDir = expandedBase;
  targetPath = path.join(targetDir, `${validatedParams.skillName}.md`);
}
```

### Step 4: Ensure Target Directory Exists

```javascript
// Check and create directory if needed
Bash(`mkdir -p "${targetDir}"`);
```

### Step 5: Check File Existence

```javascript
const fileExists = Bash(`test -f "${targetPath}" && echo "EXISTS" || echo "NOT_FOUND"`);

if (fileExists.includes('EXISTS')) {
  console.warn(`Warning: Command file already exists at ${targetPath}. Will overwrite.`);
}
```

## Output

```javascript
{
  status: 'resolved',
  targetPath: targetPath,     // Full path to command file
  targetDir: targetDir,       // Directory containing command
  fileName: `${skillName}.md`,
  fileExists: fileExists.includes('EXISTS'),
  params: validatedParams     // Pass through to next phase
}
```

## Path Examples

### Project Scope (No Group)
```
location: "project"
skillName: "deploy"
-> .claude/commands/deploy.md
```

### Project Scope (With Group)
```
location: "project"
skillName: "create"
group: "issue"
-> .claude/commands/issue/create.md
```

### User Scope (No Group)
```
location: "user"
skillName: "global-status"
-> ~/.claude/commands/global-status.md
```

### User Scope (With Group)
```
location: "user"
skillName: "sync"
group: "session"
-> ~/.claude/commands/session/sync.md
```

## Next Phase

Proceed to [Phase 3: Template Loading](03-template-loading.md) with `targetPath` and `params`.
