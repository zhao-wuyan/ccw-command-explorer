# Phase 3: Requirements (PRD)

Generate a detailed Product Requirements Document with functional/non-functional requirements, acceptance criteria, and MoSCoW prioritization.

## Objective

- Read product-brief.md and extract goals, scope, constraints
- Expand each goal into functional requirements with acceptance criteria
- Generate non-functional requirements
- Apply MoSCoW priority labels (user input or auto)
- Generate requirements.md using template

## Input

- Dependency: `{workDir}/product-brief.md`
- Config: `{workDir}/spec-config.json`
- Template: `templates/requirements-prd.md` (directory structure: `_index.md` + `REQ-*.md` + `NFR-*.md`)

## Execution Steps

### Step 1: Load Phase 2 Context

```javascript
const specConfig = JSON.parse(Read(`${workDir}/spec-config.json`));
const productBrief = Read(`${workDir}/product-brief.md`);

// Extract key sections from product brief
// - Goals & Success Metrics table
// - Scope (in-scope items)
// - Target Users (personas)
// - Constraints
// - Technical perspective insights
```

### Step 2: Requirements Expansion via Gemini CLI

```javascript
Bash({
  command: `ccw cli -p "PURPOSE: Generate detailed functional and non-functional requirements from product brief.
Success: Complete PRD with testable acceptance criteria for every requirement.

PRODUCT BRIEF CONTEXT:
${productBrief}

TASK:
- For each goal in the product brief, generate 3-7 functional requirements
- Each requirement must have:
  - Unique ID: REQ-NNN (zero-padded)
  - Clear title
  - Detailed description
  - User story: As a [persona], I want [action] so that [benefit]
  - 2-4 specific, testable acceptance criteria
- Generate non-functional requirements:
  - Performance (response times, throughput)
  - Security (authentication, authorization, data protection)
  - Scalability (user load, data volume)
  - Usability (accessibility, learnability)
- Assign initial MoSCoW priority based on:
  - Must: Core functionality, cannot launch without
  - Should: Important but has workaround
  - Could: Nice-to-have, enhances experience
  - Won't: Explicitly deferred

MODE: analysis
EXPECTED: Structured requirements with: ID, title, description, user story, acceptance criteria, priority, traceability to goals
CONSTRAINTS: Every requirement must be specific enough to estimate and test. No vague requirements like 'system should be fast'.
" --tool gemini --mode analysis`,
  run_in_background: true
});

// Wait for CLI result
```

### Step 3: User Priority Sorting (Interactive)

```javascript
if (!autoMode) {
  // Present requirements grouped by initial priority
  // Allow user to adjust MoSCoW labels
  AskUserQuestion({
    questions: [
      {
        question: "Review the Must-Have requirements. Any that should be reprioritized?",
        header: "Must-Have",
        multiSelect: false,
        options: [
          { label: "All correct", description: "Must-have requirements are accurate" },
          { label: "Too many", description: "Some should be Should/Could" },
          { label: "Missing items", description: "Some Should requirements should be Must" }
        ]
      },
      {
        question: "What is the target MVP scope?",
        header: "MVP Scope",
        multiSelect: false,
        options: [
          { label: "Must-Have only (Recommended)", description: "MVP includes only Must requirements" },
          { label: "Must + key Should", description: "Include critical Should items in MVP" },
          { label: "Comprehensive", description: "Include all Must and Should" }
        ]
      }
    ]
  });
  // Apply user adjustments to priorities
} else {
  // Auto mode: accept CLI-suggested priorities as-is
}
```

### Step 4: Generate requirements/ directory

```javascript
// Read template
const template = Read('templates/requirements-prd.md');

// Create requirements directory
Bash(`mkdir -p "${workDir}/requirements"`);

const status = autoMode ? 'complete' : 'draft';
const timestamp = new Date().toISOString();

// Parse CLI output into structured requirements
const funcReqs = parseFunctionalRequirements(cliOutput);  // [{id, slug, title, priority, ...}]
const nfReqs = parseNonFunctionalRequirements(cliOutput);  // [{id, type, slug, title, ...}]

// Step 4a: Write individual REQ-*.md files (one per functional requirement)
funcReqs.forEach(req => {
  // Use REQ-NNN-{slug}.md template from templates/requirements-prd.md
  // Fill: id, title, priority, description, user_story, acceptance_criteria, traces
  Write(`${workDir}/requirements/REQ-${req.id}-${req.slug}.md`, reqContent);
});

// Step 4b: Write individual NFR-*.md files (one per non-functional requirement)
nfReqs.forEach(nfr => {
  // Use NFR-{type}-NNN-{slug}.md template from templates/requirements-prd.md
  // Fill: id, type, category, title, requirement, metric, target, traces
  Write(`${workDir}/requirements/NFR-${nfr.type}-${nfr.id}-${nfr.slug}.md`, nfrContent);
});

// Step 4c: Write _index.md (summary + links to all individual files)
// Use _index.md template from templates/requirements-prd.md
// Fill: summary table, functional req links table, NFR links tables,
//       data requirements, integration requirements, traceability matrix
Write(`${workDir}/requirements/_index.md`, indexContent);

// Update spec-config.json
specConfig.phasesCompleted.push({
  phase: 3,
  name: "requirements",
  output_dir: "requirements/",
  output_index: "requirements/_index.md",
  file_count: funcReqs.length + nfReqs.length + 1,
  completed_at: timestamp
});
Write(`${workDir}/spec-config.json`, JSON.stringify(specConfig, null, 2));
```

## Output

- **Directory**: `requirements/`
  - `_index.md` — Summary, MoSCoW table, traceability matrix, links
  - `REQ-NNN-{slug}.md` — Individual functional requirement (per requirement)
  - `NFR-{type}-NNN-{slug}.md` — Individual non-functional requirement (per NFR)
- **Format**: Markdown with YAML frontmatter, cross-linked via relative paths

## Quality Checklist

- [ ] Functional requirements: >= 3 with REQ-NNN IDs, each in own file
- [ ] Every requirement file has >= 1 acceptance criterion
- [ ] Every requirement has MoSCoW priority tag in frontmatter
- [ ] Non-functional requirements: >= 1, each in own file
- [ ] User stories present for Must-have requirements
- [ ] `_index.md` links to all individual requirement files
- [ ] Traceability links to product-brief.md goals
- [ ] All files have valid YAML frontmatter

## Next Phase

Proceed to [Phase 4: Architecture](04-architecture.md) with the generated requirements.md.
