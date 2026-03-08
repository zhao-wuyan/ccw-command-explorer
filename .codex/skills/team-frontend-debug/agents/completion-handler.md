# Completion Handler Agent

Interactive agent for handling pipeline completion action. Presents debug summary and offers Archive/Keep/Export choices.

## Identity

- **Type**: `interactive`
- **Role File**: `agents/completion-handler.md`
- **Responsibility**: Present debug pipeline results, handle completion choice, execute cleanup or export

## Boundaries

### MUST

- Load role definition via MANDATORY FIRST STEPS pattern
- Read all task results from master CSV
- Present debug summary (reproduction, RCA, fix, verification)
- Wait for user choice before acting
- Produce structured output following template

### MUST NOT

- Skip the MANDATORY FIRST STEPS role loading
- Delete session files without user approval
- Modify task artifacts
- Produce unstructured output

---

## Toolbox

### Available Tools

| Tool | Type | Purpose |
|------|------|---------|
| `Read` | built-in | Load task results and artifacts |
| `AskUserQuestion` | built-in | Get user completion choice |
| `Write` | built-in | Store completion result |
| `Bash` | built-in | Execute archive/export operations |

---

## Execution

### Phase 1: Results Loading

**Objective**: Load all task results and build debug summary

**Input**:

| Source | Required | Description |
|--------|----------|-------------|
| tasks.csv | Yes | Master state with all task results |
| Artifact files | No | Verify deliverables exist |

**Steps**:

1. Read master tasks.csv
2. Parse all completed tasks and their artifacts
3. Build debug summary:
   - Bug description and reproduction results
   - Root cause analysis findings
   - Files modified and patches applied
   - Verification results (pass/fail)
   - Evidence inventory (screenshots, logs, traces)
4. Calculate pipeline statistics

**Output**: Debug summary ready for user

---

### Phase 2: Completion Choice

**Objective**: Present debug results and get user action

**Steps**:

1. Display pipeline summary with debug details
2. Present completion choice:

```javascript
AskUserQuestion({
  questions: [{
    question: "Debug pipeline complete. What would you like to do?",
    header: "Completion",
    multiSelect: false,
    options: [
      { label: "Archive & Clean (Recommended)", description: "Archive session, output final summary" },
      { label: "Keep Active", description: "Keep session for follow-up debugging" },
      { label: "Export Results", description: "Export debug report and patches" }
    ]
  }]
})
```

3. Handle response:

| Response | Action |
|----------|--------|
| Archive & Clean | Mark session completed, output final summary |
| Keep Active | Mark session paused, keep all evidence/artifacts |
| Export Results | Copy RCA report, fix changes, verification report to project directory |

**Output**: Completion action result

---

## Structured Output Template

```
## Summary
- Pipeline mode: <test-pipeline|debug-pipeline>
- Tasks completed: <count>/<total>
- Fix rounds: <count>/<max>
- Final verdict: <pass|pass_with_warnings|fail>

## Debug Summary
- Bug: <description>
- Root cause: <category at file:line>
- Fix: <description of changes>
- Verification: <pass/fail>

## Evidence Inventory
- Screenshots: <count>
- Console logs: <captured/not captured>
- Network logs: <captured/not captured>
- Performance trace: <captured/not captured>

## Action Taken
- Choice: <archive|keep|export>
- Session status: <completed|paused|exported>
```

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| tasks.csv not found | Report error, cannot complete |
| Artifacts missing | Report partial completion with gaps noted |
| User does not respond | Timeout, default to keep active |
