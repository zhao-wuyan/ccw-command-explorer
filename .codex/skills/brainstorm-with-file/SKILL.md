---
name: brainstorm-with-file
description: Interactive brainstorming with documented thought evolution, multi-perspective analysis, and iterative refinement. Serial execution with no agent delegation.
argument-hint: "TOPIC=\"<idea or topic>\" [--perspectives=creative,pragmatic,systematic] [--max-ideas=<n>]"
---

# Codex Brainstorm-With-File Prompt

## Overview

Interactive brainstorming workflow with **documented thought evolution**. Expands initial ideas through questioning, inline multi-perspective analysis, and iterative refinement.

**Core workflow**: Seed Idea → Expand → Multi-Perspective Explore → Synthesize → Refine → Crystallize

**Key features**:
- **brainstorm.md**: Complete thought evolution timeline
- **Multi-perspective analysis**: Creative + Pragmatic + Systematic (serial, inline)
- **Idea expansion**: Progressive questioning and exploration
- **Diverge-Converge cycles**: Generate options then focus on best paths

## Auto Mode

When `--yes` or `-y`: Auto-confirm exploration decisions, use recommended perspectives, skip interactive scoping.

## Quick Start

```bash
# Basic usage
/codex:brainstorm-with-file TOPIC="How to improve developer onboarding experience"

# With perspective selection
/codex:brainstorm-with-file TOPIC="New caching strategy" --perspectives=creative,pragmatic,systematic

# Continue existing session
/codex:brainstorm-with-file TOPIC="caching strategy" --continue

# Auto mode (skip confirmations)
/codex:brainstorm-with-file -y TOPIC="Plugin architecture ideas"
```

## Target Topic

**$TOPIC**

## Configuration

| Flag | Default | Description |
|------|---------|-------------|
| `-y, --yes` | false | Auto-confirm all decisions |
| `--continue` | false | Continue existing session |
| `--perspectives` | creative,pragmatic,systematic | Comma-separated perspective list |
| `--max-ideas` | 15 | Maximum ideas to track |

**Session ID format**: `BS-{slug}-{YYYY-MM-DD}`
- slug: lowercase, alphanumeric + CJK characters, max 40 chars
- date: YYYY-MM-DD (UTC+8)
- Auto-detect continue: session folder + brainstorm.md exists → continue mode

## Brainstorm Flow

```
Step 0: Session Setup
   ├─ Parse topic, flags (--perspectives, --continue, -y)
   ├─ Generate session ID: BS-{slug}-{date}
   └─ Create session folder (or detect existing → continue mode)

Step 1: Seed Understanding
   ├─ Parse topic, identify brainstorm dimensions
   ├─ Role/perspective selection with user (or auto)
   ├─ Initial scoping (mode, focus areas, constraints)
   ├─ Expand seed into exploration vectors
   └─ Initialize brainstorm.md

Step 2: Divergent Exploration (Inline, No Agents)
   ├─ Detect codebase → search relevant modules, patterns
   │   ├─ Run `ccw spec load --category exploration` (if spec system available)
   │   └─ Use Grep, Glob, Read, mcp__ace-tool__search_context
   ├─ Multi-perspective analysis (serial, inline)
   │   ├─ Creative perspective: innovation, cross-domain, challenge assumptions
   │   ├─ Pragmatic perspective: feasibility, effort, blockers
   │   └─ Systematic perspective: decomposition, patterns, scalability
   ├─ Aggregate findings → perspectives.json
   ├─ Update brainstorm.md with Round 1
   └─ Initial Idea Coverage Check

Step 3: Interactive Refinement (Multi-Round, max 6)
   ├─ Present current ideas and perspectives
   ├─ Gather user feedback
   ├─ Process response:
   │   ├─ Deep Dive → deeper inline analysis on selected ideas
   │   ├─ Diverge → new inline analysis with different angles
   │   ├─ Challenge → devil's advocate inline analysis
   │   ├─ Merge → synthesize complementary ideas inline
   │   └─ Converge → exit loop for synthesis
   ├─ Update brainstorm.md with round details
   └─ Repeat until user selects converge or max rounds

Step 4: Convergence & Crystallization
   ├─ Consolidate all insights → synthesis.json
   ├─ Update brainstorm.md with final synthesis
   ├─ Interactive Top-Idea Review (per-idea confirm/modify/reject)
   └─ Offer options: show next-step commands / export / done
```

## Output Artifacts

### Phase 1: Seed Understanding

| Artifact | Purpose |
|----------|---------|
| `brainstorm.md` | Initialized with session metadata, seed expansion, and exploration vectors |
| Session variables | Topic slug, brainstorm mode, dimensions, exploration vectors |

### Phase 2: Divergent Exploration

| Artifact | Purpose |
|----------|---------|
| `exploration-codebase.json` | Codebase context: relevant files, patterns, architecture constraints |
| `perspectives/*.json` | Individual perspective outputs (creative, pragmatic, systematic) |
| `perspectives.json` | Aggregated findings with synthesis (convergent/conflicting themes) |
| Updated `brainstorm.md` | Round 1: Exploration results and multi-perspective analysis |

### Phase 3: Interactive Refinement

| Artifact | Purpose |
|----------|---------|
| `ideas/{idea-slug}.md` | Deep-dive analysis for selected ideas |
| `ideas/merged-idea-{n}.md` | Merged idea documents |
| Updated `brainstorm.md` | Round 2-6: User feedback, idea selections, refinement cycles |

### Phase 4: Convergence & Crystallization

| Artifact | Purpose |
|----------|---------|
| `synthesis.json` | Final synthesis: top ideas, recommendations, insights |
| Final `brainstorm.md` | Complete thought evolution with conclusions |

---

## Recording Protocol

**CRITICAL**: During brainstorming, the following situations **MUST** trigger immediate recording to brainstorm.md:

| Trigger | What to Record | Target Section |
|---------|---------------|----------------|
| **Idea generated** | Idea content, source perspective, novelty/feasibility ratings | `#### Ideas Generated` |
| **Perspective shift** | Old framing → new framing, trigger reason | `#### Decision Log` |
| **User feedback** | User's original input, which ideas selected/rejected | `#### User Input` |
| **Assumption challenged** | Original assumption → challenge result, survivability | `#### Challenged Assumptions` |
| **Ideas merged** | Source ideas, merged concept, what was preserved/discarded | `#### Decision Log` |
| **Scope adjustment** | Before/after scope, trigger reason | `#### Decision Log` |

### Decision Record Format

```markdown
> **Decision**: [Description of the decision]
> - **Context**: [What triggered this decision]
> - **Options considered**: [Alternatives evaluated]
> - **Chosen**: [Selected approach] — **Reason**: [Rationale]
> - **Rejected**: [Why other options were discarded]
> - **Impact**: [Effect on brainstorming direction]
```

### Narrative Synthesis Format

Append after each round update:

```markdown
### Round N: Narrative Synthesis
**Starting point**: Based on previous round's [conclusions/questions], this round explored [starting point].
**Key progress**: [New ideas/findings] [confirmed/refuted/expanded] previous understanding of [topic area].
**Decision impact**: User selected [feedback type], directing brainstorming toward [adjusted/deepened/maintained].
**Current state**: After this round, top ideas are [updated idea rankings].
**Open directions**: [remaining exploration angles for next round]
```

## Implementation Details

### Phase 0: Session Initialization

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

// Parse flags
const autoYes = $ARGUMENTS.includes('--yes') || $ARGUMENTS.includes('-y')
const continueMode = $ARGUMENTS.includes('--continue')
const perspectivesMatch = $ARGUMENTS.match(/--perspectives[=\s]([\w,]+)/)
const selectedPerspectiveNames = perspectivesMatch
  ? perspectivesMatch[1].split(',')
  : ['creative', 'pragmatic', 'systematic']

// Extract topic
const topic = $ARGUMENTS.replace(/--yes|-y|--continue|--perspectives[=\s][\w,]+|--max-ideas[=\s]\d+|TOPIC=/g, '').replace(/^["']|["']$/g, '').trim()

// Determine project root
const projectRoot = Bash('git rev-parse --show-toplevel 2>/dev/null || pwd').trim()

const slug = topic.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').substring(0, 40)
const dateStr = getUtc8ISOString().substring(0, 10)
const sessionId = `BS-${slug}-${dateStr}`
const sessionFolder = `${projectRoot}/.workflow/.brainstorm/${sessionId}`

// Auto-detect continue: session folder + brainstorm.md exists → continue mode
// If continue → load brainstorm.md + perspectives, resume from last round
Bash(`mkdir -p ${sessionFolder}`)
```

### Phase 1: Seed Understanding

**Objective**: Parse the initial idea, identify exploration vectors, scope preferences, and initialize the brainstorm document.

##### Step 1.1: Parse Seed & Identify Dimensions

Match topic keywords against brainstorm dimensions (see [Dimensions Reference](#brainstorm-dimensions)):

```javascript
// Match topic text against keyword lists from Dimensions Reference
// If multiple dimensions match, include all
// If none match, default to "technical" and "innovation"
const dimensions = identifyDimensions(topic, BRAINSTORM_DIMENSIONS)
```

##### Step 1.2: Role Selection

Recommend roles based on topic keywords, then let user confirm or override.

**Professional Roles** (recommended based on topic keywords):

| Role | Perspective Focus | Keywords |
|------|------------------|----------|
| system-architect | Architecture, patterns | 架构, architecture, system, 系统, design pattern |
| product-manager | Business value, roadmap | 产品, product, feature, 功能, roadmap |
| ui-designer | Visual design, interaction | UI, 界面, interface, visual, 视觉 |
| ux-expert | User research, usability | UX, 体验, experience, user, 用户 |
| data-architect | Data modeling, storage | 数据, data, database, 存储, storage |
| test-strategist | Quality, testing | 测试, test, quality, 质量, QA |
| subject-matter-expert | Domain knowledge | 领域, domain, industry, 行业, expert |

**Simple Perspectives** (fallback — always available):

| Perspective | Focus | Best For |
|-------------|-------|----------|
| creative | Innovation, cross-domain | Generating novel ideas |
| pragmatic | Implementation, feasibility | Reality-checking ideas |
| systematic | Architecture, structure | Organizing solutions |

**Selection Strategy**:
1. **Auto mode**: Select top 3 recommended professional roles based on keyword matching
2. **Manual mode**: Present recommended roles + "Use simple perspectives" option
3. **Continue mode**: Use roles from previous session

##### Step 1.3: Initial Scoping (New Session Only)

For new brainstorm sessions, gather user preferences before exploration (skipped in auto mode or continue mode):

```javascript
if (!autoYes && !continueMode) {
  // 1. Brainstorm Mode (single-select)
  const mode = request_user_input({
    questions: [{
      header: "Brainstorm Mode",
      id: "mode",
      question: "Select brainstorming intensity:",
      options: [
        { label: "Creative Mode", description: "Fast, high novelty, 1 perspective" },
        { label: "Balanced Mode(Recommended)", description: "Moderate, 3 perspectives" },
        { label: "Deep Mode", description: "Comprehensive, 3 perspectives + deep refinement" }
      ]
    }]
  })

  // 2. Focus Areas (multi-select)
  const focusAreas = request_user_input({
    questions: [{
      header: "Focus Areas",
      id: "focus",
      question: "Select brainstorming focus:",
      options: generateFocusOptions(dimensions) // Dynamic based on dimensions
    }]
  })

  // 3. Constraints (multi-select)
  const constraints = request_user_input({
    questions: [{
      header: "Constraints",
      id: "constraints",
      question: "Any constraints to consider?",
      options: [
        { label: "Existing Architecture", description: "Must fit current system" },
        { label: "Time Constraints", description: "Short implementation timeline" },
        { label: "Resource Constraints", description: "Limited team/budget" },
        { label: "No Constraints", description: "Blue-sky thinking" }
      ]
    }]
  })
}
```

##### Step 1.4: Expand Seed into Exploration Vectors

Generate key questions that guide the brainstorming exploration. Done inline — no agent delegation.

**Exploration Vectors**:
1. **Core question**: What is the fundamental problem/opportunity?
2. **User perspective**: Who benefits and how?
3. **Technical angle**: What enables this technically?
4. **Alternative approaches**: What other ways could this be solved?
5. **Challenges**: What could go wrong or block success?
6. **Innovation angle**: What would make this 10x better?
7. **Integration**: How does this fit with existing systems/processes?

Analyze the topic inline against user focus areas and constraints to produce 5-7 exploration vectors.

##### Step 1.5: Initialize brainstorm.md

```javascript
const brainstormMd = `# Brainstorm Session

**Session ID**: ${sessionId}
**Topic**: ${topic}
**Started**: ${getUtc8ISOString()}
**Dimensions**: ${dimensions.join(', ')}
**Mode**: ${brainstormMode}

## Table of Contents
<!-- TOC: Auto-updated after each round/phase. -->
- [Session Context](#session-context)
- [Current Ideas](#current-ideas)
- [Thought Evolution Timeline](#thought-evolution-timeline)

## Current Ideas
<!-- REPLACEABLE BLOCK: Overwrite (not append) after each round with latest ranked ideas. -->

> To be populated after exploration.

## Session Context
- Focus areas: ${focusAreas.join(', ')}
- Perspectives: ${selectedPerspectiveNames.join(', ')}
- Constraints: ${constraints.join(', ')}
- Mode: ${brainstormMode}

## Exploration Vectors
${explorationVectors.map((v, i) => `${i+1}. ${v}`).join('\n')}

## Initial Decisions
> Record why these perspectives and focus areas were selected.

---

## Thought Evolution Timeline

> Rounds will be appended below as brainstorming progresses.

---

## Decision Trail

> Consolidated critical decisions across all rounds (populated in Phase 4).
`
Write(`${sessionFolder}/brainstorm.md`, brainstormMd)
```

**Success Criteria**:
- Session folder created with brainstorm.md initialized
- Brainstorm dimensions identified and user preferences captured
- **Initial decisions recorded**: Perspective selection rationale, excluded options with reasons
- Exploration vectors generated
- 1-3 perspectives selected

### Phase 2: Divergent Exploration

**Objective**: Gather codebase context and execute multi-perspective analysis to generate diverse viewpoints. All exploration done inline — no agent delegation.

##### Step 2.1: Detect Codebase & Explore

```javascript
const hasCodebase = Bash(`
  test -f package.json && echo "nodejs" ||
  test -f go.mod && echo "golang" ||
  test -f Cargo.toml && echo "rust" ||
  test -f pyproject.toml && echo "python" ||
  test -f pom.xml && echo "java" ||
  test -d src && echo "generic" ||
  echo "none"
`).trim()

if (hasCodebase !== 'none') {
  // 1. Read project metadata (if exists)
  //    - Run `ccw spec load --category exploration` (load project specs)
  //    - Run `ccw spec load --category debug` (known issues and root-cause notes)
  //    - .workflow/specs/*.md (project conventions)

  // 2. Search codebase for relevant content
  //    Use: Grep, Glob, Read, or mcp__ace-tool__search_context
  //    Focus on: modules/components, patterns/structure, integration points, config/dependencies

  // 3. Write findings
  Write(`${sessionFolder}/exploration-codebase.json`, JSON.stringify({
    project_type: hasCodebase,
    relevant_files: [...],    // [{path, relevance, summary}]
    existing_patterns: [...], // [{pattern, files, description}]
    architecture_constraints: [...], // Constraints found
    integration_points: [...], // [{location, description}]
    key_findings: [...],      // Main insights from code search
    _metadata: { timestamp: getUtc8ISOString(), exploration_scope: '...' }
  }, null, 2))
}
```

##### Step 2.2: Multi-Perspective Analysis (Serial, Inline)

Analyze from each selected perspective. All analysis done inline by the AI — no agents.

**Perspective Definitions**:

| Perspective | Focus | Tasks |
|-------------|-------|-------|
| Creative | Innovation, cross-domain | Think beyond obvious, explore cross-domain inspiration, challenge assumptions, generate moonshot ideas |
| Pragmatic | Implementation reality | Evaluate feasibility, identify existing patterns/libraries, estimate complexity, highlight blockers |
| Systematic | Architecture thinking | Decompose problem, identify architectural patterns, map dependencies, consider scalability |

**Serial execution** — analyze each perspective sequentially:

```javascript
const perspectives = ['creative', 'pragmatic', 'systematic']

perspectives.forEach(perspective => {
  // Analyze inline using exploration-codebase.json as context
  // Generate ideas from this perspective's focus
  Write(`${sessionFolder}/perspectives/${perspective}.json`, JSON.stringify({
    perspective: perspective,
    ideas: [        // 3-5 ideas per perspective
      { title: '...', description: '...', novelty: 1-5, feasibility: 1-5, rationale: '...' }
    ],
    key_findings: [...],
    challenged_assumptions: [...],
    open_questions: [...],
    _metadata: { perspective, timestamp: getUtc8ISOString() }
  }, null, 2))
})
```

##### Step 2.3: Aggregate Multi-Perspective Findings

```javascript
const synthesis = {
  session_id: sessionId,
  timestamp: getUtc8ISOString(),
  topic,

  // Individual perspective findings
  creative: readJson(`${sessionFolder}/perspectives/creative.json`),
  pragmatic: readJson(`${sessionFolder}/perspectives/pragmatic.json`),
  systematic: readJson(`${sessionFolder}/perspectives/systematic.json`),

  // Cross-perspective synthesis
  synthesis: {
    convergent_themes: [...],    // What all perspectives agree on
    conflicting_views: [...],    // Where perspectives differ
    unique_contributions: [...]  // Insights unique to specific perspectives
  },

  // Aggregated for refinement
  aggregated_ideas: [...],  // Merged and deduplicated ideas from all perspectives
  key_findings: [...]       // Main insights across all perspectives
}
Write(`${sessionFolder}/perspectives.json`, JSON.stringify(synthesis, null, 2))
```

##### Step 2.4: Update brainstorm.md

Append Round 1 with exploration results using the [Round Documentation Pattern](#round-documentation-pattern).

**Round 1 Sections** (Multi-Perspective Exploration):
- **Creative Perspective**: Novel ideas with novelty/impact ratings
- **Pragmatic Perspective**: Practical approaches with effort/risk ratings
- **Systematic Perspective**: Architectural options with tradeoff analysis
- **Perspective Synthesis**: Convergent themes, conflicts, unique contributions

##### Step 2.5: Initial Idea Coverage Check

```javascript
// Check exploration vectors against Round 1 findings
appendToBrainstorm(`
#### Initial Idea Coverage Check (Post-Exploration)
${explorationVectors.map((vector, i) => {
  const status = assessCoverage(vector, explorationFindings)
  return `- ${status.icon} Vector ${i+1}: ${vector} — ${status.detail}`
}).join('\n')}

> Next rounds will focus on uncovered and in-progress vectors.
`)
```

**Success Criteria**:
- exploration-codebase.json created with codebase context (if codebase exists)
- perspectives/*.json created for each perspective
- perspectives.json created with aggregated findings and synthesis
- brainstorm.md updated with Round 1 results
- **Initial Idea Coverage Check** completed
- **Key findings recorded** with evidence and ratings

### Phase 3: Interactive Refinement

**Objective**: Iteratively refine ideas through multi-round user-guided exploration cycles. **Max Rounds**: 6. All analysis done inline.

**Auto mode behavior** (`--yes`):
- Balanced/Deep mode: Run 2 auto-rounds (1× Deep Dive on top 2 ideas, 1× Challenge on top 3 ideas), then auto-converge
- Creative mode: Run 1 auto-round (1× Diverge), then auto-converge
- Skip user direction prompts; auto-select based on idea scores

##### Step 3.1: Present Findings & Gather User Direction

**Current Understanding Summary** (Round >= 2, BEFORE presenting new findings):
- Generate 1-2 sentence recap of top ideas and last round's direction
- Example: "Top ideas so far: [idea1], [idea2]. Last round [deepened/challenged/merged]. Here are the latest findings:"

```javascript
if (!autoYes) {
  const feedback = request_user_input({
    questions: [{
      header: "Brainstorm Direction",
      id: "direction",
      question: `Brainstorm round ${round}: What would you like to do next?`,
      options: [
        { label: "Deep Dive", description: "Explore selected ideas in detail" },
        { label: "Diverge More", description: "Generate more ideas from different angles" },
        { label: "Challenge", description: "Devil's advocate — test ideas critically" },
        { label: "Merge Ideas", description: "Combine complementary ideas" },
        { label: "Ready to Converge", description: "Sufficient ideas, proceed to synthesis" }
      ]
    }]
  })
}
```

##### Step 3.2: Process User Response

**Recording Checkpoint**: Regardless of option selected, MUST record to brainstorm.md:
- User's original choice and expression
- Impact on brainstorming direction
- If direction changed, record a full Decision Record

| Response | Action |
|----------|--------|
| **Deep Dive** | Ask which ideas to explore. Inline analysis: elaborate concept, identify requirements/dependencies, analyze challenges, suggest PoC approach, define success metrics. Write to `ideas/{idea-slug}.md`. |
| **Diverge More** | Inline analysis with different angles: alternative framings, cross-domain inspiration, what-if scenarios, constraint relaxation. Generate new ideas. |
| **Challenge** | Inline devil's advocate analysis: 3 strongest objections per idea, challenge assumptions, failure scenarios, competitive alternatives, survivability rating (1-5). |
| **Merge Ideas** | Ask which ideas to merge. Inline synthesis: identify complementary elements, resolve contradictions, create unified concept, preserve strengths. Write to `ideas/merged-idea-{n}.md`. |
| **Ready to Converge** | Record why concluding. Exit loop → Phase 4. |

##### Step 3.3: Deep Dive on Selected Ideas

When user selects "deep dive", provide comprehensive inline analysis:

```javascript
// For each selected idea, analyze inline
selectedIdeas.forEach(idea => {
  const deepDive = {
    title: idea.title,
    detailed_description: '...',     // Elaborated concept
    technical_requirements: [...],   // Implementation needs
    dependencies: [...],             // What this depends on
    challenges: [                    // Risk/challenge matrix
      { challenge: '...', severity: 'high|medium|low', mitigation: '...' }
    ],
    poc_approach: '...',             // Proof-of-concept suggestion
    success_metrics: [...],          // How to measure success
    source_perspectives: [...]       // Which perspectives contributed
  }
  Write(`${sessionFolder}/ideas/${ideaSlug}.md`, formatIdeaMarkdown(deepDive))
})
```

##### Step 3.4: Devil's Advocate Challenge

When user selects "challenge", perform inline critical analysis:

```javascript
selectedIdeas.forEach(idea => {
  const challenge = {
    idea: idea.title,
    objections: [...],               // 3+ strongest objections
    challenged_assumptions: [...],   // Core assumptions tested
    failure_scenarios: [...],        // When/how this fails
    alternatives: [...],             // Competitive/alternative solutions
    survivability_rating: 1-5,       // How well idea survives challenge
    strengthened_version: '...'      // Improved version post-challenge
  }
  // Record in brainstorm.md
})
```

##### Step 3.5: Merge Multiple Ideas

When user selects "merge", synthesize inline:

```javascript
const merged = {
  title: '...',                     // New merged concept name
  description: '...',              // Unified concept description
  source_ideas: [...],             // Which ideas were merged
  elements_from_each: [...],       // What was taken from each source
  contradictions_resolved: [...],  // How conflicts were handled
  combined_strengths: [...],       // New combined advantages
  implementation_considerations: '...'
}
Write(`${sessionFolder}/ideas/merged-idea-${n}.md`, formatMergedIdeaMarkdown(merged))
```

##### Step 3.6: Document Each Round

Update brainstorm.md using the [Round Documentation Pattern](#round-documentation-pattern).

**Append** to Thought Evolution Timeline: User Direction, Decision Log, Ideas Generated/Updated, Analysis Results, Challenged Assumptions, Open Items, Narrative Synthesis.

**Replace** (not append):

| Section | Update Rule |
|---------|-------------|
| `## Current Ideas` | Overwrite with latest ranked idea list |
| `## Table of Contents` | Update links to include new Round N sections |

**Success Criteria**:
- User feedback processed for each round
- brainstorm.md updated with all refinement rounds
- Ideas in `ideas/` folder for selected deep-dives
- Exit condition reached (user selects converge or max rounds)

### Phase 4: Convergence & Crystallization

**Objective**: Synthesize final ideas, generate conclusions and recommendations, and offer next steps.

##### Step 4.1: Consolidate Insights

```javascript
const synthesis = {
  session_id: sessionId,
  topic,
  completed: getUtc8ISOString(),
  total_rounds: roundCount,
  top_ideas: [                    // Top 5 ranked ideas
    {
      title: '...', description: '...',
      source_perspective: '...',
      score: 1-10,                // Final viability score
      novelty: 1-5,              // Innovation rating
      feasibility: 1-5,          // Implementation feasibility
      key_strengths: [...],
      main_challenges: [...],
      next_steps: [...],
      review_status: 'accepted|modified|rejected|pending'
    }
  ],
  parked_ideas: [...],           // Ideas for future consideration
  key_insights: [...],           // Key learnings from brainstorming
  recommendations: {
    primary: '...',              // Best path forward
    alternatives: [...]          // Other viable options
  },
  follow_up: [                   // Suggested next steps
    { type: 'implement|research|validate', summary: '...' }
  ],
  decision_trail: [              // Consolidated from all phases
    { round: 1, decision: '...', context: '...', chosen: '...', reason: '...', impact: '...' }
  ]
}
Write(`${sessionFolder}/synthesis.json`, JSON.stringify(synthesis, null, 2))
```

##### Step 4.2: Final brainstorm.md Update

**Synthesis & Conclusions**:
- **Executive Summary**: High-level overview of brainstorming results
- **Top Ideas**: Ranked list with descriptions and strengths/challenges
- **Primary Recommendation**: Best path forward with clear rationale
- **Alternative Approaches**: Other viable options with tradeoff analysis
- **Parked Ideas**: Future considerations with potential triggers
- **Key Insights**: Important learnings from the process

**Current Ideas (Final)**:

| Subsection | Content |
|------------|---------|
| Top Ideas | Ranked by score with strengths/challenges |
| Idea Evolution | How top ideas developed across rounds |
| Key Insights | Valuable learnings for future reference |

**Decision Trail**:

| Subsection | Content |
|------------|---------|
| Critical Decisions | Pivotal decisions that shaped the outcome |
| Direction Changes | Timeline of scope/focus adjustments with rationale |
| Trade-offs Made | Key trade-offs and why certain paths were chosen |

**Session Statistics**: Total rounds, ideas generated, ideas survived challenges, perspectives used, artifacts generated.

##### Step 4.3: Interactive Top-Idea Review (skip in auto mode)

Walk through top ideas one-by-one (ordered by score):

```javascript
for (const [index, idea] of rankedIdeas.entries()) {
  const review = request_user_input({
    questions: [{
      header: `Idea #${index + 1}`,
      id: `idea_${index + 1}`,
      question: `Idea #${index + 1}: "${idea.title}" (score: ${idea.score}, novelty: ${idea.novelty}, feasibility: ${idea.feasibility}). Your decision:`,
      options: [
        { label: "Accept(Recommended)", description: "Keep this idea in final recommendations" },
        { label: "Modify", description: "Adjust scope, description, or priority" },
        { label: "Reject", description: "Remove from final recommendations" }
      ]
    }]
  })
  // Accept → "accepted" | Modify → gather text → "modified" | Reject → gather reason → "rejected"
  // Accept All Remaining → mark all remaining as "accepted", break loop
  // Record review decision to brainstorm.md Decision Log + update synthesis.json
}
```

**Review Summary** (append to brainstorm.md):
```markdown
### Top Idea Review Summary
| # | Idea | Score | Novelty | Feasibility | Review Status | Notes |
|---|------|-------|---------|-------------|---------------|-------|
| 1 | [title] | 8 | 4 | 3 | Accepted | |
| 2 | [title] | 7 | 5 | 2 | Modified | [notes] |
| 3 | [title] | 6 | 3 | 4 | Rejected | [reason] |
```

##### Step 4.4: Post-Completion Options

**Available Options** (this skill is brainstorming-only — NEVER auto-launch other skills):

| Option | Purpose | Action |
|--------|---------|--------|
| **Show Next-Step Commands** | Show available commands | Display command list for user to manually run |
| **Export Report** | Generate shareable report | Create formatted report document |
| **Done** | No further action | End workflow |

**Next-step commands to display** (user runs manually, NOT auto-launched):
- `/workflow-lite-plan "..."` → Generate implementation plan
- `/issue:new "..."` → Track top ideas as issues
- `/workflow:analyze-with-file "..."` → Analyze top idea in detail

**Success Criteria**:
- synthesis.json created with complete synthesis
- brainstorm.md finalized with all conclusions
- User offered meaningful next step options
- Session complete and all artifacts available

## Templates

### Round Documentation Pattern

Each round follows this structure in brainstorm.md:

```markdown
### Round N - [DeepDive|Diverge|Challenge|Merge] (timestamp)

#### User Input
What the user indicated they wanted to focus on

#### Decision Log
<!-- Use Decision Record Format from Recording Protocol -->

#### Ideas Generated
New ideas from this round with ratings

#### Analysis Results
Detailed findings from this round's analysis
- Finding 1 (evidence: file:line or rationale)
- Finding 2 (evidence: file:line or rationale)

#### Challenged Assumptions
- ~~Previous assumption~~ → New understanding
  - Reason: Why the assumption was wrong

#### Open Items
Remaining questions or exploration directions

#### Narrative Synthesis
<!-- Use Narrative Synthesis Format from Recording Protocol -->
```

### brainstorm.md Evolution Summary

- **Header**: Session ID, topic, start time, dimensions, mode
- **Session Context**: Focus areas, perspectives, constraints
- **Exploration Vectors**: Key questions guiding exploration
- **Initial Decisions**: Why these perspectives and focus areas were selected
- **Thought Evolution Timeline**: Round-by-round findings
  - Round 1: Exploration Results + Decision Log + Narrative Synthesis
  - Round 2-N: Current Ideas Summary + User feedback + direction adjustments + new ideas + Decision Log + Narrative Synthesis
- **Decision Trail**: Consolidated critical decisions across all rounds
- **Synthesis & Conclusions**: Summary, top ideas, recommendations
- **Current Ideas (Final)**: Consolidated ranked ideas
- **Session Statistics**: Rounds completed, ideas generated, artifacts produced

## Reference

### Output Structure

```
{projectRoot}/.workflow/.brainstorm/BS-{slug}-{date}/
├── brainstorm.md                  # Complete thought evolution timeline
├── exploration-codebase.json      # Phase 2: Codebase context
├── perspectives/                  # Phase 2: Individual perspective outputs
│   ├── creative.json
│   ├── pragmatic.json
│   └── systematic.json
├── perspectives.json              # Phase 2: Aggregated findings with synthesis
├── synthesis.json                 # Phase 4: Final synthesis
└── ideas/                         # Phase 3: Individual idea deep-dives
    ├── idea-1.md
    ├── idea-2.md
    └── merged-idea-1.md
```

| File | Phase | Description |
|------|-------|-------------|
| `brainstorm.md` | 1-4 | Session metadata → thought evolution → conclusions |
| `exploration-codebase.json` | 2 | Codebase context: relevant files, patterns, constraints |
| `perspectives/*.json` | 2 | Per-perspective idea generation results |
| `perspectives.json` | 2 | Aggregated findings with cross-perspective synthesis |
| `ideas/*.md` | 3 | Individual idea deep-dives and merged ideas |
| `synthesis.json` | 4 | Final synthesis: top ideas, recommendations, insights |

### Brainstorm Dimensions

| Dimension | Keywords | Description |
|-----------|----------|-------------|
| technical | 技术, technical, implementation, code, 实现, architecture | Implementation approaches |
| ux | 用户, user, experience, UX, UI, 体验, interaction | User-facing design ideas |
| business | 业务, business, value, ROI, 价值, market | Business model innovations |
| innovation | 创新, innovation, novel, creative, 新颖 | Breakthrough ideas |
| feasibility | 可行, feasible, practical, realistic, 实际 | Realistic approaches |
| scalability | 扩展, scale, growth, performance, 性能 | Large-scale solutions |
| security | 安全, security, risk, protection, 风险 | Security considerations |

### Brainstorm Perspectives

| Perspective | Focus | Best For |
|-------------|-------|----------|
| **Creative** | Innovation, cross-domain inspiration, challenging assumptions | Generating novel and surprising ideas |
| **Pragmatic** | Implementation feasibility, effort estimates, blockers | Reality-checking ideas |
| **Systematic** | Problem decomposition, patterns, scalability, architecture | Organizing and structuring solutions |

### Brainstorm Modes

| Mode | Intensity | Perspectives | Description |
|------|-----------|-------------|-------------|
| Creative | High novelty | 1 perspective | Fast, focus on novel ideas |
| Balanced | Mixed | 3 perspectives | Moderate, balanced exploration (default) |
| Deep | Comprehensive | 3 perspectives + deep refinement | Thorough multi-round investigation |

### Collaboration Patterns

| Pattern | Usage | Description |
|---------|-------|-------------|
| Parallel Divergence | New topic | All perspectives explored serially for comprehensive coverage |
| Sequential Deep-Dive | Promising idea | One perspective elaborates, others critique |
| Debate Mode | Controversial approach | Inline analysis arguing for/against |
| Synthesis Mode | Ready to decide | Inline synthesis combining insights from all perspectives |

### Context Overflow Protection

**Per-Perspective Limits**:
- Main analysis output: < 3000 words
- Sub-document (if any): < 2000 words each
- Maximum sub-documents: 5 per perspective

**Synthesis Protection**:
- If total analysis > 100KB, synthesis reads only main analysis files (not sub-documents)
- Large ideas automatically split into separate idea documents in ideas/ folder

**Recovery Steps**:
1. Check outputs for truncation or overflow
2. Reduce scope: fewer perspectives or simpler topic
3. Use structured brainstorm mode for more focused output
4. Split complex topics into multiple sessions

### Error Handling

| Situation | Action | Recovery |
|-----------|--------|----------|
| No codebase detected | Normal flow, pure topic brainstorming | Proceed without exploration-codebase.json |
| Codebase search fails | Continue with available context | Note limitation in brainstorm.md |
| No good ideas | Reframe problem or adjust constraints | Try new exploration angles |
| Perspectives conflict | Present as tradeoff options | Let user select preferred direction |
| Max rounds reached (6) | Force synthesis phase | Highlight unresolved questions |
| Session folder conflict | Append timestamp suffix | Create unique folder |
| User timeout | Save state, show resume command | Use `--continue` to resume |

## Best Practices

### Core Principles

1. **No code modifications**: This skill is strictly read-only. It produces analysis and idea documents but NEVER modifies source code.
2. **Record Decisions Immediately**: Capture decisions as they happen using the Decision Record format
3. **Evidence-Based**: Ideas referencing codebase patterns should include file:line evidence
4. **Embrace Conflicts**: Perspective conflicts often reveal important tradeoffs

### Before Starting

1. **Clear Topic Definition**: Detailed topics lead to better dimension identification
2. **User Context**: Understanding preferences helps guide brainstorming intensity
3. **Scope Understanding**: Being clear about time/scope expectations sets correct exploration level

### During Brainstorming

1. **Review Perspectives**: Check all perspective results before refinement rounds
2. **Document Assumptions**: Track what you think is true for correction later
3. **Use Continue Mode**: Resume sessions to build on previous exploration
4. **Iterate Thoughtfully**: Each refinement round should meaningfully advance ideas
5. **Track Idea Evolution**: Document how ideas changed across rounds

### Documentation Practices

1. **Timeline Clarity**: Use clear timestamps for traceability
2. **Evolution Tracking**: Document how ideas developed and morphed
3. **Multi-Perspective Synthesis**: Document convergent/conflicting themes
4. **Action Items**: Generate specific, implementable recommendations

## When to Use

**Use brainstorm-with-file when:**
- Generating new ideas and solutions for a topic
- Need multi-perspective exploration of possibilities
- Want documented thought evolution showing how ideas develop
- Exploring creative solutions before committing to implementation
- Need diverge-converge cycles to refine ideas

**Consider alternatives when:**
- Analyzing existing code/architecture → use `analyze-with-file`
- Specific bug diagnosis needed → use `debug-with-file`
- Complex planning with requirements → use `collaborative-plan-with-file`
- Ready to implement → use `lite-plan`

---

**Now start brainstorming for topic**: $TOPIC

**IMPORTANT**: This skill is brainstorming-only. It produces analysis, perspectives, and synthesis documents but NEVER executes code, modifies source files, or auto-launches other skills. All follow-up actions require user to manually run the suggested commands.
