# Spec Generator

Structured specification document generator producing a complete document chain (Product Brief -> PRD -> Architecture -> Epics).

## Usage

```bash
# Via workflow command
/workflow:spec "Build a task management system"
/workflow:spec -y "User auth with OAuth2"    # Auto mode
/workflow:spec -c "task management"           # Resume session
```

## Architecture

```
spec-generator/
|- SKILL.md                          # Entry point: metadata + architecture + flow
|- phases/
|  |- 01-discovery.md                # Seed analysis + codebase exploration + spec type selection
|  |- 01-5-requirement-clarification.md  # Interactive requirement expansion
|  |- 02-product-brief.md            # Multi-CLI product brief + glossary generation
|  |- 03-requirements.md             # PRD with MoSCoW priorities + RFC 2119 constraints
|  |- 04-architecture.md             # Architecture + state machine + config model + observability
|  |- 05-epics-stories.md            # Epic/Story decomposition
|  |- 06-readiness-check.md          # Quality validation + handoff + iterate option
|  |- 06-5-auto-fix.md               # Auto-fix loop for readiness issues (max 2 iterations)
|  |- 07-issue-export.md             # Issue creation from Epics + export report
|- specs/
|  |- document-standards.md          # Format, frontmatter, naming rules
|  |- quality-gates.md               # Per-phase quality criteria + iteration tracking
|  |- glossary-template.json         # Terminology glossary schema
|- templates/
|  |- product-brief.md               # Product brief template (+ Concepts & Non-Goals)
|  |- requirements-prd.md            # PRD template
|  |- architecture-doc.md            # Architecture template (+ state machine, config, observability)
|  |- epics-template.md              # Epic/Story template (+ versioning)
|  |- profiles/                      # Spec type specialization profiles
|     |- service-profile.md          # Service spec: lifecycle, observability, trust
|     |- api-profile.md              # API spec: endpoints, auth, rate limiting
|     |- library-profile.md          # Library spec: public API, examples, compatibility
|- README.md                         # This file
```

## 7-Phase Pipeline

| Phase | Name | Output | CLI Tools | Key Features |
|-------|------|--------|-----------|-------------|
| 1 | Discovery | spec-config.json | Gemini (analysis) | Spec type selection |
| 1.5 | Req Expansion | refined-requirements.json | Gemini (analysis) | Multi-round interactive |
| 2 | Product Brief *(Agent)* | product-brief.md, glossary.json | Gemini + Codex + Claude (parallel) | Terminology glossary |
| 3 | Requirements *(Agent)* | requirements/ | Gemini + **Codex review** | RFC 2119, data model |
| 4 | Architecture *(Agent)* | architecture/ | Gemini + Codex (sequential) | State machine, config, observability |
| 5 | Epics & Stories *(Agent)* | epics/ | Gemini + **Codex review** | Glossary consistency |
| 6 | Readiness Check | readiness-report.md, spec-summary.md | Gemini + **Codex** (parallel) | Per-requirement verification |
| 6.5 | Auto-Fix *(Agent)* | Updated phase docs | Gemini (analysis) | Max 2 iterations |
| 7 | Issue Export | issue-export-report.md | ccw issue create | Epic→Issue mapping, wave assignment |

## Runtime Output

```
.workflow/.spec/SPEC-{slug}-{YYYY-MM-DD}/
|- spec-config.json              # Session state
|- discovery-context.json        # Codebase context (optional)
|- refined-requirements.json     # Phase 1.5 (requirement expansion)
|- glossary.json                 # Phase 2 (terminology)
|- product-brief.md              # Phase 2
|- requirements/                 # Phase 3 (directory)
|  |- _index.md
|  |- REQ-*.md
|  └── NFR-*.md
|- architecture/                 # Phase 4 (directory)
|  |- _index.md
|  └── ADR-*.md
|- epics/                        # Phase 5 (directory)
|  |- _index.md
|  └── EPIC-*.md
|- readiness-report.md           # Phase 6
|- spec-summary.md              # Phase 6
└── issue-export-report.md       # Phase 7 (issue export)
```

## Flags

- `-y|--yes`: Auto mode - skip all interactive confirmations
- `-c|--continue`: Resume from last completed phase

Spec type is selected interactively in Phase 1 (defaults to `service` in auto mode)
Available types: `service`, `api`, `library`, `platform`

## Handoff

After Phase 6, choose execution path:
- `Export Issues (Phase 7)` - Create issues per Epic with spec links → team-planex
- `workflow-lite-plan` - Execute per Epic
- `workflow:req-plan-with-file` - Roadmap decomposition
- `workflow-plan` - Full planning
- `Iterate & improve` - Re-run failed phases (max 2 iterations)

## Design Principles

- **Document chain**: Each phase builds on previous outputs
- **Multi-perspective**: Gemini/Codex/Claude provide different viewpoints
- **Template-driven**: Consistent format via templates + frontmatter
- **Resumable**: spec-config.json tracks completed phases
- **Pure documentation**: No code generation - clean handoff to execution workflows
- **Type-specialized**: Profiles adapt templates to service/api/library/platform requirements
- **Iterative quality**: Phase 6.5 auto-fix repairs issues, max 2 iterations before handoff
- **Terminology-first**: glossary.json ensures consistent terminology across all documents
- **Agent-delegated**: Heavy document phases (2-5, 6.5) run in doc-generator agents via `spawn_agent/wait_agent/close_agent` (Codex v4 API) to minimize main context usage
