## TASK ASSIGNMENT

### MANDATORY FIRST STEPS
1. Read shared discoveries: {session_folder}/discoveries.ndjson (if exists, skip if not)
2. Read project context: .workflow/project-tech.json (if exists)

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Description**: {description}
**Dimension**: {dimension}
**Target**: {target}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

1. **Read discoveries**: Load {session_folder}/discoveries.ndjson for shared exploration findings
2. **Use context**: Apply previous tasks' findings from prev_context above
3. **Execute**: Perform your assigned role (scanner or reviewer) following the role-specific instructions below
4. **Share discoveries**: Append exploration findings to shared board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> {session_folder}/discoveries.ndjson
   ```
5. **Report result**: Return JSON via report_agent_job_result

### Role-Specific Instructions

**If you are a Scanner (SCAN-* task)**:
1. Extract session path and target from description
2. Resolve target files (glob pattern or directory → `**/*.{ts,tsx,js,jsx,py,go,java,rs}`)
3. If no source files found → report empty, complete task cleanly
4. Detect toolchain availability:
   - tsc: `tsconfig.json` exists → COR dimension
   - eslint: `.eslintrc*` or `eslint` in package.json → COR/MNT
   - semgrep: `.semgrep.yml` exists → SEC dimension
   - ruff: `pyproject.toml` + ruff available → SEC/COR/MNT
   - mypy: mypy available + `pyproject.toml` → COR
   - npmAudit: `package-lock.json` exists → SEC
5. Run detected tools in parallel via Bash backgrounding
6. Parse tool outputs into normalized findings with dimension, severity, file:line
7. Execute semantic scan via CLI: `ccw cli --tool gemini --mode analysis --rule analysis-review-code-quality`
8. Focus areas per dimension:
   - SEC: Business logic vulnerabilities, privilege escalation, sensitive data flow, auth bypass
   - COR: Logic errors, unhandled exception paths, state management bugs, race conditions
   - PRF: Algorithm complexity, N+1 queries, unnecessary sync, memory leaks, missing caching
   - MNT: Architectural coupling, abstraction leaks, convention violations, dead code
9. Merge toolchain + semantic findings, deduplicate (same file + line + dimension)
10. Assign dimension-prefixed IDs: SEC-001, COR-001, PRF-001, MNT-001
11. Write scan results to session directory

**If you are a Reviewer (REV-* task)**:
1. Extract session path and input path from description
2. Load scan results from previous task (via prev_context or session directory)
3. If scan results empty → report clean, complete immediately
4. Triage findings into deep_analysis (critical/high/medium, max 15) and pass_through (remaining)
5. Split deep_analysis into domain groups:
   - Group A: Security + Correctness → Root cause tracing, fix dependencies, blast radius
   - Group B: Performance + Maintainability → Optimization approaches, refactor tradeoffs
6. Execute parallel CLI agents for enrichment: `ccw cli --tool gemini --mode analysis --rule analysis-diagnose-bug-root-cause`
7. Request 6 enrichment fields per finding:
   - root_cause: {description, related_findings[], is_symptom}
   - impact: {scope: low/medium/high, affected_files[], blast_radius}
   - optimization: {approach, alternative, tradeoff}
   - fix_strategy: minimal / refactor / skip
   - fix_complexity: low / medium / high
   - fix_dependencies: finding IDs that must be fixed first
8. Merge enriched + pass_through findings
9. Cross-correlate:
   - Critical files: file appears in >=2 dimensions
   - Root cause groups: cluster findings sharing related_findings
   - Optimization suggestions: from root cause groups + standalone enriched findings
10. Compute metrics: by_dimension, by_severity, dimension_severity_matrix, fixable_count
11. Write review report to session directory

### Discovery Types to Share

- `finding`: {dimension, file, line, severity, title} — Code issue discovered
- `root_cause`: {finding_id, description, related_findings[]} — Root cause analysis
- `pattern`: {pattern, files[], occurrences} — Code pattern identified

---

## Output (report_agent_job_result)

Return JSON:
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "error": ""
}

**Scanner findings format**: "Found X security issues (Y critical, Z high), A correctness bugs, B performance issues, C maintainability concerns. Toolchain: [tool results]. LLM scan: [semantic issues]."

**Reviewer findings format**: "Analyzed X findings. Critical files: [files]. Root cause groups: [count]. Fixable: Y/X. Recommended fix scope: [scope]."
