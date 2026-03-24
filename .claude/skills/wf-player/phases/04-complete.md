# Phase 4: Complete — Archive + Summary

## Objective

Mark session complete, output execution summary with artifact paths, offer archive/keep options.

## Workflow

### Step 4.1 — Mark Session Complete

Load `session-state.json`.

Set:
```json
{
  "status": "completed",
  "completed_at": "<ISO timestamp>"
}
```

Write back to `session-state.json`.

### Step 4.2 — Collect Artifacts

Aggregate all artifacts from node_states:
```javascript
const artifacts = Object.values(node_states)
  .filter(s => s.artifacts && s.artifacts.length > 0)
  .flatMap(s => s.artifacts.map(a => ({ node: s.node_id, path: a })));

const outputPaths = Object.values(node_states)
  .filter(s => s.output_path)
  .map(s => ({ node: s.node_id, path: s.output_path }));
```

### Step 4.3 — Execution Summary

```
[wf-player] ============================================
[wf-player] COMPLETE: <template_name>
[wf-player]
[wf-player] Session: <session_id>
[wf-player] Context: goal="<value>"
[wf-player]
[wf-player] Nodes: <completed>/<total> completed
[wf-player]   N-001  workflow-lite-plan     ✓  (WFS-plan-xxx)
[wf-player]   CP-01  After Plan             ✓  (checkpoint saved)
[wf-player]   N-002  workflow-execute       ✓  (WFS-exec-xxx)
[wf-player]   CP-02  Before Tests           ✓  (checkpoint saved)
[wf-player]   N-003  workflow-test-fix      ✓  (WFS-test-xxx)
[wf-player]
[wf-player] Artifacts:
[wf-player]   - IMPL_PLAN.md         (N-001)
[wf-player]   - src/auth/index.ts    (N-002)
[wf-player]   - test/auth.test.ts    (N-003)
[wf-player]
[wf-player] Session dir: .workflow/sessions/<session_id>/
[wf-player] ============================================
```

### Step 4.4 — Completion Action

```
AskUserQuestion({
  questions: [{
    question: "Workflow complete. What would you like to do?",
    header: "Completion Action",
    options: [
      { label: "Archive session", description: "Move session to .workflow/sessions/archive/" },
      { label: "Keep session", description: "Leave session active for follow-up" },
      { label: "Run again", description: "Re-run template with same or new context" },
      { label: "Nothing", description: "Done" }
    ]
  }]
})
```

**Archive**:
- Move `<session_dir>` to `.workflow/sessions/archive/<session_id>/`
- Update `session-state.json` status = "archived"

**Keep**: No action, session stays at `.workflow/sessions/<session_id>/`

**Run again**:
- AskUserQuestion: "Same context or new?" → new context → re-enter Phase 1

**Nothing**: Output final artifact paths list, done.

## Success Criteria

- session-state.json status = "completed" or "archived"
- All artifact paths listed in console output
- User presented completion action options
