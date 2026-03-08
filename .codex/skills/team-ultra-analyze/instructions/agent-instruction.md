## TASK ASSIGNMENT

### MANDATORY FIRST STEPS
1. Read shared discoveries: .workflow/.csv-wave/{session-id}/discoveries.ndjson (if exists, skip if not)
2. Read project context: .workflow/project-tech.json (if exists)

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Role**: {role}
**Description**: {description}
**Perspective**: {perspective}
**Dimensions**: {dimensions}
**Discussion Round**: {discussion_round}
**Discussion Type**: {discussion_type}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

1. **Read discoveries**: Load shared discoveries from the session's discoveries.ndjson for cross-task context
2. **Use context**: Apply previous tasks' findings from prev_context above
3. **Execute by role**:

### Role: explorer (EXPLORE-* tasks)
Explore codebase structure from the assigned perspective, collecting structured context for downstream analysis.

- Determine exploration strategy by perspective:

| Perspective | Focus | Search Depth |
|-------------|-------|-------------|
| general | Overall codebase structure and patterns | broad |
| technical | Implementation details, code patterns, feasibility | medium |
| architectural | System design, module boundaries, interactions | broad |
| business | Business logic, domain models, value flows | medium |
| domain_expert | Domain patterns, standards, best practices | deep |

- Use available tools (Read, Glob, Grep, Bash) to search the codebase
- Collect: relevant files (path, relevance, summary), code patterns, key findings, module relationships
- Generate questions for downstream analysis
- Focus exploration on the dimensions listed in the Dimensions field

### Role: analyst (ANALYZE-* tasks)
Perform deep analysis on exploration results from the assigned perspective.

- Load exploration results from prev_context
- Detect if this is a direction-fix task (description mentions "adjusted focus"):
  - Normal: analyze from assigned perspective using corresponding exploration results
  - Direction-fix: re-analyze from adjusted perspective using all available explorations

- Select analysis approach by perspective:

| Perspective | CLI Tool | Focus |
|-------------|----------|-------|
| technical | gemini | Implementation patterns, code quality, feasibility |
| architectural | gemini | System design, scalability, component interactions |
| business | gemini | Value, ROI, stakeholder impact |
| domain_expert | gemini | Domain-specific patterns, best practices |

- Use `ccw cli` for deep analysis:
  ```bash
  ccw cli -p "PURPOSE: Deep analysis of '<topic>' from <perspective> perspective
  TASK: • Analyze patterns found in exploration • Generate insights with confidence levels • Identify discussion points
  MODE: analysis
  CONTEXT: @**/* | Memory: Exploration findings
  EXPECTED: Structured insights with confidence levels and evidence" --tool gemini --mode analysis
  ```

- Generate structured output:
  - key_insights: [{insight, confidence (high/medium/low), evidence (file:line)}]
  - key_findings: [{finding, file_ref, impact}]
  - discussion_points: [questions needing cross-perspective discussion]
  - open_questions: [areas needing further exploration]
  - recommendations: [{action, rationale, priority}]

### Role: discussant (DISCUSS-* tasks)
Process analysis results and generate discussion summary. Strategy depends on discussion type.

- **initial**: Cross-perspective aggregation
  - Aggregate all analysis results from prev_context
  - Identify convergent themes across perspectives
  - Identify conflicting views between perspectives
  - Generate top 5 discussion points and open questions
  - Produce structured round summary

- **deepen**: Deep investigation of open questions
  - Use CLI tool to investigate uncertain insights:
    ```bash
    ccw cli -p "PURPOSE: Investigate open questions and uncertain insights
    TASK: • Focus on questions from previous round • Find supporting evidence • Validate uncertain insights
    MODE: analysis
    CONTEXT: @**/*
    EXPECTED: Evidence-based findings" --tool gemini --mode analysis
    ```

- **direction-adjusted**: Re-analysis from adjusted focus
  - Use CLI to re-analyze from adjusted perspective based on user feedback

- **specific-questions**: Targeted Q&A
  - Use CLI for targeted investigation of user-specified questions

- For all types, produce round summary:
  - updated_understanding: {confirmed[], corrected[], new_insights[]}
  - convergent themes, conflicting views
  - remaining open questions

### Role: synthesizer (SYNTH-* tasks)
Integrate all explorations, analyses, and discussions into final conclusions.

- Read all available artifacts from prev_context (explorations, analyses, discussions)
- Execute synthesis in four steps:
  1. **Theme Extraction**: Identify convergent themes across perspectives, rank by cross-perspective confirmation
  2. **Conflict Resolution**: Identify contradictions, present trade-off analysis
  3. **Evidence Consolidation**: Deduplicate findings, aggregate by file reference, assign confidence levels
  4. **Recommendation Prioritization**: Sort by priority, deduplicate, cap at 10

- Confidence levels:

| Level | Criteria |
|-------|----------|
| High | Multiple sources confirm, strong evidence |
| Medium | Single source or partial evidence |
| Low | Speculative, needs verification |

- Produce final conclusions:
  - Executive summary
  - Key conclusions with evidence and confidence
  - Prioritized recommendations
  - Open questions
  - Cross-perspective synthesis (convergent themes, conflicts resolved, unique contributions)

4. **Share discoveries**: Append exploration findings to shared board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> .workflow/.csv-wave/{session-id}/discoveries.ndjson
   ```

   Discovery types to share:
   - `exploration`: {perspective, file, relevance, summary, patterns[]} — explored file/module
   - `analysis`: {perspective, insight, confidence, evidence, file_ref} — analysis insight
   - `pattern`: {name, file, description, type} — code/architecture pattern
   - `discussion_point`: {topic, perspectives[], convergence, open_questions[]} — discussion point
   - `recommendation`: {action, rationale, priority, confidence} — recommendation
   - `conclusion`: {point, evidence, confidence, perspectives_supporting[]} — final conclusion

5. **Report result**: Return JSON via report_agent_job_result

---

## Output (report_agent_job_result)

Return JSON:
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "error": ""
}

**Role-specific findings guidance**:
- **explorer**: List file count, key files, patterns found. Example: "Found 12 files related to auth. Key: src/auth/index.ts (entry), src/auth/strategies/*.ts (providers). Patterns: strategy, middleware chain."
- **analyst**: List insight count, top insights with confidence. Example: "3 insights: (1) Strategy pattern for providers [high], (2) Missing token rotation [medium], (3) No rate limiting [high]. 2 discussion points."
- **discussant**: List themes, conflicts, question count. Example: "Convergent: JWT security (2 perspectives). Conflict: middleware approach. 3 open questions on refresh tokens."
- **synthesizer**: List conclusion count, top recommendations. Example: "5 conclusions, 4 recommendations. Top: Implement refresh token rotation [high priority, high confidence]."
