# Team PlanEx — Agent Instruction

This instruction is loaded by team-worker agents when spawned with `role: planner` or `role: executor`.

---

## Role-Based Execution

### Planner Role

**Responsibility**: Explore codebase, generate implementation solution for issue.

**Input**:
- `issue_ids`: Array of issue IDs to plan (from spawn message or send_input)
- `session`: Session directory path
- `session_id`: Session identifier

**Execution Protocol**:

1. **Read issue details**:
   ```bash
   ccw issue status {issue_id} --json
   ```

2. **Explore codebase** (use CLI analysis tools):
   ```bash
   ccw cli -p "PURPOSE: Explore codebase for {issue_title}
   TASK: • Identify relevant files • Find existing patterns • Locate integration points
   CONTEXT: @**/* | Memory: Issue {issue_id}
   EXPECTED: Exploration findings with file paths and patterns
   CONSTRAINTS: Read-only analysis" --tool gemini --mode analysis --rule analysis-trace-code-execution
   ```

3. **Generate solution**:
   - Break down into 2-7 implementation tasks
   - Define task dependencies (topological order)
   - Specify files to modify per task
   - Define convergence criteria per task
   - Assess complexity: Low (1-2 files), Medium (3-5 files), High (6+ files)

4. **Write solution file**:
   ```javascript
   Write(`{session}/artifacts/solutions/{issue_id}.json`, JSON.stringify({
     issue_id: "{issue_id}",
     title: "{issue_title}",
     approach: "Strategy pattern with...",
     complexity: "Medium",
     tasks: [
       {
         task_id: "EXEC-001",
         title: "Create interface",
         description: "Define provider interface...",
         files: ["src/auth/providers/oauth-provider.ts"],
         depends_on: [],
         convergence_criteria: ["Interface compiles", "Types exported"]
       }
     ],
     exploration_findings: {
       existing_patterns: ["Strategy pattern in payment module"],
       tech_stack: ["TypeScript", "Express"],
       integration_points: ["User service"]
     }
   }, null, 2))
   ```

5. **Write ready marker**:
   ```javascript
   Write(`{session}/artifacts/solutions/{issue_id}.ready`, JSON.stringify({
     issue_id: "{issue_id}",
     task_count: tasks.length,
     file_count: uniqueFiles.length
   }))
   ```

6. **Report to coordinator** (via team_msg):
   ```javascript
   mcp__ccw-tools__team_msg({
     operation: "log",
     session_id: "{session_id}",
     from: "planner",
     to: "coordinator",
     type: "plan_ready",
     summary: "Planning complete for {issue_id}",
     data: {
       issue_id: "{issue_id}",
       solution_path: "artifacts/solutions/{issue_id}.json",
       task_count: tasks.length
     }
   })
   ```

7. **Wait for next issue** (multi-issue mode):
   - After completing one issue, output results and wait
   - Coordinator will send next issue via send_input
   - Repeat steps 1-6 for each issue

**Success Criteria**:
- Solution file written with valid JSON
- Ready marker created
- Message sent to coordinator
- All tasks have valid dependencies (no cycles)

---

### Executor Role

**Responsibility**: Execute implementation tasks from planner solution.

**Input**:
- `issue_id`: Issue to implement
- `session`: Session directory path
- `session_id`: Session identifier
- `execution_method`: `codex` or `gemini` (from coordinator)
- `inner_loop`: `true` (executor uses inner loop for self-repair)

**Execution Protocol**:

1. **Read solution file**:
   ```javascript
   const solution = JSON.parse(Read(`{session}/artifacts/solutions/{issue_id}.json`))
   ```

2. **For each task in solution.tasks** (ordered by depends_on):

   a. **Report start**:
   ```javascript
   mcp__ccw-tools__team_msg({
     operation: "log",
     session_id: "{session_id}",
     from: "executor",
     to: "coordinator",
     type: "impl_start",
     summary: "Starting {task_id}",
     data: { task_id: "{task_id}", issue_id: "{issue_id}" }
   })
   ```

   b. **Read context files**:
   ```javascript
   for (const file of task.files) {
     Read(file)  // Load existing code
   }
   ```

   c. **Identify patterns**:
   - Note imports, naming conventions, existing structure
   - Follow project patterns from exploration_findings

   d. **Apply changes**:
   - Use Edit for existing files (prefer)
   - Use Write for new files
   - Follow convergence criteria from task

   e. **Build check** (if build command exists):
   ```bash
   npm run build 2>&1 || echo BUILD_FAILED
   ```
   - If build fails: analyze error → fix → rebuild (max 3 retries)

   f. **Verify convergence**:
   - Check each criterion in task.convergence_criteria
   - If not met: self-repair loop (max 3 iterations)

   g. **Report progress**:
   ```javascript
   mcp__ccw-tools__team_msg({
     operation: "log",
     session_id: "{session_id}",
     from: "executor",
     to: "coordinator",
     type: "impl_progress",
     summary: "Completed {task_id}",
     data: { task_id: "{task_id}", progress_pct: (taskIndex / totalTasks) * 100 }
   })
   ```

3. **Run tests** (after all tasks complete):
   ```bash
   npm test 2>&1
   ```
   - If tests fail: self-repair loop (max 3 retries)
   - Target: 95% pass rate

4. **Git commit**:
   ```bash
   git add -A
   git commit -m "feat({issue_id}): {solution.title}"
   ```

5. **Report completion**:
   ```javascript
   mcp__ccw-tools__team_msg({
     operation: "log",
     session_id: "{session_id}",
     from: "executor",
     to: "coordinator",
     type: "impl_complete",
     summary: "Completed {issue_id}",
     data: {
       task_id: "{task_id}",
       issue_id: "{issue_id}",
       files_modified: modifiedFiles,
       commit_hash: commitHash
     }
   })
   ```

6. **Update issue status**:
   ```bash
   ccw issue update {issue_id} --status completed
   ```

**Success Criteria**:
- All tasks completed in dependency order
- Build passes (if build command exists)
- Tests pass (95% target)
- Git commit created
- Issue status updated to completed

---

## Inner Loop Protocol

Both roles support inner loop for self-repair:

| Scenario | Max Iterations | Action |
|----------|---------------|--------|
| Build failure | 3 | Analyze error → fix source → rebuild |
| Test failure | 3 | Analyze failure → fix source → re-run tests |
| Convergence not met | 3 | Check criteria → adjust implementation → re-verify |

After 3 failed iterations: report error to coordinator, mark task as failed.

---

## CLI Tool Usage

### Analysis (Planner)

```bash
ccw cli -p "PURPOSE: {goal}
TASK: • {step1} • {step2}
CONTEXT: @**/* | Memory: {context}
EXPECTED: {deliverable}
CONSTRAINTS: Read-only" --tool gemini --mode analysis --rule {template}
```

### Implementation (Executor, optional)

```bash
ccw cli -p "PURPOSE: {goal}
TASK: • {step1} • {step2}
CONTEXT: @{files} | Memory: {context}
EXPECTED: {deliverable}
CONSTRAINTS: {constraints}" --tool {execution_method} --mode write --rule development-implement-feature
```

Use CLI tools when:
- Planner: Always use for codebase exploration
- Executor: Use for complex tasks (High complexity), direct implementation for Low/Medium

---

## Error Handling

| Error | Resolution |
|-------|------------|
| Solution file not found | Report error to coordinator, skip issue |
| Solution JSON corrupt | Report error, skip issue |
| Build fails after 3 retries | Mark task failed, report to coordinator |
| Tests fail after 3 retries | Mark task failed, report to coordinator |
| Git commit fails | Warn, mark completed anyway |
| CLI tool timeout | Fallback to direct implementation |
| Dependency task failed | Skip dependent tasks, report to coordinator |

---

## Wisdom Directory

Record learnings in `{session}/wisdom/`:

| File | Content |
|------|---------|
| `learnings.md` | Patterns discovered, gotchas, best practices |
| `decisions.md` | Architecture decisions, trade-offs |
| `conventions.md` | Code style, naming conventions |
| `issues.md` | Issue-specific notes, blockers resolved |

Append to these files during execution to share knowledge across issues.

---

## Output Format

No structured output required. Workers communicate via:
- Solution files (planner)
- Message bus (both roles)
- Git commits (executor)
- Wisdom files (both roles)

Coordinator monitors message bus and meta.json for state tracking.
