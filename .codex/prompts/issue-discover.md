---
description: Discover potential issues from multiple perspectives (bug, UX, test, quality, security, performance, maintainability, best-practices)
argument-hint: "<path-pattern> [--perspectives=bug,ux,...] [--external]"
---

# Issue Discovery (Codex Version)

## Goal

Multi-perspective issue discovery that explores code from different angles to identify potential bugs, UX improvements, test gaps, and other actionable items. Unlike code review (which assesses existing code quality), discovery focuses on **finding opportunities for improvement and potential problems**.

**Discovery Scope**: Specified modules/files only
**Output Directory**: `.workflow/issues/discoveries/{discovery-id}/`
**Available Perspectives**: bug, ux, test, quality, security, performance, maintainability, best-practices

## Inputs

- **Target Pattern**: File glob pattern (e.g., `src/auth/**`)
- **Perspectives**: Comma-separated list via `--perspectives` (or interactive selection)
- **External Research**: `--external` flag enables Exa research for security and best-practices

## Output Requirements

**Generate Files:**
1. `.workflow/issues/discoveries/{discovery-id}/discovery-state.json` - Session state
2. `.workflow/issues/discoveries/{discovery-id}/perspectives/{perspective}.json` - Per-perspective findings
3. `.workflow/issues/discoveries/{discovery-id}/discovery-issues.jsonl` - Generated issue candidates
4. `.workflow/issues/discoveries/{discovery-id}/summary.md` - Summary report

**Return Summary:**
```json
{
  "discovery_id": "DSC-YYYYMMDD-HHmmss",
  "target_pattern": "src/auth/**",
  "perspectives_analyzed": ["bug", "security", "test"],
  "total_findings": 15,
  "issues_generated": 8,
  "priority_distribution": { "critical": 1, "high": 3, "medium": 4 }
}
```

## Workflow

### Step 1: Initialize Discovery Session

```bash
# Generate discovery ID
DISCOVERY_ID="DSC-$(date -u +%Y%m%d-%H%M%S)"
OUTPUT_DIR=".workflow/issues/discoveries/${DISCOVERY_ID}"

# Create directory structure
mkdir -p "${OUTPUT_DIR}/perspectives"
```

Resolve target files:
```bash
# List files matching pattern
find <target-pattern> -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx"
```

If no files found, abort with error message.

### Step 2: Select Perspectives

**If `--perspectives` provided:**
- Parse comma-separated list
- Validate against available perspectives

**If not provided (interactive):**
- Present perspective groups:
  - Quick scan: bug, test, quality
  - Security audit: security, bug, quality
  - Full analysis: all perspectives
- Use first group as default or wait for user input

### Step 3: Analyze Each Perspective

For each selected perspective, explore target files and identify issues.

**Perspective-Specific Focus:**

| Perspective | Focus Areas | Priority Guide |
|-------------|-------------|----------------|
| **bug** | Null checks, edge cases, resource leaks, race conditions, boundary conditions, exception handling | Critical=data corruption/crash, High=malfunction, Medium=edge case |
| **ux** | Error messages, loading states, feedback, accessibility, interaction patterns | Critical=inaccessible, High=confusing, Medium=inconsistent |
| **test** | Missing unit tests, edge case coverage, integration gaps, assertion quality | Critical=no security tests, High=no core logic tests |
| **quality** | Complexity, duplication, naming, documentation, code smells | Critical=unmaintainable, High=significant issues |
| **security** | Input validation, auth/authz, injection, XSS/CSRF, data exposure | Critical=auth bypass/injection, High=missing authz |
| **performance** | N+1 queries, memory leaks, caching, algorithm efficiency | Critical=memory leaks, High=N+1 queries |
| **maintainability** | Coupling, interface design, tech debt, extensibility | Critical=forced changes, High=unclear boundaries |
| **best-practices** | Framework conventions, language patterns, anti-patterns | Critical=bug-causing anti-patterns, High=convention violations |

**For each perspective:**

1. Read target files and analyze for perspective-specific concerns
2. Use `rg` to search for patterns indicating issues
3. Record findings with:
   - `id`: Finding ID (e.g., `F-001`)
   - `title`: Brief description
   - `priority`: critical/high/medium/low
   - `category`: Specific category within perspective
   - `description`: Detailed explanation
   - `file`: File path
   - `line`: Line number
   - `snippet`: Code snippet
   - `suggested_issue`: Proposed issue text
   - `confidence`: 0.0-1.0

4. Write to `{OUTPUT_DIR}/perspectives/{perspective}.json`:
```json
{
  "perspective": "security",
  "analyzed_at": "2025-01-22T...",
  "files_analyzed": 15,
  "findings": [
    {
      "id": "F-001",
      "title": "Missing input validation",
      "priority": "high",
      "category": "input-validation",
      "description": "User input is passed directly to database query",
      "file": "src/auth/login.ts",
      "line": 42,
      "snippet": "db.query(`SELECT * FROM users WHERE name = '${input}'`)",
      "suggested_issue": "Add input sanitization to prevent SQL injection",
      "confidence": 0.95
    }
  ]
}
```

### Step 4: External Research (if --external)

For security and best-practices perspectives, use Exa to search for:
- Industry best practices for the tech stack
- Known vulnerability patterns
- Framework-specific security guidelines

Write results to `{OUTPUT_DIR}/external-research.json`.

### Step 5: Aggregate and Prioritize

1. Load all perspective JSON files
2. Deduplicate findings by file+line
3. Calculate priority scores:
   - critical: 1.0
   - high: 0.8
   - medium: 0.5
   - low: 0.2
   - Adjust by confidence

4. Sort by priority score descending

### Step 6: Generate Issues

Convert high-priority findings to issue format:

```bash
# Append to discovery-issues.jsonl
echo '{"id":"ISS-DSC-001","title":"...","priority":"high",...}' >> ${OUTPUT_DIR}/discovery-issues.jsonl
```

Issue criteria:
- `priority` is critical or high
- OR `priority_score >= 0.7`
- OR `confidence >= 0.9` with medium priority

### Step 7: Update Discovery State

Write final state to `{OUTPUT_DIR}/discovery-state.json`:
```json
{
  "discovery_id": "DSC-...",
  "target_pattern": "src/auth/**",
  "phase": "complete",
  "created_at": "...",
  "updated_at": "...",
  "perspectives": ["bug", "security", "test"],
  "results": {
    "total_findings": 15,
    "issues_generated": 8,
    "priority_distribution": {
      "critical": 1,
      "high": 3,
      "medium": 4
    }
  }
}
```

### Step 8: Generate Summary

Write summary to `{OUTPUT_DIR}/summary.md`:
```markdown
# Discovery Summary: DSC-...

**Target**: src/auth/**
**Perspectives**: bug, security, test
**Total Findings**: 15
**Issues Generated**: 8

## Priority Breakdown
- Critical: 1
- High: 3
- Medium: 4

## Top Findings

1. **[Critical] SQL Injection in login.ts:42**
   Category: security/input-validation
   ...

2. **[High] Missing null check in auth.ts:128**
   Category: bug/null-check
   ...

## Next Steps
- Run `/issue:plan` to plan solutions for generated issues
- Use `ccw view` to review findings in dashboard
```

## Quality Checklist

Before completing, verify:

- [ ] All target files analyzed for selected perspectives
- [ ] Findings include file:line references
- [ ] Priority assigned to all findings
- [ ] Issues generated from high-priority findings
- [ ] Discovery state shows `phase: complete`
- [ ] Summary includes actionable next steps

## Error Handling

| Situation | Action |
|-----------|--------|
| No files match pattern | Abort with clear error message |
| Perspective analysis fails | Log error, continue with other perspectives |
| No findings | Report "No issues found" (not an error) |
| External research fails | Continue without external context |

## Schema References

| Schema | Path | Purpose |
|--------|------|---------|
| Discovery State | `~/.claude/workflows/cli-templates/schemas/discovery-state-schema.json` | Session state |
| Discovery Finding | `~/.claude/workflows/cli-templates/schemas/discovery-finding-schema.json` | Finding format |

## Start Discovery

Begin by resolving target files:

```bash
# Parse target pattern from arguments
TARGET_PATTERN="${1:-src/**}"

# Count matching files
find ${TARGET_PATTERN} -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) | wc -l
```

Then proceed with perspective selection and analysis.
