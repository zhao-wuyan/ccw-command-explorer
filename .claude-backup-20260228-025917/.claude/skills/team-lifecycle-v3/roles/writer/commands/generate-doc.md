# Command: generate-doc

## Purpose

Multi-CLI document generation for 4 document types. Each uses parallel or staged CLI analysis, then synthesizes into templated documents.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Document standards | `../../specs/document-standards.md` | Yes |
| Template | From routing table below | Yes |
| Spec config | `<session-folder>/spec/spec-config.json` | Yes |
| Discovery context | `<session-folder>/spec/discovery-context.json` | Yes |
| Discussion feedback | `<session-folder>/discussions/<discuss-file>` | If exists |
| Session folder | Task description `Session:` field | Yes |

### Document Type Routing

| Doc Type | Task | Template | Discussion Input | Output |
|----------|------|----------|-----------------|--------|
| product-brief | DRAFT-001 | templates/product-brief.md | discuss-001-scope.md | spec/product-brief.md |
| requirements | DRAFT-002 | templates/requirements-prd.md | discuss-002-brief.md | spec/requirements/_index.md |
| architecture | DRAFT-003 | templates/architecture-doc.md | discuss-003-requirements.md | spec/architecture/_index.md |
| epics | DRAFT-004 | templates/epics-template.md | discuss-004-architecture.md | spec/epics/_index.md |

### Progressive Dependencies

Each doc type requires all prior docs: discovery-context → product-brief → requirements/_index → architecture/_index.

## Phase 3: Document Generation

### Shared Context Block

Built from spec-config and discovery-context for all CLI prompts:

```
SEED: <topic>
PROBLEM: <problem_statement>
TARGET USERS: <target_users>
DOMAIN: <domain>
CONSTRAINTS: <constraints>
FOCUS AREAS: <focus_areas>
CODEBASE CONTEXT: <existing_patterns, tech_stack> (if discovery-context exists)
```

---

### DRAFT-001: Product Brief

**Strategy**: 3-way parallel CLI analysis, then synthesize.

| Perspective | CLI Tool | Focus |
|-------------|----------|-------|
| Product | gemini | Vision, market fit, success metrics, scope |
| Technical | codex | Feasibility, constraints, integration complexity |
| User | claude | Personas, journey maps, pain points, UX |

**CLI call template** (one per perspective, all `run_in_background: true`):

```bash
Bash(command="ccw cli -p \"PURPOSE: <perspective> analysis for specification.\n<shared-context>\nTASK: <perspective-specific tasks>\nMODE: analysis\nEXPECTED: <structured output>\nCONSTRAINTS: <perspective scope>\" --tool <tool> --mode analysis", run_in_background=true)
```

**Synthesis flow** (after all 3 return):

```
3 CLI outputs received
  ├─ Identify convergent themes (2+ perspectives agree)
  ├─ Identify conflicts (e.g., product wants X, technical says infeasible)
  ├─ Extract unique insights per perspective
  ├─ Integrate discussion feedback (if exists)
  └─ Fill template → Write to spec/product-brief.md
```

**Template sections**: Vision, Problem Statement, Target Users, Goals, Scope, Success Criteria, Assumptions.

---

### DRAFT-002: Requirements/PRD

**Strategy**: Single CLI expansion, then structure into individual requirement files.

| Step | Tool | Action |
|------|------|--------|
| 1 | gemini | Generate functional (REQ-NNN) and non-functional (NFR-type-NNN) requirements |
| 2 | (local) | Integrate discussion feedback |
| 3 | (local) | Write individual files + _index.md |

**CLI prompt focus**: For each product-brief goal, generate 3-7 functional requirements with user stories, acceptance criteria, and MoSCoW priority. Generate NFR categories: performance, security, scalability, usability.

**Output structure**:

```
spec/requirements/
  ├─ _index.md           (summary table + MoSCoW breakdown)
  ├─ REQ-001-<slug>.md   (individual functional requirement)
  ├─ REQ-002-<slug>.md
  ├─ NFR-perf-001-<slug>.md  (non-functional)
  └─ NFR-sec-001-<slug>.md
```

Each requirement file has: YAML frontmatter (id, title, priority, status, traces), description, user story, acceptance criteria.

---

### DRAFT-003: Architecture

**Strategy**: 2-stage CLI (design + critical review).

| Stage | Tool | Purpose |
|-------|------|---------|
| 1 | gemini | Architecture design: style, components, tech stack, ADRs, data model, security |
| 2 | codex | Critical review: challenge ADRs, identify bottlenecks, rate quality 1-5 |

Stage 2 runs after stage 1 completes (sequential dependency).

**After both complete**:
1. Integrate discussion feedback
2. Map codebase integration points (from discovery-context.relevant_files)
3. Write individual ADR files + _index.md

**Output structure**:

```
spec/architecture/
  ├─ _index.md           (overview, component diagram, tech stack, data model, API, security)
  ├─ ADR-001-<slug>.md   (individual decision record)
  └─ ADR-002-<slug>.md
```

Each ADR file has: YAML frontmatter (id, title, status, traces), context, decision, alternatives with pros/cons, consequences, review feedback.

---

### DRAFT-004: Epics & Stories

**Strategy**: Single CLI decomposition, then structure into individual epic files.

| Step | Tool | Action |
|------|------|--------|
| 1 | gemini | Decompose requirements into 3-7 Epics with Stories, dependency map, MVP subset |
| 2 | (local) | Integrate discussion feedback |
| 3 | (local) | Write individual EPIC files + _index.md |

**CLI prompt focus**: Group requirements by domain, generate EPIC-NNN with STORY-EPIC-NNN children, define MVP subset, create Mermaid dependency diagram, recommend execution order.

**Output structure**:

```
spec/epics/
  ├─ _index.md               (overview table, dependency map, execution order, MVP scope)
  ├─ EPIC-001-<slug>.md      (individual epic with stories)
  └─ EPIC-002-<slug>.md
```

Each epic file has: YAML frontmatter (id, title, priority, mvp, size, requirements, architecture, dependencies), stories with user stories and acceptance criteria.

All generated documents include YAML frontmatter: session_id, phase, document_type, status=draft, generated_at, version, dependencies.

## Phase 4: Validation

| Check | What to Verify |
|-------|---------------|
| has_frontmatter | Document starts with valid YAML frontmatter |
| sections_complete | All template sections present in output |
| cross_references | session_id matches spec-config |
| discussion_integrated | Feedback reflected (if feedback exists) |
| files_written | All expected files exist (individual + _index.md) |

### Result Routing

| Outcome | Message Type | Content |
|---------|-------------|---------|
| All checks pass | draft_ready | Doc type, output path, summary |
| Validation issues | draft_ready (with warnings) | Doc type, output path, issues list |
| Critical failure | error | Missing template, CLI failure |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Prior doc not found | Notify coordinator, request prerequisite task completion |
| Template not found | Error, report missing template path |
| CLI tool fails | Retry with fallback tool (gemini → codex → claude) |
| Discussion contradicts prior docs | Note conflict in document, flag for next discussion round |
| Partial CLI output | Use available data, note gaps in document |
