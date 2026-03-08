## TASK ASSIGNMENT

### MANDATORY FIRST STEPS
1. Read shared discoveries: {session_folder}/discoveries.ndjson (if exists, skip if not)
2. Read project context: .workflow/project-tech.json (if exists)
3. Read task schema: .codex/skills/team-perf-opt/schemas/tasks-schema.md

---

## Your Task

**Task ID**: {id}
**Title**: {title}
**Description**: {description}
**Role**: {role}
**Bottleneck Type**: {bottleneck_type}
**Priority**: {priority}
**Target Files**: {target_files}

### Previous Tasks' Findings (Context)
{prev_context}

---

## Execution Protocol

1. **Read discoveries**: Load {session_folder}/discoveries.ndjson for shared exploration findings
2. **Use context**: Apply previous tasks' findings from prev_context above
3. **Execute by role**:

   **If role = profiler**:
   - Detect project type by scanning for framework markers:
     - Frontend (React/Vue/Angular): render time, bundle size, FCP/LCP/CLS
     - Backend Node (Express/Fastify/NestJS): CPU hotspots, memory, DB queries
     - Native/JVM Backend (Cargo/Go/Java): CPU, memory, GC tuning
     - CLI Tool: startup time, throughput, memory peak
   - Trace hot code paths and CPU hotspots within target scope
   - Identify memory allocation patterns and potential leaks
   - Measure I/O and network latency where applicable
   - Collect quantified baseline metrics (timing, memory, throughput)
   - Rank top 3-5 bottlenecks by severity (Critical/High/Medium)
   - Record evidence: file paths, line numbers, measured values
   - Write `{session_folder}/artifacts/baseline-metrics.json` (metrics)
   - Write `{session_folder}/artifacts/bottleneck-report.md` (ranked bottlenecks)

   **If role = strategist**:
   - Read bottleneck report and baseline from {session_folder}/artifacts/
   - For each bottleneck, select optimization strategy by type:
     - CPU: algorithm optimization, memoization, caching, worker threads
     - MEMORY: pool reuse, lazy init, WeakRef, scope cleanup
     - IO: batching, async pipelines, streaming, connection pooling
     - NETWORK: request coalescing, compression, CDN, prefetching
     - RENDERING: virtualization, memoization, CSS containment, code splitting
     - DATABASE: index optimization, query rewriting, caching layer
   - Prioritize by impact/effort: P0 (high impact+low effort) to P3
   - Assign unique OPT-IDs (OPT-001, 002, ...) with non-overlapping file targets
   - Define measurable success criteria (target metric value or improvement %)
   - Write `{session_folder}/artifacts/optimization-plan.md`

   **If role = optimizer**:
   - Read optimization plan from {session_folder}/artifacts/optimization-plan.md
   - Apply optimizations in priority order (P0 first)
   - Preserve existing behavior -- optimization must not break functionality
   - Make minimal, focused changes per optimization
   - Add comments only where optimization logic is non-obvious
   - Preserve existing code style and conventions

   **If role = benchmarker**:
   - Read baseline from {session_folder}/artifacts/baseline-metrics.json
   - Read plan from {session_folder}/artifacts/optimization-plan.md
   - Run benchmarks matching detected project type:
     - Frontend: bundle size, render performance
     - Backend: endpoint response times, memory under load, DB query times
     - CLI: execution time, memory peak, throughput
   - Run test suite to verify no regressions
   - Collect post-optimization metrics matching baseline format
   - Calculate improvement percentages per metric
   - Compare against plan success criteria
   - Write `{session_folder}/artifacts/benchmark-results.json`
   - Set verdict: PASS (meets criteria) / WARN (partial) / FAIL (regression or criteria not met)

   **If role = reviewer**:
   - Read plan from {session_folder}/artifacts/optimization-plan.md
   - Review changed files across 5 dimensions:
     - Correctness: logic errors, race conditions, null safety
     - Side effects: unintended behavior changes, API contract breaks
     - Maintainability: code clarity, complexity increase, naming
     - Regression risk: impact on unrelated code paths
     - Best practices: idiomatic patterns, no optimization anti-patterns
   - Write `{session_folder}/artifacts/review-report.md`
   - Set verdict: APPROVE / REVISE / REJECT

4. **Share discoveries**: Append exploration findings to shared board:
   ```bash
   echo '{"ts":"<ISO8601>","worker":"{id}","type":"<type>","data":{...}}' >> {session_folder}/discoveries.ndjson
   ```
5. **Report result**: Return JSON via report_agent_job_result

### Discovery Types to Share
- `bottleneck_found`: `{type, location, severity, description}` -- Bottleneck identified
- `hotspot_found`: `{file, function, cpu_pct, description}` -- CPU hotspot
- `memory_issue`: `{file, type, size_mb, description}` -- Memory problem
- `io_issue`: `{operation, latency_ms, description}` -- I/O issue
- `db_issue`: `{query, latency_ms, description}` -- Database issue
- `file_modified`: `{file, change, lines_added}` -- File change recorded
- `metric_measured`: `{metric, value, unit, context}` -- Metric measured
- `pattern_found`: `{pattern_name, location, description}` -- Pattern identified
- `artifact_produced`: `{name, path, producer, type}` -- Deliverable created

---

## Output (report_agent_job_result)

Return JSON:
{
  "id": "{id}",
  "status": "completed" | "failed",
  "findings": "Key discoveries and implementation notes (max 500 chars)",
  "verdict": "PASS|WARN|FAIL|APPROVE|REVISE|REJECT or empty",
  "artifacts_produced": "semicolon-separated artifact paths",
  "error": ""
}
