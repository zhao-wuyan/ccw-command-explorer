# Phase 1: Compact — Session Memory Compression

Compress current session working memory into structured text optimized for session recovery, extract critical information, and save to persistent storage via `core_memory`.

## Objective

- Capture everything needed to resume work seamlessly in a new session
- Minimize re-exploration by including file paths, decisions, and state
- Preserve train of thought for complex debugging
- Record actionable state (last action, known issues, pending)

## Input

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| sessionDescription | No | User-provided session context | `"completed core-memory module"` |

---

## Execution

### Step 1.1: Analyze Current Session

Extract the following from conversation history into a session analysis structure:

| Field | Source | Description |
|-------|--------|-------------|
| sessionId | Active workflow session (WFS-*) or null | Check via `functions.exec_command({ cmd: "ccw session list --location active" })` |
| projectRoot | Environment / project markers | Absolute path (e.g., `D:\Claude_dms3`) |
| objective | Conversation context | High-level goal (1-2 sentences) |
| executionPlan | See Step 1.2 | Full plan content — ALWAYS preserve COMPLETE and DETAILED |
| workingFiles | Modified files in session | `{absolutePath, role}` — 3-8 entries |
| referenceFiles | Read-only context files | `{absolutePath, role}` — key configs/types |
| lastAction | Final significant action | Action + result (success/failure) |
| decisions | Choices made during session | `{decision, reasoning}` pairs |
| constraints | User-specified limitations | List of constraints |
| dependencies | Added/changed packages | Package changes |
| knownIssues | Deferred bugs | Separated from forgotten bugs |
| changesMade | Completed modifications | List of changes |
| pending | Next steps | Outstanding work items |
| notes | Unstructured thoughts | Debugging hypotheses, ideas |

### Step 1.2: Plan Detection

Detect execution plan using priority order:

| Priority | Source | Detection Method |
|----------|--------|------------------|
| 1 | Workflow Session (IMPL_PLAN.md) | `functions.exec_command({ cmd: "ccw session list --location active" })` → if sessions exist, read plan content |
| 2 | TodoWrite / Plan Items | Extract from conversation — look for `functions.update_plan` calls; preserve COMPLETE todo list |
| 3 | User-Stated Plan | Look for explicit plan statements: numbered lists, "Here's my plan...", step sequences |
| 4 | Inferred Plan | Infer from task description, sequence of actions taken, outstanding work mentioned |

**CRITICAL**: Preserve complete plan content verbatim — DO NOT summarize or abbreviate.

### Step 1.3: Generate Structured Text

Assemble the session analysis into this markdown template:

```
## Session ID
<sessionId or "(none)">

## Project Root
<absolute path>

## Objective
<high-level goal>

## Execution Plan
### Source: <workflow (IMPL_PLAN.md) | todo | user-stated | inferred>
<full plan content — complete and verbatim>

## Working Files (Modified)
- <absolutePath> (role: <role>)

## Reference Files (Read-Only)
- <absolutePath> (role: <role>)

## Last Action
<last significant action + result>

## Decisions
- <decision>: <reasoning>

## Constraints
- <constraint>

## Dependencies
- <dependency>

## Known Issues
- <issue>

## Changes Made
- <change>

## Pending
- <next step>

## Notes
<unstructured thoughts, debugging hypotheses>
```

### Step 1.4: Import to Core Memory

Save the structured text via CLI or MCP:

```
functions.exec_command({ cmd: "ccw core-memory import --text '<structuredText>'" })
```

Or via MCP:

```
mcp__ccw-tools__core_memory({ operation: "import", text: <structuredText> })
```

### Step 1.5: Report Recovery ID

After successful import, display the Recovery ID banner:

```
+============================================================================+
|  Session Memory Saved                                                      |
|                                                                            |
|  Recovery ID: CMEM-YYYYMMDD-HHMMSS                                        |
|                                                                            |
|  To restore: "Please import memory <ID>"                                   |
|  (CLI: ccw core-memory export --id <ID>)                                   |
+============================================================================+
```

---

## Path Resolution Rules

### Project Root Detection

| Step | Check | Marker |
|------|-------|--------|
| 1 | Current working directory from environment | — |
| 2 | Look for project markers | `.git/`, `package.json`, `.claude/` |
| 3 | Use topmost directory containing markers | — |

### Absolute Path Conversion

All relative paths → absolute by joining with project root. If already absolute, use as-is.

### Reference File Categories

| Category | Examples | Priority |
|----------|----------|----------|
| Project Config | `.claude/CLAUDE.md`, `package.json`, `tsconfig.json` | High |
| Type Definitions | `src/types/*.ts`, `*.d.ts` | High |
| Related Modules | Parent/sibling modules with shared interfaces | Medium |
| Test Files | Corresponding test files for modified code | Medium |
| Documentation | `README.md`, `ARCHITECTURE.md` | Low |

---

## Quality Checklist

Before generating structured text, verify:

| Check | Requirement |
|-------|-------------|
| Session ID | Captured if workflow session active (WFS-*) |
| Project Root | Absolute path (e.g., `D:\Claude_dms3`) |
| Objective | Clearly states the "North Star" goal |
| Execution Plan | COMPLETE plan preserved VERBATIM (no summarization) |
| Plan Source | Clearly identified (workflow / todo / user-stated / inferred) |
| Plan Details | ALL phases, tasks, file paths, dependencies, status markers included |
| File Paths | ALL paths are ABSOLUTE (not relative) |
| Working Files | 3-8 modified files with roles |
| Reference Files | Key context files (CLAUDE.md, types, configs) |
| Last Action | Captures final state (success/failure) |
| Decisions | Include reasoning, not just choices |
| Known Issues | Separates deferred from forgotten bugs |
| Notes | Preserves debugging hypotheses if any |

---

## Output

| Artifact | Description |
|----------|-------------|
| structuredText | Generated markdown string for core_memory import |
| MCP/CLI Result | `{ operation: "import", id: "CMEM-YYYYMMDD-HHMMSS" }` |
| User Display | Recovery ID banner with restore instructions |

## Next Phase

N/A — Compact is a terminal phase. Return to orchestrator.
