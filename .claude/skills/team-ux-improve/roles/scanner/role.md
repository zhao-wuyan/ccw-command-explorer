---
role: scanner
prefix: SCAN
inner_loop: false
message_types: [state_update]
---

# UI Scanner

Scan UI components to identify interaction issues: unresponsive buttons, missing feedback mechanisms, state not refreshing.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Project path | Task description CONTEXT | Yes |
| Framework | Task description CONTEXT | Yes |
| Scan scope | Task description CONSTRAINTS | Yes |

1. Extract session path and project path from task description
2. Detect framework from project structure:

| Signal | Framework |
|--------|-----------|
| package.json has "react" | React |
| package.json has "vue" | Vue |
| *.tsx files present | React |
| *.vue files present | Vue |

3. Build file pattern list for scanning:
   - React: `**/*.tsx`, `**/*.jsx`, `**/use*.ts`
   - Vue: `**/*.vue`, `**/composables/*.ts`

### Wisdom Input

1. Read `<session>/wisdom/anti-patterns/common-ux-pitfalls.md` if available
2. Use anti-patterns to identify known UX issues during scanning
3. Check `<session>/wisdom/patterns/ui-feedback.md` for expected feedback patterns

### Complex Analysis (use CLI)

For large projects with many components:

```
Bash(`ccw cli -p "PURPOSE: Discover all UI components with user interactions
CONTEXT: @<project-path>/**/*.tsx @<project-path>/**/*.vue
EXPECTED: Component list with interaction types (click, submit, input, select)
CONSTRAINTS: Focus on interactive components only" --tool gemini --mode analysis`)
```

## Phase 3: Component Scanning

Scan strategy:

| Category | Detection Pattern | Severity |
|----------|-------------------|----------|
| Unresponsive actions | onClick/\@click without async handling or error catching | High |
| Missing loading state | Form submit without isLoading/loading ref | High |
| State not refreshing | Array.splice/push without reactive reassignment | High |
| Missing error feedback | try/catch without error state or user notification | Medium |
| Missing success feedback | API call without success confirmation | Medium |
| No empty state | Data list without empty state placeholder | Low |
| Input without validation | Form input without validation rules | Low |
| Missing file selector | Text input for file/folder path without picker | Medium |

For each component file:
1. Read file content
2. Scan for interaction patterns using Grep
3. Check for feedback mechanisms (loading, error, success states)
4. Check state update patterns (mutation vs reactive)
5. Record issues with file:line references

## Phase 4: Issue Report Generation

1. Classify issues by severity (High/Medium/Low)
2. Group by category (unresponsive, missing feedback, state issues, input UX)
3. Generate structured report and write to `<session>/artifacts/scan-report.md`
4. Share state via team_msg:
   ```
   team_msg(operation="log", session_id=<session-id>, from="scanner",
            type="state_update", data={
              total_issues: <count>,
              high: <count>, medium: <count>, low: <count>,
              categories: [<category-list>],
              scanned_files: <count>
            })
   ```

### Wisdom Contribution

If novel UX issues discovered that aren't in anti-patterns:
1. Write findings to `<session>/wisdom/contributions/scanner-issues-<timestamp>.md`
2. Format: Issue description, detection criteria, affected components
