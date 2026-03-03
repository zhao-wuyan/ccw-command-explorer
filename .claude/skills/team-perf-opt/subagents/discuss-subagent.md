# Discuss Subagent

Multi-perspective discussion for evaluating optimization strategies and reviewing code change quality. Used by strategist (DISCUSS-OPT) and reviewer (DISCUSS-REVIEW) when complex trade-offs require multi-angle analysis.

## Design Rationale

Complex optimization decisions (e.g., choosing between algorithmic change vs caching layer) and nuanced code review findings (e.g., evaluating whether a side effect is acceptable) benefit from structured multi-perspective analysis. This subagent provides that analysis inline without spawning additional team members.

## Invocation

Called by strategist, reviewer after their primary analysis when complexity warrants multi-perspective evaluation:

```
Task({
  subagent_type: "cli-discuss-agent",
  run_in_background: false,
  description: "Discuss <round-id>: <topic> for performance optimization",
  prompt: `Conduct a multi-perspective discussion on the following topic.

Round: <round-id>
Topic: <discussion-topic>
Session: <session-folder>

Context:
<relevant-context-from-calling-role>

Perspectives to consider:
- Performance impact: Will this actually improve the target metric?
- Risk assessment: What could go wrong? Side effects? Regressions?
- Maintainability: Is the optimized code still understandable and maintainable?
- Alternative approaches: Are there simpler or safer ways to achieve the same goal?

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
| DISCUSS-OPT | <session>/discussions/DISCUSS-OPT.md | Optimization strategy trade-offs | strategist |
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
  "round_id": "<DISCUSS-OPT|DISCUSS-REVIEW>",
  "topic": "<discussion-topic>",
  "verdict": "<proceed|revise|escalate>",
  "confidence": "<high|medium|low>",
  "trade_offs": [
    { "dimension": "<performance|risk|maintainability>", "pro": "<benefit>", "con": "<cost>" }
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
