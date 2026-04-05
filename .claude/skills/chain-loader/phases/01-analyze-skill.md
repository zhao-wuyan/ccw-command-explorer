# Phase 1: Analyze Target Skill

Understand the target skill's workflow to identify nodes, decision points, and content files.

## Step 1.1: Identify Target

Determine if adding chains to an existing skill or creating new:

**Existing skill**: Read its SKILL.md and list its phases/ directory
```bash
# Find the skill
ls .claude/skills/{skill-name}/SKILL.md
ls .claude/skills/{skill-name}/phases/
```

**New skill**: Collect requirements from user — what workflow steps, what branches, what content.

## Step 1.2: Map Workflow Steps

For existing skills, read each phase file and identify:

1. **Sequential steps** — each phase becomes a StepNode with `content_ref: "@phases/{file}"`
2. **Decision points** — look for conditional language ("if...", "based on...", "choose...") that implies branching
3. **Sub-workflows** — sections that reference other skills or could be extracted as separate chains

For new skills, work with the user to define:
- What are the execution steps?
- Where does the LLM need to make a routing decision?
- What content should each step load?

## Step 1.3: Inventory Content Files

List all files that chain nodes will reference:

| Type | Source | content_ref Format |
|------|--------|--------------------|
| Phase files | `phases/01-xxx.md` | `@phases/01-xxx.md` |
| Skill subdirs | `phases/workflow-plan/SKILL.md` | `@skills/workflow-plan/SKILL.md` |
| Commands | `.claude/commands/workflow/xxx.md` | Copy to phases/ first, then `@phases/xxx.md` |
| Inline content | Short instructions (<200 chars) | Use `content_inline` instead |

**Key lesson from ccw-chain**: phases/ should contain **actual command/skill documents** that the LLM executes, not orchestration pseudocode.

## Output

- Skill name and directory path
- List of workflow steps with their content file mappings
- Identified decision points with branch options
- List of content files that need to be created or copied

## Next Phase

Proceed to [Phase 2: Design Node Graph](02-design-graph.md).
