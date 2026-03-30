# Phase 3: Requirements (PRD)

> **Execution Mode: Agent Delegated (Codex v4)**
> This phase is executed by a `doc-generator` agent. The orchestrator spawns the agent via `spawn_agent({ task_name: "doc-gen-p3", fork_context: false })` and retrieves results via `wait_agent`. The agent reads this file as part of its MANDATORY FIRST STEPS, executes all steps, writes output files, and returns a JSON summary.

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
- Use RFC 2119 keywords (MUST, SHOULD, MAY, MUST NOT, SHOULD NOT) to define behavioral constraints for each requirement. Example: 'The system MUST return a 401 response within 100ms for invalid tokens.'
- For each core domain entity referenced in requirements, define its data model: fields, types, constraints, and relationships to other entities
- Maintain terminology consistency with the glossary below:
  TERMINOLOGY GLOSSARY:
  \${glossary ? JSON.stringify(glossary.terms, null, 2) : 'N/A - generate terms inline'}

MODE: analysis
EXPECTED: Structured requirements with: ID, title, description, user story, acceptance criteria, priority, traceability to goals
CONSTRAINTS: Every requirement must be specific enough to estimate and test. No vague requirements like 'system should be fast'.
" --tool gemini --mode analysis`,
});

// Parse CLI result
```

### Step 2.5: Codex Requirements Review

After receiving Gemini expansion results, validate requirements quality via Codex CLI before proceeding:

```javascript
Bash({
  command: `ccw cli -p "PURPOSE: Critical review of generated requirements - validate quality, testability, and scope alignment.
Success: Actionable feedback on requirement quality with specific issues identified.

GENERATED REQUIREMENTS:
${geminiRequirementsOutput.slice(0, 5000)}

PRODUCT BRIEF SCOPE:
${productBrief.slice(0, 2000)}

TASK:
- Verify every acceptance criterion is specific, measurable, and testable (not vague like 'should be fast')
- Validate RFC 2119 keyword usage: MUST/SHOULD/MAY used correctly per RFC 2119 semantics
- Check scope containment: no requirement exceeds the product brief's defined scope boundaries
- Assess data model completeness: all referenced entities have field-level definitions
- Identify duplicate or overlapping requirements
- Rate overall requirements quality: 1-5 with justification

MODE: analysis
EXPECTED: Requirements review with: per-requirement feedback, testability assessment, scope violations, data model gaps, quality rating
CONSTRAINTS: Be genuinely critical. Focus on requirements that would block implementation if left vague.
" --tool codex --mode analysis`,
});

// Parse Codex review result
// Integrate feedback into requirements before writing files:
// - Fix vague acceptance criteria flagged by Codex
// - Correct RFC 2119 keyword misuse
// - Remove or flag requirements that exceed brief scope
// - Fill data model gaps identified by Codex
```

### Step 3: User Priority Sorting (Interactive)

```javascript
if (!autoMode) {
  // Present requirements grouped by initial priority
  // Allow user to adjust MoSCoW labels
  request_user_input({
    questions: [
      {
        header: "Must-Have",
        id: "must_have",
        question: "Review the Must-Have requirements. Any that should be reprioritized?",
        options: [
          { label: "All correct(Recommended)", description: "Must-have requirements are accurate" },
          { label: "Too many", description: "Some should be Should/Could" },
          { label: "Missing items", description: "Some Should requirements should be Must" }
        ]
      },
      {
        header: "MVP Scope",
        id: "mvp_scope",
        question: "What is the target MVP scope?",
        options: [
          { label: "Must-Have only(Recommended)", description: "MVP includes only Must requirements" },
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

---

## Agent Return Summary

When executed as a delegated agent, return the following JSON summary to the orchestrator:

```json
{
  "phase": 3,
  "status": "complete",
  "files_created": ["requirements/_index.md", "requirements/REQ-001-*.md", "..."],
  "file_count": 0,
  "codex_review_integrated": true,
  "quality_notes": ["list of quality concerns or Codex feedback items addressed"],
  "key_decisions": ["MoSCoW priority rationale", "scope adjustments from Codex review"]
}
```

The orchestrator will:
1. Validate that `requirements/` directory exists with `_index.md` and individual files
2. Read `spec-config.json` to confirm `phasesCompleted` was updated
3. Store the summary for downstream phase context
