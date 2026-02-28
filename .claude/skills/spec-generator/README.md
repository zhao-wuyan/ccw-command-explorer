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
|  |- 01-discovery.md                # Seed analysis + codebase exploration
|  |- 02-product-brief.md            # Multi-CLI product brief generation
|  |- 03-requirements.md             # PRD with MoSCoW priorities
|  |- 04-architecture.md             # Architecture decisions + review
|  |- 05-epics-stories.md            # Epic/Story decomposition
|  |- 06-readiness-check.md          # Quality validation + handoff
|- specs/
|  |- document-standards.md          # Format, frontmatter, naming rules
|  |- quality-gates.md               # Per-phase quality criteria
|- templates/
|  |- product-brief.md               # Product brief template
|  |- requirements-prd.md            # PRD template
|  |- architecture-doc.md            # Architecture document template
|  |- epics-template.md              # Epic/Story template
|- README.md                         # This file
```

## 6-Phase Pipeline

| Phase | Name | Output | CLI Tools |
|-------|------|--------|-----------|
| 1 | Discovery | spec-config.json | Gemini (analysis) |
| 2 | Product Brief | product-brief.md | Gemini + Codex + Claude (parallel) |
| 3 | Requirements | requirements.md | Gemini (analysis) |
| 4 | Architecture | architecture.md | Gemini + Codex (sequential) |
| 5 | Epics & Stories | epics.md | Gemini (analysis) |
| 6 | Readiness Check | readiness-report.md, spec-summary.md | Gemini (validation) |

## Runtime Output

```
.workflow/.spec/SPEC-{slug}-{YYYY-MM-DD}/
|- spec-config.json              # Session state
|- discovery-context.json        # Codebase context (optional)
|- product-brief.md              # Phase 2
|- requirements.md               # Phase 3
|- architecture.md               # Phase 4
|- epics.md                      # Phase 5
|- readiness-report.md           # Phase 6
|- spec-summary.md               # Phase 6
```

## Flags

- `-y|--yes`: Auto mode - skip all interactive confirmations
- `-c|--continue`: Resume from last completed phase

## Handoff

After Phase 6, choose execution path:
- `workflow:lite-plan` - Execute per Epic
- `workflow:req-plan-with-file` - Roadmap decomposition
- `workflow:plan` - Full planning
- `issue:new` - Create issues per Epic

## Design Principles

- **Document chain**: Each phase builds on previous outputs
- **Multi-perspective**: Gemini/Codex/Claude provide different viewpoints
- **Template-driven**: Consistent format via templates + frontmatter
- **Resumable**: spec-config.json tracks completed phases
- **Pure documentation**: No code generation - clean handoff to execution workflows
