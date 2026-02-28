# Phase 1: Requirement Clarification

> **COMPACT PROTECTION**: This is an execution document. After context compression, phase instructions become summaries only. You MUST immediately re-read this file via `Read("~/.codex/skills/team-lifecycle/phases/01-requirement-clarification.md")` before continuing. Never execute based on summaries.

## Objective

Parse user input, detect execution mode, apply frontend auto-detection, and gather all parameters needed for pipeline initialization. No agents are spawned in this phase -- it is purely orchestrator-local work.

---

## Input

| Input | Source | Required |
|-------|--------|----------|
| User arguments | `$ARGUMENTS` (raw user input) | Yes |
| Project root | Current working directory | Yes |
| Existing sessions | `.workflow/.team/TLS-*/team-session.json` | No (checked for resume) |

---

## Execution Steps

### Step 1.1: Session Resume Check (Phase 0)

Before requirement parsing, scan for interrupted sessions.

```javascript
// Scan for active/paused sessions
const sessionFiles = Glob(".workflow/.team/TLS-*/team-session.json")

// Filter to active or paused
const activeSessions = sessionFiles
  .map(f => JSON.parse(Read(f)))
  .filter(s => s.status === "active" || s.status === "paused")
```

**Decision table**:

| Active Sessions | Action |
|----------------|--------|
| 0 | Proceed to Step 1.2 (new session) |
| 1 | Ask user: "Found active session <session-id>. Resume? (yes/no)" |
| 2+ | Ask user to select: "Multiple active sessions found: <list>. Which to resume? (or 'new' for fresh start)" |

If user chooses to resume:
- Read the selected session's state file
- Proceed to Session Reconciliation (see orchestrator.md Session Resume section)
- Skip remaining Phase 1 steps, jump directly to Phase 4

If user chooses new session:
- Continue to Step 1.2

### Step 1.2: Parse Arguments

Extract explicit settings from user input.

**Recognized parameters** (from argument text or flags):

| Parameter | Detection | Values |
|-----------|-----------|--------|
| mode | Explicit mention or `--mode` flag | spec-only, impl-only, full-lifecycle, fe-only, fullstack, full-lifecycle-fe |
| scope | Main content of user description | Free text |
| focus | `--focus` flag or explicit mention | Comma-separated areas |
| depth | `--depth` flag | shallow, normal, deep |
| execution | `--parallel` or `--sequential` flag | sequential, parallel |
| spec-path | `--spec` flag (impl-only mode) | File path to existing spec |

**Parsing logic**:

```
Parse user input text:
  +- Contains "--mode <value>"? -> extract mode
  +- Contains "--focus <areas>"? -> extract focus areas
  +- Contains "--depth <level>"? -> extract depth
  +- Contains "--parallel"? -> execution = parallel
  +- Contains "--sequential"? -> execution = sequential
  +- Contains "--spec <path>"? -> extract spec path
  +- Remaining text after flag removal -> scope description
```

### Step 1.3: Ask for Missing Parameters

If critical parameters are not extractable from the input, ask the user.

**Required parameters and fallback defaults**:

| Parameter | Required | Default | Ask If Missing |
|-----------|----------|---------|----------------|
| mode | Yes | (none) | Yes - "Which pipeline mode? (spec-only / impl-only / full-lifecycle / fe-only / fullstack / full-lifecycle-fe)" |
| scope | Yes | (none) | Yes - "Please describe the project scope" |
| execution | No | parallel | No - use default |
| depth | No | normal | No - use default |
| spec-path | Conditional | (none) | Yes, only if mode is impl-only - "Path to existing specification?" |

**Ask format** (output to user, then wait for response):

```
[orchestrator] Phase 1: Requirement Clarification

Missing parameter: <parameter-name>
<question-text>

Options: <option-list>
```

### Step 1.4: Frontend Auto-Detection

For `impl-only` and `full-lifecycle` modes, check if the user description or project structure indicates frontend work.

**Detection signals**:

| Signal | Detection Method | Result |
|--------|-----------------|--------|
| FE keywords in scope | Match against keyword list (see below) | FE detected |
| BE keywords in scope | Match against keyword list | BE detected |
| FE framework in package.json | Read package.json, check for react/vue/svelte/next dependencies | FE framework present |
| FE file patterns in project | Glob for *.tsx, *.jsx, *.vue, *.svelte | FE files exist |

**FE keyword list**: component, page, UI, frontend, CSS, HTML, React, Vue, Tailwind, Svelte, Next.js, Nuxt, shadcn, design system, responsive, layout, form, dialog, modal, sidebar, navbar, theme, dark mode, animation

**BE keyword list**: API, database, server, endpoint, backend, middleware, migration, schema, REST, GraphQL, authentication, authorization, queue, worker, cron

**Upgrade decision table**:

| Current Mode | FE Detected | BE Detected | Upgrade To |
|-------------|-------------|-------------|------------|
| impl-only | Yes | No | fe-only |
| impl-only | Yes | Yes | fullstack |
| impl-only | No | Yes | (no change) |
| full-lifecycle | Yes | - | full-lifecycle-fe |
| full-lifecycle | No | - | (no change) |
| spec-only | - | - | (no change, spec is mode-agnostic) |
| fe-only | - | - | (no change) |
| fullstack | - | - | (no change) |

If an upgrade is detected, inform the user:

```
[orchestrator] Frontend auto-detection: upgraded mode from <old> to <new>
  Detected signals: <signal-list>
  To override, specify --mode explicitly.
```

### Step 1.5: Impl-Only Pre-Check

If mode is `impl-only`, verify that a specification exists:

```
Mode is impl-only?
  +- spec-path provided? -> validate file exists -> proceed
  +- spec-path not provided?
      +- Scan session dir for existing spec artifacts -> found? use them
      +- Not found -> error: "impl-only requires existing spec. Provide --spec <path> or use full-lifecycle mode."
```

### Step 1.6: Store Requirements

Assemble the final requirements object. This will be passed to Phase 2.

```javascript
const requirements = {
  mode: "<finalized-mode>",
  scope: "<scope-description>",
  focus: ["<area1>", "<area2>"],
  depth: "<shallow | normal | deep>",
  execution: "<sequential | parallel>",
  spec_path: "<path-or-null>",
  frontend_detected: true | false,
  frontend_signals: ["<signal1>", "<signal2>"],
  raw_input: "<original-user-input>"
}
```

---

## Output

| Output | Type | Destination |
|--------|------|-------------|
| requirements | Object | Passed to Phase 2 |
| resume_session | Object or null | If resuming, session state passed to Phase 4 |

---

## Success Criteria

- All required parameters captured (mode, scope)
- Mode finalized (including auto-detection upgrades)
- If impl-only: spec path validated
- If resuming: session state loaded and reconciled
- No ambiguity remaining in execution parameters

---

## Error Handling

| Error | Resolution |
|-------|------------|
| Unknown mode value | Report supported modes, ask user to clarify |
| Spec path not found (impl-only) | Error with suggestion to use full-lifecycle |
| User provides contradictory flags | Report conflict, ask user to resolve |
| Session file corrupt during resume check | Skip corrupt session, proceed with new |
| No user response to question | Wait indefinitely (interactive mode) |

---

## Next Phase

Proceed to [Phase 2: Team Initialization](02-team-initialization.md) with the `requirements` object.
