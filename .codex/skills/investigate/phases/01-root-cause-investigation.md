# Phase 1: Root Cause Investigation

> **COMPACT PROTECTION**: This is a core execution phase. If context compression has occurred and this file is only a summary, **MUST `Read` this file again before executing any Step**. Do not execute from memory.

Reproduce the bug and collect all available evidence before forming any theories.

## Objective

- Reproduce the bug with concrete, observable symptoms
- Collect all evidence: error messages, logs, stack traces, affected files
- Establish a baseline understanding of what goes wrong and where
- Use inline CLI analysis for initial diagnosis

## Input

| Source | Required | Description |
|--------|----------|-------------|
| assign_task message | Yes | Bug description, symptom, expected behavior, context, user-provided errors |
| User-provided files | Optional | Any files or paths the user mentioned as relevant |

## Execution Steps

### Step 1: Parse the Bug Report

Extract the following from the user's description:
- **Symptom**: What observable behavior is wrong?
- **Expected**: What should happen instead?
- **Context**: When/where does it occur? (specific input, environment, timing)
- **User-provided files**: Any files mentioned
- **User-provided errors**: Any error messages provided

Assemble the extracted fields as the initial `investigation-report` structure in memory:

```
bugReport = {
  symptom: <extracted from description>,
  expected_behavior: <what should happen>,
  context: <when/where it occurs>,
  user_provided_files: [<files mentioned>],
  user_provided_errors: [<error messages>]
}
```

---

### Step 2: Reproduce the Bug

Attempt reproduction using the most direct method available:

| Method | When to use |
|--------|-------------|
| Run failing test | A specific failing test is known or can be identified |
| Run failing command | Bug is triggered by a CLI command or script |
| Static code path trace | Reproduction requires complex setup; use Read + Grep to trace the path |

Execution for each method:

**Run failing test**:
```
Bash: <detect test runner and run the specific failing test>
```

**Run failing command**:
```
Bash: <execute the command that triggers the bug>
```

**Static code path trace**:
- Use Grep to find the error message text in source
- Use Read to trace the code path that produces the error
- Document the theoretical reproduction path

**Decision table**:

| Outcome | Action |
|---------|--------|
| Reproduction successful | Document steps and method, proceed to Step 3 |
| Reproduction failed | Document what was attempted, note as concern, continue with static analysis |

---

### Step 3: Collect Evidence

Gather all available evidence using project tools:

1. Search for the exact error message text in source files (Grep with 3 lines of context).
2. Search for related log output patterns.
3. Read any stack trace files or test output files if they exist on disk.
4. Use Glob to identify all files in the affected module or area.
5. Read the most directly implicated source files.

Compile findings into the evidence section of the investigation-report:

```
evidence = {
  error_messages: [<exact error text>],
  stack_traces: [<relevant stack trace>],
  affected_files: [<file1>, <file2>],
  affected_modules: [<module-name>],
  log_output: [<relevant log lines>]
}
```

---

### Step 4: Initial Diagnosis via Inline CLI Analysis

Spawn inline-cli-analysis subagent for broader diagnostic perspective:

```
spawn_agent({
  task_name: "inline-cli-analysis",
  fork_context: false,
  model: "haiku",
  reasoning_effort: "medium",
  message: `### MANDATORY FIRST STEPS
1. Read: ~/.codex/agents/cli-explore-agent.md

PURPOSE: Diagnose root cause of bug from collected evidence
TASK: Analyze error context | Trace data flow | Identify suspicious code patterns
MODE: analysis
CONTEXT: @<affected_files_from_step3> | Evidence: <error_messages_and_traces>
EXPECTED: Top 3 likely root causes ranked by evidence strength, each with file:line reference
CONSTRAINTS: Read-only analysis | Focus on <affected_module>`
})
const diagResult = wait_agent({ targets: ["inline-cli-analysis"], timeout_ms: 180000 })
close_agent({ target: "inline-cli-analysis" })
```

Record results in initial_diagnosis section:

```
initial_diagnosis = {
  cli_tool_used: "inline-cli-analysis",
  top_suspects: [
    { description: <suspect 1>, evidence_strength: "strong|moderate|weak", files: [<files>] }
  ]
}
```

**Decision table**:

| Outcome | Action |
|---------|--------|
| Subagent returns top suspects | Integrate into investigation-report, proceed to Step 5 |
| Subagent timeout or error | Log warning in investigation-report, proceed to Step 5 without subagent findings |

---

### Step 5: Assemble Investigation Report

Combine all findings into the complete Phase 1 investigation-report:

```
investigation_report = {
  phase: 1,
  bug_description: <concise one-sentence description>,
  reproduction: {
    reproducible: true|false,
    steps: ["step 1: ...", "step 2: ...", "step 3: observe error"],
    reproduction_method: "test|command|static_analysis"
  },
  evidence: {
    error_messages: [<exact error text>],
    stack_traces: [<relevant stack trace>],
    affected_files: [<file1>, <file2>],
    affected_modules: [<module-name>],
    log_output: [<relevant log lines>]
  },
  initial_diagnosis: {
    cli_tool_used: "inline-cli-analysis",
    top_suspects: [
      { description: <suspect>, evidence_strength: "strong|moderate|weak", files: [] }
    ]
  }
}
```

Output Phase 1 summary and await assign_task for Phase 2.

---

## Output

| Artifact | Format | Description |
|----------|--------|-------------|
| investigation-report (phase 1) | In-memory JSON | bug_description, reproduction, evidence, initial_diagnosis |
| Phase 1 summary | Structured text output | Summary for orchestrator, await Phase 2 assignment |

## Success Criteria

| Criterion | Validation Method |
|-----------|-------------------|
| Bug symptom clearly documented | bug_description field populated with 10+ chars |
| Reproduction attempted | reproduction.reproducible is true or failure documented |
| At least one concrete evidence item collected | evidence.error_messages OR stack_traces OR affected_files non-empty |
| Affected files identified | evidence.affected_files non-empty |
| Initial diagnosis generated | initial_diagnosis.top_suspects has at least one entry (or timeout documented) |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Cannot reproduce bug | Document what was attempted, set reproducible: false, continue with static analysis |
| Error message not found in source | Expand search to whole project, try related terms, continue |
| No affected files identifiable | Use Glob on broad patterns, document uncertainty |
| inline-cli-analysis timeout | Continue without subagent result, log warning in initial_diagnosis |
| User description insufficient | Document in Open Questions, proceed with available information |

## Next Phase

-> [Phase 2: Pattern Analysis](02-pattern-analysis.md)
