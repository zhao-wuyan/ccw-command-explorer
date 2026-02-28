# Phase 6: TDD Structure Validation & Plan Confirmation

> **📌 COMPACT SENTINEL [Phase 6: TDD-Structure-Validation]**
> This phase contains 4 execution steps (Step 6.1 — 6.4).
> If you can read this sentinel but cannot find the full Step protocol below, context has been compressed.
> Recovery: `Read("phases/06-tdd-structure-validation.md")`

Internal validation of TDD task structure and user decision gate for next steps.

## Objective

- Validate Red-Green-Refactor structure in all generated tasks
- Verify TDD compliance checkpoints
- Gather evidence before claiming completion
- Present Plan Confirmation Gate to user

## Execution

### Step 6.1: Internal Validation

Validate each generated task contains complete TDD workflow:

1. **Task structure validation**:
   - `meta.tdd_workflow: true` in all IMPL tasks
   - `cli_execution.id` present (format: {session_id}-{task_id})
   - `cli_execution` strategy assigned (new/resume/fork/merge_fork)
   - `implementation` has exactly 3 steps
   - Each step has correct `tdd_phase`: "red", "green", "refactor"
   - `focus_paths` are absolute or clear relative paths
   - `pre_analysis` includes exploration integration analysis

2. **Dependency validation**:
   - Sequential features: IMPL-N depends_on ["IMPL-(N-1)"] if needed
   - Complex features: IMPL-N.M depends_on ["IMPL-N.(M-1)"] for subtasks
   - CLI execution strategies correctly assigned based on dependency graph

3. **Agent assignment**: All IMPL tasks use @code-developer

4. **Test-fix cycle**: Green phase step includes test-fix-cycle logic with max_iterations

5. **Task count**: Total tasks ≤18 (simple + subtasks hard limit)

6. **User configuration**:
   - Execution method choice reflected in task structure
   - CLI tool preference documented in implementation guidance (if CLI selected)

### Step 6.2: Red Flag Checklist

From TDD best practices:
- [ ] No tasks skip Red phase (`tdd_phase: "red"` exists in step 1)
- [ ] Test files referenced in Red phase (explicit paths, not placeholders)
- [ ] Green phase has test-fix-cycle with `max_iterations` configured
- [ ] Refactor phase has clear completion criteria

**Non-Compliance Warning Format**:
```
⚠️ TDD Red Flag: [issue description]
   Task: [IMPL-N]
   Recommendation: [action to fix]
```

### Step 6.3: Evidence Gathering

Before claiming completion, verify artifacts exist:

```bash
# Verify session artifacts exist
ls -la .workflow/active/[sessionId]/{IMPL_PLAN.md,TODO_LIST.md}
ls -la .workflow/active/[sessionId]/.task/IMPL-*.json

# Count generated artifacts
echo "IMPL tasks: $(ls .workflow/active/[sessionId]/.task/IMPL-*.json 2>/dev/null | wc -l)"

# Sample task structure verification (first task)
jq '{id, tdd: .meta.tdd_workflow, cli_id: .cli_execution.id, phases: [.implementation[].tdd_phase]}' \
  "$(ls .workflow/active/[sessionId]/.task/IMPL-*.json | head -1)"
```

**Evidence Required Before Summary**:

| Evidence Type | Verification Method | Pass Criteria |
|---------------|---------------------|---------------|
| File existence | `ls -la` artifacts | All files present |
| Task count | Count IMPL-*.json | Count matches claims (≤18) |
| TDD structure | jq sample extraction | Shows red/green/refactor + cli_execution.id |
| CLI execution IDs | jq extraction | All tasks have cli_execution.id assigned |
| Warning log | Check tdd-warnings.log | Logged (may be empty) |

### Step 6.4: Plan Confirmation Gate

Present user with action choices:

```javascript
console.log(`
TDD Planning complete for session: ${sessionId}

Features analyzed: [N]
Total tasks: [M] (1 task per simple feature + subtasks for complex features)

Task breakdown:
- Simple features: [K] tasks (IMPL-1 to IMPL-K)
- Complex features: [L] features with [P] subtasks
- Total task count: [M] (within 18-task hard limit)

Structure:
- IMPL-1: {Feature 1 Name} (Internal: Red → Green → Refactor)
- IMPL-2: {Feature 2 Name} (Internal: Red → Green → Refactor)
- IMPL-3: {Complex Feature} (Container)
  - IMPL-3.1: {Sub-feature A} (Internal: Red → Green → Refactor)
  - IMPL-3.2: {Sub-feature B} (Internal: Red → Green → Refactor)
[...]

Plans generated:
- Unified Implementation Plan: .workflow/active/[sessionId]/IMPL_PLAN.md
  (includes TDD Implementation Tasks section with workflow_type: "tdd")
- Task List: .workflow/active/[sessionId]/TODO_LIST.md
  (with internal TDD phase indicators and CLI execution strategies)
- Task JSONs: .workflow/active/[sessionId]/.task/IMPL-*.json
  (with cli_execution.id and execution strategies for resume support)

TDD Configuration:
- Each task contains complete Red-Green-Refactor cycle
- Green phase includes test-fix cycle (max 3 iterations)
- Auto-revert on max iterations reached
- CLI execution strategies: new/resume/fork/merge_fork based on dependency graph

User Configuration Applied:
- Execution Method: [agent|hybrid|cli]
- CLI Tool Preference: [codex|gemini|qwen|auto]
- Supplementary Materials: [included|none]
- Task generation follows cli-tools-usage.md guidelines

⚠️ ACTION REQUIRED: Before execution, ensure you understand WHY each Red phase test is expected to fail.
   This is crucial for valid TDD - if you don't know why the test fails, you can't verify it tests the right thing.
`);

// Ask user for next action
const userChoice = AskUserQuestion({
  questions: [{
    question: "TDD Planning complete. What would you like to do next?",
    header: "Next Action",
    multiSelect: false,
    options: [
      {
        label: "Verify TDD Compliance (Recommended)",
        description: "Run full TDD compliance verification to check task chain structure, coverage, and Red-Green-Refactor cycle quality."
      },
      {
        label: "Start Execution",
        description: "Begin implementing TDD tasks immediately with Red-Green-Refactor cycles."
      },
      {
        label: "Review Status Only",
        description: "View TDD task breakdown and session status without taking further action."
      }
    ]
  }]
});

// Execute based on user choice
if (userChoice === "Verify TDD Compliance (Recommended)") {
  // Route to Phase 7 (tdd-verify) within this skill
  // Orchestrator reads phases/07-tdd-verify.md and executes
} else if (userChoice === "Start Execution") {
  Skill(skill="workflow-execute", args="--session " + sessionId);
} else if (userChoice === "Review Status Only") {
  // Display session status inline
  const sessionMeta = JSON.parse(Read(`.workflow/active/${sessionId}/workflow-session.json`));
  const todoList = Read(`.workflow/active/${sessionId}/TODO_LIST.md`);
  console.log(`\nSession: ${sessionId}`);
  console.log(`Status: ${sessionMeta.status}`);
  console.log(`\n--- TODO List ---\n${todoList}`);
}
```

**Auto Mode**: When `workflowPreferences.autoYes` is true, auto-select "Verify TDD Compliance", then auto-continue to execute if quality gate is APPROVED.

## Output

- **Validation**: TDD structure verified
- **User Decision**: Route to Phase 7 / Execute / Review
- **TodoWrite**: Mark Phase 6 completed

## Next Phase (Conditional)

Based on user's plan confirmation choice:
- If "Verify" → [Phase 7: TDD Verification](07-tdd-verify.md)
- If "Execute" → Skill(skill="workflow-execute")
- If "Review" -> Display session status inline
