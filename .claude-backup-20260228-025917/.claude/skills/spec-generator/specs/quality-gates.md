# Quality Gates

Per-phase quality gate criteria and scoring dimensions for spec-generator outputs.

## When to Use

| Phase | Usage | Section |
|-------|-------|---------|
| Phase 2-5 | Post-generation self-check | Per-Phase Gates |
| Phase 6 | Cross-document validation | Cross-Document Validation |
| Phase 6 | Final scoring | Scoring Dimensions |

---

## Quality Thresholds

| Gate | Score | Action |
|------|-------|--------|
| **Pass** | >= 80% | Continue to next phase |
| **Review** | 60-79% | Log warnings, continue with caveats |
| **Fail** | < 60% | Must address issues before continuing |

In auto mode (`-y`), Review-level issues are logged but do not block progress.

---

## Scoring Dimensions

### 1. Completeness (25%)

All required sections present with substantive content.

| Score | Criteria |
|-------|----------|
| 100% | All template sections filled with detailed content |
| 75% | All sections present, some lack detail |
| 50% | Major sections present but minor sections missing |
| 25% | Multiple major sections missing or empty |
| 0% | Document is a skeleton only |

### 2. Consistency (25%)

Terminology, formatting, and references are uniform across documents.

| Score | Criteria |
|-------|----------|
| 100% | All terms consistent, all references valid, formatting uniform |
| 75% | Minor terminology variations, all references valid |
| 50% | Some inconsistent terms, 1-2 broken references |
| 25% | Frequent inconsistencies, multiple broken references |
| 0% | Documents contradict each other |

### 3. Traceability (25%)

Requirements, architecture decisions, and stories trace back to goals.

| Score | Criteria |
|-------|----------|
| 100% | Every story traces to a requirement, every requirement traces to a goal |
| 75% | Most items traceable, few orphans |
| 50% | Partial traceability, some disconnected items |
| 25% | Weak traceability, many orphan items |
| 0% | No traceability between documents |

### 4. Depth (25%)

Content provides sufficient detail for execution teams.

| Score | Criteria |
|-------|----------|
| 100% | Acceptance criteria specific and testable, architecture decisions justified, stories estimable |
| 75% | Most items detailed enough, few vague areas |
| 50% | Mix of detailed and vague content |
| 25% | Mostly high-level, lacking actionable detail |
| 0% | Too abstract for execution |

---

## Per-Phase Quality Gates

### Phase 1: Discovery

| Check | Criteria | Severity |
|-------|----------|----------|
| Session ID valid | Matches `SPEC-{slug}-{date}` format | Error |
| Problem statement exists | Non-empty, >= 20 characters | Error |
| Target users identified | >= 1 user group | Error |
| Dimensions generated | 3-5 exploration dimensions | Warning |
| Constraints listed | >= 0 (can be empty with justification) | Info |

### Phase 1.5: Requirement Expansion & Clarification

| Check | Criteria | Severity |
|-------|----------|----------|
| Problem statement refined | More specific than seed, >= 30 characters | Error |
| Confirmed features | >= 2 features with descriptions | Error |
| Non-functional requirements | >= 1 identified (performance, security, etc.) | Warning |
| Boundary conditions | In-scope and out-of-scope defined | Warning |
| Key assumptions | >= 1 assumption listed | Warning |
| User confirmation | Explicit user confirmation recorded (non-auto mode) | Info |
| Discussion rounds | >= 1 round of interaction (non-auto mode) | Info |

### Phase 2: Product Brief

| Check | Criteria | Severity |
|-------|----------|----------|
| Vision statement | Clear, 1-3 sentences | Error |
| Problem statement | Specific and measurable | Error |
| Target users | >= 1 persona with needs described | Error |
| Goals defined | >= 2 measurable goals | Error |
| Success metrics | >= 2 quantifiable metrics | Warning |
| Scope boundaries | In-scope and out-of-scope listed | Warning |
| Multi-perspective | >= 2 CLI perspectives synthesized | Info |

### Phase 3: Requirements (PRD)

| Check | Criteria | Severity |
|-------|----------|----------|
| Functional requirements | >= 3 with REQ-NNN IDs | Error |
| Acceptance criteria | Every requirement has >= 1 criterion | Error |
| MoSCoW priority | Every requirement tagged | Error |
| Non-functional requirements | >= 1 (performance, security, etc.) | Warning |
| User stories | >= 1 per Must-have requirement | Warning |
| Traceability | Requirements trace to product brief goals | Warning |

### Phase 4: Architecture

| Check | Criteria | Severity |
|-------|----------|----------|
| Component diagram | Present (Mermaid or ASCII) | Error |
| Tech stack specified | Languages, frameworks, key libraries | Error |
| ADR present | >= 1 Architecture Decision Record | Error |
| ADR has alternatives | Each ADR lists >= 2 options considered | Warning |
| Integration points | External systems/APIs identified | Warning |
| Data model | Key entities and relationships described | Warning |
| Codebase mapping | Mapped to existing code (if has_codebase) | Info |

### Phase 5: Epics & Stories

| Check | Criteria | Severity |
|-------|----------|----------|
| Epics defined | 3-7 epics with EPIC-NNN IDs | Error |
| MVP subset | >= 1 epic tagged as MVP | Error |
| Stories per epic | 2-5 stories per epic | Error |
| Story format | "As a...I want...So that..." pattern | Warning |
| Dependency map | Cross-epic dependencies documented | Warning |
| Estimation hints | Relative sizing (S/M/L/XL) per story | Info |
| Traceability | Stories trace to requirements | Warning |

### Phase 6: Readiness Check

| Check | Criteria | Severity |
|-------|----------|----------|
| All documents exist | product-brief, requirements, architecture, epics | Error |
| Frontmatter valid | All YAML frontmatter parseable and correct | Error |
| Cross-references valid | All document links resolve | Error |
| Overall score >= 60% | Weighted average across 4 dimensions | Error |
| No unresolved Errors | All Error-severity issues addressed | Error |
| Summary generated | spec-summary.md created | Warning |

---

## Cross-Document Validation

Checks performed during Phase 6 across all documents:

### Completeness Matrix

```
Product Brief goals  ->  Requirements (each goal has >= 1 requirement)
Requirements         ->  Architecture (each Must requirement has design coverage)
Requirements         ->  Epics (each Must requirement appears in >= 1 story)
Architecture ADRs    ->  Epics (tech choices reflected in implementation stories)
```

### Consistency Checks

| Check | Documents | Rule |
|-------|-----------|------|
| Terminology | All | Same term used consistently (no synonyms for same concept) |
| User personas | Brief + PRD + Epics | Same user names/roles throughout |
| Scope | Brief + PRD | PRD scope does not exceed brief scope |
| Tech stack | Architecture + Epics | Stories reference correct technologies |

### Traceability Matrix Format

```markdown
| Goal | Requirements | Architecture | Epics |
|------|-------------|--------------|-------|
| G-001: ... | REQ-001, REQ-002 | ADR-001 | EPIC-001 |
| G-002: ... | REQ-003 | ADR-002 | EPIC-002, EPIC-003 |
```

---

## Issue Classification

### Error (Must Fix)

- Missing required document or section
- Broken cross-references
- Contradictory information between documents
- Empty acceptance criteria on Must-have requirements
- No MVP subset defined in epics

### Warning (Should Fix)

- Vague acceptance criteria
- Missing non-functional requirements
- No success metrics defined
- Incomplete traceability
- Missing architecture review notes

### Info (Nice to Have)

- Could add more detailed personas
- Consider additional ADR alternatives
- Story estimation hints missing
- Mermaid diagrams could be more detailed
