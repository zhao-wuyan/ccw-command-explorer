# Phase 2: Product Brief

Generate a product brief through multi-perspective CLI analysis, establishing "what" and "why".

## Objective

- Read Phase 1 outputs (spec-config.json, discovery-context.json)
- Launch 3 parallel CLI analyses from product, technical, and user perspectives
- Synthesize convergent themes and conflicting views
- Optionally refine with user input
- Generate product-brief.md using template

## Input

- Dependency: `{workDir}/spec-config.json`
- Primary: `{workDir}/refined-requirements.json` (Phase 1.5 output, preferred over raw seed_analysis)
- Optional: `{workDir}/discovery-context.json`
- Config: `{workDir}/spec-config.json`
- Template: `templates/product-brief.md`

## Execution Steps

### Step 1: Load Phase 1 Context

```javascript
const specConfig = JSON.parse(Read(`${workDir}/spec-config.json`));
const { seed_analysis, seed_input, has_codebase, depth, focus_areas } = specConfig;

// Load refined requirements (Phase 1.5 output) - preferred over raw seed_analysis
let refinedReqs = null;
try {
  refinedReqs = JSON.parse(Read(`${workDir}/refined-requirements.json`));
} catch (e) {
  // No refined requirements, fall back to seed_analysis
}

let discoveryContext = null;
if (has_codebase) {
  try {
    discoveryContext = JSON.parse(Read(`${workDir}/discovery-context.json`));
  } catch (e) {
    // No discovery context available, proceed without
  }
}

// Build shared context string for CLI prompts
// Prefer refined requirements over raw seed_analysis
const problem = refinedReqs?.clarified_problem_statement || seed_analysis.problem_statement;
const users = refinedReqs?.confirmed_target_users?.map(u => u.name || u).join(', ')
  || seed_analysis.target_users.join(', ');
const domain = refinedReqs?.confirmed_domain || seed_analysis.domain;
const constraints = refinedReqs?.boundary_conditions?.constraints?.join(', ')
  || seed_analysis.constraints.join(', ');
const features = refinedReqs?.confirmed_features?.map(f => f.name).join(', ') || '';
const nfrs = refinedReqs?.non_functional_requirements?.map(n => `${n.type}: ${n.details}`).join('; ') || '';

const sharedContext = `
SEED: ${seed_input}
PROBLEM: ${problem}
TARGET USERS: ${users}
DOMAIN: ${domain}
CONSTRAINTS: ${constraints}
FOCUS AREAS: ${focus_areas.join(', ')}
${features ? `CONFIRMED FEATURES: ${features}` : ''}
${nfrs ? `NON-FUNCTIONAL REQUIREMENTS: ${nfrs}` : ''}
${discoveryContext ? `
CODEBASE CONTEXT:
- Existing patterns: ${discoveryContext.existing_patterns?.slice(0,5).join(', ') || 'none'}
- Architecture constraints: ${discoveryContext.architecture_constraints?.slice(0,3).join(', ') || 'none'}
- Tech stack: ${JSON.stringify(discoveryContext.tech_stack || {})}
` : ''}`;
```

### Step 2: Multi-CLI Parallel Analysis (3 perspectives)

Launch 3 CLI calls in parallel:

**Product Perspective (Gemini)**:
```javascript
Bash({
  command: `ccw cli -p "PURPOSE: Product analysis for specification - identify market fit, user value, and success criteria.
Success: Clear vision, measurable goals, competitive positioning.

${sharedContext}

TASK:
- Define product vision (1-3 sentences, aspirational)
- Analyze market/competitive landscape
- Define 3-5 measurable success metrics
- Identify scope boundaries (in-scope vs out-of-scope)
- Assess user value proposition
- List assumptions that need validation

MODE: analysis
EXPECTED: Structured product analysis with: vision, goals with metrics, scope, competitive positioning, assumptions
CONSTRAINTS: Focus on 'what' and 'why', not 'how'
" --tool gemini --mode analysis`,
  run_in_background: true
});
```

**Technical Perspective (Codex)**:
```javascript
Bash({
  command: `ccw cli -p "PURPOSE: Technical feasibility analysis for specification - assess implementation viability and constraints.
Success: Clear technical constraints, integration complexity, technology recommendations.

${sharedContext}

TASK:
- Assess technical feasibility of the core concept
- Identify technical constraints and blockers
- Evaluate integration complexity with existing systems
- Recommend technology approach (high-level)
- Identify technical risks and dependencies
- Estimate complexity: simple/moderate/complex

MODE: analysis
EXPECTED: Technical analysis with: feasibility assessment, constraints, integration complexity, tech recommendations, risks
CONSTRAINTS: Focus on feasibility and constraints, not detailed architecture
" --tool codex --mode analysis`,
  run_in_background: true
});
```

**User Perspective (Claude)**:
```javascript
Bash({
  command: `ccw cli -p "PURPOSE: User experience analysis for specification - understand user journeys, pain points, and UX considerations.
Success: Clear user personas, journey maps, UX requirements.

${sharedContext}

TASK:
- Elaborate user personas with goals and frustrations
- Map primary user journey (happy path)
- Identify key pain points in current experience
- Define UX success criteria
- List accessibility and usability considerations
- Suggest interaction patterns

MODE: analysis
EXPECTED: User analysis with: personas, journey map, pain points, UX criteria, interaction recommendations
CONSTRAINTS: Focus on user needs and experience, not implementation
" --tool claude --mode analysis`,
  run_in_background: true
});

// STOP: Wait for all 3 CLI results before continuing
```

### Step 3: Synthesize Perspectives

```javascript
// After receiving all 3 CLI results:
// Extract convergent themes (all agree)
// Identify conflicting views (need resolution)
// Note unique contributions from each perspective

const synthesis = {
  convergent_themes: [], // themes all 3 perspectives agree on
  conflicts: [],         // areas where perspectives differ
  product_insights: [],  // unique from product perspective
  technical_insights: [], // unique from technical perspective
  user_insights: []      // unique from user perspective
};
```

### Step 4: Interactive Refinement (Optional)

```javascript
if (!autoMode) {
  // Present synthesis summary to user
  // AskUserQuestion with:
  // - Confirm vision statement
  // - Resolve any conflicts between perspectives
  // - Adjust scope if needed
  AskUserQuestion({
    questions: [
      {
        question: "Review the synthesized product brief. Any adjustments needed?",
        header: "Review",
        multiSelect: false,
        options: [
          { label: "Looks good", description: "Proceed to PRD generation" },
          { label: "Adjust scope", description: "Narrow or expand the scope" },
          { label: "Revise vision", description: "Refine the vision statement" }
        ]
      }
    ]
  });
}
```

### Step 5: Generate product-brief.md

```javascript
// Read template
const template = Read('templates/product-brief.md');

// Fill template with synthesized content
// Apply document-standards.md formatting rules
// Write with YAML frontmatter

const frontmatter = `---
session_id: ${specConfig.session_id}
phase: 2
document_type: product-brief
status: ${autoMode ? 'complete' : 'draft'}
generated_at: ${new Date().toISOString()}
stepsCompleted: ["load-context", "multi-cli-analysis", "synthesis", "generation"]
version: 1
dependencies:
  - spec-config.json
---`;

// Combine frontmatter + filled template content
Write(`${workDir}/product-brief.md`, `${frontmatter}\n\n${filledContent}`);

// Update spec-config.json
specConfig.phasesCompleted.push({
  phase: 2,
  name: "product-brief",
  output_file: "product-brief.md",
  completed_at: new Date().toISOString()
});
Write(`${workDir}/spec-config.json`, JSON.stringify(specConfig, null, 2));
```

## Output

- **File**: `product-brief.md`
- **Format**: Markdown with YAML frontmatter

## Quality Checklist

- [ ] Vision statement: clear, 1-3 sentences
- [ ] Problem statement: specific and measurable
- [ ] Target users: >= 1 persona with needs
- [ ] Goals: >= 2 with measurable metrics
- [ ] Scope: in-scope and out-of-scope defined
- [ ] Multi-perspective synthesis included
- [ ] YAML frontmatter valid

## Next Phase

Proceed to [Phase 3: Requirements](03-requirements.md) with the generated product-brief.md.
