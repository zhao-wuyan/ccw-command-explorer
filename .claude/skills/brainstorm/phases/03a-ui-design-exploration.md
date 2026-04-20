# Phase 3.5: UI Design Exploration

Sequential phase after text-only role analyses complete (Phase 3), before synthesis (Phase 4). Generates tangible UI artifacts — HTML prototypes, ASCII mockups, or API sketches — based on project type detection.

## Objective

- Detect project type and select appropriate output mode
- Generate visual/structural prototypes grounded in role analysis findings
- Enable interactive review of prototypes before synthesis
- Feed UI feedback back into synthesis context

## Prerequisites

- Phase 3 completed (all text-role analyses exist)
- `guidance-specification.md` available
- At least one UI-bearing feature identified in role analyses

## Skip Conditions

Skip this phase entirely when:
- Project type is `library` or `service` (no UI surface)
- No ui-designer in selected_roles
- `--yes` mode AND no explicit `--ui-explore` flag

---

## Step 3.5.1: Project Type Detection

Read project context to classify output mode:

```javascript
// Sources (read in order, first match wins)
const sources = [
  '.workflow/project.md',
  '.brainstorming/guidance-specification.md',
  'package.json',
  'pubspec.yaml',
  'Cargo.toml'
]

// Classification
const PROJECT_TYPES = {
  'web':         ['react', 'vue', 'angular', 'next', 'nuxt', 'svelte', 'html', 'webapp', 'dashboard'],
  'mobile':      ['react-native', 'flutter', 'ios', 'android', 'expo', 'capacitor'],
  'desktop-gui': ['electron', 'tauri', 'qt', 'gtk', 'winui', 'maui', 'wpf'],
  'cli':         ['commander', 'yargs', 'clap', 'cobra', 'ink', 'terminal'],
  'library':     ['npm package', 'crate', 'gem', 'pip', 'sdk'],
  'service':     ['api', 'microservice', 'grpc', 'graphql', 'rest', 'backend']
}

// Detect from guidance-specification.md keywords + package dependencies
const projectType = detectProjectType(sources)
```

## Step 3.5.2: Output Mode Selection

| Project Type | Output Mode | Output Directory | Format |
|-------------|-------------|------------------|--------|
| web, mobile, desktop-gui | HTML Prototype | `html-prototypes/` | Self-contained HTML (inline CSS/JS, no CDN) |
| cli | ASCII Mockup | `ascii-mockups/` | Markdown with terminal-style diagrams |
| library, service | API Sketch | `api-sketches/` | Markdown with endpoint/interface specs |

```javascript
const OUTPUT_MODES = {
  'web':         { dir: 'html-prototypes', format: 'html' },
  'mobile':      { dir: 'html-prototypes', format: 'html' },
  'desktop-gui': { dir: 'html-prototypes', format: 'html' },
  'cli':         { dir: 'ascii-mockups',   format: 'md' },
  'library':     { dir: 'api-sketches',    format: 'md' },
  'service':     { dir: 'api-sketches',    format: 'md' }
}

const outputDir = `.brainstorming/${OUTPUT_MODES[projectType].dir}/`
```

## Step 3.5.3: Generate Prototypes

Spawn `conceptual-planning-agent` with ui-designer role context to generate prototypes.

**Agent Input**:
- `guidance-specification.md` (feature scope + requirements)
- All non-UI role analyses (system-architect, ux-expert, etc. — read-only)
- Style skill package if provided (`--style-skill`)
- Output mode and format from Step 3.5.2

**Agent Prompt Construction**:
```javascript
Agent({
  subagent_type: "conceptual-planning-agent",
  prompt: `
    MODE: UI Design Exploration
    ROLE: ui-designer

    GUIDANCE SPEC:
    ${Read('.brainstorming/guidance-specification.md')}

    ROLE ANALYSES (read-only context):
    ${selectedRoles.filter(r => r !== 'ui-designer').map(role =>
      `### ${role}\n${Read(`.brainstorming/${role}/analysis.md`)}`
    ).join('\n\n')}

    ${styleSkill ? `STYLE SKILL:\n${Read(styleSkillPath)}` : ''}

    OUTPUT FORMAT: ${OUTPUT_MODES[projectType].format}
    OUTPUT DIR: ${outputDir}

    TASK:
    For each UI-bearing feature in the guidance spec:
    1. Generate a self-contained ${OUTPUT_MODES[projectType].format} prototype
    2. Name files descriptively: {feature-slug}.${OUTPUT_MODES[projectType].format === 'html' ? 'html' : 'md'}
    3. Include feature-index.json mapping files to features
    4. Create README.md summarizing all prototypes

    CONSTRAINTS:
    - HTML files must be fully self-contained (inline CSS/JS, no external dependencies)
    - Use dark theme as default with CSS custom properties for theming
    - Each file represents one screen/view/interaction
    - Reference role analysis findings with @{role}/analysis.md notation
  `,
  run_in_background: false
})
```

**HTML Prototype Requirements** (when format = html):
- Self-contained: all CSS and JS inline, no CDN links
- Dark theme default: `background: #0d1117`, `color: #c9d1d9`
- CSS custom properties for easy theming
- Responsive layout (mobile-first)
- Fragment files (no `<html>/<head>/<body>` wrapper — review tool wraps them)

**ASCII Mockup Requirements** (when format = md):
- Terminal-style box-drawing characters
- Clear section labels and navigation hints
- Color annotations as comments

**API Sketch Requirements** (when format = md):
- Endpoint signatures with method, path, request/response types
- State diagrams for complex flows
- Error response catalog

## Step 3.5.4: Validation

Verify prototype output completeness:

```javascript
// Required files
const requiredFiles = [
  `${outputDir}/README.md`,
  `${outputDir}/feature-index.json`
]

// Validate
const prototypeFiles = Glob(`${outputDir}/*.{html,md}`)
const hasMinFiles = prototypeFiles.length >= 1
const hasIndex = fileExists(`${outputDir}/feature-index.json`)
const hasReadme = fileExists(`${outputDir}/README.md`)

if (!hasMinFiles || !hasIndex || !hasReadme) {
  // Retry agent with specific missing file instructions
  // Max 1 retry
}

// Validate cross-references
// Each prototype should reference source analyses with @-notation
const analyses = Glob('.brainstorming/*/analysis.md')
// Check README.md references at least one analysis
```

**feature-index.json Schema**:
```json
{
  "project_type": "web",
  "output_mode": "html",
  "prototypes": [
    {
      "file": "dashboard-overview.html",
      "feature": "Dashboard",
      "description": "Main dashboard with metrics and activity feed",
      "source_roles": ["ux-expert", "system-architect"],
      "priority": "high"
    }
  ]
}
```

## Step 3.5.5: Optional Interactive Review

**Trigger**: `outputDir` has 2+ prototype files AND not `--yes` mode.

```javascript
const prototypeFiles = Glob(`${outputDir}/*.html`)

if (prototypeFiles.length >= 2 && !autoYes) {
  // Load review workflow
  // Ref: ~/.ccw/workflows/brainstorm-visualize.md

  // The review workflow handles:
  // 1. Offer review to user
  // 2. Open files (user opens HTML directly in browser)
  // 3. Intelligent grouping by feature domain
  // 4. Multi-round batched Q&A
  // 5. Feedback aggregation

  // Store review decisions for Phase 4 synthesis
  // review_decisions → injected into Phase 4 context
}
```

**Single Prototype**: Skip review, inform user of file path directly.

## Step 3.5.6: Architecture ↔ UI Feedback Patch

Lightweight cross-role contradiction scan after UI exploration. Optional — skip with `--yes`.

```javascript
if (!autoYes && reviewDecisions && reviewDecisions.length > 0) {
  // Scan for contradictions between:
  // - UI prototypes (user-approved layout/interaction)
  // - system-architect analysis (technical constraints)
  // - ux-expert analysis (user flow requirements)

  const contradictions = scanContradictions({
    prototypes: prototypeFiles,
    analyses: ['system-architect', 'ux-expert', 'data-architect']
  })

  if (contradictions.length > 0) {
    // Present contradictions to user
    AskUserQuestion({
      question: `Found ${contradictions.length} potential conflicts between UI decisions and role analyses:\n` +
        contradictions.map((c, i) => `${i+1}. ${c.summary}`).join('\n') +
        '\n\nAddress these conflicts?',
      options: [
        { label: "Yes", description: "Targeted re-analysis for affected roles" },
        { label: "Skip", description: "Proceed to synthesis, note conflicts" }
      ]
    })

    if (userChoice === "Yes") {
      // Re-run only affected role analyses with UI context
      for (const conflict of contradictions) {
        Skill({ skill: "brainstorm", args: `${conflict.role} --session ${sessionId} --update` })
      }
    }
  }
}
```

---

## Output

After Phase 3.5 completes:

```
.brainstorming/
├── html-prototypes/          # OR ascii-mockups/ OR api-sketches/
│   ├── README.md             # Prototype summary and navigation
│   ├── feature-index.json    # File-to-feature mapping
│   ├── {feature-1}.html      # Self-contained prototype
│   ├── {feature-2}.html
│   └── ...
├── {role}/analysis*.md       # Existing (immutable)
└── guidance-specification.md # Existing (immutable)
```

## TodoWrite Integration

Phase 3.5 attaches as a single task in the auto mode lifecycle, between Phase 3 and Phase 4:

```
Phase 3 Parallel Role Analysis → completed
Phase 3.5 UI Design Exploration → in_progress
  → Sub-tasks: Detection → Generate → Validate → Review (optional) → Feedback (optional)
  → Sub-tasks COLLAPSED
Phase 4 Synthesis → pending
```

## Error Handling

| Error | Recovery |
|-------|----------|
| Project type undetectable | Default to `web` if UI roles selected, else skip phase |
| Agent generation failure | Retry once with simplified prompt (fewer role contexts) |
| No UI-bearing features | Skip phase, log reason |
| Review workflow fails | Proceed without review feedback |
| Contradiction scan timeout | Skip feedback patch, note in synthesis context |
