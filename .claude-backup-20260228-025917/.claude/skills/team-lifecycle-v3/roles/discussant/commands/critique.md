# Command: critique

## Purpose

Multi-perspective CLI critique: launch parallel analyses from assigned perspectives, collect structured ratings, detect divergences, and synthesize consensus.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Round config | DISCUSS-NNN → look up round in role.md table | Yes |
| Artifact | `<session-folder>/<artifact-path>` from round config | Yes |
| Perspectives | Round config perspectives column | Yes |
| Discovery context | `<session-folder>/spec/discovery-context.json` | For coverage perspective |
| Prior discussions | `<session-folder>/discussions/` | No |

## Phase 3: Multi-Perspective Critique

### Perspective Routing

| Perspective | CLI Tool | Role | Focus Areas |
|-------------|----------|------|-------------|
| Product | gemini | Product Manager | Market fit, user value, business viability, competitive differentiation |
| Technical | codex | Tech Lead | Feasibility, tech debt, performance, security, maintainability |
| Quality | claude | QA Lead | Completeness, testability, consistency, standards compliance |
| Risk | gemini | Risk Analyst | Risk identification, dependencies, failure modes, mitigation |
| Coverage | gemini | Requirements Analyst | Requirement completeness vs discovery-context, gap detection, scope creep |

### Execution Flow

```
For each perspective in round config:
  ├─ Build prompt with perspective focus + artifact content
  ├─ Launch CLI analysis (background)
  │   Bash(command="ccw cli -p '<prompt>' --tool <cli-tool> --mode analysis", run_in_background=true)
  └─ Collect result via hook callback
```

### CLI Call Template

```bash
Bash(command="ccw cli -p 'PURPOSE: Analyze from <role> perspective for <round-id>
TASK: <focus-areas-from-table>
MODE: analysis
CONTEXT: Artifact content below
EXPECTED: JSON with strengths[], weaknesses[], suggestions[], rating (1-5)
CONSTRAINTS: Output valid JSON only

Artifact:
<artifact-content>' --tool <cli-tool> --mode analysis", run_in_background=true)
```

### Extra Fields by Perspective

| Perspective | Additional Output Fields |
|-------------|------------------------|
| Risk | `risk_level`: low / medium / high / critical |
| Coverage | `covered_requirements[]`, `partial_requirements[]`, `missing_requirements[]`, `scope_creep[]` |

---

### Divergence Detection

After all perspectives return, scan results for critical signals:

| Signal | Condition | Severity |
|--------|-----------|----------|
| Coverage gap | `missing_requirements` non-empty | High |
| High risk | `risk_level` is high or critical | High |
| Low rating | Any perspective rating <= 2 | Medium |
| Rating spread | Max rating - min rating >= 3 | Medium |

### Consensus Determination

| Condition | Verdict |
|-----------|---------|
| No high-severity divergences AND average rating >= 3.0 | consensus_reached |
| Any high-severity divergence OR average rating < 3.0 | consensus_blocked |

### Synthesis Process

```
Collect all perspective results
  ├─ Extract convergent themes (agreed by 2+ perspectives)
  ├─ Extract divergent views (conflicting assessments)
  ├─ Check coverage gaps from coverage result
  ├─ Compile action items from all suggestions
  └─ Determine consensus per table above
```

## Phase 4: Validation

### Discussion Record

Write to `<session-folder>/discussions/<round-id>-discussion.md`:

```
# Discussion Record: <round-id>

**Artifact**: <artifact-path>
**Perspectives**: <list>
**Consensus**: reached / blocked

## Convergent Themes
- <theme>

## Divergent Views
- **<topic>** (<severity>): <description>

## Action Items
1. <item>

## Ratings
| Perspective | Rating |
|-------------|--------|
| <name> | <n>/5 |

**Average**: <avg>/5
```

### Result Routing

| Outcome | Message Type | Content |
|---------|-------------|---------|
| Consensus reached | discussion_ready | Action items, record path, average rating |
| Consensus blocked | discussion_blocked | Divergence points, severity, record path |
| Artifact not found | error | Missing artifact path |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Artifact not found | Report error to coordinator |
| Single CLI perspective fails | Fallback to direct Claude analysis for that perspective |
| All CLI analyses fail | Generate basic discussion from direct artifact reading |
| All perspectives diverge | Report as discussion_blocked with all divergence points |
