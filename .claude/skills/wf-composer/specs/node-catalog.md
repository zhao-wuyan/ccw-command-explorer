# Node Catalog — Available Executors

All executors available for node resolution in Phase 2.

## Skill Nodes

| Executor | Type | Input Ports | Output Ports | Typical Args Template |
|----------|------|-------------|--------------|----------------------|
| `workflow-lite-plan` | skill | requirement | plan | `"{goal}"` |
| `workflow-plan` | skill | requirement, specification | detailed-plan | `"{goal}"` |
| `workflow-execute` | skill | detailed-plan, verified-plan | code | `--resume-session {prev_session_id}` |
| `workflow-test-fix` | skill | failing-tests, code | test-passed | `--session {prev_session_id}` |
| `workflow-tdd-plan` | skill | requirement | tdd-tasks | `"{goal}"` |
| `workflow-multi-cli-plan` | skill | requirement | multi-cli-plan | `"{goal}"` |
| `review-cycle` | skill | code, session | review-findings | `--session {prev_session_id}` |
| `brainstorm` | skill | exploration-topic | brainstorm-analysis | `"{goal}"` |
| `spec-generator` | skill | requirement | specification | `"{goal}"` |

## Command Nodes (namespace skills)

| Executor | Type | Input Ports | Output Ports | Typical Args Template |
|----------|------|-------------|--------------|----------------------|
| `workflow:refactor-cycle` | command | codebase | refactored-code | `"{goal}"` |
| `workflow:integration-test-cycle` | command | requirement | test-passed | `"{goal}"` |
| `workflow:brainstorm-with-file` | command | exploration-topic | brainstorm-document | `"{goal}"` |
| `workflow:analyze-with-file` | command | analysis-topic | discussion-document | `"{goal}"` |
| `workflow:debug-with-file` | command | bug-report | understanding-document | `"{goal}"` |
| `workflow:collaborative-plan-with-file` | command | requirement | plan-note | `"{goal}"` |
| `workflow:roadmap-with-file` | command | requirement | execution-plan | `"{goal}"` |
| `workflow:unified-execute-with-file` | command | plan-note, discussion-document | code | (no args — reads from session) |
| `issue:discover` | command | codebase | pending-issues | (no args) |
| `issue:plan` | command | pending-issues | issue-plans | `--all-pending` |
| `issue:queue` | command | issue-plans | execution-queue | (no args) |
| `issue:execute` | command | execution-queue | completed-issues | `--queue auto` |
| `issue:convert-to-plan` | command | plan | converted-plan | `--latest-lite-plan` |
| `team-planex` | skill | requirement, execution-plan | code | `"{goal}"` |

## CLI Nodes

CLI nodes use `ccw cli` with a tool + mode + rule.

| Use Case | cli_tool | cli_mode | cli_rule |
|----------|----------|----------|----------|
| Architecture analysis | gemini | analysis | analysis-review-architecture |
| Code quality review | gemini | analysis | analysis-review-code-quality |
| Bug root cause | gemini | analysis | analysis-diagnose-bug-root-cause |
| Security assessment | gemini | analysis | analysis-assess-security-risks |
| Performance analysis | gemini | analysis | analysis-analyze-performance |
| Code patterns | gemini | analysis | analysis-analyze-code-patterns |
| Task breakdown | gemini | analysis | planning-breakdown-task-steps |
| Architecture design | gemini | analysis | planning-plan-architecture-design |
| Feature implementation | gemini | write | development-implement-feature |
| Refactoring | gemini | write | development-refactor-codebase |
| Test generation | gemini | write | development-generate-tests |

**CLI node args_template format**:
```
PURPOSE: {goal}
TASK: • [derived from step description]
MODE: analysis
CONTEXT: @**/* | Memory: {memory_context}
EXPECTED: [derived from step output_ports]
CONSTRAINTS: {scope}
```

## Agent Nodes

| subagent_type | Use Case | run_in_background |
|---------------|----------|-------------------|
| `general-purpose` | Freeform analysis or implementation | false |
| `team-worker` | Worker in team-coordinate pipeline | true |
| `code-reviewer` | Focused code review | false |

**Agent node args_template format**:
```
Task: {goal}

Context from previous step:
{prev_output}

Deliver: [specify expected output format]
```

## Checkpoint Nodes

Checkpoints are auto-generated — not selected from catalog.

| auto_continue | When to Use |
|---------------|-------------|
| `true` | Background save, execution continues automatically |
| `false` | Pause for user review before proceeding |

Set `auto_continue: false` when:
- The next node is user-facing (plan display, spec review)
- The user requested an explicit pause in their workflow description
- The next node spawns a background agent (give user chance to cancel)
