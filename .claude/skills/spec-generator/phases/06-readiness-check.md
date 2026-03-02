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
   - User personas consistent?
   - Scope consistent (PRD does not exceed brief)?
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
  run_in_background: true
});

// Wait for CLI result
```

### Step 3: Generate readiness-report.md

```javascript
const frontmatterReport = `---
session_id: ${specConfig.session_id}
phase: 6
document_type: readiness-report
status: complete
generated_at: ${new Date().toISOString()}
stepsCompleted: ["load-all", "cross-validation", "scoring", "report-generation"]
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
AskUserQuestion({
  questions: [
    {
      question: "Specification package is complete. What would you like to do next?",
      header: "Next Step",
      multiSelect: false,
      options: [
        {
          label: "Execute via lite-plan",
          description: "Start implementing with /workflow-lite-plan, one Epic at a time"
        },
        {
          label: "Create roadmap",
          description: "Generate execution roadmap with /workflow:req-plan-with-file"
        },
        {
          label: "Full planning",
          description: "Detailed planning with /workflow-plan for the full scope"
        },
        {
          label: "Create Issues",
          description: "Generate issues for each Epic via /issue:new"
        }
      ]
    }
  ]
});

// Based on user selection, execute the corresponding handoff:

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
  Skill(skill="workflow-lite-plan", args=`"${title}: ${description}"`)
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
  Skill(skill="workflow:session:start", args=`--auto "${structuredDesc}"`)
  // → Produces sessionId (WFS-xxx) and session directory at .workflow/active/{sessionId}/

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
    Skill(skill="workflow-plan", args=`"${structuredDesc}"`)
  } else {
    Skill(skill="workflow:req-plan-with-file", args=`"${extractGoal(specSummary)}"`)
  }
}

if (selection === "Create Issues") {
  // For each EPIC file, create an issue (read directly from individual files)
  const epicFiles = Glob(`${workDir}/epics/EPIC-*.md`);
  epicFiles.forEach(epicFile => {
    const content = Read(epicFile);
    const title = extractTitle(content);
    const description = extractSection(content, "Description");
    Skill(skill="issue:new", args=`"${title}: ${description}"`)
  });
}

// If user selects "Other": Export only or return to specific phase
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
