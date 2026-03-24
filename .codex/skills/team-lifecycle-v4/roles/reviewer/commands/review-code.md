# Code Review

4-dimension code review for implementation quality.

## Inputs

- Plan file (`{session}/plan/plan.json`)
- Implementation discovery files (`{session}/discoveries/IMPL-*.json`)
- Test results (if available)

## Gather Modified Files

Read upstream context from file system (no team_msg):

```javascript
// 1. Read plan for file list
const plan = JSON.parse(Read(`{session}/plan/plan.json`))
const plannedFiles = plan.tasks.flatMap(t => t.files)

// 2. Read implementation discoveries for actual modified files
const implFiles = Glob(`{session}/discoveries/IMPL-*.json`)
const modifiedFiles = new Set()
for (const f of implFiles) {
  const discovery = JSON.parse(Read(f))
  for (const file of (discovery.files_modified || [])) {
    modifiedFiles.add(file)
  }
}

// 3. Union of planned + actually modified files
const allFiles = [...new Set([...plannedFiles, ...modifiedFiles])]
```

## Dimensions

| Dimension | Critical Issues |
|-----------|----------------|
| Quality | Empty catch, any casts, @ts-ignore, console.log |
| Security | Hardcoded secrets, SQL injection, eval/exec, innerHTML |
| Architecture | Circular deps, imports >2 levels deep, files >500 lines |
| Requirements | Missing core functionality, incomplete acceptance criteria |

## Review Process

1. Gather modified files from plan.json + discoveries/IMPL-*.json
2. Read each modified file
3. Score per dimension (0-100%)
4. Classify issues by severity (Critical/High/Medium/Low)
5. Generate verdict (BLOCK/CONDITIONAL/APPROVE)

## Output

Write review report to `{session}/artifacts/review-report.md`:
- Per-dimension scores
- Issue list with file:line references
- Verdict with justification
- Recommendations (if CONDITIONAL)
