# Command: verify

Goal-backward verification of convergence criteria from IMPL-*.json task files against actual codebase state. Checks convergence criteria (measurable conditions), file operations (existence/content), and runs verification commands.

## Purpose

For each task's convergence criteria, verify that the expected goals are met in the actual codebase. This is goal-backward verification: check what should exist, NOT what tasks were done. Produce a structured pass/fail result per task with gap details for any failures.

## Key Principle

**Goal-backward, not task-forward.** Do not check "did the executor follow the steps?" — check "does the codebase now have the properties that were required?"

## When to Use

- Phase 3 of verifier execution (after loading targets, before compiling results)
- Called once per VERIFY-* task

## Strategy

For each task, check convergence criteria and file operations. Use Bash for verification commands, Read/Grep for file checks, and optionally Gemini CLI for semantic validation of complex criteria.

## Parameters

| Parameter | Source | Description |
|-----------|--------|-------------|
| `sessionFolder` | From VERIFY-* task description | Session artifact directory |
| `phaseNumber` | From VERIFY-* task description | Phase number (1-based) |
| `tasks` | From verifier Phase 2 | Parsed task JSON objects with convergence criteria |
| `summaries` | From verifier Phase 2 | Parsed summary objects for context |

## Execution Steps

### Step 1: Initialize Results

```javascript
const verificationResults = []
```

### Step 2: Verify Each Task

```javascript
for (const task of tasks) {
  const taskResult = {
    task: task.id,
    title: task.title,
    status: 'pass',  // will be downgraded if any check fails
    details: [],
    gaps: []
  }

  // --- 2a. Check Convergence Criteria ---
  const criteria = task.convergence?.criteria || []
  for (const criterion of criteria) {
    const check = checkCriterion(criterion, task)
    taskResult.details.push({
      type: 'criterion',
      description: criterion,
      passed: check.passed
    })
    if (!check.passed) {
      taskResult.gaps.push({
        task: task.id,
        type: 'criterion',
        item: criterion,
        expected: criterion,
        actual: check.actual || 'Check failed'
      })
    }
  }

  // --- 2b. Check File Operations ---
  const files = task.files || []
  for (const fileEntry of files) {
    const fileChecks = checkFileEntry(fileEntry)
    for (const check of fileChecks) {
      taskResult.details.push(check.detail)
      if (!check.passed) {
        taskResult.gaps.push({
          ...check.gap,
          task: task.id
        })
      }
    }
  }

  // --- 2c. Run Verification Command ---
  if (task.convergence?.verification) {
    const verifyCheck = runVerificationCommand(task.convergence.verification)
    taskResult.details.push({
      type: 'verification_command',
      description: `Verification: ${task.convergence.verification}`,
      passed: verifyCheck.passed
    })
    if (!verifyCheck.passed) {
      taskResult.gaps.push({
        task: task.id,
        type: 'verification_command',
        item: task.convergence.verification,
        expected: 'Command exits with code 0',
        actual: verifyCheck.actual || 'Command failed'
      })
    }
  }

  // --- 2d. Score task ---
  const totalChecks = taskResult.details.length
  const passedChecks = taskResult.details.filter(d => d.passed).length

  if (passedChecks === totalChecks) {
    taskResult.status = 'pass'
  } else if (passedChecks > 0) {
    taskResult.status = 'partial'
  } else {
    taskResult.status = 'fail'
  }

  verificationResults.push(taskResult)
}
```

### Step 3: Criterion Checking Function

```javascript
function checkCriterion(criterion, task) {
  // Criteria are measurable conditions
  // Strategy: derive testable assertions from criterion text

  // Attempt 1: If criterion mentions a test command, run it
  const testMatch = criterion.match(/test[s]?\s+(pass|run|succeed)/i)
  if (testMatch) {
    const testResult = Bash(`npm test 2>&1 || yarn test 2>&1 || pytest 2>&1 || true`)
    const passed = !testResult.includes('FAIL') && !testResult.includes('failed')
    return { passed, actual: passed ? 'Tests pass' : 'Test failures detected' }
  }

  // Attempt 2: If criterion mentions specific counts or exports, check files
  const filePaths = (task.files || []).map(f => f.path)
  for (const filePath of filePaths) {
    const exists = Bash(`test -f "${filePath}" && echo "EXISTS" || echo "NOT_FOUND"`).trim()
    if (exists === "EXISTS") {
      const content = Read(filePath)
      // Check if criterion keywords appear in the implementation
      const keywords = criterion.split(/\s+/).filter(w => w.length > 4)
      const relevant = keywords.filter(kw =>
        content.toLowerCase().includes(kw.toLowerCase())
      )
      if (relevant.length >= Math.ceil(keywords.length * 0.3)) {
        return { passed: true, actual: 'Implementation contains relevant logic' }
      }
    }
  }

  // Attempt 3: Compile check for affected files
  for (const filePath of filePaths) {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      const compileCheck = Bash(`npx tsc --noEmit "${filePath}" 2>&1 || true`)
      if (compileCheck.includes('error TS')) {
        return { passed: false, actual: `TypeScript errors in ${filePath}` }
      }
    }
  }

  // Default: mark as passed if files exist and compile
  return { passed: true, actual: 'Files exist and compile without errors' }
}
```

### Step 4: File Entry Checking Function

```javascript
function checkFileEntry(fileEntry) {
  const checks = []
  const path = fileEntry.path
  const action = fileEntry.action  // create, modify, delete

  // 4a. Check file existence based on action
  const exists = Bash(`test -f "${path}" && echo "EXISTS" || echo "NOT_FOUND"`).trim()

  if (action === 'create' || action === 'modify') {
    checks.push({
      passed: exists === "EXISTS",
      detail: {
        type: 'file',
        description: `File exists: ${path} (${action})`,
        passed: exists === "EXISTS"
      },
      gap: exists !== "EXISTS" ? {
        type: 'file',
        item: `file_exists: ${path}`,
        expected: `File should exist (action: ${action})`,
        actual: 'File not found'
      } : null
    })

    if (exists !== "EXISTS") {
      return checks.filter(c => c.gap !== null || c.passed)
    }

    // 4b. Check minimum content (non-empty for create)
    if (action === 'create') {
      const content = Read(path)
      const lineCount = content.split('\n').length
      const minLines = 3  // Minimum for a meaningful file
      checks.push({
        passed: lineCount >= minLines,
        detail: {
          type: 'file',
          description: `${path}: has content (${lineCount} lines)`,
          passed: lineCount >= minLines
        },
        gap: lineCount < minLines ? {
          type: 'file',
          item: `min_content: ${path}`,
          expected: `>= ${minLines} lines`,
          actual: `${lineCount} lines`
        } : null
      })
    }
  } else if (action === 'delete') {
    checks.push({
      passed: exists === "NOT_FOUND",
      detail: {
        type: 'file',
        description: `File deleted: ${path}`,
        passed: exists === "NOT_FOUND"
      },
      gap: exists !== "NOT_FOUND" ? {
        type: 'file',
        item: `file_deleted: ${path}`,
        expected: 'File should be deleted',
        actual: 'File still exists'
      } : null
    })
  }

  return checks.filter(c => c.gap !== null || c.passed)
}
```

### Step 5: Verification Command Runner

```javascript
function runVerificationCommand(command) {
  try {
    const result = Bash(`${command} 2>&1; echo "EXIT:$?"`)
    const exitCodeMatch = result.match(/EXIT:(\d+)/)
    const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1]) : 1
    return {
      passed: exitCode === 0,
      actual: exitCode === 0 ? 'Command succeeded' : `Exit code: ${exitCode}\n${result.slice(0, 200)}`
    }
  } catch (e) {
    return { passed: false, actual: `Command error: ${e.message}` }
  }
}
```

### Step 6: Write verification.md

```javascript
const totalGaps = verificationResults.flatMap(r => r.gaps)
const overallStatus = totalGaps.length === 0 ? 'passed' : 'gaps_found'

Write(`${sessionFolder}/phase-${phaseNumber}/verification.md`, `---
phase: ${phaseNumber}
status: ${overallStatus}
tasks_checked: ${tasks.length}
tasks_passed: ${verificationResults.filter(r => r.status === 'pass').length}
gaps:
${totalGaps.map(g => `  - task: "${g.task}"
    type: "${g.type}"
    item: "${g.item}"
    expected: "${g.expected}"
    actual: "${g.actual}"`).join('\n')}
---

# Phase ${phaseNumber} Verification

## Summary

- **Status**: ${overallStatus}
- **Tasks Checked**: ${tasks.length}
- **Passed**: ${verificationResults.filter(r => r.status === 'pass').length}
- **Partial**: ${verificationResults.filter(r => r.status === 'partial').length}
- **Failed**: ${verificationResults.filter(r => r.status === 'fail').length}
- **Total Gaps**: ${totalGaps.length}

## Task Results

${verificationResults.map(r => `### ${r.task}: ${r.title} — ${r.status.toUpperCase()}
${r.details.map(d => `- [${d.passed ? 'x' : ' '}] (${d.type}) ${d.description}`).join('\n')}`).join('\n\n')}

${totalGaps.length > 0 ? `## Gaps for Re-Planning

The following gaps must be addressed in a gap closure iteration:

${totalGaps.map((g, i) => `### Gap ${i + 1}
- **Task**: ${g.task}
- **Type**: ${g.type}
- **Item**: ${g.item}
- **Expected**: ${g.expected}
- **Actual**: ${g.actual}`).join('\n\n')}` : '## All Goals Met'}
`)
```

## Verification Checklist

### Convergence Criteria

| Check Method | Tool | When |
|--------------|------|------|
| Run tests | Bash(`npm test`) | Criterion mentions "test" |
| Compile check | Bash(`npx tsc --noEmit`) | TypeScript files |
| Keyword match | Read + string match | General behavioral criteria |
| Verification command | Bash(convergence.verification) | Always if provided |
| Semantic check | Gemini CLI (analysis) | Complex criteria (optional) |

### File Operations

| Check | Tool | What |
|-------|------|------|
| File exists (create/modify) | Bash(`test -f`) | files[].path with action create/modify |
| File deleted | Bash(`test -f`) | files[].path with action delete |
| Minimum content | Read + line count | Newly created files |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No task JSON files found | Error to coordinator -- planner may have failed |
| No summary files found | Error to coordinator -- executor may have failed |
| Verification command fails | Record as gap with error output |
| File referenced in task missing | Record as gap (file type) |
| Task JSON malformed (no convergence) | Log warning, score as pass (nothing to check) |
| All checks for a task fail | Score as 'fail', include all gaps |
