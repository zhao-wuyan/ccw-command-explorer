---
name: ccw-chain
description: Chain-based CCW workflow orchestrator. Intent analysis, workflow routing, and Skill pipeline execution via progressive chain loading. Triggers on "ccw chain", "chain ccw", "workflow chain".
allowed-tools: Skill(*), TodoWrite(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*)
---

# CCW Chain Orchestrator

Chain-based workflow orchestrator using `chain_loader` for progressive step loading and LLM-driven decision routing.

## Discovery

1. `chain_loader list` — list all chains with triggers, entries, and descriptions
2. Match user intent to chain `triggers.task_types` / `triggers.keywords`
3. `chain_loader inspect` — preview chain node graph and available entries
4. `chain_loader start` — begin from default entry, named entry (`entry_name`), or any node (`node`)

## Execution Protocol

When `chain_loader` delivers a step node with a skill/command doc:

1. **Read** the loaded doc content to understand the skill's purpose and interface
2. **Assemble** the Skill call: `Skill(skill_name, args)`
   - First step: `args = "${analysis.goal}"`
   - Subsequent steps: `args = ""` (auto-receives session context)
   - Special args noted in step name (e.g., `--bugfix`, `--hotfix`, `--plan-only`)
3. **Propagate -y**: If auto mode active, append `-y` to args
4. **Execute**: `Skill(skill_name, args)` — blocking, wait for completion
5. **Advance**: `chain_loader done` to proceed to next step

```javascript
const autoYes = /\b(-y|--yes)\b/.test($ARGUMENTS);

function assembleCommand(skillName, args, previousResult) {
  if (!args && previousResult?.session_id) {
    args = `--session="${previousResult.session_id}"`;
  }
  if (autoYes && !args.includes('-y') && !args.includes('--yes')) {
    args = args ? `${args} -y` : '-y';
  }
  return { skill: skillName, args };
}
```

## Auto Mode (`-y` / `--yes`)

- D1 Clarity Check: always choose "Clear" (skip clarification)
- Confirmation: skip, execute directly
- Error handling: auto-skip failed steps, continue pipeline
- Propagation: `-y` injected into every downstream Skill call

## Delegation Protocol

When `chain_loader` returns `delegate_depth > 0`:
1. Continue normal execution (read content, assemble Skill, execute)
2. On `returned_from_delegate: true`, resume parent chain context
3. Variables received from child chain are available for subsequent steps

## Preloaded Context

When `chain_loader start` returns `preloaded_keys`:
1. Preloaded content is available via `chain_loader content` for the entire session
2. Reference preloaded context when assembling Skill calls
3. Use preloaded memory/project context to inform all downstream steps

## Progress Visualization

After each `chain_loader done`, call `chain_loader visualize` to show progress.
Display the visualization in execution log for user awareness.

## Variable Propagation

Intent analysis results (`task_type`, `goal`, `auto_yes`) are stored as chain variables.
`assembleCommand()` reads variables from `chain_loader status` for Skill args.
Variables automatically flow through delegation via `pass_variables`/`receive_variables`.

## Phase-Level Execution (Skill Chain Delegation)

When the current chain is a skill-level chain (entered via delegation from a category chain):
1. Each step delivers **phase doc content** directly (not SKILL.md)
2. **Execute phase instructions inline** — do NOT wrap in `Skill()` call
3. Reference preloaded `skill-context` for orchestration patterns (TodoWrite, data flow, error handling)
4. Phase execution produces artifacts (files, session state) consumed by the next phase
5. The chain system controls phase progression — no need for internal phase orchestration

## Architecture: Chain Definition Layers

- **Category chains** (8): `ccw-chain/chains/` — routing and orchestration (ccw-main, ccw-standard, etc.)
- **Workflow skill chains** (7): `.claude/workflow-skills/*/chains/` — skill-level chains with phase content
- **Phase content**: `.claude/skills/*/phases/` — original phase files, referenced via `@skills/` prefix
- Category chains delegate to workflow skill chains via `findChainAcrossSkills()` fallback
- Content refs: `@phases/` = skill-relative, `@skills/` = project `.claude/skills/` relative
