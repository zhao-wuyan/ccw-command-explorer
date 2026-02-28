# Phase 4: Architecture

Generate technical architecture decisions, component design, and technology selections based on requirements.

## Objective

- Analyze requirements to identify core components and system architecture
- Generate Architecture Decision Records (ADRs) with alternatives
- Map architecture to existing codebase (if applicable)
- Challenge architecture via Codex CLI review
- Generate architecture.md using template

## Input

- Dependency: `{workDir}/requirements/_index.md` (and individual `REQ-*.md` files)
- Reference: `{workDir}/product-brief.md`
- Optional: `{workDir}/discovery-context.json`
- Config: `{workDir}/spec-config.json`
- Template: `templates/architecture-doc.md`

## Execution Steps

### Step 1: Load Phase 2-3 Context

```javascript
const specConfig = JSON.parse(Read(`${workDir}/spec-config.json`));
const productBrief = Read(`${workDir}/product-brief.md`);
const requirements = Read(`${workDir}/requirements.md`);

let discoveryContext = null;
if (specConfig.has_codebase) {
  try {
    discoveryContext = JSON.parse(Read(`${workDir}/discovery-context.json`));
  } catch (e) { /* no context */ }
}
```

### Step 2: Architecture Analysis via Gemini CLI

```javascript
Bash({
  command: `ccw cli -p "PURPOSE: Generate technical architecture for the specified requirements.
Success: Complete component architecture, tech stack, and ADRs with justified decisions.

PRODUCT BRIEF (summary):
${productBrief.slice(0, 3000)}

REQUIREMENTS:
${requirements.slice(0, 5000)}

${discoveryContext ? `EXISTING CODEBASE:
- Tech stack: ${JSON.stringify(discoveryContext.tech_stack || {})}
- Existing patterns: ${discoveryContext.existing_patterns?.slice(0,5).join('; ') || 'none'}
- Architecture constraints: ${discoveryContext.architecture_constraints?.slice(0,3).join('; ') || 'none'}
` : ''}

TASK:
- Define system architecture style (monolith, microservices, serverless, etc.) with justification
- Identify core components and their responsibilities
- Create component interaction diagram (Mermaid graph TD format)
- Specify technology stack: languages, frameworks, databases, infrastructure
- Generate 2-4 Architecture Decision Records (ADRs):
  - Each ADR: context, decision, 2-3 alternatives with pros/cons, consequences
  - Focus on: data storage, API design, authentication, key technical choices
- Define data model: key entities and relationships (Mermaid erDiagram format)
- Identify security architecture: auth, authorization, data protection
- List API endpoints (high-level)
${discoveryContext ? '- Map new components to existing codebase modules' : ''}

MODE: analysis
EXPECTED: Complete architecture with: style justification, component diagram, tech stack table, ADRs, data model, security controls, API overview
CONSTRAINTS: Architecture must support all Must-have requirements. Prefer proven technologies over cutting-edge.
" --tool gemini --mode analysis`,
  run_in_background: true
});

// Wait for CLI result
```

### Step 3: Architecture Review via Codex CLI

```javascript
// After receiving Gemini analysis, challenge it with Codex
Bash({
  command: `ccw cli -p "PURPOSE: Critical review of proposed architecture - identify weaknesses and risks.
Success: Actionable feedback with specific concerns and improvement suggestions.

PROPOSED ARCHITECTURE:
${geminiArchitectureOutput.slice(0, 5000)}

REQUIREMENTS CONTEXT:
${requirements.slice(0, 2000)}

TASK:
- Challenge each ADR: are the alternatives truly the best options?
- Identify scalability bottlenecks in the component design
- Assess security gaps: authentication, authorization, data protection
- Evaluate technology choices: maturity, community support, fit
- Check for over-engineering or under-engineering
- Verify architecture covers all Must-have requirements
- Rate overall architecture quality: 1-5 with justification

MODE: analysis
EXPECTED: Architecture review with: per-ADR feedback, scalability concerns, security gaps, technology risks, quality rating
CONSTRAINTS: Be genuinely critical, not just validating. Focus on actionable improvements.
" --tool codex --mode analysis`,
  run_in_background: true
});

// Wait for CLI result
```

### Step 4: Interactive ADR Decisions (Optional)

```javascript
if (!autoMode) {
  // Present ADRs with review feedback to user
  // For each ADR where review raised concerns:
  AskUserQuestion({
    questions: [
      {
        question: "Architecture review raised concerns. How should we proceed?",
        header: "ADR Review",
        multiSelect: false,
        options: [
          { label: "Accept as-is", description: "Architecture is sound, proceed" },
          { label: "Incorporate feedback", description: "Adjust ADRs based on review" },
          { label: "Simplify", description: "Reduce complexity, fewer components" }
        ]
      }
    ]
  });
  // Apply user decisions to architecture
}
```

### Step 5: Codebase Integration Mapping (Conditional)

```javascript
if (specConfig.has_codebase && discoveryContext) {
  // Map new architecture components to existing code
  const integrationMapping = discoveryContext.relevant_files.map(f => ({
    new_component: "...", // matched from architecture
    existing_module: f.path,
    integration_type: "Extend|Replace|New",
    notes: f.rationale
  }));
  // Include in architecture document
}
```

### Step 6: Generate architecture/ directory

```javascript
const template = Read('templates/architecture-doc.md');

// Create architecture directory
Bash(`mkdir -p "${workDir}/architecture"`);

const status = autoMode ? 'complete' : 'draft';
const timestamp = new Date().toISOString();

// Parse CLI outputs into structured ADRs
const adrs = parseADRs(geminiArchitectureOutput, codexReviewOutput);  // [{id, slug, title, ...}]

// Step 6a: Write individual ADR-*.md files (one per decision)
adrs.forEach(adr => {
  // Use ADR-NNN-{slug}.md template from templates/architecture-doc.md
  // Fill: id, title, status, context, decision, alternatives, consequences, traces
  Write(`${workDir}/architecture/ADR-${adr.id}-${adr.slug}.md`, adrContent);
});

// Step 6b: Write _index.md (overview + components + tech stack + links to ADRs)
// Use _index.md template from templates/architecture-doc.md
// Fill: system overview, component diagram, tech stack, ADR links table,
//       data model, API design, security controls, infrastructure, codebase integration
Write(`${workDir}/architecture/_index.md`, indexContent);

// Update spec-config.json
specConfig.phasesCompleted.push({
  phase: 4,
  name: "architecture",
  output_dir: "architecture/",
  output_index: "architecture/_index.md",
  file_count: adrs.length + 1,
  completed_at: timestamp
});
Write(`${workDir}/spec-config.json`, JSON.stringify(specConfig, null, 2));
```

## Output

- **Directory**: `architecture/`
  - `_index.md` — Overview, component diagram, tech stack, data model, security, links
  - `ADR-NNN-{slug}.md` — Individual Architecture Decision Record (per ADR)
- **Format**: Markdown with YAML frontmatter, cross-linked to requirements via relative paths

## Quality Checklist

- [ ] Component diagram present in `_index.md` (Mermaid or ASCII)
- [ ] Tech stack specified (languages, frameworks, key libraries)
- [ ] >= 1 ADR file with alternatives considered
- [ ] Each ADR file lists >= 2 options
- [ ] `_index.md` ADR table links to all individual ADR files
- [ ] Integration points identified
- [ ] Data model described
- [ ] Codebase mapping present (if has_codebase)
- [ ] All files have valid YAML frontmatter
- [ ] ADR files link back to requirement files

## Next Phase

Proceed to [Phase 5: Epics & Stories](05-epics-stories.md) with the generated architecture.md.
