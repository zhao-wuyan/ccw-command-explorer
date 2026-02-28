# Discuss Subagent

Lightweight multi-perspective critique engine. Called inline by any role needing peer review. Perspectives are dynamic -- specified by the calling role, not pre-defined.

## Design

Unlike team-lifecycle-v4's fixed perspective definitions (product, technical, quality, risk, coverage), team-coordinate uses **dynamic perspectives** passed in the prompt. The calling role decides what viewpoints matter for its artifact.

## Invocation

Called by roles after artifact creation:

```
Task({
  subagent_type: "cli-discuss-agent",
  run_in_background: false,
  description: "Discuss <round-id>",
  prompt: `## Multi-Perspective Critique: <round-id>

### Input
- Artifact: <artifact-path>
- Round: <round-id>
- Session: <session-folder>

### Perspectives
<Dynamic perspective list -- each entry defines: name, cli_tool, role_label, focus_areas>

Example:
| Perspective | CLI Tool | Role | Focus Areas |
|-------------|----------|------|-------------|
| Feasibility | gemini | Engineer | Implementation complexity, technical risks, resource needs |
| Clarity | codex | Editor | Readability, logical flow, completeness of explanation |
| Accuracy | gemini | Domain Expert | Factual correctness, source reliability, claim verification |

### Execution Steps
1. Read artifact from <artifact-path>
2. For each perspective, launch CLI analysis in background:
   Bash(command="ccw cli -p 'PURPOSE: Analyze from <role> perspective for <round-id>
   TASK: <focus-areas>
   MODE: analysis
   CONTEXT: Artifact content below
   EXPECTED: JSON with strengths[], weaknesses[], suggestions[], rating (1-5)
   CONSTRAINTS: Output valid JSON only

   Artifact:
   <artifact-content>' --tool <cli-tool> --mode analysis", run_in_background=true)
3. Wait for all CLI results
4. Divergence detection:
   - High severity: any rating <= 2, critical issue identified
   - Medium severity: rating spread (max - min) >= 3, or single perspective rated <= 2 with others >= 3
   - Low severity: minor suggestions only, all ratings >= 3
5. Consensus determination:
   - No high-severity divergences AND average rating >= 3.0 -> consensus_reached
   - Otherwise -> consensus_blocked
6. Synthesize:
   - Convergent themes (agreed by 2+ perspectives)
   - Divergent views (conflicting assessments)
   - Action items from suggestions
7. Write discussion record to: <session-folder>/discussions/<round-id>-discussion.md

### Discussion Record Format
# Discussion Record: <round-id>

**Artifact**: <artifact-path>
**Perspectives**: <list>
**Consensus**: reached / blocked
**Average Rating**: <avg>/5

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

### Return Value

**When consensus_reached**:
Return a summary string with:
- Verdict: consensus_reached
- Average rating
- Key action items (top 3)
- Discussion record path

**When consensus_blocked**:
Return a structured summary with:
- Verdict: consensus_blocked
- Severity: HIGH | MEDIUM | LOW
- Average rating
- Divergence summary: top 3 divergent points with perspective attribution
- Action items: prioritized list of required changes
- Recommendation: revise | proceed-with-caution | escalate
- Discussion record path

### Error Handling
- Single CLI fails -> fallback to direct Claude analysis for that perspective
- All CLI fail -> generate basic discussion from direct artifact reading
- Artifact not found -> return error immediately`
})
```

## Integration with Calling Role

The calling role is responsible for:

1. **Before calling**: Complete primary artifact output
2. **Calling**: Invoke discuss subagent with appropriate dynamic perspectives
3. **After calling**:

| Verdict | Severity | Role Action |
|---------|----------|-------------|
| consensus_reached | - | Include action items in Phase 5 report, proceed normally |
| consensus_blocked | HIGH | Include divergence details in Phase 5 SendMessage. Do NOT self-revise -- coordinator decides. |
| consensus_blocked | MEDIUM | Include warning in Phase 5 SendMessage. Proceed normally. |
| consensus_blocked | LOW | Treat as consensus_reached with notes. Proceed normally. |

**SendMessage format for consensus_blocked (HIGH or MEDIUM)**:

```
[<role>] <task-id> complete. Discuss <round-id>: consensus_blocked (severity=<severity>)
Divergences: <top-3-divergent-points>
Action items: <prioritized-items>
Recommendation: <revise|proceed-with-caution|escalate>
Artifact: <artifact-path>
Discussion: <discussion-record-path>
```
