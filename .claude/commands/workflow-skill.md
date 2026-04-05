---
name: workflow-skill
description: Direct workflow skill launcher - invoke any registered skill by name with arguments
argument-hint: "<skill-name> [arguments]"
allowed-tools: Skill(*), AskUserQuestion(*), Read(*), Glob(*)
---

# Workflow Skill Launcher

Direct entry point to invoke any workflow skill by name. Bypasses CCW intent analysis and routing — execute exactly the skill the user specifies.

## Usage

```
/workflow-skill <skill-name> [arguments]
```

## Execution

1. **Parse** `$ARGUMENTS` → extract `skill_name` (first token) and `args` (remaining)
2. **Validate** skill exists (check skill list below)
3. **Invoke** `Skill(skill_name, args)`

```javascript
const [skillName, ...rest] = $ARGUMENTS.trim().split(/\s+/);
const args = rest.join(' ');

// Validate
if (!skillName) {
  // Show skill catalog (see below)
  return;
}

// Execute
Skill(skillName, args);
```

## Skill Catalog

If no arguments provided, show this catalog for user selection.

### Planning Skills
| Skill | Description |
|-------|-------------|
| `workflow-lite-plan` | Lightweight planning — explore → plan → confirm → handoff |
| `workflow-plan` | Full planning — session → context → convention → gen → verify |
| `workflow-tdd-plan` | TDD planning — 6-phase TDD plan → verify |
| `workflow-multi-cli-plan` | Multi-CLI collaborative planning with codebase context |

### Execution Skills
| Skill | Description |
|-------|-------------|
| `workflow-lite-execute` | Lightweight execution — task grouping → batch → review → sync |
| `workflow-execute` | Full execution — session discovery → task processing → commit |
| `team-executor` | Resume existing team session and execute remaining tasks |
| `team-planex` | Plan-and-execute wave pipeline (planner + executor) |

### Review & Test Skills
| Skill | Description |
|-------|-------------|
| `workflow-test-fix` | Test generation + fix cycle |
| `workflow-lite-test-review` | Post-execution test review and fix |
| `review-cycle` | Multi-dimensional code review with automated fix |
| `review-code` | Code review with structured report (read-only) |

### Exploration Skills
| Skill | Description |
|-------|-------------|
| `brainstorm` | Multi-perspective brainstorming |
| `spec-generator` | Specification generator — 7-phase document chain |
| `investigate` | Systematic debugging with Iron Law methodology |

### Workflow Commands (slash-style)
| Skill | Description |
|-------|-------------|
| `workflow:analyze-with-file` | Collaborative analysis with documented discussions |
| `workflow:brainstorm-with-file` | Interactive brainstorming with multi-CLI collaboration |
| `workflow:collaborative-plan-with-file` | Multi-agent collaborative planning |
| `workflow:debug-with-file` | Hypothesis-driven debugging |
| `workflow:roadmap-with-file` | Strategic requirement roadmap |
| `workflow:unified-execute-with-file` | Universal execution engine for any planning output |
| `workflow:integration-test-cycle` | Self-iterating integration test workflow |
| `workflow:refactor-cycle` | Tech debt discovery and refactoring cycle |
| `workflow:clean` | Intelligent code cleanup |

### Team Skills
| Skill | Description |
|-------|-------------|
| `team-frontend` | Frontend development team |
| `team-issue` | Issue resolution team |
| `team-review` | Code review team (3-role pipeline) |
| `team-testing` | Testing team (progressive coverage) |
| `team-lifecycle-v4` | Full lifecycle team (plan → develop → test → review) |
| `team-brainstorm` | Brainstorming team |
| `team-arch-opt` | Architecture optimization team |
| `team-perf-opt` | Performance optimization team |
| `team-quality-assurance` | Quality assurance team |
| `team-tech-debt` | Tech debt identification and removal |
| `team-roadmap-dev` | Roadmap-driven development |
| `team-uidesign` | UI design team |
| `team-ui-polish` | UI polish team |
| `team-ultra-analyze` | Deep collaborative analysis team |
| `team-coordinate` | Universal team coordination with dynamic roles |

### Meta Skills
| Skill | Description |
|-------|-------------|
| `skill-generator` | Create new Claude Code skills |
| `workflow-skill-designer` | Design orchestrator+phases structured skills |
| `wf-composer` | Semantic workflow composer from natural language |
| `wf-player` | Workflow template player |

## Examples

```bash
# Direct skill invocation
/workflow-skill workflow-lite-plan "Add user authentication"
/workflow-skill workflow-plan "Refactor payment module"
/workflow-skill brainstorm "Notification system architecture"
/workflow-skill workflow-test-fix --session WFS-123
/workflow-skill team-planex "Implement OAuth2 + 2FA"
/workflow-skill workflow:analyze-with-file "认证架构分析"
/workflow-skill review-cycle

# With auto mode
/workflow-skill workflow-lite-plan -y "Fix login timeout"

# No arguments → show catalog
/workflow-skill
```
