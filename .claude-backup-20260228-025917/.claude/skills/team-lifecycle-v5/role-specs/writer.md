---
role: writer
prefix: DRAFT
inner_loop: true
discuss_rounds: [DISCUSS-002, DISCUSS-003, DISCUSS-004, DISCUSS-005]
subagents: [discuss, doc-generation]
message_types:
  success: draft_ready
  revision: draft_revision
  error: error
---

# Writer — Phase 2-4

## Phase 2: Context Loading

**Objective**: Load all required inputs for document generation.

### Document type routing

| Task Subject Contains | Doc Type | Template | Prior Discussion Input |
|----------------------|----------|----------|----------------------|
| Product Brief | product-brief | templates/product-brief.md | discussions/DISCUSS-001-discussion.md |
| Requirements / PRD | requirements | templates/requirements-prd.md | discussions/DISCUSS-002-discussion.md |
| Architecture | architecture | templates/architecture-doc.md | discussions/DISCUSS-003-discussion.md |
| Epics | epics | templates/epics-template.md | discussions/DISCUSS-004-discussion.md |

### Inline discuss mapping

| Doc Type | Inline Discuss Round | Perspectives |
|----------|---------------------|-------------|
| product-brief | DISCUSS-002 | product, technical, quality, coverage |
| requirements | DISCUSS-003 | quality, product, coverage |
| architecture | DISCUSS-004 | technical, risk |
| epics | DISCUSS-005 | product, technical, quality, coverage |

### Progressive dependency loading

| Doc Type | Requires |
|----------|----------|
| product-brief | discovery-context.json |
| requirements | + product-brief.md |
| architecture | + requirements/_index.md |
| epics | + architecture/_index.md |

**Prior decisions from accumulator**: Pass context_accumulator summaries as "Prior Decisions" to subagent.

| Input | Source | Required |
|-------|--------|----------|
| Document standards | `../../specs/document-standards.md` (relative to SKILL) | Yes |
| Template | From routing table | Yes |
| Spec config | `<session-folder>/spec/spec-config.json` | Yes |
| Discovery context | `<session-folder>/spec/discovery-context.json` | Yes |
| Discussion feedback | `<session-folder>/discussions/<discuss-file>` | If exists |
| Prior decisions | context_accumulator (in-memory) | If prior tasks exist |

## Phase 3: Subagent Document Generation

**Objective**: Delegate document generation to doc-generation subagent.

Do NOT execute CLI calls in main agent. Delegate to subagent:

```
Task({
  subagent_type: "universal-executor",
  run_in_background: false,
  description: "Generate <doc-type> document",
  prompt: `<from subagents/doc-generation-subagent.md>

## Task
- Document type: <doc-type>
- Session folder: <session-folder>
- Template: <template-path>

## Context
- Spec config: <spec-config content>
- Discovery context: <discovery-context summary>
- Prior discussion feedback: <discussion-file content if exists>
- Prior decisions (from writer accumulator):
  <context_accumulator serialized>

## Expected Output
Return JSON:
{
  "artifact_path": "<output-path>",
  "summary": "<100-200 char summary>",
  "key_decisions": ["<decision-1>", ...],
  "sections_generated": ["<section-1>", ...],
  "warnings": ["<warning if any>"]
}`
})
```

Main agent receives only the JSON summary. Document is written to disk by subagent.

## Phase 4: Self-Validation + Inline Discuss

### 4a: Self-Validation

| Check | What to Verify |
|-------|---------------|
| has_frontmatter | Starts with YAML frontmatter |
| sections_complete | All template sections present |
| cross_references | session_id included |
| discussion_integrated | Reflects prior round feedback (if exists) |

### 4b: Inline Discuss

Call discuss subagent for this task's discuss round:
- Artifact: `<output-path>` (the generated document)
- Round: `<DISCUSS-NNN>` from mapping table
- Perspectives: from mapping table

Handle discuss verdict per team-worker consensus handling protocol.

**Report**: doc type, validation status, discuss verdict + severity, average rating, summary, output path.

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Subagent failure | Retry once with alternative subagent_type. Still fails → log error, continue next task |
| Discuss subagent fails | Skip discuss, log warning |
| Cumulative 3 task failures | SendMessage to coordinator, STOP |
| Prior doc not found | Notify coordinator, request prerequisite |
| Discussion contradicts prior docs | Note conflict, flag for coordinator |
