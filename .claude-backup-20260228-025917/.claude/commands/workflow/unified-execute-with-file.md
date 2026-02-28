---
name: unified-execute-with-file
description: Universal execution engine for consuming any planning/brainstorm/analysis output with minimal progress tracking, multi-agent coordination, and incremental execution
argument-hint: "[-y|--yes] [<path>[,<path2>] | -p|--plan <path>[,<path2>]] [--auto-commit] [--commit-prefix \"prefix\"] [\"execution context or task name\"]"
allowed-tools: TodoWrite(*), Task(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-confirm execution decisions, follow plan's DAG dependencies.

# Unified Execute-With-File Command

## Quick Start

```bash
# Basic usage (auto-detect plan, ask for execution method)
/workflow:unified-execute-with-file

# Execute with specific plan (no -p needed for default paths)
/workflow:unified-execute-with-file .workflow/plans/auth-plan.md

# Execute multiple plans sequentially (comma-separated)
/workflow:unified-execute-with-file plan1.json,plan2.json,plan3.json

# With explicit -p flag (still supported)
/workflow:unified-execute-with-file -p .workflow/.planning/CPLAN-xxx

# With auto-commit (conventional commits)
/workflow:unified-execute-with-file --auto-commit plan.json

# Auto mode (skip prompts, use Agent for simple tasks, CLI for complex)
/workflow:unified-execute-with-file -y plan.json
```

**Execution Methods**:
- **Agent**: Task tool with code-developer (recommended for standard tasks)
- **CLI-Codex**: `ccw cli --tool codex` (complex tasks, git-aware)
- **CLI-Gemini**: `ccw cli --tool gemini` (analysis-heavy tasks)
- **Auto**: Select based on task complexity (default in `-y` mode)

**Context Source**: Plan files (IMPL_PLAN.md, plan.json, synthesis.json, etc.)
**Output Directory**: `.workflow/.execution/{session-id}/`
**Execution Strategy**:
- Multiple plans: Sequential execution (plan1 → plan2 → plan3)
- Within each plan: DAG-based dependency resolution with parallel execution where possible
**Core Innovation**: Unified event log + structured notes + auto-commit

## Output Artifacts

### During Execution

| Artifact | Description |
|----------|-------------|
| `execution.md` | Plan overview, task table, execution timeline |
| `execution-events.md` | ⭐ Unified log (all task executions) - SINGLE SOURCE OF TRUTH |


## Overview

Universal execution engine consuming **any** planning output and executing it with multi-agent coordination, dependency management, and progress tracking.

**Core workflow**: Load Plan → Parse Tasks → Execute → Track → Verify

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    UNIFIED EXECUTION WORKFLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Phase 1: Plan Detection & Sequential Execution                         │
│     ├─ Auto-detect or explicit --plan path                              │
│     ├─ Support multiple plans (comma-separated)                         │
│     ├─ Execute plans sequentially: plan1 → plan2 → plan3                │
│     ├─ Each plan: independent session with own execution-events.md      │
│     └─ Global session ID for multi-plan execution tracking              │
│                                                                          │
│  Phase 2: Session Initialization                                        │
│     ├─ Create .workflow/.execution/{sessionId}/                         │
│     ├─ Generate execution.md (plan overview + task table)               │
│     ├─ Initialize execution-events.md (unified log)                     │
│     ├─ Validate dependency graph (detect cycles)                        │
│     └─ Calculate execution waves (topological sort + conflict check)    │
│                                                                          │
│  Phase 3: Pre-Execution Validation (Agent-Assisted)                     │
│     ├─ Launch validation agent to check feasibility                     │
│     ├─ Verify file existence, agent availability, file conflicts        │
│     ├─ Generate validation report with recommendations                  │
│     └─ Ask user: execution method (Agent/CLI-Codex/CLI-Gemini/Auto)     │
│                                                                          │
│  Phase 4: Wave Execution (DAG-based Dependencies)                       │
│     ┌──────────────┬──────────────┬──────────────┐                      │
│     │   Wave 1     │   Wave 2     │   Wave N     │                      │
│     ├──────────────┼──────────────┼──────────────┤                      │
│     │ Task 1-A ──┐ │ Task 2-A     │ Task N-A     │  ← Dependencies OK   │
│     │ Task 1-B   │ │ Task 2-B     │ Task N-B     │  ← No file conflicts │
│     │ Task 1-C ──┘ │              │              │  ← Max 3 parallel    │
│     └──────────────┴──────────────┴──────────────┘                      │
│                                                                          │
│  Phase 5: Per-Task Execution (Agent OR CLI)                             │
│     ├─ Extract relevant notes from previous tasks                       │
│     ├─ Inject notes into execution context                              │
│     ├─ Route to Agent (Task tool) OR CLI (ccw cli command)              │
│     ├─ Generate structured notes for next task                          │
│     ├─ Auto-commit if enabled (conventional commit format)              │
│     └─ Append event to unified log                                      │
│                                                                          │
│  Phase 6: Progress Tracking & Recovery                                  │
│     ├─ execution-events.md: Single source of truth                      │
│     ├─ Each task: read previous events → execute → write event          │
│     ├─ Status indicators: ✅ (completed), ❌ (failed), ⏳ (progress)     │
│     └─ Resume support: --continue flag                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Output Structure

```
.workflow/.execution/{EXEC-slug-YYYY-MM-DD}/
├── execution.md              # Plan overview + task table + timeline
└── execution-events.md       # ⭐ Unified log (all task executions + review checkpoints) - SINGLE SOURCE OF TRUTH

```

**Key Concept**: execution-events.md serves as both human-readable log AND machine-parseable state store. All execution data (tasks, reviews, checkpoints) in one unified source.

## Implementation

### Session Initialization

**Objective**: Parse plan paths, create session directory, build unified task graph.

**Prerequisites**: None (entry point)

**Workflow Steps**:

1. **Parse Command Flags**
   - Extract plan paths from `--plan` or `-p` argument (or positional)
   - Detect `--auto-commit` and `--commit-prefix` for git integration
   - Detect `-y` or `--yes` for auto-confirmation mode

2. **Resolve Plan Paths**

   | Input Format | Resolution Strategy |
   |--------------|---------------------|
   | Comma-separated | Execute sequentially: `plan1.json → plan2.json → plan3.json` |
   | Single path | Direct use |
   | No path | Auto-detect from `.workflow/` (IMPL_PLAN.md or task JSONs) |

3. **Parse Current Plan**
   - Parse plan via format-agnostic `parsePlan()`
   - Build task graph from plan's DAG dependencies
   - Validate (detect cycles), topological sort
   - Return: `{ tasks, executionOrder, planSource, metadata }`

4. **Create Session Directory**
   - Generate session ID: `EXEC-{slug}-{date}-{random}`
   - Create `.workflow/.execution/{sessionId}/`
   - Initialize `execution.md` with plan source
   - Initialize `execution-events.md` (empty, will be appended)

**Success Criteria**:
- [ ] All plans parsed successfully
- [ ] No circular dependencies in task graph
- [ ] Session directory created with execution.md template
- [ ] Execution order calculated (topological sort)

**Completion**: Log session ID and ready for validation phase

---

### Pre-Execution Validation (Agent-Assisted)

**Objective**: Use validation agent to check execution feasibility and launch review agent for quality oversight.

**Prerequisites**: Session initialized, unified graph built

**Workflow Steps**:

1. **Launch Parallel Agents**

   **A. Validation Agent**

   ```javascript
   Task(
     subagent_type="cli-explore-agent",
     run_in_background=false,
     description="Validate execution plan feasibility",
     prompt=`
## Validation Mission

Analyze the following execution plan and generate a validation report.

### Plan Summary
- Total Tasks: ${unifiedGraph.tasks.length}
- Plan Sources: ${unifiedGraph.planSources.map(p => p.path).join(', ')}
- Execution Mode: ${executionMode}

### Tasks to Validate
${unifiedGraph.tasks.slice(0, 10).map(t => `- ${t.id}: ${t.title} (files: ${t.files_to_modify?.join(', ')})`).join('\n')}

### Validation Checks
1. **File Existence**: Verify files_to_modify exist or will be created
2. **Dependency Resolution**: Check all depends_on targets exist
3. **File Conflicts**: Identify same-file modifications in parallel waves
4. **Complexity Assessment**: Estimate task complexity (Low/Medium/High)
5. **Risk Analysis**: Identify potential issues or blockers

### Output Format
Generate validation-report.json in ${sessionFolder}:
{
  "status": "pass" | "warn" | "fail",
  "file_checks": { "missing": [], "will_create": [] },
  "dependency_issues": [],
  "file_conflicts": [{ "file": "", "tasks": [], "wave": 0 }],
  "complexity_assessment": { "low": 0, "medium": 0, "high": 0 },
  "risks": [{ "severity": "critical|high|medium|low", "description": "" }],
  "recommendations": [],
  "review_checkpoints": [{ "after_tasks": [], "focus_areas": [] }]
}
`
   )
   ```

   **B. Review Agent (Parallel)**

   ```javascript
   Task(
     subagent_type="universal-executor",
     run_in_background=false,
     description="Initialize review oversight system",
     prompt=`
## Review Agent Initialization

Set up incremental review system for execution quality oversight.

### Review Strategy
- **Checkpoint Interval**: Every 2-4 tasks
- **Focus Areas**: Code quality, plan compliance, integration risks
- **Update Principle**: Minimal changes only

### Output to execution-events.md
Append review configuration section (once, at initialization):

---
## REVIEW CONFIG - INITIALIZED ⚙️

**Timestamp**: ${timestamp}
**Strategy**: Incremental review every 2-4 tasks
**Focus Areas**: code_quality, plan_compliance, integration_risks

### Checkpoint Configuration
- **Interval**: Min 2 tasks, Max 4 tasks (adaptive)
- **Review Agent**: universal-executor
- **Plan Note Fields**: implementation_notes, quality_concerns, integration_risks, next_task_dependencies

---
`
   )
   ```

2. **Process Validation Result**
   - Read `{sessionFolder}/validation-report.json`
   - Display summary: status, conflicts count, risks count
   - If `status === "fail"`: Show blockers, ask to abort/continue
   - If `status === "warn"`: Show warnings, ask to proceed/fix

3. **Select Execution Method** (unless `--yes` flag)

   | Method | Description | When to Use |
   |--------|-------------|-------------|
   | Agent | `Task(subagent_type="code-developer")` | Standard implementation |
   | CLI-Codex | `ccw cli --tool codex --mode write` | Complex tasks, git-aware |
   | CLI-Gemini | `ccw cli --tool gemini --mode write` | Analysis-heavy tasks |
   | Auto | Auto-select by complexity | Default for `--yes` mode |

   **User Interaction** (unless `--yes`):
   ```javascript
   if (autoYes) {
     executionMethod = "Auto"
     console.log(`[--yes] Auto-selecting execution method: Auto`)
   } else {
     const selection = AskUserQuestion({
       questions: [{
         question: `选择执行方式 (${unifiedGraph.tasks.length} tasks, complexity: ${avgComplexity}):`,
         header: "Execution",
         multiSelect: false,
         options: [
           { label: "Agent (Recommended)", description: "@code-developer - 标准实现" },
           { label: "CLI-Codex", description: "ccw cli --tool codex - 复杂任务" },
           { label: "CLI-Gemini", description: "ccw cli --tool gemini - 分析型任务" },
           { label: "Auto", description: "按复杂度自动选择" }
         ]
       }]
     })
     executionMethod = selection.execution
   }
   ```

4. **Confirm Execution** (unless `--yes` flag)

   Options:
   - "开始执行" → Proceed with selected method
   - "更换方式" → Re-select execution method
   - "查看详情" → View full validation report
   - "取消" → Exit without execution

**Success Criteria**:
- [ ] Validation agent completed successfully
- [ ] No critical blockers (or user chose to continue)
- [ ] Execution method selected
- [ ] User confirmed (or auto-mode enabled)

**Variables Set**:
- `validationReport`: Parsed validation-report.json
- `executionMethod`: "Agent" | "CLI-Codex" | "CLI-Gemini" | "Auto"

---

### Wave Execution

**Objective**: Execute tasks in waves with review checkpoints, respecting dependencies and file conflicts.

**Prerequisites**: Validation completed, user confirmed, review config initialized in execution-events.md

**Workflow Steps**:

1. **Calculate Execution Waves**

   **Constraints**:
   - Tasks with dependencies must wait for completion
   - Same file modifications → Sequential (no parallel)
   - Max 3 parallel tasks per wave (resource limit)
   - Review checkpoints every 2-4 tasks (adaptive)

   **Algorithm**:
   - Find available tasks (dependencies satisfied, not completed)
   - Check file conflicts (task.files_to_modify)
   - Group non-conflicting tasks (up to 3 per wave)
   - Mark completed, repeat

2. **Execute Each Wave**
   - Launch tasks in parallel via `executeTask()`
   - Wait for wave completion via `Promise.allSettled()`
   - Process results (mark completed/failed)
   - Update execution.md timeline
   - Append events to execution-events.md

3. **Review Checkpoint Trigger** (Every 2-4 Tasks) - **Non-Blocking Parallel Execution**

   **Conditions**:
   - Completed tasks count ≥ checkpoint.min_tasks (default: 2)
   - No pending tasks in current wave
   - Previous checkpoint passed or first checkpoint

   **Workflow** (Parallel with Next Wave):
   ```javascript
   if (completedTasksCount % checkpointInterval === 0) {
     // Launch review agent in background (non-blocking)
     Task(
       subagent_type="universal-executor",
       run_in_background=true,  // ⭐ Parallel execution - does NOT block next wave
       description="Review checkpoint CHK-{id}",
       prompt=`
## Review Checkpoint: CHK-{id}

### Completed Tasks Since Last Checkpoint
${recentCompletedTasks.map(t => `- ${t.id}: ${t.title}`).join('\n')}

### Consume Plan Notes
${extractPlanNotes(recentCompletedTasks)}

### Review Focus Areas
1. **Code Quality**: Check implementations against standards
2. **Plan Compliance**: Verify tasks match expected outcomes
3. **Integration Risks**: Identify potential conflicts
4. **Next Dependencies**: Validate dependency chain for upcoming tasks

### Update Review Content (Minimal Changes Only)
- Read: execution-events.md (for plan notes and task history)
- Append to: execution-events.md (review checkpoint section)
- Principle: Only note critical issues, no full rewrite

### Output Format (Append to execution-events.md)

---
## REVIEW CHECKPOINT CHK-{id} - ${status} ${statusEmoji}

**Timestamp**: ${timestamp}
**Reviewed Tasks**: ${reviewedTaskIds.join(', ')}
**Duration**: ${durationMs}ms

### Findings

${findings.critical.length > 0 ? \`
#### 🔴 Critical
${findings.critical.map(f => \`- ${f}\`).join('\\n')}
\` : ''}

${findings.high.length > 0 ? \`
#### 🟠 High
${findings.high.map(f => \`- ${f}\`).join('\\n')}
\` : ''}

${findings.medium.length > 0 ? \`
#### 🟡 Medium
${findings.medium.map(f => \`- ${f}\`).join('\\n')}
\` : ''}

${findings.low.length > 0 ? \`
#### 🟢 Low
${findings.low.map(f => \`- ${f}\`).join('\\n')}
\` : ''}

### Plan Note Updates (Extended)

**Implementation Notes**: ${implementationNotes}
**Quality Concerns**: ${qualityConcerns.join('; ')}
**Integration Risks**: ${integrationRisks.join('; ')}
**Next Task Dependencies**: ${nextTaskDependencies.join('; ')}

### Recommendations
${recommendations.map(r => \`- ${r}\`).join('\\n')}

---
`
     )

     // Immediately proceed to next wave (parallel execution)
     console.log(`[Review] CHK-{id} launched in background, continuing with next wave...`)
   }
   ```

   **Key Design**:
   - Review agent runs in background (`run_in_background=true`)
   - Next wave tasks start immediately (no waiting)
   - Review findings appended to execution-events.md (single source of truth)
   - Critical findings visible in unified log for next tasks to consume

4. **Handle Failures**

   | Failure Type | Action |
   |--------------|--------|
   | Task timeout | Ask: retry/skip/abort |
   | Dependency failed | Auto-skip dependent tasks |
   | Max retries reached | Ask: retry/skip/abort (unless auto-mode) |
   | Review checkpoint fail | Ask: fix issues/continue/abort |

**Success Criteria**:
- [ ] All waves executed
- [ ] Review checkpoints completed (every 2-4 tasks)
- [ ] Results captured in execution-events.md
- [ ] Failed tasks handled appropriately
- [ ] Review findings documented in checkpoint files

---

### Task Execution

**Objective**: Execute individual task with context awareness, structured notes, and optional auto-commit.

**Prerequisites**: Task selected from available wave

**Workflow Steps**:

1. **Extract Relevant Notes**
   - Read all notes from execution-events.md
   - Filter by file overlap (notes.related_files ∩ task.files_to_modify)
   - Always include Critical severity notes
   - Sort by severity (Critical → High → Medium → Low)

2. **Build Execution Context**

   **Load Project Context** (from init.md products):
   ```javascript
   // Read project-tech.json (if exists)
   const projectTech = file_exists('.workflow/project-tech.json')
     ? JSON.parse(Read('.workflow/project-tech.json')) : null
   // Read specs/*.md (if exists)
   const projectGuidelines = file_exists('.workflow/specs/*.md')
     ? JSON.parse(Read('.workflow/specs/*.md')) : null
   ```

   ```javascript
   const executionContext = `
   ⚠️ Execution Notes from Previous Tasks
   ${relevantNotes}  // Categorized notes with severity

   📋 Project Context (from init.md)
   - Tech Stack: ${projectTech?.technology_analysis?.technology_stack || 'N/A'}
   - Architecture: ${projectTech?.technology_analysis?.architecture?.style || 'N/A'}
   - Constraints: ${projectGuidelines?.constraints || 'None defined'}

   Current Task: ${task.id}
   - Original ID: ${task.original_id}
   - Source Plan: ${task.source_plan}
   - Modified Files: ${task.files_to_modify}

   Previous Agent Executions (for reference)
   ${previousEvents}  // All previous task results
   `
   ```

3. **Route to Executor** (based on `executionMethod`)

   **Option A: Agent Execution**

   When: `executionMethod === "Agent"` or `Auto + Low Complexity`

   Execute task via Task tool with code-developer agent:

   ```javascript
   Task({
     subagent_type: "code-developer",  // or other agent types
     run_in_background: false,
     description: task.title,
     prompt: buildAgentPrompt(executionContext, task)
   })

   // buildAgentPrompt generates:
   // - Execution context with notes
   // - Task details (title, description)
   // - Files to modify
   // - Dependencies
   // - Expected output
   ```

   Agent Type Selection:

   | Agent Type | Use Case |
   |------------|----------|
   | code-developer | Code implementation |
   | tdd-developer | Code with tests |
   | test-fix-agent | Test execution and fixing |
   | cli-execution-agent | CLI-based tasks |
   | debug-explore-agent | Bug diagnosis |
   | universal-executor | Generic tasks |

   ---

   **Option B: CLI Execution**

   When: `executionMethod === "CLI-Codex"/"CLI-Gemini"` or `Auto + Medium/High Complexity`

   Execute task via CLI in background mode:

   ```javascript
   // Build CLI prompt from execution context
   const cliPrompt = buildCliPrompt(task, executionContext)
   // Generates: PURPOSE, TASK, MODE, CONTEXT, EXPECTED, CONSTRAINTS

   // Select tool based on execution method
   const tool = executionMethod === "CLI-Gemini" ? "gemini" : "codex"

   // Generate fixed execution ID for resume capability
   const fixedId = `${sessionId}-${task.id}`

   // Execute in background
   Bash({
     command: `ccw cli -p "${cliPrompt}" --tool ${tool} --mode write --id ${fixedId}`,
     run_in_background: true,
     description: `Execute task ${task.id} via CLI`
   })

   // STOP HERE - CLI executes in background, task hook will notify on completion
   ```

   Resume on Failure:

   ```javascript
   if (cliResult.status === 'failed' || cliResult.status === 'timeout') {
     console.log(`Task ${task.id} incomplete. Resume with fixed ID: ${fixedId}`)
     // Resume command: ccw cli -p "Continue" --resume ${fixedId} --id ${fixedId}-retry
   }
   ```

4. **Generate Structured Notes**

   **Pattern Detection** (auto-generate notes):
   - `localStorage|sessionStorage` → WARNING (High): XSS防护提醒
   - `package.json` modified → DEPENDENCY (Medium): npm install提醒
   - `api.*change|breaking` → API_CHANGE (Critical): 兼容性检查

5. **Auto-Commit** (if `--auto-commit` enabled)
   - Get changed files via `git status --porcelain`
   - Filter to task.files_to_modify
   - Stage files: `git add`
   - Generate conventional commit message: `type(scope): subject`
   - Commit: `git commit -m`

6. **Append to Event Log**

   **Event Format**:
   ```markdown
   ## Task ${task.id} - COMPLETED ✅

   **Timestamp**: ${time}
   **Duration**: ${ms}
   **Agent**: ${agent}

   ### Execution Summary
   ${summary}

   ### Generated Artifacts
   - `src/auth.ts` (2.3KB)

   ### Git Commit (if --auto-commit)
   **Files Committed**: ${files.length}
   **Commit Message**: feat(auth): implement user login

   ### 注意事项 (Execution Notes)
   **Category**: WARNING
   **Severity**: High
   **Related Files**: src/auth.ts
   **Message**: 使用了localStorage，注意XSS防护

   ---
   ```

**Success Criteria**:
- [ ] Task executed successfully
- [ ] Notes generated for next agent
- [ ] Event appended to execution-events.md
- [ ] Auto-commit completed (if enabled)

---

### Completion

**Objective**: Summarize execution results and offer follow-up actions.

**Prerequisites**: All waves completed

**Workflow Steps**:

1. **Collect Statistics**
   - Total tasks: `normalizedTasks.length`
   - Completed: `tasks.filter(t => t.status === 'completed').length`
   - Failed: `tasks.filter(t => t.status === 'failed').length`
   - Skipped: `tasks.filter(t => t.status === 'skipped').length`
   - Success rate: `(completed / total * 100).toFixed(1)`

2. **Update execution.md**
   - Append "Execution Completed" section
   - Include statistics table
   - Link to execution-events.md for details

3. **Display Summary**
   - Show session ID and folder
   - Display statistics
   - List failed tasks (if any)

4. **Offer Follow-Up Actions** (unless `--yes`)

   Options:
   - "查看详情" → View full execution log
   - "调试失败项" → Debug failed tasks
   - "优化执行" → Analyze execution improvements
   - "完成" → No further action

**Success Criteria**:
- [ ] Statistics collected and displayed
- [ ] execution.md updated with final status
- [ ] User informed of completion

---

## Helper Functions

### Sequential Multi-Plan Execution

**executeSequentialPlans(planPaths)**:
- Execute plans in order: `plan1 → plan2 → plan3`
- Each plan gets independent session
- All sessions grouped under global session ID

**Per-Plan Execution**:
- Parse plan → Build DAG → Validate → Execute tasks
- Follow plan's internal DAG dependencies
- Create execution-events.md for each plan
- Track progress in parent session

**Global Session Tracking**:
- Parent session ID: `EXEC-multi-{date}`
- Child sessions: `EXEC-{slug}-{plan-index}-{date}`
- Aggregate statistics across all plans

---

### Structured Notes

**Note Categories**: `WARNING`, `DECISION`, `API_CHANGE`, `FILE_CONFLICT`, `DEPENDENCY`, `PATTERN`

**Note Severity**: `Critical`, `High`, `Medium`, `Low`

**extractNotesFromEvents(eventLogPath)**:
- Parse structured note blocks from execution-events.md
- Pattern: `**Category**: ... **Severity**: ... **Related Files**: ... **Message**: ...`
- Return: Array of note objects

**filterRelevantNotes(notes, task)**:
- Include: File overlap with task.files_to_modify
- Always include: Critical severity notes
- Sort: By severity (Critical first)

**generateNotesForNextAgent(result, task)**:
- Pattern detection for common issues
- Auto-generate structured notes
- Return: Markdown-formatted notes

---

### Git Auto-Commit

**inferCommitType(task)**:
- Check action/title for keywords: fix, refactor, test, doc
- Default: `feat`

**extractScope(task)**:
- Check files_to_modify for patterns: frontend/, backend/, components/, api/, auth/
- Return: scope or null

**generateCommitMessage(task)**:
- Format: `type(scope): subject`
- Footer: `Task-ID: ${task.id}\nPlan: ${plan}`

**autoCommitTaskChanges(task)**:
- Get changed files, filter to task.files_to_modify
- Stage, commit with conventional message
- Return: `{ files, message }` or null

---

### Plan Format Parsers

**parsePlan(content, filePath)**:
- Route to appropriate parser based on filename pattern
- Support: IMPL_PLAN.md, plan.json, synthesis.json, conclusions.json

**parsePlanJson(content)**:
- Handle plan-json-schema (lite-plan, collaborative-plan, sub-plans)
- Map fields: `modification_points → files_to_modify`, `acceptance → expected_output`
- Infer: agent_type, task.type
- Build: prompt from task details

---

### Validation & Execution Method

**validateExecutionPlan(unifiedGraph, sessionFolder)**:
- Launch validation agent (cli-explore-agent)
- Check file existence, dependencies, file conflicts
- Generate validation-report.json with status/risks/recommendations
- Return: `{ status: "pass"|"warn"|"fail", report: {...} }`

**selectExecutionMethod(validationReport, autoYes)**:
- If `autoYes === true`: Return "Auto"
- Otherwise: AskUserQuestion with options (Agent/CLI-Codex/CLI-Gemini/Auto)
- Return: Selected execution method

**resolveExecutor(task, executionMethod, complexity)**:
- If `executionMethod === "Agent"`: Return "agent"
- If `executionMethod === "CLI-Codex"`: Return "cli-codex"
- If `executionMethod === "CLI-Gemini"`: Return "cli-gemini"
- If `executionMethod === "Auto"`:
  - Low complexity → "agent"
  - Medium/High complexity → "cli-codex"
- Return: Executor type

---

### Agent Selection

**selectBestAgent(task)**:

| Task Type | Agent |
|-----------|-------|
| code (with tests) | tdd-developer |
| code | code-developer |
| test | test-fix-agent |
| doc | doc-generator |
| analysis | cli-execution-agent |
| debug | debug-explore-agent |
| default | universal-executor |

---

### Parallelization

**calculateParallel(tasks)**:

Group into waves with constraints:
- Same file modifications → Sequential
- Dependencies → Wait for completion
- Max 3 parallel tasks per wave

Algorithm: Find available → Check conflicts → Group → Repeat

---

## Error Handling & Recovery

| Situation | Action |
|-----------|--------|
| Task timeout | Mark timeout, ask: retry/skip/abort |
| Missing dependency | Auto-skip dependent tasks, log warning |
| File conflict | Detect before execution, ask resolution |
| Output mismatch | Validate vs expected_output, flag review |
| Agent unavailable | Fallback to universal-executor |
| Execution interrupted | Resume with `--continue` flag |

**Retry Logic**:
- Auto-retry up to `max_retries` (default: 2) in auto-yes mode
- Interactive mode: Ask user after max retries

**Dependency Handling**:
- Failed task → Auto-skip all dependent tasks
- Log warning with skipped task IDs

---

## Session Resume

```bash
/workflow:unified-execute-with-file --continue                      # Resume last
/workflow:unified-execute-with-file --continue EXEC-xxx-2025-01-27  # Resume specific
```

**Resume Process**:
1. Load execution.md and execution-events.md
2. Parse events to identify completed/failed/skipped tasks (via status indicators)
3. Recalculate remaining dependencies
4. Resume from first incomplete task
5. Append "Resumed from [sessionId]" note to events

---

## Configuration

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --plan <path>` | Auto-detect | Plan file(s), comma-separated for sequential execution |
| `--auto-commit` | false | Commit after each successful task |
| `--commit-prefix` | null | Custom commit message prefix |
| `-y, --yes` | false | Auto-confirm all decisions |

---

## Best Practices

1. **Clear Plan Structure**: Well-structured plans → better execution
2. **Review Validation Report**: Check validation-report.json for risks before proceeding
3. **Choose Right Execution Method**:
   - **Agent**: Standard tasks, straightforward implementation
   - **CLI-Codex**: Complex tasks, requires git-aware context
   - **CLI-Gemini**: Analysis-heavy or exploratory tasks
   - **Auto**: Let system decide based on complexity
4. **Use Auto-Commit**: Enable `--auto-commit` for automatic progress tracking
5. **Resolve Conflicts Early**: Address file conflicts before execution
6. **Monitor Events Log**: Check execution-events.md for detailed progress
7. **Resume on Failure**: Use `--continue` to resume interrupted executions (Agent) or fixed ID (CLI)
8. **Sequential Multi-Plan**: Use comma-separated paths for executing multiple plans in order


