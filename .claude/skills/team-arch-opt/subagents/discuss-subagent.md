# Discuss Subagent

Multi-perspective discussion for evaluating refactoring strategies and reviewing code change quality. Used by designer (DISCUSS-REFACTOR) and reviewer (DISCUSS-REVIEW) when complex trade-offs require multi-angle analysis.

## Design Rationale

Complex refactoring decisions (e.g., choosing between dependency inversion vs mediator pattern to break a cycle) and nuanced code review findings (e.g., evaluating whether a temporary coupling increase is acceptable) benefit from structured multi-perspective analysis. This subagent provides that analysis inline without spawning additional team members.

## Invocation

Called by designer, reviewer after their primary analysis when complexity warrants multi-perspective evaluation:

```
Task({
  subagent_type: "cli-discuss-agent",
  run_in_background: false,
  description: "Discuss <round-id>: <topic> for architecture optimization",
  prompt: `Conduct a multi-perspective discussion on the following topic.

Round: <round-id>
Topic: <discussion-topic>
Session: <session-folder>

Context:
<relevant-context-from-calling-role>

Perspectives to consider:
- Architecture impact: Will this actually improve the target structural metric?
- Risk assessment: What could break? Dangling references? Behavioral changes? Migration risk?
- Maintainability: Is the refactored code more understandable and maintainable?
- Alternative approaches: Are there simpler or safer ways to achieve the same structural improvement?

Evaluate trade-offs and provide a structured recommendation with:
- Consensus verdict: proceed / revise / escalate
- Confidence level: high / medium / low
- Key trade-offs identified
- Recommended approach with rationale
- Dissenting perspectives (if any)`
})
```

## Round Configuration

| Round | Artifact | Parameters | Calling Role |
|-------|----------|------------|-------------|
| DISCUSS-REFACTOR | <session>/discussions/DISCUSS-REFACTOR.md | Refactoring strategy trade-offs | designer |
| DISCUSS-REVIEW | <session>/discussions/DISCUSS-REVIEW.md | Code review finding validation | reviewer |

## Integration with Calling Role

The calling role is responsible for:

1. **Before calling**: Complete primary analysis, identify the specific trade-off or finding needing discussion
2. **Calling**: Invoke subagent with round ID, topic, and relevant context
3. **After calling**:

| Result | Action |
|--------|--------|
| consensus_reached (proceed) | Incorporate recommendation into output, continue |
| consensus_reached (revise) | Adjust findings/strategy based on discussion insights |
| consensus_blocked (HIGH) | Report to coordinator via message with severity |
| consensus_blocked (MEDIUM) | Include in output with recommendation for revision |
| consensus_blocked (LOW) | Note in output, proceed with original assessment |

## Output Schema

```json
{
  "round_id": "<DISCUSS-REFACTOR|DISCUSS-REVIEW>",
  "topic": "<discussion-topic>",
  "verdict": "<proceed|revise|escalate>",
  "confidence": "<high|medium|low>",
  "trade_offs": [
    { "dimension": "<architecture|risk|maintainability>", "pro": "<benefit>", "con": "<cost>" }
  ],
  "recommendation": "<recommended-approach>",
  "rationale": "<reasoning>",
  "dissenting_views": ["<alternative-perspective>"]
}
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Single perspective analysis fails | Continue with partial perspectives |
| All analyses fail | Return basic recommendation from calling role's primary analysis |
| Artifact not found | Return error immediately |
| Discussion inconclusive | Return "revise" verdict with low confidence |
