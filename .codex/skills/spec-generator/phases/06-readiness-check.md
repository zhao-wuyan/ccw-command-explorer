# Phase 6: Readiness Check

Validate the complete specification package, generate quality report and executive summary, provide execution handoff options.

## Objective

- Cross-document validation: completeness, consistency, traceability, depth
- Generate quality scores per dimension
- Produce readiness-report.md with issue list and traceability matrix
- Produce spec-summary.md as one-page executive summary
- Update all document frontmatter to `status: complete`
- Present handoff options to execution workflows

## Input

- All Phase 2-5 outputs: `product-brief.md`, `requirements/_index.md` (+ `REQ-*.md`, `NFR-*.md`), `architecture/_index.md` (+ `ADR-*.md`), `epics/_index.md` (+ `EPIC-*.md`)
- Config: `{workDir}/spec-config.json`
- Reference: `specs/quality-gates.md`

## Execution Steps

### Step 1: Load All Documents

```javascript
const specConfig = JSON.parse(Read(`${workDir}/spec-config.json`));
const productBrief = Read(`${workDir}/product-brief.md`);
const requirementsIndex = Read(`${workDir}/requirements/_index.md`);
const architectureIndex = Read(`${workDir}/architecture/_index.md`);
const epicsIndex = Read(`${workDir}/epics/_index.md`);
const qualityGates = Read('specs/quality-gates.md');

// Load individual files for deep validation
const reqFiles = Glob(`${workDir}/requirements/REQ-*.md`);
const nfrFiles = Glob(`${workDir}/requirements/NFR-*.md`);
const adrFiles = Glob(`${workDir}/architecture/ADR-*.md`);
const epicFiles = Glob(`${workDir}/epics/EPIC-*.md`);
```

### Step 2: Cross-Document Validation via Gemini CLI

```javascript
Bash({
  command: `ccw cli -p "PURPOSE: Validate specification package for completeness, consistency, traceability, and depth.
Success: Comprehensive quality report with scores, issues, and traceability matrix.

DOCUMENTS TO VALIDATE:

=== PRODUCT BRIEF ===
${productBrief.slice(0, 3000)}

=== REQUIREMENTS INDEX (${reqFiles.length} REQ + ${nfrFiles.length} NFR files) ===
${requirementsIndex.slice(0, 3000)}

=== ARCHITECTURE INDEX (${adrFiles.length} ADR files) ===
${architectureIndex.slice(0, 2500)}

=== EPICS INDEX (${epicFiles.length} EPIC files) ===
${epicsIndex.slice(0, 2500)}

QUALITY CRITERIA (from quality-gates.md):
${qualityGates.slice(0, 2000)}

TASK:
Perform 4-dimension validation:

1. COMPLETENESS (25%):
   - All required sections present in each document?
   - All template fields filled with substantive content?
   - Score 0-100 with specific gaps listed

2. CONSISTENCY (25%):
   - Terminology uniform across documents?
   - Terminology glossary compliance: all core terms used consistently per glossary.json definitions?
   - No synonym drift (e.g., "user" vs "client" vs "consumer" for same concept)?
   - User personas consistent?
   - Scope consistent (PRD does not exceed brief)?
   - Scope containment: PRD requirements do not exceed product brief's defined scope?
   - Non-Goals respected: no requirement or story contradicts explicit Non-Goals?
   - Tech stack references match between architecture and epics?
   - Score 0-100 with inconsistencies listed

3. TRACEABILITY (25%):
   - Every goal has >= 1 requirement?
   - Every Must requirement has architecture coverage?
   - Every Must requirement appears in >= 1 story?
   - ADR choices reflected in epics?
   - Build traceability matrix: Goal -> Requirement -> Architecture -> Epic/Story
   - Score 0-100 with orphan items listed

4. DEPTH (25%):
   - Acceptance criteria specific and testable?
   - Architecture decisions justified with alternatives?
   - Stories estimable by dev team?
   - Score 0-100 with vague areas listed

ALSO:
- List all issues found, classified as Error/Warning/Info
- Generate overall weighted score
- Determine gate: Pass (>=80) / Review (60-79) / Fail (<60)

MODE: analysis
EXPECTED: JSON-compatible output with: dimension scores, overall score, gate, issues list (severity + description + location), traceability matrix
CONSTRAINTS: Be thorough but fair. Focus on actionable issues.
" --tool gemini --mode analysis`,
});

// Parse CLI result
```

### Step 2b: Codex Technical Depth Review

Launch Codex review in parallel with Gemini validation for deeper technical assessment:

```javascript
Bash({
  command: `ccw cli -p "PURPOSE: Deep technical quality review of specification package - assess architectural rigor and implementation readiness.
Success: Technical quality assessment with specific actionable feedback on ADR quality, data model, security, and observability.

ARCHITECTURE INDEX:
${architectureIndex.slice(0, 3000)}

ADR FILES (summaries):
${adrFiles.map(f => Read(f).slice(0, 500)).join('\n---\n')}

REQUIREMENTS INDEX:
${requirementsIndex.slice(0, 2000)}

TASK:
- ADR Alternative Quality: Each ADR has >= 2 genuine alternatives with substantive pros/cons (not strawman options)
- Data Model Completeness: All entities referenced in requirements have field-level definitions with types and constraints
- Security Coverage: Authentication, authorization, data protection, and input validation addressed for all external interfaces
- Observability Specification: Metrics, logging, and health checks defined for service/platform types
- Error Handling: Error classification and recovery strategies defined per component
- Configuration Model: All configurable parameters documented with types, defaults, and constraints
- Rate each dimension 1-5 with specific gaps identified

MODE: analysis
EXPECTED: Technical depth review with: per-dimension scores (1-5), specific gaps, improvement recommendations, overall technical readiness assessment
CONSTRAINTS: Focus on gaps that would cause implementation ambiguity. Ignore cosmetic issues.
" --tool codex --mode analysis`,
});

// Codex result merged with Gemini result in Step 3
```

### Step 2c: Per-Requirement Verification

Iterate through all individual requirement files for fine-grained verification:

```javascript
// Load all requirement files
const reqFiles = Glob(`${workDir}/requirements/REQ-*.md`);
const nfrFiles = Glob(`${workDir}/requirements/NFR-*.md`);
const allReqFiles = [...reqFiles, ...nfrFiles];

// Load reference documents for cross-checking
const productBrief = Read(`${workDir}/product-brief.md`);
const epicFiles = Glob(`${workDir}/epics/EPIC-*.md`);
const adrFiles = Glob(`${workDir}/architecture/ADR-*.md`);

// Read all epic content for coverage check
const epicContents = epicFiles.map(f => ({ path: f, content: Read(f) }));
const adrContents = adrFiles.map(f => ({ path: f, content: Read(f) }));

// Per-requirement verification
const verificationResults = allReqFiles.map(reqFile => {
  const content = Read(reqFile);
  const reqId = extractReqId(content);  // e.g., REQ-001 or NFR-PERF-001
  const priority = extractPriority(content);  // Must/Should/Could/Won't

  // Check 1: AC exists and is testable
  const hasAC = content.includes('- [ ]') || content.includes('Acceptance Criteria');
  const acTestable = !content.match(/should be (fast|good|reliable|secure)/i);  // No vague AC

  // Check 2: Traces back to Brief goal
  const tracesLinks = content.match(/product-brief\.md/);

  // Check 3: Must requirements have Story coverage (search EPIC files)
  let storyCoverage = priority !== 'Must' ? 'N/A' :
    epicContents.some(e => e.content.includes(reqId)) ? 'Covered' : 'MISSING';

  // Check 4: Must requirements have architecture coverage (search ADR files)
  let archCoverage = priority !== 'Must' ? 'N/A' :
    adrContents.some(a => a.content.includes(reqId)) ||
    Read(`${workDir}/architecture/_index.md`).includes(reqId) ? 'Covered' : 'MISSING';

  return {
    req_id: reqId,
    priority,
    ac_exists: hasAC ? 'Yes' : 'MISSING',
    ac_testable: acTestable ? 'Yes' : 'VAGUE',
    brief_trace: tracesLinks ? 'Yes' : 'MISSING',
    story_coverage: storyCoverage,
    arch_coverage: archCoverage,
    pass: hasAC && acTestable && tracesLinks &&
          (priority !== 'Must' || (storyCoverage === 'Covered' && archCoverage === 'Covered'))
  };
});

// Generate Per-Requirement Verification table for readiness-report.md
const verificationTable = `
## Per-Requirement Verification

| Req ID | Priority | AC Exists | AC Testable | Brief Trace | Story Coverage | Arch Coverage | Status |
|--------|----------|-----------|-------------|-------------|----------------|---------------|--------|
${verificationResults.map(r =>
  `| ${r.req_id} | ${r.priority} | ${r.ac_exists} | ${r.ac_testable} | ${r.brief_trace} | ${r.story_coverage} | ${r.arch_coverage} | ${r.pass ? 'PASS' : 'FAIL'} |`
).join('\n')}

**Summary**: ${verificationResults.filter(r => r.pass).length}/${verificationResults.length} requirements pass all checks.
`;
```

### Step 3: Generate readiness-report.md

```javascript
const frontmatterReport = `---
session_id: ${specConfig.session_id}
phase: 6
document_type: readiness-report
status: complete
generated_at: ${new Date().toISOString()}
stepsCompleted: ["load-all", "cross-validation", "codex-technical-review", "per-req-verification", "scoring", "report-generation"]
version: 1
dependencies:
  - product-brief.md
  - requirements/_index.md
  - architecture/_index.md
  - epics/_index.md
---`;

// Report content from CLI validation output:
// - Quality Score Summary (4 dimensions + overall)
// - Gate Decision (Pass/Review/Fail)
// - Issue List (grouped by severity: Error, Warning, Info)
// - Traceability Matrix (Goal -> Req -> Arch -> Epic/Story)
// - Codex Technical Depth Review (per-dimension scores from Step 2b)
// - Per-Requirement Verification Table (from Step 2c)
// - Recommendations for improvement

Write(`${workDir}/readiness-report.md`, `${frontmatterReport}\n\n${reportContent}`);
```

### Step 4: Generate spec-summary.md

```javascript
const frontmatterSummary = `---
session_id: ${specConfig.session_id}
phase: 6
document_type: spec-summary
status: complete
generated_at: ${new Date().toISOString()}
stepsCompleted: ["synthesis"]
version: 1
dependencies:
  - product-brief.md
  - requirements/_index.md
  - architecture/_index.md
  - epics/_index.md
  - readiness-report.md
---`;

// One-page executive summary:
// - Product Name & Vision (from product-brief.md)
// - Problem & Target Users (from product-brief.md)
// - Key Requirements count (Must/Should/Could from requirements.md)
// - Architecture Style & Tech Stack (from architecture.md)
// - Epic Overview (count, MVP scope from epics.md)
// - Quality Score (from readiness-report.md)
// - Recommended Next Step
// - File manifest with links

Write(`${workDir}/spec-summary.md`, `${frontmatterSummary}\n\n${summaryContent}`);
```

### Step 5: Update All Document Status

```javascript
// Update frontmatter status to 'complete' in all documents (directories + single files)
// product-brief.md is a single file
const singleFiles = ['product-brief.md'];
singleFiles.forEach(doc => {
  const content = Read(`${workDir}/${doc}`);
  Write(`${workDir}/${doc}`, content.replace(/status: draft/, 'status: complete'));
});

// Update all files in directories (index + individual files)
const dirFiles = [
  ...Glob(`${workDir}/requirements/*.md`),
  ...Glob(`${workDir}/architecture/*.md`),
  ...Glob(`${workDir}/epics/*.md`)
];
dirFiles.forEach(filePath => {
  const content = Read(filePath);
  if (content.includes('status: draft')) {
    Write(filePath, content.replace(/status: draft/, 'status: complete'));
  }
});

// Update spec-config.json
specConfig.phasesCompleted.push({
  phase: 6,
  name: "readiness-check",
  output_file: "readiness-report.md",
  completed_at: new Date().toISOString()
});
Write(`${workDir}/spec-config.json`, JSON.stringify(specConfig, null, 2));
```

### Step 6: Handoff Options

```javascript
request_user_input({
  questions: [
    {
      header: "Next Step",
      id: "next_step",
      question: "Specification package is complete. What would you like to do next?",
      options: [
        {
          label: "Export Issues(Recommended)",
          description: "Create issues per Epic with spec links and wave assignment (Phase 7)"
        },
        {
          label: "Execute via lite-plan",
          description: "Start implementing with /workflow-lite-plan, one Epic at a time"
        },
        {
          label: "Iterate & improve",
          description: "Re-run failed phases based on readiness report issues (max 2 iterations)"
        }
      ]
    }
  ]
});

// Based on user selection (answer.answers.next_step.answers[0]), execute the corresponding handoff:
const selection = answer.answers.next_step.answers[0];

if (selection === "Execute via lite-plan") {
  // lite-plan accepts a text description directly
  // Read first MVP Epic from individual EPIC-*.md files
  const epicFiles = Glob(`${workDir}/epics/EPIC-*.md`);
  const firstMvpFile = epicFiles.find(f => {
    const content = Read(f);
    return content.includes('mvp: true');
  });
  const epicContent = Read(firstMvpFile);
  const title = extractTitle(epicContent);       // First # heading
  const description = extractSection(epicContent, "Description");
  // Invoke workflow-lite-plan skill with Epic description
  // Codex: use skill invocation mechanism for the target skill
  invoke_skill("workflow-lite-plan", `"${title}: ${description}"`)
}

if (selection === "Full planning" || selection === "Create roadmap") {
  // === Bridge: Build brainstorm_artifacts compatible structure ===
  // Reads from directory-based outputs (individual files), maps to .brainstorming/ format
  // for context-search-agent auto-discovery → action-planning-agent consumption.

  // Step A: Read spec documents from directories
  const specSummary = Read(`${workDir}/spec-summary.md`);
  const productBrief = Read(`${workDir}/product-brief.md`);
  const requirementsIndex = Read(`${workDir}/requirements/_index.md`);
  const architectureIndex = Read(`${workDir}/architecture/_index.md`);
  const epicsIndex = Read(`${workDir}/epics/_index.md`);

  // Read individual EPIC files (already split — direct mapping to feature-specs)
  const epicFiles = Glob(`${workDir}/epics/EPIC-*.md`);

  // Step B: Build structured description from spec-summary
  const structuredDesc = `GOAL: ${extractGoal(specSummary)}
SCOPE: ${extractScope(specSummary)}
CONTEXT: Generated from spec session ${specConfig.session_id}. Source: ${workDir}/`;

  // Step C: Create WFS session (provides session directory + .brainstorming/)
  invoke_skill("workflow:session:start", `--auto "${structuredDesc}"`)
  // -> Produces sessionId (WFS-xxx) and session directory at .workflow/active/{sessionId}/

  // Step D: Create .brainstorming/ bridge files
  const brainstormDir = `.workflow/active/${sessionId}/.brainstorming`;
  Bash(`mkdir -p "${brainstormDir}/feature-specs"`);

  // D.1: guidance-specification.md (highest priority — action-planning-agent reads first)
  // Synthesized from spec-summary + product-brief + architecture/requirements indexes
  Write(`${brainstormDir}/guidance-specification.md`, `
# ${specConfig.seed_analysis.problem_statement} - Confirmed Guidance Specification

**Source**: spec-generator session ${specConfig.session_id}
**Generated**: ${new Date().toISOString()}
**Spec Directory**: ${workDir}

## 1. Project Positioning & Goals
${extractSection(productBrief, "Vision")}
${extractSection(productBrief, "Goals")}

## 2. Requirements Summary
${extractSection(requirementsIndex, "Functional Requirements")}

## 3. Architecture Decisions
${extractSection(architectureIndex, "Architecture Decision Records")}
${extractSection(architectureIndex, "Technology Stack")}

## 4. Implementation Scope
${extractSection(epicsIndex, "Epic Overview")}
${extractSection(epicsIndex, "MVP Scope")}

## Feature Decomposition
${extractSection(epicsIndex, "Traceability Matrix")}

## Appendix: Source Documents
| Document | Path | Description |
|----------|------|-------------|
| Product Brief | ${workDir}/product-brief.md | Vision, goals, scope |
| Requirements | ${workDir}/requirements/ | _index.md + REQ-*.md + NFR-*.md |
| Architecture | ${workDir}/architecture/ | _index.md + ADR-*.md |
| Epics | ${workDir}/epics/ | _index.md + EPIC-*.md |
| Readiness Report | ${workDir}/readiness-report.md | Quality validation |
`);

  // D.2: feature-index.json (each EPIC file mapped to a Feature)
  // Path: feature-specs/feature-index.json (matches context-search-agent discovery)
  // Directly read from individual EPIC-*.md files (no monolithic parsing needed)
  const features = epicFiles.map(epicFile => {
    const content = Read(epicFile);
    const fm = parseFrontmatter(content);  // Extract YAML frontmatter
    const basename = path.basename(epicFile, '.md');  // EPIC-001-slug
    const epicNum = fm.id.replace('EPIC-', '');       // 001
    const slug = basename.replace(/^EPIC-\d+-/, '');   // slug
    return {
      id: `F-${epicNum}`,
      slug: slug,
      name: extractTitle(content),
      description: extractSection(content, "Description"),
      priority: fm.mvp ? "High" : "Medium",
      spec_path: `${brainstormDir}/feature-specs/F-${epicNum}-${slug}.md`,
      source_epic: fm.id,
      source_file: epicFile
    };
  });
  Write(`${brainstormDir}/feature-specs/feature-index.json`, JSON.stringify({
    version: "1.0",
    source: "spec-generator",
    spec_session: specConfig.session_id,
    features,
    cross_cutting_specs: []
  }, null, 2));

  // D.3: Feature-spec files — directly adapt from individual EPIC-*.md files
  // Since Epics are already individual documents, transform format directly
  // Filename pattern: F-{num}-{slug}.md (matches context-search-agent glob F-*-*.md)
  features.forEach(feature => {
    const epicContent = Read(feature.source_file);
    Write(feature.spec_path, `
# Feature Spec: ${feature.source_epic} - ${feature.name}

**Source**: ${feature.source_file}
**Priority**: ${feature.priority === "High" ? "MVP" : "Post-MVP"}

## Description
${extractSection(epicContent, "Description")}

## Stories
${extractSection(epicContent, "Stories")}

## Requirements
${extractSection(epicContent, "Requirements")}

## Architecture
${extractSection(epicContent, "Architecture")}
`);
  });

  // Step E: Invoke downstream workflow
  // context-search-agent will auto-discover .brainstorming/ files
  // → context-package.json.brainstorm_artifacts populated
  // → action-planning-agent loads guidance_specification (P1) + feature_index (P2)
  if (selection === "Full planning") {
    invoke_skill("workflow-plan", `"${structuredDesc}"`)
  } else {
    invoke_skill("workflow:req-plan-with-file", `"${extractGoal(specSummary)}"`)
  }
}

if (selection === "Export Issues(Recommended)") {
  // Proceed to Phase 7: Issue Export
  // Read phases/07-issue-export.md and execute
}

// If user selects "Other": Export only or return to specific phase

if (selection === "Iterate & improve") {
  // Check iteration count
  if (specConfig.iteration_count >= 2) {
    // Max iterations reached, force handoff
    // Present handoff options again without iterate
    return;
  }

  // Update iteration tracking
  specConfig.iteration_count = (specConfig.iteration_count || 0) + 1;
  specConfig.iteration_history.push({
    iteration: specConfig.iteration_count,
    timestamp: new Date().toISOString(),
    readiness_score: overallScore,
    errors_found: errorCount,
    phases_to_fix: affectedPhases
  });
  Write(`${workDir}/spec-config.json`, JSON.stringify(specConfig, null, 2));

  // Proceed to Phase 6.5: Auto-Fix
  // Read phases/06-5-auto-fix.md and execute
}
```

#### Helper Functions Reference (pseudocode)

The following helper functions are used in the handoff bridge. They operate on markdown content from individual spec files:

```javascript
// Extract title from a markdown document (first # heading)
function extractTitle(markdown) {
  // Return the text after the first # heading (e.g., "# EPIC-001: Title" → "Title")
}

// Parse YAML frontmatter from markdown (between --- markers)
function parseFrontmatter(markdown) {
  // Return object with: id, priority, mvp, size, requirements, architecture, dependencies
}

// Extract GOAL/SCOPE from spec-summary frontmatter or ## sections
function extractGoal(specSummary) { /* Return the Vision/Goal line */ }
function extractScope(specSummary) { /* Return the Scope/MVP boundary */ }

// Extract a named ## section from a markdown document
function extractSection(markdown, sectionName) {
  // Return content between ## {sectionName} and next ## heading
}
```

## Output

- **File**: `readiness-report.md` - Quality validation report
- **File**: `spec-summary.md` - One-page executive summary
- **Format**: Markdown with YAML frontmatter

## Quality Checklist

- [ ] All document directories validated (product-brief, requirements/, architecture/, epics/)
- [ ] All frontmatter parseable and valid (index + individual files)
- [ ] Cross-references checked (relative links between directories)
- [ ] Overall quality score calculated
- [ ] No unresolved Error-severity issues
- [ ] Traceability matrix generated
- [ ] spec-summary.md created
- [ ] All document statuses updated to 'complete' (all files in all directories)
- [ ] Handoff options presented

## Completion

This is the final phase. The specification package is ready for execution handoff.

### Output Files Manifest

| Path | Phase | Description |
|------|-------|-------------|
| `spec-config.json` | 1 | Session configuration and state |
| `discovery-context.json` | 1 | Codebase exploration (optional) |
| `product-brief.md` | 2 | Product brief with multi-perspective synthesis |
| `requirements/` | 3 | Directory: `_index.md` + `REQ-*.md` + `NFR-*.md` |
| `architecture/` | 4 | Directory: `_index.md` + `ADR-*.md` |
| `epics/` | 5 | Directory: `_index.md` + `EPIC-*.md` |
| `readiness-report.md` | 6 | Quality validation report |
| `spec-summary.md` | 6 | One-page executive summary |
