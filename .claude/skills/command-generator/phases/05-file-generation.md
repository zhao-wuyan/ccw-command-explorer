# Phase 5: File Generation

Write the formatted content to the target command file.

## Objective

Generate the final command file by:
1. Checking for existing file (warn if present)
2. Writing formatted content to target path
3. Confirming successful generation

## Input

From Phase 4:
```javascript
{
  status: 'formatted',
  content: string,
  targetPath: string,
  summary: {
    name: string,
    description: string,
    location: string,
    group: string | null,
    hasArgumentHint: boolean
  }
}
```

## Execution Steps

### Step 1: Pre-Write Check

```javascript
// Check if file already exists
const fileExists = Bash(`test -f "${targetPath}" && echo "EXISTS" || echo "NOT_FOUND"`);

if (fileExists.includes('EXISTS')) {
  console.warn(`
WARNING: Command file already exists at: ${targetPath}
The file will be overwritten with new content.
  `);
}
```

### Step 2: Ensure Directory Exists

```javascript
// Get directory from target path
const targetDir = path.dirname(targetPath);

// Create directory if it doesn't exist
Bash(`mkdir -p "${targetDir}"`);
```

### Step 3: Write File

```javascript
// Write the formatted content
Write(targetPath, content);
```

### Step 4: Verify Write

```javascript
// Confirm file was created
const verifyExists = Bash(`test -f "${targetPath}" && echo "SUCCESS" || echo "FAILED"`);

if (!verifyExists.includes('SUCCESS')) {
  throw new Error(`Failed to create command file at ${targetPath}`);
}

// Verify content was written
const writtenContent = Read(targetPath);
if (!writtenContent || writtenContent.length === 0) {
  throw new Error(`Command file created but appears to be empty`);
}
```

### Step 5: Generate Success Report

```javascript
const report = {
  status: 'completed',
  file: {
    path: targetPath,
    name: summary.name,
    location: summary.location,
    group: summary.group,
    size: writtenContent.length,
    created: new Date().toISOString()
  },
  command: {
    name: summary.name,
    description: summary.description,
    hasArgumentHint: summary.hasArgumentHint
  },
  nextSteps: [
    `Edit ${targetPath} to add implementation details`,
    'Add usage examples and execution flow',
    'Test the command with Claude Code'
  ]
};
```

## Output

### Success Output

```javascript
{
  status: 'completed',
  file: {
    path: '.claude/commands/issue/create.md',
    name: 'create',
    location: 'project',
    group: 'issue',
    size: 1234,
    created: '2026-02-27T12:00:00.000Z'
  },
  command: {
    name: 'create',
    description: 'Create structured issue from GitHub URL...',
    hasArgumentHint: true
  },
  nextSteps: [
    'Edit .claude/commands/issue/create.md to add implementation details',
    'Add usage examples and execution flow',
    'Test the command with Claude Code'
  ]
}
```

### Console Output

```
Command generated successfully!

File: .claude/commands/issue/create.md
Name: create
Description: Create structured issue from GitHub URL...
Location: project
Group: issue

Next Steps:
1. Edit .claude/commands/issue/create.md to add implementation details
2. Add usage examples and execution flow
3. Test the command with Claude Code
```

## Error Handling

| Error | Action |
|-------|--------|
| Directory creation failed | Throw error with directory path |
| File write failed | Throw error with target path |
| Empty file detected | Throw error and attempt cleanup |
| Permission denied | Throw error with permission hint |

## Cleanup on Failure

```javascript
// If any step fails, attempt to clean up partial artifacts
function cleanup(targetPath) {
  try {
    Bash(`rm -f "${targetPath}"`);
  } catch (e) {
    // Ignore cleanup errors
  }
}
```

## Completion

The command file has been successfully generated. The skill execution is complete.

### Usage Example

```bash
# Use the generated command
/issue:create https://github.com/owner/repo/issues/123

# Or with the group prefix
/issue:create "Login fails with special chars"
```
