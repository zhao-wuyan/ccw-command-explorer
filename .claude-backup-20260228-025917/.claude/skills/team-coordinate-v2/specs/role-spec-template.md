# Dynamic Role-Spec Template

Template used by coordinator to generate lightweight worker role-spec files at runtime. Each generated role-spec is written to `<session>/role-specs/<role-name>.md`.

**Key difference from v1**: Role-specs contain ONLY Phase 2-4 domain logic + YAML frontmatter. All shared behavior (Phase 1 Task Discovery, Phase 5 Report/Fast-Advance, Message Bus, Consensus, Inner Loop) is built into the `team-worker` agent.

## Template

```markdown
---
role: <role_name>
prefix: <PREFIX>
inner_loop: <true|false>
subagents: [<subagent-names>]
message_types:
  success: <prefix>_complete
  error: error
---

# <Role Name> — Phase 2-4

## Phase 2: <phase2_name>

<phase2_content>

## Phase 3: <phase3_name>

<phase3_content>

## Phase 4: <phase4_name>

<phase4_content>

## Error Handling

| Scenario | Resolution |
|----------|------------|
<error_entries>
```

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `role` | Yes | Role name matching session registry |
| `prefix` | Yes | Task prefix to filter (e.g., RESEARCH, DRAFT, IMPL) |
| `inner_loop` | Yes | Whether team-worker loops through same-prefix tasks |
| `subagents` | No | Array of subagent types this role may call |
| `message_types` | Yes | Message type mapping for team_msg |
| `message_types.success` | Yes | Type string for successful completion |
| `message_types.error` | Yes | Type string for errors (usually "error") |

## Design Rules

| Rule | Description |
|------|-------------|
| Phase 2-4 only | No Phase 1 (Task Discovery) or Phase 5 (Report) — team-worker handles these |
| No message bus code | No team_msg calls — team-worker handles logging |
| No consensus handling | No consensus_reached/blocked logic — team-worker handles routing |
| No inner loop logic | No Phase 5-L/5-F — team-worker handles looping |
| ~80 lines target | Lightweight, domain-focused |
| No pseudocode | Decision tables + text + tool calls only |
| `<placeholder>` notation | Use angle brackets for variable substitution |
| Reference subagents by name | team-worker resolves invocation from its delegation templates |

## Phase 2-4 Content by Responsibility Type

Select the matching section based on `responsibility_type` from task analysis.

### orchestration

**Phase 2: Context Assessment**

```
| Input | Source | Required |
|-------|--------|----------|
| Task description | From TaskGet | Yes |
| Shared memory | <session>/shared-memory.json | No |
| Prior artifacts | <session>/artifacts/ | No |
| Wisdom | <session>/wisdom/ | No |

Loading steps:
1. Extract session path from task description
2. Read shared-memory.json for cross-role context
3. Read prior artifacts (if any from upstream tasks)
4. Load wisdom files for accumulated knowledge
5. Optionally call explore subagent for codebase context
```

**Phase 3: Subagent Execution**

```
Delegate to appropriate subagent based on task:

Task({
  subagent_type: "general-purpose",
  run_in_background: false,
  description: "<task-type> for <task-id>",
  prompt: "## Task
  - <task description>
  - Session: <session-folder>
  ## Context
  <prior artifacts + shared memory + explore results>
  ## Expected Output
  Write artifact to: <session>/artifacts/<artifact-name>.md
  Return JSON summary: { artifact_path, summary, key_decisions[], warnings[] }"
})
```

**Phase 4: Result Aggregation**

```
1. Verify subagent output artifact exists
2. Read artifact, validate structure/completeness
3. Update shared-memory.json with key findings
4. Write insights to wisdom/ files
```

### code-gen (docs)

**Phase 2: Load Prior Context**

```
| Input | Source | Required |
|-------|--------|----------|
| Task description | From TaskGet | Yes |
| Prior artifacts | <session>/artifacts/ from upstream | Conditional |
| Shared memory | <session>/shared-memory.json | No |

Loading steps:
1. Extract session path from task description
2. Read upstream artifacts
3. Read shared-memory.json for cross-role context
```

**Phase 3: Document Generation**

```
Task({
  subagent_type: "universal-executor",
  run_in_background: false,
  description: "Generate <doc-type> for <task-id>",
  prompt: "## Task
  - Generate: <document type>
  - Session: <session-folder>
  ## Prior Context
  <upstream artifacts + shared memory>
  ## Expected Output
  Write document to: <session>/artifacts/<doc-name>.md
  Return JSON: { artifact_path, summary, key_decisions[], warnings[] }"
})
```

**Phase 4: Structure Validation**

```
1. Verify document artifact exists
2. Check document has expected sections
3. Validate no placeholder text remains
4. Update shared-memory.json with document metadata
```

### code-gen (code)

**Phase 2: Load Plan/Specs**

```
| Input | Source | Required |
|-------|--------|----------|
| Task description | From TaskGet | Yes |
| Plan/design artifacts | <session>/artifacts/ | Conditional |
| Shared memory | <session>/shared-memory.json | No |

Loading steps:
1. Extract session path from task description
2. Read plan/design artifacts from upstream
3. Load shared-memory.json for implementation context
```

**Phase 3: Code Implementation**

```
Task({
  subagent_type: "code-developer",
  run_in_background: false,
  description: "Implement <task-id>",
  prompt: "## Task
  - <implementation description>
  - Session: <session-folder>
  ## Plan/Design Context
  <upstream artifacts>
  ## Expected Output
  Implement code changes.
  Write summary to: <session>/artifacts/implementation-summary.md
  Return JSON: { artifact_path, summary, files_changed[], warnings[] }"
})
```

**Phase 4: Syntax Validation**

```
1. Run syntax check (tsc --noEmit or equivalent)
2. Verify all planned files exist
3. If validation fails -> attempt auto-fix (max 2 attempts)
4. Write implementation summary to artifacts/
```

### read-only

**Phase 2: Target Loading**

```
| Input | Source | Required |
|-------|--------|----------|
| Task description | From TaskGet | Yes |
| Target artifacts/files | From task description or upstream | Yes |
| Shared memory | <session>/shared-memory.json | No |

Loading steps:
1. Extract session path and target files from task description
2. Read target artifacts or source files for analysis
3. Load shared-memory.json for context
```

**Phase 3: Multi-Dimension Analysis**

```
Task({
  subagent_type: "general-purpose",
  run_in_background: false,
  description: "Analyze <target> for <task-id>",
  prompt: "## Task
  - Analyze: <target description>
  - Dimensions: <analysis dimensions from coordinator>
  - Session: <session-folder>
  ## Target Content
  <artifact content or file content>
  ## Expected Output
  Write report to: <session>/artifacts/analysis-report.md
  Return JSON: { artifact_path, summary, findings[], severity_counts }"
})
```

**Phase 4: Severity Classification**

```
1. Verify analysis report exists
2. Classify findings by severity (Critical/High/Medium/Low)
3. Update shared-memory.json with key findings
4. Write issues to wisdom/issues.md
```

### validation

**Phase 2: Environment Detection**

```
| Input | Source | Required |
|-------|--------|----------|
| Task description | From TaskGet | Yes |
| Implementation artifacts | Upstream code changes | Yes |

Loading steps:
1. Detect test framework from project files
2. Get changed files from implementation
3. Identify test command and coverage tool
```

**Phase 3: Test-Fix Cycle**

```
Task({
  subagent_type: "test-fix-agent",
  run_in_background: false,
  description: "Test-fix for <task-id>",
  prompt: "## Task
  - Run tests and fix failures
  - Session: <session-folder>
  - Max iterations: 5
  ## Changed Files
  <from upstream implementation>
  ## Expected Output
  Write report to: <session>/artifacts/test-report.md
  Return JSON: { artifact_path, pass_rate, coverage, remaining_failures[] }"
})
```

**Phase 4: Result Analysis**

```
1. Check pass rate >= 95%
2. Check coverage meets threshold
3. Generate test report with pass/fail counts
4. Update shared-memory.json with test results
```
