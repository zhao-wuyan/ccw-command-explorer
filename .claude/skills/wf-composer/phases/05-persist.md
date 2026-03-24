# Phase 5: Persist — Assemble + Save Template

## Objective

Assemble the final workflow template JSON from design session data, write to template library, output usage instructions.

## Workflow

### Step 5.1 — Load Design Session

Read:
- `design-session/intent.json` → template metadata
- `design-session/dag.json` → nodes, edges, checkpoints, context_schema

### Step 5.2 — Determine Template Name + Path

**Name**: Use user's confirmed name from Phase 4. If not set, derive from intent.task_type + first 3 meaningful words of raw_description.

**Slug**: kebab-case from name (e.g. "Feature TDD with Review" → "feature-tdd-with-review")

**Path**: `.workflow/templates/<slug>.json`

**template_id**: `wft-<slug>-<YYYYMMDD>`

Check for existing file:
- If exists and different content: append `-v2`, `-v3`, etc.
- If exists and identical: skip write, output "Template already exists"

### Step 5.3 — Assemble Template JSON

See `specs/template-schema.md` for full schema. Assemble:

```json
{
  "template_id": "wft-<slug>-<date>",
  "name": "<human name>",
  "description": "<raw_description truncated to 120 chars>",
  "version": "1.0",
  "created_at": "<ISO timestamp>",
  "source_session": "<WFD-id>",
  "tags": ["<task_type>", "<complexity>"],
  "context_schema": { /* from dag.json */ },
  "nodes": [ /* from dag.json, full node objects */ ],
  "edges": [ /* from dag.json */ ],
  "checkpoints": [ /* checkpoint node IDs */ ],
  "atomic_groups": [ /* from intent.json parallel groups */ ],
  "execution_mode": "serial",
  "metadata": {
    "node_count": <n>,
    "checkpoint_count": <n>,
    "estimated_duration": "<rough estimate based on node types>"
  }
}
```

### Step 5.4 — Write Template

Write assembled JSON to `.workflow/templates/<slug>.json`.

Ensure `.workflow/templates/` directory exists (create if not).

### Step 5.5 — Update Template Index

Read/create `.workflow/templates/index.json`:
```json
{
  "templates": [
    {
      "template_id": "wft-<slug>-<date>",
      "name": "<name>",
      "path": ".workflow/templates/<slug>.json",
      "tags": ["<task_type>"],
      "created_at": "<ISO>",
      "node_count": <n>
    }
  ]
}
```
Append or update entry for this template. Write back.

### Step 5.6 — Output Summary

```
Template saved: .workflow/templates/<slug>.json
  ID:          wft-<slug>-<date>
  Nodes:       <n> work nodes + <n> checkpoints
  Variables:   <comma-separated required vars>

To execute:
  Skill(skill="wf-player", args="<slug> --context goal='<your goal>'")

To edit later:
  Skill(skill="wf-composer", args="--edit .workflow/templates/<slug>.json")

To list all templates:
  Skill(skill="wf-player", args="--list")
```

### Step 5.7 — Clean Up Draft

Delete `design-session/` directory (or move to `.workflow/templates/design-drafts/archive/`).

## Success Criteria

- `.workflow/templates/<slug>.json` exists and is valid JSON
- `index.json` updated with new entry
- Console shows template path + usage command
