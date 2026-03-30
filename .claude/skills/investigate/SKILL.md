---
name: investigate
description: Systematic debugging with Iron Law methodology. 5-phase investigation from evidence collection to verified fix. Triggers on "investigate", "debug", "root cause".
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Investigate

Systematic debugging skill that enforces the Iron Law: never fix without a confirmed root cause. Produces a structured debug report with full evidence chain, minimal fix, and regression test.

## Iron Law Principle

**No fix without confirmed root cause.** Every investigation follows a strict evidence chain:
1. Reproduce the bug with concrete evidence
2. Analyze patterns to assess scope
3. Form and test hypotheses (max 3 strikes)
4. Implement minimal fix ONLY after root cause is confirmed
5. Verify fix and generate structured report

Violation of the Iron Law (skipping to Phase 4 without Phase 3 confirmation) is prohibited.

## Key Design Principles

1. **Evidence-First**: Collect before theorizing. Logs, stack traces, and reproduction steps are mandatory inputs.
2. **Minimal Fix**: Change only what is necessary. Refactoring is not debugging.
3. **3-Strike Escalation**: If 3 consecutive hypothesis tests fail, STOP and escalate with a diagnostic dump.
4. **Regression Coverage**: Every fix must include a test that fails without the fix and passes with it.
5. **Structured Output**: All findings are recorded in machine-readable JSON for future reference.

## Execution Flow

```
Phase 1: Root Cause Investigation
  Reproduce bug, collect evidence (errors, logs, traces)
  Use ccw cli --tool gemini --mode analysis for initial diagnosis
  Output: investigation-report.json
      |
      v
Phase 2: Pattern Analysis
  Search codebase for similar patterns (same error, module, antipattern)
  Assess scope: isolated vs systemic
  Output: pattern-analysis section in report
      |
      v
Phase 3: Hypothesis Testing
  Form max 3 hypotheses from evidence
  Test each with minimal read-only probes
  3-strike rule: STOP and escalate on 3 consecutive failures
  Output: confirmed root cause with evidence chain
      |
      v
Phase 4: Implementation  [GATE: requires Phase 3 confirmed root cause]
  Implement minimal fix
  Add regression test
  Verify fix resolves reproduction case
      |
      v
Phase 5: Verification & Report
  Run full test suite
  Check for regressions
  Generate structured debug report to .workflow/.debug/
```

## Directory Setup

```bash
mkdir -p .workflow/.debug
```

## Output Structure

```
.workflow/.debug/
  debug-report-{YYYY-MM-DD}-{slug}.json    # Structured debug report
```

## Completion Status Protocol

This skill follows the Completion Status Protocol defined in `_shared/SKILL-DESIGN-SPEC.md` sections 13-14.

| Status | When |
|--------|------|
| **DONE** | Root cause confirmed, fix applied, regression test passes, no regressions |
| **DONE_WITH_CONCERNS** | Fix applied but partial test coverage or minor warnings |
| **BLOCKED** | Cannot reproduce bug, or 3-strike escalation triggered in Phase 3 |
| **NEEDS_CONTEXT** | Missing reproduction steps, unclear error conditions |

## Reference Documents

| Document | Purpose |
|----------|---------|
| [phases/01-root-cause-investigation.md](phases/01-root-cause-investigation.md) | Evidence collection and reproduction |
| [phases/02-pattern-analysis.md](phases/02-pattern-analysis.md) | Codebase pattern search and scope assessment |
| [phases/03-hypothesis-testing.md](phases/03-hypothesis-testing.md) | Hypothesis formation, testing, and 3-strike rule |
| [phases/04-implementation.md](phases/04-implementation.md) | Minimal fix with Iron Law gate |
| [phases/05-verification-report.md](phases/05-verification-report.md) | Test suite, regression check, report generation |
| [specs/iron-law.md](specs/iron-law.md) | Iron Law rules definition |
| [specs/debug-report-format.md](specs/debug-report-format.md) | Structured debug report JSON schema |

## CLI Integration

This skill leverages `ccw cli` for multi-model analysis at key points:

| Phase | CLI Usage | Mode |
|-------|-----------|------|
| Phase 1 | Initial diagnosis from error evidence | `--mode analysis` |
| Phase 2 | Cross-file pattern search | `--mode analysis` |
| Phase 3 | Hypothesis validation assistance | `--mode analysis` |

All CLI calls use `--mode analysis` (read-only). No write-mode CLI calls during investigation phases 1-3.
