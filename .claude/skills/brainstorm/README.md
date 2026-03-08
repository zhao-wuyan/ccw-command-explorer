# Brainstorm Skill

Unified brainstorming skill combining interactive framework generation, multi-role parallel analysis, and cross-role synthesis into a single entry point with two operational modes.

## Key Features

- **Dual-Mode Operation**: Auto mode (full pipeline) and single role mode (individual analysis)
- **Interactive Framework Generation**: Seven-phase workflow for guidance specification
- **Parallel Role Analysis**: Concurrent execution of multiple role perspectives
- **Cross-Role Synthesis**: Integration of insights into feature specifications
- **SPEC.md Quality Standards**: Guidance specification includes Concepts & Terminology, Non-Goals, RFC 2119 constraints
- **Template-Driven Role Analysis**: system-architect produces Data Model, State Machine, Error Handling, Observability, Configuration Model, Boundary Scenarios
- **Automated Quality Gates**: Validation agents ensure outputs meet quality standards
- **Session Continuity**: All phases share state via workflow-session.json
- **Progressive Loading**: Phase documents loaded on-demand via Ref markers

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    /brainstorm                                │
│         Unified Entry Point + Interactive Routing             │
└───────────────────────┬─────────────────────────────────────┘
                        │
              ┌─────────┴─────────┐
              ↓                   ↓
    ┌─────────────────┐  ┌──────────────────┐
    │   Auto Mode     │  │ Single Role Mode │
    │  (自动模式)      │  │ (单角色分析模式)   │
    └────────┬────────┘  └────────┬─────────┘
             │                    │
    ┌────────┼────────┐          │
    ↓        ↓        ↓          ↓
 Phase 2  Phase 3  Phase 4    Phase 3
Artifacts  N×Role  Synthesis  1×Role
 (7步)    Analysis  (8步)    Analysis
           并行               (4步)
```

### Execution Flow

**Auto Mode**:
1. **Phase 1**: Mode detection and parameter parsing
2. **Phase 1.5**: Terminology & Boundary Definition (extract terms, collect Non-Goals)
3. **Phase 2**: Interactive Framework Generation (7 sub-phases)
   - Context collection → Topic analysis → Role selection → Role questions → Conflict resolution → Final check → Generate specification
   - **Phase 5**: Generate guidance-specification.md with Concepts & Terminology, Non-Goals, RFC 2119 constraints
4. **Phase 3**: Parallel Role Analysis (N concurrent role analyses)
   - Template-driven analysis with quality validation
   - system-architect includes: Data Model, State Machine, Error Handling, Observability, Configuration Model, Boundary Scenarios
5. **Phase 4**: Synthesis Integration (6 sub-phases)
   - Discovery → File discovery → Cross-role analysis → User interaction → Spec generation → Finalization

**Single Role Mode**:
1. **Phase 1**: Mode detection and parameter parsing
2. **Phase 3**: Single role analysis (4 sub-phases)
   - Detection → Context → Agent → Validation

## Usage

### Auto Mode

```bash
# Full pipeline with default settings
/brainstorm "Build real-time collaboration platform"

# Auto-select mode with specific role count
/brainstorm -y "GOAL: Build platform SCOPE: 100 users" --count 5

# With style skill for UI designer
/brainstorm "Design payment system" --style-skill material-design
```

### Single Role Mode

```bash
# Analyze with specific role
/brainstorm system-architect --session WFS-xxx

# With interactive questions
/brainstorm ux-expert --include-questions

# Update existing analysis
/brainstorm ui-designer --session WFS-xxx --update --style-skill material-design

# Skip questions (use defaults)
/brainstorm product-manager --skip-questions
```

## Available Roles

| Role ID | Title | Focus Area |
|---------|-------|------------|
| `data-architect` | 数据架构师 | Data models, storage strategies, data flow |
| `product-manager` | 产品经理 | Product strategy, roadmap, prioritization |
| `product-owner` | 产品负责人 | Backlog management, user stories, acceptance criteria |
| `scrum-master` | 敏捷教练 | Process facilitation, impediment removal |
| `subject-matter-expert` | 领域专家 | Domain knowledge, business rules, compliance |
| `system-architect` | 系统架构师 | Technical architecture, scalability, integration |
| `test-strategist` | 测试策略师 | Test strategy, quality assurance |
| `ui-designer` | UI设计师 | Visual design, mockups, design systems |
| `ux-expert` | UX专家 | User research, information architecture, journey |

## Output Files

```
.workflow/active/WFS-{topic}/
├── workflow-session.json              # Session metadata
├── .process/
│   └── context-package.json           # Phase 0 output
└── .brainstorming/
    ├── guidance-specification.md      # Framework with terminology, non-goals
    ├── feature-index.json             # Feature index
    ├── synthesis-changelog.md         # Synthesis decisions
    ├── feature-specs/                 # Feature specifications
    │   ├── F-001-{slug}.md
    │   └── F-00N-{slug}.md
    ├── specs/
    │   └── terminology-template.json  # Terminology glossary schema
    ├── templates/
    │   └── role-templates/
    │       └── system-architect-template.md  # System architect analysis template
    ├── agents/
    │   └── role-analysis-reviewer-agent.md   # Role analysis validation agent
    ├── {role}/                        # Role analyses (immutable)
    │   ├── {role}-context.md          # Q&A responses
    │   ├── analysis.md                # Main document
    │   ├── analysis-cross-cutting.md  # Cross-feature
    │   └── analysis-F-{id}-{slug}.md  # Per-feature
    └── synthesis-specification.md     # Integration
```

## Quality Standards

### Guidance Specification
- **Section 2**: Concepts & Terminology (5-10 core terms with definitions, aliases, categories)
- **Section 3**: Non-Goals (Out of Scope) with rationale
- **RFC 2119 Keywords**: All requirements use MUST, SHOULD, MAY

### Role Analysis (system-architect)
1. **Architecture Overview**: High-level system design
2. **Data Model**: 3-5 core entities with precise field definitions
3. **State Machine**: Lifecycle for 1-2 entities with complex workflows
4. **Error Handling Strategy**: Global + per-component recovery
5. **Observability Requirements**: Metrics, logs, health checks
6. **Configuration Model**: All configurable parameters with validation
7. **Boundary Scenarios**: Concurrency, rate limiting, shutdown, cleanup, scalability, DR

### Quality Validation
- Template compliance checking
- RFC 2119 keyword usage verification
- Diagram syntax validation
- Section completeness scoring

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `--yes`, `-y` | Auto mode, skip all questions | - |
| `--count N` | Number of roles to select | 3 |
| `--session ID` | Use existing session | - |
| `--update` | Update existing analysis | - |
| `--include-questions` | Interactive context gathering | - |
| `--skip-questions` | Use default answers | - |
| `--style-skill PKG` | Style package for ui-designer | - |

## Follow-up Commands

After brainstorm completes:
- `/workflow-plan --session {sessionId}` - Generate implementation plan
- `/workflow:brainstorm:synthesis --session {sessionId}` - Run synthesis standalone

## Related Documentation

- **Template Source**: `~/.ccw/workflows/cli-templates/planning-roles/`
- **Style SKILL Packages**: `.claude/skills/style-{package-name}/`
- **Phase Documents**: `phases/01-mode-routing.md`, `phases/02-artifacts.md`, `phases/03-role-analysis.md`, `phases/04-synthesis.md`
