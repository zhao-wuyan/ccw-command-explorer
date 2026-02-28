# Command Design Specification

Guidelines and best practices for designing Claude Code command files.

## Command File Structure

### YAML Frontmatter

Every command file must start with YAML frontmatter containing:

```yaml
---
name: command-name           # Required: Command identifier (lowercase, hyphens)
description: Description     # Required: Brief description of command purpose
argument-hint: "[args]"      # Optional: Argument format hint
allowed-tools: Tool1, Tool2  # Optional: Restricted tool set
examples:                    # Optional: Usage examples
  - /command:example1
  - /command:example2 --flag
---
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Command identifier, lowercase with hyphens |
| `description` | Yes | Brief description, appears in command listings |
| `argument-hint` | No | Usage hint for arguments (shown in help) |
| `allowed-tools` | No | Restrict available tools for this command |
| `examples` | No | Array of usage examples |

## Naming Conventions

### Command Names

- Use lowercase letters only
- Separate words with hyphens (`create-issue`, not `createIssue`)
- Keep names short but descriptive (2-3 words max)
- Use verbs for actions (`deploy`, `create`, `analyze`)

### Group Names

- Groups organize related commands
- Use singular nouns (`issue`, `session`, `workflow`)
- Common groups: `issue`, `workflow`, `session`, `memory`, `cli`

### Path Examples

```
.claude/commands/deploy.md           # Top-level command
.claude/commands/issue/create.md     # Grouped command
.claude/commands/workflow/init.md    # Grouped command
```

## Content Sections

### Required Sections

1. **Overview**: Brief description of command purpose
2. **Usage**: Command syntax and examples
3. **Execution Flow**: High-level process diagram

### Recommended Sections

4. **Implementation**: Code examples for each phase
5. **Error Handling**: Error cases and recovery
6. **Related Commands**: Links to related functionality

## Best Practices

### 1. Clear Purpose

Each command should do one thing well:

```
Good: /issue:create - Create a new issue
Bad:  /issue:manage - Create, update, delete issues (too broad)
```

### 2. Consistent Structure

Follow the same pattern across all commands in a group:

```markdown
# All issue commands should have:
- Overview
- Usage with examples
- Phase-based implementation
- Error handling table
```

### 3. Progressive Detail

Start simple, add detail in phases:

```
Phase 1: Quick overview
Phase 2: Implementation details
Phase 3: Edge cases and errors
```

### 4. Reusable Patterns

Use consistent patterns for common operations:

```javascript
// Input parsing pattern
const args = parseArguments($ARGUMENTS);
const flags = parseFlags($ARGUMENTS);

// Validation pattern
if (!args.required) {
  throw new Error('Required argument missing');
}
```

## Scope Guidelines

### Project Commands (`.claude/commands/`)

- Project-specific workflows
- Team conventions
- Integration with project tools

### User Commands (`~/.claude/commands/`)

- Personal productivity tools
- Cross-project utilities
- Global configuration

## Error Messages

### Good Error Messages

```
Error: GitHub issue URL required
Usage: /issue:create <github-url>
Example: /issue:create https://github.com/owner/repo/issues/123
```

### Bad Error Messages

```
Error: Invalid input
```

## Testing Commands

After creating a command, test:

1. **Basic invocation**: Does it run without arguments?
2. **Argument parsing**: Does it handle valid arguments?
3. **Error cases**: Does it show helpful errors for invalid input?
4. **Help text**: Is the usage clear?

## Related Documentation

- [SKILL-DESIGN-SPEC.md](../_shared/SKILL-DESIGN-SPEC.md) - Full skill design specification
- [../skill-generator/SKILL.md](../skill-generator/SKILL.md) - Meta-skill for creating skills
