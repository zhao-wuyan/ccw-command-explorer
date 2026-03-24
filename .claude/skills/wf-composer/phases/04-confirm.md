# Phase 4: Confirm — Visualize + User Approval

## Objective

Render the pipeline as an ASCII diagram, present to user for confirmation and optional edits.

## Workflow

### Step 4.1 — Render Pipeline

Load `design-session/dag.json`. Render in topological order:

```
Pipeline: <template-name>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 N-001  [skill]       workflow-lite-plan         "{goal}"
   |
 CP-01  [checkpoint]  After Plan                 auto-continue
   |
 N-002  [skill]       workflow-execute            --resume {N-001.session_id}
   |
 CP-02  [checkpoint]  Before Review              pause-for-user
   |
 N-003  [skill]       review-cycle               --session {N-002.session_id}
   |
 N-004  [skill]       workflow-test-fix           --session {N-002.session_id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Variables (required):  goal
Checkpoints:           2  (1 auto-continue, 1 pause-for-user)
Nodes:                 4 work + 2 checkpoints
```

For parallel groups, show fan-out/fan-in:
```
 N-003a [skill]  review-cycle    ─┐
                                   ├─ N-004 [skill] workflow-test-fix
 N-003b [cli]    gemini analysis  ─┘
```

### Step 4.2 — Ask User

```
AskUserQuestion({
  questions: [{
    question: "Review the workflow pipeline above.",
    header: "Confirm Pipeline",
    options: [
      { label: "Confirm & Save", description: "Save as reusable template" },
      { label: "Edit a node", description: "Modify executor or args of a specific node" },
      { label: "Add a node", description: "Insert a new step at a position" },
      { label: "Remove a node", description: "Delete a step from the pipeline" },
      { label: "Rename template", description: "Change the template name" },
      { label: "Re-run checkpoint injection", description: "Reset and re-inject checkpoints" },
      { label: "Cancel", description: "Discard and exit" }
    ]
  }]
})
```

### Step 4.3 — Handle Edit Actions

**Edit a node**:
- AskUserQuestion: "Which node ID to edit?" → show fields → apply change
- Re-render pipeline and re-ask

**Add a node**:
- AskUserQuestion: "Insert after which node ID?" + "Describe the new step"
- Re-run Phase 2 (resolve) for the new step description
- Insert new node + update edges
- Re-run Phase 3 (enrich) for checkpoint injection
- Re-render and re-ask

**Remove a node**:
- AskUserQuestion: "Which node ID to remove?"
- If node is a checkpoint: also remove it, re-wire edges
- If node is a work node: re-wire edges, re-run checkpoint injection
- Re-render and re-ask

**Rename template**:
- AskUserQuestion: "New template name?"
- Update slug for template_id

### Step 4.4 — Finalize

On "Confirm & Save":
- Freeze dag.json (mark as confirmed)
- Proceed to Phase 5

On "Cancel":
- Save draft to `design-session/dag-draft.json`
- Output: "Draft saved. Resume with: Skill(skill='wf-composer', args='--resume <session-id>')"
- Exit

## Success Criteria

- User selected "Confirm & Save"
- dag.json frozen with all user edits applied
