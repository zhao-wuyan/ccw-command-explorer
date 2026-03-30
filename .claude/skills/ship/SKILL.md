---
name: ship
description: Structured release pipeline with pre-flight checks, AI code review, version bump, changelog, and PR creation. Triggers on "ship", "release", "publish".
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Ship

Structured release pipeline that guides code from working branch to pull request through 5 gated phases: pre-flight checks, automated code review, version bump, changelog generation, and PR creation.

## Key Design Principles

1. **Phase Gates**: Each phase must pass before the next begins — no shipping broken code
2. **Multi-Project Support**: Detects npm (package.json), Python (pyproject.toml), and generic (VERSION) projects
3. **AI-Powered Review**: Uses CCW CLI to run automated code review before release
4. **Audit Trail**: Each phase produces structured output for traceability
5. **Safe Defaults**: Warns on risky operations (direct push to main, major version bumps)

## Architecture Overview

```
User: "ship" / "release" / "publish"
         |
         v
┌──────────────────────────────────────────────────────────┐
│  Phase 1: Pre-Flight Checks                              │
│  → git clean? branch ok? tests pass? build ok?           │
│  → Output: preflight-report.json                         │
│  → Gate: ALL checks must pass                            │
├──────────────────────────────────────────────────────────┤
│  Phase 2: Code Review                                    │
│  → detect merge base, diff against base                  │
│  → ccw cli --tool gemini --mode analysis                 │
│  → flag high-risk changes                                │
│  → Output: review-summary                                │
│  → Gate: No critical issues flagged                      │
├──────────────────────────────────────────────────────────┤
│  Phase 3: Version Bump                                   │
│  → detect version file (package.json/pyproject.toml/VERSION)
│  → determine bump type from commits or user input        │
│  → update version file                                   │
│  → Output: version change record                         │
│  → Gate: Version updated successfully                    │
├──────────────────────────────────────────────────────────┤
│  Phase 4: Changelog & Commit                             │
│  → generate changelog from git log since last tag        │
│  → update CHANGELOG.md                                   │
│  → create release commit, push to remote                 │
│  → Output: commit SHA                                    │
│  → Gate: Push successful                                 │
├──────────────────────────────────────────────────────────┤
│  Phase 5: PR Creation                                    │
│  → gh pr create with structured body                     │
│  → auto-link issues from commits                         │
│  → Output: PR URL                                        │
│  → Gate: PR created                                      │
└──────────────────────────────────────────────────────────┘
```

## Execution Flow

Execute phases sequentially. Each phase has a gate condition — if the gate fails, stop and report status.

1. **Phase 1**: [Pre-Flight Checks](phases/01-preflight-checks.md) -- Validate git state, branch, tests, build
2. **Phase 2**: [Code Review](phases/02-code-review.md) -- AI-powered diff review with risk assessment
3. **Phase 3**: [Version Bump](phases/03-version-bump.md) -- Detect and update version across project types
4. **Phase 4**: [Changelog & Commit](phases/04-changelog-commit.md) -- Generate changelog, create release commit, push
5. **Phase 5**: [PR Creation](phases/05-pr-creation.md) -- Create PR with structured body and issue links

## Pre-Flight Checklist (Quick Reference)

| Check | Command | Pass Condition |
|-------|---------|----------------|
| Git clean | `git status --porcelain` | Empty output |
| Branch | `git branch --show-current` | Not main/master |
| Tests | `npm test` / `pytest` | Exit code 0 |
| Build | `npm run build` / `python -m build` | Exit code 0 |

## Completion Status Protocol

This skill follows the Completion Status Protocol defined in [SKILL-DESIGN-SPEC.md sections 13-14](../_shared/SKILL-DESIGN-SPEC.md#13-completion-status-protocol).

Every execution terminates with one of:

| Status | When |
|--------|------|
| **DONE** | All 5 phases completed, PR created |
| **DONE_WITH_CONCERNS** | PR created but with review warnings or non-critical issues |
| **BLOCKED** | A gate failed (dirty git, tests fail, push rejected) |
| **NEEDS_CONTEXT** | Cannot determine bump type, ambiguous branch target |

### Escalation

Follows the Three-Strike Rule (SKILL-DESIGN-SPEC section 14). On 3 consecutive failures at the same step, stop and output diagnostic dump.

## Reference Documents

| Document | Purpose |
|----------|---------|
| [phases/01-preflight-checks.md](phases/01-preflight-checks.md) | Git, branch, test, build validation |
| [phases/02-code-review.md](phases/02-code-review.md) | AI-powered diff review |
| [phases/03-version-bump.md](phases/03-version-bump.md) | Version detection and bump |
| [phases/04-changelog-commit.md](phases/04-changelog-commit.md) | Changelog generation and release commit |
| [phases/05-pr-creation.md](phases/05-pr-creation.md) | PR creation with issue linking |
| [../_shared/SKILL-DESIGN-SPEC.md](../_shared/SKILL-DESIGN-SPEC.md) | Skill design spec (completion protocol, escalation) |
