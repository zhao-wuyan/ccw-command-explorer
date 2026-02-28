# Phase 5: Epics & Stories

Decompose the specification into executable Epics and Stories with dependency mapping.

## Objective

- Group requirements into 3-7 logical Epics
- Tag MVP subset of Epics
- Generate 2-5 Stories per Epic in standard user story format
- Map cross-Epic dependencies (Mermaid diagram)
- Generate epics.md using template

## Input

- Dependency: `{workDir}/requirements/_index.md`, `{workDir}/architecture/_index.md` (and individual files)
- Reference: `{workDir}/product-brief.md`
- Config: `{workDir}/spec-config.json`
- Template: `templates/epics-template.md` (directory structure: `_index.md` + `EPIC-*.md`)

## Execution Steps

### Step 1: Load Phase 2-4 Context

```javascript
const specConfig = JSON.parse(Read(`${workDir}/spec-config.json`));
const productBrief = Read(`${workDir}/product-brief.md`);
const requirements = Read(`${workDir}/requirements.md`);
const architecture = Read(`${workDir}/architecture.md`);
```

### Step 2: Epic Decomposition via Gemini CLI

```javascript
Bash({
  command: `ccw cli -p "PURPOSE: Decompose requirements into executable Epics and Stories for implementation planning.
Success: 3-7 Epics with prioritized Stories, dependency map, and MVP subset clearly defined.

PRODUCT BRIEF (summary):
${productBrief.slice(0, 2000)}

REQUIREMENTS:
${requirements.slice(0, 5000)}

ARCHITECTURE (summary):
${architecture.slice(0, 3000)}

TASK:
- Group requirements into 3-7 logical Epics:
  - Each Epic: EPIC-NNN ID, title, description, priority (Must/Should/Could)
  - Group by functional domain or user journey stage
  - Tag MVP Epics (minimum set for initial release)
  
- For each Epic, generate 2-5 Stories:
  - Each Story: STORY-{EPIC}-NNN ID, title
  - User story format: As a [persona], I want [action] so that [benefit]
  - 2-4 acceptance criteria per story (testable)
  - Relative size estimate: S/M/L/XL
  - Trace to source requirement(s): REQ-NNN
  
- Create dependency map:
  - Cross-Epic dependencies (which Epics block others)
  - Mermaid graph LR format
  - Recommended execution order with rationale
  
- Define MVP:
  - Which Epics are in MVP
  - MVP definition of done (3-5 criteria)
  - What is explicitly deferred post-MVP

MODE: analysis
EXPECTED: Structured output with: Epic list (ID, title, priority, MVP flag), Stories per Epic (ID, user story, AC, size, trace), dependency Mermaid diagram, execution order, MVP definition
CONSTRAINTS: 
- Every Must-have requirement must appear in at least one Story
- Stories must be small enough to implement independently (no XL stories in MVP)
- Dependencies should be minimized across Epics
" --tool gemini --mode analysis`,
  run_in_background: true
});

// Wait for CLI result
```

### Step 3: Interactive Validation (Optional)

```javascript
if (!autoMode) {
  // Present Epic overview table and dependency diagram
  AskUserQuestion({
    questions: [
      {
        question: "Review the Epic breakdown. Any adjustments needed?",
        header: "Epics",
        multiSelect: false,
        options: [
          { label: "Looks good", description: "Epic structure is appropriate" },
          { label: "Merge epics", description: "Some epics should be combined" },
          { label: "Split epic", description: "An epic is too large, needs splitting" },
          { label: "Adjust MVP", description: "Change which epics are in MVP" }
        ]
      }
    ]
  });
  // Apply user adjustments
}
```

### Step 4: Generate epics/ directory

```javascript
const template = Read('templates/epics-template.md');

// Create epics directory
Bash(`mkdir -p "${workDir}/epics"`);

const status = autoMode ? 'complete' : 'draft';
const timestamp = new Date().toISOString();

// Parse CLI output into structured Epics
const epicsList = parseEpics(cliOutput);  // [{id, slug, title, priority, mvp, size, stories[], reqs[], adrs[], deps[]}]

// Step 4a: Write individual EPIC-*.md files (one per Epic, stories included)
epicsList.forEach(epic => {
  // Use EPIC-NNN-{slug}.md template from templates/epics-template.md
  // Fill: id, title, priority, mvp, size, description, requirements links,
  //       architecture links, dependency links, stories with user stories + AC
  Write(`${workDir}/epics/EPIC-${epic.id}-${epic.slug}.md`, epicContent);
});

// Step 4b: Write _index.md (overview + dependency map + MVP scope + traceability)
// Use _index.md template from templates/epics-template.md
// Fill: epic overview table (with links), dependency Mermaid diagram,
//       execution order, MVP scope, traceability matrix, estimation summary
Write(`${workDir}/epics/_index.md`, indexContent);

// Update spec-config.json
specConfig.phasesCompleted.push({
  phase: 5,
  name: "epics-stories",
  output_dir: "epics/",
  output_index: "epics/_index.md",
  file_count: epicsList.length + 1,
  completed_at: timestamp
});
Write(`${workDir}/spec-config.json`, JSON.stringify(specConfig, null, 2));
```

## Output

- **Directory**: `epics/`
  - `_index.md` — Overview table, dependency map, MVP scope, traceability matrix, links
  - `EPIC-NNN-{slug}.md` — Individual Epic with Stories (per Epic)
- **Format**: Markdown with YAML frontmatter, cross-linked to requirements and architecture via relative paths

## Quality Checklist

- [ ] 3-7 Epic files with EPIC-NNN IDs
- [ ] >= 1 Epic tagged as MVP in frontmatter
- [ ] 2-5 Stories per Epic file
- [ ] Stories use "As a...I want...So that..." format
- [ ] `_index.md` has cross-Epic dependency map (Mermaid)
- [ ] `_index.md` links to all individual Epic files
- [ ] Relative sizing (S/M/L/XL) per Story
- [ ] Epic files link to requirement files and ADR files
- [ ] All files have valid YAML frontmatter

## Next Phase

Proceed to [Phase 6: Readiness Check](06-readiness-check.md) to validate the complete specification package.
