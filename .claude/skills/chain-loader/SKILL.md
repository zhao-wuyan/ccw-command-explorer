---
name: chain-loader
description: Meta-skill for generating chain-based skills with progressive step loading and LLM-driven decision routing. Converts linear phase skills into chain graph skills. Triggers on "create chain", "chain skill", "add chain", "generate chain".
allowed-tools: Agent, AskUserQuestion, Read, Bash, Glob, Grep, Write
---

# Chain Skill Generator

Generate chain graph JSON for skills, enabling progressive content delivery and LLM-driven decision routing via the `chain_loader` tool.

## Architecture

```
User Request (target skill + chain purpose)
       |
Phase 1: Analyze target skill (existing phases/ or new requirements)
       |
Phase 2: Design node graph (step/decision/delegate nodes + routing)
       |
Phase 3: Generate chain JSON + validate with chain_loader
       |
Output: .claude/skills/{skill}/chains/{chain}.json
```

## Key Rules

1. **Spec-first** — Read `specs/chain-schema.md` and `specs/design-patterns.md` before any generation
2. **content_ref over inline** — Use `@phases/` file references; `content_inline` only for <200 char
3. **Validate before commit** — Never write chain JSON without graph connectivity check
4. **Preserve existing content** — When adding chains to existing skills, never modify existing phase files
5. **12-node limit** — If a chain exceeds 12 nodes, split into main + sub-chains

## Exemplar

`ccw-chain` is the canonical example of this meta-skill's output:
- 8 chains, 79 total nodes, cross-chain routing via `->chain-name`
- phases/ contains actual command/skill documents (not orchestration code)
- Location: `.claude/skills/ccw-chain/`

Study its structure before generating new chains: `Read(".claude/skills/ccw-chain/SKILL.md")`

## Execution Flow

```
Pre-Phase: Read specs/chain-schema.md + specs/design-patterns.md

Phase 1: Analyze Target Skill
   Ref: phases/01-analyze-skill.md
   Input: user request, target skill name
   Output: skill analysis (workflow steps, decision points, content files)

Phase 2: Design Node Graph
   Ref: phases/02-design-graph.md
   Input: skill analysis
   Output: validated node graph (in-memory)

Phase 3: Generate & Validate
   Ref: phases/03-generate-validate.md
   Input: validated node graph
   Output: chain JSON files, validation report
```

| Phase | Document | Purpose |
|-------|----------|---------|
| 1 | phases/01-analyze-skill.md | Understand target skill workflow and content |
| 2 | phases/02-design-graph.md | Design nodes, routing, validate connectivity |
| 3 | phases/03-generate-validate.md | Write JSON, test with chain_loader |

## Output Structure

```
.claude/skills/{skill}/
├── chains/
│   ├── {chain-name}.json       # Main chain
│   └── {sub-chain}.json        # Optional sub-chains
├── phases/                     # Content files (existing or generated)
└── SKILL.md                    # Existing or updated entry
```
