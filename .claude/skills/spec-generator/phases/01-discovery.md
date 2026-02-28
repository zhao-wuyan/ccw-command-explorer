# Phase 1: Discovery

Parse input, analyze the seed idea, optionally explore codebase, establish session configuration.

## Objective

- Generate session ID and create output directory
- Parse user input (text description or file reference)
- Analyze seed via Gemini CLI to extract problem space dimensions
- Conditionally explore codebase for existing patterns and constraints
- Gather user preferences (depth, focus areas) via interactive confirmation
- Write `spec-config.json` as the session state file

## Input

- Dependency: `$ARGUMENTS` (user input from command)
- Flags: `-y` (auto mode), `-c` (continue mode)

## Execution Steps

### Step 1: Session Initialization

```javascript
// Parse arguments
const args = $ARGUMENTS;
const autoMode = args.includes('-y') || args.includes('--yes');
const continueMode = args.includes('-c') || args.includes('--continue');

// Extract the idea/topic (remove flags)
const idea = args.replace(/(-y|--yes|-c|--continue)\s*/g, '').trim();

// Generate session ID
const slug = idea.toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 40);
const date = new Date().toISOString().slice(0, 10);
const sessionId = `SPEC-${slug}-${date}`;
const workDir = `.workflow/.spec/${sessionId}`;

// Check for continue mode
if (continueMode) {
  // Find existing session
  const existingSessions = Glob('.workflow/.spec/SPEC-*/spec-config.json');
  // If slug matches an existing session, load it and resume
  // Read spec-config.json, find first incomplete phase, jump to that phase
  return; // Resume logic handled by orchestrator
}

// Create output directory
Bash(`mkdir -p "${workDir}"`);
```

### Step 2: Input Parsing

```javascript
// Determine input type
if (idea.startsWith('@') || idea.endsWith('.md') || idea.endsWith('.txt')) {
  // File reference - read and extract content
  const filePath = idea.replace(/^@/, '');
  const fileContent = Read(filePath);
  // Use file content as the seed
  inputType = 'file';
  seedInput = fileContent;
} else {
  // Direct text description
  inputType = 'text';
  seedInput = idea;
}
```

### Step 3: Seed Analysis via Gemini CLI

```javascript
Bash({
  command: `ccw cli -p "PURPOSE: Analyze this seed idea/requirement to extract structured problem space dimensions.
Success: Clear problem statement, target users, domain identification, 3-5 exploration dimensions.

SEED INPUT:
${seedInput}

TASK:
- Extract a clear problem statement (what problem does this solve?)
- Identify target users (who benefits?)
- Determine the domain (technical, business, consumer, etc.)
- List constraints (budget, time, technical, regulatory)
- Generate 3-5 exploration dimensions (key areas to investigate)
- Assess complexity: simple (1-2 components), moderate (3-5 components), complex (6+ components)

MODE: analysis
EXPECTED: JSON output with fields: problem_statement, target_users[], domain, constraints[], dimensions[], complexity
CONSTRAINTS: Be specific and actionable, not vague
" --tool gemini --mode analysis`,
  run_in_background: true
});
// Wait for CLI result before continuing
```

Parse the CLI output into structured `seedAnalysis`:
```javascript
const seedAnalysis = {
  problem_statement: "...",
  target_users: ["..."],
  domain: "...",
  constraints: ["..."],
  dimensions: ["..."]
};
const complexity = "moderate"; // from CLI output
```

### Step 4: Codebase Exploration (Conditional)

```javascript
// Detect if running inside a project with code
const hasCodebase = Glob('**/*.{ts,js,py,java,go,rs}').length > 0
  || Glob('package.json').length > 0
  || Glob('Cargo.toml').length > 0;

if (hasCodebase) {
  Task({
    subagent_type: "cli-explore-agent",
    run_in_background: false,
    description: `Explore codebase for spec: ${slug}`,
    prompt: `
## Spec Generator Context
Topic: ${seedInput}
Dimensions: ${seedAnalysis.dimensions.join(', ')}
Session: ${workDir}

## MANDATORY FIRST STEPS
1. Search for code related to topic keywords
2. Read project config files (package.json, pyproject.toml, etc.) if they exist

## Exploration Focus
- Identify existing implementations related to the topic
- Find patterns that could inform architecture decisions
- Map current architecture constraints
- Locate integration points and dependencies

## Output
Write findings to: ${workDir}/discovery-context.json

Schema:
{
  "relevant_files": [{"path": "...", "relevance": "high|medium|low", "rationale": "..."}],
  "existing_patterns": ["pattern descriptions"],
  "architecture_constraints": ["constraint descriptions"],
  "integration_points": ["integration point descriptions"],
  "tech_stack": {"languages": [], "frameworks": [], "databases": []},
  "_metadata": { "exploration_type": "spec-discovery", "timestamp": "ISO8601" }
}
`
  });
}
```

### Step 5: User Confirmation (Interactive)

```javascript
if (!autoMode) {
  // Confirm problem statement and select depth
  AskUserQuestion({
    questions: [
      {
        question: `Problem statement: "${seedAnalysis.problem_statement}" - Is this accurate?`,
        header: "Problem",
        multiSelect: false,
        options: [
          { label: "Accurate", description: "Proceed with this problem statement" },
          { label: "Needs adjustment", description: "I'll refine the problem statement" }
        ]
      },
      {
        question: "What specification depth do you need?",
        header: "Depth",
        multiSelect: false,
        options: [
          { label: "Light", description: "Quick overview - key decisions only" },
          { label: "Standard (Recommended)", description: "Balanced detail for most projects" },
          { label: "Comprehensive", description: "Maximum detail for complex/critical projects" }
        ]
      },
      {
        question: "Which areas should we focus on?",
        header: "Focus",
        multiSelect: true,
        options: seedAnalysis.dimensions.map(d => ({ label: d, description: `Explore ${d} in depth` }))
      }
    ]
  });
} else {
  // Auto mode defaults
  depth = "standard";
  focusAreas = seedAnalysis.dimensions;
}
```

### Step 6: Write spec-config.json

```javascript
const specConfig = {
  session_id: sessionId,
  seed_input: seedInput,
  input_type: inputType,
  timestamp: new Date().toISOString(),
  mode: autoMode ? "auto" : "interactive",
  complexity: complexity,
  depth: depth,
  focus_areas: focusAreas,
  seed_analysis: seedAnalysis,
  has_codebase: hasCodebase,
  phasesCompleted: [
    {
      phase: 1,
      name: "discovery",
      output_file: "spec-config.json",
      completed_at: new Date().toISOString()
    }
  ]
};

Write(`${workDir}/spec-config.json`, JSON.stringify(specConfig, null, 2));
```

## Output

- **File**: `spec-config.json`
- **File**: `discovery-context.json` (optional, if codebase detected)
- **Format**: JSON

## Quality Checklist

- [ ] Session ID matches `SPEC-{slug}-{date}` format
- [ ] Problem statement exists and is >= 20 characters
- [ ] Target users identified (>= 1)
- [ ] 3-5 exploration dimensions generated
- [ ] spec-config.json written with all required fields
- [ ] Output directory created

## Next Phase

Proceed to [Phase 2: Product Brief](02-product-brief.md) with the generated spec-config.json.
