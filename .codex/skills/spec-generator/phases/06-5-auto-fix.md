# Phase 6.5: Auto-Fix

> **Execution Mode: Agent Delegated (Codex v4)**
> This phase is executed by a `doc-generator` agent when triggered by the orchestrator after Phase 6 identifies issues. The orchestrator spawns via `spawn_agent({ task_name: "doc-gen-fix", fork_context: false })` and retrieves results via `wait_agent`. The agent reads this file as part of its MANDATORY FIRST STEPS, applies fixes to affected documents, and returns a JSON summary.

Automatically repair specification issues identified in Phase 6 Readiness Check.

## Objective

- Parse readiness-report.md to extract Error and Warning items
- Group issues by originating Phase (2-5)
- Re-generate affected sections with error context injected into CLI prompts
- Re-run Phase 6 validation after fixes

## Input

- Dependency: `{workDir}/readiness-report.md` (Phase 6 output)
- Config: `{workDir}/spec-config.json` (with iteration_count)
- All Phase 2-5 outputs

## Execution Steps

### Step 1: Parse Readiness Report

```javascript
const readinessReport = Read(`${workDir}/readiness-report.md`);
const specConfig = JSON.parse(Read(`${workDir}/spec-config.json`));

// Load glossary for terminology consistency during fixes
let glossary = null;
try {
  glossary = JSON.parse(Read(`${workDir}/glossary.json`));
} catch (e) { /* proceed without */ }

// Extract issues from readiness report
// Parse Error and Warning severity items
// Group by originating phase:
//   Phase 2 issues: vision, problem statement, scope, personas
//   Phase 3 issues: requirements, acceptance criteria, priority, traceability
//   Phase 4 issues: architecture, ADRs, tech stack, data model, state machine
//   Phase 5 issues: epics, stories, dependencies, MVP scope

const issuesByPhase = {
  2: [], // product brief issues
  3: [], // requirements issues
  4: [], // architecture issues
  5: []  // epics issues
};

// Parse structured issues from report
// Each issue: { severity: "Error"|"Warning", description: "...", location: "file:section" }

// Map phase numbers to output files
const phaseOutputFile = {
  2: 'product-brief.md',
  3: 'requirements/_index.md',
  4: 'architecture/_index.md',
  5: 'epics/_index.md'
};
```

### Step 2: Fix Affected Phases (Sequential)

For each phase with issues (in order 2 -> 3 -> 4 -> 5):

```javascript
for (const [phase, issues] of Object.entries(issuesByPhase)) {
  if (issues.length === 0) continue;

  const errorContext = issues.map(i => `[${i.severity}] ${i.description} (at ${i.location})`).join('\n');

  // Read current phase output
  const currentOutput = Read(`${workDir}/${phaseOutputFile[phase]}`);

  Bash({
    command: `ccw cli -p "PURPOSE: Fix specification issues identified in readiness check for Phase ${phase}.
Success: All listed issues resolved while maintaining consistency with other documents.

CURRENT DOCUMENT:
${currentOutput.slice(0, 5000)}

ISSUES TO FIX:
${errorContext}

${glossary ? `GLOSSARY (maintain consistency):
${JSON.stringify(glossary.terms, null, 2)}` : ''}

TASK:
- Address each listed issue specifically
- Maintain all existing content that is not flagged
- Ensure terminology consistency with glossary
- Preserve YAML frontmatter and cross-references
- Use RFC 2119 keywords for behavioral requirements
- Increment document version number

MODE: analysis
EXPECTED: Corrected document content addressing all listed issues
CONSTRAINTS: Minimal changes - only fix flagged issues, do not restructure unflagged sections
" --tool gemini --mode analysis`
  });

  // Parse result, apply fixes to document
  // Update document version in frontmatter
}
```

### Step 3: Update State

```javascript
specConfig.phasesCompleted.push({
  phase: 6.5,
  name: "auto-fix",
  iteration: specConfig.iteration_count,
  phases_fixed: Object.keys(issuesByPhase).filter(p => issuesByPhase[p].length > 0),
  completed_at: new Date().toISOString()
});
Write(`${workDir}/spec-config.json`, JSON.stringify(specConfig, null, 2));
```

### Step 4: Re-run Phase 6 Validation

```javascript
// Re-execute Phase 6: Readiness Check
// This creates a new readiness-report.md
// If still Fail and iteration_count < 2: loop back to Step 1
// If Pass or iteration_count >= 2: proceed to handoff
```

## Output

- **Updated**: Phase 2-5 documents (only affected ones)
- **Updated**: `spec-config.json` (iteration tracking)
- **Triggers**: Phase 6 re-validation

## Quality Checklist

- [ ] All Error-severity issues addressed
- [ ] Warning-severity issues attempted (best effort)
- [ ] Document versions incremented for modified files
- [ ] Terminology consistency maintained
- [ ] Cross-references still valid after fixes
- [ ] Iteration count not exceeded (max 2)

## Next Phase

Re-run [Phase 6: Readiness Check](06-readiness-check.md) to validate fixes.

---

## Agent Return Summary

When executed as a delegated agent, return the following JSON summary to the orchestrator:

```json
{
  "phase": 6.5,
  "status": "complete",
  "files_modified": ["list of files that were updated"],
  "issues_fixed": {
    "errors": 0,
    "warnings": 0
  },
  "quality_notes": ["list of fix decisions and remaining concerns"],
  "phases_touched": [2, 3, 4, 5]
}
```

The orchestrator will:
1. Validate that listed files were actually modified (check version increment)
2. Update `spec-config.json` iteration tracking
3. Re-trigger Phase 6 validation
