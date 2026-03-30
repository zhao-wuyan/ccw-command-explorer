---
name: ship
description: Structured release pipeline with pre-flight checks, AI code review, version bump, changelog, and PR creation. Triggers on "ship", "release", "publish".
agents: ship-operator
phases: 5
---

# Ship

Structured release pipeline that guides code from working branch to pull request through 5 gated phases: pre-flight checks, automated code review, version bump, changelog generation, and PR creation.

## Architecture

```
+--------------------------------------------------------------+
|  ship Orchestrator                                           |
|  -> Single ship-operator agent driven through 5 gated phases |
+------------------------------+-------------------------------+
                               |
           +-------------------+-------------------+
           v                   v                   v
    +------------+      +------------+      +------------+
    |  Phase 1   |  --> |  Phase 2   |  --> |  Phase 3   |
    | Pre-Flight |      | Code Review|      | Version    |
    |  Checks    |      |            |      |   Bump     |
    +------------+      +------------+      +------------+
          v                   v                   v
      Gate: ALL           Gate: No            Gate: Version
      4 checks            critical            updated OK
      pass                issues
                               |
           +-------------------+-------------------+
           v                                       v
    +------------+                          +------------+
    |  Phase 4   |  ----------------------> |  Phase 5   |
    | Changelog  |                          | PR Creation|
    |  & Commit  |                          |            |
    +------------+                          +------------+
          v                                       v
      Gate: Push                             Gate: PR
      succeeded                              created
```

---

## Agent Registry

| Agent | task_name | Role File | Responsibility | Pattern | fork_context |
|-------|-----------|-----------|----------------|---------|--------------|
| ship-operator | ship-operator | ~/.codex/agents/ship-operator.md | Execute all 5 release phases sequentially, enforce gates | Deep Interaction (2.3) | false |

> **COMPACT PROTECTION**: Agent files are execution documents. When context compression occurs and agent instructions are reduced to summaries, **you MUST immediately `Read` the corresponding agent.md to reload before continuing execution**.

---

## Fork Context Strategy

| Agent | task_name | fork_context | fork_from | Rationale |
|-------|-----------|--------------|-----------|-----------|
| ship-operator | ship-operator | false | — | Starts fresh; all context provided in initial task message |

**Fork Decision Rules**:

| Condition | fork_context | Reason |
|-----------|--------------|--------|
| Pipeline stage with explicit input | false | Context in message, not history |
| Agent is isolated utility | false | Clean context, focused task |
| ship-operator | false | Self-contained release operator; no parent context needed |

---

## Subagent Registry

Utility subagents callable by ship-operator (not separate pipeline stages):

| Subagent | Agent File | Callable By | Purpose | Model |
|----------|-----------|-------------|---------|-------|
| inline-code-review | ~/.codex/agents/cli-explore-agent.md | ship-operator | AI code review of diff during Phase 2 | haiku |

> Subagents are spawned by agents within their own execution context (Pattern 2.8), not by the orchestrator.

---

## Phase Execution

### Phase 1: Pre-Flight Checks

**Objective**: Validate that the repository is in a shippable state — confirm clean working tree, appropriate branch, passing tests, and successful build.

**Input**:

| Source | Description |
|--------|-------------|
| User trigger | "ship" / "release" / "publish" command |
| Repository | Current git working directory |
| Phase detail | ~/.codex/skills/ship/phases/01-preflight-checks.md |

**Execution**:

Spawn ship-operator with Phase 1 task. The operator reads the phase detail file then executes all four checks.

```
spawn_agent({
  task_name: "ship-operator",
  fork_context: false,
  message: `## TASK ASSIGNMENT

### MANDATORY FIRST STEPS
1. Read role definition: ~/.codex/agents/ship-operator.md (MUST read first)
2. Read phase detail: ~/.codex/skills/ship/phases/01-preflight-checks.md

---

Goal: Execute Phase 1 Pre-Flight Checks for the release pipeline.

Execute all four checks (git clean, branch validation, test suite, build verification).
Output structured preflight-report JSON plus gate status.`
})
const phase1Result = wait_agent({ targets: ["ship-operator"], timeout_ms: 300000 })
```

**Gate Decision**:

| Condition | Action |
|-----------|--------|
| All four checks pass (overall: "pass") | Fast-advance: assign Phase 2 task to ship-operator |
| Any check fails (overall: "fail") | BLOCKED — report failure details, halt pipeline |
| Branch is main/master (warn) | Ask user to confirm direct-to-main release before proceeding |
| Timeout | assign_task "Finalize current work and output results", re-wait 120s |

**Output**:

| Artifact | Description |
|----------|-------------|
| preflight-report JSON | Pass/fail per check, blockers list |
| Gate status | pass / fail / blocked |

---

### Phase 2: Code Review

**Objective**: Detect merge base, generate diff, run AI-powered code review via inline subagent, assess risk, evaluate results.

**Input**:

| Source | Description |
|--------|-------------|
| Phase 1 result | Gate passed (overall: "pass") |
| Repository | Git history, diff data |
| Phase detail | ~/.codex/skills/ship/phases/02-code-review.md |

**Execution**:

Phase 2 is assigned to the already-running ship-operator via assign_task.

```
assign_task({
  target: "ship-operator",
  items: [{ type: "text", text: `## PHASE 2 TASK

Read phase detail: ~/.codex/skills/ship/phases/02-code-review.md

Execute Phase 2 Code Review:
1. Detect merge base
2. Generate diff summary
3. Perform risk assessment
4. Spawn inline-code-review subagent for AI analysis
5. Evaluate review results and report gate status` }]
})
const phase2Result = wait_agent({ targets: ["ship-operator"], timeout_ms: 600000 })
```

**Gate Decision**:

| Condition | Action |
|-----------|--------|
| No critical issues (overall: "pass") | Fast-advance: assign Phase 3 task to ship-operator |
| Critical issues found (overall: "fail") | BLOCKED — report critical issues list, halt pipeline |
| Warnings only (overall: "warn") | Fast-advance to Phase 3, flag DONE_WITH_CONCERNS |
| Review subagent timeout/error | Ask user whether to proceed or retry; if proceed, flag warn |
| Timeout on phase2Result | assign_task "Finalize current work", re-wait 120s |

**Output**:

| Artifact | Description |
|----------|-------------|
| Review summary JSON | Risk level, risk factors, AI review recommendation, issues |
| Gate status | pass / fail / warn / blocked |

---

### Phase 3: Version Bump

**Objective**: Detect version file, determine bump type from commits or user input, calculate new version, update version file, verify update.

**Input**:

| Source | Description |
|--------|-------------|
| Phase 2 result | Gate passed (no critical issues) |
| Repository | package.json / pyproject.toml / VERSION |
| Phase detail | ~/.codex/skills/ship/phases/03-version-bump.md |

**Execution**:

```
assign_task({
  target: "ship-operator",
  items: [{ type: "text", text: `## PHASE 3 TASK

Read phase detail: ~/.codex/skills/ship/phases/03-version-bump.md

Execute Phase 3 Version Bump:
1. Detect version file (package.json > pyproject.toml > VERSION)
2. Determine bump type from commit messages (patch/minor/major)
3. For major bumps: ask user to confirm before proceeding
4. Calculate new version
5. Update version file
6. Verify update
Output version change record JSON plus gate status.` }]
})
const phase3Result = wait_agent({ targets: ["ship-operator"], timeout_ms: 300000 })
```

**Gate Decision**:

| Condition | Action |
|-----------|--------|
| Version file updated and verified (overall: "pass") | Fast-advance: assign Phase 4 task to ship-operator |
| Version file not found | NEEDS_CONTEXT — ask user which file to use; halt until answered |
| Version mismatch after update (overall: "fail") | BLOCKED — report mismatch, halt pipeline |
| User declines major bump | BLOCKED — halt, user must re-trigger with explicit bump type |
| Timeout | assign_task "Finalize current work", re-wait 120s |

**Output**:

| Artifact | Description |
|----------|-------------|
| Version change record JSON | version_file, previous_version, new_version, bump_type, bump_source |
| Gate status | pass / fail / needs_context / blocked |

---

### Phase 4: Changelog & Commit

**Objective**: Parse git log into grouped changelog entry, update CHANGELOG.md, create release commit, push branch to remote.

**Input**:

| Source | Description |
|--------|-------------|
| Phase 3 result | new_version, version_file, bump_type |
| Repository | Git history since last tag |
| Phase detail | ~/.codex/skills/ship/phases/04-changelog-commit.md |

**Execution**:

```
assign_task({
  target: "ship-operator",
  items: [{ type: "text", text: `## PHASE 4 TASK

Read phase detail: ~/.codex/skills/ship/phases/04-changelog-commit.md

New version: <new_version>
Version file: <version_file>

Execute Phase 4 Changelog & Commit:
1. Gather commits since last tag
2. Group by conventional commit type
3. Format changelog entry
4. Update or create CHANGELOG.md
5. Create release commit (chore: bump version to <new_version>)
6. Push branch to remote
Output commit record JSON plus gate status.` }]
})
const phase4Result = wait_agent({ targets: ["ship-operator"], timeout_ms: 300000 })
```

**Gate Decision**:

| Condition | Action |
|-----------|--------|
| Push succeeded (overall: "pass") | Fast-advance: assign Phase 5 task to ship-operator |
| Push rejected (non-fast-forward) | BLOCKED — report error, suggest `git pull --rebase` |
| Permission denied | BLOCKED — report error, advise check remote access |
| No remote configured | BLOCKED — report error, suggest `git remote add` |
| Timeout | assign_task "Finalize current work", re-wait 120s |

**Output**:

| Artifact | Description |
|----------|-------------|
| Commit record JSON | changelog_entry, commit_sha, commit_message, pushed_to |
| Gate status | pass / fail / blocked |

---

### Phase 5: PR Creation

**Objective**: Extract issue references from commits, build PR title and body, create PR via `gh pr create`, capture PR URL.

**Input**:

| Source | Description |
|--------|-------------|
| Phase 4 result | commit_sha, new_version, previous_version, bump_type |
| Phase 2 result | merge_base (for change_summary) |
| Repository | Git history, remote |
| Phase detail | ~/.codex/skills/ship/phases/05-pr-creation.md |

**Execution**:

```
assign_task({
  target: "ship-operator",
  items: [{ type: "text", text: `## PHASE 5 TASK

Read phase detail: ~/.codex/skills/ship/phases/05-pr-creation.md

New version: <new_version>
Previous version: <previous_version>
Bump type: <bump_type>
Merge base: <merge_base>
Commit SHA: <commit_sha>

Execute Phase 5 PR Creation:
1. Extract issue references from commits
2. Determine target branch
3. Build PR title: "release: v<new_version>"
4. Build PR body with all sections
5. Create PR via gh pr create
6. Capture and report PR URL
Output PR creation record JSON plus final completion status.` }]
})
const phase5Result = wait_agent({ targets: ["ship-operator"], timeout_ms: 300000 })
```

**Gate Decision**:

| Condition | Action |
|-----------|--------|
| PR created, URL returned (overall: "pass") | Pipeline complete — output DONE status |
| PR created with review warnings | Pipeline complete — output DONE_WITH_CONCERNS |
| gh CLI not available | BLOCKED — report error, advise `gh auth login` |
| PR creation fails | BLOCKED — report error details, halt |
| Timeout | assign_task "Finalize current work", re-wait 120s |

**Output**:

| Artifact | Description |
|----------|-------------|
| PR record JSON | pr_url, pr_title, target_branch, source_branch, linked_issues |
| Final completion status | DONE / DONE_WITH_CONCERNS / BLOCKED |

---

## Lifecycle Management

### Timeout Protocol

| Phase | Default Timeout | On Timeout |
|-------|-----------------|------------|
| Phase 1: Pre-Flight | 300000 ms (5 min) | assign_task "Finalize current work", re-wait 120s |
| Phase 2: Code Review | 600000 ms (10 min) | assign_task "Finalize current work", re-wait 120s |
| Phase 3: Version Bump | 300000 ms (5 min) | assign_task "Finalize current work", re-wait 120s |
| Phase 4: Changelog & Commit | 300000 ms (5 min) | assign_task "Finalize current work", re-wait 120s |
| Phase 5: PR Creation | 300000 ms (5 min) | assign_task "Finalize current work", re-wait 120s |

### Cleanup Protocol

After Phase 5 completes (or on any terminal BLOCKED halt), close ship-operator.

```
close_agent({ target: "ship-operator" })
```

### Agent Health Check

```
const remaining = list_agents({})
if (remaining.length > 0) {
  remaining.forEach(agent => close_agent({ target: agent.id }))
}
```

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Agent timeout (first) | assign_task with "Finalize current work and output results" + re-wait 120s |
| Agent timeout (second) | Log error, close_agent({ target: "ship-operator" }), report partial results |
| Gate fail — any phase | Log BLOCKED status with phase name and failure detail, close_agent, halt |
| NEEDS_CONTEXT | Pause pipeline, surface question to user, resume with assign_task on answer |
| send_message ignored | Escalate to assign_task |
| Inline subagent timeout | ship-operator handles internally; continue with warn if review failed |
| User cancellation | close_agent({ target: "ship-operator" }), report current pipeline state |
| Fork from closed agent | Not applicable (single agent, no forking) |

---

## Output Format

```
## Summary
- One-sentence completion status (DONE / DONE_WITH_CONCERNS / BLOCKED)

## Results
- Phase 1 Pre-Flight: pass/fail
- Phase 2 Code Review: pass/warn/fail
- Phase 3 Version Bump: <previous> -> <new> (<bump_type>)
- Phase 4 Changelog & Commit: commit <sha> pushed to <remote/branch>
- Phase 5 PR Creation: <pr_url>

## Artifacts
- CHANGELOG.md (updated)
- <version_file> (version bumped to <new_version>)
- Release commit: <sha>
- PR: <pr_url>

## Next Steps (Optional)
1. Review and merge the PR
2. Tag the release after merge
```
