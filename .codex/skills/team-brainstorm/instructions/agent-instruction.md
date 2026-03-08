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
**Angle(s)**: {angle}
**GC Round**: {gc_round}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

1. **Read discoveries**: Load shared discoveries from the session's discoveries.ndjson for cross-task context
2. **Use context**: Apply previous tasks' findings from prev_context above
3. **Execute by role**:

### Role: ideator (IDEA-* tasks)
- **Initial Generation** (gc_round = 0):
  - For each angle listed in the Angle(s) field, generate 3+ ideas
  - Each idea must include: title, description (2-3 sentences), key assumption, potential impact, implementation hint
  - Self-review: ensure >= 6 ideas total, no duplicates, all angles covered
- **GC Revision** (gc_round > 0):
  - Read critique findings from prev_context
  - Focus on HIGH/CRITICAL severity challenges
  - Retain unchallenged ideas intact
  - Revise challenged ideas with revision rationale
  - Replace unsalvageable ideas with new alternatives

### Role: challenger (CHALLENGE-* tasks)
- Read all idea findings from prev_context
- Challenge each idea across 4 dimensions:
  - **Assumption Validity**: Does the core assumption hold? Counter-examples?
  - **Feasibility**: Technical/resource/time feasibility?
  - **Risk Assessment**: Worst case scenario? Hidden risks?
  - **Competitive Analysis**: Better alternatives already exist?
- Assign severity per idea: CRITICAL / HIGH / MEDIUM / LOW
- Determine GC signal:
  - Any CRITICAL or HIGH severity → `REVISION_NEEDED`
  - All MEDIUM or lower → `CONVERGED`

### Role: synthesizer (SYNTH-* tasks)
- Read all idea and critique findings from prev_context
- Execute synthesis steps:
  1. **Theme Extraction**: Identify common themes, rate strength (1-10), list supporting ideas
  2. **Conflict Resolution**: Identify contradictions, determine resolution approach
  3. **Complementary Grouping**: Group complementary ideas together
  4. **Gap Identification**: Discover uncovered perspectives
  5. **Integrated Proposals**: Generate 1-3 consolidated proposals with feasibility score (1-10) and innovation score (1-10)

### Role: evaluator (EVAL-* tasks)
- Read synthesis findings from prev_context
- Score each proposal across 4 weighted dimensions:
  - Feasibility (30%): Technical feasibility, resource needs, timeline
  - Innovation (25%): Novelty, differentiation, breakthrough potential
  - Impact (25%): Scope of impact, value creation, problem resolution
  - Cost Efficiency (20%): Implementation cost, risk cost, opportunity cost
- Weighted score = (Feasibility * 0.30) + (Innovation * 0.25) + (Impact * 0.25) + (Cost * 0.20)
- Provide recommendation per proposal: Strong Recommend / Recommend / Consider / Pass
- Generate final ranking

4. **Share discoveries**: Append exploration findings to shared board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> .workflow/.csv-wave/{session-id}/discoveries.ndjson
   ```

   Discovery types to share:
   - `idea`: {title, angle, description, assumption, impact} — generated idea
   - `critique`: {idea_title, dimension, severity, challenge, rationale} — critique finding
   - `theme`: {name, strength, supporting_ideas[]} — extracted theme
   - `proposal`: {title, source_ideas[], feasibility, innovation, description} — integrated proposal
   - `evaluation`: {proposal_title, weighted_score, rank, recommendation} — scored proposal

5. **Report result**: Return JSON via report_agent_job_result

---

## Output (report_agent_job_result)

Return JSON:
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "gc_signal": "REVISION_NEEDED | CONVERGED | (empty for non-challenger roles)",
  "severity_summary": "CRITICAL:N HIGH:N MEDIUM:N LOW:N (challenger only, empty for others)",
  "error": ""
}

**Role-specific findings guidance**:
- **ideator**: List idea count, angles covered, key themes. Example: "Generated 8 ideas across Technical, Product, Innovation. Top ideas: API Gateway, Event Sourcing, DevEx Platform."
- **challenger**: Summarize severity counts and GC signal. Example: "Challenged 8 ideas. 2 HIGH (require revision), 3 MEDIUM, 3 LOW. GC signal: REVISION_NEEDED."
- **synthesizer**: List proposal count and key themes. Example: "Synthesized 3 proposals from 5 themes. Top: Infrastructure Modernization (feasibility:8, innovation:7)."
- **evaluator**: List ranking and top recommendation. Example: "Ranked 3 proposals. #1: Infrastructure Modernization (7.85) - Strong Recommend."
