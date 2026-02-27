---
description: Interactive brainstorming with multi-perspective analysis, idea expansion, and documented thought evolution. Supports perspective selection and idea limits.
argument-hint: "TOPIC=\"<idea or topic>\" [--perspectives=role1,role2,...] [--max-ideas=<n>] [--focus=<area>] [--verbose]"
---

# Codex Brainstorm-With-File Prompt

## Overview

Interactive brainstorming workflow with **documented thought evolution**. Expands initial ideas through questioning, multi-perspective analysis, and iterative refinement.

**Core workflow**: Seed Idea → Expand → Multi-Perspective Explore → Synthesize → Refine → Crystallize

**Key features**:
- **brainstorm.md**: Complete thought evolution timeline
- **Multi-perspective analysis**: Creative, Pragmatic, Systematic viewpoints
- **Idea expansion**: Progressive questioning and exploration
- **Diverge-Converge cycles**: Generate options then focus on best paths
- **Synthesis**: Merge multiple perspectives into coherent solutions

## Target Topic

**$TOPIC**

- `--perspectives`: Analysis perspectives (role1,role2,...)
- `--max-ideas`: Max number of ideas
- `--focus`: Focus area

## Execution Process

```
Session Detection:
   ├─ Check if brainstorm session exists for topic
   ├─ EXISTS + brainstorm.md exists → Continue mode
   └─ NOT_FOUND → New session mode

Phase 1: Seed Understanding
   ├─ Parse initial idea/topic
   ├─ Identify brainstorm dimensions (technical, UX, business, etc.)
   ├─ Initial scoping with user
   ├─ Expand seed into exploration vectors
   └─ Document in brainstorm.md

Phase 2: Divergent Exploration (Multi-Perspective)
   ├─ Creative perspective: Innovative, unconventional ideas
   ├─ Pragmatic perspective: Implementation-focused approaches
   ├─ Systematic perspective: Architectural, structured solutions
   └─ Aggregate diverse viewpoints

Phase 3: Interactive Refinement (Multi-Round)
   ├─ Present multi-perspective findings
   ├─ User selects promising directions
   ├─ Deep dive on selected paths
   ├─ Challenge assumptions (devil's advocate)
   ├─ Update brainstorm.md with evolution
   └─ Repeat diverge-converge cycles

Phase 4: Convergence & Crystallization
   ├─ Synthesize best ideas
   ├─ Resolve conflicts between perspectives
   ├─ Formulate actionable conclusions
   ├─ Generate next steps or implementation plan
   └─ Final brainstorm.md update

Output:
   ├─ .workflow/.brainstorm/{slug}-{date}/brainstorm.md (thought evolution)
   ├─ .workflow/.brainstorm/{slug}-{date}/perspectives.json (analysis findings)
   ├─ .workflow/.brainstorm/{slug}-{date}/synthesis.json (final ideas)
   └─ .workflow/.brainstorm/{slug}-{date}/ideas/ (individual idea deep-dives)
```

## Implementation Details

### Session Setup & Mode Detection

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

const topicSlug = "$TOPIC".toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').substring(0, 40)
const dateStr = getUtc8ISOString().substring(0, 10)

const sessionId = `BS-${topicSlug}-${dateStr}`
const sessionFolder = `.workflow/.brainstorm/${sessionId}`
const brainstormPath = `${sessionFolder}/brainstorm.md`
const perspectivesPath = `${sessionFolder}/perspectives.json`
const synthesisPath = `${sessionFolder}/synthesis.json`
const ideasFolder = `${sessionFolder}/ideas`

// Auto-detect mode
const sessionExists = fs.existsSync(sessionFolder)
const hasBrainstorm = sessionExists && fs.existsSync(brainstormPath)

const mode = hasBrainstorm ? 'continue' : 'new'

if (!sessionExists) {
  bash(`mkdir -p ${sessionFolder}/ideas`)
}
```

---

### Phase 1: Seed Understanding

#### Step 1.1: Parse Seed & Identify Dimensions

```javascript
// Brainstorm dimensions for multi-perspective analysis
const BRAINSTORM_DIMENSIONS = {
  technical: ['技术', 'technical', 'implementation', 'code', '实现', 'architecture'],
  ux: ['用户', 'user', 'experience', 'UX', 'UI', '体验', 'interaction'],
  business: ['业务', 'business', 'value', 'ROI', '价值', 'market'],
  innovation: ['创新', 'innovation', 'novel', 'creative', '新颖'],
  feasibility: ['可行', 'feasible', 'practical', 'realistic', '实际'],
  scalability: ['扩展', 'scale', 'growth', 'performance', '性能'],
  security: ['安全', 'security', 'risk', 'protection', '风险']
}

function identifyDimensions(topic) {
  const text = topic.toLowerCase()
  const matched = []
  
  for (const [dimension, keywords] of Object.entries(BRAINSTORM_DIMENSIONS)) {
    if (keywords.some(k => text.includes(k))) {
      matched.push(dimension)
    }
  }
  
  return matched.length > 0 ? matched : ['technical', 'innovation', 'feasibility']
}

const dimensions = identifyDimensions("$TOPIC")
```

#### Step 1.2: Initial Scoping (New Session Only)

Ask user to scope the brainstorm:

- Focus areas: 技术方案 / 用户体验 / 创新突破 / 可行性评估
- Brainstorm depth: Quick Divergence / Balanced Exploration / Deep Dive

#### Step 1.3: Expand Seed into Exploration Vectors

Generate exploration vectors from seed idea:

1. Core question: What is the fundamental problem/opportunity?
2. User perspective: Who benefits and how?
3. Technical angle: What enables this technically?
4. Alternative approaches: What other ways could this be solved?
5. Challenges: What could go wrong or block success?
6. Innovation angle: What would make this 10x better?
7. Integration: How does this fit with existing systems/processes?

#### Step 1.4: Create/Update brainstorm.md

For new session:

```markdown
# Brainstorm Session

**Session ID**: ${sessionId}
**Topic**: $TOPIC
**Started**: ${getUtc8ISOString()}
**Dimensions**: ${dimensions.join(', ')}

---

## Initial Context

**Focus Areas**: ${userFocusAreas.join(', ')}
**Depth**: ${brainstormDepth}
**Constraints**: ${constraints.join(', ') || 'None specified'}

---

## Seed Expansion

### Original Idea
> $TOPIC

### Exploration Vectors

${explorationVectors.map((v, i) => `
#### Vector ${i+1}: ${v.title}
**Question**: ${v.question}
**Angle**: ${v.angle}
**Potential**: ${v.potential}
`).join('\n')}

---

## Thought Evolution Timeline

### Round 1 - Seed Understanding (${timestamp})

#### Initial Parsing
- **Core concept**: ${coreConcept}
- **Problem space**: ${problemSpace}
- **Opportunity**: ${opportunity}

#### Key Questions to Explore
${keyQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}

---

## Current Ideas

*To be populated after exploration phases*

---

## Idea Graveyard

*Discarded ideas with reasons - kept for reference*
```

For continue session, append:

```markdown
### Round ${n} - Continuation (${timestamp})

#### Previous Context

Resuming brainstorm based on prior discussion.

#### New Focus

${newFocusFromUser}
```

---

### Phase 2: Divergent Exploration (Multi-Perspective)

Launch 3 parallel agents for multi-perspective brainstorming:

```javascript
const cliPromises = []

// Agent 1: Creative/Innovative Perspective (Gemini)
cliPromises.push(
  Bash({
    command: `ccw cli -p "
PURPOSE: Creative brainstorming for '$TOPIC' - generate innovative, unconventional ideas
Success: 5+ unique creative solutions that push boundaries

TASK:
• Think beyond obvious solutions - what would be surprising/delightful?
• Explore cross-domain inspiration (what can we learn from other industries?)
• Challenge assumptions - what if the opposite were true?
• Generate 'moonshot' ideas alongside practical ones
• Consider future trends and emerging technologies

MODE: analysis

CONTEXT: @**/* | Topic: $TOPIC
Exploration vectors: ${explorationVectors.map(v => v.title).join(', ')}

EXPECTED:
- 5+ creative ideas with brief descriptions
- Each idea rated: novelty (1-5), potential impact (1-5)
- Key assumptions challenged
- Cross-domain inspirations
- One 'crazy' idea that might just work

CONSTRAINTS: ${brainstormMode === 'structured' ? 'Keep ideas technically feasible' : 'No constraints - think freely'}
" --tool gemini --mode analysis`,
    run_in_background: true
  })
)

// Agent 2: Pragmatic/Implementation Perspective (Codex)
cliPromises.push(
  Bash({
    command: \`ccw cli -p "
PURPOSE: Pragmatic analysis for '$TOPIC' - focus on implementation reality
Success: Actionable approaches with clear implementation paths

TASK:
• Evaluate technical feasibility of core concept
• Identify existing patterns/libraries that could help
• Consider integration with current codebase
• Estimate implementation complexity
• Highlight potential technical blockers
• Suggest incremental implementation approach

MODE: analysis

CONTEXT: @**/* | Topic: $TOPIC
Exploration vectors: \${explorationVectors.map(v => v.title).join(', ')}

EXPECTED:
- 3-5 practical implementation approaches
- Each rated: effort (1-5), risk (1-5), reuse potential (1-5)
- Technical dependencies identified
- Quick wins vs long-term solutions
- Recommended starting point

CONSTRAINTS: Focus on what can actually be built with current tech stack
" --tool codex --mode analysis\`,
    run_in_background: true
  })
)

// Agent 3: Systematic/Architectural Perspective (Claude)
cliPromises.push(
  Bash({
    command: \`ccw cli -p "
PURPOSE: Systematic analysis for '$TOPIC' - architectural and structural thinking
Success: Well-structured solution framework with clear tradeoffs

TASK:
• Decompose the problem into sub-problems
• Identify architectural patterns that apply
• Map dependencies and interactions
• Consider scalability implications
• Evaluate long-term maintainability
• Propose systematic solution structure

MODE: analysis

CONTEXT: @**/* | Topic: $TOPIC
Exploration vectors: \${explorationVectors.map(v => v.title).join(', ')}

EXPECTED:
- Problem decomposition diagram (text)
- 2-3 architectural approaches with tradeoffs
- Dependency mapping
- Scalability assessment
- Recommended architecture pattern
- Risk matrix

CONSTRAINTS: Consider existing system architecture
" --tool claude --mode analysis\`,
    run_in_background: true
  })
)

// Wait for all CLI analyses to complete
const [creativeResult, pragmaticResult, systematicResult] = await Promise.all(cliPromises)

// Parse results from each perspective
const creativeIdeas = parseCreativeResult(creativeResult)
const pragmaticApproaches = parsePragmaticResult(pragmaticResult)
const architecturalOptions = parseSystematicResult(systematicResult)
```

**Multi-Perspective Coordination**:

| Agent | Perspective | Tool | Focus Areas |
|-------|-------------|------|-------------|
| 1 | Creative/Innovative | Gemini | Novel ideas, cross-domain inspiration, moonshots |
| 2 | Pragmatic/Implementation | Codex | Feasibility, tech stack, blockers, quick wins |
| 3 | Systematic/Architectural | Claude | Decomposition, patterns, scalability, risks |

#### Step 2.4: Aggregate Multi-Perspective Findings

```javascript
const perspectives = {
  session_id: sessionId,
  timestamp: getUtc8ISOString(),
  topic: "$TOPIC",
  
  creative: {
    ideas: [...],
    insights: [...],
    challenges: [...]
  },
  
  pragmatic: {
    approaches: [...],
    blockers: [...],
    recommendations: [...]
  },
  
  systematic: {
    decomposition: [...],
    patterns: [...],
    tradeoffs: [...]
  },
  
  synthesis: {
    convergent_themes: [],
    conflicting_views: [],
    unique_contributions: []
  }
}

Write(perspectivesPath, JSON.stringify(perspectives, null, 2))
```

#### Step 2.5: Update brainstorm.md with Perspectives

```markdown
### Round 2 - Multi-Perspective Exploration (${timestamp})

#### Creative Perspective

**Top Creative Ideas**:
${creativeIdeas.map((idea, i) => `
${i+1}. **${idea.title}** ⭐ Novelty: ${idea.novelty}/5 | Impact: ${idea.impact}/5
   ${idea.description}
`).join('\n')}

**Challenged Assumptions**:
${challengedAssumptions.map(a => `- ~~${a.assumption}~~ → Consider: ${a.alternative}`).join('\n')}

**Cross-Domain Inspirations**:
${inspirations.map(i => `- ${i}`).join('\n')}

---

#### Pragmatic Perspective

**Implementation Approaches**:
${pragmaticApproaches.map((a, i) => `
${i+1}. **${a.title}** | Effort: ${a.effort}/5 | Risk: ${a.risk}/5
   ${a.description}
   - Quick win: ${a.quickWin}
   - Dependencies: ${a.dependencies.join(', ')}
`).join('\n')}

**Technical Blockers**:
${blockers.map(b => `- ⚠️ ${b}`).join('\n')}

---

#### Systematic Perspective

**Problem Decomposition**:
${decomposition}

**Architectural Options**:
${architecturalOptions.map((opt, i) => `
${i+1}. **${opt.pattern}**
   - Pros: ${opt.pros.join(', ')}
   - Cons: ${opt.cons.join(', ')}
   - Best for: ${opt.bestFor}
`).join('\n')}

---

#### Perspective Synthesis

**Convergent Themes** (all perspectives agree):
${convergentThemes.map(t => `- ✅ ${t}`).join('\n')}

**Conflicting Views** (need resolution):
${conflictingViews.map(v => `
- 🔄 ${v.topic}
  - Creative: ${v.creative}
  - Pragmatic: ${v.pragmatic}
  - Systematic: ${v.systematic}
`).join('\n')}

**Unique Contributions**:
${uniqueContributions.map(c => `- 💡 [${c.source}] ${c.insight}`).join('\n')}
```

---

### Phase 3: Interactive Refinement (Multi-Round)

#### Step 3.1: Present & Select Directions

```javascript
const MAX_ROUNDS = 6
let roundNumber = 3  // After initial exploration
let brainstormComplete = false

while (!brainstormComplete && roundNumber <= MAX_ROUNDS) {
  
  // Present current state
  console.log(`
## Brainstorm Round ${roundNumber}

### Top Ideas So Far

${topIdeas.map((idea, i) => `
${i+1}. **${idea.title}** (${idea.source})
   ${idea.brief}
   - Novelty: ${'⭐'.repeat(idea.novelty)} | Feasibility: ${'✅'.repeat(idea.feasibility)}
`).join('\n')}

### Open Questions
${openQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}
`)

  // Gather user direction - options:
  // - 深入探索: Deep dive on selected ideas
  // - 继续发散: Generate more ideas
  // - 挑战验证: Devil's advocate challenge
  // - 合并综合: Merge multiple ideas
  // - 准备收敛: Start concluding
  
  // Process based on direction and update brainstorm.md
  roundNumber++
}
```

#### Step 3.2: Deep Dive on Selected Ideas

For each selected idea, create dedicated idea file:

```javascript
async function deepDiveIdea(idea) {
  const ideaPath = `${ideasFolder}/${idea.slug}.md`
  
  // Deep dive analysis:
  // - Elaborate the core concept in detail
  // - Identify implementation requirements
  // - List potential challenges and mitigations
  // - Suggest proof-of-concept approach
  // - Define success metrics
  // - Map related/dependent features
  
  // Output:
  // - Detailed concept description
  // - Technical requirements list
  // - Risk/challenge matrix
  // - MVP definition
  // - Success criteria
  // - Recommendation: pursue/pivot/park
  
  Write(ideaPath, deepDiveContent)
}
```

#### Step 3.3: Devil's Advocate Challenge

For each idea, identify:
- 3 strongest objections
- Challenge core assumptions
- Scenarios where this fails
- Competitive/alternative solutions
- Whether this solves the right problem
- Survivability rating after challenge (1-5)

Output:
- Per-idea challenge report
- Critical weaknesses exposed
- Counter-arguments to objections (if any)
- Ideas that survive the challenge
- Modified/strengthened versions

#### Step 3.4: Merge & Synthesize Ideas

When merging selected ideas:
- Identify complementary elements
- Resolve contradictions
- Create unified concept
- Preserve key strengths from each
- Describe the merged solution
- Assess viability of merged idea

Output:
- Merged concept description
- Elements taken from each source idea
- Contradictions resolved (or noted as tradeoffs)
- New combined strengths
- Implementation considerations

#### Step 3.5: Document Each Round

Append to brainstorm.md:

```markdown
### Round ${n} - ${roundType} (${timestamp})

#### User Direction
- **Selected ideas**: ${selectedIdeas.join(', ')}
- **Action**: ${action}
- **Reasoning**: ${userReasoning || 'Not specified'}

${roundType === 'deep-dive' ? `
#### Deep Dive: ${ideaTitle}

**Elaborated Concept**:
${elaboratedConcept}

**Implementation Requirements**:
${requirements.map(r => `- ${r}`).join('\n')}

**Challenges & Mitigations**:
${challenges.map(c => `- ⚠️ ${c.challenge} → ✅ ${c.mitigation}`).join('\n')}

**MVP Definition**:
${mvpDefinition}

**Recommendation**: ${recommendation}
` : ''}

${roundType === 'challenge' ? `
#### Devil's Advocate Results

**Challenges Raised**:
${challenges.map(c => `
- 🔴 **${c.idea}**: ${c.objection}
  - Counter: ${c.counter || 'No strong counter-argument'}
  - Survivability: ${c.survivability}/5
`).join('\n')}

**Ideas That Survived**:
${survivedIdeas.map(i => `- ✅ ${i}`).join('\n')}

**Eliminated/Parked**:
${eliminatedIdeas.map(i => `- ❌ ${i.title}: ${i.reason}`).join('\n')}
` : ''}

${roundType === 'merge' ? `
#### Merged Idea: ${mergedIdea.title}

**Source Ideas Combined**:
${sourceIdeas.map(i => `- ${i}`).join('\n')}

**Unified Concept**:
${mergedIdea.description}

**Key Elements Preserved**:
${preservedElements.map(e => `- ✅ ${e}`).join('\n')}

**Tradeoffs Accepted**:
${tradeoffs.map(t => `- ⚖️ ${t}`).join('\n')}
` : ''}

#### Updated Idea Ranking

${updatedRanking.map((idea, i) => `
${i+1}. **${idea.title}** ${idea.status}
   - Score: ${idea.score}/10
   - Source: ${idea.source}
`).join('\n')}
```

---

### Phase 4: Convergence & Crystallization

#### Step 4.1: Final Synthesis

```javascript
const synthesis = {
  session_id: sessionId,
  topic: "$TOPIC",
  completed: getUtc8ISOString(),
  total_rounds: roundNumber,
  
  // Top ideas with full details
  top_ideas: ideas.filter(i => i.status === 'active').sort((a,b) => b.score - a.score).slice(0, 5).map(idea => ({
    title: idea.title,
    description: idea.description,
    source_perspective: idea.source,
    score: idea.score,
    novelty: idea.novelty,
    feasibility: idea.feasibility,
    key_strengths: idea.strengths,
    main_challenges: idea.challenges,
    next_steps: idea.nextSteps
  })),
  
  // Parked ideas for future reference
  parked_ideas: ideas.filter(i => i.status === 'parked').map(idea => ({
    title: idea.title,
    reason_parked: idea.parkReason,
    potential_future_trigger: idea.futureTrigger
  })),
  
  // Key insights from the process
  key_insights: keyInsights,
  
  // Recommendations
  recommendations: {
    primary: primaryRecommendation,
    alternatives: alternativeApproaches,
    not_recommended: notRecommended
  },
  
  // Follow-up suggestions
  follow_up: [
    { type: 'implementation', summary: '...' },
    { type: 'research', summary: '...' },
    { type: 'validation', summary: '...' }
  ]
}

Write(synthesisPath, JSON.stringify(synthesis, null, 2))
```

#### Step 4.2: Final brainstorm.md Update

```markdown
---

## Synthesis & Conclusions (${timestamp})

### Executive Summary

${executiveSummary}

### Top Ideas (Final Ranking)

${topIdeas.map((idea, i) => `
#### ${i+1}. ${idea.title} ⭐ Score: ${idea.score}/10

**Description**: ${idea.description}

**Why This Idea**:
${idea.strengths.map(s => `- ✅ ${s}`).join('\n')}

**Main Challenges**:
${idea.challenges.map(c => `- ⚠️ ${c}`).join('\n')}

**Recommended Next Steps**:
${idea.nextSteps.map((s, j) => `${j+1}. ${s}`).join('\n')}

---
`).join('\n')}

### Primary Recommendation

> ${primaryRecommendation}

**Rationale**: ${primaryRationale}

**Quick Start Path**:
1. ${step1}
2. ${step2}
3. ${step3}

### Alternative Approaches

${alternatives.map((alt, i) => `
${i+1}. **${alt.title}**
   - When to consider: ${alt.whenToConsider}
   - Tradeoff: ${alt.tradeoff}
`).join('\n')}

### Ideas Parked for Future

${parkedIdeas.map(idea => `
- **${idea.title}** (Parked: ${idea.reason})
  - Revisit when: ${idea.futureTrigger}
`).join('\n')}

---

## Key Insights

### Process Discoveries

${processDiscoveries.map(d => `- 💡 ${d}`).join('\n')}

### Assumptions Challenged

${challengedAssumptions.map(a => `- ~~${a.original}~~ → ${a.updated}`).join('\n')}

### Unexpected Connections

${unexpectedConnections.map(c => `- 🔗 ${c}`).join('\n')}

---

## Current Understanding (Final)

### Problem Reframed

${reframedProblem}

### Solution Space Mapped

${solutionSpaceMap}

### Decision Framework

When to choose each approach:
${decisionFramework}

---

## Session Statistics

- **Total Rounds**: ${totalRounds}
- **Ideas Generated**: ${totalIdeas}
- **Ideas Survived**: ${survivedIdeas}
- **Perspectives Used**: Creative, Pragmatic, Systematic
- **Duration**: ${duration}
- **Artifacts**: brainstorm.md, perspectives.json, synthesis.json, ${ideaFiles.length} idea deep-dives
```

#### Step 4.3: Post-Completion Options

Offer follow-up options:
- Create Implementation Plan: Convert best idea to implementation plan
- Create Issue: Turn ideas into trackable issues
- Deep Analysis: Run detailed technical analysis on an idea
- Export Report: Generate shareable report
- Complete: No further action needed

---

## Session Folder Structure

```
.workflow/.brainstorm/BS-{slug}-{date}/
├── brainstorm.md        # Complete thought evolution
├── perspectives.json    # Multi-perspective analysis findings
├── synthesis.json       # Final synthesis
└── ideas/               # Individual idea deep-dives
    ├── idea-1.md
    ├── idea-2.md
    └── merged-idea-1.md
```

## Brainstorm Document Template

```markdown
# Brainstorm Session

**Session ID**: BS-xxx-2025-01-28
**Topic**: [idea or topic]
**Started**: 2025-01-28T10:00:00+08:00
**Dimensions**: [technical, ux, innovation, ...]

---

## Initial Context

**Focus Areas**: [selected focus areas]
**Depth**: [quick|balanced|deep]
**Constraints**: [if any]

---

## Seed Expansion

### Original Idea
> [the initial idea]

### Exploration Vectors
[generated questions and directions]

---

## Thought Evolution Timeline

### Round 1 - Seed Understanding
...

### Round 2 - Multi-Perspective Exploration

#### Creative Perspective
...

#### Pragmatic Perspective
...

#### Systematic Perspective
...

#### Perspective Synthesis
...

### Round 3 - Deep Dive
...

### Round 4 - Challenge
...

---

## Synthesis & Conclusions

### Executive Summary
...

### Top Ideas (Final Ranking)
...

### Primary Recommendation
...

---

## Key Insights
...

---

## Current Understanding (Final)
...

---

## Session Statistics
...
```

## Multi-Perspective Analysis Strategy

### Perspective Roles

| Perspective | Focus | Best For |
|-------------|-------|----------|
| Creative | Innovation, cross-domain | Generating novel ideas |
| Pragmatic | Implementation, feasibility | Reality-checking ideas |
| Systematic | Architecture, structure | Organizing solutions |

### Analysis Patterns

1. **Parallel Divergence**: All perspectives explore simultaneously from different angles
2. **Sequential Deep-Dive**: One perspective expands, others critique/refine
3. **Debate Mode**: Perspectives argue for/against specific approaches
4. **Synthesis Mode**: Combine insights from all perspectives

### When to Use Each Pattern

- **New topic**: Parallel Divergence → get diverse initial ideas
- **Promising idea**: Sequential Deep-Dive → thorough exploration
- **Controversial approach**: Debate Mode → uncover hidden issues
- **Ready to decide**: Synthesis Mode → create actionable conclusion

## Consolidation Rules

When updating "Current Understanding":

1. **Promote confirmed insights**: Move validated findings to "What We Established"
2. **Track corrections**: Keep important wrong→right transformations
3. **Focus on current state**: What do we know NOW
4. **Avoid timeline repetition**: Don't copy discussion details
5. **Preserve key learnings**: Keep insights valuable for future reference

**Bad (cluttered)**:
```markdown
## Current Understanding

In round 1 we discussed X, then in round 2 user said Y, and we explored Z...
```

**Good (consolidated)**:
```markdown
## Current Understanding

### Problem Reframed
The core challenge is not X but actually Y because...

### Solution Space Mapped
Three viable approaches emerged: A (creative), B (pragmatic), C (hybrid)

### Decision Framework
- Choose A when: innovation is priority
- Choose B when: time-to-market matters
- Choose C when: balanced approach needed
```

## Error Handling

| Situation | Action |
|-----------|--------|
| Analysis timeout | Retry with focused scope, or continue without that perspective |
| No good ideas | Reframe the problem, adjust constraints, try different angles |
| User disengaged | Summarize progress, offer break point with resume option |
| Perspectives conflict | Present as tradeoff, let user decide direction |
| Max rounds reached | Force synthesis, highlight unresolved questions |
| All ideas fail challenge | Return to divergent phase with new constraints |
| Session folder conflict | Append timestamp suffix |

## Iteration Flow

```
First Call (TOPIC="topic"):
   ├─ No session exists → New mode
   ├─ Identify brainstorm dimensions
   ├─ Scope with user
   ├─ Create brainstorm.md with initial understanding
   ├─ Expand seed into exploration vectors
   ├─ Launch multi-perspective exploration
   └─ Enter refinement loop

Continue Call (TOPIC="topic"):
   ├─ Session exists → Continue mode
   ├─ Load brainstorm.md
   ├─ Resume from last round
   └─ Continue refinement loop

Refinement Loop:
   ├─ Present current findings and top ideas
   ├─ Gather user feedback
   ├─ Process response:
   │   ├─ Deep dive → Explore selected ideas in depth
   │   ├─ Diverge → Generate more ideas
   │   ├─ Challenge → Devil's advocate testing
   │   ├─ Merge → Combine multiple ideas
   │   └─ Converge → Exit loop for synthesis
   ├─ Update brainstorm.md
   └─ Repeat until complete or max rounds

Completion:
   ├─ Generate synthesis.json
   ├─ Update brainstorm.md with final synthesis
   └─ Offer follow-up options
```

---

**Now execute the brainstorm-with-file workflow for topic**: $TOPIC
