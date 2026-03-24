# Phase 1: Load & Bind

## Objective

Locate and load the workflow template, collect any missing context variables from the user, bind all `{variable}` references.

## Workflow

### Step 1.1 — Resolve Template Path

Parse `$ARGUMENTS` for template identifier:

**Path resolution order**:
1. Absolute path: use as-is
2. Relative path (starts with `.`): resolve from cwd
3. Slug only (e.g. `feature-tdd-review`): look up in `.workflow/templates/index.json` → get path
4. Partial slug match: scan index for closest match → confirm with user

If not found:
- Show available templates from index
- AskUserQuestion: "Which template to run?"

### Step 1.2 — Parse --context Arguments

Extract `--context key=value` pairs from `$ARGUMENTS`.

Examples:
```
--context goal="Implement user auth" --context scope="src/auth"
--context goal='Fix login bug' scope=src/auth
```

Build `bound_context = { goal: "...", scope: "..." }`.

### Step 1.3 — Load Template

Read template JSON from resolved path.

Validate:
- `template_id`, `nodes`, `edges`, `context_schema` all present
- `nodes` array non-empty

### Step 1.4 — Collect Missing Required Variables

For each variable in `context_schema` where `required: true`:
- If not in `bound_context`: collect via AskUserQuestion
- If has `default` value: use default if not provided

```
AskUserQuestion({
  questions: [{
    question: "Provide values for required workflow inputs:",
    header: "Workflow: <template.name>",
    // one question per missing required variable
  }]
})
```

For optional variables not provided: use `default` value or leave as empty string.

### Step 1.5 — Bind Variables

Apply substitution throughout all `args_template` strings:
- Replace `{variable_name}` with `bound_context[variable_name]`
- Leave `{N-001.session_id}` and `{prev_*}` references unresolved — these are runtime-resolved in Phase 3

Write bound context to memory for Phase 3 use.

### Step 1.6 — Dry Run Output (if --dry-run)

Print execution plan and exit:
```
Workflow: <template.name>
Context:
  goal = "<value>"
  scope = "<value>"

Execution Plan:
  [1] N-001  [skill]       workflow-lite-plan   "<goal>"
  [2] CP-01  [checkpoint]  After Plan           auto-continue
  [3] N-002  [skill]       workflow-execute     --resume-session {N-001.session_id}
  [4] CP-02  [checkpoint]  Before Tests         pause-for-user
  [5] N-003  [skill]       workflow-test-fix    --session {N-002.session_id}

To execute: Skill(skill="wf-player", args="<slug> --context goal='...'")
```

## Success Criteria

- Template loaded and validated
- All required context variables bound
- bound_context{} available for Phase 2
