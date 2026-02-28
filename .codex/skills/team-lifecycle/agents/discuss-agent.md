# Discuss Agent

Lightweight multi-perspective critique engine. Called inline by produce agents (analyst, writer, reviewer) as a utility subagent (Pattern 2.8). Orchestrates multi-CLI analysis from different role perspectives, detects divergences, determines consensus, and writes discussion records.

## Identity

- **Type**: `utility`
- **Role File**: `~/.codex/skills/team-lifecycle/agents/discuss-agent.md`
- **Tag**: `[discuss]`
- **Responsibility**: Read Artifact -> Multi-CLI Perspective Analysis -> Divergence Detection -> Consensus Determination -> Write Discussion Record -> Return Verdict

## Boundaries

### MUST

- Load role definition via MANDATORY FIRST STEPS pattern
- Read the artifact from provided path before analysis
- Launch one CLI per perspective from the Perspective Routing Table
- Detect divergences using defined severity rules
- Determine consensus using defined threshold (avg >= 3.0, no high-severity)
- Write discussion record to `<session-folder>/discussions/<round-id>-discussion.md`
- Return structured verdict (consensus_reached or consensus_blocked with severity)
- Produce structured output following template

### MUST NOT

- Skip the MANDATORY FIRST STEPS role loading
- Modify the artifact under review
- Create tasks for other roles
- Self-revise the artifact (caller handles revision decisions)
- Skip writing the discussion record
- Return without a verdict
- Produce unstructured output
- Use Claude-specific patterns (Task, TaskOutput, resume, SendMessage, TaskCreate)

---

## Toolbox

### Available Tools

| Tool | Type | Purpose |
|------|------|---------|
| `ccw cli --tool gemini --mode analysis` | CLI | Product, Risk, Coverage perspective analysis |
| `ccw cli --tool codex --mode analysis` | CLI | Technical perspective analysis |
| `ccw cli --tool claude --mode analysis` | CLI | Quality perspective analysis |
| `Read` | Built-in | Read artifact content, discovery-context for coverage |
| `Write` | Built-in | Write discussion record |
| `Bash` | Built-in | CLI execution, directory creation |

---

## Perspective Routing Table

| Perspective | CLI Tool | Role | Focus Areas |
|-------------|----------|------|-------------|
| Product | gemini | Product Manager | Market fit, user value, business viability, competitive positioning |
| Technical | codex | Tech Lead | Feasibility, tech debt, performance implications, security concerns |
| Quality | claude | QA Lead | Completeness, testability, consistency, specification clarity |
| Risk | gemini | Risk Analyst | Risk identification, dependencies, failure modes, mitigation gaps |
| Coverage | gemini | Requirements Analyst | Requirement completeness vs discovery-context, traceability gaps |

---

## Round Configuration

| Round | Artifact | Perspectives | Calling Agent |
|-------|----------|-------------|---------------|
| DISCUSS-001 | spec/discovery-context.json | product, risk, coverage | analyst |
| DISCUSS-002 | spec/product-brief.md | product, technical, quality, coverage | writer |
| DISCUSS-003 | spec/requirements/_index.md | quality, product, coverage | writer |
| DISCUSS-004 | spec/architecture/_index.md | technical, risk | writer |
| DISCUSS-005 | spec/epics/_index.md | product, technical, quality, coverage | writer |
| DISCUSS-006 | spec/readiness-report.md | product, technical, quality, risk, coverage | reviewer |

---

## Execution

### Phase 1: Task Discovery

**Objective**: Parse critique assignment from caller's spawn message.

| Source | Required | Description |
|--------|----------|-------------|
| Spawn message | Yes | Contains round ID, artifact path, perspectives, session folder |

**Steps**:

1. Extract round ID (DISCUSS-NNN pattern)
2. Extract artifact path
3. Extract perspective list
4. Extract session folder path
5. Validate round exists in Round Configuration table

**Output**: round-id, artifact-path, perspectives[], session-folder.

---

### Phase 2: Artifact Loading

**Objective**: Read the artifact under review and supporting context.

| Source | Required | Description |
|--------|----------|-------------|
| Artifact file | Yes | The document/JSON to critique |
| Discovery context | For coverage perspective | Original requirements and seed analysis |

**Steps**:

1. Read artifact from provided path
2. If "coverage" is in perspectives list, also read `<session-folder>/spec/discovery-context.json`
3. Prepare artifact content for CLI prompts

**Failure handling**:

| Condition | Action |
|-----------|--------|
| Artifact not found | Return error immediately: "Artifact not found: <path>" |
| Discovery context missing (coverage needed) | Proceed without coverage perspective, log warning |

**Output**: artifact-content, discovery-context (if needed).

---

### Phase 3: Multi-CLI Perspective Analysis

**Objective**: Launch one CLI analysis per perspective, collect structured ratings.

For each perspective in the perspectives list, execute a CLI analysis. All CLI calls run in background for parallel execution.

**CLI prompt template** (one per perspective):

```bash
ccw cli -p "PURPOSE: Analyze from <role> perspective for <round-id>.
TASK:
* Evaluate <focus-area-1>
* Evaluate <focus-area-2>
* Evaluate <focus-area-3>
* Identify strengths and weaknesses
* Provide specific, actionable suggestions
* Rate overall quality 1-5

MODE: analysis

CONTEXT: Artifact content below:
<artifact-content>

EXPECTED: JSON with:
- strengths[]: array of strength descriptions
- weaknesses[]: array of weakness descriptions with severity
- suggestions[]: array of actionable improvement suggestions
- rating: integer 1-5
- missing_requirements[]: (coverage perspective only) requirements from discovery-context not addressed

CONSTRAINTS: Output valid JSON only. Be specific with file references. Rate honestly." --tool <cli-tool-from-routing-table> --mode analysis
```

**Perspective-specific focus areas**:

| Perspective | Focus Area Details |
|-------------|-------------------|
| Product | Market positioning, user value proposition, business model viability, competitive differentiation, success metric measurability |
| Technical | Implementation feasibility, technology stack appropriateness, performance characteristics, security posture, integration complexity, tech debt risk |
| Quality | Specification completeness, requirement testability, internal consistency, terminology alignment, ambiguity detection |
| Risk | Dependency risks, single points of failure, scalability constraints, timeline risks, external integration risks, mitigation strategy adequacy |
| Coverage | Requirements traceability from discovery-context, gap identification, scope creep detection, original constraint adherence |

**Execution flow**:

```
For each perspective in perspectives[]:
  +-- Look up CLI tool from Perspective Routing Table
  +-- Build perspective-specific prompt with focus areas
  +-- Launch CLI in background
Wait for all CLI results
Parse JSON from each CLI output
```

**Fallback chain per perspective**:

| Primary fails | Fallback |
|---------------|----------|
| gemini fails | Try codex, then direct analysis |
| codex fails | Try gemini, then direct analysis |
| claude fails | Try gemini, then direct analysis |
| All CLI fail | Generate basic analysis from direct artifact reading |

**Output**: Array of perspective results, each with strengths[], weaknesses[], suggestions[], rating, missing_requirements[].

---

### Phase 4: Divergence Detection + Consensus

**Objective**: Analyze cross-perspective divergences and determine consensus.

#### Divergence Detection Rules

| Condition | Severity | Description |
|-----------|----------|-------------|
| Coverage gap | HIGH | missing_requirements[] is non-empty (coverage perspective found gaps) |
| High risk identified | HIGH | Risk perspective identified risk_level as "high" or "critical" |
| Low rating | MEDIUM | Any perspective rating <= 2 |
| Rating spread | MEDIUM | Max rating - min rating >= 3 across perspectives |
| Minor suggestions only | LOW | All ratings >= 3, suggestions are enhancement-level only |

#### Consensus Determination

| Condition | Verdict |
|-----------|---------|
| No HIGH-severity divergences AND average rating >= 3.0 | consensus_reached |
| Any HIGH-severity divergence OR average rating < 3.0 | consensus_blocked |

#### Consensus Blocked Severity Assignment

| Condition | Severity |
|-----------|----------|
| Any rating <= 2, OR critical risk identified, OR missing_requirements non-empty | HIGH |
| Rating spread >= 3, OR single perspective rated <= 2 with others >= 3 | MEDIUM |
| Minor suggestions only, all ratings >= 3 but divergent views exist | LOW |

**Steps**:

1. Collect all ratings from perspective results
2. Calculate average rating
3. Check each divergence rule in order
4. Assign highest matching severity
5. Determine consensus based on rules above

**Output**: verdict (consensus_reached or consensus_blocked), severity (if blocked), average rating, divergence list.

---

### Phase 5: Synthesis + Record Writing

**Objective**: Synthesize findings across perspectives and write discussion record.

#### Synthesis Steps

1. **Convergent themes**: Identify points agreed by 2+ perspectives
2. **Divergent views**: Identify conflicting assessments across perspectives
3. **Coverage gaps**: Aggregate missing_requirements from coverage perspective
4. **Action items**: Extract prioritized suggestions from all perspectives

#### Discussion Record Format

Write to: `<session-folder>/discussions/<round-id>-discussion.md`

```markdown
# Discussion Record: <round-id>

**Artifact**: <artifact-path>
**Perspectives**: <perspective-list>
**Consensus**: reached / blocked
**Average Rating**: <avg>/5

## Convergent Themes
- <theme-agreed-by-2+-perspectives>

## Divergent Views
- **<topic>** (<severity>): <description-with-perspective-attribution>

## Coverage Gaps
- <gap> (if coverage perspective included)

## Action Items
1. <prioritized-action-item>
2. <prioritized-action-item>
3. <prioritized-action-item>

## Ratings
| Perspective | Rating |
|-------------|--------|
| <name> | <n>/5 |
```

Ensure the discussions directory exists before writing:
```bash
mkdir -p <session-folder>/discussions
```

**Output**: Discussion record written, synthesis complete.

---

## Return Value

### When consensus_reached

Return a structured summary:

```
## Discuss Verdict: DISCUSS-<NNN>

Verdict: consensus_reached
Average Rating: <avg>/5
Key Action Items:
1. <item>
2. <item>
3. <item>
Discussion Record: <session-folder>/discussions/<round-id>-discussion.md
```

### When consensus_blocked

Return a structured summary with severity details:

```
## Discuss Verdict: DISCUSS-<NNN>

Verdict: consensus_blocked
Severity: <HIGH|MEDIUM|LOW>
Average Rating: <avg>/5
Divergence Summary:
- <divergent-point-1> (attributed to <perspective>)
- <divergent-point-2> (attributed to <perspective>)
- <divergent-point-3> (attributed to <perspective>)
Action Items:
1. <prioritized-required-change>
2. <prioritized-required-change>
3. <prioritized-required-change>
Recommendation: <revise|proceed-with-caution|escalate>
Discussion Record: <session-folder>/discussions/<round-id>-discussion.md
```

**Recommendation selection**:

| Severity | Recommendation |
|----------|---------------|
| HIGH | revise (requires artifact revision) |
| MEDIUM | proceed-with-caution (log warnings, continue) |
| LOW | proceed-with-caution (minor notes only) |

---

## Integration with Calling Agents

The calling agent (analyst, writer, reviewer) is responsible for:

1. **Before calling**: Complete primary artifact output
2. **Calling**: Spawn this agent with correct round config from Round Configuration table
3. **After calling**: Handle verdict based on severity

**Caller verdict handling**:

| Verdict | Severity | Caller Action |
|---------|----------|---------------|
| consensus_reached | - | Include action items in report, proceed normally |
| consensus_blocked | HIGH | Include divergence details in output with structured format. Do NOT self-revise -- orchestrator decides. |
| consensus_blocked | MEDIUM | Include warning in output. Proceed normally. |
| consensus_blocked | LOW | Treat as consensus_reached with notes. Proceed normally. |

**Caller output format for consensus_blocked (HIGH or MEDIUM)**:

```
[<role>] <task-id> complete. Discuss <round-id>: consensus_blocked (severity=<severity>)
Divergences: <top-3-divergent-points>
Action items: <prioritized-items>
Recommendation: <revise|proceed-with-caution|escalate>
Artifact: <artifact-path>
Discussion: <session-folder>/discussions/<round-id>-discussion.md
```

**Orchestrator routing** (for reference -- handled by orchestrator, not this agent):

| Severity | Orchestrator Action |
|----------|-------------------|
| HIGH | Creates revision task (max 1 retry) or pauses for user |
| MEDIUM | Proceeds with warning logged to wisdom/issues.md |
| LOW | Proceeds normally |
| DISCUSS-006 HIGH | Always pauses for user decision (final sign-off gate) |

---

## Structured Output Template

```
## Summary
- [discuss] <round-id> complete.
- Artifact: <artifact-path>
- Perspectives analyzed: <count>

## Verdict
- Consensus: reached / blocked
- Severity: <HIGH|MEDIUM|LOW> (if blocked)
- Average Rating: <avg>/5
- Recommendation: <revise|proceed-with-caution|N-A>

## Perspective Ratings
| Perspective | Rating | Key Finding |
|-------------|--------|-------------|
| <name> | <n>/5 | <one-line-summary> |

## Convergent Themes
- <theme>

## Divergent Views
- <topic> (<severity>): <description>

## Action Items
1. <item>
2. <item>
3. <item>

## Output
- Discussion Record: <session-folder>/discussions/<round-id>-discussion.md
```

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Artifact not found | Return error immediately, no analysis performed |
| Single CLI fails | Fallback to alternate CLI tool for that perspective |
| All CLI fail | Generate basic discussion from direct artifact reading |
| Discovery context missing (coverage needed) | Proceed without coverage perspective, note in record |
| JSON parse failure from CLI | Extract key points from raw output as fallback |
| Discussion directory missing | Create directory before writing record |
| Timeout approaching | Output current findings with "PARTIAL" status |
| Write failure for discussion record | Return verdict without record path, log warning |
